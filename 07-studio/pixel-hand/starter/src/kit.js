/* kit.js - desert kit: palette, the narrator (chris), props, ambient life. Pure functions of time; builds on lib.js helpers. */
'use strict';
const OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H;
const GO = OFF.getContext('2d'); GO.imageSmoothingEnabled = false;
const YH = 268;
function blitBack(t, amp = 1.0) {
  const g = L.b, a = YH - 20, b = YH + 6;
  if (!g) return;
  g.drawImage(OFF, 0, 0, W, a, 0, 0, W, a);
  for (let y = a; y < b; y++) {
    const k = 1 - Math.abs(y - (YH - 7)) / 14;
    const dx = Math.round(Math.sin(t * 3.4 + y * 0.9) * amp * clamp(k, 0, 1));
    g.drawImage(OFF, 0, y, W, 1, dx, y, W, 1);
  }
  g.drawImage(OFF, 0, b, W, H - b, 0, b, W, H - b);
}
const mixc = (a, b, k) => {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b); const r = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return '#' + r.map((v) => v.toString(16).padStart(2, '0')).join('');
};
const greyc = (c, k) => { const p = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const l = Math.round(p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11); const h = l.toString(16).padStart(2, '0'); return mixc(c, '#' + h + h + h, k); };
/* one palette: sand / sky / water / foliage / stone / metal */
const SAND = { hi: '#fbe3a4', l: '#f2c879', m: '#e0a95a', d: '#c78a45', dd: '#a06a38', k: '#76502f' };
const SKY_DUSK = ['#1b1130', '#2c1a47', '#4b2552', '#7b3358', '#b5485a', '#e8705a', '#f7a35c', '#fbd08a'];
const SKY_DAY = ['#2b5fb0', '#3f7ad0', '#5e9cf0', '#86bff5', '#b0dcf8', '#f7e3b0', '#fbd08a', '#f7a35c'];
const SKY_RUST = ['#2a1630', '#4a2040', '#7a3048', '#a8453a', '#d06a50', '#e8905a', '#f0b070', '#f8d090'];
const SKY_NIGHT = ['#06040f', '#0a0820', '#0e0e30', '#141a48', '#1b2560', '#243070', '#2e3a80', '#3a4890'];
const WATER = { d: '#1d4a9c', m: '#2f7ad0', l: '#5ec0f0', hi: '#c0f0ff' };
const LEAF = { d: '#1f7a50', m: '#2fa56e', l: '#5ed17a', hi: '#b0f5c0' };
const ROCK = { d: '#5c5470', m: '#8a82a0', l: '#b4adc8', hi: '#d8d3e6', k: '#3a2f4d' };
const WOODC = { d: '#6b4a2e', m: '#a0703c', l: '#c98f55', hi: '#e9b87a', k: '#3a2418' };
const GOLD = '#ffd35e';

/* small-text font (Silkscreen, 8 px grid) */
function stxt(g, s, x, y, sz, c, al = 'left', ol) {
  g.font = sz + 'px SLK'; g.textBaseline = 'top'; g.textAlign = al;
  if (ol) { g.fillStyle = ol; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(s, Math.round(x + dx), Math.round(y + dy)); }
  g.fillStyle = c; g.fillText(s, Math.round(x), Math.round(y));
}
const stw = (s, sz = 8) => Math.round(s.length * sz * 0.76) + 1; // measured width of Silkscreen

