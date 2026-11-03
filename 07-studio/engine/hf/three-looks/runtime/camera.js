/* camera.js: pure shot math (no three.js). A shot = preset (dist, elevation, azimuth, fov) + move (how it drifts) around a focus.
   pose(shot, u, focus, hero) -> { pos, look, fov }. `focus` = { p: [x,y,z] ground point, cy: look height }, hero = ground point of the hero. */
'use strict';
const camSph = (f, dist, az, el, ly) => {
  const a = az * D2R, e = el * D2R;
  return { pos: [f[0] + dist * Math.sin(a) * Math.cos(e), f[1] + ly + dist * Math.sin(e), f[2] + dist * Math.cos(a) * Math.cos(e)], look: [f[0], f[1] + ly, f[2]] };
};
function shotParams(shot, u) {
  const S = CAT.SHOTS[shot.kind] || CAT.SHOTS.medium, M = CAT.MOVES[shot.move] || CAT.MOVES.drift, amp = shot.amp == null ? 1 : shot.amp;
  const d1 = S.dist * (1 + ((M.dist == null ? 1 : M.dist) - 1) * amp), az1 = S.az + (M.az || 0) * amp, el1 = S.el + (M.el || 0) * amp;
  const e = EZ.io(clamp(u));
  return { dist: lerp(S.dist, d1, e), az: lerp(S.az, az1, e), el: lerp(S.el, el1, e), fov: S.fov, h: S.h };
}
function camPose(shot, u, focus, hero) {
  const P = shotParams(shot, u);
  if (shot.kind === 'over-shoulder' && hero) {
    const dx = hero[0] - focus.p[0], dz = hero[2] - focus.p[2], l = Math.hypot(dx, dz) || 1;
    const sx = -dz / l * 0.5, sz = dx / l * 0.5;
    return { pos: [hero[0] + dx / l * P.dist + sx, 2.1 + P.el * 0.04, hero[2] + dz / l * P.dist + sz], look: [focus.p[0], focus.cy, focus.p[2]], fov: P.fov };
  }
  const ly = focus.cy != null ? focus.cy - focus.p[1] : P.h;
  const s = camSph(focus.p, P.dist, P.az, P.el, ly);
  return { pos: s.pos, look: s.look, fov: P.fov };
}
const lerpPose = (a, b, u) => ({ pos: mixV3(a.pos, b.pos, u), look: mixV3(a.look, b.look, u), fov: lerp(a.fov, b.fov, u) });
/* Projects a world point with the pose (vertical fov, aspect 1080/1920); returns normalized device coords y in [-1,1] (up positive). */
function projectY(pose, p) {
  const f = [pose.look[0] - pose.pos[0], pose.look[1] - pose.pos[1], pose.look[2] - pose.pos[2]], fl = Math.hypot(f[0], f[1], f[2]);
  const fw = f.map((v) => v / fl), r0 = [-fw[2], 0, fw[0]], rl = Math.hypot(r0[0], r0[2]) || 1, right = [r0[0] / rl, 0, r0[2] / rl];
  const up = [right[1] * fw[2] - right[2] * fw[1], right[2] * fw[0] - right[0] * fw[2], right[0] * fw[1] - right[1] * fw[0]];
  const d = [p[0] - pose.pos[0], p[1] - pose.pos[1], p[2] - pose.pos[2]];
  const zc = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2], yc = d[0] * up[0] + d[1] * up[1] + d[2] * up[2];
  return yc / (zc * Math.tan(pose.fov * D2R / 2));
}
