// One scene of a spec with a persistent `stage` (lib/scene3d-stage.mjs): the same world every scene, drawn at global time
// g = scene start + local time. Actors (custom models with beat-driven part states), a low-poly heightfield terrain with a
// strata cutaway face, liquids with a waved surface and rising vapor, instanced scatter, the continuous camera, and a title on
// a palette-derived pill that stays inside the title band. Everything is a pure function of g: stills and renders are deterministic.
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import { cameraAt, look3dOf, projectPoint, RENDER3D } from "../../lib/scene3d.mjs";
import { EASE } from "../../lib/scene3d-motion.mjs";
import { buoyantRock, liquidSurfaceY, levelRate, stageState, terrainHeightAt, terrainHeights, terrainStones } from "../../lib/scene3d-stage.mjs";
import type { IconData, ResolvedSpec, Scene, ScenePlan3D, StageActor3D, StageLiquid3D, StagePlan3D, StageTerrain3D, ThreeAssets } from "../types";
import { rgba } from "../util";
import { REGIONS } from "../../lib/illustrated.mjs";
import { fitText } from "../illustrated/headlines";
import { BloomRender, CameraRig, Floor, Kit3DContext, Lights, Particles, makeToonRamp, mixHex, useKit3D } from "./kit";
import { backdropStops, WorldGround, WorldView } from "./world";
import { color3d, look3dFor, mixHexColor } from "./looks";
import { CutawayOverlay } from "./overlay3d";
import { ensureLookFonts } from "../illustrated/looks";
import { CustomModel, partWorldMatrix, useOpacity, type CustomObject, type MotionCtx, type PartState, type Pulse } from "./custom";
import { FxLayer, pulsesFor, type Fx3D } from "./fx";
import { Label, gradientHex, resolveTags, type Tag } from "./Scene3D";

type V3 = [number, number, number];
type NodeState = { pos: V3; rot: V3; scale: V3; opacity: number; visible: boolean; emissive: number; color: { c: string; w: number } | null };
type StageState = { actors: Record<string, NodeState & { parts: Record<string, NodeState> }>; liquids: Record<string, { level: number; opacity: number; visible: boolean; color: { c: string; w: number } | null }>; camera: { shift: V3; pitch: number; yaw: number; zoom: number } };
const stateOf = (plan: StagePlan3D, g: number, resolve: (c: string) => string) => stageState(plan, g, resolve) as unknown as StageState;
const DEG = Math.PI / 180;
type RenderProfile = { tone: string; exposure: number; envIntensity: number; shadowRadius: number; bloom: { strength: number; threshold: number; radius: number } | null; fog: { near: number; far: number; add: number } | null };

/** Earth palette of the strata, pulled a little toward the palette background so the cutaway sits in the video's colors. */
const EARTH: Record<string, string> = { topsoil: "#7A4A29", subsoil: "#9A683A", clay: "#B78850", rock: "#7F838C" };
const GRASS = "#62AE3F";

// ---------------- terrain ----------------

type Edge = { n: number; at: (k: number) => [number, number]; h: (k: number) => number };

