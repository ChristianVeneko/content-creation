// Parametric builders for 3D stages: pure functions that expand to arrays of the existing `custom` parts (ids, shapes, sizes,
// colors), so the renderer, the plan hashes and the caps stay exactly as they are. A spec invokes one with
//   { "build": "house", "params": { ... }, "id": "house", "pos": [x, y, z], "seed": 3 }
// inside `stage.actors` (an actor with the generated parts) or `stage.world.parts` (a group root with the parts hanging from it,
// optionally a `scatter` template). `expandBuilders(raw)` runs before validation (lib/spec.mjs validateSpec), so everything
// downstream sees plain parts. Nothing here may import Node built-ins (Remotion bundles lib/).
// Every builder takes size / proportion / palette / style / seed parameters: the same call with another seed or palette gives a
// different model, so two videos never look alike. Colors are hex or palette tokens (accent, accent2, ...); computed shades
// only apply to hex values (a token is kept as it is, the renderer resolves and adapts it).
import { mix } from "./captions.mjs";
import { MAX_PARTS, hash01 } from "./scene3d-motion.mjs";

const r3 = (x) => Math.round(x * 1000) / 1000;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const isHex = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
/** Lighter (t > 0) or darker (t < 0) shade of a hex color; tokens stay as they are. */
export const shade = (c, t) => (!isHex(c) ? c : t >= 0 ? mix(c, "#FFFFFF", t) : mix(c, "#000000", -t));
const midMix = (a, b, t) => (isHex(a) && isHex(b) ? mix(a, b, t) : a);

// ---------------- parts toolkit ----------------

class Kit {
  constructor(seed, tag) {
    this.seed = seed;
    this.tag = tag;
    this.parts = [];
    this.count = {};
  }
  rnd(...k) {
    return hash01(this.seed, this.tag, ...k);
  }
  vary(lo, hi, ...k) {
    return lo + (hi - lo) * this.rnd(...k);
  }
  pick(list, ...k) {
    return list[Math.floor(this.rnd(...k) * list.length) % list.length];
  }
  id(name) {
    const n = this.count[name] ?? 0;
    this.count[name] = n + 1;
    return n === 0 ? name : `${name}-${n}`;
  }
  add(shape, name, size, pos, color, o = {}) {
    const p = { id: this.id(name), shape };
    if (size) p.size = size.map((v) => Math.max(0.006, r3(v)));
    if (pos) p.pos = pos.map(r3);
    if (color !== undefined && color !== null) p.color = color;
    for (const [key, v] of Object.entries(o)) {
      if (v === undefined || v === null) continue;
      p[key] = key === "rot" ? v.map((a) => r3(a % 360)) : Array.isArray(v) && typeof v[0] === "number" ? v.map(r3) : typeof v === "number" ? r3(v) : v;
    }
    this.parts.push(p);
    return p.id;
  }
  box(name, size, pos, color, o) {
    return this.add("box", name, size, pos, color, o);
  }
  cyl(name, size, pos, color, o) {
    return this.add("cylinder", name, size, pos, color, o);
  }
  cone(name, size, pos, color, o) {
    return this.add("cone", name, size, pos, color, o);
  }
  sph(name, size, pos, color, o) {
    return this.add("sphere", name, size, pos, color, o);
  }
  ext(name, depth, points, pos, color, o) {
    return this.add("extrude", name, [depth], pos, color, { ...o, points: points.map((q) => q.map(r3)) });
  }
  tor(name, size, pos, color, o) {
    return this.add("torus", name, size, pos, color, o);
  }
  grp(name, pos, o) {
    return this.add("group", name, null, pos, null, o);
  }
}

// ---------------- parameter vocabulary ----------------

const num = (def, min, max, about) => ({ type: "number", def, min, max, about });
const int = (def, min, max, about) => ({ type: "integer", def, min, max, about });
const opt = (def, values, about) => ({ type: "enum", def, values, about });
const bool = (def, about) => ({ type: "boolean", def, about });
const color = (about) => ({ type: "color", def: null, about: `${about} (hex or palette token; default: picked from the seed)` });
const list = (def, about) => ({ type: "array", def, about });

const WALLS = ["#E8DCC2", "#F2E6D0", "#D9E4EC", "#EBD3C4", "#DCE8D2", "#F0DFA8", "#E4D6E8"];
const ROOFS = ["#C4683A", "#8A4B3A", "#4F6D8A", "#5E7A4A", "#B8453A", "#6B5B95"];
const LEAVES = [["#3F8F43", "#5BAE4F"], ["#2F7D4B", "#4C9A5B"], ["#6BA43A", "#8CC152"], ["#3C8C6E", "#58A98A"], ["#4F9A38", "#79B94A"]];
const WOOD = "#7A4F2C";
const STONE = "#9AA0A8";
const GLASS = "#BFE3F5";

// ---------------- builders ----------------

const B = {};

B.house = {
  about: "Low-poly house: foundation, floors with bands and corner posts, framed windows with sills and shutters, door with step and porch, gable / hip / shed / flat roof with eaves, shingle rows and chimney; optional cutaway (front wall removed, furnished interior). Faces +z.",
  params: {
    floors: int(2, 1, 3, "Storeys"),
    width: num(4.4, 2.6, 7.6, "Width (x)"),
    depth: num(3, 2, 5, "Depth (z)"),
    floorHeight: num(1.25, 0.9, 1.8, "Height of one storey"),
    roof: opt("gable", ["gable", "hip", "shed", "flat"], "Roof form"),
    style: opt("cozy", ["cozy", "modern", "rustic"], "cozy: shutters and a porch; modern: big glazing and a flat roof; rustic: wood tones and a chimney"),
    windows: int(3, 1, 4, "Windows per storey on the front"),
    detail: int(3, 1, 3, "1 frames and glass, 2 adds mullions and sills, 3 adds shutters and flower boxes"),
    chimney: bool(true, "Brick chimney"),
    porch: bool(true, "Porch with posts at the door"),
    cutaway: bool(false, "Remove the front wall and show a furnished interior"),
    wall: color("Wall color"),
    roofColor: color("Roof color"),
    trim: color("Trim, frames and corner posts"),
    door: color("Door color"),
  },
  build(p, k) {
    const modern = p.style === "modern";
    const wall = p.wall ?? (modern ? "#F1F1EC" : p.style === "rustic" ? "#C9A27A" : k.pick(WALLS, "wall"));
    const roofC = p.roofColor ?? (modern ? "#4A5568" : k.pick(ROOFS, "roof"));
    const trim = p.trim ?? (modern ? "#2B3550" : "#F6F1E7");
    const doorC = p.door ?? k.pick(["#8A4B3A", "#2F6F8F", "#B8453A", "#3F7D4E"], "door");
    const roofKind = modern && p.roof === "gable" ? "flat" : p.roof;
    const { floors: F, width: w, depth: d, floorHeight: fh } = p;
    const detail = F >= 3 ? Math.min(p.detail, 2) : p.detail;
    const base = 0.25;
    k.box("foundation", [w + 0.24, base, d + 0.24], [0, base / 2, 0], shade(STONE, -0.1));
    const doorX = p.porch ? w * 0.22 : 0;
    for (let f = 0; f < F; f++) {
      const y0 = base + f * fh;
      const yc = y0 + fh / 2;
      if (p.cutaway) {
        k.box(`back-${f}`, [w, fh, 0.14], [0, yc, -d / 2 + 0.07], wall);
        k.box(`wall-l-${f}`, [0.14, fh, d], [-w / 2 + 0.07, yc, 0], wall);
        k.box(`wall-r-${f}`, [0.14, fh, d], [w / 2 - 0.07, yc, 0], wall);
        k.box(`floor-${f}`, [w - 0.2, 0.1, d - 0.2], [0, y0 + 0.05, 0], shade(WOOD, 0.35));
        k.box(`inner-${f}`, [w - 0.3, fh - 0.12, 0.03], [0, yc, -d / 2 + 0.16], shade(wall, -0.07));
        // interior: a table with a lamp and a shelf, a bed upstairs
        if (f === 0) {
          k.box("table", [0.9, 0.06, 0.5], [-w * 0.18, y0 + 0.5, 0.2], shade(WOOD, 0.1));
          for (const [ix, iz] of [[-0.38, -0.18], [0.38, -0.18], [-0.38, 0.18], [0.38, 0.18]]) k.box("table-leg", [0.06, 0.4, 0.06], [-w * 0.18 + ix, y0 + 0.25, 0.2 + iz], shade(WOOD, -0.1));
          k.box("sofa", [1.1, 0.4, 0.5], [w * 0.22, y0 + 0.25, -d * 0.2], k.pick(["#4F6D8A", "#B8453A", "#5E7A4A"], "sofa"), { radius: 0.06 });
        } else {
          k.box("bed", [1.1, 0.3, 0.7], [-w * 0.18, y0 + 0.2, -d * 0.18], "#E9EEF5", { radius: 0.05 });
          k.box("blanket", [0.8, 0.12, 0.72], [-w * 0.1, y0 + 0.4, -d * 0.18], k.pick(["#E5484D", "#3B82F6", "#2FB98F"], "blanket"), { radius: 0.04 });
        }
        k.box(`shelf-${f}`, [0.8, 0.05, 0.22], [w * 0.2, y0 + fh * 0.62, -d / 2 + 0.3], shade(WOOD, 0.2));
        k.sph(`lamp-${f}`, [0.12], [0, y0 + fh - 0.2, 0], "#FFE9A8", { material: "emissive", facets: 6 });
      } else {
        k.box(`walls-${f}`, [w, fh, d], [0, yc, 0], wall);
      }
      k.box(`band-${f}`, [w + 0.08, 0.1, d + 0.08], [0, y0 + fh - 0.02, 0], trim);
      if (!p.cutaway) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(`post-${f}`, [0.1, fh, 0.1], [(sx * w) / 2, yc, (sz * d) / 2], trim);
      // front windows (the cutaway has none: its front is open)
      const nW = p.windows;
      for (let i = 0; i < nW && !p.cutaway; i++) {
        let x = (-w / 2 + ((i + 0.5) * w) / nW) * 0.86;
        if (f === 0 && Math.abs(x - doorX) < 0.75) x = x - Math.sign(x - doorX || 1) * 0.55;
        if (f === 0 && Math.abs(x - doorX) < 0.7) continue;
        windowAt(k, x, y0 + fh * 0.55, d / 2, 0, f, i, detail, trim, modern, p.style);
      }
      for (const sx of [-1, 1]) {
        if (!p.cutaway) windowAt(k, 0, y0 + fh * 0.55, (sx * w) / 2, sx * 90, f, `s${sx}`, Math.min(detail, 2), trim, modern, p.style, true);
      }
    }
    const H = base + F * fh;
    // door, step, porch (ground floor, front)
    if (!p.cutaway) {
      k.box("door-frame", [0.82, 1.14, 0.07], [doorX, base + 0.57, d / 2 + 0.03], trim);
      k.box("door", [0.64, 1.04, 0.06], [doorX, base + 0.52, d / 2 + 0.06], doorC);
      k.box("door-panel", [0.4, 0.38, 0.02], [doorX, base + 0.76, d / 2 + 0.1], shade(doorC, -0.15));
      k.box("door-panel", [0.4, 0.38, 0.02], [doorX, base + 0.3, d / 2 + 0.1], shade(doorC, -0.15));
      k.sph("knob", [0.04], [doorX + 0.2, base + 0.52, d / 2 + 0.11], "#E8B84A", { facets: 6 });
      k.box("step", [1.1, 0.1, 0.4], [doorX, 0.2, d / 2 + 0.3], shade(STONE, 0.1));
      if (p.porch) {
        k.box("porch-slab", [1.9, 0.1, 0.95], [doorX, 0.1, d / 2 + 0.5], shade(WOOD, 0.3));
        for (const sx of [-1, 1]) k.cyl("porch-post", [0.06, 0.07, 1.35], [doorX + sx * 0.85, 0.8, d / 2 + 0.88], trim, { facets: 6 });
        k.box("porch-roof", [2.2, 0.08, 1.15], [doorX, 1.52, d / 2 + 0.55], roofC, { rot: [-7, 0, 0] });
        k.box("porch-rail", [1.7, 0.05, 0.05], [doorX, 0.55, d / 2 + 0.92], trim);
      } else k.box("awning", [1.1, 0.07, 0.5], [doorX, base + 1.24, d / 2 + 0.28], roofC, { rot: [-9, 0, 0] });
    }
    // roof
    const eave = 0.32;
    const topY = H;
    if (roofKind === "gable") {
      const a = 30 + Math.round(k.vary(-3, 8, "pitch"));
      const half = w / 2 + eave;
      const L = half / Math.cos(rad(a));
      const ta = Math.tan(rad(a));
      const rise = half * ta;
      const cy = topY + (half / 2) * ta + 0.02;
      for (const s of [-1, 1]) {
        k.box("roof-slab", [L, 0.13, d + eave * 2], [(s * half) / 2, cy, 0], roofC, { rot: [0, 0, -s * a] });
        for (let i = 1; i <= 4; i++) {
          const t = -L / 2 + (i / 5) * L;
          // a strip lying on the slab surface (left slope, mirrored for the right one)
          const lx = -half / 2 + t * Math.cos(rad(a)) - 0.08 * Math.sin(rad(a));
          const ly = cy + t * Math.sin(rad(a)) + 0.08 * Math.cos(rad(a));
          k.box("shingle-row", [0.07, 0.04, d + eave * 2 - 0.08], [s === -1 ? lx : -lx, ly, 0], shade(roofC, -0.18), { rot: [0, 0, -s * a] });
        }
        k.box("fascia", [0.07, 0.15, d + eave * 2 + 0.04], [s * half, topY + 0.02, 0], trim, { rot: [0, 0, -s * a] });
      }
      k.box("ridge", [0.24, 0.12, d + eave * 2 + 0.06], [0, topY + rise + 0.08, 0], shade(roofC, -0.3));
      for (const s of [-1, 1]) k.ext("gable", 0.1, [[-w / 2, 0], [w / 2, 0], [0, rise]], [0, topY, (s * d) / 2], wall);
      if (p.chimney) {
        const cx = w * 0.26;
        const base0 = topY + ta * (half - cx) - 0.3;
        chimney(k, cx, base0, -d * 0.18, topY + rise + 0.5 - base0);
      }
    } else if (roofKind === "hip") {
      const rise = Math.min(w, d) * 0.4 + 0.2;
      const r = (w + eave * 2) / Math.SQRT2;
      k.cone("roof-hip", [r, rise], [0, topY + rise / 2, 0], roofC, { facets: 4, rot: [0, 45, 0], scale: [1, 1, (d + eave * 2) / (w + eave * 2)] });
      k.cone("roof-cap", [r * 0.55, rise * 0.55], [0, topY + rise * 0.72, 0], shade(roofC, -0.2), { facets: 4, rot: [0, 45, 0], scale: [1, 1, (d + eave * 2) / (w + eave * 2)] });
      k.cyl("finial", [0.04, 0.07, 0.25], [0, topY + rise + 0.1, 0], trim, { facets: 6 });
      if (p.chimney) chimney(k, w * 0.2, topY + rise * 0.35, -d * 0.12, rise * 0.7 + 0.4);
    } else if (roofKind === "shed") {
      const a = 12;
      const len = (w + eave * 2) / Math.cos(rad(a));
      k.box("roof-slab", [len, 0.14, d + eave * 2], [0, topY + 0.3, 0], roofC, { rot: [0, 0, a] });
      k.box("fascia", [len, 0.14, 0.07], [0, topY + 0.3, d / 2 + eave], trim, { rot: [0, 0, a] });
      for (const s of [-1, 1]) k.box("gable", [0.1, 0.5, d], [(s * w) / 2, topY + 0.2, 0], wall);
    } else {
      k.box("roof-slab", [w + 0.3, 0.14, d + 0.3], [0, topY + 0.07, 0], shade(roofC, -0.1));
      for (const [bx, bz, sx, sz] of [[0, 1, w + 0.3, 0.1], [0, -1, w + 0.3, 0.1], [1, 0, 0.1, d + 0.3], [-1, 0, 0.1, d + 0.3]]) k.box("parapet", [sx, 0.28, sz], [(bx * (w + 0.2)) / 2, topY + 0.26, (bz * (d + 0.2)) / 2], trim);
      k.box("ac-unit", [0.7, 0.35, 0.5], [-w * 0.2, topY + 0.4, -d * 0.1], "#C8CDD4");
      k.cyl("ac-fan", [0.2, 0.04], [-w * 0.2, topY + 0.6, -d * 0.1], "#6B7280", { facets: 8 });
    }
    return {};
  },
};

function windowAt(k, x, y, z, rotY, f, i, detail, trim, modern, style, side = false) {
  const wide = modern ? 0.95 : 0.62;
  const high = modern ? 0.82 : 0.74;
  const o = rotY ? { rot: [0, rotY, 0] } : {};
  // offsets in the wall's own frame: dx along the wall, dz outward
  const place = side ? (dx, dy, dz) => [z + Math.sign(z) * dz, y + dy, dx] : (dx, dy, dz) => [x + dx, y + dy, z + dz];
  k.box("win-frame", [wide, high, 0.07], place(0, 0, 0.03), trim, o);
  k.box("win-glass", [wide - 0.12, high - 0.12, 0.05], place(0, 0, 0.055), GLASS, { ...o, material: "glass", opacity: 0.92 });
  if (detail >= 2) {
    k.box("win-mullion", [0.04, high - 0.1, 0.06], place(0, 0, 0.07), trim, o);
    k.box("win-bar", [wide - 0.1, 0.04, 0.06], place(0, 0.02, 0.07), trim, o);
    k.box("win-sill", [wide + 0.14, 0.06, 0.14], place(0, -high / 2 - 0.02, 0.08), shade(trim, -0.08), o);
  }
  if (detail >= 3 && !side && style === "cozy") {
    for (const sx of [-1, 1]) k.box("shutter", [0.18, high, 0.04], place(sx * (wide / 2 + 0.13), 0, 0.04), k.pick(["#3F7D4E", "#2F6F8F", "#8A4B3A"], "shutter", f), o);
    k.box("flower-box", [wide + 0.04, 0.1, 0.14], place(0, -high / 2 - 0.1, 0.12), shade(WOOD, -0.05), o);
  }
  void i;
}

function chimney(k, x, y, z, h) {
  const bricks = ["#9A5B3D", "#8B4F33", "#A8664A"];
  const courses = Math.max(3, Math.round(h / 0.22));
  const ch = h / courses;
  for (let c = 0; c < courses; c++) k.box("chimney-brick", [0.42, ch * 0.94, 0.42], [x, y + c * ch + ch / 2, z], bricks[c % 3]);
  k.box("chimney-cap", [0.54, 0.08, 0.54], [x, y + h + 0.04, z], "#5B6270");
  k.cyl("flue", [0.12, 0.12, 0.12], [x, y + h + 0.12, z], "#2B2F38", { facets: 6 });
}

B.tree = {
  about: "Faceted low-poly tree. kind: pine (stacked cone tiers), round (clustered faceted blobs), lowpoly (three stacked faceted shapes, like a game asset), oak (thick trunk with branches and a wide crown), birch (white trunk with marks), palm (curved trunk and fronds).",
  params: {
    kind: opt("round", ["pine", "round", "lowpoly", "oak", "birch", "palm"], "Tree type"),
    height: num(2.6, 1, 5, "Total height"),
    crown: num(1, 0.5, 2.5, "Crown radius multiplier"),
    trunkColor: color("Trunk color"),
    leaf: color("Main leaf color"),
    leaf2: color("Second (lighter) leaf color"),
    density: int(2, 1, 3, "Foliage detail: more leaf blobs, tufts and twigs"),
  },
  build(p, k) {
    const [l1, l2] = k.pick(LEAVES, "leaves");
    const leaf = p.leaf ?? (p.kind === "birch" ? "#8CC152" : l1);
    const leaf2 = p.leaf2 ?? (p.kind === "birch" ? "#B5D870" : l2);
    const bark = p.trunkColor ?? (p.kind === "birch" ? "#EDEBE4" : p.kind === "pine" ? "#6B4A2E" : WOOD);
    const H = p.height;
    const c = p.crown;
    const tr = (name, rt, rb, h, y, o) => k.cyl(name, [rt, rb, h], [0, y, 0], bark, { facets: 6, ...o });
    if (p.kind === "pine") {
      const trunkH = H * 0.28;
      tr("trunk", 0.07, 0.11, trunkH, trunkH / 2);
      for (let i = 0; i < 4; i++) tr("bark-ring", 0.09 - i * 0.008, 0.1 - i * 0.008, 0.03, 0.05 + i * (trunkH / 4.5), { color: shade(bark, -0.12) });
      const tiers = 4 + p.density + Math.round(k.vary(0, 1, "tiers"));
      for (let i = 0; i < tiers; i++) {
        const u = i / (tiers - 1);
        const r = (0.95 - 0.7 * u) * c * (H / 2.6) * 0.8;
        const th = (H * 0.72) / tiers + 0.25;
        const y = trunkH * 0.7 + u * (H - trunkH * 0.7 - th * 0.8) + th / 2;
        k.cone("tier", [r, th], [0, y, 0], i % 2 ? leaf : shade(leaf, -0.1), { facets: 7, rot: [0, k.vary(0, 50, "rot", i), 0] });
        k.cone("tier-low", [r * 0.9, th * 0.35], [0, y - th * 0.38, 0], shade(leaf, -0.22), { facets: 7, rot: [0, k.vary(0, 50, "rot2", i), 0] });
        for (let q = 0; q < p.density + 1; q++) {
          const a = k.rnd("cl", i, q) * 360;
          k.cone("needles", [r * 0.22, th * 0.5], [Math.cos(rad(a)) * r * 0.62, y - th * 0.15, Math.sin(rad(a)) * r * 0.62], shade(leaf, 0.12 + q * 0.03), { facets: 4, rot: [Math.round(Math.sin(rad(a)) * 20), 0, Math.round(-Math.cos(rad(a)) * 20)] });
        }
      }
      k.cone("tip", [0.12 * c, 0.3], [0, H + 0.05, 0], leaf2, { facets: 5 });
      // extra faceted layers: a wide dark skirt under the lowest tier and a light upper highlight tier
      const r0 = 0.95 * c * (H / 2.6) * 0.8;
      k.cone("skirt", [r0 * 1.12, 0.22], [0, trunkH * 0.7 + 0.08, 0], shade(leaf, -0.3), { facets: 8, rot: [0, 12, 0] });
      k.cone("tier-light", [r0 * 0.5, H * 0.2], [0, H * 0.86, 0], shade(leaf, 0.2), { facets: 6, rot: [0, 30, 0] });
    } else if (p.kind === "palm") {
      let x = 0;
      let y = 0;
      const segs = 7;
      const lean = k.vary(-0.1, 0.1, "lean");
      for (let i = 0; i < segs; i++) {
        const sh = (H * 0.8) / segs;
        k.cyl("trunk", [0.07 - i * 0.004, 0.09 - i * 0.004, sh * 1.06], [x, y + sh / 2, 0], i % 2 ? bark : shade(bark, -0.1), { facets: 6, rot: [0, 0, -lean * 60] });
        x += lean * sh;
        y += sh * 0.99;
      }
      for (let i = 0; i < 8; i++) tr("bark-ring", 0.075, 0.08, 0.03, 0.1 + i * (H * 0.1), { color: shade(bark, -0.18), pos: [x * (i / 8) * 0.0, 0, 0] });
      for (let i = 0; i < 9 + p.density * 2; i++) {
        const a = (i / (9 + p.density * 2)) * 360 + k.vary(-10, 10, "fa", i);
        const len = 1.1 * c * (0.85 + k.rnd("fl", i) * 0.3);
        const dx = Math.cos(rad(a)) * len * 0.5;
        const dz = Math.sin(rad(a)) * len * 0.5;
        k.box("frond-rib", [len * 0.9, 0.012, 0.012], [x + dx * 0.9, y + 0.1 - len * 0.04, dz * 0.9], shade(leaf, -0.25), { rot: [0, -a, Math.round(-12)] });
        k.cone("frond", [0.11 * c, len], [x + dx, y + 0.05 - len * 0.05, dz], i % 2 ? leaf : shade(leaf, 0.12), { facets: 3, rot: [Math.round(Math.sin(rad(a)) * -72), -a, Math.round(Math.cos(rad(a)) * -72) * 0 + 90], scale: [1, 1, 0.45] });
      }
      for (let i = 0; i < 3; i++) k.sph("coconut", [0.1], [x + k.vary(-0.15, 0.15, "cx", i), y - 0.12, k.vary(-0.15, 0.15, "cz", i)], "#6B4A2E", { facets: 6 });
    } else {
      const trunkH = H * (p.kind === "oak" ? 0.42 : 0.45);
      const th = p.kind === "oak" ? 0.17 : 0.1;
      tr("trunk", th * 0.7, th, trunkH, trunkH / 2);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * 360 + k.vary(0, 30, "ra", i);
        k.box("root", [0.08, 0.14, 0.26], [Math.cos(rad(a)) * (th + 0.05), 0.06, Math.sin(rad(a)) * (th + 0.05)], bark, { rot: [0, -a, 0] });
      }
      if (p.kind === "birch") for (let i = 0; i < 5; i++) k.box("mark", [0.05, 0.06, 0.012], [0.015, trunkH * (0.15 + i * 0.17), th * 0.72 + 0.005], "#2B2B2B", { rot: [0, k.vary(-30, 30, "m", i), 0] });
      if (p.kind === "oak") {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * 360 + 20;
          k.cyl("branch", [0.04, 0.07, 0.8], [Math.cos(rad(a)) * 0.3, trunkH + 0.2, Math.sin(rad(a)) * 0.3], bark, { facets: 5, rot: [Math.round(Math.sin(rad(a)) * 40), 0, Math.round(-Math.cos(rad(a)) * 40)] });
        }
      }
      for (let i = 0; i < 5; i++) tr("bark-ring", th * 0.95, th * 0.98, 0.035, trunkH * (0.12 + i * 0.17), { color: shade(bark, -0.1) });
      for (let i = 0; i < 2 + p.density * 2; i++) {
        const a = k.rnd("tw", i) * 360;
        k.cyl("twig", [0.015, 0.03, 0.5], [Math.cos(rad(a)) * 0.22, trunkH + 0.1 + k.rnd("ty", i) * 0.3, Math.sin(rad(a)) * 0.22], bark, { facets: 4, rot: [Math.round(Math.sin(rad(a)) * 50), 0, Math.round(-Math.cos(rad(a)) * 50)] });
      }
      const cy = trunkH + (H - trunkH) * 0.5;
      const cr = (H - trunkH) * 0.5 * c * (p.kind === "oak" ? 1.25 : 1);
      if (p.kind === "lowpoly") {
        for (let i = 0; i < 5; i++) {
          const u = i / 4;
          k.sph("stack", [cr * (1.15 - 0.4 * u), cr * (0.62 - 0.1 * u), cr * (1.15 - 0.4 * u)], [k.vary(-0.05, 0.05, "sx", i), trunkH + 0.2 + i * cr * 0.42, k.vary(-0.05, 0.05, "sz", i)], i % 2 ? leaf2 : shade(leaf, i * 0.1), { facets: 5, rot: [0, i * 36, 0] });
        }
      } else {
        const blobs = (p.kind === "oak" ? 10 : 8) + p.density * 4;
        k.sph("core", [cr, cr * 0.85, cr], [0, cy, 0], leaf, { facets: 6, rot: [0, 20, 0] });
        for (let i = 0; i < blobs; i++) {
          const a = k.rnd("ba", i) * 360;
          const e = k.vary(-0.5, 0.9, "be", i);
          const dist = cr * k.vary(0.5, 0.95, "bd", i);
          const br = cr * k.vary(0.4, 0.62, "br", i);
          if (i % 2 === 0) k.cone("leaf-tuft", [br * 0.4, br * 0.9], [Math.cos(rad(a)) * dist * 1.05, cy + e * cr * 0.8 + br * 0.7, Math.sin(rad(a)) * dist * 1.05], shade(leaf2, 0.08), { facets: 4, rot: [0, a, 0] });
          k.sph("leaf-blob", [br, br * 0.85, br], [Math.cos(rad(a)) * dist, cy + e * cr * 0.8, Math.sin(rad(a)) * dist], e > 0.3 ? leaf2 : e < -0.2 ? shade(leaf, -0.15) : leaf, { facets: 5, rot: [0, a, 0] });
        }
        // extra faceted layers: a dark underside that shades the crown and a light cap on top
        k.sph("crown-under", [cr * 1.02, cr * 0.5, cr * 1.02], [0, cy - cr * 0.55, 0], shade(leaf, -0.25), { facets: 7, rot: [0, 12, 0] });
        k.sph("crown-cap", [cr * 0.62, cr * 0.42, cr * 0.62], [0, cy + cr * 0.72, 0], shade(leaf2, 0.12), { facets: 6, rot: [0, 40, 0] });
      }
    }
    return {};
  },
};

