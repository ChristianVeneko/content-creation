import React from "react";
import { AbsoluteFill, Audio, CalculateMetadataFunction, interpolate, staticFile, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, type TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { pushCut } from "@remotion/transitions/push-cut";
import type { CaptionLook, RenderProps, TemplateId } from "./types";
import { Captions } from "./components/Captions";
import { ProgressBar } from "./components/ProgressBar";
import { ensureFonts } from "./fonts";
import { LAYOUTS } from "./layouts";
import { isRemote } from "./util";
import { REGIONS, lookOf, usesIllustratedKit } from "../lib/illustrated.mjs";
import { CutFlash, Footer, Hud, IllustratedBackground } from "./illustrated/Chrome";
import { lookTransition } from "./illustrated/transitions";
import type { LookId } from "./illustrated/looks";
import { look3dOf, usesThreeKit } from "../lib/scene3d.mjs";
import { resolveCaptionLook } from "../lib/captions.mjs";
import { threeTransition } from "./three/transitions";
import type { Look3DId } from "./three/looks";
import { usesPixelKit } from "../lib/pixel.mjs";
import { pixelTransition } from "./pixel/transitions";
import { PixelOverlay } from "./pixel/PixelOverlay";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPresentation = TransitionPresentation<any>;

const transitionFor = (spec: RenderProps["spec"], i: number, plan?: unknown): AnyPresentation => {
  // Pixel looks: iris, pixel dissolve or hard cut, per scene plan.
  if (usesPixelKit(spec.template)) return pixelTransition((plan as { transition?: string } | null)?.transition ?? "cut", i);
  // Illustrated-kit templates with their own look bring their own transition (eraser, glitch cut, zoom, CRT, whip pan).
  const own = usesIllustratedKit(spec.template) ? lookTransition(lookOf(spec) as LookId, i, spec.theme.palette.bg) : null;
  if (own) return own;
  // 3D looks: iris pop, isometric pan, neon light streak, cinematic dip.
  if (usesThreeKit(spec.template)) return threeTransition(look3dOf(spec) as Look3DId, i, spec.theme.palette.accent);
  const template: TemplateId = spec.template;
  switch (template) {
    case "captions-voice":
      return (i % 2 === 0 ? pushCut({ flashColor: "#FFFFFF", flashOpacity: 0.5, incomingEndScale: 1 }) : slide({ direction: "from-bottom" })) as AnyPresentation;
    case "kinetic-type":
      return (i % 2 === 0 ? slide({ direction: "from-right" }) : wipe({ direction: "from-top-left" })) as AnyPresentation;
    case "countdown":
      return slide({ direction: "from-right" }) as AnyPresentation;
    case "glass-cards":
      return (i % 2 === 0 ? slide({ direction: "from-bottom" }) : fade()) as AnyPresentation;
    case "illustrated":
      // Punch cut: the old shot pushes in, hard cut on a soft flash, the new shot settles (whoosh peaks on the cut).
      return pushCut({ flashColor: "#BFD4FF", flashOpacity: 0, outgoingScale: 1.08, incomingStartScale: 1.1, incomingEndScale: 1 }) as AnyPresentation;
    case "letterbox":
    default:
      return fade() as AnyPresentation;
  }
};

const src = (s: string) => (isRemote(s) ? s : staticFile(s));

export const calculateVideoMetadata: CalculateMetadataFunction<RenderProps> = ({ props }) => ({
  durationInFrames: Math.max(1, props.timeline.totalFrames),
  fps: props.spec.format.fps,
  width: props.spec.format.width,
  height: props.spec.format.height,
});

export const Video: React.FC<RenderProps> = ({ spec, timeline, captionPages, assets, illustration, icons }) => {
  ensureFonts();
  const { fps, durationInFrames, height } = useVideoConfig();
  const Layout = LAYOUTS[spec.template];
  const T = timeline.transitionFrames;
  const { palette } = spec.theme;
  const items: React.ReactNode[] = [];
  spec.scenes.forEach((scene, i) => {
    const t = timeline.scenes[i];
    items.push(
      <TransitionSeries.Sequence key={`s-${scene.id}`} durationInFrames={t.durationInFrames} premountFor={fps} name={`Scene ${i + 1}: ${scene.id}`}>
        <Layout scene={scene} index={i} count={spec.scenes.length} spec={spec} visualSrc={assets.visuals[i]} durationInFrames={t.durationInFrames} plan={illustration?.[i] ?? null} icons={icons} three={assets.three ?? null} />
      </TransitionSeries.Sequence>,
    );
    if (i < spec.scenes.length - 1 && T > 0) {
      items.push(<TransitionSeries.Transition key={`t-${scene.id}`} presentation={transitionFor(spec, i, illustration?.[i])} timing={linearTiming({ durationInFrames: T })} />);
    }
  });
  const v = spec.music.volume;
  const illustrated = usesIllustratedKit(spec.template);
  // 3D templates share the illustrated chrome (HUD, footer, caption band) but draw their own full-bleed scenes.
  const chrome = illustrated || usesThreeKit(spec.template);
  const band = chrome ? { top: REGIONS.captions.y, height: REGIONS.captions.h } : undefined;
  // Style, size, position and accent from spec.captions (falls back to theme.captionStyle and the template band).
  const captionLook = resolveCaptionLook(spec, band ?? { top: 1130, height: 260 }) as CaptionLook;
  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg[0] }}>
      {illustrated ? <IllustratedBackground spec={spec} /> : null}
      {illustrated && spec.template !== "data-atlas" ? (
        // Scenes only live between the HUD and the captions, so cuts never sweep over the chrome.
        <AbsoluteFill style={{ clipPath: `inset(${REGIONS.title.y - 34}px 0 ${height - (REGIONS.captions.y - 6)}px 0)` }}>
          <TransitionSeries>{items}</TransitionSeries>
        </AbsoluteFill>
      ) : (
        <TransitionSeries>{items}</TransitionSeries>
      )}
      {illustrated ? <CutFlash scenes={timeline.scenes} transitionFrames={T} spec={spec} /> : null}
      {usesPixelKit(spec.template) ? <PixelOverlay spec={spec} timeline={timeline} pages={captionPages} /> : null}
      {chrome ? <Hud spec={spec} scenes={timeline.scenes} transitionFrames={T} /> : null}
      {chrome ? <Footer spec={spec} avatar={assets.avatar ?? null} /> : null}
      {spec.captions.enabled && captionPages.length ? (
        <Captions pages={captionPages} style={captionLook.style} palette={palette} font={spec.theme.font} band={band} look={captionLook} />
      ) : null}
      <ProgressBar color={palette.accent} />
      {assets.bed ? <Audio src={src(assets.bed)} /> : null}
      {assets.narration ? <Audio src={src(assets.narration)} /> : null}
      {assets.music ? (
        <Audio
          src={src(assets.music)}
          loop
          volume={(f) =>
            interpolate(f, [0, 20, durationInFrames - 30, durationInFrames], [0, v, v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
