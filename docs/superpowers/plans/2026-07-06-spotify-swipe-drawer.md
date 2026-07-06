# Spotify Swipe Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-edge Spotify mini-player drawer to the 7-inch Home Assistant display while making the left navigation rail and Spotify drawer mutually exclusive.

**Architecture:** Keep the existing ESPHome/LVGL page model and add a small UI state machine around it: normal navigation mode, Spotify drawer mode, and fullscreen event mode. Spotify drawer mode hides the left nav rail, shows a compact media control layer on the right, and switches compatible pages to compact layouts. Doorbell/camera fullscreen mode always closes or suppresses Spotify.

**Tech Stack:** ESPHome YAML, LVGL widgets, Home Assistant media_player services, existing React design references in `design/`, visual mockups in `.superpowers/brainstorm/46719-1783363138/content/`.

## Global Constraints

- Target display is 1024 x 600 landscape on Guition JC1060P470 / ESP32-P4.
- Preserve `color_depth: 16` and `byte_order: little_endian` in LVGL.
- Do not show the left navigation rail and Spotify drawer at the same time.
- Swipe from the right edge to the left opens the Spotify drawer on compatible pages.
- Swipe from the left edge to the right closes Spotify and restores the left navigation rail.
- Camera/doorbell pages are fullscreen event pages: no left nav, no Spotify drawer.
- Energy screen no longer shows indoor temperature or energy cost.
- Spotify drawer applies to Energy, Climate, Lights, and Weather only.
- The full Spotify page remains available from navigation; right-edge drawer gesture on that page should do nothing.
- Avoid large redraws from many `on_value` callbacks; keep LVGL updates script/interval driven where possible.

---

## File Structure

- Modify `esphome/ha-display-7.yaml`: add drawer globals, scripts, touch routing, compact widgets/layout changes, and validation-safe service calls.
- Optionally modify `design/app.jsx`: add prototype state for `spotifyDrawerOpen`.
- Optionally modify `design/screens-energy.jsx`: remove cost and indoor temperature from the visual reference.
- Optionally modify `design/screens-lights.jsx`, `design/screens-climate.jsx`, `design/screens-weather.jsx`: add compact drawer-state visual references if the implementation agent wants the browser prototype to match firmware.
- Keep `.superpowers/brainstorm/46719-1783363138/content/spotify-swipe-exclusive-nav-v2.html` and `.superpowers/brainstorm/46719-1783363138/content/spotify-swipe-all-screens-check.html` as local visual references; `.superpowers/` is gitignored.

## Task 1: Add Drawer State And Mode Scripts

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing globals `current_display_page`, `doorbell_page_active`, `immich_page_active`, `weather_page_active`, `ah_recipe_page_active`, `nav_rail_container`, `top_status_bar`.
- Produces: new global `spotify_drawer_open`; scripts `spotify_drawer_open_script`, `spotify_drawer_close_script`, `restore_normal_chrome_script`.

- [ ] **Step 1: Add drawer globals**

Add near the existing `globals:` block:

```yaml
  - id: spotify_drawer_open
    type: bool
    restore_value: no
    initial_value: "false"
```

- [ ] **Step 2: Add a compatibility helper in lambdas**

Use this exact compatibility rule wherever drawer open/close decisions are made:

```cpp
const bool spotify_drawer_allowed =
  !id(doorbell_page_active) &&
  !id(immich_page_active) &&
  !id(ah_recipe_page_active) &&
  id(current_display_page) != 2;
```

Page index `2` is the full media/Spotify page in the existing YAML. If the implementation discovers page indexes changed, update the condition and document the actual mapping in the commit message.

- [ ] **Step 3: Add close script**

Add in the `script:` section:

```yaml
  - id: spotify_drawer_close_script
    mode: restart
    then:
      - lambda: |-
          id(spotify_drawer_open) = false;
      - lvgl.widget.hide: spotify_drawer_container
      - if:
          condition:
            lambda: 'return !id(immich_page_active) && !id(ah_recipe_page_active) && !id(doorbell_page_active) && !id(weather_page_active);'
          then:
            - lvgl.widget.show: nav_rail_container
            - lvgl.widget.show: top_status_bar
```

