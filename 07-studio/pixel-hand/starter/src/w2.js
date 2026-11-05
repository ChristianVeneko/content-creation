/* w2.js - world 2: bright afternoon. Drink at the near oasis (instant), then walk the road to the RAM well. Also the well prop used by world 3. */
'use strict';
function cloud(g, x, y, s, c = '#ffffff', sh = '#c8dcf5') {
  R(g, x + 6 * s, y, 18 * s, 4 * s, c); R(g, x, y + 3 * s, 34 * s, 5 * s, c); R(g, x + 10 * s, y - 3 * s, 12 * s, 5 * s, c); R(g, x, y + 7 * s, 34 * s, 2 * s, sh);
}
/* the RAM well: stone ring, wooden frame, pulley, rope + bucket. o: sign (0..1 drop), bucket (y of bucket top), chip (bool), crank (angle) */
function well(g, cx, by, t, o = {}) {
  const fx0 = cx - 24, fx1 = cx + 22;
  // frame posts + beam
  R(g, fx0 - 1, by - 70, 5, 70, INK); R(g, fx0, by - 70, 3, 70, WOODC.m); R(g, fx0, by - 70, 1, 70, WOODC.l);
  R(g, fx1 - 1, by - 70, 5, 70, INK); R(g, fx1, by - 70, 3, 70, WOODC.m); R(g, fx1, by - 70, 1, 70, WOODC.l);
  R(g, fx0 - 4, by - 72, fx1 - fx0 + 11, 7, INK); R(g, fx0 - 3, by - 71, fx1 - fx0 + 9, 5, WOODC.l); R(g, fx0 - 3, by - 71, fx1 - fx0 + 9, 1, WOODC.hi);
  // roof boards
  R(g, fx0 - 6, by - 76, fx1 - fx0 + 15, 5, INK); R(g, fx0 - 5, by - 75, fx1 - fx0 + 13, 3, '#b0402a'); R(g, fx0 - 5, by - 75, fx1 - fx0 + 13, 1, '#e06a4a');
  // pulley
  const px = cx, py = by - 60;
  disc(g, px, py, 5, INK); disc(g, px, py, 4, '#8a82a0'); disc(g, px, py, 1, INK);
  const ang = (o.crank || 0) + t * 0.4; R(g, px + Math.cos(ang) * 3 - 1, py + Math.sin(ang) * 3 - 1, 2, 2, '#d8d3e6');
  // bucket on a rope (hidden below the rim when low)
  const bt = o.bucket != null ? o.bucket : by - 40 + Math.sin(t * 1.4) * 7;
  R(g, px - 1, py + 4, 2, bt - py - 4, '#c98f55'); R(g, px, py + 4, 1, bt - py - 4, '#e9b87a');
  R(g, cx - 6, bt, 13, 11, INK); R(g, cx - 5, bt + 1, 11, 9, WOODC.m); R(g, cx - 5, bt + 1, 11, 2, WOODC.l); R(g, cx - 5, bt + 4, 11, 1, WOODC.d); R(g, cx - 5, bt + 8, 11, 1, WOODC.d);
  if (o.chip) { const cy = bt - 9; dropChip(g, cx, cy, 'DATO', t, { sc: 1 }); }
  // stone ring (front)
  R(g, cx - 28, by - 28, 56, 29, INK); bricks(g, cx - 27, by - 27, 54, 27, ROCK.m, ROCK.d, ROCK.l);
  R(g, cx - 30, by - 31, 60, 6, INK); R(g, cx - 29, by - 30, 58, 4, ROCK.l); R(g, cx - 29, by - 30, 58, 1, ROCK.hi);
  dith(g, cx - 27, by - 20, 54, 20, ROCK.m, ROCK.d, 1);
  // sign RAM
  if (o.sign > 0) {
    const sy = lerp(by - 190, by - 118, EA.bounce(clamp(o.sign))); const w = 3 * 16 + 14;
    R(g, cx - w / 2 - 1, sy - 1, w + 2, 28, INK); R(g, cx - w / 2, sy, w, 26, o.lit ? '#2f7ad0' : '#1d3a8c'); R(g, cx - w / 2, sy, w, 2, '#5ec0f0'); R(g, cx - w / 2, sy + 24, w, 2, '#102a5a');
    txt(g, 'RAM', cx + 1, sy + 5, 16, '#ffffff', 'center', INK);
    R(g, cx - w / 2 + 2, sy + 2, 1, 1, '#c0f0ff'); R(g, cx + w / 2 - 3, sy + 2, 1, 1, '#c0f0ff');
    R(g, cx - 14, sy + 26, 2, by - 74 - sy - 26 + 4, WOODC.k); R(g, cx + 13, sy + 26, 2, by - 74 - sy - 26 + 4, WOODC.k);
  }
}

