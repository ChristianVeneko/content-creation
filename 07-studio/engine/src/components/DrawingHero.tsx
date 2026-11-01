// The hero slot of the classic templates: the emoji/icon Hero as before, or an agent drawing (visual.type "drawing")
// in the same place, with the fx aimed at it. ClassicFx wraps a classic scene with its untargeted fx and camera hits.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Palette, Scene } from "../types";
import { fontStack, heavyWeight } from "../fonts";
import { rgba } from "../util";
import { Hero } from "./Hero";
import { DrawingSvg, drawingBoxInPx, partBoxInPx, type DrawingColors, type DrawingSkin, type DrawingSpec } from "./Drawing2D";
import { Fx2DFilters, Fx2DLayer, classicFxTint, fxSceneStyle, hasScreenFx, type Fx } from "./Fx2D";

const hex2 = (h: string) => {
  const s = h.replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
};
const mixHex = (a: string, b: string, u: number) => `#${hex2(a).map((x, i) => Math.round(x + (hex2(b)[i] - x) * u).toString(16).padStart(2, "0")).join("")}`;

/** Drawing roles of a classic palette. */
export const paletteColors = (p: Palette): DrawingColors => ({
  accent: p.accent,
  accent2: p.accent2 ?? "#FFC145",
  accent3: p.accent3 ?? "#38D6F5",
  good: "#3DDC97",
  bad: "#FF4D6D",
  muted: mixHex(p.text, p.bg[0], 0.45),
  text: p.text,
  bg: p.bg[0],
  surface: mixHex(p.bg[0], p.text, 0.12),
  line: mixHex(p.bg[0], p.text, 0.3),
  paper: "#F4F1EA",
  ink: "#14141C",
});

const classicSkin = (font: string): DrawingSkin => ({
  fonts: { display: fontStack(font), body: fontStack("Inter"), mono: fontStack("Inter"), hand: `'Kalam', ${fontStack(font)}`, weight: heavyWeight(font) },
  shadow: "drop-shadow(0 24px 40px rgba(0, 0, 0, 0.38))",
});

type DrawingVisual = { drawing?: DrawingSpec & { id?: string }; fx?: Fx[] };

/**
 * Hero slot: the emoji/icon Hero (unchanged), or the scene's drawing in a box of size * 1.5 centered on (x, y),
 * popping in after `delay` frames, plus the fx aimed at the drawing (behind and in front of it).
 */
