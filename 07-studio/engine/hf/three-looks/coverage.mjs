// Draw plan: where every visible object, cast member and decor part lands on screen at a time, and how much of the lower third of the
// frame is still empty floor. Pure over the resolved data (`SPEC`), so tests measure the same thing the composition draws.
import { partMatrices, localBox } from "./parts.mjs";
import { FW, FH, project, boxCorners, shotPoseAt } from "./frame.mjs";
import { ZONES } from "./layout.mjs";

const D2R = Math.PI / 180;
/** World-space AABBs of every part of an entity (position `at`, yaw `rot` radians, uniform `scale`). */
export function partBoxes(ent, channels = ent.init ?? {}) {
  const mats = partMatrices(ent.parts, channels), cy = Math.cos(ent.rot ?? 0), sy = Math.sin(ent.rot ?? 0), s = ent.scale ?? 1, a = ent.at ?? [0, 0, 0];
  const out = [];
  ent.parts.forEach((p, i) => {
    if (p.shape === "group") return;
    const b = localBox(p), m = mats[i], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const sx of [-1, 1]) for (const sY of [-1, 1]) for (const sz of [-1, 1]) {
      const q = [b.c[0] + sx * b.h[0], b.c[1] + sY * b.h[1], b.c[2] + sz * b.h[2]];
      const w = [m[0] * q[0] + m[4] * q[1] + m[8] * q[2] + m[12], m[1] * q[0] + m[5] * q[1] + m[9] * q[2] + m[13], m[2] * q[0] + m[6] * q[1] + m[10] * q[2] + m[14]];
      const x = (w[0] * cy + w[2] * sy) * s + a[0], y = w[1] * s + a[1], z = (-w[0] * sy + w[2] * cy) * s + a[2];
      lo[0] = Math.min(lo[0], x); hi[0] = Math.max(hi[0], x); lo[1] = Math.min(lo[1], y); hi[1] = Math.max(hi[1], y); lo[2] = Math.min(lo[2], z); hi[2] = Math.max(hi[2], z);
    }
    out.push({ min: lo, max: hi });
  });
  return out;
}
const rectOf = (pose, box) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of boxCorners(box)) { const p = project(pose, c); if (!Number.isFinite(p.x)) return null; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0, y0, x1, y1 };
};
/** @returns {{ pose, rects: Array<{ kind, id, rect }> }} for the world visible at time t (multi or single mode). */
export function drawPlan(data, t) {
  const wi = data.worlds.reduce((a, w, i) => (t >= w.t0 ? i : a), 0), w = data.worlds[wi];
  const shot = w.shots.find((s) => t >= s.t0 && t < s.t1) ?? w.shots[w.shots.length - 1];
  const pose = shotPoseAt(shot, (t - shot.t0) / Math.max(0.01, shot.t1 - shot.t0));
  const off = [wi * data.spacing, 0, 0], rects = [];
  const add = (kind, id, ent, extra) => { for (const b of partBoxes({ ...ent, at: [ent.at[0] + off[0], ent.at[1], ent.at[2]] })) { const r = rectOf(pose, b); if (r) rects.push({ kind, id, rect: r }); } void extra; };
  for (const d of w.decor) add("decor", d.id, d);
  for (const o of w.objects) add("object", o.id, o);
  for (const c of w.cast) add("cast", c.id, c);
  return { pose, rects, wi };
}
/** Fraction of the lower third of the frame not covered by any object, cast member or decor part (rects rasterised on a 24 px grid). */
export function lowerThirdEmpty(plan, step = 24) {
  const { y0, y1 } = ZONES.lowerThird, cols = Math.ceil(FW / step), rows = Math.ceil((y1 - y0) / step), seen = new Uint8Array(cols * rows);
  for (const { rect: r } of plan.rects) {
    if (r.y1 < y0 || r.y0 > y1) continue;
    const c0 = Math.max(0, Math.floor(r.x0 / step)), c1 = Math.min(cols - 1, Math.floor(r.x1 / step)), r0 = Math.max(0, Math.floor((r.y0 - y0) / step)), r1 = Math.min(rows - 1, Math.floor((r.y1 - y0) / step));
    for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) seen[j * cols + i] = 1;
  }
  let n = 0; for (const v of seen) n += v;
  return 1 - n / seen.length;
}
export { D2R };
