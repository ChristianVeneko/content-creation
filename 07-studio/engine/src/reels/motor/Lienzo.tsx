import React from "react";
import { AbsoluteFill } from "remotion";
import { LIENZO, ZONA } from "./actual";

/**
 * Las escenas se dibujan con coordenadas de pantalla dentro de LIENZO (x 60–1020, y 210–1070).
 * Este envoltorio las escala y centra en la ZONA libre (que cambia según subtítulos y personaje).
 */
export const Lienzo: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const s = Math.min(ZONA.w / LIENZO.w, ZONA.h / LIENZO.h);
  const cx = ZONA.x + ZONA.w / 2,
    cy = ZONA.y + ZONA.h / 2;
  const lx = LIENZO.x + LIENZO.w / 2,
    ly = LIENZO.y + LIENZO.h / 2;
  if (Math.abs(s - 1) < 1e-3 && Math.abs(cx - lx) < 1 && Math.abs(cy - ly) < 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{ transform: `translate(${cx - lx}px, ${cy - ly}px) scale(${s})`, transformOrigin: `${lx}px ${ly}px` }}>{children}</AbsoluteFill>;
};

/** A box drawn in LIENZO coordinates, in screen pixels (where Lienzo puts it), for fx targets drawn outside Lienzo. */
export const aPantalla = (b: { x: number; y: number; w: number; h: number }) => {
  const s = Math.min(ZONA.w / LIENZO.w, ZONA.h / LIENZO.h);
  const cx = ZONA.x + ZONA.w / 2,
    cy = ZONA.y + ZONA.h / 2;
  const lx = LIENZO.x + LIENZO.w / 2,
    ly = LIENZO.y + LIENZO.h / 2;
  return { x: cx + (b.x - lx) * s, y: cy + (b.y - ly) * s, w: b.w * s, h: b.h * s };
};
