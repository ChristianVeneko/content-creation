import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionBand, CaptionLook, CaptionPage, CaptionStyle, Palette } from "../types";
import { BODY_FONT, fontStack, heavyWeight } from "../fonts";
import { fitSize, rgba } from "../util";
import { deriveCaptionColors, readableOn } from "../../lib/captions.mjs";
import { haloShadow } from "./captions/shared";
import { Chips, Karaoke, Punch, TwoTone } from "./captions/word-styles";
import { Dialog, Typewriter } from "./captions/typed-styles";
import { Minimal, Neon, Pixel, Underline } from "./captions/display-styles";
import type { StyleProps } from "./captions/shared";

type Band = CaptionBand;
const LEGACY_BAND: Band = { top: 1130, height: 260 };

const NEW_STYLES: Partial<Record<CaptionStyle, React.FC<StyleProps>>> = {
  chips: Chips,
  "two-tone": TwoTone,
  karaoke: Karaoke,
  punch: Punch,
  typewriter: Typewriter,
  dialog: Dialog,
  neon: Neon,
  underline: Underline,
  minimal: Minimal,
  pixel: Pixel,
};

/** Caption band inside the universal safe zone (center 900 px, y≈1130–1390). */
const BASE_BAND: React.CSSProperties = {
  position: "absolute",
  left: 90,
  width: 900,
  top: 1130,
  height: 260,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const Page: React.FC<{ page: CaptionPage; palette: Palette; font: string; look: CaptionLook }> = ({ page, palette: themePalette, font, look }) => {
  const { style, band, scale } = look;
  // An explicit position anchors tall styles to the band edge that faces the frame center.
  // The dialog box is taller than the chrome caption band, so by default it sits on the band's bottom edge.
  const anchor = look.position === "top" ? "flex-start" : look.position === "bottom" || (style === "dialog" && !look.position) ? "flex-end" : "center";
  const BAND: React.CSSProperties = { ...BASE_BAND, top: band.top, height: band.height, ...(anchor === "center" ? {} : { alignItems: anchor }) };
  // Every style paints with look.colors (palette-derived, or spec.captions.colors); the palette goes to the
  // catalog styles with its accent replaced by the caption highlight.
  const k = look.colors;
  const palette: Palette = { ...themePalette, accent: k.highlight, accent3: k.highlight };
  const upperCase = (fallback: "uppercase" | "none") => (look.uppercase === true ? "uppercase" : look.uppercase === false ? "none" : fallback);
  const NewStyle = NEW_STYLES[style];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 200 }, durationInFrames: 8 });
  const chars = page.words.reduce((a, w) => a + w.text.trim().length, 0);

  const isActive = (i: number) => {
    const w = page.words[i];
    const next = page.words[i + 1];
    return nowMs >= w.startMs && nowMs < (next ? next.startMs : page.endMs);
  };
  const wordPop = (i: number) => {
    const w = page.words[i];
    const f = Math.round(((nowMs - w.startMs) / 1000) * fps);
    return spring({ frame: f, fps, config: { damping: 12, stiffness: 260 }, durationInFrames: 7 });
  };

  if (NewStyle) return <NewStyle page={page} palette={palette} font={font} look={look} band={BAND} />;

  if (style === "hormozi") {
    const capFont = font === "Anton" || font === "Bebas Neue" ? font : "Montserrat";
    const text = page.words.map((w) => w.text.trim()).join(" ");
    const fontSize = fitSize(text, (chars > 18 ? 92 : chars > 12 ? 108 : 124) * scale, 820, capFont);
    return (
      <div style={{ ...BAND, transform: `scale(${interpolate(enter, [0, 1], [0.82, 1])}) translateY(${interpolate(enter, [0, 1], [30, 0])}px)` }}>
        <div
          style={{
            fontFamily: fontStack(capFont),
            fontWeight: heavyWeight(capFont),
            fontSize,
            lineHeight: 1.08,
            textTransform: upperCase("uppercase"),
            letterSpacing: -1,
            color: k.text,
            WebkitTextStroke: `16px ${k.outline}`,
            paintOrder: "stroke",
            textShadow: `0 10px 0 ${rgba(k.outline, 0.35)}`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: "0.42em",
          }}
        >
          {page.words.map((w, i) => {
            const active = isActive(i);
            const s = active ? interpolate(wordPop(i), [0, 1], [1, 1.12]) : 1;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: active ? k.highlight : k.text,
                  transform: `scale(${s}) rotate(${active ? -2 : 0}deg)`,
                }}
              >
                {w.text.trim()}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (style === "pills") {
    // Light word pills with dark words; the active word becomes a highlight pill (illustrated template).
    const hot = k.highlight;
    const size = fitSize(page.words.map((x) => x.text.trim()).join(" "), (chars > 16 ? 50 : 58) * scale, 760, "Montserrat");
    return (
      <div style={BAND}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", alignItems: "center" }}>
          {page.words.map((w, i) => {
            const active = isActive(i);
            const f = Math.round(((nowMs - w.startMs) / 1000) * fps);
            const inP = spring({ frame: f + 3, fps, config: { damping: 12, stiffness: 240 }, durationInFrames: 8 });
            const s = active ? interpolate(wordPop(i), [0, 1], [1, 1.1]) : 1;
            return (
              <span
                key={i}
                style={{
                  fontFamily: fontStack("Montserrat"),
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1,
                  textTransform: upperCase("uppercase"),
                  padding: "12px 20px 14px",
                  borderRadius: 14,
                  background: active ? hot : k.box,
                  color: active ? readableOn(hot) : k.text,
                  boxShadow: active ? `0 10px 28px ${rgba(hot, 0.45)}, 0 5px 0 ${rgba(k.outline, 0.35)}` : `0 5px 0 ${rgba(k.outline, 0.35)}`,
                  transform: `scale(${s * interpolate(Math.min(1, inP), [0, 1], [0.6, 1])})`,
                  opacity: nowMs >= w.startMs - 120 ? 1 : 0.0,
                }}
              >
                {w.text.trim()}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (style === "boxed") {
    return (
      <div style={{ ...BAND, opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)` }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {page.words.map((w, i) => {
            const active = isActive(i);
            const s = active ? interpolate(wordPop(i), [0, 1], [1, 1.08]) : 1;
            return (
              <span
                key={i}
                style={{
                  fontFamily: fontStack("Montserrat"),
                  fontWeight: 800,
                  fontSize: fitSize(page.words.map((x) => x.text.trim()).join(" "), (chars > 18 ? 66 : 78) * scale, 800, "Montserrat"),
                  textTransform: upperCase("uppercase"),
                  padding: "10px 22px 12px",
                  borderRadius: 20,
                  background: active ? k.highlight : rgba(k.box, 0.8),
                  color: active ? readableOn(k.highlight) : k.text,
                  boxShadow: active ? `0 12px 30px ${rgba(k.highlight, 0.45)}` : `0 8px 20px ${rgba(k.outline, 0.25)}`,
                  transform: `scale(${s})`,
                }}
              >
                {w.text.trim()}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // clean
  return (
    <div style={{ ...BAND, opacity: enter }}>
      <div
        style={{
          fontFamily: BODY_FONT,
          fontWeight: 800,
          fontSize: Math.round((chars > 24 ? 64 : 74) * scale),
          lineHeight: 1.15,
          textTransform: upperCase("none"),
          letterSpacing: -0.5,
          color: k.text,
          textShadow: haloShadow(look, `0 4px 18px ${rgba(k.outline, 0.65)}, 0 2px 4px ${rgba(k.outline, 0.6)}`),
        }}
      >
        {page.words.map((w, i) => {
          const active = isActive(i);
          const spoken = nowMs >= w.startMs;
          return (
            <span
              key={i}
              style={{
                whiteSpace: "pre",
                color: active ? k.highlight : spoken ? k.text : (look.dim ?? k.text),
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Caption pages over the video. Pass `look` (lib/captions.mjs resolveCaptionLook) for the catalog
 * options; `style`/`band` alone keep the classic behavior.
 */
export const Captions: React.FC<{ pages: CaptionPage[]; style: CaptionStyle; palette: Palette; font: string; band?: Band; look?: CaptionLook }> = ({ pages, style, palette, font, band, look }) => {
  const { fps } = useVideoConfig();
  const l: CaptionLook = look ?? { style, size: "m", scale: 1, position: null, band: band ?? LEGACY_BAND, accent: palette.accent, customAccent: false, colors: deriveCaptionColors(palette, { style }) };
  return (
    <AbsoluteFill>
      {pages.map((p, i) => {
        const from = Math.round((p.startMs / 1000) * fps);
        const dur = Math.max(1, Math.round((p.endMs / 1000) * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none" name={`Caption ${i + 1}`}>
            <Page page={p} palette={palette} font={font} look={l} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
