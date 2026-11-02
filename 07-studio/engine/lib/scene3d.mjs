// 3D templates (three.js via @remotion/three): the `scene3d` visual vocabulary, its zod schema, and the pure
// planning shared by the Node build and the Remotion bundle:
//   1. layout: place each scene's objects on the ground plane (world units, y up) without overlaps,
//   2. camera: a pure function of time (position, target, lens) per look and camera move,
//   3. projection: 3D point -> 1080x1920 pixel, so 2D labels can track 3D objects,
//   4. timing: staggered entrances and the beat list that drives the SFX (same shape as the illustrated plan).
// Nothing here may import Node built-ins: it is bundled by Remotion through lib/spec.mjs.
import { z } from "zod";
import { COLOR_TOKENS } from "./illustration-schema.mjs";
import { mix as mixColor, readableOn, readableWord } from "./captions.mjs";
import { contrastRatio } from "./palettes.mjs";
import { stageSceneFields, resolveTarget, resolveFocus, buildTracks, terrainDefaults, liquidDefaults, strataOf, titleBacking, STAGE_SAFE, stageState } from "./scene3d-stage.mjs";
import { customExtent, customHeight, expandWorld, partCenters,  partsSignature, sampleTrack, customObjectFields, generativeSceneFields, momentSchema, momentSec, refineGenerative, resolveMoments, sceneWords, shotsToKeys } from "./scene3d-motion.mjs";

/** Templates rendered with the 3D kit. Their look id equals the template id. */
export const THREE_D_TEMPLATE_IDS = ["clay-diorama", "iso-toon", "neon-glass", "pedestal", "paper-world", "toy-blocks", "holo-studio", "neon-grid", "soft-studio", "moody-night", "voxel-world", "data-stage", "monolith-story", "clay-mascot", "cutaway-explainer", "engineering-explainer", "process-explainer"];
export const usesThreeKit = (templateId) => THREE_D_TEMPLATE_IDS.includes(templateId);
/** The 3D look of a resolved spec: theme.look3d when valid, else the template id, else clay-diorama. */
export const look3dOf = (spec) => {
  const l = spec?.theme?.look3d;
  if (THREE_D_TEMPLATE_IDS.includes(l)) return l;
  return THREE_D_TEMPLATE_IDS.includes(spec?.template) ? spec.template : "clay-diorama";
};

/** Catalog kinds that stage stock GLB models: allowed only with `stock: true` (object or scene). */
export const STOCK_KINDS = ["character", "car", "model"];

/**
 * Procedural object kinds (built from primitives in src/three/objects.tsx; no external models needed).
 * Height is the nominal height in world units at scale 1 (footprint is about 1.4 x 1.4); labels anchor above it.
 */
export const OBJECT_SPECS = {
  cube: { h: 1.2, about: "rounded block; shows `icon` on its front face" },
  sphere: { h: 1.3, about: "glossy ball" },
  phone: { h: 1.9, about: "smartphone; `icon` on screen" },
  laptop: { h: 1.15, about: "open laptop; `icon` on screen" },
  monitor: { h: 1.6, about: "desktop screen on a stand; `icon` on screen" },
  server: { h: 1.9, about: "server rack with blinking LEDs" },
  database: { h: 1.5, about: "stacked database cylinders" },
  cloud: { h: 1.1, about: "puffy cloud" },
  document: { h: 1.6, about: "standing page with text lines; `icon` on the page" },
  folder: { h: 1.2, about: "file folder" },
  envelope: { h: 0.95, about: "mail envelope" },
  coin: { h: 1.3, about: "coin standing up; `value` = stack count 1-6 lays a stack instead" },
  chart: { h: 2.0, about: "3D bar chart; `values` (2-6 numbers) and optional `items` (bar labels)" },
  stat: { h: 0.5, about: "plinth with a big 2D number on top; `value` required" },
  lock: { h: 1.5, about: "padlock" },
  key: { h: 1.4, about: "key" },
  gear: { h: 1.4, about: "spinning gear" },
  globe: { h: 1.5, about: "globe with orbit ring" },
  chip: { h: 0.5, about: "CPU chip with pins" },
  battery: { h: 1.6, about: "battery; `value` 0..1 (or 0..100) charge level" },
  rocket: { h: 2.0, about: "rocket" },
  lightbulb: { h: 1.6, about: "glowing light bulb (idea)" },
  person: { h: 1.7, about: "simple generic figure (not a mascot)" },
  building: { h: 2.1, about: "office building with lit windows" },
  house: { h: 1.6, about: "house" },
  tree: { h: 1.9, about: "stylized tree" },
  pin: { h: 1.6, about: "map pin" },
  card: { h: 0.95, about: "credit card" },
  check: { h: 1.2, about: "check-mark badge (good)" },
  cross: { h: 1.2, about: "cross badge (bad)" },
  icon: { h: 1.3, about: "extruded Phosphor icon on a round tile; `icon` required" },
  model: { h: 1.6, about: "local CC0 GLB from 03-assets/3d; `model` required" },
  car: { h: 1.0, about: "low-poly car (CC0 model), nose toward the camera; `model` picks one of the car-* models" },
  character: { h: 1.7, about: "blocky character (CC0 model) with a looping animation: `anim` idle | walk | sprint | yes | no | sit | pick-up; `model` picks character-a/d/k" },
  custom: { h: 1.6, about: "agent-authored model built from primitive `parts` (characters, mascots, hero objects); height comes from the parts" },
};
export const OBJECT_KINDS = Object.keys(OBJECT_SPECS);
/** Local CC0 cars (Kenney Car Kit) for the `car` kind; the first one is the default. */
export const CAR_MODELS = ["car-sedan", "car-sedan-sports", "car-suv", "car-taxi", "car-truck"];
/** Local CC0 blocky characters (Kenney Blocky Characters) for the `character` kind (default cycles by index). */
export const CHARACTER_MODELS = ["character-a", "character-d", "character-k"];
/** Animation clips of the blocky characters (`anim`), mapped to the clip names inside the GLB. */
export const CHARACTER_ANIMS = { idle: "idle", walk: "walk", sprint: "sprint", yes: "emote-yes", no: "emote-no", sit: "sit", "pick-up": "pick-up" };
/** Local CC0 models (03-assets/3d/licenses.json): Poly Haven props, Kenney cars, characters, furniture and city pieces. */
export const MODEL_IDS = [
  "potted-plant-04", "alarm-clock-01", "food-apple-01", "megaphone-01",
  ...CAR_MODELS,
  ...CHARACTER_MODELS,
  "computer-mouse", "lamp-table", "books", "plant-small", "chair-desk", "bookcase",
  "city-building-a", "city-building-c", "city-building-skyscraper-a", "city-building-skyscraper-c", "city-low-detail-building-a",
  "street-light", "sign-highway", "construction-barrier",
];
/**
 * Stock environment sets (catalog scenery). No look stages one by default: `none` is the default everywhere and the
 * agent builds the world from scratch with `world`. A named set needs `stock: true` on the scene.
 * none = the look's own floor (plinth, baseplate, pad...); auto = the look's default (none).
 */
