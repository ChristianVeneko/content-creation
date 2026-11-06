/* main.js: builds the worlds, cast and overlay once (heavy setup registered as window.__hf.buildReady) and renders every frame as a pure function of
   the seek time: poses -> objects -> cast -> lights -> post (with the crossfade transition) -> DOM. */
'use strict';
const FPS = SPEC.fps, DUR = SPEC.dur, SINGLE = SPEC.mode === 'single';
let RTS = [], CHARS = [], HERO_GLOBAL = null, SHOTS_ALL = [];
const TWIN = 0.25; // half window of the crossfade transition (s)

async function setup() {
  await Promise.all([document.fonts.load('700 62px Baloo2'), document.fonts.load('800 62px Baloo2')]);
  loadEnv();
  for (const w of SPEC.worlds) RTS.push(await buildWorld(w));
  if (SINGLE) { // path ribbons between consecutive stations
    for (let i = 0; i + 1 < RTS.length; i++) { const x0 = i * SPEC.spacing + 4.4, x1 = (i + 1) * SPEC.spacing - 4.4, r = RB(x1 - x0 + 0.6, 0.16, 1.5, 0.07, solidMat(SPEC.worlds[i].look.pal.accent)); r.position.set((x0 + x1) / 2, -0.08, 1.4); r.receiveShadow = true; scene.add(r); }
  }
  // cast: in single mode the hero is one entity that walks across the stations
  for (const w of SPEC.worlds) {
    for (const e of w.cast) {
      if (SINGLE && e.isHero && w.i > 0) continue;
      let gp = null;
      if (SINGLE && e.isHero) { // global path: every world's hero events, offset to world coordinates, with the travel walks between them
        gp = []; let cur = [e.at[0], e.at[2]];
        for (const w2 of SPEC.worlds) { const h = w2.cast.find((x) => x.isHero) || w2.cast[0], off = worldOffset(w2.i)[0], syn = SPEC.beats.find((b) => b.world === w2.i && b.synthetic && b.who === h.id);
          if (w2.i > 0 && syn) { const to = [h.at[0] + off, h.at[2]]; gp.push({ t: syn.t, dur: syn.dur || 1.6, from: cur.slice(), to }); cur = to; }
          for (const ev of h.path) { if (w2.i > 0 && syn && ev.t === syn.t) continue; const to = [ev.to[0] + off, ev.to[1]]; gp.push({ t: ev.t, dur: ev.dur, from: cur.slice(), to }); cur = to; } }
        gp.sort((a, b) => a.t - b.t);
      }
      const c = await buildChar(e, w.i, gp); scene.add(c.root);
      if (gp) { c.global = true; HERO_GLOBAL = c; c.wi = 0; c.ent.at = [e.at[0], 0, e.at[2]]; }
      CHARS.push(c);
    }
  }
  wireCast(CHARS);
  for (const c of CHARS) { for (const k of Object.keys(c.ev)) c.ev[k] = buildTrack([], c.init[k]); c.burstMeshes = []; }
  buildOverlay(); buildComposer();
  for (const w of SPEC.worlds) for (const s of w.shots) SHOTS_ALL.push(Object.assign({ wi: w.i }, s));
}
const worldAt = (t) => { let i = 0; for (let k = 1; k < SPEC.worlds.length; k++) if (t >= SPEC.worlds[k].t0) i = k; return i; };
function worldPose(wi, t) {
  const list = SHOTS_ALL.filter((s) => s.wi === wi); let s = list[0];
  for (const x of list) if (t >= x.t0) s = x;
  return shotPose(s, (t - s.t0) / Math.max(0.01, s.t1 - s.t0));
}
function poseAt(t) {
  let si = 0; for (let i = 0; i < SHOTS_ALL.length; i++) if (t >= SHOTS_ALL[i].t0) si = i;
  const s = SHOTS_ALL[si], u = (t - s.t0) / Math.max(0.01, s.t1 - s.t0);
  let pose = shotPose(s, u);
  if (SINGLE && si > 0) { // continuous travel: blend from the previous shot's end pose
    const prev = SHOTS_ALL[si - 1], crossing = prev.wi !== s.wi, bt = crossing ? SINGLE_TRAVEL : 0.5;
    if (t - s.t0 < bt) pose = lerpPose(shotPose(prev, 1), pose, EZ.io(clamp((t - s.t0) / bt)));
  }
  return pose;
}
const SINGLE_TRAVEL = 1.7;

