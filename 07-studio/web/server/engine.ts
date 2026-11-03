// Thin wrapper over the engine CLI (07-studio/engine/cli.mjs):
//   templates · validate <spec.json> · build <spec.json> --out <dir> --json-logs
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import type { EngineLog, HfEntry, HfQuality, MusicMood, Palette, TemplateInfo } from "../shared/types.ts";
import { JsonLogStream } from "./jsonLogs.ts";

export interface EngineRunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface EngineMusicTrack {
  id: string;
  mood: string;
  title: string;
  artist: string;
  file: string;
  durationSec: number;
  bpm?: number | null;
  license: string;
  credit: string;
  sourceUrl?: string;
}

export interface EngineVoice {
  voiceId: string;
  name: string;
  accent: string;
  locale: string;
  gender: string;
  useCase: string;
  description: string;
  previewUrl: string;
  uses7d: number;
}

export class Engine {
  readonly cli: string;
  readonly cwd: string;

  constructor(cli: string, cwd: string) {
    this.cli = cli;
    this.cwd = cwd;
  }

  exists(): boolean {
    return existsSync(this.cli);
  }

  run(args: string[], timeoutMs = 60_000): Promise<EngineRunResult> {
    return new Promise((resolve, reject) => {
      if (!this.exists()) {
        reject(new Error(`Engine CLI not found at ${this.cli}`));
        return;
      }
      const child = spawn(process.execPath, [this.cli, ...args], { cwd: this.cwd, env: process.env });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      });
    });
  }

  async templates(): Promise<TemplateInfo[]> {
    const res = await this.run(["templates"]);
    if (res.code !== 0) throw new Error(`engine templates failed: ${(res.stderr || res.stdout).trim().slice(0, 500)}`);
    return normalizeTemplates(JSON.parse(extractJson(res.stdout)));
  }

  /** Spec-writer prompt of a template, trimmed by the engine (`cli.mjs prompt <id>`); HyperFrames formats get their own section. */
  async prompt(templateId: string, opts: { creative?: boolean } = {}): Promise<string> {
    const res = await this.run(["prompt", templateId, ...(opts.creative ? ["--creative"] : [])]);
    if (res.code !== 0 || !res.stdout.trim()) throw new Error(`engine prompt ${templateId} failed: ${(res.stderr || res.stdout).trim().slice(0, 500)}`);
    return res.stdout;
  }

  /** Music library listing (`cli.mjs music`): moods and vetted tracks with their file relative to 03-assets/music. */
  async music(): Promise<{ moods: MusicMood[]; tracks: EngineMusicTrack[] }> {
    const res = await this.run(["music"]);
    if (res.code !== 0) throw new Error(`engine music failed: ${(res.stderr || res.stdout).trim().slice(0, 500)}`);
    const raw = JSON.parse(extractJson(res.stdout)) as { moods?: MusicMood[]; tracks?: EngineMusicTrack[] };
    return { moods: Array.isArray(raw.moods) ? raw.moods : [], tracks: Array.isArray(raw.tracks) ? raw.tracks : [] };
  }

  /** Trending Latin American Spanish ElevenLabs voices (`cli.mjs voices`). */
  async voices(): Promise<{ available: boolean; reason?: string; voices: EngineVoice[] }> {
    const res = await this.run(["voices"], 30_000);
    if (res.code !== 0) throw new Error(`engine voices failed: ${(res.stderr || res.stdout).trim().slice(0, 500)}`);
    const raw = JSON.parse(extractJson(res.stdout)) as { available?: boolean; reason?: string; voices?: EngineVoice[] };
    return { available: raw.available === true, ...(raw.reason ? { reason: raw.reason } : {}), voices: Array.isArray(raw.voices) ? raw.voices : [] };
  }

  /** Validate a spec file. Returns null when valid, or an error message. */
  async validate(specPath: string): Promise<string | null> {
    const res = await this.run(["validate", specPath]);
    const out = res.stdout.trim();
    // Accept a JSON verdict ({ok|valid, errors}) or rely on the exit code.
    try {
      const verdict = JSON.parse(extractJson(out)) as Record<string, unknown>;
      const ok = verdict.ok ?? verdict.valid;
      if (ok === true && res.code === 0) return null;
      if (ok === false || res.code !== 0) {
        return formatErrors(verdict.errors ?? verdict.error ?? verdict.message ?? verdict);
      }
    } catch {
      // non-JSON output
    }
    if (res.code === 0) return null;
    return (res.stderr || res.stdout).trim().slice(0, 2000) || `validate exited with code ${res.code}`;
  }

  /** Start a build. Progress lines are reported via onLog; plain text via onText. */
  build(
    specPath: string,
    outDir: string,
    handlers: { onLog: (log: EngineLog) => void; onText: (text: string) => void },
    opts: { quality?: HfQuality } = {},
  ): { child: ChildProcess; done: Promise<number | null> } {
    const args = [this.cli, "build", specPath, "--out", outDir, "--json-logs", ...(opts.quality ? ["--quality", opts.quality] : [])];
    const child = spawn(process.execPath, args, {
      cwd: this.cwd,
      env: process.env,
    });
    const stdout = new JsonLogStream((line) =>
      line.kind === "log" ? handlers.onLog(line.log) : handlers.onText(line.text),
    );
    const stderr = new JsonLogStream((line) =>
      line.kind === "log" ? handlers.onLog(line.log) : handlers.onText(line.text),
    );
    child.stdout.on("data", (d: Buffer) => stdout.push(d));
    child.stderr.on("data", (d: Buffer) => stderr.push(d));
    const done = new Promise<number | null>((resolve) => {
      child.on("error", (err) => {
        handlers.onText(`engine failed to start: ${err.message}`);
        resolve(-1);
      });
      child.on("close", (code) => {
        stdout.end();
        stderr.end();
        resolve(code);
      });
    });
    return { child, done };
  }
}

