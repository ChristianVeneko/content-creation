// Escenas con imágenes: "imagen" (una ilustración o foto grande con efectos animados con código)
// y "galeria" (varias imágenes en abanico, en órbita alrededor de un icono o en rejilla).
import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame } from "remotion";
import { BORDE, C, SOMBRA } from "../motor/actual";
import { FPS } from "../motor/constantes";
import { interpolate } from "remotion";
import { lerp, usePop } from "../motor/anim";
import { Baldosa, Onda, Pildora } from "../piezas/basicas";
import { BarraVideo, Burbujas, Causticas, Cine, Estrellas, HazFaro, ImagenCard, Koi, Ondulaciones, Rayos, SubtituloCine } from "../piezas/imagenes";
import type { DefEscena, PropsEscena } from "../tipos";
import { arr, num, obj, txt } from "./util";

// ================================================================== imagen

const Imagen: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [b0, b1] = b;
  const ef = new Set(arr<string>(p, "efectos"));
  const formato = txt(p, "formato", "horizontal"); // horizontal (3:2) · cuadrada · vertical
  const R = formato === "cuadrada" ? { x: 140, y: 250, w: 800, h: 800 } : formato === "vertical" ? { x: 230, y: 230, w: 620, h: 840 } : { x: 90, y: 300, w: 900, h: 600 };
  const haz = arr<number>(p, "haz");
  const peces = obj(p, "peces");
  const nPeces = Math.min(3, num(peces, "n", txt(peces, "imagen") ? 2 : 0));
  const flota = ef.has("flotar") ? Math.sin(f / 12) * 8 : 0;
  const entra = spring({ frame: f, fps: FPS, config: { damping: 16, stiffness: 120, mass: 0.8 } });
  const texto = txt(p, "texto");
  const etiqueta = txt(p, "etiqueta");
  const pe = usePop(b1);
  const fuerza = 0.3 + 0.15 * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (f - b0) / 30))));
  return (
    <AbsoluteFill style={{ transform: `translateY(${flota + (1 - entra) * 80}px)`, opacity: Math.min(1, entra * 1.6) }}>
      <ImagenCard src={txt(p, "imagen")} {...R} agua={ef.has("agua")} zoom={0.08} sombra>
        {ef.has("causticas") && <Causticas opacidad={fuerza} />}
        {ef.has("estrellas") && <Estrellas w={R.w} h={R.h * 0.55} n={46} />}
        {ef.has("haz") && <HazFaro x={R.w * (haz[0] ?? 0.3)} y={R.h * (haz[1] ?? 0.3)} largo={R.w} />}
        {ef.has("rayos") && <Rayos w={R.w} h={R.h} />}
        {ef.has("burbujas") && <Burbujas w={R.w} h={R.h} n={22} />}
        {nPeces > 0 &&
          Array.from({ length: nPeces }).map((_, k) => {
            const rutas: [number, number][][] = [
              [[-100, R.h * 0.92], [R.w * 0.25, R.h * 0.55], [R.w * 0.62, R.h * 0.82], [R.w + 110, R.h * 0.3]],
              [[R.w + 100, R.h * 0.62], [R.w * 0.75, R.h * 0.18], [R.w * 0.3, R.h * 0.42], [-110, R.h * 0.12]],
              [[R.w * 0.45, R.h + 120], [R.w * 0.5, R.h * 0.7], [R.w * 0.2, R.h * 0.4], [R.w * 0.1, -120]],
            ];
            return <Koi key={k} src={txt(peces, "imagen")} desde={b0 - 4 + k * 10} dur={120 + k * 10} p={rutas[k]} tam={R.h * (0.34 - k * 0.06)} espejo={k === 1} />;
          })}
        {(ef.has("agua") || nPeces > 0) && <Ondulaciones desde={b1} x={R.w * 0.52} y={R.h * 0.5} n={4} separacion={7} tam={340} />}
        {ef.has("cine") && <Cine desde={b0} w={R.w} h={R.h} banda={0.11} />}
        {ef.has("cine") && texto && <SubtituloCine texto={texto} desde={b1} bottom={R.h * 0.11 + 18} />}
        {etiqueta && (
          <div style={{ position: "absolute", left: 26, top: 26, transform: `scale(${usePopLocal(f, 2)})` }}>
            <Pildora fondo={C.tarjeta} color={C.tarjetaTexto} tam={28}>
              {etiqueta}
            </Pildora>
          </div>
        )}
      </ImagenCard>
      {ef.has("cine") && (
        <div style={{ position: "absolute", left: R.x + 40, top: R.y + R.h + 26, opacity: lerp(f, b0 + 4, b0 + 12, 0, 1) }}>
          <div style={{ background: C.oscuro, borderRadius: 22, padding: "14px 24px", boxShadow: "0 10px 24px rgba(0,0,0,0.2)" }}>
            <BarraVideo w={R.w - 160} desde={b0} />
          </div>
        </div>
      )}
      {!ef.has("cine") && texto && pe > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: R.y + R.h - 30, display: "flex", justifyContent: "center", transform: `scale(${pe}) rotate(-2deg)` }}>
          <Pildora fondo={C.acento} color={C.acentoTexto} tam={36}>
            {texto}
          </Pildora>
        </div>
      )}
    </AbsoluteFill>
  );
};

