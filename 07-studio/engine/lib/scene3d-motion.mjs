// Agent-authored 3D for the scene3d templates: `custom` objects built from primitive parts, keyframed and procedural
// motion (objects and parts), word-synced moments, camera keys and per-scene VFX. Schemas + pure math only:
// lib/scene3d.mjs merges the fields into its schema and plan; src/three/custom.tsx and src/three/fx.tsx render them.
// Every value is a pure function of time (seconds into the scene): no clock, no Math.random.
// Nothing here may import Node built-ins: it is bundled by Remotion through lib/spec.mjs.
import { z } from "zod";
import { COLOR_TOKENS } from "./drawing-schema.mjs";
import { parseMoment, resolveMoment, wordFrame } from "./reels.mjs";
import { syntheticCaptions } from "./timeline.mjs";
import { EASE, EASINGS, hash01, keyTrack, momentSchema, momentSec, sampleTrack, smooth } from "./motion.mjs";

// The shared motion vocabulary lives in lib/motion.mjs (2D drawings use it too); re-exported here for the 3D kit.
export { EASE, EASINGS, hash01, momentSchema, momentSec, sampleTrack };

// ---------------- vocabularies ----------------

/** Primitive shapes of a custom part (n = the allowed `size` lengths). `size` meaning per shape (world units; the object stands on y = 0). */
export const PART_SIZE = {
  box: { n: [1, 3], about: "[w, h, d] (one number = cube); `radius` rounds the edges" },
  sphere: { n: [1, 3], about: "[r] or [rx, ry, rz] (ellipsoid)" },
  cylinder: { n: [2, 3], about: "[r, h] or [rTop, rBottom, h]" },
  cone: { n: [2], about: "[r, h]" },
  torus: { n: [2, 3], about: "[R, tube] or [R, tube, arcDegrees]; stands in the XY plane (faces +z)" },
  capsule: { n: [2], about: "[r, length of the straight part]" },
  plane: { n: [2], about: "[w, h], faces +z" },
  sign: { n: [2], about: "[w, h] flat pixel-font sign facing +z that prints `text` (<= 24 chars) in `textColor` on a `color` panel" },
  ring: { n: [2], about: "[inner, outer] flat ring, faces +z" },
  tube: { n: [1], about: "[radius] along `points` (3D, smooth curve)" },
  extrude: { n: [1], about: "[depth] of the 2D outline `points` [[x, y], ...] (faces +z); `radius` bevels it" },
  lathe: { n: [0], about: "no size: profile `points` [[r, y], ...] spun around y (vases, bottles, bells)" },
  group: { n: [0], about: "empty pivot node (rigs: hang parts from it)" },
};
export const PART_SHAPES = Object.keys(PART_SIZE);
/** auto = the look's own material (fits every template); the rest force a finish. */
export const PART_MATERIALS = ["auto", "matte", "plastic", "metal", "glass", "emissive", "toon", "clay"];
/** Default color source of a part when `color` is not given (body = the object's color). */
export const PART_ROLES = ["body", "accent", "dark", "light", "metal", "screen", "glow"];
/**
 * Procedural motion presets. amp: world units (bob, float, hop, orbit radius, assemble/explode distance, breathe
 * fraction) or degrees (wobble, wave, walk); speed: tempo multiplier (1 = default).
 */
export const MOTION_ABOUT = {
  bob: "gentle up-down",
  float: "slow hover with a little sway",
  spin: "turns around y (`axis` x|y|z)",
  wobble: "rocks side to side",
  breathe: "squash-and-stretch idle",
  wave: "raises a limb and waves it (put it on an arm with `pivot` at the shoulder)",
  walk: "object-level: swings `parts` (limbs in left/right pairs, counter-phased) + body bounce",
  blink: "object-level: closes `parts` (eyes) every few seconds",
  "look-at-camera": "turns to face the camera (object or head part)",
  hop: "jumps with squash on landing",
  orbit: "circles around its rest position",
  "pop-in": "scales in with overshoot at `at`",
  assemble: "parts fly in from around the object and click together at `at`",
  explode: "parts fly apart at `at` and stay (exploded view)",
  dig: "tool scoops down into ground, lifts and dumps; earth sinks/excavates",
  pour: "container tilts down along z and pours liquid or concrete",
  fill: "liquid or material level rises along y from 0 to 1 with meniscus wave",
  drain: "liquid level drops along y from 1 down to 0",
  collapse: "wall or soil block tips, fractures and crumbles downward with ground impact",
  buoyancy: "object lifts upward along y and rocks with floating buoyancy pitch/roll like a boat",
  insert: "component descends from above along y and seats with a damped snap lock",
};
export const MOTION_PRESETS = Object.keys(MOTION_ABOUT);
/** Presets that act on listed parts when placed on the object. */
const PART_TARGETING = ["walk", "blink", "assemble", "explode", "dig", "pour", "fill", "drain", "collapse", "buoyancy", "insert"];
export const PARTICLE_KINDS = ["sparks", "dust", "snow", "embers", "confetti", "stars"];
export const FX_ABOUT = {
  particles: "`kind` sparks|dust|snow|embers|confetti|stars; ambient around `target`/the scene, or `burst: true` from `target` at `at`",
  trail: "glowing ribbon behind a moving `target` (object or object/part)",
  pulse: "pulsing glow on `target`; emissive parts flare",
  shockwave: "expanding ground ring from `target` at `at`",
  glow: "soft halo behind `target`",
  sweep: "a colored light sweeps across the scene",
  hologram: "rotating rings + scanline shell around `target`",
  spotlight: "volumetric cone of light from `pos` (default: above the scene) onto `target`, `aim` or the scene center; sways slowly; `size` widens it",
  signal: "glowing dots travel along the pipe path `points` (2-12 [x, y, z]) in a loop between `at` and `until`; `count` dots, `size` scales them (give the pipe the same points as a `tube` part)",
};
export const FX_TYPES = Object.keys(FX_ABOUT);
const TARGET_NEEDED = ["trail", "pulse", "glow", "hologram"];
/** Parts of one custom object (a model; stage actors use the same cap). */
export const MAX_PARTS = 160;
/** Parts of a custom `world` (ground dressing, backdrops, props, signs), and the cap after `repeat` and `scatter` expansion (rendered instanced). */
export const MAX_WORLD_PARTS = 400;
export const MAX_WORLD_EXPANDED = 1500;
/** Worlds up to this many expanded parts keep the classic one-mesh-per-part rendering; repeat copies of bigger worlds are instanced. */
export const WORLD_INSTANCE_FROM = 160;
export const WORLD_GROUNDS = ["look", "none", "plane", "disc", "grid", "mirror"];
/** Camera shot presets: offsets added on top of the scene's camera move (see `shots`). */
export const SHOT_PRESETS = {
  wide: { zoom: 1.15, pitch: 1, shift: [0, -0.3, 0] },
  medium: { zoom: 1 },
  close: { zoom: 0.62, pitch: -2 },
  low: { pitch: -12, zoom: 0.9 },
  high: { pitch: 14, zoom: 1.05 },
  overhead: { pitch: 34, zoom: 1.1 },
  left: { yaw: -32, zoom: 0.95 },
  right: { yaw: 32, zoom: 0.95 },
  // cutaway explainers: a pull-out that shows the whole cross-section, a shot over a character's shoulder, and a
  // push to the wall the camera dollies through (fade the wall with part `keys`)
  reveal: { zoom: 1.35, pitch: 1, shift: [0, -0.25, 0] },
  shoulder: { yaw: 26, pitch: -4, zoom: 0.55 },
  through: { zoom: 0.42, pitch: -5 },
  // process explainers (stage): a smooth punch-in on `focus`, and a dive toward the cutaway face (a stage plan levels the
  // camera to the face; without a stage it is a close, slightly lowered shot)
  "zoom-to": { zoom: 0.5, pitch: -2 },
  dive: { zoom: 0.36, pitch: -8 },
};
export const SHOT_NAMES = Object.keys(SHOT_PRESETS);
/**
 * Portrait framings of a staged video (`shots[].frame`): how much of the world the shot shows, tuned so the subject is large in a
 * 9:16 frame (the base framing already fills it; zoom < 1 moves closer). They replace the preset's zoom / pitch / shift; the shot's
 * own yaw, pitch, zoom and shift still win. In a stage, `wide`, `medium` and `close` shots default to the frame of the same name.
 */