export const SETS_3D = ["auto", "none", "road", "desk", "room", "grid", "stage", "city", "voxel"];
/** Models each set dresses itself with (staged with the spec; a missing file just leaves the prop out). */
export const SET_MODELS = {
  none: [],
  road: ["sign-highway", "car-sedan", "car-suv", "car-taxi", "city-low-detail-building-a"],
  desk: ["lamp-table", "books", "plant-small", "computer-mouse"],
  room: ["bookcase", "plant-small", "lamp-table", "chair-desk"],
  grid: [],
  stage: [],
  city: ["city-building-a", "city-building-c", "city-building-skyscraper-a", "city-building-skyscraper-c", "street-light", "construction-barrier"],
  voxel: [],
};
export const CAMERA_MOVES = ["auto", "orbit", "dolly", "push", "crane", "pan", "turntable", "topdown", "static", "glide", "rise", "handheld", "pullout"];
export const CORNERS = ["bl", "br", "tl", "tr"];
export const LAYOUTS_3D = ["auto", "row", "grid", "flow", "circle", "stack", "hero"];

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #1A2B3C");
const color = z.union([hex, z.enum(COLOR_TOKENS)]);
const vec3 = z.tuple([z.number().min(-5).max(5), z.number().min(-1).max(5), z.number().min(-5).max(5)]);

export const object3dSchema = z.object({
  kind: z.enum(OBJECT_KINDS, { error: (iss) => `unknown 3D object kind${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${OBJECT_KINDS.join(", ")}` }),
  id: z.string().min(1).max(40).optional().describe("Reference for connect / focus"),
  label: z.string().min(1).max(28).optional().describe("2D tag that tracks the object"),
  color: color.optional().describe("Body color (hex or token); default cycles the palette accents"),
  value: z.union([z.number(), z.string().min(1).max(12)]).optional().describe("stat: big number; coin: stack count; battery: charge"),
  values: z.array(z.number().min(0)).min(2).max(6).optional().describe("chart: bar values"),
  items: z.array(z.string().min(1).max(10)).max(6).optional().describe("chart: bar labels"),
  icon: z.string().min(1).max(40).optional().describe("Phosphor icon name (icon kind, screens, cube face)"),
  model: z.enum(MODEL_IDS, { error: () => `unknown model; use one of: ${MODEL_IDS.join(", ")}` }).optional(),
  anim: z.enum(Object.keys(CHARACTER_ANIMS)).optional().describe("character: looping animation (default idle; walk/sprint also stride in place)"),
  size: z.number().min(0.4).max(2.2).optional().describe("Scale multiplier (default 1; the hero layout enlarges the first object)"),
  pos: vec3.optional().describe("World position override [x, y, z]; ground is y = 0"),
  at: momentSchema.optional().describe("When it appears: seconds or a narration word; omitted = auto-staggered"),
  highlight: z.boolean().optional().describe("Accent glow ring + pulse"),
  stock: z.boolean().optional().describe("true = this catalog kind (character, car, model) is wanted on purpose"),
  corner: z.enum(CORNERS).optional().describe("custom only: pin the object to a screen corner (bl, br, tl, tr) as a persistent mascot; it follows the camera"),
  ...customObjectFields,
});

export const connection3dSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1).max(20).optional(),
});

export const scene3dFields = {
  objects: z.array(object3dSchema).min(1).max(7).optional().describe('3D objects (visual.type "scene3d" only)'),
  layout: z.enum(LAYOUTS_3D).optional().describe("How objects are placed; auto picks by count"),
  camera: z.enum(CAMERA_MOVES).optional().describe("Camera move for this scene; auto alternates the look's moves"),
  focus: z.string().min(1).optional().describe("Object id the camera pushes in on during the scene"),
  connect: z.array(connection3dSchema).max(8).optional().describe("Animated arrows between object ids"),
  explode: z.boolean().optional().describe("Objects fly out from the center (exploded view)"),
  set: z.enum(SETS_3D, { error: (iss) => `unknown set${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${SETS_3D.join(", ")}` }).optional().describe("Stock environment set (needs stock: true on the scene); auto/none = no stock set. Build the world with `world` instead"),
  ...generativeSceneFields,
  ...stageSceneFields,
};

/** Kind-specific checks for a `scene3d` visual (paths relative to the visual). */
export function refineScene3d(v, ctx) {
  if (v.type !== "scene3d") return;
  const objs = v.objects ?? [];
  // an empty scene belongs to a stage (spec-level check, lib/scene3d-stage.mjs refineStageSpec); without one it needs an object
  const ids = new Set(objs.map((o) => o.id).filter(Boolean));
  // 3D is built from scratch: a custom object or a custom world, unless the scene opts into catalog content
  const world = v.world;
  const builds = objs.some((o) => o.kind === "custom") || Boolean(world && ((world.parts ?? []).length || world.crowd));
  if (objs.length && !v.stock && !builds) {
    ctx.addIssue({ code: "custom", path: ["objects"], message: "3D scenes are built from scratch: add a `custom` object (parts) or a custom `world` (parts or crowd); set `stock: true` on the visual only to use catalog content on purpose" });
  }
  if (!v.stock && v.set && v.set !== "auto" && v.set !== "none") {
    ctx.addIssue({ code: "custom", path: ["set"], message: `stock set "${v.set}" needs \`stock: true\` on the scene; build the set with \`world\` instead` });
  }
  objs.forEach((o, k) => {
    if (STOCK_KINDS.includes(o.kind) && !o.stock && !v.stock) {
      ctx.addIssue({ code: "custom", path: ["objects", k, "kind"], message: `kind "${o.kind}" stages a stock catalog model: build it with a \`custom\` object, or set \`stock: true\` on the object to use the catalog on purpose` });
    }
    if (o.corner && o.kind !== "custom") ctx.addIssue({ code: "custom", path: ["objects", k, "corner"], message: "`corner` pins a custom object (a mascot); use kind custom" });
  });
  const corners = objs.map((o) => o.corner).filter(Boolean);
  if (new Set(corners).size !== corners.length) ctx.addIssue({ code: "custom", path: ["objects"], message: "one object per screen corner" });
  if (corners.length && corners.length === objs.length) ctx.addIssue({ code: "custom", path: ["objects"], message: "a scene needs an object that is not pinned to a corner" });
  objs.forEach((o, k) => {
    const need = (field, msg) => ctx.addIssue({ code: "custom", path: ["objects", k, field], message: msg });
    if (o.kind === "chart" && !o.values) need("values", "chart objects need `values` (2-6 numbers)");
    if (o.kind === "chart" && o.items && o.values && o.items.length !== o.values.length) need("items", "chart `items` must have one label per value");
    if (o.kind === "stat" && o.value === undefined) need("value", "stat objects need `value`");
    if (o.kind === "icon" && !o.icon) need("icon", "icon objects need `icon` (a Phosphor icon name)");
    if (o.kind === "model" && !o.model) need("model", `model objects need \`model\`: one of ${MODEL_IDS.join(", ")}`);
    if (o.kind === "car" && o.model && !CAR_MODELS.includes(o.model)) need("model", `car objects take a car model: ${CAR_MODELS.join(", ")}`);
    if (o.kind === "character" && o.model && !CHARACTER_MODELS.includes(o.model)) need("model", `character objects take a character model: ${CHARACTER_MODELS.join(", ")}`);
  });
  const seen = new Set();
  objs.forEach((o, k) => {
    if (!o.id) return;
    if (seen.has(o.id)) ctx.addIssue({ code: "custom", path: ["objects", k, "id"], message: `duplicate object id "${o.id}"` });
    seen.add(o.id);
  });
  if (objs.length) (v.connect ?? []).forEach((c, k) => {
    for (const end of ["from", "to"]) if (!ids.has(c[end])) ctx.addIssue({ code: "custom", path: ["connect", k, end], message: `no object with id "${c[end]}" in this scene` });
  });
  if (v.focus && objs.length && !ids.has(v.focus)) ctx.addIssue({ code: "custom", path: ["focus"], message: `no object with id "${v.focus}" in this scene` });
  refineGenerative(v, ctx);
}

