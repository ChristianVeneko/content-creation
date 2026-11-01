import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Palette, Visual } from "../types";
import { isRemote, rgba, seeded } from "../util";

const resolveSrc = (src: string) => (isRemote(src) ? src : staticFile(src));

/** Slowly drifting mesh-like gradient made of blurred color blobs. Frame-pure. */
export const AnimatedGradient: React.FC<{ palette: Palette; seed: number; intensity?: number }> = ({ palette, seed, intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = frame / fps;
  const colors = [...palette.bg, palette.accent];
  const base = palette.bg;
  const angle = 155 + ((seed * 47) % 90);
  const blobs = [0, 1, 2, 3].map((i) => {
    const r1 = seeded(seed * 10 + i);
    const r2 = seeded(seed * 10 + i + 5);
    const cx = width * (0.2 + 0.6 * r1) + Math.sin(t * (0.35 + i * 0.11) + i) * width * 0.12;
    const cy = height * (0.15 + 0.7 * r2) + Math.cos(t * (0.28 + i * 0.07) + i * 2) * height * 0.08;
    const size = width * (0.9 + 0.5 * seeded(seed + i * 3));
    const color = colors[(i + seed) % colors.length];
    const alpha = (color === palette.accent ? 0.35 : 0.75) * intensity;
    return { cx, cy, size, color, alpha };
  });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${base[0]} 0%, ${base[Math.min(1, base.length - 1)]} 60%, ${base[base.length - 1]} 100%)`,
        overflow: "hidden",
      }}
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.cx - b.size / 2,
            top: b.cy - b.size / 2,
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: `radial-gradient(circle at center, ${rgba(b.color, b.alpha)} 0%, ${rgba(b.color, 0)} 65%)`,
          }}
        />
      ))}
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};

/** Lightweight film grain: a small SVG turbulence tile, shifted every frame. */
export const Grain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  );
  const ox = Math.floor(seeded(frame) * 220);
  const oy = Math.floor(seeded(frame + 99) * 220);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/** Scene background: animated gradient by default, Ken Burns image, or muted b-roll. */
export const Background: React.FC<{ visual: Visual; src: string | null; palette: Palette; seed: number; durationInFrames: number; dim?: number }> = ({
  visual,
  src,
  palette,
  seed,
  durationInFrames,
  dim = 0.35,
}) => {
  const frame = useCurrentFrame();
  const media = src && (visual.type === "image" || visual.type === "video");
  if (!media) return <AnimatedGradient palette={palette} seed={seed} />;
  const scale = interpolate(frame, [0, durationInFrames], [1.06, 1.18], { extrapolateRight: "clamp" });
  const dx = interpolate(frame, [0, durationInFrames], [0, seed % 2 ? -30 : 30]);
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg[0], overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translateX(${dx}px)` }}>
        {visual.type === "image" ? (
          <Img src={resolveSrc(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <OffthreadVideo src={resolveSrc(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${rgba("#000000", dim + 0.15)} 0%, ${rgba("#000000", dim * 0.4)} 35%, ${rgba("#000000", dim * 0.6)} 55%, ${rgba("#000000", dim + 0.3)} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Darkens the caption band so captions stay readable on any background. */
export const CaptionScrim: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.28) 62%, rgba(0,0,0,0.32) 72%, rgba(0,0,0,0) 85%)",
    }}
  />
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)` }} />
);
