// Headline skins and 2D lens overlays of the paper-world, toy-blocks and holo-studio 3D looks.
// Headlines live inside REGIONS.title, anchored to its top, and shrink to fit (same contract as the illustrated kit).
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { REGIONS } from "../../lib/illustrated.mjs";
import { fitText } from "../illustrated/headlines";
import { inkOn, rgba, seeded } from "../util";
import type { Palette } from "../types";
import type { Look3D } from "./looks";

type HP = { kicker?: string; main: string; quote?: boolean; color: string; palette: Palette; look: Look3D; index: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number, a: number, d: number, e = Easing.bezier(0.22, 1, 0.36, 1)) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: e });

/** Paper world: a cut paper banner (folded ends, drop shadow) that unfolds downward; rounded display type. */
const PaperHeadline: React.FC<HP> = ({ kicker, main, quote, color, palette, look, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const r = REGIONS.title;
  const text = quote ? `“${main}”` : main;
  const KICK = kicker ? 58 : 0;
  const fit = fitText(text, r.w - 120, r.h - KICK - 40, 0.56, 92, 2, 1.05);
  const unfold = ease(t, 0.08, 0.5, Easing.bezier(0.3, 1.5, 0.5, 1));
  const k = ease(t, 0.3, 0.4);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: look.label.font }}>
      {kicker ? (
        <div style={{ height: KICK, fontWeight: 800, fontSize: 36, letterSpacing: 1, color: palette.text, opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>{kicker}</div>
      ) : null}
      <div style={{ position: "relative", transform: `perspective(900px) rotateX(${(1 - unfold) * -88}deg) rotate(${index % 2 ? 1.2 : -1.2}deg)`, transformOrigin: "50% 0%" }}>
        {/* folded ribbon ends behind the banner */}
        <div style={{ position: "absolute", left: -46, top: 22, width: 90, bottom: -18, background: `linear-gradient(90deg, ${color}, ${rgba("#000000", 0)}), ${color}`, filter: "brightness(0.78)", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 26% 50%)" }} />
        <div style={{ position: "absolute", right: -46, top: 22, width: 90, bottom: -18, background: color, filter: "brightness(0.78)", clipPath: "polygon(0 0, 100% 0, 74% 50%, 100% 100%, 0 100%)" }} />
        <div style={{ position: "relative", padding: "10px 40px 6px", background: color, boxShadow: "4px 8px 0 rgba(80,60,40,0.22), 0 18px 30px rgba(80,60,40,0.22)" }}>
          <div style={{ fontWeight: 800, fontSize: fit.size, lineHeight: 1.05, color: inkOn(color), textAlign: "center" }}>{text}</div>
        </div>
      </div>
    </div>
  );
};

/** Toy blocks: the title sits on a toy brick (studs on top) that is pressed down onto the stage on twos. */
const BrickHeadline: React.FC<HP> = ({ kicker, main, quote, color, look }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = REGIONS.title;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const KICK = kicker ? 60 : 0;
  const fit = fitText(text, r.w - 90, r.h - KICK - 60, 0.66, 86, 2, 1.04);
  // stop-motion: the brick drops in held poses (every 2 frames), then clicks down
  const f2 = Math.floor(frame / 2) * 2;
  const p = spring({ frame: f2 - 3, fps, config: { damping: 11, stiffness: 180 } });
  const studs = Math.max(4, Math.min(10, Math.round((text.length * fit.size * 0.66) / 120)));
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: look.label.font }}>
      {kicker ? (
        <div style={{ height: KICK }}>
          <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 8, background: "#1A1A1A", color: "#FFFFFF", fontWeight: 800, fontSize: 30, letterSpacing: 2, textTransform: "uppercase", opacity: p > 0.05 ? 1 : 0 }}>{kicker}</div>
        </div>
      ) : null}
      <div style={{ position: "relative", marginTop: 26, transform: `translateY(${(1 - Math.min(1, p)) * -160}px)`, opacity: p > 0.02 ? 1 : 0 }}>
        <div style={{ position: "absolute", left: 18, right: 18, top: -22, display: "flex", justifyContent: "space-around" }}>
          {Array.from({ length: studs }, (_, i) => (
            <div key={i} style={{ width: 54, height: 24, borderRadius: "10px 10px 2px 2px", background: `linear-gradient(90deg, ${color}, ${rgba("#FFFFFF", 0.35)} 35%, ${color} 60%)`, boxShadow: `inset 0 -4px 0 ${rgba("#000000", 0.18)}` }} />
          ))}
        </div>
        <div style={{ padding: "16px 40px 14px", borderRadius: 12, background: `linear-gradient(180deg, ${rgba("#FFFFFF", 0.22)}, ${rgba("#FFFFFF", 0)} 40%), ${color}`, boxShadow: `inset 0 -10px 0 ${rgba("#000000", 0.2)}, 0 10px 0 ${rgba("#000000", 0.3)}` }}>
          <div style={{ fontWeight: 900, fontSize: fit.size, lineHeight: 1.04, color: inkOn(color), textAlign: "center", textShadow: `0 3px 0 ${rgba("#000000", 0.2)}` }}>{text}</div>
        </div>
      </div>
    </div>
  );
};

