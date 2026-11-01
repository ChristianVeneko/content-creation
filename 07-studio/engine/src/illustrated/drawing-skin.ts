// How each illustrated look restyles agent drawings and 2D fx: the look's own media (wash, marker, paper cutouts,
// chalk, riso halftone, ukiyo-e key block, comic ink) applied to the drawing kit (src/components/Drawing2D.tsx, Fx2D.tsx).
// The chalk, riso and ukiyo-e textures come from the look's scene filter (artSceneFilter), which already covers them.
import type { DrawingColors, DrawingSkin } from "../components/Drawing2D";
import type { FxTint } from "../components/Fx2D";
import { rgba } from "../util";
import type { Ink } from "./kit";

/** Drawing roles of a look's ink. */
export const inkColors = (ink: Ink): DrawingColors => ({
  accent: ink.accent,
  accent2: ink.accent2,
  accent3: ink.accent3,
  good: ink.good,
  bad: ink.bad,
  muted: ink.muted,
  text: ink.text,
  bg: ink.bg,
  surface: ink.surface2,
  line: ink.line,
  paper: ink.paper,
  ink: ink.look.light ? ink.text : ink.paperInk,
});

/** The drawing skin of a look. */
export const lookDrawingSkin = (ink: Ink): DrawingSkin => {
  const L = ink.look;
  const fonts = { display: L.display, body: L.body, mono: L.mono, hand: `'Kalam', 'Caveat', ${L.body}`, weight: L.displayWeight };
  switch (L.id) {
    case "whiteboard":
      return { fonts, filter: "marker", ink: ink.text, stroke: 1.15, fillOpacity: 0.92 };
    case "watercolor":
      return { fonts, filter: "wash", ink: ink.text, fillOpacity: 0.78, stroke: 0.8, blend: "multiply" };
    case "paper-collage":
      return { fonts, cutout: true, stepFps: 12, ink: ink.text };
    case "chalkboard":
      return { fonts, ink: ink.text, fillOpacity: 0.8, stroke: 1.2 };
    case "risograph":
      return { fonts, halftone: rgba(ink.text, 0.55), blend: "multiply", ink: ink.text };
    case "ukiyo-e":
      return { fonts, outline: { color: ink.text, width: 4.5 }, stroke: 1.25, ink: ink.text };
    case "pop-comic":
      return { fonts, outline: { color: "#111111", width: 6 }, halftone: "rgba(17,17,17,0.5)", stroke: 1.2, ink: "#111111", shadow: "drop-shadow(10px 10px 0 #111111)" };
    case "flat-depth":
      return { fonts, ink: ink.text, shadow: `drop-shadow(0 12px 0 ${rgba("#0A0A28", 0.4)})` };
    case "editorial-chart":
    case "soft-gradient":
      return { fonts, ink: ink.text, shadow: "drop-shadow(0 14px 22px rgba(30, 30, 60, 0.18))" };
    case "editor-window":
      return { fonts, ink: ink.text, stroke: 0.9 };
    case "broadcast":
    case "rank-numbers":
    case "ui-cards":
      return { fonts, ink: ink.text, shadow: "drop-shadow(0 18px 30px rgba(0, 0, 0, 0.45))" };
    default:
      // blueprint: clean neon-ish vector with a soft cyan glow
      return { fonts, ink: ink.text, shadow: `drop-shadow(0 0 18px ${rgba(ink.accent3, 0.35)}) drop-shadow(0 20px 30px rgba(0, 0, 0, 0.45))` };
  }
};

/** How a look tints the 2D fx. */
export const lookFxTint = (ink: Ink): FxTint => {
  const L = ink.look;
  const base: FxTint = {
    palette: [ink.accent, ink.accent2, ink.accent3, ink.good],
    spark: ink.accent2,
    splash: ink.accent,
    scribble: ink.accent,
    lines: ink.look.light ? ink.text : "#FFFFFF",
    leak: L.light ? ["#FFC98B", "#FF9A8B"] : ["#FFB347", "#FF5E7E"],
    light: L.light,
    grain: L.light ? 0.08 : 0.1,
    glow: !L.light,
    outline: null,
    wash: false,
  };
  switch (L.id) {
    case "whiteboard":
      return { ...base, scribble: ink.text, glow: false };
    case "watercolor":
      return { ...base, splash: ink.accent3, wash: true, glow: false };
    case "chalkboard":
      return { ...base, palette: [ink.text, ink.accent2, ink.accent, ink.accent3], spark: ink.text, scribble: ink.text, splash: ink.text, glow: false };
    case "risograph":
      return { ...base, palette: [ink.accent, "#FF48B0", ink.accent2, ink.accent], spark: "#FF48B0", glow: false };
    case "ukiyo-e":
      return { ...base, splash: ink.text, scribble: ink.text, lines: ink.text, glow: false };
    case "pop-comic":
      return { ...base, outline: "#111111", lines: "#111111", scribble: "#111111", glow: false };
    case "paper-collage":
      return { ...base, glow: false };
    default:
      return base;
  }
};
