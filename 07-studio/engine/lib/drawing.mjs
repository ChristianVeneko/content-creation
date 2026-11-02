// Agent-drawn 2D vector art: the `drawing` element of the illustrated kit and `visual.drawing` of the classic
// templates. A drawing is a viewBox of named parts (path, rect, circle, ellipse, polygon, line, text, group) with a
// parent hierarchy, palette-role fills (or hex, or gradients), stroke draw-on, and per-part keyframes + motion presets
// timed in seconds or narration words (the reels `en` syntax, shared with pixel and 3D through lib/motion.mjs).
// Schemas + pure math only: src/components/Drawing2D.tsx renders it (restyled per look). No Node built-ins.
import { z } from "zod";
import { EASE, hash01, keyTrack, sampleTrack, smooth } from "./motion.mjs";
import { momentError, resolveMomentStrings, sceneWords } from "./scene3d-motion.mjs";

import { COLOR_TOKENS, DRAW_MOTION_ABOUT, DRAW_MOTIONS, DRAW_ROLES, DRAW_SHAPES, MAX_DRAW_PARTS, MAX_PATH_CHARS, PART_TARGETING, SHAPE_FIELDS, drawPartSchema, drawingFields } from "./drawing-schema.mjs";

export { COLOR_TOKENS, DRAW_MOTION_ABOUT, DRAW_MOTIONS, DRAW_ROLES, DRAW_SHAPES, MAX_DRAW_PARTS, MAX_PATH_CHARS, SHAPE_FIELDS, drawPartSchema, drawingFields };

/** `visual.drawing` of the classic templates. */
export const drawingVisualSchema = z
  .object({ id: z.string().min(1).max(40).optional().describe("fx `target`"), type: z.literal("drawing").optional(), ...drawingFields })
  .strict()
  .superRefine((d, ctx) => drawingIssues(d).forEach((i) => ctx.addIssue({ code: "custom", path: i.path, message: i.message })));

// ---------------- validation ----------------

const presetOf = (m) => (typeof m === "string" ? m : m.type);

/**
 * Cross-field checks of one drawing: shapes and their geometry, budgets, ids, parents, cycles, motion and moments.
 * @returns {{path: (string|number)[], message: string}[]} paths relative to the drawing
 */
