// Word-driven caption styles: chips, two-tone, karaoke, punch.
import React from "react";
import { interpolate } from "remotion";
import { fontStack } from "../../fonts";
import { rgba } from "../../util";
import { readableOn } from "../../../lib/captions.mjs";
import { CAPTION_WIDTH, cased, fitFor, haloShadow, mixHex, usePageClock, type StyleProps } from "./shared";

/** Each word in its own rounded chip; spoken chips pop in, the active chip fills with the accent. */
export const Chips: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const words = page.words.map((w) => cased(w.text.trim(), look, "asis"));
  const size = Math.round(fitFor(words.join(" "), (words.join("").length > 16 ? 60 : 70) * look.scale, CAPTION_WIDTH - 140, "Montserrat", false));
  return (
    <div style={band}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: Math.round(14 * look.scale), justifyContent: "center", alignItems: "center", maxWidth: CAPTION_WIDTH }}>
        {words.map((t, i) => {
          const active = c.isActive(i);
          const inP = c.pop(i, 220);
          const shown = c.since(i) >= -3;
          const s = active ? interpolate(c.pop(i), [0, 1], [1, 1.1]) : 1;
          const tilt = i % 2 === 0 ? -1.5 : 1.5;
          return (
            <span
              key={i}
              style={{
                fontFamily: fontStack("Montserrat"),
                fontWeight: 800,
                fontSize: size,
                lineHeight: 1,
                padding: `${Math.round(size * 0.2)}px ${Math.round(size * 0.3)}px ${Math.round(size * 0.24)}px`,
                borderRadius: Math.round(size * 0.32),
                background: active ? k.highlight : rgba(k.box, 0.86),
                color: active ? readableOn(k.highlight) : k.text,
                border: `3px solid ${active ? k.highlight : rgba(k.text, 0.22)}`,
                boxShadow: active ? `0 14px 34px ${rgba(k.highlight, 0.5)}` : `0 10px 24px ${rgba(k.outline, 0.35)}`,
                transform: `rotate(${active ? tilt : tilt * 0.4}deg) scale(${s * (shown ? interpolate(inP, [0, 1], [0.5, 1]) : 0.5)})`,
                opacity: shown ? 1 : 0,
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

/** Two lines: a muted lead-in line and a bold keyword line; words reveal as they are spoken. */
export const TwoTone: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const words = page.words.map((w) => w.text.trim());
  const split = words.length <= 1 ? 0 : Math.max(1, Math.floor(words.length / 2));
  const lead = words.slice(0, split);
  const key = words.slice(split);
  // The longest word of the keyword line carries the accent.
  const hot = key.reduce((best, w, i) => (w.length > key[best].length ? i : best), 0);
  const leadSize = Math.round(fitFor(lead.join(" ") || "x", 64 * look.scale, CAPTION_WIDTH, "Inter", false));
  const keySize = Math.round(fitFor(key.join(" "), (key.join("").length > 14 ? 88 : 104) * look.scale, CAPTION_WIDTH, "Montserrat", look.uppercase !== false));
  const reveal = (i: number) => {
    const p = c.since(i) >= -2 ? interpolate(c.pop(i, 200), [0, 1], [0, 1]) : 0;
    return { opacity: p, transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)` };
  };
  return (
    <div style={band}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(6 * look.scale), maxWidth: CAPTION_WIDTH }}>
        {lead.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(leadSize * 0.3) }}>
            {lead.map((t, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: fontStack("Inter"),
                  fontWeight: 600,
                  fontSize: leadSize,
                  lineHeight: 1.15,
                  // Muted lead-in: the word color pulled a little toward the shade.
                  color: mixHex(k.text, k.outline, 0.22),
                  textShadow: haloShadow(look, `0 3px 14px ${rgba(k.outline, 0.55)}`),
                  ...reveal(i),
                }}
              >
                {cased(t, look, "asis")}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(keySize * 0.28) }}>
          {key.map((t, j) => {
            const i = split + j;
            const active = c.isActive(i);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: fontStack("Montserrat"),
                  fontWeight: 900,
                  fontSize: keySize,
                  lineHeight: 1.04,
                  letterSpacing: -1,
                  color: j === hot ? k.highlight : k.text,
                  textShadow: haloShadow(look, `0 6px 0 ${rgba(k.outline, 0.35)}, 0 10px 30px ${rgba(k.outline, 0.5)}`),
                  ...reveal(i),
                  transform: `${reveal(i).transform} scale(${active ? interpolate(c.pop(i), [0, 1], [1, 1.06]) : 1})`,
                }}
              >
                {cased(t, look, "upper")}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** The whole page is visible; the active word fills with the accent from left to right. */
export const Karaoke: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const words = page.words.map((w) => cased(w.text.trim(), look, "upper"));
  const upper = look.uppercase !== false;
  const size = Math.round(fitFor(words.join(" "), (words.join("").length > 18 ? 84 : 98) * look.scale, CAPTION_WIDTH - 40, "Montserrat", upper));
  return (
    <div style={{ ...band, opacity: c.enter, transform: `translateY(${interpolate(c.enter, [0, 1], [20, 0])}px)` }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(size * 0.32), maxWidth: CAPTION_WIDTH, filter: `drop-shadow(0 6px 0 ${rgba(k.outline, 0.45)}) drop-shadow(0 10px 22px ${rgba(k.outline, 0.45)})` }}>
        {words.map((t, i) => {
          const p = c.spoken(i) ? (c.isActive(i) ? c.progress(i) : 1) : 0;
          const edge = Math.round(p * 100);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: fontStack("Montserrat"),
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1.1,
                letterSpacing: -0.5,
                color: "transparent",
                backgroundImage: `linear-gradient(90deg, ${k.highlight} ${edge}%, ${k.text} ${edge}%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextStroke: look.halo === "strong" ? `4px ${k.outline}` : `2px ${rgba(k.outline, 0.55)}`,
                paintOrder: "stroke",
                transform: `scale(${c.isActive(i) ? interpolate(c.pop(i), [0, 1], [1, 1.05]) : 1})`,
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

/** One huge word at a time; long words (6+ letters) take the accent. */
export const Punch: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const i = c.activeIndex();
  const t = cased(page.words[i].text.trim().replace(/[.,;:!?¡¿"]+/g, "") || page.words[i].text.trim(), look, "upper");
  const upper = look.uppercase !== false;
  const size = Math.round(fitFor(t, 170 * look.scale, CAPTION_WIDTH - 60, "Anton", upper));
  const p = c.pop(i, 300);
  const letters = [...t.replace(/[^\p{L}\p{N}]/gu, "")].length;
  return (
    <div style={band}>
      <div
        key={i}
        style={{
          fontFamily: fontStack("Anton"),
          fontWeight: 400,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: 1,
          color: letters >= 6 ? k.highlight : k.text,
          WebkitTextStroke: `${Math.max(6, Math.round(size * 0.07))}px ${k.outline}`,
          paintOrder: "stroke",
          textShadow: `0 ${Math.round(size * 0.06)}px 0 ${rgba(k.outline, 0.4)}`,
          transform: `scale(${interpolate(p, [0, 1], [1.45, 1])}) rotate(${i % 2 === 0 ? -3 : 2}deg)`,
          opacity: interpolate(p, [0, 0.3, 1], [0, 1, 1]),
          whiteSpace: "nowrap",
        }}
      >
        {t}
      </div>
    </div>
  );
};
