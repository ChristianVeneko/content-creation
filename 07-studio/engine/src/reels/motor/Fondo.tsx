import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { C, ESTILO, SUAVE } from "./actual";
import { alfa } from "./estilos";

/** Fondo del estilo: degradado con manchas de luz que se mueven despacio (suave) o liso con grano (marcado). */
export const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  const m = (cx: number, cy: number, r: number, color: string, a: number) => `radial-gradient(circle ${r}px at ${cx}px ${cy}px, ${alfa(color, a)} 0%, ${alfa(color, 0)} 100%)`;
  const [m1, m2, m3] = [C.manchas[0] ?? C.fondo2, C.manchas[1] ?? C.fondo, C.manchas[2] ?? C.manchas[0] ?? C.fondo2];
  const capas = SUAVE
    ? [
        m(820 + 70 * Math.sin(f / 95), 1480 + 90 * Math.cos(f / 120), 980, m1, 0.7),
        m(260 + 90 * Math.cos(f / 105), 520 + 70 * Math.sin(f / 85), 860, m2, 0.85),
        m(980 + 40 * Math.sin(f / 70), 260 + 50 * Math.cos(f / 90), 620, m3, 0.5),
      ]
    : [m(540, 900, 1100, m2, 0.35)];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${C.fondo} 0%, ${C.fondo2} 100%)` }}>
      <AbsoluteFill style={{ backgroundImage: capas.join(",") }} />
      {ESTILO.grano > 0 && (
        <AbsoluteFill
          style={{
            backgroundImage: `url(${staticFile("reels/textures/grain.png")})`,
            backgroundSize: "512px 512px",
            opacity: ESTILO.grano,
            mixBlendMode: "multiply",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
