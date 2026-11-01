// Music selection: the curated library (03-assets/music/library.json), mood auto-pick, anti-repeat history,
// optional ElevenLabs Music generation (cached, falls back to the library), and level mapping (volume → dB).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, normalize, relative } from "node:path";
import { CC_ROOT } from "./env.mjs";

export const MUSIC_ROOT = () => join(CC_ROOT, "03-assets", "music");
export { MOODS, MOOD_LABELS, MUSIC_PROVIDERS } from "./music-moods.mjs";
import { MOODS, MOOD_LABELS } from "./music-moods.mjs";

// ---------- levels ----------
/** `music.volume` 0.12 is the reference: the music bed sits 13 dB under the voice (unducked). */
export const MUSIC_REF = { volume: 0.12, underVoiceDb: 13 };
/** `sfx.volume` 1 is the reference: SFX peaks sit 12 dB under the voice peaks. */
export const SFX_REF = { volume: 1, underVoiceDb: 12 };
/** How far the music dips while words are spoken (dB) and its smoothing (s). */
export const DUCK = { depthDb: 9, attackSec: 0.18, releaseSec: 0.55 };

const dB = (x) => 20 * Math.log10(Math.max(1e-6, x));
const r1 = (x) => Math.round(x * 10) / 10;
/** Music level relative to the voice (dB, negative = under) for a `music.volume`, without ducking. */
export const musicLevelDb = (volume) => (volume <= 0 ? -Infinity : r1(-MUSIC_REF.underVoiceDb + dB(volume / MUSIC_REF.volume)));
/** Music level under the voice while words are spoken (ducked). */
export const musicDuckedLevelDb = (volume, duck = true) => (volume <= 0 ? -Infinity : r1(musicLevelDb(volume) - (duck ? DUCK.depthDb : 0)));
/** SFX level relative to the voice peaks (dB) for an `sfx.volume`. */
export const sfxLevelDb = (volume) => (volume <= 0 ? -Infinity : r1(-SFX_REF.underVoiceDb + dB(volume / SFX_REF.volume)));

// ---------- library ----------
/** Commercial-safe licenses only: CC0 and CC BY (any version). NC, ND and SA variants are refused. */
export function isAllowedLicense(license) {
  const l = String(license ?? "").toUpperCase().replace(/-/g, " ");
  if (/\b(NC|ND|SA)\b/.test(l)) return false;
  return /^CC0\b/.test(l) || /^CC BY( \d(\.\d)?)?$/.test(l) || l === "PUBLIC DOMAIN";
}

/**
 * Load and vet library.json. Entries with a disallowed license, no credit, an unknown mood, a missing file or a
 * path escaping the music folder are dropped (reported in `rejected`).
 * @returns {{tracks: object[], rejected: {id: string, reason: string}[]}}
 */
export function loadLibrary(root = MUSIC_ROOT()) {
  const file = join(root, "library.json");
  if (!existsSync(file)) return { tracks: [], rejected: [] };
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const tracks = [];
  const rejected = [];
  const seen = new Set();
  for (const t of Array.isArray(raw) ? raw : []) {
    const reject = (reason) => rejected.push({ id: t?.id ?? "?", reason });
    if (!t?.id || seen.has(t.id)) { reject("missing or duplicate id"); continue; }
    if (!isAllowedLicense(t.license)) { reject(`license not allowed: ${t.license}`); continue; }
    if (!t.credit) { reject("missing credit"); continue; }
    if (!MOODS.includes(t.mood)) { reject(`unknown mood: ${t.mood}`); continue; }
    const rel = normalize(String(t.file ?? ""));
    if (!rel || isAbsolute(rel) || rel.startsWith("..")) { reject("file must be relative to the music folder"); continue; }
    const abs = join(root, rel);
    if (!existsSync(abs)) { reject(`file not found: ${rel}`); continue; }
    seen.add(t.id);
    const stem = rel.split("/").pop().replace(/\.[^.]+$/, "");
    const cuesFile = join(root, rel.split("/").slice(0, -1).join("/"), "cues", `${stem}.music-cues.json`);
    let firstBeat = 0;
    if (existsSync(cuesFile)) {
      try {
        firstBeat = JSON.parse(readFileSync(cuesFile, "utf8")).beats?.[0]?.time ?? 0;
      } catch {
        firstBeat = 0;
      }
    }
    tracks.push({ ...t, path: abs, firstBeat });
  }
  return { tracks, rejected };
}

/** Public listing for the CLI / web: moods with labels and counts, tracks without absolute paths. */
export function libraryListing(root = MUSIC_ROOT()) {
  const { tracks } = loadLibrary(root);
  return {
    moods: MOODS.map((id) => ({ id, label: MOOD_LABELS[id], count: tracks.filter((t) => t.mood === id).length })),
    tracks: tracks.map(({ path, firstBeat, check, ...t }) => t),
    levels: { music: MUSIC_REF, sfx: SFX_REF, duck: DUCK },
  };
}