export function drawingIssues(d) {
  const out = [];
  const add = (path, message) => out.push({ path, message });
  const at = (path, m) => {
    const e = momentError(m);
    if (e) add(path, e);
  };
  const parts = d.parts ?? [];
  const ids = new Map();
  parts.forEach((p, i) => {
    if (ids.has(p.id)) add(["parts", i, "id"], `duplicate part id "${p.id}"`);
    else ids.set(p.id, p);
  });
  const chars = parts.reduce((a, p) => a + (p.shape === "path" && p.d ? p.d.length : 0), 0);
  if (chars > MAX_PATH_CHARS) add(["parts"], `the drawing has ${chars} path characters; the budget is ${MAX_PATH_CHARS} (simplify the paths or use shapes)`);
  const checkKeys = (keys, base) => (keys ?? []).forEach((k, i) => at([...base, i, "at"], k.at));
  const checkMotion = (motion, base, isPart) =>
    (motion ?? []).forEach((m, i) => {
      const type = presetOf(m);
      if (!DRAW_MOTIONS.includes(type)) return add([...base, i], `unknown motion "${type}"; use one of: ${DRAW_MOTIONS.join(", ")}`);
      if (typeof m === "object") {
        at([...base, i, "at"], m.at);
        at([...base, i, "until"], m.until);
      }
      const listed = typeof m === "object" ? m.parts : undefined;
      if (listed && isPart) return add([...base, i, "parts"], "a part's motion moves that part; drop `parts` (or put the motion on the drawing)");
      if (listed && !PART_TARGETING.includes(type)) return add([...base, i, "parts"], `\`parts\` works with ${PART_TARGETING.join(", ")}; put ${type} on the parts themselves`);
      if (!isPart && type === "blink" && !listed) add([...base, i], "blink needs `parts` (the eye part ids) when it is on the drawing");
      (listed ?? []).forEach((pid, k) => {
        if (!ids.has(pid)) add([...base, i, "parts", k], `no part with id "${pid}" in this drawing`);
      });
    });
  parts.forEach((p, i) => {
    const base = ["parts", i];
    const spec = SHAPE_FIELDS[p.shape];
    if (!spec) {
      add([...base, "shape"], `unknown drawing shape "${p.shape}"; use one of: ${DRAW_SHAPES.join(", ")}`);
    } else {
      for (const f of spec.need) if (p[f] === undefined) add([...base, f], `${p.shape} needs \`${f}\` (${spec.about})`);
      if (p.shape === "polygon" && p.points && p.points.length < 3) add([...base, "points"], "polygon needs at least 3 points");
      if (p.shape === "line" && !p.points && [p.x1, p.y1, p.x2, p.y2].some((v) => v === undefined)) add([...base, "x1"], "line needs `x1`, `y1`, `x2`, `y2` (or `points` for a polyline)");
    }
    if (p.parent !== undefined && !ids.has(p.parent)) add([...base, "parent"], `no part with id "${p.parent}" in this drawing`);
    at([...base, "at"], p.at);
    checkMotion(p.motion, [...base, "motion"], true);
    checkKeys(p.keys, [...base, "keys"]);
  });
  // parent cycles: report once per cycle, on its first part
  const reported = new Set();
  parts.forEach((p, i) => {
    if (reported.has(p.id)) return;
    const chain = [p.id];
    let cur = p;
    while (cur?.parent !== undefined && ids.has(cur.parent)) {
      if (cur.parent === p.id) {
        add(["parts", i, "parent"], `parent cycle: ${[...chain, p.id].join(" -> ")}`);
        chain.forEach((c) => reported.add(c));
        break;
      }
      if (chain.includes(cur.parent)) break; // a cycle further up: reported from its own part
      chain.push(cur.parent);
      cur = ids.get(cur.parent);
    }
  });
  checkMotion(d.motion, ["motion"], false);
  checkKeys(d.keys, ["keys"]);
  return out;
}

/** Every string moment used by a drawing (parts, keys, motion). */
export function drawingMomentStrings(d, out = new Set()) {
  const add = (m) => {
    if (typeof m === "string") out.add(m);
  };
  const node = (x) => {
    add(x.at);
    for (const k of x.keys ?? []) add(k.at);
    for (const m of x.motion ?? []) if (typeof m === "object") (add(m.at), add(m.until));
  };
  if (!d) return out;
  for (const k of d.keys ?? []) add(k.at);
  for (const m of d.motion ?? []) if (typeof m === "object") (add(m.at), add(m.until));
  for (const p of d.parts ?? []) node(p);
  return out;
}

/** Every string moment of a drawing with its path (relative to the drawing): [{path, m}], for word checks. */
export function drawingMomentPaths(d) {
  const out = [];
  const add = (path, m) => {
    if (typeof m === "string") out.push({ path, m });
  };
  const node = (x, base) => {
    add([...base, "at"], x.at);
    (x.keys ?? []).forEach((k, i) => add([...base, "keys", i, "at"], k.at));
    (x.motion ?? []).forEach((m, i) => {
      if (m && typeof m === "object") (add([...base, "motion", i, "at"], m.at), add([...base, "motion", i, "until"], m.until));
    });
  };
  if (!d) return out;
  node({ keys: d.keys, motion: d.motion }, []);
  (d.parts ?? []).forEach((p, i) => node(p, ["parts", i]));
  return out;
}

// ---------------- geometry ----------------

const r1 = (x) => Math.round(x * 100) / 100;
/** viewBox string -> {x, y, w, h}. */
export const parseViewBox = (vb) => {
  const [x, y, w, h] = String(vb ?? "0 0 400 400").trim().split(/\s+/).map(Number);
  return { x: x || 0, y: y || 0, w: w || 400, h: h || 400 };
};

