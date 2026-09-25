/**
 * Google Calendar Card for Home Assistant Lovelace
 * With individual event colorId support and multi-view layout.
 * https://github.com/jjj120/ha-google-calendar
 * License: MIT
 */
(() => {

// --- colors.js ---
/**
 * Google Calendar Event Color Palette & Utilities.
 * Maps Google's official colorId values (1-11) to accurate hex codes
 * and computes accessible text contrast.
 */

const GOOGLE_EVENT_COLORS = {
  "1": { name: "Lavender", background: "#7986CB", foreground: "#FFFFFF" },
  "2": { name: "Sage", background: "#33B679", foreground: "#FFFFFF" },
  "3": { name: "Grape", background: "#8E24AA", foreground: "#FFFFFF" },
  "4": { name: "Flamingo", background: "#E67C73", foreground: "#FFFFFF" },
  "5": { name: "Banana", background: "#F6BF26", foreground: "#1D1D1D" },
  "6": { name: "Tangerine", background: "#F4511E", foreground: "#FFFFFF" },
  "7": { name: "Peacock", background: "#039BE5", foreground: "#FFFFFF" },
  "8": { name: "Graphite", background: "#616161", foreground: "#FFFFFF" },
  "9": { name: "Blueberry", background: "#3F51B5", foreground: "#FFFFFF" },
  "10": { name: "Basil", background: "#0B8043", foreground: "#FFFFFF" },
  "11": { name: "Tomato", background: "#D50000", foreground: "#FFFFFF" },
};

const DEFAULT_COLOR = {
  name: "Default Blue",
  background: "#4285F4",
  foreground: "#FFFFFF",
};

/**
 * Calculates WCAG relative luminance and returns appropriate high-contrast text color.
 * @param {string} hex - 6-digit hex color string (e.g. "#7986CB")
 * @returns {string} "#FFFFFF" or "#1D1D1D"
 */
function getTextContrastColor(hex) {
  if (!hex || typeof hex !== "string") return "#FFFFFF";
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return "#FFFFFF";

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Return dark text for bright backgrounds (luminance > 0.45)
  return lum > 0.45 ? "#1D1D1D" : "#FFFFFF";
}

/**
 * Resolves background and foreground color for an event given its colorId and user config overrides.
 * @param {string|number|null|undefined} colorId - Google colorId
 * @param {Object} [overrides={}] - Custom color overrides from card config
 * @param {string} [fallbackHex] - Optional fallback hex from calendar entity
 * @returns {{ background: string, foreground: string, name: string }}
 */
function getEventColor(colorId, overrides = {}, fallbackHex = null) {
  const cidStr = colorId != null ? String(colorId) : null;

  // 1. Check user explicit override for this colorId
  if (cidStr && overrides && overrides[cidStr]) {
    const customBg = overrides[cidStr];
    return {
      name: `Custom ${cidStr}`,
      background: customBg,
      foreground: getTextContrastColor(customBg),
    };
  }

  // 2. Check standard Google palette
  if (cidStr && GOOGLE_EVENT_COLORS[cidStr]) {
    const standard = GOOGLE_EVENT_COLORS[cidStr];
    return {
      name: standard.name,
      background: standard.background,
      foreground: standard.foreground || getTextContrastColor(standard.background),
    };
  }

  // 3. Check user default color override
  if (overrides && overrides.default) {
    const defaultBg = overrides.default;
    return {
      name: "Custom Default",
      background: defaultBg,
      foreground: getTextContrastColor(defaultBg),
    };
  }

  // 4. Use calendar-level entity color if provided
  if (fallbackHex) {
    return {
      name: "Calendar Color",
      background: fallbackHex,
      foreground: getTextContrastColor(fallbackHex),
    };
  }

  // 5. Google standard default blue
  return DEFAULT_COLOR;
}

// --- styles.js ---
/**
 * CSS Stylesheet for Google Calendar Card.
 * Adheres to Home Assistant design system and theme CSS variables.
 */

const cardStyles = `
  :host {
    display: block;
    --gc-accent: var(--primary-color, #03a9f4);
    --gc-bg: var(--card-background-color, #ffffff);
    --gc-text: var(--primary-text-color, #212121);
    --gc-muted: var(--secondary-text-color, #727272);
    --gc-border: var(--divider-color, rgba(0, 0, 0, 0.12));
    --gc-radius: var(--ha-card-border-radius, 12px);
    font-family: var(--paper-font-body1_-_font-family, Roboto, "Segoe UI", sans-serif);
    color: var(--gc-text);
  }

  ha-card {
    background-color: var(--gc-bg);
    border-radius: var(--gc-radius);
    box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Header and Navigation */
  .gc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--gc-border);
    flex-wrap: wrap;
    gap: 8px;
  }

  .gc-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gc-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0;
  }

  .gc-nav-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .gc-btn {
    background: transparent;
    border: 1px solid var(--gc-border);
    color: var(--gc-text);
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, color 0.2s;
  }

  .gc-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .gc-btn-icon {
    padding: 5px 8px;
  }

  .gc-view-tabs {
    display: flex;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }

  .gc-tab-btn {
    border: none;
    background: transparent;
    color: var(--gc-muted);
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .gc-tab-btn.gc-tab-active {
    background-color: var(--gc-bg);
    color: var(--gc-accent);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  /* Content area */
  .gc-content {
    padding: 12px 16px;
    min-height: 250px;
    max-height: 650px;
    overflow-y: auto;
  }

  /* Empty state */
  .gc-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    color: var(--gc-muted);
    text-align: center;
    gap: 12px;
  }

  .gc-empty-state ha-icon {
    --mdc-icon-size: 48px;
    opacity: 0.6;
  }

  /* Loading and Error */
  .gc-loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .gc-error-box {
    background-color: rgba(211, 47, 47, 0.1);
    color: #d32f2f;
    border-left: 4px solid #d32f2f;
    padding: 12px;
    border-radius: 4px;
    margin: 12px;
    font-size: 0.9rem;
  }

  /* Agenda View Styles */
  .gc-agenda-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gc-agenda-day-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gc-day-header {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--gc-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .gc-day-events {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gc-event-item {
    background-color: rgba(0, 0, 0, 0.02);
    border: 1px solid var(--gc-border);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }

  .gc-event-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }

  .gc-event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .gc-event-time-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gc-color-pill {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .gc-event-time {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--gc-muted);
  }

  .gc-event-cal-name {
    font-size: 0.75rem;
    color: var(--gc-muted);
    opacity: 0.8;
  }

  .gc-relative-tag {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    background-color: rgba(0,0,0,0.06);
    color: var(--gc-text);
  }

  .gc-tag-now {
    background-color: #e53935;
    color: #ffffff;
    animation: gc-pulse 2s infinite;
  }

  @keyframes gc-pulse {
    0% { opacity: 1; }
    50% { opacity: 0.75; }
    100% { opacity: 1; }
  }

  .gc-event-title {
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.3;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-event-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--gc-muted);
    margin-top: 4px;
  }

  .gc-event-location ha-icon {
    --mdc-icon-size: 14px;
  }

  .gc-event-desc {
    font-size: 0.8rem;
    color: var(--gc-muted);
    margin-top: 6px;
    line-height: 1.4;
    white-space: pre-wrap;
    max-height: 4.2em;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Month Grid View Styles */
  .gc-month-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-header-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gc-muted);
    padding: 4px 0;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-header-cell {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gc-month-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-cell {
    min-height: 70px;
    border: 1px solid var(--gc-border);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    background-color: var(--gc-bg);
    cursor: pointer;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gc-month-cell:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .gc-cell-other-month {
    opacity: 0.4;
  }

  .gc-cell-today {
    border: 2px solid var(--gc-accent);
  }

  .gc-cell-today .gc-day-number {
    background-color: var(--gc-accent);
    color: #ffffff;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .gc-cell-top {
    font-size: 0.75rem;
    font-weight: 500;
    margin-bottom: 2px;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .gc-cell-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow: hidden;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-month-event-chip {
    font-size: 0.68rem;
    font-weight: 500;
    padding: 2px 4px;
    border-radius: 4px;
    cursor: pointer;
    line-height: 1.25;
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-chip-time {
    font-weight: 600;
    white-space: nowrap;
    margin-right: 2px;
  }

  .gc-chip-summary {
    min-width: 0;
  }

  .gc-month-overflow-badge {
    font-size: 0.65rem;
    color: var(--gc-muted);
    font-weight: 600;
    margin-top: 1px;
    padding-left: 2px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Week View Styles */
  .gc-week-container {
    overflow-x: auto;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-week-columns {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 6px;
    min-width: 500px;
    width: 100%;
    box-sizing: border-box;
  }

  .gc-week-col {
    border: 1px solid var(--gc-border);
    border-radius: 8px;
    padding: 6px;
    min-height: 260px;
    background-color: var(--gc-bg);
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gc-week-today {
    border-color: var(--gc-accent);
    background-color: rgba(3, 169, 244, 0.02);
  }

  .gc-week-col-header {
    text-align: center;
    border-bottom: 1px solid var(--gc-border);
    padding-bottom: 6px;
    margin-bottom: 8px;
    overflow: hidden;
  }

  .gc-week-day-name {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gc-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gc-week-day-num {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .gc-num-today {
    color: var(--gc-accent);
  }

  .gc-week-col-events {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }

  .gc-week-event-card {
    border-radius: 6px;
    padding: 4px 6px;
    font-size: 0.72rem;
    cursor: pointer;
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gc-week-event-time {
    font-weight: 600;
    opacity: 0.85;
    margin-bottom: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .gc-week-event-summary {
    font-weight: 500;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  /* Day View Styles */
  .gc-day-view-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gc-day-view-header {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gc-text);
    border-bottom: 1px solid var(--gc-border);
    padding-bottom: 8px;
  }

  .gc-day-allday-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    min-width: 0;
    overflow: hidden;
  }

  .gc-day-allday-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gc-muted);
    min-width: 50px;
    flex-shrink: 0;
  }

  .gc-day-allday-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .gc-day-allday-chip {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 12px;
    cursor: pointer;
    max-width: 100%;
    box-sizing: border-box;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-timeline-container {
    position: relative;
    height: 1200px; /* 24 hours * 50px */
    border-top: 1px solid var(--gc-border);
  }

  .gc-timeline-hour-row {
    position: relative;
    height: 50px;
    display: flex;
    align-items: flex-start;
  }

  .gc-timeline-time-label {
    width: 60px;
    font-size: 0.75rem;
    color: var(--gc-muted);
    transform: translateY(-8px);
    text-align: right;
    padding-right: 8px;
    flex-shrink: 0;
  }

  .gc-timeline-line {
    flex: 1;
    border-top: 1px dashed var(--gc-border);
  }

  .gc-now-line {
    position: absolute;
    left: 60px;
    right: 0;
    height: 2px;
    background-color: #e53935;
    z-index: 5;
  }

  .gc-now-bullet {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #e53935;
    position: absolute;
    left: -4px;
    top: -3px;
  }

  .gc-day-timed-event {
    position: absolute;
    left: 70px;
    right: 12px;
    border-radius: 6px;
    padding: 4px 8px;
    z-index: 2;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    box-sizing: border-box;
  }

  .gc-timed-event-summary {
    font-size: 0.85rem;
    font-weight: 600;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .gc-timed-event-time {
    font-size: 0.75rem;
    opacity: 0.9;
  }

  /* Modal Details */
  .gc-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }

  .gc-modal-box {
    background-color: var(--gc-bg);
    color: var(--gc-text);
    border-radius: 12px;
    width: 90%;
    max-width: 440px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    overflow: hidden;
    animation: gc-modal-appear 0.15s ease-out;
  }

  @keyframes gc-modal-appear {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .gc-modal-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .gc-modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .gc-modal-close-btn {
    border: none;
    background: transparent;
    color: var(--gc-muted);
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px;
    display: flex;
    align-items: center;
  }

  .gc-modal-body {
    padding: 0 20px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gc-modal-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.9rem;
  }

  .gc-modal-row ha-icon {
    --mdc-icon-size: 18px;
    color: var(--gc-muted);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .gc-modal-link {
    color: var(--gc-accent);
    text-decoration: none;
    font-weight: 500;
  }

  .gc-modal-link:hover {
    text-decoration: underline;
  }
`;

// --- google-direct.js ---
/**
 * Direct Google Calendar API client.
 * Allows querying public or shared Google Calendars directly from the browser using an API Key.
 */



const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

/**
 * Fetch events directly from Google Calendar API v3 using an API key.
 * @param {string} apiKey - Google Cloud API Key
 * @param {string} calendarId - Google Calendar ID (e.g. "my_cal@group.calendar.google.com")
 * @param {Date|string} startTime - Start of interval
 * @param {Date|string} endTime - End of interval
 * @param {Object} [colorOverrides={}] - Custom color overrides
 * @param {string} [calendarName=""] - Optional display name for calendar
 * @returns {Promise<Array>} Normalized events
 */
async function fetchEventsDirectGoogle(
  apiKey,
  calendarId,
  startTime,
  endTime,
  colorOverrides = {},
  calendarName = ""
) {
  if (!apiKey || !calendarId) {
    throw new Error("Both apiKey and calendarId are required for direct Google API queries.");
  }

  const startIso = startTime instanceof Date ? startTime.toISOString() : startTime;
  const endIso = endTime instanceof Date ? endTime.toISOString() : endTime;

  const url = new URL(`${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", startIso);
  url.searchParams.set("timeMax", endIso);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Calendar API direct request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item) => {
    const startObj = item.start || {};
    const endObj = item.end || {};
    const isAllDay = Boolean(startObj.date && !startObj.dateTime);
    const startVal = startObj.dateTime || startObj.date;
    const endVal = endObj.dateTime || endObj.date;

    const colorId = item.colorId != null ? String(item.colorId) : null;
    const color = getEventColor(colorId, colorOverrides);

    return {
      id: item.id || `${calendarId}-${startVal}-${item.summary}`,
      entity_id: calendarId,
      calendar_name: calendarName || data.summary || calendarId,
      summary: item.summary || "(No title)",
      description: item.description || "",
      location: item.location || "",
      start: startVal,
      end: endVal,
      is_all_day: isAllDay,
      color_id: colorId,
      color_name: color.name,
      background_color: color.background,
      foreground_color: color.foreground,
      html_link: item.htmlLink || "",
      is_recurring: Boolean(item.recurringEventId),
    };
  });
}

// --- ha-backend.js ---
/**
 * Home Assistant Backend API client for Google Calendar Card.
 * Communicates via WebSocket with the companion helper, with fallback to standard HA calendar API.
 */



/**
 * Fetch calendar events for an entity within a time range.
 * @param {Object} hass - Home Assistant core object
 * @param {string} entityId - Calendar entity (e.g. "calendar.personal")
 * @param {Date|string} startTime - Start of range
 * @param {Date|string} endTime - End of range
 * @param {Object} [colorOverrides={}] - Custom color overrides
 * @returns {Promise<Array>} List of normalized events
 */
async function fetchEventsFromHA(hass, entityId, startTime, endTime, colorOverrides = {}) {
  const startIso = startTime instanceof Date ? startTime.toISOString() : startTime;
  const endIso = endTime instanceof Date ? endTime.toISOString() : endTime;

  // Get calendar entity state and color attribute if present
  const entityState = hass.states[entityId];
  const calendarName = entityState?.attributes?.friendly_name || entityId;
  const calendarColor = entityState?.attributes?.color || null;

  // 1. Attempt WebSocket query to companion integration (preserves colorId)
  try {
    const wsResult = await hass.callWS({
      type: "google_calendar_card/get_events",
      entity_id: entityId,
      start: startIso,
      end: endIso,
    });

    if (wsResult && Array.isArray(wsResult.events)) {
      return wsResult.events.map((ev) => {
        const startVal = typeof ev.start === "object" ? (ev.start?.dateTime || ev.start?.date) : ev.start;
        const endVal = typeof ev.end === "object" ? (ev.end?.dateTime || ev.end?.date) : ev.end;
        const isAllDay = ev.is_all_day != null ? Boolean(ev.is_all_day) : Boolean(ev.start?.date && !ev.start?.dateTime);
        const colorId = ev.color_id != null ? String(ev.color_id) : (ev.colorId != null ? String(ev.colorId) : null);
        const bgColor = ev.background_color || ev.color || calendarColor;
        const color = getEventColor(colorId, colorOverrides, bgColor);

        return {
          id: ev.id || `${entityId}-${startVal}-${ev.summary}`,
          entity_id: entityId,
          calendar_name: calendarName,
          summary: ev.summary || "(No title)",
          description: ev.description || "",
          location: ev.location || "",
          start: startVal,
          end: endVal,
          is_all_day: isAllDay,
          color_id: colorId,
          color_name: color.name,
          background_color: color.background,
          foreground_color: color.foreground,
          html_link: ev.html_link || ev.htmlLink || "",
          is_recurring: Boolean(ev.is_recurring),
        };
      });
    }
  } catch (err) {
    // If companion integration is not loaded, gracefully proceed to standard HA API
    console.debug(`google_calendar_card helper not available for ${entityId}, falling back to standard calendar API:`, err);
  }

  // 2. Fallback to standard Home Assistant calendar API
  try {
    // Standard calendar endpoint in HA
    const rawEvents = await hass.callApi(
      "GET",
      `calendars/${encodeURIComponent(entityId)}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`
    );

    if (Array.isArray(rawEvents)) {
      return rawEvents.map((ev) => {
        const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
        const startVal = ev.start?.dateTime || ev.start?.date;
        const endVal = ev.end?.dateTime || ev.end?.date;
        const color = getEventColor(null, colorOverrides, calendarColor);

        return {
          id: ev.uid || `${entityId}-${startVal}-${ev.summary}`,
          entity_id: entityId,
          calendar_name: calendarName,
          summary: ev.summary || "(No title)",
          description: ev.description || "",
          location: ev.location || "",
          start: startVal,
          end: endVal,
          is_all_day: isAllDay,
          color_id: null,
          color_name: color.name,
          background_color: color.background,
          foreground_color: color.foreground,
          html_link: "",
          is_recurring: Boolean(ev.recurrence_id),
        };
      });
    }
  } catch (apiErr) {
    console.error(`Failed to fetch calendar events for ${entityId}:`, apiErr);
    throw apiErr;
  }

  return [];
}

// --- agenda.js ---
/**
 * Agenda / List View for Google Calendar Card.
 * Groups events chronologically by date with rich colorId badges, times, and metadata.
 */



/**
 * Format date for section header (e.g. "Today - Friday, Sep 25")
 */
function getDayHeaderLabel(dateObj, locale = "en-US") {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

  const dateFormatted = target.toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (target.getTime() === today.getTime()) {
    return `Today · ${dateFormatted}`;
  }
  if (target.getTime() === tomorrow.getTime()) {
    return `Tomorrow · ${dateFormatted}`;
  }
  return dateFormatted;
}

/**
 * Format event time range (e.g. "09:00 - 10:30" or "All Day")
 */
function formatEventTime(event, locale = "en-US") {
  if (event.is_all_day) {
    return "All Day";
  }

  const start = new Date(event.start);
  const end = new Date(event.end);

  const timeOptions = { hour: "numeric", minute: "2-digit" };
  const startTimeStr = start.toLocaleTimeString(locale, timeOptions);
  const endTimeStr = end.toLocaleTimeString(locale, timeOptions);

  return `${startTimeStr} – ${endTimeStr}`;
}

/**
 * Compute relative status tag (e.g. "NOW", "In 45m", "In 3h")
 */
function getRelativeTag(event) {
  if (event.is_all_day) return null;

  const now = new Date().getTime();
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();

  if (now >= start && now <= end) {
    return { text: "NOW", isNow: true };
  }

  const diffMs = start - now;
  if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
    const mins = Math.max(1, Math.round(diffMs / (60 * 1000)));
    return { text: `In ${mins}m`, isNow: false };
  }

  if (diffMs > 0 && diffMs <= 12 * 60 * 60 * 1000) {
    const hours = Math.round(diffMs / (60 * 60 * 1000));
    return { text: `In ${hours}h`, isNow: false };
  }

  return null;
}

/**
 * Render the Agenda View HTML string or DOM elements.
 * @param {Array} events - Sorted events
 * @param {Object} options - View configuration options
 * @param {Function} onEventClick - Event click callback
 * @returns {string} HTML markup
 */
function renderAgendaView(events, options = {}) {
  const {
    showPastEvents = false,
    showLocation = true,
    showDescription = true,
    colorStyle = "pill", // 'pill', 'border', 'full'
    locale = "en-US",
  } = options;

  const now = new Date();

  // 1. Filter out past events if configured
  const filteredEvents = events.filter((ev) => {
    if (showPastEvents) return true;
    if (ev.is_all_day) {
      // For all-day events, check if end date is before today
      const endDate = new Date(ev.end);
      return endDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    const end = new Date(ev.end);
    return end >= now;
  });

  if (filteredEvents.length === 0) {
    return `
      <div class="gc-empty-state">
        <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
        <p>No upcoming events scheduled</p>
      </div>
    `;
  }

  // 2. Group by date key (YYYY-MM-DD)
  const grouped = new Map();
  for (const ev of filteredEvents) {
    const startDate = new Date(ev.start);
    const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { dateObj: startDate, events: [] });
    }
    grouped.get(dateKey).events.push(ev);
  }

  // 3. Generate HTML
  let html = `<div class="gc-agenda-container">`;

  for (const [, group] of grouped) {
    const dayHeader = getDayHeaderLabel(group.dateObj, locale);
    html += `
      <div class="gc-agenda-day-group">
        <div class="gc-day-header">${dayHeader}</div>
        <div class="gc-day-events">
    `;

    for (const ev of group.events) {
      const timeStr = formatEventTime(ev, locale);
      const relativeTag = getRelativeTag(ev);
      const colorObj = ev.background_color
        ? { background: ev.background_color, foreground: ev.foreground_color || "#FFFFFF", name: ev.color_name || "" }
        : getEventColor(ev.colorId || ev.color_id, options.colors, ev.calendar_color);
      const bgColor = colorObj.background;
      const fgColor = colorObj.foreground;

      let styleAttr = "";
      let colorIndicatorHtml = "";

      if (colorStyle === "border") {
        styleAttr = `style="border-left: 5px solid ${bgColor};"`;
      } else if (colorStyle === "full") {
        styleAttr = `style="background-color: ${bgColor}; color: ${fgColor};"`;
      } else {
        // Default "pill" style
        colorIndicatorHtml = `
          <span class="gc-color-pill" style="background-color: ${bgColor};" title="${ev.color_name || 'Color'}"></span>
        `;
      }

      const relativeHtml = relativeTag
        ? `<span class="gc-relative-tag ${relativeTag.isNow ? 'gc-tag-now' : ''}">${relativeTag.text}</span>`
        : "";

      const locationHtml =
        showLocation && ev.location
          ? `<div class="gc-event-location"><ha-icon icon="mdi:map-marker-outline"></ha-icon> <span>${escapeHtml(ev.location)}</span></div>`
          : "";

      const descHtml =
        showDescription && ev.description
          ? `<div class="gc-event-desc">${escapeHtml(ev.description)}</div>`
          : "";

      html += `
        <div class="gc-event-item gc-style-${colorStyle}" data-event-id="${escapeHtml(ev.id)}" ${styleAttr}>
          <div class="gc-event-header">
            <div class="gc-event-time-wrap">
              ${colorIndicatorHtml}
              <span class="gc-event-time">${timeStr}</span>
              ${relativeHtml}
            </div>
            <div class="gc-event-cal-name">${escapeHtml(ev.calendar_name || "")}</div>
          </div>
          <div class="gc-event-title">${escapeHtml(ev.summary)}</div>
          ${locationHtml}
          ${descHtml}
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
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

// --- month.js ---
/**
 * Month Grid View for Google Calendar Card.
 * Renders a full monthly calendar grid with colored event chips corresponding to each event's colorId.
 */





/**
 * Checks if two dates represent the same calendar day.
 */
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if an event falls on a specific date (handles all-day and multi-day).
 */
function doesEventFallOnDate(event, dateObj) {
  const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  let evStart, evEnd;

  if (event.is_all_day) {
    const partsStart = event.start.split("-");
    evStart = new Date(partsStart[0], partsStart[1] - 1, partsStart[2], 0, 0, 0);
    const partsEnd = event.end.split("-");
    // Google all-day end date is exclusive
    evEnd = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2], 0, 0, 0);
    return dayStart < evEnd && dayEnd >= evStart;
  } else {
    evStart = new Date(event.start);
    evEnd = new Date(event.end);
    return evStart <= dayEnd && evEnd >= dayStart;
  }
}

/**
 * Render Month View grid HTML.
 * @param {Array} events - Events list
 * @param {Date} currentDate - Active date for month view
 * @param {Object} options - View options (firstDayOfWeek: 0 or 1, locale)
 * @returns {string} HTML markup
 */
function renderMonthView(events, currentDate = new Date(), options = {}) {
  const { firstDayOfWeek = 1, locale = "en-US" } = options; // 1 = Monday, 0 = Sunday
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  // Last day of current month
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Calculate padding days at start of grid
  let startDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday...
  if (firstDayOfWeek === 1) {
    // Convert so Monday is 0, Sunday is 6
    startDayIndex = (startDayIndex + 6) % 7;
  }

  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - startDayIndex);

  // We render 35 or 42 days (5 or 6 weeks)
  const totalDays = startDayIndex + lastDayOfMonth.getDate() > 35 ? 42 : 35;

  // Day header names
  const dayHeaders = [];
  for (let i = 0; i < 7; i++) {
    const sampleDay = new Date(2026, 0, 4 + i + (firstDayOfWeek === 1 ? 1 : 0)); // Jan 2026 Sunday/Monday
    dayHeaders.push(
      sampleDay.toLocaleDateString(locale, { weekday: "short" })
    );
  }

  let html = `<div class="gc-month-container">`;

  // 1. Day of week headers
  html += `<div class="gc-month-header-row">`;
  for (const dayName of dayHeaders) {
    html += `<div class="gc-month-header-cell">${dayName}</div>`;
  }
  html += `</div>`;

  // 2. Month grid
  html += `<div class="gc-month-grid">`;

  const iterDate = new Date(startDate);
  for (let dayCount = 0; dayCount < totalDays; dayCount++) {
    const isCurrentMonth = iterDate.getMonth() === month;
    const isToday = isSameDay(iterDate, today);
    const dayDateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, "0")}-${String(iterDate.getDate()).padStart(2, "0")}`;

    // Get events for this day
    const dayEvents = events.filter((ev) => doesEventFallOnDate(ev, iterDate));

    const cellClasses = [
      "gc-month-cell",
      isCurrentMonth ? "gc-cell-curr-month" : "gc-cell-other-month",
      isToday ? "gc-cell-today" : "",
    ].filter(Boolean).join(" ");

    html += `
      <div class="${cellClasses}" data-date="${dayDateStr}">
        <div class="gc-cell-top">
          <span class="gc-day-number">${iterDate.getDate()}</span>
        </div>
        <div class="gc-cell-events">
    `;

    const maxVisibleEvents = 3;
    const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
    const overflowCount = dayEvents.length - maxVisibleEvents;

    for (const ev of visibleEvents) {
      const colorObj = ev.background_color
        ? { background: ev.background_color, foreground: ev.foreground_color || "#FFFFFF" }
        : getEventColor(ev.colorId || ev.color_id, options.colors, ev.calendar_color);
      const bgColor = colorObj.background;
      const fgColor = colorObj.foreground;
      let timeText = "";
      if (!ev.is_all_day) {
        const startD = new Date(ev.start);
        timeText = startD.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }) + " ";
      }

      html += `
        <div class="gc-month-event-chip"
             data-event-id="${escapeHtml(ev.id)}"
             style="background-color: ${bgColor}; color: ${fgColor};"
             title="${escapeHtml(ev.summary)} (${timeText ? timeText.trim() : 'All Day'})">${timeText ? `<span class="gc-chip-time">${timeText}</span>` : ""}<span class="gc-chip-summary">${escapeHtml(ev.summary)}</span></div>
      `;
    }

    if (overflowCount > 0) {
      html += `
        <div class="gc-month-overflow-badge" data-date="${dayDateStr}">
          +${overflowCount} more
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    // Advance to next day
    iterDate.setDate(iterDate.getDate() + 1);
  }

  html += `</div></div>`;
  return html;
}

