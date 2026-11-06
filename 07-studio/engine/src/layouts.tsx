import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { DrawingPlan, IconData, Palette, PixelPlan, ResolvedSpec, Scene, ScenePlan, ScenePlan3D, ThreeAssets } from "./types";
import { Scene3DView } from "./three/Scene3D";
import { StageView } from "./three/stage";
import { PixelScene } from "./pixel/PixelScene";
import { IllustratedScene } from "./illustrated/IllustratedScene";
import { AnimatedText } from "./components/AnimatedText";
import { Background, CaptionScrim, Grain, Vignette } from "./components/Background";
import { Hero } from "./components/Hero";
import { ClassicBackFx, ClassicFx, HeroSlot } from "./components/DrawingHero";
import { BODY_FONT, fontStack, heavyWeight } from "./fonts";
import { fitSize, inkOn, rgba } from "./util";

export type SceneProps = {
  scene: Scene;
  index: number;
  count: number;
  spec: ResolvedSpec;
  visualSrc: string | null;
  durationInFrames: number;
  plan?: ScenePlan | ScenePlan3D | PixelPlan | DrawingPlan | null;
  icons?: Record<string, IconData>;
  three?: ThreeAssets | null;
};

const hasHero = (s: Scene) => s.visual.type === "emoji" || s.visual.type === "icon" || s.visual.type === "drawing";
const momentsOf = (plan: SceneProps["plan"]) => (plan && "kind" in plan && plan.kind === "drawing2d" ? plan.moments : undefined);
const isKeyword = (w: string) => /\d/.test(w) || /[%$€x×]/.test(w);
const displayFont = (spec: ResolvedSpec): React.CSSProperties => ({
  fontFamily: fontStack(spec.theme.font),
  fontWeight: heavyWeight(spec.theme.font),
});