export const SHOT_FRAMES = {
  wide: { zoom: 1.0, pitch: 2, shift: [0, 0.9, 0] },
  medium: { zoom: 0.75, pitch: 0, shift: [0, 0.7, 0] },
  close: { zoom: 0.5, pitch: -2, shift: [0, 0.45, 0] },
  cutaway: { zoom: 0.65, pitch: -6, shift: [0, 0.2, 0] },
};
/** Stage punch-in presets are scaled by this (their zoom < 1) because the stage's base framing already fills the frame. */
export const STAGE_ZOOM_EASE = 1.2;
export const SHOT_FRAME_NAMES = Object.keys(SHOT_FRAMES);

// ---------------- moments ----------------

/** Message for an unreadable moment string, or null. */
export const momentError = (m) => {
  if (m === undefined || typeof m === "number" || parseMoment(m)) return null;
  return `cannot read the moment "${m}" (use seconds, a narration word, "word#2", "word+6", "inicio" or "fin")`;
};

/**
 * Resolve moment strings of one scene to seconds into the scene. `words` = [{w, f}] (scene-relative appearance
 * frames, see sceneWords); unresolvable moments map to 0 and add a warning.
 * @returns {{moments: Record<string, number>, warnings: string[]}}
 */
export function resolveMomentStrings(list, words, sceneFrames, fps) {
  const moments = {};
  const warnings = [];
  for (const m of list) {
    const r = resolveMoment(m, { words, cut: 0, ini: 0, end: sceneFrames });
    if ("error" in r) {
      warnings.push(r.error);
      moments[m] = 0;
    } else moments[m] = Math.round((Math.max(0, r.frame) / fps) * 1000) / 1000;
  }
  return { moments, warnings };
}

/**
 * Word timing of every scene for moment resolution: [{w, f}] per scene, f = the scene-relative frame a word shows
 * (the reels `wordFrame`: a few frames early). `captions` are the build's word captions (1:1 with the narration
 * words after alignToScript); without them (or on a count mismatch) the text-timed syntheticCaptions are used.
 */
export function sceneWords(spec, timeline, captions) {
  const fps = spec.format?.fps ?? 30;
  const raw = spec.scenes.map((s) => String(s.narration ?? "").trim().split(/\s+/).filter(Boolean));
  const total = raw.reduce((a, r) => a + r.length, 0);
  const caps = captions?.length === total ? captions : syntheticCaptions(spec.scenes, timeline);
  let k = 0;
  return raw.map((words, i) => {
    const from = timeline.scenes[i]?.from ?? 0;
    return words.map((w) => {
      const c = caps[k++];
      return { w, f: wordFrame((c?.startMs ?? 0) / 1000, from, fps) - from };
    });
  });
}

// ---------------- schema ----------------

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #1A2B3C");
const color = z.union([hex, z.enum(COLOR_TOKENS)]);
const n = (lo, hi) => z.number().min(lo).max(hi);
const v3 = (lo, hi) => z.tuple([n(lo, hi), n(lo, hi), n(lo, hi)]);
const scaleField = z.union([n(0.01, 10), v3(0.01, 10)]);

const keySchema = z
  .object({
    at: momentSchema,
    pos: v3(-6, 6).optional().describe("Offset from the rest position"),
    rot: v3(-720, 720).optional().describe("Degrees added to the rest rotation [x, y, z]"),
    scale: scaleField.optional().describe("Multiplier of the rest scale"),
    opacity: n(0, 1).optional(),
    ease: z.enum(EASINGS).optional().describe("Easing of the segment that arrives at this key (default in-out)"),
  })
  .strict();

const motionObject = z
  .object({
    type: z.string().min(1).describe(`Preset: ${MOTION_PRESETS.join(", ")}`),
    at: momentSchema.optional().describe("Start (default: the scene start; pop-in/assemble: the object's entrance)"),
    until: momentSchema.optional().describe("End (default: the scene end)"),
    amp: n(0, 720).optional().describe("Amplitude: world units, or degrees for wobble/wave/walk"),
    speed: n(0.05, 8).optional().describe("Tempo multiplier (1 = default)"),
    parts: z.array(z.string().min(1).max(40)).min(1).max(12).optional().describe("walk/blink/assemble/explode on an object: the part ids"),
    axis: z.enum(["x", "y", "z"]).optional(),
    lift: n(-180, 180).optional().describe("wave: how far the limb is raised, degrees (default 130)"),
  })
  .strict();
const motionEntry = z.union([z.string().min(1), motionObject]);
const motionField = z.array(motionEntry).max(6).optional().describe(`Procedural motion: preset names or {type, at, until, amp, speed, parts}. Presets: ${MOTION_PRESETS.join(", ")}`);
const keysField = z.array(keySchema).min(1).max(12).optional().describe("Keyframes [{at, pos, rot, scale, opacity, ease}]");

export const partSchema = z
  .object({
    id: z.string().min(1).max(40),
    shape: z.enum(PART_SHAPES, { error: (iss) => `unknown part shape${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${PART_SHAPES.join(", ")}` }),
    size: z.array(n(0.005, 360)).max(3).optional().describe("Dimensions in world units (<= 8), meaning per shape; torus arc in degrees"),
    points: z.array(z.array(n(-6, 6)).min(2).max(3)).max(64).optional().describe("tube: [[x,y,z]...]; extrude: outline [[x,y]...]; lathe: profile [[r,y]...]"),
    radius: n(0, 0.5).optional().describe("box: edge rounding; extrude: bevel"),
    facets: z.number().int().min(3).max(24).optional().describe("cylinder, cone, sphere: number of flat sides (4-8 reads as faceted low-poly; omit for a smooth round shape)"),
    text: z.string().min(1).max(24).optional().describe("sign: the text printed on the sign (pixel font)"),
    textColor: color.optional().describe("sign: text color (default: readable on the panel)"),
    pos: v3(-5, 5).optional().describe("Center, relative to the parent part's center (or the object's base)"),
    rot: v3(-360, 360).optional().describe("Degrees [x, y, z]"),
    scale: scaleField.optional(),
    pivot: v3(-3, 3).optional().describe("Rotation point relative to the part's center (e.g. the shoulder end of an arm)"),
    parent: z.string().min(1).max(40).optional().describe("Part id this part hangs from (moves with it)"),
    color: color.optional(),
    role: z.enum(PART_ROLES).optional().describe("Color source when `color` is not set (default body)"),
    material: z.enum(PART_MATERIALS).optional().describe("auto (default) uses the look's material"),
    emissive: n(0, 4).optional().describe("Self-glow strength"),
    opacity: n(0.05, 1).optional(),
    motion: motionField,
    keys: keysField,
  })
  .strict();

/** Fields added to object3dSchema (lib/scene3d.mjs). */
export const customObjectFields = {
  parts: z.array(partSchema).min(1).max(MAX_PARTS, `at most ${MAX_PARTS} parts per custom object`).optional().describe('custom: the model, built from primitive parts (front faces +z, base on y = 0)'),
  motion: motionField,
  keys: keysField,
};

const repeatSchema = z
  .object({
    count: z.number().int().min(2).max(40).describe("Number of copies (including the original)"),
    step: v3(-10, 10).describe("Offset between copies [x, y, z]; e.g. [0, 0, -1.2] makes a row receding into depth"),
    scaleStep: n(0.5, 1.5).optional().describe("Scale multiplier applied cumulatively per copy (default 1)"),
  })
  .strict();

