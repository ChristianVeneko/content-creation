// Pixel-friendly scene transitions, frame-pure (driven only by presentationProgress, linear timing):
//   iris     : the new scene opens through a circle that grows in whole 40 px steps,
//   dissolve : the new scene appears block by block (40 px blocks in a seeded random order),
//   cut      : hard cut at the middle of the transition, on the "cut" SFX beat,
//   diamond  : classic diamond tiles that grow from the top-left corner in whole steps,
//   wipe     : a stepped bar wipe with a jagged pixel edge,
//   glitch   : the new scene arrives in horizontal slices shifted sideways.
import React from "react";
import { AbsoluteFill, random } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

type P = { kind: string; seed: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPresentation = TransitionPresentation<any>;
const BLOCK = 40;

const blocksPath = (p: number, seed: number) => {
  const cols = 1080 / BLOCK, rows = 1920 / BLOCK;
  let d = "";
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) if (random(`px-${seed}-${x}-${y}`) < p) d += `M${x * BLOCK} ${y * BLOCK}h${BLOCK}v${BLOCK}h-${BLOCK}z`;
  return d;
};

const PixelTransition: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") {
    // the old scene darkens in two hard steps
    const dim = passedProps.kind === "cut" ? 1 : p < 0.33 ? 1 : p < 0.66 ? 0.75 : 0.5;
    return <AbsoluteFill style={{ filter: dim < 1 ? `brightness(${dim})` : undefined }}>{children}</AbsoluteFill>;
  }
  if (passedProps.kind === "cut") return <AbsoluteFill style={{ opacity: p >= 0.5 ? 1 : 0 }}>{children}</AbsoluteFill>;
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  if (passedProps.kind === "diamond") {
    const cols = 1080 / 120, rows = 1920 / 120;
    let d = "";
    for (let y = 0; y <= rows; y++)
      for (let x = 0; x <= cols; x++) {
        const local = Math.min(1, Math.max(0, p * 2.2 - ((x + y) / (cols + rows)) * 1.2));
        const r = Math.round(local * 4) * 21;
        if (r > 0) d += `M${x * 120} ${y * 120 - r}l${r} ${r}l-${r} ${r}l-${r} -${r}z`;
      }
    return <AbsoluteFill style={{ clipPath: d ? `path("${d}")` : "inset(100%)" }}>{children}</AbsoluteFill>;
  }
  if (passedProps.kind === "wipe") {
    let d = "";
    const edge = Math.round(p * 1.15 * 1920 / BLOCK) * BLOCK;
    for (let x = 0; x < 1080; x += BLOCK) {
      const jag = Math.round(random(`wp-${passedProps.seed}-${x}`) * 2) * BLOCK;
      d += `M${x} 0h${BLOCK}v${Math.max(0, edge - jag)}h-${BLOCK}z`;
    }
    return <AbsoluteFill style={{ clipPath: `path("${d}")` }}>{children}</AbsoluteFill>;
  }
  if (passedProps.kind === "glitch") {
    // horizontal slices arrive in a seeded order while the whole scene jitters sideways and hue-shifts
    const slices = 24, h = 1920 / slices;
    let d = "";
    for (let k = 0; k < slices; k++) if (random(`gl-${passedProps.seed}-${k}`) < p * 1.25) d += `M0 ${k * h}h1080v${h}h-1080z`;
    const jitter = Math.round((random(`gj-${passedProps.seed}-${Math.round(p * 20)}`) - 0.5) * 6) * 8;
    return (
      <AbsoluteFill style={{ clipPath: d ? `path("${d}")` : "inset(100%)", transform: `translateX(${p < 0.9 ? jitter : 0}px)`, filter: p < 0.9 ? "hue-rotate(60deg) saturate(1.8) contrast(1.2)" : undefined }}>
        {children}
      </AbsoluteFill>
    );
  }
  if (passedProps.kind === "dissolve") {
    const d = blocksPath(p * 1.05, passedProps.seed);
    return <AbsoluteFill style={{ clipPath: d ? `path("${d}")` : "inset(100%)" }}>{children}</AbsoluteFill>;
  }
  const r = Math.round((p * 1150) / BLOCK) * BLOCK;
  return <AbsoluteFill style={{ clipPath: `circle(${r}px at 50% 46%)` }}>{children}</AbsoluteFill>;
};

/** The transition after scene i of a pixel template ("iris" | "dissolve" | "cut" | "diamond" | "wipe" | "glitch"). */
export const pixelTransition = (kind: string, i: number): AnyPresentation => ({ component: PixelTransition, props: { kind, seed: i + 1 } }) as AnyPresentation;
