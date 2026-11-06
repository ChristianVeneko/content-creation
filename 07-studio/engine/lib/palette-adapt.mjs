// Shared palette adaptation: whatever palette a spec carries (template default, preset or the user's own colors),
// text and accents must read against every background stop, in every family (2D, 3D, pixel).
import { readableWord, mix } from "./captions.mjs";
import { contrastRatio, luminance } from "./palettes.mjs";

/** Minimum WCAG contrast of body text over each background stop. */
export const TEXT_MIN = 4.5;
/** Minimum WCAG contrast of accents (headline words, illustration strokes, glows) over each background stop. */
export const ACCENT_MIN = 3;

const ACCENT_KEYS = ["accent", "accent2", "accent3"];
const worst = (fg, bgs) => Math.min(...bgs.map((b) => contrastRatio(fg, b)));

/**
 * A background gradient can be too wide for any single text color (dark stop and vivid light stop). Move only the
 * stops the text cannot read on, the smallest step away from the text, until they do.
 */
function fitBackgrounds(text, bgs) {
  const pole = luminance(text) > 0.5 ? "#000000" : "#FFFFFF";
  return bgs.map((b) => {
    if (contrastRatio(text, b) >= TEXT_MIN) return b;
    for (let i = 1; i <= 20; i++) {
      const c = mix(b, pole, i / 20);
      if (contrastRatio(text, c) >= TEXT_MIN) return c;
    }
    return mix(b, pole, 1);
  });
}

/**
 * Return the palette with text and accents nudged (the smallest step toward the readable ink) until they reach the
 * minimum contrast on every bg stop. Backgrounds change only when no text color can read on all of them. A palette
 * that already reads is returned as is, so adapting twice gives the same result.
 * `accents: false` (a template's own designed palette, whose fills carry their own outlines) guarantees only the
 * text; colors the user picked or typed get the full rule.
 * @param {{bg: string[], text: string, accent: string, accent2?: string, accent3?: string}} palette
 * @param {{accents?: boolean}} [opts]
 */
export function adaptPalette(palette, { accents = true } = {}) {
  const out = { ...palette, bg: [...palette.bg] };
  out.text = readableWord(palette.text, palette.bg, TEXT_MIN);
  if (worst(out.text, out.bg) < TEXT_MIN) out.bg = fitBackgrounds(out.text, out.bg);
  if (accents) for (const k of ACCENT_KEYS) if (palette[k]) out[k] = readableWord(palette[k], out.bg, ACCENT_MIN);
  return out;
}
