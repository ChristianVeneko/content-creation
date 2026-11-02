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
import { CustomModel, useOpacity, type CustomObject, type CustomPart, type MotionCtx } from "./custom";

type V3 = [number, number, number];

/** Backdrop stops for a flat `world.backdrop` color (a faint light-to-dark gradient keeps the depth fog readable). */
export const backdropStops = (c: string): string[] => [mixHexColor(c, "#FFFFFF", 0.08), c, mixHexColor(c, "#000000", 0.28)];

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

/** Instanced crowd silhouettes: capsule bodies + sphere heads on rising tiers, with a small deterministic sway. */
const Crowd: React.FC<{ crowd: NonNullable<World3D["crowd"]>; t: number; seed: number }> = ({ crowd, t, seed }) => {
  const { look, palette } = useKit3D();
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const n = crowd.count;
  const [w, d] = crowd.area;
  const c = crowd.pos ?? ([0, 0, -6] as V3);
  const hgt = crowd.height ?? 1.1;
  const color = color3d(palette, look, crowd.color, mixHexColor(palette.bg[0], "#000000", 0.7));
  const people = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const x = c[0] + (random(`cx${seed}-${i}`) - 0.5) * w;
        const z = c[2] + (random(`cz${seed}-${i}`) - 0.5) * d;
        return { x, z, y: c[1] + (c[2] + d / 2 - z) * 0.18, s: hgt * (0.85 + 0.3 * random(`ch${seed}-${i}`)), ph: random(`cp${seed}-${i}`) * 6.28 };
      }),
    [n, w, d, c[0], c[1], c[2], hgt, seed],
  );
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    people.forEach((p, i) => {
      const bob = Math.max(0, Math.sin(t * 3.2 + p.ph)) * 0.05 * p.s;
      body.current?.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y + bob + p.s * 0.36, p.z), q, new THREE.Vector3(p.s, p.s, p.s)));
      head.current?.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y + bob + p.s * 0.86, p.z), q, new THREE.Vector3(p.s, p.s, p.s)));
    });
    for (const r of [body, head]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, n]} frustumCulled={false}>
        <capsuleGeometry args={[0.2, 0.34, 4, 10]} />
        <meshBasicMaterial color={color} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshBasicMaterial color={color} />
      </instancedMesh>
    </>
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

export const WorldView: React.FC<{ world: World3D; t: number; sec: MotionCtx["sec"]; seed: number }> = ({ world, t, sec, seed }) => (
  <>
    {world.parts.length ? <WorldParts parts={world.parts as unknown as CustomPart[]} t={t} ctx={{ sec, enter: 0, seed: seed * 31 + 977 }} /> : null}
    {world.crowd ? <Crowd crowd={world.crowd} t={t} seed={seed} /> : null}
  </>
);
