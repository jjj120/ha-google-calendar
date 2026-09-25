/**
 * Google Calendar Card for Home Assistant Lovelace.
 * Displays Google Calendar events with full support for per-event colorId,
 * multi-view layout (Agenda, Month, Week, Day), and responsive theming.
 */

import { fetchEventsFromHA } from "./api/ha-backend.js";
import { fetchEventsDirectGoogle } from "./api/google-direct.js";
import { renderAgendaView } from "./views/agenda.js";
import { renderMonthView } from "./views/month.js";
import { renderWeekView } from "./views/week.js";
import { renderDayView } from "./views/day.js";
import { cardStyles } from "./styles.js";
import "./editor.js";

const CARD_VERSION = "1.0.0";
console.info(
  `%c GOOGLE-CALENDAR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4285F4; font-weight: 700; border-radius: 3px 0 0 3px;",
  "color: #4285F4; background: white; font-weight: 700; border-radius: 0 3px 3px 0; border: 1px solid #4285F4;"
);

export class GoogleCalendarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._events = [];
    this._loading = false;
    this._error = null;
    this._activeView = "agenda";
    this._currentDate = new Date();
    this._selectedEvent = null;
    this._refreshTimer = null;
  }

  static async getConfigElement() {
    return document.createElement("google-calendar-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Google Calendar",
      entities: [],
      default_view: "agenda",
      color_style: "pill",
      days_to_show: 14,
    };
  }

  getCardSize() {
    return this._activeView === "month" ? 7 : 5;
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration provided.");
    }
    const hasEntities = config.entities && (Array.isArray(config.entities) ? config.entities.length > 0 : Boolean(config.entities));
    const hasGoogleApi = Boolean(config.google_api?.api_key && config.google_api?.calendar_id);

    if (!hasEntities && !hasGoogleApi) {
      throw new Error("You must specify either 'entities' or 'google_api' in card config.");
    }

    this._config = {
      title: "Google Calendar",
      default_view: "agenda",
      views: ["agenda", "month", "week", "day"],
      color_style: "pill",
      days_to_show: 14,
      show_all_day: true,
      show_past_events: false,
      show_location: true,
      show_description: true,
      show_header: true,
      refresh_interval: 15, // minutes
      colors: {},
      ...config,
    };

    if (Array.isArray(this._config.entities)) {
      this._entities = this._config.entities;
    } else if (typeof this._config.entities === "string") {
      this._entities = [this._config.entities];
    } else {
      this._entities = [];
    }

    if (!this._userChangedView) {
      this._activeView = this._config.default_view || "agenda";
    }

    this._setupRefreshInterval();
    if (this._hass) {
      this._fetchEvents();
    }
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;

    // Fetch initial events if not yet fetched
    if (!oldHass && this._config) {
      this._fetchEvents();
    }
  }

  connectedCallback() {
    this._setupRefreshInterval();
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  _setupRefreshInterval() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
    }
    const mins = Math.max(1, this._config.refresh_interval || 15);
    this._refreshTimer = setInterval(() => {
      this._fetchEvents();
    }, mins * 60 * 1000);
  }

  _getDateWindow() {
    const now = new Date();
    const curr = new Date(this._currentDate);

    let start = new Date(curr);
    let end = new Date(curr);

    if (this._activeView === "agenda") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const days = this._config.days_to_show || 14;
      end = new Date(start);
      end.setDate(end.getDate() + days);
      end.setHours(23, 59, 59, 999);
    } else if (this._activeView === "month") {
      // Start of month grid (covering potential prev month days)
      start = new Date(curr.getFullYear(), curr.getMonth(), 1);
      start.setDate(start.getDate() - 7);
      // End of month grid
      end = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
      end.setDate(end.getDate() + 14);
      end.setHours(23, 59, 59, 999);
    } else if (this._activeView === "week") {
      // 7 days of active week
      const dayOfWeek = (curr.getDay() + 6) % 7; // Monday = 0
      start = new Date(curr);
      start.setDate(curr.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    } else if (this._activeView === "day") {
      start = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0);
      end = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 23, 59, 59, 999);
    }

    return { start, end };
  }

  async _fetchEvents() {
    if (!this._hass && !this._config.google_api?.api_key) return;

    this._loading = true;
    this._error = null;
    this.render();

    const { start, end } = this._getDateWindow();
    const allEvents = [];

    try {
      // 1. Fetch from Home Assistant calendar entities
      if (this._hass && this._entities.length > 0) {
        const promises = this._entities.map((entityId) =>
          fetchEventsFromHA(this._hass, entityId, start, end, this._config.colors)
        );
        const results = await Promise.allSettled(promises);
        for (const res of results) {
          if (res.status === "fulfilled" && Array.isArray(res.value)) {
            allEvents.push(...res.value);
          } else if (res.status === "rejected") {
            console.warn("Failed fetching from entity:", res.reason);
          }
        }
      }

      // 2. Fetch from direct Google API if configured
      if (this._config.google_api?.api_key && this._config.google_api?.calendar_id) {
        const directEvents = await fetchEventsDirectGoogle(
          this._config.google_api.api_key,
          this._config.google_api.calendar_id,
          start,
          end,
          this._config.colors,
          this._config.google_api.calendar_name || "Google Calendar"
        );
        allEvents.push(...directEvents);
      }

      // Sort all events by start time
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      this._events = allEvents;
    } catch (err) {
      console.error("Error fetching Google Calendar events:", err);
      this._error = err.message || "Failed to fetch calendar events.";
    } finally {
      this._loading = false;
      this.render();
    }
  }

  _setView(viewName) {
    this._userChangedView = true;
    this._activeView = viewName;
    this._fetchEvents();
  }

  _navigatePrev() {
    const d = new Date(this._currentDate);
    if (this._activeView === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (this._activeView === "week") {
      d.setDate(d.getDate() - 7);
    } else if (this._activeView === "day") {
      d.setDate(d.getDate() - 1);
    } else {
      // In agenda view, jump back by 7 days
      d.setDate(d.getDate() - 7);
    }
    this._currentDate = d;
    this._fetchEvents();
  }

  _navigateNext() {
    const d = new Date(this._currentDate);
    if (this._activeView === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (this._activeView === "week") {
      d.setDate(d.getDate() + 7);
    } else if (this._activeView === "day") {
      d.setDate(d.getDate() + 1);
    } else {
      // In agenda view, jump forward by 7 days
      d.setDate(d.getDate() + 7);
    }
    this._currentDate = d;
    this._fetchEvents();
  }

  _navigateToday() {
    this._currentDate = new Date();
    this._fetchEvents();
  }

  _openEventModal(eventObj) {
    this._selectedEvent = eventObj;
    this.render();
  }

  _closeEventModal() {
    this._selectedEvent = null;
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;

    const locale = this._hass?.locale?.language || navigator.language || "en-US";
    const availableViews = this._config.views || ["agenda", "month", "week", "day"];

    // Render Navigation header
    const currentTitle = this._config.title || "Google Calendar";

    let viewTabsHtml = "";
    if (availableViews.length > 1) {
      viewTabsHtml = `
        <div class="gc-view-tabs">
          ${availableViews.map((v) => `
            <button class="gc-tab-btn ${this._activeView === v ? 'gc-tab-active' : ''}" data-view="${v}">
              ${v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          `).join("")}
        </div>
      `;
    }

    const headerHtml = this._config.show_header !== false ? `
      <div class="gc-header">
        <div class="gc-title-wrap">
          <ha-icon icon="mdi:calendar-month-outline"></ha-icon>
          <h2 class="gc-title">${currentTitle}</h2>
        </div>
        <div class="gc-nav-controls">
          ${viewTabsHtml}
          <button class="gc-btn gc-btn-icon" id="btn-prev" title="Previous"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
          <button class="gc-btn" id="btn-today">Today</button>
          <button class="gc-btn gc-btn-icon" id="btn-next" title="Next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
          <button class="gc-btn gc-btn-icon" id="btn-refresh" title="Refresh"><ha-icon icon="mdi:refresh"></ha-icon></button>
        </div>
      </div>
    ` : "";

    // Main view content
    let contentHtml = "";
    if (this._error) {
      contentHtml = `<div class="gc-error-box"><ha-icon icon="mdi:alert-circle-outline"></ha-icon> ${this._error}</div>`;
    } else if (this._loading && this._events.length === 0) {
      contentHtml = `
        <div class="gc-loading-spinner">
          <ha-circular-progress active></ha-circular-progress>
        </div>
      `;
    } else {
      const viewOptions = {
        showPastEvents: this._config.show_past_events,
        showLocation: this._config.show_location,
        showDescription: this._config.show_description,
        colorStyle: this._config.color_style || "pill",
        locale: locale,
        firstDayOfWeek: 1,
      };

      if (this._activeView === "month") {
        contentHtml = renderMonthView(this._events, this._currentDate, viewOptions);
      } else if (this._activeView === "week") {
        contentHtml = renderWeekView(this._events, this._currentDate, viewOptions);
      } else if (this._activeView === "day") {
        contentHtml = renderDayView(this._events, this._currentDate, viewOptions);
      } else {
        contentHtml = renderAgendaView(this._events, viewOptions);
      }
    }

    // Modal details HTML
    let modalHtml = "";
    if (this._selectedEvent) {
      const ev = this._selectedEvent;
      const startStr = new Date(ev.start).toLocaleString(locale, { dateStyle: "full", timeStyle: ev.is_all_day ? undefined : "short" });
      const endStr = new Date(ev.end).toLocaleString(locale, { dateStyle: "full", timeStyle: ev.is_all_day ? undefined : "short" });
      const timeDisplay = ev.is_all_day ? `${startStr} (All Day)` : `${startStr} – ${endStr}`;

      modalHtml = `
        <div class="gc-modal-backdrop" id="modal-backdrop">
          <div class="gc-modal-box">
            <div class="gc-modal-header" style="border-left: 6px solid ${ev.background_color || '#4285F4'};">
              <h3>${escapeHtml(ev.summary)}</h3>
              <button class="gc-modal-close-btn" id="modal-close"><ha-icon icon="mdi:close"></ha-icon></button>
            </div>
            <div class="gc-modal-body">
              <div class="gc-modal-row">
                <ha-icon icon="mdi:clock-outline"></ha-icon>
                <span>${timeDisplay}</span>
              </div>
              ${ev.location ? `
                <div class="gc-modal-row">
                  <ha-icon icon="mdi:map-marker-outline"></ha-icon>
                  <span>${escapeHtml(ev.location)}</span>
                </div>
              ` : ''}
              ${ev.calendar_name ? `
                <div class="gc-modal-row">
                  <ha-icon icon="mdi:calendar"></ha-icon>
                  <span>${escapeHtml(ev.calendar_name)}</span>
                </div>
              ` : ''}
              ${ev.description ? `
                <div class="gc-modal-row">
                  <ha-icon icon="mdi:text"></ha-icon>
                  <span style="white-space: pre-wrap;">${escapeHtml(ev.description)}</span>
                </div>
              ` : ''}
              ${ev.html_link ? `
                <div class="gc-modal-row">
                  <ha-icon icon="mdi:open-in-new"></ha-icon>
                  <a href="${ev.html_link}" target="_blank" rel="noopener noreferrer" class="gc-modal-link">Open in Google Calendar</a>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>${cardStyles}</style>
      <ha-card>
        ${headerHtml}
        <div class="gc-content">
          ${contentHtml}
        </div>
        ${modalHtml}
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _attachEventListeners() {
    const root = this.shadowRoot;
    if (!root) return;

    // View tab buttons
    root.querySelectorAll(".gc-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        if (view) this._setView(view);
      });
    });

    // Navigation buttons
    root.getElementById("btn-prev")?.addEventListener("click", () => this._navigatePrev());
    root.getElementById("btn-next")?.addEventListener("click", () => this._navigateNext());
    root.getElementById("btn-today")?.addEventListener("click", () => this._navigateToday());
    root.getElementById("btn-refresh")?.addEventListener("click", () => this._fetchEvents());

    // Event item clicks (open modal)
    root.querySelectorAll("[data-event-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const eventId = el.getAttribute("data-event-id");
        const found = this._events.find((ev) => ev.id === eventId);
        if (found) this._openEventModal(found);
      });
    });

    // Month cell click: jump to Day view for that date
    root.querySelectorAll(".gc-month-cell, .gc-month-overflow-badge").forEach((cell) => {
      cell.addEventListener("click", (e) => {
        const dateStr = cell.getAttribute("data-date");
        if (dateStr) {
          const [y, m, d] = dateStr.split("-").map(Number);
          this._currentDate = new Date(y, m - 1, d);
          this._setView("day");
        }
      });
    });

    // Modal close
    root.getElementById("modal-close")?.addEventListener("click", () => this._closeEventModal());
    root.getElementById("modal-backdrop")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") this._closeEventModal();
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

customElements.define("google-calendar-card", GoogleCalendarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "google-calendar-card",
  name: "Google Calendar Card",
  description: "Displays Google Calendar events with per-event colorId support, multi-view layout, and rich customization.",
  preview: true,
  documentationURL: "https://github.com/jonas/ha-google-calendar",
});
