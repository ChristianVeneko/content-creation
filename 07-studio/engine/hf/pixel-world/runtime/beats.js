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
  for (const b of w.beats) if (b.target && w.def.props[b.target]) wt[b.target] = Math.min(3, (wt[b.target] || 0) + 1);
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
  w.pe = {}; w.camKeys = [[w.t0, 0]]; w.zoom = []; w.labels = []; w.emotes = []; w.mults = []; w.bursts = []; w.shakes = []; w.stamps = []; w.flashes = [];
  const heroId = SPEC.hero;
  const castIn = w.cast && w.cast.length ? w.cast : [{ who: 'hero', at: 'center' }];
  const defSize = (c) => c.size || (castIn.length <= 1 ? 'L' : 'M');
  const wt = targetWeights(w);
  w.cast = castIn.map((c, i) => {
    const who = c.who === 'hero' ? heroId : c.who;
    let size = defSize(c), x0 = anchorX(w, c.at, size);
    if (c.who === 'hero' && Object.keys(wt).length) {
      // the hero keeps its requested spot when free; otherwise it moves to the nearest free column, and a defaulted size may shrink to fit
      let spot = heroSpot(w, x0, HERO_HALF * sizeU(size), wt);
      for (const sz of c.size ? [] : ['M', 'S']) { if (spot.cost === 0) break; const s2 = heroSpot(w, anchorX(w, c.at, sz), HERO_HALF * sizeU(sz), wt); if (s2.cost < spot.cost) { spot = s2; size = sz; } }
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
    if (heroC && b.target && w.def.props[b.target] && !b.derived && b.do !== 'walk') yieldHero(w, heroC, b, wt);
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
    } else if (b.do === 'point' || b.do === 'react' || b.do === 'jump' || b.do === 'cheer') {
      const c = castOf(b.who); c.acts.push({ t0: b.t, t1: b.t + (b.do === 'jump' ? 0.5 : b.do === 'cheer' ? 1.3 : 1.5), kind: b.do, target: b.target, symbol: b.symbol });
      if (b.do === 'react') w.emotes.push({ t: b.t, who: b.who, symbol: b.symbol || '!' });
    }
  }
  w.camKeys.sort((a, b) => a[0] - b[0]);
  w.camKeys = w.camKeys.reduce((acc, k) => { if (acc.length && k[0] < acc[acc.length - 1][0]) k = [acc[acc.length - 1][0], k[1]]; acc.push(k); return acc; }, []);
}

function camAt(w, t) { return kf(t, w.camKeys, EA.io); }
function zoomAt(w, t) {
  let z = 1, ox = W / 2, oy = 280;
  for (const k of w.zoom) {
    const a = pr(t, k.t, 0.5), b = pr(t, k.t + 0.5 + k.hold, 0.6);
    const v = 1 + (k.z - 1) * EA.io(a) * (1 - EA.io(b));
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
  g.translate(0, -pulse);
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
  if (S.lit > 0.02) { glow(g, b.cx, b.cy, Math.max(b.w, b.h) * 0.45, M.yellow[3], 0.22 * S.lit); if (S.lit > 0.9) sparkle(g, b.x + 3, b.y + 3, t, Math.floor(t * 3) / 3, '#ffffff'); }
  if (S.fill > 0.01 && !p.fills) progressBar(g, b.x + 2, b.y - 12, b.w - 4, S.fill, M.green, 6);
  if (S.ev.chop >= 0 && !p.chops) { const e = S.ev.chop, x = b.x + b.w * e; line(g, b.x - 4 + b.w * e * 0.6, b.y - 6, x + 6, b.y + b.h + 6, 2, '#ffffff'); }
  if (S.ev.stamp >= 0 && !p.stamps) { const e = S.ev.stamp, dy = e < 0.4 ? lerp(-30, 0, EA.in(e / 0.4)) : 0; R(g, b.cx - 9, b.cy - 18 + dy, 18, 12, M.steel[2]); R(g, b.cx - 3, b.cy - 26 + dy, 6, 8, M.wood[2]); if (e >= 0.4) { R(g, b.cx - 10, b.cy - 6, 20, 12, M.red[2]); R(g, b.cx - 8, b.cy - 4, 16, 8, M.red[3]); } }
  if (S.ev.coins >= 0) {
    const e = S.ev.coins * PROP_ACT_DUR.coins, gy = w.gy;
    for (let i = 0; i < 7; i++) { const t0 = i * 0.1; if (e < t0) continue; const dt = e - t0, x = b.cx + (hs(i + 3) - 0.5) * 50, y = Math.min(gy - 4 - Math.abs(Math.sin(dt * 6)) * 8 * Math.exp(-dt * 2.2), b.y + 4 + 0.5 * 420 * dt * dt); disc(g, x, y, 3, M.gold[3]); R(g, x - 1, y - 1, 1, 2, M.gold[4]); }
  }
  if (S.ev.burst >= 0) burst(g, b.cx, b.cy, t - S.ev.burst * PROP_ACT_DUR.burst, t, 18, [M.yellow[3], '#ffffff', M.orange[2], M.red[2]], 11, 80, 150, 0.9, 3);
  if (S.recolorT != null && t - S.recolorT < 0.4) sparkle(g, b.cx, b.y + 2, t, S.recolorT, '#ffffff');
  return S;
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
  if (c.talk && !mv) o.talk = talkLevel(t);
  else if (c.talk && mv) o.talk = talkLevel(t);
  if (!acted && c.talk && o.talk) o.mood = 'n';
  return o;
}
function castPos(w, c, t) { const s = castState(w, c, t); return { x: s.x, y: w.gy - 58 * c.u - 6 }; }

/* ui layer pieces for a world */
function worldUI(g, t, w) {
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
