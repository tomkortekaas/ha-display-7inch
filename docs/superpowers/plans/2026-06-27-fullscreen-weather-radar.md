# Fullscreen Weather Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 7-inch weather page a true fullscreen radar-first layout with larger Buienradar, larger sun/daylight and forecast bars, and faster radar animation.

**Architecture:** Keep the existing single-file ESPHome/LVGL implementation and existing Home Assistant data contract. Rework only `page_weather`, weather navigation entry behavior, and the radar animation interval. Preserve existing widget IDs so the current update lambda keeps feeding labels, bars, and image widgets.

**Tech Stack:** ESPHome YAML, LVGL widgets, `artwork_image`, Home Assistant weather/radar entities.

## Global Constraints

- Use the full 1024x600 page for weather instead of reserving 88px nav and 56px topbar space.
- Preserve the original 7-inch design language from `design/app.jsx`, `design/shared.jsx`, and `design/screens-weather.jsx`.
- Keep the existing radar file contract: `/local/ha-display-radar/radar_0.jpg` through `/local/ha-display-radar/radar_8.jpg`.
- Do not add new Home Assistant entities.
- Keep existing widget IDs that are referenced by the weather update lambda.
- Change radar animation from 15 seconds per frame to about 6 seconds per frame.

---

## File Structure

- Modify `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`: weather page layout, weather navigation behavior, radar interval.
- Test `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`: YAML parse, ESPHome config, compile if config succeeds.

---

### Task 1: Preserve Current Weather Contract

**Files:**
- Read: `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing widget IDs under `page_weather`.
- Produces: exact list of widget IDs that Task 2 must preserve.

- [ ] **Step 1: Confirm update lambda target IDs**

Run:

```bash
rg -n "lbl_wx_|bar_wx_|img_buienradar|lbl_radar_frame|bar_radar_progress" "/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml"
```

Expected: output includes `lbl_wx_now_icon`, `lbl_wx_now_temp`, `lbl_wx_now_cond`, `lbl_wx_wind`, `lbl_wx_uv`, `bar_wx_uv`, `lbl_wx_rain`, `lbl_wx_sun`, `bar_wx_sun`, all `lbl_wx_d*_...` labels, all `bar_wx_d*_range` bars, `img_buienradar`, `lbl_radar_frame`, and `bar_radar_progress`.

- [ ] **Step 2: Confirm topbar behavior is script-driven outside weather**

Run:

```bash
rg -n "lvgl.page.show: page_weather|top_status_bar|weather_page_active" "/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml"
```

Expected: weather navigation currently shows `top_status_bar`; other pages show the status bar or hide it explicitly.

---

### Task 2: Rebuild `page_weather` As Fullscreen Layout

**Files:**
- Modify: `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: target widget IDs from Task 1.
- Produces: same widget IDs in a new fullscreen layout.

- [ ] **Step 1: Replace the current `page_weather` block**

Replace the current `page_weather` object that starts at `- id: page_weather` and ends before `# PAGINA 5: AGENDA` with a fullscreen root:

```yaml
    - id: page_weather
      bg_color: 0x000000
      bg_opa: COVER
      scrollable: false
      widgets:
        - obj:
            x: 0
            y: 0
            width: 1024
            height: 600
            bg_color: 0x000000
            bg_opa: COVER
            border_width: 0
            pad_all: 16
            scrollable: false
            layout:
              type: FLEX
              flex_flow: ROW
              flex_align_main: START
              flex_align_cross: START
              pad_column: 16
            widgets:
```

- [ ] **Step 2: Add left column with large radar and forecast cards**

Under the fullscreen root, create a left column `width: 632`, `height: 568`, with a `632x430` radar card and a `632x122` forecast card. The radar card must contain `lbl_radar_frame`, `img_buienradar`, and `bar_radar_progress`. The forecast card must contain the five forecast row IDs `lbl_wx_d0_*` through `lbl_wx_d4_*` and `bar_wx_d0_range` through `bar_wx_d4_range`.

- [ ] **Step 3: Add right column with current weather and sun/daylight cards**

