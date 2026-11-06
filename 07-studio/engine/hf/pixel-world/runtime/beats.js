/* beats.js: turns the resolved beat list into pure functions of time: prop state, cast tracks, camera, overlays. */
'use strict';
const PROP_ACT_DUR = { pulse: 0.4, chop: 0.45, stamp: 0.55, burst: 1.0, coins: 1.5 };
const COLN = { red: M.red, yellow: M.yellow, green: M.green, teal: M.teal, blue: M.blue, purple: M.purple, orange: M.orange, pink: M.pink, white: M.white, gold: M.gold };
const rampOf = (name, dflt) => COLN[name] || dflt || M.yellow;
const domCol = (c) => { const v = col(c); return typeof v === 'string' ? v : PALHEX[PALORDER[PALORDER.length - 1]]; };

function propBox(w, id) { const p = w.def.props[id]; return p ? { x: p.x, y: p.y, w: p.w, h: p.h, cx: p.x + p.w / 2, cy: p.y + p.h / 2 } : { x: w.W / 2, y: 200, w: 20, h: 20, cx: w.W / 2 + 10, cy: 210 }; }
function anchorX(w, at, size) {
  if (typeof at === 'number') return at;
  if (at === 'left') return Math.min(70, w.W * 0.25);
  if (at === 'right') return w.W - Math.min(70, w.W * 0.25);
  if (at === 'center' || !at) return w.W / 2;
  if (w.def.props[at]) { const b = propBox(w, at), side = w.W - (b.x + b.w) > b.x ? 1 : -1; return clamp(side > 0 ? b.x + b.w + 22 * sizeU(size) : b.x - 22 * sizeU(size), 20, w.W - 20); }
  return w.W / 2;
}

/* ---- hero placement solver: the hero stands in a free column beside the props that beats target, never on top of them ---- */
const HERO_HALF = 14; // half width of a standing figure per size unit u (torso, arms and hair), logical px
const ovl = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
/* props a world's beats point at: id -> number of beats (any beat kind with a `target` that is one of the world's props) */
function targetWeights(w) {
  const wt = {};
  for (const b of w.beats) if (!b.auto && b.target && w.def.props[b.target]) wt[b.target] = Math.min(3, (wt[b.target] || 0) + 1);
  return wt;
}
function heroCost(w, x, half, wt) {
  let c = 0;
  for (const id in wt) { const p = w.def.props[id]; c += wt[id] * ovl(x - half, x + half, p.x, p.x + p.w); }
  return c;
}
/* nearest x to x0 (step 2 px) with the lowest weighted overlap; keeps x0 when it is already free */
function heroSpot(w, x0, half, wt) {
  const c0 = heroCost(w, x0, half, wt); if (c0 === 0) return { x: x0, cost: 0 };
  const lo = Math.min(half + 2, w.W / 2), hi = Math.max(w.W - half - 2, w.W / 2);
  let best = x0, bc = c0, bd = 0;
  for (let x = lo; x <= hi; x += 2) { const c = heroCost(w, x, half, wt), d = Math.abs(x - x0); if (c < bc || (c === bc && d < bd)) { best = x; bc = c; bd = d; } }
  return { x: best, cost: bc };
}
/* hero x at time t from the walk segments already queued (destination of the last segment that started before t) */
const heroXAt = (c, t) => { let x = c.x0; for (const s of c.segs) if (s.t0 <= t) x = s.x1; return x; };
/* before a beat that targets a prop, move the hero aside when it stands on that prop (a walk that ends just before the beat) */
function yieldHero(w, c, b, wt) {
  const p = w.def.props[b.target], half = HERO_HALF * c.u, x = heroXAt(c, b.t);
  if (ovl(x - half, x + half, p.x, p.x + p.w) <= 0) return;
  const w2 = {}; for (const id in wt) w2[id] = 1; w2[b.target] = 1000;
  const spot = heroSpot(w, x, half, w2);
  if (Math.abs(spot.x - x) < 4) return;
  const last = c.segs.length ? c.segs[c.segs.length - 1] : null, dur = Math.max(0.45, Math.abs(spot.x - x) / (70 * Math.sqrt(c.u)));
  const t0 = Math.max(b.t - dur - 0.1, last ? last.t1 : w.t0);
  c.segs.push({ t0, t1: t0 + dur, x0: x, x1: spot.x });
}

