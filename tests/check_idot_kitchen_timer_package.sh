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
selector = start_script.dig("fields", "minutes", "selector", "number")
check(selector.is_a?(Hash), "start minutes field has no number selector")
check(selector.values_at("min", "max", "step") == [1, 99, 1],
      "start minutes selector must enforce whole minutes 1..99")

start_sequence = start_script.fetch("sequence")
first_side_effect_index = start_sequence.index { |step| step.key?("action") }
check(!first_side_effect_index.nil?, "start script has no side effects")

minutes_guard_index = start_sequence.index do |step|
  step["condition"] == "template" &&
    step.fetch("value_template", "").include?("1 <= timer_minutes <= 99") &&
    step.fetch("value_template", "").include?("minutes | float(0) == timer_minutes")
end
check(!minutes_guard_index.nil?, "start script does not validate whole minutes 1..99")
check(minutes_guard_index < first_side_effect_index,
      "start minutes guard must run before all side effects")

idle_guard_index = start_sequence.index do |step|
  step["condition"] == "state" &&
    step["entity_id"] == "input_select.idotmatrix_timer_status" &&
    step["state"] == "idle"
end
check(!idle_guard_index.nil?, "start script has no idle source-state guard")
check(idle_guard_index < first_side_effect_index,
      "start idle guard must run before all side effects")

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
