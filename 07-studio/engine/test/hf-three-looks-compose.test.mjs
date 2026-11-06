// three-looks compose: determinism, no model files by default, stock opt-in, forbidden APIs, runtime files, lower-third coverage, layout.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { mkdtempSync, readFileSync, readdirSync, existsSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compose } from "../hf/three-looks/index.mjs";
import { EXAMPLE_PAYLOAD } from "../hf/three-looks/prompt.mjs";
import { RUNTIME_DIR, RUNTIME_FILES } from "../hf/three-looks/catalog.mjs";
import { ZONES, rectsOverlap } from "../hf/three-looks/layout.mjs";
import { resolvePayload } from "../hf/three-looks/resolve.mjs";
import { payloadSchema } from "../hf/three-looks/schema.mjs";
import { drawPlan, lowerThirdEmpty } from "../hf/three-looks/coverage.mjs";
import { words } from "./hf-three-looks.test.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "tl-test-"));
const run = (mode, dir, payload = EXAMPLE_PAYLOAD) => compose({ spec: { hf: payload, mode }, words, outDir: dir, captions: { enabled: true } });
const files = (d) => readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath ?? e.path, e.name));

test("compose is deterministic: two runs give byte-identical files (multi and single)", async () => {
  for (const mode of ["multi", "single"]) {
    const a = tmp(), b = tmp(), ra = await run(mode, a), rb = await run(mode, b);
    assert.deepEqual(ra, rb);
    for (const f of ["index.html", "hyperframes.json", "meta.json"]) assert.equal(readFileSync(join(a, f), "utf8"), readFileSync(join(b, f), "utf8"), `${mode} ${f}`);
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true });
  }
});

