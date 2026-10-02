#!/usr/bin/env bash
# Contract van de Buienradar-tegel: eigen pagina, één verzamelplaatje met software-
# decode, animatie via offset_y, en geen per-frame-downloads meer.

set -euo pipefail

root_dir="${RADAR_TILE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
display_yaml="$root_dir/esphome/ha-display-7.yaml"
package_yaml="$root_dir/home-assistant/ha-display-7-package.yaml"
radar_py="$root_dir/home-assistant/buienradar_radar_7inch.py"

ruby - "$display_yaml" "$package_yaml" "$radar_py" <<'RUBY'
require "yaml"

display_path, package_path, radar_py = ARGV
raw = File.read(display_path, encoding: "UTF-8")
display = YAML.load_file(display_path)
package_raw = File.read(package_path, encoding: "UTF-8")
script_raw = File.read(radar_py, encoding: "UTF-8")

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

art = display.fetch("artwork_image").find { |image| image["id"] == "radar_art" }
check(art, "missing radar_art")
check(art["url"].end_with?("/radar_sheet.jpg"), "radar_art must load the single sheet")
check(art["resize"] == "550x6144", "radar_art must be 12 frames of 550x512 stacked")
check(art["hardware_acceleration"] == false, "radar sheet must use software decode")

check(!raw.match?(/radar_%d\.jpg|radar_\d\.jpg/), "no per-frame radar downloads may remain")
check(!raw.include?("weather_radar_card"), "the weather page must not show the radar image any more")
check(raw.scan("src: radar_art").size == 1, "only the radar page may show radar_art")

pages = display.fetch("lvgl").fetch("pages")
page = find_by_id(pages, "page_radar")
check(page, "missing page_radar")
img = find_by_id(page, "img_radar")
check(img && img.values_at("width", "height") == [550, 512], "img_radar must show one 550x512 frame")

bars = find_by_id(page, "radar_rain_bars")
check(bars && bars.fetch("widgets").count { |w| w.key?("bar") } == 12,
      "radar page needs the 12 rain bars of the weather page (one per 10-min frame)")
check(raw.include?("lv_image_set_offset_y(id(img_radar), -512 * id(radar_frame))"),
      "the animation must shift the sheet, not reload it")
interval = display.fetch("interval").find { |entry| entry.to_s.include?("img_radar") }
check(interval && interval["interval"] == "100ms", "radar animation must tick at 100ms")
check(!interval.to_s.include?("set_url"), "the animation tick must never start a download")

goto_page = find_by_id(display.fetch("script"), "goto_page")
check(goto_page.to_s.include?("page_radar"), "goto_page must show page_radar for index 8")
link = find_by_id(pages, "weather_radar_link")
check(link && link.to_s.include?("page_index\"=>8"), "weather page needs a link to the radar page")

meta = display.fetch("text_sensor").find { |sensor| sensor["id"] == "ha_radar_meta" }
check(meta && meta["entity_id"] == "input_text.ha_display_radar_meta", "display must read the radar meta")

check(package_raw.include?("ha_display_radar_meta:"), "package must define input_text.ha_display_radar_meta")
check(package_raw.include?("response_variable: radar"), "automation must capture the script output")
check(script_raw.include?("sprite/RadarMapRainNL") && script_raw.include?("Forecast={FRAME_COUNT}"),
      "script must use Buienradar's sprite endpoint")
check(script_raw.include?("STEP_SECONDS = 600"), "Buienradar forecast frames are 10 minutes apart")

puts "OK: radar tile contract"
RUBY
