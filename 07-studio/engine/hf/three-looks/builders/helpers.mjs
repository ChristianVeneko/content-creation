// Shared helpers of the procedural builders: seeded PRNG, part constructor, role palette and small geometry recipes.
// Everything a builder returns is plain `custom` parts (same schema as hand-written ones): no files, no randomness outside the seed.
export const DEFAULT_ROLES = { body: "#e2a07c", accent: "#6db3a8", dark: "#4a4a58", light: "#f6ecdc", metal: "#aab6c0", screen: "#1c2a40", glow: "#ffcf7a" };
export const SKINS = ["#f1c9a0", "#d9a273", "#b57b4d", "#7a4a2b", "#f5d6c0"];
export const HAIRS = ["#3a2a22", "#7a4a2b", "#d9b36a", "#1f1f2a", "#b5532f"];
export const CLOTHES = ["#e9806e", "#5a86c9", "#7fbf8a", "#f2b45a", "#9a7fb5", "#e9a0b4"];

/** Mulberry32: a small deterministic PRNG. */
export function rng(seed = 0) {
  let a = (Math.imul((seed | 0) + 0x6d2b79f5, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const r3 = (v) => (Array.isArray(v) ? v.map(r3) : typeof v === "number" ? Math.round(v * 1000) / 1000 : v);

/** P(id, shape, size, pos, extra): a part with numbers rounded to 3 decimals and no undefined keys. */
export function P(id, shape, size, pos, extra = {}) {
  const out = { id, shape };
  if (size && size.length) out.size = r3(size);
  if (pos) out.pos = r3(pos);
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) out[k] = ["rot", "pivot", "points", "scale"].includes(k) ? r3(v) : v;
  return out;
}
export const GLOW = (extra = {}) => ({ role: "glow", emissive: 1, ...extra });
/** The context handed to a builder: params with defaults, a PRNG, resolved role colors. */
export function makeCtx(params = {}, roles = {}) {
  const colors = { ...DEFAULT_ROLES, ...roles, ...(params.colors ?? {}) };
  const seed = Number.isFinite(params.seed) ? params.seed : 0;
  return { p: params, seed, rnd: rng(seed), colors, pick: (list, r) => list[Math.floor((r ?? 0) * list.length) % list.length] };
}
/** Ring of `n` copies around a centre: fn(i, angleDeg, x, y). */
export function around(n, r, fn, start = 0) { const out = []; for (let i = 0; i < n; i++) { const a = start + (360 * i) / n, rad = (a * Math.PI) / 180; out.push(fn(i, a, Math.cos(rad) * r, Math.sin(rad) * r)); } return out; }
export const lerp = (a, b, t) => a + (b - a) * t;
export const clampN = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
