#!/usr/bin/env bash

set -euo pipefail

root_dir="${IDOT_TIMER_BINDINGS_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
display_yaml="$root_dir/esphome/ha-display-7.yaml"

ruby - "$display_yaml" <<'RUBY'
require "yaml"

display = YAML.load_file(ARGV.fetch(0))

def check(condition, message)
  abort("FAIL: #{message}") unless condition
end

def component_by_id(nodes, id)
  Array(nodes).find { |node| node.is_a?(Hash) && node["id"] == id }
end

def script_action_entities(node)
  case node
  when Hash
    own = node["homeassistant.action"]
    entities = own.is_a?(Hash) ? [own["action"]] : []
    entities + node.values.flat_map { |value| script_action_entities(value) }
  when Array
    node.flat_map { |value| script_action_entities(value) }
  else
    []
  end
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

timer_input = component_by_id(display["globals"], "timer_input_minutes")
check(timer_input.is_a?(Hash), "missing timer_input_minutes global")
check(timer_input["type"] == "int", "timer_input_minutes must be an integer")
check(timer_input["restore_value"] == true, "timer_input_minutes must restore its value")
check(timer_input["initial_value"] == "0", "timer_input_minutes must initialize to zero")

timer_input_seconds = component_by_id(display["globals"], "timer_input_seconds")
check(timer_input_seconds.is_a?(Hash), "missing timer_input_seconds global")
check(timer_input_seconds["type"] == "int", "timer_input_seconds must be an integer")
check(timer_input_seconds["restore_value"] == true,
      "timer_input_seconds must restore its value")
check(timer_input_seconds["initial_value"] == "0",
      "timer_input_seconds must initialize to zero")

selected_field = component_by_id(display["globals"], "timer_selected_field")
check(selected_field.is_a?(Hash) && selected_field["type"] == "int",
      "missing integer timer_selected_field global")
check(selected_field["restore_value"] == false && selected_field["initial_value"] == "0",
      "timer_selected_field must start on minutes without restoring")

display_seconds = component_by_id(display["globals"], "timer_display_seconds")
finish_timestamp = component_by_id(display["globals"], "timer_finish_timestamp")
add_pending = component_by_id(display["globals"], "timer_add_minute_pending")
add_pending_ticks = component_by_id(display["globals"], "timer_add_minute_pending_ticks")
check(display_seconds.is_a?(Hash) && display_seconds["type"] == "int",
      "missing integer timer_display_seconds anchor")
check(finish_timestamp.is_a?(Hash) && finish_timestamp["type"] == "int64_t",
      "missing 64-bit timer_finish_timestamp anchor")
check(add_pending.is_a?(Hash) && add_pending["type"] == "bool",
      "missing timer_add_minute_pending synchronization flag")
check(add_pending_ticks.is_a?(Hash) && add_pending_ticks["type"] == "int",
      "missing timer_add_minute_pending_ticks timeout counter")

status = component_by_id(display["text_sensor"], "ha_idot_timer_status")
check(status.is_a?(Hash), "missing ha_idot_timer_status text sensor")
check(status.values_at("platform", "entity_id", "internal") ==
      ["homeassistant", "input_select.idotmatrix_timer_status", true],
      "timer status binding is incorrect")
check(deep_values(status["on_value"], "script.execute").include?("timer_ui_refresh"),
      "timer status updates must execute timer_ui_refresh")

# Home Assistant exposes timer.remaining as HH:MM:SS text. Keep that raw value so
# valid durations can be parsed locally rather than becoming NaN in a numeric sensor.
remaining = component_by_id(display["text_sensor"], "ha_idot_timer_remaining")
check(remaining.is_a?(Hash), "missing ha_idot_timer_remaining sensor")
check(remaining.values_at("platform", "entity_id", "attribute", "internal") ==
      ["homeassistant", "timer.idotmatrix_timer", "remaining", true],
      "timer remaining binding is incorrect")
check(deep_values(remaining["on_value"], "script.execute").include?("timer_ui_refresh"),
      "timer remaining updates must execute timer_ui_refresh")
remaining_update_code = deep_values(remaining["on_value"], "lambda").join("\n")
check(remaining_update_code.include?("paused") &&
      remaining_update_code.include?("timer_add_minute_pending) = false"),
      "paused remaining updates must confirm and release optimistic +1 state")
check(!remaining_update_code.include?("== \"running\""),
      "running remaining updates must not clear optimistic +1 before finishes_at")
check(Array(remaining["on_value"]).first.is_a?(Hash) &&
      Array(remaining["on_value"]).first.key?("lambda"),
      "paused remaining must clear pending before timer_ui_refresh")

