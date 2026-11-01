// Shared drawing + motion primitives for the illustrated template. Everything is frame-pure.
import React, { createContext, useContext, useMemo } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath } from "@remotion/paths";
import { noise2D } from "@remotion/noise";
import rough from "roughjs";
import type { IconData, Palette } from "../types";
import { rgba, seeded } from "../util";
import { LOOKS, type Look } from "./looks";
import { artPanel, isArtLook } from "./artstyles";
import { depthPanel } from "./depth";

export type Ink = {
  bg: string;
  bg2: string;
  text: string;
  accent: string;
  accent2: string;
  accent3: string;
  good: string;
  bad: string;
  muted: string;
  surface: string;
  surface2: string;
  line: string;
  paper: string;
  paperInk: string;
  codeBg: string;
  codeBar: string;
  termBg: string;
  stampBg: string;
  drop: string;
  /** The look this ink belongs to (fonts, panels, motion). */
  look: Look;
};

export const makeInk = (p: Palette, look: Look = LOOKS.blueprint): Ink => ({
  bg: p.bg[0],
  bg2: p.bg[1] ?? p.bg[0],
  text: p.text,
  accent: p.accent,
  accent2: p.accent2 ?? "#FFC145",
  accent3: p.accent3 ?? "#38D6F5",
  ...look.colors,
  look,
});

/** Resolve a palette token ("accent2", "good"...) or a hex color. */
export const col = (ink: Ink, c: string | undefined, fallback: string): string => {
  if (!c) return fallback;
  if (c.startsWith("#")) return c;
  const v = (ink as unknown as Record<string, unknown>)[c];
  return typeof v === "string" ? v : fallback;
};

/** moments: the scene's resolved word moments (drawings and 2D fx), seconds into the scene. */
type Ctx = { ink: Ink; icons: Record<string, IconData>; seed: number; look: Look; moments?: Record<string, number> };
export const IllustrationContext = createContext<Ctx>({ ink: makeInk({ bg: ["#0B1020"], text: "#fff", accent: "#FF7A59" }), icons: {}, seed: 1, look: LOOKS.blueprint });
export const useKit = () => useContext(IllustrationContext);

/** Scene-local time in seconds. */
export const useSec = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** Overshoot pop spring (0→1, peaks ~1.08) starting at `start` seconds. */
export const usePop = (start: number, opts: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(start * fps), fps, config: { damping: opts.damping ?? 10, stiffness: opts.stiffness ?? 170, mass: opts.mass ?? 0.7 } });
};

