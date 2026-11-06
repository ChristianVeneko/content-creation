/* fx.js: ambient motion, particles and the motion kit. Closed-form (no state): every position is a function of t and a seed. */
'use strict';
function dust(g, t, n, seed, c, speed = 6, y0 = 40, span = 300) {
  g.save(); g.fillStyle = col(c);
  for (let i = 0; i < n; i++) {
    const x = ((hs(i + seed) * (W + 40) + t * (speed * (0.4 + hs(i * 3 + seed)))) % (W + 40)) - 20;
    const y = hs(i * 7 + seed) * span + Math.sin(t * 0.8 + i) * 5 + y0;
    g.globalAlpha = 0.35 + 0.4 * hs(i * 5 + seed);
    g.fillRect(snap(x), snap(y), PX, PX);
  }
  g.restore();
}
function puffs(g, x, y, t, seed, c, n = 5, rise = 34, spd = 0.5) {
  g.save();
  for (let i = 0; i < n; i++) {
    const age = (t * spd + i / n + seed) % 1;
    g.globalAlpha = 0.7 * (1 - age);
    disc(g, x + Math.sin(age * 5 + i * 2) * 4 + age * 6, y - age * rise, 2 + Math.round(age * 5), c);
  }
  g.restore();
}
/* radial burst from (x,y) starting at t0 */
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
function sparkle(g, x, y, t, t0, c = '#ffffff') {
  const dt = t - t0; if (dt < 0 || dt > 0.45) return;
  const s = Math.round(4 * Math.sin((dt / 0.45) * Math.PI));
  R(g, x - s, y, s * 2 + 1, 1, c); R(g, x, y - s, 1, s * 2 + 1, c);
  if (s > 2) R(g, x - 1, y - 1, 3, 3, c);
}
function stars(g, t, n, seed, y1 = 200, c = '#ffffff') {
  for (let i = 0; i < n; i++) {
    const x = hs(i + seed) * W, y = hs(i * 5 + seed) * y1, tw = Math.floor(t * 2 + i) % 5 === 0;
    R(g, x, y, tw ? 2 : 1, tw ? 2 : 1, c);
  }
}
function clouds(g, t, y, n, c, spd = 4, seed = 3, ww = 22) {
  for (let i = 0; i < n; i++) {
    const x = ((hs(i + seed) * (W + 120) + t * spd * (0.6 + hs(i * 3))) % (W + 120)) - 60, yy = y + hs(i * 9 + seed) * 28;
    R(g, x, yy, ww, 5, c); R(g, x + 5, yy - 4, ww * 0.55, 5, c); R(g, x + ww * 0.35, yy + 4, ww * 0.6, 3, c);
  }
}
function rain(g, t, n = 40, seed = 5, c = '#8b9bb4', slant = 3) {
  g.save(); g.globalAlpha = 0.6;
  for (let i = 0; i < n; i++) {
    const sp = 260 + hs(i + seed) * 120, x = ((hs(i * 3 + seed) * (W + 40) - t * slant * 12 + (W + 40) * 40) % (W + 40)) - 10;
    const y = ((hs(i * 7 + seed) * 520 + t * sp) % 520) - 20;
    R(g, x, y, 1, 7, c); R(g, x - 1, y + 7, 1, 2, c);
  }
  g.restore();
}
function embers(g, t, n = 24, seed = 9, y0 = 380) {
  g.save();
  for (let i = 0; i < n; i++) {
    const age = (t * (0.18 + hs(i + seed) * 0.2) + hs(i * 3 + seed)) % 1;
    const x = hs(i * 5 + seed) * W + Math.sin(age * 9 + i) * 8, y = y0 - age * 360;
    g.globalAlpha = 1 - age;
    R(g, x, y, age < 0.5 ? 2 : 1, age < 0.5 ? 2 : 1, age < 0.3 ? M.fire[4] : age < 0.6 ? M.fire[3] : M.fire[2]);
  }
  g.restore();
}
function fireflies(g, t, n = 14, seed = 2, y0 = 200, span = 140, c = '#fff0a0') {
  for (let i = 0; i < n; i++) {
    const x = hs(i + seed) * W + Math.sin(t * 0.7 + i * 2) * 14, y = y0 + hs(i * 5 + seed) * span + Math.cos(t * 0.9 + i) * 9;
    if (Math.sin(t * 2 + i * 1.7) > -0.2) { R(g, x, y, 1, 1, c); glow(g, x, y, 4, c, 0.5); }
  }
}
/* wavy water surface: heightfield per column, highlight on crests */
function waves(g, t, y, x0, x1, ramp, depth = 40, amp = 2) {
  R(g, x0, y, x1 - x0, depth, ramp[1]);
  for (let x = x0; x < x1; x += PX) {
    const h = Math.sin(x * 0.12 + t * 2) * amp + Math.sin(x * 0.31 - t * 1.3) * 0.8;
    R(g, x, y + h, PX, 2, ramp[3]);
    if (Math.round(x / PX) % 6 === 0) R(g, x, y + h + 4 + (hs(x) > 0.5 ? 2 : 0), 2, 1, ramp[2]);
  }
}
function arrowDown(g, x, y, t, c = '#ffffff') {
  const b = Math.round(Math.sin(t * 10) * 1.5);
  R(g, x - 3, y + b, 7, 3, INK); R(g, x - 2, y + b + 3, 5, 3, INK); R(g, x - 1, y + b + 6, 3, 2, INK);
  R(g, x - 2, y + b + 1, 5, 1, c); R(g, x - 1, y + b + 4, 3, 1, c); R(g, x, y + b + 6, 1, 1, c);
}
/* parabolic flight returning [x, y, landed, progress] */
function fly(t, t0, d, x0, y0, x1, y1, h) {
  const p = pr(t, t0, d);
  let y = lerp(y0, y1, p) - 4 * h * p * (1 - p);
  if (p >= 1) { const q = pr(t, t0 + d, 0.32); y = y1 - Math.abs(Math.sin(q * Math.PI * 2)) * (1 - q) * 5; }
  return [lerp(x0, x1, EA.out(p) * 0.35 + p * 0.65), y, p >= 1, p];
}
/* screen shake from [[time, amp]] -> integer offset snapped to the style grid */
function shakeAt(t, list) {
  let dx = 0, dy = 0;
  for (const [t0, a] of list) {
    const dt = t - t0;
    if (dt >= 0 && dt < 0.3) { const k = 1 - dt / 0.3; dx += Math.sin(dt * 95) * a * k; dy += Math.cos(dt * 71) * a * 0.7 * k; }
  }
  return [snap(dx), snap(dy)];
}
/* token tile (chamfered pixel block) with optional label */
function tile(g, x, y, s, k, fs = 8, o = {}) {
  const ramp = o.ramp || M[TOKR[((k % 6) + 6) % 6]];
  const w = o.w || Math.max(fs * 2 - 4, s.length * fs + 8), h = o.h || fs + 8;
  x = snap(x); y = snap(y);
  if (STYLE.outline !== 'none') { R(g, x + 1, y - 1, w - 2, h + 2, INK); R(g, x - 1, y + 1, w + 2, h - 2, INK); }
  R(g, x + 1, y, w - 2, h, ramp[2]); R(g, x, y + 1, w, h - 2, ramp[2]);
  if (STYLE.shade === 'bevel') { R(g, x + 1, y, w - 2, 2, ramp[3]); R(g, x, y + 1, 2, h - 3, ramp[3]); R(g, x + 1, y + h - 3, w - 2, 3, ramp[1]); R(g, x + w - 2, y + 2, 2, h - 3, ramp[1]); }
  if (s) txt(g, s, x + w / 2, y + (h - fs) / 2 + 1, fs, INK, 'center');
  return { w, h };
}
/* label chip colours with WCAG contrast >= 4.5 between text and fill; works on mapped (palette) colours, master values are returned */
const chipCache = {};
function chipColors(ramp) {
  const k = ramp[2]; if (chipCache[k]) return chipCache[k];
  const solid = (c) => { const v = col(c); return typeof v === 'string' ? v : null; }, light = PALHEX[PALORDER[PALORDER.length - 1]], dark = PALHEX[PALORDER[0]];
  let res = null;
  for (const b of [ramp[2], ramp[3], ramp[4], ramp[1]]) {
    const bv = solid(b); if (!bv) continue;
    for (const f of [INK, dark, light]) { const fv = solid(f); if (fv && contrastRatio(bv, fv) >= 4.5) { res = { bg: b, fg: f }; break; } }
    if (res) break;
  }
  return (chipCache[k] = res || { bg: light, fg: dark });
}
function chip(g, s, x, y, ramp, p, fs = 8, al = 'center') {
  if (p <= 0) return;
  const cc = chipColors(ramp), sc = p < 1 ? EA.back(p) : 1, fh = Math.max(fs, Math.max(PX, Math.round(fs / 8 / PX) * PX) * 8), w = txtW(s, fs) + 10, h = fh + 8; // fh: real glyph height (grows with the style grid)
  const ww = Math.round(w * Math.min(sc, 1.15)), hh = Math.round(h * Math.min(sc, 1.15));
  const cx = al === 'center' ? x - ww / 2 : x;
  R(g, cx - 1, y - 1, ww + 2, hh + 2, INK); R(g, cx, y, ww, hh, cc.bg);
  if (STYLE.shade === 'bevel' && cc.bg === ramp[2]) { R(g, cx, y, ww, 2, ramp[3]); R(g, cx, y + hh - 2, ww, 2, ramp[1]); }
  if (sc > 0.8) txt(g, s, cx + ww / 2 + 1, y + (hh - fh) / 2 + 1, fs, cc.fg, 'center');
}
function gear(g, cx, cy, r, teeth, ang, ramp) {
  for (let i = 0; i < teeth; i++) { const a = ang + (i * Math.PI * 2) / teeth; R(g, cx + Math.cos(a) * (r + 1.5) - 2, cy + Math.sin(a) * (r + 1.5) - 2, 4, 4, ramp[3]); }
  disc(g, cx, cy, r, ramp[2]); disc(g, cx, cy, Math.max(2, Math.round(r * 0.5)), ramp[0]); R(g, cx - 1, cy - 1, 3, 3, ramp[3]);
}

