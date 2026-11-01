// Build-time audio bed for the illustrated look: SFX on the beat timeline + a music bed ducked under the voice.
// Everything is decoded with ffmpeg to 48 kHz stereo float, mixed in JS (deterministic), and written as one WAV.
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { CC_ROOT } from "./env.mjs";
import { DUCK, MUSIC_REF, SFX_REF } from "./music.mjs";

export const SR = 48000;
export const SFX_ROOT = () => join(CC_ROOT, "03-assets", "sfx");
export const MUSIC_ROOT = () => join(CC_ROOT, "03-assets", "music");

/**
 * Sound kit per beat kind (paths relative to 03-assets/sfx). All CC0: Kenney packs, @remotion/sfx CC0 sounds
 * (see 03-assets/sfx/README.md) and sounds synthesized by scripts/gen-sfx.py.
 * `level` is the loudness of that kind relative to the SFX reference (voice − 12 dB).
 */
export const SFX_KIT = {
  cut: { level: 0, files: ["generated/whoosh-1.wav", "generated/whoosh-2.wav", "generated/whoosh-3.wav", "remotion/whoosh.wav"] },
  title: { level: -5, files: ["impact/impactSoft_medium_001.ogg", "impact/impactSoft_medium_002.ogg", "impact/impactSoft_medium_004.ogg"] },
  pop: { level: -3, files: ["generated/pop-1.wav", "generated/pop-2.wav", "generated/pop-3.wav", "interface/drop_002.ogg"] },
  draw: { level: -5, files: ["remotion/whip.wav", "generated/whoosh-2.wav"] },
  tick: { level: -3, files: ["interface/click_002.ogg", "interface/click_003.ogg", "interface/click_005.ogg", "ui/click2.ogg"] },
  type: { level: -7, files: ["keyboard/keypress-001.wav", "keyboard/keypress-004.wav", "keyboard/keypress-006.wav", "keyboard/keypress-009.wav"] },
  stamp: { level: 2, files: ["impact/impactSoft_heavy_000.ogg", "impact/impactSoft_heavy_001.ogg", "impact/impactSoft_heavy_003.ogg"] },
  ding: { level: -1, files: ["interface/bong_001.ogg"] },
  page: { level: -3, files: ["remotion/page-turn.wav"] },
};

export const LEVELS = {
  sfxUnderVoiceDb: SFX_REF.underVoiceDb, // sfx.volume 1: SFX peaks sit 12 dB under the voice peaks
  musicUnderVoiceDb: MUSIC_REF.underVoiceDb, // music.volume 0.12: unducked music 13 dB under the voice
  duckDb: DUCK.depthDb, // the music dips this much more while words are spoken (smooth attack/release)
  noVoiceRefDb: -20, // reference when there is no narration
};

