// Persistent 3D stage for process explainers ("how X works", "what happened"): ONE world that lives across every scene of a
// spec and changes over time, instead of a new world per scene.
//   spec.stage  = { concept, world, actors, terrain, liquids }       (the world, built once)
//   scene beats = [{ at, target, dur, ease, set | to | carve }]     (real tweens between states, applied cumulatively)
// Time model: stage state is a pure function of GLOBAL seconds (seconds from the start of the video). A scene's beats are
// resolved against its narration words (momentSec) and shifted by the scene start, so the state at the start of scene N+1
// is exactly the state at the end of scene N (it is the same function at the same instant).
// Schemas, refinements and the pure math live here (terrain heightfield, liquids, tweens, title backing); the planner that
// needs layout and camera is planStageScenes in lib/scene3d.mjs. Nothing here may import Node built-ins (Remotion bundles it).
import { z } from "zod";
import { mix as mixColor, readableOn } from "./captions.mjs";
import { contrastRatio } from "./palettes.mjs";
import { EASE, EASINGS, MAX_PARTS, customObjectFields, hash01, momentError, momentSchema, refineGenerative, sampleTrack, worldSchema } from "./scene3d-motion.mjs";
import { COLOR_TOKENS } from "./drawing-schema.mjs";

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #1A2B3C");
const color = z.union([hex, z.enum(COLOR_TOKENS)]);
const n = (lo, hi) => z.number().min(lo).max(hi);
const v3 = (lo, hi) => z.tuple([n(lo, hi), n(lo, hi), n(lo, hi)]);

// ---------------- vocabulary ----------------

export const BEAT_STATE_ABOUT = {
  pos: "[x, y, z] offset from the rest position (actor / part), offset of the look-at point (camera)",
  rot: "[x, y, z] degrees added to the rest rotation (camera: [pitch, yaw, 0])",
  scale: "multiplier of the rest scale (a number or [x, y, z]; camera: zoom, < 1 closer)",
  color: "hex or palette token the node tints to",
  opacity: "0..1",
  visible: "true / false (an instant cut at the beat's `at`)",
  level: "liquid fill 0..1",
  emissive: "extra self-glow strength",
};
export const STAGE_RESERVED_IDS = ["terrain", "camera"];
export const CARVE_MODES = ["dig", "raise", "collapse"];
export const TERRAIN_GRID = { min: 24, max: 64 };
/** Size budget of a stage (a 1500-instance world must plan and render fast). */
export const MAX_ACTORS = 24;
export const MAX_BEATS = 80;

const stateSchema = z
  .object({
    pos: v3(-30, 30),
    rot: v3(-720, 720),
    scale: z.union([n(0.01, 10), v3(0.01, 10)]),
    color,
    opacity: n(0, 1),
    visible: z.boolean(),
    level: n(0, 1),
    emissive: n(0, 4),
  })
  .partial()
  .strict();

const region = z.union([z.object({ box: z.tuple([n(-40, 40), n(-40, 40), n(-40, 40), n(-40, 40)]).describe("[x0, z0, x1, z1]") }).strict(), z.object({ disc: z.tuple([n(-40, 40), n(-40, 40), n(0.05, 40)]).describe("[x, z, radius]") }).strict()]);

const carveSchema = z
  .object({
    id: z.string().min(1).max(40).optional().describe('Name of the carved place; shots can aim at it with focus "terrain:<id>"'),
    region: region.describe("{ box: [x0, z0, x1, z1] } or { disc: [x, z, r] } on the ground plane (a region reaching the front edge shows in the cutaway face)"),
    depth: n(0, 6).optional().describe("dig: how deep, raise: how high (world units, default 1)"),
    mode: z.enum(CARVE_MODES).optional().describe("dig (default) lowers the ground, raise heaps a mound, collapse relaxes the heights so walls slump"),
    bank: n(0.05, 3).optional().describe("Width of the sloped edge around the region (default 0.35)"),
  })
  .strict();

export const beatSchema = z
  .object({
    at: momentSchema.describe("When it starts: seconds into this scene, or a narration word (same syntax as every `at`)"),
    target: z.string().min(1).max(81).describe('"<actorId>", "<actorId>/<partId>", "<liquidId>", "terrain" or "camera"'),
    dur: n(0, 30).optional().describe("Tween length in seconds (default 0.6; 0 = instant)"),
    ease: z.enum(EASINGS).optional().describe("Easing of the tween (default in-out)"),
    set: stateSchema.optional().describe("Jump to this state at `at`"),
    to: stateSchema.optional().describe("Tween from the current state to this one over `dur`"),
    carve: carveSchema.optional().describe('terrain only: dig a hole, raise a mound or collapse a wall over `dur`'),
  })
  .strict();

