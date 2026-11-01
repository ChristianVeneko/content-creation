// Media of the art-style looks: watercolor, paper collage, chalkboard, risograph, ukiyo-e and pop comic.
// Each look owns its paper/board/print background, texture filters, panel skin, headline, HUD skin and cut effect.
// Everything is frame-pure and procedural (SVG turbulence/displacement filters, CSS gradients): no texture files.
// Ideas (grammar only, nothing copied): Lemo-Opuscar styles (MIT), p5.brush watercolor fills (MIT), collage B-roll
// (MIT); see 00-docs/template-styles.md for references and licenses.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { REGIONS } from "../../lib/illustrated.mjs";
import type { ResolvedSpec } from "../types";
import { inkOn, rgba, seeded } from "../util";
import { RoughShape, progress, useKit, type Ink } from "./kit";
import type { ArtLookId, Look, LookId } from "./looks";
import { fitText } from "./headlines";

export const ART_LOOK_IDS: ArtLookId[] = ["watercolor", "paper-collage", "chalkboard", "risograph", "ukiyo-e", "pop-comic"];
export const isArtLook = (id: LookId): id is ArtLookId => (ART_LOOK_IDS as string[]).includes(id);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** An SVG drawing as a CSS url() (stretched to the element box). */
export const svgUri = (inner: string, w = 400, h = 300) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${inner}</svg>`)}")`;

/** Fractal paper grain tile as a CSS url() (alpha = op). */
const grainUri = (freq: number, op: number, tint = "0 0 0") =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${tint.split(" ")[0]}  0 0 0 0 ${tint.split(" ")[1]}  0 0 0 0 ${tint.split(" ")[2]}  0 0 0 ${op} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;

/** Torn paper outline in a 400 x 300 box (deterministic jagged edges). */
const tornPoints = (seed: number, inset = 10, w = 400, h = 300) => {
  const pts: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, n: number, k: number) => {
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const j = (seeded(seed * 31 + k * 97 + i) - 0.5) * 9;
      const nx = y1 - y0 ? Math.sign(y1 - y0) : 0;
      const ny = x1 - x0 ? -Math.sign(x1 - x0) : 0;
      pts.push(`${(x0 + (x1 - x0) * u + nx * j).toFixed(1)},${(y0 + (y1 - y0) * u + ny * j).toFixed(1)}`);
    }
  };
  edge(inset, inset, w - inset, inset, 26, 1);
  edge(w - inset, inset, w - inset, h - inset, 20, 2);
  edge(w - inset, h - inset, inset, h - inset, 26, 3);
  edge(inset, h - inset, inset, inset, 20, 4);
  return pts.join(" ");
};

/** Watercolor wash: a displaced translucent fill with a darker pooled edge, plus a second glaze. */
export const washUri = (color: string, seed: number, alpha = 0.24) =>
  svgUri(
    `<filter id='w' x='-10%' y='-10%' width='120%' height='120%'><feTurbulence type='fractalNoise' baseFrequency='0.03' numOctaves='3' seed='${seed}'/><feDisplacementMap in='SourceGraphic' scale='26' xChannelSelector='R' yChannelSelector='G'/></filter>` +
      `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='2' seed='${seed + 7}'/><feDisplacementMap in='SourceGraphic' scale='34' xChannelSelector='G' yChannelSelector='R'/></filter>` +
      `<g filter='url(#w)'><rect x='20' y='18' width='360' height='262' rx='46' fill='${color}' fill-opacity='${alpha}'/><rect x='20' y='18' width='360' height='262' rx='46' fill='none' stroke='${color}' stroke-opacity='${alpha * 1.5}' stroke-width='4'/></g>` +
      `<rect filter='url(#g)' x='60' y='40' width='250' height='170' rx='60' fill='${color}' fill-opacity='${alpha * 0.45}'/>`,
  );

/** Torn paper scrap with its own soft shadow (shadows survive because no clip-path is used). */
export const scrapUri = (fill: string, seed: number) =>
  svgUri(
    `<filter id='s' x='-10%' y='-10%' width='130%' height='130%'><feGaussianBlur stdDeviation='5'/></filter>` +
      `<polygon points='${tornPoints(seed, 12)}' fill='rgba(40,24,10,0.35)' transform='translate(5 8)' filter='url(#s)'/>` +
      `<polygon points='${tornPoints(seed, 12)}' fill='${fill}'/>`,
  );

/* ================================================================ panels ================================================================ */