export const HeroSlot: React.FC<{
  scene: Scene;
  palette: Palette;
  font: string;
  index: number;
  moments?: Record<string, number>;
  x?: number;
  y: number;
  size?: number;
  delay?: number;
  tile?: boolean;
  /** A drawing's own size / center when the emoji slot is too small for one (letterbox). */
  drawSize?: number;
  drawX?: number;
  drawY?: number;
}> = ({ scene, palette, font, index, moments, x: ex = 540, y: ey, size: es = 320, delay = 4, tile, drawSize, drawX, drawY }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const visual = scene.visual as Scene["visual"] & DrawingVisual;
  if (visual.type !== "drawing" || !visual.drawing) return <Hero visual={scene.visual} palette={palette} x={ex} y={ey} size={es} delay={delay} tile={tile} />;
  const x = drawX ?? ex;
  const y = drawY ?? ey;
  const size = drawSize ?? es;
  const t = frame / fps;
  const box = size * 1.5;
  const colors = paletteColors(palette);
  const pop = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 140, mass: 0.7 } });
  const enter = delay / fps;
  const drawing = visual.drawing;
  const left = x - box / 2;
  const top = y - box / 2;
  const inner = tile ? size * 1.05 : box;
  const target = (id: string) => {
    const [d, part] = id.split("/");
    if (drawing.id !== undefined && d !== drawing.id) return null;
    const off = (box - inner) / 2;
    if (part !== undefined) {
      const pb = partBoxInPx(drawing, part, inner, inner);
      if (pb) return { x: left + off + pb.x, y: top + off + pb.y, w: pb.w, h: pb.h };
    }
    const db = drawingBoxInPx(drawing, inner, inner);
    return { x: left + off + db.x, y: top + off + db.y, w: db.w, h: db.h };
  };
  const fx = (visual.fx ?? []).filter((f) => f.target);
  const fxProps = fx.length ? { fx, t, sceneSec: durationInFrames / fps, moments, tint: classicFxTint(colors), colors, target, uid: `cfx${index}`, targeted: true } : null;
  return (
    <>
      {fxProps ? <Fx2DLayer {...fxProps} depth="back" /> : null}
      <div style={{ position: "absolute", left, top, width: box, height: box, display: "flex", alignItems: "center", justifyContent: "center", opacity: interpolate(pop, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }), transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${rgba(palette.accent, 0.38)} 0%, ${rgba(palette.accent, 0)} 66%)` }} />
        {tile ? (
          <div
            style={{
              position: "absolute",
              left: (box - inner) / 2,
              top: (box - inner) / 2,
              width: inner,
              height: inner,
              borderRadius: size * 0.26,
              background: `linear-gradient(145deg, ${rgba("#FFFFFF", 0.28)}, ${rgba("#FFFFFF", 0.08)})`,
              border: `3px solid ${rgba("#FFFFFF", 0.35)}`,
              boxShadow: `0 30px 80px ${rgba("#000000", 0.35)}, inset 0 2px 0 ${rgba("#FFFFFF", 0.4)}`,
            }}
          />
        ) : null}
        <DrawingSvg drawing={drawing} colors={colors} skin={classicSkin(font)} t={t} enter={enter} moments={moments} width={tile ? inner * 0.86 : box} height={tile ? inner * 0.86 : box} uid={`cd${index}`} seed={index + 1} style={{ position: "relative" }} />
      </div>
      {fxProps ? <Fx2DLayer {...fxProps} depth="front" /> : null}
    </>
  );
};

const useClassicFx = (scene: Scene, palette: Palette, index: number, moments?: Record<string, number>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fx = ((scene.visual as DrawingVisual).fx ?? []) as Fx[];
  const t = frame / fps;
  const sceneSec = durationInFrames / fps;
  const colors = paletteColors(palette);
  const uid = `cs${index}`;
  const layer = { fx: fx.filter((f) => !f.target), t, sceneSec, moments, tint: classicFxTint(colors), colors, target: () => null, uid };
  return { fx, t, sceneSec, uid, layer };
};

/** Untargeted "back" fx of a classic scene: render it right after the scene's Background (null without fx). */
export const ClassicBackFx: React.FC<{ scene: Scene; palette: Palette; index: number; moments?: Record<string, number> }> = ({ scene, palette, index, moments }) => {
  const { fx, layer } = useClassicFx(scene, palette, index, moments);
  return fx.length ? <Fx2DLayer {...layer} depth="back" /> : null;
};

/** A classic scene with its untargeted "front" fx and camera hits; without fx: the scene as is. */
export const ClassicFx: React.FC<{ scene: Scene; palette: Palette; index: number; moments?: Record<string, number>; children: React.ReactNode }> = ({ scene, palette, index, moments, children }) => {
  const { fx, t, sceneSec, uid, layer } = useClassicFx(scene, palette, index, moments);
  if (!fx.length) return <>{children}</>;
  const screen = hasScreenFx(fx) ? fxSceneStyle(fx, t, sceneSec, moments, uid) : null;
  return (
    <AbsoluteFill>
      {screen ? <Fx2DFilters uid={uid} glitch={screen.cam.glitch} chroma={screen.cam.chroma} seed={index * 31 + 7} /> : null}
      <AbsoluteFill style={screen?.style}>{children}</AbsoluteFill>
      <Fx2DLayer {...layer} depth="front" />
    </AbsoluteFill>
  );
};
