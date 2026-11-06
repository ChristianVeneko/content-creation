// Per-scene visual effects of the 3D templates (`visual.fx`, lib/scene3d-motion.mjs FX_TYPES): particles (ambient or a
// burst), trails behind moving objects, emissive pulses, shockwave rings, glow halos, light sweeps and holograms.
// Deterministic: every value is a pure function of `t` and a seed (remotion `random`), never a clock or Math.random.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { useKit3D } from "./kit";
import { radialTexture } from "./sets";
import { color3d } from "./looks";

type V3 = [number, number, number];
export type Fx3D = { type: string; kind?: string; target?: string; color?: string; at?: number | string; until?: number | string; count?: number; size?: number; burst?: boolean; pos?: V3; aim?: V3; points?: V3[] };
/** World anchor of a target at time t: its base position and height (null when hidden or missing). */
export type TargetAt = (target: string, t: number) => { pos: V3; h: number } | null;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;

let halo: THREE.Texture | null = null;
const haloTex = () => (halo ??= radialTexture());
let scan: THREE.DataTexture | null = null;
/** Horizontal scanlines (alpha stripes) for the hologram shell. */
const scanTex = () => {
  if (scan) return scan;
  const h = 64;
  const data = new Uint8Array(4 * h);
  for (let y = 0; y < h; y++) {
    const a = y % 8 < 2 ? 255 : y % 8 < 4 ? 70 : 18;
    data.set([255, 255, 255, a], y * 4);
  }
  scan = new THREE.DataTexture(data, 1, h, THREE.RGBAFormat);
  scan.wrapS = scan.wrapT = THREE.RepeatWrapping;
  scan.magFilter = THREE.LinearFilter;
  scan.needsUpdate = true;
  return scan;
};

/** Bright unlit color: blooms on the bloom looks, flat bright elsewhere. */
const useBright = () => {
  const { look } = useKit3D();
  return (c: string, k = 1.6) => ({ color: look.bloom ? new THREE.Color(c).multiplyScalar(k) : new THREE.Color(c), toneMapped: !look.bloom });
};

/** Window weight of an effect: fades in at `start`, out at `end`. */
const windowW = (t: number, start: number, end: number, fade = 0.3) => clamp01((t - start) / fade) * (end === Infinity ? 1 : clamp01((end - t) / fade));

const PARTICLE_N: Record<string, number> = { sparks: 60, dust: 70, snow: 90, embers: 50, confetti: 70, stars: 120 };

