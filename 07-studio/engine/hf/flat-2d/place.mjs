// Layout rule: a character stands beside the replicas, never over them. If no free spot exists the replica is
// lifted (never above the label strip) and, as a last resort, shrunk a little. Pure: boxes in, boxes out.
import { clamp } from "./util.mjs";

/** Do two boxes overlap, with `m` px of breathing room around both? */
export const rectsOverlap = (a, b, m = 0) => a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;

const MARGIN = 16, TOP_MIN = 104, X_MIN = 110, X_MAX = 850;

export function separateCast(propsIn, castIn) {
  const props = propsIn.map((p) => ({ ...p, box: { ...p.box }, shrink: 1 }));
  const cast = castIn.map((c) => ({ ...c, box: { ...c.box } }));
  const placeAt = (c, x) => { c.x = x; c.box.x = x - c.box.w / 2; };
  const hits = (c) => props.filter((p) => rectsOverlap(c.box, p.box, MARGIN));
  const order = cast.map((c, i) => i).sort((a, b) => cast[a].x - cast[b].x);
  for (const ci of order) {
    const c = cast[ci];
    if (!hits(c).length) continue;
    const x0 = c.x;
    const cands = [];
    for (let x = X_MIN; x <= X_MAX; x += 10) cands.push(x);
    cands.sort((a, b) => Math.abs(a - x0) - Math.abs(b - x0));
    let done = false;
    for (const x of cands) {
      const probe = { ...c.box, x: x - c.box.w / 2 };
      if (props.some((p) => rectsOverlap(probe, p.box, MARGIN))) continue;
      if (cast.some((o) => o !== c && rectsOverlap(probe, o.box, 8))) continue;
      placeAt(c, x); done = true; break;
    }
    if (done) continue;
    // no free column: lift the replicas that are in the way, then shrink if the strip is not enough
    for (const p of hits(c)) {
      const limit = c.box.y - MARGIN;
      const lifted = Math.max(TOP_MIN, limit - p.box.h);
      p.box.y = Math.min(p.box.y, lifted);
      if (p.box.y + p.box.h > limit) {
        const f = clamp((limit - p.box.y) / p.box.h, 0.6, 1);
        const cx = p.box.x + p.box.w / 2;
        p.box.w *= f; p.box.h *= f; p.box.x = cx - p.box.w / 2; p.shrink *= f;
      }
    }
  }
  return { props, cast };
}

// ---------------------------------------------------------------- replica vs replica
const P_X0 = 20, P_X1 = 940, P_Y0 = TOP_MIN, P_Y1 = 1010, STEP = 20, SCALES = [1, 0.9, 0.8, 0.7, 0.6];
const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Layout rule: two replicas never overlap and none covers a character. Replicas are settled in order of weight
 * (the active subject first: `weight`, then area); a replica that is clear keeps its place, one that is not moves
 * to the nearest free spot of the stage, shrinking down to 60 % when no spot is large enough. Pure: boxes in,
 * boxes out, same order as the input. `cast` boxes are obstacles only.
 */
export function separateProps(propsIn, castIn = []) {
  const base = propsIn.map((p) => ({ ...p, box: { ...p.box }, shrink: p.shrink ?? 1 }));
  const castBoxes = castIn.map((c) => c.box);
  const pre = base.map(() => 1);
  let result = null;
  for (let round = 0; round < 16; round++) {
    result = settle(base, pre, castBoxes);
    const bad = result.map((p, i) => i).filter((i) => result.some((q, j) => j !== i && rectsOverlap(result[i].box, q.box, 0)) || castBoxes.some((c) => rectsOverlap(result[i].box, c, 0)));
    if (!bad.length) break;
    // the room is not enough even with the lighter replicas at 60 %: shrink the biggest replica involved a little more
    const shrinkable = bad.filter((i) => pre[i] > 0.6 + 1e-9);
    if (!shrinkable.length) break;
    const i = shrinkable.reduce((m, q) => (base[q].box.w * base[q].box.h * pre[q] ** 2 > base[m].box.w * base[m].box.h * pre[m] ** 2 ? q : m));
    pre[i] = Math.max(0.6, pre[i] - 0.1);
  }
  return { props: result, cast: castIn };
}

