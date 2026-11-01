import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Palette, Visual } from "../types";
import { rgba } from "../util";

/** Big animated emoji / icon with a glow. Positioned by its center (x, y). */
export const Hero: React.FC<{ visual: Visual; palette: Palette; x?: number; y: number; size?: number; delay?: number; tile?: boolean }> = ({
  visual,
  palette,
  x = 540,
  y,
  size = 320,
  delay = 4,
  tile,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glyph = visual.emoji || (visual.type === "icon" ? "✨" : "");
  if (!glyph) return null;
  const pop = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 140, mass: 0.7 } });
  const float = Math.sin((frame / fps) * 2.2) * 14;
  const rot = interpolate(pop, [0, 1], [-18, 0]) + Math.sin((frame / fps) * 1.6) * 3;
  const glow = interpolate(Math.sin((frame / fps) * 2), [-1, 1], [0.35, 0.6]);
  const boxSize = size * 1.45;
  return (
    <div
      style={{
        position: "absolute",
        left: x - boxSize / 2,
        top: y - boxSize / 2,
        width: boxSize,
        height: boxSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${float}px) scale(${pop}) rotate(${rot}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(palette.accent, glow)} 0%, ${rgba(palette.accent, 0)} 68%)`,
        }}
      />
      {tile ? (
        <div
          style={{
            width: size * 1.05,
            height: size * 1.05,
            borderRadius: size * 0.26,
            background: `linear-gradient(145deg, ${rgba("#FFFFFF", 0.28)}, ${rgba("#FFFFFF", 0.08)})`,
            border: `3px solid ${rgba("#FFFFFF", 0.35)}`,
            boxShadow: `0 30px 80px ${rgba("#000000", 0.35)}, inset 0 2px 0 ${rgba("#FFFFFF", 0.4)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.62,
          }}
        >
          {glyph}
        </div>
      ) : (
        <div style={{ fontSize: size, lineHeight: 1, filter: `drop-shadow(0 24px 40px ${rgba("#000000", 0.35)})` }}>{glyph}</div>
      )}
    </div>
  );
};