- [ ] **Step 4: Add open script**

Add after the close script:

```yaml
  - id: spotify_drawer_open_script
    mode: restart
    then:
      - if:
          condition:
            lambda: |-
              return !id(doorbell_page_active) &&
                     !id(immich_page_active) &&
                     !id(ah_recipe_page_active) &&
                     id(current_display_page) != 2;
          then:
            - lambda: |-
                id(spotify_drawer_open) = true;
            - lvgl.widget.hide: nav_rail_container
            - lvgl.widget.show: top_status_bar
            - lvgl.widget.show: spotify_drawer_container
            - script.execute: spotify_drawer_apply_compact_layout_script
```

- [ ] **Step 5: Add restore-normal script**

Add:

```yaml
  - id: restore_normal_chrome_script
    mode: restart
    then:
      - lambda: |-
          id(spotify_drawer_open) = false;
      - lvgl.widget.hide: spotify_drawer_container
      - if:
          condition:
            lambda: 'return !id(immich_page_active) && !id(ah_recipe_page_active) && !id(doorbell_page_active) && !id(weather_page_active);'
          then:
            - lvgl.widget.show: nav_rail_container
            - lvgl.widget.show: top_status_bar
```

- [ ] **Step 6: Validate syntax**

Run:

```bash
esphome config esphome/ha-display-7.yaml
```

Expected: config parses. If ESPHome is not available locally, record that and run the repo's existing validation command if documented.

## Task 2: Add The Spotify Drawer Widget Tree

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing Spotify sensors and controls, including `${spotify_entity}`, `img_album`, title/artist labels if already present.
- Produces: `spotify_drawer_container`, `spotify_drawer_album`, `spotify_drawer_title`, `spotify_drawer_artist`, `spotify_drawer_progress`, `spotify_drawer_volume`.

- [ ] **Step 1: Locate the top-level persistent widgets**

Find the section under `lvgl:` where `nav_rail_container` and `top_status_bar` are defined. Add the drawer as a sibling overlay so it can appear above any compatible page.

- [ ] **Step 2: Add drawer container**

Add this structure, adapting only font ids/colors to existing local names if a referenced font id does not exist:

```yaml
      - obj:
          id: spotify_drawer_container
          x: 717
          y: 56
          width: 307
          height: 544
          bg_color: 0x070807
          bg_opa: COVER
          border_width: 1
          border_color: 0x1ED760
          pad_all: 14
          hidden: true
          layout:
            type: FLEX
            flex_flow: COLUMN
            flex_align_main: START
            flex_align_cross: CENTER
          widgets:
            - image:
                id: spotify_drawer_album
                src: spotify_album_art
                width: 210
                height: 210
                align: TOP_MID
            - label:
                id: spotify_drawer_title
                width: 270
                long_mode: DOT
                text: "--"
                text_font: montserrat_20
                text_color: 0xFFFFFF
            - label:
                id: spotify_drawer_artist
                width: 270
                long_mode: DOT
                text: "--"
                text_font: montserrat_14
                text_color: 0x9999A3
            - bar:
                id: spotify_drawer_progress
                width: 270
                height: 5
                min_value: 0
                max_value: 100
                value: 0
                bg_color: 0x2A2A2E
                indicator:
                  bg_color: 0xFFFFFF
            - obj:
                width: 270
                height: 76
                bg_opa: TRANSP
                border_width: 0
                pad_all: 0
                layout:
                  type: FLEX
                  flex_flow: ROW
                  flex_align_main: CENTER
                  flex_align_cross: CENTER
                widgets:
                  - button:
                      width: 52
                      height: 52
                      on_press:
                        - homeassistant.service:
                            service: media_player.media_previous_track
                            data:
                              entity_id: ${spotify_entity}
                      widgets:
                        - label:
                            align: CENTER
                            text: LV_SYMBOL_PREV
                  - button:
                      width: 68
                      height: 68
                      bg_color: 0xFFFFFF
                      on_press:
                        - homeassistant.service:
                            service: media_player.media_play_pause
                            data:
                              entity_id: ${spotify_entity}
                      widgets:
                        - label:
                            id: spotify_drawer_play_icon
                            align: CENTER
                            text: LV_SYMBOL_PLAY
                            text_color: 0x000000
                  - button:
                      width: 52
                      height: 52
                      on_press:
                        - homeassistant.service:
                            service: media_player.media_next_track
                            data:
                              entity_id: ${spotify_entity}
                      widgets:
                        - label:
                            align: CENTER
                            text: LV_SYMBOL_NEXT
            - slider:
                id: spotify_drawer_volume
                width: 270
                height: 28
                min_value: 0
                max_value: 100
                value: 40
                indicator:
                  bg_color: 0x1ED760
                on_release:
                  then:
                    - homeassistant.service:
                        service: media_player.volume_set
                        data:
                          entity_id: ${spotify_entity}
                          volume_level: !lambda 'return x / 100.0f;'
```

