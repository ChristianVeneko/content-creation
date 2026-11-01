// Generative pixel drawing: agent-authored sprites (any frame, scale, rotation, dithered opacity), transformed
// drawing of props / characters, and custom sets built from procedural layers (lib/pixel-gen.mjs) at parallax depths.
// Everything writes whole pixels into the low-res Painter buffers; all randomness is seeded.
import { PX, bayer } from "../../lib/pixel.mjs";
import { LAYER_DEFAULTS, forestTrees, h01, motionState, ridgeProfile, skylineBlocks } from "../../lib/pixel-gen.mjs";
import { BH, BW, MY, Painter, mix, rgb, type RGB } from "./painter";
import type { Layer, Layers, Roles, SetCtx, SetInfo } from "./sets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;
export type ParsedSprite = { id: string; w: number; h: number; frames: number[][][]; palette: string[]; glow: Set<number>; fps: number; anchor: string };
export type MotionState = ReturnType<typeof motionState>;
export type Resolve = (at: unknown) => number;

const W = PX.w;
const H = PX.h;
const X0 = -PX.margin - 4;
const X1 = W + PX.margin + 4;

/** A color reference (role name or hex) as RGB. */
export const colorOf = (ref: string | undefined, C: Roles, fallback: RGB): RGB => (!ref ? fallback : ref.startsWith("#") ? rgb(ref) : (C[ref] ?? fallback));

/** Set a pixel only where the dithered opacity wins (keeps the image pixel-crisp). */
const setOp = (P: Painter, x: number, y: number, c: RGB, op: number) => {
  if (op >= 1 || op > bayer(Math.round(x), Math.round(y))) P.set(x, y, c);
};

/**
 * Draw one sprite frame. (cx, ay) is the anchor point in view pixels (bottom-center by default); `k` is the size of
 * one sprite pixel. Rotation (degrees) turns around the sprite center with nearest-neighbour sampling.
 */
export function drawSprite(L: Layer, sp: ParsedSprite, frame: number, C: Roles, o: { cx: number; ay: number; k: number; rotate?: number; flip?: boolean; opacity?: number; glowAll?: boolean; anchor?: string }) {
  const rows = sp.frames[Math.min(sp.frames.length - 1, Math.max(0, frame))];
  const cols = sp.palette.map((r) => colorOf(r, C, C.ink));
  const k = Math.max(0.25, o.k);
  const Wd = sp.w * k, Hd = sp.h * k;
  const anchor = o.anchor ?? sp.anchor;
  const ox = o.cx - Wd / 2;
  const oy = anchor === "center" ? o.ay - Hd / 2 : anchor === "top" ? o.ay : o.ay - Hd;
  const op = o.opacity ?? 1;
  const rot = (((o.rotate ?? 0) % 360) + 360) % 360;
  const put = (x: number, y: number, idx: number) => {
    if (op < 1 && op <= bayer(x, y)) return;
    L.p.set(x, y, cols[idx]);
    if (o.glowAll || sp.glow.has(idx)) L.g.set(x, y, cols[idx]);
  };
  if (rot < 0.5 || rot > 359.5) {
    for (let ry = 0; ry < sp.h; ry++) {
      const y0 = Math.round(oy + ry * k), y1 = Math.round(oy + (ry + 1) * k);
      for (let rx = 0; rx < sp.w; rx++) {
        const idx = rows[ry]?.[o.flip ? sp.w - 1 - rx : rx] ?? -1;
        if (idx < 0) continue;
        const x0 = Math.round(ox + rx * k), x1 = Math.round(ox + (rx + 1) * k);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x, y, idx);
      }
    }
    return;
  }
  const a = (rot * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  const pcx = ox + Wd / 2, pcy = oy + Hd / 2;
  const R = Math.ceil(Math.hypot(Wd, Hd) / 2) + 1;
  for (let y = Math.floor(pcy - R); y <= pcy + R; y++)
    for (let x = Math.floor(pcx - R); x <= pcx + R; x++) {
      const dx = x + 0.5 - pcx, dy = y + 0.5 - pcy;
      const u = (dx * cs + dy * sn + Wd / 2) / k, v = (-dx * sn + dy * cs + Hd / 2) / k;
      const sx = Math.floor(u), sy = Math.floor(v);
      if (sx < 0 || sy < 0 || sx >= sp.w || sy >= sp.h) continue;
      const idx = rows[sy]?.[o.flip ? sp.w - 1 - sx : sx] ?? -1;
      if (idx >= 0) put(x, y, idx);
    }
}

