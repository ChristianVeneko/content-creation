// Caption catalog shared by the server and the UI (pure). Mirrors the engine's lib/captions.mjs
// (CAPTION_STYLES, CAPTION_SIZES, CAPTION_POSITIONS) and the `spec.captions` contract, plus the caption
// panel state and its mapping to `spec.captions`.
import type { Palette } from "./types.ts";

/** Engine order: the original four first, then the catalog added on 2026-11-01. */
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
] as const;
export type CaptionStyle = (typeof CAPTION_STYLES)[number];

export const CAPTION_SIZES = ["s", "m", "l", "xl"] as const;
export type CaptionSize = (typeof CAPTION_SIZES)[number];

export const CAPTION_POSITIONS = ["top", "upper", "center", "lower", "bottom"] as const;
export type CaptionPosition = (typeof CAPTION_POSITIONS)[number];

/** `spec.reels.subtitles` modes of the reels-* templates (engine lib/reels.mjs SUBTITLE_MODES). */
export const REELS_SUBTITLE_MODES = ["linea", "bloque", "no"] as const;
export type ReelsSubtitleMode = (typeof REELS_SUBTITLE_MODES)[number];

/** Styles drawn in their own band when no position is set (engine STYLE_DEFAULT_POSITION). */
export const STYLE_DEFAULT_POSITION: Partial<Record<CaptionStyle, CaptionPosition>> = { "two-tone": "upper", punch: "center" };

/** `spec.captions.colors`: unset fields take the palette-derived value. */
export interface CaptionColors {
  text?: string;
  highlight?: string;
  box?: string;
  outline?: string;
}
export type CaptionColorKey = keyof CaptionColors;
export const CAPTION_COLOR_KEYS: CaptionColorKey[] = ["text", "highlight", "box", "outline"];

/** `spec.captions` and channel `defaults.captions` (every field optional; the engine fills the rest). */
export interface CaptionSettings {
  enabled?: boolean;
  wordsPerPage?: number;
  style?: CaptionStyle;
  size?: CaptionSize;
  position?: CaptionPosition;
  uppercase?: boolean;
  speaker?: string;
  /** Legacy alias of colors.highlight (colors.highlight wins). */
  accent?: string;
  colors?: CaptionColors;
}

export const isCaptionStyle = (v: unknown): v is CaptionStyle => CAPTION_STYLES.includes(v as CaptionStyle);
export const isReelsSubtitleMode = (v: unknown): v is ReelsSubtitleMode => REELS_SUBTITLE_MODES.includes(v as ReelsSubtitleMode);
const REELS_SUBTITLE_ALIASES: Record<string, ReelsSubtitleMode> = { line: "linea", linea: "linea", "línea": "linea", block: "bloque", bloque: "bloque", none: "no", no: "no", off: "no" };
/** A stored `spec.reels.subtitles` (Spanish or English alias) as a mode, or null (engine normSubtitles). */
export const normReelsSubtitles = (v: unknown): ReelsSubtitleMode | null =>
  typeof v === "string" ? (REELS_SUBTITLE_ALIASES[v.trim().toLowerCase()] ?? null) : null;
const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isWords = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 8;
const isSpeaker = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.trim().length <= 40;

/** First problem in a caption settings object (Spanish, for the UI), or null when it is valid or absent. */
export function captionSettingsIssue(v: unknown): string | null {
  if (v === undefined) return null;
  if (!isObj(v)) return "Los subtítulos deben ser un objeto.";
  if (v.style !== undefined && !isCaptionStyle(v.style)) return `Estilo de subtítulos desconocido: ${String(v.style)}.`;
  if (v.size !== undefined && !CAPTION_SIZES.includes(v.size as CaptionSize)) return "Tamaño de subtítulos inválido (s, m, l o xl).";
  if (v.position !== undefined && !CAPTION_POSITIONS.includes(v.position as CaptionPosition)) return "Posición de subtítulos inválida.";
  if (v.enabled !== undefined && typeof v.enabled !== "boolean") return "captions.enabled debe ser verdadero o falso.";
  if (v.uppercase !== undefined && typeof v.uppercase !== "boolean") return "captions.uppercase debe ser verdadero o falso.";
  if (v.wordsPerPage !== undefined && !isWords(v.wordsPerPage)) return "Palabras por página: un número entre 1 y 8.";
  if (v.speaker !== undefined && !isSpeaker(v.speaker)) return "El nombre del personaje admite hasta 40 caracteres.";
  if (v.accent !== undefined && !isHex(v.accent)) return "El color de acento de los subtítulos debe ser hex (#RRGGBB).";
  if (v.colors !== undefined) {
    if (!isObj(v.colors)) return "Los colores de subtítulos deben ser un objeto.";
    for (const k of CAPTION_COLOR_KEYS) {
      if (v.colors[k] !== undefined && !isHex(v.colors[k])) return `El color "${k}" de los subtítulos debe ser hex (#RRGGBB).`;
    }
  }
  return null;
}

