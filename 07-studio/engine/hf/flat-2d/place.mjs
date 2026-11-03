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
