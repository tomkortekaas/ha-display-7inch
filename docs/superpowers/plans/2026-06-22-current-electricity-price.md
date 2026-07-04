# Current Electricity Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicate current-consumption metric with the live electricity price and deploy the ESPHome firmware over OTA.

**Architecture:** Import `sensor.stroomprijs_huidige_prijs` as an internal ESPHome Home Assistant sensor. Reuse the existing second metric slot in the right energy column and update its label and progress bar from the existing periodic LVGL refresh.

**Tech Stack:** ESPHome YAML, Home Assistant native API, LVGL, shell assertions, ESPHome CLI.

## Global Constraints

- Display the price as `€ 0,040/kWh` with three decimals.
- Use a visual bar range of €0.00–€0.50/kWh.
- Clamp only the bar; always show the actual sensor value.
- Show `-- €/kWh` when unavailable.
- Do not change other metrics, layout, or navigation.

---

### Task 1: Add the live electricity price metric

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: Home Assistant entity `sensor.stroomprijs_huidige_prijs`, numeric state in EUR/kWh.
- Produces: ESPHome sensor ID `ha_stroomprijs`, LVGL label `lbl_stroomprijs`, and bar `bar_stroomprijs`.

- [ ] **Step 1: Run a failing structural assertion**

Run a shell assertion that requires the HA entity, `STROOMPRIJS` caption, price label, price bar, unavailable fallback, and €0.50 scale. It must fail before implementation.

- [ ] **Step 2: Add the Home Assistant sensor**

Add an internal sensor with ID `ha_stroomprijs` and entity ID `sensor.stroomprijs_huidige_prijs`.

- [ ] **Step 3: Replace the duplicate metric widgets**

Rename the second right-column metric and its IDs, use yellow styling, and initialize it with `-- €/kWh`.

- [ ] **Step 4: Replace the periodic LVGL updates**

Format the value as `€ %.3f/kWh`. Return `-- €/kWh` for NaN. Set the bar to `clamp(price / 0.50 * 100, 0, 100)`.

- [ ] **Step 5: Run the structural assertion**

Re-run the exact assertion from Step 1 and require exit code 0.

### Task 2: Validate, compile, and deploy

**Files:**
- Verify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: completed ESPHome configuration.
- Produces: validated firmware installed on the configured ESPHome node.

- [ ] **Step 1: Validate the complete configuration**

Run `esphome config esphome/ha-display-7.yaml` and require exit code 0.

- [ ] **Step 2: Compile the firmware**

Run `esphome compile esphome/ha-display-7.yaml` and require exit code 0.

- [ ] **Step 3: Upload over OTA**

Run `esphome upload esphome/ha-display-7.yaml --device <resolved-node-address>` and require an upload-success result.

- [ ] **Step 4: Review the final diff**

Confirm only the intended energy sensor, metric widget, and periodic updates were changed by this feature.
