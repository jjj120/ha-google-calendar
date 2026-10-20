# AGENTS.md

This file guides AI agents / developers working in this repo.

## What this is

A **Home Assistant custom integration** (`custom_components/ha_google_calendar`) bundled
with a **Lovelace card** (`frontend/`). Google assigns colours per event; the built-in
`google` integration drops that when normalising into HA's `CalendarEvent`. This project
re-exposes per-event colours as entity attributes and renders them with a custom card.

- Distributed via HACS (category `integration`). `hacs.json` + `.github/workflows/`
  keep it HACS- and hassfest-compliant.
- Uses the third-party [`gcal-sync`](https://github.com/allenporter/gcal_sync) library
  for the Google API and OAuth (must stay compatible with the version HA core pins).
- Minimum Home Assistant: `2024.1.0`. Python `>=3.12`.

## Layout

```
custom_components/ha_google_calendar/   # backend integration (Python)
  __init__.py            # config-entry setup + registers the card as a static path
  const.py               # DOMAIN, attribute/option constants, scopes
  api.py                 # gcal_sync auth wrappers (ApiAuthImpl, AccessTokenAuthImpl)
  colors.py              # PURE per-event colour resolution (no HA dependency)
  coordinator.py         # per-calendar DataUpdateCoordinator, builds {uid: hex} map
  calendar.py            # CalendarEntity, extra state attributes, create/delete event
  config_flow.py         # OAuth2 config flow (config-flow only, no YAML setup)
  application_credentials.py  # OAuth app credential provider
  www/ha-google-calendar-card.js  # built card bundle (do NOT hand-edit)
  brand/                 # icon.png / logo.png
frontend/                # card TS source (Vite + TypeScript, builds the bundle above)
tests/                   # pytest unit tests (colour resolution)
docker-compose.yml       # local HA dev instance
```

## Commands

Backend (from repo root):

```bash
. .venv/bin/activate
ruff check                     # lint (E, F, I, SIM; E501 ignored)
python -m pytest tests/        # unit tests (colour resolution only)
```

Frontend (from `frontend/`):

```bash
npm install
npm run build       # tsc --noEmit && vite build -> writes ../custom_components/.../www/ha-google-calendar-card.js
npm run lint        # eslint src --ext .ts
npm run typecheck   # tsc --noEmit
npm run dev         # vite dev server (uses src/demo/main.ts as fixture)
```

Local HA (from repo root):

```bash
cd frontend && npm install && npm run build && cd ..
docker compose up -d      # -> http://localhost:8123 (integration + card live-mounted)
```

CI (`.github/workflows/`): `hacs.yml` (HACS validation) runs on push/PR/schedule, plus a
daily cron; both are read-only validators — fix warnings, do not delete them.

## Development workflow

- **Backend changes**: edit under `custom_components/`, then reload the config entry
  (Settings → Devices & Services → ⋮ → Reload). HA-dependent code is exercised only in
  the Docker instance via live reload.
- **Card changes**: edit `frontend/src/`, then `npm run build`. The bundle is **copied
  into** `custom_components/ha_google_calendar/www/` so a HACS/`cp -r` download ships the
  card too. After building, hard-refresh the frontend.
- **Iterate fast**: the coordinator polls at `MIN_TIME_BETWEEN_UPDATES` (900s); rely on
  `async_get_events` (which the card calls) to refresh the window, not on the poller.

## Testing

`tests/test_colors.py` imports `colors.py` directly via `importlib.util` (it has **no HA
dependency**) to avoid importing the package `__init__.py`, which imports HA. Keep
`colors.py` free of Home Assistant imports — that is a deliberate, load-bearing design
choice. HA-coupled code (platform, config flow, coordinator) has no automated test coverage
here; verify it in the Docker instance.

## Colour precedence (backend + card)

1. Custom colour label: `event_label_id` → the calendar's `labelProperties.eventLabels`
   background. Only present when `gcal-sync >= 9.2.0`; used via attribute detection in
   `colors.py` so older pinned versions still work.
2. Built-in palette: `color_id` → `EVENT_COLOR_HEX` (hardcoded official hex — the
   `/colors` endpoint returns the stale pre-2016 palette, so do not trust it).
3. `None` → calendar default colour (`calendar_color`), then the card's theme accent.

The integration exposes, per calendar entity: `event_colors` (`{uid: hex}`), `event_color`
(current/next event), `event_color_id`, `event_label_id`, `calendar_color`. The card
fetches events via `GET /api/calendars/<entity>` (which includes `uid`) and joins `uid`
against `event_colors`; it also re-fetches `/api/<state>` so the colour map is not raced by
websocket updates.

## Conventions & gotchas

- **`colors.py` stays HA-free and pure.** Do not import Home Assistant there; file-edit
  length and ordering matter — ruff config is in `pyproject.toml` (line-length 88, target
  py312).
- **Never hand-edit** `custom_components/ha_google_calendar/www/ha-google-calendar-card.js`;
  it is a build artifact. Edit `frontend/src/` and rebuild.
- **No YAML config.** The integration is config-flow only; `__init__.py` sets
  `CONFIG_SCHEMA = config_entry_only_config_schema(DOMAIN)`.
- **`event_colors` accumulates, never replaces** (`coordinator._async_fetch` calls
  `.update()`), so the card doesn't flicker to the default colour mid-window.
- The card's `days`/`lookback` window should not exceed the window the integration polls
  (defaults 30/7 match the card defaults).
- Frontend is strict TS (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`) and targets ES2020+. The card is a custom element with an
  open Shadow DOM and a `ha-google-calendar-card-editor` companion for the GUI config.
- Keep line lengths and comment style consistent with surrounding code. Match the repo's
  existing logging (`_LOGGER.debug` for expected API failures, `.error` for actionable ones).
- The `frontend/src/demo/main.ts` fixture feeds a fake `hass` object; keep it compiling as
  it is the only place the card's types get exercised without a live HA.

## Release note (0.2.0) — per-event colours

The original repo was a fork of the upstream `google` calendar integration. Do not regress
the per-event colour feature when refactoring.
