// Catalog of the three-looks format: models, settings (worlds), props with their named states, cast, shots and beat kinds.
// Single source of truth: the schema, normalizer, prompt, resolver, tests AND the browser runtime (injected as `CAT`) read it.
// Units: 1 unit is about one metre; the hero is 1.8 tall. Axes: x right, y up, z toward the camera. Platform: x +-4.2, z +-3.0.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = dirname(fileURLToPath(import.meta.url));
export const RUNTIME_DIR = join(HERE, "runtime");
export const ASSETS_ROOT = join(HERE, "..", "..", "..", "..", "03-assets");
export const RUNTIME_FILES = ["core.js", "kit.js", "kinds.js", "props.js", "cast.js", "camera.js", "post.js", "overlay.js", "main.js"];
export const runtimeFiles = () => RUNTIME_FILES;

/** GLB models (path relative to 03-assets/3d; `h` = target height in units; `fix` = yaw correction so it faces +z). */
export const MODELS = {
  robo: { file: "hf-models/robot-expressive.glb", h: 1.8, rig: "skinned" },
  alex: { file: "models/character-a.glb", h: 1.8, rig: "nodes" },
  dani: { file: "models/character-d.glb", h: 1.8, rig: "nodes" },
  kiko: { file: "models/character-k.glb", h: 1.8, rig: "nodes" },
  lamp: { file: "models/lamp-table.glb", h: 1.5 },
  books: { file: "models/books.glb", h: 0.4 },
  plant: { file: "models/plant-small.glb", h: 1.1 },
  mouse: { file: "models/computer-mouse.glb", h: 0.16 },
  chair: { file: "models/chair-desk.glb", h: 1.5 },
  apple: { file: "models/food-apple-01.glb", h: 0.5 },
  pot: { file: "hf-models/brass-pot-01.glb", h: 0.85 },
  barrel: { file: "hf-models/barrel-03.glb", h: 1.1 },
  shelf: { file: "hf-models/shelf-01.glb", h: 2.4 },
  laptop: { file: "hf-models/classic-laptop.glb", h: 0.55 },
  taxi: { file: "models/car-taxi.glb", h: 1.1 },
  sedan: { file: "models/car-sedan.glb", h: 1.0 },
  suv: { file: "models/car-suv.glb", h: 1.2 },
  truck: { file: "models/car-truck.glb", h: 1.5 },
  barrier: { file: "models/construction-barrier.glb", h: 1.0 },
  "street-lamp": { file: "models/street-light.glb", h: 3.4 },
  sign: { file: "models/sign-highway.glb", h: 2.8 },
  "building-a": { file: "models/city-building-a.glb", h: 3.6 },
  "building-c": { file: "models/city-building-c.glb", h: 3.2 },
  "tower-a": { file: "models/city-building-skyscraper-a.glb", h: 5.4 },
  "tower-c": { file: "models/city-building-skyscraper-c.glb", h: 4.8 },
  megaphone: { file: "models/megaphone-01.glb", h: 0.7 },
};
export const HDRI_FILE = "hdri/brown_photostudio_02_1k.hdr";
export const FONT_FILES = ["Baloo2-Variable.ttf"];