/** Card-like surface of an art look (kit.panelStyle delegates here). */
export const artPanel = (ink: Ink, accent: string | undefined, seed = 1): React.CSSProperties => {
  const L = ink.look;
  const a = accent ?? ink.accent3;
  switch (L.id) {
    case "watercolor":
      return { position: "absolute", background: `${washUri(a, seed)} center / 100% 100% no-repeat` };
    case "paper-collage":
      return { position: "absolute", background: `${scrapUri(ink.paper, seed)} center / 100% 100% no-repeat`, transform: `rotate(${(seeded(seed * 5) - 0.5) * 2.4}deg)` };
    case "risograph":
      // a flat spot-ink field with a halftone tint and a misregistered second plate
      return {
        position: "absolute",
        background: `radial-gradient(${rgba(a, 0.35)} 32%, transparent 34%) 0 0 / 14px 14px, ${rgba(a, 0.14)}`,
        boxShadow: `9px 7px 0 ${rgba("#FF48B0", 0.32)}`,
        mixBlendMode: "multiply",
      };
    case "ukiyo-e":
      // a printed cartouche: thin double key-block border on washi
      return { position: "absolute", borderRadius: 2, background: ink.surface2, border: `3px solid ${ink.text}`, outline: `1.5px solid ${ink.text}`, outlineOffset: -11 };
    case "pop-comic":
      return {
        position: "absolute",
        borderRadius: 0,
        background: `radial-gradient(${rgba(a, 0.22)} 26%, transparent 28%) 0 0 / 18px 18px, #FFFFFF`,
        border: "7px solid #111111",
        boxShadow: "12px 12px 0 #111111",
      };
    default:
      return { position: "absolute", borderRadius: L.panel.radius, background: ink.surface2 };
  }
};

/* ============================================================== textures ============================================================== */

/** SVG filters the art looks apply to whole scenes (referenced as CSS filter: url(#id)). Rendered once, behind the scenes. */
export const ArtDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      {/* chalk: speckled alpha (dust gaps in every stroke) + a slight grainy wobble */}
      <filter id="art-chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.75" result="m" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feComposite in="d" in2="m" operator="in" />
      </filter>
      {/* risograph: a pink plate printed a few px off register under the blue key plate, plus ink grain */}
      <filter id="art-riso" x="-5%" y="-5%" width="110%" height="110%">
        <feOffset in="SourceAlpha" dx="5" dy="3" result="o" />
        <feFlood floodColor="#FF48B0" floodOpacity="0.55" result="pink" />
        <feComposite in="pink" in2="o" operator="in" result="plate" />
        <feBlend in="SourceGraphic" in2="plate" mode="multiply" result="b" />
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="g" />
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.4 1.5" result="ga" />
        <feComposite in="b" in2="ga" operator="in" />
      </filter>
      {/* ukiyo-e: printed blocks soak into the washi (soft grain in every solid) */}
      <filter id="art-print" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="2" result="g" />
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.9 1.3" result="ga" />
        <feComposite in="SourceGraphic" in2="ga" operator="in" />
      </filter>
    </defs>
  </svg>
);

/** CSS filter of a scene in an art look (texture of the medium on every stroke), or undefined. */
export const artSceneFilter = (id: LookId): string | undefined => {
  if (id === "chalkboard") return "url(#art-chalk)";
  if (id === "risograph") return "url(#art-riso)";
  if (id === "ukiyo-e") return "url(#art-print)";
  return undefined;
};

/* ============================================================= backgrounds ============================================================= */

