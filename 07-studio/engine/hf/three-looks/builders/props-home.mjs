// Procedural set pieces and home props: door, table, shelf, plant, lamp, crate, thermometer.
import { P, GLOW, clampN } from "./helpers.mjs";

export function door(c) {
  const parts = [
    P("frameL", "box", [0.16, 2.3, 0.3], [-0.78, 1.15, 0], { radius: 0.03, role: "dark" }),
    P("frameR", "box", [0.16, 2.3, 0.3], [0.78, 1.15, 0], { radius: 0.03, role: "dark" }),
    P("frameT", "box", [1.72, 0.16, 0.3], [0, 2.3, 0], { radius: 0.03, role: "dark" }),
    P("room", "box", [1.4, 2.2, 0.05], [0, 1.1, -0.1], { role: "glow", emissive: 0.0, states: { open: { emissive: 1.2 } } }),
    P("leaf", "box", [1.4, 2.2, 0.12], [0, 1.1, 0.06], { radius: 0.03, role: "body", pivot: [-0.7, 0, 0], states: { open: { rot: [0, -110, 0] } } }),
    P("panelA", "box", [1.0, 0.8, 0.04], [0, 0.5, 0.07], { parent: "leaf", radius: 0.03, role: "accent" }),
    P("panelB", "box", [1.0, 0.8, 0.04], [0, -0.55, 0.07], { parent: "leaf", radius: 0.03, role: "accent" }),
    P("knob", "sphere", [0.09], [0.5, -0.05, 0.12], { parent: "leaf", role: "metal" }),
    P("step", "box", [1.9, 0.1, 0.8], [0, 0.05, 0.4], { radius: 0.04, role: "metal" }),
  ];
  return { parts, init: { open: 0 } };
}

export function table(c) {
  const h = clampN(c.p.height, 0.5, 1.4, 0.95);
  const parts = [
    P("top", "box", [2.3, 0.16, 1.3], [0, h, 0], { radius: 0.06, role: "body" }),
    P("apron", "box", [2.0, 0.12, 1.0], [0, h - 0.14, 0], { role: "dark" }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => P(`leg${i}`, "cylinder", [0.06, 0.09, h - 0.08], [sx * 0.98, (h - 0.08) / 2, sz * 0.5], { role: "dark" })),
    P("cloth", "box", [1.1, 0.02, 0.7], [0, h + 0.09, 0.05], { radius: 0.01, role: "accent" }),
  ];
  return { parts, init: {} };
}

export function shelf(c) {
  const levels = 3, r = c.rnd;
  const parts = [
    P("sideL", "box", [0.1, 2.3, 0.7], [-0.9, 1.15, 0], { role: "dark" }),
    P("sideR", "box", [0.1, 2.3, 0.7], [0.9, 1.15, 0], { role: "dark" }),
    P("back", "box", [1.9, 2.3, 0.05], [0, 1.15, -0.33], { role: "body" }),
    ...Array.from({ length: levels + 1 }, (_, i) => P(`board${i}`, "box", [1.9, 0.1, 0.7], [0, 0.05 + i * 0.75, 0], { role: "dark" })),
    ...Array.from({ length: levels }, (_, i) => [0, 1, 2].map((k) => {
      const w = 0.4 + r() * 0.25, h = 0.38 + r() * 0.2, idx = i * 3 + k;
      return P(`box${idx}`, "box", [w, h, 0.45], [-0.55 + k * 0.55, 0.1 + i * 0.75 + h / 2 + 0.05, 0.02], { radius: 0.04, color: ["#e9806e", "#6db3a8", "#f2b45a", "#9a7fb5", "#5a86c9", "#7fbf8a", "#e9a0b4", "#d9a05a", "#b5532f"][(idx + c.seed) % 9], scale: 0.01, states: { fill: { scale: 100, from: idx / 9, to: Math.min(1, (idx + 1.2) / 9) } } });
    })).flat(),
  ];
  return { parts, init: { fill: 0.4 } };
}

