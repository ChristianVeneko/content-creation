// data-atlas: the full-frame scene layers of the data-documentary format and its paper prop.
//  - Backdrop: 1-5 agent-drawn depth planes (Drawing2D). "2.5d" drifts every plane at its own speed with a slow dolly and
//    a soft blur on the far and near planes; "flat" is one picture with a single push-in (layerMotion, lib/illustrated.mjs).
//  - Atmosphere: horizon haze, a warm glow, drifting motes and the vignette, painted over the backdrop of every scene.
//  - ParticleField / RouteLine: a populated map of lit points and a glowing line that draws itself across it.
//  - CounterPill: a dark rounded pill with a big counting number.
//  - Ledger: a parchment or blueprint sheet with a table and a red underline (a column element).
// Frame-pure: everything is a function of the scene clock. Colors come from the palette roles of the look's ink plus
// computed neutrals (paper, shadow, white).
import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { noise2D } from "@remotion/noise";
import { DEPTH_ORDER, LEDGER, formatCount, layerMotion, routePointAt, routeSamples } from "../../lib/illustrated.mjs";
import type { Box, Planned } from "../types";
import { DrawingSvg } from "../components/Drawing2D";
import { rgba, seeded } from "../util";
import { col, progress, useEnter, useKit, usePop, useSec } from "./kit";
import { inkColors, lookDrawingSkin } from "./drawing-skin";

type El = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const FRAME = { w: 1080, h: 1920 };
/** Full-frame backdrop for the data-atlas format. */
const WIN = { top: 0, h: 1920 };

/** Neutral paper tones (computed neutrals, not palette roles): parchment stock and its ink. */
const PARCHMENT = { top: "#EFE3C2", bottom: "#D8C595", ink: "#2A1F14", faint: "#6B5A40", stain: "120, 85, 40" };
/** The warm shade a blueprint sheet is printed on: the cool accent pulled toward black. */
const mixDark = (hex: string, k: number) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
};

/* ================================================================ backdrop ================================================================ */

export const Backdrop: React.FC<{ el: El; sceneSec: number; index: number; moments?: Record<string, number> }> = ({ el, sceneSec, index, moments }) => {
  const { ink } = useKit();
  const t = useSec();
  const mode = el.mode === "flat" ? "flat" : "2.5d";
  const p = clamp01(t / Math.max(0.1, sceneSec));
  const dir = index % 2 ? -1 : 1;
  const layers = [...(el.layers as El[])].sort((a, b) => DEPTH_ORDER.indexOf(a.depth ?? "subject") - DEPTH_ORDER.indexOf(b.depth ?? "subject"));
  const colors = inkColors(ink);
  const skin = lookDrawingSkin(ink);
  return (
    <div style={{ position: "absolute", left: 0, top: WIN.top, width: FRAME.w, height: WIN.h, overflow: "hidden", background: `linear-gradient(180deg, ${ink.bg2} 0%, ${ink.bg} 100%)` }}>
      {layers.map((l, i) => {
        const m = layerMotion(l.depth ?? "subject", mode, p, dir);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateX(${m.dx}px) scale(${m.scale})`,
              transformOrigin: "50% 56%",
              filter: m.blur ? `blur(${m.blur}px)` : undefined,
            }}
          >
            <DrawingSvg
              drawing={{ viewBox: l.viewBox ?? "0 0 540 480", parts: l.parts, motion: l.motion, keys: l.keys }}
              colors={colors}
              skin={skin}
              t={t}
              enter={0.1}
              moments={moments}
              width={FRAME.w}
              height={WIN.h}
              uid={`bd${index}-${i}`}
              seed={index * 7 + i + 1}
              preserveAspectRatio="xMidYMid slice"
            />
          </div>
        );
      })}
    </div>
  );
};

/* ================================================================ atmosphere ================================================================ */

/** Horizon haze, a warm glow, drifting motes and the vignette, over the backdrop (or the bare background). */
export const Atmosphere: React.FC<{ glow?: string; haze?: number; index: number }> = ({ glow, haze = 0.5, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const g = col(ink, glow, ink.accent2);
  const motes = Array.from({ length: 44 }, (_, i) => {
    const near = i % 4 === 0;
    const speed = near ? 16 : 7;
    const y = (((seeded(i * 5 + index) * WIN.h - t * speed) % WIN.h) + WIN.h) % WIN.h;
    const x = seeded(i * 3 + 9 + index) * FRAME.w + noise2D(`am${index}-${i}`, t * 0.08, 0) * (near ? 46 : 22);
    return { x, y, r: near ? 3 + seeded(i) * 3 : 1.2 + seeded(i + 40) * 1.6, a: (near ? 0.3 : 0.5) * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.7)) };
  });
  const sway = Math.sin(t * 0.22 + index) * 60;
  return (
    <div style={{ position: "absolute", left: 0, top: WIN.top, width: FRAME.w, height: WIN.h, overflow: "hidden", pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 50% at ${50 + sway / 22}% 38%, ${rgba(g, 0.2 + 0.04 * Math.sin(t * 0.6))}, transparent 72%)`, mixBlendMode: "screen" }} />
      {haze > 0 ? (
        <>
          <div style={{ position: "absolute", left: -80, right: -80, top: 470, height: 360, background: `linear-gradient(180deg, transparent, ${rgba(g, 0.2 * haze)} 45%, transparent)`, filter: "blur(30px)", transform: `translateX(${sway}px)` }} />
          <div style={{ position: "absolute", left: -200, top: 250 + noise2D(`hz${index}`, t * 0.05, 1) * 30, width: 900, height: 360, borderRadius: "50%", background: `radial-gradient(ellipse, ${rgba("#FFFFFF", 0.1 * haze)}, transparent 70%)`, filter: "blur(40px)", transform: `translateX(${t * 14}px)` }} />
        </>
      ) : null}
      <svg width={FRAME.w} height={WIN.h} style={{ position: "absolute", inset: 0 }}>
        {motes.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.r} fill="#FFFFFF" opacity={m.a} />
        ))}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 62% at 50% 46%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.66) 100%)" }} />
    </div>
  );
};

