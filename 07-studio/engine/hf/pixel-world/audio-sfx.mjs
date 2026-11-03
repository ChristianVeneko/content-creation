// 24 synthesized pixel sound effects (square/triangle chirps, noise bursts). Ported and extended from the hand-made
// reference (04-projects/2026-11-03-pixel-que-es-un-token-en-la-ia/src/synth.mjs). Every voice is a pure function
// of (pitch multiplier, a PRNG seeded from the voice name), so a voice is the same bytes on every call.
import { SR, TAU, gen, sq, tri, prng, hashSeed, encodeWav, peakOf } from "./audio-dsp.mjs";

const click = (t) => Math.min(1, t * 400); // 2.5 ms attack: no pop at the start

/** Pitch sweep f0 -> f1 (exponential) with an exponential decay; shape: sin | sq | tri. */
function sweep(f0, f1, dur, shape = "sin", decay = 6, duty = 0.5) {
  let ph = 0;
  return gen(dur, (t) => {
    const f = f0 * Math.pow(f1 / f0, t / dur);
    ph += f / SR;
    const w = shape === "sq" ? sq(ph, duty) * 0.6 : shape === "tri" ? tri(ph) : Math.sin(ph * TAU);
    return w * Math.exp((-decay * t) / dur) * click(t);
  });
}
/** Low-passed noise burst whose cutoff glides lpStart -> lpEnd (0..1 smoothing coefficients). */
function noise(rnd, dur, lpStart, lpEnd, decay = 4) {
  let y = 0;
  return gen(dur, (t) => {
    const k = lpStart + (lpEnd - lpStart) * (t / dur);
    y += k * (rnd() - y);
    return y * Math.exp((-decay * t) / dur) * Math.min(1, t * 300);
  });
}
/** Mix parts [offsetSec, samples, gain?] into one buffer. */
function cat(...parts) {
  const n = Math.max(...parts.map(([o, a]) => Math.floor(o * SR) + a.length));
  const out = new Float32Array(n);
  for (const [o, a, g = 1] of parts) { const s = Math.floor(o * SR); for (let i = 0; i < a.length; i++) out[s + i] += a[i] * g; }
  return out;
}
/** A run of square notes (frequencies in Hz) of `step` seconds each. */
const run = (freqs, step, shape = "sq", decay = 3, g = 0.7) => cat(...freqs.map((f, i) => [i * step, sweep(f, f, step * 1.6, shape, decay), g]));

