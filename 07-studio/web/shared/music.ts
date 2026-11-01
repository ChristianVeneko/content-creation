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

/** Write the UI music choices into a spec (returns a new spec). The tone feeds mood auto-pick and ElevenLabs. */
export function applyMusicOptions(spec: VideoSpec, o: MusicOptions, tone?: string): VideoSpec {
  // SFX: 0 turns them off; otherwise only written when the spec already has sfx or the level was changed, so
  // templates without SFX by default keep them off.
  const v = clamp(o.sfxVolume, 0, 2);
  const sfx = v <= 0 ? { enabled: false, volume: spec.sfx?.volume ?? 1 } : spec.sfx || v !== 1 ? { enabled: true, volume: v } : undefined;
  if (!o.enabled) return { ...spec, music: { volume: clamp(o.volume, 0, 1), provider: "none" }, sfx };
  const music: VideoSpec["music"] = {
    provider: o.provider,
    mood: o.mood || "auto",
    volume: clamp(o.volume, 0, 1),
    duck: true,
  };
  if (o.provider === "library" && o.track) music.track = o.track;
  if (o.provider === "elevenlabs" && o.prompt.trim()) music.prompt = o.prompt.trim().slice(0, 600);
  const t = tone?.trim() || spec.music?.tone;
  if (t) music.tone = t.slice(0, 120);
  return { ...spec, music, sfx };
}

/** Read the UI choices back from a spec (storyboard). */
export function musicOptionsFromSpec(spec: VideoSpec): MusicOptions {
  const m = spec.music;
  return {
    enabled: m?.provider !== "none",
    provider: m?.provider === "elevenlabs" ? "elevenlabs" : "library",
    mood: m?.mood ?? "auto",
    track: m?.track && m.track !== "auto" ? m.track : "",
    volume: m?.volume ?? MUSIC_REF_VOLUME,
    sfxVolume: spec.sfx ? (spec.sfx.enabled === false ? 0 : spec.sfx.volume ?? 1) : 1,
    prompt: m?.prompt ?? "",
  };
}