function prepWorld(w) {
  w.def = SC[w.sc] || SC[Object.keys(SC)[0]];
  if (w.def.build) w.def = w.def.build(w.pl || [], w.th);
  w.W = w.def.w || 270; w.gy = w.def.gy || GYD;
  w.pe = {}; w.camKeys = [[w.t0, 0]]; w.zoom = []; w.punch = []; w.hits = []; w.labels = []; w.emotes = []; w.mults = []; w.bursts = []; w.shakes = []; w.stamps = []; w.flashes = []; w.mech = { trav: [], tf: [], spawns: [], vanish: [], counts: [], cmp: [], carry: [], rej: [] };
  const heroId = SPEC.hero;
  const castIn = w.cast && w.cast.length ? w.cast : [{ who: 'hero', at: 'center' }];
  const defSize = (c) => c.size || 'M'; // M for everyone unless the payload asks for another size (a lone hero used to default to L, 28 % of the frame)
  const wt = targetWeights(w);
  w.cast = castIn.map((c, i) => {
    const who = c.who === 'hero' ? heroId : c.who;
    let size = defSize(c), x0 = anchorX(w, c.at, size);
    if (c.who === 'hero' && Object.keys(wt).length) {
      // the hero keeps its requested spot when free; otherwise it moves to the nearest free column, and keeps its size (props move, the hero never shrinks)
      let spot = heroSpot(w, x0, HERO_HALF * sizeU(size), wt);
      x0 = spot.x;
    }
    return { id: c.who, who, size, u: sizeU(size), dir: c.dir || 1, x0, segs: [], acts: [], isHero: c.who === 'hero' || !!HEROES[who], talk: c.talk !== false && (c.who === 'hero' || !!HEROES[who]), bs: i * 0.77 };
  });
  const heroC = w.cast.find((c) => c.id === 'hero');
  const castOf = (id) => w.cast.find((c) => c.id === id) || w.cast.find((c) => c.who === id) || w.cast[0];
  // a fill is a visible change: give it a pop (derived pulse) unless the author already pulsed that prop within 0.3 s
  const derived = [];
  for (const b of w.beats) if (b.do === 'fill' && b.target && !w.beats.some((o) => o.do === 'pulse' && o.target === b.target && Math.abs(o.t - b.t) <= 0.3)) derived.push({ t: b.t, do: 'pulse', target: b.target, derived: true });
  const sorted = w.beats.concat(derived).sort((a, b) => a.t - b.t);
  let camX = 0;
  for (const b of sorted) {
    if (heroC && b.target && w.def.props[b.target] && !b.derived && !b.auto && b.do !== 'walk' && b.do !== 'carry') yieldHero(w, heroC, b, wt);
    if (b.do === 'fill' || b.do === 'open' || b.do === 'close' || b.do === 'light' || b.do === 'dim' || b.do === 'burst' || b.do === 'recolor' || b.do === 'coins' || b.do === 'chop' || b.do === 'stamp' || b.do === 'pulse') {
      const id = b.target; (w.pe[id] = w.pe[id] || []).push(b);
    } else if (b.do === 'label') w.labels.push(b);
    else if (b.do === 'emote') w.emotes.push(b);
    else if (b.do === 'x2') w.mults.push(b);
    else if (b.do === 'radial-burst') w.bursts.push(b);
    else if (b.do === 'shake') w.shakes.push([b.t, b.amp || 3]);
    else if (b.do === 'hero-stamp') w.stamps.push(b);
    else if (b.do === 'flash') w.flashes.push(b.t);
    else if (b.do === 'pan') {
      const bx = propBox(w, b.target), tx = clamp(bx.cx - W / 2, 0, Math.max(0, w.W - W)), d = b.dur || 0.9;
      w.camKeys.push([b.t, camX], [b.t + d, tx]); camX = tx;
    } else if (b.do === 'push') {
      const bx = propBox(w, b.target), z = b.amount || 1.25, hold = b.hold == null ? 1.1 : b.hold;
      w.zoom.push({ t: b.t, z, hold, ox: bx.cx, oy: bx.cy });
    } else if (b.do === 'walk') {
      const c = castOf(b.who), last = c.segs.length ? c.segs[c.segs.length - 1] : null, from = last ? last.x1 : c.x0;
      const to = clamp(anchorX(w, b.to, c.size), 16, w.W - 16), dur = Math.max(0.45, Math.abs(to - from) / (70 * Math.sqrt(c.u)));
      c.segs.push({ t0: b.t, t1: b.t + dur, x0: from, x1: to });
    } else if (MECH_DO.indexOf(b.do) >= 0) prepMech(w, b, castOf, heroC);
    else if (b.do === 'point' || b.do === 'react' || b.do === 'jump' || b.do === 'cheer') {
      const c = castOf(b.who); c.acts.push({ t0: b.t, t1: b.t + (b.do === 'jump' ? 0.5 : b.do === 'cheer' ? 1.3 : 1.5), kind: b.do, target: b.target, symbol: b.symbol });
      if (b.do === 'react') w.emotes.push({ t: b.t, who: b.who, symbol: b.symbol || '!' });
    }
  }
  // impact beats punch the camera in (a quarter-step zoom for ~0.4 s, at most one per 1.8 s, never over a written push) and squash the hero
  let lastPunch = -9;
  for (const b of sorted) {
    if (b.do === 'shake' || b.do === 'hero-stamp' || b.do === 'radial-burst' || b.do === 'burst') { if (!w.hits.length || b.t - w.hits[w.hits.length - 1] >= 0.15) w.hits.push(b.t); }
    if ((b.do === 'hero-stamp' || b.do === 'radial-burst' || b.do === 'burst') && b.t - lastPunch >= 2.4 && !w.zoom.some((k) => b.t >= k.t - 0.3 && b.t < k.t + 1.1 + k.hold)) {
      const bx = b.target && w.def.props[b.target] ? propBox(w, b.target) : { cx: W / 2, cy: 230 };
      w.punch.push({ t: b.t, z: 1.25, hold: 0.12, ox: bx.cx, oy: bx.cy }); lastPunch = b.t;
    }
  }
  for (const id in w.pe) w.pe[id].sort((a, b) => a.t - b.t);
  // a zoom never crops the hero at the frame edge: slide its origin so the hero's whole body stays inside the zoomed window
  if (heroC && w.W <= W) for (const k of w.zoom.concat(w.punch)) k.ox = keepInView(k.ox, k.z, heroXAt(heroC, k.t), HERO_HALF * heroC.u + 6);
  w.camKeys.sort((a, b) => a[0] - b[0]);
  w.camKeys = w.camKeys.reduce((acc, k) => { if (acc.length && k[0] < acc[acc.length - 1][0]) k = [acc[acc.length - 1][0], k[1]]; acc.push(k); return acc; }, []);
}