// ---------------- looks: camera language (materials and lights live in src/three/looks.ts) ----------------

/**
 * Camera defaults per look. Angles in degrees. `moves` is the rotation of auto camera moves (scene index modulo).
 * iso-toon uses an orthographic camera at the true isometric angle.
 */
export const LOOK3D = {
  "clay-diorama": { ortho: false, fov: 30, yaw: -20, pitch: 22, moves: ["orbit", "dolly", "crane", "orbit", "push"], float: 0.06, spin: 0 },
  "iso-toon": { ortho: true, fov: 30, yaw: 45, pitch: 35.264, moves: ["pan", "dolly", "orbit", "static"], float: 0, spin: 0 },
  "neon-glass": { ortho: false, fov: 34, yaw: 18, pitch: 16, moves: ["push", "orbit", "dolly", "crane"], float: 0.08, spin: 0 },
  "pedestal": { ortho: false, fov: 26, yaw: -10, pitch: 10, moves: ["turntable", "push", "orbit", "dolly"], float: 0.04, spin: 0.35 },
  // pop-up book seen from above: high pitch, cranes down as the pages open
  "paper-world": { ortho: false, fov: 28, yaw: 20, pitch: 26, moves: ["crane", "orbit", "dolly", "push"], float: 0, spin: 0 },
  // macro toy photography: a long lens (narrow fov) from a tabletop angle; the tilt-shift blur is a 2D overlay
  "toy-blocks": { ortho: false, fov: 17, yaw: -30, pitch: 22, moves: ["orbit", "topdown", "dolly", "pan"], float: 0, spin: 0 },
  // hologram on a projector pad: low eye-level camera, objects hover and slowly rotate on the pad
  "holo-studio": { ortho: false, fov: 32, yaw: 0, pitch: 11, moves: ["turntable", "orbit", "push", "crane"], float: 0.1, spin: 0.45 },
  // rendered formats: slow moves through a set (glide = lateral truck, rise = pedestal up), never a punch-in by default;
  // `wide` pulls the framing back so the set around the subject reads
  // a low camera in a fogged void; any grid or floor is built by the agent
  "neon-grid": { ortho: false, fov: 36, yaw: -22, pitch: 13, moves: ["glide", "orbit", "dolly", "rise"], float: 0, spin: 0, wide: 1.3 },
  // product-photo lens: long-ish focal length, three-quarter angle (the set is built by the agent)
  "soft-studio": { ortho: false, fov: 27, yaw: -30, pitch: 24, moves: ["dolly", "glide", "orbit", "rise"], float: 0, spin: 0, wide: 1.25 },
  // low cinematic camera with night light and fog and a slightly handheld feel; the scenery is built by the agent
  "moody-night": { ortho: false, fov: 30, yaw: 14, pitch: 9, moves: ["rise", "handheld", "dolly", "orbit"], float: 0, spin: 0, wide: 1.2 },
  // a low hero angle on blocky builds (never an isometric view: that belongs to iso-toon)
  "voxel-world": { ortho: false, fov: 31, yaw: -22, pitch: 15, moves: ["orbit", "rise", "handheld", "dolly"], float: 0, spin: 0, wide: 1.3 },
  // formats: a low hero camera looking toward a lit stage; a long push or a rise
  "data-stage": { ortho: false, fov: 34, yaw: 8, pitch: 7, moves: ["rise", "dolly", "glide", "push"], float: 0, spin: 0, wide: 1.35 },
  // a recurring monolith seen from below: push-ins, orbits and a handheld drift
  "monolith-story": { ortho: false, fov: 30, yaw: -12, pitch: 5, moves: ["push", "orbit", "handheld", "rise", "dolly"], float: 0, spin: 0, wide: 1.2 },
  // soft product camera at table height; the mascot rides in a screen corner
  "clay-mascot": { ortho: false, fov: 28, yaw: -14, pitch: 14, moves: ["dolly", "orbit", "glide", "push"], float: 0.05, spin: 0, wide: 1.1 },
  // cutaway explainer: a gentle three-quarter view of a cross-section that starts close on the character and pulls out
  "cutaway-explainer": { ortho: false, fov: 30, yaw: -16, pitch: 10, moves: ["pullout", "orbit", "dolly", "glide", "pullout"], float: 0, spin: 0, wide: 1.25 },
  // engineering explainer: master engineering camera framing both above-ground set and underground strata cutaway
  "engineering-explainer": { ortho: false, fov: 32, yaw: -18, pitch: 12, moves: ["pullout", "orbit", "dolly", "glide", "reveal"], float: 0, spin: 0, wide: 1.3 },
  // process explainer: one continuous daylight world seen from a gentle three-quarter angle; stage shots drive the camera
  "process-explainer": { ortho: false, fov: 32, yaw: -16, pitch: 10, moves: ["pullout", "glide", "orbit", "dolly", "reveal"], float: 0, spin: 0, wide: 1.3 },
};

/**
 * Render profile per look (cheap by design: no HDRI requirement, no SSAO, no depth of field, no extra AA chain).
 *   tone/exposure: renderer tone mapping; hdri: optional environment light (03-assets/3d, null = none or studio
 *   Lightformers for the older looks); envIntensity: its strength; shadowRadius: PCF softness of the single key shadow
 *   map; bloom: the composer bloom, only on the looks that always had it; fog: linear fog matched to the backdrop,
 *   near = dist * near + add, far = dist * far + 3 * add (dist = framing distance); set: default environment set.
 */
export const RENDER3D = {
  "clay-diorama": { tone: "neutral", exposure: 1.0, hdri: "brown-photostudio-02", envIntensity: 0.45, shadowRadius: 6, bloom: null, fog: null, set: "none" },
  "iso-toon": { tone: "none", exposure: 1.0, hdri: null, envIntensity: 0.8, shadowRadius: 1, bloom: null, fog: null, set: "none" },
  "neon-glass": { tone: "aces", exposure: 1.1, hdri: null, envIntensity: 1.0, shadowRadius: 1, bloom: { strength: 0.75, threshold: 0.9, radius: 0.55 }, fog: { near: 0.9, far: 2.4, add: 4 }, set: "none" },
  "pedestal": { tone: "aces", exposure: 1.0, hdri: "studio-small-09", envIntensity: 1.0, shadowRadius: 1, bloom: null, fog: { near: 0.9, far: 2.4, add: 4 }, set: "none" },
  "paper-world": { tone: "neutral", exposure: 1.05, hdri: null, envIntensity: 0.8, shadowRadius: 4, bloom: null, fog: null, set: "none" },
  "toy-blocks": { tone: "aces", exposure: 1.05, hdri: null, envIntensity: 0.8, shadowRadius: 5, bloom: null, fog: null, set: "none" },
  "holo-studio": { tone: "aces", exposure: 1.0, hdri: null, envIntensity: 0.8, shadowRadius: 1, bloom: { strength: 0.6, threshold: 0.88, radius: 0.55 }, fog: { near: 0.9, far: 2.4, add: 4 }, set: "none" },
  "neon-grid": { tone: "aces", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 4, bloom: null, fog: { near: 1.1, far: 3.4, add: 0 }, set: "none" },
  "soft-studio": { tone: "neutral", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 6, bloom: null, fog: { near: 1.6, far: 5.0, add: 0 }, set: "none" },
  "moody-night": { tone: "aces", exposure: 1.05, hdri: null, envIntensity: 0, shadowRadius: 4, bloom: null, fog: { near: 1.2, far: 4.5, add: 0 }, set: "none" },
  "voxel-world": { tone: "neutral", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 3, bloom: null, fog: { near: 1.4, far: 4.2, add: 0 }, set: "none" },
  "data-stage": { tone: "aces", exposure: 1.1, hdri: null, envIntensity: 0, shadowRadius: 4, bloom: { strength: 0.55, threshold: 0.85, radius: 0.5 }, fog: { near: 1.2, far: 3.6, add: 0 }, set: "none" },
  "monolith-story": { tone: "aces", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 5, bloom: null, fog: { near: 1.0, far: 3.4, add: 0 }, set: "none" },
  "clay-mascot": { tone: "neutral", exposure: 1.05, hdri: "brown-photostudio-02", envIntensity: 0.5, shadowRadius: 8, bloom: null, fog: null, set: "none" },
  "cutaway-explainer": { tone: "neutral", exposure: 1.1, hdri: null, envIntensity: 0, shadowRadius: 6, bloom: null, fog: null, set: "none" },
  "engineering-explainer": { tone: "neutral", exposure: 1.1, hdri: null, envIntensity: 0, shadowRadius: 6, bloom: null, fog: null, set: "none" },
  "process-explainer": { tone: "neutral", exposure: 1.1, hdri: null, envIntensity: 0, shadowRadius: 6, bloom: null, fog: null, set: "none" },
};

