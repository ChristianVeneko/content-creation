// zod 4 schema of `spec.hf` for the three-looks format. Enums are closed and every failure names the allowed values.
// Every model is built from scratch (builders or hand-written parts); stock/GLB models are rejected unless `stock: true`.
import { z } from "zod";
import { STYLE_IDS } from "./styles.mjs";
import { BEAT_KINDS, PROP_ACTS, EMOTES, TRANSITIONS, MOODS, SHOT_KINDS, MOVE_KINDS, STOCK_IDS, ANCHOR_IDS, CORNER_NAMES, objectActs } from "./catalog.mjs";
import { SET_IDS } from "./sets.mjs";
import { BUILDER_KINDS, CHARACTER_DESIGNS, CHARACTER_HATS, CHARACTER_EXPRESSIONS } from "./builders/index.mjs";
import { partSchema, worldPartSchema, validateParts, momentSchema, MAX_PARTS, MAX_WORLD_PARTS, PART_ROLES, MOTION_PRESETS } from "./parts.mjs";
import { expandObject } from "./objects.mjs";

const preview = (list) => (list.length > 14 ? `${list.slice(0, 14).join(", ")}, ... (${list.length} total)` : list.join(", "));
const closedEnum = (list, what) => z.enum(list, { error: (iss) => `unknown ${what} ${JSON.stringify(iss.input)}; use one of: ${preview(list)}` });
const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color like #1A2B3C");
const ID = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,23}$/, "ids are lowercase letters, digits, - or _ (at most 24)");
const at2 = z.tuple([z.number().min(-4.1).max(4.1), z.number().min(-3.4).max(3.4)]);
const place = z.union([z.string().min(1), at2]);

export const wordRef = z.object({
  word: z.string().min(1, "word must not be empty").optional(),
  n: z.number().int().min(1, "n is 1-based (1 = first occurrence)").optional(),
  at: z.number().min(0, "at is seconds from the start of the video").optional(),
  offset: z.number().min(-2).max(2).optional(),
}).refine((v) => v.word !== undefined || v.at !== undefined, { message: "`on` needs a `word` (spoken word, optional `n`) or `at` (seconds)" });

export const beatSchema = z.object({
  on: wordRef,
  do: closedEnum(BEAT_KINDS, "beat kind"),
  target: z.string().min(1).optional(),
  who: z.string().min(1).optional(),
  to: place.optional(),
  value: z.number().optional(),
  amount: z.number().min(0.4).max(2).optional(),
  symbol: closedEnum(EMOTES, "emote").optional(),
  text: z.string().min(1).max(22, "text is limited to 22 characters (`stamp` text is at most 18)").optional(),
  dur: z.number().min(0.2).max(6).optional(),
  hold: z.number().min(0.4).max(6).optional(),
});

const characterFields = {
  design: closedEnum(CHARACTER_DESIGNS, "character design").optional(),
  hat: closedEnum(CHARACTER_HATS, "hat").optional(),
  expression: closedEnum(CHARACTER_EXPRESSIONS, "expression").optional(),
  skin: hex.optional(), hair: hex.optional(),
  colors: z.record(z.enum(PART_ROLES), hex).optional(),
  seed: z.number().int().min(0).max(9999).optional(),
  scale: z.number().min(0.5).max(1.5).optional(),
};
export const heroSchema = z.object(characterFields).strict();
const castEntry = z.object({ who: ID.optional(), ...characterFields, at: place.optional() }).strict();

export const objectSchema = z.object({
  id: ID,
  label: z.string().min(1).max(22).optional(),
  build: z.string().min(1).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  parts: z.array(partSchema).min(1).max(MAX_PARTS, `at most ${MAX_PARTS} parts per object`).optional(),
  colors: z.record(z.enum(PART_ROLES), hex).optional(),
  seed: z.number().int().min(0).max(9999).optional(),
  motion: z.array(z.union([z.string().min(1), z.object({ type: z.string().min(1), at: momentSchema.optional(), until: momentSchema.optional(), amp: z.number().min(0).max(720).optional(), speed: z.number().min(0.05).max(8).optional(), parts: z.array(z.string()).max(12).optional(), axis: z.enum(["x", "y", "z"]).optional(), lift: z.number().optional() }).strict()])).max(6).optional(),
  keys: z.array(z.object({ at: momentSchema, pos: z.tuple([z.number(), z.number(), z.number()]).optional(), rot: z.tuple([z.number(), z.number(), z.number()]).optional(), scale: z.union([z.number().min(0.01).max(10), z.tuple([z.number(), z.number(), z.number()])]).optional(), opacity: z.number().min(0).max(1).optional(), ease: z.string().optional() }).strict()).min(1).max(12).optional(),
  at: place.optional(),
  corner: closedEnum(CORNER_NAMES, "corner").optional(),
  rot: z.number().min(-360).max(360).optional(),
  scale: z.number().min(0.3).max(3).optional(),
  hidden: z.boolean().optional(),
  model: z.string().min(1).optional(),
}).strict();

