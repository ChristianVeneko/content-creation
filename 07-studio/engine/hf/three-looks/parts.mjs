// From-scratch model vocabulary of three-looks: primitive parts, roles, finishes, motion presets, named states, validation and bounds.
// Same semantics as the Remotion engine (lib/scene3d-motion.mjs) so a hand-written `custom` object and a builder result are one thing.
// Object space: units are metres, the object stands on y = 0, its front faces +z. A part's `pos` is relative to its parent's centre.
import { z } from "zod";

export const PART_SIZE = {
  box: { n: [1, 3], about: "[w, h, d] (one number = cube); `radius` rounds the edges" },
  sphere: { n: [1, 3], about: "[r] or [rx, ry, rz] (ellipsoid)" },
  cylinder: { n: [2, 3], about: "[r, h] or [rTop, rBottom, h]" },
  cone: { n: [2, 2], about: "[r, h]" },
  torus: { n: [2, 3], about: "[R, tube] or [R, tube, arcDegrees]; stands in the XY plane (faces +z)" },
  capsule: { n: [2, 2], about: "[r, length of the straight part]" },
  plane: { n: [2, 2], about: "[w, h], faces +z" },
  ring: { n: [2, 2], about: "[inner, outer] flat ring, faces +z" },
  tube: { n: [1, 1], about: "[radius] along `points` (3D, smooth curve)" },
  extrude: { n: [1, 1], about: "[depth] of the 2D outline `points` [[x, y], ...] (faces +z); `radius` bevels it" },
  lathe: { n: [0, 0], about: "no size: profile `points` [[r, y], ...] spun around y (vases, bottles, bells)" },
  group: { n: [0, 0], about: "empty pivot node (rigs: hang parts from it)" },
};
export const PART_SHAPES = Object.keys(PART_SIZE);
/** auto/clay = the look's clay finish; matte = rougher, no bump; emissive = self-lit; glass = see-through; metal = polished. */
export const PART_MATERIALS = ["auto", "matte", "clay", "emissive", "glass", "metal"];
export const PART_ROLES = ["body", "accent", "dark", "light", "metal", "screen", "glow"];
export const STATE_NAMES = ["open", "fill", "heat", "glow", "spin"];
export const STATE_ABOUT = {
  open: "0-1: a door or lid swings (beats `open` / `close`)",
  fill: "0-1: a level, bar or LED column rises (beat `fill` with `value`)",
  heat: "0-1: the part warms up (beats `heat` / `cool`)",
  glow: "0-1: a part lights (beats `light-up` / `dim`)",
  spin: "turns: a part rotates (beat `spin`)",
};
export const MOTION_ABOUT = {
  bob: "gentle up-down",
  float: "slow hover with a little sway",
  spin: "turns around y (`axis` x|y|z)",
  wobble: "rocks side to side",
  breathe: "squash-and-stretch idle",
  wave: "raises a limb and waves it (on an arm part with `pivot` at the shoulder)",
  walk: "swings `parts` (limbs in left/right pairs, counter-phased) plus a body bounce",
  blink: "closes `parts` (eyes) every few seconds",
  "look-at-camera": "turns to face the camera",
  hop: "jumps with squash on landing",
  "pop-in": "scales in with overshoot at `at`",
  assemble: "parts fly in from around and click together at `at`",
  explode: "parts fly apart at `at` and stay (exploded view)",
};
export const MOTION_PRESETS = Object.keys(MOTION_ABOUT);
export const EASINGS = ["linear", "in-out", "out", "in", "back", "elastic"];
export const MAX_PARTS = 160;
export const MAX_WORLD_PARTS = 400;
export const MAX_POINTS = 64;

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color like #1A2B3C");
const n = (lo, hi) => z.number().min(lo).max(hi);
const v3 = (lo, hi) => z.tuple([n(lo, hi), n(lo, hi), n(lo, hi)]);
const scaleField = z.union([n(0.01, 10), v3(0.01, 10)]);
const stateScale = z.union([n(0.01, 100), z.tuple([n(0.01, 100), n(0.01, 100), n(0.01, 100)])]);

/** A moment: seconds from the start of the video, or a narration word (`{ word, n?, offset? }`). */
export const momentSchema = z.union([
  z.number().min(0, "a moment is seconds from the start of the video"),
  z.object({ word: z.string().min(1), n: z.number().int().min(1).optional(), offset: z.number().min(-2).max(2).optional() }).strict(),
], { error: () => "a moment is seconds (number) or { word, n?, offset? }" });

