// The current reel: style, role colors, fonts, icons and where things go on screen. In the pack these were
// module constants read from plan.json; here they are live bindings set once per render by applyReel() (the
// root composition calls it before any scene renders), so every scene keeps the pack's simple imports.
import { REEL_ART, REEL_STYLES } from "../../../lib/reels.mjs";
import type { IconData } from "../../types";
import type { ReelColors, ReelSubtitleColors, ReelsPlan } from "../tipos";
import { F, type EstiloFuentes } from "./estilos";

type EstiloActual = { nombre: string; familia: "suave" | "marcado"; fuentes: EstiloFuentes; escalaTitulo: number; grano: number };

const estiloDe = (id: string): EstiloActual => {
  const s = (REEL_STYLES as Record<string, { family: "suave" | "marcado"; fonts: EstiloFuentes; escalaTitulo: number; grano: number }>)[id] ?? REEL_STYLES.nube;
  return { nombre: id, familia: s.family, fuentes: s.fonts, escalaTitulo: s.escalaTitulo, grano: s.grano };
};

/** Role colors of the current style (mutated in place, so `C.acento` is always current). */
export const C: ReelColors = { ...(REEL_STYLES.nube.colors as ReelColors), manchas: [...REEL_STYLES.nube.colors.manchas] };
/** Subtitle colors (text, keyword box / keyword color and its ink): the roles unless spec.captions.colors overrides them. */
export const CS: ReelSubtitleColors = { texto: C.texto, acento: C.acento, acentoTexto: C.acentoTexto };
export let ESTILO: EstiloActual = estiloDe("nube");
export let SUAVE = true;
/** Card shadows by family: soft diffuse shadow, or a hard offset shadow in the border color. */
export let SOMBRA = "";
export let SOMBRA_PEQ = "";
/** Card border (marked family only). */
export let BORDE = "none";
/** Minimal plan info some scenes need (title, previous scene type for chat/editor continuity). */
export let PLAN: { titulo: string; tipos: string[] } = { titulo: "", tipos: [] };
export let ICONOS: Record<string, IconData> = {};
export let SUBTITULOS: "linea" | "bloque" | "no" = "linea";
/** Second / third accents of the style for the agent's drawings and fx (mutated in place by applyReel). */
export const ARTE: { accent2: string; accent3: string } = { ...REEL_ART.nube };

/** Design zone of the scenes: they draw in screen coordinates inside this rectangle. */
export const LIENZO = { x: 60, y: 210, w: 960, h: 860 };
/** Where the scene fits on screen (the canvas is scaled and centered here), inside the 900x1300 safe box. */
export let ZONA = { x: 90, y: 300, w: 900, h: 940 };
/** Vertical center of the subtitle line ("linea" mode). */
export let SUB_Y = 1330;

const setFamilia = () => {
  SUAVE = ESTILO.familia === "suave";
  SOMBRA = SUAVE ? "0 26px 54px rgba(40, 30, 60, 0.18), 0 8px 16px rgba(40, 30, 60, 0.10)" : `10px 12px 0 ${C.borde}`;
  SOMBRA_PEQ = SUAVE ? "0 10px 22px rgba(40, 30, 60, 0.16), 0 3px 6px rgba(40, 30, 60, 0.10)" : `5px 6px 0 ${C.borde}`;
  BORDE = SUAVE ? "none" : `5px solid ${C.borde}`;
};
setFamilia();

/** Point every binding at this reel's style, colors, fonts, subtitles and icons. Idempotent. */
export const applyReel = (plan: Pick<ReelsPlan, "style" | "colors" | "subtitleColors" | "subtitles" | "titulo" | "scenes" | "arte">, icons: Record<string, IconData> = {}) => {
  ESTILO = estiloDe(plan.style);
  Object.assign(C, plan.colors, { manchas: [...plan.colors.manchas] });
  Object.assign(CS, plan.subtitleColors ?? { texto: C.texto, acento: C.acento, acentoTexto: C.acentoTexto });
  Object.assign(ARTE, plan.arte ?? (REEL_ART as Record<string, { accent2: string; accent3: string }>)[plan.style] ?? REEL_ART.nube);
  setFamilia();
  Object.assign(F, { titulo: `BRTitulo-${plan.style}`, texto: `BRTexto-${plan.style}`, mano: `BRMano-${plan.style}`, mono: `BRMono-${plan.style}` });
  PLAN = { titulo: plan.titulo, tipos: plan.scenes.map((s) => s.type) };
  ICONOS = icons;
  SUBTITULOS = plan.subtitles;
  ZONA = SUBTITULOS === "bloque" ? { x: 90, y: 600, w: 900, h: 960 } : { x: 90, y: 300, w: 900, h: 940 };
  SUB_Y = 1330;
};
