#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

fake_bin="$tmp_dir/bin"
mkdir -p "$fake_bin"

for command_name in ssh scp; do
  command_path="$fake_bin/$command_name"
  cat >"$command_path" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$0 $*" >>"$DEPLOY_COMMAND_LOG"
exit 0
SH
  chmod +x "$command_path"
done

cat >"$tmp_dir/services_server.py" <<'PY'
import http.server
import json
import pathlib
import sys

mode = sys.argv[1]
port_file = pathlib.Path(sys.argv[2])


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if mode == "unauthorized" or self.headers.get("Authorization") != "Bearer test-token":
            self.send_response(401)
            self.end_headers()
            return
        if mode == "malformed":
            body = b"not-json"
        elif mode == "absent":
            body = json.dumps([
                {"domain": "idotmatrix", "services": {"set_face": {"name": "Set face"}}}
            ]).encode()
        else:
            body = json.dumps([
                {"domain": "idotmatrix", "services": {"set_countdown": {"name": "Set countdown"}}}
            ]).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
port_file.write_text(str(server.server_address[1]))
server.handle_request()
PY

start_services_server() {
  local mode="$1"
  local port_file="$tmp_dir/server.port"
  rm -f "$port_file"
  python3 "$tmp_dir/services_server.py" "$mode" "$port_file" &
  server_pid=$!
  for _attempt in 1 2 3 4 5 6 7 8 9 10; do
    [[ -s "$port_file" ]] && break
    sleep 0.1
  done
  [[ -s "$port_file" ]] || {
    echo "FAIL: fixture HTTP server did not start" >&2
    exit 1
  }
  HA_SERVICES_TEST_URL="http://127.0.0.1:$(cat "$port_file")/api/services"
}

run_deploy() {
  local services_url="$1"
  local output_file="$2"
  DEPLOY_COMMAND_LOG="$tmp_dir/commands.log" \
    HA_ACCESS_TOKEN="test-token" \
    HA_SERVICES_URL="$services_url" \
    PATH="$fake_bin:$PATH" \
    bash "$root_dir/deploy-to-ha.sh" test-ha test-swipe >"$output_file" 2>&1
}

assert_no_ota_guidance() {
  local output_file="$1"
  if grep -Fq 'esphome run esphome/ha-display-7.yaml --device ha-display-7.local' \
    "$output_file"; then
    echo "FAIL: OTA guidance must not be offered after a failed service preflight" >&2
    exit 1
  fi
}

: >"$tmp_dir/commands.log"
if DEPLOY_COMMAND_LOG="$tmp_dir/commands.log" PATH="$fake_bin:$PATH" \
  bash "$root_dir/deploy-to-ha.sh" test-ha test-swipe >"$tmp_dir/no-token.out" 2>&1; then
  echo "FAIL: deployment must stop when authenticated service discovery is unavailable" >&2
  exit 1
fi
grep -Fq 'idotmatrix.set_countdown kan niet veilig worden gecontroleerd' "$tmp_dir/no-token.out" || {
  echo "FAIL: missing-token output must report an unverifiable service" >&2
  exit 1
}
assert_no_ota_guidance "$tmp_dir/no-token.out"
[[ ! -s "$tmp_dir/commands.log" ]] || {
  echo "FAIL: deployment commands must not run without an authenticated preflight" >&2
  exit 1
}

start_services_server absent
if run_deploy "$HA_SERVICES_TEST_URL" "$tmp_dir/missing.out"; then
  echo "FAIL: deployment must stop when idotmatrix.set_countdown is absent" >&2
  exit 1
fi
wait "$server_pid"
server_pid=""
grep -Fq 'PREFLIGHT MISLUKT: Home Assistant-service idotmatrix.set_countdown ontbreekt' \
  "$tmp_dir/missing.out" || {
    echo "FAIL: absent-service output must name idotmatrix.set_countdown explicitly" >&2
    exit 1
  }
assert_no_ota_guidance "$tmp_dir/missing.out"
[[ ! -s "$tmp_dir/commands.log" ]] || {
  echo "FAIL: deployment commands must not run after an absent-service preflight" >&2
  exit 1
}

: >"$tmp_dir/commands.log"
start_services_server unauthorized
if run_deploy "$HA_SERVICES_TEST_URL" "$tmp_dir/unauthorized.out"; then
  echo "FAIL: deployment must stop when service discovery is unauthorized" >&2
  exit 1
fi
wait "$server_pid"
server_pid=""
grep -Fq 'idotmatrix.set_countdown kon niet worden gecontroleerd' \
  "$tmp_dir/unauthorized.out" || {
    echo "FAIL: unauthorized output must report an unverifiable service" >&2
    exit 1
  }
if grep -Fq 'idotmatrix.set_countdown ontbreekt' "$tmp_dir/unauthorized.out"; then
  echo "FAIL: unauthorized discovery must not claim the service is absent" >&2
  exit 1
fi
assert_no_ota_guidance "$tmp_dir/unauthorized.out"
[[ ! -s "$tmp_dir/commands.log" ]] || {
  echo "FAIL: deployment commands must not run after unauthorized discovery" >&2
  exit 1
}

: >"$tmp_dir/commands.log"
start_services_server malformed
if run_deploy "$HA_SERVICES_TEST_URL" "$tmp_dir/malformed.out"; then
  echo "FAIL: deployment must stop when service discovery returns invalid JSON" >&2
  exit 1
fi
wait "$server_pid"
server_pid=""
grep -Fq 'idotmatrix.set_countdown kon niet worden gecontroleerd' \
  "$tmp_dir/malformed.out" || {
    echo "FAIL: malformed discovery output must report an unverifiable service" >&2
    exit 1
  }
assert_no_ota_guidance "$tmp_dir/malformed.out"
[[ ! -s "$tmp_dir/commands.log" ]] || {
  echo "FAIL: deployment commands must not run after malformed discovery" >&2
  exit 1
}

: >"$tmp_dir/commands.log"
start_services_server present
run_deploy "$HA_SERVICES_TEST_URL" "$tmp_dir/present.out"
wait "$server_pid"
server_pid=""
grep -Fq 'Preflight geslaagd: idotmatrix.set_countdown is beschikbaar' \
  "$tmp_dir/present.out" || {
    echo "FAIL: successful preflight must be reported" >&2
    exit 1
  }
grep -Fq 'esphome run esphome/ha-display-7.yaml --device ha-display-7.local' \
  "$tmp_dir/present.out" || {
    echo "FAIL: successful preflight must print the configured OTA command" >&2
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

echo "PASS: deploy script gates OTA on authenticated countdown-service discovery and preserves custom-component Python"
