// compose(): validated payload + narration words -> deterministic HyperFrames composition (index.html + assets).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { HERE, RUNTIME_DIR, runtimeFiles } from "./catalog.mjs";
import { payloadSchema } from "./schema.mjs";
import { resolvePayload } from "./resolve.mjs";
import { normalizePayload } from "./normalize.mjs";
import { ZONES } from "./layout.mjs";

const FONTS = ["PressStart2P-Regular.ttf", "PixelifySans-Variable.ttf"];
const hexToRgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

function findFont(name, assetsDir) {
  const cands = [assetsDir && join(assetsDir, "fonts", name), join(HERE, "..", "..", "..", "..", "03-assets", "fonts", name)].filter(Boolean);
  const hit = cands.find((p) => existsSync(p));
  if (!hit) throw new Error(`pixel-world: font ${name} not found (looked in ${cands.join(", ")})`);
  return hit;
}

/** CSS of the style's post effects (scanlines, LCD grid, vignette, tint, border). Pure data -> string. */
export function postCss(style) {
  const p = style.post ?? {}, layers = [];
  if (p.scan) layers.push(`repeating-linear-gradient(0deg, rgba(0,0,0,${p.scan}) 0px, rgba(0,0,0,${p.scan}) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)`);
  if (p.lcd) layers.push(`linear-gradient(90deg, rgba(0,0,0,${p.lcd}) 1px, rgba(0,0,0,0) 1px) 0 0 / 8px 8px`, `linear-gradient(0deg, rgba(0,0,0,${p.lcd}) 1px, rgba(0,0,0,0) 1px) 0 0 / 8px 8px`);
  if (p.tint) layers.push(`linear-gradient(${p.tint}, ${p.tint})`);
  if (p.vig) layers.push(`radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 50%, rgba(8,4,16,${p.vig}) 100%)`);
  let css = layers.length ? `background: ${layers.join(", ")};` : "";
  if (p.border) css += ` box-shadow: inset 0 0 0 60px ${p.border}, inset 0 0 0 66px rgba(0,0,0,0.25);`;
  return css;
}

/** The composition script: data prelude (style, spec, zones) followed by the runtime files in load order. */
export function buildScript({ data, style }) {
  const rt = runtimeFiles().map((f) => readFileSync(join(RUNTIME_DIR, f), "utf8"));
  const styleData = { id: style.id, px: style.px, palette: style.palette, mono: !!style.mono, bit1: !!style.bit1, outline: style.outline, shade: style.shade, glow: style.glow, sat: style.sat, gamma: style.gamma, time: style.time ?? null, atmos: style.atmos, cap: style.cap };
  const prelude = `const STYLE=${JSON.stringify(styleData)};\nconst DUR=${data.dur},FPS=30;\nconst ZONES=${JSON.stringify(ZONES)};\nconst SPEC=${JSON.stringify(data)};\n`;
  return [prelude, ...rt].join("\n");
}

export function buildHtml({ data, style }) {
  const js = buildScript({ data, style });
  const ink = style.cap.ink, bg = style.palette[0];
  const tpl = readFileSync(join(HERE, "template.html"), "utf8");
  return tpl
    .replace(/__DUR__/g, String(data.dur)).replace(/__LANG__/g, "und").replace(/__CAPS__/g, data.capsDefault ? "true" : "false")
    .replace(/__BG__/g, bg).replace(/__BLURB__/g, String(style.blur?.[0] ?? 0)).replace(/__BLURF__/g, String(style.blur?.[1] ?? 0))
    .replace(/__POST__/g, postCss(style)).replace(/__SHADE__/g, hexToRgba(ink, 0.55)).replace(/__PILL__/g, hexToRgba(ink, 0.88))
    .replace(/__CAPFG__/g, style.cap.fg).replace(/__CAPINK__/g, ink).replace(/__CAPTOP__/g, String(ZONES.capTop)).replace(/__STAMPTOP__/g, String(ZONES.stampTop))
    .replace("/*__JS__*/", () => js);
}

/** @returns {Promise<{entry:string, sfx:Array<{at:number,kind:string}>, durationSec:number, warnings:string[]}>} */
export async function compose({ spec, words, durationSec, outDir, assetsDir, captions } = {}) {
  if (!outDir) throw new Error("pixel-world compose: outDir is required");
  const raw = spec?.hf ?? spec ?? {};
  const parsed = payloadSchema.safeParse(normalizePayload(raw));
  if (!parsed.success) throw new Error(`pixel-world payload is invalid:\n${parsed.error.issues.map((i) => `  - hf.${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  const mode = spec?.mode === "single" ? "single" : "multi";
  const { data, sfx, warnings, durationSec: dur, style } = resolvePayload({ payload: parsed.data, words, durationSec: durationSec ?? spec?.durationSec, mode, captionsEnabled: captions?.enabled !== false });
  const root = pathResolve(outDir);
  mkdirSync(join(root, "assets", "fonts"), { recursive: true });
  for (const f of FONTS) copyFileSync(findFont(f, assetsDir), join(root, "assets", "fonts", f));
  writeFileSync(join(root, "index.html"), buildHtml({ data, style }));
  const proj = (name, obj) => { const p = join(root, name); if (!existsSync(p)) writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); };
  proj("hyperframes.json", { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } });
  proj("meta.json", { id: "pixel-world", name: "pixel-world", createdAt: "2026-01-01T00:00:00.000Z" });
  return { entry: "index.html", sfx, durationSec: dur, warnings };
}
export { dirname };
