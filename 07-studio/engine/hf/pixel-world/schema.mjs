// zod 4 schema of `spec.hf` for the pixel-world format. Enums are closed and every failure names the allowed values.
import { z } from "zod";
import { STYLE_IDS, PIXEL_SCALES } from "./styles.mjs";
import { BEAT_KINDS, PROP_ACTS, EMOTES, TRANSITIONS, TIMES, COLORS, SIZES, LAYOUTS, ANCHORS, scenarioIds, heroIds, castIds, getScenario, worldProps, propKinds, workshopProps, WORKSHOP_THEMES, WORKSHOP_MAX_PROPS } from "./catalog.mjs";

const preview = (list) => (list.length > 14 ? `${list.slice(0, 14).join(", ")}, ... (${list.length} total)` : list.join(", "));
const closedEnum = (list, what) => z.enum(list, { error: (iss) => `unknown ${what} ${JSON.stringify(iss.input)}; use one of: ${preview(list)}` });

const wordRef = z.object({
  word: z.string().min(1, "word must not be empty").optional(),
  n: z.number().int().min(1, "n is 1-based (1 = first occurrence)").optional(),
  at: z.number().min(0, "at is seconds from the start of the video").optional(),
  offset: z.number().min(-2).max(2).optional(),
}).refine((v) => v.word !== undefined || v.at !== undefined, { message: "`on` needs a `word` (spoken word, optional `n`) or `at` (seconds)" });

const num01 = z.number().min(0).max(1);
const targetStr = z.string().min(1);

export const beatSchema = z.object({
  on: wordRef,
  do: closedEnum(BEAT_KINDS, "beat kind (`do`)"),
  target: targetStr.optional(),
  who: z.string().min(1).optional(),
  to: z.union([z.string().min(1), z.number()]).optional(),
  value: z.number().optional(),
  count: z.number().int().min(1).max(12).optional(),
  color: z.union([closedEnum(COLORS, "colour"), z.number().int().min(0).max(5)]).optional(),
  text: z.string().min(1).max(32, "text is limited to 32 characters").optional(),
  symbol: closedEnum(EMOTES, "emote symbol").optional(),
  amp: z.number().int().min(1).max(6).optional(),
  amount: z.number().min(1.05).max(1.6).optional(),
  hold: z.number().min(0).max(4).optional(),
  dur: z.number().min(0.2).max(6).optional(),
  label: z.string().max(16).optional(),
}).superRefine((b, ctx) => {
  const need = (field, msg) => { if (b[field] === undefined) ctx.addIssue({ code: "custom", path: [field], message: msg ?? `\`${b.do}\` needs \`${field}\`` }); };
  if (PROP_ACTS.includes(b.do)) need("target", `\`${b.do}\` needs a \`target\` prop of the world's scenario`);
  if (["hero-stamp", "label"].includes(b.do)) need("text");
  if (["pan", "push", "point"].includes(b.do)) need("target");
  if (b.do === "walk") need("to", "`walk` needs `to` (left|center|right or a prop id)");
  if (["progress", "counter"].includes(b.do)) need("value");
  if (b.do === "progress" && b.value !== undefined && (b.value < 0 || b.value > 1)) ctx.addIssue({ code: "custom", path: ["value"], message: "progress `value` is 0-1" });
  if (b.do === "fill" && b.value !== undefined && (b.value < 0 || b.value > 1)) ctx.addIssue({ code: "custom", path: ["value"], message: "fill `value` is 0-1" });
});

const castEntry = z.object({
  who: z.string().min(1).refine((v) => castIds().includes(v), { error: (iss) => `unknown cast member ${JSON.stringify(iss.input)}; use one of: ${castIds().join(", ")}` }),
  at: z.union([z.string().min(1), z.number()]).optional(),
  size: closedEnum(SIZES, "size (S|M|L)").optional(),
  dir: z.union([z.literal(1), z.literal(-1)]).optional(),
  talk: z.boolean().optional(),
});