/* ================================================================ particle field ================================================================ */

/** Lit points over the frame: more of them appear as the scene plays; with a cluster they gather, with flow they stream. */
export const ParticleField: React.FC<{ p: Planned; sceneSec: number; index: number }> = ({ p, sceneSec, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el as El;
  const count = (el.count as number | undefined) ?? 240;
  const from = (el.from as number | undefined) ?? 0.15;
  const to = (el.to as number | undefined) ?? 1;
  const c = col(ink, el.color, ink.text);
  const hot = ink.accent;
  const cluster = el.cluster as [number, number] | undefined;
  const k = progress(t, p.enter, Math.max(1, sceneSec - p.enter - 0.8), Easing.inOut(Easing.quad));
  const share = from + (to - from) * k;
  const gather = cluster ? 0.55 * k : 0;
  const target: [number, number] = cluster ? [cluster[0] * 10.8, cluster[1] * 19.2] : [FRAME.w + 60, 0];
  const dots = Array.from({ length: count }, (_, i) => {
    const s = i * 13 + index * 101;
    // a blob of points: an ellipse around the middle of the map plus scatter
    const a = seeded(s + 1) * Math.PI * 2;
    const rr = Math.sqrt(seeded(s + 2));
    const bx = 540 + Math.cos(a) * rr * 430 + (seeded(s + 3) - 0.5) * 120;
    const by = 800 + Math.sin(a) * rr * 330 + (seeded(s + 4) - 0.5) * 100;
    const rank = seeded(s + 5);
    const vis = clamp01((share - rank) * 12);
    let x = bx + (target[0] - bx) * gather + noise2D(`pf${index}-${i}`, t * 0.12, 0) * 10;
    let y = by + ((cluster ? target[1] : by) - by) * gather + noise2D(`pg${index}-${i}`, t * 0.12, 1) * 10;
    let tail: [number, number] | null = null;
    if (el.flow) {
      const q = (t * 0.2 + seeded(s + 6)) % 1;
      const tx = cluster ? target[0] : FRAME.w + 60;
      const ty = cluster ? target[1] : by - 60;
      x = bx + (tx - bx) * q;
      y = by + (ty - by) * q;
      tail = [x - (tx - bx) * 0.05, y - (ty - by) * 0.05];
    }
    const twinkle = 0.55 + 0.45 * Math.sin(t * (1.1 + seeded(s + 7)) + i);
    return { x, y, r: 2 + seeded(s + 8) * 3.2, o: vis * twinkle * (el.flow ? Math.sin(Math.PI * ((t * 0.2 + seeded(s + 6)) % 1)) : 1), hotDot: seeded(s + 9) < 0.28, tail };
  });
  return (
    <svg width={FRAME.w} height={FRAME.h} style={{ position: "absolute", inset: 0, overflow: "visible", filter: `drop-shadow(0 0 7px ${rgba(hot, 0.55)})` }}>
      {dots.map((d, i) =>
        d.o > 0.02 ? (
          <g key={i} opacity={d.o}>
            {d.tail ? <line x1={d.tail[0]} y1={d.tail[1]} x2={d.x} y2={d.y} stroke={d.hotDot ? hot : c} strokeWidth={d.r * 0.8} strokeLinecap="round" opacity={0.6} /> : null}
            <circle cx={d.x} cy={d.y} r={d.r} fill={d.hotDot ? hot : c} />
          </g>
        ) : null,
      )}
    </svg>
  );
};

/* ================================================================ route ================================================================ */

/** A glowing line that draws itself, with a bright head, glowing ends, an optional label and sparks that keep flowing. */
export const RouteLine: React.FC<{ p: Planned; index: number }> = ({ p, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el as El;
  const c = col(ink, el.color, ink.accent);
  const samples = React.useMemo(() => routeSamples(el.points as [number, number][]), [el.points]);
  const px = (pt: number[]) => `${(pt[0] * 10.8).toFixed(1)} ${(pt[1] * 19.2).toFixed(1)}`;
  const d = samples.pts.map((pt, i) => `${i ? "L" : "M"} ${px(pt)}`).join(" ");
  const q = progress(t, p.enter + 0.15, 2, Easing.bezier(0.45, 0, 0.3, 1));
  const head = routePointAt(samples, q);
  const start = samples.pts[0];
  const end = samples.pts[samples.pts.length - 1];
  const drawn = q >= 1;
  const mask = `rt-mask-${index}`;
  const blur = `rt-blur-${index}`;
  const sparks = el.flow && drawn ? Array.from({ length: 12 }, (_, i) => routePointAt(samples, (t * 0.22 + i / 12) % 1)) : [];
  const label = el.label ? String(el.label) : "";
  return (
    <svg width={FRAME.w} height={FRAME.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={FRAME.w} height={FRAME.h}>
          <path d={d} pathLength={1} stroke="#FFFFFF" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - q} />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <path d={d} stroke={c} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.4} filter={`url(#${blur})`} />
        <path d={d} stroke={c} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={el.dashed ? "2 16" : undefined} />
        <path d={d} stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} strokeDasharray={el.dashed ? "2 16" : undefined} />
      </g>
      {q > 0 && q < 1 ? <circle cx={head[0] * 10.8} cy={head[1] * 19.2} r={11} fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 14px ${c}) drop-shadow(0 0 26px ${c})` }} /> : null}
      {el.endpoints !== false && q > 0 ? <circle cx={start[0] * 10.8} cy={start[1] * 19.2} r={9} fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 12px ${c})` }} /> : null}
      {el.endpoints !== false && drawn ? (
        <g style={{ filter: `drop-shadow(0 0 12px ${c})` }}>
          <circle cx={end[0] * 10.8} cy={end[1] * 19.2} r={9 + 3 * Math.sin(t * 4)} fill="#FFFFFF" />
          <circle cx={end[0] * 10.8} cy={end[1] * 19.2} r={22 + 8 * Math.sin(t * 4)} fill="none" stroke={c} strokeWidth={2.5} opacity={0.7} />
        </g>
      ) : null}
      {sparks.map((s, i) => (
        <circle key={i} cx={s[0] * 10.8} cy={s[1] * 19.2} r={3.4} fill="#FFFFFF" opacity={0.9} style={{ filter: `drop-shadow(0 0 8px ${c})` }} />
      ))}
      {label && drawn ? <RouteLabel text={label} x={end[0] * 10.8} y={end[1] * 19.2} t={t} start={p.enter + 2.15} /> : null}
    </svg>
  );
};

