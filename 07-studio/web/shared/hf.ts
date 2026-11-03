// HyperFrames formats (pixel-world, flat-2d, ...): pure helpers shared by the server and the UI.
// Everything is driven by the engine registry (`templates` output: modes, styles, settings, ownsCaptions), so a
// new format appears without touching this file. These formats draw their OWN captions inside the composition:
// the app never writes caption style, colors or position into their spec (only `captions.enabled`).
import type { TemplateInfo, VideoSpec } from "./types.ts";

export type HfMode = "single" | "multi";
export type HfQuality = "draft" | "looks" | "delivery";
export type HfPace = "calm" | "normal" | "fast";
export type HfCamera = "none" | "subtle" | "dynamic";
export type HfCta = "follow" | "comment" | "send" | "custom";
/** Pixel quality of the pixel-world format (written to `spec.hf.pixelScale`): chunky 8 px, standard 4 px, fine 2 px per art pixel. */
export type HfPixelScale = "chunky" | "standard" | "fine";

/** What the Create wizard (and the storyboard) lets the user choose for a HyperFrames format. */
export interface HfOptions {
  mode: HfMode;
  /** Style id from the format's `meta.styles` (written to `spec.hf.style`). */
  style?: string;
  /** Setting/scenario id from `meta.settings`; guides the script writer (the payload field is the format's own). */
  setting?: string;
  /** "Video principal con subtitulos" (default): `spec.captions.enabled`. The engine always also writes the version without. */
  withSubtitles: boolean;
  quality: HfQuality;
  /** Pixel quality (pixel-world only; written to `spec.hf.pixelScale` when set, absent = standard). */
  pixelScale?: HfPixelScale;
  /** Advanced, format-agnostic (SDD 7.7); each is written to the spec only when set. */
  pace?: HfPace;
  camera?: HfCamera;
  brandPill?: boolean;
  followClick?: boolean;
  cta?: HfCta;
  variants?: number;
}

export const HF_MODES: HfMode[] = ["single", "multi"];
export const HF_QUALITIES: HfQuality[] = ["draft", "looks", "delivery"];
export const HF_PACES: HfPace[] = ["calm", "normal", "fast"];
export const HF_CAMERAS: HfCamera[] = ["none", "subtle", "dynamic"];
export const HF_CTAS: HfCta[] = ["follow", "comment", "send", "custom"];
export const HF_PIXEL_SCALES: HfPixelScale[] = ["chunky", "standard", "fine"];
export const HF_PIXEL_FORMAT = "pixel-world";
export const HF_MAX_VARIANTS = 5;

export const HF_MODE_CHOICES: { value: HfMode; label: string; hint: string }[] = [
  { value: "single", label: "Una escena continua", hint: "Un solo mundo y una sola cámara que viaja entre estaciones. Ideal para procesos, paso a paso y duelos." },
  { value: "multi", label: "Varias escenas", hint: "Una secuencia de mundos unidos por cortes o barridos. Ideal para historias, rankings y una idea por mundo." },
];
export const HF_QUALITY_CHOICES: { value: HfQuality; label: string; hint: string }[] = [
  { value: "draft", label: "Borrador", hint: "Rápido y de baja calidad: para revisar ritmo y textos." },
  { value: "looks", label: "Normal", hint: "Calidad de publicación; es el valor por defecto." },
  { value: "delivery", label: "Entrega", hint: "La más alta y la más lenta." },
];
export const HF_PIXEL_CHOICES: { value: HfPixelScale; label: string; hint: string }[] = [
  { value: "chunky", label: "Grueso", hint: "Píxeles grandes y muy legibles (retro, portátil). El más rápido de renderizar." },
  { value: "standard", label: "Estándar", hint: "El tamaño de píxel propio del estilo. Es el valor por defecto." },
  { value: "fine", label: "Fino", hint: "Píxeles de la mitad de tamaño: más detalle y movimiento más suave. Tarda cerca de un tercio más en renderizar (unos 40 s en lugar de 30 s en un video de 55 s) y el archivo pesa más." },
];
/** The draft render always uses the standard pixel size (speed first); shown next to the control. */
export const HF_PIXEL_DRAFT_NOTE = "El borrador siempre se renderiza con calidad de píxel estándar.";
export const HF_PACE_LABEL: Record<HfPace, string> = { calm: "Calmado", normal: "Normal", fast: "Rápido" };
export const HF_CAMERA_LABEL: Record<HfCamera, string> = { none: "Fija", subtle: "Sutil", dynamic: "Dinámica" };
export const HF_CTA_LABEL: Record<HfCta, string> = { follow: "Seguir", comment: "Comentar una palabra", send: "Enviar a un amigo", custom: "Personalizado" };