/* ---------------- world 2 ---------------- */
const W2X = (t) => kf(t, [[0, 118], [T.si1 - 0.02, 118], [T.pozo1 + 0.25, 338], [99, 338]], EA.io);
function w2Hero(t) {
  const x = W2X(t), x1 = W2X(t + 0.04), x0 = W2X(t - 0.04); const v = Math.abs(x1 - x0) / 0.08;
  return { x, mv: v > 8 ? 1 : 0, ph: x / 8, dir: t < T.si1 - 0.02 ? -1 : 1 };
}
const W2CAM = (t) => clamp(W2X(t) - 112, 0, 300) + (t - T.cuando) * 0.3;
function drawW2(t) {
  const cam = W2CAM(t);
  farDesert(t, {
    sky: SKY_DAY, cam, sun: [214, 112, 14],
    mtn: { c: '#7a9ad0', hi: '#a8c4ec', peaks: [[24, 50, 30], [100, 60, 22], [190, 44, 32], [280, 56, 24], [360, 50, 30], [440, 60, 22]] },
    dunes: [
      { base: 264, amp: 10, freq: 0.02, shift: 0.7, c: '#e8c48a', hi: '#fbe3a4', k: 0.25 },
      { base: 270, amp: 9, freq: 0.03, shift: 3.1, c: '#e0a95a', hi: '#f2c879', k: 0.4 },
    ],
    camels: true, camelCol: '#8a5a3a', birds: 1, birdCol: '#3a2a4a',
  });
  // clouds on the far layer (drawn into the back canvas directly)
  lay(L.b, cam, 0.08, (g) => { cloud(g, 30 + t * 1.5, 130, 1); cloud(g, 150 + t * 1.1, 98, 1); cloud(g, 300 + t * 0.9, 150, 1); });
  const g = L.m, hero = w2Hero(t);
  const S2 = { hi: '#fff0c0', l: '#f6d089', m: '#e8b46a', d: '#cf8f4f', dd: '#a56a3a', k: '#7a4e30' };
  lay(g, cam, 1, (g) => {
    groundMid(g, t, cam, S2, { prints: false });
    // road to the well: sandy strip with dashes and posts
    R(g, 130, 341, 262, 7, S2.hi); R(g, 130, 341, 262, 1, '#ffffff'); R(g, 130, 347, 262, 1, S2.d);
    for (let x = 136; x < 392; x += 12) R(g, x, 344, 6, 1, S2.d);
    for (let x = 190; x < 370; x += 62) post(g, x, 341, '', false);
    // near oasis
    palm(g, 22, 326, 72, t, 0.6, 1);
    pond(g, 62, 322, 44, 9, t, { rim: '#fff0c0' });
    palm(g, 116, 328, 58, t, 2.2, 0.85);
    tuft(g, 20, 331, t, 3); tuft(g, 104, 331, t, 6);
    // the well, far to the right
    const wsign = pr(t, T.pozo1 - 0.1, 0.5);
    const crank = t > T.pozo1 + 0.15;
    const bk = crank ? kf(t, [[T.pozo1 + 0.15, 316], [T.ram - 0.2, 316], [T.ram + 0.25, 286]], EA.io) : null;
    well(g, 380, 336, t, { sign: wsign, lit: t > T.ram - 0.1, bucket: bk, chip: t > T.ram - 0.1, crank: crank ? t * 5 : 0 });
    // DATO chip: appears in the pond, then flies into the narrator (drink)
    const inP = pr(t, T.dato - 0.05, 0.45);
    if (t >= T.dato - 0.05 && t < T.bebes) { const y = lerp(322, 290, EA.out(inP)) + Math.sin(t * 4) * 1.5; dropChip(g, 62, y, 'DATO', t, { sc: EA.back(inP) }); }
    if (t >= T.bebes && t < T.bebes + 0.32) {
      const p = pr(t, T.bebes, 0.32), hd = chrisHead({ x: hero.x, y: FY, dir: hero.dir });
      dropChip(g, lerp(62, hd[0], EA.in(p) * 0.5 + p * 0.5), lerp(290, hd[1] - 6, p) - Math.sin(p * Math.PI) * 14, 'DATO', t, { sc: 1 - 0.7 * p });
    }
    // after "si no": the pond is empty, a ghost outline and a red cross
    if (t >= T.si1 - 0.05 && t < T.caminas + 0.9) {
      const gp = pr(t, T.si1 - 0.05, 0.25);
      g.save(); g.globalAlpha = 0.55 * gp * (t > T.caminas + 0.5 ? clamp((T.caminas + 0.9 - t) / 0.4) : 1);
      R(g, 44, 284, 36, 1, '#ffffff'); R(g, 44, 300, 36, 1, '#ffffff'); R(g, 44, 284, 1, 17, '#ffffff'); R(g, 79, 284, 1, 17, '#ffffff'); g.restore();
      const xp = pr(t, T.no1 - 0.05, 0.18);
      if (xp > 0) { const s = Math.round(8 * EA.back(xp)); line(g, 62 - s, 292 - s, 62 + s, 292 + s, 3, '#e04f4f'); line(g, 62 + s, 292 - s, 62 - s, 292 + s, 3, '#e04f4f'); }
    }
    // narrator
    let fa = null, ba = null, mood = 'n', hdy = 0, look = 0;
    if (t >= T.dato - 0.1 && t < T.bebes) { fa = 100; look = -1; }
    if (t >= T.bebes && t < T.si1 - 0.1) { mood = 'h'; hdy = t < T.bebes + 0.5 ? -2 : 0; fa = 130; ba = -40; }
    if (t >= T.si1 - 0.1 && t < T.caminas) { mood = 't'; fa = 60; }
    if (t >= T.ram - 0.3) { fa = 100; mood = 'h'; }
    chris(g, { x: hero.x, y: FY, dir: hero.dir, t, ph: hero.ph, mv: hero.mv, talk: mouth(t), mood, fa, ba, look, hdy, bs: 1.9 });
    // "instante": speed streaks beside the head
    if (t >= T.instante - 0.05 && t < T.instante + 0.45) { const p = pr(t, T.instante - 0.05, 0.5); g.save(); g.globalAlpha = 1 - p; for (let i = 0; i < 4; i++) R(g, hero.x + 16 + p * 14 - i * 2, FY - 66 + i * 7, 14 - i * 2, 1, '#ffffff'); g.restore(); sparkles(g, hero.x, FY - 62, t, T.bebes + 0.25, 4, 12); }
  });
  lay(L.u, cam, 1, (g) => {
    const hero = w2Hero(t);
    bubble(g, hero.x + 2, FY - 84, '!', t, T.bebes + 0.3, '#2e9a52', 1.1);
    bubble(g, hero.x + 2, FY - 84, '?', t, T.si1 + 0.1, '#e04f4f', 0.9);
  });
  fgDress(t, cam, { fg: '#8a5a3a', fgHi: '#c98f55', dust: '#fff0c0', shift: 0.4 });
  return [w2Hero(t).x - cam, FY];
}
