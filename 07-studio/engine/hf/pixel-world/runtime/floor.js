/* floor.js: fills the lower third of every world. dressFloor() adds floor pattern, markings and scattered debris below the
 * cast's feet (mid layer); dressFore() adds blurred foreground silhouettes in the bottom corners and one hanging element at the top
 * edge (fore layer). Both are closed-form functions of t: no state, no Math.random. A scenario may declare `floor: [kind, ramp, [fg...]]`. */
'use strict';
const FLOOR_OF = {
  factory: ['metal', 'stone', ['crate', 'pipe']], arcade: ['carpet', 'purple', ['cabinet', 'cable']], dungeon: ['tiles', 'stone', ['rock', 'crate']], shop: ['planks', 'wood', ['crate', 'plant']],
  'post-office': ['metal', 'blue', ['crate', 'cable']], library: ['carpet', 'wood', ['plant', 'crate']], kitchen: ['tiles', 'steel', ['crate', 'pipe']], 'bank-vault': ['metal', 'steel', ['crate', 'pipe']],
  hospital: ['tiles', 'teal', ['plant', 'cable']], hotel: ['carpet', 'red', ['plant', 'crate']], classroom: ['planks', 'wood', ['chair', 'plant']], gym: ['planks', 'wood', ['barrel', 'crate']],
  casino: ['carpet', 'red', ['chair', 'cabinet']], bakery: ['tiles', 'sand', ['barrel', 'crate']], 'detective-office': ['planks', 'wood', ['chair', 'crate']], warehouse: ['metal', 'steel', ['crate', 'barrel']],
  cinema: ['carpet', 'purple', ['chair', 'chair']], 'space-station': ['metal', 'steel', ['pipe', 'cable']], farm: ['grass', 'grass', ['bush', 'barrel']], 'train-station': ['tiles', 'stone', ['barrel', 'crate']],
  'wizard-tower': ['tiles', 'stone', ['barrel', 'rock']], 'pirate-ship': ['planks', 'wood', ['barrel', 'crate']], airport: ['tiles', 'stone', ['crate', 'barrel']], 'ocean-floor': ['sand', 'sand', ['rock', 'bush']],
  mine: ['sand', 'stone', ['rock', 'crate']], castle: ['tiles', 'stone', ['rock', 'barrel']], 'courier-city': ['tiles', 'stone', ['bush', 'barrel']], greenhouse: ['tiles', 'sand', ['plant', 'bush']],
  lighthouse: ['sand', 'stone', ['rock', 'rock']], 'subway-map': ['tiles', 'stone', ['chair', 'crate']],
};
const FLOOR_DEFAULT = ['tiles', 'stone', ['crate', 'plant']];
const seedOf = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; };
const floorSpec = (d) => d.floor || FLOOR_OF[d.id] || FLOOR_DEFAULT;

