// Ventanas de app dibujadas con código: chat, campo de texto que se escribe, código que se escribe solo,
// móvil con una vista previa y editor de vídeo con línea de tiempo.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, SOMBRA, SUAVE } from "../motor/actual";
import { F, alfa } from "../motor/estilos";
import { pesoTexto } from "../motor/fuentes";
import { lerp, rnd } from "../motor/anim";
import { Destello, Icono } from "./basicas";
import type { IconoRef } from "./dibujo";

const lineaOsc = () => alfa(C.oscuroTexto, 0.12);

/** Ventana oscura de chat con cabecera. */
export const VentanaChat: React.FC<{ w: number; h: number; children?: React.ReactNode; titulo?: string }> = ({ w, h, children, titulo = "Claude" }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: 34, background: C.oscuro, boxShadow: SOMBRA, overflow: "hidden", border: SUAVE ? undefined : `5px solid ${C.borde}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 74, padding: "0 28px", borderBottom: `2px solid ${lineaOsc()}` }}>
      {["#FF6B5E", "#FFC23D", "#3FCB6A"].map((c, i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.9 }} />
      ))}
      <div style={{ marginLeft: 18, display: "flex", alignItems: "center", gap: 10, fontFamily: F.texto, fontWeight: pesoTexto(800), fontSize: 28, color: C.oscuroTexto }}>
        <Destello size={26} />
        {titulo}
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 74, bottom: 0 }}>{children}</div>
  </div>
);

/** Campo de escritura con texto que se teclea entre `desde` y `hasta` y se vacía al enviarlo. */
export const CampoTexto: React.FC<{ texto: string; desde: number; hasta: number; enviado?: number; placeholder?: string; brillo?: number }> = ({
  texto,
  desde,
  hasta,
  enviado = 1e9,
  placeholder = "Escribe tu idea…",
  brillo = 0,
}) => {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [desde, hasta], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const visible = f >= enviado ? "" : texto.slice(0, n);
  const cursor = Math.floor(f / 8) % 2 === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: alfa(C.oscuroTexto, 0.06),
        borderRadius: 26,
        padding: "18px 18px 18px 26px",
        border: `2px solid ${lineaOsc()}`,
        boxShadow: brillo > 0 ? `0 0 ${40 * brillo}px ${alfa(C.acento, 0.5 * brillo)}` : undefined,
      }}
    >
      <div style={{ flex: 1, fontFamily: F.texto, fontWeight: pesoTexto(600), fontSize: 30, color: visible ? C.oscuroTexto : alfa(C.oscuroTexto, 0.5), whiteSpace: "nowrap", overflow: "hidden" }}>
        {visible || placeholder}
        <span style={{ color: C.acento, opacity: cursor ? 1 : 0 }}>|</span>
      </div>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: n > 0 && f < enviado ? C.acento : lineaOsc(), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width={28} height={28}>
          <path d="M12 19 V5 M5 12 L12 5 L19 12" stroke={n > 0 && f < enviado ? C.acentoTexto : C.oscuroTexto} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

// Colores de resaltado de código (tema oscuro clásico, se ve bien con cualquier estilo).
const K = { clave: "#C792EA", tipo: "#FFCB6B", fn: "#82AAFF", num: "#F78C6C", txt: "#C3E88D", sig: "#89DDFF", base: "#E7ECF7" };

/** Código de ejemplo (un componente de vídeo) con el título que se le pase. */
const codigoDe = (titulo: string): [string, string][][] => [
  [["const ", K.clave], ["Reel", K.tipo], [" = () => {", K.base]],
  [["  const ", K.clave], ["entra", K.base], [" = ", K.sig], ["usePop", K.fn], ["(", K.base], ["12", K.num], [");", K.base]],
  [["  const ", K.clave], ["ola", K.base], [" = ", K.sig], ["onda", K.fn], ["(frame / ", K.base], ["9", K.num], [");", K.base]],
  [["  return ", K.clave], ["(", K.base]],
  [["    <", K.sig], ["Escena", K.tipo], [" fondo=", K.txt], ['"suave"', K.txt], [">", K.sig]],
  [["      <", K.sig], ["Titulo", K.tipo], [`>${titulo}</`, K.base], ["Titulo", K.tipo], [">", K.sig]],
  [["      <", K.sig], ["Icono", K.tipo], [" escala={entra} />", K.base]],
  [["      <", K.sig], ["Brillo", K.tipo], [" fase={ola} />", K.base]],
  [["    </", K.sig], ["Escena", K.tipo], [">", K.sig]],
  [["  );", K.base]],
  [["};", K.base]],
];

/** Líneas de código que se escriben entre `desde` y `hasta` (antes de `desde` no se ve nada; tras `hasta`, todo). */
export const CodigoStream: React.FC<{ desde: number; hasta: number; tam?: number; titulo?: string }> = ({ desde, hasta, tam = 25, titulo = "Mi reel" }) => {
  const f = useCurrentFrame();
  const codigo = codigoDe(titulo);
  const total = codigo.reduce((s, l) => s + l.reduce((a, [t]) => a + t.length, 0), 0);
  let quedan = Math.round(interpolate(f, [desde, hasta], [0, total], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ fontFamily: F.mono, fontSize: tam, lineHeight: 1.55, whiteSpace: "pre" }}>
      {codigo.map((linea, i) => {
        if (quedan <= 0) return <div key={i} style={{ height: tam * 1.55 }} />;
        return (
          <div key={i}>
            <span style={{ color: "#4F5E80", marginRight: tam * 0.9 }}>{String(i + 1).padStart(2, " ")}</span>
            {linea.map(([t, c], k) => {
              if (quedan <= 0) return null;
              const parte = t.slice(0, quedan);
              quedan -= t.length;
              return (
                <span key={k} style={{ color: c }}>
                  {parte}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Móvil con una vista previa sencilla: título, subtítulo a mano y un icono que entra con rebote. */
export const MovilVista: React.FC<{ w: number; desde: number; titulo: string; subtitulo?: string; icono?: IconoRef; children?: React.ReactNode }> = ({ w, desde, titulo, subtitulo, icono, children }) => {
  const f = useCurrentFrame();
  const h = w * 2;
  const t = lerp(f, desde + 6, desde + 16, 0, 1);
  const ic = lerp(f, desde + 2, desde + 14, 0, 1, Easing.out(Easing.back(1.6)));
  return (
    <div style={{ width: w, height: h, borderRadius: w * 0.16, background: C.oscuro, padding: w * 0.04, boxShadow: SOMBRA, border: SUAVE ? undefined : `5px solid ${C.borde}` }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: w * 0.13, overflow: "hidden", background: `linear-gradient(180deg, ${C.tarjeta}, ${C.fondo2})` }}>
        {children ?? (
          <>
            <div style={{ position: "absolute", top: w * 0.26, left: w * 0.06, right: w * 0.06, textAlign: "center", opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}>
              <div style={{ fontFamily: F.titulo, fontSize: w * 0.12, color: C.tarjetaTexto, lineHeight: 1.05 }}>{titulo}</div>
              {subtitulo && <div style={{ fontFamily: F.mano, fontWeight: 700, fontSize: w * 0.13, color: C.acento, lineHeight: 1.1 }}>{subtitulo}</div>}
            </div>
            <div style={{ position: "absolute", left: "50%", top: h * 0.56, transform: `translate(-50%, 0) scale(${ic})` }}>
              <Icono nombre={icono ?? "sparkles"} tam={w * 0.38} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- editor con línea de tiempo

const PISTAS = ["subtítulos", "escenas", "voz", "sonidos"];

/** Geometría del editor (para colocar cosas encima de las pistas desde las escenas). */
export const geometriaEditor = (w: number, h: number) => {
  const altoVista = h * 0.56;
  const yPistas = altoVista + 92;
  const altoPista = (h - yPistas - 26) / PISTAS.length;
  const x0 = 170;
  return { altoVista, anchoVista: altoVista * 0.5625, yPistas, altoPista, x0, anchoPistas: w - x0 - 30 };
};

/** Editor claro con vista previa vertical y cuatro pistas (subtítulos, escenas, voz, sonidos). */
export const Editor: React.FC<{ w: number; h: number; vista: React.ReactNode; cabezal?: number; archivo?: string; extra?: React.ReactNode }> = ({ w, h, vista, cabezal = 0.4, archivo = "este_reel.tsx", extra }) => {
  const g = geometriaEditor(w, h);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 30, background: C.tarjeta, boxShadow: SOMBRA, overflow: "hidden", border: SUAVE ? undefined : `5px solid ${C.borde}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 58, padding: "0 22px", borderBottom: `2px solid ${C.linea}` }}>
        {["#FF6B5E", "#FFC23D", "#3FCB6A"].map((c, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
        ))}
        <span style={{ marginLeft: 14, fontFamily: F.mono, fontSize: 22, color: alfa(C.tarjetaTexto, 0.7) }}>{archivo}</span>
        <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 20, color: alfa(C.tarjetaTexto, 0.5) }}>1080×1920 · 30 fps</span>
      </div>
      <div style={{ position: "absolute", left: (w - g.anchoVista) / 2, top: 74, width: g.anchoVista, height: g.altoVista, borderRadius: 18, overflow: "hidden", background: C.fondo, boxShadow: "0 10px 26px rgba(40,30,60,0.18)" }}>{vista}</div>
      {PISTAS.map((p, i) => (
        <div key={p} style={{ position: "absolute", left: 0, right: 0, top: g.yPistas + i * g.altoPista, height: g.altoPista, borderTop: `2px solid ${C.linea}` }}>
          <div style={{ position: "absolute", left: 22, top: g.altoPista / 2 - 14, fontFamily: F.mono, fontSize: 21, color: alfa(C.tarjetaTexto, 0.55) }}>{p}</div>
          <Pista tipo={i} x={g.x0} w={g.anchoPistas} h={g.altoPista} />
        </div>
      ))}
      <div style={{ position: "absolute", left: g.x0 + g.anchoPistas * cabezal, top: g.yPistas - 18, bottom: 16, width: 4, background: C.acento, borderRadius: 2 }}>
        <div style={{ position: "absolute", left: -11, top: -6, width: 26, height: 20, borderRadius: 6, background: C.acento }} />
      </div>
      {extra}
    </div>
  );
};

