// Scene library: canonical (English) scene type → component. The pack's Spanish names are accepted by
// lib/reels.mjs (sceneTypeOf); moments, sounds and field rules live there too.
import type { DefEscena } from "../tipos";
import { chat, editor, movil } from "./apps";
import { cta } from "./cta";
import { dibujo } from "./dibujo";
import { galeria, imagen } from "./fotos";
import { barras, cifras, comparacion, contador, ficha, lista, objecion, pasos, pregunta, tachado } from "./tarjetas";
import { titular } from "./titular";

export const BIBLIOTECA: Record<string, DefEscena> = {
  headline: titular,
  chat,
  editor,
  phone: movil,
  counter: contador,
  stats: cifras,
  card: ficha,
  list: lista,
  steps: pasos,
  compare: comparacion,
  strike: tachado,
  objection: objecion,
  quiz: pregunta,
  bars: barras,
  image: imagen,
  gallery: galeria,
  drawing: dibujo,
  cta,
};
