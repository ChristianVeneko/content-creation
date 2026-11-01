// 2D effects (lib/fx2d.mjs) drawn over or under a scene: particles, bursts, ink splashes, doodles, speed lines, light
// leaks, grain and flashes (Fx2DLayer), plus the camera/screen hits that move or filter the whole scene: zoom punch,
// shake, glitch and chromatic split (fxSceneStyle + Fx2DFilters). Tinted per look through FxTint. Frame-pure.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, hash01, momentSec } from "../../lib/motion.mjs";
import { FX2D_BACK, burst2d, fx2dCamera, fx2dEnvelope, fx2dWindow, lightLeak2d, particles2d, scribbles2d, speedLines2d, splash2d } from "../../lib/fx2d.mjs";
import type { Box } from "../types";
import { rgba } from "../util";
import { Grain } from "./Background";
import { drawColor, type DrawingColors } from "./Drawing2D";

/** How a look tints the fx (src/illustrated/drawing-skin.ts lookFxTint; classic: classicFxTint). */
export type FxTint = {
  palette: [string, string, string, string];
  spark: string;
  splash: string;
  scribble: string;
  lines: string;
  leak: [string, string];
  grain: number;
  /** Soft glow behind particles (dark looks). */
  glow: boolean;
  /** Ink outline around shapes (pop comic). */
  outline: string | null;
  /** Watercolor bleed on splashes. */
  wash: boolean;
  /** Light looks: the leak darkens warmly (multiply) instead of adding light. */
  light?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fx = { type: string; at?: number | string; until?: number | string; target?: string; color?: string; count?: number; size?: number; seed?: number | string; depth?: "back" | "front"; x?: number; y?: number; intensity?: number };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const star = (r: number, n = 5, inner = 0.45) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r * inner : r;
    return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
  }).join(" ");
const glint = (s: number) => `M0 ${-s} Q0 0 ${s} 0 Q0 0 0 ${s} Q0 0 ${-s} 0 Q0 0 0 ${-s} Z`;
const leaf = (s: number) => `M0 ${-s / 2} C${s * 0.45} ${-s * 0.25} ${s * 0.45} ${s * 0.25} 0 ${s / 2} C${-s * 0.45} ${s * 0.25} ${-s * 0.45} ${-s * 0.25} 0 ${-s / 2} Z`;

/** Default fx area when there is no target: the safe stage. */
export const STAGE_BOX: Box = { x: 90, y: 300, w: 900, h: 1150 };

const sideOf = (f: Fx) => f.depth ?? (FX2D_BACK.includes(f.type) ? "back" : "front");

/**
 * The fx of one depth (behind or in front of the scene content), in frame pixels.
 * `target(id)` gives the frame box of an fx target (element id, drawing id or "drawing/part"), or null.
 */
