// Worlds (sets) built from scratch: a rounded platform, an optional back wall, a textured floor, procedural decor and a FOREGROUND row
// that fills the lower third of the frame (raised front step, small props in front, floor decals). No models, no files.
// Decor objects are plain custom parts placed in the world; they are not targets of beats.
import { P, around, rng } from "./builders/helpers.mjs";
import { buildParts } from "./builders/index.mjs";

export const SLAB = { w: 13.0, d: 15.0, front: 11.5, back: -3.5 };
export const GLOBAL_ANCHORS = {
  left: [-2.1, 1.2], center: [0, 1.4], right: [2.1, 1.2], front: [0, 2.3], back: [0, -0.6],
  "back-left": [-2.6, -1.5], "back-center": [0, -1.6], "back-right": [2.6, -1.5],
  "mid-left": [-2.6, 0], "mid-center": [0, 0], "mid-right": [2.6, 0],
  "front-left": [-2.6, 1.7], "front-center": [0, 1.9], "front-right": [2.6, 1.7],
};
export const ANCHOR_IDS = Object.keys(GLOBAL_ANCHORS);
/** Pins an object to a platform corner (the optional `corner` of a custom object). */
export const CORNERS = { "back-left": [-3.5, -2.4], "back-right": [3.5, -2.4], "front-left": [-3.4, 2.4], "front-right": [3.4, 2.4] };
export const CORNER_IDS = Object.keys(CORNERS);