/** Terrain mesh: flat-shaded top triangles (grass above the surface level, strata colors in a pit) and cutaway walls on three sides. */
const buildTerrain = (t: StageTerrain3D, h: Float32Array, strata: { y: number; color: string }[], grass: string, grassDark: string): THREE.BufferGeometry => {
  const N = t.grid;
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const X = (i: number) => t.pos[0] - t.size[0] / 2 + (i * t.size[0]) / (N - 1);
  const Z = (j: number) => t.pos[1] - t.size[1] / 2 + (j * t.size[1]) / (N - 1);
  const tri = (a: V3, b: V3, d: V3, color: string) => {
    pos.push(...a, ...b, ...d);
    c.set(color);
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
  };
  const layerAt = (y: number) => (strata.find((s) => y >= s.y) ?? strata[strata.length - 1]).color;
  for (let j = 0; j < N - 1; j++)
    for (let i = 0; i < N - 1; i++) {
      const a: V3 = [X(i), h[j * N + i], Z(j)];
      const b: V3 = [X(i + 1), h[j * N + i + 1], Z(j)];
      const d: V3 = [X(i), h[(j + 1) * N + i], Z(j + 1)];
      const e: V3 = [X(i + 1), h[(j + 1) * N + i + 1], Z(j + 1)];
      const checker = (i + j) % 2 ? grass : grassDark;
      const pick = (y: number) => (y > -0.05 ? checker : layerAt(y - 0.05));
      tri(a, d, b, pick((a[1] + d[1] + b[1]) / 3));
      tri(b, d, e, pick((b[1] + d[1] + e[1]) / 3));
    }
  const wall = (edge: Edge) => {
    for (let k = 0; k < edge.n - 1; k++) {
      const [xa, za] = edge.at(k);
      const [xb, zb] = edge.at(k + 1);
      const ha = edge.h(k);
      const hb = edge.h(k + 1);
      const quad = (ta: number, tb: number, ba: number, bb: number, color: string) => {
        if (ta <= ba && tb <= bb) return;
        const pa: V3 = [xa, Math.max(ta, ba), za];
        const pb: V3 = [xb, Math.max(tb, bb), zb];
        tri(pa, [xa, ba, za], pb, color);
        tri(pb, [xa, ba, za], [xb, bb, zb], color);
      };
      const strip = ha > -0.05 && hb > -0.05 ? 0.16 : 0;
      if (strip) quad(ha, hb, ha - strip, hb - strip, grass);
      let prev = Infinity;
      strata.forEach((s) => {
        quad(Math.min(ha - strip, prev), Math.min(hb - strip, prev), s.y, s.y, s.color);
        prev = s.y;
      });
    }
  };
  wall({ n: N, at: (k) => [X(k), Z(N - 1)], h: (k) => h[(N - 1) * N + k] }); // front (camera side, +z)
  wall({ n: N, at: (k) => [X(0), Z(N - 1 - k)], h: (k) => h[(N - 1 - k) * N] }); // left
  wall({ n: N, at: (k) => [X(N - 1), Z(k)], h: (k) => h[k * N + N - 1] }); // right
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const Terrain: React.FC<{ terrain: StageTerrain3D; heights: Float32Array; sig: string; g: number }> = ({ terrain, heights, sig, g }) => {
  const { look, palette } = useKit3D();
  const earth = (c: string) => mixHexColor(c in EARTH ? EARTH[c] : color3d(palette, look, c, EARTH.subsoil), palette.bg[1] ?? palette.bg[0], 0.08);
  const grass = mixHexColor(terrain.top ? color3d(palette, look, terrain.top, GRASS) : GRASS, palette.accent3 ?? palette.accent, 0.06);
  const geo = useMemo(
    () => buildTerrain(terrain, heights, terrain.strata.map((s) => ({ y: -s.to, color: earth(s.color) })), grass, mixHexColor(grass, "#000000", 0.07)),
    // the heightfield only changes while a carve is in progress (sig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig, terrain, palette],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  const stones = useMemo(() => terrainStones(terrain) as { x: number; z: number; y: number; s: number; rot: V3; buried: boolean }[], [terrain]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const rock = mixHexColor(earth("rock"), "#FFFFFF", 0.1);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const front = terrain.pos[1] + terrain.size[1] / 2;
    stones.forEach((s, i) => {
      const ground = terrainHeightAt(terrain, heights, s.x, s.buried ? front : s.z);
      // buried stones sit in the cutaway face and disappear once dug out; surface stones ride the ground
      const y = s.buried ? s.y : ground + s.s * 0.25;
      const gone = s.buried && y + s.s * 0.7 > ground - 0.04;
      const z = s.buried ? front - s.s * 0.12 : s.z;
      m.compose(new THREE.Vector3(s.x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(...s.rot)), gone ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(s.s, s.s * 0.75, s.s * 0.85));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  void g;
  return (
    <>
      <mesh geometry={geo} castShadow={look.shadows} receiveShadow={look.shadows}>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {stones.length ? (
        <instancedMesh ref={ref} args={[undefined, undefined, stones.length]} frustumCulled={false} castShadow={look.shadows}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={rock} flatShading roughness={0.9} />
        </instancedMesh>
      ) : null}
    </>
  );
};

// ---------------- liquids ----------------

const LiquidView: React.FC<{ l: StageLiquid3D; level: number; opacity: number; tint: { c: string; w: number } | null; g: number; rate: number }> = ({ l, level, opacity, tint, g, rate }) => {
  const { look, palette } = useKit3D();
  const [x0, z0, x1, z1] = [Math.min(l.area[0], l.area[2]), Math.min(l.area[1], l.area[3]), Math.max(l.area[0], l.area[2]), Math.max(l.area[1], l.area[3])];
  const w = x1 - x0;
  const d = z1 - z0 - 0.02;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2 - 0.01;
  const base = mixHexColor(l.color ? color3d(palette, look, l.color, "#2E9BE6") : "#2E9BE6", palette.accent3 ?? palette.accent, 0.12);
  const color = tint ? mixHex(base, tint.c, tint.w) : base;
  const sy = liquidSurfaceY(l, level);
  const h = Math.max(0.001, sy - l.floor);
  const surf = useRef<THREE.Mesh>(null);
  const vap = useRef<THREE.InstancedMesh>(null);
  const strength = l.wave * Math.min(1, level * 5);
  useLayoutEffect(() => {
    const geo = surf.current?.geometry;
    if (!geo) return;
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const y = p.getY(k);
      p.setZ(k, strength * (0.03 * Math.sin(g * 2.6 + x * 3.1 + y * 1.7) + 0.018 * Math.sin(g * 4.1 - x * 2.3 + y * 3.9)));
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    const m = vap.current;
    if (m) {
      const q = new THREE.Matrix4();
      const on = clamp01((-rate - 0.03) / 0.15);
      for (let k = 0; k < 18; k++) {
        const ph = (g * 0.5 + k / 18) % 1;
        const px = x0 + (0.1 + 0.8 * ((k * 0.618) % 1)) * w;
        const pz = z0 + (0.1 + 0.8 * ((k * 0.381 + 0.2) % 1)) * d;
        const s = on * 0.09 * Math.sin(Math.PI * ph);
        q.compose(new THREE.Vector3(px + Math.sin(g * 1.5 + k) * 0.08, sy + ph * 1.3, pz), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
        m.setMatrixAt(k, q);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });
  if (level < 0.004 || opacity < 0.01) return null;
  return (
    <>
      <mesh position={[cx, l.floor + h / 2, cz]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} transparent opacity={l.opacity * opacity * 0.62} roughness={0.15} depthWrite={false} />
      </mesh>
      <mesh ref={surf} position={[cx, sy, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d, 14, 14]} />
        <meshStandardMaterial color={mixHex(color, "#FFFFFF", 0.12)} transparent opacity={Math.min(0.92, l.opacity * opacity + 0.12)} roughness={0.12} metalness={0.05} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={vap} args={[undefined, undefined, 18]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} depthWrite={false} />
      </instancedMesh>
    </>
  );
};

// ---------------- actors ----------------

const ActorGroup: React.FC<{ pos: V3; rot: V3; scale: V3; op: number; children: React.ReactNode }> = ({ pos, rot, scale, op, children }) => {
  const ref = useRef<THREE.Group>(null);
  useOpacity(ref, op);
  return (
    <group ref={ref} position={pos} rotation={rot} scale={scale}>
      {children}
    </group>
  );
};

const objectOf = (a: StageActor3D): CustomObject => ({ kind: "custom", id: a.id, parts: a.parts as never, motion: a.motion as never, keys: a.keys as never });

// ---------------- title ----------------

const StageTitle: React.FC<{ kicker?: string; main: string; plan: StagePlan3D; font: string }> = ({ kicker, main, plan, font }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = REGIONS.title;
  const b = plan.title;
  const KICK = kicker ? 46 : 0;
  const text = main.toUpperCase();
  const fit = fitText(text, r.w - 150, r.h - KICK - 90, 0.6, 76, 2, 1.06);
  const p = spring({ frame: frame - 3, fps, config: { damping: 14, stiffness: 150 } });
  const out = interpolate(frame, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", justifyContent: "center", alignItems: "flex-start", opacity: out }}>
      <div style={{ transform: `translateY(${(1 - Math.min(1, p)) * -40}px) scale(${0.94 + 0.06 * Math.min(1, p)})`, maxWidth: r.w - 40, padding: "16px 44px 20px", borderRadius: 30, background: rgba(b.fill, b.fillAlpha), borderBottom: `7px solid ${b.rule}`, boxShadow: "0 14px 34px rgba(0,0,0,0.35)", textAlign: "center" }}>
        {kicker ? <div style={{ fontFamily: font, fontWeight: 800, fontSize: 34, letterSpacing: 3, textTransform: "uppercase", color: b.rule, height: KICK }}>{kicker}</div> : null}
        <div style={{ fontFamily: font, fontWeight: 900, fontSize: fit.size, lineHeight: 1.06, letterSpacing: -1, color: b.ink }}>{text}</div>
      </div>
    </div>
  );
};

// ---------------- scene ----------------

export const StageView: React.FC<{ scene: Scene; index: number; spec: ResolvedSpec; durationInFrames: number; plan: ScenePlan3D | null; icons: Record<string, IconData>; three: ThreeAssets | null }> = ({ scene, index, spec, plan, icons, three }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const lookId = look3dOf(spec);
  const look = look3dFor(lookId);
  const palette = spec.theme.palette;
  ensureLookFonts();
  const gradient = useMemo(() => (look.material === "toon" ? makeToonRamp() : null), [look.material]);
  const st = plan!.stage!;
  const t = frame / fps;
  const g = (plan!.t0 ?? 0) + t;
  const resolve = (c: string) => color3d(palette, look, c, "#888888");
  const state = stateOf(st, g, resolve);
  const cam = cameraAt({ t: g, sceneSec: st.totalSec, look: lookId, move: "static", frame: plan!.frame, keys: plan!.cameraKeys ?? null, extra: state.camera });
  const profile = (RENDER3D as Record<string, RenderProfile>)[lookId] ?? (RENDER3D as Record<string, RenderProfile>)["clay-diorama"];
  const terrain = st.terrain;
  const carveSig = terrain ? terrain.carves.map((c) => clamp01((g - c.t) / Math.max(1e-6, c.dur)).toFixed(4)).join(",") : "";
  const heights = useMemo(() => (terrain ? (terrainHeights(terrain, terrain.carves, g) as Float32Array) : null), [terrain, carveSig]); // eslint-disable-line react-hooks/exhaustive-deps
  const heightAt = terrain && heights ? (x: number, z: number) => terrainHeightAt(terrain, heights, x, z) as number : null;
  const world = st.world;
  const worldBackdrop = world?.backdrop ? mixHexColor(color3d(palette, look, world.backdrop, palette.bg[0]), palette.bg[0], 0.5) : null;
  const bg = worldBackdrop ? { ...look.bg(palette), stops: backdropStops(worldBackdrop) } : look.bg(palette);
  const fogColor = look.fog ?? gradientHex(bg.stops, 0.55);
  const span = Math.max(terrain ? Math.max(terrain.size[0], terrain.size[1]) / 2 : 3, ...st.actors.map((a) => a.placed.half ?? 1)) + 3;
  const hdri = three?.hdri ? staticFile(three.hdri) : null;
  const cycle = [palette.accent, palette.accent2 ?? palette.accent, palette.accent3 ?? palette.accent];
  const sec = (m: number | string | undefined) => (typeof m === "number" ? m : (plan!.moments?.[m ?? ""] ?? 0));
  const fx = (scene.visual.type === "scene3d" ? ((scene.visual as { fx?: Fx3D[] }).fx ?? []) : []) as Fx3D[];
  const toPart = (sp: NodeState | undefined): PartState | undefined => sp;
  const actorLive = (k: number, gg: number) => {
    const a = st.actors[k];
    const s = (gg === g ? state : stateOf(st, gg, resolve)).actors[a.id];
    const pl = a.placed;
    const pop = gg < a.at ? 0 : EASE.back(clamp01((gg - a.at) / 0.45));
    const rock = buoyantRock(a.buoyant, s.pos[1], gg) as [number, number];
    const pos: V3 = [pl.pos[0] + s.pos[0], pl.pos[1] + s.pos[1], pl.pos[2] + s.pos[2]];
    const rot: V3 = [a.rot[0] * DEG + s.rot[0] * DEG + rock[0], a.rot[1] * DEG + s.rot[1] * DEG, a.rot[2] * DEG + s.rot[2] * DEG + rock[1]];
    const scale = s.scale.map((x: number) => Math.max(1e-4, x * pl.scale * pop)) as V3;
    return { s, pos, rot, scale, visible: s.visible && pop > 0 };
  };
  const motionCtx = (k: number): MotionCtx => ({ sec: (m) => (typeof m === "number" ? m : 0), enter: st.actors[k].at, seed: k + 1 });
  const targetAt = (target: string, tt: number): { pos: V3; h: number } | null => {
    const [oid, pid] = target.split("/");
    const k = st.actors.findIndex((a) => a.id === oid);
    if (k < 0) return null;
    const gg = (plan!.t0 ?? 0) + tt;
    const lv = actorLive(k, gg);
    if (!lv.visible) return null;
    const a = st.actors[k];
    if (pid === undefined) return { pos: lv.pos, h: a.placed.h * (lv.scale[1] / Math.max(1e-6, a.placed.scale)) };
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...lv.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...lv.rot)), new THREE.Vector3(...lv.scale));
    const w = partWorldMatrix(objectOf(a), pid, gg, motionCtx(k), m, null, (id) => toPart(lv.s.parts[id]));
    if (!w) return null;
    const v = new THREE.Vector3().setFromMatrixPosition(w);
    return { pos: [v.x, v.y, v.z], h: 0.4 * a.placed.scale };
  };
  // actor labels
  const tags: Tag[] = [];
  st.actors.forEach((a, k) => {
    if (!a.label) return;
    const lv = actorLive(k, g);
    if (!lv.visible) return;
    const p = projectPoint(cam, [lv.pos[0], lv.pos[1] + a.placed.h * (lv.scale[1] / Math.max(1e-6, a.placed.scale)) + 0.28, lv.pos[2]], width, height);
    tags.push({ x: p.x, y: p.y - 30, ax: p.x, ay: p.y, w: a.label.length * look.label.size * 0.68 + 56, text: a.label, enter: Math.max(0, a.at - (plan!.t0 ?? 0)) + 0.25 });
  });
  const placedTags = resolveTags(tags);
  const toneMapping = profile.tone === "neutral" ? THREE.NeutralToneMapping : profile.tone === "aces" ? THREE.ACESFilmicToneMapping : profile.tone === "agx" ? THREE.AgXToneMapping : THREE.NoToneMapping;
  const center: [number, number] = terrain ? [terrain.pos[0], terrain.pos[1]] : [0, 0];
  const half: [number, number] = terrain ? [terrain.size[0] / 2, terrain.size[1] / 2] : [3, 3];
  const title = scene.title?.main ?? scene.onScreenText;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 38% at 50% 50%, ${rgba(bg.glow, bg.glowAlpha)} 0%, ${rgba(bg.glow, 0)} 100%), linear-gradient(180deg, ${bg.stops.join(", ")})` }} />
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        shadows={look.shadows ? "percentage" : false}
        flat={profile.tone === "none"}
        gl={{ antialias: true, alpha: !profile.bloom, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = toneMapping;
          gl.toneMappingExposure = profile.exposure;
          if (profile.bloom) gl.setClearColor(bg.stops[1] ?? "#04050B", 1);
          else gl.setClearColor(0x000000, 0);
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Kit3DContext.Provider value={{ look, palette, icons, gradient }}>
          <CameraRig cam={cam} />
          {profile.bloom ? <color attach="background" args={[mixHex(bg.stops[1] ?? "#04050B", "#000000", 0.35)]} /> : null}
          {profile.fog ? <fog attach="fog" args={[fogColor, plan!.frame.dist * profile.fog.near + profile.fog.add + 8, plan!.frame.dist * profile.fog.far + profile.fog.add * 3 + 8]} /> : null}
          <Lights hdri={hdri} span={span} envIntensity={profile.envIntensity} shadowRadius={profile.shadowRadius} set={true} />
          {world?.ground && world.ground.kind !== "look" ? <WorldGround ground={world.ground} center={center} half={half} /> : !terrain ? <Floor half={half} center={center} /> : null}
          {terrain && heights ? <Terrain terrain={terrain} heights={heights} sig={carveSig} g={g} /> : null}
          {world ? <WorldView world={world} t={g} sec={(m) => (typeof m === "number" ? m : 0)} seed={7} heightAt={heightAt} /> : null}
          {st.actors.map((a, k) => {
            const lv = actorLive(k, g);
            if (!lv.visible) return null;
            const base = mixHex(color3d(palette, look, a.color ?? undefined, cycle[k % 3]), lv.s.color?.c ?? "#000000", lv.s.color ? lv.s.color.w : 0);
            return (
              <ActorGroup key={a.id} pos={lv.pos} rot={lv.rot} scale={lv.scale} op={lv.s.opacity}>
                <CustomModel o={objectOf(a)} color={base} accent={cycle[(k + 1) % 3]} t={g} ctx={motionCtx(k)} camYawLocal={null} pulses={pulsesFor(fx, a.id, t, sec) as Pulse[]} ps={(id) => toPart(lv.s.parts[id])} />
              </ActorGroup>
            );
          })}
          {st.liquids.map((l) => {
            const ls = state.liquids[l.id];
            return ls && ls.visible ? <LiquidView key={l.id} l={l} level={ls.level} opacity={ls.opacity} tint={ls.color} g={g} rate={levelRate(st, l.id, g) as number} /> : null;
          })}
          <Particles seed={index + 1} center={[center[0], 0, center[1]]} />
          {fx.length ? (
            <FxLayer fx={fx} t={t} sec={sec} targetAt={targetAt} center={[center[0], 0, center[1]]} seed={index + 1} camPos={cam.position as V3} enterOf={(tg) => Math.max(0, (st.actors.find((a) => a.id === tg?.split("/")[0])?.at ?? 0) - (plan!.t0 ?? 0))} />
          ) : null}
          {profile.bloom ? <BloomRender strength={profile.bloom.strength} threshold={profile.bloom.threshold} radius={profile.bloom.radius} /> : null}
        </Kit3DContext.Provider>
      </ThreeCanvas>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${look.vignette * 0.8}) 100%)` }} />
      {placedTags.map((tag, k) => (
        <Label key={k} tag={tag} look={look} accent={palette.accent3 ?? palette.accent} frame={frame} fps={fps} />
      ))}
      {plan!.overlay?.length ? <CutawayOverlay overlay={plan!.overlay} palette={palette} icons={icons} look={look} /> : null}
      {title ? <StageTitle kicker={scene.title?.kicker} main={title} plan={st} font={look.label.font} /> : null}
    </AbsoluteFill>
  );
};
