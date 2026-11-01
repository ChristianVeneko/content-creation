// Agent-authored models (`kind: "custom"`): a tree of primitive parts with the look's materials (or a forced finish),
// per-part keyframes and procedural motion (lib/scene3d-motion.mjs). Every transform is a pure function of `t`
// (seconds into the scene), so stills and renders are deterministic. Parts face +z (the default camera side).
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Outlines } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { customHeight, looksAtCamera, nodeDelta, partCenters } from "../../lib/scene3d-motion.mjs";
import { Mat, makeToonRamp, mixHex, useKit3D, type Finish } from "./kit";
import { color3d } from "./looks";

type V3 = [number, number, number];
export type MotionEntry = string | { type: string; at?: number | string; until?: number | string; amp?: number; speed?: number; parts?: string[]; axis?: "x" | "y" | "z"; lift?: number };
export type Key3D = { at: number | string; pos?: V3; rot?: V3; scale?: number | V3; opacity?: number; ease?: string };
export type CustomPart = {
  id: string;
  shape: string;
  size?: number[];
  points?: number[][];
  radius?: number;
  pos?: V3;
  rot?: V3;
  scale?: number | V3;
  pivot?: V3;
  parent?: string;
  color?: string;
  role?: string;
  material?: string;
  emissive?: number;
  opacity?: number;
  motion?: MotionEntry[];
  keys?: Key3D[];
};
export type CustomObject = { kind: string; id?: string; parts?: CustomPart[]; motion?: MotionEntry[]; keys?: Key3D[] };
/** Moment resolution + timing context for motion (see nodeDelta in lib/scene3d-motion.mjs). */
export type MotionCtx = { sec: (m: number | string | undefined) => number; enter: number; seed: number; side?: number };
export type Pulse = { part: string | null; k: number };

const DEG = Math.PI / 180;
const vec = (s: number | V3 | undefined, d = 1): V3 => (s === undefined ? [d, d, d] : Array.isArray(s) ? s : [s, s, s]);

/** Local transform of one part at t (rest pose + motion), shared by the renderer and the world-position helper. */
export const partTransform = (o: CustomObject, i: number, t: number, ctx: MotionCtx, centers: V3[], camYawLocal: number | null) => {
  const p = (o.parts ?? [])[i];
  const h = customHeight(o.parts);
  const side = Math.sign((p.pos ?? [0, 0, 0])[0]) || 1;
  const d = nodeDelta(p, t, { ...ctx, side }, o.motion ?? [], p.id, { rest: centers[i], center: [0, h * 0.5, 0], order: i, root: true });
  const rest = p.pos ?? [0, 0, 0];
  const rot = (p.rot ?? [0, 0, 0]).map((r, a) => r * DEG + d.rot[a]) as V3;
  if (camYawLocal !== null && looksAtCamera(p)) rot[1] += Math.max(-1.1, Math.min(1.1, camYawLocal));
  const s = vec(p.scale);
  return {
    pos: rest.map((x, a) => x + d.pos[a]) as V3,
    rot,
    scale: s.map((x, a) => Math.max(1e-4, x * d.scale[a])) as V3,
    opacity: (p.opacity ?? 1) * d.opacity,
  };
};

/** Geometry of a part (centered on its own origin). */
const makeGeometry = (p: CustomPart): THREE.BufferGeometry | null => {
  const s = p.size ?? [];
  const pts = p.points ?? [];
  switch (p.shape) {
    case "box": {
      const [w, h, d] = s.length === 3 ? s : [s[0] ?? 0.5, s[0] ?? 0.5, s[0] ?? 0.5];
      const r = Math.min(p.radius ?? 0, Math.min(w, h, d) / 2 - 0.001);
      return r > 0.002 ? new RoundedBoxGeometry(w, h, d, 4, r) : new THREE.BoxGeometry(w, h, d);
    }
    case "sphere": {
      const g = new THREE.SphereGeometry(1, 40, 28);
      const [rx, ry, rz] = s.length === 3 ? s : [s[0] ?? 0.5, s[0] ?? 0.5, s[0] ?? 0.5];
      g.scale(rx, ry, rz);
      return g;
    }
    case "cylinder": {
      const [rt, rb, h] = s.length === 3 ? s : [s[0] ?? 0.3, s[0] ?? 0.3, s[1] ?? 1];
      return new THREE.CylinderGeometry(rt, rb, h, 36);
    }
    case "cone":
      return new THREE.ConeGeometry(s[0] ?? 0.3, s[1] ?? 1, 36);
    case "torus":
      return new THREE.TorusGeometry(s[0] ?? 0.5, s[1] ?? 0.1, 18, 56, (s[2] ?? 360) * DEG);
    case "capsule":
      return new THREE.CapsuleGeometry(s[0] ?? 0.3, s[1] ?? 0.5, 8, 24);
    case "plane":
      return new THREE.PlaneGeometry(s[0] ?? 1, s[1] ?? 1);
    case "ring":
      return new THREE.RingGeometry(s[0] ?? 0.3, s[1] ?? 0.5, 56);
    case "tube": {
      if (pts.length < 2) return null;
      const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2] ?? 0)));
      return new THREE.TubeGeometry(curve, Math.max(24, pts.length * 12), s[0] ?? 0.05, 12, false);
    }
    case "extrude": {
      if (pts.length < 3) return null;
      const shape = new THREE.Shape(pts.map((q) => new THREE.Vector2(q[0], q[1])));
      const depth = s[0] ?? 0.2;
      const bevel = p.radius ?? 0;
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 16 });
      g.translate(0, 0, -depth / 2);
      return g;
    }
    case "lathe":
      if (pts.length < 2) return null;
      return new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(Math.max(0, q[0]), q[1])), 48);
    default:
      return null;
  }
};

