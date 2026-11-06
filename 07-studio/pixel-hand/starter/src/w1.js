/* w1.js - world 1: the oasis at dusk. A CPU chip on a rock, the hidden oasis (= the cache), a sign, a gauge and a cable. Shared helpers for all worlds. */
'use strict';
const FY = 336; // feet line of the narrator
const YH = 268; // horizon (start of the sand plane)

/* far layer is drawn into OFF, then blitted into the (blurred) back canvas with a heat-shimmer on the horizon rows */
function blitBack(t, amp = 1.3) {
  const g = L.b, a = YH - 20, b = YH + 6;
  g.drawImage(OFF, 0, 0, W, a, 0, 0, W, a);
  for (let y = a; y < b; y++) { const k = 1 - Math.abs(y - (YH - 7)) / 14; const dx = Math.round(Math.sin(t * 3.4 + y * 0.9) * amp * clamp(k, 0, 1)); g.drawImage(OFF, 0, y, W, 1, dx, y, W, 1); }
  g.drawImage(OFF, 0, b, W, H - b, 0, b, W, H - b);
}
function farDesert(t, o) {
  const g = GO; g.clearRect(0, 0, W, H);
  const cam = o.cam || 0;
  sky(g, o.sky, YH + 10, W + 90);
  if (o.stars) stars(g, t, o.nstars || 46, o.seed || 1, 175, W, o.stars);
  if (o.sun) { const [sx, sy, sr] = o.sun; sun(g, sx - cam * 0.05, sy, sr, t); }
  if (o.moon) { const [mx, my] = o.moon; glow(g, mx, my, 34, '#aab8ff', 0.5); disc(g, mx, my, 13, '#e8eeff'); disc(g, mx + 4, my - 2, 11, SKY_NIGHT[3]); disc(g, mx - 2, my + 3, 2, '#c8d0f0'); }
  if (o.mtn) lay(g, cam, 0.12, (gg) => mountains(gg, YH + 4, o.mtn.peaks, o.mtn.c, o.mtn.hi, YH + 12));
  (o.dunes || []).forEach((d) => lay(g, cam, d.k, (gg) => dunes(gg, d.base, d.amp, d.freq, d.shift, d.c, d.hi, -40, W + 330, YH + 14)));
  if (o.camels) lay(g, cam, 0.2, (gg) => { for (let i = 0; i < 3; i++) camel(gg, ((t * 4.5 + i * 22) % 360) - 30 + 0, YH - 3 - (i % 2), t + i, 1, 1, o.camelCol || '#2a1a3a'); });
  if (o.birds) for (let i = 0; i < o.birds; i++) bird(g, ((t * (9 + i * 3) + i * 90) % (W + 60)) - 20, 120 + i * 26 + Math.sin(t * 0.8 + i) * 4, t, i, o.birdCol || '#2a1a3a');
  blitBack(t);
}
/* foreground dressing (blurred layer): dark dune lip, silhouettes, tufts, drifting sand */
function fgDress(t, cam, th) {
  lay(L.f, cam, 1.55, (g) => {
    const dk = th.fg || '#2a1a3a';
    dunes(g, 462, 30, 0.018, th.shift || 1.3, dk, th.fgHi || '#4a2d5a', -60, W + 560, 480);
    cactus(g, 24, 480, 52, t, { d: dk, m: dk, l: th.fgHi || '#4a2d5a' });
    rock(g, 196, 480, 54, 22, { d: dk, m: dk, l: th.fgHi || '#4a2d5a', hi: dk, k: dk });
    tuft(g, 120, 474, t, 1); tuft(g, 140, 477, t, 2); tuft(g, 150, 472, t, 3);
  });
  lay(L.f, cam, 0.9, (g) => sandDots(g, t, 26, 9, 280, 460, th.dust || '#ffe6b0', 9));
}
/* sand plane + lower-third detail (footprints, pebbles, a buried crate) */
function groundMid(g, t, cam, c, o = {}) {
  sandPlane(g, -40, W + 560, YH, cam, c);
  R(g, -40, YH, W + 600, 1, mixc(c.hi, '#ffffff', 0.4));
  // ripples on the sand
  for (let i = 0; i < 60; i++) { const x = i * 21 + hs(i) * 9, y = 360 + hs(i * 3) * 110; R(g, x, y, 8 + hs(i * 7) * 8, 1, c.k); R(g, x + 2, y + 1, 5, 1, c.hi); }
  for (let i = 0; i < 26; i++) { const x = 20 + i * 41 + hs(i + 4) * 20, y = 356 + hs(i * 9) * 100; R(g, x, y, 4, 2, c.k); R(g, x, y, 4, 1, c.dd); }
  // lower-third dressing: rocks, small cacti, bones, a rolling tumbleweed
  for (const [x, y, w, h] of [[30, 392, 16, 8], [118, 420, 22, 10], [205, 400, 14, 7], [300, 410, 20, 9], [380, 396, 14, 7], [470, 424, 24, 10], [560, 398, 16, 8], [650, 414, 20, 9]]) rock(g, x, y, w, h, { d: mixc(c.dd, '#000000', 0.1), m: c.dd, l: c.d, hi: c.m, k: c.k });
  for (const [x, y] of [[70, 440], [250, 432], [430, 446], [600, 436]]) { R(g, x, y - 12, 4, 12, INK); R(g, x + 1, y - 11, 2, 11, LEAF.m); R(g, x - 4, y - 8, 4, 2, LEAF.m); R(g, x - 4, y - 10, 2, 3, LEAF.m); R(g, x + 4, y - 6, 4, 2, LEAF.m); }
  for (const [x, y] of [[160, 380], [340, 440], [520, 384]]) { R(g, x, y, 10, 2, '#f0e8d8'); R(g, x - 1, y - 1, 3, 4, '#f0e8d8'); R(g, x + 9, y - 1, 3, 4, '#f0e8d8'); }
  { const tx = ((t * 22 + 40) % 420) - 40 + cam * 0, ty = 408 + Math.abs(Math.sin(t * 5)) * -5; const ang = t * 6; disc(g, tx, ty, 6, '#8a5a3a'); for (let i = 0; i < 6; i++) { const a = ang + i * 1.05; line(g, tx, ty, tx + Math.cos(a) * 6, ty + Math.sin(a) * 6, 1, '#c98f55'); } }
  if (o.prints) for (let i = 0; i < 30; i++) { const x = 40 + i * 14; R(g, x, 352 + (i % 2) * 3, 3, 2, c.dd); }
}

