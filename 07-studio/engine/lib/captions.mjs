// Caption catalog: styles, size presets and position presets (pure data + one resolver).
// The render side (src/components/Captions.tsx) reads the look returned by resolveCaptionLook().

import { contrastRatio, luminance } from "./palettes.mjs";

/** Original four first (their look is unchanged), then the catalog added on 2026-11-01. */
export const CAPTION_STYLES = [
  "hormozi",
  "clean",
  "boxed",
  "pills",
  "chips",
  "two-tone",
  "karaoke",
  "punch",
  "typewriter",
  "dialog",
  "neon",
  "underline",
  "minimal",
  "pixel",
];

export const CAPTION_SIZES = ["s", "m", "l", "xl"];
/** Font-size multiplier per size preset; `m` is the size every style had before presets existed. */
export const CAPTION_SIZE_SCALE = { s: 0.8, m: 1, l: 1.2, xl: 1.4 };

export const CAPTION_POSITIONS = ["top", "upper", "center", "lower", "bottom"];
/**
 * Caption bands (px on 1080x1920). x is always 90..990; every band stays inside y 220..1400 so
 * captions never reach the platform UI at the bottom or the status bar at the top.
 */
export const CAPTION_BANDS = {
  top: { top: 230, height: 250 },
  upper: { top: 420, height: 280 },
  center: { top: 820, height: 280 },
  lower: { top: 1130, height: 260 },
  bottom: { top: 1250, height: 150 },
};

/** Styles designed for a specific band when the spec does not pick a position. */
export const STYLE_DEFAULT_POSITION = { "two-tone": "upper", punch: "center" };

// ---------------------------------------------------------------- colors

/** Minimum WCAG contrast for a caption word over the surface it sits on. */
export const CAPTION_MIN_CONTRAST = 4.5;
/** Styles whose word boxes are light (dark words on light pills) whatever the palette. */
const LIGHT_BOX_STYLES = new Set(["pills"]);
/** The two extreme inks; one of them always reaches 4.58:1 over any color. */
const INK_DARK = "#000000";
const INK_LIGHT = "#FFFFFF";

