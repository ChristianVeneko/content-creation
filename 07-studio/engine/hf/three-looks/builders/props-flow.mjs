// Procedural flow and mechanism props: pipes, elbow, valve, pipe system, funnel, conveyor, gears, cloud, chart bars.
import { P, GLOW, around, clampN, lerp } from "./helpers.mjs";

const flange = (id, x, y, parent) => P(id, "cylinder", [0.31, 0.31, 0.12], [x, y, 0], { rot: [0, 0, 90], role: "metal", parent });
const heatState = { heat: { color: "#e5574f" } };

export function pipe(c) {
  const len = clampN(c.p.length, 0.8, 4, 2.4), h = len / 2;
  const parts = [
    P("tube", "cylinder", [0.22, len], [0, 0.5, 0], { rot: [0, 0, 90], role: "accent", states: { ...heatState, glow: { emissive: 0.6 }, fill: { emissive: 1.1, color: "#8fe0ff" } } }),
    flange("flangeA", -h + 0.06, 0.5), flange("flangeB", h - 0.06, 0.5),
    ...[-h + 0.06, h - 0.06].flatMap((x, i) => around(4, 0.26, (k, a, y, z) => P(`bolt${i}${k}`, "sphere", [0.04], [x + (i ? -0.07 : 0.07), 0.5 + y, z], { role: "dark" }), 45)),
    ...[-h * 0.55, h * 0.55].map((x, i) => P(`leg${i}`, "box", [0.16, 0.42, 0.34], [x, 0.21, 0], { radius: 0.04, role: "dark" })),
  ];
  return { parts, init: { fill: 0 } };
}

export function elbow(c) {
  const R = 0.8;
  const pts = [[-1.2, 0.5, 0], [-0.5, 0.5, 0]];
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push([-0.5 + Math.sin(a) * R, 0.5 + (1 - Math.cos(a)) * R, 0]); }
  pts.push([0.3, 1.9, 0]);
  const parts = [
    P("tube", "tube", [0.22], [0, 0, 0], { points: pts, role: "accent", states: { ...heatState, glow: { emissive: 0.6 } } }),
    P("flangeA", "cylinder", [0.31, 0.31, 0.12], [-1.2, 0.5, 0], { rot: [0, 0, 90], role: "metal" }),
    P("flangeB", "cylinder", [0.31, 0.31, 0.12], [0.3, 1.9, 0], { role: "metal" }),
    P("joint", "sphere", [0.27], [0.3, 1.3, 0], { role: "metal", scale: [1, 0.35, 1] }),
    P("foot", "box", [0.5, 0.42, 0.45], [-0.8, 0.21, 0], { radius: 0.05, role: "dark" }),
  ];
  return { parts, init: {} };
}

export function valve(c) {
  const parts = [
    P("pipe", "cylinder", [0.22, 2.0], [0, 0.55, 0], { rot: [0, 0, 90], role: "accent", states: heatState }),
    P("flangeA", "cylinder", [0.3, 0.3, 0.12], [-0.95, 0.55, 0], { rot: [0, 0, 90], role: "metal" }),
    P("flangeB", "cylinder", [0.3, 0.3, 0.12], [0.95, 0.55, 0], { rot: [0, 0, 90], role: "metal" }),
    P("bodyV", "sphere", [0.44], [0, 0.55, 0], { role: "metal", states: heatState }),
    P("stem", "cylinder", [0.08, 0.08, 0.6], [0, 1.12, 0], { role: "dark" }),
    P("wheel", "group", null, [0, 1.46, 0], { states: { spin: { rot: [0, 360, 0] }, open: { rot: [0, 270, 0] } } }),
    P("rimW", "torus", [0.36, 0.055], [0, 0, 0], { parent: "wheel", rot: [90, 0, 0], role: "accent", emissive: 0, states: { glow: { emissive: 1 } } }),
    ...[0, 60, 120].map((a, i) => P(`spoke${i}`, "box", [0.74, 0.07, 0.07], [0, 0, 0], { parent: "wheel", rot: [0, a, 0], role: "accent" })),
    P("hub", "sphere", [0.09], [0, 0.03, 0], { parent: "wheel", role: "dark" }),
    P("foot", "box", [0.5, 0.2, 0.5], [0, 0.1, 0], { radius: 0.05, role: "dark" }),
  ];
  return { parts, init: {} };
}

