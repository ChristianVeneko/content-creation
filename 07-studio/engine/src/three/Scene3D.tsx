// One scene of a 3D template: CSS backdrop, a ThreeCanvas (1080x1920) with the look's lights, environment set (or
// floor), objects, arrows, particles and linear fog matched to the backdrop, then the 2D overlay: labels locked to 3D objects (projected with the same pure camera),
// and the illustrated kit's two-tone headline. HUD, captions, footer, SFX and music come from Video.tsx.
import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { boundsOf, cameraAt, cornerPlacement, floatY, LOOK3D, look3dOf, projectPoint, RENDER3D } from "../../lib/scene3d.mjs";
import type { IconData, ResolvedSpec, Scene, ScenePlan3D, ThreeAssets } from "../types";
import { rgba } from "../util";
import { Headline } from "../illustrated/IllustratedScene";
import { BloomRender, CameraRig, Connection, Floor, HighlightRing, Kit3DContext, Lights, Particles, makeToonRamp, mixHex } from "./kit";
import { SetView } from "./sets";
import { backdropStops, WorldGround, WorldView } from "./world";
import { KIND_COLOR, ObjectView } from "./objects";
import { color3d, look3dFor, mixHexColor, type Look3D } from "./looks";
import { Headline3D, Overlay3D } from "./headlines3d";
import { CutawayOverlay } from "./overlay3d";
import { ensureLookFonts } from "../illustrated/looks";
import { looksAtCamera, momentSec, motionList, nodeDelta } from "../../lib/scene3d-motion.mjs";
import { CustomModel, partWorldMatrix, useOpacity, type CustomObject, type MotionCtx, type Pulse } from "./custom";
import { FxLayer, pulsesFor, type Fx3D } from "./fx";

type Vec3 = [number, number, number];
type RenderProfile = { tone: string; exposure: number; envIntensity: number; shadowRadius: number; bloom: { strength: number; threshold: number; radius: number } | null; fog: { near: number; far: number; add: number } | null };

/** Hex of a vertical CSS gradient (evenly spaced stops) at v in 0..1: the fog color melts the set into the backdrop. */
const gradientHex = (stops: string[], v: number): string => {
  const rgb = (c: string) => [0, 2, 4].map((i) => parseInt(c.replace("#", "").slice(i, i + 2), 16));
  const x = Math.max(0, Math.min(1, v)) * Math.max(0, stops.length - 1);
  const i = Math.min(Math.max(0, stops.length - 2), Math.floor(x));
  const a = rgb(stops[i]);
  const b = rgb(stops[Math.min(stops.length - 1, i + 1)]);
  return `#${a.map((c, k) => Math.round(c + (b[k] - c) * (x - i)).toString(16).padStart(2, "0")).join("")}`;
};
const EMPTY: ScenePlan3D = { kind: "scene3d", layout: "hero", move: "static", frame: { target: [0, 0.5, 0], dist: 9, viewH: 8 }, focus: null, explode: false, objects: [], connections: [] };
const STAGE = { x0: 90, x1: 990, y0: 600, y1: 1236 };

type Live = { pos: Vec3; scale: Vec3; rotY: number; visible: boolean; p: number; rotX?: number };