/** "#abc" / "#aabbcc" / "#aabbccdd" → "#AABBCC". */
const hex6 = (h) => {
  let s = String(h).trim().replace(/^#/, "");
  if (s.length === 3 || s.length === 4) s = s.slice(0, 3).split("").map((c) => c + c).join("");
  return `#${s.slice(0, 6).toUpperCase()}`;
};
const rgb = (h) => {
  const n = parseInt(hex6(h).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix two colors (t = 0 → a, 1 → b). */
export const mix = (a, b, t) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};
const darkest = (list) => list.reduce((a, c) => (luminance(c) < luminance(a) ? c : a));
const lightest = (list) => list.reduce((a, c) => (luminance(c) > luminance(a) ? c : a));
const worst = (fg, surfaces) => Math.min(...surfaces.map((s) => contrastRatio(fg, s)));

/**
 * Readable ink over a fill (the inkOn rule with pure black/white, so it always reaches 4.5:1).
 * @param {string} bg #RRGGBB
 */
export const readableOn = (bg) => (contrastRatio(INK_LIGHT, bg) >= contrastRatio(INK_DARK, bg) ? INK_LIGHT : INK_DARK);

/** Push `fg` toward the readable ink of the surfaces until it reaches the minimum contrast over all of them. */
export function readableWord(fg, surfaces, min = CAPTION_MIN_CONTRAST) {
  if (worst(fg, surfaces) >= min) return fg;
  const ink = worst(INK_LIGHT, surfaces) >= worst(INK_DARK, surfaces) ? INK_LIGHT : INK_DARK;
  for (let i = 1; i < 20; i++) {
    const c = mix(fg, ink, i / 20);
    if (worst(c, surfaces) >= min) return c;
  }
  return ink;
}

/** Move a surface the smallest step toward black or white until every word reads on it (else the best step found). */
function readableSurface(surface, words) {
  const score = (c) => Math.min(...words.map((w) => contrastRatio(w, c)));
  let best = surface;
  let bestScore = score(surface);
  if (bestScore >= CAPTION_MIN_CONTRAST) return surface;
  for (let i = 1; i <= 20; i++) {
    for (const pole of [INK_DARK, INK_LIGHT]) {
      const c = mix(surface, pole, i / 20);
      const sc = score(c);
      if (sc >= CAPTION_MIN_CONTRAST) return c;
      if (sc > bestScore) [best, bestScore] = [c, sc];
    }
  }
  return best;
}

/**
 * Caption colors for a palette: words, highlight, word box and outline, all #RRGGBB and readable.
 * Auto values come from the palette (text, accent, and the darkest bg stop as the "shade" for
 * outlines, boxes and shadows); explicit `colors` (and the legacy `accent`) win and are kept as given.
 * Derived values are adjusted until words reach 4.5:1 over the box and the outline: first the
 * surfaces move away from the words, then any derived word that still fails moves toward the
 * readable ink (white or black).
 * @param {{bg:string[],text:string,accent:string,accent3?:string}} palette
 * @param {{style?:string, colors?:{text?:string,highlight?:string,box?:string,outline?:string}, accent?:string}} [opts]
 * @returns {{text:string,highlight:string,box:string,outline:string}}
 */
export function deriveCaptionColors(palette, { style, colors = {}, accent } = {}) {
  const pal = palette ?? { bg: ["#0F0C29"], text: "#FFFFFF", accent: "#FFD60A" };
  const stops = (pal.bg?.length ? pal.bg : ["#0F0C29"]).map(hex6);
  const ptext = hex6(pal.text ?? "#FFFFFF");
  const shade = darkest(stops);
  const set = (k) => typeof colors?.[k] === "string";
  const lightBox = LIGHT_BOX_STYLES.has(style);
  // Light-box styles: the lightest palette color as the pill, the darkest one for its words.
  let text = set("text") ? hex6(colors.text) : lightBox ? darkest([ptext, ...stops]) : ptext;
  // Pills always lit the active word with the third accent (illustrated: cyan) when the palette has one.
  const autoHighlight = lightBox && pal.accent3 ? pal.accent3 : (pal.accent ?? "#FFD60A");
  let highlight = set("highlight") ? hex6(colors.highlight) : typeof accent === "string" ? hex6(accent) : hex6(autoHighlight);
  const highlightSet = set("highlight") || typeof accent === "string";
  let box = set("box") ? hex6(colors.box) : lightBox ? lightest([ptext, ...stops]) : shade;
  // An explicit word color without an explicit outline gets the ink opposite to it as outline / halo,
  // so light custom text on a light palette still separates from the background.
  let outline = set("outline") ? hex6(colors.outline) : lightBox ? darkest([ptext, ...stops]) : set("text") ? readableOn(text) : shade;

  // Words that must read on each surface (on light-box styles the outline is only a drop shadow and
  // the highlight only a fill). When a surface cannot serve every word, the explicit ones win and the
  // derived words adapt below.
  const fixed = [...(set("text") ? [text] : []), ...(highlightSet ? [highlight] : [])];
  const fitSurface = (surface, words) => {
    const all = readableSurface(surface, words);
    const explicit = words.filter((w) => fixed.includes(w));
    return explicit.length && worst(all, explicit) < CAPTION_MIN_CONTRAST ? readableSurface(surface, explicit) : all;
  };
  if (!set("outline") && !lightBox) outline = fitSurface(outline, [text, highlight]);
  if (!set("box")) box = fitSurface(box, lightBox ? [text] : [text, highlight]);
  const surfaces = lightBox ? [box] : [box, outline];
  if (!set("text")) text = readableWord(text, surfaces);
  if (!highlightSet && !lightBox) highlight = readableWord(highlight, surfaces);
  return { text, highlight, box, outline };
}

/**
 * Halo strength for text-only styles: "strong" when the word color is close to the darkest background
 * stop (contrast < 3:1), so the shadow has to carry the separation; else "normal".
 * @param {string} text #RRGGBB word color
 * @param {{bg:string[]}} palette
 * @returns {"strong"|"normal"}
 */
export function captionHalo(text, palette) {
  const stops = (palette?.bg?.length ? palette.bg : ["#0F0C29"]).map(hex6);
  return contrastRatio(hex6(text), darkest(stops)) < 3 ? "strong" : "normal";
}

/**
 * Color for a not-yet-spoken word: `text` pulled toward the background (at most halfway) only as far as
 * it keeps 4.5:1 over every background stop. A word that already fails is returned unchanged.
 * @param {string} text #RRGGBB
 * @param {string[]} backgrounds the colors the word can sit on
 */
export function dimmedWord(text, backgrounds) {
  const fg = hex6(text);
  const bgs = backgrounds.map(hex6);
  const toward = bgs[0];
  let out = fg;
  for (let i = 1; i <= 10; i++) {
    const c = mix(fg, toward, i / 20);
    if (worst(c, bgs) < CAPTION_MIN_CONTRAST) break;
    out = c;
  }
  return out;
}

/**
 * Resolve the caption look of a resolved spec.
 * @param {object} spec resolved VideoSpec (resolveSpec output)
 * @param {{top:number,height:number}} defaultBand the band the template draws captions in today
 * @returns {{style:string,size:string,scale:number,position:string|null,band:{top:number,height:number},accent:string,customAccent:boolean,colors:{text:string,highlight:string,box:string,outline:string},dim:string,halo:"strong"|"normal",uppercase:boolean|undefined,speaker:string|undefined}}
 */
export function resolveCaptionLook(spec, defaultBand) {
  const c = spec?.captions ?? {};
  const style = c.style ?? spec?.theme?.captionStyle ?? "hormozi";
  const size = CAPTION_SIZES.includes(c.size) ? c.size : "m";
  const position = CAPTION_POSITIONS.includes(c.position) ? c.position : (STYLE_DEFAULT_POSITION[style] ?? null);
  const band = position ? { ...CAPTION_BANDS[position] } : { ...defaultBand };
  const colors = deriveCaptionColors(spec?.theme?.palette, { style, colors: c.colors, accent: c.accent });
  return {
    style,
    size,
    scale: CAPTION_SIZE_SCALE[size],
    position,
    band,
    accent: colors.highlight,
    customAccent: typeof c.accent === "string" || typeof c.colors?.highlight === "string",
    colors,
    dim: dimmedWord(colors.text, spec?.theme?.palette?.bg?.length ? spec.theme.palette.bg : [colors.outline]),
    halo: captionHalo(colors.text, spec?.theme?.palette),
    uppercase: typeof c.uppercase === "boolean" ? c.uppercase : undefined,
    speaker: c.speaker,
  };
}
