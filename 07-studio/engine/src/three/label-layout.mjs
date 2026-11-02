// Automatic layout of the callout labels of a staged scene. Pure: given the projected anchors of the labels (screen pixels) it
// places fixed-size boxes greedily, in priority order, so no two overlap and none touches a reserved band (the title, the caption
// line). A label that cannot find a free spot within `maxSteps` slots of its natural position is hidden.

/** Axis-aligned overlap of two {x0, y0, x1, y1} rectangles (touching edges do not overlap). */
export const rectsOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const boxOf = (cx, cy, w, h) => ({ x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 });

/**
 * @param {{id: string|number, ax: number, ay: number, w: number, h: number, priority?: number}[]} items anchors in px; (ax, ay) is the
 *   point on the object, `w` x `h` the label box; higher `priority` is placed first (ties keep the input order)
 * @param {{bounds?: {x0: number, y0: number, x1: number, y1: number}, avoid?: {x0: number, y0: number, x1: number, y1: number}[], gap?: number, lift?: number, maxSteps?: number}} [opts]
 *   bounds: where a whole box must stay; avoid: bands no box may touch; gap: min space between boxes; lift: preferred distance of the
 *   box center above the anchor; maxSteps: how many vertical slots a label may move from its natural spot
 * @returns {{id: string|number, x: number, y: number, ax: number, ay: number, w: number, h: number, visible: boolean}[]} in input order; (x, y) is the box center
 */
export function layoutLabels(items, opts = {}) {
  const bounds = opts.bounds ?? { x0: 40, y0: 360, x1: 1040, y1: 1640 };
  const avoid = opts.avoid ?? [];
  const gap = opts.gap ?? 10;
  const maxSteps = opts.maxSteps ?? 4;
  const lift = opts.lift ?? 64;
  const placed = [];
  const out = new Map();
  const order = items.map((it, i) => ({ it, i })).sort((a, b) => (b.it.priority ?? 0) - (a.it.priority ?? 0) || a.i - b.i);
  for (const { it } of order) {
    const { w, h } = it;
    const onScreen = it.ax >= bounds.x0 && it.ax <= bounds.x1 && it.ay >= bounds.y0 - 80 && it.ay <= bounds.y1 + 80;
    const clampX = (x) => Math.max(bounds.x0 + w / 2, Math.min(bounds.x1 - w / 2, x));
    const clampY = (y) => Math.max(bounds.y0 + h / 2, Math.min(bounds.y1 - h / 2, y));
    let best = null;
    if (onScreen) {
      const slot = h + gap;
      const baseY = it.ay - lift;
      // natural spot first, then alternate above / below by one slot, then nudge sideways at each height
      const tries = [];
      for (let s = 0; s <= maxSteps; s++) for (const dir of s === 0 ? [0] : [-1, 1]) tries.push({ dy: dir * s * slot, s });
      outer: for (const { dy } of tries) {
        for (const dx of [0, -(w * 0.35), w * 0.35, -(w * 0.7), w * 0.7]) {
          const cx = clampX(it.ax + dx);
          const cy = clampY(baseY + dy);
          const b = boxOf(cx, cy, w + gap, h + gap);
          const real = boxOf(cx, cy, w, h);
          if (avoid.some((r) => rectsOverlap(real, r))) continue;
          if (placed.some((p) => rectsOverlap(b, p))) continue;
          best = { x: cx, y: cy };
          break outer;
        }
      }
    }
    if (best) placed.push(boxOf(best.x, best.y, w, h));
    out.set(it, { id: it.id, x: best ? Math.round(best.x * 10) / 10 : it.ax, y: best ? Math.round(best.y * 10) / 10 : it.ay, ax: it.ax, ay: it.ay, w, h, visible: Boolean(best) });
  }
  return items.map((it) => out.get(it));
}
