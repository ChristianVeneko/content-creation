// Looks of the three-looks format, as data. clay-diorama is implemented; iso-toon, neon-glass, pedestal, paper-world and
// toy-blocks are added by writing another entry (lighting rig, materials, background, post, caption style) and nothing else:
// the runtime reads every value below, and no look-specific branch exists in the schema or the resolver.
export const STYLES = [
  {
    id: "clay-diorama", name: "Clay diorama", about: "Matte plasticine toys on a thick rounded platform: soft warm studio light, soft shadows, rounded kit pieces, gentle bloom, tilt-shift blur and a vignette.",
    material: { kind: "clay", roughness: 0.9, metalness: 0, tint: 0.2, tintColor: "#ecd6b8", bump: 0.55, bumpScale: 5, round: 0.12, saturation: 1.05 },
    light: { exposure: 0.92, env: 0.4, key: { color: "#ffe2bd", intensity: 2.3, pos: [5, 8, 6] }, fill: { sky: "#fff3e0", ground: "#b89a7a", intensity: 0.55 }, rim: { color: "#bcd8ff", intensity: 0.9, pos: [-6, 4, -5] }, shadow: { size: 2048, bias: -0.0004, blurRadius: 5, opacity: 1 }, blob: 0.28 },
    moods: {
      warm: { bg: "#f3e6d2", fog: "#f3e6d2", keyMul: 1, fillMul: 1, keyColor: null, envMul: 1 },
      cool: { bg: "#dbe9ee", fog: "#dbe9ee", keyMul: 0.95, fillMul: 1.05, keyColor: "#e8f2ff", envMul: 1 },
      night: { bg: "#27304a", fog: "#27304a", keyMul: 0.4, fillMul: 0.5, keyColor: "#9db4ff", envMul: 0.5 },
      alert: { bg: "#f2cdbf", fog: "#f2cdbf", keyMul: 1.05, fillMul: 0.9, keyColor: "#ffc9a0", envMul: 0.9 },
    },
    post: { bloom: { strength: 0.12, radius: 0.5, threshold: 0.95 }, tilt: { focus: 0.4, band: 0.22, blur: 2.4 }, vignette: 0.32, grade: { sat: 1.06, warm: 0.04 } },
    cap: { font: "Baloo2", fg: "#fff8ec", ink: "#4a3a2e", hi: "#f2a65a", hiInk: "#4a2a10" },
    tag: { bg: "#fff4dc", ink: "#4a3a2e", border: "#4a3a2e" },
    transition: { color: "#f2a65a", color2: "#6db3a8" },
  },
];
export const STYLE_IDS = STYLES.map((s) => s.id);
export const getStyle = (id) => STYLES.find((s) => s.id === id) ?? STYLES[0];
export const STYLE_GUIDE = { "clay-diorama": { mood: "warm, handmade, friendly", goodFor: "tech explainers, everyday-life metaphors, how things work", avoid: "dark horror, hard sci-fi, anything that needs a cold metallic finish" } };
