// Headless sandbox for the pixel-world runtime: runs the composition script in a vm with a recording canvas stub, so tests and
// tools can measure what a frame draws (coverage and detail per frame third) without a browser. Deterministic.
import vm from "node:vm";
import { payloadSchema } from "./schema.mjs";
import { normalizePayload } from "./normalize.mjs";
import { resolvePayload } from "./resolve.mjs";
import { buildScript } from "./compose.mjs";
import { FRAME } from "./layout.mjs";

const CELL = 5, COLS = Math.ceil(FRAME.w / CELL), ROWS = Math.ceil(FRAME.h / CELL);

function makeCtx(grid, state) {
  const st = { x: 0, y: 0 }, stack = [];
  const ctx = {
    fillStyle: "#000", globalAlpha: 1, font: "", textAlign: "left", textBaseline: "top", globalCompositeOperation: "source-over", imageSmoothingEnabled: false,
    save() { stack.push({ ...st, a: ctx.globalAlpha, op: ctx.globalCompositeOperation }); }, restore() { const s = stack.pop(); if (s) { st.x = s.x; st.y = s.y; ctx.globalAlpha = s.a; ctx.globalCompositeOperation = s.op; } },
    translate(x, y) { st.x += x; st.y += y; }, scale() {}, rotate() {}, beginPath() {}, rect() {}, clip() {}, clearRect() {}, drawImage() {},
    createPattern() { return { pattern: true }; },
    fillRect(x, y, w, h) {
      if (!(w > 0 && h > 0) || ctx.globalCompositeOperation === "lighter") return;
      const key = (typeof ctx.fillStyle === "string" ? ctx.fillStyle : "pat") + (ctx.globalAlpha < 1 ? "~" : "");
      const x0 = Math.max(0, Math.floor((x + st.x) / CELL)), x1 = Math.min(COLS - 1, Math.floor((x + st.x + w - 1) / CELL));
      const y0 = Math.max(0, Math.floor((y + st.y) / CELL)), y1 = Math.min(ROWS - 1, Math.floor((y + st.y + h - 1) / CELL));
      for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) grid[r][c] = key;
    },
    fillText(s, x, y) {
      const fs = parseFloat(ctx.font) || 8, w = String(s).length * fs, x0 = x - (ctx.textAlign === "center" ? w / 2 : ctx.textAlign === "right" ? w : 0);
      (ctx.__texts ??= []).push({ s: String(s), x: x0 + st.x, y: y + st.y, w, h: fs });
      ctx.fillRect(x0, y, w, fs);
    },
  };
  ctx.__grid = grid; ctx.__reset = () => { for (const row of grid) row.fill(null); ctx.__texts = []; };
  return ctx;
}

const emptyGrid = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(null));

/** Loads the composition script into a vm. Returns { at(t) -> frame snapshot, run(code) -> value of an expression in the runtime scope }. */
export function open({ data, style }) {
  const grid = emptyGrid(), state = {}, ctxs = {}, elems = {};
  const CANVAS = new Set(["cb", "cm", "cf", "cu"]);
  const el = (id) => ({ id, style: {}, className: "", textContent: "", children: [], appendChild() {}, getContext() { return ctxs[id] ?? (ctxs[id] = makeCtx(CANVAS.has(id) ? grid : emptyGrid(), state)); }, _grid: null });
  const sandbox = {
    console, Math, JSON, Promise, Map, Set, Array, Object, Number, String,
    document: { getElementById: (id) => (elems[id] ??= el(id)), createElement: (tag) => el(tag), fonts: { load: () => Promise.resolve() } },
    window: { addEventListener() {}, __hyperframes: { getVariables: () => ({}) } },
    gsap: { timeline: () => ({ to() { return this; } }) },
  };
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(buildScript({ data, style }), ctx, { filename: "pixel-world-composition.js" });
  const hudCtx = elems.ch.getContext("2d");
  return {
    run: (code) => vm.runInContext(code, ctx),
    at(t) {
      for (const row of grid) row.fill(null);
      hudCtx.__reset?.();
      vm.runInContext(`renderAt(${JSON.stringify(t)})`, ctx);
      const thirds = [0, 1, 2].map((k) => {
        const r0 = Math.floor((ROWS * k) / 3), r1 = Math.floor((ROWS * (k + 1)) / 3), counts = new Map();
        let total = 0, covered = 0;
        for (let r = r0; r < r1; r++) for (let c = 0; c < COLS; c++) { total++; const v = grid[r][c]; if (v) { covered++; counts.set(v, (counts.get(v) ?? 0) + 1); } }
        const modal = Math.max(0, ...counts.values());
        return { covered: covered / total, detail: (covered - modal) / total, colours: counts.size };
      });
      return { grid, cols: COLS, rows: ROWS, cell: CELL, thirds, hud: hudCtx.__grid };
    },
    /** Texts the HUD canvas drew in the last at(t): { s, x, y, w, h } in logical px (glyph box from the font size, outline copies included). */
    hudTexts: () => hudCtx.__texts ?? [],
  };
}
/** One-shot frame snapshot. */
export const snapshot = ({ data, style, t }) => open({ data, style }).at(t);

/** Validates + resolves a payload exactly as compose() does, returning the data and style for snapshot(). */
export function prepare({ hf, words, durationSec = 12, mode = "multi" }) {
  const parsed = payloadSchema.safeParse(normalizePayload(hf));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `hf.${i.path.join(".")}: ${i.message}`).join("; "));
  const r = resolvePayload({ payload: parsed.data, words, durationSec, mode });
  return { data: r.data, style: r.style, warnings: r.warnings };
}
