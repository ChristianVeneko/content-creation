// Frame zones of a three-looks video (1080x1920 px). Single source of truth for the runtime (injected as `ZONES`), the framing solver,
// the label/stamp placement, the template and the tests.
export const FRAME = { w: 1080, h: 1920, fps: 30 };
export const SAFE = { top: 220, bottom: 420, side: 60 };
export const ZONES = {
  // 900x1300 centre box: x 90..990, y 310..1610 (platform rule: text and key subjects stay inside it)
  box: { x0: 90, x1: 990, y0: 310, y1: 1610 },
  // the framing solver fits the hero and the targeted object into this rect (inside box, above the caption band): centre y 730
  fit: { x0: 90, x1: 990, y0: 330, y1: 1130 },
  action: { y0: 260, y1: 1140 },
  captions: { y0: 1190, y1: 1420, top: 1196 }, // DOM captions only; nothing else lives in this band
  label: { x0: 130, x1: 950, y0: 330, y1: 1100 }, // name tags are placed inside this rect (rect edges)
  stamp: { y: 640, y0: 330, y1: 1120 },         // stamp words are placed inside this band, away from the hero and the target
  viewOffsetY: 230,                              // camera view offset in px: the look point sits at y = 960 - 230 = 730 (centre of `fit`)
  lowerThird: { y0: 1280, y1: 1920 },
  heroMaxFrac: 0.35,                             // the hero is never taller than 35 % of the frame
  labelPx: 52, stampPx: 118, captionPx: 64,      // all text is 46 px or bigger
};
export const rectsOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
