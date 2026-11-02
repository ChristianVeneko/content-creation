// Shared 3D kit for the 3D templates. Every animation is a pure function of useCurrentFrame():
// no useFrame for animation (only BloomRender uses it, to render), no clock, no Math.random, no drei Float/Sparkles,
// no Environment presets (they hit a CDN).
import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Environment, Lightformer, MeshReflectorMaterial, OrthographicCamera, Outlines, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { IconData, Palette } from "../types";
import type { Look3D } from "./looks";

// ---------------- context ----------------

export type Kit3D = { look: Look3D; palette: Palette; icons: Record<string, IconData>; gradient: THREE.DataTexture | null };
export const Kit3DContext = createContext<Kit3D | null>(null);
export const useKit3D = (): Kit3D => {
  const k = useContext(Kit3DContext);
  if (!k) throw new Error("useKit3D outside Kit3DContext");
  return k;
};

/** 3-band toon ramp (Nearest filtering keeps the bands hard). */
export const makeToonRamp = (): THREE.DataTexture => {
  const tex = new THREE.DataTexture(new Uint8Array([95, 170, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
};

export const mixHex = (a: string, b: string, t: number): string => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();

// ---------------- materials ----------------

export type Finish = "body" | "dark" | "light" | "metal" | "screen" | "glow" | "glass";

/** The material of a part for the current look. `color` is used by body / glow / glass. */
export const Mat: React.FC<{ finish?: Finish; color?: string; intensity?: number; map?: THREE.Texture | null }> = ({ finish = "body", color, intensity = 1, map = null }) => {
  const { look, gradient } = useKit3D();
  const c = finish === "dark" ? look.dark : finish === "light" ? look.light : finish === "screen" ? look.screen : finish === "metal" ? "#CDD1DA" : (color ?? look.light);
  if (finish === "glow") {
    // Emissive light sources: bright enough to bloom in neon, a flat bright color elsewhere.
    const k = look.bloom ? 1.8 * intensity : 1;
    return <meshBasicMaterial color={new THREE.Color(color ?? look.light).multiplyScalar(k)} toneMapped={!look.bloom} />;
  }
  switch (look.material) {
    case "paper":
      // folded card stock: flat-shaded facets, no gloss, colors pulled a little toward paper white
      if (finish === "metal") return <meshStandardMaterial color="#D9D2C5" roughness={1} flatShading />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.9} emissive={c} emissiveIntensity={0.2} flatShading />;
      return <meshStandardMaterial color={mixHex(c, "#FFF8EC", 0.12)} map={map} roughness={1} metalness={0} flatShading envMapIntensity={0.4} />;
    case "plastic":
      // injection-molded ABS: saturated, glossy highlights, a little clearcoat
      if (finish === "metal") return <meshStandardMaterial color="#C9CCD2" metalness={0.9} roughness={0.3} />;
      if (finish === "screen") return <meshPhysicalMaterial color={c} roughness={0.15} clearcoat={1} />;
      return <meshPhysicalMaterial color={c} map={map} roughness={0.3} metalness={0} clearcoat={0.7} clearcoatRoughness={0.2} envMapIntensity={0.9} />;
    case "holo": {
      // light, not matter: translucent iridescent shell (the cyan rim is the look's Outlines)
      const hc = finish === "dark" || finish === "screen" ? "#0B2A36" : mixHex(c, "#2DE2FF", 0.6);
      return <meshPhysicalMaterial color={hc} emissive={hc} emissiveIntensity={0.18} transparent opacity={finish === "screen" ? 0.6 : 0.42} roughness={0.25} metalness={0} iridescence={1} iridescenceIOR={1.35} depthWrite={false} side={THREE.DoubleSide} />;
    }
    case "toon":
      return <meshToonMaterial color={c} gradientMap={gradient} map={map} emissive={finish === "screen" ? c : "#000000"} emissiveIntensity={finish === "screen" ? 0.4 : 0} />;
    case "glass":
      if (finish === "body" || finish === "glass" || finish === "light") {
        const tint = mixHex(c, "#FFFFFF", finish === "light" ? 0.75 : 0.45);
        return <meshPhysicalMaterial color={tint} transmission={0.92} roughness={0.14} thickness={0.9} ior={1.45} metalness={0} attenuationColor={c} attenuationDistance={1.6} emissive={c} emissiveIntensity={0.12} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.4} />;
      }
      if (finish === "metal") return <meshStandardMaterial color="#9AA3B8" metalness={1} roughness={0.25} envMapIntensity={1.4} />;
      return <meshStandardMaterial color={c} metalness={0.7} roughness={0.3} emissive={finish === "screen" ? "#0A1030" : "#000000"} envMapIntensity={1} />;
    case "gloss":
      if (finish === "metal") return <meshStandardMaterial color="#E4E4EA" metalness={1} roughness={0.2} envMapIntensity={1.2} />;
      if (finish === "screen") return <meshPhysicalMaterial color={c} metalness={0.4} roughness={0.08} clearcoat={1} envMapIntensity={1.4} />;
      return <meshPhysicalMaterial color={c} map={map} metalness={finish === "dark" ? 0.3 : 0.12} roughness={finish === "dark" ? 0.35 : 0.26} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.1} />;
    case "matte":
      // neon grid: dark navy bodies that catch the colored rim lights (the cyan edge is the look's Outlines)
      if (finish === "metal") return <meshStandardMaterial color="#8FA0C8" metalness={0.8} roughness={0.35} />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.3} emissive={c} emissiveIntensity={0.25} />;
      return <meshStandardMaterial color={mixHex(c, "#0B1640", finish === "dark" ? 0.2 : 0.3)} map={map} roughness={0.7} metalness={0} />;
    case "soft":
      // pastel studio plastic: soft matte color, no clearcoat (cheap standard material)
      if (finish === "metal") return <meshStandardMaterial color="#D9D4CE" metalness={0.75} roughness={0.28} />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.3} emissive={c} emissiveIntensity={0.12} />;
      return <meshStandardMaterial color={finish === "dark" ? c : mixHex(c, "#FFFFFF", 0.16)} map={map} roughness={0.6} metalness={0} />;
    case "paint":
      // night: satin color that catches the moonlight, no clearcoat
      if (finish === "metal") return <meshStandardMaterial color="#C9CED8" metalness={0.7} roughness={0.35} />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.25} emissive={c} emissiveIntensity={0.2} />;
      return <meshStandardMaterial color={c} map={map} metalness={0.1} roughness={finish === "dark" ? 0.6 : 0.45} />;
    case "lowpoly":
      // cutaway explainer: flat-shaded matte facets (the low-poly read), no gloss
      if (finish === "metal") return <meshStandardMaterial color="#C9CDD6" metalness={0.25} roughness={0.55} flatShading />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.5} emissive={c} emissiveIntensity={0.35} flatShading />;
      return <meshStandardMaterial color={c} map={map} roughness={0.92} metalness={0} flatShading />;
    case "voxel":
      if (finish === "metal") return <meshStandardMaterial color="#C9CCD2" metalness={0.6} roughness={0.45} flatShading />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.5} emissive={c} emissiveIntensity={0.2} flatShading />;
      return <meshStandardMaterial color={c} map={map} roughness={0.9} metalness={0} flatShading />;
    case "clay":
    default:
      if (finish === "metal") return <meshStandardMaterial color="#D8D2CC" metalness={0.45} roughness={0.42} />;
      if (finish === "screen") return <meshStandardMaterial color={c} roughness={0.35} emissive={c} emissiveIntensity={0.15} />;
      return <meshStandardMaterial color={c} map={map} roughness={0.82} metalness={0} envMapIntensity={0.6} />;
  }
};

