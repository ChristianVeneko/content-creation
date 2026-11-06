/* parts.js: builds an object (builder result or hand-written parts) from primitive parts and evaluates it as a pure function of the seek time:
   named-state channels (open, fill, heat, glow, spin, explode) driven by beats, keyframes, procedural motion presets, transients
   (pulse, shake, hop arcs) and bursts. Same semantics as parts.mjs (stateTransform / effectValue). */
'use strict';
const EASE = { linear: EZ.lin, 'in-out': EZ.io, out: EZ.out3, in: EZ.in3, back: EZ.back, elastic: EZ.elastic };
const HEAT_COL = new T.Color('#e5574f'), _c1 = new T.Color(), _c2 = new T.Color();
const BLOB_TEX = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(60,40,20,0.55)'); r.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
const BURST_GEO = new T.SphereGeometry(1, 10, 8), SMOKE_GEO = new T.SphereGeometry(1, 12, 10);
const BURST_COLS = ['#e9806e', '#f2b45a', '#6db3a8', '#9a7fb5', '#8fb7e0', '#7fbf8a', '#e9a0b4'];
const worldOffset = (i) => [i * SPEC.spacing, 0, 0];
const mixAngle = (a, b, u) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * u; };

function effValue(name, eff, ch) {
  const v = ch[name] || 0;
  if (name === 'spin') return v;
  const a = eff.from == null ? 0 : eff.from, b = eff.to == null ? 1 : eff.to;
  return clamp((v - a) / Math.max(1e-6, b - a));
}
const arr3 = (s) => (Array.isArray(s) ? s : [s == null ? 1 : s, s == null ? 1 : s, s == null ? 1 : s]);

/* ---- position along a path (same math as resolve.mjs posAt) ---- */
function pathAt(ent, t) {
  let x = ent.at[0], z = ent.at[2], hop = 0, moving = null;
  for (const ev of ent.path) {
    if (t >= ev.t + ev.dur) { x = ev.to[0]; z = ev.to[1]; continue; }
    if (t >= ev.t) { const u = ev.dur > 0 ? (t - ev.t) / ev.dur : 1, k = EZ.io(u); x = ev.from[0] + (ev.to[0] - ev.from[0]) * k; z = ev.from[1] + (ev.to[1] - ev.from[1]) * k; moving = ev; if (ev.hop) hop = Math.sin(u * Math.PI) * 0.6; }
    break;
  }
  return { x, z, hop, moving };
}

/* ---- keyframes: offsets relative to the rest pose. The pose eases from rest (t = 0) to the first key, then key to key; after the last key it holds ---- */
function keyAt(keys, t) {
  const out = { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], op: 1 };
  let a = { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], op: 1 }, at0 = 0;
  for (const k of keys) {
    const b = { p: k.pos || [0, 0, 0], r: k.rot || [0, 0, 0], s: arr3(k.scale), op: k.opacity == null ? 1 : k.opacity };
    if (t < k.at) {
      const e = (EASE[k.ease] || EZ.io)(clamp((t - at0) / Math.max(1e-6, k.at - at0)));
      for (let i = 0; i < 3; i++) { out.p[i] = lerp(a.p[i], b.p[i], e); out.r[i] = lerp(a.r[i], b.r[i], e); out.s[i] = lerp(a.s[i], b.s[i], e); }
      out.op = lerp(a.op, b.op, e); return out;
    }
    a = b; at0 = k.at;
  }
  for (let i = 0; i < 3; i++) { out.p[i] = a.p[i]; out.r[i] = a.r[i]; out.s[i] = a.s[i]; } out.op = a.op;
  return out;
}

