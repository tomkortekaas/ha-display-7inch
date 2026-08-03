# Spotify Drawer Source And Layout Design

## Goal

Make the Spotify drawer use the full 600-pixel display height, keep its volume control fully visible, and show the input that is actually playing. Spotify playback started outside the display, such as from a phone, must override a stale Line-in selection.

## Behaviour

- Position the Spotify drawer at the top edge (`y: 0`) and let it occupy the full display height.
- Compact the vertical contents only as much as needed to keep the volume label and complete slider visible.
- Keep the temporary top status bar available. When it is shown while the Spotify drawer is open, it overlays the upper portion of the drawer without moving or resizing it.
- Treat active Spotify playback with a Spotify media content ID as authoritative.
- When Spotify playback is detected, turn off `input_boolean.keuken_amp_line_in` so Home Assistant and the drawer agree that Spotify is active.
- Keep the existing Line-in button behaviour: selecting Line-in from the display selects the amplifier input and turns the Line-in boolean on.
- Use the corrected Line-in boolean for the drawer styling after the Spotify playback synchronization.

## Data Flow

The existing Spotify media state/content sensors detect active Spotify playback. The existing auto-show script opens the drawer and additionally turns off the Line-in boolean. Home Assistant publishes the corrected boolean back to ESPHome, and the periodic LVGL update styles Spotify as active. Selecting Line-in from the drawer continues to set the amplifier source and boolean through the existing Home Assistant actions.

## Layout And Layering

The drawer remains on LVGL's top layer but starts at `y: 0` with a height of `600`. Its internal fixed sizes and flex spacing are reduced enough to fit within its padded content area. The status bar must be declared or moved after the drawer in top-layer ordering so that explicitly showing it places it above the drawer.

## Verification

- A structural regression test checks the drawer position, height, volume containment, Spotify playback synchronization, and top-bar layering.
- ESPHome configuration validation must complete successfully.
- OTA upload uses the repository's existing deploy target after validation.
- On-device acceptance: phone-started Spotify highlights Spotify and clears Line-in; the complete volume slider is visible; invoking the status bar overlays the drawer's top edge.

## Scope

No Spotify entity, amplifier entity, artwork pipeline, gesture, or unrelated page layout is changed.
