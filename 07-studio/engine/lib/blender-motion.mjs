// Object and part motion of a scene as a pure function of the frame, for the Blender job. It mirrors
// src/three/Scene3D.tsx (look entrance + keyframes/presets + corner mascots + aim at the camera) and
// src/three/custom.tsx (part transforms), on top of the shared lib/scene3d*.mjs math, so a Blender frame moves like
// the three.js canvas. Node-only (uses Remotion's pure `spring`).
import { spring } from "remotion";
import { cameraAt, cornerPlacement, floatY, LOOK3D } from "./scene3d.mjs";
import { customHeight, looksAtCamera, momentSec, motionList, nodeDelta, partCenters } from "./scene3d-motion.mjs";

const DEG = Math.PI / 180;
const r4 = (v) => Math.round(v * 10000) / 10000;

/** Live transform of object k: entrance style of the look, exploded-view travel, idle float. */
export function liveTransform(enter, lookId, plan, k, frame, fps, ownEntrance = false) {
  const o = plan.objects[k];
  const t = frame / fps;
  const d = frame - Math.round(o.enter * fps);
  const base = [...o.pos];
  if (ownEntrance) return { pos: [base[0], base[1] + floatY(lookId, t, k), base[2]], scale: [o.scale, o.scale, o.scale], rotY: 0, rotX: 0, visible: true, p: 1 };
  if (d < 0) return { pos: base, scale: [0.001, 0.001, 0.001], rotY: 0, rotX: 0, visible: false, p: 0 };
  let pos = [base[0], base[1] + floatY(lookId, t, k), base[2]];
  let sx = 1;
  let sy = 1;
  let rotY = 0;
  let rotX = 0;
  let visible = true;
  let p = 1;
  const sp = (frm, damping, stiffness) => spring({ frame: frm, fps, config: { damping, stiffness } });
  switch (enter) {
    case "drop": {
      p = sp(d, 9, 120);
      pos = [pos[0], pos[1] + Math.max(0, 1 - p) * 2.6, pos[2]];
      const squash = Math.max(0, p - 1);
      sy = 1 - squash * 0.9;
      sx = 1 + squash * 0.45;
      const grow = Math.min(1, d / 4);
      sx *= grow;
      sy *= grow;
      break;
    }
    case "rise":
      p = sp(d, 13, 160);
      sy = Math.max(0.001, p);
      sx = Math.min(1, p * 1.5);
      break;
    case "flicker":
      p = sp(d, 12, 150);
      sx = sy = p;
      rotY = (1 - p) * 1.8;
      visible = !(d < 9 && d % 3 === 1);
      break;
    case "unfold":
      p = sp(d, 11, 110);
      rotX = (1 - p) * (-Math.PI / 2);
      sx = sy = Math.min(1, 0.4 + p);
      break;
    case "snap": {
      const d2 = Math.floor(d / 2) * 2;
      p = sp(d2, 14, 200);
      pos = [pos[0], base[1] + Math.round((Math.max(0, 1 - p) * 2.4) / 0.3) * 0.3, pos[2]];
      sx = sy = d2 < 2 ? 0.001 : 1;
      break;
    }
    case "scan":
      p = Math.min(1, d / (0.6 * fps));
      sy = Math.max(0.001, p);
      visible = !(d < 6 && d % 2 === 1);
      break;
    case "swing":
    default:
      p = sp(d, 18, 90);
      pos = [pos[0], pos[1] + (1 - p) * 1.2, pos[2]];
      rotY = (1 - p) * 2.4;
      sx = sy = 0.7 + 0.3 * p;
      break;
  }
  if (plan.explode) {
    const e = sp(d, 16, 70);
    const c = plan.frame.target;
    pos = [c[0] + (pos[0] - c[0]) * e, pos[1] + (1 - e) * 0.6, c[2] + (pos[2] - c[2]) * e];
  }
  const spin = LOOK3D[lookId]?.spin ?? 0;
  if (spin && k === 0 && (plan.layout === "hero" || plan.objects.length === 1)) rotY += Math.sin(t * spin * 1.6) * 0.55;
  const s = o.scale;
  return { pos, scale: [sx * s, sy * s, sx * s], rotY, rotX, visible, p };
}