type PartProps = Omit<ThreeElements["mesh"], "children" | "args"> & { finish?: Finish; color?: string; intensity?: number; outline?: boolean; children: React.ReactNode };

/** One mesh of an object: geometry child + the look's material (+ toon outline in the iso look). */
export const Part: React.FC<PartProps> = ({ finish = "body", color, intensity, outline = true, children, ...rest }) => {
  const { look } = useKit3D();
  return (
    <mesh castShadow={look.shadows} receiveShadow={look.shadows} {...rest}>
      {children}
      <Mat finish={finish} color={color} intensity={intensity} />
      {look.outline && outline && finish !== "glow" ? <Outlines thickness={0.028} color={look.outline} /> : null}
    </mesh>
  );
};

/** Rounded box part. */
export const RBox: React.FC<Omit<PartProps, "children"> & { args: [number, number, number]; radius?: number }> = ({ args, radius = 0.08, finish = "body", color, intensity, outline = true, ...rest }) => {
  const { look } = useKit3D();
  // blocky looks keep a hairline bevel (crisp voxel edges that still catch a highlight)
  const r = look.blocky ? Math.min(radius, 0.012) : radius;
  return (
    <RoundedBox args={args} radius={Math.min(r, Math.min(args[0], args[1], args[2]) / 2 - 0.001)} smoothness={4} castShadow={look.shadows} receiveShadow={look.shadows} {...(rest as object)}>
      <Mat finish={finish} color={color} intensity={intensity} />
      {look.outline && outline && finish !== "glow" ? <Outlines thickness={0.028} color={look.outline} /> : null}
    </RoundedBox>
  );
};

