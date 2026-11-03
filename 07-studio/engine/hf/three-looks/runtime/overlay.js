/* overlay.js: DOM layers drawn from the seek time: karaoke captions (own), floating labels, stamp words, transitions, vignette. */
'use strict';
const $ = (id) => document.getElementById(id);
const capsEl = $('caps'), labelsEl = $('labels'), stampsEl = $('stamps'), wipeEl = $('wipe');
const CAP_ON = (() => { try { const v = window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables(); if (v && typeof v.captions === 'boolean') return v.captions; } catch (e) {} return SPEC.capsDefault; })();
const GROUP_EL = [], LABEL_EL = [], STAMP_EL = [];
function buildOverlay() {
  SPEC.groups.forEach((g, i) => {
    const d = document.createElement('div'); d.className = 'cg'; d.id = 'cg' + i;
    g.words.forEach((w) => { const s = document.createElement('span'); s.className = 'cw'; s.textContent = w.d; d.appendChild(s); });
    capsEl.appendChild(d); GROUP_EL.push({ el: d, ws: Array.from(d.children) });
  });
  const tagC = ['#fff4dc', '#fdd9c9', '#d6ecdf', '#d8e4f6'], stC = ['#f2a65a', '#6db3a8', '#e9806e', '#9a7fb5'];
  let si = 0;
  for (const b of SPEC.beats) {
    if (b.do === 'label') { const e = document.createElement('div'); e.className = 'tag'; e.textContent = b.text; labelsEl.appendChild(e); LABEL_EL.push({ b, el: e, i: LABEL_EL.length }); }
    if (b.do === 'stamp') { const e = document.createElement('div'); e.className = 'stamp'; e.textContent = b.text; e.style.background = stC[si % 4]; si++; stampsEl.appendChild(e); STAMP_EL.push({ b, el: e }); }
  }
}
function overlayAt(t) {
  const on = CAP_ON; capsEl.style.display = on ? 'block' : 'none';
  let gi = -1; for (let i = 0; i < SPEC.groups.length; i++) { const g = SPEC.groups[i]; if (t >= g.t0 && t < g.tEnd) gi = i; }
  GROUP_EL.forEach((g, i) => { g.el.style.display = i === gi ? 'block' : 'none'; });
  if (gi >= 0) { const g = SPEC.groups[gi]; let act = -1; g.words.forEach((w, k) => { if (t >= w.t0) act = k; }); GROUP_EL[gi].ws.forEach((s, k) => { s.className = 'cw' + (k === act ? ' on' : ''); }); }
  // labels
  const v = new T.Vector3();
  for (const LB of LABEL_EL) {
    const b = LB.b, hold = b.hold || 2.4, u = t - b.t, e = LB.el;
    if (u < 0 || u > hold) { e.style.display = 'none'; continue; }
    const rt = RTS[b.world], p = rt && rt.props[b.target]; if (!p || !p.wrap.visible) { e.style.display = 'none'; continue; }
    p.wrap.getWorldPosition(v); v.y += p.b.top * p.wrap.scale.y * 1.0 + 0.35; v.project(cam);
    let x = (v.x * 0.5 + 0.5) * FW, y = (1 - (v.y * 0.5 + 0.5)) * FH;
    e.style.display = 'block';
    const R = ZONES.label, hw = (e.offsetWidth || 300) / 2 + 6; x = clamp(x, R.x0 + hw, R.x1 - hw); y = clamp(y, R.y0, R.y1);
    const k = Math.min(EZ.back(clamp(u / 0.3)), clamp((hold - u) / 0.25) * 1.0 + 0.0001);
    e.style.display = 'block';
    e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.transform = 'translate(-50%,-100%) scale(' + Math.max(0.01, k) + ') rotate(' + (LB.i % 2 ? 2 : -2) + 'deg)';
  }
  for (const S of STAMP_EL) {
    const u = t - S.b.t, hold = 1.5, e = S.el;
    if (u < 0 || u > hold) { e.style.display = 'none'; continue; }
    const k = Math.min(EZ.elastic(clamp(u / 0.5)), clamp((hold - u) / 0.2));
    e.style.display = 'block'; e.style.transform = 'translate(-50%,-50%) scale(' + Math.max(0.01, k) + ') rotate(' + (-4 + 0.0) + 'deg)';
  }
  // transitions (multi mode)
  let q = -1, kind = 'iris';
  if (SPEC.mode === 'multi') for (const w of SPEC.worlds) { if (!w.transition) continue; const a = w.t0 - 0.3, b = w.t0 + 0.36; if (t >= a && t < b) { q = t < w.t0 ? (t - a) / 0.3 : 1 + (t - w.t0) / 0.36; kind = w.transition; } }
  if (q < 0) { wipeEl.style.display = 'none'; return; }
  wipeEl.style.display = 'block';
  const c1 = STYLE.transition.color, c2 = STYLE.transition.color2, inP = q <= 1, p = inP ? EZ.io(q) : EZ.io(q - 1);
  wipeEl.style.clipPath = 'none'; wipeEl.style.transform = 'none'; wipeEl.style.background = c1; wipeEl.style.borderRadius = '0';
  if (kind === 'iris') { const r = (inP ? p : 1 - p) * 1500; wipeEl.style.clipPath = 'circle(' + r + 'px at 50% 38%)'; wipeEl.style.background = 'radial-gradient(circle at 50% 38%, ' + c2 + ' 0%, ' + c1 + ' 60%)'; }
  else if (kind === 'slide') { wipeEl.style.transform = 'translateX(' + (inP ? -100 + 100 * p : 100 * p) + '%)'; wipeEl.style.background = 'linear-gradient(90deg,' + c1 + ',' + c2 + ')'; }
  else if (kind === 'drop') { wipeEl.style.transform = 'translateY(' + (inP ? -100 + 100 * p : 100 * p) + '%)'; wipeEl.style.background = 'linear-gradient(180deg,' + c2 + ',' + c1 + ')'; wipeEl.style.borderRadius = '0 0 140px 140px'; }
  else { const r = (inP ? p : 1 - p) * 1700; wipeEl.style.clipPath = 'circle(' + r + 'px at 50% 55%)'; wipeEl.style.background = c2; }
}