/** Render engine validation errors (`[{path, message}]`, strings, or objects) as one line. */
export function formatErrors(errors: unknown): string {
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) {
    return errors
      .map((e) => {
        if (typeof e === "string") return e;
        const { path: p, message } = (e ?? {}) as { path?: unknown; message?: unknown };
        const where = Array.isArray(p) ? p.join(".") : p ? String(p) : "";
        return where ? `${where}: ${String(message ?? "")}` : String(message ?? JSON.stringify(e));
      })
      .join("; ");
  }
  return JSON.stringify(errors);
}

/** Pull the first JSON value out of stdout that may contain banner text. */
export function extractJson(text: string): string {
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) return t;
  const start = t.search(/[[{]/);
  return start === -1 ? t : t.slice(start);
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

function defaultsTheme(t: Record<string, unknown>): Record<string, unknown> {
  const d = t.defaults as { theme?: unknown } | undefined;
  return d && typeof d.theme === "object" && d.theme ? (d.theme as Record<string, unknown>) : {};
}

/** A well-formed palette (1-4 hex bg stops, hex text and accent, optional hex accents) or undefined. */
export function asPalette(raw: unknown): Palette | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  if (!Array.isArray(p.bg) || p.bg.length < 1 || p.bg.length > 4 || !p.bg.every(isHex)) return undefined;
  if (!isHex(p.text) || !isHex(p.accent)) return undefined;
  if ((p.accent2 !== undefined && !isHex(p.accent2)) || (p.accent3 !== undefined && !isHex(p.accent3))) return undefined;
  const out: Palette = { bg: [...(p.bg as string[])], text: p.text, accent: p.accent };
  if (p.accent2 !== undefined) out.accent2 = p.accent2 as string;
  if (p.accent3 !== undefined) out.accent3 = p.accent3 as string;
  return out;
}

/** Styles/settings of a HyperFrames format: {id, name, about} plus optional swatch colors. */
function normalizeEntries(raw: unknown): HfEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.flatMap((e): HfEntry[] => {
    if (!e || typeof e !== "object") return [];
    const r = e as Record<string, unknown>;
    if (typeof r.id !== "string" || !r.id) return [];
    const palette = Array.isArray(r.palette) ? r.palette.filter(isHex) : [];
    return [{ id: r.id, name: typeof r.name === "string" ? r.name : r.id, about: typeof r.about === "string" ? r.about : "", ...(palette.length > 0 ? { palette } : {}) }];
  });
  return out;
}

const FALLBACK_GRADIENT = ["#1b1033", "#ff7a3d"];

/** Map whatever template metadata the engine prints onto the UI's TemplateInfo. */
export function normalizeTemplates(raw: unknown): TemplateInfo[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { templates?: unknown }).templates)
      ? (raw as { templates: unknown[] }).templates
      : [];
  return list.flatMap((item): TemplateInfo[] => {
    if (!item || typeof item !== "object") return [];
    const t = item as Record<string, unknown>;
    const preview = (t.preview ?? {}) as Record<string, unknown>;
    const id = String(t.id ?? t.name ?? t.slug ?? "");
    if (!id) return [];
    const gradientRaw = preview.gradient ?? t.gradient;
    const gradient =
      Array.isArray(gradientRaw) && gradientRaw.length >= 2 ? gradientRaw.map(String) : FALLBACK_GRADIENT;
    return [
      {
        id,
        name: String(preview.name ?? t.title ?? t.label ?? t.name ?? id),
        description: String(preview.description ?? t.description ?? ""),
        emoji: String(preview.emoji ?? t.emoji ?? "🎬"),
        gradient,
        accent: typeof preview.accent === "string" ? preview.accent : undefined,
        sampleText: typeof preview.sample_text === "string" ? preview.sample_text : undefined,
        style: typeof preview.style === "string" ? preview.style : undefined,
        promptHint: typeof t.prompt_hint === "string" ? t.prompt_hint : undefined,
        category: typeof t.category === "string" ? t.category : undefined,
        format: typeof t.format === "string" ? t.format : id,
        bestFor: Array.isArray(t.best_for) ? t.best_for.map(String) : undefined,
        palette: asPalette(defaultsTheme(t).palette),
        font: typeof defaultsTheme(t).font === "string" ? (defaultsTheme(t).font as string) : undefined,
        // HyperFrames formats (registry data): present only when the engine sends them, so other templates are unchanged
        ...(t.engine === "hyperframes" ? { engine: "hyperframes" } : {}),
        ...(t.ownsCaptions === true ? { ownsCaptions: true } : {}),
        ...(Array.isArray(t.modes) ? { modes: t.modes.filter((m): m is "single" | "multi" => m === "single" || m === "multi") } : {}),
        ...(Array.isArray(t.styles) ? { styles: normalizeEntries(t.styles) } : {}),
        ...(Array.isArray(t.settings) ? { settings: normalizeEntries(t.settings) } : {}),
      },
    ];
  });
}