/* ---- build ---- */
async function buildObject(ent) {
  if (ent.stock) { if (typeof buildStockObject === 'undefined') throw new Error('stock model ' + ent.stock + ' needs "stock": true'); return buildStockObject(ent); }
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const recs = {}, order = [], byId = {};
  const heatObj = SPEC.beats.some((b) => b.do === 'heat' && b.target === ent.id);
  ent.parts.forEach((p) => { byId[p.id] = p; });
  ent.parts.forEach((p) => {
    const g = new T.Group(), dyn = isDyn(p) || heatObj, geo = partGeometry(p);
    const rec = { p, g, dyn, lit: isLit(p) || !!(p.states && Object.keys(p.states).some((k) => p.states[k] && p.states[k].emissive)), off: { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], op: 1 }, parent: p.parent ? recs[p.parent] || null : null, mesh: null };
    if (geo) {
      const mat = partMaterial(p, ent, dyn), mesh = new T.Mesh(geo, mat), pv = p.pivot || [0, 0, 0];
      if (DOUBLE[p.shape]) mat.side = T.DoubleSide;
      mesh.position.set(-pv[0], -pv[1], -pv[2]); mesh.castShadow = !(mat.transparent && mat.opacity < 0.6) && p.shape !== 'plane'; mesh.receiveShadow = true;
      g.add(mesh); rec.mesh = mesh;
      if (rec.lit && mat.emissive) mat.emissive.copy(mat.userData.base);
    }
    recs[p.id] = rec; order.push(rec);
  });
  order.forEach((rec) => { const par = rec.p.parent && recs[rec.p.parent]; (par ? par.g : body).add(rec.g); rec.parent = par || null; });
  // top-level parts and the object centre (directions of explode/assemble)
  const top = order.filter((r) => !r.parent);
  const o = { ent, root, body, recs, order, top, seed: hs(ent.at[0] * 3.1 + ent.at[2] * 1.7 + ent.id.length * 0.77) * 20, wi: 0, heatObj, hasSpinPart: order.some((r) => r.p.states && r.p.states.spin), hasStates: order.some((r) => r.p.states), tr: [], spins: [], bursts: [], labels: [], ev: { vis: [], grow: [], glow: [], fill: [], open: [], heat: [], explode: [] } };
  const init = ent.init || {};
  o.init = { vis: ent.hidden ? 0 : 1, grow: 1, glow: init.glow == null ? 0.7 : init.glow, fill: init.fill || 0, open: init.open || 0, heat: 0, explode: 0 };
  // contact blob
  const ext = (() => { const b = new T.Box3(); root.updateMatrixWorld(true); b.setFromObject(body); return b; })();
  o.top = Math.max(0.3, ext.max.y * ent.scale); o.width = Math.max(0.3, Math.max(ext.max.x - ext.min.x, ext.max.z - ext.min.z) * ent.scale);
  const blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, opacity: STYLE.light.blob * 3 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.scale.set(o.width * 1.5 + 0.5, o.width * 1.5 + 0.5, 1); root.add(blob); o.blob = blob;
  if (heatObj) { o.smoke = []; for (let k = 0; k < 5; k++) { const m = new T.Mesh(SMOKE_GEO, new T.MeshBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; root.add(m); o.smoke.push(m); } }
  body.scale.setScalar(ent.scale);
  return o;
}

