#!/usr/bin/env bash
# One-time setup for macOS and Linux/WSL2. Safe to run again (idempotent).
# Everything goes INSIDE this folder (Node packages, caches, models, venv); only system packages
# (Homebrew on macOS, apt on Linux/WSL) are installed outside it.
#
#   ./setup.sh                 base install: system packages, Node 24+, npm deps, Remotion browser, .env, content log
#   ./setup.sh --voice-local   + local voice (Kokoro) and word-timed captions (Whisper). Apple Silicon Macs only.
#   ./setup.sh --skip-system   skip Homebrew/apt (you installed ffmpeg, python3, etc. yourself)
#   ./setup.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT"

VOICE_LOCAL=0
SKIP_SYSTEM=0
for arg in "$@"; do
  case "$arg" in
    --voice-local) VOICE_LOCAL=1 ;;
    --skip-system) SKIP_SYSTEM=1 ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (see ./setup.sh --help)" >&2; exit 2 ;;
  esac
done

NODE_MIN_MAJOR=24
say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m[aviso]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31m[error]\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"
ARCH="$(uname -m)"
IS_WSL=0
if [ "$OS" = "Linux" ] && grep -qi microsoft /proc/version 2>/dev/null; then IS_WSL=1; fi
case "$OS" in
  Darwin) PLATFORM=macos ;;
  Linux)  PLATFORM=linux ;;
  *) die "Unsupported OS: $OS. Use macOS, Linux, or Windows through WSL2 (see README.md)." ;;
esac