/** A format drawn by a HyperFrames composition with its own captions (engine `templates` flags it). */
export const isHfTemplate = (t?: { engine?: string; ownsCaptions?: boolean } | null): boolean => Boolean(t && (t.engine === "hyperframes" || t.ownsCaptions === true));

/** A spec written for a HyperFrames format (it carries `mode` or the `hf` payload). */
export const isHfSpec = (spec?: Pick<VideoSpec, "mode" | "hf"> | null): boolean => Boolean(spec && (spec.mode !== undefined || spec.hf !== undefined));

export const hfModesOf = (t?: Pick<TemplateInfo, "modes"> | null): HfMode[] => {
  const modes = (t?.modes ?? []).filter((m): m is HfMode => HF_MODES.includes(m as HfMode));
  return modes.length > 0 ? modes : [...HF_MODES];
};

/** Defaults for a format: first style, its first mode ("multi" when offered), main video with subtitles, normal quality. */
export function defaultHfOptions(t?: TemplateInfo | null): HfOptions {
  const modes = hfModesOf(t);
  return { mode: modes.includes("multi") ? "multi" : modes[0], ...(t?.styles?.[0] ? { style: t.styles[0].id } : {}), withSubtitles: true, quality: "looks" };
}

/** Saved choices over the defaults, repaired for this format (a mode, style or setting it does not have falls back). */
export function resolveHfOptions(saved: Partial<HfOptions> | undefined, t?: TemplateInfo | null): HfOptions {
  const base = defaultHfOptions(t);
  const o: HfOptions = { ...base, ...(saved ?? {}) };
  if (!hfModesOf(t).includes(o.mode)) o.mode = base.mode;
  if (o.style !== undefined && !(t?.styles ?? []).some((s) => s.id === o.style)) o.style = base.style;
  if (o.setting !== undefined && !(t?.settings ?? []).some((s) => s.id === o.setting)) delete o.setting;
  if (!HF_QUALITIES.includes(o.quality)) o.quality = base.quality;
  if (o.pixelScale !== undefined && (t?.id !== HF_PIXEL_FORMAT || !HF_PIXEL_SCALES.includes(o.pixelScale))) delete o.pixelScale;
  return o;
}

export const isHfQuality = (v: unknown): v is HfQuality => HF_QUALITIES.includes(v as HfQuality);

/** First problem in the HyperFrames choices (Spanish, for the UI), or null when they are valid or absent. */
export function hfOptionsIssue(v: unknown, t?: TemplateInfo | null): string | null {
  if (v === undefined) return null;
  if (!v || typeof v !== "object" || Array.isArray(v)) return "Las opciones del formato animado deben ser un objeto.";
  const o = v as Record<string, unknown>;
  if (!HF_MODES.includes(o.mode as HfMode)) return `Modo de escenas inválido: usa ${HF_MODES.join(" o ")}.`;
  if (t && !hfModesOf(t).includes(o.mode as HfMode)) return `El formato ${t.name} no admite el modo ${String(o.mode)}.`;
  if (o.style !== undefined && (typeof o.style !== "string" || (t?.styles && t.styles.length > 0 && !t.styles.some((s) => s.id === o.style)))) return `Estilo desconocido para este formato: ${String(o.style)}.`;
  if (o.setting !== undefined && (typeof o.setting !== "string" || (t?.settings && t.settings.length > 0 && !t.settings.some((s) => s.id === o.setting)))) return `Escenario desconocido para este formato: ${String(o.setting)}.`;
  if (o.quality !== undefined && !isHfQuality(o.quality)) return `Calidad inválida: usa ${HF_QUALITIES.join(", ")}.`;
  if (o.pixelScale !== undefined && !HF_PIXEL_SCALES.includes(o.pixelScale as HfPixelScale)) return `Calidad de píxel inválida: usa ${HF_PIXEL_SCALES.join(", ")}.`;
  if (o.pace !== undefined && !HF_PACES.includes(o.pace as HfPace)) return `Ritmo inválido: usa ${HF_PACES.join(", ")}.`;
  if (o.camera !== undefined && !HF_CAMERAS.includes(o.camera as HfCamera)) return `Cámara inválida: usa ${HF_CAMERAS.join(", ")}.`;
  if (o.cta !== undefined && !HF_CTAS.includes(o.cta as HfCta)) return `Cierre inválido: usa ${HF_CTAS.join(", ")}.`;
  if (o.variants !== undefined && !(Number.isInteger(o.variants) && (o.variants as number) >= 1 && (o.variants as number) <= HF_MAX_VARIANTS)) return `Variantes: un entero entre 1 y ${HF_MAX_VARIANTS}.`;
  for (const k of ["withSubtitles", "brandPill", "followClick"] as const) if (o[k] !== undefined && typeof o[k] !== "boolean") return `${k} debe ser verdadero o falso.`;
  return null;
}

