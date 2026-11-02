// Visual language of the 3D looks: background, materials, light rig, floor, effects and 2D label skin.
// Camera language (angles, moves, float) lives in lib/scene3d.mjs LOOK3D so the label anchors can share it.
import type { Palette, ThreeTemplateId } from "../types";
import { fontStack } from "../fonts";

/** The 3D looks (one per 3D template id). */
export type Look3DId = ThreeTemplateId;
/** lowpoly: flat-shaded matte facets in daylight (cutaway explainers). matte: dark navy body for the neon grid; soft: pastel studio plastic; paint: glossy clearcoat car paint; voxel: flat-shaded blocks. */
export type MaterialKind = "clay" | "toon" | "glass" | "gloss" | "paper" | "plastic" | "holo" | "matte" | "soft" | "paint" | "voxel" | "lowpoly";
/** set: the scene's environment set is the floor (src/three/sets.tsx). */
export type FloorKind = "plinth" | "iso" | "neon" | "mirror" | "paper" | "baseplate" | "holopad" | "set";
/** unfold: pop-up book hinge; snap: stop-motion brick placement on twos; scan: a scan plane grows the object. */
export type Enter3D = "drop" | "rise" | "flicker" | "swing" | "unfold" | "snap" | "scan";

export type Look3D = {
  id: Look3DId;
  material: MaterialKind;
  floor: FloorKind;
  /** renderer tone mapping (documentation only: the renderer reads lib/scene3d.mjs RENDER3D) */
  tone: "neutral" | "aces" | "none";
  exposure: number;
  shadows: boolean;
  outline: string | null;
  /** Glowing parts (LEDs, lamps, arrows) render unlit and over-bright; the bloom PASS runs only where RENDER3D has one. */
  bloom: { intensity: number; threshold: number } | null;
  particles: "dust" | "sparks" | "cubes" | "motes" | "flakes" | "bricks" | "data";
  enter: Enter3D;
  /** fixed utility colors */
  dark: string;
  light: string;
  good: string;
  bad: string;
  screen: string;
  /** background gradient (css-like stops, top to bottom) and a radial glow behind the subject */
  bg: (p: Palette) => { stops: string[]; glow: string; glowAlpha: number };
  /** 2D label skin */
  label: { bg: string; fg: string; border: string; radius: number; font: string; weight: number; size: number; shadow: string; leader: "none" | "dashed" };
  vignette: number;
  /** Headline skin over the 3D stage (default: the illustrated blueprint headline). */
  headline?: "paper" | "brick" | "holo";
  /** 2D lens / medium overlay: tilt-shift blur bands, hologram scanlines + brackets, paper grain. */
  overlay?: "tiltshift" | "scanlines" | "paper";
  /** Scene fog color (depth haze); default: the backdrop horizon color. */
  fog?: string;
  /** Sharp-edged blocks (voxel look): rounded boxes lose their fillet. */
  blocky?: boolean;
  /** Night look: car objects switch on headlights and tail lights. */
  night?: boolean;
  /** Color of the plain ground a look gets when no floor or world ground is set (default: the darkened backdrop). */
  ground?: (p: Palette) => string;
};

