// HyperFrames format registry: discovers hf/<id>/index.mjs, checks the module contract and exposes the formats.
//
// Contract (see README "HyperFrames formats"): a module exports
//   meta           { id, name, about, modes: ["single"|"multi"], styles: [{id,name,about}], settings: [{id,name,about}] }
//   payloadSchema  zod schema of the format-specific part of the spec (`spec.hf`)
//   promptSection  spec-writer guidance (string) for LLM providers
//   compose(...)   async; writes a deterministic HyperFrames composition and returns { entry, sfx, durationSec }
// and may export `normalize(spec)` (lenient authoring, called before validation) and `meta.defaults`
// ({theme, voice, music, sfx, captions, hf}), `meta.category`, `meta.best_for`, `meta.preview`.
// Directories starting with "_" are internal (tests, reference module): hidden from every user-facing list unless
// the env flag CC_HF_INTERNAL=1 is set.
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHfSupport } from "../lib/spec.mjs";

export const HF_DIR = dirname(fileURLToPath(import.meta.url));
export const HF_MODES = ["single", "multi"];
export const HF_INTERNAL_FLAG = "CC_HF_INTERNAL";

/** True when internal (underscore) formats are visible: tests and the template other units copy. */
export const hfInternalEnabled = () => ["1", "true", "yes"].includes(String(process.env[HF_INTERNAL_FLAG] ?? "").toLowerCase());
const isInternalId = (id) => id.startsWith("_");

export class HfContractError extends Error {
  constructor(id, problems) {
    super(`HyperFrames format "${id}" (hf/${id}/index.mjs) violates the module contract: ${problems.join("; ")}`);
    this.name = "HfContractError";
    this.formatId = id;
    this.problems = problems;
  }
}

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function entryProblems(list, what) {
  if (!Array.isArray(list)) return [`meta.${what} must be an array of {id, name, about}`];
  const out = [];
  const seen = new Set();
  list.forEach((e, i) => {
    if (!isObj(e) || !isStr(e.id) || !isStr(e.name) || !isStr(e.about)) out.push(`meta.${what}[${i}] must be {id, name, about} with non-empty strings`);
    else if (seen.has(e.id)) out.push(`meta.${what}[${i}] duplicates id "${e.id}"`);
    else seen.add(e.id);
  });
  return out;
}

/** Contract problems of a loaded module (empty list when it is valid). */
export function hfContractProblems(id, mod) {
  const out = [];
  const m = mod?.meta;
  if (!isObj(m)) return ["export `meta` is missing or not an object"];
  if (m.id !== id) out.push(`meta.id must equal the directory name "${id}" (got ${JSON.stringify(m.id)})`);
  if (!isStr(m.name)) out.push("meta.name must be a non-empty string");
  if (!isStr(m.about)) out.push("meta.about must be a non-empty string");
  if (!Array.isArray(m.modes) || !m.modes.length || m.modes.some((x) => !HF_MODES.includes(x))) out.push(`meta.modes must be a non-empty subset of ${JSON.stringify(HF_MODES)}`);
  out.push(...entryProblems(m.styles, "styles"), ...entryProblems(m.settings, "settings"));
  if (m.defaults !== undefined && !isObj(m.defaults)) out.push("meta.defaults must be an object when present");
  if (!mod.payloadSchema || typeof mod.payloadSchema.safeParse !== "function") out.push("export `payloadSchema` must be a zod schema (has no safeParse)");
  if (!isStr(mod.promptSection)) out.push("export `promptSection` must be a non-empty string");
  if (typeof mod.compose !== "function") out.push("export `compose` must be an async function");
  if (mod.normalize !== undefined && typeof mod.normalize !== "function") out.push("export `normalize` must be a function when present");
  return out;
}

/**
 * Load every `<dir>/<id>/index.mjs`. Strict: a module that violates the contract (or fails to import) throws a
 * clear error naming the format and every problem. Directories without index.mjs are skipped (work in progress).
 * @returns {Promise<Map<string, {id: string, module: object, internal: boolean}>>}
 */
export async function loadHfRegistry(dir = HF_DIR) {
  const out = new Map();
  const ids = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && existsSync(join(dir, d.name, "index.mjs")))
    .map((d) => d.name)
    .sort();
  for (const id of ids) {
    let mod;
    try {
      mod = await import(pathToFileURL(join(dir, id, "index.mjs")).href);
    } catch (e) {
      throw new HfContractError(id, [`the module failed to load: ${e.message}`]);
    }
    const problems = hfContractProblems(id, mod);
    if (problems.length) throw new HfContractError(id, problems);
    out.set(id, { id, module: mod, internal: isInternalId(id) });
  }
  return out;
}

