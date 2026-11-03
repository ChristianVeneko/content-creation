// Procedural tech props: microwave, oven, laptop, phone, router, server rack, battery, padlock, magnifier, monitor.
// Named states (beats): open/close swing a door or lid, fill raises a level, light-up/dim drive `glow`, heat tints, spin turns a part.
import { P, GLOW, clampN } from "./helpers.mjs";

const RING = (id, parent, R, tube, pos, extra) => P(id, "torus", [R, tube], pos, { parent, ...extra });

export function microwave(c) {
  const parts = [
    P("bottom", "box", [1.5, 0.12, 1.1], [0, 0.06, 0], { radius: 0.05, role: "body" }),
    P("top", "box", [1.5, 0.12, 1.1], [0, 0.94, 0], { radius: 0.05, role: "body" }),
    P("back", "box", [1.5, 0.78, 0.1], [0, 0.5, -0.5], { role: "body" }),
    P("wallL", "box", [0.1, 0.78, 1.0], [-0.7, 0.5, 0], { role: "body" }),
    P("panel", "box", [0.44, 0.84, 1.1], [0.53, 0.5, 0], { radius: 0.04, role: "accent" }),
    P("lamp", "box", [0.8, 0.03, 0.7], [-0.14, 0.89, -0.02], GLOW({ states: { glow: { emissive: 1.6 } } })),
    P("plate", "cylinder", [0.38, 0.04], [-0.14, 0.14, 0], { role: "light", states: { spin: { rot: [0, 360, 0] } } }),
    P("food", "sphere", [0.2, 0.15, 0.2], [0, 0.17, 0], { parent: "plate", color: "#e8a14a", states: { heat: { color: "#b8321e" } } }),
    P("door", "box", [0.88, 0.76, 0.07], [-0.14, 0.5, 0.56], { radius: 0.03, role: "light", pivot: [-0.44, 0, 0], states: { open: { rot: [0, -105, 0] } } }),
    P("window", "plane", [0.64, 0.5], [-0.02, 0, 0.045], { parent: "door", role: "screen", material: "glass", opacity: 0.8 }),
    P("handle", "box", [0.06, 0.5, 0.07], [0.36, 0, 0.09], { parent: "door", radius: 0.02, role: "metal" }),
    P("display", "box", [0.3, 0.14, 0.04], [0.53, 0.72, 0.57], { radius: 0.02, role: "screen", states: { glow: { emissive: 1.4 } }, emissive: 0.5 }),
    P("dial", "cylinder", [0.1, 0.06], [0.53, 0.46, 0.58], { rot: [90, 0, 0], role: "dark", states: { spin: { rot: [0, 360, 0] } } }),
    ...[0.3, 0.17].map((y, i) => P(`btn${i}`, "cylinder", [0.055, 0.04], [0.53, y, 0.58], { rot: [90, 0, 0], role: "light" })),
    ...[-0.6, 0.6].map((x, i) => P(`foot${i}`, "cylinder", [0.07, 0.06], [x, -0.02, 0.4], { role: "dark" })),
  ];
  return { parts, init: { open: 0, glow: 0.45 } };
}

export function oven(c) {
  const parts = [
    P("body", "box", [1.6, 1.3, 1.15], [0, 0.65, 0], { radius: 0.06, role: "body" }),
    P("cavity", "box", [1.2, 0.8, 0.3], [0, 0.55, 0.52], { role: "dark", states: { glow: { emissive: 1.2, color: "#ffb04a" }, heat: { emissive: 1.6, color: "#ff6a2a" } } }),
    P("cooktop", "box", [1.62, 0.07, 1.17], [0, 1.31, 0], { radius: 0.03, role: "dark" }),
    ...[[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.3], [0.4, 0.3]].map(([x, z], i) => P(`burner${i}`, "torus", [0.24, 0.045], [x, 1.37, z], { rot: [90, 0, 0], role: "dark", states: { heat: { emissive: 2, color: "#ff5a1e" } } })),
    P("door", "box", [1.3, 0.8, 0.09], [0, 0.55, 0.6], { radius: 0.04, role: "light", pivot: [0, -0.4, 0], states: { open: { rot: [90, 0, 0] } } }),
    P("window", "plane", [0.95, 0.5], [0, 0.02, 0.055], { parent: "door", role: "screen", material: "glass", opacity: 0.75 }),
    P("bar", "cylinder", [0.04, 1.1], [0, 0.32, 0.12], { parent: "door", rot: [0, 0, 90], role: "metal" }),
    ...[-0.5, -0.17, 0.17, 0.5].map((x, i) => P(`knob${i}`, "cylinder", [0.075, 0.07], [x, 1.07, 0.6], { rot: [90, 0, 0], role: "metal", states: { spin: { rot: [0, 360, 0] } } })),
    P("tray", "box", [1.0, 0.03, 0.6], [0, 0.3, 0.45], { role: "metal" }),
    P("pie", "cylinder", [0.26, 0.2, 0.14], [0, 0.4, 0.45], { color: "#d9a05a", states: { heat: { color: "#8a3a1a" } } }),
  ];
  return { parts, init: { open: 0 } };
}

