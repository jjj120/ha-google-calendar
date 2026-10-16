"""Pure per-event colour resolution for the Google Calendar integration.

This module has no Home Assistant dependency so the resolution logic can be
unit-tested in isolation. It is written to tolerate the version of ``gcal_sync``
that Home Assistant core pins (9.1.0), which supports the legacy ``colorId``
palette but not the newer ``eventLabelId`` custom labels. When a newer library
with ``eventLabelId`` support is present, the extra feature is used
automatically via attribute detection.
"""

from __future__ import annotations

from gcal_sync.model import Event

# The 11 built-in Google Calendar event colours, indexed by the (unchanged)
# ``colorId`` value an event carries. The Calendar API's ``/colors`` endpoint
# still returns the pre-2016 palette, so its hex values no longer match what
# Google Calendar's UI shows. We therefore map the colour ids to the current
# official hex values directly.
EVENT_COLOR_HEX: dict[str, str] = {
    "1": "#7986cb",  # Lavender
    "2": "#33b679",  # Sage
    "3": "#8e24aa",  # Grape
    "4": "#e67c73",  # Flamingo
    "5": "#f6bf26",  # Banana
    "6": "#f4511e",  # Tangerine
    "7": "#039be5",  # Peacock
    "8": "#616161",  # Graphite
    "9": "#3f51b5",  # Blueberry
    "10": "#0b8043",  # Basil
    "11": "#d50000",  # Tomato
}


class ColorResolver:
    """Resolve a Google event to a hex colour.

    Precedence:
      1. ``event_label_id`` -> the calendar's `labelProperties.eventLabels`
         background colour (custom labels; only present with ``gcal_sync``
         >= 9.2.0).
      2. ``color_id`` -> the canonical built-in event colour (``EVENT_COLOR_HEX``).
      3. ``None`` -> caller falls back to the calendar's default colour.
    """

    def __init__(
        self,
        palette=None,
        labels: dict[str, str] | None = None,
    ) -> None:
        """Initialise the resolver with optional resolved labels.

        ``palette`` is accepted for backwards compatibility and ignored: the
        ``/colors`` endpoint is stale, so built-in colours come from
        ``EVENT_COLOR_HEX`` instead.
        """
        self._labels = labels or {}

    def resolve(self, event: Event) -> str | None:
        """Return the hex background colour for an event, or None."""
        label_id = getattr(event, "event_label_id", None)
        if label_id and (color := self._labels.get(label_id)):
            return color
        # Fall back to the built-in event palette when no custom label matches.
        color_id = getattr(event, "color_id", None)
        if color_id:
            return EVENT_COLOR_HEX.get(color_id)
        return None


def event_labels_to_map(calendar: object) -> dict[str, str]:
    """Convert a calendar's event labels into an id -> hex map.

    Returns an empty map when the installed ``gcal_sync`` does not expose
    ``label_properties`` (i.e. older than 9.2.0).
    """
    label_properties = getattr(calendar, "label_properties", None)
    if not label_properties:
        return {}
    return {
        label.id: label.background_color
        for label in label_properties.event_labels
        if label.id and label.background_color
    }
