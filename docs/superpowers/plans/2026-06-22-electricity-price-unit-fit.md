# Electricity Price Unit Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep three electricity-price decimals visible while fitting the `/kWh` unit inside the metric card.

**Architecture:** Replace the single wide price label with a centered horizontal LVGL container. The dynamic price remains a 36 px label and the static unit becomes a separate 16 px label.

**Tech Stack:** ESPHome YAML, LVGL, shell assertions, ESPHome CLI, OTA.

## Global Constraints

- Keep three decimals in the dynamic price.
- Use `font_roboto_36` for the price and `font_roboto_16` for `/kWh`.
- Preserve the existing yellow styling, price bar, sensor and surrounding layout.
- Display `--` when the price sensor is unavailable.

---

### Task 1: Split price and unit labels

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: `ha_stroomprijs`.
- Produces: dynamic `lbl_stroomprijs` and static `lbl_stroomprijs_unit`.

- [ ] Run a structural assertion requiring a horizontal centered container and separate unit label; confirm it fails.
- [ ] Replace the single price label with a transparent 244 px horizontal flex container containing both labels.
- [ ] Change the periodic formatter from `€ %.3f/kWh` to `€ %.3f`, retaining three decimals.
- [ ] Re-run the structural assertion and require success.

### Task 2: Validate and deploy

**Files:**
- Verify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: updated ESPHome configuration.
- Produces: running firmware on `ha-display-7.local`.

- [ ] Validate the complete ESPHome configuration.
- [ ] Compile using `ESPHOME_BUILD_PATH=/tmp/esphome-build`.
- [ ] Upload the resulting firmware via OTA.
- [ ] Confirm ESPHome API port 6053 returns after reboot.