/* ---- beats -> channel events ---- */
function wireObjectBeats(o, wi) {
  o.wi = wi;
  for (const b of SPEC.beats) {
    if (b.world !== wi || b.target !== o.ent.id) continue;
    const t = b.t, ev = o.ev;
    switch (b.do) {
      case 'pop-in': ev.vis.push({ t, to: 1, dur: 0.55, ease: EZ.back }); break;
      case 'pop-out': ev.vis.push({ t, to: 0, dur: 0.35, ease: EZ.in3 }); break;
      case 'grow': ev.grow.push({ t, to: b.amount || 1.35, dur: 0.55, ease: EZ.back }); break;
      case 'shrink': ev.grow.push({ t, to: b.amount || 0.7, dur: 0.5, ease: EZ.back }); break;
      case 'light-up': ev.glow.push({ t, to: 1, dur: 0.3, ease: EZ.out3 }); break;
      case 'dim': ev.glow.push({ t, to: 0.04, dur: 0.5, ease: EZ.out3 }); break;
      case 'open': ev.open.push({ t, to: 1, dur: 0.7, ease: EZ.out3 }); break;
      case 'close': ev.open.push({ t, to: 0, dur: 0.5, ease: EZ.io }); break;
      case 'fill': ev.fill.push({ t, to: clamp(b.value == null ? 1 : b.value), dur: 0.9, ease: EZ.out3 }); break;
      case 'heat': ev.heat.push({ t, to: 1, dur: 1.3, ease: EZ.io }); break;
      case 'cool': ev.heat.push({ t, to: 0, dur: 1.6, ease: EZ.io }); break;
      case 'explode': ev.explode.push({ t, to: 1, dur: 1.0, ease: EZ.out3 }); break;
      case 'assemble': ev.explode.push({ t, to: 0, dur: 1.1, ease: EZ.io }); break;
      case 'pulse': o.tr.push({ k: 'pulse', t, dur: 0.6, amp: 0.2 }); break;
      case 'shake': o.tr.push({ k: 'shake', t, dur: b.dur || 0.9, amp: 0.07 }); break;
      case 'spin': o.spins.push({ t, dur: b.dur || 1.6, turns: 3 }); break;
      case 'burst': o.bursts.push({ t, n: 16 }); break;
      case 'label': o.labels.push(b); break;
    }
  }
  for (const k of Object.keys(o.ev)) o.ev[k] = buildTrack(o.ev[k], o.init[k]);
  o.burstMeshes = o.bursts.map((bu, bi) => { const grp = new T.Group(); grp.visible = false; const parts = []; for (let k = 0; k < bu.n; k++) { const m = new T.Mesh(BURST_GEO, solidMat(BURST_COLS[(k + bi) % BURST_COLS.length], 0.7)); grp.add(m); parts.push(m); } return { grp, parts, bu }; });
}

