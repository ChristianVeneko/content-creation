// Mirrors <repo>/env.sh so the engine keeps every cache inside the repo
// even when it is spawned without `source env.sh` (e.g. from the web server). Existing values win.
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ENGINE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CC_ROOT = process.env.CC_ROOT || resolve(ENGINE_ROOT, "..", "..");

export function setupEnv() {
  const cache = process.env.CC_CACHE || join(CC_ROOT, "05-tools", "cache");
  const defaults = {
    CC_ROOT,
    CC_CACHE: cache,
    XDG_CACHE_HOME: join(cache, "xdg"),
    PIP_CACHE_DIR: join(cache, "pip"),
    npm_config_cache: join(cache, "npm"),
    HF_HOME: join(CC_ROOT, "05-tools", "models", "huggingface"),
    TORCH_HOME: join(CC_ROOT, "05-tools", "models", "torch"),
    MPLCONFIGDIR: join(cache, "matplotlib"),
    REMOTION_CACHE_DIR: join(cache, "remotion"),
    TMPDIR: join(cache, "tmp") + "/",
  };
  for (const [k, v] of Object.entries(defaults)) if (!process.env[k]) process.env[k] = v;
  const bins = [join(CC_ROOT, "05-tools", "bin"), join(CC_ROOT, "05-tools", "node", "bin"), join(CC_ROOT, ".venv", "bin")];
  const path = (process.env.PATH || "").split(":");
  process.env.PATH = [...bins.filter((b) => !path.includes(b)), ...path].join(":");
  mkdirSync(process.env.TMPDIR, { recursive: true });
}

export const PYTHON = () => process.env.VIDEO_ENGINE_PYTHON || join(CC_ROOT, ".venv", "bin", "python");
export const TRANSCRIBE_PY = () => join(CC_ROOT, "02-scripts", "transcribe.py");
