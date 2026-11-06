// Character clips -> generic tween ops. Ops are { k: "to"|"fromTo"|"set"|"cycle", t, sel, ... } consumed by runtime.js.
// Angles are authored for a character facing +x (rotation < 0 swings a hanging arm toward +x). In "front" mode the
// far arm sits on the other side, so symmetric gestures flip its sign (see `out`).
import { RIG, DESIGNS } from "./rig.mjs";
import { mulberry32, hashSeed, r2 } from "./util.mjs";

const REST = { front: { aN: -8, aF: 8 }, side: { aN: -6, aF: -2 } };

export class CastState {
  constructor(ch) { this.ch = ch; this.x = ch.x; this.flip = ch.flip; }
}

export function clipOps(st, clip, t, o) {
  const ch = st.ch, ops = [];
  const J = (s) => `#${ch.key} ${s}`;
  const arm = (a) => J(`.${a} > .rot`), fore = (a) => J(`.${a} .fore > .rot`);
  const sgnOut = (a) => (ch.mode === "front" ? (a === "aN" ? -1 : 1) : -1);
  const rest = (a) => REST[ch.mode][a];
  const to = (sel, v, d, ease, at = t) => ops.push({ k: "to", t: r2(at), sel, v, d, ease });
  const set = (sel, v, at = t) => ops.push({ k: "set", t: r2(at), sel, v });
  const mouth = (kind, at) => { set(J(".m-smile"), { opacity: kind === "s" ? 1 : 0 }, at); set(J(".m-open"), { opacity: kind === "o" ? 1 : 0 }, at); set(J(".m-o"), { opacity: kind === "c" ? 1 : 0 }, at); };
  const brows = (y, at, d = 0.15) => to(`${J(".bN > .rot")}, ${J(".bF > .rot")}`, { y }, d, "power2.out", at);
  const relax = (at, d = 0.4) => { for (const a of ["aN", "aF"]) { to(arm(a), { rotation: rest(a) }, d, "power2.inOut", at); to(fore(a), { rotation: 0 }, d, "power2.inOut", at); } to(J(".head > .rot"), { rotation: 0 }, d, "power2.inOut", at); brows(0, at, d); mouth("s", at); };
  const dur = o.dur ?? 1.6;
  const aimAt = (tx, ty) => {
    const sx = st.x + (ch.mode === "front" ? 72 * ch.scale * st.flip : 0), sy = ch.hipY - 150 * ch.scale;
    const dxp = (tx - sx) * st.flip, dy = ty - sy;
    const deg = (Math.atan2(-dxp, dy) * 180) / Math.PI;
    const a = ch.mode === "front" && dxp < 0 ? "aF" : "aN";
    return { a, deg: Math.max(-175, Math.min(175, deg)) };
  };
  const target = o.target; // { x, y } stage coords or null

  switch (clip) {
    case "idle": relax(t); break;
    case "talk": {
      const r = mulberry32(hashSeed(ch.key + t.toFixed(2)));
      let at = t, i = 0;
      while (at < t + dur && i < 40) { mouth(["o", "c", "o", "s"][Math.floor(r() * 4)], at); at += 0.15 + r() * 0.12; i++; }
      mouth("s", t + dur);
      brows(-5, t, 0.12); brows(0, t + dur, 0.2);
      break;
    }
    case "walk": case "run": {
      const run = clip === "run";
      let tx = target ? target.x : st.x + (o.dir === "left" ? -220 : 220);
      tx = Math.max(90, Math.min(870, tx));
      const dist = Math.abs(tx - st.x);
      const d = Math.max(0.5, dist / (run ? 560 : 280));
      const dirSign = tx >= st.x ? 1 : -1;
      let at = t;
      if (ch.mode === "side" && dirSign !== st.flip) { ops.push({ k: "fromTo", t: r2(t), sel: J(".flip"), from: { scaleX: st.flip }, to: { scaleX: dirSign }, d: 0.18, ease: "power2.inOut" }); st.flip = dirSign; at = t + 0.12; }
      const period = run ? 0.3 : 0.5, amp = run ? 58 : 32, n = Math.max(1, Math.round(d / (period / 2)));
      ops.push({ k: "fromTo", t: r2(at), sel: J(".pos"), from: { x: (st.x - ch.x) / ch.scale }, to: { x: (tx - ch.x) / ch.scale }, d: r2(d), ease: "power1.inOut" });
      ops.push({ k: "cycle", t: r2(at), d: r2(d), period, items: [{ sel: J(".lN > .rot"), a: -amp, b: amp }, { sel: J(".lF > .rot"), a: amp, b: -amp }, { sel: arm("aN"), a: amp * 1.3, b: -amp * 1.3 }, { sel: arm("aF"), a: -amp * 1.3, b: amp * 1.3 }] });
      ops.push({ k: "fromTo", t: r2(at), sel: J(".body"), from: { y: 0 }, to: { y: run ? -14 : -8 }, d: period / 2, ease: "sine.inOut", repeat: Math.max(1, n), yoyo: true });
      to(`${J(".lN > .rot")}, ${J(".lF > .rot")}`, { rotation: 0 }, 0.18, "power2.out", at + d);
      for (const a of ["aN", "aF"]) to(arm(a), { rotation: rest(a) }, 0.25, "power2.out", at + d);
      st.x = tx;
      o.endsAt = at + d;
      break;
    }
    case "point": case "pull": case "click": {
      const tgt = target ?? { x: st.x + 200 * st.flip, y: ch.hipY - 150 * ch.scale };
      const { a, deg } = aimAt(tgt.x, tgt.y);
      const sg = a === "aF" ? 1 : -1;
      to(arm(a), { rotation: deg }, 0.3, "back.out(2)");
      to(fore(a), { rotation: 0 }, 0.3, "power2.out");
      to(J(".head > .rot"), { rotation: deg < 0 ? -5 : 5 }, 0.3, "power2.out");
      mouth(clip === "pull" ? "c" : "o", t);
      if (clip === "pull") { to(arm(a), { rotation: deg * 0.4 }, 0.35, "power2.inOut", t + 0.5); to(arm(a), { rotation: deg }, 0.5, "power2.inOut", t + 1.2); }
      if (clip === "click") { ops.push({ k: "fromTo", t: r2(t + 0.35), sel: fore(a), from: { rotation: 0 }, to: { rotation: sg * -14 }, d: 0.08, ease: "power2.in", repeat: 1, yoyo: true }); }
      relax(t + Math.max(1.0, dur), 0.4);
      break;
    }
    case "react": {
      ops.push({ k: "fromTo", t: r2(t), sel: J(".pos"), from: { y: 0 }, to: { y: -34 }, d: 0.14, ease: "power2.out", repeat: 1, yoyo: true });
      for (const a of ["aN", "aF"]) { to(arm(a), { rotation: sgnOut(a) * 42 }, 0.2, "back.out(2)"); to(fore(a), { rotation: -sgnOut(a) * 40 }, 0.2, "back.out(2)"); }
      mouth("o", t); brows(-9, t, 0.1);
      to(J(".head > .rot"), { rotation: -6 }, 0.2, "power2.out");
      relax(t + 1.3);
      break;
    }
    case "celebrate": {
      for (const a of ["aN", "aF"]) { to(arm(a), { rotation: sgnOut(a) * 160 }, 0.3, "back.out(2)"); to(fore(a), { rotation: 0 }, 0.2); }
      ops.push({ k: "fromTo", t: r2(t), sel: J(".pos"), from: { y: 0 }, to: { y: -60 }, d: 0.2, ease: "power2.out", repeat: 5, yoyo: true });
      mouth("o", t); brows(-10, t);
      relax(t + 1.8, 0.5);
      break;
    }
    case "shrug": {
      for (const a of ["aN", "aF"]) { to(arm(a), { rotation: sgnOut(a) * 52 }, 0.3, "back.out(2)"); to(fore(a), { rotation: -sgnOut(a) * 50 }, 0.3, "back.out(2)"); }
      to(J(".head > .rot"), { rotation: 9 }, 0.3, "power2.out"); brows(-8, t); mouth("c", t);
      relax(t + 1.4);
      break;
    }
    case "wave": {
      to(arm("aN"), { rotation: -150 }, 0.3, "back.out(2)");
      ops.push({ k: "fromTo", t: r2(t + 0.2), sel: fore("aN"), from: { rotation: -25 }, to: { rotation: 25 }, d: 0.18, ease: "sine.inOut", repeat: 7, yoyo: true });
      mouth("o", t);
      relax(t + 1.9);
      break;
    }
    case "think": {
      to(arm("aN"), { rotation: -118 }, 0.35, "power2.out"); to(fore("aN"), { rotation: -90 }, 0.35, "power2.out");
      to(J(".head > .rot"), { rotation: 8 }, 0.3, "power2.out"); brows(-6, t); mouth("c", t);
      relax(t + 1.8);
      break;
    }
    case "turn": {
      if (ch.mode === "side") { const nf = -st.flip; ops.push({ k: "fromTo", t: r2(t), sel: J(".flip"), from: { scaleX: st.flip }, to: { scaleX: nf }, d: 0.22, ease: "power2.inOut" }); st.flip = nf; }
      else to(J(".head > .rot"), { rotation: 8 }, 0.2, "power2.out");
      break;
    }
    case "shades": {
      if (DESIGNS[ch.design]?.shades) ops.push({ k: "fromTo", t: r2(t), sel: J(".shades"), from: { opacity: 0, y: -90 }, to: { opacity: 1, y: 0 }, d: 0.3, ease: "bounce.out" });
      to(arm("aN"), { rotation: -100 }, 0.3, "back.out(2)"); to(fore("aN"), { rotation: -50 }, 0.3);
      to(J(".head > .rot"), { rotation: -6 }, 0.3, "power2.out");
      to(arm("aN"), { rotation: rest("aN") }, 0.4, "power2.inOut", t + 1.4); to(fore("aN"), { rotation: 0 }, 0.4, "power2.inOut", t + 1.4);
      break;
    }
    default: break;
  }
  return ops;
}

