"""Data coordinator for the Google Calendar integration.

A single coordinator is created per calendar entity. It polls the calendar for
events in a configurable look-ahead window and resolves each event to a hex
colour so the entity can expose a per-event colour map.
"""

from __future__ import annotations

import asyncio
import itertools
import logging
from datetime import datetime, timedelta
from typing import override

from gcal_sync.api import GoogleCalendarService, ListEventsRequest
from gcal_sync.exceptions import ApiException
from gcal_sync.model import Colors, Event
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .colors import ColorResolver, event_labels_to_map
from .const import (
    MAX_UPCOMING_EVENTS,
    MIN_TIME_BETWEEN_UPDATES,
)

_LOGGER = logging.getLogger(__name__)


class CalendarEventCoordinator(DataUpdateCoordinator[list[Event]]):
    """Coordinator refreshing calendar events for a single calendar."""

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry,
        service: GoogleCalendarService,
        name: str,
        calendar_id: str,
        search: str | None,
        lookback_days: int,
        lookahead_days: int,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=name,
            update_interval=timedelta(seconds=MIN_TIME_BETWEEN_UPDATES),
        )
        self.service = service
        self.calendar_id = calendar_id
        self._search = search
        self._lookback_days = lookback_days
        self._lookahead_days = lookahead_days
        # Map of event uid (iCalUID) -> resolved hex colour (or None).
        self.event_colors: dict[str, str | None] = {}
        # The last window that was served (via async_get_events) so the periodic
        # refresh reuses the card's active window instead of resetting the colour
        # map back to the default look-ahead window.
        self._last_window: tuple[datetime, datetime] | None = None

    @property
    def upcoming(self) -> list[Event] | None:
        """Return the next upcoming events if any."""
        if not self.data:
            return None
        return list(itertools.islice((e for e in self.data), MAX_UPCOMING_EVENTS))

    async def _async_get_palette(self) -> Colors | None:
        """Return the shared event colour palette from runtime data."""
        runtime = self.config_entry.runtime_data
        if runtime.colors is None:
            if runtime.color_lock is None:
                runtime.color_lock = asyncio.Lock()
            async with runtime.color_lock:
                if runtime.colors is None:
                    try:
                        runtime.colors = await self.service.async_get_colors()
                    except ApiException:
                        _LOGGER.debug("Failed to fetch colour palette", exc_info=True)
                        runtime.colors = Colors()
        return runtime.colors

    async def _async_fetch(self, start: datetime, end: datetime) -> list[Event]:
        """Fetch events in the window and refresh the colour map."""
        palette = await self._async_get_palette()
        try:
            calendar = await self.service.async_get_calendar(self.calendar_id)
        except ApiException:
            _LOGGER.debug("Failed to fetch calendar labels", exc_info=True)
            labels: dict[str, str] = {}
        else:
            labels = event_labels_to_map(calendar)
        resolver = ColorResolver(palette, labels)

        request = ListEventsRequest(
            calendar_id=self.calendar_id,
            start_time=start,
            end_time=end,
            search=self._search,
        )
        result_items: list[Event] = []
        try:
            result = await self.service.async_list_events(request)
            async for result_page in result:
                result_items.extend(result_page.items)
        except ApiException as err:
            self.async_set_update_error(err)
            raise HomeAssistantError(str(err)) from err

        # Accumulate colours instead of replacing the map: the card renders
        # against the entity's event_colors attribute on every state update,
        # so wiping the map on each fetch would briefly drop known colours and
        # make entries flicker back to the calendar default colour.
        new_colors: dict[str, str | None] = {}
        for event in result_items:
            color = resolver.resolve(event)
            if color:
                new_colors[event.ical_uuid or ""] = color
            elif event.ical_uuid:
                new_colors[event.ical_uuid] = None
        self.event_colors.update(new_colors)
        return result_items

    @override
    async def async_get_events(
        self, start_date: datetime, end_date: datetime
    ) -> list[Event]:
        """Return all events in a specific time frame."""
        self._last_window = (start_date, end_date)
        return await self._async_fetch(start_date, end_date)

    @override
    async def _async_update_data(self) -> list[Event]:
        """Fetch event data for the active window."""
        if self._last_window:
            start, end = self._last_window
        else:
            now = dt_util.now()
            start = now - timedelta(days=self._lookback_days)
            end = now + timedelta(days=self._lookahead_days)
        try:
            return await self._async_fetch(start, end)
        except HomeAssistantError as err:
            raise UpdateFailed(f"Error communicating with API: {err}") from err
