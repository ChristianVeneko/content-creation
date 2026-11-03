// Voice loudness envelope for lip-sync: one value per video frame (30 fps), 0..1, normalized to the 95th percentile
// like the hand-made reference (build.mjs envelope()). Pure given the samples; the decode step needs ffmpeg.
import { spawn } from "node:child_process";

export const ENV_FPS = 30;
const ENV_SR = 16000;

/** RMS envelope of mono samples at `sr`: Math.ceil(durationSec * 30) values (one per frame). */
export function envelopeFromSamples(f, durationSec, sr = ENV_SR, fps = ENV_FPS) {
  const win = Math.max(1, Math.round(sr / fps)), n = Math.ceil(durationSec * fps), out = [];
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let k = i * win; k < Math.min(f.length, (i + 1) * win); k++) { s += f[k] * f[k]; c++; }
    out.push(c ? Math.sqrt(s / c) : 0);
  }
  const sorted = [...out].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  return out.map((v) => +Math.min(1, v / p95).toFixed(2));
}

/** Decode a voice file with ffmpeg (16 kHz mono float) and return its 30 fps envelope; null when it cannot be read. */
export function voiceEnvelope(file, durationSec) {
  return new Promise((resolve) => {
    const p = spawn("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(ENV_SR), "-f", "f32le", "-"], { stdio: ["ignore", "pipe", "ignore"] });
    const chunks = [];
    p.stdout.on("data", (d) => chunks.push(d));
    p.on("error", () => resolve(null));
    p.on("close", (code) => {
      if (code !== 0) return resolve(null);
      const buf = Buffer.concat(chunks);
      if (buf.length < 4) return resolve(null);
      resolve(envelopeFromSamples(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)), durationSec));
    });
  });
}
