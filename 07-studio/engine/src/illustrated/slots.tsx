// Persistent character slots of the 2D formats, drawn in fixed frame positions (outside the element column):
//  - the host: a flat vector bust built from shapes at the bottom of a host-tutorial scene, its pose and expression
//    switchable per scene (`host` element; host-tutorial draws a default host when a scene has none),
//  - the mascot: a small creature of rounded, shaded shapes at the bottom right of a checklist-glass scene
//    (`mascot` element, same default rule).
// Frame-pure: motion comes only from the scene clock. Every color derives from the look's ink or a computed neutral.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ResolvedSpec, TimelineScene } from "../types";
import { IllustrationContext, col, makeInk, useKit } from "./kit";
import { shade } from "./format-elements";
import type { Look } from "./looks";

type El = Record<string, unknown>;

/** Skin tones of the generic host (original palette of four neutrals, light to deep). */
export const SKIN_TONES = ["#F2C7A0", "#D9A074", "#B77B52", "#8A5A3C"];
const EYE = "#241B17";

/** Entrance of a slot: it rises from below in the first scene; later scenes only give it a small pose-change pop. */
const useSlot = (first: boolean, since: number, delaySec = 0.05) => {
  const { fps } = useVideoConfig();
  const rise = spring({ frame: first ? since - Math.round(delaySec * fps) : 1000, fps, config: { damping: 13, stiffness: 120, mass: 0.9 } });
  const pop = first ? 1 : spring({ frame: since, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  return { rise, pop: first ? 1 : interpolate(pop, [0, 1], [0.94, 1]) };
};

/* ================================================================ host ================================================================ */

const HostFace: React.FC<{ expression: string; blink: number; t: number }> = ({ expression, blink, t }) => {
  const ey = 205;
  const eyeL = 222;
  const eyeR = 298;
  const look = expression === "think" ? { x: 7, y: -6 } : { x: 0, y: 0 };
  const open = (x: number, closed = false) =>
    closed ? (
      <path d={`M ${x - 12} ${ey} Q ${x} ${ey - 10} ${x + 12} ${ey}`} stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
    ) : (
      <g>
        <ellipse cx={x} cy={ey} rx={14} ry={15 * blink + 1} fill="#FFFFFF" />
        <ellipse cx={x + look.x} cy={ey + look.y} rx={8} ry={Math.max(1.5, 9 * blink)} fill={EYE} />
      </g>
    );
  const brow = (x: number, side: number) => {
    const lift = expression === "wow" ? 16 : expression === "think" && side > 0 ? 12 : expression === "wink" && side < 0 ? -4 : 4;
    const tilt = expression === "think" && side > 0 ? -6 : 0;
    return <path d={`M ${x - 17} ${ey - 28 - lift + tilt} Q ${x} ${ey - 38 - lift} ${x + 17} ${ey - 28 - lift - tilt}`} stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />;
  };
  let mouth: React.ReactNode;
  switch (expression) {
    case "wow":
      mouth = <ellipse cx={260} cy={266 + Math.sin(t * 5) * 1.5} rx={15} ry={19} fill="#6B2A2A" />;
      break;
    case "calm":
      mouth = <path d="M 238 262 Q 260 272 282 262" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />;
      break;
    case "think":
      mouth = <path d="M 244 266 Q 262 258 282 268" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />;
      break;
    default:
      mouth = (
        <g>
          <path d="M 226 254 Q 260 296 294 254 Z" fill="#6B2A2A" />
          <path d="M 232 255 Q 260 266 288 255 L 286 260 Q 260 272 234 260 Z" fill="#FFFFFF" />
        </g>
      );
  }
  return (
    <g>
      {open(eyeL, expression === "wink")}
      {open(eyeR)}
      {brow(eyeL, -1)}
      {brow(eyeR, 1)}
      <ellipse cx={196} cy={238} rx={15} ry={9} fill="#E7705F" opacity={0.28} />
      <ellipse cx={324} cy={238} rx={15} ry={9} fill="#E7705F" opacity={0.28} />
      {mouth}
    </g>
  );
};

/** The host bust: head, neck, shoulders and the arms of the pose. Drawn in a 520x520 box, the bottom is cut by the frame. */
const HostArt: React.FC<{ el: El; t: number; frame: number; shirt: string; hair: string }> = ({ el, t, frame, shirt, hair }) => {
  const pose = (el.pose as string) ?? "point";
  const expression = (el.expression as string) ?? "smile";
  const skin = SKIN_TONES[(el.skin as number) ?? 0] ?? SKIN_TONES[0];
  const skin2 = shade(skin, -0.16);
  const cyc = frame % 104;
  const blink = cyc < 4 ? [0.55, 0.1, 0.1, 0.55][cyc] : 1;
  const sleeve = shade(shirt, -0.12);
  const cuff = shade(shirt, 0.22);
  const bob = Math.sin(t * 2) * 3;
  const swing = Math.sin(t * 5.5);
  const arm = (d: string, hand: { x: number; y: number }, extra?: React.ReactNode) => (
    <g>
      <path d={d} stroke={sleeve} strokeWidth={66} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={shirt} strokeWidth={50} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={hand.x} cy={hand.y} r={31} fill={skin} />
      {extra}
    </g>
  );
  const handR = { x: 452, y: 232 };
  let arms: React.ReactNode;
  switch (pose) {
    case "wave":
      arms = (
        <g transform={`rotate(${swing * 12} 450 300)`}>
          {arm("M 440 400 Q 470 350 452 252", { x: 452, y: 226 }, <path d="M 438 205 l -6 -26 M 452 198 l 0 -30 M 466 205 l 7 -26" stroke={skin} strokeWidth={13} strokeLinecap="round" />)}
        </g>
      );
      break;
    case "think":
      arms = arm("M 430 420 Q 440 330 336 300", { x: 322, y: 282 }, <path d="M 306 270 q 14 -18 34 -6" stroke={skin2} strokeWidth={6} fill="none" strokeLinecap="round" />);
      break;
    case "shrug":
      arms = (
        <g transform={`translate(0 ${-6 + Math.sin(t * 3) * 3})`}>
          {arm("M 120 400 Q 40 390 56 318", { x: 54, y: 296 }, <ellipse cx={54} cy={282} rx={30} ry={11} fill={skin} />)}
          {arm("M 400 400 Q 480 390 464 318", { x: 466, y: 296 }, <ellipse cx={466} cy={282} rx={30} ry={11} fill={skin} />)}
        </g>
      );
      break;
    case "cheer": {
      const up = Math.abs(Math.sin(t * 4.5)) * 16;
      arms = (
        <g transform={`translate(0 ${-up})`}>
          {arm("M 120 400 Q 56 330 84 190", { x: 84, y: 166 })}
          {arm("M 400 400 Q 464 330 436 190", { x: 436, y: 166 })}
        </g>
      );
      break;
    }
    case "present":
      arms = arm("M 130 400 Q 40 380 64 290", { x: 62, y: 262 }, <path d="M 38 252 l 48 0" stroke={skin2} strokeWidth={5} strokeLinecap="round" />);
      break;
    default: {
      // point: the right hand rises toward the content and the index finger bobs
      const bobF = Math.sin(t * 4) * 6;
      arms = arm("M 430 410 Q 478 360 458 270", handR, <rect x={handR.x - 8} y={handR.y - 70 + bobF} width={16} height={56} rx={8} fill={skin} />);
    }
  }
  const lean = pose === "think" ? 3 : pose === "shrug" ? 0 : Math.sin(t * 1.3) * 1.2;
  return (
    <g transform={`translate(0 ${bob})`}>
      {/* back arm on the far side stays down as a plain sleeve */}
      <path d="M 120 400 Q 60 440 70 540" stroke={sleeve} strokeWidth={64} fill="none" strokeLinecap="round" opacity={pose === "shrug" || pose === "cheer" || pose === "present" ? 0 : 1} />
      <path d="M 20 540 Q 24 372 150 342 L 370 342 Q 496 372 500 540 Z" fill={shirt} />
      <path d="M 370 342 Q 496 372 500 540 L 430 540 Q 440 400 370 342 Z" fill={sleeve} opacity={0.5} />
      <rect x={224} y={262} width={72} height={90} rx={26} fill={skin2} />
      <path d="M 200 344 L 260 418 L 320 344 Z" fill={skin2} />
      <path d="M 196 342 Q 260 372 324 342" stroke={cuff} strokeWidth={14} fill="none" strokeLinecap="round" />
      <g transform={`rotate(${lean} 260 300)`}>
        <ellipse cx={160} cy={206} rx={17} ry={27} fill={skin2} />
        <ellipse cx={360} cy={206} rx={17} ry={27} fill={skin2} />
        <ellipse cx={260} cy={196} rx={100} ry={116} fill={skin} />
        <path d="M 156 226 Q 138 62 262 60 Q 386 62 366 226 Q 358 156 342 140 Q 262 104 182 140 Q 166 156 156 226 Z" fill={hair} />
        <path d="M 196 100 Q 250 76 320 102" stroke={shade(hair, 0.3)} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.6} />
        <HostFace expression={expression} blink={blink} t={t} />
      </g>
      {arms}
    </g>
  );
};

const HostSlot: React.FC<{ el: El; scene: number; first: boolean; since: number }> = ({ el, scene, first, since }) => {
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { rise, pop } = useSlot(first, since);
  const shirt = col(ink, el.shirt as string | undefined, ink.accent);
  const hair = col(ink, el.hair as string | undefined, ["#2B1D16", "#3A2418", "#161216", "#5A3A22"][scene % 4]);
  return (
    <div style={{ position: "absolute", left: 120, top: 1400, width: 520, height: 520, transform: `translateY(${interpolate(rise, [0, 1], [320, 0])}px) scale(${pop})`, transformOrigin: "50% 100%", pointerEvents: "none" }}>
      <svg width={520} height={520} viewBox="0 0 520 520" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <ellipse cx={260} cy={534} rx={270} ry={18} fill="rgba(42,33,24,0.25)" />
        <HostArt el={el} t={t} frame={frame} shirt={shirt} hair={hair} />
      </svg>
    </div>
  );
};

/* ================================================================ mascot ================================================================ */

const Ball: React.FC<{ cx: number; cy: number; r: number; fill: string; ry?: number; opacity?: number }> = ({ cx, cy, r, fill, ry, opacity }) => <ellipse cx={cx} cy={cy} rx={r} ry={ry ?? r} fill={fill} opacity={opacity} />;

/** A sphere-like shape: radial gradient lit from the top left, a soft shade at the bottom right. */
const gradient = (id: string, base: string) => (
  <radialGradient id={id} cx="0.34" cy="0.28" r="0.85">
    <stop offset="0" stopColor={shade(base, 0.55)} />
    <stop offset="0.38" stopColor={shade(base, 0.12)} />
    <stop offset="0.8" stopColor={base} />
    <stop offset="1" stopColor={shade(base, -0.38)} />
  </radialGradient>
);

const MascotArt: React.FC<{ el: El; t: number; frame: number; base: string }> = ({ el, t, frame, base }) => {
  const mood = (el.mood as string) ?? "happy";
  const pose = (el.pose as string) ?? "idle";
  const cyc = frame % 96;
  const blink = cyc < 4 ? [0.5, 0.1, 0.1, 0.5][cyc] : 1;
  const breathe = Math.sin(t * 2.2) * 3;
  const wave = Math.sin(t * 6) * 16;
  const hop = pose === "cheer" ? Math.abs(Math.sin(t * 4.5)) * 18 : 0;
  const eye = (x: number) =>
    mood === "proud" ? (
      <path d={`M ${x - 14} 118 Q ${x} 100 ${x + 14} 118`} stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />
    ) : (
      <g>
        <ellipse cx={x} cy={116} rx={15} ry={19 * blink + 1} fill="#FFFFFF" />
        <ellipse cx={x + (mood === "think" ? 4 : 0)} cy={118 + (mood === "think" ? -6 : 0)} rx={9} ry={Math.max(2, 12 * blink)} fill={EYE} />
        <circle cx={x + 3} cy={111} r={3.4} fill="#FFFFFF" opacity={blink > 0.5 ? 1 : 0} />
      </g>
    );
  let mouth: React.ReactNode;
  switch (mood) {
    case "wow":
      mouth = <ellipse cx={150} cy={152} rx={11} ry={13 + Math.sin(t * 5)} fill="#5A2330" />;
      break;
    case "think":
      mouth = <path d="M 138 154 Q 150 148 164 156" stroke={EYE} strokeWidth={5} fill="none" strokeLinecap="round" />;
      break;
    default:
      mouth = <path d="M 130 146 Q 150 170 170 146" stroke={EYE} strokeWidth={6} fill="none" strokeLinecap="round" />;
  }
  // arms: spheres on the sides, moved by the pose
  const armL = pose === "cheer" ? { x: 58, y: 150 - hop * 0.4 } : pose === "point" ? { x: 40, y: 168 } : { x: 66, y: 205 };
  const armR = pose === "cheer" ? { x: 242, y: 150 - hop * 0.4 } : pose === "wave" ? { x: 246 + wave * 0.4, y: 160 - Math.abs(wave) } : { x: 234, y: 205 };
  return (
    <g transform={`translate(0 ${breathe - hop})`}>
      <defs>
        {gradient("mc-body", base)}
        {gradient("mc-light", shade(base, 0.25))}
        {gradient("mc-dark", shade(base, -0.2))}
      </defs>
      <Ball cx={108} cy={266} r={34} ry={19} fill="url(#mc-dark)" />
      <Ball cx={192} cy={266} r={34} ry={19} fill="url(#mc-dark)" />
      <Ball cx={150} cy={205} r={84} ry={76} fill="url(#mc-body)" />
      <ellipse cx={150} cy={224} rx={48} ry={42} fill="#FFFFFF" opacity={0.2} />
      <Ball cx={66} cy={60} r={30} fill="url(#mc-light)" />
      <Ball cx={234} cy={60} r={30} fill="url(#mc-light)" />
      <Ball cx={66} cy={62} r={14} fill="#FFFFFF" opacity={0.28} />
      <Ball cx={234} cy={62} r={14} fill="#FFFFFF" opacity={0.28} />
      <Ball cx={150} cy={118} r={82} ry={72} fill="url(#mc-body)" />
      <ellipse cx={112} cy={74} rx={30} ry={14} fill="#FFFFFF" opacity={0.42} transform="rotate(-24 112 74)" />
      {eye(118)}
      {eye(182)}
      <ellipse cx={100} cy={142} rx={14} ry={8} fill="#FF8FA3" opacity={0.5} />
      <ellipse cx={200} cy={142} rx={14} ry={8} fill="#FF8FA3" opacity={0.5} />
      {mouth}
      <Ball cx={armL.x} cy={armL.y} r={27} fill="url(#mc-light)" />
      <Ball cx={armR.x} cy={armR.y} r={27} fill="url(#mc-light)" />
    </g>
  );
};

const MascotSlot: React.FC<{ el: El; first: boolean; since: number }> = ({ el, first, since }) => {
  const { ink } = useKit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { rise, pop } = useSlot(first, since, 0.12);
  const base = col(ink, el.color as string | undefined, ink.accent);
  return (
    <div style={{ position: "absolute", left: 700, top: 1385, width: 300, height: 300, transform: `translateY(${interpolate(rise, [0, 1], [260, 0])}px) scale(${interpolate(rise, [0, 1], [0.8, 1]) * pop})`, transformOrigin: "50% 100%", pointerEvents: "none" }}>
      <svg width={300} height={300} viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <ellipse cx={150} cy={288} rx={98} ry={13} fill="rgba(60,40,120,0.28)" style={{ filter: "blur(5px)" }} />
        <MascotArt el={el} t={t} frame={frame} base={base} />
      </svg>
    </div>
  );
};

/**
 * The character slots of the scene playing at the current frame, drawn above the scenes (the scene stack is clipped to
 * the stage band, the slots live below it): the host and the mascot of the scene's `host` / `mascot` elements, or the
 * look's own default (host-tutorial: a pointing host, checklist-glass: a happy mascot) when the scene has none. The
 * slot stays on screen through the scene transitions; only its pose and expression change.
 */
export const CharacterLayer: React.FC<{ spec: ResolvedSpec; look: Look; scenes: TimelineScene[]; transitionFrames: number }> = ({ spec, look, scenes, transitionFrames }) => {
  const frame = useCurrentFrame();
  const kinds = new Set<string>(spec.scenes.flatMap((s) => ((s.visual as { elements?: El[] }).elements ?? []).map((e) => String(e.type))));
  const own = look.id === "host-tutorial" || look.id === "checklist-glass";
  if (!own && !kinds.has("host") && !kinds.has("mascot")) return null;
  const switchAt = scenes.map((s, i) => (i === 0 ? 0 : s.from + Math.round(transitionFrames / 2)));
  let idx = 0;
  switchAt.forEach((f, i) => (frame >= f ? (idx = i) : null));
  const els = ((spec.scenes[idx]?.visual as { elements?: El[] } | undefined)?.elements ?? []) as El[];
  const host = els.find((e) => e.type === "host") ?? (look.id === "host-tutorial" ? { type: "host" } : undefined);
  const mascot = els.find((e) => e.type === "mascot") ?? (look.id === "checklist-glass" ? { type: "mascot" } : undefined);
  const ink = makeInk(spec.theme.palette, look);
  return (
    <IllustrationContext.Provider value={{ ink, icons: {}, seed: idx + 1, look }}>
      {host ? <HostSlot key={`h${idx}`} el={host} scene={idx} first={idx === 0} since={frame - switchAt[idx]} /> : null}
      {mascot ? <MascotSlot key={`m${idx}`} el={mascot} first={idx === 0} since={frame - switchAt[idx]} /> : null}
    </IllustrationContext.Provider>
  );
};