/** Breathing and blinking for the whole video: a character is never a frozen image. */
export function lifeOps(ch, duration) {
  const ops = [];
  const cyc = 1.15 + (ch.life % 4) * 0.1;
  ops.push({ k: "fromTo", t: 0, sel: `#${ch.key} .body`, from: { y: 0 }, to: { y: -5 }, d: cyc, ease: "sine.inOut", repeat: Math.max(1, Math.floor(duration / cyc) - 1), yoyo: true, life: true });
  for (const a of ["aN", "aF"]) ops.push({ k: "set", t: 0, sel: `#${ch.key} .${a} > .rot`, v: { rotation: REST[ch.mode][a] } });
  if (DESIGNS[ch.design]?.shades) ops.push({ k: "set", t: 0, sel: `#${ch.key} .shades`, v: { opacity: 0 } });
  const r = mulberry32(hashSeed(ch.key) + 11);
  let t = 0.9 + r() * 1.2;
  while (t < duration - 0.3) { ops.push({ k: "fromTo", t: r2(t), sel: `#${ch.key} .eN > .rot, #${ch.key} .eF > .rot`, from: { scaleY: 1 }, to: { scaleY: 0.08 }, d: 0.07, ease: "none", repeat: 1, yoyo: true }); t += 2.2 + r() * 2.4; }
  return ops;
}
export { RIG };