/* ---------------- narrator: chris (curly black hair, rectangular glasses, black tee with red logo, grey sweats, white sneakers with green cuffs, black backpack) ---------------- */
const CH = {
  skin: ['#7a4a2c', '#b57844', '#d29a64', '#e8b684', '#fbd3a6'],
  hair: ['#06040c', '#0f0a1a', '#1c1430', '#2c2146', '#43345f'],
  top: ['#0a0612', '#17101f', '#2a2040', '#3a2e58', '#54457a'],
  bottom: ['#241a30', '#6d6684', '#8d86a6', '#b4adc8', '#d8d3e6'],
  stripe: '#1a1228',
  shoe: ['#8a8a99', '#c0c0cc', '#e8e8f0', '#ffffff', '#ffffff'],
  cuff: '#5ed17a',
  pack: ['#06040c', '#120d1c', '#221a34', '#33284c', '#443763'],
  logo: '#e04f4f',
};
/* o: x,y(feet),dir,t,ph,mv,talk(0..2),mood(n|s|h|t),fa,ba (arm deg: 0 down, 90 forward, 180 up),look,lookY,bs,u,jump,lean */
function chris(g, o) {
  const D = CH, u = o.u || 1.15, q = (n) => Math.max(1, Math.round(n * u)), qs = (n) => Math.round(n * u);
  const t = o.t, dir = o.dir || 1, x = Math.round(o.x), y = Math.round(o.y - (o.jump || 0));
  const mv = o.mv || 0, ph = o.ph || 0, moving = mv > 0.2;
  const sw = Math.sin(ph), cw = Math.cos(ph);
  const idle = Math.floor(t * 3.4 + (o.bs || 0)) % 2;
  const bob = moving ? -Math.round(Math.abs(sw) * u * 1.4) : -idle * Math.max(1, Math.round(u * 0.7));
  g.save(); g.translate(x, y); g.scale(dir, 1);
  alpha(g, 0.4, () => R(g, -q(11), -1, q(22), 3, INK));
  const sy0 = -q(34) + bob, aLen = q(13);
  // back arm
  const ba = (o.ba != null ? o.ba : -sw * 38 * (moving ? 1 : 0) - 6) * Math.PI / 180;
  line(g, -q(4), sy0, -q(4) + Math.sin(ba) * aLen, sy0 + Math.cos(ba) * aLen, q(4), D.top[1]);
  R(g, -q(4) + Math.sin(ba) * aLen - q(2), sy0 + Math.cos(ba) * aLen - q(2), q(4), q(4), D.skin[1]);
  // legs
  const stride = q(5), fl = sw * stride * (moving ? 1 : 0), bl = -sw * stride * (moving ? 1 : 0);
  const fLift = moving ? Math.max(0, cw) * q(3) : 0, bLift = moving ? Math.max(0, -cw) * q(3) : 0;
  const hipY = -q(18) + bob, lw = q(5);
  line(g, -q(3), hipY, -q(3) + bl, -q(3) - bLift, lw, D.bottom[1]); R(g, -q(6) + bl, -q(3) - bLift, q(8), q(3), D.shoe[1]);
  line(g, q(3), hipY, q(3) + fl, -q(3) - fLift, lw, D.bottom[2]); R(g, q(0) + fl, -q(3) - fLift, q(8), q(3), D.shoe[2]);
  R(g, q(0) + fl, -q(3) - fLift, q(8), 1, D.shoe[4]);
  line(g, -q(3) - 2, hipY, -q(3) - 2 + bl, -q(3) - bLift, 1, D.stripe); line(g, q(3) + 2, hipY, q(3) + 2 + fl, -q(3) - fLift, 1, D.stripe);
  R(g, -q(6) + bl, -q(4) - bLift, q(4), 1, D.cuff); R(g, q(0) + fl, -q(4) - fLift, q(4), 1, D.cuff);
  // backpack + torso
  const th = q(17), ty = -q(35) + bob;
  R(g, -q(13) - 1, ty + q(2) - 1, q(7) + 1, th - q(3) + 2, INK);
  R(g, -q(13), ty + q(2), q(7), th - q(3), D.pack[2]); R(g, -q(13), ty + q(2), q(7), q(2), D.pack[3]); R(g, -q(13), ty + th - q(4), q(7), q(1), D.pack[0]);
  R(g, -q(8) - 1, ty - 1, q(16) + 2, th + 2, INK);
  R(g, -q(8), ty, q(16), th, D.top[2]);
  R(g, -q(8), ty, q(16), q(2), D.top[3]); R(g, -q(8), ty, q(2), th, D.top[3]); R(g, q(6), ty + q(2), q(2), th - q(2), D.top[1]); R(g, -q(8), ty + th - q(2), q(16), q(2), D.top[1]);
  R(g, -q(5), ty, q(2), th, D.pack[0]); R(g, q(3), ty, q(2), th, D.pack[0]);
  R(g, q(3), ty + q(4), Math.max(2, q(2)), Math.max(2, q(2)), D.logo);
  // head
  const hh = Math.round(Math.sin(t * 5.2 - 0.9) * 0.7 * (moving ? 0 : 1)) + (o.hdy || 0);
  const hy = -q(56) + bob + hh;
  R(g, -q(9) - 1, hy - 1, q(18) + 2, q(18) + 2, INK);
  R(g, -q(9), hy, q(18), q(18), D.skin[2]);
  R(g, q(7), hy + q(3), q(2), q(14), D.skin[1]); R(g, -q(8), hy + q(2), q(2), q(3), D.skin[3]);
  const hc = D.hair;
  R(g, -q(11), hy - q(2), q(22), q(8), hc[1]); R(g, -q(12), hy + q(1), q(4), q(8), hc[0]); R(g, q(8), hy + q(1), q(4), q(6), hc[1]);
  for (let i = 0; i < 4; i++) { const lift = i % 2 ? q(5) : q(6); R(g, -q(11) + i * q(5.5), hy - lift, q(6), lift - q(1), hc[1]); R(g, -q(9) + i * q(5.5), hy - lift + 1, q(2), Math.max(1, q(1)), hc[3]); }
  R(g, -q(12), hy - q(3), q(3), q(4), hc[1]); R(g, q(9), hy - q(3), q(3), q(4), hc[1]);
  for (let i = 0; i < 4; i++) R(g, -q(9) + i * q(5), hy + q(3), q(3), q(3), hc[1]);
  R(g, -q(11), hy + q(5), q(3), q(5), hc[0]);
  const mood = o.mood || 'n', blink = ((t + (o.bs || 0)) % 3.3) < 0.12;
  const ey = hy + q(8), eyeW = q(mood === 's' ? 5 : 4), eyeH = q(mood === 's' ? 6 : 5);
  for (const ex of [-q(5), q(2)]) {
    if (blink || mood === 'h') {
      if (mood === 'h') { R(g, ex, ey + q(2), 1, q(2), INK); R(g, ex + 1, ey + q(1), q(2), 1, INK); R(g, ex + q(3), ey + q(2), 1, q(2), INK); } else R(g, ex, ey + q(2), eyeW, 1, INK);
    } else {
      R(g, ex, ey, eyeW, eyeH, '#ffffff');
      R(g, ex + 1 + (o.look || 0) + (eyeW > q(4) ? 1 : 0), ey + 1 + (o.lookY || 0), Math.max(1, q(2)), Math.max(2, q(3)), INK);
    }
  }
  const by = mood === 's' ? ey - q(4) : mood === 't' ? ey - q(3) : ey - q(2);
  R(g, -q(5), by, q(4), 1, hc[0]); R(g, q(2), by + (mood === 't' ? -1 : 0), q(4), 1, hc[0]);
  for (const ex of [-q(5), q(2)]) {
    const fw = eyeW + 2, fh = eyeH + 2;
    R(g, ex - 1, ey - 1, fw, 1, INK); R(g, ex - 1, ey + eyeH, fw, 1, INK); R(g, ex - 1, ey - 1, 1, fh, INK); R(g, ex + eyeW, ey - 1, 1, fh, INK);
    if (!blink && mood !== 'h') R(g, ex + eyeW - 1, ey, 1, 1, '#d8e0f0');
  }
  R(g, -q(5) + eyeW + 1, ey + 1, Math.max(1, q(2) - 1 - (-q(5) + eyeW + 1)), 1, INK);
  const m = o.talk || 0;
  if (mood === 'h' && !m) { R(g, -q(2), ey + q(9), q(6), 1, INK); R(g, -q(3), ey + q(8), 1, 1, INK); R(g, q(4), ey + q(8), 1, 1, INK); }
  else if (mood === 's' && !m) R(g, -q(1), ey + q(8), q(3), q(4), INK);
  else if (!m) R(g, -q(1), ey + q(9), q(5), 1, INK);
  else if (m === 1) { R(g, -q(1), ey + q(8), q(5), q(3), INK); R(g, 0, ey + q(10), q(3), 1, '#e04f4f'); }
  else { R(g, -q(2), ey + q(7), q(6), q(5), INK); R(g, -q(1), ey + q(10), q(4), q(2), '#e04f4f'); }
  // front arm
  const fa = (o.fa != null ? o.fa : sw * 38 * (moving ? 1 : 0) + 6) * Math.PI / 180;
  line(g, q(5), sy0, q(5) + Math.sin(fa) * aLen, sy0 + Math.cos(fa) * aLen, q(4), D.top[2]);
  R(g, q(5) + Math.sin(fa) * aLen - q(2), sy0 + Math.cos(fa) * aLen - q(2), q(4), q(4), D.skin[2]);
  g.restore();
}
/* hand position of chris (front hand) in world coords, for carrying things */
function chrisHand(o) {
  const u = o.u || 1.15, q = (n) => Math.max(1, Math.round(n * u)); const dir = o.dir || 1;
  const fa = (o.fa != null ? o.fa : 6) * Math.PI / 180, aLen = q(13);
  const moving = (o.mv || 0) > 0.2, bob = moving ? -Math.round(Math.abs(Math.sin(o.ph || 0)) * u * 1.4) : 0;
  return [o.x + dir * (q(5) + Math.sin(fa) * aLen), o.y - q(34) + bob + Math.cos(fa) * aLen];
}
function chrisHead(o) { const u = o.u || 1.15, q = (n) => Math.max(1, Math.round(n * u)); return [o.x + (o.dir || 1) * 2, o.y - q(48)]; }

