// Environment sets of the low-poly 3D looks: the world the camera is inside (road, desk, room, grid, stage, city,
// voxel island), built from simple parts with plain standard materials and no lights of their own (the look's
// hemisphere + key light everything). Objects stand in the clear middle of the set. Every prop position comes from a
// seeded hash (no Math.random), textures are generated from data once, and motion (traffic) is a pure function of t.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox, useGLTF } from "@react-three/drei";
import { staticFile } from "remotion";
import { mixHex, useKit3D } from "./kit";

type V2 = [number, number];
type V3 = [number, number, number];
export type SetProps = { center: V2; half: V2; models: Record<string, string>; t: number };

// ---------------- deterministic noise + data textures ----------------

/** Integer hash -> [0, 1). */
export const hash = (x: number, y: number, seed = 0): number => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** Smooth value noise in [0, 1). */
const vnoise = (x: number, y: number, seed = 0): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
};
const fbm = (x: number, y: number, seed = 0) => vnoise(x, y, seed) * 0.6 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.1;

const texCache = new Map<string, THREE.DataTexture>();
const dataTexture = (key: string, w: number, h: number, fill: (x: number, y: number) => [number, number, number, number], srgb: boolean, repeat: V2 = [1, 1]): THREE.DataTexture => {
  const hit = texCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = fill(x, y);
      const k = (y * w + x) * 4;
      for (let i = 0; i < 4; i++) data[k + i] = Math.max(0, Math.min(255, Math.round(c[i] * 255)));
    }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  texCache.set(key, tex);
  return tex;
};
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
};
const mix3 = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/** Planked wood (planks along x): per-plank tone, wavy grain, dark seams. */
const woodTexture = (light: string, dark: string, repeat: V2) =>
  dataTexture(
    `wood-${light}-${dark}-${repeat}`,
    512,
    512,
    (x, y) => {
      const plank = Math.floor(y / 64);
      const offset = hash(plank, 0, 3) * 512;
      const u = (x + offset) / 512;
      const v = (y % 64) / 64;
      const grain = 0.5 + 0.5 * Math.sin((v * 9 + fbm(u * 3, v * 2 + plank, 5) * 6) * Math.PI);
      const tone = 0.35 + hash(plank, 1, 9) * 0.4 + (grain - 0.5) * 0.35 + (fbm(u * 18, v * 3, 2) - 0.5) * 0.2;
      const seam = v < 0.03 || ((x + Math.floor(hash(plank, 2, 4) * 512)) % 512) < 2 ? 0.55 : 1;
      const c = mix3(rgb(dark), rgb(light), Math.max(0, Math.min(1, tone))).map((k) => k * seam);
      return [c[0], c[1], c[2], 1];
    },
    true,
    repeat,
  );

/** Grid lines on black (emissive map): a 1-cell tile with lines on two edges. */
const gridTexture = () =>
  dataTexture(
    "grid",
    128,
    128,
    (x, y) => {
      const d = Math.min(x, y, 127 - x, 127 - y);
      const line = d < 1.5 ? 1 : d < 3 ? 0.35 : 0;
      return [line, line, line, 1];
    },
    false,
  );

/** Brick courses (emissive mortar lines). */
const brickTexture = () =>
  dataTexture(
    "brick",
    256,
    128,
    (x, y) => {
      const row = Math.floor(y / 32);
      const bx = (x + (row % 2) * 64) % 128;
      const line = y % 32 < 2 || bx < 2 ? 1 : 0;
      return [line, line, line, 1];
    },
    false,
  );

/** Soft round falloff (alpha) for light pools and glows. */
export const radialTexture = () =>
  dataTexture(
    "radial",
    128,
    128,
    (x, y) => {
      const d = Math.hypot(x - 63.5, y - 63.5) / 63.5;
      const a = Math.max(0, 1 - d) ** 2;
      return [1, 1, 1, a];
    },
    false,
  );

/** Asphalt albedo with fine aggregate. */
const asphaltTexture = () =>
  dataTexture(
    "asphalt",
    256,
    256,
    (x, y) => {
      const n = 0.85 + (hash(x, y, 31) - 0.5) * 0.25 + (fbm(x / 24, y / 24, 8) - 0.5) * 0.25;
      const c = rgb("#3C425A").map((k) => k * n);
      return [c[0], c[1], c[2], 1];
    },
    true,
  );

