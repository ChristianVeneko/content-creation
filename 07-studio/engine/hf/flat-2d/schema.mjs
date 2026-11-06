// The flat-2d payload (spec.hf). Closed enums everywhere an LLM could invent a value, strict objects, and a validator
// that reports precise paths (scenes.0.beats.2.target ...). `normalize` (normalize.mjs) repairs common slips first.
import { z } from "zod";
import { STYLE_IDS } from "./styles.mjs";
import { SETTING_IDS, settingPropNames } from "./settings/index.mjs";
import { KIT_KINDS, KITS, COMMON_FIELDS } from "./kit/index.mjs";
import { DESIGN_IDS } from "./rig.mjs";
import { ICON_NAMES } from "./icons.mjs";
import { AT_IDS, CAST_AT_IDS, ROLES } from "./layout.mjs";

export { STYLE_IDS, SETTING_IDS, KIT_KINDS, DESIGN_IDS, ICON_NAMES };
export const MODES = ["single", "multi"];
export const SIZES = ["S", "M", "L"];
export const FACINGS = ["front", "left", "right"];
export const TRANSITIONS = ["slide", "whip", "up", "wipe", "iris"];
export const SHOW_HOW = ["pop", "drop", "fade", "slide-left", "slide-right", "slide-up", "slide-down"];
export const HIDE_HOW = ["pop", "fade", "slide-down"];
export const CLIPS = ["idle", "talk", "walk", "run", "point", "react", "celebrate", "shrug", "wave", "pull", "click", "think", "turn", "shades"];
export const CAMERA_MOVES = ["push", "zoom-out", "recap", "release"];
export const CHART_TYPES = ["line", "bars", "donut"];
export const PAGES = ["landing", "dashboard", "shop", "article", "login", "search", "blank"];
export const CHIP_SIDES = ["top", "bottom", "left", "right"];

/** Required and optional params per beat kind. */
export const BEAT_SPEC = {
  show: { req: ["target"], opt: ["how"], about: "make a prop appear (how: pop, drop, fade, slide-left/right/up/down)" },
  hide: { req: ["target"], opt: ["how"], about: "make a prop disappear" },
  type: { req: ["target", "text"], opt: [], about: "type text letter by letter into a browser URL bar or a chat input" },
  message: { req: ["target"], opt: ["n"], about: "reveal the next chat/phone message (typing dots first); n picks message number n" },
  count: { req: ["target"], opt: ["item", "value"], about: "stats panel numbers roll up (item = tile number, default all)" },
  draw: { req: ["target"], opt: [], about: "chart draws itself" },
  drop: { req: ["target"], opt: ["n"], about: "notification toast drops in (n = toast number, default next)" },
  click: { req: ["target"], opt: [], about: "the cursor glides to the prop and clicks it" },
  scan: { req: ["target", "row"], opt: [], about: "list highlight scans quickly to row n" },
  pick: { req: ["target", "row"], opt: [], about: "list row n is chosen (highlight stays, row pops)" },
  send: { req: ["from", "to"], opt: ["text", "icon", "role"], about: "a packet with a label travels from one prop to another along a line that draws itself" },
  light: { req: ["target"], opt: [], about: "rack or router LEDs switch on in sequence (green)" },
  mark: { req: ["target", "day"], opt: [], about: "calendar day gets circled" },
  punch: { req: ["target"], opt: ["n"], about: "stamp card receives a stamp (n = slot, default next)" },
  fill: { req: ["target"], opt: ["item", "value"], about: "progress bar fills up (value 0-100 overrides the declared one)" },
  toggle: { req: ["target"], opt: [], about: "card swaps icon to icon2 (lock opens/closes, cross becomes check)" },
  lever: { req: ["target"], opt: [], about: "rack lever is pulled down and released" },
  grow: { req: ["target"], opt: ["scale"], about: "prop swells to scale (1.1-2.5) and settles" },
  recolor: { req: ["target", "role"], opt: [], about: "prop flashes to a semantic color (accent, good, bad, warn...)" },
  shake: { req: ["target"], opt: [], about: "prop shakes (impact, error)" },
  bounce: { req: ["target"], opt: [], about: "prop hops once" },
  pulse: { req: ["target"], opt: ["role"], about: "a ring pulses around the prop (look here)" },
  emote: { req: ["target", "icon"], opt: [], about: "a bubble with an icon pops above a character (target = character id)" },
  chip: { req: ["target", "text"], opt: ["role", "side"], about: "a short label chip pops next to a prop or character" },
  hero: { req: ["text"], opt: ["role"], about: "stamps a hero word in the middle of the stage (1-3 words, max once per scene)" },
  burst: { req: ["target"], opt: ["role"], about: "confetti burst from the prop (celebration, success)" },
  act: { req: ["who", "clip"], opt: ["to", "dir"], about: "a character performs a clip: idle talk walk run point react celebrate shrug wave pull click think turn shades (to = prop or slot name to walk/point to)" },
  camera: { req: ["move"], opt: ["target", "zoom"], about: "camera move: push (into target), zoom-out, recap (whole world), release (back to the scene)" },
};
export const BEAT_KINDS = Object.keys(BEAT_SPEC);
/** Which replica kinds a kind-specific beat works on. */
export const BEAT_TARGET_KIND = { type: ["browser", "chat"], message: ["chat", "phone"], count: ["stats"], draw: ["chart"], drop: ["notification"], scan: ["list"], pick: ["list"], light: ["rack", "router"], mark: ["calendar"], punch: ["stamp-card"], fill: ["progress"], toggle: ["card"], lever: ["rack"] };

