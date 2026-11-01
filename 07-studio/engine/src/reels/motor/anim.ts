import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { FPS } from "./constantes";

/** Escala con rebote a partir del fotograma `desde` (0 antes). */
export const usePop = (desde: number, config = { damping: 12, stiffness: 190, mass: 0.6 }) => {
  const frame = useCurrentFrame();
  if (frame < desde) return 0;
  return spring({ frame: frame - desde, fps: FPS, config });
};

/** Entrada suave sin rebote (0→1). */
export const useSuave = (desde: number, dur = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [desde, desde + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
};

export const lerp = (f: number, a: number, b: number, from: number, to: number, ease = Easing.out(Easing.cubic)) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Flotación continua (px) para que nada se quede quieto. */
export const useFlota = (fase: number, amp = 6, vel = 14) => {
  const frame = useCurrentFrame();
  return amp * Math.sin(frame / vel + fase);
};

/** Pico 0→1→0 alrededor de `en` (golpes de escala). */
export const bump = (frame: number, en: number, dur = 7) => {
  const t = (frame - en) / dur;
  return t < 0 || t > 1 ? 0 : Math.sin(t * Math.PI);
};

/** Ruido determinista en [0,1). */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Número con separador de miles español. */
export const numeroES = (n: number, decimales = 0) => {
  const [ent, dec] = Math.abs(n).toFixed(decimales).split(".");
  const conPuntos = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${conPuntos}${dec ? `,${dec}` : ""}`;
};