export function laptop(c) {
  const parts = [
    P("base", "box", [1.7, 0.1, 1.15], [0, 0.05, 0], { radius: 0.05, role: "metal" }),
    P("deck", "box", [1.5, 0.02, 0.62], [0, 0.065, -0.12], { parent: "base", role: "dark" }),
    ...[0, 1, 2].map((i) => P(`keys${i}`, "box", [1.32, 0.03, 0.1], [0, 0.03, -0.3 + i * 0.13], { parent: "deck", radius: 0.012, role: "light" })),
    P("pad", "box", [0.5, 0.012, 0.28], [0, 0.04, 0.4], { parent: "base", radius: 0.02, role: "dark" }),
    P("lid", "box", [1.7, 1.15, 0.07], [0, 0.55, -0.56], { radius: 0.04, role: "metal", pivot: [0, -0.575, 0], rot: [90, 0, 0], states: { open: { rot: [-102, 0, 0] } } }),
    P("screen", "plane", [1.5, 0.95], [0, 0, 0.04], { parent: "lid", role: "screen", emissive: 0.7, states: { glow: { emissive: 1.5 } } }),
    ...[0.3, 0.1, -0.1].map((y, i) => P(`win${i}`, "box", [0.55 - i * 0.08, 0.28, 0.02], [-0.3 + i * 0.28, y - 0.05, 0.03], { parent: "screen", radius: 0.02, color: ["#e9806e", "#6db3a8", "#f2b45a"][i], emissive: 0.5 })),
    P("logo", "sphere", [0.07], [0, 0, -0.045], { parent: "lid", role: "light" }),
  ];
  return { parts, init: { open: 1, glow: 0.7 } };
}

export function phone(c) {
  const parts = [
    P("stand", "box", [0.8, 0.07, 0.5], [0, 0.035, 0], { radius: 0.03, role: "dark" }),
    P("body", "box", [0.66, 1.25, 0.1], [0, 0.78, 0], { radius: 0.09, role: "metal", rot: [-9, 0, 0] }),
    P("screen", "plane", [0.56, 1.1], [0, 0, 0.056], { parent: "body", role: "screen", emissive: 0.6, states: { glow: { emissive: 1.5 } } }),
    P("notch", "capsule", [0.025, 0.14], [0, 0.5, 0.06], { parent: "body", rot: [0, 0, 90], role: "dark" }),
    ...[0, 1, 2, 3, 4, 5].map((i) => P(`app${i}`, "box", [0.14, 0.14, 0.02], [-0.17 + (i % 3) * 0.17, 0.28 - Math.floor(i / 3) * 0.2, 0.065], { parent: "body", radius: 0.04, color: ["#e9806e", "#6db3a8", "#f2b45a", "#9a7fb5", "#5a86c9", "#7fbf8a"][i], emissive: 0.4 })),
    P("bar", "box", [0.4, 0.08, 0.02], [0, -0.15, 0.065], { parent: "body", radius: 0.03, role: "light", emissive: 0.4 }),
    P("badge", "sphere", [0.07], [0.33, 0.62, 0.05], { parent: "body", color: "#e5574f", scale: 0.01, states: { open: { scale: 100, emissive: 1.2 } } }),
    P("lens", "cylinder", [0.04, 0.03], [0.2, 0.52, -0.06], { parent: "body", rot: [90, 0, 0], role: "dark" }),
  ];
  return { parts, init: { glow: 0.7 } };
}