/* origin x so that [hx - half, hx + half] stays inside the window of a zoom z (window = [ox (1 - 1/z), ox (1 - 1/z) + W / z]) */
function keepInView(ox, z, hx, half) {
  if (z <= 1.001 || hx - half < -2 || hx + half > W + 2) return ox;
  const k = 1 - 1 / z, lo = ox * k, win = W / z, want = clamp(lo, hx + half - win, hx - half);
  return want === lo ? ox : clamp(want / k, 0, W);
}
function camAt(w, t) { return kf(t, w.camKeys, EA.io); }
function zoomAt(w, t) {
  let z = 1, ox = W / 2, oy = 280;
  for (const k of w.zoom) {
    const a = pr(t, k.t, 0.5), b = pr(t, k.t + 0.5 + k.hold, 0.6);
    const v = 1 + (k.z - 1) * EA.io(a) * (1 - EA.io(b));
    if (v > z) { z = v; ox = k.ox; oy = k.oy; }
  }
  for (const k of w.punch) {
    const a = pr(t, k.t, 0.06), b = pr(t, k.t + 0.06 + k.hold, 0.22), v = 1 + (k.z - 1) * EA.out(a) * (1 - EA.io(b));
    if (v > z) { z = v; ox = k.ox; oy = k.oy; }
  }
  return { z, ox, oy };
}
/* prop state: pure function of t from the world's events */
function propState(w, id, t) {
  const ev = w.pe[id] || [], S = { fill: 0, open: 0, lit: 0, tone: 0, ev: {} };
  if (!ev.length) { S.ev = { pulse: -1, chop: -1, stamp: -1, burst: -1, coins: -1 }; return S; }
  const fk = [[-1, 0]], ok = [[-1, 0]], lk = [[-1, 0]];
  let toneN = 0, lastEv = {};
  for (const b of ev) {
    if (b.do === 'fill') { fk.push([b.t - 0.001, fk[fk.length - 1][1]], [b.t + 0.5, clamp(b.value == null ? 1 : b.value)]); }
    else if (b.do === 'open' || b.do === 'close') { const v = b.do === 'open' ? 1 : 0; ok.push([b.t - 0.001, ok[ok.length - 1][1]], [b.t + 0.4, v]); }
    else if (b.do === 'light' || b.do === 'dim') { const v = b.do === 'light' ? 1 : 0; lk.push([b.t - 0.001, lk[lk.length - 1][1]], [b.t + 0.12, v]); }
    else if (b.do === 'recolor') { if (t >= b.t) toneN = b.color != null ? b.color + 1 : toneN + 1; if (t >= b.t) lastEv.recolor = b.t; }
    else if (PROP_ACT_DUR[b.do] && b.t <= t) lastEv[b.do] = b.t;
  }
  S.fill = kf(t, fk, EA.out); S.open = kf(t, ok, EA.out); S.lit = kf(t, lk, EA.lin); S.tone = toneN;
  S.ev = {};
  for (const k in PROP_ACT_DUR) { const t0 = lastEv[k]; S.ev[k] = t0 != null && t - t0 < PROP_ACT_DUR[k] ? (t - t0) / PROP_ACT_DUR[k] : -1; }
  S.recolorT = lastEv.recolor;
  return S;
}
function drawProp(g, t, w, id, c) {
  const p = w.def.props[id], S = propState(w, id, t);
  TONE = S.tone;
  g.save();
  const pulse = S.ev.pulse >= 0 ? Math.round(Math.sin(S.ev.pulse * Math.PI) * 4) : 0;
  const kick = S.ev.chop >= 0 ? Math.round(Math.sin(S.ev.chop * 34) * 2 * (1 - S.ev.chop)) : 0; // the prop jolts under a chop
  g.translate(kick, -pulse);
  if (S.ev.burst >= 0) {
    const k = Math.round(Math.sin(S.ev.burst * Math.PI) * 14), cx = p.x + p.w / 2;
    for (const s of [-1, 1]) { g.save(); g.beginPath(); if (s < 0) g.rect(p.x - 60, -40, cx - p.x + 60, H + 80); else g.rect(cx, -40, p.w + 60, H + 80); g.clip(); g.translate(s * k, -Math.round(k * 0.3)); p.draw(g, t, S, c); g.restore(); }
  } else p.draw(g, t, S, c);
  g.restore();
  TONE = 0;
  return S;
}
/* generic effects on top of any prop (UI layer): glow, fill bar, slash, stamp, coins, burst, recolor flash */
function propOverlay(g, t, w, id) {
  const p = w.def.props[id], S = propState(w, id, t), b = propBox(w, id);
  if (S.lit > 0.02) { glow(g, b.cx, b.cy, Math.max(b.w, b.h) * 0.45, M.yellow[3], 0.22 * S.lit * (0.7 + 0.3 * flicker(t, id.length))); if (S.lit > 0.9) sparkle(g, b.x + 3, b.y + 3, t, Math.floor(t * 3) / 3, '#ffffff'); }
  if (S.fill > 0.01 && !p.fills) progressBar(g, b.x + 2, b.y - 12, b.w - 4, S.fill, M.green, 6);
  for (const e of w.pe[id] || []) if (e.do === 'fill' && t >= e.t && t < e.t + 1) gain(g, t, e.t, b.cx, b.y + 6, 5, Math.floor(e.t * 10) % 40, M.teal); // tokens fly into a filling prop
  if (S.ev.chop >= 0) chips(g, t, t - S.ev.chop * PROP_ACT_DUR.chop, b.cx, b.cy, 8, id.length * 3, [M.steel[3], '#ffffff', M.orange[3]], 80, 300, 0.7);
  if (S.ev.chop >= 0 && !p.chops) { const e = S.ev.chop, x = b.x + b.w * e; line(g, b.x - 4 + b.w * e * 0.6, b.y - 6, x + 6, b.y + b.h + 6, 2, '#ffffff'); }
  if (S.ev.stamp >= 0 && !p.stamps) { const e = S.ev.stamp, dy = e < 0.4 ? lerp(-30, 0, EA.in(e / 0.4)) : 0; R(g, b.cx - 9, b.cy - 18 + dy, 18, 12, M.steel[2]); R(g, b.cx - 3, b.cy - 26 + dy, 6, 8, M.wood[2]); if (e >= 0.4) { R(g, b.cx - 10, b.cy - 6, 20, 12, M.red[2]); R(g, b.cx - 8, b.cy - 4, 16, 8, M.red[3]); } }
  if (S.ev.coins >= 0) {
    const e = S.ev.coins * PROP_ACT_DUR.coins, gy = w.gy - 4;
    for (let i = 0; i < 7; i++) { const c = toss(e, i * 0.1, b.cx, b.y + 4, (hs(i + 3) - 0.5) * 96, -(70 + hs(i * 5 + 1) * 60), gy, 1.4); if (!c) continue; disc(g, c[0], c[1], 3, M.gold[3]); R(g, c[0] - 1, c[1] - 1, 1, 2, M.gold[4]); if (Math.floor(e * 14 + i) % 4 === 0) R(g, c[0] + 2, c[1] - 2, 1, 1, '#ffffff'); }
  }
  if (S.ev.burst >= 0) burst(g, b.cx, b.cy, t - S.ev.burst * PROP_ACT_DUR.burst, t, 18, [M.yellow[3], '#ffffff', M.orange[2], M.red[2]], 11, 80, 150, 0.9, 3);
  if (S.recolorT != null && t - S.recolorT < 0.4) sparkle(g, b.cx, b.y + 2, t, S.recolorT, '#ffffff');
  return S;
}

