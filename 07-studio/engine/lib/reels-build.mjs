// Node side of the reels templates: plan + icons + staged assets for a build, and the cover stills.
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { extname, join } from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT } from "./env.mjs";
import { loadIcons } from "./icons.mjs";
import { CHROMIUM_OPTIONS } from "./render.mjs";
import { collectReelIcons, planReels } from "./reels.mjs";

export const REELS_PUBLIC = join(ENGINE_ROOT, "public", "reels");
export const COVER_COMPOSITION = "reels-cover";
export const COVER_CHECK_COMPOSITION = "reels-cover-check";

const isRemote = (s) => /^https?:\/\//i.test(s);

/** Copy fonts, sounds and textures into the job's public dir (sample images stay out). */
export function stageReelsPublic(pub) {
  cpSync(REELS_PUBLIC, join(pub, "reels"), { recursive: true, filter: (src) => !src.includes(`${join("reels", "samples")}`) });
}

/**
 * Copy the images a reels plan uses (scene `imagen`, `imagenes`, `peces.imagen`, cover `imagenes`) into the
 * job dir and point the plan at them. Paths resolve like other spec assets (absolute, next to the spec, or
 * from the content-creation root). Missing images are dropped and reported.
 * @returns {string[]} missing paths
 */
export function stageReelsImages(plan, pub, job, resolveAsset) {
  const missing = [];
  let n = 0;
  const stage = (p) => {
    if (typeof p !== "string" || !p) return null;
    if (isRemote(p)) {
      missing.push(`${p} (remote images are not supported; download it first)`);
      return null;
    }
    const full = resolveAsset(p);
    if (!full) {
      missing.push(p);
      return null;
    }
    const name = `${job}/reels-img-${n++}${extname(full).toLowerCase()}`;
    mkdirSync(join(pub, job), { recursive: true });
    copyFileSync(full, join(pub, name));
    return name;
  };
  for (const s of plan.scenes) {
    const p = s.p;
    if (typeof p.imagen === "string") {
      const r = stage(p.imagen);
      if (r) p.imagen = r;
      else delete p.imagen;
    }
    if (Array.isArray(p.imagenes)) p.imagenes = p.imagenes.map(stage).filter(Boolean);
    if (p.peces && typeof p.peces === "object" && typeof p.peces.imagen === "string") {
      const r = stage(p.peces.imagen);
      if (r) p.peces = { ...p.peces, imagen: r };
      else delete p.peces;
    }
  }
  plan.cover.imagenes = (plan.cover.imagenes ?? []).map(stage).filter(Boolean);
  return missing;
}

/**
 * Everything a reels build adds to the input props: the plan (`reels`) and the icons, with assets staged.
 * @returns {{reels: object, icons: object, missingIcons: string[], missingImages: string[]}}
 */
export function prepareReels({ spec, timeline, captions, pub, job, resolveAsset }) {
  const reels = planReels(spec, timeline, captions);
  stageReelsPublic(pub);
  const missingImages = stageReelsImages(reels, pub, job, resolveAsset);
  const { icons, missing } = loadIcons(collectReelIcons(spec));
  return { reels, icons, missingIcons: missing, missingImages };
}

/** Render the cover (cover.jpg) and the 9:16 / 3:4 / grid crop check (cover-check.png). */
export async function renderReelsCover({ serveUrl, inputProps, outDir }) {
  const out = { cover: join(outDir, "cover.jpg"), check: join(outDir, "cover-check.png") };
  const cover = await selectComposition({ serveUrl, id: COVER_COMPOSITION, inputProps, logLevel: "error", chromiumOptions: CHROMIUM_OPTIONS });
  await renderStill({ composition: cover, serveUrl, output: out.cover, frame: 0, imageFormat: "jpeg", jpegQuality: 92, inputProps, logLevel: "error", chromiumOptions: CHROMIUM_OPTIONS });
  const check = await selectComposition({ serveUrl, id: COVER_CHECK_COMPOSITION, inputProps, logLevel: "error", chromiumOptions: CHROMIUM_OPTIONS });
  await renderStill({ composition: check, serveUrl, output: out.check, frame: 0, imageFormat: "png", inputProps, logLevel: "error", chromiumOptions: CHROMIUM_OPTIONS });
  return out;
}

export const reelsPublicReady = () => existsSync(join(REELS_PUBLIC, "fonts"));