const keySchema = z.object({
  at: momentSchema,
  pos: v3(-6, 6).optional(), rot: v3(-720, 720).optional(), scale: scaleField.optional(), opacity: n(0, 1).optional(),
  ease: z.enum(EASINGS).optional(),
}).strict();

const motionObject = z.object({
  type: z.string().min(1),
  at: momentSchema.optional(), until: momentSchema.optional(),
  amp: n(0, 720).optional(), speed: n(0.05, 8).optional(),
  parts: z.array(z.string().min(1).max(40)).min(1).max(12).optional(),
  axis: z.enum(["x", "y", "z"]).optional(), lift: n(-180, 180).optional(),
}).strict();
const motionField = z.array(z.union([z.string().min(1), motionObject])).max(6).optional();
const keysField = z.array(keySchema).min(1).max(12).optional();

/** One named-state effect: at value 1 the part is offset by `pos`, rotated by `rot`, scaled by `scale`, lit by `emissive`, tinted to `color`
 *  (`spin`: `rot` is degrees per turn). `from`/`to` window the 0-1 channel (an LED that lights between fill 0.4 and 0.5). `grow: "bottom"` keeps the base fixed. */
export const stateEffect = z.object({
  pos: v3(-6, 6).optional(), rot: v3(-1440, 1440).optional(), scale: stateScale.optional(), emissive: n(0, 4).optional(), color: hex.optional(), opacity: n(0, 1).optional(),
  from: n(0, 1).optional(), to: n(0, 1).optional(), grow: z.enum(["bottom"]).optional(),
}).strict();
const statesField = z.object(Object.fromEntries(STATE_NAMES.map((s) => [s, stateEffect.optional()]))).strict().optional();

export const partSchema = z.object({
  id: z.string().min(1).max(40),
  shape: z.enum(PART_SHAPES, { error: (iss) => `unknown part shape${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${PART_SHAPES.join(", ")}` }),
  size: z.array(n(0.005, 360)).max(3).optional(),
  points: z.array(z.array(n(-6, 6)).min(2).max(3)).max(MAX_POINTS).optional(),
  radius: n(0, 0.5).optional(),
  facets: z.number().int().min(3).max(24).optional(),
  pos: v3(-5, 5).optional(), rot: v3(-360, 360).optional(), scale: scaleField.optional(), pivot: v3(-3, 3).optional(),
  parent: z.string().min(1).max(40).optional(),
  color: hex.optional(),
  role: z.enum(PART_ROLES).optional(),
  material: z.enum(PART_MATERIALS).optional(),
  emissive: n(0, 4).optional(), opacity: n(0.05, 1).optional(),
  motion: motionField, keys: keysField, states: statesField,
}).strict();

export const worldPartSchema = partSchema.extend({ pos: v3(-30, 30).optional() });

const motionType = (m) => (typeof m === "string" ? m : m.type);

/** Graph and shape rules the schema cannot express. Returns [{ path, message }] (paths relative to the parts array). */
export function validateParts(parts, { max = MAX_PARTS, what = "parts per object" } = {}) {
  const out = [], add = (path, message) => out.push({ path, message });
  if (parts.length > max) add([], `at most ${max} ${what} (got ${parts.length})`);
  const ids = new Map();
  parts.forEach((p, i) => { if (ids.has(p.id)) add([i, "id"], `duplicate part id "${p.id}"`); else ids.set(p.id, i); });
  parts.forEach((p, i) => {
    const spec = PART_SIZE[p.shape]; if (!spec) return;
    const len = (p.size ?? []).length;
    if (len < spec.n[0] || len > spec.n[1]) add([i, "size"], `${p.shape} size ${spec.about} (got ${len} number${len === 1 ? "" : "s"})`);
    const pts = p.points ?? [];
    if ((p.shape === "tube" || p.shape === "lathe") && pts.length < 2) add([i, "points"], `${p.shape} needs at least 2 \`points\``);
    if (p.shape === "extrude" && pts.length < 3) add([i, "points"], "extrude needs at least 3 `points` (a closed 2D outline)");
    if (p.shape === "tube" && pts.some((q) => q.length !== 3)) add([i, "points"], "tube points are [x, y, z]");
    if ((p.shape === "extrude" || p.shape === "lathe") && pts.some((q) => q.length < 2)) add([i, "points"], `${p.shape} points are [x, y]`);
    if (p.parent !== undefined) {
      if (p.parent === p.id) add([i, "parent"], `part "${p.id}" is its own parent (cycle)`);
      else if (!ids.has(p.parent)) add([i, "parent"], `unknown parent "${p.parent}"`);
    }
    for (const [mi, m] of (p.motion ?? []).entries()) {
      const t = motionType(m);
      if (!MOTION_PRESETS.includes(t)) add([i, "motion", mi], `unknown motion "${t}"; use one of: ${MOTION_PRESETS.join(", ")}`);
      for (const id of m.parts ?? []) if (!ids.has(id)) add([i, "motion", mi, "parts"], `unknown part "${id}" in motion "${t}"`);
    }
  });
  // cycles (walk each chain with a step bound)
  const seen = new Set();
  parts.forEach((p, i) => {
    if (p.parent === undefined || p.parent === p.id || !ids.has(p.parent) || seen.has(p.id)) return;
    let cur = p, steps = 0;
    while (cur && cur.parent !== undefined && steps++ <= parts.length) { cur = parts[ids.get(cur.parent)]; if (cur === p) { add([i, "parent"], `parent cycle through "${p.id}"`); parts.forEach((q) => seen.add(q.id)); break; } }
  });
  return out;
}

