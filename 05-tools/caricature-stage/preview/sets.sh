#!/bin/sh
# Contact sheet of every SCENERY set: sh 05-tools/caricature-stage/preview/sets.sh [t]
set -e
K=$(cd "$(dirname "$0")/.." && pwd); R=$(cd "$K/../.." && pwd); T=${1:-2}
cd "$R" && . ./env.sh >/dev/null 2>&1 && cd "$LEMO_OPUSCAR_HOME"
rm -rf "$K/preview/stills"
SETS=$(grep -o "^    [a-z]*: '" "$K/kit/scenery.js" | sed "s/[ :']//g")
for s in $SETS; do node core/render/still.mjs "$K" "$T" --size 1080x1920 --q "bg=$s" --out "$K/preview/stills" --prefix "${s}_" >/dev/null 2>&1 || echo "FAIL $s"; done
.venv/bin/python core/render/sheet.py "$K/preview/sets.jpg" $(for s in $SETS; do printf "%s " "$K/preview/stills/${s}_$T.jpg"; done) --cols 5 --w 300 >/dev/null
echo "$K/preview/sets.jpg"
