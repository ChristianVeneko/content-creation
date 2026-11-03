/* kit.js: reusable scene parts used by the scenarios. Colours are master ramps (M.x); the style remaps them. */
'use strict';
const GYD = 345; // default ground line (feet) in the 480 px logical frame
const sky = (c) => SKYS[c.time || 'day'];
function skyFill(g, c, y0 = -20, y1 = 300, w = W + 120) { bands(g, -40, y0, y1, w, sky(c), 8); }
function sunMoon(g, c, x, y, r = 18) {
  if ((c.time || 'day') === 'night') { disc(g, x, y, r, '#e8eefc'); disc(g, x - r * 0.35, y - r * 0.2, Math.max(2, r * 0.7), SKYS.night[3]); }
  else { disc(g, x, y, r + 5, c.time === 'dusk' ? '#f7a35c' : '#ffe9a0'); disc(g, x, y, r, c.time === 'dusk' ? '#ffd08a' : '#fff6c8'); }
}
function ground(g, y, w, ramp, o = {}) {
  const x0 = -40, ww = w + 80;
  R(g, x0, y, ww, H - y + 20, ramp[1]); dith(g, x0, y, ww, H - y + 20, ramp[1], ramp[0], o.k == null ? 0 : o.k);
  R(g, x0, y, ww, 2, ramp[3]); dith(g, x0, y + 2, ww, 8, ramp[3], ramp[1], 2);
  for (let i = 0; i < (o.specks == null ? 40 : o.specks); i++) R(g, ((i * 41) % (w + 60)) - 30, y + 14 + hs(i + 5) * (H - y - 30), 3, 1 + (i % 2), ramp[0]);
}
function planks(g, y, w, ramp) { // wooden or tiled floor with seams
  ground(g, y, w, ramp, { specks: 0 });
  for (let r = 0; r < 6; r++) { const yy = y + 14 + r * 22; R(g, -40, yy, w + 80, 1, ramp[0]); for (let x = (r % 2) * 20 - 40; x < w + 40; x += 40) R(g, x, yy, 1, 22, ramp[0]); }
}
function brickWall(g, x, y, w, h, ramp, bw = 16, bh = 8) {
  R(g, x, y, w, h, ramp[1]);
  for (let r = 0; r * bh < h; r++) { R(g, x, y + r * bh, w, 1, ramp[0]); for (let c = (r % 2) * (bw / 2); c < w; c += bw) R(g, x + c, y + r * bh, 1, bh, ramp[0]); if (hs(r * 7) > 0.4) R(g, x + ((r * 37) % Math.max(1, w - 8)), y + r * bh + 2, 6, 3, ramp[2]); }
}
function windowBox(g, x, y, w, h, lit, ramp = M.blue, frame = M.wood) {
  R(g, x - 2, y - 2, w + 4, h + 4, INK); R(g, x - 1, y - 1, w + 2, h + 2, frame[2]);
  R(g, x, y, w, h, lit ? M.yellow[2] : ramp[1]);
  if (STYLE.shade === 'bevel') { R(g, x, y, w, 2, lit ? M.yellow[3] : ramp[2]); R(g, x + 2, y + 3, Math.max(2, w / 4), 2, lit ? M.yellow[4] : ramp[3]); }
  R(g, x + w / 2, y, 1, h, frame[1]); R(g, x, y + h / 2, w, 1, frame[1]);
}
function doorBox(g, x, y, w, h, ramp = M.wood) { box(g, x, y, w, h, ramp); R(g, x + w * 0.2, y + h * 0.15, w * 0.6, h * 0.3, ramp[1]); R(g, x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.3, ramp[1]); disc(g, x + w - 4, y + h / 2, 1, M.gold[3]); }
function shelf(g, x, y, w, rows, seed = 1, cols = ['red', 'yellow', 'green', 'teal', 'purple', 'orange'], rh = 24) {
  R(g, x - 2, y - 2, w + 4, rows * rh + 6, INK); R(g, x, y, w, rows * rh + 2, M.wood[1]);
  for (let r = 0; r < rows; r++) {
    const yy = y + (r + 1) * rh - 4; R(g, x, yy + 3, w, 3, M.wood[2]); if (STYLE.shade === 'bevel') R(g, x, yy + 3, w, 1, M.wood[4]);
    for (let i = 0, cx = x + 3; cx < x + w - 9; i++) {
      const bw = 5 + Math.floor(hs(seed + r * 9 + i) * 6), bh = 10 + Math.floor(hs(seed * 3 + r * 5 + i) * 9), rp = M[cols[Math.floor(hs(seed + r + i * 4) * cols.length)]];
      if (STYLE.outline !== 'none') R(g, cx - 1, yy - bh - 1, bw + 2, bh + 1, INK);
      R(g, cx, yy - bh, bw, bh, rp[2]); R(g, cx, yy - bh, 1, bh, rp[3]); R(g, cx + bw - 1, yy - bh, 1, bh, rp[1]); cx += bw + 1;
    }
  }
}
function crate(g, x, y, s, ramp = M.wood) {
  box(g, x, y, s, s, ramp); R(g, x + 1, y + 1, 2, s - 2, ramp[1]); R(g, x + s - 3, y + 1, 2, s - 2, ramp[1]);
  line(g, x + 2, y + 2, x + s - 3, y + s - 3, 2, ramp[1]);
}
function barrel(g, x, y, w, h, ramp = M.wood) { box(g, x, y, w, h, ramp); R(g, x, y + h * 0.2, w, 2, M.steel[2]); R(g, x, y + h * 0.7, w, 2, M.steel[2]); }
function lampPost(g, x, y, t, c = M.yellow, h = 60) {
  R(g, x - 1, y - h, 3, h, INK); R(g, x, y - h, 1, h, M.steel[2]); box(g, x - 5, y - h - 6, 11, 7, M.steel);
  const on = Math.sin(t * 1.3 + x) > -0.97; R(g, x - 4, y - h - 5, 9, 5, on ? c[3] : c[1]); if (on) glow(g, x, y - h, 26, c[2], 0.5);
}
function ceilLamp(g, x, y, t, c = M.yellow) { R(g, x, 0, 1, y, INK); R(g, x - 6, y, 13, 4, M.steel[2]); R(g, x - 4, y + 4, 9, 3, c[3]); glow(g, x, y + 8, 34, c[2], 0.5 + 0.08 * Math.sin(t * 7 + x)); }
function pipeH(g, x, y, w, ramp = M.steel, h = 5) { R(g, x, y - 1, w, h + 2, INK); R(g, x, y, w, h, ramp[2]); R(g, x, y, w, 1, ramp[3]); R(g, x, y + h - 1, w, 1, ramp[1]); for (let i = x + 12; i < x + w - 4; i += 28) R(g, i, y - 2, 3, h + 4, ramp[1]); }
function pipeV(g, x, y, h, ramp = M.steel, w = 5) { R(g, x - 1, y, w + 2, h, INK); R(g, x, y, w, h, ramp[2]); R(g, x, y, 1, h, ramp[3]); R(g, x + w - 1, y, 1, h, ramp[1]); }
function tree(g, x, y, h, seed = 1, kind = 0, ramp = M.grass) {
  R(g, x - 2, y - h * 0.4, 4, h * 0.4, M.wood[1]); R(g, x - 2, y - h * 0.4, 1, h * 0.4, M.wood[2]);
  if (kind === 0) { disc(g, x, y - h * 0.65, h * 0.3, ramp[1]); disc(g, x - h * 0.15, y - h * 0.55, h * 0.22, ramp[2]); disc(g, x + h * 0.13, y - h * 0.7, h * 0.2, ramp[2]); disc(g, x - h * 0.08, y - h * 0.78, h * 0.1, ramp[3]); }
  else { for (let i = 0; i < 4; i++) { const w = h * (0.34 - i * 0.07); R(g, x - w, y - h * 0.38 - i * h * 0.17, w * 2, h * 0.2, i % 2 ? ramp[2] : ramp[1]); R(g, x - w, y - h * 0.38 - i * h * 0.17, w * 2, 2, ramp[3]); } }
}
function bldg(g, x, y, w, h, ramp, seed, t = 0, lit = 0.35, wc = M.yellow) {
  R(g, x - 1, y - 1, w + 2, h + 1, INK); R(g, x, y, w, h, ramp[1]); R(g, x, y, 2, h, ramp[2]); R(g, x + w - 2, y, 2, h, ramp[0]);
  for (let wy = y + 5; wy < y + h - 6; wy += 8) for (let wx = x + 4; wx < x + w - 5; wx += 7) {
    const on = hs(seed + wx * 3 + wy) < lit; R(g, wx, wy, 3, 4, on ? wc[2] : ramp[0]);
  }
  R(g, x - 2, y - 2, w + 4, 3, ramp[2]);
}
function skyline(g, t, y, seed, ramp, n = 9, lit = 0.3, hmin = 40, hmax = 110) {
  for (let i = 0; i < n; i++) { const w = 22 + Math.floor(hs(seed + i) * 18), x = i * ((W + 60) / n) - 20, h = hmin + hs(seed + i * 3) * (hmax - hmin); bldg(g, x, y - h, w, h + 30, ramp, seed + i, t, lit); }
}
function hills(g, y, ramp, seed, amp = 20, w = W + 120) {
  for (let x = -40; x < w - 40; x += PX * 2) { const h = amp * (0.6 + 0.4 * Math.sin(x * 0.03 + seed) + 0.3 * Math.sin(x * 0.011 + seed * 2)); R(g, x, y - h, PX * 2, h + 200, ramp[1]); R(g, x, y - h, PX * 2, 2, ramp[2]); }
}
function deskTop(g, x, y, w, ramp = M.wood) { box(g, x, y, w, 8, ramp); R(g, x + 3, y + 8, 4, 24, ramp[1]); R(g, x + w - 7, y + 8, 4, 24, ramp[1]); }
function screenBox(g, x, y, w, h, on, t, ramp = M.teal) {
  R(g, x - 3, y - 3, w + 6, h + 6, INK); R(g, x - 2, y - 2, w + 4, h + 4, M.steel[2]); R(g, x, y, w, h, on ? ramp[1] : M.dark[1]);
  if (on) { R(g, x, y + ((t * 20) % h), w, 1, ramp[2]); dith(g, x, y, w, h, ramp[1], ramp[0], 2); }
}
function signBoard(g, x, y, text, ramp = M.yellow, sz = 8, pad = 5) {
  const w = txtW(text, sz) + pad * 2, h = sz + pad * 2;
  box(g, x - w / 2, y, w, h, ramp); txt(g, text, x, y + pad, sz, INK, 'center');
  return { w, h };
}
function beltH(g, x0, x1, y, t, speed = 90, body = M.steel) {
  R(g, x0, y, x1 - x0, 13, body[1]); R(g, x0, y, x1 - x0, 3, body[3]);
  const off = (t * speed) % 10;
  for (let x = x0 - 10; x < x1 + 10; x += 10) { const xx = x + off; if (xx >= x0 && xx + 4 <= x1) R(g, xx, y + 5, 4, 3, body[2]); }
  R(g, x0, y + 11, x1 - x0, 2, body[0]);
}
function progressBar(g, x, y, w, v, ramp = M.green, h = 7) {
  R(g, x - 1, y - 1, w + 2, h + 2, INK); R(g, x, y, w, h, M.dark[1]);
  const fw = Math.round(w * clamp(v)); if (fw > 0) { R(g, x, y, fw, h, ramp[2]); if (STYLE.shade === 'bevel') R(g, x, y, fw, 2, ramp[3]); }
}
function stool(g, x, y, ramp = M.red) { R(g, x - 5, y, 11, 4, ramp[2]); R(g, x - 5, y, 11, 1, ramp[3]); R(g, x - 1, y + 4, 3, 10, M.steel[1]); R(g, x - 5, y + 14, 11, 2, M.steel[1]); }
function fishShape(g, x, y, dir, ramp, t, s = 1) {
  const tail = Math.floor(t * 6 + x) % 2; const q = (n) => Math.max(1, Math.round(n * s));
  R(g, x - q(5) * dir, y - q(2), q(10) * dir || 1, q(5), ramp[2]); R(g, x + q(4) * dir, y - q(1), q(2) * dir, q(3), ramp[3]);
  R(g, x - q(8) * dir, y - q(3) + tail, q(3) * dir, q(7) - tail * 2, ramp[1]); R(g, x + q(2) * dir, y - 1, 1, 1, INK);
}
function hex(g, x, y, r, c) { disc(g, x, y, r, c); }
/* interior room: wall panels + floor; outdoor: sky + hills + ground */
function room(g, t, wall, floor, gy = 300, o = {}) {
  R(g, -40, -20, W + 200, gy + 20, wall[1]); dith(g, -40, -20, W + 200, gy + 20, wall[1], wall[2], o.k == null ? 1 : o.k);
  if (o.stripe) { R(g, -40, gy - 40, W + 200, 4, o.stripe[2]); R(g, -40, gy - 36, W + 200, 1, o.stripe[0]); }
  R(g, -40, gy - 6, W + 200, 8, wall[0]); R(g, -40, gy - 6, W + 200, 1, wall[3]);
  planks(g, gy, W + 120, floor);
}
function outdoor(g, c, gy, gr, o = {}) {
  skyFill(g, c, -20, gy - 20); if (o.sun !== false) sunMoon(g, c, o.sx || 200, o.sy || 190, 16);
  if ((c.time || 'day') === 'night') stars(g, c.t, 30, 4, 200); else clouds(g, c.t, 150, 4, '#ffffff', 3);
  hills(g, gy - 10, [gr[0], gr[1], gr[2]], o.seed || 2, 24);
}
