// 2D effects of the illustrated kit and the classic templates (`visual.fx`): particles, splashes, doodles, bursts and
// camera/screen hits. Same field names as the pixel and 3D fx (type, at, until, target, color, count, size, seed).
// Pure and deterministic (seeded; every value is a function of time): src/components/Fx2D.tsx draws them, tinted by
// the look. Coordinates are frame pixels (1080 x 1920). No Node built-ins.
import { z } from "zod";
import { EASE, hash01, momentSchema, smooth } from "./motion.mjs";
import { DRAW_ROLES } from "./drawing-schema.mjs";
import { momentError } from "./scene3d-motion.mjs";

export const FX2D_ABOUT = {
  sparkles: "twinkling four-point glints around `target` (or the stage)",
  confetti: "paper confetti falling in the palette colors",
  dust: "soft motes drifting in the light (behind by default)",
  bubbles: "bubbles rising and wobbling",
  leaves: "leaves falling and swaying",
  stars: "five-point stars twinkling in place",
  "ink-splash": "an ink / paint splat lands behind `target` at `at` and stays",
  "light-leak": "warm film light drifting across the frame",
  grain: "film grain over the whole frame",
  scribbles: "hand-drawn doodles (spirals, stars, zigzags, !) drawn on around `target` at `at`",
  burst: "shapes burst out of `target` at `at`",
  flash: "a quick screen flash at `at`",
  "zoom-punch": "the camera punches in at `at` and settles",
  shake: "camera shake at `at`",
  glitch: "digital glitch slices at `at`",
  chromatic: "RGB split at `at`",
  "speed-lines": "manga speed lines converging on `target` (or the center)",
};
export const FX2D_TYPES = Object.keys(FX2D_ABOUT);
export const PARTICLE_FX2D = ["sparkles", "confetti", "dust", "bubbles", "leaves", "stars"];
/** Seconds of the one-shot effects (ink-splash and scribbles then stay until `until`). */
export const FX2D_DURATION = { "ink-splash": 0.45, scribbles: 0.9, burst: 0.9, flash: 0.35, "zoom-punch": 0.45, shake: 0.5, glitch: 0.5, chromatic: 0.6 };
const HOLDS = ["ink-splash", "scribbles"];
/** Effects drawn behind the scene content unless `depth` says otherwise. */
export const FX2D_BACK = ["ink-splash", "dust", "light-leak"];
export const MAX_FX2D = 8;

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const color = z.string().refine((s) => HEX_RE.test(s) || DRAW_ROLES.includes(s), { message: `must be a palette role (${DRAW_ROLES.join(", ")}) or a hex color` });
const frac = z.number().min(0).max(1);

export const fx2dSchema = z
  .object({
    type: z.enum(FX2D_TYPES),
    at: momentSchema.optional().describe("Start: seconds or a word moment (default: one-shots 0.5 s, ambient effects the scene start)"),
    until: momentSchema.optional().describe("End (default: one-shots their own length; ambient, ink-splash and scribbles the scene end)"),
    target: z.string().min(1).max(81).optional().describe('Element id (illustrated), the drawing id (classic) or "drawing/part"'),
    color: color.optional().describe("Main color (default: tinted by the look)"),
    count: z.number().int().min(3).max(200).optional(),
    size: z.number().min(0.2).max(4).optional().describe("Size multiplier"),
    seed: z.union([z.number().int().min(0).max(1e6), z.string().min(1).max(24)]).optional().describe("Change it to get another arrangement"),
    depth: z.enum(["back", "front"]).optional().describe("Behind or in front of the scene content"),
    x: frac.optional().describe("Origin 0..1 of the frame width when there is no target"),
    y: frac.optional(),
    intensity: frac.optional().describe("0..1 (default 0.6)"),
  })
  .strict();

// ---------------- timing ----------------

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const TAU = 2 * Math.PI;

/**
 * Window of an fx at t (seconds into the scene): {active, u (seconds since start), p (0..1 of its own length),
 * start, end}. `sec` resolves moments. One-shots last FX2D_DURATION (or until `until`); ink-splash and scribbles grow
 * for that long and then stay until `until` / the scene end; ambient effects span at..until.
 */
export function fx2dWindow(f, t, sceneSec, sec) {
  const oneShot = f.type in FX2D_DURATION;
  const start = f.at !== undefined ? sec(f.at) : oneShot ? Math.min(0.5, sceneSec / 3) : 0;
  const hold = HOLDS.includes(f.type);
  const dur = oneShot ? (f.until !== undefined && !hold ? Math.max(0.05, sec(f.until) - start) : FX2D_DURATION[f.type]) : Math.max(0.05, (f.until !== undefined ? sec(f.until) : sceneSec) - start);
  const end = hold || !oneShot ? (f.until !== undefined ? sec(f.until) : Math.max(sceneSec, start + dur)) : start + dur;
  const u = t - start;
  return { active: u >= 0 && t <= end, u, p: clamp01(u / dur), start, end, dur };
}

