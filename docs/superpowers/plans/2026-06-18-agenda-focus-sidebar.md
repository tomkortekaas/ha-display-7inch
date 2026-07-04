# Agenda Focus + Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seven-column ESPHome agenda with the approved Focus + Sidebar view and flash it to the connected display over USB.

**Architecture:** Keep the existing Home Assistant calendar sensors and the 88 px navigation rail. Replace only the agenda page widgets and its interval-driven refresh lambda with fixed slots for five events today and two events on each of the next three days.

**Tech Stack:** ESPHome 2026.x, ESP-IDF, LVGL, YAML, C++ lambdas, USB serial upload.

## Global Constraints

- Preserve the existing `x: 88`, `y: 56`, `936x544` agenda canvas.
- Preserve all unrelated working-tree changes.
- Keep agenda updates inside the existing three-second interval.
- Reuse `agenda_d0_*` through `agenda_d3_*`; do not add Home Assistant entities.
- Validate and compile before uploading to `/dev/cu.usbmodem21201`.

---

### Task 1: Add a static agenda-layout regression check

**Files:**
- Create: `/tmp/check_agenda_focus_sidebar.py`
- Test: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: ESPHome YAML text.
- Produces: non-zero exit until the new widget IDs and old grid-ID removal are present.

- [ ] Write checks for `lbl_agenda_range`, `agenda_today_slot_1`, `agenda_future_d3_slot_2`, `agenda_now_indicator`, and absence of `agenda_d6_block_8`.
- [ ] Run the check and confirm it fails against the old seven-column implementation.

### Task 2: Replace the agenda page

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing agenda text sensors and Montserrat font declarations.
- Produces: fixed LVGL IDs for the topbar, today event slots, current-time indicator, and three future-day sections.

- [ ] Add the small Montserrat font sizes required by the handoff.
- [ ] Replace `page_agenda` content while preserving its page ID and outer coordinates.
- [ ] Run the static check and confirm the structural checks pass.

### Task 3: Replace agenda refresh logic

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: `agenda_d0_*` through `agenda_d3_*` and `ha_time`.
- Produces: parsed labels, colors, visibility, opacity, counts, and dynamic current-time placement.

- [ ] Replace the old `update_block` lambda and all seven-day block updates.
- [ ] Parse timed and all-day events, infer person color/chip, and safely truncate through LVGL.
- [ ] Update topbar range, day headers, empty states, and more-count labels.
- [ ] Run the static check and YAML diff checks.

### Task 4: Validate, compile, and flash

**Files:**
- Validate: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: final ESPHome configuration.
- Produces: compiled firmware installed on the USB-connected Guition display.

- [ ] Run `esphome config esphome/ha-display-7.yaml`.
- [ ] Run `esphome compile esphome/ha-display-7.yaml`.
- [ ] Upload with `esphome upload esphome/ha-display-7.yaml --device /dev/cu.usbmodem21201`.
- [ ] Confirm the upload command exits successfully and report any reboot/serial result.