// --- week.js ---
/**
 * Week View for Google Calendar Card.
 * Displays a 7-day horizontal column layout with colored event blocks.
 */



function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function doesEventFallOnDate(event, dateObj) {
  const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  if (event.is_all_day) {
    const partsStart = event.start.split("-");
    const evStart = new Date(partsStart[0], partsStart[1] - 1, partsStart[2], 0, 0, 0);
    const partsEnd = event.end.split("-");
    const evEnd = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2], 0, 0, 0);
    return dayStart < evEnd && dayEnd >= evStart;
  } else {
    const evStart = new Date(event.start);
    const evEnd = new Date(event.end);
    return evStart <= dayEnd && evEnd >= dayStart;
  }
}

/**
 * Render Week View HTML.
 * @param {Array} events - Events list
 * @param {Date} currentDate - Current reference date for week
 * @param {Object} options - Options (firstDayOfWeek, locale)
 * @returns {string} HTML markup
 */
function renderWeekView(events, currentDate = new Date(), options = {}) {
  const { firstDayOfWeek = 1, locale = "en-US" } = options;
  const today = new Date();

  // Find start of week
  const startOfWeek = new Date(currentDate);
  let dayOfWeek = startOfWeek.getDay(); // 0 is Sunday
  if (firstDayOfWeek === 1) {
    dayOfWeek = (dayOfWeek + 6) % 7; // Monday = 0
  }
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Generate 7 days
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }

  let html = `<div class="gc-week-container">`;
  html += `<div class="gc-week-columns">`;

  for (const day of days) {
    const isToday = isSameDay(day, today);
    const dayName = day.toLocaleDateString(locale, { weekday: "short" });
    const dayNumber = day.getDate();
    const dayDateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

    const dayEvents = events.filter((ev) => doesEventFallOnDate(ev, day));

    html += `
      <div class="gc-week-col ${isToday ? 'gc-week-today' : ''}" data-date="${dayDateStr}">
        <div class="gc-week-col-header">
          <span class="gc-week-day-name">${dayName}</span>
          <span class="gc-week-day-num ${isToday ? 'gc-num-today' : ''}">${dayNumber}</span>
        </div>
        <div class="gc-week-col-events">
    `;

    if (dayEvents.length === 0) {
      html += `<div class="gc-week-empty-slot"></div>`;
    } else {
      for (const ev of dayEvents) {
        const bgColor = ev.background_color || "#4285F4";
        const fgColor = ev.foreground_color || "#FFFFFF";
        let timeText = "All Day";
        if (!ev.is_all_day) {
          const s = new Date(ev.start).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
          timeText = s;
        }

        html += `
          <div class="gc-week-event-card"
               data-event-id="${escapeHtml(ev.id)}"
               style="background-color: ${bgColor}; color: ${fgColor};"
               title="${escapeHtml(ev.summary)}">
            <div class="gc-week-event-time">${timeText}</div>
            <div class="gc-week-event-summary">${escapeHtml(ev.summary)}</div>
          </div>
        `;
      }
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `</div></div>`;
  return html;
}

// --- day.js ---
/**
 * Day View for Google Calendar Card.
 * Hourly timeline for a single day with real-time "now" line and precisely colored event blocks.
 */



function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function doesEventFallOnDate(event, dateObj) {
  const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  if (event.is_all_day) {
    const partsStart = event.start.split("-");
    const evStart = new Date(partsStart[0], partsStart[1] - 1, partsStart[2], 0, 0, 0);
    const partsEnd = event.end.split("-");
    const evEnd = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2], 0, 0, 0);
    return dayStart < evEnd && dayEnd >= evStart;
  } else {
    const evStart = new Date(event.start);
    const evEnd = new Date(event.end);
    return evStart <= dayEnd && evEnd >= dayStart;
  }
}