/** Points visited by an SVG path (end and control points), absolute. Good enough for a bounding box. */
export function pathPoints(d) {
  const toks = String(d).match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const pts = [];
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const n = () => Number(toks[i++]);
  const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const lc = cmd.toLowerCase();
    const rel = cmd !== cmd.toUpperCase();
    if (!(lc in ARGS)) break;
    if (lc === "z") {
      cx = sx;
      cy = sy;
      if (i < toks.length && !/[a-zA-Z]/.test(toks[i])) i++;
      continue;
    }
    if (i + ARGS[lc] > toks.length) break;
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;
    if (lc === "h") cx = n() + (rel ? cx : 0);
    else if (lc === "v") cy = n() + (rel ? cy : 0);
    else if (lc === "a") {
      i += 5;
      cx = n() + ox;
      cy = n() + oy;
    } else {
      const k = ARGS[lc] / 2;
      for (let j = 0; j < k; j++) {
        const px = n() + ox;
        const py = n() + oy;
        pts.push([px, py]);
        if (j === k - 1) {
          cx = px;
          cy = py;
        }
      }
    }
    pts.push([cx, cy]);
    if (lc === "m") {
      sx = cx;
      sy = cy;
      cmd = rel ? "l" : "L"; // extra pairs after a moveto are linetos
    }
  }
  return pts;
}

