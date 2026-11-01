// Reels family (port of the user-provided "becario-reels" pack): series styles with role-based colors, the
// scene vocabulary (17 types + the agent's own `dibujo`), word-synced moments (`en`), auto-distribution, sounds, and the per-scene plan.
// Pure and browser-safe: shared by the Node build and the Remotion bundle (src/reels/).
import { hasEmoji } from "./illustration-schema.mjs";
import { drawingMomentPaths, drawingVisualSchema } from "./drawing.mjs";

// ---------------------------------------------------------------- constants

/** Words (and the elements they trigger) appear this many frames before they are heard. */
export const ADELANTO = 4;
/** Frames two scenes overlap in a soft (suave) entrance. */
export const SOLAPE = 10;
/** Length of the halftone (semitono) wipe; the cut sits in its middle. */
export const SEMI = 18;

export const REEL_STYLE_IDS = ["nube", "noche", "menta", "limon", "pizarra"];
export const REELS_TEMPLATE_IDS = REEL_STYLE_IDS.map((s) => `reels-${s}`);
export const usesReelsKit = (templateId) => REELS_TEMPLATE_IDS.includes(templateId);
export const reelStyleOf = (templateId) => (usesReelsKit(templateId) ? templateId.slice("reels-".length) : "nube");

export const TRANSITIONS = ["corte", "suave", "semitono"];
const TRANSITION_ALIASES = { cut: "corte", corte: "corte", soft: "suave", fade: "suave", suave: "suave", halftone: "semitono", semitone: "semitono", semitono: "semitono" };
export const normTransition = (t) => (typeof t === "string" ? (TRANSITION_ALIASES[t.trim().toLowerCase()] ?? null) : null);

export const SUBTITLE_MODES = ["linea", "bloque", "no"];
const SUBTITLE_ALIASES = { line: "linea", linea: "linea", "línea": "linea", block: "bloque", bloque: "bloque", none: "no", no: "no", off: "no" };
export const normSubtitles = (s) => (typeof s === "string" ? (SUBTITLE_ALIASES[s.trim().toLowerCase()] ?? null) : null);

/** The pack's synthesized SFX (public/reels/sounds/<name>.wav). */
export const REEL_SOUNDS = ["pop", "ding", "exito", "campana", "tecla", "tic", "clic", "whoosh", "swoosh", "papel", "burbuja", "golpe", "negacion", "puff", "cristal", "proyector", "subida"];

// ---------------------------------------------------------------- styles

const font = (file, weight) => ({ file: `reels/fonts/${file}.woff2`, weight });
const MONO = [font("jetbrains-mono-latin-400-normal", 400), font("jetbrains-mono-latin-700-normal", 700)];
const HAND = font("caveat-latin-700-normal", 700);

/**
 * Series styles. Colors are named by role (fondo = background, acento = accent, tarjeta = card...), so every
 * scene works with every style. Family "suave" (soft): white cards with diffuse shadows, moving light blobs,
 * fades. Family "marcado" (marked): thick borders, hard shadows, paper grain, hard cuts.
 */
export const REEL_STYLES = {
  nube: {
    family: "suave",
    label: "Nube",
    colors: { fondo: "#EEF0FF", fondo2: "#E1E5FF", manchas: ["#D6CEFF", "#CBE2FF", "#FFFFFF"], texto: "#1C1F3A", suave: "#5A5F86", acento: "#6157F5", acentoTexto: "#FFFFFF", tarjeta: "#FFFFFF", tarjetaTexto: "#1C1F3A", linea: "#E3E5F5", oscuro: "#171A33", oscuroTexto: "#E9EBFA", borde: "#1C1F3A", exito: "#22B07D", error: "#E5484D" },
    fonts: { titulo: font("manrope-latin-800-normal", 800), texto: [font("manrope-latin-600-normal", 600), font("manrope-latin-800-normal", 800)], mano: HAND, mono: MONO },
    escalaTitulo: 1,
    grano: 0.25,
  },
  noche: {
    family: "suave",
    label: "Noche",
    colors: { fondo: "#0E1120", fondo2: "#1A1F3D", manchas: ["#2B3A88", "#5A2A72", "#14324F"], texto: "#F3F4FB", suave: "#A9B0CF", acento: "#B8F34B", acentoTexto: "#0E1120", tarjeta: "#1C2242", tarjetaTexto: "#F3F4FB", linea: "#2D3664", oscuro: "#090C18", oscuroTexto: "#E8EBF7", borde: "#F3F4FB", exito: "#3DDC97", error: "#FF6B6B" },
    fonts: { titulo: font("space-grotesk-latin-700-normal", 700), texto: [font("inter-latin-600-normal", 600), font("inter-latin-800-normal", 800)], mano: HAND, mono: MONO },
    escalaTitulo: 1.02,
    grano: 0.12,
  },
  menta: {
    family: "marcado",
    label: "Menta",
    colors: { fondo: "#DDF3EA", fondo2: "#D2EEE2", manchas: ["#C6EBDB", "#FFFFFF"], texto: "#0D3B35", suave: "#4E7A72", acento: "#FF4F7B", acentoTexto: "#FFFFFF", tarjeta: "#FFFFFF", tarjetaTexto: "#0D3B35", linea: "#CFE5DC", oscuro: "#0D3B35", oscuroTexto: "#E6F6F0", borde: "#0D3B35", exito: "#1FA971", error: "#E5484D" },
    fonts: { titulo: font("bricolage-grotesque-latin-800-normal", 800), texto: [font("dm-sans-latin-600-normal", 600), font("dm-sans-latin-800-normal", 800)], mano: HAND, mono: MONO },
    escalaTitulo: 1,
    grano: 0.55,
  },
  limon: {
    family: "marcado",
    label: "Limon",
    colors: { fondo: "#FFE94A", fondo2: "#FFE23B", manchas: ["#FFF27A", "#FFFFFF"], texto: "#141414", suave: "#59511C", acento: "#2F5BFF", acentoTexto: "#FFFFFF", tarjeta: "#FFFFFF", tarjetaTexto: "#141414", linea: "#EBD94A", oscuro: "#141414", oscuroTexto: "#F5F5F5", borde: "#141414", exito: "#12A150", error: "#E5484D" },
    fonts: { titulo: font("anton-latin-400-normal", 400), texto: [font("inter-latin-600-normal", 600), font("inter-latin-800-normal", 800)], mano: HAND, mono: MONO },
    escalaTitulo: 1.12,
    grano: 0.45,
  },
  pizarra: {
    family: "marcado",
    label: "Pizarra",
    colors: { fondo: "#1E2B25", fondo2: "#22322B", manchas: ["#2A3D35", "#1A2620"], texto: "#F1EFE4", suave: "#B6C0B2", acento: "#FFD449", acentoTexto: "#1E2B25", tarjeta: "#26372F", tarjetaTexto: "#F1EFE4", linea: "#3A4E44", oscuro: "#141D19", oscuroTexto: "#ECEADF", borde: "#F1EFE4", exito: "#7DDB8F", error: "#FF7F6B" },
    fonts: { titulo: font("archivo-black-latin-400-normal", 400), texto: [font("archivo-latin-600-normal", 600), font("archivo-latin-800-normal", 800)], mano: HAND, mono: MONO },
    escalaTitulo: 0.95,
    grano: 0.5,
  },
};