/** The stock environment set of a scene3d visual: explicit set, else the look's default (none for every look). */
export const setOf = (v, look) => (v?.set && v.set !== "auto" ? v.set : (RENDER3D[look]?.set ?? "none"));

// ---------------- layout ----------------

const SX = 2.3; // spacing across
const SZ = 2.2; // spacing in depth
const ROWS = { 1: [1], 2: [2], 3: [1, 2], 4: [2, 2], 5: [2, 1, 2], 6: [2, 2, 2], 7: [2, 3, 2] };
const r3 = (v) => Math.round(v * 1000) / 1000;
export const objectHeight = (kind) => OBJECT_SPECS[kind]?.h ?? 1.3;
/** Nominal height of one object: custom models measure their parts. */
export const heightOf = (o) => (o.kind === "custom" ? customHeight(o.parts) : objectHeight(o.kind));

/** Effective layout for a visual: auto picks hero for 1 object, row for 2, flow when there are connections, else grid. */
export const layoutOf = (v) => {
  const n = (v.objects ?? []).filter((o) => !o.corner).length;
  if (v.layout && v.layout !== "auto") return v.layout;
  if (n <= 1) return "hero";
  if (n === 2) return "row";
  return "grid";
};

/**
 * World placement of every object: `{pos: [x, y, z], scale, h}` (h = top of the object above its base, scaled).
 * Deterministic and overlap-free for up to 7 objects.
 */
export function layoutObjects(v) {
  const all = v.objects ?? [];
  // corner-pinned mascots are placed by cornerPlacement (screen space), not on the ground plane
  const idx = all.map((_, i) => i).filter((i) => !all[i].corner);
  const objs = idx.map((i) => all[i]);
  const n = objs.length;
  const layout = layoutOf(v);
  const out = [];
  all.forEach((o, i) => {
    if (o.corner) out[i] = { pos: [0, 0, 0], scale: r3(o.size ?? 1), h: r3(heightOf(o) * (o.size ?? 1)), corner: o.corner };
  });
  const put = (j, x, y, z, scale = 1) => {
    const i = idx[j];
    const s = scale * (objs[j].size ?? 1);
    out[i] = { pos: objs[j].pos ? objs[j].pos.map(r3) : [r3(x), r3(y), r3(z)], scale: r3(s), h: r3(heightOf(objs[j]) * s) };
    // custom models carry their real half-width, so wide or tilted models are framed whole
    if (objs[j].kind === "custom") out[i].half = r3(Math.max(0.75, customExtent(objs[j].parts).half) * s);
  };
  if (!n) return out;
  if (layout === "row") {
    objs.forEach((_, i) => put(i, (i - (n - 1) / 2) * SX, 0, 0, n > 3 ? 0.8 : 1));
  } else if (layout === "flow") {
    // zigzag from the back (screen top) to the front (screen bottom): reads top-down in portrait
    objs.forEach((_, i) => put(i, (i % 2 ? 1 : -1) * (n > 1 ? 1.15 : 0), 0, (i - (n - 1) / 2) * 1.75, 0.9));
  } else if (layout === "circle") {
    put(0, 0, 0, 0, 1.25);
    const k = n - 1;
    for (let i = 1; i < n; i++) {
      const a = Math.PI / 2 + ((i - 1) / Math.max(1, k)) * Math.PI * 2;
      put(i, Math.cos(a) * 2.5, 0, Math.sin(a) * 2.1, 0.75);
    }
  } else if (layout === "stack") {
    let y = 0;
    objs.forEach((o, i) => {
      put(i, 0, y, 0, 1);
      y += heightOf(o) * (o.size ?? 1) + 0.25;
    });
  } else if (layout === "hero") {
    put(0, 0, 0, 0, n > 1 ? 1.45 : objs[0].kind === "stat" ? 1.1 : 1.6);
    const k = n - 1;
    for (let i = 1; i < n; i++) {
      const a = k === 1 ? 0 : -0.5 + (i - 1) / (k - 1); // -0.5..0.5 across the front arc
      put(i, a * 4.2 + (k === 1 ? 2 : 0), 0, 1.7 - Math.abs(a) * 0.8, 0.6);
    }
  } else {
    const rows = ROWS[Math.min(7, Math.max(1, n))];
    let i = 0;
    rows.forEach((count, r) => {
      const z = (r - (rows.length - 1) / 2) * SZ;
      for (let c = 0; c < count; c++, i++) put(i, (c - (count - 1) / 2) * SX, 0, z, n > 4 ? 0.85 : 1);
    });
  }
  return out;
}

/** Axis-aligned bounds of the placed objects (footprint 1.5 x 1.5 per unit of scale, or a custom model's `half`). */
export function boundsOf(all) {
  const placed = all.filter((p) => !p.corner);
  if (!placed.length) return { min: [-1, 0, -1], max: [1, 1.2, 1] };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of placed) {
    const half = p.half ?? 0.75 * p.scale;
    const lo = [p.pos[0] - half, p.pos[1], p.pos[2] - half];
    const hi = [p.pos[0] + half, p.pos[1] + p.h, p.pos[2] + half];
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], lo[a]);
      max[a] = Math.max(max[a], hi[a]);
    }
  }
  return { min, max };
}

// ---------------- camera ----------------

const DEG = Math.PI / 180;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2); // cubic in-out
const easeOut = (u) => 1 - (1 - u) ** 3;
const mix = (a, b, u) => a + (b - a) * u;

/** The camera move used by scene `index` (resolves "auto" through the look's rotation). */
export const resolveMove = (move, look, index) => (!move || move === "auto" ? LOOK3D[look].moves[index % LOOK3D[look].moves.length] : move);

/**
 * Camera framing for a set of placed objects: target (center of the content), the distance (perspective) or the
 * visible height in world units (orthographic) so the content fits the stage band of the 1080x1920 frame.
 */
