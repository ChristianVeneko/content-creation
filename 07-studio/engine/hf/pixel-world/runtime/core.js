/* core.js: pixel toolkit. Everything is a pure function of time t (seconds): no Date.now, no Math.random.
 * Globals injected before this file: STYLE (active style data), SPEC (resolved payload), DUR, FPS.
 * Colours are written as MASTER hex values (see M below) and remapped to the style palette by col(). */
'use strict';
const W = 270, H = 480;
const PX = STYLE.px || 1;
const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const pr = (t, t0, d) => clamp((t - t0) / d);
const lerp = (a, b, k) => a + (b - a) * k;
const snap = (v) => Math.round(v / PX) * PX;
const EA = {
  out: (x) => 1 - Math.pow(1 - x, 3),
  out4: (x) => 1 - Math.pow(1 - x, 4),
  in: (x) => x * x * x,
  lin: (x) => x,
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  bounce: (x) => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  },
};
/* stateless hash noise (seeded by its argument) and a seeded PRNG */
const hs = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* piecewise-eased keyframes: keys=[[t,v],...] */
function kf(t, keys, ease = EA.io) {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], ease(pr(t, a[0], b[0] - a[0]))); }
  }
  return keys[keys.length - 1][1];
}

/* ---------------- master colour ramps: [darkest, dark, mid, light, highlight] ---------------- */
const M = {
  ink: '#1a1020',
  steel: ['#141a2b', '#3d4a6e', '#6e7fa6', '#8fa2cc', '#dfe8ff'],
  stone: ['#241a30', '#3a2f4d', '#5c5470', '#8a82a0', '#c9c3d8'],
  wood: ['#3a2418', '#6b4a2e', '#a0703c', '#c98f55', '#e9b87a'],
  brick: ['#2a1218', '#6e2a30', '#a8453a', '#d06a50', '#f0a080'],
  red: ['#5a1020', '#a02a3a', '#e04f4f', '#ff7a7a', '#ffc0c0'],
  orange: ['#6a2a10', '#c46a1e', '#ff9f4a', '#ffc88a', '#ffe8c0'],
  yellow: ['#7a5a10', '#d99a2b', '#ffd35e', '#fff0a0', '#fffbe0'],
  green: ['#10381f', '#1f7a50', '#2fa56e', '#5ed17a', '#b0f5c0'],
  grass: ['#10381f', '#2a6a30', '#4a9a3a', '#7acd50', '#c0f080'],
  teal: ['#0e3a44', '#1f7a8a', '#2fb0c0', '#5ec9e8', '#c0f4ff'],
  blue: ['#101e4a', '#1d3a8c', '#3b6ae0', '#5e9cf5', '#bcd8ff'],
  purple: ['#2a1450', '#5a3a9c', '#8a5ae0', '#b084f5', '#e0c8ff'],
  pink: ['#5a1040', '#b0306a', '#ff5fa0', '#ff9fc8', '#ffd8e8'],
  skin: ['#8a5a3a', '#d48f58', '#f0b27a', '#ffd0a0', '#ffe8d0'],
  sand: ['#6a5a3a', '#a8946a', '#d9c58f', '#efe0b0', '#fff6d8'],
  white: ['#8a8a99', '#c0c0cc', '#e8e8f0', '#ffffff', '#ffffff'],
  dark: ['#06040c', '#0f0a1a', '#1a1228', '#241a38', '#33264c'],
  water: ['#0e2a5a', '#1d4a9c', '#2f7ad0', '#5ec0f0', '#c0f0ff'],
  fire: ['#7a1a10', '#d04010', '#ff7a1a', '#ffb03a', '#fff0a0'],
  gold: ['#6a4a10', '#b08820', '#e0b030', '#ffd35e', '#fff0b0'],
};
const SKYS = {
  day: ['#3a78d8', '#4f90e8', '#68a8f0', '#86c0f5', '#a8d6fa', '#c8e8fc', '#e0f4ff', '#f4fbff'],
  dusk: ['#1b1130', '#2c1a47', '#4b2552', '#7b3358', '#b5485a', '#e8705a', '#f7a35c', '#fbd08a'],
  night: ['#06040f', '#0a0820', '#0e0e30', '#141a48', '#1b2560', '#243070', '#2e3a80', '#3a4890'],
};
const INK = M.ink;
const TOKR = ['red', 'yellow', 'green', 'teal', 'purple', 'orange']; // token ramps used by many props