const RouteLabel: React.FC<{ text: string; x: number; y: number; t: number; start: number }> = ({ text, x, y, t, start }) => {
  const { ink } = useKit();
  const k = progress(t, start, 0.4);
  const w = Math.max(120, [...text].length * 17 + 44);
  const left = Math.max(20, Math.min(FRAME.w - w - 20, x - w / 2));
  return (
    <g opacity={k} transform={`translate(0 ${(1 - k) * 10})`}>
      <rect x={left} y={y - 76} width={w} height={44} rx={22} fill="rgba(8, 11, 22, 0.82)" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
      <text x={left + w / 2} y={y - 46} textAnchor="middle" fontFamily={ink.look.display} fontWeight={800} fontSize={24} letterSpacing={2} fill="#FFFFFF">
        {text.toUpperCase()}
      </text>
    </g>
  );
};

/* ================================================================ counter pill ================================================================ */

const PILL = { y: 1108, h: 128 };

/** A dark rounded pill at the bottom of the picture window with a big number that counts up; an optional tag sits above it. */
export const CounterPill: React.FC<{ p: Planned; language: string }> = ({ p, language }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el as El;
  const pop = usePop(p.enter, { damping: 13, stiffness: 150 });
  const decimals = (el.decimals as number | undefined) ?? 0;
  const from = (el.from as number | undefined) ?? 0;
  const k = progress(t, p.enter + 0.2, 1.7, Easing.bezier(0.16, 0.8, 0.2, 1));
  const val = from + ((el.value as number) - from) * k;
  const text = `${el.prefix ?? ""}${formatCount(val, decimals, language)}${el.suffix ?? ""}`;
  const widest = `${el.prefix ?? ""}${formatCount(Math.abs(el.value as number) >= Math.abs(from) ? (el.value as number) : from, decimals, language)}${el.suffix ?? ""}`;
  const size = Math.max(56, Math.min(92, Math.floor(780 / Math.max(5, [...widest].length * 0.62))));
  const w = Math.min(960, Math.round([...widest].length * size * 0.6 + 96));
  const c = col(ink, el.color, ink.accent);
  const tag = el.label ? String(el.label) : "";
  const up = interpolate(pop, [0, 1], [46, 0]);
  return (
    <div style={{ position: "absolute", left: (FRAME.w - w) / 2, top: PILL.y, width: w, height: PILL.h, opacity: Math.min(1, pop * 2), transform: `translateY(${up}px) scale(${interpolate(pop, [0, 1], [0.9, 1])})` }}>
      {tag ? (
        <div style={{ position: "absolute", left: "50%", top: -58, transform: "translateX(-50%)", padding: "0 22px", height: 42, display: "flex", alignItems: "center", borderRadius: 21, background: "rgba(8, 11, 22, 0.82)", border: "1.5px solid rgba(255,255,255,0.16)", color: "#FFFFFF", fontFamily: ink.look.display, fontWeight: 800, fontSize: 24, letterSpacing: 2.5, whiteSpace: "nowrap", textTransform: "uppercase" }}>{tag}</div>
      ) : null}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: PILL.h / 2,
          background: "linear-gradient(180deg, rgba(20, 25, 42, 0.92), rgba(7, 9, 18, 0.94))",
          border: "2px solid rgba(255,255,255,0.12)",
          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.1), 0 22px 44px rgba(0,0,0,0.6), 0 0 40px ${rgba(c, 0.16)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: ink.look.display, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: -1, color: c, fontVariantNumeric: "tabular-nums", textShadow: `0 0 28px ${rgba(c, 0.45)}, 0 4px 10px rgba(0,0,0,0.5)` }}>{text}</span>
      </div>
    </div>
  );
};

