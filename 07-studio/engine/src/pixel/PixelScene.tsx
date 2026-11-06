// One pixel-art scene: the set's layers drawn on low-res buffers every frame, upscaled x4 with nearest-neighbor
// filtering, parallax camera, fake depth of field (CSS blur on the upscaled far and near layers), glow, light rays,
// dust, and the per-scene UI (banner, popup / counter / checklist, prop tags).
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { CROWN_ROWS, PARALLAX, PIXEL_LOOKS, PX, cameraOffset, fighterXs, lookPalette, pixelLookOf } from "../../lib/pixel.mjs";
import { ease, momentSeconds, motionState, spriteLibrary } from "../../lib/pixel-gen.mjs";
import { drawCustomSet, drawSprite, drawTransformed, type ParsedSprite } from "./gen";
import { chromaBuf, dissolveBuf, drawFx, emptyScreen, glitchBuf, pixelateBuf, type Screen } from "./fx";
import { BW, BH, MY, Painter, mix, rgb } from "./painter";
import { SETS, rgbRoles, type Layer, type Layers, type Ray, type SetInfo } from "./sets";
import { FLOATING, PROPS, SMALL, burst, type Box } from "./props";
import { drawCharacter, headBoxes } from "./character";
import { Banner, bannerBottom, Checklist, Counter, Popup, Ranking, RoundCard, Tag, Verdict, VersusHeader, type UiColors } from "./ui";
import { TAG_FONT } from "../fonts";
import type { PixelPlan, ResolvedSpec, Scene } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PixelVisual = Record<string, any>;

const S = PX.scale;
const FLOOR_MASK = "linear-gradient(180deg, transparent 0 1330px, rgba(0,0,0,0.85) 1560px, black 1700px)";

/** Low-res buffer shown as a crisp x4 canvas. */
const PxCanvas: React.FC<{ data: Uint8ClampedArray; dx: number; dy: number; style?: React.CSSProperties }> = ({ data, dx, dy, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), BW, BH), 0, 0);
  }, [data]);
  return (
    <canvas
      ref={ref}
      width={BW}
      height={BH}
      style={{ position: "absolute", left: (-PX.margin + dx) * S, top: (-MY + dy) * S, width: BW * S, height: BH * S, imageRendering: "pixelated", ...style }}
    />
  );
};

const newLayer = (): Layer => ({ p: new Painter(), g: new Painter() });

/** Light rays as screen-blended gradient wedges, split in three beams that breathe independently. */
const Rays: React.FC<{ rays: Ray[]; color: string; opacity: number; dx: number; t: number; id: string }> = ({ rays, color, opacity, dx, t, id }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", filter: "blur(16px)" }}>
    <defs>
      {rays.map((r, i) => (
        <radialGradient key={i} id={`${id}-r${i}`} gradientUnits="userSpaceOnUse" cx={(r.x + dx) * S} cy={r.y * S} r={r.len * S}>
          <stop offset="0" stopColor={r.color ?? color} stopOpacity={opacity} />
          <stop offset="0.55" stopColor={r.color ?? color} stopOpacity={opacity * 0.4} />
          <stop offset="1" stopColor={r.color ?? color} stopOpacity={0} />
        </radialGradient>
      ))}
    </defs>
    {rays.flatMap((r, i) =>
      [-1, 0, 1].map((k) => {
        const a0 = ((r.angle + (k * r.spread) / 3 - r.spread / 6) * Math.PI) / 180;
        const a1 = ((r.angle + (k * r.spread) / 3 + r.spread / 6) * Math.PI) / 180;
        const ox = (r.x + dx) * S, oy = r.y * S, L = r.len * S;
        const breathe = 0.55 + 0.45 * Math.sin(t * (0.9 + k * 0.37) + i * 2 + k);
        return (
          <polygon
            key={`${i}${k}`}
            points={`${ox},${oy} ${ox + Math.cos(a0) * L},${oy + Math.sin(a0) * L} ${ox + Math.cos(a1) * L},${oy + Math.sin(a1) * L}`}
            fill={`url(#${id}-r${i})`}
            opacity={breathe}
          />
        );
      }),
    )}
  </svg>
);

