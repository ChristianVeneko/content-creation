// The set an agent builds from scratch for one scene (`visual.world`, lib/scene3d-motion.mjs worldSchema): a ground,
// a flat backdrop color, props / walls / signs made of primitive parts (the same renderer as custom objects) and an
// instanced crowd. Everything is a pure function of `t`; colors come from the palette roles unless the spec sets them.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { random } from "remotion";
import type { World3D } from "../types";
import { useKit3D } from "./kit";
import { color3d, mixHexColor } from "./looks";
import { CustomModel, makeGeometry, useOpacity, type CustomObject, type CustomPart, type MotionCtx } from "./custom";
import { Mat, type Finish } from "./kit";

type V3 = [number, number, number];

/** Backdrop stops for a flat `world.backdrop` color (a faint light-to-dark gradient keeps the depth fog readable). */
export const backdropStops = (c: string): string[] => [mixHexColor(c, "#FFFFFF", 0.08), c, mixHexColor(c, "#000000", 0.28)];

/** Daylight sky ramp: the palette sky on top, easing into a pale, warm-tinted haze (never darker than the sky) at the horizon. */
export const skyStops = (sky: string, backdrop: string): string[] => [sky, mixHexColor(sky, "#FFFFFF", 0.45), mixHexColor(mixHexColor(sky, backdrop, 0.35), "#FFFFFF", 0.7)];

/** The ground the world asks for (null = keep the look's own floor). */
export const WorldGround: React.FC<{ ground: NonNullable<World3D["ground"]>; center: [number, number]; half: [number, number] }> = ({ ground, center, half }) => {
  const { look, palette } = useKit3D();
  const base = look.ground ? look.ground(palette) : mixHexColor(palette.bg[1] ?? palette.bg[0], "#000000", 0.3);
  // like the backdrop, an explicit ground color is blended toward the palette background so text stays readable over it
  const color = ground.color ? mixHexColor(color3d(palette, look, ground.color, base), palette.bg[0], 0.4) : base;
  const size = ground.size ?? 60;
  const kind = ground.kind ?? "plane";
  switch (kind) {
    case "none":
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.01, center[1]]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial opacity={0.28} color="#000000" />
        </mesh>
      );
    case "disc": {
      const r = (ground.size ?? Math.max(half[0], half[1]) * 2 + 4) / 2;
      return (
        <mesh position={[center[0], -0.1, center[1]]} receiveShadow castShadow>
          <cylinderGeometry args={[r, r * 1.02, 0.2, 72]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      );
    }
    case "grid":
      return (
        <group position={[center[0], 0, center[1]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <gridHelper args={[size, Math.round(size / 1.2), palette.accent, mixHexColor(palette.accent, "#000000", 0.55)]} position={[0, 0.004, 0]} material-transparent material-opacity={0.5} />
        </group>
      );
    case "mirror":
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.01, center[1]]} receiveShadow>
          <planeGeometry args={[size, size]} />
          <MeshReflectorMaterial resolution={512} mirror={0.6} blur={[260, 80]} mixBlur={1} mixStrength={1.8} roughness={0.8} depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.3} color={color} metalness={0.5} />
        </mesh>
      );
    default:
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.01, center[1]]} receiveShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      );
  }
};

/**
 * Instanced crowd: heads and shoulders on stepped risers (never floating), a share of the people with raised arms that
 * sway, a faint rim light in the palette's accent2 (a slightly larger back-face shell) and a few phone-light specks.
 * Lit by the scene's lights and spotlights; 7 instanced meshes however large the crowd.
 */