export function frameContent(placed, look, opts = {}) {
  const L = LOOK3D[look];
  const { min, max } = boundsOf(placed);
  const w = max[0] - min[0];
  const d = max[2] - min[2];
  const h = max[1] - min[1];
  const targetY = min[1] + h * (opts.targetFrac ?? (look === "cutaway-explainer" || look === "engineering-explainer" || look === "process-explainer" ? 0.32 : 0.42));
  const target = [(min[0] + max[0]) / 2, targetY, (min[2] + max[2]) / 2];
  const pitch = L.pitch * DEG;
  // projected extents: width across the frame, and height (object height + depth foreshortened by the pitch)
  // a minimum size keeps single objects from filling the frame (stat numbers and labels need room)
  // opts.maxW crops the sides of a wide world (the subject stays large; wide shots pull back with a zoom)
  const W = Math.min(opts.maxW ?? Infinity, Math.max(Math.max(w, d * 0.7) + 0.6, 3.4));
  const H = h * Math.cos(pitch) + d * Math.sin(pitch) + 0.6;
  const aspect = 1080 / 1920;
  const wide = opts.wide ?? L.wide ?? 1;
  const minDist = opts.minDist ?? 6;
  if (L.ortho) {
    // visible height so the content spans ~80% of the width and ~40% of the height
    const viewH = Math.max(W / (0.8 * aspect), H / 0.4, 6) * wide;
    return { target, dist: 30, viewH };
  }
  const t = Math.tan((L.fov / 2) * DEG);
  const dist = Math.max(W / (0.8 * 2 * t * aspect), H / ((opts.fill ?? 0.42) * 2 * t), minDist) * wide;
  return { target, dist, viewH: 0 };
}

/**
 * Camera state at `t` seconds into a scene of `sceneSec` seconds. Pure: the R3F camera and the 2D label anchors
 * both call it, so labels stay locked to objects.
 * @param {{t: number, sceneSec: number, look: string, move: string, frame: {target: number[], dist: number, viewH: number}, focusPos?: number[] | null, keys?: {t: number, yaw?: number, pitch?: number, zoom?: number, shift?: number[], ease?: string}[] | null, extra?: {yaw?: number, pitch?: number, zoom?: number, shift?: number[]} | null}} args
 *   keys: resolved camera keyframes (plan.cameraKeys) layered on top of the move
 *   extra: {yaw?, pitch?, zoom?, shift?} offsets added last (stage camera beats)
 * @returns {{ortho: boolean, fov: number, viewH: number, position: number[], target: number[]}}
 */
