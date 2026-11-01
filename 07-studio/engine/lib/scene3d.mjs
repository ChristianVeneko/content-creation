// 3D templates (three.js via @remotion/three): the `scene3d` visual vocabulary, its zod schema, and the pure
// planning shared by the Node build and the Remotion bundle:
//   1. layout: place each scene's objects on the ground plane (world units, y up) without overlaps,
//   2. camera: a pure function of time (position, target, lens) per look and camera move,
//   3. projection: 3D point -> 1080x1920 pixel, so 2D labels can track 3D objects,
//   4. timing: staggered entrances and the beat list that drives the SFX (same shape as the illustrated plan).
// Nothing here may import Node built-ins: it is bundled by Remotion through lib/spec.mjs.
import { z } from "zod";
import { COLOR_TOKENS } from "./illustration-schema.mjs";
import { customExtent, customHeight, sampleTrack, customObjectFields, generativeSceneFields, momentSchema, momentSec, refineGenerative, resolveMoments, sceneWords } from "./scene3d-motion.mjs";

/** Templates rendered with the 3D kit. Their look id equals the template id. */
export const THREE_D_TEMPLATE_IDS = ["clay-diorama", "iso-toon", "neon-glass", "pedestal", "paper-world", "toy-blocks", "holo-studio", "neon-grid", "soft-studio", "moody-night", "voxel-world"];
export const usesThreeKit = (templateId) => THREE_D_TEMPLATE_IDS.includes(templateId);
/** The 3D look of a resolved spec: theme.look3d when valid, else the template id, else clay-diorama. */
export const look3dOf = (spec) => {
  const l = spec?.theme?.look3d;
  if (THREE_D_TEMPLATE_IDS.includes(l)) return l;
  return THREE_D_TEMPLATE_IDS.includes(spec?.template) ? spec.template : "clay-diorama";
};

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
 * Environment sets: the world the camera is inside (the objects stand in its clear middle).
 * none = the look's own floor (plinth, baseplate, pad...); auto = the look's default set (RENDER3D).
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
export const CAMERA_MOVES = ["auto", "orbit", "dolly", "push", "crane", "pan", "turntable", "topdown", "static", "glide", "rise"];
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
  set: z.enum(SETS_3D, { error: (iss) => `unknown set${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${SETS_3D.join(", ")}` }).optional().describe("Environment set the camera is inside; auto = the look's default"),
  ...generativeSceneFields,
};

/** Kind-specific checks for a `scene3d` visual (paths relative to the visual). */
export function refineScene3d(v, ctx) {
  if (v.type !== "scene3d") return;
  const objs = v.objects ?? [];
  if (!objs.length) ctx.addIssue({ code: "custom", path: ["objects"], message: 'visual.type "scene3d" requires at least one object in visual.objects' });
  const ids = new Set(objs.map((o) => o.id).filter(Boolean));
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
  (v.connect ?? []).forEach((c, k) => {
    for (const end of ["from", "to"]) if (!ids.has(c[end])) ctx.addIssue({ code: "custom", path: ["connect", k, end], message: `no object with id "${c[end]}" in this scene` });
  });
  if (v.focus && !ids.has(v.focus)) ctx.addIssue({ code: "custom", path: ["focus"], message: `no object with id "${v.focus}" in this scene` });
  refineGenerative(v, ctx);
}

// ---------------- looks: camera language (materials and lights live in src/three/looks.ts) ----------------

/**
 * Camera defaults per look. Angles in degrees. `moves` is the rotation of auto camera moves (scene index modulo).
 * iso-toon uses an orthographic camera at the true isometric angle.
 */
export const LOOK3D = {
  "clay-diorama": { ortho: false, fov: 30, yaw: -24, pitch: 30, moves: ["orbit", "dolly", "crane", "orbit", "push"], float: 0.06, spin: 0 },
  "iso-toon": { ortho: true, fov: 30, yaw: 45, pitch: 35.264, moves: ["pan", "dolly", "orbit", "static"], float: 0, spin: 0 },
  "neon-glass": { ortho: false, fov: 34, yaw: 18, pitch: 16, moves: ["push", "orbit", "dolly", "crane"], float: 0.08, spin: 0 },
  "pedestal": { ortho: false, fov: 26, yaw: -10, pitch: 10, moves: ["turntable", "push", "orbit", "dolly"], float: 0.04, spin: 0.35 },
  // pop-up book seen from above: high pitch, cranes down as the pages open
  "paper-world": { ortho: false, fov: 28, yaw: 28, pitch: 40, moves: ["crane", "orbit", "dolly", "push"], float: 0, spin: 0 },
  // macro toy photography: a long lens (narrow fov) from a tabletop angle; the tilt-shift blur is a 2D overlay
  "toy-blocks": { ortho: false, fov: 17, yaw: -34, pitch: 32, moves: ["orbit", "topdown", "dolly", "pan"], float: 0, spin: 0 },
  // hologram on a projector pad: low eye-level camera, objects hover and slowly rotate on the pad
  "holo-studio": { ortho: false, fov: 32, yaw: 0, pitch: 11, moves: ["turntable", "orbit", "push", "crane"], float: 0.1, spin: 0.45 },
  // rendered formats: slow moves through a set (glide = lateral truck, rise = pedestal up), never a punch-in by default;
  // `wide` pulls the framing back so the set around the subject reads
  // a low camera over a glowing grid floor that recedes into fog
  "neon-grid": { ortho: false, fov: 36, yaw: -22, pitch: 13, moves: ["glide", "orbit", "dolly", "rise"], float: 0, spin: 0, wide: 1.3 },
  // product-photo lens over a wooden desk: long-ish focal length, three-quarter angle
  "soft-studio": { ortho: false, fov: 27, yaw: -30, pitch: 24, moves: ["dolly", "glide", "orbit", "rise"], float: 0, spin: 0, wide: 1.25 },
  // low chase-camera angle on a night road: the lamps and the fogged horizon stay in frame
  "moody-night": { ortho: false, fov: 30, yaw: 14, pitch: 12, moves: ["rise", "glide", "dolly", "orbit"], float: 0, spin: 0, wide: 1.2 },
  // a high three-quarter view of a voxel island
  "voxel-world": { ortho: false, fov: 31, yaw: -38, pitch: 34, moves: ["orbit", "rise", "glide", "dolly"], float: 0, spin: 0, wide: 1.3 },
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
  "neon-grid": { tone: "aces", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 4, bloom: null, fog: { near: 1.1, far: 3.4, add: 0 }, set: "grid" },
  "soft-studio": { tone: "neutral", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 6, bloom: null, fog: { near: 1.6, far: 5.0, add: 0 }, set: "desk" },
  "moody-night": { tone: "aces", exposure: 1.05, hdri: null, envIntensity: 0, shadowRadius: 4, bloom: null, fog: { near: 1.2, far: 4.5, add: 0 }, set: "road" },
  "voxel-world": { tone: "neutral", exposure: 1.0, hdri: null, envIntensity: 0, shadowRadius: 3, bloom: null, fog: { near: 1.4, far: 4.2, add: 0 }, set: "voxel" },
};

