#!/bin/bash
set -euo pipefail
# Deploy gewijzigde bestanden naar Home Assistant en de photo-swipe server.
# Gebruik: ./deploy-to-ha.sh [HA_HOST] [SWIPE_HOST]
# Voorbeeld: ./deploy-to-ha.sh 192.168.1.178 192.168.1.237

HA_HOST="${1:-192.168.1.178}"
SWIPE_HOST="${2:-192.168.1.237}"
HA_USER="${HA_USER:-root}"
HA_SSH_USER="${HA_SSH_USER:-hassio}"
SWIPE_USER="${SWIPE_USER:-root}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# De countdown-service leeft in een lokaal aangepaste custom component. Die Python-
# bestanden worden bewust nooit vanuit deze repository overschreven. Controleer de
# actieve Core-container en de live service registry via de versleutelde SSH-
# verbinding. Het Supervisor-token bestaat en expandeert alleen in de login-shell
# op de HA-host; de Mac leest, interpoleert of logt het niet.
preflight_countdown_service() {
  if ssh -o BatchMode=yes -o ConnectTimeout=10 \
    "${HA_SSH_USER}@${HA_HOST}" 'bash -lc "bash -s"' <<'REMOTE'
set -euo pipefail

# `core stats` faalt wanneer de Core-container niet draait. De buitenste login-shell
# levert uitsluitend op de HA-host de lokale Supervisor-context.
ha --raw-json core stats | grep -q '"result":"ok"'

# Vraag de werkelijk geregistreerde services op via de lokale Supervisor Core API-
# proxy. De quoted heredoc voorkomt expansie op de Mac. Bewaar de response tijdelijk
# met private rechten en ruim hem op bij succes, fouten en interrupts.
[[ -n "${SUPERVISOR_TOKEN:-}" ]]
umask 077
services_response="$(mktemp /tmp/idotmatrix-services.XXXXXX)"
cleanup_services_response() {
  rm -f "$services_response"
}
trap cleanup_services_response EXIT HUP INT TERM

services_status="$(
  curl --silent --show-error \
    --output "$services_response" \
    --write-out '%{http_code}' \
    --header "Authorization: Bearer $SUPERVISOR_TOKEN" \
    http://supervisor/core/api/services
)"
[[ "$services_status" == "200" ]]

# HA OS heeft niet gegarandeerd Python op de host. Parse daarom read-only in de
# Core-container en voer de tijdelijke hostresponse uitsluitend via stdin aan.
sudo -n docker exec -i homeassistant python3 -c '
import json
import sys

domains = json.load(sys.stdin)
idotmatrix = next(
    (domain for domain in domains if domain.get("domain") == "idotmatrix"),
    None,
)
if idotmatrix is None:
    raise SystemExit(1)
service = idotmatrix.get("services", {}).get("set_countdown")
if service is None:
    raise SystemExit(1)
fields = service.get("fields", {})
if not isinstance(fields, dict) or not all(
    field in fields for field in ("mode", "minutes", "seconds")
):
    raise SystemExit(1)
' <"$services_response"

# Een geïnstalleerd bestand alleen bewijst geen succesvolle runtime-setup. Blokkeer
# daarom safe mode en iedere iDotMatrix setup-/dependencyfout uit de huidige Core-log.
core_logs="$(ha core logs)"
if printf '%s\n' "$core_logs" | grep -Eiq \
  "starting home assistant in safe mode|setup failed for custom integration ['\"]idotmatrix|error (setting up|while setting up) entry .*idotmatrix|error setting up integration idotmatrix|unable to set up dependencies.*idotmatrix"; then
  exit 1
fi

# Vereis daarnaast minstens één ingeschakelde iDotMatrix config-entry in de actieve
# Core-configuratie. Dit is read-only en blijft volledig op de HA-host.
sudo -n docker exec homeassistant python3 -c '
import json
with open("/config/.storage/core.config_entries", encoding="utf-8") as source:
    entries = json.load(source)["data"]["entries"]
if not any(
    entry.get("domain") == "idotmatrix" and entry.get("disabled_by") is None
    for entry in entries
):
    raise SystemExit(1)
'

component_dir=/config/custom_components/idotmatrix
sudo -n grep -Fq \
  'hass.services.async_register(DOMAIN, "set_countdown", async_set_countdown)' \
  "$component_dir/__init__.py"
sudo -n grep -Fq 'async def async_set_countdown(' \
  "$component_dir/coordinator.py"
sudo -n grep -Fq 'await countdown.setMode(mode, minutes, seconds)' \
  "$component_dir/coordinator.py"
