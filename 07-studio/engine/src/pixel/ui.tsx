// Pixel UI layer: title banners, RPG dialog box, popup windows, counter HUD, checklist panel and prop tags.
// Boxes use whole 4 px steps (one low-res pixel) for borders, notched corners and shadows, so they match the art.
// Text stays inside x 90..990; the dialog box (the only element below y 1400) ends at y 1456.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { bannerFace, dialogAt, fitMono, formatCount } from "../../lib/pixel.mjs";
import { BANNER_FONT, PIXEL_FONT, TAG_FONT } from "../fonts";
import type { CaptionPage } from "../types";

export type UiColors = { box: string; border: string; text: string; accent: string; name: string };

/** Notched-corner polygon (one 4 px pixel cut on each corner). */
const NOTCH = "polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))";

/** A pixel panel: dark fill, light 4 px border, inner bevel line, hard drop shadow. */
export const PixelBox: React.FC<{ ui: UiColors; style?: React.CSSProperties; children?: React.ReactNode; border?: string }> = ({ ui, style, children, border }) => (
  <div style={{ position: "absolute", ...style }}>
    <div style={{ position: "absolute", inset: 0, transform: "translate(8px, 8px)", background: "rgba(0,0,0,0.45)", clipPath: NOTCH }} />
    <div style={{ position: "absolute", inset: 0, background: border ?? ui.border, clipPath: NOTCH }} />
    <div style={{ position: "absolute", inset: 8, background: ui.box, clipPath: NOTCH }} />
    <div style={{ position: "absolute", inset: 12, border: `4px solid rgba(255,255,255,0.06)` }} />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

/** Stepped pop-in: the scale snaps through a few whole steps instead of easing (feels like sprite frames). */
export const popScale = (frame: number, enterFrame: number) => {
  const k = frame - enterFrame;
  if (k < 0) return 0;
  return [0.5, 0.5, 0.85, 0.85, 1.08, 1.08, 1][Math.min(6, k)];
};

const norm = (w: string) => w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "");
/** Render words, painting the accent word (or phrase) in `accentColor`. */
export function accentWords(text: string, accent: string | undefined, accentColor: string) {
  const words = text.split(" ");
  const acc = accent ? accent.split(/\s+/).map(norm) : [];
  let hit = -1;
  if (acc.length) for (let i = 0; i + acc.length <= words.length && hit < 0; i++) if (acc.every((a, k) => norm(words[i + k]) === a)) hit = i;
  return words.map((w, i) => (
    <React.Fragment key={i}>
      {i ? " " : ""}
      <span style={hit >= 0 && i >= hit && i < hit + acc.length ? { color: accentColor } : undefined}>{w}</span>
    </React.Fragment>
  ));
}

const ink = "#08060F";
const hardShadow = (c: string, d = 6) => `${d}px ${d}px 0 ${c}, ${d}px 0 0 ${c}, 0 ${d}px 0 ${c}`;
const outline = (c: string, d = 4) => `${d}px 0 0 ${c}, -${d}px 0 0 ${c}, 0 ${d}px 0 ${c}, 0 -${d}px 0 ${c}, ${d}px ${d}px 0 ${c}, -${d}px ${d}px 0 ${c}, ${d}px -${d}px 0 ${c}, -${d}px -${d}px 0 ${c}`;

