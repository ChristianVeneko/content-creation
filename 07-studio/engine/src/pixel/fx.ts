// Pixel-native visual effects for one scene. Particles, bursts and bolts are painted into low-res buffers (so they
// stay crisp and palette-limited); buffer effects (glitch, chromatic split, pixelate, dissolve) rewrite the layer
// buffers; screen effects (shake, flash, CRT, bloom) come back as a Screen state the scene applies in the DOM.
import { PX, bayer, versusFxOf } from "../../lib/pixel.mjs";
import { boltPath, burstAt, fxWindow, h01, particlesAt } from "../../lib/pixel-gen.mjs";
import { BH, BW, mix, type Painter, type RGB } from "./painter";
import { colorOf, type Resolve } from "./gen";
import type { Layer, Ray, Roles } from "./sets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;
export type Screen = { shake: { x: number; y: number }; flash: { color: string; opacity: number } | null; crt: number; bloom: number; glitch: number; chroma: number; pixelate: number; dissolve: number };
export const emptyScreen = (): Screen => ({ shake: { x: 0, y: 0 }, flash: null, crt: 0, bloom: 0, glitch: 0, chroma: 0, pixelate: 1, dissolve: 0 });

const W = PX.w;
const H = PX.h;
const hex = (c: RGB) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** Default colors per particle type (look roles), and whether they glow. */
const PALETTES: Record<string, (C: Roles) => RGB[]> = {
  sparks: (C) => [C.paper, C.glow, C.accent2],
  embers: (C) => [C.glow, C.accent, C.accent2],
  rain: (C) => [mix(C.paper, C.sky2, 0.45), mix(C.paper, C.glow2, 0.3)],
  snow: (C) => [C.paper, mix(C.paper, C.glow2, 0.3)],
  confetti: (C) => [C.accent, C.accent2, C.glow, C.glow2, C.paper],
  dust: (C) => [mix(C.paper, C.glow, 0.4)],
  stars: (C) => [C.paper, C.glow2, C.glow],
  smoke: (C) => [mix(C.metal1, C.wall2, 0.5), C.wall2],
  bubbles: (C) => [C.glow2, C.paper],
  leaves: (C) => [C.leaf1, C.accent, C.wood2],
  fireflies: (C) => [C.glow, C.accent2],
};
const GLOWS = new Set(["sparks", "embers", "stars", "fireflies", "bubbles"]);

const put = (L: Layer, x: number, y: number, c: RGB, glow: boolean, a = 1) => {
  if (a < 1 && a <= bayer(x, y)) return;
  L.p.set(x, y, c);
  if (glow) L.g.set(x, y, c);
};

