// Pixel-art templates (src/pixel): the `pixel` visual vocabulary, its zod schema, the four looks (palette + light +
// mood) and the pure helpers shared by the Node build and the Remotion bundle:
//   1. schema + refine rules for visual.type "pixel",
//   2. looks: a limited palette per look, expressed as named color roles the sets and props draw with,
//   3. pixel math: integer snapping, 4x4 Bayer ordered dithering, nearest-palette quantization,
//   4. timing: prop entrances, counter / checklist / popup times and the beat list that drives the SFX.
// Nothing here may import Node built-ins: it is bundled by Remotion through lib/spec.mjs.
import { z } from "zod";
import { syntheticCaptions } from "./timeline.mjs";
import {
  ROLES,
  customSetSchema,
  FX_TYPES,
  fxSchema,
  LAYER_VARIANTS,
  momentAt,
  momentIssue,
  motionSchema,
  resolveSceneMoments,
  sceneMomentStrings,
  spriteIssues,
  spriteSchema,
  unionError,
  DEPTHS,
} from "./pixel-gen.mjs";
export { ROLES };

/** Templates rendered with the pixel kit. Each one is a look of the same family. */
export const PIXEL_TEMPLATE_IDS = ["pixel-dusk", "pixel-night", "pixel-arcade", "pixel-mono", "pixel-versus"];
export const usesPixelKit = (templateId) => PIXEL_TEMPLATE_IDS.includes(templateId);
/** The pixel look of a resolved spec: its template id when it is a pixel template, else pixel-dusk. */
export const pixelLookOf = (spec) => (usesPixelKit(spec?.template) ? spec.template : "pixel-dusk");

/** Low-res canvas: 270x480 drawn pixels, upscaled x4 to 1080x1920. */
export const PX = { w: 270, h: 480, scale: 4, margin: 24 };

/** Scene sets: generic places built from far / mid / subject / near layers (src/pixel/sets.ts). */
export const PIXEL_SETS = {
  room: "interior room: window with city lights, desk with monitor, shelves, rug, lamp",
  street: "town street at ground level: shop fronts, lamp posts, signboards, distant roofs",
  desert: "desert: sun, mesas, adobe buildings, cacti, wooden fence",
  factory: "factory floor: conveyor belt, pipes, hazard stripes, hanging lamps",
  gallery: "hall / gallery: framed pictures on the walls, checkered floor, velvet ropes, columns",
  temple: "temple courtyard: paper lanterns, torii-like gate, stone path, moon",
  forest: "forest clearing: layered trees, fireflies, grass, a trail",
  lab: "lab: glass tubes, screens, cables, bench with flasks",
  space: "space: starfield, planet, station window frame, floating debris",
  arena: "versus arena: crowd silhouettes with glow sticks, truss lights, a lit fighting floor with a neon ring (the fixed stage of pixel-versus)",
};
export const SET_IDS = Object.keys(PIXEL_SETS);

/** Props drawn in code (src/pixel/props.ts). `label` shows a small pixel tag above the prop. */
export const PIXEL_PROPS = {
  monitor: "desktop monitor with UI lines (glows)",
  laptop: "open laptop with a lit screen",
  phone: "smartphone with a lit screen",
  door: "wooden door",
  window: "window with night or day sky",
  lamp: "floor lamp (glows)",
  lantern: "paper lantern (glows)",
  crate: "wooden crate",
  plant: "potted plant",
  coin: "spinning gold coin",
  block: "mystery block with a question mark (bobs)",
  trophy: "gold trophy",
  hourglass: "hourglass with falling sand",
  sign: "signboard; `label` is written on it",
  chest: "treasure chest; opens with a burst when `open` is true",
  item: "glowing item pickup that pops with a burst",
  heart: "pixel heart (life)",
  key: "golden key",
  scroll: "parchment scroll",
  robot: "small generic box robot (not a mascot)",
};
export const PROP_KINDS = Object.keys(PIXEL_PROPS);
export const POSES = ["idle", "walk", "point", "hold"];
export const PIXEL_CAMERAS = ["auto", "pan-left", "pan-right", "rise", "tilt-down", "push-in", "static"];
export const PIXEL_TRANSITIONS = ["auto", "iris", "dissolve", "cut", "diamond", "wipe", "glitch"];
export const PANEL_TYPES = ["popup", "counter", "checklist", "ranking", "verdict"];

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color like #1A2B3C");
const noEmojiText = (max) => z.string().min(1).max(max);

export const pixelPropSchema = z.object({
  kind: z.enum(PROP_KINDS, { error: (iss) => `unknown pixel prop${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${PROP_KINDS.join(", ")}` }),
  x: z.number().min(0).max(1).optional().describe("Horizontal position 0..1 across the view (default: spread evenly)"),
  label: noEmojiText(16).optional().describe("Small pixel tag above the prop (sign: the text on the board)"),
  color: hex.optional().describe("Main color override (block, item, robot, chest)"),
  at: z.number().min(0).max(30).optional().describe("Entrance time in seconds into the scene"),
  glow: z.boolean().optional().describe("Force a glow halo"),
  open: z.boolean().optional().describe("chest: opens with a burst after entering"),
  big: z.boolean().optional().describe("Draw at double size (hero prop)"),
  motion: motionSchema.optional(),
});

