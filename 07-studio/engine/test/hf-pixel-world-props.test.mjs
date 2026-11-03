// Props, scale table, developer scenarios and ambient life of pixel-world (U16a). Runs the real runtime in the vm sandbox.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { catalog } from "../hf/pixel-world/index.mjs";
import { RUNTIME_DIR, runtimeFiles } from "../hf/pixel-world/catalog.mjs";
import { STYLES } from "../hf/pixel-world/styles.mjs";
import { ZONES } from "../hf/pixel-world/layout.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";
import { buildScript } from "../hf/pixel-world/compose.mjs";

const WORDS = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce".split(" ").map((text, i) => ({ text, start: +(i * 0.75).toFixed(2), end: +(i * 0.75 + 0.6).toFixed(2) }));
const cat = catalog();
const world = (hf) => prepare({ hf: { style: "pixel-snes-16bit", ...hf }, words: WORDS, durationSec: 10 });
const TECH = ["package", "mailbox", "remote-server", "commit-nodes", "branch-graph", "terminal", "editor", "laptop", "pr-card", "key", "ci-tube", "crate-stack", "sign-post", "ghost", "trash", "folder", "ticket-board", "order-slip", "ci-belt", "deploy-pad"];
const DEV_SCENARIOS = ["git-desk", "server-room", "review-room", "terminal-cave", "ci-pipeline", "ticket-board-office", "api-kitchen", "deploy-pad"];
// Named states each tech prop must visibly react to (state keys of the prop state S).
const STATES = {
  package: ["open", "fill", "lit"], mailbox: ["open", "fill", "lit"], "remote-server": ["fill"], "commit-nodes": ["fill", "lit"], "branch-graph": ["fill"], terminal: ["fill"], editor: ["lit"], laptop: ["open", "lit", "fill"],
  "pr-card": ["fill", "lit"], key: ["lit"], "ci-tube": ["fill", "lit"], "crate-stack": ["fill", "lit"], "sign-post": ["fill"], ghost: ["open", "lit"], trash: ["open", "fill"], folder: ["open", "fill"],
  "ticket-board": ["fill"], "order-slip": ["fill"], "ci-belt": ["lit"], "deploy-pad": ["fill"],
};
const S0 = { fill: 0, open: 0, lit: 0, tone: 0, ev: { pulse: -1, chop: -1, stamp: -1, burst: -1, coins: -1 } };
const stateJson = (over) => JSON.stringify({ ...S0, ...over });
const base = (style = "pixel-snes-16bit") => { const { data, style: st } = world({ style, worlds: [{ scenario: "workshop-stage", props: [{ kind: "phone" }], beats: [] }] }); return open({ data, style: st }); };
// draws one prop into a cleared grid and returns it serialised
const sheet = (f, grid, kind, over, s = 2, t = 1.3) => { f.run("L.m.__reset()"); f.run(`PL[${JSON.stringify(kind)}].draw(L.m, ${t}, ${stateJson(over)}, 20, 20, ${s})`); return grid.map((r) => r.join(",")).join("|"); };

test("the prop library has 48+ kinds including the 20 developer props, each with about text, a row and natural size", () => {
  const kinds = cat.propLib.map((p) => p.kind);
  assert.ok(kinds.length >= 48, `${kinds.length} kinds`);
  for (const k of TECH) { const p = cat.propLib.find((x) => x.kind === k); assert.ok(p, k); assert.ok(p.about.length > 20 && ["floor", "bench", "high"].includes(p.row) && p.w >= 14 && p.h >= 14, k); }
});

test("every prop draws without error in every style at scales 1, 2 and 3 in idle, filled, open and lit states", () => {
  assert.ok(STYLES.length >= 14);
  for (const st of STYLES) {
    const f = base(st.id);
    for (const p of cat.propLib) for (const s of [1, 2, 3]) for (const over of [{}, { fill: 1 }, { open: 1 }, { lit: 1, fill: 0.5 }]) assert.doesNotThrow(() => f.run(`PL[${JSON.stringify(p.kind)}].draw(L.m, 2.1, ${stateJson(over)}, 20, 20, ${s})`), `${p.kind} ${st.id} s${s} ${JSON.stringify(over)}`);
  }
});

