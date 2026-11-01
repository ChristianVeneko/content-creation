// Piezas sueltas que usan todas las escenas. Solo usan los colores con nombre de uso del estilo (C.acento,
// C.tarjeta…), así que funcionan con cualquier estilo.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { reelIconName } from "../../../lib/reels.mjs";
import { BORDE, C, ICONOS, SOMBRA, SOMBRA_PEQ, SUAVE } from "../motor/actual";
import { F, alfa } from "../motor/estilos";
import { pesoTexto } from "../motor/fuentes";
import { bump, lerp, rnd, usePop } from "../motor/anim";
import { Dibujo, esDibujo, type IconoRef } from "./dibujo";

// ---------------------------------------------------------------- icons (Phosphor duotone, MIT)

/** Does this icon exist in the loaded set? Accepts the pack's Lucide names ("shopping-cart") or Phosphor names. */
export const existeIcono = (nombre: string) => !!ICONOS[reelIconName(nombre)];

/**
 * Icon by name: Phosphor duotone paths loaded by the build (lib/reels.mjs maps Lucide names). Unknown → the spark.
 * Every icon slot also takes the agent's own drawing ({viewBox, parts, motion}): it is drawn in the slot's box.
 */
export const Icono: React.FC<{ nombre?: IconoRef; tam: number; color?: string; grosor?: number }> = ({ nombre, tam, color = C.acento }) => {
  if (esDibujo(nombre)) return <Dibujo dibujo={nombre} tam={tam} />;
  const ic = nombre ? ICONOS[reelIconName(nombre)] : undefined;
  if (!ic) return <Destello size={tam} color={color} />;
  return (
    <svg viewBox={ic.viewBox} width={tam} height={tam} style={{ flexShrink: 0, display: "block" }}>
      {ic.back.map((d, k) => (
        <path key={`b${k}`} d={d} fill={color} opacity={0.22} />
      ))}
      {ic.outline.map((d, k) => (
        <path key={`o${k}`} d={d} fill={color} />
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------- tarjetas y píldoras

export const Tarjeta: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  fondo?: string;
  transform?: string;
  origen?: string;
  opacity?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, r = 30, fondo = C.tarjeta, transform, origen = "center", opacity = 1, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r,
      background: fondo,
      boxShadow: SOMBRA,
      border: BORDE,
      overflow: "hidden",
      transform,
      transformOrigin: origen,
      opacity,
      color: C.tarjetaTexto,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Pildora: React.FC<{ children: React.ReactNode; fondo?: string; color?: string; tam?: number; mono?: boolean; style?: React.CSSProperties }> = ({
  children,
  fondo = C.oscuro,
  color = C.oscuroTexto,
  tam = 30,
  mono = false,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: tam * 0.35,
      background: fondo,
      color,
      fontFamily: mono ? F.mono : F.texto,
      fontWeight: mono ? 700 : pesoTexto(800),
      fontSize: tam,
      lineHeight: 1,
      padding: `${tam * 0.42}px ${tam * 0.62}px`,
      borderRadius: tam * 2,
      whiteSpace: "nowrap",
      boxShadow: SOMBRA_PEQ,
      border: SUAVE ? undefined : `3px solid ${C.borde}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Destello de cuatro puntas: símbolo genérico de "IA" (nunca el logo de una marca). */
export const Destello: React.FC<{ size: number; color?: string; giro?: number }> = ({ size, color = C.acento, giro = 0 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `rotate(${giro}deg)`, flexShrink: 0 }}>
    <path d="M50 3 C54 36 64 46 97 50 C64 54 54 64 50 97 C46 64 36 54 3 50 C36 46 46 36 50 3 Z" fill={color} />
  </svg>
);

/** Baldosa con un icono (o el destello girando) y brillo opcional. */
export const Baldosa: React.FC<{ size: number; icono?: IconoRef; brillo?: number }> = ({ size, icono, brillo = 0 }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: C.tarjeta,
        border: BORDE,
        boxShadow: `${SOMBRA}${brillo > 0 ? `, 0 0 ${60 * brillo}px ${20 * brillo}px ${alfa(C.acento, 0.35 * brillo)}` : ""}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icono ? <Icono nombre={icono} tam={size * (esDibujo(icono) ? 0.8 : 0.5)} /> : <Destello size={size * 0.58} giro={f * 0.6} />}
    </div>
  );
};

/** Documento con la esquina doblada y una etiqueta (".skill", "guion.txt"…). */
export const Archivo: React.FC<{ w: number; etiqueta?: string }> = ({ w, etiqueta = ".skill" }) => {
  const h = w * 1.25;
  return (
    <div style={{ position: "relative", width: w, height: h, filter: SUAVE ? "drop-shadow(0 16px 22px rgba(40,30,60,0.2))" : `drop-shadow(5px 6px 0 ${C.borde})` }}>
      <svg viewBox="0 0 100 125" width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <path d="M8 4 H68 L92 28 V117 Q92 121 88 121 H12 Q8 121 8 117 Z" fill={C.tarjeta} stroke={SUAVE ? "none" : C.borde} strokeWidth={4} />
        <path d="M68 4 V24 Q68 28 72 28 H92 Z" fill={C.linea} />
        {[44, 56, 68].map((y, i) => (
          <rect key={i} x={20} y={y} width={i === 2 ? 36 : 58} height={5} rx={2.5} fill={C.linea} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: h * 0.12, textAlign: "center", fontFamily: F.mono, fontWeight: 700, fontSize: w * 0.17, color: C.acento }}>{etiqueta}</div>
    </div>
  );
};

/** Línea discontinua que se dibuja de (x1,y1) a (x2,y2). */
export const LineaPuntos: React.FC<{ x1: number; y1: number; x2: number; y2: number; desde: number; dur?: number; color?: string }> = ({ x1, y1, x2, y2, desde, dur = 8, color = C.acento }) => {
  const f = useCurrentFrame();
  const p = lerp(f, desde, desde + dur, 0, 1);
  if (p <= 0) return null;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={color} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" strokeDashoffset={-f * 1.2} />
    </svg>
  );
};

/** Píldora oscura tipo consola: "reels: 12". */
export const ContadorPill: React.FC<{ etiqueta: string; valor: string; tam?: number; caliente?: boolean }> = ({ etiqueta, valor, tam = 34, caliente = false }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: C.oscuro, color: alfa(C.oscuroTexto, 0.8), fontFamily: F.mono, fontSize: tam, padding: `${tam * 0.4}px ${tam * 0.6}px`, borderRadius: tam * 0.5, boxShadow: SOMBRA_PEQ, whiteSpace: "nowrap" }}>
    <span>{etiqueta}:</span>
    <span style={{ color: caliente ? C.acento : C.oscuroTexto, fontWeight: 700, minWidth: tam * 1.4, display: "inline-block", textAlign: "right" }}>{valor}</span>
  </div>
);

/** Etiqueta pequeña que llega volando y se queda. */
export const Chip: React.FC<{ texto: React.ReactNode; desde: number; x: number; y: number; dx?: number; dy?: number; fondo?: string; color?: string; tam?: number; rot?: number }> = ({
  texto,
  desde,
  x,
  y,
  dx = 0,
  dy = 120,
  fondo = C.tarjeta,
  color = C.tarjetaTexto,
  tam = 30,
  rot = 0,
}) => {
  const p = usePop(desde, { damping: 12, stiffness: 200, mass: 0.6 });
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) rotate(${rot * p}deg) scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 2) }}>
      <Pildora fondo={fondo} color={color} tam={tam}>
        {texto}
      </Pildora>
    </div>
  );
};

