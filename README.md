# Google Calendar Card for Home Assistant

A modern Home Assistant Lovelace card for Google Calendar with full support for Google's individual per-event `colorId` parameter, multi-view layout, native `<ha-form>` visual configuration, and GUI integration setup.

![Google Calendar Card](https://raw.githubusercontent.com/jonas/ha-google-calendar/main/preview.png)

---

## Highlights

- **Per-Event Colors (`colorId`)**: Supports all 11 official Google Calendar event colors (Lavender, Sage, Grape, Flamingo, Banana, Tangerine, Peacock, Graphite, Blueberry, Basil, Tomato) individually per event, instead of a single uniform color for the entire calendar.
- **Accessible WCAG Contrast**: Automatically computes text contrast based on color luminance, ensuring dark text on light backgrounds (e.g. Banana) and crisp white text on deep backgrounds.
- **4 Rich Calendar Views**:
  - **Agenda / List**: Chronological timeline grouped by date with badges, times, relative status ("In 30m", "NOW"), location, and description.
  - **Month Grid**: Traditional calendar grid with colored event chips and overflow counters.
  - **Week Columns**: 7-day column overview.
  - **Day Timeline**: Hourly breakdown of events and all-day banner.
- **3 Color Display Styles**:
  - `pill`: Rounded colored badge pill beside the event time.
  - `border`: Colored vertical accent border on the left side of the event card.
  - `full`: Full colored background with computed high-contrast text.
- **Default Home Assistant Style Visual Editor**: Configuration editor built using native `<ha-form>` and Home Assistant schema selectors (`entity`, `select`, `number`, `boolean`).
- **GUI Integration Setup**: The companion integration can be added directly via **Settings -> Devices & Services -> Add Integration -> Google Calendar Card Helper**.
- **Direct API & OAuth**: Works seamlessly via Home Assistant's built-in Google integration or directly with Google Calendar API Key for public/shared calendars.

---

## Installation

### Method 1: HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Go to **Frontend** -> Click the three dots in top right -> **Custom repositories**.
3. Add repository `https://github.com/jonas/ha-google-calendar` with category `Lovelace`.
4. Click **Download**.

### Method 2: Manual Installation

1. Copy `dist/google-calendar-card.js` into your Home Assistant `<config>/www/` directory.
2. In Home Assistant, go to **Settings** -> **Dashboards** -> **Three dots (top right)** -> **Resources**.
3. Add `/local/google-calendar-card.js` as a **JavaScript Module**.
4. Copy `custom_components/google_calendar_card` into your Home Assistant `<config>/custom_components/` directory.
5. Restart Home Assistant.

---

## Integration Setup (GUI & YAML)

### Option A: Via GUI (Recommended)
1. In Home Assistant, navigate to **Settings** -> **Devices & Services**.
2. Click **Add Integration** in the bottom right.
3. Search for **Google Calendar Card Helper** and select it.
4. Follow the setup prompt to enable the companion integration.

### Option B: Via YAML
Add the following line to your `configuration.yaml`:

```yaml
google_calendar_card:
```

---

## Card Configuration

### Using the Visual Card Editor
Add a card to your dashboard and choose **Google Calendar Card** from the picker. The editor uses Home Assistant's native styling:
- **Title**: Optional custom card title.
- **Calendar Entities**: Multi-select dropdown for any calendar entity (`calendar.*`).
- **Default View**: `agenda`, `month`, `week`, or `day`.
- **Event Color Style**: `pill`, `border`, or `full`.
- **Days to Show**: Number of days ahead to display in Agenda view.
- **Toggles**: Show all-day events, past events today, location, description, and navigation header.

### Using YAML
```yaml
type: custom:google-calendar-card
title: My Schedule
entities:
  - calendar.personal
  - calendar.work
default_view: agenda
color_style: pill
days_to_show: 14
show_all_day: true
show_location: true
show_description: true
show_header: true
refresh_interval: 15
```

### Custom Color Overrides
You can customize or override Google's color palette or assign a default fallback color:
```yaml
type: custom:google-calendar-card
entities:
  - calendar.personal
colors:
  "1": "#8A99EB"  # Custom override for Google colorId 1 (Lavender)
  "11": "#FF3B30" # Custom override for Google colorId 11 (Tomato)
  default: "#4285F4"
```

---

## Local Development & Testing

This repository includes a standalone Home Assistant container setup for testing:

```bash
# Install dependencies
npm install

# Run unit tests (bundle, API, color contrast, and view renderers)
npm test

# Build bundle
npm run build

# Start local Home Assistant container with pre-configured dashboard
./scripts/run-ha.sh
# Open http://localhost:8123
```

To stop the development environment:
```bash
docker compose down
```

---

## License

MIT © Jonas
