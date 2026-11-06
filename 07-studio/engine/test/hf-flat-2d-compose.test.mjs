import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync, mkdtempSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { compose } from "../hf/flat-2d/index.mjs";
import { buildComposition } from "../hf/flat-2d/compose.mjs";
import { EXAMPLE_PAYLOAD, EXAMPLE_WORDS } from "../hf/flat-2d/example.mjs";
import { STYLE_IDS, SETTING_IDS, TRANSITIONS } from "../hf/flat-2d/schema.mjs";
import { groupWords } from "../hf/flat-2d/captions.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const W = EXAMPLE_WORDS;
const build = (hf, extra = {}) => buildComposition({ spec: { mode: extra.mode ?? "single", hf }, words: W, durationSec: 53, captions: { enabled: true } });
const simple = (style, settings, mode) => ({
  style, mode,
  scenes: settings.map((s, i) => ({
    setting: s, label: s.slice(0, 12), enter: i ? { word: ["Uno", "DNS", "Dos", "Tres"][i % 4] } : undefined,
    props: [i % 2 ? { id: "k", kind: "chart", at: "top", data: [1, 3, 2] } : { id: "k", kind: "browser", at: "top", url: "x.com" }],
    cast: [{ who: ["nico", "dora", "beto", "luz", "tomas", "mica"][i % 6], at: "floor-left" }],
    beats: [{ on: { word: "URL" }, do: "pulse", target: "k" }],
  })),
});

test("compose is deterministic", () => {
  const a = build(clone(EXAMPLE_PAYLOAD)), b = build(clone(EXAMPLE_PAYLOAD));
  assert.equal(a.html, b.html);
  assert.deepEqual(a.sfx, b.sfx);
});

test("every style composes with a sample of settings, in both modes", () => {
  for (const style of STYLE_IDS) for (const mode of ["single", "multi"]) {
    const r = build(simple(style, ["desktop-browser", "city-street", "server-room"], mode), { mode });
    assert.match(r.html, /data-composition-id="main"/);
    assert.ok(r.html.includes("window.__timelines"), style);
    assert.ok(r.plan.moves.length >= 3);
  }
});

test("every setting composes", () => {
  for (const s of SETTING_IDS) { const r = build(simple("flat-soft-gradient", [s, s], "single")); assert.ok(r.html.length > 5000, s); }
});

test("multi mode supports every transition", () => {
  const hf = simple("flat-memphis", ["office", "kitchen", "bank", "hospital", "store", "classroom"], "multi");
  TRANSITIONS.forEach((t, i) => (hf.scenes[i + 1].transition = t));
  const r = build(hf, { mode: "multi" });
  for (const t of ["#wipe", "#iris"]) assert.ok(r.plan.ops.some((o) => o.sel === t), t);
});

test("beats land on the n-th spoken occurrence", () => {
  const hf = { style: "flat-dark-neon-ui", scenes: [{ setting: "void", props: [], cast: [], beats: [{ on: { word: "una", n: 2 } , do: "hero", text: "HOLA" }, { on: { word: "una", n: 1 }, do: "hero", text: "ADIOS" }] }] };
  hf.scenes[0].beats.pop();
  const r = build(hf);
  const second = W.filter((w) => w.text.toLowerCase().replace(/[^a-z]/g, "") === "una")[1];
  const op = r.plan.ops.find((o) => o.k === "fromTo" && String(o.sel).startsWith("#hr"));
  assert.ok(Math.abs(op.t - second.start) < 0.01, `${op.t} vs ${second.start}`);
});

test("unknown words fall back with a warning instead of failing", () => {
  const hf = { style: "flat-clay-2d", scenes: [{ setting: "void", beats: [{ on: { word: "zzzzqq" }, do: "hero", text: "X" }] }] };
  const r = build(hf);
  assert.ok(r.warnings.some((w) => /zzzzqq/.test(w)));
});

test("captions: own markup, variable switch, 2-4 words and at most 22 characters per group", () => {
  const r = build(clone(EXAMPLE_PAYLOAD));
  assert.match(r.html, /data-composition-variables='\[\{"id":"captions"/);
  assert.match(r.html, /VARS\.captions !== false/);
  for (const g of groupWords(W)) {
    const text = g.map((w) => w.text.replace(/[.,:;]+$/, "")).join(" ");
    assert.ok(g.length <= 4 && (g.length === 1 || text.length <= 22), text);
  }
  assert.ok(r.plan.captions.length > 15);
});

test("sfx cues are sorted, typed and within the video", () => {
  const r = build(clone(EXAMPLE_PAYLOAD));
  const kinds = new Set(r.sfx.map((c) => c.kind));
  for (const k of ["whoosh", "pop", "click", "keyboard"]) assert.ok(kinds.has(k), k);
  for (let i = 1; i < r.sfx.length; i++) assert.ok(r.sfx[i].at >= r.sfx[i - 1].at);
  assert.ok(r.sfx.every((c) => c.at >= 0 && c.at <= 53));
});

test("safe zone: captions sit inside the 900x1300 box (x 90-990, y 320) and replica text is large", () => {
  const r = build(clone(EXAMPLE_PAYLOAD));
  assert.match(r.html, /\.cap\{position:absolute;left:90px;top:320px;width:900px/);
  assert.match(r.html, /\.cw\{[^}]*font-size:(6\d|7\d)px/);
});

test("compose writes index.html, fonts and licenses", async () => {
  const dir = mkdtempSync(join(tmpdir(), "flat2d-"));
  const r = await compose({ spec: { mode: "single", hf: clone(EXAMPLE_PAYLOAD) }, words: W, durationSec: 53, outDir: dir, assetsDir: join(dir, "assets"), captions: { enabled: true } });
  assert.ok(existsSync(r.entry));
  assert.ok(existsSync(join(dir, "assets", "LICENSES.md")));
  assert.ok(existsSync(join(dir, "assets", "fonts", "Inter-Variable.ttf")));
  assert.ok(r.durationSec >= 53 && Array.isArray(r.sfx));
});

test("sources never use Date.now or Math.random", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "hf", "flat-2d");
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  for (const f of walk(root).filter((f) => /\.(mjs|js)$/.test(f))) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/Date\.now|Math\.random|requestAnimationFrame|repeat:\s*-1/.test(src), f);
  }
});