export const stageActorSchema = z
  .object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(28).optional().describe("2D tag that tracks the actor"),
    color: color.optional().describe("Body color (default: the palette accents)"),
    size: n(0.2, 4).optional().describe("Scale multiplier (default 1)"),
    pos: v3(-30, 30).optional().describe("World position [x, y, z] (default the origin; the ground is y = 0)"),
    rot: v3(-360, 360).optional().describe("Rotation in degrees [x, y, z]"),
    at: n(0, 600).optional().describe("Seconds from the start of the video when it appears (default: visible from the start)"),
    buoyant: z.object({ amp: n(0, 15).optional().describe("Rock in degrees (default 3)"), speed: n(0.1, 4).optional() }).strict().optional().describe("Rocks gently, but only while a beat has lifted it off its rest position (floating)"),
    highlight: z.boolean().optional(),
    ...customObjectFields,
  })
  .strict();

const terrainSchema = z
  .object({
    size: z.tuple([n(4, 60), n(4, 60)]).optional().describe("Width (x) and depth (z) of the ground block in world units (default [14, 10]); the camera side is +z"),
    pos: z.tuple([n(-30, 30), n(-30, 30)]).optional().describe("Center [x, z] (default [0, 0])"),
    grid: z.number().int().min(TERRAIN_GRID.min).max(TERRAIN_GRID.max).optional().describe("Vertices per side, 24..64 (default 40)"),
    depth: n(0.5, 8).optional().describe("Thickness of the cutaway block below the ground (default 3)"),
    top: color.optional().describe("Grass color of the surface"),
    strata: z.array(z.object({ to: n(0.05, 8).describe("Depth below the surface where this layer ends"), color }).strict()).min(1).max(8).optional().describe("Layers from the surface down (default: topsoil, subsoil, clay, rock from the palette)"),
    bumps: n(0, 0.5).optional().describe("Gentle surface relief amplitude (default 0.04)"),
    seed: z.number().int().min(0).max(1000000).optional(),
    stones: z.object({ count: z.number().int().min(1).max(120), seed: z.number().int().min(0).max(1000000).optional(), size: z.tuple([n(0.05, 1), n(0.05, 1)]).optional().describe("Min and max stone size"), buried: z.boolean().optional().describe("true (default): stones embedded in the cutaway face (they vanish when dug out); false: on the surface") }).strict().optional(),
  })
  .strict();

const liquidSchema = z
  .object({
    id: z.string().min(1).max(40),
    kind: z.enum(["pit", "box"]).optional().describe("pit (default): fills a hole in the terrain; box: a free tank with visible walls"),
    area: z.tuple([n(-40, 40), n(-40, 40), n(-40, 40), n(-40, 40)]).describe("[x0, z0, x1, z1] footprint"),
    floor: n(-10, 10).optional().describe("World y of the bottom (default -1)"),
    top: n(-10, 10).optional().describe("World y of the surface at level 1 (default -0.12)"),
    color: color.optional(),
    opacity: n(0.1, 1).optional().describe("Default 0.7"),
    level: n(0, 1).optional().describe("Fill at the start, 0..1 (default 0)"),
    wave: n(0, 1).optional().describe("Surface wave strength (default 0.5)"),
  })
  .strict();

export const stageSchema = z
  .object({
    concept: z.string().min(3).max(80).describe("The world idea of THIS video in a few words"),
    world: worldSchema.extend({ concept: z.string().min(3).max(80).optional() }).optional().describe("Static scenery built once (ground, backdrop, props, scatter, crowd)"),
    actors: z.array(stageActorSchema).max(MAX_ACTORS).optional().describe("Models that persist across scenes and are animated by beats"),
    terrain: terrainSchema.optional().describe("A low-poly heightfield with a cutaway face; carve beats dig, raise or collapse it"),
    liquids: z.array(liquidSchema).max(8).optional().describe("Water / concrete volumes whose `level` beats tween"),
  })
  .strict();