const workshopPropSchema = z.object({
  kind: closedEnum(propKinds(), "prop kind"),
  id: z.string().min(1).max(24).regex(/^[a-z0-9-]+$/, "prop id: lowercase letters, digits and dashes").optional(),
  at: z.union([closedEnum(ANCHORS, "position"), z.number().min(0)]).optional(),
  size: closedEnum(SIZES, "size (S|M|L)").optional(),
  row: closedEnum(["floor", "bench", "high"], "row").optional(),
});

export const worldSchema = z.object({
  scenario: closedEnum(scenarioIds(), "scenario"),
  props: z.array(workshopPropSchema).max(WORKSHOP_MAX_PROPS, `at most ${WORKSHOP_MAX_PROPS} props per workshop-stage world`).optional(),
  theme: closedEnum(WORKSHOP_THEMES, "workshop theme").optional(),
  from: z.union([z.number().min(0), wordRef]).optional(),
  transition: closedEnum(TRANSITIONS, "transition").optional(),
  time: closedEnum(TIMES, "time of day").optional(),
  cast: z.array(castEntry).max(6).optional(),
  beats: z.array(beatSchema).max(48).default([]),
}).superRefine((w, ctx) => {
  const sc = getScenario(w.scenario); if (!sc) return;
  if (sc.dynamic && !(w.props?.length)) ctx.addIssue({ code: "custom", path: ["props"], message: `scenario "${w.scenario}" needs \`props\`: 1-${WORKSHOP_MAX_PROPS} items { kind, id?, at?, size? }; kinds: ${propKinds().join(", ")}` });
  if (!sc.dynamic && (w.props?.length || w.theme)) ctx.addIssue({ code: "custom", path: [w.props?.length ? "props" : "theme"], message: `\`props\` and \`theme\` exist only on scenario "workshop-stage" (this world uses "${w.scenario}")` });
  const wp = worldProps(w), props = wp.map((p) => p.id);
  if (sc.dynamic) { const ids = workshopProps(w.props).map((p) => p.id); if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["props"], message: "prop ids must be unique" }); }
  const okPos = (v) => typeof v === "number" || ANCHORS.includes(v) || props.includes(v);
  const castIdsHere = (w.cast ?? [{ who: "hero" }]).map((c) => c.who);
  w.beats.forEach((b, i) => {
    if (b.target !== undefined && !props.includes(b.target)) ctx.addIssue({ code: "custom", path: ["beats", i, "target"], message: `scenario "${w.scenario}" has no prop ${JSON.stringify(b.target)}; its props: ${props.join(", ")}` });
    if (b.do === "walk" && b.to !== undefined && !okPos(b.to)) ctx.addIssue({ code: "custom", path: ["beats", i, "to"], message: `walk target ${JSON.stringify(b.to)} must be left|center|right, a number or a prop of "${w.scenario}": ${props.join(", ")}` });
    if (b.who !== undefined && !castIdsHere.includes(b.who) && !(b.who === "hero")) ctx.addIssue({ code: "custom", path: ["beats", i, "who"], message: `\`who\` ${JSON.stringify(b.who)} is not in this world's cast (${castIdsHere.join(", ")})` });
  });
  (w.cast ?? []).forEach((c, i) => { if (c.at !== undefined && !okPos(c.at)) ctx.addIssue({ code: "custom", path: ["cast", i, "at"], message: `cast position ${JSON.stringify(c.at)} must be left|center|right, a number or a prop of "${w.scenario}": ${props.join(", ")}` }); });
});

export const payloadSchema = z.object({
  style: closedEnum(STYLE_IDS, "style").default("pixel-snes-16bit"),
  hero: closedEnum(heroIds(), "hero").default("hoodie"),
  layout: closedEnum(LAYOUTS, "layout").default("strip"),
  flash: z.boolean().default(false),
  pixelScale: closedEnum(PIXEL_SCALES, "pixelScale").default("standard"),
  brand: z.object({ handle: z.string().min(1).max(24), follow: wordRef.optional() }).optional(),
  worlds: z.array(worldSchema).min(1, "at least one world is needed").max(8, "at most 8 worlds"),
});

export { z };
