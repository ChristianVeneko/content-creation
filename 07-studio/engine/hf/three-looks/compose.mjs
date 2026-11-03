// compose(): validated payload + narration words -> deterministic HyperFrames composition (index.html + assets).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { HERE, RUNTIME_DIR, ASSETS_ROOT, MODELS, HDRI_FILE, FONT_FILES, runtimeFiles, modelsFor, jsonCat } from "./catalog.mjs";
import { payloadSchema } from "./schema.mjs";
import { normalizePayload } from "./normalize.mjs";
import { resolvePayload, WORLD_SPACING } from "./resolve.mjs";
import { ZONES } from "./layout.mjs";

const VENDOR = join(HERE, "vendor", "three-bundle.js");

function findAsset(rel, assetsDir) {
  const cands = [assetsDir && join(assetsDir, "3d", rel), join(ASSETS_ROOT, "3d", rel)].filter(Boolean);
  const hit = cands.find((p) => existsSync(p));
  if (!hit) throw new Error(`three-looks: asset ${rel} not found (looked in ${cands.join(", ")})`);
  return hit;
}
function findFont(name, assetsDir) {
  const cands = [assetsDir && join(assetsDir, "fonts", name), join(ASSETS_ROOT, "fonts", name)].filter(Boolean);
  const hit = cands.find((p) => existsSync(p));
  if (!hit) throw new Error(`three-looks: font ${name} not found (looked in ${cands.join(", ")})`);
  return hit;
}

/** The composition script: data prelude (spec, catalog subset, style, zones, asset urls) followed by the runtime files in load order. */
export function buildScript({ data, style, modelIds }) {
  const rt = runtimeFiles().map((f) => readFileSync(join(RUNTIME_DIR, f), "utf8"));
  const settings = [...new Set(data.worlds.map((w) => w.setting))];
  const asset = { hdri: `assets/${HDRI_FILE}`, models: Object.fromEntries(modelIds.map((id) => [id, `assets/${MODELS[id].file}`])) };
  const styleData = { id: style.id, material: style.material, light: style.light, moods: style.moods, post: style.post, cap: style.cap, tag: style.tag, transition: style.transition };
  const prelude = `const SPEC=${JSON.stringify({ ...data, spacing: WORLD_SPACING })};\nconst CAT=${JSON.stringify(jsonCat(settings))};\nconst STYLE=${JSON.stringify(styleData)};\nconst ZONES=${JSON.stringify(ZONES)};\nconst ASSET=${JSON.stringify(asset)};\n`;
  return [prelude, ...rt].join("\n");
}

export function buildHtml({ data, style, modelIds }) {
  const js = buildScript({ data, style, modelIds });
  const tpl = readFileSync(join(HERE, "template.html"), "utf8");
  const bg = style.moods.warm.bg;
  return tpl
    .replace(/__DUR__/g, String(data.dur)).replace(/__LANG__/g, "und").replace(/__CAPS__/g, data.capsDefault ? "true" : "false").replace(/__BG__/g, bg)
    .replace(/__LABELPX__/g, String(ZONES.labelPx)).replace(/__STAMPPX__/g, String(ZONES.stampPx)).replace(/__STAMPY__/g, String(ZONES.stamp.y)).replace(/__CAPTOP__/g, String(ZONES.captions.top)).replace(/__CAPPX__/g, String(ZONES.captionPx))
    .replace(/__TAGINK__/g, style.tag.ink).replace(/__TAGBG__/g, style.tag.bg).replace(/__TAGBORDER__/g, style.tag.border)
    .replace(/__CAPFG__/g, style.cap.fg).replace(/__CAPINK__/g, style.cap.ink).replace(/__CAPHI__/g, style.cap.hi).replace(/__CAPHIINK__/g, style.cap.hiInk)
    .replace("/*__JS__*/", () => js);
}

/** Every model id a payload needs: cast models plus the props and decor of its settings. */
export const modelsOf = (data) => modelsFor([...new Set(data.worlds.map((w) => w.setting))], data.worlds.flatMap((w) => w.cast.map((c) => c.model)));

/** @returns {Promise<{entry:string, sfx:Array<{at:number,kind:string}>, durationSec:number, warnings:string[]}>} */
export async function compose({ spec, words, durationSec, outDir, assetsDir, captions } = {}) {
  if (!outDir) throw new Error("three-looks compose: outDir is required");
  const raw = spec?.hf ?? spec ?? {};
  const parsed = payloadSchema.safeParse(normalizePayload(raw));
  if (!parsed.success) throw new Error(`three-looks payload is invalid:\n${parsed.error.issues.map((i) => `  - hf.${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  const mode = spec?.mode === "single" ? "single" : "multi";
  const { data, sfx, warnings, durationSec: dur, style } = resolvePayload({ payload: parsed.data, words: words ?? [], durationSec: durationSec ?? spec?.durationSec, mode, captionsEnabled: captions?.enabled !== false });
  const modelIds = modelsOf(data);
  const root = pathResolve(outDir);
  mkdirSync(join(root, "assets", "fonts"), { recursive: true });
  for (const f of FONT_FILES) copyFileSync(findFont(f, assetsDir), join(root, "assets", "fonts", f));
  for (const rel of [HDRI_FILE, ...modelIds.map((id) => MODELS[id].file)]) { const dst = join(root, "assets", rel); mkdirSync(dirname(dst), { recursive: true }); copyFileSync(findAsset(rel, assetsDir), dst); }
  copyFileSync(VENDOR, join(root, "assets", "three-bundle.js"));
  writeFileSync(join(root, "index.html"), buildHtml({ data, style, modelIds }));
  const proj = (name, obj) => { const p = join(root, name); if (!existsSync(p)) writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); };
  proj("hyperframes.json", { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } });
  proj("meta.json", { id: "three-looks", name: "three-looks", createdAt: "2026-01-01T00:00:00.000Z" });
  return { entry: "index.html", sfx, durationSec: dur, warnings };
}
