// One illustrated scene: two-tone headline + a stage of planned elements with a slow camera push-in.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { REGIONS } from "../../lib/illustrated.mjs";
import type { Box, IconData, Planned, ResolvedSpec, Scene, ScenePlan } from "../types";
import { fontStack } from "../fonts";
import { rgba, seeded } from "../util";
import { ElementView, OverlayView } from "./elements";
import { IllustrationContext, col, makeInk, progress, usePop } from "./kit";
import { LookHeadline } from "./headlines";
import { lookFor } from "./looks";
import { ArtOverlay, artSceneFilter } from "./artstyles";
import { ContactShadows, depthFor } from "./depth";
import { Fx2DFilters, Fx2DLayer, fxSceneStyle, hasScreenFx, type Fx } from "../components/Fx2D";
import { drawingBoxInPx, partBoxInPx, type DrawingSpec } from "../components/Drawing2D";
import { inkColors, lookFxTint } from "./drawing-skin";
import { AtlasBack, AtlasFront } from "./atlas";

const DISPLAY = fontStack("Montserrat");
const OVERLAYS = new Set(["callout", "stamp"]);

const titleSize = (text: string) => {
  const chars = [...text].length;
  const one = Math.min(116, 900 / (chars * 0.72));
  if (one >= 82) return { size: Math.floor(one), lines: 1 };
  const longest = Math.max(...text.split(/\s+/).map((w) => [...w].length));
  return { size: Math.floor(Math.min(86, 900 / (longest * 0.72), 900 / (Math.ceil(chars / 2) * 0.72) * 1.15)), lines: 2 };
};

