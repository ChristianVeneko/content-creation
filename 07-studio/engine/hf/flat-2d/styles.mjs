// Data-driven looks. A style is a palette of SEMANTIC roles plus shape/shadow/texture/typography rules.
// Settings, kit replicas and characters are drawn with roles only, so any style re-skins any scenario.
import { mix, lighten, darken } from "./util.mjs";

/** Font files shipped with the repo (03-assets/fonts), copied into the project assets by compose. */
export const FONTS = {
  Inter: { file: "Inter-Variable.ttf", weight: "100 900" },
  PoppinsBold: { file: "Poppins-Bold.ttf", weight: "700" },
  PoppinsBlack: { file: "Poppins-Black.ttf", weight: "900" },
  Rubik: { file: "Rubik-Variable.ttf", weight: "300 900" },
  Fraunces: { file: "Fraunces-Variable.ttf", weight: "100 900" },
  SpaceMono: { file: "SpaceMono-Bold.ttf", weight: "700" },
  Archivo: { file: "ArchivoBlack-Regular.ttf", weight: "400" },
  Gloock: { file: "Gloock-Regular.ttf", weight: "400" },
  Baloo: { file: "Baloo2-Variable.ttf", weight: "400 800" },
  Montserrat: { file: "Montserrat-Variable.ttf", weight: "100 900" },
};

const base = (o) => o;