/* ---------------- palette remap ---------------- */
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lumOf = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  const f = (p, q, t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
const PALHEX = STYLE.palette;
const PAL = PALHEX.map(hex2rgb);
const PALLUM = PAL.map((c) => lumOf(c[0], c[1], c[2]));
const PALORDER = PALLUM.map((l, i) => [l, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
let TONE = 0; // current recolor tone (set around prop draws)
const colCache = new Map();
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayerCache = {};
function bayerPat(lo, hi, level) {
  const k = lo + hi + level;
  if (!bayerCache[k]) {
    const c = document.createElement('canvas'); c.width = c.height = 4 * PX; const p = c.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { p.fillStyle = BAYER[y][x] < level ? hi : lo; p.fillRect(x * PX, y * PX, PX, PX); }
    bayerCache[k] = L.m.createPattern(c, 'repeat');
  }
  return bayerCache[k];
}
function nearest(r, g, b) {
  let best = 0, bd = 1e9;
  if (STYLE.mono) { const l = lumOf(r, g, b); for (let i = 0; i < PAL.length; i++) { const d = Math.abs(PALLUM[i] - l); if (d < bd) { bd = d; best = i; } } return best; }
  for (let i = 0; i < PAL.length; i++) {
    const p = PAL[i], rm = (r + p[0]) / 2, dr = r - p[0], dg = g - p[1], db = b - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
/* master hex -> style colour (string, or a CanvasPattern in 1-bit styles) */
function col(c) {
  if (typeof c !== 'string' || c.charAt(0) !== '#') return c;
  const key = c + '|' + TONE;
  let v = colCache.get(key);
  if (v !== undefined) return v;
  let [r, g, b] = hex2rgb(c);
  let [h, s, l] = rgb2hsl(r, g, b);
  if (TONE) { h = (h + TONE * 0.17) % 1; l = clamp(l + (TONE % 2 ? 0.1 : -0.04)); }
  s = clamp(s * (STYLE.sat || 1)); l = Math.pow(l, STYLE.gamma || 1);
  [r, g, b] = hsl2rgb(h, s, l);
  if (STYLE.bit1) {
    const lum = clamp(lumOf(r, g, b)), lvl = Math.round(lum * 4) * 4;
    v = lvl <= 0 ? PALHEX[PALORDER[0]] : lvl >= 16 ? PALHEX[PALORDER[PALORDER.length - 1]] : bayerPat(PALHEX[PALORDER[0]], PALHEX[PALORDER[PALORDER.length - 1]], lvl);
  } else v = PALHEX[nearest(r, g, b)];
  colCache.set(key, v);
  return v;
}

/* ---------------- canvases ---------------- */
const L = { b: $('cb').getContext('2d'), m: $('cm').getContext('2d'), f: $('cf').getContext('2d'), u: $('cu').getContext('2d') };
for (const k in L) L[k].imageSmoothingEnabled = false;

/* ---------------- drawing primitives (all snapped to the style pixel grid) ---------------- */
function R(g, x, y, w, h, c) {
  let x0 = snap(x), y0 = snap(y), x1 = snap(x + w), y1 = snap(y + h);
  if (w > 0 && x1 <= x0) x1 = x0 + PX;
  if (h > 0 && y1 <= y0) y1 = y0 + PX;
  g.fillStyle = col(c); g.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = col(c); cx = snap(cx); cy = snap(cy);
  for (let dy = -r; dy <= r; dy += PX) { const dx = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy)) / PX) * PX; g.fillRect(cx - dx, cy + dy, dx * 2 + PX, PX); }
}
function ring(g, cx, cy, r, c, w = 1) { disc(g, cx, cy, r, c); }
function line(g, x0, y0, x1, y1, w, c) {
  g.fillStyle = col(c); w = Math.max(PX, snap(w));
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const step = Math.max(1, PX);
  for (let i = 0; i <= n; i += step) { const f = i / n; g.fillRect(snap(x0 + (x1 - x0) * f - w / 2), snap(y0 + (y1 - y0) * f - w / 2), w, w); }
}
const patC = {};
function pat(c1, c2, kind = 0) {
  const a = col(c1), b = col(c2);
  if (typeof a !== 'string' || typeof b !== 'string') return typeof a !== 'string' ? a : b;
  const k = a + b + kind;
  if (!patC[k]) {
    const c = document.createElement('canvas'); c.width = c.height = 4 * PX; const p = c.getContext('2d');
    p.fillStyle = a; p.fillRect(0, 0, 4 * PX, 4 * PX); p.fillStyle = b;
    const cell = (x, y) => p.fillRect(x * PX, y * PX, PX, PX);
    if (kind === 0) { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) cell(x, y); }
    else if (kind === 1) { cell(0, 0); cell(2, 2); }
    else if (kind === 2) { for (let x = 0; x < 4; x++) { cell(x, 0); cell(x, 2); } }
    else { for (let y = 0; y < 4; y++) { cell(0, y); cell(2, y); } }
    patC[k] = L.m.createPattern(c, 'repeat');
  }
  return patC[k];
}
function dith(g, x, y, w, h, c1, c2, kind = 0) {
  const x0 = snap(x), y0 = snap(y);
  g.fillStyle = pat(c1, c2, kind); g.fillRect(x0, y0, snap(x + w) - x0, snap(y + h) - y0);
}
/* vertical dithered gradient from a colour list */
function bands(g, x, y0, y1, w, cols, tr = 6) {
  const n = cols.length, h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) R(g, x, y0 + i * h, w, h + 1, cols[i]);
  for (let i = 0; i < n - 1; i++) dith(g, x, y0 + (i + 1) * h - tr / 2, w, tr, cols[i], cols[i + 1], 0);
}
/* pixel text: font pixel = whole multiple of the grid so glyphs stay crisp. sz ~ 8 means 1 font pixel per canvas px. */
function txt(g, s, x, y, sz, c, al = 'left', ol) {
  const fp = Math.max(PX, Math.round(sz / 8 / PX) * PX);
  g.font = fp * 8 + 'px PS2P'; g.textBaseline = 'top'; g.textAlign = al;
  const X = snap(x), Y = snap(y);
  if (ol) { g.fillStyle = col(ol); const o = Math.max(PX, fp); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) g.fillText(s, X + dx * o, Y + dy * o); }
  g.fillStyle = col(c); g.fillText(s, X, Y);
}
const txtW = (s, sz) => s.length * Math.max(PX, Math.round(sz / 8 / PX) * PX) * 8;
function glow(g, x, y, r, c, a = 0.5) {
  const k = STYLE.glow == null ? 1 : STYLE.glow; if (k <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, (a * k) / 3);
  for (let i = 0; i < 4; i++) disc(g, x, y, Math.max(PX, Math.round(r * (1 - i * 0.24))), c);
  g.restore();
}
function alpha(g, a, fn) { g.save(); g.globalAlpha = clamp(a); fn(); g.restore(); }
function shade(g, x, y, w, h, a = 0.35, c = INK) { alpha(g, a, () => R(g, x, y, w, h, c)); }
/* outlined bevel box. ramp = M.x array. o: {out:bool, hi:bool} */
function box(g, x, y, w, h, ramp, o = {}) {
  const out = o.out !== false && STYLE.outline !== 'none';
  if (out) R(g, x - 1, y - 1, w + 2, h + 2, INK);
  R(g, x, y, w, h, ramp[2]);
  if (STYLE.shade === 'bevel' && o.flat !== true) { R(g, x, y, w, 1, ramp[3]); R(g, x, y, 1, h, ramp[3]); R(g, x, y + h - 1, w, 1, ramp[1]); R(g, x + w - 1, y, 1, h, ramp[1]); }
}
/* grid-snapped outlined disc */
function ball(g, cx, cy, r, ramp) {
  if (STYLE.outline !== 'none') disc(g, cx, cy, r + 1, INK);
  disc(g, cx, cy, r, ramp[2]);
  if (STYLE.shade === 'bevel' && r >= 3) { disc(g, cx - r * 0.25, cy - r * 0.25, Math.max(1, Math.round(r * 0.55)), ramp[3]); R(g, cx - r * 0.45, cy - r * 0.55, Math.max(1, r * 0.3), Math.max(1, r * 0.2), ramp[4]); }
}
/* camera/layer helper: horizontal parallax; cam is in world px, k the layer factor */
function lay(g, cam, k, fn) { g.save(); g.translate(-snap(cam * k), 0); fn(g); g.restore(); }
/* definition registries (also read by the node side to list scenarios, props, heroes and npcs) */
const SC = {}, HEROES = {}, NPCS = {};
function defScenario(d) { SC[d.id] = d; }
function defHero(d) { HEROES[d.id] = d; }
function defNpc(d) { NPCS[d.id] = d; }
