// Zod schemas for the `illustrated` template: scene headline, HUD and the illustration element vocabulary.
// Every element is drawn in code (SVG/HTML); the LLM picks elements and fills their text.
import { z } from "zod";
import { LOOKS } from "./illustrated-looks.mjs";
import { COLOR_TOKENS, drawingFields } from "./drawing-schema.mjs";
import { drawingIssues } from "./drawing.mjs";

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #1A2B3C");

/** A color: a hex value or a palette token (COLOR_TOKENS lives in lib/drawing.mjs, re-exported here). */
export { COLOR_TOKENS };
const color = z.union([hex, z.enum(COLOR_TOKENS)]);

// Pictographic characters (emoji). Arrows, (c), (r) and TM are allowed: they are plain typography.
const EMOJI_RE = /(?![©®™←-⇿])[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
export const hasEmoji = (s) => EMOJI_RE.test(s);

const text = (max = 80) => z.string().min(1).max(max);

/** Fields shared by every element. */
const base = {
  id: z.string().min(1).max(40).optional().describe("Reference for callouts"),
  at: z.number().min(0).max(60).optional().describe("Seconds into the scene when it appears; omitted = auto-staggered"),
  color: color.optional(),
};

const card = z.object({ type: z.literal("card"), ...base, title: text(40), body: z.array(text(60)).max(4).optional(), icon: z.string().optional() });

const flowNode = z.union([text(28), z.object({ label: text(28), icon: z.string().optional() })]);
const flow = z.object({
  type: z.literal("flow"),
  ...base,
  nodes: z.array(flowNode).min(2).max(6),
  direction: z.enum(["vertical", "horizontal"]).optional(),
});

const compareSide = z.object({ title: text(24), items: z.array(text(40)).max(5).default([]), icon: z.string().optional() });
const compare = z.object({
  type: z.literal("compare"),
  ...base,
  left: compareSide,
  right: compareSide,
  winner: z.enum(["left", "right"]).optional(),
});

const checkItem = z.union([text(48), z.object({ text: text(48), state: z.enum(["check", "cross", "todo"]).default("check") })]);
const checklist = z.object({ type: z.literal("checklist"), ...base, title: text(40).optional(), items: z.array(checkItem).min(1).max(6) });

const bars = z.object({
  type: z.literal("bars"),
  ...base,
  title: text(40).optional(),
  unit: z.string().max(8).optional(),
  max: z.number().positive().optional(),
  items: z.array(z.object({ label: text(20), value: z.number().min(0), color: color.optional() })).min(1).max(5),
});

const counter = z.object({
  type: z.literal("counter"),
  ...base,
  value: z.number(),
  from: z.number().optional(),
  prefix: z.string().max(4).optional(),
  suffix: z.string().max(8).optional(),
  decimals: z.number().int().min(0).max(2).optional(),
  label: text(40).optional(),
});

const code = z.object({ type: z.literal("code"), ...base, title: text(32).optional(), lines: z.array(z.string().max(48)).min(1).max(8) });
const terminal = z.object({ type: z.literal("terminal"), ...base, title: text(32).optional(), lines: z.array(z.string().max(48)).min(1).max(7) });

const chat = z.object({
  type: z.literal("chat"),
  ...base,
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), text: text(90) })).min(1).max(4),
});

const doc = z.object({ type: z.literal("doc"), ...base, title: text(32), lines: z.array(text(48)).min(1).max(6), stamp: text(16).optional() });

const timelineStep = z.union([text(24), z.object({ label: text(24), sub: text(32).optional() })]);
const timeline = z.object({ type: z.literal("timeline"), ...base, steps: z.array(timelineStep).min(2).max(5) });

const icon = z.object({
  type: z.literal("icon"),
  ...base,
  name: z.string().min(1).describe("Phosphor icon name, e.g. rocket, magnifying-glass, file-text"),
  label: text(28).optional(),
  size: z.enum(["s", "m", "l"]).optional(),
});