/* ---- motion presets ---- */
const hdir = (k) => { const a = hs(k * 3.1) * TAU, e = (hs(k * 7.7) - 0.3) * 1.2; return [Math.cos(a) * Math.cos(e), Math.sin(e) + 0.3, Math.sin(a) * Math.cos(e)]; };
function offOf(o, id) { return id ? (o.recs[id] ? o.recs[id].off : null) : o.rootOff; }
function explodeFx(o, e, amp) {
  const c = o.centre;
  o.top_.forEach((r, k) => { const p = r.p.pos || [0, 0, 0]; let d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; const l = Math.hypot(d[0], d[1], d[2]); d = l > 0.05 ? [d[0] / l, d[1] / l, d[2] / l] : hdir(k + o.seed); const O = r.off; O.p[0] += d[0] * e * amp; O.p[1] += d[1] * e * amp; O.p[2] += d[2] * e * amp; O.r[1] += e * 40 * (hs(k + o.seed) - 0.5); });
}
function runMotion(o, t, list, owner) {
  for (const m of list) {
    const ty = m.type, sp = m.speed || 1, a = m.amp, t0 = m.at == null ? 0 : m.at, t1 = m.until == null ? 1e9 : m.until, ph = hs(o.seed + (owner ? owner.length : 0.5)) * TAU;
    const own = offOf(o, owner); if (!own) continue;
    const live = t >= t0 && t <= t1;
    if (ty === 'pop-in') { const u = clamp((t - t0) / 0.55); const k = t < t0 ? 0.001 : EZ.back(u); own.s[0] *= k; own.s[1] *= k; own.s[2] *= k; continue; }
    if (ty === 'assemble') {
      const ids = m.parts || o.top.map((r) => r.p.id), u = clamp((t - t0) / 1.3), e = EZ.out3(u);
      ids.forEach((id, k) => { const O = offOf(o, id); if (!O) return; const d = hdir(k + o.seed); const amp2 = a == null ? 1.4 : a; O.p[0] += d[0] * (1 - e) * amp2; O.p[1] += d[1] * (1 - e) * amp2; O.p[2] += d[2] * (1 - e) * amp2; const sc = t < t0 ? 0.001 : clamp(u * 3); O.s[0] *= sc; O.s[1] *= sc; O.s[2] *= sc; });
      continue;
    }
    if (ty === 'explode') { if (t >= t0) explodeFx(o, EZ.out3(clamp((t - t0) / 1.0)), a == null ? 0.8 : a); continue; }
    if (!live) continue;
    const w = t * sp * TAU;
    switch (ty) {
      case 'bob': own.p[1] += (a == null ? 0.06 : a) * Math.sin(w * 0.55 + ph); break;
      case 'float': own.p[1] += (a == null ? 0.12 : a) * Math.sin(w * 0.35 + ph); own.r[2] += 2.5 * Math.sin(w * 0.25 + ph); break;
      case 'spin': { const ax = m.axis === 'x' ? 0 : m.axis === 'z' ? 2 : 1; own.r[ax] += (a == null ? 60 : a) * sp * (t - t0); break; }
      case 'wobble': own.r[2] += (a == null ? 6 : a) * Math.sin(w * 0.8 + ph); break;
      case 'breathe': { const k = (a == null ? 0.03 : a) * Math.sin(w * 0.5 + ph); own.s[1] *= 1 + k; own.s[0] *= 1 - k * 0.5; own.s[2] *= 1 - k * 0.5; break; }
      case 'hop': { const per = 1.6 / sp, u = ((t - t0) % per) / per, air = 0.6; if (u < air) own.p[1] += (a == null ? 0.3 : a) * 4 * (u / air) * (1 - u / air); else { const q = Math.sin(((u - air) / (1 - air)) * Math.PI) * 0.12; own.s[1] *= 1 - q; own.s[0] *= 1 + q * 0.5; own.s[2] *= 1 + q * 0.5; } break; }
      case 'wave': { const rest = owner && o.recs[owner] ? (o.recs[owner].p.pos || [0, 0, 0])[0] : 1, sg = rest < 0 ? -1 : 1, env = clamp((t - t0) / 0.4) * clamp((t1 - t) / 0.4); own.r[2] += sg * ((m.lift == null ? 130 : m.lift) * env + 18 * env * Math.sin(w * 1.6)); break; }
      case 'walk': { const ids = m.parts || [], A = a == null ? 28 : a; ids.forEach((id, i) => { const O = offOf(o, id); if (O) O.r[0] += A * Math.sin(w * 1.3 + (i % 2) * Math.PI); }); o.rootOff.p[1] += Math.abs(Math.sin(w * 1.3)) * 0.04; break; }
      case 'blink': { const per = 3.2, u = (t + hs(o.seed) * per) % per; if (u < 0.13) (m.parts || []).forEach((id) => { const O = offOf(o, id); if (O) O.s[1] *= 0.1; }); break; }
      case 'look-at-camera': o.lookCam = true; break;
      default: break;
    }
  }
}