/** The beats field added to the scene3d visual (lib/scene3d.mjs scene3dFields). */
export const stageSceneFields = {
  beats: z.array(beatSchema).max(MAX_BEATS).optional().describe("stage only: timed state changes of this scene's stage (actors, parts, liquids, terrain, camera)"),
};

// ---------------- refinements ----------------

const remap = (ctx, from, to) => ({ addIssue: (i) => ctx.addIssue({ ...i, path: [...to, ...(i.path ?? []).slice(from.length)] }) });

/** The actors as the custom objects the generative refinements already know how to check. */
const actorObjects = (stage) => (stage?.actors ?? []).map((a) => ({ kind: "custom", id: a.id, parts: a.parts, motion: a.motion, keys: a.keys, at: a.at }));

/** Checks of `spec.stage` (paths under ["stage"]). */
export function refineStage(stage, ctx, base = ["stage"]) {
  const add = (path, message) => ctx.addIssue({ code: "custom", path: [...base, ...path], message });
  const actors = stage.actors ?? [];
  const world = stage.world;
  if (!actors.length && !(world?.parts ?? []).length) add([], "a stage needs at least one agent-built actor (stage.actors with `parts`) or world parts (stage.world.parts)");
  const seen = new Set();
  const claim = (id, path) => {
    if (STAGE_RESERVED_IDS.includes(id)) add(path, `"${id}" is reserved (beat targets "terrain" and "camera")`);
    else if (seen.has(id)) add(path, `duplicate stage id "${id}" (actors and liquids share one namespace)`);
    seen.add(id);
  };
  actors.forEach((a, i) => {
    claim(a.id, ["actors", i, "id"]);
  });
  (stage.liquids ?? []).forEach((l, i) => claim(l.id, ["liquids", i, "id"]));
  if (actors.length) {
    // the actors are checked like custom objects: parts, parents, motion, keys (stage-level times are plain seconds from the start)
    const objs = actorObjects(stage);
    refineGenerative({ objects: objs }, remap(ctx, ["objects"], [...base, "actors"]));
    const wordy = (path, m) => typeof m === "string" && add(path, `stage-level times are seconds from the start of the video (got "${m}"); narration words work in a scene's \`beats\``);
    objs.forEach((o, i) => {
      for (const k of o.keys ?? []) wordy(["actors", i, "keys"], k.at);
      for (const m of o.motion ?? []) if (typeof m === "object") (wordy(["actors", i, "motion"], m.at), wordy(["actors", i, "motion"], m.until));
      for (const p of o.parts ?? []) {
        for (const k of p.keys ?? []) wordy(["actors", i, "parts", "keys"], k.at);
        for (const m of p.motion ?? []) if (typeof m === "object") (wordy(["actors", i, "parts", "motion"], m.at), wordy(["actors", i, "parts", "motion"], m.until));
      }
    });
  }
  if (world) refineGenerative({ objects: [], world: { ...world, concept: world.concept ?? stage.concept } }, remap(ctx, ["world"], [...base, "world"]));
  const t = stage.terrain;
  if (t?.strata) {
    t.strata.forEach((s, i) => {
      if (i > 0 && s.to <= t.strata[i - 1].to) add(["terrain", "strata", i, "to"], "strata depths must increase from the surface down");
    });
  }
  if (t?.stones?.size && t.stones.size[0] > t.stones.size[1]) add(["terrain", "stones", "size"], "stone size is [min, max]");
}

/** Targets a beat may name, with the channels each accepts. */
export function stageTargets(stage) {
  const parts = new Map((stage?.actors ?? []).map((a) => [a.id, new Set((a.parts ?? []).map((p) => p.id))]));
  const liquids = new Set((stage?.liquids ?? []).map((l) => l.id));
  const carves = new Set();
  return { parts, liquids, carves };
}

const NODE_CHANNELS = ["pos", "rot", "scale", "color", "opacity", "visible", "emissive"];
const LIQUID_CHANNELS = ["level", "color", "opacity", "visible"];
const CAMERA_CHANNELS = ["pos", "rot", "scale"];

