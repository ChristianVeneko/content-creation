// Schema of agent-drawn 2D vector art (a leaf module: lib/illustration-schema.mjs builds the `drawing` element from
// it while the kit modules load). Cross-field checks, geometry, motion and planning live in lib/drawing.mjs.
import { z } from "zod";
import { EASINGS, momentSchema } from "./motion.mjs";

// ---------------- colors ----------------

/** Palette tokens shared by every illustrated element (illustration-schema re-exports them). */
export const COLOR_TOKENS = ["accent", "accent2", "accent3", "good", "bad", "muted", "text"];
/** Extra drawing roles: background, panel surface, hairline, paper and the darkest ink of the look. */
export const DRAW_ROLES = [...COLOR_TOKENS, "bg", "surface", "line", "paper", "ink"];
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const colorMsg = `must be a palette role (${DRAW_ROLES.join(", ")}) or a hex color like #1A2B3C`;
export const drawColor = z.string().refine((s) => HEX_RE.test(s) || DRAW_ROLES.includes(s), { message: colorMsg });
const gradient = z
  .object({
    gradient: z.array(drawColor).min(2).max(4).describe("Color stops (roles or hex), first to last"),
    angle: z.number().min(-360).max(360).optional().describe("Linear direction in degrees (0 = left to right, 90 = top to bottom)"),
    radial: z.boolean().optional().describe("Radial from the center instead of linear"),
  })
  .strict();
const paint = z.union([drawColor, z.literal("none"), gradient], {
  error: (iss) => (typeof iss.input === "string" ? colorMsg : "must be a color, \"none\" or {gradient: [colors], angle?, radial?}"),
});

// ---------------- vocabulary ----------------

/** Part shapes and the geometry each one needs. */
export const SHAPE_FIELDS = {
  path: { need: ["d"], about: "`d`: SVG path data (absolute or relative commands)" },
  rect: { need: ["w", "h"], about: "`x`, `y` (top-left), `w`, `h`, optional `r` corner radius" },
  circle: { need: ["r"], about: "`cx`, `cy`, `r`" },
  ellipse: { need: ["rx", "ry"], about: "`cx`, `cy`, `rx`, `ry`" },
  polygon: { need: ["points"], about: "`points` [[x, y], ...] (>= 3), closed" },
  line: { need: [], about: "`x1`, `y1`, `x2`, `y2`, or `points` [[x, y], ...] for an open polyline" },
  text: { need: ["text"], about: "`text`, `x`, `y` (baseline), `size`, `anchor`, `font`" },
  group: { need: [], about: "an empty pivot: hang parts from it with `parent` and move them together" },
};
export const DRAW_SHAPES = Object.keys(SHAPE_FIELDS);
/** Motion presets. amp: viewBox units (bob, float, orbit, slide-in, fall, shake), degrees (sway, wave, wiggle, spin = deg/s) or a fraction (pulse, squash). */
export const DRAW_MOTION_ABOUT = {
  bob: "gentle up-down",
  float: "slow hover with a little drift and tilt",
  sway: "rocks around its `origin`",
  spin: "turns around its `origin` (`amp` degrees per second, default 90)",
  pulse: "breathes bigger and back",
  wave: "swings around its `origin` (an arm with `origin` at the shoulder); `lift` raises it first (degrees)",
  blink: "closes briefly every few seconds (eyes); on the drawing it needs `parts`",
  "pop-in": "scales in with overshoot at `at` (hidden before); on the drawing with `parts`: one after another",
  "slide-in-left": "enters from the left at `at`",
  "slide-in-right": "enters from the right at `at`",
  wiggle: "nervous little rotation",
  squash: "squash-and-stretch idle (put `origin` at the feet)",
  "draw-on": "its stroke draws itself at `at`, then the fill floods in; on the drawing: every stroked part (or `parts`) in order",
  orbit: "circles around its rest position",
  fall: "drops in from above at `at` and bounces",
  shake: "shakes at `at` for 0.5 s (or until `until`)",
};
export const DRAW_MOTIONS = Object.keys(DRAW_MOTION_ABOUT);
/** Presets that, placed on the drawing with `parts`, act on those parts. */
export const PART_TARGETING = ["blink", "draw-on", "pop-in"];
export const MAX_DRAW_PARTS = 60;
export const MAX_PATH_CHARS = 8000;
/** A data-atlas backdrop plane is a whole scene layer (a lit sky, a field, a building): it gets a larger budget. */
export const MAX_BACKDROP_PARTS = 240;
export const MAX_BACKDROP_PATH_CHARS = 48000;
/** Procedural surface textures a part can wear (SVG turbulence modulating the part's own fill). */
export const DRAW_TEXTURE_ABOUT = {
  grain: "fine speckle: film grain, dust, sand (alpha speckle over the shape)",
  mottle: "soft low-frequency blotches: stained paper, marble, cloud shade (darkens the fill unevenly)",
  wood: "long streaks along x: wood grain, brushed metal (darkens the fill in lines)",
  cracks: "a network of thin fissures: dry earth, old plaster (the fill shows only along the cracks)",
  fibers: "fine criss-cross fibers: paper stock, cloth (darkens the fill with a fine weave)",
};
export const DRAW_TEXTURES = Object.keys(DRAW_TEXTURE_ABOUT);
/** Blend modes a part can use against the parts drawn before it (glows use screen, shadows multiply). */
export const DRAW_BLENDS = ["screen", "multiply", "overlay", "soft-light", "lighten", "color-dodge"];

// ---------------- schema ----------------

const num = (lo, hi) => z.number().min(lo).max(hi);
const coord = num(-4000, 4000);
const pt = z.tuple([coord, coord]);

