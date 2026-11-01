// Curated palette presets that apply to any template through spec.theme.palette.
// Pure data + helpers (no Node imports). Every palette keeps text readable on both background
// stops (WCAG contrast >= 4.5:1, enforced by test/palettes.test.mjs).

/** Tag vocabulary used by the studio's palette filter. Every palette is exactly one of dark / light. */
export const PALETTE_TAGS = ["dark", "light", "warm", "cool", "neon", "pastel", "earthy", "brand-like", "mono"];

/**
 * @typedef {{ bg: [string, string], text: string, accent: string, accent2: string, accent3: string }} Palette
 * @typedef {{ id: string, name: string, description: string, tags: string[], palette: Palette }} PalettePreset
 */

/** @type {PalettePreset[]} */
export const PALETTES = [
  {
    id: "medianoche",
    name: "Medianoche",
    description: "Azul tinta profundo con ámbar cálido. Serio y nocturno.",
    tags: ["dark", "cool", "brand-like"],
    palette: { bg: ["#0B1020", "#18223F"], text: "#F4F6FF", accent: "#FFB547", accent2: "#7C8CFF", accent3: "#38D0FF" },
  },
  {
    id: "neon-tokio",
    name: "Neón Tokio",
    description: "Negro violeta con magenta y cian eléctricos.",
    tags: ["dark", "neon", "cool"],
    palette: { bg: ["#0D0221", "#261447"], text: "#F9F7FF", accent: "#FF2E97", accent2: "#00F0FF", accent3: "#F9F871" },
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Fósforo verde sobre negro de consola.",
    tags: ["dark", "neon", "mono"],
    palette: { bg: ["#050806", "#0E1A12"], text: "#D8FFE0", accent: "#39FF88", accent2: "#FFD23F", accent3: "#4CC9F0" },
  },
  {
    id: "brasa",
    name: "Brasa",
    description: "Carbón con naranja fuego y rojo. Energía y urgencia.",
    tags: ["dark", "warm"],
    palette: { bg: ["#140A06", "#2A120A"], text: "#FFF4EC", accent: "#FF6B2C", accent2: "#FFC94A", accent3: "#FF3B3B" },
  },
  {
    id: "bosque",
    name: "Bosque",
    description: "Verde musgo oscuro con lima y crema.",
    tags: ["dark", "earthy"],
    palette: { bg: ["#0C1A12", "#16301F"], text: "#F1F7E9", accent: "#B8E05A", accent2: "#F2C14E", accent3: "#7FD1B9" },
  },
  {
    id: "oceano",
    name: "Océano",
    description: "Azul petróleo con turquesa y coral.",
    tags: ["dark", "cool"],
    palette: { bg: ["#04202C", "#0A3A4A"], text: "#EAFBFF", accent: "#2EE6C5", accent2: "#FF7F6B", accent3: "#FFD166" },
  },
  {
    id: "vino",
    name: "Vino",
    description: "Burdeos profundo con oro viejo. Elegante.",
    tags: ["dark", "warm", "brand-like"],
    palette: { bg: ["#1E0710", "#3A0F1F"], text: "#FFF1F3", accent: "#E8B04B", accent2: "#FF6F91", accent3: "#C9A7FF" },
  },
  {
    id: "grafito",
    name: "Grafito",
    description: "Grises de grafito con un solo acento amarillo señal.",
    tags: ["dark", "mono", "brand-like"],
    palette: { bg: ["#121212", "#262626"], text: "#F5F5F5", accent: "#FFE600", accent2: "#BDBDBD", accent3: "#FF5A36" },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Índigo nocturno con verde boreal y lila.",
    tags: ["dark", "cool", "neon"],
    palette: { bg: ["#0A0F2C", "#1B1446"], text: "#F3F0FF", accent: "#5CFFB0", accent2: "#B794FF", accent3: "#FF8BD0" },
  },
  {
    id: "papel",
    name: "Papel",
    description: "Papel crema con tinta casi negra y rojo editorial.",
    tags: ["light", "warm", "brand-like"],
    palette: { bg: ["#FBF6EC", "#F1E8D6"], text: "#1C1A17", accent: "#D7263D", accent2: "#1B4D89", accent3: "#E0A100" },
  },
  {
    id: "algodon",
    name: "Algodón",
    description: "Rosa y lavanda pastel con tinta ciruela.",
    tags: ["light", "pastel"],
    palette: { bg: ["#FFF0F5", "#EDE7FF"], text: "#2B1B3A", accent: "#E04E8A", accent2: "#6D5BD0", accent3: "#2FA58E" },
  },
  {
    id: "menta",
    name: "Menta",
    description: "Menta fresca con verde botella y mandarina.",
    tags: ["light", "pastel", "cool"],
    palette: { bg: ["#EAFBF3", "#D3F3E4"], text: "#0F2E22", accent: "#0E8F5B", accent2: "#F2711C", accent3: "#3366CC" },
  },
  {
    id: "arena",
    name: "Arena",
    description: "Arena y terracota con verde oliva. Cálido y natural.",
    tags: ["light", "earthy", "warm"],
    palette: { bg: ["#F5EBDD", "#EBDCC5"], text: "#2E2016", accent: "#C4552B", accent2: "#5F7A3A", accent3: "#B8860B" },
  },
  {
    id: "cielo",
    name: "Cielo",
    description: "Azul cielo claro con azul cobalto y amarillo sol.",
    tags: ["light", "cool", "brand-like"],
    palette: { bg: ["#EEF5FF", "#DCEBFF"], text: "#0B1F44", accent: "#1F5BFF", accent2: "#FFB000", accent3: "#00A6A6" },
  },
  {
    id: "limonada",
    name: "Limonada",
    description: "Amarillo limón suave con negro y fucsia.",
    tags: ["light", "warm", "pastel"],
    palette: { bg: ["#FFFBE0", "#FFF2A8"], text: "#1A1A1A", accent: "#E5197A", accent2: "#0077B6", accent3: "#2E9E44" },
  },
  {
    id: "pizarra",
    name: "Pizarra",
    description: "Pizarra verde de aula con tiza blanca y amarilla.",
    tags: ["dark", "earthy"],
    palette: { bg: ["#17302A", "#21423A"], text: "#F4F1E8", accent: "#FFE07A", accent2: "#FF9C8A", accent3: "#9FD8FF" },
  },
  {
    id: "terracota",
    name: "Terracota",
    description: "Barro cocido oscuro con mostaza y salvia.",
    tags: ["dark", "earthy", "warm"],
    palette: { bg: ["#2A1610", "#46261A"], text: "#FFF3E6", accent: "#F2A541", accent2: "#A3C49A", accent3: "#E86A4B" },
  },
  {
    id: "monocromo",
    name: "Monocromo",
    description: "Blanco y negro puro con rojo como único color.",
    tags: ["light", "mono", "brand-like"],
    palette: { bg: ["#FFFFFF", "#ECECEC"], text: "#0A0A0A", accent: "#E10600", accent2: "#0A0A0A", accent3: "#6B6B6B" },
  },
  {
    id: "sintetico",
    name: "Sintético",
    description: "Ochentero: púrpura, rosa neón y amarillo atardecer.",
    tags: ["dark", "neon", "warm"],
    palette: { bg: ["#1A0B2E", "#3B0D4C"], text: "#FFF5FB", accent: "#FF4FD8", accent2: "#FFC857", accent3: "#4DEEEA" },
  },
  {
    id: "clinico",
    name: "Clínico",
    description: "Blanco clínico con azul quirófano y verde salud.",
    tags: ["light", "cool"],
    palette: { bg: ["#F7FBFC", "#E4F1F4"], text: "#0E2A33", accent: "#0F7C90", accent2: "#1FA463", accent3: "#F25F5C" },
  },
];

const byId = new Map(PALETTES.map((p) => [p.id, p]));

/** @returns {PalettePreset | undefined} */
export const getPalette = (id) => byId.get(id);

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #RRGGBB color. */
export function luminance(hex) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two #RRGGBB colors (1..21). */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