export const ArtBackground: React.FC<{ spec: ResolvedSpec; look: Look; ink: Ink }> = ({ look, ink }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  switch (look.id) {
    case "watercolor": {
      // Cold-press cotton paper, three slow-breathing pigment blooms and a few splatters; deckled edges.
      const blooms = [
        { x: 120, y: 330, r: 360, c: ink.accent },
        { x: 960, y: 900, r: 420, c: ink.accent2 },
        { x: 260, y: 1520, r: 380, c: ink.accent3 },
      ];
      const dots = Array.from({ length: 18 }, (_, i) => ({ x: seeded(i * 7 + 3) * width, y: 260 + seeded(i * 11 + 1) * (height - 520), r: 3 + seeded(i * 5) * 9, c: [ink.accent, ink.accent2, ink.accent3][i % 3] }));
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 110% 80% at 50% 45%, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <ArtDefs />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id="wc-bloom" x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" />
                <feDisplacementMap in="SourceGraphic" scale="120" xChannelSelector="R" yChannelSelector="G" result="d" />
                <feGaussianBlur in="d" stdDeviation="6" />
              </filter>
            </defs>
            {blooms.map((b, i) => (
              <g key={i} filter="url(#wc-bloom)">
                <circle cx={b.x} cy={b.y} r={b.r * (1 + 0.025 * Math.sin(t * 0.6 + i * 2))} fill={b.c} opacity={0.13} />
                <circle cx={b.x} cy={b.y} r={b.r * 0.96} fill="none" stroke={b.c} strokeWidth={10} opacity={0.08} />
              </g>
            ))}
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={0.22} />
            ))}
          </svg>
          <AbsoluteFill style={{ backgroundImage: grainUri(0.55, 0.16, "0.35 0.3 0.25") }} />
          <AbsoluteFill style={{ boxShadow: "inset 0 0 140px rgba(120, 96, 60, 0.22)" }} />
        </AbsoluteFill>
      );
    }
    case "paper-collage": {
      // Kraft cardboard with fibres; colored paper scraps and masking tape stuck around the edges, nudged at 12 fps.
      const k = Math.floor(t * 12);
      const scraps = [
        { x: -60, y: 180, w: 340, h: 200, r: -8, c: ink.accent },
        { x: 820, y: 120, w: 320, h: 180, r: 9, c: ink.accent3 },
        { x: 800, y: 1560, w: 360, h: 220, r: -6, c: ink.accent2 },
        { x: -80, y: 1620, w: 360, h: 200, r: 7, c: "#F4ECD8" },
      ];
      return (
        <AbsoluteFill style={{ background: `linear-gradient(170deg, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <ArtDefs />
          <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(90deg, ${rgba("#000000", 0.035)} 0 3px, transparent 3px 18px)` }} />
          <AbsoluteFill style={{ backgroundImage: grainUri(0.7, 0.22, "0.25 0.15 0.05") }} />
          {scraps.map((s, i) => (
            <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, background: `${scrapUri(s.c, i + 3)} center / 100% 100% no-repeat`, transform: `rotate(${s.r + (seeded(k * 3 + i) - 0.5) * 0.8}deg)` }} />
          ))}
          {[
            { x: 70, y: 150, r: -32 },
            { x: 870, y: 150, r: 28 },
          ].map((tp, i) => (
            <div key={`t${i}`} style={{ position: "absolute", left: tp.x, top: tp.y, width: 170, height: 46, background: "rgba(240, 228, 190, 0.78)", transform: `rotate(${tp.r}deg)`, boxShadow: "0 2px 4px rgba(0,0,0,0.15)", clipPath: "polygon(3% 0, 97% 6%, 100% 50%, 96% 100%, 2% 94%, 0 45%)" }} />
          ))}
          <AbsoluteFill style={{ boxShadow: "inset 0 0 120px rgba(60, 30, 5, 0.35)" }} />
        </AbsoluteFill>
      );
    }
    case "chalkboard": {
      // Deep green slate with slow mottling and faint eraser arcs, a wooden frame and its chalk tray.
      const arcs = Array.from({ length: 5 }, (_, i) => ({ x: seeded(i * 9 + 2) * width, y: 260 + seeded(i * 4 + 7) * (height - 600), w: 320 + seeded(i) * 300 }));
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 45%, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <ArtDefs />
          <AbsoluteFill style={{ backgroundImage: grainUri(0.018, 0.22, "0.85 0.95 0.9"), opacity: 0.5 }} />
          <AbsoluteFill style={{ backgroundImage: grainUri(0.9, 0.12, "1 1 1") }} />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id="cb-smear">
                <feGaussianBlur stdDeviation="14" />
              </filter>
            </defs>
            {arcs.map((a, i) => (
              <path key={i} d={`M ${a.x - a.w / 2} ${a.y} q ${a.w / 2} ${-90 - i * 10} ${a.w} 0`} stroke="#FFFFFF" strokeWidth={70} fill="none" opacity={0.045} filter="url(#cb-smear)" />
            ))}
          </svg>
          {/* wooden frame */}
          <AbsoluteFill style={{ boxShadow: "inset 0 0 0 26px #6B4A2B, inset 0 0 0 30px #4E351E, inset 0 0 80px rgba(0,0,0,0.55)" }} />
          <div style={{ position: "absolute", left: 26, right: 26, bottom: 26, height: 30, background: "linear-gradient(180deg, #8A6440, #5C3F22)", boxShadow: "0 -6px 12px rgba(0,0,0,0.35)" }} />
          <div style={{ position: "absolute", left: 640, bottom: 46, width: 90, height: 16, borderRadius: 6, background: "#F2F1EA", opacity: 0.92 }} />
          <div style={{ position: "absolute", left: 760, bottom: 46, width: 60, height: 16, borderRadius: 6, background: ink.accent, opacity: 0.9 }} />
        </AbsoluteFill>
      );
    }
    case "risograph": {
      // Off-white stock, a halftone sun in pink, a blue horizon band, feed streaks and pinholes. The paper never moves.
      return (
        <AbsoluteFill style={{ background: ink.bg }}>
          <ArtDefs />
          <div style={{ position: "absolute", left: 600, top: 120, width: 560, height: 560, borderRadius: "50%", background: `radial-gradient(${rgba(ink.accent, 0.55)} 34%, transparent 36%) 0 0 / 22px 22px`, mixBlendMode: "multiply", transform: `translate(${Math.sin(t * 0.4) * 4}px, 0)` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 1460, height: 460, background: `radial-gradient(${rgba(ink.accent3, 0.5)} 30%, transparent 32%) 0 0 / 18px 18px`, mixBlendMode: "multiply", maskImage: "linear-gradient(180deg, transparent 0%, black 35%)" }} />
          <div style={{ position: "absolute", left: -120, top: 1380, width: 640, height: 640, borderRadius: "50%", background: rgba(ink.accent2, 0.55), mixBlendMode: "multiply" }} />
          <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, ${rgba(ink.accent3, 0.035)} 0 2px, transparent 2px 23px)` }} />
          <AbsoluteFill style={{ backgroundImage: grainUri(0.8, 0.18, "0.1 0.1 0.25") }} />
        </AbsoluteFill>
      );
    }
    case "ukiyo-e": {
      // Washi with long fibres, a bokashi sky gradient, a seigaiha wave band, a double key-block border and a seal.
      const fibres = Array.from({ length: 70 }, (_, i) => ({ x: seeded(i * 3 + 1) * width, y: seeded(i * 5 + 2) * height, l: 40 + seeded(i * 7) * 120, a: seeded(i * 11) * Math.PI }));
      return (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <ArtDefs />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, background: `linear-gradient(180deg, ${rgba(ink.accent3, 0.75)} 0%, ${rgba(ink.accent3, 0.32)} 45%, ${rgba(ink.accent3, 0)} 100%)` }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 380,
              backgroundImage: `radial-gradient(circle at 50% 100%, transparent 18px, ${rgba(ink.accent3, 0.55)} 19px, ${rgba(ink.accent3, 0.55)} 22px, transparent 23px, transparent 30px, ${rgba(ink.accent3, 0.4)} 31px, ${rgba(ink.accent3, 0.4)} 34px, transparent 35px, transparent 42px, ${rgba(ink.accent3, 0.3)} 43px, ${rgba(ink.accent3, 0.3)} 46px, transparent 47px)`,
              backgroundSize: "96px 48px",
              backgroundPosition: `${(t * 6) % 96}px 0`,
              maskImage: "linear-gradient(180deg, transparent 0%, black 60%)",
            }}
          />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {fibres.map((f, i) => (
              <line key={i} x1={f.x} y1={f.y} x2={f.x + Math.cos(f.a) * f.l} y2={f.y + Math.sin(f.a) * f.l} stroke="#8A6F45" strokeWidth={1} opacity={0.18} />
            ))}
          </svg>
          <AbsoluteFill style={{ backgroundImage: grainUri(0.5, 0.14, "0.45 0.35 0.2") }} />
          <div style={{ position: "absolute", inset: 40, border: `4px solid ${ink.text}`, opacity: 0.85 }} />
          <div style={{ position: "absolute", inset: 52, border: `1.5px solid ${ink.text}`, opacity: 0.7 }} />
          <div style={{ position: "absolute", right: 74, bottom: 74, width: 64, height: 64, border: `5px solid ${ink.accent}`, background: rgba(ink.accent, 0.12), opacity: 0.85 }}>
            <div style={{ position: "absolute", left: 12, top: 12, width: 30, height: 30, border: `4px solid ${ink.accent}` }} />
          </div>
        </AbsoluteFill>
      );
    }
    case "pop-comic": {
      // A comic page: yellow stock with Ben-Day dots that grow toward a corner, speed rays and a heavy gutter frame.
      return (
        <AbsoluteFill style={{ background: ink.bg }}>
          <ArtDefs />
          <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba(ink.accent, 0.5)} 30%, transparent 32%)`, backgroundSize: "26px 26px", maskImage: "linear-gradient(150deg, black 0%, rgba(0,0,0,0.25) 55%, black 100%)" }} />
          <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${t * 4}deg at 50% 50%, ${rgba("#FFFFFF", 0.22)} 0deg 6deg, transparent 6deg 14deg)`, maskImage: "radial-gradient(circle at 50% 50%, transparent 20%, black 75%)" }} />
          <AbsoluteFill style={{ boxShadow: `inset 0 0 0 22px #FFFFFF, inset 0 0 0 30px #111111` }} />
        </AbsoluteFill>
      );
    }
    default:
      return null;
  }
};

