#!/usr/bin/env bash
# Word-level transcription (mlx-whisper, local, Metal). Usage: transcribe.sh in.mp4 [lang]
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
python "$CC_ROOT/02-scripts/transcribe.py" "$1" --lang "${2:-es}"
