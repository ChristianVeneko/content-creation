// Palette helpers for the wizard: the user's palette choice, CSS variables for live previews, WCAG contrast.
import type { CSSProperties } from "react";
import type { Palette, PalettePreset, TemplateInfo } from "../../shared/types.ts";
import { contrastRatio } from "../../shared/captions.ts";

export type PaletteChoice = { kind: "original" } | { kind: "preset"; id: string } | { kind: "custom"; palette: Palette };

export const FALLBACK_PALETTE: Palette = { bg: ["#0F0C29", "#302B63"], text: "#FFFFFF", accent: "#FFD60A" };

/** The palette a template renders with when nothing overrides it. */
export function templatePalette(t: TemplateInfo | undefined): Palette {
  if (t?.palette) return t.palette;
  if (t) return { bg: t.gradient.slice(0, 2), text: "#FFFFFF", accent: t.accent ?? FALLBACK_PALETTE.accent };
  return FALLBACK_PALETTE;
}

/** The palette to preview, and the override to send (undefined keeps the template's own). */
export function resolveChoice(choice: PaletteChoice, presets: PalettePreset[] | null, t: TemplateInfo | undefined): { preview: Palette; override?: Palette; label: string } {
  if (choice.kind === "preset") {
    const p = presets?.find((x) => x.id === choice.id);
    if (p) return { preview: p.palette, override: p.palette, label: p.name };
  }
  if (choice.kind === "custom") return { preview: choice.palette, override: choice.palette, label: "Personalizada" };
  return { preview: templatePalette(t), label: "Original" };
}

/** CSS custom properties consumed by .tcard and .pal-preview to recolor a card live. */
export function paletteVars(p: Palette): CSSProperties {
  const bg2 = p.bg[1] ?? p.bg[0];
  return {
    "--p-bg1": p.bg[0],
    "--p-bg2": bg2,
    "--p-text": p.text,
    "--p-accent": p.accent,
    "--p-accent2": p.accent2 ?? p.accent,
    "--p-accent3": p.accent3 ?? p.accent2 ?? p.accent,
  } as CSSProperties;
}

export { contrastRatio };

/** Lowest text contrast across the background stops. */
export const minTextContrast = (p: Palette) => Math.min(...p.bg.map((bg) => contrastRatio(p.text, bg)));

export const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/** Minimum contrast the wizard asks for: WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5;

/** Lowest contrast of a foreground color across the background stops, and the stop that causes it. */
export function worstContrast(fg: string, bgs: string[]): { ratio: number; against: string } {
  let worst = { ratio: Infinity, against: bgs[0] };
  for (const bg of bgs) {
    const ratio = contrastRatio(fg, bg);
    if (ratio < worst.ratio) worst = { ratio, against: bg };
  }
  return worst;
}

export interface ContrastBadge {
  id: "text" | "accent";
  label: string;
  ratio: number;
  ok: boolean;
}

/** Contrast badges for the palette step: text and accent against the worst background stop; ok from 4.5. */
export function contrastBadges(p: Palette): ContrastBadge[] {
  const mk = (id: ContrastBadge["id"], name: string, fg: string): ContrastBadge => {
    const { ratio } = worstContrast(fg, p.bg);
    return { id, label: `${name} ${ratio.toFixed(1)}:1`, ratio, ok: ratio >= MIN_CONTRAST };
  };
  return [mk("text", "Texto", p.text), mk("accent", "Acento", p.accent)];
}
