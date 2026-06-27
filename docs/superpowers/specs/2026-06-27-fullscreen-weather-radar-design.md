# Fullscreen Weather Radar Design

## Goal

Optimize the 7-inch ESPHome/LVGL weather page for true fullscreen use. The page should use the full 1024x600 display instead of reserving space for the persistent top status bar and left navigation rail. The larger canvas should make the Buienradar map easier to read, improve its aspect ratio, enlarge the sunrise/daylight information and forecast range bars, and make the radar animation feel faster.

## Source Design Intent

Use the original 7-inch design files as the visual reference:

- `design/app.jsx`
- `design/shared.jsx`
- `design/screens-weather.jsx`

The implementation should preserve the original design language: black background, clear dark cards, large current-weather hierarchy, vivid accent colors, compact but readable forecast rows, and simple metric chips. Weather-specific accents should follow the existing palette: water blue for radar/rain, solar green/yellow for sun/daylight, heat orange for warm forecast values, and neutral gray for secondary text.

## Layout

Use a radar-first fullscreen layout:

- Root `page_weather` hides the top status bar when active and uses a 1024x600 content area.
- The page keeps the invisible edge/tap behavior for navigation access, but no permanent nav or topbar space is reserved.
- A large Buienradar card sits on the left side and receives the most visual weight.
- The radar image should be substantially wider than the current 268x402 image and use a map-friendly aspect ratio so the Netherlands map does not feel tall and narrow.
- A right column contains the current-weather card and a larger sun/daylight card.
- The bottom area contains five forecast rows with larger temperature range bars than the current compact layout.

Target dimensions may be adjusted slightly during implementation to fit LVGL constraints, but the intended allocation is:

- Radar card: approximately 620x465 image area, with title, frame label, and progress bar.
- Current weather card: approximately 356x285, with a large icon, large temperature, condition, wind, UV, rain, and humidity/feels-like where available.
- Sun/daylight card: approximately 356x145, with sunrise, sunset, caption, and a thick daylight progress bar.
- Forecast card: full-width lower band or left-lower band with five rows, larger icons, labels, wind values, and longer range bars.

## Behavior

- Radar frames remain loaded through the existing `artwork_image` and `lvgl.image.update` pattern.
- The animation interval changes from 15 seconds per frame to about 6 seconds per frame.
- The frame label remains visible, e.g. `radar nu` and `radar +30 min`.
- The progress bar remains tied to the current frame index.
- Failed radar downloads should keep the last successful frame visible and show `radar offline` after retries.
- Entering the weather page starts or refreshes the radar frame load and hides the global top status bar.
- Leaving the weather page restores the top status bar through existing navigation behavior.

## Data Flow

Home Assistant continues to provide weather entities and radar image files. ESPHome continues to consume:

- `/local/ha-display-radar/radar_0.jpg` through `/local/ha-display-radar/radar_8.jpg`
- Current weather from `weather.forecast_thuis`
- Weather station values from `sensor.weerstation_*`
- Forecast values from `sensor.weerscherm_d*_hi`, `sensor.weerscherm_d*_lo`, `sensor.weerscherm_d*_wind`, and `sensor.weerscherm_d*_cond`
- Sunrise/daylight values from `sensor.weerscherm_zon_op`, `sensor.weerscherm_zon_onder`, `sensor.weerscherm_daglicht_pct`, and `sensor.weerscherm_daglicht_caption`

No new Home Assistant entities are required for this layout update.

## Testing

- Parse the ESPHome YAML after editing.
- Run `esphome config` against the working YAML with the local secrets copy.
- Compile if the config step succeeds.
- If compile succeeds and the device is reachable, upload to the 7-inch display.

## Out Of Scope

- Rebuilding the Home Assistant radar frame generator.
- Changing the radar file contract.
- Adding touch controls to scrub the radar timeline.
- Redesigning other display pages.
