/* main.js - frame function, clean world changes (slide / iris) and the DOM overlays (karaoke captions, brand pill). Driven by hf-seek. */
'use strict';
const WORLDS = [drawW1, drawW2, drawW3, drawW4];
const WB = [0, T.cuando - 0.1, T.y - 0.1, T.por - 0.1];
const TRD = 0.45;
const TRTYPE = ['slide', 'iris', 'slide'];
const GRADES = [[255, 150, 70, 0.07], [255, 255, 255, 0], [255, 110, 70, 0.07], [20, 30, 110, 0.2]];

function irisClip(p, cx, cy) {
  return (g) => {
    g.beginPath();
    const r = Math.round(p * 360);
    for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt(r * r - dy * dy)); g.rect(cx - dx, cy + dy, dx * 2 + 1, 1); }
    g.clip();
  };
}
function pass(ox, oy, fn, clipFn) {
  for (const k in L) { L[k].save(); if (clipFn) clipFn(L[k]); L[k].translate(ox, oy); }
  const r = fn();
  for (const k in L) L[k].restore();
  return r;
}
function sceneIndex(t) { let i = 0; for (let k = 1; k < WB.length; k++) if (t >= WB[k]) i = k; return i; }

let lastGrade = '';
function frame(t) {
  for (const k in L) L[k].clearRect(-20, -20, W + 40, H + 40);
  let tr = null;
  for (let k = 1; k < WB.length; k++) if (t >= WB[k] - TRD && t < WB[k]) tr = { from: k - 1, to: k, p: (t - (WB[k] - TRD)) / TRD };
  let gi = sceneIndex(t), gp = 0;
  if (!tr) WORLDS[gi](t);
  else {
    const e = EA.io(tr.p), ty = TRTYPE[tr.from];
    if (ty === 'slide') { pass(-Math.round(e * W), 0, () => WORLDS[tr.from](t)); pass(Math.round(W - e * W), 0, () => WORLDS[tr.to](t)); }
    else { WORLDS[tr.from](t); pass(0, 0, () => WORLDS[tr.to](t), irisClip(tr.p, 135, 300)); }
    gi = tr.from; gp = e;
  }
  const a = GRADES[gi], b = GRADES[Math.min(GRADES.length - 1, gi + (tr ? 1 : 0))];
  const c = a.map((v, i) => v + (b[i] - v) * gp);
  const gs = 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + c[3].toFixed(3) + ')';
  if (gs !== lastGrade) { $('grade').style.background = gs; lastGrade = gs; }
  overlays(t);
}

/* ---------------- DOM overlays ---------------- */
const capsEl = $('caps');
const CAPCOL = ['#ff3d6e', '#ffd35e', '#2fd0f0', '#7be05a', '#b084f5'];
const capGroups = [];
CAP.forEach((g, gi) => {
  const d = document.createElement('div'); d.className = 'cg'; d.id = 'cg' + gi;
  const ws = g.words.map((w) => { const s = document.createElement('span'); s.className = 'cw'; s.textContent = w.d; d.appendChild(s); return s; });
  if (CAPS_ON) capsEl.appendChild(d);
  capGroups.push({ el: d, ws, g });
});
let lastGroup = -1;
function overlays(t) {
  let cur = -1;
  for (let i = 0; i < CAP.length; i++) if (t >= CAP[i].t0 - 0.02 && t < CAP[i].tEnd) cur = i;
  if (cur !== lastGroup) {
    if (lastGroup >= 0) capGroups[lastGroup].el.style.display = 'none';
    if (cur >= 0) capGroups[cur].el.style.display = 'block';
    lastGroup = cur;
  }
  if (cur >= 0) {
    const cg = capGroups[cur]; let wi = 0;
    cg.g.words.forEach((w, i) => { if (t >= w.t0 - 0.02) wi = i; });
    cg.ws.forEach((s, i) => {
      const on = i === wi; const cls = on ? 'cw on' : i < wi ? 'cw past' : 'cw fut';
      if (s.className !== cls) s.className = cls;
      if (on) { s.style.background = CAPCOL[(cg.g.ci + i) % CAPCOL.length]; s.style.color = '#1a1020'; s.style.textShadow = 'none'; } else { s.style.background = 'transparent'; s.style.color = '#fff'; s.style.textShadow = ''; }
    });
  }
  $('avs').style.transform = ((t % 3.1) < 0.1) ? 'scaleY(0.5)' : 'scaleY(1)';
}
/* brand pill avatar: chris's head */
(function () {
  const g = $('av').getContext('2d'); g.imageSmoothingEnabled = false;
  R(g, 0, 0, 20, 20, '#ffd35e');
  g.save(); g.beginPath(); g.rect(0, 0, 20, 20); g.clip();
  chris(g, { x: 11, y: 56, dir: 1, t: 0, u: 0.95, mood: 'n' });
  g.restore();
})();

function renderAt(t) { t = Math.max(0, Math.min(DUR - 0.001, t)); frame(t); }
const fontsReady = Promise.all([document.fonts.load('16px PS2P'), document.fonts.load('8px SLK'), document.fonts.load('700 64px PXS')]).then(() => { renderAt(0); });
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {}; window.__hf.buildReady.fonts = fontsReady;
window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
renderAt(0);
const tl = gsap.timeline({ paused: true }); tl.to({}, { duration: DUR });
window.__timelines = window.__timelines || {}; window.__timelines.main = tl;