/** A part of the agent-built world: like an object part, but over the whole stage (|pos| <= 30) and repeatable. */
export const worldPartSchema = partSchema.extend({
  pos: v3(-30, 30).optional().describe("Center in world units (objects stand near the origin; negative z recedes)"),
  repeat: repeatSchema.optional().describe("Copies of this part (and the parts hanging from it)"),
});

/** `scatter`: deterministic copies of a template part spread over an area (grass, flowers, stones, trees), rendered instanced. */
export const scatterSchema = z
  .object({
    part: z.string().min(1).max(40).describe("Id of the template part in `world.parts` (and the parts hanging from it); the template itself is not drawn, only its copies"),
    count: z.number().int().min(1).max(1000).describe("Number of copies"),
    area: z.tuple([n(-30, 30), n(-30, 30), n(-30, 30), n(-30, 30)]).describe("Ground rectangle [x0, z0, x1, z1] the copies fall in"),
    seed: z.number().int().min(0).max(1000000).optional().describe("Same seed = same layout (default 0)"),
    jitter: z.object({ scale: n(0, 0.9).optional().describe("Random scale +/- (0.3 = 70%..130%)"), rot: n(0, 360).optional().describe("Random yaw +/- degrees (default 360 = any)") }).strict().optional(),
    avoid: z.array(z.array(n(-30, 30)).min(3).max(4)).max(12).optional().describe("Keep-out zones: [x0, z0, x1, z1] boxes or [x, z, r] discs"),
    y: n(-5, 5).optional().describe("Ground height added to the template's own y (default 0; on a stage with terrain the copies follow the terrain)"),
  })
  .strict();

const groundSchema = z
  .object({
    kind: z.enum(WORLD_GROUNDS).optional().describe("look = the look's own floor (default), none = shadow catcher only, plane | disc | grid | mirror"),
    color: color.optional(),
    size: n(2, 60).optional().describe("plane/grid/mirror: side length; disc: diameter"),
  })
  .strict();

const crowdSchema = z
  .object({
    count: z.number().int().min(8).max(160),
    area: z.tuple([n(2, 40), n(1, 30)]).describe("Width and depth of the area the silhouettes fill"),
    pos: v3(-30, 30).optional().describe("Center of the area (default [0, 0, -6])"),
    height: n(0.4, 2.5).optional().describe("Silhouette height (default 1.1)"),
    color: color.optional().describe("Silhouette color (default: near-black of the backdrop)"),
  })
  .strict();

/** The set the agent builds from scratch for one scene: ground, backdrop color, parts, crowd. `concept` is required. */
export const worldSchema = z
  .object({
    concept: z.string().min(3).max(80).describe("The world idea of THIS video in a few words (setting + silhouette language); never reuse a previous video's"),
    ground: groundSchema.optional(),
    backdrop: color.optional().describe("Flat backdrop color of the scene (default: the look's gradient)"),
    parts: z.array(worldPartSchema).max(MAX_WORLD_PARTS, `at most ${MAX_WORLD_PARTS} world parts (repeat copies are expanded)`).optional().describe("Props, walls, signs and stage dressing built from primitive parts"),
    crowd: crowdSchema.optional().describe("Instanced crowd silhouettes"),
    scatter: z.array(scatterSchema).max(12).optional().describe("Deterministic scattered copies of template parts (grass, flowers, stones, trees)"),
  })
  .strict();

const shotSchema = z
  .object({
    at: momentSchema.optional().describe("When the shot starts (default: evenly spaced over the scene)"),
    shot: z.enum(SHOT_NAMES, { error: (iss) => `unknown shot${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${SHOT_NAMES.join(", ")}` }),
    focus: z.string().min(1).max(40).optional().describe("Object id the shot aims at (with a stage: an actor id, \"actor/part\", a liquid id, \"terrain\" or \"terrain:<carve id>\")"),
    frame: z.enum(SHOT_FRAME_NAMES, { error: (iss) => `unknown frame${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${SHOT_FRAME_NAMES.join(", ")}` }).optional().describe(`portrait framing of the shot (${SHOT_FRAME_NAMES.join(", ")}): wide shows the whole set, medium the subject area, close one subject, cutaway the soil section; a stage wide / medium / close shot defaults to its own frame`),
    cut: z.boolean().optional().describe("stage: hard cut to this shot instead of an eased move"),
    yaw: n(-180, 180).optional(),
    pitch: n(-60, 60).optional(),
    zoom: n(0.3, 3).optional(),
    shift: v3(-5, 5).optional(),
    ease: z.enum(EASINGS).optional(),
  })
  .strict();

/** One 3D effect (lib/spec.mjs unions it with the 2D fx of lib/fx2d.mjs for `visual.fx`). */
export const fx3dSchema = z
  .object({
    type: z.enum(FX_TYPES, { error: (iss) => `unknown fx${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${FX_TYPES.join(", ")}` }),
    kind: z.enum(PARTICLE_KINDS).optional().describe(`particles: ${PARTICLE_KINDS.join(", ")}`),
    target: z.string().min(1).max(81).optional().describe('Object id, or "object/part"'),
    color: color.optional(),
    at: momentSchema.optional(),
    until: momentSchema.optional(),
    count: z.number().int().min(4).max(200).optional(),
    size: n(0.2, 4).optional().describe("Size multiplier"),
    pos: v3(-30, 30).optional().describe("spotlight: apex of the cone [x, y, z]"),
    aim: v3(-30, 30).optional().describe("spotlight: world point the cone lights (when there is no `target`)"),
    burst: z.boolean().optional().describe("particles: one burst from the target at `at` instead of an ambient field"),
    points: z.array(v3(-30, 30)).max(12).optional().describe("signal: the pipe path the dots travel [[x, y, z], ...] (2-12 points)"),
  })
  .strict();


// ---------------- overlay kit (diegetic 2D explainer UI over the 3D stage) ----------------

/** Slots of the overlay kit: `flow` = the top chip strip, `concept` = the name pill, `limit` / `versus` = the card. */
export const OVERLAY_TYPES = ["flow", "concept", "limit", "versus"];
export const OVERLAY_ABOUT = {
  flow: "top strip of flow-diagram chips (icon, label, live value) joined by arrows; the active chip is highlighted and signal dots run along the arrows",
  concept: "a pill with the name of the concept being explained",
  limit: "a demand bar with a limit tick: it turns to the over-limit color when the demand passes the limit and shows `note`",
  versus: "a card that says two things are NOT the same: two titled halves with a not-equal sign between them",
};
const chipId = z.string().min(1).max(16);
const iconName = z.string().min(1).max(40);
const overlayWindow = {
  at: momentSchema.optional().describe("When it appears: seconds or a narration word (default: 0.4 s)"),
  until: momentSchema.optional().describe("When it leaves (default: the end of the scene)"),
};
const flowStepSchema = z
  .object({
    at: momentSchema,
    active: chipId.optional().describe("Chip id highlighted from this moment"),
    values: z.record(chipId, z.string().min(1).max(8)).optional().describe("New live values by chip id"),
  })
  .strict();
const flowOverlaySchema = z
  .object({
    type: z.literal("flow"),
    chips: z
      .array(z.object({ id: chipId, icon: iconName.describe("Phosphor icon name"), label: z.string().min(1).max(10), value: z.string().min(1).max(8).optional().describe("Live value under the label") }).strict())
      .min(2)
      .max(5),
    active: chipId.optional().describe("Chip id highlighted at the start (default: the first)"),
    steps: z.array(flowStepSchema).max(6).optional().describe("Moments that move the highlight and update the values"),
    ...overlayWindow,
  })
  .strict();
const conceptOverlaySchema = z.object({ type: z.literal("concept"), text: z.string().min(3).max(28), ...overlayWindow }).strict();
const limitOverlaySchema = z
  .object({
    type: z.literal("limit"),
    label: z.string().min(1).max(14),
    value: n(0, 1).optional().describe("Demand at the start, 0..1 (default 0)"),
    limit: n(0.1, 1).optional().describe("Where the limit tick sits, 0.1..1 (default 0.8)"),
    steps: z.array(z.object({ at: momentSchema, value: n(0, 1) }).strict()).max(6).optional().describe("Moments that move the demand"),
    limitLabel: z.string().min(1).max(22).optional().describe("Caption of the limit tick"),
    note: z.string().min(1).max(28).optional().describe("Warning shown while the demand is over the limit"),
    icons: z.array(iconName).max(3).optional().describe("Small Phosphor icons of the loads, right of the label"),
    ...overlayWindow,
  })
  .strict();
