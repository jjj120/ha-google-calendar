import "../ha-google-calendar-card";
import type {
  CalendarEventDict,
  HassEntity,
  HomeAssistant,
} from "../types";
import type { CardConfig } from "../ha-google-calendar-card";

function iso(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

const calendarFamily: HassEntity = {
  entity_id: "calendar.family",
  state: "on",
  attributes: {
    friendly_name: "Family",
    calendar_color: "#039be5",
    event_colors: {
      "event-1": "#7c54c0",
      "event-2": "#0553b1",
      "event-3": "#0b8043",
    },
  },
};

const calendarWork: HassEntity = {
  entity_id: "calendar.work",
  state: "on",
  attributes: {
    friendly_name: "Work",
    calendar_color: "#7986cb",
    event_colors: {},
  },
};

const events: Record<string, CalendarEventDict[]> = {
  "calendar.family": [
    { uid: "event-1", summary: "Pick up Alex", start: { dateTime: iso(120) }, end: { dateTime: iso(180) } },
    { uid: "event-2", summary: "Dentist appointment", start: { dateTime: iso(24 * 60 * 60) }, end: { dateTime: iso(24 * 60 * 60 + 60) } },
    { uid: "event-3", summary: "Family dinner", start: { date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) }, end: { date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }, all_day: true },
  ],
  "calendar.work": [
    { uid: "w1", summary: "1:1 with manager", start: { dateTime: iso(300) }, end: { dateTime: iso(360) } },
    { uid: "w2", summary: "Sprint review", start: { dateTime: iso(2 * 24 * 60 * 60) }, end: { dateTime: iso(2 * 24 * 60 * 60 + 90) } },
  ],
};

const hass: HomeAssistant = {
  states: {
    "calendar.family": calendarFamily,
    "calendar.work": calendarWork,
  },
  language: "en",
  async callApi<T>(
    _method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
  ): Promise<T> {
    const match = path.match(/\/api\/calendars\/([^?]+)/);
    const entityId = match ? decodeURIComponent(match[1]) : "";
    await new Promise((r) => setTimeout(r, 200));
    return (events[entityId] ?? []) as T;
  },
};

const card = document.querySelector("ha-google-calendar-card");
if (!card) throw new Error("Could not find ha-google-calendar-card element");
const config: CardConfig = {
  type: "custom:ha-google-calendar-card",
  entities: ["calendar.family", "calendar.work"],
  title: "Upcoming events",
  days: 7,
  showCalendarName: true,
};

card.setConfig(config);
card.hass = hass;