/** Accent "sticker" chip used for small labels. */
const Chip: React.FC<{ text: string; palette: Palette; delay?: number; style?: React.CSSProperties }> = ({ text, palette, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        display: "inline-block",
        padding: "12px 28px",
        borderRadius: 999,
        background: palette.accent,
        color: inkOn(palette.accent),
        fontFamily: fontStack("Montserrat"),
        fontWeight: 900,
        fontSize: 40,
        letterSpacing: 3,
        textTransform: "uppercase",
        transform: `scale(${p})`,
        boxShadow: `0 14px 40px ${rgba(palette.accent, 0.45)}`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/* ---------- captions-voice ---------- */
export const CaptionsVoiceScene: React.FC<SceneProps> = ({ scene, index, spec, visualSrc, durationInFrames, plan }) => {
  const { palette } = spec.theme;
  const hero = hasHero(scene);
  const text = scene.onScreenText;
  return (
    <AbsoluteFill>
      <Background visual={scene.visual} src={visualSrc} palette={palette} seed={index + 1} durationInFrames={durationInFrames} />
      <ClassicBackFx scene={scene} palette={palette} index={index} moments={momentsOf(plan)} />
      <CaptionScrim />
      {hero ? <HeroSlot scene={scene} palette={palette} font={spec.theme.font} index={index} moments={momentsOf(plan)} y={hero && text ? 760 : 680} size={300} /> : null}
      {text ? (
        <div style={{ position: "absolute", left: 90, width: 900, top: hero ? 300 : 520, display: "flex", justifyContent: "center" }}>
          <AnimatedText
            text={text}
            animation={scene.animation}
            style={{
              ...displayFont(spec),
              fontSize: fitSize(text, hero ? 92 : 124, 880, spec.theme.font),
              lineHeight: 1.02,
              textTransform: "uppercase",
              textAlign: "center",
              color: palette.text,
              letterSpacing: -1,
              textShadow: `0 8px 30px ${rgba("#000000", 0.45)}`,
            }}
            wordStyle={(w, i) => (isKeyword(w) || i === 0 ? { color: palette.accent } : undefined)}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- kinetic-type ---------- */
export const KineticTypeScene: React.FC<SceneProps> = ({ scene, index, spec, visualSrc, durationInFrames, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette, font } = spec.theme;
  const text = scene.onScreenText || scene.narration.split(/\s+/).slice(0, 6).join(" ");
  const words = text.split(/\s+/).filter(Boolean);
  const fontSize = fitSize(text, words.length <= 2 ? 280 : 230, 880, font);
  const ghost = words.reduce((a, w) => (w.length > a.length ? w : a), "");
  const drift = interpolate(frame, [0, durationInFrames], [80, -160]);
  const longest = ghost;
  const shake = spring({ frame, fps, config: { damping: 8 }, durationInFrames: 10 });
  return (
    <AbsoluteFill>
      <Background visual={scene.visual} src={visualSrc} palette={palette} seed={index * 3 + 2} durationInFrames={durationInFrames} />
      <ClassicBackFx scene={scene} palette={palette} index={index} moments={momentsOf(plan)} />
      <div
        style={{
          position: "absolute",
          top: 120,
          left: drift,
          whiteSpace: "nowrap",
          fontFamily: fontStack(font),
          fontWeight: heavyWeight(font),
          fontSize: 520,
          lineHeight: 1,
          textTransform: "uppercase",
          color: "transparent",
          WebkitTextStroke: `4px ${rgba(palette.text, 0.12)}`,
        }}
      >
        {ghost}
      </div>
      {hasHero(scene) ? <HeroSlot scene={scene} palette={palette} font={spec.theme.font} index={index} moments={momentsOf(plan)} y={360} size={170} /> : null}
      <div
        style={{
          position: "absolute",
          left: 90,
          width: 900,
          top: hasHero(scene) ? 470 : 300,
          height: hasHero(scene) ? 780 : 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${interpolate(shake, [0, 1], [-3, 0])}deg)`,
        }}
      >
        <AnimatedText
          text={text}
          animation={scene.animation}
          stagger={4}
          style={{
            fontFamily: fontStack(font),
            fontWeight: heavyWeight(font),
            fontSize,
            lineHeight: 0.95,
            textTransform: "uppercase",
            textAlign: "center",
            color: palette.text,
            textShadow: `0 12px 0 ${rgba("#000000", 0.25)}`,
          }}
          wordStyle={(w) => (w === longest || isKeyword(w) ? { color: palette.accent } : undefined)}
        />
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/* ---------- countdown ---------- */
export const ListicleScene: React.FC<SceneProps> = ({ scene, index, count, spec, visualSrc, durationInFrames, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette } = spec.theme;
  const items = count >= 3 ? count - 2 : count - 1;
  const isHook = index === 0;
  const isOutro = count >= 3 && index === count - 1;
  const n = index; // 1-based item number for middle scenes
  const numP = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const text = scene.onScreenText || "";

  if (isHook || isOutro) {
    return (
      <AbsoluteFill>
        <Background visual={scene.visual} src={visualSrc} palette={palette} seed={index + 7} durationInFrames={durationInFrames} />
      <ClassicBackFx scene={scene} palette={palette} index={index} moments={momentsOf(plan)} />
        <CaptionScrim />
        {isHook ? (
          <div style={{ position: "absolute", top: 300, width: "100%", textAlign: "center" }}>
            <Chip text={`TOP ${items}`} palette={palette} />
          </div>
        ) : null}
        {hasHero(scene) ? <HeroSlot scene={scene} palette={palette} font={spec.theme.font} index={index} moments={momentsOf(plan)} y={isHook ? 900 : 760} size={isHook ? 220 : 300} /> : null}
        {text ? (
          <div style={{ position: "absolute", left: 90, width: 900, top: isHook ? 420 : 330, textAlign: "center" }}>
            <AnimatedText
              text={text}
              animation={scene.animation}
              style={{ ...displayFont(spec), fontSize: fitSize(text, isHook ? 120 : 100, 880, spec.theme.font), lineHeight: 1, textTransform: "uppercase", color: palette.text, textShadow: `0 8px 30px ${rgba("#000", 0.4)}` }}
              wordStyle={(w) => (isKeyword(w) ? { color: palette.accent } : undefined)}
            />
          </div>
        ) : null}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <Background visual={scene.visual} src={visualSrc} palette={palette} seed={index + 7} durationInFrames={durationInFrames} />
      <ClassicBackFx scene={scene} palette={palette} index={index} moments={momentsOf(plan)} />
      <CaptionScrim />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 250,
          fontFamily: fontStack("Montserrat"),
          fontWeight: 900,
          fontSize: 340,
          lineHeight: 1,
          color: palette.accent,
          textShadow: `0 20px 0 ${rgba("#000", 0.3)}`,
          transform: `translateX(${interpolate(numP, [0, 1], [-400, 0])}px) rotate(${interpolate(numP, [0, 1], [-20, -4])}deg)`,
        }}
      >
        <span style={{ fontSize: 170, verticalAlign: "top", marginRight: 6 }}>#</span>
        {n}
      </div>
      <div style={{ position: "absolute", right: 90, top: 290 }}>
        <Chip text={`${n}/${items}`} palette={{ ...palette, accent: "#FFFFFF" }} delay={6} style={{ fontSize: 34 }} />
      </div>
      {hasHero(scene) ? <HeroSlot scene={scene} palette={palette} font={spec.theme.font} index={index} moments={momentsOf(plan)} x={790} y={560} size={210} delay={8} /> : null}
      {text ? (
        <div style={{ position: "absolute", left: 90, width: 900, top: 720 }}>
          <AnimatedText
            text={text}
            animation={scene.animation}
            delay={6}
            style={{
              ...displayFont(spec),
              fontSize: fitSize(text, 108, 880, spec.theme.font),
              lineHeight: 1,
              textTransform: "uppercase",
              color: palette.text,
              textShadow: `0 8px 30px ${rgba("#000", 0.45)}`,
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- glass-cards ---------- */
export const ExplainerCardsScene: React.FC<SceneProps> = ({ scene, index, count, spec, visualSrc, durationInFrames, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette } = spec.theme;
  const p = spring({ frame, fps, config: { damping: 16, stiffness: 110 } });
  const label = index === 0 ? "•••" : index === count - 1 && count > 2 ? "✓" : `${String(index).padStart(2, "0")}`;
  return (
    <AbsoluteFill>
      <Background visual={scene.visual} src={visualSrc} palette={palette} seed={index * 2 + 5} durationInFrames={durationInFrames} />
      <ClassicBackFx scene={scene} palette={palette} index={index} moments={momentsOf(plan)} />
      <CaptionScrim />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 290,
          width: 900,
          height: 780,
          borderRadius: 64,
          background: `linear-gradient(160deg, ${rgba("#FFFFFF", 0.2)} 0%, ${rgba("#FFFFFF", 0.07)} 100%)`,
          border: `2px solid ${rgba("#FFFFFF", 0.32)}`,
          boxShadow: `0 40px 120px ${rgba("#000000", 0.35)}, inset 0 2px 0 ${rgba("#FFFFFF", 0.35)}`,
          backdropFilter: "blur(24px)",
          transform: `translateY(${interpolate(p, [0, 1], [140, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
          opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 44, left: 48 }}>
          <Chip text={label} palette={palette} delay={6} style={{ fontSize: 36, padding: "10px 26px" }} />
        </div>
        <div style={{ position: "absolute", top: 50, right: 52, display: "flex", gap: 10 }}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ width: i === index ? 40 : 14, height: 14, borderRadius: 7, background: i === index ? palette.accent : rgba("#FFFFFF", 0.4) }} />
          ))}
        </div>
        {hasHero(scene) ? (
          <HeroSlot scene={scene} palette={palette} font={spec.theme.font} index={index} moments={momentsOf(plan)} x={450} y={300} size={290} delay={8} tile />
        ) : (
          <Hero visual={{ type: "icon", emoji: "💡" }} palette={palette} x={450} y={300} size={290} delay={8} tile />
        )}
        <div style={{ position: "absolute", left: 50, right: 50, top: 520, height: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <AnimatedText
            text={scene.onScreenText || ""}
            animation={scene.animation}
            delay={10}
            style={{ ...displayFont(spec), fontSize: fitSize(scene.onScreenText || "", 88, 780, spec.theme.font, false), lineHeight: 1.05, color: palette.text, letterSpacing: -1 }}
            wordStyle={(w) => (isKeyword(w) ? { color: palette.accent } : undefined)}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- letterbox ---------- */
export const QuoteStoryScene: React.FC<SceneProps> = ({ scene, index, spec, visualSrc, durationInFrames, plan }) => {
  const frame = useCurrentFrame();
  const { palette, font } = spec.theme;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.07]);
  const bars = interpolate(frame, [0, 14], [0, 150], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [6, 30], [0, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <Background visual={scene.visual} src={visualSrc} palette={palette} seed={index + 11} durationInFrames={durationInFrames} dim={0.5} />
      <ClassicBackFx scene={scene} palette={palette} index={index} moments={momentsOf(plan)} />
      </AbsoluteFill>
      <Vignette strength={0.75} />
      <Grain opacity={0.12} />
      <div style={{ position: "absolute", left: 90, top: 300, display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: lineW, height: 4, background: palette.accent }} />
        <div style={{ fontFamily: BODY_FONT, fontWeight: 600, fontSize: 34, letterSpacing: 10, color: palette.accent }}>{String(index + 1).padStart(2, "0")}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 340,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 300,
          lineHeight: 1,
          color: rgba(palette.accent, 0.9),
          opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        “
      </div>
      {scene.onScreenText ? (
        <div style={{ position: "absolute", left: 90, width: 900, top: 560 }}>
          <AnimatedText
            text={scene.onScreenText}
            animation={scene.animation}
            delay={8}
            style={{
              fontFamily: fontStack(font),
              fontWeight: heavyWeight(font),
              fontSize: fitSize(scene.onScreenText, 150, 880, font),
              lineHeight: 1,
              textTransform: "uppercase",
              color: palette.text,
              letterSpacing: 1,
              textShadow: `0 10px 40px ${rgba("#000", 0.6)}`,
            }}
          />
        </div>
      ) : null}
      {hasHero(scene) ? <HeroSlot scene={scene} palette={palette} font={spec.theme.font} index={index} moments={momentsOf(plan)} x={850} y={1000} size={150} delay={14} drawSize={190} drawX={820} drawY={1010} /> : null}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: bars, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: bars, background: "#000" }} />
    </AbsoluteFill>
  );
};

const IllustratedLayout: React.FC<SceneProps> = ({ scene, index, spec, durationInFrames, plan, icons }) => (
  <IllustratedScene scene={scene} index={index} spec={spec} durationInFrames={durationInFrames} plan={(plan as ScenePlan | null) ?? null} icons={icons ?? {}} />
);

const ThreeLayout: React.FC<SceneProps> = ({ scene, index, spec, durationInFrames, plan, icons, three }) =>
  (plan as ScenePlan3D | null)?.stage ? (
    <StageView scene={scene} index={index} spec={spec} durationInFrames={durationInFrames} plan={plan as ScenePlan3D} icons={icons ?? {}} three={three ?? null} />
  ) : (
  <Scene3DView scene={scene} index={index} spec={spec} durationInFrames={durationInFrames} plan={(plan as ScenePlan3D | null) ?? null} icons={icons ?? {}} three={three ?? null} />
);

const PixelLayout: React.FC<SceneProps> = ({ scene, index, spec, durationInFrames, plan }) => (
  <PixelScene scene={scene} index={index} spec={spec} durationInFrames={durationInFrames} plan={plan && "kind" in plan && plan.kind === "pixel" ? plan : null} />
);

/** A classic layout with its scene fx (untargeted front fx + camera hits); scenes without fx render the layout as is. */
const withFx = (Layout: React.FC<SceneProps>): React.FC<SceneProps> => {
  const Wrapped: React.FC<SceneProps> = (props) => (
    <ClassicFx scene={props.scene} palette={props.spec.theme.palette} index={props.index} moments={momentsOf(props.plan)}>
      <Layout {...props} />
    </ClassicFx>
  );
  return Wrapped;
};
const CaptionsVoiceFx = withFx(CaptionsVoiceScene);

export const LAYOUTS: Record<ResolvedSpec["template"], React.FC<SceneProps>> = {
  illustrated: IllustratedLayout,
  "captions-voice": CaptionsVoiceFx,
  "kinetic-type": withFx(KineticTypeScene),
  countdown: withFx(ListicleScene),
  "glass-cards": withFx(ExplainerCardsScene),
  "letterbox": withFx(QuoteStoryScene),
  whiteboard: IllustratedLayout,
  "broadcast": IllustratedLayout,
  "editorial-chart": IllustratedLayout,
  "editor-window": IllustratedLayout,
  "rank-numbers": IllustratedLayout,
  watercolor: IllustratedLayout,
  "paper-collage": IllustratedLayout,
  chalkboard: IllustratedLayout,
  risograph: IllustratedLayout,
  "ukiyo-e": IllustratedLayout,
  "pop-comic": IllustratedLayout,
  "ui-cards": IllustratedLayout,
  "flat-depth": IllustratedLayout,
  "soft-gradient": IllustratedLayout,
  "host-tutorial": IllustratedLayout,
  "checklist-glass": IllustratedLayout,
  "spotlight-narrative": IllustratedLayout,
  "data-atlas": IllustratedLayout,
  "clay-diorama": ThreeLayout,
  "iso-toon": ThreeLayout,
  "neon-glass": ThreeLayout,
  "pedestal": ThreeLayout,
  "paper-world": ThreeLayout,
  "toy-blocks": ThreeLayout,
  "holo-studio": ThreeLayout,
  "pixel-dusk": PixelLayout,
  "pixel-night": PixelLayout,
  "pixel-arcade": PixelLayout,
  "pixel-mono": PixelLayout,
  "pixel-versus": PixelLayout,
  "neon-grid": ThreeLayout,
  "soft-studio": ThreeLayout,
  "moody-night": ThreeLayout,
  "voxel-world": ThreeLayout,
  "data-stage": ThreeLayout,
  "monolith-story": ThreeLayout,
  "clay-mascot": ThreeLayout,
  "cutaway-explainer": ThreeLayout,
  "engineering-explainer": ThreeLayout,
  "process-explainer": ThreeLayout,
  "documentary-3d": ThreeLayout,
  // reels-* compositions render src/reels/ReelsVideo (see Root.tsx); these entries only satisfy the type
  "reels-nube": CaptionsVoiceScene,
  "reels-noche": CaptionsVoiceScene,
  "reels-menta": CaptionsVoiceScene,
  "reels-limon": CaptionsVoiceScene,
  "reels-pizarra": CaptionsVoiceScene,
};
