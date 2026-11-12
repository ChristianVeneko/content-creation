import { makeCaptions } from './shorts-captions.js';

const W = 1080, H = 1920, LEAD = 0.35, TAIL = 1.4;
const cv = document.getElementById('c');
const MAIN = cv.getContext('2d');
let c = MAIN;
const { clamp, lin, eo, eio, pop, txt, stamp, paper, tv, phone, bubble, burst, bill, gavel, neon, mic, silhouette, heart, chip, tear, arm } = PR;

const WORDS = await (await fetch('voices_t/words.json')).json();
const RAW = await (await fetch('voices_t/starts.json')).json();
const DURS = await (await fetch('voices_t/dur.json')).json();
const IDS = Object.keys(RAW).sort((a, b) => RAW[a] - RAW[b]);
const ST = {};
for (const id of IDS) ST[id] = RAW[id] + LEAD;
const last = IDS[IDS.length - 1];
const DUR = ST[last] + DURS[last] + TAIL;

const norm = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
// absolute time of a word (prefix match) in a line; n-th occurrence
function at(id, word, n = 0) {
  const k = norm(word);
  let seen = 0;
  for (const [w, s] of WORDS[id]) if (norm(w).startsWith(k)) { if (seen++ === n) return ST[id] + s; }
  console.warn('word not found', id, word);
  return ST[id];
}
const end = (id) => ST[id] + DURS[id];
// mouth flap while words are spoken in [a, b]
function talk(t, a, b) {
  if (t < a || t > b) return 0;
  for (const id of IDS) for (const [, s, e] of WORDS[id]) {
    const ws = ST[id] + s, we = ST[id] + e;
    if (t >= ws && t <= we) return 0.35 + 0.35 * Math.abs(Math.sin((t - ws) * 17));
  }
  return 0;
}
const blink = (t, seed) => { const p = (t + seed * 1.37) % 3.4; return p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0; };

function ch(t, id, x, y, s, o = {}) {
  const seed = id.length;
  const bob = Math.sin(t * 2.1 + seed) * 4;
  CAST.draw(c, id, Object.assign({ x, y: y + bob, s, t, blink: blink(t, seed), tilt: Math.sin(t * 1.3 + seed) * 0.012 }, o));
}

// Backgrounds: ALWAYS a SCENERY set (see kit/scenery.js, SCENERY.list). Plain colour rooms were removed on purpose.