const motionObject = z
  .object({
    type: z.string().min(1).describe(`Preset: ${DRAW_MOTIONS.join(", ")}`),
    at: momentSchema.optional().describe("Start (default: the drawing's entrance for pop-in/slide-in/fall/draw-on/shake, else the scene start)"),
    until: momentSchema.optional().describe("End (default: the scene end)"),
    amp: num(0, 2000).optional().describe("Amplitude: viewBox units, degrees (sway, wave, wiggle; spin = degrees per second) or a fraction (pulse, squash)"),
    speed: num(0.05, 8).optional().describe("Tempo multiplier (1 = default)"),
    parts: z.array(z.string().min(1).max(40)).min(1).max(30).optional().describe("blink/draw-on/pop-in on the drawing: the part ids"),
    lift: num(-180, 180).optional().describe("wave: degrees the limb is raised first"),
  })
  .strict();
const motionField = z
  .array(z.union([z.string().min(1), motionObject]))
  .max(6)
  .optional()
  .describe(`Procedural motion: preset names or {type, at, until, amp, speed, parts, lift}. Presets: ${DRAW_MOTIONS.join(", ")}`);
const keySchema = z
  .object({
    at: momentSchema,
    x: num(-4000, 4000).optional().describe("Offset from the rest position (viewBox units)"),
    y: num(-4000, 4000).optional(),
    rot: num(-1440, 1440).optional().describe("Degrees added around `origin`"),
    scale: z.union([num(0, 20), z.tuple([num(-20, 20), num(-20, 20)])]).optional().describe("Multiplier, or [sx, sy] (negative flips)"),
    opacity: num(0, 1).optional(),
    draw: num(0, 1).optional().describe("Stroke drawn so far (0..1)"),
    ease: z.enum(EASINGS).optional().describe("Easing of the segment that arrives at this key (default in-out)"),
  })
  .strict();
const keysField = z.array(keySchema).min(1).max(16).optional().describe("Keyframes [{at, x, y, rot, scale, opacity, draw, ease}]");

export const drawPartSchema = z
  .object({
    id: z.string().min(1).max(40),
    shape: z.string().describe(`One of: ${DRAW_SHAPES.join(", ")}`),
    d: z.string().min(1).max(4000).optional().describe("path: SVG path data"),
    x: coord.optional(),
    y: coord.optional(),
    w: num(0, 4000).optional(),
    h: num(0, 4000).optional(),
    r: num(0, 2000).optional().describe("circle radius; rect corner radius"),
    cx: coord.optional(),
    cy: coord.optional(),
    rx: num(0, 2000).optional(),
    ry: num(0, 2000).optional(),
    x1: coord.optional(),
    y1: coord.optional(),
    x2: coord.optional(),
    y2: coord.optional(),
    points: z.array(pt).min(2).max(64).optional().describe("polygon (closed) or line (open polyline): [[x, y], ...]"),
    text: z.string().min(1).max(60).optional(),
    size: num(4, 600).optional().describe("text: font size in viewBox units (default 40)"),
    weight: num(100, 900).optional(),
    anchor: z.enum(["start", "middle", "end"]).optional().describe("text alignment around x (default middle)"),
    font: z.enum(["display", "body", "mono", "hand"]).optional().describe("text: the look's display, body or mono font, or a handwriting font"),
    fill: paint.optional().describe('A role (accent, accent2, accent3, text, muted, good, bad, bg, surface, line, paper, ink), hex, "none" or {gradient, angle, radial}'),
    stroke: paint.optional(),
    width: num(0, 60).optional().describe("Stroke width (viewBox units)"),
    opacity: num(0, 1).optional(),
    blur: num(0, 60).optional().describe("Gaussian blur radius in viewBox units: soft shadows, glows (pair with blend: screen), haze"),
    blend: z.enum(DRAW_BLENDS).optional().describe(`Blend mode against what is drawn below: ${DRAW_BLENDS.join(", ")}`),
    texture: z.enum(DRAW_TEXTURES).optional().describe(`Surface texture over the shape: ${DRAW_TEXTURES.join(", ")}`),
    pos: pt.optional().describe("Static offset [dx, dy] (moves the part and its children)"),
    rot: num(-360, 360).optional().describe("Static rotation in degrees around `origin`"),
    scale: z.union([num(0.01, 20), z.tuple([num(-20, 20), num(-20, 20)])]).optional().describe("Static scale around `origin`"),
    origin: pt.optional().describe("Pivot [x, y] for rotation/scale (default: the part's center; a shoulder, the feet...)"),
    parent: z.string().min(1).max(40).optional().describe("Part id this part hangs from (moves with it)"),
    at: momentSchema.optional().describe("When the part appears (draw-on start / fade in); default with the drawing"),
    draw: z.boolean().optional().describe("Draw the stroke on when the part appears, then flood the fill"),
    motion: motionField,
    keys: keysField,
  })
  .strict();

/** Drawing fields shared by the illustrated `drawing` element and the classic `visual.drawing`. */
export const drawingFields = {
  viewBox: z
    .string()
    .regex(/^\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s*$/, 'must look like "0 0 400 400"')
    .optional()
    .describe('Drawing coordinates (default "0 0 400 400")'),
  height: num(120, 900).optional().describe("Drawing height in px on the stage (illustrated; default 420)"),
  label: z.string().min(1).max(36).optional(),
  origin: pt.optional().describe("Pivot of the whole drawing (default: the viewBox center)"),
  parts: z.array(drawPartSchema).min(1).max(MAX_DRAW_PARTS, `at most ${MAX_DRAW_PARTS} parts per drawing`),
  motion: motionField,
  keys: keysField,
};

