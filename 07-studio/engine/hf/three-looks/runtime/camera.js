/* camera.js: poses are baked by the framing solver at compose time (frame.mjs): each shot has pose0/pose1, the runtime only blends them
   with the same ease. pose(shot, u) -> { pos, look, fov }. */
'use strict';
const lerpPose = (a, b, u) => ({ pos: mixV3(a.pos, b.pos, u), look: mixV3(a.look, b.look, u), fov: lerp(a.fov, b.fov, u) });
const shotPose = (s, u) => lerpPose(s.pose0, s.pose1, EZ.io(clamp(u)));
/* Projects a world point with the pose (aspect 1080/1920); returns frame pixels (view offset applied) or null behind the camera. */
function projectPx(pose, p) {
  const f = [pose.look[0] - pose.pos[0], pose.look[1] - pose.pos[1], pose.look[2] - pose.pos[2]], fl = Math.hypot(f[0], f[1], f[2]), fw = f.map((v) => v / fl);
  const r0 = [-fw[2], 0, fw[0]], rl = Math.hypot(r0[0], r0[2]) || 1, right = [r0[0] / rl, 0, r0[2] / rl];
  const up = [right[1] * fw[2] - right[2] * fw[1], right[2] * fw[0] - right[0] * fw[2], right[0] * fw[1] - right[1] * fw[0]];
  const d = [p[0] - pose.pos[0], p[1] - pose.pos[1], p[2] - pose.pos[2]], zc = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2];
  if (zc < 0.05) return null;
  const t = Math.tan(pose.fov * D2R / 2), nx = (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / (zc * t * (FW / FH)), ny = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / (zc * t);
  return { x: (nx * 0.5 + 0.5) * FW, y: (1 - (ny * 0.5 + 0.5)) * FH - ZONES.viewOffsetY };
}
