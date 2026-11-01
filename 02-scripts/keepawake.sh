#!/usr/bin/env bash
# Keep the computer awake while a long job runs, on any OS.
#   02-scripts/keepawake.sh <command> [args...]   run the command, preventing sleep on macOS
#   02-scripts/keepawake.sh -t <seconds>          just stay awake for N seconds (macOS)
# macOS uses `caffeinate -dimsu` (a sleeping display stalls headless Chrome renders).
# Linux and WSL have no caffeinate: the command runs directly, and `-t` is a no-op.
set -euo pipefail
if [ "$#" -eq 0 ]; then echo "Usage: $0 <command> [args...] | -t <seconds>" >&2; exit 2; fi
if command -v caffeinate >/dev/null 2>&1; then
  exec caffeinate -dimsu "$@"
fi
if [ "$1" = "-t" ]; then
  echo "keepawake: no caffeinate on this system; keep the machine from sleeping in its power settings" >&2
  exit 0
fi
exec "$@"
