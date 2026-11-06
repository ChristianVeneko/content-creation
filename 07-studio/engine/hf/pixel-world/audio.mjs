// Module-provided audio for pixel-world (the engine contract `compose() -> { audio }`, see lib/build-hf.mjs):
// deterministic chiptune bed + pixel SFX bound to the resolved beats. Nothing here touches the library music or the
// SFX kit; the engine uses this INSTEAD when the music provider is "format" (the default of this format).
import { cuesFromPlan } from "./audio-cues.mjs";
import { MUSIC_MOOD_IDS, MUSIC_MOODS, renderMusic, resolveMood } from "./audio-music.mjs";
import { SFX_NAMES, sfxWav } from "./audio-sfx.mjs";
import { hashSeed } from "./audio-dsp.mjs";

export { cuesFromPlan, MUSIC_MOOD_IDS, MUSIC_MOODS, SFX_NAMES, renderMusic, resolveMood, sfxWav };
export { envelopeFromSamples, voiceEnvelope, ENV_FPS } from "./audio-env.mjs";

/** Music sits this far under the voice (dB, unducked at music.volume 0.12) and dips at most DUCK_DB around words. */
export const MUSIC_UNDER_VOICE_DB = 17;
export const DUCK_DB = 3.5;
export const LOWPASS_HZ = 2600;

/** Seed of a video: `music.seed` when given, else derived from the title so every video gets its own tune. */
export const seedOf = (spec) => (Number.isFinite(spec?.music?.seed) ? spec.music.seed : hashSeed(spec?.title ?? "pixel-world"));

/**
 * @param {{ data: object, style: object, spec: object, durationSec: number }} o resolved plan, style and spec
 * @returns {{ music?: object, sfx?: object, info: {mood?: string, seed?: number, cues: number} }}
 */
export function buildFormatAudio({ data, style, spec, durationSec }) {
  const m = spec?.music ?? {};
  const out = { info: { cues: 0 } };
  if (m.provider === "format") {
    const seed = seedOf(spec);
    const r = renderMusic({ mood: m.mood, style: style?.id, seed, durationSec, lowpassHz: LOWPASS_HZ });
    const vol = Number.isFinite(m.volume) && m.volume > 0 ? m.volume : 0.12;
    out.music = {
      wavBuffer: r.wav,
      gainDb: Math.round((-MUSIC_UNDER_VOICE_DB + 20 * Math.log10(vol / 0.12)) * 10) / 10,
      duck: m.duck === false ? 0 : DUCK_DB,
      id: `chiptune-${r.mood}-${seed}`,
      note: `${MUSIC_MOODS[r.mood].label} · ${r.key} · ${r.bpm} BPM · seed ${seed}`,
    };
    out.info.mood = r.mood;
    out.info.seed = seed;
  }
  if (spec?.sfx?.enabled !== false) {
    const cache = new Map();
    const events = cuesFromPlan(data).map((c) => {
      const key = `${c.voice}@${c.pitch}`;
      if (!cache.has(key)) cache.set(key, sfxWav(c.voice, c.pitch));
      return { at: c.at, buffer: cache.get(key), gainDb: c.gainDb, kind: c.voice };
    });
    if (events.length) out.sfx = { events };
    out.info.cues = events.length;
  }
  return out;
}
