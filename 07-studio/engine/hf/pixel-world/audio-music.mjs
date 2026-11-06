// Seeded chiptune generator for pixel-world: triangle/saw/square bass, pulse arpeggio and lead, noise hats and
// snare, sine kick, optional pad/echo/bitcrush per style. Five moods, each with its own key, tempo and chord
// progressions; the seed picks the progression, arpeggio shapes and the lead melody. The track lasts exactly
// `durationSec`, with a one-bar intro (no drums), a held tonic chord and fade for the outro, and the 2.6 kHz
// low-pass of the hand-made reference. Output: 44.1 kHz 16-bit stereo WAV, byte-identical for the same inputs.
import { SR, TAU, mtof, sq, tri, saw, prng, hashSeed, lowpass, peakOf, encodeWav } from "./audio-dsp.mjs";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const scaleOf = { major: MAJOR, minor: MINOR, dorian: DORIAN };
const every = (n, from = 0) => Array.from({ length: Math.ceil((16 - from) / n) }, (_, i) => from + i * n);
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12];

/** Format moods. `progs` are chord roots as 0-based scale degrees (one chord per bar). Steps are 16ths of a bar. */
export const MUSIC_MOODS = {
  adventure: { label: "Aventura", root: 60, mode: "major", bpm: 118, progs: [[0, 4, 5, 3], [0, 3, 4, 3], [0, 5, 3, 4]], bass: "eighths", arpEvery: 2, arpDecay: 4.2, kick: [0, 8], snare: [4, 12], hat: every(2), leadRests: 0.25 },
  calm: { label: "Calmado (lofi chip)", root: 57, mode: "minor", bpm: 80, progs: [[0, 5, 2, 6], [0, 3, 6, 2], [0, 5, 3, 6]], bass: "half", arpEvery: 2, arpDecay: 3, kick: [0, 10], snare: [], hat: [4, 12], leadRests: 0.5 },
  tense: { label: "Tenso (arcade)", root: 62, mode: "minor", bpm: 132, progs: [[0, 5, 6, 4], [0, 0, 5, 6], [0, 3, 5, 4]], bass: "pulse", arpEvery: 1, arpDecay: 6, kick: [0, 4, 8, 12], snare: [4, 12], hat: every(2, 2), leadRests: 0.3 },
  playful: { label: "Divertido", root: 65, mode: "major", bpm: 108, progs: [[0, 5, 3, 4], [0, 3, 0, 4], [0, 1, 4, 0]], bass: "bounce", arpEvery: 2, arpDecay: 7, kick: [0, 6, 10], snare: [4, 12], hat: [2, 6, 10, 14], leadRests: 0.2 },
  mystery: { label: "Misterio", root: 52, mode: "dorian", bpm: 92, progs: [[0, 6, 3, 4], [0, 3, 0, 6], [0, 5, 6, 3]], bass: "half", arpEvery: 2, arpDecay: 2.4, kick: [0], snare: [], hat: [8], leadRests: 0.55 },
};
export const MUSIC_MOOD_IDS = Object.keys(MUSIC_MOODS);

