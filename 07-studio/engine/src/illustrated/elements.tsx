// The illustration element vocabulary. Each element renders inside its planned box (stage coordinates)
// and animates from its planned entrance/item times. No emoji: every visual is SVG or styled HTML.
import React from "react";
import { Easing, interpolate } from "remotion";
import type { Box, Planned } from "../types";
import { MONO_FONT, fontStack } from "../fonts";
import { inkOn, luminance, rgba } from "../util";
import { burstPoints, scrapUri, washUri } from "./artstyles";
import { FORMAT_ELEMENT_TYPES, FormatElement } from "./format-elements";
import { DrawingSvg } from "../components/Drawing2D";
import { inkColors, lookDrawingSkin } from "./drawing-skin";
import { DrawPath, PhosphorIcon, RoughFrame, RoughShape, col, idle, itemP, panelStyle, progress, useEnter, useKit, usePop, useSec } from "./kit";

const fontStackMontserrat = fontStack("Montserrat");
// Fonts and case come from the look (blueprint = Montserrat 900 / Inter, as before).
type InkT = ReturnType<typeof useKit>["ink"];
const UP = (ink: InkT): React.CSSProperties["textTransform"] => (ink.look.upper ? "uppercase" : "none");
const label = (x: unknown): string => (typeof x === "string" ? x : ((x as { label?: string; text?: string }).label ?? (x as { text?: string }).text ?? ""));
const iconOf = (x: unknown): string | undefined => (typeof x === "object" && x ? (x as { icon?: string }).icon : undefined);
const abs = (b: Box): React.CSSProperties => ({ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h });

type EP = { p: Planned; box: Box; index: number };

/* ---------------- card ---------------- */
const Card: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const c = col(ink, el.color, ink.accent3);
  const enter = useEnter(p.enter, index);
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div style={{ ...panelStyle(ink, c), inset: 0, display: "flex", flexDirection: box.w < 520 ? "column" : "row", gap: box.w < 520 ? 16 : 28, padding: box.w < 520 ? "30px 28px" : "40px 36px", alignItems: "flex-start" }}>
        {ink.look.panel.accentBar && ink.look.id !== "broadcast" ? <div style={{ position: "absolute", left: 0, top: 26, bottom: 26, width: 8, borderRadius: 4, background: c }} /> : null}
        <RoughFrame w={box.w} h={box.h} start={p.enter} color={c} seed={index + 1} />
        {el.icon ? (
          <div style={{ flex: "0 0 96px", height: 96, borderRadius: 24, background: rgba(c, 0.14), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PhosphorIcon name={el.icon} size={66} color={c} t={t} start={p.enter + 0.15} />
          </div>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 54, lineHeight: 1.12, color: ink.text, textTransform: UP(ink), letterSpacing: -0.5 }}>{el.title}</div>
          {(el.body ?? []).map((line: string, k: number) => {
            const q = itemP(t, p.items, k);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: k === 0 ? 16 : 6, opacity: q, transform: `translateX(${(1 - q) * -30}px)` }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: c, flex: "0 0 14px" }} />
                <div style={{ fontFamily: ink.look.body, fontWeight: 600, fontSize: 38, lineHeight: 1.3, color: rgba(ink.text, 0.86) }}>{line}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- arrow (drawn) ---------------- */
const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; t: number; start: number; color: string; width?: number }> = ({ x1, y1, x2, y2, t, start, color, width = 7 }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 20;
  const head = `M ${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} L ${x2} ${y2} L ${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}`;
  return (
    <>
      <DrawPath d={`M ${x1} ${y1} L ${x2} ${y2}`} t={t} start={start} dur={0.3} stroke={color} width={width} />
      <DrawPath d={head} t={t} start={start + 0.25} dur={0.15} stroke={color} width={width} />
    </>
  );
};

/* ---------------- flow ---------------- */
const Flow: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const nodes: unknown[] = el.nodes;
  const colors = [ink.accent2, ink.accent3, ink.accent, ink.good, ink.accent2, ink.accent3];
  const latest = p.items.filter((x) => t >= x).length - 1;
  if (el.direction === "horizontal") {
    const n = nodes.length;
    const gap = 54;
    const w = (box.w - gap * (n - 1)) / n;
    return (
      <div style={abs(box)}>
        <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {nodes.slice(1).map((_, k) => (
            <Arrow key={k} x1={(k + 1) * (w + gap) - gap + 6} y1={box.h / 2} x2={(k + 1) * (w + gap) - 8} y2={box.h / 2} t={t} start={p.items[k + 1] - 0.3} color={ink.muted} width={6} />
          ))}
        </svg>
        {nodes.map((nd, k) => (
          <FlowNode key={k} box={{ x: k * (w + gap), y: 0, w, h: box.h }} text={label(nd)} icon={iconOf(nd)} color={colors[k % colors.length]} start={p.items[k]} active={k === latest} seed={index * 10 + k} vertical={false} />
        ))}
      </div>
    );
  }
  const nodeH = 92;
  const gap = 52;
  const w = Math.min(box.w, 680);
  const x0 = (box.w - w) / 2;
  return (
    <div style={abs(box)}>
      <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {nodes.slice(1).map((_, k) => {
          const y1 = (k + 1) * (nodeH + gap) - gap + 6;
          return <Arrow key={k} x1={box.w / 2} y1={y1} x2={box.w / 2} y2={y1 + gap - 12} t={t} start={p.items[k + 1] - 0.3} color={ink.muted} />;
        })}
      </svg>
      {nodes.map((nd, k) => (
        <FlowNode key={k} box={{ x: x0, y: k * (nodeH + gap), w, h: nodeH }} text={label(nd)} icon={iconOf(nd)} color={colors[k % colors.length]} start={p.items[k]} active={k === latest} seed={index * 10 + k} vertical />
      ))}
    </div>
  );
};

const FlowNode: React.FC<{ box: Box; text: string; icon?: string; color: string; start: number; active: boolean; seed: number; vertical: boolean }> = ({ box, text, icon, color, start, active, seed, vertical }) => {
  const { ink } = useKit();
  const t = useSec();
  const enter = useEnter(start, seed);
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div
        style={{
          ...panelStyle(ink, active ? color : undefined),
          inset: 0,
          borderRadius: ink.look.id === "blueprint" ? (vertical ? 46 : 28) : ink.look.id === "rank-numbers" ? 46 : ink.look.panel.radius,
          display: "flex",
          flexDirection: vertical ? "row" : "column",
          alignItems: "center",
          justifyContent: vertical ? "flex-start" : "center",
          gap: vertical ? 22 : 10,
          padding: vertical ? "0 34px" : 14,
          background: active ? `linear-gradient(180deg, ${rgba(color, 0.22)}, ${ink.surface})` : undefined,
        }}
      >
        <RoughFrame w={box.w} h={box.h} start={start} color={active ? color : ink.text} seed={seed + 3} />
        {icon ? <PhosphorIcon name={icon} size={vertical ? 56 : 64} color={color} t={t} start={start + 0.1} /> : <div style={{ width: 18, height: 18, borderRadius: 9, background: color }} />}
        <div style={{ fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: ink.look.id === "blueprint" ? (vertical ? 44 : 32) : Math.min(vertical ? 44 : 32, Math.floor((vertical ? box.w - 140 : box.w - 24) / Math.max(1, [...text].length * Math.max(0.55, ink.look.displayEm)))), color: ink.text, textTransform: UP(ink), textAlign: vertical ? "left" : "center", lineHeight: 1.1 }}>{text}</div>
      </div>
    </div>
  );
};