// ---- bounds -------------------------------------------------------------------------------------------------------------------
const D2R = Math.PI / 180;
const mmul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const mT = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const mS = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
const mR = (rx, ry, rz) => {
  const [a, b, c] = [rx * D2R, ry * D2R, rz * D2R];
  const Rx = [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1];
  const Ry = [Math.cos(b), 0, -Math.sin(b), 0, 0, 1, 0, 0, Math.sin(b), 0, Math.cos(b), 0, 0, 0, 0, 1];
  const Rz = [Math.cos(c), Math.sin(c), 0, 0, -Math.sin(c), Math.cos(c), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return mmul(mmul(Rx, Ry), Rz); // three.js 'XYZ' order
};
const mApply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

/** Local axis-aligned box { c, h } (centre, half sizes) of a part's own geometry around its centre. */
export function localBox(p) {
  const s = p.size ?? [], pts = p.points ?? [];
  switch (p.shape) {
    case "box": { const [w, h = w, d = w] = s; return { c: [0, 0, 0], h: [w / 2, h / 2, d / 2] }; }
    case "sphere": { const [rx, ry = rx, rz = rx] = s; return { c: [0, 0, 0], h: [rx, ry, rz] }; }
    case "cylinder": { const r = s.length === 3 ? Math.max(s[0], s[1]) : s[0], h = s.length === 3 ? s[2] : s[1]; return { c: [0, 0, 0], h: [r, h / 2, r] }; }
    case "cone": return { c: [0, 0, 0], h: [s[0], s[1] / 2, s[0]] };
    case "torus": return { c: [0, 0, 0], h: [s[0] + s[1], s[0] + s[1], s[1]] };
    case "capsule": return { c: [0, 0, 0], h: [s[0], s[1] / 2 + s[0], s[0]] };
    case "plane": return { c: [0, 0, 0], h: [s[0] / 2, s[1] / 2, 0.001] };
    case "ring": return { c: [0, 0, 0], h: [s[1], s[1], 0.001] };
    case "tube": { const r = s[0] ?? 0.05; return bboxOf(pts.map((q) => [q[0], q[1], q[2] ?? 0]), r, r, r); }
    case "extrude": { const d = (s[0] ?? 0.1) / 2; return bboxOf(pts.map((q) => [q[0], q[1], 0]), 0, 0, d); }
    case "lathe": { const r = Math.max(...pts.map((q) => q[0]), 0.001), ys = pts.map((q) => q[1]); return { c: [0, (Math.min(...ys) + Math.max(...ys)) / 2, 0], h: [r, (Math.max(...ys) - Math.min(...ys)) / 2, r] }; }
    default: return { c: [0, 0, 0], h: [0, 0, 0] };
  }
}
function bboxOf(pts, ex, ey, ez) {
  if (!pts.length) return { c: [0, 0, 0], h: [ex, ey, ez] };
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const q of pts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k]); hi[k] = Math.max(hi[k], q[k]); }
  return { c: lo.map((v, k) => (v + hi[k]) / 2), h: lo.map((v, k) => (hi[k] - v) / 2 + [ex, ey, ez][k]) };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Value (0-1, or raw turns for `spin`) a state effect sees for a channel value, honouring its `from`/`to` window. */
