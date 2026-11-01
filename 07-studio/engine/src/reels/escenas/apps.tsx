// Escenas con apps dibujadas: "chat" (alguien escribe una idea y la IA responde con código y una vista
// previa), "editor" (zoom hacia atrás que revela el propio reel en un editor con su línea de tiempo) y
// "movil" (un móvil con una pantalla, pegatina y contador).
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { C, PLAN } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { F, alfa } from "../motor/estilos";
import { pesoTexto } from "../motor/fuentes";
import { bump, lerp, numeroES, useFlota, usePop } from "../motor/anim";
import { Anotacion, Chip, Destello, Onda, Pildora } from "../piezas/basicas";
import { CampoTexto, CodigoStream, Editor, MovilVista, VentanaChat, geometriaEditor } from "../piezas/ventanas";
import type { DefEscena, PropsEscena } from "../tipos";
import { arr, ico, num, obj, txt } from "./util";

// ================================================================== chat
const V = { x: 90, y: 250, w: 900, h: 760 };

const Chat: React.FC<PropsEscena> = ({ p, b, i }) => {
  const f = useCurrentFrame();
  const [bEscribe, bEnvia, bResponde, bMovil, bPildora] = b;
  const mensaje = txt(p, "mensaje");
  const titulo = txt(p, "titulo", "Claude");
  const saludo = txt(p, "saludo", "¿Qué hacemos hoy?");
  const respuesta = txt(p, "respuesta", "Escribiendo el reel");
  const archivo = txt(p, "archivo", "reel.tsx");
  const movil = obj(p, "movil");
  const pildora = txt(p, "pildora");
  const anotacion = txt(p, "anotacion");
  // la ventana entra subiendo si es la primera escena del chat (si la frase anterior también era chat, ya está)
  const anterior = i > 0 ? PLAN.tipos[i - 1] : "";
  const entra = anterior === "chat" ? 1 : spring({ frame: f, fps: FPS, config: { damping: 15, stiffness: 120, mass: 0.8 } });
  const enviado = mensaje ? bEnvia : 1e9;
  const saludoOp = 1 - lerp(f, enviado, enviado + 6, 0, 1);
  const burbuja = usePop(enviado + 2, { damping: 14, stiffness: 200, mass: 0.6 });
  const resp = mensaje ? lerp(f, bResponde - 2, bResponde + 6, 0, 1) : 0;
  const pm = usePop(bMovil, { damping: 12, stiffness: 170, mass: 0.7 });
  const fM = useFlota(1.2, 6, 15);
  const pp = usePop(bPildora);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: V.x, top: V.y + (1 - entra) * 220, opacity: Math.min(1, entra * 1.5), transform: `scale(${0.92 + 0.08 * entra})` }}>
        <VentanaChat w={V.w} h={V.h} titulo={titulo}>
          {saludoOp > 0 && (
            <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: saludoOp }}>
              <Destello size={74} />
              <div style={{ fontFamily: F.texto, fontWeight: pesoTexto(800), fontSize: 44, color: C.oscuroTexto }}>{saludo}</div>
            </div>
          )}
          {burbuja > 0 && (
            <div
              style={{
                position: "absolute",
                right: 30,
                top: 26,
                maxWidth: 640,
                background: alfa(C.oscuroTexto, 0.12),
                color: C.oscuroTexto,
                fontFamily: F.texto,
                fontWeight: pesoTexto(600),
                fontSize: 30,
                padding: "16px 24px",
                borderRadius: "26px 26px 8px 26px",
                transform: `translateY(${(1 - burbuja) * 300}px) scale(${0.8 + 0.2 * burbuja})`,
                transformOrigin: "100% 100%",
              }}
            >
              {mensaje}
            </div>
          )}
          {resp > 0 && (
            <div style={{ position: "absolute", left: 30, right: 30, top: 116, opacity: resp }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F.texto, fontWeight: pesoTexto(600), fontSize: 28, color: alfa(C.oscuroTexto, 0.8) }}>
                <Destello size={30} giro={f * 4} />
                {respuesta} <span style={{ fontFamily: F.mono, color: C.acento }}>{archivo}</span>
                <span style={{ opacity: Math.floor(f / 6) % 2 ? 1 : 0.2 }}>…</span>
              </div>
              <div style={{ marginTop: 16, background: alfa("#000000", 0.25), borderRadius: 20, padding: "18px 22px", height: 400, overflow: "hidden" }}>
                <CodigoStream desde={bResponde + 2} hasta={Math.max(bResponde + 20, (bPildora ?? bResponde + 40) - 4)} tam={23} titulo={txt(movil, "titulo", "Mi reel")} />
              </div>
            </div>
          )}
          <div style={{ position: "absolute", left: 30, right: 30, bottom: 30 }}>
            <CampoTexto texto={mensaje} desde={bEscribe} hasta={Math.max(bEscribe + 6, bEnvia - 4)} enviado={enviado} brillo={mensaje ? 0 : bump(f, bEscribe, 16)} />
          </div>
        </VentanaChat>
      </div>
      {anotacion && <Anotacion texto={anotacion} desde={bEscribe + 8} hasta={enviado} x={150} y={842} tam={58} rot={-5} />}
      {pm > 0 && txt(movil, "titulo") && (
        <div style={{ position: "absolute", left: 742, top: 470 + fM, transform: `rotate(${7 * pm}deg) scale(${pm})`, transformOrigin: "50% 80%" }}>
          <MovilVista w={260} desde={bMovil} titulo={txt(movil, "titulo")} subtitulo={txt(movil, "subtitulo") || undefined} icono={ico(movil, "icono") || undefined} />
        </div>
      )}
      {pp > 0 && pildora && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1034, display: "flex", justifyContent: "center", transform: `scale(${pp})` }}>
          <Pildora fondo={C.acento} color={C.acentoTexto} tam={30} mono>
            {pildora}
          </Pildora>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const chat: DefEscena = { C: Chat };

