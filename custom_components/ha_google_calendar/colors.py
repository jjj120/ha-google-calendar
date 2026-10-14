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


class ColorResolver:
    """Resolve a Google event to a hex colour.

    Precedence:
      1. ``event_label_id`` -> the calendar's `labelProperties.eventLabels`
         background colour (custom labels; only present with ``gcal_sync``
         >= 9.2.0).
      2. ``color_id`` -> the event palette from ``async_get_colors``.
      3. ``None`` -> caller falls back to the calendar's default colour.
    """

    def __init__(
        self,
        palette=None,
        labels: dict[str, str] | None = None,
    ) -> None:
        """Initialise the resolver with optional resolved palette/labels."""
        self._palette = palette
        self._labels = labels or {}

    def resolve(self, event: Event) -> str | None:
        """Return the hex background colour for an event, or None."""
        label_id = getattr(event, "event_label_id", None)
        if label_id and (color := self._labels.get(label_id)):
            return color
        # Fall back to the legacy palette when no custom label matches.
        color_id = getattr(event, "color_id", None)
        if (
            color_id
            and self._palette
            and (definition := self._palette.event.get(color_id))
        ):
            return definition.background
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