// Role keys: bg bg2 wall floor surface surface2 ink inkBg muted accent accent2 accent3 good bad warn glow
// shape: r radius multiplier; stroke px (0 = none) + strokeRole; shadow kind; tex background texture; deco floating decoration
// cast: mode color|duo|line. cap: caption colors. fonts: ui + display + cap family keys (FONTS) and weights.
export const STYLES = {
  "flat-soft-gradient": base({
    name: "Soft gradient", about: "Warm cream world, soft 2-stop gradients, rounded shapes and long soft shadows (torna.club-like)",
    dark: false,
    c: { bg: "#F6F1EA", bg2: "#FFE3CF", wall: "#FDF1E4", floor: "#E8D6C2", surface: "#FFFFFF", surface2: "#EFE9FF", ink: "#1F2540", inkBg: "#1F2540", muted: "#6B7194", accent: "#6C63FF", accent2: "#FF8FA3", accent3: "#35B6E8", good: "#2FBF71", bad: "#F0546A", warn: "#FFB020", glow: "#BDB2FF" },
    shape: { r: 1, stroke: 0, strokeRole: "ink", shadow: "soft", gradient: true, tex: "none", deco: "blobs" },
    fonts: { ui: ["PoppinsBold", 700], display: ["PoppinsBlack", 900], cap: ["PoppinsBlack", 900] },
    cast: { mode: "color" },
    cap: { ink: "#1F2540", halo: "#FFFFFF", kwBg: "#FFB020", kwInk: "#1F2540" },
  }),
  "flat-dark-neon-ui": base({
    name: "Dark neon UI", about: "Near-black world with a soft grid and colored glow, white cards, green good and red bad (the guru default)",
    dark: true,
    c: { bg: "#0A0C13", bg2: "#121726", wall: "#131A2B", floor: "#0F1424", surface: "#FFFFFF", surface2: "#E6EBF7", ink: "#131826", inkBg: "#FFFFFF", muted: "#8993AD", accent: "#3B82F6", accent2: "#8B5CF6", accent3: "#22D3EE", good: "#22C55E", bad: "#EF4444", warn: "#FFD23F", glow: "#3B82F6" },
    shape: { r: 1, stroke: 0, strokeRole: "ink", shadow: "drop", gradient: false, tex: "grid", deco: "dots" },
    fonts: { ui: ["Inter", 800], display: ["Inter", 900], cap: ["Inter", 900] },
    cast: { mode: "color" },
    cap: { ink: "#FFFFFF", halo: "#000000", kwBg: "#FFD23F", kwInk: "#151515" },
  }),
  "flat-memphis": base({
    name: "Memphis pop", about: "Cream paper with squiggles, dots and triangles, thick ink outlines and hard offset shadows",
    dark: false,
    c: { bg: "#FFF4E0", bg2: "#FFD93D", wall: "#FFE9B8", floor: "#4D96FF", surface: "#FFFFFF", surface2: "#FFD93D", ink: "#1A1A2E", inkBg: "#1A1A2E", muted: "#5B5B7A", accent: "#FF6B6B", accent2: "#4D96FF", accent3: "#6BCB77", good: "#2FB457", bad: "#FF3B5C", warn: "#FFD93D", glow: "#FF6B6B" },
    shape: { r: 0.7, stroke: 4, strokeRole: "ink", shadow: "hard", gradient: false, tex: "memphis", deco: "memphis" },
    fonts: { ui: ["Rubik", 800], display: ["Rubik", 900], cap: ["Rubik", 900] },
    cast: { mode: "color" },
    cap: { ink: "#1A1A2E", halo: "#FFF4E0", kwBg: "#FF6B6B", kwInk: "#FFFFFF" },
  }),
  "flat-paper-cut": base({
    name: "Paper cut", about: "Layered cut-paper silhouettes on warm paper, stacked drop shadows and a faint paper grain",
    dark: false,
    c: { bg: "#F4E9D8", bg2: "#E8D5B5", wall: "#F7EEDC", floor: "#C9A57A", surface: "#FFFBF2", surface2: "#F0E1C6", ink: "#264653", inkBg: "#264653", muted: "#6D7F86", accent: "#E76F51", accent2: "#2A9D8F", accent3: "#E9C46A", good: "#2A9D8F", bad: "#D1495B", warn: "#E9C46A", glow: "#E9C46A" },
    shape: { r: 0.8, stroke: 0, strokeRole: "ink", shadow: "layer", gradient: false, tex: "paper", deco: "none" },
    fonts: { ui: ["PoppinsBold", 700], display: ["Fraunces", 800], cap: ["PoppinsBlack", 900] },
    cast: { mode: "color" },
    cap: { ink: "#264653", halo: "#F7EEDC", kwBg: "#E76F51", kwInk: "#FFFBF2" },
  }),
  "flat-blueprint": base({
    name: "Blueprint", about: "Cyan-white linework on blueprint blue, dimension lines, grid, stroke-draw reveals",
    dark: true,
    c: { bg: "#0B3D91", bg2: "#0A3283", wall: "#0D459E", floor: "#0A3585", surface: "#0F4AA3", surface2: "#1257B8", ink: "#E6F0FF", inkBg: "#E6F0FF", muted: "#9FC2F5", accent: "#FFD166", accent2: "#7FD8FF", accent3: "#FF9F6B", good: "#7DFFB3", bad: "#FF8A8A", warn: "#FFD166", glow: "#4FA3FF" },
    shape: { r: 0.25, stroke: 3, strokeRole: "ink", shadow: "none", gradient: false, tex: "blueprint", deco: "none" },
    fonts: { ui: ["SpaceMono", 700], display: ["SpaceMono", 700], cap: ["SpaceMono", 700] },
    cast: { mode: "line" },
    cap: { ink: "#E6F0FF", halo: "#08306F", kwBg: "#FFD166", kwInk: "#0B2A66", size: 58 },
  }),
  "flat-neo-brutalist": base({
    name: "Neo-brutalist", about: "Thick black strokes, hard offset shadows, flat pink-yellow-cyan on off-white",
    dark: false,
    c: { bg: "#FFFDF5", bg2: "#FFF1B8", wall: "#FFFDF5", floor: "#FFE14D", surface: "#FFFFFF", surface2: "#5CE1E6", ink: "#000000", inkBg: "#000000", muted: "#444444", accent: "#FF5CA8", accent2: "#5CE1E6", accent3: "#FFE14D", good: "#3DDC84", bad: "#FF4D4D", warn: "#FFE14D", glow: "#FF5CA8" },
    shape: { r: 0.15, stroke: 5, strokeRole: "ink", shadow: "hard", gradient: false, tex: "dots", deco: "none" },
    fonts: { ui: ["Archivo", 400], display: ["Archivo", 400], cap: ["Archivo", 400] },
    cast: { mode: "color" },
    cap: { ink: "#000000", halo: "#FFFDF5", kwBg: "#FF5CA8", kwInk: "#000000" },
  }),
  "flat-risograph-duotone": base({
    name: "Risograph duotone", about: "Two inks (pink-red and blue) on cream paper, multiply overlaps, halftone dots and slight misregistration",
    dark: false,
    c: { bg: "#F4EFE3", bg2: "#EADFC8", wall: "#F8F3E6", floor: "#E6DCC3", surface: "#FBF8EF", surface2: "#F0E7D2", ink: "#26358C", inkBg: "#26358C", muted: "#6D77B5", accent: "#FF4F6D", accent2: "#2F5BEA", accent3: "#8A6BD0", good: "#2F5BEA", bad: "#FF4F6D", warn: "#FF8A6D", glow: "#FF4F6D" },
    shape: { r: 0.6, stroke: 3, strokeRole: "ink", shadow: "misreg", gradient: false, tex: "halftone", deco: "none" },
    fonts: { ui: ["Montserrat", 800], display: ["Gloock", 400], cap: ["Montserrat", 900] },
    cast: { mode: "duo", duo: ["#26358C", "#FF4F6D", "#F8F3E6"] },
    cap: { ink: "#26358C", halo: "#F8F3E6", kwBg: "#FF4F6D", kwInk: "#FBF8EF" },
  }),
  "flat-glass-ui": base({
    name: "Glass UI", about: "Vivid violet-cyan-magenta gradient world with frosted translucent cards and light borders",
    dark: true,
    c: { bg: "#1C1450", bg2: "#2B2A9A", wall: "rgba(255,255,255,0.08)", floor: "rgba(255,255,255,0.10)", surface: "rgba(255,255,255,0.20)", surface2: "rgba(255,255,255,0.12)", ink: "#FFFFFF", inkBg: "#FFFFFF", muted: "#D3D6FF", accent: "#00D1FF", accent2: "#FF6AD5", accent3: "#8E7BFF", good: "#5CF2B0", bad: "#FF7A9A", warn: "#FFD66B", glow: "#6A5CFF" },
    shape: { r: 1.1, stroke: 2, strokeRole: "glassEdge", shadow: "none", gradient: false, tex: "blobs", deco: "blobs" },
    fonts: { ui: ["Inter", 800], display: ["Inter", 900], cap: ["Inter", 900] },
    cast: { mode: "color" },
    cap: { ink: "#FFFFFF", halo: "#120C3A", kwBg: "#00D1FF", kwInk: "#08133A" },
  }),
  "flat-sticker-cartoon": base({
    name: "Sticker cartoon", about: "Saturated aqua world, bold ink outlines, drop shadows and bouncy sticker shapes",
    dark: false,
    c: { bg: "#8EDCE6", bg2: "#6FCADB", wall: "#BDEBF2", floor: "#FFC857", surface: "#FFFFFF", surface2: "#FFF1C1", ink: "#2B2D42", inkBg: "#1E2036", muted: "#5C6178", accent: "#FF5D8F", accent2: "#6C5CE7", accent3: "#FFC857", good: "#2ED573", bad: "#FF4757", warn: "#FFC857", glow: "#FFFFFF" },
    shape: { r: 1.2, stroke: 4, strokeRole: "ink", shadow: "drop", gradient: false, tex: "dots", deco: "sticker" },
    fonts: { ui: ["Baloo", 800], display: ["Baloo", 800], cap: ["Baloo", 800] },
    cast: { mode: "color" },
    cap: { ink: "#FFFFFF", halo: "#2B2D42", kwBg: "#FFC857", kwInk: "#2B2D42" },
  }),
  "flat-clay-2d": base({
    name: "Clay 2D", about: "Puffy pastel shapes with inner highlights and soft outer shadows, friendly and rounded",
    dark: false,
    c: { bg: "#F9DCC4", bg2: "#FFE5D9", wall: "#FCD5CE", floor: "#B8E0D2", surface: "#FFF4EA", surface2: "#F9DCC4", ink: "#5B4B49", inkBg: "#5B4B49", muted: "#9A8480", accent: "#F4978E", accent2: "#8FCBB8", accent3: "#CDB4DB", good: "#6DBB9A", bad: "#E5736A", warn: "#F0C36A", glow: "#FFD1C2" },
    shape: { r: 1.5, stroke: 0, strokeRole: "ink", shadow: "clay", gradient: true, tex: "none", deco: "blobs" },
    fonts: { ui: ["Baloo", 800], display: ["Baloo", 800], cap: ["Baloo", 800] },
    cast: { mode: "color" },
    cap: { ink: "#5B4B49", halo: "#FFF4EA", kwBg: "#F4978E", kwInk: "#FFFFFF" },
  }),
  "flat-isometric": base({
    name: "Isometric flat", about: "Pale blue grid world with extruded blocks: each shape casts a darker side, isometric rhombus floor",
    dark: false,
    c: { bg: "#E8EEF7", bg2: "#D6E2F5", wall: "#F1F5FC", floor: "#C9D7EE", surface: "#FFFFFF", surface2: "#DCE6F7", ink: "#1B2A49", inkBg: "#1B2A49", muted: "#5F7094", accent: "#3F5BD8", accent2: "#7C9CF5", accent3: "#FFC857", good: "#2BB673", bad: "#EF5B5B", warn: "#FFC857", glow: "#7C9CF5" },
    shape: { r: 0.5, stroke: 0, strokeRole: "ink", shadow: "extrude", gradient: false, tex: "iso", deco: "cubes" },
    fonts: { ui: ["Montserrat", 800], display: ["Montserrat", 900], cap: ["Montserrat", 900] },
    cast: { mode: "color" },
    cap: { ink: "#1B2A49", halo: "#F1F5FC", kwBg: "#3F5BD8", kwInk: "#FFFFFF" },
  }),
  "flat-low-poly": base({
    name: "Low-poly vector", about: "Dusk gradient world built from triangles, faceted shapes with a lighter and a darker half",
    dark: true,
    c: { bg: "#2B2D6E", bg2: "#5B3E96", wall: "#4A4A9C", floor: "#2F2F6B", surface: "#F2EFFF", surface2: "#CFC8FF", ink: "#1F1B4D", inkBg: "#FFFFFF", muted: "#6F69A8", accent: "#FF7A59", accent2: "#FFC857", accent3: "#4FD1C5", good: "#3CC9A5", bad: "#FF5E7E", warn: "#FFC857", glow: "#FF7A59" },
    shape: { r: 0.3, stroke: 0, strokeRole: "ink", shadow: "drop", gradient: false, tex: "poly", deco: "poly", facet: true },
    fonts: { ui: ["Rubik", 800], display: ["Rubik", 900], cap: ["Rubik", 900] },
    cast: { mode: "color" },
    cap: { ink: "#FFFFFF", halo: "#1A1850", kwBg: "#FF7A59", kwInk: "#FFFFFF" },
  }),
};

export const STYLE_IDS = Object.keys(STYLES);

/** Derived values every consumer needs: shade colors and the CSS variable block. */
export function resolveStyle(id) {
  const s = STYLES[id];
  if (!s) throw new Error(`unknown flat-2d style "${id}"`);
  const c = { ...s.c };
  c.shade = darken(c.surface.startsWith("#") ? c.surface : c.bg2, 0.14);
  c.glassEdge = "rgba(255,255,255,0.5)";
  c.paper = c.surface.startsWith("#") ? c.surface : "#FFFFFF";
  c.surfaceHi = c.surface.startsWith("#") ? lighten(c.surface, 0.4) : "rgba(255,255,255,0.3)";
  c.accentDark = darken(c.accent, 0.25);
  c.accentSoft = mix(c.accent, c.bg, 0.8);
  return { id, ...s, c };
}
