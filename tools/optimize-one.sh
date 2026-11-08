#!/usr/bin/env bash
# Shrink ONE model for the web.  Usage:
#   bash tools/optimize-one.sh INPUT.glb OUTPUT.glb [TRIANGLE_RATIO] [TEXTURE_SIZE]
# Example (keep 12% of the triangles, 1024px textures):
#   bash tools/optimize-one.sh ../humerus-original.glb models/human_humerus.glb 0.12 1024
set -e
IN="$1"; OUT="$2"; RATIO="${3:-0.12}"; TEX="${4:-1024}"
if [ -z "$IN" ] || [ -z "$OUT" ]; then echo "Usage: bash tools/optimize-one.sh INPUT.glb OUTPUT.glb [ratio] [texture-size]"; exit 1; fi
TMP="$(mktemp -d)"
CLI="npx -y @gltf-transform/cli"

echo "1/3 Weld vertices and reduce triangles (keeping ${RATIO} of them)..."
$CLI weld "$IN" "$TMP/a.glb"
$CLI simplify "$TMP/a.glb" "$TMP/b.glb" --ratio "$RATIO" --error 0.001

echo "2/3 Compress geometry (Draco) and textures (WebP ${TEX}px)..."
$CLI optimize "$TMP/b.glb" "$OUT" --simplify false --compress draco --texture-compress webp --texture-size "$TEX"

echo "3/3 Done:"
ls -lh "$IN" "$OUT"
rm -rf "$TMP"