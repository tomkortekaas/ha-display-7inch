#!/usr/bin/env bash
set -euo pipefail

yaml="${1:-esphome/ha-display-7.yaml}"

for removed_id in page_media nav_media nav_strip_media; do
  if rg -q "id: ${removed_id}([[:space:]]|$)" "$yaml"; then
    echo "FAIL: removed fullscreen Spotify id remains: ${removed_id}" >&2
    exit 1
  fi
done

script_body="$({
  sed -n '/^  - id: media_show_for_keuken_amp_spotify$/,/^  - id: media_restore_after_keuken_amp_stop$/p' "$yaml"
} | sed '$d')"

drawer_body="$({
  sed -n '/^          id: spotify_drawer_container$/,/^    mode: restart$/p' "$yaml"
} | sed '$d')"

if ! rg -q 'script\.execute: spotify_drawer_open_script' <<<"$script_body"; then
  echo "FAIL: Spotify playback does not open spotify_drawer_open_script" >&2
  exit 1
fi

if rg -q 'goto_page|page_index:' <<<"$script_body"; then
  echo "FAIL: Spotify playback still navigates to another page" >&2
  exit 1
fi

echo "PASS: fullscreen Spotify page is absent and playback opens the drawer"

drawer_line="$(rg -n '^          id: spotify_drawer_container$' "$yaml" | cut -d: -f1)"
status_line="$(rg -n '^          id: top_status_bar$' "$yaml" | cut -d: -f1)"

if [[ "$status_line" -le "$drawer_line" ]]; then
  echo "FAIL: status bar is not layered above the Spotify drawer" >&2
  exit 1
fi

if ! rg -U -q 'id: spotify_drawer_container\n          x: 717\n          y: 0\n          width: 307\n          height: 600' "$yaml"; then
  echo "FAIL: Spotify drawer does not occupy the full display height" >&2
  exit 1
fi

if ! rg -U -q 'action: input_boolean\.turn_off\n                data:\n                  entity_id: input_boolean\.keuken_amp_line_in[\s\S]*script\.execute: spotify_drawer_open_script' <<<"$script_body"; then
  echo "FAIL: detected Spotify playback does not clear the Line-in helper before opening the drawer" >&2
  exit 1
fi

if ! rg -U -q 'id: keuken_amp_previous_content_id\n[[:space:]]+entity_id: input_text\.keuken_amp_vorige_bron' "$yaml"; then
  echo "FAIL: display does not read back the saved Spotify content ID" >&2
  exit 1
fi

if ! rg -U -q 'id: spotify_drawer_input_spotify_btn[\s\S]*action: media_player\.play_media\n[[:space:]]+data:\n[[:space:]]+entity_id: \$\{keuken_amp_entity\}[\s\S]*media_content_id: "\{\{ content_id \}\}"[\s\S]*content_id: !lambda.*keuken_amp_previous_content_id' <<<"$drawer_body"; then
  echo "FAIL: Spotify source button does not replay the saved Spotify content ID on Keuken Amp" >&2
  exit 1
fi

for button_id in spotify_drawer_input_line_btn spotify_drawer_input_spotify_btn; do
  if ! rg -q "lv_obj_clear_state\(id\(${button_id}\), LV_STATE_FOCUSED\)" <<<"$drawer_body"; then
    echo "FAIL: ${button_id} keeps LVGL focus, which masks its green selected state" >&2
    exit 1
  fi
done

echo "PASS: Spotify drawer source state, focus styling, geometry and layering are synchronized"