/** Classify a beat target: {kind: "actor"|"part"|"liquid"|"terrain"|"camera", actor?, part?} or {error}. */
export function resolveTarget(target, stage) {
  if (target === "camera") return { kind: "camera" };
  if (target === "terrain") return stage?.terrain ? { kind: "terrain" } : { error: 'no terrain in the stage: add `stage.terrain` to use the target "terrain"' };
  const [id, part] = target.split("/");
  const { parts, liquids } = stageTargets(stage);
  if (parts.has(id)) {
    if (part === undefined) return { kind: "actor", actor: id };
    return parts.get(id).has(part) ? { kind: "part", actor: id, part } : { error: `no part "${part}" in actor "${id}"` };
  }
  if (liquids.has(id)) return part === undefined ? { kind: "liquid", liquid: id } : { error: `liquid "${id}" has no parts` };
  return { error: `no actor, liquid, "terrain" or "camera" named "${id}" in the stage` };
}

/** Focus references of shots and cameraKeys: an actor, "actor/part", a liquid, "terrain" or "terrain:<carve id>". */
export function resolveFocus(ref, stage, carveIds) {
  if (ref === "terrain") return stage?.terrain ? { kind: "terrain" } : { error: "no terrain in the stage" };
  if (ref.startsWith("terrain:")) return carveIds.has(ref.slice(8)) ? { kind: "terrain", carve: ref.slice(8) } : { error: `no carve with id "${ref.slice(8)}" in any scene's beats` };
  const r = resolveTarget(ref, stage);
  return r.kind === "camera" ? { error: "the camera cannot be a focus" } : r;
}

/**
 * Spec-level checks of the stage and of everything scenes say about it (lib/spec.mjs calls it for 3D templates).
 * Without a stage it only rejects `beats` and a single-shot `shots`; with one it validates every scene against the stage ids.
 */
export function refineStageSpec(spec, ctx) {
  const stage = spec.stage;
  const scenes = spec.scenes ?? [];
  const add = (path, message) => ctx.addIssue({ code: "custom", path, message });
  if (!stage) {
    scenes.forEach((s, i) => {
      const v = s.visual;
      if (v?.type !== "scene3d") return;
      if (!(v.objects ?? []).length) add(["scenes", i, "visual", "objects"], 'visual.type "scene3d" requires at least one object in visual.objects (or a top-level `stage` that all scenes share)');
      if (v.beats) add(["scenes", i, "visual", "beats"], "`beats` change a persistent stage: add a top-level `stage` ({ concept, actors, terrain, liquids, world })");
      if (v.shots && v.shots.length < 2) add(["scenes", i, "visual", "shots"], "use at least 2 shots (a single shot needs a top-level `stage`)");
    });
    return;
  }
  refineStage(stage, ctx);
  // every carve id of every scene, so a focus can name a dig that happens in a later scene
  const carveIds = new Set(scenes.flatMap((s) => (s.visual?.beats ?? []).map((b) => b.carve?.id).filter(Boolean)));
  const seenCarve = new Set();
  scenes.forEach((s, i) => {
    const v = s.visual;
    const base = ["scenes", i, "visual"];
    if (v?.type !== "scene3d") return add([...base, "type"], 'a spec with a `stage` uses visual.type "scene3d" on every scene (each scene declares shots, beats, overlay and focus)');
    if ((v.objects ?? []).length) add([...base, "objects"], "a staged scene takes no `objects`: put the models in `stage.actors` so they persist");
    if (v.world) add([...base, "world"], "a staged scene takes no `world`: build it once in `stage.world`");
    if (v.stock || v.set) add([...base, v.stock ? "stock" : "set"], "a stage is built from scratch: stock content and sets are not used with a stage");
    (v.beats ?? []).forEach((b, k) => {
      const bp = [...base, "beats", k];
      const e = momentError(b.at);
      if (e) add([...bp, "at"], e);
      const r = resolveTarget(b.target, stage);
      if (r.error) return add([...bp, "target"], r.error);
      const kinds = [b.set && "set", b.to && "to", b.carve && "carve"].filter(Boolean);
      if (kinds.length !== 1) return add(bp, "a beat has exactly one of `set`, `to` or `carve`");
      if (b.carve) {
        if (r.kind !== "terrain") return add([...bp, "carve"], '`carve` belongs to the target "terrain"');
        if (b.carve.id) {
          if (seenCarve.has(b.carve.id)) add([...bp, "carve", "id"], `duplicate carve id "${b.carve.id}"`);
          seenCarve.add(b.carve.id);
        }
        return;
      }
      if (r.kind === "terrain") return add([...bp, kinds[0]], 'the target "terrain" takes `carve` ({ region, depth, mode })');
      const allowed = r.kind === "liquid" ? LIQUID_CHANNELS : r.kind === "camera" ? CAMERA_CHANNELS : NODE_CHANNELS;
      for (const ch of Object.keys(b[kinds[0]])) if (!allowed.includes(ch)) add([...bp, kinds[0], ch], `${r.kind === "liquid" ? "a liquid" : r.kind === "camera" ? "the camera" : "an actor or part"} accepts ${allowed.join(", ")} (not "${ch}")`);
    });
    const focusCheck = (path, ref) => {
      if (!ref) return;
      const r = resolveFocus(ref, stage, carveIds);
      if (r.error) add(path, r.error);
    };
    focusCheck([...base, "focus"], v.focus);
    (v.shots ?? []).forEach((sh, k) => focusCheck([...base, "shots", k, "focus"], sh.focus));
    (v.cameraKeys ?? []).forEach((ck, k) => focusCheck([...base, "cameraKeys", k, "focus"], ck.focus));
    (v.fx ?? []).forEach((f, k) => {
      if (!f.target) return;
      const r = resolveTarget(f.target, stage);
      if (r.error || r.kind === "camera" || r.kind === "terrain" || r.kind === "liquid") add([...base, "fx", k, "target"], r.error ?? 'fx targets are actors or "actor/part" on a stage');
    });
  });
}

