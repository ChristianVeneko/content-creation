// Scene transitions of the illustrated-kit looks. Each is a TransitionPresentation driven only by
// presentationProgress (0..1, linear timing), so it is frame-pure. The cut point is progress 0.5,
// which is where the "cut" SFX beat lands (lib/illustrated.mjs computeBeats).
import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { LookId } from "./looks";
import { ART_TRANSITIONS } from "./art-transitions";

type P = { look: LookId; seed: number; bg: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPresentation = TransitionPresentation<any>;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Whiteboard: an eraser sweeps left to right; the new board is revealed behind its jagged edge. */
const EraseWipe: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: inOut });
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  // Edge x per row: the wipe front plus a felt-like wobble.
  const W = 1080;
  const front = -160 + q * (W + 320);
  const pts: string[] = [];
  for (let k = 0; k <= 24; k++) {
    const y = (k / 24) * 100;
    const wob = Math.sin(k * 1.7 + passedProps.seed) * 26 + Math.sin(k * 0.6) * 18;
    pts.push(`${Math.max(0, front + wob)}px ${y}%`);
  }
  const clip = `polygon(0 0, ${pts.join(", ")}, 0 100%)`;
  return (
    <AbsoluteFill>
      {/* the clean board (opaque) is what the eraser reveals; the new scene draws on top of it */}
      <AbsoluteFill style={{ clipPath: q >= 1 ? undefined : clip, background: q >= 1 ? undefined : passedProps.bg }}>{children}</AbsoluteFill>
      {q > 0 && q < 1 ? (
        // the eraser itself rides the edge
        <div style={{ position: "absolute", left: front - 70, top: 640, width: 150, height: 300, transform: `rotate(${8 + Math.sin(q * 9) * 5}deg)`, borderRadius: 18, overflow: "hidden", boxShadow: "0 18px 30px rgba(0,0,0,0.25)" }}>
          <div style={{ height: "68%", background: "linear-gradient(180deg, #2F6FD6, #1F4FA8)" }} />
          <div style={{ height: "32%", background: "repeating-linear-gradient(90deg, #5A5A5A 0 6px, #6B6B6B 6px 12px)" }} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Breaking news: hard cut at the midpoint, with an RGB split and sliced horizontal glitch around it. */
const GlitchCut: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const entering = presentationDirection === "entering";
  const visible = entering ? presentationProgress >= 0.5 : presentationProgress < 0.5;
  if (!visible) return <AbsoluteFill style={{ opacity: 0 }}>{children}</AbsoluteFill>;
  const d = Math.abs(presentationProgress - 0.5);
  const g = d < 0.25 ? 1 - d / 0.25 : 0; // glitch strength, peaks on the cut
  const off = Math.round(g * 18);
  const k = Math.floor(presentationProgress * 12) + passedProps.seed;
  const shift = g ? ((k * 37) % 7) * 6 - 18 : 0;
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${shift * g}px)`,
        filter: g ? `drop-shadow(${off}px 0 0 rgba(255,0,40,0.75)) drop-shadow(${-off}px 0 0 rgba(0,220,255,0.65)) contrast(${1 + g * 0.4})` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Data story: smooth zoom-through; the old chart grows past the camera, the new one settles in. */
const ZoomThrough: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: inOut });
  const exiting = presentationDirection === "exiting";
  const scale = exiting ? interpolate(q, [0, 1], [1, 1.4]) : interpolate(q, [0, 1], [0.82, 1]);
  const opacity = exiting ? interpolate(q, [0.2, 0.75], [1, 0], clamp) : interpolate(q, [0.25, 0.8], [0, 1], clamp);
  return <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 55%", opacity, filter: `blur(${exiting ? q * 6 : (1 - q) * 6}px)` }}>{children}</AbsoluteFill>;
};

/** Code tutorial: CRT power cycle; the old screen collapses to a bright line, the new one expands from it. */
const CrtCut: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const exiting = presentationDirection === "exiting";
  if (exiting && presentationProgress >= 0.5) return <AbsoluteFill style={{ opacity: 0 }}>{children}</AbsoluteFill>;
  if (!exiting && presentationProgress < 0.5) return <AbsoluteFill style={{ opacity: 0 }}>{children}</AbsoluteFill>;
  const h = exiting ? interpolate(presentationProgress, [0, 0.5], [1, 0.006], { ...clamp, easing: Easing.in(Easing.cubic) }) : interpolate(presentationProgress, [0.5, 1], [0.006, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const glow = 1 - h;
  return (
    <AbsoluteFill style={{ transform: `scaleY(${h}) scaleX(${1 - glow * 0.15})`, transformOrigin: "50% 50%", filter: `brightness(${1 + glow * 2.5})` }}>
      {children}
    </AbsoluteFill>
  );
};

/** Top list: whip pan with motion blur; both shots fly left together. */
const WhipPan: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const exiting = presentationDirection === "exiting";
  const x = exiting ? -q * 1080 : (1 - q) * 1080;
  const blur = Math.sin(q * Math.PI) * 22;
  return <AbsoluteFill style={{ transform: `translateX(${x}px) skewX(${-Math.sin(q * Math.PI) * 6}deg)`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
};

const COMPONENTS: Partial<Record<LookId, React.FC<TransitionPresentationComponentProps<P>>>> = {
  whiteboard: EraseWipe,
  "broadcast": GlitchCut,
  "editorial-chart": ZoomThrough,
  "editor-window": CrtCut,
  "rank-numbers": WhipPan,
  // host-tutorial: halftone dots swell until the next step shows; spotlight-narrative: a slow push through the dark
  "host-tutorial": ART_TRANSITIONS.risograph as React.FC<TransitionPresentationComponentProps<P>>,
  "spotlight-narrative": ZoomThrough,
  // art-style looks: wash dissolve, stop-motion paper slide, smudge wipe, halftone wipe, ink bleed, panel slam
  ...(ART_TRANSITIONS as Partial<Record<LookId, React.FC<TransitionPresentationComponentProps<P>>>>),
};

/** The scene transition of a look, or null when the look keeps the template's default (blueprint). */
export const lookTransition = (look: LookId, i: number, palette: string[] = ["#FFFFFF"]): AnyPresentation | null => {
  const component = COMPONENTS[look];
  // Same gradient as the whiteboard background, so the erased area matches the board around it.
  const bg = `radial-gradient(ellipse 100% 70% at 50% 45%, ${palette[0]} 0%, ${palette[1] ?? palette[0]} 100%)`;
  return component ? ({ component, props: { look, seed: i + 1, bg } } as AnyPresentation) : null;
};
