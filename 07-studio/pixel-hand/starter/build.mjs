#!/usr/bin/env node
/* build.mjs - generator for "Para que sirve la cache de tu PC" (hand-made pixel-art video, HyperFrames).
 * Usage (from the repo root, after `source ./env.sh`):
 *   node 04-projects/<id>/build.mjs voice       # ElevenLabs (engine tts lib) -> assets/voz.wav
 *   node 04-projects/<id>/build.mjs transcribe  # HyperFrames whisper -> assets/transcript.json (model cache in /private/tmp)
 *   node 04-projects/<id>/build.mjs audio       # synth sfx + music + loudnorm mix -> hf/assets/mix.wav
 *   node 04-projects/<id>/build.mjs html        # transcript + src/*.js -> hf/index.html (+ hf-sin-subs/index.html)
 *   node 04-projects/<id>/build.mjs all         # audio + html
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { synthAll } from './src/synth.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const A = join(HERE, 'assets');
const FPS = 30, TAIL = 0.6;
const cmd = process.argv[2] || 'all';
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function parseScript() {
  const raw = readFileSync(join(HERE, 'voz.txt'), 'utf8');
  const spoken = raw.replace(/\{[^|}]*\|([^}]*)\}/g, '$1').replace(/\s*\n\s*/g, ' ').trim();
  const display = raw.replace(/\{([^|}]*)\|[^}]*\}/g, '$1').replace(/\s*\n\s*/g, ' ').trim().split(/\s+/);
  return { spoken, display };
}
/* word alignment: char-level LCS between the script and the whisper words */
function align(display, wh) {
  let D = '', dOwner = [];
  display.forEach((w, i) => { for (const c of norm(w)) { D += c; dOwner.push(i); } });
  let Wc = '', wOwner = [], wPos = [];
  wh.forEach((w, i) => { const n = norm(w.text); for (let k = 0; k < n.length; k++) { Wc += n[k]; wOwner.push(i); wPos.push(k / n.length); } });
  const n = D.length, m = Wc.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = D[i] === Wc[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const map = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) { if (D[i] === Wc[j]) { map[i] = j; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  for (let i = 0; i < n; i++) if (map[i] < 0) {
    let a = i - 1; while (a >= 0 && map[a] < 0) a--; let b = i + 1; while (b < n && map[b] < 0) b++;
    map[i] = a < 0 ? (b < n ? map[b] : 0) : b >= n ? map[a] : Math.round(map[a] + ((map[b] - map[a]) * (i - a)) / (b - a));
  }
  const timeOf = (j) => { const w = wh[wOwner[j]]; return w.start + wPos[j] * (w.end - w.start); };
  const out = display.map((d) => ({ d, t0: 0, t1: 0 }));
  const first = {}, last = {};
  for (let i = 0; i < n; i++) { const w = dOwner[i]; if (first[w] == null) first[w] = i; last[w] = i; }
  display.forEach((d, i) => { out[i].t0 = timeOf(map[first[i]]); out[i].t1 = timeOf(map[last[i]]) + 0.12; });
  for (let i = 1; i < out.length; i++) if (out[i].t0 < out[i - 1].t0 + 0.04) out[i].t0 = out[i - 1].t0 + 0.04;
  return out;
}
function groups(words) {
  const gs = []; let cur = [];
  const flush = () => { if (cur.length) { gs.push({ words: cur }); cur = []; } };
  words.forEach((w, i) => {
    cur.push(w);
    const len = cur.map((x) => x.d).join(' ').length;
    const strong = /[.?!:]$/.test(w.d), soft = /,$/.test(w.d);
    const nextLen = words[i + 1] ? len + 1 + words[i + 1].d.length : 99;
    if (strong || (soft && cur.length >= 2) || cur.length >= 4 || nextLen > 22) flush();
  });
  flush();
  gs.forEach((g, i) => { g.ci = i; g.t0 = g.words[0].t0; const next = gs[i + 1]; const end = g.words[g.words.length - 1].t1; g.tEnd = next ? Math.min(next.words[0].t0, end + 0.45) : end + 0.45; });
  return gs;
}
/* storyboard: every beat is bound to the start of the word that names it: name -> [word, nth occurrence] (letters only, accents ignored) */
const CUES = {
  tu: ['Tu', 1], pc: ['PC', 1], oasis1: ['oasis', 1], escondido: ['escondido', 1], hace1: ['hace', 1], todo: ['todo', 1], rapido1: ['rápido.', 1],
  llama: ['llama', 1], cache1: ['caché.', 1], memoria: ['memoria', 1], pequena: ['pequeña,', 1], pero: ['pero', 1], lado: ['lado', 1], procesador: ['procesador.', 1],
  cuando: ['Cuando', 1], dato: ['dato', 1], oasis2: ['oasis,', 2], bebes: ['bebes', 1], instante: ['instante.', 1], si1: ['Si', 1], no1: ['no,', 1], caminas: ['caminas', 1],
  pozo1: ['pozo:', 1], memoria2: ['memoria', 2], ram: ['RAM.', 1],
  y: ['Y', 1], tampoco: ['tampoco', 1], ahi: ['ahí,', 1], viajas: ['viajas', 1], disco: ['disco,', 1], pozo2: ['pozo', 2], lejano: ['lejano.', 1],
  por: ['Por', 1], usas: ['usas', 1], seguido: ['seguido', 1], guarda: ['guarda', 1], cerca1: ['cerca.', 1], cerca2: ['Cerca', 2], rapido2: ['rápido.', 2], lejos: ['Lejos', 1], caro: ['caro.', 1],
};
/* sound effects: [mark|seconds, type, gain, offset] - all tied to what moves on screen, none flashes */
const SFX_DEF = [
  ['pc', 'boot', 0.7], ['oasis1', 'ping', 0.6], ['hace1', 'whoosh', 0.45], ['rapido1', 'blip', 0.5, 0.0], ['rapido1', 'blip', 0.5, 0.14], ['rapido1', 'blip', 0.5, 0.28],
  ['cache1', 'thud', 0.8, 0.15], ['memoria', 'tick', 0.6, 0.1], ['memoria', 'tick', 0.6, 0.22], ['memoria', 'tick', 0.6, 0.34], ['memoria', 'tick', 0.6, 0.46], ['lado', 'blip', 0.5], ['procesador', 'blip', 0.5],
  ['cuando', 'whoosh', 0.7, -0.5], ['dato', 'drip', 0.9], ['bebes', 'gulp', 1.0, 0.25], ['instante', 'ping', 0.6], ['no1', 'buzz', 0.7], ['pozo1', 'thud', 0.8, 0.25], ['pozo1', 'creak', 0.6, 0.2], ['ram', 'coin', 0.9, -0.1],
  ['y', 'whoosh', 0.7, -0.5], ['tampoco', 'buzz', 0.6], ['tampoco', 'whoosh', 0.5, 0.55], ['disco', 'rumble', 0.9, 0.0], ['disco', 'coin', 0.8, 0.9], ['lejano', 'flip', 0.7],
  ['por', 'whoosh', 0.7, -0.5], ['usas', 'whoosh', 0.35, -0.22], ['usas', 'pop', 0.8, 0.4], ['usas', 'whoosh', 0.35, 0.12], ['usas', 'pop', 0.8, 0.74], ['usas', 'whoosh', 0.35, 0.46], ['usas', 'pop', 0.8, 1.08], ['usas', 'whoosh', 0.35, 0.8], ['usas', 'pop', 0.8, 1.42],
  ['cerca2', 'ping', 0.8], ['rapido2', 'coin', 0.8], ['lejos', 'thud', 0.6, 0.45], ['lejos', 'fall', 0.4, 0.0], ['caro', 'coin', 0.9], ['caro', 'coin', 0.7, 0.18],
];

function resolveCues(words) {
  const T = {}; const cnt = {};
  words.forEach((w) => { const k = norm(w.d); cnt[k] = (cnt[k] || 0) + 1; w.n = cnt[k]; w.k = k; });
  for (const [name, [word, nth]] of Object.entries(CUES)) {
    const key = norm(word); const hit = words.filter((w) => w.k === key)[nth - 1];
    if (!hit) throw new Error(`cue ${name}: word "${word}" #${nth} not found in the script`);
    T[name] = +hit.t0.toFixed(3);
  }
  return T;
}
function sh(c, args, opts = {}) {
  const r = spawnSync(c, args, { stdio: 'inherit', cwd: ROOT, env: process.env, ...opts });
  if (r.status !== 0) throw new Error(`${c} ${args.join(' ')} failed (${r.status})`);
}
function voice() { sh('node', [join(HERE, 'src', 'voice.mjs')]); }
function transcribe() {
  const tmp = process.env.BESPOKE_WHISPER || '/private/tmp/cache-mano-whisper';
  mkdirSync(tmp, { recursive: true });
  const env = { ...process.env, HYPERFRAMES_CACHE_DIR: join(tmp, 'hfcache'), HYPERFRAMES_FONT_CACHE_DIR: join(tmp, 'hfcache', 'fonts') };
  copyFileSync(join(A, 'voz.wav'), join(tmp, 'voz.wav'));
  sh('npx', ['-y', 'hyperframes@0.9.6', 'transcribe', 'voz.wav', '--language', 'es', '--model', 'small', '--json'], { cwd: tmp, env, stdio: ['ignore', 'ignore', 'inherit'] });
  copyFileSync(join(tmp, 'transcript.json'), join(A, 'transcript.json'));
}
function loadWords() {
  const { display } = parseScript();
  let tr = JSON.parse(readFileSync(join(A, 'transcript.json'), 'utf8'));
  tr = Array.isArray(tr) ? tr : tr.words;
  const words = align(display, tr);
  return { words, T: resolveCues(words) };
}
function voiceDuration() {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(A, 'voz.wav')], { encoding: 'utf8' });
  return parseFloat(r.stdout);
}
const totalDur = () => +(voiceDuration() + TAIL).toFixed(3);
function envelope(dur) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', join(A, 'voz.wav'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 });
  const f = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
  const win = Math.round(16000 / FPS), n = Math.ceil(dur * FPS) + 2, out = [];
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = i * win; k < Math.min(f.length, (i + 1) * win); k++) { s += f[k] * f[k]; c++; } out.push(c ? Math.sqrt(s / c) : 0); }
  const sorted = [...out].sort((a, b) => a - b); const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  return out.map((v) => +Math.min(1, v / p95).toFixed(2));
}
function audio() {
  const dur = totalDur();
  const { T } = loadWords();
  const sfx = SFX_DEF.map(([m, type, gain, off = 0]) => ({ t: (typeof m === 'number' ? m : T[m]) + off, type, gain }));
  const pad = join(A, 'voz-pad.wav');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', join(A, 'voz.wav'), '-af', `apad=whole_dur=${dur}`, '-ar', '44100', '-ac', '1', pad]);
  if (r.status) throw new Error('pad failed');
  const outDir = join(HERE, 'hf', 'assets'); mkdirSync(outDir, { recursive: true });
  synthAll({ dur, sfx, voice: pad, outDir, work: A });
}
function html() {
  const dur = totalDur();
  const { words, T } = loadWords();
  const gs = groups(words).map((g) => ({ ci: g.ci, t0: +g.t0.toFixed(3), tEnd: +g.tEnd.toFixed(3), words: g.words.map((w) => ({ d: w.d, t0: +w.t0.toFixed(3) })) }));
  const env = envelope(dur);
  const src = (f) => readFileSync(join(HERE, 'src', f), 'utf8');
  const tpl = readFileSync(join(HERE, 'src', 'template.html'), 'utf8');
  for (const [dir, caps] of [['hf', true], ['hf-sin-subs', false]]) {
    const out = join(HERE, dir); mkdirSync(join(out, 'assets', 'fonts'), { recursive: true });
    if (dir !== 'hf') {
      for (const f of ['hyperframes.json', 'meta.json', 'package.json']) copyFileSync(join(HERE, 'hf', f), join(out, f));
      cpSync(join(HERE, 'hf', 'assets'), join(out, 'assets'), { recursive: true });
    }
    const data = `const DUR=${dur},FPS=${FPS},CAPS_ON=${caps};\nconst T=${JSON.stringify(T)};\nconst CAP=${JSON.stringify(gs)};\nconst ENV=${JSON.stringify(env)};\n`;
    const files = ['lib.js', 'kit.js', 'w1.js', 'w2.js', 'w3.js', 'w4.js', 'w5.js', 'main.js'].filter((f) => existsSync(join(HERE, 'src', f)));
    const js = [data, ...files.map((f) => src(f))].join('\n');
    writeFileSync(join(out, 'index.html'), tpl.replace(/__DUR__/g, String(dur)).replace('/*__JS__*/', () => js));
  }
  writeFileSync(join(HERE, 'timings.json'), JSON.stringify({ duration: dur, cues: T, words }, null, 1));
  console.log(`html ok: duration ${dur}s, ${words.length} words, ${gs.length} caption groups, ${Object.keys(T).length} cues`);
}
if (cmd === 'voice') voice();
else if (cmd === 'transcribe') transcribe();
else if (cmd === 'audio') audio();
else if (cmd === 'html') html();
else if (cmd === 'all') { audio(); html(); }
else { console.error('usage: build.mjs voice|transcribe|audio|html|all'); process.exit(1); }
