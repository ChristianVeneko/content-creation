/* rig.js: character motion on top of the part rig (hips, torso, head, armL/armR, legL/legR). Procedural and pure in t: walk cycle while a walk beat
   runs, idle sway, emotes (wave yes no thumbs-up jump dance faint sit stand punch), yaw look-at, and a squash-and-stretch pulse on every spoken word. */
'use strict';
const LOOP_EMOTES = { wave: 1, yes: 1, no: 1, 'thumbs-up': 1, dance: 1, sit: 1 };
const EMOTE_HOLD = { wave: 1.6, yes: 1.2, no: 1.2, 'thumbs-up': 1.5, jump: 1.0, dance: 2.4, faint: 2.5, sit: 3.0, stand: 1.0, punch: 1.0 };

async function buildChar(ent, wi, globalPath) {
  const c = await buildObject(ent);
  c.isChar = true; c.who = ent.id; c.wi = wi; c.talk = !!ent.isHero;
  c.rig = {}; ['hips', 'torso', 'head', 'armL', 'armR', 'legL', 'legR'].forEach((id) => { if (c.recs[id]) c.rig[id] = c.recs[id].off; });
  if (globalPath) ent.path = globalPath;
  c.hook = rigHook;
  return c;
}
function wireCast(chars) {
  for (const c of chars) {
    const ent = c.ent, wi = c.wi, off = worldOffset(wi)[0];
    const mine = SPEC.beats.filter((b) => (c.global || b.world === wi) && b.who === ent.id && !b.synthetic);
    c.emotes = []; const restYaw = (x) => clamp(-(x - (c.global ? 0 : off)) * 0.14, -0.5, 0.5);
    const yawEv = [{ t: -1, to: restYaw(ent.at[0] + (c.global ? 0 : off)), dur: 0, ease: EZ.lin }];
    for (const ev of ent.path) {
      const dx = ev.to[0] - ev.from[0], dz = ev.to[1] - ev.from[1], dist = Math.hypot(dx, dz);
      if (dist > 0.05) yawEv.push({ t: ev.t, to: Math.atan2(dx, dz), dur: 0.25, ease: EZ.out3 });
      yawEv.push({ t: ev.t + ev.dur, to: restYaw(ev.to[0] + (c.global ? 0 : off)), dur: 0.35, ease: EZ.io });
    }
    for (const b of mine) {
      if (b.do === 'emote') c.emotes.push({ t: b.t, sym: b.symbol, hold: Math.max(0.6, EMOTE_HOLD[b.symbol] || 1.2) });
      else if (b.do === 'look') {
        const pa = pathAt(ent, b.t); let tx = null;
        const rt = RTS[b.world]; if (b.target && rt && rt.objects[b.target]) { const e = rt.objects[b.target].ent; tx = [e.at[0] - pa.x, e.at[2] - pa.z]; }
        yawEv.push({ t: b.t, to: tx ? Math.atan2(tx[0], tx[1]) : 0, dur: 0.4, ease: EZ.io });
      }
    }
    yawEv.sort((a, b) => a.t - b.t);
    c.yawTr = buildTrack(yawEv, yawEv[0].to, mixAngle);
  }
}
function rigHook(o, t, pa) {
  const R = o.rig, rootOff = o.rootOff; o.yawNow = trackAt(o.yawTr, t);
  const add = (id, k, v) => { if (R[id]) R[id].r[k] += v; };
  const mv = pa.moving && !pa.moving.hop ? pa.moving : null;
  // idle sway (always) and walk cycle (while a walk beat runs)
  const sw = Math.sin(t * 1.7 + o.seed);
  add('armL', 2, -4 - 1.5 * sw); add('armR', 2, 4 + 1.5 * sw); add('head', 1, 3 * Math.sin(t * 0.9 + o.seed));
  if (mv) {
    const ph = (t - mv.t) * TAU * 1.15, fade = Math.min(1, (t - mv.t) / 0.15, (mv.t + mv.dur - t) / 0.2 + 0.0001);
    add('legL', 0, 34 * Math.sin(ph) * clamp(fade)); add('legR', 0, -34 * Math.sin(ph) * clamp(fade)); add('armL', 0, -28 * Math.sin(ph) * clamp(fade)); add('armR', 0, 28 * Math.sin(ph) * clamp(fade));
    rootOff.p[1] += Math.abs(Math.sin(ph)) * 0.05 * clamp(fade); rootOff.r[2] += 2.5 * Math.sin(ph) * clamp(fade);
  }
  // emotes
  let em = null; for (const e of o.emotes) if (t >= e.t && t < e.t + e.hold) em = e;
  if (em) {
    const u = t - em.t, env = clamp(Math.min(1, u / 0.18, (em.hold - u) / 0.22));
    switch (em.sym) {
      case 'wave': add('armR', 2, 150 * env + 18 * env * Math.sin(u * 11)); add('head', 2, -4 * env); break;
      case 'yes': add('head', 0, 20 * env * Math.sin(u * TAU * 2)); break;
      case 'no': add('head', 1, 26 * env * Math.sin(u * TAU * 2.2)); break;
      case 'thumbs-up': add('armR', 0, -75 * env); add('armR', 2, 24 * env); rootOff.p[1] += Math.abs(Math.sin(u * 7)) * 0.06 * env; break;
      case 'jump': { const hu = clamp(u / 0.9); rootOff.p[1] += Math.sin(hu * Math.PI) * 0.62; const ar = Math.sin(hu * Math.PI); add('armL', 2, -140 * ar); add('armR', 2, 140 * ar); add('legL', 0, -25 * ar); add('legR', 0, -25 * ar); if (u < 0.2) { rootOff.s[1] *= 1 - 0.1 * Math.sin((u / 0.2) * Math.PI); rootOff.s[0] *= 1 + 0.06 * Math.sin((u / 0.2) * Math.PI); } break; }
      case 'dance': rootOff.r[2] += 7 * env * Math.sin(u * 9); rootOff.p[1] += Math.abs(Math.sin(u * 7)) * 0.1 * env; add('armR', 2, env * (110 + 35 * Math.sin(u * 7))); add('armL', 2, -env * (110 + 35 * Math.sin(u * 7 + Math.PI))); add('legL', 0, 14 * env * Math.sin(u * 7)); add('legR', 0, -14 * env * Math.sin(u * 7)); break;
      case 'faint': { const e = clamp(u / 0.55) * clamp((em.hold - u) / 0.45); rootOff.r[2] += -88 * e; rootOff.p[1] += 0.05 * e; add('head', 2, 12 * e); break; }
      case 'sit': rootOff.p[1] -= 0.28 * env; add('legL', 0, -88 * env); add('legR', 0, -88 * env); add('armL', 0, -30 * env); add('armR', 0, -30 * env); break;
      case 'punch': { const k = Math.sin(clamp(u / 0.6) * Math.PI); add('armR', 0, -100 * k); add('armL', 0, 20 * k); rootOff.r[1] += -14 * k; break; }
      default: break;
    }
    if (u < 0.22) { const k = Math.sin((u / 0.22) * Math.PI); rootOff.s[1] *= 1 - 0.06 * k; rootOff.s[0] *= 1 + 0.04 * k; }
  }
  // talk pulse on every spoken word (hero only)
  if (o.talk) for (let i = 0; i < SPEC.words.length; i++) { const w = SPEC.words[i]; if (t < w.t0) break; const u = (t - w.t0) / 0.32; if (u >= 0 && u < 1) { const k = Math.pow(1 - u, 2); rootOff.s[1] *= 1 + 0.045 * k; rootOff.s[0] *= 1 - 0.022 * k; add('head', 0, 3 * k); } }
}