/* ---------------- mechanism beats: travel, transform, spawn/stack/vanish, count, compare, carry, reject ---------------- */
const MECH_DO = ['travel', 'transform', 'spawn', 'stack', 'vanish', 'count', 'compare', 'carry', 'reject'];
const TRAVEL_DUR = 0.9, ANCHORS_ = ['left', 'center', 'right'];
const isProp = (w, id) => typeof id === 'string' && !!w.def.props[id];
/* a point of the world for a reference: prop id (top centre), left|center|right|number (on the floor) or a cast member (hands) */
function mechPt(w, ref, t, dest) {
  if (typeof ref === 'number' || ANCHORS_.indexOf(ref) >= 0) return [anchorX(w, ref, 'M'), w.gy - 22];
  if (isProp(w, ref)) { const b = propBox(w, ref); return [b.cx, dest ? b.y - 12 : b.y - 6]; }
  const c = w.cast.find((k) => k.id === ref || k.who === ref) || w.cast[0], s = castState(w, c, t);
  return [s.x + s.dir * 7 * c.u, s.y - 30 * c.u];
}
const mechCol = (k) => k;
function prepMech(w, b, castOf, heroC) {
  const M_ = w.mech, item = b.item || 'box';
  if (b.do === 'travel') {
    const d = b.dur || TRAVEL_DUR, from = b.target || b.who || 'hero', land = b.land || 'burst';
    const m = { t: b.t, d, from, to: b.to, item, path: b.path || 'arc', ease: b.ease || 'inout', trail: !!b.trail, spin: !!b.spin, land, text: b.text, state: b.state || 'closed', k: Math.floor(b.t * 3) };
    M_.trav.push(m);
    const tl = b.t + d;
    if (isProp(w, b.to) && land !== 'none') { (w.pe[b.to] = w.pe[b.to] || []).push({ t: tl, do: 'light', target: b.to, derived: true }, { t: tl + 0.001, do: 'pulse', target: b.to, derived: true }); }
    if (land === 'slam') { w.shakes.push([tl, 3]); w.hits.push(tl); }
    if (land === 'tick') w.mults.push({ t: tl, do: 'x2', text: '+1', target: isProp(w, b.to) ? b.to : undefined, dur: 0.9 });
  } else if (b.do === 'transform') M_.tf.push({ t: b.t, target: b.target, state: b.state, item: b.item, text: b.text });
  else if (b.do === 'spawn' || b.do === 'stack') {
    const base = M_.spawns.filter((s) => s.target === b.target).reduce((a, s) => a + s.count, 0);
    M_.spawns.push({ t: b.t, target: b.target, count: b.count || 1, item: b.item || 'tile', layout: b.layout || (b.do === 'stack' ? 'pile' : 'row'), base, text: b.text });
  } else if (b.do === 'vanish') M_.vanish.push({ t: b.t, target: b.target });
  else if (b.do === 'count') M_.counts.push({ t: b.t, target: b.target, value: b.value, label: b.label || b.text });
  else if (b.do === 'compare') M_.cmp.push({ t: b.t, a: b.target, b: b.to, mark: b.symbol === 'cross' ? 'cross' : 'check', dur: b.dur || 3 });
  else if (b.do === 'reject') M_.rej.push({ t: b.t, target: b.target, who: b.who || 'hero', item, k: Math.floor(b.t * 3) });
  else if (b.do === 'carry') {
    const c = castOf(b.who), last = c.segs.length ? c.segs[c.segs.length - 1] : null, from = last ? last.x1 : c.x0;
    const px = clamp(anchorX(w, b.target, c.size), 16, w.W - 16), qx = clamp(anchorX(w, b.to, c.size), 16, w.W - 16), sp = 70 * Math.sqrt(c.u);
    const d1 = Math.max(0.45, Math.abs(px - from) / sp), d2 = Math.max(0.5, Math.abs(qx - px) / sp), tp = b.t + d1, td = tp + 0.3 + d2;
    c.segs.push({ t0: b.t, t1: tp, x0: from, x1: px }, { t0: tp + 0.3, t1: td, x0: px, x1: qx });
    M_.carry.push({ t: b.t, tp, td, who: c.id, from: b.target, to: b.to, item: b.item || 'box', state: b.state || 'closed', k: Math.floor(b.t * 3) });
    if (isProp(w, b.to)) (w.pe[b.to] = w.pe[b.to] || []).push({ t: td, do: 'light', target: b.to, derived: true }, { t: td + 0.001, do: 'pulse', target: b.to, derived: true });
  }
}
function slotAt(w, s, i) {
  const b = propBox(w, s.target), n = s.base + i;
  const x = s.layout === 'pile' ? b.x + 8 + Math.floor(n / 4) * 20 : b.x + 8 + (n % 6) * 20, y = s.layout === 'pile' ? b.y - 12 - (n % 4) * 16 : b.y - 12 - Math.floor(n / 6) * 18;
  return [clamp(x, 10, w.W - 10), Math.max(ZONES.caption.y1 + 10, y)];
}
function tagAt(g, text, x, y, p) { if (text) chip(g, text, clamp(x, txtW(text, 8) / 2 + 12, W - txtW(text, 8) / 2 - 12), Math.max(ZONES.caption.y1 + 4, y), M.yellow, p, 8); }
/* the object resting on a prop through its transforms: { state, text, t0 } or null (hidden once a travel or carry took it away, or after a vanish) */
function restOf(w, id, t) {
  let cur = null;
  for (const f of w.mech.tf) if (f.target === id && f.t <= t) { if (f.item) cur = { item: f.item, state: f.state || (cur && cur.state) || 'closed', text: f.text !== undefined ? f.text : cur && cur.text, t0: f.t, first: !cur ? f.t : cur.first }; else if (cur) cur = { item: cur.item, state: f.state || cur.state, text: f.text !== undefined ? f.text : cur.text, t0: f.t, first: cur.first }; }
  if (!cur) return null;
  for (const m of w.mech.trav) if (m.from === id && m.t >= cur.t0 - 0.001 && m.t <= t) return null;
  for (const c of w.mech.carry) if (c.from === id && c.t >= cur.t0 - 0.001 && t >= c.tp) return null;
  for (const v of w.mech.vanish) if (v.target === id && v.t >= cur.t0 && t >= v.t) return null;
  return cur;
}
function drawTravel(g, t, w, m) {
  if (t < m.t - 0.001) return;
  const t1 = m.t + m.d, A = mechPt(w, m.from, m.t, false), B = mechPt(w, m.to, t1, true), dt = t - t1;
  const h = m.path === 'line' ? 0 : arcHeight(A[0], B[0]);
  const at = (tt) => { const e = EASE_OF[m.ease](pr(tt, m.t, m.d)); return pathAt(m.path, e, A[0], A[1], B[0], B[1], h); };
  if (t < t1) {
    const pop = EA.back(pr(t, m.t, 0.14));
    if (m.trail) for (let i = 1; i <= 6; i++) { const q = at(Math.max(m.t, t - i * 0.045)); g.save(); g.globalAlpha = 0.75 - i * 0.11; R(g, q[0] - 1, q[1] - 1, i < 3 ? 3 : 2, i < 3 ? 3 : 2, i % 2 ? '#ffffff' : M.yellow[3]); g.restore(); }
    const p = at(t), sx = m.spin ? Math.abs(Math.cos(t * 16)) * 0.8 + 0.2 : 1;
    itemSprite(g, m.item, p[0], p[1], { sc: pop, sx, state: m.state, k: m.k });
    tagAt(g, m.text, p[0], p[1] - 28, 1);
    return;
  }
  const L = m.land;
  if (L === 'burst') { burst(g, B[0], B[1], t1, t, 16, [M.yellow[3], '#ffffff', M.orange[2], M.teal[3]], Math.floor(m.t * 10) % 40, 80, 120, 0.7, 3); if (dt < 0.35) itemSprite(g, m.item, B[0], B[1], { sc: 1 - dt / 0.35, state: m.state, k: m.k }); }
  else if (L === 'bounce') { if (dt < 0.9) { const y = B[1] - Math.abs(Math.sin(dt * 9)) * 10 * Math.exp(-dt * 3.2); itemSprite(g, m.item, B[0], y, { sc: dt > 0.7 ? 1 - (dt - 0.7) / 0.2 : 1, state: m.state, k: m.k }); tagAt(g, m.text, B[0], y - 22, dt > 0.7 ? 0.5 : 1); if (dt >= 0.7) puffAt(g, t, t1 + 0.7, B[0], B[1], 3); } }
  else if (L === 'slam') { if (dt < 0.6) { const sq = dt < 0.12 ? 0.6 : 1; itemSprite(g, m.item, B[0], B[1] + (dt < 0.12 ? 3 : 0), { sc: dt > 0.45 ? 1 - (dt - 0.45) / 0.15 : sq, state: m.state, k: m.k }); } burst(g, B[0], B[1] + 6, t1, t, 8, [M.stone[3], '#ffffff'], 7, 55, 60, 0.45, 2); }
  else if (L === 'tick') { if (dt < 0.4) itemSprite(g, m.item, B[0], B[1], { sc: 1 - dt / 0.4, state: m.state, k: m.k }); sparkle(g, B[0], B[1] - 4, t, t1, '#ffffff'); }
  else if (dt < 0.4) puffAt(g, t, t1, B[0], B[1], 5);
}
function drawReject(g, t, w, r) {
  if (t < r.t) return;
  const A = mechPt(w, r.who, r.t, false), B = mechPt(w, r.target, r.t + 0.35, true), th = r.t + 0.35, bx = propBox(w, r.target);
  let p;
  if (t < th) p = pathAt('line', EA.out(pr(t, r.t, 0.35)), A[0], A[1], B[0], B[1], 0);
  else p = pathAt('arc', EA.out(pr(t, th, 0.45)), B[0], B[1], A[0], A[1], 18);
  if (t < th + 0.5) itemSprite(g, r.item, p[0], p[1], { sc: 1, sx: t < th ? 1 : Math.abs(Math.cos((t - th) * 18)) * 0.6 + 0.4, k: r.k });
  if (t >= th && t < th + 1.8) {
    const dt = t - th, jx = dt < 0.4 ? Math.round(Math.sin(dt * 90) * 3 * (1 - dt / 0.4)) : 0;
    markSprite(g, bx.cx + jx, Math.max(ZONES.caption.y1 + 12, bx.y - 14), false, dt / 0.2);
    if (dt < 0.12) sparkle(g, B[0], B[1], t, th, '#ffffff');
  }
}
function mechUI(g, t, w) {
  const Mx = w.mech;
  for (const id in w.def.props) {
    const r = restOf(w, id, t); if (!r) continue;
    const b = propBox(w, id), pop = pr(t, r.t0, 0.28), sc = r.t0 === r.first ? EA.back(pop) : 1 + 0.25 * Math.sin(pop * Math.PI);
    const y = b.y - 12 - (1 - EA.out(pr(t, r.first, 0.3))) * 12;
    itemSprite(g, r.item, b.cx, y, { sc, state: r.state, k: 0 });
    tagAt(g, r.text, b.cx, y - 28, EA.out(pr(t, r.t0, 0.2)));
  }
  /* badges of transforms without an object (flag, full, empty, state icon) */
  const lastTf = {};
  for (const f of Mx.tf) if (!f.item && f.t <= t) lastTf[f.target] = f;
  for (const id in lastTf) {
    const f = lastTf[id], b = propBox(w, id), e = pr(t, f.t, 0.3), st = f.state;
    if (!st) { tagAt(g, f.text, b.cx, b.y - 24, EA.out(e)); continue; }
    const bx = b.x + b.w - 3, by = b.y - 4;
    if (st === 'flag-up' || st === 'flag-down') { const up = st === 'flag-up' ? EA.back(e) : 1 - EA.out(e), len = 6 + Math.round(up * 12); R(g, bx, by - len - 2, 2, len + 4, INK); R(g, bx, by - len - 1, 1, len + 2, M.steel[3]); if (st === 'flag-up' || e < 1) R(g, bx + 2, by - len - 2, 9, 6, INK); R(g, bx + 2, by - len - 1, 8, 4, M.red[2]); }
    else if (st === 'full') markSprite(g, bx - 2, by - 8, true, e);
    else if (st === 'empty') { for (let x = b.x - 2; x < b.x + b.w + 2; x += 4) { R(g, x, b.y - 2, 2, 1, '#ffffff'); R(g, x, b.y + b.h + 1, 2, 1, '#ffffff'); } for (let y = b.y - 2; y < b.y + b.h + 2; y += 4) { R(g, b.x - 2, y, 1, 2, '#ffffff'); R(g, b.x + b.w + 1, y, 1, 2, '#ffffff'); } }
    else itemSprite(g, 'box', bx - 2, by - 8, { sc: 0.8 * EA.back(e), state: st });
    tagAt(g, f.text, b.cx, b.y - 24, EA.out(e));
  }
  for (const s of Mx.spawns) {
    const v = Mx.vanish.find((q) => q.target === s.target && q.t > s.t);
    for (let i = 0; i < s.count; i++) {
      const ti = s.t + i * 0.16, p = slotAt(w, s, i);
      if (t < ti) continue;
      if (v && t >= v.t) { puffAt(g, t, v.t + i * 0.03, p[0], p[1], i + 2); continue; }
      const pop = EA.back(pr(t, ti, 0.22)), dy = dropIn(t, ti, 16, 0.32), sq = t - ti < 0.1 ? 1.2 : 1;
      itemSprite(g, s.item, p[0], p[1] + dy * 0.6, { sc: pop, sx: sq, k: s.base + i });
      if (t - ti < 0.2) sparkle(g, p[0] + 6, p[1] - 6, t, ti, '#ffffff');
    }
    if (s.text && t >= s.t) { const p = slotAt(w, s, s.count - 1); if (!(v && t >= v.t)) tagAt(g, s.text, p[0], p[1] - 20, EA.out(pr(t, s.t + s.count * 0.16, 0.2))); }
  }
  const byT = {};
  for (const c of Mx.counts) (byT[c.target || '_'] = byT[c.target || '_'] || []).push(c);
  for (const id in byT) {
    const list = byT[id], keys = [[list[0].t - 0.001, 0]];
    for (const c of list) keys.push([c.t + 0.0005, keys[keys.length - 1][1]], [c.t + 0.35, c.value]);
    if (t < list[0].t) continue;
    let last = list[0]; for (const c of list) if (c.t <= t) last = c;
    const v = Math.round(kf(t, keys, EA.out)), bump = t - last.t < 0.3 ? Math.sin(((t - last.t) / 0.3) * Math.PI) : 0, b = id === '_' ? { cx: w.W / 2, y: 230 } : propBox(w, id);
    const s = (last.label ? last.label + ' ' : '') + v, pp = EA.out(pr(t, list[0].t, 0.2));
    chip(g, s, clamp(b.cx, txtW(s, 8) / 2 + 14, W - txtW(s, 8) / 2 - 14), Math.max(ZONES.caption.y1 + 4, b.y - 38 - Math.round(bump * 4)), M.teal, pp, 8);
  }
  for (const c of Mx.cmp) {
    if (t < c.t || t > c.t + c.dur) continue;
    const a = propBox(w, c.a), b = propBox(w, c.b), out = t > c.t + c.dur - 0.2 ? (c.t + c.dur - t) / 0.2 : 1;
    if (out < 0.5) continue;
    markSprite(g, a.cx, Math.max(ZONES.caption.y1 + 12, a.y - 16), c.mark === 'check', (t - c.t) / 0.25);
    markSprite(g, b.cx, Math.max(ZONES.caption.y1 + 12, b.y - 16), c.mark !== 'check', (t - c.t - 0.18) / 0.25);
  }
  for (const m of Mx.trav) drawTravel(g, t, w, m);
  for (const r of Mx.rej) drawReject(g, t, w, r);
  for (const c of Mx.carry) {
    if (t < c.t || t > c.td + 1.3) continue;
    const cc = w.cast.find((k) => k.id === c.who) || w.cast[0], A = mechPt(w, c.from, c.t, false), B = mechPt(w, c.to, c.td, true);
    if (t < c.tp) itemSprite(g, c.item, A[0], A[1] - 4, { sc: EA.back(pr(t, c.t, 0.2)), state: c.state, k: c.k });
    else if (t < c.td) { const s = castState(w, cc, t), lift = EA.out(pr(t, c.tp, 0.3)); itemSprite(g, c.item, s.x, lerp(A[1] - 4, s.y - 60 * cc.u - 2, lift) + Math.round(Math.sin(t * 14) * (s.mv ? 1 : 0)), { sc: 1, state: c.state, k: c.k }); }
    else { const dt = t - c.td, y = B[1] - Math.abs(Math.sin(dt * 10)) * 7 * Math.exp(-dt * 4); itemSprite(g, c.item, B[0], y, { sc: dt > 1 ? 1 - (dt - 1) / 0.3 : 1, state: c.state, k: c.k }); if (dt < 0.3) sparkle(g, B[0], B[1] - 6, t, c.td, '#ffffff'); }
  }
}

