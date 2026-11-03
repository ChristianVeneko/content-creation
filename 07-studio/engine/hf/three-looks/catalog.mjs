// Catalog of the three-looks format: beat kinds, shots, moves, moods and the (opt-in) stock model list.
// Models are NOT here: every model is built from scratch in code (parts.mjs, builders/, sets.mjs). The only stock content is the
// list below, reachable only with `stock: true` in the payload (the LLM must not use it unless the user asked for stock models).
// Units: 1 unit is about one metre; characters are about 1.9 tall. Axes: x right, y up, z toward the camera.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PART_SHAPES, PART_ROLES, MOTION_PRESETS } from "./parts.mjs";
import { SET_IDS, SETS, GLOBAL_ANCHORS, ANCHOR_IDS } from "./sets.mjs";
import { BUILDERS, BUILDER_KINDS, CHARACTER_DESIGNS, CHARACTER_HATS, CHARACTER_EXPRESSIONS } from "./builders/index.mjs";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNTIME_DIR = join(HERE, "runtime");
export const ASSETS_ROOT = join(HERE, "..", "..", "..", "..", "03-assets");
/** Runtime files in load order. `stock.js` is appended only when a payload sets `stock: true`. */
export const RUNTIME_FILES = ["core.js", "kit.js", "parts.js", "rig.js", "world.js", "camera.js", "post.js", "overlay.js", "main.js"];
export const STOCK_RUNTIME_FILE = "stock.js";
export const runtimeFiles = (stock = false) => (stock ? [...RUNTIME_FILES.slice(0, 2), STOCK_RUNTIME_FILE, ...RUNTIME_FILES.slice(2)] : RUNTIME_FILES);
export const FONT_FILES = ["Baloo2-Variable.ttf"];

/** Opt-in stock models (GLB, CC0, under 03-assets/3d). Static: they take pop-in/grow/shrink/pulse/shake/move/spin/light-up/heat, no skeletal clips. */
export const STOCK_MODELS = {
  lamp: { file: "models/lamp-table.glb", h: 1.5 }, books: { file: "models/books.glb", h: 0.4 }, plant: { file: "models/plant-small.glb", h: 1.1 },
  chair: { file: "models/chair-desk.glb", h: 1.5 }, apple: { file: "models/food-apple-01.glb", h: 0.5 }, taxi: { file: "models/car-taxi.glb", h: 1.1 },
  sedan: { file: "models/car-sedan.glb", h: 1.0 }, truck: { file: "models/car-truck.glb", h: 1.5 }, barrier: { file: "models/construction-barrier.glb", h: 1.0 },
  "street-lamp": { file: "models/street-light.glb", h: 3.4 }, megaphone: { file: "models/megaphone-01.glb", h: 0.7 },
  "building-a": { file: "models/city-building-a.glb", h: 3.6 }, "tower-a": { file: "models/city-building-skyscraper-a.glb", h: 5.4 },
  robo: { file: "hf-models/robot-expressive.glb", h: 1.8 }, alex: { file: "models/character-a.glb", h: 1.8 }, dani: { file: "models/character-d.glb", h: 1.8 }, kiko: { file: "models/character-k.glb", h: 1.8 },
};
export const STOCK_IDS = Object.keys(STOCK_MODELS);

