import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionLook, CaptionPage, Palette } from "../../types";

export type StyleProps = { page: CaptionPage; palette: Palette; font: string; look: CaptionLook; band: React.CSSProperties };

/** Mix two #RRGGBB colors (t = 0 → a, 1 → b). */
export const mixHex = (a: string, b: string, t: number) => {
  const ch = (h: string) => {
    const n = parseInt(h.replace("#", "").slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [x, y] = [ch(a), ch(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

/**
 * Text-shadow for text-only styles: `base` plus, when look.halo is "strong", a tight dense halo in the
 * outline color so the words separate from a background close to their color.
 */
export const haloShadow = (look: CaptionLook, base: string) => {
  if (look.halo !== "strong") return base;
  const n = parseInt(look.colors.outline.replace("#", ""), 16);
  const c = (a: number) => `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  return `0 0 2px ${c(0.95)}, 0 0 5px ${c(0.9)}, 0 0 12px ${c(0.7)}, ${base}`;
};

/** Width every caption must fit in (the safe box is x 90..990; keep a margin for scale pops). */
export const CAPTION_WIDTH = 900;

/** Approximate advance width per character, in em, for the faces the caption styles use. */
const EM: Record<string, number> = {
  Montserrat: 0.66,
  Poppins: 0.68,
  Inter: 0.62,
  Anton: 0.44,
  "JetBrains Mono": 0.6,
  "Pixelify Sans": 0.62,
  "Press Start 2P": 1.0,
};

/** Largest size (<= max) at which the longest word of `text` fits in `width` px. */
export const fitFor = (text: string, max: number, width: number, font: string, uppercase = true) => {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => [...w].length));
  const em = (EM[font] ?? 0.66) * (uppercase ? 1 : 0.86);
  return Math.floor(Math.min(max, width / (longest * em)));
};

/** Apply the spec casing override, or the style's own casing when the spec leaves it unset. */
export const cased = (text: string, look: CaptionLook, styleDefault: "upper" | "lower" | "asis") => {
  const mode = look.uppercase === true ? "upper" : look.uppercase === false ? (styleDefault === "lower" ? "lower" : "asis") : styleDefault;
  return mode === "upper" ? text.toUpperCase() : mode === "lower" ? text.toLowerCase() : text;
};

/** Frame-driven clock of one caption page (the page's Sequence starts at frame 0). */
export const usePageClock = (page: CaptionPage) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const endOf = (i: number) => {
    const next = page.words[i + 1];
    return next ? next.startMs : page.endMs;
  };
  const isActive = (i: number) => nowMs >= page.words[i].startMs && nowMs < endOf(i);
  const spoken = (i: number) => nowMs >= page.words[i].startMs;
  /** Frames since word i started (negative before). */
  const since = (i: number) => Math.round(((nowMs - page.words[i].startMs) / 1000) * fps);
  /** 0..1 progress through word i's own window. */
  const progress = (i: number) => {
    const w = page.words[i];
    const span = Math.max(1, endOf(i) - w.startMs);
    return Math.min(1, Math.max(0, (nowMs - w.startMs) / span));
  };
  const pop = (i: number, stiffness = 260) => spring({ frame: since(i), fps, config: { damping: 12, stiffness }, durationInFrames: 7 });
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 200 }, durationInFrames: 8 });
  /** Index of the word being spoken (last spoken word after the final one ends). */
  const activeIndex = () => {
    let k = 0;
    page.words.forEach((w, i) => {
      if (nowMs >= w.startMs) k = i;
    });
    return k;
  };
  return { frame, fps, nowMs, isActive, spoken, since, progress, pop, enter, activeIndex, endOf };
};

/**
 * Characters of the page revealed at `nowMs`: each word types out over its own window, at most
 * `msPerChar` per character, so long words finish before the next word starts.
 */
export const typedText = (page: CaptionPage, nowMs: number, msPerChar = 42) => {
  const words = page.words.map((w) => w.text.trim());
  let out = "";
  words.forEach((t, i) => {
    const start = page.words[i].startMs;
    const end = i + 1 < words.length ? page.words[i + 1].startMs : page.endMs;
    const per = Math.min(msPerChar, Math.max(1, (end - start) / Math.max(1, t.length)));
    const n = nowMs < start ? 0 : Math.min(t.length, Math.floor((nowMs - start) / per) + 1);
    if (n > 0) out += (out ? " " : "") + t.slice(0, n);
  });
  return { shown: out, full: words.join(" "), done: out.length >= words.join(" ").length };
};
