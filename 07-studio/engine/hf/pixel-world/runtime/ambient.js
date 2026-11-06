/* ambient.js: ambient life, independent of the narration. Every scenario gets 2-4 looping animations (service lane with moving
 * items, a bystander walking the floor, steam, torch flicker, neon flicker, blinking status rail, scrolling ticker, birds, breathing
 * foreground), so the picture never rests between beats. Pure functions of t and a per-scenario seed (no clock, no randomness).
 * Intensity: SPEC.ambient = calm | normal | lively (payload `hf.ambient`, default normal) scales counts, speeds and sway.
 * Loaded after the scenarios: it wraps each scenario's mid/fore (and the composable workshop-stage builder). Everything is drawn in
 * the floor band (y > 380) or at the far edges, clear of the HUD zone (y 350-372) and of the props' action band centre. */
'use strict';
const AMB_K = { calm: 0.5, normal: 1, lively: 1.7 };
const ambK = () => AMB_K[SPEC.ambient] || 1;
const AMB_OF = {
  factory: ['lane', 'steam', 'blink'], warehouse: ['lane', 'walker', 'ticker'], 'post-office': ['lane', 'walker', 'birds'], 'courier-city': ['lane', 'birds', 'walker'],
  dungeon: ['torch', 'walker', 'lane'], castle: ['torch', 'birds', 'walker'], mine: ['torch', 'lane', 'steam'], 'wizard-tower': ['torch', 'steam', 'walker'], 'pirate-ship': ['torch', 'birds', 'walker'],
  kitchen: ['steam', 'lane', 'walker'], bakery: ['steam', 'walker', 'birds'], arcade: ['neon', 'ticker', 'walker'], casino: ['neon', 'ticker', 'walker'], cinema: ['neon', 'walker', 'blink'],
  'space-station': ['blink', 'ticker', 'steam'], 'data-center': ['blink', 'ticker', 'lane'], 'wifi-tower': ['blink', 'birds', 'walker'], 'cpu-city': ['blink', 'lane', 'neon'],
  'git-desk': ['ticker', 'walker', 'lane'], 'server-room': ['blink', 'ticker', 'steam', 'lane'], 'review-room': ['walker', 'birds', 'lane'], 'terminal-cave': ['torch', 'ticker', 'blink', 'walker'],
  'ci-pipeline': ['lane', 'blink', 'steam', 'walker'], 'ticket-board-office': ['walker', 'lane', 'birds'], 'api-kitchen': ['steam', 'lane', 'walker', 'ticker'], 'deploy-pad': ['steam', 'birds', 'lane'],
};
const AMB_TIME = { day: ['lane', 'walker', 'birds'], dusk: ['lane', 'walker', 'steam'], night: ['lane', 'walker', 'neon', 'blink'] };
const AMB_ITEM = { 'post-office': 'packet', 'courier-city': 'packet', 'git-desk': 'packet', 'server-room': 'packet', 'api-kitchen': 'packet', 'ci-pipeline': 'check', arcade: 'coin', casino: 'coin', shop: 'coin', bank: 'coin', 'deploy-pad': 'check' };
const AMB_COL = ['red', 'yellow', 'green', 'teal', 'purple', 'orange'];

