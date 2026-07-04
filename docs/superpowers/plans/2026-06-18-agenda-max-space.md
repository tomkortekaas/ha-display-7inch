# Agenda Max Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge agenda typography, remove the topbar metadata, show three events per future day, and flash the refined firmware over USB.

**Architecture:** Keep the existing Focus + Sidebar widget IDs and data pipeline, but reclaim the full `936×544` canvas by moving the title into the today panel. Extend each future-day section with a third fixed slot and update the shared C++ lambda from two to three future events.

**Tech Stack:** ESPHome 2026.5.3, ESP-IDF, LVGL, YAML, C++ lambdas, USB serial.

## Global Constraints

- Preserve the navigation rail and `936×544` agenda canvas.
- Preserve unrelated local changes.
- Keep five slots for today.
- Show three slots for each of days 1–3.
- Remove visible range, clock, and live dot.
- Upload through `/dev/cu.usbmodem21201`.

---

### Task 1: Define the refinement structurally

**Files:**
- Create: `/tmp/check_agenda_max_space.py`
- Test: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: agenda YAML.
- Produces: a failing check until all three future-day slot IDs exist and the old topbar is hidden.

- [ ] Assert `agenda_future_d1_slot_3`, `agenda_future_d2_slot_3`, and `agenda_future_d3_slot_3` exist.
- [ ] Assert the max-space marker and larger agenda fonts exist.
- [ ] Run the check and confirm failure before implementation.

### Task 2: Reflow and enlarge the LVGL agenda

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing agenda widgets.
- Produces: title-inside-left-panel layout, larger typography, five large today rows, and three future rows per day.

- [ ] Add 12, 14, and 16 px Montserrat agenda fonts.
- [ ] Hide the obsolete topbar range, clock, dot, and divider.
- [ ] Move `FAMILIE AGENDA`, `Vandaag`, and today’s date into the top-left content area.
- [ ] Expand and reposition today rows.
- [ ] Reposition three equally sized future-day sections and add a third slot to each.

### Task 3: Extend future-day refresh logic

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: `agenda_d1_event_3`, `agenda_d2_event_3`, and `agenda_d3_event_3`.
- Produces: three rendered events and `+N meer` based on `total - 3`.

- [ ] Change the future-day helper from two events/slots to three.
- [ ] Pass the third event and third widget set for all three days.
- [ ] Keep empty-state and person-color behavior unchanged.

### Task 4: Verify and flash

**Files:**
- Validate: `esphome/ha-display-7.yaml`

**Interfaces:**
- Produces: verified firmware installed on the connected display.

- [ ] Run the structure check and `git diff --check`.
- [ ] Run ESPHome config validation.
- [ ] Compile in a temporary path without spaces.
- [ ] Upload via `/dev/cu.usbmodem21201`.
- [ ] Confirm boot and Wi-Fi connection in the serial log.
