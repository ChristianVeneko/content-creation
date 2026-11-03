/* props.js: world assembly (platform, decor, props) and the named-state machine of every prop. Every channel is a pure function of
   the seek time: beats become tracks / transient windows at build time, evaluated with trackAt(). */
'use strict';
const SELF_SPIN = { tower: 1, 'hard-disk': 1, fan: 1, beacon: 1 };
const BLOB_TEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(60,40,20,0.55)'); r.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
const BURST_GEO = new T.SphereGeometry(1, 10, 8), SMOKE_GEO = new T.SphereGeometry(1, 12, 10);
const BURST_COLS = [PAL.coral, PAL.sun, PAL.teal, PAL.plum, PAL.sky, PAL.green, PAL.pink];
const wOff = (i) => (SPEC.mode === 'single' || true ? i * SPEC.spacing : 0);
const worldOffset = (i) => [i * SPEC.spacing, 0, 0];
const addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

async function buildWorld(w) {
  const set = CAT.SETTINGS[w.setting], g = new T.Group(), off = worldOffset(w.i);
  g.position.set(off[0], 0, 0);
  g.add(await DECOR[set.decor](set.pal));
  const props = {};
  for (const id in set.props) {
    const def = set.props[id], b = await KB[def.kind](def);
    const wrap = new T.Group(); wrap.add(b.root);
    const p = { id, def, kind: def.kind, b, wrap, home: v3(def.at), world: w.i, off, ev: { vis: [], grow: [], glow: [], fill: [], open: [], heat: [], pos: [] }, tr: [], spins: [], bursts: [], labelsAt: [] };
    const base = b.base || {};
    p.init = { vis: def.hidden ? 0 : 1, grow: 1, glow: base.glow == null ? 0 : base.glow, fill: base.fill == null ? 0 : base.fill, open: base.open || 0, heat: 0 };
    if (def.lit != null) p.init.glow = def.lit;
    wrap.position.set(def.at[0], def.at[1], def.at[2]);
    if (def.hidden) wrap.visible = false;
    if (def.at[1] < 0.5 && def.kind !== 'car') { const bl = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, opacity: STYLE.light.blob * 3 })); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.012 - def.at[1]; const sz = new T.Box3().setFromObject(b.root); const bw = Math.max(sz.max.x - sz.min.x, sz.max.z - sz.min.z) * 1.6 + 0.4; bl.scale.set(bw, bw, 1); wrap.add(bl); p.blob = bl; }
    if (KINDSX.heat(def.kind)) { p.smoke = []; for (let k = 0; k < 5; k++) { const m = new T.Mesh(SMOKE_GEO, new T.MeshBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; wrap.add(m); p.smoke.push(m); } }
    g.add(wrap); props[id] = p;
  }
  scene.add(g);
  const rt = { w, g, props };
  rt.anchor = (id) => { const pr = props[id]; if (pr) return [pr.home[0], 0, pr.home[2]]; const a = set.anchors && set.anchors[id] || CAT.GLOBAL_ANCHORS[id] || CAT.GLOBAL_ANCHORS.center; return v3(a); };
  return rt;
}
const KINDSX = { heat: (k) => (CAT.KINDS[k] || []).indexOf('heat') >= 0 };