/** Per-style flavour. `ch` limits the voices: "dmg" = 2 channels (pulse + triangle) and soft noise like a Game Boy. */
const DEFAULT_FLAVOUR = { lead: true, pad: false, echo: 0, crush: 0, pwm: false, duty: [0.5, 0.25], bass: "tri", mood: "adventure", stereo: false };
export const STYLE_FLAVOUR = {
  "pixel-gameboy-dmg": { lead: false, duty: [0.5, 0.25], bass: "tri", mood: "calm", dmg: true },
  "pixel-nes-8bit": { lead: true, duty: [0.25, 0.125], bass: "tri", mood: "adventure" },
  "pixel-snes-16bit": { lead: true, pad: true, echo: 0.3, duty: [0.5, 0.25], bass: "tri", mood: "adventure", stereo: true, vibrato: true },
  "pixel-pico8": { lead: true, duty: [0.5, 0.25], bass: "tri", mood: "playful" },
  "pixel-crt-arcade": { lead: true, duty: [0.125, 0.25], bass: "sq", mood: "tense" },
  "pixel-1bit-dither": { lead: false, duty: [0.5, 0.5], bass: "sq", mood: "mystery", crush: 5 },
  "pixel-cyberpunk-neon": { lead: true, echo: 0.25, duty: [0.25, 0.125], bass: "saw", mood: "tense", stereo: true },
  "pixel-noir": { lead: true, echo: 0.2, duty: [0.5, 0.5], bass: "tri", mood: "mystery", stereo: true },
  "pixel-dusk-lowres": { lead: true, pad: true, echo: 0.25, duty: [0.5, 0.25], bass: "tri", mood: "calm", stereo: true, vibrato: true },
  "pixel-c64": { lead: true, pwm: true, duty: [0.4, 0.25], bass: "saw", mood: "adventure" },
  "pixel-gba-handheld": { lead: true, pad: true, echo: 0.15, duty: [0.5, 0.25], bass: "tri", mood: "playful", stereo: true },
  "pixel-liquid-fire": { lead: true, pad: true, echo: 0.2, duty: [0.5, 0.25], bass: "tri", mood: "adventure", stereo: true },
  "pixel-vaporwave": { lead: true, pad: true, echo: 0.35, duty: [0.5, 0.5], bass: "tri", mood: "calm", stereo: true, vibrato: true },
  "pixel-virtual-red": { lead: false, duty: [0.5, 0.5], bass: "sq", mood: "tense", crush: 5 },
};
export const flavourOf = (styleId) => ({ ...DEFAULT_FLAVOUR, ...(STYLE_FLAVOUR[styleId] ?? {}) });

/** Mood id to use: an explicit format mood wins; "auto", missing or unknown falls back to the style's default. */
export function resolveMood(mood, styleId) {
  return MUSIC_MOODS[mood] ? mood : flavourOf(styleId).mood;
}

/** Absolute MIDI notes of the triad on scale degree `deg` (root, third, fifth, octave). */
function triad(mode, root, deg) {
  const sc = scaleOf[mode];
  const at = (k) => { const i = deg + k; return root + sc[i % 7] + 12 * Math.floor(i / 7); };
  return [at(0), at(2), at(4), at(0) + 12];
}

const ARP_SHAPES = [[0, 1, 2, 1], [0, 2, 1, 2], [0, 1, 2, 3], [2, 1, 0, 1], [0, 2, 3, 2]];
const shapeWave = { tri, saw, sq: (ph) => sq(ph, 0.5) * 0.7 };