/** Concrete tiles for plazas and sidewalks. */
const tileTexture = (base: string) =>
  dataTexture(
    `tiles-${base}`,
    256,
    256,
    (x, y) => {
      const seam = x % 128 < 2 || y % 128 < 2 ? 0.72 : 1;
      const n = 0.92 + (fbm(x / 20, y / 20, 12) - 0.5) * 0.18 + (hash(Math.floor(x / 128), Math.floor(y / 128), 6) - 0.5) * 0.08;
      const c = rgb(base).map((k) => k * n * seam);
      return [c[0], c[1], c[2], 1];
    },
    true,
  );

/** A window's light on a wall: soft rectangle with mullions (alpha). */
const windowTexture = () =>
  dataTexture(
    "window",
    128,
    128,
    (x, y) => {
      const u = x / 127;
      const v = y / 127;
      const edge = Math.min(u, v, 1 - u, 1 - v);
      const soft = Math.min(1, Math.max(0, (edge - 0.02) / 0.12));
      const mullion = Math.abs(u - 0.5) < 0.025 || Math.abs(v - 0.55) < 0.025 ? 0.15 : 1;
      return [1, 1, 1, soft * mullion];
    },
    false,
  );

// ---------------- GLB props ----------------

/** Normalized clone of a set prop: scaled to a height (h) or a horizontal length (len), standing on y = 0. */
const PropModel: React.FC<{ url: string; h?: number; len?: number; position: V3; rotY?: number; shadows?: boolean }> = ({ url, h, len, position, rotY = 0, shadows = true }) => {
  const gltf = useGLTF(url, false, false);
  const obj = useMemo(() => {
    const root = gltf.scene.clone(true);
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    const s = h ? h / Math.max(size.y, 1e-6) : (len ?? 1) / Math.max(size.x, size.z, 1e-6);
    root.scale.setScalar(s);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    root.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = shadows;
      m.receiveShadow = true;
    });
    const g = new THREE.Group();
    g.add(root);
    return g;
  }, [gltf, h, len, shadows]);
  return <primitive object={obj} position={position} rotation={[0, rotY, 0]} />;
};

/** A prop by model id; nothing when the model was not staged (Studio previews light without assets). */
const Prop: React.FC<{ id: string; models: Record<string, string>; h?: number; len?: number; position: V3; rotY?: number; shadows?: boolean }> = ({ id, models, ...rest }) =>
  models[id] ? <PropModel url={staticFile(models[id])} {...rest} /> : null;

/** Instanced unit boxes from a list of [position, scale, color]. */
const Boxes: React.FC<{ items: { p: V3; s: V3; c?: string }[]; color?: string; roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number; shadows?: boolean; flat?: boolean }> = ({
  items,
  color = "#FFFFFF",
  roughness = 0.8,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  shadows = true,
  flat = false,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      mat.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...it.s));
      m.setMatrixAt(i, mat);
      if (it.c) m.setColorAt(i, col.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, items.length]} castShadow={shadows} receiveShadow frustumCulled={false}>
      <meshStandardMaterial color={items[0]?.c ? "#FFFFFF" : color} roughness={roughness} metalness={metalness} emissive={emissive ?? "#000000"} emissiveIntensity={emissiveIntensity} flatShading={flat} />
    </instancedMesh>
  );
};