// ---------------- tweens (beats -> tracks) ----------------

const ONE = [1, 1, 1];
const vec = (s) => (Array.isArray(s) ? s : [s, s, s]);
/** Rest value of a channel. */
const REST = { pos: [0, 0, 0], rot: [0, 0, 0], scale: ONE, opacity: 1, visible: 1, emissive: 0, level: 0 };
const BIG = 1e6;

/** Track key of a node: "a:<actor>", "p:<actor>/<part>", "l:<liquid>" or "c" (camera). */
export const trackKey = (r) => (r.kind === "actor" ? `a:${r.actor}` : r.kind === "part" ? `p:${r.actor}/${r.part}` : r.kind === "liquid" ? `l:${r.liquid}` : "c");

/**
 * Build the tracks of a stage from resolved beats.
 * @param {{t: number, dur: number, ease?: string, kind: "set"|"to", target: {kind: string, actor?: string, part?: string, liquid?: string}, state: Record<string, any>}[]} beats  t = global seconds, in input order for ties
 * @param {{liquids?: {id: string, level?: number}[]}} [stage]
 * @returns {Record<string, Record<string, {t: number, v: any, ease?: string}[]>>}
 */
export function buildTracks(beats, stage = {}) {
  const tracks = {};
  const levelRest = new Map((stage.liquids ?? []).map((l) => [l.id, l.level ?? 0]));
  const sorted = beats.map((b, i) => ({ b, i })).sort((a, c) => a.b.t - c.b.t || a.i - c.i).map((x) => x.b);
  for (const b of sorted) {
    const key = trackKey(b.target);
    for (const [ch, raw] of Object.entries(b.state)) {
      const value = ch === "scale" ? (b.target.kind === "camera" ? [vec(raw)[0], 1, 1] : vec(raw)) : ch === "visible" ? (raw ? 1 : 0) : raw;
      const per = (tracks[key] ??= {});
      const tr = (per[ch] ??= [{ t: -BIG, v: ch === "color" ? null : ch === "level" ? (levelRest.get(b.target.liquid) ?? 0) : REST[ch], ease: "linear" }]);
      // the current value at the beat start; anything the track still had after that is overridden by this beat
      const cur = ch === "color" ? colorAt(tr, b.t).raw : sampleTrack(tr, b.t);
      while (tr.length > 1 && tr[tr.length - 1].t > b.t) tr.pop();
      const instant = b.kind === "set" || b.dur <= 0 || ch === "visible";
      if (instant) tr.push({ t: b.t, v: value, ease: "step" });
      else {
        tr.push({ t: b.t, v: cur, ease: "linear" });
        tr.push({ t: b.t + b.dur, v: value, ease: b.ease ?? "in-out" });
      }
    }
  }
  return tracks;
}

