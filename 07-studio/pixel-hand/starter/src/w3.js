/* w3.js - world 3: the long way to the DISCO vault. The vault grows on the horizon, posts rush by, the hourglass runs. */
'use strict';
/* the vault in local coordinates: origin = bottom centre. open: 0..1 (door rolled aside), glow: interior light, lit: sign gold */
function vault(g, t, o = {}) {
  const open = o.open || 0;
  // cliff behind
  for (let r = 0; r < 120; r++) { const k = r / 120; const w = Math.round(58 + k * 40 + Math.sin(r * 0.6) * 3); R(g, -w, -120 + r, w * 2, 1, k < 0.04 ? ROCK.l : k < 0.5 ? ROCK.d : ROCK.k); }
  dith(g, -86, -70, 172, 70, ROCK.k, ROCK.d, 1);
  // facade
  R(g, -57, -84, 114, 84, INK); bricks(g, -56, -83, 112, 83, ROCK.m, ROCK.d, ROCK.l);
  R(g, -56, -83, 3, 83, ROCK.l); R(g, 53, -80, 3, 80, ROCK.d);
  // lintel plate with the label
  R(g, -52, -104, 104, 24, INK); R(g, -51, -103, 102, 22, '#2b3552'); R(g, -51, -103, 102, 2, '#8fa2cc'); R(g, -51, -83, 102, 2, '#141a2b');
  txt(g, 'DISCO', 1, -98, 16, o.lit ? GOLD : '#b08820', 'center', INK);
  for (const [rx, ry] of [[-48, -100], [47, -100], [-48, -86], [47, -86]]) R(g, rx, ry, 2, 2, '#8fa2cc');
  // doorway
  R(g, -28, -70, 56, 70, INK); R(g, -26, -68, 52, 68, o.glow > 0 ? mixc('#2a1630', '#ffd35e', o.glow * 0.8) : '#0e1426');
  if (o.glow > 0) { dith(g, -26, -68, 52, 68, mixc('#2a1630', '#ffd35e', o.glow * 0.8), '#fff0a0', 1); glow(g, 0, -34, 46, '#ffd35e', 0.5 * o.glow); }
  // round vault door that rolls to the right
  g.save(); g.beginPath(); g.rect(-30, -72, 60 + 26, 74); g.clip();
  const dx = Math.round(open * 62), cy = -35;
  disc(g, dx, cy, 29, INK); disc(g, dx, cy, 27, '#6e7fa6'); disc(g, dx, cy, 24, '#8fa2cc'); disc(g, dx, cy, 20, '#55658c'); disc(g, dx, cy, 6, INK); disc(g, dx, cy, 4, '#c9a24a');
  const wa = open * 5 + 0.6;
  for (let i = 0; i < 4; i++) { const a = wa + (i * Math.PI) / 2; line(g, dx + Math.cos(a) * 5, cy + Math.sin(a) * 5, dx + Math.cos(a) * 17, cy + Math.sin(a) * 17, 3, '#c9a24a'); R(g, dx + Math.cos(a) * 18 - 2, cy + Math.sin(a) * 18 - 2, 4, 4, '#e8c860'); }
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; R(g, dx + Math.cos(a) * 25 - 1, cy + Math.sin(a) * 25 - 1, 2, 2, '#dfe8ff'); }
  g.restore();
  R(g, -34, -4, 68, 4, ROCK.d); R(g, -34, -4, 68, 1, ROCK.l);
}
function vaultAt(g, t, cx, base, s, o) {
  g.save(); g.translate(Math.round(cx), Math.round(base)); if (s < 0.985) g.scale(s, s); vault(g, t, o); g.restore();
}