// ================================================================== editor
const E = { x: 60, y: 210, w: 960, h: 860 };

const VistaMini: React.FC<{ vibra: number }> = ({ vibra }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 30% 25%, ${C.tarjeta}, ${C.fondo} 70%)`, transform: `scale(${1 + 0.05 * vibra})` }}>
      <div style={{ position: "absolute", top: "16%", left: 10, right: 10, textAlign: "center", fontFamily: F.titulo, fontSize: 22, lineHeight: 1.1, color: C.texto }}>{PLAN.titulo}</div>
      <div style={{ position: "absolute", top: "52%", left: "50%", transform: "translate(-50%,-50%)", width: 56, height: 56, borderRadius: 15, background: C.tarjeta, boxShadow: "0 6px 14px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Destello size={32} giro={f * 0.8} />
      </div>
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{ position: "absolute", top: "70%", left: `${9 + k * 21.5}%`, width: 50, height: 34, borderRadius: 6, background: k % 2 ? C.acento : C.texto, opacity: 0.85, transform: `rotate(${(k - 1.5) * 8}deg)` }} />
      ))}
    </div>
  );
};

const EditorEscena: React.FC<PropsEscena> = ({ p, b, i }) => {
  const f = useCurrentFrame();
  const [bZoom, bHecho, bPalabras, bSonidos] = b;
  const g = geometriaEditor(E.w, E.h);
  const anterior = i > 0 ? PLAN.tipos[i - 1] : "";
  const zoom = anterior === "editor" ? 1 : interpolate(f, [bZoom, bZoom + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const escala = 3.6 + (1 - 3.6) * zoom;
  const desenfoque = Math.sin(Math.PI * zoom) * 5;
  const cab = 0.55 + 0.002 * f;
  const hecho = txt(p, "hecho", "hecho con código");
  const palabras = arr<string>(p, "palabras").slice(0, 4);
  const sonidos = arr<string>(p, "sonidos").slice(0, 3);
  const pistaY = (k: number) => E.y + g.yPistas + k * g.altoPista + g.altoPista / 2;
  const pistaX = (q: number) => E.x + g.x0 + q * g.anchoPistas;
  const ph = usePop(bHecho, { damping: 10, stiffness: 220, mass: 0.6 });
  const vibra = bump(f, bPalabras + 10, 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, filter: desenfoque > 0.3 ? `blur(${desenfoque}px)` : undefined }}>
        <div style={{ position: "absolute", left: E.x, top: E.y, transform: `scale(${escala})`, transformOrigin: "50% 35%" }}>
          <Editor w={E.w} h={E.h} cabezal={cab} vista={<VistaMini vibra={vibra} />} archivo={txt(p, "archivo", "este_reel.tsx")} />
        </div>
      </div>
      {ph > 0 && (
        <div style={{ position: "absolute", left: 540, top: E.y + 74 + g.altoVista - 70, transform: `translate(-50%, 0) scale(${ph}) rotate(${-4 * ph}deg)` }}>
          <Pildora fondo={C.acento} color={C.acentoTexto} tam={30}>
            <Destello size={30} color={C.acentoTexto} />
            {hecho}
          </Pildora>
        </div>
      )}
      <Onda desde={bHecho} x={540} y={E.y + 74 + g.altoVista - 40} r0={60} r1={260} />
      {palabras.map((w, k) => (
        <Chip key={k} texto={w} desde={bPalabras + k * 3} x={pistaX(0.12 + k * 0.2)} y={pistaY(0)} dy={-260} dx={(k - 1.5) * 60} tam={22} rot={(k - 1.5) * 3} />
      ))}
      {sonidos.map((s, k) => (
        <Chip key={k} texto={s} desde={bSonidos + k * 8} x={pistaX(0.2 + k * 0.26)} y={pistaY(3)} dy={-300} dx={(k - 1) * 120} fondo={C.oscuro} color={C.oscuroTexto} tam={24} rot={(k - 1) * 4} />
      ))}
    </AbsoluteFill>
  );
};

export const editor: DefEscena = { C: EditorEscena };

// ================================================================== móvil
const Movil: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [bEntra, bContenido, bPegatina] = b;
  const entra = spring({ frame: f - bEntra, fps: FPS, config: { damping: 14, stiffness: 130, mass: 0.8 } });
  const fl = useFlota(0.4, 7, 16);
  const pegatina = txt(p, "pegatina");
  const cont = obj(p, "contador");
  const tieneCont = cont.hasta !== undefined;
  const v = interpolate(f, [bContenido, bContenido + 26], [num(cont, "desde", 0), num(cont, "hasta", 0)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ps = usePop(bPegatina, { damping: 9, stiffness: 260, mass: 0.6 });
  if (f < bEntra) return null;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 540 - 190, top: 250 + (1 - entra) * 400 + fl, transform: `rotate(${-4 + 4 * (1 - entra)}deg)`, opacity: Math.min(1, entra * 2) }}>
        <MovilVista w={380} desde={bContenido} titulo={txt(p, "titulo")} subtitulo={txt(p, "subtitulo") || undefined} icono={ico(p, "icono") || undefined} />
      </div>
      {tieneCont && f >= bContenido && (
        <div style={{ position: "absolute", left: 600, top: 760, transform: `rotate(5deg)` }}>
          <div style={{ background: C.tarjeta, color: C.tarjetaTexto, borderRadius: 26, padding: "16px 26px", boxShadow: "0 16px 30px rgba(0,0,0,0.18)", fontFamily: F.titulo, fontSize: 64, lineHeight: 1 }}>
            {numeroES(Math.round(v))}
            <div style={{ fontFamily: F.texto, fontWeight: pesoTexto(600), fontSize: 26, color: alfa(C.tarjetaTexto, 0.65), marginTop: 6 }}>{txt(cont, "etiqueta", "visitas")}</div>
          </div>
        </div>
      )}
      {ps > 0 && pegatina && (
        <div style={{ position: "absolute", left: 640, top: 300, transform: `rotate(${10 - 6 * (1 - ps)}deg) scale(${1 + 0.6 * (1 - ps)})`, opacity: Math.min(1, ps * 2) }}>
          <div style={{ background: C.acento, color: C.acentoTexto, fontFamily: F.titulo, fontSize: 52, padding: "12px 28px", borderRadius: 18, boxShadow: "0 12px 26px rgba(0,0,0,0.22)", whiteSpace: "nowrap" }}>{pegatina}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const movil: DefEscena = { C: Movil };