/** Color track value at t: {raw, from, to, u} (raw = the nearest key's color, the value a following beat starts from). */
function colorAt(tr, t) {
  let i = 0;
  while (i + 1 < tr.length && tr[i + 1].t <= t) i++;
  const a = tr[i];
  const b = tr[i + 1];
  if (!b || t <= a.t) return { raw: a.v, from: a.v, to: a.v, u: 0 };
  const u = (EASE[b.ease ?? "in-out"] ?? EASE["in-out"])(Math.max(0, Math.min(1, (t - a.t) / Math.max(1e-6, b.t - a.t))));
  return { raw: u >= 1 ? b.v : u <= 0 ? a.v : (b.v ?? a.v), from: a.v, to: b.v, u };
}

const hexOnly = (c) => (typeof c === "string" && c.startsWith("#") ? c : "#888888");

/**
 * Tint of a color track at t: null (rest color) or {c, w}: tint color `c` blended over the node's own color with weight `w`.
 * `resolve` maps a token to a hex (the renderer passes the palette resolver).
 */
export function sampleColor(tr, t, resolve = hexOnly) {
  const { from, to, u } = colorAt(tr, t);
  if (from === null && to === null) return null;
  if (from === null) return u <= 0 ? null : { c: resolve(to), w: u };
  if (to === null || u <= 0) return { c: resolve(from), w: to === null ? 1 - u : 1 };
  return { c: u >= 1 ? resolve(to) : mixColor(resolve(from), resolve(to), u), w: 1 };
}

const sampleNode = (per, t, resolve) => {
  const s = (ch) => (per?.[ch] ? sampleTrack(per[ch], t) : undefined);
  return {
    pos: s("pos") ?? REST.pos,
    rot: s("rot") ?? REST.rot,
    scale: s("scale") ?? ONE,
    opacity: s("opacity") ?? 1,
    visible: (s("visible") ?? 1) >= 0.5,
    emissive: s("emissive") ?? 0,
    color: per?.color ? sampleColor(per.color, t, resolve) : null,
  };
};

/**
 * Stage state at global second `t`: actors (and their animated parts), liquids and camera offsets. Pure.
 * @param {{tracks: Record<string, any>, actors?: {id: string}[], liquids?: {id: string, level?: number}[]}} plan
 */
export function stageState(plan, t, resolve) {
  const tr = plan.tracks ?? {};
  const actors = {};
  for (const a of plan.actors ?? []) {
    const st = sampleNode(tr[`a:${a.id}`], t, resolve);
    st.parts = {};
    for (const key of Object.keys(tr)) if (key.startsWith(`p:${a.id}/`)) st.parts[key.slice(`p:${a.id}/`.length)] = sampleNode(tr[key], t, resolve);
    actors[a.id] = st;
  }
  const liquids = {};
  for (const l of plan.liquids ?? []) {
    const per = tr[`l:${l.id}`];
    liquids[l.id] = {
      level: per?.level ? sampleTrack(per.level, t) : (l.level ?? 0),
      opacity: per?.opacity ? sampleTrack(per.opacity, t) : 1,
      visible: per?.visible ? sampleTrack(per.visible, t) >= 0.5 : true,
      color: per?.color ? sampleColor(per.color, t, resolve) : null,
    };
  }
  const c = tr.c;
  const cs = (ch) => (c?.[ch] ? sampleTrack(c[ch], t) : undefined);
  const rot = cs("rot") ?? REST.rot;
  const camera = { shift: cs("pos") ?? REST.pos, pitch: rot[0], yaw: rot[1], zoom: (cs("scale") ?? ONE)[0] };
  return { actors, liquids, camera };
}

/** Rock (radians) of a buoyant actor: zero at rest, full once a beat has lifted it 0.25 world units off its rest height. */
export function buoyantRock(buoyant, lift, t) {
  if (!buoyant) return [0, 0];
  const w = Math.max(0, Math.min(1, (lift - 0.05) / 0.2));
  const a = ((buoyant.amp ?? 3) * Math.PI) / 180;
  const sp = buoyant.speed ?? 1;
  return [w * a * 0.6 * Math.cos(2 * Math.PI * 0.35 * sp * t + 1), w * a * Math.sin(2 * Math.PI * 0.4 * sp * t)];
}

// ---------------- terrain ----------------

const sstep = (x) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};

/** Terrain with defaults resolved (the plan stores this). */
export function terrainDefaults(t) {
  return { size: t.size ?? [14, 10], pos: t.pos ?? [0, 0], grid: t.grid ?? 40, depth: t.depth ?? 3, bumps: t.bumps ?? 0.04, seed: t.seed ?? 0, top: t.top ?? null, strata: t.strata ?? null, stones: t.stones ?? null };
}

