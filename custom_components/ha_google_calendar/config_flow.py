"""Config flow for the Google Calendar (per-event colors) integration."""

from __future__ import annotations

import logging
from typing import Any, override

from gcal_sync.api import GoogleCalendarService
from gcal_sync.exceptions import ApiException, ApiForbiddenException
from homeassistant.config_entries import ConfigFlowResult
from homeassistant.helpers import config_entry_oauth2_flow
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import AccessTokenAuthImpl
from .const import DEFAULT_FEATURE_ACCESS, DOMAIN

_LOGGER = logging.getLogger(__name__)


class OAuth2FlowHandler(
    config_entry_oauth2_flow.AbstractOAuth2FlowHandler, domain=DOMAIN
):
    """Config flow to handle Google Calendar OAuth2 authentication."""

    DOMAIN = DOMAIN

    @property
    @override
    def logger(self) -> logging.Logger:
        """Return logger."""
        return logging.getLogger(__name__)

    @property
    @override
    def extra_authorize_data(self) -> dict[str, Any]:
        """Extra data needed in the authorize URL."""
        return {
            "scope": DEFAULT_FEATURE_ACCESS.value,
            # Ensure we get a refresh token back.
            "access_type": "offline",
            "prompt": "consent",
        }

    @override
    async def async_oauth_create_entry(self, data: dict) -> ConfigFlowResult:
        """Create the config entry, validating the API is reachable."""
        calendar_service = GoogleCalendarService(
            AccessTokenAuthImpl(
                async_get_clientsession(self.hass),
                data["token"]["access_token"],
            )
        )
        try:
            primary_calendar = await calendar_service.async_get_calendar("primary")
        except ApiForbiddenException as err:
            _LOGGER.error(
                "Error reading primary calendar, make sure the Google Calendar "
                "API is enabled: %s",
                err,
            )
            return self.async_abort(
                reason="calendar_api_disabled",
                description_placeholders={
                    "calendar_api_url": (
                        "https://console.cloud.google.com/apis/library/"
                        "calendar-json.googleapis.com"
                    )
                },
            )
        except ApiException as err:
            _LOGGER.error("Error reading primary calendar: %s", err)
            return self.async_abort(reason="cannot_connect")

        await self.async_set_unique_id(primary_calendar.id)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title=primary_calendar.id, data=data)
