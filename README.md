# Handoff: 7" Home Assistant Display Dashboard

## Overview
A custom ESPHome firmware + dashboard UI for a **1024 × 600 7" RGB touch display** (ESP32-S3 class board, e.g. *Waveshare ESP32-S3-Touch-LCD-7* or equivalent). The display sits on a desk/wall, pulls live entities from Home Assistant over the ESPHome API, and renders 6 swipeable touch screens in a dark, neon-accented design language inspired by modern energy-monitor products.

Goal of the implementation: produce a real, flashable ESPHome YAML config that drives this UI via LVGL, with all entities wired to the user's actual Home Assistant instance.

## About the Design Files
The files in `design/` are **HTML design references** — a React/JSX prototype rendered in the browser that demonstrates the intended look, layout, color system, typography, and interactions. They are **not** production code. The target runtime is **ESPHome + LVGL on an ESP32-S3**; the HTML prototype is the visual spec.

A working **starter ESPHome YAML** is included at `esphome/ha-display-7.yaml`. It is a structural reference — it compiles conceptually but pin assignments, the exact LVGL widget tree, and entity IDs must be adapted to the user's hardware and HA instance.

## Fidelity
**High-fidelity.** All colors, type, spacing, and ring/bar styles are final. Recreate the visual exactly using LVGL primitives (arcs, labels, bars, buttons). Where LVGL can't match a CSS effect (glass reflections, blur), drop them — the core metric/ring/bar style is what matters.

## Target Hardware
- **Display**: 7" RGB parallel, 1024 × 600 px, capacitive touch (GT911 or similar)
- **MCU**: ESP32-S3 with octal PSRAM (required for LVGL framebuffer at this resolution)
- **Reference boards**: Waveshare ESP32-S3-Touch-LCD-7, Elecrow CrowPanel 7" ESP32, or DIY ESP32-S3 + RGB display driver
- **Connectivity**: WiFi 2.4 GHz → Home Assistant via ESPHome native API

## Design Tokens

### Colors (dark theme, OLED-safe pure black background)
| Token | Hex | Usage |
|---|---|---|
| `--screen-bg` | `#000000` | Display background (pure black) |
| `--card` | `#0d0d10` | Card surface |
| `--card-2` | `#14141a` | Nested card / row surface |
| `--line` | `#1f1f26` | Borders, dividers |
| `--ink` | `#ffffff` | Primary text |
| `--ink-dim` | `#8a8a93` | Secondary text |
| `--ink-low` | `#4a4a52` | Tertiary text / entity IDs |
| `--accent-power` | `#8A4DFF` | Electricity / W (purple) |
| `--accent-water` | `#34D0FF` | Water / L (cyan) |
| `--accent-gas` | `#FF2A7A` | Gas / m³ (pink) |
| `--accent-solar` | `#2EE36A` | Solar yield (green) |
| `--accent-heat` | `#FF8A3A` | Heating / temperature (orange) |
| `--accent-cost` | `#FFD84A` | Cost / € (amber) |

Each ring uses its accent color at full strength for the active arc, and `${accent}22` (≈13% alpha) for the dim track.

### Typography
- **Primary**: Inter (substitute Roboto in LVGL — bundled fonts: `roboto_24`, `roboto_28_bold`, `roboto_36_bold`, `roboto_72_bold`)
- **Mono**: JetBrains Mono — used for entity IDs and time strings; substitute LVGL `montserrat_12` or any 10–12 px mono if not available
- **Numeric**: Always `font-variant-numeric: tabular-nums` (LVGL: use a font with monospaced digits)
- **Letter spacing**: −0.02 to −0.04 em on large numerics; +0.08 to +0.1 em uppercase on labels

### Spacing
- Outer screen padding: **22 px** vertical, **26 px** horizontal
- Card padding: **14–22 px**
- Card border radius: **18 px** (large cards), **10–14 px** (inner rows / buttons)
- Touch target minimum: **44 px** (LVGL `min_size`)

### Sizing per screen
- Total display: **1024 × 600**
- Left nav rail: **88 px** wide
- Top status bar: **56 px** tall
- Main content area: **936 × 544 px**

## Screens

