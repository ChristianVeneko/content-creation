#!/bin/sh
# Scaffold a caricature film inside a project: sh 05-tools/caricature-stage/new.sh 04-projects/<id>
set -e
K=$(cd "$(dirname "$0")" && pwd); P="$1"; [ -n "$P" ] || { echo "usage: new.sh 04-projects/<id>"; exit 2; }
F="$P/film"; mkdir -p "$F"
cp -R "$K/kit/fonts" "$F/"
for f in index.html tighten.py audio.py build.sh scenes.js sets.js; do [ -e "$F/$f" ] || cp "$K/template/$f" "$F/$f"; done
chmod +x "$F/build.sh"
echo "film ready in $F: write lines.json, voice (tts_eleven --flow), tighten, scenes.js, audio.py events, then sh $F/build.sh"