/** A flat additive glow decal (light pool on the ground, lamp glare). */
const Glow: React.FC<{ position: V3; size: V2; color: string; opacity: number; rotation?: V3 }> = ({ position, size, color, opacity, rotation = [-Math.PI / 2, 0, 0] }) => (
  <mesh position={position} rotation={rotation} renderOrder={2}>
    <planeGeometry args={size} />
    <meshBasicMaterial map={radialTexture()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </mesh>
);

// ---------------- road (highway at night) ----------------

const RoadLamp: React.FC<{ x: number; z: number; side: 1 | -1 }> = ({ x, z, side }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 2.8, 0]} castShadow>
      <cylinderGeometry args={[0.09, 0.13, 5.6, 12]} />
      <meshStandardMaterial color="#3A3F4E" roughness={0.5} metalness={0.7} />
    </mesh>
    <mesh position={[-side * 0.8, 5.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.06, 0.06, 1.7, 10]} />
      <meshStandardMaterial color="#3A3F4E" roughness={0.5} metalness={0.7} />
    </mesh>
    <mesh position={[-side * 1.6, 5.45, 0]}>
      <boxGeometry args={[0.7, 0.16, 0.36]} />
      <meshStandardMaterial color="#2A2E3A" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[-side * 1.6, 5.36, 0]}>
      <boxGeometry args={[0.6, 0.03, 0.28]} />
      <meshBasicMaterial color={new THREE.Color("#FFD9A0").multiplyScalar(4)} toneMapped={false} />
    </mesh>
    <Glow position={[-side * 1.6, 5.3, 0]} size={[1.6, 1.6]} color="#FFB867" opacity={0.5} rotation={[0, 0, 0]} />
  </group>
);

