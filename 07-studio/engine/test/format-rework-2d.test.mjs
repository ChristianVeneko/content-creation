// Format rework (2D): host-tutorial, checklist-glass and spotlight-narrative formats, their elements, the `format`
// slug of every 2D / reels / pixel template and the "draw new subjects every video" guidance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { TEMPLATE_IDS, resolveSpec, validateSpec } from "../lib/spec.mjs";
import { FORMAT_2D_LOOKS, ILLUSTRATED_TEMPLATE_IDS, LOOKS, LOOK_DEPTH, LOOK_UPSCALE, REGIONS, lookOf, measure, parseProgress, planScene, splitAccent } from "../lib/illustrated.mjs";
import { ELEMENT_TYPES, elementSchema } from "../lib/illustration-schema.mjs";

const NEW = ["host-tutorial", "checklist-glass", "spotlight-narrative"];
const OLD = ["ui-cards", "flat-depth", "soft-gradient"];
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const template = (id) => JSON.parse(read(`../templates/${id}.json`));
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));

test("the new 2D formats are appended to the format looks and registered everywhere a look must be", () => {
  assert.deepEqual(FORMAT_2D_LOOKS, [...OLD, ...NEW]);
  for (const id of NEW) {
    assert.ok(LOOKS.includes(id), `look ${id}`);
    assert.ok(ILLUSTRATED_TEMPLATE_IDS.includes(id), `illustrated ${id}`);
    assert.ok(TEMPLATE_IDS.includes(id), `template id ${id}`);
    assert.ok(LOOK_UPSCALE[id] >= 1, `upscale ${id}`);
    assert.ok(LOOK_DEPTH[id], `depth ${id}`);
  }
  assert.ok(TEMPLATE_IDS.indexOf("spotlight-narrative") < TEMPLATE_IDS.indexOf("clay-diorama"), "before the 3D looks");
});