/** Live transform of object k: entrance style of the look, exploded-view travel, idle float. */
const liveTransform = (look: Look3D, lookId: string, plan: ScenePlan3D, k: number, frame: number, fps: number, ownEntrance = false): Live => {
  const o = plan.objects[k];
  const t = frame / fps;
  const d = frame - Math.round(o.enter * fps);
  const base: Vec3 = [...o.pos] as Vec3;
  // pop-in / assemble replace the look's entrance (they hide the object or its parts until their moment)
  if (ownEntrance) return { pos: [base[0], base[1] + floatY(lookId, t, k), base[2]], scale: [o.scale, o.scale, o.scale], rotY: 0, visible: true, p: 1 };
  if (d < 0) return { pos: base, scale: [0.001, 0.001, 0.001], rotY: 0, visible: false, p: 0 };
  let pos: Vec3 = [base[0], base[1] + floatY(lookId, t, k), base[2]];
  let sx = 1;
  let sy = 1;
  let rotY = 0;
  let rotX = 0;
  let visible = true;
  let p = 1;
  switch (look.enter) {
    case "drop": {
      p = spring({ frame: d, fps, config: { damping: 9, stiffness: 120 } });
      const fall = Math.max(0, 1 - p);
      pos = [pos[0], pos[1] + fall * 2.6, pos[2]];
      const squash = Math.max(0, p - 1);
      sy = 1 - squash * 0.9;
      sx = 1 + squash * 0.45;
      const grow = Math.min(1, d / 4);
      sx *= grow;
      sy *= grow;
      break;
    }
    case "rise":
      p = spring({ frame: d, fps, config: { damping: 13, stiffness: 160 } });
      sy = Math.max(0.001, p);
      sx = Math.min(1, p * 1.5);
      break;
    case "flicker":
      p = spring({ frame: d, fps, config: { damping: 12, stiffness: 150 } });
      sx = sy = p;
      rotY = (1 - p) * 1.8;
      visible = !(d < 9 && d % 3 === 1);
      break;
    case "unfold":
      // pop-up book: the piece stands up from the page on its hinge (rotation about its base)
      p = spring({ frame: d, fps, config: { damping: 11, stiffness: 110 } });
      rotX = (1 - p) * (-Math.PI / 2);
      sx = sy = Math.min(1, 0.4 + p);
      break;
    case "snap": {
      // stop-motion bricks: held poses on twos, dropping in 0.3-unit steps, then a click into place
      const d2 = Math.floor(d / 2) * 2;
      p = spring({ frame: d2, fps, config: { damping: 14, stiffness: 200 } });
      const fall = Math.max(0, 1 - p) * 2.4;
      pos = [pos[0], base[1] + Math.round(fall / 0.3) * 0.3, pos[2]];
      sx = sy = d2 < 2 ? 0.001 : 1;
      break;
    }
    case "scan":
      // hologram: a scan plane grows the object from the pad upward, with a brief flicker
      p = Math.min(1, d / (0.6 * fps));
      sy = Math.max(0.001, p);
      visible = !(d < 6 && d % 2 === 1);
      break;
    case "swing":
    default:
      p = spring({ frame: d, fps, config: { damping: 18, stiffness: 90 } });
      pos = [pos[0], pos[1] + (1 - p) * 1.2, pos[2]];
      rotY = (1 - p) * 2.4;
      sx = sy = 0.7 + 0.3 * p;
      break;
  }
  if (plan.explode) {
    const e = spring({ frame: d, fps, config: { damping: 16, stiffness: 70 } });
    const c = plan.frame.target;
    pos = [c[0] + (pos[0] - c[0]) * e, pos[1] + (1 - e) * 0.6, c[2] + (pos[2] - c[2]) * e];
  }
  const spin = (LOOK3D as Record<string, { spin: number }>)[lookId]?.spin ?? 0;
  // the hero rocks on its turntable (never edge-on: the front face carries the screen/icon)
  if (spin && k === 0 && (plan.layout === "hero" || plan.objects.length === 1)) rotY += Math.sin(t * spin * 1.6) * 0.55;
  const s = o.scale;
  return { pos, scale: [sx * s, sy * s, sx * s], rotY, visible, p, rotX };
};

type Gen = { moments?: Record<string, number>; cameraKeys?: { t: number }[] };
type ObjState = Live & { rot: Vec3; op: number; camYaw: number };

/** One object's group: look entrance + motion transform, and its opacity applied to every mesh below. */
const ObjGroup: React.FC<{ st: ObjState; children: React.ReactNode }> = ({ st, children }) => {
  const ref = useRef<THREE.Group>(null);
  useOpacity(ref, st.op);
  return (
    <group ref={ref} position={st.pos} rotation={st.rot} scale={st.scale}>
      {children}
    </group>
  );
};

type Tag = { x: number; y: number; ax: number; ay: number; w: number; text: string; enter: number; big?: string; side?: "left" | "right" };

