#!/usr/bin/env bash
# Remove silences/dead air (jump cuts) with auto-editor. Usage: cut-silences.sh in.mp4 [margin]
# Install: pip install auto-editor
set -euo pipefail
source "$(cd "$(dirname "$0")/.." && pwd)/env.sh"
auto-editor "$1" --margin "${2:-0.15sec}" --output "${1%.*}-cut.mp4"
