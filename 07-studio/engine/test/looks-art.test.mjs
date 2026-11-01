// Art-style 2D looks (watercolor, paper collage, chalkboard, risograph, ukiyo-e, pop comic) and the paper-world,
// toy-blocks and holo-studio 3D looks: registration, templates, examples, distinct motion language, SFX voice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, listTemplates, validateTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { ART_LOOKS, LOOKS, LOOK_SFX, LOOK_UPSCALE, ILLUSTRATED_TEMPLATE_IDS, computeBeats, lookOf, planIllustration, usesIllustratedKit } from "../lib/illustrated.mjs";
import { lookSchema } from "../lib/illustration-schema.mjs";
import { LOOK3D, THREE_D_TEMPLATE_IDS, look3dOf, planThree, usesThreeKit } from "../lib/scene3d.mjs";
import { computeTimeline } from "../lib/timeline.mjs";

const NEW_3D = ["paper-world", "toy-blocks", "holo-studio"];
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

test("the six art looks are registered as looks and illustrated-kit templates with category illustrated-2d", () => {
  assert.deepEqual(ART_LOOKS, ["watercolor", "paper-collage", "chalkboard", "risograph", "ukiyo-e", "pop-comic"]);
  for (const id of ART_LOOKS) {
    assert.ok(LOOKS.includes(id), id);
    assert.ok(ILLUSTRATED_TEMPLATE_IDS.includes(id), id);
    assert.ok(usesIllustratedKit(id), id);
    assert.equal(lookSchema.safeParse(id).success, true, id);
    assert.ok(LOOK_UPSCALE[id] >= 1, `${id} upscale`);
    const t = getTemplate(id);
    assert.equal(t.category, "illustrated-2d");
    assert.equal(t.defaults.theme.look, id);
    assert.equal(t.preview.style, "illustrated");
    assert.doesNotThrow(() => validateTemplate(t));
    for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.ok(!EMOJI.test(JSON.stringify(t)), `${id} has emoji`);
  }
});

test("the three new 3D looks are 3D-kit templates with category 3d and their own camera language", () => {
  for (const id of NEW_3D) {
    assert.ok(THREE_D_TEMPLATE_IDS.includes(id), id);
    assert.ok(usesThreeKit(id), id);
    assert.ok(LOOK3D[id], `${id} camera`);
    const t = getTemplate(id);
    assert.equal(t.category, "3d");
    assert.equal(t.preview.style, "three");
    assert.ok(!EMOJI.test(JSON.stringify(t)), `${id} has emoji`);
  }
  // camera language differs from every other 3D look (lens + angle)
  const sig = THREE_D_TEMPLATE_IDS.map((id) => `${LOOK3D[id].fov}/${LOOK3D[id].yaw}/${LOOK3D[id].pitch}/${LOOK3D[id].moves[0]}`);
  assert.equal(new Set(sig).size, sig.length);
});

test("every template id has an example spec that validates and resolves to its own look", () => {
  const ids = listTemplates().map((t) => t.id);
  const examples = readdirSync(fileURLToPath(new URL("../examples/", import.meta.url)));
  for (const id of [...ART_LOOKS, ...NEW_3D]) {
    assert.ok(examples.includes(`${id}.spec.json`), `${id} has no example`);
    const raw = example(id);
    assert.equal(raw.template, id);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(!EMOJI.test(JSON.stringify(raw)), `${id} example has emoji`);
    const spec = resolveSpec(r.spec, getTemplate(id));
    if (ART_LOOKS.includes(id)) {
      assert.equal(lookOf(spec), id);
      assert.ok(r.spec.scenes.length >= 8 && r.spec.scenes.length <= 14, `${id}: 8-14 scenes`);
      assert.ok(r.spec.scenes.every((s) => s.visual.type === "illustration"), `${id}: all illustrated`);
    } else {
      assert.equal(look3dOf(spec), id);
      assert.ok(r.spec.scenes.length >= 6 && r.spec.scenes.length <= 10, `${id}: 6-10 scenes`);
      assert.ok(r.spec.scenes.every((s) => s.visual.type === "scene3d"), `${id}: all scene3d`);
    }
  }
  // every template id has an example: its own <id>.spec.json, the illustrated showcase, or the classic demo
  const CLASSIC = ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"];
  for (const id of ids) {
    const own = examples.includes(`${id}.spec.json`);
    const shared = (id === "illustrated" && examples.includes("sdd-vs-odd.illustrated.spec.json")) || (CLASSIC.includes(id) && examples.includes("demo.spec.json"));
    assert.ok(own || shared, `template ${id} has no example spec`);
  }
});