### 1. Energy (default home screen)
Three-column layout:
- **Left (1.45fr)**: Big card with hero ring — current power draw (W), 250 px diameter, 18 px stroke. Inside the ring: live W value (76 px bold), unit "W" in accent color. Below the ring: today's grid import (purple ↓) and export (green ↑) in kWh.
- **Middle (1fr)**: Two stacked cards — water (cyan ring, 130 px, L value) and gas (pink ring, 130 px, m³ value), both with "VANDAAG" caption.
- **Right (0.9fr)**: Single card with 4 bar metrics stacked vertically: today's € cost, solar yield kWh, dynamic energy price €/kWh, indoor temperature. Each bar metric = icon + big tabular number + thin colored progress bar.

Entities used:
- `sensor.p1_active_power` (W)
- `sensor.p1_energy_import_today`, `sensor.p1_energy_export_today` (kWh)
- `sensor.solar_yield_today` (kWh)
- `sensor.water_meter_today` (L)
- `sensor.p1_gas_today` (m³)
- `sensor.energy_cost_today` (€)
- `sensor.nordpool_kwh_nl_eur` (or any dynamic-pricing integration)
- `sensor.living_room_temperature` (°C)

### 2. Climate
Two-column layout:
- **Left (1.2fr)**: Big thermostat dial — 260 px ring in orange, current setpoint in giant (86 px) numerics with smaller "°" suffix. Sub-line shows current indoor + outdoor temp. Two big −/+ buttons below the ring (56 × 56) call `climate.set_temperature`.
- **Right (1fr)**: Three stacked cards:
  - **Modus**: 4 mode tiles (Verwarm / Koel / Auto / Uit), active mode highlighted with its accent color. Calls `climate.set_hvac_mode`.
  - **Ventilatie**: Horizontal slider 0–100 %, cyan→green gradient fill. Calls `fan.set_percentage` or thermostat fan attribute.
  - **Kamers**: Scrollable list of rooms with temp + humidity. Color codes: temp > setpoint = orange, ≤ setpoint = cyan.

Entities used: `climate.living_room`, `climate.bedroom`, `climate.bathroom`, `climate.office`.

### 3. Lights
Two-column layout:
- **Left (1.8fr)**: Card titled "Verlichting" with a 2-column grid of light tiles. Each tile shows: colored icon swatch (lit up when on), name, entity ID (mono), toggle switch (top-right), brightness slider (bottom). The tile background fades to the bulb's accent color when on. "Alles uit" button in the header calls `light.turn_off` with `entity_id: all`.
- **Right (1fr)**: 2×2 grid of scene tiles (Film, Diner, Focus, Slapen). Active scene gets a glowing border + tinted background. Calls `scene.turn_on`.

Entities: `light.woonkamer_plafond`, `light.eettafel`, `light.keuken_spots`, `light.hal`, `light.werkkamer`, `light.tuin`, plus `scene.movie`, `scene.dinner`, `scene.focus`, `scene.sleep`.

### 4. Spotify (Media player)
Two-column layout:
- **Left (320 px fixed)**: Album-art card. The HTML prototype uses a procedural gradient placeholder because real album art needs an HTTP-fetched image. On ESPHome, fetch the art via `online_image:` (URL = `media_player.spotify_woonkamer` `entity_picture` attribute) and render with LVGL `image:`. Below the art: "Speelt af op · Woonkamer · Sonos" line.
- **Right (1fr)**: Title (38 px bold), artist (18 px dim), entity ID (mono), progress bar with elapsed / remaining timestamps, transport row (shuffle / prev / **PLAY** big white circle 72 px / next / repeat), volume slider (green fill).

Calls: `media_player.media_play_pause`, `media_player.media_next_track`, `media_player.media_previous_track`, `media_player.volume_set`, `media_player.shuffle_set`.

### 5. Camera
Two-column layout:
- **Left (1fr)**: Large camera feed (the full card). HUD overlays at top corners (LIVE · REC pill, resolution chip) and bottom corners (camera name + entity ID, mic + fullscreen buttons). Red recording dot top-right.
- **Right (280 px fixed)**: Scrollable camera list. Each row = 64×40 thumbnail + name + location + status dot. Below the list: motion-detected alert card (pink-tinted) showing the latest event.

For ESPHome: camera feeds are tricky over LVGL. Recommended approach is a periodic snapshot — use `online_image:` with the HA camera proxy URL (`/api/camera_proxy/camera.voordeur`), refresh every 2–5 seconds. Don't attempt true MJPEG video.

