"""Config flow for Google Calendar Card Helper integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class GoogleCalendarCardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Google Calendar Card Helper."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(
                title="Google Calendar Card Helper",
                data=user_input,
            )

        # Check if the official Google integration is configured
        has_google = bool(self.hass.config_entries.async_entries("google"))
        status_msg = (
            "Official Google Calendar integration was detected in Home Assistant and is ready to use."
            if has_google
            else "Note: Configure the official Google integration in Home Assistant to sync private Google Calendars."
        )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
            description_placeholders={"status": status_msg},
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Get the options flow for this handler."""
        return GoogleCalendarCardOptionsFlowHandler()


class GoogleCalendarCardOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for Google Calendar Card Helper."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage options for the integration."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = self.config_entry.options

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        "cache_duration_hours",
                        default=options.get("cache_duration_hours", 24),
                    ): vol.All(vol.Coerce(int), vol.Range(min=1, max=168)),
                    vol.Optional(
                        "default_color",
                        default=options.get("default_color", "#4285F4"),
                    ): str,
                }
            ),
        )
