// Shared motion vocabulary of the generative kits (3D custom models, 2D drawings, 2D fx): easing curves, keyframe
// tracks, a deterministic hash and the moment schema (seconds or a narration word, the reels `en` syntax).
// A leaf module (zod only): word resolution needs lib/reels.mjs and lives in lib/scene3d-motion.mjs.
// lib/scene3d-motion.mjs re-exports these for the 3D kit; lib/drawing.mjs and lib/fx2d.mjs use them for 2D.
// Pure and frame-free: nothing here may import Node built-ins (bundled by Remotion).
import { z } from "zod";

export const EASINGS = ["linear", "in", "out", "in-out", "back", "elastic", "bounce", "step"];

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const c1 = 1.70158;
const c3 = c1 + 1;
export const EASE = {
  linear: (u) => u,
  in: (u) => u * u * u,
  out: (u) => 1 - (1 - u) ** 3,
  "in-out": (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  back: (u) => 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2,
  elastic: (u) => (u === 0 || u === 1 ? u : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  bounce: (u) => {
    const a = 7.5625;
    const d = 2.75;
    if (u < 1 / d) return a * u * u;
    if (u < 2 / d) return a * (u -= 1.5 / d) * u + 0.75;
    if (u < 2.5 / d) return a * (u -= 2.25 / d) * u + 0.9375;
    return a * (u -= 2.625 / d) * u + 0.984375;
  },
  step: (u) => (u < 1 ? 0 : 1),
};
const lerp = (a, b, u) => a + (b - a) * u;

/** Sample a track [{t, v (number | number[]), ease}] (sorted by t) at time t: hold outside, eased in between. */
export function sampleTrack(track, t) {
  if (!track.length) return undefined;
  if (t <= track[0].t) return track[0].v;
  const last = track[track.length - 1];
  if (t >= last.t) return last.v;
  let i = 1;
  while (track[i].t < t) i++;
  const a = track[i - 1];
  const b = track[i];
  const u = (EASE[b.ease ?? "in-out"] ?? EASE["in-out"])(clamp01((t - a.t) / Math.max(1e-6, b.t - a.t)));
  return Array.isArray(a.v) ? a.v.map((x, k) => lerp(x, b.v[k], u)) : lerp(a.v, b.v, u);
}

/**
 * A keyframe track of one channel: the keys that set `field`, sorted by time (stable), mapped by `map`.
 * `sec` resolves a key's `at` (seconds or a word moment) to seconds.
 */
export const keyTrack = (keys, sec, field, map = (x) => x) =>
  keys
    .map((k, i) => ({ k, i, t: sec(k.at) }))
    .filter(({ k }) => k[field] !== undefined)
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(({ k, t }) => ({ t, v: map(k[field]), ease: k.ease }));

/** Deterministic hash -> [0, 1). */
export const hash01 = (...xs) => {
  let h = 2166136261;
  for (const x of xs) {
    const s = String(x);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Smoothstep of x clamped to 0..1. */
export const smooth = (x) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** A moment: seconds into the scene, or a narration word in the reels `en` syntax ("word", "word#2", "word+6", "inicio", "fin"). */
export const momentSchema = z
  .union([z.number().min(0).max(60), z.string().min(1).max(40)])
  .describe('Seconds into the scene, or a narration word: "word", "word#2", "word+6" (frames), "inicio", "fin"');

/** A moment in seconds: numbers pass through, words come from the plan's resolved map. */
export const momentSec = (m, moments) => (typeof m === "number" ? m : m === undefined ? 0 : (moments?.[m] ?? 0));
