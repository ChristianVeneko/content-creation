// Format elements (lib/illustration-schema.mjs): UI cards of the ui-cards format (post, chart, meter, hourglass,
// tags, stat, timer, panels) and the flat-shaded 2.5D set of the flat-depth format (object, character).
// They render in every look; colors come from the look's ink. Frame-pure: motion only from the scene clock.
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Box, Planned } from "../types";
import { MONO_FONT } from "../fonts";
import { inkOn, luminance, rgba, seeded } from "../util";
import { PhosphorIcon, col, itemP, panelStyle, progress, useEnter, useKit, usePop, useSec } from "./kit";

type EP = { p: Planned; box: Box; index: number };
type InkT = ReturnType<typeof useKit>["ink"];

const abs = (b: Box): React.CSSProperties => ({ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h });
const UP = (ink: InkT): React.CSSProperties["textTransform"] => (ink.look.upper ? "uppercase" : "none");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const isHex = (c: string) => /^#[0-9a-fA-F]{3,8}$/.test(c);
/** Mix a hex color toward white (k > 0) or black (k < 0). */
export const shade = (hex: string, k: number): string => {
  if (!isHex(hex)) return hex;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
};
/** The warmest/brightest accent: the "yellow" of a palette for stat badges and tags. */
const yellowOf = (ink: InkT) => {
  const score = (c: string) => {
    if (!isHex(c)) return -1;
    const n = parseInt(c.replace("#", "").slice(0, 6).padEnd(6, "0"), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return r + g - 2 * b;
  };
  return [ink.accent2, ink.accent, ink.accent3].sort((a, b) => score(b) - score(a))[0];
};
const textOn = (c: string) => (isHex(c) ? inkOn(c) : "#FFFFFF");
/** Card text color: readable on the look's surface. */
const cardText = (ink: InkT) => ink.text;
const fitPx = (text: string, width: number, em: number, max: number) => Math.floor(Math.min(max, width / Math.max(1, [...text].length * em)));

/* ================================================================ post ================================================================ */

const VerifiedDot: React.FC<{ color: string; size?: number }> = ({ color, size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" style={{ flex: `0 0 ${size}px` }}>
    <path d="M15 1.5 L18.6 4.6 L23.3 4.2 L24.2 8.8 L28.1 11.5 L26.2 15.8 L28.1 20.1 L24.2 22.8 L23.3 27.4 L18.6 27 L15 30 L11.4 27 L6.7 27.4 L5.8 22.8 L1.9 20.1 L3.8 15.8 L1.9 11.5 L5.8 8.8 L6.7 4.2 L11.4 4.6 Z" fill={color} />
    <path d="M9.5 15.5 L13.3 19.2 L20.8 11.6" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Post: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const w = Math.min(box.w, 860);
  const x0 = (box.w - w) / 2;
  const c = col(ink, el.color, ink.accent);
  const bg = ink.paper;
  const fg = ink.paperInk;
  const dark = isHex(bg) ? luminance(bg) < 0.3 : !ink.look.light;
  const hl = dark ? rgba(ink.accent3, 0.42) : rgba(yellowOf(ink), 0.55);
  const lines: string[] = el.lines;
  const highlight: number[] = (el.highlight ?? []).filter((k: number) => k < lines.length);
  const lastItem = p.items[p.items.length - 1] ?? p.enter;
  const hlAt = (j: number) => lastItem + 0.45 + j * 0.5;
  // magnifier glides over the highlighted lines, one after another
  let lens: { x: number; y: number; o: number } | null = null;
  const lineTop = (k: number) => 36 + 80 + 24 + k * 60;
  if (el.magnify && highlight.length) {
    const j = Math.max(0, Math.min(highlight.length - 1, Math.floor((t - hlAt(0)) / 0.5)));
    const q = progress(t, hlAt(j), 0.5, Easing.inOut(Easing.sin));
    const o = progress(t, hlAt(0) - 0.25, 0.25);
    lens = { x: interpolate(q, [0, 1], [70, w * 0.62]), y: lineTop(highlight[j]) + 26, o };
  }
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div style={{ ...panelStyle(ink), left: x0, top: 0, width: w, height: box.h, background: bg, border: `2px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, borderRadius: 26, padding: "36px 40px", boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, height: 80 }}>
          <div style={{ width: 68, height: 68, borderRadius: 34, background: `radial-gradient(circle at 35% 30%, ${shade(c, 0.35)}, ${c} 60%, ${shade(c, -0.25)})`, display: "flex", alignItems: "center", justifyContent: "center", color: textOn(c), fontFamily: ink.look.display, fontWeight: 900, fontSize: 32, boxShadow: `0 6px 14px ${rgba("#000000", 0.25)}` }}>
            {[...String(el.name)][0]?.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: ink.look.body, fontWeight: 800, fontSize: 34, color: fg }}>
              {el.name}
              {el.verified ? <VerifiedDot color={ink.accent3} /> : null}
            </div>
            {el.handle ? <div style={{ fontFamily: ink.look.body, fontWeight: 500, fontSize: 26, color: rgba(isHex(fg) ? fg : "#888888", 0.55) }}>{el.handle}</div> : null}
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          {lines.map((line, k) => {
            const q = itemP(t, p.items, k);
            const j = highlight.indexOf(k);
            const sweep = j >= 0 ? progress(t, hlAt(j), 0.45, Easing.inOut(Easing.quad)) : 0;
            return (
              <div key={k} style={{ minHeight: 54, marginBottom: 6, opacity: q, transform: `translateY(${(1 - q) * 14}px)` }}>
                <span
                  style={{
                    fontFamily: ink.look.body,
                    fontWeight: 600,
                    fontSize: 40,
                    lineHeight: "54px",
                    color: fg,
                    padding: "2px 6px",
                    marginLeft: -6,
                    backgroundImage: `linear-gradient(90deg, ${hl}, ${hl})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${sweep * 100}% 100%`,
                    borderRadius: 6,
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                  }}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>
        {lens && lens.o > 0 ? (
          <svg width={200} height={200} style={{ position: "absolute", left: lens.x - 70, top: lens.y - 70, overflow: "visible", opacity: lens.o }}>
            <circle cx={70} cy={70} r={58} fill="rgba(255,255,255,0.10)" stroke={dark ? "#FFFFFF" : "#1A1A1A"} strokeWidth={9} />
            <path d="M 34 52 A 40 40 0 0 1 60 30" stroke="rgba(255,255,255,0.65)" strokeWidth={6} fill="none" strokeLinecap="round" />
            <line x1={112} y1={112} x2={160} y2={160} stroke={dark ? "#FFFFFF" : "#1A1A1A"} strokeWidth={16} strokeLinecap="round" />
          </svg>
        ) : null}
      </div>
    </div>
  );
};

/* ================================================================ chart ================================================================ */

const Chart: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const w = Math.min(box.w, 860);
  const x0 = (box.w - w) / 2;
  const items: { label: string; value: number; expected?: number; color?: string }[] = el.items;
  const max = el.max ?? Math.max(...items.map((i) => Math.max(i.value, i.expected ?? 0))) * 1.08;
  const colors = [ink.accent, yellowOf(ink), ink.accent3, ink.good];
  const TITLE = el.title ? 76 : 0;
  const plotH = 250;
  const plotTop = TITLE + 70;
  const n = items.length;
  const slot = (w - 80) / n;
  const bw = Math.min(170, slot * 0.6);
  const unit = el.unit ?? "";
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div style={{ ...panelStyle(ink), left: x0, top: 0, width: w, height: box.h, borderRadius: Math.min(ink.look.panel.radius, 26) }}>
        {el.title ? <div style={{ position: "absolute", left: 0, right: 0, top: 30, textAlign: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 36, letterSpacing: 2, color: yellowOf(ink), textTransform: "uppercase" }}>{el.title}</div> : null}
        <div style={{ position: "absolute", left: 40, right: 40, top: plotTop + plotH, height: 3, background: rgba(isHex(ink.text) ? ink.text : "#FFFFFF", 0.25) }} />
        {items.map((it, k) => {
          const q = progress(t, p.items[k] ?? p.enter, 0.7, Easing.bezier(0.34, 1.3, 0.64, 1));
          const c = col(ink, it.color, colors[k % colors.length]);
          const h = Math.max(6, (it.value / max) * plotH) * q;
          const cx = 40 + slot * k + slot / 2;
          const eh = it.expected !== undefined ? (it.expected / max) * plotH : 0;
          const eq = progress(t, (p.items[k] ?? p.enter) + 0.6, 0.45);
          const v = it.value * Math.min(1, q);
          return (
            <React.Fragment key={k}>
              {it.expected !== undefined ? (
                <div style={{ position: "absolute", left: cx - bw / 2 - 8, top: plotTop + plotH - eh, width: bw + 16, height: eh, border: `4px dashed ${rgba(isHex(c) ? c : "#FFFFFF", 0.85)}`, borderBottom: "none", borderRadius: "10px 10px 0 0", opacity: eq, boxSizing: "border-box" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 12, textAlign: "center", fontFamily: MONO_FONT, fontWeight: 800, fontSize: 26, color: c }}>
                    {it.expected}
                    {unit}?
                  </div>
                </div>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: cx - bw / 2,
                  top: plotTop + plotH - h,
                  width: bw,
                  height: h,
                  borderRadius: "12px 12px 0 0",
                  background: `linear-gradient(90deg, ${shade(c, 0.12)} 0%, ${c} 55%, ${shade(c, -0.18)} 100%)`,
                  boxShadow: `inset 0 3px 0 ${rgba("#FFFFFF", 0.35)}, 0 12px 26px ${rgba("#000000", 0.3)}`,
                }}
              />
              <div style={{ position: "absolute", left: cx - slot / 2, width: slot, top: plotTop + plotH - h - 52, textAlign: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: cardText(ink), opacity: Math.min(1, q * 2) }}>
                {Number.isInteger(it.value) ? Math.round(v) : v.toFixed(1)}
                {unit}
              </div>
              <div style={{ position: "absolute", left: cx - slot / 2, width: slot, top: plotTop + plotH + 16, textAlign: "center", fontFamily: ink.look.body, fontWeight: 800, fontSize: fitPx(it.label, slot - 10, 0.62, 32), color: ink.muted, textTransform: "uppercase", letterSpacing: 1 }}>{it.label}</div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ================================================================ stamp (local) ================================================================ */

const FmtStamp: React.FC<{ text: string; start: number; color: string; cx: number; cy: number; size?: number }> = ({ text, start, color, cx, cy, size = 70 }) => {
  const { ink } = useKit();
  const t = useSec();
  const q = progress(t, start, 0.28, Easing.bezier(0.2, 1.6, 0.4, 1));
  if (t < start) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) rotate(-12deg) scale(${interpolate(q, [0, 1], [2.2, 1])})`,
        opacity: Math.min(1, q * 3),
        padding: "6px 28px",
        border: `7px solid ${color}`,
        borderRadius: 16,
        background: rgba("#FFFFFF", 0.92),
        color,
        fontFamily: ink.look.display,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: 3,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        boxShadow: `0 14px 30px ${rgba("#000000", 0.35)}`,
      }}
    >
      {text}
    </div>
  );
};

/* ================================================================ meter ================================================================ */

const norm = (v: number | undefined) => (v === undefined ? 0 : v > 1 ? v / 100 : v);

const Meter: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const c = col(ink, el.color, ink.accent3);
  const target = norm(el.value);
  const from = norm(el.from);
  const v = interpolate(t, [p.enter + 0.35, p.enter + 1.6], [from, target], { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  const LABEL = el.label ? 64 : 0;
  const shapeH = 440;
  const shape = el.shape ?? "jar";
  let art: React.ReactNode;
  if (shape === "battery") {
    const W = Math.min(box.w - 40, 620);
    const H = 230;
    const x = (box.w - W) / 2;
    art = (
      <svg width={box.w} height={shapeH} style={{ position: "absolute", left: 0, top: 0 }}>
        <rect x={x} y={(shapeH - H) / 2} width={W} height={H} rx={34} fill={rgba("#FFFFFF", 0.06)} stroke={rgba(isHex(ink.text) ? ink.text : "#FFFFFF", 0.75)} strokeWidth={10} />
        <rect x={x + W + 6} y={shapeH / 2 - 44} width={30} height={88} rx={10} fill={rgba(isHex(ink.text) ? ink.text : "#FFFFFF", 0.75)} />
        {Array.from({ length: 5 }, (_, k) => {
          const on = (k + 1) / 5 <= v + 0.05;
          const sw = (W - 40 - 4 * 14) / 5;
          return <rect key={k} x={x + 20 + k * (sw + 14)} y={(shapeH - H) / 2 + 20} width={sw} height={H - 40} rx={14} fill={on ? c : rgba(isHex(ink.text) ? ink.text : "#FFFFFF", 0.08)} />;
        })}
        <text x={box.w / 2} y={shapeH / 2 + 26} textAnchor="middle" fontFamily={ink.look.display} fontWeight={900} fontSize={76} fill={textOn(c)} opacity={v > 0.55 ? 1 : 0}>
          {Math.round(v * 100)}%
        </text>
      </svg>
    );
  } else if (shape === "gauge") {
    const R = 190;
    const cx = box.w / 2;
    const cy = 330;
    const a0 = Math.PI;
    const arc = (q: number) => `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R * Math.cos(a0 - Math.PI * q)} ${cy - R * Math.sin(Math.PI * q)}`;
    const na = a0 - Math.PI * v;
    art = (
      <svg width={box.w} height={shapeH} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={arc(1)} stroke={rgba(isHex(ink.text) ? ink.text : "#888888", 0.12)} strokeWidth={46} fill="none" strokeLinecap="round" />
        {v > 0.005 ? <path d={arc(v)} stroke={c} strokeWidth={46} fill="none" strokeLinecap="round" /> : null}
        <line x1={cx} y1={cy} x2={cx + (R - 60) * Math.cos(na)} y2={cy - (R - 60) * Math.sin(na)} stroke={ink.text} strokeWidth={12} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={20} fill={ink.text} />
        <text x={cx} y={cy + 84} textAnchor="middle" fontFamily={ink.look.display} fontWeight={900} fontSize={70} fill={ink.text}>
          {Math.round(v * 100)}%
        </text>
      </svg>
    );
  } else {
    // jar: glass body with a lid, a liquid that fills with a moving wave, bubbles and a label tag
    const W = 320;
    const H = 380;
    const x = (box.w - W) / 2;
    const y = 50;
    const level = y + H - 14 - (H - 40) * v;
    const ph = t * 2.2;
    let wave = `M ${x} ${level}`;
    for (let k = 0; k <= 16; k++) wave += ` L ${x + (W * k) / 16} ${level + Math.sin(ph + k * 0.8) * 7}`;
    wave += ` L ${x + W} ${y + H} L ${x} ${y + H} Z`;
    const glass = ink.look.light ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.09)";
    const rim = ink.look.light ? "rgba(60,50,90,0.35)" : "rgba(255,255,255,0.75)";
    const id = `jar${index}`;
    art = (
      <svg width={box.w} height={shapeH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <clipPath id={id}>
            <rect x={x + 6} y={y + 6} width={W - 12} height={H - 12} rx={46} />
          </clipPath>
          <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={isHex(c) ? shade(c, 0.15) : c} />
            <stop offset="0.6" stopColor={c} />
            <stop offset="1" stopColor={isHex(c) ? shade(c, -0.25) : c} />
          </linearGradient>
        </defs>
        <ellipse cx={x + W / 2} cy={y + H + 8} rx={W * 0.55} ry={18} fill="rgba(0,0,0,0.35)" style={{ filter: "blur(6px)" }} />
        <rect x={x} y={y} width={W} height={H} rx={52} fill={glass} />
        <g clipPath={`url(#${id})`}>
          <path d={wave} fill={`url(#${id}l)`} opacity={0.95} />
          <path d={wave} fill="none" stroke={rgba("#FFFFFF", 0.5)} strokeWidth={5} />
          {Array.from({ length: 7 }, (_, k) => {
            const bx = x + 40 + seeded(k * 5 + index) * (W - 80);
            const by = y + H - ((t * (30 + k * 6) + seeded(k) * 300) % Math.max(40, (H - 40) * v));
            return <circle key={k} cx={bx} cy={by} r={4 + (k % 3) * 2} fill="rgba(255,255,255,0.45)" />;
          })}
        </g>
        <rect x={x} y={y} width={W} height={H} rx={52} fill="none" stroke={rim} strokeWidth={8} />
        <path d={`M ${x + 34} ${y + 70} L ${x + 34} ${y + H - 80}`} stroke="rgba(255,255,255,0.45)" strokeWidth={12} strokeLinecap="round" />
        <rect x={x - 12} y={y - 34} width={W + 24} height={48} rx={14} fill={ink.look.light ? "#3A3158" : "#2A3246"} stroke={rim} strokeWidth={4} />
        {el.label ? (
          <g>
            <rect x={x + W / 2 - 120} y={y + 50} width={240} height={64} rx={10} fill="#FFFFFF" stroke="#1A1A1A" strokeWidth={4} />
            <text x={x + W / 2} y={y + 94} textAnchor="middle" fontFamily={ink.look.display} fontWeight={900} fontSize={fitPx(String(el.label), 210, 0.72, 34)} fill="#1A1A1A" style={{ textTransform: "uppercase" }}>
              {String(el.label).toUpperCase()}
            </text>
          </g>
        ) : null}
      </svg>
    );
  }
  return (
    <div style={{ ...abs(box), ...enter }}>
      {el.label && shape !== "jar" ? <div style={{ height: LABEL, textAlign: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: ink.text, textTransform: "uppercase", letterSpacing: 2 }}>{el.label}</div> : null}
      <div style={{ position: "absolute", left: 0, top: shape !== "jar" ? LABEL : LABEL / 2, width: box.w, height: shapeH }}>{art}</div>
      {el.caption ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: LABEL + shapeH + 6, textAlign: "center", fontFamily: ink.look.body, fontStyle: "italic", fontWeight: 500, fontSize: 30, color: ink.muted, opacity: progress(t, p.enter + 0.8, 0.4) }}>{el.caption}</div>
      ) : null}
      {el.stamp ? <FmtStamp text={el.stamp} start={(p.items[0] ?? p.enter + 1) + 0.1} color={ink.accent3 === c ? ink.accent : ink.accent3} cx={box.w / 2} cy={LABEL + shapeH * 0.55} /> : null}
    </div>
  );
};