/* service lane on the floor: a rail with items riding along it (crate, packet, coin, checked box) */
function ambLane(g, t, k, sd, id, Wd) {
  const y = 392, n = Math.max(2, Math.round(4 * k)), sp = 22 * k, span = Wd + 60, kind = AMB_ITEM[id] || 'crate';
  // the belt: ink rim, steel body and chevron marks that slide along it (a full-width, high-contrast moving band)
  R(g, -30, y + 4, Wd + 60, 14, INK); R(g, -30, y + 5, Wd + 60, 12, M.steel[1]); R(g, -30, y + 5, Wd + 60, 2, M.steel[3]); R(g, -30, y + 15, Wd + 60, 2, M.steel[0]);
  const off = (t * sp * 1.6) % 12; for (let x = -42; x < Wd + 42; x += 12) { const xx = x + off; R(g, xx, y + 8, 3, 2, M.yellow[3]); R(g, xx + 3, y + 10, 3, 2, M.yellow[3]); R(g, xx, y + 12, 3, 2, M.yellow[3]); }
  for (let i = 0; i < n; i++) {
    const y0 = y + 6, x = ((t * sp + i * (span / n) + hs(sd + i) * 20) % span) - 30, rp = M[AMB_COL[(sd + i) % 6]], bob = kind === 'coin' ? Math.round(Math.sin(t * 5 + i) * 1) : 0;
    if (kind === 'packet') { R(g, x - 1, y0 - 7, 14, 10, INK); R(g, x, y0 - 6, 12, 8, M.white[3]); R(g, x + 4, y0 - 4, 4, 3, M.red[2]); }
    else if (kind === 'coin') { disc(g, x + 5, y0 - 3 + bob, 4, M.gold[2]); R(g, x + 4, y0 - 5 + bob, 1, 3, M.gold[4]); }
    else if (kind === 'check') { crate(g, x, y0 - 10, 12, M.wood); R(g, x + 3, y0 - 7, 6, 6, M.green[2]); R(g, x + 4, y0 - 6, 4, 1, M.green[4]); }
    else { crate(g, x, y0 - 10, 12, rp); }
  }
}
/* a bystander walking back and forth on the floor, with a bobbing step */
function ambWalker(g, t, k, sd, Wd) {
  const a = 40, b = Wd - 40, len = b - a, sp = 11 * k, p = ((t * sp + hs(sd) * len * 2) % (len * 2)), x = a + (p < len ? p : len * 2 - p), dir = p < len ? 1 : -1;
  const step = Math.floor(t * 6 * k) % 2, y = 432 - (step ? 1 : 0), shirt = M[AMB_COL[sd % 6]], pants = M[['blue', 'stone', 'brick'][sd % 3]];
  alpha(g, 0.4, () => R(g, x - 5, 433, 11, 2, INK));
  R(g, x - 3, y - 7, 3, 7 + (step ? 0 : 1), INK); R(g, x + 1, y - 7, 3, 7 + (step ? 1 : 0), INK);
  R(g, x - 2, y - 6, 2, 6, pants[2]); R(g, x + 1, y - 6, 2, 6, pants[1]);
  R(g, x - 5, y - 18, 11, 12, INK); R(g, x - 4, y - 17, 9, 10, shirt[2]); R(g, x - 4, y - 17, 9, 2, shirt[3]);
  R(g, x - 4 + (dir > 0 ? 5 : -2), y - 15 + step, 2, 5, M.skin[2]);
  R(g, x - 4, y - 28, 9, 11, INK); R(g, x - 3, y - 27, 7, 9, M.skin[2]); R(g, x - 3, y - 27, 7, 2, M.wood[1]);
  R(g, x - 1 + dir * 2, y - 24, 1, 2, INK);
}
/* wall torches at the far edges: bracket, flickering flame and glow */
function ambTorch(g, t, k, sd, Wd) {
  for (const x of [8, Wd - 8]) {
    const f = Math.floor(t * 12 * (0.7 + k * 0.3) + x), j = hs(f) > 0.5 ? 1 : 0, y = 214;
    R(g, x - 2, y + 8, 5, 10, INK); R(g, x - 1, y + 9, 3, 8, M.wood[2]); R(g, x - 3, y + 6, 7, 3, M.steel[2]);
    R(g, x - 3, y - 4 - j, 7, 11 + j, M.fire[1]); R(g, x - 2, y - 7 - j, 5, 12 + j, M.fire[2]); R(g, x - 1, y - 5, 3, 7, M.fire[3]); R(g, x, y - 2, 1, 3, M.fire[4]);
    glow(g, x, y - 1, 34 + j * 3, M.orange[3], 0.4);
  }
}
/* steam: puffs rising from two short pipe stubs at the lower corners of the action band */
function ambSteam(g, t, k, sd, Wd) {
  for (const [x, y] of [[14, 340], [Wd - 16, 336]]) { R(g, x - 4, y, 9, 6, INK); R(g, x - 3, y, 7, 5, M.steel[2]); R(g, x - 3, y, 7, 1, M.steel[3]); puffs(g, x, y - 1, t * (0.7 + 0.3 * k), hs(x + sd), M.white[3], Math.max(3, Math.round(5 * k)), 40, 0.7); }
}
/* neon tubes at the far edges that flicker (a held colour with short dropouts) */
function ambNeon(g, t, k, sd, Wd) {
  [[3, M.pink, 0], [Wd - 6, M.teal, 5]].forEach(([x, rp, s0]) => {
    const f = hs(Math.floor(t * 9) + s0 + sd), on = f > 0.12 * k ? 1 : 0, c = on ? rp[3] : rp[1];
    R(g, x - 1, 150, 5, 120, INK); R(g, x, 151, 3, 118, c); if (on) { R(g, x, 151, 1, 118, rp[4]); glow(g, x + 1, 210, 60, rp[2], 0.3); }
  });
}
/* status rail: a strip of LEDs along the floor edge that chase and blink */
function ambBlink(g, t, k, sd, Wd) {
  const y = 462, n = Math.floor((Wd - 20) / 12);
  R(g, 6, y - 2, n * 12 + 4, 8, INK); R(g, 7, y - 1, n * 12 + 2, 6, M.dark[1]);
  for (let i = 0; i < n; i++) { const on = Math.floor(t * 5 * k + i * 0.6 + hs(i + sd) * 3) % 4 === 0; R(g, 10 + i * 12, y, 5, 3, on ? M[AMB_COL[(i + sd) % 6]][3] : M.dark[3]); }
}
/* scrolling ticker: a band of text-like blocks that slides sideways */
function ambTicker(g, t, k, sd, Wd) {
  const y = 442, off = (t * 30 * k) % 48;
  R(g, -20, y - 1, Wd + 40, 12, INK); R(g, -20, y, Wd + 40, 10, M.dark[1]);
  for (let x = -60; x < Wd + 40; x += 48) for (let j = 0; j < 5; j++) { const w = 4 + Math.floor(hs(sd + j * 3 + 1) * 8), xx = x + off + j * 10; if (xx > -10 && xx < Wd + 10) R(g, xx, y + 3, w, 3, M[AMB_COL[(j + sd) % 6]][3]); }
}
/* birds crossing the upper sky as flapping Vs */
function ambBirds(g, t, k, sd, Wd) {
  for (let i = 0; i < Math.max(1, Math.round(2 * k)); i++) {
    const x = ((t * (14 + i * 5) * (0.6 + k * 0.4) + i * 90 + hs(sd + i) * 100) % (Wd + 60)) - 30, y = 82 + i * 12 + Math.round(Math.sin(t * 1.3 + i) * 3), fl = Math.floor(t * 6 + i) % 2;
    R(g, x - 3, y + fl, 3, 1, M.dark[1]); R(g, x, y + 1 - fl, 3, 1, M.dark[1]); R(g, x + 3, y + fl, 3, 1, M.dark[1]);
  }
}
/* foreground life: two dark bushes at the lower corners that breathe with the wind */
function ambBreath(g, t, k, sd, Wd) {
  const a = 3 * k; for (const [x, ph] of [[8, 0], [Wd - 10, 2]]) { const sw = Math.round(Math.sin(t * 1.1 + ph) * a), up = Math.round(Math.sin(t * 0.9 + ph * 1.7) * 1.5); disc(g, x + sw, 474 + up, 17, M.dark[0]); disc(g, x + sw * 1.5 - 6, 466 + up, 9, M.dark[0]); }
}
const AMB_FN = { torch: ambTorch, steam: ambSteam, neon: ambNeon, blink: ambBlink, ticker: ambTicker, birds: ambBirds };
function ambWrap(d) {
  if (!d || d.__amb) return d;
  d.__amb = true;
  const kinds = AMB_OF[d.id] || AMB_TIME[d.time || 'day'] || AMB_TIME.day, sd = seedOf(d.id || 'x'), m = d.mid, f = d.fore;
  d.ambient = kinds; d.__mid0 = m; d.__fore0 = f;
  d.mid = function (g, t, c) {
    if (m) m.call(this, g, t, c);
    const k = ambK(), Wd = (c && c.w && c.w.W) || 270;
    for (const kind of kinds) { if (kind === 'lane') ambLane(g, t, k, sd, d.id, Wd); else if (kind === 'walker') ambWalker(g, t, k, sd, Wd); else AMB_FN[kind] && kind !== 'birds' && AMB_FN[kind](g, t, k, sd, Wd); }
  };
  d.fore = function (g, t, c) {
    if (f) f.call(this, g, t, c);
    const k = ambK(), Wd = (c && c.w && c.w.W) || 270;
    if (kinds.includes('birds')) ambBirds(g, t, k, sd, Wd);
    ambBreath(g, t, k, sd, Wd);
  };
  return d;
}
for (const id in SC) ambWrap(SC[id]);
if (SC['workshop-stage'] && SC['workshop-stage'].build) { const b0 = SC['workshop-stage'].build; SC['workshop-stage'].build = (list, th) => ambWrap(b0(list, th)); }
