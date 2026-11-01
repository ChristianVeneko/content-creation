// Generative pixel kit (pure, bundled by Remotion through lib/pixel.mjs): the vocabulary the agent uses to draw
// ORIGINAL scenes instead of placing catalog items:
//   1. sprites: char-per-pixel grids with a palette (role names or hex), several frames, mirror helper,
//   2. custom sets: a sky plus procedural layers (skyline, mountains, hills, dunes, waves, forest, clouds, ground,
//      tiles, grid, sprite, rect, circle) generated from a seed at a parallax depth,
//   3. motion: keyframes (seconds or word moments like the reels `en`) with easing, plus presets (bob, walk-across...),
//   4. fx: palette-limited particles, bursts, lightning, rays, bloom, glitch, CRT, shake, flash, chromatic,
//      pixelate / dissolve in-out; all deterministic (seeded) so renders are reproducible.
// Nothing here may import Node built-ins.
import { z } from "zod";
import { normWord, parseMoment, resolveMoment, wordFrame } from "./reels.mjs";

/**
 * Color roles every set, prop and UI piece draws with. A look maps each role to one entry of its limited palette.
 * sky0..sky3 top -> horizon; far0/far1 distant silhouettes; wall0..wall2 dark -> light; wood0..wood2; floor0/floor1;
 * metal0/metal1; leaf0/leaf1; glow (warm emissive), glow2 (cool emissive); accent, accent2; ink (darkest), paper (lightest).
 */
export const ROLES = ["sky0", "sky1", "sky2", "sky3", "far0", "far1", "wall0", "wall1", "wall2", "wood0", "wood1", "wood2", "floor0", "floor1", "metal0", "metal1", "leaf0", "leaf1", "glow", "glow2", "accent", "accent2", "ink", "paper"];

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** A color: a look role name (keeps the look's palette) or a hex color. */
export const colorRef = z.string().refine((s) => HEX_RE.test(s) || ROLES.includes(s), { message: `must be a color role (${ROLES.join(", ")}) or a hex color like #1A2B3C` });

/**
 * Error message of a failed z.union: report the branch whose type matched the input (an object for a custom set,
 * a list for motion presets...) with the nested path inside the message, instead of zod's bare "Invalid input".
 */
export function unionError(iss) {
  const branches = (iss.errors ?? []).filter((errs) => !errs.some((e) => e.path.length === 0 && e.code === "invalid_type"));
  const pick = (branches.length ? branches : (iss.errors ?? [])).map((errs) => errs[0]).filter(Boolean);
  pick.sort((a, b) => b.path.length - a.path.length);
  const e = pick[0];
  if (!e) return undefined;
  return e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message;
}

// ---------------- deterministic randomness ----------------

/** Deterministic hash of (seed, key) to [0, 1). Same inputs, same number, in Node and in the browser. */
export function h01(seed, key = "") {
  const s = `${seed}|${key}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // final avalanche (murmur3 fmix32)
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------- moments (seconds or words, like the reels `en`) ----------------

/** When something happens: seconds into the scene, or a moment string: "word", "word#2", "word+6" (frames), "inicio", "fin", "12f". */
export const momentAt = z.union([z.number().min(0).max(120), z.string().min(1).max(40)]);

const FRAME_RE = /^(\d+)f$/;

/** Every moment string used by a pixel visual (actor at/until, motion keys and presets, fx, set layers). */
export function sceneMomentStrings(p) {
  const out = new Set();
  const add = (m) => {
    if (typeof m === "string") out.add(m);
  };
  const motion = (m) => {
    const n = normalizeMotion(m);
    for (const k of n.keys) add(k.at);
    for (const q of n.presets) add(q.at);
  };
  for (const a of p?.actors ?? []) {
    add(a.at);
    add(a.until);
    motion(a.motion);
  }
  for (const q of p?.props ?? []) motion(q.motion);
  if (p?.character) motion(p.character.motion);
  for (const k of ["banner", "popup", "counter", "checklist"]) if (p?.[k]) motion(p[k].motion);
  for (const f of p?.fx ?? []) add(f.at);
  if (p?.set && typeof p.set === "object") for (const l of p.set.layers ?? []) motion(l.motion);
  return [...out];
}

/** A moment string that is not readable, or a word that is not in `narration`; null when fine. */
export function momentIssue(m, narration) {
  if (typeof m !== "string" || FRAME_RE.test(m.trim())) return null;
  const p = parseMoment(m);
  if (!p) return `cannot read the moment "${m}" (use seconds, a word of the narration, "word#2", "word+6", "inicio", "fin" or "12f")`;
  if (p.kind !== "word") return null;
  const target = normWord(p.word);
  const words = String(narration ?? "").split(/\s+/).map(normWord).filter(Boolean);
  const hits = words.filter((w) => w === target).length || words.filter((w) => w.startsWith(target)).length;
  if (hits >= p.nth) return null;
  return `"${p.word}"${p.nth > 1 ? ` (occurrence ${p.nth})` : ""} is not in this scene's narration`;
}

/**
 * Resolve the moment strings of one scene to seconds into the scene, with the reels `en` rules (a word shows
 * ADELANTO frames before it is heard, never before the cut).
 * @param {string[]} moments
 * @param {{startMs: number, text: string}[]} words  the scene's spoken words (absolute times)
 * @param {{from: number, durationInFrames: number}} sc  the scene in the timeline
 */
export function resolveSceneMoments(moments, words, sc, fps) {
  const ctx = { words: words.map((w) => ({ w: String(w.text).trim(), f: wordFrame(w.startMs / 1000, sc.from, fps) })), cut: sc.from, ini: sc.from, end: sc.from + sc.durationInFrames };
  const out = {};
  for (const m of moments) {
    const fr = FRAME_RE.exec(m.trim());
    if (fr) {
      out[m] = Math.round((parseInt(fr[1], 10) / fps) * 1000) / 1000;
      continue;
    }
    const r = resolveMoment(m, ctx);
    if ("frame" in r) out[m] = Math.max(0, Math.round(((r.frame - sc.from) / fps) * 1000) / 1000);
  }
  return out;
}

/** Seconds of a moment at render time: numbers are seconds, strings come from the plan (fallback: a guess). */
export function momentSeconds(at, moments, sceneSec, fps = 30) {
  if (at === undefined || at === null) return 0;
  if (typeof at === "number") return at;
  if (moments && at in moments) return moments[at];
  const fr = FRAME_RE.exec(String(at).trim());
  if (fr) return parseInt(fr[1], 10) / fps;
  const p = parseMoment(at);
  if (p?.kind === "start") return Math.max(0, p.offset / fps);
  if (p?.kind === "end") return Math.max(0, sceneSec + p.offset / fps);
  return Math.min(0.6, sceneSec / 3);
}

// ---------------- sprites ----------------

/** Default sprite palette when a sprite has none: the look roles, indexed by 0-9 then a-n. */
export const SPRITE_DEFAULT_PALETTE = ["ink", "paper", "accent", "accent2", "glow", "glow2", "wall0", "wall1", "wall2", "metal0", "metal1", "wood0", "wood1", "wood2", "leaf0", "leaf1", "sky0", "sky1", "sky2", "sky3", "floor0", "floor1", "far0", "far1"];
export const SPRITE_MAX = 64;
const TRANSPARENT = new Set([".", " "]);
const charIndex = (ch) => (/[0-9]/.test(ch) ? ch.charCodeAt(0) - 48 : /[a-z]/.test(ch) ? ch.charCodeAt(0) - 87 : -2);

export const spriteSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,23}$/, "sprite id: lowercase letters, digits and dashes, starting with a letter (<= 24 chars)"),
  palette: z.array(colorRef).min(1).max(36).optional().describe("Colors indexed by the pixel chars 0-9 then a-z: role names (keep the look) or hex. Default: the look roles 0 ink, 1 paper, 2 accent, 3 accent2, 4 glow, 5 glow2, 6-8 wall0-2, 9/a metal0/1, b-d wood0-2, e/f leaf0/1, g-j sky0-3, k/l floor0/1, m/n far0/1"),
  frames: z.array(z.array(z.string().min(1).max(SPRITE_MAX)).min(1).max(SPRITE_MAX)).min(1).max(8).describe('Animation frames; each frame is a list of rows, one char per pixel ("." transparent)'),
  fps: z.number().min(0.5).max(24).optional().describe("Frame rate of the frame cycle (default 6)"),
  mirror: z.union([z.boolean(), z.literal("odd")]).optional().describe('true: every row is the left half and is mirrored (even width); "odd": mirrored around the last column'),
  glow: z.string().max(36).optional().describe("Pixel chars that emit light (drawn on the bloom pass too)"),
  anchor: z.enum(["bottom", "center", "top"]).optional().describe("Point placed at the actor's y (default bottom)"),
});

