#!/usr/bin/env bash

set -euo pipefail

root_dir="${IDOT_KITCHEN_TIMER_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
package="$root_dir/home-assistant/ha-display-7-package.yaml"

ruby - "$package" <<'RUBY'
require "yaml"

package = YAML.load_file(ARGV.fetch(0))

def check(condition, message)
  abort("FAIL: #{message}") unless condition
end

status = package.dig("input_select", "idotmatrix_timer_status")
check(status.is_a?(Hash), "missing input_select.idotmatrix_timer_status")
check(status["name"] == "iDotMatrix timer status", "timer status name is incorrect")
check(status["options"] == %w[idle running paused alarming], "timer status options are incorrect")
check(status["initial"] == "idle", "timer status initial value is not idle")

minutes = package.dig("input_number", "idotmatrix_timer_minuten")
check(minutes.is_a?(Hash), "missing input_number.idotmatrix_timer_minuten")
check(minutes["name"] == "iDotMatrix timer minuten", "timer minutes name is incorrect")
check(minutes.values_at("min", "max", "step", "mode") == [0, 99, 1, "box"],
      "timer minutes must use range 0..99, step 1, mode box")

timer = package.dig("timer", "idotmatrix_timer")
check(timer.is_a?(Hash), "missing timer.idotmatrix_timer")
check(timer["name"] == "iDotMatrix timer", "timer name is incorrect")
check(timer["duration"] == "00:05:00", "timer default duration is incorrect")
check(timer["restore"] == false, "timer restore must be false")

scripts = package.fetch("script", {})
script_names = %w[start pause resume add_minute stop acknowledge]
script_names.each do |name|
  node = scripts["idotmatrix_timer_#{name}"]
  check(node.is_a?(Hash), "missing script.idotmatrix_timer_#{name}")
  check(node["sequence"].is_a?(Array), "script.idotmatrix_timer_#{name} has no sequence")
end

start_script = scripts.fetch("idotmatrix_timer_start")
seconds_field = start_script.dig("fields", "seconds")
check(seconds_field.is_a?(Hash), "start script has no seconds field")
check(seconds_field["required"] == false && seconds_field["default"] == 0,
      "start seconds field must be optional and default to zero")
seconds_selector = seconds_field.dig("selector", "number")
check(seconds_selector.is_a?(Hash), "start seconds field has no number selector")
check(seconds_selector.values_at("min", "max", "step") == [0, 59, 1],
      "start seconds selector must enforce whole seconds 0..59")

selector = start_script.dig("fields", "minutes", "selector", "number")
check(selector.is_a?(Hash), "start minutes field has no number selector")
check(selector.values_at("min", "max", "step") == [0, 99, 1],
      "start minutes selector must allow whole minutes 0..99")

start_sequence = start_script.fetch("sequence")
first_side_effect_index = start_sequence.index { |step| step.key?("action") }
check(!first_side_effect_index.nil?, "start script has no side effects")

input_guard_index = start_sequence.index do |step|
  template = step.fetch("value_template", "")
  step["condition"] == "template" &&
    template.include?("minutes is defined") &&
    template.include?("minutes is number") &&
    template.include?("minutes is not boolean") &&
    template.include?("minutes | float == minutes | int") &&
    template.include?("seconds if seconds is defined else 0") &&
    template.include?("raw_seconds is number") &&
    template.include?("raw_seconds is not boolean") &&
    template.include?("raw_seconds | float == raw_seconds | int")
end
check(!input_guard_index.nil?,
      "start script has no strict numeric-integral input guard")

normalization_variables_index = start_sequence.index do |step|
  variables = step["variables"]
  variables.is_a?(Hash) && variables.key?("timer_minutes")
end
check(!normalization_variables_index.nil?, "start script has no input normalization")
check(input_guard_index < normalization_variables_index,
      "start input guard must run before coercive normalization")
check(input_guard_index < first_side_effect_index,
      "start input guard must run before all side effects")

input_variables = start_sequence.map { |step| step["variables"] }.compact.reduce({}, :merge)
check(input_variables.fetch("timer_seconds", "").include?("default(0"),
      "start script does not apply the optional seconds default at runtime")

total_variables_index = start_sequence.index do |step|
  variables = step["variables"]
  variables.is_a?(Hash) &&
    variables.fetch("total_seconds", "").include?("timer_minutes * 60 + timer_seconds")
end
check(!total_variables_index.nil?, "start script does not calculate total seconds")

normalized_variables_index = start_sequence.index do |step|
  variables = step["variables"]
  variables.is_a?(Hash) &&
    variables.fetch("normalized_minutes", "").include?("total_seconds") &&
    variables.fetch("normalized_minutes", "").include?("// 60") &&
    variables.fetch("normalized_seconds", "").include?("total_seconds") &&
    variables.fetch("normalized_seconds", "").include?("% 60")
end
check(!normalized_variables_index.nil?, "start script does not normalize minutes and seconds")

duration_guard_index = start_sequence.index do |step|
  step["condition"] == "template" &&
    step.fetch("value_template", "").include?("1 <= total_seconds <= 5999") &&
    step.fetch("value_template", "").include?("minutes | float(0) == timer_minutes") &&
    step.fetch("value_template", "").include?(
      "seconds | default(0, true) | float(0) == timer_seconds"
    )
end
check(!duration_guard_index.nil?, "start script does not validate integer input totaling 1..5999 seconds")
check(duration_guard_index < first_side_effect_index,
      "start duration guard must run before all side effects")

idle_guard_index = start_sequence.index do |step|
  step["condition"] == "state" &&
    step["entity_id"] == "input_select.idotmatrix_timer_status" &&
    step["state"] == "idle"
end
check(!idle_guard_index.nil?, "start script has no idle source-state guard")
check(idle_guard_index < first_side_effect_index,
      "start idle guard must run before all side effects")