const versusSide = z.object({ title: z.string().min(1).max(14), sub: z.string().min(1).max(16).optional(), icon: iconName.optional() }).strict();
const versusOverlaySchema = z.object({ type: z.literal("versus"), left: versusSide, right: versusSide, ...overlayWindow }).strict();
export const overlaySchema = z.discriminatedUnion("type", [flowOverlaySchema, conceptOverlaySchema, limitOverlaySchema, versusOverlaySchema], {
  error: (iss) => `unknown overlay type${iss.input?.type === undefined ? "" : ` "${iss.input.type}"`}; use one of: ${OVERLAY_TYPES.join(", ")}`,
});

const cameraKeySchema = z
  .object({
    at: momentSchema,
    yaw: n(-180, 180).optional().describe("Degrees around the scene (added to the move)"),
    pitch: n(-60, 60).optional().describe("Degrees up/down (added)"),
    zoom: n(0.3, 3).optional().describe("Distance multiplier: < 1 closer"),
    shift: v3(-5, 5).optional().describe("Offset of the look-at point"),
    focus: z.string().min(1).max(40).optional().describe("Object id to aim at"),
    ease: z.enum(EASINGS).optional(),
  })
  .strict();

/** Fields added to the scene3d visual (lib/scene3d.mjs scene3dFields). */
export const generativeSceneFields = {
  cameraKeys: z.array(cameraKeySchema).min(1).max(8).optional().describe("Camera keyframes on top of `camera` (use camera: static for keys only)"),
  fx: z.array(fx3dSchema).max(6).optional().describe(`Visual effects: ${FX_TYPES.join(", ")}`),
  world: worldSchema.optional().describe("The set built from scratch for this scene (ground, backdrop, parts, crowd)"),
  shots: z.array(shotSchema).min(1).max(4).optional().describe(`1-4 camera shots over the scene (2-4 without a stage) (${SHOT_NAMES.join(", ")}); use instead of cameraKeys`),
  stock: z.boolean().optional().describe("true = this scene uses catalog content on purpose (stock kinds, models, sets) instead of agent-built custom parts / world"),
  overlay: z.array(overlaySchema).max(4).optional().describe(`Diegetic explainer UI over the stage (${OVERLAY_TYPES.join(", ")}); one flow, one concept and one card (limit or versus) per scene`),
};

/** Checks of the generative fields of a scene3d visual (paths relative to the visual). */
export function refineGenerative(v, ctx) {
  const objs = v.objects ?? [];
  const add = (path, message) => ctx.addIssue({ code: "custom", path, message });
  const at = (path, m) => {
    const e = m === undefined ? null : momentError(m);
    if (e) add(path, e);
  };
  const checkKeys = (keys, base) => (keys ?? []).forEach((k, i) => at([...base, i, "at"], k.at));
  const checkMotion = (motion, base, { partIds, isPart }) =>
    (motion ?? []).forEach((m, i) => {
      const type = typeof m === "string" ? m : m.type;
      if (!MOTION_PRESETS.includes(type)) return add([...base, i], `unknown motion "${type}"; use one of: ${MOTION_PRESETS.join(", ")}`);
      if (typeof m === "string") return;
      at([...base, i, "at"], m.at);
      at([...base, i, "until"], m.until);
      if (m.parts && isPart) return add([...base, i, "parts"], "a part's motion moves that part; drop `parts` (or put the motion on the object)");
      if (m.parts && !partIds) return add([...base, i, "parts"], `only custom objects have parts; ${type} needs a custom object`);
      if (!isPart && partIds && (type === "walk" || type === "blink") && !m.parts) add([...base, i, "parts"], type === "walk" ? "walk needs `parts` (limb part ids in left/right pairs)" : "blink needs `parts` (the eye part ids)");
      (m.parts ?? []).forEach((p, k) => {
        if (partIds && !partIds.has(p)) add([...base, i, "parts", k], `no part with id "${p}" in this object`);
      });
    });
  /** Checks of a list of parts (object parts or world parts); returns the id map. */
  const checkParts = (parts, base, maxSize) => {
    const ids = new Map();
    parts.forEach((p, i) => {
      if (ids.has(p.id)) add([...base, i, "id"], `duplicate part id "${p.id}"`);
      else ids.set(p.id, p);
    });
    parts.forEach((p, i) => {
      const pb = [...base, i];
      const spec = PART_SIZE[p.shape];
      if (p.size && spec && !spec.n.includes(p.size.length)) add([...pb, "size"], `${p.shape} \`size\` is ${spec.about}`);
      (p.size ?? []).forEach((x, j) => {
        if (x > maxSize && !(p.shape === "torus" && j === 2)) add([...pb, "size", j], `sizes are world units: at most ${maxSize} (the torus arc, size[2], is in degrees)`);
      });
      if (p.shape === "sign" && !p.text) add([...pb, "text"], "sign parts need `text` (<= 24 characters)");
      if (p.shape !== "sign" && (p.text !== undefined || p.textColor !== undefined)) add([...pb, "text"], "`text` / `textColor` belong to the sign shape");
      const pts = p.points ?? [];
      if (p.shape === "tube") {
        if (pts.length < 2) add([...pb, "points"], "tube parts need `points`: at least 2 [x, y, z] points");
        else if (pts.some((q) => q.length !== 3)) add([...pb, "points"], "tube points are [x, y, z]");
      }
      if (p.shape === "extrude" || p.shape === "lathe") {
        const min = p.shape === "extrude" ? 3 : 2;
        if (pts.length < min) add([...pb, "points"], `${p.shape} parts need \`points\`: at least ${min} [x, y] points`);
        else if (pts.some((q) => q.length !== 2)) add([...pb, "points"], `${p.shape} points are [x, y]`);
      }
      if (p.parent !== undefined && !ids.has(p.parent)) add([...pb, "parent"], `no part with id "${p.parent}" in this object`);
      checkMotion(p.motion, [...pb, "motion"], { partIds: ids, isPart: true });
      checkKeys(p.keys, [...pb, "keys"]);
    });
    // parent cycles: report once, on the first part of the cycle
    const reported = new Set();
    parts.forEach((p, i) => {
      const chain = [p.id];
      let cur = p;
      while (cur?.parent !== undefined && ids.has(cur.parent)) {
        if (cur.parent === p.id) {
          if (!chain.some((c) => reported.has(c))) add([...base, i, "parent"], `parent cycle: ${[...chain, p.id].join(" -> ")}`);
          chain.forEach((c) => reported.add(c));
          break;
        }
        if (chain.includes(cur.parent)) break; // a cycle further up: reported from its own part
        chain.push(cur.parent);
        cur = ids.get(cur.parent);
      }
    });
    return ids;
  };
  objs.forEach((o, k) => {
    const base = ["objects", k];
    at([...base, "at"], o.at);
    const parts = o.parts ?? [];
    if (o.kind === "custom" && !parts.length) add([...base, "parts"], `custom objects need \`parts\` (1-${MAX_PARTS} primitive parts)`);
    if (o.kind !== "custom" && parts.length) add([...base, "parts"], "`parts` belongs to kind custom");
    const ids = checkParts(parts, [...base, "parts"], 8);
    checkMotion(o.motion, [...base, "motion"], { partIds: o.kind === "custom" ? ids : null, isPart: false });
    checkKeys(o.keys, [...base, "keys"]);
  });
  const byId = new Map(objs.filter((o) => o.id).map((o) => [o.id, o]));
  if ((v.fx ?? []).length > 6) add(["fx"], "at most 6 fx in a 3D scene");
  (v.fx ?? []).forEach((f, i) => {
    if (!FX_TYPES.includes(f.type)) return; // a 2D fx: lib/spec.mjs reports it
    const base = ["fx", i];
    at([...base, "at"], f.at);
    at([...base, "until"], f.until);
    if (f.type === "particles" && !f.kind) add([...base, "kind"], `particles need \`kind\`: ${PARTICLE_KINDS.join(", ")}`);
    if (f.type === "signal" && (f.points ?? []).length < 2) add([...base, "points"], "signal needs `points`: the pipe path, at least 2 [x, y, z] points");
    if (f.type !== "signal" && f.points) add([...base, "points"], "`points` belongs to the signal fx");
    if (TARGET_NEEDED.includes(f.type) && !f.target) add([...base, "target"], `${f.type} needs \`target\` (an object id or "object/part")`);
    if (f.target) {
      const [oid, pid] = f.target.split("/");
      const o = byId.get(oid);
      // a scene without objects belongs to a stage: the spec-level check resolves its targets against the stage
      if (!o) objs.length && add([...base, "target"], `no object with id "${oid}" in this scene`);
      else if (pid !== undefined && !(o.parts ?? []).some((p) => p.id === pid)) add([...base, "target"], `no part "${pid}" in object "${oid}"`);
    }
  });
  (v.cameraKeys ?? []).forEach((k, i) => {
    at(["cameraKeys", i, "at"], k.at);
    if (k.focus && objs.length && !byId.has(k.focus)) add(["cameraKeys", i, "focus"], `no object with id "${k.focus}" in this scene`);
  });
  if (v.shots && v.cameraKeys) add(["shots"], "use either `shots` or `cameraKeys`, not both");
  (v.shots ?? []).forEach((k, i) => {
    at(["shots", i, "at"], k.at);
    if (k.focus && objs.length && !byId.has(k.focus)) add(["shots", i, "focus"], `no object with id "${k.focus}" in this scene`);
  });
  const overlay = v.overlay ?? [];
  const slot = (o) => (o.type === "limit" || o.type === "versus" ? "card" : o.type);
  overlay.forEach((o, i) => {
    const base = ["overlay", i];
    at([...base, "at"], o.at);
    at([...base, "until"], o.until);
    if (overlay.findIndex((x) => slot(x) === slot(o)) !== i) {
      add(["overlay"], slot(o) === "card" ? "one card (`limit` or `versus`) per scene" : `one \`${o.type}\` per scene`);
    }
    if (o.type === "flow") {
      const chips = new Set(o.chips.map((c) => c.id));
      if (chips.size !== o.chips.length) add([...base, "chips"], "chip ids must be unique");
      if (o.active && !chips.has(o.active)) add([...base, "active"], `no chip with id "${o.active}" in this flow`);
      (o.steps ?? []).forEach((st, j) => {
        at([...base, "steps", j, "at"], st.at);
        if (st.active && !chips.has(st.active)) add([...base, "steps", j, "active"], `no chip with id "${st.active}" in this flow`);
        for (const id of Object.keys(st.values ?? {})) if (!chips.has(id)) add([...base, "steps", j, "values"], `no chip with id "${id}" in this flow`);
      });
    }
    if (o.type === "limit") (o.steps ?? []).forEach((st, j) => at([...base, "steps", j, "at"], st.at));
  });
  if (v.world) {
    const wp = v.world.parts ?? [];
    const ids = checkParts(wp, ["world", "parts"], 40);
    wp.forEach((p, i) => {
      if (p.repeat && (p.parent !== undefined)) add(["world", "parts", i, "repeat"], "`repeat` goes on a root part (no `parent`); its children are copied with it");
    });
    (v.world.scatter ?? []).forEach((sc, i) => {
      const tpl = wp.find((p) => p.id === sc.part);
      if (!tpl) add(["world", "scatter", i, "part"], `no part with id "${sc.part}" in world.parts (the template of the scatter)`);
      else if (tpl.parent !== undefined || tpl.repeat) add(["world", "scatter", i, "part"], "a scatter template is a root part without `repeat`");
    });
    if (ids.size === wp.length && expandWorld(v.world).length > MAX_WORLD_EXPANDED) add(["world", "parts"], `the world expands to more than ${MAX_WORLD_EXPANDED} parts after \`repeat\` and \`scatter\`; lower the counts`);
    if (!wp.length && !v.world.crowd && !v.world.ground && !v.world.backdrop) add(["world"], "an empty world: add `parts`, `crowd`, `ground` or `backdrop`");
  }
}

