// Diegetic explainer UI over the 3D stage (`visual.overlay`, lib/scene3d-motion.mjs overlaySchema): a top strip of
// flow-diagram chips with live values, a concept-name pill, a demand bar that turns to the over-limit color past its
// limit, and a "not equal" card. Every color comes from lib/scene3d.mjs overlayColors (palette roles plus neutrals,
// contrast-checked); every value is a pure function of the frame.
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { overlayColors } from "../../lib/scene3d.mjs";
import { REGIONS } from "../../lib/illustrated.mjs";
import type { IconData, Overlay3DPlan, Palette } from "../types";
import { rgba } from "../util";
import type { Look3D } from "./looks";

type Colors = ReturnType<typeof overlayColors>;
type Ctx = { hudY: number; c: Colors; icons: Record<string, IconData>; font: string; t: number; frame: number; fps: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EXIT = 0.25;
/** Vertical slots: the flow strip rides the HUD band; the pill and the card sit below it (or at the top without a flow). */
const FLOW_H = 168;
const GAP = 16;

const Glyph: React.FC<{ name: string | undefined; size: number; color: string; ctx: Ctx }> = ({ name, size, color, ctx }) => {
  const data = name ? ctx.icons[name.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-duotone$/, "")] : undefined;
  if (!data) return <div style={{ width: size, height: size }} />;
  return (
    <svg width={size} height={size} viewBox={data.viewBox} style={{ display: "block" }}>
      {data.back.map((d, i) => (
        <path key={`b${i}`} d={d} fill={color} opacity={0.28} />
      ))}
      {data.outline.map((d, i) => (
        <path key={`o${i}`} d={d} fill={color} />
      ))}
    </svg>
  );
};

/** Entrance spring and exit fade of one overlay element. */
const useWindow = (o: { at: number; until: number | null }, fps: number) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const p = spring({ frame: frame - Math.round(o.at * fps), fps, config: { damping: 14, stiffness: 150 } });
  const out = o.until === null ? 1 : interpolate(t, [o.until - EXIT, o.until], [1, 0], clamp);
  return { p: Math.max(0, p), alpha: Math.min(1, p * 1.4) * out, visible: t >= o.at - 0.01 && out > 0.001 };
};