const ParticlesFx: React.FC<{ f: Fx3D; t: number; start: number; end: number; anchor: { pos: V3; h: number } | null; center: V3; seed: number; color: string }> = ({ f, t, start, end, anchor, center, seed, color }) => {
  const { palette } = useKit3D();
  const bright = useBright();
  const ref = useRef<THREE.InstancedMesh>(null);
  const kind = f.kind ?? "sparks";
  const n = f.count ?? (f.burst ? Math.round(PARTICLE_N[kind] * 0.8) : PARTICLE_N[kind]);
  const size = f.size ?? 1;
  const geo = useMemo(
    () =>
      kind === "confetti"
        ? new THREE.PlaneGeometry(0.11, 0.07)
        : kind === "sparks"
          ? new THREE.OctahedronGeometry(0.04, 0)
          : kind === "stars"
            ? new THREE.OctahedronGeometry(0.06, 0)
            : kind === "embers"
              ? new THREE.SphereGeometry(0.035, 8, 6)
              : new THREE.SphereGeometry(kind === "snow" ? 0.04 : 0.022, 8, 6),
    [kind],
  );
  const colors = [palette.accent, palette.accent2 ?? palette.accent, palette.accent3 ?? palette.accent, "#FFFFFF", "#FFD34D"];
  const o = anchor?.pos ?? center;
  const oy = (anchor?.h ?? 1) * 0.55;
  const w = f.burst ? 1 : windowW(t, start, end);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = (k: number) => random(`fx-${seed}-${i}-${k}`);
      let x = 0;
      let y = 0;
      let z = 0;
      let s = 1;
      if (f.burst) {
        // one burst from the target: radial velocity + gravity (confetti drifts down slower)
        const tau = t - start - r(7) * 0.08;
        const life = kind === "confetti" ? 2.6 : 1.3;
        if (tau < 0 || tau > life) s = 0;
        const th = r(0) * Math.PI * 2;
        const up = kind === "confetti" ? 0.55 + r(1) * 0.6 : r(1) * 1.4 - 0.25;
        const sp = (kind === "confetti" ? 3.2 : 4.4) * (0.45 + r(2) * 0.8) * size;
        const g = kind === "confetti" ? 2.4 : 5.5;
        const drag = kind === "confetti" ? 1 - Math.exp(-tau * 2.2) : tau;
        const travel = kind === "confetti" ? drag / 2.2 : drag;
        x = o[0] + Math.cos(th) * sp * travel * 0.7;
        z = o[2] + Math.sin(th) * sp * travel * 0.7;
        y = o[1] + oy + up * sp * travel - 0.5 * g * Math.max(0, tau) ** 2 * (kind === "confetti" ? 0.3 : 1);
        y = Math.max(0.03, y);
        s *= (1 - clamp01(tau / life) ** 2) * (0.6 + r(4) * 0.9);
      } else {
        const R = 3.4 * size;
        const H = kind === "stars" ? 6 : 4.5;
        const speed = kind === "snow" ? 0.45 : kind === "embers" ? 0.55 : kind === "sparks" ? 1.6 : kind === "confetti" ? 0.7 : 0.08;
        const dir = kind === "snow" || kind === "confetti" ? -1 : 1;
        const raw = (r(1) * H + dir * t * speed * (0.6 + r(3) * 0.8)) % H;
        const yy = (raw + H) % H;
        if (kind === "stars") {
          // a shell of stars behind and above the scene
          const th = (r(0) - 0.5) * Math.PI * 1.4;
          const rad = 9 + r(2) * 5;
          x = o[0] + Math.sin(th) * rad;
          z = o[2] - Math.cos(th) * rad * 0.8 - 2;
          y = 0.5 + r(1) * 7;
          s = (0.4 + r(4)) * (0.55 + 0.45 * Math.sin(t * (1.5 + r(5) * 3) + r(6) * 6.28));
        } else {
          const a = r(0) * Math.PI * 2;
          const rr = Math.sqrt(r(2)) * R;
          const sway = kind === "snow" || kind === "confetti" ? Math.sin(t * (0.8 + r(5)) + i) * 0.25 : kind === "dust" ? Math.sin(t * 0.3 + i) * 0.3 : 0;
          x = o[0] + Math.cos(a) * rr + sway;
          z = o[2] + Math.sin(a) * rr * 0.8;
          y = (anchor ? o[1] : 0) + yy - (kind === "snow" || kind === "confetti" ? 0 : 0.2);
          const edge = Math.min(1, Math.sin((yy / H) * Math.PI) * 2.2 + 0.05);
          const flicker = kind === "embers" ? 0.6 + 0.4 * Math.sin(t * (6 + r(6) * 6) + i) : 1;
          s = (0.5 + r(4)) * edge * flicker;
        }
        s *= w;
      }
      e.set(t * (1 + r(5) * 3), t * (0.7 + r(6) * 2), r(8) * 6);
      q.setFromEuler(e);
      mat.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
      m.setMatrixAt(i, mat);
      if (kind === "confetti") m.setColorAt(i, col.set(colors[Math.floor(r(9) * colors.length)]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  const b = bright(color, kind === "embers" ? 2.2 : 1.8);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]} frustumCulled={false}>
      {kind === "confetti" ? (
        <meshStandardMaterial roughness={0.6} side={THREE.DoubleSide} color="#FFFFFF" />
      ) : (
        <meshBasicMaterial color={b.color} toneMapped={b.toneMapped} transparent opacity={kind === "dust" ? 0.5 : kind === "snow" ? 0.9 : 0.95} depthWrite={false} />
      )}
    </instancedMesh>
  );
};