const enumOf = (what, values) => z.enum(values, { error: (iss) => `unknown ${what} "${iss.input}"; use one of: ${values.join(", ")}` });
const num = (min, max) => z.number().min(min).max(max);

export const wordRef = z.strictObject({
  word: z.string().min(1).max(40).optional(),
  n: z.number().int().min(1).max(30).optional(),
  at: num(0, 600).optional(),
  offset: num(-2, 3).optional(),
}).refine((r) => r.word !== undefined || r.at !== undefined, { error: "on needs a spoken word ({ word, n? }) or a time in seconds ({ at })" });

const message = z.strictObject({ from: enumOf("sender", ["me", "them"]), text: z.string().min(1).max(90) });
const item = z.strictObject({
  label: z.string().max(40).optional(), value: z.number().optional(), prefix: z.string().max(6).optional(), suffix: z.string().max(8).optional(),
  role: enumOf("role", ROLES).optional(), title: z.string().max(40).optional(), text: z.string().max(60).optional(), icon: enumOf("icon", ICON_NAMES).optional(),
});
const row = z.union([z.string().min(1).max(40), z.strictObject({ text: z.string().min(1).max(40), tag: z.string().max(14).optional(), icon: enumOf("icon", ICON_NAMES).optional() })]);

export const propSchema = z.strictObject({
  id: z.string().min(1).max(32),
  kind: enumOf("replica kind", KIT_KINDS),
  at: enumOf("slot", AT_IDS).optional(),
  size: enumOf("size", ["s", "m", "l"]).optional(),
  dx: num(-400, 400).optional(), dy: num(-400, 400).optional(),
  hidden: z.boolean().optional(),
  role: enumOf("role", ROLES).optional(),
  title: z.string().max(40).optional(), sub: z.string().max(50).optional(), heading: z.string().max(24).optional(),
  url: z.string().max(36).optional(), page: enumOf("page", PAGES).optional(),
  messages: z.array(message).max(6).optional(), items: z.array(item).max(4).optional(), rows: z.array(row).max(12).optional(),
  chartType: enumOf("chart type", CHART_TYPES).optional(), data: z.array(z.number()).min(2).max(8).optional(),
  icon: enumOf("icon", ICON_NAMES).optional(), icon2: enumOf("icon", ICON_NAMES).optional(),
  units: z.number().int().min(3).max(7).optional(), slots: z.number().int().min(3).max(10).optional(),
});

const beatSchema = z.strictObject({
  on: wordRef,
  do: enumOf("beat kind", BEAT_KINDS),
  target: z.string().max(40).optional(), from: z.string().max(40).optional(), to: z.string().max(40).optional(),
  who: z.string().max(32).optional(), clip: enumOf("clip", CLIPS).optional(), dir: enumOf("direction", ["left", "right"]).optional(),
  text: z.string().max(60).optional(), how: enumOf("how", [...new Set([...SHOW_HOW, ...HIDE_HOW])]).optional(),
  n: z.number().int().min(1).max(10).optional(), item: z.number().int().min(1).max(6).optional(), row: z.number().int().min(1).max(12).optional(), day: z.number().int().min(1).max(31).optional(),
  value: z.number().optional(), scale: num(1.05, 3).optional(), icon: enumOf("icon", ICON_NAMES).optional(),
  role: enumOf("role", ROLES).optional(), side: enumOf("side", CHIP_SIDES).optional(),
  move: enumOf("camera move", CAMERA_MOVES).optional(), zoom: num(0.3, 2.4).optional(),
});

