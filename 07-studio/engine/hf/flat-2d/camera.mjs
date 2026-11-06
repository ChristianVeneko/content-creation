// World layout (single: stations on a snake path; multi: scenes side by side) and the camera move plan.
import { STAGE } from "./layout.mjs";
import { clamp, r2 } from "./util.mjs";

export const TRANSITION_CYCLE = ["slide", "whip", "wipe", "up", "slide", "iris"];
const HALF_W = STAGE.w / 2, HALF_H = STAGE.h / 2;

export function layoutScenes(hf, mode) {
  const N = hf.scenes.length;
  const pos = [];
  const transitions = hf.scenes.map((s, i) => (i === 0 ? null : s.transition ?? TRANSITION_CYCLE[(i - 1) % TRANSITION_CYCLE.length]));
  if (mode === "single") {
    const cols = N <= 4 ? 2 : 3;
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / cols), k = i % cols, col = row % 2 ? cols - 1 - k : k;
      pos.push({ cx: col * 1500, cy: row * 1560 });
    }
  } else {
    let x = 0, y = 0;
    for (let i = 0; i < N; i++) {
      if (i > 0) { const t = transitions[i]; if (t === "up") y += 1920; else if (t === "wipe" || t === "iris") x += 3400; else x += 1080; }
      pos.push({ cx: x, cy: y });
    }
  }
  const paths = [];
  if (mode === "single") {
    for (let i = 0; i + 1 < N; i++) {
      const a = pos[i], b = pos[i + 1];
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      let p0, p3, c1, c2;
      if (Math.abs(dx) >= Math.abs(dy)) {
        const sg = Math.sign(dx) || 1;
        p0 = [a.cx + sg * (HALF_W + 16), a.cy]; p3 = [b.cx - sg * (HALF_W + 16), b.cy];
        const k = Math.abs(p3[0] - p0[0]) * 0.4;
        c1 = [p0[0] + sg * k, p0[1]]; c2 = [p3[0] - sg * k, p3[1]];
      } else {
        const sg = Math.sign(dy) || 1;
        p0 = [a.cx, a.cy + sg * (HALF_H + 16)]; p3 = [b.cx, b.cy - sg * (HALF_H + 16)];
        const k = Math.abs(p3[1] - p0[1]) * 0.4;
        c1 = [p0[0], p0[1] + sg * k]; c2 = [p3[0], p3[1] - sg * k];
      }
      paths.push({ from: i, to: i + 1, c: [p0, c1, c2, p3].map((q) => q.map(r2)) });
    }
  }
  const xs = pos.map((p) => p.cx), ys = pos.map((p) => p.cy);
  const bounds = { x0: Math.min(...xs) - HALF_W, x1: Math.max(...xs) + HALF_W, y0: Math.min(...ys) - HALF_H, y1: Math.max(...ys) + HALF_H };
  return { pos, paths, transitions, bounds };
}

/** World position of a point given in stage coordinates of scene `si`. */
export const toWorld = (layout, si, x, y) => ({ x: layout.pos[si].cx + x - STAGE.w / 2, y: layout.pos[si].cy + y - STAGE.h / 2 });

const WIN = { w: 1080, h: 1060 };
export const overviewState = (b) => ({ cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 - 20, z: r2(Math.min(0.9 * WIN.w / (b.x1 - b.x0), 0.9 * WIN.h / (b.y1 - b.y0), 1)) });

/**
 * Plan camera moves. Events: scene arrivals, camera beats, final recap. A move = { t0, t1, from, to, ease, dip?, blur?, jump? }.
 * `camBeats`: [{ t, move, si, target?, zoom? }] already time-resolved; target = { x, y, w, h } in stage coords or null.
 */