const boxOf = (pts) => {
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

/** Bounding box of one part's own shape (viewBox units, before transforms), or null (group). */
export function partBox(p) {
  switch (p.shape) {
    case "rect":
      return { x: p.x ?? 0, y: p.y ?? 0, w: p.w ?? 0, h: p.h ?? 0 };
    case "circle":
      return { x: (p.cx ?? 0) - (p.r ?? 0), y: (p.cy ?? 0) - (p.r ?? 0), w: 2 * (p.r ?? 0), h: 2 * (p.r ?? 0) };
    case "ellipse":
      return { x: (p.cx ?? 0) - (p.rx ?? 0), y: (p.cy ?? 0) - (p.ry ?? 0), w: 2 * (p.rx ?? 0), h: 2 * (p.ry ?? 0) };
    case "polygon":
      return boxOf(p.points ?? []);
    case "line":
      return boxOf(p.points ?? [[p.x1 ?? 0, p.y1 ?? 0], [p.x2 ?? 0, p.y2 ?? 0]]);
    case "path":
      return boxOf(pathPoints(p.d ?? ""));
    case "text": {
      const size = p.size ?? 40;
      const w = [...(p.text ?? "")].length * size * 0.58;
      const x0 = (p.x ?? 0) - (p.anchor === "start" ? 0 : p.anchor === "end" ? w : w / 2);
      return { x: x0, y: (p.y ?? 0) - size * 0.8, w, h: size };
    }
    default:
      return null;
  }
}

const union = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/**
 * Render tree of a drawing: Map id -> {part, children, box (own shape, or the union of the children for groups),
 * origin (explicit, else the box center), order (index in parts)} plus `roots` (top-level ids, in order).
 * Parts in a parent cycle (rejected by the schema) are treated as roots.
 */
export function drawingLayout(parts) {
  const byId = new Map(parts.map((p, i) => [p.id, { part: p, children: [], order: i, box: partBox(p), origin: null }]));
  const roots = [];
  const ancestorCycle = (p) => {
    const seen = new Set([p.id]);
    for (let q = p; q.parent !== undefined && byId.has(q.parent); q = byId.get(q.parent).part) {
      if (seen.has(q.parent)) return true;
      seen.add(q.parent);
    }
    return false;
  };
  for (const p of parts) {
    const node = byId.get(p.id);
    if (node.part !== p) continue; // duplicate id (rejected by the schema)
    if (p.parent !== undefined && byId.has(p.parent) && !ancestorCycle(p)) byId.get(p.parent).children.push(p.id);
    else roots.push(p.id);
  }
  const fullBox = (id, depth = 0) => {
    const node = byId.get(id);
    let b = node.box;
    if (depth < MAX_DRAW_PARTS) for (const c of node.children) b = union(b, fullBox(c, depth + 1));
    return b;
  };
  for (const [id, node] of byId) {
    if (!node.box) node.box = fullBox(id);
    const b = node.box ?? { x: 0, y: 0, w: 0, h: 0 };
    node.origin = node.part.origin ? [...node.part.origin] : [r1(b.x + b.w / 2), r1(b.y + b.h / 2)];
  }
  const out = byId;
  out.roots = roots;
  return out;
}

// ---------------- motion ----------------

/** Motion entries normalized to objects (unknown presets dropped). */
export const drawMotionList = (motion) => (motion ?? []).map((m) => (typeof m === "string" ? { type: m } : m)).filter((m) => DRAW_MOTIONS.includes(m.type));

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const TAU = 2 * Math.PI;
const ONE_SHOT = ["pop-in", "slide-in-left", "slide-in-right", "fall", "draw-on", "shake"];

/**
 * Apply one preset to a state in place.
 * ctx: {sec, enter, seed, unit}; vb: {width, height} of the viewBox (slide-in / fall distances);
 * order: position of the part in the preset's `parts` list (staggered draw-on / pop-in).
 */
function applyPreset(s, m, t, ctx, vb, order = 0) {
  const stagger = order * (m.type === "draw-on" ? 0.12 : 0.08) / (m.speed ?? 1);
  const start = (m.at !== undefined ? ctx.sec(m.at) : ONE_SHOT.includes(m.type) ? (ctx.enter ?? 0) : 0) + stagger;
  const end = m.until !== undefined ? ctx.sec(m.until) : Infinity;
  const sp = m.speed ?? 1;
  const U = ctx.unit ?? 1;
  const tau = Math.min(t, end) - start;
  // continuous presets ramp in and out (no pops when a window opens or closes)
  const w = smooth((t - start) / 0.25) * (end === Infinity ? 1 : 1 - smooth((t - end) / 0.25 + 1));
  switch (m.type) {
    case "bob":
      s.y += w * (m.amp ?? 8 * U) * Math.sin(TAU * 0.8 * sp * tau);
      break;
    case "float":
      s.y += w * (m.amp ?? 12 * U) * Math.sin(TAU * 0.3 * sp * tau);
      s.x += w * (m.amp ?? 12 * U) * 0.35 * Math.sin(TAU * 0.21 * sp * tau + 1);
      s.rot += w * 2.5 * Math.sin(TAU * 0.23 * sp * tau + 2);
      break;
    case "sway":
      s.rot += w * (m.amp ?? 8) * Math.sin(TAU * 0.5 * sp * tau);
      break;
    case "spin":
      if (tau > 0) s.rot += (m.amp ?? 90) * sp * tau;
      break;
    case "pulse":
      s.sx *= 1 + w * (m.amp ?? 0.08) * (0.5 - 0.5 * Math.cos(TAU * 1.2 * sp * tau));
      s.sy *= 1 + w * (m.amp ?? 0.08) * (0.5 - 0.5 * Math.cos(TAU * 1.2 * sp * tau));
      break;
    case "wave": {
      const wl = smooth((t - start) / 0.35) * (end === Infinity ? 1 : 1 - smooth((t - end) / 0.35 + 1));
      s.rot += wl * ((m.lift ?? 0) + (m.amp ?? 22) * Math.sin(TAU * 1.6 * sp * tau));
      break;
    }
    case "wiggle":
      s.rot += w * (m.amp ?? 5) * (0.6 * Math.sin(TAU * 2.3 * sp * tau) + 0.4 * Math.sin(TAU * 3.7 * sp * tau + 1));
      break;
    case "squash": {
      const a = w * (m.amp ?? 0.07) * Math.sin(TAU * 1.1 * sp * tau);
      s.sy *= 1 + a;
      s.sx *= 1 - a * 0.6;
      break;
    }
    case "blink": {
      const period = 2.8 / sp;
      let close = 0;
      const k0 = Math.max(0, Math.floor((t - start) / period) - 1);
      for (let k = k0; k <= k0 + 2; k++) {
        const c = start + 0.7 + k * period + (hash01(ctx.seed ?? 0, "blink", k) - 0.5) * 0.9;
        close = Math.max(close, clamp01((0.1 - Math.abs(t - c)) / 0.05));
      }
      if (t >= start && t <= end) s.sy *= 1 - 0.92 * close;
      break;
    }
    case "pop-in": {
      if (t < start) {
        s.visible = false;
        s.sx = 0;
        s.sy = 0;
        break;
      }
      const u = EASE.back(clamp01((t - start) / (0.45 / sp)));
      s.sx *= u;
      s.sy *= u;
      break;
    }
    case "slide-in-left":
    case "slide-in-right": {
      if (t < start) {
        s.visible = false;
        s.opacity = 0;
      }
      const p = clamp01((t - start) / (0.55 / sp));
      const off = (1 - EASE.back(p)) * (m.amp ?? (vb?.width ?? 400) * 0.9);
      s.x += m.type === "slide-in-left" ? -off : off;
      s.opacity *= Math.min(1, p * 5);
      break;
    }
    case "fall": {
      if (t < start) {
        s.visible = false;
        s.opacity = 0;
      }
      const p = clamp01((t - start) / (0.8 / sp));
      s.y -= (1 - EASE.bounce(p)) * (m.amp ?? (vb?.height ?? 400) * 0.9);
      break;
    }
    case "shake": {
      const dur = m.until !== undefined ? Math.max(0.05, end - start) : 0.5 / sp;
      const u = t - start;
      if (u >= 0 && u <= dur) {
        const decay = m.until !== undefined ? 1 : 1 - u / dur;
        s.x += (m.amp ?? 6 * U) * decay * Math.sin(TAU * 13 * u);
        s.rot += 2 * decay * Math.sin(TAU * 9 * u + 1);
      }
      break;
    }
    case "draw-on": {
      const p = EASE.out(clamp01((t - start) / (0.8 / sp)));
      s.draw = s.draw === null ? p : Math.min(s.draw, p);
      break;
    }
    case "orbit": {
      const r = m.amp ?? 18 * U;
      const a = TAU * 0.25 * sp * Math.max(0, tau);
      s.x += w * r * Math.sin(a);
      s.y += w * r * (1 - Math.cos(a)) * 0.6;
      break;
    }
    default:
      break;
  }
}

/**
 * State of a part (or of the whole drawing when `partId` is null) at t seconds into the scene:
 * {x, y (offsets), rot (degrees), sx, sy, opacity, draw (0..1 stroke progress, or null = fully drawn), visible}.
 * Keys apply first, then motion presets. `inherited` = the drawing's motion: its blink / draw-on / pop-in entries with
 * `parts` reach the listed parts (draw-on without `parts` reaches every part in `drawn` order).
 *
 * @param {{keys?: any[], motion?: any[], at?: any, draw?: boolean}} node
 * @param {number} t
 * @param {{sec: (m: any) => number, enter?: number, seed?: number, unit?: number}} ctx
 * @param {{width: number, height: number} | null} [vb]
 * @param {any[]} [inherited]
 * @param {string | null} [partId]
 * @param {{drawn?: string[], order?: number, root?: boolean}} [opts]  drawn: the ids of the stroked parts in drawing order
 *   (the drawing's draw-on without parts); order: stagger index of a `draw: true` part; root: node is the drawing itself
 */
export function partState(node, t, ctx, vb = null, inherited = [], partId = null, opts = {}) {
  const keys = node.keys;
  const s = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, opacity: 1, draw: null, visible: true };
  if (keys?.length) {
    const tr = (f, map) => sampleTrack(keyTrack(keys, ctx.sec, f, map), t);
    s.x = tr("x") ?? 0;
    s.y = tr("y") ?? 0;
    s.rot = tr("rot") ?? 0;
    const sc = tr("scale", (v) => (Array.isArray(v) ? v : [v, v]));
    if (sc) [s.sx, s.sy] = sc;
    s.opacity = tr("opacity") ?? 1;
    const dr = tr("draw");
    if (dr !== undefined) s.draw = dr;
  }
  const isPart = partId !== null;
  for (const m of drawMotionList(node.motion)) {
    // on the drawing root, blink / draw-on / pop-in with `parts` (and draw-on without) reach its parts instead
    if (opts.root && ((m.parts && PART_TARGETING.includes(m.type)) || m.type === "draw-on")) continue;
    applyPreset(s, m, t, ctx, vb, 0);
  }
  if (isPart) {
    // the part's own entrance: `at` (fade in) and `draw: true` (draw-on from its appearance)
    if (node.draw) applyPreset(s, { type: "draw-on", at: node.at }, t, ctx, vb, node.at === undefined ? (opts.order ?? 0) : 0);
    else if (node.at !== undefined) {
      const a = ctx.sec(node.at);
      if (t < a) s.visible = false;
      s.opacity *= clamp01((t - a) / 0.2);
    }
    for (const m of drawMotionList(inherited)) {
      if (!PART_TARGETING.includes(m.type)) continue;
      const list = m.parts ?? (m.type === "draw-on" ? opts.drawn : null);
      const k = list ? list.indexOf(partId) : -1;
      if (k >= 0) applyPreset(s, m, t, ctx, vb, k);
    }
  }
  if (s.opacity <= 0.001) s.visible = false;
  return s;
}