let toonRamp: THREE.DataTexture | null = null;
const FINISH_OF: Record<string, Finish> = { body: "body", accent: "body", dark: "dark", light: "light", metal: "metal", screen: "screen", glow: "glow" };
const DOUBLE = new Set(["plane", "ring"]);

/** Material of a part: the look's own (auto) or a forced finish; `emissive` adds self-glow (flared by a pulse fx). */
const PartMat: React.FC<{ p: CustomPart; color: string; pulse: number }> = ({ p, color, pulse }) => {
  const { look, gradient } = useKit3D();
  const mat = p.material ?? "auto";
  const glow = (p.emissive ?? 0) * (1 + pulse) + (pulse > 0 && !p.emissive ? pulse * 0.8 : 0);
  const side = DOUBLE.has(p.shape) ? THREE.DoubleSide : THREE.FrontSide;
  if (mat === "emissive" || (mat === "auto" && p.role === "glow")) {
    // a touch over 1 on the bloom looks: eyes and LEDs glow without blowing out the face
    const k = (look.bloom ? 1.15 : 1) * (1 + pulse * 0.8);
    return <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(k)} toneMapped={!look.bloom} side={side} />;
  }
  if (mat === "auto" && glow === 0) {
    return <Mat finish={FINISH_OF[p.role ?? "body"] ?? "body"} color={color} />;
  }
  const em = { emissive: new THREE.Color(color), emissiveIntensity: glow };
  switch (mat === "auto" ? (look.material === "toon" ? "toon" : look.material === "clay" ? "clay" : "plastic") : mat) {
    case "matte":
      return <meshStandardMaterial color={color} roughness={0.9} metalness={0} side={side} {...em} />;
    case "metal":
      return <meshStandardMaterial color={mixHex(color, "#FFFFFF", 0.15)} roughness={0.24} metalness={1} envMapIntensity={1.3} side={side} {...em} />;
    case "glass":
      return <meshPhysicalMaterial color={mixHex(color, "#FFFFFF", 0.45)} transmission={0.9} roughness={0.12} thickness={0.6} ior={1.45} attenuationColor={color} attenuationDistance={1.4} clearcoat={1} side={side} {...em} emissiveIntensity={Math.max(0.1, glow)} />;
    case "toon":
      if (!gradient && !toonRamp) toonRamp = makeToonRamp();
      return <meshToonMaterial color={color} gradientMap={gradient ?? toonRamp} side={side} {...em} />;
    case "clay":
      return <meshStandardMaterial color={color} roughness={0.82} metalness={0} envMapIntensity={0.6} side={side} {...em} />;
    case "plastic":
    default:
      return <meshPhysicalMaterial color={color} roughness={0.3} metalness={0} clearcoat={0.7} clearcoatRoughness={0.2} side={side} {...em} />;
  }
};

const PartMesh: React.FC<{ p: CustomPart; color: string; pulse: number }> = ({ p, color, pulse }) => {
  const { look } = useKit3D();
  const key = JSON.stringify([p.shape, p.size, p.points, p.radius]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => makeGeometry(p), [key]);
  if (!geo) return null;
  const emissive = p.material === "emissive" || p.role === "glow";
  return (
    <mesh geometry={geo} castShadow={look.shadows && !emissive} receiveShadow={look.shadows}>
      <PartMat p={p} color={color} pulse={pulse} />
      {look.outline && !emissive && p.shape !== "group" ? <Outlines thickness={0.022} color={look.outline} /> : null}
    </mesh>
  );
};

/**
 * Apply node opacities to every mesh below `root`: each node's userData.op multiplies down the tree; materials keep
 * their own base opacity / transparency (stored on first touch).
 */
