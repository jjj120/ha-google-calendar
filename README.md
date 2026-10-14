# ha-google-calendar

A Home Assistant custom integration + Lovelace card that surfaces **Google Calendar
per-event colours** and renders **multiple calendars together in one card**.

Google lets you colour individual events (and, since June 2026, assign custom colour
labels) independently of the calendar. The built-in `google` integration drops this
per-event colour when normalising into Home Assistant's `CalendarEvent` model. This
project works around that by exposing the colour as extra state attributes and
rendering it with a dedicated card.

## Features

- **Per-event colours**: resolved from Google's `colorId` palette and the newer
  `eventLabelId` custom labels, with a defined precedence.
- **Per-calendar default colour**: used when an event has no specific colour.
- **Combined card**: any number of calendars shown in one agenda-style card, each
  event tinted by its own colour.
- **Responsive card**: fills whatever space/span the dashboard grid gives it.

## Repository layout

```
ha-google-calendar/
├─ custom_components/ha_google_calendar/  # backend integration (Python)
│  ├─ manifest.json                       # domain, requirements (gcal-sync>=9.1.0)
│  ├─ __init__.py                         # config entry setup + runtime data
│  ├─ const.py                            # DOMAIN, attribute/option constants
│  ├─ api.py                              # OAuth auth impl for gcal_sync
│  ├─ colors.py                           # pure per-event colour resolution
│  ├─ coordinator.py                      # polls events, builds {uid: hex} map
│  ├─ calendar.py                         # CalendarEntity + extra attributes
│  ├─ config_flow.py                      # OAuth2 config flow
│  └─ application_credentials.py          # OAuth app credentials provider
├─ frontend/                              # card TS source (Vite + TypeScript)
├─ www/                                   # built card, served at /local/...
├─ docker-compose.yml                     # local HA dev instance
└─ tests/                                 # pytest for colour resolution
```

## Colour resolution precedence

For each event:

1. `event_label_id` → the calendar's `labelProperties.eventLabels` background colour
   (custom colour labels; used automatically when `gcal-sync` >= 9.2.0 is installed,
   otherwise skipped).
2. `color_id` → Google's event palette via `async_get_colors()`.
3. `None` → the **calendar's default colour** (exposed as the `calendar_color`
   attribute), then the theme's primary colour in the card.

On each calendar entity the integration provides:

- `event_colors` — map of `{uid: hex}` for the current window (the card joins events
  by `uid`).
- `event_color` — the current/next event's hex colour.
- `event_color_id` / `event_label_id` — the raw Google identifiers.
- `calendar_color` — the calendar's default colour.

## Setup

### 1. Google Cloud credentials

1. Create/select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Create an **OAuth Client ID** of type *Web application*.
4. Add the redirect URI: `https://my.home-assistant.io/redirect/oauth`.
5. Note the client ID and secret.

### 2. Home Assistant: application credentials

Settings → Devices & Services → **Application Credentials** → Add → **Google Calendar
(per-event colors)** → enter the client ID and secret.

### 3. Home Assistant: add the integration

Settings → Devices & Services → **Add integration** → choose **Google Calendar
(per-event colors)** and complete OAuth. The integration creates one `calendar.*`
entity per calendar visible in Google (selected + primary calendars).

Each entity exposes the `event_colors`, `event_color`, `calendar_color` attributes
described above, so the standard calendar views still code by calendar colour while
your card gets true per-event colours.

## The card

### Build

```bash
cd frontend
npm install
npm run build      # writes ../www/ha-google-calendar-card.js
```

### Use

1. Add a frontend resource: Settings → Dashboards → **Resources** → Add →
   `/local/ha-google-calendar-card.js`.
2. Add the card to a dashboard. The card ships a **GUI editor**: in the dashboard
   editor, click the card then **⋮ → Edit**, or open the *Add card* picker and
   choose *Google Calendar (per-event colors)* — you can pick the calendars, title,
   window, toggles and per-calendar colour overrides without writing YAML.
3. Or configure it in YAML:

```yaml
type: custom:ha-google-calendar-card
entities:
  - calendar.family
  - calendar.work
title: Upcoming events
view: agenda       # "agenda" (default) or "month"
days: 30           # agenda: look-ahead window; for "month" it is ignored
lookback: 7        # agenda: include events already started
maxEvents: 100
showTime: true
showCalendarName: true
colors:            # optional per-calendar overrides
  calendar.work: "#7986cb"
firstDayOfWeek: monday   # "monday" | "sunday"; default from browser locale
monthChipLimit: 3        # max timed-event chips per day cell in month view
```

The card fetches events over the REST `/api/calendars/<entity>` endpoint (which
includes `uid`), then joins each event's `uid` against the entity's `event_colors`
map. It falls back to the calendar default colour, then the theme accent.

### Views

- **Agenda** — upcoming events grouped by day, each a coloured row.
- **Month** — a month grid with weekday headers, navigation (‹ today ›), today
  highlighted. All-day / multi-day events render as **spanning bars** across their
  days (with continuations at week edges); single-day timed events are compact
  coloured chips (capped by `monthChipLimit`). **Click any day** to show that day's
  events in a detail list below the grid.

> Tip (agenda): the card's `days`/`lookback` window should not exceed the window the
> integration polls (`event_colors` only covers that window). Defaults (30/7) match.

## Local testing with Docker

```bash
# one-time: build the card (so www/ has the bundle)
cd frontend && npm install && npm run build && cd ..

# run Home Assistant live-mounting the integration + card
docker compose up -d
# -> http://localhost:8123
```

Iteration:

- **Backend**: edit files under `custom_components/`, then reload the config entry
  (Settings → Devices & Services → ⋮ → Reload).
- **Card**: edit files under `frontend/src`, run `npm run build`, then reload the
  frontend (Settings → Dashboards → Refresh / hard refresh).

## Tests

The colour-resolution logic is pure Python and is unit-tested without a running
Home Assistant:

```bash
python -m venv .venv && . .venv/bin/activate
pip install gcal-sync pytest ruff
ruff check && python -m pytest tests/
```

The HA-dependent code (platform, config flow, coordinator) is exercised inside the
Docker dev instance via live reload.