const Pista: React.FC<{ tipo: number; x: number; w: number; h: number }> = ({ tipo, x, w, h }) => {
  const piezas: React.ReactNode[] = [];
  if (tipo === 0) {
    for (let k = 0; k < 14; k++)
      piezas.push(<div key={k} style={{ position: "absolute", left: x + (k / 14) * w, top: h * 0.3, width: (w / 14) * (rnd(k) * 0.4 + 0.6), height: h * 0.4, borderRadius: 6, background: k % 3 === 1 ? C.acento : C.linea }} />);
  } else if (tipo === 1) {
    const cortes = [0, 0.09, 0.14, 0.23, 0.29, 0.34, 0.38, 0.42, 0.47, 0.53, 0.58, 0.62, 0.65, 0.69, 0.76, 0.87, 0.91, 1];
    for (let k = 0; k + 1 < cortes.length; k++)
      piezas.push(<div key={k} style={{ position: "absolute", left: x + cortes[k] * w + 2, top: h * 0.2, width: (cortes[k + 1] - cortes[k]) * w - 4, height: h * 0.6, borderRadius: 7, background: k % 2 ? C.tarjetaTexto : alfa(C.tarjetaTexto, 0.6) }} />);
  } else if (tipo === 2) {
    const n = 90;
    for (let k = 0; k < n; k++) {
      const a = (0.25 + 0.75 * Math.abs(Math.sin(k * 0.7) * rnd(k + 3))) * h * 0.7;
      piezas.push(<div key={k} style={{ position: "absolute", left: x + (k / n) * w, top: (h - a) / 2, width: (w / n) * 0.55, height: a, borderRadius: 2, background: C.acento, opacity: 0.75 }} />);
    }
  } else {
    [0.06, 0.13, 0.2, 0.31, 0.44, 0.52, 0.6, 0.66, 0.71, 0.82, 0.9].forEach((p, k) => piezas.push(<div key={k} style={{ position: "absolute", left: x + p * w, top: h * 0.32, width: h * 0.36, height: h * 0.36, borderRadius: "50%", background: C.tarjetaTexto, opacity: 0.8 }} />));
  }
  return <>{piezas}</>;
};
