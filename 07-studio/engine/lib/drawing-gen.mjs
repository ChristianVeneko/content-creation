// Drawing generators: small, seeded, parameterized expanders that turn a one-line request ("a lit globe here", "rails
// converging there") into many drawing parts, so an agent can paint a whole lit scene layer without writing 200 parts.
// A data-atlas backdrop layer lists them in `gen`; expandLayer() puts the generated parts under (default) or over the
// layer's own `parts`. Pure and deterministic (same params + seed -> same parts). No Node built-ins.
import { z } from "zod";
import { LAND, LAND_NAMES, PLACES } from "./globe-data.mjs";
import { drawColor } from "./drawing-schema.mjs";

const r1 = (x) => Math.round(x * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
/** mulberry32 */
function rng(seed) {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pt = z.tuple([z.number().min(-4000).max(4000), z.number().min(-4000).max(4000)]);
const box = z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]);
const color = drawColor;
const lonlat = z.union([z.enum(Object.keys(PLACES)), z.tuple([z.number().min(-360).max(360), z.number().min(-90).max(90)])]);
const ll = (v) => (typeof v === "string" ? PLACES[v] : v);

const common = {
  id: z.string().min(1).max(24).optional().describe("Prefix of the generated part ids (default: the kind)"),
  seed: z.number().int().min(0).max(100000).default(1),
  over: z.boolean().optional().describe("Draw over the layer's own parts instead of under them"),
};
const FULL = [0, 0, 540, 960];

// ---------------- starfield ----------------
const starfield = z.object({
  kind: z.literal("starfield"),
  ...common,
  box: box.default(FULL),
  count: z.number().int().min(10).max(900).default(260),
  color: color.default("text"),
  twinkle: z.number().int().min(0).max(12).default(6).describe("How many stars pulse"),
  nebula: color.optional().describe("Soft colored cloud behind the stars"),
}).strict();
function genStarfield(g, ctx) {
  const R = rng(g.seed * 31 + 7);
  const [bx, by, bw, bh] = g.box;
  const out = [];
  if (g.nebula) {
    for (let i = 0; i < 3; i++) out.push({ id: `${ctx.id}-neb${i}`, shape: "ellipse", cx: r1(bx + bw * (0.2 + R() * 0.6)), cy: r1(by + bh * (0.1 + R() * 0.5)), rx: r1(bw * (0.35 + R() * 0.3)), ry: r1(bh * (0.08 + R() * 0.08)), rot: r1(-35 + R() * 70), fill: g.nebula, opacity: r1((0.2 + R() * 0.12) * 100) / 100, blur: 40, blend: "screen" });
  }
  const sizes = [[0.55, 0.62, 0.55], [1.0, 0.28, 0.8], [1.7, 0.1, 1]];
  const classes = sizes.map(() => []);
  const tw = [];
  for (let i = 0; i < g.count; i++) {
    const x = r1(bx + R() * bw);
    const y = r1(by + R() * bh);
    const u = R();
    const c = u < sizes[0][1] ? 0 : u < sizes[0][1] + sizes[1][1] ? 1 : 2;
    classes[c].push(`M${x} ${y}h0.01`);
    if (tw.length < g.twinkle && c > 0) tw.push([x, y]);
  }
  classes.forEach((pts, i) => pts.length && out.push({ id: `${ctx.id}-st${i}`, shape: "path", d: pts.join(""), stroke: g.color, width: sizes[i][0] * 2, opacity: sizes[i][2] }));
  tw.forEach(([x, y], i) => out.push({ id: `${ctx.id}-tw${i}`, shape: "path", d: `M${x} ${y}h0.01`, stroke: g.color, width: 3.2, keys: [{ at: i * 0.37, opacity: 0.15 }, { at: 1.1 + i * 0.37, opacity: 1 }, { at: 2.4 + i * 0.37, opacity: 0.15 }] }));
  return out;
}

