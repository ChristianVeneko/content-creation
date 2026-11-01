// Display caption styles: neon, underline, minimal, pixel.
import React from "react";
import { interpolate } from "remotion";
import { PIXEL_FONT, fontStack } from "../../fonts";
import { rgba } from "../../util";
import { dimmedWord, readableOn } from "../../../lib/captions.mjs";
import { CAPTION_WIDTH, cased, fitFor, haloShadow, mixHex, usePageClock, type StyleProps } from "./shared";

/** Deterministic tube flicker for the first frames of a word (frame index -> brightness). */
const FLICKER = [0.15, 0.9, 0.35, 1, 0.6, 1];

/** Neon tube: a hot core in the word color with layered highlight glow, no stroke; words flicker on as they are spoken. */
export const Neon: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const words = page.words.map((w) => cased(w.text.trim(), look, "asis"));
  const upper = look.uppercase === true;
  const size = Math.round(fitFor(words.join(" "), (words.join("").length > 18 ? 76 : 88) * look.scale, CAPTION_WIDTH - 60, "Poppins", upper));
  const k = look.colors;
  const a = k.highlight;
  // The tube core: the word color, a touch warmer toward the glow when idle.
  const core = mixHex(k.text, a, 0.08);
  return (
    <div style={band}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(size * 0.34), maxWidth: CAPTION_WIDTH }}>
        {words.map((t, i) => {
          const f = c.since(i);
          // Unspoken words stay readable in the dim word color (no glow); spoken ones flicker on and glow.
          const lit = f < 0 ? 0 : f < FLICKER.length ? FLICKER[f] : 1;
          const active = c.isActive(i);
          const glow = active ? 1 : 0.65;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: fontStack("Poppins"),
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1.12,
                color: lit > 0.5 ? (active ? k.text : core) : (look.dim ?? k.text),
                textShadow: [
                  `0 0 ${Math.round(4 * look.scale)}px ${rgba(k.text, 0.9 * glow * lit)}`,
                  `0 0 ${Math.round(14 * look.scale)}px ${rgba(a, glow * lit)}`,
                  `0 0 ${Math.round(32 * look.scale)}px ${rgba(a, 0.85 * glow * lit)}`,
                  `0 0 ${Math.round(64 * look.scale)}px ${rgba(a, 0.6 * glow * lit)}`,
                ].join(", "),
                transform: `scale(${active ? interpolate(c.pop(i), [0, 1], [1, 1.06]) : 1})`,
              }}
            >
              {t}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Bold sentence-case text; an accent bar sweeps under the active word and retracts off the previous one. */
export const Underline: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const words = page.words.map((w) => cased(w.text.trim(), look, "asis"));
  const upper = look.uppercase === true;
  const size = Math.round(fitFor(words.join(" "), (words.join("").length > 20 ? 72 : 84) * look.scale, CAPTION_WIDTH - 40, "Montserrat", upper));
  return (
    <div style={{ ...band, opacity: c.enter }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(size * 0.3), rowGap: Math.round(size * 0.12), maxWidth: CAPTION_WIDTH }}>
        {words.map((t, i) => {
          const active = c.isActive(i);
          const past = c.spoken(i) && !active;
          // Sweep in over the first 6 frames of the word; retract to the right over 5 frames after it ends.
          const inP = interpolate(c.since(i), [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const nextStart = i + 1 < page.words.length ? c.since(i + 1) : -1;
          const outP = past ? interpolate(nextStart, [0, 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          const scaleX = active ? inP : past ? outP : 0;
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", paddingBottom: Math.round(size * 0.16) }}>
              <span
                style={{
                  fontFamily: fontStack("Montserrat"),
                  fontWeight: 800,
                  fontSize: size,
                  lineHeight: 1.08,
                  letterSpacing: -0.5,
                  color: c.spoken(i) ? k.text : (look.dim ?? k.text),
                  textShadow: haloShadow(look, `0 4px 16px ${rgba(k.outline, 0.6)}, 0 2px 3px ${rgba(k.outline, 0.5)}`),
                }}
              >
                {t}
              </span>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: Math.max(8, Math.round(size * 0.13)),
                  borderRadius: 99,
                  background: k.highlight,
                  boxShadow: `0 4px 14px ${rgba(k.highlight, 0.55)}`,
                  transform: `scaleX(${scaleX})`,
                  transformOrigin: active ? "left center" : "right center",
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Quiet lowercase text with a soft shadow; spoken words brighten. */
export const Minimal: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const words = page.words.map((w) => cased(w.text.trim(), look, "lower"));
  const size = Math.round(fitFor(words.join(" "), 68 * look.scale, CAPTION_WIDTH - 60, "Inter", look.uppercase === true));
  return (
    <div style={{ ...band, opacity: c.enter, transform: `translateY(${interpolate(c.enter, [0, 1], [10, 0])}px)` }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(size * 0.28), maxWidth: CAPTION_WIDTH }}>
        {words.map((t, i) => (
          <span
            key={i}
            style={{
              fontFamily: fontStack("Inter"),
              fontWeight: 600,
              fontSize: size,
              lineHeight: 1.2,
              letterSpacing: -0.6,
              color: c.spoken(i) ? k.text : (look.dim ?? k.text),
              opacity: c.isActive(i) || !c.spoken(i) ? 1 : 0.92,
              textShadow: haloShadow(look, `0 2px 14px ${rgba(k.outline, 0.5)}, 0 1px 2px ${rgba(k.outline, 0.35)}`),
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Hard pixel outline + stepped drop shadow (multiples of the pixel unit, no blur). */
const pixelShadow = (u: number, color: string) => {
  const ring: string[] = [];
  // A 1-unit outline on the four sides only, then a straight-down drop: sideways offsets would close
  // the open side of letters like C and G.
  for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ring.push(`${x * u}px ${y * u}px 0 ${color}`);
  for (let k = 2; k <= 3; k++) ring.push(`0 ${k * u}px 0 ${color}`);
  return ring.join(", ");
};

/** Pixel banner: stepped-corner panel, pixel font, accent active word, words snap in on the pixel grid. */
export const Pixel: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  // Two-band panel (the box, then a step further from the words) framed in the word color; the hard pixel
  // outline sits halfway between the outline color and the ink opposite the words.
  const away = readableOn(k.text);
  const band2 = mixHex(k.box, away, 0.15);
  const drop = mixHex(k.outline, away, 0.5);
  const words = page.words.map((w) => cased(w.text.trim(), look, "upper"));
  const upper = look.uppercase !== false;
  const size = Math.round(fitFor(words.join(" "), (words.join("").length > 16 ? 72 : 86) * look.scale, CAPTION_WIDTH - 120, "Pixelify Sans", upper) / 4) * 4;
  const u = Math.max(2, Math.round(size / 24));
  const step = 8; // stepped corner size in px
  const corners = `polygon(0 ${step * 2}px, ${step}px ${step * 2}px, ${step}px ${step}px, ${step * 2}px ${step}px, ${step * 2}px 0, calc(100% - ${step * 2}px) 0, calc(100% - ${step * 2}px) ${step}px, calc(100% - ${step}px) ${step}px, calc(100% - ${step}px) ${step * 2}px, 100% ${step * 2}px, 100% calc(100% - ${step * 2}px), calc(100% - ${step}px) calc(100% - ${step * 2}px), calc(100% - ${step}px) calc(100% - ${step}px), calc(100% - ${step * 2}px) calc(100% - ${step}px), calc(100% - ${step * 2}px) 100%, ${step * 2}px 100%, ${step * 2}px calc(100% - ${step}px), ${step}px calc(100% - ${step}px), ${step}px calc(100% - ${step * 2}px), 0 calc(100% - ${step * 2}px))`;
  // The panel snaps open in 3 discrete steps (no easing) to stay on the pixel grid.
  const openStep = Math.min(3, Math.floor(c.frame / 2) + 1) / 3;
  return (
    <div style={band}>
      <div style={{ clipPath: corners, background: k.text, padding: 6, transform: `scale(${0.7 + 0.3 * openStep})`, maxWidth: CAPTION_WIDTH }}>
        <div
          style={{
            clipPath: corners,
            background: `linear-gradient(180deg, ${k.box} 0%, ${k.box} 50%, ${band2} 50%, ${band2} 100%)`,
            padding: `${Math.round(size * 0.32)}px ${Math.round(size * 0.48)}px ${Math.round(size * 0.4)}px`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: Math.round(size * 0.4),
          }}
        >
          {words.map((t, i) => {
            const active = c.isActive(i);
            const f = c.since(i);
            const hop = active && f >= 0 && f < 4 ? -u * 2 : 0;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: PIXEL_FONT,
                  fontWeight: 500,
                  fontSize: size,
                  lineHeight: 1.15,
                  color: active ? k.highlight : c.spoken(i) ? k.text : dimmedWord(k.text, [k.box, band2]),
                  textShadow: pixelShadow(u, drop),
                  transform: `translateY(${hop}px)`,
                  WebkitFontSmoothing: "none",
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
