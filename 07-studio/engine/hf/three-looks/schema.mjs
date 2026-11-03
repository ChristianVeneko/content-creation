// zod 4 schema of `spec.hf` for the three-looks format. Enums are closed and every failure names the allowed values.
import { z } from "zod";
import { STYLE_IDS } from "./styles.mjs";
import { BEAT_KINDS, PROP_ACTS, EMOTES, TRANSITIONS, MOODS, SIZES, SHOT_KINDS, MOVE_KINDS, SETTING_IDS, HERO_IDS, ANCHOR_IDS, SETTINGS, propIds, anchorIds, kindActs, settingProps } from "./catalog.mjs";

const preview = (list) => (list.length > 14 ? `${list.slice(0, 14).join(", ")}, ... (${list.length} total)` : list.join(", "));
const closedEnum = (list, what) => z.enum(list, { error: (iss) => `unknown ${what} ${JSON.stringify(iss.input)}; use one of: ${preview(list)}` });

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
  to: z.string().min(1).optional(),
  value: z.number().optional(),
  amount: z.number().min(0.4).max(2).optional(),
  symbol: closedEnum(EMOTES, "emote").optional(),
  text: z.string().min(1).max(22, "text is limited to 22 characters (`stamp` text is at most 18)").optional(),
  dur: z.number().min(0.2).max(6).optional(),
  hold: z.number().min(0.4).max(6).optional(),
});

const castEntry = z.object({
  who: z.string().min(1),
  at: z.string().min(1).optional(),
  size: closedEnum(SIZES, "size (S|M|L)").optional(),
});
const shotEntry = z.object({
  from: z.union([z.number().min(0), wordRef]).optional(),
  kind: closedEnum(SHOT_KINDS, "shot").optional(),
  move: closedEnum(MOVE_KINDS, "camera move").optional(),
  target: z.string().min(1).optional(),
});

export const worldSchema = z.object({
  setting: closedEnum(SETTING_IDS, "setting"),
  mood: closedEnum(MOODS, "mood").optional(),
  from: z.union([z.number().min(0), wordRef]).optional(),
  transition: closedEnum(TRANSITIONS, "transition").optional(),
  cast: z.array(castEntry).max(3, "at most 3 cast members per world").optional(),
  shots: z.array(shotEntry).max(12).optional(),
  beats: z.array(beatSchema).max(48, "at most 48 beats per world").default([]),
}).superRefine((w, ctx) => {
  const set = SETTINGS[w.setting]; if (!set) return;
  const props = propIds(w.setting), anchors = anchorIds(w.setting);
  const castWho = (w.cast ?? [{ who: "hero" }]).map((c) => c.who);
  const okWho = (v) => v === "hero" || HERO_IDS.includes(v);
  const add = (path, message) => ctx.addIssue({ code: "custom", path, message });
  w.beats.forEach((b, i) => {
    const need = (field, msg) => { if (b[field] === undefined) add(["beats", i, field], msg ?? `\`${b.do}\` needs \`${field}\``); };
    if (PROP_ACTS.includes(b.do)) {
      if (b.target === undefined) add(["beats", i, "target"], `\`${b.do}\` needs a \`target\` prop of "${w.setting}": ${props.join(", ")}`);
      else if (!props.includes(b.target)) add(["beats", i, "target"], `setting "${w.setting}" has no prop ${JSON.stringify(b.target)}; its props: ${props.join(", ")}`);
      else if (!kindActs(settingProps(w.setting)[b.target].kind).includes(b.do)) add(["beats", i, "do"], `\`${b.do}\` is not available on "${b.target}" (${settingProps(w.setting)[b.target].kind}); it accepts: ${kindActs(settingProps(w.setting)[b.target].kind).join(", ")}`);
    }
    if (b.do === "move") { need("to", "`move` needs `to` (an anchor or a prop id)"); if (b.to !== undefined && !anchors.includes(b.to)) add(["beats", i, "to"], `move target ${JSON.stringify(b.to)} must be one of: ${anchors.join(", ")}`); }
    if (b.do === "fill") { if (b.value === undefined || b.value < 0 || b.value > 1) add(["beats", i, "value"], "`fill` needs `value` between 0 and 1"); }
    if (b.do === "label") { need("text"); if (b.target === undefined) add(["beats", i, "target"], "`label` needs a `target` prop"); else if (!props.includes(b.target)) add(["beats", i, "target"], `setting "${w.setting}" has no prop ${JSON.stringify(b.target)}; its props: ${props.join(", ")}`); }
    if (b.do === "stamp") { need("text"); if (b.text && b.text.length > 18) add(["beats", i, "text"], "`stamp` text is at most 18 characters"); }
    if (b.do === "emote") need("symbol", `\`emote\` needs \`symbol\`: ${EMOTES.join(" ")}`);
    if (b.do === "walk") { need("to", "`walk` needs `to` (left|center|right|front|back or a prop id)"); if (b.to !== undefined && !anchors.includes(b.to)) add(["beats", i, "to"], `walk target ${JSON.stringify(b.to)} must be one of: ${anchors.join(", ")}`); }
    if (b.do === "look" && b.target !== undefined && !props.includes(b.target)) add(["beats", i, "target"], `setting "${w.setting}" has no prop ${JSON.stringify(b.target)}; its props: ${props.join(", ")}`);
    if (CAST_DO.includes(b.do) && b.who !== undefined && !okWho(b.who)) add(["beats", i, "who"], `\`who\` ${JSON.stringify(b.who)} must be "hero" or a hero id: ${HERO_IDS.join(", ")}`);
    if (CAST_DO.includes(b.do) && b.who !== undefined && b.who !== "hero" && !castWho.includes(b.who)) add(["beats", i, "who"], `\`who\` ${JSON.stringify(b.who)} is not in this world's cast (${castWho.join(", ")})`);
  });
  (w.cast ?? []).forEach((c, i) => {
    if (!okWho(c.who)) add(["cast", i, "who"], `cast member ${JSON.stringify(c.who)} must be "hero" or a hero id: ${HERO_IDS.join(", ")}`);
    if (c.at !== undefined && !anchors.includes(c.at)) add(["cast", i, "at"], `cast position ${JSON.stringify(c.at)} must be one of: ${anchors.join(", ")}`);
  });
  (w.shots ?? []).forEach((s, i) => { if (s.target !== undefined && !props.includes(s.target) && !["hero", ...ANCHOR_IDS].includes(s.target)) add(["shots", i, "target"], `shot target ${JSON.stringify(s.target)} must be "hero", an anchor or a prop of "${w.setting}": ${props.join(", ")}`); });
});
const CAST_DO = ["walk", "emote", "look"];

export const payloadSchema = z.object({
  style: closedEnum(STYLE_IDS, "style").default("clay-diorama"),
  hero: closedEnum(HERO_IDS, "hero").default("robo"),
  camera: closedEnum(["calm", "dynamic"], "camera intensity").default("dynamic"),
  worlds: z.array(worldSchema).min(1, "at least one world is needed").max(8, "at most 8 worlds"),
});
export { z };