/* ---------------- CPU on a rock ---------------- */
function cpuRock(g, t, o = {}) {
  const lit = o.lit == null ? 1 : o.lit;
  rock(g, 4, 332, 78, 34);
  const x0 = 14, y0 = 244, w = 58, h = 58;
  for (let i = 0; i < 7; i++) {
    const p = x0 + 5 + i * 7.6;
    R(g, p, y0 - 4, 2, 5, INK); R(g, p, y0 - 3, 2, 3, GOLD);
    const q = y0 + 5 + i * 7.6;
    R(g, x0 - 4, q, 5, 2, INK); R(g, x0 - 3, q, 3, 2, GOLD); R(g, x0 + w - 1, q, 5, 2, INK); R(g, x0 + w, q, 3, 2, GOLD);
  }
  R(g, x0 - 1, y0 - 1, w + 2, h + 2, INK); R(g, x0, y0, w, h, '#3d4a6e'); R(g, x0, y0, w, 2, '#8fa2cc'); R(g, x0, y0, 2, h, '#6e7fa6'); R(g, x0 + w - 2, y0 + 2, 2, h - 2, '#2b3552'); R(g, x0, y0 + h - 2, w, 2, '#2b3552');
  R(g, x0 + 3, y0 + 3, w - 6, h - 6, INK); R(g, x0 + 4, y0 + 4, w - 8, h - 8, lit > 0.5 ? '#16305e' : '#101a30');
  dith(g, x0 + 4, y0 + 4, w - 8, h - 8, lit > 0.5 ? '#16305e' : '#101a30', lit > 0.5 ? '#1d4a8c' : '#16224a', 2);
  // traces
  R(g, x0 + 6, y0 + 8, 10, 1, '#2f7ad0'); R(g, x0 + w - 18, y0 + h - 10, 12, 1, '#2f7ad0'); R(g, x0 + 6, y0 + h - 12, 1, 6, '#2f7ad0');
  const pulse = 0.65 + 0.35 * Math.sin(t * 5);
  txt(g, 'CPU', x0 + w / 2 + 1, y0 + 21, 16, lit > 0.5 ? mixc('#b08820', GOLD, pulse) : '#6e5a22', 'center', INK);
  R(g, x0 + 5, y0 + 5, 3, 3, INK); R(g, x0 + 6, y0 + 6, 1, 1, Math.floor(t * 3) % 2 && lit > 0.5 ? '#7bff9a' : '#2e7a4a');
  if (lit > 0.5) glow(g, x0 + w / 2, y0 + h / 2, 44, '#5ec9e8', 0.28 * (0.7 + 0.3 * pulse));
}
/* cable from chip to the cache pond with moving light pulses; pts as [x,y] list */
function cable(g, pts, t, pulses, col = '#5ec9e8') {
  for (let i = 0; i < pts.length - 1; i++) { line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 4, INK); }
  for (let i = 0; i < pts.length - 1; i++) { line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2, '#3d4a6e'); }
  let total = 0; const segs = []; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(d); total += d; }
  const at = (u) => { let d = u * total; for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const k = d / segs[i]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d -= segs[i]; } return pts[pts.length - 1]; };
  pulses.forEach((u) => { const [x, y] = at(clamp(u)); if (u >= 0 && u <= 1) { R(g, x - 2, y - 2, 4, 4, '#ffffff'); glow(g, x, y, 6, col, 0.9); } });
}
/* capacity gauge: n cells, filled f (0..1) */
function gauge(g, x, y, n, f, t) {
  const w = n * 7 + 3;
  R(g, x - 1, y - 1, w + 2, 11, INK); R(g, x, y, w, 9, '#2b3552'); R(g, x, y, w, 1, '#6e7fa6');
  for (let i = 0; i < n; i++) {
    const on = f * n > i + 0.5; R(g, x + 2 + i * 7, y + 2, 5, 5, on ? WATER.l : '#141a2b'); if (on) R(g, x + 2 + i * 7, y + 2, 5, 1, WATER.hi);
  }
}

