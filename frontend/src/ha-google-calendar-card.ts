import type {
  CalendarEventDict,
  DateObject,
  HassEntity,
  HomeAssistant,
} from "./types";
import "./ha-google-calendar-card-config";

const DEFAULT_DAYS = 30;
const DEFAULT_LOOKBACK = 7;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface CardConfig {
  type: string;
  entities: string[];
  title?: string;
  days?: number;
  lookback?: number;
  showTime?: boolean;
  showCalendarName?: boolean;
  maxEvents?: number;
  colors?: Record<string, string>;
  showEmpty?: boolean;
}

interface RankedEvent extends CalendarEventDict {
  entityId: string;
  startDate: Date;
  endDate: Date;
  color: string;
  calendarName: string;
}

function parseDate(value: DateObject): Date | null {
  if (value?.dateTime) {
    return new Date(value.dateTime);
  }
  if (value?.date) {
    return new Date(`${value.date}T00:00:00`);
  }
  return null;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDayLabel(date: Date, today: Date, tomorrow: Date): string {
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(date);
  return `${weekday}, ${date.toLocaleDateString()}`;
}

function resolveColor(
  event: CalendarEventDict,
  entityId: string,
  entity: HassEntity | undefined,
  config: CardConfig,
  fallback: string,
): string {
  const override = config.colors?.[entityId];
  if (override) return override;
  const attrs = entity?.attributes ?? {};
  const eventColors =
    typeof attrs.event_colors === "object" && attrs.event_colors !== null
      ? (attrs.event_colors as Record<string, unknown>)
      : {};
  const eventColor = event.uid ? eventColors[event.uid] : undefined;
  if (typeof eventColor === "string") return eventColor;
  if (typeof attrs.calendar_color === "string") return attrs.calendar_color;
  return fallback;
}

class HaGoogleCalendarCard extends HTMLElement {
  private _config!: CardConfig;
  private _hass?: HomeAssistant;
  private _shadow: ShadowRoot;
  private _events: RankedEvent[] = [];
  private _loading = false;
  private _error?: string;
  private _sourceKey = "";
  private _refreshTimer?: number;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.innerHTML = `<style>${this._styles()}</style><div class="root"></div>`;
  }

  setConfig(config: CardConfig): void {
    this._config = config;
    this._render();
  }

  set hass(hass: HomeAssistant) {
    const changed = this._hass !== hass;
    this._hass = hass;
    if (changed) this._maybeScheduleRefresh();
    this._render();
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  static getConfigElement(): HTMLElementTagNameMap["ha-google-calendar-card-editor"] {
    return document.createElement("ha-google-calendar-card-editor");
  }

  static getStubConfig(): CardConfig {
    return {
      type: "custom:ha-google-calendar-card",
      entities: [],
      title: "Upcoming events",
      days: 30,
      lookback: 7,
      maxEvents: 100,
      showTime: true,
      showCalendarName: false,
      showEmpty: false,
    };
  }

  getCardSize(): number {
    return Math.min(Math.max(this._events.length, 1), 12);
  }

  disconnectedCallback(): void {
    if (this._refreshTimer) window.clearTimeout(this._refreshTimer);
  }

  private _styles(): string {
    return `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
        --hgc-accent: var(--primary-color);
      }
      .root {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        border-radius: var(--ha-card-border-radius, 12px);
        background-color: var(--card-background-color, var(--primary-background-color));
        color: var(--primary-text-color);
        font-family: var(--ha-card-font-family, inherit);
        box-shadow: var(--ha-card-box-shadow, none);
        padding: 0;
      }
      .header {
        padding: 12px 16px 8px;
        font-size: 16px;
        font-weight: 500;
      }
      .body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding: 0 16px 12px;
      }
      .empty {
        padding: 16px 0;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .error {
        padding: 16px;
        color: var(--error-color, #ef5350);
      }
      .spinner {
        padding: 24px;
        text-align: center;
        color: var(--secondary-text-color);
      }
      .day {
        margin-top: 8px;
      }
      .day-head {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: var(--secondary-text-color);
        padding: 4px 0 2px;
      }
      .event {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 6px 0;
      }
      .bar {
        flex: 0 0 4px;
        align-self: stretch;
        border-radius: 2px;
        min-height: 18px;
        background-color: var(--hgc-accent);
      }
      .event-body {
        flex: 1 1 auto;
        min-width: 0;
      }
      .event-summary {
        font-weight: 500;
        font-size: 14px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .event-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .event-time {
        white-space: nowrap;
      }
      .event-cal {
        white-space: nowrap;
      }
    `;
  }

  private _maybeScheduleRefresh(): void {
    const sourceKey = JSON.stringify({
      entities: this._config?.entities ?? [],
      days: this._config?.days ?? DEFAULT_DAYS,
      lookback: this._config?.lookback ?? DEFAULT_LOOKBACK,
    });
    this._sourceKey = sourceKey;
    if (!this._loading) void this._fetch(sourceKey);
    if (this._refreshTimer) window.clearTimeout(this._refreshTimer);
    this._refreshTimer = window.setTimeout(
      () => void this._fetch(this._sourceKey),
      REFRESH_INTERVAL_MS,
    );
  }

  private async _fetch(sourceKey: string): Promise<void> {
    if (!this._hass) return;
    this._loading = true;
    this._error = undefined;
    this._render();
    const entities = this._config.entities;
    const start = new Date(Date.now() - (this._config.lookback ?? DEFAULT_LOOKBACK) * DAY_MS);
    const end = new Date(Date.now() + (this._config.days ?? DEFAULT_DAYS) * DAY_MS);
    const startIso = encodeURIComponent(start.toISOString());
    const endIso = encodeURIComponent(end.toISOString());
    try {
      const results: RankedEvent[] = [];
      await Promise.all(
        entities.map(async (entityId) => {
          const entity = this._hass?.states[entityId];
          const events = await this._hass!.callApi<CalendarEventDict[]>(
            "GET",
            `calendars/${entityId}?start=${startIso}&end=${endIso}`,
          );
          for (const event of events) {
            const startDate = parseDate(event.start);
            const endDate = parseDate(event.end);
            if (!startDate || !endDate) continue;
            results.push({
              ...event,
              entityId,
              startDate,
              endDate,
              color: resolveColor(
                event,
                entityId,
                entity,
                this._config,
                "var(--hgc-accent)",
              ),
              calendarName: String(entity?.attributes?.friendly_name ?? entityId),
            });
          }
        }),
      );
      if (sourceKey !== this._sourceKey) return;
      results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      this._events = results;
    } catch (err) {
      if (sourceKey !== this._sourceKey) return;
      this._error =
        err instanceof Error ? err.message : "Failed to load calendar events.";
    } finally {
      if (sourceKey === this._sourceKey) this._loading = false;
      this._render();
    }
  }

  private _render(): void {
    const root = this._shadow.querySelector<HTMLDivElement>(".root");
    if (!root) return;
    const config = this._config;
    if (!config) {
      root.innerHTML = `<div class="error">Google Calendar card: configuration missing.</div>`;
      return;
    }
    if (!config.entities || config.entities.length === 0) {
      root.innerHTML = `<div class="empty">Select at least one calendar entity in the card settings.</div>`;
      return;
    }
    if (this._error) {
      root.innerHTML = `<div class="error">${this._escape(this._error)}</div>`;
      return;
    }
    if (this._loading && this._events.length === 0) {
      root.innerHTML = `<div class="spinner">Loading calendar\u2026</div>`;
      return;
    }
    const maxEvents = config.maxEvents ?? 100;
    const events = this._events.slice(0, maxEvents);
    const showTime = config.showTime ?? true;
    const showCalendar = config.showCalendarName ?? false;

    const today = new Date();
    const tomorrow = new Date(today.getTime() + DAY_MS);

    const groups: { key: string; label: string; events: RankedEvent[] }[] = [];
    for (const event of events) {
      const key = dayKey(event.startDate);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({
          key,
          label: formatDayLabel(event.startDate, today, tomorrow),
          events: [],
        });
      }
      groups[groups.length - 1].events.push(event);
    }

    if (groups.length === 0 && (config.showEmpty ?? false)) {
      root.innerHTML = `<div class="empty">No upcoming events</div>`;
      return;
    }
    if (groups.length === 0) {
      root.innerHTML = `<div class="empty">No upcoming events</div>`;
      return;
    }

    const header = config.title
      ? `<div class="header">${this._escape(config.title)}</div>`
      : "";
    const bodyHtml = groups
      .map(
        (group) => `
          <div class="day">
            <div class="day-head">${this._escape(group.label)}</div>
            ${group.events
              .map((event) => this._eventHtml(event, showTime, showCalendar))
              .join("")}
          </div>`,
      )
      .join("");
    root.innerHTML = `${header}<div class="body">${bodyHtml}</div>`;
  }

  private _eventHtml(
    event: RankedEvent,
    showTime: boolean,
    showCalendar: boolean,
  ): string {
    const time = event.all_day
      ? "All day"
      : `${formatTime(event.startDate)} \u2013 ${formatTime(event.endDate)}`;
    const meta = [
      showTime ? `<span class="event-time">${this._escape(time)}</span>` : "",
      showCalendar
        ? `<span class="event-cal">${this._escape(event.calendarName)}</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    return `
      <div class="event">
        <div class="bar" style="background-color:${event.color}"></div>
        <div class="event-body">
          <div class="event-summary">${this._escape(event.summary)}</div>
          ${meta ? `<div class="event-meta">${meta}</div>` : ""}
        </div>
      </div>`;
  }

  private _escape(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}

if (!customElements.get("ha-google-calendar-card")) {
  customElements.define("ha-google-calendar-card", HaGoogleCalendarCard);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-google-calendar-card": HaGoogleCalendarCard;
  }
}

// Register the card metadata so it appears in the dashboard "Add card" picker.
const _window = window as unknown as {
  customCards?: {
    type: string;
    name: string;
    description: string;
  }[];
};
const customCards = _window.customCards ?? [];
if (!customCards.find((card) => card.type === "ha-google-calendar-card")) {
  customCards.push({
    type: "ha-google-calendar-card",
    name: "Google Calendar (per-event colors)",
    description: "Multiple Google calendars with per-event colors",
  });
}
_window.customCards = customCards;

export { HaGoogleCalendarCard };
export default HaGoogleCalendarCard;
