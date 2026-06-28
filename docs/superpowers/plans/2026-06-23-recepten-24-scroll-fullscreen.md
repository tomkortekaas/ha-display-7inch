# Recepten 24 Slots Scroll Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show 24 AH recipe favorites in a fullscreen scrollable recipe screen with thumbnails, and show recipe preparation as one scrollable all-steps view.

**Architecture:** Extend the existing AH Next.js API normalization with image URLs and an all-steps image mode. Keep ESPHome's existing per-slot sensor pattern, scaling it from 8 to 24 and adding one image URL per slot. Use the same fullscreen overlay behavior as Immich by hiding `nav_rail_container` and `top_status_bar` for recipe pages and showing them temporarily from the left edge handle.

**Tech Stack:** Next.js route handlers, Satori/Resvg PNG rendering, Home Assistant REST/template sensors, ESPHome LVGL and `artwork_image`.

## Global Constraints

- Target display is 1024x600.
- Main ESPHome file is `esphome/ha-display-7.yaml`.
- Home Assistant package file is `home-assistant/ha-display-7-package.yaml`.
- Keep existing user changes; do not revert unrelated edits.
- Keep edits scoped to AH recipes and fullscreen recipe navigation.

---

### Task 1: API Data And Detail Image

**Files:**
- Modify: `photo-swipe-patch/src/app/api/ah/favorites/route.ts`
- Modify: `photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts`

**Interfaces:**
- Produces favorite fields: `id`, `title`, `duration`, `servings`, `imageUrl`.
- Produces detail URL mode: `/api/ah/recipe/[id]/image?mode=all`.

- [ ] Add image URL normalization to favorites.
- [ ] Add a robust `pickRecipeImageUrl` helper.
- [ ] Render `mode=all` as one full 1024x600 PNG with all steps under each other.
- [ ] Preserve step mode compatibility.

### Task 2: Home Assistant 24 Slot Sensors

**Files:**
- Modify: `home-assistant/ha-display-7-package.yaml`

**Interfaces:**
- Produces sensors `sensor.ah_recept_1_*` through `sensor.ah_recept_24_*`.
- Each slot has `id`, `title`, `meta`, and `image`.

- [ ] Replace the existing 8-slot template block with a 24-slot block.
- [ ] Include image URL template sensors for thumbnails.

### Task 3: ESPHome Fullscreen Scroll UI

**Files:**
- Modify: `esphome/ha-display-7.yaml`

**Interfaces:**
- Consumes `sensor.ah_recept_N_id`, `title`, `meta`, `image`.
- Uses `recipe_thumb_N` artwork images and `recipe_art` detail image.

- [ ] Add globals for recipe fullscreen overlay timeout.
- [ ] Add 24 image text sensors.
- [ ] Add 24 thumbnail artwork images.
- [ ] Replace the recipe list with a fullscreen scrollable list.
- [ ] Replace step controls with scrollable all-steps detail and a back button.
- [ ] Hide nav/status on recipe pages and use the left edge handle for temporary nav.

### Task 4: Verification

**Files:**
- Validate changed YAML/TypeScript files.

- [ ] Run TypeScript syntax checks where possible.
- [ ] Run YAML parse checks.
- [ ] Inspect diffs for 24 slots, fullscreen behavior, thumbnails, and all-steps mode.
