// Loads the current style's fonts from public/reels/fonts under per-style family names (BRTitulo-<style>...).
// Loaded lazily by the reels compositions only (other templates never ship these files).
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { REEL_STYLES } from "../../../lib/reels.mjs";
import { ESTILO } from "./actual";
import type { EstiloFuentes, Fuente } from "./estilos";

const cargadas = new Map<string, Promise<void>>();
const listas = new Set<string>();

/** Load (once) every face of a style; resolves when they can be measured. */
export const cargarFuentes = (style: string): Promise<void> => {
  const ya = cargadas.get(style);
  if (ya) return ya;
  const fu = ((REEL_STYLES as Record<string, { fonts: EstiloFuentes }>)[style] ?? REEL_STYLES.nube).fonts;
  const caras: [string, Fuente][] = [
    [`BRTitulo-${style}`, fu.titulo],
    ...fu.texto.map((f) => [`BRTexto-${style}`, f] as [string, Fuente]),
    [`BRMano-${style}`, fu.mano],
    ...fu.mono.map((f) => [`BRMono-${style}`, f] as [string, Fuente]),
  ];
  const p = Promise.all(
    caras.map(([familia, f]) =>
      new FontFace(familia, `url('${staticFile(f.file)}') format('woff2')`, { weight: String(f.weight) }).load().then((face) => {
        document.fonts.add(face);
      }),
    ),
  ).then(() => {
    listas.add(style);
  });
  cargadas.set(style, p);
  return p;
};

/** Blocks the render until the style's fonts are ready (call it in the root composition). */
export const useCargaFuentes = (style: string) => {
  const [handle] = useState(() => (listas.has(style) ? null : delayRender(`Loading reels fonts (${style})`)));
  useEffect(() => {
    if (handle === null) return;
    cargarFuentes(style)
      .then(() => continueRender(handle))
      .catch((e) => cancelRender(new Error(`Could not load the reels fonts for "${style}": ${e}`)));
  }, [handle, style]);
};

/** true once the current style's fonts can be measured. */
export const useFuentes = () => {
  const style = ESTILO.nombre;
  const [ok, setOk] = useState(listas.has(style));
  useEffect(() => {
    if (!ok) cargarFuentes(style).then(() => setOk(true));
  }, [ok, style]);
  return ok;
};

/** Closest available text weight (do not ask for 700 when only 600 and 800 exist). */
export const pesoTexto = (quiero: number) => ESTILO.fuentes.texto.map((f) => f.weight).reduce((a, b) => (Math.abs(b - quiero) < Math.abs(a - quiero) ? b : a));
