// Reference HyperFrames format module (internal: id starts with "_", hidden unless CC_HF_INTERNAL=1).
// It is the smallest module that satisfies the contract and the template other format units copy:
//   - payloadSchema validates `spec.hf`;  promptSection guides the LLM spec writer;  normalize fixes common slips;
//   - compose() writes ONE deterministic file (index.html): a colored background, one big text per scene shown over
//     the scene's spoken words, and the composition's OWN karaoke captions behind the `captions` variable.
// The engine never burns or overlays captions on HyperFrames formats; this module is the only place they are drawn.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const meta = {
  id: "_stub",
  name: "Stub format",
  about: "Reference module for tests and for new formats: solid or gradient background, one big text per scene, karaoke captions.",
  modes: ["single", "multi"],
  styles: [
    { id: "solid", name: "Solid", about: "Flat background color from the first palette stop" },
    { id: "gradient", name: "Gradient", about: "Vertical gradient between the palette stops" },
  ],
  settings: [{ id: "textScale", name: "Text scale", about: "Multiplier of the big scene text (0.5-1.5)" }],
  category: "hyperframes",
};

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color like #1A2B3C");

export const payloadSchema = z
  .object({
    style: z.enum(["solid", "gradient"]).default("solid"),
    textScale: z.number().min(0.5, "textScale must be between 0.5 and 1.5").max(1.5, "textScale must be between 0.5 and 1.5").default(1),
    accent: hex.optional(),
  })
  .strict();

export const promptSection = `Format \`_stub\` (internal reference). Output the common spec fields plus \`"hf": { "style": "solid" | "gradient", "textScale": 0.5-1.5, "accent": "#RRGGBB" }\`.
Every scene needs \`narration\`; its \`onScreenText\` (max 4 words) is drawn big while the scene is spoken. Captions are drawn by the composition itself: never add caption styling.
Example: { "version": 1, "title": "Hi", "template": "_stub", "mode": "multi", "hf": { "style": "gradient" }, "scenes": [{ "id": "s1", "narration": "Hello there.", "onScreenText": "HELLO", "visual": { "type": "gradient" } }] }`;