// ---------------- globe ----------------
const globe = z.object({
  kind: z.literal("globe"),
  ...common,
  cx: z.number().default(270),
  cy: z.number().default(430),
  r: z.number().min(40).max(1200).default(230),
  lon: z.number().min(-360).max(360).default(-30).describe("Longitude facing the camera"),
  lat: z.number().min(-80).max(80).default(20).describe("Latitude facing the camera (tilt)"),
  light: z.number().min(-360).max(360).default(-35).describe("Direction the sun comes from, degrees (0 = from the right, -90 = from above, 180 = from the left)"),
  ocean: z.tuple([color, color]).default(["#3D8BE0", "#071C4A"]).describe("Lit and shaded ocean"),
  land: z.tuple([color, color]).default(["#8FB04E", "#2F5A2A"]).describe("Lit and shaded land"),
  atmosphere: color.default("#6FB6FF"),
  tint: z.partialRecord(z.enum(LAND_NAMES), color).optional().describe(`Land colors by landmass: ${LAND_NAMES.join(", ")}`),
  pins: z.array(z.object({ at: lonlat, color: color.optional() }).strict()).max(12).optional().describe("Glowing points at a place name or [lon, lat]"),
  arcs: z.array(z.object({ from: lonlat, to: lonlat, color: color.optional(), lift: z.number().min(0).max(0.6).default(0.18), at: z.union([z.number().min(0).max(60), z.string()]).optional().describe("When the arc draws itself") }).strict()).max(6).optional().describe("Glowing great-circle routes"),
}).strict();

