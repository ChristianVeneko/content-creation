#!/usr/bin/env bash
# Opt-in extras. The base install is ./setup.sh at the repo root; nothing here runs automatically.
# Everything installs inside the repo (env.sh keeps caches and the venv in this folder).
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh

case "${1:-help}" in
  base)
    # Same as running ./setup.sh (pass its flags after "base").
    shift; exec ./setup.sh "$@" ;;
  voice)
    # Local Kokoro voice + Whisper captions (Apple Silicon Macs only).
    exec ./setup.sh --skip-system --voice-local ;;
  ml)
    # Heavy Python media stack for the 02-scripts helpers (scene detection, stem split, normalize...).
    # Several GB. The mlx-* packages need an Apple Silicon Mac.
    [ -x .venv/bin/python ] || uv venv --python 3.12 .venv
    pkgs=("scenedetect[opencv]" mediapipe moviepy pycaps demucs audio-separator ffmpeg-normalize whisper-ctranslate2 kokoro-onnx)
    if [ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ]; then pkgs+=(mlx-whisper mlx-audio); fi
    uv pip install --python .venv/bin/python "${pkgs[@]}" ;;
  hyperframes)
    npx hyperframes init hyperframes-studio ;;
  mcp)
    # Extra MCP servers for Claude Code in this project (ElevenLabs is already in .mcp.json).
    : "${FAL_KEY:?set FAL_KEY in .env}"
    claude mcp add --transport http fal https://mcp.fal.ai/mcp --header "Authorization: Key $FAL_KEY"
    claude mcp add remotion-docs -- npx @remotion/mcp@latest ;;
  *) echo "Usage: 05-tools/install.sh {base|voice|ml|hyperframes|mcp}  (base install: ./setup.sh)" ;;
esac