function applyPart(o, rec, t, ch, gf) {
  const p = rec.p, O = rec.off, base = p.pos || [0, 0, 0], rot = p.rot || [0, 0, 0], sc = arr3(p.scale), pv = p.pivot || [0, 0, 0], ppv = rec.parent ? (rec.parent.p.pivot || [0, 0, 0]) : [0, 0, 0];
  let px = base[0], py = base[1], pz = base[2], rx = rot[0], ry = rot[1], rz = rot[2], sx = sc[0], sy = sc[1], sz = sc[2], op = 1;
  const st = p.states;
  if (st) for (const name in st) {
    const eff = st[name]; if (!eff) continue; const v = effValue(name, eff, ch);
    if (eff.pos) { px += eff.pos[0] * v; py += eff.pos[1] * v; pz += eff.pos[2] * v; }
    if (eff.rot) { rx += eff.rot[0] * v; ry += eff.rot[1] * v; rz += eff.rot[2] * v; }
    if (eff.scale != null) { const e = arr3(eff.scale), m1 = 1 + (e[0] - 1) * v, m2 = 1 + (e[1] - 1) * v, m3 = 1 + (e[2] - 1) * v; if (eff.grow === 'bottom') { const bb = p.size ? (p.shape === 'box' ? p.size[1] : p.shape === 'cylinder' ? p.size[p.size.length - 1] : p.shape === 'sphere' ? (p.size[1] == null ? p.size[0] : p.size[1]) * 2 : 1) : 1; py += (bb / 2) * sc[1] * (m2 - 1); } sx *= m1; sy *= m2; sz *= m3; }
  }
  if (p.keys) { const k = keyAt(p.keys, t); px += k.p[0]; py += k.p[1]; pz += k.p[2]; rx += k.r[0]; ry += k.r[1]; rz += k.r[2]; sx *= k.s[0]; sy *= k.s[1]; sz *= k.s[2]; op = k.op; }
  px += O.p[0]; py += O.p[1]; pz += O.p[2]; rx += O.r[0]; ry += O.r[1]; rz += O.r[2]; sx *= O.s[0]; sy *= O.s[1]; sz *= O.s[2];
  rec.g.position.set(-ppv[0] + px + pv[0], -ppv[1] + py + pv[1], -ppv[2] + pz + pv[2]);
  rec.g.rotation.set(rx * D2R, ry * D2R, rz * D2R); rec.g.scale.set(sx, sy, sz);
  if (rec.mesh && rec.dyn) {
    const m = rec.mesh.material, u = m.userData; _c1.copy(u.base);
    let em = u.em * gf, opacity = u.op * op;
    if (st) for (const name in st) { const eff = st[name]; if (!eff) continue; const v = effValue(name, eff, ch); if (eff.emissive) em += eff.emissive * v; if (eff.color) _c1.lerp(_c2.set(eff.color), v); if (eff.opacity != null) opacity = lerp(opacity, eff.opacity, v); }
    if (o.heatObj && !(st && st.heat) && !rec.lit) _c1.lerp(HEAT_COL, 0.3 * ch.heat);
    m.color.copy(_c1);
    if (rec.lit) { m.emissive.copy(_c1); m.emissiveIntensity = clamp(em, 0, 3.4); }
    if (u.op < 1 || op < 1 || opacity < 1) { m.transparent = true; m.opacity = clamp(opacity); }
    rec.mesh.visible = !(m.transparent && m.opacity < 0.02) && sx * sy * sz > 1e-6;
  }
}