function settle(base, pre, castBoxes) {
  const props = base.map((p, i) => {
    const f = pre[i], b = p.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return { ...p, box: f === 1 ? { ...b } : { x: cx - (b.w * f) / 2, y: cy - (b.h * f) / 2, w: b.w * f, h: b.h * f }, shrink: p.shrink * f };
  });
  const rank = props.map((p, i) => i).sort((a, b) => (props[b].weight ?? 0) - (props[a].weight ?? 0) || props[b].box.w * props[b].box.h - props[a].box.w * props[a].box.h || a - b);
  const placed = [];
  const obstacles = () => [...placed.map((p) => p.box), ...castBoxes];
  for (const i of rank) {
    const p = props[i], home = p.box;
    if (!obstacles().some((o) => rectsOverlap(home, o, MARGIN))) { placed.push(p); continue; }
    const obs = obstacles(), cx0 = home.x + home.w / 2, cy0 = home.y + home.h / 2;
    let best = null;
    const floor = 0.6 / p.shrink, scales = [...SCALES.map((f) => Math.max(f, floor)).filter((f, k, a) => a.indexOf(f) === k)];
    for (const f of scales) {
      const w = home.w * f, h = home.h * f;
      const spots = [];
      for (let x = P_X0; x + w <= P_X1 + 1e-6; x += STEP) for (let y = P_Y0; y + h <= P_Y1 + 1e-6; y += STEP) spots.push({ x, y, d: Math.hypot(x + w / 2 - cx0, y + h / 2 - cy0) });
      spots.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
      const hit = spots.find((s) => !obs.some((o) => rectsOverlap({ x: s.x, y: s.y, w, h }, o, MARGIN)));
      if (hit) { best = { x: hit.x, y: hit.y, w, h, f }; break; }
      if (f === scales.at(-1) && spots.length) {
        // nothing is free: least overlap wins (the caller then shrinks the biggest replica and settles again)
        const score = (s) => obs.reduce((acc, o) => acc + area({ x: s.x, y: s.y, w, h }, o), 0);
        const s = spots.reduce((m, q) => (score(q) < score(m) ? q : m));
        best = { x: s.x, y: s.y, w, h, f };
      }
    }
    if (best) { p.box = { x: best.x, y: best.y, w: best.w, h: best.h }; p.shrink *= best.f; }
    placed.push(p);
  }
  return props;
}

// ---------------------------------------------------------------- hero stamp
/**
 * Free band for a hero stamp of size w x h (tilted a few degrees, so the box is inflated). `avoid` boxes (characters,
 * cursor targets) are never covered when any room exists; `soft` boxes (replicas) are avoided while the stamp is
 * still at least 70 % of its size. Prefers the spot (480, 560); returns the centre, the scale and `clear` (false only
 * when even the smallest scale hits an `avoid` box, in which case the least-overlap spot is returned).
 */
export function placeStamp({ w, h, avoid = [], soft = [], bounds = { x0: 30, y0: 104, x1: 930, y1: 960 }, prefer = { x: 480, y: 560 } }) {
  const SC = [1, 0.85, 0.7, 0.62, 0.55];
  const fit = (f) => ({ rw: (w * 1.04 + h * 0.1) * f, rh: (h + w * 0.1) * f });
  const spots = (rw, rh) => {
    const out = [];
    for (let x = bounds.x0 + rw / 2; x <= bounds.x1 - rw / 2 + 1e-6; x += 10) for (let y = bounds.y0 + rh / 2; y <= bounds.y1 - rh / 2 + 1e-6; y += 10) out.push({ x, y, d: Math.hypot(x - prefer.x, y - prefer.y) });
    if (prefer.x - rw / 2 >= bounds.x0 && prefer.x + rw / 2 <= bounds.x1 && prefer.y - rh / 2 >= bounds.y0 && prefer.y + rh / 2 <= bounds.y1) out.push({ x: prefer.x, y: prefer.y, d: 0 });
    return out.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  };
  const find = (f, withSoft) => {
    const { rw, rh } = fit(f);
    const hit = spots(rw, rh).find((s) => {
      const b = { x: s.x - rw / 2, y: s.y - rh / 2, w: rw, h: rh };
      return !avoid.some((a) => rectsOverlap(b, a, 6)) && (!withSoft || !soft.some((a) => rectsOverlap(b, a, 6)));
    });
    return hit ? { x: hit.x, y: hit.y, scale: f, clear: true } : null;
  };
  for (const f of SC) if (f >= 0.7) { const r = find(f, true); if (r) return r; }
  for (const f of SC) { const r = find(f, false); if (r) return r; }
  const f = SC.at(-1), { rw, rh } = fit(f);
  const cand = spots(rw, rh);
  const score = (s) => avoid.reduce((acc, a) => acc + area({ x: s.x - rw / 2, y: s.y - rh / 2, w: rw, h: rh }, a), 0);
  const s = cand.length ? cand.reduce((m, q) => (score(q) < score(m) ? q : m)) : { x: prefer.x, y: prefer.y };
  return { x: s.x, y: s.y, scale: f, clear: false };
}
