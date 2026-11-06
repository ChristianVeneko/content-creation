// The built-in object kinds (cube, phone, server...) are drawn by hand in src/three/objects.tsx. The Blender renderer
// approximates each with a few primitive parts (same footprint and height) instead of porting 900 lines of JSX; this
// is the "Blender cannot express it exactly" degradation, reported once per kind as a warning.
const box = (id, size, pos, role = "body", extra = {}) => ({ id, shape: "box", size, pos, role, radius: 0.06, ...extra });
const cyl = (id, size, pos, role = "body", extra = {}) => ({ id, shape: "cylinder", size, pos, role, ...extra });
const sph = (id, size, pos, role = "body", extra = {}) => ({ id, shape: "sphere", size, pos, role, ...extra });

/** Primitive parts for a built-in kind at scale 1 (base on y = 0). `o` is the object spec (value, values...). */
export function proxyParts(kind, o = {}) {
  switch (kind) {
    case "sphere":
      return [sph("ball", [0.65], [0, 0.65, 0])];
    case "phone":
      return [box("body", [0.9, 1.9, 0.12], [0, 0.95, 0], "dark", { radius: 0.1 }), box("screen", [0.78, 1.7, 0.02], [0, 0.95, 0.07], "screen", { material: "emissive", emissive: 0.6 })];
    case "laptop":
      return [box("base", [1.5, 0.08, 1.0], [0, 0.04, 0], "dark"), box("lid", [1.5, 1.0, 0.06], [0, 0.6, -0.5], "dark", { rot: [-12, 0, 0] }), box("screen", [1.36, 0.88, 0.02], [0, 0.6, -0.46], "screen", { rot: [-12, 0, 0], material: "emissive", emissive: 0.5 })];
    case "monitor":
      return [box("panel", [1.7, 1.0, 0.1], [0, 1.1, 0], "dark"), box("screen", [1.58, 0.88, 0.02], [0, 1.1, 0.06], "screen", { material: "emissive", emissive: 0.5 }), cyl("neck", [0.08, 0.08, 0.5], [0, 0.4, 0], "dark"), cyl("foot", [0.5, 0.5, 0.06], [0, 0.03, 0], "dark")];
    case "server":
      return [0, 1, 2].flatMap((i) => [box(`u${i}`, [1.2, 0.5, 0.9], [0, 0.3 + i * 0.58, 0], "dark"), sph(`led${i}`, [0.04], [0.45, 0.3 + i * 0.58, 0.46], "glow", { material: "emissive" })]);
    case "database":
      return [0, 1, 2].map((i) => cyl(`d${i}`, [0.6, 0.6, 0.42], [0, 0.25 + i * 0.5, 0], i === 1 ? "accent" : "body"));
    case "cloud":
      return [sph("c1", [0.5], [-0.4, 0.5, 0], "light"), sph("c2", [0.62], [0.05, 0.62, 0], "light"), sph("c3", [0.45], [0.55, 0.45, 0], "light")];
    case "document":
      return [box("page", [1.1, 1.6, 0.08], [0, 0.8, 0], "light"), ...[0, 1, 2].map((i) => box(`l${i}`, [0.7, 0.06, 0.02], [0, 1.2 - i * 0.3, 0.05], "dark"))];
    case "folder":
      return [box("back", [1.4, 1.0, 0.12], [0, 0.55, 0], "accent"), box("front", [1.4, 0.8, 0.1], [0, 0.45, 0.1], "body")];
    case "envelope":
      return [box("env", [1.4, 0.95, 0.1], [0, 0.5, 0], "light"), box("flap", [1.0, 0.5, 0.04], [0, 0.78, 0.07], "accent", { rot: [0, 0, 45] })];
    case "coin": {
      const n = Math.max(1, Math.min(6, Math.round(Number(o.value) || 1)));
      return o.value !== undefined && n > 1 ? Array.from({ length: n }, (_, i) => cyl(`c${i}`, [0.55, 0.55, 0.14], [0, 0.08 + i * 0.16, 0], "body")) : [cyl("coin", [0.6, 0.6, 0.14], [0, 0.7, 0], "body", { rot: [90, 0, 0] })];
    }
    case "chart": {
      const values = o.values ?? [1, 2];
      const mx = Math.max(...values, 1e-6);
      const n = values.length;
      return [box("base", [1.9, 0.12, 1.0], [0, 0.06, 0], "dark"), ...values.map((v, i) => box(`bar${i}`, [1.75 / n - 0.08, Math.max(0.05, (1.75 * v) / mx), 0.5], [(i - (n - 1) / 2) * (1.75 / n), 0.12 + (Math.max(0.05, (1.75 * v) / mx)) / 2, 0], i % 2 ? "accent" : "body"))];
    }
    case "stat":
      return [box("plinth", [1.6, 0.4, 1.0], [0, 0.2, 0], "dark", { radius: 0.12 })];
    case "lock":
      return [box("body", [1.0, 0.8, 0.5], [0, 0.4, 0], "body"), { id: "shackle", shape: "torus", size: [0.32, 0.08], pos: [0, 0.95, 0], role: "metal" }];
    case "key":
      return [{ id: "bow", shape: "torus", size: [0.3, 0.08], pos: [0, 1.0, 0], role: "metal" }, box("shaft", [0.1, 0.9, 0.08], [0, 0.4, 0], "metal")];
    case "gear":
      return [cyl("hub", [0.55, 0.55, 0.3], [0, 0.7, 0], "body", { rot: [90, 0, 0] }), { id: "ring", shape: "torus", size: [0.62, 0.12], pos: [0, 0.7, 0], role: "accent" }];
    case "globe":
      return [sph("globe", [0.7], [0, 0.8, 0], "body"), { id: "orbit", shape: "torus", size: [1.0, 0.03], pos: [0, 0.8, 0], rot: [75, 0, 0], role: "accent" }];
    case "chip":
      return [box("chip", [1.0, 0.18, 1.0], [0, 0.15, 0], "dark"), box("die", [0.6, 0.1, 0.6], [0, 0.26, 0], "accent")];
    case "battery": {
      const level = Math.max(0, Math.min(1, Number(o.value) > 1 ? Number(o.value) / 100 : Number(o.value ?? 0.7)));
      return [cyl("shell", [0.5, 0.5, 1.4], [0, 0.7, 0], "dark"), cyl("cap", [0.2, 0.2, 0.15], [0, 1.45, 0], "metal"), cyl("level", [0.42, 0.42, Math.max(0.05, 1.2 * level)], [0, 0.1 + (Math.max(0.05, 1.2 * level)) / 2, 0], "accent")];
    }
    case "rocket":
      return [{ id: "body", shape: "capsule", size: [0.4, 0.9], pos: [0, 1.0, 0], role: "light" }, { id: "nose", shape: "cone", size: [0.4, 0.6], pos: [0, 1.75, 0], role: "accent" }, box("fin1", [0.1, 0.5, 0.5], [-0.4, 0.4, 0], "accent"), box("fin2", [0.1, 0.5, 0.5], [0.4, 0.4, 0], "accent")];
    case "lightbulb":
      return [sph("bulb", [0.55], [0, 1.05, 0], "glow", { material: "emissive" }), cyl("base", [0.25, 0.2, 0.4], [0, 0.4, 0], "metal")];
    case "person":
      return [{ id: "torso", shape: "capsule", size: [0.35, 0.5], pos: [0, 0.8, 0], role: "body" }, sph("head", [0.3], [0, 1.45, 0], "light")];
    case "building":
      return [box("tower", [1.1, 2.1, 1.1], [0, 1.05, 0], "body"), ...[0, 1, 2, 3].map((i) => box(`w${i}`, [0.8, 0.12, 0.02], [0, 0.5 + i * 0.4, 0.56], "glow", { material: "emissive", emissive: 0.6 }))];
    case "house":
      return [box("walls", [1.3, 0.9, 1.1], [0, 0.45, 0], "light"), { id: "roof", shape: "cone", size: [1.15, 0.7], pos: [0, 1.25, 0], rot: [0, 45, 0], role: "accent" }];
    case "tree":
      return [cyl("trunk", [0.14, 0.18, 0.6], [0, 0.3, 0], "dark"), sph("leaves", [0.7, 0.8, 0.7], [0, 1.25, 0], "body")];
    case "pin":
      return [{ id: "tip", shape: "cone", size: [0.35, 0.8], pos: [0, 0.4, 0], rot: [180, 0, 0], role: "body" }, sph("head", [0.42], [0, 1.1, 0], "body"), sph("dot", [0.16], [0, 1.1, 0.3], "light")];
    case "card":
      return [box("card", [1.5, 0.95, 0.07], [0, 0.5, 0], "body"), box("stripe", [1.5, 0.18, 0.02], [0, 0.65, 0.05], "dark")];
    case "check":
      return [cyl("badge", [0.6, 0.6, 0.18], [0, 0.65, 0], "glow", { rot: [90, 0, 0] }), box("tick1", [0.12, 0.4, 0.06], [-0.12, 0.62, 0.12], "light", { rot: [0, 0, 40] }), box("tick2", [0.12, 0.7, 0.06], [0.12, 0.7, 0.12], "light", { rot: [0, 0, -40] })];
    case "cross":
      return [cyl("badge", [0.6, 0.6, 0.18], [0, 0.65, 0], "glow", { rot: [90, 0, 0] }), box("x1", [0.12, 0.7, 0.06], [0, 0.65, 0.12], "light", { rot: [0, 0, 45] }), box("x2", [0.12, 0.7, 0.06], [0, 0.65, 0.12], "light", { rot: [0, 0, -45] })];
    case "icon":
      return [cyl("tile", [0.65, 0.65, 0.16], [0, 0.7, 0], "body", { rot: [90, 0, 0] }), box("glyph", [0.5, 0.5, 0.06], [0, 0.7, 0.12], "light", { rot: [0, 0, 45] })];
    case "cube":
    default:
      return [box("cube", [1.0, 1.0, 1.0], [0, 0.6, 0], "body", { radius: 0.12 })];
  }
}

/** Kinds that load a GLB model when it is staged (otherwise they use these proxies). */
export const MODEL_KINDS = ["model", "car", "character"];