/** Fade envelope of an ambient effect (0.35 s in and out). */
export const fx2dEnvelope = (w) => (w.active ? smooth(w.u / 0.35) * smooth((w.end - (w.start + w.u)) / 0.35) : 0);

/**
 * Camera and screen state from the scene's fx at t: {x, y (px), scale, glitch (0..1), chroma (0..1)}.
 */
export function fx2dCamera(fx, t, sceneSec, sec) {
  let x = 0;
  let y = 0;
  let scale = 1;
  let glitch = 0;
  let chroma = 0;
  (fx ?? []).forEach((f, i) => {
    if (!["zoom-punch", "shake", "glitch", "chromatic"].includes(f.type)) return;
    const w = fx2dWindow(f, t, sceneSec, sec);
    if (!w.active) return;
    const k = f.size ?? 1;
    const seed = f.seed ?? i;
    if (f.type === "zoom-punch") scale += 0.09 * k * (1 - EASE.out(w.p));
    else if (f.type === "shake") {
      const amp = 16 * k * (1 - w.p);
      x += amp * Math.sin(TAU * 12 * w.u + hash01(seed, "sx") * TAU);
      y += amp * 0.6 * Math.cos(TAU * 10 * w.u + hash01(seed, "sy") * TAU);
    } else if (f.type === "glitch") {
      const step = Math.floor(w.u * 20);
      glitch = Math.max(glitch, (hash01(seed, "g", step) > 0.3 ? 1 : 0.35) * (1 - smooth((w.p - 0.75) / 0.25)) * Math.min(1, k));
    } else chroma = Math.max(chroma, (1 - EASE.in(w.p)) * Math.min(1.5, k));
  });
  return { x, y, scale, glitch, chroma };
}

// ---------------- particles ----------------

const BASE_COUNT = { sparkles: 14, confetti: 42, dust: 34, bubbles: 16, leaves: 12, stars: 18 };
/**
 * Particles of an ambient effect at time t in frame px: [{x, y, s (size px), rot (deg), a (0..1 alpha), k (0..1
 * variant), c (0..3 palette slot)}]. Stateless: each particle loops on its own period, so any frame draws alone.
 * @param {string} type
 * @param {{seed?: string|number, t?: number, area?: {x: number, y: number, w: number, h: number}, count?: number, size?: number, intensity?: number}} [o]
 */
export function particles2d(type, { seed = "fx", t = 0, area = { x: 90, y: 260, w: 900, h: 1240 }, count, size = 1, intensity = 0.6 } = {}) {
  const n = count ?? Math.max(4, Math.round((BASE_COUNT[type] ?? 20) * (0.4 + intensity)));
  const { x: ax, y: ay, w: aw, h: ah } = area;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r1 = hash01(seed, type, "a", i);
    const r2 = hash01(seed, type, "b", i);
    const r3 = hash01(seed, type, "c", i);
    let x = ax + r1 * aw;
    let y = ay + r2 * ah;
    let s = 1;
    let rot = 0;
    let a = 1;
    switch (type) {
      case "sparkles": {
        const P = 1.1 + r3 * 1.3;
        const q = (t / P + r3 * 5) % 1;
        a = Math.max(0, Math.sin(q * Math.PI)) ** 1.5;
        s = (16 + r3 * 26) * (0.4 + 0.6 * a);
        rot = r1 * 90 + t * 40;
        break;
      }
      case "stars": {
        const P = 1.6 + r3 * 1.8;
        const q = (t / P + r1 * 3) % 1;
        a = 0.35 + 0.65 * Math.max(0, Math.sin(q * Math.PI));
        s = 12 + r3 * 16;
        rot = r2 * 72;
        break;
      }
      case "confetti": {
        const P = 3.2 + r3 * 2.4;
        const q = (t / P + r2) % 1;
        y = ay - 30 + q * (ah + 60);
        x = ax + r1 * aw + Math.sin(t * 2 + i) * 22;
        s = 13 + r3 * 10;
        rot = (r1 * 360 + t * (160 + r3 * 220) * (i % 2 ? 1 : -1)) % 360;
        a = 1;
        break;
      }
      case "leaves": {
        const P = 5 + r3 * 4;
        const q = (t / P + r2) % 1;
        y = ay - 40 + q * (ah + 80);
        x = ax + r1 * aw + Math.sin(t * 1.3 + i * 1.7) * 46;
        s = 26 + r3 * 18;
        rot = Math.sin(t * 1.6 + i) * 55 + r1 * 360;
        break;
      }
      case "bubbles": {
        const P = 3.5 + r3 * 3;
        const q = (t / P + r2) % 1;
        y = ay + ah + 30 - q * (ah + 60);
        x = ax + r1 * aw + Math.sin(t * (1.2 + r3) + i * 2) * 16;
        s = 12 + r3 * 30;
        a = q < 0.9 ? 1 : (1 - q) * 10;
        break;
      }
      case "dust": {
        x = ax + ((((r1 * aw + t * (6 + (i % 5) * 3)) % aw) + aw) % aw);
        y = ay + ((((r2 * ah - t * (4 + (i % 3) * 3)) % ah) + ah) % ah);
        s = 3 + r3 * 6;
        a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * (0.8 + r3) + i));
        break;
      }
      default:
        break;
    }
    out.push({ x: r2d(x), y: r2d(y), s: r2d(s * size), rot: r2d(rot), a: r2d(a), k: r2d(r3), c: i % 4 });
  }
  return out;
}
const r2d = (v) => Math.round(v * 100) / 100;

