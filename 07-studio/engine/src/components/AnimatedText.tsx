import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Animation } from "../types";

type Props = {
  text: string;
  animation: Animation;
  delay?: number;
  style?: React.CSSProperties;
  /** Optional per-word style (e.g. accent color on key words). */
  wordStyle?: (word: string, index: number) => React.CSSProperties | undefined;
  stagger?: number;
};

/**
 * On-screen text with one of four entrance animations, all frame-pure:
 * pop (per-word springy scale), slide (per-word rise), typewriter (per-char reveal + cursor), zoom (block punch-in with blur).
 */
export const AnimatedText: React.FC<Props> = ({ text, animation, delay = 0, style, wordStyle, stagger = 3 }) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);

  if (animation === "typewriter") {
    const chars = Math.floor(Math.max(0, frame) / 1.3);
    const shown = text.slice(0, chars);
    const done = chars >= text.length;
    const cursorOn = !done || Math.floor(frame / 15) % 2 === 0;
    return (
      <div style={style}>
        {shown}
        <span style={{ opacity: cursorOn ? 1 : 0, marginLeft: 4, fontWeight: 400 }}>▍</span>
      </div>
    );
  }

  if (animation === "zoom") {
    const p = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
    const scale = interpolate(p, [0, 1], [1.7, 1]);
    const blur = interpolate(p, [0, 0.7], [18, 0], { extrapolateRight: "clamp" });
    const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div style={{ ...style, transform: `scale(${scale})`, filter: `blur(${blur}px)`, opacity }}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
            <span style={wordStyle?.(w, i)}>{w}</span>{" "}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div style={style}>
      {words.map((w, i) => {
        const f = frame - i * stagger;
        let transform: string;
        let opacity: number;
        if (animation === "pop") {
          const p = spring({ frame: f, fps, config: { damping: 10, stiffness: 180, mass: 0.6 } });
          transform = `scale(${interpolate(p, [0, 1], [0.3, 1])}) rotate(${interpolate(p, [0, 1], [-8, 0])}deg)`;
          opacity = interpolate(f, [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        } else {
          const p = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 14 });
          transform = `translateY(${interpolate(p, [0, 1], [70, 0])}px)`;
          opacity = p;
        }
        return (
          <React.Fragment key={i}>
            <span style={{ display: "inline-block", transform, opacity, ...wordStyle?.(w, i) }}>{w}</span>{" "}
          </React.Fragment>
        );
      })}
    </div>
  );
};