sudo -n grep -Eq '^set_countdown:$' "$component_dir/services.yaml"
sudo -n grep -Eq '^  fields:$' "$component_dir/services.yaml"
sudo -n grep -Eq '^    mode:$' "$component_dir/services.yaml"
sudo -n grep -Eq '^    minutes:$' "$component_dir/services.yaml"
sudo -n grep -Eq '^    seconds:$' "$component_dir/services.yaml"
REMOTE
  then
    echo "✓ Preflight geslaagd: idotmatrix.set_countdown is via SSH bevestigd"
    return 0
  fi

  echo "✗ PREFLIGHT MISLUKT: idotmatrix.set_countdown kon via SSH niet veilig worden bevestigd; deployment en OTA zijn geblokkeerd." >&2
  return 1
}

preflight_countdown_service

# ── HA bestanden ─────────────────────────────────────────────────────────────
echo "→ HA bestanden naar ${HA_USER}@${HA_HOST} ..."

scp "${REPO_DIR}/home-assistant/immich_rotate_7inch.py" \
    "${HA_USER}@${HA_HOST}:/config/www/idotmatrix/immich_rotate_7inch.py"

scp "${REPO_DIR}/home-assistant/buienradar_radar_7inch.py" \
    "${HA_USER}@${HA_HOST}:/config/www/idotmatrix/buienradar_radar_7inch.py"

# Bevat ook de volledige iDot-keukentimerpackage. De custom-component Python
# blijft buiten deze automatische deployment.
scp "${REPO_DIR}/home-assistant/ha-display-7-package.yaml" \
    "${HA_USER}@${HA_HOST}:/config/packages/ha_display_7.yaml"

echo "✓ HA bestanden gekopieerd"

# ── Photo-swipe route ────────────────────────────────────────────────────────
echo "→ Next.js route naar ${SWIPE_USER}@${SWIPE_HOST} ..."

# Pas het pad aan als de Next.js app ergens anders staat
SWIPE_ROUTE_PATH="/opt/photo-swipe/src/app/api/display-session/today/route.ts"

ssh "${SWIPE_USER}@${SWIPE_HOST}" "mkdir -p \$(dirname ${SWIPE_ROUTE_PATH})"

scp "${REPO_DIR}/photo-swipe-patch/src/app/api/display-session/today/route.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:${SWIPE_ROUTE_PATH}"

echo "✓ Photo-swipe route gekopieerd"

# ── AH Recepten routes + lib ─────────────────────────────────────────────────
echo "→ AH recepten routes + lib naar ${SWIPE_USER}@${SWIPE_HOST} ..."

ssh "${SWIPE_USER}@${SWIPE_HOST}" \
    "mkdir -p /opt/photo-swipe/src/app/api/ah/favorites \
              /opt/photo-swipe/src/app/api/ah/recipes \
              /opt/photo-swipe/src/app/api/ah/recipe/\[id\]/image \
              /opt/photo-swipe/src/lib"

scp "${REPO_DIR}/photo-swipe-patch/src/app/api/ah/favorites/route.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/app/api/ah/favorites/route.ts"

scp "${REPO_DIR}/photo-swipe-patch/src/app/api/ah/recipes/route.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/app/api/ah/recipes/route.ts"

scp "${REPO_DIR}/photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/app/api/ah/recipe/[id]/image/route.ts"

scp "${REPO_DIR}/photo-swipe-patch/src/lib/ah.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/lib/ah.ts"

scp "${REPO_DIR}/photo-swipe-patch/src/lib/ah-cache.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/lib/ah-cache.ts"

scp "${REPO_DIR}/photo-swipe-patch/src/lib/ah-warm.ts" \
    "${SWIPE_USER}@${SWIPE_HOST}:/opt/photo-swipe/src/lib/ah-warm.ts"

echo "✓ AH recepten routes + lib gekopieerd"

# ── Photo-swipe herbouwen en herstarten (één keer, na alle bestanden) ───────
echo "→ Photo-swipe herbouwen en herstarten ..."

ssh "${SWIPE_USER}@${SWIPE_HOST}" \
    "cd /opt/photo-swipe && npm run build 2>&1 | tail -5 && pm2 restart photo-swipe 2>/dev/null || true"

echo "✓ Photo-swipe herbouwd en herstart"

# ── HA herladen ──────────────────────────────────────────────────────────────
echo ""
echo "Herlaad nu HA config:"
echo "  Developer Tools → YAML → Reload All"
echo "  Of: ssh ${HA_USER}@${HA_HOST} 'ha core restart'"
echo ""
echo "Na een geldige HA-herlaad kan de gevalideerde firmware via OTA worden geplaatst:"
echo "  cd ${REPO_DIR} && esphome run esphome/ha-display-7.yaml --device ha-display-7.local"