/* ============================================================== headlines ============================================================== */

type AHP = { kicker?: string; main: string; quote?: boolean; number?: number; color: string; index: number; language: string; look: Look };

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};

/** Watercolor: a painted wash swash behind a soft serif title that bleeds in; a handwritten note above. */
const WatercolorHeadline: React.FC<AHP> = ({ kicker, main, quote, color, index, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = quote ? `“${main}”` : main;
  const KICK = kicker ? 62 : 0;
  const fit = fitText(text, r.w - 40, r.h - KICK - 10, look.displayEm, 104, 3, 1.06);
  const sweep = progress(t, 0.05, 0.7, Easing.bezier(0.4, 0, 0.2, 1));
  const m = progress(t, 0.25, 0.9, Easing.bezier(0.25, 0.1, 0.25, 1));
  const k = progress(t, 0.15, 0.6);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {kicker ? <div style={{ height: KICK, fontFamily: look.body, fontWeight: 700, fontSize: 50, color: ink.muted, opacity: k, transform: `rotate(-2deg) translateY(${(1 - k) * 10}px)` }}>{kicker}</div> : null}
      <div style={{ position: "relative", padding: "6px 30px" }}>
        <div style={{ position: "absolute", inset: "-14px -20px", background: `${washUri(color, index + 3, 0.3)} center / 100% 100% no-repeat`, clipPath: `inset(-30px ${(1 - sweep) * 100}% -30px -30px)` }} />
        <div style={{ position: "relative", fontFamily: look.display, fontWeight: look.displayWeight, fontSize: fit.size, lineHeight: 1.06, color: ink.text, opacity: m, filter: `blur(${(1 - m) * 8}px)`, letterSpacing: -0.5 }}>{text}</div>
      </div>
    </div>
  );
};

