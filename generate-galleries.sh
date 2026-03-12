#!/bin/bash
# Generate per-category gallery PNGs using genart CLI montage.
# Usage: bash generate-galleries.sh
#
# Prerequisite: PNGs must already exist in examples/<category>/*.png
# (run render-examples.cjs first if needed)

set -euo pipefail

CLI="${GENART_CLI:-npx @genart-dev/cli}"
OUT="galleries"
COLS=7
TILE="150x150"
GAP=6
PAD=10
BG="#1a1a2e"
LABEL_COLOR="#cccccc"
FONT=11

mkdir -p "$OUT"

CATEGORIES=(
  sky profile clouds water landscape
)

total=0
for cat in "${CATEGORIES[@]}"; do
  dir="examples/$cat"
  if [ ! -d "$dir" ]; then
    echo "SKIP $cat (no directory)"
    continue
  fi
  count=$(ls "$dir"/*.png 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    echo "SKIP $cat (no PNGs)"
    continue
  fi
  echo "Generating $cat gallery ($count images)..."
  $CLI montage "$dir" \
    --tile-size "$TILE" --columns "$COLS" --label filename \
    --gap "$GAP" --padding "$PAD" --background "$BG" \
    --label-color "$LABEL_COLOR" --label-font-size "$FONT" \
    -o "$OUT/${cat}-gallery.png"
  total=$((total + 1))
done

echo ""
echo "Done: $total category galleries in $OUT/"
