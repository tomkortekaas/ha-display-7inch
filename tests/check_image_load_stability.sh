#!/usr/bin/env bash
set -euo pipefail

root_dir=$(cd "$(dirname "$0")/.." && pwd)
yaml="$root_dir/esphome/ha-display-7.yaml"

require() {
  local pattern=$1
  local message=$2
  if ! rg -q --multiline "$pattern" "$yaml"; then
    echo "FAIL: $message" >&2
    exit 1
  fi
}

reject() {
  local pattern=$1
  local message=$2
  if rg -q --multiline "$pattern" "$yaml"; then
    echo "FAIL: $message" >&2
    exit 1
  fi
}

require 'api:\n  reboot_timeout: 0s' 'API loss must not reboot the display'
require 'id: immich_art_desired_url' 'Immich needs separate desired and loaded URLs'
require 'id: recipe_list_page_active' 'recipe list visibility must be tracked'
require 'return id\(immich_page_active\) &&' 'Immich loading must be gated by page visibility'
require 'return id\(spotify_drawer_open\) &&\n[[:space:]]*!id\(album_art_pending_url\)\.empty\(\);' 'Spotify artwork must be gated by drawer visibility'
require 'if \(!id\(recipe_sheet_pending\) \|\| !id\(recipe_list_page_active\) \|\| id\(artwork_busy\)\) return;' 'the recipe sheet loads only when visible and the artwork lock is free'
require 'if \(id\(recipe_sheet\)->get_url\(\) != id\(recipe_sheet_desired_url\)\) return;' 'a stale sheet is never applied after paging on'
reject 'artwork_busy_ticks\) > 40' 'the global artwork lock must not be released by a 10-second timer'
reject 'input_toggle_debug' 'periodic INFO debug logging must be removed'

echo 'PASS: image loads are page-gated, deduplicated, and serialized safely'
