#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_script="$root_dir/deploy-to-ha.sh"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

fake_bin="$tmp_dir/bin"
remote_bin="$tmp_dir/remote-bin"
remote_fixture="$tmp_dir/remote-fixture"
mkdir -p "$fake_bin" "$remote_bin" \
  "$remote_fixture/config/custom_components/idotmatrix" \
  "$remote_fixture/config/.storage"

cat >"$remote_fixture/config/custom_components/idotmatrix/__init__.py" <<'PY'
hass.services.async_register(DOMAIN, "set_countdown", async_set_countdown)
PY
cat >"$remote_fixture/config/custom_components/idotmatrix/coordinator.py" <<'PY'
async def async_set_countdown(self, mode, minutes, seconds):
    await countdown.setMode(mode, minutes, seconds)
PY
cat >"$remote_fixture/config/custom_components/idotmatrix/services.yaml" <<'YAML'
set_countdown:
  mode:
  minutes:
  seconds:
YAML
cat >"$remote_fixture/config/.storage/core.config_entries" <<'JSON'
{"data":{"entries":[{"domain":"idotmatrix","disabled_by":null}]}}
JSON
cat >"$remote_fixture/config/.storage/core.config_entries.missing" <<'JSON'
{"data":{"entries":[]}}
JSON

cat >"$remote_bin/ha" <<'SH'
#!/usr/bin/env bash
if [[ "$*" == "--raw-json core stats" ]]; then
  [[ "$SSH_PREFLIGHT_MODE" == "runtime_failure" ]] && exit 1
  printf '%s\n' '{"result":"ok","data":{"cpu_percent":1.0}}'
elif [[ "$*" == "core logs" ]]; then
  if [[ "$SSH_PREFLIGHT_MODE" == "setup_error" ]]; then
    printf '%s\n' "ERROR Setup failed for custom integration 'idotmatrix'"
  else
    printf '%s\n' 'Home Assistant initialized'
  fi
else
  exit 2
fi
SH
chmod +x "$remote_bin/ha"