export function cameraAt({ t, sceneSec, look, move, frame: fr, focusPos = null, keys = null, extra = null }) {
  const L = LOOK3D[look];
  const u = clamp01(t / Math.max(0.5, sceneSec));
  let yaw = L.yaw;
  let pitch = L.pitch;
  let dist = fr.dist;
  let viewH = fr.viewH;
  let target = [...fr.target];
  const zoom = (k) => {
    dist *= k;
    viewH *= k;
  };
  switch (move) {
    case "orbit":
      yaw += mix(-14, 14, ease(u));
      zoom(mix(1.06, 0.98, ease(u)));
      break;
    case "dolly":
      zoom(mix(1.22, 0.94, ease(u)));
      break;
    case "push": {
      // punch in on the cut, then a slow drift
      const p = easeOut(clamp01(t / 0.7));
      zoom(mix(1.35, 1.0, p) * mix(1, 0.95, u));
      yaw += mix(6, 0, p);
      break;
    }
    case "crane":
      pitch = mix(L.pitch * 0.45, L.pitch * 1.35, ease(u));
      zoom(mix(1.08, 0.98, ease(u)));
      break;
    case "pan":
      target = [target[0] + mix(-0.45, 0.45, ease(u)), target[1], target[2] + mix(0.3, -0.3, ease(u))];
      zoom(1.1);
      break;
    case "turntable":
      yaw += mix(-40, 40, u);
      zoom(mix(1.05, 0.96, ease(u)));
      break;
    case "topdown":
      pitch = mix(58, 72, ease(u));
      zoom(mix(1.12, 1.0, ease(u)));
      break;
    case "glide":
      // lateral truck through the set: the target slides with the camera, plus a slow push
      target = [target[0] + mix(-0.6, 0.6, ease(u)), target[1], target[2]];
      yaw += mix(-5, 5, ease(u));
      zoom(mix(1.07, 0.97, ease(u)));
      break;
    case "rise":
      // camera pedestal: climbs and tilts down a little as it settles
      pitch = mix(L.pitch * 0.72, L.pitch * 1.08, ease(u));
      target = [target[0], target[1] + mix(-0.15, 0.1, ease(u)), target[2]];
      zoom(mix(1.1, 0.98, ease(u)));
      break;
    case "pullout": {
      // starts close on the subject and pulls out to show the whole cutaway, drifting a little sideways
      const p = ease(u);
      zoom(mix(0.5, 1.05, p));
      yaw += mix(-9, 7, p);
      pitch = mix(L.pitch * 0.5, L.pitch * 1.15, p);
      break;
    }
    case "handheld": {
      // hand-held feel: slow deterministic drift in yaw, pitch and the look-at point, plus a gentle push
      const w = t * 0.9;
      yaw += Math.sin(w * 1.3) * 2.2 + Math.sin(w * 2.9 + 1) * 0.9;
      pitch += Math.sin(w * 1.1 + 2) * 1.3 + Math.sin(w * 3.3) * 0.5;
      target = [target[0] + Math.sin(w * 1.7) * 0.12, target[1] + Math.sin(w * 2.1 + 0.5) * 0.08, target[2]];
      zoom(mix(1.08, 0.97, ease(u)));
      break;
    }
    default:
      break;
  }
  if (keys?.length) {
    // camera keyframes ride on top of the move (each channel interpolates between the keys that set it)
    const ch = (field) => sampleTrack(keys.filter((k) => k[field] !== undefined).map((k) => ({ t: k.t, v: k[field], ease: k.ease })), t);
    yaw += ch("yaw") ?? 0;
    pitch += ch("pitch") ?? 0;
    zoom(ch("zoom") ?? 1);
    const sh = ch("shift");
    if (sh) target = target.map((c, a) => c + sh[a]);
  }
  if (extra) {
    // stage camera beats: offsets on top of the shots
    yaw += extra.yaw ?? 0;
    pitch += extra.pitch ?? 0;
    zoom(extra.zoom ?? 1);
    if (extra.shift) target = target.map((c, a) => c + extra.shift[a]);
  }
  if (focusPos) {
    const f = ease(clamp01((u - 0.3) / 0.45));
    target = target.map((c, a) => mix(c, a === 1 ? focusPos[1] : focusPos[a], f));
    zoom(mix(1, 0.62, f));
  }
  if (L.ortho && move === "orbit") yaw = L.yaw + mix(-8, 8, ease(u)); // iso keeps its angle readable
  const cp = Math.cos(pitch * DEG);
  const off = [Math.sin(yaw * DEG) * cp, Math.sin(pitch * DEG), Math.cos(yaw * DEG) * cp];
  const r = L.ortho ? 30 : dist;
  return {
    ortho: L.ortho,
    fov: L.fov,
    viewH: r3(viewH),
    position: off.map((o, a) => r3(target[a] + o * r)),
    target: target.map(r3),
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(...a) || 1;
  return a.map((x) => x / l);
};

/** Project a world point to pixels for a camera state (same convention as three.js lookAt with up = +y). */
export function projectPoint(cam, p, width = 1080, height = 1920) {
  const fwd = norm(sub(cam.target, cam.position));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const v = sub(p, cam.position);
  const x = dot(v, right);
  const y = dot(v, up);
  const z = dot(v, fwd);
  const aspect = width / height;
  let nx;
  let ny;
  if (cam.ortho) {
    nx = x / ((cam.viewH / 2) * aspect);
    ny = y / (cam.viewH / 2);
  } else {
    const t = Math.tan((cam.fov / 2) * DEG);
    nx = x / (Math.max(0.01, z) * t * aspect);
    ny = y / (Math.max(0.01, z) * t);
  }
  return { x: ((nx + 1) / 2) * width, y: ((1 - ny) / 2) * height, depth: z };
}

/**
 * World placement of a corner-pinned mascot for a camera state: its base sits at a screen corner above the caption band (y < 1130), 13% of the frame tall at `size` 1, turned slightly toward the center. Pure, perspective and ortho.
 * @returns {{pos: number[], scale: number, yaw: number}}
 */
export function cornerPlacement(cam, corner, baseHeight, size = 1, dist = null) {
  const px = { bl: [220, 1090], br: [860, 1090], tl: [220, 780], tr: [860, 780] }[corner] ?? [200, 1470];
  const fwd = norm(sub(cam.target, cam.position));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const d = dist ?? Math.hypot(...sub(cam.target, cam.position)) * 0.6;
  const aspect = 1080 / 1920;
  const nx = (px[0] / 1080) * 2 - 1;
  const ny = 1 - (px[1] / 1920) * 2;
  const halfH = cam.ortho ? cam.viewH / 2 : Math.tan((cam.fov / 2) * DEG) * d;
  const pos = [0, 1, 2].map((a) => cam.position[a] + fwd[a] * d + right[a] * nx * halfH * aspect + up[a] * ny * halfH);
  const scale = (0.13 * size * 2 * halfH) / Math.max(0.2, baseHeight);
  const yaw = Math.atan2(cam.position[0] - pos[0], cam.position[2] - pos[2]) + (corner.endsWith("l") ? 0.4 : -0.4);
  return { pos: pos.map(r3), scale: r3(scale), yaw: r3(yaw) };
}

/** Idle float offset (y) of object `i` at `t` seconds (frame-driven replacement for drei <Float>). */
export const floatY = (look, t, i) => (LOOK3D[look]?.float ?? 0) * Math.sin(t * 1.6 + i * 1.7);

// ---------------- timing + beats ----------------

const round = (x) => Math.round(x * 1000) / 1000;

/** Entrance times (seconds into the scene) of the objects: explicit `at`, else staggered after the headline. */
export function objectTimes(objects, sceneSec, moments = {}) {
  const first = 0.45;
  const last = Math.max(first, sceneSec - 1.6);
  const step = objects.length > 1 ? Math.min(0.9, Math.max(0.22, (last - first) / (objects.length - 1))) : 0;
  return objects.map((o, i) => round(o.at === undefined ? first + i * step : momentSec(o.at, moments)));
}

/** Default appearance time of an overlay element (after the cut and the first object). */
const OVERLAY_AT = 0.4;
/** Overlay elements with every moment resolved to seconds into the scene (steps sorted by time). */
export function planOverlay(overlay, moments = {}) {
  return (overlay ?? []).map((o) => {
    const out = { ...o, at: round(momentSec(o.at ?? OVERLAY_AT, moments)), until: o.until === undefined ? null : round(momentSec(o.until, moments)) };
    if (o.steps) out.steps = o.steps.map((st) => ({ ...st, at: round(momentSec(st.at, moments)) })).sort((a, b) => a.at - b.at);
    return out;
  });
}

/**
 * Plan one `scene3d` visual: layout, entrances, chart bar times, connections, the resolved camera move, and
 * `elements` in the illustrated planner's shape so `computeBeats` turns them into SFX beats.
 */
export function planScene3d(v, sceneSec, { look = "clay-diorama", index = 0, moments = {}, warnings = [] } = {}) {
  const objects = v.objects ?? [];
  const placed = layoutObjects(v);
  const enters = objectTimes(objects, sceneSec, moments);
  const byId = Object.fromEntries(objects.map((o, i) => [o.id, i]).filter(([id]) => id));
  const auto = layoutOf(v) === "flow" && !v.connect ? objects.slice(1).map((_, i) => ({ from: i, to: i + 1 })) : [];
  const connections = [...(v.connect ?? []).map((c) => ({ from: byId[c.from], to: byId[c.to], label: c.label })), ...auto]
    .filter((c) => c.from !== undefined && c.to !== undefined)
    .map((c) => ({ ...c, enter: round(Math.max(enters[c.from], enters[c.to]) + 0.35) }));
  const objs = objects.map((o, i) => {
    const items = o.kind === "chart" ? (o.values ?? []).map((_, k) => round(enters[i] + 0.25 + k * 0.18)) : [];
    return { ...placed[i], enter: enters[i], items };
  });
  const elements = [
    ...objs.map((p, i) => ({ el: { type: "icon", kind: objects[i].kind }, box: null, enter: p.enter, items: p.items })),
    ...connections.map((c) => ({ el: { type: "svg" }, box: null, enter: c.enter, items: [] })),
    // impact effects are beats too (a pop on the shockwave / burst)
    ...(v.fx ?? []).filter((f) => f.type === "shockwave" || (f.type === "particles" && f.burst)).map((f) => ({ el: { type: "icon", kind: f.type }, box: null, enter: round(momentSec(f.at, moments)), items: [] })),
    // overlay cards and strips pop in as beats too
    ...planOverlay(v.overlay, moments).map((o) => ({ el: { type: "icon", kind: `overlay-${o.type}` }, box: null, enter: o.at, items: [] })),
  ];
  const focus = v.focus !== undefined ? byId[v.focus] : undefined;
  const frame = frameContent(placed, look);
  // camera keys: moments -> seconds, focus -> a shift of the look-at point onto that object
  const rawKeys = v.shots ? shotsToKeys(v.shots, sceneSec, (m) => momentSec(m, moments)) : (v.cameraKeys ?? []);
  const cameraKeys = rawKeys.map((k) => {
    const out = { t: round(momentSec(k.at, moments)), ease: k.ease };
    if (k.yaw !== undefined) out.yaw = k.yaw;
    if (k.pitch !== undefined) out.pitch = k.pitch;
    if (k.zoom !== undefined) out.zoom = k.zoom;
    const fi = k.focus !== undefined ? byId[k.focus] : undefined;
    const f = fi === undefined ? null : placed[fi];
    const shift = k.shift ?? [0, 0, 0];
    if (f) out.shift = [0, 1, 2].map((a) => r3(f.pos[a] + (a === 1 ? f.h * 0.5 : 0) - frame.target[a] + shift[a]));
    else if (k.shift) out.shift = k.shift;
    return out;
  }).sort((a, b) => a.t - b.t);
  const w = v.world;
  const overlay = planOverlay(v.overlay, moments);
  return {
    kind: "scene3d",
    world: w ? { concept: w.concept, ground: w.ground ?? null, backdrop: w.backdrop ?? null, parts: expandWorld(w), crowd: w.crowd ?? null } : null,
    set: setOf(v, look),
    layout: layoutOf(v),
    move: resolveMove(v.camera, look, index),
    frame,
    focus: focus === undefined ? null : focus,
    explode: Boolean(v.explode),
    objects: objs,
    connections,
    elements,
    moments,
    cameraKeys,
    ...(overlay.length ? { overlay } : {}),
    warnings,
  };
}


// ---------------- persistent stage ----------------

/**
 * The scene plans of a spec with a `stage` (lib/scene3d-stage.mjs): ONE shared stage plan (world, actors, terrain, liquids,
 * tracks of every beat in global seconds, the continuous camera path) plus each scene's `t0` (its start, global seconds),
 * overlay and local moments. State and camera are pure functions of global time, so a scene starts exactly where the previous
 * one ended and nothing is rebuilt per scene.
 */
/** Framing of a staged video: the subject fills the portrait frame (a slim title band on top, the whole lower area for the cutaway or the action). */
export const STAGE_FRAME = { fill: 0.6, wide: 1, minDist: 3.2, targetFrac: 0.5, maxW: 9.5 };

export function planStageScenes(spec, timeline, captions = null) {
  const fps = spec.format.fps;
  const look = look3dOf(spec);
  const stage = spec.stage;
  const words = sceneWords(spec, timeline, captions);
  const totalSec = round(timeline.totalFrames / fps);
  const scenes = spec.scenes.map((s, i) => {
    const sc = timeline.scenes[i];
    const last = i === timeline.scenes.length - 1;
    const sec = (sc.durationInFrames - (last ? 0 : timeline.transitionFrames)) / fps;
    const v = s.visual?.type === "scene3d" ? s.visual : { type: "scene3d", objects: [] };
    const { moments, warnings } = resolveMoments(v, words[i], sc.durationInFrames, fps);
    return { v, sec, t0: round(sc.from / fps), moments, warnings };
  });
  // actors: the existing layout helper places them (explicit positions; the stack layout never rescales)
  const actors = stage.actors ?? [];
  const placed = layoutObjects({ layout: "stack", objects: actors.map((a) => ({ kind: "custom", id: a.id, parts: a.parts, size: a.size, pos: a.pos ?? [0, 0, 0] })) }).map((p, k) => ({ ...p, enter: actors[k].at ?? 0, items: [] }));
  const terrain = stage.terrain ? terrainDefaults(stage.terrain) : null;
  // beats -> global, resolved targets
  const beats = [];
  const carves = [];
  scenes.forEach((sc) => {
    for (const b of sc.v.beats ?? []) {
      const target = resolveTarget(b.target, stage);
      if (target.error) continue;
      const t = round(momentSec(b.at, sc.moments) + sc.t0);
      if (b.carve) carves.push({ t, dur: b.dur ?? 1.2, ease: b.ease, id: b.carve.id, region: b.carve.region, depth: b.carve.depth, mode: b.carve.mode, bank: b.carve.bank });
      else beats.push({ t, dur: b.dur ?? 0.6, ease: b.ease, kind: b.set ? "set" : "to", target, state: b.set ?? b.to });
    }
  });
  const liquids = (stage.liquids ?? []).map(liquidDefaults);
  const tracks = buildTracks(beats, { liquids });
  const palette = spec.theme?.palette ?? { bg: ["#0F0C29"], text: "#FFFFFF", accent: "#FFD60A" };
  // framing: actors + the ground block, filling the stage band (not the title and caption bands)
  // framing: actors flagged `noFrame` (sky bodies, far props, world-sized veils) do not pull the camera back
  const items = placed.filter((_, k) => !actors[k].noFrame);
  if (terrain) items.push({ pos: [terrain.pos[0], -terrain.depth * 0.5, terrain.pos[1]], scale: 1, h: terrain.depth * 0.5 + 0.2, half: Math.min(8, Math.max(terrain.size[0], terrain.size[1] * 0.8) / 2) });
  if (!items.length) items.push({ pos: [0, 0, 0], scale: 1, h: 2, half: 3 });
  const frame = frameContent(items, look, STAGE_FRAME);
  const front = terrain ? terrain.pos[1] + terrain.size[1] / 2 : 0;
  const carveById = new Map(carves.filter((c) => c.id).map((c) => [c.id, c]));
  /** World point a focus reference looks at, at global second g. */
  const focusPoint = (ref, g, dive = false) => {
    const r = resolveFocus(ref, stage, new Set(carveById.keys()));
    if (r.error) return null;
    const st = stageState({ tracks, actors, liquids }, g);
    if (r.kind === "terrain") {
      const c = r.carve ? carveById.get(r.carve) : null;
      if (c) {
        const [cx, cz] = c.region.box ? [(c.region.box[0] + c.region.box[2]) / 2, (c.region.box[1] + c.region.box[3]) / 2] : [c.region.disc[0], c.region.disc[1]];
        return dive ? [cx, -Math.min(terrain.depth, c.depth ?? 1) * 0.5, front - 0.3] : [cx, -Math.min(terrain.depth, c.depth ?? 1) * 0.4, cz];
      }
      return [terrain.pos[0], -terrain.depth * 0.3, dive ? front - 0.3 : terrain.pos[1]];
    }
    if (r.kind === "liquid") {
      const l = liquids.find((x) => x.id === r.liquid);
      const [x0, z0, x1, z1] = l.area;
      return [(x0 + x1) / 2, l.floor + (l.top - l.floor) * (st.liquids[l.id]?.level ?? 0), (z0 + z1) / 2];
    }
    const k = actors.findIndex((a) => a.id === r.actor);
    const pl = placed[k];
    const off = st.actors[r.actor]?.pos ?? [0, 0, 0];
    if (r.kind === "part") {
      const parts = actors[k].parts;
      const c = partCenters(parts)[parts.findIndex((p) => p.id === r.part)];
      return [0, 1, 2].map((a) => pl.pos[a] + off[a] + c[a] * pl.scale);
    }
    return [pl.pos[0] + off[0], pl.pos[1] + off[1] + pl.h * 0.5, pl.pos[2] + off[2]];
  };
  const cameraKeys = [];
  scenes.forEach((sc) => {
    const sec = (m) => momentSec(m, sc.moments);
    let raw = sc.v.shots ? shotsToKeys(sc.v.shots, sc.sec, sec, { stage: true }) : (sc.v.cameraKeys ?? []);
    if (!sc.v.shots && !sc.v.cameraKeys && sc.v.focus) raw = shotsToKeys([{ shot: "zoom-to", focus: sc.v.focus, at: 0 }], sc.sec, sec, { stage: true });
    raw.forEach((k, ki) => {
      const g = round(momentSec(k.at, sc.moments) + sc.t0);
      const shot = sc.v.shots?.[ki];
      const dive = shot?.shot === "dive";
      const out = { t: g, ease: shot?.cut ? "step" : k.ease };
      if (k.yaw !== undefined) out.yaw = k.yaw;
      if (k.pitch !== undefined) out.pitch = k.pitch;
      if (k.zoom !== undefined) out.zoom = k.zoom;
      if (dive && !shot.yaw && !shot.pitch) {
        // level the camera with the cutaway face: cancel the look's yaw, drop to a shallow downward angle
        out.yaw = -LOOK3D[look].yaw;
        out.pitch = 4 - LOOK3D[look].pitch;
      }
      if (k.focus) out.focusActor = k.focus.split("/")[0];
      const f = k.focus ? focusPoint(k.focus, g, dive) : null;
      const shift = k.shift ?? [0, 0, 0];
      if (f) out.shift = [0, 1, 2].map((a) => r3(f[a] - frame.target[a] + shift[a]));
      else if (k.shift) out.shift = k.shift;
      cameraKeys.push(out);
    });
  });
  cameraKeys.sort((a, b) => a.t - b.t);
  if (!cameraKeys.length || cameraKeys[0].t > 0) cameraKeys.unshift({ t: 0, yaw: 0, pitch: 0, zoom: 1, shift: [0, 0, 0] });
  const w = stage.world;
  const shared = {
    concept: stage.concept,
    world: w ? { concept: w.concept ?? stage.concept, ground: w.ground ?? null, backdrop: w.backdrop ?? null, parts: expandWorld(w), crowd: w.crowd ?? null } : null,
    actors: actors.map((a, k) => ({ id: a.id, label: a.label ?? null, color: a.color ?? null, size: a.size ?? 1, rot: a.rot ?? [0, 0, 0], at: a.at ?? 0, buoyant: a.buoyant ?? null, highlight: Boolean(a.highlight), parts: a.parts, motion: a.motion ?? [], keys: a.keys ?? [], placed: placed[k] })),
    terrain: terrain ? { ...terrain, carves: carves.sort((a, b) => a.t - b.t), strata: strataOf(terrain) } : null,
    liquids,
    tracks,
    totalSec,
    safe: STAGE_SAFE,
    title: titleBacking(palette),
  };
  return scenes.map((sc, i) => {
    const overlay = planOverlay(sc.v.overlay, sc.moments);
    return {
      kind: "scene3d",
      stage: shared,
      t0: sc.t0,
      set: "none",
      layout: "stack",
      move: "static",
      frame,
      focus: null,
      explode: false,
      objects: placed,
      connections: [],
      elements: overlay.map((o) => ({ el: { type: "icon", kind: `overlay-${o.type}` }, box: null, enter: o.at, items: [] })),
      moments: sc.moments,
      cameraKeys,
      ...(overlay.length ? { overlay } : {}),
      warnings: i === 0 ? ["stage: terrain, liquids and beats are rendered by the Remotion renderer only (the Blender renderer ignores them)", ...sc.warnings] : sc.warnings,
    };
  });
}

/**
 * Plan every scene of a 3D-template spec. Scenes without a scene3d visual get an empty stage plan. `captions` (the
 * build's word captions) time the word moments; without them the narration is text-timed.
 */
export function planThree(spec, timeline, captions = null) {
  if (spec.stage) return planStageScenes(spec, timeline, captions);
  const fps = spec.format.fps;
  const look = look3dOf(spec);
  const words = sceneWords(spec, timeline, captions);
  return spec.scenes.map((s, i) => {
    const sc = timeline.scenes[i];
    const last = i === timeline.scenes.length - 1;
    const sec = (sc.durationInFrames - (last ? 0 : timeline.transitionFrames)) / fps;
    const v = s.visual?.type === "scene3d" ? s.visual : { type: "scene3d", objects: [] };
    const { moments, warnings } = resolveMoments(v, words[i], sc.durationInFrames, fps);
    return planScene3d(v, sec, { look, index: i, moments, warnings });
  });
}

/** The model an object renders: explicit `model`, else the default car / character for its index (null otherwise). */
export const modelOf = (o, i) => {
  if (o.kind === "car") return o.model ?? CAR_MODELS[i % CAR_MODELS.length];
  if (o.kind === "character") return o.model ?? CHARACTER_MODELS[i % CHARACTER_MODELS.length];
  return o.kind === "model" ? (o.model ?? null) : null;
};

/**
 * Novelty guard across the scenes of one spec: three or more built-from-scratch scenes must not all show the identical
 * subject and world (same parts, same backdrop). Scenes that opt into `stock` are skipped.
 */
export function refineThreeNovelty(scenes, ctx, basePath = ["scenes"]) {
  const sigs = [];
  scenes.forEach((s, i) => {
    const v = s.visual;
    if (v?.type !== "scene3d" || v.stock) return;
    const subject = (v.objects ?? []).filter((o) => o.kind === "custom").map((o) => partsSignature(o.parts));
    sigs.push({ i, sig: JSON.stringify([subject, partsSignature(v.world?.parts), v.world?.backdrop ?? null, (v.objects ?? []).map((o) => o.kind)]) });
  });
  if (sigs.length >= 3 && sigs.every((x) => x.sig === sigs[0].sig)) {
    ctx.addIssue({ code: "custom", path: [...basePath, sigs[sigs.length - 1].i, "visual"], message: "every 3D scene shows the same subject and world: vary the models, the world or the backdrop from scene to scene (a recurring mascot or monolith may persist, but its surroundings change)" });
  }
}

/** Model ids referenced by a spec (objects, default cars and characters, set props) to stage their GLB files. */
export const collectModelIds = (spec) => {
  const look = look3dOf(spec);
  const ids = spec.scenes.flatMap((s) => {
    const v = s.visual?.type === "scene3d" ? s.visual : null;
    return [...(v?.objects ?? []).map(modelOf), ...(SET_MODELS[setOf(v ?? {}, look)] ?? [])];
  });
  return [...new Set(ids.filter(Boolean))];
};

/** Icon names referenced by a spec's 3D objects (for lib/icons.mjs). */
export const collectIconNames3d = (spec) =>
  [...new Set(spec.scenes.flatMap((s) => [...(s.visual?.objects ?? []).map((o) => o.icon), ...overlayIcons(s.visual?.overlay)].filter(Boolean)))].map((n) => String(n).trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-duotone$/, ""));

