// compose(): payload + word timings -> a deterministic HyperFrames composition (index.html + fonts + licenses).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { payloadSchema } from "./schema.mjs";
import { normalize } from "./normalize.mjs";
import { resolveStyle, FONTS } from "./styles.mjs";
import { makeDraw } from "./draw.mjs";
import { resolveTimeline } from "./timeline.mjs";
import { buildModel } from "./model.mjs";
import { compileBeats } from "./beats.mjs";
import { layoutScenes, planCamera } from "./camera.mjs";
import { buildCaptions } from "./captions.mjs";
import { buildCss, decoration, usedFonts } from "./css.mjs";
import { icon, phosphorLicense } from "./icons.mjs";
import { STAGE } from "./layout.mjs";
import { SAFE, CAPTION_BAND, CONTENT, PANEL, placeTagCore, estimateSize } from "./safe.mjs";
import { BL } from "./settings/common.mjs";
import { r2, esc } from "./util.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const RUNTIME = readFileSync(join(HERE, "runtime.js"), "utf8");
const FPS = 30;

/** Pure part of compose: everything except writing files. Returns the html, sfx, plan and warnings. */
export function buildComposition({ spec, words, durationSec, captions, fontRel = "assets/fonts" }) {
  const raw = spec?.hf ?? spec;
  // spec.mode is the single source of truth; a stray hf.mode only fills a missing spec.mode (with a warning)
  const modeCtx = { spec: { mode: spec?.mode }, warnings: [] };
  // warnings an earlier normalize() pass (the registry's, which has no way to return them) attached to the spec or payload
  const carried = [...(spec?.__warnings ?? []), ...(raw?.__warnings ?? [])];
  const hf = payloadSchema.parse(normalize(raw, modeCtx));
  hf.scenes = hf.scenes.map((s, i) => ({ ...s, id: s.id ?? `s${i + 1}` }));
  const mode = modeCtx.spec.mode ?? "single";
  const style = resolveStyle(hf.style);
  const d = makeDraw(style);
  const D = Math.ceil(durationSec * FPS) / FPS;
  const wd = (words ?? []).filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  const timeline = resolveTimeline(hf, wd, D, mode);
  const model = buildModel(hf, d, timeline.beats);
  const layout = layoutScenes(hf, mode);
  const comp = compileBeats({ model, timeline, hf, d, duration: D, mode });
  const cam = planCamera({ hf, mode, layout, timeline, camBeats: comp.camBeats, duration: D });
  const ops = [...comp.ops], sfx = [...comp.sfx];
  const S = model.scenes.length;

  // ambient glow per scene, travel path draws, transitions, recap pulses
  model.scenes.forEach((sc, i) => {
    const role = sc.def.glow ?? ["accent", "accent2", "good", "warn", "accent3"][i % 5];
    const t0 = i === 0 ? 0 : timeline.enter[i] - 0.2, t1 = i + 1 < S ? timeline.enter[i + 1] - 0.2 : null;
    if (i === 0) ops.push({ k: "set", t: 0, sel: `#glow${i}`, v: { opacity: 0.6 } });
    else ops.push({ k: "fromTo", t: r2(t0), sel: `#glow${i}`, from: { opacity: 0 }, to: { opacity: 0.6 }, d: 0.9, ease: "power1.inOut" });
    if (t1 !== null) ops.push({ k: "to", t: r2(t1), sel: `#glow${i}`, v: { opacity: 0 }, d: 0.9, ease: "power1.inOut" });
    void role;
  });
  for (const mv of cam.moves) {
    if (mv.travel !== undefined) {
      const k = mv.travel - 1, pth = layout.paths[k];
      if (pth) {
        const dur = mv.t1 - mv.t0 - 0.1;
        ops.push({ k: "fromTo", t: mv.t0, sel: `#wp${k}, #wpg${k}`, from: { attr: { "stroke-dashoffset": 1.1 }, opacity: 1 }, to: { attr: { "stroke-dashoffset": 0 } }, d: r2(dur), ease: "power1.inOut" });
        ops.push({ k: "fromTo", t: mv.t0, sel: `#wn${k}a`, from: { opacity: 0, scale: 0.3 }, to: { opacity: 1, scale: 1 }, d: 0.3, ease: "back.out(2)" });
        ops.push({ k: "fromTo", t: r2(mv.t1 - 0.4), sel: `#wn${k}b`, from: { opacity: 0, scale: 0.3 }, to: { opacity: 1, scale: 1 }, d: 0.3, ease: "back.out(2)" });
        ops.push({ k: "fromTo", t: mv.t0, sel: "#trav", from: { opacity: 0, scale: 0.3, x: pth.c[0][0], y: pth.c[0][1] }, to: { opacity: 1, scale: 1 }, d: 0.2, ease: "back.out(2)" });
        ops.push({ k: "path", t: mv.t0, sel: "#trav", c: pth.c, d: r2(dur), ease: "power1.inOut" });
        ops.push({ k: "to", t: r2(mv.t0 + dur), sel: "#trav", v: { opacity: 0, scale: 0.2 }, d: 0.2 });
      }
      sfx.push({ at: mv.t0, kind: "whoosh" });
    }
    if (mv.kind === "wipe") {
      ops.push({ k: "fromTo", t: r2(mv.t0 - 0.28), sel: "#wipe", from: { opacity: 1, x: -1080 }, to: { x: 0 }, d: 0.26, ease: "power3.in" });
      ops.push({ k: "to", t: r2(mv.t0 + 0.02), sel: "#wipe", v: { x: 1080 }, d: 0.3, ease: "power3.out" });
      sfx.push({ at: mv.t0 - 0.28, kind: "whoosh" });
    } else if (mv.kind === "iris") {
      ops.push({ k: "fromTo", t: r2(mv.t0 - 0.32), sel: "#iris", from: { clipPath: "circle(0% at 50% 52%)" }, to: { clipPath: "circle(80% at 50% 52%)" }, d: 0.3, ease: "power2.in" });
      ops.push({ k: "to", t: r2(mv.t0 + 0.02), sel: "#iris", v: { clipPath: "circle(0% at 50% 52%)" }, d: 0.32, ease: "power2.out" });
      sfx.push({ at: mv.t0 - 0.3, kind: "whoosh" });
    } else if (mv.kind === "slide" || mv.kind === "whip" || mv.kind === "up") sfx.push({ at: mv.t0, kind: "whoosh" });
    if (mv.recap) layout.paths.forEach((_, k) => ops.push({ k: "fromTo", t: r2(mv.t1 + k * 0.45), sel: `#wpg${k}`, from: { opacity: 0.3 }, to: { opacity: 0.95 }, d: 0.25, repeat: 1, yoyo: true }));
  }
  const order = new Map(ops.map((o, i) => [o, i]));
  ops.sort((a, b) => a.t - b.t || order.get(a) - order.get(b));
  sfx.sort((a, b) => a.at - b.at);

  const cap = buildCaptions(wd);
  const deco = decoration(style);
  const plan = {
    duration: D, mode, ax: 540, ay: 970,
    scenes: layout.pos.map((p, i) => ({ cx: p.cx, cy: p.cy, i })),
    cameraInitial: cam.initial, moves: cam.moves, ops, origins: comp.origins,
    captions: captions?.enabled === false ? cap.data : cap.data,
    panel: PANEL[mode === "single" ? "single" : "multi"],
    safe: { content: CONTENT, caption: CAPTION_BAND, frame: SAFE },
    tags: [...model.scenes.flatMap((sc, i) => (sc.def.label ? [{ id: `lab${i}`, kind: "label", si: i, x: 28, y: 22, anchor: "tl", ...estimateSize("label", sc.def.label) }] : [])), ...comp.tags],
  };
  const html = renderHtml({ hf, mode, style, d, model, layout, comp, deco, cap, plan, fontRel, D });
  const placed = model.scenes.map((sc) => ({ index: sc.index, props: sc.props.map((p) => ({ id: p.id, box: p.box })), cast: sc.cast.map((c) => ({ who: c.who, x: c.x, box: c.box })), cursor: comp.cursors[sc.index] }));
  return { html, sfx, plan: { ...plan, placed }, warnings: [...new Set([...carried, ...modeCtx.warnings, ...timeline.warnings])], hf, mode, durationSec: D };
}

