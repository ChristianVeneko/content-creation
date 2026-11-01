// Scene transitions of the art-style looks. Frame-pure: driven only by presentationProgress (0..1, linear timing).
// The cut point is progress 0.5, where the look's cut SFX beat lands (lib/illustrated.mjs computeBeats, LOOK_SFX).
import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import type { TransitionPresentationComponentProps } from "@remotion/transitions";
import { seeded } from "../util";
import type { ArtLookId } from "./looks";
import { burstPoints } from "./artstyles";

export type ArtP = { look: string; seed: number; bg: string };
type TP = TransitionPresentationComponentProps<ArtP>;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const W = 1080;
const H = 1920;

const svgImage = (inner: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>${inner}</svg>`)}")`;

/** Watercolor: the new painting soaks through the paper in soft blooms that open one after another and merge. */
const WashDissolve: React.FC<TP> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  if (presentationDirection === "exiting") {
    const q = interpolate(presentationProgress, [0.3, 1], [0, 1], clamp);
    return <AbsoluteFill style={{ filter: `blur(${q * 5}px) saturate(${1 - q * 0.4})` }}>{children}</AbsoluteFill>;
  }
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.45, 0, 0.55, 1) });
  if (q >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  // 14 blooms at seeded spots in the scene band, each opening at its own time with a soft wet edge
  const layers = Array.from({ length: 14 }, (_, k) => {
    const x = 60 + seeded(passedProps.seed * 31 + k) * 960;
    const y = 380 + seeded(passedProps.seed * 17 + k * 3) * 900;
    const start = (k / 14) * 0.55;
    const r = interpolate(q, [start, start + 0.45], [0, 520 + seeded(k * 7) * 260], { ...clamp, easing: Easing.out(Easing.quad) });
    return `radial-gradient(circle at ${x.toFixed(0)}px ${y.toFixed(0)}px, black ${Math.max(0, r - 70).toFixed(0)}px, transparent ${r.toFixed(0)}px)`;
  }).join(", ");
  return <AbsoluteFill style={{ maskImage: layers, WebkitMaskImage: layers }}>{children}</AbsoluteFill>;
};

/** Torn top edge as a clip-path polygon (percent of the box height). */
const tornTop = (seed: number, y: number) => {
  const pts: string[] = [];
  for (let k = 0; k <= 30; k++) pts.push(`${(k / 30) * 100}% ${y + (seeded(seed * 17 + k) - 0.5) * 22}px`);
  return `polygon(${pts.join(", ")}, 100% 100%, 0 100%)`;
};