const BURST_KINDS = ["circle", "tri", "star", "bar", "ring"];
/**
 * Shapes of a burst u seconds after it starts (frame px): [{x, y, s, rot, a, kind, c}]; empty once every shape died.
 * @param {number} u
 * @param {{seed?: string|number, origin?: {x: number, y: number}, count?: number, size?: number, radius?: number}} [o]
 */
export function burst2d(u, { seed = "b", origin = { x: 540, y: 900 }, count = 18, size = 1, radius = 120 } = {}) {
  const out = [];
  if (u < 0) return out;
  for (let i = 0; i < count; i++) {
    const ang = ((i + hash01(seed, "ba", i) * 0.7) / count) * TAU;
    const v = (260 + hash01(seed, "bv", i) * 420) * size;
    const life = 0.5 + hash01(seed, "bl", i) * 0.4;
    if (u > life) continue;
    const q = u / life;
    const d = radius * 0.4 * size + v * (1 - (1 - q) ** 3) * 0.55;
    out.push({
      x: r2d(origin.x + Math.cos(ang) * d),
      y: r2d(origin.y + Math.sin(ang) * d + 60 * q * q),
      s: r2d((14 + hash01(seed, "bs", i) * 18) * size * (1 - q * 0.6)),
      rot: r2d((ang * 180) / Math.PI + q * 200 * (i % 2 ? 1 : -1)),
      a: r2d(q < 0.7 ? 1 : (1 - q) / 0.3),
      kind: BURST_KINDS[Math.floor(hash01(seed, "bk", i) * BURST_KINDS.length)],
      c: i % 4,
    });
  }
  return out;
}

const pt = (x, y) => `${r2d(x)} ${r2d(y)}`;
/** One doodle centered at (cx, cy) with radius r: an SVG path (frame px). */
function doodle(kind, cx, cy, r, seed) {
  const j = (k) => (hash01(seed, kind, k) - 0.5) * r * 0.18;
  switch (kind) {
    case "spiral": {
      let d = `M ${pt(cx, cy)}`;
      for (let a = 0; a <= TAU * 2.2; a += 0.45) d += ` L ${pt(cx + Math.cos(a) * r * (a / (TAU * 2.2)) + j(a), cy + Math.sin(a) * r * (a / (TAU * 2.2)) + j(a + 9))}`;
      return d;
    }
    case "star": {
      let d = "";
      for (let k = 0; k <= 5; k++) {
        const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
        d += `${k ? " L" : "M"} ${pt(cx + Math.cos(a) * r + j(k), cy + Math.sin(a) * r + j(k + 5))}`;
      }
      return d;
    }
    case "zigzag": {
      let d = `M ${pt(cx - r, cy)}`;
      for (let k = 1; k <= 6; k++) d += ` L ${pt(cx - r + (k * 2 * r) / 6, cy + (k % 2 ? -r * 0.35 : r * 0.35) + j(k))}`;
      return d;
    }
    case "exclaim":
      return `M ${pt(cx + j(1), cy - r)} L ${pt(cx + j(2), cy + r * 0.35)} M ${pt(cx, cy + r * 0.75)} L ${pt(cx + 1, cy + r * 0.8)}`;
    case "plus":
      return `M ${pt(cx - r * 0.6, cy + j(1))} L ${pt(cx + r * 0.6, cy + j(2))} M ${pt(cx + j(3), cy - r * 0.6)} L ${pt(cx + j(4), cy + r * 0.6)}`;
    case "rays": {
      let d = "";
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.55;
        d += `${k ? " " : ""}M ${pt(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35)} L ${pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r)}`;
      }
      return d;
    }
    default: {
      // loop: a curly underline
      let d = `M ${pt(cx - r, cy)}`;
      for (let a = 0; a <= TAU * 1.5; a += 0.5) d += ` L ${pt(cx - r + (a / (TAU * 1.5)) * 2 * r + Math.cos(a) * r * 0.25, cy + Math.sin(a) * r * 0.3 + j(a))}`;
      return d;
    }
  }
}
const DOODLES = ["spiral", "star", "zigzag", "exclaim", "plus", "rays", "loop"];