function drawParticles(L: Layer, type: string, f: Any, C: Roles, t: number, seed: string) {
  const area = f.area ? { x: f.area.x * W, y: f.area.y * H, w: f.area.w * W, h: f.area.h * H } : { x: -PX.margin, y: -8, w: W + PX.margin * 2, h: H + 16 };
  const origin = f.x !== undefined || f.y !== undefined ? { x: (f.x ?? 0.5) * W, y: (f.y ?? 0.45) * H } : null;
  const cols = f.color ? [colorOf(f.color, C, C.paper)] : PALETTES[f.type](C);
  const glow = GLOWS.has(type);
  for (const q of particlesAt(type, { seed, t, area, intensity: f.intensity ?? 0.6, origin, angle: f.angle ?? (type === "rain" ? 12 : 0) })) {
    const c = cols[Math.floor(q.k * cols.length) % cols.length];
    switch (type) {
      case "rain": {
        const slant = Math.tan(((f.angle ?? 12) * Math.PI) / 180);
        for (let k = 0; k < q.s; k++) put(L, q.x - Math.round(slant * k), q.y - k, c, false, k === 0 ? 1 : 0.8);
        break;
      }
      case "confetti":
        if (q.s === 2) L.p.rect(q.x, q.y, 2, 1, c);
        else L.p.rect(q.x, q.y, 1, 2, c);
        break;
      case "stars":
        if (q.s >= 1) put(L, q.x, q.y, c, true);
        if (q.s === 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(L, q.x + dx, q.y + dy, mix(c, C.ink, 0.25), true);
        break;
      case "smoke":
        L.p.pool(q.x, q.y, q.s, q.s * 0.8, c, 0.55 * q.a);
        break;
      case "bubbles": {
        const r = q.s + 1;
        for (let a = 0; a < 12; a++) put(L, Math.round(q.x + Math.cos((a / 12) * 6.283) * r), Math.round(q.y + Math.sin((a / 12) * 6.283) * r), c, true, 0.85);
        L.p.set(q.x - 1, q.y - 1, C.paper);
        break;
      }
      case "leaves":
        if (q.s === 0) L.p.rect(q.x, q.y, 2, 1, c);
        else if (q.s === 1) L.p.rect(q.x, q.y, 1, 2, c);
        else {
          L.p.set(q.x, q.y, c);
          L.p.set(q.x + 1, q.y + 1, c);
        }
        break;
      case "fireflies":
        put(L, q.x, q.y, c, true, q.a + 0.2);
        if (q.s === 2) L.g.disc(q.x, q.y, 2, c);
        break;
      case "embers":
      case "sparks":
        put(L, q.x, q.y, c, true, q.a + 0.15);
        if (q.s === 2) put(L, q.x + 1, q.y, c, true, q.a);
        break;
      default:
        put(L, q.x, q.y, c, glow, q.a);
        if (q.s === 2) put(L, q.x + 1, q.y, c, glow, q.a);
    }
  }
}

function ring(L: Layer, cx: number, cy: number, r: number, c: RGB, strength: number) {
  const n = Math.max(12, Math.round(r * 6.5));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    for (const dr of [0, 1]) {
      const x = Math.round(cx + Math.cos(a) * (r + dr)), y = Math.round(cy + Math.sin(a) * (r + dr) * 0.9);
      if (strength > bayer(x, y)) {
        L.p.set(x, y, c);
        L.g.set(x, y, c);
      }
    }
  }
}

/**
 * Draw every effect of a scene. Front particles go on `front` (over the subject), back particles on `back`.
 * Returns the screen state and adds light rays to `rays`.
 */