/* ---------------- compare ---------------- */
const Compare: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const colW = (box.w - 30) / 2;
  const sides = [
    { s: el.left, c: ink.accent2, x: 0, key: "left" },
    { s: el.right, c: ink.accent3, x: colW + 30, key: "right" },
  ];
  const winP = el.winner ? progress(t, (p.items[p.items.length - 1] ?? p.enter) + 0.7, 0.4) : 0;
  return (
    <div style={{ ...abs(box), ...enter }}>
      {sides.map(({ s, c, x, key }) => {
        const win = el.winner === key;
        return (
          <div key={key} style={{ ...panelStyle(ink, win && winP > 0 ? c : undefined), left: x, top: 0, width: colW, height: box.h, padding: "26px 26px", boxSizing: "border-box", transform: `scale(${win ? 1 + 0.03 * winP : 1 - 0.02 * winP})`, opacity: el.winner && !win ? 1 - 0.35 * winP : 1 }}>
            <RoughFrame w={colW} h={box.h} start={p.enter + (key === "right" ? 0.15 : 0)} color={win && winP > 0 ? c : ink.text} seed={index + (key === "right" ? 7 : 3)} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, height: 76, borderBottom: `3px solid ${rgba(c, 0.5)}`, marginBottom: 18 }}>
              {s.icon ? <PhosphorIcon name={s.icon} size={52} color={c} t={t} start={p.enter + 0.15} /> : null}
              <div style={{ fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: ink.look.id === "blueprint" ? 48 : Math.min(48, Math.floor((colW - 52 - (s.icon ? 66 : 0)) / Math.max(1, [...String(s.title)].length * ink.look.displayEm))), whiteSpace: ink.look.id === "blueprint" ? undefined : "nowrap", color: c, textTransform: UP(ink) }}>{s.title}</div>
              {win ? (
                <div style={{ marginLeft: "auto", transform: `scale(${winP}) rotate(${(1 - winP) * -30}deg)` }}>
                  <PhosphorIcon name="trophy" size={56} color={ink.accent2} t={t} start={(p.items[p.items.length - 1] ?? p.enter) + 0.7} draw={false} />
                </div>
              ) : null}
            </div>
            {(s.items as string[]).map((it, k) => {
              const q = itemP(t, p.items.map((v) => v + (key === "right" ? 0.14 : 0)), k);
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 14, height: 74, opacity: q, transform: `translateY(${(1 - q) * 20}px)` }}>
                  <svg width={30} height={30} viewBox="0 0 30 30" style={{ flex: "0 0 30px" }}>
                    <circle cx={15} cy={15} r={11} fill={rgba(c, 0.25)} stroke={c} strokeWidth={3} />
                  </svg>
                  <div style={{ fontFamily: ink.look.body, fontWeight: 700, fontSize: 34, color: ink.text, lineHeight: 1.1 }}>{it}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- checklist ---------------- */
const Checklist: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  let y = el.title ? 74 : 0;
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div style={{ ...panelStyle(ink), inset: 0 }} />
      <RoughFrame w={box.w} h={box.h} start={p.enter} seed={index + 2} />
      {el.title ? <div style={{ position: "absolute", left: 36, top: 22, fontFamily: ink.look.mono, fontWeight: 800, fontSize: 30, color: ink.muted, textTransform: UP(ink), letterSpacing: 2 }}>{el.title}</div> : null}
      {(el.items as unknown[]).map((it, k) => {
        const text = label(it);
        const state = typeof it === "object" && it ? ((it as { state?: string }).state ?? "check") : "check";
        const q = itemP(t, p.items, k, 0.35);
        const top = y + 15;
        const h = Math.max(80, Math.ceil((text.length * 42 * 0.58) / (box.w - 150)) * 54 + 26);
        y += h;
        const mark = state === "cross" ? ink.bad : state === "check" ? ink.good : ink.muted;
        const start = (p.items[k] ?? p.enter) + 0.25;
        return (
          <div key={k} style={{ position: "absolute", left: 30, top, width: box.w - 60, height: h, display: "flex", alignItems: "center", gap: 26, opacity: q, transform: `translateX(${(1 - q) * -36}px)` }}>
            <svg width={60} height={60} viewBox="0 0 60 60" style={{ flex: "0 0 60px", overflow: "visible" }}>
              <rect x={4} y={4} width={52} height={52} rx={14} fill={rgba(mark, 0.16)} stroke={mark} strokeWidth={4} />
              {state === "check" ? <DrawPath d="M16 31 L26 41 L45 19" t={t} start={start} dur={0.28} stroke={mark} width={7} /> : null}
              {state === "cross" ? (
                <>
                  <DrawPath d="M18 18 L42 42" t={t} start={start} dur={0.16} stroke={mark} width={7} />
                  <DrawPath d="M42 18 L18 42" t={t} start={start + 0.14} dur={0.16} stroke={mark} width={7} />
                </>
              ) : null}
            </svg>
            <div style={{ fontFamily: ink.look.body, fontWeight: 700, fontSize: 42, color: state === "cross" ? rgba(ink.text, 0.6) : ink.text, lineHeight: 1.25, textDecoration: state === "cross" && t > start + 0.3 ? `line-through ${rgba(ink.bad, 0.8)}` : "none" }}>{text}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- bars ---------------- */
const Bars: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const L = ink.look;
  const enter = useEnter(p.enter, index);
  const items = el.items as { label: string; value: number; color?: string }[];
  const editorial = L.id === "editorial-chart";
  const rawMax = el.max ?? Math.max(...items.map((i) => i.value)) * 1.1;
  // editorial axes end on a round number (1, 2, 2.5, 5 x 10^k) so tick labels read cleanly
  const niceMax = (v: number) => {
    const k = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, v))));
    return ([1, 2, 2.5, 5, 10].find((m) => m * k >= v) ?? 10) * k;
  };
  const max = editorial && el.max === undefined ? niceMax(Math.max(...items.map((i) => i.value))) : rawMax;
  const top = el.title ? 70 : 0;
  const chartH = box.h - top - 30;
  const baseY = top + chartH - 64;
  const maxBarH = chartH - 64 - 70;
  const n = items.length;
  const x0 = editorial ? 110 : 40;
  const slot = (box.w - x0 - 40) / n;
  const bw = Math.min(170, slot * 0.6);
  const colors = L.id === "broadcast" ? [ink.accent, "#FFFFFF", ink.accent2, ink.muted, ink.accent] : [ink.accent3, ink.accent2, ink.accent, ink.good, ink.bad];
  // editorial: animated y axis with 4 gridlines and tick labels
  const ticks = editorial ? [0, 0.25, 0.5, 0.75, 1] : [];
  const nice = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
  const growEase = L.id === "blueprint" || L.id === "rank-numbers" ? Easing.bezier(0.34, 1.4, 0.64, 1) : L.id === "broadcast" ? Easing.bezier(0.16, 1, 0.3, 1) : Easing.bezier(0.65, 0, 0.35, 1);
  const growDur = L.id === "editorial-chart" ? 1.1 : L.id === "broadcast" ? 0.35 : 0.7;
  return (
    <div style={{ ...abs(box), ...enter }}>
      {editorial ? null : <div style={{ ...panelStyle(ink), inset: 0 }} />}
      <RoughFrame w={box.w} h={box.h} start={p.enter} seed={index + 4} />
      {el.title ? <div style={{ position: "absolute", left: editorial ? x0 : 0, right: 0, top: 24, textAlign: editorial ? "left" : "center", fontFamily: editorial ? L.body : L.display, fontWeight: editorial ? 800 : L.displayWeight, fontSize: 36, letterSpacing: editorial ? 2 : 0, color: editorial ? ink.text : ink.accent2, textTransform: editorial ? "uppercase" : UP(ink) }}>{el.title}</div> : null}
      <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {ticks.map((q, k) => {
          const y = baseY - q * maxBarH;
          return (
            <React.Fragment key={k}>
              {k ? <DrawPath d={`M ${x0} ${y} L ${box.w - 30} ${y}`} t={t} start={p.enter + 0.1 + k * 0.08} dur={0.5} stroke={rgba(ink.text, 0.14)} width={2} /> : null}
              <text x={x0 - 16} y={y + 9} textAnchor="end" fontFamily={L.body} fontWeight={600} fontSize={26} fill={ink.muted} opacity={progress(t, p.enter + 0.2 + k * 0.08, 0.4)}>
                {nice((max * q))}
              </text>
            </React.Fragment>
          );
        })}
        {editorial ? <DrawPath d={`M ${x0} ${baseY} L ${x0} ${baseY - maxBarH - 20}`} t={t} start={p.enter} dur={0.5} stroke={ink.text} width={3} /> : null}
        {L.panel.rough ? (
          <RoughShape shape={{ kind: "line", x1: x0, y1: baseY, x2: box.w - 40, y2: baseY }} seed={index + 9} t={t} start={p.enter + 0.1} dur={0.4} stroke={ink.text} width={6} roughness={1.2} />
        ) : (
          <DrawPath d={`M ${x0} ${baseY} L ${box.w - 40} ${baseY}`} t={t} start={p.enter + 0.1} dur={0.4} stroke={editorial ? ink.text : ink.muted} width={editorial ? 3 : 4} />
        )}
      </svg>
      {items.map((it, k) => {
        const g = progress(t, p.items[k] ?? p.enter, growDur, growEase);
        const h = Math.max(0, (it.value / max) * maxBarH * g);
        const c = col(ink, it.color, colors[k % colors.length]);
        const cx = x0 + slot * (k + 0.5);
        const shown = it.value * Math.min(1, g);
        const decimals = Number.isInteger(it.value) ? 0 : 1;
        const barStyle: React.CSSProperties =
          L.id === "blueprint"
            ? { borderRadius: "16px 16px 4px 4px", background: `linear-gradient(180deg, ${c}, ${rgba(c, 0.75)})`, boxShadow: `0 0 30px ${rgba(c, 0.3)}` }
            : L.panel.rough
              ? { background: `repeating-linear-gradient(-45deg, ${rgba(c, 0.85)} 0 6px, transparent 6px 16px)` }
              : L.id === "rank-numbers"
                ? { borderRadius: 26, background: c, border: "4px solid #FFFFFF", boxShadow: `0 10px 0 ${ink.drop}` }
                : L.id === "editor-window"
                  ? { borderRadius: 4, background: rgba(c, 0.25), border: `3px solid ${c}` }
                  : { borderRadius: 0, background: c };
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: cx - bw / 2, top: baseY - h, width: bw, height: h, ...barStyle }} />
            {L.panel.rough && h > 8 ? (
              <svg width={bw + 20} height={h + 20} style={{ position: "absolute", left: cx - bw / 2 - 10, top: baseY - h - 10, overflow: "visible" }}>
                <RoughShape shape={{ kind: "rect", x: 10, y: 10, w: bw, h }} seed={index * 10 + k + 1} t={t} start={(p.items[k] ?? p.enter) + growDur * 0.6} dur={0.4} stroke={c} width={5} roughness={1.1} />
              </svg>
            ) : null}
            <div style={{ position: "absolute", left: cx - 120, width: 240, top: baseY - h - 62, textAlign: "center", fontFamily: L.display, fontWeight: L.displayWeight, fontSize: editorial ? 50 : 46, color: editorial ? ink.text : c, opacity: g > 0.02 ? 1 : 0 }}>
              {L.id === "blueprint" ? Math.round(shown) : shown.toFixed(g >= 1 ? decimals : 0)}
              {el.unit ?? ""}
            </div>
            <div style={{ position: "absolute", left: cx - slot / 2, width: slot, top: baseY + 16, textAlign: "center", fontFamily: ink.look.mono, fontWeight: 800, fontSize: L.id === "blueprint" ? 28 : Math.min(28, Math.floor((slot - 8) / Math.max(1, [...it.label].length * 0.62))), color: ink.text, textTransform: UP(ink), opacity: progress(t, p.items[k] ?? p.enter, 0.3) }}>{it.label}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ---------------- counter ---------------- */
const counterSize: Record<string, number> = { blueprint: 200, whiteboard: 190, "broadcast": 200, "editorial-chart": 210, "editor-window": 170, "rank-numbers": 220, watercolor: 200, "paper-collage": 170, chalkboard: 190, risograph: 120, "ukiyo-e": 170, "pop-comic": 230 };
const counterShadow = (ink: InkT, c: string) => {
  switch (ink.look.id) {
    case "blueprint":
      return `0 10px 0 ${rgba("#000000", 0.35)}, 0 0 60px ${rgba(c, 0.35)}`;
    case "rank-numbers":
      return `8px 8px 0 ${ink.accent2}, 16px 16px 0 ${ink.drop}`;
    case "editor-window":
      return `0 0 24px ${rgba(c, 0.55)}`;
    case "broadcast":
      return `0 8px 0 ${ink.drop}`;
    case "risograph":
      return `7px 5px 0 ${rgba("#FF48B0", 0.7)}`;
    case "pop-comic":
      return "8px 8px 0 #111111";
    case "paper-collage":
      return `5px 7px 0 ${ink.drop}`;
    default:
      return "none";
  }
};
const Counter: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const c = col(ink, el.color, ink.accent2);
  const k = progress(t, p.enter + 0.2, 1.2, Easing.bezier(0.16, 1, 0.3, 1));
  const v = (el.from ?? 0) + (el.value - (el.from ?? 0)) * k;
  const punch = usePop(p.enter + 1.4, { damping: 8, stiffness: 260 });
  const s = 1 + 0.08 * Math.sin(Math.min(1, punch) * Math.PI);
  return (
    <div style={{ ...abs(box), ...enter, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: counterSize[ink.look.id], lineHeight: 1, color: c, transform: `scale(${s})`, textShadow: counterShadow(ink, c), fontVariantNumeric: "tabular-nums", ...(ink.look.id === "pop-comic" ? { WebkitTextStroke: "6px #111111", paintOrder: "stroke fill" } : {}) }}>
        {el.prefix ?? ""}
        {v.toFixed(el.decimals ?? 0)}
        {el.suffix ?? ""}
      </div>
      {ink.look.id === "broadcast" || ink.look.id === "editorial-chart" ? <div style={{ width: 260 * k, height: ink.look.id === "editorial-chart" ? 4 : 12, marginTop: 8, background: ink.look.id === "editorial-chart" ? ink.text : ink.accent }} /> : null}
      {el.label ? <div style={{ marginTop: 14, fontFamily: ink.look.mono, fontWeight: 800, fontSize: 36, letterSpacing: 3, color: ink.text, textTransform: UP(ink), opacity: progress(t, p.enter + 0.5, 0.4) }}>{el.label}</div> : null}
    </div>
  );
};

/* ---------------- code / terminal ---------------- */
const KEYWORDS = /\b(const|let|var|if|else|return|throw|new|function|import|export|from|await|async|for|while|class|def|true|false|null)\b/;
const highlight = (line: string, ink: ReturnType<typeof useKit>["ink"], fg: string = ink.text): React.ReactNode[] => {
  if (/^\s*(\/\/|#(?!!))/.test(line)) return [<span key="c" style={{ color: ink.muted }}>{line}</span>];
  return line.split(/("[^"]*"?|'[^']*'?|\b\d[\d_.]*\b|\b\w+\b)/).map((tok, i) => {
    if (!tok) return null;
    const color = /^["']/.test(tok) ? ink.accent2 : /^\d/.test(tok) ? ink.accent : KEYWORDS.test(tok) && tok.match(KEYWORDS)?.[0] === tok ? ink.accent3 : fg;
    return (
      <span key={i} style={{ color }}>
        {tok}
      </span>
    );
  });
};

const CodeWindow: React.FC<EP & { terminal?: boolean }> = ({ p, box, index, terminal }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const ty = p.typing!;
  const lines = el.lines as string[];
  let cursorLine = -1;
  const shown = lines.map((line, k) => {
    const isOutput = terminal && !line.startsWith("$");
    const st = ty.lineStarts[k];
    if (t < st) return null;
    const n = isOutput ? [...line].length : Math.min([...line].length, Math.floor((t - st) * ty.cps));
    if (n < [...line].length || k === lines.length - 1 || t < ty.lineStarts[k + 1]) {
      cursorLine = k;
    }
    return [...line].slice(0, n).join("");
  });
  const blink = Math.floor(t * 2.2) % 2 === 0;
  const L = ink.look;
  const bg = terminal ? ink.termBg : ink.codeBg;
  const fg = L.id === "blueprint" ? ink.text : luminance(bg) > 0.45 ? "#1F2430" : "#F8F8F2";
  const muted = L.id === "blueprint" ? ink.muted : luminance(bg) > 0.45 ? "#6B6F7B" : "#7D88B3";
  // On light code panels the bright accents wash out; use darker syntax inks there.
  const synInk = luminance(bg) > 0.45 ? { ...ink, accent: "#B4361F", accent2: "#1F6FEB", accent3: "#7A2DB8", muted } : { ...ink, muted };
  const diff = L.id === "editor-window";
  // New looks shrink long lines to fit the window (gutter + padding); blueprint keeps 32 px.
  const longest = Math.max(1, ...lines.map((l) => [...l].length));
  const codeSize = L.id === "blueprint" ? 32 : Math.max(20, Math.min(32, Math.floor((box.w - (terminal ? 0 : 52) - 56 - (diff ? 6 : 0)) / (longest * 0.61))));
  const bar =
    L.id === "editor-window" ? (
      // editor tabs: the active file tab plus a ghost tab
      <div style={{ height: 64, display: "flex", alignItems: "flex-end", gap: 4, padding: "0 16px", background: ink.codeBar, borderBottom: `2px solid ${ink.line}` }}>
        <div style={{ height: 52, padding: "0 22px", display: "flex", alignItems: "center", gap: 12, borderRadius: "10px 10px 0 0", background: bg, borderTop: `3px solid ${terminal ? ink.accent : ink.accent3}`, fontFamily: MONO_FONT, fontWeight: 700, fontSize: 25, color: fg }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: terminal ? ink.accent : ink.accent2 }} />
          {el.title ?? (terminal ? "zsh" : "main.ts")}
        </div>
        <div style={{ height: 52, padding: "0 20px", display: "flex", alignItems: "center", fontFamily: MONO_FONT, fontWeight: 500, fontSize: 23, color: rgba(muted, 0.7) }}>{terminal ? "+" : "README.md"}</div>
      </div>
    ) : L.panel.rough ? (
      <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 26px", borderBottom: `3px dashed ${rgba(ink.text, 0.35)}`, fontFamily: L.display, fontSize: 32, color: ink.text }}>{el.title ?? (terminal ? "terminal" : "code")}</div>
    ) : (
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 26px", background: L.id === "blueprint" ? (terminal ? "#111827" : "#16204A") : ink.codeBar, borderBottom: `2px solid ${ink.line}` }}>
        {(L.id === "broadcast" ? ["#FFFFFF", "#FFFFFF", "#FFFFFF"] : ["#FF5F57", "#FEBC2E", "#28C840"]).map((c, q) => (
          <div key={q} style={{ width: 18, height: 18, borderRadius: L.id === "broadcast" ? 0 : 9, background: c, opacity: L.id === "broadcast" ? 0.8 - q * 0.25 : 1 }} />
        ))}
        <div style={{ marginLeft: 18, fontFamily: L.id === "blueprint" ? MONO_FONT : L.mono, fontWeight: 700, fontSize: 26, color: L.id === "broadcast" ? "#FFFFFF" : muted }}>{el.title ?? (terminal ? "terminal" : "code")}</div>
      </div>
    );
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div style={{ ...panelStyle(ink), inset: 0, background: L.id === "blueprint" ? (terminal ? "#070A14" : "#0E1530") : bg, overflow: "hidden" }}>
        {bar}
        <div style={{ padding: diff ? "18px 0" : "18px 28px" }}>
          {shown.map((s, k) => {
            if (s === null) return null;
            const kind = diff && !terminal ? (lines[k].startsWith("+") ? "add" : lines[k].startsWith("-") ? "del" : null) : null;
            const tint = kind === "add" ? rgba(ink.good, 0.16) : kind === "del" ? rgba(ink.bad, 0.16) : "transparent";
            return (
              <div key={k} style={{ height: 54, display: "flex", alignItems: "center", fontFamily: MONO_FONT, fontWeight: 500, fontSize: codeSize, whiteSpace: "pre", overflow: "hidden", color: fg, background: tint, padding: diff ? "0 28px" : 0, borderLeft: diff ? `6px solid ${kind === "add" ? ink.good : kind === "del" ? ink.bad : "transparent"}` : undefined }}>
                {!terminal ? <span style={{ width: 52, color: rgba(muted, 0.6) }}>{k + 1}</span> : null}
                {terminal ? (
                  lines[k].startsWith("$") ? (
                    <>
                      <span style={{ color: ink.good }}>$</span>
                      <span>{s.slice(1)}</span>
                    </>
                  ) : (
                    <span style={{ color: muted }}>{s}</span>
                  )
                ) : kind ? (
                  <>
                    <span style={{ color: kind === "add" ? ink.good : ink.bad, fontWeight: 800 }}>{s.slice(0, 1)}</span>
                    <span style={{ opacity: kind === "del" ? 0.65 : 1 }}>{highlight(s.slice(1), synInk, fg)}</span>
                  </>
                ) : (
                  highlight(s, synInk, fg)
                )}
                {k === cursorLine && blink ? <span style={{ display: "inline-block", width: 18, height: 36, marginLeft: 2, background: L.id === "editor-window" ? ink.accent2 : ink.accent3 }} /> : null}
              </div>
            );
          })}
        </div>
      </div>
      <RoughFrame w={box.w} h={box.h} start={p.enter} seed={index + 6} />
    </div>
  );
};

/* ---------------- chat ---------------- */
const Chat: React.FC<EP> = ({ p, box }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  let y = 0;
  return (
    <div style={abs(box)}>
      {(el.messages as { role: string; text: string }[]).map((m, k) => {
        const user = m.role === "user";
        const lines = Math.ceil((m.text.length * 38 * 0.58) / (box.w * 0.78 - 56));
        const h = 44 + lines * 50;
        const top = y;
        y += h + 22;
        const start = p.items[k] ?? p.enter;
        const typingDots = !user && t >= start - 0.6 && t < start;
        const pop = progress(t, start, 0.4, Easing.bezier(0.34, 1.56, 0.64, 1));
        const bg = user ? ink.accent3 : ink.surface2;
        const fg = user ? inkOn(ink.accent3) : ink.text;
        const w = Math.min(box.w * 0.78, 40 + ([...m.text].length * 38 * 0.58) + 16);
        return (
          <React.Fragment key={k}>
            {typingDots ? (
              <div style={{ position: "absolute", left: 0, top, padding: "22px 30px", borderRadius: 34, background: ink.surface2, display: "flex", gap: 12 }}>
                {[0, 1, 2].map((d) => (
                  <div key={d} style={{ width: 16, height: 16, borderRadius: 8, background: ink.muted, transform: `translateY(${Math.sin(t * 9 - d) * 5}px)` }} />
                ))}
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                top,
                [user ? "right" : "left"]: 0,
                width: w,
                minHeight: h,
                boxSizing: "border-box",
                padding: "22px 28px",
                borderRadius: user ? "34px 34px 8px 34px" : "34px 34px 34px 8px",
                background: bg,
                color: fg,
                fontFamily: ink.look.body,
                fontWeight: 700,
                fontSize: 38,
                lineHeight: 1.3,
                opacity: pop > 0 ? 1 : 0,
                transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`,
                transformOrigin: user ? "100% 100%" : "0% 100%",
                boxShadow: ink.look.id === "pop-comic" ? "8px 8px 0 #111111" : ink.look.light ? "0 10px 24px rgba(40,30,20,0.18)" : "0 18px 40px rgba(0,0,0,0.4)",
                ...(ink.look.id === "pop-comic" ? { border: "5px solid #111111", background: user ? ink.accent2 : "#FFFFFF", color: "#111111", borderRadius: 48 } : {}),
              }}
            >
              {m.text}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ---------------- stamp ---------------- */
export const StampMark: React.FC<{ text: string; start: number; color: string; cx: number; cy: number; size?: number }> = ({ text, start, color, cx, cy, size = 62 }) => {
  const { ink } = useKit();
  const t = useSec();
  const p = usePop(start, { damping: 13, stiffness: 320, mass: 0.6 });
  if (t < start) return null;
  const L = ink.look;
  const s = interpolate(p, [0, 1], [2.4, 1]);
  const common: React.CSSProperties = { position: "absolute", left: cx, top: cy, whiteSpace: "nowrap", fontSize: size, textTransform: "uppercase" };
  if (L.id === "broadcast") {
    // flash box: hard slam, no rotation, red block with white type and a white keyline
    const q = progress(t, start, 0.12, Easing.out(Easing.cubic));
    return (
      <div style={{ ...common, transform: `translate(-50%, -50%) scale(${interpolate(q, [0, 1], [1.6, 1])})`, opacity: q > 0 ? 1 : 0, padding: "10px 34px", background: color, color: inkOn(color), outline: "4px solid #FFFFFF", outlineOffset: -12, fontFamily: L.display, fontWeight: 700, letterSpacing: 4, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
        {text}
      </div>
    );
  }
  if (L.panel.rough) {
    // marker: the word is written, then circled twice
    const w = [...text].length * size * 0.66 + 80;
    const h = size * 1.9;
    const q = progress(t, start, 0.3);
    return (
      <div style={{ ...common, width: w, height: h, transform: "translate(-50%, -50%) rotate(-6deg)" }}>
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <RoughShape shape={{ kind: "ellipse", cx: w / 2, cy: h / 2, w: w, h: h }} seed={Math.round(cx + cy)} t={t} start={start + 0.15} dur={0.45} stroke={color} width={7} roughness={1.6} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: L.display, color, clipPath: `inset(-20px ${(1 - q) * 100}% -20px -20px)` }}>{text}</div>
      </div>
    );
  }
  if (L.id === "ukiyo-e") {
    // hanko seal: vermilion square pressed once, white carved letters, uneven ink
    const q = progress(t, start, 0.14, Easing.out(Easing.cubic));
    return (
      <div style={{ ...common, transform: `translate(-50%, -50%) scale(${interpolate(q, [0, 1], [1.25, 1])})`, opacity: q > 0 ? 0.92 : 0, padding: "14px 22px", background: color, color: "#FBF4E4", border: `5px solid ${color}`, outline: "3px solid #FBF4E4", outlineOffset: -12, fontFamily: L.display, fontSize: size * 0.85, letterSpacing: 3, filter: "url(#art-print)" }}>
        {text}
      </div>
    );
  }
  if (L.id === "pop-comic") {
    // action burst with the word slammed in the middle
    const w = Math.max(360, [...text].length * size * 0.62 + 200);
    const h = w * 0.62;
    return (
      <div style={{ ...common, width: w, height: h, transform: `translate(-50%, -50%) rotate(-8deg) scale(${s})`, opacity: interpolate(p, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }) }}>
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <polygon points={burstPoints(w, h, 14, Math.round(cx), 0.7)} fill={ink.accent2} stroke="#111111" strokeWidth={7} strokeLinejoin="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: L.display, color, WebkitTextStroke: "5px #111111", paintOrder: "stroke fill", letterSpacing: 2 }}>{text}</div>
      </div>
    );
  }
  if (L.id === "editorial-chart") {
    // editorial annotation label: no slam, a ruled tag
    const q = progress(t, start, 0.5, Easing.bezier(0.65, 0, 0.35, 1));
    return (
      <div style={{ ...common, transform: `translate(-50%, -50%) translateY(${(1 - q) * 20}px)`, opacity: q, padding: "8px 24px", background: ink.stampBg, borderTop: `5px solid ${color}`, borderBottom: `1px solid ${color}`, color, fontFamily: L.body, fontWeight: 800, fontSize: size * 0.7, letterSpacing: 4 }}>
        {text}
      </div>
    );
  }
  return (
    <div
      style={{
        ...common,
        transform: `translate(-50%, -50%) rotate(${L.id === "rank-numbers" ? -12 : L.id === "editor-window" ? 0 : -9}deg) scale(${s})`,
        opacity: interpolate(p, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
        padding: "12px 34px",
        border: `7px solid ${color}`,
        borderRadius: L.id === "rank-numbers" ? 60 : L.id === "editor-window" ? 6 : 18,
        outline: `3px solid ${rgba(color, 0.6)}`,
        outlineOffset: 6,
        color,
        fontFamily: L.id === "blueprint" ? fontStackMontserrat : L.display,
        fontWeight: L.id === "blueprint" ? 900 : L.displayWeight,
        letterSpacing: 4,
        background: L.id === "blueprint" ? rgba("#0B1020", 0.55) : ink.stampBg,
        textShadow: `0 0 20px ${rgba(color, 0.4)}`,
      }}
    >
      {L.id === "editor-window" ? `// ${text}` : text}
    </div>
  );
};

/* ---------------- doc ---------------- */
const Doc: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const enter = useEnter(p.enter, index);
  const w = Math.min(box.w, 720);
  const x = (box.w - w) / 2;
  const lines = el.lines as string[];
  return (
    <div style={{ ...abs(box), ...enter }}>
      <div style={{ position: "absolute", left: x, top: 0, width: w, height: box.h, transform: "rotate(-1.5deg)", background: ink.paper, borderRadius: 18, boxShadow: "0 30px 70px rgba(0,0,0,0.5)", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 0, top: 0, width: 70, height: 70, background: `linear-gradient(225deg, ${ink.bg} 50%, #D9D4C7 50%)` }} />
        <div style={{ position: "absolute", left: 50, top: 34, fontFamily: ink.look.mono, fontWeight: 800, fontSize: 38, color: ink.paperInk }}>{el.title}</div>
        <div style={{ position: "absolute", left: 50, right: 50, top: 92, height: 4, background: rgba(ink.paperInk, 0.15) }} />
        {lines.map((line, k) => {
          const q = itemP(t, p.items, k, 0.6);
          return (
            <div key={k} style={{ position: "absolute", left: 50, right: 60, top: 116 + k * 58, display: "flex", gap: 16, alignItems: "baseline", clipPath: `inset(0 ${(1 - q) * 100}% 0 0)` }}>
              <span style={{ fontFamily: ink.look.mono, fontWeight: 800, fontSize: 30, color: ink.accent }}>{"-"}</span>
              <span style={{ fontFamily: ink.look.body, fontWeight: 600, fontSize: 36, color: ink.paperInk }}>{line}</span>
            </div>
          );
        })}
      </div>
      {el.stamp ? <StampMark text={el.stamp} start={(p.items[p.items.length - 1] ?? p.enter + 1) + 0.18} color={ink.good} cx={box.w / 2 + w * 0.18} cy={box.h - 62} size={50} /> : null}
    </div>
  );
};

/* ---------------- timeline ---------------- */
const Timeline: React.FC<EP> = ({ p, box }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const steps = el.steps as unknown[];
  const n = steps.length;
  const pad = 90;
  const y = 70;
  const xs = steps.map((_, k) => pad + ((box.w - 2 * pad) * k) / Math.max(1, n - 1));
  const colors = [ink.bad, ink.accent2, ink.good, ink.accent3, ink.accent];
  const last = p.items[n - 1] ?? p.enter;
  return (
    <div style={abs(box)}>
      <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={pad} y1={y} x2={box.w - pad} y2={y} stroke={ink.line} strokeWidth={10} strokeLinecap="round" opacity={progress(t, p.enter, 0.2)} />
        <DrawPath d={`M ${pad} ${y} L ${box.w - pad} ${y}`} t={t} start={p.enter + 0.2} dur={Math.max(0.5, last - p.enter)} stroke={ink.accent3} width={10} />
      </svg>
      {steps.map((s, k) => {
        const q = usePopLocal(t, p.items[k]);
        const c = colors[k % colors.length];
        const sub = typeof s === "object" && s ? (s as { sub?: string }).sub : undefined;
        return (
          <React.Fragment key={k}>
            <div style={{ position: "absolute", left: xs[k] - 34, top: y - 34, width: 68, height: 68, borderRadius: 34, background: c, transform: `scale(${q})`, boxShadow: `0 0 30px ${rgba(c, 0.5)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 32, color: inkOn(c) }}>
              {k + 1}
            </div>
            <div style={{ position: "absolute", left: xs[k] - 150, width: 300, top: y + 56, textAlign: "center", opacity: Math.min(1, q) }}>
              <div style={{ fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: c, textTransform: UP(ink) }}>{label(s)}</div>
              {sub ? <div style={{ marginTop: 6, fontFamily: ink.look.body, fontWeight: 600, fontSize: 28, color: rgba(ink.text, 0.8) }}>{sub}</div> : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
const usePopLocal = (t: number, start: number | undefined) => (start === undefined ? 1 : progress(t, start, 0.35, Easing.bezier(0.34, 1.7, 0.64, 1)));

/* ---------------- icon ---------------- */
/** What sits behind an icon, per look: glow + dashed ring, marker circle, keyline square, chart ring or sun rays. */
const IconHalo: React.FC<{ c: string; size: number; glow: number; t: number; start: number; seed: number }> = ({ c, size, glow, t, start, seed }) => {
  const { ink } = useKit();
  const S = size * 1.25;
  switch (ink.look.id) {
    case "watercolor":
      return <div style={{ position: "absolute", inset: -size * 0.12, background: `${washUri(c, seed + 5, 0.32 * glow + 0.05)} center / 100% 100% no-repeat`, borderRadius: "50%" }} />;
    case "paper-collage":
      return <div style={{ position: "absolute", inset: size * 0.02, background: `${scrapUri("#FBF7EE", seed + 2)} center / 100% 100% no-repeat`, transform: `rotate(${seed % 2 ? 4 : -4}deg)` }} />;
    case "risograph":
      return <div style={{ position: "absolute", inset: size * 0.04, borderRadius: "50%", background: `radial-gradient(${rgba(c, 0.5 * glow + 0.1)} 34%, transparent 36%) 0 0 / 16px 16px`, boxShadow: `8px 6px 0 ${rgba("#FF48B0", 0.3 * glow)}` }} />;
    case "ukiyo-e":
      // an enso: one brush ring left open at the lift
      return (
        <svg width={S} height={S} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <DrawPath d={`M ${S * 0.5} ${S * 0.06} A ${S * 0.44} ${S * 0.44} 0 1 1 ${S * 0.2} ${S * 0.16}`} t={t} start={start + 0.2} dur={0.7} stroke={ink.text} width={14} opacity={0.85} />
        </svg>
      );
    case "pop-comic":
      return (
        <svg width={S} height={S} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", transform: `scale(${0.6 + 0.4 * glow})` }}>
          <polygon points={burstPoints(S, S, 12, seed + 3)} fill={ink.accent2} stroke="#111111" strokeWidth={6} strokeLinejoin="round" />
        </svg>
      );
    case "chalkboard":
    case "whiteboard":
      return (
        <svg width={S} height={S} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <RoughShape shape={{ kind: "ellipse", cx: S / 2, cy: S / 2, w: S * 0.95, h: S * 0.9 }} seed={seed + 17} t={t} start={start + 0.35} dur={0.5} stroke={c} width={6} roughness={1.5} />
        </svg>
      );
    case "broadcast":
      return <div style={{ position: "absolute", inset: size * 0.06, border: `6px solid ${rgba(c, glow)}`, boxShadow: `inset 0 0 0 10px ${rgba(c, 0.12 * glow)}` }} />;
    case "editorial-chart":
      return <div style={{ position: "absolute", inset: size * 0.1, borderRadius: "50%", border: `2px solid ${rgba(ink.text, 0.35 * glow)}` }} />;
    case "editor-window":
      return <div style={{ position: "absolute", inset: size * 0.06, borderRadius: 18, border: `2px solid ${rgba(c, 0.6 * glow)}`, background: rgba(c, 0.06 * glow), boxShadow: `0 0 40px ${rgba(c, 0.25 * glow)}` }} />;
    case "rank-numbers":
      return (
        <>
          <div style={{ position: "absolute", inset: -size * 0.25, borderRadius: "50%", background: `repeating-conic-gradient(from ${t * 40}deg, ${rgba(c, 0.35 * glow)} 0deg 12deg, transparent 12deg 24deg)`, maskImage: "radial-gradient(circle, black 30%, transparent 70%)" }} />
          <div style={{ position: "absolute", inset: size * 0.05, borderRadius: "50%", background: rgba(ink.bg, 0.6), border: `6px solid ${rgba("#FFFFFF", 0.9 * glow)}` }} />
        </>
      );
    default:
      return (
        <>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${rgba(c, 0.28 * glow)} 0%, ${rgba(c, 0)} 70%)` }} />
          <div style={{ position: "absolute", inset: size * 0.08, borderRadius: "50%", border: `3px dashed ${rgba(c, 0.35 * glow)}`, transform: `rotate(${t * 20}deg)` }} />
        </>
      );
  }
};

const IconEl: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const c = col(ink, el.color, ink.accent3);
  const size = { s: 120, m: 190, l: 270 }[(el.size as "s" | "m" | "l") ?? "m"];
  const pop = usePop(p.enter, { damping: 9 });
  const d = idle(t, index * 7, 6);
  const glow = progress(t, p.enter + 0.4, 0.5);
  return (
    <div style={{ ...abs(box), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `translate(${d.x}px, ${d.y}px)` }}>
      <div style={{ position: "relative", width: size * 1.25, height: size * 1.25, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${interpolate(pop, [0, 1], [0.5, 1])})`, opacity: Math.min(1, pop * 3) }}>
        <IconHalo c={c} size={size} glow={glow} t={t} start={p.enter} seed={index} />
        {ink.look.id === "blueprint" ? (
          <PhosphorIcon name={el.name} size={size} color={c} t={t} start={p.enter + 0.05} />
        ) : (
          <div style={{ position: "relative", display: "flex" }}>
            <PhosphorIcon name={el.name} size={size} color={c} t={t} start={p.enter + 0.05} />
          </div>
        )}
      </div>
      {el.label ? <div style={{ marginTop: 10, fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: ink.text, textTransform: UP(ink), opacity: progress(t, p.enter + 0.35, 0.3), textAlign: "center" }}>{el.label}</div> : null}
    </div>
  );
};

/* ---------------- badge ---------------- */
const badgeSkin = (ink: InkT, c: string): React.CSSProperties => {
  switch (ink.look.id) {
    case "whiteboard":
      return { borderRadius: 999, background: "transparent", color: c, border: `5px solid ${c}`, overflow: "visible" };
    case "broadcast":
      return { borderRadius: 0, background: c, color: inkOn(c), boxShadow: `8px 8px 0 ${rgba("#FFFFFF", 0.9)}` };
    case "editorial-chart":
      return { borderRadius: 4, background: "transparent", color: c, border: `3px solid ${c}`, overflow: "visible" };
    case "editor-window":
      return { borderRadius: 10, background: rgba(c, 0.14), color: c, border: `2px solid ${c}` };
    case "rank-numbers":
      return { borderRadius: 999, background: c, color: inkOn(c), border: "5px solid #FFFFFF", boxShadow: `0 10px 0 ${ink.drop}` };
    case "chalkboard":
      return { borderRadius: 999, background: "transparent", color: c, border: `5px dashed ${c}`, overflow: "visible" };
    case "watercolor":
      return { borderRadius: 40, background: `${washUri(c, 9, 0.34)} center / 100% 100% no-repeat`, color: ink.text, overflow: "visible" };
    case "paper-collage":
      return { borderRadius: 0, background: `${scrapUri(c, 5)} center / 100% 100% no-repeat`, color: inkOn(c), overflow: "visible" };
    case "risograph":
      return { borderRadius: 0, background: rgba(c, 0.8), color: inkOn(c) === "#FFFFFF" ? ink.bg : ink.text, boxShadow: `7px 5px 0 ${rgba("#FF48B0", 0.6)}` };
    case "ukiyo-e":
      return { borderRadius: 0, background: c, color: "#FBF4E4", border: `3px solid ${ink.text}`, outline: `1.5px solid ${c}`, outlineOffset: 4 };
    case "pop-comic":
      return { borderRadius: 0, background: c, color: inkOn(c), border: "6px solid #111111", boxShadow: "8px 8px 0 #111111" };
    default:
      return { borderRadius: 999, background: c, color: inkOn(c) };
  }
};
const Badge: React.FC<EP> = ({ p, box }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const c = col(ink, el.color, ink.accent2);
  const pop = usePop(p.enter, { damping: 8, stiffness: 200 });
  const shine = progress(t, p.enter + 0.4, 0.7);
  return (
    <div style={{ ...abs(box), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 38px",
          ...badgeSkin(ink, c),
          fontFamily: ink.look.display,
          fontWeight: 900,
          fontSize: 44,
          textTransform: UP(ink),
          letterSpacing: 1,
          transform: ink.look.id === "editorial-chart" || ink.look.id === "editor-window" ? `scale(${Math.min(1, pop)})` : `scale(${pop}) rotate(${interpolate(pop, [0, 1], [-12, ink.look.id === "broadcast" ? 0 : -2])}deg)`,
          ...(ink.look.id === "blueprint" ? { boxShadow: `0 16px 40px ${rgba(c, 0.4)}, 0 6px 0 ${rgba("#000000", 0.3)}` } : {}),
        }}
      >
        {el.icon ? <PhosphorIcon name={el.icon} size={48} color={String(badgeSkin(ink, c).color)} t={t} start={p.enter + 0.1} draw={false} /> : null}
        {el.text}
        <div style={{ display: ink.look.id === "blueprint" || ink.look.id === "rank-numbers" ? "block" : "none", position: "absolute", top: 0, bottom: 0, width: 80, left: `${-20 + shine * 140}%`, background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))", transform: "skewX(-20deg)" }} />
      </div>
    </div>
  );
};

/* ---------------- svg (bespoke drawing) ---------------- */
const SvgEl: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const h = el.height ?? 360;
  const d = idle(t, index * 13, 4);
  return (
    <div style={{ ...abs(box), transform: `translate(${d.x}px, ${d.y}px)` }}>
      <svg viewBox={el.viewBox ?? "0 0 400 300"} width={box.w} height={h} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
        {(el.paths as { d: string; stroke?: string; fill?: string; width?: number }[]).map((path, k) => {
          const start = p.items[k] ?? p.enter;
          const fill = path.fill && path.fill !== "none" ? col(ink, path.fill, ink.accent) : undefined;
          return <DrawPath key={k} d={path.d} t={t} start={start} dur={0.55} stroke={col(ink, path.stroke, ink.text)} width={path.width ?? 6} fill={fill} fillStart={start + 0.45} />;
        })}
      </svg>
      {el.label ? <div style={{ position: "absolute", left: 0, right: 0, top: h + 8, textAlign: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: ink.text, textTransform: UP(ink), opacity: progress(t, (p.items[p.items.length - 1] ?? p.enter) + 0.3, 0.3) }}>{el.label}</div> : null}
    </div>
  );
};

/* ---------------- drawing (agent-drawn vector art, lib/drawing.mjs) ---------------- */
const DrawingEl: React.FC<EP> = ({ p, box, index }) => {
  const { ink, moments } = useKit();
  const t = useSec();
  const el = p.el;
  const h = el.height ?? 420;
  const enter = useEnter(p.enter, index);
  return (
    <div style={{ ...abs(box), ...enter }}>
      <DrawingSvg drawing={el as never} colors={inkColors(ink)} skin={lookDrawingSkin(ink)} t={t} enter={p.enter} moments={moments} width={box.w} height={h} uid={`dr${index}`} seed={index + 1} />
      {el.label ? <div style={{ position: "absolute", left: 0, right: 0, top: h + 8, textAlign: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, color: ink.text, textTransform: UP(ink), opacity: progress(t, p.enter + 0.5, 0.3) }}>{el.label}</div> : null}
    </div>
  );
};

/* ---------------- split ---------------- */
const Split: React.FC<EP> = ({ p, box, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const vs = usePop(p.enter + 0.3, { damping: 8 });
  return (
    <div style={abs(box)}>
      {el.divider !== "none" && !(ink.look.id === "flat-depth" && el.divider === undefined) ? (
        <svg width={box.w} height={box.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <DrawPath d={`M ${box.w / 2} 10 L ${box.w / 2} ${box.h - 10}`} t={t} start={p.enter} dur={0.4} stroke={ink.line} width={4} />
        </svg>
      ) : null}
      {[...(p.left ?? []), ...(p.right ?? [])].map((c, k) => (c.box ? <ElementView key={k} p={c} box={c.box} index={index * 10 + k} /> : null))}
      {el.divider === "vs" ? (
        <div style={{ position: "absolute", left: box.w / 2 - 50, top: box.h / 2 - 50, width: 100, height: 100, borderRadius: 50, background: ink.accent, color: inkOn(ink.accent), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ink.look.display, fontWeight: ink.look.displayWeight, fontSize: 40, transform: `scale(${vs}) rotate(${(1 - vs) * 90}deg)`, boxShadow: `0 0 0 10px ${ink.bg}, 0 14px 40px rgba(0,0,0,0.5)` }}>
          VS
        </div>
      ) : null}
    </div>
  );
};

export const ElementView: React.FC<EP> = (props) => {
  if (FORMAT_ELEMENT_TYPES.has(props.p.el.type)) return <FormatElement {...props} />;
  switch (props.p.el.type) {
    case "card":
      return <Card {...props} />;
    case "flow":
      return <Flow {...props} />;
    case "compare":
      return <Compare {...props} />;
    case "checklist":
      return <Checklist {...props} />;
    case "bars":
      return <Bars {...props} />;
    case "counter":
      return <Counter {...props} />;
    case "code":
      return <CodeWindow {...props} />;
    case "terminal":
      return <CodeWindow {...props} terminal />;
    case "chat":
      return <Chat {...props} />;
    case "doc":
      return <Doc {...props} />;
    case "timeline":
      return <Timeline {...props} />;
    case "icon":
      return <IconEl {...props} />;
    case "badge":
      return <Badge {...props} />;
    case "svg":
      return <SvgEl {...props} />;
    case "drawing":
      return <DrawingEl {...props} />;
    case "split":
      return <Split {...props} />;
    default:
      return null;
  }
};

/** Overlays that point at other elements: hand-drawn callouts and stamps. */
export const OverlayView: React.FC<{ p: Planned; boxes: Record<string, Box>; stackBox: Box; index: number }> = ({ p, boxes, stackBox, index }) => {
  const { ink } = useKit();
  const t = useSec();
  const el = p.el;
  const target = el.target ? boxes[el.target] : undefined;
  const c = col(ink, el.color, el.type === "stamp" ? ink.bad : ink.accent);
  if (el.type === "stamp") {
    const b = target ?? p.box ?? { x: stackBox.w * 0.25, y: Math.max(0, stackBox.h - 160), w: stackBox.w * 0.5, h: 150 };
    return <StampMark text={el.text} start={p.enter + 0.1} color={c} cx={b.x + b.w / 2} cy={b.y + b.h / 2} />;
  }
  if (!target) return null;
  const pad = 22;
  const start = p.enter;
  const lp = progress(t, start + 0.45, 0.3, Easing.bezier(0.34, 1.56, 0.64, 1));
  const shape = el.shape ?? "circle";
  // Hand-drawn amount per look: marker on the whiteboard, clean vector lines for editorial and code.
  const R = { blueprint: undefined, whiteboard: 1.9, "broadcast": 0.4, "editorial-chart": 0, "editor-window": 0, "rank-numbers": 1, watercolor: 1.2, "paper-collage": 0.8, chalkboard: 2.4, risograph: 0.3, "ukiyo-e": 1.4, "pop-comic": 0.6, "ui-cards": 0.3, "flat-depth": 0.5, "soft-gradient": 0.4, "host-tutorial": 0.7, "checklist-glass": 0.4, "spotlight-narrative": 0.5 }[ink.look.id];
  let svg: React.ReactNode = null;
  if (shape === "circle") svg = <RoughShape shape={{ kind: "ellipse", cx: target.x + target.w / 2, cy: target.y + target.h / 2, w: Math.min(target.w + pad * 3, stackBox.w + 40), h: target.h + pad * 3 }} seed={index + 3} t={t} start={start} stroke={c} width={7} roughness={R ?? 1.6} />;
  if (shape === "box") svg = <RoughShape shape={{ kind: "rect", x: Math.max(-14, target.x - pad), y: target.y - pad, w: Math.min(stackBox.w + 28, target.w + 2 * pad), h: target.h + 2 * pad }} seed={index + 5} t={t} start={start} stroke={c} width={7} roughness={R ?? 1.6} />;
  if (shape === "underline")
    svg = <RoughShape shape={{ kind: "curve", points: [[target.x + 60, target.y + target.h + 18], [target.x + target.w / 2, target.y + target.h + 30], [target.x + target.w - 60, target.y + target.h + 14]] }} seed={index + 7} t={t} start={start} stroke={c} width={9} roughness={R ?? 1.1} />;
  if (shape === "arrow") {
    const ex = target.x + target.w - 40;
    const ey = target.y + 10;
    svg = (
      <>
        <RoughShape shape={{ kind: "curve", points: [[ex + 60, ey - 120], [ex + 70, ey - 50], [ex + 10, ey]] }} seed={index + 9} t={t} start={start} stroke={c} width={8} roughness={R ?? 1} />
        <RoughShape shape={{ kind: "line", x1: ex + 10, y1: ey, x2: ex + 36, y2: ey - 22 }} seed={index + 11} t={t} start={start + 0.4} dur={0.15} stroke={c} width={8} roughness={R === undefined ? 0.6 : Math.min(R, 0.6)} />
        <RoughShape shape={{ kind: "line", x1: ex + 10, y1: ey, x2: ex + 40, y2: ey + 6 }} seed={index + 12} t={t} start={start + 0.45} dur={0.15} stroke={c} width={8} roughness={R === undefined ? 0.6 : Math.min(R, 0.6)} />
      </>
    );
  }
  // A labelled callout owns a row right below its target (planned box); otherwise the tag sits on the target's corner.
  const own = p.box;
  const ly = own ? own.y + own.h / 2 : target.y - 10;
  return (
    <>
      <svg width={stackBox.w} height={stackBox.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        {svg}
      </svg>
      {el.label ? (
        <div
          style={{
            position: "absolute",
            right: own ? 20 : Math.max(0, stackBox.w - (target.x + target.w)) + 10,
            top: ly,
            transform: `translateY(-50%) rotate(-4deg) scale(${lp})`,
            padding: "8px 20px",
            borderRadius: 14,
            background: c,
            color: inkOn(c),
            fontFamily: ink.look.mono,
            fontWeight: 800,
            fontSize: 28,
            textTransform: UP(ink),
            whiteSpace: "nowrap",
            boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
          }}
        >
          {el.label}
        </div>
      ) : null}
    </>
  );
};
