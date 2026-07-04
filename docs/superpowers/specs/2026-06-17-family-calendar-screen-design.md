# Family Calendar Screen Design

## Goal

Add a dedicated family agenda page to the 7-inch Home Assistant display, using the selected hybrid layout: today gets a large primary card, the next six days are shown as compact cards in a 2x3 grid.

## Data Source

Home Assistant reads the public Google Calendar ICS feed through the Remote Calendar integration. The integration is configured in the Home Assistant UI, because Remote Calendar is added through a config flow. The calendar entity is `calendar.thuisagenda`.

The Home Assistant package exposes display-ready text sensors:

- `sensor.familie_agenda_d0_*` for today.
- `sensor.familie_agenda_d1_*` through `sensor.familie_agenda_d6_*` for the next six days.

Each day has a day label, date label, first event, second event, optional third event for today, and a more/count label.

## Layout

The page uses the existing display chrome:

- Left navigation rail stays visible.
- Top status bar stays visible.
- Main content area is `936x544` at `x: 88`, `y: 56`.

The agenda content is split into:

- Left card: `300x512`, highlighted with the agenda accent color. Shows "Vandaag", the date, event count, and up to three events.
- Right area: `600x512`, six cards in a `3x2` grid. Each card shows day/date and up to two events.

## Visual Direction

Use the existing dashboard language: black background, dark cards, Montserrat fonts, 8-18px radii, and high contrast text. The agenda accent is cyan (`0x34D0FF`), with event rows using subtle colored left bars:

- Primary event: cyan.
- Family/school/neutral rows: muted dark card surface.
- Extra/more row: muted text only.

## Behavior

Home Assistant refreshes the calendar sensors on start and every 15 minutes using `calendar.get_events` over a 7-day duration. ESPHome only mirrors the resulting text sensors and updates labels inside the existing 3-second interval update loop.

If no calendar data is available, labels show compact fallback text such as `geen afspraken`, `agenda laden`, or an empty string. Long event titles use LVGL `DOT` truncation.

## Constraints

- Do not parse ICS on the ESP32.
- Do not embed the Google Calendar iframe on the ESP32.
- Keep LVGL updates interval-driven, consistent with the existing file.
- Keep the change scoped to `home-assistant/ha-display-7-package.yaml` and `esphome/ha-display-7.yaml`.
- The Remote Calendar integration must expose the calendar as `calendar.thuisagenda`, or the package entity reference must be adjusted.
