// Look table of the Blender renderer. src/three/looks.ts is TypeScript and cannot be imported from Node, so the values
// the Blender job needs (entrance style, material family, fixed utility colors, backdrop, light) are mirrored here.
// A 3D look this table does not know (a newer template) falls back to clay-diorama with a warning, never a crash.
import { mix as mixHex } from "./captions.mjs";

const stops = (p) => [p.bg[0], p.bg[1] ?? p.bg[0]];
const dark = (c, k) => mixHex(c, "#000000", k);

/**
 * enter: entrance style (see blender-motion.mjs); material: family; dark/light/good/bad/screen: utility colors;
 * bg: backdrop stops top to bottom; glow: radial glow color; ground: floor color (null = the backdrop's darkened lower stop);
 * key: {color, power}; sky: world ambient strength; exposure/tone: color management; bloom: glow on emissive parts.
 */
export const BLENDER_LOOKS = {
  "clay-diorama": { enter: "drop", material: "clay", dark: "#3B3446", light: "#FFF8F0", good: "#2FB98F", bad: "#F25F5C", screen: "#2B2433", bg: stops, key: { color: "#FFF1E0", power: 3.2 }, sky: 0.9, exposure: 0, tone: "neutral" },
  "iso-toon": { enter: "rise", material: "toon", dark: "#22305E", light: "#F4F1EA", good: "#3DDC97", bad: "#FF6B57", screen: "#0E1630", bg: stops, key: { color: "#FFFFFF", power: 3.0 }, sky: 0.8, exposure: 0, tone: "standard" },
  "neon-glass": { enter: "flicker", material: "glass", dark: "#0B0D18", light: "#E9F6FF", good: "#2EF2A0", bad: "#FF2E63", screen: "#050712", bg: (p) => ["#020308", p.bg[1] ?? p.bg[0], "#020308"], key: { color: "#9FC8FF", power: 2.2 }, sky: 0.35, exposure: 0.2, tone: "aces", bloom: true },
  pedestal: { enter: "swing", material: "gloss", dark: "#1A1A20", light: "#F2F2F5", good: "#30D158", bad: "#FF453A", screen: "#050507", bg: () => ["#050507", "#16161B", "#050507"], key: { color: "#FFFFFF", power: 3.4 }, sky: 0.4, exposure: 0, tone: "aces" },
  "paper-world": { enter: "unfold", material: "paper", dark: "#4A3F35", light: "#FFF9EE", good: "#5DAA68", bad: "#E0614B", screen: "#3A3330", bg: stops, key: { color: "#FFF4DE", power: 3.0 }, sky: 1.0, exposure: 0.05, tone: "neutral" },
  "toy-blocks": { enter: "snap", material: "plastic", dark: "#2B2B2E", light: "#F7F7F2", good: "#2BB24C", bad: "#E3262E", screen: "#1C2230", bg: stops, key: { color: "#FFFFFF", power: 3.2 }, sky: 0.9, exposure: 0.05, tone: "aces" },
  "holo-studio": { enter: "scan", material: "holo", dark: "#08131C", light: "#DFFBFF", good: "#38F2A6", bad: "#FF4F6E", screen: "#03080D", bg: () => ["#010307", "#030B11", "#010307"], key: { color: "#7CF7FF", power: 1.6 }, sky: 0.25, exposure: 0, tone: "aces", bloom: true },
  "neon-grid": { enter: "rise", material: "matte", dark: "#0A1230", light: "#DDE8FF", good: "#3DF2A6", bad: "#FF3D6E", screen: "#040818", bg: (p) => [p.bg[0], p.bg[1] ?? p.bg[0], p.bg[1] ?? p.bg[0]], key: { color: "#C9D8FF", power: 2.6 }, sky: 0.5, exposure: 0, tone: "aces", bloom: true },
  "soft-studio": { enter: "drop", material: "soft", dark: "#3A3140", light: "#FFF9F2", good: "#46A882", bad: "#EF6A5B", screen: "#26212E", bg: stops, key: { color: "#FFE6C7", power: 3.4 }, sky: 1.0, exposure: 0, tone: "neutral" },
  "moody-night": { enter: "swing", material: "paint", dark: "#121933", light: "#E8ECFF", good: "#3DDC97", bad: "#FF4D5E", screen: "#05070F", bg: (p) => [p.bg[0], p.bg[1] ?? p.bg[0], p.bg[1] ?? p.bg[0], p.bg[1] ?? p.bg[0]], key: { color: "#8FA8FF", power: 2.0 }, sky: 0.3, exposure: 0, tone: "aces", night: true, bloom: true },
  "voxel-world": { enter: "snap", material: "voxel", dark: "#2A2F3A", light: "#FFFBF0", good: "#4FAE3C", bad: "#E5483B", screen: "#1C2433", bg: stops, key: { color: "#FFFFFF", power: 3.2 }, sky: 0.9, exposure: 0, tone: "aces", blocky: true },
  "data-stage": { enter: "rise", material: "gloss", dark: "#10131F", light: "#F4F1EA", good: "#3DDC97", bad: "#FF4D5E", screen: "#05070F", bg: (p) => [dark(p.bg[0], 0.55), dark(p.bg[1] ?? p.bg[0], 0.35), dark(p.bg[1] ?? p.bg[0], 0.6)], ground: (p) => dark(p.bg[0], 0.55), key: { color: "#FFFFFF", power: 3.0 }, sky: 0.35, exposure: 0.1, tone: "aces", bloom: true },
  "monolith-story": { enter: "rise", material: "paint", dark: "#14171F", light: "#F2F0EA", good: "#4FD08A", bad: "#F0584A", screen: "#06080D", bg: (p) => [dark(p.bg[0], 0.2), p.bg[1] ?? p.bg[0], dark(p.bg[1] ?? p.bg[0], 0.3)], ground: (p) => dark(p.bg[1] ?? p.bg[0], 0.35), key: { color: "#FFFFFF", power: 3.0 }, sky: 0.4, exposure: 0, tone: "aces" },
  "clay-mascot": { enter: "drop", material: "clay", dark: "#3B3446", light: "#FFF8F0", good: "#2FB98F", bad: "#F25F5C", screen: "#2B2433", bg: (p) => [mixHex(p.bg[0], "#FFFFFF", 0.25), p.bg[1] ?? p.bg[0], mixHex(p.accent2 ?? p.accent, "#FFFFFF", 0.55)], ground: (p) => mixHex(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.3), key: { color: "#FFF1E0", power: 3.4 }, sky: 1.0, exposure: 0.05, tone: "neutral" },
  "cutaway-explainer": { enter: "rise", material: "toon", dark: "#2B3550", light: "#FFF7E6", good: "#2FB98F", bad: "#E5484D", screen: "#1E2A44", bg: (p) => [mixHex(p.bg[0], "#FFFFFF", 0.12), p.bg[1] ?? p.bg[0]], ground: (p) => mixHex(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.2), key: { color: "#FFE2B5", power: 3.2 }, sky: 1.1, exposure: 0.05, tone: "neutral" },
  "engineering-explainer": { enter: "rise", material: "toon", dark: "#2B3550", light: "#FFF7E6", good: "#2FB98F", bad: "#E5484D", screen: "#1E2A44", bg: (p) => [mixHex(p.bg[0], "#FFFFFF", 0.12), p.bg[1] ?? p.bg[0]], ground: (p) => mixHex(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.2), key: { color: "#FFE2B5", power: 3.2 }, sky: 1.1, exposure: 0.05, tone: "neutral" },
  "documentary-3d": { enter: "rise", material: "paint", dark: "#0B1022", light: "#EEF2FF", good: "#3DDC97", bad: "#FF4D5E", screen: "#05070F", bg: (p) => [p.bg[0], p.bg[1] ?? p.bg[0]], ground: (p) => mixHex(p.bg[1] ?? p.bg[0], "#000000", 0.2), key: { color: "#FFB066", power: 3.4 }, sky: 0.6, exposure: 0.0, tone: "aces" },
  "process-explainer": { enter: "rise", material: "toon", dark: "#2B3550", light: "#FFF7E6", good: "#2FB98F", bad: "#E5484D", screen: "#1E2A44", bg: (p) => [mixHex(p.bg[0], "#FFFFFF", 0.12), p.bg[1] ?? p.bg[0]], ground: (p) => mixHex(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.2), key: { color: "#FFE2B5", power: 3.2 }, sky: 1.1, exposure: 0.05, tone: "neutral" },
};

/** Table entry for a look id, or the clay-diorama entry plus `fallback: true` when the look is unknown. */
export function blenderLook(id) {
  const known = BLENDER_LOOKS[id];
  return known ? { id, ...known } : { id: "clay-diorama", ...BLENDER_LOOKS["clay-diorama"], fallback: true, requested: id };
}

/** Resolve a color token (accent, accent2, accent3, good, bad, muted, text) or hex against palette + look; same rule as color3d. */
export function colorOf(palette, look, c, fallback) {
  if (!c) return fallback;
  if (c.startsWith("#")) return c.length === 4 ? `#${[...c.slice(1)].map((x) => x + x).join("")}` : c.slice(0, 7);
  const map = { accent: palette.accent, accent2: palette.accent2 ?? palette.accent, accent3: palette.accent3 ?? palette.accent, good: look.good, bad: look.bad, muted: look.dark, text: palette.text };
  return map[c] ?? fallback;
}

export { mixHex };