export function funnel(c) {
  const parts = [
    P("cone", "lathe", null, [0, 0.35, 0], { points: [[0.1, 0], [0.1, 0.5], [0.45, 0.78], [0.95, 1.4], [0.98, 1.44]], role: "metal", material: "metal", states: { heat: { color: "#e5574f" } } }),
    P("lip", "torus", [0.96, 0.07], [0, 1.78, 0], { rot: [90, 0, 0], role: "accent" }),
    P("spout", "cylinder", [0.12, 0.12, 0.3], [0, 0.2, 0], { role: "metal" }),
    ...around(3, 0.62, (i, a, x, z) => P(`leg${i}`, "cylinder", [0.04, 0.9], [x, 0.7, z], { role: "dark", rot: [z * 12, 0, -x * 12] }), 90),
    ...around(3, 0.5, (i, a, x, z) => P(`drop${i}`, "sphere", [0.07, 0.1, 0.07], [x * 0.5, 2.0 + i * 0.25, z * 0.5], { role: "accent", opacity: 0.9, states: { fill: { pos: [0, -0.9, 0], from: i / 5, to: 1 } } }), 40),
  ];
  return { parts, init: { fill: 0 } };
}

export function conveyor(c) {
  const parts = [
    P("belt", "box", [3.4, 0.14, 1.0], [0, 0.62, 0], { radius: 0.06, role: "dark" }),
    P("railF", "box", [3.4, 0.14, 0.1], [0, 0.74, 0.5], { role: "metal" }),
    P("railB", "box", [3.4, 0.14, 0.1], [0, 0.74, -0.5], { role: "metal" }),
    ...[-1.55, -0.78, 0, 0.78, 1.55].map((x, i) => P(`roller${i}`, "cylinder", [0.14, 1.1], [x, 0.62, 0], { rot: [90, 0, 0], role: i % 2 ? "metal" : "light", states: { spin: { rot: [0, 360, 0] }, fill: { rot: [0, 720, 0] } } })),
    ...[-1.4, 1.4].flatMap((x, i) => [0.4, -0.4].map((z, k) => P(`leg${i}${k}`, "box", [0.14, 0.6, 0.14], [x, 0.3, z], { role: "metal" }))),
    ...[0, 1, 2].map((i) => P(`box${i}`, "box", [0.55, 0.45 + (i % 2) * 0.15, 0.55], [-1.2 + i * 0.95, 0.99 + (i % 2) * 0.075, 0], { radius: 0.05, color: ["#d9a05a", "#c88a4a", "#e0b070"][i], states: { fill: { pos: [1.6, 0, 0] } } })),
    P("ctrl", "box", [0.4, 0.5, 0.35], [1.2, 0.3, 0.85], { radius: 0.05, role: "body" }),
    P("lampC", "sphere", [0.09], [1.2, 0.62, 0.85], GLOW({ states: { glow: { emissive: 2 } } })),
  ];
  return { parts, init: { glow: 0.7 } };
}

