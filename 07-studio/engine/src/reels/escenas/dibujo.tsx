// Escena "dibujo": the agent's own vector drawing (lib/drawing.mjs) as the star of the sentence, in the reels look:
// an optional label on top, the drawing on a disc / card backdrop (soft family: glassy disc and diffuse shadow;
// marked family: bordered disc and hard shadow), and an optional short title under it. Moments: 1 the drawing
// enters (pop, or a soft rise on soft entrances), 2 the title. Its parts animate on narration words through their
// own `at` / `keys` / `motion` (planReels resolves them into the scene's `momentos`).
import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { measureText } from "@remotion/layout-utils";
import { BORDE, C, ESTILO, SOMBRA, SUAVE } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { F, alfa } from "../motor/estilos";
import { useFuentes } from "../motor/fuentes";
import { lerp, useFlota, usePop } from "../motor/anim";
import { Dibujo, EscenaDibujo, esDibujo } from "../piezas/dibujo";
import type { DrawingSpec } from "../../components/Drawing2D";
import type { DefEscena, PropsEscena } from "../tipos";
import { bool, txt } from "./util";
import { Etiqueta } from "./titular";

const ALTO_ETIQUETA = 76;
const HUECO = 34;
const ANCHO_TEXTO = 900;
/** Drawing presets that already are an entrance: the scene then only fades the drawing in (no double pop). */
const ENTRADAS = ["pop-in", "slide-in-left", "slide-in-right", "fall", "draw-on"];

/** The drawing of the scene (`dibujo`, or the English `drawing` key). */
export const dibujoDe = (p: Record<string, unknown>): DrawingSpec | null => (esDibujo(p.dibujo) ? p.dibujo : esDibujo(p.drawing) ? p.drawing : null);

const lineasDe = (p: Record<string, unknown>) =>
  txt(p, "texto")
    .split("/")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);

/** Title size: the biggest that fits ANCHO_TEXTO (at most 104, scaled by the style), from measured widths. */
const tamTexto = (lineas: string[]) => {
  if (!lineas.length) return 0;
  const ancho100 = Math.max(
    1,
    ...lineas.map((l) =>
      l.split(/(\*[^*]+\*)/g).reduce((a, seg) => {
        const enf = seg.startsWith("*") && seg.endsWith("*");
        const t = enf ? seg.slice(1, -1) : seg;
        return a + measureText({ text: t, fontFamily: enf ? F.mano : F.titulo, fontWeight: String(enf ? 700 : ESTILO.fuentes.titulo.weight), fontSize: enf ? 128 : 100, validateFontIsLoaded: false }).width;
      }, 0),
    ),
  );
  return Math.max(48, Math.min(104 * ESTILO.escalaTitulo, (100 * ANCHO_TEXTO) / ancho100));
};

/**
 * Layout in LIENZO coordinates (pure in the scene fields): label top, the drawing's square box and the title.
 * Used by the scene and by the fx layer (drawing / part targets).
 */
export const layoutDibujo = (p: Record<string, unknown>) => {
  const lineas = lineasDe(p);
  const etiqueta = txt(p, "etiqueta");
  const tam = tamTexto(lineas);
  const altos = lineas.map((l) => (l.includes("*") ? 1.38 : 1.12) * tam);
  const altoTexto = altos.reduce((a, x) => a + x, 0);
  const lado = lineas.length === 0 ? (etiqueta ? 680 : 720) : lineas.length === 1 ? 620 : 560;
  const bloque = (etiqueta ? ALTO_ETIQUETA : 0) + lado + (lineas.length ? HUECO + altoTexto : 0);
  const y0 = Math.max(220, 640 - bloque / 2);
  const top = y0 + (etiqueta ? ALTO_ETIQUETA : 0);
  const caja = { x: 540 - lado / 2, y: top, w: lado, h: lado };
  // the drawing's own square inside the backdrop
  const pad = lado * (txt(p, "marco") === "no" ? 0.02 : 0.1);
  const arte = { x: caja.x + pad, y: caja.y + pad, w: lado - 2 * pad, h: lado - 2 * pad };
  return { etiqueta, lineas, tam, altos, y0, caja, arte, textoTop: top + lado + HUECO };
};

const TextoLinea: React.FC<{ l: string; tam: number; alto: number; desde: number }> = ({ l, tam, alto, desde }) => {
  const f = useCurrentFrame();
  const k = lerp(f, desde, desde + 8, 0, 1);
  if (f < desde) return <div style={{ height: alto }} />;
  return (
    <div style={{ height: alto, display: "flex", justifyContent: "center", alignItems: "baseline", whiteSpace: "nowrap", opacity: k, transform: `translateY(${(1 - k) * 26}px)`, filter: k < 1 ? `blur(${(1 - k) * 6}px)` : undefined }}>
      {l.split(/(\*[^*]+\*)/g).map((seg, j) =>
        seg.startsWith("*") && seg.endsWith("*") ? (
          <span key={j} style={{ fontFamily: F.mano, fontWeight: 700, fontSize: tam * 1.28, color: C.acento, lineHeight: 1 }}>
            {seg.slice(1, -1)}
          </span>
        ) : (
          <span key={j} style={{ fontFamily: F.titulo, fontWeight: ESTILO.fuentes.titulo.weight, fontSize: tam, letterSpacing: -tam * 0.02, color: C.texto, lineHeight: 1, whiteSpace: "pre" }}>
            {seg}
          </span>
        ),
      )}
    </div>
  );
};

