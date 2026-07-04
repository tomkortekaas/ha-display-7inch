# Immich Photoframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Immich page into a fullscreen photo-frame with prepared images, previous/next controls, zoom toggle, and guarded trash action.

**Architecture:** Home Assistant prepares display-ready JPEGs and publishes URL/metadata sensors. ESPHome only displays the prepared image and sends touch actions back to Home Assistant shell commands.

**Tech Stack:** ESPHome LVGL, `jtenniswood/espcontrol` `artwork_image`, Home Assistant `shell_command`, Python 3 + Pillow, Immich API.

---

### Task 1: Immich Helper

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/home-assistant/immich_rotate_7inch.py`

- [ ] Add CLI actions: `next`, `prev`, `zoom`, `trash`, `confirm-trash`.
- [ ] Keep small state in `/homeassistant/www/immich/state.json`.
- [ ] Render `/homeassistant/www/immich/current.jpg` as 1024x600.
- [ ] Use landscape cover by default and portrait contain by default.
- [ ] Publish `sensor.immich_photo_url`, `sensor.immich_place`, `sensor.immich_date`, `sensor.immich_album`, `sensor.immich_status`.
- [ ] Trash requires `trash` then `confirm-trash` within 5 seconds.

### Task 2: Home Assistant Commands

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/home-assistant/ha-display-7-add-to-configuration.yaml`
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/home-assistant/configuration-ha-display-7-full.yaml`

- [ ] Add shell commands for Immich next, previous, zoom, trash, and confirm trash.
- [ ] Keep the existing periodic rotation command.

### Task 3: ESPHome Fullscreen Page

**Files:**
- Modify: `/Users/tomkortekaas/Documents/AI APP/ha_display_7inch/esphome/ha-display-7.yaml`

- [ ] Point Immich image loading at `sensor.immich_photo_url`.
- [ ] Resize image to 1024x600 with `FIT`; the helper already prepares the exact canvas.
- [ ] Move Immich page content to x=0, y=0, width=1024, height=600.
- [ ] Remove visible top/bottom overlays from the photo page.
- [ ] Add invisible touch zones: left previous, right next, center zoom, top-right trash, second tap confirm.

### Task 4: Verification

- [ ] Run Python syntax check.
- [ ] Run ESPHome config validation.
- [ ] Run ESPHome compile.
- [ ] Do not flash while the screen is off unless the user asks.