finishes_at = component_by_id(display["text_sensor"], "ha_idot_timer_finishes_at")
check(finishes_at.is_a?(Hash), "missing ha_idot_timer_finishes_at sensor")
check(finishes_at.values_at("platform", "entity_id", "attribute", "internal") ==
      ["homeassistant", "timer.idotmatrix_timer", "finishes_at", true],
      "timer finishes_at binding is incorrect")
check(deep_values(finishes_at["on_value"], "script.execute").include?("timer_ui_refresh"),
      "timer finishes_at updates must re-anchor timer_ui_refresh")
finishes_update_code = deep_values(finishes_at["on_value"], "lambda").join("\n")
check(finishes_update_code.include?("running") &&
      finishes_update_code.include?("timer_add_minute_pending) = false"),
      "running finishes_at updates must confirm and release optimistic +1 state")
check(!finishes_update_code.include?("== \"paused\""),
      "paused finishes_at updates must not clear optimistic +1 before remaining")
check(Array(finishes_at["on_value"]).first.is_a?(Hash) &&
      Array(finishes_at["on_value"]).first.key?("lambda"),
      "running finishes_at must clear pending before timer_ui_refresh")

scripts = Array(display["script"])
required_scripts = %w[
  timer_digit_append
  timer_input_clear
  timer_start_command
  timer_pause_resume_command
  timer_add_minute_command
  timer_stop_command
  timer_acknowledge_command
  timer_display_tick
  timer_ui_refresh
]
required_scripts.each do |id|
  check(component_by_id(scripts, id).is_a?(Hash), "missing ESPHome script #{id}")
end

digit_append = component_by_id(scripts, "timer_digit_append")
check(digit_append.dig("parameters", "digit") == "int",
      "timer_digit_append must accept an integer digit")
digit_code = deep_values(digit_append, "lambda").join("\n")
check(digit_code.include?("digit < 0") && digit_code.include?("digit > 9"),
      "timer_digit_append must reject values outside 0..9")
check(digit_code.include?("timer_selected_field") &&
      digit_code.include?("timer_input_minutes") && digit_code.include?("timer_input_seconds"),
      "timer_digit_append must route digits to the selected field")
check(digit_code.include?("99") && digit_code.include?("59"),
      "timer_digit_append must clamp minutes to 99 and seconds to 59")

input_clear = component_by_id(scripts, "timer_input_clear")
clear_code = deep_values(input_clear, "lambda").join("\n")
check(clear_code.include?("timer_selected_field") &&
      clear_code.include?("id(timer_input_minutes) = 0") &&
      clear_code.include?("id(timer_input_seconds) = 0"),
      "timer_input_clear must clear only the selected minute or second field")

expected_actions = {
  "timer_start_command" => ["script.idotmatrix_timer_start"],
  "timer_pause_resume_command" => [
    "script.idotmatrix_timer_pause",
    "script.idotmatrix_timer_resume"
  ],
  "timer_add_minute_command" => ["script.idotmatrix_timer_add_minute"],
  "timer_stop_command" => ["script.idotmatrix_timer_stop"],
  "timer_acknowledge_command" => ["script.idotmatrix_timer_acknowledge"]
}
expected_actions.each do |script_id, expected|
  actual = script_action_entities(component_by_id(scripts, script_id))
  check(actual.sort == expected.sort,
        "#{script_id} must call exactly #{expected.join(', ')}")
end

start = component_by_id(scripts, "timer_start_command")
start_lambdas = deep_values(start, "lambda").join("\n")
check(start_lambdas.include?("timer_input_minutes") &&
      start_lambdas.include?("timer_input_seconds") &&
      start_lambdas.match?(/\*\s*60\s*\+/),
      "timer_start_command must reject only a zero total duration")
start_templates = deep_values(start, "data_template")
check(start_templates.any? { |value| value.is_a?(Hash) && value["minutes"] == "{{ minutes }}" },
      "timer_start_command must pass the minutes field")
check(start_templates.any? { |value| value.is_a?(Hash) && value["seconds"] == "{{ seconds }}" },
      "timer_start_command must pass the seconds field")
check(deep_values(start, "variables").any? do |value|
        value.is_a?(Hash) && value.key?("minutes") && value["minutes"].to_s.include?("timer_input_minutes")
      end,
      "timer_start_command minutes must come from timer_input_minutes")
check(deep_values(start, "variables").any? do |value|
        value.is_a?(Hash) && value.key?("seconds") && value["seconds"].to_s.include?("timer_input_seconds")
      end,
      "timer_start_command seconds must come from timer_input_seconds")
check(deep_values(start, "script.execute").include?("timer_ui_refresh"),
      "timer_start_command must refresh after dispatching Start")

