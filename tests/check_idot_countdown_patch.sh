#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
require_literal "$init_fragment" 'hass.services.async_register(DOMAIN, "set_countdown", async_set_countdown)'

grep -Eq '^set_countdown:$' "$services"
grep -Eq '^    mode:$' "$services"
grep -Eq '^          min: 0$' "$services"
grep -Eq '^          max: 3$' "$services"
grep -Eq '^    minutes:$' "$services"
grep -Eq '^          max: 99$' "$services"
grep -Eq '^    seconds:$' "$services"
grep -Eq '^          max: 59$' "$services"

box_count="$(grep -Ec '^          mode: box$' "$services")"
[[ "$box_count" -eq 3 ]]

echo "iDot countdown patch fragments are structurally valid"