function evalObject(o, t) {
  const ent = o.ent, ev = o.ev;
  const vis = trackAt(ev.vis, t), grow = trackAt(ev.grow, t), glow = trackAt(ev.glow, t), fill = trackAt(ev.fill, t), open = trackAt(ev.open, t), heat = trackAt(ev.heat, t), expl = trackAt(ev.explode, t);
  let spin = 0, act = 0;
  for (const s of o.spins) { const u = clamp((t - s.t) / s.dur); if (t >= s.t) spin += s.turns * EZ.io(u); if (t >= s.t && t < s.t + s.dur) act = Math.max(act, Math.sin(u * Math.PI) ** 0.5); }
  const ch = { glow, fill, open, heat, spin, explode: expl, act, t };
  const pa = pathAt(ent, t);
  // transients
  let ox = 0, oy = 0, rz = 0, sx = 1, sy = 1;
  const ph = o.seed;
  sy *= 1 + 0.008 * Math.sin(t * 1.8 + ph);
  for (const e of o.tr) {
    const u = (t - e.t) / e.dur; if (u < 0 || u > 1) continue;
    if (e.k === 'pulse') { const k = Math.sin(u * Math.PI); sy *= 1 + e.amp * k; sx *= 1 - e.amp * 0.45 * k; }
    else { const k = (1 - u) * Math.sin(u * 46); ox += e.amp * k; rz += 0.05 * k; oy += Math.abs(e.amp * 0.5 * k); }
  }
  const sc = vis * grow;
  // offsets
  if (!o.rootOff) { o.rootOff = { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1], op: 1 }; o.centre = [0, 0.5, 0]; o.top_ = o.top; }
  for (const r of o.order) { r.off.p[0] = r.off.p[1] = r.off.p[2] = 0; r.off.r[0] = r.off.r[1] = r.off.r[2] = 0; r.off.s[0] = r.off.s[1] = r.off.s[2] = 1; }
  const R = o.rootOff; R.p[0] = R.p[1] = R.p[2] = 0; R.r[0] = R.r[1] = R.r[2] = 0; R.s[0] = R.s[1] = R.s[2] = 1; o.lookCam = false;
  runMotion(o, t, ent.motion || [], null);
  for (const r of o.order) if (r.p.motion && r.p.motion.length) runMotion(o, t, r.p.motion.map((m) => (typeof m === 'string' ? { type: m } : m)), r.p.id);
  if (expl > 0.001) explodeFx(o, expl, 0.9);
  if (o.hook) o.hook(o, t, pa);
  if (!o.hasSpinPart && spin) R.r[1] += spin * 360;
  // object keys (whole object)
  if (ent.keys && ent.keys.length) { const k = keyAt(ent.keys, t); R.p[0] += k.p[0]; R.p[1] += k.p[1]; R.p[2] += k.p[2]; R.r[0] += k.r[0]; R.r[1] += k.r[1]; R.r[2] += k.r[2]; R.s[0] *= k.s[0]; R.s[1] *= k.s[1]; R.s[2] *= k.s[2]; }
  const off = worldOffset(o.wi);
  o.root.visible = sc > 0.01;
  o.root.position.set(off[0] + pa.x + ox + R.p[0], ent.at[1] + pa.hop + oy + R.p[1], pa.z + R.p[2]);
  let yaw = o.yawNow != null ? o.yawNow : ent.rot;
  if (o.lookCam) yaw = Math.atan2(cam.position.x - o.root.position.x, cam.position.z - o.root.position.z);
  o.root.rotation.set(R.r[0] * D2R, yaw + R.r[1] * D2R, rz + R.r[2] * D2R);
  const k = ent.scale * sc;
  o.body.scale.set(k * sx * R.s[0], k * sy * R.s[1], k * sx * R.s[2]);
  const gf = glow / 0.7;
  for (const r of o.order) applyPart(o, r, t, ch, gf);
  if (o.blob) { o.blob.position.y = 0.012 - pa.hop - oy - R.p[1]; o.blob.rotation.z = 0; o.blob.visible = o.root.visible && o.root.position.y < 1; }
  if (o.smoke) {
    const on = heat > 0.22;
    o.smoke.forEach((m, kk) => { m.visible = on; if (!on) return; const ph2 = (t * 0.55 + kk / 5) % 1; m.position.set(Math.sin(kk * 2.3 + t * 0.7) * 0.18, o.top * sc + ph2 * 1.3, Math.cos(kk * 1.7) * 0.15); const s = 0.1 + 0.26 * ph2; m.scale.set(s, s, s); m.material.opacity = (1 - ph2) * 0.5 * clamp(heat * 1.3); });
  }
  for (const bm of o.burstMeshes) {
    const u = (t - bm.bu.t) / 1.15, on = u >= 0 && u < 1; bm.grp.visible = on && sc > 0.01; if (bm.grp.parent !== o.root.parent && o.root.parent) o.root.parent.add(bm.grp); if (!on) continue;
    const tau = u * 1.15; bm.grp.position.set(o.root.position.x, o.root.position.y + o.top * 0.7 * sc, o.root.position.z);
    bm.parts.forEach((m, kk) => { const a = hs(kk * 3.1 + bm.bu.t * 7) * TAU, e = 0.3 + hs(kk * 5.3) * 0.9, spd = 1.4 + hs(kk * 1.7) * 2.2; m.position.set(Math.cos(a) * spd * tau * e * 1.4, 1.1 * spd * tau * e + 0.5 * -4.5 * tau * tau, Math.sin(a) * spd * tau * e * 1.2); const s = (0.07 + hs(kk * 9.1) * 0.08) * Math.pow(1 - u, 0.6); m.scale.set(s, s, s); });
  }
  o.ch = ch;
}
/* world-space anchor above an object (label leader lines): the top centre of its current pose */
function objectAnchor(o, out) { out.set(o.root.position.x, o.root.position.y + o.top * (o.body.scale.y / Math.max(0.001, o.ent.scale)) * 0.92, o.root.position.z); return out; }