/* cast state */
function castState(w, c, t) {
  let x = c.x0, mv = 0, dir = c.dir;
  for (const s of c.segs) {
    if (t >= s.t1) { x = s.x1; if (s.x1 !== s.x0) dir = s.x1 > s.x0 ? 1 : -1; }
    else if (t >= s.t0) { const e = EA.io(pr(t, s.t0, s.t1 - s.t0)); x = lerp(s.x0, s.x1, e); mv = 1; dir = s.x1 > s.x0 ? 1 : -1; break; }
    else break;
  }
  const o = { x, y: w.gy, dir, t, ph: x / (9 * c.u), mv, talk: 0, mood: 'n', fa: null, ba: null, lit: false, look: 0, lookY: 0, bs: c.bs, u: c.u, jump: 0, sq: 0 };
  let acted = false;
  for (const a of c.acts) {
    if (t < a.t0 || t >= a.t1) continue; acted = true;
    const e = pr(t, a.t0, a.t1 - a.t0);
    if (a.kind === 'point') { const bx = a.target ? propBox(w, a.target) : { cx: x + 40, cy: w.gy - 60 }; o.dir = bx.cx >= x ? 1 : -1; const up = clamp((w.gy - 40 - bx.cy) / 80, -0.6, 1); o.fa = 90 + up * 60; o.ba = -10; o.look = 1; o.mood = 'n'; }
    if (a.kind === 'react') { const sym = a.symbol || '!'; o.mood = sym === '?' || sym === 'dots' ? 't' : sym === '!' ? 's' : 'h'; o.lit = sym === '!' || sym === 'idea'; o.fa = 20; o.ba = -20; }
    if (a.kind === 'jump') { const h = Math.sin(e * Math.PI) * 14 * Math.sqrt(c.u); o.jump = Math.round(h); o.fa = 150; o.ba = -150; o.mood = 'h'; o.sq = e < 0.12 || e > 0.9 ? 2 : 0; }
    if (a.kind === 'cheer') { o.fa = 170; o.ba = -170; o.mood = 'h'; o.lit = true; o.jump = Math.round(Math.abs(Math.sin(e * Math.PI * 2)) * 4); }
  }
  if (c.isHero && !acted) { for (const h of w.hits) { if (h > t) break; const q = hitSquash(t, h); if (q) { o.sq = q.sq; o.jump = q.jump; break; } } } // squash and stretch on every impact
  if (!SINGLE) { const di = dropIn(t, w.t0 <= 0.01 ? 0.05 + c.bs * 0.12 : w.t0 - 0.35 + c.bs * 0.12, 34, 0.55); if (di < -0.5) o.jump = Math.max(o.jump, Math.round(-di)); } // bounce-in when the world appears
  if (c.talk && !mv) o.talk = talkLevel(t);
  else if (c.talk && mv) o.talk = talkLevel(t);
  if (!acted && c.talk && o.talk) o.mood = 'n';
  return o;
}
function castPos(w, c, t) { const s = castState(w, c, t); return { x: s.x, y: w.gy - 58 * c.u - 6 }; }

