// Pure helpers for the "Motores" view: style search, grouping and the /video request a style card copies.
import type { KitStyle } from "../../shared/types.ts";

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Every word of the query appears in the style's name, slug, group, description or demo film. */
export function matchesStyle(style: KitStyle, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = fold([style.name, style.slug, style.group, style.does, style.film, style.line].join(" "));
  return words.every((w) => hay.includes(w));
}

/** Groups in catalog order (first appearance), each with its styles. */
export function groupStyles(styles: KitStyle[]): { group: string; items: KitStyle[] }[] {
  const out = new Map<string, KitStyle[]>();
  for (const s of styles) out.set(s.group, [...(out.get(s.group) ?? []), s]);
  return [...out].map(([group, items]) => ({ group, items }));
}

export const EFFORT_LABEL: Record<string, string> = { B: "Render rápido", M: "Render medio", A: "Render lento" };

// A concrete topic per catalog group, so the copied request is a real example, not a template.
const GROUP_TOPICS: [RegExp, string][] = [
  [/explicar/i, "cómo viaja un correo electrónico"],
  [/datos|ranking/i, "los 5 países que más café toman"],
  [/historia|misterio/i, "el misterio del vuelo MH370"],
  [/terror|liminal|suspenso/i, "la señal Wow! que nadie volvió a escuchar"],
  [/caricatura|anime|humor/i, "por qué los gatos tiran cosas de la mesa"],
  [/cuentos|infantil/i, "cómo nace una mariposa"],
  [/3d|materiales/i, "qué hay dentro de un teléfono"],
  [/edición|noticias/i, "lo que cambió en la inteligencia artificial este mes"],
  [/juegos/i, "cómo se hizo el primer videojuego"],
];

/** What to type in Claude Code to make a video in this style: a real topic that fits its group. */
export function styleRequest(style: KitStyle): string {
  const topic = GROUP_TOPICS.find(([re]) => re.test(style.group))?.[1] ?? "cómo funciona una VPN";
  return `/video ${topic}, estilo cine en código: ${style.name} (${style.slug})`;
}
