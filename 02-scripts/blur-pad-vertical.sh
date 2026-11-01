#!/usr/bin/env bash
# Horizontal video -> 9:16 with blurred background fill (no crop). Usage: blur-pad-vertical.sh in.mp4 out.mp4
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
in="$1"; out="${2:-${1%.*}-blurpad.mp4}"
ffmpeg -y -i "$in" -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30" \
 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$out"