export const characterSchema = z.object({
  pose: z.enum(POSES).default("idle"),
  x: z.number().min(0).max(1).optional().describe("Horizontal position 0..1 (default 0.3)"),
  hair: hex.optional(),
  skin: hex.optional(),
  shirt: hex.optional(),
  pants: hex.optional(),
  item: z.enum(PROP_KINDS).optional().describe('Prop held over the head (pose "hold")'),
  facing: z.enum(["left", "right"]).optional(),
  motion: motionSchema.optional(),
});

/** An agent-drawn sprite placed in the scene. */
export const actorSchema = z.object({
  sprite: z.string().min(1).describe("Id of a sprite defined in any scene's `sprites`"),
  x: z.number().min(-0.5).max(1.5).optional().describe("Horizontal center, 0..1 of the view (default: spread)"),
  y: z.number().min(-0.5).max(1.5).optional().describe("Anchor height, 0..1 of the view (default: the floor)"),
  scale: z.number().min(1).max(8).optional().describe("Pixel size of one sprite pixel (default 2)"),
  flip: z.boolean().optional(),
  depth: z.enum(DEPTHS).optional().describe("Parallax plane (default subject)"),
  at: momentAt.optional().describe("Appears at (seconds or a word moment); default: from the start"),
  until: momentAt.optional().describe("Disappears at"),
  glow: z.boolean().optional().describe("Whole sprite glows (otherwise only the sprite's `glow` chars)"),
  shadow: z.boolean().optional().describe("Contact shadow under it (default: on when standing on the floor)"),
  label: noEmojiText(16).optional().describe("Small pixel tag above it"),
  motion: motionSchema.optional(),
});


// ---------------- versus format (pixel-versus): rounds, fighters, ranking / verdict panels, fight fx ----------------

/** Fight effects added by the versus format (rendered by src/pixel/fx.ts); the generic ones live in lib/pixel-gen.mjs. */
export const VERSUS_FX = ["energy-beam", "power-up", "hit-flash"];
/** Default length in seconds of the versus fx (pixel-gen only knows its own FX_DURATION table). */
export const VERSUS_FX_DURATION = { "energy-beam": 1.4, "power-up": 1.6, "hit-flash": 0.4 };
const ALL_FX = [...FX_TYPES, ...VERSUS_FX];
const near = (min = -0.2, max = 1.2) => z.number().min(min).max(max);

/** The pixel fx schema: every generic fx of pixel-gen plus the versus ones; `to` is the target of an energy beam. */
export const pixelFxSchema = z.object({
  ...fxSchema.shape,
  type: z.enum(ALL_FX, { error: (iss) => `unknown pixel fx${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${ALL_FX.join(", ")}` }),
  to: z.object({ x: near(), y: near() }).optional().describe("energy-beam: the target point, 0..1 of the view (default: across the stage)"),
});

/** A versus fx with its own defaults filled in: the default duration, and the 0.4 s start of one-shots. */
export const versusFxOf = (f) => (VERSUS_FX.includes(f?.type) ? { ...f, duration: f.duration ?? VERSUS_FX_DURATION[f.type], at: f.at ?? 0.4 } : f);

export const FIGHTER_ANIMS = ["bob", "jump", "shake", "pulse", "sway"];
/** A contestant: an agent-drawn sprite on the stage plus its cell (name, stars) in the header strip. */
export const fighterSchema = z.object({
  sprite: z.string().min(1).describe("Id of a sprite defined in any scene's `sprites` (draw it facing right; the right-hand fighter is mirrored)"),
  name: noEmojiText(12).describe("Name in the header strip"),
  stars: z.number().min(0).max(5).multipleOf(0.5).describe("Rating 0-5 in half-star steps, drawn under the name"),
  side: z.enum(["left", "center", "right"]).optional().describe("Stage position (default: spread by count)"),
  scale: z.number().int().min(1).max(8).optional().describe("Pixel size of one sprite pixel (default 5)"),
  crown: z.boolean().optional().describe("A crown over the header cell and over the sprite"),
  anim: z.enum(FIGHTER_ANIMS).optional().describe("In-place animation"),
});

export const roundSchema = z
  .object({ n: z.number().int().min(1).max(99), of: z.number().int().min(1).max(99), title: noEmojiText(24).optional().describe("Under the ROUND n/N card") })
  .refine((r) => r.n <= r.of, { message: "round.n cannot be greater than round.of", path: ["n"] });

const rankingRow = z.object({ name: noEmojiText(14), score: z.number().min(0), crown: z.boolean().optional() });
export const rankingSchema = z.object({
  title: noEmojiText(20).optional(),
  unit: z.string().max(4).optional().describe("Suffix of every score (e.g. pts)"),
  max: z.number().positive().optional().describe("Score that fills a bar (default: the best score)"),
  rows: z.array(rankingRow).min(2).max(5),
});
const verdictRow = z.object({ name: noEmojiText(14), score: z.union([z.number(), noEmojiText(8)]), note: noEmojiText(10).optional() });
export const verdictSchema = z.object({
  title: noEmojiText(18).optional(),
  rows: z.array(verdictRow).min(2).max(5),
  winner: z.number().int().min(0).max(4).optional().describe("0-based row that wins and gets the crown (default: the highest score)"),
});

