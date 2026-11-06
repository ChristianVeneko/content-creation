/* scenarios-h.js: biome worlds (themed outdoor / festive worlds so any topic can be told somewhere else than a lab): christmas village,
 * desert, beach, mars, volcano, arctic, jungle, western town, haunted park and ancient temple. Every world is four layers (far sky and
 * horizon, back scenery, mid ground and street dressing, fore silhouettes) with continuous motion driven by t (snow, waves, shimmer,
 * embers, aurora, birds, mist, fog, torches), and 3-4 props whose draw reads the beat state (S.fill / S.open / S.lit / S.ev.*).
 * Colours are master ramps (M.x) only, so every pixel style remaps them. Action stays in the 16-72 % band; floor.js dresses the lower
 * third; ambient.js adds its time-of-day life. Helpers local to this file are prefixed bx. */
'use strict';

/* ---------------- local helpers ---------------- */
const BXSAND = [M.sand[1], M.sand[2], M.sand[3], M.sand[4], M.sand[4]]; // bright sand ground ramp (body is sand[2], not the orange-mapped sand[1])
const bxK = () => (typeof ambK === 'function' ? ambK() : 1); // ambient intensity from the payload (calm | normal | lively)
/* stepped cone / mountain: lit left face, shaded right edge, optional snow cap (fraction of height) drawn with capRamp */
function bxCone(g, cx, top, base, hw, ramp, cap, capRamp, st = 3, tw = 0, from = top) {
  for (let y = from; y < base; y += st) {
    const k = (y - top) / (base - top), w = Math.max(2, tw + (hw - tw) * k), sn = cap && k < cap + (hs(y * 0.7) - 0.5) * 0.06, e = Math.max(2, w * 0.25);
    R(g, cx - w, y, w * 2, st, sn ? capRamp[2] : ramp[1]); R(g, cx - w, y, w, st, sn ? capRamp[3] : ramp[2]); R(g, cx + w - e, y, e, st, sn ? capRamp[1] : ramp[0]);
  }
}
/* flat-topped mesa with horizontal strata bands */
function bxMesa(g, x, base, w, h, ramp) {
  for (let y = 0; y < h; y += 3) { const k = y / h, ins = k < 0.18 ? (0.18 - k) * 26 : 0, c = Math.floor(y / 9) % 2 ? ramp[1] : ramp[2]; R(g, x + ins, base - h + y, w - ins * 2, 3, c); R(g, x + w - ins - 5, base - h + y, 5, 3, ramp[0]); }
  R(g, x + 3, base - h, w - 6, 2, ramp[3]);
}
/* dune / ridge silhouette: lit crest, shaded lee side. ramp = [shade, body, _, crest] */
function bxDunes(g, y, ramp, seed, amp, sp = 2) {
  let prev = null;
  for (let x = -40; x < 330; x += sp) {
    const h = amp * (0.55 + 0.3 * Math.sin(x * 0.022 + seed) + 0.25 * Math.sin(x * 0.047 + seed * 2));
    R(g, x, y - h, sp, h + 260, ramp[1]); R(g, x, y - h, sp, 2, ramp[3]);
    if (prev != null && h < prev) R(g, x, y - h + 2, sp, Math.min(14, (prev - h) * 9 + 3), ramp[0]);
    prev = h;
  }
}
/* falling snow: n flakes in layers (size and speed by index) with a lateral sway */
function bxSnow(g, t, n, seed, spd = 1, y0 = -10) {
  for (let i = 0; i < n; i++) {
    const big = i % 5 === 0, v = (big ? 34 : 15 + hs(i + seed) * 14) * spd, ww = W + 40;
    const x = ((hs(i * 3 + seed) * ww + Math.sin(t * 0.9 + i * 1.3) * 7 - t * 4 * spd) % ww + ww) % ww - 10;
    const y = (hs(i * 7 + seed) * 520 + t * v) % 500 + y0;
    R(g, x, y, big ? 2 : 1, big ? 2 : 1, M.white[3]);
  }
}
/* heat / haze shimmer: thin pale lines that wobble sideways between y0 and y1 */
function bxShimmer(g, t, y0, y1, c, a = 0.22) {
  alpha(g, a, () => { for (let y = y0; y < y1; y += 5) { const o = Math.sin(t * 2.2 + y * 0.45) * 4; for (let x = -20 + (y * 7) % 40; x < W + 20; x += 46) R(g, x + o, y, 10 + hs(y + x) * 22, 1, c); } });
}
/* rows of fog/mist banks drifting sideways (dithered, low alpha) */
function bxMist(g, t, y, h, c, a = 0.3, seed = 1, sp = 5) {
  alpha(g, a, () => { for (let i = 0; i < 4; i++) { const x = ((t * sp * (0.6 + hs(i + seed)) + hs(i * 3 + seed) * 360) % 400) - 100, yy = y + i * h * 0.45 + Math.sin(t * 0.4 + i) * 3; dith(g, x, yy, 150 + hs(i + seed) * 60, h, c, M.white[1], 1); R(g, x + 20, yy + 3, 90, h * 0.5, c); } });
}
/* pine tree for the christmas village: tiers, snow on them and blinking lights. lit 0..1 = share of bulbs on */
function bxPine(g, x, base, h, ramp, t, o = {}) {
  R(g, x - 3, base - h * 0.1, 6, h * 0.1, M.wood[1]); R(g, x - 3, base - h * 0.1, 2, h * 0.1, M.wood[2]);
  let n = 0;
  for (let i = 0; i < 5; i++) {
    const th = h * 0.26, bot = base - h * 0.08 - i * h * 0.165, top = bot - th, hw = h * (0.155 - i * 0.026);
    for (let r = 0; r < th; r += 3) { const w = Math.max(2, hw * (0.12 + 0.88 * r / th)); R(g, x - w, top + r, w * 2, 3, ramp[1]); R(g, x - w, top + r, w * 0.65, 3, ramp[2]); R(g, x + w - 3, top + r, 3, 3, ramp[0]); }
    if (o.snow) { R(g, x - hw * 0.15, top, hw * 0.3, 3, M.white[3]); dith(g, x - hw, bot - 4, hw * 2, 4, M.white[3], ramp[1], 1); R(g, x - hw * 0.55, bot - 7, 5, 3, M.white[3]); R(g, x + hw * 0.4, bot - 9, 6, 3, M.white[2]); }
    if (o.lights) for (let j = 0; j < 4; j++, n++) {
      const bx = x + (j - 1.5) * hw * 0.5 + (j % 2 ? 2 : -2), by = bot - 3 - (j % 2) * 5 - (j === 1 || j === 2 ? 0 : 3) + 2, on = n / 20 < o.lights && Math.floor(t * 3 + n * 1.7) % 4 !== 0, rp = M[['red', 'yellow', 'blue', 'pink', 'teal'][n % 5]];
      R(g, bx - 1, by - 1, 4, 4, INK); R(g, bx, by, 2, 2, on ? rp[3] : M.steel[1]); if (on) glow(g, bx + 1, by + 1, 7, rp[3], 0.5);
    }
  }
  return base - h * 0.08 - 4 * h * 0.165 - h * 0.26;
}
/* wrapped gift box: ramp body, ribbon ramp, optional bow, lid offset (open pops the lid) */
function bxGift(g, x, y, w, h, body, rib, lid = 0) {
  R(g, x - 1, y - 1, w + 2, h + 2, INK); R(g, x, y, w, h, body[2]); R(g, x, y, w, 2, body[3]); R(g, x, y, 2, h, body[3]); R(g, x + w - 2, y, 2, h, body[1]);
  R(g, x + w / 2 - 2, y, 4, h, rib[3]); R(g, x, y + h * 0.35, w, 3, rib[2]);
  R(g, x - 2, y - 4 - lid, w + 4, 5, INK); R(g, x - 1, y - 3 - lid, w + 2, 3, body[3]); R(g, x + w / 2 - 2, y - 3 - lid, 4, 3, rib[3]);
  R(g, x + w / 2 - 5, y - 8 - lid, 4, 4, rib[3]); R(g, x + w / 2 + 1, y - 8 - lid, 4, 4, rib[3]);
}
/* saguaro cactus: trunk with two arms, shaded left-lit, optional flowers */
function bxCactus(g, x, base, h, ramp = M.green, flowers = 0, t = 0) {
  const tw = Math.max(6, h * 0.14), top = base - h;
  const part = (px, py, w, hh) => { R(g, px - 1, py - 1, w + 2, hh + 2, INK); R(g, px, py, w, hh, ramp[2]); R(g, px, py, 2, hh, ramp[3]); R(g, px + w - 2, py, 2, hh, ramp[1]); for (let yy = py + 3; yy < py + hh - 2; yy += 5) R(g, px + w * 0.45, yy, 1, 2, ramp[4]); };
  part(x - tw / 2, top + 2, tw, h - 2); R(g, x - tw / 2 + 1, top, tw - 2, 3, ramp[3]);
  const aw = tw * 0.7, ay = top + h * 0.38, by = top + h * 0.2;
  part(x - tw / 2 - aw - 4, ay, aw, 4); part(x - tw / 2 - aw - 4, by + 2, aw, ay - by + 2); part(x + tw / 2 + 4, by + 8, aw, 4); part(x + tw / 2 + 4, top + h * 0.5 - h * 0.18 + 6, aw, h * 0.2);
  part(x - tw / 2 - aw, ay, aw + 4, aw); part(x + tw / 2 - 2, by + 8, aw + 6, aw);
  const spots = [[x, top - 2], [x - tw / 2 - aw / 2 - 4, by], [x + tw / 2 + aw / 2 + 4, top + h * 0.5 - h * 0.18 + 4]];
  for (let i = 0; i < Math.min(3, Math.round(flowers * 3)); i++) { const [fx, fy] = spots[i]; R(g, fx - 3, fy - 2, 7, 5, M.pink[2]); R(g, fx - 1, fy - 4, 3, 9, M.pink[3]); R(g, fx - 1, fy - 1, 3, 3, M.yellow[3]); }
}
/* palm tree: curved ringed trunk with a crown of swaying drooping fronds; returns crown {x, y} */
function bxPalm(g, x, base, h, lean, t, seed = 0) {
  const n = 12; let tx = x, ty = base;
  for (let j = 0; j < n; j++) {
    const k = j / n, nx = x + lean * k * k * h * 0.3 + Math.sin(t * 0.8 + seed) * k * 1.5, ny = base - (j + 1) * h * 0.7 / n, w = 6 - k * 2;
    R(g, nx - w / 2 - 1, ny, w + 2, h * 0.7 / n + 1, INK); R(g, nx - w / 2, ny, w, h * 0.7 / n + 1, j % 2 ? M.wood[2] : M.wood[1]); R(g, nx - w / 2, ny, 1, h * 0.7 / n + 1, M.wood[3]);
    tx = nx; ty = ny;
  }
  for (let i = 0; i < 7; i++) {
    const dir = i < 4 ? -1 : 1, spread = (i % 4) * 0.42 + 0.25, len = h * (0.36 - (i % 4) * 0.03), sw = Math.sin(t * 1.4 + i * 1.1 + seed) * 1.8;
    for (let s = 0; s < 14; s++) {
      const k = s / 13, fx = tx + dir * Math.cos(spread * (1 - k * 0.25)) * len * k, fy = ty - Math.sin(spread) * len * k * (1 - k) * 1.9 + k * k * len * 0.45 + sw * k, th = 7 - k * 4;
      R(g, fx - 3, fy - th / 2 - 1, 7, th + 2, INK); R(g, fx - 3, fy - th / 2, 7, th, s % 2 ? M.grass[2] : M.grass[1]); R(g, fx - 3, fy - th / 2, 7, 2, M.grass[3]);
      if (s % 2) R(g, fx, fy + th / 2, 2, 4 + (1 - k) * 3, M.grass[2]);
    }
  }
  return { x: tx, y: ty };
}
/* dithered flame with a flicker: x,y = base centre, s = size multiplier */
function bxFlame(g, t, x, y, s = 1, seed = 0) {
  const f = Math.floor(t * 12 + seed * 3), j = hs(f + seed) > 0.5 ? 1 : 0, Q = (n) => Math.round(n * s);
  R(g, x - Q(4), y - Q(7) - j, Q(8), Q(8) + j, M.fire[1]); R(g, x - Q(3), y - Q(11) - j, Q(6), Q(11) + j, M.fire[2]); R(g, x - Q(2), y - Q(8), Q(4), Q(8), M.fire[3]); R(g, x - 1, y - Q(4), 2, Q(4), M.fire[4]);
  if (hs(f + 5) > 0.5) R(g, x + Q(1), y - Q(14) - j, 2, Q(3), M.fire[3]);
  glow(g, x, y - Q(5), Q(16) + j * 2, M.orange[3], 0.4);
}
/* bat: two flapping wing pairs around a small body */
function bxBat(g, x, y, t, k = 1, c = M.dark) {
  const fl = Math.floor(t * 9 + x * 0.3) % 2, Q = (n) => Math.round(n * k);
  R(g, x - Q(1), y, Q(2), Q(3), c[1]); R(g, x - Q(1), y - Q(1), 1, Q(1), c[1]); R(g, x + Q(1), y - Q(1), 1, Q(1), c[1]);
  for (const d of [-1, 1]) { R(g, x + d * Q(2) - (d < 0 ? Q(3) : 0), y + (fl ? Q(-2) : 0), Q(3), Q(1), c[1]); R(g, x + d * Q(5) - (d < 0 ? Q(3) : 0), y + (fl ? Q(-3) : Q(1)), Q(3), Q(1), c[1]); R(g, x + d * Q(7) - (d < 0 ? Q(2) : 0), y + (fl ? Q(-1) : Q(2)), Q(2), Q(1), c[1]); }
}
/* flying bird (gull / macaw): body plus two flapping wing segments. ramp tints wings, belly uses ramp[3] */
function bxBird(g, x, y, t, ramp = M.white, k = 1, seed = 0) {
  const fl = Math.floor(t * 5 + seed) % 4, up = fl === 0 || fl === 1 ? -1 : 1, Q = (n) => Math.round(n * k);
  R(g, x - Q(2), y, Q(5), Q(2), ramp[3]);
  for (const d of [-1, 1]) { R(g, x + (d < 0 ? -Q(6) : Q(3)), y + up * Q(1), Q(4), Q(1) + 1, ramp[2]); R(g, x + (d < 0 ? -Q(9) : Q(6)), y + up * Q(2) - (up < 0 ? 1 : 0), Q(4), Q(1) + 1, ramp[1]); }
}
/* tumbleweed rolling along the ground */
function bxTumble(g, t, y, sp = 24, off = 0, r = 6) {
  const x = ((t * sp + off) % (W + 80)) - 40, yy = y - Math.abs(Math.sin(t * 3.2 + off)) * 7;
  alpha(g, 0.3, () => R(g, x - r, y + 1, r * 2, 2, INK));
  disc(g, x, yy - r, r, M.wood[1]); for (let k = 0; k < 8; k++) { const a = t * 4.5 + k * 0.8; R(g, x + Math.cos(a) * r * 0.9, yy - r + Math.sin(a) * r * 0.9, 2, 2, M.wood[3]); R(g, x + Math.cos(a + 0.4) * r * 0.45, yy - r + Math.sin(a + 0.4) * r * 0.45, 2, 2, M.wood[2]); }
}
/* sun with slow rotating rays */
function bxSunRays(g, t, x, y, r, c, n = 12) {
  alpha(g, 0.5, () => { for (let i = 0; i < n; i++) { const a = t * 0.25 + i * Math.PI * 2 / n, r0 = r + 5, r1 = r + 11 + (i % 2) * 6; line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, 2, c); } });
}
/* ambient intensity (payload hf.ambient calm | normal | lively) scales this drifting-particle layer, so every biome answers to it */
function bxAmb(g, t, id) { const k = bxK(); dust(g, t, Math.round(16 * k), seedOf(id || 'x'), M.white[3], 9 * k, 90, 330); }
/* a lantern/street lamp glow on the ground: warm spill */
function bxSpill(g, x, y, w, c, a = 0.3, t = 0) { alpha(g, a * (0.85 + 0.15 * Math.sin(t * 7 + x)), () => { dith(g, x - w / 2, y, w, 8, c, M.white[1], 1); R(g, x - w / 3, y + 1, w * 2 / 3, 4, c); }); }