/** Push overlapping labels apart vertically (deterministic), then clamp them into the stage band. */
const resolveTags = (tags: Tag[]): Tag[] => {
  const out = tags.map((t) => ({ ...t, x: Math.max(STAGE.x0 + t.w / 2, Math.min(STAGE.x1 - t.w / 2, t.x)), y: Math.max(STAGE.y0 + 30, Math.min(STAGE.y1 - 30, t.y)) }));
  out.sort((a, b) => a.y - b.y);
  for (let i = 1; i < out.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = out[j];
      const b = out[i];
      const h = (a.big ? 150 : 58) / 2 + (b.big ? 150 : 58) / 2 + 6;
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 8 && b.y - a.y < h) b.y = a.y + h;
    }
  }
  return out.map((t) => ({ ...t, y: Math.min(STAGE.y1 - 30, t.y) }));
};

const Label: React.FC<{ tag: Tag; look: Look3D; accent: string; frame: number; fps: number }> = ({ tag, look, accent, frame, fps }) => {
  const p = spring({ frame: frame - Math.round(tag.enter * fps), fps, config: { damping: 12, stiffness: 170 } });
  if (p <= 0.001) return null;
  const L = look.label;
  const neon = look.id === "neon-glass";
  const iso = look.id === "iso-toon";
  const hero = look.label.leader === "dashed";
  // light-stage looks print big numbers in the accent color (white would vanish on paper or a desk)
  const light = look.id === "clay-diorama" || look.id === "paper-world" || look.id === "toy-blocks" || look.id === "soft-studio" || look.id === "voxel-world" || look.id === "clay-mascot" || look.id === "cutaway-explainer" || look.id === "engineering-explainer";
  const leader = hero || Math.hypot(tag.x - tag.ax, tag.y - tag.ay) > 60;
  const text = tag.text;
  return (
    <>
      {leader ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: Math.min(1, p) }}>
          <line x1={tag.ax} y1={tag.ay} x2={hero && tag.side ? (tag.side === "left" ? tag.x + tag.w / 2 + 8 : tag.x - tag.w / 2 - 8) : tag.x} y2={hero && tag.side ? tag.y : tag.y + 24} stroke={hero ? rgba("#FFFFFF", 0.7) : neon ? accent : rgba(look.dark, 0.5)} strokeWidth={hero ? 2 : 3} strokeDasharray={hero ? "6 7" : undefined} />
          <circle cx={tag.ax} cy={tag.ay} r={hero ? 6 : 5} fill={hero ? accent : neon ? accent : look.dark} />
        </svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: tag.x,
          top: tag.y,
          transform: `translate(-50%, -50%) scale(${Math.min(1.08, p)})`,
          opacity: Math.min(1, p * 1.6),
          display: "flex",
          flexDirection: "column",
          alignItems: hero ? (tag.side === "left" ? "flex-end" : "flex-start") : "center",
          whiteSpace: "nowrap",
        }}
      >
        {tag.big ? (
          <div style={{ fontFamily: L.font, fontWeight: 900, fontSize: 168, lineHeight: 1, color: light ? accent : "#FFFFFF", textShadow: neon || look.id === "holo-studio" ? `0 0 30px ${accent}, 0 0 60px ${rgba(accent, 0.6)}` : light ? "0 8px 0 rgba(43,36,51,0.18)" : "0 6px 24px rgba(0,0,0,0.6)", letterSpacing: -3 }}>
            {tag.big}
          </div>
        ) : null}
        {text ? (
          <div
            style={{
              fontFamily: L.font,
              fontWeight: L.weight,
              fontSize: hero ? L.size : L.size,
              color: hero ? "#F5F5F7" : L.fg,
              background: L.bg,
              border: iso ? `3px solid ${accent}` : neon ? `2px solid ${accent}` : `2px solid ${L.border}`,
              borderRadius: L.radius,
              padding: hero ? "0" : "10px 26px",
              boxShadow: neon ? `0 0 22px ${rgba(accent, 0.5)}, inset 0 0 14px ${rgba(accent, 0.2)}` : L.shadow,
              textShadow: hero ? L.shadow : undefined,
              textTransform: "uppercase",
              letterSpacing: hero ? 4 : 1,
              backdropFilter: neon ? "blur(6px)" : undefined,
            }}
          >
            {text}
          </div>
        ) : null}
      </div>
    </>
  );
};

