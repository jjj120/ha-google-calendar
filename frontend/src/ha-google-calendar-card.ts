import type {
  CalendarEventDict,
  HassEntity,
  HomeAssistant,
} from "./types";
import "./ha-google-calendar-card-config";

const DEFAULT_DAYS = 30;
const DEFAULT_LOOKBACK = 7;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export type ViewMode = "agenda" | "month";

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
  view?: ViewMode;
  firstDayOfWeek?: "monday" | "sunday";
  monthChipLimit?: number;
}

interface RankedEvent extends CalendarEventDict {
  entityId: string;
  startDate: Date;
  endDate: Date;
  calendarName: string;
}

interface DayRange {
  startDay: Date;
  lastDay: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function parseDate(value: { date?: string; dateTime?: string }): Date | null {
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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
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

function formatTimeShort(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatDayLabel(date: Date, today: Date, tomorrow: Date): string {
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(date);
  return `${weekday}, ${date.toLocaleDateString()}`;
}

function weekdayIndexFrom(date: Date): number {
  // Monday = 1 ... Sunday = 0 (JS getDay 0=Sunday)
  return date.getDay();
}

function localeWeekStartIndex(config: CardConfig): number {
  // 0 = Sunday, 1 = Monday
  const override = config.firstDayOfWeek;
  if (override === "sunday") return 0;
  if (override === "monday") return 1;
  const locale = navigator.language || "en";
  const region = locale.split("-")[1];
  // A small heuristic for the default first day of week; the override wins.
  if (region && ["US", "CA", "JP"].includes(region)) return 0;
  return 1;
}

function pickTextColor(bg: string): string | null {
  // Only hex colours can be inspected here; unknown values (e.g. var(--...))
  // keep the CSS default (#fff).
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(bg);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance =
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
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

function eventDayRange(event: RankedEvent): DayRange {
  const startDay = startOfDay(event.startDate);
  // end is exclusive; the last covered day is the day before the end timestamp.
  const endMs = event.endDate.getTime();
  const lastRaw = new Date(Math.max(endMs - 1, event.startDate.getTime()));
  const lastDay = startOfDay(lastRaw);
  return { startDay, lastDay: lastDay < startDay ? startDay : lastDay };
}

function spansMultipleDays(event: RankedEvent): boolean {
  const range = eventDayRange(event);
  return event.all_day || range.lastDay.getTime() > range.startDay.getTime();
}

function monthCells(anchor: Date, firstIdx: number): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const offset = (weekdayIndexFrom(first) - firstIdx + 7) % 7;
  const gridStart = addDays(first, -offset);
  const lastOffset = (weekdayIndexFrom(last) - firstIdx + 7) % 7;
  const gridEnd = addDays(last, 6 - lastOffset);
  const cells: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    cells.push(d);
  }
  return cells;
}

function layoutLanes(items: SpanningBar[]): SpanningBar[][] {
  const lanes: SpanningBar[][] = [];
  const sorted = [...items].sort(
    (a, b) => a.colStart - b.colStart || b.colEnd - b.colStart - (a.colEnd - a.colStart),
  );
  for (const item of sorted) {
    let placed = false;
    for (const lane of lanes) {
      if (!lane.some((x) => x.colStart < item.colEnd && item.colStart < x.colEnd)) {
        lane.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([item]);
  }
  return lanes;
}

interface SpanningBar {
  event: RankedEvent;
  colStart: number; // 0-based
  colEnd: number; // exclusive
  startsBefore: boolean;
  endsAfter: boolean;
}

class HaGoogleCalendarCard extends HTMLElement {
  private _config!: CardConfig;
  private _hass?: HomeAssistant;
  private _shadow: ShadowRoot;
  private _rootEl!: HTMLElement;
  private _events: RankedEvent[] = [];
  private _loading = false;
  private _error?: string;
  private _sourceKey = "";
  private _refreshTimer?: number;
  private _monthAnchor = new Date();
  private _selectedDayKey: string | null = null;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.innerHTML = `<style>${this._styles()}</style><div class="root"></div>`;
    this._rootEl = this._shadow.querySelector<HTMLElement>(".root")!;
    this._rootEl.addEventListener("click", (ev) => this._onClick(ev));
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
      view: "agenda",
      monthChipLimit: 3,
    };
  }

  getCardSize(): number {
    if (this._config?.view === "month") {
      const weeks = Math.ceil(monthCells(this._monthAnchor, this._firstDayIndex()).length / 7);
      return Math.min(weeks + 2, 8);
    }
    return Math.min(Math.max(this._events.length, 1), 12);
  }

  disconnectedCallback(): void {
    if (this._refreshTimer) window.clearTimeout(this._refreshTimer);
  }

  private _firstDayIndex(): number {
    return localeWeekStartIndex(this._config);
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
      .empty { padding: 16px 0; color: var(--secondary-text-color); text-align: center; }
      .error { padding: 16px; color: var(--error-color, #ef5350); }
      .spinner { padding: 24px; text-align: center; color: var(--secondary-text-color); }
      .day { margin-top: 8px; }
      .day-head {
        font-size: 12px; font-weight: 600; letter-spacing: 0.03em;
        text-transform: uppercase; color: var(--secondary-text-color); padding: 4px 0 2px;
      }
      .event { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; }
      .bar {
        flex: 0 0 4px; align-self: stretch; border-radius: 2px;
        min-height: 18px; background-color: var(--hgc-accent);
      }
      .event-body { flex: 1 1 auto; min-width: 0; }
      .event-summary { font-weight: 500; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .event-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 12px; color: var(--secondary-text-color); }
      .event-time { white-space: nowrap; }
      .event-cal { white-space: nowrap; }

      /* Month view */
      .month-header { display: flex; align-items: center; gap: 4px; padding: 10px 8px 6px; }
      .month-title { flex: 1 1 auto; font-size: 15px; font-weight: 500; padding: 0 8px; }
      .nav-btn {
        border: none; background: transparent; color: var(--primary-text-color);
        cursor: pointer; padding: 4px 8px; font-size: 18px; line-height: 1;
      }
      .nav-btn:hover { color: var(--primary-color); }
      .weekday-row { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 8px; }
      .weekday {
        text-align: center; font-size: 11px; color: var(--secondary-text-color);
        text-transform: uppercase; padding: 4px 0;
      }
      .month-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 8px 8px; }
      .week { margin-bottom: 2px; }
      .week-lanes { display: flex; flex-direction: column; gap: 1px; }
      .lane { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; min-height: 14px; }
      .ms-bar {
        position: relative; grid-column: var(--col); border-radius: 3px; color: #fff;
        font-size: 11px; overflow: hidden; white-space: nowrap; padding: 0 4px;
        line-height: 14px; cursor: pointer; text-overflow: ellipsis;
      }
      .ms-bar::before {
        content: ""; position: absolute; top: 0; bottom: 0; width: 3px; left: 0;
      }
      .cont { position: absolute; right: 0; top: 0; bottom: 0; padding: 0 2px; opacity: 0.9; }
      .cont-l { position: absolute; left: 0; top: 0; bottom: 0; padding: 0 2px; opacity: 0.9; }
      .week-days { display: grid; grid-template-columns: repeat(7, 1fr); }
      .day-cell {
        min-height: 52px; border-top: 1px solid var(--divider-color, rgba(128,128,128,0.25));
        padding: 2px 3px; cursor: pointer; overflow: hidden;
      }
      .day-cell:hover { background-color: rgba(128,128,128,0.08); }
      .day-cell.out-month { opacity: 0.4; }
      .day-cell.selected { background-color: rgba(128,128,128,0.12); }
      .day-num { font-size: 12px; color: var(--secondary-text-color); }
      .day-cell.today .day-num { color: var(--primary-color); font-weight: 700; }
      .chip {
        margin-top: 2px; border-radius: 3px; font-size: 10px; padding: 1px 3px;
        overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #fff;
      }
      .chip-time {
        opacity: 0.85; margin-right: 3px; font-variant-numeric: tabular-nums;
      }
      .more { font-size: 10px; color: var(--secondary-text-color); margin-top: 2px; }
      .day-detail {
        border-top: 1px solid var(--divider-color, rgba(128,128,128,0.25));
        padding: 4px 12px 12px; max-height: 45%; overflow-y: auto;
      }
      .detail-head {
        display: flex; align-items: center; justify-content: space-between;
        font-weight: 600; font-size: 13px; padding: 4px 0;
      }
      .detail-close {
        border: none; background: transparent; color: var(--secondary-text-color);
        cursor: pointer; font-size: 18px; line-height: 1;
      }
      .detail-empty { color: var(--secondary-text-color); font-size: 13px; padding: 4px 0; }
    `;
  }

  private _sourceKeyNow(): string {
    return JSON.stringify({
      entities: this._config?.entities ?? [],
      view: this._config?.view ?? "agenda",
      anchor: this._config?.view === "month" ? monthKey(this._monthAnchor) : null,
      days: this._config?.days ?? DEFAULT_DAYS,
      lookback: this._config?.lookback ?? DEFAULT_LOOKBACK,
    });
  }

  private _maybeScheduleRefresh(): void {
    this._sourceKey = this._sourceKeyNow();
    if (!this._loading) void this._fetch(this._sourceKey);
    if (this._refreshTimer) window.clearTimeout(this._refreshTimer);
    this._refreshTimer = window.setTimeout(
      () => void this._fetch(this._sourceKey),
      REFRESH_INTERVAL_MS,
    );
  }

  private _requestWindow(): { start: Date; end: Date } {
    if (this._config.view === "month") {
      const cells = monthCells(this._monthAnchor, this._firstDayIndex());
      const start = addDays(cells[0], -1);
      const end = addDays(cells[cells.length - 1], 2);
      return { start, end };
    }
    const start = new Date(Date.now() - (this._config.lookback ?? DEFAULT_LOOKBACK) * DAY_MS);
    const end = new Date(Date.now() + (this._config.days ?? DEFAULT_DAYS) * DAY_MS);
    return { start, end };
  }

  private async _fetch(sourceKey: string): Promise<void> {
    if (!this._hass) return;
    this._loading = true;
    this._error = undefined;
    this._render();
    const entities = this._config.entities;
    const { start, end } = this._requestWindow();
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

  private _onClick(ev: Event): void {
    const target = (ev.target as HTMLElement).closest<HTMLElement>(
      "[data-action], [data-day]",
    );
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (action === "prev") {
      this._monthAnchor = new Date(this._monthAnchor.getFullYear(), this._monthAnchor.getMonth() - 1, 1);
      this._selectedDayKey = null;
      this._reload();
      return;
    }
    if (action === "next") {
      this._monthAnchor = new Date(this._monthAnchor.getFullYear(), this._monthAnchor.getMonth() + 1, 1);
      this._selectedDayKey = null;
      this._reload();
      return;
    }
    if (action === "today") {
      this._monthAnchor = new Date();
      this._selectedDayKey = null;
      this._reload();
      return;
    }
    if (action === "close-detail") {
      this._selectedDayKey = null;
      this._render();
      return;
    }
    const day = target.getAttribute("data-day");
    if (day) {
      this._selectedDayKey = this._selectedDayKey === day ? null : day;
      this._render();
    }
  }

  private _reload(): void {
    this._sourceKey = this._sourceKeyNow();
    void this._fetch(this._sourceKey);
  }

  private _render(): void {
    const root = this._rootEl;
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
    if (config.view === "month") {
      this._renderMonth(root, config);
    } else {
      this._renderAgenda(root, config);
    }
  }

  private _renderAgenda(root: HTMLElement, config: CardConfig): void {
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

    const header = config.title
      ? `<div class="header">${this._escape(config.title)}</div>`
      : "";
    if (groups.length === 0) {
      root.innerHTML = `${header}<div class="body"><div class="empty">No upcoming events</div></div>`;
      return;
    }
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

  private _renderMonth(root: HTMLElement, config: CardConfig): void {
    const firstIdx = this._firstDayIndex();
    const cells = monthCells(this._monthAnchor, firstIdx);

    const title = config.title ?? this._monthLabel();
    const weekdayLabels = WEEKDAYS_SHORT.map((_, i) => {
      // Jan 1 2024 is a Monday (weekday index 1).
      const date = new Date(2024, 0, 1 + (((i + firstIdx) - 1 + 7) % 7));
      return new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date);
    });

    const selectedKey = this._selectedDayKey;

    // Map each day key -> events covering that day.
    const eventsByDay = new Map<string, RankedEvent[]>();
    for (const event of this._events) {
      const { startDay, lastDay } = eventDayRange(event);
      for (let d = new Date(startDay); d <= lastDay; d = addDays(d, 1)) {
        const key = dayKey(d);
        const list = eventsByDay.get(key);
        if (list) list.push(event);
        else eventsByDay.set(key, [event]);
      }
    }

    const weeksHtml: string[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const weekDates = cells.slice(i, i + 7);
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];
      const weekKeyStart = monthKey(weekStart);
      weeksHtml.push(this._weekHtml(weekDates, weekStart, weekEnd, weekKeyStart, eventsByDay));
    }

    const detailHtml = selectedKey
      ? this._dayDetailHtml(selectedKey, eventsByDay)
      : "";

    root.innerHTML = `
      <div class="month-header">
        <button class="nav-btn" data-action="prev" title="Previous month">\u2039</button>
        <div class="month-title">${this._escape(title)}</div>
        <button class="nav-btn" data-action="today" title="Today">\u25cf</button>
        <button class="nav-btn" data-action="next" title="Next month">\u203a</button>
      </div>
      <div class="weekday-row">
        ${weekdayLabels.map((w) => `<div class="weekday">${this._escape(w)}</div>`).join("")}
      </div>
      <div class="month-scroll">
        ${weeksHtml.join("")}
        ${detailHtml}
      </div>
    `;
  }

  private _monthLabel(): string {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      this._monthAnchor,
    );
  }

  private _weekHtml(
    weekDates: Date[],
    weekStart: Date,
    weekEnd: Date,
    weekKeyStart: string,
    eventsByDay: Map<string, RankedEvent[]>,
  ): string {
    const anchorMonth = this._monthAnchor.getMonth();
    const todayKey = dayKey(new Date());

    // Spanning (all-day / multi-day) events overlapping this week.
    const spanning: SpanningBar[] = [];
    for (const events of eventsByDay.values()) {
      for (const event of events) {
        if (!spansMultipleDays(event)) continue;
        const range = eventDayRange(event);
        if (range.startDay.getTime() > weekEnd.getTime()) continue;
        if (range.lastDay.getTime() < weekStart.getTime()) continue;
        const colStart = Math.max(0, Math.floor((range.startDay.getTime() - weekStart.getTime()) / DAY_MS));
        const colEnd = Math.min(7, Math.ceil((range.lastDay.getTime() - weekStart.getTime() + DAY_MS) / DAY_MS));
        spanning.push({
          event,
          colStart,
          colEnd,
          startsBefore: range.startDay.getTime() < weekStart.getTime(),
          endsAfter: range.lastDay.getTime() > weekEnd.getTime(),
        });
      }
    }
    const deduped: SpanningBar[] = [];
    const seen = new Set<string>();
    for (const bar of spanning) {
      const key = `${bar.event.uid}-${weekKeyStart}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(bar);
    }

    const lanes = layoutLanes(deduped);
    const lanesHtml = lanes
      .map(
        (lane) => `
          <div class="lane">
            ${lane
              .map((bar) => {
                const color = this._eventColor(bar.event);
                const textColor = pickTextColor(color);
                const startCol = bar.colStart + 1;
                const endCol = bar.colEnd + 1;
                const contRight = bar.endsAfter ? `<span class="cont">\u203a</span>` : "";
                const contLeft = bar.startsBefore ? `<span class="cont-l">\u2039</span>` : "";
                const colorStyle = textColor ? `color:${textColor};` : "";
                return `<div class="ms-bar" style="--col:${startCol} / ${endCol};background-color:${color};${colorStyle}" data-day="${dayKey(bar.event.startDate)}">${contLeft}${this._escape(bar.event.summary)}${contRight}</div>`;
              })
              .join("")}
          </div>`,
      )
      .join("");

    const dayCellsHtml = weekDates
      .map((date) => {
        const key = dayKey(date);
        const inMonth = date.getMonth() === anchorMonth;
        const events = eventsByDay.get(key) ?? [];
        const timed = events
          .filter((e) => !spansMultipleDays(e))
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        const chipLimit = this._config.monthChipLimit ?? 3;
        const chips = timed.slice(0, chipLimit);
        const more = timed.length - chips.length;
        const cls = [
          "day-cell",
          inMonth ? "" : "out-month",
          key === todayKey ? "today" : "",
          key === this._selectedDayKey ? "selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `
          <div class="${cls}" data-day="${key}">
            <div class="day-num">${date.getDate()}</div>
            ${chips
              .map((e) => {
                const color = this._eventColor(e);
                const textColor = pickTextColor(color);
                const colorStyle = textColor ? `color:${textColor};` : "";
                const time = formatTimeShort(e.startDate);
                return `<div class="chip" style="background-color:${color};${colorStyle}" title="${this._escape(e.summary)}"><span class="chip-time">${time}</span>${this._escape(e.summary)}</div>`;
              })
              .join("")}
            ${more > 0 ? `<div class="more">+${more} more</div>` : ""}
          </div>`;
      })
      .join("");

    const lanesBlock = lanesHtml ? `<div class="week-lanes">${lanesHtml}</div>` : "";
    return `<div class="week">${lanesBlock}<div class="week-days">${dayCellsHtml}</div></div>`;
  }

  private _dayDetailHtml(
    key: string,
    eventsByDay: Map<string, RankedEvent[]>,
  ): string {
    const events = (eventsByDay.get(key) ?? []).sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime(),
    );
    const date = new Date(`${key}T00:00:00`);
    const label = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
    const showTime = this._config.showTime ?? true;
    const showCalendar = this._config.showCalendarName ?? false;
    const items = events.length
      ? events.map((e) => this._eventHtml(e, showTime, showCalendar)).join("")
      : `<div class="detail-empty">No events this day.</div>`;
    return `
      <div class="day-detail">
        <div class="detail-head">
          <span>${this._escape(label)}</span>
          <button class="detail-close" data-action="close-detail" title="Close">\u00d7</button>
        </div>
        ${items}
      </div>`;
  }

  private _eventColor(event: RankedEvent): string {
    return resolveColor(
      event,
      event.entityId,
      this._hass?.states[event.entityId],
      this._config,
      "var(--hgc-accent)",
    );
  }

  private _eventHtml(
    event: RankedEvent,
    showTime: boolean,
    showCalendar: boolean,
  ): string {
    const color = this._eventColor(event);
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
        <div class="bar" style="background-color:${color}"></div>
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
  customCards?: { type: string; name: string; description: string }[];
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