/**
 * Render Day View HTML.
 * @param {Array} events - Events list
 * @param {Date} currentDate - Selected day
 * @param {Object} options - Options (locale)
 * @returns {string} HTML markup
 */
function renderDayView(events, currentDate = new Date(), options = {}) {
  const { locale = "en-US" } = options;
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  const dayEvents = events.filter((ev) => doesEventFallOnDate(ev, currentDate));
  const allDayEvents = dayEvents.filter((ev) => ev.is_all_day);
  const timedEvents = dayEvents.filter((ev) => !ev.is_all_day);

  // Formatted date title
  const dateHeader = currentDate.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let html = `<div class="gc-day-view-container">`;

  // Header with full date
  html += `<div class="gc-day-view-header">${dateHeader}</div>`;

  // All-day events section
  if (allDayEvents.length > 0) {
    html += `<div class="gc-day-allday-wrap">`;
    html += `<div class="gc-day-allday-label">All-day</div>`;
    html += `<div class="gc-day-allday-list">`;
    for (const ev of allDayEvents) {
      const bgColor = ev.background_color || "#4285F4";
      const fgColor = ev.foreground_color || "#FFFFFF";
      html += `
        <div class="gc-day-allday-chip"
             data-event-id="${escapeHtml(ev.id)}"
             style="background-color: ${bgColor}; color: ${fgColor};">
          ${escapeHtml(ev.summary)}
        </div>
      `;
    }
    html += `</div></div>`;
  }

  // Hourly timeline (24 hours: 0:00 to 23:00)
  html += `<div class="gc-timeline-container">`;

  // Draw current time line if viewing today
  if (isToday) {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const topPercent = (nowMinutes / (24 * 60)) * 100;
    html += `
      <div class="gc-now-line" style="top: ${topPercent.toFixed(2)}%;">
        <div class="gc-now-bullet"></div>
      </div>
    `;
  }

  // Draw hour slots
  for (let hour = 0; hour < 24; hour++) {
    const sampleDate = new Date(2026, 0, 1, hour, 0);
    const hourLabel = sampleDate.toLocaleTimeString(locale, { hour: "numeric" });
    html += `
      <div class="gc-timeline-hour-row" data-hour="${hour}">
        <div class="gc-timeline-time-label">${hourLabel}</div>
        <div class="gc-timeline-line"></div>
      </div>
    `;
  }

  // Render positioned timed event blocks
  for (const ev of timedEvents) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);

    // Calculate start minute from midnight (0..1440)
    let startMin = start.getHours() * 60 + start.getMinutes();
    let endMin = end.getHours() * 60 + end.getMinutes();

    // If event started before today
    if (!isSameDay(start, currentDate)) {
      startMin = 0;
    }
    // If event ends after today
    if (!isSameDay(end, currentDate)) {
      endMin = 24 * 60;
    }

    const durationMin = Math.max(30, endMin - startMin); // Minimum 30 mins for readable box
    const topPx = (startMin / 60) * 50; // Each hour row is 50px high
    const heightPx = (durationMin / 60) * 50;

    const bgColor = ev.background_color || "#4285F4";
    const fgColor = ev.foreground_color || "#FFFFFF";

    const timeOptions = { hour: "numeric", minute: "2-digit" };
    const timeRangeStr = `${start.toLocaleTimeString(locale, timeOptions)} – ${end.toLocaleTimeString(locale, timeOptions)}`;

    html += `
      <div class="gc-day-timed-event"
           data-event-id="${escapeHtml(ev.id)}"
           style="top: ${topPx}px; height: ${heightPx}px; background-color: ${bgColor}; color: ${fgColor};">
        <div class="gc-timed-event-summary">${escapeHtml(ev.summary)}</div>
        <div class="gc-timed-event-time">${timeRangeStr}</div>
        ${ev.location ? `<div class="gc-timed-event-location">${escapeHtml(ev.location)}</div>` : ''}
      </div>
    `;
  }

  html += `</div></div>`;
  return html;
}

