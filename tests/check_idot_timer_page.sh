#!/usr/bin/env bash

set -euo pipefail

root_dir="${IDOT_TIMER_PAGE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
display_yaml="$root_dir/esphome/ha-display-7.yaml"

ruby - "$display_yaml" <<'RUBY'
require "yaml"

display = YAML.load_file(ARGV.fetch(0))

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

def widgets_of_type(node, type)
  case node
  when Hash
    own = node[type].is_a?(Hash) ? [node[type]] : []
    own + node.values.flat_map { |value| widgets_of_type(value, type) }
  when Array
    node.flat_map { |value| widgets_of_type(value, type) }
  else
    []
  end
end

def wrapper_for_widget_id(node, id)
  widgets_of_type(node, "obj").find do |obj|
    Array(obj["widgets"]).any? do |widget|
      widget.is_a?(Hash) && widget.values.any? do |properties|
        properties.is_a?(Hash) && properties["id"] == id
      end
    end
  end
end

lvgl = display.fetch("lvgl")
nav = find_by_id(lvgl.fetch("top_layer"), "nav_rail_container")
check(nav.is_a?(Hash), "missing nav rail")

nav_ids = %w[
  nav_energie nav_lichten nav_weather nav_agenda nav_immich nav_recepten nav_timer
]
strip_ids = %w[
  nav_strip_energie nav_strip_lichten nav_strip_weather nav_strip_agenda
  nav_strip_immich nav_strip_recepten nav_strip_timer
]
expected_y = [64, 136, 208, 280, 352, 424, 496]

nav_ids.zip(strip_ids, expected_y).each do |button_id, strip_id, y|
  button = find_by_id(nav, button_id)
  strip = find_by_id(nav, strip_id)
  wrapper = wrapper_for_widget_id(nav, button_id)
  check(button.is_a?(Hash), "missing navigation button #{button_id}")
  check(strip.is_a?(Hash), "missing navigation strip #{strip_id}")
  check(button.values_at("width", "height") == [56, 56],
        "#{button_id} must retain its 56x56 touch target")
  check(wrapper.is_a?(Hash) && wrapper.values_at("y", "height") == [y, 64],
        "#{button_id} row must be 64px high at y=#{y}")
end

logo = widgets_of_type(nav, "obj").find do |obj|
  obj["align"] == "TOP_MID" && obj["width"] == 44 && obj["height"] == 44
end
check(logo.is_a?(Hash) && logo["y"] == 12, "navigation logo must remain at y=12")

timer_nav = find_by_id(nav, "nav_timer")
check(deep_values(timer_nav, "page_index").include?(6),
      "Timer navigation button must select page index 6")
check(deep_values(timer_nav, "text_font").include?("font_icon_28"),
      "Timer navigation button must use the bundled icon font")
check(deep_values(timer_nav, "text").include?("\u{F0150}"),
      "Timer navigation button must show the bundled clock-outline glyph")

timer_page = find_by_id(lvgl.fetch("pages"), "page_timer")
check(timer_page.is_a?(Hash), "missing page_timer")
check(timer_page.values_at("bg_color", "bg_opa", "scrollable") == [0, "COVER", false],
      "page_timer must use the non-scrollable black page style")

required_groups = %w[timer_idle_controls timer_active_controls timer_alarm_card]
required_groups.each do |id|
  check(find_by_id(timer_page, id).is_a?(Hash), "missing Timer state group #{id}")
end

required_buttons = %w[
  btn_timer_preset_5 btn_timer_preset_10 btn_timer_preset_15 btn_timer_preset_20
  btn_timer_digit_0 btn_timer_digit_1 btn_timer_digit_2 btn_timer_digit_3
  btn_timer_digit_4 btn_timer_digit_5 btn_timer_digit_6 btn_timer_digit_7
  btn_timer_digit_8 btn_timer_digit_9 btn_timer_clear btn_timer_backspace
  btn_timer_start btn_timer_pause_resume btn_timer_add_minute btn_timer_stop
  btn_timer_alarm_off
]
required_buttons.each do |id|
  check(find_by_id(timer_page, id).is_a?(Hash), "missing Timer button #{id}")
end

widgets_of_type(timer_page, "button").each do |button|
  check(button["height"].is_a?(Integer) && button["height"] >= 44,
        "Timer button #{button.fetch("id", "without id")} must be at least 44px high")
end

