/**
 * Home Assistant Backend API client for Google Calendar Card.
 * Communicates via WebSocket with the companion helper, with fallback to standard HA calendar API.
 */

import { getEventColor } from "../colors.js";

/**
 * Fetch calendar events for an entity within a time range.
 * @param {Object} hass - Home Assistant core object
 * @param {string} entityId - Calendar entity (e.g. "calendar.personal")
 * @param {Date|string} startTime - Start of range
 * @param {Date|string} endTime - End of range
 * @param {Object} [colorOverrides={}] - Custom color overrides
 * @returns {Promise<Array>} List of normalized events
 */
export async function fetchEventsFromHA(hass, entityId, startTime, endTime, colorOverrides = {}) {
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
