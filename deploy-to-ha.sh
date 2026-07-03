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

# ── HA bestanden ─────────────────────────────────────────────────────────────
echo "→ HA bestanden naar ${HA_USER}@${HA_HOST} ..."

scp "${REPO_DIR}/home-assistant/immich_rotate_7inch.py" \
    "${HA_USER}@${HA_HOST}:/config/www/idotmatrix/immich_rotate_7inch.py"

scp "${REPO_DIR}/home-assistant/buienradar_radar_7inch.py" \
    "${HA_USER}@${HA_HOST}:/config/www/idotmatrix/buienradar_radar_7inch.py"

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