export function drawFx(list: Any[], o: { C: Roles; t: number; seed: string; sceneSec: number; resolve: Resolve; front: Layer; back: Layer; rays: Ray[]; fps: number }): Screen {
  const { C, t } = o;
  const s = emptyScreen();
  list.forEach((f0, i) => {
    const f = versusFxOf(f0);
    const seed = `${o.seed}-fx${i}`;
    const L = f.depth === "back" ? o.back : o.front;
    const win = fxWindow(f, t, o.sceneSec, o.resolve);
    const k = f.intensity ?? 0.6;
    const px = Math.round((f.x ?? 0.5) * W), py = Math.round((f.y ?? 0.45) * H);
    const col = (fb: RGB) => colorOf(f.color, C, fb);
    if (PALETTES[f.type]) {
      if (win.active || (f.at === undefined && f.duration === undefined)) drawParticles(L, f.type, f, C, t, seed);
      return;
    }
    if (!win.active) return;
    const { u, p } = win;
    switch (f.type) {
      case "burst": {
        const cols = f.color ? [col(C.glow), C.paper, col(C.glow)] : [C.paper, C.glow, C.accent, C.accent2];
        if (u < 0.12) {
          L.p.disc(px, py, Math.round(10 * k + 6 - u * 40), C.paper);
          L.g.disc(px, py, Math.round(14 * k + 8), cols[1]);
        }
        ring(L, px, py, 6 + p * 70 * (0.6 + k), cols[1], 1 - p);
        for (const q of burstAt(u, { seed, origin: { x: px, y: py }, intensity: k })) {
          const c = cols[Math.floor(q.k * cols.length) % cols.length];
          put(L, q.x, q.y, c, true, q.a + 0.2);
          if (q.s === 2) put(L, q.x + 1, q.y, c, true, q.a);
        }
        if (u < 0.3) {
          s.shake = { x: s.shake.x + (Math.floor(u * 30) % 2 ? 2 : -2) * Math.round(1 + k * 2), y: s.shake.y + (Math.floor(u * 30) % 3 ? 1 : -1) * Math.round(1 + k) };
          if (u < 0.08) s.flash = { color: hex(C.paper), opacity: 0.35 * k };
        }
        break;
      }
      case "shockwave":
        ring(L, px, py, 4 + p * 120 * (0.5 + k), col(C.paper), (1 - p) * 0.9);
        ring(L, px, py, 2 + p * 80 * (0.5 + k), col(C.glow2), (1 - p) * 0.6);
        break;
      case "lightning": {
        const on = u < 0.1 || (u > 0.15 && u < 0.27) || (u > 0.33 && u < 0.46);
        if (!on) break;
        const flick = Math.floor(u * 30);
        const x0 = px + Math.round((h01(seed, "x0") - 0.5) * 80);
        const core = C.paper, halo = col(C.glow2);
        for (const line of boltPath(`${seed}${flick % 2}`, x0, -10, px, py, 14)) {
          for (let j = 1; j < line.length; j++) {
            const [ax, ay] = line[j - 1], [bx, by] = line[j];
            L.g.line(ax - 1, ay, bx - 1, by, halo);
            L.g.line(ax + 1, ay, bx + 1, by, halo);
            L.p.line(ax, ay, bx, by, core);
            L.g.line(ax, ay, bx, by, core);
          }
        }
        L.g.disc(px, py, 6, halo);
        s.flash = { color: hex(halo), opacity: 0.25 + 0.35 * k };
        s.shake = { x: s.shake.x + (flick % 2 ? 2 : -2), y: s.shake.y };
        break;
      }
      case "flash": {
        const step = p < 0.34 ? 1 : p < 0.67 ? 0.55 : 0.2;
        s.flash = { color: hex(col(C.paper)), opacity: step * (0.4 + 0.6 * k) };
        break;
      }
      case "rays":
        o.rays.push({ x: Math.round((f.x ?? 0.78) * W), y: Math.round((f.y ?? 0.06) * H), angle: f.angle ?? 112, spread: 40 + k * 40, len: 260 + k * 260, color: f.color ? hex(col(C.glow)) : undefined });
        break;
      case "bloom":
        s.bloom += k * (0.75 + 0.25 * Math.sin(t * 3));
        break;
      case "crt":
        s.crt = Math.max(s.crt, k);
        break;
      case "shake": {
        const amt = Math.max(1, Math.round(k * 5 * (1 - p)));
        const fr = Math.floor(u * o.fps / 2);
        s.shake = { x: s.shake.x + (h01(seed, `sx${fr}`) > 0.5 ? amt : -amt), y: s.shake.y + (h01(seed, `sy${fr}`) > 0.5 ? amt : -amt) };
        break;
      }
      case "glitch": {
        // bursts of 2-3 frames, not every frame
        const fr = Math.floor(u * o.fps);
        if (h01(seed, `g${Math.floor(fr / 2)}`) < 0.45 + k * 0.4) {
          s.glitch = Math.max(s.glitch, k);
          s.chroma = Math.max(s.chroma, 1 + Math.round(k * 2));
        }
        break;
      }
      case "chromatic":
        s.chroma = Math.max(s.chroma, 1 + Math.round(k * 2));
        break;
      case "pixelate-in":
      case "pixelate-out": {
        const q = f.type === "pixelate-in" ? 1 - p : p;
        s.pixelate = Math.max(s.pixelate, 1 + Math.round(q * (3 + k * 13)));
        break;
      }
      case "dissolve-in":
      case "dissolve-out":
        s.dissolve = Math.max(s.dissolve, f.type === "dissolve-in" ? 1 - p : p);
        break;
      case "energy-beam": {
        // charge an orb at the origin, fire a beam that races to the target, hold it pulsing, then thin it out
        const tx = Math.round((f.to?.x ?? Math.min(1.1, (f.x ?? 0.3) + 0.4)) * W), ty = Math.round((f.to?.y ?? f.y ?? 0.62) * H);
        const ox = Math.round((f.x ?? 0.3) * W), oy = Math.round((f.y ?? 0.62) * H);
        const halo = col(C.glow2), core = C.paper;
        const CHARGE = 0.3, TRAVEL = 0.25;
        const fade = Math.min(1, Math.max(0, (win.dur - u) / 0.3));
        const pulse = 0.5 + 0.5 * Math.sin(u * 38);
        const orb = u < CHARGE ? 2 + (u / CHARGE) * (7 + 5 * k) : (7 + 5 * k) * (0.85 + 0.15 * pulse) * (0.4 + 0.6 * fade);
        L.p.disc(ox, oy, Math.round(orb), halo);
        L.p.disc(ox, oy, Math.max(1, Math.round(orb - 3)), core);
        L.g.disc(ox, oy, Math.round(orb + 5), halo);
        if (u > CHARGE) {
          const e = Math.min(1, (u - CHARGE) / TRAVEL);
          const hx = ox + (tx - ox) * e, hy = oy + (ty - oy) * e;
          const len = Math.hypot(tx - ox, ty - oy) || 1;
          const nx = -(ty - oy) / len, ny = (tx - ox) / len;
          const half = Math.max(1, Math.round((2 + k * 5) * fade * (0.85 + 0.2 * pulse)));
          for (let d = -half; d <= half; d++) {
            const inner = Math.abs(d) <= Math.max(0, half - 2);
            const c = inner ? core : halo;
            L.p.line(ox + nx * d, oy + ny * d, hx + nx * d, hy + ny * d, c);
            L.g.line(ox + nx * d, oy + ny * d, hx + nx * d, hy + ny * d, halo);
          }
          // bright dashes racing along the beam
          for (let q = 0; q < 7; q++) {
            const sp = ((u * 3.2 + q / 7) % 1) * e;
            put(L, Math.round(ox + (hx - ox) * sp + nx * (q % 3 - 1) * half), Math.round(oy + (hy - oy) * sp + ny * (q % 3 - 1) * half), core, true, 1);
          }
          if (e >= 1) {
            // impact: a pulsing core and rings at the target, a light shake while the beam holds
            const age = u - CHARGE - TRAVEL;
            L.p.disc(tx, ty, Math.round((5 + 4 * k) * fade * (0.8 + 0.4 * pulse)), core);
            L.g.disc(tx, ty, Math.round((9 + 6 * k) * fade), halo);
            ring(L, tx, ty, 4 + (age * 50) % 34, halo, fade * 0.9);
            s.shake = { x: s.shake.x + (Math.floor(u * 30) % 2 ? 1 : -1) * Math.round(1 + k), y: s.shake.y };
          }
          s.bloom += 0.5 * k * fade;
        }
        break;
      }
      case "power-up": {
        // a flame aura that grows around the fighter: bright core, gold body, red tips, rising sparks and rings
        const base = py;
        const half = Math.round(15 + k * 11), tall = (30 + k * 34) * Math.min(1, u / 0.5);
        const fade = Math.min(1, Math.max(0, (win.dur - u) / 0.3));
        const body = col(C.glow);
        L.p.pool(px, base - tall * 0.45, half + 8, tall * 0.75, mix(halo2(C), C.ink, 0.35), 0.45 * fade);
        for (let dx = -half; dx <= half; dx++) {
          const edge = 1 - Math.abs(dx) / half;
          const flick = 0.6 + 0.4 * h01(seed, `pf${dx}-${Math.floor(u * 14)}`);
          const h = tall * fade * Math.pow(Math.max(0, edge), 0.75) * flick;
          if (h < 2) continue;
          for (let yy = 0; yy < h; yy += 1) {
            const ratio = yy / h;
            if (ratio > 0.82 && bayer(px + dx, base - yy) > (1 - ratio) * 5) continue;
            const d = ratio * 0.75 + (1 - edge) * 0.65;
            const c = d < 0.3 ? C.paper : d < 0.62 ? body : C.accent;
            L.p.set(px + dx, base - yy, c);
            if (d < 0.62) L.g.set(px + dx, base - yy, c);
          }
        }
        for (let q = 0; q < 10; q++) {
          const y = base - ((u * 34 + h01(seed, `sy${q}`) * 62) % 62);
          put(L, Math.round(px + (h01(seed, `sx${q}`) - 0.5) * half * 2.2), Math.round(y), q % 2 ? body : C.paper, true, fade);
        }
        ring(L, px, base - 4, 6 + (u * 36) % 30, body, 0.7 * fade);
        s.bloom += 0.45 * k * fade;
        if (u < 1.1) s.shake = { x: s.shake.x + (Math.floor(u * 30) % 2 ? 1 : -1), y: s.shake.y };
        break;
      }
      case "hit-flash": {
        // a star-burst impact: spikes that grow then snap back, a white core, a short flash and a jolt
        const grow = Math.sin(Math.PI * p);
        const len = (8 + 30 * k) * grow;
        const spin = Math.floor(u * 30) % 2 ? 22.5 : 0;
        const c1 = C.paper, c2 = col(C.glow);
        for (let a = 0; a < 8; a++) {
          const ang = ((a * 45 + spin) * Math.PI) / 180;
          const r0 = 4, r1 = r0 + len * (a % 2 ? 0.65 : 1);
          L.p.line(px + Math.cos(ang) * r0, py + Math.sin(ang) * r0, px + Math.cos(ang) * r1, py + Math.sin(ang) * r1, a % 2 ? c2 : c1);
          L.g.line(px + Math.cos(ang) * r0, py + Math.sin(ang) * r0, px + Math.cos(ang) * r1, py + Math.sin(ang) * r1, c2);
        }
        L.p.disc(px, py, Math.round((5 + 7 * k) * (1 - p * 0.5)), c1);
        L.g.disc(px, py, Math.round(10 + 8 * k), c2);
        s.flash = { color: hex(c1), opacity: (p < 0.25 ? 0.5 : 0.18) * (0.5 + 0.5 * k) };
        s.shake = { x: s.shake.x + (Math.floor(u * 30) % 2 ? 2 : -2) * Math.round(1 + k), y: s.shake.y + (Math.floor(u * 30) % 3 ? 1 : -1) };
        s.chroma = Math.max(s.chroma, 1);
        break;
      }
      default:
        break;
    }
  });
  return s;
}

