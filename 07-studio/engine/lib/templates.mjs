// Template registry: reads templates/*.json (defaults + gallery metadata).
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TEMPLATE_IDS, canonicalTemplateId } from "./spec.mjs";
import { ILLUSTRATED_TEMPLATE_IDS } from "./illustrated.mjs";
import { lookSchema } from "./illustration-schema.mjs";

export const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "templates");

/** Canonical order: the spec's TEMPLATE_IDS, then any illustrated-kit template not listed there yet. */
export const templateOrder = () => [...TEMPLATE_IDS, ...ILLUSTRATED_TEMPLATE_IDS.filter((id) => !TEMPLATE_IDS.includes(id))];

/** Throws when a template's format (optional kebab slug) or look (defaults.theme.look) is not a known look. */
export const FORMAT_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateTemplate(t) {
  if (t?.format !== undefined && !(typeof t.format === "string" && FORMAT_SLUG.test(t.format))) {
    throw new Error(`Template "${t.id}": format must be a kebab slug (a-z, 0-9, hyphens), got ${JSON.stringify(t.format)}`);
  }
  const look = t?.defaults?.theme?.look;
  if (look === undefined) return t;
  const r = lookSchema.safeParse(look);
  if (!r.success) throw new Error(`Template "${t.id}": ${r.error.issues[0].message}`);
  return t;
}

/** All templates, in the canonical order. */
export function listTemplates(dir = TEMPLATES_DIR) {
  const byId = new Map(
    readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => validateTemplate(JSON.parse(readFileSync(join(dir, f), "utf8"))))
      .map((t) => ({ ...t, format: t.format ?? t.id }))
      .map((t) => [t.id, t]),
  );
  return templateOrder().filter((id) => byId.has(id)).map((id) => byId.get(id));
}

export function getTemplate(id, dir = TEMPLATES_DIR) {
  const want = canonicalTemplateId(id);
  const t = listTemplates(dir).find((x) => x.id === want);
  if (!t) throw new Error(`Unknown template "${id}". Available: ${templateOrder().join(", ")}`);
  return t;
}