const mirrorRow = (r, mode) => (mode === "odd" ? r + [...r.slice(0, -1)].reverse().join("") : mode ? r + [...r].reverse().join("") : r);

/** Validation messages of one sprite: [{path: (string|number)[], message}] (paths relative to the sprite). */
export function spriteIssues(s) {
  const out = [];
  const pal = s.palette ?? SPRITE_DEFAULT_PALETTE;
  const h0 = s.frames[0].length;
  const w0 = s.frames[0][0].length;
  s.frames.forEach((rows, fi) => {
    if (rows.length !== h0) out.push({ path: ["frames", fi], message: `frame ${fi} has ${rows.length} rows, frame 0 has ${h0}; every frame must be the same size` });
    rows.forEach((r, ri) => {
      if (r.length !== w0) out.push({ path: ["frames", fi, ri], message: `row ${ri} has ${r.length} pixels, row 0 of frame 0 has ${w0}; every row must be the same length (use "." for transparent)` });
      for (const ch of r) {
        if (TRANSPARENT.has(ch)) continue;
        const k = charIndex(ch);
        if (k < 0) {
          out.push({ path: ["frames", fi, ri], message: `unknown pixel character "${ch}"; use "." for transparent and 0-9 / a-z (lowercase) for palette indexes` });
          break;
        }
        if (k >= pal.length) {
          out.push({ path: ["frames", fi, ri], message: `pixel "${ch}" is palette index ${k} but the palette has ${pal.length} colors${s.palette ? "" : " (default role palette)"}` });
          break;
        }
      }
    });
  });
  const w = s.mirror === "odd" ? w0 * 2 - 1 : s.mirror ? w0 * 2 : w0;
  if (w > SPRITE_MAX) out.push({ path: ["frames"], message: `sprite is ${w} pixels wide after mirroring; the maximum is ${SPRITE_MAX}` });
  for (const ch of s.glow ?? "") if (charIndex(ch) < 0) out.push({ path: ["glow"], message: `glow "${ch}" is not a palette char (0-9, a-z)` });
  return out;
}

