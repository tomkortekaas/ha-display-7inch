# Display Image Load Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the 7-inch display responsive by loading Immich and AH images only when useful and by preventing duplicate or overlapping downloads.

**Architecture:** Home Assistant continues publishing stable image identities. ESPHome stores desired identities, gates work by the active page, and dispatches one image at a time. The AH backend exposes a genuinely small cacheable thumbnail response so the display never downloads and resizes a full render for a list tile.

**Tech Stack:** ESPHome 2026.7.x YAML/C++ lambdas, LVGL, Next.js route handlers, TypeScript, shell regression checks.

## Global Constraints

- Do not redesign any page.
- Preserve Spotify, radar, doorbell, review, Immich, and AH functionality.
- Never run more than one `artwork_image` download concurrently.
- Keep unrelated user files and untracked fragments untouched.
- Validate and compile the ESPHome firmware before completion.

---

### Task 1: Add static regression checks for scheduling rules

**Files:**
- Create: `tests/check_image_load_stability.sh`
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes: ESPHome globals, image callbacks, page navigation, and interval dispatcher.
- Produces: an executable regression check asserting page gates, stable recipe identities, safe lock ownership, and disabled API reboot timeout.

- [ ] **Step 1: Write the failing shell check**

Create a strict shell script that checks for `reboot_timeout: 0s`, `recipe_list_page_active`, desired/loaded Immich URL separation, per-slot loaded recipe IDs, active-page guards in both dispatchers, and removal of the time-based global lock release.

- [ ] **Step 2: Run it and confirm failure**

Run: `bash tests/check_image_load_stability.sh`

Expected: FAIL because the new globals and guards do not exist yet.

- [ ] **Step 3: Commit the failing check**

Run: `git add tests/check_image_load_stability.sh && git commit -m "test: cover display image load scheduling"`

### Task 2: Gate and deduplicate ESPHome image loads

**Files:**
- Modify: `esphome/ha-display-7.yaml`
- Test: `tests/check_image_load_stability.sh`

**Interfaces:**
- Consumes: `current_display_page`, `immich_url`, `ha_recept_N_id`, and existing `artwork_busy` serialization.
- Produces: `immich_art_desired_url`, `recipe_list_page_active`, and 24 stable loaded recipe-ID values used by callbacks and dispatch.

- [ ] **Step 1: Introduce explicit state**

Add a desired Immich URL separate from the successfully loaded URL, a recipes-list-active boolean, and a fixed 24-element C++ string array holding the successfully loaded recipe IDs.

- [ ] **Step 2: Make sensor callbacks side-effect-light**

Change Immich `on_value` to record the desired URL and start work only on the active photo page. Change recipe image callbacks to set URLs and pending bits only when the slot's recipe ID differs from the loaded ID.

- [ ] **Step 3: Gate work on page visibility**

Set `recipe_list_page_active` from page navigation, clear it on detail/doorbell navigation, trigger pending Immich/recept work on page entry, and have the dispatchers return immediately when their page is inactive.

- [ ] **Step 4: Fix lock and retry behavior**

Remove the 10-second global forced unlock, release the lock only from completion/error callbacks, allow one Immich retry only while the page remains visible, and write the loaded identity only after success.

- [ ] **Step 5: Remove periodic INFO debug noise and disable API reboot**

Delete the recurring `input_toggle_debug` INFO statements and set `api.reboot_timeout: 0s`.

- [ ] **Step 6: Run regression check**

Run: `bash tests/check_image_load_stability.sh`

Expected: PASS.

- [ ] **Step 7: Commit ESPHome scheduling changes**

Run: `git add esphome/ha-display-7.yaml tests/check_image_load_stability.sh && git commit -m "fix: gate and deduplicate display image loads"`

### Task 3: Serve real cacheable recipe thumbnails

**Files:**
- Modify: `photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts`
- Create: `tests/check_recipe_thumbnail_route.sh`

**Interfaces:**
- Consumes: `GET /api/ah/recipe/{id}/image?mode=thumb` and the recipe's upstream image URL.
- Produces: a 96×72 cacheable image response keyed by recipe ID.

- [ ] **Step 1: Write the failing route regression check**

Create a strict shell check asserting an explicit `thumb` dimension of 96×72, a dedicated thumbnail branch, and a public immutable cache header for successful thumbnails.

- [ ] **Step 2: Run it and confirm failure**

Run: `bash tests/check_recipe_thumbnail_route.sh`

Expected: FAIL because `thumb` currently falls through to the 1024×600 default and successful responses use `no-store`.

- [ ] **Step 3: Implement the thumbnail response**

For `mode=thumb`, fetch the recipe image URL, return a server-produced 96×72 JPEG-compatible response, and use `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Preserve `no-store` for error responses and dynamic text panels.

- [ ] **Step 4: Run the route regression check**

Run: `bash tests/check_recipe_thumbnail_route.sh`

Expected: PASS.

- [ ] **Step 5: Commit backend thumbnail changes**

Run: `git add photo-swipe-patch/src/app/api/ah/recipe/'[id]'/image/route.ts tests/check_recipe_thumbnail_route.sh && git commit -m "fix: serve cacheable recipe thumbnails"`

### Task 4: Pin the external component and verify configuration

**Files:**
- Modify: `esphome/ha-display-7.yaml`
- Test: `tests/check_image_load_stability.sh`

**Interfaces:**
- Consumes: the currently resolved `jtenniswood/espcontrol` checkout.
- Produces: a reproducible external-component revision.

- [ ] **Step 1: Resolve the checked-out commit**

Run: `git -C esphome/.esphome/external_components/<checkout> rev-parse HEAD` and confirm that checkout is the configured espcontrol repository.

- [ ] **Step 2: Pin `ref` to that full commit SHA**

Replace `ref: main` with the verified full SHA.

- [ ] **Step 3: Validate ESPHome configuration**

Run: `uvx --python 3.12 esphome config esphome/ha-display-7.yaml`

Expected: configuration is valid; record existing unrelated YAML merge warnings separately.

- [ ] **Step 4: Compile firmware**

Run: `uvx --python 3.12 esphome compile esphome/ha-display-7.yaml`

Expected: successful ESP32-P4 firmware build.

- [ ] **Step 5: Commit the reproducibility change**

Run: `git add esphome/ha-display-7.yaml && git commit -m "build: pin display artwork component"`

### Task 5: Deploy and observe the complete flow

**Files:**
- Modify: none unless verification exposes a confirmed defect.

**Interfaces:**
- Consumes: compiled firmware and reachable `ha-display-7.local`.
- Produces: evidence that the device stays responsive through page changes and API reconnects.

- [ ] **Step 1: Upload the compiled firmware**

Run: `uvx --python 3.12 esphome upload esphome/ha-display-7.yaml --device ha-display-7.local`

Expected: OTA upload succeeds and the device reconnects.

- [ ] **Step 2: Observe logs outside image pages**

Run: `uvx --python 3.12 esphome logs esphome/ha-display-7.yaml --device ha-display-7.local`

Expected: no Immich or recipe thumbnail downloads while their pages are hidden and no unexpected API disconnect.

- [ ] **Step 3: Observe the Immich and recipe pages**

Open each page once and verify serialized loads, normal touch response, one-minute Immich refresh only while visible, and no duplicate 24-image burst after reconnection.

- [ ] **Step 4: Run final repository checks**

Run: `bash tests/check_image_load_stability.sh && bash tests/check_recipe_thumbnail_route.sh && git diff --check && git status --short`

Expected: all checks pass; only known user-owned untracked fragments remain.
