// Node-only helpers for the 3D templates: stage the local CC0 assets a spec needs (HDRI, GLB models) into the
// per-job Remotion public dir and load the Phosphor icons used by 3D objects. Never imported by the bundle.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CC_ROOT } from "./env.mjs";
import { RENDER3D, collectIconNames3d, collectModelIds, look3dOf } from "./scene3d.mjs";
import { loadIcons } from "./icons.mjs";

export const ASSETS_3D = join(CC_ROOT, "03-assets", "3d");
/** Environment HDRI per look (ids from 03-assets/3d/licenses.json), from the render profile. Looks without one light with Lightformers. */
export const LOOK_HDRI = Object.fromEntries(Object.entries(RENDER3D).filter(([, r]) => r.hdri).map(([id, r]) => [id, r.hdri]));

export const readCatalog = (dir = ASSETS_3D) => JSON.parse(readFileSync(join(dir, "licenses.json"), "utf8"));

/**
 * Copy the HDRI of the spec's look and every referenced model (objects, default cars/characters, set props) into
 * `<pubDir>/3d/`.
 * @returns {{three: {hdri: string|null, models: Record<string,string>}, missing: string[], credits: string[]}}
 */
export function stageThreeAssets(spec, pubDir, dir = ASSETS_3D) {
  const cat = readCatalog(dir);
  const missing = [];
  const credits = [];
  const stage = (entry) => {
    const src = join(dir, entry.file);
    if (!existsSync(src)) {
      missing.push(entry.file);
      return null;
    }
    const rel = `3d/${entry.file}`;
    mkdirSync(dirname(join(pubDir, rel)), { recursive: true });
    copyFileSync(src, join(pubDir, rel));
    credits.push(`${entry.title}: ${entry.credit}, ${entry.source}`);
    return rel;
  };
  const hdriId = LOOK_HDRI[look3dOf(spec)];
  const hdriEntry = hdriId ? cat.hdri.find((h) => h.id === hdriId) : null;
  const hdri = hdriEntry ? stage(hdriEntry) : null;
  const models = {};
  for (const id of collectModelIds(spec)) {
    const m = cat.models.find((x) => x.id === id);
    if (!m) {
      missing.push(id);
      continue;
    }
    const rel = stage(m);
    if (rel) models[id] = rel;
  }
  return { three: { hdri, models }, missing, credits };
}

/** Phosphor icons used by 3D objects (`icon` field). */
export const loadThreeIcons = (spec) => loadIcons(collectIconNames3d(spec));