// ---------------- easing + keyframes ----------------

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const DEG = Math.PI / 180;

const vec = (s) => (Array.isArray(s) ? s : [s, s, s]);
const track = keyTrack;

/**
 * Keyframes at time t: {pos (offset), rot (radians, added), scale (multiplier), opacity}, or null without keys.
 * Each channel interpolates only between the keys that set it. `sec` resolves a moment to seconds.
 */
export function sampleKeys(keys, t, sec) {
  if (!keys?.length) return null;
  const pos = sampleTrack(track(keys, sec, "pos"), t) ?? [0, 0, 0];
  const rot = sampleTrack(track(keys, sec, "rot", (r) => r.map((d) => d * DEG)), t) ?? [0, 0, 0];
  const scale = sampleTrack(track(keys, sec, "scale", vec), t) ?? [1, 1, 1];
  const opacity = sampleTrack(track(keys, sec, "opacity"), t) ?? 1;
  return { pos, rot, scale, opacity };
}

// ---------------- procedural presets ----------------

const AXIS = { x: 0, y: 1, z: 2 };
const norm3 = (v) => {
  const l = Math.hypot(...v);
  return l < 1e-6 ? null : v.map((x) => x / l);
};

/** Motion entries normalized to objects. */
export const motionList = (motion) => (motion ?? []).map((m) => (typeof m === "string" ? { type: m } : m)).filter((m) => MOTION_PRESETS.includes(m.type));

/**
 * Apply one preset to a delta in place.
 * ctx: {sec, enter, seed, side}; who: the part id (or null for the object); info: {rest, center, order, root} for
 * assemble/explode; order: the index of the part in the preset's `parts` list (walk phases).
 */
