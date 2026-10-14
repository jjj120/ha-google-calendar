"""Client wrappers and per-event colour resolution for Google Calendar."""

from __future__ import annotations

import logging
from typing import cast, override

import aiohttp
from gcal_sync.auth import AbstractAuth
from homeassistant.helpers import config_entry_oauth2_flow

_LOGGER = logging.getLogger(__name__)


class ApiAuthImpl(AbstractAuth):
    """Authentication implementation for the gcal_sync client."""

    def __init__(
        self,
        websession: aiohttp.ClientSession,
        session: config_entry_oauth2_flow.OAuth2Session,
    ) -> None:
        """Initialise the Google Calendar client library auth implementation."""
        super().__init__(websession)
        self._session = session

    @override
    async def async_get_access_token(self) -> str:
        """Return a valid access token."""
        await self._session.async_ensure_token_valid()
        return cast(str, self._session.token["access_token"])


class AccessTokenAuthImpl(AbstractAuth):
    """Auth implementation used during config flow, before a session exists.

    Used to validate the freshly acquired access token without needing a config
    entry, which is required to construct an ``OAuth2Session``.
    """

    def __init__(
        self,
        websession: aiohttp.ClientSession,
        access_token: str,
    ) -> None:
        """Initialise the client library auth implementation."""
        super().__init__(websession)
        self._access_token = access_token

    @override
    async def async_get_access_token(self) -> str:
        """Return the access token."""
        return self._access_token