export const worldShape = z.object({
  set: closedEnum(SET_IDS, "set"),
  mood: closedEnum(MOODS, "mood").optional(),
  from: z.union([z.number().min(0), wordRef]).optional(),
  transition: closedEnum(TRANSITIONS, "transition").optional(),
  cast: z.array(castEntry).max(3, "at most 3 cast members per world").optional(),
  objects: z.array(objectSchema).max(14, "at most 14 objects per world").default([]),
  parts: z.array(worldPartSchema).max(MAX_WORLD_PARTS, `at most ${MAX_WORLD_PARTS} world parts`).optional(),
  shots: z.array(z.object({
    from: z.union([z.number().min(0), wordRef]).optional(), kind: closedEnum(SHOT_KINDS, "shot").optional(), move: closedEnum(MOVE_KINDS, "camera move").optional(), target: z.string().min(1).optional(),
  })).max(14).optional(),
  beats: z.array(beatSchema).max(60, "at most 60 beats per world").default([]),
});
export const worldSchema = worldShape.superRefine((w, ctx) => checkWorld(w, ctx, false));

const CAST_DO = ["walk", "emote", "look"];
function checkWorld(w, ctx, stock) {
  const add = (path, message) => ctx.addIssue({ code: "custom", path, message });
  const ids = new Map(), expanded = new Map();
  w.objects.forEach((o, i) => {
    if (ids.has(o.id)) add(["objects", i, "id"], `duplicate object id "${o.id}"`); ids.set(o.id, i);
    const isStock = o.model !== undefined || (o.build !== undefined && !BUILDER_KINDS.includes(o.build) && STOCK_IDS.includes(o.build));
    if (isStock) {
      if (!stock) add(["objects", i, o.model !== undefined ? "model" : "build"], `stock models are off: object "${o.id}" uses ${JSON.stringify(o.model ?? o.build)}; build it from scratch (\`build\` one of ${preview(BUILDER_KINDS)}, or hand-written \`parts\`) and set \`stock: true\` only when the user asked for stock models`);
      else if (!STOCK_IDS.includes(o.model ?? o.build)) add(["objects", i, "model"], `unknown stock model ${JSON.stringify(o.model ?? o.build)}; use one of: ${preview(STOCK_IDS)}`);
      return;
    }
    if (o.build === undefined && !o.parts) { add(["objects", i], `object "${o.id}" needs \`build\` (a builder kind: ${preview(BUILDER_KINDS)}) or \`parts\` (hand-written custom parts)`); return; }
    if (o.build !== undefined && !BUILDER_KINDS.includes(o.build)) { add(["objects", i, "build"], `unknown builder ${JSON.stringify(o.build)}; use one of: ${preview(BUILDER_KINDS)} (characters go in \`cast\`)`); return; }
    if (o.build === "character") { add(["objects", i, "build"], "characters go in `cast` (and `hero`), not in `objects`"); return; }
    let ex; try { ex = expandObject(o); } catch (e) { add(["objects", i, "params"], String(e.message)); return; }
    expanded.set(o.id, ex);
    for (const iss of validateParts(ex.parts)) add(["objects", i, "parts", ...iss.path], iss.message);
    for (const [mi, m] of (o.motion ?? []).entries()) { const t = typeof m === "string" ? m : m.type; if (!MOTION_PRESETS.includes(t)) add(["objects", i, "motion", mi], `unknown motion "${t}"; use one of: ${MOTION_PRESETS.join(", ")}`); for (const pid of m.parts ?? []) if (!ex.parts.some((p) => p.id === pid)) add(["objects", i, "motion", mi, "parts"], `unknown part "${pid}" in motion "${t}"`); }
  });
  if (w.parts) for (const iss of validateParts(w.parts, { max: MAX_WORLD_PARTS, what: "world parts" })) add(["parts", ...iss.path], iss.message);
  const castIds = (w.cast ?? [{ who: "hero" }]).map((c, k) => c.who ?? (k === 0 ? "hero" : `cast${k}`));
  const objIds = [...ids.keys()], targets = [...objIds, ...castIds];
  const spots = [...ANCHOR_IDS, ...objIds, ...castIds];
  const okSpot = (v) => Array.isArray(v) || spots.includes(v);
  const spotMsg = (v) => `${JSON.stringify(v)} must be [x, z], an anchor or an object id: ${preview(spots)}`;
  w.beats.forEach((b, i) => {
    const need = (field, msg) => { if (b[field] === undefined) add(["beats", i, field], msg ?? `\`${b.do}\` needs \`${field}\``); };
    if (PROP_ACTS.includes(b.do)) {
      if (b.target === undefined) add(["beats", i, "target"], `\`${b.do}\` needs a \`target\` object of this world: ${preview(objIds)}`);
      else if (!objIds.includes(b.target)) add(["beats", i, "target"], `this world has no object ${JSON.stringify(b.target)}; its objects: ${preview(objIds) || "(none: add objects)"}`);
      else if (expanded.has(b.target) && !objectActs(expanded.get(b.target).parts).includes(b.do)) add(["beats", i, "do"], `\`${b.do}\` is not available on "${b.target}"; it accepts: ${objectActs(expanded.get(b.target).parts).join(", ")}`);
    }
    if (b.do === "move") { need("to", "`move` needs `to` (an anchor, an object id or [x, z])"); if (b.to !== undefined && !okSpot(b.to)) add(["beats", i, "to"], `move target ${spotMsg(b.to)}`); }
    if (b.do === "fill") { if (b.value === undefined || b.value < 0 || b.value > 1) add(["beats", i, "value"], "`fill` needs `value` between 0 and 1"); }
    if (b.do === "label") { need("text"); if (b.target === undefined) add(["beats", i, "target"], "`label` needs a `target` object or cast id"); else if (!targets.includes(b.target)) add(["beats", i, "target"], `this world has no object ${JSON.stringify(b.target)}; its objects: ${preview(targets)}`); }
    if (b.do === "stamp") { need("text"); if (b.text && b.text.length > 18) add(["beats", i, "text"], "`stamp` text is at most 18 characters"); }
    if (b.do === "emote") need("symbol", `\`emote\` needs \`symbol\`: ${EMOTES.join(" ")}`);
    if (b.do === "walk") { need("to", "`walk` needs `to` ([x, z], an anchor or an object id)"); if (b.to !== undefined && !okSpot(b.to)) add(["beats", i, "to"], `walk target ${spotMsg(b.to)}`); }
    if (b.do === "look" && b.target !== undefined && !targets.includes(b.target)) add(["beats", i, "target"], `this world has no object ${JSON.stringify(b.target)}; its objects: ${preview(targets)}`);
    if (CAST_DO.includes(b.do) && b.who !== undefined && !castIds.includes(b.who)) add(["beats", i, "who"], `\`who\` ${JSON.stringify(b.who)} is not in this world's cast (${castIds.join(", ")})`);
  });
  (w.cast ?? []).forEach((c, i) => { if (c.at !== undefined && !okSpot(c.at)) add(["cast", i, "at"], `cast position ${spotMsg(c.at)}`); });
  (w.shots ?? []).forEach((s, i) => { if (s.target !== undefined && !targets.includes(s.target) && !ANCHOR_IDS.includes(s.target)) add(["shots", i, "target"], `shot target ${JSON.stringify(s.target)} must be an object, a cast id or an anchor: ${preview([...targets, ...ANCHOR_IDS])}`); });
}