function sceneHtml({ sc, si, mode, style, comp, d }) {
  const single = mode === "single";
  const rr = Math.max(18, Math.round(64 * style.shape.r));
  const px = single ? STAGE.ox : 0, py = single ? STAGE.oy : 0, pw = single ? STAGE.w : 1080, ph = single ? STAGE.h : 1920;
  const layer = (cls, id, svg) => `<div class="ly ${cls}" id="${id}${si}" style="left:${BL.x0}px;top:${BL.y0}px"><svg width="${BL.x1 - BL.x0}" height="${BL.y1 - BL.y0}" viewBox="${BL.x0} ${BL.y0} ${BL.x1 - BL.x0} ${BL.y1 - BL.y0}">${svg}</svg></div>`;
  const props = sc.props.map((p) => `<div class="prop" id="${p.el}" style="left:${r2(p.box.x)}px;top:${r2(p.box.y)}px;width:${r2(p.box.w)}px;height:${r2(p.box.h)}px"><div class="pscale" style="width:${p.bw}px;height:${p.bh}px;transform:scale(${p.k})">${p.html}</div></div>`).join("");
  const cast = sc.cast.map((c) => `<svg class="csvg" style="left:${r2(c.x)}px;top:${r2(c.hipY)}px;transform:scale(${r2(c.scale)})" width="1" height="1">${c.svg}</svg>`).join("");
  const cursor = `<div class="cursor" id="cur${si}"><span class="rip"></span><span class="cu ic">${icon("cursor-click", "fill")}</span></div>`;
  const label = sc.def.label ? `<div class="lab" id="lab${si}" style="opacity:0">${esc(sc.def.label)}</div>` : "";
  void d;
  return `<div class="scene" id="sc${si}" style="left:${r2(sc.cx - 540)}px;top:${r2(sc.cy - 970)}px"><div class="panel" id="pn${si}" style="left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;border-radius:${single ? rr : 0}px"><div class="shift" style="left:${STAGE.ox - px}px;top:${STAGE.oy - py}px">
${layer("far", "far", sc.setting.far)}${layer("mid", "mid", sc.setting.mid)}<svg class="lines" width="${BL.x1 - BL.x0}" height="${BL.y1 - BL.y0}" viewBox="${BL.x0} ${BL.y0} ${BL.x1 - BL.x0} ${BL.y1 - BL.y0}">${comp.lines[si]}</svg>
<div class="play">${props}${cast}</div><div class="ov">${comp.ov[si]}${cursor}</div>${layer("near", "near", sc.setting.near)}${label}</div></div></div>`;
}