// ---------------- icons (Phosphor, MIT) as geometry ----------------

const iconCache = new Map<string, THREE.BufferGeometry>();

/** Extruded (depth > 0) or flat Phosphor icon in a centered unit square, facing +z, spanning z 0..depth. */
export const iconGeometry = (icon: IconData, depthIn: number): THREE.BufferGeometry => {
  // flat icons are a very thin extrusion: the y/z flip below is a 180 degree turn, which would hide a 1-sided plane
  const depth = Math.max(0.012, depthIn);
  const key = `${icon.outline.join("|").slice(0, 200)}#${icon.outline.length}#${depth}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const [, , vw, vh] = icon.viewBox.split(/\s+/).map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}">${icon.outline.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => p.toShapes());
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth * vw, bevelEnabled: false, curveSegments: 8 });
  // flip y (SVG is y-down); flipping z too keeps the triangle winding (and the front faces) intact
  geo.scale(1 / vw, -1 / vh, -1 / vw);
  geo.translate(-0.5, 0.5, depth);
  geo.computeVertexNormals();
  iconCache.set(key, geo);
  return geo;
};

/** A Phosphor icon on a face: `size` world units wide, lying in the xy plane at z = 0 (extruded toward +z). */
export const IconMesh: React.FC<{ name?: string; size: number; depth?: number; finish?: Finish; color?: string; position?: [number, number, number]; rotation?: [number, number, number] }> = ({
  name,
  size,
  depth = 0,
  finish = "glow",
  color,
  position,
  rotation,
}) => {
  const { icons } = useKit3D();
  const data = name ? icons[name.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-duotone$/, "")] : undefined;
  const geo = useMemo(() => (data ? iconGeometry(data, depth) : null), [data, depth]);
  if (!geo) return null;
  return (
    <group position={position} rotation={rotation} scale={[size, size, size]}>
      <Part finish={finish} color={color} outline={depth > 0} geometry={geo}>
        {null}
      </Part>
    </group>
  );
};

// ---------------- motion ----------------

/** Spring progress of an entrance at `enterSec` (0 before, ~1 after, overshoots per config). */
export const useEnter = (enterSec: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(enterSec * fps), fps, config: { damping: 12, stiffness: 140, ...config } });
};

/** Stagger helper: entrance progress of child k of a group that enters at `enterSec`. */
export const useStagger = (enterSec: number, count: number, stepSec = 0.12, config?: { damping?: number; stiffness?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return Array.from({ length: count }, (_, k) => spring({ frame: frame - Math.round((enterSec + k * stepSec) * fps), fps, config: { damping: 13, stiffness: 150, ...config } }));
};

// ---------------- camera ----------------

export type CamState = { ortho: boolean; fov: number; viewH: number; position: number[]; target: number[] };

/** Default camera driven by a pure camera state (lib/scene3d.mjs cameraAt). */
export const CameraRig: React.FC<{ cam: CamState }> = ({ cam }) => {
  const persp = useRef<THREE.PerspectiveCamera>(null);
  const ortho = useRef<THREE.OrthographicCamera>(null);
  const { height } = useThree((s) => s.size);
  useLayoutEffect(() => {
    const c = cam.ortho ? ortho.current : persp.current;
    if (!c) return;
    c.position.set(cam.position[0], cam.position[1], cam.position[2]);
    c.up.set(0, 1, 0);
    c.lookAt(cam.target[0], cam.target[1], cam.target[2]);
    if (c instanceof THREE.OrthographicCamera) c.zoom = height / cam.viewH;
    else c.fov = cam.fov;
    c.updateProjectionMatrix();
  });
  return cam.ortho ? <OrthographicCamera ref={ortho} makeDefault near={0.1} far={200} /> : <PerspectiveCamera ref={persp} makeDefault near={0.1} far={200} fov={cam.fov} />;
};

// ---------------- lights + environment ----------------

export const Lights: React.FC<{ hdri: string | null; span: number; envIntensity: number; shadowRadius: number; set: boolean }> = ({ hdri, span, envIntensity, shadowRadius, set }) => {
  const { look, palette } = useKit3D();
  // a set reaches past the objects: widen the key light's shadow frustum so props near the subject cast too
  const s = Math.max(set ? 9 : 6, span + (set ? 4 : 0));
  const shadowCam = (l: THREE.DirectionalLight | null) => {
    if (!l) return;
    // PCF penumbra width (PCFShadowMap; PCFSoftShadowMap is removed in three r186)
    l.shadow.radius = shadowRadius;
    const c = l.shadow.camera;
    c.left = -s;
    c.right = s;
    c.top = s;
    c.bottom = -s;
    c.near = 0.5;
    c.far = 40;
    c.updateProjectionMatrix();
  };
  const formers = (
    <Environment resolution={256} frames={1} environmentIntensity={look.id === "neon-glass" ? 1 : 0.8}>
      <Lightformer form="rect" intensity={look.id === "neon-glass" ? 3 : 2.5} color="#FFFFFF" position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 4, 1]} />
      <Lightformer form="rect" intensity={look.id === "neon-glass" ? 6 : 1.5} color={look.id === "neon-glass" ? palette.accent : "#FFFFFF"} position={[-6, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[4, 8, 1]} />
      <Lightformer form="rect" intensity={look.id === "neon-glass" ? 6 : 1.2} color={look.id === "neon-glass" ? (palette.accent2 ?? palette.accent) : "#FFF1E0"} position={[6, 2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 8, 1]} />
      <Lightformer form="ring" intensity={2} color="#FFFFFF" position={[0, 3, 8]} scale={3} />
    </Environment>
  );
  const env = hdri ? <Environment files={hdri} environmentIntensity={envIntensity} /> : formers;
  const key = { castShadow: true, "shadow-mapSize": [1024, 1024] as [number, number], "shadow-bias": -0.0005, "shadow-normalBias": 0.03 };
  switch (look.id) {
    // the low-poly formats: one hemisphere + one directional key with a single soft shadow map, nothing else
    case "neon-grid":
      return (
        <>
          <hemisphereLight args={["#4C6FE0", "#050A1F", 1.3]} />
          <directionalLight ref={shadowCam} position={[-5, 9, 7]} intensity={1.6} color="#C9D8FF" {...key} />
        </>
      );
    case "soft-studio":
      return (
        <>
          <hemisphereLight args={["#FFF6EA", "#C9B092", 1.5]} />
          <directionalLight ref={shadowCam} position={[-7, 8, 3]} intensity={2.4} color="#FFE6C7" {...key} />
        </>
      );
    case "moody-night":
      return (
        <>
          {/* blue-dusk sky fill + a warm sodium key from behind the subject (shadows fall toward the camera) */}
          <hemisphereLight args={["#8DA2DE", "#1A2044", 1.7]} />
          <directionalLight ref={shadowCam} position={[-5, 8, -7]} intensity={1.7} color="#FFD3A6" {...key} />
        </>
      );
    case "voxel-world":
      return (
        <>
          <hemisphereLight args={["#CFEAFF", "#6E8F4A", 1.5]} />
          <directionalLight ref={shadowCam} position={[8, 9, 5]} intensity={2.4} color="#FFE8C4" {...key} />
        </>
      );
    case "iso-toon":
      return (
        <>
          <ambientLight intensity={0.9} />
          <directionalLight ref={shadowCam} position={[-4, 10, 7]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
        </>
      );
    case "neon-glass":
      return (
        <>
          {env}
          <ambientLight intensity={0.12} />
          <pointLight position={[-3.5, 3, 3]} intensity={40} distance={14} color={palette.accent} />
          <pointLight position={[3.5, 2.5, -2]} intensity={40} distance={14} color={palette.accent2 ?? palette.accent} />
          <directionalLight position={[0, 8, 4]} intensity={0.6} color="#BFD4FF" />
        </>
      );
    case "pedestal":
      return (
        <>
          {env}
          <spotLight position={[3, 8, 5]} angle={0.5} penumbra={0.85} intensity={90} distance={30} decay={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} color="#FFFFFF" />
          <directionalLight position={[-5, 3, -6]} intensity={2.2} color="#FFD9A0" />
          <directionalLight position={[5, 2, -5]} intensity={1.2} color={palette.accent3 ?? "#9FD8FF"} />
        </>
      );
    case "paper-world":
      // a warm low sun: long soft shadows that show off the folds
      return (
        <>
          {env}
          <hemisphereLight args={["#FFF5E0", "#C9B79A", 0.95]} />
          <directionalLight ref={shadowCam} position={[6, 8, 4]} intensity={2.6} color="#FFE9C7" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.03} shadow-radius={4} />
        </>
      );
    case "toy-blocks":
      // two softboxes over a desk (macro product light): clean rectangular highlights on the plastic
      return (
        <>
          {formers}
          <ambientLight intensity={0.35} />
          <directionalLight ref={shadowCam} position={[-5, 9, 6]} intensity={2.2} color="#FFFFFF" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.02} shadow-radius={5} />
          <directionalLight position={[6, 4, -3]} intensity={0.8} color="#FFE2B8" />
        </>
      );
    case "holo-studio":
      // a dark stage: the projector light comes from below
      return (
        <>
          <ambientLight intensity={0.15} />
          <pointLight position={[0, 0.3, 0]} intensity={8} distance={8} color="#2DE2FF" />
          <directionalLight position={[0, 6, 6]} intensity={0.4} color="#9FEFFF" />
        </>
      );
    case "data-stage":
      // a dark arena: a top key, an accent rim from behind and a faint cool fill; spotlights come from `fx`
      return (
        <>
          {env}
          <hemisphereLight args={["#3A4A80", "#05060C", 0.7]} />
          <directionalLight ref={shadowCam} position={[-3, 11, 6]} intensity={1.5} color="#FFEBC8" {...key} />
          <directionalLight position={[0, 4, -9]} intensity={1.4} color={palette.accent2 ?? palette.accent} />
        </>
      );
    case "monolith-story":
      // a raking low key that carves the faces of a tall object, plus a colored rim from behind
      return (
        <>
          {env}
          <hemisphereLight args={["#8FA0D0", "#171A28", 0.9]} />
          <directionalLight ref={shadowCam} position={[-6, 4, 6]} intensity={2.3} color="#FFE3C0" {...key} />
          <directionalLight position={[5, 3, -8]} intensity={1.3} color={palette.accent2 ?? palette.accent} />
        </>
      );
    case "cutaway-explainer":
      // soft daylight: a sky/ground hemisphere, one warm key with a soft shadow, a faint cool fill from the left
      return (
        <>
          <hemisphereLight args={["#F2F8FF", "#D8C7A8", 2.3]} />
          <directionalLight ref={shadowCam} position={[4, 9, 8]} intensity={1.5} color="#FFE2B5" {...key} />
          <directionalLight position={[-6, 3, 4]} intensity={0.45} color="#CFE0FF" />
        </>
      );
    case "clay-mascot":
    case "clay-diorama":
    default:
      return (
        <>
          {env}
          <hemisphereLight args={["#FFF3E2", "#B9A8DA", 1.05]} />
          <directionalLight ref={shadowCam} position={[4, 10, 6]} intensity={2.3} color="#FFF6EA" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.03} shadow-radius={6} />
          <directionalLight position={[-6, 3, -2]} intensity={0.5} color="#CFE0FF" />
        </>
      );
  }
};

// ---------------- floors ----------------

const roundedDiscProfile = (r: number, h: number, fillet: number) => {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -h)];
  for (let k = 0; k <= 6; k++) {
    const a = -Math.PI / 2 + (k / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - fillet + Math.cos(a) * fillet, -h + fillet + Math.sin(a) * fillet));
  }
  for (let k = 0; k <= 6; k++) {
    const a = (k / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - fillet + Math.cos(a) * fillet, -fillet + Math.sin(a) * fillet));
  }
  pts.push(new THREE.Vector2(0, 0));
  return pts;
};

/** The ground of a look, sized to the content bounds (half extents in x/z). */
export const Floor: React.FC<{ half: [number, number]; center: [number, number] }> = ({ half, center }) => {
  const { look, palette } = useKit3D();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = Math.max(half[0], half[1]) + 0.6;
  const lathe = useMemo(() => new THREE.LatheGeometry(roundedDiscProfile(r, 0.42, 0.14), 64), [r]);
  const ped = useMemo(() => new THREE.LatheGeometry(roundedDiscProfile(r * 0.92, 0.22, 0.06), 64), [r]);
  switch (look.floor) {
    case "iso": {
      const w = half[0] * 2 + 1.6;
      const d = half[1] * 2 + 1.6;
      return (
        <group position={[center[0], 0, center[1]]}>
          <RBox args={[w, 0.34, d]} radius={0.06} position={[0, -0.17, 0]} color={mixHex(palette.bg[1] ?? palette.bg[0], palette.accent3 ?? "#4CC9F0", 0.22)} />
          <gridHelper args={[Math.max(w, d), Math.round(Math.max(w, d) / 0.6), "#3A5296", "#2A3C72"]} position={[0, 0.004, 0]} scale={[w / Math.max(w, d), 1, d / Math.max(w, d)]} />
        </group>
      );
    }
    case "neon":
      return (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]}>
            <planeGeometry args={[60, 60]} />
            <MeshReflectorMaterial resolution={512} mirror={0.55} blur={[260, 80]} mixBlur={1} mixStrength={2.2} roughness={0.85} depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#05060D" metalness={0.6} />
          </mesh>
          <gridHelper args={[60, 60, palette.accent, mixHex(palette.accent, "#000000", 0.55)]} position={[center[0], 0.003, center[1] + ((frame / fps) * 0.35) % 1]} material-transparent material-opacity={0.22} />
        </group>
      );
    case "mirror":
      return (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.22, center[1]]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <MeshReflectorMaterial resolution={512} mirror={0.7} blur={[300, 90]} mixBlur={1} mixStrength={1.6} roughness={0.9} depthScale={0.8} minDepthThreshold={0.35} maxDepthThreshold={1.4} color="#0B0B0F" metalness={0.5} />
          </mesh>
          <mesh geometry={ped} position={[center[0], 0, center[1]]} castShadow receiveShadow>
            <meshPhysicalMaterial color="#141418" metalness={0.35} roughness={0.32} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1} />
          </mesh>
        </group>
      );
    case "paper": {
      // a faceted paper island (9-sided slab) with low-poly hills and cone trees at its rim
      const R = Math.max(half[0], half[1]) + 1.4;
      const deco = Array.from({ length: 9 }, (_, k) => {
        const a = (k / 9) * Math.PI * 2 + 0.4;
        const rr = R * (0.82 + random(`pf-${k}`) * 0.1);
        return { x: center[0] + Math.cos(a) * rr, z: center[1] + Math.sin(a) * rr, s: 0.35 + random(`ps-${k}`) * 0.35, tree: k % 3 !== 0 };
      }).filter((d) => d.z < center[1] + R * 0.2); // keep the rim behind the subject, never in front of it
      const ground = mixHex(palette.accent3 ?? "#7CC08A", "#FFF8EC", 0.35);
      return (
        <group>
          <mesh position={[center[0], -0.25, center[1]]} receiveShadow castShadow>
            <cylinderGeometry args={[R, R * 1.05, 0.5, 9, 1]} />
            <meshStandardMaterial color={ground} roughness={1} flatShading />
          </mesh>
          {deco.map((d, k) =>
            d.tree ? (
              <group key={k} position={[d.x, 0, d.z]} scale={d.s * 1.6}>
                <mesh position={[0, 0.9, 0]} castShadow>
                  <coneGeometry args={[0.45, 1.3, 6]} />
                  <meshStandardMaterial color={mixHex("#4E9A5B", "#FFF8EC", 0.15)} roughness={1} flatShading />
                </mesh>
                <mesh position={[0, 0.15, 0]} castShadow>
                  <cylinderGeometry args={[0.08, 0.1, 0.3, 5]} />
                  <meshStandardMaterial color="#8A6A4A" roughness={1} flatShading />
                </mesh>
              </group>
            ) : (
              <mesh key={k} position={[d.x, 0.1, d.z]} scale={[d.s * 2.2, d.s * 1.2, d.s * 2.2]} castShadow>
                <icosahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial color={mixHex(palette.accent2 ?? "#E9C46A", "#FFF8EC", 0.3)} roughness={1} flatShading />
              </mesh>
            ),
          )}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -1.2, center[1]]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <shadowMaterial opacity={0.14} color="#5A4630" />
          </mesh>
        </group>
      );
    }
    case "baseplate":
      return <Baseplate half={half} center={center} />;
    case "set":
      // a look whose floor is its environment set, rendered with set "none": a plain ground that catches shadows
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.01, center[1]]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={look.ground ? look.ground(palette) : mixHex(palette.bg[1] ?? palette.bg[0], "#000000", 0.25)} roughness={0.85} />
        </mesh>
      );
    case "holopad": {
      // projector pad: dark disc, glowing concentric rings, a slow dashed ring and a faint light cone
      const R = Math.max(half[0], half[1]) + 0.9;
      const t = frame / fps;
      return (
        <group position={[center[0], 0, center[1]]}>
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[R, R * 1.04, 0.16, 64]} />
            <meshStandardMaterial color="#061118" roughness={0.35} metalness={0.6} />
          </mesh>
          {[1, 0.78, 0.55].map((k, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005 + i * 0.002, 0]}>
              <ringGeometry args={[R * k - 0.05, R * k, 96]} />
              <meshBasicMaterial color={new THREE.Color("#2DE2FF").multiplyScalar(1.6 - i * 0.3)} toneMapped={false} transparent opacity={0.85 - i * 0.2} />
            </mesh>
          ))}
          <mesh rotation={[-Math.PI / 2, 0, t * 0.4]} position={[0, 0.01, 0]}>
            <ringGeometry args={[R * 0.9, R * 0.93, 48, 1, 0, Math.PI * 1.3]} />
            <meshBasicMaterial color={new THREE.Color(palette.accent).multiplyScalar(1.4)} toneMapped={false} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[R * 0.75, R * 0.95, 3.2, 48, 1, true]} />
            <meshBasicMaterial color="#2DE2FF" transparent opacity={0.018} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <gridHelper args={[40, 80, "#0B3A48", "#06222C"]} position={[0, -0.17, 0]} />
        </group>
      );
    }
    case "plinth":
    default:
      return (
        <group>
          <mesh geometry={lathe} position={[center[0], 0, center[1]]} castShadow receiveShadow>
            <meshStandardMaterial color={mixHex(palette.accent2 ?? palette.accent, "#FFFFFF", 0.72)} roughness={0.85} />
          </mesh>
          {/* soft floor far below catches the plinth's shadow, so the diorama floats */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -1.4, center[1]]} receiveShadow>
            <planeGeometry args={[40, 40]} />
            <shadowMaterial opacity={0.16} color="#4A2E1E" />
          </mesh>
        </group>
      );
  }
};

/** Toy baseplate with studs on a wooden desk (instanced studs, generic toy bricks: no brand). */
const Baseplate: React.FC<{ half: [number, number]; center: [number, number] }> = ({ half, center }) => {
  const { palette } = useKit3D();
  const ref = useRef<THREE.InstancedMesh>(null);
  const pitch = 0.5;
  const nx = Math.max(8, Math.ceil((half[0] * 2 + 2.4) / pitch));
  const nz = Math.max(8, Math.ceil((half[1] * 2 + 2.4) / pitch));
  const w = nx * pitch;
  const d = nz * pitch;
  const studGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), []);
  const plate = mixHex(palette.accent3 ?? "#2BB24C", "#000000", 0.08);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    let i = 0;
    for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) m.setMatrixAt(i++, mat.makeTranslation(-w / 2 + pitch / 2 + x * pitch, 0.05, -d / 2 + pitch / 2 + z * pitch));
    m.instanceMatrix.needsUpdate = true;
  }, [nx, nz, w, d]);
  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh position={[0, -0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.16, d]} />
        <meshPhysicalMaterial color={plate} roughness={0.35} clearcoat={0.5} />
      </mesh>
      <instancedMesh ref={ref} args={[studGeo, undefined, nx * nz]} castShadow receiveShadow>
        <meshPhysicalMaterial color={plate} roughness={0.35} clearcoat={0.5} />
      </instancedMesh>
      {/* the real desk the toy world sits on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.17, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#B98B5E" roughness={0.7} />
      </mesh>
    </group>
  );
};

// ---------------- particles (seeded, frame-driven) ----------------

export const Particles: React.FC<{ seed: number; center: [number, number, number] }> = ({ seed, center }) => {
  const { look, palette, gradient } = useKit3D();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ref = useRef<THREE.InstancedMesh>(null);
  const kind = look.particles;
  const n = kind === "sparks" ? 70 : kind === "cubes" ? 18 : kind === "motes" ? 40 : kind === "flakes" ? 26 : kind === "bricks" ? 12 : kind === "data" ? 60 : 46;
  const geo = useMemo(
    () =>
      kind === "cubes"
        ? new THREE.BoxGeometry(0.16, 0.16, 0.16)
        : kind === "sparks"
          ? new THREE.OctahedronGeometry(0.035, 0)
          : kind === "flakes"
            ? new THREE.PlaneGeometry(0.16, 0.1)
            : kind === "bricks"
              ? new THREE.BoxGeometry(0.24, 0.12, 0.12)
              : kind === "data"
                ? new THREE.BoxGeometry(0.012, 0.22, 0.012)
                : new THREE.SphereGeometry(0.03, 8, 6),
    [kind],
  );
  const col =
    kind === "sparks" ? palette.accent : kind === "cubes" ? (palette.accent3 ?? palette.accent) : kind === "motes" ? "#FFE2B0" : kind === "flakes" ? (palette.accent2 ?? palette.accent) : kind === "bricks" ? palette.accent : kind === "data" ? "#7CF7FF" : "#FFFFFF";
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const r = (k: number) => random(`p-${seed}-${i}-${k}`);
      const speed = 0.12 + r(3) * 0.3;
      const range = 6;
      // flakes and bricks fall (paper confetti, a dropped brick), the rest rises
      const dir = kind === "flakes" || kind === "bricks" ? -1 : 1;
      const raw = (r(1) * range + dir * t * speed * (kind === "sparks" || kind === "data" ? 2.2 : 1)) % range;
      const y = (raw + range) % range - 0.5;
      const x = center[0] + (r(0) - 0.5) * 11 + Math.sin(t * 0.6 + i) * 0.15;
      const z = center[2] + (r(2) - 0.5) * 9 - 1.5;
      const s = (look.particles === "sparks" ? 0.6 + r(4) * 1.4 : 0.5 + r(4)) * Math.min(1, Math.sin((y / range) * Math.PI) * 2 + 0.05);
      e.set(t * (0.5 + r(5)), t * (0.3 + r(6)), 0);
      q.setFromEuler(e);
      mat.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]} frustumCulled={false}>
      {kind === "flakes" ? <meshStandardMaterial color={col} roughness={1} side={THREE.DoubleSide} flatShading /> : kind === "bricks" ? <meshPhysicalMaterial color={col} roughness={0.3} clearcoat={0.6} /> : look.particles === "cubes" ? <meshToonMaterial color={col} gradientMap={gradient} transparent opacity={0.55} /> : <meshBasicMaterial color={look.bloom ? new THREE.Color(col).multiplyScalar(1.6) : col} toneMapped={!look.bloom} transparent opacity={look.particles === "dust" ? 0.55 : 0.85} />}
    </instancedMesh>
  );
};

// ---------------- connections ----------------

/** Animated arrow between two world points: the tube draws on, the head pops, a packet travels along it. */
export const Connection: React.FC<{ from: [number, number, number]; to: [number, number, number]; enter: number; color: string; seed: number }> = ({ from, to, enter, color, seed }) => {
  const { look } = useKit3D();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { curve, tube } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    // trim so the arrow starts/ends outside the objects
    const a2 = a.clone().add(dir.clone().multiplyScalar(0.55 / len));
    const b2 = b.clone().sub(dir.clone().multiplyScalar(0.7 / len));
    const mid = a2.clone().lerp(b2, 0.5).add(new THREE.Vector3(0, 0.35 + len * 0.18, 0));
    const c = new THREE.QuadraticBezierCurve3(a2, mid, b2);
    return { curve: c, tube: new THREE.TubeGeometry(c, 64, look.id === "iso-toon" ? 0.06 : 0.045, 10, false) };
  }, [from, to, look.id]);
  const p = Math.max(0, Math.min(1, (t - enter) / 0.55));
  const eased = 1 - (1 - p) ** 3;
  useLayoutEffect(() => {
    tube.setDrawRange(0, Math.floor(eased * 64) * 10 * 6);
  });
  if (p <= 0) return null;
  const end = curve.getPoint(1);
  const tan = curve.getTangent(1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan.normalize());
  const cycle = 1.3;
  const k = ((t - enter - 0.55 + seed * 0.37) % cycle) / cycle;
  const packet = p >= 1 && k >= 0 ? curve.getPoint(k) : null;
  return (
    <group>
      <Part geometry={tube} finish={look.bloom ? "glow" : "body"} color={color} outline={false}>
        {null}
      </Part>
      {p >= 1 ? (
        <Part position={end} quaternion={q} finish={look.bloom ? "glow" : "body"} color={color} outline={false}>
          <coneGeometry args={[0.16, 0.34, 20]} />
        </Part>
      ) : null}
      {packet ? (
        <mesh position={packet}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshBasicMaterial color={look.bloom ? new THREE.Color("#FFFFFF").multiplyScalar(2.5) : "#FFFFFF"} toneMapped={!look.bloom} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---------------- highlight ring ----------------

export const HighlightRing: React.FC<{ radius: number; color: string; enter: number }> = ({ radius, color, enter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - enter;
  if (t < 0) return null;
  const pulse = 1 + 0.06 * Math.sin(t * 5);
  const grow = Math.min(1, t / 0.4);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[pulse * grow, pulse * grow, 1]}>
      <ringGeometry args={[radius, radius + 0.08, 64]} />
      <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2)} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---------------- bloom (three.js EffectComposer built synchronously, so the very first frame is complete) ----------------

/**
 * Bloom post-processing that takes over rendering (useFrame priority 1). The composer and its passes are created during
 * render (useMemo), not in an effect: a still or a freshly mounted scene renders exactly one frame, and it must
 * already include the bloom. Frame-pure: UnrealBloomPass has no time or random input.
 */
export const BloomRender: React.FC<{ strength: number; threshold: number; radius?: number }> = ({ strength, threshold, radius = 0.55 }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const { composer, pass } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, target);
    c.setPixelRatio(1);
    c.setSize(size.width, size.height);
    const rp = new RenderPass(scene, camera);
    c.addPass(rp);
    c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width / 2, size.height / 2), strength, radius, threshold));
    c.addPass(new OutputPass());
    return { composer: c, pass: rp };
    // the camera is read at render time (CameraRig swaps in its own default camera after mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, size.width, size.height, strength, threshold, radius]);
  useFrame((state) => {
    pass.camera = state.camera;
    composer.render();
  }, 1);
  return null;
};