/** Draw the whole scene for time t (seconds into the scene). Pure: same inputs, same pixels. */
export function drawPixelScene(spec: ResolvedSpec, pixel: PixelVisual, plan: PixelPlan, t: number, seed: string, sceneSec = 5, fps = 30) {
  const lookId = pixelLookOf(spec);
  const look = PIXEL_LOOKS[lookId as keyof typeof PIXEL_LOOKS];
  const C = rgbRoles(look.roles);
  const L: Layers = { far: newLayer(), mid: newLayer(), sub: newLayer(), near: newLayer() };
  const fx = new Painter();
  const fxG = new Painter();
  const moments = (plan as PixelPlan & { moments?: Record<string, number> }).moments ?? {};
  const resolve = (at: unknown) => momentSeconds(at, moments, sceneSec, fps) as number;
  const lib = spriteLibrary(spec) as Map<string, ParsedSprite>;
  const mo = (m: unknown, k: string, frames = 1, sfps = 6) => motionState(m, t, { resolve, sceneSec, frames, fps: sfps, seed: `${seed}-${k}` });
  const info: SetInfo =
    pixel.set && typeof pixel.set === "object"
      ? drawCustomSet(L, { C, t, seed, sky: look.sky, lib, resolve, sceneSec }, pixel.set)
      : (SETS[plan.set] ?? SETS.room)(L, { C, t, seed, sky: look.sky });
  const rays = [...info.rays];
  if (pixel.rays === false) rays.length = 0;
  const labels: { box: Box; text: string; sign: boolean }[] = [];
  const props = (pixel.props ?? []) as PixelVisual[];
  // character first so props in front overlap it naturally
  const ch = pixel.character as PixelVisual | undefined;
  const drawProp = (q: PixelVisual, i: number) => {
    const pl = plan.props[i];
    if (!pl || t < pl.enter) return;
    const m = q.motion ? mo(q.motion, `p${i}`) : null;
    if (m && !m.visible) return;
    if (m && (m.dx || m.dy || m.x !== undefined || m.y !== undefined || m.scale !== 1 || m.rotate || m.opacity < 1)) {
      const x0 = Math.round((m.x ?? pl.x) * PX.w);
      const dy = m.y !== undefined ? Math.round(m.y * PX.h) - info.floor : 0;
      drawTransformed(L.sub, { dx: x0 - Math.round(pl.x * PX.w) + m.dx, dy: dy + m.dy, scale: m.scale, rotate: m.rotate, opacity: m.opacity }, Math.round(pl.x * PX.w), FLOATING.has(q.kind) ? info.floor - 70 : info.floor - 12, (T) => drawPropAt({ ...q, motion: undefined }, i, T));
      return;
    }
    drawPropAt(q, i, L.sub);
  };
  const drawPropAt = (q: PixelVisual, i: number, Lsub: Layer) => {
    const pl = plan.props[i];
    const since = t - pl.enter;
    const x = Math.round(pl.x * PX.w);
    const s = q.big ? 3 : 2;
    const surface = SMALL.has(q.kind) && !q.big ? info.surfaces.find((sf) => x >= sf.x0 + 10 && x <= sf.x1 - 10) : undefined;
    const floating = FLOATING.has(q.kind);
    let base = surface ? surface.y : info.floor;
    if (floating) base = info.floor - 64 - (q.big ? 10 : 0) + Math.round(Math.sin(t * 2.2 + i * 1.3) * 2);
    // drop in: fall 14 px in 0.2 s, one pixel bounce
    const drop = since < 0.2 ? -Math.round((1 - since / 0.2) * 14) : since < 0.3 ? -1 : 0;
    if (!floating) Lsub.p.pool(x, base, (q.big ? 22 : 15), 3, mix(C.ink, C.floor0, 0.3), 0.9);
    const box = PROPS[q.kind]?.(Lsub, x, base + drop, s, C, { color: q.color, open: q.open, t, since, glow: q.glow });
    if (!box) return;
    if (since < 0.45) burst(Lsub, x, box.y + box.h / 2, 1, C, since);
    if (q.glow) Lsub.g.rect(box.x, box.y, box.w, box.h, C.glow);
    if (q.label) labels.push({ box, text: q.label, sign: q.kind === "sign" });
  };
  if (ch) {
    const cx = Math.round((ch.x ?? 0.3) * PX.w);
    L.sub.p.pool(cx, info.floor, 22, 4, mix(C.ink, C.floor0, 0.2), 0.95);
    const cm = ch.motion ? mo(ch.motion, "ch") : null;
    let pos = { handY: info.floor - 40 };
    if (cm && !cm.visible) pos = { handY: info.floor - 40 };
    else if (cm) {
      const dx = (cm.x !== undefined ? Math.round(cm.x * PX.w) - cx : 0) + cm.dx;
      const dy = (cm.y !== undefined ? Math.round(cm.y * PX.h) - info.floor : 0) + cm.dy;
      drawTransformed(L.sub, { dx, dy, scale: cm.scale, rotate: cm.rotate, opacity: cm.opacity }, cx, info.floor, (T) => {
        pos = drawCharacter(T, ch, C, cx, info.floor, 2, t);
      });
      pos = { handY: pos.handY + dy };
    } else pos = drawCharacter(L.sub, ch, C, cx, info.floor, 2, t);
    if (ch.pose === "hold" && ch.item) {
      const box = PROPS[ch.item]?.(L.sub, cx, pos.handY, 2, C, { t, since: t - 0.3, open: true });
      if (box) {
        L.sub.g.disc(cx, box.y + box.h / 2, 16, C.glow);
        rays.push({ x: cx, y: box.y + box.h / 2, angle: 270, spread: 340, len: 70, color: rgbHex(mix(C.glow, C.paper, 0.4)) });
      }
    }
  }
  props.forEach(drawProp);
  // agent-drawn sprites placed in the scene
  // versus fighters stand on the stage like actors (the right-hand one is mirrored to face the left), then the agent's actors
  const fighters = (pixel.fighters ?? []) as PixelVisual[];
  const fighterX = fighterXs(fighters) as number[];
  const fighterActors: PixelVisual[] = fighters.map((f, i) => ({ sprite: f.sprite, x: fighterX[i], scale: f.scale ?? 5, flip: fighterX[i] > 0.6, motion: f.anim, crown: f.crown }));
  const actors = [...fighterActors, ...((pixel.actors ?? []) as PixelVisual[])];
  const free = actors.filter((a) => a.x === undefined).length;
  let fi = 0;
  actors.forEach((a, i) => {
    const sp = lib.get(a.sprite);
    if (!sp) return;
    const t0 = a.at !== undefined ? resolve(a.at) : 0;
    if (t < t0 || (a.until !== undefined && t >= resolve(a.until))) return;
    const m = mo(a.motion, `a${i}`, sp.frames.length, a.fps ?? sp.fps);
    const autoX = a.x === undefined ? (free === 1 ? 0.5 : 0.22 + (0.56 * fi++) / Math.max(1, free - 1)) : a.x;
    if (!m.visible) return;
    const depth = a.depth ?? "subject";
    const T = depth === "far" ? L.far : depth === "mid" ? L.mid : depth === "near" ? L.near : L.sub;
    let k = (a.scale ?? 2) * m.scale;
    const since = t - t0;
    const entering = a.at !== undefined && since < 0.3;
    if (entering) k *= Math.max(0.05, ease("back", since / 0.3));
    const cx = Math.round((m.x ?? autoX) * PX.w + m.dx);
    const onFloor = a.y === undefined && m.y === undefined;
    const ay = Math.round((m.y ?? a.y ?? info.floor / PX.h) * PX.h + m.dy);
    if (onFloor && depth === "subject" && a.shadow !== false) T.p.pool(cx, info.floor, Math.max(8, (sp.w * (a.scale ?? 2)) / 2), 3, mix(C.ink, C.floor0, 0.25), 0.9 - Math.min(0.5, Math.max(0, info.floor - ay) / 60));
    drawSprite(T, sp, m.frame, C, { cx, ay, k, rotate: m.rotate, flip: m.flip ?? a.flip, opacity: m.opacity, glowAll: a.glow });
    if (a.crown) drawCrown(T, cx, Math.round(ay - sp.h * k - 3 + Math.sin(t * 3) * 1.5), C);
    if (a.at !== undefined && since < 0.45) burst(T, cx, ay - (sp.h * k) / 2, 1, C, since);
    if (a.label) labels.push({ box: { x: cx - (sp.w * k) / 2, y: ay - sp.h * k, w: sp.w * k, h: sp.h * k }, text: a.label, sign: false });
  });
  // agent effects: particles, bursts, lightning, screen effects
  const screen: Screen = pixel.fx?.length
    ? drawFx(pixel.fx, { C, t, seed, sceneSec, resolve, front: { p: fx, g: fxG }, back: L.mid, rays, fps })
    : emptyScreen();
  // dust motes drifting through the light
  if (pixel.dust !== false) {
    const mote = mix(C.paper, C.glow, 0.4);
    for (let i = 0; i < 26; i++) {
      const x = (random(`${seed}-mx${i}`) * (PX.w + 40) + t * (2 + (i % 4))) % (PX.w + 40) - 20;
      const y = (random(`${seed}-my${i}`) * 300 + 40 - t * (1.5 + (i % 3)) + 600) % 300 + 40;
      if (Math.sin(t * 1.7 + i) > -0.4) {
        fx.set(x, y, mote);
        if (i % 5 === 0) fx.set(x + 1, y, mote);
      }
    }
  }
  const all = [L.far.p, L.far.g, L.mid.p, L.mid.g, L.sub.p, L.sub.g, L.near.p, L.near.g, fx, fxG];
  if (screen.pixelate > 1) for (const P of all) pixelateBuf(P, screen.pixelate);
  if (screen.dissolve > 0) for (const P of all) dissolveBuf(P, screen.dissolve);
  if (screen.glitch > 0) for (const P of [L.mid.p, L.sub.p, fx, L.far.p]) glitchBuf(P, `${seed}-${Math.floor(t * fps)}`, screen.glitch);
  if (screen.chroma > 0) for (const P of [L.mid.p, L.sub.p, fx]) chromaBuf(P, screen.chroma);
  if (look.strict) {
    const pal = lookPalette(lookId).map((h: string) => rgb(h));
    for (const l of [L.far, L.mid, L.sub, L.near]) {
      l.p.quantize(pal);
      l.g.quantize(pal);
    }
    fx.quantize(pal);
    fxG.quantize(pal);
  }
  return { L, fx, fxG, rays, labels, look, screen };
}

