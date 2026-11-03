// Style-aware SVG drawing. Every call takes a ROLE ("surface", "accent"...) or a literal color and applies the style's
// shape rules: stroke, shadow kind (soft/drop/hard/layer/extrude/misreg/clay), gradients and facets.
import { esc, r2, darken, lighten, isHex } from "./util.mjs";
import { resolveStyle } from "./styles.mjs";

const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => ` ${k.replace(/_/g, "-")}="${typeof v === "number" ? r2(v) : esc(v)}"`).join("");

export function makeDraw(styleId) {
  const style = typeof styleId === "string" ? resolveStyle(styleId) : styleId;
  const { c, shape } = style;
  const grads = new Map();
  const d = { style, c, shape };

  d.col = (f) => (f == null ? "none" : c[f] ?? f);
  d.grad = (hex) => {
    const id = "g" + hex.replace(/[^0-9a-f]/gi, "");
    if (!grads.has(id)) grads.set(id, `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(hex, style.id === "flat-clay-2d" ? 0.3 : 0.22)}"/><stop offset=".55" stop-color="${hex}"/><stop offset="1" stop-color="${darken(hex, 0.07)}"/></linearGradient>`);
    return `url(#${id})`;
  };
  d.defs = () => [...grads.values()].join("");

  // fill paint for a role: gradients for the gradient styles when the color is a hex
  const paint = (f, o) => {
    const col = d.col(f);
    return shape.gradient && o.grad !== false && isHex(col) && col !== "none" ? d.grad(col) : col;
  };
  const strokeOf = (o) => (o.st === false || !shape.stroke ? {} : { stroke: d.col(o.sk ?? shape.strokeRole), stroke_width: o.sw ?? shape.stroke, stroke_linejoin: "round" });

  const build = (tag, geo, o = {}) => {
    const col = d.col(o.f ?? "surface");
    const minDim = o.min ?? 99;
    const useShadow = o.sh !== false && minDim >= 22 && shape.shadow !== "none";
    let under = "";
    if (useShadow) {
      const k = shape.shadow;
      const dup = (dx, dy, fill, op = 1, extra = {}) => `<${tag}${attrs({ ...geo, fill, opacity: op, transform: `translate(${dx} ${dy})`, ...extra })}/>`;
      if (k === "drop") under = dup(0, 10, "rgba(0,0,0,0.28)");
      else if (k === "soft") under = dup(0, 14, "rgba(31,37,64,0.08)") + dup(0, 8, "rgba(31,37,64,0.08)");
      else if (k === "hard") under = dup(8, 8, d.col("ink"));
      else if (k === "layer") under = dup(0, 8, "rgba(60,40,10,0.10)") + dup(0, 4, "rgba(60,40,10,0.14)");
      else if (k === "extrude") under = dup(4, 6, isHex(col) ? darken(col, 0.22) : "rgba(0,0,0,0.2)") + dup(8, 12, isHex(col) ? darken(col, 0.34) : "rgba(0,0,0,0.3)");
      else if (k === "misreg") under = dup(4, 4, c.accent2, 0.5, { style: "mix-blend-mode:multiply" });
      else if (k === "clay") under = dup(0, 12, isHex(col) ? darken(col, 0.16) : "rgba(0,0,0,0.15)");
    }
    const multiply = shape.shadow === "misreg" ? { style: "mix-blend-mode:multiply" } : {};
    const main = `<${tag}${attrs({ ...geo, fill: paint(o.f ?? "surface", o), opacity: o.op, id: o.id, class: o.cls, ...strokeOf(o), ...multiply, ...(o.extra || {}) })}/>`;
    let over = "";
    if (shape.facet && tag === "rect" && o.facet !== false && geo.width >= 60 && geo.height >= 60) {
      const { x, y, width: w, height: h } = geo;
      over = `<polygon points="${r2(x + w * 0.35)},${r2(y)} ${r2(x + w)},${r2(y)} ${r2(x + w)},${r2(y + h)}" fill="rgba(255,255,255,0.13)"/><polygon points="${r2(x)},${r2(y + h * 0.4)} ${r2(x + w * 0.6)},${r2(y + h)} ${r2(x)},${r2(y + h)}" fill="rgba(0,0,0,0.09)"/>`;
    }
    return under + main + over;
  };

  d.rect = (x, y, w, h, o = {}) => build("rect", { x, y, width: w, height: h, rx: (o.r ?? 18) * shape.r, ry: (o.r ?? 18) * shape.r }, { min: Math.min(w, h), ...o });
  d.circle = (cx, cy, rad, o = {}) => build("circle", { cx, cy, r: rad }, { min: rad * 2, ...o });
  d.ellipse = (cx, cy, rx, ry, o = {}) => build("ellipse", { cx, cy, rx, ry }, { min: Math.min(rx, ry) * 2, ...o });
  d.path = (dd, o = {}) => build("path", { d: dd }, o);
  d.poly = (pts, o = {}) => build("polygon", { points: pts.map((p) => p.map(r2).join(",")).join(" ") }, o);
  /** Line (never shadowed). o.glow draws a wide faint copy under it. */
  d.line = (x1, y1, x2, y2, o = {}) => {
    const col = d.col(o.f ?? "ink");
    const w = o.w ?? 6;
    const l = (sw, op) => `<line${attrs({ x1, y1, x2, y2, stroke: col, stroke_width: sw, stroke_linecap: o.cap ?? "round", opacity: op, stroke_dasharray: o.dash })}/>`;
    return (o.glow ? l(w * 3.2, 0.22) : "") + l(w, o.op);
  };
  d.text = (x, y, str, o = {}) => `<text${attrs({ x, y, fill: d.col(o.f ?? "ink"), font_size: o.size ?? 48, text_anchor: o.anchor ?? "middle", id: o.id, class: o.font === "display" ? "fd" : "fu", font_weight: o.weight, letter_spacing: o.ls, opacity: o.op })}>${esc(str)}</text>`;
  d.g = (inner, o = {}) => `<g${attrs({ id: o.id, class: o.cls, opacity: o.op, transform: o.t })}>${inner}</g>`;
  /** Shorthand: a card-like surface with the style's radius. */
  d.card = (x, y, w, h, o = {}) => d.rect(x, y, w, h, { f: "surface", r: 28, ...o });
  return d;
}