export const applyOpacity = (root: THREE.Object3D | null, rootOp = 1) => {
  if (!root) return;
  const walk = (n: THREE.Object3D, op: number) => {
    const o = op * (typeof n.userData.op === "number" ? n.userData.op : 1);
    const m = (n as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (m) {
      for (const mat of Array.isArray(m) ? m : [m]) {
        if (mat.userData.baseOp === undefined) mat.userData.baseOp = { opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite };
        const b = mat.userData.baseOp;
        const want = b.opacity * o;
        const tr = b.transparent || o < 0.999;
        if (mat.opacity !== want || mat.transparent !== tr) {
          mat.opacity = want;
          if (mat.transparent !== tr) mat.needsUpdate = true;
          mat.transparent = tr;
          mat.depthWrite = o < 0.999 ? false : b.depthWrite;
        }
      }
    }
    for (const c of n.children) walk(c, o);
  };
  walk(root, rootOp);
};

/** A custom model at the origin (the parent group places, scales and turns it). */
export const CustomModel: React.FC<{ o: CustomObject; color: string; accent: string; t: number; ctx: MotionCtx; camYawLocal: number | null; pulses: Pulse[] }> = ({ o, color, accent, t, ctx, camYawLocal, pulses }) => {
  const { look, palette } = useKit3D();
  const parts = o.parts ?? [];
  const centers = useMemo(() => partCenters(parts) as V3[], [parts]);
  const children = useMemo(() => {
    const m = new Map<string | undefined, number[]>();
    const ids = new Set(parts.map((p) => p.id));
    parts.forEach((p, i) => {
      const k = p.parent !== undefined && ids.has(p.parent) ? p.parent : undefined;
      m.set(k, [...(m.get(k) ?? []), i]);
    });
    return m;
  }, [parts]);
  const colorOf = (p: CustomPart) => {
    const role = p.role ?? "body";
    const fallback = role === "accent" || role === "glow" ? accent : role === "dark" ? look.dark : role === "light" ? look.light : role === "screen" ? look.screen : role === "metal" ? "#CDD1DA" : color;
    return color3d(palette, look, p.color, fallback);
  };
  const pulseOf = (id: string) => pulses.reduce((a, q) => (q.part === null || q.part === id ? Math.max(a, q.k) : a), 0);
  const seen = new Set<number>();
  const node = (i: number): React.ReactNode => {
    if (seen.has(i)) return null; // defensive: cycles are rejected by the schema
    seen.add(i);
    const p = parts[i];
    const tr = partTransform(o, i, t, ctx, centers, camYawLocal);
    const pv = p.pivot ?? [0, 0, 0];
    return (
      <group key={p.id} position={[tr.pos[0] + pv[0], tr.pos[1] + pv[1], tr.pos[2] + pv[2]]} rotation={tr.rot} scale={tr.scale} userData={{ op: tr.opacity }}>
        <group position={[-pv[0], -pv[1], -pv[2]]}>
          {p.shape === "group" ? null : <PartMesh p={p} color={colorOf(p)} pulse={pulseOf(p.id)} />}
          {(children.get(p.id) ?? []).map(node)}
        </group>
      </group>
    );
  };
  return <group>{(children.get(undefined) ?? []).map(node)}</group>;
};

/** World matrix of a part (object matrix x the chain of part transforms) at time t: trails and fx anchor on it. */
export const partWorldMatrix = (o: CustomObject, partId: string, t: number, ctx: MotionCtx, objectMatrix: THREE.Matrix4, camYawLocal: number | null = null): THREE.Matrix4 | null => {
  const parts = o.parts ?? [];
  const idx = new Map(parts.map((p, i) => [p.id, i]));
  if (!idx.has(partId)) return null;
  const centers = partCenters(parts) as V3[];
  const chain: number[] = [];
  let cur: number | undefined = idx.get(partId);
  while (cur !== undefined && chain.length <= parts.length) {
    chain.unshift(cur);
    const par = parts[cur].parent;
    cur = par !== undefined ? idx.get(par) : undefined;
  }
  const m = objectMatrix.clone();
  const tmp = new THREE.Matrix4();
  for (const i of chain) {
    const tr = partTransform(o, i, t, ctx, centers, camYawLocal);
    const pv = parts[i].pivot ?? [0, 0, 0];
    tmp.compose(new THREE.Vector3(tr.pos[0] + pv[0], tr.pos[1] + pv[1], tr.pos[2] + pv[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(...tr.rot)), new THREE.Vector3(...tr.scale));
    m.multiply(tmp);
    m.multiply(tmp.makeTranslation(-pv[0], -pv[1], -pv[2]));
  }
  return m;
};

/** Hook: keep a group's mesh opacities in sync with its node opacities after every render. */
export const useOpacity = (ref: React.RefObject<THREE.Group | null>, op: number) => {
  useLayoutEffect(() => {
    applyOpacity(ref.current, op);
  });
};
