// Chrome of the format looks (ui-cards, flat-depth, soft-gradient): backgrounds, headlines and HUD skins.
// Their depth layers (parallax, ground, vignette) come from depth.tsx; their elements from format-elements.tsx.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { REGIONS } from "../../lib/illustrated.mjs";
import { MONO_FONT, fontStack } from "../fonts";
import { inkOn, rgba, seeded } from "../util";
import { Grain } from "../components/Background";
import { type Ink, progress, useKit } from "./kit";
import type { FormatLookId, Look, LookId } from "./looks";
import { fitText } from "./headlines";

export const FORMAT_LOOK_IDS: FormatLookId[] = ["ui-cards", "flat-depth", "soft-gradient"];
export const isFormatLook = (id: LookId): id is FormatLookId => (FORMAT_LOOK_IDS as string[]).includes(id);

/* ================================================================ backgrounds ================================================================ */

export const FormatBackground: React.FC<{ look: Look; ink: Ink }> = ({ look, ink }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  switch (look.id) {
    case "ui-cards": {
      // dark navy grid, a soft top light, and dust specks drifting up through the frame
      const cell = 60;
      const dust = Array.from({ length: 40 }, (_, i) => ({
        x: seeded(i * 3 + 5) * width + noise2D(`ux${i}`, t * 0.1, 0) * 20,
        y: ((seeded(i * 7 + 2) * height - t * (6 + seeded(i) * 12)) % height + height) % height,
        r: 1.2 + seeded(i * 11) * 2.2,
        a: 0.12 + seeded(i * 13) * 0.3,
      }));
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 110% 70% at 50% 30%, ${ink.bg} 0%, ${ink.bg2} 80%)` }}>
          <AbsoluteFill
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.045) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.045) 2px, transparent 2px)`,
              backgroundSize: `${cell}px ${cell}px`,
              backgroundPosition: `${30 + Math.sin(t * 0.1) * 6}px ${(t * 3) % cell}px`,
            }}
          />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 26% at 50% 18%, ${rgba(ink.accent3, 0.12)}, transparent 70%)` }} />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {dust.map((s, i) => (
              <rect key={i} x={s.x} y={s.y} width={s.r * 2} height={s.r * 2} fill="#FFFFFF" opacity={s.a * (0.6 + 0.4 * Math.sin(t * 1.3 + i))} />
            ))}
          </svg>
          <Grain opacity={0.04} />
        </AbsoluteFill>
      );
    }
    case "flat-depth": {
      // a dark gradient wall with a soft ceiling spot; the wooden table is the depth ground plane
      return (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ink.bg2} 0%, ${ink.bg} 62%, ${ink.bg} 100%)` }}>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 40% at 50% 46%, ${rgba("#9AA6FF", 0.22)}, transparent 70%)` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 780, height: 125, background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(5,5,25,0.35))" }} />
          <Grain opacity={0.035} />
        </AbsoluteFill>
      );
    }
    case "soft-gradient": {
      // pastel mesh: three color pools drifting slowly over a two-stop base
      const blob = (k: number, c: string, x: number, y: number, r: number) => {
        const dx = noise2D(`sgx${k}`, t * 0.06, 0) * 140;
        const dy = noise2D(`sgy${k}`, t * 0.06, 1) * 140;
        return `radial-gradient(circle ${r}px at ${x + dx}px ${y + dy}px, ${rgba(c, 0.55)}, ${rgba(c, 0)} 100%)`;
      };
      return (
        <AbsoluteFill style={{ background: `linear-gradient(160deg, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <AbsoluteFill style={{ background: [blob(1, ink.accent2, 160, 420, 620), blob(2, ink.accent3, 980, 900, 680), blob(3, ink.accent, 380, 1500, 700)].join(", ") }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%)" }} />
          <Grain opacity={0.03} />
        </AbsoluteFill>
      );
    }
    default:
      return null;
  }
};

/* ================================================================ headlines ================================================================ */

type HP = { kicker?: string; main: string; quote?: boolean; number?: number; color: string; index: number; language: string };

