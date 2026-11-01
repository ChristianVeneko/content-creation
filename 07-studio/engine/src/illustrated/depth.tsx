// Depth pass of the illustrated kit (opt-in per look, see LOOK_DEPTH in lib/illustrated.mjs): soft contact
// shadows under elements, lit gradient panel fills with a top highlight, a ground plane, parallax background
// layers that drift slowly, and a vignette. Looks without a depth entry render exactly as before.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { depthOf } from "../../lib/illustrated.mjs";
import type { Planned } from "../types";
import { luminance, rgba, seeded } from "../util";
import type { Ink } from "./kit";
import type { Look } from "./looks";

export type Depth = { shadow: "soft" | "paper"; fill: "gradient" | "flat"; ground: "grid" | "floor" | "stage" | "table" | "none"; parallax: number; vignette: number };
export const depthFor = (look: Look): Depth | null => depthOf(look.id) as Depth | null;

/** Ambient + key shadow stack of a depth look (dark scenes: deep soft shadow; paper: a light lift). */
export const depthShadow = (d: Depth, light: boolean) =>
  d.shadow === "paper" || light ? "0 2px 5px rgba(60,40,30,0.08), 0 26px 40px -16px rgba(60,40,30,0.30)" : "0 6px 14px rgba(0,0,0,0.28), 0 38px 70px -22px rgba(0,0,0,0.70)";

/**
 * Upgrade a panel style with the depth pass: a lit-top/shaded-bottom overlay on the existing fill, a 1.5 px top
 * highlight and a soft ambient shadow under the look's own shadow. Returns the style unchanged without depth.
 */
export const depthPanel = (ink: Ink, style: React.CSSProperties): React.CSSProperties => {
  const d = depthFor(ink.look);
  if (!d) return style;
  const light = ink.look.light;
  const bg = style.background as string | undefined;
  const lit = light ? "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%, rgba(120,100,80,0.05) 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.16) 100%)";
  const hi = light ? "inset 0 1.5px 0 rgba(255,255,255,0.95)" : "inset 0 1.5px 0 rgba(255,255,255,0.13)";
  const own = style.boxShadow && style.boxShadow !== "none" ? `, ${style.boxShadow}` : "";
  return {
    ...style,
    background: d.fill === "gradient" && bg && bg !== "transparent" ? `${lit}, ${bg}` : bg,
    boxShadow: `${hi}${own}, ${depthShadow(d, light)}`,
  };
};

const NO_CONTACT = new Set(["callout", "stamp", "object", "character", "split"]);

