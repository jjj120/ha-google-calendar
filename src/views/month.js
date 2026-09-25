/**
 * Month Grid View for Google Calendar Card.
 * Renders a full monthly calendar grid with colored event chips corresponding to each event's colorId.
 */

import { getEventColor } from "../colors.js";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
export function renderMonthView(events, currentDate = new Date(), options = {}) {
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
