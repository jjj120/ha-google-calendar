/**
 * Agenda / List View for Google Calendar Card.
 * Groups events chronologically by date with rich colorId badges, times, and metadata.
 */

import { getEventColor } from "../colors.js";

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
export function renderAgendaView(events, options = {}) {
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