export function gears(c) {
  const n1 = 12, n2 = 8, n3 = 10;
  const R = (n) => n * 0.06;
  const gear = (id, x, y, n, role, ratio, phase) => {
    const r = R(n), tooth = 360 / n;
    return [
      P(id, "group", null, [x, y, 0.1], { states: { spin: { rot: [0, 0, 360 * ratio] } } }),
      P(`${id}Body`, "cylinder", [r, 0.2], [0, 0, 0], { parent: id, rot: [90, 0, 0], role }),
      P(`${id}Hub`, "cylinder", [r * 0.32, 0.3], [0, 0, 0], { parent: id, rot: [90, 0, 0], role: "metal" }),
      P(`${id}Hole`, "cylinder", [r * 0.12, 0.34], [0, 0, 0], { parent: id, rot: [90, 0, 0], role: "dark" }),
      ...around(n, r + 0.04, (i, a, px, py) => P(`${id}T${i}`, "box", [0.17, 0.2, 0.2], [px, py, 0], { parent: id, rot: [0, 0, a], radius: 0.03, role }), phase),
    ];
  };
  const d1 = R(n1) + R(n2) + 0.1, d2 = R(n2) + R(n3) + 0.1;
  const parts = [
    P("plate", "box", [3.2, 2.6, 0.12], [0.3, 1.45, -0.1], { radius: 0.08, role: "dark" }),
    ...gear("gA", -0.6, 1.7, n1, "accent", 1, 0),
    ...gear("gB", -0.6 + d1, 1.7, n2, "body", -n1 / n2, 180 / n2),
    ...gear("gC", -0.6 + d1 + d2 * 0.6, 1.7 - d2 * 0.8, n3, "light", (n1 / n2) * (n2 / n3), 0),
    P("base", "box", [2.4, 0.2, 0.9], [0.4, 0.1, -0.1], { radius: 0.05, role: "metal" }),
  ];
  return { parts, init: { spin: 0 } };
}

export function cloud(c) {
  const r = c.rnd, parts = [];
  const blobs = [[0, 0.95, 0.55], [-0.75, 0.8, 0.42], [0.8, 0.82, 0.45], [-0.3, 1.25, 0.5], [0.4, 1.2, 0.42], [-1.15, 0.7, 0.3], [1.2, 0.7, 0.32]];
  blobs.forEach(([x, y, s], i) => parts.push(P(`puff${i}`, "sphere", [s + r() * 0.05], [x + (r() - 0.5) * 0.1, y + 0.3, (r() - 0.5) * 0.2], { role: "light", states: { glow: { emissive: 0.5 }, heat: { color: "#c8c8d0" } } })));
  parts.push(P("base", "box", [2.3, 0.45, 0.8], [0, 0.85, 0], { radius: 0.22, role: "light" }));
  parts.push(P("bolt", "extrude", [0.12], [0.1, 0.4, 0.45], { points: [[-0.12, 0.35], [0.2, 0.35], [0.05, 0.05], [0.22, 0.05], [-0.18, -0.35], [-0.04, -0.02], [-0.2, -0.02]], role: "glow", emissive: 1.4, states: { glow: { emissive: 2.4 } } }));
  parts.push(P("eyeL", "sphere", [0.07, 0.09, 0.05], [-0.25, 1.15, 0.82], { role: "dark" }), P("eyeR", "sphere", [0.07, 0.09, 0.05], [0.25, 1.15, 0.82], { role: "dark" }));
  return { parts, init: { glow: 0.4 }, motion: ["float"] };
}

export function chartBars(c) {
  const n = clampN(Math.round(c.p.bars), 3, 7, 5);
  const vals = Array.isArray(c.p.values) && c.p.values.length ? c.p.values.slice(0, 7).map((v) => clampN(v, 0.1, 1, 0.5)) : Array.from({ length: n }, (_, i) => lerp(0.25, 1, i / Math.max(1, n - 1)) * (0.8 + c.rnd() * 0.25));
  const m = vals.length, w = 2.8 / m;
  const cols = ["#6db3a8", "#f2b45a", "#e9806e", "#9a7fb5", "#5a86c9", "#7fbf8a", "#e9a0b4"];
  const parts = [
    P("plate", "box", [3.2, 0.14, 1.2], [0, 0.07, 0], { radius: 0.05, role: "dark" }),
    P("axisY", "box", [0.07, 2.2, 0.07], [-1.5, 1.2, -0.45], { role: "light" }),
    P("axisX", "box", [3.0, 0.07, 0.07], [0, 0.18, -0.45], { role: "light" }),
    ...vals.map((v, i) => {
      const h = Math.min(2.1, 0.4 + v * 1.7);
      return P(`bar${i}`, "box", [w * 0.7, h, 0.7], [-1.4 + w * (i + 0.5) + 0.1, 0.14 + (h * 0.02) / 2, 0], { radius: 0.06, color: cols[i % cols.length], scale: [1, 0.02, 1], states: { fill: { scale: [1, 50, 1], grow: "bottom", from: (i / m) * 0.7, to: (i / m) * 0.7 + 0.3 } } });
    }),
    P("arrow", "extrude", [0.12], [0, 2.3, -0.2], { points: [[-1.2, 0], [0.7, 0.9], [0.55, 1.05], [1.3, 1.12], [1.1, 0.4], [0.95, 0.55], [-1.1, -0.15]].map(([x, y]) => [x * 0.7, y * 0.5 - 0.3]), role: "glow", emissive: 1.1, states: { glow: { emissive: 2.2 }, fill: { scale: 1.0 } } }),
  ];
  return { parts, init: { fill: 0, glow: 0.7 } };
}