function applyPreset(d, m, t, ctx, { order = 0, info = null, key = "" } = {}) {
  const start = m.at !== undefined ? ctx.sec(m.at) : m.type === "pop-in" || m.type === "assemble" ? (ctx.enter ?? 0) : m.type === "explode" ? (ctx.enter ?? 0) + 1 : 0;
  const end = m.until !== undefined ? ctx.sec(m.until) : Infinity;
  const sp = m.speed ?? 1;
  const tt = Math.min(t, end);
  const tau = tt - start;
  // ramp continuous presets in and out (no pops when a window opens or closes)
  const w = smooth((t - start) / 0.25) * (end === Infinity ? 1 : 1 - smooth((t - end) / 0.25 + 1));
  const TAU = 2 * Math.PI;
  const ax = AXIS[m.axis ?? (m.type === "spin" ? "y" : m.type === "walk" ? "x" : "z")];
  switch (m.type) {
    case "bob":
      d.pos[1] += w * (m.amp ?? 0.08) * Math.sin(TAU * 0.8 * sp * tau);
      break;
    case "float":
      d.pos[1] += w * (m.amp ?? 0.12) * Math.sin(TAU * 0.3 * sp * tau);
      d.rot[2] += w * 0.06 * Math.sin(TAU * 0.23 * sp * tau + 1);
      d.rot[0] += w * 0.04 * Math.sin(TAU * 0.19 * sp * tau + 2);
      break;
    case "spin":
      if (tau > 0) d.rot[ax] += TAU * 0.25 * sp * tau * (m.amp ? m.amp / 360 : 1);
      break;
    case "wobble":
      d.rot[ax] += w * (m.amp ?? 10) * DEG * Math.sin(TAU * 1.2 * sp * tau);
      break;
    case "breathe": {
      const a = w * (m.amp ?? 0.04) * Math.sin(TAU * 0.45 * sp * tau);
      d.scale[1] *= 1 + a;
      d.scale[0] *= 1 - a / 2;
      d.scale[2] *= 1 - a / 2;
      break;
    }
    case "wave": {
      const wl = smooth((t - start) / 0.35) * (end === Infinity ? 1 : 1 - smooth((t - end) / 0.35 + 1));
      d.rot[ax] += (ctx.side ?? 1) * wl * ((m.lift ?? 130) + (m.amp ?? 25) * Math.sin(TAU * 1.6 * sp * tau)) * DEG;
      break;
    }
    case "walk": {
      if (key === "object") {
        d.pos[1] += w * 0.035 * Math.abs(Math.sin(TAU * 1.1 * sp * tau));
        break;
      }
      // pairs (left, right): left/right counter-phased, each next pair counter-phased to the previous one
      const phase = ((Math.floor(order / 2) + (order % 2)) % 2) * Math.PI;
      d.rot[ax] += w * (m.amp ?? 30) * DEG * Math.sin(TAU * 1.1 * sp * tau + phase);
      break;
    }
    case "blink": {
      const period = 2.8 / sp;
      let close = 0;
      const k0 = Math.max(0, Math.floor((t - start) / period) - 1);
      for (let k = k0; k <= k0 + 2; k++) {
        const c = start + 0.6 + k * period + (hash01(ctx.seed ?? 0, "blink", k) - 0.5) * 0.9;
        close = Math.max(close, clamp01((0.09 - Math.abs(t - c)) / 0.045));
      }
      if (t >= start && t <= end) d.scale[1] *= 1 - 0.92 * close;
      break;
    }
    case "hop": {
      if (tau < 0) break;
      const ph = (tau * 1.2 * sp) % 1;
      d.pos[1] += w * (m.amp ?? 0.35) * 4 * ph * (1 - ph);
      const squash = w * 0.18 * Math.max(0, 1 - ph / 0.1) * Math.max(0, 1 - Math.min(ph, 1 - ph) * 10);
      d.scale[1] *= 1 - squash;
      d.scale[0] *= 1 + squash / 2;
      d.scale[2] *= 1 + squash / 2;
      break;
    }
    case "orbit": {
      const r = m.amp ?? 0.5;
      const a = TAU * 0.2 * sp * Math.max(0, tau);
      d.pos[0] += w * r * Math.sin(a);
      d.pos[2] += w * r * (Math.cos(a) - 1);
      break;
    }
    case "pop-in": {
      const u = t < start ? 0 : EASE.back(clamp01((t - start) / 0.45));
      d.scale = d.scale.map((s) => s * u);
      break;
    }
    case "assemble":
    case "explode": {
      if (!info) break;
      const dir = norm3(info.rest.map((x, a) => x - info.center[a])) ?? norm3([hash01(ctx.seed, key, 1) - 0.5, hash01(ctx.seed, key, 2) * 0.6, hash01(ctx.seed, key, 3) - 0.5]) ?? [0, 1, 0];
      const dist = m.amp ?? (m.type === "assemble" ? 2.2 : 1.6);
      const spin = [hash01(ctx.seed, key, 4) - 0.5, hash01(ctx.seed, key, 5) - 0.5, hash01(ctx.seed, key, 6) - 0.5].map((x) => x * 4);
      if (m.type === "assemble") {
        const t0 = start + (info.order ?? 0) * 0.07 / sp;
        if (t < t0) {
          d.scale = d.scale.map(() => 0);
          break;
        }
        const u = EASE.back(clamp01((t - t0) / (0.7 / sp)));
        const off = 1 - u;
        d.pos = d.pos.map((x, a) => x + (dir[a] * dist + (a === 1 ? 0.6 : 0)) * off);
        d.rot = d.rot.map((r, a) => r + spin[a] * off);
        const g = Math.min(1, 0.3 + 0.7 * clamp01((t - t0) / 0.25));
        d.scale = d.scale.map((s) => s * g);
      } else {
        const u = EASE.out(clamp01((t - start) / (0.9 / sp)));
        d.pos = d.pos.map((x, a) => x + dir[a] * dist * u);
        d.rot = d.rot.map((r, a) => r + spin[a] * 0.4 * u);
      }
      break;
    }
    case "dig": {
      if (tau < 0) break;
      const ph = (tau * 1.0 * sp) % 1;
      const depth = m.amp ?? 0.35;
      if (ph < 0.3) {
        const u = ph / 0.3;
        d.pos[1] -= w * depth * Math.sin(u * Math.PI * 0.5);
        d.rot[0] += w * 25 * DEG * u;
      } else if (ph < 0.6) {
        const u = (ph - 0.3) / 0.3;
        d.pos[1] -= w * depth * Math.cos(u * Math.PI * 0.5);
        d.rot[0] += w * (25 - 45 * u) * DEG;
      } else if (ph < 0.9) {
        const u = (ph - 0.6) / 0.3;
        d.rot[2] += w * 30 * DEG * Math.sin(u * Math.PI);
        d.pos[1] += w * 0.1 * Math.sin(u * Math.PI);
      }
      break;
    }
    case "pour": {
      if (tau < 0) break;
      const u = clamp01((t - start) / (0.8 / sp));
      const tilt = (m.amp ?? 55) * DEG;
      d.rot[2] += w * tilt * EASE["in-out"](u);
      d.pos[1] -= w * 0.1 * Math.sin(u * Math.PI);
      break;
    }
    case "fill": {
      if (t < start) {
        d.scale[1] = 0.001;
        break;
      }
      const dur = Math.max(0.2, (end === Infinity ? 2.5 : end - start) / sp);
      const u = clamp01((t - start) / dur);
      const level = EASE["in-out"](u);
      d.scale[1] *= Math.max(0.001, level);
      if (level > 0.05 && level < 0.98) {
        d.scale[0] *= 1 + 0.02 * Math.sin(tau * 8);
        d.scale[2] *= 1 + 0.02 * Math.cos(tau * 8);
      }
      break;
    }
    case "drain": {
      if (t < start) break;
      const dur = Math.max(0.2, (end === Infinity ? 2.5 : end - start) / sp);
      const u = clamp01((t - start) / dur);
      const level = 1 - EASE["in-out"](u);
      d.scale[1] *= Math.max(0.001, level);
      break;
    }
    case "collapse": {
      if (t < start) break;
      const u = clamp01((t - start) / (0.7 / sp));
      const fall = EASE.in(u);
      d.pos[1] -= w * (m.amp ?? 0.6) * fall;
      d.rot[0] += w * 18 * DEG * fall;
      d.rot[2] += w * 12 * DEG * fall;
      if (u >= 0.95) d.scale[1] *= Math.max(0.2, 1 - 0.5 * (u - 0.95) * 20);
      break;
    }
    case "buoyancy": {
      if (t < start) break;
      const dur = Math.max(0.3, 1.8 / sp);
      const u = clamp01((t - start) / dur);
      const lift = EASE.out(u) * (m.amp ?? 0.85);
      d.pos[1] += w * lift;
      d.rot[2] += w * 4 * DEG * Math.sin(TAU * 0.4 * sp * tau);
      d.rot[0] += w * 2.5 * DEG * Math.cos(TAU * 0.35 * sp * tau + 1);
      break;
    }
    case "insert": {
      if (t < start) {
        d.pos[1] += w * (m.amp ?? 1.2);
        d.opacity = 0;
        break;
      }
      const u = clamp01((t - start) / (0.6 / sp));
      const settle = EASE.back(u);
      d.pos[1] += w * (m.amp ?? 1.2) * (1 - settle);
      d.opacity = Math.min(1, u * 3);
      break;
    }
    default:
      break; // look-at-camera: the renderer aims the node at the camera
  }
}

