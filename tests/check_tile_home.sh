#!/usr/bin/env bash
# Shell-contract van het 7-inch scherm: geen zijbalk, één statusbalk-overlay
# over de volle breedte, en een tegelscherm (page_home) als navigatie.

set -euo pipefail

root_dir="${TILE_HOME_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
display_yaml="$root_dir/esphome/ha-display-7.yaml"

ruby - "$display_yaml" <<'RUBY'
require "yaml"

path = ARGV.fetch(0)
raw = File.read(path, encoding: "UTF-8")
display = YAML.load_file(path)

def check(condition, message)
  abort("FAIL: #{message}") unless condition
end

def find_by_id(node, id)
  case node
  when Hash
    return node if node["id"] == id
    node.each_value do |value|
      found = find_by_id(value, id)
      return found if found
    end
  when Array
    node.each do |value|
      found = find_by_id(value, id)
      return found if found
    end
  end
  nil
end

def deep_values(node, key)
  case node
  when Hash
    own = node.key?(key) ? [node[key]] : []
    own + node.values.flat_map { |value| deep_values(value, key) }
  when Array
    node.flat_map { |value| deep_values(value, key) }
  else
    []
  end
end

lvgl = display.fetch("lvgl")
top = lvgl.fetch("top_layer")

%w[nav_rail_container nav_edge_handle nav_energie nav_strip_energie].each do |id|
  check(!raw.include?(id), "#{id} must be gone: navigation runs through page_home")
end

bar = find_by_id(top, "top_status_bar")
check(bar.is_a?(Hash), "missing top_status_bar")
check(bar.values_at("x", "y", "width", "height") == [0, 0, 1024, 56],
      "top_status_bar must span the full width at the top")
check(bar["hidden"] == true, "top_status_bar must start hidden (overlay)")
home_btn = find_by_id(bar, "btn_status_home")
check(home_btn.is_a?(Hash) && deep_values(home_btn, "page_index") == [7],
      "status bar home button must go to page index 7")

home = find_by_id(lvgl.fetch("pages"), "page_home")
check(home.is_a?(Hash), "missing page_home")
expected = {
  "energie" => 0, "lichten" => 1, "weer" => 2, "agenda" => 3,
  "fotos" => 4, "recepten" => 5, "timer" => 6, "radar" => 8
}
expected.each do |key, index|
  tile = find_by_id(home, "home_tile_#{key}")
  check(tile.is_a?(Hash), "missing tile home_tile_#{key}")
  check(deep_values(tile, "page_index") == [index], "home_tile_#{key} must open page #{index}")
  check(tile.values_at("width", "height") == [182, 246], "home_tile_#{key} must be 182x246 (5x2 grid)")
  check(find_by_id(tile, "home_val_#{key}").is_a?(Hash), "home_tile_#{key} needs a live value label")
end
music = find_by_id(home, "home_tile_muziek")
check(music.is_a?(Hash) && deep_values(music, "script.execute").include?("spotify_drawer_open_script"),
      "music tile must open the Spotify drawer")

tiles = (expected.keys + ["muziek"]).map { |key| find_by_id(home, "home_tile_#{key}") }
tiles.each do |tile|
  check(tile["x"] >= 0 && tile["x"] + tile["width"] <= 1024 && tile["y"] >= 56 &&
        tile["y"] + tile["height"] <= 600, "#{tile['id']} must sit on screen below the status bar")
end
slots = tiles.map { |tile| [tile["x"], tile["y"]] }
check(slots.uniq.size == slots.size, "home tiles must not overlap")
check(slots.all? { |x, _| [25, 223, 421, 619, 817].include?(x) }, "home tiles must sit on the 5-column grid")

scripts = display.fetch("script")
goto_page = find_by_id(scripts, "goto_page")
check(deep_values(goto_page, "lvgl.page.show").include?("page_home"),
      "goto_page must be able to show page_home")
check(find_by_id(scripts, "home_tiles_refresh").is_a?(Hash), "missing home_tiles_refresh script")
check(find_by_id(scripts, "nav_select").nil?, "nav_select must be gone with the nav rail")

# Geen content mag nog rekenen op een vaste zijbalk van 88 px.
%w[lights_content_container agenda_week_root].each do |id|
  obj = find_by_id(lvgl.fetch("pages"), id)
  check(obj["x"] == 44 && obj["y"] == 28, "#{id} must be centred (x44/y28), not offset for a rail")
end

# Tik op de achtergrond: overal hetzelfde script.
taps = raw.scan(/script\.execute: page_background_tap/).size
check(taps >= 8, "expected the shared page_background_tap on every page, found #{taps}")
check(!raw.include?("review_nav_countdown"), "review page must not force the bars on after 30 s")

puts "OK: tile home shell contract"
RUBY