B.fence = {
  about: "Fence along x (front faces +z): posts with caps, rails and pickets (pointed outline), slats, ranch rails or wire; optional gate in the middle.",
  params: {
    length: num(6, 1, 9.6, "Length along x (actor mode: <= 9.6; use the actor `size` to scale further)"),
    height: num(0.9, 0.5, 1.6, "Height"),
    style: opt("picket", ["picket", "rail", "slat", "wire"], "Fence type"),
    gate: bool(false, "Leave a gate in the middle"),
    color: color("Board color"),
    postColor: color("Post color"),
  },
  build(p, k) {
    const L = p.length;
    const h = p.height;
    const col = p.color ?? (p.style === "picket" ? "#F4EFE4" : k.pick(["#B98B5A", "#9C6B3C", "#E8D9B8"], "wood"));
    const postC = p.postColor ?? (p.style === "wire" ? "#7A5A3C" : shade(col, -0.12));
    const n = Math.max(2, Math.round(L / 1.4) + 1);
    const gx0 = p.gate ? -0.55 : 0;
    const gx1 = p.gate ? 0.55 : 0;
    const inGate = (x) => p.gate && x > gx0 - 0.04 && x < gx1 + 0.04;
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (i / (n - 1)) * L;
      k.box("post", [0.12, h * 1.08, 0.12], [x, h * 0.54, 0], postC);
      k.box("post-cap", [0.17, 0.05, 0.17], [x, h * 1.1, 0], shade(postC, 0.12));
    }
    if (p.style === "picket") {
      const pitch = 0.2;
      const cnt = Math.floor(L / pitch);
      for (let i = 0; i <= cnt; i++) {
        const x = -L / 2 + (i / cnt) * L;
        if (inGate(x)) continue;
        const ph = h * (0.93 + k.rnd("ph", i) * 0.06);
        k.ext("picket", 0.03, [[-0.05, 0], [0.05, 0], [0.05, ph * 0.9], [0, ph], [-0.05, ph * 0.9]], [x, 0, 0.06], col);
      }
      for (const u of [0.3, 0.72]) k.box("rail", [L, 0.07, 0.05], [0, h * u, 0], shade(col, -0.08));
    } else if (p.style === "slat") {
      for (let i = 0; i < 6; i++) k.box("slat", [L, h / 7, 0.04], [0, (h / 6) * (i + 0.5) + 0.04, 0.05], i % 2 ? col : shade(col, -0.07));
    } else if (p.style === "rail") {
      for (const u of [0.35, 0.65, 0.95]) k.box("rail", [L, 0.09, 0.06], [0, h * u, 0], col);
    } else {
      for (const u of [0.25, 0.5, 0.75, 1]) k.cyl("wire", [0.012, 0.012, L], [0, h * u, 0.02], "#C8CDD4", { rot: [0, 0, 90], facets: 6 });
      for (let i = 1; i < n * 2; i++) k.cyl("stay", [0.01, 0.01, h], [-L / 2 + (i / (n * 2)) * L, h * 0.55, 0.02], "#C8CDD4", { facets: 5 });
    }
    if (p.gate) {
      k.box("gate-l", [0.07, h * 0.9, 0.07], [gx0, h * 0.45, 0.04], postC);
      k.box("gate-r", [0.07, h * 0.9, 0.07], [gx1, h * 0.45, 0.04], postC);
      k.box("gate-top", [1.1, 0.07, 0.06], [0, h * 0.85, 0.04], col);
      k.box("gate-bot", [1.1, 0.07, 0.06], [0, h * 0.25, 0.04], col);
      k.box("gate-diag", [1.2, 0.06, 0.05], [0, h * 0.55, 0.06], shade(col, -0.1), { rot: [0, 0, 30] });
    }
    return {};
  },
};

B["grass-tufts"] = {about: "Scatter template of grass tufts (3-7 leaning blades). Use in stage.world with `params.count` and `params.area`; it becomes a `scatter` of instanced copies that follow the terrain.", scatterDefault: true,
  params: {
    count: int(360, 1, 1000, "Number of tufts (cheap: 3 blades + 1 group = 4 instanced parts per tuft)"),
    area: list([-8, -5, 8, 5], "Ground rectangle [x0, z0, x1, z1]"),
    avoid: list([], "Keep-out zones: [x0, z0, x1, z1] boxes or [x, z, r] discs"),
    blades: int(3, 3, 7, "Blades per tuft (3 keeps a tuft cheap: more tufts fit the world budget)"),
    height: num(0.3, 0.1, 1, "Blade height"),
    color: color("Blade color"),
    color2: color("Lighter blade color"),
  },
  build(p, k) {
    const c1 = p.color ?? k.pick(["#4F9A38", "#5BAE4F", "#3F8F43", "#6BA43A"], "g");
    const c2 = p.color2 ?? shade(c1, 0.18);
    const root = k.grp("tuft", [0, 0, 0]);
    for (let i = 0; i < p.blades; i++) {
      const a = (i / p.blades) * 360 + k.vary(0, 40, "a", i);
      const h = p.height * k.vary(0.65, 1.25, "h", i);
      const tilt = k.vary(8, 24, "t", i);
      k.cone("blade", [p.height * 0.24, h], [Math.cos(rad(a)) * 0.04, h / 2 - 0.01, Math.sin(rad(a)) * 0.04], i % 2 ? c1 : c2, { facets: 3, parent: root, rot: [Math.round(Math.sin(rad(a)) * tilt), 0, Math.round(-Math.cos(rad(a)) * tilt)] });
    }
    return { scatter: { count: p.count, area: p.area, avoid: p.avoid, jitter: { scale: 0.45, rot: 180 } } };
  },
};

B.flowers = {
  about: "Scatter templates of flowers: stem, leaves, a faceted center and 4-7 petals. One template per color in `colors`, each scattered over the same area.",
  params: {
    count: int(36, 1, 400, "Total number of flowers"),
    area: list([-7, -4, 7, 2], "Ground rectangle [x0, z0, x1, z1]"),
    avoid: list([], "Keep-out zones"),
    colors: list(["#F25C78", "#FFD23F", "#FFFFFF", "#9B6BFF"], "Petal colors, one template each (max 5)"),
    petals: int(5, 4, 7, "Petals"),
    height: num(0.32, 0.12, 0.8, "Stem height"),
  },
  build(p, k) {
    const cols = p.colors.filter(isHex).slice(0, 5);
    const colors = cols.length ? cols : ["#F25C78"];
    const scatter = [];
    colors.forEach((pc, ci) => {
      const root = k.grp(`flower-${ci}`, [0, 0, 0]);
      k.cyl(`stem-${ci}`, [0.012, 0.016, p.height], [0, p.height / 2, 0], "#3E8A3A", { facets: 4, parent: root });
      k.cone(`leaf-${ci}`, [0.04, 0.16], [0.05, p.height * 0.4, 0], "#4F9A38", { facets: 3, parent: root, rot: [0, 0, -65] });
      for (let i = 0; i < p.petals; i++) {
        const a = (i / p.petals) * 360;
        k.sph(`petal-${ci}`, [0.055, 0.02, 0.04], [Math.cos(rad(a)) * 0.06, p.height + 0.01, Math.sin(rad(a)) * 0.06], pc, { facets: 4, parent: root, rot: [0, -a, 0] });
      }
      k.sph(`heart-${ci}`, [0.04], [0, p.height + 0.02, 0], ci % 2 ? "#F2A81D" : "#FFD23F", { facets: 5, parent: root });
      scatter.push({ part: `flower-${ci}`, count: Math.max(1, Math.round(p.count / colors.length)), area: p.area, avoid: p.avoid, seedShift: ci, jitter: { scale: 0.3 } });
    });
    return { scatterMany: scatter };
  },
};

B.rocks = {
  about: "A cluster of faceted rocks (squashed 5-6 sided blobs with varied shades) and pebbles; mossy and sandstone variants.",
  params: {
    count: int(9, 1, 14, "Rocks"),
    size: num(1, 0.3, 2.5, "Overall size"),
    spread: num(1.4, 0.4, 3, "Radius of the cluster"),
    kind: opt("granite", ["granite", "sandstone", "mossy"], "Rock type"),
    color: color("Base color"),
  },
  build(p, k) {
    const base = p.color ?? (p.kind === "sandstone" ? "#C9A27A" : "#9AA0A8");
    for (let i = 0; i < p.count; i++) {
      const a = k.rnd("a", i) * 360;
      const dist = Math.sqrt(k.rnd("d", i)) * p.spread * (i === 0 ? 0 : 1);
      const s = p.size * (i === 0 ? 0.42 : 0.14 + k.rnd("s", i) * 0.22);
      const x = Math.cos(rad(a)) * dist;
      const z = Math.sin(rad(a)) * dist;
      const sy = 0.55 + k.rnd("sy", i) * 0.25;
      const col = shade(base, k.vary(-0.18, 0.16, "c", i));
      k.sph("rock", [s, s * sy, s * k.vary(0.75, 1.1, "sz", i)], [x, s * sy * 0.8, z], col, { facets: k.rnd("f", i) > 0.5 ? 5 : 6, rot: [k.vary(-8, 8, "rx", i), a, k.vary(-8, 8, "rz", i)] });
      if (p.kind === "mossy") k.sph("moss", [s * 0.7, s * 0.2, s * 0.7], [x, s * sy * 1.45, z], "#5BAE4F", { facets: 5, rot: [0, a, 0] });
      k.sph("facet-chip", [s * 0.5, s * 0.22, s * 0.5], [x - s * 0.15, s * sy * 1.25, z + s * 0.1], shade(col, 0.14), { facets: 4, rot: [10, a + 40, 6] });
      k.sph("crack", [s * 0.12, s * 0.5, s * 0.03], [x + s * 0.4, s * sy * 0.9, z + s * 0.7], shade(col, -0.35), { facets: 4, rot: [0, a, 12] });
      if (i % 3 === 0) k.sph("pebble", [s * 0.18], [x + s * 1.2, s * 0.14, z + s * 0.4], shade(col, 0.08), { facets: 5 });
    }
    return { scatter: undefined };
  },
};

B.cloud = {
  about: "Faceted low-poly cloud: a flat-bottomed cluster of 6-sided puffs with a shaded underside.",
  params: {
    size: num(1.2, 0.4, 3, "Overall width"),
    puffs: int(11, 4, 14, "Puffs"),
    color: color("Top color (default white)"),
    shadeAmount: num(0.07, 0, 0.3, "Underside darkening"),
  },
  build(p, k) {
    const top = p.color ?? "#FFFFFF";
    const under = shade(isHex(top) ? top : "#FFFFFF", -p.shadeAmount);
    k.sph("base", [p.size * 0.5, p.size * 0.12, p.size * 0.26], [0, 0.02, 0], under, { facets: 8, rot: [0, 15, 0] });
    for (let i = 0; i < p.puffs; i++) {
      const u = (i + 0.5) / p.puffs;
      const x = (u - 0.5) * p.size * 0.9;
      const hump = 1 - Math.abs(u - 0.5) * 1.5;
      const r = p.size * (0.14 + 0.2 * Math.max(0.15, hump)) * k.vary(0.85, 1.15, "r", i);
      k.sph("puff", [r, r * 0.8, r * 0.9], [x, r * 0.55 + 0.05 + k.vary(0, 0.05, "y", i), k.vary(-0.1, 0.1, "z", i) * p.size], i % 3 === 0 ? shade(top, -p.shadeAmount * 0.5) : top, { facets: 6, rot: [0, i * 33, 0] });
    }
    for (let i = 0; i < 6; i++) {
      const x = (k.rnd("wx", i) - 0.5) * p.size * 0.95;
      k.sph("wisp", [p.size * 0.07, p.size * 0.05, p.size * 0.06], [x, p.size * 0.04 + 0.02, (k.rnd("wz", i) - 0.5) * p.size * 0.3], i % 2 ? top : under, { facets: 5, rot: [0, i * 51, 0] });
    }
    return {};
  },
};

B.pool = {
  about: "Tiled swimming pool shell: floor and thick walls with a checkerboard tile grid, a waterline tile band, coping, a ladder, a drain with a grate, lights and optional steps. Long side along x, bottom at y = 0, rim at y = depth. `liquid` adds a water volume hook.",
  params: {
    length: num(5.4, 3, 9, "Length (x)"),
    width: num(4.4, 2.5, 7, "Width (z)"),
    depth: num(1.7, 0.8, 2.5, "Depth"),
    wall: num(0.22, 0.12, 0.5, "Wall thickness"),
    tile1: color("Tile color A"),
    tile2: color("Tile color B"),
    shell: color("Concrete shell color"),
    coping: color("Coping color"),
    ladder: bool(true, "Chrome ladder at the +x end"),
    drain: bool(true, "Drain with a grate in the floor"),
    lights: bool(true, "Underwater lights on the walls"),
    steps: bool(false, "Entry steps at the -x end"),
    cutaway: bool(false, "Leave the front (+z) wall out so the tiled inside shows from the camera side"),
  },
  build(p, k) {
    const { length: L, width: W, depth: D, wall: T } = p;
    const t1 = p.tile1 ?? "#7FD0E8";
    const t2 = p.tile2 ?? "#5BBBD9";
    const shell = p.shell ?? "#B9BDC2";
    const cop = p.coping ?? "#EDEAE2";
    k.box("floor-shell", [L, T, W], [0, T / 2, 0], shell);
    const nx = Math.max(2, Math.min(9, Math.round((L - 2 * T) / 0.65)));
    const nz = Math.max(2, Math.min(8, Math.round((W - 2 * T) / 0.65)));
    const tx = (L - 2 * T) / nx;
    const tz = (W - 2 * T) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) k.box("tile", [tx * 0.96, 0.03, tz * 0.96], [-L / 2 + T + tx * (i + 0.5), T + 0.015, -W / 2 + T + tz * (j + 0.5)], (i + j) % 2 ? t1 : t2);
    const wallH = D;
    k.box("wall-back", [L, wallH, T], [0, wallH / 2, -W / 2 + T / 2], shell);
    if (!p.cutaway) k.box("wall-front", [L, wallH, T], [0, wallH / 2, W / 2 - T / 2], shell);
    else k.box("wall-front-low", [L, 0.14, T], [0, 0.07 + T, W / 2 - T / 2], shell);
    k.box("wall-left", [T, wallH, W - 2 * T], [-L / 2 + T / 2, wallH / 2, 0], shell);
    k.box("wall-right", [T, wallH, W - 2 * T], [L / 2 - T / 2, wallH / 2, 0], shell);
    const bandY = wallH - 0.22;
    k.box("band-back", [L - 2 * T, 0.22, 0.04], [0, bandY + 0.0, -W / 2 + T + 0.02], t2);
    if (!p.cutaway) k.box("band-front", [L - 2 * T, 0.22, 0.04], [0, bandY, W / 2 - T - 0.02], t2);
    k.box("band-left", [0.04, 0.22, W - 2 * T], [-L / 2 + T + 0.02, bandY, 0], t2);
    k.box("band-right", [0.04, 0.22, W - 2 * T], [L / 2 - T - 0.02, bandY, 0], t2);
    // wall tile grout lines
    for (let i = 1; i < nx; i += 2) k.box("wall-grid", [0.02, wallH - T - 0.25, 0.02], [-L / 2 + T + tx * i, (wallH + T) / 2 - 0.12, -W / 2 + T + 0.015], shade(t1, -0.12));
    // coping stones around the rim
    const cw = 0.34;
    k.box("coping-back", [L + cw, 0.1, cw], [0, wallH + 0.05, -W / 2 + T - cw / 2 + 0.05], cop, { radius: 0.03 });
    if (!p.cutaway) k.box("coping-front", [L + cw, 0.1, cw], [0, wallH + 0.05, W / 2 - T + cw / 2 - 0.05], cop, { radius: 0.03 });
    k.box("coping-left", [cw, 0.1, W], [-L / 2 + T - cw / 2 + 0.05, wallH + 0.05, 0], cop, { radius: 0.03 });
    k.box("coping-right", [cw, 0.1, W], [L / 2 - T + cw / 2 - 0.05, wallH + 0.05, 0], cop, { radius: 0.03 });
    if (p.ladder) {
      const lx = L / 2 - T - 0.12;
      const lz = -W * 0.18;
      for (const s of [-1, 1]) {
        k.tor("ladder-rail", [0.2, 0.025, 180], [lx, wallH + 0.02, lz + s * 0.2], "#D9DEE5", { material: "metal", rot: [0, 90, 0] });
        k.cyl("ladder-rail-in", [0.022, 0.022, wallH * 0.62], [lx - 0.2, wallH - wallH * 0.31 + 0.05, lz + s * 0.2], "#D9DEE5", { material: "metal", facets: 8 });
        k.cyl("ladder-foot", [0.035, 0.035, 0.03], [lx - 0.2, wallH * 0.36, lz + s * 0.2], "#8A93A0", { facets: 8 });
      }
      for (let i = 0; i < 4; i++) k.box("rung", [0.05, 0.035, 0.4], [lx - 0.2, wallH * (0.46 + i * 0.13), lz], "#EEF1F5", { material: "metal" });
    }
    if (p.drain) {
      k.cyl("drain-base", [0.2, 0.2, 0.02], [0, T + 0.035, 0], "#4B5563", { facets: 12 });
      k.cyl("drain-grate", [0.17, 0.17, 0.02], [0, T + 0.05, 0], "#9AA3AD", { facets: 12 });
      for (let i = -1; i <= 1; i++) k.box("drain-slot", [0.28, 0.012, 0.025], [0, T + 0.065, i * 0.07], "#2F3640");
    }
    if (p.lights) for (const s of [-1, 1]) k.cyl("pool-light", [0.07, 0.07, 0.04], [s * L * 0.25, wallH * 0.55, -W / 2 + T + 0.03], "#FFF3B0", { rot: [90, 0, 0], facets: 10, material: "emissive", emissive: 1 });
    if (p.steps) for (let i = 0; i < 3; i++) k.box("step", [0.4, 0.2 * (i + 1), W * 0.35], [-L / 2 + T + 0.2 + i * 0.4, T + 0.1 * (i + 1), W * 0.18], i % 2 ? t1 : shell);
    return { liquid: { area: [-L / 2 + T, -W / 2 + T, L / 2 - T, W / 2 - T], floor: T + 0.03, top: wallH - 0.1 } };
  },
};

B["pipe-run"] = {
  about: "Pipe run through waypoints (routed along x, then y, then z): straight tubes with elbow joints, blue couplings and flanges, optional clamps to the ground and glowing signal dots (`dot-0`..) that beats can move along the run.",
  params: {
    points: list([[-2.2, 0.5, 0], [0, 0.5, 0], [0, 1.7, 0], [2.2, 1.7, 0]], "Waypoints [[x, y, z], ...] (axis-aligned segments between them)"),
    radius: num(0.1, 0.04, 0.3, "Pipe radius"),
    pipe: color("Pipe color"),
    joint: color("Coupling and joint color"),
    dots: int(5, 0, 12, "Glowing signal dots along the run"),
    clamps: bool(true, "Ground clamps under horizontal runs"),
    flanges: bool(true, "Flange rings at the couplings"),
  },
  build(p, k) {
    const pipeC = p.pipe ?? "#8D9AAE";
    const jointC = p.joint ?? "#2F7DE1";
    const R = p.radius;
    const rotOf = (ax) => (ax === 0 ? [0, 0, 90] : ax === 2 ? [90, 0, 0] : undefined);
    const pts = p.points.filter((q) => Array.isArray(q) && q.length === 3);
    // Manhattan route
    const route = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      let cur = route[route.length - 1];
      for (const ax of [0, 1, 2]) {
        if (Math.abs(pts[i][ax] - cur[ax]) > 1e-6) {
          const nxt = [...cur];
          nxt[ax] = pts[i][ax];
          route.push(nxt);
          cur = nxt;
        }
      }
    }
    let total = 0;
    const segs = [];
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1];
      const b = route[i];
      const ax = [0, 1, 2].find((q) => Math.abs(a[q] - b[q]) > 1e-6);
      const len = Math.abs(b[ax] - a[ax]);
      segs.push({ a, b, ax, len, start: total });
      total += len;
    }
    for (const s of segs) {
      const mid = s.a.map((v, i) => (v + s.b[i]) / 2);
      const rot = s.ax === 0 ? [0, 0, 90] : s.ax === 2 ? [90, 0, 0] : undefined;
      k.cyl("pipe", [R, R, s.len + R * 0.2], mid, pipeC, { rot, facets: 10 });
      // couplings every ~1.3 units
      const n = Math.max(1, Math.floor(s.len / 1.3));
      for (let c = 1; c <= n; c++) {
        const u = c / (n + 1);
        const at = s.a.map((v, i) => v + (s.b[i] - v) * u);
        k.cyl("coupling", [R * 1.28, R * 1.28, 0.2], at, jointC, { rot, facets: 10 });
        if (p.flanges) for (const o of [-0.12, 0.12]) k.cyl("flange", [R * 1.55, R * 1.55, 0.04], at.map((v, i) => v + (i === s.ax ? o : 0)), shade(jointC, -0.2), { rot, facets: 10 });
      }
      if (p.clamps && s.ax !== 1 && s.a[1] > 0.1) {
        const at = [mid[0], 0, mid[2]];
        k.box("clamp-post", [R * 0.7, mid[1] - R, R * 0.7], [at[0], (mid[1] - R) / 2, at[2]], "#5B6270");
        k.box("clamp", [R * (s.ax === 0 ? 0.9 : 2.8), R * 0.5, R * (s.ax === 2 ? 0.9 : 2.8)], [at[0], mid[1] - R * 1.05, at[2]], "#5B6270");
      }
    }
    for (const sg of segs) {
      const n = Math.max(2, Math.floor(sg.len / 0.45));
      for (let c = 0; c < Math.min(n, 6); c++) {
        const u = (c + 0.5) / Math.min(n, 6);
        const at = sg.a.map((v, i) => v + (sg.b[i] - v) * u);
        k.cyl("band", [R * 1.12, R * 1.12, 0.035], at, shade(pipeC, -0.25), { rot: rotOf(sg.ax), facets: 10 });
      }
    }
    for (let i = 1; i < route.length - 1; i++) k.sph("elbow", [R * 1.38], route[i], jointC, { facets: 8 });
    if (segs.length) {
      k.cyl("end-cap", [R * 1.4, R * 1.4, 0.09], route[0], shade(jointC, -0.15), { rot: rotOf(segs[0].ax), facets: 10 });
      k.cyl("end-cap", [R * 1.4, R * 1.4, 0.09], route[route.length - 1], shade(jointC, -0.15), { rot: rotOf(segs[segs.length - 1].ax), facets: 10 });
    }
    for (let i = 0; i < p.dots; i++) {
      const dist = ((i + 0.5) / p.dots) * total;
      const s = segs.find((q) => dist >= q.start && dist <= q.start + q.len) ?? segs[segs.length - 1];
      const u = (dist - s.start) / Math.max(1e-6, s.len);
      k.sph("dot", [R * 0.7], s.a.map((v, a) => v + (s.b[a] - v) * u), "#DFF6FF", { facets: 6, material: "emissive", emissive: 1.5, role: "glow" });
    }
    return {};
  },
};