required_labels = ["5 min", "10 min", "15 min", "20 min", "Start op iDot",
                   "Pauzeren", "+1 minuut", "Stoppen", "ALARM UIT"]
page_text = deep_values(timer_page, "text")
required_labels.each do |text|
  check(page_text.include?(text), "missing Timer control label #{text.inspect}")
end

expected_commands = {
  "btn_timer_clear" => "timer_input_clear",
  "btn_timer_start" => "timer_start_command",
  "btn_timer_pause_resume" => "timer_pause_resume_command",
  "btn_timer_add_minute" => "timer_add_minute_command",
  "btn_timer_stop" => "timer_stop_command"
}
expected_commands.each do |button_id, command_id|
  actions = deep_values(find_by_id(timer_page, button_id), "script.execute")
  check(actions.include?(command_id), "#{button_id} must execute #{command_id}")
end

{5 => "btn_timer_preset_5", 10 => "btn_timer_preset_10",
 15 => "btn_timer_preset_15", 20 => "btn_timer_preset_20"}.each do |minutes, button_id|
  code = deep_values(find_by_id(timer_page, button_id), "lambda").join("\n")
  check(code.include?("timer_input_minutes) = #{minutes}"),
        "#{button_id} must select #{minutes} minutes")
end

(0..9).each do |digit|
  button = find_by_id(timer_page, "btn_timer_digit_#{digit}")
  actions = deep_values(button, "script.execute")
  check(actions.any? do |action|
          action.is_a?(Hash) && action["id"] == "timer_digit_append" && action["digit"] == digit
        end,
        "digit #{digit} must append its own value")
end

keypad_ids = (0..9).map { |digit| "btn_timer_digit_#{digit}" } +
             %w[btn_timer_clear btn_timer_backspace]
keypad_buttons = keypad_ids.map { |id| find_by_id(timer_page, id) }
check(keypad_buttons.map { |button| button["x"] }.uniq.length == 3 &&
      keypad_buttons.map { |button| button["y"] }.uniq.length == 4,
      "numeric input must be laid out as a 3x4 keypad")

backspace_code = deep_values(find_by_id(timer_page, "btn_timer_backspace"), "lambda").join("\n")
check(backspace_code.include?("timer_input_minutes) /= 10"),
      "backspace must remove the last entered digit")

alarm_actions = deep_values(find_by_id(timer_page, "btn_timer_alarm_off"), "script.execute")
check(alarm_actions == ["timer_acknowledge_command"],
      "Alarm off must execute only timer_acknowledge_command")
check(deep_values(find_by_id(timer_page, "btn_timer_alarm_off"), "homeassistant.action").empty?,
      "Alarm off must not call Home Assistant directly")

scripts = display.fetch("script")
nav_select = find_by_id(scripts, "nav_select")
nav_code = deep_values(nav_select, "lambda").join("\n")
%w[active_colors strips buttons].each do |array|
  check(nav_code.match?(/#{array}\[7\]/), "nav_select #{array} array must contain seven entries")
end
check(nav_code.match?(/i\s*<\s*7/), "nav_select must update all seven navigation rows")
check(nav_code.include?("id(nav_timer)") && nav_code.include?("id(nav_strip_timer)"),
      "nav_select must include the Timer button and strip")

goto_page = find_by_id(scripts, "goto_page")
timer_branch = deep_values(goto_page, "if").find do |branch|
  branch.is_a?(Hash) && deep_values(branch["condition"], "lambda").any? do |code|
    code.include?("page_index == 6")
  end
end
check(timer_branch.is_a?(Hash), "goto_page must branch on page index 6")
check(deep_values(timer_branch, "lvgl.page.show") == ["page_timer"],
      "goto_page index 6 must show only page_timer")

refresh = find_by_id(scripts, "timer_ui_refresh")
refresh_code = deep_values(refresh, "lambda").join("\n")
%w[idle running paused alarming].each do |status|
  check(refresh_code.include?(status), "timer_ui_refresh must handle #{status} status")
end
check(refresh_code.include?("%02d:%02d"), "timer_ui_refresh must format MM:SS")
check(refresh_code.include?("Hervatten"),
      "timer_ui_refresh must relabel the pause control when paused")
check(refresh_code.include?("timer_idle_controls") &&
      refresh_code.include?("timer_active_controls") &&
      refresh_code.include?("timer_alarm_card"),
      "timer_ui_refresh must switch all Timer state groups")

puts "PASS: iDot Timer navigation, page controls, actions and state presentation are structurally valid"
RUBY