/** Beat kinds. `do` values grouped by who they act on. */
export const PROP_ACTS = ["pop-in", "pop-out", "grow", "shrink", "pulse", "shake", "light-up", "dim", "burst", "move", "spin", "open", "close", "fill", "heat", "cool"];
export const CAST_ACTS = ["walk", "emote", "look"];
export const TEXT_ACTS = ["label", "stamp"];
export const BEAT_KINDS = [...PROP_ACTS, ...CAST_ACTS, ...TEXT_ACTS];
export const BEAT_DOCS = {
  "pop-in": "target appears with a springy pop (props marked hidden start invisible)",
  "pop-out": "target shrinks away",
  grow: "target swells and stays bigger (`amount` 1.1-2, default 1.35)",
  shrink: "target shrinks and stays smaller (`amount` 0.4-0.95, default 0.7)",
  pulse: "quick squash-and-stretch bump (a heartbeat)",
  shake: "target trembles for `dur` seconds (panic, overload)",
  "light-up": "target glows brighter and stays lit",
  dim: "target goes dark",
  burst: "burst of coloured blobs (sparks, steam, confetti) from the target",
  move: "target travels to `to` (anchor or prop id); cars drive, other props hop",
  spin: "target spins fast for `dur` seconds (fans, disks, wheels)",
  open: "monitor: opens more program windows; tower/rack/fridge/door: opens",
  close: "closes what `open` opened",
  fill: "sets the target's level `value` 0-1 (RAM bar, thermometer, LED column, shelf fullness)",
  heat: "target heats up: red glow and smoke",
  cool: "target cools down again",
  walk: "`who` walks to `to` (left|center|right|front|back or a prop id)",
  emote: "`who` plays `symbol`: wave yes no thumbs-up jump dance faint sit stand punch",
  look: "`who` turns to face `target` (a prop id) or the camera when `target` is omitted",
  label: "floating name tag over `target` (`text`, 1-3 words, at most 22 characters)",
  stamp: "big centre-screen word (`text`, at most 18 characters) for about 1.4 s",
};
export const EMOTES = ["wave", "yes", "no", "thumbs-up", "jump", "dance", "faint", "sit", "stand", "punch"];
export const TRANSITIONS = ["iris", "slide", "drop", "pop"];
export const MOODS = ["warm", "cool", "night", "alert"];
export const MOOD_DOCS = { warm: "golden studio light (default)", cool: "blue-teal daylight, calm", night: "dark blue with a warm lamp glow, late-night work", alert: "red-orange tension for failures and overheating" };
export const SIZES = ["S", "M", "L"];
export const SIZE_SCALE = { S: 0.72, M: 1, L: 1.22 };
export const CAMERA_MODES = ["calm", "dynamic"];

/** Camera: shot presets (spherical offset around the focus) and moves (how the pose drifts during the shot). `az` is degrees from +z. */
export const SHOTS = {
  wide: { dist: 10.8, el: 16, az: -6, h: 1.1, fov: 46, about: "whole diorama, hero and props visible" },
  medium: { dist: 9.4, el: 12, az: -12, h: 1.1, fov: 40, about: "hero and the prop they work with" },
  close: { dist: 7.6, el: 9, az: 14, h: 0.95, fov: 38, about: "tight on the target prop" },
  low: { dist: 8.6, el: -1, az: -22, h: 1.2, fov: 40, about: "low heroic angle looking up" },
  top: { dist: 7.6, el: 48, az: 0, h: 0.5, fov: 40, about: "high angle on the layout" },
  "over-shoulder": { dist: 6.8, el: 10, az: 0, h: 1.3, fov: 40, about: "behind the hero looking at the target prop" },
};
export const SHOT_KINDS = Object.keys(SHOTS);
export const MOVES = {
  "dolly-in": { dist: 0.78 }, "dolly-out": { dist: 1.1 }, orbit: { az: 26 }, "orbit-back": { az: -26 },
  push: { dist: 0.88, el: -3 }, crane: { el: 15, dist: 1.04 }, truck: { az: 12, dist: 0.97 }, drift: { az: 7, dist: 0.97 },
};
export const MOVE_KINDS = Object.keys(MOVES);