/** The environment set of a scene3d visual: explicit set, else the look's default. */
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
  const n = v.objects?.length ?? 0;
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
  const objs = v.objects ?? [];
  const n = objs.length;
  const layout = layoutOf(v);
  const out = [];
  const put = (i, x, y, z, scale = 1) => {
    const s = scale * (objs[i].size ?? 1);
    out[i] = { pos: objs[i].pos ? objs[i].pos.map(r3) : [r3(x), r3(y), r3(z)], scale: r3(s), h: r3(heightOf(objs[i]) * s) };
    // custom models carry their real half-width, so wide or tilted models are framed whole
    if (objs[i].kind === "custom") out[i].half = r3(Math.max(0.75, customExtent(objs[i].parts).half) * s);
  };
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
export function boundsOf(placed) {
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
export function frameContent(placed, look) {
  const L = LOOK3D[look];
  const { min, max } = boundsOf(placed);
  const w = max[0] - min[0];
  const d = max[2] - min[2];
  const h = max[1] - min[1];
  const target = [(min[0] + max[0]) / 2, min[1] + h * 0.42, (min[2] + max[2]) / 2];
  const pitch = L.pitch * DEG;
  // projected extents: width across the frame, and height (object height + depth foreshortened by the pitch)
  // a minimum size keeps single objects from filling the frame (stat numbers and labels need room)
  const W = Math.max(Math.max(w, d * 0.7) + 0.6, 3.4);
  const H = h * Math.cos(pitch) + d * Math.sin(pitch) + 0.6;
  const aspect = 1080 / 1920;
  const wide = L.wide ?? 1;
  if (L.ortho) {
    // visible height so the content spans ~80% of the width and ~40% of the height
    const viewH = Math.max(W / (0.8 * aspect), H / 0.4, 6) * wide;
    return { target, dist: 30, viewH };
  }
  const t = Math.tan((L.fov / 2) * DEG);
  const dist = Math.max(W / (0.8 * 2 * t * aspect), H / (0.42 * 2 * t), 6) * wide;
  return { target, dist, viewH: 0 };
}

/**
 * Camera state at `t` seconds into a scene of `sceneSec` seconds. Pure: the R3F camera and the 2D label anchors
 * both call it, so labels stay locked to objects.
 * @param {{t: number, sceneSec: number, look: string, move: string, frame: {target: number[], dist: number, viewH: number}, focusPos?: number[] | null, keys?: {t: number, yaw?: number, pitch?: number, zoom?: number, shift?: number[], ease?: string}[] | null}} args
 *   keys: resolved camera keyframes (plan.cameraKeys) layered on top of the move
 * @returns {{ortho: boolean, fov: number, viewH: number, position: number[], target: number[]}}
 */
export function cameraAt({ t, sceneSec, look, move, frame: fr, focusPos = null, keys = null }) {
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
  ];
  const focus = v.focus !== undefined ? byId[v.focus] : undefined;
  const frame = frameContent(placed, look);
  // camera keys: moments -> seconds, focus -> a shift of the look-at point onto that object
  const cameraKeys = (v.cameraKeys ?? []).map((k) => {
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
  });
  return {
    kind: "scene3d",
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
    warnings,
  };
}

/**
 * Plan every scene of a 3D-template spec. Scenes without a scene3d visual get an empty stage plan. `captions` (the
 * build's word captions) time the word moments; without them the narration is text-timed.
 */
export function planThree(spec, timeline, captions = null) {
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
  [...new Set(spec.scenes.flatMap((s) => (s.visual?.objects ?? []).map((o) => o.icon).filter(Boolean)))].map((n) => String(n).trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-duotone$/, ""));
