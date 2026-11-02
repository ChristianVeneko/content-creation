import type { ReelsPlan } from "./reels/tipos";

export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};

export type CaptionPage = { startMs: number; endMs: number; words: Caption[] };

export type Animation = "pop" | "slide" | "typewriter" | "zoom";
export type ThreeTemplateId = "clay-diorama" | "iso-toon" | "neon-glass" | "pedestal" | "paper-world" | "toy-blocks" | "holo-studio" | "neon-grid" | "soft-studio" | "moody-night" | "voxel-world" | "data-stage" | "monolith-story" | "clay-mascot";
export type ArtTemplateId = "watercolor" | "paper-collage" | "chalkboard" | "risograph" | "ukiyo-e" | "pop-comic";
export type FormatTemplateId = "ui-cards" | "flat-depth" | "soft-gradient" | "host-tutorial" | "checklist-glass" | "spotlight-narrative";
export type PixelTemplateId = "pixel-dusk" | "pixel-night" | "pixel-arcade" | "pixel-mono" | "pixel-versus";
export type ReelsTemplateId = "reels-nube" | "reels-noche" | "reels-menta" | "reels-limon" | "reels-pizarra";
export type TemplateId = "illustrated" | "captions-voice" | "kinetic-type" | "countdown" | "glass-cards" | "letterbox" | "whiteboard" | "broadcast" | "editorial-chart" | "editor-window" | "rank-numbers" | ArtTemplateId | FormatTemplateId | ThreeTemplateId | PixelTemplateId | ReelsTemplateId;
export type CaptionStyle =
  | "hormozi"
  | "clean"
  | "boxed"
  | "pills"
  | "chips"
  | "two-tone"
  | "karaoke"
  | "punch"
  | "typewriter"
  | "dialog"
  | "neon"
  | "underline"
  | "minimal"
  | "pixel";
export type CaptionSize = "s" | "m" | "l" | "xl";
export type CaptionPosition = "top" | "upper" | "center" | "lower" | "bottom";
export type CaptionBand = { top: number; height: number };
/** Resolved caption colors (lib/captions.mjs deriveCaptionColors): words, active word, word box, stroke/shadow. */
export type CaptionColors = { text: string; highlight: string; box: string; outline: string };

/** Resolved caption look (lib/captions.mjs resolveCaptionLook). */
export type CaptionLook = {
  style: CaptionStyle;
  size: CaptionSize;
  scale: number;
  position: CaptionPosition | null;
  band: CaptionBand;
  /** Same as colors.highlight (kept for older callers). */
  accent: string;
  customAccent: boolean;
  colors: CaptionColors;
  /** Not-yet-spoken word color (dimmer than colors.text, still 4.5:1 over the background). Optional for older callers. */
  dim?: string;
  /** "strong" when the word color is close to the background: text-only styles thicken their halo. */
  halo?: "strong" | "normal";
  uppercase?: boolean;
  speaker?: string;
};

/** Illustration element (see lib/illustration-schema.mjs). Loosely typed: the schema validates it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Element = { type: string; id?: string; at?: number; color?: string } & Record<string, any>;

/** 3D object of a `scene3d` visual (see lib/scene3d.mjs). */
export type Object3D = {
  kind: string;
  id?: string;
  label?: string;
  color?: string;
  value?: number | string;
  values?: number[];
  items?: string[];
  icon?: string;
  model?: string;
  /** character kind: looping animation */
  anim?: string;
  size?: number;
  pos?: [number, number, number];
  at?: number;
  highlight?: boolean;
};