if [ "$IS_WSL" = 1 ]; then
  case "$ROOT" in
    /mnt/*) warn "The repo is under $ROOT (the Windows disk). It works, but it is very slow. Clone it inside your Linux home instead (cd ~ && git clone ...)." ;;
  esac
fi

# Repo-local environment: caches, models and temp files stay in this folder.
# shellcheck source=env.sh
source "$ROOT/env.sh"

# ---------------------------------------------------------------- system packages
ffmpeg_has_libass() { ffmpeg -hide_banner -filters 2>/dev/null | grep -qE '^ *[.A-Z|]+ +(ass|subtitles) '; }

install_system_macos() {
  if ! have brew; then
    die "Homebrew is missing. Install it from https://brew.sh and run ./setup.sh again."
  fi
  say "Homebrew packages (ffmpeg, python)"
  if have ffmpeg; then
    if ffmpeg_has_libass; then echo "ffmpeg OK (with libass)"
    else warn "Your ffmpeg has no libass: videos render fine, but 02-scripts/burn-captions.sh needs it. To fix: brew uninstall ffmpeg && brew tap homebrew-ffmpeg/ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg"
    fi
  else
    brew tap homebrew-ffmpeg/ffmpeg
    brew install homebrew-ffmpeg/ffmpeg/ffmpeg
  fi
  have python3 || brew install python
}

install_system_linux() {
  have apt-get || die "This script supports Debian/Ubuntu (apt). On another distro install: ffmpeg, python3, python3-venv, curl, xz, git and Chromium's libraries, then run ./setup.sh --skip-system."
  say "apt packages (ffmpeg, python, fonts, libraries for Remotion's headless Chrome) — sudo will ask for your password"
  local alsa=libasound2
  if apt-cache show libasound2t64 >/dev/null 2>&1; then alsa=libasound2t64; fi
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends \
    ca-certificates curl git xz-utils unzip \
    ffmpeg python3 python3-venv \
    fonts-noto-color-emoji fonts-liberation fontconfig \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libpango-1.0-0 libcairo2 "$alsa"
}

if [ "$SKIP_SYSTEM" = 0 ]; then
  if [ "$PLATFORM" = macos ]; then install_system_macos; else install_system_linux; fi
else
  say "Skipping system packages (--skip-system)"
fi
have ffmpeg || die "ffmpeg is not installed. Install it (see README.md) and run ./setup.sh again."

# ---------------------------------------------------------------- Node (24+), repo-local when needed
node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

install_local_node() {
  local os arch base file sums
  case "$PLATFORM" in macos) os=darwin ;; linux) os=linux ;; esac
  case "$ARCH" in x86_64|amd64) arch=x64 ;; arm64|aarch64) arch=arm64 ;; *) die "Unsupported CPU: $ARCH" ;; esac
  base="https://nodejs.org/dist/latest-v${NODE_MIN_MAJOR}.x"
  sums="$(curl -fsSL "$base/SHASUMS256.txt")"
  file="$(printf '%s\n' "$sums" | awk -v want="${os}-${arch}.tar.xz" '$2 ~ want"$" {print $2; exit}')"
  [ -n "$file" ] || die "Could not find a Node ${NODE_MIN_MAJOR} build for ${os}-${arch} at $base"
  say "Installing $file into 05-tools/node (repo-local, nothing global)"
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "$base/$file" -o "$tmp/$file"
  local want got
  want="$(printf '%s\n' "$sums" | awk -v f="$file" '$2 == f {print $1}')"
  if have sha256sum; then got="$(sha256sum "$tmp/$file" | awk '{print $1}')"; else got="$(shasum -a 256 "$tmp/$file" | awk '{print $1}')"; fi
  [ "$want" = "$got" ] || die "Checksum mismatch for $file"
  rm -rf "$ROOT/05-tools/node"
  mkdir -p "$ROOT/05-tools/node"
  tar -xJf "$tmp/$file" -C "$ROOT/05-tools/node" --strip-components=1
  rm -rf "$tmp"
  hash -r
}

say "Node.js ${NODE_MIN_MAJOR}+"
if have node && [ "$(node_major)" -ge "$NODE_MIN_MAJOR" ]; then
  echo "node $(node --version) OK ($(command -v node))"
else
  install_local_node
  echo "node $(node --version) ($(command -v node))"
fi

# ---------------------------------------------------------------- uv (Python tool runner), repo-local
say "uv (runs the optional ElevenLabs MCP and the local-voice Python env)"
if have uv; then
  echo "uv OK ($(command -v uv))"
else
  curl -LsSf https://astral.sh/uv/install.sh | env UV_UNMANAGED_INSTALL="$ROOT/05-tools/bin" sh
  hash -r
fi

# ---------------------------------------------------------------- npm dependencies
npm_install() {
  local dir="$1"
  if [ -f "$dir/node_modules/.package-lock.json" ] && [ "$dir/node_modules/.package-lock.json" -nt "$dir/package-lock.json" ]; then
    echo "$dir: dependencies up to date"
  else
    (cd "$dir" && npm ci --no-audit --no-fund)
  fi
}
say "Engine and web studio dependencies (npm, inside the repo)"
npm_install 07-studio/engine
npm_install 07-studio/web

say "Remotion headless browser (downloaded into the engine's node_modules)"
(cd 07-studio/engine && npx --no-install remotion browser ensure)

# ---------------------------------------------------------------- optional local voice (Apple Silicon)
if [ "$VOICE_LOCAL" = 1 ]; then
  if [ "$PLATFORM" = macos ] && [ "$ARCH" = arm64 ]; then
    say "Local voice + captions: Python 3.12 venv in .venv (mlx-audio Kokoro, mlx-whisper). Models download on first use into 05-tools/models."
    [ -x .venv/bin/python ] || uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python mlx-whisper mlx-audio misaki espeakng-loader
  else
    warn "--voice-local needs an Apple Silicon Mac (MLX). On this machine use ElevenLabs (ELEVENLABS_API_KEY in .env) or videos without voice."
  fi
fi

# ---------------------------------------------------------------- local files
say "Local files"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example (add your keys there; all optional)"
else
  echo ".env already exists"
fi
if [ ! -f 00-docs/content-log.csv ]; then
  echo "date,platform,title,format,hook,length_s,views,retention_3s_pct,avg_viewed_pct,sends,saves,notes" > 00-docs/content-log.csv
  echo "Created 00-docs/content-log.csv"
fi
mkdir -p 04-projects 06-exports/reels 06-exports/tiktok 06-exports/shorts

# ---------------------------------------------------------------- check
say "Check"
node 07-studio/engine/cli.mjs templates --brief >/dev/null && echo "Engine OK: $(node 07-studio/engine/cli.mjs templates --brief | wc -l | tr -d ' ') template lines"
have claude || warn "Claude Code is not installed yet: https://docs.claude.com/en/docs/claude-code (then run 'claude' in this folder)."
echo
echo "Done. Disk used by this folder: $(du -sh "$ROOT" 2>/dev/null | awk '{print $1}')"
echo "Next: open Claude Code here (claude) and say \"hazme un video\", or run the web studio (see README.md)."