const _lp = new T.Vector3();
function showWorld(wi, t, keep) {
  RTS.forEach((rt, i) => { const near = SINGLE ? Math.abs(i - wi) <= 1 : i === wi; rt.g.visible = near; if (near) for (const id in rt.objects) evalObject(rt.objects[id], t); });
  CHARS.forEach((c) => { const near = SINGLE ? (c.global || Math.abs(c.wi - wi) <= 1) : c.wi === wi; c.root.visible = near; if (near) evalObject(c, t); });
}
function aimCamera(pose, wi, t) {
  cam.position.set(pose.pos[0], pose.pos[1], pose.pos[2]); cam.fov = pose.fov; cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
  cam.setViewOffset(FW, FH, 0, ZONES.viewOffsetY, FW, FH); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  const lx = Math.round(pose.look[0] * 2) / 2, lz = Math.round(pose.look[2] * 2) / 2;
  key.target.position.set(lx, 0, lz); key.position.set(lx + STYLE.light.key.pos[0], STYLE.light.key.pos[1], lz + STYLE.light.key.pos[2]); key.target.updateMatrixWorld(); rim.position.set(lx + STYLE.light.rim.pos[0], STYLE.light.rim.pos[1], lz + STYLE.light.rim.pos[2]);
  const prevMood = SPEC.worlds[Math.max(0, wi - 1)].mood, curMood = SPEC.worlds[wi].mood, wt = t - SPEC.worlds[wi].t0;
  applyMood(wi > 0 ? prevMood : curMood, curMood, wi > 0 ? wt / 0.8 : 1);
}
function renderAt(t) {
  t = clamp(t, 0, DUR);
  let wi = worldAt(t), mix = 0, kind = 0;
  // crossfade window around the cut (multi mode): the incoming world is drawn into a render target and blended through a moving mask
  if (!SINGLE) for (const w of SPEC.worlds) { if (w.i > 0 && w.transition && t >= w.t0 - TWIN && t < w.t0 + TWIN) { mix = (t - (w.t0 - TWIN)) / (2 * TWIN); kind = Math.max(0, ['iris', 'slide', 'drop', 'pop'].indexOf(w.transition)); wi = w.i - 1; var inc = w.i; } }
  if (mix > 0) {
    showWorld(inc, Math.max(t, SPEC.worlds[inc].t0), true);
    const poseB = worldPose(inc, Math.max(t, SPEC.worlds[inc].t0)); aimCamera(poseB, inc, Math.max(t, SPEC.worlds[inc].t0));
    renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(null);
    showWorld(wi, t); CUR_POSE = worldPose(wi, t); aimCamera(CUR_POSE, wi, t);
    mixPass.uniforms.p.value = EZ.io(clamp(mix)); mixPass.uniforms.kind.value = kind;
    composer.render();
    CUR_POSE = clamp(mix) > 0.5 ? poseB : CUR_POSE;
    overlayAt(t); return;
  }
  mixPass.uniforms.p.value = 0;
  showWorld(wi, t);
  CUR_POSE = poseAt(t); aimCamera(CUR_POSE, wi, t);
  composer.render();
  overlayAt(t);
}
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
const READY = setup().then(() => renderAt(0));
window.__hf.buildReady.three = READY;
window.addEventListener('hf-seek', (e) => { if (RTS.length) renderAt(e.detail.time); });
READY.then(() => { window.__tlReady = true; }).catch((e) => { window.__tlError = String(e && e.stack || e); console.error(window.__tlError); });
/* Test hook: the pure pose math, used by the node tests through a vm. */
window.__three = { shotPose, lerpPose, projectPx };
const tl = gsap.timeline({ paused: true }); tl.to({}, { duration: DUR });
window.__timelines = window.__timelines || {}; window.__timelines.main = tl;
