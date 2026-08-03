# Spotify Drawer Source And Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Spotify drawer fill the screen vertically without clipping volume, display the actual input, and synchronize phone-started Spotify playback back to Home Assistant.

**Architecture:** Extend the existing structural shell regression test to assert the LVGL geometry, layer order, and playback synchronization action. Make the smallest changes inside the existing ESPHome YAML: resize and compact the drawer, place the status bar above it in LVGL draw order, and turn off the Line-in helper when the existing Spotify playback detector fires.

**Tech Stack:** ESPHome YAML, LVGL, Home Assistant API actions, POSIX shell, ripgrep.

## Global Constraints

- Keep existing Spotify, amplifier, artwork, gesture, and unrelated page behaviour unchanged.
- Spotify playback with a `spotify:` media content ID is authoritative over a stale Line-in helper.
- The drawer occupies `y: 0` through the complete 600-pixel screen.
- The full volume slider remains visible.
- An explicitly shown status bar draws over the Spotify drawer.

---

### Task 1: Spotify Drawer Regression And Implementation

**Files:**
- Modify: `tests/check_no_fullscreen_spotify.sh`
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: `spotify_drawer_container`, `top_status_bar`, `media_show_for_keuken_amp_spotify`, and `input_boolean.keuken_amp_line_in`.
- Produces: structural guarantees for full-height drawer geometry, visible volume controls, status-bar layer order, and Spotify-triggered helper synchronization.

- [ ] **Step 1: Write the failing structural assertions**

Add shell assertions which extract the top-layer widget region and media detection script, then require:

```sh
drawer_line="$(rg -n '^          id: spotify_drawer_container$' "$yaml" | cut -d: -f1)"
status_line="$(rg -n '^          id: top_status_bar$' "$yaml" | cut -d: -f1)"
test "$status_line" -gt "$drawer_line"
rg -U -q 'id: spotify_drawer_container\n          x: 717\n          y: 0\n          width: 307\n          height: 600' "$yaml"
rg -U -q 'id: media_show_for_keuken_amp_spotify[\s\S]*action: input_boolean.turn_off[\s\S]*entity_id: input_boolean.keuken_amp_line_in[\s\S]*script.execute: spotify_drawer_open_script' "$yaml"
```

Also calculate the fixed vertical content budget from drawer padding, widget heights, and flex gaps so the test fails if it exceeds 600 pixels.

- [ ] **Step 2: Run the regression test and verify RED**

Run: `bash tests/check_no_fullscreen_spotify.sh`

Expected: FAIL because the drawer currently starts at `y: 56`, has height `544`, the status bar precedes the drawer, and the playback detector does not clear Line-in.

- [ ] **Step 3: Implement the minimal YAML changes**

Change the drawer to `y: 0` and `height: 600`, reduce padding/gaps and fixed child heights until the volume slider fits, move the existing `top_status_bar` widget block after `spotify_drawer_container`, and add this action before opening the drawer in the successful playback branch:

```yaml
- homeassistant.action:
    action: input_boolean.turn_off
    data:
      entity_id: input_boolean.keuken_amp_line_in
```

- [ ] **Step 4: Run the regression test and verify GREEN**

Run: `bash tests/check_no_fullscreen_spotify.sh`

Expected: `PASS: fullscreen Spotify page is absent and playback opens the drawer` followed by the new layout/source PASS message, exit code 0.

- [ ] **Step 5: Check the patch**

Run: `git diff --check && git diff -- tests/check_no_fullscreen_spotify.sh esphome/ha-display-7.yaml`

Expected: no whitespace errors; diff contains only the scoped test and Spotify drawer changes.

### Task 2: Validate And Flash OTA

**Files:**
- Verify: `esphome/ha-display-7.yaml`
- Use: `deploy-to-ha.sh`

**Interfaces:**
- Consumes: validated ESPHome YAML and the repository's configured Home Assistant/ESPHome deployment target.
- Produces: compiled firmware installed on the configured display over OTA.

- [ ] **Step 1: Inspect the deploy command and target**

Run: `sed -n '1,240p' deploy-to-ha.sh`

Expected: identify the non-interactive validation/upload path and exact target without changing deployment configuration.

- [ ] **Step 2: Run ESPHome validation**

Run the validation command used by the repository's deployment environment against `esphome/ha-display-7.yaml`.

Expected: configuration valid, exit code 0.

- [ ] **Step 3: Run all structural tests**

Run: `for test_file in tests/*.sh; do bash "$test_file" || exit 1; done`

Expected: every test prints PASS and the loop exits 0.

- [ ] **Step 4: Flash the configured device OTA**

Run the repository's existing OTA deploy/upload command discovered in Step 1.

Expected: firmware compiles, uploads successfully to the configured device, and the device reconnects.

- [ ] **Step 5: Commit the implementation**

```bash
git add tests/check_no_fullscreen_spotify.sh esphome/ha-display-7.yaml docs/superpowers/plans/2026-08-03-spotify-drawer-source-layout.md
git commit -m "fix: correct spotify drawer layout and source"
```
