/* main.js: builds the worlds, cast and overlay once (heavy setup registered as window.__hf.buildReady) and renders every frame
   as a pure function of the seek time: props -> cast -> camera -> lights -> post -> DOM. */
'use strict';
const FPS = SPEC.fps, DUR = SPEC.dur, SINGLE = SPEC.mode === 'single';
let RTS = [], CHARS = [], HERO_GLOBAL = null;
const heroIdAt = (wi) => { const w = SPEC.worlds[wi], c = w.cast.find((x) => x.who === 'hero') || w.cast[0]; return c.id; };

async function setup() {
  await Promise.all([document.fonts.load('700 62px Baloo2'), document.fonts.load('800 62px Baloo2')]);
  await loadEnv();
  for (const w of SPEC.worlds) RTS.push(await buildWorld(w));
  if (SINGLE) { // path ribbons between consecutive stations
    for (let i = 0; i + 1 < RTS.length; i++) { const x0 = i * SPEC.spacing + 4.2, x1 = (i + 1) * SPEC.spacing - 4.2, r = RB(x1 - x0 + 0.6, 0.16, 1.5, 0.07, clayMat(CAT.SETTINGS[SPEC.worlds[i].setting].pal.accent)); r.position.set((x0 + x1) / 2, -0.08, 1.4); r.receiveShadow = true; scene.add(r); }
  }
  wireBeats(RTS); finishProps(RTS);
  // cast
  const first = SPEC.worlds[0];
  if (SINGLE) {
    const heroEntry = first.cast.find((x) => x.who === 'hero') || first.cast[0], off = worldOffset(0);
    const c = await buildChar(heroEntry, 0, [heroEntry.at[0] + off[0], 0, heroEntry.at[2]]); c.global = true; c.heroIds = SPEC.worlds.map((w) => heroIdAt(w.i)); CHARS.push(c); HERO_GLOBAL = c;
    for (const w of SPEC.worlds) for (const e of w.cast) { if (e.who === 'hero') continue; const o = worldOffset(w.i); CHARS.push(await buildChar(e, w.i, [e.at[0] + o[0], 0, e.at[2]])); }
  } else for (const w of SPEC.worlds) for (const e of w.cast) { const o = worldOffset(w.i); CHARS.push(await buildChar(e, w.i, [e.at[0] + o[0], 0, e.at[2]])); }
  wireCast(CHARS);
  buildOverlay(); buildComposer();
  // camera shots flattened with their world
  SHOTS_ALL = []; for (const w of SPEC.worlds) for (const s of w.shots) SHOTS_ALL.push(Object.assign({ wi: w.i }, s));
}
let SHOTS_ALL = [];
const worldAt = (t) => { let i = 0; for (let k = 1; k < SPEC.worlds.length; k++) if (t >= SPEC.worlds[k].t0) i = k; return i; };
const heroOf = (wi) => (HERO_GLOBAL || CHARS.find((c) => c.wi === wi && c.who === 'hero') || CHARS.find((c) => c.wi === wi));

function focusFor(shot, t) {
  const wi = shot.wi, tg = shot.target || { type: 'hero' }, off = worldOffset(wi), rt = RTS[wi];
  if (tg.type === 'prop' && rt.props[tg.id]) { const p = rt.props[tg.id], w = p.wrap.position; return { p: [w.x + off[0], 0, w.z], cy: w.y + Math.min(p.b.top * 0.5, 1.3) + 0.15 }; }
  if (tg.type === 'anchor') { const a = rt.anchor(tg.id), h0 = heroOf(wi), hp0 = h0 && h0.pos; const k = hp0 ? 0.55 : 0; return { p: [lerp(a[0] + off[0], hp0 ? hp0[0] : 0, k), 0, lerp(a[2], hp0 ? hp0[2] : 0, k)], cy: null }; }
  const h = heroOf(wi), hp = h && h.pos ? h.pos : [off[0], 0, 1.2];
  return { p: [hp[0], 0, hp[2]], cy: 1.0 * (h ? h.size : 1) };
}
function heroPos(wi) { const h = heroOf(wi); return h && h.pos ? h.pos : null; }
let lastPose = null;
function poseAt(t) {
  let si = 0; for (let i = 0; i < SHOTS_ALL.length; i++) if (t >= SHOTS_ALL[i].t0) si = i;
  const s = SHOTS_ALL[si], u = (t - s.t0) / Math.max(0.01, s.t1 - s.t0);
  let pose = camPose(s, u, focusFor(s, t), heroPos(s.wi));
  if (SINGLE && si > 0) {
    const prev = SHOTS_ALL[si - 1], crossing = prev.wi !== s.wi, bt = crossing ? 1.7 : 0.7;
    if (t - s.t0 < bt) { const pf = focusFor(prev, t); const pp = camPose(prev, 1, crossing ? { p: [prev.wi !== s.wi ? pf.p[0] : pf.p[0], pf.p[1], pf.p[2]], cy: pf.cy } : pf, heroPos(prev.wi)); pose = lerpPose(pp, pose, EZ.io(clamp((t - s.t0) / bt))); }
  }
  return pose;
}

const _lp = new T.Vector3();
function renderAt(t) {
  t = clamp(t, 0, DUR);
  const wi = worldAt(t);
  RTS.forEach((rt, i) => { const near = SINGLE ? Math.abs(i - wi) <= 1 : i === wi; rt.g.visible = near; if (near) for (const id in rt.props) evalProp(rt.props[id], t); });
  CHARS.forEach((c) => { const near = SINGLE ? (c.global || Math.abs(c.wi - wi) <= 1) : c.wi === wi; c.root.visible = near; if (near) evalChar(c, t); });
  const pose = poseAt(t);
  cam.position.set(pose.pos[0], pose.pos[1], pose.pos[2]); cam.fov = pose.fov; cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
  cam.setViewOffset(FW, FH, 0, ZONES.viewOffsetY, FW, FH); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  // light rig follows the camera focus (snapped so shadows do not crawl)
  const lx = Math.round(pose.look[0] * 2) / 2, lz = Math.round(pose.look[2] * 2) / 2;
  key.target.position.set(lx, 0, lz); key.position.set(lx + STYLE.light.key.pos[0], STYLE.light.key.pos[1], lz + STYLE.light.key.pos[2]); key.target.updateMatrixWorld(); rim.position.set(lx + STYLE.light.rim.pos[0], STYLE.light.rim.pos[1], lz + STYLE.light.rim.pos[2]);
  const prevMood = SPEC.worlds[Math.max(0, wi - 1)].mood, curMood = SPEC.worlds[wi].mood, wt = t - SPEC.worlds[wi].t0;
  applyMood(wi > 0 ? prevMood : curMood, curMood, wi > 0 ? wt / 0.8 : 1);
  composer.render();
  overlayAt(t);
}
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
const READY = setup().then(() => renderAt(0));
window.__hf.buildReady.three = READY;
window.addEventListener('hf-seek', (e) => { if (RTS.length) renderAt(e.detail.time); });
READY.then(() => { window.__tlReady = true; }).catch((e) => { window.__tlError = String(e && e.stack || e); console.error(window.__tlError); if (window.__dbgEl) window.__dbgEl.textContent = 'ERR ' + window.__tlError.slice(0, 700); });
/* Test hook: the pure shot math, used by the node tests through a vm. */
window.__three = { camPose, projectY, lerpPose };
const tl = gsap.timeline({ paused: true }); tl.to({}, { duration: DUR });
window.__timelines = window.__timelines || {}; window.__timelines.main = tl;
