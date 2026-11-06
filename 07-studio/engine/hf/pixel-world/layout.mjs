// Frame zones of a pixel-world video. Logical frame 270x480 (x4 = 1080x1920). Single source of truth for the runtime
// (injected as `ZONES`), the template and the tests: nothing but captions may live in the caption band.
export const FRAME = { w: 270, h: 480, scale: 4 };
export const ZONES = {
  caption: { y0: 90, y1: 140 },   // DOM captions (template #caps top 372 px = 93 logical, up to two lines)
  brand: { y0: 56, y1: 80 },      // optional brand pill (DOM, top 236 px)
  hud: { y0: 350, y1: 372 },      // progress bar and counter chip: first rows of the floor, below the action band and clear of the cast and props
  action: { y0: 77, y1: 346 },    // props and cast live here (16-72 % of the frame height)
  floor: { y0: 346, y1: 480 },    // lower third: floor pattern, debris, foreground silhouettes
  stampTop: 700,                  // DOM hero-stamp top in px (logical 175), clear of caption and HUD
  capTop: 372,                    // DOM captions top in px
  hudProgress: { x: 16, y: 355, w: 118, h: 12 },
  hudCounter: { x: 150, y: 353, w: 104, h: 14 },
  // chunky 2x styles draw 16 px glyphs, so their HUD boxes are taller and the counter is wider (still inside the HUD band y 350-372)
  hudProgress2: { x: 8, y: 350, w: 104, h: 22 },
  hudCounter2: { x: 118, y: 350, w: 144, h: 22 },
};
/** HUD boxes for a style grid size (px 1 or 2). */
export const hudZonesFor = (px = 1) => (px >= 2 ? { progress: ZONES.hudProgress2, counter: ZONES.hudCounter2 } : { progress: ZONES.hudProgress, counter: ZONES.hudCounter });
export const rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const bandRect = (band) => ({ x: 0, y: band.y0, w: FRAME.w, h: band.y1 - band.y0 });
/** Every on-screen HUD element rectangle in logical px (progress bar, counter chip, DOM stamp). */
export const hudRects = (px = 1) => [
  { name: "progress", ...hudZonesFor(px).progress }, { name: "counter", ...hudZonesFor(px).counter },
  { name: "stamp", x: 0, y: ZONES.stampTop / FRAME.scale, w: FRAME.w, h: 20 },
];
