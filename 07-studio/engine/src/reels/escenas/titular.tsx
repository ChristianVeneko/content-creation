// Escena "titular": el gancho. Un título grande que se escribe palabra a palabra al ritmo de la voz,
// con las palabras de énfasis (*así*) en letra a mano y color de acento, una etiqueta opcional
// ("¿SABÍAS QUE…?") y, debajo, un abanico de imágenes o un icono grande.
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { C, ESTILO, SOMBRA } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { F } from "../motor/estilos";
import { useFuentes } from "../motor/fuentes";
import { lerp, usePop } from "../motor/anim";
import { Baldosa, Destello, Icono } from "../piezas/basicas";
import { esDibujo } from "../piezas/dibujo";
import type { DefEscena, PropsEscena } from "../tipos";
import { arr, bool, ico, norm, txt } from "./util";

type Tok = { w: string; enfasis: boolean; f: number };

/** Tamaño máximo del título (los cortos salen grandes, como un cartel) y ancho disponible. */
const TAM_MAX = 124;
const ANCHO_MAX = 920;
/** Alto que ocupa la etiqueta encima del título. */
const ALTO_ETIQUETA = 76;
/** Size of an agent drawing under the title (in place of the icon tile). */
const TAM_DIBUJO = 330;

/** Reparte el título en líneas y le pone a cada palabra el fotograma en que se dice. */
const preparar = (texto: string, palabras: PropsEscena["palabras"], dur: number): Tok[][] => {
  let dentro = false;
  const lineas = texto
    .split("/")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) =>
      l.split(/\s+/).map((w) => {
        if (w.startsWith("*")) dentro = true;
        const t = { w: w.replace(/\*/g, ""), enfasis: dentro, f: -1 };
        if (w.replace(/[.,:;!?…]+$/, "").endsWith("*")) dentro = false;
        return t;
      }),
    );
  const toks = lineas.flat();
  const dichas = palabras.map((p) => ({ n: norm(p.w), f: p.f }));
  let j = 0,
    vistos = 0,
    ultimo = 2;
  for (const t of toks) {
    const n = norm(t.w);
    let hallada = -1;
    for (let k = j; k < Math.min(dichas.length, j + 6); k++) {
      if (n && (dichas[k].n === n || dichas[k].n.startsWith(n) || n.startsWith(dichas[k].n))) {
        hallada = k;
        break;
      }
    }
    if (hallada >= 0) {
      t.f = dichas[hallada].f;
      j = hallada + 1;
      vistos++;
    } else t.f = ultimo;
    ultimo = t.f;
  }
  if (vistos === 0) toks.forEach((t, k) => (t.f = Math.round(2 + (k * dur * 0.6) / Math.max(1, toks.length))));
  return lineas;
};