export const Fx2DLayer: React.FC<{
  fx: Fx[];
  depth: "back" | "front";
  t: number;
  sceneSec: number;
  moments?: Record<string, number>;
  tint: FxTint;
  colors: DrawingColors;
  target: (id: string) => Box | null;
  uid: string;
  /** Only the fx aimed at a target (true), only the untargeted ones (false), or all (undefined). */
  targeted?: boolean;
  width?: number;
  height?: number;
}> = ({ fx, depth, t, sceneSec, moments, tint, colors, target, uid, targeted, width = 1080, height = 1920 }) => {
  const sec = (m: unknown) => momentSec(m, moments);
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  const svg: React.ReactNode[] = [];
  const html: React.ReactNode[] = [];
  fx.forEach((f, i) => {
    if (sideOf(f) !== depth) return;
    if (targeted !== undefined && Boolean(f.target) !== targeted) return;
    const w = fx2dWindow(f, t, sceneSec, sec);
    if (!w.active) return;
    const k = f.size ?? 1;
    const seed = f.seed ?? `${uid}:${i}`;
    const box = (f.target ? target(f.target) : null) ?? (f.x !== undefined || f.y !== undefined ? { x: (f.x ?? 0.5) * width - 60, y: (f.y ?? 0.45) * height - 60, w: 120, h: 120 } : null);
    const c = (fallback: string) => drawColor(colors, f.color, fallback);
    const center = box ? { x: box.x + box.w / 2, y: box.y + box.h / 2 } : { x: width / 2, y: STAGE_BOX.y + STAGE_BOX.h * 0.42 };
    const env = fx2dEnvelope(w);
    const key = `${f.type}-${i}`;
    const outline = tint.outline ? { stroke: tint.outline, strokeWidth: 3 } : {};
    switch (f.type) {
      case "sparkles":
      case "stars":
      case "confetti":
      case "dust":
      case "bubbles":
      case "leaves": {
        const area = box ? { x: box.x - box.w * 0.25 - 40, y: box.y - box.h * 0.25 - 40, w: box.w * 1.5 + 80, h: box.h * 1.5 + 80 } : STAGE_BOX;
        const ps = particles2d(f.type, { seed, t, area, count: f.count, size: k, intensity: f.intensity ?? 0.6 });
        svg.push(
          <g key={key} opacity={env}>
            {ps.map((p, j) => {
              const col = f.color ? c(tint.spark) : f.type === "sparkles" || f.type === "stars" || f.type === "dust" ? tint.spark : f.type === "leaves" ? [tint.palette[3], tint.palette[1], tint.palette[0], tint.palette[1]][p.c] : tint.palette[p.c];
              const tr = `translate(${p.x} ${p.y}) rotate(${p.rot})`;
              if (f.type === "sparkles")
                return (
                  <g key={j} transform={tr} opacity={p.a}>
                    {tint.glow ? <circle r={p.s * 0.9} fill={rgba(col, 0.22)} /> : null}
                    <path d={glint(p.s)} fill={col} {...outline} />
                  </g>
                );
              if (f.type === "stars") return <polygon key={j} transform={tr} points={star(p.s)} fill={col} opacity={p.a} {...outline} />;
              if (f.type === "confetti") return <rect key={j} transform={tr} x={-p.s / 2} y={-p.s * 0.28} width={p.s} height={p.s * 0.56} rx={2} fill={col} {...(tint.outline ? { stroke: tint.outline, strokeWidth: 2 } : {})} />;
              if (f.type === "dust") return <circle key={j} cx={p.x} cy={p.y} r={p.s / 2} fill={col} opacity={p.a * 0.75} />;
              if (f.type === "bubbles")
                return (
                  <g key={j} transform={`translate(${p.x} ${p.y})`} opacity={p.a}>
                    <circle r={p.s} fill={rgba(col, 0.12)} stroke={tint.outline ?? col} strokeWidth={Math.max(2, p.s * 0.12)} />
                    <path d={`M${-p.s * 0.5} ${-p.s * 0.2} A${p.s * 0.6} ${p.s * 0.6} 0 0 1 ${-p.s * 0.15} ${-p.s * 0.55}`} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={Math.max(2, p.s * 0.1)} fill="none" strokeLinecap="round" />
                  </g>
                );
              return (
                <g key={j} transform={tr}>
                  <path d={leaf(p.s)} fill={col} {...outline} />
                  <path d={`M0 ${-p.s * 0.42} L0 ${p.s * 0.42}`} stroke={rgba("#000000", 0.25)} strokeWidth={2} />
                </g>
              );
            })}
          </g>,
        );
        break;
      }
      case "burst": {
        const r = box ? Math.max(box.w, box.h) / 2 : 120;
        const ps = burst2d(w.u, { seed, origin: center, count: f.count ?? 18, size: k, radius: r });
        svg.push(
          <g key={key}>
            {w.u < 0.3 ? <circle cx={center.x} cy={center.y} r={r * 0.6 + w.u * 900 * k} fill="none" stroke={c(tint.palette[1])} strokeWidth={Math.max(1, 18 * (1 - w.u / 0.3))} opacity={1 - w.u / 0.3} /> : null}
            {ps.map((p, j) => {
              const col = f.color ? c(tint.palette[0]) : tint.palette[p.c];
              const tr = `translate(${p.x} ${p.y}) rotate(${p.rot})`;
              const o = { opacity: p.a, ...(tint.outline ? { stroke: tint.outline, strokeWidth: 3 } : {}) };
              if (p.kind === "circle") return <circle key={j} cx={p.x} cy={p.y} r={p.s / 2} fill={col} {...o} />;
              if (p.kind === "ring") return <circle key={j} cx={p.x} cy={p.y} r={p.s / 2} fill="none" stroke={col} strokeWidth={Math.max(3, p.s * 0.18)} opacity={p.a} />;
              if (p.kind === "star") return <polygon key={j} transform={tr} points={star(p.s * 0.7)} fill={col} {...o} />;
              if (p.kind === "tri") return <polygon key={j} transform={tr} points={`0,${-p.s * 0.6} ${p.s * 0.52},${p.s * 0.3} ${-p.s * 0.52},${p.s * 0.3}`} fill={col} {...o} />;
              return <rect key={j} transform={tr} x={-p.s * 0.6} y={-p.s * 0.12} width={p.s * 1.2} height={p.s * 0.24} rx={p.s * 0.12} fill={col} opacity={p.a} />;
            })}
          </g>,
        );
        break;
      }
      case "ink-splash": {
        const r = (box ? Math.max(box.w, box.h) * 0.5 : 220) * k;
        const sp = splash2d(seed, center, r);
        const g = EASE.back(clamp01(w.u / w.dur));
        const col = c(tint.splash);
        svg.push(
          <g key={key} transform={`translate(${center.x} ${center.y}) scale(${0.25 + 0.75 * g}) translate(${-center.x} ${-center.y})`} filter={tint.wash ? `url(#${id}-wash)` : undefined} opacity={tint.wash ? 0.7 : 0.92}>
            <path d={sp.blob} fill={col} {...(tint.outline ? { stroke: tint.outline, strokeWidth: 5 } : {})} />
            {sp.drops.map((d, j) => (w.u > 0.12 + j * 0.02 ? <circle key={j} cx={d.x} cy={d.y} r={d.r} fill={col} /> : null))}
          </g>,
        );
        break;
      }
      case "scribbles": {
        const b = box ?? { x: STAGE_BOX.x + 120, y: STAGE_BOX.y + 240, w: STAGE_BOX.w - 240, h: 420 };
        const doodles = scribbles2d(seed, b, f.count ?? 4, k);
        const col = c(tint.scribble);
        svg.push(
          <g key={key} filter={`url(#${id}-wobble)`}>
            {doodles.map((d, j) => {
              const q = EASE.out(clamp01((w.u - d.delay) / 0.45));
              if (q <= 0) return null;
              return <path key={j} d={d.d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - q} fill="none" stroke={col} strokeWidth={7 * Math.min(1.4, k)} strokeLinecap="round" strokeLinejoin="round" />;
            })}
          </g>,
        );
        break;
      }
      case "speed-lines": {
        const ls = speedLines2d(seed, t, center, f.count ?? 44, box ? Math.max(box.w, box.h) * 0.62 : 300);
        const col = c(tint.lines);
        svg.push(
          <g key={key} opacity={env * 0.55 * (f.intensity ?? 1)}>
            {ls.map((l, j) => (
              <line key={j} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={col} strokeWidth={l.w * k} strokeLinecap="round" />
            ))}
          </g>,
        );
        break;
      }
      case "light-leak": {
        const blobs = lightLeak2d(seed, t);
        html.push(
          <AbsoluteFill key={key} style={{ mixBlendMode: tint.light ? "multiply" : "screen", opacity: env * (f.intensity ?? 0.8) * (tint.light ? 0.45 : 1), pointerEvents: "none" }}>
            {blobs.map((b, j) => {
              const col = f.color ? c(tint.leak[0]) : j === 1 ? tint.leak[1] : tint.leak[0];
              return <div key={j} style={{ position: "absolute", left: b.x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${rgba(col, b.a)} 0%, ${rgba(col, 0)} 70%)` }} />;
            })}
          </AbsoluteFill>,
        );
        break;
      }
      case "grain":
        html.push(
          <AbsoluteFill key={key} style={{ opacity: env, pointerEvents: "none" }}>
            <Grain opacity={tint.grain * ((f.intensity ?? 0.6) / 0.6)} />
          </AbsoluteFill>,
        );
        break;
      case "flash":
        html.push(<AbsoluteFill key={key} style={{ background: c("#FFFFFF"), opacity: 0.85 * (1 - w.p) ** 2 * Math.min(1, f.intensity ?? 1), pointerEvents: "none" }} />);
        break;
      case "glitch": {
        // colored slices on top of the displaced scene (the displacement itself is fxSceneStyle's filter)
        const step = Math.floor(w.u * 20);
        html.push(
          <AbsoluteFill key={key} style={{ pointerEvents: "none", mixBlendMode: "difference" }}>
            {[0, 1, 2, 3].map((j) =>
              hash01(seed, "bar", step, j) > 0.45 ? (
                <div key={j} style={{ position: "absolute", left: 0, right: 0, top: hash01(seed, "by", step, j) * height, height: 8 + hash01(seed, "bh", step, j) * 70, background: j % 2 ? tint.palette[2] : tint.palette[0], opacity: 0.55, transform: `translateX(${(hash01(seed, "bx", step, j) - 0.5) * 120}px)` }} />
              ) : null,
            )}
          </AbsoluteFill>,
        );
        break;
      }
      default:
        break; // zoom-punch, shake, chromatic: fxSceneStyle
    }
  });
  if (!svg.length && !html.length) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {svg.length ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <filter id={`${id}-wash`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency={0.02} numOctaves={3} seed={7} />
              <feDisplacementMap in="SourceGraphic" scale={30} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={`${id}-wobble`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency={0.03} numOctaves={2} seed={3 + (Math.floor(t * 6) % 3)} />
              <feDisplacementMap in="SourceGraphic" scale={5} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          {svg}
        </svg>
      ) : null}
      {html}
    </AbsoluteFill>
  );
};

/** SVG filters of the screen fx (glitch displacement, chromatic split); render once per scene that uses them. */
export const Fx2DFilters: React.FC<{ uid: string; glitch: number; chroma: number; seed: number }> = ({ uid, glitch, chroma, seed }) => {
  const frame = useCurrentFrame();
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <defs>
        <filter id={`${id}-glitch`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.00001 0.06" numOctaves={1} seed={(seed + Math.floor(frame / 2)) % 997} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={70 * glitch} xChannelSelector="R" yChannelSelector="R" />
        </filter>
        <filter id={`${id}-chroma`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={14 * chroma} dy={0} result="ro" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset in="gb" dx={-14 * chroma} dy={0} result="gbo" />
          <feBlend in="ro" in2="gbo" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
};

/**
 * Camera + screen state of the scene's fx at t: the transform and filter to put on the scene content, and the
 * filter strengths (render <Fx2DFilters> when glitch or chroma > 0). `baseFilter` is the look's own scene filter.
 */
export const fxSceneStyle = (fx: Fx[], t: number, sceneSec: number, moments: Record<string, number> | undefined, uid: string, baseFilter?: string) => {
  const cam = fx2dCamera(fx, t, sceneSec, (m: unknown) => momentSec(m, moments));
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  const filters = [baseFilter, cam.glitch > 0 ? `url(#${id}-glitch)` : undefined, cam.chroma > 0.01 ? `url(#${id}-chroma)` : undefined].filter(Boolean).join(" ");
  const moved = cam.x !== 0 || cam.y !== 0 || cam.scale !== 1;
  return {
    cam,
    style: {
      transform: moved ? `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})` : undefined,
      transformOrigin: "50% 45%",
      filter: filters || undefined,
    } as React.CSSProperties,
  };
};

/** Fx tint of the classic templates (their palette, on dark gradients). */
export const classicFxTint = (colors: DrawingColors): FxTint => ({
  palette: [colors.accent, colors.accent2, colors.accent3, colors.good],
  spark: colors.accent2,
  splash: colors.accent,
  scribble: colors.accent,
  lines: colors.text,
  leak: ["#FFB347", "#FF5E7E"],
  grain: 0.08,
  glow: true,
  outline: null,
  wash: false,
});

/** Whether a scene's fx list needs the camera/screen wrapper. */
export const hasScreenFx = (fx: Fx[] | undefined) => (fx ?? []).some((f) => ["zoom-punch", "shake", "glitch", "chromatic"].includes(f.type));