const Road: React.FC<SetProps> = ({ center, models, t }) => {
  const [cx, cz] = center;
  const L = 240;
  const zMid = cz - 80;
  const dashes = useMemo(() => {
    const out: { p: V3; s: V3 }[] = [];
    for (let z = cz + 40; z > cz - 200; z -= 7) for (const x of [-1.5, 1.5]) out.push({ p: [cx + x, 0.004, z], s: [0.14, 0.01, 2.8] });
    return out;
  }, [cx, cz]);
  const posts = useMemo(() => {
    const out: { p: V3; s: V3 }[] = [];
    for (let z = cz + 40; z > cz - 200; z -= 3.2) for (const x of [-5.3, 5.3]) out.push({ p: [cx + x, 0.36, z], s: [0.14, 0.72, 0.14] });
    return out;
  }, [cx, cz]);
  const lamps = useMemo(() => {
    const out: { x: number; z: number; side: 1 | -1 }[] = [];
    for (let k = 0; k < 9; k++) out.push({ x: cx + (k % 2 ? 6.1 : -6.1), z: cz + 8 - k * 15, side: k % 2 ? 1 : -1 });
    return out;
  }, [cx, cz]);
  const skyline = useMemo(
    () =>
      Array.from({ length: 14 }, (_, k) => {
        const side = k % 2 ? 1 : -1;
        return { x: cx + side * (16 + hash(k, 1, 40) * 22), z: cz - 50 - k * 11 - hash(k, 2, 40) * 6, h: 10 + hash(k, 3, 40) * 22, rot: hash(k, 4, 40) * Math.PI };
      }),
    [cx, cz],
  );
  // traffic ahead drives away from the camera: z is a pure function of t
  const traffic = [
    { id: "car-sedan", x: -3, z0: cz - 24, v: 5.5 },
    { id: "car-suv", x: 3, z0: cz - 42, v: 3.5 },
    { id: "car-taxi", x: 0, z0: cz - 68, v: 7 },
  ];
  const asphalt = useMemo(() => {
    const tex = asphaltTexture().clone();
    tex.repeat.set(4, 100);
    tex.needsUpdate = true;
    return tex;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, zMid]} receiveShadow>
        <planeGeometry args={[9.6, L]} />
        <meshStandardMaterial map={asphalt} color="#FFFFFF" roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.03, zMid]} receiveShadow>
        <planeGeometry args={[220, L + 40]} />
        <meshStandardMaterial color="#141A33" roughness={0.95} />
      </mesh>
      {/* concrete shoulders */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[cx + s * 6.4, -0.02, zMid]} receiveShadow>
          <planeGeometry args={[3.2, L]} />
          <meshStandardMaterial color="#30364A" roughness={0.85} />
        </mesh>
      ))}
      <Boxes items={dashes} color="#E9E6D8" roughness={0.5} emissive="#E9E6D8" emissiveIntensity={0.12} shadows={false} />
      {[-4.45, 4.45].map((x) => (
        <mesh key={x} position={[cx + x, 0.004, zMid]} receiveShadow>
          <boxGeometry args={[0.16, 0.01, L]} />
          <meshStandardMaterial color="#E9E6D8" roughness={0.5} emissive="#E9E6D8" emissiveIntensity={0.12} />
        </mesh>
      ))}
      {/* guard rails */}
      <Boxes items={posts} color="#596075" roughness={0.45} metalness={0.7} />
      {[-5.3, 5.3].map((x) => (
        <mesh key={x} position={[cx + x - Math.sign(x) * 0.08, 0.6, zMid]} castShadow receiveShadow>
          <boxGeometry args={[0.07, 0.3, L]} />
          <meshStandardMaterial color="#A3AABB" roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
      {lamps.map((l, k) => (
        <React.Fragment key={k}>
          <RoadLamp {...l} />
          <Glow position={[l.x - l.side * 2.4, 0.012, l.z]} size={[6, 7]} color="#FFAE5C" opacity={0.3} />
        </React.Fragment>
      ))}
      {traffic.map((c, k) => {
        const z = c.z0 - t * c.v;
        return (
          <group key={k} position={[cx + c.x, 0, z]}>
            <Prop id={c.id} models={models} len={2.3} position={[0, 0, 0]} rotY={Math.PI} />
            {[-0.38, 0.38].map((dx) => (
              <Glow key={dx} position={[dx, 0.55, 1.2]} size={[0.6, 0.4]} color="#FF2A3A" opacity={0.9} rotation={[0, 0, 0]} />
            ))}
          </group>
        );
      })}
      <Prop id="sign-highway" models={models} h={4.6} position={[cx + 7.2, 0, cz - 18]} rotY={-Math.PI / 2} />
      {skyline.map((b, k) => (
        <Prop key={k} id="city-low-detail-building-a" models={models} h={b.h} position={[b.x, 0, b.z]} rotY={b.rot} shadows={false} />
      ))}
    </group>
  );
};

// ---------------- desk (warm studio tabletop) ----------------

const Desk: React.FC<SetProps> = ({ center, models }) => {
  const [cx, cz] = center;
  const { palette } = useKit3D();
  const wood = woodTexture("#D9A774", "#9C6A3E", [2.2, 2.8]);
  const wall = mixHex(palette.bg[1] ?? palette.bg[0], "#FFFFFF", 0.35);
  return (
    <group>
      <RoundedBox args={[26, 0.7, 26]} radius={0.14} smoothness={4} position={[cx, -0.35, cz + 5.2]} receiveShadow castShadow>
        <meshStandardMaterial map={wood} color="#FFFFFF" roughness={0.6} />
      </RoundedBox>
      <mesh position={[cx, 8, cz - 7.8]} receiveShadow>
        <planeGeometry args={[60, 20]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -6, cz]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={mixHex(wall, "#6B5440", 0.5)} roughness={1} />
      </mesh>
      {/* sunlight from a window falling on the wall */}
      <mesh position={[cx - 3.2, 3.4, cz - 7.75]} renderOrder={2}>
        <planeGeometry args={[7.5, 5.2]} />
        <meshBasicMaterial map={windowTexture()} color="#FFD9A8" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Prop id="lamp-table" models={models} h={2.7} position={[cx - 5.6, 0, cz - 5.2]} rotY={0.5} />
      <Prop id="books" models={models} len={1.6} position={[cx + 4.9, 0, cz - 4.8]} rotY={-0.3} />
      <Prop id="plant-small" models={models} h={1.7} position={[cx + 6.9, 0, cz - 5.6]} />
      <Prop id="computer-mouse" models={models} len={0.55} position={[cx + 4.2, 0, cz + 3.0]} rotY={-0.4} />
    </group>
  );
};

// ---------------- room corner ----------------

const Room: React.FC<SetProps> = ({ center, models }) => {
  const [cx, cz] = center;
  const { palette } = useKit3D();
  const floor = woodTexture("#C8925C", "#8E5E35", [4, 4]);
  const wall = mixHex(palette.bg[0], "#FFFFFF", 0.25);
  const wall2 = mixHex(palette.bg[1] ?? palette.bg[0], "#FFFFFF", 0.15);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow>
        <planeGeometry args={[34, 34]} />
        <meshStandardMaterial map={floor} color="#FFFFFF" roughness={0.6} />
      </mesh>
      <mesh position={[cx, 6, cz - 8]} receiveShadow>
        <planeGeometry args={[34, 12]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      <mesh position={[cx - 9, 6, cz]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[34, 12]} />
        <meshStandardMaterial color={wall2} roughness={0.95} />
      </mesh>
      {/* baseboards */}
      <mesh position={[cx, 0.15, cz - 7.95]} castShadow receiveShadow>
        <boxGeometry args={[34, 0.3, 0.1]} />
        <meshStandardMaterial color="#F4EFE8" roughness={0.6} />
      </mesh>
      <mesh position={[cx - 8.95, 0.15, cz]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.3, 34]} />
        <meshStandardMaterial color="#F4EFE8" roughness={0.6} />
      </mesh>
      <mesh position={[cx - 8.9, 3.6, cz - 1.5]} rotation={[0, Math.PI / 2, 0]} renderOrder={2}>
        <planeGeometry args={[6, 4.4]} />
        <meshBasicMaterial map={windowTexture()} color="#FFE2B8" transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Prop id="bookcase" models={models} h={4.2} position={[cx - 4.8, 0, cz - 7.2]} />
      <Prop id="plant-small" models={models} h={1.9} position={[cx + 5.6, 0, cz - 6.8]} />
      <Prop id="lamp-table" models={models} h={2.6} position={[cx - 7.6, 0, cz - 3.8]} />
      <Prop id="chair-desk" models={models} h={2.4} position={[cx + 6.4, 0, cz - 3.4]} rotY={-0.7} />
    </group>
  );
};

