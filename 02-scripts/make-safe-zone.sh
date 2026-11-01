#!/usr/bin/env bash
# Generate a 1080x1920 transparent PNG guide: red = platform UI zones, green = universal safe box (900x1300).
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
out="$(cd "$(dirname "$0")/../03-assets/overlays" && pwd)/safe-zone-1080x1920.png"
ffmpeg -y -loglevel error -f lavfi -i "color=c=black@0.0:s=1080x1920,format=rgba" -frames:v 1 -vf \
"drawbox=x=0:y=0:w=1080:h=250:c=red@0.35:t=fill,drawbox=x=0:y=1260:w=1080:h=660:c=red@0.35:t=fill,drawbox=x=900:y=840:w=180:h=420:c=red@0.35:t=fill,drawbox=x=90:y=260:w=900:h=1300:c=lime@0.9:t=6" "$out"
echo "$out"
