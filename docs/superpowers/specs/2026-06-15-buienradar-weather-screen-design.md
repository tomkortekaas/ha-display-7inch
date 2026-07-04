# Buienradar Weather Screen Design

## Goal

Update the ESPHome/LVGL weather screen so Buienradar is available as a moving Netherlands rain radar for the next two hours, while keeping most of the screen available for weather details.

## Layout

Use the selected compact radar layout:

- Left/main area: about two thirds of the content width.
- Right radar column: about one third of the content width, full content height.
- The radar card must show a Netherlands rain map large enough to read from the display distance.
- The current weather card keeps temperature, condition, wind, UV, rain caption, and sun/daylight information.
- The forecast area remains available in the main area, but may be compacted to fit the new two-third width.

## Data Flow

Home Assistant prepares or proxies radar frames as local files under:

`/local/ha-display-radar/radar_0.jpg` through `/local/ha-display-radar/radar_8.jpg`

ESPHome loads these files through `artwork_image` using the already detected HA base URL. The display advances frames automatically to create the moving two-hour rain radar effect.

## ESPHome Behavior

- Use the existing `artwork_image` + `lvgl.image.update` pattern.
- Cache-bust frame URLs with a query string.
- Advance the radar frame on an interval while the device is running.
- Keep the last successful frame visible if a download fails.
- Show a small status label for the radar frame time, such as `radar +30 min`, or `radar laden`.

## Home Assistant Behavior

Home Assistant remains the integration point for Buienradar. The package documents the expected local radar files and keeps the existing Buienradar rain-data sensors for captions.

## Verification

- Validate the edited YAML syntax with a parser.
- Run ESPHome config/compile validation where the local toolchain allows.
- Use Home Assistant MCP to confirm existing weather and Buienradar rain-data entities.
- Flash the ESPHome YAML if compile succeeds and a reachable device/upload path is available.