export function plant(c) {
  const r = c.rnd, n = clampN(Math.round(c.p.leaves), 5, 11, 8);
  const parts = [
    P("pot", "lathe", null, [0, 0, 0], { points: [[0.01, 0], [0.34, 0], [0.5, 0.7], [0.56, 0.72]], role: "accent" }),
    P("soil", "cylinder", [0.52, 0.06], [0, 0.68, 0], { color: "#5a3f2e" }),
    P("stem", "cylinder", [0.05, 0.07, 0.8], [0, 1.05, 0], { color: "#5f9a4e" }),
    ...Array.from({ length: n }, (_, i) => {
      const a = ((360 / n) * i + r() * 20) * (Math.PI / 180), h = 0.95 + (i % 3) * 0.25, d = 0.3 + (i % 2) * 0.1;
      return P(`leaf${i}`, "sphere", [0.13, 0.36, 0.045], [Math.sin(a) * d, h + 0.2, Math.cos(a) * d], { rot: [Math.cos(a) * 38, 0, -Math.sin(a) * 38], color: ["#6aa95a", "#7fbf8a", "#5f9a4e"][i % 3] });
    }),
  ];
  return { parts, init: {}, motion: ["breathe"] };
}

export function lamp(c) {
  const parts = [
    P("base", "cylinder", [0.42, 0.48, 0.12], [0, 0.06, 0], { role: "dark" }),
    P("stem", "cylinder", [0.045, 0.045, 1.35], [0, 0.78, 0], { role: "metal" }),
    P("shade", "lathe", null, [0, 1.35, 0], { points: [[0.2, 0.0], [0.34, 0.1], [0.62, 0.52], [0.64, 0.54]], role: "accent", states: { glow: { emissive: 0.5 } } }),
    P("bulb", "sphere", [0.17], [0, 1.4, 0], GLOW({ states: { glow: { emissive: 3.2 } } })),
  ];
  return { parts, init: { glow: 0.7 } };
}

export function crate(c) {
  const parts = [
    P("box", "box", [1.0, 1.0, 1.0], [0, 0.5, 0], { radius: 0.05, role: "body" }),
    ...[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => P(`post${i}`, "box", [0.12, 1.04, 0.12], [x, 0.5, z], { role: "dark" })),
    ...[0.04, 1.0].map((y, i) => P(`rim${i}`, "box", [1.04, 0.1, 1.04], [0, y, 0], { role: "dark" })),
    P("braceA", "box", [1.2, 0.1, 0.05], [0, 0.5, 0.52], { rot: [0, 0, 45], role: "dark" }),
    P("braceB", "box", [1.2, 0.1, 0.05], [0, 0.5, 0.52], { rot: [0, 0, -45], role: "dark" }),
  ];
  return { parts, init: {} };
}

export function thermometer(c) {
  const parts = [
    P("bulbG", "sphere", [0.4], [0, 0.4, 0], { material: "glass", role: "light", opacity: 0.45 }),
    P("tubeG", "capsule", [0.18, 1.6], [0, 1.5, 0], { material: "glass", role: "light", opacity: 0.45 }),
    P("bulb", "sphere", [0.3], [0, 0.4, 0], { color: "#e5574f", states: { heat: { emissive: 1 } }, emissive: 0.3 }),
    P("level", "cylinder", [0.09, 0.09, 1.5], [0, 0.6 + 0.05 * 0.5, 0], { color: "#e5574f", emissive: 0.4, scale: [1, 0.04, 1], states: { fill: { scale: [1, 25, 1], grow: "bottom" } } }),
    ...[0, 1, 2, 3, 4].map((i) => P(`tick${i}`, "box", [0.16, 0.04, 0.03], [0.24, 0.9 + i * 0.3, 0.1], { role: "dark" })),
    P("foot", "cylinder", [0.3, 0.34, 0.1], [0, 0.05, 0], { role: "dark" }),
  ];
  return { parts, init: { fill: 0.3 } };
}
