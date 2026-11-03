// Frame zones of a three-looks video (1080x1920 px). Single source of truth for the runtime (injected as `ZONES`), the template and the tests.
export const FRAME = { w: 1080, h: 1920, fps: 30 };
export const SAFE = { top: 220, bottom: 420, side: 60 };
export const ZONES = {
  // 900x1300 centre box: x 90..990, y 310..1610 (platform rule: text and key subjects stay inside it)
  box: { x0: 90, x1: 990, y0: 310, y1: 1610 },
  action: { y0: 260, y1: 1140 },           // the diorama is framed here (view offset shifts the picture up)
  captions: { y0: 1190, y1: 1420, top: 1196 }, // DOM captions only; nothing else lives in this band
  label: { x0: 130, x1: 950, y0: 310, y1: 1090 }, // floating name tags are clamped inside this rect (centre points)
  stamp: { y: 640 },                       // centre of the big stamp word
  viewOffsetY: 130,                        // camera view offset in px: shifts the subject up so the caption band stays free
  labelPx: 52, stampPx: 118, captionPx: 64, // all text is 46 px or bigger
};
export const rectsOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
