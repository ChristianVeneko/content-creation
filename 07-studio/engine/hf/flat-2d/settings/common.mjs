// Shared building blocks for the settings. Coordinates are stage-local: 960 x 1040, floor line near y = 880.
// Layers must bleed past the stage so parallax never shows an edge: BL is the safe drawing area.
import { lighten, darken, mix, mulberry32 } from "../util.mjs";
export const W = 960, H = 1040;
export const BL = { x0: -330, y0: -520, x1: 1290, y1: 1560 };
export const FLOOR = 880;

const bg = { sh: false, st: false, r: 0 };
export const lt = (d, role, t) => lighten(d.col(role), t);
export const dk = (d, role, t) => darken(d.col(role), t);

/** A named, targetable group. `@name` placeholders become `{scenePrefix}-name` when the scene is assembled. */
export const named = (d, name, inner, box) => ({ svg: d.g(inner, { id: "@" + name }), name, box });

export const wallFloor = (d, floorY = FLOOR, o = {}) =>
  d.rect(BL.x0, BL.y0, BL.x1 - BL.x0, floorY - BL.y0, { f: o.wall ?? "wall", ...bg }) +
  d.rect(BL.x0, floorY, BL.x1 - BL.x0, BL.y1 - floorY, { f: o.floor ?? "floor", ...bg }) +
  d.rect(BL.x0, floorY - 16, BL.x1 - BL.x0, 16, { f: o.base ?? "surface2", op: 0.85, ...bg });

export const tiles = (d, y0, y1, size = 70, f = "surface2", op = 0.35) => {
  let s = "";
  for (let y = y0; y < y1; y += size) s += `<line x1="${BL.x0}" x2="${BL.x1}" y1="${y}" y2="${y}" stroke="${d.col(f)}" stroke-width="3" opacity="${op}"/>`;
  for (let x = BL.x0; x < BL.x1; x += size * 1.6) s += `<line x1="${x}" x2="${x}" y1="${y0}" y2="${y1}" stroke="${d.col(f)}" stroke-width="3" opacity="${op}"/>`;
  return s;
};
export const checker = (d, y0, rows, size, f1, f2, x0 = BL.x0, x1 = BL.x1) => {
  let s = "";
  for (let r = 0; r < rows; r++) for (let x = x0, i = 0; x < x1; x += size, i++) s += `<rect x="${x}" y="${y0 + r * size * 0.5}" width="${size}" height="${size * 0.5}" fill="${d.col((i + r) % 2 ? f1 : f2)}"/>`;
  return s;
};
export const windowFrame = (d, x, y, w, h, o = {}) => {
  const sky = o.sky ?? lt(d, "accent3", 0.55);
  return d.rect(x, y, w, h, { f: "surface2", r: 18 }) + d.rect(x + 14, y + 14, w - 28, h - 28, { f: sky, r: 10, sh: false }) +
    `<line x1="${x + w / 2}" x2="${x + w / 2}" y1="${y + 14}" y2="${y + h - 14}" stroke="${d.col("surface2")}" stroke-width="10"/><line x1="${x + 14}" x2="${x + w - 14}" y1="${y + h / 2}" y2="${y + h / 2}" stroke="${d.col("surface2")}" stroke-width="10"/>` +
    (o.sun ? d.circle(x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.1, { f: "warn", sh: false }) : "") +
    (o.cloud ? d.ellipse(x + w * 0.3, y + h * 0.28, w * 0.12, h * 0.05, { f: "surface", sh: false, op: 0.9 }) : "");
};
export const plant = (d, x, y, s = 1) =>
  d.g(d.path(`M${-34},0 L${34},0 L${24},${58} Q0,${66} ${-24},${58} Z`, { f: "accent", r: 8 }) +
    [-1, 0, 1].map((k) => d.path(`M0,-6 Q${k * 70},${-70 - Math.abs(k) * -20} ${k * 26},${-128 + Math.abs(k) * 22} Q${k * 10},${-70} 0,-6`, { f: "good", sh: false })).join("") +
    d.path("M0,-6 Q-14,-90 4,-160 Q22,-90 0,-6", { f: lt(d, "good", 0.12), sh: false }), { t: `translate(${x} ${y}) scale(${s})` });
export const lamp = (d, x, y, s = 1, on = true) =>
  d.g(d.rect(-6, -150, 12, 150, { f: "muted", r: 4, sh: false }) + d.ellipse(0, 4, 42, 10, { f: "muted", sh: false }) +
    d.path("M-46,-150 L46,-150 L28,-206 L-28,-206 Z", { f: "warn", r: 6 }) + (on ? `<ellipse cx="0" cy="-130" rx="60" ry="14" fill="${d.col("warn")}" opacity=".22"/>` : ""), { t: `translate(${x} ${y}) scale(${s})` });