/* ================================================================ ledger ================================================================ */

const Underline: React.FC<{ w: number; color: string; q: number }> = ({ w, color, q }) => (
  <svg width={w} height={26} viewBox={`0 0 ${w} 26`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    <path d={`M 4 14 C ${w * 0.25} 6, ${w * 0.55} 20, ${w - 6} 9`} stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - q} />
  </svg>
);

/** A paper table: parchment (ledger) or blueprint sheet; rows are typed in one by one and the total gets a red underline. */
export const Ledger: React.FC<{ p: Planned; box: Box; index: number }> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el as El;
  const enter = useEnter(p.enter, index);
  const blueprint = el.paper === "blueprint";
  const w = Math.min(box.w, 720);
  const paperBg = blueprint ? mixDark(ink.accent3, 0.62) : `linear-gradient(180deg, ${PARCHMENT.top}, ${PARCHMENT.bottom})`;
  const inkText = blueprint ? "#EAF2FF" : PARCHMENT.ink;
  const faint = blueprint ? "rgba(234, 242, 255, 0.62)" : PARCHMENT.faint;
  const rule = blueprint ? "rgba(234, 242, 255, 0.5)" : "rgba(42, 31, 20, 0.45)";
  const mark = blueprint ? ink.accent : ink.bad;
  const rows = el.rows as { label: string; value: string }[];
  const total = el.total as { label: string; value: string } | undefined;
  const items = p.items;
  const lastItem = items[items.length - 1] ?? p.enter + 0.6;
  const under = progress(t, lastItem + 0.25, 0.7, Easing.bezier(0.45, 0, 0.3, 1));
  const font = ink.look.mono;
  return (
    <div style={{ position: "absolute", left: box.x + (box.w - w) / 2, top: box.y, width: w, height: box.h, ...enter }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          background: paperBg,
          transform: `rotate(${(el.tilt as number | undefined) ?? 0}deg)`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.55), 0 6px 14px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {blueprint ? (
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.1) 1.5px, transparent 1.5px)", backgroundSize: "34px 34px" }} />
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 40% at 18% 20%, rgba(${PARCHMENT.stain}, 0.16), transparent 70%), radial-gradient(ellipse 50% 35% at 84% 78%, rgba(${PARCHMENT.stain}, 0.2), transparent 70%)` }} />
            <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 70px rgba(${PARCHMENT.stain}, 0.35)` }} />
          </>
        )}
        <div style={{ position: "absolute", left: 40, right: 40, top: LEDGER.pad, bottom: LEDGER.pad, fontFamily: font, color: inkText }}>
          {el.title ? (
            <div style={{ height: LEDGER.title, display: "flex", alignItems: "center", fontWeight: 700, fontSize: 32, letterSpacing: 1, opacity: progress(t, p.enter + 0.2, 0.4) }}>{el.title}</div>
          ) : null}
          {el.columns ? (
            <div style={{ height: LEDGER.columns, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, letterSpacing: 2, color: faint, borderBottom: `2px solid ${rule}`, opacity: progress(t, p.enter + 0.3, 0.4) }}>
              <span>{el.columns[0]}</span>
              <span>{el.columns[1]}</span>
            </div>
          ) : null}
          {rows.map((r, i) => {
            const k = progress(t, items[i] ?? p.enter, 0.35);
            return (
              <div key={i} style={{ height: LEDGER.row, display: "flex", alignItems: "center", gap: 14, fontSize: 28, opacity: k, transform: `translateX(${(1 - k) * -14}px)` }}>
                <span style={{ whiteSpace: "nowrap" }}>{r.label}</span>
                <span style={{ flex: 1, alignSelf: "flex-end", height: 22, borderBottom: `3px dotted ${faint}`, opacity: 0.7 }} />
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{r.value}</span>
              </div>
            );
          })}
          {total ? (
            <div style={{ position: "relative", marginTop: 10, height: LEDGER.total - 10, borderTop: `3px solid ${rule}`, opacity: progress(t, items[rows.length] ?? lastItem, 0.35) }}>
              <div style={{ height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700, fontSize: 34 }}>
                <span>{total.label}</span>
                <span style={{ position: "relative" }}>
                  {total.value}
                  {el.underline ? (
                    <span style={{ position: "absolute", left: -10, right: -10, top: 46, height: 26 }}>
                      <Underline w={Math.max(120, [...total.value].length * 20 + 20)} color={mark} q={under} />
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ================================================================ scene composition ================================================================ */

/** The slot elements drawn behind the headline and the stage: backdrop, particle map, route, then the atmosphere over them. */
export const AtlasBack: React.FC<{ elements: Planned[]; index: number; sceneSec: number; moments?: Record<string, number> }> = ({ elements, index, sceneSec, moments }) => {
  const backdrop = elements.find((p) => p.el.type === "backdrop");
  const b = backdrop?.el as El | undefined;
  return (
    <>
      {b ? <Backdrop el={b} sceneSec={sceneSec} index={index} moments={moments} /> : null}
      {elements.filter((p) => p.el.type === "particle-field").map((p, i) => <ParticleField key={`pf${i}`} p={p} sceneSec={sceneSec} index={index * 10 + i} />)}
      <Atmosphere glow={b?.glow} haze={(b?.haze as number | undefined) ?? 0.5} index={index} />
      {elements.filter((p) => p.el.type === "route").map((p, i) => <RouteLine key={`rt${i}`} p={p} index={index * 10 + i} />)}
    </>
  );
};

/** The counter pill, above the stage. */
export const AtlasFront: React.FC<{ elements: Planned[]; language: string }> = ({ elements, language }) => (
  <>
    {elements.filter((p) => p.el.type === "counter-pill").map((p, i) => <CounterPill key={i} p={p} language={language} />)}
  </>
);
