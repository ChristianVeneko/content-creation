#!/usr/bin/env bash
# Copy a final 9:16 master into per-platform export folders with H.264 settings.
# Usage: export-platforms.sh master.mp4 name
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
in="$1"; name="$2"; root="$(cd "$(dirname "$0")/.." && pwd)/06-exports"
for p in reels tiktok shorts; do
  ffmpeg -y -i "$in" -c:v libx264 -preset slow -crf 18 -maxrate 12M -bufsize 24M -pix_fmt yuv420p \
    -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$root/$p/$name.mp4"
done
