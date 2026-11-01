#!/usr/bin/env bash
# Burn .srt or .ass subtitles. Usage: burn-captions.sh in.mp4 subs.srt|subs.ass out.mp4 [FontName]
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
if [[ "$(ffmpeg -hide_banner -filters 2>/dev/null)" != *" subtitles "* ]]; then
  echo "ffmpeg lacks libass. Install an ffmpeg with libass (macOS: brew tap homebrew-ffmpeg/ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg; Ubuntu/WSL: apt ffmpeg has it), or put one in 05-tools/bin" >&2; exit 2
fi
in="$1"; subs="$2"; out="${3:-${1%.*}-captioned.mp4}"; font="${4:-Montserrat ExtraBold}"
fontsdir="$(cd "$(dirname "$0")/../03-assets/fonts" && pwd)"
if [[ "$subs" == *.ass ]]; then vf="ass=filename='$subs':fontsdir='$fontsdir'"
else vf="subtitles=filename='$subs':fontsdir='$fontsdir':force_style='FontName=$font,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=90'"; fi
ffmpeg -y -i "$in" -vf "$vf" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart "$out"
