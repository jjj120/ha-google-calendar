"""Google Calendar Card Helper component.

Provides WebSocket API, Service, and Config Flow to fetch Google Calendar events with full colorId metadata.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import os
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .api import GoogleCalendarColorClient
from .const import DOMAIN, SERVICE_GET_EVENTS, WS_TYPE_GET_EVENTS

_LOGGER = logging.getLogger(__name__)

CARD_VERSION = "1.0.1"
CARD_URL = "/google_calendar_card/google-calendar-card.js"
CARD_DIR = os.path.join(os.path.dirname(__file__), "frontend")
CARD_PATH = os.path.join(CARD_DIR, "google-calendar-card.js")

CONFIG_SCHEMA = cv.empty_config_schema(DOMAIN)

# Schema dictionary for WebSocket command
WS_GET_EVENTS_SCHEMA = {
    vol.Required("type"): WS_TYPE_GET_EVENTS,
    vol.Optional("entity_id"): cv.string,
    vol.Optional("calendar_id"): cv.string,
    vol.Required("start"): cv.string,
    vol.Required("end"): cv.string,
}

# Schema for Home Assistant Service
SERVICE_GET_EVENTS_SCHEMA = vol.Schema(
    {
        vol.Optional("entity_id"): cv.string,
        vol.Optional("calendar_id"): cv.string,
        vol.Required("start"): cv.string,
        vol.Required("end"): cv.string,
    }
)


def _register_api_endpoints(hass: HomeAssistant, client: GoogleCalendarColorClient) -> None:
    """Register WebSocket and Service endpoints if not already registered."""
    if hass.data.get(f"{DOMAIN}_registered"):
        return

    @websocket_api.websocket_command(WS_GET_EVENTS_SCHEMA)
    @websocket_api.async_response
    async def ws_get_events(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        """Handle WebSocket request for calendar events with colorId."""
        target = msg.get("entity_id") or msg.get("calendar_id")
        if not target:
            connection.send_error(
                msg["id"], "missing_target", "Either entity_id or calendar_id is required."
            )
            return

        start_time = msg["start"]
        end_time = msg["end"]

        try:
            events = await client.async_get_events(target, start_time, end_time)
            connection.send_result(msg["id"], {"events": events})
        except Exception as err:
            _LOGGER.error("Error fetching Google Calendar events for %s: %s", target, err)
            connection.send_error(msg["id"], "fetch_failed", str(err))

    websocket_api.async_register_command(hass, ws_get_events)

    async def async_handle_service_get_events(call: ServiceCall) -> dict[str, Any]:
        """Handle service call to fetch events with response data."""
        target = call.data.get("entity_id") or call.data.get("calendar_id")
        if not target:
            raise ValueError("Either entity_id or calendar_id is required.")

        start_time = call.data["start"]
        end_time = call.data["end"]

        events = await client.async_get_events(target, start_time, end_time)
        return {"events": events}

    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_EVENTS,
        async_handle_service_get_events,
        schema=SERVICE_GET_EVENTS_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )

    hass.data[f"{DOMAIN}_registered"] = True


async def _register_card(hass: HomeAssistant) -> None:
    """Register card bundle as a static path and add extra JS URL."""
    if hass.data.get(f"{DOMAIN}_card_registered"):
        return

    card_file = CARD_PATH
    if not os.path.exists(card_file):
        www_file = hass.config.path("www", "google-calendar-card.js")
        if os.path.exists(www_file):
            card_file = www_file

    if os.path.exists(card_file):
        try:
            await hass.http.async_register_static_paths([
                StaticPathConfig(
                    url_path=CARD_URL,
                    path=card_file,
                    cache_headers=False,
                )
            ])
            add_extra_js_url(hass, f"{CARD_URL}?v={CARD_VERSION}")
            hass.data[f"{DOMAIN}_card_registered"] = True
            _LOGGER.info("Registered Google Calendar Card frontend resource at %s?v=%s", CARD_URL, CARD_VERSION)

            # Auto-register in Lovelace resources collection if available
            try:
                ll_data = hass.data.get("lovelace")
                if ll_data and hasattr(ll_data, "resources"):
                    resources = ll_data.resources
                    if hasattr(resources, "async_items") and hasattr(resources, "async_create_item"):
                        existing = [item.get("url") for item in (resources.async_items() or [])]
                        if not any("google-calendar-card.js" in (url or "") for url in existing):
                            await resources.async_create_item({
                                "res_type": "module",
                                "url": f"{CARD_URL}?v={CARD_VERSION}",
                            })
            except Exception as res_err:
                _LOGGER.debug("Could not auto-register Lovelace resource: %s", res_err)
        except Exception as err:
            _LOGGER.warning("Could not register static path for Google Calendar Card: %s", err)
            try:
                add_extra_js_url(hass, f"{CARD_URL}?v={CARD_VERSION}")
            except Exception:
                pass


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Google Calendar Card Helper component from YAML."""
    if DOMAIN not in hass.data:
        hass.data[DOMAIN] = {}

    client = GoogleCalendarColorClient(hass)
    hass.data[DOMAIN]["client"] = client
    _register_api_endpoints(hass, client)
    await _register_card(hass)

    _LOGGER.info("Google Calendar Card Helper initialized successfully via YAML")
    return True


async def async_setup_entry(
    hass: HomeAssistant, entry: config_entries.ConfigEntry
) -> bool:
    """Set up Google Calendar Card Helper from a config entry (UI)."""
    if DOMAIN not in hass.data:
        hass.data[DOMAIN] = {}

    client = GoogleCalendarColorClient(hass)
    hass.data[DOMAIN][entry.entry_id] = client
    hass.data[DOMAIN]["client"] = client

    _register_api_endpoints(hass, client)
    await _register_card(hass)

    entry.async_on_unload(entry.add_update_listener(async_update_options))
    _LOGGER.info("Google Calendar Card Helper initialized successfully via UI")
    return True


async def async_update_options(
    hass: HomeAssistant, entry: config_entries.ConfigEntry
) -> None:
    """Update options for the integration."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(
    hass: HomeAssistant, entry: config_entries.ConfigEntry
) -> bool:
    """Unload a config entry."""
    if DOMAIN in hass.data and entry.entry_id in hass.data[DOMAIN]:
        hass.data[DOMAIN].pop(entry.entry_id)
    return True