/** Stage x (0..1) of each fighter: spread by count, a `side` overrides. */
export function fighterXs(fighters) {
  const base = { 1: [0.5], 2: [0.27, 0.73], 3: [0.2, 0.5, 0.8] }[Math.min(3, Math.max(1, fighters.length))];
  const side = { left: 0.27, center: 0.5, right: 0.73 };
  return fighters.map((f, i) => (f.side ? side[f.side] : base[i] ?? 0.5));
}
/** The five stars of a rating: "full" | "half" | "empty". */
export const starsOf = (rating) => Array.from({ length: 5 }, (_, i) => (rating >= i + 1 ? "full" : rating >= i + 0.5 ? "half" : "empty"));
/** Ranking rows with their rank (by score, ties share) and bar ratio (score / max, default the best score). */
export function rankRows(rows, max) {
  const top = max ?? Math.max(0, ...rows.map((r) => r.score));
  return rows.map((r) => ({ ...r, rank: 1 + rows.filter((o) => o.score > r.score).length, ratio: top > 0 ? r.score / top : 0 }));
}
/** Pixel art of the crown (9x6) and the star (7x7) of the versus UI; `x` cells are drawn. */
export const CROWN_ROWS = ["x...x...x", "xx..x..xx", "xxx.x.xxx", "xxxxxxxxx", "xxxxxxxxx", ".xxxxxxx."];
export const STAR_ROWS = ["...x...", "...x...", "xxxxxxx", ".xxxxx.", "..xxx..", ".xx.xx.", ".x...x."];

const presetSet = z.enum(SET_IDS, { error: (iss) => `unknown pixel set${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${SET_IDS.join(", ")} or a custom set object {sky, layers}` });
export const pixelSceneSchema = z.object({
  set: z.union([presetSet, customSetSchema], { error: unionError }).describe("A custom set {sky, floor, layers} drawn from seeds (preferred) or a preset set id"),
  sprites: z.array(spriteSchema).max(8).optional().describe("Sprites drawn by the agent; ids are shared by the whole video"),
  actors: z.array(actorSchema).max(8).optional().describe("Sprites placed and animated in this scene"),
  fx: z.array(pixelFxSchema).max(10).optional().describe("Visual effects: particles, bursts, lightning, glitch, CRT, energy beams, power-ups, hit flashes..."),
  props: z.array(pixelPropSchema).max(6).optional(),
  character: characterSchema.optional().describe("Optional generic chibi character (off unless set)"),
  banner: z
    .object({
      text: noEmojiText(36),
      accent: z.string().min(1).max(24).optional().describe("One word of `text` drawn in the accent color"),
      kicker: noEmojiText(24).optional().describe("Small tag above the banner"),
      big: z.boolean().optional().describe("Big hero title (hook scene) instead of the boxed banner"),
      motion: motionSchema.optional(),
    })
    .optional(),
  popup: z
    .object({ title: noEmojiText(20), text: noEmojiText(80), accent: z.string().min(1).max(24).optional(), at: z.number().min(0).max(30).optional(), motion: motionSchema.optional() })
    .optional()
    .describe('"Chat"-style popup window with a title bar and a close x'),
  counter: z
    .object({
      value: z.number(),
      from: z.number().optional(),
      label: noEmojiText(24),
      prefix: z.string().max(3).optional(),
      suffix: z.string().max(4).optional(),
      motion: motionSchema.optional(),
    })
    .optional()
    .describe("Big counting number HUD"),
  checklist: z
    .object({ title: noEmojiText(20).optional(), items: z.array(noEmojiText(26)).min(1).max(5), motion: motionSchema.optional() })
    .optional()
    .describe("Checklist panel; items tick in order"),
  round: roundSchema.optional().describe('"ROUND n/N" title card shown at the start of the scene (pixel-versus)'),
  fighters: z.array(fighterSchema).min(1).max(3).optional().describe("Contestants on the stage with a header strip of names and star ratings (pixel-versus)"),
  ranking: rankingSchema.optional().describe("Ranking panel: rows with rank, name, score and a bar (pixel-versus)"),
  verdict: verdictSchema.optional().describe("Verdict panel that fills in row by row, the winner gets a crown (pixel-versus)"),
  speaker: z.string().min(1).max(14).optional().describe("Dialog box speaker name for this scene"),
  camera: z.enum(PIXEL_CAMERAS).optional(),
  transition: z.enum(PIXEL_TRANSITIONS).optional().describe("Transition into the next scene"),
  rays: z.boolean().optional().describe("Light rays (default on for sets with a light source)"),
  dust: z.boolean().optional().describe("Floating dust motes (default on)"),
});