test("each new format template validates, resolves to its own look and describes a FORMAT, not a subject", () => {
  for (const id of NEW) {
    const t = getTemplate(id);
    for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults", "format"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.equal(t.category, "illustrated-2d");
    assert.equal(t.defaults.theme.look, id);
    assert.match(t.format, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${id}: format must be a kebab slug`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(t)), `${id} has emoji`);
    assert.match(t.prompt_hint, /draw|dibuja/i, `${id}: prompt_hint tells the agent to draw`);
    const spec = resolveSpec({ version: 1, title: "x", template: id, scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }, t);
    assert.equal(lookOf(spec), id);
  }
});

test("each new example spec validates, is all illustration, shows its format's elements and fits the stage", () => {
  const uses = { "host-tutorial": ["host", "roadmap", "window", "card"], "checklist-glass": ["window", "mascot", "checklist"], "spotlight-narrative": ["beacon", "drawing"] };
  for (const id of NEW) {
    const raw = example(id);
    assert.equal(raw.template, id);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.spec.scenes.every((s) => s.visual.type === "illustration"), `${id}: all scenes illustrated`);
    const types = new Set();
    r.spec.scenes.forEach((s) => s.visual.elements.forEach((e) => types.add(e.type)));
    for (const t of uses[id]) assert.ok(types.has(t), `${id} example uses ${t}`);
    for (const s of r.spec.scenes) {
      const p = planScene(s.visual.elements, 5, { maxUpscale: LOOK_UPSCALE[id] });
      assert.ok(p.offsetY + p.stackH * p.scale <= REGIONS.stage.h + 0.5, `${id}/${s.id}: too tall`);
      assert.ok(p.w * p.scale <= REGIONS.stage.w + 0.5, `${id}/${s.id}: too wide`);
    }
  }
});

/* ---------------- one test per new element ---------------- */

const ok = (el) => elementSchema.safeParse(el).success;

test("element host: a flat vector bust with a switchable pose and expression; an overlay with no layout box", () => {
  assert.ok(ELEMENT_TYPES.includes("host"));
  const h = elementSchema.parse({ type: "host" });
  assert.equal(h.pose, "point");
  assert.equal(h.expression, "smile");
  assert.ok(ok({ type: "host", pose: "wave", expression: "wink", skin: 2, shirt: "accent2", hair: "#2A1B12" }));
  assert.ok(!ok({ type: "host", pose: "dance" }));
  assert.ok(!ok({ type: "host", expression: "angry" }));
  assert.ok(!ok({ type: "host", skin: 9 }));
  const p = planScene([{ type: "host", pose: "wave" }, { type: "card", title: "Paso 1" }], 5);
  assert.equal(p.elements[0].box, null, "the host takes no room in the stage column");
  assert.ok(p.elements[1].box);
});

test("element mascot: rounded 3D-looking shapes in a persistent slot; an overlay with no layout box", () => {
  assert.ok(ELEMENT_TYPES.includes("mascot"));
  const m = elementSchema.parse({ type: "mascot" });
  assert.equal(m.mood, "happy");
  assert.equal(m.pose, "idle");
  assert.ok(ok({ type: "mascot", mood: "wow", pose: "cheer", color: "accent3" }));
  assert.ok(!ok({ type: "mascot", mood: "furious" }));
  assert.ok(!ok({ type: "mascot", pose: "fly" }));
  const p = planScene([{ type: "mascot" }, { type: "checklist", items: ["a", "b"] }], 5);
  assert.equal(p.elements[0].box, null);
});

test("element window: a UI mockup with chrome, toggle rows, a cursor and a highlight", () => {
  assert.ok(ELEMENT_TYPES.includes("window"));
  const w = elementSchema.parse({ type: "window", title: "Ajustes", rows: [{ label: "Sonido", toggle: "turn-off" }, { label: "Idioma", value: "ES" }], cursor: 0, highlight: 1 });
  assert.equal(w.kind, "app");
  assert.ok(!ok({ type: "window", title: "x", rows: [] }));
  assert.ok(!ok({ type: "window", title: "x", rows: [{ label: "a" }], cursor: 3 }), "cursor must point at a row");
  assert.ok(!ok({ type: "window", title: "x", rows: [{ label: "a" }], highlight: 2 }), "highlight must point at a row");
  assert.ok(!ok({ type: "window", title: "x", rows: [{ label: "a", toggle: "maybe" }] }));
  assert.ok(!ok({ type: "window", title: "x", kind: "terminal", rows: [{ label: "a" }] }));
  assert.ok(!ok({ type: "window", title: "x", rows: [1, 2, 3, 4, 5, 6].map((i) => ({ label: `r${i}` })) }));
  const small = measure({ type: "window", title: "a", rows: [{ label: "a" }] }, 800);
  const big = measure({ type: "window", title: "a", rows: [{ label: "a" }, { label: "b" }, { label: "c" }], button: "OK" }, 800);
  assert.ok(small > 100 && big > small, "taller with more rows and a button");
});

test("element roadmap: the 'n STEPS' card lists the steps and marks the active one", () => {
  assert.ok(ELEMENT_TYPES.includes("roadmap"));
  const r = elementSchema.parse({ type: "roadmap", items: ["Abrir", "Pegar", "Enviar"], active: 1 });
  assert.equal(r.title, "STEPS");
  assert.ok(!ok({ type: "roadmap", items: ["solo"] }));
  assert.ok(!ok({ type: "roadmap", items: Array.from({ length: 9 }, (_, i) => `p${i}`) }));
  assert.ok(!ok({ type: "roadmap", items: ["a", "b"], active: -1 }));
  assert.ok(!ok({ type: "roadmap", items: ["a", "b"], active: 5 }), "active must point at a step");
  assert.ok(measure({ type: "roadmap", items: ["a", "b", "c"] }, 800) < measure({ type: "roadmap", items: ["a", "b", "c", "d", "e"] }, 800));
  const p = planScene([r], 6);
  assert.equal(p.elements[0].items.length, 3, "one reveal time per step");
});

test("element beacon: glowing rings around an icon metaphor with a big counting number", () => {
  assert.ok(ELEMENT_TYPES.includes("beacon"));
  const b = elementSchema.parse({ type: "beacon", icon: "clock", value: 40, label: "horas perdidas" });
  assert.equal(b.rings, 3);
  assert.ok(ok({ type: "beacon", icon: "bank", value: 1200, from: 0, prefix: "$", suffix: " k", label: "ahorro", rings: 5 }));
  assert.ok(!ok({ type: "beacon", value: 3, label: "sin icono" }));
  assert.ok(!ok({ type: "beacon", icon: "clock", label: "sin valor" }));
  assert.ok(!ok({ type: "beacon", icon: "clock", value: 3, label: "x", rings: 9 }));
  assert.ok(measure({ type: "beacon", icon: "clock", value: 3, label: "x" }, 800) > 300);
});

test("pure helpers: splitAccent marks the accent word (asterisks or the last word) and parseProgress reads 'n / N'", () => {
  assert.deepEqual(splitAccent("Haz *esto* primero"), [
    { text: "Haz", accent: false },
    { text: "esto", accent: true },
    { text: "primero", accent: false },
  ]);
  assert.deepEqual(splitAccent("Tres reglas simples").map((w) => w.accent), [false, false, true], "no asterisks: the last word");
  assert.deepEqual(splitAccent("Solo"), [{ text: "Solo", accent: false }], "a single word has no accent");
  assert.deepEqual(parseProgress("Checklist 3 / 12"), { n: 3, total: 12, label: "Checklist" });
  assert.deepEqual(parseProgress("Regla 4/9"), { n: 4, total: 9, label: "Regla" });
  assert.equal(parseProgress("Sin numeros"), null);
});

/* ---------------- format slug and the "new subjects every video" guidance ---------------- */

const FORMAT_SLUGS = {
  illustrated: "explainer-blueprint",
  whiteboard: "whiteboard",
  broadcast: "news",
  "editorial-chart": "data-chart",
  "editor-window": "code-window",
  "rank-numbers": "ranking",
  watercolor: "painted-story",
  "paper-collage": "paper-collage",
  chalkboard: "chalkboard",
  risograph: "riso-print",
  "ukiyo-e": "woodblock-scroll",
  "pop-comic": "comic-panels",
  "ui-cards": "ui-cards",
  "flat-depth": "flat-depth",
  "soft-gradient": "soft-gradient",
  "pixel-dusk": "pixel-scene",
  "pixel-night": "pixel-scene",
  "pixel-arcade": "pixel-scene",
  "pixel-mono": "pixel-scene",
  "reels-nube": "reels-chat",
  "reels-noche": "reels-chat",
  "reels-menta": "reels-chat",
  "reels-limon": "reels-chat",
  "reels-pizarra": "reels-chat",
  "host-tutorial": "host-tutorial",
  "checklist-glass": "checklist-glass",
  "spotlight-narrative": "spotlight-narrative",
  "pixel-versus": "pixel-versus",
};

test("every 2D, reels and pixel template carries its `format` kebab slug", () => {
  const files = new Set(readdirSync(fileURLToPath(new URL("../templates/", import.meta.url))).map((f) => f.replace(/\.json$/, "")));
  for (const [id, slug] of Object.entries(FORMAT_SLUGS)) {
    assert.ok(files.has(id), `template ${id} exists`);
    assert.equal(template(id).format, slug, `${id} format`);
  }
});

test("2D templates describe the FORMAT and tell the agent to draw new subjects each video", () => {
  const ids = ["illustrated", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers", "watercolor", "paper-collage", "chalkboard", "risograph", "ukiyo-e", "pop-comic", ...OLD, ...NEW];
  for (const id of ids) {
    const t = template(id);
    assert.match(t.prompt_hint, /new subjects|new subject|every video|each video/i, `${id}: prompt_hint must ask for new subjects each video`);
  }
});

test("previous behavior holds: ui-cards keeps its look, depth, upscale and the layout of its example scene", () => {
  const t = template("ui-cards");
  assert.equal(t.defaults.theme.look, "ui-cards");
  assert.equal(t.category, "illustrated-2d");
  assert.deepEqual(LOOK_DEPTH["ui-cards"], { shadow: "soft", fill: "gradient", ground: "none", parallax: 2, vignette: 0.45 });
  assert.equal(LOOK_UPSCALE["ui-cards"], 1.35);
  const s = example("ui-cards").scenes[1];
  assert.deepEqual(s.visual.elements.map((e) => e.type), ["post"]);
  const p = planScene(s.visual.elements, 5, { maxUpscale: LOOK_UPSCALE["ui-cards"] });
  assert.deepEqual({ scale: p.scale, offsetY: p.offsetY, stackH: p.stackH, w: p.w, box: p.elements[0].box }, { scale: 1.343, offsetY: 0, stackH: 484, w: 667, box: { x: 0, y: 0, w: 667, h: 484 } });
  assert.equal(validateSpec(example("ui-cards")).ok, true);
});
