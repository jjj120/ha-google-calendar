/**
 * Visual Configuration Editor for Google Calendar Card.
 * Uses native Home Assistant <ha-form> and selectors to match the default Home Assistant UI style.
 */

class GoogleCalendarCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._form = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) {
      this._form.hass = hass;
    }
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._form) {
      this._form.data = this._formatData(this._config);
      this._renderCalendarColors();
    } else {
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  _formatData(config) {
    let entities = config.entities;
    if (typeof entities === "string") {
      entities = entities.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (!Array.isArray(entities)) {
      entities = [];
    }

    return {
      title: config.title || "",
      entities: entities,
      default_view: config.default_view || "agenda",
      color_style: config.color_style || "pill",
      days_to_show: config.days_to_show ?? 14,
      show_all_day: config.show_all_day ?? true,
      show_past_events: config.show_past_events ?? false,
      show_location: config.show_location ?? true,
      show_description: config.show_description ?? true,
      show_header: config.show_header ?? true,
      refresh_interval: config.refresh_interval ?? 15,
      api_key: config.google_api?.api_key || "",
      calendar_id: config.google_api?.calendar_id || "",
    };
  }

  _computeLabel(schema) {
    const labels = {
      title: "Card Title",
      entities: "Calendar Entities",
      default_view: "Default View",
      color_style: "Event Color Style",
      days_to_show: "Days to Show (Agenda View)",
      show_all_day: "Show All-Day Events",
      show_past_events: "Show Past Events Today",
      show_location: "Show Location",
      show_description: "Show Description",
      show_header: "Show Header & Navigation",
      refresh_interval: "Refresh Interval (Minutes)",
      api_key: "Google API Key (Optional for Public Calendars)",
      calendar_id: "Google Calendar ID (Optional for Public Calendars)",
    };
    return labels[schema.name] || schema.name;
  }

  _computeHelper(schema) {
    const helpers = {
      entities: "Select calendar entities (supports multiple calendars).",
      color_style: "Pill badge, Left colored border, or Full tinted background.",
      days_to_show: "Range of days to show ahead in Agenda view.",
      api_key: "Only needed when querying public Google calendars directly without Home Assistant integration.",
      calendar_id: "e.g. your_calendar@group.calendar.google.com",
    };
    return helpers[schema.name] || "";
  }

  _getSchema() {
    return [
      {
        name: "title",
        selector: {
          text: {},
        },
      },
      {
        name: "entities",
        selector: {
          entity: {
            multiple: true,
            domain: "calendar",
          },
        },
      },
      {
        name: "default_view",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "agenda", label: "Agenda / List" },
              { value: "month", label: "Month Grid" },
              { value: "week", label: "Week View" },
              { value: "day", label: "Day Timeline" },
            ],
          },
        },
      },
      {
        name: "color_style",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "pill", label: "Pill Badge (Round color badge)" },
              { value: "border", label: "Left Border (Accent line)" },
              { value: "full", label: "Full Background (Tinted card)" },
            ],
          },
        },
      },
      {
        name: "days_to_show",
        selector: {
          number: {
            min: 1,
            max: 60,
            mode: "slider",
          },
        },
      },
      {
        name: "refresh_interval",
        selector: {
          number: {
            min: 1,
            max: 120,
            unit_of_measurement: "min",
            mode: "box",
          },
        },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_all_day", selector: { boolean: {} } },
          { name: "show_past_events", selector: { boolean: {} } },
          { name: "show_location", selector: { boolean: {} } },
          { name: "show_description", selector: { boolean: {} } },
          { name: "show_header", selector: { boolean: {} } },
        ],
      },
      {
        name: "api_key",
        selector: {
          text: {
            type: "password",
          },
        },
      },
      {
        name: "calendar_id",
        selector: {
          text: {},
        },
      },
    ];
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    if (!this._config) return;

    const values = ev.detail.value;
    const newConfig = {
      ...this._config,
      title: values.title || undefined,
      entities: values.entities,
      default_view: values.default_view,
      color_style: values.color_style,
      days_to_show: values.days_to_show,
      show_all_day: values.show_all_day,
      show_past_events: values.show_past_events,
      show_location: values.show_location,
      show_description: values.show_description,
      show_header: values.show_header,
      refresh_interval: values.refresh_interval,
    };

    if (values.api_key || values.calendar_id) {
      newConfig.google_api = {
        api_key: values.api_key || "",
        calendar_id: values.calendar_id || "",
      };
    } else {
      delete newConfig.google_api;
    }

    // Clean up undefined properties
    for (const key of Object.keys(newConfig)) {
      if (newConfig[key] === undefined) {
        delete newConfig[key];
      }
    }

    this._config = newConfig;

    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-form {
          display: block;
          padding: 12px 0;
        }
        .cal-colors-section {
          margin-top: 8px;
        }
        .cal-colors-section .section-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--secondary-text-color, #727272);
          margin-bottom: 4px;
        }
        .cal-color-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 4px;
          border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        }
        .cal-color-row:last-child {
          border-bottom: none;
        }
        .cal-color-row .cal-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.85rem;
        }
        .cal-color-row .cal-color-control {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cal-color-row .cal-color-control input[type="color"] {
          width: 32px;
          height: 28px;
          padding: 0;
          border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
        }
        .cal-color-row .cal-color-control .cal-color-reset {
          font-size: 0.75rem;
          color: var(--secondary-text-color, #727272);
          cursor: pointer;
          background: transparent;
          border: none;
        }
        .cal-colors-empty {
          font-size: 0.8rem;
          color: var(--secondary-text-color, #727272);
          padding: 4px;
        }
      </style>
      <ha-form id="form"></ha-form>
      <div class="cal-colors-section">
        <div class="section-title">Calendar Default Colors</div>
        <div id="cal-colors-list"></div>
      </div>
    `;

    const form = this.shadowRoot.getElementById("form");
    this._form = form;
    form.schema = this._getSchema();
    form.data = this._formatData(this._config);
    form.hass = this._hass;
    form.computeLabel = (s) => this._computeLabel(s);
    form.computeHelper = (s) => this._computeHelper(s);

    form.addEventListener("value-changed", (ev) => this._valueChanged(ev));

    this._renderCalendarColors();
  }

  _renderCalendarColors() {
    const listEl = this.shadowRoot.getElementById("cal-colors-list");
    if (!listEl) return;

    const entities = this._getCalendarEntities();
    if (entities.length === 0) {
      listEl.innerHTML = `<div class="cal-colors-empty">Add calendar entities above to configure per-calendar colors.</div>`;
      return;
    }

    const configColors = this._config.calendar_colors || {};
    listEl.innerHTML = entities.map((entityId) => {
      const friendly = this._hass?.states[entityId]?.attributes?.friendly_name || entityId;
      const color = configColors[entityId] || "";
      return `
        <div class="cal-color-row" data-entity="${escapeHtmlAttr(entityId)}">
          <div class="cal-name" title="${escapeHtmlAttr(entityId)}">${escapeHtmlAttr(friendly)}</div>
          <div class="cal-color-control">
            <input type="color" data-color-input value="${color || "#4285F4"}" />
            ${color ? `<button type="button" class="cal-color-reset" data-color-reset>Reset</button>` : ""}
          </div>
        </div>
      `;
    }).join("");

    listEl.querySelectorAll("[data-color-input]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const row = e.target.closest(".cal-color-row");
        const entityId = row?.getAttribute("data-entity");
        if (!entityId) return;
        this._setCalendarColor(entityId, e.target.value);
      });
    });

    listEl.querySelectorAll("[data-color-reset]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const row = e.target.closest(".cal-color-row");
        const entityId = row?.getAttribute("data-entity");
        if (!entityId) return;
        this._setCalendarColor(entityId, null);
      });
    });
  }

  _getCalendarEntities() {
    let entities = this._config.entities;
    if (typeof entities === "string") {
      entities = entities.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (!Array.isArray(entities)) {
      entities = [];
    }
    return entities;
  }

  _setCalendarColor(entityId, hex) {
    const calendarColors = { ...(this._config.calendar_colors || {}) };
    if (hex) {
      calendarColors[entityId] = hex;
    } else {
      delete calendarColors[entityId];
    }
    this._config = { ...this._config, calendar_colors: calendarColors };
    this._dispatchConfigChanged();
    this._renderCalendarColors();
  }

  _dispatchConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

if (!customElements.get("google-calendar-card-editor")) {
  customElements.define("google-calendar-card-editor", GoogleCalendarCardEditor);
}

function escapeHtmlAttr(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