export function router(c) {
  const parts = [
    P("base", "box", [1.5, 0.2, 0.95], [0, 0.1, 0], { radius: 0.09, role: "body" }),
    P("lid", "box", [1.4, 0.06, 0.85], [0, 0.23, 0], { parent: "base", radius: 0.04, role: "light" }),
    ...[[-0.62, -0.35], [0.62, -0.35], [-0.62, 0.35], [0.62, 0.35]].map(([x, z], i) => P(`ant${i}`, "cylinder", [0.04, 0.95], [x, 0.62, z], { rot: [0, 0, x < 0 ? 8 : -8], role: "dark" })),
    ...[[-0.62, -0.35], [0.62, -0.35], [-0.62, 0.35], [0.62, 0.35]].map(([x, z], i) => P(`tip${i}`, "sphere", [0.07], [x * 1.0 + (x < 0 ? -0.07 : 0.07), 1.08, z], GLOW({ states: { glow: { emissive: 2 } } }))),
    ...[0, 1, 2, 3].map((i) => P(`led${i}`, "box", [0.09, 0.05, 0.03], [-0.45 + i * 0.18, 0.1, 0.49], GLOW({ states: { fill: { emissive: 2, from: i / 4, to: (i + 0.6) / 4 }, glow: { emissive: 1.4 } } }))),
    ...[0, 1, 2].map((i) => P(`wifi${i}`, "torus", [0.22 + i * 0.2, 0.03, 90], [0, 1.5, 0], { rot: [0, 0, 45], role: "accent", emissive: 0.8, scale: 1, states: { glow: { emissive: 2.2 } } })),
    P("port", "box", [0.5, 0.07, 0.04], [0.3, 0.1, 0.49], { parent: "base", role: "dark" }),
  ];
  return { parts, init: { fill: 0.5, glow: 0.7 } };
}

export function serverRack(c) {
  const n = clampN(c.p.units, 4, 8, 6);
  const parts = [
    P("floorplate", "box", [1.3, 0.1, 1.0], [0, 0.05, 0], { radius: 0.03, role: "dark" }),
    P("sideL", "box", [0.08, 2.1, 0.95], [-0.62, 1.15, 0], { role: "body" }),
    P("sideR", "box", [0.08, 2.1, 0.95], [0.62, 1.15, 0], { role: "body" }),
    P("back", "box", [1.3, 2.1, 0.06], [0, 1.15, -0.45], { role: "body" }),
    P("roof", "box", [1.3, 0.1, 1.0], [0, 2.25, 0], { radius: 0.03, role: "body" }),
    ...Array.from({ length: n }, (_, i) => {
      const h = 1.8 / n, y = 0.25 + h * (i + 0.5);
      return [
        P(`srv${i}`, "box", [1.12, h * 0.86, 0.8], [0, y, 0.02], { radius: 0.02, role: i % 2 ? "dark" : "metal" }),
        P(`ledA${i}`, "box", [0.07, 0.05, 0.03], [-0.42, y, 0.43], GLOW({ states: { fill: { emissive: 2.2, from: i / n, to: (i + 0.8) / n }, glow: { emissive: 1.2 } } })),
        P(`ledB${i}`, "box", [0.07, 0.05, 0.03], [-0.3, y, 0.43], { role: "accent", emissive: 0.9, states: { heat: { emissive: 2.2, color: "#ff4a2a" } } }),
        P(`slot${i}`, "box", [0.5, 0.05, 0.03], [0.18, y, 0.43], { role: "dark" }),
      ];
    }).flat(),
    P("door", "box", [1.22, 2.05, 0.05], [0, 1.15, 0.52], { role: "screen", material: "glass", opacity: 0.35, pivot: [-0.61, 0, 0], states: { open: { rot: [0, -115, 0] } } }),
    P("handle", "box", [0.05, 0.4, 0.06], [0.5, 0, 0.05], { parent: "door", role: "metal" }),
  ];
  return { parts, init: { open: 0, fill: 0.3, glow: 0.7 } };
}

export function battery(c) {
  const n = clampN(Math.round(c.p.segments), 3, 8, 5);
  const col = (i) => (i < n * 0.34 ? "#e5574f" : i < n * 0.67 ? "#f2b45a" : "#7fd08a");
  const parts = [
    P("body", "box", [1.15, 1.9, 0.75], [0, 1.0, 0], { radius: 0.2, role: "body" }),
    P("cap", "cylinder", [0.24, 0.2], [0, 2.05, 0], { role: "metal" }),
    P("band", "box", [1.17, 0.22, 0.77], [0, 0.22, 0], { radius: 0.1, role: "dark" }),
    P("slot", "box", [0.8, 1.45, 0.08], [0, 1.08, 0.38], { radius: 0.06, role: "screen" }),
    ...Array.from({ length: n }, (_, i) => {
      const h = 1.3 / n;
      return P(`seg${i}`, "box", [0.66, h * 0.8, 0.07], [0, 0.46 + h * (i + 0.5) + 0.0, 0.43], { radius: 0.03, color: col(i), emissive: 0.05, states: { fill: { emissive: 1.8, from: i / n, to: (i + 0.7) / n } }, opacity: 1 });
    }),
    P("plus", "box", [0.28, 0.07, 0.04], [0, 1.82, 0.4], { role: "light" }),
    P("plusV", "box", [0.07, 0.28, 0.04], [0, 1.82, 0.4], { role: "light" }),
    P("bolt", "extrude", [0.05], [0, 0.22, 0.4], { points: [[-0.06, 0.12], [0.09, 0.12], [0.01, 0.01], [0.1, 0.01], [-0.08, -0.14], [-0.02, -0.02], [-0.1, -0.02]], role: "glow", emissive: 1.2, states: { glow: { emissive: 2 } } }),
  ];
  return { parts, init: { fill: 0.4, glow: 0.7 } };
}