- [ ] **Step 3: Wire existing media update script**

Find the existing script that updates full media labels near the Spotify page. Extend it with:

```yaml
      - lvgl.label.update:
          id: spotify_drawer_title
          text: !lambda 'return id(spotify_title).state.c_str();'
      - lvgl.label.update:
          id: spotify_drawer_artist
          text: !lambda 'return id(spotify_artist).state.c_str();'
      - lvgl.bar.update:
          id: spotify_drawer_progress
          value: !lambda |-
            const float duration = id(spotify_duration).state;
            const float position = id(spotify_position).state;
            if (duration <= 0) return 0;
            return (int) std::max(0.0f, std::min(100.0f, (position / duration) * 100.0f));
```

If the actual sensor ids differ, use the existing full Spotify page ids and keep the produced widget ids unchanged.

- [ ] **Step 4: Validate drawer appears hidden by default**

Run:

```bash
esphome config esphome/ha-display-7.yaml
```

Expected: config parses and `spotify_drawer_container` has `hidden: true`.

## Task 3: Route Swipe Gestures

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: existing touch globals `touch_swipe_start_x`, `touch_swipe_start_y`, `touch_swipe_last_x`, `touch_swipe_last_y`.
- Produces: deterministic gestures for drawer open/close.

- [ ] **Step 1: Update the swipe release lambda**

Find the existing touch release block where `dx`, `dy`, `from_left_edge`, and `from_nav_zone` are calculated. Add these constants after those variables:

```cpp
const bool from_right_edge = id(touch_swipe_start_x) >= 904;
const bool horizontal_swipe = std::abs(dx) >= 90 && std::abs(dx) > std::abs(dy) * 2;
const bool swipe_left = dx <= -90;
const bool swipe_right = dx >= 90;
```

- [ ] **Step 2: Add drawer gesture precedence**

Before existing page navigation or nav overlay handling in that same lambda, add:

```cpp
if (horizontal_swipe && from_right_edge && swipe_left) {
  const bool allowed =
    !id(doorbell_page_active) &&
    !id(immich_page_active) &&
    !id(ah_recipe_page_active) &&
    id(current_display_page) != 2;
  if (allowed) {
    id(spotify_drawer_open_script).execute();
    return;
  }
}

if (horizontal_swipe && id(spotify_drawer_open) && from_left_edge && swipe_right) {
  id(spotify_drawer_close_script).execute();
  return;
}
```

- [ ] **Step 3: Ensure doorbell closes drawer**

Find the script that shows `page_doorbell`. Before `lvgl.page.show: page_doorbell`, add:

```yaml
      - script.execute: spotify_drawer_close_script
```

Also keep the existing fullscreen behavior for doorbell/camera.

- [ ] **Step 4: Validate touch code compiles**

Run:

```bash
esphome config esphome/ha-display-7.yaml
```

Expected: config parses without C++ lambda errors.

## Task 4: Compact Layouts For Compatible Pages

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: `spotify_drawer_open`.
- Produces: script `spotify_drawer_apply_compact_layout_script` and page-specific compact positions/sizes.

- [ ] **Step 1: Add compact-layout dispatcher**

Add this script:

```yaml
  - id: spotify_drawer_apply_compact_layout_script
    mode: restart
    then:
      - if:
          condition:
            lambda: 'return id(current_display_page) == 0;'
          then:
            - script.execute: energy_compact_for_spotify_script
      - if:
          condition:
            lambda: 'return id(current_display_page) == 1;'
          then:
            - script.execute: lights_compact_for_spotify_script
      - if:
          condition:
            lambda: 'return id(current_display_page) == 3;'
          then:
            - script.execute: weather_compact_for_spotify_script
```

