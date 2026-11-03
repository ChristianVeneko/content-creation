// Safe-zone geometry shared by the composition and its tests. Frame 1080x1920.
// Project rule: text inside the centre 900x1300 box (x 90-990, y 310-1610). Platform UI: nothing important in the
// top 220 px, the bottom 420 px or 60 px at the sides. Captions own the band just above the stage; every other
// text element (labels, chips, hero stamps, emotes) lives below that band and is clamped by the camera-aware
// placement below.
export const SAFE = { x0: 90, x1: 990, y0: 310, y1: 1610 };
export const CAPTION_BAND = { y0: 320, y1: 470 };
export const CONTENT = { x0: 90, x1: 990, y0: 480, y1: 1610 };
/** Panel of a scene relative to the scene centre (world units): the stage (single) or the whole frame (multi). */
export const PANEL = { single: { dx: -480, dy: -520, w: 960, h: 1040 }, multi: { dx: -540, dy: -970, w: 1080, h: 1920 } };

/**
 * Offset (screen px) that keeps a tag, drawn at screen rect (sx, sy, w, h), inside its own panel and the content
 * box. A panel that does not meet the content box is off screen: no offset. A region smaller than the tag aligns
 * the tag to the region start. Self-contained on purpose: compose inlines its source into the player.
 */
export function placeTagCore(a) {
  const b = a.box, p = a.panel;
  const x0 = Math.max(p.x, b.x0), x1 = Math.min(p.x + p.w, b.x1), y0 = Math.max(p.y, b.y0), y1 = Math.min(p.y + p.h, b.y1);
  if (x1 <= x0 || y1 <= y0) return { dx: 0, dy: 0 };
  const fit = (s, len, lo, hi) => (len >= hi - lo ? lo : Math.min(hi - len, Math.max(lo, s)));
  return { dx: fit(a.sx, a.w, x0, x1) - a.sx, dy: fit(a.sy, a.h, y0, y1) - a.sy };
}
export const placeTag = (a) => placeTagCore({ box: CONTENT, ...a });

const sceneAt = (plan, si) => plan.scenes[si];
/** Screen rect of the panel of scene `si` for a camera state { cx, cy, z }. */
export function panelRect(plan, si, cam) {
  const s = sceneAt(plan, si), pn = plan.panel;
  return { x: plan.ax + (s.cx + pn.dx - cam.cx) * cam.z, y: plan.ay + (s.cy + pn.dy - cam.cy) * cam.z, w: pn.w * cam.z, h: pn.h * cam.z };
}
/** Natural screen rect of a tag (before clamping) for a camera state. Tag spot is in stage coordinates. */
export function screenRect(plan, tag, cam) {
  const s = sceneAt(plan, tag.si);
  const wx = s.cx - 480 + tag.x, wy = s.cy - 520 + tag.y;
  const w = tag.w * cam.z, h = tag.h * cam.z;
  const sx = plan.ax + (wx - cam.cx) * cam.z, sy = plan.ay + (wy - cam.cy) * cam.z;
  return tag.anchor === "c" ? { x: sx - w / 2, y: sy - h / 2, w, h } : { x: sx, y: sy, w, h };
}

/** Rough size of a text tag before the browser measures it (the player re-measures). */
export function estimateSize(kind, text, fs = 0) {
  const n = [...String(text ?? "")].length;
  if (kind === "label") return { w: 60 + n * 30, h: 78 };
  if (kind === "chip") return { w: 52 + n * 26, h: 67 };
  if (kind === "hero") return { w: Math.round(n * fs * 0.68), h: Math.round(fs * 1.2) };
  return { w: 110, h: 110 };
}
