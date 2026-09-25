/**
 * Day View for Google Calendar Card.
 * Hourly timeline for a single day with real-time "now" line and precisely colored event blocks.
 */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
export function renderDayView(events, currentDate = new Date(), options = {}) {
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
