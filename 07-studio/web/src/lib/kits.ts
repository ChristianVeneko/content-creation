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

/** What to type in Claude Code to make a video in this style. */
export function styleRequest(style: KitStyle): string {
  return `/video <tu idea> con estilo de cine en código: ${style.name} (${style.slug})`;
}