const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k)); return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`; };
// ---- small decor kits (parts, base on y = 0) ----
const kit = {
  bush: (r) => [P("b0", "sphere", [0.42, 0.34, 0.4], [0, 0.32, 0], { color: "#6aa95a" }), P("b1", "sphere", [0.32, 0.28, 0.3], [0.34, 0.26, 0.05], { color: "#7fbf8a" }), P("b2", "sphere", [0.3, 0.26, 0.28], [-0.32, 0.24, -0.04], { color: "#5f9a4e" })],
  cone: () => [P("base", "box", [0.5, 0.06, 0.5], [0, 0.03, 0], { radius: 0.02, role: "dark" }), P("c", "cone", [0.2, 0.55], [0, 0.34, 0], { color: "#f2a23a" }), P("stripe", "cylinder", [0.11, 0.15, 0.1], [0, 0.34, 0], { role: "light" })],
  books: (r) => [0, 1, 2].map((i) => P(`k${i}`, "box", [0.5 - i * 0.04, 0.12, 0.36], [0, 0.06 + i * 0.12, 0], { radius: 0.02, rot: [0, (r() - 0.5) * 30, 0], color: ["#e9806e", "#5a86c9", "#f2b45a"][i] })),
  cable: (r) => [P("c", "tube", [0.05], [0, 0.05, 0], { points: [[-0.9, 0.05, 0], [-0.4, 0.05, 0.25], [0.2, 0.05, -0.2], [0.9, 0.05, 0.1]], color: "#3d4558" }), P("plug", "box", [0.14, 0.1, 0.12], [0.92, 0.07, 0.1], { role: "dark" })],
  pallet: () => [P("t", "box", [1.1, 0.06, 0.8], [0, 0.16, 0], { color: "#c99a67" }), ...[-0.45, 0, 0.45].map((x, i) => P(`f${i}`, "box", [0.14, 0.12, 0.8], [x, 0.06, 0], { color: "#a97a4c" }))],
  stool: () => [P("seat", "cylinder", [0.26, 0.26, 0.08], [0, 0.62, 0], { role: "accent" }), ...around(3, 0.18, (i, a, x, z) => P(`l${i}`, "cylinder", [0.03, 0.6], [x, 0.3, z], { role: "dark" }), 90)],
  window: () => [P("frame", "box", [2.0, 1.5, 0.12], [0, 0, 0], { radius: 0.05, color: "#f7f1e6" }), P("glass", "box", [1.7, 1.2, 0.08], [0, 0, 0.05], { color: "#cfe8ff", emissive: 0.7 }), P("v", "box", [0.08, 1.2, 0.1], [0, 0, 0.1], { color: "#f7f1e6" }), P("h", "box", [1.7, 0.08, 0.1], [0, 0, 0.1], { color: "#f7f1e6" })],
  building: (r, w, h, c) => {
    const parts = [P("b", "box", [w, h, 1.4], [0, h / 2, 0], { radius: 0.08, color: c })];
    const cols = Math.max(2, Math.floor(w / 0.55)), rows = Math.max(2, Math.floor(h / 0.7));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) parts.push(P(`w${i}_${j}`, "box", [0.3, 0.38, 0.05], [(i - (cols - 1) / 2) * 0.55, 0.55 + j * 0.7, 0.71], { color: r() > 0.35 ? "#ffe9b0" : "#8fb7e0", emissive: 0.5 }));
    parts.push(P("roof", "box", [w + 0.1, 0.1, 1.5], [0, h + 0.03, 0], { radius: 0.03, color: "#8d8a88" }));
    return parts;
  },
  streetLamp: () => [P("pole", "cylinder", [0.06, 0.08, 2.6], [0, 1.3, 0], { role: "dark" }), P("arm", "box", [0.5, 0.06, 0.06], [0.22, 2.58, 0], { role: "dark" }), P("bulb", "sphere", [0.14, 0.1, 0.14], [0.45, 2.5, 0], { role: "glow", emissive: 1.4 }), P("foot", "cylinder", [0.14, 0.16, 0.12], [0, 0.06, 0], { role: "dark" })],
  vent: () => [P("f", "box", [1.0, 0.8, 0.08], [0, 0, 0], { radius: 0.03, role: "metal" }), ...[0, 1, 2, 3].map((i) => P(`s${i}`, "box", [0.8, 0.05, 0.04], [0, -0.28 + i * 0.19, 0.06], { role: "dark" }))],
  counter: (r, w) => [P("body", "box", [w, 1.0, 0.9], [0, 0.5, 0], { radius: 0.05, role: "accent" }), P("top", "box", [w + 0.1, 0.1, 1.0], [0, 1.05, 0], { radius: 0.03, role: "light" }), ...Array.from({ length: Math.floor(w / 0.9) }, (_, i) => P(`d${i}`, "box", [0.7, 0.6, 0.04], [(i - (Math.floor(w / 0.9) - 1) / 2) * 0.9, 0.5, 0.47], { radius: 0.03, role: "body" }))],
  cabinet: (r, w) => [P("body", "box", [w, 0.8, 0.5], [0, 0.4, 0], { radius: 0.04, role: "body" }), ...Array.from({ length: Math.floor(w / 0.8) }, (_, i) => P(`d${i}`, "box", [0.6, 0.6, 0.04], [(i - (Math.floor(w / 0.8) - 1) / 2) * 0.8, 0.4, 0.27], { radius: 0.03, role: "light" }))],
  rug: (r, rx, rz, color) => [P("r", "cylinder", [rx, rx, 0.03], [0, 0.015, 0], { color: lighten(color, 0.3), scale: [1, 1, rz / rx] }), P("r2", "cylinder", [rx * 0.8, rx * 0.8, 0.04], [0, 0.02, 0], { color: lighten(color, 0.62), scale: [1, 1, rz / rx] })],
  strip: (len, color) => [P("s", "box", [len, 0.025, 0.12], [0, 0.0125, 0], { color, emissive: 0.6 })],
  road: () => [P("a", "box", [8.4, 0.08, 2.4], [0, 0.04, 0], { color: "#555967" }), ...[-3, -1.5, 0, 1.5, 3].map((x, i) => P(`m${i}`, "box", [0.6, 0.02, 0.1], [x, 0.09, 0], { color: "#f7f1e6" })), P("curb", "box", [8.4, 0.18, 0.22], [0, 0.09, -1.3], { color: "#bdb5aa" })],
};
const placed = (name, build, at, o = {}) => ({ name, parts: build.parts ?? build, colors: build.colors ?? {}, at: [at[0], o.y ?? 0, at[1]], rot: o.rot ?? 0, scale: o.scale ?? 1 });
const wall = (c1, c2, tex = "tiles") => ({ tex, c1, c2, h: 4.6 });

export const SETS = {
  studio: {
    name: "Studio", about: "Neutral clay stage with a soft backdrop: concepts, definitions, anything abstract or object-focused.", topics: ["concept", "idea", "definition", "abstract", "product"], avoid: [],
    pal: { platform: "#e8c9a0", wall: "#f3e3c8", accent: "#6db3a8", accent2: "#e9806e" }, floor: { tex: "plain", c1: "#e8c9a0", c2: "#dcb98c" }, wall: null,
    decor(r) { return [placed("rug", kit.rug(r, 2.6, 1.4, "#6db3a8"), [0, 1.9]), placed("backdrop", [P("w", "box", [8.4, 3.4, 0.4], [0, 1.7, 0], { radius: 0.18, color: "#f3e3c8" })], [0, -3.2]), placed("plant", buildParts("plant", { seed: 2 }), [-3.4, -2.3], { scale: 1.0 }), placed("bush1", kit.bush(r), [-3.3, 3.1]), placed("bush2", kit.bush(r), [3.2, 3.15], { scale: 1.1 }), placed("cone", kit.cone(), [-1.4, 3.1]), placed("books", kit.books(r), [1.5, 3.1], { rot: 0.4 }), placed("pad", kit.strip(2.4, "#f2a23a"), [0, 2.95])]; },
  },
  room: {
    name: "Home office", about: "A cosy room with a window and a rug: computers, apps, slowness, personal tech, work.", topics: ["computer", "pc", "laptop", "app", "program", "ram", "memory", "slow", "freeze", "crash", "software", "work", "typing", "phone"], avoid: ["outdoor", "city"],
    pal: { platform: "#e8c9a0", wall: "#f3e3c8", accent: "#6db3a8", accent2: "#e9806e" }, floor: { tex: "plain", c1: "#e8c9a0", c2: "#dcb98c" }, wall: wall("#f3e3c8", "#e8d3b0"),
    decor(r) { return [placed("window", kit.window(), [-1.8, -3.1], { y: 2.8 }), placed("rug", kit.rug(r, 2.8, 1.5, "#e9806e"), [0.4, 1.9]), placed("plant", buildParts("plant", { seed: 5 }), [-3.5, -2.3]), placed("shelfL", kit.cabinet(r, 1.6), [3.0, -3.0], { y: 0 }), placed("books", kit.books(r), [3.0, -3.0], { y: 0.8 }), placed("stool", kit.stool(), [-3.3, 2.6]), placed("bush", kit.bush(r), [3.3, 3.1]), placed("books2", kit.books(r), [1.2, 3.1], { rot: 0.5 }), placed("cable", kit.cable(r), [-0.6, 3.0])]; },
  },
  "server-room": {
    name: "Server room", about: "Cool blue floor strips, vents and cables: data centres, cloud, servers, networks, cooling, security.", topics: ["server", "cloud", "data", "disk", "storage", "cooling", "internet", "database", "hosting", "network", "security", "hacker"], avoid: ["food", "nature"],
    pal: { platform: "#a9c3cf", wall: "#d2e0e6", accent: "#53c3d6", accent2: "#f08a5d" }, floor: { tex: "grid", c1: "#c9dae2", c2: "#a3bccb" }, wall: wall("#d6e3ea", "#c8d8e1", "stripes"),
    decor(r) { return [placed("ventA", kit.vent(), [-3.2, -3.1], { y: 3.0 }), placed("ventB", kit.vent(), [3.2, -3.1], { y: 3.0 }), placed("stripL", kit.strip(5.6, "#7fe0f0"), [-1.5, 0.6], { rot: Math.PI / 2 }), placed("stripR", kit.strip(5.6, "#7fe0f0"), [1.5, 0.6], { rot: Math.PI / 2 }), placed("cable", kit.cable(r), [0, 3.0]), placed("cable2", kit.cable(r), [-2.4, 2.4]), placed("crateA", buildParts("crate", { seed: 1 }), [-3.4, 2.9], { scale: 0.45 }), placed("crateB", buildParts("crate", { seed: 2 }), [3.4, 2.9], { scale: 0.45 }), placed("cone", kit.cone(), [1.6, 3.15])]; },
  },
  street: {
    name: "City street", about: "A street with buildings, lamps and a curb: traffic, queues, delivery, networks, many things competing.", topics: ["traffic", "queue", "road", "city", "cars", "network", "delivery", "bottleneck", "jam", "packets"], avoid: ["indoor", "kitchen"],
    pal: { platform: "#9aa4b8", wall: "#cfd6e4", accent: "#f2b45a", accent2: "#e5686a" }, floor: { tex: "plain", c1: "#b9c0cf", c2: "#a9b0c2" }, wall: null,
    decor(r) { return [placed("road", kit.road(), [0, 1.2]), placed("bA", kit.building(r, 1.9, 3.2, "#e9a0b4"), [-3.1, -2.6]), placed("bB", kit.building(r, 1.6, 4.6, "#8fb7e0"), [-1.0, -2.8]), placed("bC", kit.building(r, 2.0, 2.8, "#f2b45a"), [1.2, -2.6]), placed("bD", kit.building(r, 1.6, 4.0, "#7fbf8a"), [3.2, -2.8]), placed("lampA", kit.streetLamp(), [-2.2, -1.0]), placed("lampB", kit.streetLamp(), [2.2, -1.0]), placed("bushA", kit.bush(r), [-3.4, 3.0]), placed("bushB", kit.bush(r), [3.3, 3.1]), placed("coneA", kit.cone(), [-0.6, 3.1]), placed("coneB", kit.cone(), [0.7, 3.15])]; },
  },
  kitchen: {
    name: "Kitchen", about: "Counters, cabinets and a checker floor: cooking metaphors for heat, capacity, ingredients, orders.", topics: ["kitchen", "cook", "heat", "recipe", "food", "overheat", "capacity", "full", "orders", "restaurant"], avoid: ["server", "city"],
    pal: { platform: "#f0c49a", wall: "#f8e8d0", accent: "#e9806e", accent2: "#7fb98b" }, floor: { tex: "checker", c1: "#f7ecd8", c2: "#ecc9a0" }, wall: wall("#faf0dc", "#e8d4b4"),
    decor(r) { return [placed("counterL", kit.counter(r, 2.4), [-2.9, -2.8]), placed("counterR", kit.counter(r, 2.2), [3.0, -2.8]), placed("cabL", kit.cabinet(r, 2.0), [-2.9, -3.0], { y: 2.5 }), placed("cabR", kit.cabinet(r, 2.0), [3.0, -3.0], { y: 2.5 }), placed("plant", buildParts("plant", { seed: 3 }), [3.5, 2.9], { scale: 0.7 }), placed("stool", kit.stool(), [-3.3, 2.7]), placed("rug", kit.rug(r, 2.2, 1.2, "#7fb98b"), [0, 2.0]), placed("books", kit.books(r), [-1.2, 3.1])]; },
  },
  warehouse: {
    name: "Warehouse", about: "Pallets, painted floor lines and stacked crates: storage, capacity, moving things in and out, full memory, swapping.", topics: ["warehouse", "storage", "memory", "full", "swap", "boxes", "capacity", "delivery", "inventory", "disk", "cache"], avoid: ["kitchen", "nature"],
    pal: { platform: "#c9bd9c", wall: "#e4dcc4", accent: "#e0a24c", accent2: "#5f9ea0" }, floor: { tex: "plain", c1: "#d3c8a8", c2: "#c4b890" }, wall: wall("#e6dec8", "#d9cfb4", "stripes"),
    decor(r) { return [placed("lineA", kit.strip(7.6, "#f2b45a"), [0, -0.3]), placed("lineB", kit.strip(7.6, "#f2b45a"), [0, 2.5]), placed("palletA", kit.pallet(), [-3.2, 0.9]), placed("palletB", kit.pallet(), [3.2, 0.9]), placed("crateA", buildParts("crate", { seed: 1 }), [-3.3, 0.9], { y: 0.2, scale: 0.8 }), placed("crateB", buildParts("crate", { seed: 2 }), [-3.4, 2.4], { scale: 0.55 }), placed("crateC", buildParts("crate", { seed: 3 }), [3.3, 2.5], { scale: 0.6 }), placed("coneA", kit.cone(), [-1.0, 3.1]), placed("coneB", kit.cone(), [1.1, 3.15]), placed("books", kit.books(r), [2.2, 3.1])]; },
  },
};
export const SET_IDS = Object.keys(SETS);
/** Decor objects of a set (plus the raised front step): deterministic. */
export function setDecor(id) {
  const s = SETS[id]; if (!s) return [];
  const r = rng(SET_IDS.indexOf(id) + 11);
  const FG = { studio: ["bush", "books", "cone", "plant"], room: ["bush", "books", "plant", "cone"], "server-room": ["crate", "cone", "cable", "crate"], street: ["bush", "cone", "bush", "lamp"], kitchen: ["plant", "books", "crate", "bush"], warehouse: ["crate", "pallet", "cone", "crate"] }[id];
  const fg = [];
  fg.push({ name: "fgrug", parts: kit.rug(r, 3.6, 1.5, s.pal.accent2), colors: {}, at: [0, 0, 5.3], rot: 0, scale: 1 }, { name: "fgrug2", parts: kit.rug(r, 3.6, 1.3, s.pal.accent), colors: {}, at: [-0.4, 0, 8.2], rot: 0, scale: 1 }, { name: "fgrug3", parts: kit.rug(r, 3.4, 1.2, s.pal.accent2), colors: {}, at: [0.6, 0, 10.6], rot: 0, scale: 1 }, { name: "fgrug4", parts: kit.rug(r, 2.2, 1.0, s.pal.accent), colors: {}, at: [-4.6, 0, 6.6], rot: 0.2, scale: 1 }, { name: "fgrug5", parts: kit.rug(r, 2.2, 1.0, s.pal.accent), colors: {}, at: [4.6, 0, 6.6], rot: -0.2, scale: 1 });
  fg.push({ name: "pad1", parts: kit.rug(r, 1.5, 0.9, s.pal.accent), colors: {}, at: [-2.6, 0, 2.7], rot: 0.2, scale: 1 }, { name: "pad2", parts: kit.rug(r, 1.6, 0.9, s.pal.accent2), colors: {}, at: [2.7, 0, 2.5], rot: -0.2, scale: 1 }, { name: "pad4", parts: kit.rug(r, 1.4, 0.8, s.pal.accent2), colors: {}, at: [-3.4, 0, 0.2], rot: 0.3, scale: 1 }, { name: "pad5", parts: kit.rug(r, 1.4, 0.8, s.pal.accent2), colors: {}, at: [3.4, 0, -0.3], rot: -0.3, scale: 1 }, { name: "pad3", parts: kit.rug(r, 1.8, 1.0, s.pal.accent), colors: {}, at: [0, 0, 3.7], rot: 0, scale: 1 });
  for (let i = 0; i < 24; i++) {
    const kind = FG[i % FG.length], x = -5.8 + (11.6 * (i % 6)) / 5 + (r() - 0.5) * 0.6, z = [4.4, 5.6, 6.8, 8.0, 9.4, 10.8][Math.floor(i / 6) % 6] + r() * 0.3, sc = 0.65 + r() * 0.35;
    const parts = kind === "bush" ? kit.bush(r) : kind === "cone" ? kit.cone() : kind === "books" ? kit.books(r) : kind === "cable" ? kit.cable(r) : kind === "pallet" ? kit.pallet() : kind === "lamp" ? kit.stool() : buildParts(kind, { seed: i }).parts;
    fg.push({ name: `fg${i}`, parts, colors: {}, at: [x, 0, z], rot: (r() - 0.5) * 1.2, scale: kind === "crate" || kind === "plant" ? sc * 0.45 : sc });
  }
  const step = { name: "step", parts: [P("s", "box", [SLAB.w - 0.4, 0.2, 0.5], [0, 0.1, 0], { radius: 0.14, color: s.pal.accent }), P("t", "box", [SLAB.w - 1.0, 0.05, 0.2], [0, 0.22, 0.08], { radius: 0.03, color: s.pal.accent2 })], colors: {}, at: [0, 0, SLAB.front - 0.3], rot: 0, scale: 1 };
  return [step, ...fg, ...s.decor(r)].map((d, i) => ({ id: `d${i}`, ...d }));
}
export const setInfo = (id) => { const s = SETS[id]; return { id, name: s.name, about: s.about, topics: s.topics, pal: s.pal }; };
