// Looks: the full visual + motion language of each illustrated-kit template.
import type React from "react";
// A look is more than a palette: fonts, panels, element entrances, camera, headline treatment,
// background, cut effect and scene transition (see transitions.tsx) all come from here.
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { lookOf } from "../../lib/illustrated.mjs";
import type { ResolvedSpec } from "../types";
import { MONO_FONT, fontStack } from "../fonts";
// OFL fonts of the art-style looks (licenses next to each file in public/looks/fonts and 03-assets/fonts).
import frauncesUrl from "../../public/looks/fonts/Fraunces-Variable.ttf";
import caveatUrl from "../../public/looks/fonts/Caveat-Variable.ttf";
import frederickaUrl from "../../public/looks/fonts/FrederickatheGreat-Regular.ttf";
import patrickUrl from "../../public/looks/fonts/PatrickHand-Regular.ttf";
import rubikMonoUrl from "../../public/looks/fonts/RubikMonoOne-Regular.ttf";
import spaceMonoUrl from "../../public/looks/fonts/SpaceMono-Bold.ttf";
import comicNeueUrl from "../../public/looks/fonts/ComicNeue-Bold.ttf";
import rubikUrl from "../../public/looks/fonts/Rubik-Variable.ttf";
import gloockUrl from "../../public/looks/fonts/Gloock-Regular.ttf";
import balooUrl from "../../public/looks/fonts/Baloo2-Variable.ttf";
import chakraUrl from "../../public/looks/fonts/ChakraPetch-SemiBold.ttf";
import shareTechUrl from "../../public/looks/fonts/ShareTechMono-Regular.ttf";

export type ArtLookId = "watercolor" | "paper-collage" | "chalkboard" | "risograph" | "ukiyo-e" | "pop-comic";
export type FormatLookId = "ui-cards" | "flat-depth" | "soft-gradient" | "host-tutorial" | "checklist-glass" | "spotlight-narrative" | "data-atlas";
export type LookId = "blueprint" | "whiteboard" | "broadcast" | "editorial-chart" | "editor-window" | "rank-numbers" | ArtLookId | FormatLookId;

/**
 * How elements enter the stage.
 * Art looks: bloom (wash bleeds in from a blur), stopmo (12 fps paper slide), chalk (written on with dust),
 * misprint (plates land out of register, then snap together), brush (ink spreads from a blot), slam (comic impact).
 */
export type Entrance = "pop" | "marker" | "snap" | "rise" | "flicker" | "bounce" | "bloom" | "stopmo" | "chalk" | "misprint" | "brush" | "slam" | "drop";
/**
 * How the scene camera moves while a scene plays.
 * Art looks: float (slow pendulum sway), jitter (stop-motion camera shake at 12 fps), tilt (slow pan up the board),
 * plate (press creep), scroll (handscroll pan), dutch (tilted panel punch).
 */
export type Camera = "push" | "boil" | "punch" | "drift" | "static" | "settle" | "float" | "jitter" | "tilt" | "plate" | "scroll" | "dutch" | "dolly";

export type Look = {
  id: LookId;
  /** Headline / element display font. */
  display: string;
  displayWeight: number;
  /** Uppercase the display text. */
  upper: boolean;
  /** Average glyph width in em of the display font (for fit-to-width). */
  displayEm: number;
  body: string;
  bodyWeight: number;
  mono: string;
  /** Light background: surfaces are light, ink is dark. */
  light: boolean;
  /** Surface + utility colors, merged into the Ink. */
  colors: {
    surface: string;
    surface2: string;
    line: string;
    muted: string;
    good: string;
    bad: string;
    paper: string;
    paperInk: string;
    codeBg: string;
    codeBar: string;
    termBg: string;
    stampBg: string;
    /** Hard drop shadow color under display text ("transparent" = none). */
    drop: string;
  };
  panel: { radius: number; border: number; shadow: string; rough: boolean; accentBar: boolean };
  enter: Entrance;
  camera: Camera;
  /** Hand-drawn strokes re-seed a few times per second (marker boil). */
  boil: boolean;
  /** Stroke width multiplier for drawn lines and arrows. */
  stroke: number;
};