Under the fullscreen root, create a right column `width: 344`, `height: 568`, with a `344x356` current-weather card and a `344x196` sun/daylight card. The current card must contain `lbl_wx_now_icon`, `lbl_wx_now_temp`, `lbl_wx_now_cond`, `lbl_wx_wind`, `lbl_wx_uv`, `bar_wx_uv`, and `lbl_wx_rain`. The sun card must contain `lbl_wx_sun` and `bar_wx_sun`.

- [ ] **Step 4: Keep dimensions stable**

Use fixed widths/heights and `scrollable: false` for each card and row so LVGL label changes do not resize or shift the layout. Use `long_mode: DOT` on dynamic labels that can receive Dutch weather text.

---

### Task 3: Make Weather Page Truly Fullscreen

**Files:**
- Modify: `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing navigation click handler for `nav_weather`.
- Produces: weather navigation that hides the global top status bar.

- [ ] **Step 1: Change weather nav click behavior**

In the `nav_weather` `on_click` block, replace:

```yaml
                          - lvgl.widget.show: top_status_bar
```

with:

```yaml
                          - lvgl.widget.hide: top_status_bar
```

Expected behavior: entering weather no longer reserves or overlays the top status bar.

- [ ] **Step 2: Verify other page navigation still restores the topbar**

Run:

```bash
rg -n "lvgl.page.show: page_|lvgl.widget.show: top_status_bar|lvgl.widget.hide: top_status_bar" "/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml"
```

Expected: non-fullscreen pages still show `top_status_bar`; Immich, recipes, and other fullscreen pages may continue to hide it.

---

### Task 4: Speed Up Radar Animation

**Files:**
- Modify: `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing interval under comment `Buienradar loop`.
- Produces: radar frame changes every 6 seconds while `weather_page_active` is true.

- [ ] **Step 1: Change interval from 15 seconds to 6 seconds**

Replace:

```yaml
  - interval: 15s
```

with:

```yaml
  - interval: 6s
```

under the `# Buienradar loop` comment.

- [ ] **Step 2: Keep frame wrap behavior unchanged**

Verify the lambda still increments `radar_frame_index` and wraps from `8` back to `0`.

---

### Task 5: Verify YAML And ESPHome Build

**Files:**
- Test: `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: edited YAML from Tasks 2-4.
- Produces: confidence that the ESPHome config is syntactically valid and compiles.

- [ ] **Step 1: Parse YAML locally**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import yaml
path = Path("/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml")
yaml.safe_load(path.read_text())
print("YAML parse OK")
PY
```

Expected: `YAML parse OK`.

- [ ] **Step 2: Run ESPHome config in temp directory**

Run:

```bash
tmpdir=$(mktemp -d)
mkdir -p "$tmpdir/esphome"
cp "/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml" "$tmpdir/esphome/ha-display-7.yaml"
cp "/Users/tomkortekaas/Developer/AI_APP/4 inch/secrets.yaml" "$tmpdir/esphome/secrets.yaml"
uvx --python 3.12 esphome config "$tmpdir/esphome/ha-display-7.yaml"
```

Expected: ESPHome config completes without fatal errors.

- [ ] **Step 3: Compile if config passes**

Run in the same temp directory as Step 2:

```bash
uvx --python 3.12 esphome compile "$tmpdir/esphome/ha-display-7.yaml"
```

Expected: compile completes. ESP-IDF LEDC deprecation warnings are acceptable.

---

### Task 6: Optional Upload

**Files:**
- Upload: `/Users/tomkortekaas/Developer/AI_APP/ha_display_7inch/esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: successful compile from Task 5.
- Produces: flashed 7-inch display if reachable.

- [ ] **Step 1: Upload only after compile succeeds**

Run in the same temp directory as Task 5:

```bash
uvx --python 3.12 esphome upload "$tmpdir/esphome/ha-display-7.yaml" --device ha-display-7.local
```

Expected: upload succeeds or reports the device is unreachable. If unreachable, do not change the YAML further.