function renderHtml({ hf, mode, style, d, model, layout, comp, deco, cap, plan, fontRel, D }) {
  const css = buildCss(style, fontRel);
  const scenes = model.scenes.map((sc, i) => sceneHtml({ sc: { ...sc, cx: layout.pos[i].cx, cy: layout.pos[i].cy }, si: i, mode, style, comp, d })).join("\n");
  const glows = model.scenes.map((sc, i) => `<div class="glow" id="glow${i}" style="background:radial-gradient(closest-side,${style.c[sc.def.glow ?? ["accent", "accent2", "good", "warn", "accent3"][i % 5]].replace(/^(#[0-9a-f]{6})$/i, "$1")},transparent);opacity:0" data-layout-ignore></div>`).join("");
  let pathSvg = "";
  if (mode === "single" && layout.paths.length) {
    const b = layout.bounds, m = 400;
    const x0 = b.x0 - m, y0 = b.y0 - m, w = b.x1 - b.x0 + 2 * m, h = b.y1 - b.y0 + 2 * m;
    const body = layout.paths.map((p, k) => {
      const dd = `M${p.c[0]} C${p.c[1]} ${p.c[2]} ${p.c[3]}`;
      return `<path id="wpg${k}" d="${dd}" pathLength="1" fill="none" stroke="var(--accent)" stroke-width="34" stroke-linecap="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1" opacity="0"/><path id="wp${k}" d="${dd}" pathLength="1" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1" opacity="0"/>` +
        `<circle id="wn${k}a" cx="${p.c[0][0]}" cy="${p.c[0][1]}" r="20" fill="var(--accent)" opacity="0"/><circle id="wn${k}b" cx="${p.c[3][0]}" cy="${p.c[3][1]}" r="20" fill="var(--accent)" opacity="0"/>`;
    }).join("");
    pathSvg = `<svg id="paths" style="left:${x0}px;top:${y0}px" width="${w}" height="${h}" viewBox="${x0} ${y0} ${w} ${h}">${body}</svg><div id="trav" class="cx" style="left:0;top:0;width:44px;height:44px;border-radius:50%;background:var(--warn);box-shadow:0 0 30px var(--warn);opacity:0"></div>`;
  }
  const bgDecoFar = deco.far, bgDecoMid = deco.mid;
  return `<!doctype html>
<html lang="en" data-composition-variables='[{"id":"captions","type":"boolean","label":"Captions","default":true}]'>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>${css}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1920" data-fps="${FPS}">
<div id="bgGrad" data-layout-ignore></div>
<div id="bgFar" data-layout-ignore>${bgDecoFar}</div>
<div id="bgMid" data-layout-ignore><div class="tex"></div>${bgDecoMid}</div>
${glows}
<div id="wmask" data-layout-ignore><div id="world" data-layout-ignore>${pathSvg}
${scenes}
</div></div>
<div id="wipe" data-layout-ignore></div><div id="iris" data-layout-ignore></div>
${cap.html}
</div>
<script>
const PLAN = ${JSON.stringify(plan)};
const placeTag = ${placeTagCore.toString()};
${RUNTIME}
</script>
</body>
</html>`;
}