/* ---------------- scenery pieces ---------------- */
function sky(g, cols, y1 = 270, w = W + 520) { bands(g, -40, 0, y1, w, cols, 8); }
function stars(g, t, n, seed, y1 = 200, w = W + 520, a = 1) {
  for (let i = 0; i < n; i++) {
    const x = hs(i * 3 + seed) * w - 40, y = hs(i * 7 + seed) * y1;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + hs(i + seed) * 2) + i * 2.1);
    g.save(); g.globalAlpha = clamp(tw * a);
    R(g, x, y, 1, 1, '#ffffff'); if (i % 5 === 0) { R(g, x - 1, y, 3, 1, '#c8d0ff'); R(g, x, y - 1, 1, 3, '#c8d0ff'); }
    g.restore();
  }
}
function dunes(g, baseY, amp, freq, shift, c, hi, x0 = -40, x1 = W + 520, bottom = 330) {
  for (let x = x0; x < x1; x++) {
    const h = baseY - amp * (0.5 + 0.5 * Math.sin(x * freq + shift) * 0.7 + 0.5 * Math.sin(x * freq * 2.3 + shift * 1.7) * 0.3);
    R(g, x, h, 1, bottom - h, c);
    if (hi) R(g, x, h, 1, 1, hi);
  }
}
function mountains(g, baseY, peaks, c, hi, bottom = 300) {
  for (const [x, w, h] of peaks) {
    for (let i = -w; i <= w; i++) {
      const k = 1 - Math.abs(i) / w; const hh = Math.round(h * Math.pow(k, 0.85) + hs(Math.abs(i) + x) * 1.5);
      R(g, x + i, baseY - hh, 1, hh + (bottom - baseY), c);
      if (i < 0 && hh > 3) R(g, x + i, baseY - hh, 1, 1, hi);
    }
  }
}
function sun(g, x, y, r, t) {
  glow(g, x, y, r * 2.2, '#ffb070', 0.5);
  disc(g, x, y, r + 2, '#f7a35c'); disc(g, x, y, r, '#ffd08a'); disc(g, x, y, Math.round(r * 0.72), '#fff0b8');
}
/* palm tree: trunk with curve + 6 fronds that sway */
function palm(g, x, y, h, t, ph = 0, sc = 1) {
  const sway = Math.sin(t * 0.9 + ph) * 2.2, sw2 = Math.sin(t * 1.7 + ph) * 1.2;
  const seg = 9;
  const pts = [];
  for (let i = 0; i <= seg; i++) { const k = i / seg; pts.push([x + (k * k) * (5 * sc) + sway * k * k, y - h * k]); }
  for (let i = 0; i < seg; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    line(g, ax, ay, bx, by, Math.max(2, Math.round(4 * sc * (1 - i / (seg + 2)))), WOODC.m);
    line(g, ax - 1, ay, bx - 1, by, 1, WOODC.l);
    if (i % 2 === 0) R(g, ax, ay, Math.round(4 * sc), 1, WOODC.d);
  }
  const [tx, ty] = pts[seg];
  const fr = [[-24, -2, 0], [-18, -12, 1], [-7, -17, 2], [8, -16, 3], [19, -9, 4], [25, 1, 5], [0, -6, 6]];
  for (const [dx0, dy0, k] of fr) {
    const dx = dx0 * sc + sw2 * (dx0 > 0 ? 1 : -1) * (k % 2 ? 1 : 0.6), dy = dy0 * sc + Math.sin(t * 2 + k + ph) * 1.2;
    const mx = tx + dx * 0.55, my = ty + dy * 0.55 - 4 * sc;
    line(g, tx, ty, mx, my, 3, LEAF.m); line(g, mx, my, tx + dx, ty + dy + 7 * sc, 2, LEAF.d);
    line(g, tx, ty - 1, mx, my - 1, 1, LEAF.l);
    for (let j = 1; j < 5; j++) { const px = tx + (dx * j) / 5, py = ty + (dy * j) / 5 + (j * j * 0.5) * sc; R(g, px, py + 1, 1, 3, LEAF.d); }
  }
  R(g, tx - 2, ty, 3, 3, WOODC.k); R(g, tx + 2, ty + 1, 3, 3, WOODC.k);
  return [tx, ty];
}
function cactus(g, x, y, h, t, col = LEAF) {
  R(g, x - 3, y - h, 7, h, INK); R(g, x - 2, y - h - 1, 5, h + 1, col.m); R(g, x - 2, y - h, 2, h, col.l); R(g, x + 2, y - h + 2, 1, h - 2, col.d);
  R(g, x - 9, y - h * 0.62, 7, 12, INK); R(g, x - 8, y - h * 0.62 + 1, 5, 10, col.m); R(g, x - 8, y - h * 0.62 - 3, 4, 5, col.m);
  R(g, x + 3, y - h * 0.45, 7, 12, INK); R(g, x + 4, y - h * 0.45 + 1, 5, 10, col.m); R(g, x + 5, y - h * 0.45 - 4, 4, 6, col.m);
  for (let i = 0; i < 4; i++) R(g, x - 1 + (i % 2) * 2, y - h + 4 + i * (h / 5), 1, 1, '#fff0a0');
}
function rock(g, x, y, w, h, c = ROCK) {
  R(g, x - 1, y - h, w + 2, h + 1, INK);
  for (let r = 0; r < h; r++) { const k = r / h; const inset = Math.round(Math.pow(1 - k, 2.2) * w * 0.28); R(g, x + inset, y - h + r, w - inset * 2, 1, k < 0.15 ? c.l : k > 0.75 ? c.d : c.m); }
  R(g, x + 2, y - h + 4, Math.round(w * 0.3), 2, c.l); dith(g, x + 2, y - Math.round(h * 0.4), w - 4, Math.round(h * 0.4), c.m, c.d, 1);
}
function tuft(g, x, y, t, ph = 0) { for (let i = -2; i <= 2; i++) { const hgt = 4 - Math.abs(i) + Math.round(Math.sin(t * 2 + ph + i) * 0.8); R(g, x + i * 2, y - hgt, 1, hgt, i % 2 ? LEAF.m : LEAF.l); } }
function camel(g, x, y, t, dir = 1, walk = 1, col = '#2a1a3a') {
  g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(dir, 1);
  const s = Math.sin(t * 3 * walk);
  R(g, -9, -13, 18, 7, col); R(g, -4, -17, 5, 5, col); R(g, 2, -17, 4, 4, col);
  R(g, 7, -19, 3, 8, col); R(g, 8, -21, 6, 4, col); R(g, 13, -20, 2, 2, col);
  for (const [lx, k] of [[-8, 1], [-4, -1], [2, -1], [6, 1]]) R(g, lx + Math.round(s * k * walk), -7, 2, 7, col);
  g.restore();
}
function bird(g, x, y, t, ph = 0, c = '#2a1a3a') {
  const f = Math.floor(t * 5 + ph) % 2;
  if (f) { R(g, x - 3, y, 3, 1, c); R(g, x, y - 1, 1, 1, c); R(g, x + 1, y, 3, 1, c); }
  else { R(g, x - 3, y - 1, 2, 1, c); R(g, x - 1, y, 5, 1, c); R(g, x + 3, y - 1, 2, 1, c); }
}
/* pond with rings, reflection shimmer; (cx,cy) center, rx, ry */
function pond(g, cx, cy, rx, ry, t, o = {}) {
  const sandc = o.rim || SAND.l;
  for (let dy = -ry - 2; dy <= ry + 2; dy++) { const k = dy / (ry + 2); const w = Math.round(Math.sqrt(1 - k * k) * (rx + 3)); R(g, cx - w, cy + dy, w * 2, 1, INK); }
  for (let dy = -ry - 1; dy <= ry + 1; dy++) { const k = dy / (ry + 1); const w = Math.round(Math.sqrt(1 - k * k) * (rx + 2)); R(g, cx - w, cy + dy, w * 2, 1, sandc); }
  for (let dy = -ry; dy <= ry; dy++) {
    const k = dy / ry; const w = Math.round(Math.sqrt(1 - k * k) * rx);
    const c = k < -0.3 ? WATER.l : k < 0.4 ? WATER.m : WATER.d;
    R(g, cx - w, cy + dy, w * 2, 1, c);
  }
  dith(g, cx - rx + 6, cy - 1, rx * 2 - 12, 3, WATER.m, WATER.l, 1);
  // rings
  for (let i = 0; i < 3; i++) {
    const age = (t * 0.55 + i / 3 + (o.seed || 0)) % 1; const rr = age * rx * 0.55;
    const ox = cx + (hs(i + (o.seed || 0)) - 0.5) * rx * 0.8, oy = cy + (hs(i * 5) - 0.5) * ry * 0.6;
    g.save(); g.globalAlpha = 0.8 * (1 - age);
    for (let a = 0; a < 20; a++) { const an = (a / 20) * Math.PI * 2; R(g, ox + Math.cos(an) * rr, oy + Math.sin(an) * rr * 0.36, 1, 1, WATER.hi); }
    g.restore();
  }
  if (o.dark) { g.save(); g.globalAlpha = o.dark; for (let dy = -ry; dy <= ry; dy++) { const k = dy / ry; const w = Math.round(Math.sqrt(1 - k * k) * rx); R(g, cx - w, cy + dy, w * 2, 1, '#0a0830'); } g.restore(); }
  // glints
  for (let i = 0; i < 5; i++) { const gx = cx - rx * 0.7 + hs(i + 3) * rx * 1.4, gy = cy - ry * 0.6 + hs(i * 3) * ry * 1.2; if (Math.sin(t * 3 + i * 1.7) > 0.55) R(g, gx, gy, 2, 1, '#ffffff'); }
}
function sandDots(g, t, n, seed, y0, y1, col, spd = 10) {
  g.save(); g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const x = (hs(i + seed) * (W + 60) + t * spd * (0.5 + hs(i * 3 + seed))) % (W + 60) - 30;
    const y = y0 + hs(i * 7 + seed) * (y1 - y0) + Math.sin(t * 1.3 + i) * 2;
    g.globalAlpha = 0.25 + 0.5 * hs(i * 5 + seed); g.fillRect(Math.round(x), Math.round(y), 1 + (i % 5 === 0 ? 1 : 0), 1);
  }
  g.restore();
}
/* ground: sand plane with banding, dither, pebbles and footprints; y from horizon to bottom */
function sandPlane(g, x0, x1, yH, cam, c = SAND) {
  R(g, x0, yH, x1 - x0, 480 - yH, c.m);
  const rows = [[yH, 12, c.l], [yH + 12, 16, c.m], [yH + 28, 24, c.m], [yH + 52, 40, c.d]];
  R(g, x0, yH, x1 - x0, 12, c.l); dith(g, x0, yH + 8, x1 - x0, 8, c.l, c.m, 0);
  dith(g, x0, yH + 28, x1 - x0, 24, c.m, c.d, 1); dith(g, x0, yH + 80, x1 - x0, 400, c.m, c.d, 0);
  R(g, x0, yH + 80, x1 - x0, 400, c.d); dith(g, x0, yH + 70, x1 - x0, 14, c.m, c.d, 0);
  for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) {
    const hsv = hs(x * 0.37); R(g, x + hsv * 10, yH + 10 + hs(x) * 90, 3, 1, c.d); R(g, x + hsv * 6, yH + 20 + hs(x + 9) * 130, 2, 1, c.hi);
    if (hs(x * 1.3) > 0.82) R(g, x + 4, yH + 6 + hs(x + 2) * 150, 3, 2, c.dd);
  }
}
/* distance post along a road */
function post(g, x, y, label, lit) {
  R(g, x - 1, y - 20, 3, 20, WOODC.k); R(g, x - 1, y - 20, 1, 20, WOODC.m);
  R(g, x - 7, y - 24, 15, 7, WOODC.k); R(g, x - 6, y - 23, 13, 5, lit ? GOLD : WOODC.l);
  if (label) stxt(g, label, x, y - 23, 8, INK, 'center');
}
/* dotted road to the right, drawn in perspective-less top strip at y */
function road(g, x0, x1, y, t, spd = 0) {
  for (let x = x0; x < x1; x += 12) { const xx = x + ((t * spd) % 12); R(g, xx, y, 6, 2, SAND.hi); R(g, xx, y + 2, 6, 1, SAND.dd); }
}
/* water-drop chip with a label: the DATO. (x,y) centre of the drop */
function dropChip(g, x, y, s, t, o = {}) {
  const sc = o.sc == null ? 1 : o.sc; if (sc <= 0) return;
  const fs = 8, w = Math.round((stw(s) + 14) * Math.min(sc, 1.1)), h = Math.round(15 * Math.min(sc, 1.1));
  x = Math.round(x); y = Math.round(y);
  const c = o.col || { c: '#5ec0f0', l: '#c0f0ff', d: '#2f7ad0' };
  // drop on top
  R(g, x - 1, y - h / 2 - 6, 2, 2, INK); R(g, x - 2, y - h / 2 - 4, 4, 3, INK); R(g, x - 1, y - h / 2 - 5, 2, 3, c.l);
  R(g, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, INK); R(g, x - w / 2, y - h / 2, w, h, c.c);
  R(g, x - w / 2, y - h / 2, w, 2, c.l); R(g, x - w / 2, y + h / 2 - 2, w, 2, c.d);
  if (sc > 0.7) stxt(g, s, x + 1, y - 4, fs, INK, 'center');
}
function sparkles(g, x, y, t, t0, n = 4, r = 12) { for (let i = 0; i < n; i++) sparkle(g, x + (hs(i + 3) - 0.5) * r * 2, y + (hs(i * 5) - 0.5) * r * 1.2, t, t0 + i * 0.07, i % 2 ? '#fff' : GOLD); }
/* plank sign in Silkscreen/PS2P placed on a stick */
function sign(g, x, y, s, fs, t, o = {}) {
  const w = Math.round(s.length * fs * (o.font === 'ps' ? 1 : 0.76)) + 10, h = fs + 8;
  const sw = o.sway ? Math.round(Math.sin(t * 1.5) * o.sway) : 0;
  R(g, x - 1, y + h, 3, o.stick || 14, WOODC.k); R(g, x - 1, y + h, 1, o.stick || 14, WOODC.m);
  x += sw; const x0 = Math.round(x - w / 2);
  R(g, x0, y, w, h, INK); R(g, x0 + 1, y + 1, w - 2, h - 2, o.col || WOODC.l);
  R(g, x0 + 1, y + 1, w - 2, 2, o.hi || WOODC.hi); R(g, x0 + 1, y + h - 3, w - 2, 2, o.lo || WOODC.m);
  R(g, x0 + 2, y + 2, 1, 1, INK); R(g, x0 + w - 3, y + 2, 1, 1, INK);
  if (o.font === 'ps') txt(g, s, x + 1, y + 5, fs, o.ink || INK, 'center'); else stxt(g, s, x + 1, y + 4, fs, o.ink || INK, 'center');
  return { w, h };
}
/* hourglass (x,y) top-left; frac 0..1 sand moved to the bottom */
function hourglass(g, x, y, frac, t, rot = 0) {
  g.save(); g.translate(Math.round(x + 9), Math.round(y + 14)); if (rot) g.rotate(rot);
  R(g, -10, -15, 20, 3, INK); R(g, -9, -14, 18, 2, WOODC.l); R(g, -10, 12, 20, 3, INK); R(g, -9, 12, 18, 2, WOODC.m);
  for (let i = 0; i < 12; i++) { const w = Math.max(1, Math.round(8 * (1 - i / 12))); R(g, -w - 1, -12 + i, w * 2 + 2, 1, '#d8e8ff'); R(g, -w - 1, 11 - i, w * 2 + 2, 1, '#d8e8ff'); }
  const top = Math.round(10 * (1 - frac)), bot = Math.round(10 * frac);
  for (let i = 0; i < top; i++) { const w = Math.max(1, Math.round(7 * (1 - (i + (10 - top)) / 12))); R(g, -w, -11 + (10 - top) + i, w * 2, 1, GOLD); }
  for (let i = 0; i < bot; i++) { const w = Math.max(1, Math.round(7 * (1 - (11 - i) / 12) + 3)); R(g, -w, 10 - i, w * 2, 1, GOLD); }
  if (frac > 0 && frac < 1) R(g, 0, -2, 1, 12, '#ffe08a');
  g.restore();
}
/* stone brick wall rectangle with highlights */
function bricks(g, x, y, w, h, c1 = ROCK.m, c2 = ROCK.d, c3 = ROCK.l) {
  R(g, x, y, w, h, c1);
  for (let r = 0; r * 6 < h; r++) { R(g, x, y + r * 6 + 5, w, 1, c2); for (let k = (r % 2) * 5; k < w; k += 10) R(g, x + k, y + r * 6, 1, 6, c2); }
  R(g, x, y, w, 1, c3);
}
