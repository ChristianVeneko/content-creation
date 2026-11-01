import React, { useMemo } from "react";
import { Easing, interpolate, interpolateColors, spring, useCurrentFrame } from "remotion";
import { fillTextBox, measureText } from "@remotion/layout-utils";
import { C, CS, SUB_Y, SUAVE } from "./actual";
import { ADELANTO, FPS, s2f } from "./constantes";
import { alfa, F } from "./estilos";
import { pesoTexto, useFuentes } from "./fuentes";
import type { FraseT } from "../tipos";

const cierra = (w: string) => /[,.…:;?!]$/.test(w);
const aparicion = (fr: FraseT, t: number) => Math.max(Math.max(0, s2f(fr.inicio) - 1), s2f(t) - ADELANTO);

// ============================================================================ modo "linea"
// Una línea centrada; las palabras salen una a una y cada grupo de palabras clave (lo que va entre los
// mismos *asteriscos*) va en su propia caja del color de acento.
const L = { tam: 60, padX: 15, anchoMax: 860, maxPalabras: 6, espacio: 0.27 };

type Pal = { w: string; aparece: number; clave: boolean };
type Grupo = { clave: boolean; palabras: Pal[] };
type PaginaL = { inicio: number; fin: number; grupos: Grupo[] };

export const paginasLinea = (frases: FraseT[], sin: Set<number>): PaginaL[] => {
  const peso = pesoTexto(700);
  const ancho = (t: string) => measureText({ text: t, fontFamily: F.texto, fontWeight: String(peso), fontSize: L.tam, letterSpacing: "-0.5px", validateFontIsLoaded: false }).width;
  const paginas: PaginaL[] = [];
  frases.forEach((fr, i) => {
    if (sin.has(i)) return;
    const fichas: Grupo[] = [];
    fr.palabras.forEach((p, k) => {
      const pal: Pal = { w: p.w, aparece: aparicion(fr, p.t), clave: !!p.clave };
      const prev = k > 0 ? fr.palabras[k - 1] : null;
      const g = p.g ?? (p.clave ? k : -1);
      if (prev && pal.clave && prev.clave && (prev.g ?? -2) === g && g >= 0) fichas[fichas.length - 1].palabras.push(pal);
      else fichas.push({ clave: pal.clave, palabras: [pal] });
    });
    const finFr = s2f(fr.fin) + 8;
    let actual: PaginaL | null = null;
    let anchoActual = 0,
      n = 0,
      cortar = false;
    for (const ficha of fichas) {
      const w = ancho(ficha.palabras.map((p) => p.w).join(" ")) + L.tam * L.espacio + (ficha.clave ? L.padX * 2 : 0);
      if (!actual || cortar || anchoActual + w > L.anchoMax || n + ficha.palabras.length > L.maxPalabras) {
        const inicio = ficha.palabras[0].aparece;
        if (actual) actual.fin = inicio;
        actual = { inicio, fin: finFr, grupos: [] };
        paginas.push(actual);
        anchoActual = 0;
        n = 0;
      }
      actual.grupos.push(ficha);
      anchoActual += w;
      n += ficha.palabras.length;
      cortar = cierra(ficha.palabras[ficha.palabras.length - 1].w);
    }
  });
  for (let k = 0; k + 1 < paginas.length; k++) paginas[k].fin = Math.min(paginas[k].fin, paginas[k + 1].inicio);
  return paginas;
};