const BASE = ["pop-in", "pop-out", "grow", "shrink", "pulse", "shake", "light-up", "dim", "burst", "move"];
/** Prop kinds: which beat kinds they accept besides the base set, and what they are for. */
export const KINDS = {
  monitor: { acts: ["fill", "open", "close", "heat", "cool"], about: "screen: `open` opens program windows, `fill` fills a RAM bar, `heat` turns it red" },
  tower: { acts: ["heat", "cool", "open", "close", "spin"], about: "desktop tower with fan and LEDs" },
  "ram-stick": { acts: ["fill", "spin"], about: "memory module with a LED bar (`fill`)" },
  thermometer: { acts: ["fill", "heat", "cool"], about: "big thermometer, `fill` raises the red column" },
  rack: { acts: ["heat", "cool", "open", "close", "fill"], about: "server rack: blinking LEDs, door (`open`), LED level (`fill`)" },
  "hard-disk": { acts: ["spin", "fill", "heat"], about: "open hard disk: platter and arm; `spin` for heavy disk work" },
  fan: { acts: ["spin", "heat"], about: "cooling fan, spins slowly, `spin` makes it race" },
  beacon: { acts: ["spin"], about: "alarm beacon light" },
  clock: { acts: ["spin"], about: "alarm clock with moving hands; `shake` rings it" },
  model: { acts: ["spin", "heat", "cool"], about: "a real 3D model" },
  car: { acts: ["spin"], about: "car that drives with `move`" },
  "traffic-light": { acts: [], about: "traffic light; `light-up` turns it red, `dim` turns it green" },
  stove: { acts: ["heat", "cool", "open", "close"], about: "stove with burners and an oven door" },
  fridge: { acts: ["open", "close", "fill"], about: "fridge: door (`open`) and items (`fill`)" },
  crate: { acts: ["spin"], about: "wooden crate" },
  shelf: { acts: ["fill"], about: "storage shelf, `fill` sets how full it is" },
  door: { acts: ["open", "close"], about: "roll-up door" },
};
export const kindActs = (kind) => [...BASE, ...(KINDS[kind]?.acts ?? [])];

const P = (kind, at, extra = {}) => ({ kind, at, ...extra });
const car = (model, at, extra = {}) => P("car", at, { model, ...extra });

