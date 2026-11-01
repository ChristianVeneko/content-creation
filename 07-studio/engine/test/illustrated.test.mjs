import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSpec, resolveSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { computeBeats, maxConcurrent, planIllustration, planScene, REGIONS, scheduleSfx } from "../lib/illustrated.mjs";
import { collectIconNames, loadIcons, parseIconSvg } from "../lib/icons.mjs";

const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const example = JSON.parse(readFileSync(new URL("../examples/sdd-vs-odd.illustrated.spec.json", import.meta.url), "utf8"));

const mini = () => ({
  version: 1,
  title: "Mini",
  template: "illustrated",
  hud: { items: [{ id: "mode", type: "chip", value: "SDD" }, { id: "progress", type: "bar", label: "Progreso", value: 0.2 }] },
  scenes: [
    {
      id: "hook",
      narration: "Dos formas de construir software.",
      title: { kicker: "Dos formas de", main: "construir", quote: true },
      hud: { progress: { value: 0.5 } },
      visual: {
        type: "illustration",
        elements: [
          { type: "compare", id: "cmp", left: { title: "SDD", items: ["Spec primero"] }, right: { title: "ODD", items: ["Codigo real"] }, winner: "right" },
          { type: "callout", target: "cmp", shape: "circle" },
        ],
      },
    },
  ],
});

test("cli templates lists illustrated first and keeps the 5 previous templates", () => {
  const list = JSON.parse(execFileSync(process.execPath, [cli, "templates"], { encoding: "utf8" }));
  assert.ok(list.length >= 15);
  assert.equal(list[0].id, "illustrated");
  assert.equal(list[0].name, "Illustrated Explainer");
  for (const id of ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"]) assert.ok(list.some((t) => t.id === id), id);
  assert.equal(list[0].preview.style, "illustrated");
  assert.ok(list[0].preview.sample_text);
});

test("illustrated example spec and a minimal illustrated spec are valid", () => {
  for (const s of [example, mini()]) {
    const r = validateSpec(s);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
  }
  assert.ok(example.scenes.length >= 8 && example.scenes.length <= 14);
  const types = new Set(example.scenes.flatMap((s) => s.visual.elements.map((e) => e.type)));
  assert.ok(types.size >= 10, `example uses only ${types.size} element types`);
});

test("rejects an unknown element type with a clear path and the allowed types", () => {
  const s = mini();
  s.scenes[0].visual.elements.push({ type: "hologram", text: "x" });
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  const e = r.errors.find((x) => x.path === "scenes.0.visual.elements.2.type");
  assert.ok(e, JSON.stringify(r.errors));
  assert.match(e.message, /unknown element type; use one of: card, flow, compare/);
});

test("rejects an illustration without elements and emoji in illustrated text", () => {
  const s = mini();
  s.scenes[0].visual = { type: "illustration" };
  s.scenes[0].title.main = "Cohete 🚀";
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "scenes.0.visual.elements" && /requires at least one element/.test(e.message)), JSON.stringify(r.errors));
  assert.ok(r.errors.some((e) => e.path === "scenes.0.title.main" && /emoji are not allowed/.test(e.message)), JSON.stringify(r.errors));
  // arrows are typography, not emoji
  const ok = mini();
  ok.scenes[0].title.main = "Spec → Código";
  assert.equal(validateSpec(ok).ok, true);
});

test("rejects a callout whose target id does not exist in the scene", () => {
  const s = mini();
  s.scenes[0].visual.elements[1].target = "missing";
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "scenes.0.visual.elements.1.target" && /no element with id "missing"/.test(e.message)), JSON.stringify(r.errors));
});

test("illustrated template defaults: pills captions, sfx on, ducked music", () => {
  const r = validateSpec(mini());
  const full = resolveSpec(r.spec, getTemplate("illustrated"));
  assert.equal(full.theme.captionStyle, "pills");
  assert.equal(full.sfx.enabled, true);
  assert.equal(full.music.duck, true);
  assert.equal(full.music.track, "auto");
  assert.equal(full.theme.palette.bg[0].toLowerCase(), "#0b1020");
});

test("planScene keeps every element inside the stage without overlaps", () => {
  for (const scene of example.scenes) {
    const p = planScene(scene.visual.elements, 5);
    const boxes = p.elements.filter((e) => e.box).map((e) => e.box);
    for (const b of boxes) {
      assert.ok(p.offsetY + (b.y + b.h) * p.scale <= REGIONS.stage.h + 0.5, `${scene.id} overflows the stage`);
    }
    for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].y >= boxes[i - 1].y + boxes[i - 1].h, `${scene.id} overlap`);
  }
});

