// Ilustraciones animadas con código: agua que se mueve de verdad, peces que nadan, haz del faro,
// estrellas, burbujas y modo cine. Las imágenes son fijas; todo el movimiento lo pone el código.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, SOMBRA } from "../motor/actual";
import { F } from "../motor/estilos";
import { lerp, rnd } from "../motor/anim";

/** Tarjeta con una imagen que se acerca despacio (Ken Burns) y capas de efectos encima. */
export const ImagenCard: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  zoom?: number;
  origen?: string;
  transform?: string;
  opacity?: number;
  agua?: boolean;
  sombra?: boolean;
  children?: React.ReactNode;
}> = ({ src, x, y, w, h, r = 30, zoom = 0.06, origen = "50% 50%", transform, opacity = 1, agua = false, sombra = true, children }) => {
  const f = useCurrentFrame();
  const id = React.useId().replace(/:/g, "");
  const kb = 1 + zoom * Math.min(1, f / 150);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        overflow: "hidden",
        boxShadow: sombra ? SOMBRA : undefined,
        transform,
        opacity,
        background: C.oscuro,
      }}
    >
      {agua && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={`agua-${id}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency={`${0.009 + 0.0016 * Math.sin(f / 23)} ${0.024 + 0.004 * Math.cos(f / 19)}`} numOctaves={2} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={16 + 4 * Math.sin(f / 11)} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      <div style={{ position: "absolute", inset: agua ? -14 : 0, filter: agua ? `url(#agua-${id})` : undefined }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kb})`, transformOrigin: origen }} />
      </div>
      {children}
    </div>
  );
};

/** Reflejos de luz del fondo del agua (textura en mosaico que se desplaza en dos capas). */
export const Causticas: React.FC<{ opacidad?: number }> = ({ opacidad = 0.32 }) => {
  const f = useCurrentFrame();
  const capa = (dx: number, dy: number, tam: number, o: number): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backgroundImage: `url(${staticFile("reels/textures/caustics.png")})`,
    backgroundSize: `${tam}px ${tam}px`,
    backgroundPosition: `${f * dx}px ${f * dy}px`,
    mixBlendMode: "screen",
    opacity: o,
  });
  return (
    <>
      <div style={capa(0.9, 0.5, 420, opacidad)} />
      <div style={capa(-0.6, 0.8, 560, opacidad * 0.7)} />
    </>
  );
};

/** Pez koi que nada por una curva (de p0 a p3) con la cola moviéndose. La imagen mira hacia arriba. */
export const Koi: React.FC<{
  src?: string;
  desde: number;
  dur: number;
  p: [number, number][];
  tam: number;
  espejo?: boolean;
}> = ({ src = "imagenes/pez.png", desde, dur, p, tam, espejo = false }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [desde, desde + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  if (f < desde - 2) return null;
  const [a, b, c, d] = p;
  const bez = (k: number) => {
    const u = 1 - k;
    return [
      u * u * u * a[0] + 3 * u * u * k * b[0] + 3 * u * k * k * c[0] + k * k * k * d[0],
      u * u * u * a[1] + 3 * u * u * k * b[1] + 3 * u * k * k * c[1] + k * k * k * d[1],
    ];
  };
  const [x, y] = bez(t);
  const [x2, y2] = bez(Math.min(1, t + 0.01));
  const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI + 90;
  const cola = Math.sin(f / 3.2) * 6;
  const op = interpolate(f, [desde - 2, desde + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x - tam / 2,
        top: y - tam / 2,
        width: tam,
        height: tam,
        transform: `rotate(${ang}deg) skewX(${cola}deg) scaleX(${espejo ? -1 : 1})`,
        opacity: op,
        filter: "drop-shadow(10px 18px 8px rgba(0, 40, 60, 0.35))",
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

/** Ondas en el agua que se abren desde un punto. */
export const Ondulaciones: React.FC<{ desde: number; x: number; y: number; n?: number; separacion?: number; tam?: number }> = ({ desde, x, y, n = 3, separacion = 8, tam = 260 }) => {
  const f = useCurrentFrame();
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      {Array.from({ length: n }).map((_, k) => {
        const t = (f - desde - k * separacion) / 34;
        if (t < 0 || t > 1) return null;
        const r = tam * Easing.out(Easing.quad)(t);
        return <ellipse key={k} cx={x} cy={y} rx={r} ry={r * 0.62} fill="none" stroke="white" strokeWidth={5 * (1 - t) + 1} opacity={0.75 * (1 - t)} />;
      })}
    </svg>
  );
};

/** Haz de luz del faro que barre de lado a lado. (x,y) = linterna, en píxeles de la tarjeta. */
export const HazFaro: React.FC<{ x: number; y: number; largo?: number }> = ({ x, y, largo = 900 }) => {
  const f = useCurrentFrame();
  const ang = Math.sin(f / 22) * 38;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, transform: `rotate(${ang}deg)` }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -largo * 0.09,
          width: largo,
          height: largo * 0.18,
          background: "linear-gradient(90deg, rgba(255,236,170,0.75), rgba(255,236,170,0))",
          clipPath: "polygon(0 46%, 100% 0, 100% 100%, 0 54%)",
          mixBlendMode: "screen",
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -largo,
          top: -largo * 0.09,
          width: largo,
          height: largo * 0.18,
          background: "linear-gradient(270deg, rgba(255,236,170,0.45), rgba(255,236,170,0))",
          clipPath: "polygon(0 0, 100% 46%, 100% 54%, 0 100%)",
          mixBlendMode: "screen",
          filter: "blur(6px)",
        }}
      />
      <div style={{ position: "absolute", left: -26, top: -26, width: 52, height: 52, borderRadius: 26, background: "radial-gradient(circle, rgba(255,245,200,0.95), rgba(255,220,120,0))" }} />
    </div>
  );
};

