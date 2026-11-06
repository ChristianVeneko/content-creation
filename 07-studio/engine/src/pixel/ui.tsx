// Pixel UI layer: title banners, RPG dialog box, popup windows, counter HUD, checklist panel and prop tags.
// Boxes use whole 4 px steps (one low-res pixel) for borders, notched corners and shadows, so they match the art.
// Text stays inside x 90..990; the dialog box (the only element below y 1400) ends at y 1456.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CROWN_ROWS, STAR_ROWS, bannerFace, dialogAt, fitMono, formatCount, rankRows, starsOf } from "../../lib/pixel.mjs";
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
export const Banner: React.FC<{ text: string; accent?: string; kicker?: string; big?: boolean; ui: UiColors; enterFrame: number; shift?: number }> = ({ text, accent, kicker, big, ui, enterFrame, shift = 0 }) => {
  const frame = useCurrentFrame();
  const sc = popScale(frame, enterFrame);
  if (!sc) return null;
  if (big) {
    const fit = fitMono(text.toUpperCase(), { maxWidth: 880, sizes: [96, 88, 80, 72, 64, 56, 48], maxLines: 3, advance: bannerFace(text).advance });
    return (
      <div style={{ position: "absolute", left: 90, width: 900, top: 330 + shift, textAlign: "center", transform: `scale(${sc})`, transformOrigin: "50% 0" }}>
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
    <div style={{ position: "absolute", left: 540 - width / 2, top: (kicker ? 300 : 330) + shift, width, transform: `scale(${sc})`, transformOrigin: "50% 50%" }}>
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

/* ================================================================ versus format ================================================================ */

/** A pixel-art shape from rows of `x` cells, drawn as crisp rects (the crown and the star of the versus UI). */
const PixelShape: React.FC<{ rows: string[]; px: number; color: string; style?: React.CSSProperties }> = ({ rows, px, color, style }) => (
  <svg width={rows[0].length * px} height={rows.length * px} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" style={{ flex: "none", ...style }}>
    {rows.flatMap((row, y) => [...row].map((ch, x) => (ch === "x" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)))}
  </svg>
);
export const PixelCrown: React.FC<{ color: string; px?: number; style?: React.CSSProperties }> = ({ color, px = 4, style }) => <PixelShape rows={CROWN_ROWS} px={px} color={color} style={style} />;

/** Five pixel stars for a rating in half steps: full, half (left half lit) and empty. */
export const PixelStars: React.FC<{ rating: number; ui: UiColors; px?: number }> = ({ rating, ui, px = 4 }) => {
  const dim = `${ui.text}40`;
  return (
    <div style={{ display: "flex", gap: px * 1.5 }}>
      {starsOf(rating).map((st, i) =>
        st === "half" ? (
          <div key={i} style={{ position: "relative", width: 7 * px, height: 7 * px }}>
            <PixelShape rows={STAR_ROWS} px={px} color={dim} style={{ position: "absolute", left: 0, top: 0 }} />
            <div style={{ position: "absolute", left: 0, top: 0, width: 3.5 * px, height: 7 * px, overflow: "hidden" }}>
              <PixelShape rows={STAR_ROWS} px={px} color={ui.accent} />
            </div>
          </div>
        ) : (
          <PixelShape key={i} rows={STAR_ROWS} px={px} color={st === "full" ? ui.accent : dim} />
        ),
      )}
    </div>
  );
};

/** "ROUND n/N" title card: pops in, holds until `until`, then shrinks away in whole steps. */
export const RoundCard: React.FC<{ n: number; of: number; title?: string; ui: UiColors; at: number; until: number }> = ({ n, of, title, ui, at, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = popScale(frame, Math.round(at * fps));
  const out = frame - Math.round(until * fps);
  const sc = out < 0 ? enter : [0.9, 0.7, 0.45, 0][Math.min(3, Math.floor(out / 2))] ?? 0;
  if (!sc) return null;
  return (
    <PixelBox ui={ui} border={ui.accent} style={{ left: 200, top: 560, width: 680, transform: `scale(${sc})`, transformOrigin: "50% 50%" }}>
      <div style={{ padding: "34px 36px 36px", textAlign: "center" }}>
        <div style={{ fontFamily: TAG_FONT, fontSize: 36, letterSpacing: 10, color: ui.name, textTransform: "uppercase" }}>Round</div>
        <div style={{ fontFamily: BANNER_FONT, fontSize: 132, lineHeight: "150px", color: ui.accent, textShadow: `${outline(ink, 6)}, ${hardShadow(ink, 12)}` }}>{n}/{of}</div>
        {title ? <div style={{ marginTop: 10, fontFamily: TAG_FONT, fontSize: 38, letterSpacing: 4, color: ui.text, textTransform: "uppercase" }}>{title}</div> : null}
      </div>
    </PixelBox>
  );
};

type Fighter = { name: string; stars: number; crown?: boolean };
/** Header strip of the stage: one cell per contestant with its name, its pixel stars and an optional crown. */
export const VersusHeader: React.FC<{ fighters: Fighter[]; ui: UiColors; enterFrame: number }> = ({ fighters, ui, enterFrame }) => {
  const frame = useCurrentFrame();
  const sc = popScale(frame, enterFrame);
  if (!sc) return null;
  return (
    <PixelBox ui={ui} style={{ left: 90, top: 310, width: 900, transform: `scale(${sc})`, transformOrigin: "50% 0" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "22px 20px 20px" }}>
        {fighters.flatMap((f, i) => [
          i > 0 ? <div key={`v${i}`} style={{ fontFamily: BANNER_FONT, fontSize: 24, color: ui.accent, padding: "0 6px", flex: "none" }}>VS</div> : null,
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, height: 34 }}>
              {f.crown ? <PixelCrown color={ui.accent} px={3} /> : null}
              <span style={{ fontFamily: TAG_FONT, fontSize: 30, letterSpacing: 3, color: ui.name, textTransform: "uppercase", whiteSpace: "nowrap" }}>{f.name}</span>
            </div>
            <PixelStars rating={f.stars} ui={ui} px={4} />
          </div>,
        ])}
      </div>
    </PixelBox>
  );
};

const stepped = (p: number, steps = 12) => Math.floor(Math.min(1, Math.max(0, p)) * steps) / steps;

/** Ranking panel: rows with rank, name, a bar that fills in steps and the score; rows enter one after another. */
export const Ranking: React.FC<{ title?: string; rows: { name: string; score: number; crown?: boolean }[]; unit?: string; max?: number; times: number[]; ui: UiColors; top?: number }> = ({ title, rows, unit = "", max, times, ui, top = 440 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sc = popScale(frame, 4);
  if (!sc) return null;
  const ranked = rankRows(rows, max) as { name: string; score: number; crown?: boolean; rank: number; ratio: number }[];
  return (
    <PixelBox ui={ui} border={ui.accent} style={{ left: 110, top, width: 860, transform: `scale(${sc})`, transformOrigin: "50% 0" }}>
      <div style={{ padding: "26px 30px 28px" }}>
        {title ? <div style={{ fontFamily: TAG_FONT, fontSize: 30, color: ui.name, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>{title}</div> : null}
        {ranked.map((r, k) => {
          const q = Math.min(1, Math.max(0, (t - times[k]) / 0.18));
          const fill = stepped((t - times[k] - 0.1) / 0.6);
          const shown = Math.round(r.score * fill);
          const first = r.rank === 1;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 18, height: 84, opacity: q > 0 ? 1 : 0, transform: `translateX(${Math.round((1 - q) * 5) * 24}px)` }}>
              <div style={{ width: 54, height: 54, flex: "none", background: first ? ui.accent : ui.border, color: ui.box, fontFamily: BANNER_FONT, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.rank}</div>
              <div style={{ width: 200, flex: "none", fontFamily: PIXEL_FONT, fontWeight: 700, fontSize: 36, color: ui.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase" }}>{r.name}</div>
              <div style={{ position: "relative", flex: 1, height: 34, border: `4px solid ${ui.border}`, background: "rgba(0,0,0,0.35)" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${r.ratio * fill * 100}%`, background: first ? ui.accent : ui.name }} />
              </div>
              <div style={{ width: 150, flex: "none", textAlign: "right", fontFamily: BANNER_FONT, fontSize: 26, color: first ? ui.accent : ui.text }}>
                {formatCount(shown)}
                {unit}
              </div>
              <div style={{ width: 40, flex: "none", display: "flex", justifyContent: "center" }}>{r.crown && q >= 1 ? <PixelCrown color={ui.accent} px={4} /> : null}</div>
            </div>
          );
        })}
      </div>
    </PixelBox>
  );
};

/** Verdict panel: every row fills in (name typed, dotted leader, score) one after another; the winner lights up with a crown. */
export const Verdict: React.FC<{ title?: string; rows: { name: string; score: number | string; note?: string }[]; winner?: number; times: number[]; ui: UiColors; top?: number }> = ({ title = "VERDICT", rows, winner, times, ui, top = 440 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sc = popScale(frame, 4);
  if (!sc) return null;
  const best = winner ?? rows.reduce((b, r, k) => (Number(r.score) > Number(rows[b].score) ? k : b), 0);
  const last = times[times.length - 1] ?? 0;
  const lit = t >= last + 0.5;
  return (
    <PixelBox ui={ui} border={ui.accent} style={{ left: 130, top, width: 820, transform: `scale(${sc})`, transformOrigin: "50% 0" }}>
      <div style={{ padding: "28px 34px 30px" }}>
        <div style={{ fontFamily: BANNER_FONT, fontSize: 34, color: ui.accent, textAlign: "center", marginBottom: 18, textShadow: hardShadow(ink, 4) }}>{title}</div>
        {rows.map((r, k) => {
          const since = t - times[k];
          if (since < 0) return <div key={k} style={{ height: 88 }} />;
          const chars = Math.min(r.name.length, Math.ceil((since / 0.35) * r.name.length));
          const scoreOn = since > 0.4;
          const win = lit && k === best;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 14, height: 88, padding: "0 16px", background: win ? ui.accent : "transparent", color: win ? ui.box : ui.text }}>
              <div style={{ width: 56, flex: "none", display: "flex", justifyContent: "center" }}>{win ? <PixelCrown color={ui.box} px={5} /> : <span style={{ fontFamily: BANNER_FONT, fontSize: 26, color: ui.name }}>{k + 1}</span>}</div>
              <div style={{ fontFamily: PIXEL_FONT, fontWeight: 700, fontSize: 40, textTransform: "uppercase", whiteSpace: "nowrap" }}>{r.name.slice(0, chars)}</div>
              <div style={{ flex: 1, height: 0, borderBottom: `6px dotted ${win ? ui.box : `${ui.text}66`}`, alignSelf: "flex-end", marginBottom: 26, opacity: since > 0.3 ? 1 : 0 }} />
              {r.note && scoreOn ? <div style={{ fontFamily: TAG_FONT, fontSize: 24, letterSpacing: 2, color: win ? ui.box : ui.name, textTransform: "uppercase" }}>{r.note}</div> : null}
              <div style={{ minWidth: 110, textAlign: "right", fontFamily: BANNER_FONT, fontSize: 30, opacity: scoreOn ? 1 : 0 }}>{typeof r.score === "number" ? formatCount(r.score) : r.score}</div>
            </div>
          );
        })}
      </div>
    </PixelBox>
  );
};

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