/* ---------------- MOTION KIT: what the hand-made scenes do (bounce-in, parabola flights, chips, flicker, squash), reusable by any prop ---------------- */
/* stepped flicker 0.55-1 (torch, lamp, neon): changes `rate` times per second, never smooth */
function flicker(t, seed = 0, rate = 12) { return 0.55 + 0.45 * hs(Math.floor(t * rate) + seed * 17); }
/* bounce-in: y offset (<= 0) of something dropped from `h` px above its rest position at t0 */
function dropIn(t, t0, h = 40, d = 0.6) { return -h * (1 - EA.bounce(pr(t, t0, d))); }
/* squash then stretch of a figure after a hit at t0: { sq: squash px, jump: stretch hop px } or null */
function hitSquash(t, t0) {
  const dt = t - t0; if (dt < 0 || dt > 0.27) return null;
  if (dt < 0.07) return { sq: 2, jump: 0 };
  return { sq: 0, jump: Math.round(Math.sin(pr(t, t0 + 0.07, 0.2) * Math.PI) * 3) };
}
/* shards thrown from (x,y): each on its own parabola with chunky 2-3 px pixels (chop, break, impact) */
function chips(g, t, t0, x, y, n, seed, cols, speed = 70, grav = 280, life = 0.75) {
  const dt = t - t0; if (dt < 0 || dt > life) return;
  g.save();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hs(i + seed) - 0.5) * 2.6, sp = speed * (0.5 + hs(i * 3 + seed) * 0.7);
    g.globalAlpha = clamp(1 - Math.pow(dt / life, 3));
    const s = hs(i * 7 + seed) > 0.5 ? 3 : 2;
    R(g, x + Math.cos(a) * sp * dt, y + Math.sin(a) * sp * dt + 0.5 * grav * dt * dt, s, s, cols[i % cols.length]);
  }
  g.restore();
}
/* tokens flying in from the sides on parabolas and landing on (x1,y1) one after another, a spark on every landing (fill, deposit) */
function gain(g, t, t0, x1, y1, n, seed, ramp) {
  for (let i = 0; i < n; i++) {
    const ti = t0 + i * 0.07, d = 0.34; if (t < ti || t > ti + d + 0.3) continue;
    const x0 = x1 + (hs(i + seed) - 0.5) * 90, y0 = y1 - 38 - hs(i * 3 + seed) * 26, f = fly(t, ti, d, x0, y0, x1 + (hs(i * 5 + seed) - 0.5) * 8, y1, 20);
    if (!f[2]) { R(g, f[0] - 1, f[1] - 1, 4, 4, INK); R(g, f[0], f[1], 3, 3, ramp[3]); R(g, f[0], f[1], 1, 1, ramp[4]); }
    else sparkle(g, x1, y1 - 2, t, ti + d, '#ffffff');
  }
}
/* coin thrown out of (x,y): launch velocity, gravity and a damped bounce on the ground line gy; returns [x, y, lifeFraction] or null */
function toss(t, t0, x, y, vx, vy, gy, life = 1.5) {
  const dt = t - t0; if (dt < 0 || dt > life) return null;
  const g = 480, disc2 = vy * vy + 2 * g * (gy - y), tl = disc2 > 0 ? (-vy + Math.sqrt(disc2)) / g : 0;
  if (dt < tl) return [x + vx * dt, y + vy * dt + 0.5 * g * dt * dt, dt / life];
  const q = dt - tl;
  return [x + vx * (tl + Math.min(q, 0.35) * 0.4), gy - Math.abs(Math.sin(q * 11)) * 9 * Math.exp(-q * 4.5), dt / life];
}

