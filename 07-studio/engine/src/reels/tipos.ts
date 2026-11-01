// Types of the reels family (port of the becario-reels pack). The plan is computed in Node by lib/reels.mjs.
import type React from "react";
import type { Fx } from "../components/Fx2D";

/** How a scene enters: hard cut, soft fade with blur, or an accent-color halftone wipe. */
export type Entrada = "corte" | "suave" | "semitono";

/** Narration word with its appearance frame relative to the scene start. */
export type PalabraEscena = { w: string; f: number; clave: boolean; g: number };

/** What every scene component receives. */
export type PropsEscena = {
  /** The scene fields from the spec (visual.reel without type/en/control keys). */
  p: Record<string, unknown>;
  /** Frames (relative to the scene start) at which each element enters. */
  b: number[];
  /** Scene length in frames. */
  dur: number;
  /** Narration words with their relative frames. */
  palabras: PalabraEscena[];
  /** Scene index (0 = first). */
  i: number;
};

/** A scene component plus the pack's per-scene metadata (moments, sounds and rules live in lib/reels.mjs). */
export type DefEscena = { C: React.FC<PropsEscena> } & Record<string, unknown>;

/** Subtitle phrase (seconds, absolute). */
export type PalabraT = { w: string; t: number; clave?: boolean; g?: number };
export type FraseT = { texto: string; inicio: number; fin: number; palabras: PalabraT[] };

export type ReelColors = {
  fondo: string;
  fondo2: string;
  manchas: string[];
  texto: string;
  suave: string;
  acento: string;
  acentoTexto: string;
  tarjeta: string;
  tarjetaTexto: string;
  linea: string;
  oscuro: string;
  oscuroTexto: string;
  borde: string;
  exito: string;
  error: string;
};

export type ReelSubtitleColors = { texto: string; acento: string; acentoTexto: string };

export type ReelScene = {
  i: number;
  type: string;
  ini: number;
  fin: number;
  dur: number;
  cut: number;
  entrada: Entrada;
  salida: Entrada | null;
  p: Record<string, unknown>;
  b: number[];
  palabras: PalabraEscena[];
  /** 2D fx of the scene (visual.fx, lib/fx2d.mjs), when it has any. */
  fx?: Fx[];
  /** Word moments of the scene's drawings and fx, in seconds from the scene's first frame. */
  momentos?: Record<string, number>;
};

export type ReelCover = { etiqueta?: string; lineas: string[]; icono?: string; imagenes: string[]; pegatina?: string; oscura: boolean };

/** Output of planReels (lib/reels.mjs). */
export type ReelsPlan = {
  style: string;
  family: "suave" | "marcado";
  colors: ReelColors;
  /** Subtitle text / keyword colors (role colors unless spec.captions.colors overrides them). Optional for older plans. */
  subtitleColors?: ReelSubtitleColors;
  /** Second / third accents for drawings and fx (lib/reels.mjs reelArtColors). Optional for older plans. */
  arte?: { accent2: string; accent3: string };
  subtitles: "linea" | "bloque" | "no";
  totalFrames: number;
  titulo: string;
  scenes: ReelScene[];
  frases: FraseT[];
  sinSubtitulos: number[];
  sounds: { at: number; s: string; vol: number }[];
  cover: ReelCover;
  warnings: string[];
};