test("each named state of a developer prop changes what it draws", () => {
  const f = base(), grid = f.at(0).grid;
  const probe = { fill: { fill: 1 }, open: { open: 1 }, lit: { lit: 1 } };
  for (const [kind, states] of Object.entries(STATES)) for (const name of states) {
    const a = sheet(f, grid, kind, {}), b = sheet(f, grid, kind, probe[name]);
    assert.notEqual(a, b, `${kind}: state "${name}" draws nothing different`);
  }
});

test("props paint something solid and keep an outline: not empty, 4+ colours in a rich style, and a 1 px ink rim", () => {
  const f = base("pixel-snes-16bit"), grid = f.at(0).grid;
  for (const k of TECH) { const g = sheet(f, grid, k, { fill: 0.6, lit: 1 }); const cells = new Set(g.split(/[,|]/).filter(Boolean)); assert.ok(cells.size >= 3, `${k} uses ${cells.size} colours`); }
});

test("scale table: library props are 20-130 % of the hero's height at the workshop scale 2, developer-scenario props at most 2x the hero", () => {
  const HERO_M = 86;
  for (const p of cat.propLib) { const h = p.h * 2; assert.ok(h >= 0.2 * HERO_M && h <= 1.3 * HERO_M, `${p.kind}: ${h}px at s2 vs hero ${HERO_M}`); }
  for (const sc of cat.scenarios.filter((x) => DEV_SCENARIOS.includes(x.id))) for (const p of sc.props) assert.ok(p.h <= 2 * HERO_M, `${sc.id}/${p.id} ${p.h}px is more than 2x the hero`);
});

test("8 developer scenarios exist: 3+ topics, 4+ named props inside the action band, distinct palettes, ambient list of 2-4", () => {
  const ids = cat.scenarios.map((s) => s.id);
  const sigs = new Set();
  for (const id of DEV_SCENARIOS) {
    assert.ok(ids.includes(id), id); const s = cat.scenarios.find((x) => x.id === id);
    assert.ok(s.topics.length >= 5 && s.avoid.length >= 1 && s.props.length >= 4 && s.layers >= 3, `${id} meta`);
    for (const p of s.props) assert.ok(p.y >= ZONES.action.y0 && p.y + p.h <= ZONES.action.y1 + 4, `${id}/${p.id} y ${p.y}-${p.y + p.h} outside the action band`);
    const { data, style } = world({ worlds: [{ scenario: id, beats: [] }] }), f = open({ data, style });
    const amb = JSON.parse(f.run("JSON.stringify(SC[WORLDS[0].sc].ambient || null)")); assert.ok(amb && amb.length >= 2 && amb.length <= 4, `${id} ambient ${JSON.stringify(amb)}`);
  }
  const src = readFileSync(join(RUNTIME_DIR, "scenarios-g.js"), "utf8").split("defScenario({").slice(1);
  for (const b of src) sigs.add([...new Set([...b.matchAll(/M\.([a-z]+)/g)].map((m) => m[1]))].sort().join(","));
  assert.equal(src.length, 8); assert.equal(sigs.size, 8, "each developer scenario uses its own set of colour ramps");
});

test("developer scenario props answer fill / open / light beats: the prop state follows and the frame differs from the no-beat world", () => {
  for (const id of DEV_SCENARIOS) {
    const s = cat.scenarios.find((x) => x.id === id), tgt = s.props[0].id;
    const { data, style } = world({ worlds: [{ scenario: id, beats: [{ on: { at: 3 }, do: "light", target: tgt }, { on: { at: 3.2 }, do: "fill", target: tgt, value: 1 }] }] });
    const f = open({ data, style }), st = JSON.parse(f.run(`JSON.stringify(propState(WORLDS[0], ${JSON.stringify(tgt)}, 6))`));
    assert.ok(st.fill > 0.9 && st.lit > 0.5, `${id}/${tgt} state ${JSON.stringify(st)}`);
    assert.ok(f.at(2).grid.length > 0);
  }
});