/**
 * Doodles around a box (frame px): [{d, kind, delay (s), r}] placed on the box corners and sides (just outside it),
 * the anchor order and kinds shuffled by the seed.
 */
export function scribbles2d(seed, box, count = 4, size = 1) {
  const anchors = [
    [0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5],
  ];
  const order = anchors.map((a, i) => ({ a, k: hash01(seed, "anchor", i) })).sort((p, q) => p.k - q.k).map((p) => p.a);
  const out = [];
  for (let i = 0; i < count; i++) {
    const [fx, fy] = order[i % order.length];
    const r = (34 + hash01(seed, "r", i) * 26) * size;
    const cx = box.x + fx * box.w + (fx - 0.5) * r * 1.6;
    const cy = box.y + fy * box.h + (fy - 0.5) * r * 1.6;
    const kind = DOODLES[Math.floor(hash01(seed, "kind", i) * DOODLES.length)];
    out.push({ d: doodle(kind, cx, cy, r, `${seed}:${i}`), kind, delay: r2d(i * 0.14), r: r2d(r) });
  }
  return out;
}

/** An ink splat around `origin` with radius r (frame px): {blob (closed path), drops: [{x, y, r}]}. */
export function splash2d(seed, origin, r) {
  const n = 18;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const spike = hash01(seed, "sp", i) > 0.72 ? 1.25 + hash01(seed, "sl", i) * 0.35 : 0.78 + hash01(seed, "rr", i) * 0.22;
    return [origin.x + Math.cos(a) * r * spike, origin.y + Math.sin(a) * r * spike * 0.86];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${pt(...mid(pts[n - 1], pts[0]))}`;
  for (let i = 0; i < n; i++) d += ` Q ${pt(...pts[i])} ${pt(...mid(pts[i], pts[(i + 1) % n]))}`;
  const drops = Array.from({ length: 9 }, (_, i) => {
    const a = hash01(seed, "da", i) * TAU;
    const dist = r * (1.35 + hash01(seed, "dd", i) * 0.7);
    return { x: r2d(origin.x + Math.cos(a) * dist), y: r2d(origin.y + Math.sin(a) * dist * 0.86), r: r2d(r * (0.05 + hash01(seed, "dr", i) * 0.09)) };
  });
  return { blob: `${d} Z`, drops };
}

/** Speed lines converging on `center` (frame px), re-drawn ~15 times a second: [{x1, y1, x2, y2, w}]. */
export function speedLines2d(seed, t, center, count = 44, inner = 260) {
  const step = Math.floor(t * 15);
  const R = inner * 1.7 + 140; // a ring of lines around the target, short of the headline and captions
  return Array.from({ length: count }, (_, i) => {
    const a = ((i + hash01(seed, "la", i, step) * 0.8) / count) * TAU;
    const r0 = inner * (0.85 + hash01(seed, "lr", i, step) * 0.6);
    return {
      x1: r2d(center.x + Math.cos(a) * r0),
      y1: r2d(center.y + Math.sin(a) * r0),
      x2: r2d(center.x + Math.cos(a) * R),
      y2: r2d(center.y + Math.sin(a) * R),
      w: r2d(4 + hash01(seed, "lw", i, step) * 12),
    };
  });
}

/** Soft light blobs of a light leak at t (frame px): [{x, y, r, a, c}]. */
export function lightLeak2d(seed, t) {
  return [0, 1, 2].map((i) => {
    const sp = 0.05 + hash01(seed, "ls", i) * 0.06;
    const x = -200 + (((hash01(seed, "lx", i) + t * sp) % 1.4) * 1480);
    const y = 200 + hash01(seed, "ly", i) * 1500 + Math.sin(t * 0.4 + i) * 120;
    return { x: r2d(x), y: r2d(y), r: r2d(380 + hash01(seed, "lr", i) * 380), a: r2d(0.32 + 0.18 * Math.sin(t * 0.7 + i * 2)), c: i };
  });
}

// ---------------- validation ----------------

/**
 * Cross-field checks of a scene's 2D fx: [{path, message}] (paths relative to `visual`).
 * `targetError(target)` returns an error message for an unknown target, or null.
 */
export function fx2dIssues(fx, targetError) {
  const out = [];
  (fx ?? []).forEach((f, i) => {
    if (!FX2D_TYPES.includes(f.type)) return;
    for (const k of ["at", "until"]) {
      const e = momentError(f[k]);
      if (e) out.push({ path: ["fx", i, k], message: e });
    }
    if (f.target) {
      const e = targetError(f.target);
      if (e) out.push({ path: ["fx", i, "target"], message: e });
    }
  });
  return out;
}
