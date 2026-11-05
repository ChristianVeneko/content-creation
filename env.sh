# Source this before any work, from the repo root:  source ./env.sh
# Works from bash and zsh, wherever the repo is cloned. Keeps every library, model, and cache
# inside the repo folder (nothing in ~ or global locations).
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  _cc_env_file="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  _cc_env_file="${(%):-%x}"
else
  _cc_env_file="$0"
fi
export CC_ROOT="$(cd "$(dirname "$_cc_env_file")" && pwd -P)"
unset _cc_env_file
export CC_CACHE="$CC_ROOT/05-tools/cache"
# 05-tools/node/bin: the repo-local Node that setup.sh installs when the system one is missing or too old.
export PATH="$CC_ROOT/05-tools/bin:$CC_ROOT/05-tools/node/bin:$CC_ROOT/.venv/bin:$PATH"
export XDG_CACHE_HOME="$CC_CACHE/xdg"
export UV_CACHE_DIR="$CC_CACHE/uv"
export UV_PYTHON_INSTALL_DIR="$CC_CACHE/uv-python"
export UV_PROJECT_ENVIRONMENT="$CC_ROOT/.venv"
export PIP_CACHE_DIR="$CC_CACHE/pip"
export npm_config_cache="$CC_CACHE/npm"
export HF_HOME="$CC_ROOT/05-tools/models/huggingface"
export TORCH_HOME="$CC_ROOT/05-tools/models/torch"
export MPLCONFIGDIR="$CC_CACHE/matplotlib"
export PUPPETEER_CACHE_DIR="$CC_CACHE/puppeteer"
export PLAYWRIGHT_BROWSERS_PATH="$CC_CACHE/playwright"
export REMOTION_CACHE_DIR="$CC_CACHE/remotion"
export WHISPER_MODELS="$CC_ROOT/05-tools/models/whisper"
export TMPDIR="$CC_CACHE/tmp/"
mkdir -p "$TMPDIR" "$WHISPER_MODELS"
[ -f "$CC_ROOT/.env" ] && { set -a; . "$CC_ROOT/.env"; set +a; } || true
# Machine-specific extras (ignored by git): extra tools, local paths, experiments.
[ -f "$CC_ROOT/env.local.sh" ] && . "$CC_ROOT/env.local.sh" || true

# science-shorts kit tools (venv, font, browser path) stay inside the repo
export SCIENCE_SHORTS_HOME="$CC_ROOT/05-tools/science-shorts/home"

# opuscar kit (66 code-made film styles): library, packages and saved styles stay inside the repo
export LEMO_OPUSCAR_HOME="$CC_ROOT/05-tools/opuscar"
export LEMO_MY_STYLES="$CC_ROOT/05-tools/opuscar-my-styles"
