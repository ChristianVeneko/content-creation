// ElevenLabs voice library: trending Latin American Spanish voices, cached inside the repo.
// Library voices work in text-to-speech by voice_id without adding them to the account.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const VOICES_TTL_MS = 24 * 60 * 60 * 1000;
/** Auto-pick rotates among this many top trending voices so a batch does not sound identical. */
export const AUTO_PICK_TOP = 5;

const SPAIN = new Set(["peninsular", "castilian", "spanish", "spain", "andalusian"]);

/** True for Spanish voices with a Latin American accent (anything that is not from Spain). */
export function isLatamVoice(v) {
  const accent = String(v.accent || "").toLowerCase().trim();
  const locale = String(v.locale || "").toLowerCase();
  if (locale === "es-es") return false;
  return !SPAIN.has(accent);
}

function slim(v) {
  return {
    voiceId: v.voice_id,
    name: String(v.name || "").trim(),
    accent: v.accent || "",
    locale: v.locale || "",
    gender: v.gender || "",
    useCase: v.use_case || "",
    description: v.description || "",
    previewUrl: v.preview_url || "",
    uses7d: v.usage_character_count_7d ?? 0,
  };
}

function readCache(file) {
  try {
    return { voices: JSON.parse(readFileSync(file, "utf8")).voices, ageMs: Date.now() - statSync(file).mtimeMs };
  } catch {
    return null;
  }
}

/**
 * Trending Latin American Spanish voices from the ElevenLabs library, most trending first.
 * Cached for `ttlMs`; on an API error the stale cache is returned, else []. Never throws.
 */
export async function trendingVoices({
  gender = "male",
  apiKey = process.env.ELEVENLABS_API_KEY,
  cacheDir = join(process.env.CC_CACHE || join(process.cwd(), ".cache"), "elevenlabs"),
  ttlMs = VOICES_TTL_MS,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) return [];
  const file = join(cacheDir, `voices-es-latam-${gender}.json`);
  const cached = readCache(file);
  if (cached && cached.ageMs < ttlMs && Array.isArray(cached.voices)) return cached.voices;
  try {
    const url = new URL("https://api.elevenlabs.io/v1/shared-voices");
    url.searchParams.set("language", "es");
    url.searchParams.set("gender", gender);
    url.searchParams.set("sort", "trending");
    url.searchParams.set("page_size", "60");
    const res = await fetchImpl(url.toString(), { headers: { "xi-api-key": apiKey } });
    if (!res.ok) throw new Error(`ElevenLabs voices failed (${res.status})`);
    const body = await res.json();
    const voices = (body.voices || []).filter(isLatamVoice).map(slim).filter((v) => v.voiceId);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, JSON.stringify({ voices }, null, 2) + "\n");
    return voices;
  } catch {
    return Array.isArray(cached?.voices) ? cached.voices : [];
  }
}

/** Deterministic pick among the top trending voices: the same seed (title, lote id) gets the same voice. */
export function pickVoice(voices, seed = "") {
  if (!voices.length) return null;
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return voices[h % Math.min(AUTO_PICK_TOP, voices.length)];
}