export function effectValue(name, eff, ch) {
  const v = ch?.[name] ?? 0;
  if (name === "spin") return v;
  const a = eff.from ?? 0, b = eff.to ?? 1;
  return clamp01((v - a) / Math.max(1e-6, b - a));
}
/** Rest-pose transform of a part with named-state channels applied: { pos, rot, scale }. */
export function stateTransform(p, ch) {
  let pos = [...(p.pos ?? [0, 0, 0])], rot = [...(p.rot ?? [0, 0, 0])];
  const base = Array.isArray(p.scale) ? p.scale : [p.scale ?? 1, p.scale ?? 1, p.scale ?? 1];
  let scale = [...base];
  for (const [name, eff] of Object.entries(p.states ?? {})) {
    if (!eff) continue;
    const v = effectValue(name, eff, ch);
    if (eff.pos) for (let k = 0; k < 3; k++) pos[k] += eff.pos[k] * v;
    if (eff.rot) for (let k = 0; k < 3; k++) rot[k] += eff.rot[k] * v;
    if (eff.scale !== undefined) {
      const t = Array.isArray(eff.scale) ? eff.scale : [eff.scale, eff.scale, eff.scale];
      const m = t.map((x) => 1 + (x - 1) * v);
      if (eff.grow === "bottom") pos[1] += localBox(p).h[1] * base[1] * (m[1] - 1);
      scale = scale.map((x, k) => x * m[k]);
    }
  }
  return { pos, rot, scale };
}

/** World matrices of every part (parent chain, pivots, rest rotation and scale; `channels` = named-state values). Cycles and unknown parents are cut. */
export function partMatrices(parts, channels = {}) {
  const byId = new Map(parts.map((p) => [p.id, p])), cache = new Map();
  const node = (p, depth) => {
    if (cache.has(p.id)) return cache.get(p.id);
    const par = p.parent !== undefined && depth < parts.length ? byId.get(p.parent) : null;
    const pivot = p.pivot ?? [0, 0, 0];
    const ppv = par?.pivot ?? [0, 0, 0];
    const base = par ? node(par, depth + 1) : mT(0, 0, 0);
    const off = par ? [-ppv[0], -ppv[1], -ppv[2]] : [0, 0, 0];
    const tr = stateTransform(p, channels);
    let m = mmul(base, mT(off[0] + tr.pos[0] + pivot[0], off[1] + tr.pos[1] + pivot[1], off[2] + tr.pos[2] + pivot[2]));
    m = mmul(m, mmul(mR(...tr.rot), mS(...tr.scale)));
    cache.set(p.id, m); return m;
  };
  return parts.map((p) => { const pv = p.pivot ?? [0, 0, 0]; return mmul(node(p, 0), mT(-pv[0], -pv[1], -pv[2])); });
}

/** World-space extent of a part list (object space, rest pose). @returns {{min,max,center,size,top,width,depth}} */
export function partsExtent(parts, scale = 1, channels = {}) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const mats = partMatrices(parts, channels);
  parts.forEach((p, i) => {
    if (p.shape === "group") return;
    const b = localBox(p);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const w = mApply(mats[i], [b.c[0] + sx * b.h[0], b.c[1] + sy * b.h[1], b.c[2] + sz * b.h[2]]);
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k] * scale); hi[k] = Math.max(hi[k], w[k] * scale); }
    }
  });
  if (!Number.isFinite(lo[0])) return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], size: [0, 0, 0], top: 0, width: 0, depth: 0 };
  return { min: lo, max: hi, center: lo.map((v, k) => (v + hi[k]) / 2), size: hi.map((v, k) => v - lo[k]), top: hi[1], width: hi[0] - lo[0], depth: hi[2] - lo[2] };
}
/** Extent an object can take: the union of its start pose (initial channels) and the pose with every named state at 1 (framing must fit both). */
export function objectExtent(parts, init = {}, scale = 1) {
  const a = partsExtent(parts, scale, init), full = {}; for (const n of STATE_NAMES) full[n] = n === "spin" ? 0 : 1;
  const b = partsExtent(parts, scale, full);
  const min = a.min.map((v, k) => Math.min(v, b.min[k])), max = a.max.map((v, k) => Math.max(v, b.max[k]));
  return { min, max, center: min.map((v, k) => (v + max[k]) / 2), size: max.map((v, k) => v - min[k]), top: max[1], width: max[0] - min[0], depth: max[2] - min[2] };
}
export { z };
