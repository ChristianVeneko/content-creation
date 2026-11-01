// Runtime configuration: paths and environment, resolved once at startup.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = path.resolve(here, "..");

/** Content-creation root (holds .env, 04-projects, env.sh). */
export const CC_ROOT = process.env.CC_ROOT ?? path.resolve(WEB_ROOT, "../..");

/**
 * Load `<CC_ROOT>/.env` into process.env without overriding values that are
 * already set (so `source env.sh` and explicit exports win).
 */
export function loadDotEnv(file = path.join(CC_ROOT, ".env")): void {
  if (!existsSync(file)) return;
  const before = { ...process.env };
  process.loadEnvFile(file);
  for (const [k, v] of Object.entries(before)) process.env[k] = v;
}

export interface StudioConfig {
  host: string;
  port: number;
  engineCli: string;
  engineDir: string;
  specWriterPrompt: string;
  projectsDir: string;
  distDir: string;
  claudeBin: string;
  claudeTimeoutMs: number;
  /** 03-assets/music: the library previews are served from here (only files listed by the engine). */
  musicDir: string;
  /** Engine preset modules (palettes.mjs, themes.mjs). Independent of ENGINE_CLI so tests with a fake engine use the real presets. */
  presetsDir: string;
  /** Generated template thumbnails (engine/scripts/make-thumbs.mjs): <id>.jpg and <id>.mp4. */
  thumbsDir: string;
  /** 08-channels: one folder per channel with channel.json + voice.md. */
  channelsDir: string;
  /** Root that channel brand paths (avatar) are relative to; files are only served from inside it. */
  workspaceRoot: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): StudioConfig {
  const engineCli = path.resolve(WEB_ROOT, env.ENGINE_CLI ?? "../engine/cli.mjs");
  const engineDir = path.dirname(engineCli);
  return {
    host: "127.0.0.1",
    port: Number(env.STUDIO_PORT ?? 4317),
    engineCli,
    engineDir,
    specWriterPrompt: path.join(engineDir, "prompts", "spec-writer.md"),
    projectsDir: path.resolve(env.STUDIO_PROJECTS_DIR ?? path.join(CC_ROOT, "04-projects")),
    distDir: path.join(WEB_ROOT, "dist"),
    claudeBin: env.CLAUDE_BIN ?? "claude",
    claudeTimeoutMs: Number(env.CLAUDE_CODE_TIMEOUT_MS ?? 300_000),
    musicDir: path.resolve(env.STUDIO_MUSIC_DIR ?? path.join(CC_ROOT, "03-assets", "music")),
    presetsDir: path.resolve(WEB_ROOT, env.STUDIO_PRESETS_DIR ?? "../engine/lib"),
    thumbsDir: path.resolve(env.STUDIO_THUMBS_DIR ?? path.join(WEB_ROOT, "public", "thumbs")),
    channelsDir: path.resolve(env.STUDIO_CHANNELS_DIR ?? path.join(CC_ROOT, "08-channels")),
    workspaceRoot: path.resolve(CC_ROOT),
  };
}
