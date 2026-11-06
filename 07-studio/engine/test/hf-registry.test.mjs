// HyperFrames format registry: discovery, the module contract and the internal-format flag.
process.env.CC_HF_INTERNAL = "1"; // before any import of lib/spec.mjs: the reference stub is visible in this file
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupEnv } from "../lib/env.mjs";

setupEnv();
const reg = await import("../hf/registry.mjs");
const { HF_TEMPLATE_IDS, TEMPLATE_IDS } = await import("../lib/spec.mjs");
const HF_DIR = fileURLToPath(new URL("../hf", import.meta.url));

const GOOD = `export const meta = { id: "ID", name: "N", about: "A", modes: ["single"], styles: [{ id: "a", name: "A", about: "a" }], settings: [] };
export const payloadSchema = { safeParse: (v) => ({ success: true, data: v }) };
export const promptSection = "p";
export async function compose() { return { entry: "index.html", sfx: [], durationSec: 1 }; }
`;

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "hf-reg-"));
  for (const [id, src] of Object.entries(files)) {
    mkdirSync(join(dir, id));
    writeFileSync(join(dir, id, "index.mjs"), src.replaceAll("ID", id));
  }
  return dir;
}

test("loadHfRegistry loads valid modules by directory id and skips directories without index.mjs", async () => {
  const dir = fixture({ alpha: GOOD, beta: GOOD });
  mkdirSync(join(dir, "wip"));
  const r = await reg.loadHfRegistry(dir);
  assert.deepEqual([...r.keys()], ["alpha", "beta"]);
  assert.equal(r.get("alpha").internal, false);
  rmSync(dir, { recursive: true, force: true });
});

test("a module that violates the contract fails clearly, naming the format and every problem", async () => {
  const bad = {
    noCompose: GOOD.replace("export async function compose() { return { entry: \"index.html\", sfx: [], durationSec: 1 }; }", ""),
    wrongId: GOOD.replace('id: "ID"', 'id: "other"'),
    badModes: GOOD.replace('modes: ["single"]', 'modes: ["triple"]'),
    noPrompt: GOOD.replace('export const promptSection = "p";', ""),
    badSchema: GOOD.replace("{ safeParse: (v) => ({ success: true, data: v }) }", "{}"),
    dupStyles: GOOD.replace('styles: [{ id: "a", name: "A", about: "a" }]', 'styles: [{ id: "a", name: "A", about: "a" }, { id: "a", name: "B", about: "b" }]'),
  };
  const expect = { noCompose: /compose/, wrongId: /meta\.id must equal the directory name "wrongId"/, badModes: /meta\.modes/, noPrompt: /promptSection/, badSchema: /payloadSchema/, dupStyles: /duplicates id "a"/ };
  for (const [id, src] of Object.entries(bad)) {
    const dir = fixture({ [id]: src });
    await assert.rejects(() => reg.loadHfRegistry(dir), (e) => e instanceof reg.HfContractError && e.message.includes(`HyperFrames format "${id}"`) && expect[id].test(e.message), id);
    rmSync(dir, { recursive: true, force: true });
  }
  const dir = fixture({ broken: "export const meta = (" });
  await assert.rejects(() => reg.loadHfRegistry(dir), /"broken".*failed to load/);
  rmSync(dir, { recursive: true, force: true });
});

test("the reference stub is internal: listed only with the env flag; getHfFormat/isHfTemplate follow the same rule", () => {
  assert.ok(reg.listHfFormats().some((f) => f.id === "_stub"));
  assert.equal(reg.isHfTemplate("_stub"), true);
  assert.equal(reg.getHfFormat("_stub").meta.id, "_stub");
  const prev = process.env.CC_HF_INTERNAL;
  delete process.env.CC_HF_INTERNAL;
  try {
    assert.equal(reg.listHfFormats().some((f) => f.id === "_stub"), false);
    assert.equal(reg.listHfFormats({ includeInternal: true }).some((f) => f.id === "_stub"), true);
    assert.equal(reg.isHfTemplate("_stub"), false);
    assert.throws(() => reg.getHfFormat("_stub"), /Unknown HyperFrames format "_stub"/);
  } finally {
    process.env.CC_HF_INTERNAL = prev;
  }
  assert.throws(() => reg.getHfFormat("nope"), /Available:/);
  assert.equal(reg.isHfTemplate("illustrated"), false);
});

test("every public format module on disk has its id in HF_TEMPLATE_IDS (spec.mjs is browser-safe, so the ids are listed there)", () => {
  const onDisk = readdirSync(HF_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_")).filter((d) => readdirSync(join(HF_DIR, d.name)).includes("index.mjs")).map((d) => d.name);
  for (const id of onDisk) assert.ok(HF_TEMPLATE_IDS.includes(id), `${id} missing from HF_TEMPLATE_IDS in lib/spec.mjs`);
  for (const id of HF_TEMPLATE_IDS) assert.ok(TEMPLATE_IDS.includes(id), id);
});

test("hfTemplateEntry gives a catalog entry with gallery metadata, the caption-ownership flag and format defaults", () => {
  const t = reg.hfTemplateEntry("_stub");
  for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults"]) assert.ok(t[k], k);
  assert.equal(t.engine, "hyperframes");
  assert.equal(t.ownsCaptions, true);
  assert.deepEqual(t.modes, ["single", "multi"]);
  assert.equal(t.defaults.sfx.enabled, true);
});

test("hfPromptFor appends the module's promptSection to the common rules", () => {
  const p = reg.hfPromptFor("_stub", "COMMON RULES\n");
  assert.ok(p.startsWith("COMMON RULES"));
  assert.ok(p.includes(reg.getHfFormat("_stub").promptSection.trim()));
});

test("tolerant loading keeps the working formats and reports the broken ones instead of failing everything", async () => {
  const dir = fixture({ fine: GOOD, broken: 'import "./missing.mjs";\n' + GOOD, bad: GOOD.replace('modes: ["single"]', "modes: []") });
  try {
    const { formats, failures } = await reg.loadHfRegistryTolerant(dir);
    assert.deepEqual([...formats.keys()], ["fine"]);
    assert.deepEqual([...failures.keys()].sort(), ["bad", "broken"]);
    assert.ok(failures.get("broken") instanceof reg.HfContractError);
    assert.match(failures.get("broken").message, /failed to load/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("asking for a format that failed to load explains why, and the strict loader still throws", async () => {
  const msg = reg.unknownFormatMessage("three-looks", ["pixel-world", "flat-2d"], new Map([["three-looks", new Error("the module failed to load: Cannot find module compose.mjs")]]));
  assert.match(msg, /"three-looks" is installed but failed to load: the module failed to load: Cannot find module compose\.mjs/);
  assert.match(msg, /Available: pixel-world, flat-2d/);
  assert.match(reg.unknownFormatMessage("nope", ["a"], new Map()), /Unknown HyperFrames format "nope"\. Available: a/);
  const dir = fixture({ broken: 'import "./missing.mjs";\n' + GOOD });
  try {
    await assert.rejects(() => reg.loadHfRegistry(dir), /"broken".*failed to load/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