B["rebar-grid"] = {
  about: "Reinforcing steel mat: two crossing layers of ribbed bars with wire ties at the crossings, bar chairs under it and optional wooden form boards; the mat floats `lift` above its base.",
  params: {
    width: num(3.6, 1, 6, "Width (x)"),
    depth: num(2.6, 1, 5, "Depth (z)"),
    spacing: num(0.4, 0.2, 0.9, "Bar spacing"),
    bar: num(0.03, 0.015, 0.06, "Bar radius"),
    lift: num(0.14, 0, 1, "Height of the lower layer above the base"),
    layers: int(2, 1, 2, "Layers of bars"),
    color: color("Bar color"),
    forms: bool(false, "Wooden form boards around the edge"),
    chairs: bool(true, "Small supports under the mat"),
  },
  build(p, k) {
    const steel = p.color ?? "#8A5A3C";
    const R = p.bar;
    let nx = Math.max(2, Math.round(p.width / p.spacing) + 1);
    let nz = Math.max(2, Math.round(p.depth / p.spacing) + 1);
    while (nx * nz > 60) {
      nx = Math.max(2, nx - 1);
      nz = Math.max(2, nz - 1);
    }
    const y1 = p.lift + R;
    const y2 = y1 + R * 2.2;
    for (let i = 0; i < nz; i++) k.cyl("bar-x", [R, R, p.width], [0, y1, -p.depth / 2 + (i / (nz - 1)) * p.depth], i % 2 ? steel : shade(steel, 0.08), { rot: [0, 0, 90], facets: 6 });
    if (p.layers === 2) for (let j = 0; j < nx; j++) k.cyl("bar-z", [R, R, p.depth], [-p.width / 2 + (j / (nx - 1)) * p.width, y2, 0], j % 2 ? steel : shade(steel, 0.08), { rot: [90, 0, 0], facets: 6 });
    for (let i = 0; i < nz; i++) for (let j = 0; j < nx; j++) if ((i + j) % 2 === 0 && p.layers === 2) k.box("tie", [R * 2.4, R * 2.6, R * 2.4], [-p.width / 2 + (j / (nx - 1)) * p.width, (y1 + y2) / 2, -p.depth / 2 + (i / (nz - 1)) * p.depth], "#C9CED6");
    if (p.chairs) for (const [fx, fz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0]]) k.box("chair", [0.08, p.lift, 0.08], [fx * p.width * 0.8, p.lift / 2, fz * p.depth * 0.8], "#E86A3A");
    if (p.forms) {
      const hh = p.lift + 0.3;
      for (const [x, z, sx, sz] of [[0, -1, p.width + 0.2, 0.06], [0, 1, p.width + 0.2, 0.06], [-1, 0, 0.06, p.depth], [1, 0, 0.06, p.depth]]) k.box("form", [sx, hh, sz], [(x * (p.width + 0.1)) / 2, hh / 2, (z * (p.depth + 0.1)) / 2], shade(WOOD, 0.3));
    }
    return {};
  },
};

B.slab = {
  about: "Chamfered concrete slab poured in `layers` (each its own part, `layer-0`.. so beats can reveal them one by one), with expansion joints, aggregate speckles, optional form boards and stakes.",
  params: {
    width: num(4.6, 1, 8, "Width (x)"),
    depth: num(3.6, 1, 6, "Depth (z)"),
    thickness: num(0.35, 0.1, 1.2, "Total thickness"),
    layers: int(3, 1, 5, "Pour layers"),
    chamfer: num(0.06, 0, 0.2, "Edge chamfer"),
    joints: int(2, 0, 4, "Expansion joints each way"),
    speckle: int(36, 0, 60, "Aggregate speckles on the top"),
    color: color("Concrete color"),
    forms: bool(false, "Wooden form boards and stakes"),
  },
  build(p, k) {
    const col = p.color ?? "#B9BDC2";
    const lt = p.thickness / p.layers;
    for (let i = 0; i < p.layers; i++) k.box("layer", [p.width - i * 0.0, lt * 0.98, p.depth], [0, lt * (i + 0.5), 0], shade(isHex(col) ? col : "#B9BDC2", i * 0.02 - 0.03), { radius: Math.min(p.chamfer, lt * 0.45) });
    for (let i = 1; i <= p.joints; i++) {
      k.box("joint-x", [p.width * 0.98, 0.012, 0.02], [0, p.thickness + 0.004, -p.depth / 2 + (i / (p.joints + 1)) * p.depth], shade(col, -0.35));
      k.box("joint-z", [0.02, 0.012, p.depth * 0.98], [-p.width / 2 + (i / (p.joints + 1)) * p.width, p.thickness + 0.004, 0], shade(col, -0.35));
    }
    for (let i = 0; i < p.speckle; i++) k.box("speck", [0.05 + k.rnd("w", i) * 0.05, 0.012, 0.04 + k.rnd("d", i) * 0.04], [(k.rnd("x", i) - 0.5) * p.width * 0.9, p.thickness + 0.006, (k.rnd("z", i) - 0.5) * p.depth * 0.9], shade(col, k.vary(-0.25, 0.2, "c", i)), { rot: [0, k.rnd("r", i) * 180, 0] });
    if (p.forms) {
      const hh = p.thickness + 0.1;
      for (const [x, z, sx, sz] of [[0, -1, p.width + 0.2, 0.05], [0, 1, p.width + 0.2, 0.05], [-1, 0, 0.05, p.depth], [1, 0, 0.05, p.depth]]) k.box("form", [sx, hh, sz], [(x * (p.width + 0.075)) / 2, hh / 2, (z * (p.depth + 0.075)) / 2], shade(WOOD, 0.3));
      for (let i = 0; i < 4; i++) k.box("stake", [0.05, hh + 0.2, 0.05], [((i % 2) * 2 - 1) * (p.width / 2 + 0.15), (hh + 0.2) / 2 - 0.1, (Math.floor(i / 2) * 2 - 1) * (p.depth / 2 + 0.15)], WOOD);
    }
    return {};
  },
};

B.valve = {
  about: "Industrial valve between two pipe stubs: bolted flanges, a body (gate, ball or relief) with bonnet, stem and a handwheel group `wheel` that beats can turn; the relief type adds a spring and a gauge with a `needle` group.",
  params: {
    kind: opt("gate", ["gate", "ball", "relief"], "Valve type"),
    size: num(1, 0.5, 2, "Overall scale"),
    body: color("Body color"),
    pipe: color("Pipe stub color"),
    bolts: int(6, 4, 8, "Bolts per flange"),
  },
  build(p, k) {
    const s = p.size;
    const body = p.body ?? "#D64545";
    const pipe = p.pipe ?? "#8D9AAE";
    const R = 0.16 * s;
    k.cyl("stub", [R, R, 2.0 * s], [0, 0.4 * s, 0], pipe, { rot: [0, 0, 90], facets: 12 });
    for (const sx of [-1, 1]) {
      k.cyl("flange", [R * 1.7, R * 1.7, 0.1 * s], [sx * 0.5 * s, 0.4 * s, 0], shade(pipe, -0.15), { rot: [0, 0, 90], facets: 14 });
      for (let i = 0; i < p.bolts; i++) {
        const a = (i / p.bolts) * 360;
        const by = 0.4 * s + Math.cos(rad(a)) * R * 1.4;
        const bz = Math.sin(rad(a)) * R * 1.4;
        k.cyl("bolt", [0.035 * s, 0.035 * s, 0.16 * s], [sx * 0.5 * s, by, bz], "#5B6270", { rot: [0, 0, 90], facets: 6 });
        k.cyl("nut", [0.05 * s, 0.05 * s, 0.04 * s], [sx * 0.5 * s + sx * 0.09 * s, by, bz], "#3F4752", { rot: [0, 0, 90], facets: 6 });
      }
    }
    if (p.kind === "ball") k.sph("body", [0.34 * s], [0, 0.4 * s, 0], body, { facets: 8 });
    else k.cyl("body", [0.3 * s, 0.34 * s, 0.7 * s], [0, 0.4 * s, 0], body, { facets: 8, rot: [0, 0, 0] });
    k.cyl("body-band", [0.36 * s, 0.36 * s, 0.07 * s], [0, 0.3 * s, 0], shade(body, -0.2), { facets: 8 });
    k.cyl("bonnet", [0.2 * s, 0.24 * s, 0.28 * s], [0, 0.88 * s, 0], shade(body, -0.1), { facets: 8 });
    for (const sx of [-1, 1]) k.box("body-rib", [0.04 * s, 0.5 * s, 0.5 * s], [sx * 0.22 * s, 0.42 * s, 0], shade(body, -0.12), { rot: [0, 0, 0] });
    k.box("plate", [0.3 * s, 0.1 * s, 0.02 * s], [0, 0.4 * s, 0.31 * s], "#E8E8E0");
    k.box("arrow", [0.18 * s, 0.025 * s, 0.01 * s], [0, 0.4 * s, 0.325 * s], "#2F7DE1");
    k.cyl("stem", [0.045 * s, 0.045 * s, 0.5 * s], [0, 1.2 * s, 0], "#C8CDD4", { facets: 8, material: "metal" });
    const wheel = k.grp("wheel", [0, 1.46 * s, 0]);
    k.tor("rim", [0.3 * s, 0.035 * s], [0, 0, 0], shade(body, 0.1), { parent: wheel, rot: [90, 0, 0] });
    for (let i = 0; i < 4; i++) k.box("spoke", [0.58 * s, 0.03 * s, 0.04 * s], [0, 0, 0], shade(body, 0.1), { parent: wheel, rot: [0, i * 45, 0] });
    k.cyl("hub", [0.07 * s, 0.07 * s, 0.09 * s], [0, 0, 0], "#F2C14E", { parent: wheel, facets: 8 });
    if (p.kind === "relief") {
      for (let i = 0; i < 5; i++) k.tor("spring", [0.12 * s, 0.018 * s], [0, (0.98 + i * 0.07) * s, 0], "#C8CDD4", { rot: [90, 0, 0], material: "metal" });
      k.cyl("gauge", [0.16 * s, 0.16 * s, 0.07 * s], [0.45 * s, 0.9 * s, 0.1 * s], "#F4F1EA", { rot: [90, 0, 0], facets: 14 });
      k.cyl("gauge-rim", [0.18 * s, 0.18 * s, 0.05 * s], [0.45 * s, 0.9 * s, 0.08 * s], "#5B6270", { rot: [90, 0, 0], facets: 14 });
      const needle = k.grp("needle", [0.45 * s, 0.9 * s, 0.15 * s]);
      k.box("needle-arm", [0.012 * s, 0.13 * s, 0.01 * s], [0, 0.06 * s, 0], "#D64545", { parent: needle });
      k.cyl("gauge-neck", [0.025 * s, 0.025 * s, 0.3 * s], [0.3 * s, 0.7 * s, 0.05 * s], "#5B6270", { rot: [0, 0, 60], facets: 6 });
    }
    return {};
  },
};

B.person = {
  about: "Toon person with a rig: groups `arm-l`, `arm-r` (pivot at the shoulder), `leg-l`, `leg-r` (pivot at the hip) and `head`; hats (hard-hat, cap, beanie, none), optional safety vest and a tool in the right hand (shovel, wrench, clipboard). Walk: motion [{type:\"walk\", parts:[\"leg-l\",\"leg-r\",\"arm-l\",\"arm-r\"]}]; wave: a `wave` motion on `arm-r`.",
  params: {
    height: num(1.7, 1, 2.4, "Total height"),
    skin: color("Skin color"),
    shirt: color("Shirt color"),
    pants: color("Trousers color"),
    hat: opt("hard-hat", ["none", "hard-hat", "cap", "beanie", "crown", "helmet", "pirate", "tophat", "bandana"], "Headwear"),
    outfit: opt("casual", ["casual", "coat", "armor", "robe", "suit", "cape"], "Costume over the torso: coat (white lab coat), armor (metal plates), robe (long robe), suit (jacket and tie), cape"),
    hatColor: color("Headwear color"),
    vest: bool(false, "High-visibility vest with reflective stripes"),
    tool: opt("none", ["none", "shovel", "wrench", "clipboard"], "Held tool"),
  },
  build(p, k) {
    const h = p.height / 1.7;
    const skin = p.skin ?? k.pick(["#E8B48A", "#C98B5E", "#F1C9A5", "#8D5A3B", "#D9A06F"], "skin");
    const shirt = p.shirt ?? k.pick(["#3B82F6", "#E5484D", "#2FB98F", "#F2A81D", "#8B5CF6"], "shirt");
    const pants = p.pants ?? k.pick(["#3B4A6B", "#4A4A52", "#5B4636"], "pants");
    const hatC = p.hatColor ?? (p.hat === "hard-hat" ? "#F2C14E" : k.pick(["#E5484D", "#2B3550", "#3F7D4E"], "hat"));
    const hipY = 0.82 * h;
    k.box("hips", [0.42 * h, 0.2 * h, 0.26 * h], [0, hipY, 0], pants, { radius: 0.04 });
    k.box("belt", [0.44 * h, 0.05 * h, 0.28 * h], [0, hipY + 0.08 * h, 0], "#3A2F28");
    k.box("torso", [0.46 * h, 0.52 * h, 0.27 * h], [0, hipY + 0.34 * h, 0], shirt, { radius: 0.06 });
    if (p.vest) {
      k.box("vest", [0.49 * h, 0.5 * h, 0.3 * h], [0, hipY + 0.34 * h, 0.002], "#F2A81D", { radius: 0.05 });
      k.box("vest-stripe", [0.5 * h, 0.04 * h, 0.31 * h], [0, hipY + 0.28 * h, 0.002], "#F4F4F0");
      k.box("vest-stripe", [0.5 * h, 0.04 * h, 0.31 * h], [0, hipY + 0.44 * h, 0.002], "#F4F4F0");
    }
    if (p.outfit === "coat") {
      k.box("outfit", [0.5 * h, 0.78 * h, 0.3 * h], [0, hipY + 0.2 * h, 0], "#F4F4F0", { radius: 0.04 });
      k.box("outfit-lapel", [0.05 * h, 0.4 * h, 0.01 * h], [0.1 * h, hipY + 0.42 * h, 0.155 * h], "#D7DBE3", { rot: [0, 0, -12] });
    } else if (p.outfit === "armor") {
      k.box("outfit", [0.5 * h, 0.5 * h, 0.31 * h], [0, hipY + 0.35 * h, 0.01], "#AEB6C4", { radius: 0.05, material: "metal" });
      for (const sx of [-1, 1]) k.sph("outfit-pauldron", [0.12 * h, 0.07 * h, 0.12 * h], [sx * 0.3 * h, hipY + 0.58 * h, 0], "#9AA3AD", { facets: 6, material: "metal" });
      k.box("outfit-belt", [0.5 * h, 0.06 * h, 0.31 * h], [0, hipY + 0.1 * h, 0], "#5B4636");
    } else if (p.outfit === "robe") {
      k.cone("outfit", [0.34 * h, 1.0 * h], [0, hipY - 0.05 * h, 0], p.shirt ?? "#8B5CF6", { facets: 8 });
      k.box("outfit-sash", [0.42 * h, 0.06 * h, 0.3 * h], [0, hipY + 0.12 * h, 0], "#F2C14E");
    } else if (p.outfit === "suit") {
      k.box("outfit", [0.49 * h, 0.54 * h, 0.29 * h], [0, hipY + 0.34 * h, 0.004], "#2B3550", { radius: 0.05 });
      k.ext("outfit-tie", 0.012 * h, [[-0.025 * h, 0.2 * h], [0.025 * h, 0.2 * h], [0.03 * h, 0], [0, -0.04 * h], [-0.03 * h, 0]], [0, hipY + 0.48 * h, 0.15 * h], "#E5484D");
    } else if (p.outfit === "cape") k.box("outfit", [0.5 * h, 0.8 * h, 0.03 * h], [0, hipY + 0.2 * h, -0.17 * h], "#B8453A", { rot: [4, 0, 0] });
    k.box("collar", [0.2 * h, 0.04 * h, 0.14 * h], [0, hipY + 0.6 * h, 0.01 * h], shade(shirt, 0.18));
    k.box("buckle", [0.05 * h, 0.04 * h, 0.01 * h], [0, hipY + 0.08 * h, 0.145 * h], "#E8B84A");
    for (let i = 0; i < 3; i++) k.sph("button", [0.012 * h], [0, hipY + (0.18 + i * 0.1) * h, 0.138 * h], shade(shirt, -0.3), { facets: 5 });
    for (const sx of [-1, 1]) k.box("pocket", [0.1 * h, 0.09 * h, 0.01 * h], [sx * 0.12 * h, hipY + 0.2 * h, 0.139 * h], shade(shirt, -0.12));
    k.cyl("neck", [0.06 * h, 0.07 * h, 0.1 * h], [0, hipY + 0.64 * h, 0], skin, { facets: 8 });
    const head = k.grp("head", [0, hipY + 0.82 * h, 0]);
    k.sph("skull", [0.15 * h, 0.16 * h, 0.15 * h], [0, 0, 0], skin, { parent: head, facets: 8 });
    for (const sx of [-1, 1]) {
      k.sph("eye", [0.022 * h], [sx * 0.055 * h, 0.01 * h, 0.14 * h], "#1E2230", { parent: head, facets: 6 });
      k.sph("ear", [0.03 * h], [sx * 0.15 * h, 0, 0], shade(skin, -0.06), { parent: head, facets: 5 });
    }
    for (const sx of [-1, 1]) k.box("brow", [0.05 * h, 0.01 * h, 0.01 * h], [sx * 0.055 * h, 0.05 * h, 0.145 * h], "#3A2F28", { parent: head });
    k.sph("nose", [0.025 * h], [0, -0.02 * h, 0.155 * h], shade(skin, -0.08), { parent: head, facets: 5 });
    k.box("mouth", [0.06 * h, 0.012 * h, 0.01 * h], [0, -0.07 * h, 0.147 * h], "#A24B4B", { parent: head });
    if (p.hat === "hard-hat") {
      k.sph("hat", [0.17 * h, 0.12 * h, 0.17 * h], [0, 0.07 * h, 0], hatC, { parent: head, facets: 8 });
      k.box("hat-brim", [0.32 * h, 0.02 * h, 0.36 * h], [0, 0.04 * h, 0.03 * h], shade(hatC, -0.1), { parent: head });
      k.box("hat-ridge", [0.04 * h, 0.03 * h, 0.3 * h], [0, 0.17 * h, 0], shade(hatC, -0.15), { parent: head });
    } else if (p.hat === "cap") {
      k.sph("hat", [0.16 * h, 0.1 * h, 0.16 * h], [0, 0.07 * h, 0], hatC, { parent: head, facets: 8 });
      k.box("hat-brim", [0.2 * h, 0.015 * h, 0.14 * h], [0, 0.05 * h, 0.17 * h], shade(hatC, -0.15), { parent: head });
    } else if (p.hat === "beanie") {
      k.sph("hat", [0.165 * h, 0.13 * h, 0.165 * h], [0, 0.07 * h, 0], hatC, { parent: head, facets: 7 });
      k.sph("hat-pom", [0.04 * h], [0, 0.2 * h, 0], shade(hatC, 0.25), { parent: head, facets: 5 });
    } else if (p.hat === "crown") {
      k.cyl("hat", [0.13 * h, 0.14 * h, 0.08 * h], [0, 0.15 * h, 0], "#F2C14E", { parent: head, facets: 8, material: "metal" });
      for (let i = 0; i < 5; i++) k.cone("hat-point", [0.03 * h, 0.08 * h], [Math.cos(rad(i * 72)) * 0.12 * h, 0.23 * h, Math.sin(rad(i * 72)) * 0.12 * h], "#F2C14E", { parent: head, facets: 4 });
    } else if (p.hat === "helmet") {
      k.sph("hat", [0.17 * h, 0.14 * h, 0.17 * h], [0, 0.05 * h, 0], "#AEB6C4", { parent: head, facets: 8, material: "metal" });
      k.box("hat-crest", [0.03 * h, 0.1 * h, 0.2 * h], [0, 0.2 * h, 0], hatC, { parent: head });
      k.box("hat-visor", [0.18 * h, 0.03 * h, 0.02 * h], [0, 0.02 * h, 0.17 * h], "#5B6270", { parent: head });
    } else if (p.hat === "pirate") {
      k.cone("hat", [0.25 * h, 0.1 * h], [0, 0.15 * h, 0], "#1E2230", { parent: head, facets: 3, rot: [0, 90, 0], scale: [1, 1, 1.2] });
      k.cyl("hat-skull", [0.03 * h, 0.03 * h, 0.01 * h], [0, 0.15 * h, 0.17 * h], "#F4F4F0", { parent: head, rot: [90, 0, 0], facets: 6 });
      k.box("eyepatch", [0.05 * h, 0.04 * h, 0.01 * h], [0.055 * h, 0.01 * h, 0.15 * h], "#14161C", { parent: head });
    } else if (p.hat === "tophat") {
      k.cyl("hat", [0.1 * h, 0.1 * h, 0.2 * h], [0, 0.22 * h, 0], "#1E2230", { parent: head, facets: 8 });
      k.cyl("hat-brim", [0.17 * h, 0.17 * h, 0.02 * h], [0, 0.12 * h, 0], "#1E2230", { parent: head, facets: 8 });
      k.cyl("hat-band", [0.102 * h, 0.102 * h, 0.04 * h], [0, 0.15 * h, 0], "#E5484D", { parent: head, facets: 8 });
    } else if (p.hat === "bandana") {
      k.cyl("hat", [0.16 * h, 0.16 * h, 0.05 * h], [0, 0.08 * h, 0], hatC, { parent: head, facets: 8 });
      k.box("hat-knot", [0.05 * h, 0.08 * h, 0.03 * h], [-0.16 * h, 0.04 * h, -0.05 * h], hatC, { parent: head, rot: [0, 0, 30] });
    } else k.sph("hair", [0.16 * h, 0.1 * h, 0.16 * h], [0, 0.07 * h, -0.01 * h], k.pick(["#3A2F28", "#7A4F2C", "#C9A96B", "#1E2230"], "hair"), { parent: head, facets: 7 });
    for (const [s, n] of [[1, "l"], [-1, "r"]]) {
      const arm = k.grp(`arm-${n}`, [s * 0.29 * h, hipY + 0.54 * h, 0]);
      k.cyl("upper-arm", [0.055 * h, 0.06 * h, 0.27 * h], [0, -0.13 * h, 0], shirt, { parent: arm, facets: 6 });
      k.cyl("forearm", [0.048 * h, 0.052 * h, 0.25 * h], [0, -0.38 * h, 0], skin, { parent: arm, facets: 6 });
      k.sph("hand", [0.055 * h], [0, -0.53 * h, 0], skin, { parent: arm, facets: 6 });
      k.sph("shoulder", [0.07 * h], [0, 0, 0], shirt, { parent: arm, facets: 6 });
      k.cyl("cuff", [0.055 * h, 0.055 * h, 0.03 * h], [0, -0.47 * h, 0], shade(shirt, -0.15), { parent: arm, facets: 6 });
      k.sph("thumb", [0.02 * h], [0.04 * h, -0.55 * h, 0.03 * h], skin, { parent: arm, facets: 4 });
      if (n === "r" && p.tool !== "none") {
        const tool = k.grp("tool", [0, -0.53 * h, 0.04 * h], { parent: arm });
        if (p.tool === "shovel") {
          k.cyl("tool-handle", [0.015 * h, 0.015 * h, 0.9 * h], [0, -0.15 * h, 0], WOOD, { parent: tool, facets: 5 });
          k.box("tool-blade", [0.16 * h, 0.2 * h, 0.02 * h], [0, -0.64 * h, 0], "#9AA3AD", { parent: tool, material: "metal" });
        } else if (p.tool === "wrench") {
          k.box("tool-handle", [0.04 * h, 0.4 * h, 0.02 * h], [0, -0.1 * h, 0], "#9AA3AD", { parent: tool, material: "metal" });
          k.tor("tool-jaw", [0.05 * h, 0.018 * h, 280], [0, 0.14 * h, 0], "#9AA3AD", { parent: tool, material: "metal" });
        } else {
          k.box("tool-board", [0.22 * h, 0.3 * h, 0.02 * h], [0, 0, 0], "#7A4F2C", { parent: tool });
          k.box("tool-paper", [0.18 * h, 0.25 * h, 0.01 * h], [0, 0, 0.012 * h], "#F4F4F0", { parent: tool });
        }
      }
    }
    for (const [s, n] of [[1, "l"], [-1, "r"]]) {
      const leg = k.grp(`leg-${n}`, [s * 0.11 * h, hipY - 0.04 * h, 0]);
      k.cyl("thigh", [0.075 * h, 0.07 * h, 0.4 * h], [0, -0.2 * h, 0], pants, { parent: leg, facets: 6 });
      k.cyl("shin", [0.065 * h, 0.06 * h, 0.36 * h], [0, -0.55 * h, 0], pants, { parent: leg, facets: 6 });
      k.box("boot", [0.12 * h, 0.09 * h, 0.22 * h], [0, -0.76 * h, 0.04 * h], "#3A2F28", { parent: leg, radius: 0.03 });
      k.box("sole", [0.13 * h, 0.025 * h, 0.23 * h], [0, -0.805 * h, 0.04 * h], "#1E2230", { parent: leg });
      k.cyl("cuff", [0.07 * h, 0.07 * h, 0.04 * h], [0, -0.72 * h, 0], shade(pants, -0.2), { parent: leg, facets: 6 });
      k.sph("knee", [0.06 * h], [0, -0.38 * h, 0.02 * h], shade(pants, 0.1), { parent: leg, facets: 5 });
    }
    return {};
  },
};

