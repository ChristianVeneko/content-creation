// Agent-drawn vector art (lib/drawing.mjs): renders a drawing's part tree as SVG with keyframed + preset motion,
// stroke draw-on and a per-look skin (watercolor wash, marker wobble, paper cutouts, halftone, comic outlines...).
// Used by the illustrated `drawing` element (src/illustrated/elements.tsx) and the classic templates' hero slot.
// Frame-pure: everything is a function of `t` (seconds into the scene).
import React from "react";
import { drawingLayout, parseViewBox, partState } from "../../lib/drawing.mjs";
import { momentSec } from "../../lib/motion.mjs";
import { seeded } from "../util";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrawingSpec = { id?: string; viewBox?: string; origin?: [number, number]; parts: any[]; motion?: any[]; keys?: any[] };
export type DrawingColors = Record<"accent" | "accent2" | "accent3" | "good" | "bad" | "muted" | "text" | "bg" | "surface" | "line" | "paper" | "ink", string>;

/** How a look restyles a drawing. Every field is optional: the default is clean vector art. */
export type DrawingSkin = {
  /** Outline added around filled shapes (pop comic, ukiyo-e key block). */
  outline?: { color: string; width: number };
  /** Stroke width multiplier. */
  stroke?: number;
  /** Default stroke color of unfilled shapes (ink). */
  ink?: string;
  /** Fill opacity (watercolor glaze, chalk). */
  fillOpacity?: number;
  /** Texture filter over the whole drawing. */
  filter?: "wash" | "marker" | "none";
  /** Halftone dots over the fills, in this color. */
  halftone?: string;
  /** Every top-level part is a paper cutout with its own shadow and a tiny tilt. */
  cutout?: boolean;
  /** Stop-motion: motion holds poses at this frame rate. */
  stepFps?: number;
  /** CSS drop-shadow of the whole drawing. */
  shadow?: string;
  /** Fill blend mode (risograph inks multiply). */
  blend?: React.CSSProperties["mixBlendMode"];
  /** Text fonts: display, body, mono, hand. */
  fonts: { display: string; body: string; mono: string; hand: string; weight: number };
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Resolve a drawing color: a role of `colors` or a hex. */
export const drawColor = (colors: DrawingColors, c: unknown, fallback: string): string => {
  if (typeof c !== "string" || !c) return fallback;
  if (c.startsWith("#")) return c;
  return (colors as Record<string, string>)[c] ?? fallback;
};

type Paint = string | { gradient: string[]; angle?: number; radial?: boolean } | undefined;

/** The drawing as an <svg> of the given pixel size (viewBox fitted with "meet"). */
export const DrawingSvg: React.FC<{
  drawing: DrawingSpec;
  colors: DrawingColors;
  skin: DrawingSkin;
  /** Seconds into the scene. */
  t: number;
  /** Seconds the drawing enters (default start of pop-in, draw-on, slide-in...). */
  enter: number;
  moments?: Record<string, number>;
  width: number;
  height: number;
  /** Unique prefix for gradient / filter ids. */
  uid: string;
  seed?: number;
  style?: React.CSSProperties;
}> = ({ drawing, colors, skin, t: t0, enter, moments, width, height, uid, seed = 1, style }) => {
  const vb = parseViewBox(drawing.viewBox ?? "0 0 400 400");
  const layout = React.useMemo(() => drawingLayout(drawing.parts), [drawing.parts]);
  const t = skin.stepFps ? Math.floor(t0 * skin.stepFps) / skin.stepFps : t0;
  const unit = Math.max(vb.w, vb.h) / 400;
  const ctx = { sec: (m: unknown) => momentSec(m, moments), enter, seed, unit };
  const dims = { width: vb.w, height: vb.h };
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, "");
  // the stroked parts in drawing order (a drawing-level draw-on without `parts` draws them one after another)
  const drawn = drawing.parts.filter((p) => p.shape !== "group" && p.shape !== "text" && (p.stroke !== undefined || p.fill === "none" || p.shape === "line")).map((p) => p.id as string);
  const strokeMul = skin.stroke ?? 1;
  const defs: React.ReactNode[] = [];

  const paint = (p: Paint, key: string, fallback: string): string => {
    if (p === undefined) return fallback;
    if (typeof p === "string") return p === "none" ? "none" : drawColor(colors, p, fallback);
    const gid = `${id}-g-${key}`;
    const stops = p.gradient.map((c, i) => <stop key={i} offset={`${(i / Math.max(1, p.gradient.length - 1)) * 100}%`} stopColor={drawColor(colors, c, colors.accent)} />);
    if (p.radial) defs.push(<radialGradient key={gid} id={gid} cx="50%" cy="45%" r="60%">{stops}</radialGradient>);
    else {
      const a = (((p.angle ?? 90) % 360) * Math.PI) / 180;
      const dx = Math.cos(a) / 2;
      const dy = Math.sin(a) / 2;
      defs.push(
        <linearGradient key={gid} id={gid} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>
          {stops}
        </linearGradient>,
      );
    }
    return `url(#${gid})`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shape = (p: any, extra: Record<string, unknown>): React.ReactNode => {
    switch (p.shape) {
      case "path":
        return <path d={p.d} {...extra} />;
      case "rect":
        return <rect x={p.x ?? 0} y={p.y ?? 0} width={p.w} height={p.h} rx={p.r} {...extra} />;
      case "circle":
        return <circle cx={p.cx ?? 0} cy={p.cy ?? 0} r={p.r} {...extra} />;
      case "ellipse":
        return <ellipse cx={p.cx ?? 0} cy={p.cy ?? 0} rx={p.rx} ry={p.ry} {...extra} />;
      case "polygon":
        return <polygon points={(p.points as number[][]).map((q) => q.join(",")).join(" ")} {...extra} />;
      case "line":
        return p.points ? <polyline points={(p.points as number[][]).map((q) => q.join(",")).join(" ")} {...extra} /> : <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} {...extra} />;
      default:
        return null;
    }
  };

  const renderNode = (pid: string, depth: number): React.ReactNode => {
    const node = layout.get(pid);
    if (!node || depth > 60) return null;
    const p = node.part;
    const st = partState(p, t, ctx, dims, drawing.motion ?? [], pid, { drawn, order: drawn.indexOf(pid) });
    if (!st.visible) return null;
    const [ox, oy] = node.origin as [number, number];
    const [px, py] = (p.pos as [number, number] | undefined) ?? [0, 0];
    const ss = Array.isArray(p.scale) ? p.scale : [p.scale ?? 1, p.scale ?? 1];
    // paper cutouts: every top-level scrap sits with a tiny hand-placed tilt
    const tilt = skin.cutout && depth === 0 ? (seeded(seed * 97 + node.order * 13) - 0.5) * 3 : 0;
    const rot = st.rot + (p.rot ?? 0) + tilt;
    const sx = st.sx * ss[0];
    const sy = st.sy * ss[1];
    const moved = st.x + px !== 0 || st.y + py !== 0 || rot !== 0 || sx !== 1 || sy !== 1;
    const transform = moved ? `translate(${st.x + px} ${st.y + py}) translate(${ox} ${oy}) rotate(${rot}) scale(${sx} ${sy}) translate(${-ox} ${-oy})` : undefined;
    const draw = st.draw;
    let body: React.ReactNode = null;
    if (p.shape === "text") {
      const fill = paint(p.fill as Paint, pid, colors.text);
      const fam = skin.fonts[(p.font as keyof DrawingSkin["fonts"]) ?? "display"] ?? skin.fonts.display;
      body = (
        <text
          x={p.x ?? 0}
          y={p.y ?? 0}
          fontSize={p.size ?? 40}
          fontFamily={String(fam)}
          fontWeight={p.weight ?? skin.fonts.weight}
          textAnchor={p.anchor ?? "middle"}
          fill={fill}
          fillOpacity={draw === null ? undefined : clamp01(draw * 1.4)}
          stroke={skin.outline && fill !== "none" ? skin.outline.color : p.stroke ? paint(p.stroke as Paint, `${pid}-s`, colors.text) : undefined}
          strokeWidth={skin.outline ? skin.outline.width * 0.6 : (p.width ?? 0) * strokeMul}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {p.text}
        </text>
      );
    } else if (p.shape !== "group") {
      const fill = paint(p.fill as Paint, pid, p.shape === "line" ? "none" : colors.accent);
      const filled = fill !== "none" && p.shape !== "line";
      let stroke = p.stroke !== undefined ? paint(p.stroke as Paint, `${pid}-s`, colors.text) : !filled ? (skin.ink ?? colors.text) : "none";
      let width = (p.width ?? (stroke === "none" ? 0 : 4 * unit)) * strokeMul;
      if (skin.outline && filled && stroke === "none") {
        stroke = skin.outline.color;
        width = skin.outline.width * unit;
      }
      const drawAttrs: Record<string, unknown> =
        draw === null ? {} : { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - draw };
      const fillOp = (skin.fillOpacity ?? 1) * (draw === null ? 1 : clamp01((draw - 0.55) / 0.45));
      body = (
        <>
          {shape(p, {
            fill: filled ? fill : "none",
            fillOpacity: filled ? fillOp : undefined,
            stroke: stroke === "none" ? undefined : stroke,
            strokeWidth: stroke === "none" ? undefined : width,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: skin.blend && filled ? { mixBlendMode: skin.blend } : undefined,
            ...drawAttrs,
          })}
          {skin.halftone && filled && fillOp > 0 ? shape(p, { fill: `url(#${id}-ht)`, fillOpacity: fillOp * 0.55 }) : null}
        </>
      );
    }
    const cut = skin.cutout && depth === 0 && p.shape !== "text" ? `url(#${id}-cut)` : undefined;
    const op = st.opacity * (p.opacity ?? 1);
    return (
      <g key={pid} transform={transform} opacity={op < 1 ? op : undefined} filter={cut}>
        {body}
        {(node.children as string[]).map((c) => renderNode(c, depth + 1))}
      </g>
    );
  };

  // the drawing itself: its own keys / motion (pop-in, float...) around its origin (default: the viewBox center)
  const root = partState({ keys: drawing.keys, motion: drawing.motion }, t, ctx, dims, [], null, { root: true });
  const [rx, ry] = drawing.origin ?? [vb.x + vb.w / 2, vb.y + vb.h / 2];
  const rootT = `translate(${root.x} ${root.y}) translate(${rx} ${ry}) rotate(${root.rot}) scale(${root.sx} ${root.sy}) translate(${-rx} ${-ry})`;
  const kids = (layout as unknown as { roots: string[] }).roots.map((r) => renderNode(r, 0));
  const boil = skin.filter === "marker" ? Math.floor(t0 * 6) % 3 : 0;
  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: "visible", filter: skin.shadow, ...style }}
    >
      <defs>
        {defs}
        {skin.halftone ? (
          <pattern id={`${id}-ht`} width={9 * unit} height={9 * unit} patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <circle cx={4.5 * unit} cy={4.5 * unit} r={1.9 * unit} fill={skin.halftone} />
          </pattern>
        ) : null}
        {skin.filter === "wash" ? (
          // watercolor: the paint bleeds (displaced edges) like the look's washUri panels
          <filter id={`${id}-fx`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency={0.03 / unit} numOctaves={3} seed={seed % 97} />
            <feDisplacementMap in="SourceGraphic" scale={9 * unit} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ) : null}
        {skin.filter === "marker" ? (
          // whiteboard: marker wobble, re-seeded ~6 times a second like the look's RoughShape boil
          <filter id={`${id}-fx`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency={0.04 / unit} numOctaves={2} seed={(seed % 50) + boil * 7} />
            <feDisplacementMap in="SourceGraphic" scale={3.2 * unit} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ) : null}
        {skin.cutout ? (
          <filter id={`${id}-cut`} x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx={3 * unit} dy={6 * unit} stdDeviation={3.5 * unit} floodColor="#28180A" floodOpacity={0.38} />
          </filter>
        ) : null}
      </defs>
      {root.visible ? (
        <g transform={rootT} opacity={root.opacity < 1 ? root.opacity : undefined} filter={skin.filter && skin.filter !== "none" ? `url(#${id}-fx)` : undefined}>
          {kids}
        </g>
      ) : null}
    </svg>
  );
};