// ---------- mood auto-pick ----------
/** Keyword rules (Spanish + English), checked in order of score. */
const MOOD_KEYWORDS = {
  "tense-mystery": ["misterio", "mystery", "secreto", "secret", "oscuro", "dark", "crimen", "crime", "hack", "estafa", "scam", "peligro", "danger", "riesgo", "risk", "error", "errores", "fallo", "bug", "miedo", "fear", "tension", "tensión", "suspenso", "suspense", "alerta", "alarma", "urgente", "breaking", "noticia", "news", "verdad", "truth"],
  "cinematic-epic": ["épico", "epico", "epic", "historia", "history", "batalla", "battle", "guerra", "war", "poder", "power", "imperio", "empire", "leyenda", "legend", "cine", "cinematic", "dramático", "dramatico", "drama", "revolución", "revolucion", "futuro", "future", "universo", "space", "espacio"],
  "inspiring-uplifting": ["motivación", "motivacion", "motivation", "inspira", "inspiring", "éxito", "exito", "success", "sueño", "sueños", "dream", "logro", "lograr", "achieve", "crecer", "growth", "superar", "hábito", "habito", "habits", "salud", "health", "gimnasio", "gym", "fitness", "emprender", "startup", "carrera", "career", "aprender", "learn"],
  "tech-lofi": ["código", "codigo", "code", "programar", "programación", "programacion", "programming", "developer", "dev", "ia", "ai", "llm", "claude", "gpt", "software", "api", "tech", "tecnología", "tecnologia", "app", "sdd", "odd", "git", "terminal", "python", "javascript", "react", "datos", "data", "tutorial", "productividad", "productivity", "estudio", "study"],
  "minimal-ambient": ["calma", "calm", "relax", "meditación", "meditacion", "meditation", "minimal", "minimalismo", "sereno", "zen", "dormir", "sleep", "naturaleza", "nature", "reflexión", "reflexion", "filosofía", "filosofia", "philosophy", "cita", "quote", "frase"],
  "upbeat-fun": ["divertido", "fun", "funny", "humor", "chiste", "joke", "curioso", "curiosidad", "curious", "dato", "datos curiosos", "fact", "facts", "receta", "recipe", "comida", "food", "viaje", "travel", "fiesta", "party", "juego", "game", "top", "ranking", "truco", "trucos", "tips", "hack de vida", "lifehack"],
  "corporate-happy": ["negocio", "negocios", "business", "empresa", "company", "marketing", "ventas", "sales", "cliente", "clientes", "customer", "producto", "product", "corporativo", "corporate", "finanzas", "finance", "dinero", "money"],
};
/** Template id → default mood when the text gives no signal (matched by substring, new templates included). */
const TEMPLATE_MOODS = [
  [/ui-cards/, "tech-lofi"],
  [/flat-depth/, "corporate-happy"],
  [/soft-gradient/, "minimal-ambient"],
  [/^pixel-/, "upbeat-fun"],
  [/moody-night/, "tense-mystery"],
  [/soft-studio/, "minimal-ambient"],
  [/voxel-world/, "upbeat-fun"],
  [/neon-grid/, "tech-lofi"],
  [/clay|diorama/, "upbeat-fun"],
  [/neon|glass/, "tech-lofi"],
  [/hero|product|pedestal/, "cinematic-epic"],
  [/iso-/, "corporate-happy"],
  [/news|breaking|broadcast|noticia/, "tense-mystery"],
  [/code|tutorial|terminal|editor-window/, "tech-lofi"],
  [/data|chart|story/, "inspiring-uplifting"],
  [/whiteboard|hand|sketch/, "upbeat-fun"],
  [/countdown|top|rank-/, "upbeat-fun"],
  [/quote|letterbox/, "minimal-ambient"],
  [/kinetic/, "cinematic-epic"],
  [/explainer|illustrated/, "tech-lofi"],
  [/captions/, "inspiring-uplifting"],
];
/** Tone words (from the UI "tone" field, spec.music.tone or theme) → mood. */
const TONE_MOODS = [
  [/serio|serious|dramátic|dramatic|épic|epic/, "cinematic-epic"],
  [/tens|misteri|myster|urgent|alarm/, "tense-mystery"],
  [/inspir|motiv|positiv|optimis/, "inspiring-uplifting"],
  [/calm|tranquil|relaj|relax|minimal|reflex/, "minimal-ambient"],
  [/divert|fun|humor|jugu|playful|energ|alegre|happy/, "upbeat-fun"],
  [/técnic|tecnic|technical|geek|nerd|chill|lofi|lo-fi/, "tech-lofi"],
  [/corporat|profesional|professional|formal/, "corporate-happy"],
];