/** Parsed sprite: frames as index grids (-1 transparent), size, palette refs and glowing indexes. */
export function parseSprite(s) {
  const frames = s.frames.map((rows) => rows.map((r) => [...mirrorRow(r, s.mirror)].map((ch) => (TRANSPARENT.has(ch) ? -1 : charIndex(ch)))));
  const h = frames[0].length;
  const w = frames[0].reduce((m, r) => Math.max(m, r.length), 0);
  return {
    id: s.id,
    w,
    h,
    frames,
    palette: s.palette ?? SPRITE_DEFAULT_PALETTE,
    glow: new Set([...(s.glow ?? "")].map(charIndex).filter((k) => k >= 0)),
    fps: s.fps ?? 6,
    anchor: s.anchor ?? "bottom",
  };
}

const libCache = new WeakMap();
/** Every sprite of a spec by id (sprites are defined in any scene's `pixel.sprites` and shared by the whole video). */
export function spriteLibrary(spec) {
  if (spec && typeof spec === "object" && libCache.has(spec)) return libCache.get(spec);
  const lib = new Map();
  for (const s of spec?.scenes ?? []) for (const sp of s.visual?.pixel?.sprites ?? []) if (!lib.has(sp.id)) lib.set(sp.id, parseSprite(sp));
  if (spec && typeof spec === "object") libCache.set(spec, lib);
  return lib;
}

// ---------------- motion ----------------

export const EASES = ["linear", "in", "out", "in-out", "back", "bounce", "elastic", "step"];
export const MOTION_PRESETS = ["bob", "float", "sway", "walk-across", "jump", "shake", "spin", "pulse", "orbit", "pop-in", "slide-in-left", "slide-in-right", "fall", "blink", "flicker"];

const presetName = z.enum(MOTION_PRESETS, { error: (iss) => `unknown motion preset${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${MOTION_PRESETS.join(", ")}` });
const presetObject = z.object({
  type: presetName,
  at: momentAt.optional().describe("Start (seconds or a word moment; default 0)"),
  duration: z.number().min(0.05).max(60).optional(),
  amount: z.number().min(-400).max(400).optional().describe("Size of the move in pixels (pulse: scale delta; walk-across: negative walks right to left)"),
  speed: z.number().min(0.05).max(10).optional().describe("Cycles per second multiplier"),
  loop: z.boolean().optional().describe("Repeat a one-shot preset (jump, shake, pop-in...)"),
});
export const motionKeySchema = z.object({
  at: momentAt,
  x: z.number().min(-1).max(2).optional().describe("Horizontal position, 0..1 of the view"),
  y: z.number().min(-1).max(2).optional().describe("Vertical position, 0..1 of the view (the element's anchor)"),
  scale: z.number().min(0).max(8).optional(),
  rotate: z.number().min(-1440).max(1440).optional().describe("Degrees"),
  opacity: z.number().min(0).max(1).optional().describe("Dithered, so it stays pixel art"),
  frame: z.number().int().min(0).max(7).optional().describe("Sprite frame (held until the next key)"),
  ease: z.enum(EASES).optional().describe("Easing of the segment arriving at this key"),
});
export const motionSchema = z
  .union([
    presetName,
    z.array(z.union([presetName, presetObject])).min(1).max(6),
    z.object({
      keys: z.array(motionKeySchema).min(1).max(16).optional(),
      presets: z.array(z.union([presetName, presetObject])).max(6).optional(),
      ease: z.enum(EASES).optional().describe("Default easing between keys (default in-out)"),
    }),
  ], { error: unionError })
  .describe('Animation: a preset name ("bob"), a list of presets, or {keys: [{at, x, y, scale, rotate, opacity, frame, ease}], presets}');

