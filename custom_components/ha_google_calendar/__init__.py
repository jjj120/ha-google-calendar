"""Google Calendar integration with per-event colours."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

from gcal_sync.api import GoogleCalendarService
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import ApiAuthImpl
from .const import (
    CONF_LOOKAHEAD_DAYS,
    CONF_LOOKBACK_DAYS,
    DEFAULT_LOOKAHEAD_DAYS,
    DEFAULT_LOOKBACK_DAYS,
)

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.CALENDAR]


@dataclass
class GoogleRuntimeData:
    """Runtime data for a config entry."""

    service: GoogleCalendarService
    lookback_days: int
    lookahead_days: int
    colors: Any = None  # gcal_sync.model.Colors
    color_lock: asyncio.Lock | None = field(default=None)


type GoogleConfigEntry = ConfigEntry[GoogleRuntimeData]
type HaGoogleCalendarConfigEntry = ConfigEntry[GoogleRuntimeData]


async def async_setup_entry(hass: HomeAssistant, entry: GoogleConfigEntry) -> None:
    """Set up Google Calendar from a config entry."""
    implementation = (
        await config_entry_oauth2_flow.async_get_config_entry_implementation(
            hass, entry
        )
    )
    session = config_entry_oauth2_flow.OAuth2Session(hass, entry, implementation)
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


async def async_unload_entry(hass: HomeAssistant, entry: GoogleConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms_or_raise(entry, PLATFORMS)