// ---------------- planning ----------------

/** Every string moment of a scene's 2D layer: drawing elements (also inside split), visual.drawing and visual.fx. */
export function sceneMomentStrings2d(visual) {
  const out = new Set();
  const els = visual?.elements ?? [];
  for (const e of [...els, ...els.flatMap((x) => (x.type === "split" ? [...x.left, ...x.right] : []))]) {
    if (e.type === "drawing") drawingMomentStrings(e, out);
    if (e.type === "backdrop") for (const l of e.layers ?? []) drawingMomentStrings(l, out);
  }
  if (visual?.drawing) drawingMomentStrings(visual.drawing, out);
  for (const f of visual?.fx ?? []) {
    if (typeof f.at === "string") out.add(f.at);
    if (typeof f.until === "string") out.add(f.until);
  }
  return [...out];
}

/** Whether a scene visual has a 2D generative layer (a drawing or 2D fx). */
export const hasDrawing2d = (visual) =>
  Boolean(visual && visual.type !== "scene3d" && (visual.drawing || visual.fx?.length || (visual.elements ?? []).some((e) => e.type === "drawing" || e.type === "backdrop" || (e.type === "split" && [...e.left, ...e.right].some((c) => c.type === "drawing")))));

/**
 * Word moments of every scene with a 2D layer: [{moments, warnings} | null] (scene-relative seconds).
 * `captions` = the build's word captions (real voice timing); without them the text-timed words are used.
 */
export function drawingMoments(spec, timeline, captions) {
  if (!spec.scenes.some((s) => hasDrawing2d(s.visual))) return spec.scenes.map(() => null);
  const fps = spec.format?.fps ?? 30;
  const words = sceneWords(spec, timeline, captions);
  return spec.scenes.map((s, i) => {
    if (!hasDrawing2d(s.visual)) return null;
    return resolveMomentStrings(sceneMomentStrings2d(s.visual), words[i], timeline.scenes[i].durationInFrames, fps);
  });
}

/**
 * Plan of the classic templates' 2D layer: per scene {kind: "drawing2d", moments, elements: []} (elements stays
 * empty so the SFX beat timeline is unchanged), or null for the whole spec when nothing is drawn.
 */
export function planDrawings(spec, timeline, captions) {
  if (!spec.scenes.some((s) => hasDrawing2d(s.visual))) return null;
  return drawingMoments(spec, timeline, captions).map((m) => ({ kind: "drawing2d", moments: m?.moments ?? {}, warnings: m?.warnings ?? [], elements: [] }));
}
