import test from "node:test";
import assert from "node:assert/strict";

import { renderAgendaView } from "../src/views/agenda.js";
import { renderMonthView } from "../src/views/month.js";
import { renderWeekView } from "../src/views/week.js";
import { renderDayView } from "../src/views/day.js";

const now = new Date();
const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
const futureEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
const futureStart2 = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
const futureEnd2 = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();

const sampleEvents = [
  {
    id: "evt-1",
    summary: "Dentist Appointment",
    start: futureStart,
    end: futureEnd,
    colorId: "1", // Lavender (#7986CB)
    is_all_day: false,
    location: "123 Dental Clinic",
    description: "Routine checkup",
  },
  {
    id: "evt-2",
    summary: "Team All-Hands",
    start: futureStart2,
    end: futureEnd2,
    colorId: "7", // Peacock (#039BE5)
    is_all_day: false,
    location: "Conference Room B",
  },
  {
    id: "evt-3",
    summary: "Vacation Day",
    start: "2026-09-26",
    end: "2026-09-27",
    colorId: "2", // Sage (#33B679)
    is_all_day: true,
  },
];

test("renderAgendaView renders events grouped by date with color styles", () => {
  const htmlPill = renderAgendaView(sampleEvents, { colorStyle: "pill", showPastEvents: true });
  assert.ok(htmlPill.includes("Dentist Appointment"), "Agenda view should show event summary");
  assert.ok(htmlPill.includes("Team All-Hands"), "Agenda view should show second event");
  assert.ok(htmlPill.includes("gc-style-pill"), "Agenda view should apply pill style");
  assert.ok(htmlPill.includes("#7986CB"), "Agenda view should include Lavender color #7986CB");
  assert.ok(htmlPill.includes("#039BE5"), "Agenda view should include Peacock color #039BE5");

  const htmlBorder = renderAgendaView(sampleEvents, { colorStyle: "border", showPastEvents: true });
  assert.ok(htmlBorder.includes("gc-style-border"), "Agenda view should apply border style");
  assert.ok(htmlBorder.includes("border-left: 5px solid #7986CB"), "Agenda view border should have #7986CB");

  const htmlFull = renderAgendaView(sampleEvents, { colorStyle: "full", showPastEvents: true });
  assert.ok(htmlFull.includes("gc-style-full"), "Agenda view should apply full style");
});

test("renderMonthView renders calendar grid with event chips", () => {
  const html = renderMonthView(sampleEvents, now);
  assert.ok(html.includes("gc-month-grid"), "Should render month grid container");
  assert.ok(html.includes("Dentist Appointment"), "Month view should render event chip text");
  assert.ok(html.includes("#7986CB"), "Month view should style chip with colorId background #7986CB");
});

test("renderWeekView renders 7-day columns with events", () => {
  const html = renderWeekView(sampleEvents, now);
  assert.ok(html.includes("gc-week-container"), "Should render week container");
  assert.ok(html.includes("Dentist Appointment"), "Week view should display event");
});

test("renderDayView renders timeline and all-day sections", () => {
  const html = renderDayView(sampleEvents, now);
  assert.ok(html.includes("gc-day-view-container"), "Should render day view container");
  assert.ok(html.includes("Dentist Appointment"), "Day view should render timed event");
  assert.ok(html.includes("Team All-Hands"), "Day view should render second timed event");
});

test("renderMonthView renders event chips with proper time and summary structure", () => {
  const longEvent = [
    {
      id: "evt-long",
      summary: "Very Long Event Name That Exceeds Normal Single Line Column Width",
      start: now.toISOString(),
      end: new Date(now.getTime() + 3600000).toISOString(),
      is_all_day: false,
    },
    {
      id: "evt-allday",
      summary: "All Day Conference With Long Title",
      start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      end: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate() + 1).padStart(2, "0")}`,
      is_all_day: true,
    },
  ];
  const html = renderMonthView(longEvent, now);
  assert.ok(html.includes('class="gc-chip-time"'), "Timed event chip should have gc-chip-time span");
  assert.ok(html.includes('class="gc-chip-summary"'), "Event chip should have gc-chip-summary span");
  assert.ok(html.includes("Very Long Event Name That Exceeds Normal Single Line Column Width"), "Should include full summary in tooltip and span");
});

