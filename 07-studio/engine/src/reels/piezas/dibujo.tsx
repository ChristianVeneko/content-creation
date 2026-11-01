// The agent's own vector drawings (lib/drawing.mjs, rendered by src/components/Drawing2D.tsx) in the reels visual
// language: the style's role colors (C.*), soft diffuse shadows (soft family) or ink outlines with a hard offset
// shadow (marked family), the style's fonts. Used by the `dibujo` scene and by any icon slot (drawing pieces).
import React from "react";
import { useCurrentFrame } from "remotion";
import { DrawingSvg, type DrawingColors, type DrawingSkin, type DrawingSpec } from "../../components/Drawing2D";
import type { FxTint } from "../../components/Fx2D";
import { ARTE, C, ESTILO, SUAVE } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { F } from "../motor/estilos";
import type { Entrada } from "../tipos";

/** A drawing object (has `parts`), as opposed to an icon name. */
export const esDibujo = (x: unknown): x is DrawingSpec => !!x && typeof x === "object" && !Array.isArray(x) && Array.isArray((x as { parts?: unknown }).parts);

/** What an icon slot holds: an icon name (Lucide / Phosphor) or the agent's drawing. */
export type IconoRef = string | DrawingSpec;

/**
 * Per-scene context of the 2D layer: word moments (seconds from the scene's first frame, planReels `momentos`),
 * the second the scene's drawing enters (default start of pop-in, draw-on...), the scene index (ids, seeds) and
 * the scene's entrance.
 */
export const EscenaDibujo = React.createContext<{ momentos?: Record<string, number>; entra: number; i: number; entrada?: Entrada }>({ entra: 0, i: 0 });

/** true if a #RRGGBB color is dark. */
export const esOscuro = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

/** Drawing roles from the current style: accent = acento, ink = the border ink (contrasts the background)... */
export const coloresDibujo = (): DrawingColors => ({
  accent: C.acento,
  accent2: ARTE.accent2,
  accent3: ARTE.accent3,
  good: C.exito,
  bad: C.error,
  muted: C.suave,
  text: C.texto,
  bg: C.fondo,
  surface: C.tarjeta,
  line: C.linea,
  paper: C.tarjeta,
  ink: C.borde,
});

/** How the current style restyles a drawing drawn `px` pixels wide (shadow and outline scale with it). */
export const pielDibujo = (px: number): DrawingSkin => {
  const k = Math.max(0.35, Math.min(1.4, px / 520));
  const fonts = { display: F.titulo, body: F.texto, mono: F.mono, hand: F.mano, weight: ESTILO.fuentes.titulo.weight };
  if (SUAVE) {
    const dark = esOscuro(C.fondo);
    return { fonts, shadow: `drop-shadow(0 ${Math.round(18 * k)}px ${Math.round(26 * k)}px ${dark ? "rgba(0, 0, 0, 0.5)" : "rgba(40, 30, 60, 0.2)"})` };
  }
  // marked family: ink outlines and a hard offset shadow in the border color; the chalkboard boils a little
  const chalk = ESTILO.nombre === "pizarra";
  return {
    fonts,
    outline: { color: C.borde, width: 6 },
    shadow: `drop-shadow(${Math.round(8 * k)}px ${Math.round(9 * k)}px 0 ${chalk ? "rgba(0, 0, 0, 0.45)" : C.borde})`,
    ...(chalk ? { filter: "marker" as const, fillOpacity: 0.94 } : {}),
  };
};

/** How the current style tints the 2D fx. */
export const tinteFx = (): FxTint => {
  const dark = esOscuro(C.fondo);
  return {
    palette: [C.acento, ARTE.accent2, ARTE.accent3, dark ? C.texto : C.exito],
    spark: dark ? C.acento : ARTE.accent2,
    splash: SUAVE ? (C.manchas[0] ?? C.fondo2) : C.acento,
    scribble: SUAVE ? C.acento : C.borde,
    lines: C.texto,
    leak: [ARTE.accent2, C.acento],
    grain: 0.1,
    glow: dark,
    outline: SUAVE ? null : C.borde,
    wash: false,
    light: !dark,
  };
};

/**
 * A drawing at `tam` x `tam` px (viewBox fitted), animated from the scene clock with the scene's word moments.
 * `entra` overrides the second its one-shot presets start (default: the scene context's).
 */
export const Dibujo: React.FC<{ dibujo: DrawingSpec; tam: number; alto?: number; entra?: number; uid?: string; style?: React.CSSProperties }> = ({ dibujo, tam, alto, entra, uid, style }) => {
  const f = useCurrentFrame();
  const ctx = React.useContext(EscenaDibujo);
  const auto = React.useId();
  return (
    <DrawingSvg
      drawing={dibujo}
      colors={coloresDibujo()}
      skin={pielDibujo(tam)}
      t={f / FPS}
      enter={entra ?? ctx.entra}
      moments={ctx.momentos}
      width={tam}
      height={alto ?? tam}
      uid={uid ?? `rd${ctx.i}-${auto}`}
      seed={ctx.i + 1}
      style={{ display: "block", flexShrink: 0, ...style }}
    />
  );
};