/**
 * Sampler for one scene: camera pose and object / part transforms at any frame.
 * @param {{plan: object, objects: object[], lookId: string, enter: string, index: number, fps: number, frames: number}} a
 *   objects: the scene's visual.objects (specs); plan: planThree entry for the scene
 */
export function sceneSampler({ plan, objects, lookId, enter, index, fps, frames }) {
  const sceneSec = frames / fps;
  const gen = plan;
  const sec = (m) => momentSec(m, gen.moments);
  const focusPos = plan.focus !== null && plan.objects[plan.focus] ? plan.objects[plan.focus].pos : null;
  const camAt = (t) => cameraAt({ t, sceneSec, look: lookId, move: plan.move, frame: plan.frame, focusPos, keys: gen.cameraKeys ?? null });
  const ctxOf = (k) => ({ sec, enter: plan.objects[k]?.enter ?? 0, seed: index * 31 + k + 1 });
  const ownEntrance = objects.map((o) => motionList(o.motion).some((m) => m.type === "pop-in" || m.type === "assemble"));

  /** Object k at frame f: {pos, rot, scale, op, visible, camYaw}. */
  const objectAt = (k, f) => {
    const t = f / fps;
    let lv = liveTransform(enter, lookId, plan, k, f, fps, ownEntrance[k]);
    const o = objects[k];
    const corner = plan.objects[k]?.corner;
    const cam = camAt(t);
    if (corner) {
      const pl = plan.objects[k];
      const cp = cornerPlacement(cam, corner, pl.h / Math.max(1e-6, pl.scale), pl.scale);
      const k3 = lv.scale.map((x) => (x / Math.max(1e-6, pl.scale)) * cp.scale);
      lv = { ...lv, pos: [cp.pos[0] + lv.pos[0], cp.pos[1] + lv.pos[1] * cp.scale, cp.pos[2] + lv.pos[2]], scale: k3, rotY: lv.rotY + cp.yaw };
    }
    const d = nodeDelta(o, t, ctxOf(k));
    const pos = [lv.pos[0] + d.pos[0], lv.pos[1] + d.pos[1], lv.pos[2] + d.pos[2]];
    const camYaw = Math.atan2(cam.position[0] - pos[0], cam.position[2] - pos[2]);
    const aim = looksAtCamera(o) ? camYaw : 0;
    return {
      pos,
      rot: [(lv.rotX ?? 0) + d.rot[0], lv.rotY + d.rot[1] + aim, d.rot[2]],
      scale: lv.scale.map((x, a) => x * d.scale[a]),
      op: d.opacity,
      visible: lv.visible,
      camYaw,
    };
  };

  /** Local transform of part `i` of `parts` (object `o`) at frame f: [px,py,pz,rx,ry,rz,sx,sy,sz,opacity]. */
  const partAt = (o, parts, centers, ctx, i, f, camYawLocal) => {
    const t = f / fps;
    const p = parts[i];
    const h = customHeight(parts);
    const side = Math.sign((p.pos ?? [0, 0, 0])[0]) || 1;
    const d = nodeDelta(p, t, { ...ctx, side }, o.motion ?? [], p.id, { rest: centers[i], center: [0, h * 0.5, 0], order: i, root: true });
    const rest = p.pos ?? [0, 0, 0];
    const rot = (p.rot ?? [0, 0, 0]).map((r, a) => r * DEG + d.rot[a]);
    if (camYawLocal !== null && looksAtCamera(p)) rot[1] += Math.max(-1.1, Math.min(1.1, camYawLocal));
    const sc = p.scale === undefined ? [1, 1, 1] : Array.isArray(p.scale) ? p.scale : [p.scale, p.scale, p.scale];
    return [...rest.map((x, a) => x + d.pos[a]), ...rot, ...sc.map((x, a) => Math.max(1e-4, x * d.scale[a])), (p.opacity ?? 1) * d.opacity].map(r4);
  };

  return { camAt, objectAt, partAt, ctxOf, sec };
}

/** Track of a node over `frames`: one sample when it never changes, else one per frame. */
export function collapseTrack(samples) {
  const first = JSON.stringify(samples[0]);
  return samples.every((s) => JSON.stringify(s) === first) ? [samples[0]] : samples;
}

export { partCenters, r4 };