/** Texto a mano (fuente "mano", color de acento) que se escribe de izquierda a derecha, con flecha opcional. */
export const Anotacion: React.FC<{ texto: string; desde: number; hasta?: number; x: number; y: number; tam?: number; flecha?: "abajo" | "izquierda" | "derecha" | null; rot?: number; color?: string }> = ({
  texto,
  desde,
  hasta = 1e9,
  x,
  y,
  tam = 52,
  flecha = "abajo",
  rot = -4,
  color = C.acento,
}) => {
  const f = useCurrentFrame();
  const p = lerp(f, desde, desde + 10, 0, 1, Easing.out(Easing.quad));
  const fuera = lerp(f, hasta, hasta + 6, 1, 0);
  if (p <= 0 || fuera <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) translateY(${(1 - fuera) * -20}px)`, whiteSpace: "nowrap", opacity: fuera }}>
      <div style={{ fontFamily: F.mano, fontWeight: 700, fontSize: tam, color, clipPath: `inset(-20% ${100 - p * 100}% -20% -5%)` }}>
        {texto}
        {flecha && (
          <svg viewBox="0 0 40 50" width={tam * 0.6} height={tam * 0.75} style={{ marginLeft: 8, verticalAlign: "middle", transform: flecha === "abajo" ? "none" : flecha === "derecha" ? "rotate(-90deg)" : "rotate(90deg)" }}>
            <path d="M20 4 C 22 18, 18 30, 20 44 M8 32 L20 45 L32 31" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
};

/** Raya que tacha (se dibuja de izquierda a derecha). */
export const Tachon: React.FC<{ desde: number; w: number; color?: string; grosor?: number }> = ({ desde, w, color = C.error, grosor = 7 }) => {
  const f = useCurrentFrame();
  const p = lerp(f, desde, desde + 6, 0, 1);
  if (p <= 0) return null;
  return (
    <svg style={{ position: "absolute", left: -8, top: "50%", overflow: "visible" }} width={w + 16} height={10}>
      <path d={`M0 6 L${(w + 16) * p} ${2 - 4 * p}`} stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </svg>
  );
};

/** Círculo con una X (error) o con un check (bien) que aparece con rebote. */
export const Marca: React.FC<{ desde: number; x: number; y: number; tipo: "x" | "check"; size?: number }> = ({ desde, x, y, tipo, size = 72 }) => {
  const p = usePop(desde, { damping: 9, stiffness: 260, mass: 0.5 });
  if (p <= 0) return null;
  const color = tipo === "x" ? C.error : C.exito;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, transform: `scale(${p})` }}>
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <circle cx={30} cy={30} r={27} fill={color} stroke={SUAVE ? "none" : C.borde} strokeWidth={4} />
        {tipo === "x" ? <path d="M19 19 L41 41 M41 19 L19 41" stroke="#fff" strokeWidth={7} strokeLinecap="round" /> : <path d="M17 31 L26 40 L44 21" stroke="#fff" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </div>
  );
};

/** Llama pequeña que parpadea; al llegar a `apaga` se encoge y suelta humo. */
export const Llama: React.FC<{ size: number; enciende: number; apaga: number }> = ({ size, enciende, apaga }) => {
  const f = useCurrentFrame();
  if (f < enciende) return null;
  const viva = f < apaga;
  const s = viva ? 0.75 + 0.25 * Math.abs(Math.sin(f / 2.3)) : Math.max(0, 1 - (f - apaga) / 6);
  const humo = f - apaga;
  return (
    <div style={{ position: "relative", width: size, height: size * 1.3 }}>
      {s > 0 && (
        <svg viewBox="0 0 60 80" width={size} height={size * 1.3} style={{ position: "absolute", transform: `scale(${s})`, transformOrigin: "50% 100%" }}>
          <path d="M30 4 C34 22 52 30 52 52 C52 68 42 76 30 76 C18 76 8 68 8 52 C8 40 16 34 20 24 C24 32 26 36 30 38 C30 26 28 16 30 4 Z" fill="#FF7A1A" />
          <path d="M30 40 C34 50 42 54 40 64 C38 72 22 72 20 64 C18 56 26 52 30 40 Z" fill="#FFD166" />
        </svg>
      )}
      {!viva &&
        humo < 30 &&
        [0, 1, 2].map((k) => (
          <div
            key={k}
            style={{
              position: "absolute",
              left: size * (0.3 + k * 0.15),
              top: size * 0.6 - humo * (2.2 + k * 0.6),
              width: size * (0.25 + humo * 0.012),
              height: size * (0.25 + humo * 0.012),
              borderRadius: "50%",
              background: "#B8AFA3",
              opacity: interpolate(humo, [0, 4, 30], [0, 0.6, 0]),
            }}
          />
        ))}
    </div>
  );
};

/** Confeti que estalla desde un punto. */
export const Confeti: React.FC<{ desde: number; x: number; y: number; n?: number; fuerza?: number }> = ({ desde, x, y, n = 40, fuerza = 1 }) => {
  const f = useCurrentFrame();
  const e = f - desde;
  if (e < 0 || e > 48) return null;
  const colores = [C.acento, C.texto, "#FFC94A", C.error, "#7FB8FF"];
  return (
    <>
      {Array.from({ length: n }).map((_, k) => {
        const a = -Math.PI / 2 + (rnd(k) - 0.5) * Math.PI * 1.4;
        const v = (12 + rnd(k + 5) * 16) * fuerza;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: x + Math.cos(a) * v * e,
              top: y + Math.sin(a) * v * e + 0.9 * e * e,
              width: k % 2 ? 16 : 10,
              height: k % 2 ? 9 : 10,
              borderRadius: k % 3 === 0 ? 5 : 2,
              background: colores[k % colores.length],
              transform: `rotate(${e * 18 + k * 37}deg)`,
              opacity: interpolate(e, [0, 34, 48], [1, 1, 0]),
            }}
          />
        );
      })}
    </>
  );
};

/** Anillo que se expande (para remarcar un golpe). */
export const Onda: React.FC<{ desde: number; x: number; y: number; r0?: number; r1?: number; color?: string; dur?: number; grosor?: number }> = ({ desde, x, y, r0 = 40, r1 = 220, color = C.acento, dur = 16, grosor = 4 }) => {
  const f = useCurrentFrame();
  const t = (f - desde) / dur;
  if (t < 0 || t > 1) return null;
  const r = r0 + (r1 - r0) * Easing.out(Easing.cubic)(t);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={grosor} opacity={0.8 * (1 - t)} />
    </svg>
  );
};

/** Escala de "golpe" para resaltar algo en un fotograma. */
export const useGolpe = (en: number, fuerza = 0.12, dur = 8) => {
  const f = useCurrentFrame();
  return 1 + fuerza * bump(f, en, dur);
};

/** Texto del título con la palabra entre *asteriscos* en el color de acento. */
export const conAcento = (texto: string, color = C.acento): React.ReactNode[] =>
  texto.split(/(\*[^*]+\*)/g).map((t, k) => (t.startsWith("*") && t.endsWith("*") ? <span key={k} style={{ color }}>{t.slice(1, -1)}</span> : <span key={k}>{t}</span>));