const fs = fontStack;

export const LOOKS: Record<LookId, Look> = {
  blueprint: {
    id: "blueprint",
    display: fs("Montserrat"),
    displayWeight: 900,
    upper: true,
    displayEm: 0.72,
    body: fs("Inter"),
    bodyWeight: 700,
    mono: MONO_FONT,
    light: false,
    colors: {
      surface: "#131C38",
      surface2: "#1A2547",
      line: "rgba(160, 180, 255, 0.16)",
      muted: "#8F9BC4",
      good: "#3DDC97",
      bad: "#FF4D6D",
      paper: "#F4F1EA",
      paperInk: "#1B2033",
      codeBg: "#0E1530",
      codeBar: "#16204A",
      termBg: "#070A14",
      stampBg: "rgba(11, 16, 32, 0.55)",
      drop: "rgba(0, 0, 0, 0.45)",
    },
    panel: { radius: 30, border: 2, shadow: "0 24px 60px rgba(0,0,0,0.45)", rough: false, accentBar: true },
    enter: "pop",
    camera: "push",
    boil: false,
    stroke: 1,
  },
  whiteboard: {
    id: "whiteboard",
    display: `'Permanent Marker', ${fs("Kalam")}`,
    displayWeight: 400,
    upper: false,
    displayEm: 0.56,
    body: `'Kalam', ${fs("Inter")}`,
    bodyWeight: 700,
    mono: `'Kalam', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "rgba(255, 255, 255, 0.0)",
      surface2: "rgba(255, 255, 255, 0.55)",
      line: "rgba(31, 36, 48, 0.25)",
      muted: "#6B6F7B",
      good: "#1E9E5A",
      bad: "#E8452C",
      paper: "#FFFDF6",
      paperInk: "#1F2430",
      codeBg: "#FFFFFF",
      codeBar: "#F1EEE6",
      termBg: "#FFFFFF",
      stampBg: "rgba(255, 253, 246, 0.9)",
      drop: "transparent",
    },
    panel: { radius: 6, border: 0, shadow: "none", rough: true, accentBar: false },
    enter: "marker",
    camera: "boil",
    boil: true,
    stroke: 1.15,
  },
  "broadcast": {
    id: "broadcast",
    display: fs("Oswald"),
    displayWeight: 700,
    upper: true,
    displayEm: 0.5,
    body: fs("Oswald"),
    bodyWeight: 500,
    mono: fs("Oswald"),
    light: false,
    colors: {
      surface: "#141416",
      surface2: "#1F1F23",
      line: "rgba(255, 255, 255, 0.14)",
      muted: "#A3A3AD",
      good: "#FFFFFF",
      bad: "#E10600",
      paper: "#FFFFFF",
      paperInk: "#0A0A0C",
      codeBg: "#0E0E10",
      codeBar: "#E10600",
      termBg: "#050506",
      stampBg: "#E10600",
      drop: "rgba(0, 0, 0, 0.6)",
    },
    panel: { radius: 0, border: 0, shadow: "0 18px 40px rgba(0,0,0,0.55)", rough: false, accentBar: true },
    enter: "snap",
    camera: "punch",
    boil: false,
    stroke: 1,
  },
  "editorial-chart": {
    id: "editorial-chart",
    display: `'DM Serif Display', Georgia, serif`,
    displayWeight: 400,
    upper: false,
    displayEm: 0.5,
    body: fs("Inter"),
    bodyWeight: 600,
    mono: fs("Inter"),
    light: true,
    colors: {
      surface: "#FFF7F0",
      surface2: "#FFFBF7",
      line: "rgba(38, 42, 51, 0.16)",
      muted: "#66605A",
      good: "#0D7680",
      bad: "#C2312B",
      paper: "#FFFFFF",
      paperInk: "#262A33",
      codeBg: "#262A33",
      codeBar: "#33373F",
      termBg: "#1E2128",
      stampBg: "rgba(255, 241, 229, 0.92)",
      drop: "transparent",
    },
    panel: { radius: 4, border: 1, shadow: "0 1px 0 rgba(38,42,51,0.12)", rough: false, accentBar: false },
    enter: "rise",
    camera: "drift",
    boil: false,
    stroke: 0.7,
  },
  "editor-window": {
    id: "editor-window",
    display: MONO_FONT,
    displayWeight: 800,
    upper: false,
    displayEm: 0.6,
    body: MONO_FONT,
    bodyWeight: 700,
    mono: MONO_FONT,
    light: false,
    colors: {
      surface: "#1E1F29",
      surface2: "#282A36",
      line: "rgba(98, 114, 164, 0.4)",
      muted: "#7D88B3",
      good: "#50FA7B",
      bad: "#FF5555",
      paper: "#282A36",
      paperInk: "#F8F8F2",
      codeBg: "#1E1F29",
      codeBar: "#14151B",
      termBg: "#0E0F14",
      stampBg: "rgba(21, 22, 28, 0.85)",
      drop: "transparent",
    },
    panel: { radius: 12, border: 2, shadow: "0 20px 50px rgba(0,0,0,0.5)", rough: false, accentBar: false },
    enter: "flicker",
    camera: "static",
    boil: false,
    stroke: 0.8,
  },
  "rank-numbers": {
    id: "rank-numbers",
    display: fs("Anton"),
    displayWeight: 400,
    upper: true,
    displayEm: 0.46,
    body: fs("Montserrat"),
    bodyWeight: 800,
    mono: fs("Montserrat"),
    light: false,
    colors: {
      surface: "#2E0C52",
      surface2: "#3D1170",
      line: "rgba(255, 255, 255, 0.18)",
      muted: "#C9A8F0",
      good: "#00E5A0",
      bad: "#FF3D7F",
      paper: "#FFFFFF",
      paperInk: "#22073A",
      codeBg: "#1A0530",
      codeBar: "#2E0C52",
      termBg: "#14031F",
      stampBg: "rgba(34, 7, 58, 0.7)",
      drop: "#12021F",
    },
    panel: { radius: 40, border: 4, shadow: "0 14px 0 rgba(18,2,31,0.65)", rough: false, accentBar: false },
    enter: "bounce",
    camera: "settle",
    boil: false,
    stroke: 1.2,
  },
  // ---------------- art-style looks (src/illustrated/artstyles.tsx draws their media) ----------------
  watercolor: {
    id: "watercolor",
    display: `'Fraunces', Georgia, serif`,
    displayWeight: 650,
    upper: false,
    displayEm: 0.54,
    body: `'Caveat', ${fs("Inter")}`,
    bodyWeight: 700,
    mono: `'Caveat', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "rgba(255, 255, 255, 0)",
      surface2: "rgba(255, 252, 244, 0.55)",
      line: "rgba(59, 58, 54, 0.22)",
      muted: "#7A7268",
      good: "#4F8F5B",
      bad: "#C2475A",
      paper: "#FBF6EA",
      paperInk: "#3B3A36",
      codeBg: "#FBF6EA",
      codeBar: "#EFE5D0",
      termBg: "#F3EAD7",
      stampBg: "rgba(251, 246, 234, 0.85)",
      drop: "transparent",
    },
    panel: { radius: 46, border: 0, shadow: "none", rough: false, accentBar: false },
    enter: "bloom",
    camera: "float",
    boil: false,
    stroke: 0.9,
  },
  "paper-collage": {
    id: "paper-collage",
    display: fs("Archivo Black"),
    displayWeight: 400,
    upper: true,
    displayEm: 0.68,
    body: `'Rubik', ${fs("Inter")}`,
    bodyWeight: 600,
    mono: `'Rubik', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "#FBF7EE",
      surface2: "#FBF7EE",
      line: "rgba(30, 26, 23, 0.25)",
      muted: "#6E5B48",
      good: "#2E8B57",
      bad: "#E84A2F",
      paper: "#FBF7EE",
      paperInk: "#1E1A17",
      codeBg: "#FBF7EE",
      codeBar: "#E9DFC9",
      termBg: "#1E1A17",
      stampBg: "#FBF7EE",
      drop: "rgba(40, 24, 10, 0.35)",
    },
    panel: { radius: 0, border: 0, shadow: "4px 6px 0 rgba(40,24,10,0.22), 10px 16px 22px rgba(40,24,10,0.28)", rough: false, accentBar: false },
    enter: "stopmo",
    camera: "jitter",
    boil: false,
    stroke: 1.1,
  },
  chalkboard: {
    id: "chalkboard",
    display: `'Fredericka the Great', 'Patrick Hand', serif`,
    displayWeight: 400,
    upper: false,
    displayEm: 0.62,
    body: `'Patrick Hand', ${fs("Inter")}`,
    bodyWeight: 400,
    mono: `'Patrick Hand', ${MONO_FONT}`,
    light: false,
    colors: {
      surface: "rgba(255, 255, 255, 0)",
      surface2: "rgba(255, 255, 255, 0.04)",
      line: "rgba(242, 241, 234, 0.3)",
      muted: "#A9B8AE",
      good: "#B8E6A0",
      bad: "#F2A0B6",
      paper: "rgba(255, 255, 255, 0.05)",
      paperInk: "#F2F1EA",
      codeBg: "rgba(0, 0, 0, 0.18)",
      codeBar: "rgba(0, 0, 0, 0.25)",
      termBg: "rgba(0, 0, 0, 0.25)",
      stampBg: "rgba(28, 43, 38, 0.6)",
      drop: "transparent",
    },
    panel: { radius: 4, border: 0, shadow: "none", rough: true, accentBar: false },
    enter: "chalk",
    camera: "tilt",
    boil: false,
    stroke: 1.1,
  },
  risograph: {
    id: "risograph",
    display: `'Rubik Mono One', ${fs("Archivo Black")}`,
    displayWeight: 400,
    upper: true,
    displayEm: 0.84,
    body: `'Space Mono', ${MONO_FONT}`,
    bodyWeight: 700,
    mono: `'Space Mono', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "rgba(0, 120, 191, 0.10)",
      surface2: "rgba(0, 120, 191, 0.12)",
      line: "rgba(29, 35, 92, 0.3)",
      muted: "#5B6290",
      good: "#00A95C",
      bad: "#FF48B0",
      paper: "#F5F0E4",
      paperInk: "#1D235C",
      codeBg: "rgba(0, 120, 191, 0.12)",
      codeBar: "rgba(255, 72, 176, 0.35)",
      termBg: "rgba(29, 35, 92, 0.9)",
      stampBg: "rgba(245, 240, 228, 0.6)",
      drop: "rgba(255, 72, 176, 0.75)",
    },
    panel: { radius: 0, border: 0, shadow: "none", rough: false, accentBar: false },
    enter: "misprint",
    camera: "plate",
    boil: false,
    stroke: 1.2,
  },
  "ukiyo-e": {
    id: "ukiyo-e",
    display: `'Gloock', Georgia, serif`,
    displayWeight: 400,
    upper: false,
    displayEm: 0.56,
    body: `'Rubik', ${fs("Inter")}`,
    bodyWeight: 500,
    mono: `'Rubik', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "rgba(247, 239, 220, 0.6)",
      surface2: "rgba(250, 244, 230, 0.78)",
      line: "rgba(26, 26, 26, 0.3)",
      muted: "#6D6253",
      good: "#3E6B48",
      bad: "#C8372D",
      paper: "#F7EFDC",
      paperInk: "#1A1A1A",
      codeBg: "#F7EFDC",
      codeBar: "#E3D3B0",
      termBg: "#1A1A1A",
      stampBg: "#C8372D",
      drop: "transparent",
    },
    panel: { radius: 2, border: 3, shadow: "none", rough: false, accentBar: false },
    enter: "brush",
    camera: "scroll",
    boil: false,
    stroke: 1.3,
  },
  "pop-comic": {
    id: "pop-comic",
    display: fs("Bangers"),
    displayWeight: 400,
    upper: true,
    displayEm: 0.46,
    body: `'Comic Neue', ${fs("Inter")}`,
    bodyWeight: 700,
    mono: `'Comic Neue', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "#FFFFFF",
      surface2: "#FFFFFF",
      line: "#111111",
      muted: "#3B3B3B",
      good: "#00A651",
      bad: "#E8262B",
      paper: "#FFFFFF",
      paperInk: "#111111",
      codeBg: "#FFFFFF",
      codeBar: "#FFD400",
      termBg: "#111111",
      stampBg: "#FFD400",
      drop: "#111111",
    },
    panel: { radius: 0, border: 7, shadow: "12px 12px 0 #111111", rough: false, accentBar: false },
    enter: "slam",
    camera: "dutch",
    boil: false,
    stroke: 1.4,
  },
  // ---------------- format looks with depth (src/illustrated/formats2d.tsx) ----------------
  "ui-cards": {
    id: "ui-cards",
    display: fs("Montserrat"),
    displayWeight: 900,
    upper: true,
    displayEm: 0.72,
    body: fs("Inter"),
    bodyWeight: 600,
    mono: MONO_FONT,
    light: false,
    colors: {
      surface: "#141A28",
      surface2: "#1C2436",
      line: "rgba(255, 255, 255, 0.10)",
      muted: "#8A93A8",
      good: "#46D39A",
      bad: "#FF5A5F",
      paper: "#0B0F17",
      paperInk: "#E8ECF4",
      codeBg: "#0B0F17",
      codeBar: "#1C2436",
      termBg: "#070A10",
      stampBg: "rgba(12, 16, 26, 0.55)",
      drop: "rgba(0, 0, 0, 0.55)",
    },
    panel: { radius: 18, border: 2, shadow: "0 30px 60px -18px rgba(0,0,0,0.7)", rough: false, accentBar: false },
    enter: "pop",
    camera: "push",
    boil: false,
    stroke: 1,
  },
  "flat-depth": {
    id: "flat-depth",
    display: `'Baloo 2', ${fs("Poppins")}`,
    displayWeight: 800,
    upper: false,
    displayEm: 0.56,
    body: `'Baloo 2', ${fs("Inter")}`,
    bodyWeight: 700,
    mono: `'Baloo 2', ${MONO_FONT}`,
    light: false,
    colors: {
      surface: "#2B3070",
      surface2: "#353B85",
      line: "rgba(255, 255, 255, 0.14)",
      muted: "#A9AFDA",
      good: "#5FD38D",
      bad: "#FF6B6B",
      paper: "#F4F1FA",
      paperInk: "#1E2148",
      codeBg: "#191C44",
      codeBar: "#252A63",
      termBg: "#11132F",
      stampBg: "rgba(20, 22, 58, 0.6)",
      drop: "rgba(10, 10, 40, 0.5)",
    },
    panel: { radius: 28, border: 0, shadow: "0 26px 50px -16px rgba(5,5,30,0.7)", rough: false, accentBar: false },
    enter: "drop",
    camera: "dolly",
    boil: false,
    stroke: 1,
  },
  "soft-gradient": {
    id: "soft-gradient",
    display: `'Rubik', ${fs("Poppins")}`,
    displayWeight: 800,
    upper: false,
    displayEm: 0.6,
    body: `'Rubik', ${fs("Inter")}`,
    bodyWeight: 500,
    mono: `'Rubik', ${MONO_FONT}`,
    light: true,
    colors: {
      surface: "rgba(255, 255, 255, 0.55)",
      surface2: "rgba(255, 255, 255, 0.78)",
      line: "rgba(42, 35, 64, 0.12)",
      muted: "#77708F",
      good: "#1FAE7A",
      bad: "#F0567A",
      paper: "rgba(255, 255, 255, 0.85)",
      paperInk: "#2A2340",
      codeBg: "#2A2340",
      codeBar: "#3A3158",
      termBg: "#211B33",
      stampBg: "rgba(255, 255, 255, 0.7)",
      drop: "transparent",
    },
    panel: { radius: 40, border: 0, shadow: "0 40px 70px -24px rgba(80,60,160,0.35)", rough: false, accentBar: false },
    enter: "rise",
    camera: "drift",
    boil: false,
    stroke: 0.9,
  },
  // numbered host tutorial: warm paper, hard-shadow cards, a serif-italic accent word
  "host-tutorial": {
    id: "host-tutorial",
    display: fs("Montserrat"),
    displayWeight: 800,
    upper: false,
    displayEm: 0.6,
    body: fs("Inter"),
    bodyWeight: 600,
    mono: MONO_FONT,
    light: true,
    colors: {
      surface: "#FFFDF8",
      surface2: "#FFFFFF",
      line: "rgba(42, 33, 24, 0.18)",
      muted: "#6A5B4B",
      good: "#1C7F52",
      bad: "#C23B2A",
      paper: "#FFFFFF",
      paperInk: "#2A2118",
      codeBg: "#2A2118",
      codeBar: "#3C3126",
      termBg: "#1E1812",
      stampBg: "rgba(255, 253, 248, 0.85)",
      drop: "transparent",
    },
    panel: { radius: 22, border: 3, shadow: "8px 8px 0 rgba(42, 33, 24, 0.92)", rough: false, accentBar: false },
    enter: "pop",
    camera: "settle",
    boil: false,
    stroke: 1,
  },
  // glass checklist: pastel mesh, frosted UI-mockup cards, a progress pill and a mascot slot
  "checklist-glass": {
    id: "checklist-glass",
    display: fs("Montserrat"),
    displayWeight: 800,
    upper: false,
    displayEm: 0.6,
    body: fs("Inter"),
    bodyWeight: 600,
    mono: MONO_FONT,
    light: true,
    colors: {
      surface: "rgba(255, 255, 255, 0.55)",
      surface2: "rgba(255, 255, 255, 0.74)",
      line: "rgba(38, 35, 61, 0.14)",
      muted: "#58547A",
      good: "#13875F",
      bad: "#C93560",
      paper: "rgba(255, 255, 255, 0.86)",
      paperInk: "#26233D",
      codeBg: "#26233D",
      codeBar: "#36325A",
      termBg: "#1D1B33",
      stampBg: "rgba(255, 255, 255, 0.75)",
      drop: "transparent",
    },
    panel: { radius: 36, border: 2, shadow: "0 34px 60px -26px rgba(70, 50, 150, 0.4)", rough: false, accentBar: false },
    enter: "rise",
    camera: "drift",
    boil: false,
    stroke: 0.95,
  },
  // cinematic flat-vector narrative: dark vignette, one spotlight cone, glowing rings, slow push-ins
  "spotlight-narrative": {
    id: "spotlight-narrative",
    display: `'Fraunces', ${fs("Montserrat")}`,
    displayWeight: 700,
    upper: false,
    displayEm: 0.56,
    body: fs("Inter"),
    bodyWeight: 600,
    mono: MONO_FONT,
    light: false,
    colors: {
      surface: "#141722",
      surface2: "#1B1F2E",
      line: "rgba(255, 255, 255, 0.12)",
      muted: "#A3A9C2",
      good: "#4FD1A0",
      bad: "#FF7385",
      paper: "#0E1017",
      paperInk: "#ECEFF8",
      codeBg: "#0E1017",
      codeBar: "#1B1F2E",
      termBg: "#090B11",
      stampBg: "rgba(12, 14, 22, 0.6)",
      drop: "rgba(0, 0, 0, 0.6)",
    },
    panel: { radius: 20, border: 1, shadow: "0 36px 70px -24px rgba(0,0,0,0.85)", rough: false, accentBar: false },
    enter: "rise",
    camera: "push",
    boil: false,
    stroke: 1,
  },
  // data-documentary: layered illustrated scenes with haze, glow and a vignette, a dark pill counter and paper props
  "data-atlas": {
    id: "data-atlas",
    display: fs("Montserrat"),
    displayWeight: 800,
    upper: false,
    displayEm: 0.64,
    body: fs("Inter"),
    bodyWeight: 600,
    mono: MONO_FONT,
    light: false,
    colors: {
      surface: "#0F1424",
      surface2: "#171D33",
      line: "rgba(255, 255, 255, 0.14)",
      muted: "#9DA8C8",
      good: "#4FD1A0",
      bad: "#FF5A5F",
      paper: "#E8DCB9",
      paperInk: "#2A1F14",
      codeBg: "#0B0F1C",
      codeBar: "#171D33",
      termBg: "#080B14",
      stampBg: "rgba(8, 11, 22, 0.7)",
      drop: "rgba(0, 0, 0, 0.6)",
    },
    panel: { radius: 22, border: 1, shadow: "0 30px 60px -22px rgba(0,0,0,0.85)", rough: false, accentBar: false },
    enter: "rise",
    camera: "drift",
    boil: false,
    stroke: 1,
  },
};

