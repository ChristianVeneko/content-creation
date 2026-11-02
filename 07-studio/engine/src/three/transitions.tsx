// Scene transitions of the 3D looks. Frame-pure: driven only by presentationProgress (0..1, linear timing).
// The cut lands at progress 0.5, where the "cut" SFX beat peaks (lib/illustrated.mjs computeBeats).
import React from "react";
import { AbsoluteFill, Easing, interpolate, random } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { Look3DId } from "./looks";

type P = { look: Look3DId; seed: number; color: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPresentation = TransitionPresentation<any>;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Clay diorama: the old set shrinks away like a toy picked up; the new one opens through a growing circle (iris). */
const IrisPop: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: inOut });
  if (presentationDirection === "exiting") {
    return <AbsoluteFill style={{ transform: `scale(${interpolate(q, [0, 1], [1, 0.88])})`, filter: `brightness(${1 - q * 0.15})` }}>{children}</AbsoluteFill>;
  }
  const r = interpolate(q, [0.15, 1], [0, 1250], clamp);
  return <AbsoluteFill style={{ clipPath: q >= 1 ? undefined : `circle(${r}px at 50% 52%)`, transform: `scale(${interpolate(q, [0, 1], [1.12, 1])})` }}>{children}</AbsoluteFill>;
};

/** Iso explainer: both shots slide together along the isometric axis (a camera pan across the system). */
const IsoPan: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.25, 1) });
  const dx = 1080 * 1.05;
  const dy = dx * 0.5774; // tan(30deg): the isometric axis
  const k = presentationDirection === "exiting" ? -q : 1 - q;
  return <AbsoluteFill style={{ transform: `translate(${k * dx}px, ${k * -dy}px)` }}>{children}</AbsoluteFill>;
};

/** Neon glass: hard cut on a white-hot light streak with an RGB split around it. */
const LightStreak: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const entering = presentationDirection === "entering";
  const visible = entering ? presentationProgress >= 0.5 : presentationProgress < 0.5;
  const d = Math.abs(presentationProgress - 0.5);
  const g = d < 0.3 ? 1 - d / 0.3 : 0;
  const off = Math.round(g * 14);
  return (
    <AbsoluteFill style={{ opacity: visible ? 1 : 0 }}>
      <AbsoluteFill style={{ transform: `scale(${1 + g * 0.06})`, filter: g ? `drop-shadow(${off}px 0 0 rgba(255,46,136,0.8)) drop-shadow(${-off}px 0 0 rgba(0,229,255,0.8)) brightness(${1 + g * 0.8})` : undefined }}>{children}</AbsoluteFill>
      {entering && g > 0 ? (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent ${50 - g * 6}%, ${passedProps.color} 50%, transparent ${50 + g * 6}%)`, opacity: g, mixBlendMode: "screen" }} />
      ) : null}
    </AbsoluteFill>
  );
};

/** Hero product: cinematic dip; the old shot pushes in and blurs to black, the new one settles out of the dark. */
const DipZoom: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: inOut });
  if (presentationDirection === "exiting") {
    const o = interpolate(q, [0, 0.5], [1, 0], clamp);
    return <AbsoluteFill style={{ transform: `scale(${interpolate(q, [0, 0.5], [1, 1.18], clamp)})`, filter: `blur(${q * 14}px)`, opacity: o }}>{children}</AbsoluteFill>;
  }
  const o = interpolate(q, [0.5, 1], [0, 1], clamp);
  return <AbsoluteFill style={{ transform: `scale(${interpolate(q, [0.5, 1], [0.92, 1], clamp)})`, filter: `blur(${(1 - o) * 12}px)`, opacity: o }}>{children}</AbsoluteFill>;
};

/** Paper world: the next spread turns in like a pop-up book page, hinged on its left edge. */
const PageTurn: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const q = interpolate(presentationProgress, [0, 1], [0, 1], { ...clamp, easing: Easing.bezier(0.55, 0, 0.25, 1) });
  if (presentationDirection === "exiting") return <AbsoluteFill style={{ filter: `brightness(${1 - Math.sin(q * Math.PI) * 0.25})` }}>{children}</AbsoluteFill>;
  if (q >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const a = (1 - q) * -100;
  return (
    <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "0% 50%" }}>
      <AbsoluteFill style={{ transform: `rotateY(${a}deg)`, transformOrigin: "0% 50%", boxShadow: `${-30 * (1 - q)}px 0 60px rgba(60,40,20,${0.35 * (1 - q)})`, filter: `brightness(${0.75 + 0.25 * q})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Toy blocks: the next shot is built tile by tile, in stop-motion steps, like bricks pressed onto a plate. */
const BlockBuild: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const q = Math.floor(presentationProgress * 10) / 10; // ten held poses
  if (q >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const cols = 6;
  const rows = 11;
  const cw = 1080 / cols;
  const ch = 1920 / rows;
  const id = `bb-${passedProps.seed}`;
  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // bottom rows are built first (bricks stack up), with a seeded shuffle inside each band
      const order = (rows - 1 - y) / rows * 0.7 + random(`bb-${passedProps.seed}-${x}-${y}`) * 0.3;
      if (q * 1.05 > order) tiles.push(<rect key={`${x}-${y}`} x={x * cw} y={y * ch} width={cw + 1} height={ch + 1} />);
    }
  }
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={id} clipPathUnits="userSpaceOnUse">
            {tiles}
          </clipPath>
        </defs>
      </svg>
      <AbsoluteFill style={{ clipPath: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Holo studio: the old hologram breaks into scanlines that thin out; the new one is drawn back line by line. */
const ScanlineSwap: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;
  const exiting = presentationDirection === "exiting";
  // line duty cycle: 1 = solid image, 0 = gone
  const duty = exiting ? interpolate(p, [0, 0.5], [1, 0], clamp) : interpolate(p, [0.5, 1], [0, 1], clamp);
  if (duty <= 0) return <AbsoluteFill style={{ opacity: 0 }}>{children}</AbsoluteFill>;
  if (duty >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const period = 12;
  const on = Math.max(0.5, duty * period);
  const mask = `repeating-linear-gradient(0deg, black 0 ${on}px, transparent ${on}px ${period}px)`;
  const jitter = Math.round((random(`sl-${passedProps.seed}-${Math.floor(p * 30)}`) - 0.5) * 30 * (1 - duty));
  return (
    <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask, transform: `translateX(${jitter}px)`, filter: `brightness(${1 + (1 - duty) * 1.2}) drop-shadow(0 0 12px ${passedProps.color})` }}>
      {children}
    </AbsoluteFill>
  );
};

const COMPONENTS: Record<Look3DId, React.FC<TransitionPresentationComponentProps<P>>> = {
  "clay-diorama": IrisPop,
  "iso-toon": IsoPan,
  "neon-glass": LightStreak,
  "pedestal": DipZoom,
  "paper-world": PageTurn,
  "toy-blocks": BlockBuild,
  "holo-studio": ScanlineSwap,
  "neon-grid": LightStreak,
  "soft-studio": IrisPop,
  "moody-night": DipZoom,
  "voxel-world": BlockBuild,
  "data-stage": LightStreak,
  "monolith-story": DipZoom,
  "clay-mascot": IrisPop,
  "cutaway-explainer": IrisPop,
  "engineering-explainer": IrisPop,
  "process-explainer": IrisPop,
};

/** The scene transition of a 3D look. */
export const threeTransition = (look: Look3DId, i: number, color = "#FFFFFF"): AnyPresentation => ({ component: COMPONENTS[look] ?? IrisPop, props: { look, seed: i + 1, color } }) as AnyPresentation;