const badge = z.object({ type: z.literal("badge"), ...base, text: text(28), icon: z.string().optional() });
const stamp = z.object({ type: z.literal("stamp"), ...base, text: text(18), target: z.string().optional().describe("Element id to stamp over") });

const callout = z.object({
  type: z.literal("callout"),
  ...base,
  target: z.string().min(1).describe("id of the element to point at"),
  shape: z.enum(["circle", "underline", "arrow", "box"]).default("circle"),
  label: text(28).optional(),
});

const svg = z.object({
  type: z.literal("svg"),
  ...base,
  viewBox: z
    .string()
    .regex(/^\s*-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?\s*$/, 'must look like "0 0 400 300"')
    .default("0 0 400 300"),
  paths: z
    .array(
      z.object({
        d: z.string().min(1).max(4000),
        stroke: color.optional(),
        fill: z.union([color, z.literal("none")]).optional(),
        width: z.number().min(0).max(40).optional(),
      }),
    )
    .min(1)
    .max(24),
  label: text(36).optional(),
  height: z.number().min(120).max(640).optional().describe("Drawing height in px (default fits the stage)"),
});

/** Agent-drawn vector art: named parts with a hierarchy, draw-on, keyframes and motion presets (lib/drawing.mjs). */
const drawing = z
  .object({ type: z.literal("drawing"), ...base, ...drawingFields })
  .strict()
  .superRefine((d, ctx) => drawingIssues(d).forEach((i) => ctx.addIssue({ code: "custom", path: i.path, message: i.message })));

// ---------------- format elements (ui-cards, flat-depth, soft-gradient; they render in every look) ----------------

/** Social post card: avatar, name, verified dot and text lines; `highlight` lines get a marker sweep, `magnify` a lens. */
const post = z.object({
  type: z.literal("post"),
  ...base,
  name: text(28),
  handle: text(28).optional(),
  verified: z.boolean().optional(),
  lines: z.array(text(70)).min(1).max(4),
  highlight: z.array(z.number().int().min(0).max(3)).max(4).optional().describe("0-based line indexes swept with a highlighter"),
  magnify: z.boolean().optional().describe("A magnifier glides over the highlighted lines"),
});

/** Bar chart card; `expected` draws a dashed outline of what people expected next to the real bar. */
const chart = z.object({
  type: z.literal("chart"),
  ...base,
  title: text(32).optional(),
  unit: z.string().max(8).optional(),
  max: z.number().positive().optional(),
  items: z.array(z.object({ label: text(16), value: z.number().min(0), expected: z.number().min(0).optional(), color: color.optional() })).min(1).max(4),
});

/** A jar (or battery / gauge) that fills to `value` (0..1 or 0..100). An optional rotated stamp lands on it. */
const meter = z.object({
  type: z.literal("meter"),
  ...base,
  value: z.number().min(0).max(100),
  from: z.number().min(0).max(100).optional(),
  shape: z.enum(["jar", "battery", "gauge"]).default("jar"),
  label: text(24).optional().describe("Tag on the jar"),
  caption: text(48).optional().describe("Small quote under the meter"),
  stamp: text(14).optional().describe("Rotated stamp word that lands on the meter (e.g. IGUAL)"),
});

const hourglass = z.object({ type: z.literal("hourglass"), ...base, label: text(24).optional() });

/** Price tags hanging from strings. */
const tags = z.object({
  type: z.literal("tags"),
  ...base,
  items: z.array(z.object({ label: text(14), price: text(12), sub: text(14).optional(), color: color.optional() })).min(1).max(3),
});

/** Big stat badge (yellow by default), e.g. "+50 %". */
const stat = z.object({ type: z.literal("stat"), ...base, value: text(12), label: text(32).optional(), icon: z.string().optional() });

/** Digital timer display ("4:59:59", "16:00"); `countdown` ticks the last digits down, `clock` adds an analog clock. */
const timer = z.object({
  type: z.literal("timer"),
  ...base,
  text: z.string().min(1).max(10),
  label: text(20).optional(),
  countdown: z.boolean().optional(),
  clock: z.boolean().optional(),
});