/** World x / z of grid vertex i (0..grid-1) along an axis. */
export const gridCoord = (terrain, axis, i) => terrain.pos[axis] - terrain.size[axis] / 2 + (i * terrain.size[axis]) / (terrain.grid - 1);

/** Undisturbed ground height at x, z: gentle seeded relief (0 for bumps 0). */
export function baseHeight(terrain, x, z) {
  if (!terrain.bumps) return 0;
  const s1 = hash01(terrain.seed, "a") * 6.28;
  const s2 = hash01(terrain.seed, "b") * 6.28;
  const s3 = hash01(terrain.seed, "c") * 6.28;
  return terrain.bumps * (0.5 * Math.sin(x * 0.7 + s1) * Math.cos(z * 0.6 + s2) + 0.25 * Math.sin(x * 1.9 + z * 1.3 + s3));
}

const regionDist = (r, x, z) => {
  if (r.box) {
    const [x0, z0, x1, z1] = r.box;
    const dx = Math.max(Math.min(x0, x1) - x, 0, x - Math.max(x0, x1));
    const dz = Math.max(Math.min(z0, z1) - z, 0, z - Math.max(z0, z1));
    return Math.hypot(dx, dz);
  }
  const [cx, cz, rad] = r.disc;
  return Math.max(0, Math.hypot(x - cx, z - cz) - rad);
};
/** 1 inside the region, falling smoothly to 0 across `bank` outside it. */
export const regionMask = (r, bank, x, z) => 1 - sstep(regionDist(r, x, z) / Math.max(1e-3, bank));

/** Center of a region [x, z]. */
export const regionCenter = (r) => (r.box ? [(r.box[0] + r.box[2]) / 2, (r.box[1] + r.box[3]) / 2] : [r.disc[0], r.disc[1]]);

/**
 * Heightfield at global second `t` (row-major, index j * grid + i: j along z, i along x). Carves apply in order of their start;
 * each is eased by its own progress. dig lowers by depth * mask, raise lifts, collapse relaxes the heights (3x3 blur, 10 passes) inside
 * the region grown by a talus margin so a wall slumps into a slope.
 * @param {ReturnType<typeof terrainDefaults>} terrain
 * @param {{t: number, dur: number, ease?: string, region: any, depth?: number, mode?: string, bank?: number}[]} carves  sorted or not (sorted here by t)
 */
export function terrainHeights(terrain, carves, t) {
  const N = terrain.grid;
  const h = new Float32Array(N * N);
  const xs = Array.from({ length: N }, (_, i) => gridCoord(terrain, 0, i));
  const zs = Array.from({ length: N }, (_, j) => gridCoord(terrain, 1, j));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) h[j * N + i] = baseHeight(terrain, xs[i], zs[j]);
  const floor = -terrain.depth + 0.15;
  for (const c of [...carves].sort((a, b) => a.t - b.t)) {
    const p = (EASE[c.ease ?? "in-out"] ?? EASE["in-out"])(Math.max(0, Math.min(1, (t - c.t) / Math.max(1e-6, c.dur))));
    if (p <= 0) continue;
    const bank = c.bank ?? 0.35;
    const depth = c.depth ?? 1;
    const mode = c.mode ?? "dig";
    if (mode === "collapse") {
      const reach = bank + 1.4;
      let cur = Float32Array.from(h);
      for (let pass = 0; pass < 10; pass++) {
        const nx = Float32Array.from(cur);
        for (let j = 0; j < N; j++)
          for (let i = 0; i < N; i++) {
            let s = 0;
            let k = 0;
            for (let dj = -1; dj <= 1; dj++)
              for (let di = -1; di <= 1; di++) {
                const jj = Math.min(N - 1, Math.max(0, j + dj));
                const ii = Math.min(N - 1, Math.max(0, i + di));
                s += cur[jj * N + ii];
                k++;
              }
            nx[j * N + i] = s / k;
          }
        cur = nx;
      }
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const m = regionMask(c.region, reach, xs[i], zs[j]);
          h[j * N + i] += (cur[j * N + i] - h[j * N + i]) * p * m;
        }
    } else {
      const sign = mode === "raise" ? 1 : -1;
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) h[j * N + i] += sign * depth * regionMask(c.region, bank, xs[i], zs[j]) * p;
    }
  }
  for (let k = 0; k < h.length; k++) if (h[k] < floor) h[k] = floor;
  return h;
}