/** Motion in one shape: {keys, presets: [{type, ...}], ease}. */
export function normalizeMotion(m) {
  if (!m) return { keys: [], presets: [], ease: "in-out" };
  const pre = (q) => (typeof q === "string" ? { type: q } : q);
  if (typeof m === "string") return { keys: [], presets: [{ type: m }], ease: "in-out" };
  if (Array.isArray(m)) return { keys: [], presets: m.map(pre), ease: "in-out" };
  return { keys: m.keys ?? [], presets: (m.presets ?? []).map(pre), ease: m.ease ?? "in-out" };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Easing curve value at p (0..1). */
export function ease(name, p) {
  const x = clamp01(p);
  switch (name) {
    case "linear":
      return x;
    case "in":
      return x * x * x;
    case "out":
      return 1 - (1 - x) ** 3;
    case "back": {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
    }
    case "bounce": {
      const n1 = 7.5625, d1 = 2.75;
      let v = x;
      if (v < 1 / d1) return n1 * v * v;
      if (v < 2 / d1) return n1 * (v -= 1.5 / d1) * v + 0.75;
      if (v < 2.5 / d1) return n1 * (v -= 2.25 / d1) * v + 0.9375;
      return n1 * (v -= 2.625 / d1) * v + 0.984375;
    }
    case "elastic":
      return x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin(((x * 10 - 0.75) * 2 * Math.PI) / 3) + 1;
    case "step":
      return x < 1 ? 0 : 1;
    default:
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  }
}

const CHANNELS = ["x", "y", "scale", "rotate", "opacity", "frame"];

/** Value of each keyed channel at t (seconds); a channel nobody keyed stays undefined. */
export function interpolateKeys(keys, t, defaultEase = "in-out", resolve = (a) => a) {
  const ks = keys.map((k) => ({ ...k, t: resolve(k.at) })).sort((a, b) => a.t - b.t);
  const out = {};
  for (const c of CHANNELS) {
    const pts = ks.filter((k) => k[c] !== undefined);
    if (!pts.length) continue;
    if (t <= pts[0].t) out[c] = pts[0][c];
    else if (t >= pts[pts.length - 1].t) out[c] = pts[pts.length - 1][c];
    else {
      let i = 0;
      while (pts[i + 1].t < t) i++;
      const a = pts[i], b = pts[i + 1];
      if (c === "frame") out[c] = a[c];
      else {
        const e = ease(b.ease ?? defaultEase, (t - a.t) / Math.max(1e-6, b.t - a.t));
        out[c] = a[c] + (b[c] - a[c]) * e;
      }
    }
  }
  return out;
}

const PRESET_DEFAULTS = {
  bob: { amount: 2, speed: 1.6 },
  float: { amount: 5, speed: 1 },
  sway: { amount: 8, speed: 1 },
  "walk-across": { amount: 1, speed: 1 },
  jump: { amount: 28, duration: 0.55 },
  shake: { amount: 2, duration: 0.5 },
  spin: { amount: 0, speed: 1 },
  pulse: { amount: 0.12, speed: 1.5 },
  orbit: { amount: 24, speed: 0.5 },
  "pop-in": { amount: 0, duration: 0.35 },
  "slide-in-left": { amount: 170, duration: 0.5 },
  "slide-in-right": { amount: 170, duration: 0.5 },
  fall: { amount: 240, duration: 0.7 },
  blink: { amount: 0, speed: 1 },
  flicker: { amount: 0.3, speed: 1 },
};

/**
 * State of an animated element at time t (seconds into the scene).
 * @param motion  the element's motion (any accepted shape)
 * @param {{resolve?: (at) => number, sceneSec?: number, frames?: number, fps?: number, seed?: string}} o
 * @returns {{x?: number, y?: number, dx: number, dy: number, scale: number, rotate: number, opacity: number,
 *   frame: number, visible: boolean, flip: boolean | null}}  x/y absolute (0..1) only when a key or walk-across sets them;
 *   dx/dy are pixel offsets; frame is the sprite frame to draw.
 */
export function motionState(motion, t, o = {}) {
  const resolve = o.resolve ?? ((a) => (typeof a === "number" ? a : 0));
  const sceneSec = o.sceneSec ?? 5;
  const frames = o.frames ?? 1;
  const fps = o.fps ?? 6;
  const m = normalizeMotion(motion);
  const k = interpolateKeys(m.keys, t, m.ease, resolve);
  const s = { x: k.x, y: k.y, dx: 0, dy: 0, scale: k.scale ?? 1, rotate: k.rotate ?? 0, opacity: k.opacity ?? 1, frame: 0, visible: true, flip: null };
  let cycle = frames > 1 && k.frame === undefined;
  let frameOverride = k.frame;
  for (const q of m.presets) {
    const d = { ...PRESET_DEFAULTS[q.type], ...Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined)) };
    const start = resolve(q.at ?? 0);
    let u = t - start;
    const dur = d.duration ?? Math.max(0.1, sceneSec - start);
    if (d.loop && d.duration && u > 0) u %= d.duration + 0.4;
    const p = clamp01(u / dur);
    const w = 2 * Math.PI * (d.speed ?? 1);
    switch (q.type) {
      case "bob":
        if (u >= 0) s.dy += Math.round(Math.sin(w * u) * d.amount);
        break;
      case "float":
        if (u >= 0) {
          s.dy += Math.round(Math.sin(w * 0.5 * u) * d.amount);
          s.dx += Math.round(Math.sin(w * 0.31 * u + 1) * d.amount * 0.4);
        }
        break;
      case "sway":
        if (u >= 0) s.rotate += Math.sin(w * 0.6 * u) * d.amount;
        break;
      case "walk-across": {
        const dir = d.amount < 0 ? -1 : 1;
        const e = clamp01(u / dur);
        s.x = dir > 0 ? -0.15 + 1.3 * e : 1.15 - 1.3 * e;
        if (u >= 0 && e < 1) s.dy -= Math.floor(u * 8 * (d.speed ?? 1)) % 2;
        s.flip = dir < 0;
        cycle = frames > 1 && frameOverride === undefined;
        break;
      }
      case "jump":
        if (u >= 0 && u <= dur) s.dy -= Math.round(4 * d.amount * p * (1 - p));
        break;
      case "shake":
        if (u >= 0 && u <= dur) s.dx += (Math.floor(u * 15) % 2 ? 1 : -1) * Math.max(1, Math.round(d.amount * (1 - p)));
        break;
      case "spin":
        if (u >= 0) s.rotate += 360 * (d.speed ?? 1) * (q.duration ? Math.min(u, dur) : u);
        break;
      case "pulse":
        if (u >= 0) s.scale *= 1 + d.amount * (0.5 + 0.5 * Math.sin(w * u));
        break;
      case "orbit":
        if (u >= 0) {
          s.dx += Math.round(Math.cos(w * u) * d.amount);
          s.dy += Math.round(Math.sin(w * u) * d.amount * 0.45);
        }
        break;
      case "pop-in":
        if (u < 0) s.visible = false;
        else s.scale *= u >= dur ? 1 : Math.max(0, ease("back", p));
        break;
      case "slide-in-left":
      case "slide-in-right": {
        const off = (1 - ease("back", u < 0 ? 0 : p)) * d.amount;
        s.dx += Math.round(q.type === "slide-in-left" ? -off : off);
        break;
      }
      case "fall":
        if (u < 0) s.visible = false;
        else s.dy -= Math.round((1 - ease("bounce", p)) * d.amount);
        break;
      case "blink": {
        const period = 3.2 / (d.speed ?? 1);
        const ph = u >= 0 ? u % period : 1;
        cycle = false;
        if (ph > period - 0.13) frameOverride = frames > 1 ? frames - 1 : frameOverride;
        if (frames <= 1 && ph > period - 0.08) s.visible = false;
        break;
      }
      case "flicker":
        if (u >= 0 && (q.duration === undefined || u <= dur) && h01(o.seed ?? "f", Math.floor(u * 14)) < d.amount) s.visible = false;
        break;
      default:
        break;
    }
  }
  s.frame = frameOverride !== undefined ? Math.min(frames - 1, Math.max(0, Math.round(frameOverride))) : cycle ? Math.floor(t * fps) % frames : 0;
  if (s.opacity <= 0.02) s.visible = false;
  return s;
}

