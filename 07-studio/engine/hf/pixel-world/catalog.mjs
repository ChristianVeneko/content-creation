// Catalog of everything the payload can name (scenarios, props, heroes, npcs, beat kinds).
// Single source of truth: the browser runtime files declare scenarios/heroes/npcs with defScenario/defHero/defNpc;
// this module evaluates those files in a vm sandbox with stubs (top level of those files only registers definitions)
// so the node side (schema, validator, prompt, docs) can never drift from what the runtime can draw.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { STYLES } from "./styles.mjs";
import { LEGACY_TOPICS } from "./topics.mjs";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNTIME_DIR = join(HERE, "runtime");

export const PROP_ACTS = ["fill", "open", "close", "light", "dim", "burst", "recolor", "coins", "chop", "stamp", "pulse"];
export const BEAT_KINDS = [
  ...PROP_ACTS,
  "hero-stamp", "x2", "shake", "flash", "radial-burst", "emote", "label",
  "pan", "push",
  "walk", "point", "react", "jump", "cheer",
  "progress", "counter", "follow",
];
export const EMOTES = ["?", "!", "heart", "star", "idea", "dots", "check", "cross", "zzz", "coin", "note"];
export const TRANSITIONS = ["slide", "tiles", "iris", "down"];
export const TIMES = ["day", "dusk", "night"];
export const COLORS = ["red", "yellow", "green", "teal", "blue", "purple", "orange", "pink", "white", "gold"];
export const SIZES = ["S", "M", "L"];
export const LAYOUTS = ["strip", "tower"];
export const ANCHORS = ["left", "center", "right"];

/** One line per beat kind, used by the prompt and the docs. */
export const BEAT_DOCS = {
  fill: "target prop: a bar/meter/tank fills to `value` (0-1)",
  open: "target prop opens (lid, door, hatch)", close: "target prop closes again",
  light: "target prop lights up / powers on", dim: "target prop goes dark",
  burst: "target prop bursts apart in two halves with particles",
  recolor: "target prop changes colour tone (optional `color` 0-5)",
  coins: "coins drop out of the target prop", chop: "blade/chop animation on the target prop",
  stamp: "a stamp presses onto the target prop", pulse: "target prop hops (emphasis)",
  "hero-stamp": "big stamped word in the middle of the screen: `text`, optional `color`, `dur`",
  x2: "floating multiplier text (`text`, default \"x2\") over `target` or the centre",
  shake: "screen shake snapped to whole pixels, `amp` 1-6 (default 3)",
  flash: "white flash (ignored unless `flash: true` at the top level; OFF by default)",
  "radial-burst": "ring of sparks from `target` (or the centre)",
  emote: "speech bubble symbol above `who` (default hero): ? ! heart star idea dots check cross zzz coin note",
  label: "chip with `text` above `target` (optional `color`, `dur`)",
  pan: "camera pans to centre `target` (worlds wider than the screen)", push: "camera pushes in on `target` (`amount` 1.1-1.5, `hold` seconds)",
  walk: "`who` walks to `to` (left|center|right|prop id)", point: "`who` points at `target`",
  react: "`who` reacts with `symbol` (? ! heart...)", jump: "`who` jumps", cheer: "`who` cheers with both arms up",
  progress: "HUD progress bar to `value` (0-1), optional `label`", counter: "HUD counter to `value`, optional `label`",
  follow: "brand pill: fake follow click lands on this word",
};

let cache = null;
// Evaluates runtime files in one vm context with stubs (their top level only registers definitions). Returns the registries.
function evalFiles(files) {
  const defs = { scenarios: [], heroes: [], npcs: [] };
  const M = new Proxy({}, { get: (_, k) => (k === "ink" ? "#000000" : ["#000000", "#000000", "#000000", "#000000", "#000000"]) });
  const ctx = vm.createContext({
    M, INK: "#000000", console, hs: () => 0,
    defScenario: (d) => defs.scenarios.push(d), defHero: (d) => defs.heroes.push(d), defNpc: (d) => defs.npcs.push(d),
  });
  for (const f of files) vm.runInContext(readFileSync(join(RUNTIME_DIR, f), "utf8"), ctx, { filename: f });
  defs.PL = files.includes("props.js") ? vm.runInContext("PL", ctx) : {};
  return defs;
}