/** Icon names an overlay uses: flow chips, limit loads and versus halves. */
export const overlayIcons = (overlay) =>
  (overlay ?? []).flatMap((o) => (o.type === "flow" ? o.chips.map((c) => c.icon) : o.type === "limit" ? (o.icons ?? []) : o.type === "versus" ? [o.left.icon, o.right.icon] : []));

// ---------------- overlay colors ----------------

const OVERLAY_RED = "#E5484D";
/**
 * Colors of the overlay kit (flow chips, concept pill, limit bar, versus card), computed from the palette roles plus
 * neutrals so every label reads (>= 4.5:1) and every fill stays distinct from its surface (>= 3:1) on any palette.
 * Pure: the renderer and the tests share it.
 * @param {{bg: string[], text: string, accent: string, accent2?: string, accent3?: string}} p
 */
export function overlayColors(p) {
  const white = "#FFFFFF";
  const panel = mixColor(p.bg[p.bg.length - 1] ?? p.bg[0], "#000000", 0.82);
  const track = mixColor(panel, white, 0.2);
  const surfaces = [panel, track];
  const chip = mixColor(white, p.accent3 ?? p.accent, 0.1);
  const active = readableWord(p.accent2 ?? p.accent, [panel], 3);
  const concept = p.accent2 ?? p.accent;
  const over = readableWord(OVERLAY_RED, surfaces, 3);
  return {
    panel,
    panelText: white,
    muted: readableWord(mixColor(white, panel, 0.3), [panel], 4.5),
    accentText: readableWord(p.accent, [panel], 4.5),
    chip,
    chipInk: readableOn(chip),
    active,
    activeInk: readableOn(active),
    concept,
    conceptInk: readableOn(concept),
    track,
    fill: readableWord(p.accent3 ?? p.accent, surfaces, 3),
    over,
    overText: readableWord(over, [panel], 4.5),
    signal: readableWord(p.accent2 ?? p.accent, [panel], 3),
  };
}

/** The label / fill pairs of the overlay kit with their measured contrast and the minimum each needs: [name, ratio, min]. */
export function overlayContrast(c) {
  const cr = contrastRatio;
  return [
    ["panel text", cr(c.panelText, c.panel), 4.5],
    ["muted label", cr(c.muted, c.panel), 4.5],
    ["accent text", cr(c.accentText, c.panel), 4.5],
    ["chip ink on chip", cr(c.chipInk, c.chip), 4.5],
    ["chip fill on panel", cr(c.chip, c.panel), 3],
    ["active chip on panel", cr(c.active, c.panel), 3],
    ["active ink on active chip", cr(c.activeInk, c.active), 4.5],
    ["concept ink on concept pill", cr(c.conceptInk, c.concept), 4.5],
    ["bar fill on track", cr(c.fill, c.track), 3],
    ["bar fill on panel", cr(c.fill, c.panel), 3],
    ["over-limit fill on track", cr(c.over, c.track), 3],
    ["over-limit note on panel", cr(c.overText, c.panel), 4.5],
    ["signal dot on panel", cr(c.signal, c.panel), 3],
  ];
}