// ---------------- custom sets ----------------

export const LAYER_TYPES = ["skyline", "mountains", "hills", "dunes", "waves", "forest", "clouds", "ground", "tiles", "grid", "sprite", "rect", "circle"];
export const DEPTHS = ["far", "mid", "subject", "near"];
/** Default depth and baseline (0..1 of the view height) per layer type. */
export const LAYER_DEFAULTS = {
  skyline: { depth: "far", y: 0.6, height: 0.3 },
  mountains: { depth: "far", y: 0.58, height: 0.3 },
  hills: { depth: "mid", y: 0.62, height: 0.12 },
  dunes: { depth: "mid", y: 0.64, height: 0.1 },
  waves: { depth: "mid", y: 0.64, height: 0.4 },
  forest: { depth: "mid", y: 0.6, height: 0.2 },
  clouds: { depth: "far", y: 0.18, height: 0.2 },
  ground: { depth: "mid", y: 0.59, height: 0.41 },
  tiles: { depth: "mid", y: 0.59, height: 0.41 },
  grid: { depth: "mid", y: 0.6, height: 0.4 },
  sprite: { depth: "subject", y: 0.59, height: 0 },
  rect: { depth: "mid", y: 0.4, height: 0.1 },
  circle: { depth: "far", y: 0.2, height: 0 },
};
export const LAYER_VARIANTS = {
  skyline: ["city", "towers", "ruins", "domes"],
  forest: ["pine", "round", "palm", "dead", "crystal"],
  ground: ["plain", "grass", "stone", "planks", "sand", "metal", "snow"],
  tiles: ["checker", "brick", "grid", "hex"],
  clouds: ["puffy", "streaks"],
};
const ALL_VARIANTS = [...new Set(Object.values(LAYER_VARIANTS).flat())];

const frac = (lo = 0, hi = 1) => z.number().min(lo).max(hi);
export const layerSchema = z.object({
  type: z.enum(LAYER_TYPES, { error: (iss) => `unknown set layer type${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${LAYER_TYPES.join(", ")}` }),
  depth: z.enum(DEPTHS).optional().describe("Parallax plane: far (blurred, slow), mid, subject (crisp), near (dark, blurred foreground)"),
  seed: z.number().int().min(0).max(999999).optional().describe("Changes the generated shapes; every video should use new seeds"),
  color: colorRef.optional(),
  color2: colorRef.optional().describe("Highlight / second color (snow caps, lit windows, wave crests, tile B)"),
  y: frac(-0.2, 1.2).optional().describe("Baseline (or top for ground/tiles/grid/rect) as 0..1 of the view height"),
  height: frac(0, 1).optional().describe("Max height as 0..1 of the view height"),
  x: frac(-0.5, 1.5).optional(),
  w: frac(0, 2).optional(),
  r: frac(0, 1).optional().describe("circle radius as 0..1 of the view width"),
  density: frac().optional(),
  lit: frac().optional().describe("Amount of glowing details (windows, crystals, grid glow)"),
  speed: z.number().min(-8).max(8).optional().describe("Drift in pixels per second (clouds, waves, grid scroll)"),
  variant: z.enum(ALL_VARIANTS).optional(),
  sprite: z.string().optional().describe("sprite layer: id of a sprite"),
  count: z.number().int().min(1).max(24).optional().describe("sprite layer: copies spread across the view"),
  scale: z.number().min(1).max(8).optional(),
  flip: z.boolean().optional(),
  glow: z.boolean().optional().describe("Emissive: also drawn on the bloom pass"),
  ring: z.boolean().optional().describe("circle: draw a ring instead of a disc"),
  motion: motionSchema.optional(),
});