pause_resume = component_by_id(scripts, "timer_pause_resume_command")
pause_resume_lambdas = deep_values(pause_resume, "lambda").join("\n")
check(pause_resume_lambdas.include?("running") && pause_resume_lambdas.include?("paused"),
      "timer_pause_resume_command must branch on running and paused status")

refresh = component_by_id(scripts, "timer_ui_refresh")
refresh_code = deep_values(refresh, "lambda").join("\n")
check(refresh_code.include?("unknown") && refresh_code.include?("unavailable"),
      "timer_ui_refresh must recognize unavailable Home Assistant state")
check(refresh_code.match?(/idle\s*=\s*status\s*==\s*"idle"/),
      "only the explicit idle status may expose idle controls")
check(refresh_code.include?("remaining_seconds = 0"),
      "timer_ui_refresh must default unparseable durations to zero")
check(refresh_code.include?("id(timer_input_minutes) < 0") &&
      refresh_code.include?("id(timer_input_minutes) > 99"),
      "timer_ui_refresh must normalize restored input to 0..99")
check(refresh_code.include?("id(timer_input_seconds) < 0") &&
      refresh_code.include?("id(timer_input_seconds) > 59"),
      "timer_ui_refresh must normalize restored seconds to 0..59")
check(refresh_code.include?("ESPTime::strptime") &&
      refresh_code.include?("recalc_timestamp_utc") &&
      refresh_code.include?("timer_finish_timestamp"),
      "timer_ui_refresh must parse finishes_at as an offset-aware UTC timestamp")
check(refresh_code.match?(/finish_raw\[zone_pos\]\s*==\s*'\+'\)\s*finish_time\.timestamp\s*-=\s*offset_seconds;\s*else\s*finish_time\.timestamp\s*\+=\s*offset_seconds;/m),
      "positive ISO offsets must subtract and negative offsets must add")
check(refresh_code.include?("finish_raw[19] == '.'") &&
      refresh_code.include?("zone_pos + 1 == finish_raw.size()") &&
      refresh_code.include?("finish_raw.size() == zone_pos + 6"),
      "finishes_at parser must validate fractional and timezone suffix boundaries")

tick = component_by_id(scripts, "timer_display_tick")
tick_code = deep_values(tick, "lambda").join("\n")
check(tick_code.include?("ha_time).now()") && tick_code.include?("now.timestamp") &&
      tick_code.include?("timer_finish_timestamp"),
      "running ticks must derive remaining time from finishes_at minus HA time")
check(tick_code.include?("paused") && tick_code.include?("timer_display_seconds"),
      "paused ticks must preserve the fixed anchored remaining time")
check(tick_code.include?("%02d:%02d"), "timer ticks must render MM:SS")

add_minute = component_by_id(scripts, "timer_add_minute_command")
add_minute_code = deep_values(add_minute, "lambda").join("\n")
check(add_minute_code.include?("timer_display_seconds") &&
      add_minute_code.match?(/\+\s*60/),
      "+1 must optimistically add 60 seconds to the displayed remaining time")
check(add_minute_code.include?("timer_finish_timestamp"),
      "+1 must keep the running finish anchor aligned with its optimistic display")
check(add_minute_code.include?("5999"),
      "+1 optimistic display must honor Home Assistant's 5999-second cap")
check(add_minute_code.include?("timer_add_minute_pending) = true") &&
      add_minute_code.include?("timer_add_minute_pending_ticks) = 0"),
      "+1 must mark its optimistic display pending before the HA call")
check(refresh_code.scan("if (!id(timer_add_minute_pending))").length == 2,
      "running and paused refreshes must preserve optimistic state until confirmation")
check(tick_code.include?("timer_add_minute_pending_ticks") &&
      tick_code.include?(">= 5") && tick_code.include?("timer_ui_refresh).execute"),
      "optimistic +1 must time out to an authoritative refresh if HA does not confirm")

add_minute_actions = Array(add_minute["then"])
check(add_minute_actions.length == 3 &&
      add_minute_actions[0].is_a?(Hash) && add_minute_actions[0].key?("lambda") &&
      add_minute_actions[1] == {"script.execute" => "timer_display_tick"} &&
      add_minute_actions[2].is_a?(Hash) &&
      add_minute_actions[2].dig("homeassistant.action", "action") ==
        "script.idotmatrix_timer_add_minute",
      "+1 must render optimistic state before dispatching exactly one HA action")

timer_intervals = Array(display["interval"]).select { |node| node["interval"] == "1s" }
check(timer_intervals.any? do |node|
        deep_values(node, "script.execute").include?("timer_display_tick")
      end,
      "a one-second interval must execute timer_display_tick")

puts "iDot timer ESPHome bindings and commands are structurally valid"
RUBY