/** Settings (worlds). Props are the `target` of beats; `at` is [x,y,z] on the platform; `hidden` props start invisible. */
export const SETTINGS = {
  desk: {
    name: "Home office desk", about: "A desk with monitor, tower PC, lamp, books and a clock: computers, apps, slowness, personal tech.",
    topics: ["computer", "pc", "laptop", "app", "program", "ram", "memory", "slow", "freeze", "crash", "windows", "software", "work", "typing"], avoid: ["outdoor", "city", "food"],
    pal: { platform: "#e8c9a0", wall: "#f3e3c8", accent: "#6db3a8", accent2: "#e9806e" },
    anchors: { desk: [0, 0, -0.4] },
    props: {
      monitor: P("monitor", [0, 1.05, -1.5], { size: 1.0 }),
      tower: P("tower", [2.5, 0, -1.3], { size: 1.0 }),
      "ram-stick": P("ram-stick", [0.45, 1.05, -0.8], { size: 1.0, hidden: true }),
      lamp: P("model", [-1.65, 1.05, -1.7], { model: "lamp", glow: "#ffd9a0", lit: 0.7 }),
      clock: P("clock", [-0.85, 1.05, -0.8], { size: 1.0 }),
      thermometer: P("thermometer", [3.2, 0, 0.5], { size: 1.0 }),
    },
    decor: "desk",
  },
  "server-room": {
    name: "Server room", about: "Racks with blinking lights, fans, a hard disk and an alarm: data centres, cloud, servers, cooling, storage.",
    topics: ["server", "cloud", "data", "disk", "storage", "cooling", "heat", "internet", "database", "hosting", "swap", "overheat"], avoid: ["food", "nature"],
    pal: { platform: "#a9c3cf", wall: "#d2e0e6", accent: "#53c3d6", accent2: "#f08a5d" },
    anchors: { aisle: [0, 0, 0.6] },
    props: {
      "rack-1": P("rack", [-2.5, 0, -1.55], { size: 1.0 }), "rack-2": P("rack", [0, 0, -1.7], { size: 1.0 }), "rack-3": P("rack", [2.5, 0, -1.55], { size: 1.0 }),
      "hard-disk": P("hard-disk", [0.1, 0, 0.5], { size: 1.0 }),
      fan: P("fan", [-3.2, 0, 0.3], { size: 1.0 }),
      beacon: P("beacon", [3.2, 0, 0.7], { size: 1.0 }),
      thermometer: P("thermometer", [1.9, 0, 1.0], { size: 0.9 }),
    },
    decor: "server-room",
  },
  street: {
    name: "City street", about: "A two-lane street with buildings, cars, a traffic light and a barrier: traffic, queues, networks, delivery, many things competing.",
    topics: ["traffic", "queue", "road", "city", "cars", "network", "internet", "delivery", "bottleneck", "jam", "congestion", "packets"], avoid: ["indoor", "kitchen"],
    pal: { platform: "#9aa4b8", wall: "#cfd6e4", accent: "#f2b45a", accent2: "#e5686a" },
    anchors: { "road-start": [-5.2, 0, 0.9], "road-end": [5.2, 0, 0.9], "lane-1": [0, 0, 0.9], "lane-2": [0, 0, 2.1] },
    props: {
      taxi: car("taxi", [-3.0, 0, 0.9]), sedan: car("sedan", [-0.4, 0, 0.9]), suv: car("suv", [2.4, 0, 2.1], { hidden: true }), truck: car("truck", [-3.4, 0, 2.1], { hidden: true }),
      "traffic-light": P("traffic-light", [3.4, 0.14, -0.5], { size: 1.0 }),
      barrier: P("model", [1.4, 0, 0.9], { model: "barrier", hidden: true }),
      sign: P("model", [-3.7, 0.14, -0.7], { model: "sign" }),
    },
    decor: "street",
  },
  kitchen: {
    name: "Kitchen", about: "Stove, pot, fridge and apples: cooking metaphors for heat, capacity, ingredients and busy kitchens (overheating, full memory, many orders).",
    topics: ["kitchen", "cook", "heat", "fridge", "recipe", "food", "overheat", "capacity", "full", "orders", "restaurant"], avoid: ["server", "city"],
    pal: { platform: "#f0c49a", wall: "#f8e8d0", accent: "#e9806e", accent2: "#7fb98b" },
    anchors: {},
    props: {
      stove: P("stove", [-0.7, 0, -1.5], { size: 1.0 }), pot: P("model", [-0.7, 1.0, -1.45], { model: "pot", glow: "#ff9a5a" }),
      fridge: P("fridge", [2.8, 0, -1.4], { size: 1.0 }),
      "apple-1": P("model", [0.9, 1.0, -1.3], { model: "apple", glow: "#ff6b5a" }), "apple-2": P("model", [1.45, 1.0, -1.15], { model: "apple", glow: "#ff6b5a", hidden: true }),
      timer: P("clock", [-2.6, 1.0, -1.1], { size: 1.0 }),
      thermometer: P("thermometer", [-3.4, 0, 0.6], { size: 0.9 }),
    },
    decor: "kitchen",
  },
  warehouse: {
    name: "Warehouse", about: "Shelves, crates, a roll-up door and a truck: storage, capacity, moving things in and out, full memory, disk swapping.",
    topics: ["warehouse", "storage", "memory", "full", "swap", "boxes", "capacity", "delivery", "inventory", "disk", "cache"], avoid: ["kitchen", "nature"],
    pal: { platform: "#c9bd9c", wall: "#e4dcc4", accent: "#e0a24c", accent2: "#5f9ea0" },
    anchors: { dock: [3.0, 0, 0.9] },
    props: {
      "shelf-l": P("shelf", [-2.9, 0, -1.6], { size: 1.0 }), "shelf-r": P("shelf", [0.2, 0, -1.7], { size: 1.0 }),
      "crate-1": P("crate", [1.7, 0, 0.5], { size: 1.0 }), "crate-2": P("crate", [2.55, 0, 0.5], { size: 1.0 }), "crate-3": P("crate", [-0.9, 0, 0.9], { size: 1.0, hidden: true }), "crate-4": P("crate", [-1.9, 0, 1.4], { size: 1.0, hidden: true }),
      door: P("door", [3.1, 0, -1.9], { size: 1.0 }),
      truck: car("truck", [3.2, 0, 1.2], { hidden: true }),
      barrel: P("model", [-3.4, 0, 0.8], { model: "barrel" }),
    },
    decor: "warehouse",
  },
};
export const SETTING_IDS = Object.keys(SETTINGS);
export const GLOBAL_ANCHORS = { left: [-2.1, 0, 1.2], center: [0, 0, 1.4], right: [2.1, 0, 1.2], front: [0, 0, 2.3], back: [0, 0, -0.6] };
export const ANCHOR_IDS = Object.keys(GLOBAL_ANCHORS);