export function pipeSystem(c) {
  const parts = [
    P("slab", "box", [4.6, 0.12, 1.8], [0, 0.06, 0], { radius: 0.05, role: "dark" }),
    P("tank", "cylinder", [0.75, 1.9], [-1.7, 1.07, 0], { material: "glass", role: "light", opacity: 0.4 }),
    P("water", "cylinder", [0.68, 1.8], [-1.7, 0.15 + 0.9 * 0.04, 0], { role: "accent", opacity: 0.9, scale: [1, 0.04, 1], states: { fill: { scale: [1, 25, 1], grow: "bottom" }, heat: { color: "#e5574f" } } }),
    P("lidT", "cylinder", [0.8, 0.12], [-1.7, 2.05, 0], { role: "metal" }),
    P("feedA", "cylinder", [0.14, 0.9], [-0.9, 0.62, 0], { rot: [0, 0, 90], role: "metal", states: heatState }),
    P("elbowA", "sphere", [0.24], [-0.45, 0.62, 0], { role: "metal" }),
    P("riser", "cylinder", [0.14, 1.0], [-0.45, 1.1, 0], { role: "metal" }),
    P("elbowB", "sphere", [0.24], [-0.45, 1.6, 0], { role: "metal" }),
    P("top", "cylinder", [0.14, 1.5], [0.3, 1.6, 0], { rot: [0, 0, 90], role: "metal" }),
    P("valveBody", "sphere", [0.32], [0.45, 1.6, 0], { role: "accent" }),
    P("stem", "cylinder", [0.06, 0.06, 0.45], [0.45, 2.0, 0], { role: "dark" }),
    P("wheel", "group", null, [0.45, 2.25, 0], { states: { spin: { rot: [0, 360, 0] }, open: { rot: [0, 270, 0] } } }),
    P("rimW", "torus", [0.3, 0.05], [0, 0, 0], { parent: "wheel", rot: [90, 0, 0], role: "body" }),
    ...[0, 60, 120].map((a, i) => P(`spoke${i}`, "box", [0.6, 0.06, 0.06], [0, 0, 0], { parent: "wheel", rot: [0, a, 0], role: "body" })),
    P("outlet", "cylinder", [0.14, 0.9], [1.25, 1.6, 0], { rot: [0, 0, 90], role: "metal" }),
    P("elbowC", "sphere", [0.24], [1.7, 1.6, 0], { role: "metal" }),
    P("drop", "cylinder", [0.14, 1.0], [1.7, 1.1, 0], { role: "metal" }),
    P("bucket", "cylinder", [0.5, 0.38, 0.55], [1.7, 0.4, 0], { role: "body" }),
    P("bucketFill", "cylinder", [0.44, 0.44, 0.3], [1.7, 0.4 + 0.0, 0], { role: "accent", scale: [1, 0.02, 1], states: { fill: { scale: [1, 40, 1], grow: "bottom", from: 0.3, to: 1 } } }),
  ];
  return { parts, init: { fill: 0.5 } };
}