// one scratch layer reused for transformed drawing (props, characters)
let scratch: Layer | null = null;
const isIdentity = (m: { scale: number; rotate: number; opacity: number }) => Math.abs(m.scale - 1) < 0.01 && Math.abs(m.rotate % 360) < 0.5 && m.opacity >= 0.999;

/**
 * Run `draw` (which paints at its normal place) and copy the result into `target` scaled / rotated around the pivot
 * (px, py) with dithered opacity and an extra offset. Identity transforms draw directly.
 */
export function drawTransformed(target: Layer, m: { dx: number; dy: number; scale: number; rotate: number; opacity: number }, px: number, py: number, draw: (L: Layer) => void) {
  if (isIdentity(m) && !m.dx && !m.dy) return draw(target);
  if (!scratch) scratch = { p: new Painter(), g: new Painter() };
  const S = scratch;
  draw(S);
  // bounding box of what was drawn
  let minX = BW, minY = BH, maxX = -1, maxY = -1;
  const d = S.p.data, dg = S.g.data;
  for (let by = 0; by < BH; by++)
    for (let bx = 0; bx < BW; bx++) {
      const i = (by * BW + bx) * 4 + 3;
      if (d[i] || dg[i]) {
        if (bx < minX) minX = bx;
        if (bx > maxX) maxX = bx;
        if (by < minY) minY = by;
        if (by > maxY) maxY = by;
      }
    }
  if (maxX < 0) return;
  const s = Math.max(0.01, m.scale);
  const a = ((m.rotate % 360) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
  const bpx = px + PX.margin, bpy = py + MY;
  const corners = [[minX, minY], [maxX + 1, minY], [minX, maxY + 1], [maxX + 1, maxY + 1]].map(([x, y]) => {
    const rx = (x - bpx) * s, ry = (y - bpy) * s;
    return [rx * cs - ry * sn + bpx + m.dx, rx * sn + ry * cs + bpy + m.dy];
  });
  const tx0 = Math.floor(Math.min(...corners.map((c) => c[0]))), tx1 = Math.ceil(Math.max(...corners.map((c) => c[0])));
  const ty0 = Math.floor(Math.min(...corners.map((c) => c[1]))), ty1 = Math.ceil(Math.max(...corners.map((c) => c[1])));
  const copy = (src: Uint8ClampedArray, dst: Painter) => {
    for (let y = Math.max(0, ty0); y <= Math.min(BH - 1, ty1); y++)
      for (let x = Math.max(0, tx0); x <= Math.min(BW - 1, tx1); x++) {
        const dx = x + 0.5 - bpx - m.dx, dy = y + 0.5 - bpy - m.dy;
        const sx = Math.floor((dx * cs + dy * sn) / s + bpx), sy = Math.floor((-dx * sn + dy * cs) / s + bpy);
        if (sx < minX || sy < minY || sx > maxX || sy > maxY) continue;
        const i = (sy * BW + sx) * 4;
        if (!src[i + 3]) continue;
        if (m.opacity < 1 && m.opacity <= bayer(x, y)) continue;
        dst.set(x - PX.margin, y - MY, [src[i], src[i + 1], src[i + 2]]);
      }
  };
  copy(d, target.p);
  copy(dg, target.g);
  // clear the scratch region for the next use
  for (let by = minY; by <= maxY; by++) {
    d.fill(0, (by * BW + minX) * 4, (by * BW + maxX + 1) * 4);
    dg.fill(0, (by * BW + minX) * 4, (by * BW + maxX + 1) * 4);
  }
}

// ---------------- custom sets ----------------

export type GenCtx = SetCtx & { lib: Map<string, ParsedSprite>; resolve: Resolve; sceneSec: number };

const layerOf = (L: Layers, depth: string): Layer => (depth === "far" ? L.far : depth === "near" ? L.near : depth === "subject" ? L.sub : L.mid);
const lit = (L: Layer, x: number, y: number, w: number, h: number, c: RGB) => {
  L.p.rect(x, y, w, h, c);
  L.g.rect(x, y, w, h, c);
};

function drawSky(L: Layers, c: GenCtx, sky: Any | undefined, info: SetInfo) {
  const { C, t } = c;
  const horizon = Math.round((sky?.horizon ?? 0.62) * H);
  const stops = (sky?.gradient ?? ["sky0", "sky1", "sky2", "sky3"]).map((r: string) => colorOf(r, C, C.sky0));
  if (stops.length === 1) stops.push(stops[0]);
  L.far.p.vgrad(X0 - 4, -MY, X1 - X0 + 8, horizon + MY, stops);
  L.far.p.rect(X0 - 4, horizon, X1 - X0 + 8, H + MY - horizon, stops[stops.length - 1]);
  const nStars = sky?.stars === true ? 90 : typeof sky?.stars === "number" ? sky.stars : 0;
  for (let i = 0; i < nStars; i++) {
    const x = X0 + Math.floor(h01(c.seed, `st${i}`) * (X1 - X0));
    const y = Math.floor(h01(c.seed, `sy${i}`) * horizon * 0.85) - 6;
    const tw = Math.sin(t * (1.5 + h01(c.seed, `sp${i}`) * 3) + i) ;
    const col = tw > 0.7 ? C.paper : mix(stops[0], C.paper, 0.5);
    L.far.p.set(x, y, col);
    if (i % 7 === 0 && tw > 0.3) {
      // a few big sparkles with a cross
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.far.p.set(x + dx, y + dy, mix(col, stops[0], 0.4));
      L.far.g.set(x, y, C.paper);
    }
  }
  if (sky?.aurora) {
    const ac = typeof sky.aurora === "string" ? colorOf(sky.aurora, C, C.glow2) : C.glow2;
    for (let band = 0; band < 3; band++)
      for (let x = X0; x < X1; x++) {
        const y0 = 40 + band * 26 + Math.sin(x * 0.035 + t * 0.7 + band * 2) * 14 + Math.sin(x * 0.011 - t * 0.3) * 10;
        const len = 26 + Math.sin(x * 0.07 + band + t) * 8;
        for (let k = 0; k < len; k++) {
          const r = (1 - k / len) * (0.55 - band * 0.12) * (0.6 + 0.4 * Math.sin(x * 0.05 + t * 1.3 + band));
          if (r > bayer(x, Math.round(y0 + k))) {
            L.far.p.set(x, y0 + k, mix(ac, stops[Math.min(stops.length - 1, 1)], k / len));
            if (k < 4) L.far.g.set(x, y0 + k, ac);
          }
        }
      }
  }
  for (const body of ["sun", "moon"] as const) {
    const b = sky?.[body];
    if (!b) continue;
    const bx = Math.round((b.x ?? (body === "sun" ? 0.5 : 0.75)) * W);
    const by = Math.round((b.y ?? (body === "sun" ? 0.42 : 0.14)) * H);
    const br = Math.round((b.r ?? (body === "sun" ? 0.13 : 0.05)) * W);
    if (body === "sun") {
      L.far.p.pool(bx, by, br * 2.6, br * 2.6, mix(C.glow, stops[stops.length - 1], 0.5), 0.6);
      const top = mix(C.glow, C.paper, 0.4), bot = C.accent;
      for (let y = by - br; y <= by + br; y++) {
        // retro sun: bands cut out of the lower half, growing toward the bottom
        const rel = (y - (by - br)) / (2 * br);
        if (rel > 0.5 && Math.floor((y - by) / 3) % 2 === 0 && (y - by) % 3 < Math.min(2, Math.floor((rel - 0.5) * 6) + 1)) continue;
        const half = Math.sqrt(Math.max(0, br * br - (y - by) ** 2));
        const col = mix(top, bot, Math.max(0, rel));
        for (let x = Math.round(bx - half); x <= Math.round(bx + half); x++) {
          L.far.p.set(x, y, rel > bayer(x, y) * 0.9 + 0.05 ? col : top);
          L.far.g.set(x, y, col);
        }
      }
      info.rays.push({ x: bx, y: by, angle: 90, spread: 70, len: 300 });
    } else {
      L.far.p.pool(bx, by, br * 3, br * 3, mix(stops[0], C.paper, 0.25), 0.5);
      L.far.p.disc(bx, by, br, C.paper);
      L.far.g.disc(bx, by, br, C.paper);
      L.far.p.disc(bx - Math.round(br * 0.3), by - Math.round(br * 0.2), Math.max(1, Math.round(br * 0.25)), mix(C.paper, stops[0], 0.2));
      L.far.p.disc(bx + Math.round(br * 0.35), by + Math.round(br * 0.3), Math.max(1, Math.round(br * 0.18)), mix(C.paper, stops[0], 0.2));
      info.rays.push({ x: bx, y: by, angle: 100, spread: 50, len: 260 });
    }
  }
}

/** Draw a custom set: sky then each layer in order. Returns floor, surfaces and light rays like a preset set. */
export function drawCustomSet(L: Layers, c: GenCtx, set: Any): SetInfo {
  const { C, t } = c;
  const ground = (set.layers ?? []).find((l: Any) => l.type === "ground" || l.type === "grid" || l.type === "tiles");
  const floor = Math.round((set.floor ?? ground?.y ?? 0.59) * H);
  const info: SetInfo = { floor, surfaces: [], rays: [] };
  drawSky(L, c, set.sky, info);
  (set.layers ?? []).forEach((l: Any, i: number) => {
    const def = LAYER_DEFAULTS[l.type as keyof typeof LAYER_DEFAULTS];
    const depth = l.depth ?? def.depth;
    const T = layerOf(L, depth);
    const seed = `${l.seed ?? c.seed}-${i}`;
    const base = Math.round((l.y ?? def.y) * H);
    const hgt = Math.round((l.height ?? def.height) * H);
    const near = depth === "near";
    const shade = (col: RGB) => (near ? mix(col, C.ink, 0.55) : col);
    const m = l.motion ? motionState(l.motion, t, { resolve: c.resolve, sceneSec: c.sceneSec, seed }) : null;
    if (m && !m.visible) return;
    const mdx = m?.dx ?? 0, mdy = m?.dy ?? 0;
    switch (l.type) {
      case "mountains": {
        const col = shade(colorOf(l.color, C, C.far0));
        const cap = colorOf(l.color2, C, C.paper);
        const prof = ridgeProfile("mountains", seed, X1 - X0, hgt);
        const maxH = Math.max(...prof);
        for (let k = 0; k < prof.length; k++) {
          const x = X0 + k, top = base - prof[k];
          const lightSide = (prof[k + 1] ?? prof[k]) < prof[k];
          for (let y = top; y < base + 2; y++) {
            const fromTop = y - top;
            let cc = lightSide && fromTop < prof[k] * 0.6 ? mix(col, cap, 0.18) : col;
            if (prof[k] > maxH * 0.72 && fromTop < (prof[k] - maxH * 0.72) * 1.4 && (fromTop < 2 || 0.6 > bayer(x, y))) cc = cap;
            // atmospheric haze toward the base
            if ((y - top) / Math.max(1, prof[k]) > 0.65 && 0.35 > bayer(x, y)) cc = mix(cc, C.sky3, 0.35);
            T.p.set(x, y, cc);
          }
        }
        break;
      }
      case "hills":
      case "dunes": {
        const col = shade(colorOf(l.color, C, l.type === "hills" ? C.leaf0 : C.wood2));
        const hi = shade(colorOf(l.color2, C, l.type === "hills" ? C.leaf1 : mix(C.wood2, C.paper, 0.3)));
        const prof = ridgeProfile(l.type, seed, X1 - X0, hgt);
        for (let k = 0; k < prof.length; k++) {
          const x = X0 + k, top = base - prof[k];
          const slope = (prof[k + 1] ?? prof[k]) - prof[k];
          T.p.rect(x, top, 1, H + MY - top, col);
          T.p.rect(x, top, 1, 2, hi);
          if (l.type === "dunes" && slope < 0) for (let y = top + 2; y < top + 14; y++) if (0.5 > bayer(x, y)) T.p.set(x, y, mix(col, C.ink, 0.3));
          if (l.type === "hills" && h01(seed, `tuft${k}`) > 0.86) T.p.rect(x, top - 1, 1, 1, hi);
        }
        break;
      }
      case "waves": {
        const col = shade(colorOf(l.color, C, mix(C.sky1, C.glow2, 0.25)));
        const crest = colorOf(l.color2, C, C.paper);
        const deep = mix(col, C.ink, 0.6);
        const sp = l.speed ?? 1;
        const bottom = Math.min(H + MY, base + (l.height ? hgt : H));
        const ph = h01(seed, "ph") * 6;
        for (let x = X0; x < X1; x++) {
          const surf = Math.round(base + Math.sin(x * 0.08 + t * 1.6 * sp + ph) * 2 + Math.sin(x * 0.031 - t * 0.9 * sp) * 1.5);
          T.p.vgrad(x, surf, 1, bottom - surf, [col, deep]);
          T.p.set(x, surf, crest);
          if (Math.sin(x * 0.2 + t * 3 * sp) > 0.85) T.g.set(x, surf, crest);
        }
        // shimmer dashes drifting on the water
        const n = Math.round(30 * (l.density ?? 0.6));
        for (let k = 0; k < n; k++) {
          const yy = base + 4 + Math.floor(h01(seed, `wy${k}`) * Math.max(4, bottom - base - 8));
          const xx = X0 + ((((h01(seed, `wx${k}`) * (X1 - X0) + t * 6 * sp * (k % 2 ? 1 : -1)) % (X1 - X0)) + (X1 - X0)) % (X1 - X0));
          const len = 3 + Math.floor(h01(seed, `wl${k}`) * 6);
          if (Math.sin(t * 2 + k) > -0.3) T.p.rect(xx, yy, len, 1, mix(col, crest, 0.5));
        }
        break;
      }
      case "skyline": {
        const col = shade(colorOf(l.color, C, C.far1));
        const win = colorOf(l.color2, C, C.glow);
        const variant = l.variant ?? "city";
        const blocks = skylineBlocks(seed, X0, X1, Math.max(20, hgt), variant);
        const density = l.lit ?? 0.35;
        blocks.forEach((b, k) => {
          const top = base - b.h;
          if (variant === "ruins") {
            for (let x = b.x; x < b.x + b.w; x++) {
              const bite = Math.floor(h01(seed, `rb${k}-${x}`) * (b.h * 0.25));
              T.p.rect(x, top + bite, 1, b.h - bite, col);
            }
          } else T.p.rect(b.x, top, b.w, b.h, col);
          if (variant === "domes" && b.roof < 2) T.p.disc(b.x + b.w / 2, top, Math.floor(b.w / 2), col);
          if (b.roof === 3 && variant !== "ruins") T.p.rect(b.x + 2, top - 3, b.w - 4, 3, col);
          if (b.antenna) {
            T.p.rect(b.x + Math.floor(b.w / 2), top - 10, 1, 10, col);
            if (Math.floor(t * 1.5 + k) % 2 === 0) lit(T, b.x + Math.floor(b.w / 2), top - 11, 1, 1, C.accent);
          }
          for (let wy = top + 4; wy < base - 3; wy += 5)
            for (let wx = b.x + 2; wx < b.x + b.w - 2; wx += 4) {
              const r = h01(seed, `w${k}-${wx}-${wy}`);
              const on = r < density && !(r < density * 0.08 && Math.sin(t * 0.8 + wx) > 0.5);
              if (on) lit(T, wx, wy, 2, 2, r < density * 0.2 ? C.glow2 : win);
            }
        });
        break;
      }
      case "forest": {
        const col = shade(colorOf(l.color, C, C.leaf0));
        const hi = shade(colorOf(l.color2, C, C.leaf1));
        const trunk = shade(mix(C.wood0, C.ink, 0.2));
        const variant = l.variant ?? "pine";
        const trees = forestTrees(seed, X0, X1, Math.max(16, hgt), l.density ?? 0.6);
        trees.forEach((tr, k) => {
          const sway = Math.round(Math.sin(t * 1.1 + tr.k * 9) * (near ? 2 : 1));
          const x = tr.x, top = base - tr.h;
          if (variant === "pine") {
            T.p.rect(x - 1, base - 6, 2, 6, trunk);
            for (let y = top; y < base - 4; y++) {
              const rel = (y - top) / (tr.h - 4);
              const tier = (rel * 3) % 1;
              const half = Math.round((tr.w / 2) * (0.25 + 0.75 * rel) * (0.55 + 0.45 * tier));
              const off = Math.round(sway * (1 - rel));
              T.p.rect(x - half + off, y, half * 2 + 1, 1, col);
              T.p.rect(x - half + off, y, Math.max(1, Math.round(half * 0.5)), 1, hi);
            }
          } else if (variant === "round") {
            T.p.rect(x - 1, top + tr.w * 0.6, 3, tr.h - tr.w * 0.6, trunk);
            T.p.disc(x + sway, top + tr.w / 2, tr.w / 2, col);
            T.p.disc(x + sway - tr.w / 6, top + tr.w / 3, tr.w / 4, hi);
          } else if (variant === "palm") {
            for (let y = 0; y < tr.h; y++) T.p.rect(x + Math.round(Math.sin((y / tr.h) * 1.4) * 4 * (tr.k > 0.5 ? 1 : -1)), base - y, 2, 1, trunk);
            const tx = x + Math.round(Math.sin(1.4) * 4 * (tr.k > 0.5 ? 1 : -1));
            for (let f = 0; f < 6; f++) {
              const a = -Math.PI / 2 + (f - 2.5) * 0.55 + Math.sin(t * 1.3 + f + tr.k) * 0.06;
              for (let r = 0; r < tr.w; r++) T.p.rect(tx + Math.cos(a) * r, top + Math.sin(a) * r * 0.4 + (r * r) / (tr.w * 2.2), 2, 1, f % 2 ? col : hi);
            }
          } else if (variant === "dead") {
            T.p.rect(x, top, 1, tr.h, trunk);
            for (let b = 0; b < 4; b++) {
              const y0 = top + Math.round(tr.h * (0.15 + b * 0.18));
              const dir = b % 2 ? 1 : -1;
              T.p.line(x, y0, x + dir * Math.round(tr.w * 0.5), y0 - Math.round(tr.w * 0.4), trunk);
            }
          } else {
            // crystal: glowing faceted shards
            const cc = colorOf(l.color, C, C.glow2);
            const pulse = 0.6 + 0.4 * Math.sin(t * 2 + k);
            for (let y = top; y < base; y++) {
              const rel = (y - top) / tr.h;
              const half = Math.round((tr.w / 3) * Math.min(1, rel * 2.2));
              T.p.rect(x - half, y, half * 2 + 1, 1, mix(cc, C.ink, 0.35));
              T.p.rect(x - half, y, Math.max(1, half), 1, cc);
              if (pulse > bayer(x, y) && (l.lit ?? 0.6) > 0.2) T.g.rect(x - half, y, half + 1, 1, cc);
            }
          }
        });
        break;
      }
      case "clouds": {
        const col = shade(colorOf(l.color, C, mix(C.sky3, C.paper, 0.35)));
        const hi = colorOf(l.color2, C, mix(col, C.paper, 0.5));
        const n = Math.max(2, Math.round(8 * (l.density ?? 0.5)));
        const span = X1 - X0 + 80;
        for (let k = 0; k < n; k++) {
          const cw = 22 + Math.floor(h01(seed, `cw${k}`) * 40);
          const x = X0 - 40 + ((((h01(seed, `cx${k}`) * span + t * (l.speed ?? 3) * (0.6 + h01(seed, `cs${k}`) * 0.8)) % span) + span) % span);
          const y = base + Math.floor((h01(seed, `cy${k}`) - 0.5) * Math.max(10, hgt));
          if (l.variant === "streaks") {
            T.p.rect(x, y, cw * 1.6, 2, col);
            T.p.rect(x + 6, y - 1, cw, 1, hi);
          } else {
            for (let b = 0; b < 4; b++) T.p.disc(x + (b * cw) / 4, y - (b % 2 ? 4 : 1) - (b === 1 ? 3 : 0), 5 + (b % 3) * 2, col);
            T.p.rect(x - 4, y, cw + 8, 4, col);
            for (let b = 0; b < 4; b++) T.p.rect(x + (b * cw) / 4 - 2, y - (b % 2 ? 9 : 6) - (b === 1 ? 3 : 0), 5, 1, hi);
          }
        }
        break;
      }
      case "ground": {
        const col = shade(colorOf(l.color, C, C.floor0));
        const hi = shade(colorOf(l.color2, C, C.floor1));
        const v = l.variant ?? "plain";
        const top = base;
        T.p.vgrad(X0, top, X1 - X0, H + MY - top, [hi, col, mix(col, C.ink, 0.5)]);
        T.p.rect(X0, top, X1 - X0, 1, mix(hi, C.paper, 0.2));
        if (v === "grass" || v === "snow") {
          for (let x = X0; x < X1; x++) {
            const hh = Math.floor(h01(seed, `g${x}`) * 4);
            const sway = Math.round(Math.sin(t * 2 + x * 0.3) * 0.6);
            T.p.rect(x + (hh > 2 ? sway : 0), top - hh, 1, hh + 1, v === "snow" ? C.paper : hi);
          }
          for (let k = 0; k < 120; k++) {
            const x = X0 + Math.floor(h01(seed, `gd${k}`) * (X1 - X0)), y = top + 3 + Math.floor(h01(seed, `gy${k}`) * (H - top));
            T.p.set(x, y, v === "snow" ? mix(C.paper, C.glow2, 0.3) : hi);
          }
        } else if (v === "stone") {
          for (let y = top + 2, row = 0; y < H + MY; y += 6 + row, row++)
            for (let x = X0 + (row % 2) * 7; x < X1; x += 14 + row) {
              T.p.rect(x, y, 13 + row, 1, mix(col, C.ink, 0.4));
              T.p.rect(x, y, 1, 6 + row, mix(col, C.ink, 0.4));
              T.p.rect(x + 1, y + 1, 4, 1, hi);
            }
        } else if (v === "planks") {
          for (let y = top + 5; y < H + MY; y += 7) T.p.rect(X0, y, X1 - X0, 1, mix(col, C.ink, 0.45));
        } else if (v === "sand") {
          for (let k = 0; k < 260; k++) T.p.set(X0 + Math.floor(h01(seed, `sd${k}`) * (X1 - X0)), top + 2 + Math.floor(h01(seed, `sy${k}`) * (H - top)), k % 2 ? hi : mix(col, C.ink, 0.25));
        } else if (v === "metal") {
          for (let y = top + 10; y < H + MY; y += 18) T.p.rect(X0, y, X1 - X0, 1, mix(col, C.ink, 0.5));
          for (let x = X0; x < X1; x += 24) T.p.rect(x, top, 1, H + MY - top, mix(col, C.ink, 0.5));
          for (let y = top + 13; y < H + MY; y += 18) for (let x = X0 + 3; x < X1; x += 24) T.p.set(x, y, hi);
        }
        break;
      }
      case "tiles": {
        const a = shade(colorOf(l.color, C, C.floor0));
        const b = shade(colorOf(l.color2, C, C.floor1));
        const x0 = l.x !== undefined ? Math.round(l.x * W) : X0, ww = l.w !== undefined ? Math.round(l.w * W) : X1 - X0;
        const y1 = l.height ? base + hgt : H + MY;
        const sz = Math.round((l.scale ?? 4) * 2);
        const v = l.variant ?? "checker";
        for (let y = base; y < y1; y++)
          for (let x = x0; x < x0 + ww; x++) {
            const tx = Math.floor((x - x0) / sz), ty = Math.floor((y - base) / sz);
            let c2 = a;
            if (v === "checker") c2 = (tx + ty) % 2 ? a : b;
            else if (v === "brick") c2 = (y - base) % sz === 0 || ((x - x0 + (ty % 2) * (sz / 2)) % (sz * 2)) === 0 ? b : a;
            else if (v === "grid") c2 = (y - base) % sz === 0 || (x - x0) % sz === 0 ? b : a;
            else c2 = (Math.floor((x - x0 + (ty % 2) * (sz / 2)) / sz) + ty) % 3 === 0 ? b : a;
            T.p.set(x + mdx, y + mdy, c2);
          }
        break;
      }
      case "grid": {
        const bg = shade(colorOf(l.color, C, C.ink));
        const line = colorOf(l.color2, C, C.glow2);
        const top = base;
        const vx = W / 2;
        T.p.vgrad(X0, top, X1 - X0, H + MY - top, [mix(bg, line, 0.25), bg]);
        const scroll = (t * (l.speed ?? 1.2)) % 1;
        for (let k = 0; k < 14; k++) {
          const z = (k + 1 - scroll) / 14;
          const y = Math.round(top + (H + MY - top) * z * z);
          if (y > top) lit(T, X0, y, X1 - X0, 1, z < 0.12 ? mix(line, bg, 0.5) : line);
        }
        for (let k = -12; k <= 12; k++) {
          const xb = vx + k * 34;
          T.p.line(vx + k * 3, top, xb, H + MY, line);
          T.g.line(vx + k * 3, top, xb, H + MY, line);
        }
        lit(T, X0, top, X1 - X0, 1, mix(line, C.paper, 0.4));
        break;
      }
      case "sprite": {
        const sp = c.lib.get(l.sprite);
        if (!sp) break;
        const n = l.count ?? 1;
        const k0 = (l.scale ?? (depth === "far" ? 1 : 2)) * (m?.scale ?? 1);
        for (let j = 0; j < n; j++) {
          const jx = n === 1 ? (l.x ?? 0.5) : (j + 0.5) / n + (h01(seed, `sx${j}`) - 0.5) * (0.6 / n);
          const jm = l.motion && n > 1 ? motionState(l.motion, t + j * 0.37, { resolve: c.resolve, sceneSec: c.sceneSec, frames: sp.frames.length, fps: sp.fps, seed: `${seed}${j}` }) : m;
          const frame = jm ? jm.frame : sp.frames.length > 1 ? Math.floor(t * sp.fps + j) % sp.frames.length : 0;
          const ks = n > 1 ? k0 * (0.8 + 0.4 * h01(seed, `ss${j}`)) : k0;
          drawSprite(T, sp, frame, C, {
            cx: Math.round((jm?.x ?? jx) * W + (jm?.dx ?? 0)),
            ay: Math.round((jm?.y ?? l.y ?? def.y) * H + (jm?.dy ?? 0)),
            k: ks,
            rotate: jm?.rotate ?? 0,
            flip: jm?.flip ?? (l.flip ?? (n > 1 && h01(seed, `sf${j}`) > 0.5)),
            opacity: jm?.opacity ?? 1,
            glowAll: l.glow,
          });
        }
        break;
      }
      case "rect": {
        const col = shade(colorOf(l.color, C, C.accent));
        const x = Math.round((l.x ?? 0) * W) + mdx, y = base + mdy;
        const ww = Math.round((l.w ?? 1) * W * (m?.scale ?? 1)), hh = Math.round(Math.max(1, hgt) * (m?.scale ?? 1));
        for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) setOp(T.p, xx, yy, col, m?.opacity ?? 1);
        if (l.glow) T.g.rect(x, y, ww, hh, col);
        break;
      }
      case "circle": {
        const col = shade(colorOf(l.color, C, C.glow));
        const cx = Math.round((l.x ?? 0.5) * W) + mdx, cy = base + mdy;
        const r = Math.max(1, Math.round((l.r ?? 0.06) * W * (m?.scale ?? 1)));
        if (l.glow && !l.ring) T.p.pool(cx, cy, r * 2.4, r * 2.4, mix(col, C.sky1, 0.45), 0.4);
        for (let yy = cy - r; yy <= cy + r; yy++)
          for (let xx = cx - r; xx <= cx + r; xx++) {
            const d2 = (xx - cx) ** 2 + (yy - cy) ** 2;
            if (d2 > r * r + r * 0.6) continue;
            if (l.ring && d2 < (r - 2) * (r - 2)) continue;
            setOp(T.p, xx, yy, col, m?.opacity ?? 1);
            if (l.glow) T.g.set(xx, yy, col);
          }
        break;
      }
      default:
        break;
    }
  });
  return info;
}
