#!/usr/bin/env bash
# Loudness normalize to -14 LUFS (social standard). Usage: normalize-audio.sh in.mp4 out.mp4
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
in="$1"; out="${2:-${1%.*}-norm.mp4}"
ffmpeg -y -i "$in" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:v copy -c:a aac -b:a 192k "$out"
