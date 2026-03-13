#!/bin/bash
# Generate per-category gallery PNGs using ImageMagick montage.
# Usage: bash generate-galleries.sh
#
# Prerequisite: PNGs must already exist in examples/<category>/*.png
# (run render-examples.cjs first if needed)

set -euo pipefail

OUT="galleries"
COLS=8
TILE="150x150"
BG="#1a1a2e"

mkdir -p "$OUT"

CATEGORIES=(
  sky profile clouds water
  river path shore field rock treeline
  celestial fog starfield cliff-face snowfield
  building bridge reflection vignette-foliage forest-floor haze
  fence boat erosion
  landscape scenes
)

total=0
for cat in "${CATEGORIES[@]}"; do
  dir="examples/$cat"
  if [ ! -d "$dir" ]; then
    echo "SKIP $cat (no directory)"
    continue
  fi
  pngs=($(ls "$dir"/*.png 2>/dev/null || true))
  count=${#pngs[@]}
  if [ "$count" -eq 0 ]; then
    echo "SKIP $cat (no PNGs)"
    continue
  fi
  echo "Generating $cat gallery ($count images)..."

  # Use ImageMagick montage
  montage "${pngs[@]}" \
    -tile "${COLS}x" \
    -geometry "${TILE}+6+6" \
    -background "$BG" \
    +set label \
    -label '' \
    "$OUT/${cat}-gallery.png"

  total=$((total + 1))
done

echo ""
echo "Done: $total category galleries in $OUT/"