/** Box of a part in the drawing's pixel box (rest pose; "meet" fit), for fx targets like "drawing/part". */
export const partBoxInPx = (drawing: DrawingSpec, partId: string, w: number, h: number) => {
  const vb = parseViewBox(drawing.viewBox ?? "0 0 400 400");
  const node = drawingLayout(drawing.parts).get(partId);
  if (!node?.box) return null;
  const s = Math.min(w / vb.w, h / vb.h);
  const ox = (w - vb.w * s) / 2;
  const oy = (h - vb.h * s) / 2;
  const b = node.box as { x: number; y: number; w: number; h: number };
  return { x: ox + (b.x - vb.x) * s, y: oy + (b.y - vb.y) * s, w: b.w * s, h: b.h * s };
};

/** Box of the drawn content (union of the top-level parts, rest pose) in the drawing's pixel box, for fx targets. */
export const drawingBoxInPx = (drawing: DrawingSpec, w: number, h: number) => {
  const vb = parseViewBox(drawing.viewBox ?? "0 0 400 400");
  const lay = drawingLayout(drawing.parts);
  let b: { x: number; y: number; w: number; h: number } | null = null;
  for (const id of (lay as unknown as { roots: string[] }).roots) {
    const nb = lay.get(id)?.box as { x: number; y: number; w: number; h: number } | null;
    if (!nb) continue;
    b = !b ? { ...nb } : { x: Math.min(b.x, nb.x), y: Math.min(b.y, nb.y), w: Math.max(b.x + b.w, nb.x + nb.w) - Math.min(b.x, nb.x), h: Math.max(b.y + b.h, nb.y + nb.h) - Math.min(b.y, nb.y) };
  }
  const s = Math.min(w / vb.w, h / vb.h);
  const ox = (w - vb.w * s) / 2;
  const oy = (h - vb.h * s) / 2;
  const c = b ?? vb;
  return { x: ox + (c.x - vb.x) * s, y: oy + (c.y - vb.y) * s, w: c.w * s, h: c.h * s };
};