/* ---------------- MECHANISM KIT: objects that travel, change state, pile up (closed form, pure functions of t) ---------------- */
const EASE_OF = { linear: EA.lin, in: EA.in, out: EA.out, inout: EA.io };
/* position at eased progress p (0-1) on a route from (x0,y0) to (x1,y1): kind line | arc (parabola of height h) | bezier (S-curve of height h) */
function pathAt(kind, p, x0, y0, x1, y1, h) {
  if (kind === 'arc') return [lerp(x0, x1, p), lerp(y0, y1, p) - 4 * h * p * (1 - p)];
  if (kind === 'bezier') {
    const c0x = x0 + (x1 - x0) * 0.15, c0y = y0 - h * 1.35, c1x = x0 + (x1 - x0) * 0.85, c1y = y1 - h * 1.35, u = 1 - p;
    return [u * u * u * x0 + 3 * u * u * p * c0x + 3 * u * p * p * c1x + p * p * p * x1, u * u * u * y0 + 3 * u * u * p * c0y + 3 * u * p * p * c1y + p * p * p * y1];
  }
  return [lerp(x0, x1, p), lerp(y0, y1, p)];
}
/* arc height of a route: grows with the distance, 18-70 px */
const arcHeight = (x0, x1) => clamp(Math.abs(x1 - x0) * 0.35 + 14, 18, 70);
/* a small puff of dust where something vanishes */
function puffAt(g, t, t0, x, y, seed = 1) {
  const dt = t - t0; if (dt < 0 || dt > 0.45) return;
  g.save();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + hs(i + seed), r = 3 + EA.out(dt / 0.45) * 9;
    g.globalAlpha = 1 - dt / 0.45;
    disc(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8 - dt * 6, 2 + (i % 2), '#ffffff');
  }
  g.restore();
}
/* pixel object drawn around its centre (cx, cy). o: { sc: scale, sx: width factor (spin), state, k: colour index, text } */
function itemSprite(g, kind, cx, cy, o = {}) {
  const S = (o.sc == null ? 1 : o.sc) * 1.5, sx = o.sx == null ? 1 : o.sx; if (S <= 0.02) return;
  const Q = (ox, oy, w, h, c) => R(g, cx + ox * S * sx, cy + oy * S, Math.max(1, w * S * sx), Math.max(1, h * S), c);
  const ol = (w, h) => Q(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, INK);
  const st = o.state || 'closed', rp = M[TOKR[(((o.k | 0) % 6) + 6) % 6]];
  if (kind === 'coin') { ol(10, 10); Q(-4, -5, 8, 10, M.gold[3]); Q(-5, -4, 10, 8, M.gold[3]); Q(-1, -3, 2, 6, M.gold[1]); Q(-3, -4, 2, 2, M.gold[4]); return; }
  if (kind === 'letter') { ol(16, 11); Q(-8, -5, 16, 10, M.white[3]); Q(-8, -5, 16, 1, M.white[1]); for (let i = 0; i < 4; i++) { Q(-7 + i * 2, -5 + i, 2, 1, M.steel[2]); Q(5 - i * 2, -5 + i, 2, 1, M.steel[2]); } Q(-1, 0, 3, 3, M.red[2]); return; }
  if (kind === 'msg') { ol(16, 11); Q(-8, -6, 16, 10, M.white[3]); Q(-7, -5, 14, 8, M.white[4]); Q(-5, 4, 3, 3, INK); Q(-4, 3, 2, 2, M.white[3]); Q(-5, -3, 8, 1, M.steel[2]); Q(-5, -1, 10, 1, M.steel[2]); Q(-5, 1, 6, 1, M.steel[2]); return; }
  if (kind === 'dish') { ol(16, 10); Q(-8, 1, 16, 3, M.white[3]); Q(-7, 4, 14, 1, M.white[1]); Q(-5, -4, 10, 5, M.orange[2]); Q(-3, -5, 6, 1, M.orange[3]); Q(-1, -7, 2, 2, M.white[3]); return; }
  if (kind === 'crate') { ol(14, 14); Q(-7, -7, 14, 14, M.wood[2]); Q(-7, -7, 14, 2, M.wood[3]); Q(-7, 5, 14, 2, M.wood[1]); for (let i = 0; i < 5; i++) { Q(-5 + i * 2, -5 + i * 2, 2, 2, M.wood[1]); Q(3 - i * 2, -5 + i * 2, 2, 2, M.wood[1]); } return; }
  if (kind === 'commit') { ol(12, 12); Q(-5, -6, 10, 12, rp[2]); Q(-6, -5, 12, 10, rp[2]); Q(-4, -5, 6, 2, rp[3]); Q(-2, -2, 4, 4, M.white[4]); return; }
  if (kind === 'tile') { ol(14, 12); Q(-7, -6, 14, 12, rp[2]); Q(-7, -6, 14, 2, rp[3]); Q(-7, 4, 14, 2, rp[1]); Q(-2, -2, 4, 4, rp[4]); return; }
  /* box (parcel): states open closed taped labelled; empty/full read as open/closed */
  const open = st === 'open' || st === 'empty';
  ol(14, 12); Q(-7, -4, 14, 10, M.wood[2]); Q(-7, -4, 14, 2, M.wood[3]); Q(-7, 4, 14, 2, M.wood[1]);
  if (open) { Q(-8, -8, 4, 5, M.wood[3]); Q(4, -8, 4, 5, M.wood[3]); Q(-6, -3, 12, 2, INK); } else { Q(-7, -6, 14, 3, M.wood[3]); Q(-7, -4, 14, 1, M.wood[1]); }
  if (st === 'taped' || st === 'labelled' || st === 'full') { Q(-1, -6, 3, 12, M.sand[3]); Q(-7, -1, 14, 2, M.sand[3]); }
  if (st === 'labelled') { Q(-5, 0, 7, 5, M.white[4]); Q(-4, 1, 5, 1, M.steel[2]); Q(-4, 3, 3, 1, M.steel[2]); }
}
/* big check (green) or cross (red) mark of 14 px, pop-in p 0-1 */
function markSprite(g, cx, cy, ok, p) {
  const S = EA.back(clamp(p)); if (S <= 0.05) return;
  const d = Math.round(7 * S), c = ok ? M.green[3] : M.red[3], dk = ok ? M.green[0] : M.red[0];
  disc(g, cx, cy, d + 2, INK); disc(g, cx, cy, d, dk);
  const u = Math.max(1, Math.round(S * 2));
  if (ok) { for (let i = 0; i < 3; i++) R(g, cx - 4 * S + i * u * 1.5, cy + i * u - 1, u * 2, u * 2, c); for (let i = 0; i < 5; i++) R(g, cx - 1 * S + i * u * 1.5, cy + 2 - i * u, u * 2, u * 2, c); }
  else for (let i = -3; i <= 3; i++) { R(g, cx + i * u, cy + i * u, u * 2, u * 2, c); R(g, cx + i * u, cy - i * u, u * 2, u * 2, c); }
}