const REGISTRY = await loadHfRegistry();

const visible = () => [...REGISTRY.values()].filter((e) => !e.internal || hfInternalEnabled());

/** Formats shown to users, in id order; `includeInternal` forces the underscore ones in. */
export function listHfFormats({ includeInternal = false } = {}) {
  return [...REGISTRY.values()].filter((e) => !e.internal || includeInternal || hfInternalEnabled()).map((e) => ({ ...e.module.meta, internal: e.internal }));
}

export const isHfTemplate = (id) => visible().some((e) => e.id === id);

/** The format module for an id. Throws a clear error (with the available ids) when it is not registered. */
export function getHfFormat(id) {
  const e = visible().find((x) => x.id === id);
  if (!e) throw new Error(`Unknown HyperFrames format "${id}". Available: ${visible().map((x) => x.id).join(", ") || "(none)"}`);
  return e.module;
}

const DEFAULT_PREVIEW = { style: "hyperframes", gradient: ["#0F0C29", "#302B63"], accent: "#FFD60A" };

/** Template-catalog entry of a format (what `templates` / `template <id>` print, and what resolveSpec takes defaults from). */
export function hfTemplateEntry(id) {
  const mod = getHfFormat(id);
  const m = mod.meta;
  const d = m.defaults ?? {};
  return {
    id,
    name: m.name,
    category: m.category ?? "hyperframes",
    format: id,
    description: m.about,
    prompt_hint: m.promptHint ?? `HyperFrames format with its own captions. Modes: ${m.modes.join(", ")}. Styles: ${m.styles.map((s) => s.id).join(", ") || "n/a"}. Put the format payload in spec.hf; run \`node cli.mjs prompt ${id}\` for the full guidance.`,
    best_for: m.best_for ?? [m.about],
    preview: { ...DEFAULT_PREVIEW, sample_text: m.name, ...(m.preview ?? {}) },
    engine: "hyperframes",
    ownsCaptions: true,
    modes: m.modes,
    styles: m.styles,
    settings: m.settings,
    defaults: {
      ...d,
      sfx: { enabled: true, volume: 1, ...(d.sfx ?? {}) },
      music: { provider: "library", mood: "auto", duck: true, ...(d.music ?? {}) },
    },
  };
}

/** Catalog entries of every visible format. */
export const hfTemplateEntries = () => visible().map((e) => hfTemplateEntry(e.id));

/** Spec-writer prompt for a format: the common rules (given) plus the module's own section. */
export function hfPromptFor(id, commonPrompt) {
  const mod = getHfFormat(id);
  return `${commonPrompt.replace(/\s+$/, "")}\n\n## HyperFrames format \`${id}\`\n\n${mod.promptSection.trim()}\n`;
}

/** Generic lenient fixes every HF spec gets (never drops content), then the module's own `normalize`. */
const MODE_ALIASES = { single: "single", "single-scene": "single", one: "single", continuous: "single", "una escena": "single", multi: "multi", "multi-scene": "multi", multiple: "multi", "varias escenas": "multi" };
export function normalizeHfSpec(raw) {
  if (!isObj(raw)) return raw;
  const mod = getHfFormat(raw.template);
  let out = { ...raw };
  if (typeof out.mode === "string") out.mode = MODE_ALIASES[out.mode.trim().toLowerCase()] ?? out.mode;
  if (Array.isArray(out.scenes)) {
    out.scenes = out.scenes.map((s, i) => (isObj(s) ? { ...s, id: isStr(s.id) ? s.id : `s${i + 1}`, visual: s.visual ?? { type: "gradient" } } : s));
  }
  if (typeof mod.normalize === "function") out = mod.normalize(out) ?? out;
  return out;
}

/** Validate `spec.hf` (or the format's default payload) with the module's schema. */
export function parseHfPayload(spec) {
  const mod = getHfFormat(spec.template);
  const input = spec.hf ?? mod.meta.defaults?.hf ?? {};
  const r = mod.payloadSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data, errors: [] };
  return { ok: false, data: null, errors: r.error.issues.map((i) => ({ path: ["hf", ...i.path], message: i.message })) };
}

registerHfSupport({
  isHf: isHfTemplate,
  normalize: normalizeHfSpec,
  parse: parseHfPayload,
  modes: (id) => getHfFormat(id).meta.modes,
});