export type Visual = {
  type: "gradient" | "image" | "video" | "emoji" | "icon" | "illustration" | "scene3d" | "reel" | "pixel" | "drawing";
  src?: string;
  query?: string;
  emoji?: string;
  prompt?: string;
  elements?: Element[];
  objects?: Object3D[];
  layout?: string;
  camera?: string;
  focus?: string;
  connect?: { from: string; to: string; label?: string }[];
  explode?: boolean;
  /** scene3d: environment set (lib/scene3d.mjs SETS_3D) */
  set?: string;
  /** Reels scene (lib/reels.mjs): type + the pack's fields + `en` moments. */
  reel?: Record<string, unknown>;
  /** Pixel-art scene (lib/pixel.mjs): set, props, character, banner, panels. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pixel?: Record<string, any>;
  /** Agent drawing of the classic templates (lib/drawing.mjs): {id, viewBox, parts, motion, keys}. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawing?: { id?: string; viewBox?: string; parts: any[]; motion?: any[]; keys?: any[] };
  /** 2D fx (lib/fx2d.mjs) or 3D fx (scene3d visuals). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fx?: any[];
};

export type HudValue = { label?: string; value?: string | number; color?: string };
export type HudItem = { id: string; type: "chip" | "label" | "bar" } & HudValue;

export type Scene = {
  id: string;
  narration: string;
  onScreenText?: string;
  durationSec?: number;
  visual: Visual;
  animation: Animation;
  title?: { kicker?: string; main: string; quote?: boolean; color?: string };
  hud?: Record<string, HudValue>;
};

export type Palette = { bg: string[]; text: string; accent: string; accent2?: string; accent3?: string };

/** VideoSpec after template defaults were applied (see lib/spec.mjs resolveSpec). */
export type ResolvedSpec = {
  version: 1;
  title: string;
  template: TemplateId;
  language: string;
  format: { width: number; height: number; fps: number };
  theme: { palette: Palette; font: string; captionStyle: CaptionStyle; look?: string; look3d?: string };
  voice: { provider: string; voiceId?: string; speed?: number };
  music: { file?: string; track?: string; volume: number; duck?: boolean };
  sfx?: { enabled: boolean; volume: number };
  hud?: { items: HudItem[] };
  brand?: { handle?: string; avatar?: string };
  captions: {
    enabled: boolean;
    wordsPerPage: number;
    style?: CaptionStyle;
    size?: CaptionSize;
    position?: CaptionPosition;
    accent?: string;
    colors?: Partial<CaptionColors>;
    uppercase?: boolean;
    speaker?: string;
  };
  scenes: Scene[];
};

export type TimelineScene = { from: number; durationInFrames: number; speechStartMs: number; speechSec: number };

export type Box = { x: number; y: number; w: number; h: number };
export type Typing = { start: number; cps: number; lineStarts: number[]; end: number };
/** One element after layout + timing (lib/illustrated.mjs planScene). Times are seconds into the scene. */
export type Planned = { el: Element; box: Box | null; enter: number; items: number[]; typing?: Typing; left?: Planned[]; right?: Planned[] };
export type ScenePlan = { scale: number; offsetY: number; stackH: number; elements: Planned[]; moments?: Record<string, number> };
/** Classic templates with drawings or 2D fx (lib/drawing.mjs planDrawings): word moments in scene seconds. */
export type DrawingPlan = { kind: "drawing2d"; moments: Record<string, number>; elements: [] };
export type IconData = { viewBox: string; back: string[]; outline: string[] };

/** One planned 3D object (lib/scene3d.mjs planScene3d). Times are seconds into the scene. */
export type Placed3D = { pos: [number, number, number]; scale: number; h: number; enter: number; items: number[]; half?: number; /** corner-pinned mascot: placed from the camera each frame */ corner?: "bl" | "br" | "tl" | "tr" };
export type World3D = { concept: string; ground: { kind?: string; color?: string; size?: number } | null; backdrop: string | null; parts: Record<string, unknown>[]; crowd: { count: number; area: [number, number]; pos?: [number, number, number]; height?: number; color?: string } | null };
export type CameraFrame = { target: [number, number, number]; dist: number; viewH: number };
export type ScenePlan3D = {
  kind: "scene3d";
  /** environment set (resolved: never "auto") */
  set?: string;
  /** the agent-built world of this scene (parts already expanded) */
  world?: World3D | null;
  layout: string;
  move: string;
  frame: CameraFrame;
  focus: number | null;
  explode: boolean;
  objects: Placed3D[];
  connections: { from: number; to: number; label?: string; enter: number }[];
};
/** One planned pixel scene (lib/pixel.mjs planPixelScene). Times are seconds into the scene. */
export type PixelPlan = {
  kind: "pixel";
  set: string;
  camera: string;
  transition: string;
  props: { x: number; enter: number }[];
  panelAt: number;
  checks: number[];
  /** pixel-versus: the ROUND card window and the reveal time of each ranking / verdict row (seconds into the scene) */
  round?: { at: number; until: number };
  rows?: number[];
};
export type ThreeAssets = { hdri: string | null; models: Record<string, string> };

export type RenderProps = {
  spec: ResolvedSpec;
  timeline: { scenes: TimelineScene[]; totalFrames: number; transitionFrames: number };
  captionPages: CaptionPage[];
  /** Paths relative to the public dir (use staticFile) or absolute http(s) URLs. */
  assets: { narration: string | null; music: string | null; visuals: (string | null)[]; bed?: string | null; avatar?: string | null; three?: ThreeAssets | null };
  /** illustrated-kit templates: ScenePlan per scene; 3D templates: ScenePlan3D per scene */
  illustration?: (ScenePlan | ScenePlan3D | PixelPlan | DrawingPlan | null)[] | null;
  icons?: Record<string, IconData>;
  /** reels templates: the plan from lib/reels.mjs planReels */
  reels?: ReelsPlan | null;
};
