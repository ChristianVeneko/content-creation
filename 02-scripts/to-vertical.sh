#!/usr/bin/env bash
# Convert any video to 1080x1920 9:16 (center crop). Usage: to-vertical.sh in.mp4 out.mp4
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
in="$1"; out="${2:-${1%.*}-vertical.mp4}"
ffmpeg -y -i "$in" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$out"
