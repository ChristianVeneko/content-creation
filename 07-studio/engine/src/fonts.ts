import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

type FontFile = { family: string; file: string; weight: string };

const FONTS: FontFile[] = [
  { family: "Montserrat", file: "Montserrat-Black.ttf", weight: "900" },
  { family: "Montserrat", file: "Montserrat-ExtraBold.ttf", weight: "800" },
  { family: "Montserrat", file: "Montserrat-Bold.ttf", weight: "700" },
  { family: "Poppins", file: "Poppins-Black.ttf", weight: "900" },
  { family: "Poppins", file: "Poppins-Bold.ttf", weight: "700" },
  { family: "Inter", file: "Inter-Variable.ttf", weight: "100 900" },
  { family: "Anton", file: "Anton-Regular.ttf", weight: "400" },
  { family: "Bebas Neue", file: "BebasNeue-Regular.ttf", weight: "400" },
  { family: "Archivo Black", file: "ArchivoBlack-Regular.ttf", weight: "400" },
  { family: "Bangers", file: "Bangers-Regular.ttf", weight: "400" },
  { family: "Oswald", file: "Oswald-Variable.ttf", weight: "200 700" },
  { family: "JetBrains Mono", file: "JetBrainsMono-500.woff2", weight: "500" },
  { family: "JetBrains Mono", file: "JetBrainsMono-700.woff2", weight: "700" },
  { family: "JetBrains Mono", file: "JetBrainsMono-800.woff2", weight: "800" },
  // pixel fonts (OFL): Pixelify Sans for reading, Press Start 2P for banners, Silkscreen for small tags
  { family: "Pixelify Sans", file: "PixelifySans-Variable.ttf", weight: "400 700" },
  { family: "Press Start 2P", file: "PressStart2P-Regular.ttf", weight: "400" },
  { family: "Silkscreen", file: "Silkscreen-Regular.ttf", weight: "400" },
];

/** Display fonts that only ship one (heavy) weight. */
const SINGLE_WEIGHT = new Set(["Anton", "Bebas Neue", "Archivo Black", "Bangers", "Press Start 2P", "Silkscreen"]);

let loading: Promise<void> | null = null;

/** Idempotent: loads every bundled font once and blocks rendering until they are ready. */
export const ensureFonts = (): void => {
  if (loading || typeof document === "undefined") return;
  const handle = delayRender("Loading fonts");
  loading = Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url('${staticFile(`fonts/${f.file}`)}') format('${f.file.endsWith(".woff2") ? "woff2" : "truetype"}')`, { weight: f.weight })
        .load()
        .then((face) => {
          document.fonts.add(face);
        }),
    ),
  )
    .then(() => continueRender(handle))
    .catch((e) => cancelRender(e));
};

export const fontStack = (family: string) => `'${family}', 'Montserrat', 'Inter', system-ui, sans-serif`;

/** Heaviest available weight for a family. */
export const heavyWeight = (family: string) => (SINGLE_WEIGHT.has(family) ? 400 : 900);

/** Body text font: geometric sans that pairs with any display font. */
export const BODY_FONT = fontStack("Inter");

/** Monospace for labels, code and HUD. */
export const MONO_FONT = "'JetBrains Mono', ui-monospace, Menlo, monospace";

/** Pixel fonts (OFL): Pixelify Sans for legible pixel captions, Press Start 2P for short pixel labels. */
export const PIXEL_FONT = "'Pixelify Sans', 'Press Start 2P', ui-monospace, monospace";
export const PIXEL_LABEL_FONT = "'Press Start 2P', 'Pixelify Sans', ui-monospace, monospace";
export const BANNER_FONT = "'Press Start 2P', 'Pixelify Sans', monospace";
export const TAG_FONT = "'Silkscreen', 'Pixelify Sans', monospace";