const COLLAGE_FONTS = ["'Archivo Black', sans-serif", "'DM Serif Display', serif", "'Rubik Mono One', sans-serif", "'Anton', sans-serif"];
const COLLAGE_EM = [0.7, 0.55, 0.86, 0.46];

/** Paper collage: a ransom-note title, every word cut from a different paper in a different face, stuck on at 12 fps. */
const CollageHeadline: React.FC<AHP> = ({ kicker, main, quote, color, index, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const ts = Math.floor(t * 12) / 12;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const words = text.split(/\s+/);
  const KICK = kicker ? 64 : 0;
  // budget the widest face so the title always fits (with the scrap padding)
  const fit = fitText(text, r.w - 60, r.h - KICK - 20, 0.86, 92, 3, 1.3);
  const papers = [ink.paper, color, "#1E1A17", ink.accent2, "#F4ECD8"];
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {kicker ? (
        <div style={{ height: KICK, display: "flex", alignItems: "flex-start" }}>
          <div style={{ padding: "6px 26px", background: "rgba(240, 228, 190, 0.92)", fontFamily: look.body, fontWeight: 700, fontSize: 34, letterSpacing: 2, color: ink.text, textTransform: "uppercase", transform: `rotate(-2deg) translateY(${ts < 0.1 ? -80 : 0}px)`, clipPath: "polygon(2% 0, 98% 4%, 100% 50%, 97% 100%, 1% 96%, 0 50%)" }}>{kicker}</div>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${Math.round(fit.size * 0.18)}px ${Math.round(fit.size * 0.16)}px` }}>
        {words.map((w, i) => {
          const f = (i + index) % COLLAGE_FONTS.length;
          const start = 0.12 + i * (2 / 12);
          const on = ts >= start;
          const bg = papers[(i + index) % papers.length];
          const size = Math.round(fit.size * (0.86 / COLLAGE_EM[f]) * 0.62);
          return (
            <div
              key={i}
              style={{
                padding: "4px 14px 2px",
                background: `${scrapUri(bg, i * 7 + index)} center / 100% 100% no-repeat`,
                fontFamily: COLLAGE_FONTS[f],
                fontSize: Math.min(size, fit.size * 1.15),
                lineHeight: 1.15,
                color: inkOn(bg.startsWith("#") ? bg : "#FFFFFF"),
                transform: `rotate(${(seeded(i * 13 + index) - 0.5) * 7}deg) translateY(${on ? 0 : -40}px)`,
                opacity: on ? 1 : 0,
              }}
            >
              {w}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Chalkboard: chalk lettering written on left to right, a chalk underline and a circled number. */
const ChalkHeadline: React.FC<AHP> = ({ kicker, main, quote, number, color, index, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = quote ? `"${main}"` : main;
  const numW = number !== undefined ? 150 : 0;
  const w = r.w - numW;
  const KICK = kicker ? 60 : 0;
  const fit = fitText(text, w, r.h - KICK - 28, look.displayEm, 100, 2, 1.12);
  const write = progress(t, 0.15, 0.3 + [...text].length * 0.03, Easing.linear);
  const k = progress(t, 0.05, 0.3);
  const lineW = Math.min(w - 20, ([...text].length * fit.size * look.displayEm) / fit.lines + 30);
  const textH = fit.lines * fit.size * 1.12;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", alignItems: "flex-start" }}>
      {number !== undefined ? (
        <div style={{ position: "relative", width: numW, height: 140, flex: `0 0 ${numW}px`, marginTop: KICK }}>
          <svg width={140} height={140} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <RoughShape shape={{ kind: "ellipse", cx: 66, cy: 66, w: 118, h: 110 }} seed={index + 31} t={t} start={0.05} dur={0.45} stroke={color} width={7} roughness={2.2} />
          </svg>
          <div style={{ position: "absolute", left: 0, top: 0, width: 132, height: 132, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: look.display, fontSize: 76, color: ink.text, opacity: progress(t, 0.25, 0.2) }}>{number}</div>
        </div>
      ) : null}
      <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: number !== undefined ? "flex-start" : "center", textAlign: number !== undefined ? "left" : "center" }}>
        {kicker ? <div style={{ height: KICK, fontFamily: look.body, fontSize: 46, color, opacity: k }}>{kicker}</div> : null}
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: look.display, fontSize: fit.size, lineHeight: 1.12, color: ink.text, clipPath: `inset(-20px ${(1 - write) * 100}% -20px -20px)` }}>{text}</div>
          <svg width={lineW} height={30} style={{ position: "absolute", left: number !== undefined ? 0 : `calc(50% - ${lineW / 2}px)`, top: textH - 2, overflow: "visible" }}>
            <RoughShape shape={{ kind: "line", x1: 6, y1: 14, x2: lineW - 6, y2: 10 }} seed={index + 9} t={t} start={0.3 + [...text].length * 0.03} dur={0.3} stroke={color} width={7} roughness={2} />
          </svg>
        </div>
      </div>
    </div>
  );
};

/** Risograph: a two-plate title (pink under blue) that lands off register and creeps into place. */
const RisoHeadline: React.FC<AHP> = ({ kicker, main, quote, color, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const KICK = kicker ? 64 : 0;
  const fit = fitText(text, r.w - 20, r.h - KICK - 12, look.displayEm, 96, 3, 1.08);
  const a = progress(t, 0.08, 0.2, Easing.out(Easing.cubic));
  const b = progress(t, 0.22, 0.45, Easing.out(Easing.back(2)));
  const off = 4 + (1 - b) * 26;
  const style: React.CSSProperties = { fontFamily: look.display, fontSize: fit.size, lineHeight: 1.08, textAlign: "center" };
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {kicker ? (
        <div style={{ height: KICK }}>
          <div style={{ display: "inline-block", padding: "6px 18px", background: ink.accent3, color: ink.bg, fontFamily: look.body, fontWeight: 700, fontSize: 30, letterSpacing: 3, textTransform: "uppercase", opacity: a, boxShadow: `5px 4px 0 ${rgba(ink.accent, 0.7)}` }}>{kicker}</div>
        </div>
      ) : null}
      <div style={{ position: "relative" }}>
        <div style={{ ...style, position: "absolute", inset: 0, color: rgba(color, 0.85), transform: `translate(${off}px, ${off * 0.6}px)`, opacity: a, mixBlendMode: "multiply" }}>{text}</div>
        <div style={{ ...style, position: "relative", color: ink.text, opacity: b > 0 ? 0.92 : 0, mixBlendMode: "multiply" }}>{text}</div>
      </div>
    </div>
  );
};

/** Ukiyo-e: a vertical red title cartouche (kicker) beside a printed serif title with a sumi brush stroke under it. */
const PrintHeadline: React.FC<AHP> = ({ kicker, main, quote, color, index, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = quote ? `“${main}”` : main;
  const CART = kicker ? 96 : 0;
  const w = r.w - CART - (kicker ? 24 : 0);
  const fit = fitText(text, w, r.h - 40, look.displayEm, 104, 3, 1.04);
  const c = progress(t, 0.05, 0.4, Easing.bezier(0.2, 0.8, 0.2, 1));
  const m = progress(t, 0.2, 0.7, Easing.bezier(0.2, 0.8, 0.2, 1));
  const brush = progress(t, 0.55, 0.45, Easing.bezier(0.6, 0, 0.3, 1));
  const lineH = fit.lines * fit.size * 1.04;
  const bw = Math.min(w - 10, ([...text].length * fit.size * look.displayEm) / fit.lines + 40);
  // tapered sumi stroke: a filled ribbon, thick at the press and dry at the lift
  const stroke = `M 0 18 C ${bw * 0.2} 6, ${bw * 0.6} 4, ${bw} 14 L ${bw} 18 C ${bw * 0.6} 22, ${bw * 0.25} 30, 0 26 Z`;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", gap: kicker ? 24 : 0, alignItems: "flex-start" }}>
      <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ fontFamily: look.display, fontSize: fit.size, lineHeight: 1.04, color: ink.text, opacity: m, filter: `blur(${(1 - m) * 6}px)`, clipPath: `inset(-20px ${(1 - m) * 60}% -20px -20px)` }}>{text}</div>
        <svg width={bw} height={34} style={{ marginTop: 6, overflow: "visible", opacity: brush > 0 ? 1 : 0 }}>
          <defs>
            <clipPath id={`brush-${index}`}>
              <rect x={0} y={-10} width={bw * brush} height={60} />
            </clipPath>
          </defs>
          <path d={stroke} fill={ink.text} clipPath={`url(#brush-${index})`} />
        </svg>
        <div style={{ height: Math.max(0, r.h - lineH - 40) }} />
      </div>
      {kicker ? (
        <div style={{ flex: `0 0 ${CART}px`, height: r.h, display: "flex", justifyContent: "center", opacity: c, transform: `translateY(${(1 - c) * -30}px)` }}>
          <div style={{ writingMode: "vertical-rl", padding: "16px 10px", maxHeight: r.h, overflow: "hidden", background: color, color: "#FBF4E4", border: `3px solid ${ink.text}`, outline: `1.5px solid ${color}`, outlineOffset: 4, fontFamily: look.body, fontWeight: 700, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>{kicker}</div>
        </div>
      ) : null}
    </div>
  );
};

/** Starburst polygon (comic action burst) centered in a w x h box. */
export const burstPoints = (w: number, h: number, n = 14, seed = 1, inner = 0.68) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? inner - seeded(seed * 7 + i) * 0.12 : 1 - seeded(seed * 3 + i) * 0.08;
    return `${(w / 2 + Math.cos(a) * (w / 2) * rr).toFixed(1)},${(h / 2 + Math.sin(a) * (h / 2) * rr).toFixed(1)}`;
  }).join(" ");

/** Pop comic: a yellow caption box for the kicker and a slammed, outlined comic title with a hard shadow. */
const ComicHeadline: React.FC<AHP> = ({ kicker, main, quote, number, color, index, look }) => {
  const { ink } = useKit();
  const { frame, fps } = useT();
  const r = REGIONS.title;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const has = number !== undefined;
  const numW = has ? 200 : 0;
  const w = r.w - numW;
  const KICK = kicker ? 70 : 0;
  const fit = fitText(text, w - 20, r.h - KICK - 14, look.displayEm, 124, 3, 1.02);
  const cap = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 260 } });
  const slam = spring({ frame: frame - Math.round(0.18 * fps), fps, config: { damping: 9, stiffness: 240, mass: 0.7 } });
  const tilt = index % 2 ? 2 : -2;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", alignItems: "flex-start" }}>
      {has ? (
        <div style={{ position: "relative", flex: `0 0 ${numW}px`, height: 190, marginTop: KICK / 2, transform: `scale(${interpolate(slam, [0, 1], [2.2, 1])}) rotate(${tilt * 3}deg)`, opacity: slam > 0.02 ? 1 : 0 }}>
          <svg width={190} height={190} style={{ position: "absolute", left: 0, top: 0 }}>
            <polygon points={burstPoints(190, 190, 12, index + 2)} fill={ink.accent} stroke="#111111" strokeWidth={6} strokeLinejoin="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: look.display, fontSize: 104, color: "#FFFFFF", WebkitTextStroke: "4px #111111", paintOrder: "stroke fill" }}>{number}</div>
        </div>
      ) : null}
      <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {kicker ? (
          <div style={{ height: KICK, alignSelf: has ? "flex-start" : "center" }}>
            <div style={{ display: "inline-block", padding: "6px 22px", background: ink.accent2, border: "5px solid #111111", boxShadow: "6px 6px 0 #111111", fontFamily: look.body, fontWeight: 700, fontSize: 34, color: "#111111", textTransform: "uppercase", transform: `rotate(${tilt * 0.6}deg) scale(${Math.min(1, cap)})` }}>{kicker}</div>
          </div>
        ) : null}
        <div
          style={{
            fontFamily: look.display,
            fontSize: fit.size,
            lineHeight: 1.02,
            letterSpacing: 1,
            textAlign: "center",
            color,
            WebkitTextStroke: `${Math.max(4, Math.round(fit.size / 18))}px #111111`,
            paintOrder: "stroke fill",
            textShadow: `${Math.round(fit.size / 14)}px ${Math.round(fit.size / 14)}px 0 #111111`,
            transform: `scale(${interpolate(slam, [0, 1], [1.7, 1])}) rotate(${tilt * (1 - Math.min(1, slam)) * 2}deg)`,
            opacity: slam > 0.02 ? 1 : 0,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

/** Headline of an art look. */
export const ArtHeadline: React.FC<AHP> = (props) => {
  switch (props.look.id) {
    case "watercolor":
      return <WatercolorHeadline {...props} />;
    case "paper-collage":
      return <CollageHeadline {...props} />;
    case "chalkboard":
      return <ChalkHeadline {...props} />;
    case "risograph":
      return <RisoHeadline {...props} />;
    case "ukiyo-e":
      return <PrintHeadline {...props} />;
    case "pop-comic":
      return <ComicHeadline {...props} />;
    default:
      return null;
  }
};

/* ================================================================ HUD ================================================================ */

export type ArtSkin = { box: React.CSSProperties; font: string; small: string; weight: number; chipSize: number; chipRadius: number; barRadius: number; segments: boolean };

/** HUD skin of an art look (partial: Chrome merges it over its base skin). */
export const artHudSkin = (look: Look, ink: Ink): Partial<ArtSkin> | null => {
  switch (look.id) {
    case "watercolor":
      return { box: { borderRadius: 40, border: "none", background: `${washUri(ink.accent3, 21, 0.2)} center / 100% 100% no-repeat` }, font: look.display, small: look.body, weight: 650, chipRadius: 30, barRadius: 8 };
    case "paper-collage":
      return { box: { borderRadius: 0, border: "none", background: `${scrapUri(ink.paper, 41)} center / 100% 100% no-repeat`, transform: "rotate(-0.8deg)" }, font: look.display, small: look.body, weight: 400, chipRadius: 0, barRadius: 0, segments: true };
    case "chalkboard":
      return { box: { borderRadius: 6, border: `3px dashed ${rgba(ink.text, 0.6)}`, background: "transparent" }, font: look.display, small: look.body, weight: 400, chipRadius: 6, barRadius: 2 };
    case "risograph":
      return { box: { borderRadius: 0, border: "none", background: rgba(ink.accent3, 0.14), boxShadow: `6px 5px 0 ${rgba(ink.accent, 0.35)}` }, font: look.display, small: look.body, weight: 400, chipSize: 24, chipRadius: 0, barRadius: 0, segments: true };
    case "ukiyo-e":
      return { box: { borderRadius: 0, border: `3px solid ${ink.text}`, outline: `1.5px solid ${ink.text}`, outlineOffset: -9, background: rgba("#FBF4E4", 0.75) }, font: look.display, small: look.body, weight: 400, chipRadius: 0, barRadius: 0 };
    case "pop-comic":
      return { box: { borderRadius: 0, border: "6px solid #111111", background: "#FFFFFF", boxShadow: "8px 8px 0 #111111", transform: "rotate(-0.6deg)" }, font: look.display, small: look.body, weight: 400, chipSize: 34, chipRadius: 0, barRadius: 0, segments: true };
    default:
      return null;
  }
};

/* ============================================================== cut effects ============================================================== */

/** Effect drawn over the frame around a cut (d = frames from the cut midpoint, -2..5). */
export const ArtCutFx: React.FC<{ look: Look; d: number; seed: number }> = ({ look, d, seed }) => {
  const { width, height } = useVideoConfig();
  switch (look.id) {
    case "pop-comic": {
      // an action burst flashes on the impact
      const a = [0, 0, 1, 0.8, 0.45, 0.15, 0, 0][d + 2] ?? 0;
      if (!a) return null;
      const s = interpolate(d, [0, 3], [0.6, 1.25], clamp);
      return (
        <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center", justifyContent: "center", opacity: a }}>
          <svg width={900} height={900} style={{ transform: `scale(${s}) rotate(${seed * 23}deg)` }}>
            <polygon points={burstPoints(900, 900, 16, seed, 0.6)} fill="#FFD400" stroke="#111111" strokeWidth={14} strokeLinejoin="round" />
            <polygon points={burstPoints(900, 900, 16, seed + 5, 0.6)} fill="#E8262B" transform="translate(225 225) scale(0.5)" />
          </svg>
        </AbsoluteFill>
      );
    }
    case "chalkboard": {
      // a puff of chalk dust where the smudge passes
      if (d < 0 || d > 5) return null;
      const n = 40;
      return (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {Array.from({ length: n }, (_, i) => {
            const x = width * (0.2 + seeded(i * 3 + seed) * 0.6) + d * (seeded(i) - 0.5) * 30;
            const y = height * (0.3 + seeded(i * 5 + seed) * 0.45) + d * d * 4;
            return <circle key={i} cx={x} cy={y} r={2 + seeded(i * 7) * 5} fill="#FFFFFF" opacity={(1 - d / 6) * 0.5} />;
          })}
        </svg>
      );
    }
    case "risograph": {
      // the drum rolls: two plates flash across the sheet out of register
      const a = [0, 0.25, 0.5, 0.3, 0.1, 0, 0, 0][d + 2] ?? 0;
      if (!a) return null;
      return (
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply" }}>
          <AbsoluteFill style={{ background: `radial-gradient(rgba(255,72,176,${a}) 34%, transparent 36%) 0 0 / 20px 20px`, transform: `translateX(${d * 9}px)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(rgba(0,120,191,${a * 0.8}) 34%, transparent 36%) 10px 10px / 20px 20px`, transform: `translateX(${-d * 7}px)` }} />
        </AbsoluteFill>
      );
    }
    default:
      // watercolor, paper collage and ukiyo-e: the transition itself is the effect
      return null;
  }
};

/* ============================================================ stage overlay ============================================================ */

/** Texture of the medium over a scene's content (moves with the scene through its transition). */
export const ArtOverlay: React.FC<{ look: Look }> = ({ look }) => {
  switch (look.id) {
    case "watercolor":
      // cotton paper tooth shows through the pigment
      return <AbsoluteFill style={{ backgroundImage: grainUri(0.9, 0.12, "0.4 0.32 0.22"), mixBlendMode: "multiply", pointerEvents: "none" }} />;
    case "pop-comic":
      // print dots over everything, like cheap newsprint
      return <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba("#111111", 0.07)} 28%, transparent 30%)`, backgroundSize: "8px 8px", pointerEvents: "none" }} />;
    default:
      return null;
  }
};