const Halo: React.FC<{ pos: V3; size: number; color: string; opacity: number }> = ({ pos, size, color, opacity }) => {
  const bright = useBright()(color, 1.4);
  if (opacity <= 0.003) return null;
  return (
    <sprite position={pos} scale={[size, size, 1]} renderOrder={-1}>
      <spriteMaterial map={haloTex()} color={bright.color} toneMapped={bright.toneMapped} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
};

/** Camera-facing ribbon through the target's recent positions, tapering and fading toward the tail. */
const Trail: React.FC<{ points: THREE.Vector3[]; camPos: V3; width: number; color: string }> = ({ points, camPos, width, color }) => {
  const bright = useBright()(color, 1.6);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = points.length;
    const pos = new Float32Array(N * 2 * 3);
    const col = new Float32Array(N * 2 * 4);
    const idx: number[] = [];
    const cam = new THREE.Vector3(...camPos);
    for (let i = 0; i < N; i++) {
      const p = points[i];
      const next = points[Math.min(N - 1, i + 1)];
      const prev = points[Math.max(0, i - 1)];
      const dir = next.clone().sub(prev);
      if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0);
      const side = dir.clone().cross(cam.clone().sub(p)).normalize();
      const k = 1 - i / (N - 1);
      const wd = width * (0.15 + 0.85 * k);
      const a = p.clone().addScaledVector(side, wd / 2);
      const b = p.clone().addScaledVector(side, -wd / 2);
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      const al = k ** 1.6 * 0.85;
      col.set([1, 1, 1, al, 1, 1, 1, al], i * 8);
      if (i < N - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 4));
    g.setIndex(idx);
    return g;
  }, [points, camPos, width]);
  return (
    <mesh geometry={geo} frustumCulled={false}>
      <meshBasicMaterial color={bright.color} toneMapped={bright.toneMapped} vertexColors transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

const Shockwave: React.FC<{ pos: V3; t: number; start: number; size: number; color: string }> = ({ pos, t, start, size, color }) => {
  const bright = useBright()(color, 2);
  const rings = [0, 0.14, 0.3];
  return (
    <group position={[pos[0], 0.035, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((d, k) => {
        const u = (t - start - d) / 0.95;
        if (u < 0 || u > 1) return null;
        const r = 0.3 + easeOut(u) * 2.8 * size * (1 - k * 0.18);
        return (
          <mesh key={k} scale={[r, r, 1]}>
            <ringGeometry args={[0.9 - 0.08 * (1 - u), 1, 64]} />
            <meshBasicMaterial color={bright.color} toneMapped={bright.toneMapped} transparent opacity={(1 - u) ** 1.5 * (k === 0 ? 0.95 : 0.5)} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
      {t - start >= 0 && t - start < 0.35 ? (
        <mesh scale={[1.6 * size, 1.6 * size, 1]}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial color={bright.color} toneMapped={bright.toneMapped} transparent opacity={0.45 * (1 - (t - start) / 0.35)} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

const Hologram: React.FC<{ pos: V3; h: number; t: number; w: number; size: number; color: string }> = ({ pos, h, t, w, size, color }) => {
  const bright = useBright()(color, 1.8);
  const tex = useMemo(() => {
    const x = scanTex().clone();
    x.repeat.set(1, Math.max(4, h * 7));
    x.needsUpdate = true;
    return x;
  }, [h]);
  tex.offset.y = -t * 0.6;
  const r = 0.95 * size;
  if (w <= 0.003) return null;
  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      <mesh position={[0, h * 0.55, 0]}>
        <cylinderGeometry args={[r, r, h * 1.15, 48, 1, true]} />
        <meshBasicMaterial color={bright.color} toneMapped={bright.toneMapped} map={tex} transparent opacity={0.35 * w} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {[0.15, 0.55, 0.95].map((y, k) => (
        <mesh key={k} position={[0, h * y + Math.sin(t * 1.4 + k * 2) * 0.06, 0]} rotation={[Math.PI / 2 + Math.sin(t * 0.8 + k) * 0.12, 0, t * (k % 2 ? -0.9 : 0.7)]}>
          <torusGeometry args={[r * (1.05 + k * 0.07), 0.012, 6, 96, Math.PI * (1.2 + 0.3 * k)]} />
          <meshBasicMaterial color={bright.color} toneMapped={bright.toneMapped} transparent opacity={0.9 * w} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.2, r * 1.15, 64]} />
        <meshBasicMaterial color={bright.color} toneMapped={bright.toneMapped} map={haloTex()} transparent opacity={0.7 * w} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

/**
 * Volumetric spotlight: an open cone from `pos` down to the lit point, additive with a falloff toward the floor and
 * soft edges (view-angle fade), a light pool on the ground and a point light that tints what stands in the beam.
 */
const Spotlight: React.FC<{ pos: V3; aim: V3; size: number; color: string; t: number; w: number; seed: number }> = ({ pos, aim, size, color, t, w, seed }) => {
  const sway = Math.sin(t * 0.7 + seed * 1.9) * 0.55;
  const a: V3 = [aim[0] + sway, aim[1], aim[2] + Math.cos(t * 0.5 + seed) * 0.3];
  const apex = new THREE.Vector3(...pos);
  const base = new THREE.Vector3(...a);
  const dir = apex.clone().sub(base);
  const H = Math.max(0.5, dir.length());
  const R = H * 0.2 * size;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const mid = apex.clone().add(base).multiplyScalar(0.5);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
        uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: 0 }, uH: { value: 1 } },
        vertexShader: "varying vec3 vN; varying vec3 vV; varying float vT; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vT = position.y; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform vec3 uColor; uniform float uOp; uniform float uH; varying vec3 vN; varying vec3 vV; varying float vT; void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float fall = clamp(vT / uH + 0.5, 0.0, 1.0); gl_FragColor = vec4(uColor, uOp * edge * (0.12 + 0.88 * fall)); }",
      }),
    [color],
  );
  mat.uniforms.uOp.value = 0.26 * w;
  mat.uniforms.uH.value = H;
  return (
    <>
      <mesh position={mid} quaternion={quat} material={mat} scale={[1, 1, 1]}>
        <coneGeometry args={[R, H, 48, 1, true]} />
      </mesh>
      <Halo pos={[a[0], a[1] + 0.02, a[2]]} size={R * 2.4} color={color} opacity={0.38 * w} />
      <pointLight position={[a[0], a[1] + H * 0.45, a[2]]} color={color} intensity={34 * size * w} distance={H * 1.6} decay={1.6} />
    </>
  );
};

/** Pipe signal: dots flow along a polyline in a loop (a pure function of t), fading in at `start` and out at `end`. */
const Signal: React.FC<{ points: V3[]; t: number; start: number; end: number; count: number; size: number; color: string }> = ({ points, t, start, end, count, size, color }) => {
  const bright = useBright();
  const path = useMemo(() => {
    const seg = points.slice(1).map((p, i) => ({ a: points[i], b: p, len: Math.hypot(p[0] - points[i][0], p[1] - points[i][1], p[2] - points[i][2]) }));
    return { seg, total: Math.max(1e-6, seg.reduce((s, x) => s + x.len, 0)) };
  }, [points]);
  const w = windowW(t, start, end);
  if (w <= 0.001) return null;
  const SPEED = 1.5;
  const at = (d: number): V3 => {
    let left = ((d % path.total) + path.total) % path.total;
    for (const sg of path.seg) {
      if (left <= sg.len || sg === path.seg[path.seg.length - 1]) {
        const u = sg.len > 0 ? Math.min(1, left / sg.len) : 0;
        return [sg.a[0] + (sg.b[0] - sg.a[0]) * u, sg.a[1] + (sg.b[1] - sg.a[1]) * u, sg.a[2] + (sg.b[2] - sg.a[2]) * u];
      }
      left -= sg.len;
    }
    return points[0];
  };
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const p = at((t - start) * SPEED + (i * path.total) / count);
        return (
          <group key={i} position={p} scale={w}>
            <mesh>
              <sphereGeometry args={[0.09 * size, 14, 10]} />
              <meshBasicMaterial {...bright(color)} />
            </mesh>
            <Halo pos={[0, 0, 0]} size={0.5 * size} color={color} opacity={0.5} />
          </group>
        );
      })}
    </>
  );
};

/** Light sweep: a strong colored point light glides across the front of the scene. */
const Sweep: React.FC<{ t: number; start: number; end: number; center: V3; color: string; size: number }> = ({ t, start, end, center, color, size }) => {
  const stop = end === Infinity ? start + 2.4 : end;
  const u = (t - start) / Math.max(0.3, stop - start);
  if (u < -0.1 || u > 1.1) return null;
  const k = Math.sin(Math.PI * clamp01(u));
  return <pointLight position={[center[0] - 5 + 10 * clamp01(u), center[1] + 2.4, center[2] + 2.6]} color={color} intensity={60 * k * size} distance={11} decay={1.6} />;
};

export const FxLayer: React.FC<{ fx: Fx3D[]; t: number; sec: (m: number | string | undefined) => number; targetAt: TargetAt; center: V3; seed: number; camPos: V3; enterOf: (target: string | undefined) => number }> = ({
  fx,
  t,
  sec,
  targetAt,
  center,
  seed,
  camPos,
  enterOf,
}) => {
  const { look, palette } = useKit3D();
  return (
    <>
      {fx.map((f, i) => {
        const color = color3d(palette, look, f.color, f.type === "hologram" ? "#7CF7FF" : f.type === "particles" && f.kind === "snow" ? "#FFFFFF" : f.type === "particles" && f.kind === "embers" ? "#FF8A3D" : f.type === "particles" && f.kind === "stars" ? "#FFF6D8" : f.type === "particles" && f.kind === "dust" ? "#FFE8C2" : (palette.accent3 ?? palette.accent));
        const start = f.at !== undefined ? sec(f.at) : f.type === "shockwave" || f.burst ? enterOf(f.target) + 0.25 : f.target ? enterOf(f.target) : 0;
        const end = f.until !== undefined ? sec(f.until) : Infinity;
        const size = f.size ?? 1;
        const anchor = f.target ? targetAt(f.target, t) : null;
        const key = `${f.type}-${i}`;
        switch (f.type) {
          case "particles":
            return <ParticlesFx key={key} f={f} t={t} start={start} end={end} anchor={f.target ? (targetAt(f.target, Math.max(t, start)) ?? anchor) : null} center={center} seed={seed * 13 + i} color={color} />;
          case "trail": {
            if (!anchor || t < start) return null;
            const pts: THREE.Vector3[] = [];
            const part = f.target?.includes("/");
            for (let k = 0; k < 16; k++) {
              const a = targetAt(f.target!, Math.max(start, t - k * 0.045));
              if (a) pts.push(new THREE.Vector3(a.pos[0], a.pos[1] + (part ? 0 : a.h * 0.5), a.pos[2]));
            }
            const len = pts.reduce((s, p, k) => (k ? s + p.distanceTo(pts[k - 1]) : 0), 0);
            if (pts.length < 3 || len < 0.05) return null;
            return <Trail key={key} points={pts} camPos={camPos} width={0.22 * size} color={color} />;
          }
          case "shockwave": {
            const a = f.target ? targetAt(f.target, start) : null;
            return <Shockwave key={key} pos={a?.pos ?? center} t={t} start={start} size={size} color={color} />;
          }
          case "pulse":
          case "glow": {
            if (!anchor) return null;
            const w = windowW(t, start, end);
            const k = f.type === "pulse" ? 0.5 + 0.5 * Math.sin((t - start) * Math.PI * 2 * 1.1) : 0.85 + 0.15 * Math.sin(t * 1.3);
            const part = f.target?.includes("/");
            const s = (part ? 0.9 : Math.max(1.6, anchor.h * 1.5)) * size * (f.type === "pulse" ? 1 + 0.35 * k : 1);
            return <Halo key={key} pos={[anchor.pos[0], anchor.pos[1] + (part ? 0 : anchor.h * 0.5), anchor.pos[2]]} size={s} color={color} opacity={w * (f.type === "pulse" ? 0.25 + 0.45 * k : 0.55)} />;
          }
          case "hologram":
            if (!anchor) return null;
            return <Hologram key={key} pos={anchor.pos} h={anchor.h} t={t} w={windowW(t, start, end)} size={size} color={color} />;
          case "spotlight": {
            const aim = anchor ? anchor.pos : (f.aim ?? [center[0], 0, center[2]]);
            const from = f.pos ?? ([aim[0], 10, aim[2] - 1.5] as V3);
            return <Spotlight key={key} pos={from} aim={aim} size={size} color={color} t={t} w={windowW(t, start, end, 0.6)} seed={seed + i} />;
          }
          case "signal":
            return f.points && f.points.length >= 2 ? <Signal key={key} points={f.points} t={t} start={start} end={end} count={f.count ?? 5} size={size} color={f.color ? color : (palette.accent2 ?? palette.accent)} /> : null;
          case "sweep":
            return <Sweep key={key} t={t} start={start} end={end} center={center} color={color} size={size} />;
          default:
            return null;
        }
      })}
    </>
  );
};

/** Pulse factors (0..1) a scene's pulse fx apply to the emissive parts of each object id. */
export const pulsesFor = (fx: Fx3D[], id: string | undefined, t: number, sec: (m: number | string | undefined) => number) =>
  id === undefined
    ? []
    : fx
        .filter((f) => f.type === "pulse" && f.target && f.target.split("/")[0] === id)
        .map((f) => {
          const start = f.at !== undefined ? sec(f.at) : 0;
          const end = f.until !== undefined ? sec(f.until) : Infinity;
          return { part: f.target!.split("/")[1] ?? null, k: windowW(t, start, end) * (0.5 + 0.5 * Math.sin((t - start) * Math.PI * 2 * 1.1)) };
        });