/* ---------------- world 3 ---------------- */
const W3A = () => T.tampoco + 0.55, W3B = () => T.disco + 0.12;
const W3HX = (t) => kf(t, [[0, 108], [W3A(), 108], [W3B(), 548], [T.pozo2 + 0.05, 548], [T.por, 500], [99, 500]], EA.io);
const W3SX = (t) => kf(t, [[0, 84], [W3B(), 84], [W3B() + 0.35, 100], [T.pozo2 - 0.1, 100], [T.pozo2 + 0.5, 150], [99, 150]], EA.io);
function w3Hero(t) {
  const x = W3HX(t), x1 = W3HX(t + 0.04), x0 = W3HX(t - 0.04); const v = Math.abs(x1 - x0) / 0.08;
  return { x, mv: v > 8 ? 1 : 0, ph: x / 8, dir: t < T.pozo2 - 0.05 ? 1 : -1 };
}
function drawW3(t) {
  const hero = w3Hero(t), cam = hero.x - W3SX(t);
  const trip = pr(t, W3A(), W3B() - W3A());
  const back = pr(t, T.pozo2, 1.4);
  const sunY = lerp(150, 258, EA.io(trip));
  farDesert(t, {
    sky: SKY_RUST, cam, sun: [70 + trip * 130, sunY, 22], stars: 0.0,
    mtn: { c: '#5a2a48', hi: '#8a4660', peaks: [[30, 50, 34], [100, 62, 26], [180, 48, 38], [260, 58, 28], [340, 52, 36]] },
    dunes: [
      { base: 262, amp: 12, freq: 0.019, shift: 2.0, c: '#8a3a48', hi: '#b5485a', k: 0.2 },
      { base: 270, amp: 11, freq: 0.028, shift: 0.9, c: '#c46a50', hi: '#e8905a', k: 0.38 },
    ],
    camels: false, birds: 2, birdCol: '#3a1a30',
  });
  const g = L.m;
  const S3 = { hi: '#ffd9a0', l: '#f0a870', m: '#d07a55', d: '#a85a45', dd: '#7a3a3a', k: '#5a2a34' };
  // vault state
  const vs = EA.io(trip) * (1 - 0.38 * EA.io(back));
  const vs2 = 0.24 + 0.76 * vs;
  const open = pr(t, T.disco, 0.55);
  const vcx = lerp(244, 164, EA.io(trip)) + (back > 0 ? lerp(0, 52, EA.io(back)) : 0), vbase = lerp(272, 330, EA.io(trip)) - (back > 0 ? 10 * EA.io(back) : 0);
  lay(g, cam, 1, (g) => {
    groundMid(g, t, cam, S3, {});
    R(g, -60, 341, 900, 7, S3.hi); R(g, -60, 341, 900, 1, '#ffffff'); R(g, -60, 347, 900, 1, S3.d);
    for (let x = -60; x < 840; x += 12) R(g, x, 344, 6, 1, S3.d);
    for (let x = 12; x < 700; x += 70) post(g, x, 341, '', false);
    // the RAM well at the start (empty bucket)
    well(g, 64, 336, t, { sign: 1, lit: true, bucket: 296 });
    if (t >= T.tampoco - 0.05 && t < W3A() + 0.45) { const xp = pr(t, T.tampoco - 0.05, 0.18); if (xp > 0) { const s = Math.round(9 * EA.back(xp)); line(g, 64 - s, 292 - s, 64 + s, 292 + s, 3, '#e04f4f'); line(g, 64 + s, 292 - s, 64 - s, 292 + s, 3, '#e04f4f'); } }
    tuft(g, 140, 331, t, 2); tuft(g, 300, 332, t, 4);
  });
  // the vault lives in screen space (approach), over the sand plane
  vaultAt(g, t, vcx, vbase, vs2, { open, glow: open, lit: t > T.disco });
  lay(g, cam, 1, (g) => {
    // dust trail
    if (hero.mv) for (let i = 0; i < 5; i++) { const age = (t * 4 + i / 5) % 1; g.save(); g.globalAlpha = 0.6 * (1 - age); disc(g, hero.x - hero.dir * (10 + age * 24), FY - 3 - age * 7, 2 + Math.round(age * 2), S3.hi); g.restore(); }
    let fa = null, ba = null, mood = 'n', look = 0;
    if (t >= T.tampoco - 0.05 && t < W3A() - 0.1) { mood = 't'; fa = 70; }
    if (t >= W3A() && t < T.disco - 0.1) { mood = 'n'; fa = null; }
    if (t >= T.disco + 0.2 && t < T.disco + 0.5) { mood = 's'; fa = 130; }
    if (t >= T.disco + 0.5) { fa = 150; ba = 150; mood = 'h'; }
    chris(g, { x: hero.x, y: FY, dir: hero.dir, t, ph: hero.ph, mv: hero.mv, talk: mouth(t), mood, fa, ba, look, bs: 2.5 });
  });
  // chip emerges and is carried
  const hd = { x: hero.x - cam, y: FY, dir: hero.dir, fa: 150 };
  const hand = chrisHand({ x: hd.x, y: hd.y, dir: hd.dir, fa: 150 });
  if (t >= T.disco + 0.45) {
    const p = pr(t, T.disco + 0.45, 0.55);
    const cx = lerp(vcx, hand[0] - hd.dir * 2, EA.io(p)), cy = lerp(vbase - 40, hand[1] - 11, EA.io(p)) - Math.sin(p * Math.PI) * 16;
    dropChip(L.u, cx, cy, 'DATO', t, { sc: EA.back(clamp(p * 1.5)) });
    sparkles(L.u, cx, cy, t, T.disco + 0.45, 3, 10);
  }
  lay(L.u, 0, 1, (g) => {
    const hp = pr(t, W3A() - 0.1, 0.35);
    // hourglass appears when the walk starts; flips at "lejano"
    if (hp > 0) {
      const flipT = T.lejano + 0.55, flipped = t >= flipT;
      const rot = flipped ? 0 : EA.io(pr(t, T.lejano, 0.55)) * Math.PI;
      const frac = flipped ? clamp(0.08 + (t - flipT) / 3) : t < T.lejano ? clamp((t - W3A()) / (W3B() - W3A() + 0.4)) * 0.92 : 0.92;
      alpha(g, hp, () => { R(g, 215, 86, 38, 42, INK); R(g, 216, 87, 36, 40, 'rgba(20,13,34,.8)'); hourglass(g, 225, 92 - Math.round((1 - hp) * 8), frac, t, rot); });
    }
    bubble(g, hero.x - cam + 2, FY - 84, '?', t, T.tampoco + 0.15, '#e04f4f', 1.0);
    bubble(g, hero.x - cam + 2, FY - 84, '!', t, T.disco + 0.5, '#2e9a52', 1.1);
  });
  fgDress(t, cam, { fg: '#3a1a30', fgHi: '#6a3048', dust: '#ffd9a0', shift: 2.2 });
  return [hero.x - cam, FY];
}
