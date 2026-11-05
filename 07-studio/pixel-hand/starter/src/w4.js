/* w4.js - world 4: back at the oasis at night. Four often-used things fly from the road into the shelf next to the CPU; "CERCA = RÁPIDO" lights; far things go grey and cost. */
'use strict';
const OFF2 = document.createElement('canvas'); OFF2.width = W; OFF2.height = H;
const G2 = OFF2.getContext('2d'); G2.imageSmoothingEnabled = false;
const ITEMS = [['CORREO', 0], ['MÚSICA', 1], ['FOTO', 2], ['WEB', 3]];
const SLOT = [[112, 259], [159, 259], [112, 289], [159, 289]];
const ICOL = [TOK[3], TOK[1], TOK[2], TOK[4]];
function labelChip(g, cx, cy, s, col, k = 1) {
  const w = Math.round((stw(s) + 5) * k), h = Math.round(13 * k); const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
  R(g, x - 1, y, w + 2, h, INK); R(g, x, y - 1, w, h + 2, INK); R(g, x, y, w, h, col.c); R(g, x, y, w, 2, col.l); R(g, x, y + h - 2, w, 2, col.d);
  if (k > 0.8) stxt(g, s, cx + 1, y + 3, 8, INK, 'center');
}
const FLY0 = [214, 280];
const itemT = (i) => T.usas - 0.22 + i * 0.34;
function shelf(g, t) {
  // legs
  R(g, 92, 304, 4, 20, WOODC.k); R(g, 176, 304, 4, 20, WOODC.k);
  R(g, 85, 241, 102, 66, INK); R(g, 86, 242, 100, 64, WOODC.m); R(g, 86, 242, 100, 2, WOODC.hi); R(g, 86, 304, 100, 2, WOODC.d);
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = SLOT[i]; const x = sx - 23, y = sy - 14;
    R(g, x - 1, y - 1, 48, 29, INK); R(g, x, y, 46, 27, '#241a38'); dith(g, x, y, 46, 27, '#241a38', '#2f2348', 0);
    R(g, x, y, 46, 1, '#0f0a1a'); R(g, x, y + 26, 46, 1, '#4a3a68');
    const landed = t > itemT(i) + 0.62;
    if (landed) { const a = 0.35 + 0.15 * Math.sin(t * 4 + i); g.save(); g.globalAlpha = a; R(g, x, y, 46, 27, '#5ed17a'); g.restore(); R(g, x + 38, y + 3, 5, 3, INK); R(g, x + 39, y + 4, 3, 1, '#7bff9a'); }
    else { R(g, x + 3, y + 3, 5, 3, INK); R(g, x + 4, y + 4, 3, 1, '#4a3a68'); }
  }
}
function cheerSign(g, t, a1, a2) {
  const cx = 104, y = 196, w = 194, h = 26;
  R(g, 40, y + h, 3, 244 - y - h, WOODC.k); R(g, 164, y + h, 3, 244 - y - h, WOODC.k);
  const on = Math.max(a1, a2);
  if (on > 0) glow(g, cx, y + 13, 70, '#5ed17a', 0.5 * on * (0.85 + 0.15 * Math.sin(t * 6)));
  R(g, cx - w / 2 - 1, y - 1, w + 2, h + 2, INK); R(g, cx - w / 2, y, w, h, mixc('#1d3a2a', '#2e9a52', on)); R(g, cx - w / 2, y, w, 2, mixc('#2a4a3a', '#7bff9a', on)); R(g, cx - w / 2, y + h - 2, w, 2, mixc('#10281c', '#1f6a3a', on));
  R(g, cx - w / 2 + 2, y + 2, 2, 2, mixc('#2a4a3a', '#d8ffe0', on)); R(g, cx + w / 2 - 4, y + 2, 2, 2, mixc('#2a4a3a', '#d8ffe0', on));
  g.font = '16px SLK'; const parts = [['CERCA', a1], [' = ', a2], ['RÁPIDO', a2]]; const ws = parts.map((p) => g.measureText(p[0]).width); let x = cx - ws.reduce((a, b) => a + b, 0) / 2;
  parts.forEach((p, i) => { stxt(g, p[0], x, y + 5, 16, mixc('#3a5a48', '#ffffff', p[1]), 'left'); x += ws[i]; });
}
/* hanging price tag + coin purse (pendulum) */
function priceTag(g, t, p) {
  if (p <= 0) return;
  const top = 80, ang = Math.sin(t * 2.2) * 0.07 * (1 - clamp((t - T.lejos - 2) / 3)), ox = 232, y0 = lerp(top - 120, 0, 0);
  const drop = EA.bounce(clamp(p));
  g.save(); g.translate(ox, top); g.rotate(ang);
  const yy = lerp(-110, 0, drop);
  R(g, -1, yy, 2, 100, '#c9c3d8'); // chain
  for (let i = 0; i < 12; i++) R(g, -2, yy + i * 8, 4, 2, '#8a82a0');
  const ty = yy + 100;
  R(g, -24, ty, 48, 24, INK); R(g, -23, ty + 1, 46, 22, '#e04f4f'); R(g, -23, ty + 1, 46, 2, '#ff9a9a'); R(g, -23, ty + 21, 46, 2, '#a02a3a'); R(g, -3, ty - 4, 6, 6, INK); R(g, -1, ty - 2, 2, 2, '#c9c3d8');
  txt(g, 'CARO', 1, ty + 8, 8, '#ffffff', 'center', '#a02a3a');
  // purse
  const py = ty + 30;
  R(g, -12, py, 24, 22, INK); R(g, -11, py + 3, 22, 18, '#a0703c'); R(g, -11, py + 3, 22, 2, '#c98f55'); R(g, -11, py + 19, 22, 2, '#6b4a2e'); R(g, -7, py - 2, 14, 5, '#a0703c'); R(g, -9, py, 18, 2, '#6b4a2e');
  disc(g, 0, py + 12, 5, GOLD); disc(g, 0, py + 12, 3, '#d99a2b'); txt(g, '$', 1, py + 9, 8, INK, 'center');
  g.restore();
}
function farGroup(t, k) {
  // road + tiny well + tiny vault, drawn on OFF2 then blitted with a grey filter
  const g = G2; g.clearRect(0, 0, W, H);
  for (let y = 272; y <= 346; y++) { const q = (y - 272) / 74, cx = lerp(214, 198, q), w = lerp(4, 26, q * q + q * 0.3); R(g, cx - w / 2, y, w, 1, '#4a5a9a'); if (y % 6 < 3) R(g, cx - 1, y, 2, 1, '#8a9ad0'); }
  g.save(); g.translate(200, 270); g.scale(0.3, 0.3); well(g, 0, 0, t, { sign: 1, lit: true, bucket: -36 }); g.restore();
  vaultAt(g, t, 238, 272, 0.3, { lit: true });
  const L2 = L.m; L2.save(); L2.filter = 'grayscale(' + (0.98 * k).toFixed(2) + ') brightness(' + (1 - 0.18 * k).toFixed(2) + ')'; L2.drawImage(OFF2, 0, 0); L2.restore();
}
function drawW4(t) {
  const cam = (t - T.por) * 0.9;
  farDesert(t, {
    sky: SKY_NIGHT, cam, stars: 1, nstars: 70, seed: 11, moon: [58, 118],
    mtn: { c: '#1a2352', hi: '#2e3a80', peaks: [[30, 50, 28], [96, 62, 20], [174, 46, 30], [270, 54, 22]] },
    dunes: [
      { base: 262, amp: 11, freq: 0.021, shift: 0.5, c: '#232d6a', hi: '#3f4f9a', k: 0.2 },
      { base: 270, amp: 10, freq: 0.03, shift: 2.8, c: '#2a3680', hi: '#4a5aaa', k: 0.4 },
    ],
    birds: 0,
  });
  const g = L.m, SN = { hi: '#6a7ab8', l: '#4a5a9a', m: '#37468a', d: '#2b3878', dd: '#222c64', k: '#1a2252' };
  const lejosK = pr(t, T.lejos - 0.05, 0.7);
  lay(g, cam, 1, (g) => {
    groundMid(g, t, cam, SN, {});
    // moon glints on the sand
    for (let i = 0; i < 5; i++) R(g, 40 + i * 5, YH + 3 + i * 4, 30 - i * 4, 1, 'rgba(180,200,255,.22)');
  });
  lay(g, cam, 1, () => farGroup(t, lejosK));
  lay(g, cam, 1, (g) => {
    // palm behind the shelf
    palm(g, 184, 326, 46, t, 1.1, 0.8);
    cpuRock(g, t, { lit: 1 });
    pond(g, 128, 328, 46, 9, t, { rim: '#6a7ab8', dark: 0.35 });
    shelf(g, t);
    // cable from the CPU to the shelf, pulses speed up with "rapido"
    const fast = t >= T.rapido2 - 0.05;
    const pu = []; if (t > T.cerca2 - 0.1) for (let i = 0; i < (fast ? 4 : 2); i++) pu.push((((t - T.cerca2) * (fast ? 1.9 : 1.0) + i / (fast ? 4 : 2)) % 1));
    cable(g, [[75, 290], [80, 290], [80, 278], [87, 278]], t, pu, '#7bff9a');
    tuft(g, 70, 331, t, 8); tuft(g, 190, 333, t, 5); tuft(g, 216, 332, t, 9);
    // fireflies
    for (let i = 0; i < 7; i++) { const fx = 30 + hs(i) * 220 + Math.sin(t * 0.8 + i * 2) * 8, fy = 250 + hs(i * 3) * 80 + Math.cos(t * 1.1 + i) * 5; const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.4 + i * 1.7)); g.save(); g.globalAlpha = a; R(g, fx, fy, 2, 2, '#fff0a0'); glow(g, fx, fy, 5, '#ffe060', 0.6); g.restore(); }
    // the four often-used chips fly in from the road
    ITEMS.forEach(([name, i]) => {
      const t0 = itemT(i); if (t < t0) return;
      const [x, y, landed, p] = fly(t, t0, 0.62, FLY0[0], FLY0[1], SLOT[i][0], SLOT[i][1], 40);
      labelChip(g, x, y, name, ICOL[i], 0.65 + 0.35 * clamp(p * 1.4));
      if (!landed) { g.save(); g.globalAlpha = 0.5 * (1 - p); R(g, x + 6, y + 2, 3, 3, ICOL[i].l); g.restore(); }
      sparkle(g, SLOT[i][0] + 18, SLOT[i][1] - 12, t, t0 + 0.62, '#fff');
    });
    cheerSign(g, t, pr(t, T.cerca2 - 0.05, 0.3), pr(t, T.rapido2 - 0.05, 0.3));
    // hero
    const turn = t >= T.lejos - 0.12;
    let fa = null, ba = null, mood = 'n', look = 0;
    if (t >= T.usas - 0.3 && t < T.cerca1) { fa = 100; look = 0; mood = 'n'; }
    if (t >= T.cerca1 && t < T.lejos - 0.12) { mood = 'h'; fa = 170; ba = -170; }
    if (turn) { mood = 's'; fa = 105; ba = -20; }
    chris(g, { x: 236, y: FY, dir: turn ? 1 : -1, t, ph: 0, mv: 0, talk: mouth(t), mood, fa, ba, look, bs: 3.3 });
  });
  lay(L.u, cam, 1, (g) => {
    bubble(g, 238, FY - 84, '!', t, T.cerca1 + 0.05, '#2e9a52', 1.0);
    bubble(g, 238, FY - 84, '$', t, T.caro, '#a02a3a', 1.2);
  });
  // price tag swings in at "lejos"
  priceTag(L.u, t, pr(t, T.lejos, 0.55));
  if (t >= T.caro) { const dt = t - T.caro; for (let i = 0; i < 5; i++) { const q = clamp(dt / 0.7); const ang = -0.5 - i * 0.42; const x = 232 + Math.cos(ang) * 28 * q * (1 + i * 0.2), y = 196 + Math.sin(ang) * 36 * q + 60 * q * q; alpha(L.u, 1 - q, () => { disc(L.u, x, y, 3, GOLD); R(L.u, x - 1, y - 1, 2, 2, '#fff0a0'); }); } }
  fgDress(t, cam, { fg: '#0c1236', fgHi: '#222c64', dust: '#aab8ff', shift: 0.9 });
  return [236 - cam, FY];
}