/** Beat kinds. `do` values grouped by who they act on. */
export const PROP_ACTS = ["pop-in", "pop-out", "grow", "shrink", "pulse", "shake", "light-up", "dim", "burst", "move", "spin", "open", "close", "fill", "heat", "cool", "explode", "assemble"];
export const CAST_ACTS = ["walk", "emote", "look"];
export const TEXT_ACTS = ["label", "stamp"];
export const BEAT_KINDS = [...PROP_ACTS, ...CAST_ACTS, ...TEXT_ACTS];
export const BEAT_DOCS = {
  "pop-in": "target appears with a springy pop (objects marked `hidden` start invisible)",
  "pop-out": "target shrinks away",
  grow: "target swells and stays bigger (`amount` 1.1-2, default 1.35)",
  shrink: "target shrinks and stays smaller (`amount` 0.4-0.95, default 0.7)",
  pulse: "quick squash-and-stretch bump (a heartbeat)",
  shake: "target trembles for `dur` seconds (panic, overload)",
  "light-up": "lit parts glow brighter and stay lit",
  dim: "lit parts go dark",
  burst: "burst of coloured blobs (sparks, steam, confetti) from the target",
  move: "target travels to `to` (anchor, object id or [x, z]); other objects hop",
  spin: "target (or its `spin` parts) turns for `dur` seconds",
  open: "door, lid, window or valve opens (objects with an `open` state)",
  close: "closes what `open` opened",
  fill: "sets the level `value` 0-1 (objects with a `fill` state: battery, bars, tank, LEDs)",
  heat: "target warms up: red tint and smoke",
  cool: "target cools down again",
  explode: "parts fly apart along their direction from the centre and stay (exploded view)",
  assemble: "parts fly back together",
  walk: "`who` walks to `to` (anchor, object id or [x, z])",
  emote: "`who` plays `symbol`: wave yes no thumbs-up jump dance faint sit stand punch",
  look: "`who` turns to face `target` (an object id) or the camera when `target` is omitted",
  label: "name tag with a leader line to `target` (`text`, 1-3 words, at most 22 characters)",
  stamp: "big word (`text`, at most 18 characters) for about 1.4 s, placed away from the hero and the target",
};
/** Acts that need a part with a matching named state on the target. */
export const STATE_ACT = { open: "open", close: "open", fill: "fill" };
export const EMOTES = ["wave", "yes", "no", "thumbs-up", "jump", "dance", "faint", "sit", "stand", "punch"];
export const EMOTE_HOLD = { wave: 1.6, yes: 1.2, no: 1.2, "thumbs-up": 1.5, jump: 1.0, dance: 2.4, faint: 2.5, sit: 3.0, stand: 1.0, punch: 1.0 };
export const TRANSITIONS = ["iris", "slide", "drop", "pop"];
export const MOODS = ["warm", "cool", "night", "alert"];
export const MOOD_DOCS = { warm: "golden studio light (default)", cool: "blue-teal daylight, calm", night: "dark blue with a warm glow, late-night work", alert: "red-orange tension for failures and overheating" };
export const CAMERA_MODES = ["calm", "dynamic"];
export const CORNER_NAMES = ["back-left", "back-right", "front-left", "front-right"];

/** Acts an object accepts: always the base set, plus `open`/`close`/`fill` only when one of its parts has that named state. */
export function objectActs(parts) {
  const names = new Set((parts ?? []).flatMap((p) => Object.keys(p.states ?? {}).filter((k) => p.states[k])));
  return PROP_ACTS.filter((a) => !STATE_ACT[a] || names.has(STATE_ACT[a]));
}

/** Camera: shot presets (spherical offset around the focus). `az` is degrees from +z; `fit` is how much of the fit box the subject fills;
 *  `group` = what the framing solver must fit: "all" (hero + objects), "target" (the targeted object, plus the hero when it is near), "hero". */
export const SHOTS = {
  wide: { dist: 13, el: 20, az: -6, h: 1.1, fov: 46, fit: 0.97, fitBox: { x0: 90, x1: 990, y0: 360, y1: 1580 }, group: "all", cat: "wide", about: "whole diorama: hero and props visible" },
  medium: { dist: 10, el: 17, az: -14, h: 1.1, fov: 42, fit: 0.82, group: "target", cat: "medium", about: "hero and the object they work with" },
  close: { dist: 8, el: 15, az: 16, h: 0.95, fov: 40, fit: 0.84, group: "target", cat: "close", about: "tight on the target object" },
  macro: { dist: 6, el: 12, az: 22, h: 0.9, fov: 36, fit: 0.9, group: "macro", cat: "close", about: "long-lens detail of one part of the target" },
  low: { dist: 9, el: 4, az: -22, h: 1.1, fov: 38, fit: 0.8, group: "hero", cat: "medium", about: "low heroic angle looking up at the hero" },
  top: { dist: 10, el: 52, az: 0, h: 0.4, fov: 38, fit: 0.97, fitBox: { x0: 90, x1: 990, y0: 360, y1: 1580 }, group: "all", cat: "medium", about: "high angle on the layout" },
};
export const SHOT_KINDS = Object.keys(SHOTS);
export const MOVES = {
  "dolly-in": { dist: 0.86 }, "dolly-out": { dist: 1.1 }, orbit: { az: 22 }, "orbit-back": { az: -22 },
  push: { dist: 0.9, el: -2 }, crane: { el: 10, dist: 1.04 }, truck: { az: 12, dist: 0.97 }, drift: { az: 8, dist: 0.97 },
};
export const MOVE_KINDS = Object.keys(MOVES);
export const SIZE_NAMES = ["S", "M", "L"];
export const SIZE_SCALE = { S: 0.8, M: 1, L: 1.15 };

export const loadCatalog = () => ({
  sets: SET_IDS.map((id) => ({ id, ...SETS[id] })), builders: BUILDER_KINDS.map((id) => ({ id, about: BUILDERS[id].about })), shots: SHOTS, moves: MOVES, emotes: EMOTES, beats: BEAT_KINDS, stock: STOCK_MODELS,
});
export { SET_IDS, SETS, GLOBAL_ANCHORS, ANCHOR_IDS, BUILDER_KINDS, CHARACTER_DESIGNS, CHARACTER_HATS, CHARACTER_EXPRESSIONS, PART_SHAPES, PART_ROLES, MOTION_PRESETS };
