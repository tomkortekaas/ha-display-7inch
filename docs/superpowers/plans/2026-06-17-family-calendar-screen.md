# Family Calendar Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated 7-day family agenda page to the existing ESPHome/LVGL display.

**Architecture:** Home Assistant owns calendar fetching and formatting using `calendar.get_events`; ESPHome receives display-ready text sensors and renders them as labels. The display page follows the selected hybrid design: today large, next six days compact.

**Tech Stack:** Home Assistant packages YAML, Remote Calendar integration, Calendar action `calendar.get_events`, ESPHome, LVGL.

## Global Constraints

- Do not parse ICS on the ESP32.
- Do not embed the Google Calendar iframe on the ESP32.
- Keep LVGL updates interval-driven, consistent with the existing file.
- Keep the agenda page within the existing `936x544` content area.
- The expected Home Assistant calendar entity is `calendar.thuisagenda`.

---

## File Structure

- Modify `home-assistant/ha-display-7-package.yaml`: add a template trigger block that calls `calendar.get_events` and exposes day/event sensors.
- Modify `esphome/ha-display-7.yaml`: add agenda text sensors, a nav button, the `page_agenda` LVGL page, and interval label updates.

### Task 1: Home Assistant Agenda Sensors

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`

**Interfaces:**
- Consumes: `calendar.thuisagenda`
- Produces: `sensor.familie_agenda_d0_title`, `sensor.familie_agenda_d0_date`, `sensor.familie_agenda_d0_count`, `sensor.familie_agenda_d0_event_1`, `sensor.familie_agenda_d0_event_2`, `sensor.familie_agenda_d0_event_3`, `sensor.familie_agenda_d0_more`, plus matching `d1` through `d6` sensors with two event rows.

- [ ] Add one triggered template block that fetches 7 days of events using `calendar.get_events`.
- [ ] Build per-day labels using Jinja templates.
- [ ] Run a YAML syntax check.

### Task 2: ESPHome Text Sensor Bindings

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: Home Assistant sensors from Task 1.
- Produces: ESPHome text sensor IDs `agenda_d0_title`, `agenda_d0_date`, `agenda_d0_count`, `agenda_d0_event_1`, and so on.

- [ ] Add Home Assistant text sensors for the agenda labels.
- [ ] Keep all sensors `internal: true`.
- [ ] Run a YAML syntax check.

### Task 3: LVGL Agenda Page And Navigation

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: ESPHome text sensor IDs from Task 2.
- Produces: `page_agenda`, `nav_agenda`, `nav_strip_agenda`, and labels prefixed `lbl_agenda_`.

- [ ] Add an Agenda nav button below Weather.
- [ ] Add `page_agenda` before Immich.
- [ ] Add label updates inside the existing 3-second interval block.
- [ ] Run an ESPHome config validation if the local tool is available.