const LICENSE_NOTE = (fonts) => `# flat-2d bundled assets

## Icons
Phosphor Icons (MIT), package @phosphor-icons/core, inlined as SVG paths into index.html. Icons come only from Phosphor; none are hand drawn.

${phosphorLicense()}

## Fonts (SIL Open Font License 1.1, files from 03-assets/fonts)
${fonts.map((f) => `- ${f}`).join("\n")}
`;

/** Writes the composition: outDir/index.html, assetsDir/fonts/*, assetsDir/LICENSES.md. */
export async function compose({ spec, words, durationSec, outDir, assetsDir, captions }) {
  mkdirSync(outDir, { recursive: true });
  const fontsDir = join(assetsDir, "fonts");
  mkdirSync(fontsDir, { recursive: true });
  let rel = relative(outDir, fontsDir).split("\\").join("/") || ".";
  const r = buildComposition({ spec, words, durationSec, captions, fontRel: rel });
  const used = usedFonts(resolveStyle(r.hf.style));
  const src = join(REPO, "03-assets", "fonts");
  for (const k of used) { const f = FONTS[k].file; if (existsSync(join(src, f))) copyFileSync(join(src, f), join(fontsDir, f)); }
  writeFileSync(join(assetsDir, "LICENSES.md"), LICENSE_NOTE(used.map((k) => FONTS[k].file)));
  const entry = join(outDir, "index.html");
  writeFileSync(entry, r.html);
  return { entry, sfx: r.sfx, durationSec: r.durationSec, warnings: r.warnings };
}
