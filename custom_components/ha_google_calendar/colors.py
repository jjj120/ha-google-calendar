"""Pure per-event colour resolution for the Google Calendar integration.

This module has no Home Assistant dependency so the resolution logic can be
unit-tested in isolation.
"""

from __future__ import annotations

from gcal_sync.model import CalendarBasic, Colors, Event, EventLabel


class ColorResolver:
    """Resolve a Google event to a hex colour.

    Precedence:
      1. ``event_label_id`` -> the calendar's `labelProperties.eventLabels`
         background colour (custom labels, supersedes the old palette).
      2. ``color_id`` -> the event palette from ``async_get_colors``.
      3. ``None`` -> caller falls back to the calendar's default colour.
    """

    def __init__(
        self,
        palette: Colors | None = None,
        labels: dict[str, str] | None = None,
    ) -> None:
        """Initialise the resolver with optional resolved palette/labels."""
        self._palette = palette
        self._labels = labels or {}

    def resolve(self, event: Event) -> str | None:
        """Return the hex background colour for an event, or None."""
        if event.event_label_id and (color := self._labels.get(event.event_label_id)):
            return color
        # Fall back to the legacy palette when no custom label matches.
        if (
            event.color_id
            and self._palette
            and (definition := self._palette.event.get(event.color_id))
        ):
            return definition.background
        return None


def event_labels_to_map(calendar: CalendarBasic) -> dict[str, str]:
    """Convert a calendar's event labels into an id -> hex map."""
    if not calendar.label_properties:
        return {}
    return {
        label.id: label.background_color
        for label in calendar.label_properties.event_labels
        if isinstance(label, EventLabel) and label.id and label.background_color
    }