// ---------------- neon grid world ----------------

const EdgeBox: React.FC<{ position: V3; size: V3; body: string; edge: THREE.Color }> = ({ position, size, body, edge }) => {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={body} roughness={0.7} metalness={0.2} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edge} toneMapped={false} />
      </lineSegments>
    </group>
  );
};

const Grid: React.FC<SetProps> = ({ center, half }) => {
  const [cx, cz] = center;
  const { palette } = useKit3D();
  const cell = 1.25;
  const size = 260;
  const grid = useMemo(() => {
    const tex = gridTexture().clone();
    tex.repeat.set(size / cell, size / cell);
    tex.needsUpdate = true;
    return tex;
  }, []);
  const accent = palette.accent;
  const edge = useMemo(() => new THREE.Color(mixHex(accent, "#FFFFFF", 0.25)).multiplyScalar(1.6), [accent]);
  const r = Math.max(half[0], half[1]);
  const pillars = useMemo(
    () =>
      Array.from({ length: 12 }, (_, k) => {
        const side = k % 2 ? 1 : -1;
        const x = cx + side * (r + 3.5 + hash(k, 1, 77) * 10);
        const z = cz - 3 - hash(k, 2, 77) * 30 - k * 1.5;
        const w = 1.4 + hash(k, 3, 77) * 1.6;
        const h = 4 + hash(k, 4, 77) * 9;
        return { p: [x, h / 2, z] as V3, s: [w, h, w * (0.8 + hash(k, 5, 77) * 0.6)] as V3 };
      }),
    [cx, cz, r],
  );
  const brick = useMemo(() => {
    const tex = brickTexture().clone();
    tex.repeat.set(5, 1.1);
    tex.needsUpdate = true;
    return tex;
  }, []);
  const wallW = Math.max(9, r * 2 + 4);
  const wallEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(wallW, 2.3, 0.6)), [wallW]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#050A22" roughness={0.85} metalness={0} emissive={accent} emissiveMap={grid} emissiveIntensity={1.6} />
      </mesh>
      {pillars.map((p, k) => (
        <EdgeBox key={k} position={p.p} size={p.s} body="#0B1538" edge={edge} />
      ))}
      {/* brick wall behind the subject with glowing mortar lines */}
      <group position={[cx + 1.2, 1.15, cz - 6.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[wallW, 2.3, 0.6]} />
          <meshStandardMaterial color="#0C1640" roughness={0.65} emissive={accent} emissiveMap={brick} emissiveIntensity={0.9} />
        </mesh>
        <lineSegments geometry={wallEdges}>
          <lineBasicMaterial color={edge} toneMapped={false} />
        </lineSegments>
      </group>
    </group>
  );
};

