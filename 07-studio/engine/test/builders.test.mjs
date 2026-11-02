// Parametric stage builders: deterministic, seed-driven, within the caps, valid parts; the `builders` CLI; the process-explainer
// master template, its topic-neutral metadata and the three acceptance examples (pool, tech tutorial, story).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { listTemplates, getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { THREE_D_TEMPLATE_IDS, planThree } from "../lib/scene3d.mjs";
import { BUILDER_NAMES, describeBuilders, expandBuilders, resolveParams, runBuilder } from "../lib/scene3d-builders.mjs";
import { MAX_PARTS, MAX_WORLD_EXPANDED, partSchema } from "../lib/scene3d-motion.mjs";

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => JSON.parse(readFileSync(here(rel), "utf8"));
const maxParams = (name) => {
  const defs = describeBuilders().find((d) => d.name === name).params;
  return Object.fromEntries(Object.entries(defs).filter(([, d]) => d.type === "number" || d.type === "integer").map(([k, d]) => [k, d.max]));
};

test("the catalog covers tech, science, history, city and office domains", () => {
  const want = ["laptop", "phone", "router", "data-cable", "server-rack", "chip", "database-cylinder", "browser-window", "planet", "atom", "cell", "plant", "mountain", "river", "volcano", "castle", "ship", "flag", "map-table", "cart", "tent", "person", "building", "bridge", "road", "car-lowpoly", "factory", "crane", "wind-turbine", "solar-panel", "battery", "desk", "chart-3d", "coin-stack", "safe", "calendar", "house", "tree", "fence", "grass-tufts", "flowers", "rocks", "cloud", "pool", "pipe-run", "rebar-grid", "slab", "valve", "machine-box", "gear-train"];
  for (const n of want) assert.ok(BUILDER_NAMES.includes(n), `missing builder ${n}`);
});