/* ---------------- world 1 ---------------- */
const W1CAM = (t) => t * 1.2;
const W1X = (t) => kf(t, [[0, 300], [1.0, 232], [99, 232]], EA.io);
const W1HERO = (t) => {
  const x = W1X(t), v = Math.abs(W1X(t + 0.04) - W1X(t - 0.04)) / 0.08;
  return { x, mv: v > 8 ? 1 : 0, ph: x / 8, dir: -1 };
};
function drawW1(t) {
  const cam = W1CAM(t);
  farDesert(t, {
    sky: SKY_DUSK, cam, stars: 0.8, seed: 3, sun: [196, 266, 25],
    mtn: { c: '#3a2158', hi: '#5a3678', peaks: [[30, 46, 30], [92, 38, 20], [168, 52, 26], [250, 40, 18], [310, 48, 28]] },
    dunes: [
      { base: 262, amp: 14, freq: 0.021, shift: 0.4, c: '#6a2f66', hi: '#8a4a7a', k: 0.2 },
      { base: 270, amp: 12, freq: 0.027, shift: 2.4, c: '#b5485a', hi: '#e8705a', k: 0.3 },
    ],
    camels: true, birds: 2,
  });
  const g = L.m;
  const SANDD = { hi: '#ffe6b0', l: '#f2b872', m: '#d98f55', d: '#b56a45', dd: '#8a4a3a', k: '#6a3a30' };
  lay(g, cam, 1, (g) => {
    groundMid(g, t, cam, SANDD);
    // sunset rays on the sand
    for (let i = 0; i < 5; i++) R(g, 150 + i * 6, YH + 3 + i * 5, 40 - i * 6, 1, 'rgba(255,214,150,.35)');
    // the oasis: pond, palms, rock for the CPU
    cpuRock(g, t, { lit: t >= T.pc - 0.05 ? 1 : 0 });
    palm(g, 98, 324, 76, t, 0.3, 1);
    pond(g, 142, 322, 46, 9, t, { rim: '#ffd9a0' });
    tuft(g, 190, 326, t, 4); tuft(g, 96, 330, t, 6); tuft(g, 112, 331, t, 7);
    palm(g, 192, 326, 58, t, 1.9, 0.82);
    cactus(g, 258, 338, 34, t);
    // glowing hint above the hidden oasis (before it is revealed)
    const rev = pr(t, T.hace1 - 0.05, 0.9);
    const hint = pr(t, T.oasis1 - 0.1, 0.5) * (1 - rev);
    if (hint > 0) for (let i = 0; i < 5; i++) { const hx = 112 + i * 16; g.save(); g.globalAlpha = hint * (0.35 + 0.25 * Math.sin(t * 5 + i)); R(g, hx, 250 + Math.sin(t * 2 + i) * 2, 3, 62, '#ffe6b0'); g.restore(); sparkle(g, hx + 1, 262 + (i % 2) * 14, t, T.oasis1 + i * 0.1 + Math.floor((t - T.oasis1) / 0.9) * 0.9, '#fff'); }
    // sign and gauge on the pond
    const sp = pr(t, T.cache1 - 0.15, 0.5);
    if (sp > 0) { const sy = lerp(120, 284, EA.bounce(sp)); sign(g, 142, sy, 'CACHÉ', 8, t, { sway: 1, stick: 304 - sy > 0 ? Math.max(8, 322 - sy - 17) : 8 }); }
    if (t > T.memoria - 0.1) { const gp = pr(t, T.memoria - 0.1, 0.8); gauge(g, 124, 264, 5, EA.out(gp) * 0.8, t); }
    // hiding dune (lowers at "que hace todo mas rapido")
    const e = EA.io(rev);
    if (e < 1) for (let x = 74; x <= 216; x++) { const hd = Math.max(0, 1 - Math.pow((x - 145) / 71, 2)); const top = Math.round(344 - 52 * hd * (1 - e)); R(g, x, top, 1, 350 - top, SANDD.l); R(g, x, top, 1, 1, SANDD.hi); if (hd > 0.25) R(g, x, top + 9 + (x % 3), 1, 1, SANDD.m); }
    // cable CPU -> cache, with pulses at "rapido"
    const cb = [[75, 290], [86, 290], [86, 322], [97, 322]];
    const flow = [];
    if (t > T.rapido1 - 0.05 && t < T.rapido1 + 1.2) for (let i = 0; i < 3; i++) flow.push(((t - T.rapido1 + 0.05) * 1.6 - i * 0.28));
    if (t > T.lado - 0.1) for (let i = 0; i < 3; i++) flow.push((((t - T.lado) * 1.1 + i / 3) % 1));
    if (t > T.llama - 0.4) cable(g, cb, t, flow);
    // data zips pond -> cpu at "rapido"
    // narrator
    const hero = W1HERO(t);
    let fa = null, ba = null, mood = 'n', look = 0;
    if (t >= 1.0 && t < T.oasis1 - 0.2) { fa = 100; look = -1; }
    if (t >= T.oasis1 - 0.1 && t < T.hace1) { fa = 120; mood = 's'; look = -1; }
    if (t >= T.hace1 && t < T.llama) { mood = 'h'; fa = 150; }
    if (t >= T.llama - 0.2 && t < T.pequena - 0.1) { fa = 95; look = -1; }
    if (t >= T.pequena - 0.1 && t < T.lado) { fa = 60; mood = 't'; }
    if (t >= T.lado - 0.1) { fa = 100; look = -1; }
    chris(g, { x: hero.x, y: FY, dir: hero.dir, t, ph: hero.ph, mv: hero.mv, talk: mouth(t), mood, fa, ba, look, bs: 0.7 });
  });
  lay(L.u, cam, 1, (g) => {
    const hero = W1HERO(t);
    bubble(g, hero.x + 2, FY - 84, '!', t, T.oasis1, '#2e9a52', 1.0);
    bubble(g, hero.x + 2, FY - 84, '?', t, T.escondido, '#e04f4f', 0.9);
  });
  fgDress(t, cam, { fg: '#2a1530', fgHi: '#4a2d5a', dust: '#ffd9a0' });
  return [W1HERO(t).x - cam, FY];
}