export function planCamera({ hf, mode, layout, timeline, camBeats, duration }) {
  const N = hf.scenes.length;
  const sceneState = (i) => ({ cx: layout.pos[i].cx, cy: layout.pos[i].cy, z: 1 });
  let cur = { ...sceneState(0), z: 1.22 };
  const initial = { ...cur };
  const moves = [];
  const events = [];
  for (let i = 1; i < N; i++) events.push({ t: timeline.enter[i], type: "arrive", i, prio: 0 });
  for (const b of camBeats) events.push({ t: b.t, type: b.move, b, prio: 1 });
  const recap = hf.recap !== false && mode === "single" && N >= 3 && duration - timeline.enter[N - 1] >= 6;
  if (recap) events.push({ t: duration - 3.4, type: "recapEnd", prio: 2 });
  events.sort((a, b) => a.t - b.t || a.prio - b.prio);
  let busyUntil = 0, curScene = 0;
  const sceneAt = (t) => { let s = 0; for (let i = 0; i < N; i++) if (timeline.enter[i] <= t + 0.2) s = i; return s; };
  const push = (m) => {
    const t0 = Math.max(m.t0, busyUntil);
    const dur = m.t1 - m.t0;
    const mv = { ...m, t0: r2(t0), t1: r2(t0 + dur), from: { ...cur } };
    moves.push(mv); cur = { ...m.to }; busyUntil = mv.t1;
  };
  // opening push: the hook starts already moving
  push({ t0: 0, t1: 1.15, to: sceneState(0), ease: "expo.out" });
  for (const ev of events) {
    if (ev.type === "arrive") {
      const prev = timeline.enter[ev.i - 1];
      const tr = Math.min(1.25, (ev.t - prev) * 0.45);
      curScene = ev.i;
      if (mode === "single") push({ t0: ev.t - tr + 0.25, t1: ev.t + 0.25, to: sceneState(ev.i), ease: "power2.inOut", dip: 0.55, blur: 8, travel: ev.i });
      else {
        const kind = layout.transitions[ev.i];
        if (kind === "whip") push({ t0: ev.t - 0.1, t1: ev.t + 0.22, to: sceneState(ev.i), ease: "expo.inOut", blur: 16, kind });
        else if (kind === "wipe" || kind === "iris") { const jt = ev.t - 0.02; push({ t0: jt, t1: jt + 0.001, to: sceneState(ev.i), ease: "none", jump: true, kind }); }
        else push({ t0: ev.t - 0.2, t1: ev.t + 0.4, to: sceneState(ev.i), ease: "power3.inOut", blur: 6, kind });
      }
      continue;
    }
    const si = sceneAt(ev.t);
    if (ev.type === "push") {
      const b = ev.b, ss = sceneState(si);
      let to = { ...ss, z: clamp(b.zoom ?? 1.5, 1.05, 2.4) };
      if (b.target) { const w = toWorld(layout, si, b.target.x + b.target.w / 2, b.target.y + b.target.h / 2); to = { cx: w.x, cy: w.y, z: clamp(b.zoom ?? Math.min(1.9, 860 / Math.max(300, b.target.w)), 1.1, 2.4) }; }
      push({ t0: ev.t - 0.1, t1: ev.t + 0.55, to, ease: "power2.inOut" });
    } else if (ev.type === "release") push({ t0: ev.t - 0.05, t1: ev.t + 0.7, to: sceneState(si), ease: "power2.inOut" });
    else if (ev.type === "zoom-out") push({ t0: ev.t - 0.05, t1: ev.t + 0.8, to: { ...sceneState(si), z: 0.62 }, ease: "power2.inOut", blur: 4 });
    else if (ev.type === "recap" && mode !== "single") push({ t0: ev.t - 0.05, t1: ev.t + 0.8, to: { ...sceneState(si), z: 0.62 }, ease: "power2.inOut", blur: 4 });
    else if (ev.type === "recap" || ev.type === "recapEnd") push({ t0: ev.t - 0.05, t1: ev.t + 1.3, to: overviewState(layout.bounds), ease: "expo.inOut", blur: 6, recap: true });
  }
  void curScene;
  return { moves, initial };
}