const Crowd: React.FC<{ crowd: NonNullable<World3D["crowd"]>; t: number; seed: number }> = ({ crowd, t, seed }) => {
  const { look, palette } = useKit3D();
  const refs = {
    riser: useRef<THREE.InstancedMesh>(null),
    shoulder: useRef<THREE.InstancedMesh>(null),
    head: useRef<THREE.InstancedMesh>(null),
    arm: useRef<THREE.InstancedMesh>(null),
    phone: useRef<THREE.InstancedMesh>(null),
    rimS: useRef<THREE.InstancedMesh>(null),
    rimH: useRef<THREE.InstancedMesh>(null),
  };
  const n = crowd.count;
  const [w, d] = crowd.area;
  const c = crowd.pos ?? ([0, 0, -6] as V3);
  const hgt = crowd.height ?? 1.1;
  const rows = Math.max(1, Math.min(8, Math.round(d / 0.9)));
  const perRow = Math.ceil(n / rows);
  const tier = 0.34;
  const body = color3d(palette, look, crowd.color, mixHexColor(palette.bg[1] ?? palette.bg[0], "#000000", 0.5));
  const rim = palette.accent2 ?? palette.accent;
  const people = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const r = (k: string) => random(`${k}${seed}-${i}`);
        return {
          x: c[0] + ((col + 0.5) / perRow - 0.5) * w + (r("jx") - 0.5) * (w / perRow) * 0.6,
          z: c[2] + d / 2 - (row + 0.5) * (d / rows) + (r("jz") - 0.5) * 0.2,
          y: c[1] + (row + 1) * tier,
          s: hgt * (0.85 + 0.3 * r("s")),
          ph: r("p") * 6.28,
          up: r("u") > 0.55,
          phone: r("ph") > 0.7,
        };
      }),
    [n, w, d, c[0], c[1], c[2], hgt, seed, rows, perRow],
  );
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const put = (ref: React.RefObject<THREE.InstancedMesh | null>, i: number, pos: V3, sc: V3, rz = 0) => {
      q.setFromEuler(e.set(0, 0, rz));
      ref.current?.setMatrixAt(i, m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...sc)));
    };
    for (let k = 0; k < rows; k++) {
      const h = (k + 1) * tier;
      put(refs.riser, k, [c[0], c[1] + h / 2, c[2] + d / 2 - (k + 0.5) * (d / rows)], [w + 1, h, (d / rows) * 0.96]);
    }
    for (let k = rows; k < n; k++) refs.riser.current?.setMatrixAt(k, hide);
    people.forEach((p, i) => {
      const bob = Math.max(0, Math.sin(t * 3.2 + p.ph)) * 0.05 * p.s;
      const sy = p.y + bob;
      const shoulder: V3 = [p.x, sy + p.s * 0.5, p.z];
      const head: V3 = [p.x, sy + p.s * 0.86, p.z];
      put(refs.shoulder, i, shoulder, [0.3 * p.s, 0.22 * p.s, 0.17 * p.s]);
      put(refs.head, i, head, [0.16 * p.s, 0.18 * p.s, 0.16 * p.s]);
      put(refs.rimS, i, shoulder, [0.3 * p.s * 1.14, 0.22 * p.s * 1.14, 0.17 * p.s * 1.14]);
      put(refs.rimH, i, head, [0.16 * p.s * 1.18, 0.18 * p.s * 1.18, 0.16 * p.s * 1.18]);
      for (const side of [0, 1]) {
        const idx = i * 2 + side;
        if (!p.up) {
          refs.arm.current?.setMatrixAt(idx, hide);
          continue;
        }
        // arms up and out, swaying with the beat
        const sgn = side ? 1 : -1;
        const rot = sgn * -(0.35 + 0.28 * Math.sin(t * 4 + p.ph + side));
        const base: V3 = [shoulder[0] + sgn * 0.2 * p.s, shoulder[1] + 0.04 * p.s, shoulder[2]];
        put(refs.arm, idx, [base[0] - Math.sin(rot) * 0.24 * p.s, base[1] + Math.cos(rot) * 0.24 * p.s, base[2]], [p.s, p.s, p.s], rot);
      }
      if (p.up && p.phone) {
        const rot = 1 * -(0.35 + 0.28 * Math.sin(t * 4 + p.ph + 1));
        put(refs.phone, i, [shoulder[0] + 0.2 * p.s - Math.sin(rot) * 0.5 * p.s, shoulder[1] + 0.04 * p.s + Math.cos(rot) * 0.5 * p.s, shoulder[2] + 0.02], [p.s, p.s, p.s]);
      } else refs.phone.current?.setMatrixAt(i, hide);
    });
    for (const r of Object.values(refs)) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={refs.riser} args={[undefined, undefined, Math.max(rows, 1)]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={mixHexColor(body, "#000000", 0.35)} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={refs.shoulder} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color={body} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={refs.head} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color={body} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={refs.arm} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <capsuleGeometry args={[0.05, 0.4, 3, 6]} />
        <meshStandardMaterial color={body} roughness={0.95} />
      </instancedMesh>
      {/* the rim light: a slightly larger back-face shell in accent2 reads as a lit edge behind each silhouette */}
      <instancedMesh ref={refs.rimS} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={rim} side={THREE.BackSide} transparent opacity={0.32} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={refs.rimH} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={rim} side={THREE.BackSide} transparent opacity={0.32} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={refs.phone} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color={new THREE.Color("#EAF6FF").multiplyScalar(2)} toneMapped={false} />
      </instancedMesh>
    </>
  );
};