/** Checks for a `pixel` visual (paths relative to the visual). */
export function refinePixel(v, ctx) {
  if (v.type !== "pixel") return;
  const p = v.pixel;
  if (!p) {
    ctx.addIssue({ code: "custom", path: ["pixel"], message: 'visual.type "pixel" requires visual.pixel: {set, props?, character?, banner?, ...}' });
    return;
  }
  const panels = PANEL_TYPES.filter((k) => p[k]);
  if (panels.length > 1) ctx.addIssue({ code: "custom", path: ["pixel", panels[1]], message: `one UI panel per scene: ${panels.join(" and ")} would overlap; keep one` });
  if (p.banner?.accent && !p.banner.text.toLowerCase().includes(p.banner.accent.toLowerCase())) {
    ctx.addIssue({ code: "custom", path: ["pixel", "banner", "accent"], message: `accent "${p.banner.accent}" must be a word of banner.text` });
  }
  if (p.popup?.accent && !p.popup.text.toLowerCase().includes(p.popup.accent.toLowerCase())) {
    ctx.addIssue({ code: "custom", path: ["pixel", "popup", "accent"], message: `accent "${p.popup.accent}" must be a word of popup.text` });
  }
  if (p.character?.pose === "hold" && !p.character.item) ctx.addIssue({ code: "custom", path: ["pixel", "character", "item"], message: 'pose "hold" needs character.item (the prop held up)' });
  if (p.character?.item && p.character.pose !== "hold") ctx.addIssue({ code: "custom", path: ["pixel", "character", "pose"], message: 'character.item is only drawn with pose "hold"' });
  if (p.verdict?.winner !== undefined && p.verdict.winner >= p.verdict.rows.length) ctx.addIssue({ code: "custom", path: ["pixel", "verdict", "winner"], message: `winner must be one of the ${p.verdict.rows.length} rows (0-based)` });
  (p.fx ?? []).forEach((f, i) => {
    if (f.to && f.type !== "energy-beam") ctx.addIssue({ code: "custom", path: ["pixel", "fx", i, "to"], message: "`to` is only used by energy-beam" });
  });
  if ((p.props ?? []).filter((q) => q.big).length > 1) ctx.addIssue({ code: "custom", path: ["pixel", "props"], message: "at most one big prop per scene" });
  (p.sprites ?? []).forEach((sp, i) => {
    for (const iss of spriteIssues(sp)) ctx.addIssue({ code: "custom", path: ["pixel", "sprites", i, ...iss.path], message: `sprite "${sp.id}": ${iss.message}` });
  });
  if (p.set && typeof p.set === "object") {
    (p.set.layers ?? []).forEach((l, i) => {
      const at = ["pixel", "set", "layers", i];
      if (l.type === "sprite" && !l.sprite) ctx.addIssue({ code: "custom", path: [...at, "sprite"], message: "a sprite layer needs `sprite` (the id of a sprite defined in `sprites`)" });
      if (l.variant && !(LAYER_VARIANTS[l.type] ?? []).includes(l.variant)) {
        const list = LAYER_VARIANTS[l.type];
        ctx.addIssue({ code: "custom", path: [...at, "variant"], message: list ? `${l.type} variants: ${list.join(", ")}` : `a ${l.type} layer has no variants` });
      }
    });
  }
}

/**
 * Whole-spec checks of pixel visuals (lib/spec.mjs calls this for pixel templates): sprite ids are shared by the
 * video, so actors and sprite layers may use a sprite from any scene; ids must be unique; word moments must be words
 * of the scene's narration.
 */
export function refinePixelSpec(spec, ctx) {
  const ids = new Map();
  spec.scenes.forEach((s, i) =>
    (s.visual?.pixel?.sprites ?? []).forEach((sp, k) => {
      if (ids.has(sp.id)) ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "pixel", "sprites", k, "id"], message: `sprite "${sp.id}" is defined twice; ids are shared by the whole video, define it once and reuse it` });
      else ids.set(sp.id, i);
    }),
  );
  const known = [...ids.keys()];
  const unknown = (id) => `unknown sprite "${id}"; ${known.length ? `defined sprites: ${known.join(", ")}` : "define it first in `sprites` (any scene)"}`;
  spec.scenes.forEach((s, i) => {
    const p = s.visual?.type === "pixel" ? s.visual.pixel : null;
    if (!p) return;
    const base = ["scenes", i, "visual", "pixel"];
    (p.actors ?? []).forEach((a, k) => {
      if (!ids.has(a.sprite)) ctx.addIssue({ code: "custom", path: [...base, "actors", k, "sprite"], message: unknown(a.sprite) });
    });
    (p.fighters ?? []).forEach((f, k) => {
      if (!ids.has(f.sprite)) ctx.addIssue({ code: "custom", path: [...base, "fighters", k, "sprite"], message: unknown(f.sprite) });
    });
    if (p.set && typeof p.set === "object")
      (p.set.layers ?? []).forEach((l, k) => {
        if (l.type === "sprite" && l.sprite && !ids.has(l.sprite)) ctx.addIssue({ code: "custom", path: [...base, "set", "layers", k, "sprite"], message: unknown(l.sprite) });
      });
    // word moments: report each at the first place it is used
    const check = (m, path) => {
      const msg = momentIssue(m, s.narration);
      if (msg) ctx.addIssue({ code: "custom", path: [...base, ...path], message: msg });
    };
    (p.fx ?? []).forEach((f, k) => check(f.at, ["fx", k, "at"]));
    (p.actors ?? []).forEach((a, k) => {
      check(a.at, ["actors", k, "at"]);
      check(a.until, ["actors", k, "until"]);
    });
    const seen = new Set((p.fx ?? []).map((f) => f.at).concat((p.actors ?? []).flatMap((a) => [a.at, a.until])));
    for (const m of sceneMomentStrings(p)) if (!seen.has(m)) check(m, ["motion"]);
  });
}