If climate exists under a different page index, add the same pattern for it. Use the actual page mapping from the nav button `lvgl.page.show` blocks.

- [ ] **Step 2: Energy compact layout**

Remove or hide the energy cost and indoor temperature widgets from the Energy page. Keep current power, water, gas, solar, and dynamic price.

Add a script with the actual ids from the Energy widgets:

```yaml
  - id: energy_compact_for_spotify_script
    mode: restart
    then:
      - lvgl.widget.hide: energy_cost_metric
      - lvgl.widget.hide: energy_indoor_temp_metric
      - lvgl.obj.update:
          id: energy_content_container
          width: 717
```

If the current YAML uses different ids, rename the ids in the script to match existing widgets rather than creating duplicate cards.

- [ ] **Step 3: Lights compact layout**

In Spotify-open state, keep lights as one compact list and scenes as a narrow stack. Add or update the page widgets so the compact state does not use a 2-column light tile grid.

Add:

```yaml
  - id: lights_compact_for_spotify_script
    mode: restart
    then:
      - lvgl.obj.update:
          id: lights_grid_container
          width: 430
          layout:
            type: FLEX
            flex_flow: COLUMN
      - lvgl.obj.update:
          id: scenes_container
          width: 210
```

- [ ] **Step 4: Climate compact layout**

If climate is present in the real YAML, keep thermostat dial left and compress mode/ventilation/rooms into the right column.

Use this pattern:

```yaml
  - id: climate_compact_for_spotify_script
    mode: restart
    then:
      - lvgl.obj.update:
          id: climate_content_container
          width: 717
      - lvgl.obj.update:
          id: climate_mode_grid
          layout:
            type: GRID
            grid_columns: [FR(1), FR(1)]
            grid_rows: [CONTENT, CONTENT]
```

- [ ] **Step 5: Weather compact layout**

For Weather, show 3 hourly columns while Spotify is open; keep the 5-day list readable.

Use this pattern:

```yaml
  - id: weather_compact_for_spotify_script
    mode: restart
    then:
      - lvgl.widget.hide: weather_hour_4
      - lvgl.widget.hide: weather_hour_5
      - lvgl.widget.hide: weather_hour_6
      - lvgl.obj.update:
          id: weather_content_container
          width: 717
```

- [ ] **Step 6: Restore normal layouts**

Extend `spotify_drawer_close_script` with page-specific restore scripts:

```yaml
      - script.execute: energy_restore_normal_layout_script
      - script.execute: lights_restore_normal_layout_script
      - script.execute: climate_restore_normal_layout_script
      - script.execute: weather_restore_normal_layout_script
```

Each restore script should reverse only the widgets it changed.

- [ ] **Step 7: Validate layout ids**

Run:

```bash
rg -n "energy_cost_metric|energy_indoor_temp_metric|energy_content_container|lights_grid_container|scenes_container|climate_content_container|weather_content_container|weather_hour_4" esphome/ha-display-7.yaml
esphome config esphome/ha-display-7.yaml
```

Expected: every id referenced by an update/hide action exists exactly once as a widget id, and config parses.

## Task 5: Update Browser Design References

**Files:**
- Modify: `design/app.jsx`
- Modify: `design/screens-energy.jsx`
- Modify: `design/screens-lights.jsx`
- Modify: `design/screens-climate.jsx`
- Modify: `design/screens-weather.jsx`

**Interfaces:**
- Consumes: existing React prototype state.
- Produces: a browser prototype that matches the firmware design.

- [ ] **Step 1: Add drawer state to React prototype**

In `design/app.jsx`, add:

```jsx
const [spotifyDrawerOpen, setSpotifyDrawerOpen] = useState(false);
```

Pass `spotifyDrawerOpen` into Energy, Climate, Lights, and Weather screens.

- [ ] **Step 2: Remove Energy cost and indoor temperature**