const usePopLocal = (f: number, desde: number) => (f < desde ? 0 : spring({ frame: f - desde, fps: FPS, config: { damping: 11, stiffness: 220, mass: 0.5 } }));

export const imagen: DefEscena = { C: Imagen };

// ================================================================== galeria
const Galeria: React.FC<PropsEscena> = ({ p, b }) => {
  const f = useCurrentFrame();
  const [b0, b1] = b;
  const imagenes = arr<string>(p, "imagenes").slice(0, 6);
  const modo = txt(p, "modo", "abanico");
  const n = imagenes.length;
  const etiqueta = txt(p, "etiqueta");
  const pe = usePop(b1);
  if (modo === "orbita") {
    const tile = usePopLocal(f, b0);
    const orbita = spring({ frame: f - b0 - 2, fps: FPS, config: { damping: 18, stiffness: 90, mass: 0.9 } });
    const brillo = interpolate(f, [b1, b1 + 6, b1 + 26], [0, 1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const cx = 540,
      cy = 600;
    return (
      <AbsoluteFill>
        {imagenes.map((src, k) => {
          const ang = (k / n) * Math.PI * 2 + f / 40;
          const z = Math.sin(ang);
          return (
            <Marco key={k} src={src} w={210} style={{ left: cx + Math.cos(ang) * 340 * orbita - 105, top: cy + Math.sin(ang) * 230 * orbita - 70, transform: `scale(${0.82 + (0.18 * (z + 1)) / 2})`, zIndex: z > 0 ? 3 : 1, opacity: orbita }} />
          );
        })}
        <div style={{ position: "absolute", left: cx - 120, top: cy - 120, transform: `scale(${tile})`, zIndex: 2 }}>
          <Baldosa size={240} icono={txt(p, "centro") || undefined} brillo={brillo} />
        </div>
        <Onda desde={b1} x={cx} y={cy} r0={130} r1={420} />
        {pe > 0 && etiqueta && (
          <div style={{ position: "absolute", left: 0, right: 0, top: cy + 300, display: "flex", justifyContent: "center", transform: `scale(${pe})`, zIndex: 4 }}>
            <Pildora tam={32} mono>
              {etiqueta}
            </Pildora>
          </div>
        )}
      </AbsoluteFill>
    );
  }
  if (modo === "rejilla") {
    const cols = n <= 4 ? 2 : 3;
    const w = cols === 2 ? 400 : 270;
    const h = (w * 2) / 3;
    const filas = Math.ceil(n / cols);
    const x0 = 540 - (cols * w + (cols - 1) * 30) / 2;
    const y0 = 640 - (filas * h + (filas - 1) * 30) / 2;
    return (
      <AbsoluteFill>
        {imagenes.map((src, k) => {
          const t = b0 + k * 4;
          const q = spring({ frame: f - t, fps: FPS, config: { damping: 13, stiffness: 160, mass: 0.6 } });
          if (f < t) return null;
          const resalta = k === num(p, "destacar", -1) && f >= b1;
          return <Marco key={k} src={src} w={w} style={{ left: x0 + (k % cols) * (w + 30), top: y0 + Math.floor(k / cols) * (h + 30), transform: `scale(${(0.6 + 0.4 * q) * (resalta ? 1.12 : 1)})`, opacity: Math.min(1, q * 2), zIndex: resalta ? 3 : 1, outline: resalta ? `8px solid ${C.acento}` : undefined }} />;
        })}
      </AbsoluteFill>
    );
  }
  // abanico: entran apiladas y se abren en `b1`
  const abre = spring({ frame: f - b1 + 4, fps: FPS, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const entra = spring({ frame: f - b0, fps: FPS, config: { damping: 15, stiffness: 150, mass: 0.7 } });
  const w = n <= 3 ? 330 : 300;
  return (
    <AbsoluteFill>
      {imagenes.map((src, k) => {
        const pos = (k - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
        const x = 540 + pos * (n <= 3 ? 260 : 330) * abre;
        const y = 668 + Math.abs(pos) * 44 * abre + (1 - entra) * 260;
        const r = (k - (n - 1) / 2) * 3 * (1 - abre) + pos * 18 * abre;
        const flo = Math.sin(f / 14 + k * 1.3) * 5 * abre;
        return <Marco key={k} src={src} w={w} style={{ left: x - w / 2, top: y - w / 3 + flo, transform: `rotate(${r}deg) scale(${0.85 + 0.15 * entra})`, opacity: Math.min(1, entra * 2), zIndex: Math.round(10 - Math.abs(pos) * 5) }} />;
      })}
      {pe > 0 && etiqueta && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 900, display: "flex", justifyContent: "center", transform: `scale(${pe})`, zIndex: 20 }}>
          <Pildora fondo={C.acento} color={C.acentoTexto} tam={34}>
            {etiqueta}
          </Pildora>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Imagen con marco blanco (3:2). */
export const Marco: React.FC<{ src: string; w: number; style?: React.CSSProperties }> = ({ src, w, style }) => (
  <div style={{ position: "absolute", width: w, height: (w * 2) / 3, borderRadius: w * 0.08, overflow: "hidden", boxShadow: SOMBRA, border: BORDE === "none" ? `5px solid ${C.tarjeta}` : BORDE, background: C.oscuro, ...style }}>
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </div>
);

export const galeria: DefEscena = { C: Galeria };