export const LOOKS3D: Record<Look3DId, Look3D> = {
  "clay-diorama": {
    id: "clay-diorama",
    material: "clay",
    floor: "plinth",
    tone: "neutral",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "dust",
    enter: "drop",
    dark: "#3B3446",
    light: "#FFF8F0",
    good: "#2FB98F",
    bad: "#F25F5C",
    screen: "#2B2433",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#FFFFFF", glowAlpha: 0.55 }),
    label: { bg: "#FFFFFF", fg: "#2B2433", border: "rgba(43,36,51,0.08)", radius: 999, font: fontStack("Poppins"), weight: 900, size: 34, shadow: "0 10px 24px rgba(80,50,30,0.18), 0 3px 0 rgba(43,36,51,0.12)", leader: "none" },
    vignette: 0.12,
  },
  "iso-toon": {
    id: "iso-toon",
    material: "toon",
    floor: "iso",
    tone: "none",
    exposure: 1.0,
    shadows: true,
    outline: "#0A1024",
    bloom: null,
    particles: "cubes",
    enter: "rise",
    dark: "#22305E",
    light: "#F4F1EA",
    good: "#3DDC97",
    bad: "#FF6B57",
    screen: "#0E1630",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#4CC9F0", glowAlpha: 0.12 }),
    label: { bg: "#0A1024", fg: "#F4F1EA", border: "#4CC9F0", radius: 10, font: fontStack("Montserrat"), weight: 800, size: 30, shadow: "6px 6px 0 rgba(0,0,0,0.35)", leader: "none" },
    vignette: 0.3,
  },
  "neon-glass": {
    id: "neon-glass",
    material: "glass",
    floor: "neon",
    tone: "aces",
    exposure: 1.1,
    shadows: false,
    outline: null,
    bloom: { intensity: 0.75, threshold: 0.9 },
    particles: "sparks",
    enter: "flicker",
    dark: "#0B0D18",
    light: "#E9F6FF",
    good: "#2EF2A0",
    bad: "#FF2E63",
    screen: "#050712",
    bg: (p) => ({ stops: ["#020308", p.bg[1] ?? p.bg[0], "#020308"], glow: p.accent2 ?? p.accent, glowAlpha: 0.16 }),
    label: { bg: "rgba(10,14,32,0.62)", fg: "#FFFFFF", border: "rgba(0,229,255,0.85)", radius: 14, font: fontStack("Montserrat"), weight: 800, size: 30, shadow: "0 0 22px rgba(0,229,255,0.45), inset 0 0 12px rgba(0,229,255,0.18)", leader: "none" },
    vignette: 0.45,
    fog: "#04050B",
  },
  "pedestal": {
    id: "pedestal",
    material: "gloss",
    floor: "mirror",
    tone: "aces",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "motes",
    enter: "swing",
    dark: "#1A1A20",
    light: "#F2F2F5",
    good: "#30D158",
    bad: "#FF453A",
    screen: "#050507",
    bg: () => ({ stops: ["#050507", "#16161B", "#050507"], glow: "#FFFFFF", glowAlpha: 0.1 }),
    label: { bg: "transparent", fg: "#F5F5F7", border: "transparent", radius: 0, font: fontStack("Inter"), weight: 700, size: 30, shadow: "0 2px 12px rgba(0,0,0,0.8)", leader: "dashed" },
    vignette: 0.55,
    fog: "#08080B",
  },
  "paper-world": {
    id: "paper-world",
    material: "paper",
    floor: "paper",
    tone: "neutral",
    exposure: 1.05,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "flakes",
    enter: "unfold",
    dark: "#4A3F35",
    light: "#FFF9EE",
    good: "#5DAA68",
    bad: "#E0614B",
    screen: "#3A3330",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#FFF6DF", glowAlpha: 0.7 }),
    label: { bg: "#FFFDF7", fg: "#3A3330", border: "rgba(58,51,48,0.12)", radius: 4, font: fontStack("Baloo 2"), weight: 800, size: 34, shadow: "3px 5px 0 rgba(90,70,50,0.18), 0 10px 18px rgba(90,70,50,0.18)", leader: "none" },
    vignette: 0.1,
    headline: "paper",
    overlay: "paper",
  },
  "toy-blocks": {
    id: "toy-blocks",
    material: "plastic",
    floor: "baseplate",
    tone: "aces",
    exposure: 1.05,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "bricks",
    enter: "snap",
    dark: "#2B2B2E",
    light: "#F7F7F2",
    good: "#2BB24C",
    bad: "#E3262E",
    screen: "#1C2230",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#FFE7B8", glowAlpha: 0.35 }),
    label: { bg: "#FFD500", fg: "#1A1A1A", border: "#1A1A1A", radius: 10, font: fontStack("Rubik"), weight: 900, size: 32, shadow: "0 6px 0 rgba(0,0,0,0.35)", leader: "none" },
    vignette: 0.25,
    headline: "brick",
    overlay: "tiltshift",
  },
  "holo-studio": {
    id: "holo-studio",
    material: "holo",
    floor: "holopad",
    tone: "aces",
    exposure: 1.0,
    shadows: false,
    outline: "#7CF7FF",
    bloom: { intensity: 0.6, threshold: 0.88 },
    particles: "data",
    enter: "scan",
    dark: "#08131C",
    light: "#DFFBFF",
    good: "#38F2A6",
    bad: "#FF4F6E",
    screen: "#03080D",
    bg: () => ({ stops: ["#010307", "#030B11", "#010307"], glow: "#2DE2FF", glowAlpha: 0.06 }),
    label: { bg: "rgba(2,12,18,0.7)", fg: "#BFF8FF", border: "rgba(124,247,255,0.8)", radius: 0, font: fontStack("Share Tech Mono"), weight: 400, size: 30, shadow: "0 0 18px rgba(45,226,255,0.45)", leader: "none" },
    vignette: 0.55,
    headline: "holo",
    overlay: "scanlines",
    fog: "#02080D",
  },
  // ---------------- rendered formats (render profile in lib/scene3d.mjs RENDER3D) ----------------
  "neon-grid": {
    id: "neon-grid",
    material: "matte",
    floor: "set",
    tone: "aces",
    exposure: 1.0,
    shadows: true,
    outline: "#59D8FF",
    bloom: { intensity: 0.85, threshold: 0.92 },
    particles: "sparks",
    enter: "rise",
    dark: "#0A1230",
    light: "#DDE8FF",
    good: "#3DF2A6",
    bad: "#FF3D6E",
    screen: "#040818",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0], p.bg[1] ?? p.bg[0]], glow: p.accent, glowAlpha: 0.1 }),
    label: { bg: "rgba(6,12,36,0.72)", fg: "#FFFFFF", border: "rgba(89,216,255,0.9)", radius: 10, font: fontStack("Montserrat"), weight: 800, size: 30, shadow: "0 0 18px rgba(63,169,255,0.45)", leader: "none" },
    vignette: 0.4,
  },
  "soft-studio": {
    id: "soft-studio",
    material: "soft",
    floor: "set",
    tone: "neutral",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "motes",
    enter: "drop",
    dark: "#3A3140",
    light: "#FFF9F2",
    good: "#46A882",
    bad: "#EF6A5B",
    screen: "#26212E",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#FFF4E2", glowAlpha: 0.35 }),
    label: { bg: "#FFFFFF", fg: "#2B2433", border: "rgba(43,36,51,0.06)", radius: 999, font: fontStack("Poppins"), weight: 800, size: 32, shadow: "0 12px 28px rgba(90,60,30,0.22)", leader: "none" },
    vignette: 0.16,
  },
  "moody-night": {
    id: "moody-night",
    material: "paint",
    floor: "set",
    tone: "aces",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: { intensity: 0.9, threshold: 0.95 },
    particles: "motes",
    enter: "swing",
    dark: "#121933",
    light: "#E8ECFF",
    good: "#3DDC97",
    bad: "#FF4D5E",
    screen: "#05070F",
    // dark sky above a lighter dusk horizon; the fog (default: the stop at 0.55) melts the road into it
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0], p.bg[1] ?? p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#FFB547", glowAlpha: 0.05 }),
    label: { bg: "rgba(8,12,30,0.7)", fg: "#FFFFFF", border: "rgba(255,181,71,0.85)", radius: 12, font: fontStack("Montserrat"), weight: 800, size: 30, shadow: "0 8px 26px rgba(0,0,0,0.55)", leader: "none" },
    vignette: 0.5,
    night: true,
  },
  "voxel-world": {
    id: "voxel-world",
    material: "voxel",
    floor: "set",
    tone: "aces",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "motes",
    enter: "snap",
    dark: "#2A2F3A",
    light: "#FFFBF0",
    good: "#4FAE3C",
    bad: "#E5483B",
    screen: "#1C2433",
    bg: (p) => ({ stops: [p.bg[0], p.bg[1] ?? p.bg[0]], glow: "#FFF1D0", glowAlpha: 0.3 }),
    label: { bg: "#FFFFFF", fg: "#14233A", border: "#14233A", radius: 6, font: fontStack("Poppins"), weight: 900, size: 32, shadow: "0 6px 0 rgba(20,35,58,0.35)", leader: "none" },
    vignette: 0.18,
    blocky: true,
  },
  // ---------------- format looks: the template is camera + light + material + motion; the agent builds the scene ----------------
  "data-stage": {
    id: "data-stage",
    material: "gloss",
    floor: "set",
    tone: "aces",
    exposure: 1.1,
    shadows: true,
    outline: null,
    bloom: { intensity: 0.55, threshold: 0.85 },
    particles: "motes",
    enter: "rise",
    dark: "#10131F",
    light: "#F4F1EA",
    good: "#3DDC97",
    bad: "#FF4D5E",
    screen: "#05070F",
    // a dark arena: the palette's darkest tones with a faint accent glow behind the subject
    bg: (p) => ({ stops: [mixHexColor(p.bg[0], "#000000", 0.55), mixHexColor(p.bg[1] ?? p.bg[0], "#000000", 0.35), mixHexColor(p.bg[1] ?? p.bg[0], "#000000", 0.6)], glow: p.accent, glowAlpha: 0.12 }),
    label: { bg: "rgba(8,10,20,0.78)", fg: "#FFFFFF", border: "rgba(255,255,255,0.4)", radius: 12, font: fontStack("Montserrat"), weight: 800, size: 32, shadow: "0 8px 26px rgba(0,0,0,0.55)", leader: "none" },
    vignette: 0.55,
    ground: (p) => mixHexColor(p.bg[0], "#000000", 0.55),
  },
  "monolith-story": {
    id: "monolith-story",
    material: "paint",
    floor: "set",
    tone: "aces",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "motes",
    enter: "rise",
    dark: "#14171F",
    light: "#F2F0EA",
    good: "#4FD08A",
    bad: "#F0584A",
    screen: "#06080D",
    bg: (p) => ({ stops: [mixHexColor(p.bg[0], "#000000", 0.2), p.bg[1] ?? p.bg[0], mixHexColor(p.bg[1] ?? p.bg[0], "#000000", 0.3)], glow: p.accent, glowAlpha: 0.1 }),
    // pixel-font signs: the label skin is the same pixel face
    label: { bg: "rgba(6,8,14,0.82)", fg: "#FFFFFF", border: "rgba(255,255,255,0.75)", radius: 0, font: fontStack("Press Start 2P"), weight: 400, size: 24, shadow: "6px 6px 0 rgba(0,0,0,0.5)", leader: "none" },
    vignette: 0.42,
    ground: (p) => mixHexColor(p.bg[1] ?? p.bg[0], "#000000", 0.35),
  },
  "clay-mascot": {
    id: "clay-mascot",
    material: "clay",
    floor: "set",
    tone: "neutral",
    exposure: 1.05,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "dust",
    enter: "drop",
    dark: "#3B3446",
    light: "#FFF8F0",
    good: "#2FB98F",
    bad: "#F25F5C",
    screen: "#2B2433",
    // a pastel mesh-like gradient: the backdrop and two accents washed toward white
    bg: (p) => ({ stops: [mixHexColor(p.bg[0], "#FFFFFF", 0.25), p.bg[1] ?? p.bg[0], mixHexColor(p.accent2 ?? p.accent, "#FFFFFF", 0.55)], glow: mixHexColor(p.accent, "#FFFFFF", 0.4), glowAlpha: 0.5 }),
    label: { bg: "#FFFFFF", fg: "#2B2433", border: "rgba(43,36,51,0.08)", radius: 999, font: fontStack("Poppins"), weight: 900, size: 34, shadow: "0 10px 24px rgba(80,50,30,0.18), 0 3px 0 rgba(43,36,51,0.12)", leader: "none" },
    vignette: 0.1,
    ground: (p) => mixHexColor(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.3),
  },
  "cutaway-explainer": {
    id: "cutaway-explainer",
    material: "lowpoly",
    floor: "set",
    tone: "neutral",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "dust",
    enter: "rise",
    dark: "#2B3550",
    light: "#FFF7E6",
    good: "#2FB98F",
    bad: "#E5484D",
    screen: "#1E2A44",
    // a daylight sky washed toward white, a soft sun glow behind the cutaway
    bg: (p) => ({ stops: [mixHexColor(p.bg[0], "#FFFFFF", 0.12), p.bg[1] ?? p.bg[0]], glow: "#FFFFFF", glowAlpha: 0.4 }),
    label: { bg: "#FFFFFF", fg: "#14213D", border: "rgba(20,33,61,0.12)", radius: 999, font: fontStack("Poppins"), weight: 800, size: 32, shadow: "0 8px 20px rgba(60,50,30,0.2), 0 3px 0 rgba(20,33,61,0.14)", leader: "none" },
    vignette: 0.06,
    ground: (p) => mixHexColor(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.2),
  },
  "engineering-explainer": {
    id: "engineering-explainer",
    material: "lowpoly",
    floor: "set",
    tone: "neutral",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "dust",
    enter: "rise",
    dark: "#2B3550",
    light: "#FFF7E6",
    good: "#2FB98F",
    bad: "#E5484D",
    screen: "#1E2A44",
    bg: (p) => ({ stops: [mixHexColor(p.bg[0], "#FFFFFF", 0.12), p.bg[1] ?? p.bg[0]], glow: "#FFFFFF", glowAlpha: 0.4 }),
    label: { bg: "#FFFFFF", fg: "#14213D", border: "rgba(20,33,61,0.12)", radius: 999, font: fontStack("Poppins"), weight: 800, size: 32, shadow: "0 8px 20px rgba(60,50,30,0.2), 0 3px 0 rgba(20,33,61,0.14)", leader: "none" },
    vignette: 0.06,
    ground: (p) => mixHexColor(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.2),
  },
  "process-explainer": {
    id: "process-explainer",
    material: "lowpoly",
    floor: "set",
    tone: "neutral",
    exposure: 1.0,
    shadows: true,
    outline: null,
    bloom: null,
    particles: "dust",
    enter: "rise",
    dark: "#2B3550",
    light: "#FFF7E6",
    good: "#2FB98F",
    bad: "#E5484D",
    screen: "#1E2A44",
    bg: (p) => ({ stops: [mixHexColor(p.bg[0], "#FFFFFF", 0.12), p.bg[1] ?? p.bg[0]], glow: "#FFFFFF", glowAlpha: 0.4 }),
    label: { bg: "#FFFFFF", fg: "#14213D", border: "rgba(20,33,61,0.12)", radius: 999, font: fontStack("Poppins"), weight: 800, size: 32, shadow: "0 8px 20px rgba(60,50,30,0.2), 0 3px 0 rgba(20,33,61,0.14)", leader: "none" },
    vignette: 0.06,
    ground: (p) => mixHexColor(p.bg[1] ?? p.bg[0], "#FFFFFF", 0.2),
  },
};

/** "#rrggbb" blend of two colors (hex stops are parsed by the gradient fog, so no css strings). */
export function mixHexColor(a: string, b: string, t: number): string {
  const rgb = (c: string) => {
    const h = c.replace("#", "");
    const f = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, k) => Math.round(v + (y[k] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

export const look3dFor = (id: string): Look3D => LOOKS3D[id as Look3DId] ?? LOOKS3D["clay-diorama"];

/** Resolve a color token (accent, accent2, accent3, good, bad, muted, text) or hex against palette + look. */
export const color3d = (p: Palette, look: Look3D, c: string | undefined, fallback: string): string => {
  if (!c) return fallback;
  if (c.startsWith("#")) return c;
  const map: Record<string, string> = { accent: p.accent, accent2: p.accent2 ?? p.accent, accent3: p.accent3 ?? p.accent, good: look.good, bad: look.bad, muted: look.dark, text: p.text };
  return map[c] ?? fallback;
};