/** Orthographic projection of lon/lat (degrees) with the view centered on (lon0, lat0): x, y in unit-sphere space (y down) and z (depth toward the camera). */
export function projectLL(lon, lat, lon0, lat0, h = 1) {
  const la = rad(lat);
  const dl = rad(lon - lon0);
  const a0 = rad(lat0);
  return {
    x: h * Math.cos(la) * Math.sin(dl),
    y: -h * (Math.cos(a0) * Math.sin(la) - Math.sin(a0) * Math.cos(la) * Math.cos(dl)),
    z: h * (Math.sin(a0) * Math.sin(la) + Math.cos(a0) * Math.cos(la) * Math.cos(dl)),
  };
}
/** A landmass ring projected on the visible hemisphere: edges are densified and far-side points slide onto the limb; null when fully hidden. */
export function projectRing(ring, lon0, lat0, cx, cy, R) {
  const pts = [];
  let any = false;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let s = 0; s < steps; s++) {
      const p = projectLL(lerp(a[0], b[0], s / steps), lerp(a[1], b[1], s / steps), lon0, lat0);
      let { x, y } = p;
      if (p.z >= 0) any = true;
      else {
        const m = Math.hypot(x, y) || 1;
        x /= m;
        y /= m;
      }
      pts.push([cx + x * R, cy + y * R]);
    }
  }
  return any ? pts : null;
}
const pathOf = (pts, close = true) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}${close ? "Z" : ""}`;
const sph = ([lon, lat]) => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))];
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

function genGlobe(g, ctx) {
  const { cx, cy, r: R } = g;
  const id = ctx.id;
  const out = [];
  out.push({ id: `${id}-halo`, shape: "circle", cx, cy, r: r1(R * 1.07), fill: g.atmosphere, opacity: 0.5, blur: r1(R * 0.09), blend: "screen" });
  out.push({ id: `${id}-ocean`, shape: "circle", cx, cy, r: R, fill: { gradient: [g.ocean[0], g.ocean[1]], radial: true } });
  for (const name of LAND_NAMES) {
    const pts = projectRing(LAND[name], g.lon, g.lat, cx, cy, R);
    if (!pts) continue;
    const tint = g.tint?.[name];
    out.push({ id: `${id}-${name}`, shape: "path", d: pathOf(pts), fill: tint ? { gradient: [tint, tint], angle: 90 } : { gradient: [g.land[0], g.land[1]], angle: 60 }, texture: "mottle", opacity: 0.96 });
  }
  // night side: a dark crescent built for light from the left, rotated opposite the real light, with a soft edge
  const dd = 0.45 * R;
  const r2 = 1.25 * R;
  const x0 = (r2 * r2 - R * R - dd * dd) / (2 * dd);
  const y0 = Math.sqrt(Math.max(0, R * R - x0 * x0));
  out.push({
    id: `${id}-night`,
    shape: "path",
    d: `M${r1(cx + x0)} ${r1(cy - y0)}A${R} ${R} 0 0 1 ${r1(cx + x0)} ${r1(cy + y0)}A${r1(r2)} ${r1(r2)} 0 0 0 ${r1(cx + x0)} ${r1(cy - y0)}Z`,
    fill: { gradient: ["#02051400", "#020514D8"], angle: 0 },
    origin: [cx, cy],
    rot: wrap180(g.light - 180),
    blur: 3,
  });
  const L = rad(g.light);
  out.push({ id: `${id}-spec`, shape: "ellipse", cx: r1(cx + Math.cos(L) * R * 0.45), cy: r1(cy + Math.sin(L) * R * 0.45), rx: r1(R * 0.34), ry: r1(R * 0.2), rot: wrap180(g.light + 90), fill: "#FFFFFF", opacity: 0.12, blur: r1(R * 0.08), blend: "screen" });
  const a0 = L - rad(75);
  const a1 = L + rad(75);
  out.push({ id: `${id}-rim`, shape: "path", d: `M${r1(cx + Math.cos(a0) * R)} ${r1(cy + Math.sin(a0) * R)}A${R} ${R} 0 0 1 ${r1(cx + Math.cos(a1) * R)} ${r1(cy + Math.sin(a1) * R)}`, fill: "none", stroke: g.atmosphere, width: r1(R * 0.018), opacity: 0.85, blur: 1.5, blend: "screen" });
  out.push({ id: `${id}-limb`, shape: "circle", cx, cy, r: R, fill: "none", stroke: g.atmosphere, width: r1(R * 0.012), opacity: 0.3 });
  (g.pins ?? []).forEach((p, i) => {
    const q = projectLL(...ll(p.at), g.lon, g.lat);
    if (q.z < 0.04) return;
    const x = r1(cx + q.x * R);
    const y = r1(cy + q.y * R);
    out.push({ id: `${id}-pin${i}g`, shape: "circle", cx: x, cy: y, r: r1(R * 0.05), fill: p.color ?? "accent2", opacity: 0.8, blur: r1(R * 0.025), blend: "screen", motion: [{ type: "pulse", amp: 0.3 }] });
    out.push({ id: `${id}-pin${i}`, shape: "circle", cx: x, cy: y, r: r1(R * 0.011), fill: "#FFFFFF" });
  });
  (g.arcs ?? []).forEach((a, i) => {
    const f = sph(ll(a.from));
    const t = sph(ll(a.to));
    const om = Math.acos(Math.max(-1, Math.min(1, f[0] * t[0] + f[1] * t[1] + f[2] * t[2])));
    const segs = [];
    let cur = [];
    const N = 48;
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const w0 = Math.sin((1 - u) * om) / (Math.sin(om) || 1);
      const w1 = Math.sin(u * om) / (Math.sin(om) || 1);
      const v = [0, 1, 2].map((j) => f[j] * w0 + t[j] * w1);
      const lon = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
      const lat = (Math.asin(Math.max(-1, Math.min(1, v[2]))) * 180) / Math.PI;
      const p = projectLL(lon, lat, g.lon, g.lat, 1 + a.lift * Math.sin(Math.PI * u));
      const vis = projectLL(lon, lat, g.lon, g.lat, 1).z > 0.02 || Math.hypot(p.x, p.y) > 1.0;
      if (vis) cur.push([cx + p.x * R, cy + p.y * R]);
      else if (cur.length) (segs.push(cur), (cur = []));
    }
    if (cur.length) segs.push(cur);
    const d = segs.filter((s) => s.length > 1).map((s) => pathOf(s, false)).join("");
    if (!d) return;
    const at = a.at ?? 0.4;
    out.push({ id: `${id}-arc${i}g`, shape: "path", d, fill: "none", stroke: a.color ?? "accent2", width: r1(R * 0.03), opacity: 0.75, blur: r1(R * 0.02), blend: "screen", draw: true, at });
    out.push({ id: `${id}-arc${i}`, shape: "path", d, fill: "none", stroke: "#FFFFFF", width: r1(R * 0.009), draw: true, at });
  });
  return out;
}

// ---------------- terrain (ridge silhouettes) ----------------
const terrain = z.object({
  kind: z.literal("terrain"),
  ...common,
  y: z.number().default(560).describe("Baseline of the farthest ridge"),
  bottom: z.number().default(960),
  x: z.tuple([z.number(), z.number()]).default([-20, 560]),
  layers: z.number().int().min(1).max(6).default(4),
  amp: z.number().min(2).max(500).default(90),
  step: z.number().min(0).max(300).default(46).describe("How far each nearer ridge sits below the previous one"),
  rough: z.number().min(0.2).max(0.9).default(0.55),
  colors: z.array(color).min(1).max(6).default(["#2A3558", "#141B33"]).describe("Far to near: one per layer (the last repeats)"),
  rim: color.optional().describe("Thin rim light along every ridge"),
  haze: color.optional().describe("Soft haze band in front of every ridge but the first"),
}).strict();
function ridge(R, n, rough) {
  let h = [R(), R()];
  let step = 1;
  while (h.length - 1 < n) {
    const next = [];
    for (let i = 0; i < h.length - 1; i++) next.push(h[i], (h[i] + h[i + 1]) / 2 + (R() - 0.5) * step);
    next.push(h[h.length - 1]);
    h = next;
    step *= rough;
  }
  return h;
}
function genTerrain(g, ctx) {
  const R = rng(g.seed * 17 + 3);
  const out = [];
  for (let i = 0; i < g.layers; i++) {
    const hs = ridge(R, 64, g.rough);
    const base = g.y + i * g.step;
    const amp = g.amp * (1 - i * 0.12);
    const pts = hs.map((v, k) => [lerp(g.x[0], g.x[1], k / (hs.length - 1)), base - (v - 0.2) * amp]);
    if (g.haze && i > 0) out.push({ id: `${ctx.id}-haze${i}`, shape: "rect", x: g.x[0], y: r1(base - amp * 0.7), w: g.x[1] - g.x[0], h: r1(amp * 0.9), fill: g.haze, opacity: 0.18, blur: 14, blend: "screen" });
    out.push({ id: `${ctx.id}-ridge${i}`, shape: "path", d: `${pathOf(pts, false)}L${g.x[1]} ${g.bottom}L${g.x[0]} ${g.bottom}Z`, fill: g.colors[Math.min(i, g.colors.length - 1)] });
    if (g.rim) out.push({ id: `${ctx.id}-rim${i}`, shape: "path", d: pathOf(pts, false), fill: "none", stroke: g.rim, width: 1.1, opacity: 0.55 });
  }
  return out;
}

// ---------------- rails (perspective track) ----------------
const rails = z.object({
  kind: z.literal("rails"),
  ...common,
  vp: pt.default([270, 470]).describe("Vanishing point"),
  baseY: z.number().default(980),
  baseX: z.number().default(270).describe("Where the track center meets baseY"),
  gauge: z.number().min(10).max(600).default(120).describe("Half the rail spacing at baseY"),
  sleepers: z.number().int().min(6).max(40).default(26),
  ballast: z.tuple([color, color]).default(["#4A4438", "#1E1B17"]).describe("Near and far"),
  wood: color.default("#2B1D12"),
  steel: color.default("#B7BEC9"),
  shine: color.optional().describe("Light reflected along the rails (a low sun)"),
  bend: z.number().min(-200).max(200).default(0).describe("Sideways bend of the track toward the horizon"),
}).strict();
function genRails(g, ctx) {
  const [vx, vy] = g.vp;
  const H = g.baseY - vy;
  const cxAt = (k) => vx + (g.baseX - vx) * k + g.bend * (1 - k) * k * 2.2;
  const at = (k, half) => [r1(cxAt(k) + half * k), r1(vy + H * k)];
  const out = [];
  const bw = g.gauge * 2.1;
  const wide = [at(0.01, -bw), at(0.01, bw), at(1.15, bw), at(1.15, -bw)];
  out.push({ id: `${ctx.id}-ballast`, shape: "polygon", points: wide, fill: { gradient: [g.ballast[1], g.ballast[0]], angle: 90 } });
  out.push({ id: `${ctx.id}-grit`, shape: "polygon", points: wide, fill: "#000000", texture: "grain", opacity: 0.5 });
  Array.from({ length: g.sleepers }, (_, i) => 1 / (1 + 0.24 * i))
    .filter((k) => k > 0.03)
    .forEach((k, i) => {
      const half = g.gauge * 1.5;
      const kn = k + (0.012 + 0.07 * k) * 0.6;
      out.push({ id: `${ctx.id}-sl${i}`, shape: "polygon", points: [at(k, -half), at(k, half), at(kn, half), at(kn, -half)], fill: g.wood, opacity: r1((0.5 + 0.5 * k) * 100) / 100 });
    });
  for (const s of [-1, 1]) {
    const w = 0.06 * g.gauge;
    out.push({ id: `${ctx.id}-rail${s > 0 ? "r" : "l"}`, shape: "polygon", points: [at(0.01, s * g.gauge - w * 0.3), at(0.01, s * g.gauge + w * 0.3), at(1.15, s * g.gauge + w), at(1.15, s * g.gauge - w)], fill: g.steel });
    if (g.shine) out.push({ id: `${ctx.id}-shine${s > 0 ? "r" : "l"}`, shape: "line", points: [at(0.03, s * g.gauge), at(1.15, s * g.gauge)], stroke: g.shine, width: 2.4, opacity: 0.85, blur: 1.2, blend: "screen" });
  }
  return out;
}

// ---------------- grain-field (wheat / crop rows in perspective) ----------------
const grainField = z.object({
  kind: z.literal("grain-field"),
  ...common,
  horizon: z.number().default(520),
  bottom: z.number().default(980),
  rows: z.number().int().min(3).max(14).default(9),
  stalks: z.number().int().min(10).max(120).default(46).describe("Stalks in the nearest row (times ~1.6)"),
  height: z.number().min(10).max(500).default(150).describe("Stalk height of the nearest row"),
  stalk: z.tuple([color, color]).default(["#8A6A2A", "#D9A441"]).describe("Far and near stalk color"),
  head: z.tuple([color, color]).default(["#C99A3A", "#FFD46A"]).describe("Far and near ear color"),
  soil: color.default("#3A2A10"),
  sway: z.number().min(0).max(8).default(1.6),
}).strict();
function genGrain(g, ctx) {
  const R = rng(g.seed * 13 + 5);
  const out = [];
  for (let j = 0; j < g.rows; j++) {
    const k = (j + 1) / g.rows; // far .. near
    const y = g.horizon + (g.bottom - g.horizon) * Math.pow(k, 1.7);
    const s = 0.22 + 0.95 * k;
    const n = Math.round(g.stalks * (0.35 + 0.65 * k) * 1.6);
    const h = g.height * s;
    let st = "";
    let hd = "";
    for (let i = 0; i < n; i++) {
      const x = r1(-30 + R() * 600);
      const lean = (R() - 0.5) * 24 * s + 4 * s;
      const hh = h * (0.8 + R() * 0.4);
      const tx = r1(x + lean);
      const ty = r1(y - hh);
      st += `M${x} ${r1(y)}Q${r1(x + lean * 0.2)} ${r1(y - hh * 0.6)} ${tx} ${ty}`;
      hd += `M${tx} ${ty}l${r1(lean * 0.3)} ${r1(-13 * s)}`;
    }
    const motion = g.sway ? [{ type: "sway", amp: r1(g.sway * (0.5 + k * 0.6)), speed: r1((0.6 + R() * 0.4) * 100) / 100 }] : undefined;
    out.push({ id: `${ctx.id}-fill${j}`, shape: "rect", x: -20, y: r1(y - 2), w: 580, h: r1(g.bottom - y + 30), fill: g.soil, opacity: 0.92 });
    out.push({ id: `${ctx.id}-stalk${j}`, shape: "path", d: st, fill: "none", stroke: k < 0.5 ? g.stalk[0] : g.stalk[1], width: r1(0.9 + 1.6 * s), opacity: r1((0.55 + 0.45 * k) * 100) / 100, origin: [270, r1(y)], motion });
    out.push({ id: `${ctx.id}-ear${j}`, shape: "path", d: hd, fill: "none", stroke: k < 0.5 ? g.head[0] : g.head[1], width: r1(2.2 + 4.2 * s), opacity: r1((0.6 + 0.4 * k) * 100) / 100, origin: [270, r1(y)], motion });
  }
  return out;
}

// ---------------- water (night sea with a moon path) ----------------
const water = z.object({
  kind: z.literal("water"),
  ...common,
  horizon: z.number().default(560),
  bottom: z.number().default(980),
  colors: z.tuple([color, color]).default(["#16315E", "#050B1E"]).describe("At the horizon and at the camera"),
  light: z.number().min(-40).max(580).default(150).describe("x of the moon / sun path on the water"),
  glint: color.default("#DCEBFF"),
  glints: z.number().int().min(10).max(260).default(140),
}).strict();
function genWater(g, ctx) {
  const R = rng(g.seed * 19 + 11);
  const H = g.bottom - g.horizon;
  let d = "";
  let dim = "";
  for (let i = 0; i < g.glints; i++) {
    const k = Math.pow(R(), 1.8);
    const y = r1(g.horizon + 3 + H * k);
    const spread = 14 + 150 * k;
    const x = r1(g.light + (R() - 0.5) * 2 * spread * (R() < 0.8 ? 0.7 : 2));
    const w = r1(5 + 38 * k * (0.4 + R()));
    d += `M${r1(x - w / 2)} ${y}h${w}`;
    if (i % 3 === 0) dim += `M${r1(R() * 540)} ${y}h${r1(8 + 40 * k)}`;
  }
  return [
    { id: `${ctx.id}-sea`, shape: "rect", x: -20, y: g.horizon, w: 580, h: H + 20, fill: { gradient: [g.colors[0], g.colors[1]], angle: 90 } },
    { id: `${ctx.id}-sheen`, shape: "ellipse", cx: g.light, cy: r1(g.horizon + H * 0.3), rx: 70, ry: r1(H * 0.38), fill: g.glint, opacity: 0.12, blur: 30, blend: "screen" },
    { id: `${ctx.id}-dim`, shape: "path", d: dim, fill: "none", stroke: g.glint, width: 1.1, opacity: 0.18 },
    { id: `${ctx.id}-glint`, shape: "path", d, fill: "none", stroke: g.glint, width: 1.6, opacity: 0.7, motion: [{ type: "float", amp: 1.2, speed: 0.5 }] },
    { id: `${ctx.id}-edge`, shape: "line", x1: -20, y1: g.horizon, x2: 560, y2: g.horizon, stroke: g.glint, width: 1, opacity: 0.25 },
  ];
}

// ---------------- sky (gradient, sun or moon, clouds) ----------------
const sky = z.object({
  kind: z.literal("sky"),
  ...common,
  horizon: z.number().default(560),
  colors: z.array(color).min(2).max(4).default(["#0B1030", "#4A2A5E", "#E5703A", "#FFC070"]).describe("Top to horizon"),
  sun: z.object({ x: z.number(), y: z.number(), r: z.number().min(2).max(300).default(26), color: color.default("#FFE9B0"), glow: color.optional() }).strict().optional(),
  clouds: z.number().int().min(0).max(14).default(0),
  cloud: color.default("#FFB48A"),
}).strict();
function genSky(g, ctx) {
  const R = rng(g.seed * 23 + 1);
  const out = [{ id: `${ctx.id}-sky`, shape: "rect", x: -20, y: -20, w: 580, h: g.horizon + 60, fill: { gradient: g.colors, angle: 90 } }];
  if (g.sun) {
    const glow = g.sun.glow ?? g.sun.color;
    out.push({ id: `${ctx.id}-bloom`, shape: "circle", cx: g.sun.x, cy: g.sun.y, r: r1(g.sun.r * 7), fill: glow, opacity: 0.28, blur: r1(g.sun.r * 3), blend: "screen" });
    out.push({ id: `${ctx.id}-halo`, shape: "circle", cx: g.sun.x, cy: g.sun.y, r: r1(g.sun.r * 2.4), fill: glow, opacity: 0.5, blur: r1(g.sun.r * 0.9), blend: "screen" });
    out.push({ id: `${ctx.id}-sun`, shape: "circle", cx: g.sun.x, cy: g.sun.y, r: g.sun.r, fill: g.sun.color });
  }
  for (let i = 0; i < g.clouds; i++) {
    out.push({ id: `${ctx.id}-cl${i}`, shape: "ellipse", cx: r1(R() * 540), cy: r1(g.horizon * (0.25 + R() * 0.65)), rx: r1(60 + R() * 130), ry: r1(5 + R() * 9), fill: g.cloud, opacity: r1((0.22 + R() * 0.3) * 100) / 100, blur: 6, motion: [{ type: "float", amp: r1(6 + R() * 8), speed: 0.15 }] });
  }
  return out;
}

// ---------------- surface (wood desk, cracked earth, stained paper...) ----------------
const surface = z.object({
  kind: z.literal("surface"),
  ...common,
  box: box.default(FULL),
  preset: z.enum(["wood", "cracked-earth", "paper", "stone"]).default("wood"),
  colors: z.tuple([color, color]).optional().describe("Lit and shaded color (defaults per preset)"),
  light: pt.optional().describe("Center [x, y] of a warm pool of light on the surface"),
  lightColor: color.default("#FFC27A"),
}).strict();
const SURF = {
  wood: { colors: ["#6B4426", "#1D120A"], tex: ["wood", "mottle"], seams: true },
  "cracked-earth": { colors: ["#8A5A2B", "#2A170B"], tex: ["mottle", "cracks"], seams: false },
  paper: { colors: ["#E9DDBC", "#BFAE82"], tex: ["mottle", "fibers"], seams: false },
  stone: { colors: ["#5A5F6A", "#1A1D24"], tex: ["mottle", "grain"], seams: false },
};
function genSurface(g, ctx) {
  const S = SURF[g.preset];
  const [bx, by, bw, bh] = g.box;
  const c = g.colors ?? S.colors;
  const rect = (id, props) => ({ id: `${ctx.id}-${id}`, shape: "rect", x: bx, y: by, w: bw, h: bh, ...props });
  const out = [rect("base", { fill: { gradient: [c[0], c[1]], angle: 90 } })];
  if (S.tex.includes("wood")) out.push(rect("grain", { fill: c[0], texture: "wood", opacity: 0.9 }));
  if (S.tex.includes("mottle")) out.push(rect("mottle", { fill: "#FFFFFF", texture: "mottle", opacity: 0.18, blend: "overlay" }));
  if (S.tex.includes("cracks")) out.push(rect("cracks", { fill: "#0A0502", texture: "cracks", opacity: 0.85 }));
  if (S.tex.includes("fibers")) out.push(rect("fibers", { fill: c[1], texture: "fibers", opacity: 0.5 }));
  if (S.tex.includes("grain")) out.push(rect("grit", { fill: "#FFFFFF", texture: "grain", opacity: 0.22 }));
  if (S.seams) {
    let d = "";
    for (let i = 1; i < 5; i++) d += `M${bx} ${r1(by + (bh * i) / 5)}h${bw}`;
    out.push({ id: `${ctx.id}-seams`, shape: "path", d, fill: "none", stroke: "#0A0502", width: 2.4, opacity: 0.55 });
  }
  if (g.light) out.push({ id: `${ctx.id}-pool`, shape: "ellipse", cx: g.light[0], cy: g.light[1], rx: r1(bw * 0.55), ry: r1(bh * 0.28), fill: g.lightColor, opacity: 0.28, blur: 36, blend: "screen" });
  out.push(rect("vig", { fill: { gradient: ["#00000000", "#000000AA"], radial: true } }));
  return out;
}

// ---------------- map (flat landmasses with a graticule) ----------------
const map = z.object({
  kind: z.literal("map"),
  ...common,
  box: box.default(FULL).describe("Where the map is drawn [x, y, w, h]"),
  lon: z.tuple([z.number(), z.number()]).default([-170, -50]).describe("Longitude range shown, west to east"),
  lat: z.tuple([z.number(), z.number()]).default([8, 75]).describe("Latitude range shown, south to north"),
  fill: z.tuple([color, color]).default(["#1D2C52", "#0E1730"]).describe("Land color, lit and shaded"),
  sea: color.optional().describe("Fill the whole box with this sea color first"),
  edge: color.default("#5B8CFF").describe("Coast glow and graticule color"),
  graticule: z.number().min(0).max(30).default(10).describe("Degrees between graticule lines (0 = none)"),
}).strict();
/** Position of a [lon, lat] (or place name) on a `map` generator's box. */
export function mapPoint(g, at) {
  const [lon, lat] = ll(at);
  const [bx, by, bw, bh] = g.box ?? FULL;
  const [l0, l1] = g.lon ?? [-170, -50];
  const [a0, a1] = g.lat ?? [8, 75];
  return [r1(bx + ((lon - l0) / (l1 - l0)) * bw), r1(by + ((a1 - lat) / (a1 - a0)) * bh)];
}
function genMap(g, ctx) {
  const [bx, by, bw, bh] = g.box;
  const out = [];
  if (g.sea) out.push({ id: `${ctx.id}-sea`, shape: "rect", x: bx, y: by, w: bw, h: bh, fill: g.sea });
  if (g.graticule) {
    let d = "";
    for (let lo = Math.ceil(g.lon[0] / g.graticule) * g.graticule; lo <= g.lon[1]; lo += g.graticule) {
      const [x] = mapPoint(g, [lo, g.lat[0]]);
      d += `M${x} ${by}v${bh}`;
    }
    for (let la = Math.ceil(g.lat[0] / g.graticule) * g.graticule; la <= g.lat[1]; la += g.graticule) {
      const [, y] = mapPoint(g, [g.lon[0], la]);
      d += `M${bx} ${y}h${bw}`;
    }
    out.push({ id: `${ctx.id}-grid`, shape: "path", d, fill: "none", stroke: g.edge, width: 0.8, opacity: 0.22 });
  }
  // landmasses are not clipped to the box: they run off the frame like a map that continues past its edges
  for (const name of LAND_NAMES) {
    const ring = LAND[name].map((p) => mapPoint(g, p));
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    if (Math.max(...xs) - Math.min(...xs) < 1 || Math.max(...ys) - Math.min(...ys) < 1) continue;
    const d = pathOf(ring);
    out.push({ id: `${ctx.id}-${name}-glow`, shape: "path", d, fill: "none", stroke: g.edge, width: 6, opacity: 0.35, blur: 5, blend: "screen" });
    out.push({ id: `${ctx.id}-${name}`, shape: "path", d, fill: { gradient: g.fill, angle: 70 }, stroke: g.edge, width: 1.4, texture: "mottle" });
  }
  return out;
}

export const GENERATORS = {
  starfield: { schema: starfield, expand: genStarfield, about: "scattered stars in three sizes, a few that twinkle, optional nebula clouds" },
  globe: { schema: globe, expand: genGlobe, about: "a lit sphere with real continent silhouettes, a terminator shadow, rim light, glowing pins and great-circle route arcs" },
  terrain: { schema: terrain, expand: genTerrain, about: "layered ridge silhouettes fading into haze (mountains, dunes, hills) with optional rim light" },
  rails: { schema: rails, expand: genRails, about: "railway track in perspective: ballast, sleepers, converging rails with an optional sun glint" },
  "grain-field": { schema: grainField, expand: genGrain, about: "wheat or crop rows in perspective, thousands of swaying stalks and ears from ~30 parts" },
  water: { schema: water, expand: genWater, about: "a sea with a horizon line, a moon or sun path of glints and faint wave marks" },
  sky: { schema: sky, expand: genSky, about: "gradient sky with an optional glowing sun or moon and drifting cloud streaks" },
  map: { schema: map, expand: genMap, about: "flat landmass silhouettes with a graticule and a glowing coast, for particle maps and routes (mapPoint() gives positions)" },
  surface: { schema: surface, expand: genSurface, about: "a textured plane: dark wood desk, cracked earth, stained paper or stone, with a pool of light and a vignette" },
};
export const GEN_KINDS = Object.keys(GENERATORS);
/** Schema of one generator request: a union on `kind`. */
export const genSchema = z.discriminatedUnion("kind", GEN_KINDS.map((k) => GENERATORS[k].schema));

/** Parts a generator request expands to (ids prefixed with its `id`). */
export function expandGen(g) {
  const spec = GENERATORS[g.kind];
  if (!spec) return [];
  const parsed = spec.schema.parse(g);
  return spec.expand(parsed, { id: parsed.id ?? parsed.kind });
}

/** A backdrop layer with its generators expanded: generated parts first (under), then the layer's own parts, then `over` generators. */
export function expandLayer(layer) {
  const under = [];
  const over = [];
  for (const g of layer.gen ?? []) (g.over ? over : under).push(...expandGen(g));
  return { ...layer, parts: [...under, ...(layer.parts ?? []), ...over] };
}