B["machine-box"] = {
  about: "Industrial machine housing: body with lid and plinth, vent slats, screws, a screen with bars, buttons and glowing indicator lights (`led-0`..), side handles, feet and a cable.",
  params: {
    width: num(2, 1, 3.5, "Width"),
    height: num(1.4, 0.8, 2.5, "Height"),
    depth: num(1.2, 0.7, 2, "Depth"),
    vents: int(6, 2, 10, "Vent slats"),
    lights: int(3, 1, 5, "Indicator lights"),
    body: color("Body color"),
    panel: color("Panel color"),
    screen: bool(true, "Front screen with bars"),
  },
  build(p, k) {
    const body = p.body ?? "accent";
    const panel = p.panel ?? "#2B3550";
    const { width: W, height: H, depth: D } = p;
    k.box("plinth", [W + 0.1, 0.12, D + 0.1], [0, 0.06, 0], "#4B5563");
    k.box("body", [W, H - 0.2, D], [0, 0.12 + (H - 0.2) / 2, 0], body, { radius: 0.06 });
    k.box("lid", [W + 0.06, 0.08, D + 0.06], [0, H - 0.04, 0], shade(body, -0.12), { radius: 0.03 });
    k.box("front-panel", [W - 0.3, H - 0.55, 0.04], [0, 0.12 + (H - 0.2) / 2 + 0.08, D / 2 + 0.01], panel, { radius: 0.02 });
    if (p.screen) {
      k.box("screen-frame", [W * 0.5, H * 0.3, 0.05], [0, H * 0.62, D / 2 + 0.04], "#1B2230");
      k.box("screen", [W * 0.5 - 0.1, H * 0.3 - 0.1, 0.03], [0, H * 0.62, D / 2 + 0.07], "#193B2E", { role: "screen" });
      for (let i = 0; i < 5; i++) k.box("screen-bar", [0.08, 0.08 + 0.18 * k.rnd("b", i), 0.02], [-W * 0.19 + i * 0.13 * (W / 2), H * 0.62 - 0.1 + 0.05 * k.rnd("b", i), D / 2 + 0.095], "#5CF2A8", { material: "emissive", emissive: 1 });
    }
    for (let i = 0; i < p.vents; i++) k.box("vent", [W * 0.34, 0.025, 0.03], [-W * 0.26 + 0, 0.25 + i * 0.06, D / 2 + 0.05], "#1B2230");
    for (let i = 0; i < 3; i++) k.cyl("button", [0.05, 0.05, 0.05], [W * 0.18 + i * 0.14, 0.34, D / 2 + 0.06], i === 2 ? "#E5484D" : "#C8CDD4", { rot: [90, 0, 0], facets: 8 });
    for (let i = 0; i < p.lights; i++) k.sph("led", [0.04], [W * 0.15 + i * 0.12 - (p.lights - 1) * 0.06, H - 0.3, D / 2 + 0.07], ["#5CF2A8", "#F2A81D", "#E5484D", "#5CC8F2", "#FFFFFF"][i % 5], { facets: 6, material: "emissive", emissive: 1.4, role: "glow" });
    for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) k.cyl("screw", [0.025, 0.025, 0.03], [x * (W / 2 - 0.1), 0.12 + (H - 0.2) * (y > 0 ? 0.92 : 0.1), D / 2 + 0.02], "#9AA3AD", { rot: [90, 0, 0], facets: 6 });
    for (let i = 0; i < 6; i++) k.cyl("rivet", [0.02, 0.02, 0.02], [-W / 2 + 0.12 + (i * (W - 0.24)) / 5, H - 0.12, D / 2 + 0.035], "#9AA3AD", { rot: [90, 0, 0], facets: 5 });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.box("side-vent", [0.03, 0.025, D * 0.5], [s * (W / 2 + 0.005), H * 0.3 + i * 0.07, 0], "#1B2230");
    for (const s of [-1, 1]) k.tor("handle", [0.12, 0.022, 180], [s * (W / 2 + 0.02), H * 0.55, 0], "#9AA3AD", { rot: [0, 90, 90], material: "metal" });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.cyl("foot", [0.06, 0.07, 0.07], [x * (W / 2 - 0.1), 0.0, z * (D / 2 - 0.1)], "#2B2F38", { facets: 6 });
    k.tube("cable", [0.035], [[W / 2, 0.4, -D * 0.2], [W / 2 + 0.3, 0.3, -D * 0.2], [W / 2 + 0.5, 0.05, 0.1]], "#2B2F38");
    return {};
  },
};

Kit.prototype.tube = function (name, size, points, color, o) {
  return this.add("tube", name, size, [0, 0, 0], color, { ...o, points: points.map((q) => q.map(r3)) });
};

B.battery = {
  about: "Battery pack: casing with cell windows, terminals, label stripes, a bolt icon and charge segments `seg-0`.. that glow (hide or recolor them with beats to charge or drain it).",
  params: {
    cells: int(3, 1, 6, "Cells"),
    width: num(1.4, 0.8, 3, "Width"),
    height: num(2.2, 1, 3.5, "Height"),
    segments: int(8, 3, 10, "Charge segments"),
    charge: num(1, 0, 1, "Fraction of segments lit at rest"),
    body: color("Casing color"),
    glow: color("Segment color"),
  },
  build(p, k) {
    const body = p.body ?? "#2B3550";
    const glow = p.glow ?? "#5CF2A8";
    const { width: W, height: H } = p;
    k.box("casing", [W, H, 0.7], [0, H / 2 + 0.1, 0], body, { radius: 0.09 });
    k.box("base", [W + 0.06, 0.1, 0.76], [0, 0.05, 0], shade(body, -0.2), { radius: 0.03 });
    k.cyl("terminal", [0.18, 0.18, 0.14], [-W * 0.25, H + 0.19, 0], "#C8CDD4", { facets: 8, material: "metal" });
    k.cyl("terminal", [0.18, 0.18, 0.14], [W * 0.25, H + 0.19, 0], "#E5484D", { facets: 8 });
    k.box("plus", [0.12, 0.03, 0.03], [W * 0.25, H + 0.28, 0], "#FFFFFF");
    k.box("plus", [0.03, 0.12, 0.03], [W * 0.25, H + 0.28, 0], "#FFFFFF");
    k.box("minus", [0.12, 0.03, 0.03], [-W * 0.25, H + 0.28, 0], "#FFFFFF");
    k.box("window", [W * 0.62, H * 0.62, 0.04], [0, H * 0.5 + 0.1, 0.36], "#141A28");
    const sh = (H * 0.62 - 0.12) / p.segments;
    for (let i = 0; i < p.segments; i++) {
      const lit = i < Math.round(p.segments * p.charge);
      k.box("seg", [W * 0.5, sh * 0.8, 0.03], [0, H * 0.5 + 0.1 - (H * 0.62) / 2 + 0.06 + sh * (i + 0.5), 0.39], lit ? midMix(glow, "#FFFFFF", i / (p.segments * 2)) : "#2B3550", { material: "emissive", emissive: lit ? 1.2 : 0, role: "glow" });
    }
    for (let i = 1; i < p.cells; i++) k.box("cell-line", [W + 0.02, 0.025, 0.72], [0, H * (i / p.cells) + 0.1, 0], shade(body, -0.3));
    k.ext("bolt", 0.03, [[0.0, 0.3], [-0.14, -0.02], [-0.02, -0.02], [-0.07, -0.3], [0.14, 0.04], [0.02, 0.04]], [0, H - 0.1, 0.38], "#F2C14E", { material: "emissive", emissive: 0.8 });
    k.box("label", [W * 0.7, 0.14, 0.02], [0, 0.34, 0.36], "#E8E8E0");
    for (let i = 0; i < 6; i++) k.box("ridge", [W + 0.02, 0.025, 0.04], [0, 0.16 + (i * (H - 0.4)) / 5, -0.36], shade(body, -0.25));
    for (const s of [-1, 1]) k.box("terminal-base", [0.34, 0.06, 0.34], [s * W * 0.25, H + 0.12, 0], "#4B5563");
    for (let i = 0; i < p.cells; i++) k.cyl("vent-cap", [0.05, 0.05, 0.03], [(i - (p.cells - 1) / 2) * 0.2, H + 0.13, -0.25], "#E8E8E0", { facets: 6 });
    k.tor("strap", [0.2, 0.02, 180], [0, H * 0.8, 0.36], "#9AA3AD", { rot: [0, 0, 0] });
    for (const s of [-1, 1]) k.box("side-stripe", [0.05, H * 0.8, 0.72], [s * (W / 2 - 0.03), H * 0.5 + 0.1, 0], shade(glow, -0.2));
    return {};
  },
};

B["solar-panel"] = {
  about: "Tilted photovoltaic panel: aluminium frame, a grid of dark-blue cells with busbar lines and a tilted group `panel`, support legs, a base rail, a cable and an inverter box.",
  params: {
    cols: int(6, 2, 8, "Cell columns"),
    rows: int(4, 2, 6, "Cell rows"),
    width: num(3, 1.2, 4.8, "Panel width"),
    tilt: num(32, 0, 70, "Tilt in degrees"),
    cell: color("Cell color"),
    frame: color("Frame color"),
    inverter: bool(true, "Inverter box beside the panel"),
  },
  build(p, k) {
    const cell = p.cell ?? "#1F3C88";
    const frame = p.frame ?? "#C8CDD4";
    const { width: W, cols, rows } = p;
    const Hh = (W * rows) / cols;
    const panel = k.grp("panel", [0, 0.55 + (Hh / 2) * Math.sin(rad(p.tilt)), 0], { rot: [-p.tilt, 0, 0] });
    k.box("back", [W + 0.1, Hh + 0.1, 0.05], [0, 0, 0], "#2B2F38", { parent: panel });
    k.box("frame-top", [W + 0.12, 0.06, 0.08], [0, Hh / 2 + 0.03, 0.02], frame, { parent: panel });
    k.box("frame-bot", [W + 0.12, 0.06, 0.08], [0, -Hh / 2 - 0.03, 0.02], frame, { parent: panel });
    k.box("frame-l", [0.06, Hh + 0.1, 0.08], [-W / 2 - 0.03, 0, 0.02], frame, { parent: panel });
    k.box("frame-r", [0.06, Hh + 0.1, 0.08], [W / 2 + 0.03, 0, 0.02], frame, { parent: panel });
    const cw = W / cols;
    const ch = Hh / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) k.box("cell", [cw * 0.94, ch * 0.94, 0.03], [-W / 2 + cw * (c + 0.5), -Hh / 2 + ch * (r + 0.5), 0.05], shade(cell, ((c + r) % 2) * 0.05 + (r / rows) * 0.06), { parent: panel });
    for (let c = 0; c < cols; c++) k.box("busbar", [0.012, Hh * 0.94, 0.012], [-W / 2 + cw * (c + 0.5), 0, 0.075], "#D9DEE5", { parent: panel });
    for (const s of [-1, 1]) k.box("leg", [0.07, 0.62, 0.07], [s * W * 0.36, 0.28, -Hh * 0.18 * Math.sin(rad(p.tilt)) - 0.05], frame, { rot: [0, 0, 0] });
    k.box("rail", [W + 0.2, 0.06, 0.1], [0, 0.03, Hh * 0.25], "#5B6270");
    k.box("rail-back", [W + 0.2, 0.06, 0.1], [0, 0.03, -Hh * 0.25], "#5B6270");
    k.tube("cable", [0.02], [[W / 2 - 0.2, 0.5, -0.1], [W / 2 + 0.2, 0.2, 0.2], [W / 2 + 0.6, 0.1, 0.35]], "#2B2F38");
    if (p.inverter) {
      k.box("inverter", [0.5, 0.6, 0.25], [W / 2 + 0.8, 0.4, 0.3], "#E8E8E0", { radius: 0.04 });
      k.sph("inverter-led", [0.03], [W / 2 + 0.7, 0.58, 0.43], "#5CF2A8", { facets: 6, material: "emissive", emissive: 1.2, role: "glow" });
      k.box("inverter-screen", [0.28, 0.14, 0.02], [W / 2 + 0.85, 0.5, 0.43], "#193B2E", { role: "screen" });
    }
    return {};
  },
};

B["server-rack"] = {
  about: "Server cabinet: frame, base and casters, N rack units with vent slits, drive bays, handles and glowing LEDs (`led-0`..), plus a cable bundle.",
  params: {
    units: int(8, 2, 10, "Rack units"),
    width: num(1.1, 0.8, 1.6, "Width"),
    depth: num(0.9, 0.6, 1.4, "Depth"),
    body: color("Cabinet color"),
    led: color("LED color"),
    led2: color("Alert LED color"),
  },
  build(p, k) {
    const body = p.body ?? "#2B3550";
    const led = p.led ?? "#5CF2A8";
    const led2 = p.led2 ?? "#F2A81D";
    const { units: N, width: W, depth: D } = p;
    const uh = 0.2;
    const H = N * uh + 0.3;
    k.box("base", [W + 0.08, 0.14, D + 0.08], [0, 0.07 + 0.08, 0], shade(body, -0.25));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      k.box("post", [0.07, H, 0.07], [x * (W / 2 - 0.02), H / 2 + 0.15, z * (D / 2 - 0.02)], shade(body, -0.1));
      k.cyl("caster", [0.05, 0.05, 0.08], [x * (W / 2 - 0.1), 0.04, z * (D / 2 - 0.1)], "#1B2230", { rot: [0, 0, 90], facets: 8 });
    }
    k.box("top", [W + 0.04, 0.08, D + 0.04], [0, H + 0.19, 0], shade(body, -0.15));
    k.box("back-panel", [W - 0.1, H, 0.03], [0, H / 2 + 0.15, -D / 2 + 0.02], shade(body, -0.35));
    for (const s of [-1, 1]) k.box("side-panel", [0.03, H, D - 0.1], [s * (W / 2 - 0.02), H / 2 + 0.15, 0], shade(body, -0.05));
    for (let i = 0; i < N; i++) {
      const y = 0.3 + uh * (i + 0.5);
      const f = i % 3 === 0;
      k.box("unit", [W - 0.16, uh * 0.88, 0.06], [0, y, D / 2 - 0.03], shade(body, f ? 0.12 : 0.06), { radius: 0.01 });
      k.box("vent", [W * 0.4, 0.02, 0.02], [-W * 0.16, y + 0.03, D / 2 + 0.01], "#141A28");
      k.box("vent", [W * 0.4, 0.02, 0.02], [-W * 0.16, y - 0.03, D / 2 + 0.01], "#141A28");
      k.sph("led", [0.022], [W * 0.3, y + 0.02, D / 2 + 0.02], (i * 7) % 5 === 0 ? led2 : led, { facets: 5, material: "emissive", emissive: 1.3, role: "glow" });
      k.sph("led", [0.022], [W * 0.38, y + 0.02, D / 2 + 0.02], led, { facets: 5, material: "emissive", emissive: 1.1, role: "glow" });
      k.box("handle", [0.12, 0.025, 0.03], [W * 0.34, y - 0.04, D / 2 + 0.03], "#9AA3AD");
    }
    k.tube("cables", [0.04], [[W / 2 - 0.1, H * 0.7, -D / 2], [W / 2 + 0.15, H * 0.5, -D / 2 - 0.1], [W / 2 + 0.3, 0.1, -D / 2 - 0.2]], "#E5484D");
    k.tube("cables", [0.04], [[W / 2 - 0.1, H * 0.62, -D / 2], [W / 2 + 0.2, H * 0.45, -D / 2 - 0.15], [W / 2 + 0.4, 0.1, -D / 2 - 0.25]], "#3B82F6");
    return {};
  },
};

B["gear-train"] = {
  about: "A row of meshing gears (groups `gear-0`.. facing +z, each with disc, rim, teeth, hub and spokes) on a base plate with axle pins: tween their `rot` z in opposite senses with beats to run it.",
  params: {
    gears: int(3, 2, 5, "Gears in the row"),
    teeth: int(12, 8, 16, "Teeth on the first gear"),
    radius: num(0.8, 0.4, 1.2, "Radius of the first gear"),
    thickness: num(0.22, 0.1, 0.4, "Gear thickness"),
    ratio: num(0.75, 0.5, 1.3, "Radius of each next gear relative to the previous one"),
    color: color("Main gear color"),
    color2: color("Alternate gear color"),
    plate: bool(true, "Base plate and axle pins"),
  },
  build(p, k) {
    const c1 = p.color ?? "#F2A81D";
    const c2 = p.color2 ?? "#3B82F6";
    const td = 0.16 * p.radius + 0.05;
    let x = 0;
    const gears = [];
    for (let g = 0; g < p.gears; g++) {
      const r = p.radius * p.ratio ** g;
      if (g > 0) x += gears[g - 1].r + r + td * 0.15;
      gears.push({ r, x, teeth: Math.min(16, Math.max(6, Math.round(p.teeth * p.ratio ** g))) });
    }
    const shift = -(gears[gears.length - 1].x + gears[gears.length - 1].r - (gears[0].x - gears[0].r)) / 2 + gears[0].r;
    const T = p.thickness;
    const base = (gears[0].r + 0.2) * 2;
    if (p.plate) k.box("plate", [gears[gears.length - 1].x + gears[gears.length - 1].r + gears[0].r + 0.5, 0.1, 1.6 * p.radius + 0.3], [shift + (gears[gears.length - 1].x) / 2, 0.05, 0], "#4B5563");
    gears.forEach((g, i) => {
      const col = i % 2 ? c2 : c1;
      const root = k.grp(`gear-${i}`, [shift + g.x, base * 0.5 + 0.1, 0.0]);
      k.cyl("disc", [g.r, g.r, T], [0, 0, 0], col, { parent: root, rot: [90, 0, 0], facets: Math.min(24, Math.max(12, g.teeth * 2)) });
      k.cyl("rim", [g.r * 0.82, g.r * 0.82, T * 1.15], [0, 0, 0], shade(col, -0.18), { parent: root, rot: [90, 0, 0], facets: Math.min(24, Math.max(12, g.teeth * 2)) });
      for (let t = 0; t < g.teeth; t++) {
        const a = (t / g.teeth) * 360 + (i % 2 ? 180 / g.teeth : 0);
        const rr = g.r + td * 0.3;
        k.box("tooth", [td, ((2 * Math.PI * g.r) / g.teeth) * 0.52, T], [Math.cos(rad(a)) * rr, Math.sin(rad(a)) * rr, 0], col, { parent: root, rot: [0, 0, a] });
      }
      k.cyl("hub", [g.r * 0.22, g.r * 0.22, T * 1.5], [0, 0, 0], "#C8CDD4", { parent: root, rot: [90, 0, 0], facets: 8, material: "metal" });
      for (let s = 0; s < 4; s++) k.box("spoke", [g.r * 1.2, g.r * 0.12, T * 1.2], [0, 0, 0], shade(col, -0.25), { parent: root, rot: [0, 0, s * 45] });
      if (p.plate) k.cyl("axle", [0.05, 0.05, T + 0.5], [shift + g.x, base * 0.5 + 0.1, 0], "#9AA3AD", { rot: [90, 0, 0], facets: 6 });
    });
    return {};
  },
};

B.bridge = {
  about: "Bridge along x: suspension (towers, parabolic cables, hangers), arch (segmented arch ring and posts) or beam (truss) over two piers, with deck, road markings and railings.",
  params: {
    kind: opt("suspension", ["suspension", "arch", "beam"], "Bridge type"),
    span: num(8, 3, 28, "Length along x (actor mode: <= 9.6)"),
    width: num(1.2, 0.6, 2.4, "Deck width (z)"),
    height: num(2.2, 1, 5, "Tower / arch height above the deck"),
    deck: color("Deck color"),
    structure: color("Tower, cable and arch color"),
    railings: bool(true, "Railings along the deck"),
  },
  build(p, k) {
    const deckC = p.deck ?? "#6B7280";
    const st = p.structure ?? (p.kind === "suspension" ? "#D64545" : "#B7BDC6");
    const L = p.span;
    const W = p.width;
    const dy = 0.9;
    k.box("deck", [L, 0.16, W], [0, dy, 0], deckC);
    k.box("road-line", [L * 0.96, 0.012, 0.04], [0, dy + 0.088, 0], "#F2C14E");
    for (const s of [-1, 1]) k.box("curb", [L, 0.06, 0.1], [0, dy + 0.1, s * (W / 2 - 0.05)], shade(deckC, 0.2));
    for (const x of [-L * 0.42, L * 0.42]) {
      k.box("pier", [0.34, dy, W * 0.7], [x, dy / 2, 0], "#B9BDC2");
      k.box("pier-cap", [0.46, 0.1, W * 0.85], [x, dy - 0.04, 0], shade("#B9BDC2", -0.1));
    }
    const posts = Math.min(18, Math.max(5, Math.round(L / 0.7)));
    if (p.railings) for (const s of [-1, 1]) {
      k.box("rail-top", [L, 0.04, 0.04], [0, dy + 0.4, s * (W / 2 - 0.04)], "#E8E8E0");
      for (let i = 0; i < posts; i++) k.box("rail-post", [0.035, 0.3, 0.035], [-L / 2 + (i / (posts - 1)) * L, dy + 0.25, s * (W / 2 - 0.04)], "#E8E8E0");
    }
    if (p.kind === "suspension") {
      const tx = L * 0.3;
      const th = p.height + dy;
      for (const x of [-tx, tx]) for (const s of [-1, 1]) k.box("tower-leg", [0.14, th, 0.14], [x, th / 2, s * (W / 2 + 0.1)], st);
      for (const x of [-tx, tx]) for (const f of [0.55, 0.95]) k.box("tower-beam", [0.12, 0.1, W + 0.3], [x, th * f, 0], shade(st, -0.1));
      const segs = 14;
      for (const s of [-1, 1]) {
        for (let i = 0; i < segs; i++) {
          const u0 = i / segs;
          const u1 = (i + 1) / segs;
          const f = (u) => {
            const x = -L / 2 + u * L;
            const q = (x / tx) ** 2;
            const y = Math.abs(x) <= tx ? dy + 0.35 + (th * 0.98 - dy - 0.35) * q : th * 0.98 - (Math.abs(x) - tx) * (th * 0.98 - dy - 0.2) / (L / 2 - tx);
            return [x, y];
          };
          const [xa, ya] = f(u0);
          const [xb, yb] = f(u1);
          k.box("cable", [Math.hypot(xb - xa, yb - ya) + 0.03, 0.04, 0.04], [(xa + xb) / 2, (ya + yb) / 2, s * (W / 2 + 0.1)], st, { rot: [0, 0, deg(Math.atan2(yb - ya, xb - xa))] });
        }
      }
      for (let i = 1; i < 12; i++) {
        const x = -tx + (i / 12) * 2 * tx;
        const y = dy + 0.35 + (th * 0.98 - dy - 0.35) * (x / tx) ** 2;
        for (const s of [-1, 1]) k.box("hanger", [0.018, y - dy - 0.08, 0.018], [x, (y + dy + 0.08) / 2, s * (W / 2 + 0.1)], shade(st, 0.2));
      }
    } else if (p.kind === "arch") {
      const segs = 14;
      const R = L / 2;
      for (const s of [-1, 1]) {
        for (let i = 0; i < segs; i++) {
          const a0 = Math.PI * (i / segs);
          const a1 = Math.PI * ((i + 1) / segs);
          const f = (a) => [Math.cos(a) * R * 0.92, dy + Math.sin(a) * p.height];
          const [xa, ya] = f(a0);
          const [xb, yb] = f(a1);
          k.box("arch", [Math.hypot(xb - xa, yb - ya) + 0.03, 0.14, 0.14], [(xa + xb) / 2, (ya + yb) / 2, s * (W / 2 + 0.06)], st, { rot: [0, 0, deg(Math.atan2(yb - ya, xb - xa))] });
        }
        for (let i = 1; i < 10; i++) {
          const a = Math.PI * (i / 10);
          const x = Math.cos(a) * R * 0.92;
          const y = dy + Math.sin(a) * p.height;
          k.box("arch-post", [0.04, y - dy, 0.04], [x, (y + dy) / 2, s * (W / 2 + 0.06)], shade(st, -0.1));
        }
      }
    } else {
      const bays = Math.min(12, Math.max(4, Math.round(L / 0.8)));
      const tH = Math.min(p.height, 1.4);
      for (const s of [-1, 1]) {
        k.box("truss-top", [L, 0.07, 0.07], [0, dy + tH, s * (W / 2 + 0.05)], st);
        for (let i = 0; i <= bays; i++) k.box("truss-post", [0.05, tH, 0.05], [-L / 2 + (i / bays) * L, dy + tH / 2, s * (W / 2 + 0.05)], st);
        for (let i = 0; i < bays; i++) {
          const w = L / bays;
          const up = i % 2 === 0;
          k.box("truss-diag", [Math.hypot(w, tH), 0.045, 0.045], [-L / 2 + (i + 0.5) * w, dy + tH / 2, s * (W / 2 + 0.05)], shade(st, -0.1), { rot: [0, 0, up ? deg(Math.atan2(tH, w)) : -deg(Math.atan2(tH, w))] });
        }
      }
    }
    return {};
  },
};