// --- editor.js ---
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
      </style>
      <ha-form id="form"></ha-form>
    `;

    const form = this.shadowRoot.getElementById("form");
    this._form = form;
    form.schema = this._getSchema();
    form.data = this._formatData(this._config);
    form.hass = this._hass;
    form.computeLabel = (s) => this._computeLabel(s);
    form.computeHelper = (s) => this._computeHelper(s);

    form.addEventListener("value-changed", (ev) => this._valueChanged(ev));
  }
}

customElements.define("google-calendar-card-editor", GoogleCalendarCardEditor);

// --- google-calendar-card.js ---
/**
 * Google Calendar Card for Home Assistant Lovelace.
 * Displays Google Calendar events with full support for per-event colorId,
 * multi-view layout (Agenda, Month, Week, Day), and responsive theming.
 */










const CARD_VERSION = "1.0.0";
console.info(
  `%c GOOGLE-CALENDAR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #4285F4; font-weight: 700; border-radius: 3px 0 0 3px;",
  "color: #4285F4; background: white; font-weight: 700; border-radius: 0 3px 3px 0; border: 1px solid #4285F4;"
);

class GoogleCalendarCard extends HTMLElement {
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
    this.render();
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
    this.render();
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
    } else if (this._entities.length === 0 && !this._config.google_api?.api_key) {
      contentHtml = `
        <div class="gc-empty-state">
          <ha-icon icon="mdi:calendar-search"></ha-icon>
          <p>Please select a calendar entity in the card settings.</p>
        </div>
      `;
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



customElements.define("google-calendar-card", GoogleCalendarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "google-calendar-card",
  name: "Google Calendar Card",
  description: "Displays Google Calendar events with per-event colorId support, multi-view layout, and rich customization.",
  preview: true,
  documentationURL: "https://github.com/jjj120/ha-google-calendar",
});

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "google-calendar-card")) {
  window.customCards.push({
    type: "google-calendar-card",
    name: "Google Calendar Card",
    description: "Displays Google Calendar events with per-event colorId support, multi-view layout, and rich customization.",
    preview: true,
    documentationURL: "https://github.com/jjj120/ha-google-calendar",
  });
}

})();