/** Bilinear height at world x, z of a heightfield from terrainHeights (clamped to the block). */
export function terrainHeightAt(terrain, heights, x, z) {
  const N = terrain.grid;
  const fx = Math.max(0, Math.min(N - 1, ((x - (terrain.pos[0] - terrain.size[0] / 2)) / terrain.size[0]) * (N - 1)));
  const fz = Math.max(0, Math.min(N - 1, ((z - (terrain.pos[1] - terrain.size[1] / 2)) / terrain.size[1]) * (N - 1)));
  const i = Math.min(N - 2, Math.floor(fx));
  const j = Math.min(N - 2, Math.floor(fz));
  const u = fx - i;
  const v = fz - j;
  const g = (a, b) => heights[b * N + a];
  return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v;
}

/** Strata layers with defaults: [{to (depth below the surface), color (hex/token/role: "topsoil"...)}]. */
export function strataOf(terrain) {
  return terrain.strata ?? [{ to: 0.45, color: "topsoil" }, { to: 1.3, color: "subsoil" }, { to: 2.2, color: "clay" }, { to: terrain.depth, color: "rock" }];
}

/** Buried / surface stones of the terrain: [{x, z, y (buried: height in the face), s, rot}] deterministic by seed. */
export function terrainStones(terrain) {
  const st = terrain.stones;
  if (!st) return [];
  const [lo, hi] = st.size ?? [0.12, 0.34];
  const buried = st.buried ?? true;
  const seed = st.seed ?? 0;
  return Array.from({ length: st.count }, (_, k) => {
    const s = lo + (hi - lo) * hash01(seed, k, "s");
    const x = terrain.pos[0] + (hash01(seed, k, "x") - 0.5) * (terrain.size[0] - 0.6);
    return { x, z: buried ? terrain.pos[1] + terrain.size[1] / 2 : terrain.pos[1] + (hash01(seed, k, "z") - 0.5) * terrain.size[1], y: buried ? -(0.5 + hash01(seed, k, "y") * Math.max(0.3, terrain.depth - 0.9)) : 0, s, rot: [hash01(seed, k, "r1") * 6.28, hash01(seed, k, "r2") * 6.28, hash01(seed, k, "r3") * 6.28], buried };
  });
}

// ---------------- liquids ----------------

/** Liquid with defaults resolved. */
export const liquidDefaults = (l) => ({ ...l, kind: l.kind ?? "pit", floor: l.floor ?? -1, top: l.top ?? -0.12, opacity: l.opacity ?? 0.7, level: l.level ?? 0, wave: l.wave ?? 0.5 });
/** World y of the surface of a liquid at a level 0..1. */
export const liquidSurfaceY = (l, level) => l.floor + (l.top - l.floor) * Math.max(0, Math.min(1, level));
/** Rate (level per second) the level changes at `t`: negative while draining or evaporating (drives the rising vapor). */
export const levelRate = (plan, id, t) => {
  const a = stageState(plan, t - 0.1).liquids[id]?.level ?? 0;
  const b = stageState(plan, t + 0.1).liquids[id]?.level ?? 0;
  return (b - a) / 0.2;
};

// ---------------- title backing ----------------

/**
 * Title style of a staged scene: a solid pill derived from the palette (the darkest background stop pulled toward black), with
 * the palette's readable ink and an accent rule, so the title reads over any 3D backdrop (a red title never competes with a red
 * roof). Contrast of ink on pill is >= 4.5:1 on every palette. Pure; the renderer and the tests share it.
 * @param {{bg: string[], text: string, accent: string, accent2?: string}} p
 */
export function titleBacking(p) {
  const base = mixColor(p.bg[p.bg.length - 1] ?? p.bg[0], "#000000", 0.78);
  let ink = "#FFFFFF";
  if (contrastRatio(ink, base) < 4.5) ink = readableOn(base);
  return { mode: "pill", fill: base, fillAlpha: 0.9, ink, rule: p.accent2 ?? p.accent, kickerInk: mixColor(ink, base, 0.25), contrast: contrastRatio(ink, base) };
}

/** Bands of the 1080x1920 frame (pixels from the top): a slim title on top, small captions near the middle; the subject uses everything between top and bottom. */
export const STAGE_SAFE = { top: 360, bottom: 1640, title: { y: 200, h: 150 }, caption: { y: 900, h: 120 } };