function dressFloor(g, t, w) {
  const d = w.def, [kind, rn] = floorSpec(d), r = M[rn] || M.stone, y0 = (w.gy || GYD) + 2, X0 = -30, X1 = w.W + 30, sd = seedOf(d.id);
  if (kind === 'tiles') {
    const vx = w.W / 2;
    for (const dy of [6, 20, 40, 68, 104, 150]) alpha(g, 0.55, () => R(g, X0, y0 + dy, X1 - X0, 1, r[0]));
    for (let x = X0 - 80; x < X1 + 80; x += 34) alpha(g, 0.5, () => line(g, vx + (x - vx) * 0.3, y0 - 6, x, 480, 1, r[0]));
    for (let i = 0; i < 18; i++) { const x = hs(i + sd) * (w.W + 40) - 20, y = y0 + 10 + hs(i * 3 + sd) * 120; alpha(g, 0.35, () => dith(g, x, y, 28, 12, r[3], r[1], 1)); }
  } else if (kind === 'planks') {
    for (let k = 0; k < 8; k++) { const yy = y0 + 4 + k * 17; alpha(g, 0.6, () => R(g, X0, yy, X1 - X0, 1, r[0])); for (let x = X0 + ((k * 37 + sd) % 52); x < X1; x += 64) alpha(g, 0.6, () => R(g, x, yy, 1, 17, r[0])); for (let i = 0; i < 3; i++) alpha(g, 0.4, () => R(g, X0 + hs(k * 7 + i + sd) * (X1 - X0), yy + 3 + i * 4, 9, 1, r[3])); }
  } else if (kind === 'grass') {
    for (let i = 0; i < 90; i++) { const x = hs(i + sd) * (w.W + 60) - 30, y = y0 + 4 + hs(i * 5 + sd) * 130, sw = Math.round(Math.sin(t * 2 + i) * 1), hgt = 4 + (i % 4); R(g, x + sw, y - hgt, 1, hgt, M.grass[i % 3 + 2]); R(g, x - 1 + sw, y - hgt + 2, 1, hgt - 2, M.grass[2]); if (i % 11 === 0) R(g, x, y - hgt - 1, 2, 2, [M.yellow[3], M.pink[2], '#ffffff'][i % 3]); }
  } else if (kind === 'sand') {
    for (let i = 0; i < 26; i++) { const x = hs(i + sd) * (w.W + 40) - 20, y = y0 + 8 + hs(i * 3 + sd) * 130; alpha(g, 0.5, () => { R(g, x, y, 16, 1, r[3]); R(g, x + 3, y + 1, 10, 1, r[1]); }); }
    for (let i = 0; i < 22; i++) { const x = hs(i * 9 + sd) * (w.W + 40) - 20, y = y0 + 6 + hs(i * 4 + sd) * 140; disc(g, x, y, 1 + (i % 3), r[i % 2 ? 1 : 3]); }
  } else if (kind === 'metal') {
    for (let k = 0; k < 8; k++) alpha(g, 0.45, () => { R(g, X0, y0 + 6 + k * 18, X1 - X0, 2, r[0]); R(g, X0, y0 + 8 + k * 18, X1 - X0, 1, r[3]); });
    for (let x = X0; x < X1; x += 6) { R(g, x, y0 + 56, 3, 12, (Math.floor(x / 6) % 2) ? M.yellow[2] : M.dark[1]); }
    R(g, X0, y0 + 54, X1 - X0, 2, M.dark[0]); R(g, X0, y0 + 68, X1 - X0, 2, M.dark[0]);
    for (let i = 0; i < 12; i++) { R(g, hs(i + sd) * (w.W + 40) - 20, y0 + 90 + hs(i * 5 + sd) * 100, 2, 2, r[4]); }
  } else if (kind === 'carpet') {
    const rx = 20, rw = w.W - 40; alpha(g, 0.6, () => { R(g, rx, y0 + 16, rw, 120, r[1]); R(g, rx + 4, y0 + 20, rw - 8, 112, r[2]); R(g, rx + 10, y0 + 26, rw - 20, 100, r[1]); });
    for (let x = rx + 16; x < rx + rw - 16; x += 20) for (let y = y0 + 34; y < y0 + 116; y += 20) alpha(g, 0.6, () => { R(g, x + 6, y, 3, 3, M.gold[3]); R(g, x + 3, y + 3, 9, 3, M.gold[3]); R(g, x + 6, y + 6, 3, 3, M.gold[3]); });
  } else if (kind === 'circuit') {
    for (let i = 0; i < 9; i++) { const x = ((i * 53 + sd) % (w.W + 20)) - 10, y = y0 + 12 + (i * 29) % 120, l = 30 + (i * 17) % 50; alpha(g, 0.6, () => { R(g, x, y, l, 2, r[1]); R(g, x + l, y, 2, 24 + (i % 3) * 10, r[1]); R(g, x + l - 2, y + 24 + (i % 3) * 10, 6, 6, r[3]); }); const p = ((t * 0.7 + i * 0.31) % 1) * l; R(g, x + p, y, 4, 2, M.yellow[3]); }
  } else if (kind === 'water') { waves(g, t, y0 + 6, X0, X1, M.water, 140, 2); }
  // lane chevrons and a few loose objects (every floor)
  const shift = Math.floor(t * 18) % 24;
  for (let x = -24 + shift; x < w.W + 20; x += 24) alpha(g, 0.35, () => { R(g, x, y0 + 150, 3, 3, r[4]); R(g, x + 3, y0 + 153, 3, 3, r[4]); R(g, x, y0 + 156, 3, 3, r[4]); });
  for (let i = 0; i < 9; i++) {
    const x = hs(i * 3 + sd) * (w.W - 20) + 6, y = y0 + 20 + hs(i * 7 + sd) * 110, k = (i + sd) % 4; alpha(g, 0.35, () => R(g, x - 1, y + 6, 12, 2, INK));
    if (k === 0) { R(g, x, y, 8, 6, M.wood[2]); R(g, x, y, 8, 1, M.wood[4]); } else if (k === 1) { disc(g, x + 3, y + 3, 3, M.gold[2]); } else if (k === 2) { R(g, x, y + 2, 9, 4, M.steel[2]); R(g, x + 2, y, 2, 2, M.steel[3]); } else { R(g, x, y, 7, 5, M.white[3]); R(g, x + 1, y + 1, 4, 1, M.steel[1]); }
  }
}

