import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchEventsFromHA } from "../src/api/ha-backend.js";
import { fetchEventsDirectGoogle } from "../src/api/google-direct.js";

test("fetchEventsFromHA calls companion WebSocket and normalizes events with colorId", async () => {
  const mockEvents = [
    {
      id: "ev1",
      summary: "Doctor Appointment",
      description: "Routine checkup",
      location: "Clinic",
      start: "2026-09-25T10:00:00Z",
      end: "2026-09-25T11:00:00Z",
      is_all_day: false,
      color_id: "11", // Tomato
      background_color: "#D50000",
      foreground_color: "#FFFFFF",
      html_link: "https://calendar.google.com/event?eid=ev1",
    },
    {
      id: "ev2",
      summary: "Company Offsite",
      start: "2026-09-26",
      end: "2026-09-27",
      is_all_day: true,
      color_id: "2", // Sage
      background_color: "#33B679",
      foreground_color: "#FFFFFF",
    },
  ];

  let wsCalledWith = null;
  const mockHass = {
    states: {
      "calendar.personal": {
        attributes: { friendly_name: "Personal Calendar", color: "#4285F4" },
      },
    },
    callWS: async (msg) => {
      wsCalledWith = msg;
      return { events: mockEvents };
    },
    callApi: async () => {
      throw new Error("Should not be called when WebSocket succeeds");
    },
  };

  const start = new Date("2026-09-25T00:00:00Z");
  const end = new Date("2026-09-27T23:59:59Z");

  const events = await fetchEventsFromHA(mockHass, "calendar.personal", start, end);

  assert.equal(wsCalledWith.type, "google_calendar_card/get_events");
  assert.equal(wsCalledWith.entity_id, "calendar.personal");
  assert.equal(events.length, 2);

  // Check event 1 (Tomato colorId 11)
  assert.equal(events[0].id, "ev1");
  assert.equal(events[0].summary, "Doctor Appointment");
  assert.equal(events[0].color_id, "11");
  assert.equal(events[0].background_color, "#D50000");
  assert.equal(events[0].foreground_color, "#FFFFFF");
  assert.equal(events[0].is_all_day, false);

  // Check event 2 (Sage colorId 2)
  assert.equal(events[1].id, "ev2");
  assert.equal(events[1].color_id, "2");
  assert.equal(events[1].background_color, "#33B679");
  assert.equal(events[1].is_all_day, true);
});

test("fetchEventsFromHA falls back to standard HA calendar API if companion WS is unavailable", async () => {
  const mockHass = {
    states: {
      "calendar.standard": {
        attributes: { friendly_name: "Standard Calendar", color: "#FF5722" },
      },
    },
    callWS: async () => {
      // Simulate unknown command or failure
      const err = new Error("Unknown command");
      err.code = "unknown_command";
      throw err;
    },
    callApi: async (method, path) => {
      assert.equal(method, "GET");
      assert.ok(path.startsWith("calendars/calendar.standard"));
      return [
        {
          uid: "standard-1",
          summary: "Team Sync",
          start: { dateTime: "2026-09-25T14:00:00Z" },
          end: { dateTime: "2026-09-25T15:00:00Z" },
        },
      ];
    },
  };

  const start = new Date("2026-09-25T00:00:00Z");
  const end = new Date("2026-09-25T23:59:59Z");

  const events = await fetchEventsFromHA(mockHass, "calendar.standard", start, end);

  assert.equal(events.length, 1);
  assert.equal(events[0].summary, "Team Sync");
  assert.equal(events[0].background_color, "#FF5722"); // Entity fallback color
});

test("fetchEventsDirectGoogle makes proper API request with API Key and normalizes items", async () => {
  const mockApiResponse = {
    summary: "Public Events",
    items: [
      {
        id: "public-1",
        summary: "Tech Conference",
        description: "Annual meeting",
        location: "Convention Hall",
        start: { dateTime: "2026-09-28T09:00:00Z" },
        end: { dateTime: "2026-09-28T17:00:00Z" },
        colorId: "7", // Peacock (#039BE5)
        htmlLink: "https://calendar.google.com/event?eid=pub1",
      },
      {
        id: "public-2",
        summary: "Holiday",
        start: { date: "2026-09-29" },
        end: { date: "2026-09-30" },
        colorId: "5", // Banana (#F6BF26)
      },
    ],
  };

  let requestedUrl = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    };
  };

  try {
    const events = await fetchEventsDirectGoogle(
      "TEST_API_KEY",
      "test_cal_id@group.calendar.google.com",
      "2026-09-28T00:00:00Z",
      "2026-09-30T23:59:59Z"
    );

    assert.ok(requestedUrl.includes("key=TEST_API_KEY"));
    assert.ok(requestedUrl.includes("singleEvents=true"));
    assert.ok(requestedUrl.includes("orderBy=startTime"));

    assert.equal(events.length, 2);
    // Event 1 (Peacock #039BE5)
    assert.equal(events[0].id, "public-1");
    assert.equal(events[0].summary, "Tech Conference");
    assert.equal(events[0].color_id, "7");
    assert.equal(events[0].background_color, "#039BE5");
    assert.equal(events[0].is_all_day, false);

    // Event 2 (Banana #F6BF26 with dark text #1D1D1D)
    assert.equal(events[1].id, "public-2");
    assert.equal(events[1].color_id, "5");
    assert.equal(events[1].background_color, "#F6BF26");
    assert.equal(events[1].foreground_color, "#1D1D1D");
    assert.equal(events[1].is_all_day, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
