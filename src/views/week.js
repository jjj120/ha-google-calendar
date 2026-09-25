/**
 * Week View for Google Calendar Card.
 * Displays a 7-day horizontal column layout with colored event blocks.
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
 * Render Week View HTML.
 * @param {Array} events - Events list
 * @param {Date} currentDate - Current reference date for week
 * @param {Object} options - Options (firstDayOfWeek, locale)
 * @returns {string} HTML markup
 */
export function renderWeekView(events, currentDate = new Date(), options = {}) {
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