test("auto-stagger spreads entrances and keeps a reading hold at the end", () => {
  const els = [{ type: "badge", text: "a" }, { type: "badge", text: "b" }, { type: "badge", text: "c" }];
  const p = planScene(els, 8);
  const t = p.elements.map((e) => e.enter);
  assert.ok(t[0] < 1 && t[1] > t[0] && t[2] > t[1]);
  assert.ok(t[2] <= 8 - 1.4, `last entrance ${t[2]} leaves no hold`);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] - t[i - 1] <= 3.2);
  const explicit = planScene([{ type: "badge", text: "a", at: 2.5 }], 8);
  assert.equal(explicit.elements[0].enter, 2.5);
});

test("beats: a cut per scene change, element pops, checklist ticks and typing clicks", () => {
  const spec = resolveSpec(validateSpec(example).spec, getTemplate("illustrated"));
  const tl = computeTimeline(spec.scenes.map((s) => ({ narration: s.narration })), { fps: 30 });
  const beats = computeBeats(planIllustration(spec, tl), tl, 30);
  assert.equal(beats.filter((b) => b.kind === "cut").length, spec.scenes.length - 1);
  for (const k of ["pop", "tick", "type", "stamp"]) assert.ok(beats.some((b) => b.kind === k), `no ${k} beat`);
  // something visible happens at least every 4 s
  const times = beats.filter((b) => b.kind !== "type").map((b) => b.t);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] <= 4, `gap ${times[i - 1]}→${times[i]}`);
});

test("scheduleSfx pre-rolls the whoosh so its peak lands on the cut", () => {
  const pools = { cut: [{ file: "w.wav", peakSec: 0.3, durSec: 0.5 }] };
  const [ev] = scheduleSfx([{ t: 10, kind: "cut" }], pools, { jitter: 0 });
  assert.equal(ev.start, 9.7);
  assert.equal(ev.rate, 1);
  const [j] = scheduleSfx([{ t: 10, kind: "cut" }], pools, { jitter: 0.06 });
  assert.ok(Math.abs(j.rate - 1) <= 0.06);
  assert.ok(Math.abs(j.start + 0.3 / j.rate - 10) < 0.002);
});

test("scheduleSfx round-robins variants and caps overlapping sounds", () => {
  const pools = {
    pop: [{ file: "a", peakSec: 0, durSec: 1 }, { file: "b", peakSec: 0, durSec: 1 }, { file: "c", peakSec: 0, durSec: 1 }],
    cut: [{ file: "w", peakSec: 0.2, durSec: 1 }],
  };
  const spaced = scheduleSfx([0, 2, 4, 6].map((t) => ({ t, kind: "pop" })), pools, { jitter: 0 });
  assert.deepEqual(spaced.map((e) => e.file), ["a", "b", "c", "a"]);
  const dense = [...Array.from({ length: 8 }, (_, i) => ({ t: 5 + i * 0.13, kind: "pop" })), { t: 5.5, kind: "cut" }];
  const ev = scheduleSfx(dense, pools, { maxOverlap: 3, jitter: 0.06 });
  assert.ok(maxConcurrent(ev) <= 3, `max concurrent ${maxConcurrent(ev)}`);
  assert.ok(ev.some((e) => e.kind === "cut"), "the cut whoosh has priority and is never dropped");
  for (const e of ev) assert.ok(e.rate >= 0.94 && e.rate <= 1.06);
});

test("icons: names are collected from the spec and loaded from Phosphor with a fallback", () => {
  const names = collectIconNames({ scenes: [{ visual: { type: "illustration", elements: [{ type: "icon", name: "Rocket Launch" }, { type: "card", title: "x", icon: "file-text" }] } }] });
  assert.deepEqual(names.sort(), ["file-text", "rocket-launch"]);
  const { icons, missing } = loadIcons(["rocket-launch", "not-an-icon"]);
  assert.ok(icons["rocket-launch"].outline.length >= 1 && icons["rocket-launch"].back.length >= 1);
  assert.deepEqual(missing, ["not-an-icon"]);
  assert.ok(icons["not-an-icon"].outline.length >= 1);
  assert.equal(parseIconSvg('<svg viewBox="0 0 256 256"><path d="M1 1" opacity="0.2"/><path d="M2 2"/></svg>').outline[0], "M2 2");
});