/** The cool light color of a look (for auras). */
const halo2 = (C: Roles): RGB => C.glow2;

// ---------------- buffer effects ----------------

/** Pixelate a buffer in b x b blocks (each block takes its center pixel). */
export function pixelateBuf(P: Painter, b: number) {
  if (b <= 1) return;
  const d = P.data;
  for (let by = 0; by < BH; by += b)
    for (let bx = 0; bx < BW; bx += b) {
      const cx = Math.min(BW - 1, bx + (b >> 1)), cy = Math.min(BH - 1, by + (b >> 1));
      const ci = (cy * BW + cx) * 4;
      const r = d[ci], g = d[ci + 1], bl = d[ci + 2], a = d[ci + 3];
      for (let y = by; y < Math.min(BH, by + b); y++)
        for (let x = bx; x < Math.min(BW, bx + b); x++) {
          const i = (y * BW + x) * 4;
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = bl;
          d[i + 3] = a;
        }
    }
}

/** Hide a fraction of the buffer in 3 px ordered-dither blocks (blocky dissolve to the background). */
export function dissolveBuf(P: Painter, frac: number) {
  if (frac <= 0) return;
  const d = P.data;
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) if (frac >= 1 || frac > bayer(Math.floor(x / 3), Math.floor(y / 3))) d[(y * BW + x) * 4 + 3] = 0;
}

