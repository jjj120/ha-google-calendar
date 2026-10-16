"""Google Calendar integration with per-event colours."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from gcal_sync.api import GoogleCalendarService
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.config_validation import config_entry_only_config_schema

from .api import ApiAuthImpl
from .const import (
    CARD_FILENAME,
    CARD_URL,
    CONF_LOOKAHEAD_DAYS,
    CONF_LOOKBACK_DAYS,
    DEFAULT_LOOKAHEAD_DAYS,
    DEFAULT_LOOKBACK_DAYS,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.CALENDAR]

# The integration is config-flow only (OAuth2); YAML setup is not supported.
CONFIG_SCHEMA = config_entry_only_config_schema(DOMAIN)

# Static card path, registered once per HA process so reloads do not re-add it.
_http_setup: bool = False


@dataclass
class GoogleRuntimeData:
    """Runtime data for a config entry."""

    service: GoogleCalendarService
    lookback_days: int
    lookahead_days: int


type GoogleConfigEntry = ConfigEntry[GoogleRuntimeData]
type HaGoogleCalendarConfigEntry = ConfigEntry[GoogleRuntimeData]


async def _async_register_card_path(hass: HomeAssistant) -> None:
    """Register the bundled Lovelace card as a static path (once per process)."""
    global _http_setup
    if _http_setup:
        return
    card_path = Path(__file__).parent / "www" / CARD_FILENAME
    if card_path.exists():
        await hass.http.async_register_static_paths(
            [StaticPathConfig(CARD_URL, str(card_path), cache_headers=False)]
        )
    _http_setup = True


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the integration, registering the bundled Lovelace card."""
    await _async_register_card_path(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: GoogleConfigEntry) -> None:
    """Set up Google Calendar from a config entry."""
    implementation = (
        await config_entry_oauth2_flow.async_get_config_entry_implementation(
            hass, entry
        )
    )
    session = config_entry_oauth2_flow.OAuth2Session(hass, entry, implementation)
    # Force a token refresh to fix a bug where tokens were persisted with
    # expires_in (relative time delta) and expires_at (absolute time) swapped.
    # A google session token typically only lasts a few days between refresh.
    now = time.time()
    if session.token.get("expires_at", 0) >= now + timedelta(days=365).total_seconds():
        session.token["expires_in"] = 0
        session.token["expires_at"] = now
    await session.async_ensure_token_valid()

    calendar_service = GoogleCalendarService(
        ApiAuthImpl(async_get_clientsession(hass), session)
    )
    entry.runtime_data = GoogleRuntimeData(
        service=calendar_service,
        lookback_days=entry.options.get(CONF_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS),
        lookahead_days=entry.options.get(CONF_LOOKAHEAD_DAYS, DEFAULT_LOOKAHEAD_DAYS),
    )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: GoogleConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms_or_raise(entry, PLATFORMS)