export const HEROES = [
  { id: "robo", name: "Robo", about: "Expressive robot, skinned rig with real Idle, Walking, Running, Wave, Yes, No, ThumbsUp, Jump, Dance, Death, Sitting, Punch clips (default)." },
  { id: "alex", name: "Alex", about: "Blocky bearded man (Kenney), node-animated: idle, walk, wave, yes, no, sit, collapse." },
  { id: "dani", name: "Dani", about: "Blocky character D (Kenney), same clips as Alex." },
  { id: "kiko", name: "Kiko", about: "Blocky character K (Kenney), same clips as Alex." },
];
export const HERO_IDS = HEROES.map((h) => h.id);
/** Emote symbol -> clip names per rig, with a clip-time scale and a procedural hop. */
export const EMOTE_CLIPS = {
  skinned: { wave: "Wave", yes: "Yes", no: "No", "thumbs-up": "ThumbsUp", jump: "Jump", dance: "Dance", faint: "Death", sit: "Sitting", stand: "Standing", punch: "Punch" },
  nodes: { wave: "interact-right", yes: "emote-yes", no: "emote-no", "thumbs-up": "emote-yes", jump: "emote-yes", dance: "sprint", faint: "die", sit: "sit", stand: "idle", punch: "attack-melee-right" },
};
export const EMOTE_HOLD = { wave: 1.6, yes: 1.2, no: 1.2, "thumbs-up": 1.5, jump: 1.0, dance: 2.4, faint: 2.5, sit: 3.0, stand: 1.0, punch: 1.0 };

export const getSetting = (id) => SETTINGS[id];
/** Every target of a world: props plus the pseudo-targets `hero`/cast ids are NOT included (those are `who`). */
export const settingProps = (id) => SETTINGS[id]?.props ?? {};
export const propIds = (id) => Object.keys(settingProps(id));
export const anchorIds = (id) => [...ANCHOR_IDS, ...Object.keys(SETTINGS[id]?.anchors ?? {}), ...propIds(id)];
/** Models used by a set of settings and a hero (for asset copying and license checks). */
export function modelsFor(settingIds, castIds) {
  const ids = new Set(castIds);
  for (const s of settingIds) {
    const set = SETTINGS[s];
    for (const p of Object.values(set.props)) if (p.model) ids.add(p.model);
    for (const m of DECOR_MODELS[set.decor] ?? []) ids.add(m);
  }
  return [...ids].filter((id) => MODELS[id]);
}
export const DECOR_MODELS = { desk: ["chair", "books", "plant", "mouse", "laptop"], "server-room": [], street: ["building-a", "building-c", "tower-a", "tower-c", "street-lamp"], kitchen: ["shelf", "plant"], warehouse: ["barrel"] };

export function loadCatalog() {
  return {
    settings: SETTING_IDS.map((id) => ({ id, ...SETTINGS[id] })), heroes: HEROES, shots: SHOTS, moves: MOVES, emotes: EMOTES, beats: BEAT_KINDS, models: MODELS,
  };
}
export const jsonCat = (settingIds) => ({
  SETTINGS: Object.fromEntries(settingIds.map((id) => [id, SETTINGS[id]])), GLOBAL_ANCHORS, SHOTS, MOVES, MODELS, KINDS: Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v.acts])), EMOTE_CLIPS, EMOTE_HOLD, SIZE_SCALE, DECOR_MODELS,
});
