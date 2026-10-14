"""Constants for the Google Calendar (per-event colors) integration."""

from __future__ import annotations

from enum import StrEnum
from typing import Final

DOMAIN: Final = "ha_google_calendar"

CONF_LOOKAHEAD_DAYS: Final = "lookahead_days"
CONF_LOOKBACK_DAYS: Final = "lookback_days"
CONF_CALENDAR_ACCESS: Final = "calendar_access"

DEFAULT_LOOKAHEAD_DAYS: Final = 30
DEFAULT_LOOKBACK_DAYS: Final = 7

CONF_CAL_ID: Final = "cal_id"
CONF_TRACK: Final = "track"
CONF_SEARCH: Final = "search"
CONF_IGNORE_AVAILABILITY: Final = "ignore_availability"

# Entity state attribute carrying the resolved per-event color map.
# Keyed by the event uid (iCalUID) so a frontend card can join it against the
# events returned by the calendar API.
ATTR_EVENT_COLORS: Final = "event_colors"
# The calendar's default color (used when an event has no specific color).
ATTR_CALENDAR_COLOR: Final = "calendar_color"
# Hex colour of the current/next event (convenience for automations/templates).
ATTR_EVENT_COLOR: Final = "event_color"
# Raw color identifiers as reported by Google, for debugging / advanced use.
ATTR_EVENT_COLOR_ID: Final = "event_color_id"
ATTR_EVENT_LABEL_ID: Final = "event_label_id"

# Minimum update interval between coordinator polls.
MIN_TIME_BETWEEN_UPDATES: Final = 900  # seconds (15 min)
# Maximum number of upcoming events tracked for state updates.
MAX_UPCOMING_EVENTS: Final = 20

ENTITY_ID_FORMAT: Final = DOMAIN + ".{}"
YAML_DEVICES: Final = f"{DOMAIN}_calendars.yaml"


class FeatureAccess(StrEnum):
    """Google Calendar API scopes used by the integration."""

    READ_ONLY = "https://www.googleapis.com/auth/calendar.readonly"
    READ_WRITE = "https://www.googleapis.com/auth/calendar"


DEFAULT_FEATURE_ACCESS: Final = FeatureAccess.READ_WRITE

EVENT_PAGE_SIZE: Final = 500