/** Lenient authoring: fix common slips in the payload; never drop content. */
export function normalize(spec) {
  const hf = spec.hf;
  if (!hf || typeof hf !== "object" || Array.isArray(hf)) return spec;
  const fixed = { ...hf };
  if (typeof fixed.style === "string") fixed.style = fixed.style.trim().toLowerCase();
  if (typeof fixed.textScale === "string" && fixed.textScale.trim() !== "" && Number.isFinite(Number(fixed.textScale))) fixed.textScale = Number(fixed.textScale);
  return { ...spec, hf: fixed };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const r3 = (n) => Math.round(n * 1000) / 1000;
const tokens = (t) => String(t).trim().split(/\s+/).filter(Boolean);

/** Scene windows from the words: scene i owns as many words as its narration has tokens. */
function sceneWindows(scenes, words, durationSec) {
  const counts = scenes.map((s) => tokens(s.narration).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  const wins = scenes.map((s, i) => {
    const n = Math.round((counts[i] / total) * words.length);
    const from = cursor;
    cursor = i === scenes.length - 1 ? words.length : Math.min(words.length, cursor + n);
    const first = words[from];
    const last = words[Math.max(from, cursor - 1)];
    return { id: s.id, from, to: cursor, speechStart: first ? first.start : 0, speechEnd: last ? last.end : 0 };
  });
  wins.forEach((w, i) => {
    w.start = i === 0 ? 0 : r3((wins[i - 1].speechEnd + w.speechStart) / 2);
    w.end = i === wins.length - 1 ? r3(durationSec) : r3((w.speechEnd + wins[i + 1].speechStart) / 2);
  });
  return wins;
}

/** Groups of up to 3 words, closed early after sentence punctuation (the module's own pagination). */
function captionGroups(words) {
  const groups = [];
  let cur = [];
  const flush = () => {
    if (cur.length) groups.push(cur);
    cur = [];
  };
  words.forEach((w) => {
    cur.push(w);
    if (cur.length >= 3 || /[.!?:;]$/.test(w.text)) flush();
  });
  flush();
  return groups.map((g, i) => ({
    t0: r3(g[0].start),
    t1: r3(groups[i + 1] ? Math.min(groups[i + 1][0].start, g[g.length - 1].end + 0.4) : g[g.length - 1].end + 0.4),
    words: g.map((w) => ({ t: w.text, s: r3(w.start) })),
  }));
}

/**
 * @param {{spec: object, words: {text: string, start: number, end: number}[], durationSec: number, outDir: string, assetsDir: string, captions: {enabled: boolean}}} o
 * @returns {Promise<{entry: string, sfx: {at: number, kind: string}[], durationSec: number}>}
 */
export async function compose({ spec, words, durationSec, outDir, captions }) {
  mkdirSync(outDir, { recursive: true });
  const hf = payloadSchema.parse(spec.hf ?? {});
  const pal = spec.theme?.palette ?? { bg: ["#0F0C29", "#302B63"], text: "#FFFFFF", accent: "#FFD60A" };
  const accent = hf.accent ?? pal.accent;
  const wins = sceneWindows(spec.scenes, words, durationSec);
  const bigText = spec.scenes.map((s, i) => ({ id: s.id, t0: wins[i].start, t1: wins[i].end, text: String(s.onScreenText ?? tokens(s.narration).slice(0, 3).join(" ")).toUpperCase() }));
  const groups = captionGroups(words);
  const bg = hf.style === "gradient" ? `linear-gradient(180deg, ${pal.bg[0]}, ${pal.bg[pal.bg.length - 1]})` : pal.bg[0];
  const dur = r3(durationSec);
  const html = `<!doctype html>
<html lang="${esc(spec.language ?? "es")}" data-composition-variables='[{"id":"captions","type":"boolean","label":"Captions","default":${captions.enabled ? "true" : "false"}}]'>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${pal.bg[0]}; }
#root { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; background: ${bg}; font-family: "Montserrat", sans-serif; }
#big { position: absolute; left: 90px; width: 900px; top: 640px; text-align: center; font-weight: 900; font-size: ${Math.round(150 * hf.textScale)}px; line-height: 1.05; color: ${pal.text}; transform-origin: 50% 50%; }
#caps { position: absolute; left: 90px; width: 900px; top: 1180px; text-align: center; font-weight: 800; font-size: 72px; line-height: 1.2; color: ${pal.text}; }
.w { display: inline-block; margin: 0 10px; opacity: .55; }
.w.on { opacity: 1; color: ${accent}; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1080" data-height="1920">
  <div id="big"></div>
  <div id="caps"></div>
</div>
<script>
const BIG = ${json(bigText)};
const CAP = ${json(groups)};
const bigEl = document.getElementById("big");
const capsEl = document.getElementById("caps");
function capsOn() {
  const v = window.__hyperframes && window.__hyperframes.getVariables ? window.__hyperframes.getVariables() : {};
  return v && typeof v.captions === "boolean" ? v.captions : ${captions.enabled ? "true" : "false"};
}
function renderAt(t) {
  const b = BIG.find((x) => t >= x.t0 && t < x.t1);
  if (b) {
    const k = Math.min(1, (t - b.t0) / 0.25);
    bigEl.textContent = b.text;
    bigEl.style.opacity = String(k);
    bigEl.style.transform = "scale(" + (0.8 + 0.2 * (1 - Math.pow(1 - k, 3))).toFixed(4) + ")";
  } else bigEl.textContent = "";
  capsEl.textContent = "";
  if (!capsOn()) return;
  const g = CAP.find((x) => t >= x.t0 && t < x.t1);
  if (!g) return;
  g.words.forEach((w, i) => {
    const s = document.createElement("span");
    const next = g.words[i + 1];
    s.className = "w" + (t >= w.s && (!next || t < next.s) ? " on" : "");
    s.textContent = w.t;
    capsEl.appendChild(s);
  });
}
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
renderAt(0);
</script>
</body>
</html>
`;
  writeFileSync(join(outDir, "index.html"), html);
  const sfx = [];
  wins.forEach((w, i) => {
    if (i > 0) sfx.push({ at: r3(w.start), kind: "cut" });
    sfx.push({ at: r3(w.speechStart), kind: "pop" });
  });
  return { entry: "index.html", sfx, durationSec: dur };
}
