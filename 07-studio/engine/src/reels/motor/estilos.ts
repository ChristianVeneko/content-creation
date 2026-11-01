// Style typing and helpers. The style data lives in lib/reels.mjs (REEL_STYLES); the current style is applied
// per render by motor/actual.ts (applyReel).
export type Fuente = { file: string; weight: number };
export type EstiloFuentes = { titulo: Fuente; texto: Fuente[]; mano: Fuente; mono: Fuente[] };

/**
 * Font family names the scenes use. applyReel() points them at the current style's faces
 * (each style registers its own families, so several styles can coexist in one page).
 */
export const F = { titulo: "BRTitulo-nube", texto: "BRTexto-nube", mano: "BRMano-nube", mono: "BRMono-nube" };

/** Add transparency to a #RRGGBB color. */
export const alfa = (hex: string, a: number) =>
  `${hex.slice(0, 7)}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0")}`;
