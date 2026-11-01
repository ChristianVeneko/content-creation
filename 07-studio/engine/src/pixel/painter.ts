// A tiny software painter for crisp pixel art: every call writes whole pixels into an RGBA buffer (no canvas
// antialiasing anywhere). Coordinates are low-res view pixels: (0, 0) is the top-left of the visible 270x480 view;
// the buffer extends PX.margin pixels left/right and MY pixels top/bottom so the camera can pan.
import { PX, bayer, hexToRgb, nearestIndex } from "../../lib/pixel.mjs";

export type RGB = [number, number, number];
export const MY = 12;
export const BW = PX.w + PX.margin * 2;
export const BH = PX.h + MY * 2;

const cache = new Map<string, RGB>();
export const rgb = (hex: string): RGB => {
  let c = cache.get(hex);
  if (!c) {
    c = hexToRgb(hex) as RGB;
    cache.set(hex, c);
  }
  return c;
};
/** Mix two colors (t = 0 -> a, 1 -> b). Only used to derive palette shades, never per pixel blending. */
export const mix = (a: RGB, b: RGB, t: number): RGB => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

export class Painter {
  readonly data: Uint8ClampedArray;
  constructor() {
    this.data = new Uint8ClampedArray(BW * BH * 4);
  }
  set(x: number, y: number, c: RGB) {
    const bx = Math.round(x) + PX.margin;
    const by = Math.round(y) + MY;
    if (bx < 0 || by < 0 || bx >= BW || by >= BH) return;
    const i = (by * BW + bx) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    const x0 = Math.round(x), y0 = Math.round(y), x1 = x0 + Math.round(w), y1 = y0 + Math.round(h);
    for (let yy = Math.max(y0, -MY); yy < Math.min(y1, PX.h + MY); yy++) for (let xx = Math.max(x0, -PX.margin); xx < Math.min(x1, PX.w + PX.margin); xx++) this.set(xx, yy, c);
  }
  frame(x: number, y: number, w: number, h: number, c: RGB) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }
  /** Ordered-dither between two colors; ratio may vary per pixel. */
  dither(x: number, y: number, w: number, h: number, a: RGB, b: RGB, ratio: number | ((x: number, y: number) => number)) {
    const x0 = Math.round(x), y0 = Math.round(y);
    for (let yy = y0; yy < y0 + Math.round(h); yy++)
      for (let xx = x0; xx < x0 + Math.round(w); xx++) {
        const r = typeof ratio === "number" ? ratio : ratio(xx, yy);
        if (r <= 0) this.set(xx, yy, a);
        else if (r >= 1) this.set(xx, yy, b);
        else this.set(xx, yy, r > bayer(xx, yy) ? b : a);
      }
  }
  /** Dithered vertical gradient through color stops. */
  vgrad(x: number, y: number, w: number, h: number, stops: RGB[]) {
    const n = stops.length - 1;
    this.dither(x, y, w, h, stops[0], stops[0], 0);
    const y0 = Math.round(y);
    for (let yy = y0; yy < y0 + Math.round(h); yy++) {
      const p = ((yy - y0) / Math.max(1, h - 1)) * n;
      const k = Math.min(n - 1, Math.floor(p));
      const t = p - k;
      for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.set(xx, yy, t > bayer(xx, yy) ? stops[k + 1] : stops[k]);
    }
  }
  /** Dithered radial pool of light: color b fades into whatever is underneath (only pixels where it wins are set). */
  pool(cx: number, cy: number, rx: number, ry: number, c: RGB, strength = 0.6) {
    for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++)
      for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx++) {
        const d = Math.hypot((xx - cx) / rx, (yy - cy) / ry);
        if (d >= 1) continue;
        if ((1 - d) * strength > bayer(xx, yy)) this.set(xx, yy, c);
      }
  }
  disc(cx: number, cy: number, r: number, c: RGB) {
    for (let yy = Math.floor(cy - r); yy <= cy + r; yy++) for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) if ((xx - cx) ** 2 + (yy - cy) ** 2 <= r * r + r * 0.6) this.set(xx, yy, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 2000; i++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Fill columns from `top(x)` down to `bottom` (silhouettes, hills, roofs). */
  ridge(x0: number, x1: number, top: (x: number) => number, bottom: number, c: RGB) {
    for (let x = Math.round(x0); x < Math.round(x1); x++) this.rect(x, Math.round(top(x)), 1, bottom - Math.round(top(x)), c);
  }
  checker(x: number, y: number, w: number, h: number, size: number, a: RGB, b: RGB) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, (Math.floor(xx / size) + Math.floor(yy / size)) % 2 ? a : b);
  }
  /**
   * Draw a sprite from text rows. Each character maps to a color through `legend` ('.' and ' ' are transparent).
   * `scale` repeats each art pixel; `flip` mirrors horizontally.
   */
  sprite(rows: string[], legend: Record<string, RGB | undefined>, x: number, y: number, scale = 1, flip = false) {
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const c = legend[row[rx]];
        if (!c) continue;
        const ax = flip ? w - 1 - rx : rx;
        this.rect(x + ax * scale, y + ry * scale, scale, scale, c);
      }
    });
  }
  /** Quantize the buffer to a palette (strict looks). */
  quantize(palette: RGB[]) {
    const d = this.data;
    const memo = new Map<number, number>();
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      let k = memo.get(key);
      if (k === undefined) {
        k = nearestIndex(palette, d[i], d[i + 1], d[i + 2]) as number;
        memo.set(key, k);
      }
      d[i] = palette[k][0];
      d[i + 1] = palette[k][1];
      d[i + 2] = palette[k][2];
    }
  }
}