const normText = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const tokenize = (s) => new Set(normText(s).split(/[^a-z0-9]+/).filter(Boolean));

/**
 * Deterministic mood for a spec: explicit tone first, then topic keywords (title, narration, hashtags), then the
 * template's default. Library moods without tracks are skipped by the caller.
 * @param {{template?: string, title?: string, tone?: string, scenes?: {narration?: string}[], post?: {hashtags?: string[]}}} spec
 */
export function autoMood(spec) {
  const tone = normText(spec.music?.tone ?? spec.tone ?? "");
  if (tone) for (const [re, mood] of TONE_MOODS) if (re.test(tone)) return mood;
  const titleTokens = tokenize(spec.title);
  const bodyTokens = tokenize([...(spec.scenes ?? []).map((s) => s.narration), ...(spec.post?.hashtags ?? [])].join(" "));
  let best = null;
  let bestScore = 0;
  for (const mood of Object.keys(MOOD_KEYWORDS)) {
    let score = 0;
    for (const kw of MOOD_KEYWORDS[mood].map(normText)) {
      if (kw.includes(" ")) {
        if (normText(spec.title).includes(kw)) score += 3;
        continue;
      }
      if (titleTokens.has(kw)) score += 3; // the title is the strongest signal
      if (bodyTokens.has(kw)) score += 1;
    }
    if (score > bestScore) [best, bestScore] = [mood, score];
  }
  if (best && bestScore >= 2) return best;
  const tpl = String(spec.template ?? "");
  for (const [re, mood] of TEMPLATE_MOODS) if (re.test(tpl)) return mood;
  return "tech-lofi";
}

// ---------- track pick ----------
export const hashStr = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Pick a library track. Order: explicit `track` id (exact, then substring) → tracks of `mood` → any track.
 * Within the pool the choice is deterministic by `seed`, prefers tracks long enough for the video, and skips the
 * ids in `recent` (previous renders) whenever another candidate exists.
 */
export function pickLibraryTrack({ tracks, track, mood, totalSec = 0, seed = "", recent = [] }) {
  if (!tracks?.length) return null;
  if (track && track !== "auto") {
    const hit = tracks.find((t) => t.id === track) ?? tracks.find((t) => t.id.includes(track));
    if (hit) return hit;
  }
  let pool = tracks.filter((t) => t.mood === mood);
  if (!pool.length) pool = tracks.filter((t) => t.mood !== "corporate-happy");
  if (!pool.length) pool = tracks;
  const long = pool.filter((t) => !t.durationSec || t.durationSec - (t.firstBeat ?? 0) >= totalSec);
  if (long.length) pool = long;
  const fresh = pool.filter((t) => !recent.includes(t.id));
  if (fresh.length) pool = fresh;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[hashStr(seed) % sorted.length];
}

