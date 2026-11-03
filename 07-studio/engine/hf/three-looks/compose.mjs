// compose(): validated payload + narration words -> deterministic HyperFrames composition (index.html + fonts + the vendored three.js bundle).
// Default output has no model files at all: every model is built in code at load time. Stock GLBs (and the loader bundle) are copied ONLY
// when the payload sets `stock: true`.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { HERE, RUNTIME_DIR, ASSETS_ROOT, STOCK_MODELS, FONT_FILES, runtimeFiles } from "./catalog.mjs";
import { payloadSchema } from "./schema.mjs";
import { normalizePayload } from "./normalize.mjs";
import { resolvePayload } from "./resolve.mjs";
import { ZONES } from "./layout.mjs";

const VENDOR = join(HERE, "vendor", "three-bundle.js"), VENDOR_STOCK = join(HERE, "vendor", "three-stock.js");

function findAsset(rel, assetsDir) {
  const cands = [assetsDir && join(assetsDir, "3d", rel), join(ASSETS_ROOT, "3d", rel)].filter(Boolean);
  const hit = cands.find((p) => existsSync(p));
  if (!hit) throw new Error(`three-looks: stock asset ${rel} not found (looked in ${cands.join(", ")})`);
  return hit;
}
function findFont(name, assetsDir) {
  const cands = [assetsDir && join(assetsDir, "fonts", name), join(ASSETS_ROOT, "fonts", name)].filter(Boolean);
  const hit = cands.find((p) => existsSync(p));
  if (!hit) throw new Error(`three-looks: font ${name} not found (looked in ${cands.join(", ")})`);
  return hit;
}

/** Stock model ids a payload uses (empty unless `stock: true`). */
export const stockIdsOf = (data) => (data.stock ? [...new Set([...data.worlds.flatMap((w) => [...w.objects, ...w.cast].map((e) => e.stock).filter(Boolean))])].filter((id) => STOCK_MODELS[id]) : []);

/** The composition script: data prelude (spec, style, zones, stock urls) followed by the runtime files in load order. */
export function buildScript({ data, style }) {
  const rt = runtimeFiles(data.stock).map((f) => readFileSync(join(RUNTIME_DIR, f), "utf8"));
  const stockIds = stockIdsOf(data);
  const styleData = { id: style.id, material: style.material, finishes: style.finishes, roles: style.roles, ground: style.ground, light: style.light, moods: style.moods, post: style.post, cap: style.cap, tag: style.tag, transition: style.transition };
  const stock = data.stock ? `const STOCK=${JSON.stringify(Object.fromEntries(stockIds.map((id) => [id, { url: `assets/${STOCK_MODELS[id].file}`, h: STOCK_MODELS[id].h }])))};\n` : "";
  const prelude = `const SPEC=${JSON.stringify(data)};\nconst STYLE=${JSON.stringify(styleData)};\nconst ZONES=${JSON.stringify(ZONES)};\n${stock}`;
  return [prelude, ...rt].join("\n");
}

export function buildHtml({ data, style }) {
  const js = buildScript({ data, style });
  const tpl = readFileSync(join(HERE, "template.html"), "utf8");
  const bg = style.moods.warm.bg;
  return tpl
    .replace(/__DUR__/g, String(data.dur)).replace(/__LANG__/g, "und").replace(/__CAPS__/g, data.capsDefault ? "true" : "false").replace(/__BG__/g, bg)
    .replace(/__LABELPX__/g, String(ZONES.labelPx)).replace(/__STAMPPX__/g, String(ZONES.stampPx)).replace(/__STAMPY__/g, String(ZONES.stamp.y)).replace(/__CAPTOP__/g, String(ZONES.captions.top)).replace(/__CAPPX__/g, String(ZONES.captionPx))
    .replace(/__TAGINK__/g, style.tag.ink).replace(/__TAGBG__/g, style.tag.bg).replace(/__TAGBORDER__/g, style.tag.border)
    .replace(/__CAPFG__/g, style.cap.fg).replace(/__CAPINK__/g, style.cap.ink).replace(/__CAPHI__/g, style.cap.hi).replace(/__CAPHIINK__/g, style.cap.hiInk)
    .replace(/__BUNDLE__/g, data.stock ? "three-stock.js" : "three-bundle.js")
    .replace("/*__JS__*/", () => js);
}

/** @returns {Promise<{entry:string, sfx:Array<{at:number,kind:string}>, durationSec:number, warnings:string[]}>} */
export async function compose({ spec, words, durationSec, outDir, assetsDir, captions } = {}) {
  if (!outDir) throw new Error("three-looks compose: outDir is required");
  const raw = spec?.hf ?? spec ?? {};
  const parsed = payloadSchema.safeParse(normalizePayload(raw));
  if (!parsed.success) throw new Error(`three-looks payload is invalid:\n${parsed.error.issues.map((i) => `  - hf.${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  const mode = spec?.mode === "single" ? "single" : "multi";
  const { data, sfx, warnings, durationSec: dur, style } = resolvePayload({ payload: parsed.data, words: words ?? [], durationSec: durationSec ?? spec?.durationSec, mode, captionsEnabled: captions?.enabled !== false });
  const root = pathResolve(outDir);
  mkdirSync(join(root, "assets", "fonts"), { recursive: true });
  for (const f of FONT_FILES) copyFileSync(findFont(f, assetsDir), join(root, "assets", "fonts", f));
  if (data.stock) {
    for (const id of stockIdsOf(data)) { const rel = STOCK_MODELS[id].file, dst = join(root, "assets", rel); mkdirSync(dirname(dst), { recursive: true }); copyFileSync(findAsset(rel, assetsDir), dst); }
    copyFileSync(VENDOR_STOCK, join(root, "assets", "three-stock.js"));
  } else copyFileSync(VENDOR, join(root, "assets", "three-bundle.js"));
  writeFileSync(join(root, "index.html"), buildHtml({ data, style }));
  const proj = (name, obj) => { const p = join(root, name); if (!existsSync(p)) writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); };
  proj("hyperframes.json", { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } });
  proj("meta.json", { id: "three-looks", name: "three-looks", createdAt: "2026-01-01T00:00:00.000Z" });
  return { entry: "index.html", sfx, durationSec: dur, warnings };
}