### 6. Weather
Two-column layout:
- **Left (1.1fr)**: "Now" card — location title + entity ID, large sun/cloud/rain icon (96 px) next to a giant 96 px temperature, then condition + "feels like". Bottom: 3-up grid of precip / wind / humidity stats.
- **Right (1fr)**: Two stacked cards — hourly (6 columns: time + icon + temp) and 5-day (day + icon + colored temp range bar + high/low). Range bar gradient: water→heat (cyan→orange).

Entity: `weather.knmi_amsterdam` with its standard `forecast` attribute.

## Status Bar (persistent, top)
- **Left**: 24 px bold clock (`HH:MM`) + dim Dutch date ("dinsdag 20 mei")
- **Right**: Outdoor temp chip · live W chip · "HA" connection dot (green = connected)

## Side Nav (persistent, left)
- **88 px wide**, dark `#060608` background
- Top: app logo (44 × 44 rounded purple square with "H")
- 6 nav buttons (Energie / Klimaat / Licht / Muziek / Camera / Weer), 56 × 56 each
- Active state: tinted background + 3 × 28 px colored accent strip on left edge
- Bottom: small "ESP32-S3" vertical mono label + settings button (opens YAML view in prototype; on device this can be a reboot/info screen)

## Interactions & Behavior
- **Touch**: every interactive surface ≥ 44 × 44 px
- **Page nav**: tap a side-nav icon → `lvgl.page.show: page_<name>`. Optional: swipe left/right between pages
- **Slider drag**: thermostat setpoint, fan speed, light brightness, volume — all call HA services on release (debounce updates to avoid flooding the API)
- **Toggle**: lights and modes use `homeassistant.service:` actions
- **Backlight auto-dim**: 22:00–07:00 → 20 % brightness, else 90 %. See `interval:` block in the starter YAML
- **Live updates**: every value comes from a `homeassistant:` sensor — LVGL labels bind via `text: !lambda 'return id(...).state'` and refresh on `on_value:` triggers

## State Management
- All state lives in Home Assistant. The ESP only mirrors it.
- For optimistic UI on slider drags, set the LVGL widget value locally first, then call the HA service. Re-sync from the HA sensor when it pushes back.

## Implementation Plan (suggested order for Claude Code)

1. **Bring up the display**
   Get ESPHome compiling for the target board with `display:` + `touchscreen:` + a simple LVGL "hello world". This is the highest-risk step — pin assignments, RGB timing, PSRAM config all need to match your board exactly. Reference the board's vendor example before anything else.

2. **Status bar + side nav scaffold**
   Build the persistent chrome first (top status bar, left rail). All pages render inside the remaining 936 × 544 area.

3. **Energy screen (page 1)**
   This proves the LVGL `arc` widget styling + `homeassistant:` sensor binding pattern. Once one ring updates live from `sensor.p1_active_power`, the rest of the screens follow the same pattern.

4. **Climate screen**
   First write path — slider drag calls `homeassistant.service: climate.set_temperature`.

5. **Lights screen**
   Toggle + slider patterns repeated across 6 entities. Consider a `lvgl.widget_update` lambda per light to keep tile color in sync.

6. **Media + Camera + Weather**
   Media needs `online_image:` for album art. Camera needs the camera-proxy snapshot pattern. Weather needs the `weather.*` `forecast` attribute parsed from the HA attribute.

7. **Polish**
   Backlight schedule, auto-page-on on touch wake, screen-saver fade, OTA flow.

## Files in this bundle
- `design/index.html` + `design/*.jsx` — runnable HTML prototype. Open `index.html` in a browser to interact with all 6 screens.
- `esphome/ha-display-7.yaml` — starter ESPHome config with all sensor bindings + a partial LVGL page tree (Energy, Climate, Lights, Spotify, Camera). Use as a structural reference, not a drop-in.

## Things the user still needs to supply
- **Their real entity IDs** (the YAML uses placeholder names like `sensor.p1_active_power` — replace with whatever their HA actually has)
- **The exact board model** so pin assignments in the `display:` and `touchscreen:` blocks can be filled in (Waveshare / Elecrow / DIY)
- **WiFi + API secrets** via `secrets.yaml`
- **HA API encryption key** (generated in HA → Settings → Devices & Services → ESPHome integration)

## Assets
None bundled. The design uses no external images — all visuals are CSS/SVG primitives. Icons in the prototype are hand-drawn inline SVG (lucide-style line icons); for LVGL, use its built-in symbol font or `lvgl/icons/` font subsets.
