"""API Client for fetching Google Calendar events with per-event colorId."""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any
import urllib.parse

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import entity_registry as er

from .const import GOOGLE_EVENT_COLORS

_LOGGER = logging.getLogger(__name__)

GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3"


class GoogleCalendarColorClient:
    """Client for retrieving Google Calendar events with colorId metadata."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the client."""
        self.hass = hass
        self._session = async_get_clientsession(hass)
        self._color_cache: dict[str, Any] = {}

    async def _get_google_token_for_calendar(self, calendar_id: str) -> str | None:
        """Attempt to extract OAuth access token from official Google integration."""
        google_entries = self.hass.config_entries.async_entries("google")
        if not google_entries:
            _LOGGER.debug("No official Google config entries found in Home Assistant")
            return None

        for entry in google_entries:
            # Check auth_implementation token or entry data
            token_data = entry.data.get("token", {})
            access_token = token_data.get("access_token")
            if access_token:
                return access_token

            # Try config_entry implementation if available
            try:
                from homeassistant.helpers import config_entry_oauth2_flow
                impl = await config_entry_oauth2_flow.async_get_config_entry_implementation(
                    self.hass, entry
                )
                session = config_entry_oauth2_flow.OAuth2Session(self.hass, entry, impl)
                await session.async_ensure_token_valid()
                return session.token.get("access_token")
            except Exception as err:
                _LOGGER.debug("Could not resolve OAuth2Session for entry %s: %s", entry.entry_id, err)

        return None

    def _resolve_calendar_id(self, target: str) -> str:
        """Resolve entity_id (e.g. calendar.work) to a Google calendar ID if possible."""
        if "@" in target:
            return target

        if target.startswith("calendar."):
            registry = er.async_get(self.hass)
            entry = registry.async_get(target)
            if entry and entry.unique_id:
                # In official Google integration, unique_id is often the calendar ID
                return entry.unique_id

            state = self.hass.states.get(target)
            if state and "calendar_id" in state.attributes:
                return state.attributes["calendar_id"]

        return target

    async def async_get_events(
        self, target: str, start_time: str, end_time: str
    ) -> list[dict[str, Any]]:
        """Fetch events for target calendar between start_time and end_time."""
        calendar_id = self._resolve_calendar_id(target)
        token = await self._get_google_token_for_calendar(calendar_id)

        if token:
            try:
                return await self._fetch_from_google_api(calendar_id, start_time, end_time, token)
            except Exception as err:
                _LOGGER.warning("Direct Google API fetch failed for %s, trying HA fallback: %s", calendar_id, err)

        # Fallback to standard Home Assistant calendar data
        return await self._fetch_from_ha_calendar(target, start_time, end_time)

    async def _fetch_from_google_api(
        self, calendar_id: str, start_time: str, end_time: str, token: str
    ) -> list[dict[str, Any]]:
        """Query Google Calendar API v3 directly using OAuth token."""
        encoded_cal = urllib.parse.quote(calendar_id, safe="")
        url = f"{GOOGLE_CALENDAR_API_URL}/calendars/{encoded_cal}/events"

        # Format ISO strings
        params = {
            "timeMin": start_time if "T" in start_time else f"{start_time}T00:00:00Z",
            "timeMax": end_time if "T" in end_time else f"{end_time}T23:59:59Z",
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": "250",
            "fields": "items(id,summary,description,location,start,end,colorId,status,htmlLink,transparency)",
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

        async with self._session.get(url, params=params, headers=headers) as resp:
            if resp.status != 200:
                body = await resp.text()
                raise RuntimeError(f"Google API error HTTP {resp.status}: {body}")

            data = await resp.json()
            items = data.get("items", [])

            normalized_events = []
            for item in items:
                if item.get("status") == "cancelled":
                    continue

                color_id = item.get("colorId")
                color_info = GOOGLE_EVENT_COLORS.get(color_id) if color_id else None

                normalized_events.append(
                    {
                        "id": item.get("id"),
                        "summary": item.get("summary", "(No title)"),
                        "description": item.get("description", ""),
                        "location": item.get("location", ""),
                        "start": item.get("start", {}),
                        "end": item.get("end", {}),
                        "colorId": color_id,
                        "color": color_info.get("background") if color_info else None,
                        "colorName": color_info.get("name") if color_info else None,
                        "htmlLink": item.get("htmlLink", ""),
                    }
                )

            return normalized_events

    async def _fetch_from_ha_calendar(
        self, entity_id: str, start_time: str, end_time: str
    ) -> list[dict[str, Any]]:
        """Fallback to querying the HA calendar entity via internal calendar component."""
        if not entity_id.startswith("calendar."):
            _LOGGER.debug("Cannot query non-calendar entity %s via HA calendar component", entity_id)
            return []

        try:
            from homeassistant.components.calendar import async_get_events
            from datetime import datetime
            import zoneinfo

            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))

            calendar_events = await async_get_events(self.hass, entity_id, start_dt, end_dt)
            results = []
            for ev in calendar_events:
                ev_dict = ev.as_dict() if hasattr(ev, "as_dict") else dict(ev)
                start_val = ev_dict.get("start")
                end_val = ev_dict.get("end")

                # Format start/end
                start_obj = {"dateTime": start_val.isoformat()} if hasattr(start_val, "isoformat") else {"dateTime": str(start_val)}
                end_obj = {"dateTime": end_val.isoformat()} if hasattr(end_val, "isoformat") else {"dateTime": str(end_val)}

                results.append(
                    {
                        "id": ev_dict.get("uid") or ev_dict.get("id"),
                        "summary": ev_dict.get("summary", ""),
                        "description": ev_dict.get("description", ""),
                        "location": ev_dict.get("location", ""),
                        "start": start_obj,
                        "end": end_obj,
                        "colorId": None,
                        "color": None,
                    }
                )
            return results
        except Exception as err:
            _LOGGER.error("Failed to query HA calendar entity %s: %s", entity_id, err)
            return []
