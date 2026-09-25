/**
 * Direct Google Calendar API client.
 * Allows querying public or shared Google Calendars directly from the browser using an API Key.
 */

import { getEventColor } from "../colors.js";

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
export async function fetchEventsDirectGoogle(
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