/** Decode any audio file to interleaved stereo Float32 at 48 kHz. */
export function decode(file) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-v", "error", "-i", file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let err = "";
    p.stdout.on("data", (d) => chunks.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg decode ${basename(file)}: ${err.trim().slice(-200)}`));
      const buf = Buffer.concat(chunks);
      resolve(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)));
    });
  });
}

const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
const lin = (d) => 10 ** (d / 20);

/** Windowed RMS (dB) of interleaved stereo; returns per-window values. */
export function windowRms(x, winSec = 0.05) {
  const w = Math.max(1, Math.round(winSec * SR)) * 2;
  const out = [];
  for (let i = 0; i < x.length; i += w) {
    let s = 0;
    const end = Math.min(x.length, i + w);
    for (let j = i; j < end; j++) s += x[j] * x[j];
    out.push(db(Math.sqrt(s / Math.max(1, end - i))));
  }
  return out;
}

/** Peak time (s) of the loudest 10 ms window, and the loudness of the loudest 50 ms window. */
export function analyzeSound(x) {
  const win = windowRms(x, 0.01);
  let k = 0;
  win.forEach((v, i) => (v > win[k] ? (k = i) : null));
  return { durSec: x.length / 2 / SR, peakSec: k * 0.01 + 0.005, activeDb: Math.max(...windowRms(x, 0.05)) };
}

/** Power-average loudness (dB) of the windows above `gateDb` (speech without pauses). */
export function activeLoudness(x, gateDb = -45) {
  const w = windowRms(x, 0.05).filter((v) => v > gateDb);
  if (!w.length) return null;
  return db(Math.sqrt(w.reduce((a, v) => a + lin(v) ** 2, 0) / w.length));
}

/** Load the SFX kit: decoded samples + analysis per file. Missing files are skipped. */
export async function loadKit(kit = SFX_KIT, root = SFX_ROOT()) {
  const pools = {};
  const samples = {};
  for (const [kind, { files }] of Object.entries(kit)) {
    pools[kind] = [];
    for (const f of files) {
      const full = join(root, f);
      if (!existsSync(full)) continue;
      if (!samples[f]) {
        const x = await decode(full);
        samples[f] = { x, ...analyzeSound(x) };
      }
      pools[kind].push({ file: f, peakSec: samples[f].peakSec, durSec: samples[f].durSec });
    }
  }
  return { pools, samples };
}

/** Add `src` into `dst` at sample offset `at` with gain and playback rate (linear interpolation). */
export function mixInto(dst, src, atSec, gain, rate = 1) {
  const frames = src.length / 2;
  const outFrames = Math.floor(frames / rate);
  const start = Math.round(atSec * SR);
  for (let i = 0; i < outFrames; i++) {
    const o = start + i;
    if (o < 0) continue;
    if (o * 2 + 1 >= dst.length) break;
    const pos = i * rate;
    const j = Math.floor(pos);
    const f = pos - j;
    const j2 = Math.min(frames - 1, j + 1);
    dst[o * 2] += gain * (src[j * 2] * (1 - f) + src[j2 * 2] * f);
    dst[o * 2 + 1] += gain * (src[j * 2 + 1] * (1 - f) + src[j2 * 2 + 1] * f);
  }
}

// Music selection (library, moods, ElevenLabs) lives in lib/music.mjs.

/** Speech intervals [startSec, endSec] from caption words, merging pauses shorter than `mergeSec`. */
export function speechIntervals(captions, mergeSec = 0.3) {
  const out = [];
  for (const c of captions) {
    const s = c.startMs / 1000;
    const e = c.endMs / 1000;
    const last = out[out.length - 1];
    if (last && s - last[1] < mergeSec) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/**
 * Music gain (dB) at time t relative to the unducked level: 0 in pauses, −duckDb while words are spoken, with a
 * raised-cosine attack (the dip starts `attack` s before a word) and release (`release` s after), plus fade in/out.
 */
export function musicGainDb(t, intervals, totalSec, duckDb, { attack = DUCK.attackSec, release = DUCK.releaseSec, fadeIn = 0.8, fadeOut = 1.6 } = {}) {
  let duck = 0;
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  for (const [s, e] of intervals) {
    let v = 0;
    if (t >= s && t <= e) v = 1;
    else if (t < s && s - t < attack) v = ease(1 - (s - t) / attack);
    else if (t > e && t - e < release) v = ease(1 - (t - e) / release);
    duck = Math.max(duck, v);
  }
  const fade = Math.min(1, t / fadeIn, Math.max(0, (totalSec - t) / fadeOut));
  return -duckDb * duck + db(Math.max(1e-4, fade));
}

/** Write interleaved stereo float samples as 16-bit PCM WAV (soft-clipped). */
export function writeWav(file, x) {
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) {
    const v = Math.tanh(x[i] * 1.05) / Math.tanh(1.05);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
}

/**
 * Mix the bed. Returns stats for logging.
 * @param {{events: {start:number, kind:string, file:string, rate:number}[], samples: object, sfxVolume: number,
 *   music: {file:string, firstBeat:number}|null, musicVolume: number, duck: boolean, captions: object[],
 *   narration: string|null, totalSec: number, out: string}} o
 */
export async function buildBed(o) {
  const total = Math.ceil(o.totalSec * SR) * 2;
  const bed = new Float32Array(total);
  const voice = o.narration ? await decode(o.narration) : null;
  const voiceDb = (voice && activeLoudness(voice)) ?? LEVELS.noVoiceRefDb;
  const voicePeakDb = voice ? percentile(windowRms(voice, 0.05).filter((v) => v > -45), 0.95) : LEVELS.noVoiceRefDb + 4;

  // SFX: the loudest 50 ms of each sound lands sfxUnderVoiceDb under the voice's loud windows.
  const sfxRef = voicePeakDb - LEVELS.sfxUnderVoiceDb + db(Math.max(1e-4, o.sfxVolume));
  for (const e of o.events) {
    const s = o.samples[e.file];
    if (!s || o.sfxVolume <= 0) continue;
    const gain = lin(sfxRef + (SFX_KIT[e.kind]?.level ?? 0) - s.activeDb);
    mixInto(bed, s.x, e.start, gain, e.rate);
  }

  let musicDb = null;
  if (o.music) {
    const m = await decode(o.music.file);
    const offset = Math.round(Math.min(o.music.firstBeat ?? 0, 4) * SR) * 2;
    const loop = m.subarray(offset);
    musicDb = activeLoudness(loop, -60) ?? -20;
    // music.volume 0.12 → unducked music 13 dB under the voice; each doubling adds 6 dB.
    const base = voiceDb - LEVELS.musicUnderVoiceDb + db(Math.max(1e-4, o.musicVolume / MUSIC_REF.volume)) - musicDb;
    const intervals = o.duck ? speechIntervals(o.captions, 0.45) : [];
    const step = 480; // gain updated every 10 ms
    for (let f = 0; f < total / 2; f += step) {
      const t = f / SR;
      const g = lin(base + (o.duck ? musicGainDb(t, intervals, o.totalSec, LEVELS.duckDb) : musicGainDb(t, [], o.totalSec, 0)));
      for (let k = f; k < Math.min(total / 2, f + step); k++) {
        const src = (k % (loop.length / 2)) * 2;
        bed[k * 2] += g * loop[src];
        bed[k * 2 + 1] += g * loop[src + 1];
      }
    }
  }
  writeWav(o.out, bed);
  return { voiceDb: round1(voiceDb), voicePeakDb: round1(voicePeakDb), musicDb: musicDb === null ? null : round1(musicDb), events: o.events.length };
}

const round1 = (x) => Math.round(x * 10) / 10;
function percentile(arr, p) {
  if (!arr.length) return LEVELS.noVoiceRefDb;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