start_native = start_sequence.find { |step| step["action"] == "idotmatrix.set_countdown" }
check(start_native.is_a?(Hash), "start script has no native countdown action")
check(start_native.dig("data", "mode") == 1,
      "start script must send a fresh native countdown start")
check(start_native.dig("data", "minutes").to_s.include?("normalized_minutes") &&
      start_native.dig("data", "seconds").to_s.include?("normalized_seconds"),
      "start native countdown does not use normalized minutes and seconds")

start_ha = start_sequence.find { |step| step["action"] == "timer.start" }
start_duration = start_ha&.dig("data", "duration").to_s
check(start_duration.include?("total_seconds") &&
      start_duration.include?("// 3600") &&
      start_duration.include?("% 3600") &&
      start_duration.include?("% 60"),
      "start HA timer does not use the exact normalized total duration")

add_minute_script = scripts.fetch("idotmatrix_timer_add_minute")
add_minute_sequence = add_minute_script.fetch("sequence")
remaining_variables = add_minute_sequence.map { |step| step["variables"] }.compact.reduce({}, :merge)
running_remaining = remaining_variables.fetch("remaining_seconds", "").to_s
check(running_remaining.include?("original_status == 'running'") &&
      running_remaining.include?("finishes_at") &&
      running_remaining.include?("now()"),
      "add-minute running duration must derive from finishes_at and now")
check(running_remaining.include?("remaining_parts"),
      "add-minute paused duration must derive from fixed remaining")

new_remaining = remaining_variables.fetch("new_remaining_seconds", "").to_s
check(new_remaining.include?("+ 60") && new_remaining.include?("5999"),
      "add-minute must add exactly 60 seconds and cap at 5999")

add_native = add_minute_sequence.find { |step| step["action"] == "idotmatrix.set_countdown" }
check(add_native.is_a?(Hash), "add-minute script has no native countdown action")
check(add_native.dig("data", "mode") == 1,
      "add-minute must send a fresh native countdown start with mode 1")
check(add_native.dig("data", "minutes").to_s.include?("new_remaining_seconds") &&
      add_native.dig("data", "seconds").to_s.include?("new_remaining_seconds"),
      "add-minute native countdown does not use the new normalized duration")

paused_branch = add_minute_sequence.find { |step| step.key?("if") }
paused_actions = paused_branch&.fetch("then", []) || []
check(paused_actions.any? { |step| step["action"] == "timer.pause" },
      "add-minute no longer re-pauses the HA timer")
check(paused_actions.any? do |step|
        step["action"] == "idotmatrix.set_countdown" && step.dig("data", "mode") == 2
      end,
      "add-minute no longer re-pauses the native timer")
check(paused_actions.any? do |step|
        step["action"] == "input_select.select_option" &&
          step.dig("target", "entity_id") == "input_select.idotmatrix_timer_status" &&
          step.dig("data", "option") == "paused"
      end,
      "add-minute paused branch no longer finishes with paused status")

automations = package.fetch("automation", [])
finished = automations.find { |node| node["id"] == "idotmatrix_timer_finished" }
check(finished.is_a?(Hash), "missing idotmatrix_timer_finished automation")
finished_trigger = finished.fetch("trigger", []).find do |trigger|
  trigger["trigger"] == "event" &&
    trigger["event_type"] == "timer.finished" &&
    trigger.dig("event_data", "entity_id") == "timer.idotmatrix_timer"
end
check(!finished_trigger.nil?, "timer-finished automation has the wrong event relationship")
finished_action = finished.fetch("action", []).find do |action|
  action["action"] == "input_select.select_option" &&
    action.dig("target", "entity_id") == "input_select.idotmatrix_timer_status" &&
    action.dig("data", "option") == "alarming"
end
check(!finished_action.nil?, "timer-finished automation does not select alarming")

alarm = automations.find { |node| node["id"] == "idotmatrix_timer_alarm" }
check(alarm.is_a?(Hash), "missing idotmatrix_timer_alarm automation")
check(alarm["mode"] == "restart", "timer alarm automation must use restart mode")
alarm_trigger = alarm.fetch("trigger", []).find do |trigger|
  trigger["trigger"] == "state" &&
    trigger["entity_id"] == "input_select.idotmatrix_timer_status" &&
    trigger["to"] == "alarming"
end
check(!alarm_trigger.nil?, "timer alarm automation has the wrong state trigger")

repeat = alarm.dig("action", 0, "repeat")
check(repeat.is_a?(Hash), "timer alarm automation has no repeat loop")
repeat_sequence = repeat.fetch("sequence", [])
pre_chime_guard = repeat_sequence.first
check(pre_chime_guard.is_a?(Hash) &&
      pre_chime_guard["condition"] == "state" &&
      pre_chime_guard["entity_id"] == "input_select.idotmatrix_timer_status" &&
      pre_chime_guard["state"] == "alarming",
      "alarm loop must check alarming before every chime")
chime = repeat_sequence.find { |step| step["action"] == "reolink.play_chime" }
check(chime.is_a?(Hash), "alarm loop has no Reolink chime action")
check(chime.dig("target", "device_id") == "271cbe4bff5083fb97aabac7f63f9f66",
      "alarm loop targets the wrong Reolink device")
check(chime.dig("data", "ringtone") == "goodday", "alarm loop uses the wrong ringtone")
while_guard = repeat.fetch("while", []).first
check(while_guard.is_a?(Hash) &&
      while_guard["condition"] == "state" &&
      while_guard["entity_id"] == "input_select.idotmatrix_timer_status" &&
      while_guard["state"] == "alarming",
      "alarm repeat while-guard must require alarming")

puts "iDot kitchen timer package YAML relationships are valid"
RUBY