// ---------------------------------------------------------------- colors

/**
 * Second and third accents of each style for the agent's drawings and 2D fx (the pack's styles have one accent).
 * theme.palette accent2 / accent3 override them.
 */
export const REEL_ART = {
  nube: { accent2: "#FF8A65", accent3: "#2EC4D6" },
  noche: { accent2: "#FF7AB6", accent3: "#5BC8FF" },
  menta: { accent2: "#FFC23D", accent3: "#2F9CFF" },
  limon: { accent2: "#FF4F7B", accent3: "#FF7A1A" },
  pizarra: { accent2: "#FF9B85", accent3: "#8EC5FF" },
};
export const reelArtColors = (styleId, palette) => {
  const d = REEL_ART[styleId] ?? REEL_ART.nube;
  return { accent2: palette?.accent2 ? hex6(palette.accent2) : d.accent2, accent3: palette?.accent3 ? hex6(palette.accent3) : d.accent3 };
};

/** "#abc" / "#aabbcc" / "#aabbccdd" → "#AABBCC". */
export const hex6 = (h) => {
  let s = String(h).trim().replace(/^#/, "");
  if (s.length === 3 || s.length === 4) s = s.slice(0, 3).split("").map((c) => c + c).join("");
  return `#${s.slice(0, 6).toUpperCase()}`;
};
const rgb = (h) => {
  const n = parseInt(hex6(h).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
/** Mix two colors (t = 0 → a, 1 → b). */
export const mix = (a, b, t) => {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
/** WCAG relative luminance. */
export const luminance = (h) => {
  const c = rgb(h).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const best = (bg, options) => options.reduce((a, o) => (contrast(bg, o) > contrast(bg, a) ? o : a));
const DARK_TEXT = "#141414";

/** The palette a reels template ships with: theme.palette maps 1:1 onto the style's roles. */
export const defaultPalette = (styleId) => {
  const c = REEL_STYLES[styleId]?.colors ?? REEL_STYLES.nube.colors;
  return { bg: [c.fondo, c.fondo2], text: c.texto, accent: c.acento };
};

const sameList = (a, b) => a.length === b.length && a.every((x, i) => hex6(x) === hex6(b[i]));

/**
 * Role colors for a style, with an optional theme.palette override (a palette picker recolors the roles):
 * - `bg[0]`, `bg[1]` → fondo, fondo2 (and the light blobs, cards, panels and lines that sit on them),
 * - `text` → texto (and the secondary text and the borders of the marked family),
 * - `accent` → acento, with acentoTexto picked for contrast; `accent2` / `accent3` tint the light blobs.
 * Fields equal to the template's default palette keep the style's hand-tuned colors.
 */
export function reelColors(styleId, palette) {
  const style = REEL_STYLES[styleId] ?? REEL_STYLES.nube;
  const c = { ...style.colors, manchas: [...style.colors.manchas] };
  if (!palette) return c;
  const d = defaultPalette(styleId);
  const bg = (palette.bg?.length ? palette.bg : d.bg).map(hex6);
  const bgChanged = !sameList(bg, d.bg);
  const textChanged = palette.text && hex6(palette.text) !== hex6(d.text);
  const accentChanged = palette.accent && hex6(palette.accent) !== hex6(d.accent);
  if (accentChanged) {
    c.acento = hex6(palette.accent);
    c.acentoTexto = best(c.acento, ["#FFFFFF", DARK_TEXT]);
  }
  if (textChanged) c.texto = hex6(palette.text);
  if (bgChanged) {
    const dark = luminance(bg[0]) < 0.2;
    c.fondo = bg[0];
    c.fondo2 = bg[1] ?? mix(bg[0], dark ? "#FFFFFF" : "#000000", 0.05);
    c.tarjeta = dark ? mix(bg[0], "#FFFFFF", 0.08) : "#FFFFFF";
    c.oscuro = dark ? mix(bg[0], "#000000", 0.45) : mix(c.texto, "#000000", 0.15);
    if (!textChanged && contrast(c.fondo, c.texto) < 4.5) c.texto = best(c.fondo, [style.colors.texto, "#FFFFFF", DARK_TEXT]);
  }
  const accent2 = palette.accent2 ? hex6(palette.accent2) : null;
  const accent3 = palette.accent3 ? hex6(palette.accent3) : null;
  if (bgChanged || accentChanged || accent2 || accent3) {
    const dark = luminance(c.fondo) < 0.2;
    c.manchas = [
      bg[2] ?? mix(c.fondo, accent2 ?? c.acento, dark ? 0.32 : 0.18),
      bg[3] ?? mix(c.fondo, accent3 ?? (dark ? c.fondo2 : "#FFFFFF"), dark ? 0.3 : 0.55),
      mix(c.fondo, dark ? "#FFFFFF" : "#FFFFFF", dark ? 0.04 : 0.7),
    ].map(hex6);
    if (!bgChanged && !accent2 && !accent3) c.manchas = [...style.colors.manchas];
  }
  if (bgChanged || textChanged) {
    c.suave = mix(c.texto, c.fondo, 0.38);
    c.tarjetaTexto = contrast(c.tarjeta, c.texto) >= 4.5 ? c.texto : best(c.tarjeta, [DARK_TEXT, "#FFFFFF"]);
    c.linea = mix(c.tarjeta, c.tarjetaTexto, 0.12);
    c.oscuroTexto = best(c.oscuro, ["#F2F2F5", DARK_TEXT]);
    c.borde = style.family === "marcado" ? (contrast(c.fondo, c.texto) >= 3 ? c.texto : best(c.fondo, [DARK_TEXT, "#FFFFFF"])) : c.texto;
  }
  return c;
}

/**
 * Subtitle colors (linea / bloque) for a reel: the style's role colors, with spec.captions.colors
 * text / highlight overriding the subtitle text and keyword (accent) colors only; scenes keep their roles.
 * @param {{texto:string, acento:string, acentoTexto:string}} colors reelColors() output
 * @param {{text?:string, highlight?:string}} [captionColors] spec.captions.colors
 */
export function reelSubtitleColors(colors, captionColors) {
  const texto = typeof captionColors?.text === "string" ? hex6(captionColors.text) : colors.texto;
  const custom = typeof captionColors?.highlight === "string";
  const acento = custom ? hex6(captionColors.highlight) : colors.acento;
  return { texto, acento, acentoTexto: custom ? best(acento, ["#FFFFFF", DARK_TEXT]) : colors.acentoTexto };
}

// ---------------------------------------------------------------- scene vocabulary

const txt = (p, k, d = "") => (typeof p?.[k] === "string" ? p[k] : typeof p?.[k] === "number" ? String(p[k]) : d);
const arr = (p, k) => (Array.isArray(p?.[k]) ? p[k] : []);
const obj = (p, k) => (p?.[k] && typeof p[k] === "object" && !Array.isArray(p[k]) ? p[k] : {});
const bool = (p, k, d = false) => (typeof p?.[k] === "boolean" ? p[k] : d);
const itemText = (x) => (typeof x === "string" ? x : x && typeof x === "object" ? String(x.texto ?? x.text ?? "") : String(x ?? ""));

/**
 * Field rules: [field, kind, {max, optional, minItems, maxItems}] → readable problems.
 * kind: text | number | list | object | image.
 */
function rules(p, list) {
  const out = [];
  for (const [field, kind, o = {}] of list) {
    const v = p?.[field];
    if (v === undefined || v === null || v === "") {
      if (!o.optional) out.push(`missing "${field}"`);
      continue;
    }
    if ((kind === "text" || kind === "image") && typeof v !== "string") out.push(`"${field}" must be a string`);
    // kind "icon": an icon name or a drawing; objects are checked by reelsIssues (iconIssues) with their full path
    if (kind === "number" && typeof v !== "number") out.push(`"${field}" must be a number`);
    if (kind === "list" && !Array.isArray(v)) out.push(`"${field}" must be a list`);
    if (kind === "object" && (typeof v !== "object" || Array.isArray(v))) out.push(`"${field}" must be an object {...}`);
    if (typeof v === "string" && o.max && v.replace(/\*/g, "").length > o.max) out.push(`"${field}" is too long (${v.replace(/\*/g, "").length} chars, max ${o.max}) to read on screen`);
    if (Array.isArray(v) && o.maxItems && v.length > o.maxItems) out.push(`"${field}" has ${v.length} items; at most ${o.maxItems}`);
    if (Array.isArray(v) && o.minItems && v.length < o.minItems) out.push(`"${field}" needs at least ${o.minItems} items`);
    if (kind === "image" && typeof v === "string" && !/\.(png|jpe?g|webp)$/i.test(v)) out.push(`"${field}" must be a .png, .jpg or .webp image path`);
  }
  return out;
}
const oneOf = (p, k, allowed) => (p?.[k] === undefined || allowed.includes(p[k]) ? [] : [`"${k}" must be one of ${allowed.map((a) => `"${a}"`).join(", ")}`]);
const IMAGE_EFFECTS = ["agua", "causticas", "estrellas", "haz", "burbujas", "rayos", "cine", "flotar"];

/**
 * The 17 scene types. `alias` is the pack's Spanish name (accepted as `tipo`). `moments(p)` is the fixed number
 * of entrances; `sounds(p)` → [moment index, sound, volume]; `validate(p)` → problems; `showsAtStart(p)` when
 * the scene already shows something on its first frame; `warn(p)` → advice that does not block.
 */
export const REEL_SCENES = {
  headline: {
    alias: "titular",
    moments: () => 1,
    showsAtStart: () => true,
    sounds: (p) => (arr(p, "imagenes").length ? [[0, "whoosh", 0.3]] : txt(p, "icono") ? [[0, "pop", 0.35]] : []),
    validate: (p) => [
      ...rules(p, [["texto", "text", { max: 90 }], ["etiqueta", "text", { optional: true, max: 24 }], ["imagenes", "list", { optional: true, maxItems: 4 }], ["icono", "icon", { optional: true }]]),
      ...(txt(p, "texto").split("/").length > 4 ? ['"texto" has more than 4 lines; use at most 3 "/"'] : []),
      ...txt(p, "texto").split("/").map((l) => l.replace(/\*/g, "").trim()).filter((l) => l.length > 28).map((l) => `the line "${l}" is too long for a headline (more than 28 chars): split it with "/"`),
    ],
    warn: (p) => {
      const longest = txt(p, "texto").split("/").map((l) => l.replace(/\*/g, "").trim()).reduce((a, l) => (l.length > a.length ? l : a), "");
      return longest.length > 18 ? [`headline line "${longest}" has ${longest.length} chars and the title gets small; split it with "/" into lines of 14 chars or less`] : [];
    },
  },
  chat: {
    alias: "chat",
    moments: () => 5,
    showsAtStart: () => true,
    sounds: (p) => [...(txt(p, "mensaje") ? [[0, "tecla", 0.3], [1, "pop", 0.32]] : []), ...(txt(obj(p, "movil"), "titulo") ? [[3, "pop", 0.35]] : []), ...(txt(p, "pildora") ? [[4, "ding", 0.26]] : [])],
    validate: (p) => rules(p, [["mensaje", "text", { optional: true, max: 38 }], ["titulo", "text", { optional: true, max: 20 }], ["saludo", "text", { optional: true, max: 28 }], ["respuesta", "text", { optional: true, max: 26 }], ["pildora", "text", { optional: true, max: 34 }], ["anotacion", "text", { optional: true, max: 16 }], ["movil", "object", { optional: true }]]),
  },
  editor: {
    alias: "editor",
    moments: () => 4,
    showsAtStart: () => true,
    sounds: (p) => [[0, "whoosh", 0.3], [1, "exito", 0.26], ...(arr(p, "sonidos").length ? [[3, "pop", 0.35]] : [])],
    validate: (p) => rules(p, [["hecho", "text", { optional: true, max: 24 }], ["archivo", "text", { optional: true, max: 24 }], ["palabras", "list", { optional: true, maxItems: 4 }], ["sonidos", "list", { optional: true, maxItems: 3 }]]),
  },
  phone: {
    alias: "movil",
    moments: () => 3,
    sounds: (p) => [[0, "whoosh", 0.28], ...(txt(p, "pegatina") ? [[2, "pop", 0.38]] : [])],
    validate: (p) => rules(p, [["titulo", "text", { max: 24 }], ["subtitulo", "text", { optional: true, max: 18 }], ["pegatina", "text", { optional: true, max: 12 }], ["contador", "object", { optional: true }]]),
  },
  counter: {
    alias: "contador",
    moments: () => 2,
    sounds: (p) => [[1, bool(p, "llama") ? "puff" : "golpe", bool(p, "llama") ? 0.4 : 0.45]],
    validate: (p) => rules(p, [["valor", "number"], ["etiqueta", "text", { max: 40 }], ["desde", "number", { optional: true }]]),
    warn: (p) => (txt(p, "etiqueta").length > 28 ? [`counter label has ${txt(p, "etiqueta").length} chars: 28 or less fits on one line`] : []),
  },
  stats: {
    alias: "cifras",
    moments: (p) => Math.max(1, Math.min(3, arr(p, "filas").length)),
    sounds: (p) => arr(p, "filas").slice(0, 3).map((f, k) => [k, bool(f, "destacar") ? "golpe" : "tic", bool(f, "destacar") ? 0.45 : 0.3]),
    validate: (p) => [
      ...rules(p, [["filas", "list", { minItems: 1, maxItems: 3 }]]),
      ...arr(p, "filas").flatMap((f, k) => rules(f, [["valor", "number"], ["etiqueta", "text", { max: 14 }], ["detalle", "text", { optional: true, max: 30 }]]).map((s) => `row ${k + 1}: ${s}`)),
    ],
  },
  card: {
    alias: "ficha",
    moments: (p) => Math.max(1, Math.min(4, arr(p, "filas").length)),
    showsAtStart: () => true,
    sounds: (p) => arr(p, "filas").slice(0, 4).map((_, k) => [k, "pop", 0.25]),
    validate: (p) => [
      ...rules(p, [["titulo", "text", { max: 18 }], ["etiqueta", "text", { optional: true, max: 14 }], ["filas", "list", { minItems: 1, maxItems: 4 }]]),
      ...arr(p, "filas").flatMap((f, k) => (Array.isArray(f) && f.length >= 2 ? [] : [`row ${k + 1}: must be ["label", "value"] or ["label", "value", true]`])),
    ],
  },
  list: {
    alias: "lista",
    moments: (p) => Math.max(1, Math.min(5, arr(p, "items").length)),
    showsAtStart: (p) => !!txt(p, "titulo"),
    sounds: (p) => arr(p, "items").slice(0, 5).map((_, k, a) => [k, k === a.length - 1 ? "ding" : "tic", k === a.length - 1 ? 0.26 : 0.3]),
    validate: (p) => [
      ...rules(p, [["titulo", "text", { optional: true, max: 22 }], ["items", "list", { minItems: 2, maxItems: 5 }]]),
      ...arr(p, "items").flatMap((it, k) => (itemText(it).length > 30 ? [`item ${k + 1} is too long (${itemText(it).length} chars, max 30)`] : [])),
    ],
  },
  steps: {
    alias: "pasos",
    moments: (p) => Math.max(1, Math.min(4, arr(p, "pasos").length)),
    sounds: (p) => arr(p, "pasos").slice(0, 4).map((_, k) => [k, "pop", 0.3]),
    validate: (p) => [...rules(p, [["pasos", "list", { minItems: 2, maxItems: 4 }]]), ...arr(p, "pasos").flatMap((it, k) => (itemText(it).length > 34 ? [`step ${k + 1} is too long (max 34 chars)`] : []))],
  },
  compare: {
    alias: "comparacion",
    moments: () => 3,
    sounds: () => [[0, "pop", 0.3], [1, "pop", 0.3], [2, "exito", 0.26]],
    validate: (p) => [
      ...rules(p, [["izquierda", "object"], ["derecha", "object"]]),
      ...["izquierda", "derecha"].flatMap((side) => rules(obj(p, side), [["titulo", "text", { max: 16 }], ["texto", "text", { optional: true, max: 50 }]]).map((s) => `${side}: ${s}`)),
      ...oneOf(p, "ganador", ["izquierda", "derecha", "ninguno"]),
    ],
  },
  strike: {
    alias: "tachado",
    moments: () => 2,
    showsAtStart: () => true,
    sounds: () => [[0, "negacion", 0.22], [1, "swoosh", 0.3]],
    validate: (p) => [...rules(p, [["antes", "text", { max: 22 }], ["despues", "text", { max: 18 }], ["imagen", "image", { optional: true }]]), ...oneOf(p, "modo", ["texto", "codigo"])],
  },
  objection: {
    alias: "objecion",
    moments: () => 2,
    showsAtStart: (p) => !!txt(p, "numero"),
    sounds: (p) => [[0, "pop", 0.32], ...(txt(p, "respuesta") ? [[1, "ding", 0.26]] : [])],
    validate: (p) => rules(p, [["texto", "text", { max: 60 }], ["respuesta", "text", { optional: true, max: 30 }], ["numero", "text", { optional: true, max: 12 }], ["intro", "text", { optional: true, max: 24 }]]),
  },
  quiz: {
    alias: "pregunta",
    moments: () => 3,
    sounds: () => [[1, "pop", 0.3], [2, "exito", 0.28]],
    validate: (p) => [
      ...rules(p, [["pregunta", "text", { max: 60 }], ["opciones", "list", { minItems: 2, maxItems: 4 }], ["correcta", "number", { optional: true }]]),
      ...arr(p, "opciones").flatMap((o, k) => (String(o).length > 28 ? [`option ${k + 1} is too long (max 28 chars)`] : [])),
    ],
  },
  bars: {
    alias: "barras",
    moments: (p) => Math.max(1, Math.min(5, arr(p, "barras").length)),
    showsAtStart: (p) => !!txt(p, "titulo"),
    sounds: (p) => arr(p, "barras").slice(0, 5).map((_, k) => [k, "tic", 0.3]),
    validate: (p) => [
      ...rules(p, [["barras", "list", { minItems: 2, maxItems: 5 }], ["titulo", "text", { optional: true, max: 26 }], ["unidad", "text", { optional: true, max: 4 }]]),
      ...arr(p, "barras").flatMap((x, k) => rules(x, [["etiqueta", "text", { max: 12 }], ["valor", "number"]]).map((s) => `bar ${k + 1}: ${s}`)),
    ],
  },
  image: {
    alias: "imagen",
    moments: () => 2,
    sounds: (p) => {
      const ef = new Set(arr(p, "efectos"));
      if (ef.has("cine")) return [[0, "proyector", 0.32]];
      if (ef.has("burbujas") || ef.has("agua")) return [[0, "burbuja", 0.28]];
      if (ef.has("estrellas") || ef.has("haz")) return [[0, "campana", 0.22]];
      return txt(p, "texto") ? [[1, "pop", 0.3]] : [];
    },
    validate: (p) => [
      ...rules(p, [["imagen", "image"], ["texto", "text", { optional: true, max: 34 }], ["etiqueta", "text", { optional: true, max: 22 }], ["efectos", "list", { optional: true }]]),
      ...arr(p, "efectos").flatMap((e) => (IMAGE_EFFECTS.includes(e) ? [] : [`effect "${e}" does not exist (effects: ${IMAGE_EFFECTS.join(", ")})`])),
      ...oneOf(p, "formato", ["horizontal", "cuadrada", "vertical"]),
      ...(Object.keys(obj(p, "peces")).length && !txt(obj(p, "peces"), "imagen") ? ['"peces" needs "imagen": a transparent PNG of the animal seen from above'] : []),
    ],
  },
  gallery: {
    alias: "galeria",
    moments: () => 2,
    sounds: (p) => [[txt(p, "modo") === "rejilla" ? 0 : 1, txt(p, "modo") === "orbita" ? "ding" : "whoosh", 0.3]],
    validate: (p) => [
      ...rules(p, [["imagenes", "list", { minItems: 2, maxItems: 6 }], ["etiqueta", "text", { optional: true, max: 30 }]]),
      ...arr(p, "imagenes").flatMap((s, k) => (typeof s === "string" && /\.(png|jpe?g|webp)$/i.test(s) ? [] : [`image ${k + 1} must be a .png, .jpg or .webp path`])),
      ...oneOf(p, "modo", ["abanico", "orbita", "rejilla"]),
    ],
  },
  drawing: {
    alias: "dibujo",
    moments: (p) => (txt(p, "texto") ? 2 : 1),
    sounds: (p) => [[0, "pop", 0.32], ...(txt(p, "texto") ? [[1, "tic", 0.26]] : [])],
    validate: (p) => [
      ...(p?.dibujo === undefined && p?.drawing === undefined ? ['missing "dibujo": your own vector drawing {id?, viewBox?, parts: [...], motion?, keys?}'] : []),
      ...rules(p, [["texto", "text", { optional: true, max: 60 }], ["etiqueta", "text", { optional: true, max: 24 }]]),
      ...(txt(p, "texto").split("/").length > 3 ? ['"texto" has more than 3 lines; use at most 2 "/"'] : []),
      ...txt(p, "texto").split("/").map((l) => l.replace(/\*/g, "").trim()).filter((l) => l.length > 22).map((l) => `the line "${l}" is too long under a drawing (more than 22 chars): split it with "/"`),
      ...oneOf(p, "marco", ["circulo", "tarjeta", "no"]),
    ],
  },
  cta: {
    alias: "cta",
    moments: () => 3,
    sounds: () => [[0, "tecla", 0.3], [1, "exito", 0.3]],
    validate: (p) => rules(p, [["palabra", "text", { max: 12 }], ["verbo", "text", { optional: true, max: 14 }], ["texto", "text", { optional: true, max: 50 }], ["iconos", "list", { optional: true, maxItems: 5 }]]),
  },
};
export const REEL_SCENE_TYPES = Object.keys(REEL_SCENES);

/** Plain lowercase ascii for comparing words (no accents, no punctuation). */
export const normWord = (w) =>
  String(w ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

const ALIAS_TO_TYPE = Object.fromEntries(Object.entries(REEL_SCENES).flatMap(([id, d]) => [[id, id], [normWord(d.alias), id]]));
/** Canonical (English) scene type of a reel scene object, from `type` or the pack's `tipo`; null if unknown. */
export const sceneTypeOf = (reel) => ALIAS_TO_TYPE[normWord(reel?.type ?? reel?.tipo ?? "")] ?? null;

/** Keys of a reel scene that are not scene fields. */
const CONTROL_KEYS = ["type", "tipo", "en", "at", "entrada", "transition", "sinSubtitulos", "noCaptions", "sfx", "voz"];
/** Extra per-scene sounds: `sfx` (or the pack's phrase-level `sonidos` when it is a list of [moment, sound, volume]). */
const isSoundList = (v) => Array.isArray(v) && v.length > 0 && v.every(Array.isArray);
export const extraSounds = (reel) => (Array.isArray(reel?.sfx) ? reel.sfx : isSoundList(reel?.sonidos) ? reel.sonidos : []);

// ---------------------------------------------------------------- moments

/**
 * Parse a moment:
 *  "palabra" | "palabra#2" | "palabra+6" | "palabra-4" | "palabra#2+6" | "inicio"/"start" | "fin"/"end" (+/- frames) | number.
 * @returns {{kind:"word",word:string,nth:number,offset:number}|{kind:"start"|"end",offset:number}|{kind:"frame",frame:number}|null}
 */
export function parseMoment(m) {
  if (typeof m === "number" && Number.isFinite(m)) return { kind: "frame", frame: m };
  if (typeof m !== "string") return null;
  const r = /^(.+?)(?:#(\d+))?([+-]\d+)?$/.exec(m.trim());
  if (!r) return null;
  const [, base, nth, off] = r;
  if (base.startsWith("#") || !normWord(base)) return null;
  const offset = off ? parseInt(off, 10) : 0;
  const b = normWord(base);
  if (b === "inicio" || b === "start") return { kind: "start", offset };
  if (b === "fin" || b === "end") return { kind: "end", offset };
  return { kind: "word", word: base, nth: nth ? parseInt(nth, 10) : 1, offset };
}

/** Frame at which a word heard at `tSec` appears: ADELANTO frames early, never before the scene cut. */
export const wordFrame = (tSec, cut, fps = 30) => Math.max(cut, Math.round(tSec * fps) - ADELANTO);

/**
 * Absolute frame of a moment.
 * @param {string|number} m
 * @param {{words: {w: string, f: number}[], cut: number, ini: number, end: number}} ctx  word appearance frames
 *   (absolute), the cut (first word - 1), the first frame of the scene (ini) and the frame it stops showing (end).
 * @returns {{frame: number} | {error: string}}
 */
export function resolveMoment(m, ctx) {
  const p = parseMoment(m);
  if (!p) return { error: `cannot read the moment "${m}" (use a word, "word#2", "word+6", "inicio", "fin" or a frame number)` };
  if (p.kind === "frame") return { frame: ctx.ini + p.frame };
  if (p.kind === "start") return { frame: ctx.cut + p.offset };
  if (p.kind === "end") return { frame: ctx.end - 1 + p.offset };
  const target = normWord(p.word);
  const exact = [];
  const prefix = [];
  ctx.words.forEach((w, k) => {
    const n = normWord(w.w);
    if (n === target) exact.push(k);
    if (target && n.startsWith(target)) prefix.push(k);
  });
  const list = exact.length >= p.nth ? exact : prefix;
  if (list.length >= p.nth) return { frame: ctx.words[list[p.nth - 1]].f + p.offset };
  return { error: `"${p.word}"${p.nth > 1 ? ` (occurrence ${p.nth})` : ""} is not in the narration. Words: ${ctx.words.map((w) => w.w).join(" ")}` };
}

/** Fill the moments `en` did not give: all spread over the scene, or the rest between the last given one and the end. */
export function distributeMoments(given, n, dur) {
  const b = given.slice(0, n);
  if (b.length >= n) return b;
  if (b.length === 0) {
    const until = Math.max(8, dur * 0.7);
    for (let k = 0; k < n; k++) b.push(Math.round(2 + (until - 2) * (n === 1 ? 0 : k / (n - 1))));
    return b;
  }
  const from = b[b.length - 1];
  const until = Math.max(from + 6, dur - 12);
  const missing = n - b.length;
  for (let k = 1; k <= missing; k++) b.push(Math.round(from + ((until - from) * k) / (missing + 1)));
  return b;
}

// ---------------------------------------------------------------- narration

/** Narration words with keyword flags: words between *asterisks* are keywords; `g` groups one *...* span. */
export function parseNarration(text) {
  let inside = false;
  let group = -1;
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      if (raw.startsWith("*") || (raw.includes("*") && !inside)) {
        if (!inside) group++;
        inside = true;
      }
      const clave = inside;
      const g = clave ? group : -1;
      const stripped = raw.replace(/[.,:;!?…»"')\]]+$/, "");
      if (inside && (stripped.endsWith("*") || (raw.indexOf("*") !== raw.lastIndexOf("*")))) inside = false;
      return { w: raw.replace(/\*/g, ""), clave, g };
    })
    .filter((x) => x.w.length > 0);
}

const stripStars = (s) => String(s ?? "").replace(/\*/g, "");
/** Text to synthesize for a reels scene: `reel.voz` (pronunciation) or the narration without asterisks. */
export const reelsTtsText = (scene) => {
  const voz = scene?.visual?.reel?.voz;
  return typeof voz === "string" && voz.trim() ? voz : stripStars(scene.narration);
};

// ---------------------------------------------------------------- timeline

export const REELS_TIMING = { firstLeadSec: 0.15, leadSec: 0.08, tailSec: 0.12, endTailSec: 1.1, minSceneSec: 1.2, secPerWord: 0.3 };

/**
 * Scene timeline for reels: same shape as computeTimeline (lib/timeline.mjs) but with short pauses between
 * sentences (one scene per sentence, cut on the first word) and no transition overlap.
 */
export function computeReelsTimeline(scenes, { fps }) {
  const T = REELS_TIMING;
  let from = 0;
  const out = scenes.map((s, i) => {
    const words = String(s.narration ?? "").trim().split(/\s+/).filter(Boolean).length;
    const speechSec = s.audioSec ?? words * T.secPerWord;
    const lead = i === 0 ? T.firstLeadSec : T.leadSec;
    const last = i === scenes.length - 1;
    const sec = Math.max(lead + speechSec + T.tailSec + (last ? T.endTailSec : 0), s.durationSec ?? 0, T.minSceneSec);
    const durationInFrames = Math.ceil(sec * fps);
    const scene = { from, durationInFrames, speechStartMs: Math.round((from / fps + lead) * 1000), speechSec };
    from += durationInFrames;
    return scene;
  });
  return { scenes: out, totalFrames: Math.max(1, from), transitionFrames: 0 };
}

// ---------------------------------------------------------------- icons

/** Lucide names used by the pack → Phosphor (MIT) names shipped with the engine. Unknown names pass through. */
export const ICON_ALIASES = {
  sparkles: "sparkle", clapperboard: "film-slate", languages: "translate", "piggy-bank": "piggy-bank", mic: "microphone", download: "download-simple",
  film: "film-strip", bookmark: "bookmark-simple", "user-plus": "user-plus", "message-circle": "chat-circle", "message-square": "chat-centered-text",
  send: "paper-plane-tilt", "list-checks": "list-checks", mail: "envelope-simple", flame: "fire", zap: "lightning", "trending-up": "trend-up",
  "trending-down": "trend-down", "dollar-sign": "currency-dollar", euro: "currency-eur", settings: "gear", search: "magnifying-glass",
  home: "house", "map-pin": "map-pin", smartphone: "device-mobile", "alert-triangle": "warning", "triangle-alert": "warning", "bar-chart": "chart-bar",
  "chart-bar": "chart-bar", "pie-chart": "chart-pie", "chart-pie": "chart-pie", server: "hard-drives", gamepad: "game-controller", "gamepad-2": "game-controller",
  dumbbell: "barbell", pencil: "pencil-simple", trash: "trash", "trash-2": "trash", video: "video-camera", music: "music-notes", wifi: "wifi-high",
  battery: "battery-full", "shopping-cart": "shopping-cart", "shopping-bag": "shopping-bag", "credit-card": "credit-card", "book-open": "book-open",
  "graduation-cap": "graduation-cap", "calendar-days": "calendar", "clock-3": "clock", timer: "timer", hourglass: "hourglass", "circle-check": "check-circle",
  "check-circle": "check-circle", "x-circle": "x-circle", "circle-x": "x-circle", "thumbs-up": "thumbs-up", "thumbs-down": "thumbs-down", brain: "brain",
  bot: "robot", "file-text": "file-text", "folder-open": "folder-open", "external-link": "arrow-square-out", "arrow-right": "arrow-right", rocket: "rocket",
  "badge-check": "seal-check", "shield-check": "shield-check", "lock-keyhole": "lock-key", globe: "globe", "globe-2": "globe-hemisphere-west",
  cpu: "cpu", "hard-drive": "hard-drive", "wand-2": "magic-wand", wand: "magic-wand", "lightbulb": "lightbulb", "image": "image", images: "images",
  camera: "camera", palette: "palette", "pen-tool": "pen-nib", code: "code", "code-2": "code", terminal: "terminal-window", "square-terminal": "terminal-window",
  users: "users", user: "user", heart: "heart", star: "star", gift: "gift", bell: "bell", play: "play", moon: "moon", sun: "sun", bed: "bed", coffee: "coffee",
  check: "check", x: "x", "refresh-cw": "arrows-clockwise", "repeat": "repeat", "plane": "airplane", car: "car", "tree-pine": "tree-evergreen", leaf: "leaf",
  droplet: "drop", "droplets": "drop", fish: "fish", "utensils": "fork-knife", "chef-hat": "chef-hat", pizza: "pizza", "dog": "dog", cat: "cat",
};
export const reelIconName = (name) => {
  const n = String(name ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return ICON_ALIASES[n] ?? n;
};

/** Icon names (Phosphor) a reels spec needs: scene fields, list items, defaults the scenes draw, the cover. */
export function collectReelIcons(spec) {
  const names = new Set(["sparkle", "envelope-simple", "chat-circle", "paper-plane-tilt", "gift", "list-checks", "check"]);
  const visit = (v, key) => {
    if (Array.isArray(v)) return v.forEach((x) => visit(x, key === "iconos" ? "icono" : key));
    if (typeof v === "string") {
      if (key === "icono" || key === "icon" || key === "centro") names.add(reelIconName(v));
      return;
    }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visit(x, k);
  };
  for (const s of spec.scenes ?? []) visit(s.visual?.reel, "");
  visit(spec.reels?.cover, "");
  return [...names];
}

// ---------------------------------------------------------------- agent drawings (the 2D kit in reels)

/** A drawing object of the 2D kit (lib/drawing.mjs): has a `parts` list. */
export const isDrawing = (v) => !!v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.parts);
/** The drawing of a `dibujo` scene (`dibujo`, or the English `drawing` key), or null. */
export const sceneDrawingOf = (p) => (isDrawing(p?.dibujo) ? p.dibujo : isDrawing(p?.drawing) ? p.drawing : null);

/**
 * Every icon slot of a reel scene (`icono` anywhere, `iconos` entries; not inside drawings): [{path, v}].
 * Each slot takes an icon name or a drawing (a "drawing piece").
 */
export function reelIconSlots(reel) {
  const out = [];
  const visit = (v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => visit(x, [...path, i]));
    if (!v || typeof v !== "object" || isDrawing(v)) return;
    for (const [k, x] of Object.entries(v)) {
      if (path.length === 0 && (CONTROL_KEYS.includes(k) || k === "dibujo" || k === "drawing")) continue;
      if (k === "icono") out.push({ path: [...path, k], v: x });
      else if (k === "iconos" && Array.isArray(x)) x.forEach((y, i) => out.push({ path: [...path, k, i], v: y }));
      else visit(x, [...path, k]);
    }
  };
  visit(reel, []);
  return out;
}

/** Every drawing of a reel scene (the dibujo scene's own and the drawing pieces): [{path, d}] (paths in the reel). */
export function reelDrawings(reel) {
  const out = [];
  for (const k of ["dibujo", "drawing"]) if (isDrawing(reel?.[k])) out.push({ path: [k], d: reel[k] });
  for (const s of reelIconSlots(reel)) if (isDrawing(s.v)) out.push({ path: s.path, d: s.v });
  return out;
}

/** Moment strings of a reel scene's 2D layer: its drawings' `at` / `until` and its fx (scene-relative seconds once resolved). */
export function reelMomentStrings(reel, fx) {
  const out = new Set();
  for (const { d } of reelDrawings(reel)) for (const { m } of drawingMomentPaths(d)) out.add(m);
  for (const f of fx ?? []) for (const k of ["at", "until"]) if (typeof f?.[k] === "string") out.add(f[k]);
  return [...out];
}

/** Problems of one drawing (schema + cross-field checks of lib/drawing.mjs): [{path, message}] relative to it. */
const drawingProblems = (d) => {
  const r = drawingVisualSchema.safeParse(d);
  return r.success ? [] : r.error.issues.map((i) => ({ path: i.path, message: i.message }));
};

// ---------------------------------------------------------------- validation

const findEmoji = (v, path = []) => {
  if (typeof v === "string") return hasEmoji(v) ? [path] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => findEmoji(x, [...path, i]));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => findEmoji(x, [...path, k]));
  return [];
};

/**
 * Validation of a reels spec (template reels-*): scene types, fields and lengths, `en` words that must be
 * said in the narration, transitions, sounds, no emoji. Returns [{path: (string|number)[], message}].
 */
export function reelsIssues(spec) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });
  const opts = spec.reels ?? {};
  if (opts.subtitles !== undefined && !normSubtitles(opts.subtitles)) add(["reels", "subtitles"], 'must be "linea"/"line", "bloque"/"block" or "no"/"none"');
  if (opts.transition !== undefined && !normTransition(opts.transition)) add(["reels", "transition"], 'must be "corte"/"cut", "suave"/"soft" or "semitono"/"halftone"');
  for (const where of findEmoji(opts.cover)) add(["reels", "cover", ...where], "emoji are not allowed in reels templates");
  (spec.scenes ?? []).forEach((s, i) => {
    const at = ["scenes", i];
    if (hasEmoji(s.narration ?? "")) add([...at, "narration"], "emoji are not allowed in reels templates (the narration is shown as subtitles)");
    if (s.visual?.type !== "reel" || !s.visual.reel) {
      add([...at, "visual"], 'reels templates need visual: {type: "reel", reel: {type: "<scene type>", ...}}');
      return;
    }
    const reel = s.visual.reel;
    const base = [...at, "visual", "reel"];
    const type = sceneTypeOf(reel);
    if (!type) {
      add(base, `unknown reel scene type "${reel.type ?? reel.tipo ?? ""}". Types: ${REEL_SCENE_TYPES.map((t) => `${t} (${REEL_SCENES[t].alias})`).join(", ")}`);
      return;
    }
    for (const msg of REEL_SCENES[type].validate(reel)) add(base, `${type}: ${msg}`);
    for (const where of findEmoji(reel)) add([...base, ...where], "emoji are not allowed in reels templates");
    for (const k of ["entrada", "transition"]) if (reel[k] !== undefined && !normTransition(reel[k])) add([...base, k], 'must be "corte", "suave" or "semitono"');
    const words = parseNarration(s.narration).map((w) => ({ w: w.w, f: 0 }));
    const ctx = { words, cut: 0, ini: 0, end: 1 };
    const en = reel.en ?? reel.at;
    if (en !== undefined && !Array.isArray(en)) add([...base, "en"], "must be a list of moments");
    (Array.isArray(en) ? en : []).forEach((m, k) => {
      const r = resolveMoment(m, ctx);
      if (r.error) add([...base, "en", k], r.error);
    });
    // the agent's drawings: the dibujo scene's own, and drawings in any icon slot; their word moments must be said
    const drawKey = type === "drawing" ? ["dibujo", "drawing"].find((k) => reel[k] !== undefined) : undefined;
    if (drawKey && !isDrawing(reel[drawKey])) add([...base, drawKey], 'must be a drawing {id?, viewBox?, parts: [...], motion?, keys?}');
    for (const slot of reelIconSlots(reel)) {
      if (slot.v === undefined || slot.v === null || typeof slot.v === "string") continue;
      if (!isDrawing(slot.v)) add([...base, ...slot.path], "must be an icon name or a drawing {viewBox?, parts: [...], motion?}");
    }
    for (const { path, d } of reelDrawings(reel)) {
      for (const pr of drawingProblems(d)) add([...base, ...path, ...pr.path], pr.message);
      for (const { path: mp, m } of drawingMomentPaths(d)) {
        if (!parseMoment(m)) continue; // unreadable: reported by the drawing schema
        const r = resolveMoment(m, ctx);
        if (r.error) add([...base, ...path, ...mp], r.error);
      }
    }
    (Array.isArray(s.visual.fx) ? s.visual.fx : []).forEach((f, k) => {
      for (const field of ["at", "until"]) {
        if (typeof f?.[field] !== "string" || !parseMoment(f[field])) continue;
        const r = resolveMoment(f[field], ctx);
        if (r.error) add([...at, "visual", "fx", k, field], r.error);
      }
    });
    const key = Array.isArray(reel.sfx) ? "sfx" : "sonidos";
    if (reel.sfx !== undefined && !Array.isArray(reel.sfx)) add([...base, "sfx"], 'must be a list of [moment, "sound", volume?]');
    extraSounds(reel).forEach((x, k) => {
      if (x.length < 2 || typeof x[1] !== "string") return add([...base, key, k], 'must be [moment, "sound", volume?]');
      if (!REEL_SOUNDS.includes(x[1])) add([...base, key, k, 1], `unknown sound "${x[1]}". Sounds: ${REEL_SOUNDS.join(", ")}`);
      const r = resolveMoment(x[0], ctx);
      if (r.error) add([...base, key, k, 0], r.error);
    });
  });
  return issues;
}

// ---------------------------------------------------------------- plan

/** Word timings per scene (seconds): from the captions when they match the script 1:1, else text-timed. */
function sceneWordTimes(spec, timeline, captions, tokens) {
  const total = tokens.reduce((a, t) => a + t.length, 0);
  const raw = spec.scenes.map((s) => String(s.narration ?? "").trim().split(/\s+/).filter(Boolean));
  const rawTotal = raw.reduce((a, t) => a + t.length, 0);
  if (captions?.length && (captions.length === rawTotal || captions.length === total)) {
    const out = [];
    let k = 0;
    const counts = captions.length === rawTotal ? raw.map((r) => r.length) : tokens.map((t) => t.length);
    counts.forEach((n, i) => {
      const slice = captions.slice(k, k + n);
      k += n;
      // tokens drop pure-asterisk words; keep timings aligned to the kept tokens
      const kept = captions.length === rawTotal ? slice.filter((_, j) => raw[i][j].replace(/\*/g, "").length > 0) : slice;
      out.push(kept.map((c) => ({ t: c.startMs / 1000, end: c.endMs / 1000 })));
    });
    return out;
  }
  return spec.scenes.map((s, i) => {
    const sc = timeline.scenes?.[i];
    const start = (sc?.speechStartMs ?? 0) / 1000;
    const speech = sc?.speechSec ?? tokens[i].length * REELS_TIMING.secPerWord;
    const chars = tokens[i].reduce((a, w) => a + w.w.length + 1, 0) || 1;
    let t = start;
    return tokens[i].map((w) => {
      const d = (speech * (w.w.length + 1)) / chars;
      const r = { t, end: t + d };
      t += d;
      return r;
    });
  });
}

const reelProps = (reel) => Object.fromEntries(Object.entries(reel ?? {}).filter(([k, v]) => !CONTROL_KEYS.includes(k) && !(k === "sonidos" && isSoundList(v))));

/** The cover (portada): spec.reels.cover, or the first headline / the title. Accepts the pack's field names. */
export function coverOf(spec) {
  const c = spec.reels?.cover ?? spec.reels?.portada ?? {};
  const first = spec.scenes?.[0]?.visual?.reel;
  const fallback = sceneTypeOf(first) === "headline" && typeof first.texto === "string" ? first.texto.split("/").map((l) => l.trim()).filter(Boolean).slice(0, 3) : [spec.title];
  const lines = c.lines ?? c.lineas;
  return {
    etiqueta: c.label ?? c.etiqueta ?? undefined,
    lineas: Array.isArray(lines) && lines.length ? lines.slice(0, 4).map(String) : fallback,
    icono: c.icon ?? c.icono ?? (sceneTypeOf(first) === "headline" ? first.icono : undefined),
    imagenes: c.images ?? c.imagenes ?? [],
    pegatina: c.sticker ?? c.pegatina ?? undefined,
    oscura: !!(c.dark ?? c.oscura),
  };
}

/**
 * Plan a reels video: scene cuts on the first word of each sentence, transitions, every scene's moment frames
 * (relative to the scene start), its words, the subtitle phrases and the sound effects.
 * @param {object} spec resolved spec (template reels-*)
 * @param {{scenes: {speechStartMs: number, speechSec: number}[], totalFrames: number}} timeline
 * @param {{text: string, startMs: number, endMs: number}[]} captions word captions, 1:1 with the script words
 */
export function planReels(spec, timeline, captions) {
  const fps = spec.format?.fps ?? 30;
  const style = reelStyleOf(spec.template);
  const family = REEL_STYLES[style].family;
  const opts = spec.reels ?? {};
  const subtitles = spec.captions?.enabled === false ? "no" : (normSubtitles(opts.subtitles) ?? "linea");
  const defaultEntrance = normTransition(opts.transition) ?? (family === "suave" ? "suave" : "corte");
  const tokens = spec.scenes.map((s) => parseNarration(s.narration));
  const times = sceneWordTimes(spec, timeline, captions, tokens);
  const n = spec.scenes.length;
  const lastWordFrame = Math.ceil((times[n - 1]?.at(-1)?.end ?? 0) * fps);
  const TOTAL = Math.max(1, timeline.totalFrames ?? 0, lastWordFrame + 12);
  const warnings = [];

  const cuts = [];
  for (let i = 0; i < n; i++) {
    const first = times[i][0]?.t ?? 0;
    cuts.push(i === 0 ? 0 : Math.max(cuts[i - 1] + 2, Math.round(first * fps) - 1));
  }
  const entrance = (i) => (i === 0 ? "corte" : (normTransition(spec.scenes[i].visual?.reel?.entrada ?? spec.scenes[i].visual?.reel?.transition) ?? defaultEntrance));
  const ini = (i) => (i === 0 ? 0 : entrance(i) === "suave" ? cuts[i] - SOLAPE / 2 : cuts[i]);
  const fin = (i) => (i + 1 < n ? (entrance(i + 1) === "suave" ? cuts[i + 1] + SOLAPE / 2 : cuts[i + 1]) : TOTAL);

  const sounds = [];
  const scenes = spec.scenes.map((s, i) => {
    const reel = s.visual?.reel ?? {};
    const type = sceneTypeOf(reel) ?? "headline";
    const def = REEL_SCENES[type];
    const p = reelProps(reel);
    const a = ini(i);
    const dur = Math.max(1, fin(i) - a);
    const words = tokens[i].map((w, k) => ({ ...w, f: wordFrame(times[i][k]?.t ?? 0, cuts[i], fps) }));
    const ctx = { words, cut: cuts[i], ini: a, end: fin(i) };
    const given = [];
    for (const m of reel.en ?? reel.at ?? []) {
      const r = resolveMoment(m, ctx);
      if (r.error) warnings.push(`scene ${i + 1} (${type}): ${r.error}`);
      else given.push(r.frame - a);
    }
    const count = def.moments(p);
    if (given.length > count) warnings.push(`scene ${i + 1} (${type}): "en" has ${given.length} moments but this scene uses ${count}; the extra ones do nothing`);
    const b = distributeMoments(given, count, dur);
    for (const msg of def.warn?.(p) ?? []) warnings.push(`scene ${i + 1}: ${msg}`);
    const last = b.at(-1) ?? 0;
    if (i + 1 < n && dur - last < 15) warnings.push(`scene ${i + 1} (${type}): the last element enters ${((dur - last) / fps).toFixed(1)} s before the cut and is barely seen; move it to an earlier word`);
    const empty = (b[0] ?? 0) + a - cuts[i];
    if (!def.showsAtStart?.(p) && empty > 24) {
      // Never leave the stage empty (rhythm rule: nothing still for more than 0.6 s). Pull the first element
      // to 0.4 s after the cut and keep the later moments on their words.
      const pulled = Math.max(0, cuts[i] + 12 - a);
      b[0] = b.length > 1 ? Math.min(pulled, b[1] - 1) : pulled;
      warnings.push(`scene ${i + 1} (${type}): nothing showed for ${(empty / fps).toFixed(1)} s, so its first element was pulled forward to 0.4 s after the cut; put the first "en" moment on an earlier word`);
    }
    for (const [k, snd, vol] of def.sounds(p)) if (b[k] !== undefined) sounds.push({ at: a + b[k], s: snd, vol });
    for (const x of extraSounds(reel)) {
      if (!Array.isArray(x) || !REEL_SOUNDS.includes(x[1])) continue;
      const r = resolveMoment(x[0], ctx);
      if (!r.error) sounds.push({ at: r.frame, s: x[1], vol: Math.max(0, Math.min(1, Number(x[2] ?? 0.3))) });
    }
    // the 2D layer: fx and the moment map of the drawings' and fx's word moments (seconds from the scene's first frame)
    const fx = Array.isArray(s.visual?.fx) ? s.visual.fx : [];
    const strings = reelMomentStrings(reel, fx);
    let momentos;
    if (strings.length) {
      momentos = {};
      for (const m of strings) {
        const r = resolveMoment(m, ctx);
        if (r.error) warnings.push(`scene ${i + 1} (${type}): ${r.error}`);
        momentos[m] = r.error ? 0 : Math.round((Math.max(0, r.frame - a) / fps) * 1000) / 1000;
      }
    }
    return {
      ...(fx.length ? { fx } : {}),
      ...(momentos ? { momentos } : {}),
      i,
      type,
      ini: a,
      fin: fin(i),
      dur,
      cut: cuts[i],
      entrada: entrance(i),
      salida: i + 1 < n ? entrance(i + 1) : null,
      p,
      b,
      palabras: words.map((w) => ({ w: w.w, f: w.f - a, clave: w.clave, g: w.g })),
    };
  });
  sounds.sort((x, y) => x.at - y.at);
  const frases = spec.scenes.map((s, i) => ({
    texto: stripStars(s.narration),
    inicio: times[i][0]?.t ?? 0,
    fin: times[i].at(-1)?.end ?? 0,
    palabras: tokens[i].map((w, k) => ({ w: w.w, t: times[i][k]?.t ?? 0, clave: w.clave, g: w.g })),
  }));
  const sinSubtitulos = spec.scenes.map((s, i) => (s.visual?.reel?.sinSubtitulos || s.visual?.reel?.noCaptions ? i : -1)).filter((i) => i >= 0);
  const colors = reelColors(style, spec.theme?.palette);
  return {
    style,
    family,
    colors,
    subtitleColors: reelSubtitleColors(colors, spec.captions?.colors),
    arte: reelArtColors(style, spec.theme?.palette),
    subtitles,
    totalFrames: TOTAL,
    titulo: spec.title,
    scenes,
    frases,
    sinSubtitulos,
    sounds,
    cover: coverOf(spec),
    warnings,
  };
}