cat >"$remote_bin/sudo" <<'SH'
#!/usr/bin/env bash
[[ "${1:-}" == "-n" ]] && shift
if [[ "${1:-}" == "grep" ]]; then
  [[ "$SSH_PREFLIGHT_MODE" == "missing_marker" ]] && exit 1
  args=("$@")
  last_index=$((${#args[@]} - 1))
  target="${args[$last_index]}"
  args[$last_index]="$DEPLOY_REMOTE_FIXTURE$target"
  exec "${args[@]}"
fi
if [[ "${1:-}" == "docker" && "${2:-}" == "exec" ]]; then
  code="${6:-}"
  entries_file=core.config_entries
  [[ "$SSH_PREFLIGHT_MODE" == "missing_entry" ]] && \
    entries_file=core.config_entries.missing
  mapped_path="$DEPLOY_REMOTE_FIXTURE/config/.storage/$entries_file"
  code="${code//\/config\/.storage\/core.config_entries/$mapped_path}"
  exec python3 -c "$code"
fi
exit 2
SH
chmod +x "$remote_bin/sudo"

cat >"$fake_bin/ssh" <<'SH'
#!/usr/bin/env bash
payload="$(cat)"
printf 'ssh %s\n' "$*" >>"$DEPLOY_COMMAND_LOG"
if [[ -n "$payload" ]]; then
  printf '%s\n' "$payload" >>"$DEPLOY_SSH_STDIN_LOG"
fi
if [[ "$*" == *"hassio@test-ha"* ]]; then
  PATH="$DEPLOY_REMOTE_BIN:$PATH" \
    SSH_PREFLIGHT_MODE="$SSH_PREFLIGHT_MODE" \
    DEPLOY_REMOTE_FIXTURE="$DEPLOY_REMOTE_FIXTURE" \
    /bin/bash -s <<<"$payload"
  exit $?
fi
exit 0
SH
chmod +x "$fake_bin/ssh"

cat >"$fake_bin/scp" <<'SH'
#!/usr/bin/env bash
printf 'scp %s\n' "$*" >>"$DEPLOY_COMMAND_LOG"
exit 0
SH
chmod +x "$fake_bin/scp"

run_deploy() {
  local preflight_mode="$1"
  local output_file="$2"
  DEPLOY_COMMAND_LOG="$tmp_dir/commands.log" \
    DEPLOY_SSH_STDIN_LOG="$tmp_dir/ssh-stdin.log" \
    SSH_PREFLIGHT_MODE="$preflight_mode" \
    DEPLOY_REMOTE_BIN="$remote_bin" \
    DEPLOY_REMOTE_FIXTURE="$remote_fixture" \
    PATH="$fake_bin:$PATH" \
    bash "$deploy_script" test-ha test-swipe >"$output_file" 2>&1
}

assert_no_ota_guidance() {
  local output_file="$1"
  if grep -Fq 'esphome run esphome/ha-display-7.yaml --device ha-display-7.local' \
    "$output_file"; then
    echo "FAIL: OTA guidance must not be offered after a failed SSH preflight" >&2
    exit 1
  fi
}

# The deployment path must never construct or transmit a bearer-authenticated plain
# HTTP service-registry request. This catches the original credential-exposure bug.
if grep -Eq 'HA_ACCESS_TOKEN|HA_SERVICES_URL|Authorization|Bearer|/api/services|http://.*:8123' \
  "$deploy_script"; then
  echo "FAIL: deploy script must not contain a token-based HTTP service preflight" >&2
  exit 1
fi

for failure_mode in runtime_failure setup_error missing_entry missing_marker; do
  : >"$tmp_dir/commands.log"
  : >"$tmp_dir/ssh-stdin.log"
  if run_deploy "$failure_mode" "$tmp_dir/$failure_mode.out"; then
    echo "FAIL: deployment must stop for SSH preflight mode $failure_mode" >&2
    exit 1
  fi
  grep -Fq 'PREFLIGHT MISLUKT: idotmatrix.set_countdown kon via SSH niet veilig worden bevestigd' \
    "$tmp_dir/$failure_mode.out" || {
      echo "FAIL: SSH preflight failure must explicitly name idotmatrix.set_countdown" >&2
      exit 1
    }
  assert_no_ota_guidance "$tmp_dir/$failure_mode.out"
  if grep -Eq '^(scp|ssh root@test-swipe)' "$tmp_dir/commands.log"; then
    echo "FAIL: no deployment command may run after SSH failure mode $failure_mode" >&2
    exit 1
  fi
done

: >"$tmp_dir/commands.log"
: >"$tmp_dir/ssh-stdin.log"
if ! run_deploy success "$tmp_dir/success.out"; then
  sed -n '1,120p' "$tmp_dir/success.out" >&2
  echo "FAIL: valid remote runtime and component fixtures must pass preflight" >&2
  exit 1
fi

first_command="$(sed -n '1p' "$tmp_dir/commands.log")"
[[ "$first_command" == *"hassio@test-ha"* && "$first_command" == *"bash -lc"* ]] || {
  echo "FAIL: encrypted hassio SSH preflight must be the first external command" >&2
  exit 1
}
grep -Fq 'ha --raw-json core stats' "$tmp_dir/ssh-stdin.log" || {
  echo "FAIL: SSH preflight must prove the Home Assistant Core container is running" >&2
  exit 1
}
grep -Fq 'ha core logs' "$tmp_dir/ssh-stdin.log" || {
  echo "FAIL: SSH preflight must reject safe mode and iDotMatrix setup errors" >&2
  exit 1
}
grep -Fq '/config/.storage/core.config_entries' "$tmp_dir/ssh-stdin.log" || {
  echo "FAIL: SSH preflight must require an enabled iDotMatrix config entry" >&2
  exit 1
}
grep -Fq 'component_dir=/config/custom_components/idotmatrix' \
  "$tmp_dir/ssh-stdin.log" || {
    echo "FAIL: SSH preflight must target the installed iDotMatrix component" >&2
    exit 1
  }
for required_file in __init__.py coordinator.py services.yaml; do
  grep -Fq "$required_file" "$tmp_dir/ssh-stdin.log" || {
    echo "FAIL: SSH preflight must inspect $required_file" >&2
    exit 1
  }
done
if grep -Eq 'Authorization|Bearer|HA_ACCESS_TOKEN|http://|/api/services' \
  "$tmp_dir/commands.log" "$tmp_dir/ssh-stdin.log"; then
  echo "FAIL: SSH preflight must not transmit a token or make a plain HTTP request" >&2
  exit 1
fi
grep -Fq 'Preflight geslaagd: idotmatrix.set_countdown is via SSH bevestigd' \
  "$tmp_dir/success.out" || {
    echo "FAIL: successful SSH preflight must be reported" >&2
    exit 1
  }
grep -Fq 'esphome run esphome/ha-display-7.yaml --device ha-display-7.local' \
  "$tmp_dir/success.out" || {
    echo "FAIL: successful SSH preflight must print the configured OTA command" >&2
    exit 1
  }
if grep -Fq '/config/custom_components/idotmatrix' "$tmp_dir/commands.log"; then
  echo "FAIL: deployment must not overwrite custom-component Python" >&2
  exit 1
fi
grep -Fq 'home-assistant/ha-display-7-package.yaml root@test-ha:/config/packages/ha_display_7.yaml' \
  "$tmp_dir/commands.log" || {
    echo "FAIL: deployment must copy the timer package to /config/packages/ha_display_7.yaml" >&2
    exit 1
  }

echo "PASS: deploy script gates deployment through token-free SSH countdown preflight"