/* ======================================================================================================== christmas village */
defScenario({
  id: 'christmas-village', name: 'Christmas village', about: 'Snowy night village: a big pine with blinking lights, a log cabin with warm windows and smoking chimney, gift boxes, a snowman, falling snow and string lights.',
  topics: ['christmas', 'holidays', 'winter', 'gifts', 'snow', 'celebration', 'family traditions', 'generosity', 'new year', 'december', 'cold season'], avoid: ['heat', 'desert'],
  keywords: ['christmas', 'xmas', 'navidad', 'navideno', 'navidena', 'nieve', 'snow', 'winter', 'invierno', 'regalo', 'regalos', 'gift', 'gifts', 'present', 'santa', 'papa noel', 'snowman', 'muneco de nieve', 'pino', 'pine', 'village', 'pueblo', 'cabana', 'cabin', 'diciembre', 'december', 'holiday', 'fiestas'],
  time: 'night', floor: ['sand', 'steel', ['rock', 'bush']], __amb: true, ambient: ['snow', 'chimney', 'lights'],
  far(g, t, c) {
    skyFill(g, c, -20, 290); stars(g, t, 34, 8, 170); sunMoon(g, c, 138, 128, 15);
    for (const [x, y, s] of [[96, 118, 1], [186, 92, 1], [232, 150, 1]]) { const k = Math.floor(t * 2 + x) % 3; R(g, x - 3, y, 7, 1, M.white[4]); R(g, x, y - 3, 1, 7, M.white[4]); if (k === 0) R(g, x - 1, y - 1, 3, 3, M.white[4]); }
    bxCone(g, 70, 150, 290, 80, M.steel, 0.3, M.white, 3); bxCone(g, 215, 130, 290, 90, M.steel, 0.32, M.white, 3);
    hills(g, 290, [M.steel[0], M.steel[1], M.steel[3]], 3, 20);
  },
  back(g, t) {
    hills(g, 306, [M.steel[0], M.blue[1], M.white[1]], 7, 14);
    for (const [x, h] of [[8, 64], [40, 52], [76, 70], [100, 48], [236, 60], [262, 72], [208, 50]]) bxPine(g, x, 308, h, M.green, t, { snow: true });
    for (const [x, wc] of [[128, M.yellow], [168, M.orange]]) { R(g, x - 1, 268, 30, 36, INK); R(g, x, 270, 28, 34, M.wood[1]); R(g, x - 3, 262, 34, 10, M.brick[1]); R(g, x - 3, 262, 34, 3, M.white[3]); R(g, x + 7, 278, 7, 8, hs(x + Math.floor(t * 0.5)) > 0.2 ? wc[3] : wc[1]); R(g, x + 18, 278, 7, 8, wc[3]); puffs(g, x + 22, 260, t, hs(x), M.white[2], 5, 30, 0.35); }
    bxSnow(g, t, 26, 4, 0.6);
  },
  mid(g, t, c) {
    ground(g, 318, 270, [M.steel[1], M.steel[3], M.white[2], M.white[3], M.white[4]], { k: 1, specks: 0 });
    for (let x = -10; x < 280; x += 11) { R(g, x, 321 + (x * 7) % 5, 6, 2, M.white[4]); }
    R(g, -30, 336, 360, 4, M.steel[3]); dith(g, -30, 340, 360, 6, M.steel[3], M.white[2], 1);
    /* string lights between two poles, bulbs blink in a chase */
    for (const px of [4, 266]) { R(g, px - 1, 80, 3, 246, M.wood[1]); R(g, px - 1, 80, 1, 246, M.wood[2]); }
    for (let i = 0; i <= 24; i++) { const x = 4 + i * 262 / 24, y = 92 + Math.sin(i / 24 * Math.PI) * 18; R(g, x, y, 11, 1, M.dark[1]); if (i % 2 === 0) { const on = Math.floor(t * 2.5 + i * 0.5) % 3 !== 0, rp = M[['red', 'yellow', 'green', 'blue', 'pink'][i % 5]]; R(g, x + 3, y + 1, 4, 5, on ? rp[3] : rp[0]); if (on) glow(g, x + 5, y + 4, 8, rp[3], 0.55); } }
  },
  props: {
    tree: { x: 8, y: 104, w: 74, h: 232, about: 'big christmas pine with lights (fill lights the bulbs, light crowns it with a star)', fills: true,
      draw(g, t, S) { const top = bxPine(g, 45, 334, 226, M.green, t, { snow: true, lights: Math.max(0.35, S.fill) }); const on = S.lit > 0.05 || S.ev.pulse >= 0; const p = 1 + Math.round(Math.sin(t * 6) * (on ? 1 : 0)); R(g, 42, top - 2, 7, 3, M.gold[3]); R(g, 44, top - 9 - p, 3, 18 + p * 2, M.gold[3]); R(g, 39, top - 3, 13, 3, M.gold[3]); R(g, 44, top - 3, 3, 3, M.yellow[4]); glow(g, 45, top - 2, on ? 30 : 16, M.yellow[3], on ? 0.7 : 0.35); } },
    gifts: { x: 86, y: 282, w: 54, h: 54, about: 'pile of wrapped gift boxes (fill adds boxes, open pops the top lid)', fills: true, opens: true,
      draw(g, t, S) { const n = Math.max(2, Math.ceil(S.fill * 4)), pop = Math.round(S.open * 9); shade(g, 86, 331, 54, 4, 0.35);
        bxGift(g, 88, 316, 22, 18, M.red, M.yellow); if (n >= 2) bxGift(g, 113, 320, 24, 14, M.green, M.white); if (n >= 3) bxGift(g, 96, 300, 18, 15, M.blue, M.pink, S.open > 0.3 ? pop : 0); if (n >= 4) bxGift(g, 118, 305, 16, 14, M.purple, M.gold);
        if (S.lit > 0.05 || S.open > 0.3) for (let i = 0; i < 3; i++) sparkle(g, 92 + i * 14, 298 - (i % 2) * 8, t + i * 0.4, 0, M.yellow[4]); } },
    snowman: { x: 144, y: 268, w: 44, h: 68, about: 'snowman with scarf (fill piles snow at its feet, open waves an arm, light twinkles)', fills: true, opens: true,
      draw(g, t, S) { const b = Math.round(Math.sin(t * 2) * 0.6), cx = 166, drift = Math.round(S.fill * 7); shade(g, 146, 331, 40, 4, 0.3);
        ball(g, cx, 322, 13, M.white); ball(g, cx, 304 + b, 10, M.white); ball(g, cx, 290 + b, 7, M.white);
        R(g, cx - 9, 295 + b, 18, 4, S.tone ? M.green[2] : M.red[2]); R(g, cx + 5, 297 + b, 4, 10, S.tone ? M.green[2] : M.red[2]); R(g, cx - 3, 285 + b, 2, 2, INK); R(g, cx + 2, 285 + b, 2, 2, INK); R(g, cx, 288 + b, 7, 2, M.orange[2]); for (let i = 0; i < 3; i++) R(g, cx - 1, 303 + i * 7 + b, 3, 3, INK);
        R(g, cx - 8, 277 + b, 16, 5, INK); R(g, cx - 5, 268 + b, 10, 10, INK); R(g, cx - 5, 276 + b, 10, 2, M.red[2]);
        const arm = S.open > 0.2 ? Math.sin(t * 9) * 3 - 6 : 0; line(g, cx - 9, 303 + b, cx - 22, 298 + b + (S.open > 0.2 ? arm : 4), 2, M.wood[1]); line(g, cx + 9, 303 + b, cx + 22, 298 + b - (S.open > 0.2 ? arm : -4), 2, M.wood[1]);
        if (drift) { disc(g, cx - 16, 334, 3 + drift / 2, M.white[3]); disc(g, cx + 14, 335, 3 + drift / 2, M.white[3]); }
        if (S.lit > 0.05) { sparkle(g, cx - 14, 276, t, 0, M.white[4]); sparkle(g, cx + 15, 284, t + 0.5, 0, M.yellow[4]); } } },
    cabin: { x: 192, y: 196, w: 76, h: 140, about: 'log cabin: warm windows (light), a door that opens, smoking chimney', opens: true,
      draw(g, t, S) { const lit = Math.max(0.35, S.lit), fl = 0.85 + 0.15 * Math.sin(t * 9);
        R(g, 195, 262, 70, 73, INK); R(g, 196, 263, 68, 71, M.wood[1]); for (let y = 266; y < 334; y += 7) { R(g, 196, y, 68, 1, M.wood[0]); R(g, 196, y + 1, 68, 1, M.wood[2]); R(g, 196 + (y % 14 ? 6 : 14), y, 2, 7, M.wood[0]); }
        for (let r = 0; r < 52; r += 3) { const w = 6 + 40 * r / 52; R(g, 230 - w - 2, 214 + r, w * 2 + 4, 3, INK); R(g, 230 - w, 214 + r, w * 2, 3, M.brick[2]); R(g, 230 - w, 214 + r, 6, 3, M.brick[3]); if (r < 10) R(g, 230 - w, 214 + r, w * 2, 3, M.white[3]); else { R(g, 230 - w, 214 + r, 7, 3, M.white[3]); R(g, 230 + w - 7, 214 + r, 7, 3, M.white[2]); } }
        R(g, 192, 262, 76, 4, M.white[3]); dith(g, 192, 266, 76, 3, M.white[3], M.wood[1], 1);
        R(g, 243, 200, 12, 30, INK); R(g, 244, 201, 10, 28, M.brick[1]); R(g, 243, 198, 12, 4, M.white[3]); puffs(g, 249, 198, t * (1 + S.lit), 0.2, M.white[2], 6, 46, 0.4);
        for (const x of [201, 241]) { R(g, x - 2, 281, 22, 20, INK); R(g, x - 1, 282, 20, 18, M.wood[2]); R(g, x, 283, 18, 16, lit > 0.5 ? M.yellow[3] : M.orange[2]); R(g, x + 8, 283, 2, 16, M.wood[1]); R(g, x, 290, 18, 2, M.wood[1]); if (lit > 0.5) glow(g, x + 9, 291, 22, M.yellow[3], 0.5 * fl); }
        R(g, 221, 281, 22, 54, INK); R(g, 222, 282, 20, 53, M.wood[2]);
        if (S.open > 0.05) { R(g, 223, 283, 18, 52, M.yellow[3]); bxSpill(g, 232, 335, 50, M.yellow[3], 0.45, t); const dw = Math.round(14 * S.open); R(g, 223, 283, 18 - dw, 52, M.wood[3]); R(g, 223 + 18 - dw, 283, dw, 52, M.wood[3]); } else { R(g, 223, 283, 18, 52, M.wood[3]); R(g, 224, 284, 7, 20, M.wood[2]); R(g, 233, 284, 7, 20, M.wood[2]); R(g, 237, 308, 2, 2, M.yellow[3]); }
        R(g, 220, 276, 24, 5, M.green[1]); for (let i = 0; i < 5; i++) { const on = Math.floor(t * 3 + i) % 2; R(g, 222 + i * 5, 279, 2, 3, on ? M.red[3] : M.yellow[3]); } } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    for (const [x, r] of [[-6, 30], [20, 20], [262, 28], [290, 22]]) { disc(g, x, 476, r, M.steel[0]); R(g, x - r * 0.6, 476 - r + 2, r * 1.1, 3, M.white[2]); }
    bxSnow(g, t, 22, 12, 1.6);
  },
});

/* ======================================================================================================== desert */
defScenario({
  id: 'desert', name: 'Desert', about: 'Hot desert day: rolling dunes, mesas, a blazing sun with heat shimmer, a giant cactus, an oasis with a palm, sun-bleached ruins and a tumbleweed.',
  topics: ['desert', 'heat', 'drought', 'survival', 'thirst', 'water scarcity', 'travel', 'nomads', 'sun', 'sand', 'ancient ruins'], avoid: ['winter', 'cold'],
  keywords: ['desert', 'desierto', 'dune', 'dunas', 'duna', 'sand', 'arena', 'cactus', 'cacto', 'oasis', 'sahara', 'heat', 'calor', 'sun', 'sol', 'camel', 'camello', 'drought', 'sequia', 'sed', 'thirst', 'tumbleweed', 'mirage', 'espejismo', 'arido', 'arid', 'ruinas', 'ruins'],
  time: 'day', floor: ['sand', 'sand', ['rock', 'bush']], __amb: true, ambient: ['shimmer', 'tumbleweed', 'vultures'],
  far(g, t, c) {
    skyFill(g, c, -20, 290); alpha(g, 0.4, () => bands(g, -40, 170, 290, W + 120, [M.yellow[3], M.sand[4], M.orange[4]], 8));
    bxSunRays(g, t, 196, 134, 22, M.yellow[3]); sunMoon(g, c, 196, 134, 22); glow(g, 196, 134, 46, M.yellow[3], 0.28 + 0.06 * Math.sin(t * 1.5));
    clouds(g, t, 90, 2, M.white[3], 2, 5, 28);
    for (const [x, w, h] of [[-10, 70, 38], [92, 54, 24], [186, 100, 46]]) { bxMesa(g, x, 272, w, h, [M.brick[0], M.brick[1], M.brick[2], M.orange[2]]); }
    alpha(g, 0.35, () => R(g, -40, 250, 360, 24, M.sand[4]));
    for (let i = 0; i < 2; i++) { const a = t * 0.5 + i * 3.1, vx = 70 + i * 90 + Math.cos(a) * 24, vy = 118 + i * 16 + Math.sin(a) * 6, d = Math.cos(a) > 0 ? 1 : -1; R(g, vx - 4 * d, vy, 3, 1, INK); R(g, vx, vy + (Math.floor(t * 3 + i) % 2), 3, 1, INK); R(g, vx + 4 * d, vy, 3, 1, INK); }
  },
  back(g, t) {
    bxDunes(g, 298, [M.orange[1], M.sand[2], M.sand[3], M.sand[4]], 1.3, 30);
    R(g, 40, 252, 8, 2, M.sand[1]); for (const [x, h] of [[24, 26], [34, 18], [104, 30], [114, 14]]) { R(g, x, 296 - h, 6, h, INK); R(g, x + 1, 296 - h, 4, h, M.sand[3]); R(g, x - 1, 296 - h, 8, 3, M.sand[4]); }
    R(g, 24, 262, 22, 6, INK); R(g, 25, 263, 20, 4, M.sand[3]);
    bxShimmer(g, t, 240, 300, M.white[3]);
  },
  mid(g, t) {
    bxDunes(g, 328, [M.orange[1], M.sand[2], M.sand[3], M.sand[4]], 4.1, 22, 2);
    ground(g, 332, 270, BXSAND, { k: 1, specks: 26 });
    for (let i = 0; i < 9; i++) { const x = i * 34 - 8, y = 338 + (i * 13) % 7; R(g, x, y, 22, 1, M.sand[3]); R(g, x + 4, y + 1, 14, 1, M.sand[1]); }
    for (let r = 0; r < 12; r++) for (let x = -20 + (r * 23) % 40; x < 290; x += 40) { const y = 352 + r * 11 + Math.sin(x * 0.05 + r) * 2; R(g, x, y, 26, 1, M.sand[3]); R(g, x + 6, y + 1, 18, 1, M.sand[1]); }
    for (let i = 0; i < 7; i++) dith(g, (i * 47) % 240, 360 + (i * 37) % 100, 40, 10, M.sand[1], M.sand[2], 1);
    bxShimmer(g, t, 270, 332, M.white[3], 0.16); bxTumble(g, t, 340, 22, 30);
    alpha(g, 0.5, () => { for (let i = 0; i < 14; i++) { const x = ((t * 22 * (0.6 + hs(i)) + hs(i * 5) * 300) % 330) - 20, y = 322 + hs(i * 3) * 18; R(g, x, y, 5 + hs(i) * 6, 1, M.sand[4]); } });
  },
  props: {
    oasis: { x: 12, y: 226, w: 90, h: 110, about: 'oasis: a pond and a palm tree (fill brings the water level up, light makes it sparkle)', fills: true,
      draw(g, t, S) { const lv = 0.45 + 0.55 * S.fill, rw = 28 + lv * 18, cx = 56;
        for (let r = 0; r < 14; r += 2) { const w = rw * Math.sqrt(1 - Math.pow((r - 7) / 8, 2)); R(g, cx - w - 2, 312 + r, w * 2 + 4, 2, M.sand[1]); R(g, cx - w, 312 + r, w * 2, 2, M.water[2]); }
        for (let i = 0; i < 5; i++) { const x = cx - rw * 0.6 + ((t * 8 + i * 17) % (rw * 1.2)), y = 314 + (i * 3) % 10; R(g, x, y, 5, 1, M.water[4]); }
        if (S.lit > 0.05) for (let i = 0; i < 4; i++) sparkle(g, cx - rw * 0.5 + i * rw * 0.33, 316 + (i % 2) * 6, t + i * 0.3, 0, M.white[4]);
        bxPalm(g, 30, 322, 96, -0.6, t, 1); bxPalm(g, 80, 324, 70, 0.7, t, 4);
        for (const [x, y] of [[14, 322], [88, 324], [96, 320]]) { R(g, x, y, 6, 3, M.grass[1]); R(g, x + 1, y - 2, 2, 3, M.grass[3]); R(g, x + 4, y - 3, 2, 4, M.grass[2]); } } },
    cactus: { x: 112, y: 196, w: 48, h: 140, about: 'giant saguaro cactus (fill makes it bloom, light glints on the spines)', fills: true,
      draw(g, t, S) { shade(g, 112, 331, 48, 4, 0.3); bxCactus(g, 136, 334, 134, M.green, S.fill, t); if (S.lit > 0.05) { sparkle(g, 128, 230, t, 0, M.white[4]); sparkle(g, 142, 270, t + 0.4, 0, M.white[4]); } } },
    ruins: { x: 170, y: 166, w: 96, h: 170, about: 'sun-bleached ruins: broken columns and an arch with glyphs (light makes the glyphs glow, open slides a hidden door)', opens: true,
      draw(g, t, S) { const gl = S.lit > 0.05;
        for (const [x, h, br] of [[176, 110, 0], [246, 140, 0], [212, 70, 1]]) { R(g, x - 1, 334 - h, 16, h, INK); R(g, x, 334 - h, 14, h, M.sand[2]); R(g, x, 334 - h, 4, h, M.sand[3]); R(g, x + 10, 334 - h, 4, h, M.sand[1]); for (let y = 334 - h + 6; y < 328; y += 12) R(g, x, y, 14, 1, M.sand[0]); R(g, x - 3, 334 - h - 4, 20, 5, M.sand[3]); if (br) R(g, x + 2, 334 - h - 6, 7, 3, M.sand[1]); }
        R(g, 175, 200, 85, 12, INK); R(g, 176, 201, 83, 10, M.sand[2]); R(g, 176, 201, 83, 2, M.sand[3]); for (let i = 0; i < 6; i++) R(g, 182 + i * 12, 205, 6, 3, gl ? M.gold[3] : M.sand[1]);
        R(g, 216, 222, 28, 4, M.sand[1]); const dh = Math.round(S.open * 38); R(g, 208, 270, 28, 64, INK); R(g, 209, 271, 26, 63, M.dark[1]); if (S.open > 0.05) glow(g, 222, 310, 26, M.yellow[3], 0.5 * S.open);
        R(g, 209, 271, 26, 63 - dh, M.sand[2]); R(g, 209, 271, 26, 2, M.sand[4]); for (let i = 0; i < 3; i++) { R(g, 214 + i * 7, 278 + i * 4 - (i % 2) * 4, 4, 5, gl ? M.gold[4] : M.sand[0]); if (gl) glow(g, 216 + i * 7, 280 + i * 4, 8, M.gold[3], 0.5); }
        for (let i = 0; i < 5; i++) R(g, 178 + i * 14, 328 + (i % 2) * 2, 8, 5, M.sand[2]); } },
    heat: libProp('thermometer', 104, 238, 2, { about: 'thermometer: the mercury rises with the desert heat (fill)' }),
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    R(g, -20, 436, 54, 50, M.orange[0]); R(g, -20, 436, 54, 3, M.sand[2]); R(g, 236, 444, 70, 50, M.orange[0]); R(g, 236, 444, 70, 3, M.sand[2]);
    bxShimmer(g, t, 360, 430, M.white[3], 0.1); dust(g, t, 18, 6, M.sand[4], 12, 300, 160);
  },
});

/* ======================================================================================================== beach */
defScenario({
  id: 'beach', name: 'Beach', about: 'Sunny beach: sparkling sea with a sail boat, foamy waves, palm trees, a striped umbrella, a scuttling crab, a sandcastle and seagulls.',
  topics: ['beach', 'summer', 'vacation', 'sea', 'ocean', 'holidays', 'relaxing', 'tourism', 'waves', 'tide', 'sunscreen'], avoid: ['winter', 'office'],
  keywords: ['beach', 'playa', 'sea', 'mar', 'ocean', 'oceano', 'wave', 'ola', 'olas', 'sand', 'arena', 'palm', 'palmera', 'palmeras', 'umbrella', 'sombrilla', 'crab', 'cangrejo', 'summer', 'verano', 'vacation', 'vacaciones', 'seagull', 'gaviota', 'coast', 'costa', 'sandcastle', 'castillo de arena', 'tropical', 'sun', 'sol'],
  time: 'day', floor: ['sand', 'sand', ['rock', 'plant']], __amb: true, ambient: ['waves', 'gulls', 'sparkle'],
  far(g, t, c) {
    skyFill(g, c, -20, 262); bxSunRays(g, t, 62, 130, 20, M.yellow[3], 10); sunMoon(g, c, 62, 130, 20); glow(g, 62, 130, 40, M.yellow[3], 0.28);
    clouds(g, t, 100, 4, M.white[3], 3, 11, 30); clouds(g, t, 168, 3, M.white[2], 2, 21, 24);
    bands(g, -40, 250, 292, W + 120, [M.water[3], M.water[2], M.water[2], M.water[1]], 6);
    for (let i = 0; i < 3; i++) bxBird(g, ((t * (12 + i * 4) + i * 90) % (W + 60)) - 20, 110 + i * 22 + Math.round(Math.sin(t * 1.3 + i) * 3), t, M.white, 1, i);
  },
  back(g, t) {
    const bx = ((t * 3 + 40) % 340) - 40, b = Math.round(Math.sin(t * 1.6) * 1);
    R(g, bx, 262 + b, 14, 3, INK); R(g, bx + 1, 263 + b, 12, 2, M.wood[2]); R(g, bx + 6, 245 + b, 1, 17, INK); R(g, bx + 7, 246 + b, 8, 14, M.white[3]); R(g, bx + 1, 250 + b, 5, 10, M.white[2]);
    for (let i = 0; i < 9; i++) { const x = 90 + ((t * 20 + i * 31) % 160), k = Math.floor(t * 6 + i) % 3; if (k) R(g, x, 258 + (i % 4) * 7, 3, 1, M.white[4]); }
    for (let i = 0; i < 8; i++) { const on = Math.floor(t * 5 + i * 2.1) % 3 === 0; if (on) R(g, 46 + hs(i) * 36, 254 + i * 4, 4 + (i % 3), 1, M.white[4]); }
  },
  mid(g, t) {
    waves(g, t, 276, -40, 320, [M.water[0], M.water[2], M.water[2], M.water[4]], 24, 1.6); waves(g, t * 1.2 + 2, 292, -40, 320, [M.water[0], M.water[1], M.water[3], M.water[4]], 28, 2.2); waves(g, t * 1.4 + 5, 306, -40, 320, M.water, 20, 2.8);
    const sh = 318 + Math.round(Math.sin(t * 0.9) * 3);
    for (let x = -40; x < 330; x += 2) { const f = sh + Math.sin(x * 0.09 + t * 1.2) * 2.4; R(g, x, f - 5, 2, 5, M.water[3]); R(g, x, f, 2, 2, M.white[4]); if (Math.floor(x / 2 + t * 6) % 5 === 0) R(g, x, f + 3, 2, 1, M.white[3]); }
    ground(g, 322, 270, BXSAND, { k: 1, specks: 20 }); alpha(g, 0.4, () => R(g, -40, 322, 360, 6, M.sand[0])); for (let x = -40; x < 330; x += 2) { const f = sh + Math.sin(x * 0.09 + t * 1.2) * 2.4; R(g, x, f + 1, 2, 322 - f + 3, M.sand[1]); R(g, x, f, 2, 2, M.white[4]); }
    for (let r = 0; r < 12; r++) for (let x = -20 + (r * 23) % 40; x < 290; x += 40) { const y = 352 + r * 11 + Math.sin(x * 0.05 + r) * 2; R(g, x, y, 26, 1, M.sand[3]); R(g, x + 6, y + 1, 18, 1, M.sand[1]); }
    for (let i = 0; i < 7; i++) dith(g, (i * 47) % 240, 360 + (i * 37) % 100, 40, 10, M.sand[1], M.sand[2], 1);
  },
  props: {
    umbrella: { x: 8, y: 232, w: 82, h: 104, about: 'striped beach umbrella over a towel (open spreads the canopy, light glints)', opens: true,
      draw(g, t, S) { const k = 0.6 + 0.4 * S.open, hw = 38 * k, top = 244 + (1 - k) * 8; R(g, 47, top + 8, 4, 84, INK); R(g, 48, top + 8, 2, 84, M.wood[3]);
        for (let r = 0; r < 20; r += 2) { const w = hw * Math.sqrt(1 - Math.pow((r - 20) / 20, 2)) + 2; R(g, 49 - w - 1, top + r, w * 2 + 2, 2, INK); }
        for (let r = 0; r < 20; r += 2) { const w = hw * Math.sqrt(1 - Math.pow((r - 20) / 20, 2)) + 2; for (let s = 0; s < 6; s++) { const a = 49 - w + s * (w * 2 / 6); R(g, a, top + r, w * 2 / 6 + 1, 2, s % 2 ? M.white[3] : M.red[2]); } }
        for (let s = 0; s < 6; s++) R(g, 49 - hw + s * hw / 3, top + 18, hw / 3, 3, s % 2 ? M.white[2] : M.red[1]); R(g, 47, top - 3, 4, 4, M.gold[3]);
        R(g, 22, 322, 56, 12, INK); R(g, 23, 323, 54, 10, M.teal[2]); for (let i = 0; i < 5; i++) R(g, 23, 323 + (i % 2) * 5, 54, 2, M.yellow[3]); R(g, 23, 323, 54, 1, M.white[3]);
        if (S.lit > 0.05) { sparkle(g, 26, top + 4, t, 0, M.white[4]); sparkle(g, 70, top + 8, t + 0.5, 0, M.white[4]); } } },
    crab: { x: 98, y: 306, w: 48, h: 30, about: 'red crab scuttling on the sand (open lifts its claws, fill piles up the shells it collects)', fills: true, opens: true,
      draw(g, t, S) { const ox = Math.round(Math.sin(t * 1.1) * 9), cx = 122 + ox, st = Math.floor(t * 8) % 2, cl = S.open > 0.1 ? Math.round(Math.sin(t * 12) * 2) - 5 : 0;
        for (const d of [-1, 1]) for (let i = 0; i < 3; i++) R(g, cx + d * (6 + i * 3) - (d < 0 ? 2 : 0), 328 + (i + st) % 2, 3, 6 - ((i + st) % 2), M.red[1]);
        R(g, cx - 10, 318, 21, 11, INK); R(g, cx - 9, 319, 19, 9, M.red[2]); R(g, cx - 9, 319, 19, 2, M.red[3]); R(g, cx - 6, 316, 2, 4, INK); R(g, cx + 5, 316, 2, 4, INK); R(g, cx - 6, 314, 2, 3, M.white[4]); R(g, cx + 5, 314, 2, 3, M.white[4]);
        for (const d of [-1, 1]) { const px = cx + d * 13; R(g, px - 4, 316 + cl, 9, 8, INK); R(g, px - 3, 317 + cl, 7, 6, M.red[3]); R(g, px - (d < 0 ? 4 : 0), 313 + cl, 4, 4, M.red[2]); }
        for (let i = 0; i < Math.round(S.fill * 4); i++) { const sx = 104 + i * 9; disc(g, sx, 332, 3, i % 2 ? M.pink[3] : M.white[3]); R(g, sx - 1, 330, 2, 1, M.pink[2]); }
        if (S.lit > 0.05) sparkle(g, cx, 308, t, 0, M.white[4]); } },
    sandcastle: { x: 152, y: 262, w: 58, h: 74, about: 'sandcastle with a flag (fill builds the towers up, open lifts the gate, light lights the flag)', fills: true, opens: true,
      draw(g, t, S) { const g1 = 0.4 + 0.6 * S.fill;
        for (const [x, w, h] of [[154, 16, 40 * g1 + 10], [196, 16, 48 * g1 + 8], [175, 18, 66 * g1 + 8]]) { box(g, x, 335 - h, w, h, M.sand); for (let i = 0; i < w; i += 6) R(g, x + i, 335 - h - 4, 4, 4, M.sand[3]); for (let y = 335 - h + 8; y < 332; y += 10) R(g, x + 2, y, w - 4, 1, M.sand[1]); }
        box(g, 166, 316, 34, 19, M.sand); R(g, 174, 322, 18, 13, INK); if (S.open > 0.1) R(g, 175, 323, 16, 12 - Math.round(S.open * 6), M.sand[2]); else R(g, 175, 323, 16, 12, M.sand[1]);
        const fy = 335 - (66 * g1 + 8) - 4, wv = Math.round(Math.sin(t * 5) * 1.5); R(g, 184, fy - 14, 1, 16, INK); R(g, 185, fy - 14, 8 + wv, 6, S.lit > 0.05 ? M.yellow[3] : M.red[2]); R(g, 185, fy - 14, 8 + wv, 1, M.white[3]);
        if (S.lit > 0.05) sparkle(g, 190, fy - 10, t, 0, M.white[4]);
        for (let i = 0; i < 4; i++) { disc(g, 156 + i * 14, 336, 2 + (i % 2), M.sand[3]); } } },
    palm: { x: 214, y: 140, w: 54, h: 196, about: 'tall palm with coconuts (fill grows the bunch, burst drops them)', fills: true,
      draw(g, t, S) { const c = bxPalm(g, 238, 336, 190, -0.55, t, 2), n = Math.max(1, Math.round(S.fill * 5)); for (let i = 0; i < n; i++) { const d = S.ev.coins >= 0 ? S.ev.coins * 120 : 0; disc(g, c.x - 3 + (i % 3) * 4, c.y + 4 + Math.floor(i / 3) * 4 + d, 3, M.wood[1]); R(g, c.x - 4 + (i % 3) * 4, c.y + 2 + Math.floor(i / 3) * 4 + d, 2, 1, M.wood[3]); }
        if (S.lit > 0.05) sparkle(g, c.x - 12, c.y - 6, t, 0, M.white[4]); } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    R(g, -20, 446, 60, 50, M.sand[0]); R(g, 240, 452, 60, 40, M.sand[0]); R(g, -20, 446, 60, 3, M.sand[2]); R(g, 240, 452, 60, 3, M.sand[2]);
    const f = ((t * 0.14) % 1); alpha(g, 0.6 * (1 - f), () => { for (let x = -10; x < 280; x += 6) R(g, x, 408 + Math.sin(x * 0.3 + t) * 1.5 + f * 8, 4, 1, M.white[4]); });
  },
});

/* ======================================================================================================== mars */
/* dust devil: a leaning column of dithered dust that swirls */
function bxDevil(g, t, x, base, h) {
  alpha(g, 0.55, () => { for (let y = base - h; y < base; y += 3) { const k = (y - (base - h)) / h, w = 2 + k * 11, off = Math.sin(y * 0.13 - t * 5) * (2 + k * 5) + (1 - k) * 8; dith(g, x + off - w, y, w * 2, 3, M.orange[3], M.sand[3], 0); R(g, x + off - w * 0.4, y, w * 0.8, 3, M.sand[3]); } });
}
defScenario({
  id: 'mars', name: 'Mars', about: 'Red planet at dusk: rust-coloured rocks and a huge volcano, two small moons crossing the thin dusty sky, a dust devil, a rover, a habitat dome and a radio dish.',
  topics: ['mars', 'space', 'space exploration', 'colonization', 'planets', 'science', 'astronauts', 'rovers', 'the future', 'red planet', 'nasa'], avoid: ['ocean', 'beach'],
  keywords: ['mars', 'marte', 'planet', 'planeta', 'red planet', 'planeta rojo', 'rover', 'space', 'espacio', 'astronaut', 'astronauta', 'colony', 'colonia', 'colonizar', 'martian', 'marciano', 'habitat', 'dome', 'domo', 'cosmos', 'nasa', 'spacex', 'moon', 'luna', 'luna de marte', 'exploration', 'exploracion', 'alien', 'extraterrestre'],
  time: 'dusk', floor: ['sand', 'brick', ['rock', 'rock']], __amb: true, ambient: ['dust', 'moons', 'devil'],
  far(g, t, c) {
    bands(g, -40, -20, 262, W + 120, [M.brick[0], M.brick[1], M.brick[1], M.brick[2], M.orange[1], M.orange[2], M.sand[2]], 8); stars(g, t, 22, 5, 110, M.sand[4]);
    disc(g, 214, 232, 4, M.white[4]); glow(g, 214, 232, 26, M.blue[3], 0.25);
    const p1 = ((t * 3.2 + 40) % 340) - 30, p2 = ((t * 1.7 + 190) % 340) - 30;
    disc(g, p1, 98, 7, M.stone[3]); disc(g, p1 - 2, 96, 2, M.stone[2]); R(g, p1 + 1, 100, 3, 2, M.stone[2]); disc(g, p1 - 3, 96, 5, M.stone[4]); disc(g, p1, 98, 7, M.stone[3]); disc(g, p1 - 2, 96, 2, M.stone[2]); R(g, p1 + 1, 100, 3, 2, M.stone[2]); R(g, p1 + 3, 94, 1, 1, M.stone[4]);
    disc(g, p2, 70, 3, M.stone[4]); R(g, p2 - 1, 69, 1, 1, M.stone[2]);
    bxCone(g, 80, 168, 270, 170, M.brick, 0.1, M.orange, 3, 26); bxCone(g, 250, 206, 270, 80, M.brick, null, M.orange, 3, 14); R(g, 64, 166, 32, 3, M.brick[1]);
    bxDevil(g, t, 150 + Math.sin(t * 0.25) * 40, 270, 60);
  },
  back(g, t) {
    hills(g, 298, [M.brick[0], M.brick[1], M.brick[2]], 5, 22);
    for (const [x, y, r] of [[28, 296, 8], [150, 300, 6], [236, 296, 10], [200, 302, 5]]) { ball(g, x, y, r, M.brick); R(g, x - r * 0.4, y - r * 0.5, r * 0.6, 2, M.orange[3]); }
    alpha(g, 0.3, () => R(g, -40, 276, 360, 26, M.orange[2]));
  },
  mid(g, t) {
    ground(g, 318, 270, [M.brick[0], M.brick[2], M.orange[1], M.orange[2], M.sand[2]], { k: 1, specks: 30 });
    for (let x = -10; x < 290; x += 7) { R(g, x, 336 + (x % 3), 3, 1, M.brick[0]); R(g, x, 341 + (x % 2), 3, 1, M.brick[0]); }
    for (const [x, y, w] of [[30, 322, 22], [158, 324, 30], [232, 321, 18]]) { ball(g, x + w / 2, y, w / 2, M.brick); R(g, x + 2, y - w / 2, w * 0.5, 2, M.orange[3]); }
    alpha(g, 0.45, () => { for (let i = 0; i < 18; i++) { const x = ((t * 46 * (0.6 + hs(i)) + hs(i * 5) * 320) % 340) - 30, y = 300 + hs(i * 3) * 50; R(g, x, y, 8 + hs(i) * 10, 1, M.sand[3]); } });
  },
  props: {
    rover: { x: 10, y: 262, w: 82, h: 74, about: 'rover with solar panel and a turning camera mast (fill drives it forward, light switches its lamp on)', fills: true,
      draw(g, t, S) { const ox = Math.round(S.fill * 14), sp = t * (1.5 + S.fill * 6), bob = Math.round(Math.sin(t * 5) * 0.6);
        shade(g, 14 + ox, 332, 70, 4, 0.35);
        for (const wx of [24, 46, 68]) { const x = wx + ox; disc(g, x, 326, 7, M.dark[0]); disc(g, x, 326, 5, M.steel[1]); disc(g, x, 326, 2, M.steel[3]); for (let k = 0; k < 3; k++) { const a = sp + k * 2.09; R(g, x + Math.cos(a) * 4 - 1, 326 + Math.sin(a) * 4 - 1, 2, 2, M.steel[4]); } }
        R(g, 16 + ox, 300 + bob, 62, 3, INK); box(g, 18 + ox, 302 + bob, 58, 14, M.white); R(g, 18 + ox, 312 + bob, 58, 4, M.steel[1]);
        box(g, 22 + ox, 288 + bob, 40, 12, M.blue); for (let i = 1; i < 5; i++) R(g, 22 + ox + i * 8, 288 + bob, 1, 12, M.blue[0]); R(g, 22 + ox, 294 + bob, 40, 1, M.blue[0]); R(g, 22 + ox, 288 + bob, 40, 1, M.blue[4]);
        const lk = Math.sin(t * 0.9) * 3; R(g, 66 + ox, 272 + bob, 3, 30, INK); R(g, 67 + ox, 272 + bob, 1, 30, M.steel[3]); box(g, 61 + ox + lk, 266 + bob, 12, 7, M.steel); R(g, 70 + ox + lk, 268 + bob, 3, 3, S.lit > 0.05 && Math.floor(t * 4) % 2 ? M.yellow[4] : M.blue[4]);
        if (S.lit > 0.05) { glow(g, 72 + ox + lk, 269 + bob, 14, M.yellow[3], 0.5); alpha(g, 0.3, () => { for (let i = 1; i < 8; i++) R(g, 74 + ox + lk + i * 3, 270 + bob + i, 4, 2 + i / 2, M.yellow[3]); }); }
        line(g, 72 + ox, 306 + bob, 84 + ox, 318 + bob + Math.round(Math.sin(t * 1.3) * 2), 2, M.steel[3]); R(g, 83 + ox, 317 + bob, 4, 4, M.steel[2]);
        if (S.fill > 0 && S.fill < 0.99) for (let i = 0; i < 4; i++) R(g, 12 + ox - i * 9 - ((t * 20) % 9), 336 + (i % 2), 3, 2, M.orange[2]); } },
    dome: { x: 100, y: 196, w: 96, h: 140, about: 'habitat dome with an airlock and an antenna (light turns the windows and plants on, open cycles the airlock)', opens: true,
      draw(g, t, S) { const cx = 146, r = 44, by = 330, on = Math.max(0.3, S.lit);
        R(g, cx - 1, by - r - 38, 3, 38, INK); R(g, cx, by - r - 38, 1, 38, M.steel[3]); const bl = Math.floor(t * 1.5) % 2; R(g, cx - 2, by - r - 42, 5, 5, INK); R(g, cx - 1, by - r - 41, 3, 3, bl ? M.red[3] : M.red[1]); if (bl) glow(g, cx, by - r - 40, 12, M.red[3], 0.5);
        for (let dy = -r; dy <= 0; dy += 2) { const dx = Math.sqrt(r * r - dy * dy); R(g, cx - dx - 1, by + dy, dx * 2 + 2, 2, INK); R(g, cx - dx, by + dy, dx * 2, 2, M.teal[2]); R(g, cx - dx, by + dy, Math.max(2, dx * 0.35), 2, M.teal[3]); }
        for (let dy = -r + 10; dy <= -2; dy += 2) { const dx = Math.sqrt((r - 8) * (r - 8) - Math.pow(dy + 4, 2)); if (isNaN(dx)) continue; R(g, cx - dx, by + dy, dx * 2, 2, S.lit > 0.05 ? M.yellow[2] : M.teal[1]); }
        glow(g, cx, by - 14, 34 + 10 * on, M.yellow[3], 0.15 + 0.5 * S.lit);
        for (const [px, ph] of [[-22, 10], [-8, 16], [10, 12], [24, 9]]) { R(g, cx + px, by - 4 - ph, 3, ph, M.green[2]); R(g, cx + px - 3, by - 6 - ph, 9, 4, M.green[3]); R(g, cx + px - 2, by - 8 - ph, 3, 3, M.green[4]); }
        for (let a = -3; a <= 3; a++) R(g, cx + a * 12 - 1, by - r + Math.abs(a) * 7, 2, r - Math.abs(a) * 7, M.steel[2]); R(g, cx - r - 2, by - 3, r * 2 + 4, 5, M.steel[1]); R(g, cx - r - 2, by - 3, r * 2 + 4, 1, M.steel[3]);
        const dx0 = 192, dw = Math.round(S.open * 8); R(g, dx0 - 2, by - 24, 20, 26, INK); R(g, dx0 - 1, by - 23, 18, 24, M.steel[2]); R(g, dx0 + 2, by - 19, 12, 20, INK); R(g, dx0 + 3, by - 18, 10 - dw, 19, M.steel[3]); if (S.open > 0.05) { R(g, dx0 + 13 - dw, by - 18, dw, 19, M.yellow[3]); bxSpill(g, dx0 + 14, by + 1, 24, M.yellow[3], 0.5, t); }
        R(g, cx + r - 6, by - 10, 46, 5, M.steel[1]); R(g, cx + r - 6, by - 10, 46, 1, M.steel[3]); } },
    dish: { x: 204, y: 168, w: 62, h: 168, about: 'radio dish on a tripod that turns toward the sky (fill sends signal rings, light blinks the beacon)', fills: true,
      draw(g, t, S) { const cx = 234, hy = 262, ta = Math.sin(t * 0.5);
        for (const d of [-1, 1]) line(g, cx, hy, cx + d * 20, 334, 3, M.steel[2]); line(g, cx, hy, cx, 334, 3, M.steel[3]); R(g, cx - 4, 332, 9, 4, M.steel[1]); R(g, cx - 24, 333, 9, 3, M.steel[1]); R(g, cx + 17, 333, 9, 3, M.steel[1]);
        R(g, cx - 3, hy - 20, 6, 22, INK); R(g, cx - 2, hy - 20, 4, 22, M.steel[3]);
        const dx = cx + ta * 3, dy = hy - 26; disc(g, dx, dy, 22, M.steel[1]); disc(g, dx, dy, 20, M.white[3]); disc(g, dx + 4 - ta * 3, dy - 3, 17, M.steel[3]); disc(g, dx + 5 - ta * 3, dy - 4, 12, M.steel[2]);
        line(g, dx + 5 - ta * 3, dy - 4, dx + 20, dy - 24, 2, M.steel[4]); R(g, dx + 18, dy - 28, 5, 5, M.red[2]);
        if (S.fill > 0.02 || S.lit > 0.05) for (let i = 0; i < 3; i++) { const rr = ((t * 22 + i * 14) % 42) + 8; alpha(g, 1 - rr / 50, () => { for (let k = 0; k < 18; k++) { const a = -1.9 + k * 0.17; R(g, dx + 20 + Math.cos(a) * rr, dy - 24 + Math.sin(a) * rr, 2, 2, M.yellow[3]); } }); }
        if (Math.floor(t * 2) % 2 && S.lit > 0.05) glow(g, dx + 20, dy - 26, 14, M.red[3], 0.7); } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    R(g, -20, 440, 58, 50, M.brick[0]); R(g, -20, 440, 58, 3, M.brick[2]); R(g, 240, 448, 70, 44, M.brick[0]); R(g, 240, 448, 70, 3, M.brick[2]);
    dust(g, t, 24, 4, M.orange[3], 34, 300, 170); dust(g, t, 14, 9, M.sand[4], 18, 120, 200);
  },
});

/* ======================================================================================================== volcano */
/* flowing lava band: crust plates drift, bright cells slide */
function bxLava(g, t, y, x0, x1, h) {
  R(g, x0, y, x1 - x0, h, M.fire[1]); R(g, x0, y, x1 - x0, 2, M.fire[0]);
  for (let x = x0; x < x1; x += 4) { const p = Math.sin(x * 0.11 - t * 1.3) * 0.5 + Math.sin(x * 0.27 + t * 0.9) * 0.5; if (p > 0.1) R(g, x, y + 3 + (x % 3), 4, 3, M.fire[2]); if (p > 0.55) R(g, x, y + 4, 3, 2, M.fire[3]); if (p > 0.85) R(g, x, y + 4, 2, 1, M.fire[4]); }
  for (let i = 0; i < 7; i++) { const x = ((i * 53 + t * 6 * (1 + (i % 2) * 0.5)) % (x1 - x0 + 40)) + x0 - 20; R(g, x, y + 2 + (i * 5) % (h - 5), 14 + (i % 3) * 6, 3, M.fire[0]); R(g, x + 1, y + 2 + (i * 5) % (h - 5), 12 + (i % 3) * 6, 1, M.stone[1]); }
}
defScenario({
  id: 'volcano', name: 'Volcano', about: 'Night volcano: an erupting cone with glowing lava flows, fountains of sparks and a smoke plume, embers rising, a lava river, obsidian rocks and a steaming vent.',
  topics: ['volcano', 'eruption', 'lava', 'pressure', 'danger', 'natural disasters', 'geology', 'heat', 'explosion', 'earth science', 'anger'], avoid: ['winter', 'calm'],
  keywords: ['volcano', 'volcan', 'volcanes', 'eruption', 'erupcion', 'erupt', 'entrar en erupcion', 'lava', 'magma', 'ash', 'ceniza', 'crater', 'obsidian', 'obsidiana', 'pressure', 'presion', 'explode', 'explosion', 'explotar', 'fire', 'fuego', 'hot', 'caliente', 'geyser', 'eruptions', 'earthquake', 'terremoto', 'sismo'],
  time: 'night', floor: ['sand', 'stone', ['rock', 'rock']], __amb: true, ambient: ['embers', 'ash', 'smoke'],
  far(g, t, c) {
    bands(g, -40, -20, 300, W + 120, [M.dark[0], M.dark[1], M.brick[0], M.brick[0], M.red[0], M.brick[1], M.fire[1]], 8); stars(g, t, 14, 3, 100);
    const T = 4, k = Math.floor(t / T), t0 = k * T, ph = t - t0, cx = 150;
    bxCone(g, cx, 96, 300, 170, [M.dark[0], M.dark[3], M.stone[1]], 0, M.white, 3, 0, 118);
    R(g, cx - 20, 118, 40, 6, M.stone[1]); R(g, cx - 20, 118, 40, 2, M.stone[2]); R(g, cx - 15, 116, 30, 5, M.fire[1 + (Math.floor(t * 6) % 2)]); R(g, cx - 11, 115, 22, 3, M.fire[3]); R(g, cx - 6, 114, 12, 2, M.fire[4]);
    for (let i = 0; i < 3; i++) { for (let y = 122; y < 300; y += 3) { const q = (y - 122) / 178, x = cx + (i - 1) * 26 * q + Math.sin(y * 0.085 + i * 2.3) * (3 + q * 5), w = 3 + q * 3 + (i === 1 ? 1 : 0); R(g, x - w / 2 - 1, y, w + 2, 3, M.fire[0]); R(g, x - w / 2, y, w, 3, M.fire[1]); R(g, x - w / 4, y, w / 2, 3, M.fire[2]); if (Math.floor(y * 0.4 - t * 14 + i * 7) % 8 === 0) { R(g, x - 1, y, 3, 3, M.fire[4]); } } }
    glow(g, cx, 120, 30 + (ph < 0.8 ? 22 * (1 - ph / 0.8) : 0), M.orange[3], 0.3 + (ph < 0.8 ? 0.4 * (1 - ph / 0.8) : 0));
    burst(g, cx, 114, t0, t, 18, [M.fire[2], M.fire[3], M.fire[4], M.orange[3]], k * 3 + 2, 110, 170, 1.9, 3);
    burst(g, cx - 4, 114, t0 + 0.15, t, 10, [M.fire[3], M.orange[3]], k * 5 + 1, 70, 150, 1.5, 2);
    for (let i = 0; i < 12; i++) { const age = (t * 0.1 + i / 12) % 1, x = cx + age * 80 + Math.sin(age * 6 + i) * 8, y = 112 - age * 84, r = 8 + age * 24; alpha(g, 0.92 * (1 - age * age), () => { disc(g, x, y, r, M.stone[1]); disc(g, x - r * 0.25, y - r * 0.2, r * 0.7, M.stone[2]); }); if (age < 0.4) alpha(g, 0.35 * (1 - age * 2.5), () => disc(g, x, y + r * 0.5, r * 0.8, M.fire[1])); }
  },
  back(g, t) {
    hills(g, 302, [M.dark[0], M.brick[0], M.stone[0]], 3, 18); alpha(g, 0.35, () => R(g, -40, 280, 360, 30, M.fire[1]));
    glow(g, 150, 304, 64, M.fire[2], 0.16 + 0.04 * Math.sin(t * 2));
    for (const [x, h] of [[18, 40], [44, 24], [240, 46], [268, 30]]) { for (let r = 0; r < h; r += 3) { const w = 6 + (h - r) * 0.1 + r * 0.3; R(g, x - w / 2, 302 - h + r, w, 3, r % 6 ? M.dark[2] : M.stone[0]); } R(g, x - 3, 302 - h, 3, h, M.stone[1]); }
  },
  mid(g, t) {
    ground(g, 318, 270, [M.dark[0], M.stone[1], M.stone[2], M.stone[3], M.stone[3]], { k: 1, specks: 34 });
    bxLava(g, t, 322, -40, 330, 14); glow(g, 135, 330, 50, M.orange[3], 0.1);
    for (let i = 0; i < 6; i++) { const x = 8 + i * 48 + (i % 2) * 6, y = 346 + (i % 3) * 8, l = 22 + (i % 3) * 8; alpha(g, 0.6 + 0.4 * Math.sin(t * 2 + i), () => { R(g, x, y, l, 2, M.fire[2]); R(g, x + l, y, 2, 10, M.fire[2]); R(g, x + l - 6, y + 10, 8, 2, M.fire[3]); }); }
  },
  props: {
    seismo: libProp('gauge', 12, 106, 2, { about: 'seismograph dial: the needle climbs into the red zone as the pressure builds (fill)' }),
    lava: { x: 6, y: 288, w: 118, h: 48, about: 'pool of molten lava (fill raises the level and the glow, open lets a fountain spit)', fills: true, opens: true,
      draw(g, t, S) { const lv = 6 + S.fill * 14, top = 330 - lv;
        R(g, 6, top - 3, 118, lv + 11, INK); R(g, 8, top - 1, 114, lv + 9, M.stone[1]); bxLava(g, t, top + 1, 9, 121, lv + 6);
        for (let i = 0; i < 5; i++) { const x = 18 + i * 22, a = (t * 0.7 + hs(i) * 3) % 1, by = top + 4 - a * 10; if (a < 0.9) { alpha(g, 1 - a, () => disc(g, x, by, 2 + (a > 0.7 ? 1 : 0), M.fire[3])); } }
        if (S.open > 0.05) { const f = Math.sin(S.open * Math.PI) * 26; for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI, px = 64 + Math.cos(a) * 18 * S.open, py = top - Math.sin(a) * f; R(g, px, py, 3, 3, M.fire[3 + (i % 2)]); } }
        glow(g, 64, top + 6, 28 + S.fill * 14, M.orange[3], 0.2 + 0.3 * S.fill + 0.2 * S.lit); } },
    obsidian: { x: 128, y: 262, w: 60, h: 74, about: 'cluster of black obsidian shards (fill glows the cracks, light sweeps a shine over the glass)', fills: true,
      draw(g, t, S) { const sh = ((t * 0.6) % 1.6) * 80 - 14;
        for (const [x, h, w, lean] of [[132, 52, 14, -3], [150, 74, 18, 1], [170, 48, 14, 3]]) { for (let r = 0; r < h; r += 2) { const q = r / h, ww = Math.max(2, w * (0.25 + 0.75 * q)), lx = x + lean * (1 - q) * 2; R(g, lx - 1, 336 - h + r - 1, ww + 2, 3, INK); R(g, lx, 336 - h + r, ww, 2, M.dark[2]); R(g, lx, 336 - h + r, ww * 0.35, 2, M.dark[4]); } R(g, x + lean, 336 - h, 3, 3, M.white[2]);
          const n = Math.round(S.fill * 4); for (let i = 0; i < n; i++) { alpha(g, 0.6 + 0.4 * Math.sin(t * 5 + i), () => R(g, x + 3 + (i % 2) * 5, 336 - h * 0.3 - i * 8, 2, 7, M.fire[3])); }
          if (S.lit > 0.05) for (let r = 0; r < h; r += 2) { const lx = x + 2; if (Math.abs(r * 0.6 + lx - sh) < 5) R(g, lx, 336 - h + r, w * 0.5, 2, M.white[4]); } }
        R(g, 128, 332, 60, 5, M.stone[0]); R(g, 128, 332, 60, 1, M.stone[2]); } },
    vent: { x: 196, y: 190, w: 66, h: 146, about: 'steaming volcanic vent (fill grows the geyser column, open makes it erupt in a burst)', fills: true, opens: true,
      draw(g, t, S) { const cx = 229, hgt = 30 + S.fill * 70 + S.open * 40;
        for (let r = 0; r < 30; r += 3) { const w = 12 + r * 1.3; R(g, cx - w - 1, 306 + r, w * 2 + 2, 3, INK); R(g, cx - w, 306 + r, w * 2, 3, r % 6 ? M.stone[1] : M.stone[2]); R(g, cx - w, 306 + r, w * 0.5, 3, M.stone[3]); }
        R(g, cx - 10, 303, 20, 4, M.fire[1]); R(g, cx - 6, 303, 12, 2, M.fire[3]);
        for (let i = 0; i < 12; i++) { const age = (t * 0.45 + i / 12) % 1, y = 302 - age * hgt, x = cx + Math.sin(age * 7 + i) * (3 + age * 7), r = 3 + age * 8; alpha(g, 0.85 * (1 - age), () => { disc(g, x, y, r, M.white[2]); disc(g, x - 1, y - 1, r * 0.6, M.white[3]); }); }
        if (S.open > 0.05) for (let i = 0; i < 6; i++) { const a = (t * 1.3 + i / 6) % 1; R(g, cx + Math.sin(i * 5) * 18 * a, 302 - Math.sin(a * Math.PI) * 60 * S.open, 3, 3, M.fire[3]); }
        glow(g, cx, 304, 24, M.orange[3], 0.35 + 0.3 * S.lit); } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    R(g, -20, 440, 56, 50, M.dark[0]); R(g, -20, 440, 56, 3, M.stone[1]); R(g, 236, 448, 74, 44, M.dark[0]); R(g, 236, 448, 74, 3, M.stone[1]);
    for (const x of [20, 250]) glow(g, x, 450, 30, M.orange[3], 0.12);
    embers(g, t, 34, 9, 470); dust(g, t, 20, 6, M.stone[4], 8, 100, 340);
  },
});

/* ======================================================================================================== arctic */
/* aurora borealis: vertical ray curtains, green at the bottom fading to purple at the top, drifting with t */
function bxAurora(g, t, y0, h) {
  for (let x = -6; x < W + 8; x += 3) {
    const a = 0.55 + 0.45 * Math.sin(x * 0.035 + t * 0.55), top = y0 + Math.sin(x * 0.05 + t * 0.6) * 12 + Math.sin(x * 0.013 - t * 0.3) * 8, len = h * (0.7 + 0.3 * Math.sin(x * 0.021 - t * 0.4));
    alpha(g, 0.14 * a, () => R(g, x, top, 3, len * 0.38, M.purple[3])); alpha(g, 0.24 * a, () => R(g, x, top + len * 0.3, 3, len * 0.4, M.teal[3])); alpha(g, 0.34 * a, () => R(g, x, top + len * 0.6, 3, len * 0.4, M.green[3]));
  }
}
defScenario({
  id: 'arctic', name: 'Arctic', about: 'Polar night: dancing aurora over icy mountains, drifting ice floes in a dark sea, an igloo, waddling penguins, a block of ice with a frozen fish and falling snow.',
  topics: ['arctic', 'antarctica', 'polar', 'ice', 'cold', 'climate change', 'global warming', 'penguins', 'glaciers', 'aurora', 'freezing'], avoid: ['desert', 'heat'],
  keywords: ['arctic', 'artico', 'antarctic', 'antartida', 'polar', 'ice', 'hielo', 'iceberg', 'glacier', 'glaciar', 'penguin', 'pinguino', 'pinguinos', 'igloo', 'iglu', 'aurora', 'boreal', 'frio', 'cold', 'freezing', 'congelado', 'snow', 'nieve', 'polo norte', 'polo sur', 'north pole', 'south pole', 'climate', 'clima', 'calentamiento global', 'oso polar', 'polar bear'],
  time: 'night', floor: ['sand', 'steel', ['rock', 'bush']], __amb: true, ambient: ['aurora', 'snow', 'floes'],
  far(g, t, c) {
    skyFill(g, c, -20, 290); stars(g, t, 36, 12, 150); bxAurora(g, t, 70, 130);
    bxCone(g, 60, 170, 268, 100, M.steel, 0.38, M.white, 3); bxCone(g, 210, 150, 268, 120, M.steel, 0.4, M.white, 3); bxCone(g, 140, 206, 268, 70, M.blue, 0.3, M.white, 3);
  },
  back(g, t) {
    waves(g, t, 266, -40, 320, [M.dark[0], M.water[0], M.water[1], M.water[2]], 70, 1.2);
    bxCone(g, 238, 236, 290, 34, M.teal, 0.35, M.white, 3); R(g, 222, 288, 32, 2, M.teal[1]);
    for (let i = 0; i < 6; i++) { const w = 26 + (i % 3) * 12, x = ((t * 2.4 + i * 68) % 360) - 60, y = 276 + (i % 3) * 11 + Math.sin(t * 0.9 + i) * 1.5; R(g, x - 1, y - 1, w + 2, 7, INK); R(g, x, y, w, 4, M.white[3]); R(g, x + 3, y + 4, w - 6, 3, M.teal[2]); R(g, x + 3, y + 6, w - 6, 1, M.teal[1]); R(g, x + 4, y - 3, w * 0.4, 3, M.white[3]); R(g, x, y, 5, 4, M.white[4]); alpha(g, 0.4, () => R(g, x + 2, y + 8, w - 4, 1, M.white[3])); }
    bxSnow(g, t, 24, 2, 0.6);
  },
  mid(g, t) {
    ground(g, 316, 270, [M.steel[1], M.steel[3], M.white[2], M.white[3], M.white[4]], { k: 1, specks: 0 });
    for (let x = -30; x < 300; x += 22) { R(g, x, 322 + (x * 5) % 9, 14, 1, M.teal[3]); R(g, x + 6, 323 + (x * 5) % 9, 6, 3, M.teal[2]); }
    const sh = 0.5 + 0.5 * Math.sin(t * 0.5); alpha(g, 0.16 + 0.12 * sh, () => bands(g, -40, 316, 346, W + 120, [M.green[3], M.teal[3]], 6));
    for (let x = 2; x < 280; x += 36) { R(g, x, 332 + (x % 5), 3, 2, M.steel[3]); R(g, x + 4, 334 + (x % 5), 3, 2, M.steel[3]); }
  },
  props: {
    iceblock: { x: 12, y: 226, w: 80, h: 110, about: 'block of ice with a frozen fish (fill grows the block, light sweeps a glint, burst shatters it)', fills: true,
      draw(g, t, S) { const h = 70 + S.fill * 36, top = 336 - h, sh = ((t * 0.55) % 1.7) * 130 - 20;
        for (let r = 0; r < h; r += 3) { const w = 66 - (r < 8 ? (8 - r) * 2 : 0); const x = 19 + (r < 8 ? (8 - r) : 0); R(g, x - 1, top + r, w + 2, 3, INK); R(g, x, top + r, w, 3, r < 5 ? M.white[3] : M.teal[2]); R(g, x, top + r, 8, 3, M.teal[3]); R(g, x + w - 7, top + r, 7, 3, M.teal[1]); if (Math.abs(r * 0.7 + x - sh) < 5) R(g, x + 8, top + r, 10, 3, M.white[4]); }
        R(g, 30, top + 20, 22, 2, M.white[4]); R(g, 30, top + 20, 2, 28, M.white[4]);
        const fy = top + h * 0.55; R(g, 40, fy, 22, 9, M.orange[2]); R(g, 56, fy - 3, 6, 15, M.orange[1]); R(g, 38, fy + 2, 4, 5, M.orange[1]); R(g, 44, fy + 2, 2, 2, INK); R(g, 46, fy, 8, 1, M.orange[3]); for (let i = 0; i < 3; i++) R(g, 47 + i * 4, fy + 3, 2, 4, M.red[2]);
        for (let i = 0; i < 4; i++) { const a = (t * 0.4 + hs(i)) % 1; R(g, 26 + hs(i + 3) * 48, top + h - 8 - a * (h - 16), 2, 2, M.white[4]); }
        if (S.lit > 0.05) { sparkle(g, 24, top + 8, t, 0, M.white[4]); sparkle(g, 70, top + 30, t + 0.5, 0, M.white[4]); } } },
    penguins: { x: 98, y: 274, w: 74, h: 62, about: 'two penguins waddling (fill adds a chick, open makes them flap their flippers, light sparkles)', fills: true, opens: true,
      draw(g, t, S) { const n = 2 + Math.round(S.fill), list = [[114, 1, 0.0], [138, -1, 1.3], [158, 1, 2.1]].slice(0, n);
        for (const [x0, d, ph] of list) { const sw = Math.sin(t * 6 + ph), x = x0 + sw * 1.2, ch = x0 === 158, s = ch ? 0.7 : 1, Q = (v) => Math.round(v * s), by = 334, bob = Math.abs(sw) > 0.8 ? 1 : 0, fl = S.open > 0.2 ? Math.round(Math.sin(t * 14 + ph) * 3 * s) - Q(4) : 0;
          shade(g, x - Q(9), by - 1, Q(18), 3, 0.3); R(g, x - Q(6), by - 3, Q(5), 3, M.orange[2]); R(g, x + Q(1), by - 3, Q(5), 3, M.orange[2]);
          R(g, x - Q(9), by - Q(30) - bob - 1, Q(18), Q(28) + 2, INK); R(g, x - Q(8), by - Q(30) - bob, Q(16), Q(28), M.dark[2]); R(g, x - Q(5), by - Q(24) - bob, Q(10), Q(21), M.white[3]); R(g, x - Q(8), by - Q(30) - bob, Q(3), Q(8), M.steel[1]);
          R(g, x - Q(9), by - Q(24) - bob + fl, Q(3), Q(11), INK); R(g, x + Q(6), by - Q(24) - bob + fl, Q(3), Q(11), INK);
          R(g, x - Q(4), by - Q(28) - bob, Q(3), Q(3), M.white[4]); R(g, x + Q(1), by - Q(28) - bob, Q(3), Q(3), M.white[4]); R(g, x - Q(3) + d, by - Q(28) - bob, 2, 2, INK); R(g, x + Q(2) + d, by - Q(28) - bob, 2, 2, INK); R(g, x - Q(2) + d * 2, by - Q(25) - bob, Q(5), Q(2), M.orange[2]);
          if (S.lit > 0.05) sparkle(g, x + Q(8), by - Q(34), t + ph, 0, M.yellow[4]); } } },
    igloo: { x: 178, y: 242, w: 88, h: 94, about: 'igloo of snow blocks with a glowing doorway (light warms the entrance, open opens the flap)', opens: true,
      draw(g, t, S) { const cx = 214, by = 334, r = 38, on = Math.max(0.25, S.lit);
        for (let dy = -r; dy <= 0; dy += 3) { const dx = Math.sqrt(r * r - dy * dy), row = Math.round((dy + r) / 6); R(g, cx - dx - 1, by + dy, dx * 2 + 2, 3, INK); R(g, cx - dx, by + dy, dx * 2, 3, M.white[3]); R(g, cx - dx, by + dy, Math.max(3, dx * 0.4), 3, M.white[4]); R(g, cx + dx - Math.max(3, dx * 0.3), by + dy, Math.max(3, dx * 0.3), 3, M.white[1]); R(g, cx - dx, by + dy + 2, dx * 2, 1, M.steel[3]); for (let x = -dx + (row % 2) * 8; x < dx; x += 16) R(g, cx + x, by + dy, 1, 3, M.steel[3]); }
        R(g, cx - 14, by - 22, 54, 24, INK); R(g, cx - 13, by - 21, 52, 22, M.white[3]); R(g, cx - 13, by - 21, 52, 3, M.white[4]); R(g, cx - 13, by - 3, 52, 3, M.white[1]); R(g, cx - 8, by - 16, 14, 18, INK); R(g, cx - 6, by - 14, 10, 16, M.orange[2 + (on > 0.5 ? 1 : 0)]);
        R(g, cx - 6, by - 14, 10, 16, on > 0.5 ? M.yellow[3] : M.orange[1]); glow(g, cx - 1, by - 8, 12 + on * 8, M.yellow[3], 0.1 + 0.4 * S.lit); if (S.lit > 0.05) bxSpill(g, cx - 1, by + 1, 34, M.yellow[3], 0.5, t);
        if (S.open > 0.05) { const h = Math.round(S.open * 15); R(g, cx - 6, by - 14, 10, 16 - h, M.white[2]); }
        R(g, cx - 6, by - 14, 10, 2, M.white[1]); puffs(g, cx + 8, by - r - 1, t, 0.3, M.white[3], 4, 28, 0.3); R(g, cx + 5, by - r - 2, 6, 3, M.white[1]); } },
    snow: libProp('snowflake', 104, 118, 2.5, { about: 'snowflake: the cold itself; light makes it sparkle' }),
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    for (const [x, r] of [[-4, 34], [24, 20], [266, 30], [292, 24]]) { disc(g, x, 478, r, M.steel[0]); R(g, x - r * 0.6, 478 - r + 2, r * 1.1, 3, M.white[2]); }
    bxSnow(g, t, 30, 18, 1.8); dust(g, t, 10, 3, M.white[3], 26, 360, 90);
  },
});

/* ======================================================================================================== jungle */
/* hanging vine: a swaying curve with leaf nodes */
function bxVine(g, t, x, len, seed, ramp = M.green) {
  for (let y = -4; y < len; y += 3) { const sw = Math.sin(y * 0.045 + t * 0.9 + seed) * (y * 0.05), px = x + sw; R(g, px, y, 2, 3, ramp[1]); R(g, px, y, 1, 3, ramp[2]); if (Math.round(y / 3) % 7 === 3) { R(g, px + 2, y, 5, 3, ramp[2]); R(g, px + 2, y, 5, 1, ramp[3]); R(g, px - 5, y + 3, 5, 3, ramp[1]); } }
}
defScenario({
  id: 'jungle', name: 'Jungle', about: 'Dense jungle: a canopy of leaves with light shafts and swaying vines, a mossy stone totem, a river with a canoe, a giant flower, a macaw and drifting mist.',
  topics: ['jungle', 'rainforest', 'amazon', 'nature', 'biodiversity', 'adventure', 'exploration', 'wildlife', 'survival', 'lost civilizations', 'ecology'], avoid: ['city', 'office'],
  keywords: ['jungle', 'selva', 'rainforest', 'bosque tropical', 'amazon', 'amazonas', 'liana', 'lianas', 'vine', 'vines', 'river', 'rio', 'parrot', 'loro', 'guacamayo', 'macaw', 'canoe', 'canoa', 'ruins', 'ruinas', 'adventure', 'aventura', 'explorer', 'explorador', 'nature', 'naturaleza', 'tropical', 'wildlife', 'fauna', 'flora', 'totem', 'monkey', 'mono', 'trees', 'arboles'],
  time: 'day', floor: ['grass', 'grass', ['plant', 'bush']], __amb: true, ambient: ['birds', 'mist', 'vines'],
  far(g, t, c) {
    skyFill(g, c, -20, 262); clouds(g, t, 90, 2, M.white[3], 2, 8, 26);
    hills(g, 262, [M.green[0], M.green[1], M.green[2]], 2, 34); hills(g, 282, [M.green[0], M.grass[1], M.green[1]], 6, 26);
    for (let i = 0; i < 3; i++) bxBird(g, ((t * (18 + i * 5) + i * 100) % (W + 70)) - 25, 96 + i * 24 + Math.round(Math.sin(t * 1.5 + i) * 4), t, [M.red, M.blue, M.yellow][i], 1.2, i);
  },
  back(g, t) {
    for (const [x, y, w, h] of [[160, 292, 100, 14], [170, 278, 80, 14], [180, 264, 60, 14], [190, 250, 40, 14]]) { R(g, x - 1, y - 1, w + 2, h + 1, INK); R(g, x, y, w, h, M.stone[2]); R(g, x, y, w, 3, M.stone[3]); R(g, x, y + 3, 8, h - 3, M.green[2]); R(g, x + w - 10, y + 2, 10, 5, M.grass[2]); for (let i = 0; i < w; i += 14) R(g, x + i, y + 6, 1, 6, M.stone[1]); }
    for (let layer = 0; layer < 2; layer++) for (let x = -20 + layer * 9; x < 310; x += 26) {
      const sw = Math.round(Math.sin(t * 0.8 + x * 0.1 + layer) * 1.5), r = 17 + (x * 7 + layer * 11) % 9, y = 232 + layer * 26 + (x % 11);
      R(g, x - 3 + sw * 0.3, y, 6, 320 - y, layer ? M.wood[1] : M.wood[0]);
      disc(g, x + sw, y, r, layer ? M.green[1] : M.green[0]); disc(g, x - r * 0.35 + sw, y - r * 0.25, r * 0.7, layer ? M.grass[1] : M.green[1]); disc(g, x - r * 0.4 + sw, y - r * 0.45, r * 0.35, layer ? M.grass[2] : M.green[2]);
    }
    alpha(g, 0.22, () => bands(g, -40, 214, 300, W + 120, [M.green[0], M.green[1]], 6));
  },
  mid(g, t) {
    ground(g, 318, 270, [M.green[0], M.green[1], M.grass[1], M.grass[2], M.grass[3]], { k: 1, specks: 0 });
    waves(g, t * 0.8, 322, -40, 320, [M.teal[0], M.teal[1], M.teal[2], M.teal[4]], 22, 1.4); for (let x = -30; x < 330; x += 3) { const f = Math.sin(x * 0.07 - t * 1.6); if (f > 0.7) R(g, x, 326 + (x % 5) * 2, 6, 1, M.white[3]); }
    R(g, -40, 318, 360, 3, M.wood[1]); R(g, -40, 343, 360, 3, M.wood[1]); dith(g, -40, 346, 360, 5, M.wood[1], M.grass[1], 1);
    for (let i = 0; i < 4; i++) { const x = ((t * 5 + i * 80) % 360) - 40, y = 332 + (i % 2) * 6; disc(g, x, y, 5, M.grass[2]); R(g, x, y - 1, 6, 2, M.teal[1]); R(g, x - 1, y - 5, 2, 3, M.pink[2]); }
    alpha(g, 0.1 + 0.04 * Math.sin(t * 0.7), () => { for (let i = 0; i < 3; i++) { const x0 = 30 + i * 90; for (let y = 200; y < 322; y += 2) R(g, x0 + (y - 200) * 0.45, y, 14, 2, M.yellow[4]); } });
    bxMist(g, t, 286, 22, M.white[2], 0.22, 3, 4);
  },
  props: {
    flower: { x: 12, y: 232, w: 64, h: 104, about: 'giant jungle flower (open spreads the petals, fill grows the stem, light releases pollen)', fills: true, opens: true,
      draw(g, t, S) { const sh = 70 + S.fill * 30, top = 334 - sh, sw = Math.round(Math.sin(t * 1.1) * 1.5), cx = 42 + sw * 0.5, op = 0.35 + 0.65 * S.open;
        R(g, 41, top + 10, 5, sh - 8, INK); R(g, 42, top + 10, 3, sh - 8, M.green[2]); R(g, 42, top + 10, 1, sh - 8, M.green[3]); R(g, 46, top + sh * 0.5, 14, 5, M.green[2]); R(g, 56, top + sh * 0.5 - 6, 8, 8, M.grass[2]); R(g, 22, top + sh * 0.65, 18, 5, M.green[2]); R(g, 16, top + sh * 0.65 - 8, 9, 9, M.grass[2]);
        for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + i * 0.16) - Math.PI * 0.0, ln = 14 + 10 * op, px = cx + Math.cos(a) * ln * 0.9, py = top + 8 + Math.sin(a) * ln * 0.9 * 0.85 + (1 - op) * 10; line(g, cx, top + 10, px, py, 7, M.pink[1]); line(g, cx, top + 10, px, py, 5, i % 2 ? M.pink[2] : M.pink[3]); }
        disc(g, cx, top + 10, 6, M.yellow[2]); disc(g, cx - 1, top + 9, 3, M.yellow[4]); R(g, 16, 330, 12, 4, M.green[1]); R(g, 56, 330, 12, 4, M.green[1]);
        if (S.lit > 0.05) for (let i = 0; i < 8; i++) { const a = (t * 0.7 + i / 8) % 1; R(g, cx + Math.sin(i * 3 + t) * 10, top + 6 - a * 30, 2, 2, M.yellow[4]); } } },
    macaw: { x: 80, y: 190, w: 76, h: 104, about: 'macaw on a branch (open spreads its wings, light shows its colours, fill adds more feathers fluff)', opens: true,
      draw(g, t, S) { const wb = S.open > 0.1 ? Math.round(Math.sin(t * 14) * 4) : 0;
        R(g, 74, 262, 90, 7, INK); R(g, 75, 263, 88, 5, M.wood[1]); R(g, 75, 263, 88, 1, M.wood[3]); for (const x of [90, 140]) { R(g, x, 258, 10, 5, M.green[2]); R(g, x + 4, 254, 8, 6, M.green[3]); }
        const cx = 118, by = 262, b = Math.round(Math.sin(t * 2.2) * 0.8);
        R(g, cx - 9, by - 50 + b, 18, 50, INK); R(g, cx - 8, by - 49 + b, 16, 48, M.red[2]); R(g, cx - 8, by - 49 + b, 4, 48, M.red[3]); R(g, cx + 3, by - 49 + b, 5, 48, M.red[1]);
        R(g, cx - 6, by - 20 + b, 12, 16, M.yellow[2]); R(g, cx - 6, by - 14 + b, 12, 8, M.blue[2]); R(g, cx - 3, by - 2, 4, 8, M.orange[2]); R(g, cx + 2, by - 2, 4, 8, M.orange[2]);
        const wy = by - 36 + b - wb; R(g, cx - 18 - (S.open > 0.1 ? 8 : 0), wy, 12, S.open > 0.1 ? 8 : 24, INK); R(g, cx - 17 - (S.open > 0.1 ? 8 : 0), wy + 1, 10, S.open > 0.1 ? 6 : 22, M.blue[2]); R(g, cx + 6, wy, 12 + (S.open > 0.1 ? 8 : 0), S.open > 0.1 ? 8 : 24, INK); R(g, cx + 7, wy + 1, 10 + (S.open > 0.1 ? 8 : 0), S.open > 0.1 ? 6 : 22, M.blue[1]);
        R(g, cx - 10, by - 70 + b, 20, 20, INK); R(g, cx - 9, by - 69 + b, 18, 18, M.red[2]); R(g, cx - 9, by - 69 + b, 18, 3, M.red[3]); R(g, cx - 8, by - 64 + b, 11, 10, M.white[3]); R(g, cx - 5, by - 63 + b, 3, 3, INK); R(g, cx - 12, by - 61 + b, 8, 8, INK); R(g, cx - 11, by - 60 + b, 7, 6, M.yellow[3]); R(g, cx - 14, by - 58 + b, 4, 6, M.stone[1]);
        for (let i = 0; i < 3; i++) R(g, cx - 3 + i * 4, by - 2, 4, 1, M.dark[1]); R(g, cx - 3, by - 8, 6, 30, M.blue[1]); R(g, cx - 2, by - 8, 4, 24 + Math.round(Math.sin(t * 3) * 2), M.red[2]);
        if (S.lit > 0.05) { sparkle(g, cx + 14, by - 64, t, 0, M.yellow[4]); sparkle(g, cx - 20, by - 30, t + 0.5, 0, M.white[4]); } } },
    canoe: { x: 84, y: 298, w: 84, h: 40, about: 'canoe floating on the river (fill paddles it along the river, light hangs a glowing lantern)', fills: true,
      draw(g, t, S) { const ox = Math.round(S.fill * 40), x = 90 + ox, b = Math.round(Math.sin(t * 1.7) * 1.2), y = 322 + b;
        alpha(g, 0.4, () => R(g, x - 4, y + 12, 74, 2, M.white[3]));
        for (let i = 0; i < 12; i++) { const w = 72 - Math.abs(i - 6) * 0 - (i < 2 ? (2 - i) * 6 : 0) - (i > 9 ? (i - 9) * 6 : 0); R(g, x + (72 - w) / 2 - 1, y + i - 1, w + 2, 2, INK); R(g, x + (72 - w) / 2, y + i, w, 1, i < 3 ? M.wood[3] : i < 8 ? M.wood[2] : M.wood[1]); }
        R(g, x + 6, y - 1, 60, 3, M.wood[3]); R(g, x + 6, y - 1, 60, 1, M.wood[4]); for (let i = 0; i < 5; i++) R(g, x + 12 + i * 12, y + 2, 2, 6, M.wood[1]);
        const l = S.lit > 0.05; R(g, x + 58, y - 22, 2, 22, INK); R(g, x + 54, y - 28, 10, 8, INK); R(g, x + 55, y - 27, 8, 6, l ? M.yellow[4] : M.orange[1]); if (l) glow(g, x + 59, y - 24, 24, M.yellow[3], 0.6);
        const pa = Math.sin(t * 2.4) * 8; line(g, x + 30, y - 14, x + 26 + pa, y + 10, 2, M.wood[3]); R(g, x + 22 + pa, y + 8, 8, 5, M.wood[2]); R(g, x + 28, y - 18, 8, 6, M.skin[1]);
        if (S.fill > 0.02 && S.fill < 0.99) for (let i = 0; i < 3; i++) R(g, x - 4 - i * 5, y + 11, 4, 1, M.white[3]); } },
    totem: { x: 172, y: 156, w: 94, h: 180, about: 'mossy stone totem with glowing eyes (light wakes the eyes, open opens the mouth, fill grows the moss)', fills: true, opens: true,
      draw(g, t, S) { const eye = S.lit > 0.05 ? M.green[4] : M.stone[1], m = S.open > 0.05;
        for (const [y, h, w] of [[286, 48, 78], [232, 56, 68], [168, 64, 60]]) { const x = 219 - w / 2; R(g, x - 1, y - 1, w + 2, h + 2, INK); R(g, x, y, w, h, M.stone[2]); R(g, x, y, 6, h, M.stone[3]); R(g, x + w - 7, y, 7, h, M.stone[1]); R(g, x, y, w, 3, M.stone[3]); for (let i = 0; i < 4; i++) R(g, x + 6 + (i * 17) % (w - 14), y + 8 + (i * 13) % (h - 14), 8, 1, M.stone[1]); const mo = Math.round((0.25 + 0.75 * S.fill) * 10); R(g, x, y, w, 3 + mo * 0.4, M.green[2]); dith(g, x, y + 2, w, 4 + mo, M.green[2], M.stone[2], 1); R(g, x + w - 14, y + 3, 14, 6 + mo * 0.5, M.grass[2]); }
        R(g, 197, 178, 12, 14, INK); R(g, 229, 178, 12, 14, INK); R(g, 199, 180, 8, 10, eye); R(g, 231, 180, 8, 10, eye); R(g, 202, 183, 3, 4, INK); R(g, 234, 183, 3, 4, INK); if (S.lit > 0.05) { glow(g, 203, 185, 18, M.green[3], 0.7); glow(g, 235, 185, 18, M.green[3], 0.7); }
        R(g, 213, 190, 12, 12, M.stone[1]); R(g, 197, 208, 44, 14, INK); R(g, 199, 210, m ? 40 : 40, m ? 10 : 3, m ? M.dark[0] : M.stone[0]); if (m) { for (let i = 0; i < 5; i++) R(g, 201 + i * 8, 210, 4, 3, M.white[3]); R(g, 205, 218, 28, 2, M.fire[2]); glow(g, 219, 216, 22, M.orange[3], 0.4); }
        R(g, 176, 240, 14, 40, M.stone[1]); R(g, 248, 240, 14, 40, M.stone[1]); R(g, 196, 244, 46, 12, M.stone[3]); for (let i = 0; i < 4; i++) { R(g, 202 + i * 10, 247, 4, 6, M.stone[0]); } R(g, 205, 310, 28, 14, M.stone[1]); R(g, 210, 312, 18, 4, M.green[2]); } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    for (const [x, d] of [[10, 1], [262, -1]]) for (let i = 0; i < 6; i++) { const a = (-0.2 - i * 0.28) * d, sw = Math.sin(t * 1.2 + i + x) * 2.5, len = 54 - i * 4; line(g, x, 484, x + Math.cos(a) * len * d + sw, 484 + Math.sin(a) * len * 0.9 - 6 * i + 20 - i * 3, 6, M.green[0]); line(g, x, 484, x + Math.cos(a) * len * 0.6 * d, 484 + Math.sin(a) * len * 0.5 + 10, 3, M.green[1]); }
    fireflies(g, t, 12, 6, 160, 120, M.yellow[4]); bxVine(g, t, 40, 120, 1); bxVine(g, t, 230, 90, 4); bxVine(g, t, 140, 60, 2);
  },
});

/* ======================================================================================================== western town */
defScenario({
  id: 'western-town', name: 'Western town', about: 'Wild-west town at sunset: a saloon with swinging doors, a water tower, a wanted poster, mesas against a huge sun, rolling tumbleweed and drifting dust.',
  topics: ['wild west', 'cowboys', 'outlaws', 'frontier', 'gold rush', 'duel', 'justice', 'bounty', 'history', 'old west', 'saloon'], avoid: ['space', 'futuristic'],
  keywords: ['western', 'wild west', 'far west', 'oeste', 'lejano oeste', 'viejo oeste', 'cowboy', 'vaquero', 'saloon', 'sheriff', 'sheriff', 'alguacil', 'wanted', 'se busca', 'bounty', 'recompensa', 'outlaw', 'bandido', 'forajido', 'duel', 'duelo', 'desert', 'tumbleweed', 'water tower', 'torre de agua', 'frontier', 'frontera', 'gold rush', 'fiebre del oro', 'texas', 'revolver', 'pistolero', 'gunslinger'],
  time: 'dusk', floor: ['planks', 'wood', ['barrel', 'crate']], __amb: true, ambient: ['dust', 'tumbleweed', 'vultures'],
  far(g, t, c) {
    skyFill(g, c, -20, 270); bxSunRays(g, t, 188, 232, 28, M.yellow[3], 14); sunMoon(g, c, 188, 232, 28); glow(g, 188, 232, 56, M.orange[3], 0.3);
    clouds(g, t, 108, 3, M.pink[2], 2, 3, 40); clouds(g, t, 150, 2, M.orange[2], 3, 9, 34);
    for (const [x, w, h] of [[-14, 78, 44], [74, 46, 28], [150, 96, 52], [236, 62, 36]]) bxMesa(g, x, 278, w, h, [M.brick[0], M.brick[0], M.brick[1], M.brick[1]]);
    for (let i = 0; i < 2; i++) { const a = t * 0.45 + i * 3, vx = 70 + i * 100 + Math.cos(a) * 26, vy = 120 + i * 18 + Math.sin(a) * 6; R(g, vx - 4, vy, 3, 1, INK); R(g, vx, vy + (Math.floor(t * 3 + i) % 2), 3, 1, INK); R(g, vx + 4, vy, 3, 1, INK); }
  },
  back(g, t) {
    bxDunes(g, 300, [M.brick[0], M.brick[1], M.orange[1], M.orange[2]], 2.2, 14);
    for (const x of [112, 250]) { R(g, x, 220, 2, 84, INK); R(g, x - 8, 224, 18, 2, INK); R(g, x - 6, 232, 14, 2, INK); } line(g, 112, 224, 250, 224, 1, INK); R(g, 118, 226, 126, 1, M.dark[1]);
    R(g, 138, 262, 50, 42, M.brick[1]); R(g, 138, 262, 50, 3, M.brick[3]); R(g, 134, 256, 58, 8, M.wood[1]); R(g, 134, 256, 58, 2, M.wood[3]); for (let i = 0; i < 6; i++) R(g, 134 + i * 10, 264, 6, 6, i % 2 ? M.white[3] : M.red[2]); R(g, 148, 280, 10, 24, INK); R(g, 166, 272, 12, 10, Math.floor(t * 0.7) % 3 ? M.yellow[3] : M.yellow[1]);
    bxMist(g, t, 290, 12, M.orange[3], 0.2, 5, 6);
  },
  mid(g, t) {
    ground(g, 322, 270, [M.wood[0], M.wood[2], M.sand[2], M.sand[3], M.sand[3]], { k: 1, specks: 28 });
    for (let x = -10; x < 290; x += 4) { const o = (x * 13) % 5; R(g, x, 346 + o * 6, 2 + (x % 3), 1, M.wood[0]); }
    R(g, 120, 316, 4, 20, INK); R(g, 118, 312, 8, 4, M.wood[3]); for (const x of [122, 124]) R(g, x, 318, 1, 18, M.wood[1]);
    R(g, 118, 322, 36, 3, INK); R(g, 118, 323, 36, 1, M.wood[3]); R(g, 150, 316, 4, 20, INK); R(g, 150, 318, 1, 18, M.wood[2]);
    bxTumble(g, t, 342, 30, 70); bxDevil(g, t, 26 + ((t * 3) % 240), 330, 24);
    alpha(g, 0.4, () => { for (let i = 0; i < 12; i++) { const x = ((t * 40 * (0.5 + hs(i)) + hs(i * 4) * 320) % 340) - 20; R(g, x, 326 + hs(i) * 30, 6 + hs(i * 2) * 8, 1, M.sand[4]); } });
  },
  props: {
    saloon: { x: 6, y: 150, w: 112, h: 186, about: 'saloon with swinging doors (open swings them and spills light, fill lights the upper windows, light lights the lanterns)', fills: true, opens: true,
      draw(g, t, S) { const nw = Math.max(1, Math.round(S.fill * 3)), l = S.lit > 0.05;
        R(g, 7, 194, 110, 142, INK); R(g, 8, 195, 108, 140, M.wood[2]); for (let x = 8; x < 116; x += 9) R(g, x, 195, 1, 140, M.wood[1]); R(g, 8, 195, 3, 140, M.wood[3]); R(g, 112, 195, 4, 140, M.wood[1]);
        R(g, 15, 160, 94, 42, INK); R(g, 16, 161, 92, 40, M.wood[2]); R(g, 16, 161, 92, 3, M.wood[3]); for (let x = 16; x < 108; x += 9) R(g, x, 164, 1, 37, M.wood[1]); R(g, 28, 170, 68, 22, INK); R(g, 29, 171, 66, 20, M.red[1]); R(g, 29, 171, 66, 2, M.red[2]); txt(g, 'SALOON', 62, 177, 8, M.yellow[3], 'center');
        R(g, 12, 156, 100, 6, INK); R(g, 13, 157, 98, 4, M.wood[3]); for (let i = 0; i < 3; i++) { const x = 18 + i * 32; R(g, x - 1, 208, 22, 26, INK); R(g, x, 209, 20, 24, i < nw ? M.yellow[3] : M.steel[1]); if (i < nw) glow(g, x + 10, 221, 22, M.yellow[3], 0.5); R(g, x + 9, 209, 2, 24, M.wood[1]); R(g, x, 220, 20, 2, M.wood[1]); }
        R(g, 6, 238, 112, 5, INK); R(g, 7, 239, 110, 3, M.wood[3]); for (let x = 10; x < 114; x += 8) R(g, x, 243, 3, 16, M.wood[1]); R(g, 6, 256, 112, 4, M.wood[1]);
        R(g, 38, 276, 52, 60, INK); R(g, 40, 278, 48, 58, M.dark[1]); const open = S.open > 0.05 ? Math.sin(Math.min(1, S.open) * 1.0 + Math.sin(t * 7) * 0.1 * S.open) : 0;
        if (S.open > 0.05) { R(g, 40, 278, 48, 58, M.yellow[3]); bxSpill(g, 64, 336, 70, M.yellow[3], 0.5, t); for (let i = 0; i < 3; i++) { const a = (t * 0.6 + i / 3) % 1; if (hs(i) > -1) R(g, 74 + i * 6, 270 - a * 24, 3, 3, M.yellow[4]); } }
        const dw = 24 - Math.round(open * 20); R(g, 40, 288, dw, 30, M.wood[3]); R(g, 40 + 48 - dw, 288, dw, 30, M.wood[3]); R(g, 40, 288, dw, 2, M.wood[4]); R(g, 88 - dw, 288, dw, 2, M.wood[4]); R(g, 40 + dw - 2, 288, 2, 30, M.wood[1]); R(g, 88 - dw, 288, 2, 30, M.wood[1]);
        for (const x of [20, 100]) { R(g, x, 258, 2, 6, INK); R(g, x - 3, 264, 8, 9, INK); R(g, x - 2, 265, 6, 7, l ? M.yellow[4] : M.orange[1]); if (l) glow(g, x + 1, 268, 24, M.yellow[3], 0.6); }
        R(g, 6, 330, 112, 6, M.wood[1]); R(g, 6, 330, 112, 1, M.wood[3]); } },
    tower: { x: 126, y: 104, w: 66, h: 232, about: 'wooden water tower (fill raises the water gauge, open pours water from the spout, light glints on the tank)', fills: true, opens: true,
      draw(g, t, S) { const cx = 159;
        for (const d of [-1, 1]) { line(g, cx + d * 14, 190, cx + d * 26, 334, 5, INK); line(g, cx + d * 14, 190, cx + d * 26, 334, 3, M.wood[1]); }
        line(g, cx - 22, 250, cx + 22, 300, 2, M.wood[0]); line(g, cx + 22, 250, cx - 22, 300, 2, M.wood[0]); R(g, cx - 24, 296, 48, 4, M.wood[1]); R(g, cx - 20, 244, 40, 4, M.wood[1]);
        R(g, cx - 28, 138, 56, 52, INK); R(g, cx - 27, 139, 54, 50, M.wood[2]); R(g, cx - 27, 139, 8, 50, M.wood[3]); R(g, cx + 19, 139, 8, 50, M.wood[1]); for (const y of [146, 166, 182]) R(g, cx - 28, y, 56, 3, M.steel[1]); for (let x = -22; x < 26; x += 9) R(g, cx + x, 139, 1, 50, M.wood[0]);
        for (let r = 0; r < 24; r += 3) { const w = 32 - r * 1.2; R(g, cx - w - 1, 134 - r, w * 2 + 2, 3, INK); R(g, cx - w, 134 - r, w * 2, 3, M.brick[2]); R(g, cx - w, 134 - r, w * 0.5, 3, M.brick[3]); } R(g, cx - 2, 106, 4, 8, INK);
        const lv = 0.2 + 0.8 * S.fill; R(g, cx + 10, 144, 8, 40, INK); R(g, cx + 11, 145, 6, 38, M.dark[2]); R(g, cx + 11, 183 - 38 * lv, 6, 38 * lv, M.water[3]);
        if (S.lit > 0.05) { sparkle(g, cx - 18, 150, t, 0, M.white[4]); sparkle(g, cx + 14, 176, t + 0.5, 0, M.yellow[4]); }
        R(g, cx - 22, 186, 8, 12, M.steel[1]); const sp = S.open > 0.05 ? 1 : 0; R(g, cx - 24, 196, 6, 3, M.steel[2]); line(g, cx - 22, 196, cx - 22 - (sp ? 2 : 0), 204 + (sp ? 6 : 0), 3, M.steel[2]);
        if (sp) { for (let i = 0; i < 14; i++) { const a = (t * 2.2 + i / 14) % 1; R(g, cx - 24 + Math.sin(i) * 1, 204 + a * 126, 2, 4, M.water[3]); } disc(g, cx - 24, 336, 8, M.water[2]); R(g, cx - 32, 333, 16, 2, M.water[4]); } } },
    poster: { x: 200, y: 234, w: 66, h: 102, about: 'wanted poster nailed to a post (stamp or fill raises the reward, light glows the face, burst tears it)', fills: true, stamps: true,
      draw(g, t, S) { const sw = Math.round(Math.sin(t * 2.2) * 1);
        R(g, 230, 286, 6, 50, INK); R(g, 231, 286, 4, 50, M.wood[2]); R(g, 224, 330, 18, 6, M.wood[1]);
        R(g, 202 + sw, 238, 62, 80, INK); R(g, 203 + sw, 239, 60, 78, M.sand[3]); R(g, 203 + sw, 239, 60, 3, M.sand[4]); R(g, 203 + sw, 314, 60, 3, M.sand[1]);
        txt(g, 'WANTED', 233 + sw, 244, 8, M.brick[1], 'center'); R(g, 214 + sw, 258, 38, 34, INK); R(g, 215 + sw, 259, 36, 32, M.skin[2]);
        R(g, 210 + sw, 256, 46, 5, INK); R(g, 217 + sw, 247, 32, 10, INK); R(g, 217 + sw, 255, 32, 2, M.brick[2]); R(g, 220 + sw, 268, 6, 4, INK); R(g, 240 + sw, 268, 6, 4, INK); R(g, 221 + sw, 269, 3, 2, S.lit > 0.05 ? M.red[3] : M.white[3]); R(g, 241 + sw, 269, 3, 2, S.lit > 0.05 ? M.red[3] : M.white[3]); R(g, 222 + sw, 278, 22, 4, M.wood[1]); R(g, 226 + sw, 283, 14, 3, M.dark[1]);
        txt(g, '$' + (S.fill > 0 ? Math.round(S.fill * 9) * 100 + 100 : 100), 233 + sw, 298, 8, M.dark[1], 'center'); R(g, 205 + sw, 242, 3, 3, INK); R(g, 258 + sw, 242, 3, 3, INK);
        if (S.ev.stamp >= 0) { R(g, 208 + sw, 304, 50, 9, M.red[2]); txt(g, 'PAID', 233 + sw, 305, 8, M.white[3], 'center'); } if (S.lit > 0.05) glow(g, 233, 275, 30, M.red[3], 0.3); } },
    reward: libProp('coin', 204, 180, 2.4, { about: 'reward coin spinning above the poster (pulse hops it)' }),
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    R(g, -20, 438, 58, 50, M.wood[0]); R(g, -20, 438, 58, 3, M.wood[2]); R(g, 240, 446, 70, 46, M.wood[0]); R(g, 240, 446, 70, 3, M.wood[2]);
    dust(g, t, 20, 7, M.sand[4], 24, 300, 160);
  },
});

/* ======================================================================================================== haunted park */
defScenario({
  id: 'haunted-park', name: 'Haunted park', about: 'Moonlit haunted fairground for Halloween: a slowly turning ferris wheel with blinking lights, a ghost, glowing jack-o-lanterns, bats on a dead branch, a roller coaster, bats crossing the moon and rolling fog.',
  topics: ['halloween', 'horror', 'scary stories', 'ghosts', 'fear', 'mystery', 'haunted places', 'october', 'spooky', 'fairground', 'urban legends'], avoid: ['sunny', 'beach'],
  keywords: ['halloween', 'embrujado', 'embrujada', 'haunted', 'fantasma', 'fantasmas', 'ghost', 'ghosts', 'miedo', 'fear', 'terror', 'horror', 'spooky', 'espeluznante', 'calabaza', 'calabazas', 'pumpkin', 'pumpkins', 'murcielago', 'murcielagos', 'bat', 'bats', 'noria', 'ferris wheel', 'parque', 'park', 'feria', 'fairground', 'luna llena', 'full moon', 'niebla', 'fog', 'brujas', 'witch', 'cementerio', 'graveyard', 'octubre', 'october', 'misterio', 'mystery'],
  time: 'night', floor: ['tiles', 'stone', ['rock', 'plant']], __amb: true, ambient: ['bats', 'fog', 'coaster'],
  far(g, t, c) {
    bands(g, -40, -20, 290, W + 120, [M.dark[1], M.purple[0], M.purple[0], M.purple[1], M.purple[1], M.pink[0]], 8); stars(g, t, 30, 7, 140);
    disc(g, 70, 158, 32, M.yellow[1]); disc(g, 70, 158, 30, M.yellow[3]); disc(g, 60, 150, 10, M.yellow[2]); disc(g, 82, 168, 7, M.yellow[2]); disc(g, 78, 142, 5, M.yellow[2]); glow(g, 70, 158, 54, M.yellow[3], 0.22);
    for (let i = 0; i < 4; i++) { const x = ((t * (26 + i * 6) + i * 80) % 360) - 40, y = 120 + i * 20 + Math.sin(t * 2 + i * 2) * 14; bxBat(g, x, y, t + i, 1.2); }
    const cx = 120, cy = 232;
    for (let i = 12; i < 30; i++) { const x = -20 + i * 11, y = 226 - 34 * Math.sin(i * 0.5 + 0.4) * (i > 10 ? 1 : 0.35) - (i % 8) * 0; R(g, x, y, 11, 2, M.dark[3]); if (i % 3 === 0) R(g, x + 4, y + 2, 2, 300 - y, M.dark[2]); }
    const cp = ((t * 0.07) % 1) * 330 - 20, i0 = (cp + 20) / 11; R(g, cp, 226 - 34 * Math.sin(i0 * 0.5 + 0.4) * (i0 > 10 ? 1 : 0.35) - 6, 14, 6, M.red[2]); R(g, cp + 2, 226 - 34 * Math.sin(i0 * 0.5 + 0.4) * (i0 > 10 ? 1 : 0.35) - 8, 4, 2, M.yellow[3]);
  },
  back(g, t) {
    for (const [x, h] of [[196, 52], [24, 40], [104, 36]]) { R(g, x - 1, 304 - h, 3, h, M.dark[0]); line(g, x, 304 - h * 0.7, x - 10, 304 - h - 4, 2, M.dark[0]); line(g, x, 304 - h * 0.55, x + 12, 304 - h * 0.9, 2, M.dark[0]); line(g, x - 10, 304 - h - 4, x - 16, 304 - h - 12, 1, M.dark[0]); }
    for (let x = -10; x < 290; x += 8) { R(g, x, 300, 2, 22, M.dark[0]); R(g, x - 1, 297, 4, 4, M.dark[0]); } R(g, -20, 308, 320, 2, M.dark[0]);
    const tx = 168; for (let r = 0; r < 30; r += 3) { const w = 34 - r * 0.9; R(g, tx - w, 262 + r, w * 2, 3, Math.floor(r / 3) % 2 ? M.white[1] : M.purple[2]); } R(g, tx - 36, 292, 72, 14, M.purple[1]); R(g, tx - 1, 244, 2, 20, INK); R(g, tx + 1, 244, 10 + Math.round(Math.sin(t * 3) * 2), 5, M.red[2]);
    bxMist(g, t, 286, 20, M.purple[3], 0.3, 4, 5);
  },
  mid(g, t) {
    ground(g, 318, 270, [M.dark[0], M.stone[0], M.stone[1], M.stone[2], M.stone[3]], { k: 1, specks: 0 });
    for (let y = 322; y < 346; y += 6) for (let x = -10 + ((y / 6) % 2) * 9; x < 290; x += 18) { R(g, x, y, 16, 5, M.stone[1]); R(g, x, y, 16, 1, M.stone[2]); R(g, x + 15, y, 1, 5, M.stone[0]); }
    for (const x of [14, 258]) { const f = Math.sin(t * 5 + x) > -0.9; R(g, x - 1, 250, 3, 86, INK); R(g, x, 250, 1, 86, M.steel[2]); R(g, x - 6, 240, 13, 10, INK); R(g, x - 5, 241, 11, 8, f ? M.green[3] : M.green[1]); if (f) glow(g, x, 246, 32, M.green[3], 0.4); }
    bxMist(g, t, 326, 22, M.purple[3], 0.32, 7, 7); bxMist(g, t * 0.8 + 3, 342, 18, M.white[1], 0.22, 2, 4);
  },
  props: {
    ghost: libProp('ghost', 12, 256, 2.2, { about: 'friendly ghost floating by (open fades it out, light makes it glow)' }),
    pumpkins: { x: 76, y: 294, w: 54, h: 44, about: 'pile of glowing jack-o-lanterns (fill adds pumpkins, light lights the candles inside, burst smashes them)', fills: true,
      draw(g, t, S) { const n = Math.max(1, Math.ceil(S.fill * 3)), lit = S.lit > 0.05 || true, fl = flicker(t, 3);
        for (const [x, y, r, k] of [[92, 328, 11, 0], [116, 330, 9, 1], [104, 316, 8, 2]].slice(0, Math.max(2, n))) { ball(g, x, y, r, M.orange); R(g, x - 1, y - r - 2, 3, 4, M.green[2]); R(g, x + 1, y - r - 3, 4, 2, M.green[2]);
          const on = lit && hs(Math.floor(t * 9) + k) > 0.05; R(g, x - r * 0.55, y - 3, 4, 4, on ? M.yellow[4] : M.dark[1]); R(g, x + r * 0.55 - 3, y - 3, 4, 4, on ? M.yellow[4] : M.dark[1]); R(g, x - r * 0.5, y + 3, r, 3, on ? M.yellow[3] : M.dark[1]); R(g, x - r * 0.25, y + 3, 2, 2, M.dark[1]); R(g, x + r * 0.2, y + 3, 2, 2, M.dark[1]);
          glow(g, x, y, 12 + (S.lit > 0.05 ? 10 : 0), M.orange[3], 0.12 + 0.1 * fl + 0.25 * S.lit); }
        for (let i = 0; i < 3; i++) sparkle(g, 84 + i * 16, 296 + (i % 2) * 6, t + i * 0.4, 0, M.orange[3]); } },
    bats: { x: 8, y: 150, w: 104, h: 76, about: 'bats hanging from a dead branch (open sends them flying, fill adds bats, light lights their eyes)', fills: true, opens: true,
      draw(g, t, S) { const n = Math.max(3, 3 + Math.round(S.fill * 2));
        R(g, 6, 160, 106, 5, INK); R(g, 7, 161, 104, 3, M.dark[3]); R(g, 100, 164, 4, 22, M.dark[3]); R(g, 94, 184, 10, 3, M.dark[3]);
        for (let i = 0; i < n; i++) { const x = 18 + i * 17, fly = S.open > 0.1;
          if (fly) { const a = t * 2.4 + i * 1.3, bx = 58 + Math.cos(a) * (34 + i * 3), by = 160 + Math.sin(a * 1.3) * 18 + 16; bxBat(g, bx, by, t + i, 1.2); }
          else { R(g, x - 1, 165, 2, 3, M.dark[2]); R(g, x - 4, 168, 9, 12, INK); R(g, x - 3, 169, 7, 10, M.dark[3]); R(g, x - 3, 166, 2, 3, M.dark[3]); R(g, x + 2, 166, 2, 3, M.dark[3]); R(g, x - 2, 171, 2, 2, S.lit > 0.05 ? M.red[3] : M.yellow[3]); R(g, x + 1, 171, 2, 2, S.lit > 0.05 ? M.red[3] : M.yellow[3]); } } } },
    ferris: { x: 136, y: 118, w: 128, h: 220, about: 'tall ferris wheel with blinking bulbs (fill spins it faster, light switches every bulb on, open sends a gondola up)', fills: true, opens: true,
      draw(g, t, S) { const cx = 200, cy = 186, r = 58, sp = 0.25 + S.fill * 1.1, a0 = t * sp;
        for (const d of [-1, 1]) { line(g, cx, cy, cx + d * 30, 334, 5, INK); line(g, cx, cy, cx + d * 30, 334, 3, M.steel[2]); } R(g, cx - 40, 332, 80, 4, M.steel[1]);
        for (let i = 0; i < 40; i++) { const a = i * Math.PI * 2 / 40; R(g, cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 3, 3, M.steel[3]); }
        for (let i = 0; i < 12; i++) { const a = a0 + i * Math.PI / 6; line(g, cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, M.steel[2]); }
        for (let i = 0; i < 24; i++) { const a = -a0 * 0.3 + i * Math.PI / 12, on = S.lit > 0.05 || Math.floor(t * 3 + i * 0.7) % 3 !== 0, rp = M[['red', 'yellow', 'green', 'pink'][i % 4]]; const bx = cx + Math.cos(a) * (r + 2), by = cy + Math.sin(a) * (r + 2); R(g, bx - 1, by - 1, 3, 3, on ? rp[3] : M.dark[2]); if (on && i % 2 === 0) glow(g, bx, by, 8, rp[3], 0.35); }
        for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4, gx = cx + Math.cos(a) * r, gy = cy + Math.sin(a) * r, lift = S.open > 0.1 && i === 0 ? -6 : 0; R(g, gx, gy, 1, 6, M.steel[2]); R(g, gx - 5, gy + 5 + lift, 11, 8, INK); R(g, gx - 4, gy + 6 + lift, 9, 6, [M.red, M.yellow, M.teal, M.pink][i % 4][2]); R(g, gx - 4, gy + 6 + lift, 9, 2, [M.red, M.yellow, M.teal, M.pink][i % 4][3]); R(g, gx - 1, gy + 3 + lift, 3, 3, M.skin[2]); }
        disc(g, cx, cy, 7, M.steel[1]); disc(g, cx, cy, 5, M.steel[3]); disc(g, cx, cy, 2, M.red[2]); } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    for (const [x, r] of [[-4, 24], [262, 30], [290, 20]]) { disc(g, x, 478, r, M.dark[0]); R(g, x - 2, 478 - r - 14, 3, 16, M.dark[0]); }
    for (let i = 0; i < 2; i++) bxBat(g, ((t * (36 + i * 14) + i * 140) % 360) - 40, 372 + i * 28 + Math.sin(t * 3 + i) * 10, t + i * 2, 1.6);
    bxMist(g, t * 1.2, 420, 24, M.purple[3], 0.24, 11, 8); fireflies(g, t, 8, 11, 240, 100, M.green[4]);
  },
});

/* ======================================================================================================== temple */
/* tiny hieroglyph (7x8 px): eye, ankh, bird, wave, sun */
function bxGlyph(g, x, y, k, c) {
  switch (k % 5) {
    case 0: R(g, x, y + 3, 7, 1, c); R(g, x + 2, y + 1, 3, 5, c); R(g, x + 3, y + 3, 1, 1, INK); break;
    case 1: R(g, x + 3, y + 3, 1, 6, c); R(g, x + 1, y + 4, 5, 1, c); R(g, x + 2, y, 3, 1, c); R(g, x + 2, y + 1, 1, 2, c); R(g, x + 4, y + 1, 1, 2, c); break;
    case 2: R(g, x + 1, y + 3, 5, 3, c); R(g, x + 5, y + 1, 2, 3, c); R(g, x + 6, y + 2, 2, 1, c); R(g, x, y + 5, 2, 2, c); R(g, x + 2, y + 6, 1, 2, c); R(g, x + 4, y + 6, 1, 2, c); break;
    case 3: R(g, x, y + 4, 2, 1, c); R(g, x + 2, y + 3, 2, 1, c); R(g, x + 4, y + 4, 2, 1, c); R(g, x, y + 6, 2, 1, c); R(g, x + 2, y + 5, 2, 1, c); R(g, x + 4, y + 6, 2, 1, c); break;
    default: R(g, x + 2, y + 2, 3, 3, c); R(g, x + 3, y, 1, 7, c); R(g, x, y + 3, 7, 1, c);
  }
}
defScenario({
  id: 'temple', name: 'Ancient temple', about: 'Dusk at an ancient desert temple: pyramids against a huge sun, stone steps and columns, burning braziers, a hieroglyph tablet whose glyphs light up, a sealed stone door and a golden idol.',
  topics: ['ancient civilizations', 'egypt', 'archaeology', 'treasure', 'mystery', 'history', 'temples', 'pharaohs', 'ancient empires', 'lost treasure', 'myths'], avoid: ['modern', 'futuristic'],
  keywords: ['temple', 'templo', 'ancient', 'antiguo', 'antigua', 'imperio', 'empire', 'egypt', 'egipto', 'pyramid', 'piramide', 'piramides', 'pharaoh', 'faraon', 'hieroglyph', 'jeroglifico', 'jeroglificos', 'idol', 'idolo', 'treasure', 'tesoro', 'golden', 'dorado', 'oro', 'gold', 'archaeology', 'arqueologia', 'tomb', 'tumba', 'ruins', 'ruinas', 'maya', 'azteca', 'aztec', 'inca', 'civilizacion', 'civilization', 'torch', 'antorcha', 'mummy', 'momia'],
  time: 'dusk', floor: ['tiles', 'sand', ['rock', 'crate']], __amb: true, ambient: ['torch', 'sand', 'glint'],
  far(g, t, c) {
    skyFill(g, c, -20, 290); bxSunRays(g, t, 150, 214, 34, M.yellow[3], 16); sunMoon(g, c, 150, 214, 34); glow(g, 150, 214, 40, M.orange[3], 0.2);
    clouds(g, t, 96, 2, M.pink[2], 2, 5, 40);
    bxCone(g, 52, 176, 292, 96, [M.sand[0], M.sand[0], M.sand[1]], 0, M.white, 8); bxCone(g, 244, 198, 292, 66, [M.sand[0], M.sand[0], M.sand[1]], 0, M.white, 8);
    bxDunes(g, 296, [M.brick[0], M.brick[1], M.orange[1], M.orange[2]], 0.7, 18);
  },
  back(g, t) {
    R(g, -10, 134, 290, 30, INK); R(g, -8, 136, 286, 26, M.sand[1]); R(g, -8, 136, 286, 3, M.sand[2]); R(g, -8, 160, 286, 2, M.sand[0]);
    for (let x = -4; x < 270; x += 15) bxGlyph(g, x + 2, 144, x / 15 + 2, M.sand[0]);
    for (const x of [-4, 66, 134, 202, 258]) { R(g, x - 1, 160, 18, 150, INK); R(g, x, 160, 16, 150, M.sand[1]); R(g, x, 160, 4, 150, M.sand[2]); R(g, x + 12, 160, 4, 150, M.sand[0]); for (let y = 170; y < 308; y += 14) R(g, x, y, 16, 1, M.sand[0]); R(g, x - 3, 156, 22, 6, M.sand[2]); R(g, x - 3, 306, 22, 6, M.sand[2]); }
    R(g, -10, 300, 290, 8, M.sand[0]);
    bxShimmer(g, t, 226, 296, M.white[3], 0.12);
  },
  mid(g, t) {
    ground(g, 322, 270, BXSAND, { k: 1, specks: 20 });
    for (let i = 0; i < 6; i++) { const y = 304 + i * 6, x0 = 76 - i * 12, x1 = 194 + i * 12; R(g, x0 - 1, y - 1, x1 - x0 + 2, 7, INK); R(g, x0, y, x1 - x0, 6, i % 2 ? M.sand[1] : M.sand[2]); R(g, x0, y, x1 - x0, 1, M.sand[3]); R(g, x0, y + 4, x1 - x0, 2, M.sand[0]); }
    for (const x of [30, 238]) { R(g, x - 5, 306, 11, 30, INK); R(g, x - 4, 307, 9, 28, M.sand[1]); R(g, x - 4, 307, 3, 28, M.sand[2]); R(g, x - 8, 302, 17, 6, M.stone[2]); R(g, x - 8, 302, 17, 2, M.stone[3]); bxFlame(g, t, x, 301, 1.2, x); }
    alpha(g, 0.45, () => { for (let i = 0; i < 12; i++) { const x = ((t * 18 * (0.6 + hs(i)) + hs(i * 4) * 320) % 340) - 20; R(g, x, 330 + hs(i) * 14, 5 + hs(i * 2) * 8, 1, M.sand[3]); } });
    for (let i = 0; i < 8; i++) { const a = (t * 0.5 + hs(i)) % 1; R(g, 34 + hs(i + 4) * 14 + (i % 2) * 200, 300 - a * 80, 1, 1, M.fire[3]); }
  },
  props: {
    tablet: { x: 8, y: 182, w: 66, h: 154, about: 'carved hieroglyph tablet (fill lights the glyphs one by one, light makes them all glow)', fills: true,
      draw(g, t, S) { const n = Math.round(S.fill * 10), all = S.lit > 0.05;
        R(g, 9, 190, 62, 146, INK); R(g, 10, 191, 60, 144, M.stone[2]); R(g, 10, 191, 5, 144, M.stone[3]); R(g, 66, 191, 4, 144, M.stone[1]); R(g, 10, 191, 60, 3, M.stone[3]);
        for (let y = 0; y < 5; y++) for (let x = 0; x < 2; x++) { const i = y * 2 + x, on = all || i < n; const gx = 20 + x * 24, gy = 202 + y * 24; R(g, gx - 3, gy - 3, 15, 16, M.stone[1]); bxGlyph(g, gx, gy, i, on ? M.gold[3] : M.stone[0]); if (on) glow(g, gx + 4, gy + 4, 12 + (all ? 4 : 0), M.gold[3], 0.25); }
        R(g, 4, 328, 74, 8, M.stone[1]); R(g, 4, 328, 74, 2, M.stone[3]); } },
    brazier: { x: 80, y: 238, w: 28, h: 98, about: 'standing brazier with a flame (fill grows the fire, light makes it blaze and throw sparks)', fills: true,
      draw(g, t, S) { const s = 1.2 + S.fill * 0.9 + S.lit * 0.5;
        R(g, 92, 280, 4, 56, INK); R(g, 93, 280, 2, 56, M.steel[3]); R(g, 86, 330, 16, 6, M.steel[1]); R(g, 84, 272, 20, 10, INK); R(g, 85, 273, 18, 8, M.gold[2]); R(g, 85, 273, 18, 2, M.gold[3]); R(g, 86, 281, 16, 3, M.gold[1]);
        bxFlame(g, t, 94, 273, s, 2); for (let i = 0; i < 4 + Math.round(S.lit * 4); i++) { const a = (t * 0.8 + i / 6) % 1; R(g, 94 + Math.sin(i * 4 + t) * 9 * a, 270 - a * 40 * s, 2, 2, M.fire[3]); } } },
    idol: { x: 112, y: 250, w: 52, h: 86, about: 'golden idol on a pedestal (light makes it blaze with rays, open lifts it from the pedestal, fill piles coins at its feet)', fills: true, opens: true,
      draw(g, t, S) { const lift = Math.round(S.open * 10) + (S.open > 0.1 ? Math.round(Math.sin(t * 20) * 0.8) : 0), cx = 138, gl = ((t * 0.7) % 1.7) * 60 - 10;
        R(g, 118, 316, 40, 20, INK); R(g, 119, 317, 38, 18, M.sand[1]); R(g, 119, 317, 38, 2, M.sand[2]); R(g, 124, 306, 28, 12, INK); R(g, 125, 307, 26, 10, M.sand[2]); R(g, 125, 307, 26, 2, M.sand[3]); R(g, 125, 313, 26, 2, M.sand[0]);
        if (S.lit > 0.05) alpha(g, 0.35, () => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.4; line(g, cx, 282 - lift, cx + Math.cos(a) * 34, 282 - lift + Math.sin(a) * 34, 3, M.yellow[3]); } });
        const y0 = 258 - lift; R(g, cx - 13, y0, 26, 8, INK); R(g, cx - 12, y0 + 1, 24, 6, M.gold[3]); R(g, cx - 18, y0 - 6, 6, 14, INK); R(g, cx + 12, y0 - 6, 6, 14, INK); R(g, cx - 17, y0 - 5, 4, 12, M.gold[2]); R(g, cx + 13, y0 - 5, 4, 12, M.gold[2]);
        R(g, cx - 12, y0 + 8, 24, 38 - 8, INK); R(g, cx - 11, y0 + 9, 22, 36 - 8, M.gold[2]); R(g, cx - 11, y0 + 9, 5, 28, M.gold[3]); R(g, cx + 6, y0 + 9, 5, 28, M.gold[1]); R(g, cx - 8, y0 + 16, 16, 3, M.gold[1]); R(g, cx - 4, y0 + 22, 8, 8, M.red[2]); R(g, cx - 4, y0 + 22, 8, 2, M.red[3]);
        R(g, cx - 14, y0 + 38, 28, 8, INK); R(g, cx - 13, y0 + 39, 26, 6, M.gold[2]); R(g, cx - 9, y0 + 2, 4, 3, INK); R(g, cx + 5, y0 + 2, 4, 3, INK); R(g, cx - 8, y0 + 3, 2, 1, S.lit > 0.05 ? M.red[3] : M.white[3]); R(g, cx + 6, y0 + 3, 2, 1, S.lit > 0.05 ? M.red[3] : M.white[3]);
        for (let r = y0; r < y0 + 40; r += 2) if (Math.abs((r - y0) * 0.9 + cx - gl - cx + 4) % 40 < 3) R(g, cx - 10, r, 20, 2, M.white[4]);
        glow(g, cx, y0 + 20, 22, M.yellow[3], 0.15 + 0.3 * S.lit);
        for (let i = 0; i < Math.round(S.fill * 6); i++) { disc(g, 122 + i * 6, 335 - (i % 2) * 2, 3, M.gold[3]); R(g, 121 + i * 6, 333 - (i % 2) * 2, 1, 1, M.gold[4]); }
        if (S.lit > 0.05) { sparkle(g, cx - 18, y0, t, 0, M.white[4]); sparkle(g, cx + 18, y0 + 24, t + 0.5, 0, M.yellow[4]); } } },
    door: { x: 170, y: 160, w: 96, h: 176, about: 'sealed stone door with glyphs (open slides it up and floods the doorway with light, light makes the glyph columns glow)', opens: true, fills: true,
      draw(g, t, S) { const up = Math.round(Math.max(S.open, 0) * 62), gl = S.lit > 0.05, n = Math.round(S.fill * 6);
        R(g, 171, 168, 94, 168, INK); R(g, 172, 169, 92, 166, M.sand[1]); R(g, 172, 169, 92, 4, M.sand[2]); R(g, 172, 169, 5, 166, M.sand[2]); R(g, 259, 169, 5, 166, M.sand[0]);
        for (let i = 0; i < 6; i++) { const on = gl || i < n; for (const x of [180, 248]) { bxGlyph(g, x, 178 + i * 24, i + (x > 200 ? 2 : 0), on ? M.gold[3] : M.sand[0]); if (on) glow(g, x + 4, 182 + i * 24, 10, M.gold[3], 0.22); } }
        R(g, 194, 200, 48, 136, INK); R(g, 196, 202, 44, 134, M.dark[0]); if (S.open > 0.05) { R(g, 196, 202, 44, 134, M.yellow[3]); glow(g, 218, 270, 34, M.yellow[3], 0.3 * S.open); alpha(g, 0.4, () => { for (let i = 0; i < 6; i++) R(g, 200 + i * 7, 202 + i * 10, 4, 130 - i * 10, M.white[4]); }); bxSpill(g, 218, 336, 70, M.yellow[3], 0.5, t); }
        R(g, 196, 202 - up, 44, 134, M.sand[0]); R(g, 196, 202 - up, 44, 3, M.sand[2]); for (let y = 214; y < 336; y += 18) R(g, 196, y - up, 44, 1, M.sand[0]); R(g, 212, 250 - up, 12, 12, INK); R(g, 214, 252 - up, 8, 8, M.gold[2]); if (S.open < 0.99) R(g, 216, 254 - up, 4, 4, gl ? M.yellow[4] : M.gold[1]);
        R(g, 190, 194, 56, 8, M.sand[2]); R(g, 190, 194, 56, 2, M.sand[3]); } },
  },
  fore(g, t) {
    bxAmb(g, t, this.id);
    R(g, -20, 440, 58, 50, M.orange[0]); R(g, -20, 440, 58, 3, M.sand[1]); R(g, 240, 448, 70, 44, M.orange[0]); R(g, 240, 448, 70, 3, M.sand[1]);
    dust(g, t, 20, 5, M.sand[3], 14, 280, 200); for (let i = 0; i < 6; i++) { const a = (t * 0.35 + hs(i)) % 1; alpha(g, 1 - a, () => R(g, 16 + hs(i + 2) * 238, 430 - a * 90, 2, 2, M.fire[3])); }
  },
});
