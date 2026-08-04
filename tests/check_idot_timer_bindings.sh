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

scripts = Array(display["script"])
required_scripts = %w[
  timer_digit_append
  timer_input_clear
  timer_start_command
  timer_pause_resume_command
  timer_add_minute_command
  timer_stop_command
  timer_acknowledge_command
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
check(digit_code.include?("99"), "timer_digit_append must clamp input to 99")

input_clear = component_by_id(scripts, "timer_input_clear")
check(deep_values(input_clear, "lambda").join("\n").include?("id(timer_input_minutes) = 0"),
      "timer_input_clear must reset local input to zero")

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
check(start_lambdas.include?("id(timer_input_minutes) > 0"),
      "timer_start_command must do nothing when input is zero")
start_templates = deep_values(start, "data_template")
check(start_templates.any? { |value| value.is_a?(Hash) && value["minutes"] == "{{ minutes }}" },
      "timer_start_command must pass the minutes field")
check(deep_values(start, "variables").any? do |value|
        value.is_a?(Hash) && value.key?("minutes") && value["minutes"].to_s.include?("timer_input_minutes")
      end,
      "timer_start_command minutes must come from timer_input_minutes")

pause_resume = component_by_id(scripts, "timer_pause_resume_command")
pause_resume_lambdas = deep_values(pause_resume, "lambda").join("\n")
check(pause_resume_lambdas.include?("running") && pause_resume_lambdas.include?("paused"),
      "timer_pause_resume_command must branch on running and paused status")

refresh = component_by_id(scripts, "timer_ui_refresh")
refresh_code = deep_values(refresh, "lambda").join("\n")
check(refresh_code.include?("unknown") && refresh_code.include?("unavailable"),
      "timer_ui_refresh must treat unavailable Home Assistant values as zero")
check(refresh_code.include?("remaining_seconds = 0"),
      "timer_ui_refresh must default unparseable durations to zero")
check(refresh_code.include?("id(timer_input_minutes) < 0") &&
      refresh_code.include?("id(timer_input_minutes) > 99"),
      "timer_ui_refresh must normalize restored input to 0..99")

puts "iDot timer ESPHome bindings and commands are structurally valid"
RUBY
