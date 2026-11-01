// Scene headlines of the non-blueprint looks. Every headline lives inside REGIONS.title, is anchored to its top
// and shrinks to fit (width and height), so it never grows into the HUD above or the stage below.
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { REGIONS } from "../../lib/illustrated.mjs";
import { inkOn, rgba } from "../util";
import { RoughShape, progress, useKit } from "./kit";
import type { Look } from "./looks";
import { ArtHeadline } from "./artstyles";
import { FormatHeadline, isFormatLook } from "./formats2d";

type HP = { kicker?: string; main: string; quote?: boolean; number?: number; color: string; index: number; language: string };

/** Font size that fits `text` in `width` x `height` with at most `maxLines` lines. */
export const fitText = (text: string, width: number, height: number, em: number, max: number, maxLines = 3, lineH = 1.08) => {
  const chars = [...text].length;
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => [...w].length));
  // Try every line count and keep the largest size; a greedy wrap wastes some room, so budget 15% slack per wrapped line.
  let best = { size: 0, lines: 1 };
  for (let lines = 1; lines <= maxLines; lines++) {
    const perLine = lines === 1 ? chars : Math.ceil(chars / lines) * 1.15;
    const size = Math.floor(Math.min(max, width / (perLine * em), width / (longest * em), height / (lines * lineH)));
    if (size > best.size) best = { size, lines };
  }
  return best;
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps, frame, fps };
};

/* ---------------- whiteboard: handwritten, written on left to right, marker underline ---------------- */
const WhiteboardHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, number, color, index, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = quote ? `"${main}"` : main;
  const numW = number !== undefined ? 150 : 0;
  const w = r.w - numW;
  const KICK = kicker ? 60 : 0;
  const fit = fitText(text, w, r.h - KICK - 26, look.displayEm, 104, 2, 1.12);
  const write = progress(t, 0.15, 0.25 + [...text].length * 0.025, Easing.bezier(0.45, 0, 0.55, 1));
  const k = progress(t, 0.05, 0.3);
  const lineW = Math.min(w, [...text].length * fit.size * look.displayEm / fit.lines + 40);
  const textH = fit.lines * fit.size * 1.12;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", alignItems: "flex-start" }}>
      {number !== undefined ? (
        <div style={{ position: "relative", width: numW, height: 140, flex: `0 0 ${numW}px`, marginTop: KICK }}>
          <svg width={140} height={140} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <RoughShape shape={{ kind: "ellipse", cx: 66, cy: 66, w: 120, h: 112 }} seed={index + 21} t={t} start={0.05} dur={0.45} stroke={color} width={6} roughness={1.4} />
          </svg>
          <div style={{ position: "absolute", left: 0, top: 0, width: 132, height: 132, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: look.display, fontSize: 74, color: ink.text, opacity: progress(t, 0.25, 0.2) }}>{number}</div>
        </div>
      ) : null}
      <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: number !== undefined ? "flex-start" : "center", textAlign: number !== undefined ? "left" : "center" }}>
        {kicker ? (
          <div style={{ height: KICK, fontFamily: look.body, fontWeight: 700, fontSize: 42, color: ink.muted, opacity: k, transform: `rotate(-1.5deg) translateY(${(1 - k) * -10}px)` }}>{kicker}</div>
        ) : null}
        <div style={{ position: "relative" }}>
          <div style={{ fontFamily: look.display, fontSize: fit.size, lineHeight: 1.12, color, clipPath: `inset(-20px ${(1 - write) * 100}% -20px -20px)`, transform: "rotate(-1deg)" }}>{text}</div>
          <svg width={lineW} height={30} style={{ position: "absolute", left: number !== undefined ? 0 : `calc(50% - ${lineW / 2}px)`, top: textH - 4, overflow: "visible" }}>
            <RoughShape shape={{ kind: "curve", points: [[6, 14], [lineW * 0.5, 22], [lineW - 6, 10]] }} seed={index + 5} t={t} start={0.2 + write * 0 + 0.25 + [...text].length * 0.025} dur={0.35} stroke={ink.text} width={6} roughness={1.2} />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ---------------- breaking news: red section tab + white lower-third bar ---------------- */
const NewsHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const TAB = kicker ? 72 : 0;
  const fit = fitText(text, r.w - 60, r.h - TAB - 30, look.displayEm, 92, 2, 1.12);
  const tab = progress(t, 0.0, 0.18, Easing.bezier(0.16, 1, 0.3, 1));
  const bar = progress(t, 0.12, 0.24, Easing.bezier(0.16, 1, 0.3, 1));
  const txt = progress(t, 0.28, 0.22, Easing.bezier(0.16, 1, 0.3, 1));
  const dot = 0.35 + 0.65 * Math.abs(Math.sin(t * 4));
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h }}>
      {kicker ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, height: 60, padding: "0 22px", background: ink.accent, color: "#FFFFFF", fontFamily: look.display, fontWeight: 700, fontSize: 38, letterSpacing: 2, textTransform: "uppercase", transform: `translateX(${(1 - tab) * -260}px)`, opacity: tab > 0 ? 1 : 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#FFFFFF", opacity: dot }} />
          {kicker}
        </div>
      ) : null}
      <div style={{ marginTop: kicker ? 12 : 0, display: "inline-block", maxWidth: r.w, background: "#FFFFFF", boxShadow: `10px 10px 0 ${rgba(ink.accent, 0.9)}`, clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)`, padding: "8px 26px 10px" }}>
        <div style={{ fontFamily: look.display, fontWeight: 700, fontSize: fit.size, lineHeight: 1.12, color: "#0A0A0C", transform: `translateY(${(1 - txt) * 40}px)`, opacity: txt }}>{text}</div>
      </div>
    </div>
  );
};

/* ---------------- data story: editorial serif, left aligned, rule + kicker ---------------- */
const EditorialHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, color, look }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const text = quote ? `“${main}”` : main;
  const KICK = kicker ? 64 : 0;
  const fit = fitText(text, r.w, r.h - KICK - 8, look.displayEm, 100, 3, 1.05);
  const rule = progress(t, 0.05, 0.5, Easing.bezier(0.65, 0, 0.35, 1));
  const k = progress(t, 0.15, 0.5, Easing.bezier(0.65, 0, 0.35, 1));
  const m = progress(t, 0.3, 0.7, Easing.bezier(0.65, 0, 0.35, 1));
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h }}>
      {kicker ? (
        <div style={{ height: KICK }}>
          <div style={{ width: 90 * rule, height: 6, background: color }} />
          <div style={{ marginTop: 12, fontFamily: look.body, fontWeight: 800, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color, opacity: k }}>{kicker}</div>
        </div>
      ) : null}
      <div style={{ fontFamily: look.display, fontWeight: 400, fontSize: fit.size, lineHeight: 1.05, letterSpacing: -0.5, color: ink.text, opacity: m, transform: `translateY(${(1 - m) * 26}px)` }}>{text}</div>
    </div>
  );
};

/* ---------------- code tutorial: step badge + file tab + typed prompt line ---------------- */
const CodeHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, number, look, language }) => {
  const { ink } = useKit();
  const { t } = useT();
  const r = REGIONS.title;
  const ROW = kicker || number !== undefined ? 76 : 0;
  const fit = fitText(`> ${main}`, r.w, r.h - ROW - 6, 0.62, 78, 3, 1.18);
  const chars = [...main];
  const start = 0.3;
  const cps = Math.max(28, chars.length / 0.9);
  const n = Math.max(0, Math.min(chars.length, Math.floor((t - start) * cps)));
  const typing = n < chars.length;
  const blink = typing || Math.floor(t * 2.4) % 2 === 0;
  const row = progress(t, 0.0, 0.25);
  const step = language.toLowerCase().startsWith("es") ? "PASO" : "STEP";
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h }}>
      {ROW ? (
        <div style={{ height: ROW, display: "flex", alignItems: "flex-start", gap: 16, opacity: row }}>
          {number !== undefined ? (
            <div style={{ height: 56, padding: "0 20px", display: "flex", alignItems: "center", borderRadius: 10, background: ink.accent, color: inkOn(ink.accent), fontFamily: look.mono, fontWeight: 800, fontSize: 30 }}>
              {step} {String(number).padStart(2, "0")}
            </div>
          ) : null}
          {kicker ? (
            <div style={{ height: 56, maxWidth: 640, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", padding: "0 22px", display: "flex", alignItems: "center", borderRadius: "10px 10px 0 0", background: ink.surface2, borderTop: `4px solid ${ink.accent3}`, color: ink.accent3, fontFamily: look.mono, fontWeight: 700, fontSize: 28 }}>
              {kicker}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ fontFamily: look.mono, fontWeight: 800, fontSize: fit.size, lineHeight: 1.18, color: ink.text, wordBreak: "break-word" }}>
        <span style={{ color: ink.accent }}>{">"} </span>
        {chars.slice(0, n).join("")}
        {/* zero-advance cursor: it never pushes the last word onto a new line */}
        <span style={{ display: "inline-block", width: 0, overflow: "visible", verticalAlign: "text-bottom" }}>
          {blink ? <span style={{ display: "block", width: fit.size * 0.55, height: fit.size * 0.95, marginLeft: 4, background: ink.accent2 }} /> : null}
        </span>
        {/* reserve the final size so the layout does not reflow while typing */}
        <span style={{ visibility: "hidden" }}>{chars.slice(n).join("")}</span>
      </div>
    </div>
  );
};

/* ---------------- top list: giant slammed rank + bold condensed title ---------------- */
const RankHeadline: React.FC<HP & { look: Look }> = ({ kicker, main, quote, number, color, index, look }) => {
  const { ink } = useKit();
  const { t, frame, fps } = useT();
  const r = REGIONS.title;
  const text = (quote ? `"${main}"` : main).toUpperCase();
  const has = number !== undefined;
  const numW = has ? (String(number).length > 1 ? 300 : 230) : 0;
  const w = r.w - numW - (has ? 20 : 0);
  const KICK = kicker ? 52 : 0;
  const fit = fitText(text, w, r.h - KICK - 6, look.displayEm, has ? 104 : 126, 3, 1.02);
  const slam = interpolate(t, [0.05, 0.23], [3.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const ring = progress(t, 0.23, 0.45);
  const k = progress(t, 0.25, 0.3);
  const words = text.split(/\s+/);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", alignItems: "center", justifyContent: "center", gap: has ? 20 : 0 }}>
      {has ? (
        <div style={{ position: "relative", width: numW, height: r.h, flex: `0 0 ${numW}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {ring > 0 && ring < 1 ? <div style={{ position: "absolute", left: numW / 2 - 130, top: r.h / 2 - 130, width: 260, height: 260, borderRadius: 130, border: `${10 * (1 - ring)}px solid ${ink.accent3}`, transform: `scale(${0.6 + ring * 0.9})`, opacity: 1 - ring }} /> : null}
          <div style={{ fontFamily: look.display, fontSize: 228, lineHeight: 1, color: ink.accent, transform: `scale(${slam}) rotate(-6deg)`, opacity: t >= 0.05 ? 1 : 0, textShadow: `9px 9px 0 ${ink.accent2}, 18px 18px 0 ${ink.drop}` }}>
            <span style={{ fontSize: 110, verticalAlign: "top" }}>#</span>
            {number}
          </div>
        </div>
      ) : null}
      <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: has ? "flex-start" : "center", textAlign: has ? "left" : "center" }}>
        {kicker ? <div style={{ height: KICK, fontFamily: look.body, fontWeight: 800, fontSize: 36, letterSpacing: 2, textTransform: "uppercase", color: ink.accent3, opacity: k, transform: `translateX(${(1 - k) * 40}px)` }}>{kicker}</div> : null}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: has ? "flex-start" : "center", columnGap: Math.round(fit.size * 0.24), fontFamily: look.display, fontSize: fit.size, lineHeight: 1.02 }}>
          {words.map((wd, i) => {
            const p = spring({ frame: frame - Math.round((0.3 + i * 0.08) * fps), fps, config: { damping: 9, stiffness: 200 } });
            return (
              <span key={i} style={{ display: "inline-block", color: i === words.length - 1 && words.length > 1 ? color : ink.text, opacity: Math.min(1, p * 3), transform: `translateY(${interpolate(p, [0, 1], [-60, 0])}px) scale(${Math.min(1, interpolate(p, [0, 1], [0.5, 1]))})`, textShadow: `0 8px 0 ${ink.drop}` }}>
                {wd}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Headline of a non-blueprint look (blueprint keeps its own Headline in IllustratedScene). */
export const LookHeadline: React.FC<HP> = (props) => {
  const { look } = useKit();
  switch (look.id) {
    case "whiteboard":
      return <WhiteboardHeadline {...props} look={look} />;
    case "broadcast":
      return <NewsHeadline {...props} look={look} />;
    case "editorial-chart":
      return <EditorialHeadline {...props} look={look} />;
    case "editor-window":
      return <CodeHeadline {...props} look={look} />;
    case "rank-numbers":
      return <RankHeadline {...props} look={look} />;
    default:
      if (isFormatLook(look.id)) return <FormatHeadline {...props} look={look} />;
      return <ArtHeadline {...props} look={look} />;
  }
};
