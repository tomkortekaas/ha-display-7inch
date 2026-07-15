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

if ! rg -q 'script\.execute: spotify_drawer_open_script' <<<"$script_body"; then
  echo "FAIL: Spotify playback does not open spotify_drawer_open_script" >&2
  exit 1
fi

if rg -q 'goto_page|page_index:' <<<"$script_body"; then
  echo "FAIL: Spotify playback still navigates to another page" >&2
  exit 1
fi

echo "PASS: fullscreen Spotify page is absent and playback opens the drawer"