B.building = {
  about: "City building: tiered tower with a window grid (some lit), pilasters, an entrance with awning and steps, rooftop tank, AC units and an antenna with a glowing tip. Styles: glass, brick, stepped.",
  params: {
    floors: int(8, 3, 16, "Storeys"),
    width: num(2, 1.2, 3.4, "Width (x)"),
    depth: num(1.6, 1, 3, "Depth (z)"),
    style: opt("glass", ["glass", "brick", "stepped"], "Facade style"),
    lit: num(0.35, 0, 1, "Fraction of lit windows"),
    body: color("Wall color"),
    windowColor: color("Window color"),
  },
  build(p, k) {
    const { floors: F, width: W, depth: D } = p;
    const fh = Math.min(0.42, 3.4 / F + 0.12);
    const body = p.body ?? (p.style === "brick" ? "#B5654A" : p.style === "glass" ? "#7F93AB" : k.pick(["#C9C3B8", "#A9B4C2", "#D6C7A8"], "b"));
    const win = p.windowColor ?? (p.style === "glass" ? "#CFE9F7" : "#2B3550");
    const cols = Math.max(2, Math.min(5, Math.round(W / 0.45)));
    const H = F * fh + 0.2;
    k.box("podium", [W + 0.3, 0.2, D + 0.3], [0, 0.1, 0], "#8A93A0");
    const tiers = p.style === "stepped" ? 3 : 1;
    let y = 0.2;
    let w = W;
    let d = D;
    for (let t = 0; t < tiers; t++) {
      const tf = tiers === 1 ? F : Math.max(1, Math.round(F / tiers));
      const h = tf * fh;
      k.box("tier", [w, h, d], [0, y + h / 2, 0], t % 2 ? shade(body, -0.06) : body);
      k.box("cornice", [w + 0.08, 0.06, d + 0.08], [0, y + h, 0], shade(body, 0.2));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box("pilaster", [0.08, h, 0.08], [(sx * w) / 2, y + h / 2, (sz * d) / 2], shade(body, 0.15));
      for (let f = 0; f < tf; f++) {
        if (t === 0 && f === 0) continue;
        const yy = y + fh * (f + 0.55);
        for (let c = 0; c < cols; c++) {
          const x = (-w / 2 + ((c + 0.5) * w) / cols) * 0.9;
          const on = k.rnd("on", t, f, c) < p.lit;
          k.box("window", [(w / cols) * 0.55, fh * 0.55, 0.04], [x, yy, d / 2 + 0.01], on ? "#FFE9A8" : win, { material: on ? "emissive" : "auto", emissive: on ? 0.8 : 0 });
        }
        if (f % 2 === 0) k.box("window-side", [0.04, fh * 0.55, d * 0.5], [w / 2 + 0.01, yy, 0], k.rnd("os", t, f) < p.lit ? "#FFE9A8" : win, { material: "auto" });
      }
      y += h;
      w *= 0.72;
      d *= 0.72;
    }
    k.box("door", [0.42, 0.34, 0.05], [0, 0.37, D / 2 + 0.02], "#2B3550");
    k.box("awning", [0.8, 0.05, 0.4], [0, 0.6, D / 2 + 0.2], "#D64545", { rot: [-10, 0, 0] });
    k.box("steps", [0.7, 0.06, 0.3], [0, 0.23, D / 2 + 0.18], "#B9BDC2");
    const top = y;
    k.cyl("tank", [0.2, 0.2, 0.3], [-w * 0.2, top + 0.35, w * 0.0], "#7A4F2C", { facets: 8 });
    k.cone("tank-lid", [0.23, 0.12], [-w * 0.2, top + 0.56, 0], "#5B6270", { facets: 8 });
    for (const lx of [-0.12, 0.12]) k.box("tank-leg", [0.03, 0.2, 0.03], [-w * 0.2 + lx, top + 0.1, 0], "#5B6270");
    k.box("ac", [0.3, 0.16, 0.22], [w * 0.2, top + 0.08, d * 0.15], "#C8CDD4");
    k.cyl("antenna", [0.012, 0.012, 0.6], [w * 0.05, top + 0.3, -d * 0.2], "#9AA3AD", { facets: 5 });
    k.sph("beacon", [0.04], [w * 0.05, top + 0.62, -d * 0.2], "#E5484D", { facets: 5, material: "emissive", emissive: 2, role: "glow" });
    void H;
    return {};
  },
};

B.road = {
  about: "Straight road along x: asphalt with edge lines and lane dashes, curbs and sidewalks with cracks, an optional zebra crossing, street lamps with glowing heads and a manhole.",
  params: {
    length: num(9, 2, 28, "Length along x (actor mode: <= 9.6)"),
    width: num(2.2, 1, 4, "Roadway width (z)"),
    sidewalk: bool(true, "Sidewalks and curbs"),
    lamps: int(3, 0, 6, "Street lamps per side"),
    crosswalk: bool(true, "Zebra crossing in the middle"),
    asphalt: color("Asphalt color"),
  },
  build(p, k) {
    const asph = p.asphalt ?? "#3F4550";
    const L = p.length;
    const W = p.width;
    k.box("asphalt", [L, 0.1, W], [0, 0.05, 0], asph);
    for (const s of [-1, 1]) k.box("edge-line", [L * 0.98, 0.012, 0.04], [0, 0.106, s * (W / 2 - 0.1)], "#F4F4F0");
    const dashes = Math.max(3, Math.floor(L / 0.9));
    for (let i = 0; i < dashes; i++) {
      const x = -L / 2 + (i + 0.5) * (L / dashes);
      if (p.crosswalk && Math.abs(x) < 0.7) continue;
      k.box("dash", [L / dashes * 0.5, 0.012, 0.06], [x, 0.106, 0], "#F2C14E");
    }
    if (p.crosswalk) for (let i = 0; i < 7; i++) k.box("zebra", [0.12, 0.012, W * 0.78], [-0.45 + i * 0.15, 0.108, 0], "#F4F4F0");
    k.cyl("manhole", [0.14, 0.14, 0.015], [L * 0.28, 0.108, W * 0.15], "#5B6270", { facets: 10 });
    if (p.sidewalk) {
      for (const s of [-1, 1]) {
        k.box("curb", [L, 0.14, 0.12], [0, 0.07, s * (W / 2 + 0.06)], "#B9BDC2");
        k.box("sidewalk", [L, 0.12, 0.8], [0, 0.06, s * (W / 2 + 0.52)], "#CFCFC8");
        for (let i = 1; i < Math.floor(L / 1.2); i++) k.box("crack", [0.012, 0.125, 0.8], [-L / 2 + i * 1.2, 0.06, s * (W / 2 + 0.52)], "#A9A9A2");
      }
    }
    for (let i = 0; i < p.lamps; i++) {
      const x = -L / 2 + 0.5 + ((i + 0.5) / p.lamps) * (L - 1);
      for (const s of [-1, 1]) {
        const z = s * (W / 2 + 0.75);
        k.cyl("lamp-pole", [0.025, 0.035, 1.5], [x, 0.85, z], "#4B5563", { facets: 6 });
        k.box("lamp-arm", [0.04, 0.04, 0.35], [x, 1.6, z - s * 0.16], "#4B5563");
        k.box("lamp-head", [0.14, 0.05, 0.2], [x, 1.58, z - s * 0.32], "#FFE9A8", { material: "emissive", emissive: 1.4, role: "glow" });
      }
    }
    return {};
  },
};

B["car-lowpoly"] = {
  about: "Low-poly car facing +x: extruded side-profile body, cabin and glass, four wheels with hubs and arches, bumpers, headlights and tail lights, grille, mirrors, door lines and plate. kinds: sedan, suv, truck, taxi (roof sign).",
  params: {
    kind: opt("sedan", ["sedan", "suv", "truck", "taxi"], "Body type"),
    length: num(3, 1.8, 4.2, "Length"),
    width: num(1.3, 0.8, 1.9, "Width"),
    body: color("Paint color"),
    glass: color("Window color"),
  },
  build(p, k) {
    const L = p.length;
    const W = p.width;
    const body = p.body ?? (p.kind === "taxi" ? "#F2C14E" : k.pick(["#E5484D", "#3B82F6", "#2FB98F", "#F2A81D", "#8B5CF6", "#F4F4F0"], "paint"));
    const glass = p.glass ?? "#9ED2E8";
    const u = L / 3;
    const wr = 0.27 * u ** 0.5;
    const hBody = 0.5 * u;
    const lower = [[-1.5 * u, wr * 0.6], [1.5 * u, wr * 0.6], [1.5 * u, hBody * 0.85], [1.15 * u, hBody], [-1.35 * u, hBody], [-1.5 * u, hBody * 0.85]];
    k.ext("body", W, lower, [0, 0, 0], body, { radius: 0.03 });
    const tall = p.kind === "suv" ? 0.5 : p.kind === "truck" ? 0.45 : 0.4;
    const cabin = p.kind === "truck" ? [[-0.1 * u, hBody], [0.95 * u, hBody], [0.7 * u, hBody + tall * u], [-0.0 * u, hBody + tall * u]] : p.kind === "suv" ? [[-1.35 * u, hBody], [0.85 * u, hBody], [0.55 * u, hBody + tall * u], [-1.2 * u, hBody + tall * u]] : [[-1.0 * u, hBody], [0.8 * u, hBody], [0.4 * u, hBody + tall * u], [-0.6 * u, hBody + tall * u]];
    k.ext("cabin", W * 0.9, cabin, [0, 0, 0], shade(body, 0.04), { radius: 0.02 });
    // glass: a slightly wider, inset copy of the cabin outline
    const cx = cabin.reduce((s, q) => s + q[0], 0) / cabin.length;
    const cy = cabin.reduce((s, q) => s + q[1], 0) / cabin.length;
    const inset = cabin.map(([x, y]) => [cx + (x - cx) * 0.86, cy + (y - cy) * 0.7 + 0.02]);
    k.ext("windows", W * 0.93, inset, [0, 0, 0], glass, { material: "glass", opacity: 0.95 });
    const pillarX = cx + 0.05;
    k.box("pillar", [0.07, tall * u * 0.75, W * 0.95], [pillarX, hBody + tall * u * 0.5, 0], body);
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const wx = x * 0.95 * u;
      const wz = z * (W / 2 - 0.02);
      k.cyl("arch", [wr * 1.18, wr * 1.18, 0.05], [wx, wr, wz * 1.0], "#1B2230", { rot: [90, 0, 0], facets: 10 });
      k.cyl("wheel", [wr, wr, 0.2], [wx, wr, wz + z * 0.06], "#23262E", { rot: [90, 0, 0], facets: 12 });
      k.cyl("hub", [wr * 0.55, wr * 0.55, 0.22], [wx, wr, wz + z * 0.06], "#C8CDD4", { rot: [90, 0, 0], facets: 6, material: "metal" });
    }
    for (const s of [-1, 1]) {
      k.box("headlight", [0.05, 0.1, 0.25], [1.52 * u, hBody * 0.72, s * W * 0.32], "#FFF3B0", { material: "emissive", emissive: 1.2, role: "glow" });
      k.box("taillight", [0.05, 0.09, 0.22], [-1.52 * u, hBody * 0.75, s * W * 0.34], "#E5484D", { material: "emissive", emissive: 0.9 });
      k.box("mirror", [0.1, 0.07, 0.08], [0.55 * u, hBody + 0.12, s * (W / 2 + 0.07)], body);
      k.box("door-line", [0.02, hBody * 0.7, 0.01], [-0.1 * u, hBody * 0.55, s * (W / 2 + 0.005)], shade(body, -0.35));
      k.box("door-handle", [0.1, 0.025, 0.02], [0.2 * u, hBody * 0.82, s * (W / 2 + 0.01)], shade(body, -0.3));
    }
    k.box("bumper-front", [0.1, 0.12, W + 0.04], [1.55 * u, wr * 0.8, 0], "#2B2F38");
    k.box("bumper-rear", [0.1, 0.12, W + 0.04], [-1.55 * u, wr * 0.8, 0], "#2B2F38");
    k.box("grille", [0.03, 0.12, W * 0.4], [1.53 * u, hBody * 0.5, 0], "#1B2230");
    k.box("plate", [0.02, 0.09, 0.3], [-1.52 * u, hBody * 0.45, 0], "#F4F4F0");
    for (const s of [-1, 1]) {
      k.box("fender", [0.5 * u, 0.04, 0.05], [1.0 * u, hBody * 0.92, s * (W / 2 + 0.02)], shade(body, 0.12));
      k.box("sill", [1.4 * u, 0.04, 0.05], [0, wr * 0.75, s * (W / 2 + 0.02)], "#2B2F38");
      k.sph("fog-light", [0.04], [1.53 * u, hBody * 0.4, s * W * 0.38], "#FFE9A8", { facets: 5, material: "emissive", emissive: 0.8 });
    }
    k.box("hood-line", [0.5 * u, 0.012, W * 0.7], [1.0 * u, hBody + 0.004, 0], shade(body, -0.25));
    k.box("antenna", [0.012, 0.28, 0.012], [-0.9 * u, hBody + tall * u + 0.12, W * 0.3], "#2B2F38");
    k.cyl("exhaust", [0.035, 0.035, 0.12], [-1.55 * u, wr * 0.55, W * 0.3], "#9AA3AD", { rot: [0, 0, 90], facets: 6 });
    k.box("wiper", [0.01, 0.01, 0.3], [0.52 * u, hBody + 0.03, 0], "#1B2230", { rot: [0, 0, -12] });
    if (p.kind === "taxi") k.box("taxi-sign", [0.25, 0.1, 0.4], [0, hBody + tall * u + 0.05, 0], "#FFF3B0", { material: "emissive", emissive: 0.8 });
    if (p.kind === "suv") for (const s of [-1, 1]) k.box("roof-rail", [1.4 * u, 0.03, 0.04], [-0.35 * u, hBody + tall * u + 0.03, s * W * 0.38], "#2B2F38");
    if (p.kind === "truck") k.box("bed", [1.35 * u, 0.3, W * 0.96], [-0.8 * u, hBody + 0.05, 0], shade(body, -0.15), { radius: 0.02 });
    return {};
  },
};

// ---------------- tech ----------------

B.laptop = {
  about: "Open laptop: base with a 3x8 keyboard of keys, trackpad and ports; the lid is a group `lid` (hinged at the back, tween its rot x to open or close) with bezel, glowing screen, webcam and logo.",
  params: {
    open: num(105, 0, 135, "Lid angle in degrees (0 closed)"),
    width: num(2.2, 1.2, 3.5, "Width"),
    body: color("Body color"),
    screen: color("Screen glow color"),
  },
  build(p, k) {
    const body = p.body ?? "#B9BFC9";
    const scr = p.screen ?? "#4FA8FF";
    const W = p.width;
    const D = W * 0.68;
    k.box("base", [W, 0.08, D], [0, 0.04, 0], body, { radius: 0.03 });
    k.box("deck", [W * 0.96, 0.012, D * 0.94], [0, 0.086, 0], shade(body, -0.12));
    const cols = 8;
    for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) k.box("key", [(W * 0.86) / cols - 0.02, 0.025, 0.13], [-W * 0.43 + ((c + 0.5) * W * 0.86) / cols, 0.1, -D * 0.28 + r * 0.16], shade(body, 0.25 + (r + c) % 2 * 0.05), { radius: 0.01 });
    k.box("spacebar", [W * 0.4, 0.025, 0.13], [0, 0.1, D * 0.2], shade(body, 0.28), { radius: 0.01 });
    k.box("trackpad", [W * 0.3, 0.01, D * 0.2], [0, 0.092, D * 0.38], shade(body, 0.05));
    for (const s of [-1, 1]) k.box("port", [0.02, 0.025, 0.1], [s * W / 2, 0.04, -D * 0.1], "#2B2F38");
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.cyl("foot", [0.04, 0.04, 0.02], [x * (W / 2 - 0.12), 0.0, z * (D / 2 - 0.1)], "#2B2F38", { facets: 6 });
    const lid = k.grp("lid", [0, 0.08, -D / 2], { rot: [-p.open, 0, 0] });
    const lh = D * 0.95;
    k.box("lid-shell", [W, lh, 0.05], [0, lh / 2, 0], body, { parent: lid, radius: 0.03 });
    k.box("bezel", [W * 0.96, lh * 0.94, 0.012], [0, lh / 2, 0.028], "#14161C", { parent: lid });
    k.box("screen", [W * 0.9, lh * 0.84, 0.012], [0, lh / 2, 0.036], scr, { parent: lid, role: "screen", material: "emissive", emissive: 0.7 });
    for (let i = 0; i < 3; i++) k.box("screen-line", [W * (0.7 - i * 0.2), 0.04, 0.012], [-W * 0.1 + i * -W * 0.0, lh * (0.62 - i * 0.14), 0.045], "#FFFFFF", { parent: lid, opacity: 0.85 });
    k.sph("webcam", [0.018], [0, lh * 0.97, 0.034], "#3A4150", { parent: lid, facets: 5 });
    k.cyl("logo", [0.07, 0.07, 0.01], [0, lh * 0.5, -0.03], "#E8E8EE", { parent: lid, rot: [90, 0, 0], facets: 8 });
    k.cyl("hinge", [0.03, 0.03, W * 0.8], [0, 0.08, -D / 2], "#6B7280", { rot: [0, 0, 90], facets: 6 });
    return {};
  },
};

B.phone = {
  about: "Smartphone: rounded body, glowing screen with a 4x4 grid of colored app icons, notch, triple camera, side buttons and a home bar. Upright, faces +z.",
  params: {
    height: num(1.6, 0.8, 2.6, "Height"),
    body: color("Body color"),
    wallpaper: color("Screen background"),
  },
  build(p, k) {
    const body = p.body ?? "#2B3550";
    const H = p.height;
    const W = H * 0.5;
    k.box("body", [W, H, 0.09], [0, H / 2, 0], body, { radius: 0.06 });
    k.box("screen", [W * 0.92, H * 0.94, 0.012], [0, H / 2, 0.05], p.wallpaper ?? "#1F4E9A", { role: "screen", material: "emissive", emissive: 0.5 });
    k.box("notch", [W * 0.3, 0.05, 0.016], [0, H * 0.965, 0.058], "#0E1016", { radius: 0.02 });
    const cols = ["#E5484D", "#F2A81D", "#2FB98F", "#3B82F6", "#8B5CF6", "#FFFFFF", "#FF7AA2", "#5CC8F2"];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) k.box("app", [W * 0.17, W * 0.17, 0.014], [-W * 0.33 + c * W * 0.22, H * 0.78 - r * W * 0.26, 0.062], cols[(r * 4 + c + k.seed) % cols.length], { radius: 0.025 });
    for (let c = 0; c < 4; c++) k.box("dock-app", [W * 0.17, W * 0.17, 0.014], [-W * 0.33 + c * W * 0.22, H * 0.12, 0.062], cols[(c * 3 + 1) % cols.length], { radius: 0.025 });
    k.box("home-bar", [W * 0.3, 0.018, 0.016], [0, H * 0.03, 0.062], "#E8E8EE");
    for (let i = 0; i < 3; i++) k.cyl("lens", [0.04, 0.04, 0.03], [-W * 0.22 + (i % 2) * 0.12, H * 0.9 - (i > 1 ? 0.12 : 0), -0.06], "#14161C", { rot: [90, 0, 0], facets: 8 });
    k.box("button", [0.02, H * 0.1, 0.03], [W / 2 + 0.005, H * 0.7, 0], shade(body, 0.2));
    k.box("button", [0.02, H * 0.06, 0.03], [-W / 2 - 0.005, H * 0.75, 0], shade(body, 0.2));
    k.box("button", [0.02, H * 0.06, 0.03], [-W / 2 - 0.005, H * 0.65, 0], shade(body, 0.2));
    return {};
  },
};

B.router = {
  about: "Wi-Fi router: flat body with vents, antennas (`antenna-0`..), a row of glowing status LEDs (`led-0`..), ports and feet; wave rings (`wave-0`..) above it hide or show with beats.",
  params: {
    antennas: int(3, 2, 4, "Antennas"),
    body: color("Body color"),
    led: color("LED color"),
    waves: int(3, 0, 4, "Wave rings above the router"),
  },
  build(p, k) {
    const body = p.body ?? "#E8E8EE";
    const led = p.led ?? "#3FD6A0";
    k.box("body", [1.4, 0.18, 0.8], [0, 0.12, 0], body, { radius: 0.05 });
    k.box("top", [1.3, 0.02, 0.7], [0, 0.22, 0], shade(body, -0.08));
    for (let i = 0; i < 6; i++) k.box("vent", [0.7, 0.014, 0.025], [-0.18, 0.234, -0.2 + i * 0.07], "#9AA3AD");
    for (let i = 0; i < 5; i++) k.sph("led", [0.025], [0.1 + i * 0.1, 0.13, 0.41], i === 3 ? "#F2A81D" : led, { facets: 5, material: "emissive", emissive: 1.4, role: "glow" });
    for (let i = 0; i < 4; i++) k.box("port", [0.1, 0.07, 0.04], [-0.5 + i * 0.14, 0.1, -0.41], "#2B2F38");
    for (let i = 0; i < p.antennas; i++) {
      const x = -0.5 + (i * 1.0) / Math.max(1, p.antennas - 1);
      k.cyl("antenna", [0.025, 0.03, 0.9], [x, 0.7, -0.3], "#2B2F38", { facets: 6, rot: [0, 0, (x) * -12] });
      k.sph("antenna-tip", [0.04], [x + x * -0.0, 1.16, -0.3], "#2B2F38", { facets: 5 });
    }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.cyl("foot", [0.04, 0.04, 0.03], [x * 0.6, 0.015, z * 0.32], "#3A4150", { facets: 6 });
    for (let i = 0; i < p.waves; i++) k.tor("wave", [0.35 + i * 0.3, 0.018, 180], [0, 1.0 + i * 0.05, 0.1], midMix(led, "#FFFFFF", 0.2), { rot: [0, 0, 0], material: "emissive", emissive: 1, role: "glow", opacity: 0.8 - i * 0.15 });
    return {};
  },
};

B["data-cable"] = {
  about: "A data cable along waypoints (smooth tube) with a plug at each end and glowing data packets (`dot-0`..) spread along it; move the dots with beats (`pos`) to show a request travelling.",
  params: {
    points: list([[-2.4, 0.08, 0], [-1.2, 0.08, 0.7], [1.2, 0.08, -0.7], [2.4, 0.08, 0]], "Waypoints [[x, y, z], ...]"),
    radius: num(0.05, 0.02, 0.15, "Cable radius"),
    cable: color("Cable color"),
    dots: int(4, 0, 10, "Data packets"),
    packet: color("Packet color"),
  },
  build(p, k) {
    const cableC = p.cable ?? "#3B82F6";
    const pts = p.points.filter((q) => Array.isArray(q) && q.length === 3);
    k.tube("cable", [p.radius], pts, cableC);
    for (let i = 0; i < pts.length - 1; i++) k.sph("bend", [p.radius * 1.1], pts[i], shade(cableC, -0.15), { facets: 6 });
    for (const [q, d] of [[pts[0], 1], [pts[pts.length - 1], -1]]) {
      k.box("plug", [0.22, 0.12, 0.16], [q[0] - d * 0.06, q[1], q[2]], "#2B2F38", { radius: 0.02 });
      k.box("plug-tip", [0.1, 0.08, 0.1], [q[0] + d * 0.1, q[1], q[2]], "#C8CDD4", { material: "metal" });
    }
    let total = 0;
    const seg = pts.slice(1).map((q, i) => {
      const a = pts[i];
      const len = Math.hypot(q[0] - a[0], q[1] - a[1], q[2] - a[2]);
      total += len;
      return { a, q, len, start: total - len };
    });
    for (let i = 0; i < p.dots; i++) {
      const dist = ((i + 0.5) / p.dots) * total;
      const s = seg.find((x) => dist <= x.start + x.len) ?? seg[seg.length - 1];
      const u = (dist - s.start) / Math.max(1e-6, s.len);
      k.sph("dot", [p.radius * 1.5], s.a.map((v, a) => v + (s.q[a] - v) * u + (a === 1 ? p.radius * 1.2 : 0)), p.packet ?? "#FFE066", { facets: 6, material: "emissive", emissive: 1.6, role: "glow" });
    }
    return {};
  },
};