/** Soft contact shadows on the ground under every element of a scene stack (stack coordinates). */
export const ContactShadows: React.FC<{ elements: Planned[]; look: Look; t: number }> = ({ elements, look, t }) => {
  const d = depthFor(look);
  if (!d) return null;
  const a = d.shadow === "paper" || look.light ? 0.2 : 0.55;
  const tone = look.light ? "70,50,110" : "0,0,0";
  const items: { x: number; y: number; w: number; enter: number }[] = [];
  for (const p of elements) {
    if (!p.box) continue;
    if (p.el.type === "split") {
      for (const c of [...(p.left ?? []), ...(p.right ?? [])]) if (c.box && !NO_CONTACT.has(c.el.type)) items.push({ x: p.box.x + c.box.x, y: p.box.y + c.box.y + c.box.h, w: c.box.w, enter: c.enter });
    } else if (!NO_CONTACT.has(p.el.type)) items.push({ x: p.box.x, y: p.box.y + p.box.h, w: p.box.w, enter: p.enter });
  }
  return (
    <>
      {items.map((s, i) => {
        const k = Math.max(0, Math.min(1, (t - s.enter - 0.1) / 0.45));
        if (!k) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x + s.w * 0.06,
              top: s.y - 14,
              width: s.w * 0.88,
              height: 44,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at 50% 40%, rgba(${tone},${a}) 0%, rgba(${tone},${a * 0.45}) 45%, rgba(${tone},0) 72%)`,
              opacity: k,
              filter: "blur(6px)",
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

/** Background depth layers of a look: parallax orbs and dust, the ground plane, and the vignette. */
export const DepthBackdrop: React.FC<{ look: Look; ink: Ink }> = ({ look, ink }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const d = depthFor(look);
  if (!d) return null;
  const t = frame / fps;
  const light = look.light;
  const layers = Array.from({ length: d.parallax }, (_, k) => k);
  // far orbs glow in the cool accent; a near-white accent would read as grey haze on a dark set
  const orb = !light && /^#/.test(ink.accent3) && luminance(ink.accent3) > 0.7 ? ink.accent : ink.accent3;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {layers.map((k) => {
        // far layer: large blurred orbs that barely move; near layer: small bokeh drifting faster (parallax)
        const far = k === 0;
        const n = far ? 5 : 12;
        const speed = far ? 6 : 18;
        const colors = [ink.accent3, ink.accent, ink.accent2];
        return (
          <svg key={k} width={width} height={height} style={{ position: "absolute", inset: 0, filter: `blur(${far ? 46 : 3}px)` }}>
            {Array.from({ length: n }, (_, i) => {
              const s = i * 17 + k * 101;
              const x = seeded(s + 1) * width + noise2D(`dx${s}`, t * 0.05, 0) * (far ? 60 : 30) + Math.sin(t * 0.08) * speed * (k + 1);
              const yBase = far ? 260 + seeded(s + 2) * (height - 700) : seeded(s + 2) * height;
              const y = far ? yBase + noise2D(`dy${s}`, t * 0.05, 1) * 50 : (((yBase - t * speed) % height) + height) % height;
              const r = far ? 150 + seeded(s + 3) * 170 : 3 + seeded(s + 3) * 7;
              const alpha = far ? (light ? 0.42 : 0.09) : (light ? 0.5 : 0.22) * (0.6 + 0.4 * Math.sin(t * 1.1 + i));
              return <circle key={i} cx={x} cy={y} r={r} fill={far ? (light ? colors[i % 3] : orb) : light ? "#FFFFFF" : colors[(i + 1) % 3]} opacity={alpha} />;
            })}
          </svg>
        );
      })}
      <Ground kind={d.ground} ink={ink} t={t} />
      {d.vignette > 0 ? <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 70% at 50% 45%, rgba(0,0,0,0) 55%, ${light ? rgba("#6A5A9A", d.vignette) : `rgba(0,0,0,${d.vignette})`} 100%)` }} /> : null}
    </AbsoluteFill>
  );
};

const HORIZON = 1180;

const Ground: React.FC<{ kind: Depth["ground"]; ink: Ink; t: number }> = ({ kind, ink, t }) => {
  switch (kind) {
    case "grid": {
      // a perspective grid floor that rolls slowly toward the camera, fading into a glowing horizon
      const roll = (t * 18) % 80;
      return (
        <div style={{ position: "absolute", left: 0, top: HORIZON, width: 1080, height: 1920 - HORIZON, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: -900,
              top: 0,
              width: 2880,
              height: 1400,
              transformOrigin: "50% 0%",
              transform: "perspective(520px) rotateX(64deg)",
              backgroundImage: `linear-gradient(${rgba(ink.accent3, 0.22)} 2px, transparent 2px), linear-gradient(90deg, ${rgba(ink.accent3, 0.22)} 2px, transparent 2px)`,
              backgroundSize: "80px 80px",
              backgroundPosition: `0px ${roll}px`,
              maskImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, black 30%, black 100%)",
            }}
          />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 90, background: `linear-gradient(180deg, ${rgba(ink.accent3, 0.22)}, transparent)` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: rgba(ink.accent3, 0.5), boxShadow: `0 0 24px ${rgba(ink.accent3, 0.7)}` }} />
        </div>
      );
    }
    case "floor": {
      // glossy studio floor: converging floor lines, a red reflection under the stage and a lit horizon edge
      return (
        <div style={{ position: "absolute", left: 0, top: HORIZON, width: 1080, height: 1920 - HORIZON, overflow: "hidden", background: "linear-gradient(180deg, #19181C 0%, #0B0B0D 70%)" }}>
          <div
            style={{
              position: "absolute",
              left: -900,
              top: 0,
              width: 2880,
              height: 1200,
              transformOrigin: "50% 0%",
              transform: "perspective(500px) rotateX(66deg)",
              backgroundImage: `repeating-linear-gradient(90deg, ${rgba("#FFFFFF", 0.07)} 0 3px, transparent 3px 120px)`,
            }}
          />
          <div style={{ position: "absolute", left: 140, right: 140, top: 0, height: 260, background: `radial-gradient(ellipse 60% 70% at 50% 0%, ${rgba(ink.accent, 0.35)}, transparent 75%)` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: `linear-gradient(90deg, transparent, ${rgba("#FFFFFF", 0.5)}, transparent)` }} />
        </div>
      );
    }
    case "stage": {
      // a lit round podium the scene stands on, with a rim light and a glow underneath
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.4);
      return (
        <>
          <div style={{ position: "absolute", left: -80, top: HORIZON + 20, width: 1240, height: 300, borderRadius: "50%", background: `radial-gradient(ellipse at 50% 30%, ${rgba(ink.accent2, 0.35 * pulse)}, transparent 70%)`, filter: "blur(20px)" }} />
          <div style={{ position: "absolute", left: 40, top: HORIZON + 125, width: 1000, height: 120, borderRadius: "0 0 50% 50% / 0 0 100% 100%", background: `linear-gradient(180deg, ${ink.surface} 0%, ${rgba(ink.bg, 0.6)} 100%)` }} />
          <div style={{ position: "absolute", left: 40, top: HORIZON + 30, width: 1000, height: 190, borderRadius: "50%", background: `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, ${ink.surface2} 0%, ${ink.bg} 100%)`, boxShadow: `inset 0 6px 0 ${rgba(ink.accent2, 0.75)}, inset 0 -20px 40px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.5)` }} />
        </>
      );
    }
    case "table":
      return <TablePlane ink={ink} t={t} />;
    default:
      return null;
  }
};

