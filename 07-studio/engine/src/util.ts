/** Hex (#RGB/#RRGGBB) to rgba() with alpha. */
export const rgba = (hex: string, a: number) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Relative luminance 0..1, to pick readable ink on accent backgrounds. */
export const luminance = (hex: string) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

export const inkOn = (bgHex: string) => (luminance(bgHex) > 0.45 ? "#0B0B0F" : "#FFFFFF");

export const isRemote = (src: string) => /^https?:\/\//i.test(src);

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Average glyph width (em) of uppercase text per bundled font; conservative estimates. */
const CHAR_EM: Record<string, number> = {
  Montserrat: 0.66,
  Poppins: 0.68,
  "Archivo Black": 0.7,
  Inter: 0.62,
  Anton: 0.44,
  "Bebas Neue": 0.4,
  Oswald: 0.47,
  Bangers: 0.52,
};

/**
 * Largest font size (<= max) at which the longest word of `text` fits in `width` px,
 * so single words never overflow the safe zone.
 */
export const fitSize = (text: string, max: number, width: number, font: string, uppercase = true) => {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => [...w].length));
  const em = (CHAR_EM[font] ?? 0.66) * (uppercase ? 1 : 0.86);
  return Math.floor(Math.min(max, width / (longest * em)));
};