/**
 * Motion delta of a node (an object, or one part when `partId` is set) at t seconds:
 * {pos (offset), rot (radians), scale, opacity}. `inherited` = the object's motion entries (they reach the parts they
 * list: walk, blink, assemble, explode); `info` = {rest, center, order, root} of the part for assemble/explode.

 * @param {{keys?: any[], motion?: any[]}} node
 * @param {number} t
 * @param {{sec: (m: any) => number, enter?: number, seed?: number, side?: number}} ctx
 * @param {any[]} [inherited]
 * @param {string | null} [partId]
 * @param {{rest: number[], center: number[], order?: number, root?: boolean} | null} [info]
 * @returns {{pos: number[], rot: number[], scale: number[], opacity: number}}
 */
export function nodeDelta(node, t, ctx, inherited = [], partId = null, info = null) {
  const k = sampleKeys(node.keys, t, ctx.sec);
  const d = { pos: k ? [...k.pos] : [0, 0, 0], rot: k ? [...k.rot] : [0, 0, 0], scale: k ? [...k.scale] : [1, 1, 1], opacity: k ? k.opacity : 1 };
  for (const m of motionList(node.motion)) {
    if (partId === null && PART_TARGETING.includes(m.type)) {
      if (m.type === "walk") applyPreset(d, m, t, ctx, { key: "object" });
      continue; // the object's part presets act on its parts
    }
    applyPreset(d, m, t, ctx, { order: 0, info: info ?? { rest: [0, 0, 0], center: [0, -1, 0], order: 0 }, key: partId ?? "object" });
  }
  if (partId !== null) {
    for (const m of motionList(inherited)) {
      if (!PART_TARGETING.includes(m.type)) continue;
      const listed = m.parts ? m.parts.indexOf(partId) : -1;
      if (m.type === "walk" || m.type === "blink") {
        if (listed >= 0) applyPreset(d, m, t, ctx, { order: listed, key: partId });
      } else if (info && (m.parts ? listed >= 0 : info.root !== false)) {
        applyPreset(d, m, t, ctx, { info, key: partId });
      }
    }
  }
  return d;
}

/** Whether a node aims at the camera. */
export const looksAtCamera = (node) => motionList(node?.motion).some((m) => m.type === "look-at-camera");

// ---------------- world ----------------

/**
 * Flatten `repeat` of world parts: each copy of a repeated root part (with the parts hanging from it) gets the id suffix
 * `#k`, its position moved by `step * k` and its scale multiplied by `scaleStep ** k`. Pure; the original is copy 0.
 */
export function expandWorldParts(parts) {
  const out = [];
  const kids = (id) => parts.filter((q) => q.parent === id);
  const clone = (p, k, suffix, offset, sc, isRoot) => {
    const c = { ...p, id: k === 0 ? p.id : p.id + suffix };
    delete c.repeat;
    if (k > 0) {
      if (p.parent !== undefined) c.parent = p.parent + suffix;
      if (isRoot) {
        const pos = p.pos ?? [0, 0, 0];
        c.pos = pos.map((x, a) => Math.round((x + offset[a]) * 1000) / 1000);
        if (sc !== 1) c.scale = (Array.isArray(p.scale) ? p.scale : [p.scale ?? 1, p.scale ?? 1, p.scale ?? 1]).map((x) => Math.round(x * sc * 1000) / 1000);
      }
    }
    out.push(c);
    for (const ch of kids(p.id)) clone(ch, k, suffix, offset, sc, false);
  };
  const placed = new Set();
  const markSub = (p) => {
    placed.add(p.id);
    for (const ch of kids(p.id)) markSub(ch);
  };
  for (const p of parts) {
    if (p.parent !== undefined || placed.has(p.id)) continue;
    markSub(p);
    const r = p.repeat;
    const count = r?.count ?? 1;
    for (let k = 0; k < count; k++) {
      const step = r?.step ?? [0, 0, 0];
      clone(p, k, `#${k}`, step.map((x) => x * k), (r?.scaleStep ?? 1) ** k, true);
    }
  }
  // parts whose parent is missing or cyclic stay as they are (the schema reports them)
  for (const p of parts) if (!placed.has(p.id)) out.push({ ...p });
  return out;
}

/** Ids of `id` and every part hanging from it (document order). */
export function subtreeIds(parts, id) {
  const out = [];
  const walk = (i) => {
    out.push(i);
    for (const q of parts) if (q.parent === i && !out.includes(q.id)) walk(q.id);
  };
  if (parts.some((p) => p.id === id)) walk(id);
  return out;
}

const inZone = (x, z, zones) =>
  (zones ?? []).some((a) => (a.length === 4 ? x >= Math.min(a[0], a[2]) && x <= Math.max(a[0], a[2]) && z >= Math.min(a[1], a[3]) && z <= Math.max(a[1], a[3]) : Math.hypot(x - a[0], z - a[1]) <= a[2]));

/**
 * Copies of every `scatter` template: positions come from a seeded hash (same seed = same layout, no Math.random); copies
 * that land in an `avoid` zone are re-rolled up to 8 times and dropped after that. Copy ids carry `@<scatter>.<k>`;
 * every copy is flagged `inst` (the renderer draws them instanced). Pure.
 */
export function expandScatter(parts, scatter) {
  const out = [];
  const r3 = (x) => Math.round(x * 1000) / 1000;
  (scatter ?? []).forEach((sc, si) => {
    const root = parts.find((p) => p.id === sc.part);
    if (!root) return;
    const sub = subtreeIds(parts, root.id).map((id) => parts.find((p) => p.id === id));
    const [x0, z0, x1, z1] = sc.area;
    const seed = sc.seed ?? 0;
    const jr = sc.jitter?.rot ?? 360;
    const js = sc.jitter?.scale ?? 0;
    for (let k = 0; k < sc.count; k++) {
      let x = 0;
      let z = 0;
      let ok = false;
      for (let a = 0; a < 8 && !ok; a++) {
        x = x0 + (x1 - x0) * hash01(seed, si, k, a, "x");
        z = z0 + (z1 - z0) * hash01(seed, si, k, a, "z");
        ok = !inZone(x, z, sc.avoid);
      }
      if (!ok) continue;
      const yaw = (hash01(seed, si, k, "r") * 2 - 1) * jr;
      const sk = 1 + (hash01(seed, si, k, "s") * 2 - 1) * js;
      const suffix = `@${si}.${k}`;
      for (const q of sub) {
        const c = { ...q, id: q.id + suffix, inst: true };
        delete c.repeat;
        if (q.id === root.id) {
          delete c.parent;
          const rp = q.pos ?? [0, 0, 0];
          c.pos = [r3(x), r3((sc.y ?? 0) + rp[1]), r3(z)];
          const rr = q.rot ?? [0, 0, 0];
          c.rot = [rr[0], r3(rr[1] + yaw), rr[2]];
          const rs = Array.isArray(q.scale) ? q.scale : [q.scale ?? 1, q.scale ?? 1, q.scale ?? 1];
          c.scale = rs.map((v) => r3(v * sk));
        } else c.parent = q.parent + suffix;
        out.push(c);
      }
    }
  });
  return out;
}

/** Template part ids of a world's `scatter` (the templates and their children are not drawn themselves). */
export const scatterTemplateIds = (world) => new Set((world?.scatter ?? []).flatMap((sc) => subtreeIds(world.parts ?? [], sc.part)));

/**
 * The parts a world draws: `expandWorldParts` for the plain parts (scatter templates left out) plus the scatter copies.
 * Without scatter and up to WORLD_INSTANCE_FROM parts this is exactly `expandWorldParts(world.parts)` (classic plans keep their
 * bytes); beyond it, repeat copies are flagged `inst` for instanced rendering.
 */
export function expandWorld(world) {
  const parts = world?.parts ?? [];
  const tpl = scatterTemplateIds(world);
  const base = expandWorldParts(tpl.size ? parts.filter((p) => !tpl.has(p.id)) : parts);
  const inst = expandScatter(parts, world?.scatter);
  const all = [...base, ...inst];
  if (all.length <= WORLD_INSTANCE_FROM) return all;
  return all.map((p) => (p.id.includes("#") && !p.inst ? { ...p, inst: true } : p));
}