// ---------- history (avoid repeating the same track on consecutive renders) ----------
const HISTORY_MAX = 6;
export const historyFile = (root = MUSIC_ROOT()) => join(root, ".history.json");
export function readHistory(root = MUSIC_ROOT()) {
  try {
    const h = JSON.parse(readFileSync(historyFile(root), "utf8"));
    return Array.isArray(h) ? h.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export function pushHistory(id, root = MUSIC_ROOT()) {
  try {
    const h = [id, ...readHistory(root).filter((x) => x !== id)].slice(0, HISTORY_MAX);
    writeFileSync(historyFile(root), JSON.stringify(h) + "\n");
  } catch {
    /* history is best effort */
  }
}

// ---------- ElevenLabs Music ----------
export const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/music";
export const ELEVENLABS_MUSIC_MODEL = "music_v1";
const MOOD_PROMPTS = {
  "tech-lofi": "chill lo-fi hip hop beat, mellow electric piano, soft vinyl texture, steady relaxed drums, modern tech vibe",
  "cinematic-epic": "cinematic epic orchestral underscore, big percussion, strings and brass building tension, trailer style",
  "tense-mystery": "tense mysterious underscore, pulsing low synth bass, subtle ticking percussion, suspenseful dark atmosphere",
  "inspiring-uplifting": "inspiring uplifting corporate pop, bright piano and guitar, positive building drums, motivational",
  "minimal-ambient": "minimal ambient pads, calm and airy, slow evolving textures, gentle and unobtrusive",
  "upbeat-fun": "upbeat fun playful pop, bouncy rhythm, happy synths and claps, energetic and light",
  "corporate-happy": "happy corporate background music, clean guitars, light claps, positive and professional",
};

/** Prompt for a generated bed: the user's prompt, else mood + tone. Always instrumental background music. */
export function musicPrompt({ prompt, mood, tone }) {
  if (prompt?.trim()) return `${prompt.trim()}. Instrumental background music for a short vertical video, no vocals.`;
  return `${MOOD_PROMPTS[mood] ?? MOOD_PROMPTS["tech-lofi"]}${tone ? `, ${tone} tone` : ""}. Instrumental background music for a short vertical video voiceover, no vocals, consistent energy, loopable ending.`;
}

/** Requested length: video length rounded up to the next whole second (API range 3-600 s). */
export const musicLengthMs = (totalSec) => Math.min(600_000, Math.max(3000, Math.ceil(totalSec) * 1000));

/**
 * Generate (or reuse from cache) an ElevenLabs Music track. Cached under 03-assets/music/generated/<hash>.mp3 with a
 * <hash>.json metadata sidecar. Throws on any API error (the caller falls back to the library).
 */
export async function generateElevenLabsMusic({ prompt, lengthMs, apiKey = process.env.ELEVENLABS_API_KEY, root = MUSIC_ROOT(), fetchImpl = fetch }) {
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const key = createHash("sha256").update(JSON.stringify({ prompt, lengthMs, model: ELEVENLABS_MUSIC_MODEL })).digest("hex").slice(0, 16);
  const dir = join(root, "generated");
  const file = join(dir, `${key}.mp3`);
  const metaFile = join(dir, `${key}.json`);
  if (existsSync(file) && existsSync(metaFile)) return { ...JSON.parse(readFileSync(metaFile, "utf8")), path: file, cached: true };
  const res = await fetchImpl(`${ELEVENLABS_MUSIC_URL}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ prompt, music_length_ms: lengthMs, model_id: ELEVENLABS_MUSIC_MODEL, force_instrumental: true }),
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`ElevenLabs Music failed (${res.status}): ${body}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`ElevenLabs Music returned ${buf.length} bytes`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, buf);
  const headers = {};
  for (const h of ["song-id", "x-song-id", "character-cost", "x-character-count", "request-id", "x-request-id"]) {
    const v = res.headers?.get?.(h);
    if (v) headers[h] = v;
  }
  const meta = {
    id: `elevenlabs-${key}`,
    mood: null,
    title: "Custom track",
    artist: "ElevenLabs Music",
    file: relative(root, file),
    durationSec: lengthMs / 1000,
    license: "ElevenLabs Music (generated)",
    credit: "Music: generated with ElevenLabs Music",
    prompt,
    model: ELEVENLABS_MUSIC_MODEL,
    createdAt: new Date().toISOString(),
    response: headers,
  };
  writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
  return { ...meta, path: file, cached: false };
}

/**
 * Resolve the music for a build. Returns `{track: {file, firstBeat, id, title, credit}|null, credit, note}`.
 * provider "none" → no music; "elevenlabs" → generated (fallback to library on any error, logged via `log`);
 * "library" → explicit file, explicit track, or mood (auto → autoMood).
 */
export async function resolveMusic(spec, { totalSec, resolveFile = () => null, log = () => {}, root = MUSIC_ROOT(), fetchImpl = fetch, history = true } = {}) {
  const m = spec.music ?? {};
  const provider = m.provider ?? "library";
  if (provider === "none") return { track: null, note: "Music disabled (provider none)" };
  if (m.file) {
    const p = resolveFile(m.file);
    if (p) return { track: { id: "file", file: p, firstBeat: 0, title: m.file, credit: null }, note: `Music file ${m.file}` };
    log(`Music file not found (${m.file}); using the library`);
  }
  const mood = m.mood && m.mood !== "auto" ? m.mood : autoMood(spec);
  if (provider === "elevenlabs") {
    try {
      const g = await generateElevenLabsMusic({ prompt: musicPrompt({ prompt: m.prompt, mood, tone: m.tone }), lengthMs: musicLengthMs(totalSec), root, fetchImpl });
      return { track: { id: g.id, file: g.path, firstBeat: 0, title: g.title, credit: g.credit }, mood, note: `ElevenLabs Music ${g.cached ? "(cached)" : "(generated)"} ${g.file}` };
    } catch (e) {
      log(`${e.message} — falling back to the music library`);
    }
  }
  const { tracks } = loadLibrary(root);
  const recent = history ? readHistory(root).slice(0, 2) : [];
  const t = pickLibraryTrack({ tracks, track: m.track, mood, totalSec, seed: spec.title ?? "", recent });
  if (!t) return { track: null, mood, note: "Music library is empty" };
  if (history) pushHistory(t.id, root);
  return { track: { id: t.id, file: t.path, firstBeat: t.firstBeat, title: t.title, credit: t.credit }, mood, note: `Music ${t.id} (${t.mood})` };
}