export const skySchema = z.object({
  gradient: z.array(colorRef).min(1).max(6).describe("Top -> horizon colors (dithered)"),
  stars: z.union([z.boolean(), z.number().int().min(0).max(300)]).optional(),
  moon: z.union([z.boolean(), z.object({ x: frac(), y: frac(), r: frac(0, 0.3).optional() })]).optional(),
  sun: z.union([z.boolean(), z.object({ x: frac(), y: frac(), r: frac(0, 0.3).optional() })]).optional(),
  aurora: z.union([z.boolean(), colorRef]).optional().describe("Waving aurora ribbons"),
  horizon: frac(0.1, 1).optional().describe("Where the sky gradient ends (default 0.62)"),
});

export const customSetSchema = z.object({
  sky: skySchema.optional(),
  floor: frac(0.3, 0.95).optional().describe("Where characters and props stand, 0..1 of the view height (default 0.59)"),
  layers: z.array(layerSchema).max(16).default([]),
});

/** Height profile (pixels, >= 0) of a terrain layer across `n` columns; deterministic per seed. */
export function ridgeProfile(type, seed, n, height) {
  const out = new Array(n).fill(0);
  if (type === "mountains") {
    // midpoint displacement on a power-of-two grid, then a few peaks emphasized
    let size = 1;
    while (size < n) size *= 2;
    const pts = new Array(size + 1).fill(0);
    pts[0] = h01(seed, "m0");
    pts[size] = h01(seed, "m1");
    let step = size, rough = 0.62;
    let amp = 1;
    while (step > 1) {
      const half = step / 2;
      for (let i = half; i < size; i += step) pts[i] = (pts[i - half] + pts[i + half]) / 2 + (h01(seed, `d${i}`) - 0.5) * amp;
      amp *= rough;
      step = half;
    }
    const lo = Math.min(...pts), hi = Math.max(...pts);
    for (let x = 0; x < n; x++) out[x] = Math.round((0.18 + (0.82 * (pts[x] - lo)) / Math.max(1e-6, hi - lo)) * height);
    return out;
  }
  const waves = [0, 1, 2].map((k) => ({ f: (0.008 + h01(seed, `f${k}`) * 0.03) * (k + 1), ph: h01(seed, `p${k}`) * 6.283, a: 1 / (k + 1) }));
  const sum = waves.reduce((a, w) => a + w.a, 0);
  for (let x = 0; x < n; x++) {
    let v = 0;
    for (const w of waves) {
      const s = Math.sin(x * w.f + w.ph);
      // dunes: sharp crests (1 - |sin|) inverted; hills: smooth
      v += w.a * (type === "dunes" ? 1 - Math.abs(Math.cos((x * w.f + w.ph) / 2)) * 1 : 0.5 + 0.5 * s);
    }
    out[x] = Math.round((0.35 + (0.65 * v) / sum) * height);
  }
  return out;
}

/** Buildings of a skyline from x0 to x1: [{x, w, h, roof, antenna}]; deterministic per seed. */
export function skylineBlocks(seed, x0, x1, maxH, variant = "city") {
  const out = [];
  let x = x0, i = 0;
  while (x < x1 && i < 200) {
    const w = (variant === "towers" ? 8 : 12) + Math.floor(h01(seed, `w${i}`) * (variant === "towers" ? 12 : 22));
    const h = Math.round(maxH * (0.3 + 0.7 * h01(seed, `h${i}`)));
    out.push({ x, w, h, roof: Math.floor(h01(seed, `r${i}`) * 4), antenna: h01(seed, `a${i}`) > 0.62 });
    x += w + (h01(seed, `g${i}`) > 0.7 ? 2 : 0);
    i++;
  }
  return out;
}

/** Trees of a forest row from x0 to x1: [{x, h, w, k}]; deterministic per seed. */
export function forestTrees(seed, x0, x1, maxH, density = 0.6) {
  const out = [];
  const gap = Math.max(5, Math.round(26 - density * 20));
  let i = 0;
  for (let x = x0; x < x1; x += gap) {
    const jitter = Math.round((h01(seed, `j${i}`) - 0.5) * gap);
    const h = Math.round(maxH * (0.45 + 0.55 * h01(seed, `t${i}`)));
    out.push({ x: x + jitter, h, w: Math.max(5, Math.round(h * (0.35 + 0.2 * h01(seed, `wd${i}`)))), k: h01(seed, `k${i}`) });
    i++;
  }
  return out;
}

// ---------------- fx ----------------