// ---------------- looks ----------------


export const PIXEL_LOOKS = {
  // warm sunset: orange sky, purple shadows, long amber light
  "pixel-dusk": {
    roles: {
      sky0: "#3B2A5C", sky1: "#7A3E6C", sky2: "#D9685A", sky3: "#F4A65B",
      far0: "#5A3360", far1: "#8A4A62",
      wall0: "#2E2140", wall1: "#4A3060", wall2: "#6C4A7E",
      wood0: "#4A2A2A", wood1: "#7A4632", wood2: "#B0703F",
      floor0: "#3A2638", floor1: "#5A3A48",
      metal0: "#3E3A58", metal1: "#7C7AA0",
      leaf0: "#2F4A3A", leaf1: "#55784A",
      glow: "#FFD27A", glow2: "#7FE3FF", accent: "#FF7A59", accent2: "#FFD166", ink: "#1A1226", paper: "#FFF1D6",
    },
    light: { rayColor: "#FFC07A", rayOpacity: 0.32, glowOpacity: 0.7, vignette: 0.55, haze: "#F4A65B" },
    sky: "dusk",
    scanlines: false,
    strict: false,
    ui: { box: "#1A1226", border: "#FFF1D6", text: "#FFF1D6", accent: "#FF7A59", name: "#FFD166" },
  },
  // navy and violet night: moonlight, neon signs, lit windows
  "pixel-night": {
    roles: {
      sky0: "#0A0D24", sky1: "#141A3E", sky2: "#232B5E", sky3: "#3A3A7A",
      far0: "#161C40", far1: "#232A58",
      wall0: "#15142E", wall1: "#262350", wall2: "#3B3572",
      wood0: "#241A30", wood1: "#3E2A44", wood2: "#5E4060",
      floor0: "#120F26", floor1: "#221D42",
      metal0: "#2A2E58", metal1: "#5C6496",
      leaf0: "#152A34", leaf1: "#22464A",
      glow: "#FFD98A", glow2: "#5CF2FF", accent: "#FF4FA3", accent2: "#8CF0FF", ink: "#06061A", paper: "#EAE6FF",
    },
    light: { rayColor: "#9FB4FF", rayOpacity: 0.26, glowOpacity: 0.85, vignette: 0.6, haze: "#3A3A7A" },
    sky: "night",
    scanlines: false,
    strict: false,
    ui: { box: "#0B0A22", border: "#EAE6FF", text: "#EAE6FF", accent: "#FF4FA3", name: "#8CF0FF" },
  },
  // bright saturated CRT arcade: magenta / cyan / yellow, scanlines
  "pixel-arcade": {
    roles: {
      sky0: "#1B0B3A", sky1: "#3A0F6E", sky2: "#7B1FA8", sky3: "#E0367A",
      far0: "#2A1060", far1: "#4C1A8C",
      wall0: "#1A1040", wall1: "#2E1C6E", wall2: "#4A30A8",
      wood0: "#5A1E3A", wood1: "#A8325A", wood2: "#F05A7E",
      floor0: "#120A30", floor1: "#2A1A64",
      metal0: "#2A3A8C", metal1: "#4C7CFF",
      leaf0: "#0E6E5A", leaf1: "#20C08A",
      glow: "#FFF04A", glow2: "#3CF8FF", accent: "#FF3CAC", accent2: "#3CF8FF", ink: "#0A0420", paper: "#FFFFFF",
    },
    light: { rayColor: "#FF8CE0", rayOpacity: 0.3, glowOpacity: 0.95, vignette: 0.5, haze: "#E0367A" },
    sky: "neon",
    scanlines: true,
    strict: false,
    ui: { box: "#0A0420", border: "#3CF8FF", text: "#FFFFFF", accent: "#FFF04A", name: "#FF3CAC" },
  },
  // limited 4-color palette (handheld-console green), every layer quantized
  "pixel-mono": {
    roles: {
      sky0: "#306230", sky1: "#306230", sky2: "#8BAC0F", sky3: "#9BBC0F",
      far0: "#8BAC0F", far1: "#306230",
      wall0: "#0F380F", wall1: "#306230", wall2: "#8BAC0F",
      wood0: "#0F380F", wood1: "#306230", wood2: "#8BAC0F",
      floor0: "#0F380F", floor1: "#306230",
      metal0: "#306230", metal1: "#8BAC0F",
      leaf0: "#0F380F", leaf1: "#306230",
      glow: "#9BBC0F", glow2: "#9BBC0F", accent: "#9BBC0F", accent2: "#8BAC0F", ink: "#0F380F", paper: "#9BBC0F",
    },
    palette: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
    light: { rayColor: "#C8E070", rayOpacity: 0.18, glowOpacity: 0.4, vignette: 0.35, haze: "#8BAC0F" },
    sky: "day",
    scanlines: false,
    strict: true,
    ui: { box: "#0F380F", border: "#9BBC0F", text: "#9BBC0F", accent: "#8BAC0F", name: "#8BAC0F" },
  },
  // fighting-game arena: hot red and gold on deep indigo, electric cyan lights, scanlines
  "pixel-versus": {
    roles: {
      sky0: "#0B0720", sky1: "#2A0F4C", sky2: "#7A1E5E", sky3: "#E4503A",
      far0: "#1A0F3A", far1: "#2E1659",
      wall0: "#150C2E", wall1: "#2A1A52", wall2: "#46308A",
      wood0: "#3A1020", wood1: "#7A2236", wood2: "#C24A3A",
      floor0: "#10081F", floor1: "#2B1A55",
      metal0: "#2E3A6E", metal1: "#6C86D8",
      leaf0: "#104A4A", leaf1: "#1FA39A",
      glow: "#FFD23F", glow2: "#4FE6FF", accent: "#FF3B5C", accent2: "#FFD23F", ink: "#080414", paper: "#FFFFFF",
    },
    light: { rayColor: "#FFE08A", rayOpacity: 0.3, glowOpacity: 0.95, vignette: 0.55, haze: "#E4503A" },
    sky: "neon",
    scanlines: true,
    strict: false,
    ui: { box: "#0B0620", border: "#4FE6FF", text: "#FFFFFF", accent: "#FFD23F", name: "#FF6B8A" },
  },
};

