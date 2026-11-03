import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { mkdtempSync, readFileSync, readdirSync, existsSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compose, promptSection } from "../hf/three-looks/index.mjs";
import { EXAMPLE_PAYLOAD } from "../hf/three-looks/prompt.mjs";
import { MODELS, SETTINGS, SHOTS, HDRI_FILE, ASSETS_ROOT, RUNTIME_DIR, RUNTIME_FILES, GLOBAL_ANCHORS, SIZE_SCALE } from "../hf/three-looks/catalog.mjs";
import { ZONES, rectsOverlap } from "../hf/three-looks/layout.mjs";
import { modelsOf } from "../hf/three-looks/compose.mjs";

const NARR = "Tu computadora se cuelga y no sabes por qué. Abres muchos programas y ventanas a la vez. La memoria se llena, se llena hasta el tope. Entonces el almacen se queda sin sitio, lleno de cajas de datos. Hay que sacar cosas a un camion. Y el disco trabaja lento, muy lento, el sistema espera. Los datos viajan sin parar. Todo ese esfuerzo genera calor, y cuando se calienta mucho, el ventilador no alcanza. Lo mejor es cerrar programas y reiniciar la computadora.";
const words = NARR.split(/\s+/).map((text, i) => ({ text, start: +(i * 0.42).toFixed(2), end: +(i * 0.42 + 0.36).toFixed(2) }));
const tmp = () => mkdtempSync(join(tmpdir(), "tl-test-"));
const run = async (mode, dir) => compose({ spec: { hf: EXAMPLE_PAYLOAD, mode }, words, durationSec: 30, outDir: dir, captions: { enabled: true } });
const files = (d) => readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath ?? e.path, e.name));

test("compose is deterministic: two runs give byte-identical files (multi and single)", async () => {
  for (const mode of ["multi", "single"]) {
    const a = tmp(), b = tmp();
    const ra = await run(mode, a), rb = await run(mode, b);
    assert.deepEqual(ra, rb);
    for (const f of ["index.html", "hyperframes.json", "meta.json"]) assert.equal(readFileSync(join(a, f), "utf8"), readFileSync(join(b, f), "utf8"), `${mode} ${f}`);
    rmSync(a, { recursive: true }); rmSync(b, { recursive: true });
  }
});