// ---------------- stage ----------------

const Stage: React.FC<SetProps> = ({ center, half }) => {
  const [cx, cz] = center;
  const { palette } = useKit3D();
  const R = Math.max(half[0], half[1]) + 1.3;
  const cyc = mixHex(palette.bg[1] ?? palette.bg[0], "#000000", 0.25);
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, 0.3, 96]} />
        <meshStandardMaterial color="#1B1C22" roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R + 0.9, R + 0.9, 0.3, 96]} />
        <meshStandardMaterial color="#141519" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R - 0.06, R, 96]} />
        <meshBasicMaterial color={new THREE.Color(palette.accent).multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0C0C10" roughness={0.3} />
      </mesh>
      {/* curved cyclorama behind the stage */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[16, 16, 14, 64, 1, true, Math.PI / 2 + 0.3, Math.PI - 0.6]} />
        <meshStandardMaterial color={cyc} roughness={0.9} side={THREE.BackSide} />
      </mesh>
      {/* visible beams from the rig above (additive cones) */}
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * 2.6, 6.5, -0.5]} rotation={[0, 0, k * -0.25]} renderOrder={3}>
          <coneGeometry args={[2.2, 13, 40, 1, true]} />
          <meshBasicMaterial color={k ? palette.accent : "#FFFFFF"} transparent opacity={0.045} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------- city block ----------------

const City: React.FC<SetProps> = ({ center, models }) => {
  const [cx, cz] = center;
  const asphalt = useMemo(() => {
    const tex = asphaltTexture().clone();
    tex.repeat.set(30, 2);
    tex.needsUpdate = true;
    return tex;
  }, []);
  const plaza = useMemo(() => {
    const tex = tileTexture("#B9B6B0").clone();
    tex.repeat.set(12, 6);
    tex.needsUpdate = true;
    return tex;
  }, []);
  const dashes = useMemo(() => Array.from({ length: 24 }, (_, k) => ({ p: [cx - 46 + k * 4, 0.004, cz - 9] as V3, s: [2, 0.01, 0.14] as V3 })), [cx, cz]);
  const buildings = ["city-building-a", "city-building-skyscraper-a", "city-building-c", "city-building-skyscraper-c", "city-building-a", "city-building-c", "city-building-skyscraper-a"];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz - 1]} receiveShadow>
        <planeGeometry args={[60, 14]} />
        <meshStandardMaterial map={plaza} color="#FFFFFF" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.02, cz - 9]} receiveShadow>
        <planeGeometry args={[120, 6]} />
        <meshStandardMaterial map={asphalt} color="#FFFFFF" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.03, cz - 30]} receiveShadow>
        <planeGeometry args={[200, 120]} />
        <meshStandardMaterial color="#8E8B86" roughness={0.9} />
      </mesh>
      <Boxes items={dashes} color="#EDEAE0" roughness={0.6} shadows={false} />
      {buildings.map((b, k) => (
        <Prop key={k} id={b} models={models} h={7 + hash(k, 1, 55) * 9} position={[cx - 15 + k * 5.2, 0, cz - 15 - hash(k, 2, 55) * 3]} rotY={0} />
      ))}
      {[-1, 1].map((s) => (
        <Prop key={s} id={s < 0 ? "city-building-c" : "city-building-a"} models={models} h={9} position={[cx + s * 13, 0, cz - 4]} rotY={s * -Math.PI / 2} />
      ))}
      {[-7, 0, 7].map((x) => (
        <Prop key={x} id="street-light" models={models} h={4.4} position={[cx + x, 0, cz - 6.2]} rotY={Math.PI} />
      ))}
      <Prop id="construction-barrier" models={models} len={1.6} position={[cx + 5.5, 0, cz + 2.5]} rotY={-0.4} />
    </group>
  );
};

// ---------------- voxel island ----------------

