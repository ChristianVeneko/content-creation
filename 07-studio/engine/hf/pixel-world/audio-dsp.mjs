// Deterministic DSP primitives for the pixel-world chiptune: seeded PRNG, oscillators, a 2-pole low-pass and a WAV
// writer. Pure functions only: no Date.now, no Math.random, no ffmpeg, so the same input is always the same bytes.
export const SR = 44100;
export const TAU = Math.PI * 2;

/** 32-bit string/number hash (FNV-1a) used to derive seeds. */
export function hashSeed(v) {
  const s = String(v);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** mulberry32 PRNG. `next()` in [0,1), `signed()` in [-1,1), `pick(list)`, `int(n)`. */
export function prng(seed) {
  let a = (Number.isFinite(+seed) ? +seed : hashSeed(seed)) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, signed: () => next() * 2 - 1, int: (n) => Math.floor(next() * n), pick: (l) => l[Math.floor(next() * l.length)] };
}

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const dbToLin = (d) => 10 ** (d / 20);
export const linToDb = (x) => 20 * Math.log10(Math.max(1e-9, x));

/** Waveforms on a phase in cycles. */
export const sq = (ph, duty = 0.5) => ((ph % 1 + 1) % 1 < duty ? 1 : -1);
export const tri = (ph) => Math.abs((((ph % 1) + 1) % 1) * 4 - 2) - 1;
export const saw = (ph) => (((ph % 1) + 1) % 1) * 2 - 1;

/** Float32Array of `dur` seconds filled by fn(t, i). */
export function gen(dur, fn, sr = SR) {
  const n = Math.max(1, Math.floor(dur * sr));
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = fn(i / sr, i);
  return a;
}

/** Biquad low-pass (Butterworth Q), in place. */
export function lowpass(x, fc, sr = SR) {
  const w = (TAU * fc) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2);
  const b0 = (1 - cw) / 2, b1 = 1 - cw, b2 = (1 - cw) / 2, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}

export const peakOf = (x) => { let p = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > p) p = v; } return p; };
export const rmsOf = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); };

/** 16-bit PCM WAV of 1 or 2 channels (clamped, no dither: deterministic). */
export function encodeWav(channels, sr = SR) {
  const ch = channels.length, n = channels[0].length;
  const data = Buffer.alloc(n * ch * 2);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, channels[c][i])) * 32767), (i * ch + c) * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

/** Parse the 16-bit PCM WAV written by encodeWav -> { sr, channels: Float32Array[] }. */
export function decodeWav(buf) {
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WAVE") throw new Error("not a WAV buffer");
  let off = 12, ch = 1, sr = SR, bits = 16, dataAt = -1, dataLen = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("latin1", off, off + 4), len = buf.readUInt32LE(off + 4);
    if (id === "fmt ") { ch = buf.readUInt16LE(off + 10); sr = buf.readUInt32LE(off + 12); bits = buf.readUInt16LE(off + 22); }
    if (id === "data") { dataAt = off + 8; dataLen = Math.min(len, buf.length - dataAt); break; }
    off += 8 + len + (len % 2);
  }
  if (dataAt < 0 || bits !== 16) throw new Error("unsupported WAV (need 16-bit PCM)");
  const n = Math.floor(dataLen / (2 * ch));
  const channels = Array.from({ length: ch }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) channels[c][i] = buf.readInt16LE(dataAt + (i * ch + c) * 2) / 32768;
  return { sr, channels };
}
