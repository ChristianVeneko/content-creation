#!/usr/bin/env bash
# Download OFL caption fonts (Google Fonts repo) into 03-assets/fonts.
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
dir="$(cd "$(dirname "$0")/../03-assets/fonts" && pwd)"
base="https://github.com/google/fonts/raw/main/ofl"
get(){ curl -fsSL "$base/$1" -o "$dir/$(basename "$1" | sed -E "s/%5B.*%5D/-Variable/")" && echo "ok  $(basename "$1")" || echo "ERR $1"; }
get "montserrat/Montserrat%5Bwght%5D.ttf"
get "anton/Anton-Regular.ttf"
get "bebasneue/BebasNeue-Regular.ttf"
get "poppins/Poppins-Black.ttf"
get "poppins/Poppins-Bold.ttf"
get "inter/Inter%5Bopsz,wght%5D.ttf"
get "bangers/Bangers-Regular.ttf"
get "archivoblack/ArchivoBlack-Regular.ttf"
get "oswald/Oswald%5Bwght%5D.ttf"
# Static weights (libass/ffmpeg need real files, not variable fonts)
for w in Black ExtraBold Bold; do
  curl -fsSL "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-$w.ttf" -o "$dir/Montserrat-$w.ttf" && echo "ok  Montserrat-$w.ttf"
done