const PalabraSuelta: React.FC<{ p: Pal }> = ({ p }) => {
  const f = useCurrentFrame();
  const e = f - p.aparece;
  if (e < 0) return null;
  const k = interpolate(e, [0, 4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return <span style={{ display: "inline-block", opacity: k, transform: `translateY(${(1 - k) * 16}px) scale(${0.92 + 0.08 * k})`, marginRight: `${L.espacio}em` }}>{p.w}</span>;
};

const Caja: React.FC<{ g: Grupo }> = ({ g }) => {
  const f = useCurrentFrame();
  const vis = g.palabras.filter((p) => f >= p.aparece);
  if (vis.length === 0) return null;
  const s = spring({ frame: f - g.palabras[0].aparece, fps: FPS, config: { damping: 13, stiffness: 260, mass: 0.5 } });
  const kTexto = interpolate(f - vis[vis.length - 1].aparece, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  return (
    <span
      style={{
        display: "inline-block",
        background: CS.acento,
        color: CS.acentoTexto,
        borderRadius: 14,
        padding: `2px ${L.padX}px 4px`,
        marginRight: `${L.espacio}em`,
        transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -3}deg)`,
        boxShadow: SUAVE ? `0 8px 18px ${alfa(CS.acento, 0.3)}` : `4px 5px 0 ${C.borde}`,
        border: SUAVE ? undefined : `3px solid ${C.borde}`,
      }}
    >
      {vis.map((p, i) => (
        <span key={i} style={{ opacity: i === vis.length - 1 ? kTexto : 1 }}>
          {i > 0 ? " " : ""}
          {p.w}
        </span>
      ))}
    </span>
  );
};

export const SubtitulosLinea: React.FC<{ frases: FraseT[]; sin: number[] }> = ({ frases, sin }) => {
  const f = useCurrentFrame();
  const ok = useFuentes();
  const paginas = useMemo(() => (ok ? paginasLinea(frases, new Set(sin)) : []), [ok, frases, sin]);
  const pg = paginas.find((p) => f >= p.inicio && f < p.fin);
  if (!pg) return null;
  const salida = interpolate(f, [pg.fin - 4, pg.fin], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        top: SUB_Y - L.tam * 0.75,
        textAlign: "center",
        fontFamily: F.texto,
        fontWeight: pesoTexto(700),
        fontSize: L.tam,
        lineHeight: 1.25,
        letterSpacing: -0.5,
        color: CS.texto,
        opacity: salida,
        whiteSpace: "nowrap",
      }}
    >
      {pg.grupos.map((g, i) => (g.clave ? <Caja key={i} g={g} /> : g.palabras.map((p, k) => <PalabraSuelta key={`${i}-${k}`} p={p} />)))}
    </div>
  );
};

// ============================================================================ modo "bloque"
// Hasta 3 líneas arriba a la izquierda (dentro de la zona segura de TikTok); las palabras salen una a una
// y las palabras clave van en el color de acento y más gruesas.
const B = { x: 110, y: 330, ancho: 840, lineas: 3, tam: 68, alto: 1.18 };
const ENLACE = new Set(["a", "al", "de", "del", "el", "la", "los", "las", "en", "y", "o", "que", "con", "un", "una", "por", "sobre", "su", "te", "se", "no"]);
const limpia = (w: string) => w.toLowerCase().replace(/[^a-záéíóúüñ]/g, "");

type PalB = { w: string; aparece: number; clave: boolean };
type PaginaB = { inicio: number; palabras: PalB[] };

export const paginasBloque = (frases: FraseT[], sin: Set<number>): PaginaB[] => {
  const pesoN = pesoTexto(600),
    pesoC = pesoTexto(800);
  const paginas: PaginaB[] = [];
  frases.forEach((fr, i) => {
    if (sin.has(i)) return;
    const corte = Math.max(0, s2f(fr.inicio) - 1);
    let caja = fillTextBox({ maxBoxWidth: B.ancho, maxLines: B.lineas });
    let actual: PaginaB | null = null;
    for (const p of fr.palabras) {
      const medida = { text: `${p.w} `, fontFamily: F.texto, fontWeight: String(p.clave ? pesoC : pesoN), fontSize: B.tam, letterSpacing: "-0.5px", validateFontIsLoaded: false };
      const r = caja.add(medida);
      if (!actual || r.exceedsBox) {
        const arrastradas: PalB[] = [];
        if (actual && actual.palabras.length > 2 && ENLACE.has(limpia(actual.palabras[actual.palabras.length - 1].w))) arrastradas.push(actual.palabras.pop() as PalB);
        caja = fillTextBox({ maxBoxWidth: B.ancho, maxLines: B.lineas });
        for (const a of arrastradas) caja.add({ ...medida, text: `${a.w} `, fontWeight: String(a.clave ? pesoC : pesoN) });
        caja.add(medida);
        const inicio: number = actual ? (arrastradas[0]?.aparece ?? s2f(p.t) - ADELANTO) : corte;
        actual = { inicio, palabras: arrastradas.map((a) => ({ ...a, aparece: inicio })) };
        paginas.push(actual);
      }
      actual.palabras.push({ w: p.w, aparece: Math.max(actual.inicio, s2f(p.t) - ADELANTO), clave: !!p.clave });
    }
  });
  return paginas;
};

export const SubtitulosBloque: React.FC<{ frases: FraseT[]; sin: number[] }> = ({ frases, sin }) => {
  const frame = useCurrentFrame();
  const ok = useFuentes();
  const paginas = useMemo(() => (ok ? paginasBloque(frases, new Set(sin)) : []), [ok, frases, sin]);
  let actual: PaginaB | null = null;
  for (const p of paginas) if (frame >= p.inicio) actual = p;
  if (!actual) return null;
  return (
    <div style={{ position: "absolute", top: B.y, left: B.x, width: B.ancho + 40, fontFamily: F.texto, fontWeight: pesoTexto(600), fontSize: B.tam, lineHeight: B.alto, color: CS.texto, letterSpacing: -0.5 }}>
      {actual.palabras.map((p, i) => {
        const edad = frame - p.aparece;
        if (edad < 0) return null;
        const k = interpolate(edad, [0, 3], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
        const color = p.clave ? interpolateColors(k, [0, 1], [alfa(CS.acento, 0.4), CS.acento]) : interpolateColors(k, [0, 1], [alfa(CS.texto, 0.3), CS.texto]);
        const y = interpolate(edad, [0, 4], [12, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.25em", transform: `translateY(${y}px)`, color, ...(p.clave ? { fontWeight: pesoTexto(800) } : {}) }}>
            {p.w}
          </span>
        );
      })}
    </div>
  );
};