export function renderMusic({ mood, style, seed = 1, durationSec, lowpassHz = 2600 } = {}) {
  if (!(durationSec > 0)) throw new Error("pixel-world music: durationSec must be > 0");
  const fl = flavourOf(style);
  const id = resolveMood(mood, style);
  const m = MUSIC_MOODS[id];
  const rnd = prng(hashSeed(`music:${id}:${seed}`));
  const n = Math.floor(durationSec * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const fx = new Float32Array(n * 2); // melodic bus (arp + lead + pad) that feeds the echo, interleaved
  const stepSec = 60 / m.bpm / 4, barSec = stepSec * 16;
  const prog = m.progs[rnd.int(m.progs.length)];
  const shapes = [rnd.pick(ARP_SHAPES), rnd.pick(ARP_SHAPES)];
  const outroAt = Math.max(0, durationSec - 1.8);
  const bars = Math.ceil(durationSec / barSec);

  const put = (t0, dur, freq, gain, wave, o = {}) => {
    const s = Math.floor(t0 * SR), len = Math.floor(dur * SR);
    if (s >= n || len <= 0) return;
    const pan = o.pan ?? 0, gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
    const dst = o.fx ? fx : null;
    let ph = 0;
    for (let i = 0; i < len && s + i < n; i++) {
      const t = i / SR;
      const f = freq * (o.vib ? 1 + 0.006 * Math.sin(TAU * 5.5 * Math.max(0, t - 0.12)) : 1);
      ph += f / SR;
      const duty = o.pwm ? 0.5 + 0.35 * Math.sin(TAU * 1.3 * (t0 + t)) * 0.7 : o.duty ?? 0.5;
      const w = wave === "sq" ? sq(ph, Math.min(0.9, Math.max(0.1, duty))) * 0.5 : shapeWave[wave](ph);
      const e = Math.min(1, i / 120) * Math.exp(-(o.decay ?? 3.2) * (i / len)) * Math.min(1, (len - i) / 90);
      const v = w * e;
      if (dst) { dst[(s + i) * 2] += v * gl; dst[(s + i) * 2 + 1] += v * gr; } else { L[s + i] += v * gl; R[s + i] += v * gr; }
    }
  };
  const noiseHit = (t0, len, gain, bright, pan = 0) => {
    const s = Math.floor(t0 * SR), c = Math.floor(len * SR);
    let y = 0;
    for (let i = 0; i < c && s + i < n; i++) {
      y += bright * (rnd.signed() - y);
      const v = y * gain * Math.exp(-5 * (i / c));
      L[s + i] += v * (1 - pan); R[s + i] += v * (1 + pan);
    }
  };
  const kick = (t0, g) => {
    const s = Math.floor(t0 * SR), c = Math.floor(0.14 * SR);
    let ph = 0;
    for (let i = 0; i < c && s + i < n; i++) {
      const f = 38 + 120 * Math.exp(-i / 700);
      ph += f / SR;
      const v = Math.sin(TAU * ph) * g * Math.exp(-i / 1500);
      L[s + i] += v; R[s + i] += v;
    }
  };

  // lead melody: a seeded walk through the scale near the chord; rests per the mood
  const sc = scaleOf[m.mode];
  const scaleNote = (idx) => m.root + 12 + sc[((idx % 7) + 7) % 7] + 12 * Math.floor(idx / 7);
  let leadIdx = 4;
  const lenSteps = [2, 2, 3, 4, 2, 1];

  const dmg = Boolean(fl.dmg);
  for (let b = 0; b < bars; b++) {
    const t0 = b * barSec;
    if (t0 >= outroAt) break;
    const deg = prog[b % prog.length];
    const [r, th, fi, oc] = triad(m.mode, m.root, deg);
    const tones = [r, th, fi, oc];
    const phrase = Math.floor(b / 4);
    const bassFreq = (x) => mtof(x - 12);
    const bw = fl.bass;
    // bass
    if (m.bass === "eighths" || m.bass === "pulse") for (let k = 0; k < 8; k++) { if (t0 + k * stepSec * 2 >= outroAt) break; const up = m.bass === "pulse" && k % 2 === 1; put(t0 + k * stepSec * 2, stepSec * 1.8, bassFreq(r + (up ? 12 : 0)), 0.42, bw, { decay: 2.5 }); }
    else if (m.bass === "bounce") for (let k = 0; k < 4; k++) put(t0 + k * stepSec * 4, stepSec * 2.2, bassFreq(k % 2 ? fi : r), 0.45, bw, { decay: 4 });
    else { put(t0, barSec / 2, bassFreq(r), 0.5, bw, { decay: 2.2 }); put(t0 + barSec / 2, barSec / 2, bassFreq(b % 2 ? fi : r), 0.45, bw, { decay: 2.2 }); }
    // arpeggio (pulse duty 1), 16th or 8th grid
    const shape = shapes[phrase % 2];
    const arpGain = dmg ? 0.22 : 0.17;
    for (let s = 0; s < 16; s += m.arpEvery) {
      const t = t0 + s * stepSec;
      if (t >= outroAt) break;
      const idx = (s / m.arpEvery) % shape.length;
      const note = tones[shape[idx]] + 12;
      put(t, stepSec * m.arpEvery * 0.95, mtof(note), arpGain, "sq", { duty: fl.duty[1], decay: m.arpDecay, fx: true, pan: fl.stereo ? -0.35 : 0, pwm: fl.pwm });
    }
    // pad (richer styles): sustained triad, slow
    if (fl.pad && !dmg) for (const x of [r, th, fi]) put(t0, barSec, mtof(x), 0.07, "tri", { decay: 0.8, fx: true, pan: fl.stereo ? 0.2 : 0 });
    // lead melody from the second phrase on
    if (fl.lead && !dmg && phrase >= 1) {
      let s = 0;
      while (s < 16) {
        const t = t0 + s * stepSec;
        if (t >= outroAt) break;
        const len = rnd.pick(lenSteps);
        if (rnd.next() < m.leadRests) { s += len; continue; }
        const target = [0, 2, 4, 7][rnd.int(4)] + (deg % 7);
        leadIdx += Math.sign(target + 7 - leadIdx) * rnd.int(3) + (rnd.next() < 0.3 ? rnd.int(3) - 1 : 0);
        leadIdx = Math.max(0, Math.min(14, leadIdx));
        put(t, stepSec * Math.min(len, 16 - s) * 0.92, mtof(scaleNote(leadIdx) + 0), 0.16, "sq", { duty: fl.duty[0], decay: 2.6, fx: true, vib: fl.vibrato, pan: fl.stereo ? 0.35 : 0, pwm: fl.pwm });
        s += len;
      }
    }
    // drums: hats from bar 1, kick and snare from bar 2 (clean intro)
    const hatG = dmg ? 0.05 : 0.09;
    if (b >= 1) for (const s of m.hat) { const t = t0 + s * stepSec; if (t < outroAt) noiseHit(t, 0.035, hatG * (s % 4 === 0 ? 0.7 : 1), 0.9, 0.15); }
    if (b >= 2) {
      for (const s of m.kick) { const t = t0 + s * stepSec; if (t < outroAt) kick(t, 0.36); }
      for (const s of m.snare) { const t = t0 + s * stepSec; if (t < outroAt) noiseHit(t, 0.11, 0.17, 0.55); }
    }
  }
  // outro: tonic triad held under the fade
  if (durationSec > 2.5) {
    const [r, th, fi] = triad(m.mode, m.root, 0);
    put(outroAt, 1.8, mtof(r - 12), 0.45, fl.bass, { decay: 1.4 });
    for (const x of [r, th, fi]) put(outroAt, 1.8, mtof(x + 12), 0.14, "sq", { duty: fl.duty[1], decay: 1.6, fx: true });
    kick(outroAt, 0.3);
  }
  // echo on the melodic bus (ping-pong), then sum into the stereo bus
  const echo = fl.echo, d1 = Math.floor(0.19 * SR);
  for (let i = 0; i < n; i++) {
    let l = fx[i * 2], r2 = fx[i * 2 + 1];
    if (echo && i >= d1) { l += echo * 0.7 * fx[(i - d1) * 2 + 1]; r2 += echo * 0.7 * fx[(i - d1) * 2]; fx[i * 2] = l; fx[i * 2 + 1] = r2; }
    L[i] += l; R[i] += r2;
  }
  // chip bit reduction for the 1-bit / Virtual Boy flavours: 11 kHz sample-and-hold, 5-bit
  if (fl.crush) {
    const q = 2 ** fl.crush;
    for (const ch of [L, R]) { let held = 0; for (let i = 0; i < n; i++) { if (i % 4 === 0) held = Math.round(ch[i] * q) / q; ch[i] = held; } }
  }
  lowpass(L, lowpassHz); lowpass(R, lowpassHz);
  // fades: 0.25 s in, 1.2 s out; then peak-normalize to -3 dBFS (levels are set by the mixer)
  const fi = Math.floor(0.25 * SR), fo = Math.floor(1.2 * SR);
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / fi, (n - i) / fo);
    const e = g * g * (3 - 2 * g);
    L[i] *= e; R[i] *= e;
  }
  const pk = Math.max(peakOf(L), peakOf(R)) || 1;
  const k = 0.7 / pk;
  for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  return { wav: encodeWav([L, R]), mood: id, bpm: m.bpm, key: `${noteName(m.root)} ${m.mode}`, seed, flavour: fl, sampleRate: SR, durationSec: n / SR };
}