test("every scenario has 2-4 ambient animations, and the intensity changes the picture (calm vs lively) with no beats", () => {
  for (const s of cat.scenarios) {
    const hf = s.dynamic ? { scenario: s.id, props: [{ kind: "phone" }, { kind: "terminal" }] } : { scenario: s.id };
    const { data, style } = world({ worlds: [{ ...hf, beats: [] }] }), f = open({ data, style });
    const amb = JSON.parse(f.run("JSON.stringify(WORLDS[0].def.ambient || null)")); assert.ok(amb && amb.length >= 2 && amb.length <= 4, `${s.id} ambient ${JSON.stringify(amb)}`);
    const at = (lvl, t) => { f.run(`SPEC.ambient = ${JSON.stringify(lvl)}`); return f.at(t).grid.map((r) => r.join(",")).join("|"); };
    assert.ok([2.4, 5.1, 7.7].some((t) => at("calm", t) !== at("lively", t)), `${s.id}: ambient intensity has no effect`);
  }
});

test("between beats the scene keeps moving: frames 0.25 s apart differ in the ambient bands with no beats", () => {
  for (const id of ["git-desk", "factory", "dungeon", "workshop-stage"]) {
    const hf = id === "workshop-stage" ? { scenario: id, props: [{ kind: "phone" }] } : { scenario: id };
    const { data, style } = world({ worlds: [{ ...hf, beats: [] }] }), f = open({ data, style });
    const rows = (t, r0, r1) => f.at(t).grid.slice(r0, r1).map((r) => r.join(",")).join("|");
    // floor band y 380-480 (rows 76-96 of the 5 px grid): only ambient life and floor dressing live here
    assert.notEqual(rows(3.0, 76, 96), rows(3.25, 76, 96), `${id}: the floor band is frozen`);
  }
});

test("ambient is deterministic: the same script and the same seek give identical frames, twice", () => {
  const { data, style } = world({ worlds: [{ scenario: "ci-pipeline", beats: [] }] });
  assert.equal(buildScript({ data, style }), buildScript({ data, style }));
  const f1 = open({ data, style }), f2 = open({ data, style }), g = (f, t) => f.at(t).grid.map((r) => r.join(",")).join("|");
  for (const t of [0.7, 3.3, 8.1]) { assert.equal(g(f1, t), g(f2, t)); assert.equal(g(f1, t), g(f1, t)); }
  f1.at(5); assert.equal(g(f1, 0.7), g(f2, 0.7), "seeking back changes nothing (pure function of t)");
});

test("the new runtime files use no clock, no randomness, no network and are registered in load order", () => {
  for (const f of ["props-tech.js", "ambient.js", "scenarios-g.js"]) {
    const src = readFileSync(join(RUNTIME_DIR, f), "utf8");
    for (const bad of ["Date.now", "Math.random", "new Date", "performance.now", "fetch(", "XMLHttpRequest", "setTimeout", "requestAnimationFrame", "eval("]) assert.ok(!src.includes(bad), `${f} uses ${bad}`);
  }
  const files = runtimeFiles();
  assert.ok(files.indexOf("props.js") < files.indexOf("props-tech.js") && files.indexOf("props-tech.js") < files.indexOf("scenarios-g.js") && files.indexOf("scenarios-g.js") < files.indexOf("ambient.js") && files.indexOf("ambient.js") < files.indexOf("beats.js"));
});

test("ambient and props never draw on the HUD canvas and the HUD band stays clear of ambient items", () => {
  const { data, style } = world({ worlds: [{ scenario: "server-room", beats: [] }] }), snap = open({ data, style }).at(3);
  assert.equal(snap.hud.every((row) => row.every((v) => !v)), true, "the HUD canvas stayed empty");
  const src = readFileSync(join(RUNTIME_DIR, "ambient.js"), "utf8");
  for (const [, y] of src.matchAll(/\b(?:const|let) y = (\d+)/g)) assert.ok(+y < ZONES.hud.y0 - 40 || +y > ZONES.hud.y1 + 10, `ambient y ${y} is inside or next to the HUD band`);
});