/* ================================================================ hourglass ================================================================ */

const Hourglass: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const sand = col(ink, el.color, yellowOf(ink));
  const frameC = ink.look.light ? "#5A4A7A" : "#C9B48A";
  const q = interpolate(t, [p.enter + 0.3, p.enter + 6], [0, 1], { ...clamp });
  const W = 170;
  const H = 280;
  const x = box.w / 2 - W / 2;
  const y = 10;
  const mid = y + H / 2;
  const topSand = (1 - q) * 100; // height of sand in the top bulb
  const botSand = q * 100;
  const flip = 0;
  return (
    <div style={{ ...abs(box), ...enter }}>
      <svg width={box.w} height={300} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", transform: `rotate(${flip}deg)` }}>
        <defs>
          <clipPath id={`hgt${index}`}>
            <path d={`M ${x + 22} ${y + 22} L ${x + W - 22} ${y + 22} Q ${x + W - 22} ${mid - 30} ${box.w / 2 + 6} ${mid} L ${box.w / 2 - 6} ${mid} Q ${x + 22} ${mid - 30} ${x + 22} ${y + 22} Z`} />
          </clipPath>
          <clipPath id={`hgb${index}`}>
            <path d={`M ${box.w / 2 - 6} ${mid} L ${box.w / 2 + 6} ${mid} Q ${x + W - 22} ${mid + 30} ${x + W - 22} ${y + H - 22} L ${x + 22} ${y + H - 22} Q ${x + 22} ${mid + 30} ${box.w / 2 - 6} ${mid} Z`} />
          </clipPath>
        </defs>
        <ellipse cx={box.w / 2} cy={y + H + 6} rx={W * 0.6} ry={14} fill="rgba(0,0,0,0.35)" style={{ filter: "blur(5px)" }} />
        <path d={`M ${x + 22} ${y + 22} L ${x + W - 22} ${y + 22} Q ${x + W - 22} ${mid - 30} ${box.w / 2 + 6} ${mid} Q ${x + W - 22} ${mid + 30} ${x + W - 22} ${y + H - 22} L ${x + 22} ${y + H - 22} Q ${x + 22} ${mid + 30} ${box.w / 2 - 6} ${mid} Q ${x + 22} ${mid - 30} ${x + 22} ${y + 22} Z`} fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.7)" strokeWidth={5} />
        <g clipPath={`url(#hgt${index})`}>
          <rect x={x} y={mid - topSand} width={W} height={topSand} fill={sand} />
        </g>
        <g clipPath={`url(#hgb${index})`}>
          <path d={`M ${x} ${y + H - 22} L ${box.w / 2} ${y + H - 22 - botSand - 20} L ${x + W} ${y + H - 22} Z`} fill={sand} />
          <rect x={x} y={y + H - 22 - botSand * 0.55} width={W} height={botSand} fill={sand} />
        </g>
        {q < 1 ? <line x1={box.w / 2} y1={mid} x2={box.w / 2} y2={y + H - 30 - botSand * 0.55} stroke={sand} strokeWidth={4} strokeDasharray="6 5" strokeDashoffset={-t * 60} /> : null}
        <rect x={x - 6} y={y} width={W + 12} height={24} rx={8} fill={frameC} />
        <rect x={x - 6} y={y + H - 24} width={W + 12} height={24} rx={8} fill={frameC} />
        <rect x={x - 6} y={y} width={W + 12} height={6} rx={3} fill="rgba(255,255,255,0.35)" />
      </svg>
      {el.label ? <div style={{ position: "absolute", left: 0, right: 0, top: 306, textAlign: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 38, color: ink.text, textTransform: UP(ink), letterSpacing: 1 }}>{el.label}</div> : null}
    </div>
  );
};