/** Paper collage: a new sheet is slid up over the old one in stop-motion steps (12 fps), torn edge first. */
const PaperSlide: React.FC<TP> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  // quantize to 8 poses over the transition: stop-motion, not a smooth tween
  const qs = Math.floor(presentationProgress * 8) / 8;
  const q = interpolate(qs, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ transform: `translateY(${q * 60}px) rotate(${q * -1.5}deg)`, filter: `brightness(${1 - q * 0.35})` }}>{children}</AbsoluteFill>;
  }
  if (q >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const top = (1 - q) * (H + 60);
  const rot = (1 - q) * 4;
  return (
    <AbsoluteFill style={{ transform: `rotate(${rot}deg)`, transformOrigin: "50% 100%" }}>
      {/* the sheet's shadow on the old scene */}
      <AbsoluteFill style={{ clipPath: tornTop(passedProps.seed, Math.max(0, top - 30)), background: "rgba(40, 24, 10, 0.3)", filter: "blur(10px)" }} />
      <AbsoluteFill style={{ clipPath: tornTop(passedProps.seed, top) }}>
        <AbsoluteFill style={{ background: passedProps.bg }} />
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Chalkboard: a felt eraser smudge sweeps diagonally; the old lesson smears away and the new one is behind it. */
const SmudgeWipe: React.FC<TP> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.5, 1) });
  // the front runs from top-left to bottom-right along a 20 degree diagonal
  const front = -500 + q * (H + 1000);
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ filter: `blur(${Math.sin(q * Math.PI) * 4}px)`, opacity: interpolate(q, [0.4, 1], [1, 0.4], clamp) }}>{children}</AbsoluteFill>;
  }
  if (q >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const clip = `polygon(0 0, 100% 0, 100% ${front - 380}px, 0 ${front}px)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>
        <AbsoluteFill style={{ background: passedProps.bg }} />
        {children}
      </AbsoluteFill>
      {/* the smear band riding the front: chalk dust dragged by the felt */}
      <div
        style={{
          position: "absolute",
          left: -200,
          width: W + 400,
          top: front - 190 - 120,
          height: 240,
          transform: "rotate(-19.4deg)",
          background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 5px, rgba(255,255,255,0.02) 5px 13px)",
          filter: "blur(9px)",
          opacity: Math.sin(q * Math.PI),
        }}
      />
    </AbsoluteFill>
  );
};

/** Risograph: the new print arrives as halftone dots that swell diagonally until they merge into solid ink. */
const HalftoneWipe: React.FC<TP> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.45, 0, 0.55, 1) });
  if (presentationDirection === "exiting") {
    // the old plate slips off register as the drum rolls
    return <AbsoluteFill style={{ transform: `translate(${q * 18}px, ${q * 8}px)`, opacity: interpolate(q, [0.6, 1], [1, 0], clamp) }}>{children}</AbsoluteFill>;
  }
  if (q >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const cell = 40;
  const id = `ht-${passedProps.seed}`;
  const dots: React.ReactNode[] = [];
  for (let y = 0; y <= H / cell; y++) {
    for (let x = 0; x <= W / cell; x++) {
      const diag = (x / (W / cell) + y / (H / cell)) / 2; // 0 top-left .. 1 bottom-right
      const r = interpolate(q * 1.6 - diag * 0.6, [0, 1], [0, cell * 0.74], clamp);
      if (r > 0.5) dots.push(<circle key={`${x}-${y}`} cx={x * cell + cell / 2} cy={y * cell + cell / 2} r={r} />);
    }
  }
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            {dots}
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{ clipPath: `url(#${id})` }}>
        <AbsoluteFill style={{ background: passedProps.bg }} />
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Ukiyo-e: a sumi ink blot floods the print, then thins into the paper and the next print shows through. */
const InkBleed: React.FC<TP> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") return <AbsoluteFill style={{ opacity: p < 0.5 ? 1 : 0 }}>{children}</AbsoluteFill>;
  const grow = interpolate(p, [0, 0.5], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const fade = interpolate(p, [0.5, 1], [1, 0], { ...clamp, easing: Easing.bezier(0.4, 0, 0.6, 1) });
  // the blot never fills the band: its displaced edge stays on screen, like ink spreading on wet paper
  const r = 40 + grow * 760 + (1 - fade) * 160;
  const cx = 300 + (passedProps.seed % 3) * 240;
  const blot = svgImage(
    `<filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feTurbulence type='fractalNoise' baseFrequency='0.008' numOctaves='3' seed='${passedProps.seed * 5}'/><feDisplacementMap in='SourceGraphic' scale='260' xChannelSelector='R' yChannelSelector='G'/></filter>` +
      `<g filter='url(#b)'><circle cx='${cx}' cy='980' r='${r}' fill='#141414'/><circle cx='${cx + 220}' cy='720' r='${r * 0.55}' fill='#141414'/><circle cx='${cx - 160}' cy='1180' r='${r * 0.4}' fill='#141414'/></g>`,
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: p >= 0.5 ? 1 : 0 }}>{children}</AbsoluteFill>
      {p > 0 && p < 1 ? <AbsoluteFill style={{ backgroundImage: blot, backgroundSize: "100% 100%", opacity: p < 0.5 ? 1 : fade, filter: p < 0.5 ? undefined : `blur(${(1 - fade) * 10}px)` }} /> : null}
    </AbsoluteFill>
  );
};

/** Pop comic: the next panel slams in on a diagonal with speed lines; the old panel is shoved out of frame. */
const PanelSlam: React.FC<TP> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") {
    const q = interpolate(p, [0.35, 0.6], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
    return <AbsoluteFill style={{ transform: `translate(${-q * 260}px, ${q * 140}px) rotate(${-q * 4}deg) scale(${1 - q * 0.08})`, filter: `brightness(${1 - q * 0.5})` }}>{children}</AbsoluteFill>;
  }
  const q = interpolate(p, [0.2, 0.5], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const settle = interpolate(p, [0.5, 0.62, 0.75], [0, 1, 0], clamp);
  if (p >= 0.8) return <AbsoluteFill>{children}</AbsoluteFill>;
  const dir = passedProps.seed % 2 ? 1 : -1;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: q > 0 ? 1 : 0,
          transform: `translate(${(1 - q) * 900 * dir}px, ${(1 - q) * -700}px) rotate(${(1 - q) * 8 * dir + settle * -1.2 * dir}deg) scale(${1 + settle * 0.03})`,
          boxShadow: "0 0 0 14px #111111",
        }}
      >
        <AbsoluteFill style={{ background: passedProps.bg }} />
        {children}
      </AbsoluteFill>
      {q > 0 && q < 1 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 16 }, (_, k) => {
            const y = 120 + seeded(k * 3 + passedProps.seed) * 1680;
            const len = 300 + seeded(k * 7) * 500;
            const x = dir > 0 ? W - len * q : 0;
            return <line key={k} x1={x} y1={y} x2={x + len} y2={y} stroke="#111111" strokeWidth={6 + (k % 3) * 3} opacity={0.75} />;
          })}
        </svg>
      ) : null}
      {settle > 0 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: settle }}>
          <polygon points={burstPoints(W, H, 18, passedProps.seed, 0.88)} fill="none" stroke="#111111" strokeWidth={10} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export const ART_TRANSITIONS: Record<ArtLookId, React.FC<TP>> = {
  watercolor: WashDissolve,
  "paper-collage": PaperSlide,
  chalkboard: SmudgeWipe,
  risograph: HalftoneWipe,
  "ukiyo-e": InkBleed,
  "pop-comic": PanelSlam,
};
