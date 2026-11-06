/* synth.mjs - deterministic SFX + chiptune music (own synthesis, CC0) and the final -14 LUFS mix. */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const SR = 44100;
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const TAU = Math.PI * 2;
function gen(dur, fn) { const n = Math.floor(dur * SR), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = fn(i / SR, i); return a; }
const sq = (ph) => (ph % 1 < 0.5 ? 1 : -1);
function sweep(f0, f1, dur, shape = 'sin', decay = 6) { let ph = 0; return gen(dur, (t) => { const f = f0 * Math.pow(f1 / f0, t / dur); ph += f / SR; const w = shape === 'sq' ? sq(ph) * 0.6 : Math.sin(ph * TAU); return w * Math.exp(-decay * t / dur) * Math.min(1, t * 400); }); }
function noise(dur, lpStart, lpEnd, decay = 4) { let y = 0; return gen(dur, (t) => { const k = lpStart + (lpEnd - lpStart) * (t / dur); y += k * (rnd() - y); return y * Math.exp(-decay * t / dur) * Math.min(1, t * 300); }); }
function cat(...parts) { const n = Math.max(...parts.map(([o, a]) => Math.floor(o * SR) + a.length)); const out = new Float32Array(n); for (const [o, a, g = 1] of parts) { const s = Math.floor(o * SR); for (let i = 0; i < a.length; i++) out[s + i] += a[i] * g; } return out; }
const SFX = {
  pop: () => sweep(750, 260, 0.1, 'sin', 5),
  blip: () => sweep(1250, 1250, 0.06, 'sq', 4),
  ping: () => cat([0, sweep(1568, 1568, 0.4, 'sin', 5)], [0, sweep(2352, 2352, 0.3, 'sin', 6), 0.4]),
  coin: () => cat([0, sweep(988, 988, 0.07, 'sq', 2), 0.7], [0.07, sweep(1319, 1319, 0.3, 'sq', 5), 0.7]),
  thud: () => cat([0, sweep(120, 45, 0.3, 'sin', 5)], [0, noise(0.12, 0.2, 0.05, 6), 0.7]),
  burst: () => cat([0, noise(0.45, 0.6, 0.1, 4), 0.7], [0, sweep(600, 900, 0.07, 'sq', 3), 0.5], [0.07, sweep(800, 1200, 0.07, 'sq', 3), 0.5], [0.14, sweep(1000, 1600, 0.1, 'sq', 3), 0.5]),
  whoosh: () => { let y = 0; const d = 0.5; return gen(d, (t) => { const k = 0.03 + 0.5 * Math.sin((t / d) * Math.PI); y += k * (rnd() - y); return y * Math.sin((t / d) * Math.PI) * 1.8; }); },
  slash: () => cat([0, noise(0.22, 0.9, 0.5, 5), 0.8], [0, sweep(2400, 300, 0.2, 'sin', 4), 0.6]),
  buzz: () => { let p = 0; return gen(0.32, (t) => { p += 110 / SR; return ((p % 1) * 2 - 1) * 0.5 * Math.exp(-3 * t / 0.32) + sq(t * 117) * 0.3 * Math.exp(-3 * t / 0.32); }); },
  crack: () => cat([0, noise(0.04, 0.9, 0.9, 3)], [0.06, noise(0.05, 0.9, 0.9, 3), 0.8], [0.13, noise(0.07, 0.9, 0.5, 3), 0.9]),
  flip: () => cat([0, sweep(400, 1300, 0.14, 'sin', 1)], [0.14, sweep(1300, 600, 0.12, 'sin', 3)]),
  hit: () => cat([0, sweep(80, 32, 0.55, 'sin', 4)], [0, noise(0.3, 0.5, 0.05, 5), 0.8]),
  fall: () => sweep(900, 140, 0.55, 'sin', 3),
  poof: () => noise(0.45, 0.35, 0.04, 3),
  drip: () => sweep(1500, 900, 0.14, 'sin', 6),
  gulp: () => cat([0, sweep(300, 720, 0.09, 'sin', 3)], [0.11, sweep(260, 520, 0.09, 'sin', 3), 0.8]),
  creak: () => { let p = 0; return gen(0.4, (t) => { p += (170 - 40 * t / 0.4 + Math.sin(t * 60) * 12) / SR; return sq(p) * 0.35 * Math.exp(-2.5 * t / 0.4) * Math.min(1, t * 80); }); },
  rumble: () => cat([0, noise(0.8, 0.06, 0.02, 2.2), 0.9], [0, sweep(60, 38, 0.8, 'sin', 2.5)]),
  boot: () => cat([0, sweep(220, 880, 0.35, 'sq', 2.5), 0.6], [0.36, sweep(1318, 1318, 0.12, 'sq', 4), 0.6]),
  tick: () => cat([0, noise(0.02, 0.9, 0.9, 3), 0.6], [0, sweep(2000, 2000, 0.03, 'sq', 4), 0.5]),
};
/* chiptune lofi bed: A minor, 92 BPM */
function music(dur) {
  const bpm = 86, beat = 60 / bpm, out = new Float32Array(Math.floor(dur * SR));
  const prog = [[57, 0, 3, 7], [53, 0, 4, 7], [48, 0, 4, 7], [55, 0, 4, 7]]; // roots (A3,F3,C3,G3) + arp intervals
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const note = (t0, d, f, g, shape) => { const s = Math.floor(t0 * SR), n = Math.floor(d * SR); let ph = 0; for (let i = 0; i < n && s + i < out.length; i++) { ph += f / SR; const w = shape === 'tri' ? Math.abs((ph % 1) * 4 - 2) - 1 : sq(ph) * 0.5; const e = Math.min(1, i / 200) * Math.exp(-3.2 * i / n); out[s + i] += w * g * e; } };
  const bars = Math.ceil(dur / (beat * 4));
  for (let b = 0; b < bars; b++) {
    const [root, ...iv] = prog[b % 4], t0 = b * beat * 4;
    note(t0, beat * 2, mf(root - 12), 0.5, 'tri'); note(t0 + beat * 2, beat * 2, mf(root - 12 + (b % 2 ? 7 : 0)), 0.45, 'tri');
    for (let k = 0; k < 8; k++) note(t0 + k * beat / 2, beat / 2, mf(root + 12 + iv[k % 3]), 0.18, 'sq');
    if (b >= 2) for (let k = 0; k < 4; k++) { const s = Math.floor((t0 + k * beat) * SR); for (let i = 0; i < 1800 && s + i < out.length; i++) out[s + i] += rnd() * 0.1 * Math.exp(-i / 500) * (k % 2 ? 1 : 0.5) + (k % 2 === 0 ? Math.sin(i * 0.02 * (1 - i / 3600)) * 0.35 * Math.exp(-i / 900) : 0); }
  }
  return out;
}
function wav(path, f32) { const b = Buffer.alloc(f32.length * 4); for (let i = 0; i < f32.length; i++) b.writeFloatLE(f32[i], i * 4); const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', path], { input: b, maxBuffer: 1 << 28 }); if (r.status) throw new Error('ffmpeg wav failed'); }
function meanDb(path) { const r = spawnSync('ffmpeg', ['-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }); return parseFloat(/mean_volume: (-?[\d.]+) dB/.exec(r.stderr)[1]); }
export function synthAll({ dur, sfx, voice, outDir, work }) {
  const total = Math.floor(dur * SR), bus = new Float32Array(total);
  const cache = {};
  for (const e of sfx) { const w = (cache[e.type] ||= SFX[e.type]()); const s = Math.floor(e.t * SR); for (let i = 0; i < w.length && s + i < total; i++) bus[s + i] += w[i] * e.gain * 0.5; }
  wav(join(work, 'sfx.wav'), bus); wav(join(work, 'music.wav'), music(dur));
  const dv = meanDb(voice), dm = meanDb(join(work, 'music.wav')), ds = meanDb(join(work, 'sfx.wav'));
  const gm = dv - 17 - dm, gs = dv - 9 - ds; // music 17 dB under the voice, sfx 9 dB under (mean levels)
  const chain = `[0:a]volume=1[v];[1:a]lowpass=f=2600,volume=${gm.toFixed(2)}dB[m];[2:a]volume=${gs.toFixed(2)}dB[s];[v][m][s]amix=inputs=3:normalize=0:duration=first[a]`;
  const args = ['-hide_banner', '-y', '-i', voice, '-i', join(work, 'music.wav'), '-i', join(work, 'sfx.wav'), '-filter_complex', chain, '-map', '[a]', '-ar', '44100', '-ac', '2'];
  spawnSync('ffmpeg', [...args, join(work, 'premix.wav')], { stdio: 'ignore' });
  const m1 = spawnSync('ffmpeg', ['-hide_banner', '-i', join(work, 'premix.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const j = JSON.parse(/\{[\s\S]*\}/.exec(m1.stderr.slice(m1.stderr.lastIndexOf('{')))[0]);
  const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-y', '-i', join(work, 'premix.wav'), '-af', ln, '-ar', '44100', '-ac', '2', join(outDir, 'mix.wav')], { encoding: 'utf8' });
  if (r.status) throw new Error(r.stderr);
  console.log(`audio ok: voice ${dv}dB, music gain ${gm.toFixed(1)}dB, sfx gain ${gs.toFixed(1)}dB`);
}
