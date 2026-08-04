#!/usr/bin/env bash

set -euo pipefail

root_dir="${IDOT_COUNTDOWN_PATCH_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
coordinator="$root_dir/home-assistant/idotmatrix-countdown/coordinator.py.fragment"
init_fragment="$root_dir/home-assistant/idotmatrix-countdown/__init__.py.fragment"
services="$root_dir/home-assistant/idotmatrix-countdown/services.yaml.fragment"

require_literal() {
  local file="$1"
  local expected="$2"
  grep -Fqx "$expected" "$file"
}

require_literal "$coordinator" 'from .client.modules.countdown import Countdown'
require_literal "$coordinator" '    await countdown.setMode(mode, minutes, seconds)'
require_literal "$init_fragment" '    for entry_id, coordinator in hass.data[DOMAIN].items():'
require_literal "$init_fragment" '        if isinstance(coordinator, IDotMatrixCoordinator):'
require_literal "$init_fragment" '            await coordinator.async_set_countdown(mode, minutes, seconds)'
require_literal "$init_fragment" 'hass.services.async_register(DOMAIN, "set_countdown", async_set_countdown)'

require_field_minimum() {
  local field="$1"
  awk -v field="$field" '
    $0 == "    " field ":" { in_field = 1; next }
    in_field && /^    [[:alnum:]_]+:$/ { exit }
    in_field && /^          min: 0$/ { found = 1 }
    END { exit !found }
  ' "$services"
}

grep -Eq '^set_countdown:$' "$services"
grep -Eq '^    mode:$' "$services"
require_field_minimum mode
grep -Eq '^          max: 3$' "$services"
grep -Eq '^    minutes:$' "$services"
require_field_minimum minutes
grep -Eq '^          max: 99$' "$services"
grep -Eq '^    seconds:$' "$services"
require_field_minimum seconds
grep -Eq '^          max: 59$' "$services"

box_count="$(grep -Ec '^          mode: box$' "$services")"
[[ "$box_count" -eq 3 ]]

echo "iDot countdown patch fragments are structurally valid"
