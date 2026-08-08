#!/usr/bin/env bash
set -euo pipefail

root_dir=$(cd "$(dirname "$0")/.." && pwd)
route="$root_dir/photo-swipe-patch/src/app/api/ah/recipe/[id]/image/route.ts"

require() {
  local pattern=$1
  local message=$2
  if ! rg -q --multiline "$pattern" "$route"; then
    echo "FAIL: $message" >&2
    exit 1
  fi
}

require "case 'thumb':\n      return \{ width: 96, height: 72 \}" 'thumb mode must be exactly 96x72'
require "if \(mode === 'thumb'\)" 'thumb mode needs a dedicated response path'
require 'renderRecipeThumbnail' 'thumbnail images must be resized by the backend'
require "'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'" 'successful thumbnails must be cacheable'

echo 'PASS: recipe endpoint serves dedicated cacheable 96x72 thumbnails'