/** Two or three comparison panels side by side, each with an icon, a question and a bottom tag. */
const panels = z.object({
  type: z.literal("panels"),
  ...base,
  items: z
    .array(z.object({ title: text(32), text: text(48).optional(), icon: z.string().optional(), tag: text(14).optional(), color: color.optional() }))
    .min(2)
    .max(3),
  winner: z.number().int().min(0).max(2).optional().describe("0-based index of the highlighted panel"),
});

export const OBJECT_KINDS = ["laptop", "phone", "coins", "box", "books", "mug", "monitor", "plant"];
/** Flat-shaded 2.5D object on the table, with a lit face, a shade face and a contact shadow. */
const object = z.object({
  type: z.literal("object"),
  ...base,
  kind: z.enum(OBJECT_KINDS),
  count: z.number().int().min(1).max(4).default(1).describe("A row of copies receding in perspective"),
  value: z.number().int().min(1).max(12).optional().describe("coins: stack height"),
  label: text(28).optional(),
});

export const CHARACTER_MOODS = ["happy", "neutral", "sad", "surprised", "thinking", "angry"];
/** Generic, original character: a round-headed person (default) or a blocky one. Never a mascot or a real person. */
const character = z.object({
  type: z.literal("character"),
  ...base,
  mood: z.enum(CHARACTER_MOODS).default("neutral"),
  style: z.enum(["round", "blocky"]).default("round"),
  label: text(24).optional(),
  shirt: color.optional(),
  hair: color.optional(),
});

const LEAF = [card, flow, compare, checklist, bars, counter, code, terminal, chat, doc, timeline, icon, badge, stamp, callout, svg, drawing, post, chart, meter, hourglass, tags, stat, timer, panels, object, character];
export const LEAF_TYPES = LEAF.map((s) => s.shape.type.value);
export const ELEMENT_TYPES = [...LEAF_TYPES, "split"];

const unknownType = (types) => (iss) =>
  iss.code === "invalid_union" && iss.note === "No matching discriminator" ? `unknown element type; use one of: ${types.join(", ")}` : undefined;

export const leafElementSchema = z.discriminatedUnion("type", LEAF, { error: unknownType(LEAF_TYPES) });

const split = z.object({
  type: z.literal("split"),
  ...base,
  left: z.array(leafElementSchema).min(1).max(3),
  right: z.array(leafElementSchema).min(1).max(3),
  divider: z.enum(["vs", "line", "none"]).optional(),
});

export const elementSchema = z.discriminatedUnion("type", [...LEAF, split], { error: unknownType(ELEMENT_TYPES) });
export const elementsSchema = z.array(elementSchema).min(1).max(6);

/** The visual + motion language of an illustrated-kit template (see LOOKS in illustrated.mjs). */
export const lookSchema = z.enum(LOOKS, { error: () => `unknown look; use one of: ${LOOKS.join(", ")}` });
export { LOOKS };

export const sceneTitleSchema = z.object({
  kicker: text(40).optional().describe("Small white uppercase line"),
  main: text(40).describe("Big accent line"),
  quote: z.boolean().optional().describe("Wrap the main line in «»"),
  color: color.optional(),
  number: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .describe("Scene number shown by the look: rank-numbers rank (slammed), editor-window step badge, whiteboard circled number"),
});

export const hudItemSchema = z.object({
  id: z.string().min(1).max(24),
  type: z.enum(["chip", "label", "bar"]),
  label: z.string().max(18).optional(),
  value: z.union([z.string().max(18), z.number()]).optional().describe("chip/label: text; bar: 0..1 (or 0..100)"),
  color: color.optional(),
});

export const hudOverrideSchema = z.record(
  z.string(),
  z.object({ label: z.string().max(18).optional(), value: z.union([z.string().max(18), z.number()]).optional(), color: color.optional() }),
);