const DEGR = Math.PI / 180;
const FINISH: Record<string, Finish> = { body: "body", accent: "body", dark: "dark", light: "light", metal: "metal", screen: "screen", glow: "glow" };

/** Instanced draw of the world parts flagged `inst` (scatter copies, repeat copies of big worlds): one InstancedMesh per geometry + color. */
const InstancedParts: React.FC<{ parts: CustomPart[]; heightAt?: ((x: number, z: number) => number) | null; t?: number }> = ({ parts, heightAt = null, t = 0 }) => {
  const { look, palette } = useKit3D();
  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  // static world matrix of every part (its mesh sits one pivot back inside its own node, as in CustomModel)
  const built = useMemo(() => {
    const memo = new Map<string, THREE.Matrix4>();
    const outer = (p: CustomPart): THREE.Matrix4 => {
      const hit = memo.get(p.id);
      if (hit) return hit;
      const pv = p.pivot ?? [0, 0, 0];
      const pos = p.pos ?? [0, 0, 0];
      const rot = p.rot ?? [0, 0, 0];
      const sc = Array.isArray(p.scale) ? p.scale : [p.scale ?? 1, p.scale ?? 1, p.scale ?? 1];
      const local = new THREE.Matrix4().compose(new THREE.Vector3(pos[0] + pv[0], pos[1] + pv[1], pos[2] + pv[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * DEGR, rot[1] * DEGR, rot[2] * DEGR)), new THREE.Vector3(sc[0], sc[1], sc[2]));
      const par = p.parent !== undefined ? byId.get(p.parent) : undefined;
      const m = par ? outer(par).clone().multiply(new THREE.Matrix4().makeTranslation(-(par.pivot?.[0] ?? 0), -(par.pivot?.[1] ?? 0), -(par.pivot?.[2] ?? 0))).multiply(local) : local;
      memo.set(p.id, m);
      return m;
    };
    const rootOf = (p: CustomPart): CustomPart => {
      let q = p;
      for (let k = 0; k < 8 && q.parent !== undefined && byId.has(q.parent); k++) q = byId.get(q.parent)!;
      return q;
    };
    const groups = new Map<string, { part: CustomPart; color: string; items: { m: THREE.Matrix4; root: THREE.Vector3 }[] }>();
    for (const p of parts) {
      if (p.shape === "group" || p.shape === "sign") continue;
      const role = p.role ?? "body";
      const fallback = role === "accent" || role === "glow" ? (palette.accent3 ?? palette.accent) : role === "dark" ? look.dark : role === "light" ? look.light : role === "screen" ? look.screen : role === "metal" ? "#CDD1DA" : (palette.accent2 ?? palette.accent);
      const color = color3d(palette, look, p.color, fallback);
      const pv = p.pivot ?? [0, 0, 0];
      const m = outer(p).clone().multiply(new THREE.Matrix4().makeTranslation(-pv[0], -pv[1], -pv[2]));
      const r = rootOf(p);
      const key = JSON.stringify([p.shape, p.size, p.points, p.radius, p.facets, p.material, role === "glow" ? "glow" : role, color]);
      const g = groups.get(key) ?? { part: p, color, items: [] };
      g.items.push({ m, root: new THREE.Vector3().setFromMatrixPosition(outer(r)) });
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [parts, look, palette]);
  return (
    <>
      {built.map((g, k) => (
        <InstGroup key={k} g={g} heightAt={heightAt} t={t} />
      ))}
    </>
  );
};

const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
const InstGroup: React.FC<{ g: { part: CustomPart; color: string; items: { m: THREE.Matrix4; root: THREE.Vector3 }[] }; heightAt: ((x: number, z: number) => number) | null; t: number }> = ({ g, heightAt, t }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { look } = useKit3D();
  const key = JSON.stringify([g.part.shape, g.part.size, g.part.points, g.part.radius]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => makeGeometry(g.part, true), [key]);
  const glow = g.part.material === "emissive" || g.part.role === "glow";
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const tmp = new THREE.Matrix4();
    // a `wobble` motion on the template part rocks every copy about its base with a wave that travels across the field (wind)
    const wob = (g.part.motion ?? []).find((m) => m === "wobble" || (typeof m === "object" && m.type === "wobble")) as { amp?: number; speed?: number } | "wobble" | undefined;
    const amp = wob ? ((typeof wob === "object" ? wob.amp : undefined) ?? 6) : 0;
    const spd = wob && typeof wob === "object" ? (wob.speed ?? 1) : 1;
    const sway = new THREE.Matrix4();
    const eul = new THREE.Euler();
    g.items.forEach((it, i) => {
      if (amp) {
        const a = Math.sin(t * spd * 1.6 + it.root.x * 0.5 + it.root.z * 0.3) * amp * 0.9 + Math.sin(t * spd * 3.1 + it.root.z * 1.3) * amp * 0.25;
        eul.set((a * 0.45 * Math.PI) / 180, 0, (a * Math.PI) / 180);
        sway.makeRotationFromEuler(eul);
        const base = new THREE.Matrix4().makeTranslation(it.root.x, 0, it.root.z);
        const mm = base.clone().multiply(sway).multiply(new THREE.Matrix4().makeTranslation(-it.root.x, 0, -it.root.z)).multiply(it.m);
        if (!heightAt) return mesh.setMatrixAt(i, mm);
        const hh = heightAt(it.root.x, it.root.z);
        if (hh < -0.08) return mesh.setMatrixAt(i, HIDE);
        return mesh.setMatrixAt(i, tmp.makeTranslation(0, hh, 0).multiply(mm));
      }
      if (!heightAt) return mesh.setMatrixAt(i, it.m);
      // scattered copies follow the terrain: they ride its height and vanish where it has been dug away
      const h = heightAt(it.root.x, it.root.z);
      if (h < -0.08) return mesh.setMatrixAt(i, HIDE);
      mesh.setMatrixAt(i, tmp.makeTranslation(0, h, 0).multiply(it.m));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (!geo) return null;
  return (
    <instancedMesh ref={ref} args={[geo, undefined, g.items.length]} frustumCulled={false} castShadow={look.shadows && !glow && g.items.length < 400} receiveShadow={look.shadows}>
      {glow ? <meshBasicMaterial color={g.color} /> : <Mat finish={FINISH[g.part.role ?? "body"] ?? "body"} color={g.color} />}
    </instancedMesh>
  );
};

/** Parts of the world (props, walls, signs): one custom model at the origin, nodes already expanded by `repeat`. */
const WorldParts: React.FC<{ parts: CustomPart[]; t: number; ctx: MotionCtx }> = ({ parts, t, ctx }) => {
  const { palette } = useKit3D();
  const ref = useRef<THREE.Group>(null);
  useOpacity(ref, 1);
  const o = useMemo<CustomObject>(() => ({ kind: "custom", id: "world", parts }), [parts]);
  return (
    <group ref={ref}>
      <CustomModel o={o} color={palette.accent2 ?? palette.accent} accent={palette.accent3 ?? palette.accent} t={t} ctx={ctx} camYawLocal={null} pulses={[]} />
    </group>
  );
};

export const WorldView: React.FC<{ world: World3D; t: number; sec: MotionCtx["sec"]; seed: number; heightAt?: ((x: number, z: number) => number) | null }> = ({ world, t, sec, seed, heightAt = null }) => {
  // classic parts keep one mesh each (motion, keys, signs); parts flagged `inst` (scatter and big repeats) are instanced
  const all = world.parts as unknown as (CustomPart & { inst?: boolean })[];
  const plain = useMemo(() => all.filter((p) => !p.inst), [all]);
  const inst = useMemo(() => all.filter((p) => p.inst), [all]);
  return (
  <>
    {plain.length ? <WorldParts parts={plain} t={t} ctx={{ sec, enter: 0, seed: seed * 31 + 977 }} /> : null}
    {inst.length ? <InstancedParts parts={inst} heightAt={heightAt} t={t} /> : null}
    {world.crowd ? <Crowd crowd={world.crowd} t={t} seed={seed} /> : null}
  </>
  );
};
