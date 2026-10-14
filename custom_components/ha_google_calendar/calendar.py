"""Calendar platform for the Google Calendar (per-event colors) integration."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, override

from gcal_sync.exceptions import ApiException
from gcal_sync.model import DateOrDatetime, Event, ResponseStatus
from homeassistant.components.calendar import (
    EVENT_DESCRIPTION,
    EVENT_END,
    EVENT_LOCATION,
    EVENT_RRULE,
    EVENT_START,
    EVENT_SUMMARY,
    CalendarEntity,
    CalendarEntityFeature,
    CalendarEvent,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, PlatformNotReady
from homeassistant.helpers.entity import generate_entity_id
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .const import (
    ATTR_CALENDAR_COLOR,
    ATTR_EVENT_COLOR,
    ATTR_EVENT_COLOR_ID,
    ATTR_EVENT_COLORS,
    ATTR_EVENT_LABEL_ID,
)
from .coordinator import CalendarEventCoordinator

_LOGGER = logging.getLogger(__name__)

OPAQUE = "opaque"
RRULE_PREFIX = "RRULE:"
_ENTITY_ID_FORMAT = "calendar.{}"


class GoogleCalendarEntity(
    CoordinatorEntity[CalendarEventCoordinator],
    CalendarEntity,
):
    """A calendar entity backed by a per-calendar coordinator."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: CalendarEventCoordinator,
        calendar_id: str,
        entity_id: str,
        unique_id: str,
        initial_color: str | None,
        ignore_availability: bool,
        name: str,
    ) -> None:
        """Initialise the calendar entity."""
        super().__init__(coordinator)
        self.calendar_id = calendar_id
        self.entity_id = entity_id
        self._attr_unique_id = unique_id
        self._attr_name = name
        self._ignore_availability = ignore_availability
        self._attr_supported_features = (
            CalendarEntityFeature.CREATE_EVENT | CalendarEntityFeature.DELETE_EVENT
        )
        self._attr_initial_color = initial_color

    @property
    @override
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return extra state attributes, including the per-event colour map."""
        attrs: dict[str, Any] = {
            ATTR_EVENT_COLORS: dict(self.coordinator.event_colors),
            ATTR_CALENDAR_COLOR: self._attr_initial_color,
        }
        current = self._current_event()
        if current is not None:
            uid = current.ical_uuid or ""
            attrs[ATTR_EVENT_COLOR] = self.coordinator.event_colors.get(uid)
            if color_id := getattr(current, "color_id", None):
                attrs[ATTR_EVENT_COLOR_ID] = color_id
            if label_id := getattr(current, "event_label_id", None):
                attrs[ATTR_EVENT_LABEL_ID] = label_id
        return attrs

    def _current_event(self) -> Event | None:
        """Return the current or next upcoming event."""
        if not (events := self.coordinator.upcoming):
            return None
        for event in events:
            if self._visible(event):
                return event
        return None

    def _visible(self, event: Event) -> bool:
        """Return True if the event should be shown."""
        if any(
            attendee.is_self and attendee.response_status == ResponseStatus.DECLINED
            for attendee in event.attendees
        ):
            return False
        if self._ignore_availability:
            return True
        return event.transparency == OPAQUE

    @property
    @override
    def event(self) -> CalendarEvent | None:
        """Return the next upcoming event."""
        if (event := self._current_event()) is not None:
            return _get_calendar_event(event)
        return None

    @override
    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> list[CalendarEvent]:
        """Get all events in a specific time frame."""
        result_items = await self.coordinator.async_get_events(start_date, end_date)
        # Refresh the extra state attributes (notably the uid -> colour map) so a
        # frontend card reading them gets the colours for the same window.
        self.async_write_ha_state()
        return [
            _get_calendar_event(event) for event in result_items if self._visible(event)
        ]

    @override
    async def async_added_to_hass(self) -> None:
        """When entity is added to hass, kick off an initial refresh."""
        await super().async_added_to_hass()
        # Do not block setup on the network call; refresh in the background so the
        # event list and colour map are populated as soon as possible.
        self.coordinator.config_entry.async_create_background_task(
            self.hass,
            self.coordinator.async_request_refresh(),
            "ha_google_calendar.calendar-refresh",
        )

    @override
    async def async_create_event(self, **kwargs: Any) -> None:
        """Create a new event on the calendar."""
        dtstart = kwargs[EVENT_START]
        dtend = kwargs[EVENT_END]
        start: DateOrDatetime
        end: DateOrDatetime
        if isinstance(dtstart, datetime):
            start = DateOrDatetime(
                date_time=dt_util.as_local(dtstart),
                timezone=str(dt_util.get_default_time_zone()),
            )
            end = DateOrDatetime(
                date_time=dt_util.as_local(dtend),
                timezone=str(dt_util.get_default_time_zone()),
            )
        else:
            start = DateOrDatetime(date=dtstart)
            end = DateOrDatetime(date=dtend)
        event = Event.model_validate(
            {
                EVENT_SUMMARY: kwargs[EVENT_SUMMARY],
                "start": start,
                "end": end,
                EVENT_DESCRIPTION: kwargs.get(EVENT_DESCRIPTION),
            }
        )
        if location := kwargs.get(EVENT_LOCATION):
            event.location = location
        if rrule := kwargs.get(EVENT_RRULE):
            event.recurrence = [f"{RRULE_PREFIX}{rrule}"]
        try:
            await self.coordinator.service.async_create_event(self.calendar_id, event)
        except ApiException as err:
            raise HomeAssistantError(f"Error while creating event: {err!s}") from err
        await self.coordinator.async_refresh()

    @override
    async def async_delete_event(
        self,
        uid: str,
        recurrence_id: str | None = None,
        recurrence_range: str | None = None,
    ) -> None:
        """Delete an event on the calendar."""
        # We operate on the raw event id here rather than the ical uid. Query the
        # store-less coordinator for the event id matching the uid.
        event_id = recurrence_id or await self._resolve_event_id(uid)
        try:
            if event_id:
                await self.coordinator.service.async_delete_event(
                    self.calendar_id, event_id
                )
        except ApiException as err:
            raise HomeAssistantError(f"Error while deleting event: {err!s}") from err
        await self.coordinator.async_refresh()

    async def _resolve_event_id(self, uid: str) -> str | None:
        """Return the Google event id for an iCalUID, if known."""
        if not (events := self.coordinator.data):
            return None
        for event in events:
            if event.ical_uuid == uid:
                return event.id
        return None


def _get_calendar_event(event: Event) -> CalendarEvent:
    """Return a CalendarEvent from a gcal_sync API event."""
    rrule: str | None = None
    if (
        len(event.recurrence) == 1
        and (raw_rule := event.recurrence[0])
        and raw_rule.startswith(RRULE_PREFIX)
    ):
        rrule = raw_rule.removeprefix(RRULE_PREFIX)
    return CalendarEvent(
        uid=event.ical_uuid,
        recurrence_id=event.id if event.recurring_event_id else None,
        rrule=rrule,
        summary=event.summary,
        start=event.start.value,
        end=event.end.value,
        description=event.description,
        location=event.location,
    )


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the calendar platform."""
    runtime = config_entry.runtime_data
    service = runtime.service
    try:
        result = await service.async_list_calendars()
    except ApiException as err:
        raise PlatformNotReady(str(err)) from err

    entities = []
    for calendar_item in result.items:
        # Skip calendars that are not selected/visible in Google.
        if not calendar_item.selected and not calendar_item.primary:
            continue
        calendar_id = calendar_item.id
        base_unique_id = f"{config_entry.unique_id}-{calendar_id}"
        entity_id = generate_entity_id(
            _ENTITY_ID_FORMAT, calendar_item.summary, hass=hass
        )

        coordinator = CalendarEventCoordinator(
            hass,
            config_entry,
            service,
            calendar_item.summary,
            calendar_id,
            None,
            runtime.lookback_days,
            runtime.lookahead_days,
        )
        entities.append(
            GoogleCalendarEntity(
                coordinator,
                calendar_id,
                entity_id,
                base_unique_id,
                calendar_item.background_color,
                False,
                calendar_item.summary,
            )
        )

    async_add_entities(entities)