/** Pixel crown floating over a fighter's head (gold with a dark outline, glowing). */
function drawCrown(T: Layer, cx: number, bottom: number, C: ReturnType<typeof rgbRoles>) {
  const gold = mix(C.glow, C.paper, 0.15);
  const x0 = cx - Math.floor((CROWN_ROWS[0].length * 2) / 2), y0 = bottom - CROWN_ROWS.length * 2;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) T.p.sprite(CROWN_ROWS, { x: C.ink }, x0 + dx, y0 + dy, 2);
  T.p.sprite(CROWN_ROWS, { x: gold }, x0, y0, 2);
  T.g.sprite(CROWN_ROWS, { x: gold }, x0, y0, 2);
}

/** Keep a tag (Silkscreen 24 px, about 22 px per character plus padding) inside x 90..990. */
const clampTag = (cx: number, text: string) => {
  const half = (text.length * 22 + 40) / 2;
  return Math.min(990 - half, Math.max(90 + half, cx));
};

const rgbHex = (c: [number, number, number]) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

export const PixelScene: React.FC<{ scene: Scene; index: number; spec: ResolvedSpec; durationInFrames: number; plan: PixelPlan | null }> = ({ scene, index, spec, durationInFrames, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pixel: PixelVisual = (scene.visual.type === "pixel" && scene.visual.pixel) || { set: plan?.set ?? "room" };
  const p: PixelPlan = plan ?? { kind: "pixel", set: pixel.set ?? "room", camera: "static", transition: "cut", props: (pixel.props ?? []).map((_: unknown, i: number) => ({ x: 0.2 + i * 0.15, enter: 0.4 + i * 0.3 })), panelAt: 0.6, checks: [] };
  const seed = `${spec.title}-${index}`;
  const sceneSec = durationInFrames / fps;
  const { L, fx, fxG, rays, labels, look, screen } = useMemo(() => drawPixelScene(spec, pixel, p, t, seed, sceneSec, fps), [spec, pixel, p, t, seed, sceneSec, fps]);
  const cam = cameraOffset(p.camera, t, sceneSec);
  const off = (k: keyof typeof PARALLAX) => ({ dx: Math.round(cam.x * PARALLAX[k]) + screen.shake.x, dy: Math.round(cam.y * PARALLAX[k]) + screen.shake.y });
  const glowOpacity = Math.min(1, look.light.glowOpacity * (1 + screen.bloom));
  const glowStyle = (blur: number): React.CSSProperties => ({ filter: `blur(${Math.round(blur * (1 + screen.bloom * 0.6))}px) brightness(${1.5 + screen.bloom * 0.6})`, mixBlendMode: "screen", opacity: glowOpacity });
  // push-in: the whole low-res scene grows in 2% steps (whole steps keep the pixel grid steady between them)
  const push = p.camera === "push-in" ? 1 + Math.round(Math.min(1, t / Math.max(0.1, sceneSec)) * 6) * 0.02 : 1;
  const ui = look.ui as UiColors;
  const sub = off("subject");
  return (
    <AbsoluteFill style={{ backgroundColor: look.roles.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: push !== 1 ? `scale(${push})` : undefined, transformOrigin: "50% 55%" }}>
      <PxCanvas data={L.far.p.data} {...off("far")} style={{ filter: "blur(4px)" }} />
      <PxCanvas data={L.far.g.data} {...off("far")} style={glowStyle(18)} />
      <PxCanvas data={L.mid.p.data} {...off("mid")} />
      {/* depth of field on the floor: a blurred copy of the mid layer fades in toward the bottom of the frame */}
      <PxCanvas data={L.mid.p.data} {...off("mid")} style={{ filter: "blur(7px)", maskImage: FLOOR_MASK, WebkitMaskImage: FLOOR_MASK }} />
      <PxCanvas data={L.mid.g.data} {...off("mid")} style={glowStyle(14)} />
      <PxCanvas data={L.sub.p.data} {...sub} />
      <PxCanvas data={L.sub.g.data} {...sub} style={glowStyle(16)} />
      <Rays rays={rays} color={look.light.rayColor} opacity={look.light.rayOpacity} dx={off("mid").dx} t={t} id={`ray-${index}`} />
      <PxCanvas data={fx.data} {...sub} />
      <PxCanvas data={fxG.data} {...sub} style={glowStyle(12)} />
      <PxCanvas data={L.near.p.data} {...off("near")} style={{ filter: "blur(12px)" }} />
      <PxCanvas data={L.near.g.data} {...off("near")} style={glowStyle(22)} />
      </AbsoluteFill>
      {screen.flash ? <AbsoluteFill style={{ background: screen.flash.color, opacity: Math.round(screen.flash.opacity * 4) / 4, mixBlendMode: "screen" }} /> : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 65% at 50% 45%, transparent 55%, rgba(0,0,0,${look.light.vignette}) 100%)` }} />
      {screen.crt > 0 ? <Crt k={screen.crt} t={t} /> : null}
      {look.scanlines ? <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 4px, transparent 4px 8px)", mixBlendMode: "multiply" }} /> : null}
      {labels.map((l, i) =>
        l.sign ? (
          <div key={i} style={{ position: "absolute", left: (l.box.x + sub.dx) * S, top: (l.box.y + sub.dy) * S, width: l.box.w * S, height: l.box.h * S, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TAG_FONT, fontSize: 26, color: look.roles.ink, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {l.text}
          </div>
        ) : (
          <Tag key={i} text={l.text} ui={ui} x={clampTag((l.box.x + l.box.w / 2 + sub.dx) * S, l.text)} y={(l.box.y + sub.dy) * S - 64} color={ui.name} />
        ),
      )}
      <SceneUi pixel={pixel} plan={p} ui={ui} fps={fps} t={t} sceneSec={sceneSec} />
    </AbsoluteFill>
  );
};

/** CRT: scanlines, a slow rolling bright bar, curved dark corners and a little flicker. */
const Crt: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const roll = ((t * 0.35) % 1.2) * 1920 - 200;
  const flicker = 0.92 + 0.08 * Math.sin(t * 47);
  return (
    <>
      <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, rgba(0,0,0,${0.18 + 0.2 * k}) 0 4px, transparent 4px 8px)`, mixBlendMode: "multiply", opacity: flicker }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent ${roll}px, rgba(255,255,255,${0.05 + 0.06 * k}) ${roll + 60}px, transparent ${roll + 160}px)`, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ borderRadius: 90, boxShadow: `inset 0 0 ${120 + 80 * k}px ${30 + 30 * k}px rgba(0,0,0,${0.55 + 0.3 * k}), 0 0 0 60px rgba(0,0,0,${0.6 + 0.3 * k})` }} />
    </>
  );
};

/** Animate a DOM panel with an element motion: offsets in low-res pixels (x4), x/y keys relative to 0.5 = in place. */
const Moving: React.FC<{ motion: unknown; t: number; resolve: (a: unknown) => number; sceneSec: number; children: React.ReactNode }> = ({ motion, t, resolve, sceneSec, children }) => {
  if (!motion) return <>{children}</>;
  const m = motionState(motion, t, { resolve, sceneSec });
  if (!m.visible) return null;
  const dx = (m.dx + (m.x !== undefined ? (m.x - 0.5) * PX.w : 0)) * S, dy = (m.dy + (m.y !== undefined ? (m.y - 0.5) * PX.h : 0)) * S;
  return <AbsoluteFill style={{ transform: `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${m.scale}) rotate(${m.rotate}deg)`, transformOrigin: "50% 30%", opacity: m.opacity }}>{children}</AbsoluteFill>;
};

const SceneUi: React.FC<{ pixel: PixelVisual; plan: PixelPlan; ui: UiColors; fps: number; t: number; sceneSec: number }> = ({ pixel, plan, ui, fps, t, sceneSec }) => {
  const b = pixel.banner;
  // panels sit under the banner (one or two lines) or take its place
  // versus scenes: the header strip of the fighters takes the top, the banner and the panels sit under it
  const shift = pixel.fighters ? 130 : 0;
  const top = (!b || b.big ? 440 : bannerBottom(b.text, Boolean(b.kicker)) + 40) + shift;
  const moments = (plan as PixelPlan & { moments?: Record<string, number> }).moments ?? {};
  const resolve = (at: unknown) => momentSeconds(at, moments, sceneSec, fps) as number;
  const mv = { t, resolve, sceneSec };
  return (
    <>
      {pixel.fighters ? <VersusHeader fighters={pixel.fighters} ui={ui} enterFrame={4} /> : null}
      {b ? <Moving motion={b.motion} {...mv}><Banner text={b.text} accent={b.accent} kicker={b.kicker} big={b.big} ui={ui} enterFrame={4} shift={shift} /></Moving> : null}
      {pixel.popup ? <Moving motion={pixel.popup.motion} {...mv}><Popup title={pixel.popup.title} text={pixel.popup.text} accent={pixel.popup.accent} ui={ui} enterFrame={Math.round(plan.panelAt * fps)} top={top} /></Moving> : null}
      {pixel.counter ? <Moving motion={pixel.counter.motion} {...mv}><Counter {...pixel.counter} ui={ui} enterFrame={Math.round(0.3 * fps)} top={top} /></Moving> : null}
      {pixel.ranking ? <Ranking {...pixel.ranking} times={plan.rows ?? []} ui={ui} top={top} /> : null}
      {pixel.verdict ? <Verdict {...pixel.verdict} times={plan.rows ?? []} ui={ui} top={top} /> : null}
      {pixel.round ? <RoundCard {...pixel.round} ui={ui} at={plan.round?.at ?? 0.2} until={plan.round?.until ?? 2} /> : null}
      {pixel.checklist ? <Moving motion={pixel.checklist.motion} {...mv}><Checklist title={pixel.checklist.title} items={pixel.checklist.items} checks={plan.checks} ui={ui} enterFrame={Math.round(0.5 * fps)} sceneStartFrame={0} top={top} /></Moving> : null}
    </>
  );
};

/** Dialog portrait: the character's head drawn at art scale 1 and shown x6 (or nothing when there is no character). */
export const Portrait: React.FC<{ spec: ResolvedSpec; character: PixelVisual }> = ({ spec, character }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blink = (frame / fps) % 3.3 < 0.12;
  const data = useMemo(() => {
    const look = PIXEL_LOOKS[pixelLookOf(spec) as keyof typeof PIXEL_LOOKS];
    const C = rgbRoles(look.roles);
    const L: Layer = { p: new Painter(), g: new Painter() };
    const { base, detail } = headBoxes(character, C, blink);
    for (const [x, y, w, h] of base) L.p.rect(x - 1 + 2, y - 1 + 3, w + 2, h + 2, C.ink);
    for (const [x, y, w, h, c] of [...base, ...detail]) L.p.rect(x + 2, y + 3, w, h, c);
    L.p.rect(5, 22, 20, 6, character.shirt ? rgb(character.shirt) : C.wall0);
    return L.p.data;
  }, [spec, character, blink]);
  const k = 6;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <PortraitCanvas data={data} k={k} />
    </div>
  );
};

const PortraitCanvas: React.FC<{ data: Uint8ClampedArray; k: number }> = ({ data, k }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(data), BW, BH), 0, 0);
  }, [data]);
  return <canvas ref={ref} width={BW} height={BH} style={{ position: "absolute", left: -PX.margin * k - 4, top: -MY * k + 2, width: BW * k, height: BH * k, imageRendering: "pixelated" }} />;
};