export const Scene3DView: React.FC<{ scene: Scene; index: number; spec: ResolvedSpec; durationInFrames: number; plan: ScenePlan3D | null; icons: Record<string, IconData>; three: ThreeAssets | null }> = ({
  scene,
  index,
  spec,
  durationInFrames,
  plan,
  icons,
  three,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const lookId = look3dOf(spec);
  const look = look3dFor(lookId);
  const palette = spec.theme.palette;
  ensureLookFonts();
  const gradient = useMemo(() => (look.material === "toon" ? makeToonRamp() : null), [look.material]);
  const p = plan && plan.kind === "scene3d" ? plan : EMPTY;
  const objs = scene.visual.type === "scene3d" ? (scene.visual.objects ?? []) : [];
  const sceneSec = durationInFrames / fps;
  const focusPos = p.focus !== null && p.objects[p.focus] ? p.objects[p.focus].pos : null;
  const gen = p as ScenePlan3D & Gen;
  const sec = (m: number | string | undefined) => momentSec(m, gen.moments);
  const fx = (scene.visual.type === "scene3d" ? ((scene.visual as { fx?: Fx3D[] }).fx ?? []) : []) as Fx3D[];
  const camAt = (tt: number) => cameraAt({ t: tt, sceneSec, look: lookId, move: p.move, frame: p.frame, focusPos, keys: gen.cameraKeys ?? null });
  const cam = camAt(t);
  const cycle = [palette.accent, palette.accent2 ?? palette.accent, palette.accent3 ?? palette.accent];
  const colors = objs.map((o, k) => color3d(palette, look, o.color, KIND_COLOR[o.kind] && look.id !== "neon-glass" ? KIND_COLOR[o.kind] : cycle[(k + index) % 3]));
  const accents = objs.map((_, k) => cycle[(k + index + 1) % 3]);
  const motionCtx = (k: number): MotionCtx => ({ sec, enter: p.objects[k]?.enter ?? 0, seed: index * 31 + k + 1 });
  const ownEntrance = objs.map((o) => motionList((o as CustomObject).motion).some((m: { type: string }) => m.type === "pop-in" || m.type === "assemble"));
  /** Full state of object k at time tt: look entrance + keyframes/presets + aim at the camera. */
  const stateAt = (k: number, tt: number): ObjState => {
    let lv = liveTransform(look, lookId, p, k, Math.round(tt * fps), fps, ownEntrance[k]);
    const o = objs[k] as CustomObject;
    const corner = p.objects[k]?.corner;
    if (corner) {
      // a pinned mascot rides the camera: its base sits at a screen corner for the whole scene
      const pl = p.objects[k];
      const cc = tt === t ? cam : camAt(tt);
      const cp = cornerPlacement(cc, corner, pl.h / Math.max(1e-6, pl.scale), pl.scale);
      // keep the look's entrance (drop / squash) and idle float: they were computed from the placeholder origin
      const k3 = lv.scale.map((x) => (x / Math.max(1e-6, pl.scale)) * cp.scale) as Vec3;
      lv = { ...lv, pos: [cp.pos[0] + lv.pos[0], cp.pos[1] + lv.pos[1] * cp.scale, cp.pos[2] + lv.pos[2]] as Vec3, scale: k3, rotY: lv.rotY + cp.yaw };
    }
    const d = nodeDelta(o, tt, motionCtx(k));
    const pos: Vec3 = [lv.pos[0] + d.pos[0], lv.pos[1] + d.pos[1], lv.pos[2] + d.pos[2]];
    const c = tt === t ? cam : camAt(tt);
    const camYaw = Math.atan2(c.position[0] - pos[0], c.position[2] - pos[2]);
    const aim = looksAtCamera(o) ? camYaw : 0;
    return { ...lv, pos, rot: [(lv.rotX ?? 0) + d.rot[0], lv.rotY + d.rot[1] + aim, d.rot[2]], scale: lv.scale.map((x, a) => x * d.scale[a]) as Vec3, op: d.opacity, camYaw };
  };
  const lives = p.objects.map((_, k) => stateAt(k, t));
  const byId = new Map(objs.map((o, k) => [o.id, k] as const).filter(([id]) => id));
  /** World anchor of an fx target ("id" or "id/part") at time tt. */
  const targetAt = (target: string, tt: number): { pos: Vec3; h: number } | null => {
    const [oid, pid] = target.split("/");
    const k = byId.get(oid);
    if (k === undefined || !p.objects[k]) return null;
    const st = tt === t ? lives[k] : stateAt(k, tt);
    if (!st.visible) return null;
    if (pid === undefined) return { pos: st.pos, h: p.objects[k].h * (st.scale[1] / Math.max(1e-6, p.objects[k].scale)) };
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...st.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...st.rot)), new THREE.Vector3(...st.scale));
    const w = partWorldMatrix(objs[k] as CustomObject, pid, tt, motionCtx(k), m, st.camYaw - st.rot[1]);
    if (!w) return null;
    const v = new THREE.Vector3().setFromMatrixPosition(w);
    return { pos: [v.x, v.y, v.z], h: 0.4 * p.objects[k].scale };
  };
  const { min, max } = boundsOf(p.objects.length ? p.objects : [{ pos: [0, 0, 0], scale: 1, h: 1 }]);
  const half: [number, number] = [(max[0] - min[0]) / 2, (max[2] - min[2]) / 2];
  const center: [number, number] = [(max[0] + min[0]) / 2, (max[2] + min[2]) / 2];
  const span = Math.max(half[0], half[1], max[1]) + 3;
  const hdri = three?.hdri ? staticFile(three.hdri) : null;
  const world = p.world ?? null;
  // the keyed backdrop is blended halfway toward the palette background so the palette text stays readable on it
  const worldBackdrop = world?.backdrop ? mixHexColor(color3d(palette, look, world.backdrop, palette.bg[0]), palette.bg[0], 0.5) : null;
  const bg = worldBackdrop ? { ...look.bg(palette), stops: backdropStops(worldBackdrop) } : look.bg(palette);
  const profile = (RENDER3D as Record<string, RenderProfile>)[lookId] ?? (RENDER3D as Record<string, RenderProfile>)["clay-diorama"];
  const set = p.set ?? "none";
  // fog melts the set into the backdrop's horizon
  const fogColor = look.fog ?? gradientHex(bg.stops, 0.55);
  const titleColor = cycle[index % 3];

  // ---------- 2D tags locked to 3D anchors ----------
  const proj = (v: Vec3) => projectPoint(cam, v, width, height);
  const tags: Tag[] = [];
  objs.forEach((o, k) => {
    const pl = p.objects[k];
    if (!pl) return;
    const lv = lives[k];
    const top: Vec3 = [lv.pos[0], lv.pos[1] + pl.h + (o.kind === "stat" ? 0.15 : 0.28), lv.pos[2]];
    if (o.kind === "stat") {
      const a = proj(top);
      tags.push({ x: a.x, y: a.y - 70, ax: a.x, ay: a.y, w: Math.max(260, String(o.value).length * 104), text: o.label ?? "", big: String(o.value ?? ""), enter: pl.enter + 0.2 });
      return;
    }
    if (o.kind === "chart" && o.values) {
      const n = o.values.length;
      const mx = Math.max(...o.values, 1e-6);
      o.values.forEach((v, b) => {
        const x = lv.pos[0] + (b - (n - 1) / 2) * (1.75 / n) * pl.scale;
        const y = lv.pos[1] + (0.12 + 0.15 + (1.75 * v) / mx) * pl.scale + 0.18;
        const a = proj([x, y, lv.pos[2]]);
        const txt = o.items?.[b] ? `${o.items[b]} ${v}` : String(v);
        tags.push({ x: a.x, y: a.y - 18, ax: a.x, ay: a.y, w: txt.length * 19 + 40, text: txt, enter: (pl.items[b] ?? pl.enter) + 0.45 });
      });
    }
    if (!o.label) return;
    const w = o.label.length * look.label.size * 0.68 + 56;
    if (look.label.leader === "dashed") {
      const a = proj([lv.pos[0], lv.pos[1] + pl.h * 0.62, lv.pos[2]]);
      const side = objs.length === 1 ? (k % 2 ? "left" : "right") : a.x < width / 2 ? "left" : "right";
      const x = side === "left" ? STAGE.x0 + w / 2 : STAGE.x1 - w / 2;
      // an object near the frame edge would sit under its side callout: put the callout above it instead
      const tp = proj(top);
      const under = Math.abs(x - a.x) < w / 2 + 60;
      tags.push({ x: under ? tp.x : x, y: under ? tp.y - 40 : a.y - 60, ax: a.x, ay: a.y, w, text: o.label, enter: pl.enter + 0.35, side: under ? undefined : side });
      return;
    }
    const a = proj(top);
    tags.push({ x: a.x, y: a.y - 30, ax: a.x, ay: a.y, w, text: o.label, enter: pl.enter + 0.25 });
  });
  p.connections.forEach((c) => {
    if (!c.label) return;
    const A = p.objects[c.from];
    const B = p.objects[c.to];
    const len = Math.hypot(B.pos[0] - A.pos[0], B.pos[2] - A.pos[2]);
    const a = proj([(A.pos[0] + B.pos[0]) / 2, (A.h + B.h) / 4 + (0.35 + len * 0.18) / 2 + 0.1, (A.pos[2] + B.pos[2]) / 2]);
    tags.push({ x: a.x, y: a.y, ax: a.x, ay: a.y, w: c.label.length * 21 + 44, text: c.label, enter: c.enter + 0.5 });
  });
  const placedTags = resolveTags(tags);

  const toneMapping = profile.tone === "neutral" ? THREE.NeutralToneMapping : profile.tone === "aces" ? THREE.ACESFilmicToneMapping : profile.tone === "agx" ? THREE.AgXToneMapping : THREE.NoToneMapping;
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
          // the bloom composer needs an opaque buffer (a transparent clear blacks out the composited result)
          if (profile.bloom) gl.setClearColor(bg.stops[1] ?? "#04050B", 1);
          else gl.setClearColor(0x000000, 0);
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Kit3DContext.Provider value={{ look, palette, icons, gradient }}>
          <CameraRig cam={cam} />
          {profile.bloom ? <color attach="background" args={[mixHex(bg.stops[1] ?? "#04050B", "#000000", 0.35)]} /> : null}
          {profile.fog ? <fog attach="fog" args={[fogColor, p.frame.dist * profile.fog.near + profile.fog.add, p.frame.dist * profile.fog.far + profile.fog.add * 3]} /> : null}
          <Lights hdri={hdri} span={span} envIntensity={profile.envIntensity} shadowRadius={profile.shadowRadius} set={set !== "none"} />
          {world?.ground && world.ground.kind !== "look" ? <WorldGround ground={world.ground} center={center} half={half} /> : set === "none" ? <Floor half={half} center={center} /> : <SetView set={set} center={center} half={half} models={three?.models ?? {}} t={t} />}
          {world ? <WorldView world={world} t={t} sec={sec} seed={index + 1} /> : null}
          {objs.map((o, k) => {
            const lv = lives[k];
            const pl = p.objects[k];
            if (!pl || !lv.visible) return null;
            return (
              <React.Fragment key={k}>
                <ObjGroup st={lv}>
                  {o.kind === "custom" ? (
                    <CustomModel o={o as CustomObject} color={colors[k]} accent={accents[k]} t={t} ctx={motionCtx(k)} camYawLocal={lv.camYaw - lv.rot[1]} pulses={pulsesFor(fx, o.id, t, sec) as Pulse[]} />
                  ) : (
                    <ObjectView o={o} color={colors[k]} accent={accents[k]} t={t} enter={pl.enter} items={pl.items} models={three?.models ?? {}} index={k} />
                  )}
                  {o.highlight ? <HighlightRing radius={0.95} color={palette.accent} enter={pl.enter + 0.3} /> : null}
                </ObjGroup>
                {look.enter === "scan" && lv.p < 1 ? (
                  // the scan plane riding up the object as it is drawn
                  <mesh position={[lv.pos[0], lv.pos[1] + pl.h * pl.scale * lv.p, lv.pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.2, 1.05 * pl.scale, 48]} />
                    <meshBasicMaterial color={new THREE.Color("#7CF7FF").multiplyScalar(2)} toneMapped={false} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
                  </mesh>
                ) : null}
              </React.Fragment>
            );
          })}
          {p.layout === "stack"
            ? p.objects.map((pl, k) =>
                k === 0 ? null : (
                  // layer plates: each stacked object rests on a thin translucent slab (architecture layers)
                  <mesh key={`plate${k}`} position={[pl.pos[0], pl.pos[1] - 0.12, pl.pos[2]]} scale={[lives[k].scale[0] > 0.01 ? 1 : 0.001, 1, 1]}>
                    <boxGeometry args={[2.6, 0.06, 2.0]} />
                    <meshStandardMaterial color={cycle[k % 3]} transparent opacity={0.35} roughness={0.4} />
                  </mesh>
                ),
              )
            : null}
          {p.connections.map((c, k) => {
            const A = p.objects[c.from];
            const B = p.objects[c.to];
            if (!A || !B) return null;
            return <Connection key={`c${k}`} from={[A.pos[0], A.h * 0.5, A.pos[2]]} to={[B.pos[0], B.h * 0.5, B.pos[2]]} enter={c.enter} color={look.id === "clay-diorama" ? look.dark : palette.accent} seed={k} />;
          })}
          <Particles seed={index + 1} center={[center[0], 0, center[1]]} />
          {fx.length ? (
            <FxLayer fx={fx} t={t} sec={sec} targetAt={targetAt} center={[center[0], 0, center[1]]} seed={index + 1} camPos={cam.position as Vec3} enterOf={(tg) => (tg && byId.has(tg.split("/")[0]) ? (p.objects[byId.get(tg.split("/")[0])!]?.enter ?? 0) : 0)} />
          ) : null}
          {profile.bloom ? <BloomRender strength={profile.bloom.strength} threshold={profile.bloom.threshold} radius={profile.bloom.radius} /> : null}
        </Kit3DContext.Provider>
      </ThreeCanvas>
      {look.id === "neon-glass" ? <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 30% at 50% 62%, ${rgba(palette.accent2 ?? palette.accent, 0.1)} 0%, transparent 100%)`, mixBlendMode: "screen" }} /> : null}
      <Overlay3D look={look} accent={palette.accent3 ?? palette.accent} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,${look.vignette}) 100%)` }} />
      {placedTags.map((tag, k) => (
        <Label key={k} tag={tag} look={look} accent={look.id === "pedestal" ? palette.accent : look.id === "clay-diorama" ? mixHex(palette.accent, "#000000", 0.05) : palette.accent3 ?? palette.accent} frame={frame} fps={fps} />
      ))}
      {p.overlay?.length ? <CutawayOverlay overlay={p.overlay} palette={palette} icons={icons} look={look} /> : null}
      {(scene.title?.main || scene.onScreenText) && look.headline ? (
        <Headline3D kicker={scene.title?.kicker} main={scene.title?.main ?? scene.onScreenText ?? ""} quote={scene.title?.quote} color={color3d(palette, look, scene.title?.color, titleColor)} palette={palette} look={look} index={index} />
      ) : scene.title?.main || scene.onScreenText ? (
        <Headline kicker={scene.title?.kicker} main={scene.title?.main ?? scene.onScreenText ?? ""} quote={scene.title?.quote} color={color3d(palette, look, scene.title?.color, titleColor)} textColor={palette.text} />
      ) : null}
    </AbsoluteFill>
  );
};
