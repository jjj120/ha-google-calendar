"""Application Credentials platform for the Google Calendar integration."""

from __future__ import annotations

import oauth2client
from homeassistant.components.application_credentials import (
    AuthImplementation,
    AuthorizationServer,
    ClientCredential,
)
from homeassistant.core import HomeAssistant

AUTHORIZATION_SERVER = AuthorizationServer(
    oauth2client.GOOGLE_AUTH_URI,
    oauth2client.GOOGLE_TOKEN_URI,
)


async def async_get_auth_implementation(
    hass: HomeAssistant,
    auth_domain: str,
    credential: ClientCredential,
) -> AuthImplementation:
    """Return the OAuth implementation for the given credential."""
    return AuthImplementation(
        hass,
        auth_domain,
        credential,
        AUTHORIZATION_SERVER,
    )


async def async_get_description_placeholders(hass: HomeAssistant) -> dict[str, str]:
    """Return description placeholders for the credentials dialog."""
    return {
        "oauth_consent_url": "https://console.cloud.google.com/apis/credentials/consent",
        "more_info_url": "https://www.home-assistant.io/integrations/google/",
        "oauth_creds_url": "https://console.cloud.google.com/apis/credentials",
    }
