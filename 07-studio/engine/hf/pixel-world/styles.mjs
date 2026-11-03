// pixel-world styles: every style is DATA (palette + grid + outline/shade rule + atmosphere + post effects).
// Scenarios never hard-code colors: they draw with semantic master ramps (M.wood, M.steel...) and the runtime remaps
// each master colour to the nearest colour of the active style palette, so one scenario takes on any look.
//
// Palette provenance. VERIFIED = hex values fetched from lospec.com during the style research session
// (PICO-8, Sweetie 16, Game Boy BGB, Endesga 32). UNVERIFIED = from memory or invented for this module: check on
// lospec before presenting a style as an exact hardware palette (NES, C64 Pepto, noir, 1-bit, vaporwave, virtual-red).

const SWEETIE16 = ["#1a1c2c", "#5d275d", "#b13e53", "#ef7d57", "#ffcd75", "#a7f070", "#38b764", "#257179", "#29366f", "#3b5dc9", "#41a6f6", "#73eff7", "#f4f4f4", "#94b0c2", "#566c86", "#333c57"]; // VERIFIED
const PICO8 = ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"]; // VERIFIED
const DMG_BGB = ["#081820", "#346856", "#88c070", "#e0f8d0"]; // VERIFIED
const ENDESGA32 = ["#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50", "#733e39", "#3e2731", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761", "#63c74d", "#3e8948", "#265c42", "#193c3e", "#124e89", "#0099db", "#2ce8f5", "#ffffff", "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466", "#262b44", "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a", "#e8b796", "#c28569"]; // VERIFIED (subsets are used per style)
const NES16 = ["#000000", "#fcfcfc", "#bcbcbc", "#7c7c7c", "#0058f8", "#3cbcfc", "#00a800", "#b8f818", "#f83800", "#fca044", "#f8b800", "#a81000", "#6844fc", "#d800cc", "#503000", "#004058"]; // UNVERIFIED subset
const C64 = ["#000000", "#ffffff", "#68372b", "#70a4b2", "#6f3d86", "#588d43", "#352879", "#b8c76f", "#6f4f25", "#433900", "#9a6759", "#444444", "#6c6c6c", "#9ad284", "#6c5eb5", "#959595"]; // UNVERIFIED (Pepto from memory)
const NOIR = ["#0b0b10", "#1f2230", "#3b4056", "#7a7f94", "#d8d4c8", "#c23b3b"]; // UNVERIFIED
const BIT1 = ["#1b1b1b", "#f2efe4"]; // UNVERIFIED
const VAPOR = ["#1a0b2e", "#3d1a6b", "#7c5cff", "#ff3d9a", "#ff8fd1", "#2cf5e8", "#ffe0f4", "#0b3a5a", "#ffcf5c"]; // INVENTED
const VRED = ["#000000", "#3a0000", "#a00000", "#ff2020"]; // INVENTED (Virtual Boy style)
const CYBER = ["#181425", "#3e2731", "#68386c", "#b55088", "#f6757a", "#0099db", "#2ce8f5", "#ff0044", "#fee761", "#262b44", "#3a4466", "#124e89", "#ffffff", "#8b9bb4"]; // VERIFIED subset
const DUSK = ["#ead4aa", "#e4a672", "#b86f50", "#733e39", "#3e2731", "#5a6988", "#3a4466", "#262b44", "#181425", "#feae34", "#f77622", "#a22633", "#63c74d", "#265c42", "#8b9bb4", "#fee761"]; // VERIFIED subset
const FIRE_WATER = ["#181425", "#262b44", "#124e89", "#0099db", "#2ce8f5", "#c0cbdc", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761", "#3e2731", "#733e39", "#ffffff", "#3a4466", "#63c74d"]; // VERIFIED subset

const arcadeExtra = [...SWEETIE16, "#2ce8f5", "#ff0044"];

/** @type {Array<object>} */
export const STYLES = [
  { id: "pixel-gameboy-dmg", time: "day", name: "Game Boy 4-tone", about: "Four green LCD tones, chunky 2x pixels, LCD grid and flat shading.", px: 2, palette: DMG_BGB, mono: true, outline: "ink", shade: "flat", glow: 0, blur: [0, 0], sat: 1, gamma: 1, post: { lcd: 0.1, vig: 0.25 }, atmos: "dust", cap: { ink: "#081820", fg: "#e0f8d0", boxes: ["#88c070", "#e0f8d0"], boxInk: "#081820" }, provenance: "verified" },
  { id: "pixel-nes-8bit", time: "day", name: "NES 8-bit", about: "Limited NES colours, flat tiles with black outlines, no gradients.", px: 1, palette: NES16, mono: false, outline: "ink", shade: "flat", glow: 0.4, blur: [0, 0], sat: 1.1, gamma: 1, post: { vig: 0.3 }, atmos: "none", cap: { ink: "#000000", fg: "#fcfcfc", boxes: ["#fca044", "#3cbcfc", "#b8f818", "#f8b800"], boxInk: "#000000" }, provenance: "unverified" },
  { id: "pixel-snes-16bit", name: "SNES 16-bit RPG", about: "Sweetie 16 palette, hue-shifted shading, soft vignette and warm grade.", px: 1, palette: SWEETIE16, mono: false, outline: "ink", shade: "bevel", glow: 0.9, blur: [7, 11], sat: 1, gamma: 1, post: { vig: 0.55, tint: "rgba(255,150,70,0.06)" }, atmos: "dust", cap: { ink: "#1a1c2c", fg: "#f4f4f4", boxes: ["#ef7d57", "#ffcd75", "#73eff7", "#a7f070", "#41a6f6"], boxInk: "#1a1c2c" }, provenance: "verified" },
  { id: "pixel-pico8", time: "day", name: "PICO-8", about: "The 16-colour fantasy console palette at very chunky resolution.", px: 2, palette: PICO8, mono: false, outline: "ink", shade: "flat", glow: 0.5, blur: [0, 0], sat: 1.15, gamma: 1, post: { vig: 0.2 }, atmos: "dust", cap: { ink: "#000000", fg: "#fff1e8", boxes: ["#ff004d", "#ffa300", "#29adff", "#00e436", "#ff77a8"], boxInk: "#000000" }, provenance: "verified" },
  { id: "pixel-crt-arcade", time: "night", name: "CRT arcade", about: "Bold outlines, scanlines, bloom-ish glow, cyan and magenta accents.", px: 1, palette: arcadeExtra, mono: false, outline: "ink", shade: "bevel", glow: 1.4, blur: [6, 10], sat: 1.2, gamma: 1, post: { scan: 0.3, vig: 0.7, tint: "rgba(40,200,255,0.05)" }, atmos: "dust", cap: { ink: "#1a1c2c", fg: "#f4f4f4", boxes: ["#ff0044", "#2ce8f5", "#ffcd75", "#a7f070"], boxInk: "#1a1c2c" }, provenance: "verified" },
  { id: "pixel-1bit-dither", time: "day", name: "1-bit dither", about: "Two colours only, ordered Bayer dither for every tone, Mac-classic feel.", px: 2, palette: BIT1, mono: true, bit1: true, outline: "ink", shade: "flat", glow: 0, blur: [0, 0], sat: 1, gamma: 1, post: { vig: 0.15 }, atmos: "dust", cap: { ink: "#1b1b1b", fg: "#f2efe4", boxes: ["#f2efe4"], boxInk: "#1b1b1b" }, provenance: "unverified" },
  { id: "pixel-cyberpunk-neon", time: "night", name: "Cyberpunk neon", about: "Dark purple city palette, neon glow, rain streaks and light scanlines.", px: 1, palette: CYBER, mono: false, outline: "ink", shade: "bevel", glow: 1.6, blur: [6, 10], sat: 1.25, gamma: 0.92, post: { scan: 0.14, vig: 0.7, tint: "rgba(120,40,200,0.08)" }, atmos: "rain", cap: { ink: "#181425", fg: "#ffffff", boxes: ["#ff0044", "#2ce8f5", "#fee761", "#b55088"], boxInk: "#181425" }, provenance: "verified" },
  { id: "pixel-noir", time: "night", name: "Pixel noir", about: "Near-monochrome blue greys, one red accent, heavy vignette.", px: 1, palette: NOIR, mono: true, outline: "ink", shade: "bevel", glow: 0.7, blur: [5, 9], sat: 0.25, gamma: 1.1, post: { vig: 0.85 }, atmos: "smoke", cap: { ink: "#0b0b10", fg: "#d8d4c8", boxes: ["#c23b3b", "#d8d4c8"], boxInk: "#0b0b10" }, provenance: "unverified" },
  { id: "pixel-dusk-lowres", name: "Low-res dusk", about: "Warm Endesga dusk ramp with banded dither skies and sun rays.", px: 1, palette: DUSK, mono: false, outline: "ink", shade: "bevel", glow: 1, blur: [6, 10], sat: 1, gamma: 1, time: "dusk", post: { vig: 0.6, tint: "rgba(255,140,60,0.10)" }, atmos: "dust", cap: { ink: "#262b44", fg: "#ead4aa", boxes: ["#f77622", "#feae34", "#fee761", "#e4a672"], boxInk: "#181425" }, provenance: "verified" },
  { id: "pixel-c64", time: "day", name: "Commodore 64", about: "Pepto C64 palette with wide chunky pixels and the blue boot-screen border.", px: 2, palette: C64, mono: false, outline: "none", shade: "flat", glow: 0.3, blur: [0, 0], sat: 1, gamma: 1, post: { border: "#6c5eb5", vig: 0.2 }, atmos: "none", cap: { ink: "#352879", fg: "#ffffff", boxes: ["#6c5eb5", "#b8c76f", "#70a4b2", "#9ad284"], boxInk: "#000000" }, provenance: "unverified" },
  { id: "pixel-gba-handheld", time: "day", name: "GBA handheld", about: "Saturated 32-colour Endesga palette, soft two-tone shading, blue LCD wash.", px: 1, palette: ENDESGA32, mono: false, outline: "ink", shade: "bevel", glow: 0.9, blur: [6, 10], sat: 1.15, gamma: 0.95, post: { vig: 0.35, tint: "rgba(120,170,255,0.10)" }, atmos: "dust", cap: { ink: "#181425", fg: "#ffffff", boxes: ["#feae34", "#2ce8f5", "#63c74d", "#ff0044"], boxInk: "#181425" }, provenance: "verified" },
  { id: "pixel-liquid-fire", name: "Liquid and fire", about: "Water blues against ember oranges, rising embers, hot heat-haze glow.", px: 1, palette: FIRE_WATER, mono: false, outline: "ink", shade: "bevel", glow: 1.5, blur: [6, 10], sat: 1.2, gamma: 1, post: { vig: 0.6, tint: "rgba(255,110,30,0.09)" }, atmos: "embers", cap: { ink: "#181425", fg: "#ffffff", boxes: ["#f77622", "#feae34", "#2ce8f5", "#e43b44"], boxInk: "#181425" }, provenance: "verified" },
  { id: "pixel-vaporwave", name: "Vaporwave", about: "Invented neon pink, violet and cyan palette with dreamy banded skies.", px: 1, palette: VAPOR, mono: false, outline: "ink", shade: "bevel", glow: 1.3, blur: [7, 11], sat: 1.2, gamma: 1, post: { scan: 0.1, vig: 0.5, tint: "rgba(255,80,200,0.07)" }, atmos: "dust", cap: { ink: "#1a0b2e", fg: "#ffe0f4", boxes: ["#ff3d9a", "#2cf5e8", "#ffcf5c", "#7c5cff"], boxInk: "#1a0b2e" }, provenance: "invented" },
  { id: "pixel-virtual-red", time: "night", name: "Virtual red", about: "Single red phosphor on black, four tones, harsh and graphic.", px: 2, palette: VRED, mono: true, outline: "ink", shade: "flat", glow: 0.6, blur: [0, 0], sat: 1, gamma: 1, post: { scan: 0.2, vig: 0.5 }, atmos: "dust", cap: { ink: "#000000", fg: "#ff2020", boxes: ["#ff2020", "#a00000"], boxInk: "#000000" }, provenance: "invented" },
];

export const STYLE_IDS = STYLES.map((s) => s.id);
export const getStyle = (id) => STYLES.find((s) => s.id === id);

// ---------------------------------------------------------------------------------------------------------------------
// Style guide: what each style is good for. Shown to the spec-writer (prompt table) and used by the style advisor.
// `retroOnly` styles are monochrome or near-monochrome: they only suit topics that ask for retro/handheld looks.
// `topics` are keyword stems (accent-free, lower case) matched against the narration; `rank` orders the default pick.
// ---------------------------------------------------------------------------------------------------------------------
export const STYLE_GUIDE = {
  "pixel-gameboy-dmg": { mood: "nostalgic, handheld, flat green", goodFor: "retro games, Game Boy, handheld consoles, nostalgia", avoid: "anything with progress bars, heat or colour coding (4 tones only)", retroOnly: true, topics: ["retro", "gameboy", "handheld", "nintendo", "portatil", "nostalg"] },
  "pixel-nes-8bit": { mood: "classic, bold, arcade-home", goodFor: "games, history of tech, simple explainers, challenges", avoid: "soft or realistic subjects", retroOnly: false, topics: ["juego", "game", "nes", "8-bit", "historia", "history", "nivel", "level"] },
  "pixel-snes-16bit": { mood: "warm, friendly, adventure RPG", goodFor: "kids, friendly explainers, everyday life, health, learning, tech for beginners", avoid: "harsh security or horror topics", retroOnly: false, topics: ["nino", "kid", "amig", "friend", "aprend", "learn", "salud", "health", "vida", "life", "cocina", "food", "celular", "phone"] },
  "pixel-pico8": { mood: "playful, bright, chunky", goodFor: "kids, fun facts, games, coding tips, light humour", avoid: "serious or dark topics", retroOnly: false, topics: ["nino", "kid", "diver", "fun", "juego", "game", "codigo", "code", "curios", "facts"] },
  "pixel-crt-arcade": { mood: "loud, neon, scanlines", goodFor: "tech, AI, security, hacking, speed, gaming, internet", avoid: "calm nature or cosy topics", retroOnly: false, topics: ["tecnolog", "tech", "ia", "ai", "inteligencia", "hack", "segur", "secur", "internet", "red", "network", "velocidad", "speed", "bateria", "procesador"] },
  "pixel-1bit-dither": { mood: "stark, Mac-classic, graphic", goodFor: "retro computing, minimalism, a deliberately austere look", avoid: "colour-coded data, progress, heat, most explainers", retroOnly: true, topics: ["retro", "mac", "minimal", "1-bit", "clasic"] },
  "pixel-cyberpunk-neon": { mood: "dark city, neon glow, rain", goodFor: "tech, AI, hacking, crypto, future, night, networks, cities, hardware", avoid: "kids or bright cheerful topics", retroOnly: false, topics: ["tecnolog", "tech", "ia", "ai", "inteligencia", "hack", "cripto", "crypto", "futuro", "future", "ciudad", "city", "chip", "procesador", "celular", "phone", "bateria", "datos", "data", "internet", "red", "robot"] },
  "pixel-noir": { mood: "serious, moody, one red accent", goodFor: "security, crime, mystery, privacy, investigations, serious news", avoid: "kids, cheerful or colour-coded explainers", retroOnly: false, topics: ["segur", "secur", "crimen", "crime", "misterio", "mystery", "privacidad", "privacy", "fraude", "fraud", "investig", "espia", "spy", "contrasena", "password"] },
  "pixel-dusk-lowres": { mood: "warm, calm, golden hour", goodFor: "nature, travel, reflection, food, stories, history, sunsets", avoid: "fast tech or night security", retroOnly: false, topics: ["naturaleza", "nature", "viaje", "travel", "historia", "history", "cocina", "food", "calma", "relax", "atardecer", "sunset"] },
  "pixel-c64": { mood: "chunky home-computer blue", goodFor: "retro computing, programming history, BASIC, hobby tech", avoid: "modern UI topics", retroOnly: false, topics: ["commodore", "c64", "programacion", "programming", "basic", "retro", "computadora"] },
  "pixel-gba-handheld": { mood: "saturated, cheerful, handheld", goodFor: "adventure, creatures, daily life, tutorials, school", avoid: "dark or serious topics", retroOnly: false, topics: ["aventura", "adventure", "escuela", "school", "tutorial", "criatura", "animal", "mascota", "pet"] },
  "pixel-liquid-fire": { mood: "hot and cold contrast, embers", goodFor: "heat vs cold, energy, chemistry, weather, cooling, power, engines", avoid: "calm or purely abstract topics", retroOnly: false, topics: ["calor", "heat", "frio", "cold", "temperatura", "energia", "energy", "fuego", "fire", "agua", "water", "clima", "enfri", "cool", "quema", "bateria"] },
  "pixel-vaporwave": { mood: "dreamy, pink-violet, aesthetic", goodFor: "music, culture, nostalgia of the 90s web, lifestyle, creative topics", avoid: "technical or serious topics", retroOnly: false, topics: ["musica", "music", "arte", "art", "cultura", "culture", "estetica", "aesthetic", "internet antiguo", "moda", "fashion"] },
  "pixel-virtual-red": { mood: "harsh red on black, Virtual Boy", goodFor: "Virtual Boy, horror, alarms, a deliberately harsh look", avoid: "almost everything else (4 red tones)", retroOnly: true, topics: ["virtual boy", "terror", "horror", "alarma", "alarm", "retro"] },
};
for (const s of STYLES) { const g = STYLE_GUIDE[s.id]; if (g) s.guide = { ...g, colors: s.palette.length, lowColor: !!s.mono || s.palette.length <= 8 }; }

const flatText = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\- ]+/g, " ");
/** Best styles for a topic text: keyword matches first, then a fixed friendly default order. Never returns a retro-only style unless the text asks for retro. */
export function recommendStyles(text, n = 3) {
  const t = ` ${flatText(text)} `, retro = RETRO_RE.test(t);
  const scored = STYLES.map((s, i) => {
    const g = STYLE_GUIDE[s.id]; if (g.retroOnly && !retro) return { id: s.id, score: -1, i };
    let score = 0; for (const k of g.topics) if (t.includes(k.length <= 3 ? ` ${k} ` : k)) score += 1;
    return { id: s.id, score, i };
  });
  const base = ["pixel-snes-16bit", "pixel-cyberpunk-neon", "pixel-crt-arcade"];
  scored.forEach((x) => { const b = base.indexOf(x.id); if (x.score >= 0) x.score += b >= 0 ? 0.3 - b * 0.05 : 0; });
  return scored.filter((x) => x.score >= 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, n).map((x) => x.id);
}
/** True when the text asks for a retro / handheld look (so a monochrome style is a deliberate choice). */
export const RETRO_RE = /\b(retro|handheld|game ?boy|nintendo|8 ?-?bits?|16 ?-?bits?|portatil|nostalg\w*|vintage|clasic\w*|antigu\w*|arcade|consola|virtual boy|dmg|noventa|ochenta|90s|80s)\b/;