const Voxel: React.FC<SetProps> = ({ center, half }) => {
  const [cx, cz] = center;
  const u = 0.5; // block size: a character is ~3.5 blocks tall
  const flat = Math.max(half[0], half[1]) + 2.5;
  const items = useMemo(() => {
    const out: { p: V3; s: V3; c: string }[] = [];
    const R = (flat + 12) / u;
    const F = flat / u;
    const grass = ["#6CC04A", "#62B543", "#74C853", "#5CAD3E", "#69BB47"];
    const dirt = ["#8D5B30", "#82532B", "#986537"];
    const ox = Math.round(cx / u) * u;
    const oz = Math.round(cz / u) * u;
    /** terrace height (blocks) of cell i, j: flat around the subject, rising toward the rim */
    const lift = (i: number, j: number) => {
      const d = Math.hypot(i, j * 1.15);
      return d < F ? 0 : Math.floor(Math.max(0, Math.min(7, (d - F) * 0.22 + (fbm(i * 0.09, j * 0.09, 9) - 0.45) * 7)));
    };
    const B = u * 0.999;
    for (let i = -Math.ceil(R); i <= Math.ceil(R); i++)
      for (let j = -Math.ceil(R); j <= Math.ceil(R); j++) {
        const d = Math.hypot(i, j * 1.15);
        if (d > R - (fbm(i * 0.09, j * 0.09, 3) - 0.5) * 12) continue;
        const top = lift(i, j);
        const x = ox + i * u;
        const z = oz + j * u;
        // only the blocks that can be seen: the top, plus the dirt under it down to the lowest neighbour (and the rim)
        const low = Math.min(lift(i + 1, j), lift(i - 1, j), lift(i, j + 1), lift(i, j - 1));
        const rim = d > R - 8;
        for (let y = rim ? -3 : Math.min(low, top - 1); y < top; y++) out.push({ p: [x, (y - 0.5) * u, z], s: [B, B, B], c: dirt[Math.floor(hash(i, j * 31 + y, 2) * dirt.length)] });
        out.push({ p: [x, (top - 0.5) * u, z], s: [B, B, B], c: grass[Math.floor(hash(i, j, 5) * grass.length)] });
      }
    // voxel trees on the terraces behind and beside the subject
    for (let k = 0; k < 11; k++) {
      const a = -Math.PI * 0.97 + (k / 10) * Math.PI * 0.94 + hash(k, 1, 12) * 0.15;
      const rr = (flat + 2 + hash(k, 2, 12) * 8) / u;
      const i = Math.round(Math.cos(a) * rr);
      const j = Math.round(Math.sin(a) * rr);
      const base = lift(i, j);
      const h = 5 + Math.floor(hash(k, 3, 12) * 3);
      const x = ox + i * u;
      const z = oz + j * u;
      for (let y = 0; y < h; y++) out.push({ p: [x, (base + y + 0.5) * u, z], s: [B, B, B], c: "#7A4E2A" });
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = 0; dy < 3; dy++) {
            const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
            if (corner || (dy === 2 && (Math.abs(dx) === 2 || Math.abs(dz) === 2))) continue;
            out.push({ p: [x + dx * u, (base + h + dy - 0.5) * u, z + dz * u], s: [B, B, B], c: hash(dx + 5, dz * 7 + dy, k) > 0.5 ? "#3F8F37" : "#4C9F3E" });
          }
    }
    // blocky clouds
    for (let k = 0; k < 6; k++) {
      const x = ox - 24 + k * 9 + hash(k, 1, 44) * 4;
      const z = oz - 22 - hash(k, 2, 44) * 16;
      out.push({ p: [x, 11 + hash(k, 3, 44) * 4, z], s: [4 + hash(k, 4, 44) * 4, 0.9, 2.5], c: "#FFFFFF" });
    }
    return out;
  }, [cx, cz, flat]);
  return (
    <group>
      <Boxes items={items} roughness={0.9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.95, cz]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#4A9BE0" roughness={0.25} />
      </mesh>
    </group>
  );
};

export const SET_VIEWS: Record<string, React.FC<SetProps>> = { road: Road, desk: Desk, room: Room, grid: Grid, stage: Stage, city: City, voxel: Voxel };

/** The environment set of a scene (null for "none": the look's own floor is used). */
export const SetView: React.FC<SetProps & { set: string }> = ({ set, ...rest }) => {
  const View = SET_VIEWS[set];
  return View ? <View {...rest} /> : null;
};
