#!/usr/bin/env bash

set -euo pipefail

root_dir="${IDOT_KITCHEN_TIMER_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
package="$root_dir/home-assistant/ha-display-7-package.yaml"

require_literal() {
  local expected="$1"
  if ! grep -Fq "$expected" "$package"; then
    printf 'Missing required package fragment: %s\n' "$expected" >&2
    exit 1
  fi
}

require_literal "  idotmatrix_timer_status:"
require_literal "    options: [idle, running, paused, alarming]"
require_literal "    initial: idle"
require_literal "  idotmatrix_timer_minuten:"
require_literal "    min: 0"
require_literal "    max: 99"
require_literal "    step: 1"
require_literal "    mode: box"
require_literal "  idotmatrix_timer:"
require_literal "    restore: false"

for script_name in start pause resume add_minute stop acknowledge; do
  require_literal "  idotmatrix_timer_${script_name}:"
done

require_literal "      event_type: timer.finished"
require_literal "          entity_id: timer.idotmatrix_timer"
require_literal "        entity_id: input_select.idotmatrix_timer_status"
require_literal "        state: alarming"
require_literal "        while:"
require_literal "            state: alarming"
require_literal "          - action: reolink.play_chime"
require_literal "              device_id: 271cbe4bff5083fb97aabac7f63f9f66"
require_literal "              ringtone: goodday"

echo "iDot kitchen timer package is structurally valid"
