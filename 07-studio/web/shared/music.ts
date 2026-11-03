// Music/SFX level math and the mapping between the UI's MusicOptions and spec.music / spec.sfx.
// Mirrors 07-studio/engine/lib/music.mjs: music.volume 0.12 = 13 dB under the voice, ducked 9 dB more while
// words are spoken; sfx.volume 1 = 12 dB under the voice.
import type { MusicOptions, VideoSpec } from "./types.ts";

export const MUSIC_REF_VOLUME = 0.12;
export const MUSIC_UNDER_VOICE_DB = 13;
export const DUCK_DB = 9;
export const SFX_UNDER_VOICE_DB = 12;

const db = (x: number) => 20 * Math.log10(x);
const round = (x: number) => Math.round(x);

/** Music level relative to the voice in dB (negative = under). */
export const musicLevelDb = (volume: number) => (volume <= 0 ? -Infinity : round(-MUSIC_UNDER_VOICE_DB + db(volume / MUSIC_REF_VOLUME)));
export const musicDuckedDb = (volume: number) => (volume <= 0 ? -Infinity : musicLevelDb(volume) - DUCK_DB);
export const sfxLevelDb = (volume: number) => (volume <= 0 ? -Infinity : round(-SFX_UNDER_VOICE_DB + db(volume)));

/** Templates whose engine module synthesizes its own music (provider "format"). Mirrors hfTemplateEntry defaults in the engine. */
export const FORMAT_MUSIC_TEMPLATES = ["pixel-world"];
export const formatMusicAvailable = (template?: string) => FORMAT_MUSIC_TEMPLATES.includes(template ?? "");
/** Moods of the format chiptune (engine hf/pixel-world/audio-music.mjs; the engine spec schema accepts the same ids). */
export const FORMAT_MOODS: { id: string; label: string; hint: string }[] = [
  { id: "adventure", label: "Aventura", hint: "Mayor, 118 BPM, animado" },
  { id: "calm", label: "Calmado", hint: "Lofi chip, 80 BPM" },
  { id: "tense", label: "Tenso", hint: "Arcade, 132 BPM" },
  { id: "playful", label: "Divertido", hint: "Saltarín, 108 BPM" },
  { id: "mystery", label: "Misterio", hint: "Menor, 92 BPM" },
];
/** Format chiptune: unducked level against the voice (17 dB under at the reference volume) and its shallow duck. */
export const FORMAT_MUSIC_UNDER_VOICE_DB = 17;
export const FORMAT_DUCK_DB = 3.5;
export const formatMusicLevelDb = (volume: number) => (volume <= 0 ? -Infinity : round(-FORMAT_MUSIC_UNDER_VOICE_DB + db(volume / MUSIC_REF_VOLUME)));
const isFormatMood = (m: string) => FORMAT_MOODS.some((f) => f.id === m);

export const DEFAULT_MUSIC: MusicOptions = {
  enabled: true,
  provider: "library",
  mood: "auto",
  track: "",
  volume: MUSIC_REF_VOLUME,
  sfxVolume: 1,
  prompt: "",
};

const clamp = (x: number, lo: number, hi: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);

/**
 * Music choices after picking a template: formats that make their own music start on the chiptune (when the music
 * is still the untouched default), and leaving such a format puts the provider back on the library.
 */
export function musicForTemplate(m: MusicOptions, template: string): MusicOptions {
  const untouched = m.provider === "library" && m.mood === "auto" && !m.track;
  if (formatMusicAvailable(template) && untouched) return { ...m, provider: "format" };
  if (!formatMusicAvailable(template) && m.provider === "format") return { ...m, provider: "library", mood: "auto", track: "" };
  return m;
}

/** Write the UI music choices into a spec (returns a new spec). The tone feeds mood auto-pick and ElevenLabs. */
export function applyMusicOptions(spec: VideoSpec, o: MusicOptions, tone?: string): VideoSpec {
  // SFX: 0 turns them off; otherwise only written when the spec already has sfx or the level was changed, so
  // templates without SFX by default keep them off.
  const v = clamp(o.sfxVolume, 0, 2);
  const sfx = v <= 0 ? { enabled: false, volume: spec.sfx?.volume ?? 1 } : spec.sfx || v !== 1 ? { enabled: true, volume: v } : undefined;
  if (!o.enabled) return { ...spec, music: { volume: clamp(o.volume, 0, 1), provider: "none" }, sfx };
  // "format" only exists for formats that synthesize their own music; anything else falls back to the library.
  const provider = o.provider === "format" && !formatMusicAvailable(spec.template) ? "library" : o.provider;
  const mood = provider === "format" ? (isFormatMood(o.mood) ? o.mood : "auto") : isFormatMood(o.mood) ? "auto" : o.mood || "auto";
  const music: VideoSpec["music"] = {
    provider,
    mood,
    volume: clamp(o.volume, 0, 1),
    duck: true,
  };
  if (provider === "library" && o.track) music.track = o.track;
  if (provider === "elevenlabs" && o.prompt.trim()) music.prompt = o.prompt.trim().slice(0, 600);
  const t = tone?.trim() || spec.music?.tone;
  if (t) music.tone = t.slice(0, 120);
  return { ...spec, music, sfx };
}

/** Read the UI choices back from a spec (storyboard). */
export function musicOptionsFromSpec(spec: VideoSpec): MusicOptions {
  const m = spec.music;
  return {
    enabled: m?.provider !== "none",
    provider: m?.provider === "elevenlabs" ? "elevenlabs" : m?.provider === "format" ? "format" : "library",
    mood: m?.mood ?? "auto",
    track: m?.track && m.track !== "auto" ? m.track : "",
    volume: m?.volume ?? MUSIC_REF_VOLUME,
    sfxVolume: spec.sfx ? (spec.sfx.enabled === false ? 0 : spec.sfx.volume ?? 1) : 1,
    prompt: m?.prompt ?? "",
  };
}