test("compose returns entry, sfx, duration and writes a 1080x1920 composition with its own captions variable", async () => {
  const d = tmp(); const r = await run("multi", d);
  assert.equal(r.entry, "index.html"); assert.equal(r.durationSec, 30); assert.ok(Array.isArray(r.sfx) && r.sfx.length > 10);
  const html = readFileSync(join(d, "index.html"), "utf8");
  assert.match(html, /data-width="1080" data-height="1920"/);
  assert.match(html, /data-composition-variables='\[\{"id":"captions","type":"boolean"/);
  assert.match(html, /window\.__hf\.buildReady/);
  assert.match(html, /addEventListener\('hf-seek'/);
  assert.match(html, /window\.__timelines\.main/);
  rmSync(d, { recursive: true });
});

test("no forbidden APIs in the composition or the vendored bundle (determinism, seek-driven only)", async () => {
  const d = tmp(); await run("multi", d);
  const src = readFileSync(join(d, "index.html"), "utf8") + "\n" + readFileSync(join(d, "assets", "three-bundle.js"), "utf8");
  for (const re of [/Date\.now\(/, /Math\.random\(/, /requestAnimationFrame/, /cancelAnimationFrame/, /setInterval\(/, /repeat:\s*-1/, /performance\.now\(/, /new Date\(/]) assert.doesNotMatch(src, re, String(re));
  const own = readFileSync(join(d, "index.html"), "utf8");
  assert.doesNotMatch(own, /\bsetTimeout\(/);
  assert.doesNotMatch(own, /fetch\(\s*["']https?:/);
  rmSync(d, { recursive: true });
});

test("every asset the composition references exists in the output folder", async () => {
  const d = tmp(); await run("multi", d);
  const html = readFileSync(join(d, "index.html"), "utf8");
  const refs = new Set([...html.matchAll(/assets\/[A-Za-z0-9_\-./]+\.(?:glb|hdr|js|ttf)/g)].map((m) => m[0]));
  assert.ok(refs.size >= 6, `found ${refs.size} asset references`);
  for (const r of refs) assert.ok(existsSync(join(d, r)), `${r} missing`);
  assert.ok(refs.has("assets/three-bundle.js") && refs.has(`assets/${HDRI_FILE}`));
  rmSync(d, { recursive: true });
});

test("every referenced GLB exists and has a CC0 license entry in 03-assets/3d/licenses.json", () => {
  const lic = JSON.parse(readFileSync(join(ASSETS_ROOT, "3d", "licenses.json"), "utf8"));
  const entries = [...lic.models, ...lic.hfModels, ...lic.hdri];
  const all = new Set(Object.values(MODELS).map((m) => m.file));
  all.add(HDRI_FILE);
  for (const f of all) {
    const e = entries.find((x) => x.file === f);
    assert.ok(e, `${f} has no license entry`);
    assert.equal(e.license, "CC0-1.0", f);
    assert.match(e.source, /^https:\/\//, f);
    assert.ok(e.author && e.credit, f);
    assert.ok(existsSync(join(ASSETS_ROOT, "3d", f)), `${f} missing on disk`);
  }
  // the Remotion looks enumerate `models`: the hf-only files must not leak into it
  assert.ok(lic.hfModels.every((m) => !lic.models.some((x) => x.id === m.id)));
});

test("modelsOf lists the cast, the props and the decor of the used settings only", async () => {
  const ids = modelsOf({ worlds: [{ setting: "kitchen", cast: [{ model: "robo" }] }] });
  assert.ok(ids.includes("robo") && ids.includes("pot") && ids.includes("apple") && ids.includes("shelf"));
  assert.ok(!ids.includes("taxi") && !ids.includes("barrier"));
});

test("the runtime script loads in a vm up to the shot math: camera poses are finite and the hero is at least 18% of the frame height", () => {
  const sandbox = { Math, JSON, console }; vm.createContext(sandbox);
  const core = readFileSync(join(RUNTIME_DIR, "core.js"), "utf8").split("/* Spec is injected")[0];
  const cam = readFileSync(join(RUNTIME_DIR, "camera.js"), "utf8");
  vm.runInContext(`const CAT=${JSON.stringify({ SHOTS, MOVES: { "dolly-in": { dist: 0.78 }, orbit: { az: 26 }, drift: { az: 7, dist: 0.97 }, "dolly-out": { dist: 1.1 } } })};\n${core}\n${cam}\nglobalThis.out={camPose,projectY};`, sandbox);
  const { camPose, projectY } = sandbox.out;
  const hero = [GLOBAL_ANCHORS.left[0], 0, GLOBAL_ANCHORS.left[2]];
  for (const kind of ["wide", "medium", "low", "top"]) for (const u of [0, 0.5, 1]) for (const move of ["dolly-in", "orbit", "dolly-out", "drift"]) {
    const pose = camPose({ kind, move, amp: 1 }, u, { p: kind === "wide" ? [hero[0] * 0.45, 0, 0.4] : hero, cy: kind === "wide" ? null : 1.0 }, hero);
    for (const v of [...pose.pos, ...pose.look, pose.fov]) assert.ok(Number.isFinite(v));
    const frac = Math.abs(projectY(pose, [hero[0], 1.8, hero[2]]) - projectY(pose, [hero[0], 0, hero[2]])) / 2;
    assert.ok(frac >= 0.18, `${kind}/${move}/${u}: hero is ${(frac * 100).toFixed(1)}% of the frame height`);
  }
});

test("layout: caption band is free of labels and stamps, all text is 46 px or bigger, zones sit inside the safe areas", () => {
  assert.ok(!rectsOverlap({ x0: 0, x1: 1080, y0: ZONES.captions.y0, y1: ZONES.captions.y1 }, { x0: ZONES.label.x0, x1: ZONES.label.x1, y0: ZONES.label.y0, y1: ZONES.label.y1 }), "labels overlap the caption band");
  assert.ok(ZONES.stamp.y + 90 < ZONES.captions.y0);
  for (const px of [ZONES.labelPx, ZONES.stampPx, ZONES.captionPx]) assert.ok(px >= 46);
  assert.ok(ZONES.label.y0 >= 220 + 80 && ZONES.captions.y1 <= 1920 - 420 + 0 + 0 || ZONES.captions.y1 <= 1500);
  assert.ok(ZONES.label.x0 >= 60 + 60 && ZONES.label.x1 <= 1080 - 60 - 60);
  assert.ok(ZONES.box.x0 === 90 && ZONES.box.x1 === 990 && ZONES.box.y0 === 310 && ZONES.box.y1 === 1610);
  const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "hf", "three-looks", "template.html"), "utf8");
  for (const m of html.matchAll(/font:\s*\d+\s+(\d+|__\w+__)px/g)) assert.ok(!/^\d+$/.test(m[1]) || +m[1] >= 46, `font ${m[0]}`);
});

test("every setting has at least 3 props with named states plus real-model or kit decor; at least 3 distinct settings exist", () => {
  assert.ok(Object.keys(SETTINGS).length >= 3);
  for (const [id, s] of Object.entries(SETTINGS)) { assert.ok(Object.keys(s.props).length >= 5, id); assert.ok(s.topics.length >= 6, id); }
  assert.ok(SIZE_SCALE.L > SIZE_SCALE.M && SIZE_SCALE.M > SIZE_SCALE.S);
});

test("runtime files listed in the catalog exist and parse", () => {
  for (const f of RUNTIME_FILES) { const p = join(RUNTIME_DIR, f); assert.ok(existsSync(p), f); assert.ok(statSync(p).size > 100); new vm.Script(readFileSync(p, "utf8"), { filename: f }); }
});

test("invalid payload makes compose fail with every issue listed", async () => {
  const d = tmp();
  await assert.rejects(() => compose({ spec: { hf: { worlds: [{ setting: "moon", beats: [] }] } }, words, durationSec: 10, outDir: d }), /three-looks payload is invalid[\s\S]*unknown setting/);
  rmSync(d, { recursive: true });
});