export function loadCatalog() {
  if (cache) return cache;
  const scenFiles = readdirSync(RUNTIME_DIR).filter((f) => /^scenarios-.*\.js$/.test(f)).sort();
  const sc = evalFiles(["props.js", ...scenFiles]);
  const cast = evalFiles(["cast.js"]);
  const scenarios = sc.scenarios.map((d) => {
    const legacy = LEGACY_TOPICS[d.id] ?? {};
    const topics = d.topics ?? legacy.topics ?? [], avoid = d.avoid ?? legacy.avoid ?? [];
    return {
      id: d.id, name: d.name, about: d.about, keywords: [...(d.keywords ?? []), ...topics], topics, avoid, dynamic: !!d.dynamic, layers: ["far", "back", "mid", "fore"].filter((k) => typeof d[k] === "function").length, w: d.w ?? 270, time: d.time ?? "day",
      props: Object.entries(d.props ?? {}).map(([id, p]) => ({ id, x: p.x, y: p.y, w: p.w, h: p.h, about: p.about ?? id, fills: !!p.fills, chops: !!p.chops, stamps: !!p.stamps, opens: !!p.opens })),
    };
  });
  const ids = new Set();
  for (const s of scenarios) { if (ids.has(s.id)) throw new Error(`pixel-world: duplicate scenario id "${s.id}"`); ids.add(s.id); }
  const propLib = Object.entries(sc.PL).map(([kind, d]) => ({ kind, about: d.about, row: d.row, w: d.w, h: d.h, fills: !!d.fills, opens: !!d.opens }));
  cache = {
    scenarios, propLib,
    heroes: cast.heroes.map((h) => ({ id: h.id, name: h.name, about: h.about })),
    npcs: cast.npcs.map((n) => ({ id: n.id, name: n.name, about: n.about })),
    styles: STYLES,
  };
  return cache;
}
export const scenarioIds = () => loadCatalog().scenarios.map((s) => s.id);
export const getScenario = (id) => loadCatalog().scenarios.find((s) => s.id === id);
export const heroIds = () => loadCatalog().heroes.map((h) => h.id);
export const npcIds = () => loadCatalog().npcs.map((n) => n.id);
export const castIds = () => ["hero", ...heroIds(), ...npcIds()];

/** Runtime sources in load order (the data prelude is prepended by compose). */
export function runtimeFiles() {
  const scen = readdirSync(RUNTIME_DIR).filter((f) => /^scenarios-.*\.js$/.test(f)).sort();
  return ["core.js", "contrast.js", "fx.js", "kit.js", "hud.js", "floor.js", "cast.js", "props.js", ...scen, "beats.js", "main.js"];
}

export const propKinds = () => loadCatalog().propLib.map((p) => p.kind);
export const WORKSHOP_THEMES = ["bench", "sky", "grid", "night-city"];
export const WORKSHOP_ID = "workshop-stage";
export const WORKSHOP_MAX_PROPS = 8;
/** Stable ids of a workshop-stage prop list: explicit `id`, else the kind, with -2, -3 suffixes for repeats. */
export function workshopProps(list) {
  const seen = {};
  return (Array.isArray(list) ? list : []).filter((p) => p && typeof p === "object" && typeof p.kind === "string").map((p) => {
    const base = typeof p.id === "string" && p.id ? p.id : p.kind;
    seen[base] = (seen[base] ?? 0) + 1;
    return { ...p, id: seen[base] > 1 ? `${base}-${seen[base]}` : base };
  });
}
/** Props a beat may target in a world: the scenario's own props, or the payload's props for workshop-stage. */
export function worldProps(w) {
  const sc = getScenario(w?.scenario);
  if (!sc) return [];
  if (sc.dynamic) { const lib = Object.fromEntries(loadCatalog().propLib.map((p) => [p.kind, p])); return workshopProps(w.props).map((p) => ({ id: p.id, about: `${p.kind}: ${lib[p.kind]?.about ?? p.kind}`, kind: p.kind })); }
  return sc.props;
}