/**
 * Write the user's HyperFrames choices into a spec: `mode`, `hf.style`, the advanced fields (only when set) and
 * `captions.enabled`. Engine caption fields (style, colors, position, reels subtitles) are REMOVED: the composition
 * draws its own captions and a second layer would double the subtitles.
 */
export function applyHfOptions(spec: VideoSpec, o: HfOptions): VideoSpec {
  const next: VideoSpec = { ...spec, mode: o.mode };
  const pixel = o.pixelScale && spec.template === HF_PIXEL_FORMAT ? { pixelScale: o.pixelScale } : {};
  if (o.style || Object.keys(pixel).length > 0) next.hf = { ...(isObj(spec.hf) ? spec.hf : {}), ...(o.style ? { style: o.style } : {}), ...pixel };
  else if (spec.hf !== undefined && !isObj(spec.hf)) delete next.hf;
  if (o.pace) next.pace = o.pace;
  if (o.camera) next.camera = { ...(isObj(spec.camera) ? spec.camera : {}), intensity: o.camera };
  if (o.brandPill !== undefined || o.followClick !== undefined) {
    next.brand = { ...(isObj(spec.brand) ? spec.brand : {}), ...(o.brandPill !== undefined ? { pill: o.brandPill } : {}), ...(o.followClick !== undefined ? { followClick: o.followClick } : {}) };
  }
  if (o.cta) next.cta = { type: o.cta };
  if (o.variants && o.variants > 1) next.variants = { count: o.variants };
  return stripEngineCaptions({ ...next, captions: { enabled: o.withSubtitles } });
}

/** Remove everything that styles engine captions from a HyperFrames spec; keep only `captions.enabled`. */
export function stripEngineCaptions(spec: VideoSpec): VideoSpec {
  const next: VideoSpec = { ...spec };
  if (isObj(next.theme)) {
    const { captionStyle: _c, renderer: _r, ...theme } = next.theme;
    next.theme = theme as VideoSpec["theme"];
  }
  delete next.reels;
  if (next.captions !== undefined) next.captions = { enabled: isObj(next.captions) && typeof next.captions.enabled === "boolean" ? next.captions.enabled : true };
  return next;
}

/** Request lines that tell the spec writer what the user chose (the format's own guidance comes from `prompt <id>`). */
export function hfPromptLines(o: HfOptions, t?: TemplateInfo | null): string[] {
  const name = (list: { id: string; name: string }[] | undefined, id?: string) => list?.find((x) => x.id === id)?.name;
  return [
    `Scene mode: ${o.mode} (${o.mode === "single" ? "one continuous world, one camera travelling between stations, no cuts" : "a sequence of worlds joined by cuts or wipes"})`,
    o.style ? `Style: ${o.style}${name(t?.styles, o.style) ? ` (${name(t?.styles, o.style)})` : ""}. Use exactly this style in spec.hf.` : null,
    o.setting ? `Setting/scenario: ${o.setting}${name(t?.settings, o.setting) ? ` (${name(t?.settings, o.setting)})` : ""}. Build the world around it.` : null,
    o.pixelScale && o.pixelScale !== "standard" ? `Pixel quality: set \`pixelScale\` to "${o.pixelScale}" in spec.hf.` : null,
    o.pace ? `Pace: ${o.pace}` : null,
    o.camera ? `Camera intensity: ${o.camera}` : null,
    o.brandPill ? "Show the brand pill (avatar + handle)." : null,
    o.followClick ? "Close with the follow-click animation." : null,
    o.cta ? `Call to action: ${o.cta}` : null,
    "Captions: the composition draws its own subtitles. Never add caption style, colors or position fields.",
  ].filter((l): l is string => l !== null);
}

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
