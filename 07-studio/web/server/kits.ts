// The video kits the /video skill can drive, for the "Motores" view: which ones are on disk, and the opuscar
// style gallery (style.json in each style folder, joined with the Spanish catalog in 00-docs/opuscar-styles.md).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { KitInfo, KitStyle } from "../shared/types.ts";

type KitCopy = Omit<KitInfo, "available" | "styles"> & { folder?: string };

const KITS: KitCopy[] = [
  {
    id: "engine",
    name: "Plantillas del motor",
    look: "Formatos listos: pixel animado, 2D animado, datos, ranking, mundos 3D y tipografía cinética",
    bestFor: "Explicadores rápidos, listas y tutoriales con tu paleta y tu voz",
    length: "15 s a 3 min",
    renderTime: "2-6 min",
    ask: "/video <idea> (elige un formato en el paso 1)",
    researched: true,
  },
  {
    id: "opuscar",
    folder: "05-tools/opuscar",
    name: "Cine en código",
    look: "66 estilos de película hechos en código: tiza, acuarela, satélite, despiece, anime 80s, cine mudo…",
    bestFor: "Historias con un look de autor; cada estilo fija color, tipografía, movimiento y sonido",
    length: "30-60 s",
    renderTime: "Según el estilo: 2D rápido, three.js lento",
    ask: "/video <idea> con estilo de cine en código (<estilo>)",
    researched: true,
  },
  {
    id: "moment-reel",
    folder: "05-tools/moment-reel",
    name: "Momento famoso en caricatura",
    look: "Caricatura 2D plana con contornos gruesos y caras expresivas, congelados en el instante clave",
    bestFor: "Cómo pasó un momento famoso: una jugada, un lanzamiento, un juicio, un descubrimiento",
    length: "30-50 s",
    renderTime: "~15 min de máquina",
    ask: "/video el momento de <hecho> en caricatura",
    researched: true,
  },
  {
    id: "science-shorts",
    folder: "05-tools/science-shorts",
    name: "Ciencia animada",
    look: "Vector plano con objetos que tienen cara, etiquetas que saltan en su palabra y una tarjeta de título",
    bestFor: "Un dato de ciencia sorprendente: cuánto pesa, qué tan grande, por qué pasa",
    length: "45-80 s",
    renderTime: "~10 min",
    ask: "/video <dato de ciencia> como ciencia animada",
    researched: true,
  },
  {
    id: "whatif-3d",
    folder: "05-tools/whatif-3d",
    name: "Patio en corte 3D",
    look: "Una casa y su patio sobre la tierra cortada como un pastel, en Blender",
    bestFor: "Cómo funciona un sistema cotidiano bajo tierra o en el patio, paso a paso",
    length: "60-75 s",
    renderTime: "Lento: ~2,5 h para 90 s en Blender",
    ask: "/video qué pasa si <idea> en patio en corte 3D",
    researched: false,
  },
  {
    id: "story-video",
    folder: "05-tools/story-video",
    name: "Historia de supervivencia 3D",
    look: "Thriller en segunda persona con reloj, reglas en stickers, sets low-poly y monigotes 2D",
    bestFor: "Un relato de terror tecnológico con giro final y dos opciones para los comentarios",
    length: "60-75 s",
    renderTime: "30-60 min en CPU",
    ask: "/video imagina que <situación> como historia de supervivencia 3D",
    researched: false,
  },
];

const SLUG = /^[a-z0-9][a-z0-9-]{0,60}$/;

function stylesDir(root: string): string {
  return path.join(root, "05-tools", "opuscar", "styles");
}

function styleSlugs(root: string): string[] {
  const dir = stylesDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && SLUG.test(d.name) && existsSync(path.join(dir, d.name, "style.json")))
    .map((d) => d.name)
    .sort();
}

export function listKits(root: string): KitInfo[] {
  return KITS.map(({ folder, ...k }) => {
    const kit: KitInfo = { ...k, available: !folder || existsSync(path.join(root, folder)) };
    if (k.id === "opuscar" && kit.available) kit.styles = styleSlugs(root).length;
    return kit;
  });
}

interface CatalogRow {
  name: string;
  group: string;
  does: string;
  effort: string;
}

/** Rows "| Name | `slug` | what it does | effort |" under "## Group" headings. */
function readCatalog(root: string): Map<string, CatalogRow> {
  const file = path.join(root, "00-docs", "opuscar-styles.md");
  const rows = new Map<string, CatalogRow>();
  if (!existsSync(file)) return rows;
  let group = "";
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      group = h[1];
      continue;
    }
    const c = line.match(/^\|\s*([^|]+?)\s*\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/);
    if (c && !rows.has(c[2])) rows.set(c[2], { name: c[1], group, does: c[3], effort: c[4] });
  }
  return rows;
}

export function opuscarStyles(root: string): KitStyle[] {
  const catalog = readCatalog(root);
  return styleSlugs(root).map((slug) => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(readFileSync(path.join(stylesDir(root), slug, "style.json"), "utf8"));
    } catch {
      /* a malformed style.json still lists the style by its folder */
    }
    const row = catalog.get(slug);
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      slug,
      name: row?.name || str(meta.en) || slug,
      group: row?.group || "Otros",
      does: row?.does || str(meta.line),
      effort: row?.effort || "",
      film: str(meta.film),
      line: str(meta.line),
      durationSec: typeof meta.dur === "number" ? meta.dur : undefined,
      still: existsSync(path.join(stylesDir(root), slug, "demo", "stills", "styleframe.jpg")),
    };
  });
}

/** The style's frame, only for a listed slug that has one (never a path built from raw input). */
export function styleStill(root: string, slug: string): string | null {
  if (!SLUG.test(slug) || !styleSlugs(root).includes(slug)) return null;
  const file = path.join(stylesDir(root), slug, "demo", "stills", "styleframe.jpg");
  return existsSync(file) ? file : null;
}
