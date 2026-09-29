#!/usr/bin/env bash
set -euo pipefail

root_dir=$(cd "$(dirname "$0")/.." && pwd)
yaml="$root_dir/esphome/ha-display-7.yaml"

require() {
  if ! rg -q --multiline "$1" "$yaml"; then
    echo "FAIL: $2" >&2
    exit 1
  fi
}

reject() {
  if rg -q --multiline "$1" "$yaml"; then
    echo "FAIL: $2" >&2
    exit 1
  fi
}

require 'id: recipe_sheet\n' 'one artwork_image for the thumbnail sheet'
require 'resize: 96x720' 'the sheet is 96x720'
require 'id: recipe_sheet\n(?:    .*\n)*?    hardware_acceleration: false' 'the sheet uses software decode'
require '/api/display/recipes\?list=%s&page=%d' 'the list is fetched from recipe-hub directly'
require '/api/display/recipes/sheet\?list=%s&page=%d&v=%s' 'the sheet url carries list, page and version'
require 'id: btn_recept_10\n' 'ten recipe cards'
reject 'id: btn_recept_11\n' 'no more than ten recipe cards'
require 'lv_image_set_offset_y\(imgs\[i\], -72 \* i\)' 'each card shows its own slice of the sheet'
require 'id: recipe_back_from_detail' 'back from detail keeps the current page'
require 'id\(recipe_list_step\)->execute\(swipe_left \? 1 : -1\)' 'mid-screen swipe pages through recipes'
reject 'ha_recept_' 'no Home Assistant recipe slot sensors'
reject 'recipe_thumb_' 'no per-recipe thumbnail components'
reject 'input_select\.ah_recipe_tab' 'the tab is kept on the display'
reject 'ah_recipes_dirty' 'no HA text batching'

echo 'PASS: recipe list pages come from recipe-hub with one thumbnail sheet'