export const payloadSchema = z.object({
  style: closedEnum(STYLE_IDS, "style").default("clay-diorama"),
  stock: z.boolean().optional(),
  hero: z.union([heroSchema, z.string()], { error: () => "hero is a character spec { design, hat, expression, skin, hair, colors, seed, scale }" }).default({}),
  camera: closedEnum(["calm", "dynamic"], "camera intensity").default("dynamic"),
  worlds: z.array(worldShape).min(1, "at least one world is needed").max(8, "at most 8 worlds"),
}).superRefine((p, ctx) => {
  const stock = p.stock === true;
  if (typeof p.hero === "string") {
    if (!stock) ctx.addIssue({ code: "custom", path: ["hero"], message: `hero ${JSON.stringify(p.hero)} is a stock model; heroes are built from scratch: use hero { design: ${CHARACTER_DESIGNS.join("|")}, hat, expression, skin, hair } (stock models need \`stock: true\`, only when the user asked)` });
    else if (!STOCK_IDS.includes(p.hero)) ctx.addIssue({ code: "custom", path: ["hero"], message: `unknown stock hero ${JSON.stringify(p.hero)}; use one of: ${preview(STOCK_IDS)}` });
  }
  p.worlds.forEach((w, wi) => {
    const sub = { addIssue: (iss) => ctx.addIssue({ ...iss, path: ["worlds", wi, ...(iss.path ?? [])] }) };
    checkWorld(w, sub, stock);
  });
});
export { z, MAX_PARTS, MAX_WORLD_PARTS };