/** A stable signature of an agent-built subject or world: shapes, sizes and colors (used by the novelty guard). */
export const partsSignature = (parts) => JSON.stringify((parts ?? []).map((p) => [p.shape, p.size, p.color, p.pos]));

/**
 * Expand `shots` into camera keys (the shape of `cameraKeys`): preset offsets merged with the shot's own overrides.
 * `sec` resolves a moment; shots without `at` are spread evenly over `sceneSec`.
 */
export function shotsToKeys(shots, sceneSec, sec, opts = {}) {
  const n = shots?.length ?? 0;
  return (shots ?? []).map((s, i) => {
    // every channel is set on every key, so a shot never inherits the previous shot's pitch / yaw / zoom
    const frame = s.frame ?? (opts.stage && SHOT_FRAMES[s.shot] ? s.shot : null);
    const key = { yaw: 0, pitch: 0, zoom: 1, ...SHOT_PRESETS[s.shot], ...(frame ? SHOT_FRAMES[frame] : {}) };
    // the stage base framing is already close (STAGE_FRAME), so the preset punch-ins (zoom-to, dive, low...) ease off
    if (opts.stage && !frame && key.zoom < 1) key.zoom = Math.round(key.zoom * STAGE_ZOOM_EASE * 1000) / 1000;
    for (const f of ["yaw", "pitch", "zoom", "shift"]) if (s[f] !== undefined) key[f] = s[f];
    const t = s.at === undefined ? (sceneSec * i) / n : sec(s.at);
    return { at: Math.round(t * 1000) / 1000, ...key, ...(s.focus ? { focus: s.focus } : {}), ...(s.ease ? { ease: s.ease } : {}) };
  });
}

// ---------------- geometry estimates ----------------

const partScaleY = (p) => (p.scale === undefined ? 1 : Array.isArray(p.scale) ? p.scale[1] : p.scale);
/** Half height of a part's shape (unrotated), in its own units. */
export function partHalfHeight(p) {
  const s = p.size ?? [];
  const pts = p.points ?? [];
  switch (p.shape) {
    case "box":
      return (s.length === 3 ? s[1] : (s[0] ?? 0.5)) / 2;
    case "sphere":
      return s.length === 3 ? s[1] : (s[0] ?? 0.5);
    case "cylinder":
      return (s.length === 3 ? s[2] : (s[1] ?? 1)) / 2;
    case "cone":
      return (s[1] ?? 1) / 2;
    case "torus":
      return (s[0] ?? 0.5) + (s[1] ?? 0.1);
    case "capsule":
      return (s[0] ?? 0.3) + (s[1] ?? 0.5) / 2;
    case "plane":
    case "sign":
      return (s[1] ?? 1) / 2;
    case "ring":
      return s[1] ?? 0.5;
    case "tube":
      return pts.length ? Math.max(...pts.map((q) => Math.abs(q[1] ?? 0))) + (s[0] ?? 0.05) : 0;
    case "extrude":
    case "lathe":
      return pts.length ? Math.max(...pts.map((q) => Math.abs(q[1] ?? 0))) : 0;
    default:
      return 0;
  }
}

/** World-space rest centers of the parts (parent chain of positions; rotations ignored). */
export function partCenters(parts) {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const memo = new Map();
  const at = (p, depth = 0) => {
    if (memo.has(p.id)) return memo.get(p.id);
    const own = p.pos ?? [0, 0, 0];
    const par = p.parent !== undefined && byId.has(p.parent) && depth < MAX_PARTS ? at(byId.get(p.parent), depth + 1) : [0, 0, 0];
    const c = own.map((x, a) => x + par[a]);
    memo.set(p.id, c);
    return c;
  };
  return parts.map((p) => at(p));
}

/** Bounding radius of a part's shape (any rotation), in its own units. */
export function partRadius(p) {
  const s = p.size ?? [];
  const pts = p.points ?? [];
  const far = (k) => (pts.length ? Math.max(...pts.map((q) => Math.hypot(...q.slice(0, k)))) : 0);
  switch (p.shape) {
    case "box": {
      const [w, h, d] = s.length === 3 ? s : [s[0] ?? 0.5, s[0] ?? 0.5, s[0] ?? 0.5];
      return Math.hypot(w, h, d) / 2;
    }
    case "sphere":
      return Math.max(...(s.length ? s : [0.5]));
    case "cylinder":
      return Math.hypot(Math.max(s[0] ?? 0.3, s.length === 3 ? s[1] : 0), (s.length === 3 ? s[2] : (s[1] ?? 1)) / 2);
    case "cone":
      return Math.hypot(s[0] ?? 0.3, (s[1] ?? 1) / 2);
    case "torus":
      return (s[0] ?? 0.5) + (s[1] ?? 0.1);
    case "capsule":
      return (s[0] ?? 0.3) + (s[1] ?? 0.5) / 2;
    case "plane":
    case "sign":
      return Math.hypot(s[0] ?? 1, s[1] ?? 1) / 2;
    case "ring":
      return s[1] ?? 0.5;
    case "tube":
      return far(3) + (s[0] ?? 0.05);
    case "extrude":
      return far(2) + (s[0] ?? 0.2) / 2;
    case "lathe":
      return far(2);
    default:
      return 0;
  }
}

const maxScale = (p) => (p.scale === undefined ? 1 : Math.max(...vec(p.scale)));
const turned = (r) => Boolean(r && (r[0] % 180 !== 0 || r[2] % 180 !== 0));

/**
 * Rest extent of a custom model at size 1: `top` above its base and `half` = the horizontal half-width around its
 * axis. Parts under a tilted ancestor count with their bounding radius (rotation-safe), the rest with their height.
 */
export function customExtent(parts) {
  if (!parts?.length) return { top: 1.3, half: 0.75 };
  const centers = partCenters(parts);
  const byId = new Map(parts.map((p) => [p.id, p]));
  const tilted = (p) => {
    for (let q = p, k = 0; q && k <= parts.length; q = q.parent !== undefined ? byId.get(q.parent) : undefined, k++) if (turned(q.rot)) return true;
    return false;
  };
  let top = 0.3;
  let half = 0.3;
  parts.forEach((p, i) => {
    const r = partRadius(p) * maxScale(p);
    const c = centers[i];
    top = Math.max(top, c[1] + (tilted(p) ? r : partHalfHeight(p) * partScaleY(p)));
    half = Math.max(half, Math.hypot(c[0], c[2]) + r);
  });
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return { top: r3(top), half: r3(half) };
}

/** Top of a custom model above its base (world units at size 1); labels and framing use it. */
export const customHeight = (parts) => (parts?.length ? customExtent(parts).top : 1.3);

// ---------------- moments (word-synced timing) ----------------

/** Every string moment used by a scene3d visual. */
export function momentStrings(v) {
  const out = new Set();
  const add = (m) => {
    if (typeof m === "string") out.add(m);
  };
  const node = (x) => {
    add(x.at);
    for (const k of x.keys ?? []) add(k.at);
    for (const m of x.motion ?? []) if (typeof m === "object") (add(m.at), add(m.until));
  };
  for (const o of v?.objects ?? []) {
    node(o);
    for (const p of o.parts ?? []) node(p);
  }
  for (const f of v?.fx ?? []) (add(f.at), add(f.until));
  for (const o of v?.overlay ?? []) {
    add(o.at);
    add(o.until);
    for (const st of o.steps ?? []) add(st.at);
  }
  for (const k of v?.cameraKeys ?? []) add(k.at);
  for (const k of v?.shots ?? []) add(k.at);
  for (const b of v?.beats ?? []) add(b.at);
  for (const p of v?.world?.parts ?? []) node(p);
  return [...out];
}

/**
 * Resolve the string moments of one scene to seconds into the scene.
 * @returns {{moments: Record<string, number>, warnings: string[]}}
 */
export function resolveMoments(v, words, sceneFrames, fps) {
  return resolveMomentStrings(momentStrings(v), words, sceneFrames, fps);
}


