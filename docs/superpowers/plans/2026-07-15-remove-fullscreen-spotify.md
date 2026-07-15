# Remove Fullscreen Spotify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace automatic navigation to the full Spotify page with automatic opening of the existing right-side Spotify drawer, and remove the full page from navigation and LVGL.

**Architecture:** Keep the existing Home Assistant sensors, album-art loader, drawer widget tree, and drawer scripts. Simplify the automatic playback script to wake the display and execute `spotify_drawer_open_script`; remove full-page-only widgets and update all navigation page indexes after Media is removed.

**Tech Stack:** ESPHome YAML, LVGL, Home Assistant media-player entities.

## Global Constraints

- Preserve all unrelated uncommitted changes in `esphome/ha-display-7.yaml`.
- Do not interrupt `page_doorbell`; `spotify_drawer_open_script` remains guarded by `doorbell_page_active`.
- Keep existing Spotify drawer controls, artwork, metadata, progress, source selection, and volume.
- Do not upload firmware as part of this change.

---

### Task 1: Add Static Regression Checks

**Files:**
- Create: `tests/check_no_fullscreen_spotify.sh`

**Interfaces:**
- Consumes: `esphome/ha-display-7.yaml`
- Produces: a shell regression check that rejects the removed page/navigation IDs and requires automatic drawer opening.

- [ ] **Step 1: Write the failing check**

Create an executable script that uses `rg` to fail when `page_media`, `nav_media`, or `nav_strip_media` remains, and verifies that the body of `media_show_for_keuken_amp_spotify` contains `spotify_drawer_open_script` but no `goto_page` call.

- [ ] **Step 2: Run it and verify failure**

Run: `bash tests/check_no_fullscreen_spotify.sh`

Expected: FAIL because the full media page and navigation IDs still exist.

- [ ] **Step 3: Commit the failing check together with the implementation in Task 2**

Do not create a standalone red commit on the user's active branch.

### Task 2: Remove Fullscreen Spotify And Route Playback To Drawer

**Files:**
- Modify: `esphome/ha-display-7.yaml`
- Test: `tests/check_no_fullscreen_spotify.sh`

**Interfaces:**
- Consumes: `spotify_drawer_open_script`, `spotify_drawer_container`, Spotify Home Assistant sensors.
- Produces: six normal navigation indexes: Energy `0`, Lights `1`, Weather `2`, Agenda `3`, Immich `4`, Recipes `5`.

- [ ] **Step 1: Remove full-page-only state and UI**

Remove globals `keuken_amp_media_auto_active` and `last_page_before_media`, the `nav_media` container, the complete `page_media` LVGL page, and full-page-only interval updates for `lbl_track_titel`, `lbl_track_artiest`, `lbl_media_source`, `lbl_play_icoon`, `bar_media_progress`, `lbl_elapsed`, `lbl_remaining`, and `slider_volume`. Keep every corresponding `spotify_drawer_*` update.

- [ ] **Step 2: Make album art drawer-only**

In `album_art_load`, stop showing/hiding `img_album` and `lbl_album_fallback`. In `album_art_apply`, retain only `spotify_drawer_album` as the LVGL image destination and remove full-page widget show/hide calls.

- [ ] **Step 3: Change automatic Spotify behavior**

Keep the playback predicate in `media_show_for_keuken_amp_spotify`. Set `keuken_amp_spotify_auto_shown = true`, wake the display, set brightness to 90%, and execute `spotify_drawer_open_script`. Change the log message to state that the drawer is opening. Simplify `media_restore_after_keuken_amp_stop` to reset the auto-shown flag when playback is no longer `playing`; do not navigate to another page.

- [ ] **Step 4: Shift navigation mappings**

Update the nav rail positions so Weather occupies the removed Media slot and later items move upward. Change indexes to Weather `2`, Agenda `3`, Immich `4`, Recipes `5`; update `nav_select` arrays from seven entries to six and remove the Media IDs. Update `goto_page`, `immich_page_active`, `weather_page_active`, recipe/review back actions, agenda-only guards, and drawer compact-layout conditions to the new indexes.

- [ ] **Step 5: Run static regression checks**

Run: `bash tests/check_no_fullscreen_spotify.sh`

Expected: PASS and prints a success message.

- [ ] **Step 6: Check for dangling IDs and stale mappings**

Run: `rg -n 'page_media|nav_media|nav_strip_media|keuken_amp_media_auto_active|last_page_before_media|lbl_track_titel|lbl_track_artiest|lbl_media_source|lbl_play_icoon|bar_media_progress|lbl_elapsed|lbl_remaining|slider_volume|page_index: 6|current_display_page\) != 4' esphome/ha-display-7.yaml`

Expected: no output. Manually inspect all remaining `page_index:` values and `current_display_page` comparisons.

### Task 3: Validate ESPHome Configuration

**Files:**
- Verify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: completed YAML from Task 2.
- Produces: evidence that the configuration parses and compiles.

- [ ] **Step 1: Run whitespace validation**

Run: `git diff --check -- esphome/ha-display-7.yaml tests/check_no_fullscreen_spotify.sh`

Expected: no output and exit code `0`.

- [ ] **Step 2: Run ESPHome config validation**

Run the repository-supported ESPHome command against `esphome/ha-display-7.yaml` with its local secrets available.

Expected: configuration is valid.

- [ ] **Step 3: Compile**

Run the repository-supported compile command for `esphome/ha-display-7.yaml`.

Expected: compile completes successfully. If toolchain or network availability prevents compilation, record the exact failure without claiming success.

- [ ] **Step 4: Review the final diff**

Confirm that the diff contains only the requested Spotify/page-navigation changes plus the user's pre-existing edits, and that no secrets are staged.
