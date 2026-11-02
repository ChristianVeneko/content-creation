// Illustrated template planning (pure, shared by the Node build and the Remotion bundle):
//   1. layout: stack each scene's elements inside the stage box without overlaps,
//   2. timing: auto-stagger element entrances and their inner items across the scene,
//   3. beats: one timeline of visual events (cuts, pops, ticks, typing, stamps) that also drives the SFX,
//   4. word moments of the scene's drawings and 2D fx (lib/drawing.mjs).
import { drawingMoments } from "./drawing.mjs";

import { ART_LOOKS, FORMAT_2D_LOOKS, LOOKS } from "./illustrated-looks.mjs";

export { ART_LOOKS, FORMAT_2D_LOOKS, LOOKS };
export const ILLUSTRATED_TEMPLATE_IDS = ["illustrated", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers", ...ART_LOOKS, ...FORMAT_2D_LOOKS];
export const usesIllustratedKit = (templateId) => ILLUSTRATED_TEMPLATE_IDS.includes(templateId);
/** The look of a resolved spec: theme.look when set, else the template's own look, else blueprint. */
export const lookOf = (spec) => {
  const look = spec?.theme?.look;
  if (LOOKS.includes(look)) return look;
  return LOOKS.includes(spec?.template) ? spec.template : "blueprint";
};

/** Frame regions (px, 1080x1920). Everything visible stays inside x 90..990, y 220..1500. */
export const REGIONS = {
  hud: { x: 90, y: 222, w: 900, h: 92 },
  title: { x: 90, y: 336, w: 900, h: 236 },
  stage: { x: 90, y: 590, w: 900, h: 650 },
  captions: { x: 90, y: 1268, w: 900, h: 124 },
  footer: { x: 90, y: 1418, w: 900, h: 72 },
};

export const PACING = {
  firstEnterSec: 0.55, // first element after the scene cut + headline
  holdSec: 1.4, // nothing new appears in the last 1.4 s of a scene (reading time)
  itemLeadSec: 0.4, // first item of an element appears this long after the element
  minItemStep: 0.32,
  maxItemStep: 1.5,
  typeCps: 30, // typed characters per second (code/terminal)
};

const GAP = 28;
// Overlays take no room in the column: stamps aimed at a target and callouts without a label.
// An untargeted stamp and a labelled callout (its tag) get their own row so they never cover content.
// The host and the mascot are persistent character slots drawn in fixed frame positions, never in the column.
export const SLOT_TYPES = ["host", "mascot"];
const isOverlay = (e) => (e.type === "stamp" && e.target) || (e.type === "callout" && !e.label) || SLOT_TYPES.includes(e.type);
export const MAX_UPSCALE = 1;
/**
 * How much a look may enlarge a sparse stage (the blueprint look never upscales). An upscaled stack is laid out
 * at a narrower width (stage width / scale) so after scaling it still spans exactly the stage width.
 */
export const LOOK_UPSCALE = {
  blueprint: 1,
  whiteboard: 1.2,
  "broadcast": 1.15,
  "editorial-chart": 1.3,
  "editor-window": 1.3,
  "rank-numbers": 1.25,
  watercolor: 1.25,
  "paper-collage": 1.2,
  chalkboard: 1.2,
  risograph: 1.25,
  "ukiyo-e": 1.2,
  "pop-comic": 1.2,
  "ui-cards": 1.35,
  "flat-depth": 1.5,
  "soft-gradient": 1.4,
  "host-tutorial": 1.25,
  "checklist-glass": 1.3,
  "spotlight-narrative": 1.2,
};

/**
 * Depth pass of a look (opt-in): looks listed here get soft contact shadows under elements, gradient panel fills
 * with a top highlight, a ground plane, parallax background layers drifting slowly, and a vignette
 * (src/illustrated/depth.tsx). Looks not listed render exactly as before; the hand-drawn and printed looks keep
 * their flat media on purpose.
 * - shadow: "soft" (dark scenes) | "paper" (light paper lifted off the page)
 * - fill: "gradient" (lit top, shaded bottom) | "flat"
 * - ground: "grid" (perspective grid floor) | "floor" (glossy studio floor) | "stage" (lit round podium) | "table" (wood table in perspective) | "none"
 * - parallax: number of background layers that drift at different speeds (0 = none)
 * - vignette: 0..1 darkness of the frame edges
 */
export const LOOK_DEPTH = {
  blueprint: { shadow: "soft", fill: "gradient", ground: "grid", parallax: 2, vignette: 0.35 },
  broadcast: { shadow: "soft", fill: "gradient", ground: "floor", parallax: 2, vignette: 0.3 },
  "editorial-chart": { shadow: "paper", fill: "gradient", ground: "none", parallax: 0, vignette: 0.12 },
  "rank-numbers": { shadow: "soft", fill: "gradient", ground: "stage", parallax: 2, vignette: 0.3 },
  "ui-cards": { shadow: "soft", fill: "gradient", ground: "none", parallax: 2, vignette: 0.45 },
  "flat-depth": { shadow: "soft", fill: "gradient", ground: "table", parallax: 1, vignette: 0.4 },
  "soft-gradient": { shadow: "paper", fill: "gradient", ground: "none", parallax: 2, vignette: 0.08 },
  "host-tutorial": { shadow: "paper", fill: "flat", ground: "none", parallax: 0, vignette: 0.1 },
  "checklist-glass": { shadow: "paper", fill: "gradient", ground: "none", parallax: 2, vignette: 0.06 },
  "spotlight-narrative": { shadow: "soft", fill: "gradient", ground: "none", parallax: 2, vignette: 0.6 },
};
/** The depth pass of a look, or null when the look keeps its flat media. */
export const depthOf = (look) => (Object.hasOwn(LOOK_DEPTH, look) ? LOOK_DEPTH[look] : null);
const wrapLines = (text, width, fontPx, em = 0.58) => {
  const perLine = Math.max(4, Math.floor(width / (fontPx * em)));
  let lines = 1;
  let cur = 0;
  for (const w of String(text).split(/\s+/)) {
    const len = [...w].length;
    if (cur && cur + 1 + len > perLine) {
      lines++;
      cur = len;
    } else cur += (cur ? 1 : 0) + len;
  }
  return lines;
};
/**
 * Words of a headline with its accent word flagged: the word between *asterisks*, else the last word of a headline
 * of two or more words (the serif-italic / gradient accent of the host-tutorial and checklist-glass headlines).
 */
export function splitAccent(text) {
  const raw = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const words = raw.map((w) => ({ text: w.replace(/\*/g, ""), accent: w.includes("*") }));
  if (words.some((w) => w.accent)) return words;
  if (words.length > 1) words[words.length - 1].accent = true;
  return words;
}

/** "Checklist 3 / 12" -> {n: 3, total: 12, label: "Checklist"} (the progress pill); null when there is no "n / N". */
export function parseProgress(text) {
  const m = /^(.*?)\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*$/.exec(String(text ?? "").trim());
  return m ? { n: Number(m[2]), total: Number(m[3]), label: m[1].trim() } : null;
}
const label = (x) => (typeof x === "string" ? x : x.label ?? x.text ?? "");

/** Natural height (px) of one element rendered at width `w`. Mirrors the renderer's sizes. */
export function measure(el, w) {
  switch (el.type) {
    case "card": {
      const narrow = w < 520; // icon stacks above the title
      const tw = narrow ? w - 56 - 30 : w - 72 - (el.icon ? 124 : 0);
      const t = wrapLines(el.title, tw, 54, 0.7) * 62;
      const b = (el.body ?? []).reduce((a, l) => a + wrapLines(l, tw - 30, 38) * 50 + 6, 0);
      if (narrow) return 30 + (el.icon ? 112 : 0) + t + (b ? 16 + b : 0) + 34;
      return Math.max(el.icon ? 176 : 0, 40 + t + (b ? 16 + b : 0) + 40);
    }
    case "flow": {
      const n = el.nodes.length;
      if (el.direction === "horizontal") return 190;
      return n * 92 + (n - 1) * 52;
    }
    case "compare": {
      const rows = Math.max(el.left.items.length, el.right.items.length);
      return 120 + rows * 74 + 30;
    }
    case "checklist":
      return (el.title ? 74 : 0) + el.items.reduce((a, it) => a + Math.max(80, wrapLines(label(it), w - 150, 42) * 54 + 26), 0) + 30;
    case "bars":
      return (el.title ? 70 : 0) + 380;
    case "counter":
      return 230 + (el.label ? 66 : 0);
    case "code":
    case "terminal":
      return 70 + el.lines.length * 54 + 36;
    case "chat":
      return el.messages.reduce((a, m) => a + 44 + wrapLines(m.text, w * 0.78 - 56, 38) * 50 + 22, 0);
    case "doc":
      return 112 + el.lines.reduce((a, l) => a + wrapLines(l, Math.min(w, 720) - 120, 36) * 50 + 8, 0) + 50 + (el.stamp ? 90 : 0);
    case "timeline":
      return 250;
    case "icon":
      return { s: 170, m: 250, l: 340 }[el.size ?? "m"] + (el.label ? 70 : 0);
    case "badge":
      return 104;
    case "svg":
      return (el.height ?? 360) + (el.label ? 64 : 0);
    case "drawing":
      return (el.height ?? 420) + (el.label ? 64 : 0);
    case "split": {
      const cw = (w - 60) / 2;
      return Math.max(stackHeight(el.left, cw), stackHeight(el.right, cw));
    }
    case "stamp":
      return 150;
    case "callout":
      return 56;
    // ---- format elements (ui-cards, flat-depth, soft-gradient) ----
    case "post": {
      const tw = Math.min(w, 860) - 80;
      return 150 + el.lines.reduce((a, l) => a + wrapLines(l, tw, 40) * 54 + 6, 0) + 40;
    }
    case "chart":
      return (el.title ? 76 : 0) + 420;
    case "meter":
      return (el.label ? 64 : 0) + 440 + (el.caption ? 60 : 0);
    case "hourglass":
      return 300 + (el.label ? 60 : 0);
    case "tags":
      return 340;
    case "stat":
      return 210 + (el.label ? 64 : 0);
    case "timer":
      return (el.clock ? 330 : 0) + 150 + (el.label ? 56 : 0);
    case "panels":
      return w < 520 ? 120 + el.items.length * 210 : 540;
    case "object":
      return 300 + (el.label ? 64 : 0);
    case "character":
      return 400 + (el.label ? 64 : 0);
    // ---- host-tutorial, checklist-glass, spotlight-narrative ----
    case "window":
      return 84 + el.rows.length * 88 + (el.button ? 96 : 0) + 28;
    case "roadmap":
      return 150 + el.items.length * 68 + 28;
    case "beacon":
      return 560;
    default:
      return 0;
  }
}

const stackHeight = (els, w) => {
  const flow = els.filter((e) => !isOverlay(e));
  return flow.reduce((a, e) => a + measure(e, w), 0) + Math.max(0, flow.length - 1) * GAP;
};

/** Layout a list of elements in a column of width `w`; boxes are relative to the column origin. */
function layoutColumn(els, w) {
  let y = 0;
  return els.map((el) => {
    if (isOverlay(el)) return { el, box: null };
    const h = measure(el, w);
    const out = { el, box: { x: 0, y, w, h } };
    y += h + GAP;
    if (el.type === "split") {
      const cw = (w - 60) / 2;
      out.left = layoutColumn(el.left, cw).map((c) => ({ ...c, box: c.box && { ...c.box, y: c.box.y + (h - stackHeight(el.left, cw)) / 2 } }));
      out.right = layoutColumn(el.right, cw).map((c) => ({ ...c, box: c.box && { ...c.box, x: c.box.x + cw + 60, y: c.box.y + (h - stackHeight(el.right, cw)) / 2 } }));
    }
    return out;
  });
}

const itemCount = (el) => {
  switch (el.type) {
    case "flow":
      return el.nodes.length;
    case "compare":
      return Math.max(el.left.items.length, el.right.items.length);
    case "checklist":
    case "bars":
      return el.items.length;
    case "timeline":
      return el.steps.length;
    case "chat":
      return el.messages.length;
    case "doc":
      return el.lines.length + (el.stamp ? 1 : 0);
    case "card":
      return (el.body ?? []).length;
    case "svg":
      return el.paths.length;
    case "post":
      return el.lines.length;
    case "window":
      return el.rows.length;
    case "roadmap":
      return el.items.length;
    case "chart":
    case "tags":
    case "panels":
      return el.items.length;
    case "meter":
      return el.stamp ? 1 : 0;
    default:
      return 0;
  }
};

const round = (x) => Math.round(x * 1000) / 1000;

/** Assign entrance times (seconds into the scene) to elements; explicit `at` wins, the rest are spread evenly. */
export function staggerTimes(els, sceneSec) {
  const start = PACING.firstEnterSec;
  const end = Math.max(start + 0.2, sceneSec - PACING.holdSec - 0.6);
  const auto = els.filter((e) => e.at === undefined).length;
  const step = auto > 1 ? (end - start) / (auto - 1) : 0;
  let k = 0;
  return els.map((e) => {
    if (e.at !== undefined) return round(Math.min(Math.max(0, e.at), Math.max(0, sceneSec - 0.6)));
    const idx = k++;
    // Never wait more than 3.2 s between entrances; long scenes fill the gaps with item reveals.
    return round(Math.min(start + step * idx, start + idx * 3.2));
  });
}

/** Item reveal times for one element entering at `enter`, filling the time until `until`. */
export function itemTimes(el, enter, until) {
  const n = itemCount(el);
  if (!n) return [];
  if (el.type === "code" || el.type === "terminal") return [];
  const first = enter + PACING.itemLeadSec;
  const avail = Math.max(0, until - first);
  const step = Math.min(PACING.maxItemStep, Math.max(PACING.minItemStep, n > 1 ? avail / n : 0));
  // svg paths are drawn quickly one after another, not paced like reading items
  const s = el.type === "svg" ? Math.min(step, 0.22) : step;
  return Array.from({ length: n }, (_, i) => round(first + i * s));
}

/** Typing plan for code/terminal: per-line start times and characters per second. */
export function typingPlan(el, enter, until) {
  const lines = el.lines.map((l) => [...l].length);
  const chars = lines.reduce((a, b) => a + b, 0);
  const start = enter + 0.35;
  const avail = Math.max(0.5, until - start);
  const cps = Math.max(PACING.typeCps, chars / avail);
  const lineStarts = [];
  let t = start;
  for (const n of lines) {
    lineStarts.push(round(t));
    t += n / cps + 0.12;
  }
  return { start: round(start), cps: round(cps), lineStarts, end: round(t) };
}

/**
 * Plan one scene: layout boxes + timing. `sceneSec` is the visible length of the scene (before the next cut).
 * Returns {scale, offsetY, stackH, elements: Planned[]} where Planned = {el, box, enter, items, typing?, left?, right?}.
 */
export function planScene(elements, sceneSec, { maxUpscale = MAX_UPSCALE } = {}) {
  const H = REGIONS.stage.h;
  let W = REGIONS.stage.w;
  let stackH = stackHeight(elements, W);
  const want = Math.min(maxUpscale, H / Math.max(1, stackH));
  if (want > 1) {
    W = Math.round(REGIONS.stage.w / want);
    stackH = stackHeight(elements, W);
  }
  const laid = layoutColumn(elements, W);
  const scale = Math.min(maxUpscale, REGIONS.stage.w / W, H / Math.max(1, stackH));
  const offsetY = Math.max(0, (REGIONS.stage.h - stackH * scale) / 2);
  const enters = staggerTimes(elements, sceneSec);
  const order = enters.map((t, i) => [t, i]).sort((a, b) => a[0] - b[0]);
  const nextEnter = new Array(elements.length);
  order.forEach(([, i], k) => (nextEnter[i] = k + 1 < order.length ? order[k + 1][0] : sceneSec - PACING.holdSec));
  const planned = laid.map((l, i) => {
    const enter = enters[i];
    const until = Math.max(enter + 0.6, Math.min(nextEnter[i], sceneSec - PACING.holdSec));
    const p = { ...l, enter, items: itemTimes(l.el, enter, until) };
    if (l.el.type === "code" || l.el.type === "terminal") p.typing = typingPlan(l.el, enter, until);
    if (l.el.type === "split") {
      const kids = [...l.left, ...l.right];
      const span = Math.max(0.3, until - enter);
      const step = kids.length > 1 ? Math.min(2.2, span / kids.length) : 0;
      const plan = (c, k) => {
        const e = round(enter + 0.15 + k * step);
        const u = enter + 0.15 + (k + 1) * step + (k === kids.length - 1 ? span * 0.2 : 0);
        const q = { ...c, enter: c.el.at !== undefined ? c.el.at : e, items: itemTimes(c.el, e, u) };
        if (c.el.type === "code" || c.el.type === "terminal") q.typing = typingPlan(c.el, e, u);
        return q;
      };
      p.left = l.left.map((c, k) => plan(c, k));
      p.right = l.right.map((c, k) => plan(c, l.left.length + k));
    }
    return p;
  });
  return { scale: round(scale), offsetY: round(offsetY), stackH, w: W, elements: planned };
}

/** Visible scene length in seconds (the part before the next transition starts). */
export const sceneVisibleSec = (timeline, i, fps) => {
  const s = timeline.scenes[i];
  const last = i === timeline.scenes.length - 1;
  return (s.durationInFrames - (last ? 0 : timeline.transitionFrames)) / fps;
};

/**
 * Sound language of the art-style looks: which SFX kind a scene cut and an element entrance play (kinds of
 * lib/audio-bed.mjs SFX_KIT). Looks not listed keep the default (cut = whoosh, pop = pop).
 */
export const LOOK_SFX = {
  watercolor: { cut: "draw", pop: "tick" }, // soft brush whip on the dissolve, quiet taps for strokes
  "paper-collage": { cut: "page", pop: "tick" }, // paper slide on the cut, paper clicks for each scrap
  chalkboard: { cut: "draw", pop: "tick" }, // the smudge wipe is a swipe, chalk taps on the board
  "ukiyo-e": { cut: "page", pop: "tick" }, // the scroll turns, the brush lands
  "pop-comic": { cut: "stamp", pop: "pop" }, // every panel slam is an impact
};

/**
 * Plan every illustrated scene of a resolved spec. Non-illustration scenes get null. Scenes with drawings or 2D fx
 * also get `moments` (their word moments in scene seconds; `captions` = the build's word timing, else text-timed).
 */
export function planIllustration(spec, timeline, captions) {
  const fps = spec.format.fps;
  const look = lookOf(spec);
  const maxUpscale = LOOK_UPSCALE[look] ?? MAX_UPSCALE;
  const sfx = LOOK_SFX[look];
  const moments = drawingMoments(spec, timeline, captions);
  return spec.scenes.map((s, i) => {
    if (!(s.visual?.type === "illustration" && s.visual.elements?.length)) return null;
    const p = planScene(s.visual.elements, sceneVisibleSec(timeline, i, fps), { maxUpscale });
    const m = moments[i];
    const out = sfx ? { ...p, sfx } : p;
    return m ? { ...out, moments: m.moments, ...(m.warnings.length ? { warnings: m.warnings } : {}) } : out;
  });
}

/** Beats produced by one planned element, in scene-local seconds. */
function elementBeats(p) {
  const out = [];
  const el = p.el;
  const add = (t, kind) => out.push({ t: round(t), kind });
  const enterKind = { stamp: "stamp", doc: "page", callout: "draw", icon: "pop", svg: "draw", drawing: "draw", stat: "ding", post: "page" }[el.type] ?? "pop";
  add(el.type === "stamp" ? p.enter + 0.18 : p.enter + 0.08, enterKind);
  const itemKind = el.type === "checklist" ? "tick" : el.type === "doc" ? "tick" : el.type === "svg" ? null : "pop";
  p.items.forEach((t, k) => {
    if (!itemKind) return;
    if ((el.type === "doc" || el.type === "meter") && el.stamp && k === p.items.length - 1) add(t + 0.18, "stamp");
    else add(t + (itemKind === "tick" ? 0.25 : 0.06), itemKind);
  });
  if (p.typing) {
    const chars = el.lines.reduce((a, l) => a + [...l].length, 0);
    const every = Math.max(3, Math.ceil(chars / 28)); // at most ~28 key clicks per element
    let c = 0;
    el.lines.forEach((line, li) => {
      for (let j = 0; j < [...line].length; j++, c++) if (c % every === 0 && line[j] !== " ") add(p.typing.lineStarts[li] + j / p.typing.cps, "type");
    });
  }
  if (el.type === "counter") add(p.enter + 0.2 + 1.2, "ding");
  for (const kid of [...(p.left ?? []), ...(p.right ?? [])]) out.push(...elementBeats(kid));
  return out;
}

/**
 * The beat timeline of the whole video (global seconds): scene cuts plus every element/item event.
 * @returns {{t: number, kind: "cut"|"pop"|"tick"|"type"|"stamp"|"ding"|"page"|"draw", scene: number}[]}
 */
export function computeBeats(plan, timeline, fps) {
  const beats = [];
  const T = timeline.transitionFrames;
  timeline.scenes.forEach((s, i) => {
    const t0 = s.from / fps;
    const p = plan[i];
    // a look may voice its cuts and pops with other kit sounds (LOOK_SFX); the beat times never change
    const kindOf = (k) => p?.sfx?.[k] ?? k;
    if (i > 0) beats.push({ t: round((s.from + T / 2) / fps), kind: kindOf("cut"), scene: i });
    beats.push({ t: round(t0 + (i === 0 ? 0.05 : T / fps)), kind: "title", scene: i });
    if (!p) return;
    for (const e of p.elements) for (const b of elementBeats(e)) beats.push({ t: round(t0 + b.t), kind: kindOf(b.kind), scene: i });
  });
  return beats.sort((a, b) => a.t - b.t);
}

// ---------------- SFX scheduling ----------------

/** Lower number = more important; important beats are placed first and never displaced. */
export const SFX_PRIORITY = { cut: 0, stamp: 1, ding: 2, page: 3, title: 4, draw: 5, pop: 6, tick: 7, type: 8 };
const MIN_GAP = { type: 0.06, tick: 0.12, pop: 0.12, draw: 0.2, title: 0.3 };

/** Deterministic hash → [0,1). */
const rand = (a, b) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Turn beats into concrete sound events.
 * @param {{t: number, kind: string}[]} beats
 * @param {Record<string, {file: string, peakSec: number, durSec: number}[]>} pools sound variants per beat kind
 * @param {{maxOverlap?: number, jitter?: number}} opts
 * @returns {{t: number, start: number, kind: string, file: string, rate: number, durSec: number}[]} sorted by start
 *
 * - round-robin through each kind's variants in time order, playbackRate jittered by ±jitter,
 * - each sound starts early by its peak time so the peak lands on the beat (whoosh peak on the cut),
 * - at most `maxOverlap` sounds play at once; lower-priority beats are dropped first.
 */
export function scheduleSfx(beats, pools, { maxOverlap = 3, jitter = 0.06 } = {}) {
  const rr = {};
  const candidates = [...beats]
    .sort((a, b) => a.t - b.t)
    .filter((b) => pools[b.kind]?.length)
    .map((b, i) => {
      const pool = pools[b.kind];
      const k = (rr[b.kind] = (rr[b.kind] ?? -1) + 1);
      const v = pool[k % pool.length];
      const rate = round(1 + jitter * (2 * rand(i + 1, k + 7) - 1));
      const start = round(Math.max(0, b.t - v.peakSec / rate));
      return { t: b.t, start, kind: b.kind, file: v.file, rate, durSec: round(v.durSec / rate) };
    });
  candidates.sort((a, b) => (SFX_PRIORITY[a.kind] ?? 9) - (SFX_PRIORITY[b.kind] ?? 9) || a.t - b.t);
  const accepted = [];
  for (const c of candidates) {
    const end = c.start + c.durSec;
    const overlapping = accepted.filter((a) => a.start < end && c.start < a.start + a.durSec).length;
    if (overlapping >= maxOverlap) continue;
    const gap = MIN_GAP[c.kind] ?? 0;
    if (gap && accepted.some((a) => a.kind === c.kind && Math.abs(a.t - c.t) < gap)) continue;
    accepted.push(c);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

/** Max number of events sounding at the same time (for tests/diagnostics). */
export function maxConcurrent(events) {
  let max = 0;
  for (const e of events) max = Math.max(max, events.filter((o) => o.start <= e.start && e.start < o.start + o.durSec).length);
  return max;
}