/* ui layer pieces for a world */
function worldUI(g, t, w) {
  mechUI(g, t, w);
  for (const id in w.def.props) propOverlay(g, t, w, id);
  for (const e of w.emotes) { const c = w.cast.find((k) => k.id === e.who || k.who === e.who) || w.cast[0]; const p = castPos(w, c, t); bubble(g, p.x + 4, p.y, e.symbol || '!', t, e.t, e.dur || 1.3); }
  for (const l of w.labels) {
    const dur = l.dur || 1.8, p = pr(t, l.t, 0.22), out = t > l.t + dur - 0.2 ? clamp((l.t + dur - t) / 0.2) : 1;
    if (t < l.t || t > l.t + dur) continue;
    const b = l.target ? propBox(w, l.target) : { cx: w.W / 2, y: 200 };
    const y = Math.max(ZONES.caption.y1 + 4, b.y - 24);
    chip(g, l.text, clamp(b.cx, txtW(l.text, 8) / 2 + 14, w.W - txtW(l.text, 8) / 2 - 14), y, rampOf(l.color, M.yellow), p * out, 8);
    if (p >= 1 && l.target) arrowDown(g, clamp(b.cx, 12, w.W - 12), y + 18, t, '#ffffff');
  }
  for (const m of w.mults) {
    const dt = t - m.t, life = m.dur || 1.1; if (dt < 0 || dt > life) continue;
    const b = m.target ? propBox(w, m.target) : { cx: w.W / 2, y: 200 }, p = EA.back(clamp(dt / 0.2)), up = EA.out(dt / life) * 18, a = dt > life - 0.25 ? (life - dt) / 0.25 : 1;
    alpha(g, a, () => txt(g, m.text || 'x2', clamp(b.cx, 40, w.W - 40), Math.max(140, b.y - 34) - up - (1 - p) * 0, 8 + Math.round(p * 16 / 8) * 8, rampOf(m.color, M.yellow)[3], 'center', INK));
  }
  for (const r of w.bursts) {
    const b = r.target ? propBox(w, r.target) : { cx: w.W / 2, cy: 230 };
    burst(g, b.cx, b.cy, r.t, t, 22, [M.yellow[3], '#ffffff', M.orange[2], M.teal[3], M.pink[2]], Math.floor(r.t * 10) % 50, 95, 130, 0.9, 3);
    const dt = t - r.t; if (dt >= 0 && dt < 0.25) { const rad = Math.round(EA.out(dt / 0.25) * 34); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; R(g, b.cx + Math.cos(a) * rad, b.cy + Math.sin(a) * rad, 2, 2, '#ffffff'); } }
  }
}
