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
event_labels_to_map = _COLORS_MODULE.event_labels_to_map


def _event(color_id: str | None = None, label_id: str | None = None) -> Event:
    """Create a minimal event with the given colour identifiers."""
    return Event(
        start=DateOrDatetime(date=date(2026, 1, 1)),
        end=DateOrDatetime(date=date(2026, 1, 2)),
        color_id=color_id,
        event_label_id=label_id,
    )


def _palette() -> Colors:
    """Return a small event palette."""
    return Colors(
        event={
            "1": ColorDefinition(background="#039be5", foreground="#ffffff"),
            "2": ColorDefinition(background="#7986cb", foreground="#ffffff"),
        }
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


def test_resolve_uses_label_first() -> None:
    """Custom label colour wins over the legacy palette."""
    resolver = ColorResolver(
        palette=_palette(),
        labels={"label-1": "#7c54c0"},
    )
    assert resolver.resolve(_event(color_id="1", label_id="label-1")) == "#7c54c0"


def test_resolve_falls_back_to_palette() -> None:
    """Events without a custom label resolve via the legacy palette."""
    resolver = ColorResolver(palette=_palette())
    assert resolver.resolve(_event(color_id="2")) == "#7986cb"


def test_resolve_missing_label_falls_back_to_palette() -> None:
    """An unknown label id falls back to the palette rather than erroring."""
    resolver = ColorResolver(
        palette=_palette(),
        labels={"label-1": "#7c54c0"},
    )
    assert resolver.resolve(_event(color_id="1", label_id="missing")) == "#039be5"


def test_resolve_no_color() -> None:
    """Events without any colour resolve to None (use calendar default)."""
    assert ColorResolver(palette=_palette()).resolve(_event()) is None


def test_resolve_no_data() -> None:
    """A resolver with no palette/labels returns None."""
    assert ColorResolver().resolve(_event(color_id="1")) is None


@pytest.mark.parametrize(
    ("event", "expected"),
    [
        (_event(color_id="1"), "#039be5"),
        (_event(color_id="1", label_id="label-1"), "#7c54c0"),
    ],
)
def test_resolve_parametrized(event: Event, expected: str) -> None:
    """Parametrized resolution cases."""
    resolver = ColorResolver(
        palette=_palette(),
        labels={"label-1": "#7c54c0"},
    )
    assert resolver.resolve(event) == expected
