// Escena "cta": la llamada a la acción final. "Comenta PALABRA" con la palabra escribiéndose letra a letra,
// un texto a mano debajo, un sobre que sale volando hacia los mensajes, confeti e iconos que saltan
// por turnos para que la pantalla no se quede quieta al final.
import React from "react";
import { AbsoluteFill, Easing, spring, useCurrentFrame } from "remotion";
import { BORDE, C, SOMBRA, SUAVE } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { F, alfa } from "../motor/estilos";
import { bump, lerp, useFlota, usePop } from "../motor/anim";
import { Confeti, Icono } from "../piezas/basicas";
import type { IconoRef } from "../piezas/dibujo";
import type { DefEscena, PropsEscena } from "../tipos";
import { arr, txt } from "./util";

const Cta: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [bPalabra, bTexto, bIconos] = b;
  const palabra = txt(p, "palabra", "INFO").toUpperCase();
  const verbo = txt(p, "verbo", "Comenta");
  const lineas = txt(p, "texto")
    .split("/")
    .map((l) => l.trim())
    .filter(Boolean);
  const icos = (arr<IconoRef>(p, "iconos").length ? arr<IconoRef>(p, "iconos") : ["message-circle", "send", "gift", "list-checks", "check"]).slice(0, 5);
  const caja = spring({ frame: f, fps: FPS, config: { damping: 13, stiffness: 150, mass: 0.7 } });
  const fl = useFlota(0.9, 5, 16);
  const tam = palabra.length <= 6 ? 92 : palabra.length <= 9 ? 74 : 58;
  const ciclo = (f - bPalabra - 14) % 22;
  const barrido = f > bPalabra + 14 && ciclo < 12 ? ciclo / 12 : -1;
  const sobre = lerp(f, bTexto - 8, bTexto + 8, 0, 1, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 300 + (1 - caja) * 180 + fl, width: 840, height: 340, borderRadius: 44, background: C.tarjeta, boxShadow: SOMBRA, border: BORDE, opacity: Math.min(1, caja * 1.6), transform: `scale(${0.9 + 0.1 * caja})` }}>
        <div style={{ position: "absolute", top: 40, left: 0, right: 0, textAlign: "center", fontFamily: F.titulo, fontSize: 76, color: C.tarjetaTexto, letterSpacing: -1.5 }}>{verbo}</div>
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            top: 156,
            height: 136,
            borderRadius: 68,
            background: C.acento,
            boxShadow: SUAVE ? `0 16px 34px ${alfa(C.acento, 0.35)}` : `6px 7px 0 ${C.borde}`,
            border: SUAVE ? undefined : `4px solid ${C.borde}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            overflow: "hidden",
            transform: `rotate(-2deg) scale(${1 + 0.06 * bump(f, bPalabra + 10, 10)})`,
          }}
        >
          <span style={{ fontFamily: F.mano, fontWeight: 700, fontSize: tam, color: C.acentoTexto, marginRight: 10 }}>«</span>
          {palabra.split("").map((l, k) => {
            const q = spring({ frame: f - bPalabra - k * 2, fps: FPS, config: { damping: 10, stiffness: 300, mass: 0.4 } });
            return (
              <span key={k} style={{ display: "inline-block", fontFamily: F.titulo, fontSize: tam, color: C.acentoTexto, letterSpacing: 2, transform: `translateY(${(1 - q) * -40}px) scale(${q})`, opacity: f >= bPalabra + k * 2 ? 1 : 0 }}>
                {l === " " ? " " : l}
              </span>
            );
          })}
          <span style={{ fontFamily: F.mano, fontWeight: 700, fontSize: tam, color: C.acentoTexto, marginLeft: 10 }}>»</span>
          {barrido >= 0 && <div style={{ position: "absolute", top: -20, bottom: -20, left: `${-30 + barrido * 140}%`, width: "22%", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))", transform: "skewX(-20deg)" }} />}
        </div>
      </div>
      {sobre > 0 && sobre < 1 && (
        <div style={{ position: "absolute", left: 830 + sobre * 170, top: 470 - sobre * 260 - Math.sin(sobre * Math.PI) * 60, transform: `rotate(${sobre * 25 - 8}deg) scale(${1 - 0.45 * sobre})`, opacity: Math.min(1, sobre * 6) * (1 - Math.max(0, sobre - 0.75) * 4) }}>
          <Icono nombre="mail" tam={110} color={C.texto} />
        </div>
      )}
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", fontFamily: F.mano, fontWeight: 700, fontSize: 72, color: C.acento, lineHeight: 1.15, transform: "rotate(-3deg)" }}>
        {lineas.map((l, k) => {
          const t0 = bTexto + k * 14;
          const m = lerp(f, t0 - 4, t0 + 12, 0, 1, Easing.inOut(Easing.quad));
          return (
            <div key={k} style={{ clipPath: `inset(-20% ${100 - m * 100}% -20% -5%)` }}>
              {l}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 715 + Math.max(1, lineas.length) * 84, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 34 }}>
        {icos.map((nombre, k) => {
          const q = usePop(bIconos + k * 3, { damping: 9, stiffness: 240, mass: 0.5 });
          const fase = (f - bIconos - 18 - k * 5) % 26;
          const salto = f > bIconos + 18 && fase >= 0 && fase < 9 ? Math.sin((fase / 9) * Math.PI) * 26 : 0;
          const oscuro = k % 2 === 1;
          return (
            <div key={k} style={{ width: 104, height: 104, borderRadius: 30, background: oscuro ? C.oscuro : C.tarjeta, boxShadow: SOMBRA, border: BORDE, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${q}) translateY(${-salto}px)` }}>
              <Icono nombre={nombre} tam={54} color={oscuro ? C.oscuroTexto : C.acento} />
            </div>
          );
        })}
      </div>
      <Confeti desde={bTexto + 6} x={540} y={470} n={60} fuerza={1.25} />
    </AbsoluteFill>
  );
};

export const cta: DefEscena = { C: Cta };