test("each art look has its own entrance, camera, transition, headline and background (no two looks share a motion signature)", () => {
  const looks = read("../src/illustrated/looks.ts");
  const sigs = ART_LOOKS.map((id) => {
    const block = looks.slice(looks.indexOf(`  ${id.includes("-") ? `"${id}"` : id}: {`));
    const enter = block.match(/enter: "(\w+)"/)[1];
    const camera = block.match(/camera: "(\w+)"/)[1];
    return `${enter}/${camera}`;
  });
  assert.equal(new Set(sigs).size, ART_LOOKS.length, sigs.join(" "));
  const existing = ["pop/push", "marker/boil", "snap/punch", "rise/drift", "flicker/static", "bounce/settle"];
  for (const s of sigs) assert.ok(!existing.includes(s), `art look reuses an existing signature ${s}`);
  const trans = read("../src/illustrated/art-transitions.tsx");
  const map = trans.slice(trans.indexOf("export const ART_TRANSITIONS"));
  const comps = ART_LOOKS.map((id) => map.match(new RegExp(`"?${id}"?: (\\w+)`))[1]);
  assert.equal(new Set(comps).size, ART_LOOKS.length);
  const art = read("../src/illustrated/artstyles.tsx");
  for (const id of ART_LOOKS) assert.match(art, new RegExp(`case "${id}":`), `${id} background/headline/hud`);
});

test("art looks voice their cuts and pops with their own SFX kinds without moving the beats", () => {
  const raw = example("pop-comic");
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate("pop-comic"));
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const plan = planIllustration(spec, timeline);
  const beats = computeBeats(plan, timeline, 30);
  assert.equal(beats.filter((b) => b.kind === "cut").length, 0);
  assert.equal(beats.filter((b) => b.kind === LOOK_SFX["pop-comic"].cut && b.scene > 0 && Math.abs(b.t - (timeline.scenes[b.scene].from + timeline.transitionFrames / 2) / 30) < 0.01).length, spec.scenes.length - 1);
  // a look without a voice keeps the default kinds
  const wb = resolveSpec(validateSpec(example("whiteboard")).spec, getTemplate("whiteboard"));
  const wt = computeTimeline(wb.scenes, { fps: 30 });
  assert.equal(computeBeats(planIllustration(wb, wt), wt, 30).filter((b) => b.kind === "cut").length, wb.scenes.length - 1);
});

test("3D plans of the new looks resolve their own camera moves", () => {
  for (const id of NEW_3D) {
    const spec = resolveSpec(validateSpec(example(id)).spec, getTemplate(id));
    const timeline = computeTimeline(spec.scenes, { fps: 30 });
    const plans = planThree(spec, timeline);
    assert.equal(plans.length, spec.scenes.length);
    const auto = plans.filter((p, i) => !spec.scenes[i].visual.camera).map((p) => p.move);
    for (const m of auto) assert.ok(LOOK3D[id].moves.includes(m), `${id}: ${m}`);
  }
});

test("art-look fonts are OFL files shipped with their license", () => {
  const dir = fileURLToPath(new URL("../public/looks/fonts/", import.meta.url));
  const files = readdirSync(dir);
  for (const f of files.filter((x) => x.endsWith(".ttf"))) {
    const family = f.split(/[-.]/)[0];
    assert.ok(files.includes(`${family}-OFL.txt`), `${f} has no OFL license`);
    assert.match(readFileSync(dir + `${family}-OFL.txt`, "utf8"), /SIL OPEN FONT LICENSE/i, f);
  }
});