export const PARTICLE_FX = ["sparks", "embers", "rain", "snow", "confetti", "dust", "stars", "smoke", "bubbles", "leaves", "fireflies"];
export const ONE_SHOT_FX = ["burst", "shockwave", "lightning", "flash"];
export const SCREEN_FX = ["rays", "bloom", "glitch", "crt", "shake", "chromatic", "pixelate-in", "pixelate-out", "dissolve-in", "dissolve-out"];
export const FX_TYPES = [...PARTICLE_FX, ...ONE_SHOT_FX, ...SCREEN_FX];
/** Default duration (seconds) of the effects that are not ambient. */
export const FX_DURATION = { burst: 0.9, shockwave: 0.7, lightning: 0.55, flash: 0.35, shake: 0.5, glitch: 0.6, chromatic: 0.6, "pixelate-in": 0.6, "pixelate-out": 0.6, "dissolve-in": 0.6, "dissolve-out": 0.6 };

export const fxSchema = z.object({
  type: z.enum(FX_TYPES, { error: (iss) => `unknown pixel fx${iss.input === undefined ? "" : ` "${iss.input}"`}; use one of: ${FX_TYPES.join(", ")}` }),
  at: momentAt.optional().describe("Start: seconds or a word moment (default: 0; pixelate-out / dissolve-out: the end of the scene)"),
  duration: z.number().min(0.05).max(60).optional().describe("Seconds (default: ambient effects last the scene, one-shots ~0.5 s)"),
  intensity: frac().optional().describe("0..1 (default 0.6)"),
  color: colorRef.optional(),
  x: frac(-0.2, 1.2).optional().describe("Origin / target, 0..1 of the view (burst, sparks, lightning, rays, shockwave)"),
  y: frac(-0.2, 1.2).optional(),
  area: z.object({ x: frac(), y: frac(), w: frac(), h: frac() }).optional().describe("Particle area, 0..1 of the view (default: the whole view)"),
  angle: z.number().min(-180).max(180).optional().describe("rays: direction in degrees (90 = down); rain: wind slant"),
  depth: z.enum(["back", "front"]).optional().describe("Particles behind or in front of the subject (default front)"),
  loop: z.boolean().optional().describe("Repeat a one-shot every second or so"),
});

/** Start, duration and loop phase of an fx at time t: {active, u (seconds since start), p (0..1)}. */
export function fxWindow(f, t, sceneSec, resolve = (a) => (typeof a === "number" ? a : 0)) {
  const out = f.type === "pixelate-out" || f.type === "dissolve-out";
  const dur = f.duration ?? FX_DURATION[f.type] ?? Math.max(0.1, sceneSec);
  const start = f.at !== undefined ? resolve(f.at) : out ? Math.max(0, sceneSec - dur) : f.type in FX_DURATION && !SCREEN_FX.includes(f.type) ? 0.4 : 0;
  let u = t - start;
  if (f.loop && u > 0) u %= dur + 0.6;
  const active = u >= 0 && u <= dur;
  return { active, u, p: clamp01(u / dur), dur, start };
}

/**
 * Particles of an ambient effect at time t: [{x, y, s (size), a (0..1 strength), k (0..1 variant)}] in view pixels.
 * Stateless (each particle loops on its own period) so any frame can be drawn alone.
 */
