import { esDibujo, type IconoRef } from "../piezas/dibujo";

// Ayudas para leer y comprobar las propiedades de las escenas que vienen del plan (JSON).

export const txt = (p: Record<string, unknown>, k: string, def = ""): string => (typeof p[k] === "string" ? (p[k] as string) : typeof p[k] === "number" ? String(p[k]) : def);
export const num = (p: Record<string, unknown>, k: string, def = 0): number => (typeof p[k] === "number" ? (p[k] as number) : typeof p[k] === "string" && !isNaN(Number(p[k])) ? Number(p[k]) : def);
export const bool = (p: Record<string, unknown>, k: string, def = false): boolean => (typeof p[k] === "boolean" ? (p[k] as boolean) : def);
export const arr = <T = unknown>(p: Record<string, unknown>, k: string): T[] => (Array.isArray(p[k]) ? (p[k] as T[]) : []);
export const obj = (p: Record<string, unknown>, k: string): Record<string, unknown> => (p[k] && typeof p[k] === "object" && !Array.isArray(p[k]) ? (p[k] as Record<string, unknown>) : {});

/** Elemento de lista que puede venir como texto o como {texto, icono}. */
export const item = (x: unknown): { texto: string; icono?: IconoRef } =>
  typeof x === "string" ? { texto: x } : x && typeof x === "object" ? { texto: String((x as Record<string, unknown>).texto ?? ""), icono: ico(x as Record<string, unknown>, "icono") || undefined } : { texto: String(x ?? "") };

/** An icon slot: an icon name or the agent's drawing ("" when empty). */
export const ico = (p: Record<string, unknown>, k: string): IconoRef | "" => (typeof p[k] === "string" ? (p[k] as string) : esDibujo(p[k]) ? p[k] : "");

/** Normaliza para comparar palabras (sin tildes ni signos). */
export const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");