const Word: React.FC<{ text: string; start: number; color: string; size: number }> = ({ text, start, color, size }) => {
  const p = usePop(start, { damping: 9, stiffness: 190 });
  return (
    <span
      style={{
        display: "inline-block",
        color,
        fontSize: size,
        // Scale never overshoots 1: a bouncing scale would eat the gap between words.
        transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${Math.min(1, interpolate(p, [0, 1], [0.6, 1]))})`,
        opacity: Math.min(1, p * 2.5),
        textShadow: `0 7px 0 ${rgba("#000000", 0.45)}, 0 0 40px ${rgba(color, 0.25)}`,
      }}
    >
      {text}
    </span>
  );
};

export const Headline: React.FC<{ kicker?: string; main: string; quote?: boolean; color: string; textColor: string }> = ({ kicker, main, quote, color, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const text = quote ? `«${main}»` : main;
  const fit = titleSize(text.toUpperCase());
  const r = REGIONS.title;
  // Anchor to the top of the title region and shrink to fit, so a two-line
  // title never grows upward into the HUD.
  const KICKER_H = 52;
  const avail = r.h - (kicker ? KICKER_H : 0);
  const size = Math.floor(Math.min(fit.size, avail / (fit.lines * 1.06)));
  const k = progress(t, 0.12, 0.35);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", textAlign: "center" }}>
      {kicker ? (
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 46, letterSpacing: 2, textTransform: "uppercase", color: textColor, opacity: k, transform: `translateY(${(1 - k) * -18}px)`, marginBottom: 6, textShadow: "0 5px 0 rgba(0,0,0,0.4)" }}>
          {kicker}
        </div>
      ) : null}
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, lineHeight: 1.04, textTransform: "uppercase", letterSpacing: -1, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: Math.round(size * 0.26) }}>
        {text.split(/\s+/).map((w, i) => (
          <Word key={i} text={w} start={0.22 + i * 0.07} color={color} size={size} />
        ))}
      </div>
    </div>
  );
};

/** Boxes of every element with an id (split children are offset into stack coordinates). */
const collectBoxes = (els: Planned[]): Record<string, Box> => {
  const out: Record<string, Box> = {};
  for (const p of els) {
    if (p.el.id && p.box) out[p.el.id] = p.box;
    if (p.box) for (const c of [...(p.left ?? []), ...(p.right ?? [])]) if (c.el.id && c.box) out[c.el.id] = { ...c.box, x: c.box.x + p.box.x, y: c.box.y + p.box.y };
  }
  return out;
};

export const IllustratedScene: React.FC<{ scene: Scene; index: number; spec: ResolvedSpec; durationInFrames: number; plan: ScenePlan | null; icons: Record<string, IconData> }> = ({
  scene,
  index,
  spec,
  durationInFrames,
  plan,
  icons,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const look = lookFor(spec);
  const ink = makeInk(spec.theme.palette, look);
  const cycle = look.id === "blueprint" ? [ink.accent3, ink.accent2, ink.accent] : [ink.accent, ink.accent2, ink.accent3];
  const titleColor = col(ink, scene.title?.color, cycle[index % cycle.length]);
  const main = scene.title?.main ?? scene.onScreenText ?? "";
  const st = REGIONS.stage;

  // camera shake on stamp impacts (calm looks do not shake)
  const stamps = (plan?.elements ?? []).filter((p) => p.el.type === "stamp" || (p.el.type === "doc" && p.el.stamp)).map((p) => (p.el.type === "stamp" ? p.enter + 0.1 : (p.items[p.items.length - 1] ?? p.enter) + 0.18));
  const shakeAmp = { blueprint: 9, whiteboard: 4, "broadcast": 16, "editorial-chart": 0, "editor-window": 0, "rank-numbers": 12, watercolor: 0, "paper-collage": 6, chalkboard: 3, risograph: 5, "ukiyo-e": 2, "pop-comic": 18 , "ui-cards": 10, "flat-depth": 6, "soft-gradient": 0, "host-tutorial": 0, "checklist-glass": 0, "spotlight-narrative": 4, "data-atlas": 0 }[look.id];
  let shake = 0;
  for (const s of stamps) if (t >= s && t < s + 0.3) shake += Math.sin((t - s) * 70) * shakeAmp * (1 - (t - s) / 0.3);

  // Camera language of the look. Scales > 1 are anchored at the top of the title region so titles never rise into the HUD.
  const titleOrigin = `50% ${REGIONS.title.y}px`;
  let camera: React.CSSProperties;
  switch (look.camera) {
    case "boil": {
      const k = Math.floor(frame / 5);
      camera = { transform: `translate(${(seeded(k) - 0.5) * 1.2 + shake}px, ${(seeded(k + 99) - 0.5) * 1.2}px)` };
      break;
    }
    case "punch": {
      const z = interpolate(t, [0, 0.28], [1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
      camera = { transform: `scale(${z}) translate(${shake}px, ${shake * 0.3}px)`, transformOrigin: titleOrigin };
      break;
    }
    case "drift": {
      const x = interpolate(frame, [0, durationInFrames], [10, -10], { easing: Easing.inOut(Easing.sin) });
      camera = { transform: `translateX(${x}px) scale(${interpolate(frame, [0, durationInFrames], [1, 1.02])})`, transformOrigin: titleOrigin };
      break;
    }
    case "static":
      camera = {};
      break;
    case "settle": {
      const b = spring({ frame, fps, config: { damping: 11, stiffness: 120 } });
      camera = { transform: `scale(${interpolate(b, [0, 1], [1.06, 1])}) rotate(${(1 - b) * 1.5}deg) translate(${shake}px, ${shake * 0.4}px)`, transformOrigin: titleOrigin };
      break;
    }
    case "float": {
      // watercolor: a slow pendulum sway, like a sheet drying on a line
      camera = { transform: `translateY(${Math.sin(t * 0.9) * 6}px) rotate(${Math.sin(t * 0.6 + index) * 0.45}deg) scale(1.01)`, transformOrigin: titleOrigin };
      break;
    }
    case "jitter": {
      // paper collage: the stop-motion camera is re-placed every 12 fps pose
      const k = Math.floor(t * 12);
      camera = { transform: `translate(${(seeded(k + index * 50) - 0.5) * 3 + shake}px, ${(seeded(k + 77) - 0.5) * 3}px) rotate(${(seeded(k + 33) - 0.5) * 0.35}deg)` };
      break;
    }
    case "tilt": {
      // chalkboard: a slow pan up the board, as if following the teacher's hand
      const y = interpolate(frame, [0, durationInFrames], [16, -16], { easing: Easing.inOut(Easing.sin) });
      camera = { transform: `translate(${shake}px, ${y}px) scale(1.015)`, transformOrigin: titleOrigin };
      break;
    }
    case "plate": {
      // risograph: the sheet creeps through the press; registration wobbles every 3 frames
      const x = interpolate(frame, [0, durationInFrames], [-8, 8]);
      const k = Math.floor(frame / 3);
      camera = { transform: `translate(${x + (seeded(k) - 0.5) * 1.2 + shake}px, ${(seeded(k + 9) - 0.5) * 1.2}px)` };
      break;
    }
    case "scroll": {
      // ukiyo-e: the handscroll unrolls right to left under a steady camera
      const x = interpolate(frame, [0, durationInFrames], [26, -26]);
      camera = { transform: `translate(${x + shake}px, 0px) scale(1.03)`, transformOrigin: titleOrigin };
      break;
    }
    case "dutch": {
      // pop comic: each panel lands on a dutch angle, punches in and straightens a little
      const b = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });
      const side = index % 2 ? 1 : -1;
      camera = { transform: `scale(${interpolate(b, [0, 1], [1.08, 1])}) rotate(${side * interpolate(b, [0, 1], [3, 1])}deg) translate(${shake}px, ${shake * 0.5}px)`, transformOrigin: titleOrigin };
      break;
    }
    case "dolly": {
      // flat 2.5D: a slow lateral dolly along the table with a gentle push-in
      const x = interpolate(frame, [0, durationInFrames], [index % 2 ? 14 : -14, index % 2 ? -14 : 14], { easing: Easing.inOut(Easing.sin) });
      camera = { transform: `translate(${x + shake}px, ${shake * 0.4}px) scale(${interpolate(frame, [0, durationInFrames], [1, 1.035])})`, transformOrigin: titleOrigin };
      break;
    }
    default: {
      const push = interpolate(frame, [0, durationInFrames], [1, 1.045]);
      camera = { transform: `scale(${push}) translate(${shake}px, ${shake * 0.4}px)`, transformOrigin: "50% 35%" };
    }
  }

  const boxes = plan ? collectBoxes(plan.elements) : {};
  const moments = (plan as (ScenePlan & { moments?: Record<string, number> }) | null)?.moments;
  // Looks may lay the stack out narrower and upscale it (lib/illustrated.mjs planScene); blueprint keeps the stage width.
  const lw = (plan as (ScenePlan & { w?: number }) | null)?.w ?? st.w;
  const stackBox = { x: 0, y: 0, w: lw, h: plan?.stackH ?? 0 };
  // On a table ground the stack stands on the table's front edge instead of floating mid-stage.
  const onTable = depthFor(look)?.ground === "table";
  const top = plan ? (onTable ? Math.max(0, st.h - plan.stackH * plan.scale - 4) : plan.offsetY) : 0;
  // 2D fx (lib/fx2d.mjs): layers behind / in front of the stage, camera hits on the whole scene
  const fx = ((scene.visual as { fx?: Fx[] }).fx ?? []) as Fx[];
  const sceneSec = durationInFrames / fps;
  const uid = `fx${index}`;
  // data-atlas: every scene of the format gets the atmosphere over its (optional) backdrop, even without a plan
  const atlas = look.id === "data-atlas" ? plan?.elements ?? [] : null;
  const s = plan?.scale ?? 1;
  const stackLeft = st.x + (lw === st.w ? 0 : (st.w - lw * s) / 2);
  const stackTop = st.y + top;
  const toFrame = (b: Box): Box =>
    lw === st.w ? { x: stackLeft + lw / 2 + (b.x - lw / 2) * s, y: stackTop + b.y * s, w: b.w * s, h: b.h * s } : { x: stackLeft + b.x * s, y: stackTop + b.y * s, w: b.w * s, h: b.h * s };
  const allEls = (plan?.elements ?? []).flatMap((p) => [p, ...(p.left ?? []), ...(p.right ?? [])]);
  const target = (id: string): Box | null => {
    const [eid, part] = id.split("/");
    const b = boxes[eid];
    if (!b) return null;
    const el = allEls.find((p) => p.el.id === eid)?.el;
    const h = el?.type === "drawing" ? Math.min(b.h, (el.height as number | undefined) ?? 420) : b.h;
    if (part !== undefined && el?.type === "drawing") {
      const pb = partBoxInPx(el as unknown as DrawingSpec, part, b.w, h);
      return pb ? toFrame({ x: b.x + pb.x, y: b.y + pb.y, w: pb.w, h: pb.h }) : toFrame(b);
    }
    if (el?.type === "drawing") {
      const db = drawingBoxInPx(el as unknown as DrawingSpec, b.w, h);
      return toFrame({ x: b.x + db.x, y: b.y + db.y, w: db.w, h: db.h });
    }
    return toFrame({ ...b, h });
  };
  const fxProps = fx.length ? { fx, t, sceneSec, moments, tint: lookFxTint(ink), colors: inkColors(ink), target, uid } : null;
  const screen = fx.length && hasScreenFx(fx) ? fxSceneStyle(fx, t, sceneSec, moments, uid) : null;
  const content = (
    <AbsoluteFill style={{ ...camera, filter: artSceneFilter(look.id) }}>
      {atlas ? <AtlasBack elements={atlas} index={index} sceneSec={sceneSec} moments={moments} /> : null}
      {fxProps ? <Fx2DLayer {...fxProps} depth="back" /> : null}
      {main ? (
        look.id === "blueprint" ? (
          <Headline kicker={scene.title?.kicker} main={main} quote={scene.title?.quote} color={titleColor} textColor={ink.text} />
        ) : (
          <LookHeadline kicker={scene.title?.kicker} main={main} quote={scene.title?.quote} number={(scene.title as { number?: number } | undefined)?.number} color={titleColor} index={index} language={spec.language} />
        )
      ) : null}
      <div style={{ position: "absolute", left: st.x, top: st.y, width: st.w, height: st.h }}>
        {plan ? (
          <div style={{ position: "absolute", left: lw === st.w ? 0 : (st.w - lw * plan.scale) / 2, top, width: lw, height: plan.stackH, transform: `scale(${plan.scale})`, transformOrigin: lw === st.w ? "50% 0%" : "0% 0%" }}>
            <ContactShadows elements={plan.elements} look={look} t={t} />
            {plan.elements.map((p, i) => (p.box && !OVERLAYS.has(p.el.type) ? <ElementView key={i} p={p} box={p.box} index={index * 100 + i} /> : null))}
            {plan.elements.map((p, i) => (OVERLAYS.has(p.el.type) ? <OverlayView key={`o${i}`} p={p} boxes={boxes} stackBox={stackBox} index={index * 100 + i} /> : null))}
          </div>
        ) : null}
      </div>
      {atlas ? <AtlasFront elements={atlas} language={spec.language} /> : null}
      {fxProps ? <Fx2DLayer {...fxProps} depth="front" /> : null}
      <ArtOverlay look={look} />
    </AbsoluteFill>
  );
  return (
    <IllustrationContext.Provider value={{ ink, icons, seed: index + 1, look, moments, language: spec.language }}>
      {screen ? (
        <AbsoluteFill style={screen.style}>
          <Fx2DFilters uid={uid} glitch={screen.cam.glitch} chroma={screen.cam.chroma} seed={index * 31 + 7} />
          {content}
        </AbsoluteFill>
      ) : (
        content
      )}
    </IllustrationContext.Provider>
  );
};