/** @param {string} type @param {{seed?: string, t?: number, area?: {x: number, y: number, w: number, h: number}, intensity?: number, origin?: {x: number, y: number} | null, angle?: number}} [opts] */
export function particlesAt(type, { seed = "fx", t = 0, area = { x: 0, y: 0, w: 270, h: 480 }, intensity = 0.6, origin = null, angle = 0 } = {}) {
  const base = { rain: 70, snow: 60, confetti: 50, embers: 40, dust: 30, stars: 26, smoke: 12, bubbles: 22, leaves: 18, fireflies: 16, sparks: 36 }[type] ?? 30;
  const n = Math.max(3, Math.round(base * (0.3 + intensity)));
  const out = [];
  const { x: ax, y: ay, w: aw, h: ah } = area;
  const wind = Math.tan(((angle || 0) * Math.PI) / 180);
  for (let i = 0; i < n; i++) {
    const r1 = h01(seed, `${type}a${i}`), r2 = h01(seed, `${type}b${i}`), r3 = h01(seed, `${type}c${i}`);
    let x = ax + r1 * aw, y = ay + r2 * ah, s = 1, a = 1;
    switch (type) {
      case "rain": {
        const P = 0.45 + r3 * 0.35;
        const q = (t / P + r2) % 1;
        y = ay - 8 + q * (ah + 16);
        x = ax + ((r1 * aw + wind * q * ah * 0.4) % aw + aw) % aw;
        s = 3 + Math.round(r3 * 3);
        break;
      }
      case "snow": {
        const P = 6 + r3 * 6;
        const q = (t / P + r2) % 1;
        y = ay - 4 + q * (ah + 8);
        x = ax + r1 * aw + Math.sin(t * (0.6 + r3) + i) * 4;
        s = r3 > 0.75 ? 2 : 1;
        break;
      }
      case "confetti": {
        const P = 3 + r3 * 2.5;
        const q = (t / P + r2) % 1;
        y = ay - 4 + q * (ah + 8);
        x = ax + r1 * aw + Math.sin(t * 2.2 + i) * 6;
        s = Math.floor(t * 8 + i) % 2 ? 2 : 1;
        break;
      }
      case "embers":
      case "smoke":
      case "bubbles": {
        const P = type === "smoke" ? 3.5 + r3 * 2 : type === "bubbles" ? 3 + r3 * 3 : 2 + r3 * 2.5;
        const q = (t / P + r2) % 1;
        y = ay + ah + 4 - q * (ah + 8);
        x = ax + r1 * aw + Math.sin(t * (1.3 + r3) + i * 2) * (type === "smoke" ? 6 : 4) + (type === "smoke" ? q * 10 : 0);
        a = type === "embers" ? 1 - q : type === "smoke" ? (1 - q) * 0.8 : 1;
        s = type === "smoke" ? 2 + Math.round(q * 8) : type === "bubbles" ? 1 + Math.round(r3 * 2) : r3 > 0.7 ? 2 : 1;
        break;
      }
      case "leaves": {
        const P = 4 + r3 * 4;
        const q = (t / P + r2) % 1;
        y = ay - 4 + q * (ah + 8);
        x = ax + r1 * aw + Math.sin(t * 1.4 + i) * 12;
        s = Math.floor(t * 4 + i) % 3;
        break;
      }
      case "dust":
        x = ax + ((((r1 * aw + t * (2 + (i % 4))) % (aw + 20)) + aw + 20) % (aw + 20)) - 10;
        y = ay + ((((r2 * ah - t * (1.5 + (i % 3))) % ah) + ah) % ah);
        a = Math.sin(t * 1.7 + i) > -0.4 ? 1 : 0;
        break;
      case "stars": {
        const P = 1.2 + r3 * 1.6;
        const q = (t / P + r3 * 7) % 1;
        a = Math.max(0, Math.sin(q * Math.PI));
        s = a > 0.8 ? 2 : a > 0.35 ? 1 : 0;
        break;
      }
      case "fireflies":
        x = ax + r1 * aw + Math.sin(t * (0.5 + r3) + i) * 10;
        y = ay + r2 * ah + Math.cos(t * (0.4 + r3 * 0.5) + i * 2) * 7;
        a = 0.5 + 0.5 * Math.sin(t * (2 + r3 * 2) + i);
        s = a > 0.6 ? 2 : 1;
        break;
      case "sparks": {
        const o = origin ?? { x: ax + aw / 2, y: ay + ah / 2 };
        const P = 0.5 + r3 * 0.5;
        const q = (t / P + r2) % 1;
        const ang = r1 * Math.PI * 2;
        const v = 18 + r3 * 34;
        x = o.x + Math.cos(ang) * v * q;
        y = o.y + Math.sin(ang) * v * q * 0.8 + q * q * 26;
        a = 1 - q;
        s = q < 0.3 ? 2 : 1;
        break;
      }
      default:
        break;
    }
    out.push({ x: Math.round(x), y: Math.round(y), s, a, k: r3 });
  }
  return out;
}

/** A one-shot pixel explosion u seconds after it starts: debris particles flying out with gravity. */
export function burstAt(u, { seed = "b", origin = { x: 135, y: 240 }, intensity = 0.6 } = {}) {
  const n = Math.round(24 + 40 * intensity);
  const out = [];
  for (let i = 0; i < n; i++) {
    const ang = h01(seed, `ba${i}`) * Math.PI * 2;
    const v = (30 + h01(seed, `bv${i}`) * 90) * (0.6 + intensity * 0.6);
    const life = 0.45 + h01(seed, `bl${i}`) * 0.5;
    if (u < 0 || u > life) continue;
    const q = u / life;
    out.push({ x: Math.round(origin.x + Math.cos(ang) * v * u), y: Math.round(origin.y + Math.sin(ang) * v * u + 70 * u * u), s: q < 0.35 ? 2 : 1, a: 1 - q, k: h01(seed, `bk${i}`) });
  }
  return out;
}

/** Jagged lightning bolt from (x0, y0) to (x1, y1) with one or two branches: list of polylines. */
export function boltPath(seed, x0, y0, x1, y1, segments = 12) {
  const main = [];
  for (let i = 0; i <= segments; i++) {
    const p = i / segments;
    const j = i === 0 || i === segments ? 0 : (h01(seed, `j${i}`) - 0.5) * 22;
    main.push([Math.round(x0 + (x1 - x0) * p + j), Math.round(y0 + (y1 - y0) * p)]);
  }
  const lines = [main];
  for (const b of [0, 1]) {
    const at = 3 + Math.floor(h01(seed, `br${b}`) * (segments - 6));
    const [sx, sy] = main[at];
    const dir = h01(seed, `bd${b}`) > 0.5 ? 1 : -1;
    const br = [[sx, sy]];
    for (let k = 1; k <= 4; k++) br.push([Math.round(sx + dir * k * (6 + h01(seed, `bx${b}${k}`) * 6)), Math.round(sy + k * (8 + h01(seed, `by${b}${k}`) * 6))]);
    lines.push(br);
  }
  return lines;
}
