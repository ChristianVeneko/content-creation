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
    examples: ["/video cómo funciona una VPN en 45 segundos", "/video 5 errores al pedir un préstamo, formato ranking"],
    delivers: ["video.mp4 (1080x1920, 30 fps, -14 LUFS)", "cover.jpg", "post.md con título, descripción y hashtags"],
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
    examples: ["/video por qué el Titanic no tenía suficientes botes, estilo cine en código: Expediente de semitono", "/video cómo viaja un correo electrónico, estilo cine en código: Pizarra de tiza"],
    delivers: ["video.mp4 (1080x1920, 30 fps, -14 LUFS)", "cover.jpg", "post.md con título, descripción y hashtags", "film/ con el código de la película"],
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
    examples: ["/video la mano de Dios de Maradona en caricatura", "/video el día que Apple presentó el iPhone en caricatura"],
    delivers: ["video.mp4 (1080x1920, 30 fps, -14 LUFS)", "cover.jpg", "post.md con título, descripción y hashtags", "reel/sources.md con cada dato y su fuente"],
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
    examples: ["/video cuánto pesa una nube, como ciencia animada", "/video por qué el cielo es azul, como ciencia animada"],
    delivers: ["video.mp4 (1080x1920, 30 fps, -14 LUFS)", "cover.jpg", "post.md con título, descripción y hashtags", "sources.md con cada dato y su fuente"],
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
    examples: ["/video qué pasa si cavas un pozo en tu patio, patio en corte 3D", "/video cómo llega el agua a tu casa, patio en corte 3D"],
    delivers: ["video.mp4 (1080x1920, 30 fps, -14 LUFS)", "cover.jpg", "post.md con título, descripción y hashtags", "story/ con la escena de Blender"],
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
    examples: ["/video imagina que un agente de IA borra producción un viernes, historia de supervivencia 3D", "/video imagina que instalas un paquete npm envenenado, historia de supervivencia 3D"],
    delivers: ["video.mp4 (1080x1920, 30 fps, -14 LUFS)", "cover.jpg", "post.md con título, descripción y hashtags"],
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
  order: number;
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
    if (c && !rows.has(c[2])) rows.set(c[2], { order: rows.size, name: c[1], group, does: c[3], effort: c[4] });
  }
  return rows;
}

/** Styles in catalog order (the Spanish doc's groups first to last); styles missing from it go last. */
export function opuscarStyles(root: string): KitStyle[] {
  const catalog = readCatalog(root);
  const at = (slug: string) => catalog.get(slug)?.order ?? Number.MAX_SAFE_INTEGER;
  const slugs = styleSlugs(root).sort((a, b) => at(a) - at(b) || a.localeCompare(b));
  return slugs.map((slug) => {
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
