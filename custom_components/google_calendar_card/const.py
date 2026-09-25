"""Constants for the Google Calendar Card Helper component."""

DOMAIN = "google_calendar_card"

WS_TYPE_GET_EVENTS = "google_calendar_card/get_events"
SERVICE_GET_EVENTS = "get_events"

# Official Google Calendar 11 event colors
# https://developers.google.com/calendar/api/v3/reference/colors/get
GOOGLE_EVENT_COLORS = {
    "1": {"background": "#7986CB", "foreground": "#1d1d1d", "name": "Lavender"},
    "2": {"background": "#33B679", "foreground": "#1d1d1d", "name": "Sage"},
    "3": {"background": "#8E24AA", "foreground": "#1d1d1d", "name": "Grape"},
    "4": {"background": "#E67C73", "foreground": "#1d1d1d", "name": "Flamingo"},
    "5": {"background": "#F6BF26", "foreground": "#1d1d1d", "name": "Banana"},
    "6": {"background": "#F4511E", "foreground": "#1d1d1d", "name": "Tangerine"},
    "7": {"background": "#039BE5", "foreground": "#1d1d1d", "name": "Peacock"},
    "8": {"background": "#616161", "foreground": "#1d1d1d", "name": "Graphite"},
    "9": {"background": "#3F51B5", "foreground": "#1d1d1d", "name": "Blueberry"},
    "10": {"background": "#0B8043", "foreground": "#1d1d1d", "name": "Basil"},
    "11": {"background": "#D50000", "foreground": "#1d1d1d", "name": "Tomato"},
}
