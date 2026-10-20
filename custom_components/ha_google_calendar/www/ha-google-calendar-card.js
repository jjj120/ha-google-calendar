var ne = Object.defineProperty;
var se = (n, a, e) => a in n ? ne(n, a, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[a] = e;
var v = (n, a, e) => se(n, typeof a != "symbol" ? a + "" : a, e);
const Y = "calendar", M = [
  { name: "Lavender", hex: "#7986CB" },
  { name: "Sage", hex: "#33B679" },
  { name: "Grape", hex: "#8E24AA" },
  { name: "Flamingo", hex: "#E67C73" },
  { name: "Banana", hex: "#F6BF26" },
  { name: "Tangerine", hex: "#F4511E" },
  { name: "Peacock", hex: "#039BE5" },
  { name: "Graphite", hex: "#616161" },
  { name: "Blueberry", hex: "#3F51B5" },
  { name: "Basil", hex: "#0B8043" },
  { name: "Tomato", hex: "#D50000" }
];
function E(n, a, e) {
  n.dispatchEvent(
    new CustomEvent(a, { detail: e, bubbles: !0, composed: !0 })
  );
}
class ie extends HTMLElement {
  constructor() {
    super();
    v(this, "_config");
    v(this, "_hass");
    v(this, "_shadow");
    v(this, "_form");
    this._shadow = this.attachShadow({ mode: "open" }), this._shadow.innerHTML = `<style>${this._styles()}</style><div class="root"></div>`;
  }
  setConfig(e) {
    this._config = e, !this._form && (this._buildForm(), this._renderColors(), this._renderHideColors());
  }
  set hass(e) {
    const t = this._hass !== e;
    this._hass = e, t && this._form && this._form.hass !== e && (this._form.hass = e);
  }
  get hass() {
    return this._hass;
  }
  _styles() {
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
      .hide-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .hide-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: 1px solid var(--divider-color, #888);
        color: var(--primary-text-color, inherit);
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 12px;
        opacity: 0.65;
      }
      .hide-chip.active {
        opacity: 1;
        border-color: var(--primary-color, #03a9f4);
      }
      .hide-chip-dot {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
        flex: 0 0 auto;
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
  _buildForm() {
    const e = this._shadow.querySelector(".root");
    if (!e) return;
    const t = [
      {
        name: "entities",
        required: !0,
        selector: {
          entity: {
            multiple: !0,
            filter: { domain: Y }
          }
        }
      },
      { name: "title", selector: { text: {} } },
      {
        name: "days",
        selector: { number: { min: 1, max: 60, mode: "slider" } }
      },
      {
        name: "lookback",
        selector: { number: { min: 0, max: 30, mode: "slider" } }
      },
      {
        name: "maxEvents",
        selector: { number: { min: 1, max: 500 } }
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
              { value: "day", label: "Day view" }
            ]
          }
        }
      },
      {
        name: "firstDayOfWeek",
        selector: {
          select: {
            options: [
              { value: "monday", label: "Monday" },
              { value: "sunday", label: "Sunday" }
            ]
          }
        }
      },
      {
        name: "monthChipLimit",
        label: "Minimum events per day (month view)",
        selector: { number: { min: 1, max: 50 } }
      }
    ], o = document.createElement("ha-form");
    o.schema = t, o.data = this._formData(), o.hass = this._hass, o.addEventListener("value-changed", (i) => {
      const s = i.detail?.value ?? {};
      this._config = {
        ...this._config,
        ...s
      }, E(this, "config-changed", { config: this._config }), this._renderColors(), this._renderHideColors();
    }), this._form = o, e.appendChild(o);
  }
  _formData() {
    const e = this._config ?? {};
    return {
      entities: e.entities ?? [],
      title: e.title ?? "",
      days: e.days ?? 30,
      lookback: e.lookback ?? 7,
      maxEvents: e.maxEvents ?? 100,
      showTime: e.showTime ?? !0,
      showCalendarName: e.showCalendarName ?? !1,
      showEmpty: e.showEmpty ?? !1,
      view: e.view ?? "agenda",
      firstDayOfWeek: e.firstDayOfWeek ?? "monday",
      monthChipLimit: e.monthChipLimit ?? 1
    };
  }
  _calendarEntities() {
    const e = this._config?.entities ?? [];
    return e.length > 0 ? e : this._hass ? Object.values(this._hass.states).filter((t) => t.entity_id.startsWith(`${Y}.`)).map((t) => t.entity_id).sort() : [];
  }
  _renderColors() {
    const e = this._shadow.querySelector(".root");
    if (!e) return;
    const t = this._shadow.querySelector(".colors");
    t && t.remove();
    const o = this._shadow.querySelector(".colors-title");
    o && o.remove();
    const i = this._calendarEntities(), s = this._config.colors ?? {}, r = document.createElement("div");
    r.className = "section-title colors-title", r.textContent = "Per-calendar colour overrides", e.appendChild(r);
    const c = document.createElement("div");
    c.className = "colors", i.forEach((d, h) => {
      c.appendChild(this._colorRow(d, s, h));
    }), e.appendChild(c);
  }
  _colorRow(e, t, o) {
    const i = document.createElement("div");
    i.className = "color-row";
    const s = e in t, r = t[e] ?? M[o % M.length].hex, c = document.createElement("label"), d = document.createElement("input");
    d.type = "checkbox", d.checked = s, d.addEventListener("change", () => {
      const p = { ...t };
      d.checked ? p[e] = l.value : delete p[e], this._config = { ...this._config, colors: p }, E(this, "config-changed", { config: this._config });
    });
    const h = document.createElement("span");
    h.className = "color-name", h.textContent = e, c.append(d, h);
    const l = document.createElement("input");
    return l.type = "color", l.value = r, l.disabled = !s, l.addEventListener("input", () => {
      d.checked || (d.checked = !0), this._config = {
        ...this._config,
        colors: { ...this._config.colors ?? {}, [e]: l.value }
      }, E(this, "config-changed", { config: this._config });
    }), i.append(c, l), i;
  }
  _renderHideColors() {
    const e = this._shadow.querySelector(".root");
    if (!e) return;
    const t = this._shadow.querySelector(".hide-title");
    t && t.remove();
    const o = this._shadow.querySelector(".hide-colors");
    o && o.remove();
    const i = this._config.hideColors ?? [], s = document.createElement("div");
    s.className = "section-title hide-title", s.textContent = "Hide events by colour", e.appendChild(s);
    const r = document.createElement("div");
    r.className = "hide-colors colors";
    const c = document.createElement("div");
    c.className = "hide-grid", M.forEach(({ name: h, hex: l }) => {
      const p = i.some(
        (g) => g.toLowerCase() === l.toLowerCase()
      ), u = document.createElement("button");
      u.type = "button", u.className = p ? "hide-chip active" : "hide-chip", u.dataset.hex = l;
      const f = document.createElement("span");
      f.className = "hide-chip-dot", f.style.backgroundColor = l;
      const _ = document.createElement("span");
      _.textContent = h, u.append(f, _), u.addEventListener("click", () => {
        const g = [...this._config.hideColors ?? []], y = g.findIndex(
          (w) => w.toLowerCase() === l.toLowerCase()
        );
        y >= 0 ? g.splice(y, 1) : g.push(l), this._config = { ...this._config, hideColors: g }, E(this, "config-changed", { config: this._config }), this._renderHideColors();
      }), c.appendChild(u);
    }), r.appendChild(c), i.forEach((h, l) => {
      M.some((p) => p.hex.toLowerCase() === h.toLowerCase()) || r.appendChild(this._hideColorRow(h, l));
    });
    const d = document.createElement("button");
    d.type = "button", d.textContent = "Add colour", d.addEventListener("click", () => {
      const h = [...this._config.hideColors ?? []];
      h.push(M[h.length % M.length].hex), this._config = { ...this._config, hideColors: h }, E(this, "config-changed", { config: this._config }), this._renderHideColors();
    }), r.appendChild(d), e.appendChild(r);
  }
  _hideColorRow(e, t) {
    const o = document.createElement("div");
    o.className = "color-row";
    const i = document.createElement("span");
    i.className = "color-name", i.textContent = e;
    const s = document.createElement("input");
    s.type = "color", s.value = e, s.addEventListener("input", () => {
      const c = [...this._config.hideColors ?? []];
      c[t] = s.value, this._config = { ...this._config, hideColors: c }, E(this, "config-changed", { config: this._config }), this._renderHideColors();
    });
    const r = document.createElement("button");
    return r.type = "button", r.textContent = "Remove", r.addEventListener("click", () => {
      const c = [...this._config.hideColors ?? []];
      c.splice(t, 1), this._config = { ...this._config, hideColors: c }, E(this, "config-changed", { config: this._config }), this._renderHideColors();
    }), o.append(i, s, r), o;
  }
}
customElements.get("ha-google-calendar-card-editor") || customElements.define("ha-google-calendar-card-editor", ie);
const V = 30, W = 7, re = 30 * 60 * 1e3, H = 24 * 60 * 60 * 1e3, ae = ["S", "M", "T", "W", "T", "F", "S"];
function A(n) {
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function D(n, a) {
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + a);
}
function P(n) {
  return n?.dateTime ? new Date(n.dateTime) : n?.date ? /* @__PURE__ */ new Date(`${n.date}T00:00:00`) : null;
}
function $(n) {
  const a = n.getFullYear(), e = `${n.getMonth() + 1}`.padStart(2, "0"), t = `${n.getDate()}`.padStart(2, "0");
  return `${a}-${e}-${t}`;
}
function U(n) {
  return `${n.getFullYear()}-${n.getMonth()}`;
}
function L(n, a) {
  return $(n) === $(a);
}
function J(n) {
  const a = n.getHours(), e = `${n.getMinutes()}`.padStart(2, "0"), t = a >= 12 ? "PM" : "AM";
  return `${a % 12 === 0 ? 12 : a % 12}:${e} ${t}`;
}
function ce(n) {
  const a = n.getHours(), e = n.getMinutes();
  return `${a.toString().padStart(2, "0")}:${e.toString().padStart(2, "0")}`;
}
function le(n, a, e) {
  return L(n, a) ? "Today" : L(n, e) ? "Tomorrow" : `${new Intl.DateTimeFormat(void 0, {
    weekday: "long"
  }).format(n)}, ${n.toLocaleDateString()}`;
}
function Q(n) {
  return n.getDay();
}
function de(n) {
  const a = n.firstDayOfWeek;
  if (a === "sunday") return 0;
  if (a === "monday") return 1;
  const t = (navigator.language || "en").split("-")[1];
  return t && ["US", "CA", "JP"].includes(t) ? 0 : 1;
}
function N(n) {
  const a = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(n);
  if (!a) return null;
  let e = a[1];
  e.length === 3 && (e = e.split("").map((r) => r + r).join(""));
  const t = parseInt(e.slice(0, 2), 16), o = parseInt(e.slice(2, 4), 16), i = parseInt(e.slice(4, 6), 16);
  return 0.2126 * j(t) + 0.7152 * j(o) + 0.0722 * j(i) > 0.5 ? "#000000" : "#ffffff";
}
function j(n) {
  const a = n / 255;
  return a <= 0.03928 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
}
function he(n, a, e, t, o) {
  const i = t.colors?.[a];
  if (i) return i;
  const s = e?.attributes ?? {}, r = typeof s.event_colors == "object" && s.event_colors !== null ? s.event_colors : {}, c = n.uid ? r[n.uid] : void 0;
  return typeof c == "string" ? c : typeof s.calendar_color == "string" ? s.calendar_color : o;
}
function O(n) {
  const a = A(n.startDate), e = n.endDate.getTime(), t = new Date(Math.max(e - 1, n.startDate.getTime())), o = A(t);
  return { startDay: a, lastDay: o < a ? a : o };
}
function X(n) {
  const a = O(n);
  return a.lastDay.getTime() > a.startDay.getTime();
}
function Z(n, a) {
  const e = n.startDate.getTime() - a.startDate.getTime();
  if (e !== 0) return e;
  const t = (n.summary ?? "").localeCompare(a.summary ?? "");
  if (t !== 0) return t;
  const o = (n.calendarName ?? "").localeCompare(a.calendarName ?? "");
  return o !== 0 ? o : (n.uid ?? "").localeCompare(a.uid ?? "");
}
function I(n, a) {
  const e = new Date(n.getFullYear(), n.getMonth(), 1), t = new Date(n.getFullYear(), n.getMonth() + 1, 0), o = (Q(e) - a + 7) % 7, i = D(e, -o), s = (Q(t) - a + 7) % 7, r = D(t, 6 - s), c = [];
  for (let d = i; d <= r; d = D(d, 1))
    c.push(d);
  return c;
}
function me(n) {
  const a = [], e = [...n].sort(
    (t, o) => t.colStart - o.colStart || o.colEnd - o.colStart - (t.colEnd - t.colStart)
  );
  for (const t of e) {
    let o = !1;
    for (const i of a)
      if (!i.some((s) => s.colStart < t.colEnd && t.colStart < s.colEnd)) {
        i.push(t), o = !0;
        break;
      }
    o || a.push([t]);
  }
  return a;
}
function pe(n) {
  return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
}
function ue(n) {
  const a = [...n].sort(
    (s, r) => s.startMin - r.startMin || r.endMin - s.endMin || (s.event.summary ?? "").localeCompare(r.event.summary ?? "")
  ), e = [];
  let t = [], o = -1;
  for (const s of a)
    t.length > 0 && s.startMin >= o && (e.push(t), t = [], o = -1), t.push(s), o = Math.max(o, s.endMin);
  t.length > 0 && e.push(t);
  const i = [];
  for (const s of e) {
    const r = [], c = [];
    for (const h of s) {
      let l = r.findIndex((p) => p <= h.startMin);
      l === -1 ? (l = r.length, r.push(h.endMin)) : r[l] = h.endMin, c.push({ item: h, column: l });
    }
    const d = r.length;
    for (const h of c)
      i.push({ ...h.item, column: h.column, numColumns: d });
  }
  return i.sort(
    (s, r) => s.startMin - r.startMin || s.column - r.column
  );
}
class fe extends HTMLElement {
  constructor() {
    super();
    v(this, "_config");
    v(this, "_hass");
    v(this, "_shadow");
    v(this, "_rootEl");
    v(this, "_events", []);
    v(this, "_colorMaps", {});
    v(this, "_loading", !1);
    v(this, "_error");
    v(this, "_sourceKey", "");
    v(this, "_refreshTimer");
    v(this, "_resizeObserver");
    // Measured month-cell geometry (updated after each layout via ResizeObserver /
    // requestAnimationFrame). Used to compute the per-day chip fit, accounting for
    // the vertical space taken up by the multi-day bars inside each cell.
    v(this, "_cellH", 160);
    v(this, "_chipRowH", 14);
    v(this, "_dayNumH", 20);
    v(this, "_segRowH", 15);
    v(this, "_noteH", 16);
    v(this, "_monthAnchor", /* @__PURE__ */ new Date());
    // Day view state. _dayAnchor is the day shown in the timeline; _viewOverride
    // lets a user click into the day view from the month grid without permanently
    // changing the configured view (the saved `view` stays "month").
    v(this, "_dayAnchor", /* @__PURE__ */ new Date());
    v(this, "_viewOverride", null);
    v(this, "_dayLabelStep", 1);
    this._shadow = this.attachShadow({ mode: "open" }), this._shadow.innerHTML = `<style>${this._styles()}</style><div class="root"></div>`, this._rootEl = this._shadow.querySelector(".root"), this._rootEl.addEventListener("click", (e) => this._onClick(e));
  }
  setConfig(e) {
    this._config = e, this._render();
  }
  set hass(e) {
    const t = this._hass !== e;
    this._hass = e, t && this._maybeScheduleRefresh(), this._render();
  }
  get hass() {
    return this._hass;
  }
  static getConfigElement() {
    return document.createElement("ha-google-calendar-card-editor");
  }
  static getStubConfig() {
    return {
      type: "custom:ha-google-calendar-card",
      entities: [],
      title: "Upcoming events",
      days: 30,
      lookback: 7,
      maxEvents: 100,
      showTime: !0,
      showCalendarName: !1,
      showEmpty: !1,
      view: "agenda"
    };
  }
  getCardSize() {
    return this._effectiveView() === "month" ? this._monthRows() : Math.min(Math.max(this._events.length, 1), 12);
  }
  getGridOptions() {
    return this._effectiveView() === "month" ? { columns: 6, rows: this._monthRows() } : this._effectiveView() === "day" ? { columns: 2, rows: 4 } : { columns: 3, rows: 4 };
  }
  _monthRows() {
    return Math.ceil(I(this._monthAnchor, this._firstDayIndex()).length / 7) + 2;
  }
  _effectiveView() {
    return this._viewOverride ?? this._config.view ?? "agenda";
  }
  connectedCallback() {
    this._resizeObserver || (this._resizeObserver = new ResizeObserver(() => this._measureGeometry()), this._resizeObserver.observe(this));
  }
  disconnectedCallback() {
    this._refreshTimer && window.clearTimeout(this._refreshTimer), this._resizeObserver && (this._resizeObserver.disconnect(), this._resizeObserver = void 0);
  }
  _measureGeometry() {
    const e = this._effectiveView();
    e === "month" ? this._measureMonthCell() : e === "day" && this._measureDayLabels();
  }
  _measureMonthCell() {
    const e = this._rootEl.querySelector(".day-cell");
    if (!e) return;
    const t = this._rootEl.querySelector(".chip"), o = this._rootEl.querySelector(".day-num");
    if (!t || !o) return;
    const i = this._rootEl.querySelector(".ms-seg"), s = e.clientHeight, r = t.offsetHeight + 2, c = o.offsetHeight, d = i ? i.offsetHeight + 1 : 0;
    s === this._cellH && r === this._chipRowH && c === this._dayNumH && d === this._segRowH || (this._cellH = s, this._chipRowH = r, this._dayNumH = c, this._segRowH = d, this._render());
  }
  // Pick the smallest hour-label step from {1,2,3,4,6,12} that keeps the tick
  // labels at least ~18px apart for the lane's current height, so the gutter
  // stays readable on short fit-to-height cards.
  _measureDayLabels() {
    const e = this._rootEl.querySelector(".day-lane");
    if (!e) return;
    const t = e.clientHeight;
    if (t <= 0) return;
    const o = t / 24;
    let i = 12;
    for (const s of [1, 2, 3, 4, 6, 12])
      if (o * s >= 18) {
        i = s;
        break;
      }
    i !== this._dayLabelStep && (this._dayLabelStep = i, this._render());
  }
  _firstDayIndex() {
    return de(this._config);
  }
  _styles() {
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
      .month-header {
        display: grid; grid-template-columns: 1fr auto 1fr;
        align-items: center; gap: 4px; padding: 10px 8px 6px;
      }
      .month-custom {
        grid-column: 1; min-width: 0; font-size: 15px; font-weight: 500;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        justify-self: start;
      }
      .month-title {
        grid-column: 2; font-size: 15px; font-weight: 500; padding: 0 8px;
        text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .month-nav { grid-column: 3; display: flex; align-items: center; gap: 2px; justify-self: end; }
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
      .month-scroll {
        flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 8px 8px;
        display: flex; flex-direction: column;
      }
      .week {
        margin-bottom: 4px; flex: 1 1 0; min-height: 0;
        display: flex; flex-direction: column;
      }
      .week-days {
        display: grid; grid-template-columns: repeat(7, 1fr);
        grid-template-rows: 1fr; flex: 1 1 auto; min-height: 0;
      }
      .ms-seg {
        position: relative; margin: 1px -3px 1px; padding: 0 4px;
        font-size: 11px; line-height: 14px; min-height: 14px; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        cursor: pointer;
      }
      .cont { position: absolute; right: 0; top: 0; bottom: 0; padding: 0 2px; opacity: 0.9; }
      .cont-l { position: absolute; left: 0; top: 0; bottom: 0; padding: 0 2px; opacity: 0.9; }
      .day-cell {
        min-height: 52px; border-top: 1px solid var(--divider-color, rgba(128,128,128,0.25));
        padding: 2px 3px; cursor: pointer; overflow: hidden;
      }
      .day-cell:hover { background-color: rgba(128,128,128,0.08); }
      .day-cell.out-month { opacity: 0.4; }
      .day-cell.past { opacity: 0.5; }
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

      /* Day (timeline) view */
      .day-view { display: flex; flex-direction: column; height: 100%; min-height: 0; }
      .day-all {
        display: flex; flex-wrap: wrap; gap: 4px; padding: 0 12px 4px; flex: 0 0 auto;
      }
      .all-chip {
        border-radius: 3px; font-size: 11px; padding: 2px 6px; max-width: 100%;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;
      }
      .day-pane {
        display: grid; grid-template-columns: 48px 1fr; flex: 1 1 auto;
        min-height: 0; margin: 0 8px 8px; position: relative;
      }
      .day-gutter, .day-lane { position: relative; height: 100%; min-height: 0; }
      .day-gutter { border-top: 1px solid var(--divider-color, rgba(128,128,128,0.25)); }
      .gutter-label {
        position: absolute; right: 6px; transform: translateY(-50%);
        font-size: 10px; color: var(--secondary-text-color); white-space: nowrap;
      }
      .day-lane { border-left: 1px solid var(--divider-color, rgba(128,128,128,0.25)); }
      .gridline {
        position: absolute; left: 0; right: 0; height: 1px;
        background: var(--divider-color, rgba(128,128,128,0.25)); pointer-events: none;
      }
      .now-line {
        position: absolute; left: 0; right: 0; height: 1px;
        background-color: var(--primary-color); z-index: 2; pointer-events: none;
      }
      .now-dot {
        position: absolute; right: 4px; width: 8px; height: 8px; border-radius: 50%;
        background-color: var(--primary-color); transform: translateY(-50%); z-index: 3;
      }
      .time-event {
        position: absolute; box-sizing: border-box; border-radius: 3px;
        overflow: hidden; padding: 1px 4px; font-size: 11px; line-height: 1.3;
        min-height: 12px; color: #fff; cursor: default; z-index: 1;
      }
      .time-event-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    `;
  }
  _sourceKeyNow() {
    return JSON.stringify({
      entities: this._config?.entities ?? [],
      view: this._effectiveView(),
      anchor: this._effectiveView() === "month" ? U(this._monthAnchor) : this._effectiveView() === "day" ? $(this._dayAnchor) : null,
      days: this._config?.days ?? V,
      lookback: this._config?.lookback ?? W
    });
  }
  _maybeScheduleRefresh() {
    this._sourceKeyNow() !== this._sourceKey ? this._reload() : this._render(), this._refreshTimer && window.clearTimeout(this._refreshTimer), this._refreshTimer = window.setTimeout(() => {
      this._loading || this._fetch(this._sourceKey);
    }, re);
  }
  _requestWindow() {
    const e = this._effectiveView();
    if (e === "month") {
      const i = I(this._monthAnchor, this._firstDayIndex()), s = D(i[0], -1), r = D(i[i.length - 1], 2);
      return { start: s, end: r };
    }
    if (e === "day") {
      const i = A(this._dayAnchor), s = D(i, 1);
      return { start: i, end: s };
    }
    const t = new Date(Date.now() - (this._config.lookback ?? W) * H), o = new Date(Date.now() + (this._config.days ?? V) * H);
    return { start: t, end: o };
  }
  async _fetch(e) {
    if (!this._hass) return;
    this._loading = !0, this._error = void 0, this._render();
    const t = this._config.entities, { start: o, end: i } = this._requestWindow(), s = encodeURIComponent(o.toISOString()), r = encodeURIComponent(i.toISOString());
    try {
      const c = [];
      if (await Promise.all(
        t.map(async (d) => {
          const h = this._hass?.states[d], l = await this._hass.callApi(
            "GET",
            `calendars/${d}?start=${s}&end=${r}`
          );
          let p = {}, u;
          try {
            const _ = (await this._hass.callApi("GET", `states/${d}`))?.attributes ?? {};
            typeof _.event_colors == "object" && _.event_colors !== null && (p = _.event_colors), typeof _.calendar_color == "string" && (u = _.calendar_color);
          } catch {
          }
          (u !== void 0 || Object.keys(p).length > 0) && (this._colorMaps[d] = { colors: p, fallback: u });
          for (const f of l) {
            const _ = P(f.start), g = P(f.end);
            if (!_ || !g) continue;
            const y = !!(f.start && f.start.date && !f.start.dateTime), w = {
              ...f,
              entityId: d,
              startDate: _,
              endDate: g,
              calendarName: String(h?.attributes?.friendly_name ?? d),
              all_day: y
            };
            this._shouldHide(w) || c.push(w);
          }
        })
      ), e !== this._sourceKey) return;
      c.sort(Z), this._events = c;
    } catch (c) {
      if (e !== this._sourceKey) return;
      this._error = c instanceof Error ? c.message : "Failed to load calendar events.";
    } finally {
      e === this._sourceKey && (this._loading = !1), this._render();
    }
  }
  _onClick(e) {
    const t = e.target.closest(
      "[data-action], [data-day]"
    );
    if (!t) return;
    const o = t.getAttribute("data-action");
    if (o === "prev") {
      this._monthAnchor = new Date(this._monthAnchor.getFullYear(), this._monthAnchor.getMonth() - 1, 1), this._viewOverride = null, this._reload();
      return;
    }
    if (o === "next") {
      this._monthAnchor = new Date(this._monthAnchor.getFullYear(), this._monthAnchor.getMonth() + 1, 1), this._viewOverride = null, this._reload();
      return;
    }
    if (o === "today") {
      this._monthAnchor = /* @__PURE__ */ new Date(), this._viewOverride = null, this._reload();
      return;
    }
    if (o === "day-prev") {
      this._dayAnchor = D(this._dayAnchor, -1), this._reload();
      return;
    }
    if (o === "day-next") {
      this._dayAnchor = D(this._dayAnchor, 1), this._reload();
      return;
    }
    if (o === "day-today") {
      this._dayAnchor = /* @__PURE__ */ new Date(), this._reload();
      return;
    }
    if (o === "back-to-month") {
      this._monthAnchor = new Date(
        this._dayAnchor.getFullYear(),
        this._dayAnchor.getMonth(),
        1
      ), this._viewOverride = null, this._reload();
      return;
    }
    const i = t.getAttribute("data-day");
    if (i) {
      const s = /* @__PURE__ */ new Date(`${i}T00:00:00`);
      this._dayAnchor = s, this._viewOverride = "day", this._reload();
    }
  }
  _reload() {
    this._sourceKey = this._sourceKeyNow(), this._fetch(this._sourceKey);
  }
  _render() {
    const e = this._rootEl, t = this._config;
    if (!t) {
      e.innerHTML = '<div class="error">Google Calendar card: configuration missing.</div>';
      return;
    }
    if (!t.entities || t.entities.length === 0) {
      e.innerHTML = '<div class="empty">Select at least one calendar entity in the card settings.</div>';
      return;
    }
    if (this._error) {
      e.innerHTML = `<div class="error">${this._escape(this._error)}</div>`;
      return;
    }
    if (this._loading && this._events.length === 0) {
      e.innerHTML = '<div class="spinner">Loading calendar…</div>';
      return;
    }
    this._effectiveView() === "month" ? this._renderMonth(e, t) : this._effectiveView() === "day" ? this._renderDay(e, t) : this._renderAgenda(e, t), window.requestAnimationFrame(() => this._measureGeometry());
  }
  _renderAgenda(e, t) {
    const o = t.maxEvents ?? 100, i = this._events.slice(0, o), s = t.showTime ?? !0, r = t.showCalendarName ?? !1, c = /* @__PURE__ */ new Date(), d = new Date(c.getTime() + H), h = [];
    for (const u of i) {
      const f = $(u.startDate), _ = h[h.length - 1];
      (!_ || _.key !== f) && h.push({
        key: f,
        label: le(u.startDate, c, d),
        events: []
      }), h[h.length - 1].events.push(u);
    }
    const l = t.title ? `<div class="header">${this._escape(t.title)}</div>` : "";
    if (h.length === 0) {
      e.innerHTML = `${l}<div class="body"><div class="empty">No upcoming events</div></div>`;
      return;
    }
    const p = h.map(
      (u) => `
          <div class="day">
            <div class="day-head">${this._escape(u.label)}</div>
            ${u.events.map((f) => this._eventHtml(f, s, r)).join("")}
          </div>`
    ).join("");
    e.innerHTML = `${l}<div class="body">${p}</div>`;
  }
  _renderMonth(e, t) {
    const o = this._firstDayIndex(), i = I(this._monthAnchor, o), s = t.title, r = ae.map((l, p) => {
      const u = new Date(2024, 0, 1 + (p + o - 1 + 7) % 7);
      return new Intl.DateTimeFormat(void 0, { weekday: "narrow" }).format(u);
    }), c = /* @__PURE__ */ new Map();
    for (const l of this._events) {
      const { startDay: p, lastDay: u } = O(l);
      for (let f = new Date(p); f <= u; f = D(f, 1)) {
        const _ = $(f), g = c.get(_);
        g ? g.push(l) : c.set(_, [l]);
      }
    }
    const d = [];
    for (let l = 0; l < i.length; l += 7) {
      const p = i.slice(l, l + 7), u = p[0], f = p[6], _ = U(u);
      d.push(this._weekHtml(p, u, f, _, c));
    }
    const h = this._monthLabel();
    e.innerHTML = `
      <div class="month-header">
        <div class="month-custom">${s ? this._escape(s) : ""}</div>
        <div class="month-title">${this._escape(h)}</div>
        <div class="month-nav">
          <button class="nav-btn" data-action="prev" title="Previous month">‹</button>
          <button class="nav-btn" data-action="today" title="Today">●</button>
          <button class="nav-btn" data-action="next" title="Next month">›</button>
        </div>
      </div>
      <div class="weekday-row">
        ${r.map((l) => `<div class="weekday">${this._escape(l)}</div>`).join("")}
      </div>
      <div class="month-scroll">
        ${d.join("")}
      </div>
    `;
  }
  _monthLabel() {
    return new Intl.DateTimeFormat(void 0, { month: "long", year: "numeric" }).format(
      this._monthAnchor
    );
  }
  _dayHeaderLabel(e) {
    const t = /* @__PURE__ */ new Date(), o = D(t, 1);
    return L(e, t) ? "Today" : L(e, o) ? "Tomorrow" : new Intl.DateTimeFormat(void 0, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(e);
  }
  _hourLabel(e) {
    return `${e % 12 || 12} ${e < 12 ? "AM" : "PM"}`;
  }
  _renderDay(e, t) {
    const i = A(this._dayAnchor).getTime(), s = this._dayHeaderLabel(this._dayAnchor), r = t.title, c = this._viewOverride === "day", d = [], h = [];
    for (const m of this._events) {
      const b = O(m);
      if (b.startDay.getTime() > i || b.lastDay.getTime() < i) continue;
      if (m.all_day) {
        d.push(m);
        continue;
      }
      const C = Math.max(0, (m.startDate.getTime() - i) / 6e4), T = Math.min(1440, (m.endDate.getTime() - i) / 6e4);
      T <= C || h.push({ event: m, startMin: C, endMin: T });
    }
    const l = ue(h), p = [], u = [], f = this._dayLabelStep;
    for (let m = 0; m <= 24; m++)
      p.push(`<div class="gridline" style="top:${m / 24 * 100}%"></div>`), m < 24 && m % f === 0 && u.push(
        `<div class="gutter-label" style="top:${m / 24 * 100}%">${this._escape(this._hourLabel(m))}</div>`
      );
    const _ = /* @__PURE__ */ new Date();
    let g = "", y = "";
    if (L(this._dayAnchor, _)) {
      const m = pe(_) / 1440 * 100;
      g = `<div class="now-line" style="top:${m}%"></div>`, y = `<div class="now-dot" style="top:${m}%"></div>`;
    }
    const w = d.length ? `<div class="day-all">${d.map((m) => {
      const b = this._eventColor(m), C = N(b);
      return `<div class="all-chip" style="background-color:${b};${C ? `color:${C};` : ""}" title="${this._escape(m.summary)}">${this._escape(m.summary)}</div>`;
    }).join("")}</div>` : "", S = l.map((m) => {
      const b = this._eventColor(m.event), C = N(b), T = m.column * 100 / m.numColumns, z = 100 / m.numColumns, R = m.startMin / 1440 * 100, F = Math.max((m.endMin - m.startMin) / 1440 * 100, 0.2);
      return `
          <div class="time-event" style="left:${T}%;width:${z}%;top:${R}%;height:${F}%;background-color:${b};${C ? `color:${C};` : ""}" title="${this._escape(m.event.summary)}">
            <div class="time-event-summary">${this._escape(m.event.summary)}</div>
          </div>`;
    }).join("");
    e.innerHTML = `
      <div class="day-view">
        <div class="month-header">
          <div class="month-custom">${r ? this._escape(r) : ""}</div>
          <div class="month-title">${this._escape(s)}</div>
          <div class="month-nav">
            ${c ? '<button class="nav-btn" data-action="back-to-month" title="Back to month">«</button>' : ""}
            <button class="nav-btn" data-action="day-today" title="Today">●</button>
            <button class="nav-btn" data-action="day-prev" title="Previous day">‹</button>
            <button class="nav-btn" data-action="day-next" title="Next day">›</button>
          </div>
        </div>
        ${w}
        <div class="day-pane">
          <div class="day-gutter">${y}${u.join("")}</div>
          <div class="day-lane">${p.join("")}${g}${S}</div>
        </div>
      </div>`;
  }
  _weekHtml(e, t, o, i, s) {
    const r = this._monthAnchor.getMonth(), c = $(/* @__PURE__ */ new Date()), d = A(/* @__PURE__ */ new Date()), h = [];
    for (const g of s.values())
      for (const y of g) {
        if (!X(y)) continue;
        const w = O(y);
        if (w.startDay.getTime() > o.getTime() || w.lastDay.getTime() < t.getTime()) continue;
        const S = Math.max(0, Math.floor((w.startDay.getTime() - t.getTime()) / H)), m = Math.min(7, Math.ceil((w.lastDay.getTime() - t.getTime() + H) / H));
        h.push({
          event: y,
          colStart: S,
          colEnd: m,
          startsBefore: w.startDay.getTime() < t.getTime(),
          endsAfter: w.lastDay.getTime() > o.getTime()
        });
      }
    const l = [], p = /* @__PURE__ */ new Set();
    for (const g of h) {
      const y = `${g.event.uid}-${i}`;
      p.has(y) || (p.add(y), l.push(g));
    }
    const u = me(l), f = /* @__PURE__ */ new Map();
    return u.forEach((g, y) => {
      for (const w of g) f.set(w, y);
    }), `<div class="week"><div class="week-days">${e.map((g, y) => {
      const w = $(g), S = g.getMonth() === r, b = (s.get(w) ?? []).filter((x) => !X(x)).sort((x, k) => x.all_day !== k.all_day ? x.all_day ? -1 : 1 : Z(x, k)), C = l.filter((x) => x.colStart <= y && y < x.colEnd).sort((x, k) => (f.get(x) ?? 0) - (f.get(k) ?? 0)), T = C.map((x) => this._segmentHtml(x, y)).join(""), z = C.length, R = this._cellH - this._dayNumH - z * this._segRowH - 4 - this._noteH, F = Math.max(1, Math.floor(R / this._chipRowH)), B = b.slice(0, F), G = b.length - B.length;
      return `
          <div class="${[
        "day-cell",
        S ? "" : "out-month",
        w === c ? "today" : "",
        g.getTime() < d.getTime() ? "past" : ""
      ].filter(Boolean).join(" ")}" data-day="${w}">
            <div class="day-num">${g.getDate()}</div>
            ${T}
            ${B.map((x) => {
        const k = this._eventColor(x), K = N(k), te = K ? `color:${K};` : "", oe = x.all_day ? "" : `<span class="chip-time">${ce(x.startDate)}</span>`;
        return `<div class="chip" style="background-color:${k};${te}" title="${this._escape(x.summary)}">${oe}${this._escape(x.summary)}</div>`;
      }).join("")}
            ${G > 0 ? `<div class="more">+${G} more</div>` : ""}
          </div>`;
    }).join("")}</div></div>`;
  }
  _segmentHtml(e, t) {
    const o = this._eventColor(e.event), i = N(o), s = t === e.colStart, r = t === e.colEnd - 1;
    let c = "0";
    s && r ? c = "3px" : s ? c = "3px 0 0 3px" : r && (c = "0 3px 3px 0");
    const d = i ? `color:${i};` : "", h = s && e.startsBefore ? '<span class="cont-l">‹</span>' : "", l = r && e.endsAfter ? '<span class="cont">›</span>' : "", p = s ? this._escape(e.event.summary) : "";
    return `<div class="ms-seg" style="border-radius:${c};background-color:${o};${d}" data-day="${$(e.event.startDate)}">${h}${p}${l}</div>`;
  }
  _eventColor(e) {
    const t = this._colorMaps[e.entityId];
    if (t) {
      const o = e.uid ? t.colors[e.uid] : void 0;
      if (typeof o == "string") return o;
      if (typeof t.fallback == "string") return t.fallback;
    }
    return he(
      e,
      e.entityId,
      this._hass?.states[e.entityId],
      this._config,
      "var(--hgc-accent)"
    );
  }
  _shouldHide(e) {
    const t = this._config.hideColors;
    if (!t || t.length === 0) return !1;
    const o = this._eventColor(e).toLowerCase();
    return t.some((i) => i.toLowerCase() === o);
  }
  _eventHtml(e, t, o) {
    const i = this._eventColor(e), s = e.all_day ? "All day" : `${J(e.startDate)} – ${J(e.endDate)}`, r = [
      t ? `<span class="event-time">${this._escape(s)}</span>` : "",
      o ? `<span class="event-cal">${this._escape(e.calendarName)}</span>` : ""
    ].filter(Boolean).join("");
    return `
      <div class="event">
        <div class="bar" style="background-color:${i}"></div>
        <div class="event-body">
          <div class="event-summary">${this._escape(e.summary)}</div>
          ${r ? `<div class="event-meta">${r}</div>` : ""}
        </div>
      </div>`;
  }
  _escape(e) {
    return e.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
}
customElements.get("ha-google-calendar-card") || customElements.define("ha-google-calendar-card", fe);
const ee = window, q = ee.customCards ?? [];
q.find((n) => n.type === "ha-google-calendar-card") || q.push({
  type: "ha-google-calendar-card",
  name: "Google Calendar (per-event colors)",
  description: "Multiple Google calendars with per-event colors"
});
ee.customCards = q;
export {
  fe as HaGoogleCalendarCard,
  fe as default
};
