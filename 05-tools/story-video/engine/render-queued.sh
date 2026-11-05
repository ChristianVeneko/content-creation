#!/usr/bin/env bash
# render-queued.sh ARGS... : run engine/render.py with ARGS, one render at a time on this machine.
# Two full renders at once starve each other on the CPU (pages never reach window.READY), so every
# full render waits for a lock. Stills and short motion checks can call render.py directly.
#   05-tools/story-video/engine/render-queued.sh 04-projects/<id>/part1/film.html 04-projects/<id>/part1/frames
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
LOCK="$ROOT/05-tools/cache/story-render.lock"
PY="$HERE/../.venv/bin/python"
mkdir -p "$(dirname "$LOCK")"
while ! mkdir "$LOCK" 2>/dev/null; do
  pid="$(cat "$LOCK/pid" 2>/dev/null || true)"
  if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then rm -rf "$LOCK"; continue; fi   # stale lock
  echo "waiting for the render queue (held by pid ${pid:-?})"; sleep 30
done
echo $$ > "$LOCK/pid"
trap 'rm -rf "$LOCK"' EXIT
"$PY" -I "$HERE/render.py" "$@"