test("every builder: deterministic by seed, differs across seeds, unique ids, valid parts within the caps", () => {
  for (const name of BUILDER_NAMES) {
    const a = runBuilder(name, {}, { seed: 1 });
    const b = runBuilder(name, {}, { seed: 1 });
    assert.deepEqual(a, b, `${name} is not deterministic`);
    const other = runBuilder(name, {}, { seed: 2 });
    const differs = JSON.stringify(a.parts) !== JSON.stringify(other.parts);
    // builders with nothing random in their default look vary through params instead: cover that below
    if (!differs) assert.ok(JSON.stringify(runBuilder(name, maxParams(name), { seed: 1 }).parts) !== JSON.stringify(a.parts), `${name} ignores both seed and params`);
    assert.ok(a.parts.length >= 6 && a.parts.length <= MAX_PARTS, `${name} has ${a.parts.length} parts`);
    const ids = a.parts.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${name} has duplicate ids`);
    for (const p of a.parts) {
      const r = partSchema.safeParse(p);
      assert.ok(r.success, `${name}/${p.id}: ${r.success ? "" : r.error.issues[0].message}`);
      assert.ok((p.pos ?? []).every((v) => Math.abs(v) <= 5), `${name}/${p.id} lies beyond 5 units`);
      if (p.parent !== undefined) assert.ok(ids.includes(p.parent), `${name}/${p.id} has an unknown parent`);
    }
  }
});

test("builders stay inside the caps at their maximum numeric params", () => {
  for (const name of BUILDER_NAMES) {
    let res;
    try {
      res = runBuilder(name, maxParams(name), { seed: 3 });
    } catch (e) {
      assert.fail(`${name} at max params: ${e.message}`);
    }
    assert.ok(res.parts.length <= MAX_PARTS, `${name} has ${res.parts.length} parts at max params`);
    // big models may exceed the actor position box (the expansion reports that to the author); everything else must stay valid
    for (const p of res.parts) assert.ok(partSchema.safeParse({ ...p, pos: p.pos?.map((v) => Math.max(-5, Math.min(5, v))) }).success, `${name}/${p.id} invalid at max params`);
  }
});

test("params are validated: unknown keys, wrong types and bad enums are reported with the builder name", () => {
  assert.throws(() => runBuilder("house", { floors: "two" }), /house/);
  assert.throws(() => runBuilder("house", { roof: "dome" }), /gable/);
  assert.throws(() => runBuilder("nope"), /unknown builder/);
  assert.ok(resolveParams("house", { zzz: 1 }).errors.some((e) => /unknown param "zzz"/.test(e)));
  assert.equal(resolveParams("house", { floors: 99 }).params.floors, 3, "numbers clamp to their range");
});

test("a builder call in stage.actors expands before validation and reports bad calls by path", () => {
  const stage = { concept: "tiny town", actors: [{ build: "house", id: "h", pos: [0, 0, 0], params: { floors: 1 }, seed: 4 }] };
  const raw = { version: 1, title: "x", template: "process-explainer", voice: { provider: "none" }, stage, scenes: [{ id: "a", narration: "One house stands here.", title: { main: "House" }, visual: { type: "scene3d" } }] };
  const ok = validateSpec(raw);
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  assert.ok(ok.spec.stage.actors[0].parts.length > 20);
  assert.equal(ok.spec.stage.actors[0].build, undefined);
  assert.equal(raw.stage.actors[0].build, "house", "the input is never mutated");
  const bad = validateSpec({ ...raw, stage: { ...stage, actors: [{ build: "house", id: "h", params: { nope: 1 } }] } });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors[0].path, "stage.actors.0.build");
  assert.match(bad.errors[0].message, /unknown param "nope"/);
  assert.equal(expandBuilders({ stage: { actors: [{ id: "x", parts: [] }] } }).spec.stage.actors[0].id, "x");
});

test("a builder call in stage.world.parts becomes a group root with the parts hanging from it; scatter builders add scatter configs", () => {
  const world = { concept: "meadow", parts: [{ build: "fence", id: "f", pos: [1, 0, -2], params: { length: 4 } }, { build: "grass-tufts", id: "g", params: { count: 30, area: [-3, -3, 3, 3] } }, { build: "tree", id: "t", params: { density: 1 }, scatter: { count: 3, area: [-4, -6, 4, -4] } }] };
  const { spec } = expandBuilders({ stage: { concept: "x", world } });
  const parts = spec.stage.world.parts;
  assert.equal(parts.find((p) => p.id === "f").shape, "group");
  assert.ok(parts.filter((p) => p.id.startsWith("f.")).every((p) => p.parent === "f" || parts.some((q) => q.id === p.parent)));
  assert.equal(spec.stage.world.scatter.length, 2);
  for (const sc of spec.stage.world.scatter) assert.ok(parts.some((p) => p.id === sc.part), "scatter templates exist");
});

test("`node cli.mjs builders` prints every builder with params and defaults as JSON", () => {
  const r = spawnSync(process.execPath, [here("../cli.mjs"), "builders"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const list = JSON.parse(r.stdout);
  assert.equal(list.length, BUILDER_NAMES.length);
  const house = list.find((b) => b.name === "house");
  assert.equal(house.params.floors.default, 2);
  assert.ok(house.about.length > 20 && house.defaultParts > 40);
});

test("process-explainer is a registered 3D master template with five recipes and topic-neutral metadata", () => {
  assert.ok(THREE_D_TEMPLATE_IDS.includes("process-explainer"));
  const t = listTemplates().find((x) => x.id === "process-explainer");
  assert.equal(t.category, "3d");
  assert.equal(t.format, "process-explainer");
  assert.deepEqual(Object.keys(t.recipes), ["build-process", "how-it-works", "what-happened", "cause-effect", "compare"]);
  const subjects = Object.values(t.recipes).map((r) => r.subject);
  assert.equal(new Set(subjects).size, 5, "each recipe shows a different subject");
  const meta = JSON.stringify(t).toLowerCase();
  assert.ok((meta.match(/pool/g) ?? []).length <= 1, "no single domain is the default of the template metadata");
  const eng = getTemplate("engineering-explainer");
  assert.match(eng.description, /process-explainer/);
  assert.match(eng.prompt_hint, /stage/);
});

test("the spec-writer 3D docs describe builders and process-explainer without making one domain the default", () => {
  const md = readFileSync(here("../prompts/spec-writer.md"), "utf8");
  const i = md.indexOf("### `process-explainer`");
  assert.ok(i > 0, "a process-explainer subsection exists");
  const section = md.slice(i, md.indexOf("\n## ", i));
  assert.match(section, /node cli\.mjs builders/);
  for (const r of ["build-process", "how-it-works", "what-happened", "cause-effect", "compare"]) assert.ok(section.includes(r), r);
  assert.ok((section.toLowerCase().match(/pool/g) ?? []).length <= 1);
});

const planOf = (raw) => {
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const res = resolveSpec(r.spec, getTemplate(raw.template));
  const timeline = computeTimeline(res.scenes, { fps: res.format.fps });
  return { plans: planThree(res, timeline), res, spec: r.spec };
};
const EXAMPLES = ["process-pool", "process-tech-tutorial", "process-story", "process-explainer"];

test("the acceptance examples validate and plan one persistent stage across their scenes", () => {
  for (const id of EXAMPLES) {
    const raw = read(`../examples/${id}.spec.json`);
    assert.equal(raw.template, "process-explainer");
    const { plans, spec } = planOf(raw);
    assert.equal(plans.length, raw.scenes.length);
    assert.ok(plans.every((p) => p.stage === plans[0].stage), `${id}: one shared stage`);
    assert.ok(raw.scenes.length >= 3 && raw.scenes.every((s) => (s.visual.beats ?? []).length || id === "process-explainer"), `${id}: scenes carry beats`);
    assert.ok(plans[0].stage.world ? plans[0].stage.world.parts.length <= MAX_WORLD_EXPANDED : true);
    assert.ok(spec.stage.actors.every((a) => a.parts.length <= MAX_PARTS));
  }
});

test("the pool example keeps its terrain, carves and liquids; the three kinds use at least 12 distinct builders overall", () => {
  const pool = planOf(read("../examples/process-pool.spec.json")).plans[0].stage;
  assert.ok(pool.terrain.carves.length >= 3 && pool.liquids.length >= 2);
  const used = new Set();
  const scan = (o) => {
    if (Array.isArray(o)) o.forEach(scan);
    else if (o && typeof o === "object") {
      if (typeof o.build === "string") used.add(o.build);
      Object.values(o).forEach(scan);
    }
  };
  for (const id of ["process-pool", "process-tech-tutorial", "process-story"]) scan(read(`../examples/${id}.spec.json`));
  assert.ok(used.size >= 12, `only ${used.size} distinct builders: ${[...used].join(", ")}`);
  for (const id of ["process-tech-tutorial", "process-story"]) {
    const names = new Set();
    const s = read(`../examples/${id}.spec.json`);
    (function walk(o) {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        if (typeof o.build === "string") names.add(o.build);
        Object.values(o).forEach(walk);
      }
    })(s);
    assert.ok(names.size >= 6, `${id} uses ${names.size} builders`);
    assert.ok(!names.has("pool"), `${id} is not a reskin of the pool`);
  }
});

test("each 3D look has a stage-based example built from builders that validates", () => {
  for (const look of ["clay-diorama", "voxel-world", "neon-grid", "soft-studio", "moody-night", "iso-toon"]) {
    const raw = read(`../examples/${look}-stage.spec.json`);
    assert.equal(raw.template, look);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${look}: ${JSON.stringify(r.errors)}`);
    assert.ok(JSON.stringify(raw).includes('"build"'));
  }
});