/** Backdrop of the drawing: a disc (default), a card, or only a soft glow ("no"). */
const Marco: React.FC<{ caja: { x: number; y: number; w: number; h: number }; tipo: string; k: number }> = ({ caja, tipo, k }) => {
  const f = useCurrentFrame();
  const cx = caja.x + caja.w / 2;
  const cy = caja.y + caja.h / 2;
  const r = caja.w * 0.45;
  const glow = (
    <div style={{ position: "absolute", left: cx - r * 1.5, top: cy - r * 1.5, width: r * 3, height: r * 3, borderRadius: "50%", background: `radial-gradient(circle, ${alfa(C.acento, SUAVE ? 0.22 : 0.14)} 0%, ${alfa(C.acento, 0)} 62%)`, opacity: k }} />
  );
  if (tipo === "no") return glow;
  const disco = tipo !== "tarjeta";
  const lado = disco ? r * 2 : caja.w * 0.9;
  const fondo = SUAVE ? `radial-gradient(circle at 35% 30%, ${alfa(C.tarjeta, 0.95)} 0%, ${alfa(C.tarjeta, 0.62)} 100%)` : C.tarjeta;
  return (
    <>
      {glow}
      <div
        style={{
          position: "absolute",
          left: cx - lado / 2,
          top: cy - lado / 2,
          width: lado,
          height: lado,
          borderRadius: disco ? "50%" : 64,
          background: fondo,
          boxShadow: SOMBRA,
          border: BORDE,
          transform: `scale(${0.6 + 0.4 * k})`,
          opacity: Math.min(1, k * 1.8),
        }}
      />
      {disco && (
        <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: 0.55 * Math.min(1, k * 1.5) }}>
          <circle cx={cx} cy={cy} r={r * 1.1} fill="none" stroke={SUAVE ? C.acento : C.borde} strokeWidth={SUAVE ? 4 : 5} strokeDasharray="3 22" strokeLinecap="round" transform={`rotate(${f * 0.5} ${cx} ${cy})`} />
        </svg>
      )}
    </>
  );
};

const EscenaDibujoC: React.FC<PropsEscena> = ({ p, b }) => {
  const ok = useFuentes();
  const f = useCurrentFrame();
  const ctx = React.useContext(EscenaDibujo);
  const dibujo = dibujoDe(p);
  const [b0 = 0, b1 = b0 + 10] = b;
  const pop = usePop(b0, { damping: 12, stiffness: 170, mass: 0.65 });
  const marco = usePop(Math.max(0, b0 - 3), { damping: 15, stiffness: 150, mass: 0.7 });
  const fl = useFlota(0.6, 7, 19);
  if (!ok || !dibujo) return null;
  const L = layoutDibujo(p);
  const propia = (dibujo.motion ?? []).some((m) => ENTRADAS.includes(typeof m === "string" ? m : (m as { type: string }).type));
  // the drawing's entrance: its own preset (only a quick fade here), a soft rise on soft entrances, else a pop
  const suave = ctx.entrada === "suave";
  let op = 1;
  let esc = 1;
  let dy = 0;
  let blur = 0;
  if (f < b0) op = 0;
  else if (propia) op = lerp(f, b0, b0 + 3, 0, 1);
  else if (suave) {
    const k = lerp(f, b0, b0 + 14, 0, 1, Easing.out(Easing.cubic));
    op = k;
    esc = 0.9 + 0.1 * k;
    dy = (1 - k) * 60;
    blur = (1 - k) * 10;
  } else {
    esc = pop;
    op = Math.min(1, pop * 2);
  }
  const tipoMarco = txt(p, "marco", "circulo");
  return (
    <AbsoluteFill>
      {L.etiqueta && <Etiqueta texto={L.etiqueta} primera={b0} grande={bool(p, "etiquetaGrande", false)} top={L.y0} />}
      <Marco caja={L.caja} tipo={tipoMarco} k={f < b0 - 3 ? 0 : marco} />
      <div
        style={{
          position: "absolute",
          left: L.arte.x,
          top: L.arte.y + fl + dy,
          width: L.arte.w,
          height: L.arte.h,
          opacity: op,
          transform: `scale(${esc})`,
          transformOrigin: "50% 70%",
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        <Dibujo dibujo={dibujo} tam={L.arte.w} entra={b0 / FPS} uid={`rds${ctx.i}`} />
      </div>
      {L.lineas.length > 0 && (
        <div style={{ position: "absolute", top: L.textoTop, left: 0, right: 0 }}>
          {L.lineas.map((l, k) => (
            <TextoLinea key={k} l={l} tam={L.tam} alto={L.altos[k]} desde={b1 + k * 5} />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const dibujo: DefEscena = { C: EscenaDibujoC };
