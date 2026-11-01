// Escenas de tarjetas: contador, cifras, ficha, lista, comparacion, objecion, pasos, pregunta, barras y tachado.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { BORDE, C, ESTILO, SOMBRA, SUAVE } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { F, alfa } from "../motor/estilos";
import { pesoTexto, useFuentes } from "../motor/fuentes";
import { bump, lerp, numeroES, rnd, useFlota, usePop } from "../motor/anim";
import { Destello, Icono, Llama, Marca, Onda, Pildora, Tachon, useGolpe } from "../piezas/basicas";
import type { DefEscena, PropsEscena } from "../tipos";
import { arr, bool, ico, item, num, obj, txt } from "./util";

const T = (peso: number): React.CSSProperties => ({ fontFamily: F.texto, fontWeight: pesoTexto(peso) });

/** Tarjeta que sube con rebote suave en `desde`. */
const TarjetaSube: React.FC<{ x: number; y: number; w: number; h?: number; desde: number; children: React.ReactNode; style?: React.CSSProperties; rot?: number }> = ({ x, y, w, h, desde, children, style, rot = 0 }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f - desde, fps: FPS, config: { damping: 15, stiffness: 150, mass: 0.7 } });
  if (f < desde) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - p) * 120,
        width: w,
        height: h,
        borderRadius: 34,
        background: C.tarjeta,
        color: C.tarjetaTexto,
        boxShadow: SOMBRA,
        border: BORDE,
        opacity: Math.min(1, p * 1.8),
        transform: `rotate(${rot}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Numero: React.FC<{ desde: number; hasta: number; v0: number; v1: number; tam: number; color?: string; golpe?: number; prefijo?: string; sufijo?: string; decimales?: number }> = ({
  desde,
  hasta,
  v0,
  v1,
  tam,
  color = C.tarjetaTexto,
  golpe = -100,
  prefijo = "",
  sufijo = "",
  decimales = 0,
}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [desde, Math.max(desde + 1, hasta)], [v0, v1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const g = useGolpe(golpe, 0.22, 12);
  return (
    <div style={{ fontFamily: F.titulo, fontSize: tam, lineHeight: 0.92, color, letterSpacing: -tam * 0.02, transform: `scale(${g})`, transformOrigin: "50% 60%", whiteSpace: "nowrap" }}>
      {prefijo}
      {numeroES(v, decimales)}
      {sufijo}
    </div>
  );
};

// ================================================================== contador
const Contador: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [b0, b1] = b;
  const valor = num(p, "valor");
  const desde = p.desde === undefined ? valor : num(p, "desde");
  const llama = bool(p, "llama");
  const icono = ico(p, "icono");
  const destacar = bool(p, "destacar", true) && f >= b1;
  const entra = usePop(b0, { damping: 14, stiffness: 150, mass: 0.7 });
  return (
    <AbsoluteFill>
      {entra > 0 && (
        <div style={{ position: "absolute", left: 140, width: 800, top: 390 + (1 - entra) * 160, borderRadius: 40, background: C.tarjeta, color: C.tarjetaTexto, boxShadow: SOMBRA, border: BORDE, opacity: Math.min(1, entra * 1.6), padding: "38px 46px 36px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...T(800), fontSize: 42, color: alfa(C.tarjetaTexto, 0.8), lineHeight: 1.15 }}>{txt(p, "etiqueta")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Numero desde={b0 + 4} hasta={b1} v0={desde} v1={valor} tam={150} color={destacar ? C.acento : C.tarjetaTexto} golpe={b1} prefijo={txt(p, "prefijo")} sufijo={txt(p, "sufijo")} />
            <div style={{ marginLeft: "auto" }}>
              {llama && <Llama size={70} enciende={b0 + 6} apaga={b1} />}
              {!llama && icono && <Icono nombre={icono} tam={86} />}
            </div>
          </div>
          <div style={{ height: 14, borderRadius: 7, background: C.linea }}>
            <div style={{ width: `${lerp(f, b0, b1, desde === valor ? 0 : 8, desde === valor ? 0 : 100)}%`, height: "100%", borderRadius: 7, background: C.acento }} />
          </div>
        </div>
      )}
      {f >= b1 && <Onda desde={b1} x={380} y={590} r0={60} r1={240} />}
    </AbsoluteFill>
  );
};

export const contador: DefEscena = { C: Contador };

// ================================================================== cifras
const Cifras: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const filas = arr<Record<string, unknown>>(p, "filas").slice(0, 3);
  const alto = filas.length === 1 ? 300 : 220;
  const y0 = 640 - (filas.length * (alto + 24)) / 2 + 12;
  return (
    <AbsoluteFill>
      {filas.map((fila, k) => {
        const bk = b[k] ?? 0;
        const destacar = bool(fila, "destacar");
        const v = num(fila, "valor");
        return (
          <TarjetaSube key={k} x={120} y={y0 + k * (alto + 24)} w={840} h={alto} desde={bk - 4} style={{ display: "flex", alignItems: "center", padding: "0 44px", gap: 30 }}>
            <Numero desde={bk} hasta={bk + 20} v0={num(fila, "desde", 0)} v1={v} tam={alto * 0.62} color={destacar ? C.acento : C.tarjetaTexto} golpe={destacar ? bk + 20 : -100} prefijo={txt(fila, "prefijo")} sufijo={txt(fila, "sufijo")} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.mano, fontWeight: 700, fontSize: 64, color: C.acento, lineHeight: 1 }}>{txt(fila, "etiqueta")}</div>
              {txt(fila, "detalle") && <div style={{ ...T(600), fontSize: 30, color: alfa(C.tarjetaTexto, 0.6), marginTop: 8 }}>{txt(fila, "detalle")}</div>}
              {!txt(fila, "detalle") && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 46, marginTop: 10 }}>
                  {Array.from({ length: 14 }).map((_, j) => {
                    const h = 10 + Math.abs(Math.sin(f / 3 + j * 0.9 + k)) * 34 * (f > bk ? 1 : 0.2) * (0.5 + rnd(j + k * 20) * 0.5);
                    return <div key={j} style={{ width: 14, height: h, borderRadius: 4, background: j % 3 === 0 ? C.acento : C.tarjetaTexto }} />;
                  })}
                </div>
              )}
            </div>
          </TarjetaSube>
        );
      })}
    </AbsoluteFill>
  );
};

export const cifras: DefEscena = { C: Cifras };

// ================================================================== ficha
const Ficha: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const filas = arr<unknown[]>(p, "filas").slice(0, 4);
  const entra = spring({ frame: f, fps: FPS, config: { damping: 15, stiffness: 140, mass: 0.7 } });
  const fl = useFlota(0.3, 5, 17);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: Math.max(260, 640 - (170 + filas.length * 100) / 2) + (1 - entra) * 160 + fl, width: 820, borderRadius: 40, background: C.tarjeta, color: C.tarjetaTexto, boxShadow: SOMBRA, border: BORDE, opacity: Math.min(1, entra * 1.6), padding: "40px 48px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {ico(p, "icono") ? <Icono nombre={ico(p, "icono")} tam={62} /> : <Destello size={62} giro={f * 0.6} />}
          <div style={{ fontFamily: F.titulo, fontSize: 58, letterSpacing: -1 }}>{txt(p, "titulo")}</div>
          {txt(p, "etiqueta") && <div style={{ marginLeft: "auto", background: alfa(C.acento, 0.15), color: C.acento, ...T(800), fontSize: 26, padding: "8px 18px", borderRadius: 30 }}>{txt(p, "etiqueta")}</div>}
        </div>
        <div style={{ height: 2, background: C.linea, margin: "28px 0 8px" }} />
        {filas.map((fila, k) => {
          const [etq, val, dest] = fila as [string, string | number, boolean?];
          const t = b[k] ?? 0;
          const q = lerp(f, t, t + 8, 0, 1);
          const g = 1 + 0.25 * bump(f, t + 2, 10);
          const grande = dest || typeof val === "number";
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", padding: "22px 0", borderBottom: k < filas.length - 1 ? `2px solid ${C.linea}` : undefined, opacity: q, transform: `translateX(${(1 - q) * 40}px)` }}>
              <div style={{ ...T(600), fontSize: 34, color: alfa(C.tarjetaTexto, 0.75) }}>{etq}</div>
              <div style={{ marginLeft: "auto", fontFamily: grande ? F.titulo : F.texto, fontWeight: grande ? undefined : pesoTexto(800), fontSize: grande ? 60 : 34, color: dest ? C.acento : C.tarjetaTexto, transform: `scale(${g})`, transformOrigin: "100% 50%", whiteSpace: "nowrap" }}>
                {typeof val === "number" ? numeroES(val) : val}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ficha: DefEscena = { C: Ficha };

// ================================================================== lista
const Lista: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const items = arr(p, "items").slice(0, 5).map(item);
  const titulo = txt(p, "titulo");
  const alto = 112;
  const y0 = 640 - (items.length * alto + (titulo ? 110 : 0)) / 2;
  const tp = usePop(0);
  return (
    <AbsoluteFill>
      {titulo && <div style={{ position: "absolute", top: y0 - 10, left: 0, right: 0, textAlign: "center", fontFamily: F.titulo, fontSize: 64 * 1, color: C.texto, transform: `scale(${tp})` }}>{titulo}</div>}
      {items.map((it, k) => {
        const t = b[k] ?? 0;
        const p2 = spring({ frame: f - t, fps: FPS, config: { damping: 14, stiffness: 170, mass: 0.6 } });
        if (f < t - 2) return null;
        const hecho = f >= t + 6;
        return (
          <div key={k} style={{ position: "absolute", left: 120, width: 840, top: y0 + (titulo ? 110 : 0) + k * alto, height: alto - 18, borderRadius: 28, background: C.tarjeta, boxShadow: SOMBRA, border: BORDE, display: "flex", alignItems: "center", gap: 24, padding: "0 30px", transform: `translateX(${(1 - p2) * 160}px)`, opacity: Math.min(1, p2 * 2) }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: hecho ? C.acento : C.linea, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${1 + 0.25 * bump(f, t + 6, 8)})` }}>
              {hecho && (
                <svg viewBox="0 0 24 24" width={34} height={34}>
                  <path d="M5 12.5 L10 17 L19 7" stroke={C.acentoTexto} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {it.icono && <Icono nombre={it.icono} tam={44} color={C.tarjetaTexto} />}
            <div style={{ ...T(800), fontSize: 40, color: C.tarjetaTexto, whiteSpace: "nowrap" }}>{it.texto}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const lista: DefEscena = { C: Lista };

// ================================================================== comparacion
const Lado: React.FC<{ d: Record<string, unknown>; x: number; desde: number; gana: boolean; pierde: boolean; veredicto: number }> = ({ d, x, desde, gana, pierde, veredicto }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f - desde, fps: FPS, config: { damping: 14, stiffness: 150, mass: 0.7 } });
  if (f < desde) return null;
  const tras = f >= veredicto;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 300 + (1 - p) * 140,
        width: 420,
        height: 600,
        borderRadius: 36,
        background: C.tarjeta,
        color: C.tarjetaTexto,
        boxShadow: SOMBRA,
        border: tras && gana ? `6px solid ${C.exito}` : BORDE,
        opacity: Math.min(1, p * 1.8) * (tras && pierde ? 0.55 : 1),
        transform: `scale(${tras && gana ? 1.04 : 1}) rotate(${tras && pierde ? -2 : 0}deg)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 30px",
        gap: 26,
        filter: tras && pierde ? "grayscale(0.6)" : undefined,
      }}
    >
      <div style={{ width: 150, height: 150, borderRadius: 40, background: alfa(C.acento, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icono nombre={ico(d, "icono") || "sparkles"} tam={90} />
      </div>
      <div style={{ fontFamily: F.titulo, fontSize: 52, textAlign: "center", lineHeight: 1.05 }}>{txt(d, "titulo")}</div>
      {txt(d, "texto") && <div style={{ ...T(600), fontSize: 32, textAlign: "center", color: alfa(C.tarjetaTexto, 0.7), lineHeight: 1.25 }}>{txt(d, "texto")}</div>}
    </div>
  );
};

const Comparacion: React.FC<PropsEscena> = ({ p, b }) => {
  const [b0, b1, b2] = b;
  const g = txt(p, "ganador", "derecha");
  const vs = usePop(b1 - 2);
  return (
    <AbsoluteFill>
      <Lado d={obj(p, "izquierda")} x={90} desde={b0} gana={g === "izquierda"} pierde={g === "derecha"} veredicto={b2} />
      <Lado d={obj(p, "derecha")} x={570} desde={b1} gana={g === "derecha"} pierde={g === "izquierda"} veredicto={b2} />
      {vs > 0 && (
        <div style={{ position: "absolute", left: 540 - 50, top: 550, width: 100, height: 100, borderRadius: 50, background: C.oscuro, color: C.oscuroTexto, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.titulo, fontSize: 40, transform: `scale(${vs})`, boxShadow: SOMBRA }}>VS</div>
      )}
      {g !== "ninguno" && (
        <>
          <Marca desde={b2} x={g === "izquierda" ? 790 : 310} y={330} tipo="x" size={90} />
          <Marca desde={b2 + 3} x={g === "izquierda" ? 310 : 790} y={330} tipo="check" size={90} />
        </>
      )}
    </AbsoluteFill>
  );
};

export const comparacion: DefEscena = { C: Comparacion };

// ================================================================== objecion ("¿Pensarás que…?")
const Objecion: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [b0, b1] = b;
  const burbuja = spring({ frame: f - b0, fps: FPS, config: { damping: 12, stiffness: 170, mass: 0.7 } });
  const resp = usePop(b1, { damping: 11, stiffness: 200, mass: 0.6 });
  const fl = useFlota(1, 6, 15);
  const numero = txt(p, "numero");
  return (
    <AbsoluteFill>
      {numero && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", opacity: lerp(f, 0, 6, 0, 1) }}>
          <Pildora fondo={C.acento} color={C.acentoTexto} tam={34}>
            {numero}
          </Pildora>
        </div>
      )}
      {f >= b0 && (
        <div style={{ position: "absolute", left: 110, top: 360 + fl, width: 860, transform: `scale(${0.6 + 0.4 * burbuja}) rotate(${-2 * burbuja}deg)`, opacity: Math.min(1, burbuja * 2), transformOrigin: "20% 100%" }}>
          <div style={{ position: "relative", background: C.tarjeta, color: C.tarjetaTexto, borderRadius: 44, padding: "48px 54px 54px", boxShadow: SOMBRA, border: BORDE }}>
            <div style={{ fontFamily: F.mano, fontWeight: 700, fontSize: 52, color: C.acento, marginBottom: 6 }}>{txt(p, "intro", "¿Pensarás que…")}</div>
            <div style={{ fontFamily: F.titulo, fontSize: 60, lineHeight: 1.08 }}>{txt(p, "texto")}?</div>
            <svg viewBox="0 0 60 50" width={90} height={75} style={{ position: "absolute", left: 90, bottom: -62 }}>
              <path d="M4 0 L56 0 L10 46 Z" fill={C.tarjeta} />
            </svg>
          </div>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ position: "absolute", right: 30 + k * 70, top: -60 - k * 18, fontFamily: F.titulo, fontSize: 70 + k * 12, color: C.acento, transform: `rotate(${(k - 1) * 14}deg) translateY(${Math.sin(f / 7 + k) * 8}px)`, opacity: lerp(f, b0 + 6 + k * 3, b0 + 10 + k * 3, 0, 1) }}>
              ?
            </div>
          ))}
        </div>
      )}
      {resp > 0 && txt(p, "respuesta") && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center", transform: `scale(${resp}) rotate(${-3 + 3 * resp}deg)` }}>
          <Pildora fondo={C.oscuro} color={C.oscuroTexto} tam={44}>
            {txt(p, "respuesta")}
          </Pildora>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const objecion: DefEscena = { C: Objecion };

// ================================================================== pasos
const Pasos: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const pasos = arr(p, "pasos").slice(0, 4).map(item);
  const n = pasos.length;
  const alto = n <= 3 ? 210 : 170;
  const y0 = 640 - (n * alto + (n - 1) * 46) / 2;
  return (
    <AbsoluteFill>
      {pasos.map((paso, k) => {
        const t = b[k] ?? 0;
        const q = spring({ frame: f - t, fps: FPS, config: { damping: 13, stiffness: 160, mass: 0.6 } });
        if (f < t) return null;
        const y = y0 + k * (alto + 46);
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: 150, top: y, width: 780, height: alto, borderRadius: 34, background: C.tarjeta, color: C.tarjetaTexto, boxShadow: SOMBRA, border: BORDE, display: "flex", alignItems: "center", gap: 30, padding: "0 36px", transform: `scale(${0.7 + 0.3 * q})`, opacity: Math.min(1, q * 2) }}>
              <div style={{ width: alto * 0.6, height: alto * 0.6, borderRadius: alto * 0.3, background: C.acento, color: C.acentoTexto, fontFamily: F.titulo, fontSize: alto * 0.34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{k + 1}</div>
              <div style={{ ...T(800), fontSize: 42, lineHeight: 1.1, flex: 1 }}>{paso.texto}</div>
              {paso.icono && <Icono nombre={paso.icono} tam={64} />}
            </div>
            {k < n - 1 && f >= t + 6 && (
              <svg viewBox="0 0 40 46" width={40} height={46} style={{ position: "absolute", left: 520, top: y + alto, opacity: lerp(f, t + 6, t + 10, 0, 1) }}>
                <path d="M20 4 V36 M8 26 L20 40 L32 26" stroke={C.acento} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export const pasos: DefEscena = { C: Pasos };

// ================================================================== pregunta (test)
const Pregunta: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [b0, b1, b2] = b;
  const opciones = arr<string>(p, "opciones").slice(0, 4);
  const correcta = num(p, "correcta", 0);
  const pq = usePop(b0);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, right: 110, top: 270, textAlign: "center", fontFamily: F.titulo, fontSize: 62, lineHeight: 1.08, color: C.texto, transform: `scale(${pq})` }}>{txt(p, "pregunta")}</div>
      {opciones.map((o, k) => {
        const t = b1 + k * 4;
        const q = spring({ frame: f - t, fps: FPS, config: { damping: 14, stiffness: 170, mass: 0.6 } });
        if (f < t) return null;
        const revela = f >= b2;
        const bien = k === correcta;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 150,
              width: 780,
              top: 520 + k * 128,
              height: 104,
              borderRadius: 30,
              background: revela && bien ? C.exito : C.tarjeta,
              color: revela && bien ? "#fff" : C.tarjetaTexto,
              boxShadow: SOMBRA,
              border: BORDE,
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "0 30px",
              opacity: Math.min(1, q * 2) * (revela && !bien ? 0.45 : 1),
              transform: `translateX(${(1 - q) * 120}px) scale(${revela && bien ? 1 + 0.06 * bump(f, b2, 10) : 1})`,
            }}
          >
            <div style={{ fontFamily: F.titulo, fontSize: 40, width: 50, color: revela && bien ? "#fff" : C.acento }}>{"ABCD"[k]}</div>
            <div style={{ ...T(800), fontSize: 38 }}>{o}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const pregunta: DefEscena = { C: Pregunta };

// ================================================================== barras
const Barras: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const barras = arr<Record<string, unknown>>(p, "barras").slice(0, 5);
  const max = Math.max(1, ...barras.map((x) => num(x, "valor")));
  const destacar = num(p, "destacar", -1);
  const unidad = txt(p, "unidad");
  const n = barras.length;
  const ancho = Math.min(150, 720 / n - 30);
  const base = 980;
  const altoMax = 520;
  return (
    <AbsoluteFill>
      {txt(p, "titulo") && <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: F.titulo, fontSize: 56, color: C.texto }}>{txt(p, "titulo")}</div>}
      <div style={{ position: "absolute", left: 120, right: 120, top: base, height: 5, borderRadius: 3, background: alfa(C.texto, 0.25) }} />
      {barras.map((x, k) => {
        const t = b[k] ?? 0;
        const v = num(x, "valor");
        const h = altoMax * (v / max) * lerp(f, t, t + 14, 0, 1, Easing.out(Easing.cubic));
        const cx = 540 + (k - (n - 1) / 2) * (ancho + 40);
        const color = k === destacar ? C.acento : SUAVE ? alfa(C.texto, 0.85) : C.tarjeta;
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: cx - ancho / 2, top: base - h, width: ancho, height: h, borderRadius: "16px 16px 6px 6px", background: color, border: SUAVE ? undefined : `4px solid ${C.borde}`, boxShadow: SUAVE ? SOMBRA : undefined }} />
            {f >= t + 6 && (
              <div style={{ position: "absolute", left: cx - 120, width: 240, top: base - h - 74, textAlign: "center", fontFamily: F.titulo, fontSize: 48, color: k === destacar ? C.acento : C.texto, opacity: lerp(f, t + 6, t + 10, 0, 1) }}>
                {numeroES(v)}
                {unidad}
              </div>
            )}
            <div style={{ position: "absolute", left: cx - 120, width: 240, top: base + 18, textAlign: "center", ...T(800), fontSize: 30, color: C.texto }}>{txt(x, "etiqueta")}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export const barras: DefEscena = { C: Barras };

// ================================================================== tachado ("No es X: es Y")
// Lo importante es el texto: «antes» grande en la tarjeta, se tacha con una X, sube apagado y debajo
// entra «después» en grande y en color de acento. Un icono o una imagen arriba, opcional, da contexto.
const CARTA = { x: 110, y: 300, w: 860, h: 600 };

/** Tamaño de letra para que el texto quepa en `ancho` (como mucho `max`). */
const tamQueCabe = (texto: string, fuente: string, peso: string, max: number, ancho: number) => {
  const w100 = measureText({ text: texto || " ", fontFamily: fuente, fontWeight: peso, fontSize: 100, validateFontIsLoaded: false }).width;
  return Math.max(40, Math.min(max, (100 * ancho) / Math.max(1, w100)));
};

const Tachado: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const ok = useFuentes();
  const [b0, b1] = b;
  const imagen = txt(p, "imagen");
  const icono = ico(p, "icono");
  const codigo = txt(p, "modo") === "codigo";
  const antes = txt(p, "antes");
  const despues = txt(p, "despues");
  const entra = spring({ frame: f, fps: FPS, config: { damping: 15, stiffness: 130, mass: 0.8 } });
  const temblor = f >= b0 && f < b0 + 10 ? Math.sin(f * 2.4) * 6 : 0;
  const sube = lerp(f, b1 - 2, b1 + 10, 0, 1, Easing.inOut(Easing.cubic));
  const nueva = usePop(b1, { damping: 11, stiffness: 180, mass: 0.6 });
  if (!ok) return null;
  const peso = String(ESTILO.fuentes.titulo.weight);
  const tamA = tamQueCabe(antes, F.titulo, peso, 92 * ESTILO.escalaTitulo, CARTA.w - 160);
  const anchoA = measureText({ text: antes, fontFamily: F.titulo, fontWeight: peso, fontSize: tamA, validateFontIsLoaded: false }).width;
  const textoN = codigo ? `</> ${despues}` : despues;
  const tamN = codigo ? tamQueCabe(textoN, F.mono, "700", 64, CARTA.w - 200) : tamQueCabe(despues, F.titulo, peso, 108 * ESTILO.escalaTitulo, CARTA.w - 140);
  const conVisual = !!(imagen || icono);
  const yAntes = CARTA.y + (conVisual ? 340 : 250);
  const yNueva = CARTA.y + (conVisual ? 470 : 400);
  const bajada = (1 - entra) * 120;
  const visible = Math.min(1, entra * 1.6);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: CARTA.x, top: CARTA.y + bajada, width: CARTA.w, height: CARTA.h, borderRadius: 34, overflow: "hidden", boxShadow: SOMBRA, border: BORDE, background: C.tarjeta, opacity: visible }}>
        {imagen && <Img src={staticFile(imagen)} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 250, objectFit: "cover", transform: `scale(${1 + 0.05 * Math.min(1, f / 150)})` }} />}
        {!imagen && icono && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 46, display: "flex", justifyContent: "center" }}>
            <Icono nombre={icono} tam={150} color={alfa(C.tarjetaTexto, 0.8)} grosor={1.8} />
          </div>
        )}
      </div>
      {/* lo de antes: se tacha y luego sube apagado */}
      <div style={{ position: "absolute", left: CARTA.x, width: CARTA.w, top: yAntes - tamA * 0.58 - sube * tamA * 0.95 + bajada, display: "flex", justifyContent: "center", opacity: visible * (1 - 0.6 * sube), transform: `translateX(${temblor}px) scale(${1 - 0.38 * sube})` }}>
        <div style={{ position: "relative", fontFamily: F.titulo, fontWeight: ESTILO.fuentes.titulo.weight, fontSize: tamA, lineHeight: 1.15, color: C.tarjetaTexto, whiteSpace: "nowrap" }}>
          {antes}
          <Tachon desde={b0} w={anchoA} grosor={Math.max(7, tamA * 0.1)} />
        </div>
      </div>
      {f < b1 && <Marca desde={b0 + 3} x={CARTA.x + CARTA.w / 2 + Math.min(anchoA / 2 + 44, CARTA.w / 2 - 36)} y={yAntes - tamA * 0.62} tipo="x" size={64} />}
      {/* lo nuevo, grande y en color de acento */}
      {nueva > 0 && (
        <div style={{ position: "absolute", left: CARTA.x, width: CARTA.w, top: yNueva - tamN * 0.5, display: "flex", justifyContent: "center", transform: `scale(${0.6 + 0.4 * nueva}) rotate(${-2 + 2 * nueva}deg)`, opacity: Math.min(1, nueva * 2) }}>
          {codigo ? (
            <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: tamN, lineHeight: 1.2, background: C.oscuro, color: C.acento, padding: "12px 30px", borderRadius: 22, whiteSpace: "nowrap" }}>{textoN}</div>
          ) : (
            <div style={{ fontFamily: F.titulo, fontWeight: ESTILO.fuentes.titulo.weight, fontSize: tamN, lineHeight: 1.15, color: C.acento, whiteSpace: "nowrap" }}>{despues}</div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const tachado: DefEscena = { C: Tachado };
