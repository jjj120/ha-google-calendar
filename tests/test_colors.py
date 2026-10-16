"""Unit tests for the pure per-event colour resolution logic.

The colour resolution module has no Home Assistant dependency, so it is loaded
directly via importlib to avoid importing the package's ``__init__.py`` (which
requires a running Home Assistant).
"""

from __future__ import annotations

import importlib.util
from datetime import date
from pathlib import Path

import pytest
from gcal_sync.model import (
    CalendarBasic,
    ColorDefinition,
    Colors,
    DateOrDatetime,
    Event,
    EventLabel,
    LabelProperties,
)

_COLORS_PATH = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "ha_google_calendar"
    / "colors.py"
)
_SPEC = importlib.util.spec_from_file_location(
    "ha_google_calendar_colors", _COLORS_PATH
)
assert _SPEC and _SPEC.loader
_COLORS_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_COLORS_MODULE)
ColorResolver = _COLORS_MODULE.ColorResolver
EVENT_COLOR_HEX = _COLORS_MODULE.EVENT_COLOR_HEX
event_labels_to_map = _COLORS_MODULE.event_labels_to_map


def _event(color_id: str | None = None, label_id: str | None = None) -> Event:
    """Create a minimal event with the given colour identifiers."""
    return Event(
        start=DateOrDatetime(date=date(2026, 1, 1)),
        end=DateOrDatetime(date=date(2026, 1, 2)),
        color_id=color_id,
        event_label_id=label_id,
    )


def test_labels_to_map() -> None:
    """Event labels are converted to an id -> hex map."""
    calendar = CalendarBasic(
        id="cal",
        label_properties=LabelProperties(
            event_labels=[
                EventLabel(id="label-1", background_color="#7c54c0", name="Family"),
                EventLabel(id="label-2", background_color="#0553b1", name="Work"),
            ]
        ),
    )
    assert event_labels_to_map(calendar) == {
        "label-1": "#7c54c0",
        "label-2": "#0553b1",
    }


def test_labels_to_map_empty() -> None:
    """A calendar without labels resolves to an empty map."""
    assert event_labels_to_map(CalendarBasic(id="cal")) == {}


@pytest.mark.parametrize(
    ("color_id", "expected"),
    [
        ("1", "#7986cb"),  # Lavender
        ("2", "#33b679"),  # Sage
        ("3", "#8e24aa"),  # Grape
        ("4", "#e67c73"),  # Flamingo
        ("5", "#f6bf26"),  # Banana
        ("6", "#f4511e"),  # Tangerine
        ("7", "#039be5"),  # Peacock
        ("8", "#616161"),  # Graphite
        ("9", "#3f51b5"),  # Blueberry
        ("10", "#0b8043"),  # Basil
        ("11", "#d50000"),  # Tomato
    ],
)
def test_resolve_builtin_event_colors(color_id: str, expected: str) -> None:
    """Each built-in event colour id resolves to its official hex value."""
    assert ColorResolver().resolve(_event(color_id=color_id)) == expected


def test_resolve_uses_label_first() -> None:
    """Custom label colour wins over the built-in palette."""
    resolver = ColorResolver(labels={"label-1": "#7c54c0"})
    assert resolver.resolve(_event(color_id="11", label_id="label-1")) == "#7c54c0"


def test_resolve_missing_label_falls_back_to_builtin() -> None:
    """An unknown label id falls back to the built-in palette."""
    resolver = ColorResolver(labels={"label-1": "#7c54c0"})
    assert resolver.resolve(_event(color_id="1", label_id="missing")) == "#7986cb"


def test_resolve_no_color() -> None:
    """Events without any colour resolve to None (use calendar default)."""
    assert ColorResolver().resolve(_event()) is None


def test_resolve_unknown_color_id() -> None:
    """An unknown colour id resolves to None rather than erroring."""
    assert ColorResolver().resolve(_event(color_id="99")) is None


def test_canonical_map_covers_all_ids() -> None:
    """The canonical event colour map contains exactly the 11 built-in ids."""
    assert set(EVENT_COLOR_HEX.keys()) == {str(i) for i in range(1, 12)}
