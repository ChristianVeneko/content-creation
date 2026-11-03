/* overlay.js: DOM layers drawn from the seek time: karaoke captions (own), name tags with leader lines, stamp words. Tags and stamps are placed at compose
   time (place.mjs) away from the hero and the targeted object; the leader line follows its object every frame. Transitions live in the canvas (post.js). */
'use strict';
const $ = (id) => document.getElementById(id);
const capsEl = $('caps'), labelsEl = $('labels'), stampsEl = $('stamps'), leadEl = $('leaders');
const CAP_ON = (() => { try { const v = window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables(); if (v && typeof v.captions === 'boolean') return v.captions; } catch (e) {} return SPEC.capsDefault; })();
const GROUP_EL = [], LABEL_EL = [], STAMP_EL = [];
const SVGNS = 'http://www.w3.org/2000/svg';
let CUR_POSE = null;
function buildOverlay() {
  SPEC.groups.forEach((g, i) => {
    const d = document.createElement('div'); d.className = 'cg'; d.id = 'cg' + i;
    g.words.forEach((w) => { const s = document.createElement('span'); s.className = 'cw'; s.textContent = w.d; d.appendChild(s); });
    capsEl.appendChild(d); GROUP_EL.push({ el: d, ws: Array.from(d.children) });
  });
  const stC = ['#f2a65a', '#6db3a8', '#e9806e', '#9a7fb5'];
  let si = 0;
  for (const b of SPEC.beats) {
    if (b.do === 'label') {
      const e = document.createElement('div'); e.className = 'tag'; e.textContent = b.text; labelsEl.appendChild(e);
      const ln = document.createElementNS(SVGNS, 'line'), dot = document.createElementNS(SVGNS, 'circle');
      ln.setAttribute('stroke', STYLE.tag.border); ln.setAttribute('stroke-width', '7'); ln.setAttribute('stroke-linecap', 'round'); dot.setAttribute('r', '11'); dot.setAttribute('fill', STYLE.tag.border);
      leadEl.appendChild(ln); leadEl.appendChild(dot); LABEL_EL.push({ b, el: e, ln, dot, i: LABEL_EL.length });
    }
    if (b.do === 'stamp') { const e = document.createElement('div'); e.className = 'stamp'; e.textContent = b.text; e.style.background = stC[si % 4]; if (b.pos) { e.style.fontSize = b.pos.px + 'px'; } si++; stampsEl.appendChild(e); STAMP_EL.push({ b, el: e }); }
  }
}
const _av = new T.Vector3();
function findObj(wi, id) { const rt = RTS[wi]; return (rt && rt.objects[id]) || CHARS.find((c) => (c.wi === wi || c.global) && c.who === id) || (id === 'hero' ? HERO_GLOBAL || CHARS.find((c) => c.wi === wi && c.ent.isHero) : null); }
function overlayAt(t) {
  const on = CAP_ON; capsEl.style.display = on ? 'block' : 'none';
  let gi = -1; for (let i = 0; i < SPEC.groups.length; i++) { const g = SPEC.groups[i]; if (t >= g.t0 && t < g.tEnd) gi = i; }
  GROUP_EL.forEach((g, i) => { g.el.style.display = i === gi ? 'block' : 'none'; });
  if (gi >= 0) { const g = SPEC.groups[gi]; let act = -1; g.words.forEach((w, k) => { if (t >= w.t0) act = k; }); GROUP_EL[gi].ws.forEach((s, k) => { s.className = 'cw' + (k === act ? ' on' : ''); }); }
  for (const LB of LABEL_EL) {
    const b = LB.b, hold = b.hold || 2.4, u = t - b.t, e = LB.el;
    const hide = () => { e.style.display = 'none'; LB.ln.style.display = 'none'; LB.dot.style.display = 'none'; };
    if (u < 0 || u > hold || !b.pos) { hide(); continue; }
    const o = findObj(b.world, b.target); if (!o || !o.root.visible || !CUR_POSE) { hide(); continue; }
    const ap = projectPx({ pos: CUR_POSE.pos, look: CUR_POSE.look, fov: CUR_POSE.fov }, (() => { objectAnchor(o, _av); return [_av.x, _av.y, _av.z]; })());
    if (!ap) { hide(); continue; }
    const k = Math.min(EZ.back(clamp(u / 0.3)), clamp((hold - u) / 0.25) * 1.0 + 0.0001);
    e.style.display = 'block'; e.style.left = b.pos.cx + 'px'; e.style.top = b.pos.cy + 'px';
    e.style.transform = 'translate(-50%,-50%) scale(' + Math.max(0.01, k) + ') rotate(' + (LB.i % 2 ? 1.5 : -1.5) + 'deg)';
    // leader line from the tag edge toward the object
    const hw = (e.offsetWidth || 300) / 2, hh = (e.offsetHeight || 80) / 2, dx = ap.x - b.pos.cx, dy = ap.y - b.pos.cy, s = Math.min(dx !== 0 ? hw / Math.abs(dx) : 1e9, dy !== 0 ? hh / Math.abs(dy) : 1e9), sx = b.pos.cx + dx * Math.min(1, s), sy = b.pos.cy + dy * Math.min(1, s);
    const len = Math.hypot(ap.x - sx, ap.y - sy), prog = clamp(u / 0.35) * clamp((hold - u) / 0.2 + 0.0001);
    LB.ln.style.display = len > 6 ? 'block' : 'none'; LB.dot.style.display = len > 6 ? 'block' : 'none';
    LB.ln.setAttribute('x1', sx); LB.ln.setAttribute('y1', sy); LB.ln.setAttribute('x2', sx + (ap.x - sx) * prog); LB.ln.setAttribute('y2', sy + (ap.y - sy) * prog);
    LB.dot.setAttribute('cx', ap.x); LB.dot.setAttribute('cy', ap.y); LB.dot.setAttribute('r', 11 * clamp((prog - 0.6) / 0.4));
  }
  for (const S of STAMP_EL) {
    const u = t - S.b.t, hold = 1.5, e = S.el;
    if (u < 0 || u > hold || !S.b.pos) { e.style.display = 'none'; continue; }
    const k = Math.min(EZ.elastic(clamp(u / 0.5)), clamp((hold - u) / 0.2));
    e.style.display = 'block'; e.style.left = S.b.pos.cx + 'px'; e.style.top = S.b.pos.cy + 'px';
    e.style.transform = 'translate(-50%,-50%) scale(' + Math.max(0.01, k) + ') rotate(-4deg)';
  }
}