export const clock = (d, x, y, r = 46) =>
  d.circle(x, y, r, { f: "surface", r: 0 }) + d.circle(x, y, r * 0.88, { f: "surface2", sh: false, st: false }) +
  `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - r * 0.55}" stroke="${d.col("ink")}" stroke-width="5" stroke-linecap="round"/><line x1="${x}" y1="${y}" x2="${x + r * 0.4}" y2="${y + r * 0.15}" stroke="${d.col("accent")}" stroke-width="5" stroke-linecap="round"/>`;
export const frame = (d, x, y, w, h, f = "accent2") => d.rect(x, y, w, h, { f: "surface", r: 8 }) + d.rect(x + 10, y + 10, w - 20, h - 20, { f, r: 4, sh: false, st: false }) + d.circle(x + w * 0.35, y + h * 0.5, Math.min(w, h) * 0.18, { f: "surface", sh: false, st: false, op: 0.8 });
export const shelf = (d, x, y, w, items = 5, seed = 1) => {
  const r = mulberry32(seed);
  const roles = ["accent", "accent2", "accent3", "bad", "warn", "good"];
  let s = d.rect(x, y, w, 16, { f: "muted", r: 4, sh: false });
  let cx = x + 14;
  for (let i = 0; i < items && cx < x + w - 30; i++) {
    const bw = 24 + Math.floor(r() * 22), bh = 44 + Math.floor(r() * 50);
    s += d.rect(cx, y - bh, bw, bh, { f: roles[Math.floor(r() * roles.length)], r: 6, sh: false });
    cx += bw + 8;
  }
  return s;
};
export const deskTop = (d, x, y, w, h = 30) => d.rect(x, y, w, h, { f: "surface2", r: 10 }) + d.rect(x + 24, y + h, 20, 120, { f: "muted", r: 4, sh: false }) + d.rect(x + w - 44, y + h, 20, 120, { f: "muted", r: 4, sh: false });
export const chair = (d, x, y, s = 1, f = "accent") =>
  d.g(d.rect(-44, -150, 88, 120, { f, r: 26 }) + d.rect(-52, -40, 104, 34, { f, r: 14 }) + d.rect(-6, -6, 12, 60, { f: "muted", r: 4, sh: false }) + d.rect(-40, 50, 80, 12, { f: "muted", r: 6, sh: false }), { t: `translate(${x} ${y}) scale(${s})` });
export const monitor = (d, x, y, w, h, screenRole = "accent3") =>
  d.rect(x, y, w, h, { f: "ink", r: 14 }) + d.rect(x + 8, y + 8, w - 16, h - 16, { f: screenRole, r: 8, sh: false, st: false }) +
  d.rect(x + w / 2 - 8, y + h, 16, 22, { f: "muted", sh: false }) + d.rect(x + w / 2 - 34, y + h + 20, 68, 10, { f: "muted", r: 5, sh: false });
export const cloud = (d, x, y, s = 1, f = "surface") =>
  d.g(d.ellipse(0, 0, 70, 34, { f, sh: false, st: false }) + d.circle(-30, -22, 34, { f, sh: false, st: false }) + d.circle(22, -32, 42, { f, sh: false, st: false }), { t: `translate(${x} ${y}) scale(${s})`, op: 0.9 });
export const building = (d, x, y, w, h, f = "surface2", rows = 6, cols = 3, seed = 3) => {
  const r = mulberry32(seed);
  let s = d.rect(x, y, w, h, { f, r: 6, sh: false });
  const cw = w / (cols * 2 + 1), rh = h / (rows * 2 + 1);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) s += `<rect x="${x + cw * (2 * j + 1)}" y="${y + rh * (2 * i + 1)}" width="${cw}" height="${rh}" fill="${r() > 0.35 ? d.col("warn") : d.col("surface")}" opacity="${r() > 0.35 ? 0.85 : 0.5}" rx="3"/>`;
  return s;
};
export const star = (cx, cy, r, f) => `<polygon fill="${f}" points="${[0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + i * 1.2566; const b = a + 0.6283; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} ${(cx + Math.cos(b) * r * 0.45).toFixed(1)},${(cy + Math.sin(b) * r * 0.45).toFixed(1)}`; }).join(" ")}"/>`;
export { mix, lighten, darken, mulberry32 };
