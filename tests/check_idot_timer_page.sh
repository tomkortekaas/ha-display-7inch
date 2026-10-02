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
home = find_by_id(lvgl.fetch("pages"), "page_home")
check(home.is_a?(Hash), "missing tile home page")

timer_tile = find_by_id(home, "home_tile_timer")
check(timer_tile.is_a?(Hash), "missing Timer tile on the home page")
check(deep_values(timer_tile, "page_index").include?(6),
      "Timer tile must select page index 6")
check(deep_values(timer_tile, "text_font").include?("font_icon_48"),
      "Timer tile must use the bundled icon font")
check(deep_values(timer_tile, "text").include?("\u{F051B}"),
      "Timer tile must show the bundled timer-outline glyph")

timer_page = find_by_id(lvgl.fetch("pages"), "page_timer")
check(timer_page.is_a?(Hash), "missing page_timer")
check(timer_page.values_at("bg_color", "bg_opa", "scrollable") == [0, "COVER", false],
      "page_timer must use the non-scrollable black page style")

required_groups = %w[
  timer_input_fields timer_idle_controls timer_active_controls timer_alarm_card
  timer_unavailable_card
]
required_groups.each do |id|
  check(find_by_id(timer_page, id).is_a?(Hash), "missing Timer state group #{id}")
end
check(find_by_id(timer_page, "timer_time_card")["hidden"] == true &&
      find_by_id(timer_page, "timer_idle_controls")["hidden"] == true &&
      find_by_id(timer_page, "timer_active_controls")["hidden"] == true &&
      find_by_id(timer_page, "timer_alarm_card")["hidden"] == true,
      "all timer cards with actions must start hidden until HA status is known")
check(find_by_id(timer_page, "timer_unavailable_card")["hidden"] != true,
      "unavailable message must be the only timer state card visible at startup")

required_buttons = %w[
  btn_timer_preset_5 btn_timer_preset_10 btn_timer_preset_15 btn_timer_preset_20
  btn_timer_digit_0 btn_timer_digit_1 btn_timer_digit_2 btn_timer_digit_3
  btn_timer_digit_4 btn_timer_digit_5 btn_timer_digit_6 btn_timer_digit_7
  btn_timer_digit_8 btn_timer_digit_9 btn_timer_clear btn_timer_backspace
  btn_timer_field_minutes btn_timer_field_seconds
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

required_labels = ["MINUTEN", "SECONDEN", "5 min", "10 min", "15 min", "20 min", "Start op iDot",
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

{"btn_timer_field_minutes" => 0, "btn_timer_field_seconds" => 1}.each do |button_id, field|
  code = deep_values(find_by_id(timer_page, button_id), "lambda").join("\n")
  actions = deep_values(find_by_id(timer_page, button_id), "script.execute")
  check(code.include?("id(timer_selected_field) = #{field}"),
        "#{button_id} must select field #{field}")
  check(actions.include?("timer_ui_refresh"),
        "#{button_id} must refresh the selected-field highlight")
end

{5 => "btn_timer_preset_5", 10 => "btn_timer_preset_10",
 15 => "btn_timer_preset_15", 20 => "btn_timer_preset_20"}.each do |minutes, button_id|
  code = deep_values(find_by_id(timer_page, button_id), "lambda").join("\n")
  check(code.include?("timer_input_minutes) = #{minutes}"),
        "#{button_id} must select #{minutes} minutes")
  check(code.include?("timer_input_seconds) = 0"),
        "#{button_id} must reset seconds to zero")
  check(code.include?("timer_selected_field) = 0"),
        "#{button_id} must return input focus to minutes")
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
check(backspace_code.include?("timer_selected_field") &&
      backspace_code.include?("timer_input_minutes) /= 10") &&
      backspace_code.include?("timer_input_seconds) /= 10"),
      "backspace must remove a digit from only the selected field")

alarm_actions = deep_values(find_by_id(timer_page, "btn_timer_alarm_off"), "script.execute")
check(alarm_actions == ["timer_acknowledge_command"],
      "Alarm off must execute only timer_acknowledge_command")
check(deep_values(find_by_id(timer_page, "btn_timer_alarm_off"), "homeassistant.action").empty?,
      "Alarm off must not call Home Assistant directly")

scripts = display.fetch("script")
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
      refresh_code.include?("timer_alarm_card") &&
      refresh_code.include?("timer_unavailable_card"),
      "timer_ui_refresh must switch all Timer state groups")
check(refresh_code.include?("btn_timer_field_minutes") &&
      refresh_code.include?("btn_timer_field_seconds") &&
      refresh_code.include?("lv_obj_set_style_border_color"),
      "timer_ui_refresh must visibly highlight the selected input field")
check(refresh_code.include?("lbl_timer_input_minutes") &&
      refresh_code.include?("lbl_timer_input_seconds") &&
      refresh_code.include?("%02d"),
      "timer_ui_refresh must render both selected input values")
check(refresh_code.match?(/set_hidden\(id\(timer_idle_controls\),\s*!idle/),
      "idle controls must stay hidden unless status is explicitly idle")
check(refresh_code.match?(/set_hidden\(id\(timer_time_card\),\s*alarming\s*\|\|\s*unavailable\)/) &&
      refresh_code.match?(/set_hidden\(id\(timer_active_controls\),\s*!\(running\s*\|\|\s*paused\)\)/) &&
      refresh_code.match?(/set_hidden\(id\(timer_alarm_card\),\s*!alarming\)/),
      "unavailable and alarm transitions must hide every nonmatching timer card")
check(refresh_code.match?(/set_hidden\(id\(timer_unavailable_card\),\s*!unavailable/),
      "unknown and unavailable state must show only its dedicated message")

tick = find_by_id(scripts, "timer_display_tick")
tick_code = deep_values(tick, "lambda").join("\n")
check(tick_code.include?("running") && tick_code.include?("paused") &&
      tick_code.include?("%02d:%02d") && tick_code.include?("lbl_timer_time"),
      "one-second ticks must visibly update MM:SS for running and paused states")

puts "PASS: iDot Timer navigation, page controls, actions and state presentation are structurally valid"
RUBY