/* Foreground silhouette tones. Styles with blur soften the silhouettes themselves; styles without blur would show hard black blocks,
 * so they use dithered palette-dark tones (two darkest palette colours) instead. */
let fgCache = null;
function fgRamp() {
  if (fgCache) return fgCache;
  if (STYLE.blur && STYLE.blur[0] > 0) return (fgCache = M.dark);
  const p0 = PALHEX[PALORDER[0]], p1 = PALHEX[PALORDER[Math.min(1, PALORDER.length - 1)]];
  return (fgCache = [patRaw(p0, p1, 1), patRaw(p0, p1, 0), patRaw(p0, p1, 2), { raw: p1 }, { raw: p1 }]);
}
function fgShape(g, t, kind, x, base, h, sd) {
  const D = fgRamp(), dk = D[0];
  if (kind === 'crate') { R(g, x, base - h, h, h, dk); R(g, x, base - h, h, 2, D[3]); R(g, x + 2, base - h * 0.55, h * 0.5, h * 0.55, D[1]); R(g, x + h * 0.45, base - h * 1.35, h * 0.55, h * 0.4, dk); }
  else if (kind === 'pipe') { R(g, x - 20, base - h * 0.5, h + 60, h * 0.5, dk); R(g, x - 20, base - h * 0.5, h + 60, 2, D[3]); R(g, x + h * 0.4, base - h * 1.1, h * 0.28, h * 0.6, dk); }
  else if (kind === 'plant') { R(g, x + h * 0.3, base - h * 0.3, h * 0.4, h * 0.3, dk); for (let i = -3; i <= 3; i++) line(g, x + h * 0.5, base - h * 0.3, x + h * 0.5 + i * h * 0.22, base - h * (0.95 - Math.abs(i) * 0.12) + Math.round(Math.sin(t * 1.2 + i) * 1.5), 3, dk); }
  else if (kind === 'rock') { disc(g, x + h * 0.5, base, h * 0.6, dk); disc(g, x + h * 0.2, base, h * 0.4, D[1]); R(g, x + h * 0.2, base - h * 0.55, h * 0.4, 2, D[3]); }
  else if (kind === 'cabinet') { R(g, x, base - h * 1.2, h * 0.7, h * 1.2, dk); R(g, x + 3, base - h * 1.05, h * 0.7 - 6, h * 0.4, D[2]); glow(g, x + h * 0.35, base - h * 0.85, h * 0.5, M.teal[3], 0.15); }
  else if (kind === 'cable') { for (let i = 0; i < 3; i++) for (let k = 0; k < 24; k++) R(g, x + k * 4, base - 6 - i * 7 - Math.round(Math.sin(k * 0.5 + i) * 6), 4, 4, dk); }
  else if (kind === 'chair') { R(g, x, base - h, h * 0.7, h * 0.9, dk); R(g, x, base - h, h * 0.7, 2, D[3]); R(g, x + 4, base - h * 0.1, 4, h * 0.1, dk); }
  else if (kind === 'barrel') { R(g, x, base - h, h * 0.8, h, dk); R(g, x, base - h * 0.75, h * 0.8, 2, D[3]); R(g, x, base - h * 0.3, h * 0.8, 2, D[3]); }
  else { disc(g, x + h * 0.4, base - h * 0.2, h * 0.45, dk); disc(g, x + h * 0.9, base - h * 0.1, h * 0.35, D[1]); disc(g, x, base - h * 0.1, h * 0.3, D[1]); }
}
function dressFore(g, t, w) {
  const d = w.def, fgs = floorSpec(d)[2], sd = seedOf(d.id), base = 492;
  fgShape(g, t, fgs[0], -8 + (sd % 14), base, 48 + (sd % 14), sd);
  fgShape(g, t, fgs[1] || fgs[0], w.W - 50 - (sd % 12), base, 42 + ((sd >> 2) % 16), sd + 1);
  if (w.W > 300) fgShape(g, t, fgs[0], w.W * 0.52, base, 38, sd + 2);
  // hanging element at the top edge: cables or lamps
  const hx = 20 + (sd % 200), len = 16 + (sd % 24);
  R(g, hx, 0, 2, len, D0), R(g, hx + 26, 0, 2, len * 0.6, D0), R(g, hx - 4, len, 10, 5, D0);
}
const D0 = M.dark[0];