/** Eased 0→1 progress between start and start+dur seconds. */
export const progress = (t: number, start: number, dur: number, easing = Easing.bezier(0.22, 1, 0.36, 1)) =>
  interpolate(t, [start, start + Math.max(0.01, dur)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Subtle organic idle drift in px. */
export const idle = (t: number, seed: number, amp = 4) => ({
  x: noise2D(`x${seed}`, t * 0.35, 0) * amp,
  y: noise2D(`y${seed}`, t * 0.35, 1) * amp,
});

/** Element entrance in the look's motion language. Returns a style. */
export const useEnter = (start: number, seed = 1): React.CSSProperties => {
  const t = useSec();
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePop(start);
  const d = idle(t, seed, 3);
  switch (ink.look.enter) {
    case "marker": {
      // Drawn on left to right like a marker stroke; no scale, no drift.
      const q = progress(t, start, 0.6, Easing.bezier(0.45, 0, 0.55, 1));
      return { opacity: q > 0 ? 1 : 0, clipPath: `inset(-60px ${(1 - q) * 100}% -60px -60px)` };
    }
    case "snap": {
      // News lower-third: slams in from the left on an expo curve, a skew that straightens out.
      const q = progress(t, start, 0.22, Easing.bezier(0.16, 1, 0.3, 1));
      return { opacity: q > 0 ? 1 : 0, transform: `translateX(${(1 - q) * -160}px) skewX(${(1 - q) * -10}deg)` };
    }
    case "rise": {
      // Editorial: calm fade + rise on an in-out cubic, plus a slow idle float.
      const q = progress(t, start, 0.8, Easing.bezier(0.65, 0, 0.35, 1));
      return { opacity: q, transform: `translate(${d.x * 0.4}px, ${(1 - q) * 34 + d.y * 0.4}px)` };
    }
    case "flicker": {
      // Terminal: power-on flicker in discrete steps while sliding up a few px.
      const f = frame - Math.round(start * fps);
      const steps = [0, 0.7, 0.15, 0.9, 0.5, 1];
      const o = f < 0 ? 0 : f >= steps.length ? 1 : steps[f];
      return { opacity: o, transform: `translateY(${f < 0 ? 24 : Math.max(0, 24 - f * 6)}px)` };
    }
    case "bounce": {
      // Toy-like: big overshoot from small with a twist.
      const b = spring({ frame: frame - Math.round(start * fps), fps, config: { damping: 7, stiffness: 150, mass: 0.8 } });
      return {
        opacity: interpolate(b, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translate(${d.x}px, ${d.y}px) scale(${interpolate(b, [0, 1], [0.3, 1])}) rotate(${(1 - b) * -10}deg)`,
      };
    }
    case "bloom": {
      // Watercolor: the wash bleeds in from a soft blur, slowly, then breathes.
      const q = progress(t, start, 0.95, Easing.bezier(0.25, 0.1, 0.25, 1));
      return { opacity: q, filter: q < 1 ? `blur(${(1 - q) * 14}px)` : undefined, transform: `translate(${d.x * 0.5}px, ${d.y * 0.5}px) scale(${1.05 - 0.05 * q})` };
    }
    case "stopmo": {
      // Paper collage: a scrap is slid in by hand at 12 fps (held poses), lands with a nudge and keeps a tiny boil.
      const ts = Math.floor(t * 12) / 12;
      const q = progress(ts, start, 0.42, Easing.bezier(0.3, 1.4, 0.5, 1));
      const k = Math.floor(t * 12);
      const wob = q >= 1 ? (seeded(k + seed * 13) - 0.5) * 0.9 : 0;
      return { opacity: ts >= start ? 1 : 0, transform: `translate(${(1 - q) * 120}px, ${(1 - q) * 220}px) rotate(${(1 - q) * 9 + wob}deg)` };
    }
    case "chalk": {
      // Chalkboard: written on left to right at hand speed; the stroke is dusty while it is fresh.
      const q = progress(t, start, 0.75, Easing.linear);
      return { opacity: q > 0 ? 0.75 + 0.25 * q : 0, clipPath: `inset(-60px ${(1 - q) * 100}% -60px -60px)` };
    }
    case "misprint": {
      // Risograph: the plates land off register, then snap together (the pink plate trails behind).
      const q = progress(t, start, 0.36, Easing.out(Easing.back(2.2)));
      const off = (1 - Math.min(1, q)) * 30;
      return { opacity: q > 0 ? 1 : 0, transform: `translate(${-off}px, ${off * 0.3}px)`, filter: off > 0.5 ? `drop-shadow(${off * 1.4}px ${off * 0.8}px 0 rgba(255, 72, 176, 0.75))` : undefined };
    }
    case "brush": {
      // Ukiyo-e / sumi: ink spreads from the left edge like a loaded brush touching wet paper.
      const q = progress(t, start, 0.85, Easing.bezier(0.2, 0.8, 0.2, 1));
      return { opacity: q > 0 ? 1 : 0, clipPath: `circle(${q * 160}% at 0% 50%)`, filter: q < 1 ? `blur(${(1 - q) * 5}px)` : undefined };
    }
    case "drop": {
      // Flat 2.5D: the object drops onto the table, squashes on contact and settles.
      const b = spring({ frame: frame - Math.round(start * fps), fps, config: { damping: 9, stiffness: 170, mass: 0.8 } });
      const land = Math.max(0, 1 - Math.abs(b - 1) * 6);
      return {
        opacity: interpolate(b, [0, 0.15], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - b) * -180}px) scale(${1 + land * 0.04}, ${1 - land * 0.05})`,
        transformOrigin: "50% 100%",
      };
    }
    case "slam": {
      // Pop comic: drops from big with an overshoot and a twist, like an onomatopoeia hitting the panel.
      const b = spring({ frame: frame - Math.round(start * fps), fps, config: { damping: 10, stiffness: 260, mass: 0.6 } });
      return { opacity: b > 0.02 ? 1 : 0, transform: `scale(${interpolate(b, [0, 1], [1.6, 1])}) rotate(${(1 - b) * (seed % 2 ? 6 : -6)}deg)` };
    }
    default:
      break;
  }
  return {
    opacity: interpolate(p, [0, 0.35], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translate(${d.x}px, ${interpolate(p, [0, 1], [46, 0]) + d.y}px) scale(${interpolate(p, [0, 1], [0.72, 1])})`,
  };
};

/** A path that draws itself on (evolvePath) between start and start+dur. */
export const DrawPath: React.FC<{
  d: string;
  t: number;
  start: number;
  dur?: number;
  stroke: string;
  width?: number;
  fill?: string;
  fillStart?: number;
  opacity?: number;
}> = ({ d, t, start, dur = 0.6, stroke, width = 6, fill, fillStart, opacity = 1 }) => {
  const p = progress(t, start, dur);
  const ev = useMemo(() => {
    try {
      return (q: number) => evolvePath(q, d);
    } catch {
      return null;
    }
  }, [d]);
  let dash: { strokeDasharray?: string; strokeDashoffset?: number } = {};
  if (ev) {
    try {
      dash = ev(p);
    } catch {
      dash = {};
    }
  }
  const fp = fill && fill !== "none" ? progress(t, fillStart ?? start + dur * 0.8, 0.3) : 0;
  if (p <= 0) return null;
  return (
    <path
      d={d}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={fill && fill !== "none" ? fill : "none"}
      fillOpacity={fp}
      opacity={opacity}
      strokeDasharray={dash.strokeDasharray}
      strokeDashoffset={dash.strokeDashoffset}
    />
  );
};

const gen = rough.generator();

type RoughKind = { kind: "ellipse"; cx: number; cy: number; w: number; h: number } | { kind: "rect"; x: number; y: number; w: number; h: number } | { kind: "line"; x1: number; y1: number; x2: number; y2: number } | { kind: "curve"; points: [number, number][] };

/** Hand-drawn (rough.js) shape, drawn on stroke by stroke. Deterministic via `seed`. */
export const RoughShape: React.FC<{ shape: RoughKind; seed: number; t: number; start: number; dur?: number; stroke: string; width?: number; roughness?: number }> = ({
  shape,
  seed,
  t,
  start,
  dur = 0.55,
  stroke,
  width = 6,
  roughness = 1.6,
}) => {
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Marker boil: re-seed the hand-drawn shape ~6 times per second once it is fully drawn.
  const boil = ink.look.boil && t > start + dur * 1.6 ? Math.floor(frame / Math.max(1, Math.round(fps / 6))) % 3 : 0;
  const paths = useMemo(() => {
    const o = { seed: Math.max(1, Math.floor(seed)) + boil * 101, roughness, bowing: 1.2, stroke, strokeWidth: width, disableMultiStroke: false };
    const dr =
      shape.kind === "ellipse"
        ? gen.ellipse(shape.cx, shape.cy, shape.w, shape.h, o)
        : shape.kind === "rect"
          ? gen.rectangle(shape.x, shape.y, shape.w, shape.h, o)
          : shape.kind === "line"
            ? gen.line(shape.x1, shape.y1, shape.x2, shape.y2, o)
            : gen.curve(shape.points, o);
    return gen.toPaths(dr).map((p) => p.d);
  }, [shape, seed, roughness, stroke, width, boil]);
  return (
    <>
      {paths.map((d, i) => (
        <DrawPath key={i} d={d} t={t} start={start + (i * dur) / Math.max(1, paths.length) / 2} dur={dur} stroke={stroke} width={width} />
      ))}
    </>
  );
};

/** Phosphor duotone icon: outline draws on, then the outline fills and the soft back shape pops. */
export const PhosphorIcon: React.FC<{ name?: string; size: number; color: string; t: number; start: number; draw?: boolean }> = ({ name, size, color, t, start, draw = true }) => {
  const { icons } = useKit();
  const icon = name ? icons[name.trim().toLowerCase().replace(/[\s_]+/g, "-")] : undefined;
  if (!icon) return null;
  const pop = progress(t, start + 0.45, 0.35, Easing.bezier(0.34, 1.56, 0.64, 1));
  return (
    <svg viewBox={icon.viewBox} width={size} height={size} style={{ overflow: "visible" }}>
      <g style={{ transformOrigin: "128px 128px", transform: `scale(${pop})` }}>
        {icon.back.map((d, i) => (
          <path key={`b${i}`} d={d} fill={color} opacity={0.3} />
        ))}
      </g>
      {icon.outline.map((d, i) =>
        draw ? (
          <DrawPath key={i} d={d} t={t} start={start} dur={0.6} stroke={color} width={3} fill={color} fillStart={start + 0.5} />
        ) : (
          <path key={i} d={d} fill={color} />
        ),
      )}
    </svg>
  );
};

/** Card-like surface used by most elements, styled by the look (plus the depth pass when the look has one). */
export const panelStyle = (ink: Ink, accent?: string): React.CSSProperties => depthPanel(ink, basePanelStyle(ink, accent));

const basePanelStyle = (ink: Ink, accent?: string): React.CSSProperties => {
  const L = ink.look;
  if (L.id === "blueprint")
    return {
      position: "absolute",
      borderRadius: 30,
      background: `linear-gradient(180deg, ${ink.surface2} 0%, ${ink.surface} 100%)`,
      border: `2px solid ${accent ? rgba(accent, 0.45) : "rgba(170, 190, 255, 0.14)"}`,
      boxShadow: `0 24px 60px rgba(0,0,0,0.45)${accent ? `, 0 0 40px ${rgba(accent, 0.12)}` : ""}`,
    };
  if (L.panel.rough) return { position: "absolute", borderRadius: L.panel.radius, background: ink.surface2 }; // the border is a RoughFrame
  if (isArtLook(L.id)) return artPanel(ink, accent, accent ? accent.length + accent.charCodeAt(accent.length - 1) : 1);
  if (L.id === "broadcast")
    return { position: "absolute", borderRadius: 0, background: ink.surface2, borderLeft: `10px solid ${accent ?? ink.accent}`, boxShadow: L.panel.shadow };
  if (L.id === "editorial-chart")
    return { position: "absolute", borderRadius: L.panel.radius, background: ink.surface2, border: `1px solid ${ink.line}`, borderTop: `6px solid ${accent ?? ink.text}`, boxShadow: L.panel.shadow };
  if (L.id === "rank-numbers")
    return { position: "absolute", borderRadius: L.panel.radius, background: `linear-gradient(160deg, ${ink.surface2}, ${ink.surface})`, border: `4px solid ${accent ?? rgba("#FFFFFF", 0.85)}`, boxShadow: L.panel.shadow };
  if (L.id === "ui-cards")
    return { position: "absolute", borderRadius: L.panel.radius, background: `linear-gradient(180deg, ${ink.surface2}, ${ink.surface})`, border: `2px solid ${accent ? rgba(accent, 0.6) : "rgba(255,255,255,0.08)"}`, boxShadow: L.panel.shadow };
  if (L.id === "flat-depth")
    return { position: "absolute", borderRadius: L.panel.radius, background: `linear-gradient(180deg, ${ink.surface2}, ${ink.surface})`, border: accent ? `3px solid ${accent}` : "none", boxShadow: `0 10px 0 ${rgba("#0A0A28", 0.45)}` };
  if (L.id === "soft-gradient")
    return { position: "absolute", borderRadius: L.panel.radius, background: ink.surface2, border: `2px solid ${accent ? rgba(accent, 0.6) : "rgba(255,255,255,0.95)"}`, backdropFilter: "blur(14px)", boxShadow: accent ? `0 0 0 6px ${rgba(accent, 0.12)}` : "none" };
  return { position: "absolute", borderRadius: L.panel.radius, background: ink.surface2, border: `2px solid ${accent ? rgba(accent, 0.7) : ink.line}`, boxShadow: L.panel.shadow };
};

/** Marker-drawn rectangle around a panel (whiteboard look); renders nothing for other looks. */
export const RoughFrame: React.FC<{ w: number; h: number; start: number; color?: string; seed?: number }> = ({ w, h, start, color, seed = 1 }) => {
  const { ink } = useKit();
  const t = useSec();
  if (!ink.look.panel.rough) return null;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <RoughShape shape={{ kind: "rect", x: 4, y: 4, w: w - 8, h: h - 8 }} seed={seed} t={t} start={start} dur={0.7} stroke={color ?? ink.text} width={5} roughness={1.3} />
    </svg>
  );
};

/** Counts 0→1 per item: how far item k is revealed. */
export const itemP = (t: number, items: number[], k: number, dur = 0.45) => (items[k] === undefined ? 1 : progress(t, items[k], dur));