B.chip = {
  about: "Microchip on a board: package with a glowing die, 8 pins per side, circuit traces and solder pads; the die is `die`.",
  params: {
    size: num(1.4, 0.6, 2.6, "Package width"),
    pins: int(8, 4, 10, "Pins per side"),
    body: color("Package color"),
    glow: color("Die glow color"),
  },
  build(p, k) {
    const S = p.size;
    const body = p.body ?? "#23262E";
    const glow = p.glow ?? "#5CF2FF";
    k.box("board", [S * 1.8, 0.06, S * 1.8], [0, 0.03, 0], "#1F6F4A", { radius: 0.02 });
    k.box("package", [S, 0.16, S], [0, 0.14, 0], body, { radius: 0.03 });
    k.box("die", [S * 0.5, 0.02, S * 0.5], [0, 0.23, 0], glow, { material: "emissive", emissive: 1.1, role: "glow" });
    k.box("die-core", [S * 0.26, 0.022, S * 0.26], [0, 0.24, 0], "#FFFFFF", { material: "emissive", emissive: 1.4 });
    k.sph("pin1", [0.03], [-S * 0.4, 0.23, -S * 0.4], "#E8E8EE", { facets: 5 });
    for (let s = 0; s < 4; s++) for (let i = 0; i < p.pins; i++) {
      const u = -S * 0.42 + (i / (p.pins - 1)) * S * 0.84;
      const horiz = s < 2;
      const sg = s % 2 ? 1 : -1;
      k.box("pin", horiz ? [0.05, 0.03, 0.14] : [0.14, 0.03, 0.05], horiz ? [u, 0.1, sg * (S / 2 + 0.06)] : [sg * (S / 2 + 0.06), 0.1, u], "#C8CDD4");
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 360;
      k.box("trace", [S * 0.5, 0.008, 0.02], [Math.cos(rad(a)) * S * 1.0, 0.065, Math.sin(rad(a)) * S * 1.0], "#E8B84A", { rot: [0, -a + 90, 0] });
    }
    return {};
  },
};

B["database-cylinder"] = {
  about: "Classic database cylinder: stacked discs with colored bands, LEDs and a label strip; `disk-0`.. can be lit or lifted with beats.",
  params: {
    disks: int(3, 1, 6, "Stacked discs"),
    radius: num(0.8, 0.4, 1.4, "Radius"),
    body: color("Disc color"),
    band: color("Band color"),
  },
  build(p, k) {
    const body = p.body ?? "#B9C2D0";
    const band = p.band ?? "#3B82F6";
    const h = 0.42;
    for (let i = 0; i < p.disks; i++) {
      const y = i * (h + 0.06) + h / 2;
      k.cyl("disk", [p.radius, p.radius, h], [0, y, 0], i % 2 ? shade(body, -0.06) : body, { facets: 16 });
      k.cyl("band", [p.radius * 1.015, p.radius * 1.015, 0.05], [0, y + h * 0.28, 0], band, { facets: 16 });
      k.sph("led", [0.04], [p.radius * 0.7, y - 0.02, p.radius * 0.72], i % 2 ? "#F2A81D" : "#3FD6A0", { facets: 5, material: "emissive", emissive: 1.4, role: "glow" });
      k.box("label", [p.radius * 0.7, 0.08, 0.02], [-p.radius * 0.2, y - 0.06, p.radius * 0.97], "#F4F4F0", { rot: [0, -12, 0] });
    }
    const top = p.disks * (h + 0.06);
    k.cyl("cap", [p.radius * 0.98, p.radius * 0.98, 0.03], [0, top - 0.03, 0], shade(body, 0.18), { facets: 16 });
    return {};
  },
};

B["browser-window"] = {
  about: "Floating browser window card: title bar with three dots, address bar, a hero block, text lines and buttons, and a cursor arrow; faces +z.",
  params: {
    width: num(2.4, 1.2, 4, "Width"),
    frame: color("Window frame color"),
    accent: color("Hero and button color"),
  },
  build(p, k) {
    const W = p.width;
    const H = W * 0.7;
    const acc = p.accent ?? "#3B82F6";
    k.box("window", [W, H, 0.08], [0, H / 2, 0], p.frame ?? "#F4F4F0", { radius: 0.05 });
    k.box("title-bar", [W, 0.22, 0.02], [0, H - 0.11, 0.05], "#D7DBE3");
    ["#E5484D", "#F2A81D", "#2FB98F"].forEach((c, i) => k.cyl("dot", [0.035, 0.035, 0.02], [-W / 2 + 0.18 + i * 0.12, H - 0.11, 0.065], c, { rot: [90, 0, 0], facets: 8 }));
    k.box("address", [W * 0.62, 0.1, 0.02], [0.2, H - 0.11, 0.065], "#FFFFFF", { radius: 0.02 });
    k.box("hero", [W * 0.9, H * 0.34, 0.02], [0, H * 0.58, 0.055], acc);
    for (let i = 0; i < 4; i++) k.box("line", [W * (0.8 - (i % 2) * 0.25), 0.05, 0.02], [-W * 0.1 + (i % 2) * -0.0, H * 0.34 - i * 0.1, 0.055], "#AEB6C4");
    k.box("button", [W * 0.24, 0.12, 0.024], [W * 0.3, H * 0.1, 0.06], shade(acc, -0.15), { radius: 0.03 });
    k.ext("cursor", 0.02, [[0, 0], [0, 0.34], [0.09, 0.26], [0.17, 0.4], [0.24, 0.36], [0.16, 0.24], [0.28, 0.22]], [W * 0.18, H * 0.2, 0.14], "#14161C");
    return {};
  },
};

// ---------------- science and nature ----------------

B.planet = {
  about: "Faceted planet: a 10-sided globe with continent or band patches, polar caps or a ring, and a moon on an orbit group `moon-orbit` (turn it with a beat). kind: earth, mars, gas.",
  params: {
    kind: opt("earth", ["earth", "mars", "gas"], "Planet type"),
    radius: num(1, 0.4, 2, "Radius"),
    ring: bool(false, "Ring around the planet (default on for gas giants)"),
    moon: bool(true, "Moon on an orbit"),
    ocean: color("Ocean / base color"),
  },
  build(p, k) {
    const R = p.radius;
    const base = p.ocean ?? (p.kind === "earth" ? "#2F7DE1" : p.kind === "mars" ? "#C4683A" : "#E8B86D");
    const land = p.kind === "earth" ? "#4FAE5A" : p.kind === "mars" ? "#8A4B3A" : "#C98A4B";
    const core = k.grp("globe", [0, R + 0.1, 0]);
    k.sph("globe-body", [R], [0, 0, 0], base, { parent: core, facets: 10 });
    const patches = p.kind === "gas" ? 6 : 9;
    for (let i = 0; i < patches; i++) {
      const lat = p.kind === "gas" ? (i / patches - 0.5) * 2.2 : k.vary(-1.1, 1.1, "lat", i);
      const lon = k.rnd("lon", i) * 360;
      const y = Math.sin(lat) * R * 0.98;
      const rr = Math.cos(lat) * R * 0.98;
      if (p.kind === "gas") k.cyl("band", [Math.cos(lat) * R * 1.01, Math.cos(lat) * R * 1.01, R * 0.14], [0, y, 0], i % 2 ? shade(base, -0.18) : land, { parent: core, facets: 10 });
      else k.sph("continent", [R * k.vary(0.24, 0.4, "cs", i), R * 0.1, R * k.vary(0.2, 0.34, "cz", i)], [Math.cos(rad(lon)) * rr, y, Math.sin(rad(lon)) * rr], i % 3 ? land : shade(land, -0.2), { parent: core, facets: 5, rot: [0, -lon, Math.round(lat * 57)] });
    }
    if (p.kind !== "gas") for (const s of [-1, 1]) k.sph("cap", [R * 0.34, R * 0.1, R * 0.34], [0, s * R * 0.97, 0], "#F4F8FF", { parent: core, facets: 6 });
    if (p.kind === "earth") for (let i = 0; i < 5; i++) {
      const lon = k.rnd("cl", i) * 360;
      const lat = k.vary(-0.9, 0.9, "cla", i);
      k.sph("cloud", [R * 0.2, R * 0.05, R * 0.14], [Math.cos(rad(lon)) * Math.cos(lat) * R * 1.05, Math.sin(lat) * R * 1.05, Math.sin(rad(lon)) * Math.cos(lat) * R * 1.05], "#FFFFFF", { parent: core, facets: 5, rot: [0, -lon, Math.round(lat * 57)], opacity: 0.9 });
    }
    if (p.ring || p.kind === "gas") for (let i = 0; i < 3; i++) k.tor("ring", [R * (1.5 + i * 0.16), R * 0.04, 360], [0, R + 0.1, 0], i % 2 ? "#E8D5B0" : "#C9A66B", { rot: [78, 0, 0] });
    if (p.moon) {
      const orb = k.grp("moon-orbit", [0, R + 0.1, 0]);
      k.sph("moon", [R * 0.22], [R * 2.0, 0, 0], "#C8CDD4", { parent: orb, facets: 6 });
      k.sph("crater", [R * 0.06], [R * 2.0, R * 0.1, R * 0.18], "#9AA0A8", { parent: orb, facets: 4 });
    }
    return {};
  },
};

B.atom = {
  about: "Atom model: a nucleus of colored protons and neutrons and N electron orbits (groups `orbit-0`.. tilted rings; each carries a glowing electron `electron-0`..). Turn an orbit group with a beat to move its electron.",
  params: {
    orbits: int(3, 1, 4, "Electron orbits"),
    radius: num(1.2, 0.6, 2, "Outer orbit radius"),
    nucleus: color("Proton color"),
    electron: color("Electron color"),
  },
  build(p, k) {
    const proton = p.nucleus ?? "#E5484D";
    const el = p.electron ?? "#5CC8F2";
    const R = p.radius;
    const y0 = R + 0.1;
    for (let i = 0; i < 9; i++) {
      const a = k.rnd("na", i) * 360;
      const e = k.vary(-1, 1, "ne", i);
      const d = 0.16;
      k.sph(i % 2 ? "neutron" : "proton", [0.12], [Math.cos(rad(a)) * d * Math.cos(e), y0 + Math.sin(e) * d, Math.sin(rad(a)) * d * Math.cos(e)], i % 2 ? "#C8CDD4" : proton, { facets: 6 });
    }
    for (let i = 0; i < p.orbits; i++) {
      const r = R * (0.5 + (0.5 * (i + 1)) / p.orbits);
      const g = k.grp(`orbit-${i}`, [0, y0, 0], { rot: [i * 60 - 30, i * 50, 20 * i] });
      k.tor("orbit-ring", [r, 0.012, 360], [0, 0, 0], "#9AA3AD", { parent: g, rot: [90, 0, 0], opacity: 0.8 });
      k.sph(`electron-${i}`, [0.09], [r, 0, 0], el, { parent: g, facets: 6, material: "emissive", emissive: 1.6, role: "glow" });
      k.sph("electron-halo", [0.14], [r, 0, 0], el, { parent: g, facets: 6, opacity: 0.25 });
    }
    return {};
  },
};

B.cell = {
  about: "Biological cell cutaway: translucent membrane, nucleus with a nucleolus, capsule mitochondria, golgi stack, vacuoles, ribosome dots and an ER ribbon. Parts are ids `nucleus`, `mito-0`..",
  params: {
    radius: num(1.3, 0.6, 2.2, "Cell radius"),
    membrane: color("Membrane color"),
    nucleus: color("Nucleus color"),
    organelles: int(4, 2, 7, "Mitochondria"),
  },
  build(p, k) {
    const R = p.radius;
    const y0 = R + 0.1;
    k.sph("membrane", [R, R * 0.85, R], [0, y0, 0], p.membrane ?? "#BFE8C8", { facets: 10, opacity: 0.45 });
    k.sph("cytoplasm", [R * 0.95, R * 0.8, R * 0.95], [0, y0, 0], "#E3F6D6", { facets: 9, opacity: 0.55 });
    k.sph("nucleus", [R * 0.38], [-R * 0.1, y0 + R * 0.05, 0], p.nucleus ?? "#8B5CF6", { facets: 8 });
    k.sph("nucleolus", [R * 0.14], [-R * 0.18, y0 + R * 0.1, R * 0.2], "#5B3BB0", { facets: 5 });
    for (let i = 0; i < p.organelles; i++) {
      const a = (i / p.organelles) * 360 + 20;
      k.add("capsule", `mito-${i}`, [R * 0.09, R * 0.2], [Math.cos(rad(a)) * R * 0.62, y0 + k.vary(-0.3, 0.3, "my", i) * R, Math.sin(rad(a)) * R * 0.5], "#F2A81D", { rot: [0, 0, a], facets: undefined });
      k.box("mito-crista", [R * 0.16, R * 0.03, R * 0.03], [Math.cos(rad(a)) * R * 0.62, y0 + k.vary(-0.3, 0.3, "my", i), Math.sin(rad(a)) * R * 0.5 + 0.01], "#C97B0E", { rot: [0, 0, a] });
    }
    for (let i = 0; i < 4; i++) k.sph("golgi", [R * 0.3 - i * 0.02, R * 0.045, R * 0.18], [R * 0.4, y0 - R * 0.4 + i * R * 0.1, R * 0.2], "#FF9EC4", { facets: 7 });
    for (let i = 0; i < 3; i++) k.sph("vacuole", [R * 0.12], [-R * 0.5 + i * 0.14, y0 - R * 0.35, -R * 0.2 + i * 0.1], "#9FD8FF", { facets: 6, opacity: 0.8 });
    for (let i = 0; i < 10; i++) {
      const a = k.rnd("ra", i) * 360;
      k.sph("ribosome", [R * 0.03], [Math.cos(rad(a)) * R * 0.7, y0 + k.vary(-0.5, 0.5, "ry", i) * R, Math.sin(rad(a)) * R * 0.6], "#3A4150", { facets: 4 });
    }
    k.tor("er", [R * 0.5, R * 0.03, 270], [-R * 0.1, y0 + R * 0.05, 0], "#E8A5D0", { rot: [70, 20, 0] });
    return {};
  },
};

B.plant = {
  about: "Potted plant: a faceted pot with soil, a jointed stem and N leaves (`leaf-0`.. tween their scale to grow), with an optional flower or fruit on top.",
  params: {
    leaves: int(6, 2, 10, "Leaves"),
    height: num(1.6, 0.6, 3, "Stem height"),
    bloom: opt("flower", ["none", "flower", "fruit"], "Top of the plant"),
    leaf: color("Leaf color"),
    pot: color("Pot color"),
  },
  build(p, k) {
    const leaf = p.leaf ?? "#4FAE5A";
    const pot = p.pot ?? "#C4683A";
    k.cyl("pot", [0.5, 0.36, 0.5], [0, 0.25, 0], pot, { facets: 8 });
    k.cyl("pot-rim", [0.55, 0.55, 0.08], [0, 0.52, 0], shade(pot, 0.15), { facets: 8 });
    k.cyl("soil", [0.46, 0.46, 0.04], [0, 0.52, 0], "#5B3A22", { facets: 8 });
    const segs = 5;
    let x = 0;
    for (let i = 0; i < segs; i++) {
      const sh = p.height / segs;
      k.cyl("stem", [0.035, 0.045, sh * 1.05], [x, 0.54 + sh * (i + 0.5), 0], "#3E8A3A", { facets: 5, rot: [0, 0, 4 * (i % 2 ? 1 : -1)] });
    }
    for (let i = 0; i < p.leaves; i++) {
      const u = (i + 0.7) / (p.leaves + 0.7);
      const a = i * 137;
      const y = 0.6 + u * p.height * 0.9;
      const g = k.grp(`leaf-${i}`, [0, y, 0], { rot: [0, a, 0] });
      k.sph("leaf-blade", [0.32 - u * 0.1, 0.03, 0.14], [0.3 - u * 0.08, 0.02, 0], i % 2 ? leaf : shade(leaf, 0.12), { parent: g, facets: 5, rot: [0, 0, 18] });
      k.box("leaf-vein", [0.4 - u * 0.12, 0.012, 0.012], [0.3 - u * 0.08, 0.05, 0], shade(leaf, -0.25), { parent: g, rot: [0, 0, 18] });
    }
    const top = 0.55 + p.height;
    if (p.bloom === "flower") {
      for (let i = 0; i < 6; i++) k.sph("petal", [0.14, 0.04, 0.08], [Math.cos(rad(i * 60)) * 0.16, top + 0.05, Math.sin(rad(i * 60)) * 0.16], k.pick(["#FF7AA2", "#F25C78", "#FFD23F"], "pc"), { facets: 4, rot: [0, -i * 60, 10] });
      k.sph("heart", [0.09], [0, top + 0.07, 0], "#F2C14E", { facets: 5 });
    } else if (p.bloom === "fruit") for (let i = 0; i < 3; i++) k.sph("fruit", [0.12], [Math.cos(rad(i * 120)) * 0.2, top - 0.1 - i * 0.04, Math.sin(rad(i * 120)) * 0.2], "#E5484D", { facets: 6 });
    return {};
  },
};

B.mountain = {
  about: "Faceted mountain range: a main peak of stacked 6-sided cones with a snow cap, two shoulder peaks, ridge rocks and a scree of boulders.",
  params: {
    height: num(3, 1, 5, "Main peak height"),
    snow: num(0.35, 0, 0.7, "Snow cap fraction"),
    rock: color("Rock color"),
    peaks: int(3, 1, 4, "Peaks"),
  },
  build(p, k) {
    const rock = p.rock ?? "#7C8696";
    const H = p.height;
    const peakAt = (name, x, z, h, w) => {
      k.cone(name, [w, h], [x, h / 2, z], rock, { facets: 6, rot: [0, k.vary(0, 60, name, x), 0] });
      k.cone(`${name}-mid`, [w * 0.72, h * 0.62], [x, h * 0.46 + 0.0, z + 0.05], shade(rock, -0.1), { facets: 6, rot: [0, 30, 0] });
      if (p.snow > 0) k.cone(`${name}-snow`, [w * p.snow * 1.4, h * p.snow], [x, h - (h * p.snow) / 2, z], "#F4F8FF", { facets: 6, rot: [0, k.vary(0, 60, name, x), 0] });
    };
    peakAt("peak", 0, 0, H, H * 0.62);
    for (let i = 1; i < p.peaks; i++) peakAt(`peak-${i}`, (i % 2 ? -1 : 1) * (H * 0.55 + i * 0.3), 0.3 + i * 0.1, H * (0.7 - i * 0.12), H * 0.42);
    for (let i = 0; i < 9; i++) {
      const a = k.rnd("ra", i) * 360;
      const d = H * k.vary(0.5, 0.95, "rd", i);
      k.sph("boulder", [0.14 + k.rnd("rs", i) * 0.14, 0.1, 0.14], [Math.cos(rad(a)) * d, 0.08, Math.abs(Math.sin(rad(a))) * d * 0.6 + 0.5], shade(rock, k.vary(-0.15, 0.15, "rc", i)), { facets: 5, rot: [0, a, 0] });
    }
    for (let i = 0; i < 4; i++) k.cone("pine", [0.14, 0.4], [k.vary(-H * 0.8, H * 0.8, "px", i), 0.2, H * 0.55 + k.rnd("pz", i) * 0.4], "#2F7D4B", { facets: 5 });
    return {};
  },
};

B.river = {
  about: "River winding along x: a faceted sequence of blue water segments between grassy banks with pebbles and a small footbridge option; water segments are `water-0`..",
  params: {
    length: num(9, 3, 28, "Length along x (actor mode: <= 9.6)"),
    width: num(1.2, 0.5, 3, "River width"),
    wiggle: num(0.6, 0, 2, "Sideways meander"),
    water: color("Water color"),
    bridge: bool(false, "A small plank footbridge in the middle"),
  },
  build(p, k) {
    const water = p.water ?? "#4FA8E8";
    const n = Math.max(6, Math.round(p.length / 0.6));
    const seg = p.length / n;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const x = -p.length / 2 + (i + 0.5) * seg;
      const z = Math.sin(i * 0.7 + k.seed) * p.wiggle;
      const next = Math.sin((i + 1) * 0.7 + k.seed) * p.wiggle;
      const ang = deg(Math.atan2(next - z, seg));
      k.box("water", [seg * 1.12, 0.08, p.width], [x, 0.04, z], i % 2 ? water : shade(water, 0.08), { rot: [0, -ang, 0] });
      for (const s of [-1, 1]) k.box("bank", [seg * 1.1, 0.14, 0.35], [x, 0.07, z + s * (p.width / 2 + 0.15)], s > 0 ? "#6DB345" : "#5BA03A", { rot: [0, -ang, 0], radius: 0.04 });
      if (i % 3 === 0) k.sph("pebble", [0.09, 0.05, 0.08], [x + 0.1, 0.1, z + (i % 2 ? 1 : -1) * (p.width / 2 + 0.02)], "#9AA0A8", { facets: 5 });
      prev = z;
    }
    void prev;
    if (p.bridge) {
      k.box("bridge-deck", [0.8, 0.07, p.width + 1.0], [0, 0.4, Math.sin(Math.round(n / 2) * 0.7 + k.seed) * p.wiggle], "#9C6B3C");
      for (const s of [-1, 1]) k.box("bridge-rail", [0.05, 0.3, p.width + 1.0], [s * 0.38, 0.6, Math.sin(Math.round(n / 2) * 0.7 + k.seed) * p.wiggle], "#7A4F2C");
    }
    return {};
  },
};

B.volcano = {
  about: "Volcano: a faceted cone with a crater ring, glowing lava (`lava`) that spills down streams, boulders and smoke puffs (`smoke-0`..) that beats can lift and fade.",
  params: {
    height: num(2.6, 1, 4, "Height"),
    lava: color("Lava color"),
    smoke: int(4, 0, 7, "Smoke puffs"),
  },
  build(p, k) {
    const H = p.height;
    const lava = p.lava ?? "#FF5A1F";
    k.cyl("cone", [H * 0.18, H * 0.7, H], [0, H / 2, 0], "#6B5B53", { facets: 8 });
    k.cyl("cone-upper", [H * 0.14, H * 0.3, H * 0.4], [0, H * 0.8, 0], "#5B4A44", { facets: 8, rot: [0, 22, 0] });
    k.cyl("crater", [H * 0.2, H * 0.17, 0.12], [0, H + 0.03, 0], "#3B2F2B", { facets: 8 });
    k.cyl("lava", [H * 0.15, H * 0.15, 0.1], [0, H + 0.06, 0], lava, { facets: 8, material: "emissive", emissive: 1.4, role: "glow" });
    for (let i = 0; i < 4; i++) {
      const a = i * 90 + 25;
      const len = H * 0.55;
      k.box("lava-stream", [0.14, 0.05, len], [Math.cos(rad(a)) * H * 0.3, H * 0.62, Math.sin(rad(a)) * H * 0.3], lava, { rot: [Math.round(-Math.sin(rad(a)) * 30), -a + 90, Math.round(Math.cos(rad(a)) * 0)], material: "emissive", emissive: 0.9, role: "glow" });
    }
    for (let i = 0; i < 8; i++) {
      const a = k.rnd("ba", i) * 360;
      k.sph("boulder", [0.12 + k.rnd("bs", i) * 0.1, 0.09, 0.12], [Math.cos(rad(a)) * H * 0.8, 0.07, Math.sin(rad(a)) * H * 0.8], "#4B413C", { facets: 5, rot: [0, a, 0] });
    }
    for (let i = 0; i < p.smoke; i++) k.sph("smoke", [0.3 + i * 0.05], [Math.sin(i) * 0.2, H + 0.5 + i * 0.4, Math.cos(i) * 0.15], i % 2 ? "#8D8D96" : "#B8B8C0", { facets: 6, opacity: Math.max(0.25, 0.85 - i * 0.12) });
    return {};
  },
};

// ---------------- history and story ----------------

B.castle = {
  about: "Castle: curtain walls with crenellations, four round towers with cone roofs and flags, a central keep, an arched gatehouse with a portcullis and a drawbridge, and window slits.",
  params: {
    width: num(4.6, 2.5, 8, "Wall width (x)"),
    depth: num(3.6, 2, 6, "Wall depth (z)"),
    stone: color("Stone color"),
    roof: color("Tower roof color"),
    flag: color("Flag color"),
  },
  build(p, k) {
    const W = p.width;
    const D = p.depth;
    const stone = p.stone ?? "#C9C3B8";
    const roof = p.roof ?? "#B8453A";
    const flagC = p.flag ?? "#E5484D";
    const wh = 0.9;
    const wall = (name, sx, sz, x, z) => {
      k.box(name, [sx, wh, sz], [x, wh / 2, z], stone);
      const along = sx > sz;
      const len = along ? sx : sz;
      const n = Math.max(3, Math.floor(len / 0.4));
      for (let i = 0; i < n; i++) {
        const u = -len / 2 + (i + 0.5) * (len / n);
        k.box("merlon", along ? [len / n * 0.55, 0.16, sz + 0.04] : [sx + 0.04, 0.16, len / n * 0.55], along ? [x + u, wh + 0.08, z] : [x, wh + 0.08, z + u], shade(stone, 0.06));
      }
    };
    wall("wall-back", W, 0.3, 0, -D / 2);
    wall("wall-left", 0.3, D, -W / 2, 0);
    wall("wall-right", 0.3, D, W / 2, 0);
    wall("wall-front-l", W * 0.32, 0.3, -W * 0.34, D / 2);
    wall("wall-front-r", W * 0.32, 0.3, W * 0.34, D / 2);
    k.box("gate-top", [W * 0.36, 0.3, 0.3], [0, wh * 0.82, D / 2], stone);
    k.box("gate-door", [W * 0.2, wh * 0.62, 0.05], [0, wh * 0.31, D / 2 + 0.1], "#3A2F28");
    for (let i = 0; i < 4; i++) k.box("portcullis", [0.02, wh * 0.5, 0.03], [-W * 0.08 + i * 0.1, wh * 0.4, D / 2 + 0.14], "#5B6270");
    k.box("drawbridge", [W * 0.2, 0.05, 0.8], [0, 0.04, D / 2 + 0.55], "#7A4F2C", { rot: [-6, 0, 0] });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = (sx * W) / 2;
      const z = (sz * D) / 2;
      k.cyl("tower", [0.38, 0.42, 1.5], [x, 0.75, z], shade(stone, -0.05), { facets: 8 });
      k.cyl("tower-top", [0.46, 0.4, 0.14], [x, 1.55, z], shade(stone, 0.05), { facets: 8 });
      k.cone("tower-roof", [0.5, 0.7], [x, 1.97, z], roof, { facets: 8 });
      k.box("slit", [0.04, 0.22, 0.04], [x, 1.0, z + sz * 0.4], "#2B2F38");
      k.cyl("flag-pole", [0.012, 0.012, 0.45], [x, 2.5, z], "#3A2F28", { facets: 4 });
      k.box("flag", [0.3, 0.16, 0.01], [x + 0.16, 2.6, z], flagC);
    }
    k.box("keep", [W * 0.34, 1.6, D * 0.34], [0, 0.8, -D * 0.1], shade(stone, 0.08));
    for (let i = 0; i < 6; i++) k.box("keep-merlon", [0.2, 0.16, 0.2], [-W * 0.15 + i * (W * 0.3 / 5), 1.68, -D * 0.1 + (i % 2 ? 0.0 : 0) + D * 0.17], shade(stone, 0.12));
    k.cone("keep-roof", [W * 0.2, 0.9], [0, 2.05, -D * 0.1], roof, { facets: 4, rot: [0, 45, 0] });
    for (let i = 0; i < 3; i++) k.box("keep-window", [0.1, 0.22, 0.04], [-0.3 + i * 0.3, 1.0, -D * 0.1 + D * 0.17 + 0.03], "#2B2F38");
    k.cyl("keep-pole", [0.014, 0.014, 0.55], [0, 2.75, -D * 0.1], "#3A2F28", { facets: 4 });
    k.box("keep-flag", [0.4, 0.22, 0.01], [0.22, 2.9, -D * 0.1], flagC);
    return {};
  },
};

