# Remove Fullscreen Spotify Design

## Goal

Starting Spotify must no longer navigate to the full Spotify page. The display keeps the currently visible compatible page and automatically opens the existing Spotify drawer on the right. The full Spotify page and its navigation entry are removed.

## Behavior

- When the configured Spotify player starts playing Spotify content, open `spotify_drawer_container` through the existing drawer script.
- Keep the current display page active while opening the drawer.
- Fullscreen event modes such as the doorbell remain authoritative and must not be interrupted by Spotify.
- Existing swipe gestures continue to open and close the drawer.
- Existing drawer controls, album artwork, track metadata, progress, input selection, and volume remain unchanged.
- Stopping playback follows the existing drawer/restore behavior; this change does not introduce a new automatic close policy.

## Page And Navigation Changes

- Remove the full Spotify/media page from the `lvgl.pages` list.
- Remove its Spotify navigation button or menu entry.
- Update all numeric page mappings and page-selection branches that occur after the removed page so they continue to target the intended pages.
- Remove scripts, state, widgets, and update statements used exclusively by the full Spotify page.
- Retain Spotify sensors and update logic shared by the right-side drawer.

## Data Flow

The existing Home Assistant media entities remain the source of playback state, metadata, artwork, progress, source, shuffle/repeat state, and volume. The playback trigger calls the drawer-opening script instead of showing the full media page. No new Home Assistant entities are required.

## Safety And Compatibility

- Preserve the existing doorbell/fullscreen guards.
- Preserve unrelated local changes in `esphome/ha-display-7.yaml`.
- Avoid dangling LVGL IDs after removing the full page.
- Use symbolic IDs where available; carefully adjust unavoidable numeric page indexes.

## Verification

- Search for remaining references to the removed full Spotify page and its exclusive widget IDs.
- Validate the YAML with the repository's ESPHome configuration workflow.
- Compile the ESPHome configuration if validation succeeds.
- Confirm that starting Spotify opens the right drawer without changing the underlying page.
- Confirm that swipe open/close and drawer controls still work.
- Confirm that every remaining navigation item opens the correct page.

## Out Of Scope

- Redesigning the Spotify drawer.
- Changing Spotify or amplifier Home Assistant entities.
- Changing behavior of unrelated pages.
- Uploading firmware unless separately requested.
