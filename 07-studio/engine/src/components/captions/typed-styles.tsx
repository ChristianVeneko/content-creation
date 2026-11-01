// Typed caption styles: typewriter and RPG dialog box.
import React from "react";
import { interpolate } from "remotion";
import { MONO_FONT, PIXEL_LABEL_FONT, fontStack } from "../../fonts";
import { rgba } from "../../util";
import { readableOn } from "../../../lib/captions.mjs";
import { CAPTION_WIDTH, cased, fitFor, mixHex, typedText, usePageClock, type StyleProps } from "./shared";

/** Monospace characters appear one by one behind a blinking block cursor, on a terminal slab in the box color. */
export const Typewriter: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  const { shown, full } = typedText(page, c.nowMs);
  const text = cased(full, look, "asis");
  const size = Math.round(fitFor(text, 58 * look.scale, CAPTION_WIDTH - 120, "JetBrains Mono", false));
  const blinkOn = Math.floor(c.frame / 12) % 2 === 0;
  return (
    <div style={{ ...band, opacity: c.enter }}>
      <div
        style={{
          maxWidth: CAPTION_WIDTH,
          padding: `${Math.round(size * 0.42)}px ${Math.round(size * 0.6)}px`,
          borderRadius: 14,
          background: rgba(k.box, 0.9),
          border: `2px solid ${rgba(k.highlight, 0.35)}`,
          boxShadow: `0 18px 40px ${rgba(k.outline, 0.45)}`,
          fontFamily: MONO_FONT,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.25,
          color: k.text,
          textAlign: "left",
          // Reserve the full text so the box does not grow while typing.
          display: "grid",
        }}
      >
        <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>&gt; {text}&#9608;</span>
        <span style={{ gridArea: "1 / 1" }}>
          <span style={{ color: k.highlight }}>&gt; </span>
          {cased(shown, look, "asis")}
          <span style={{ color: k.highlight, opacity: blinkOn ? 1 : 0 }}>&#9608;</span>
        </span>
      </div>
    </div>
  );
};

/** RPG dialog box: double border, speaker nameplate, optional portrait tile, typed text, advance arrow. */
export const Dialog: React.FC<StyleProps> = ({ page, look, band }) => {
  const c = usePageClock(page);
  const k = look.colors;
  // Box gradient from the box color to a tone further from the words (darker under light words, lighter
  // under dark ones, so contrast only grows); frame in the word color.
  const deep = mixHex(k.box, readableOn(k.text), 0.3);
  const { shown, full, done } = typedText(page, c.nowMs, 36);
  const text = cased(full, look, "asis");
  const portrait = Boolean(look.speaker);
  const textWidth = CAPTION_WIDTH - 72 - (portrait ? 150 : 0);
  const size = Math.round(fitFor(text, 56 * look.scale, textWidth, "Inter", false));
  const bob = Math.round(Math.sin(c.frame / 4) * 4);
  const open = interpolate(c.enter, [0, 1], [0.6, 1]);
  return (
    <div style={band}>
      <div style={{ position: "relative", width: CAPTION_WIDTH, transform: `scaleY(${open})`, opacity: c.enter }}>
        {look.speaker ? (
          <div
            style={{
              position: "absolute",
              left: 28,
              top: -Math.round(26 + 10 * look.scale),
              zIndex: 2,
              padding: "10px 18px 8px",
              background: k.box,
              border: `4px solid ${k.highlight}`,
              borderRadius: 6,
              fontFamily: PIXEL_LABEL_FONT,
              fontSize: Math.round(22 * look.scale),
              letterSpacing: 1,
              fontVariant: "small-caps",
              color: k.highlight,
              textTransform: "uppercase",
            }}
          >
            {look.speaker}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
            padding: `${portrait ? 34 : 30}px 32px 34px`,
            background: `linear-gradient(180deg, ${rgba(k.box, 0.96)}, ${rgba(deep, 0.96)})`,
            border: `5px solid ${k.text}`,
            borderRadius: 12,
            boxShadow: `inset 0 0 0 4px ${deep}, inset 0 0 0 7px ${rgba(k.highlight, 0.8)}, 0 18px 40px ${rgba(k.outline, 0.5)}`,
          }}
        >
          {portrait ? (
            <div
              style={{
                flex: "0 0 auto",
                width: 126,
                height: 126,
                borderRadius: 8,
                border: `4px solid ${k.text}`,
                background: `linear-gradient(160deg, ${k.highlight}, ${mixHex(k.highlight, k.box, 0.45)})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: PIXEL_LABEL_FONT,
                fontSize: 54,
                color: readableOn(k.highlight),
              }}
            >
              {[...(look.speaker ?? "?")][0].toUpperCase()}
            </div>
          ) : null}
          <div style={{ display: "grid", flex: 1, fontFamily: fontStack("Inter"), fontWeight: 700, fontSize: size, lineHeight: 1.3, color: k.text, textAlign: "left" }}>
            <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>{text}</span>
            <span style={{ gridArea: "1 / 1" }}>{cased(shown, look, "asis")}</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 30,
            bottom: 14,
            width: 0,
            height: 0,
            borderLeft: "13px solid transparent",
            borderRight: "13px solid transparent",
            borderTop: `16px solid ${k.highlight}`,
            opacity: done ? 1 : 0,
            transform: `translateY(${bob}px)`,
          }}
        />
      </div>
    </div>
  );
};
