/* lib.js - pixel drawing toolkit. Everything is a pure function of time t (seconds). No Date.now, no Math.random. */
'use strict';
const W = 270, H = 480, GY = 345;
const $ = (id) => document.getElementById(id);
const L = { b: $('cb').getContext('2d'), m: $('cm').getContext('2d'), f: $('cf').getContext('2d'), u: $('cu').getContext('2d') };
for (const k in L) L[k].imageSmoothingEnabled = false;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const pr = (t, t0, d) => clamp((t - t0) / d);
const lerp = (a, b, k) => a + (b - a) * k;
const EA = {
  out: (x) => 1 - Math.pow(1 - x, 3),
  out4: (x) => 1 - Math.pow(1 - x, 4),
  in: (x) => x * x * x,
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
const hs = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/* piecewise-eased keyframes: keys=[[t,v],...] */
function kf(t, keys, ease = EA.io) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], ease(pr(t, a[0], b[0] - a[0]))); }
  }
  return keys[keys.length - 1][1];
}
const R = (g, x, y, w, h, c) => {
  const x0 = Math.round(x), y0 = Math.round(y);
  g.fillStyle = c; g.fillRect(x0, y0, Math.round(x + w) - x0, Math.round(y + h) - y0);
};
function disc(g, cx, cy, r, c) {
  g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt(r * r + r * 0.6 - dy * dy)); g.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1); }
}
function line(g, x0, y0, x1, y1, w, c) {
  g.fillStyle = c;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n - w / 2), Math.round(y0 + ((y1 - y0) * i) / n - w / 2), w, w);
}
const patC = {};
function pat(g, c1, c2, kind = 0) {
  const k = c1 + c2 + kind;
  if (!patC[k]) {
    const c = document.createElement('canvas'); c.width = c.height = 4; const p = c.getContext('2d');
    p.fillStyle = c1; p.fillRect(0, 0, 4, 4); p.fillStyle = c2;
    if (kind === 0) { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) p.fillRect(x, y, 1, 1); }
    else if (kind === 1) { p.fillRect(0, 0, 1, 1); p.fillRect(2, 2, 1, 1); }
    else if (kind === 2) { p.fillRect(0, 0, 4, 1); p.fillRect(0, 2, 4, 1); }
    else { p.fillRect(0, 0, 1, 4); p.fillRect(2, 0, 1, 4); }
    patC[k] = g.createPattern(c, 'repeat');
  }
  return patC[k];
}
function dith(g, x, y, w, h, c1, c2, kind = 0) { g.fillStyle = pat(g, c1, c2, kind); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/* vertical dithered gradient from a colour list */
function bands(g, x, y0, y1, w, cols, tr = 6) {
  const n = cols.length, h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) R(g, x, y0 + i * h, w, h + 1, cols[i]);
  for (let i = 0; i < n - 1; i++) dith(g, x, y0 + (i + 1) * h - tr / 2, w, tr, cols[i], cols[i + 1], 0);
}
function txt(g, s, x, y, sz, c, al = 'left', ol) {
  g.font = sz + 'px PS2P'; g.textBaseline = 'top'; g.textAlign = al;
  if (ol) { g.fillStyle = ol; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) g.fillText(s, Math.round(x + dx), Math.round(y + dy)); }
  g.fillStyle = c; g.fillText(s, Math.round(x), Math.round(y));
}
function glow(g, x, y, r, c, a = 0.5) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a / 3;
  for (let i = 0; i < 4; i++) disc(g, x, y, Math.max(1, Math.round(r * (1 - i * 0.24))), c);
  g.restore();
}
function alpha(g, a, fn) { g.save(); g.globalAlpha = clamp(a); fn(); g.restore(); }
function dust(g, t, n, seed, col, speed = 6) {
  g.save(); g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = (hs(i + seed) * (W + 40) + t * (speed * (0.4 + hs(i * 3 + seed))) ) % (W + 40) - 20;
    const y = hs(i * 7 + seed) * 300 + Math.sin(t * 0.8 + i) * 5 + 40;
    g.globalAlpha = 0.35 + 0.4 * hs(i * 5 + seed);
    g.fillRect(Math.round(x), Math.round(y), 1 + (i % 4 === 0 ? 1 : 0), 1 + (i % 4 === 0 ? 1 : 0));
  }
  g.restore();
}
function puffs(g, x, y, t, seed, col, n = 5, rise = 34, spd = 0.5) {
  g.save();
  for (let i = 0; i < n; i++) {
    const age = (t * spd + i / n + seed) % 1;
    g.globalAlpha = 0.75 * (1 - age);
    disc(g, x + Math.sin(age * 5 + i * 2) * 4 + age * 6, y - age * rise, 2 + Math.round(age * 5), col);
  }
  g.restore();
}
function burst(g, x, y, t0, t, n, cols, seed = 1, speed = 60, grav = 150, life = 0.9, sz = 3) {
  const dt = t - t0; if (dt < 0 || dt > life) return;
  g.save();
  for (let i = 0; i < n; i++) {
    const a = hs(i + seed) * Math.PI * 2, sp = speed * (0.45 + hs(i * 3 + seed));
    const px = x + Math.cos(a) * sp * dt, py = y + Math.sin(a) * sp * dt * 0.9 + 0.5 * grav * dt * dt - 20 * dt;
    g.globalAlpha = clamp(1 - Math.pow(dt / life, 2));
    const s = sz - (hs(i * 9 + seed) > 0.6 ? 1 : 0);
    R(g, px, py, s, s, cols[i % cols.length]);
  }
  g.restore();
}
function sparkle(g, x, y, t, t0, c = '#fff') {
  const dt = t - t0; if (dt < 0 || dt > 0.45) return;
  const s = Math.round(4 * Math.sin((dt / 0.45) * Math.PI));
  R(g, x - s, y, s * 2 + 1, 1, c); R(g, x, y - s, 1, s * 2 + 1, c);
  if (s > 2) { R(g, x - 1, y - 1, 3, 3, c); }
}
function sparkles(g, x, y, t, t0, n = 4, r = 12) {
  for (let i = 0; i < n; i++) sparkle(g, x + (hs(i + 3) - 0.5) * r * 2, y + (hs(i * 5) - 0.5) * r * 1.2, t, t0 + i * 0.07, i % 2 ? '#fff' : '#ffd35e');
}
/* token tile (chamfered pixel block) */
const TOK = [
  { c: '#ff6b6b', l: '#ffa0a0', d: '#c23b4a' }, { c: '#ffd35e', l: '#fff0a0', d: '#d99a2b' }, { c: '#5ed17a', l: '#a0f0b0', d: '#2e9a52' },
  { c: '#5ec9e8', l: '#a8ecff', d: '#2c8fb0' }, { c: '#b084f5', l: '#d6bcff', d: '#7a4fc4' }, { c: '#ff9f4a', l: '#ffc88a', d: '#c46a1e' },
];
const INK = '#1a1020';
function tile(g, x, y, s, k, fs = 12, o = {}) {
  const w = o.w || Math.max(fs * 2 - 4, s.length * fs + 8), h = o.h || fs + 8;
  const c = o.col || TOK[k % TOK.length];
  x = Math.round(x); y = Math.round(y);
  R(g, x + 1, y - 1, w - 2, h + 2, INK); R(g, x - 1, y + 1, w + 2, h - 2, INK);
  R(g, x + 1, y, w - 2, h, c.c); R(g, x, y + 1, w, h - 2, c.c);
  R(g, x + 1, y, w - 2, 2, c.l); R(g, x, y + 1, 2, h - 3, c.l);
  R(g, x + 1, y + h - 3, w - 2, 3, c.d); R(g, x + w - 2, y + 2, 2, h - 3, c.d);
  if (s) txt(g, s, x + w / 2, y + (h - fs) / 2 + 1, fs, INK, 'center');
  return { w, h };
}
function plank(g, x, y, s, fs, col = '#c98f55', o = {}) {
  const w = s.length * fs + 8, h = fs + 8;
  x = Math.round(x); y = Math.round(y);
  R(g, x, y, w, h, INK); R(g, x + 1, y + 1, w - 2, h - 2, col);
  R(g, x + 1, y + 1, w - 2, 2, o.hi || '#e9b87a'); R(g, x + 1, y + h - 3, w - 2, 2, o.lo || '#8a5a33');
  dith(g, x + 1, y + 3, w - 2, h - 6, col, o.hi || '#e0aa6c', 1);
  R(g, x + 3, y + 3, 1, 1, INK); R(g, x + w - 4, y + 3, 1, 1, INK); R(g, x + 3, y + h - 4, 1, 1, INK); R(g, x + w - 4, y + h - 4, 1, 1, INK);
  txt(g, s, x + w / 2 + 1, y + 5, fs, o.ink || INK, 'center');
  return { w, h };
}
function chip(g, s, x, y, col, p, fs = 8, al = 'center') {
  if (p <= 0) return;
  const sc = p < 1 ? EA.back(p) : 1; const w = s.length * fs + 10, h = fs + 8;
  const ww = Math.round(w * Math.min(sc, 1.15)), hh = Math.round(h * Math.min(sc, 1.15));
  const cx = al === 'center' ? x - ww / 2 : x;
  R(g, cx - 1, y - 1, ww + 2, hh + 2, INK); R(g, cx, y, ww, hh, col); R(g, cx, y, ww, 2, 'rgba(255,255,255,.45)'); R(g, cx, y + hh - 2, ww, 2, 'rgba(0,0,0,.25)');
  if (sc > 0.8) txt(g, s, cx + ww / 2 + 1, y + (hh - fs) / 2 + 1, fs, INK, 'center');
}
function arrowDown(g, x, y, t, c = '#fff') {
  const b = Math.round(Math.sin(t * 10) * 1.5);
  R(g, x - 3, y + b, 7, 3, INK); R(g, x - 2, y + b + 3, 5, 3, INK); R(g, x - 1, y + b + 6, 3, 2, INK);
  R(g, x - 2, y + b + 1, 5, 1, c); R(g, x - 1, y + b + 4, 3, 1, c); R(g, x, y + b + 6, 1, 1, c);
}
/* flight: parabola from (x0,y0) to (x1,y1) starting t0, lasting d. returns [x,y,landed,progress] */
function fly(t, t0, d, x0, y0, x1, y1, h) {
  const p = pr(t, t0, d), e = p;
  let y = lerp(y0, y1, e) - 4 * h * e * (1 - e);
  if (p >= 1) { const q = pr(t, t0 + d, 0.32); y = y1 - Math.abs(Math.sin(q * Math.PI * 2)) * (1 - q) * 5; }
  return [lerp(x0, x1, EA.out(p) * 0.35 + p * 0.65), y, p >= 1, p];
}
/* shake: list of [time, amp] */
function shakeAt(t, list) {
  let dx = 0, dy = 0;
  for (const [t0, a] of list) {
    const dt = t - t0;
    if (dt >= 0 && dt < 0.3) { const k = 1 - dt / 0.3; dx += Math.sin(dt * 95) * a * k; dy += Math.cos(dt * 71) * a * 0.7 * k; }
  }
  return [Math.round(dx), Math.round(dy)];
}
function belt(g, x0, x1, y, t, speed, body = '#2b3552', top = '#6e7fa6', stripe = '#3d4a6e') {
  R(g, x0, y, x1 - x0, 13, body); R(g, x0, y, x1 - x0, 3, top);
  const off = (t * speed) % 10;
  for (let x = x0 - 10; x < x1 + 10; x += 10) { const xx = x + off; if (xx >= x0 && xx + 4 <= x1) R(g, xx, y + 5, 4, 3, stripe); }
  R(g, x0, y + 11, x1 - x0, 2, '#141a2b');
}
function gear(g, cx, cy, r, teeth, ang, col, dark) {
  for (let i = 0; i < teeth; i++) {
    const a = ang + (i * Math.PI * 2) / teeth;
    R(g, cx + Math.cos(a) * (r + 1.5) - 2, cy + Math.sin(a) * (r + 1.5) - 2, 4, 4, col);
  }
  disc(g, cx, cy, r, col); disc(g, cx, cy, Math.max(2, Math.round(r * 0.5)), dark);
  R(g, cx + Math.cos(ang) * r * 0.7 - 1, cy + Math.sin(ang) * r * 0.7 - 1, 3, 3, col);
  R(g, cx - 1, cy - 1, 3, 3, col);
}
/* ---------------- the hero ---------------- */
const SK = '#f0b27a', SKD = '#d48f58', HAIR = '#3a2418', HOOD = '#ff7a3d', HOODD = '#c9501c', HOODL = '#ffa36b', PANT = '#3d4a8c', PANTD = '#2c366b', SHOE = '#f4f1ea';
/* o: x,y(feet),dir,t,ph(walk phase),mv(0..1 moving),talk(0..2),mood,fa(front arm deg),ba(back arm deg),lit,pack,blinkSeed,sq */
function hero(g, o) {
  const t = o.t, dir = o.dir || 1, x = Math.round(o.x), y = Math.round(o.y);
  const mv = o.mv || 0, ph = o.ph || 0;
  const sw = Math.sin(ph), cw = Math.cos(ph);
  const bob = mv > 0.2 ? -Math.round(Math.abs(sw) * 2) : Math.round(Math.sin(t * 5.2) * 0.9);
  const hb = mv > 0.2 ? 0 : Math.round(Math.sin(t * 5.2 - 0.9) * 0.7);
  const sqz = o.sq || 0;
  g.save(); g.translate(x, y); g.scale(dir, 1);
  const Y = (v) => v; // feet origin at (0,0)
  // shadow
  g.fillStyle = 'rgba(10,6,20,.45)'; g.fillRect(-12, -1, 24, 3);
  // backpack
  if (o.pack) {
    const pb = o.packBounce || 0;
    R(g, -20, -42 + bob - pb, 11, 20, '#2fa56e'); R(g, -20, -42 + bob - pb, 11, 3, '#6fdca0'); R(g, -20, -26 + bob - pb, 11, 4, '#1f7a50'); R(g, -18, -37 + bob - pb, 7, 6, '#1f7a50'); R(g, -17, -36 + bob - pb, 5, 1, '#6fdca0');
    R(g, -9, -40 + bob, 3, 13, '#1f7a50');
  }
  // back arm
  const ba = (o.ba != null ? o.ba : -sw * 38 * (mv > 0.2 ? 1 : 0) - 6) * Math.PI / 180;
  const sx0 = -4, sy0 = -39 + bob;
  line(g, sx0, sy0, sx0 + Math.sin(ba) * 15, sy0 + Math.cos(ba) * 15, 5, HOODD);
  R(g, sx0 + Math.sin(ba) * 15 - 2, sy0 + Math.cos(ba) * 15 - 2, 5, 5, SKD);
  // legs
  const fl = sw * 7 * (mv > 0.2 ? 1 : 0), bl = -sw * 7 * (mv > 0.2 ? 1 : 0);
  const fLift = mv > 0.2 ? Math.max(0, cw) * 3 : 0, bLift = mv > 0.2 ? Math.max(0, -cw) * 3 : 0;
  const hipY = -22 + bob;
  line(g, -3, hipY, -3 + bl, -4 - bLift, 6, PANTD); R(g, -6 + bl, -4 - bLift, 10, 4, '#cfc9be'); R(g, -6 + bl, -2 - bLift, 10, 2, '#8e8878');
  line(g, 4, hipY, 4 + fl, -4 - fLift, 6, PANT); R(g, 1 + fl, -4 - fLift, 10, 4, SHOE); R(g, 1 + fl, -2 - fLift, 10, 2, '#bdb7a8');
  // torso
  const th = 23 - sqz;
  R(g, -10, -44 + bob + sqz, 20, th, HOOD); R(g, -10, -44 + bob + sqz, 20, 3, HOODL); R(g, -10, -24 + bob, 20, 3, HOODD);
  R(g, -10, -44 + bob + sqz, 2, th, HOODL); R(g, 8, -42 + bob + sqz, 2, th - 2, HOODD);
  R(g, -5, -31 + bob, 10, 5, HOODD); R(g, 0, -43 + bob, 1, 10, HOODD);
  R(g, -3, -45 + bob + sqz, 8, 2, '#fff2e0');
  // head
  const hy = -66 + bob + hb + sqz;
  R(g, -11, hy + 1, 22, 21, SK); R(g, -10, hy, 20, 23, SK);
  R(g, -11, hy + 4, 3, 10, HAIR); // back hair
  R(g, -12, hy - 2, 24, 7, HAIR); R(g, -10, hy - 3, 18, 2, HAIR); R(g, 4, hy + 4, 6, 2, HAIR); R(g, 8, hy + 4, 2, 3, HAIR); R(g, -3, hy + 5, 4, 2, HAIR);
  R(g, 9, hy + 6, 2, 12, SKD); // face edge shade
  // eyes
  const blink = ((o.t + (o.bs || 0)) % 3.3) < 0.12;
  const mood = o.mood || 'n';
  const ey = hy + 10;
  const eyeW = mood === 's' ? 5 : 4, eyeH = mood === 's' ? 7 : 5;
  const look = o.look || 0, lookY = o.lookY || 0;
  for (const ex of [-1, 5]) {
    if (blink || mood === 'h') {
      if (mood === 'h') { R(g, ex, ey + 2, 1, 2, INK); R(g, ex + 1, ey + 1, 2, 1, INK); R(g, ex + 3, ey + 2, 1, 2, INK); }
      else R(g, ex, ey + 2, eyeW, 1, INK);
    } else {
      R(g, ex, ey, eyeW, eyeH, '#fff'); R(g, ex, ey, eyeW, 1, '#d8e0f0');
      const pc = o.lit ? '#7df9ff' : INK;
      R(g, ex + 1 + look + (eyeW > 4 ? 1 : 0), ey + 1 + lookY + (mood === 'n' ? 1 : 1), 2, 3, pc);
      if (o.lit) R(g, ex + 1 + look + (eyeW > 4 ? 1 : 0), ey + 1 + lookY, 1, 1, '#fff');
    }
  }
  // brows
  const bY = mood === 's' ? ey - 4 : mood === 't' ? ey - 3 : ey - 2;
  R(g, -1, bY, 5, 1, HAIR); R(g, 5, bY + (mood === 't' ? -1 : 0), 5, 1, HAIR);
  // cheek + mouth
  R(g, 8, ey + 7, 2, 2, '#f08a8a');
  const m = o.talk != null ? o.talk : 0;
  if (mood === 'h' && m === 0) { R(g, 1, ey + 9, 6, 1, INK); R(g, 0, ey + 8, 1, 1, INK); R(g, 7, ey + 8, 1, 1, INK); }
  else if (mood === 's' && m === 0) { R(g, 2, ey + 8, 4, 4, INK); R(g, 3, ey + 9, 2, 2, '#e0707a'); }
  else if (m === 0) R(g, 2, ey + 10, 6, 1, INK);
  else if (m === 1) { R(g, 2, ey + 9, 6, 3, INK); R(g, 3, ey + 11, 4, 1, '#e0707a'); }
  else { R(g, 1, ey + 8, 7, 5, INK); R(g, 2, ey + 11, 5, 2, '#e0707a'); }
  // front arm
  const fa = (o.fa != null ? o.fa : sw * 38 * (mv > 0.2 ? 1 : 0) + 6) * Math.PI / 180;
  const fx0 = 5, fy0 = -39 + bob;
  line(g, fx0, fy0, fx0 + Math.sin(fa) * 15, fy0 + Math.cos(fa) * 15, 5, HOOD);
  R(g, fx0 + Math.sin(fa) * 15 - 2, fy0 + Math.cos(fa) * 15 - 2, 5, 5, SK);
  g.restore();
  if (o.lit) { glow(g, x + dir * 1, y - 56 + bob, 10, '#7df9ff', 0.45); }
}
function bubble(g, x, y, sym, t, t0, col = '#e04f4f', life = 1.4) {
  const dt = t - t0; if (dt < 0 || dt > life) return;
  const p = EA.back(clamp(dt / 0.22)) * (dt > life - 0.2 ? clamp((life - dt) / 0.2) : 1);
  const w = Math.round(24 * p), h = Math.round(22 * p); if (w < 4) return;
  const bx = Math.round(x - w / 2), by = Math.round(y - h);
  R(g, bx - 1, by - 1, w + 2, h + 2, INK); R(g, bx, by, w, h, '#fff'); R(g, bx + w / 2 - 3, by + h + 1, 7, 2, INK); R(g, bx + w / 2 - 2, by + h, 5, 2, '#fff'); R(g, bx + w / 2 - 1, by + h + 2, 3, 2, INK);
  if (p > 0.8) {
    const bounce = Math.round(Math.sin(dt * 14) * 1);
    txt(g, sym, bx + w / 2 + 1, by + h / 2 - 7 + bounce, 14, col, 'center');
  }
}
/* hero mouth from the voice envelope */
function mouth(t) {
  const i = Math.max(0, Math.min(ENV.length - 1, Math.round(t * FPS)));
  const v = Math.max(ENV[i], ENV[Math.max(0, i - 1)] * 0.7);
  return v > 0.55 ? 2 : v > 0.18 ? 1 : 0;
}
/* camera/layer helper: draw fn with horizontal parallax */
function lay(g, cam, k, fn) { g.save(); g.translate(-Math.round(cam * k), 0); fn(g); g.restore(); }