/** The valid fields of a caption settings object (unknown or invalid fields dropped), or undefined if none remain. */
export function cleanCaptionSettings(v: unknown): CaptionSettings | undefined {
  if (!isObj(v)) return undefined;
  const out: CaptionSettings = {};
  if (typeof v.enabled === "boolean") out.enabled = v.enabled;
  if (isWords(v.wordsPerPage)) out.wordsPerPage = v.wordsPerPage;
  if (isCaptionStyle(v.style)) out.style = v.style;
  if (CAPTION_SIZES.includes(v.size as CaptionSize)) out.size = v.size as CaptionSize;
  if (CAPTION_POSITIONS.includes(v.position as CaptionPosition)) out.position = v.position as CaptionPosition;
  if (typeof v.uppercase === "boolean") out.uppercase = v.uppercase;
  if (isSpeaker(v.speaker)) out.speaker = v.speaker.trim();
  if (isHex(v.accent)) out.accent = v.accent;
  if (isObj(v.colors)) {
    const colors: CaptionColors = {};
    for (const k of CAPTION_COLOR_KEYS) if (isHex(v.colors[k])) colors[k] = v.colors[k] as string;
    if (Object.keys(colors).length) out.colors = colors;
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------- colors ----------

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a #RGB or #RRGGBB color. */
export function hexLuminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [hexLuminance(a), hexLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The palette-derived caption colors ("Auto (paleta)"): text and highlight from the palette, the darkest
 * background stop as the shade for boxes and outlines. The engine applies the WCAG fallbacks at render time.
 */
export function autoCaptionColors(p: Palette): Required<CaptionColors> {
  const stops = p.bg.length ? p.bg : ["#000000"];
  const shade = stops.reduce((dark, c) => (hexLuminance(c) < hexLuminance(dark) ? c : dark));
  return { text: p.text, highlight: p.accent, box: shade, outline: shade };
}

// ---------- panel ----------

/** Which caption controls a template takes: reels-* draw their own subtitles; pixel-* start with captions off. */
export type CaptionKind = "standard" | "reels" | "pixel";
export function captionKind(templateId: string | undefined): CaptionKind {
  if (templateId?.startsWith("reels-")) return "reels";
  if (templateId?.startsWith("pixel-")) return "pixel";
  return "standard";
}

export type CaptionCasing = "auto" | "upper" | "normal";

/** What the caption panel edits. `null` / "auto" mean "leave it to the template or style". */
export interface CaptionPanelState {
  enabled: boolean | null;
  /** null: no style chosen (channel defaults: pick per video). */
  style: CaptionStyle | null;
  size: CaptionSize;
  position: CaptionPosition | "auto";
  casing: CaptionCasing;
  wordsPerPage: number | null;
  colorMode: "auto" | "custom";
  /** Custom colors; in Auto mode they hold the palette values (prefill for the pickers). */
  colors: Required<CaptionColors>;
}

/** Panel state from a stored `captions` object. A legacy `accent` or any `colors` opens in custom mode. */
export function panelFromCaptions(c: CaptionSettings | undefined, ctx: { palette: Palette; style: CaptionStyle | null | undefined }): CaptionPanelState {
  const auto = autoCaptionColors(ctx.palette);
  const custom = Boolean(c?.colors && Object.keys(c.colors).length) || typeof c?.accent === "string";
  const colors = custom ? { ...auto, ...(c?.accent ? { highlight: c.accent } : {}), ...(c?.colors ?? {}) } : auto;
  return {
    enabled: typeof c?.enabled === "boolean" ? c.enabled : null,
    style: c?.style ?? ctx.style ?? null,
    size: c?.size ?? "m",
    position: c?.position ?? "auto",
    casing: c?.uppercase === true ? "upper" : c?.uppercase === false ? "normal" : "auto",
    wordsPerPage: typeof c?.wordsPerPage === "number" ? c.wordsPerPage : null,
    colorMode: custom ? "custom" : "auto",
    colors,
  };
}

/**
 * The `captions` object for a panel state, keeping the base's other fields (speaker, …). Auto choices are
 * omitted; Auto colors write no `colors` and drop the legacy `accent`; custom colors write all four.
 */
export function captionsFromPanel(s: CaptionPanelState, base: CaptionSettings = {}): CaptionSettings {
  const { style: _style, size: _size, position: _position, uppercase: _uppercase, colors: _colors, accent: _accent, ...rest } = base;
  const out: CaptionSettings = { ...rest };
  if (s.enabled === null) delete out.enabled;
  else out.enabled = s.enabled;
  if (s.wordsPerPage === null) delete out.wordsPerPage;
  else out.wordsPerPage = s.wordsPerPage;
  if (s.style) out.style = s.style;
  if (s.size !== "m") out.size = s.size;
  if (s.position !== "auto") out.position = s.position;
  if (s.casing !== "auto") out.uppercase = s.casing === "upper";
  if (s.colorMode === "custom") out.colors = { ...s.colors };
  return out;
}

/** "Restablecer": back to Auto (paleta), pickers refilled with the palette values. */
export function resetCaptionColors(s: CaptionPanelState, palette: Palette): CaptionPanelState {
  return { ...s, colorMode: "auto", colors: autoCaptionColors(palette) };
}
