/* cast.js: characters. Skeletal clips (AnimationMixer sampled at seek time, never advanced by a clock) for the base layer
   (idle / walk) and emotes, plus skeleton-free secondary motion: talk squash-and-stretch on every spoken word, anticipation
   on emotes, hop on jump, yaw look-at. Everything is a pure function of t. */
'use strict';
const mixAngle = (a, b, u) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * u; };
const LOOP_EMOTES = { wave: 1, yes: 1, no: 1, 'thumbs-up': 1, dance: 1, sit: 1 };
const WALK_SPEED = 1.7;

async function buildChar(entry, wi, startPos) {
  const def = CAT.MODELS[entry.model], size = CAT.SIZE_SCALE[entry.size] || 1;
  const inst = await instance(entry.model, size);
  clayify(inst.root);
  inst.root.traverse((m) => { if (m.isSkinnedMesh) m.frustumCulled = false; });
  const mixer = new T.AnimationMixer(inst.inner), actions = {}, dur = {};
  for (const c of inst.clips) { actions[c.name] = mixer.clipAction(c); dur[c.name] = c.duration; }
  const rig = def.rig, names = rig === 'skinned' ? { idle: 'Idle', walk: 'Walking' } : { idle: 'idle', walk: 'walk' };
  const blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, opacity: STYLE.light.blob * 3.4 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.scale.set(1.5 * size, 1.5 * size, 1);
  const root = new T.Group(); root.add(inst.root, blob); scene.add(root);
  const c = { id: entry.id, entry, wi, root, inst, mixer, actions, dur, names, rig, size, blob, home: startPos, who: entry.who, ev: { pos: [], yaw: [] }, emotes: [], looks: [], walks: [], talk: entry.who === 'hero', world: wi };
  return c;
}
function wireCast(chars) {
  for (const c of chars) {
    const mine = SPEC.beats.filter((b) => (c.global ? b.who === c.heroIds[b.world] : b.world === c.wi && b.who === c.id));
    let cur = c.home.slice();
    c.ev.pos = []; c.ev.yaw = [];
    const restYaw = (x) => clamp(-(x - worldOffset(c.wi)[0]) * 0.14, -0.5, 0.5);
    let yawNow = restYaw(c.home[0]);
    const yawEv = [{ t: -1, to: yawNow, dur: 0, ease: EZ.lin }];
    for (const b of mine) {
      if (b.do === 'walk' && b.to) {
        const o = worldOffset(b.to.world), to = [b.to.p[0] + o[0], 0, b.to.p[2] + (b.to.prop ? 1.1 : 0)];
        const dist = Math.hypot(to[0] - cur[0], to[2] - cur[2]), d = b.dur || Math.max(0.9, dist / WALK_SPEED);
        const dirYaw = Math.atan2(to[0] - cur[0], to[2] - cur[2]);
        c.ev.pos.push({ t: b.t, to, dur: d, ease: EZ.io, from0: cur.slice() });
        c.walks.push({ t: b.t, dur: d, dist });
        if (dist > 0.05) yawEv.push({ t: b.t, to: dirYaw, dur: 0.25, ease: EZ.out3 });
        yawEv.push({ t: b.t + d, to: restYaw(to[0]), dur: 0.35, ease: EZ.io });
        cur = to;
      } else if (b.do === 'look') {
        let tp = null; const rt = RTS[b.world]; if (b.target && rt && rt.props[b.target]) { const pr = rt.props[b.target]; tp = [pr.home[0] + rt.w.i * SPEC.spacing, 0, pr.home[2]]; }
        yawEv.push({ t: b.t, to: tp ? Math.atan2(tp[0] - cur[0], tp[2] - cur[2]) : 0, dur: 0.4, ease: EZ.io });
      } else if (b.do === 'emote') {
        const sym = b.symbol, clip = CAT.EMOTE_CLIPS[c.rig][sym];
        const cd = c.dur[clip] || 1, hold = Math.max(0.6, CAT.EMOTE_HOLD[sym] || 1.2);
        c.emotes.push({ t: b.t, sym, clip, hold, cd });
      }
    }
    c.ev.posTr = buildTrack(c.ev.pos, c.home, mixV3);
    c.ev.yawTr = buildTrack(yawEv, yawNow, mixAngle);
  }
}
function setPose(c, list) {
  const on = {};
  for (const e of list) if (e.w > 0.001 && c.actions[e.name]) on[e.name] = e;
  for (const n in c.actions) {
    const a = c.actions[n], e = on[n];
    if (e) { a.enabled = true; a.play(); a.paused = true; a.weight = e.w; a.time = e.time; } else if (a.isRunning() || a.enabled) { a.stop(); }
  }
  c.mixer.update(0);
}
function evalChar(c, t) {
  const pos = trackAt(c.ev.posTr, t), yaw = trackAt(c.ev.yawTr, t);
  let walking = null;
  for (const w of c.walks) if (t >= w.t && t < w.t + w.dur && w.dist > 0.05) walking = w;
  const layers = [];
  let emote = null;
  for (const e of c.emotes) if (t >= e.t && t < e.t + e.hold) emote = e;
  let wE = 0, localE = 0;
  if (emote) { const u = t - emote.t; wE = Math.min(1, u / 0.15, (emote.hold - u) / 0.22); wE = clamp(wE); localE = LOOP_EMOTES[emote.sym] ? (u % emote.cd) : Math.min(u, emote.cd - 0.001); }
  const base = walking ? c.names.walk : c.names.idle, baseT = walking ? (t - walking.t) * (c.rig === 'skinned' ? 1.15 : 1) : t;
  const cd = c.dur[base] || 1;
  if (c.actions[base]) layers.push({ name: base, time: baseT % cd, w: 1 - wE });
  if (emote && c.actions[emote.clip]) layers.push({ name: emote.clip, time: localE, w: wE });
  setPose(c, layers);
  // secondary motion
  let sx = 1, sy = 1, hop = 0, pitch = 0;
  if (c.talk) for (let i = 0; i < SPEC.words.length; i++) { const w = SPEC.words[i]; if (t < w.t0) break; const u = (t - w.t0) / 0.32; if (u >= 0 && u < 1) { const k = Math.pow(1 - u, 2); sy += 0.055 * k; sx -= 0.028 * k; pitch += 0.05 * k; } }
  if (emote) {
    const u = t - emote.t;
    if (u < 0.22) { const k = Math.sin((u / 0.22) * Math.PI); sy -= 0.06 * k; sx += 0.04 * k; }
    if (emote.sym === 'jump') { const hu = clamp(u / 0.9); hop = Math.sin(hu * Math.PI) * (c.rig === 'nodes' ? 0.7 : 0.15) * c.size; }
    if (emote.sym === 'dance' || emote.sym === 'thumbs-up') hop = Math.abs(Math.sin(u * 7)) * 0.08 * c.size;
  }
  if (walking) hop += Math.abs(Math.sin((t - walking.t) * 8.5)) * 0.03 * c.size;
  c.root.position.set(pos[0], pos[1] + hop, pos[2]);
  c.root.rotation.set(pitch * 0, yaw, 0);
  c.inst.root.scale.set(sx, sy, sx);
  c.blob.scale.setScalar(1.5 * c.size * (1 - hop * 0.25));
  c.blob.position.y = 0.012 - hop;
  c.pos = pos;
}