B.ship = {
  about: "Sailing ship: extruded hull with deck, planks and a stern castle, N masts with square sails (`sail-0`..) and flags, a wheel, cannons along the sides, rigging and an anchor. Faces +x (bow right).",
  params: {
    masts: int(2, 1, 3, "Masts"),
    length: num(3.6, 2, 5, "Hull length"),
    hull: color("Hull color"),
    sail: color("Sail color"),
    flag: color("Flag color"),
    cannons: int(3, 0, 5, "Cannons per side"),
  },
  build(p, k) {
    const L = p.length;
    const hull = p.hull ?? "#7A4F2C";
    const sail = p.sail ?? "#F4EFE4";
    const flagC = p.flag ?? "#1E2230";
    const pts = [[-L / 2, 0.55], [-L / 2 + 0.2, 0.0], [L / 2 - 0.5, 0.0], [L / 2 + 0.25, 0.5], [L / 2 - 0.1, 0.55]];
    k.ext("hull", 1.0, pts, [0, 0.15, 0], hull);
    k.ext("hull-trim", 1.04, [[-L / 2, 0.5], [L / 2 - 0.1, 0.5], [L / 2 + 0.05, 0.56], [-L / 2, 0.56]], [0, 0.2, 0], shade(hull, 0.2));
    k.box("deck", [L * 0.95, 0.04, 0.9], [0, 0.72, 0], shade(hull, 0.3));
    for (let i = 0; i < 5; i++) k.box("plank-line", [L * 0.9, 0.006, 0.012], [0, 0.745, -0.35 + i * 0.175], shade(hull, -0.2));
    k.box("stern-castle", [0.7, 0.34, 0.95], [-L / 2 + 0.45, 0.9, 0], shade(hull, 0.05));
    k.box("stern-roof", [0.78, 0.05, 1.0], [-L / 2 + 0.45, 1.09, 0], shade(hull, -0.15));
    k.tor("wheel", [0.12, 0.018], [-L / 2 + 0.9, 0.95, 0], "#3A2F28", { rot: [0, 90, 0] });
    for (let i = 0; i < p.masts; i++) {
      const x = -L * 0.15 + (i * L * 0.5) / Math.max(1, p.masts - 1) - (p.masts === 1 ? 0 : L * 0.0);
      const h = 2.2 - i * 0.25;
      k.cyl("mast", [0.04, 0.05, h], [x, 0.7 + h / 2, 0], "#5B4636", { facets: 6 });
      for (const [yy, ww] of [[0.7 + h * 0.4, 1.25], [0.7 + h * 0.78, 0.95]]) {
        k.cyl("yard", [0.02, 0.02, ww], [x, yy + 0.4, 0.0], "#5B4636", { rot: [90, 0, 0], facets: 5 });
      }
      const g = k.grp(`sail-${i}`, [x, 0.7 + h * 0.55, 0.03]);
      k.box("sail-low", [0.04, h * 0.34, 1.15], [0.05, -h * 0.1, 0], sail, { parent: g, rot: [0, 0, -4] });
      k.box("sail-up", [0.04, h * 0.28, 0.9], [0.04, h * 0.25, 0], shade(sail, -0.04), { parent: g, rot: [0, 0, -4] });
      k.box("sail-stripe", [0.045, 0.05, 1.16], [0.06, -h * 0.1, 0], "#B8453A", { parent: g, rot: [0, 0, -4] });
      k.box("flag", [0.02, 0.14, 0.28], [x, 0.7 + h + 0.05, 0.16], flagC);
    }
    for (let i = 0; i < p.cannons; i++) for (const s of [-1, 1]) {
      const x = -L * 0.05 + i * 0.42;
      k.cyl("cannon", [0.045, 0.06, 0.22], [x, 0.66, s * 0.52], "#2B2F38", { rot: [90, 0, 0], facets: 6 });
      k.box("port", [0.14, 0.1, 0.01], [x, 0.42, s * 0.505], "#2B2216");
    }
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) k.cyl("rigging", [0.006, 0.006, 1.7], [-L * 0.1 + i * 0.5, 1.5, s * 0.25], "#B9A98C", { facets: 4, rot: [Math.round(-s * 8), 0, 0] });
    k.sph("anchor", [0.07], [L / 2 - 0.1, 0.4, 0.5], "#3A4150", { facets: 5 });
    k.cyl("bowsprit", [0.025, 0.035, 0.7], [L / 2 + 0.25, 0.75, 0], "#5B4636", { rot: [0, 0, -75], facets: 5 });
    k.sph("figurehead", [0.07], [L / 2 + 0.55, 0.9, 0], "#E8B84A", { facets: 5 });
    return {};
  },
};

B.flag = {
  about: "Flag on a pole: a gold finial, a cloth of five wavy segments in up to 3 stripes and a round emblem; the cloth is a group `cloth` that beats can hoist (pos y) or wave (rot).",
  params: {
    height: num(2.4, 1, 4, "Pole height"),
    colors: list(["#E5484D", "#F4F4F0", "#3B82F6"], "Stripe colors (1-3)"),
    emblem: color("Emblem color"),
  },
  build(p, k) {
    const cols = p.colors.filter(isHex).slice(0, 3);
    const cs = cols.length ? cols : ["#E5484D"];
    k.cyl("base", [0.14, 0.18, 0.12], [0, 0.06, 0], "#6B7280", { facets: 6 });
    k.cyl("pole", [0.022, 0.03, p.height], [0, p.height / 2, 0], "#C8CDD4", { facets: 6, material: "metal" });
    k.sph("finial", [0.05], [0, p.height + 0.04, 0], "#E8B84A", { facets: 6 });
    const cloth = k.grp("cloth", [0, p.height * 0.88, 0]);
    const w = 0.28;
    for (let s = 0; s < 5; s++) cs.forEach((c, i) => k.box("cloth-seg", [w * 0.98, 0.5 / cs.length, 0.015], [0.03 + w * (s + 0.5), -0.5 / cs.length * (i + 0.5) + 0.02, Math.sin(s * 1.3) * 0.05], shade(c, (s % 2) * -0.06), { parent: cloth, rot: [0, Math.round(Math.sin(s * 1.3) * 12), 0] }));
    k.cyl("emblem", [0.1, 0.1, 0.02], [0.03 + w * 1.2, -0.23, 0.04], p.emblem ?? "#F2C14E", { parent: cloth, rot: [90, 0, 0], facets: 8 });
    return {};
  },
};

B["map-table"] = {
  about: "War-room map table: a wooden table with a parchment map (mountains, river, forest, a castle mark and a red route), unit tokens (`token-0`..), candles and a rolled scroll. The top of the map is at y = 0.95.",
  params: {
    width: num(3.2, 1.8, 5, "Table width"),
    tokens: int(4, 0, 8, "Unit tokens"),
    parchment: color("Map color"),
    wood: color("Table wood"),
  },
  build(p, k) {
    const W = p.width;
    const D = W * 0.65;
    const wood = p.wood ?? "#7A4F2C";
    k.box("tabletop", [W, 0.12, D], [0, 0.88, 0], wood, { radius: 0.03 });
    k.box("rim", [W + 0.1, 0.06, D + 0.1], [0, 0.82, 0], shade(wood, -0.15));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box("leg", [0.16, 0.8, 0.16], [x * (W / 2 - 0.15), 0.4, z * (D / 2 - 0.15)], shade(wood, -0.1));
    k.box("map", [W * 0.88, 0.02, D * 0.84], [0, 0.96, 0], p.parchment ?? "#EAD9B0");
    for (let i = 0; i < 3; i++) k.cone("map-mountain", [0.14, 0.2], [-W * 0.25 + i * 0.2, 1.08, -D * 0.2 + (i % 2) * 0.1], i % 2 ? "#9A8F7A" : "#7C7160", { facets: 4 });
    for (let i = 0; i < 5; i++) k.box("map-river", [0.3, 0.012, 0.07], [W * 0.1 + i * 0.22 - 0.2, 0.975, -D * 0.05 + Math.sin(i) * 0.12], "#6FB2E0", { rot: [0, Math.round(Math.sin(i) * 25), 0] });
    for (let i = 0; i < 4; i++) k.cone("map-tree", [0.07, 0.16], [W * 0.28 + (i % 2) * 0.16, 1.06, D * 0.2 + Math.floor(i / 2) * 0.14], "#4F9A38", { facets: 5 });
    k.box("map-castle", [0.18, 0.12, 0.14], [-W * 0.3, 1.04, D * 0.2], "#B9B3A8");
    k.cone("map-castle-roof", [0.12, 0.12], [-W * 0.3, 1.14, D * 0.2], "#B8453A", { facets: 4, rot: [0, 45, 0] });
    for (let i = 0; i < 6; i++) k.box("route", [0.16, 0.012, 0.03], [-W * 0.25 + i * 0.2, 0.975, D * 0.2 - i * 0.07], "#E5484D", { rot: [0, Math.round(i * -6), 0] });
    k.box("route-x", [0.12, 0.012, 0.03], [W * 0.3, 0.98, -D * 0.2], "#E5484D", { rot: [0, 45, 0] });
    k.box("route-x", [0.12, 0.012, 0.03], [W * 0.3, 0.98, -D * 0.2], "#E5484D", { rot: [0, -45, 0] });
    for (let i = 0; i < p.tokens; i++) k.cyl(`token-${i}`, [0.07, 0.07, 0.1], [-W * 0.3 + i * 0.35, 1.03, D * 0.0 + (i % 2) * 0.2 - 0.1], i % 2 ? "#3B82F6" : "#E5484D", { facets: 8 });
    for (const s of [-1, 1]) {
      k.cyl("candle", [0.04, 0.04, 0.2], [s * (W / 2 - 0.2), 1.04, D / 2 - 0.2], "#F4EFE4", { facets: 6 });
      k.cone("flame", [0.03, 0.09], [s * (W / 2 - 0.2), 1.19, D / 2 - 0.2], "#FFC94A", { facets: 4, material: "emissive", emissive: 1.8, role: "glow" });
    }
    k.cyl("scroll", [0.05, 0.05, 0.5], [W * 0.35, 1.02, D * 0.38], "#EAD9B0", { rot: [0, 25, 90], facets: 8 });
    return {};
  },
};

B.cart = {
  about: "Wooden wagon cart: bed with slatted sides, two spoked wheels, a shaft with a yoke, a canvas arch and crates or barrels as cargo. Faces +x (shaft forward).",
  params: {
    wood: color("Wood color"),
    canvas: color("Canvas color"),
    cargo: opt("crates", ["none", "crates", "barrels"], "Cargo"),
    cover: bool(true, "Canvas cover arch"),
  },
  build(p, k) {
    const wood = p.wood ?? shade("#9C6B3C", k.vary(-0.12, 0.12, "wood"));
    k.box("bed", [1.6, 0.1, 0.9], [0, 0.55, 0], wood);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box("side-plank", [1.6, 0.1, 0.04], [0, 0.66 + i * 0.12, s * 0.45], i % 2 ? wood : shade(wood, -0.1));
    for (let i = 0; i < 5; i++) k.box("slat", [0.04, 0.38, 0.04], [-0.7 + i * 0.35, 0.78, 0.45], shade(wood, -0.2));
    for (const s of [-1, 1]) {
      const g = k.grp(`wheel-${s > 0 ? 0 : 1}`, [-0.15, 0.4, s * 0.52]);
      k.tor("rim", [0.4, 0.04, 360], [0, 0, 0], "#3A2F28", { parent: g });
      k.cyl("hub", [0.07, 0.07, 0.1], [0, 0, 0], "#5B4636", { parent: g, rot: [90, 0, 0], facets: 8 });
      for (let i = 0; i < 6; i++) k.box("spoke", [0.76, 0.04, 0.03], [0, 0, 0], wood, { parent: g, rot: [0, 0, i * 30] });
    }
    k.cyl("axle", [0.035, 0.035, 1.16], [-0.15, 0.4, 0], "#3A2F28", { rot: [90, 0, 0], facets: 6 });
    for (const s of [-1, 1]) k.cyl("shaft", [0.03, 0.04, 1.2], [1.35, 0.5, s * 0.22], wood, { rot: [0, 0, 84], facets: 5 });
    k.box("yoke", [0.06, 0.06, 0.6], [1.95, 0.5, 0], "#5B4636");
    if (p.cover) {
      for (let i = 0; i < 4; i++) k.tor("arch", [0.48, 0.025, 180], [-0.6 + i * 0.4, 0.72, 0], "#5B4636", { rot: [0, 90, 0] });
      k.cyl("canvas", [0.5, 0.5, 1.4], [-0.2, 0.72, 0], p.canvas ?? "#EFE6D2", { rot: [0, 0, 90], facets: 8, scale: [1, 1, 0.9], opacity: 0.97 });
    }
    if (p.cargo === "crates") for (let i = 0; i < 3; i++) k.box("crate", [0.34, 0.3 + k.rnd("ch", i) * 0.1, 0.34], [-0.5 + i * 0.4, 0.78, (i % 2 - 0.5) * 0.3 + k.vary(-0.05, 0.05, "cz", i)], shade(wood, 0.2), { radius: 0.02, rot: [0, k.vary(-12, 12, "cr", i), 0] });
    if (p.cargo === "barrels") for (let i = 0; i < 3; i++) k.cyl("barrel", [0.15, 0.17, 0.4], [-0.5 + i * 0.4, 0.82, (i % 2 - 0.5) * 0.3], "#7A4F2C", { facets: 8 });
    return {};
  },
};

B.tent = {
  about: "Camp tent: a faceted 4-sided canvas tent with a door flap, ridge pole, guy ropes with stakes, a flag, plus an optional campfire with logs and glowing flames.",
  params: {
    size: num(1.2, 0.6, 2, "Tent size"),
    canvas: color("Canvas color"),
    fire: bool(true, "Campfire in front"),
  },
  build(p, k) {
    const s = p.size;
    const canvas = p.canvas ?? "#E8DCC2";
    k.cone("tent", [s * 0.95, s * 1.1], [0, s * 0.55, 0], canvas, { facets: 4, rot: [0, 45, 0] });
    k.cone("tent-stripe", [s * 0.97, s * 0.3], [0, s * 0.18, 0], "#B8453A", { facets: 4, rot: [0, 45, 0], scale: [1, 1, 1] });
    k.box("door", [s * 0.4, s * 0.62, 0.02], [0, s * 0.31, s * 0.62], "#3A2F28", { rot: [-12, 0, 0] });
    k.box("flap", [s * 0.18, s * 0.6, 0.02], [s * 0.26, s * 0.3, s * 0.63], shade(canvas, -0.12), { rot: [-12, 0, 8] });
    k.cyl("pole", [0.02, 0.02, s * 0.5], [0, s * 1.25, 0], "#5B4636", { facets: 5 });
    k.box("flag", [0.02, s * 0.14, s * 0.26], [0, s * 1.4, s * 0.14], "#E5484D");
    for (let i = 0; i < 4; i++) {
      const a = i * 90 + 45;
      k.cyl("rope", [0.006, 0.006, s * 0.9], [Math.cos(rad(a)) * s * 0.85, s * 0.45, Math.sin(rad(a)) * s * 0.85], "#B9A98C", { facets: 4, rot: [Math.round(Math.sin(rad(a)) * 35), 0, Math.round(-Math.cos(rad(a)) * 35)] });
      k.cyl("stake", [0.015, 0.015, 0.14], [Math.cos(rad(a)) * s * 1.2, 0.05, Math.sin(rad(a)) * s * 1.2], "#5B4636", { facets: 4 });
    }
    if (p.fire) {
      for (let i = 0; i < 6; i++) k.cyl("stone", [0.06, 0.06, 0.05], [1.5 * s + Math.cos(i * 60 * Math.PI / 180) * 0.2, 0.03, 0.9 * s + Math.sin(i * 60 * Math.PI / 180) * 0.2], "#8D93A0", { facets: 5 });
      for (let i = 0; i < 3; i++) k.cyl("log", [0.035, 0.035, 0.34], [1.5 * s, 0.06, 0.9 * s], "#5B3A22", { rot: [90, i * 60, 0], facets: 5 });
      k.cone("flame", [0.1, 0.3], [1.5 * s, 0.22, 0.9 * s], "#FF7A1A", { facets: 5, material: "emissive", emissive: 1.8, role: "glow" });
      k.cone("flame-core", [0.06, 0.2], [1.5 * s, 0.2, 0.9 * s], "#FFE066", { facets: 5, material: "emissive", emissive: 2, role: "glow" });
    }
    return {};
  },
};

// ---------------- city and engineering ----------------

B.factory = {
  about: "Factory: a long hall with sawtooth roof, rows of windows, loading doors, two smoking chimneys (`smoke-0`..), storage tanks with ladders, a pipe bridge and a conveyor with boxes (`box-0`..).",
  params: {
    length: num(4.6, 3, 8, "Hall length"),
    wall: color("Wall color"),
    roof: color("Roof color"),
    chimneys: int(2, 1, 3, "Chimneys"),
    boxes: int(4, 0, 8, "Boxes on the conveyor"),
  },
  build(p, k) {
    const L = p.length;
    const wall = p.wall ?? "#C9C3B8";
    const roof = p.roof ?? "#6B7A90";
    k.box("slab", [L + 0.4, 0.08, 2.4], [0, 0.04, 0], "#8A93A0");
    k.box("hall", [L, 1.1, 1.6], [0, 0.63, -0.1], wall);
    for (let i = 0; i < 4; i++) {
      const x = -L / 2 + (i + 0.5) * (L / 4);
      k.ext("saw", 1.6, [[-L / 8, 0], [L / 8, 0], [L / 8, 0.4]], [x, 1.18, -0.1], roof, { rot: [0, 0, 0] });
      k.box("saw-glass", [0.02, 0.36, 1.5], [x - L / 8 + 0.02, 1.38, -0.1], "#BFE3F5", { rot: [0, 0, 0] });
    }
    for (let i = 0; i < 6; i++) k.box("window", [0.4, 0.32, 0.03], [-L / 2 + 0.5 + i * ((L - 1) / 5), 0.8, 0.72], "#BFE3F5");
    for (let i = 0; i < 2; i++) k.box("door", [0.7, 0.7, 0.04], [-L / 2 + 1.0 + i * 1.6, 0.4, 0.72], "#B8453A");
    for (let i = 0; i < p.chimneys; i++) {
      const x = L / 2 - 0.4 - i * 0.55;
      k.cyl("chimney", [0.12, 0.16, 1.8], [x, 1.3, -0.9], "#B5654A", { facets: 8 });
      k.cyl("chimney-band", [0.14, 0.14, 0.08], [x, 2.0, -0.9], "#F4F4F0", { facets: 8 });
      k.sph("smoke", [0.2 + i * 0.04], [x + 0.1, 2.4 + i * 0.1, -0.9], "#C8CDD4", { facets: 6, opacity: 0.8 });
      k.sph("smoke", [0.28], [x + 0.35, 2.8 + i * 0.1, -0.9], "#D7DBE3", { facets: 6, opacity: 0.6 });
    }
    for (let i = 0; i < 2; i++) {
      const x = L / 2 + 0.25 + i * 0.1;
      k.cyl("tank", [0.32, 0.32, 0.9], [x + i * 0.4, 0.55, 0.9], i ? "#E8743B" : "#9AA3AD", { facets: 10 });
      k.cone("tank-lid", [0.34, 0.14], [x + i * 0.4, 1.06, 0.9], shade(i ? "#E8743B" : "#9AA3AD", -0.12), { facets: 10 });
    }
    k.box("ladder", [0.05, 0.9, 0.02], [L / 2 + 0.25, 0.55, 0.58], "#5B6270");
    k.cyl("pipe-bridge", [0.05, 0.05, 1.4], [L / 2 + 0.55, 1.0, 0.4], "#2F7DE1", { rot: [90, 0, 0], facets: 8 });
    k.box("conveyor", [L * 0.7, 0.08, 0.3], [-0.2, 0.2, 1.15], "#4B5563");
    for (let i = 0; i < 8; i++) k.cyl("roller", [0.05, 0.05, 0.32], [-L * 0.35 - 0.2 + i * (L * 0.7 / 7), 0.18, 1.15], "#9AA3AD", { rot: [90, 0, 0], facets: 6 });
    for (let i = 0; i < p.boxes; i++) k.box(`box-${i}`, [0.22, 0.2, 0.22], [-L * 0.3 + i * (L * 0.6 / Math.max(1, p.boxes - 1)), 0.34, 1.15], ["#C9924F", "#B87A3F"][i % 2]);
    return {};
  },
};

B.crane = {
  about: "Tower crane: a lattice mast on a base, a jib with a counterweight, a trolley, and a cable with a hook block in a group `hook` (tween its pos y to lift or lower the load); optional hanging load.",
  params: {
    height: num(3.6, 2, 5.5, "Mast height"),
    jib: num(3.4, 1.5, 4.8, "Jib length"),
    body: color("Crane color"),
    load: bool(true, "A crate hanging from the hook"),
  },
  build(p, k) {
    const body = p.body ?? "#F2A81D";
    const H = p.height;
    k.box("base", [1.0, 0.2, 1.0], [0, 0.1, 0], "#6B7280");
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box("mast-leg", [0.06, H, 0.06], [x * 0.2, H / 2 + 0.2, z * 0.2], body);
    const n = Math.round(H / 0.4);
    for (let i = 0; i < n; i++) {
      const y = 0.2 + (i + 0.5) * (H / n);
      for (const z of [-1, 1]) k.box("mast-brace", [0.5, 0.035, 0.035], [0, y, z * 0.2], shade(body, -0.15), { rot: [0, 0, i % 2 ? 40 : -40] });
      for (const x of [-1, 1]) k.box("mast-brace", [0.035, 0.035, 0.5], [x * 0.2, y, 0], shade(body, -0.15), { rot: [i % 2 ? 40 : -40, 0, 0] });
    }
    const top = H + 0.2;
    k.box("cab", [0.4, 0.34, 0.4], [0.35, top - 0.1, 0.0], "#E8E8EE");
    k.box("cab-window", [0.02, 0.2, 0.28], [0.56, top - 0.05, 0], "#6FB2E0");
    k.box("jib", [p.jib, 0.08, 0.1], [p.jib / 2 - 0.5, top + 0.2, 0], body);
    k.box("jib-top", [p.jib, 0.04, 0.04], [p.jib / 2 - 0.5, top + 0.38, 0], shade(body, -0.1));
    for (let i = 0; i < 8; i++) k.box("jib-brace", [0.3, 0.025, 0.025], [-0.3 + i * (p.jib / 8) + 0.1, top + 0.29, 0], shade(body, -0.15), { rot: [0, 0, i % 2 ? 50 : -50] });
    k.box("counter-jib", [1.0, 0.08, 0.1], [-1.0, top + 0.2, 0], body);
    k.box("counterweight", [0.4, 0.26, 0.3], [-1.35, top + 0.0, 0], "#5B6270");
    k.box("apex", [0.08, 0.4, 0.08], [0, top + 0.5, 0], body);
    k.box("trolley", [0.2, 0.08, 0.14], [p.jib - 0.7, top + 0.12, 0], "#5B6270");
    const hook = k.grp("hook", [p.jib - 0.7, top + 0.05, 0]);
    k.cyl("cable", [0.01, 0.01, 1.5], [0, -0.75, 0], "#2B2F38", { parent: hook, facets: 4 });
    k.box("hook-block", [0.14, 0.12, 0.1], [0, -1.55, 0], "#E5484D", { parent: hook });
    k.tor("hook-curve", [0.06, 0.015, 240], [0, -1.68, 0], "#9AA3AD", { parent: hook, rot: [0, 0, 150] });
    if (p.load) {
      for (const s of [-1, 1]) k.cyl("sling", [0.006, 0.006, 0.3], [s * 0.1, -1.85, 0], "#2B2F38", { parent: hook, facets: 4, rot: [0, 0, s * 25] });
      k.box("load", [0.4, 0.26, 0.3], [0, -2.05, 0], "#9C6B3C", { parent: hook, radius: 0.02 });
    }
    return {};
  },
};