const sceneCast = z.strictObject({ who: z.string().min(1).max(32), at: enumOf("slot", CAST_AT_IDS).optional(), facing: enumOf("facing", FACINGS).optional(), dx: num(-300, 300).optional() });
export const sceneSchema = z.strictObject({
  id: z.string().min(1).max(32).optional(),
  setting: enumOf("setting", SETTING_IDS),
  label: z.string().max(24).optional(),
  glow: enumOf("role", ROLES).optional(),
  enter: wordRef.optional(),
  transition: enumOf("transition", TRANSITIONS).optional(),
  props: z.array(propSchema).max(6).default([]),
  cast: z.array(sceneCast).max(3).default([]),
  beats: z.array(beatSchema).max(22).default([]),
});

export const castSchema = z.strictObject({ id: z.string().min(1).max(32), design: enumOf("design", DESIGN_IDS), size: enumOf("size", SIZES).optional(), name: z.string().max(20).optional() });

export const payloadSchema = z.strictObject({
  style: enumOf("style", STYLE_IDS),
  cast: z.array(castSchema).max(4).optional(),
  scenes: z.array(sceneSchema).min(1, "at least one scene is required").max(12),
  recap: z.boolean().optional(),
}).superRefine((p, ctx) => {
  const add = (path, message) => ctx.addIssue({ code: "custom", path, message });
  const seen = new Set();
  p.scenes.forEach((s, i) => { if (s.id) { if (seen.has(s.id)) add(["scenes", i, "id"], `duplicate scene id "${s.id}"`); seen.add(s.id); } });
  const castIds = new Set([...(p.cast ?? []).map((c) => c.id), ...DESIGN_IDS]);
  const settingProps = settingPropNames();
  p.scenes.forEach((s, si) => {
    const base = ["scenes", si];
    const propById = new Map();
    s.props.forEach((pr, pi) => {
      if (propById.has(pr.id)) add([...base, "props", pi, "id"], `duplicate prop id "${pr.id}" in scene ${si}`);
      propById.set(pr.id, pr);
      const allowed = new Set([...COMMON_FIELDS, ...(KITS[pr.kind]?.fields ?? [])]);
      for (const k of Object.keys(pr)) if (!allowed.has(k)) add([...base, "props", pi, k], `"${k}" is not used by a "${pr.kind}" replica; its fields: ${[...allowed].join(", ")}`);
    });
    s.cast.forEach((c, ci) => { if (!castIds.has(c.who)) add([...base, "cast", ci, "who"], `unknown character "${c.who}"; declare it in cast or use a design: ${DESIGN_IDS.join(", ")}`); });
    const sceneCastIds = new Set(s.cast.map((c) => c.who));
    const targets = new Set([...propById.keys(), ...sceneCastIds, ...(settingProps[s.setting] ?? []), "cursor"]);
    const nameList = () => [...targets].filter((t) => t !== "cursor").join(", ");
    s.beats.forEach((b, bi) => {
      const bp = [...base, "beats", bi];
      const spec = BEAT_SPEC[b.do];
      if (!spec) return;
      for (const k of spec.req) if (b[k] === undefined) add([...bp, k], `beat "${b.do}" needs "${k}"`);
      const allowed = new Set(["on", "do", ...spec.req, ...spec.opt]);
      for (const k of Object.keys(b)) if (!allowed.has(k)) add([...bp, k], `"${k}" is not used by beat "${b.do}" (it takes: ${[...allowed].join(", ")})`);
      for (const k of ["target", "from", "to"]) {
        if (b[k] !== undefined && !(b.do === "act" && k === "to") && !targets.has(b[k])) add([...bp, k], `${k} "${b[k]}" is not in scene ${si}; available: ${nameList()}`);
      }
      if (b.do === "act" && b.who !== undefined && !sceneCastIds.has(b.who)) add([...bp, "who"], `character "${b.who}" is not in scene ${si}'s cast (${[...sceneCastIds].join(", ") || "empty"})`);
      if (b.do === "emote" && b.target !== undefined && !sceneCastIds.has(b.target)) add([...bp, "target"], `emote target must be a character of scene ${si}: ${[...sceneCastIds].join(", ") || "empty"}`);
      const need = BEAT_TARGET_KIND[b.do];
      if (need && b.target && propById.has(b.target) && !need.includes(propById.get(b.target).kind)) add([...bp, "target"], `beat "${b.do}" works on ${need.join("/")} replicas, but "${b.target}" is a ${propById.get(b.target).kind}`);
      if (need && b.target && !propById.has(b.target) && !["light", "lever"].includes(b.do)) add([...bp, "target"], `beat "${b.do}" needs a ${need.join("/")} replica declared in props; "${b.target}" is not one`);
    });
    if (s.beats.filter((b) => b.do === "hero").length > 1) add([...base, "beats"], `scene ${si} has more than one hero stamp; keep one per scene`);
  });
});
