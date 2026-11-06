/* contrast.js: WCAG 2.x contrast helpers shared by the browser runtime and the node tests (pure functions, no DOM). */
'use strict';
function relLum(hex) {
  const n = parseInt(String(hex).slice(1, 7), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrastRatio(a, b) { const la = relLum(a), lb = relLum(b), hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05); }
/* Picks a readable fill for text that sits on `bg`: the first candidate with at least `min`, else the best palette extreme. */
function pickReadable(bg, candidates, palette, min = 4.5) {
  for (const c of candidates) if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) && contrastRatio(bg, c) >= min) return c;
  let best = palette[0], br = 0;
  for (const c of palette) { const r = contrastRatio(bg, c); if (r > br) { br = r; best = c; } }
  return best;
}
/* Stamp colours: { fg, stroke, bg, boxed }. The stamp glyph sits on its own ink stroke, so fg is checked against that stroke;
 * when no candidate reaches `min` the stamp becomes boxed: best-contrast palette pair, no stroke. */
function stampPair(ink, candidates, palette, min = 4.5) {
  for (const c of candidates) if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) && contrastRatio(ink, c) >= min) return { fg: c, stroke: ink, bg: null, boxed: false };
  let best = null, br = 0;
  for (const a of palette) for (const b of palette) { const r = contrastRatio(a, b); if (r > br) { br = r; best = { fg: a, stroke: b, bg: b, boxed: true }; } }
  return best;
}
