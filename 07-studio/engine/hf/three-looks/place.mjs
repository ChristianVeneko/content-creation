// Placement of name tags and stamp words (pure, at compose time): they avoid the hero and the targeted object and stay in their zones.
// A tag is attached to its object by a leader line the runtime draws every frame from the tag to the object's projected anchor.
import { ZONES, rectsOverlap } from "./layout.mjs";

export const labelSize = (text, px = ZONES.labelPx) => ({ w: Math.round(text.length * px * 0.55 + 76), h: Math.round(px * 1.05 + 28) });
export const stampSize = (text) => {
  const px = Math.max(60, Math.min(ZONES.stampPx, Math.floor(880 / Math.max(4, text.length * 0.58))));
  return { px, w: Math.min(960, Math.round(text.length * px * 0.58 + 110)), h: Math.round(px * 1.25 + 40) };
};
const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const inter = (a, b) => (rectsOverlap(a, b) ? area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) }) : 0);
const grow = (r, k) => ({ x0: r.x0 - k, y0: r.y0 - k, x1: r.x1 + k, y1: r.y1 + k });
const clampRect = (r, z) => { const w = r.x1 - r.x0, h = r.y1 - r.y0; let x0 = Math.min(Math.max(r.x0, z.x0), z.x1 - w), y0 = Math.min(Math.max(r.y0, z.y0), z.y1 - h); return { x0, y0, x1: x0 + w, y1: y0 + h }; };
const cost = (r, obstacles, taken) => obstacles.reduce((s, o) => s + inter(r, grow(o, 6)), 0) + taken.reduce((s, o) => s + inter(r, o) * 2, 0);

/** @returns {{ rect, cx, cy, anchor, clear: boolean }} tag centre in frame px; `anchor` = where the leader line ends (top centre of the target). */
export function placeLabel({ text, target, obstacles = [], taken = [] }) {
  const { w, h } = labelSize(text), gap = 34, z = ZONES.label;
  const cx = (target.x0 + target.x1) / 2, cy = (target.y0 + target.y1) / 2, tw = target.x1 - target.x0;
  const c = (x0, y0) => clampRect({ x0, y0, x1: x0 + w, y1: y0 + h }, z);
  const cands = [
    c(cx - w / 2, target.y0 - gap - h), c(cx - w * 0.15, target.y0 - gap - h), c(cx - w * 0.85, target.y0 - gap - h),
    c(target.x1 + gap, cy - h / 2), c(target.x0 - gap - w, cy - h / 2), c(cx - w / 2, target.y1 + gap),
    c(cx - w / 2, target.y0 - gap - h - 90), c(target.x1 + gap, target.y0 - h), c(target.x0 - gap - w, target.y0 - h),
  ];
  const obs = [target, ...obstacles];
  let best = null;
  for (const r of cands) { const k = cost(r, obs, taken); if (best === null || k < best.k) best = { r, k }; if (k === 0) break; }
  const r = best.r;
  return { rect: r, cx: Math.round((r.x0 + r.x1) / 2), cy: Math.round((r.y0 + r.y1) / 2), anchor: { x: Math.round(cx), y: Math.round(target.y0 + Math.min(tw * 0.0, 0)) }, clear: best.k === 0 };
}

/** Stamp word: centred on x = 540 at the first free y of the stamp band (no overlap with the hero, the target or another stamp). */
export function placeStamp({ text, obstacles = [], taken = [] }) {
  const { px, w, h } = stampSize(text), z = ZONES.stamp, ys = [640, 520, 760, 430, 860, 960, 380, 1030];
  let best = null;
  for (const y of ys) {
    for (const dx of [0, -150, 150]) {
      const r = clampRect({ x0: 540 + dx - w / 2, y0: y - h / 2, x1: 540 + dx + w / 2, y1: y + h / 2 }, { x0: 60, x1: 1020, y0: z.y0 - 20, y1: z.y1 });
      const k = cost(r, obstacles, taken); if (best === null || k < best.k) best = { r, k };
      if (k === 0) break;
    }
    if (best.k === 0) break;
  }
  const r = best.r;
  return { rect: r, cx: Math.round((r.x0 + r.x1) / 2), cy: Math.round((r.y0 + r.y1) / 2), px, clear: best.k === 0 };
}
