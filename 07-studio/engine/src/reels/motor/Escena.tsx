import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "./actual";
import { SEMI, SOLAPE } from "./constantes";
import { rnd } from "./anim";
import type { Entrada } from "../tipos";

/**
 * Envoltorio de cada escena: empuje lento de cámara durante toda la escena y, si la entrada o la
 * salida son suaves, fundido con desenfoque y un poco de escala (como los reels de estilo "limpio").
 */
export const Escena: React.FC<{ dur: number; entrada: Entrada; salida: Entrada | null; children: React.ReactNode; empuje?: number }> = ({
  dur,
  entrada,
  salida,
  children,
  empuje = 0.035,
}) => {
  const f = useCurrentFrame();
  const p = Math.min(1, f / Math.max(1, dur));
  let op = 1,
    blur = 0,
    esc = 1 + empuje * p;
  if (entrada === "suave" && f < SOLAPE) {
    const t = Easing.out(Easing.cubic)(f / SOLAPE);
    op = t;
    blur += (1 - t) * 14;
    esc *= 1.05 - 0.05 * t;
  }
  if (salida === "suave" && f > dur - SOLAPE) {
    const t = interpolate(f, [dur - SOLAPE, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
    op *= 1 - t;
    blur += t * 12;
    esc *= 1 - 0.03 * t;
  }
  return (
    <AbsoluteFill style={{ opacity: op, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, transform: `scale(${esc}) translateY(${-10 * p}px)`, transformOrigin: "50% 38%" }}>
      {children}
    </AbsoluteFill>
  );
};

/** Transición de semitono: puntos que crecen desde el centro hasta tapar la pantalla y vuelven a encoger. */
export const Semitono: React.FC<{ centro: number; color?: string }> = ({ centro, color = C.acento }) => {
  const f = useCurrentFrame();
  const t = (f - (centro - SEMI / 2)) / SEMI;
  if (t <= 0 || t >= 1) return null;
  const cell = 54;
  const cols = Math.ceil(1080 / cell) + 1;
  const rows = Math.ceil(1920 / cell) + 1;
  const cobertura = t < 0.5 ? Easing.in(Easing.quad)(t / 0.5) : 1 - Easing.out(Easing.quad)((t - 0.5) / 0.5);
  const dots: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * cell + (j % 2 ? cell / 2 : 0);
      const cy = j * cell;
      const d = Math.hypot(cx - 540, cy - 960) / 1100;
      const k = Math.min(1, Math.max(0, cobertura * 1.45 - d * 0.35 - rnd(i * 97 + j) * 0.12));
      const r = k * cell * 0.78;
      if (r > 0.5) dots.push(<circle key={`${i}-${j}`} cx={cx} cy={cy} r={r} fill={color} />);
    }
  }
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920}>{dots}</svg>
    </AbsoluteFill>
  );
};