// voice(p, rnd): p is a pitch multiplier (1 = nominal). Frequencies below scale with p.
export const SFX_VOICES = {
  pop: (p) => sweep(750 * p, 260 * p, 0.1, "sin", 5),
  blip: (p) => sweep(1250 * p, 1250 * p, 0.06, "sq", 4),
  ping: (p) => cat([0, sweep(1568 * p, 1568 * p, 0.4, "sin", 5)], [0, sweep(2352 * p, 2352 * p, 0.3, "sin", 6), 0.4]),
  coin: (p) => cat([0, sweep(988 * p, 988 * p, 0.07, "sq", 2), 0.7], [0.07, sweep(1319 * p, 1319 * p, 0.3, "sq", 5), 0.7]),
  thud: (p, r) => cat([0, sweep(120 * p, 45 * p, 0.3, "sin", 5)], [0, noise(r, 0.12, 0.2, 0.05, 6), 0.7]),
  burst: (p, r) => cat([0, noise(r, 0.45, 0.6, 0.1, 4), 0.7], [0, sweep(600 * p, 900 * p, 0.07, "sq", 3), 0.5], [0.07, sweep(800 * p, 1200 * p, 0.07, "sq", 3), 0.5], [0.14, sweep(1000 * p, 1600 * p, 0.1, "sq", 3), 0.5]),
  slash: (p, r) => cat([0, noise(r, 0.22, 0.9, 0.5, 5), 0.8], [0, sweep(2400 * p, 300 * p, 0.2, "sin", 4), 0.6]),
  stamp: (p, r) => cat([0, sweep(180 * p, 60 * p, 0.2, "sq", 5), 0.8], [0, noise(r, 0.08, 0.9, 0.3, 6), 0.8], [0.02, sweep(900 * p, 400 * p, 0.08, "sq", 5), 0.4]),
  hit: (p, r) => cat([0, sweep(80 * p, 32 * p, 0.55, "sin", 4)], [0, noise(r, 0.3, 0.5, 0.05, 5), 0.8], [0, sweep(500 * p, 150 * p, 0.06, "sq", 5), 0.4]),
  whoosh: (p, r) => { let y = 0; const d = 0.5; return gen(d, (t) => { const k = (0.03 + 0.5 * Math.sin((t / d) * Math.PI)) * p; y += Math.min(0.95, k) * (r() - y); return y * Math.sin((t / d) * Math.PI) * 1.8; }); },
  whooshUp: (p, r) => { let y = 0; const d = 0.42; return gen(d, (t) => { const k = Math.min(0.95, (0.04 + 0.6 * (t / d) ** 1.5) * p); y += k * (r() - y); return y * Math.sin((t / d) * Math.PI * 0.9 + 0.1) * 1.7; }); },
  whooshDown: (p, r) => { let y = 0; const d = 0.42; return gen(d, (t) => { const k = Math.min(0.95, (0.6 * (1 - t / d) ** 1.5 + 0.04) * p); y += k * (r() - y); return y * Math.sin(((1 - t / d) * 0.9 + 0.1) * Math.PI) * 1.7; }); },
  tick: (p, r) => cat([0, noise(r, 0.02, 0.9, 0.9, 3), 0.6], [0, sweep(2000 * p, 2000 * p, 0.03, "sq", 4), 0.5]),
  rise: (p) => sweep(300 * p, 1500 * p, 0.28, "sq", 2, 0.25),
  fall: (p) => sweep(900 * p, 140 * p, 0.55, "sin", 3),
  step: (p, r) => cat([0, noise(r, 0.05, 0.7, 0.25, 6), 0.6], [0, sweep(260 * p, 140 * p, 0.05, "sq", 5, 0.25), 0.5]),
  jump: (p) => sweep(330 * p, 880 * p, 0.17, "sq", 2.5, 0.25),
  powerup: (p) => run([523, 659, 784, 1047, 1319].map((f) => f * p), 0.055, "sq", 2.5, 0.65),
  error: (p) => cat([0, sweep(220 * p, 220 * p, 0.12, "sq", 1.5, 0.5), 0.7], [0.13, sweep(165 * p, 165 * p, 0.2, "sq", 3, 0.5), 0.7]),
  transition: (p, r) => cat([0, run([392, 523, 659, 784, 1047, 1319].map((f) => f * p), 0.045, "sq", 3, 0.5)], [0, noise(r, 0.4, 0.5, 0.1, 4), 0.35]),
  flip: (p) => cat([0, sweep(400 * p, 1300 * p, 0.14, "sin", 1)], [0.14, sweep(1300 * p, 600 * p, 0.12, "sin", 3)]),
  poof: (p, r) => noise(r, 0.45, 0.35 * p, 0.04, 3),
  buzz: (p) => { let ph = 0; return gen(0.32, (t) => { ph += (110 * p) / SR; return (((ph % 1) * 2 - 1) * 0.5 + sq(t * 117 * p) * 0.3) * Math.exp((-3 * t) / 0.32); }); },
  select: (p) => cat([0, sweep(1047 * p, 1047 * p, 0.05, "sq", 2, 0.25), 0.7], [0.05, sweep(1568 * p, 1568 * p, 0.12, "sq", 4, 0.25), 0.7]),
};
export const SFX_NAMES = Object.keys(SFX_VOICES);

/** Render one voice to a mono Float32Array, peak-normalized to 0.9 (the mixer sets the level). */
export function renderSfx(name, pitch = 1) {
  const fn = SFX_VOICES[name];
  if (!fn) throw new Error(`pixel-world audio: unknown sfx voice "${name}"; use one of: ${SFX_NAMES.join(", ")}`);
  const rnd = prng(hashSeed(`sfx:${name}`)).signed;
  const x = fn(pitch, rnd);
  const pk = peakOf(x) || 1;
  for (let i = 0; i < x.length; i++) x[i] = (x[i] / pk) * 0.9;
  return x;
}

/** WAV buffer (44.1 kHz mono 16-bit) of one voice; the same (name, pitch) always yields the same bytes. */
export const sfxWav = (name, pitch = 1) => encodeWav([renderSfx(name, pitch)]);
