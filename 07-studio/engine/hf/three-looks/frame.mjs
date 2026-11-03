// Camera math and the framing solver (pure, shared by the resolver, the tests and, through baked poses, the runtime).
// A shot is a preset (distance, elevation, azimuth, fov) plus a move around a focus point. The solver picks the distance so the subject
// fits the safe fit box at the start, middle and end of the move, the hero is at most 35 % of the frame and is never cropped by an edge.
import { FRAME, ZONES } from "./layout.mjs";

const D2R = Math.PI / 180, FW = FRAME.w, FH = FRAME.h, ASPECT = FW / FH;
export const lerp = (a, b, t) => a + (b - a) * t;
export const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

/** Pose from a focus point and spherical offsets (az degrees from +z, el degrees above the horizon). */
export function poseFrom(focus, dist, az, el) {
  const a = az * D2R, e = el * D2R;
  return { pos: [focus[0] + dist * Math.sin(a) * Math.cos(e), focus[1] + dist * Math.sin(e), focus[2] + dist * Math.cos(a) * Math.cos(e)], look: [...focus] };
}
/** Pose of a baked shot at u in 0..1 (the runtime does the same: eased linear blend of pos, look and fov). */
export function shotPoseAt(shot, u) {
  const k = io(clamp(u));
  return { pos: mix3(shot.pose0.pos, shot.pose1.pos, k), look: mix3(shot.pose0.look, shot.pose1.look, k), fov: lerp(shot.pose0.fov, shot.pose1.fov, k) };
}
/** Projects a world point: { x, y } in frame pixels (y down, view offset applied) and `z` = depth in front of the camera. */
export function project(pose, p) {
  const fw = norm(sub(pose.look, pose.pos)), right = norm(cross(fw, [0, 1, 0])), up = cross(right, fw);
  const d = sub(p, pose.pos), zc = dot(d, fw), t = Math.tan((pose.fov * D2R) / 2);
  if (zc < 0.05) return { x: NaN, y: NaN, z: zc };
  const nx = dot(d, right) / (zc * t * ASPECT), ny = dot(d, up) / (zc * t);
  return { x: (nx * 0.5 + 0.5) * FW, y: (1 - (ny * 0.5 + 0.5)) * FH - ZONES.viewOffsetY, z: zc };
}
export const boxCorners = (b) => { const out = []; for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) out.push([x, y, z]); return out; };
/** Screen rect of a world box; `ok` false when a corner is behind the camera. */
export function projectBox(pose, box) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
  for (const c of boxCorners(box)) { const p = project(pose, c); if (!Number.isFinite(p.x)) { ok = false; continue; } x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return ok ? { x0, y0, x1, y1, ok } : { x0: -1e6, y0: -1e6, x1: 1e6, y1: 1e6, ok };
}
export const unionRect = (rs) => rs.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), y0: Math.min(a.y0, r.y0), x1: Math.max(a.x1, r.x1), y1: Math.max(a.y1, r.y1) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
export const unionBox = (bs) => bs.reduce((a, b) => ({ min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])], max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])] }), { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
export const boxCenter = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
const scaledFit = (fit, box = ZONES.fit) => { const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, hw = ((box.x1 - box.x0) / 2) * fit, hh = ((box.y1 - box.y0) / 2) * fit; return { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh }; };
const inside = (r, b) => r.x0 >= b.x0 - 0.5 && r.x1 <= b.x1 + 0.5 && r.y0 >= b.y0 - 0.5 && r.y1 <= b.y1 + 0.5;
/** Hero rule: at most 35 % of the frame tall, and either fully inside the safe box or fully outside the frame (never cropped). */
export function heroOk(r) {
  if (!r.ok) return false;
  if (r.y1 - r.y0 > ZONES.heroMaxFrac * FH + 0.5) return false;
  const B = ZONES.box, fully = r.x0 >= B.x0 && r.x1 <= B.x1 && r.y0 >= B.y0 && r.y1 <= B.y1;
  const outside = r.x1 < 0 || r.x0 > FW || r.y1 < 0 || r.y0 > FH;
  return fully || outside;
}

/**
 * Solves one shot. `preset` = { dist, el, az, fov, fit }, `move` = { dist?, az?, el? } scaled by `amp`.
 * `samples` = [{ u, subject: [worldBox...], hero: worldBox|null }] (entities at that moment of the shot); `focusBox` = union over the shot.
 * @returns {{ pose0, pose1, dist, warn: string|null }}
 */
export function solveShot({ preset, move = {}, amp = 1, samples, focusBox, fovOverride }) {
  const fov = fovOverride ?? preset.fov, f0 = boxCenter(focusBox), box = preset.fitBox ?? ZONES.fit, fit = scaledFit(preset.fit, box), shiftPx = (box.y0 + box.y1) / 2 - (ZONES.fit.y0 + ZONES.fit.y1) / 2;
  const M = { dist: 1 + ((move.dist ?? 1) - 1) * amp, az: (move.az ?? 0) * amp, el: (move.el ?? 0) * amp };
  const build = (D) => {
    // a subject centred lower than the default look point: aim above it by the pixel shift (world units at this distance)
    const f = [f0[0], f0[1] + (shiftPx / FH) * 2 * D * Math.tan((fov * D2R) / 2) / Math.cos(preset.el * D2R), f0[2]];
    const p0 = poseFrom(f, D, preset.az, preset.el), p1 = poseFrom(f, D * M.dist, preset.az + M.az, preset.el + M.el);
    return { pose0: { ...p0, fov }, pose1: { ...p1, fov } };
  };
  const ok = (shot, strict) => {
    for (const s of samples) {
      const pose = shotPoseAt(shot, s.u);
      const r = unionRect(s.subject.map((b) => projectBox(pose, b)));
      if (!inside(r, fit)) return false;
      if (strict && s.hero) { const hr = projectBox(pose, s.hero); if (!heroOk(hr)) return false; }
    }
    return true;
  };
  let first = null;
  for (let D = 1.8; D <= 48; D += 0.1) {
    const shot = build(D);
    if (!ok(shot, false)) continue;
    if (first === null) first = D;
    if (ok(shot, true)) return { ...shot, dist: D, warn: null };
    if (D > first * 3.2 + 4) break;
  }
  const D = first ?? 14, shot = build(D);
  return { ...shot, dist: D, warn: first === null ? "subject does not fit the frame" : "hero rule (35 % height / not cropped) could not be met" };
}
export { FW, FH, ASPECT };