/** Small tag (kicker, prop label): Silkscreen caps in a tiny dark box. */
export const Tag: React.FC<{ text: string; ui: UiColors; x: number; y: number; color?: string; anchor?: "center" | "left" }> = ({ text, ui, x, y, color, anchor = "center" }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: anchor === "center" ? "translateX(-50%)" : undefined,
      padding: "6px 12px 8px",
      background: ui.box,
      border: `4px solid ${color ?? ui.border}`,
      boxShadow: `4px 4px 0 ${ink}`,
      fontFamily: TAG_FONT,
      fontSize: 24,
      lineHeight: "24px",
      letterSpacing: 2,
      color: color ?? ui.text,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

const faceFont = (text: string) => (bannerFace(text).face === "silkscreen" ? TAG_FONT : BANNER_FONT);
const fitBanner = (text: string) => fitMono(text.toUpperCase(), { maxWidth: 800, sizes: [44, 40, 36, 32, 28], maxLines: 2, advance: bannerFace(text).advance });
/** Bottom edge (px) of a boxed banner, so panels can sit under it. */
export const bannerBottom = (text: string, kicker: boolean) => {
  const fit = fitBanner(text);
  return (kicker ? 348 : 330) + 56 + fit.lines.length * Math.round(fit.size * 1.35) + 16;
};

/** Title banner: boxed (default) or big hero title for the hook. Top edge at y >= 300 (safe zone). */
export const Banner: React.FC<{ text: string; accent?: string; kicker?: string; big?: boolean; ui: UiColors; enterFrame: number }> = ({ text, accent, kicker, big, ui, enterFrame }) => {
  const frame = useCurrentFrame();
  const sc = popScale(frame, enterFrame);
  if (!sc) return null;
  if (big) {
    const fit = fitMono(text.toUpperCase(), { maxWidth: 880, sizes: [96, 88, 80, 72, 64, 56, 48], maxLines: 3, advance: bannerFace(text).advance });
    return (
      <div style={{ position: "absolute", left: 90, width: 900, top: 330, textAlign: "center", transform: `scale(${sc})`, transformOrigin: "50% 0" }}>
        {kicker ? <div style={{ marginBottom: 28, display: "inline-block", position: "relative", height: 44 }}><Tag text={kicker} ui={ui} x={0} y={0} /></div> : null}
        {fit.lines.map((line, i) => (
          <div key={i} style={{ fontFamily: faceFont(text), fontSize: fit.size, lineHeight: `${Math.round(fit.size * 1.3)}px`, color: ui.text, textShadow: `${outline(ink, 6)}, ${hardShadow(ink, 12)}` }}>
            {accentWords(line, accent?.toUpperCase(), ui.accent)}
          </div>
        ))}
      </div>
    );
  }
  const fit = fitBanner(text);
  const width = Math.max(...fit.lines.map((l) => l.length)) * fit.size * bannerFace(text).advance + 72;
  return (
    <div style={{ position: "absolute", left: 540 - width / 2, top: kicker ? 300 : 330, width, transform: `scale(${sc})`, transformOrigin: "50% 50%" }}>
      {kicker ? (
        <div style={{ position: "relative", height: 48 }}>
          <Tag text={kicker} ui={ui} x={width / 2} y={0} color={ui.name} />
        </div>
      ) : null}
      <PixelBox ui={ui} style={{ position: "relative", width }}>
        <div style={{ padding: "30px 36px 26px", textAlign: "center" }}>
          {fit.lines.map((line, i) => (
            <div key={i} style={{ fontFamily: faceFont(text), fontSize: fit.size, lineHeight: `${Math.round(fit.size * 1.35)}px`, color: ui.text, whiteSpace: "nowrap" }}>
              {accentWords(line, accent?.toUpperCase(), ui.accent)}
            </div>
          ))}
        </div>
      </PixelBox>
    </div>
  );
};

/** "Chat"-style popup window: title bar with a close x, message with one accent word. */
export const Popup: React.FC<{ title: string; text: string; accent?: string; ui: UiColors; enterFrame: number; top?: number }> = ({ title, text, accent, ui, enterFrame, top = 440 }) => {
  const frame = useCurrentFrame();
  const sc = popScale(frame, enterFrame);
  if (!sc) return null;
  return (
    <PixelBox ui={ui} style={{ left: 150, top, width: 780, transform: `scale(${sc})`, transformOrigin: "50% 50%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 8px 0", padding: "14px 24px 12px", background: ui.border }}>
        <span style={{ fontFamily: TAG_FONT, fontSize: 28, color: ui.box, letterSpacing: 3, textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontFamily: BANNER_FONT, fontSize: 24, color: ui.box }}>x</span>
      </div>
      <div style={{ padding: "22px 36px 32px", fontFamily: PIXEL_FONT, fontWeight: 600, fontSize: 46, lineHeight: "58px", color: ui.text }}>{accentWords(text, accent, ui.accent)}</div>
    </PixelBox>
  );
};

/** Counter HUD: a big number counting from `from` to `value`, with a diamond icon and a label tag under it. */
export const Counter: React.FC<{ value: number; from?: number; label: string; prefix?: string; suffix?: string; ui: UiColors; enterFrame: number; top?: number }> = ({ value, from = 0, label, prefix = "", suffix = "", ui, enterFrame, top = 440 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = popScale(frame, enterFrame);
  if (!sc) return null;
  const p = Math.min(1, Math.max(0, (frame - enterFrame - 6) / (1.2 * fps)));
  // stepped count: 24 distinct values, like an arcade score ticking up
  const q = Math.floor(p * 24) / 24;
  const n = from + (value - from) * (1 - (1 - q) ** 2);
  const txt = `${prefix}${formatCount(p >= 1 ? value : n)}${suffix}`;
  const size = txt.length > 10 ? 52 : txt.length > 8 ? 60 : 72;
  const width = txt.length * size + 160;
  return (
    <div style={{ position: "absolute", left: 540 - width / 2, top, width, transform: `scale(${sc})`, transformOrigin: "50% 50%" }}>
      <PixelBox ui={ui} style={{ position: "relative", width }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "30px 32px 26px" }}>
          <div style={{ width: 28, height: 28, background: ui.accent, transform: "rotate(45deg)", boxShadow: `0 0 0 4px ${ink}` }} />
          <span style={{ fontFamily: BANNER_FONT, fontSize: size, lineHeight: `${size + 8}px`, color: ui.accent, textShadow: hardShadow(ink, 6) }}>{txt}</span>
        </div>
      </PixelBox>
      <div style={{ position: "relative", height: 60 }}>
        <Tag text={label} ui={ui} x={width / 2} y={20} />
      </div>
    </div>
  );
};

/** Checklist panel: numbered squares, items tick in order with a pixel check mark. */
export const Checklist: React.FC<{ title?: string; items: string[]; checks: number[]; ui: UiColors; enterFrame: number; sceneStartFrame: number; top?: number }> = ({ title, items, checks, ui, enterFrame, sceneStartFrame, top = 440 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sc = popScale(frame, enterFrame);
  if (!sc) return null;
  return (
    <PixelBox ui={ui} border={ui.accent} style={{ left: 170, top, width: 740, transform: `scale(${sc})`, transformOrigin: "50% 0" }}>
      <div style={{ padding: "30px 40px 30px" }}>
        {title ? <div style={{ fontFamily: TAG_FONT, fontSize: 30, color: ui.name, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginBottom: 18 }}>{title}</div> : null}
        {items.map((it, k) => {
          const done = frame - sceneStartFrame >= Math.round(checks[k] * fps);
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 22, marginTop: k ? 16 : 0 }}>
              <div style={{ width: 44, height: 44, background: ui.accent, color: ui.box, fontFamily: BANNER_FONT, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{k + 1}</div>
              <div style={{ flex: 1, fontFamily: PIXEL_FONT, fontWeight: 600, fontSize: 40, lineHeight: "48px", color: done ? ui.text : `${ui.text}88` }}>{it}</div>
              <PixelCheck color={done ? ui.accent : "transparent"} />
            </div>
          );
        })}
      </div>
    </PixelBox>
  );
};

const CHECK = ["......xx", ".....xx.", "x...xx..", "xx.xx...", ".xxx....", "..x....."];
export const PixelCheck: React.FC<{ color: string; px?: number }> = ({ color, px = 5 }) => (
  <svg width={8 * px} height={6 * px} viewBox="0 0 8 6" shapeRendering="crispEdges" style={{ flex: "none" }}>
    {CHECK.flatMap((row, y) => [...row].map((ch, x) => (ch === "x" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
  </svg>
);

/**
 * RPG dialog box at the bottom: optional portrait square, speaker name in accent small caps, and the narration typed
 * in sync with the spoken words (caption pages). Spans x 60..1020, y 1236..1456; text stays inside x 90..990.
 */
export const DialogBox: React.FC<{ pages: CaptionPage[]; speakerAt: (ms: number) => string | null; ui: UiColors; portrait?: React.ReactNode }> = ({ pages, speakerAt, ui, portrait }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const d = dialogAt(pages, ms);
  if (!d) return null;
  const speaker = speakerAt(ms);
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <PixelBox ui={ui} style={{ left: 60, top: 1236, width: 960, height: 220 }}>
        <div style={{ display: "flex", gap: 26, padding: "30px 34px 0 34px" }}>
          {portrait ? (
            <div style={{ width: 152, height: 152, flex: "none", border: `4px solid ${ui.border}`, background: "#00000055", overflow: "hidden", position: "relative" }}>{portrait}</div>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            {speaker ? <div style={{ fontFamily: TAG_FONT, fontSize: 26, letterSpacing: 3, color: ui.name, textTransform: "uppercase", marginBottom: 10 }}>{speaker}</div> : null}
            {/* the full text reserves the layout so lines never re-wrap while typing */}
            <div style={{ position: "relative", fontFamily: PIXEL_FONT, fontWeight: 500, fontSize: 44, lineHeight: "54px", color: ui.text }}>
              <span style={{ visibility: "hidden" }}>{d.full}</span>
              <span style={{ position: "absolute", left: 0, top: 0 }}>{d.text}</span>
            </div>
          </div>
        </div>
        {d.done && blink ? <div style={{ position: "absolute", right: 40, top: 168, width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: `16px solid ${ui.accent}` }} /> : null}
      </PixelBox>
    </AbsoluteFill>
  );
};