/* beats -> events */
function wireBeats(rts) {
  for (const b of SPEC.beats) {
    const rt = rts[b.world]; if (!rt || !b.target) continue;
    const p = rt.props[b.target]; if (!p) continue;
    const t = b.t;
    switch (b.do) {
      case 'pop-in': p.ev.vis.push({ t, to: 1, dur: 0.55, ease: EZ.back }); break;
      case 'pop-out': p.ev.vis.push({ t, to: 0, dur: 0.35, ease: EZ.in3 }); break;
      case 'grow': p.ev.grow.push({ t, to: b.amount || 1.35, dur: 0.55, ease: EZ.back }); break;
      case 'shrink': p.ev.grow.push({ t, to: b.amount || 0.7, dur: 0.5, ease: EZ.back }); break;
      case 'light-up': p.ev.glow.push({ t, to: 1, dur: 0.3, ease: EZ.out3 }); break;
      case 'dim': p.ev.glow.push({ t, to: 0.04, dur: 0.5, ease: EZ.out3 }); break;
      case 'open': p.ev.open.push({ t, to: 1, dur: 0.7, ease: EZ.out3 }); break;
      case 'close': p.ev.open.push({ t, to: 0, dur: 0.5, ease: EZ.io }); break;
      case 'fill': p.ev.fill.push({ t, to: clamp(b.value == null ? 1 : b.value), dur: 0.9, ease: EZ.out3 }); break;
      case 'heat': p.ev.heat.push({ t, to: 1, dur: 1.3, ease: EZ.io }); break;
      case 'cool': p.ev.heat.push({ t, to: 0, dur: 1.6, ease: EZ.io }); break;
      case 'move': { if (b.to) { const o = rts[b.to.world] ? worldOffset(b.to.world) : [0, 0, 0], loc = [b.to.p[0] + (o[0] - p.off[0]), p.home[1], b.to.p[2]]; p.ev.pos.push({ t, to: loc, dur: b.dur || (p.kind === 'car' ? 2.0 : 1.2), ease: EZ.io, car: p.kind === 'car' }); } break; }
      case 'pulse': p.tr.push({ k: 'pulse', t, dur: 0.6, amp: 0.2 }); break;
      case 'shake': p.tr.push({ k: 'shake', t, dur: b.dur || 0.9, amp: 0.07 }); break;
      case 'spin': p.spins.push({ t, dur: b.dur || 1.6, turns: 3 }); break;
      case 'burst': p.bursts.push({ t, n: 16 }); break;
      case 'label': p.labelsAt.push(b); break;
    }
  }
}
function finishProps(rts) {
  for (const rt of rts) for (const id in rt.props) {
    const p = rt.props[id];
    for (const k of ['vis', 'grow', 'glow', 'fill', 'open', 'heat']) p.ev[k] = buildTrack(p.ev[k], p.init[k]);
    p.ev.pos = buildTrack(p.ev.pos, p.home, mixV3);
    p.burstMeshes = p.bursts.map((bu, bi) => { const grp = new T.Group(); grp.visible = false; const parts = []; for (let k = 0; k < bu.n; k++) { const m = new T.Mesh(BURST_GEO, clayMat(BURST_COLS[(k + bi) % BURST_COLS.length], { rough: 0.7, nobump: true })); grp.add(m); parts.push(m); } rt.g.add(grp); return { grp, parts, bu }; });
  }
}
function evalProp(p, t) {
  const vis = trackAt(p.ev.vis, t), grow = trackAt(p.ev.grow, t), glow = trackAt(p.ev.glow, t), fill = trackAt(p.ev.fill, t), open = trackAt(p.ev.open, t), heat = trackAt(p.ev.heat, t), pos = trackAt(p.ev.pos, t);
  let spin = 0, act = 0;
  for (const s of p.spins) { const u = clamp((t - s.t) / s.dur); if (t >= s.t) spin += s.turns * TAU * EZ.io(u); if (t >= s.t && t < s.t + s.dur) act = Math.max(act, Math.sin(u * Math.PI) ** 0.5); }
  let sc = vis * grow, ox = 0, oy = 0, rz = 0, sx = 1, sy = 1;
  const ph = hs(p.home[0] * 3 + p.home[2]) * 6;
  sy *= 1 + 0.008 * Math.sin(t * 1.8 + ph);
  for (const e of p.tr) {
    const u = (t - e.t) / e.dur; if (u < 0 || u > 1) continue;
    if (e.k === 'pulse') { const k = Math.sin(u * Math.PI); sy *= 1 + e.amp * k; sx *= 1 - e.amp * 0.45 * k; }
    else { const k = (1 - u) * Math.sin(u * 46); ox += e.amp * k; rz += 0.05 * k; oy += Math.abs(e.amp * 0.5 * k); }
  }
  let arcY = 0, yaw = null;
  for (const e of p.ev.pos.events) { const u = clamp((t - e.t) / e.dur); if (t >= e.t && t < e.t + e.dur && !e.car) arcY = Math.sin(u * Math.PI) * 0.6; if (e.car && t >= e.t) { const dx = e.to[0] - e.from[0], dz = e.to[2] - e.from[2]; if (Math.hypot(dx, dz) > 0.01) yaw = Math.atan2(dx, dz); } }
  const ch = { glow, fill, open, heat, spin, act, t };
  p.wrap.visible = vis > 0.01;
  p.wrap.position.set(pos[0] + ox, pos[1] + oy + arcY, pos[2]);
  p.wrap.scale.set(sc * sx, sc * sy, sc * sx);
  p.wrap.rotation.z = rz;
  p.wrap.rotation.y = yaw != null ? yaw + (CAT.MODELS[p.def.model] && CAT.MODELS[p.def.model].yaw || 0) : 0;
  if (!SELF_SPIN[p.kind] && spin) p.b.root.rotation.y = spin;
  if (p.blob) { p.blob.position.y = 0.012 - pos[1] - oy - arcY; p.blob.rotation.z = 0; }
  p.b.update(ch, t);
  if (p.smoke) {
    const on = heat > 0.22;
    p.smoke.forEach((m, k) => { m.visible = on; if (!on) return; const ph2 = (t * 0.55 + k / 5) % 1; m.position.set(Math.sin(k * 2.3 + t * 0.7) * 0.18, p.b.top + ph2 * 1.3, Math.cos(k * 1.7) * 0.15); const s = 0.1 + 0.26 * ph2; m.scale.set(s, s, s); m.material.opacity = (1 - ph2) * 0.5 * clamp(heat * 1.3); });
  }
  for (const bm of p.burstMeshes) {
    const u = (t - bm.bu.t) / 1.15, on = u >= 0 && u < 1; bm.grp.visible = on && vis > 0.01; if (!on) continue;
    const tau = u * 1.15; bm.grp.position.set(p.wrap.position.x, p.wrap.position.y + p.b.top * 0.7, p.wrap.position.z);
    bm.parts.forEach((m, k) => { const a = hs(k * 3.1 + bm.bu.t * 7) * TAU, e = 0.3 + hs(k * 5.3) * 0.9, sp = 1.4 + hs(k * 1.7) * 2.2; m.position.set(Math.cos(a) * sp * tau * e * 1.4, 1.1 * sp * tau * e + 0.5 * -4.5 * tau * tau, Math.sin(a) * sp * tau * e * 1.2); const s = (0.07 + hs(k * 9.1) * 0.08) * Math.pow(1 - u, 0.6); m.scale.set(s, s, s); });
  }
}