/** Estrellas que titilan en una franja (en píxeles de la tarjeta). */
export const Estrellas: React.FC<{ w: number; h: number; n?: number; semilla?: number }> = ({ w, h, n = 40, semilla = 1 }) => {
  const f = useCurrentFrame();
  return (
    <svg style={{ position: "absolute", left: 0, top: 0 }} width={w} height={h}>
      {Array.from({ length: n }).map((_, k) => {
        const x = rnd(semilla * 100 + k) * w;
        const y = rnd(semilla * 200 + k) * h;
        const r = 1.2 + rnd(k + 7) * 2.6;
        const o = 0.35 + 0.65 * Math.abs(Math.sin(f / (6 + rnd(k) * 10) + k));
        return <circle key={k} cx={x} cy={y} r={r} fill="#FFF6D8" opacity={o} />;
      })}
    </svg>
  );
};

/** Burbujas que suben. */
export const Burbujas: React.FC<{ w: number; h: number; n?: number; desde?: number; semilla?: number }> = ({ w, h, n = 18, desde = 0, semilla = 3 }) => {
  const f = useCurrentFrame();
  return (
    <svg style={{ position: "absolute", left: 0, top: 0 }} width={w} height={h}>
      {Array.from({ length: n }).map((_, k) => {
        const vel = 2.2 + rnd(semilla + k) * 3.5;
        const x0 = rnd(semilla * 9 + k) * w;
        const e = f - desde + rnd(k + 11) * 120;
        if (e < 0) return null;
        const y = h + 20 - ((e * vel) % (h + 60));
        const x = x0 + Math.sin(e / 9 + k) * 10;
        const r = 4 + rnd(k + 3) * 10;
        return <circle key={k} cx={x} cy={y} r={r} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth={2} />;
      })}
    </svg>
  );
};

/** Rayos de luz que bajan desde arriba (fondo marino). */
export const Rayos: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", mixBlendMode: "screen" }}>
      {[0, 1, 2, 3].map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: w * (0.12 + k * 0.24) + Math.sin(f / 30 + k) * 30,
            top: -h * 0.1,
            width: w * 0.09,
            height: h * 1.2,
            background: "linear-gradient(180deg, rgba(190,230,255,0.45), rgba(190,230,255,0))",
            transform: `rotate(${12 + k * 3}deg)`,
            filter: "blur(10px)",
            opacity: 0.5 + 0.3 * Math.sin(f / 17 + k * 2),
          }}
        />
      ))}
    </div>
  );
};

/** Modo cine: bandas negras que entran, grano, viñeta y un leve parpadeo. */
export const Cine: React.FC<{ desde: number; w: number; h: number; banda?: number }> = ({ desde, w, h, banda = 0.12 }) => {
  const f = useCurrentFrame();
  const id = React.useId().replace(/:/g, "");
  const p = lerp(f, desde, desde + 9, 0, 1);
  const b = h * banda * p;
  return (
    <AbsoluteFill>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.28 }}>
        <filter id={`grano-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={f % 50} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={w} height={h} filter={`url(#grano-${id})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)", opacity: 0.5 + 0.5 * p }} />
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: 0.04 * Math.abs(Math.sin(f * 1.7)) }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: b, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: b, background: "#000" }} />
    </AbsoluteFill>
  );
};

/** Subtítulo de película dentro de la tarjeta de cine. */
export const SubtituloCine: React.FC<{ texto: string; desde: number; bottom: number }> = ({ texto, desde, bottom }) => {
  const f = useCurrentFrame();
  const o = lerp(f, desde, desde + 6, 0, 1);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, textAlign: "center", fontFamily: F.mano, fontWeight: 700, fontSize: 40, color: "#FFF4DE", opacity: o, textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
      {texto}
    </div>
  );
};

/** Barra de reproducción de vídeo (para el corto). */
export const BarraVideo: React.FC<{ w: number; desde: number; total?: string }> = ({ w, desde, total = "1:30" }) => {
  const f = useCurrentFrame();
  const p = Math.max(0, (f - desde) / 300);
  const s = Math.floor(12 + p * 30);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, width: w, fontFamily: F.mono, fontSize: 22, color: "#FFF4DE" }}>
      <svg viewBox="0 0 20 20" width={22} height={22}>
        <path d="M5 3 L17 10 L5 17 Z" fill="#FFF4DE" />
      </svg>
      <span>0:{String(s).padStart(2, "0")}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.3)" }}>
        <div style={{ width: `${Math.min(100, 14 + p * 40)}%`, height: "100%", borderRadius: 3, background: C.acento }} />
      </div>
      <span>{total}</span>
    </div>
  );
};