/* ================================================================ tags ================================================================ */

const Tags: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const el = p.el;
  const items: { label: string; price: string; sub?: string; color?: string }[] = el.items;
  const n = items.length;
  const slot = box.w / n;
  const tw = Math.min(270, slot - 40);
  const colors = [ink.accent, yellowOf(ink), ink.accent3];
  return (
    <div style={abs(box)}>
      {items.map((it, k) => {
        const start = p.items[k] ?? p.enter;
        const s = spring({ frame: frame - Math.round(start * fps), fps, config: { damping: 6, stiffness: 90, mass: 0.9 } });
        const drop = interpolate(s, [0, 1], [-260, 0]);
        const swing = (1 - s) * (k % 2 ? 16 : -16) + Math.sin(t * 1.6 + k * 1.3) * 2.2;
        const c = col(ink, it.color, colors[k % colors.length]);
        const cx = slot * k + slot / 2;
        const str = 90;
        if (t < start) return null;
        return (
          <div key={k} style={{ position: "absolute", left: cx - tw / 2, top: 0, width: tw, height: box.h, transformOrigin: `50% 0px`, transform: `translateY(${drop}px) rotate(${swing}deg)` }}>
            <div style={{ position: "absolute", left: tw / 2 - 2, top: 0, width: 4, height: str + 14, background: rgba(isHex(ink.text) ? ink.text : "#888888", 0.6) }} />
            <div style={{ position: "absolute", left: tw / 2 - 9, top: -6, width: 18, height: 18, borderRadius: 9, background: ink.text }} />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: str,
                width: tw,
                height: 200,
                borderRadius: 24,
                background: `linear-gradient(180deg, ${shade(c, 0.12)}, ${c} 60%, ${shade(c, -0.1)})`,
                boxShadow: `inset 0 3px 0 ${rgba("#FFFFFF", 0.35)}, 0 8px 0 ${shade(c, -0.35)}, 0 30px 40px -12px rgba(0,0,0,0.55)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: textOn(c),
              }}
            >
              <div style={{ position: "absolute", left: tw / 2 - 12, top: 14, width: 24, height: 24, borderRadius: 12, background: rgba("#000000", 0.35), boxShadow: "inset 0 3px 4px rgba(0,0,0,0.4)" }} />
              <div style={{ marginTop: 26, fontFamily: ink.look.display, fontWeight: 900, fontSize: fitPx(it.label.toUpperCase(), tw - 30, 0.72, 40), textTransform: "uppercase", letterSpacing: 1 }}>{it.label}</div>
              <div style={{ fontFamily: ink.look.display, fontWeight: 900, fontSize: fitPx(it.price, tw - 30, 0.66, 64), lineHeight: 1.05 }}>{it.price}</div>
              {it.sub ? <div style={{ fontFamily: ink.look.body, fontWeight: 600, fontSize: 24, opacity: 0.75 }}>{it.sub}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ================================================================ stat ================================================================ */

const Stat: React.FC<EP> = ({ p, box }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const c = col(ink, el.color, yellowOf(ink));
  const pop = usePop(p.enter, { damping: 8, stiffness: 180 });
  const shine = progress(t, p.enter + 0.5, 0.8);
  const size = fitPx(String(el.value), Math.min(box.w, 760) - 120, 0.66, 140);
  const ink2 = textOn(c);
  return (
    <div style={{ ...abs(box), display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "14px 56px",
          height: 170,
          boxSizing: "border-box",
          borderRadius: 40,
          background: `linear-gradient(180deg, ${shade(c, 0.2)} 0%, ${c} 55%, ${shade(c, -0.08)} 100%)`,
          boxShadow: `inset 0 4px 0 ${rgba("#FFFFFF", 0.5)}, 0 12px 0 ${shade(c, -0.38)}, 0 40px 50px -14px rgba(0,0,0,0.55)`,
          color: ink2,
          fontFamily: ink.look.display,
          fontWeight: 900,
          fontSize: size,
          letterSpacing: -1,
          transform: `scale(${pop}) rotate(${interpolate(pop, [0, 1], [-10, -3])}deg)`,
          opacity: Math.min(1, pop * 3),
        }}
      >
        {el.icon ? <PhosphorIcon name={el.icon} size={Math.round(size * 0.8)} color={ink2} t={t} start={p.enter + 0.1} draw={false} /> : null}
        {el.value}
        <div style={{ position: "absolute", top: -20, bottom: -20, width: 90, left: `${-30 + shine * 150}%`, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0))", transform: "skewX(-20deg)" }} />
      </div>
      {el.label ? <div style={{ marginTop: 34, fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: ink.text, textTransform: UP(ink), textAlign: "center", opacity: progress(t, p.enter + 0.35, 0.3) }}>{el.label}</div> : null}
    </div>
  );
};

/* ================================================================ timer ================================================================ */

const parseClock = (s: string) => {
  const parts = s.split(":").map((x) => parseInt(x, 10));
  if (parts.some((x) => !Number.isFinite(x))) return null;
  return parts.reduce((a, b) => a * 60 + b, 0);
};
const fmtClock = (sec: number, like: string) => {
  const n = like.split(":").length;
  const out: number[] = [];
  let r = Math.max(0, sec);
  for (let k = 0; k < n; k++) {
    out.unshift(k === n - 1 ? r : r % 60);
    r = Math.floor(r / 60);
  }
  return out.map((v, k) => (k === 0 ? String(v) : String(v).padStart(2, "0"))).join(":");
};

const Timer: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const light = ink.look.light;
  const c = col(ink, el.color, light ? ink.accent : ink.bad);
  const base = parseClock(el.text);
  const text = el.countdown && base !== null ? fmtClock(base - Math.max(0, Math.floor(t - p.enter - 0.4)), el.text) : el.text;
  const CLOCK = el.clock ? 330 : 0;
  const face = yellowOf(ink);
  const hm = parseClock(el.text) ?? 0;
  const ang = (n: number) => (n * Math.PI) / 180;
  const minA = ((hm % 60) / 60) * 360 + t * 24;
  const hrA = (((Math.floor(hm / 60) % 12) + (hm % 60) / 60) / 12) * 360 + t * 2;
  const fs = fitPx(text, Math.min(box.w, 640) - 80, 0.62, 104);
  const blink = el.countdown ? 0.75 + 0.25 * Math.abs(Math.cos(t * Math.PI)) : 1;
  return (
    <div style={{ ...abs(box), ...enter, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {el.clock ? (
        <svg width={300} height={300} style={{ marginTop: 6, overflow: "visible" }}>
          <ellipse cx={150} cy={296} rx={120} ry={14} fill="rgba(0,0,0,0.35)" style={{ filter: "blur(6px)" }} />
          <circle cx={150} cy={145} r={140} fill="#FFFFFF" />
          <circle cx={150} cy={145} r={124} fill={face} />
          <circle cx={150} cy={145} r={124} fill="url(#none)" stroke={rgba("#000000", 0.08)} strokeWidth={10} />
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={146} y={32} width={8} height={k % 3 ? 10 : 18} rx={3} fill="#FFFFFF" transform={`rotate(${k * 30} 150 145)`} />
          ))}
          <line x1={150} y1={145} x2={150 + 62 * Math.sin(ang(hrA))} y2={145 - 62 * Math.cos(ang(hrA))} stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round" />
          <line x1={150} y1={145} x2={150 + 96 * Math.sin(ang(minA))} y2={145 - 96 * Math.cos(ang(minA))} stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" />
          <circle cx={150} cy={145} r={12} fill="#FFFFFF" />
        </svg>
      ) : null}
      <div
        style={{
          marginTop: el.clock ? 22 : 0,
          padding: el.label ? "10px 42px 16px" : "16px 42px",
          borderRadius: 18,
          background: light ? "rgba(255,255,255,0.75)" : `linear-gradient(180deg, ${rgba(isHex(c) ? c : "#E5484D", 0.25)}, ${rgba("#000000", 0.55)})`,
          border: `5px solid ${c}`,
          boxShadow: `0 0 34px ${rgba(isHex(c) ? c : "#E5484D", 0.45 * blink)}, inset 0 0 22px ${rgba(isHex(c) ? c : "#E5484D", 0.3)}, 0 26px 40px -12px rgba(0,0,0,0.6)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${CLOCK ? 0 : 0}px)`,
        }}
      >
        {el.label ? <div style={{ fontFamily: ink.look.display, fontWeight: 900, fontSize: 30, letterSpacing: 3, color: light ? c : "#FFFFFF", opacity: light ? 1 : 0.9, textTransform: "uppercase" }}>{el.label}</div> : null}
        <div style={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: fs, lineHeight: 1.05, color: light ? ink.text : "#FFFFFF", textShadow: light ? "none" : `0 0 18px ${rgba(isHex(c) ? c : "#E5484D", 0.9)}`, fontVariantNumeric: "tabular-nums" }}>{text}</div>
      </div>
    </div>
  );
};

/* ================================================================ panels ================================================================ */

const Panels: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const items: { title: string; text?: string; icon?: string; tag?: string; color?: string }[] = el.items;
  const n = items.length;
  const narrow = box.w < 520;
  const gap = 26;
  const pw = narrow ? box.w : (box.w - gap * (n - 1)) / n;
  const ph = narrow ? 190 : box.h;
  const colors = [yellowOf(ink), ink.accent, ink.accent3];
  const winP = el.winner !== undefined ? progress(t, (p.items[n - 1] ?? p.enter) + 0.7, 0.4) : 0;
  return (
    <div style={abs(box)}>
      {items.map((it, k) => {
        const c = col(ink, it.color, colors[k % colors.length]);
        const q = itemP(t, p.items, k, 0.5);
        const win = el.winner === k;
        const x = narrow ? 0 : k * (pw + gap);
        const y = narrow ? 60 + k * (ph + 20) : 0;
        const lift = win ? -18 * winP : 0;
        return (
          <div
            key={k}
            style={{
              ...panelStyle(ink, win && winP > 0 ? c : undefined),
              left: x,
              top: y,
              width: pw,
              height: ph,
              boxSizing: "border-box",
              padding: narrow ? "18px 22px" : "30px 22px 26px",
              display: "flex",
              flexDirection: narrow ? "row" : "column",
              alignItems: "center",
              gap: narrow ? 18 : 10,
              border: `4px solid ${win && winP > 0 ? c : rgba(isHex(c) ? c : "#FFFFFF", 0.55)}`,
              opacity: q * (el.winner !== undefined && !win ? 1 - 0.35 * winP : 1),
              transform: `translateY(${(1 - q) * 60 + lift}px) scale(${win ? 1 + 0.03 * winP : 1 - 0.02 * winP})`,
              boxShadow: win && winP > 0 ? `0 0 ${50 * winP}px ${rgba(isHex(c) ? c : "#FFFFFF", 0.4)}, 0 40px 60px -20px rgba(0,0,0,0.6)` : (panelStyle(ink).boxShadow as string),
            }}
          >
            <div style={{ flex: narrow ? 1 : "0 0 auto", textAlign: narrow ? "left" : "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: fitPx(it.title, (narrow ? pw - 220 : pw - 40) * 2.1, ink.look.displayEm, 38), lineHeight: 1.12, color: ink.text, textTransform: UP(ink), minHeight: narrow ? undefined : 90 }}>{it.title}</div>
            {!narrow ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {it.icon ? (
                  <div style={{ width: 150, height: 150, borderRadius: 75, background: `radial-gradient(circle at 35% 30%, ${rgba(isHex(c) ? c : "#FFFFFF", 0.35)}, ${rgba(isHex(c) ? c : "#FFFFFF", 0.1)})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `inset 0 2px 0 rgba(255,255,255,0.2)` }}>
                    <PhosphorIcon name={it.icon} size={96} color={c} t={t} start={(p.items[k] ?? p.enter) + 0.15} />
                  </div>
                ) : it.text ? (
                  <div style={{ fontFamily: ink.look.body, fontWeight: 600, fontSize: 30, color: ink.muted, textAlign: "center" }}>{it.text}</div>
                ) : null}
              </div>
            ) : it.icon ? (
              <PhosphorIcon name={it.icon} size={72} color={c} t={t} start={(p.items[k] ?? p.enter) + 0.15} />
            ) : null}
            {it.tag ? (
              <div style={{ flex: "0 0 auto", padding: "10px 30px", borderRadius: 14, background: `linear-gradient(180deg, ${shade(c, 0.15)}, ${c})`, color: textOn(c), fontFamily: ink.look.display, fontWeight: 900, fontSize: 34, textTransform: "uppercase", letterSpacing: 1, boxShadow: `0 6px 0 ${shade(c, -0.35)}`, whiteSpace: "nowrap" }}>{it.tag}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

/* ================================================================ object (2.5D) ================================================================ */

/** Caption of an object or a character: a small dark pill, readable on a wooden table or a wall. */
const SetLabel: React.FC<{ text: string; top: number; o: number }> = ({ text, top, o }) => {
  const { ink } = useKit();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ padding: "6px 22px", borderRadius: 24, background: ink.look.light ? "rgba(255,255,255,0.8)" : "rgba(12,12,40,0.62)", color: ink.look.light ? ink.text : "#FFFFFF", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 32, lineHeight: 1.2, textTransform: UP(ink), whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(0,0,0,0.3)" }}>{text}</div>
    </div>
  );
};

/** One flat-shaded object drawn in a 300x300 box, origin at the bottom center of its footprint (150, 270). */
const ObjectArt: React.FC<{ kind: string; ink: InkT; t: number; value?: number; seed: number }> = ({ kind, ink, t, value, seed }) => {
  const a = ink.accent3;
  const b = ink.accent2;
  switch (kind) {
    case "laptop": {
      // base slab in perspective (lit top, shaded front) and a screen tilted back
      return (
        <g>
          <polygon points="40,212 238,212 280,262 20,262" fill="#D6D9EC" />
          <polygon points="20,262 280,262 280,274 20,274" fill="#9FA4C4" />
          <polygon points="70,222 222,222 246,250 54,250" fill="#2B2E55" />
          {Array.from({ length: 5 }, (_, r) => (
            <line key={r} x1={64 + r * 2} y1={226 + r * 5} x2={236 - r * 2} y2={226 + r * 5} stroke="#3D4176" strokeWidth={2} />
          ))}
          <polygon points="128,254 188,254 192,260 124,260" fill="#B9BDD8" />
          <polygon points="52,214 228,214 246,72 70,72" fill="#1D1F3A" />
          <polygon points="62,206 220,206 236,82 78,82" fill={`url(#scr${seed})`} />
          <defs>
            <linearGradient id={`scr${seed}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={shade(a, 0.1)} />
              <stop offset="0.55" stopColor="#8A6BE8" />
              <stop offset="1" stopColor={shade(b, 0.1)} />
            </linearGradient>
          </defs>
          <ellipse cx={180} cy={120} rx={48} ry={60} fill={rgba("#FFFFFF", 0.18)} />
          <ellipse cx={120} cy={180} rx={70} ry={36} fill={rgba(isHex(b) ? b : "#FFFFFF", 0.45)} />
          <polygon points="236,82 246,72 228,214 220,206" fill="#2C2F55" />
        </g>
      );
    }
    case "phone":
      return (
        <g>
          <rect x={104} y={40} width={110} height={226} rx={22} fill="#24264A" />
          <rect x={92} y={36} width={110} height={226} rx={22} fill="#33366A" />
          <rect x={100} y={46} width={94} height={206} rx={16} fill={`url(#ph${seed})`} />
          <defs>
            <linearGradient id={`ph${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={shade(a, 0.2)} />
              <stop offset="1" stopColor={shade(b, -0.05)} />
            </linearGradient>
          </defs>
          <rect x={130} y={54} width={34} height={8} rx={4} fill="#1A1C38" />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={112} y={92 + k * 46} width={70} height={30} rx={8} fill={rgba("#FFFFFF", 0.35 - k * 0.08)} />
          ))}
        </g>
      );
    case "coins": {
      const n = Math.max(1, Math.min(12, value ?? 6));
      const step = 17;
      const top = 262 - n * step;
      return (
        <g>
          {Array.from({ length: n }, (_, k) => {
            const y = 262 - k * step;
            const wob = (seeded(k * 7 + seed) - 0.5) * 6;
            return (
              <g key={k} transform={`translate(${wob} 0)`}>
                <path d={`M 62 ${y - 10} L 62 ${y + 2} A 88 26 0 0 0 238 ${y + 2} L 238 ${y - 10} Z`} fill="#D49B1E" />
                {Array.from({ length: 9 }, (_, r) => (
                  <line key={r} x1={74 + r * 19} y1={y - 6 + Math.sin((r / 8) * Math.PI) * 18} x2={74 + r * 19} y2={y + 2 + Math.sin((r / 8) * Math.PI) * 22} stroke="#B07A12" strokeWidth={2} opacity={0.5} />
                ))}
                <ellipse cx={150} cy={y - 10} rx={88} ry={26} fill="#F4C53C" />
              </g>
            );
          })}
          <ellipse cx={150} cy={top - 10 + step} rx={88} ry={26} fill="#FFD95A" />
          <ellipse cx={150} cy={top - 10 + step} rx={62} ry={17} fill="none" stroke="#E0A92A" strokeWidth={5} />
          <ellipse cx={126} cy={top - 16 + step} rx={22} ry={6} fill="#FFF1B8" opacity={0.7} />
        </g>
      );
    }
    case "box":
      return (
        <g>
          <polygon points="60,130 200,130 240,100 100,100" fill="#E8BC84" />
          <polygon points="60,130 200,130 200,266 60,266" fill="#CF955A" />
          <polygon points="200,130 240,100 240,236 200,266" fill="#A9733F" />
          <polygon points="122,100 142,100 104,130 84,130" fill="#F6E2C2" opacity={0.8} />
          <rect x={84} y={130} width={20} height={136} fill="#E9C99A" opacity={0.6} />
          <rect x={76} y={196} width={70} height={40} rx={4} fill="#F4E6CF" />
          <line x1={84} y1={208} x2={136} y2={208} stroke="#A9733F" strokeWidth={3} />
          <line x1={84} y1={222} x2={122} y2={222} stroke="#A9733F" strokeWidth={3} />
        </g>
      );
    case "books": {
      const cs = [ink.accent, a, b];
      return (
        <g>
          {cs.map((c, k) => {
            const y = 236 - k * 44;
            const dx = (k % 2 ? 14 : -8) + 0;
            return (
              <g key={k} transform={`translate(${dx} 0)`}>
                <polygon points={`60,${y} 220,${y} 244,${y - 18} 84,${y - 18}`} fill={shade(c, 0.25)} />
                <rect x={60} y={y} width={160} height={40} fill={c} />
                <polygon points={`220,${y} 244,${y - 18} 244,${y + 22} 220,${y + 40}`} fill="#F3EBDD" />
                <rect x={60} y={y + 8} width={160} height={6} fill={rgba("#FFFFFF", 0.3)} />
              </g>
            );
          })}
        </g>
      );
    }
    case "mug": {
      const c = ink.accent2;
      const steam = Array.from({ length: 3 }, (_, k) => {
        const o = (t * 0.6 + k / 3) % 1;
        return { y: 110 - o * 80, o: Math.sin(o * Math.PI) * 0.5, x: 120 + k * 26 };
      });
      return (
        <g>
          {steam.map((s, k) => (
            <path key={k} d={`M ${s.x} ${s.y + 40} q 12 -14 0 -26 q -12 -14 0 -28`} stroke="#FFFFFF" strokeWidth={6} fill="none" strokeLinecap="round" opacity={s.o} />
          ))}
          <path d="M 200 170 q 52 0 52 40 q 0 40 -52 40" stroke={shade(c, -0.25)} strokeWidth={18} fill="none" />
          <path d="M 86 150 L 86 248 Q 86 268 146 268 Q 206 268 206 248 L 206 150 Z" fill={c} />
          <path d="M 166 150 L 166 266 Q 196 262 206 248 L 206 150 Z" fill={shade(c, -0.2)} />
          <rect x={100} y={160} width={14} height={80} rx={7} fill={rgba("#FFFFFF", 0.3)} />
          <ellipse cx={146} cy={150} rx={60} ry={16} fill={shade(c, 0.2)} />
          <ellipse cx={146} cy={152} rx={50} ry={11} fill="#5A3A22" />
        </g>
      );
    }
    case "monitor":
      return (
        <g>
          <polygon points="104,262 196,262 182,236 118,236" fill="#B9BDD8" />
          <rect x={140} y={196} width={20} height={44} fill="#9FA4C4" />
          <rect x={36} y={48} width={232} height={156} rx={14} fill="#1D1F3A" />
          <rect x={30} y={44} width={232} height={156} rx={14} fill="#2B2E55" />
          <rect x={42} y={56} width={208} height={132} rx={6} fill={`url(#mn${seed})`} />
          <defs>
            <linearGradient id={`mn${seed}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={shade(a, 0.15)} />
              <stop offset="1" stopColor={shade(ink.accent, 0.05)} />
            </linearGradient>
          </defs>
          <rect x={58} y={74} width={90} height={14} rx={7} fill={rgba("#FFFFFF", 0.6)} />
          <rect x={58} y={100} width={150} height={10} rx={5} fill={rgba("#FFFFFF", 0.35)} />
          <rect x={58} y={120} width={120} height={10} rx={5} fill={rgba("#FFFFFF", 0.35)} />
          <rect x={58} y={146} width={70} height={28} rx={8} fill={rgba("#FFFFFF", 0.75)} />
        </g>
      );
    case "plant":
    default: {
      const sway = Math.sin(t * 1.2 + seed) * 3;
      return (
        <g>
          <g transform={`rotate(${sway} 150 190)`}>
            {[-50, -20, 10, 40, 64].map((r, k) => (
              <ellipse key={k} cx={150} cy={120} rx={22} ry={70} fill={k % 2 ? "#3FAE6A" : "#2E9257"} transform={`rotate(${r} 150 190)`} />
            ))}
            <ellipse cx={150} cy={120} rx={8} ry={60} fill="#5CC985" opacity={0.6} transform="rotate(-20 150 190)" />
          </g>
          <polygon points="96,190 204,190 190,266 110,266" fill="#D9774A" />
          <polygon points="160,190 204,190 190,266 166,266" fill="#B35C35" />
          <rect x={90} y={180} width={120} height={22} rx={6} fill="#E88B5D" />
        </g>
      );
    }
  }
};

const FlatObject: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const count = el.count ?? 1;
  const LABEL = el.label ? 64 : 0;
  const H = box.h - LABEL;
  const S = Math.min(H / 290, 1.25);
  // copies recede to the right and up toward the vanishing point, smaller and hazier
  const copies = Array.from({ length: count }, (_, j) => j).reverse();
  return (
    <div style={{ ...abs(box), ...enter }}>
      <svg width={box.w} height={H} viewBox={`0 0 ${box.w} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {copies.map((j) => {
          const k = Math.pow(0.72, j);
          const s = S * k;
          const cx = count > 1 ? box.w * 0.34 + j * box.w * 0.2 : box.w / 2;
          const by = H - 6 - j * 46 * S;
          const q = progress(t, p.enter + j * 0.12, 0.45, Easing.bezier(0.34, 1.5, 0.64, 1));
          return (
            <g key={j} transform={`translate(${cx - 150 * s} ${by - 270 * s + (1 - q) * -60}) scale(${s})`} opacity={Math.min(1, q * 2) * (1 - j * 0.08)}>
              <ellipse cx={150} cy={272} rx={140} ry={20} fill="rgba(10,8,30,0.45)" style={{ filter: "blur(7px)" }} />
              <ObjectArt kind={el.kind} ink={ink} t={t} value={el.value} seed={index * 10 + j} />
            </g>
          );
        })}
      </svg>
      {el.label ? <SetLabel text={el.label} top={H + 10} o={progress(t, p.enter + 0.4, 0.3)} /> : null}
    </div>
  );
};

/* ================================================================ character ================================================================ */

const SKIN = { light: "#F6C9A4", shade: "#E3A982" };

const Face: React.FC<{ mood: string; cx: number; cy: number; blink: number; t: number; square?: boolean }> = ({ mood, cx, cy, blink, t, square }) => {
  const eyeY = cy - 6 + (mood === "thinking" ? -6 : 0);
  const look = mood === "thinking" ? 8 : 0;
  const ink = "#1C1B2E";
  const eye = (x: number) =>
    square ? <rect x={x - 11} y={eyeY - 13 * blink} width={22} height={Math.max(3, 26 * blink)} fill={ink} /> : <ellipse cx={x + look} cy={eyeY} rx={11} ry={Math.max(2, 14 * blink)} fill={ink} />;
  const brow = (x: number, dir: number) => {
    if (mood === "angry") return <line x1={x - 16} y1={eyeY - 30 - dir * 8} x2={x + 16} y2={eyeY - 30 + dir * 8} stroke={ink} strokeWidth={6} strokeLinecap="round" />;
    if (mood === "sad") return <line x1={x - 16} y1={eyeY - 26 + dir * 7} x2={x + 16} y2={eyeY - 26 - dir * 7} stroke={ink} strokeWidth={6} strokeLinecap="round" />;
    if (mood === "surprised") return <path d={`M ${x - 16} ${eyeY - 32} q 16 -12 32 0`} stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
    if (mood === "thinking" && dir < 0) return <path d={`M ${x - 16} ${eyeY - 34} q 16 -10 32 -2`} stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
    return null;
  };
  const my = cy + 40;
  let mouth: React.ReactNode;
  switch (mood) {
    case "happy":
      mouth = <path d={`M ${cx - 30} ${my - 6} Q ${cx} ${my + 26} ${cx + 30} ${my - 6}`} stroke={ink} strokeWidth={8} fill="none" strokeLinecap="round" />;
      break;
    case "sad":
      mouth = <path d={`M ${cx - 24} ${my + 10} Q ${cx} ${my - 12} ${cx + 24} ${my + 10}`} stroke={ink} strokeWidth={8} fill="none" strokeLinecap="round" />;
      break;
    case "surprised":
      mouth = <ellipse cx={cx} cy={my + 4} rx={13} ry={17 + Math.sin(t * 6) * 1.5} fill={ink} />;
      break;
    case "thinking":
      mouth = <path d={`M ${cx - 6} ${my + 4} q 16 -6 30 2`} stroke={ink} strokeWidth={7} fill="none" strokeLinecap="round" />;
      break;
    case "angry":
      mouth = <path d={`M ${cx - 26} ${my + 8} Q ${cx} ${my - 4} ${cx + 26} ${my + 8}`} stroke={ink} strokeWidth={8} fill="none" strokeLinecap="round" />;
      break;
    default:
      mouth = <line x1={cx - 24} y1={my + 2} x2={cx + 24} y2={my + 2} stroke={ink} strokeWidth={8} strokeLinecap="round" />;
  }
  return (
    <g>
      {eye(cx - 34)}
      {eye(cx + 34)}
      {brow(cx - 34, -1)}
      {brow(cx + 34, 1)}
      {mouth}
      {mood === "happy" ? (
        <>
          <ellipse cx={cx - 56} cy={cy + 26} rx={14} ry={8} fill="#F08A8A" opacity={0.45} />
          <ellipse cx={cx + 56} cy={cy + 26} rx={14} ry={8} fill="#F08A8A" opacity={0.45} />
        </>
      ) : null}
    </g>
  );
};

const Character: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const frame = useCurrentFrame();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const shirt = col(ink, el.shirt, ink.accent2);
  const hair = col(ink, el.hair, ["#4A3326", "#1E1B2A", "#7A4A2A", "#B88A54"][index % 4]);
  const LABEL = el.label ? 64 : 0;
  const H = box.h - LABEL;
  const S = Math.min(H / 420, box.w / 340, 1.2);
  const bob = Math.sin(t * 2.1 + index) * 3;
  // blink for 4 frames every ~3.4 s, offset per character
  const cyc = (frame + index * 37) % 102;
  const blink = cyc < 4 ? [0.5, 0.1, 0.1, 0.5][cyc] : 1;
  const mood = el.mood ?? "neutral";
  const wave = mood === "happy" ? Math.sin(t * 5) * 10 : 0;
  const blocky = el.style === "blocky";
  return (
    <div style={{ ...abs(box), ...enter }}>
      <svg width={box.w} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`translate(${box.w / 2 - 170 * S} ${H - 420 * S}) scale(${S})`}>
          <ellipse cx={170} cy={414} rx={120} ry={14} fill="rgba(10,8,30,0.45)" style={{ filter: "blur(6px)" }} />
          {blocky ? (
            <g transform={`translate(0 ${bob})`}>
              <rect x={86} y={250} width={168} height={160} fill={shirt} />
              <rect x={210} y={250} width={44} height={160} fill={shade(shirt, -0.22)} />
              <rect x={52} y={266} width={34} height={96} fill={shade(shirt, -0.1)} transform={`rotate(${-wave} 69 266)`} />
              <rect x={254} y={266} width={34} height={96} fill={shade(shirt, -0.3)} />
              <rect x={70} y={56} width={200} height={190} fill={SKIN.light} />
              <rect x={226} y={56} width={44} height={190} fill={SKIN.shade} />
              <rect x={70} y={40} width={200} height={42} fill={hair} />
              <rect x={70} y={40} width={200} height={12} fill={shade(hair, 0.2)} />
              <Face mood={mood} cx={160} cy={150} blink={blink} t={t} square />
            </g>
          ) : (
            <g transform={`translate(0 ${bob})`}>
              <path d="M 60 410 L 60 330 Q 60 262 170 262 Q 280 262 280 330 L 280 410 Z" fill={shirt} />
              <path d="M 210 266 Q 280 274 280 330 L 280 410 L 226 410 Z" fill={shade(shirt, -0.22)} />
              <path d="M 120 268 Q 170 300 220 268" stroke={shade(shirt, -0.3)} strokeWidth={8} fill="none" />
              <rect x={148} y={226} width={44} height={44} rx={10} fill={SKIN.shade} />
              <circle cx={170} cy={140} r={104} fill={SKIN.light} />
              <path d="M 222 52 A 104 104 0 0 1 222 228 A 120 120 0 0 0 222 52 Z" fill={SKIN.shade} opacity={0.8} />
              <circle cx={68} cy={150} r={20} fill={SKIN.shade} />
              <circle cx={272} cy={150} r={20} fill={SKIN.shade} />
              <path d="M 64 134 Q 60 30 170 30 Q 282 30 276 134 Q 250 78 170 82 Q 92 84 64 134 Z" fill={hair} />
              <path d="M 100 60 Q 150 40 210 52" stroke={shade(hair, 0.25)} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.7} />
              <Face mood={mood} cx={170} cy={150} blink={blink} t={t} />
            </g>
          )}
        </g>
      </svg>
      {el.label ? <SetLabel text={el.label} top={H + 10} o={progress(t, p.enter + 0.4, 0.3)} /> : null}
    </div>
  );
};

/** Renderer of a format element type, or null when the type is not a format element. */
export const FormatElement: React.FC<EP> = (props) => {
  switch (props.p.el.type) {
    case "post":
      return <Post {...props} />;
    case "chart":
      return <Chart {...props} />;
    case "meter":
      return <Meter {...props} />;
    case "hourglass":
      return <Hourglass {...props} />;
    case "tags":
      return <Tags {...props} />;
    case "stat":
      return <Stat {...props} />;
    case "timer":
      return <Timer {...props} />;
    case "panels":
      return <Panels {...props} />;
    case "object":
      return <FlatObject {...props} />;
    case "character":
      return <Character {...props} />;
    default:
      return null;
  }
};
export const FORMAT_ELEMENT_TYPES = new Set(["post", "chart", "meter", "hourglass", "tags", "stat", "timer", "panels", "object", "character"]);
