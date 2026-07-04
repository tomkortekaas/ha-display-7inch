# Buienradar Weather Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact Buienradar radar column to the weather screen and load moving two-hour radar frames from Home Assistant local files.

**Architecture:** Home Assistant owns radar acquisition/proxying and exposes local JPG frames. ESPHome uses the existing `artwork_image` external component to load one frame at a time and updates an LVGL image widget in a right-hand radar card.

**Tech Stack:** ESPHome YAML, LVGL widgets, Home Assistant template/package YAML, Home Assistant MCP, `artwork_image`.

---

### Task 1: Confirm Home Assistant Inputs

**Files:**
- Read: live Home Assistant entities through MCP

- [x] Check existing entities with MCP:
  `sensor.neerslag_buienradar_regen_data`, `sensor.weerscherm_regen_caption`, `weather.forecast_thuis`, and `sensor.weerstation_temperature`.

- [x] Record that `camera.buienradar` is not currently present, so local radar frame files are the integration contract.

### Task 2: Add Radar Image Plumbing

**Files:**
- Modify: `esphome/ha-display-7.yaml`

- [ ] Add radar globals:
  `radar_frame_index`, `radar_art_retry_count`, and `radar_last_frame_label`.

- [ ] Add an `artwork_image` resource `radar_art` with `resize: 296x512`, `resize_mode: FIT`, RGB565, little endian, and local URL support.

- [ ] Add scripts:
  `radar_frame_load`, `radar_frame_apply`, and `radar_frame_retry`.

### Task 3: Rework Weather Page Layout

**Files:**
- Modify: `esphome/ha-display-7.yaml`

- [ ] Change `page_weather` to a 2-column layout: `608 px` main column and `296 px` radar column inside the existing 936 px content area.

- [ ] Keep a compact current-weather card in the main column.

- [ ] Keep a compact forecast/daylight card in the main column.

- [ ] Add a full-height radar card with title, image, status label, and progress bar.

### Task 4: Update Interval Refresh

**Files:**
- Modify: `esphome/ha-display-7.yaml`

- [ ] In the existing update interval, continue updating weather labels.

- [ ] Add radar frame advancement every cycle or every few cycles using `radar_frame_load`.

- [ ] Make retry behavior preserve the last visible frame.

### Task 5: Home Assistant Package Documentation

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`

- [ ] Add comments documenting that `/config/www/ha-display-radar/radar_0.jpg` through `radar_8.jpg` must exist.

- [ ] Keep existing Buienradar rain-data caption sensors unchanged.

### Task 6: Verify and Flash

**Files:**
- Validate: `esphome/ha-display-7.yaml`
- Validate: `home-assistant/ha-display-7-package.yaml`

- [ ] Parse YAML with a local parser.

- [ ] Run ESPHome validation/compile command if available.

- [ ] Flash with ESPHome upload if validation succeeds and the device is reachable.
