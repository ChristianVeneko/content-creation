// flat-2d polish (U8): safe zone, camera-aware tags, single source of truth for mode, layout rules, tech settings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as flat from "../hf/flat-2d/index.mjs";
import { buildComposition } from "../hf/flat-2d/compose.mjs";
import { EXAMPLE_PAYLOAD, EXAMPLE_WORDS } from "../hf/flat-2d/example.mjs";
import { SETTING_IDS } from "../hf/flat-2d/schema.mjs";
import { SETTINGS, settingPropNames } from "../hf/flat-2d/settings/index.mjs";
import { makeDraw } from "../hf/flat-2d/draw.mjs";
import { SAFE, CAPTION_BAND, CONTENT, placeTag, panelRect, screenRect } from "../hf/flat-2d/safe.mjs";
import { separateCast, rectsOverlap } from "../hf/flat-2d/place.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const W = EXAMPLE_WORDS;
const build = (hf, spec = {}) => buildComposition({ spec: { mode: "single", ...spec, hf }, words: W, durationSec: 53, captions: { enabled: true } });
const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- 1. safe zone
test("safe zone: caption band sits inside the 900x1300 box, above the stage and clear of the top 220px", () => {
  assert.deepEqual(SAFE, { x0: 90, x1: 990, y0: 310, y1: 1610 });
  const r = build(clone(EXAMPLE_PAYLOAD));
  const m = r.html.match(/\.cap\{position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px/);
  assert.ok(m, "caption rule found");
  const [left, top, width] = [+m[1], +m[2], +m[3]];
  const size = +r.html.match(/\.cw\{[^}]*font-size:(\d+)px/)[1];
  const lineH = Math.ceil(size * 1.12);
  assert.ok(left >= SAFE.x0 && left + width <= SAFE.x1, `x ${left}..${left + width}`);
  assert.ok(top >= SAFE.y0, `top ${top} below ${SAFE.y0}`);
  assert.ok(top + 2 * lineH <= CAPTION_BAND.y1 && CAPTION_BAND.y1 <= 450 + 20, `two lines end at ${top + 2 * lineH}`);
});

test("safe zone: every free-text element (labels, chips, hero stamps, emotes) is registered and its natural spot sits inside the content box", () => {
  const r = build(clone(EXAMPLE_PAYLOAD));
  assert.ok(Array.isArray(r.plan.tags) && r.plan.tags.length >= 6);
  const kinds = new Set(r.plan.tags.map((t) => t.kind));
  for (const k of ["label", "chip", "hero", "emote"]) assert.ok(kinds.has(k), `tag kind ${k}`);
  for (const t of r.plan.tags) assert.ok(r.html.includes(`id="${t.id}"`), `${t.id} exists in the markup`);
  assert.equal(r.plan.safe.content.y0, CONTENT.y0);
  assert.ok(CONTENT.y0 >= CAPTION_BAND.y1, "content starts below the caption band");
});

// ---------------------------------------------------------------- 2. camera-aware tags
test("placeTag clamps a tag to the visible frame minus margins and to its own panel", () => {
  const panel = { x: -45, y: 480, w: 960, h: 1040 };
  const p = placeTag({ sx: -70, sy: 520, w: 260, h: 78, panel });
  assert.ok(-70 + p.dx >= CONTENT.x0, "left edge pulled in");
  assert.equal(p.dy, 0);
  const q = placeTag({ sx: 900, sy: 520, w: 260, h: 78, panel: { x: 0, y: 450, w: 1080, h: 1040 } });
  assert.ok(900 + q.dx + 260 <= CONTENT.x1, "right edge pulled in");
  const above = placeTag({ sx: 200, sy: 298, w: 260, h: 78, panel: { x: 0, y: 200, w: 1080, h: 1040 } });
  assert.ok(298 + above.dy >= CONTENT.y0, "top edge stays below the caption band");
  const gone = placeTag({ sx: 4000, sy: 520, w: 260, h: 78, panel: { x: 3800, y: 450, w: 960, h: 1040 } });
  assert.deepEqual(gone, { dx: 0, dy: 0 }, "a panel that is off screen is left alone");
});

test("camera pushes never clip a label: every camera state keeps tags inside the visible frame (60px margins)", () => {
  const hf = clone(EXAMPLE_PAYLOAD);
  const r = build(hf);
  const states = [r.plan.cameraInitial, ...r.plan.moves.flatMap((m) => [m.from, m.to])];
  assert.ok(r.plan.moves.some((m) => m.to.z > 1.3), "the example has a push");
  let checked = 0;
  for (const cam of states) for (const tag of r.plan.tags) {
    const panel = panelRect(r.plan, tag.si, cam);
    const rect = screenRect(r.plan, tag, cam);
    const region = { x0: Math.max(panel.x, CONTENT.x0), x1: Math.min(panel.x + panel.w, CONTENT.x1), y0: Math.max(panel.y, CONTENT.y0), y1: Math.min(panel.y + panel.h, CONTENT.y1) };
    if (region.x1 - region.x0 < rect.w || region.y1 - region.y0 < rect.h) continue;
    const p = placeTag({ sx: rect.x, sy: rect.y, w: rect.w, h: rect.h, panel });
    const x = rect.x + p.dx, y = rect.y + p.dy;
    assert.ok(x >= 60 && x + rect.w <= 1080 - 60, `${tag.id} x ${x}..${x + rect.w} at zoom ${cam.z}`);
    assert.ok(y >= CONTENT.y0 && y + rect.h <= CONTENT.y1, `${tag.id} y ${y} at zoom ${cam.z}`);
    checked++;
  }
  assert.ok(checked > 10);
});

test("the player applies the clamp (counter-scaled labels, no Date or random)", () => {
  const r = build(clone(EXAMPLE_PAYLOAD));
  assert.match(r.html, /function placeTagCore/);
  assert.match(r.html, /\.translate/);
  assert.ok(!/Date\.now|Math\.random/.test(r.html));
});

// ---------------------------------------------------------------- 3. mode: spec.mode is the single source of truth
test("hf.mode is not part of the payload: normalize drops it and maps it to spec.mode with a warning", () => {
  const warnings = [];
  const spec = {};
  const n = flat.normalize({ ...clone(EXAMPLE_PAYLOAD), mode: "Multi-Scene" }, { spec, warnings });
  assert.equal("mode" in n, false);
  assert.equal(spec.mode, "multi", "stray hf.mode fills a missing spec.mode");
  assert.ok(warnings.some((w) => /hf\.mode/.test(w)));
  const spec2 = { mode: "multi" }, w2 = [];
  const n2 = flat.normalize({ ...clone(EXAMPLE_PAYLOAD), mode: "single" }, { spec: spec2, warnings: w2 });
  assert.equal(spec2.mode, "multi", "spec.mode wins");
  assert.equal("mode" in n2, false);
  assert.ok(w2.some((w) => /hf\.mode/.test(w) && /spec\.mode/.test(w)));
  assert.equal("mode" in flat.normalize({ ...clone(EXAMPLE_PAYLOAD), mode: "single" }), false, "also without a context");
  assert.deepEqual(flat.normalize(clone(n)), n, "idempotent");
});

test("normalize also accepts the whole spec (the registry passes it): only spec.hf is touched and spec.mode is kept", () => {
  const spec = { template: "flat-2d", mode: "multi", title: "T", scenes: [{ id: "a", narration: "uno" }], hf: { ...clone(EXAMPLE_PAYLOAD), mode: "single", style: "Neon" } };
  const out = flat.normalize(clone(spec));
  assert.equal(out.mode, "multi");
  assert.deepEqual(out.scenes, spec.scenes, "narration scenes untouched");
  assert.equal("mode" in out.hf, false);
  assert.equal(out.hf.style, "flat-dark-neon-ui");
  const lone = flat.normalize({ template: "flat-2d", hf: { ...clone(EXAMPLE_PAYLOAD), mode: "multi" } });
  assert.equal(lone.mode, "multi", "a stray hf.mode fills a missing spec.mode");
});

test("compose uses spec.mode and reports a conflicting hf.mode", () => {
  const hf = { ...clone(EXAMPLE_PAYLOAD), mode: "single" };
  const r = build(hf, { mode: "multi" });
  assert.equal(r.mode, "multi");
  assert.ok(r.warnings.some((w) => /hf\.mode/.test(w)));
  const noSpecMode = buildComposition({ spec: { hf: { ...clone(EXAMPLE_PAYLOAD), mode: "multi" } }, words: W, durationSec: 53, captions: { enabled: true } });
  assert.equal(noSpecMode.mode, "multi", "a lone hf.mode still works as a fallback");
});

test("the example payload and the prompt never carry hf.mode", () => {
  assert.equal("mode" in EXAMPLE_PAYLOAD, false);
  assert.match(flat.promptSection, /never set `?hf\.mode`?/i);
  assert.match(flat.promptSection, /spec\.mode/);
  assert.equal("mode" in flat.meta.defaults.hf, false);
});

// ---------------------------------------------------------------- 4. layout rules
test("the world is masked behind the caption band so a card in transit never overlaps the captions", () => {
  const r = build(clone(EXAMPLE_PAYLOAD));
  assert.match(r.html, /id="wmask"/);
  assert.match(r.html, /#wmask\{[^}]*mask-image:linear-gradient/);
  assert.match(r.html, /<div id="wmask"[^>]*><div id="world"/);
});

test("separateCast moves a character out from under a replica, or lifts the replica", () => {
  const prop = (id, x, y, w, h) => ({ id, box: { x, y, w, h } });
  const cast = (who, x, top, sc = 0.7) => ({ who, x, box: { x: x - 70 * sc, y: top, w: 140 * sc, h: 900 - top }, scale: sc });
  // head at y 560 under a list occupying 560-ish: overlaps
  const props = [prop("list", 330, 300, 300, 330)];
  const [c0] = [cast("dora", 480, 540)];
  assert.ok(rectsOverlap(c0.box, props[0].box));
  const out = separateCast(props, [c0]);
  assert.ok(!rectsOverlap(out.cast[0].box, out.props[0].box, 16), "no overlap any more");
  const moved = Math.abs(out.cast[0].x - 480) > 0 || out.props[0].box.y < 300;
  assert.ok(moved);
  // already clear: untouched
  const clear = separateCast([prop("p", 100, 120, 300, 200)], [cast("a", 700, 560)]);
  assert.equal(clear.cast[0].x, 700);
  assert.equal(clear.props[0].box.y, 120);
  // a replica never goes above the label strip (y 104)
  const low = separateCast([prop("p", 0, 104, 960, 520)], [cast("a", 480, 500)]);
  assert.ok(low.props[0].box.y >= 104);
});

test("integration: no character covers a replica in the VPN spec that showed the problem", () => {
  const spec = JSON.parse(readFileSync(join(HERE, "fixtures", "flat-vpn", "spec.json"), "utf8"));
  const r = buildComposition({ spec, words: JSON.parse(readFileSync(join(HERE, "fixtures", "flat-vpn", "words.json"), "utf8")), durationSec: 43, captions: { enabled: true } });
  assert.ok(r.plan.placed.length >= 5);
  for (const sc of r.plan.placed) for (const c of sc.cast) for (const p of sc.props) {
    assert.ok(!rectsOverlap(c.box, p.box, 16), `scene ${sc.index}: ${c.who} over ${p.id}`);
  }
});

// ---------------------------------------------------------------- 5. tech settings
const NEW = ["phone-home", "cloud-sky", "cafe-laptops", "wifi-street", "app-store", "vault-door", "helpdesk", "hardware-lab"];
test("eight tech settings exist, with 3 layers, named props and topic tags", () => {
  const d = makeDraw("flat-soft-gradient");
  for (const id of NEW) {
    assert.ok(SETTING_IDS.includes(id), id);
    const s = SETTINGS[id].build(d);
    for (const layer of ["far", "mid", "near"]) assert.ok(typeof s[layer] === "string" && s[layer].length > 200, `${id}.${layer}`);
    assert.ok(Object.keys(s.props).length >= 4, `${id} props`);
    assert.ok(Array.isArray(SETTINGS[id].topics) && SETTINGS[id].topics.length >= 3, `${id} topics`);
  }
  for (const id of SETTING_IDS) assert.ok(SETTINGS[id].topics?.length >= 2, `${id} has topics`);
  assert.ok(SETTING_IDS.length >= 24);
  assert.ok(Object.keys(settingPropNames()).length === SETTING_IDS.length);
});

test("promptSection exposes topics compactly and forbids settings that contradict the topic", () => {
  const p = flat.promptSection;
  for (const id of NEW) assert.match(p, new RegExp(`- ${id}: .*\\[topics: [^\\]]+\\]`), id);
  assert.match(p, /never pick a setting that contradicts the topic/i);
  const line = p.split("\n").find((l) => l.startsWith("- helpdesk:"));
  assert.ok(line.length < 420, "compact line");
});

test("the new settings compose in both modes with a prop and a character", () => {
  for (const id of NEW) for (const mode of ["single", "multi"]) {
    const props = settingPropNames()[id];
    const hf = { style: "flat-dark-neon-ui", scenes: [{ setting: id, label: "TEST", props: [{ id: "k", kind: "card", at: "top", title: "Hola" }], cast: [{ who: "nico", at: "floor-left" }], beats: [{ on: { word: "URL" }, do: "pulse", target: props[0] }] }] };
    const r = build(hf, { mode });
    assert.ok(r.html.length > 6000, `${id} ${mode}`);
  }
});