const Flow: React.FC<{ o: Extract<Overlay3DPlan, { type: "flow" }>; ctx: Ctx }> = ({ o, ctx }) => {
  const { c, t, fps } = ctx;
  const w = useWindow(o, fps);
  if (!w.visible) return null;
  const n = o.chips.length;
  const W = REGIONS.hud.w;
  const ARROW = 46;
  const chipW = (W - 48 - (n - 1) * ARROW) / n;
  // state at t: the initial highlight and values, then every step that has happened
  let active = o.active ?? o.chips[0].id;
  const values: Record<string, string> = Object.fromEntries(o.chips.filter((x) => x.value).map((x) => [x.id, x.value as string]));
  const stamp: Record<string, number> = {};
  for (const st of o.steps ?? []) {
    if (st.at > t) break;
    if (st.active) active = st.active;
    for (const [id, v] of Object.entries(st.values ?? {})) {
      if (values[id] !== v) stamp[id] = st.at;
      values[id] = v;
    }
  }
  const ai = Math.max(0, o.chips.findIndex((x) => x.id === active));
  const tile = 70;
  return (
    <div style={{ position: "absolute", left: REGIONS.hud.x, top: ctx.hudY, width: W, height: FLOW_H, boxSizing: "border-box", padding: "14px 24px", borderRadius: 30, background: rgba(c.panel, 0.94), border: `2px solid ${rgba(c.panelText, 0.16)}`, boxShadow: "0 14px 30px rgba(20,25,40,0.32)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", opacity: w.alpha, transform: `translateY(${(1 - w.p) * -40}px)`, fontFamily: ctx.font }}>
      {o.chips.map((chip, i) => {
        const on = i === ai;
        const pop = stamp[chip.id] !== undefined ? spring({ frame: ctx.frame - Math.round(stamp[chip.id] * fps), fps, config: { damping: 9, stiffness: 220 } }) : 1;
        const size = Math.min(22, (chipW - 6) / (chip.label.length * 0.68));
        return (
          <React.Fragment key={chip.id}>
            <div style={{ width: chipW, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: tile, height: tile, borderRadius: 20, background: on ? c.active : c.chip, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${on ? 1.08 : 1})`, boxShadow: on ? `0 0 0 4px ${rgba(c.active, 0.35)}, 0 0 24px ${rgba(c.active, 0.55)}` : "none" }}>
                <Glyph name={chip.icon} size={42} color={on ? c.activeInk : c.chipInk} ctx={ctx} />
              </div>
              <div style={{ fontWeight: 800, fontSize: size, letterSpacing: 0.5, color: on ? c.panelText : c.muted, textTransform: "uppercase", whiteSpace: "nowrap" }}>{chip.label}</div>
              <div style={{ minHeight: 28, fontWeight: 900, fontSize: 26, color: on ? c.active : c.panelText, transform: `scale(${interpolate(pop, [0, 1], [0.7, 1], clamp)})`, whiteSpace: "nowrap" }}>{values[chip.id] ?? ""}</div>
            </div>
            {i < n - 1 ? (
              <svg width={ARROW} height={tile} viewBox={`0 0 ${ARROW} ${tile}`} style={{ flex: "0 0 auto", marginTop: 0 }}>
                <line x1={4} y1={tile / 2} x2={ARROW - 10} y2={tile / 2} stroke={i === ai ? c.signal : c.muted} strokeWidth={4} strokeLinecap="round" strokeDasharray={i === ai ? "2 8" : undefined} strokeDashoffset={i === ai ? -(t * 36) % 20 : 0} />
                <polyline points={`${ARROW - 18},${tile / 2 - 10} ${ARROW - 6},${tile / 2} ${ARROW - 18},${tile / 2 + 10}`} fill="none" stroke={i === ai ? c.signal : c.muted} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Concept: React.FC<{ o: Extract<Overlay3DPlan, { type: "concept" }>; ctx: Ctx; top: number }> = ({ o, ctx, top }) => {
  const { c } = ctx;
  const w = useWindow(o, ctx.fps);
  if (!w.visible) return null;
  const size = Math.min(44, (REGIONS.hud.w - 120) / (o.text.length * 0.72));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: w.alpha, transform: `translateY(${(1 - w.p) * -24}px) scale(${0.9 + 0.1 * w.p})`, fontFamily: ctx.font }}>
      <div style={{ padding: "10px 36px", borderRadius: 999, background: c.concept, color: c.conceptInk, border: `4px solid ${c.conceptInk}`, boxShadow: "0 10px 0 rgba(20,25,40,0.28)", fontWeight: 900, fontSize: size, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{o.text}</div>
    </div>
  );
};

/** Demand at time t: linear glide (0.6 s) from each step to the next value. */
const demandAt = (o: Extract<Overlay3DPlan, { type: "limit" }>, t: number) => {
  let v = o.value ?? 0;
  for (const st of o.steps ?? []) {
    if (t < st.at) break;
    v = interpolate(t, [st.at, st.at + 0.6], [v, st.value], { ...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1) });
    if (t < st.at + 0.6) break;
    v = st.value;
  }
  return v;
};

const Limit: React.FC<{ o: Extract<Overlay3DPlan, { type: "limit" }>; ctx: Ctx; top: number }> = ({ o, ctx, top }) => {
  const { c, t } = ctx;
  const w = useWindow(o, ctx.fps);
  if (!w.visible) return null;
  const limit = o.limit ?? 0.8;
  const v = demandAt(o, t);
  const over = v > limit + 1e-6;
  const BAR = 30;
  const barW = REGIONS.hud.w - 56;
  const tickX = limit * barW;
  const shake = over ? Math.sin(t * 38) * 2 : 0;
  return (
    <div style={{ position: "absolute", left: REGIONS.hud.x, top, width: REGIONS.hud.w, boxSizing: "border-box", padding: "16px 28px 14px", borderRadius: 28, background: rgba(c.panel, 0.94), border: `2px solid ${over ? c.over : rgba(c.panelText, 0.16)}`, boxShadow: "0 14px 30px rgba(20,25,40,0.32)", opacity: w.alpha, transform: `translateY(${(1 - w.p) * -30}px) translateX(${shake}px)`, fontFamily: ctx.font }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: 44 }}>
        <div style={{ fontWeight: 900, fontSize: 32, letterSpacing: 1, color: c.panelText, textTransform: "uppercase" }}>{o.label}</div>
        <div style={{ display: "flex", gap: 10, marginLeft: 6 }}>
          {(o.icons ?? []).map((n, i) => (
            <Glyph key={i} name={n} size={36} color={c.muted} ctx={ctx} />
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontWeight: 900, fontSize: 34, color: over ? c.overText : c.accentText }}>{Math.round(v * 100)} %</div>
      </div>
      <div style={{ position: "relative", marginTop: 12, width: barW, height: BAR, borderRadius: BAR / 2, background: c.track, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(1, v) * 100}%`, height: "100%", borderRadius: BAR / 2, background: over ? c.over : c.fill }} />
      </div>
      <div style={{ position: "relative", width: barW, height: 36 }}>
        <div style={{ position: "absolute", left: tickX - 2, top: -BAR - 6, width: 4, height: BAR + 12, background: c.panelText, borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 8, left: 0, width: barW, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 22, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <span style={{ color: c.muted }}>{o.limitLabel ?? ""}</span>
          {over && o.note ? <span style={{ color: c.overText }}>{o.note}</span> : null}
        </div>
      </div>
    </div>
  );
};

const Versus: React.FC<{ o: Extract<Overlay3DPlan, { type: "versus" }>; ctx: Ctx; top: number }> = ({ o, ctx, top }) => {
  const { c } = ctx;
  const w = useWindow(o, ctx.fps);
  if (!w.visible) return null;
  const side = (s: { title: string; sub?: string; icon?: string }, k: number) => (
    <div key={k} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
      {s.icon ? (
        <div style={{ width: 62, height: 62, borderRadius: 18, background: c.chip, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
          <Glyph name={s.icon} size={38} color={c.chipInk} ctx={ctx} />
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: 0.5, color: c.panelText, textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.title}</div>
        {s.sub ? <div style={{ fontWeight: 700, fontSize: 22, color: c.muted, whiteSpace: "nowrap" }}>{s.sub}</div> : null}
      </div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: REGIONS.hud.x, top, width: REGIONS.hud.w, boxSizing: "border-box", padding: "18px 24px", borderRadius: 28, background: rgba(c.panel, 0.94), border: `2px solid ${rgba(c.panelText, 0.16)}`, boxShadow: "0 14px 30px rgba(20,25,40,0.32)", display: "flex", alignItems: "center", opacity: w.alpha, transform: `translateY(${(1 - w.p) * -30}px) scale(${0.94 + 0.06 * w.p})`, fontFamily: ctx.font }}>
      {side(o.left, 0)}
      <div style={{ flex: "0 0 auto", width: 84, textAlign: "center", fontWeight: 900, fontSize: 76, lineHeight: 1, color: c.accentText, transform: `rotate(${(1 - w.p) * -40}deg)` }}>{"≠"}</div>
      {side(o.right, 1)}
    </div>
  );
};

export const CutawayOverlay: React.FC<{ overlay: Overlay3DPlan[]; palette: Palette; icons: Record<string, IconData>; look: Look3D; top?: number }> = ({ overlay, palette, icons, look, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = overlayColors(palette);
  const hudY = top ?? REGIONS.hud.y;
  const ctx: Ctx = { hudY, c, icons, font: look.label.font, t: frame / fps, frame, fps };
  const hasFlow = overlay.some((o) => o.type === "flow");
  const base = hasFlow ? hudY + FLOW_H + GAP : hudY + 18;
  const hasConcept = overlay.some((o) => o.type === "concept");
  const cardTop = base + (hasConcept ? 84 : 0);
  return (
    <>
      {overlay.map((o, i) => {
        switch (o.type) {
          case "flow":
            return <Flow key={i} o={o} ctx={ctx} />;
          case "concept":
            return <Concept key={i} o={o} ctx={ctx} top={base} />;
          case "limit":
            return <Limit key={i} o={o} ctx={ctx} top={cardTop} />;
          default:
            return <Versus key={i} o={o} ctx={ctx} top={cardTop} />;
        }
      })}
    </>
  );
};