B["wind-turbine"] = {
  about: "Wind turbine: a tapered tower with bands, a nacelle, a hub and a rotor group `rotor` of three extruded blades (turn its rot z with a beat), plus a service door and a concrete base.",
  params: {
    height: num(3.4, 1.5, 5, "Tower height"),
    blade: num(1.4, 0.6, 2.2, "Blade length"),
    body: color("Tower color"),
  },
  build(p, k) {
    const body = p.body ?? "#EEF1F5";
    const H = p.height;
    k.cyl("base", [0.4, 0.46, 0.14], [0, 0.07, 0], "#9AA3AD", { facets: 8 });
    k.cyl("tower", [0.07, 0.15, H], [0, H / 2 + 0.14, 0], body, { facets: 10 });
    for (let i = 0; i < 3; i++) k.cyl("band", [0.12 - i * 0.025, 0.12 - i * 0.025, 0.035], [0, 0.5 + i * (H / 3.4), 0], "#E5484D", { facets: 10 });
    k.box("door", [0.08, 0.2, 0.02], [0, 0.3, 0.15], "#4B5563");
    const top = H + 0.14;
    k.box("nacelle", [0.5, 0.2, 0.2], [0.05, top + 0.1, 0], body, { radius: 0.05 });
    k.sph("nose", [0.12], [0.34, top + 0.1, 0], "#E5484D", { facets: 6 });
    const rotor = k.grp("rotor", [0.4, top + 0.1, 0]);
    for (let i = 0; i < 3; i++) {
      k.ext("blade", 0.03, [[-0.05, 0], [0.05, 0], [0.025, p.blade], [-0.02, p.blade]], [0, 0, 0], body, { parent: rotor, rot: [0, 0, i * 120] });
    }
    k.cyl("hub", [0.07, 0.09, 0.14], [0, 0, 0], "#C8CDD4", { parent: rotor, rot: [90, 0, 0], facets: 8 });
    return {};
  },
};

// ---------------- office and finance ----------------

B.desk = {
  about: "Office desk: top with drawers and knobs, a monitor with a stand and glowing screen, keyboard, mouse, a mug, a plant, a lamp and stacked papers. Faces +z (the chair side is +z).",
  params: {
    width: num(2.6, 1.6, 3.6, "Width"),
    top: color("Desktop color"),
    screen: color("Screen color"),
  },
  build(p, k) {
    const W = p.width;
    const D = 1.1;
    const wood = p.top ?? "#C9A27A";
    k.box("desktop", [W, 0.08, D], [0, 0.78, 0], wood, { radius: 0.02 });
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1]]) k.box("leg", [0.08, 0.76, 0.08], [x * (W / 2 - 0.08), 0.38, z * (D / 2 - 0.08)], shade(wood, -0.2));
    k.box("drawer-body", [0.7, 0.62, D - 0.12], [-W / 2 + 0.45, 0.4, 0], shade(wood, -0.1));
    for (let i = 0; i < 3; i++) {
      k.box("drawer", [0.62, 0.17, 0.02], [-W / 2 + 0.45, 0.2 + i * 0.19, D / 2 - 0.05], shade(wood, 0.05 + i * 0.03));
      k.sph("knob", [0.025], [-W / 2 + 0.45, 0.2 + i * 0.19, D / 2 - 0.03], "#E8B84A", { facets: 5 });
    }
    k.cyl("stand-base", [0.18, 0.18, 0.03], [0, 0.84, -0.2], "#2B2F38", { facets: 8 });
    k.box("stand-neck", [0.06, 0.28, 0.04], [0, 1.0, -0.22], "#2B2F38");
    k.box("monitor", [1.1, 0.64, 0.05], [0, 1.4, -0.22], "#1B2230", { radius: 0.02 });
    k.box("monitor-screen", [1.02, 0.56, 0.02], [0, 1.4, -0.19], p.screen ?? "#4FA8FF", { role: "screen", material: "emissive", emissive: 0.6 });
    for (let i = 0; i < 4; i++) k.box("code-line", [0.7 - (i % 2) * 0.25, 0.04, 0.02], [-0.12 - (i % 2) * 0.12, 1.55 - i * 0.12, -0.175], "#FFFFFF", { opacity: 0.85 });
    k.box("keyboard", [0.7, 0.03, 0.24], [0, 0.835, 0.25], "#E8E8EE", { radius: 0.01 });
    for (let i = 0; i < 3; i++) k.box("key-row", [0.62, 0.012, 0.04], [0, 0.855, 0.18 + i * 0.07], "#B9BFC9");
    k.sph("mouse", [0.06, 0.03, 0.09], [0.55, 0.84, 0.3], "#E8E8EE", { facets: 6 });
    k.cyl("mug", [0.07, 0.06, 0.12], [0.95, 0.88, 0.0], "#E5484D", { facets: 8 });
    k.tor("mug-handle", [0.045, 0.012, 200], [1.02, 0.88, 0], "#E5484D", { rot: [0, 0, -100] });
    k.cyl("pot", [0.1, 0.07, 0.14], [-0.6, 0.9, -0.3], "#C4683A", { facets: 6 });
    for (let i = 0; i < 4; i++) k.sph("leaf", [0.12, 0.03, 0.06], [-0.6 + Math.cos(i * 1.6) * 0.1, 1.05 + i * 0.03, -0.3 + Math.sin(i * 1.6) * 0.1], "#4FAE5A", { facets: 4, rot: [0, i * 90, 20] });
    k.cyl("lamp-base", [0.1, 0.1, 0.03], [W / 2 - 0.3, 0.83, -0.3], "#2B2F38", { facets: 8 });
    k.cyl("lamp-arm", [0.012, 0.012, 0.5], [W / 2 - 0.3, 1.08, -0.3], "#2B2F38", { facets: 5, rot: [0, 0, -15] });
    k.cone("lamp-shade", [0.12, 0.14], [W / 2 - 0.4, 1.36, -0.3], "#F2C14E", { facets: 8, rot: [0, 0, 180] });
    for (let i = 0; i < 5; i++) k.box("paper", [0.28, 0.01, 0.2], [0.75, 0.825 + i * 0.011, 0.35], "#F8F8F2", { rot: [0, i * 7, 0] });
    return {};
  },
};

B["chart-3d"] = {
  about: "3D bar chart on a platform: N bars from `values` (0..1, `bar-0`..; tween their scale y or pos to animate growth), a back grid, axis lines, floor ticks and an optional trend arrow.",
  params: {
    values: list([0.3, 0.5, 0.42, 0.7, 0.92], "Bar heights 0..1 (2-8 bars)"),
    height: num(2, 0.8, 3.4, "Height of a value of 1"),
    bar: color("Bar color"),
    highlight: color("Last bar color"),
    arrow: bool(true, "Trend arrow above the bars"),
  },
  build(p, k) {
    const vals = p.values.filter((v) => typeof v === "number").slice(0, 8).map((v) => clamp(v, 0.02, 1));
    const n = vals.length || 1;
    const W = Math.max(2.4, n * 0.55);
    const base = p.bar ?? "#3B82F6";
    const hl = p.highlight ?? "#F2A81D";
    k.box("platform", [W + 0.4, 0.1, 1.1], [0, 0.05, 0], "#E8E8EE", { radius: 0.03 });
    k.box("back-wall", [W + 0.3, p.height + 0.2, 0.05], [0, p.height / 2 + 0.2, -0.45], "#F4F6FA");
    for (let i = 1; i <= 4; i++) k.box("grid-line", [W + 0.2, 0.012, 0.02], [0, 0.1 + (i * p.height) / 4, -0.41], "#C8CDD4");
    vals.forEach((v, i) => {
      const x = -W / 2 + 0.3 + i * ((W - 0.6) / Math.max(1, n - 1));
      const h = Math.max(0.08, v * p.height);
      const c = i === n - 1 ? hl : shade(base, (i % 2) * 0.08);
      k.box(`bar-${i}`, [0.36, h, 0.36], [x, 0.1 + h / 2, 0], c, { radius: 0.02 });
      k.box("bar-cap", [0.38, 0.03, 0.38], [x, 0.1 + h + 0.015, 0], shade(c, 0.25));
      k.box("tick", [0.3, 0.012, 0.02], [x, 0.106, 0.5], "#9AA3AD");
    });
    k.box("axis-y", [0.03, p.height + 0.2, 0.03], [-W / 2 - 0.05, p.height / 2 + 0.2, 0.45], "#5B6270");
    k.box("axis-x", [W + 0.2, 0.03, 0.03], [0, 0.11, 0.55], "#5B6270");
    if (p.arrow) {
      k.box("trend-shaft", [W * 0.8, 0.06, 0.06], [0, p.height + 0.35, 0.1], "#2FB98F", { rot: [0, 0, 18] });
      k.cone("trend-head", [0.14, 0.3], [W * 0.38, p.height + 0.35 + Math.tan(rad(18)) * W * 0.38, 0.1], "#2FB98F", { facets: 4, rot: [0, 0, -72] });
    }
    return {};
  },
};

B["coin-stack"] = {
  about: "Stacks of gold coins with milled edges (`stack-0`..: groups you can scale or lift), a few loose coins, and a bag of money.",
  params: {
    stacks: int(3, 1, 5, "Stacks"),
    coins: int(8, 3, 14, "Coins in the tallest stack"),
    gold: color("Coin color"),
    bag: bool(true, "Money bag"),
  },
  build(p, k) {
    const gold = p.gold ?? "#F2C14E";
    for (let s = 0; s < p.stacks; s++) {
      const n = Math.max(2, Math.round(p.coins * (1 - s * 0.22)));
      const x = (s - (p.stacks - 1) / 2) * 0.5;
      const g = k.grp(`stack-${s}`, [x, 0, (s % 2) * 0.15]);
      for (let i = 0; i < n; i++) {
        k.cyl("coin", [0.2, 0.2, 0.045], [k.vary(-0.012, 0.012, "cx", s, i), 0.03 + i * 0.05, k.vary(-0.012, 0.012, "cz", s, i)], i % 2 ? gold : shade(gold, -0.1), { parent: g, facets: 14 });
      }
      k.cyl("coin-face", [0.14, 0.14, 0.01], [0, 0.055 + (n - 1) * 0.05, 0], shade(gold, 0.2), { parent: g, facets: 10 });
    }
    for (let i = 0; i < 3; i++) k.cyl("loose-coin", [0.18, 0.18, 0.04], [0.55 + i * 0.2, 0.025 + (i === 2 ? 0.04 : 0), 0.4 + (i % 2) * 0.12], gold, { facets: 14, rot: [i === 2 ? 70 : 0, i * 40, 0] });
    if (p.bag) {
      k.sph("bag", [0.34, 0.36, 0.3], [-p.stacks * 0.32 - 0.4, 0.34, 0.1], "#8A6B3D", { facets: 8 });
      k.cyl("bag-neck", [0.12, 0.2, 0.14], [-p.stacks * 0.32 - 0.4, 0.68, 0.1], "#8A6B3D", { facets: 8 });
      k.tor("bag-tie", [0.13, 0.02], [-p.stacks * 0.32 - 0.4, 0.72, 0.1], "#E5484D", { rot: [90, 0, 0] });
      k.cyl("bag-coin", [0.1, 0.1, 0.015], [-p.stacks * 0.32 - 0.4, 0.4, 0.4], gold, { rot: [90, 0, 0], facets: 10 });
    }
    return {};
  },
};

B.safe = {
  about: "Bank safe: a steel body with rivets and feet, a thick door in a group `door` (hinged on the left; tween rot y to open), a combination dial with ticks, a handle wheel, bolts and a gold bar inside.",
  params: {
    size: num(1.4, 0.8, 2.2, "Size"),
    body: color("Steel color"),
    open: num(0, 0, 110, "Door opening in degrees"),
  },
  build(p, k) {
    const s = p.size;
    const body = p.body ?? "#6B7686";
    k.box("body", [s, s, s * 0.8], [0, s / 2 + 0.06, 0], body, { radius: 0.04 });
    k.box("inner", [s * 0.8, s * 0.8, 0.02], [0, s / 2 + 0.06, s * 0.4 - 0.02], "#1B2230");
    k.box("gold-bar", [s * 0.4, s * 0.14, s * 0.2], [0, 0.2, s * 0.15], "#F2C14E", { radius: 0.02 });
    k.box("gold-bar", [s * 0.4, s * 0.14, s * 0.2], [0, 0.34, s * 0.15], "#E8B13A", { radius: 0.02 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box("foot", [0.12, 0.08, 0.12], [x * (s / 2 - 0.1), 0.04, z * (s * 0.4 - 0.1)], "#3A4150");
    const door = k.grp("door", [-s / 2 + 0.05, s / 2 + 0.06, s * 0.4], { rot: [0, -p.open, 0] });
    k.box("door-slab", [s * 0.92, s * 0.92, 0.12], [s * 0.46, 0, 0.06], shade(body, 0.1), { parent: door, radius: 0.03 });
    k.cyl("dial", [s * 0.17, s * 0.17, 0.05], [s * 0.46, s * 0.12, 0.15], "#2B2F38", { parent: door, rot: [90, 0, 0], facets: 14 });
    for (let i = 0; i < 12; i++) k.box("tick", [0.015, 0.05, 0.01], [s * 0.46 + Math.cos(rad(i * 30)) * s * 0.14, s * 0.12 + Math.sin(rad(i * 30)) * s * 0.14, 0.18], "#E8E8EE", { parent: door, rot: [0, 0, i * 30 + 90] });
    k.box("pointer", [0.02, s * 0.12, 0.012], [s * 0.46, s * 0.17, 0.19], "#E5484D", { parent: door });
    k.cyl("handle-hub", [0.07, 0.07, 0.08], [s * 0.46, -s * 0.22, 0.16], "#C8CDD4", { parent: door, rot: [90, 0, 0], facets: 8 });
    for (let i = 0; i < 3; i++) k.box("handle-spoke", [s * 0.26, 0.03, 0.03], [s * 0.46, -s * 0.22, 0.2], "#C8CDD4", { parent: door, rot: [0, 0, i * 60] });
    for (let i = 0; i < 6; i++) k.sph("rivet", [0.025], [s * 0.1 + (i % 3) * s * 0.36, s * (i < 3 ? 0.4 : -0.4), 0.13], "#9AA3AD", { parent: door, facets: 5 });
    for (const y of [-0.28, 0.3]) k.cyl("hinge", [0.04, 0.04, 0.14], [0, y * s, 0.06], "#3A4150", { parent: door, facets: 6 });
    return {};
  },
};

B.calendar = {
  about: "Desk calendar: a header with a month bar and two binding rings, a 5x7 grid of day tiles (`day-0`..`day-34`, tween the colour or scale of one to mark a date) and a red marker on a chosen day.",
  params: {
    marked: int(14, 0, 34, "Index of the marked day"),
    paper: color("Page color"),
    header: color("Header color"),
  },
  build(p, k) {
    const header = p.header ?? "#E5484D";
    k.box("backing", [2.0, 1.9, 0.06], [0, 1.0, 0], "#3A4150", { radius: 0.03 });
    k.box("page", [1.9, 1.5, 0.03], [0, 0.88, 0.04], p.paper ?? "#FFFFFF");
    k.box("header", [1.9, 0.36, 0.035], [0, 1.64, 0.045], header);
    for (const x of [-0.55, 0.55]) k.tor("ring", [0.07, 0.015, 360], [x, 1.86, 0.06], "#C8CDD4", { rot: [90, 0, 0] });
    for (let i = 0; i < 7; i++) k.box("weekday", [0.18, 0.05, 0.012], [-0.78 + i * 0.26, 1.42, 0.065], "#9AA3AD");
    for (let i = 0; i < 35; i++) {
      const r = Math.floor(i / 7);
      const c = i % 7;
      const mk = i === p.marked;
      k.box(`day-${i}`, [0.2, 0.17, 0.014], [-0.78 + c * 0.26, 1.22 - r * 0.22, mk ? 0.08 : 0.065], mk ? "#E5484D" : c > 4 ? "#E8ECF4" : "#F0F3F9");
    }
    k.cyl("marker-ring", [0.14, 0.14, 0.012], [-0.78 + (p.marked % 7) * 0.26, 1.22 - Math.floor(p.marked / 7) * 0.22, 0.095], "#FFFFFF", { rot: [90, 0, 0], facets: 10 });
    k.box("stand", [0.1, 0.9, 0.04], [0, 0.3, -0.22], "#3A4150", { rot: [-22, 0, 0] });
    return {};
  },
};

// ---------------- parameter handling and expansion ----------------

export const BUILDER_NAMES = Object.keys(B);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Validate and complete the params of a builder. Returns {params, errors: string[]} (unknown keys, wrong types, bad enums). */
export function resolveParams(name, given = {}) {
  const b = B[name];
  const errors = [];
  const out = {};
  for (const [key, spec] of Object.entries(b.params)) {
    let v = given?.[key];
    if (v === undefined || v === null) {
      out[key] = spec.def;
      continue;
    }
    if (spec.type === "number" || spec.type === "integer") {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.push(`"${key}" must be a number (${spec.min}..${spec.max})`);
        out[key] = spec.def;
        continue;
      }
      v = clamp(v, spec.min, spec.max);
      out[key] = spec.type === "integer" ? Math.round(v) : v;
    } else if (spec.type === "enum") {
      if (!spec.values.includes(v)) {
        errors.push(`"${key}" must be one of: ${spec.values.join(", ")}`);
        out[key] = spec.def;
      } else out[key] = v;
    } else if (spec.type === "boolean") {
      if (typeof v !== "boolean") errors.push(`"${key}" must be true or false`);
      out[key] = typeof v === "boolean" ? v : spec.def;
    } else if (spec.type === "color") {
      if (typeof v !== "string" || !(isHex(v) || /^#[0-9a-fA-F]{3}$/.test(v) || ["accent", "accent2", "accent3", "good", "bad", "muted", "text"].includes(v))) {
        errors.push(`"${key}" must be a #RRGGBB hex or a palette token (accent, accent2, accent3, good, bad, muted, text)`);
        out[key] = spec.def;
      } else out[key] = v;
    } else if (spec.type === "array") {
      if (!Array.isArray(v)) {
        errors.push(`"${key}" must be a list`);
        out[key] = spec.def;
      } else out[key] = v;
    }
  }
  for (const key of Object.keys(given ?? {})) if (!(key in b.params)) errors.push(`unknown param "${key}" (known: ${Object.keys(b.params).join(", ")})`);
  return { params: out, errors };
}

/**
 * Run a builder. `mode` "actor" makes parts relative to the actor base; "world" is the same list (the caller hangs it from a
 * group). Returns { parts, scatter?, scatterMany?, liquid? } with unique ids, never more than MAX_PARTS parts.
 */
export function runBuilder(name, params = {}, { seed = 0 } = {}) {
  const b = B[name];
  if (!b) throw new Error(`unknown builder "${name}" (known: ${BUILDER_NAMES.join(", ")})`);
  const { params: p, errors } = resolveParams(name, params);
  if (errors.length) throw new Error(`${name}: ${errors.join("; ")}`);
  const k = new Kit(seed, name);
  const extra = b.build(p, k) ?? {};
  // part ids must be unique and at most 40 chars
  const seen = new Set();
  for (const part of k.parts) {
    if (part.id.length > 38) part.id = part.id.slice(0, 38);
    if (seen.has(part.id)) {
      let n = 1;
      while (seen.has(`${part.id}~${n}`)) n++;
      part.id = `${part.id}~${n}`;
    }
    seen.add(part.id);
  }
  if (k.parts.length > MAX_PARTS) throw new Error(`${name}: ${k.parts.length} parts exceed the cap of ${MAX_PARTS}; lower the counts`);
  return { parts: k.parts, ...extra };
}

/** Name, description, params with defaults and a default part count of every builder (the `builders` CLI command). */
export function describeBuilders() {
  return BUILDER_NAMES.map((name) => {
    const b = B[name];
    const params = Object.fromEntries(Object.entries(b.params).map(([key, s]) => [key, { type: s.type, default: s.def, ...(s.min !== undefined ? { min: s.min, max: s.max } : {}), ...(s.values ? { values: s.values } : {}), about: s.about }]));
    let parts = 0;
    try {
      parts = runBuilder(name, {}, { seed: 1 }).parts.length;
    } catch {
      parts = 0;
    }
    return { name, about: b.about, scatter: Boolean(b.scatterDefault || name === "flowers"), defaultParts: parts, params };
  });
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const CALL_KEYS = new Set(["build", "params", "seed", "scatter", "liquid"]);

function expandActorCall(call, path, errors, liquids) {
  const out = {};
  for (const [key, v] of Object.entries(call)) if (!CALL_KEYS.has(key)) out[key] = v;
  let res;
  try {
    res = runBuilder(call.build, call.params ?? {}, { seed: call.seed ?? 0 });
  } catch (e) {
    errors.push({ path: [...path, "build"].join("."), message: e.message });
    return null;
  }
  out.parts = res.parts;
  const far = res.parts.find((q) => (q.pos ?? []).some((v) => Math.abs(v) > 5));
  if (far) errors.push({ path: [...path, "params"].join("."), message: `"${call.build}" is too large for an actor (part "${far.id}" lies beyond 5 units from its center); lower its size params, scale the actor with \`size\`, or build it in stage.world` });
  if (call.liquid !== undefined) {
    if (!res.liquid) errors.push({ path: [...path, "liquid"].join("."), message: `the builder "${call.build}" has no water volume hook` });
    else liquids.push({ id: call.liquid, kind: "box", area: res.liquid.area.map((v, i) => r3(v + (call.pos ?? [0, 0, 0])[i % 2 === 0 ? 0 : 2])), floor: r3(res.liquid.floor + (call.pos?.[1] ?? 0)), top: r3(res.liquid.top + (call.pos?.[1] ?? 0)) });
  }
  return out;
}

function expandWorldCall(call, path, errors, extraScatter) {
  let res;
  try {
    res = runBuilder(call.build, call.params ?? {}, { seed: call.seed ?? 0 });
  } catch (e) {
    errors.push({ path: [...path, "build"].join("."), message: e.message });
    return [];
  }
  const id = call.id ?? call.build;
  // every id gets the call id as a prefix, so several calls of one builder never collide
  const rename = new Map(res.parts.map((q) => [q.id, `${id}.${q.id}`.slice(0, 40)]));
  const parts = res.parts.map((q) => ({ ...q, id: rename.get(q.id), ...(q.parent !== undefined ? { parent: rename.get(q.parent) } : {}) }));
  if (res.scatterMany) {
    // one root group per template
    res.scatterMany.forEach((sc, i) => extraScatter.push({ part: rename.get(sc.part), count: sc.count, area: call.scatter?.area ?? sc.area, ...((call.scatter?.avoid ?? sc.avoid)?.length ? { avoid: call.scatter?.avoid ?? sc.avoid } : {}), seed: (call.seed ?? 0) * 7 + i, jitter: sc.jitter }));
    return parts;
  }
  const sc = res.scatter || call.scatter ? { ...(res.scatter ?? {}), ...(call.scatter ?? {}) } : null;
  if (sc) {
    const roots = parts.filter((q) => q.parent === undefined);
    const single = roots.length === 1 && roots[0].shape === "group";
    extraScatter.push({ part: single ? roots[0].id : id, count: sc.count ?? 20, area: sc.area ?? [-6, -4, 6, 4], ...(sc.avoid?.length ? { avoid: sc.avoid } : {}), seed: sc.seed ?? call.seed ?? 0, jitter: sc.jitter ?? { scale: 0.3, rot: 180 }, ...(sc.y !== undefined ? { y: sc.y } : {}) });
    if (single) return parts;
    return [{ id, shape: "group", pos: [0, 0, 0] }, ...parts.map((q) => (q.parent === undefined ? { ...q, parent: id } : q))];
  }
  // a placed model: one group root carrying pos / rot / scale, the parts hang from it
  const root = { id, shape: "group", pos: call.pos ?? [0, 0, 0] };
  if (call.rot) root.rot = call.rot;
  if (call.scale !== undefined) root.scale = call.scale;
  return [root, ...parts.map((q) => (q.parent === undefined ? { ...q, parent: id } : q))];
}

/**
 * Expand every builder call of `spec.stage` (actors and world parts) into plain parts. Returns {spec, errors}; `spec` is the
 * input object itself when it holds no call, otherwise a copy whose stage is rewritten (the input is never mutated).
 */
export function expandBuilders(raw) {
  const stage = raw?.stage;
  if (!isObj(stage)) return { spec: raw, errors: [] };
  const hasActorCall = Array.isArray(stage.actors) && stage.actors.some((a) => isObj(a) && typeof a.build === "string");
  const hasWorldCall = Array.isArray(stage.world?.parts) && stage.world.parts.some((a) => isObj(a) && typeof a.build === "string");
  if (!hasActorCall && !hasWorldCall) return { spec: raw, errors: [] };
  const errors = [];
  const liquids = [];
  const extraScatter = [];
  const next = { ...stage };
  if (hasActorCall) {
    next.actors = stage.actors.map((a, i) => {
      if (!isObj(a) || typeof a.build !== "string") return a;
      return expandActorCall(a, ["stage", "actors", i], errors, liquids) ?? a;
    });
  }
  if (hasWorldCall) {
    const parts = [];
    stage.world.parts.forEach((p, i) => {
      if (!isObj(p) || typeof p.build !== "string") return parts.push(p);
      parts.push(...expandWorldCall(p, ["stage", "world", "parts", i], errors, extraScatter));
    });
    next.world = { ...stage.world, parts, scatter: [...(stage.world.scatter ?? []), ...extraScatter] };
    if (!next.world.scatter.length) delete next.world.scatter;
  }
  if (liquids.length) next.liquids = [...(stage.liquids ?? []), ...liquids];
  return { spec: { ...raw, stage: next }, errors };
}