const PalabraTitulo: React.FC<{ t: Tok; tam: number; ultima: boolean }> = ({ t, tam, ultima }) => {
  const f = useCurrentFrame();
  if (f < t.f) return null;
  const fuente = t.enfasis
    ? { fontFamily: F.mano, fontWeight: 700, fontSize: tam * 1.28, letterSpacing: 0, color: C.acento, lineHeight: 1 }
    : { fontFamily: F.titulo, fontWeight: ESTILO.fuentes.titulo.weight, fontSize: tam, letterSpacing: -tam * 0.02, color: C.texto, lineHeight: 1 };
  const ancho = measureText({ text: t.w, fontFamily: fuente.fontFamily, fontWeight: String(fuente.fontWeight), fontSize: fuente.fontSize, letterSpacing: `${fuente.letterSpacing}px`, validateFontIsLoaded: false }).width;
  const hueco = ancho + (ultima ? 0 : 0.26 * tam);
  const k = lerp(f, t.f, t.f + 6, 0, 1);
  const g = lerp(f, t.f, t.f + 5, 0, 1, Easing.out(Easing.cubic));
  return (
    <span style={{ display: "inline-block", width: hueco * g, whiteSpace: "nowrap", textAlign: "left" }}>
      <span style={{ display: "inline-block", ...fuente, opacity: k, transform: `translateY(${(1 - k) * 22}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined }}>{t.w}</span>
    </span>
  );
};

export const Etiqueta: React.FC<{ texto: string; primera: number; grande: boolean; top: number }> = ({ texto, primera, grande, top }) => {
  const f = useCurrentFrame();
  const sube = grande && primera > 14;
  const y = sube ? lerp(f, primera - 8, primera + 4, 300, 0, Easing.inOut(Easing.cubic)) : 0;
  const s = sube ? lerp(f, primera - 8, primera + 4, 2.4, 1, Easing.inOut(Easing.cubic)) : 1;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, transform: `translateY(${y}px) scale(${s})` }}>
      <Destello size={34} giro={f * 3} />
      <span style={{ fontFamily: F.texto, fontWeight: 800, fontSize: 34, letterSpacing: 7, color: C.acento, whiteSpace: "nowrap" }}>
        {texto.split("").map((l, k) => (
          <span key={k} style={{ display: "inline-block", opacity: lerp(f, k * 1.2, k * 1.2 + 4, 0, 1), transform: `translateY(${lerp(f, k * 1.2, k * 1.2 + 5, 18, 0)}px)` }}>
            {l === " " ? " " : l}
          </span>
        ))}
      </span>
    </div>
  );
};

const anchoAbanico = (n: number) => (n <= 2 ? 330 : n === 3 ? 290 : 236);
/** Alto que ocupa el abanico (con su hueco de arriba). */
const altoAbanico = (n: number) => 70 + (anchoAbanico(n) * 2) / 3 + 60;

const Abanico: React.FC<{ imagenes: string[]; desde: number; arriba: number }> = ({ imagenes, desde, arriba }) => {
  const f = useCurrentFrame();
  const n = imagenes.length;
  const w = anchoAbanico(n);
  const cy = arriba + 70 + w / 3;
  return (
    <AbsoluteFill style={{ zIndex: 0 }}>
      {imagenes.map((src, k) => {
        const d = desde + k * 3;
        const p = spring({ frame: f - d, fps: FPS, config: { damping: 13, stiffness: 140, mass: 0.7 } });
        if (f < d) return null;
        const pos = (k - (n - 1) / 2) / Math.max(1, (n - 1) / 2); // -1..1
        const ang = pos * 17;
        const dx = pos * (n <= 2 ? 190 : 330);
        const dy = Math.abs(pos) * 40;
        const flo = Math.sin(f / 15 + k * 1.7) * 6;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: 540 + dx * p - w / 2,
              top: cy - 120 + (120 + dy) * p - w / 3 + flo,
              width: w,
              height: (w * 2) / 3,
              borderRadius: w * 0.08,
              overflow: "hidden",
              border: `5px solid ${C.tarjeta}`,
              boxShadow: SOMBRA,
              transform: `rotate(${ang * p}deg) scale(${0.25 + 0.75 * p})`,
              opacity: Math.min(1, p * 3),
              zIndex: Math.round(10 - Math.abs(pos) * 5),
            }}
          >
            <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Titular: React.FC<PropsEscena> = ({ p, b, dur, palabras }) => {
  const ok = useFuentes();
  const texto = txt(p, "texto");
  const etiqueta = txt(p, "etiqueta");
  const imagenes = arr<string>(p, "imagenes").slice(0, 4);
  const icono = ico(p, "icono");
  const dibujo = esDibujo(icono);
  const lineas = useMemo(() => preparar(texto, palabras, dur), [texto, palabras, dur]);
  const ic = usePop(b[0] ?? 0);
  if (!ok) return null;
  // tamaño: lo más grande que quepa a lo ancho (como mucho TAM_MAX) y que no se coma la pantalla a lo alto
  const anchoLinea = (l: Tok[], s: number) =>
    l.reduce(
      (a, t, k) =>
        a +
        measureText({ text: t.w, fontFamily: t.enfasis ? F.mano : F.titulo, fontWeight: String(t.enfasis ? 700 : ESTILO.fuentes.titulo.weight), fontSize: t.enfasis ? s * 1.28 : s, letterSpacing: t.enfasis ? "0px" : `${-s * 0.02}px`, validateFontIsLoaded: false }).width +
        (k < l.length - 1 ? 0.26 * s : 0),
      0,
    );
  const ancho100 = Math.max(1, ...lineas.map((l) => anchoLinea(l, 100)));
  const conMedia = imagenes.length > 0 || !!icono;
  const altoMaxTitulo = conMedia ? 470 : 640;
  // las líneas con letra a mano necesitan algo más de alto
  const factores = lineas.map((l) => (l.some((t) => t.enfasis) ? 1.42 : 1.16));
  const sumaFactores = factores.reduce((a, x) => a + x, 0) || 1;
  const tam = Math.max(46, Math.min(TAM_MAX * ESTILO.escalaTitulo, (100 * ANCHO_MAX) / ancho100, altoMaxTitulo / sumaFactores));
  const altos = factores.map((x) => x * tam);
  const altoTitulo = altos.reduce((a, x) => a + x, 0);
  // todo el bloque (etiqueta + título + imágenes o icono) centrado en el lienzo
  const altoMedia = imagenes.length > 0 ? altoAbanico(imagenes.length) : dibujo ? 40 + TAM_DIBUJO : icono ? 70 + 220 : 0;
  const altoBloque = (etiqueta ? ALTO_ETIQUETA : 0) + altoTitulo + altoMedia;
  const y0 = Math.max(225, 640 - altoBloque / 2);
  const top = y0 + (etiqueta ? ALTO_ETIQUETA : 0);
  const fin = top + altoTitulo;
  const primera = lineas[0]?.[0]?.f ?? 0;
  return (
    <AbsoluteFill>
      {etiqueta && <Etiqueta texto={etiqueta} primera={primera} grande={bool(p, "etiquetaGrande", true)} top={y0} />}
      <div style={{ position: "absolute", top, left: 20, right: 20, textAlign: "center" }}>
        {lineas.map((l, k) => (
          <div key={k} style={{ height: altos[k], display: "flex", justifyContent: "center", alignItems: "baseline", paddingTop: tam * 0.03, boxSizing: "border-box" }}>
            {l.map((t, j) => (
              <PalabraTitulo key={j} t={t} tam={tam} ultima={j === l.length - 1} />
            ))}
          </div>
        ))}
      </div>
      {imagenes.length > 0 && <Abanico imagenes={imagenes} desde={b[0] ?? 0} arriba={fin} />}
      {/* the agent's drawing: bigger than the icon tile and without it (its own art carries the slot) */}
      {imagenes.length === 0 && dibujo && ic > 0 && (
        <div style={{ position: "absolute", left: 540 - TAM_DIBUJO / 2, top: fin + 40, transform: `scale(${ic})`, transformOrigin: "50% 60%" }}>
          <Icono nombre={icono} tam={TAM_DIBUJO} />
        </div>
      )}
      {imagenes.length === 0 && !dibujo && icono && ic > 0 && (
        <div style={{ position: "absolute", left: 540 - 110, top: fin + 70, transform: `scale(${ic})` }}>
          <Baldosa size={220} icono={icono} brillo={0.4} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const titular: DefEscena = { C: Titular };