In `design/screens-energy.jsx`, remove the `BarMetric` blocks labelled `Energiekosten` and `Binnen`. Keep `Zonne-opbrengst` and `Dynamische prijs`.

- [ ] **Step 3: Add prototype drawer component**

Add a local component in `design/app.jsx`:

```jsx
function SpotifyDrawer({ data, accents, open }) {
  if (!open) return null;
  return (
    <aside className="spotify-drawer">
      <div className="spotify-drawer-art" />
      <div className="spotify-drawer-title">{data.player.track}</div>
      <div className="spotify-drawer-artist">{data.player.artist}</div>
      <div className="spotify-drawer-progress">
        <span style={{ width: `${(data.player.position / data.player.duration) * 100}%` }} />
      </div>
      <div className="spotify-drawer-controls">
        <button><Icon.skipBack /></button>
        <button><Icon.pause /></button>
        <button><Icon.skipFwd /></button>
      </div>
      <Slider value={data.player.volume} color={accents.solar} suffix="%" height={26} />
    </aside>
  );
}
```

- [ ] **Step 4: Add prototype CSS**

In `design/index.html`, add CSS matching the approved mockup:

```css
.app.spotify-drawer-open {
  grid-template-columns: 1fr;
  grid-template-areas:
    "status"
    "main";
}
.app.spotify-drawer-open .nav {
  display: none;
}
.app.spotify-drawer-open .screen-view.active {
  padding-right: 326px;
}
.spotify-drawer {
  position: absolute;
  right: 0;
  top: 56px;
  bottom: 0;
  width: 307px;
  background: #070807;
  border-left: 1px solid rgba(30,215,96,.34);
  z-index: 20;
}
```

- [ ] **Step 5: Test prototype visually**

Open:

```bash
open design/index.html
```

Expected: normal mode shows left nav; drawer mode hides nav and shows Spotify drawer. Energy no longer shows cost or indoor temperature.

## Task 6: Final Validation

**Files:**
- Test only

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified firmware/design handoff.

- [ ] **Step 1: Run ESPHome validation**

Run:

```bash
esphome config esphome/ha-display-7.yaml
```

Expected: config parses.

- [ ] **Step 2: Search for forbidden simultaneous UI**

Run:

```bash
rg -n "spotify_drawer_open|nav_rail_container|doorbell_page_active|page_doorbell" esphome/ha-display-7.yaml
```

Expected: open drawer script hides `nav_rail_container`; close/restore script hides `spotify_drawer_container`; doorbell script executes drawer close before showing fullscreen camera.

- [ ] **Step 3: Manual device smoke test**

Flash or run on the display, then verify:

```text
1. Energy page: swipe right edge left -> Spotify drawer opens, nav disappears.
2. Spotify drawer open: swipe left edge right -> drawer closes, nav returns.
3. Lights page: drawer opens, lights list remains usable.
4. Weather page: drawer opens, forecast remains readable.
5. Full Spotify page: right-edge swipe does not open a second drawer.
6. Doorbell/camera event: page goes fullscreen, no drawer, no nav.
7. Energy page: cost and indoor temperature are absent.
```

- [ ] **Step 4: Commit**

Run:

```bash
git add esphome/ha-display-7.yaml design/app.jsx design/index.html design/screens-energy.jsx design/screens-lights.jsx design/screens-climate.jsx design/screens-weather.jsx docs/superpowers/plans/2026-07-06-spotify-swipe-drawer.md
git commit -m "feat: add spotify swipe drawer plan and implementation"
```

If only the plan was created and implementation is deferred, commit only:

```bash
git add docs/superpowers/plans/2026-07-06-spotify-swipe-drawer.md
git commit -m "docs: plan spotify swipe drawer"
```

## Self-Review Notes

- Spec coverage: covers mutual exclusion between nav and Spotify, compatible pages, energy removals, camera fullscreen priority, gestures, and validation.
- Placeholder scan: no `TBD` or open-ended placeholders remain; ids marked as patterns require the implementation agent to bind to actual existing ids after inspecting the large YAML.
- Type consistency: produced script ids are stable across tasks: `spotify_drawer_open_script`, `spotify_drawer_close_script`, `spotify_drawer_apply_compact_layout_script`, and `restore_normal_chrome_script`.
