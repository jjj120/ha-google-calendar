import type { CardConfig } from "./ha-google-calendar-card";
import type { HomeAssistant } from "./types";

const ENTITY_DOMAIN = "calendar";
const DEFAULT_PALETTE = [
  "#039be5",
  "#7986cb",
  "#33b679",
  "#8e24aa",
  "#e67c73",
  "#f6bf26",
  "#f4511e",
  "#616161",
];

function fireEvent(element: HTMLElement, type: string, detail: unknown): void {
  element.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true }),
  );
}

type HaFormElement = HTMLElement & {
  schema?: unknown;
  data?: unknown;
  hass?: HomeAssistant;
};

export class HaGoogleCalendarCardEditor extends HTMLElement {
  private _config!: CardConfig;
  private _hass?: HomeAssistant;
  private _shadow: ShadowRoot;
  private _form?: HaFormElement;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._shadow.innerHTML = `<style>${this._styles()}</style><div class="root"></div>`;
  }

  setConfig(config: CardConfig): void {
    this._config = config;
    if (this._form) return;
    this._buildForm();
    this._renderColors();
    this._renderHideColors();
  }

  set hass(hass: HomeAssistant) {
    const changed = this._hass !== hass;
    this._hass = hass;
    if (changed && this._form) {
      if (this._form.hass !== hass) this._form.hass = hass;
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  private _styles(): string {
    return `
      :host {
        display: block;
      }
      .root {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .section-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--primary-text-color, #fff);
      }
      .hint {
        color: var(--secondary-text-color, #aaa);
        font-size: 12px;
      }
      .colors {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .color-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .color-row label {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .color-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
      }
      input[type="color"] {
        width: 40px;
        height: 28px;
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
      }
      input[type="color"]:disabled {
        opacity: 0.4;
      }
      button {
        background: none;
        border: 1px solid var(--divider-color, #888);
        color: var(--primary-text-color, inherit);
        border-radius: 4px;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 13px;
      }
    `;
  }

  private _buildForm(): void {
    const root = this._shadow.querySelector<HTMLElement>(".root");
    if (!root) return;

    const schema = [
      {
        name: "entities",
        required: true,
        selector: {
          entity: {
            multiple: true,
            filter: { domain: ENTITY_DOMAIN },
          },
        },
      },
      { name: "title", selector: { text: {} } },
      {
        name: "days",
        selector: { number: { min: 1, max: 60, mode: "slider" } },
      },
      {
        name: "lookback",
        selector: { number: { min: 0, max: 30, mode: "slider" } },
      },
      {
        name: "maxEvents",
        selector: { number: { min: 1, max: 500 } },
      },
      { name: "showTime", selector: { boolean: {} } },
      { name: "showCalendarName", selector: { boolean: {} } },
      { name: "showEmpty", selector: { boolean: {} } },
      {
        name: "view",
        selector: {
          select: {
            options: [
              { value: "agenda", label: "Agenda list" },
              { value: "month", label: "Month grid" },
            ],
          },
        },
      },
      {
        name: "firstDayOfWeek",
        selector: {
          select: {
            options: [
              { value: "monday", label: "Monday" },
              { value: "sunday", label: "Sunday" },
            ],
          },
        },
      },
      {
        name: "monthChipLimit",
        selector: { number: { min: 1, max: 50 } },
      },
    ];

    const form = document.createElement("ha-form") as HaFormElement;
    form.schema = schema;
    form.data = this._formData();
    form.hass = this._hass;

    form.addEventListener("value-changed", (ev) => {
      const value = (ev as CustomEvent).detail?.value ?? {};
      this._config = {
        ...this._config,
        ...(value as Partial<CardConfig>),
      };
      fireEvent(this, "config-changed", { config: this._config });
      this._renderColors();
      this._renderHideColors();
    });

    this._form = form;
    root.appendChild(form);
  }

  private _formData(): Partial<CardConfig> {
    const config = this._config ?? {};
    return {
      entities: config.entities ?? [],
      title: config.title ?? "",
      days: config.days ?? 30,
      lookback: config.lookback ?? 7,
      maxEvents: config.maxEvents ?? 100,
      showTime: config.showTime ?? true,
      showCalendarName: config.showCalendarName ?? false,
      showEmpty: config.showEmpty ?? false,
      view: config.view ?? "agenda",
      firstDayOfWeek: config.firstDayOfWeek ?? "monday",
      monthChipLimit: config.monthChipLimit ?? 30,
    };
  }

  private _calendarEntities(): string[] {
    const entities = (this._config?.entities ?? []) as string[];
    if (entities.length > 0) return entities;
    if (!this._hass) return [];
    return Object.values(this._hass.states)
      .filter((state) => state.entity_id.startsWith(`${ENTITY_DOMAIN}.`))
      .map((state) => state.entity_id)
      .sort();
  }

  private _renderColors(): void {
    const root = this._shadow.querySelector<HTMLElement>(".root");
    if (!root) return;
    const existing = this._shadow.querySelector<HTMLElement>(".colors");
    if (existing) existing.remove();
    const heading = this._shadow.querySelector<HTMLElement>(".colors-title");
    if (heading) heading.remove();

    const entities = this._calendarEntities();
    const colors = this._config.colors ?? {};

    const title = document.createElement("div");
    title.className = "section-title colors-title";
    title.textContent = "Per-calendar colour overrides";
    root.appendChild(title);

    const slot = document.createElement("div");
    slot.className = "colors";
    entities.forEach((entityId, index) => {
      slot.appendChild(this._colorRow(entityId, colors, index));
    });
    root.appendChild(slot);
  }

  private _colorRow(
    entityId: string,
    colors: Record<string, string>,
    index: number,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "color-row";

    const has = entityId in colors;
    const value = colors[entityId] ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = has;
    checkbox.addEventListener("change", () => {
      const next = { ...colors };
      if (checkbox.checked) {
        next[entityId] = colorInput.value;
      } else {
        delete next[entityId];
      }
      this._config = { ...this._config, colors: next };
      fireEvent(this, "config-changed", { config: this._config });
    });

    const name = document.createElement("span");
    name.className = "color-name";
    name.textContent = entityId;

    label.append(checkbox, name);

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = value;
    colorInput.disabled = !has;
    colorInput.addEventListener("input", () => {
      if (!checkbox.checked) {
        checkbox.checked = true;
      }
      this._config = {
        ...this._config,
        colors: { ...(this._config.colors ?? {}), [entityId]: colorInput.value },
      };
      fireEvent(this, "config-changed", { config: this._config });
    });

    row.append(label, colorInput);
    return row;
  }

  private _renderHideColors(): void {
    const root = this._shadow.querySelector<HTMLElement>(".root");
    if (!root) return;
    const heading = this._shadow.querySelector<HTMLElement>(".hide-title");
    if (heading) heading.remove();
    const container = this._shadow.querySelector<HTMLElement>(".hide-colors");
    if (container) container.remove();

    const hideColors = this._config.hideColors ?? [];

    const title = document.createElement("div");
    title.className = "section-title hide-title";
    title.textContent = "Hide events by colour";
    root.appendChild(title);

    const slot = document.createElement("div");
    slot.className = "hide-colors colors";

    hideColors.forEach((color, index) => {
      slot.appendChild(this._hideColorRow(color, index));
    });

    const add = document.createElement("button");
    add.type = "button";
    add.textContent = "Add colour";
    add.addEventListener("click", () => {
      const next = [...(this._config.hideColors ?? [])];
      next.push(DEFAULT_PALETTE[next.length % DEFAULT_PALETTE.length]);
      this._config = { ...this._config, hideColors: next };
      fireEvent(this, "config-changed", { config: this._config });
      this._renderHideColors();
    });
    slot.appendChild(add);

    root.appendChild(slot);
  }

  private _hideColorRow(color: string, index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "color-row";

    const name = document.createElement("span");
    name.className = "color-name";
    name.textContent = color;

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = color;
    colorInput.addEventListener("input", () => {
      const next = [...(this._config.hideColors ?? [])];
      next[index] = colorInput.value;
      this._config = { ...this._config, hideColors: next };
      fireEvent(this, "config-changed", { config: this._config });
      this._renderHideColors();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      const next = [...(this._config.hideColors ?? [])];
      next.splice(index, 1);
      this._config = { ...this._config, hideColors: next };
      fireEvent(this, "config-changed", { config: this._config });
      this._renderHideColors();
    });

    row.append(name, colorInput, remove);
    return row;
  }
}

if (!customElements.get("ha-google-calendar-card-editor")) {
  customElements.define("ha-google-calendar-card-editor", HaGoogleCalendarCardEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-google-calendar-card-editor": HaGoogleCalendarCardEditor;
  }
}