/** Wooden table in one-point perspective: the top recedes to a vanishing point, with grain lines and a lit front edge. */
export const TablePlane: React.FC<{ ink: Ink; t: number }> = ({ t }) => {
  const top = 905; // back edge of the table
  const front = 1236; // front edge
  const edge = 44; // thickness of the lit front edge
  const vx = 540 + Math.sin(t * 0.12) * 26; // the vanishing point drifts: a slow camera dolly
  const vy = 520;
  const grain = Array.from({ length: 16 }, (_, i) => {
    const fx = -500 + i * 140 + seeded(i * 3) * 40;
    const k = (top - vy) / (front - vy);
    return { x1: vx + (fx - vx) * k, x2: fx, o: 0.08 + seeded(i * 7) * 0.08 };
  });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="fd-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B07A48" />
          <stop offset="0.55" stopColor="#CC9459" />
          <stop offset="1" stopColor="#DCA56A" />
        </linearGradient>
        <linearGradient id="fd-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1D2A6" />
          <stop offset="1" stopColor="#C68D57" />
        </linearGradient>
        <linearGradient id="fd-under" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0C24" stopOpacity="0.95" />
          <stop offset="1" stopColor="#101233" />
        </linearGradient>
        <radialGradient id="fd-light" cx="0.5" cy="0.25" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fd-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A1D4A" stopOpacity="0.75" />
          <stop offset="0.35" stopColor="#1A1D4A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={0} y={front + edge} width={1080} height={1920 - front - edge} fill="url(#fd-under)" />
      <polygon points={`-10,${top} 1090,${top} 1090,${front} -10,${front}`} fill="url(#fd-top)" />
      {grain.map((g, i) => (
        <line key={i} x1={g.x1} y1={top} x2={g.x2} y2={front} stroke="#7A4E2A" strokeWidth={2} opacity={g.o} />
      ))}
      {[0.18, 0.42, 0.7].map((f, i) => {
        const y = top + (front - top) * f * f;
        return <line key={`h${i}`} x1={0} y1={y} x2={1080} y2={y} stroke="#8C5A31" strokeWidth={1.5} opacity={0.08} />;
      })}
      <polygon points={`-10,${top} 1090,${top} 1090,${front} -10,${front}`} fill="url(#fd-light)" />
      <polygon points={`-10,${top} 1090,${top} 1090,${front} -10,${front}`} fill="url(#fd-haze)" />
      <rect x={-10} y={front} width={1100} height={edge} fill="url(#fd-edge)" />
      <rect x={-10} y={front} width={1100} height={3} fill="#FFF3DF" opacity={0.8} />
      <rect x={-10} y={front + edge} width={1100} height={26} fill="#05061A" opacity={0.45} />
    </svg>
  );
};