export const lookFor = (spec: ResolvedSpec): Look => LOOKS[lookOf(spec) as LookId] ?? LOOKS.blueprint;

/** Display text style of a look (family, weight, case). */
export const displayStyle = (look: Look): React.CSSProperties => ({
  fontFamily: look.display,
  fontWeight: look.displayWeight,
  textTransform: look.upper ? "uppercase" : "none",
});

// Extra fonts used only by some looks (OFL / Apache-2.0, see public/fonts/*-OFL.txt and *-LICENSE.txt).
const LOOK_FONTS: { family: string; url?: string; file?: string; weight: string }[] = [
  { family: "Permanent Marker", file: "PermanentMarker-Regular.ttf", weight: "400" },
  { family: "Kalam", file: "Kalam-Bold.ttf", weight: "700" },
  { family: "DM Serif Display", file: "DMSerifDisplay-Regular.ttf", weight: "400" },
  // art-style looks (bundled by webpack, so no build staging is needed)
  { family: "Fraunces", url: frauncesUrl, weight: "100 900" },
  { family: "Caveat", url: caveatUrl, weight: "400 700" },
  { family: "Fredericka the Great", url: frederickaUrl, weight: "400" },
  { family: "Patrick Hand", url: patrickUrl, weight: "400" },
  { family: "Rubik Mono One", url: rubikMonoUrl, weight: "400" },
  { family: "Space Mono", url: spaceMonoUrl, weight: "700" },
  { family: "Comic Neue", url: comicNeueUrl, weight: "700" },
  { family: "Rubik", url: rubikUrl, weight: "300 900" },
  { family: "Gloock", url: gloockUrl, weight: "400" },
  { family: "Baloo 2", url: balooUrl, weight: "400 800" },
  { family: "Chakra Petch", url: chakraUrl, weight: "600" },
  { family: "Share Tech Mono", url: shareTechUrl, weight: "400" },
];
let loading: Promise<void> | null = null;

/** Idempotent: loads the look fonts once and blocks rendering until they are ready. */
export const ensureLookFonts = (): void => {
  if (loading || typeof document === "undefined") return;
  const handle = delayRender("Loading look fonts");
  loading = Promise.all(
    LOOK_FONTS.map((f) =>
      new FontFace(f.family, `url('${f.url ?? staticFile(`fonts/${f.file}`)}') format('truetype')`, { weight: f.weight }).load().then((face) => {
        document.fonts.add(face);
      }),
    ),
  )
    .then(() => continueRender(handle))
    .catch((e) => cancelRender(e));
};