const GLYPHS = "0123456789ABCDEF#%/<>=+";

/** Holo studio: thin glowing caps inside corner brackets; the kicker rolls from garbage glyphs into the real text. */
const HoloHeadline: React.FC<HP> = ({ kicker, main, quote, color, look, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const r = REGIONS.title;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const KICK = kicker ? 56 : 0;
  const fit = fitText(text, r.w - 80, r.h - KICK - 30, 0.62, 88, 3, 1.08);
  const box = ease(t, 0.05, 0.35);
  const m = ease(t, 0.2, 0.45);
  const kchars = [...(kicker ?? "").toUpperCase()];
  const solved = Math.floor(ease(t, 0.15, 0.7, Easing.linear) * kchars.length);
  const k = kchars.map((c, i) => (i < solved || c === " " ? c : GLYPHS[Math.floor(seeded(i * 7 + Math.floor(frame / 2) + index) * GLYPHS.length)])).join("");
  const B = 34;
  const corner = (s: React.CSSProperties) => <div style={{ position: "absolute", width: B, height: B, borderColor: color, borderStyle: "solid", borderWidth: 0, opacity: box, ...s }} />;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {kicker ? <div style={{ height: KICK, fontFamily: look.label.font, fontSize: 30, letterSpacing: 6, color, textShadow: `0 0 12px ${color}` }}>{`[ ${k} ]`}</div> : null}
      <div style={{ position: "relative", padding: "14px 36px" }}>
        {corner({ left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4 })}
        {corner({ right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4 })}
        {corner({ left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4 })}
        {corner({ right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4 })}
        <div style={{ fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, fontSize: fit.size, lineHeight: 1.08, letterSpacing: 2, textAlign: "center", color: "#E9FDFF", textShadow: `0 0 18px ${color}, 0 0 42px ${rgba(color, 0.5)}`, opacity: m, clipPath: `inset(0 0 ${(1 - m) * 100}% 0)` }}>{text}</div>
      </div>
    </div>
  );
};

/** Headline of a 3D look with its own skin, or null (the scene falls back to the illustrated headline). */
export const Headline3D: React.FC<HP> = (props) => {
  switch (props.look.headline) {
    case "paper":
      return <PaperHeadline {...props} />;
    case "brick":
      return <BrickHeadline {...props} />;
    case "holo":
      return <HoloHeadline {...props} />;
    default:
      return null;
  }
};

/** 2D lens / medium overlay above the 3D canvas (under labels and headline). */
export const Overlay3D: React.FC<{ look: Look3D; accent: string }> = ({ look, accent }) => {
  const frame = useCurrentFrame();
  switch (look.overlay) {
    case "tiltshift":
      // tilt-shift: only a band through the subject is sharp; above and below melt into blur (a toy-model photo)
      return (
        <>
          <AbsoluteFill style={{ backdropFilter: "blur(9px)", WebkitBackdropFilter: "blur(9px)", maskImage: "linear-gradient(180deg, black 0%, black 22%, transparent 36%, transparent 66%, black 82%, black 100%)", WebkitMaskImage: "linear-gradient(180deg, black 0%, black 22%, transparent 36%, transparent 66%, black 82%, black 100%)" }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,240,210,0.10), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(40,20,0,0.12))" }} />
        </>
      );
    case "scanlines":
      return (
        <>
          <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 5px)", backgroundPosition: `0 ${(frame * 0.6) % 5}px` }} />
          <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba(accent, 0.18)} 1.2px, transparent 1.4px)`, backgroundSize: "40px 40px", maskImage: "linear-gradient(180deg, transparent 0%, black 40%, black 100%)" }} />
          {/* HUD rulers on both sides */}
          {[60, 1012].map((x) => (
            <div key={x} style={{ position: "absolute", left: x, top: 640, width: 8, height: 560, backgroundImage: `repeating-linear-gradient(180deg, ${rgba(accent, 0.6)} 0 2px, transparent 2px 28px)`, opacity: 0.7 }} />
          ))}
        </>
      );
    case "paper":
      return <AbsoluteFill style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.12 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")}")`, mixBlendMode: "multiply" }} />;
    default:
      return null;
  }
};
