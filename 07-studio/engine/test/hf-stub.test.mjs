// The reference format module: contract behavior, deterministic compose, its own captions variable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupEnv } from "../lib/env.mjs";
import * as stub from "../hf/_stub/index.mjs";

setupEnv();
const spec = {
  language: "es",
  theme: { palette: { bg: ["#101020", "#303060"], text: "#FFFFFF", accent: "#FFD60A" } },
  hf: { style: "gradient", textScale: 1 },
  scenes: [
    { id: "a", narration: "Hola mundo bonito.", onScreenText: "HOLA" },
    { id: "b", narration: "Segunda escena aqui.", onScreenText: "DOS" },
  ],
};
const words = [["Hola", 0.2, 0.5], ["mundo", 0.5, 0.9], ["bonito.", 0.9, 1.4], ["Segunda", 2, 2.4], ["escena", 2.4, 2.9], ["aqui.", 2.9, 3.3]].map(([text, start, end]) => ({ text, start, end }));

async function run(captions) {
  const outDir = mkdtempSync(join(tmpdir(), "hf-stub-"));
  const r = await stub.compose({ spec, words, durationSec: 4, outDir, assetsDir: join(outDir, "assets"), captions: { enabled: captions } });
  return { outDir, r, files: Object.fromEntries(readdirSync(outDir).map((f) => [f, readFileSync(join(outDir, f))])) };
}

test("compose is deterministic: the same input writes byte-identical files", async () => {
  const a = await run(true);
  const b = await run(true);
  assert.deepEqual(Object.keys(a.files), ["index.html"]);
  assert.ok(a.files["index.html"].equals(b.files["index.html"]));
  assert.deepEqual(a.r, b.r);
  rmSync(a.outDir, { recursive: true, force: true });
  rmSync(b.outDir, { recursive: true, force: true });
});

test("compose returns { entry, sfx, durationSec }; SFX cues land on the word starts and scene cuts", async () => {
  const { r, outDir } = await run(true);
  assert.equal(r.entry, "index.html");
  assert.equal(r.durationSec, 4);
  assert.ok(r.sfx.every((c) => typeof c.at === "number" && c.at >= 0 && typeof c.kind === "string"));
  assert.ok(r.sfx.some((c) => c.kind === "pop" && c.at === 0.2), "pop on the first word of scene 1");
  assert.ok(r.sfx.some((c) => c.kind === "pop" && c.at === 2), "pop on the first word of scene 2");
  assert.ok(r.sfx.some((c) => c.kind === "cut" && c.at > 1.4 && c.at < 2), "cut between the scenes");
  rmSync(outDir, { recursive: true, force: true });
});

test("the composition draws its own captions behind the `captions` variable, bound to the word timings", async () => {
  const on = await run(true);
  const off = await run(false);
  const html = on.files["index.html"].toString();
  assert.match(html, /data-composition-variables='\[\{"id":"captions","type":"boolean","label":"Captions","default":true\}\]'/);
  assert.match(off.files["index.html"].toString(), /"default":false/);
  assert.match(html, /getVariables/);
  assert.match(html, /"t":"Hola","s":0\.2/);
  assert.match(html, /"t":"Segunda","s":2/);
  assert.match(html, /data-duration="4"/);
  assert.match(html, /hf-seek/);
  rmSync(on.outDir, { recursive: true, force: true });
  rmSync(off.outDir, { recursive: true, force: true });
});

test("the stub's payload schema rejects unknown keys and out-of-range values; normalize fixes slips without dropping content", () => {
  assert.equal(stub.payloadSchema.safeParse({ style: "solid", nope: 1 }).success, false);
  assert.equal(stub.payloadSchema.safeParse({ textScale: 2 }).success, false);
  assert.deepEqual(stub.payloadSchema.parse({}), { style: "solid", textScale: 1 });
  const n = stub.normalize({ hf: { style: " SOLID ", textScale: "1.2", accent: "#fff" } });
  assert.deepEqual(n.hf, { style: "solid", textScale: 1.2, accent: "#fff" });
});