/** The distinct colors of a look (its declared palette, or the set of its role colors). */
export const lookPalette = (lookId) => {
  const l = PIXEL_LOOKS[lookId] ?? PIXEL_LOOKS["pixel-dusk"];
  return l.palette ?? [...new Set(Object.values(l.roles).map((c) => c.toUpperCase()))];
};

// ---------------- pixel math (pure) ----------------

/** Snap a value to a whole low-res pixel. */
export const snap = (v) => Math.round(v);

/** 4x4 Bayer matrix, values 0..15. */
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
/** Ordered-dither threshold of a pixel in (0, 1). */
export const bayer = (x, y) => (BAYER4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;
/** True when pixel (x, y) takes the second color of a two-color dithered blend at `ratio` (0..1). */
export const ditherPick = (x, y, ratio) => ratio > bayer(x, y);

export const hexToRgb = (h) => {
  let s = String(h).replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  const n = parseInt(s.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Index of the palette color (array of [r,g,b]) closest to (r, g, b), weighted for perceived brightness. */
export function nearestIndex(paletteRgb, r, g, b) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < paletteRgb.length; i++) {
    const [pr, pg, pb] = paletteRgb[i];
    const d = 0.3 * (r - pr) ** 2 + 0.59 * (g - pg) ** 2 + 0.11 * (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Quantize RGBA pixels in place to the nearest palette color; transparent pixels (alpha < 128) become fully
 * transparent, the rest fully opaque, so the upscaled image never shows soft edges.
 */
export function quantizePixels(data, paletteRgb) {
  const cache = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      data[i + 3] = 0;
      continue;
    }
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let idx = cache.get(key);
    if (idx === undefined) {
      idx = nearestIndex(paletteRgb, data[i], data[i + 1], data[i + 2]);
      cache.set(key, idx);
    }
    const c = paletteRgb[idx];
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  }
  return data;
}

/** Camera offset in low-res pixels (x, y) at time t of a scene lasting sceneSec, snapped to whole pixels. */
export function cameraOffset(move, t, sceneSec) {
  const p = Math.min(1, Math.max(0, t / Math.max(0.1, sceneSec)));
  const e = p * p * (3 - 2 * p);
  const span = PX.margin - 4;
  switch (move) {
    case "pan-left":
      return { x: snap(span - 2 * span * e), y: 0 };
    case "pan-right":
      return { x: snap(-span + 2 * span * e), y: 0 };
    case "rise":
      return { x: 0, y: snap(10 - 10 * e) };
    case "tilt-down":
      return { x: 0, y: snap(-10 + 20 * e) };
    default:
      return { x: 0, y: 0 };
  }
}

/** Parallax factor per layer: far moves least, near foreground most. */
export const PARALLAX = { far: 0.25, mid: 0.6, subject: 1, near: 1.6 };

// ---------------- planning ----------------

const round = (x) => Math.round(x * 1000) / 1000;
const AUTO_CAMERAS = ["pan-right", "pan-left", "rise", "pan-right", "static"];
const AUTO_TRANSITIONS = ["iris", "dissolve", "cut"];
const DEFAULT_SETS = ["room", "street", "factory", "gallery", "temple", "desert", "lab", "forest", "space"];

/** Resolve the camera move, transition and set of scene `index`. */
export const resolvePixelCamera = (p, index) => (!p?.camera || p.camera === "auto" ? AUTO_CAMERAS[index % AUTO_CAMERAS.length] : p.camera);
export const resolvePixelTransition = (p, index) => (!p?.transition || p.transition === "auto" ? AUTO_TRANSITIONS[index % AUTO_TRANSITIONS.length] : p.transition);

/** Default prop x positions (0..1): spread evenly away from the character. */
export function propXs(props, character) {
  const n = props.length;
  const charX = character ? (character.x ?? 0.3) : null;
  const free = props.filter((q) => q.x === undefined).length;
  const lo = charX !== null && charX < 0.5 ? 0.5 : 0.18;
  const hi = charX !== null && charX < 0.5 ? 0.86 : charX !== null ? 0.5 : 0.82;
  let k = 0;
  return props.map((q) => {
    if (q.x !== undefined) return q.x;
    const x = free === 1 ? (lo + hi) / 2 : lo + ((hi - lo) * k) / Math.max(1, free - 1);
    k++;
    return round(n ? x : 0.5);
  });
}

/**
 * Plan one `pixel` visual: set, camera, transition, prop entrances, panel timing, and `elements` in the
 * illustrated planner's shape so computeBeats turns them into SFX beats.
 */
export function planPixelScene(p, sceneSec, index = 0, moments = {}) {
  const props = p.props ?? [];
  const first = 0.35;
  const last = Math.max(first, sceneSec - 1.4);
  const step = props.length > 1 ? Math.min(0.6, Math.max(0.18, (last - first) / (props.length - 1))) : 0;
  const xs = propXs(props, p.character);
  const placed = props.map((q, i) => ({ x: xs[i], enter: round(q.at ?? first + i * step) }));
  const panelAt = round(p.popup?.at ?? 0.6);
  const checks = p.checklist ? p.checklist.items.map((_, k) => round(0.7 + k * Math.min(0.8, Math.max(0.35, (sceneSec - 1.6) / p.checklist.items.length)))) : [];
  // versus format: the ROUND card holds for ~2 s, then the ranking / verdict rows fill in one by one
  const roundCard = p.round ? { at: 0.2, until: round(Math.min(2, Math.max(1, sceneSec - 1))) } : null;
  const panelRows = p.ranking?.rows ?? p.verdict?.rows;
  const rows = panelRows ? rowTimes(panelRows.length, sceneSec, roundCard ? roundCard.until + 0.2 : 0.8) : null;
  const elements = [
    ...placed.map((q, i) => ({ el: { type: props[i].kind === "item" || props[i].open ? "stamp" : "icon" }, box: null, enter: q.enter, items: [] })),
    ...(p.popup ? [{ el: { type: "doc" }, box: null, enter: panelAt, items: [] }] : []),
    ...(p.counter ? [{ el: { type: "counter" }, box: null, enter: 0.3, items: [] }] : []),
    ...(p.checklist ? [{ el: { type: "checklist" }, box: null, enter: 0.5, items: checks }] : []),
    ...(roundCard ? [{ el: { type: "stamp" }, box: null, enter: roundCard.at, items: [] }] : []),
    ...(rows ? [{ el: { type: "checklist" }, box: null, enter: round(rows[0] - 0.2), items: rows }] : []),
    ...actorBeats(p, moments, sceneSec),
    ...fxBeats(p, moments, sceneSec),
  ];
  return {
    kind: "pixel",
    set: typeof p.set === "object" && p.set ? "custom" : (p.set ?? DEFAULT_SETS[index % DEFAULT_SETS.length]),
    moments,
    camera: resolvePixelCamera(p, index),
    transition: resolvePixelTransition(p, index),
    props: placed,
    panelAt,
    checks,
    ...(roundCard ? { round: roundCard } : {}),
    ...(rows ? { rows } : {}),
    elements,
  };
}

/** Reveal times (seconds) of the n rows of a ranking / verdict panel: one after another, the last before the closing hold. */
export function rowTimes(n, sceneSec, start = 0.8) {
  const first = Math.min(start, Math.max(0.5, sceneSec - 2.6));
  const last = Math.max(first, sceneSec - 1.4);
  const step = n > 1 ? Math.min(0.9, Math.max(0.35, (last - first) / (n - 1))) : 0;
  return Array.from({ length: n }, (_, i) => round(first + i * step));
}

const secOf = (at, moments) => (typeof at === "number" ? at : typeof at === "string" && at in moments ? moments[at] : null);
/** SFX beats of actors that enter at a moment (pop) and of explosive fx (stamp). */
function actorBeats(p, moments) {
  return (p.actors ?? []).flatMap((a) => {
    const t = secOf(a.at, moments);
    return t !== null && t > 0.1 ? [{ el: { type: "icon" }, box: null, enter: round(t), items: [] }] : [];
  });
}
function fxBeats(p, moments) {
  return (p.fx ?? []).flatMap((f) => {
    if (!["burst", "lightning", "shockwave", "energy-beam", "hit-flash"].includes(f.type)) return [];
    const t = f.at === undefined ? 0.4 : secOf(f.at, moments);
    return t === null ? [] : [{ el: { type: "stamp" }, box: null, enter: round(Math.max(0, t - 0.18)), items: [] }];
  });
}

/**
 * Plan every scene of a pixel-template spec. Scenes without a pixel visual get a default set by index.
 * `captions` (word timings, absolute ms) resolve word moments like the reels `en`; default: text-timed captions.
 */
export function planPixel(spec, timeline, captions) {
  const fps = spec.format.fps;
  const words = captions ?? syntheticCaptions(spec.scenes, timeline);
  return spec.scenes.map((s, i) => {
    const sc = timeline.scenes[i];
    const lastScene = i === timeline.scenes.length - 1;
    const sec = (sc.durationInFrames - (lastScene ? 0 : timeline.transitionFrames)) / fps;
    const p = s.visual?.type === "pixel" && s.visual.pixel ? s.visual.pixel : { set: DEFAULT_SETS[i % DEFAULT_SETS.length] };
    const strings = sceneMomentStrings(p);
    let moments = {};
    if (strings.length) {
      const next = timeline.scenes[i + 1];
      const mine = words.filter((w) => w.startMs >= sc.speechStartMs - 1 && (!next || w.startMs < next.speechStartMs - 1));
      moments = resolveSceneMoments(strings, mine, sc, fps);
    }
    return planPixelScene(p, sec, i, moments);
  });
}

// ---------------- UI text (pure) ----------------

/** Greedy word wrap for a monospace font: lines of at most `maxChars` characters (a long word gets its own line). */
export function wrapMono(text, maxChars) {
  const lines = [];
  let cur = "";
  for (const w of String(text).trim().split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += ` ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Largest font size (from `sizes`, descending) whose monospace wrap fits `maxWidth` px in at most `maxLines` lines.
 * Glyph advance is `advance` x size (Press Start 2P: 1em). Falls back to the smallest size.
 */
/**
 * Banner face for a text. Press Start 2P draws accented capital vowels (Á É Í Ó Ú Ü) like lowercase letters,
 * so those banners use Silkscreen; `advance` is the widest Silkscreen capital (0.875 em) for fitMono.
 */
export const bannerFace = (text) => (/[ÁÉÍÓÚÜ]/.test(String(text).toUpperCase()) ? { face: "silkscreen", advance: 0.875 } : { face: "press", advance: 1 });

export function fitMono(text, { maxWidth, sizes, maxLines, advance = 1 }) {
  for (const size of sizes) {
    const maxChars = Math.floor(maxWidth / (size * advance));
    const lines = wrapMono(text, maxChars);
    if (lines.length <= maxLines && lines.every((l) => l.length <= maxChars)) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  return { size, lines: wrapMono(text, Math.floor(maxWidth / (size * advance))) };
}

/** Integer with "." thousands separators (es style, also for 4 digits): 12220 -> "12.220", -3120 -> "-3.120". */
export const formatCount = (n) => {
  const v = Math.round(n);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return v < 0 ? `-${s}` : s;
};

/**
 * Regroup caption pages into dialog pages: one sentence per box when it fits; a longer sentence is split into
 * balanced chunks of at most `maxChars` characters (never a lone trailing word); a pause over 700 ms also breaks.
 * Word timings are kept.
 */
export function dialogPages(pages, { maxChars = 60 } = {}) {
  const words = pages.flatMap((p) => p.words);
  const sentences = [];
  let cur = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && prev && w.startMs - prev.endMs > 700) {
      sentences.push(cur);
      cur = [];
    }
    cur.push(w);
    if (/[.!?…]$/.test(String(w.text).trim())) {
      sentences.push(cur);
      cur = [];
    }
  });
  if (cur.length) sentences.push(cur);
  const len = (ws) => ws.reduce((a, w, k) => a + (k ? 1 : 0) + String(w.text).trim().length, 0);
  const out = [];
  for (const sent of sentences) {
    const n = Math.ceil(len(sent) / maxChars);
    const target = len(sent) / n;
    let chunk = [];
    for (const w of sent) {
      const next = len([...chunk, w]);
      // break at the chunk length closest to the balanced target
      if (chunk.length && (next > maxChars || next - target > target - len(chunk))) {
        out.push(chunk);
        chunk = [];
      }
      chunk.push(w);
    }
    if (chunk.length) out.push(chunk);
  }
  return out.map((ws) => ({ startMs: ws[0].startMs, endMs: ws[ws.length - 1].endMs, words: ws }));
}

/**
 * What the RPG dialog box shows at `ms`: the caption page being spoken (or the last one, held for up to holdMs),
 * typed in sync with the words: spoken words are complete, the current word is typed letter by letter.
 * @returns {{text: string, full: string, done: boolean, page: number} | null}
 */
export function dialogAt(pages, ms, { holdMs = 1500 } = {}) {
  let idx = -1;
  for (let i = 0; i < pages.length; i++) if (pages[i].startMs <= ms) idx = i;
  if (idx < 0) return null;
  const page = pages[idx];
  if (ms > page.endMs + holdMs && (idx === pages.length - 1 || pages[idx + 1].startMs > ms)) return null;
  const words = page.words.map((w) => String(w.text).trim());
  const full = words.join(" ");
  let text = "";
  page.words.forEach((w, k) => {
    const word = words[k];
    if (ms >= w.endMs) text += (k ? " " : "") + word;
    else if (ms >= w.startMs) {
      const dur = Math.max(1, (w.endMs - w.startMs) * 0.6);
      const n = Math.min(word.length, Math.ceil(((ms - w.startMs) / dur) * word.length));
      text += (k ? " " : "") + word.slice(0, n);
    }
  });
  return { text, full, done: ms >= page.endMs, page: idx };
}