/** ui-cards: a big two-line header, the white kicker line over the accent main line, words popping in. */
const UiHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, color, look }) => {
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = REGIONS.title;
  const text = (quote ? `«${main}»` : main).toUpperCase();
  const k = (kicker ?? "").toUpperCase();
  const kFit = k ? fitText(k, r.w, 74, look.displayEm, 66, 1) : { size: 0, lines: 0 };
  const KH = k ? kFit.size * 1.1 + 4 : 0;
  const fit = fitText(text, r.w, r.h - KH - 8, look.displayEm, 104, 2, 1.04);
  const words = (s: string, off: number, c: string, size: number) =>
    s.split(/\s+/).map((w, i) => {
      const p = spring({ frame: frame - Math.round((off + i * 0.06) * fps), fps, config: { damping: 10, stiffness: 200 } });
      return (
        <span key={`${off}-${i}`} style={{ display: "inline-block", color: c, fontSize: size, opacity: Math.min(1, p * 3), transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px) scale(${Math.min(1, interpolate(p, [0, 1], [0.7, 1]))})`, textShadow: `0 6px 0 rgba(0,0,0,0.5), 0 0 40px ${rgba(c, 0.18)}` }}>
          {w}
        </span>
      );
    });
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", fontFamily: look.display, fontWeight: 900, letterSpacing: 0.5 }}>
      {k ? <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(kFit.size * 0.26), lineHeight: 1.1, marginBottom: 4 }}>{words(k, 0.08, ink.text, kFit.size)}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(fit.size * 0.24), lineHeight: 1.04 }}>{words(text, 0.2, color, fit.size)}</div>
    </div>
  );
};

/** flat-depth: one line whose words light up from grey to white as they are read; the active word sits on a yellow chip. */
const FlatHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, look }) => {
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const r = REGIONS.title;
  const text = quote ? `"${main}"` : main;
  const KH = kicker ? 64 : 0;
  const fit = fitText(text, r.w - 40, r.h - KH - 20, look.displayEm, 100, 2, 1.12);
  const words = text.split(/\s+/);
  const per = Math.min(0.32, 1.6 / words.length);
  const active = Math.min(words.length - 1, Math.floor((t - 0.25) / per));
  const settle = t > 0.25 + per * words.length + 0.35;
  const chip = ink.accent;
  const k = progress(t, 0.02, 0.3);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", textAlign: "center" }}>
      {kicker ? (
        <div style={{ height: KH - 14, display: "flex", alignItems: "center", padding: "0 22px", marginBottom: 14, borderRadius: 30, background: rgba("#FFFFFF", 0.12), color: ink.text, fontFamily: look.body, fontWeight: 700, fontSize: 30, opacity: k, transform: `translateY(${(1 - k) * -12}px)` }}>{kicker}</div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(fit.size * 0.1), rowGap: 4, letterSpacing: -0.5, fontFamily: look.display, fontWeight: 800, fontSize: fit.size, lineHeight: 1.12 }}>
        {words.map((w, i) => {
          const lit = progress(t, 0.25 + i * per, per * 0.9);
          const on = !settle && i === active && t >= 0.25;
          const last = settle && i === words.length - 1 && words.length > 1;
          const c = on || last ? inkOn(chip) : `rgb(${Math.round(interpolate(lit, [0, 1], [150, 255]))}, ${Math.round(interpolate(lit, [0, 1], [156, 255]))}, ${Math.round(interpolate(lit, [0, 1], [196, 255]))})`;
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", padding: "0 6px", color: c, textShadow: on || last ? "none" : "0 5px 14px rgba(0,0,0,0.35)" }}>
              {on || last ? <span style={{ position: "absolute", inset: "8% -2px 2% -2px", borderRadius: 14, background: chip, zIndex: -1, boxShadow: "0 6px 0 rgba(0,0,0,0.25)" }} /> : null}
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** soft-gradient: a frosted pill kicker over a heavy rounded line whose last word carries a gradient. */
const SoftHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, color, look }) => {
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const r = REGIONS.title;
  const text = quote ? `"${main}"` : main;
  const KH = kicker ? 66 : 0;
  const fit = fitText(text, r.w - 20, r.h - KH - 16, look.displayEm, 104, 2, 1.06);
  const words = text.split(/\s+/);
  const k = progress(t, 0.05, 0.4);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {kicker ? (
        <div style={{ height: 50, marginBottom: 16, display: "flex", alignItems: "center", padding: "0 26px", borderRadius: 26, background: "rgba(255,255,255,0.6)", border: "2px solid rgba(255,255,255,0.95)", boxShadow: "0 12px 26px -10px rgba(80,60,160,0.35)", color, fontFamily: look.body, fontWeight: 700, fontSize: 32, opacity: k, transform: `translateY(${(1 - k) * 14}px)` }}>{kicker}</div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(fit.size * 0.24), fontFamily: look.display, fontWeight: 800, fontSize: fit.size, lineHeight: 1.06, letterSpacing: -1 }}>
        {words.map((w, i) => {
          const q = progress(t, 0.15 + i * 0.07, 0.6, Easing.bezier(0.2, 0.8, 0.2, 1));
          const grad = i === words.length - 1 && words.length > 1;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: q,
                transform: `translateY(${(1 - q) * 30}px)`,
                filter: q < 1 ? `blur(${(1 - q) * 6}px)` : undefined,
                ...(grad ? { backgroundImage: `linear-gradient(90deg, ${ink.accent}, ${ink.accent2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: ink.text }),
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const FormatHeadline: React.FC<HP & { look: Look }> = (props) => {
  switch (props.look.id) {
    case "ui-cards":
      return <UiHeadline {...props} />;
    case "flat-depth":
      return <FlatHeadline {...props} />;
    case "soft-gradient":
      return <SoftHeadline {...props} />;
    default:
      return null;
  }
};

/* ================================================================ HUD ================================================================ */

export type FormatSkin = { box: React.CSSProperties; font: string; small: string; weight: number; chipSize: number; chipRadius: number; barRadius: number; segments: boolean };

export const formatHudSkin = (look: Look, ink: Ink): Partial<FormatSkin> | null => {
  switch (look.id) {
    case "ui-cards":
      return {
        box: { borderRadius: 14, border: "2px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(30,37,54,0.95), rgba(18,23,36,0.95))", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.1), 0 18px 34px rgba(0,0,0,0.45)" },
        font: fontStack("Montserrat"),
        small: MONO_FONT,
        weight: 900,
        chipSize: 28,
        chipRadius: 8,
        barRadius: 6,
      };
    case "flat-depth":
      return { box: { borderRadius: 46, border: "none", background: rgba("#FFFFFF", 0.1), boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.15), 0 16px 30px rgba(5,5,30,0.4)" }, font: look.display, small: look.body, weight: 800, chipRadius: 30, barRadius: 10 };
    case "soft-gradient":
      return {
        box: { borderRadius: 34, border: "2px solid rgba(255,255,255,0.95)", background: "rgba(255,255,255,0.55)", boxShadow: `0 20px 40px -18px ${rgba(ink.accent, 0.45)}` },
        font: look.display,
        small: look.body,
        weight: 800,
        chipRadius: 24,
        barRadius: 10,
      };
    default:
      return null;
  }
};
