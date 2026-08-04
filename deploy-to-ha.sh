#!/bin/bash
set -euo pipefail
# Deploy gewijzigde bestanden naar Home Assistant en de photo-swipe server.
# Gebruik: ./deploy-to-ha.sh [HA_HOST] [SWIPE_HOST]
# Voorbeeld: ./deploy-to-ha.sh 192.168.1.178 192.168.1.237

HA_HOST="${1:-192.168.1.178}"
SWIPE_HOST="${2:-192.168.1.237}"
HA_USER="${HA_USER:-root}"
SWIPE_USER="${SWIPE_USER:-root}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# De countdown-service leeft in een lokaal aangepaste custom component. Die Python-
# bestanden worden bewust nooit vanuit deze repository overschreven. Controleer de
# daadwerkelijk geregistreerde HA-service voordat er bestanden worden uitgerold of
# een ESPHome OTA-commando wordt aangeboden.
preflight_countdown_service() {
  local services_url="${HA_SERVICES_URL:-http://${HA_HOST}:8123/api/services}"

  if [[ -z "${HA_ACCESS_TOKEN:-}" ]]; then
    echo "✗ PREFLIGHT MISLUKT: HA_ACCESS_TOKEN ontbreekt; idotmatrix.set_countdown kan niet veilig worden gecontroleerd." >&2
    return 1
  fi

  local preflight_status
  if HA_SERVICES_URL="$services_url" python3 <<'PY'
import json
import os
import sys
import urllib.request

request = urllib.request.Request(
    os.environ["HA_SERVICES_URL"],
    headers={"Authorization": f"Bearer {os.environ['HA_ACCESS_TOKEN']}"},
)
try:
    with urllib.request.urlopen(request, timeout=10) as response:
        services = json.load(response)
except Exception as error:
    print(f"Servicecontrole kon Home Assistant niet uitlezen: {error}", file=sys.stderr)
    raise SystemExit(3)

available = any(
    domain.get("domain") == "idotmatrix"
    and "set_countdown" in domain.get("services", {})
    for domain in services
)
raise SystemExit(0 if available else 2)
PY
  then
    echo "✓ Preflight geslaagd: idotmatrix.set_countdown is beschikbaar"
    return 0
  else
    preflight_status=$?
  fi

  if [[ "$preflight_status" -eq 2 ]]; then
    echo "✗ PREFLIGHT MISLUKT: Home Assistant-service idotmatrix.set_countdown ontbreekt; installeer/controleer de custom-componentpatch handmatig vóór OTA." >&2
  else
    echo "✗ PREFLIGHT MISLUKT: idotmatrix.set_countdown kon niet worden gecontroleerd; deployment en OTA zijn geblokkeerd." >&2
  fi
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