export function padlock(c) {
  const parts = [
    P("body", "box", [1.2, 0.95, 0.55], [0, 0.5, 0], { radius: 0.14, role: "body", states: { heat: { color: "#d94a3a" } } }),
    P("plate", "box", [1.0, 0.75, 0.05], [0, 0.5, 0.29], { radius: 0.06, role: "metal" }),
    P("shackle", "group", null, [0, 0.98, 0], { pivot: [0.36, 0, 0], states: { open: { pos: [0, 0.3, 0], rot: [0, -160, 0] } } }),
    P("arch", "torus", [0.36, 0.085, 180], [0, 0.04, 0], { parent: "shackle", role: "metal" }),
    P("legL", "cylinder", [0.085, 0.3], [-0.36, -0.1, 0], { parent: "shackle", role: "metal" }),
    P("legR", "cylinder", [0.085, 0.3], [0.36, -0.1, 0], { parent: "shackle", role: "metal" }),
    P("hole", "cylinder", [0.09, 0.05], [0, 0.56, 0.33], { rot: [90, 0, 0], role: "dark", states: { glow: { emissive: 1.8, color: "#e5574f" } } }),
    P("slot", "box", [0.06, 0.24, 0.05], [0, 0.4, 0.33], { role: "dark" }),
  ];
  return { parts, init: { open: 0 } };
}

export function magnifier(c) {
  const parts = [
    P("base", "cylinder", [0.45, 0.5, 0.1], [0, 0.05, 0], { role: "dark" }),
    P("rim", "torus", [0.62, 0.085], [0, 1.35, 0], { role: "accent" }),
    P("glass", "cylinder", [0.6, 0.6, 0.05], [0, 1.35, 0], { rot: [90, 0, 0], role: "light", material: "glass", opacity: 0.4, states: { glow: { emissive: 0.8 } } }),
    P("shine", "box", [0.06, 0.5, 0.02], [-0.25, 1.4, 0.06], { rot: [0, 0, 35], role: "light", emissive: 0.8, opacity: 0.8 }),
    P("neck", "cylinder", [0.07, 0.2], [0.35, 0.78, 0], { rot: [0, 0, -40], role: "metal" }),
    P("handle", "capsule", [0.1, 0.55], [0.1, 0.38, 0], { rot: [0, 0, -40], role: "dark" }),
  ];
  return { parts, init: { glow: 0.5 }, motion: ["float"] };
}

export function monitor(c) {
  const parts = [
    P("foot", "cylinder", [0.5, 0.56, 0.1], [0, 0.05, 0], { role: "dark" }),
    P("neck", "cylinder", [0.1, 0.13, 0.5], [0, 0.33, 0], { role: "dark" }),
    P("frame", "box", [1.95, 1.22, 0.16], [0, 1.0, 0], { radius: 0.1, role: "dark" }),
    P("screen", "plane", [1.72, 1.0], [0, 1.0, 0.09], { role: "screen", emissive: 0.7, states: { glow: { emissive: 1.5 } } }),
    ...[0, 1, 2].map((i) => P(`win${i}`, "box", [0.62, 0.42, 0.02], [-0.42 + i * 0.4, 1.22 - i * 0.28, 0.1], { radius: 0.03, color: ["#fbf6ec", "#cfe8ff", "#ffe8c4"][i], emissive: 0.45, scale: 0.01, states: { open: { scale: 100, from: i / 3, to: (i + 1) / 3 } } })),
    P("bar", "box", [1.5, 0.08, 0.02], [0, 0.65, 0.1], { role: "dark", emissive: 0.3 }),
    P("ramFill", "box", [1.5, 0.08, 0.025], [0, 0.65, 0.105], { color: "#7fd08a", pivot: [-0.75, 0, 0], scale: [0.01, 1, 1], states: { fill: { scale: [100, 1, 1], emissive: 1.2, color: "#e5574f" } } }),
  ];
  return { parts, init: { glow: 0.75, open: 0, fill: 0.1 } };
}