test("compose writes a 1080x1920 composition with its own captions and a seek-driven timeline", async () => {
  const d = tmp(), r = await run("multi", d);
  assert.equal(r.entry, "index.html"); assert.ok(r.sfx.length > 10); assert.equal(r.warnings.length, 0, r.warnings.join("\n"));
  const html = readFileSync(join(d, "index.html"), "utf8");
  assert.match(html, /data-width="1080" data-height="1920"/); assert.match(html, /data-composition-variables='\[\{"id":"captions","type":"boolean"/);
  assert.match(html, /window\.__hf\.buildReady/); assert.match(html, /addEventListener\('hf-seek'/); assert.match(html, /window\.__timelines\.main/);
  rmSync(d, { recursive: true });
});

test("default output has no model files: no GLB, HDR or stock bundle, no reference to them, no files copied from 03-assets/3d", async () => {
  const d = tmp(); await run("multi", d);
  const all = files(d).map((f) => f.slice(d.length));
  assert.deepEqual(all.filter((f) => /\.(glb|gltf|hdr|exr|ktx2|bin)$/i.test(f)), []);
  assert.ok(!all.some((f) => /three-stock|hf-models|\/models\//.test(f)), all.join(","));
  const html = readFileSync(join(d, "index.html"), "utf8"), bundle = readFileSync(join(d, "assets", "three-bundle.js"), "utf8");
  assert.doesNotMatch(html, /\.glb|\.hdr|GLTFLoader|RGBELoader|hf-models|assets\/3d/i); assert.doesNotMatch(bundle, /GLTFLoader/);
  assert.match(html, /RoomEnvironment|T\.RoomEnvironment/);
  rmSync(d, { recursive: true });
});

test("stock opt-in: with `stock: true` the GLB and the loader bundle are copied; without it they are not", async () => {
  const p = { stock: true, hero: "robo", worlds: [{ set: "street", objects: [{ id: "cab", model: "taxi", at: "mid-left" }, { id: "mw", build: "microwave" }], beats: [{ on: { at: 1 }, do: "pop-in", target: "cab" }] }] };
  const d = tmp(), r = await compose({ spec: { hf: p, mode: "multi" }, words, outDir: d }); assert.ok(r.entry);
  const all = files(d).map((f) => f.slice(d.length));
  assert.ok(all.some((f) => f.endsWith("car-taxi.glb")) && all.some((f) => f.endsWith("robot-expressive.glb")) && all.some((f) => f.endsWith("three-stock.js")));
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /STOCK=/);
  rmSync(d, { recursive: true });
  const e = tmp(); await assert.rejects(() => compose({ spec: { hf: { ...p, stock: undefined }, mode: "multi" }, words, outDir: e }), /stock models are off[\s\S]*stock: true/); rmSync(e, { recursive: true });
});

test("no forbidden APIs in the composition or the vendored bundle (determinism, seek-driven only)", async () => {
  const d = tmp(); await run("multi", d);
  const own = readFileSync(join(d, "index.html"), "utf8"), src = own + "\n" + readFileSync(join(d, "assets", "three-bundle.js"), "utf8");
  for (const re of [/Date\.now\(/, /Math\.random\(/, /requestAnimationFrame/, /cancelAnimationFrame/, /setInterval\(/, /repeat:\s*-1/, /performance\.now\(/, /new Date\(/]) assert.doesNotMatch(src, re, String(re));
  assert.doesNotMatch(own, /\bsetTimeout\(/); assert.doesNotMatch(own, /fetch\(\s*["']https?:/);
  rmSync(d, { recursive: true });
});

test("every asset the composition references exists in the output folder", async () => {
  const d = tmp(); await run("multi", d);
  const html = readFileSync(join(d, "index.html"), "utf8");
  const refs = new Set([...html.matchAll(/assets\/[A-Za-z0-9_\-./]+\.(?:js|ttf)/g)].map((m) => m[0]));
  assert.ok(refs.has("assets/three-bundle.js")); for (const r of refs) assert.ok(existsSync(join(d, r)), `${r} missing`);
  rmSync(d, { recursive: true });
});

test("lower third: at most about 15 % empty floor on the draw plan, sampled on every shot of every world", () => {
  const d = resolvePayload({ payload: payloadSchema.parse(EXAMPLE_PAYLOAD), words, mode: "multi" }).data;
  const worst = []; let n = 0;
  for (const w of d.worlds) for (const s of w.shots) for (const u of [0.15, 0.5, 0.85]) { const t = s.t0 + u * (s.t1 - s.t0), e = lowerThirdEmpty(drawPlan(d, t)); worst.push([e, s.kind, t.toFixed(1)]); n++; }
  const mean = worst.reduce((a, x) => a + x[0], 0) / n, max = Math.max(...worst.map((x) => x[0]));
  assert.ok(max <= 0.7, `worst frame ${JSON.stringify(worst.sort((a, b) => b[0] - a[0])[0])}`);
  assert.ok(mean <= 0.15, `mean empty fraction ${mean.toFixed(3)} (worst ${JSON.stringify(worst.sort((a, b) => b[0] - a[0]).slice(0, 4))})`);
});

test("layout: caption band is free of labels and stamps, all text is 46 px or bigger, zones sit inside the safe areas", () => {
  assert.ok(!rectsOverlap({ x0: 0, x1: 1080, y0: ZONES.captions.y0, y1: ZONES.captions.y1 }, { x0: ZONES.label.x0, x1: ZONES.label.x1, y0: ZONES.label.y0, y1: ZONES.label.y1 }));
  assert.ok(ZONES.stamp.y1 <= ZONES.captions.y0 + 0);
  for (const px of [ZONES.labelPx, ZONES.stampPx, ZONES.captionPx]) assert.ok(px >= 46);
  assert.ok(ZONES.box.x0 === 90 && ZONES.box.x1 === 990 && ZONES.box.y0 === 310 && ZONES.box.y1 === 1610);
  assert.ok(ZONES.fit.x0 >= ZONES.box.x0 && ZONES.fit.x1 <= ZONES.box.x1 && ZONES.fit.y0 >= ZONES.box.y0 && ZONES.fit.y1 <= ZONES.box.y1);
  const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "hf", "three-looks", "template.html"), "utf8");
  for (const m of html.matchAll(/font:\s*\d+\s+(\d+|__\w+__)px/g)) assert.ok(!/^\d+$/.test(m[1]) || +m[1] >= 46, `font ${m[0]}`);
  assert.doesNotMatch(html, /id="wipe"/);
});

test("transitions render both worlds through a render-target mix (no flat full-cover frame)", () => {
  const post = readFileSync(join(RUNTIME_DIR, "post.js"), "utf8"), over = readFileSync(join(RUNTIME_DIR, "overlay.js"), "utf8"), main = readFileSync(join(RUNTIME_DIR, "main.js"), "utf8");
  assert.match(post, /tB/); assert.match(main, /setRenderTarget\(rtB\)/); assert.doesNotMatch(over, /wipeEl|linear-gradient/);
});

test("runtime files listed in the catalog exist and parse", () => {
  for (const f of RUNTIME_FILES) { const p = join(RUNTIME_DIR, f); assert.ok(existsSync(p), f); assert.ok(statSync(p).size > 100); new vm.Script(readFileSync(p, "utf8"), { filename: f }); }
});

test("invalid payload makes compose fail with every issue listed", async () => {
  const d = tmp();
  await assert.rejects(() => compose({ spec: { hf: { worlds: [{ set: "moon", beats: [] }] } }, words, durationSec: 10, outDir: d }), /three-looks payload is invalid[\s\S]*unknown set/);
  rmSync(d, { recursive: true });
});