/** Shift random horizontal bands sideways (glitch), seeded by the frame. */
export function glitchBuf(P: Painter, seed: string, amount: number) {
  if (amount <= 0) return;
  const d = P.data;
  const bands = 2 + Math.round(amount * 5);
  for (let k = 0; k < bands; k++) {
    const y0 = Math.floor(h01(seed, `gy${k}`) * BH);
    const hh = 2 + Math.floor(h01(seed, `gh${k}`) * (5 + amount * 22));
    const dx = Math.round((h01(seed, `gx${k}`) - 0.5) * 2 * (4 + amount * 26));
    for (let y = y0; y < Math.min(BH, y0 + hh); y++) {
      const row = d.slice(y * BW * 4, (y + 1) * BW * 4);
      for (let x = 0; x < BW; x++) {
        const sx = (((x - dx) % BW) + BW) % BW;
        d.set(row.subarray(sx * 4, sx * 4 + 4), (y * BW + x) * 4);
      }
    }
  }
}

/** Chromatic split: red sampled from the left, blue from the right, `px` pixels apart. */
export function chromaBuf(P: Painter, px: number) {
  if (px <= 0) return;
  const d = P.data;
  const src = d.slice();
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      const i = (y * BW + x) * 4;
      const l = (y * BW + Math.max(0, x - px)) * 4, r = (y * BW + Math.min(BW - 1, x + px)) * 4;
      const a = Math.max(src[i + 3], src[l + 3], src[r + 3]);
      if (!a) continue;
      d[i] = src[l + 3] ? src[l] : 0;
      d[i + 1] = src[i + 3] ? src[i + 1] : 0;
      d[i + 2] = src[r + 3] ? src[r + 2] : 0;
      d[i + 3] = 255;
    }
}
