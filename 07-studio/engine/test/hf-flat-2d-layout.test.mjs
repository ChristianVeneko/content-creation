// flat-2d layout (U11): replica-vs-replica solver, hero stamp free band, mask clip, normalize warnings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as flat from "../hf/flat-2d/index.mjs";
import { buildComposition } from "../hf/flat-2d/compose.mjs";
import { KITS, SIZE_K } from "../hf/flat-2d/kit/index.mjs";
import { AT, STAGE } from "../hf/flat-2d/layout.mjs";
import { separateCast, separateProps, placeStamp, rectsOverlap } from "../hf/flat-2d/place.mjs";
import { EXAMPLE_WORDS } from "../hf/flat-2d/example.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VPN = join(HERE, "fixtures", "flat-vpn", "spec.json");
const clone = (o) => JSON.parse(JSON.stringify(o));
const boxOf = (kind, size, at) => {
  const k = SIZE_K[size], k0 = KITS[kind], w = k0.base.w * k, h = k0.base.h * k, [cx, cy] = AT[at];
  return { x: Math.min(STAGE.w - 20 - w, Math.max(20, cx - w / 2)), y: Math.min(STAGE.h - 30 - h, Math.max(104, cy - h / 2)), w, h };
};
const castBox = (x) => ({ x: x - 70 * 0.9, y: 560, w: 126, h: 340 });
const KINDS = Object.keys(KITS);
const TALL = new Set(["chat", "phone", "calendar"]);
const AT_SPOTS = ["top", "top-left", "top-right", "middle", "middle-left", "middle-right", "floor-left", "floor-right"];

// ---------------------------------------------------------------- 1. replica layout solver
test("separateProps: no two replicas overlap, none covers the cast, for every pair of kinds, sizes and spots", () => {
  let n = 0;
  for (const a of KINDS) for (const b of KINDS) for (const sa of ["s", "m", "l"]) for (const sb of ["s", "m"]) {
    const atB = AT_SPOTS[(n++ * 3) % AT_SPOTS.length];
    // a tall kit at size l (chat 720x780, phone 480x900) cannot share the stage with a second replica and a
    // character even at the 60 % floor: that case is covered by the least-overlap test below
    if (sa === "l" && TALL.has(a)) continue;
    const props = [{ id: "a", box: boxOf(a, sa, "top") }, { id: "b", box: boxOf(b, sb, atB) }];
    const cast = [{ who: "x", x: 240, box: castBox(240) }];
    const r = separateProps(props, cast);
    assert.equal(r.props.length, 2);
    assert.ok(!rectsOverlap(r.props[0].box, r.props[1].box, 0), `${a}/${sa} vs ${b}/${sb}@${atB} overlap`);
    for (const p of r.props) {
      assert.ok(!rectsOverlap(p.box, cast[0].box, 0), `${p.id} covers the character`);
      assert.ok(p.box.x >= 20 - 1e-6 && p.box.x + p.box.w <= STAGE.w - 20 + 1e-6 && p.box.y >= 104 - 1e-6, "inside the stage");
      assert.ok(p.shrink >= 0.6 - 1e-9 && p.shrink <= 1);
    }
  }
});

test("separateProps: when the stage cannot hold everything the boxes stay inside the stage and above the 60 % floor", () => {
  const props = [{ id: "a", box: boxOf("phone", "l", "top") }, { id: "b", box: boxOf("chat", "m", "middle") }];
  const r = separateProps(props, [{ who: "x", x: 240, box: castBox(240) }]);
  for (const p of r.props) {
    assert.ok(p.shrink >= 0.6 - 1e-9);
    assert.ok(p.box.x >= 20 - 1e-6 && p.box.x + p.box.w <= STAGE.w - 20 + 1e-6 && p.box.y >= 104 - 1e-6 && p.box.y + p.box.h <= 1010 + 1e-6);
  }
});

test("separateProps: three replicas of mixed sizes are laid out without overlap", () => {
  const combos = [["browser", "l", "top"], ["card", "s", "top-left"], ["stats", "m", "middle-right"], ["rack", "m", "floor-right"], ["chat", "m", "middle"]];
  for (let i = 0; i < combos.length; i++) for (let j = i + 1; j < combos.length; j++) for (let k = j + 1; k < combos.length; k++) {
    const props = [i, j, k].map((q, idx) => ({ id: "p" + idx, box: boxOf(combos[q][0], combos[q][1], combos[q][2]) }));
    const r = separateProps(props, [{ who: "x", x: 220, box: castBox(220) }]);
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) assert.ok(!rectsOverlap(r.props[a].box, r.props[b].box, 0), `${[i, j, k]} ${a}/${b}`);
  }
});

test("separateProps: the active subject (highest weight) keeps its place, the other one moves", () => {
  const big = { id: "news", weight: 9, box: boxOf("browser", "l", "top") };
  const small = { id: "ip", weight: 1, box: { x: big.box.x + 100, y: big.box.y + 120, w: 300, h: 180 } };
  const r = separateProps([small, big], []);
  const rb = r.props.find((p) => p.id === "news"), rs = r.props.find((p) => p.id === "ip");
  assert.deepEqual(rb.box, big.box, "subject untouched");
  assert.ok(!rectsOverlap(rb.box, rs.box, 0));
  assert.equal(r.props[0].id, "ip", "output keeps the input order");
});

test("separateProps: non-overlapping replicas are not touched", () => {
  const props = [{ id: "a", box: { x: 20, y: 104, w: 300, h: 200 } }, { id: "b", box: { x: 500, y: 600, w: 300, h: 200 } }];
  const r = separateProps(props, []);
  assert.deepEqual(r.props.map((p) => p.box), props.map((p) => p.box));
  assert.ok(r.props.every((p) => p.shrink === 1));
});

test("separateProps: still works after separateCast lifted a replica", () => {
  const props = [{ id: "a", box: { x: 200, y: 560, w: 500, h: 300 } }, { id: "b", box: { x: 400, y: 200, w: 400, h: 300 } }];
  const cast = [{ who: "x", x: 450, box: castBox(450) }];
  const s1 = separateCast(props, cast);
  const r = separateProps(s1.props, s1.cast);
  assert.ok(!rectsOverlap(r.props[0].box, r.props[1].box, 0));
  for (const c of s1.cast) for (const p of r.props) assert.ok(!rectsOverlap(c.box, p.box, 0));
});

// ---------------------------------------------------------------- 2. hero stamp free band
const BOUNDS = { x0: 30, y0: 104, x1: 930, y1: 960 };
const inflate = (s) => ({ w: s.w * 1.04 + s.h * 0.1, h: s.h + s.w * 0.1 });
test("placeStamp: avoids cast and cursor boxes, stays inside the bounds, scales to fit", () => {
  const avoid = [castBox(240), { x: 440, y: 540, w: 120, h: 120 }];
  const soft = [{ x: 150, y: 140, w: 700, h: 300 }];
  for (const [w, h] of [[816, 144], [470, 204], [300, 100], [900, 170]]) {
    const s = placeStamp({ w, h, avoid, soft, bounds: BOUNDS });
    const rw = w * s.scale, rh = h * s.scale, c = { x: s.x - rw / 2, y: s.y - rh / 2, w: rw, h: rh };
    assert.ok(s.scale >= 0.55 && s.scale <= 1, `scale ${s.scale}`);
    assert.ok(c.x >= BOUNDS.x0 - 1 && c.x + c.w <= BOUNDS.x1 + 1 && c.y >= BOUNDS.y0 - 1 && c.y + c.h <= BOUNDS.y1 + 1, `bounds ${JSON.stringify(c)}`);
    for (const a of avoid) assert.ok(!rectsOverlap(c, a, 0), `${w}x${h} hits ${JSON.stringify(a)}`);
    assert.equal(s.clear, true);
  }
});
test("placeStamp: prefers a spot clear of replicas when one exists, and keeps the preferred spot when nothing is in the way", () => {
  const free = placeStamp({ w: 400, h: 150, avoid: [], soft: [], bounds: BOUNDS });
  assert.deepEqual([free.x, free.y, free.scale], [480, 560, 1]);
  const soft = [{ x: 200, y: 400, w: 600, h: 300 }];
  const s = placeStamp({ w: 400, h: 150, avoid: [], soft, bounds: BOUNDS });
  const c = { x: s.x - 200 * s.scale, y: s.y - 75 * s.scale, w: 400 * s.scale, h: 150 * s.scale };
  assert.ok(!rectsOverlap(c, soft[0], 0));
});
test("placeStamp: reports clear=false only when the hard boxes leave no room even at the smallest scale", () => {
  const wall = [{ x: 0, y: 0, w: 960, h: 1040 }];
  const s = placeStamp({ w: 500, h: 150, avoid: wall, soft: [], bounds: BOUNDS });
  assert.equal(s.clear, false);
  assert.equal(s.scale, 0.55);
});

// ---------------------------------------------------------------- 3. the real LLM spec
const spec = JSON.parse(readFileSync(VPN, "utf8"));
const words = JSON.parse(readFileSync(join(HERE, "fixtures", "flat-vpn", "words.json"), "utf8"));
const build = (s = spec) => buildComposition({ spec: clone(s), words: Array.isArray(words) ? words : words.words ?? EXAMPLE_WORDS, durationSec: 43, captions: { enabled: true } });

test("VPN spec: replicas never overlap each other or a character, in any scene", () => {
  const r = build();
  for (const sc of r.plan.placed) {
    for (let a = 0; a < sc.props.length; a++) {
      for (let b = a + 1; b < sc.props.length; b++) assert.ok(!rectsOverlap(sc.props[a].box, sc.props[b].box, 0), `scene ${sc.index}: ${sc.props[a].id} / ${sc.props[b].id}`);
      for (const c of sc.cast) assert.ok(!rectsOverlap(sc.props[a].box, c.box, 0), `scene ${sc.index}: ${sc.props[a].id} covers ${c.who}`);
    }
  }
});

test("VPN spec: hero stamps stay clear of the characters and the cursor targets of their scene", () => {
  const r = build();
  const heroes = r.plan.tags.filter((t) => t.kind === "hero");
  assert.ok(heroes.length >= 1, "the spec has a hero stamp");
  for (const h of heroes) {
    const sc = r.plan.placed[h.si];
    const box = { x: h.x - h.w / 2, y: h.y - h.h / 2, w: h.w, h: h.h };
    assert.ok(box.x >= 30 - 1 && box.x + box.w <= 930 + 1 && box.y >= 104 - 1 && box.y + box.h <= 960 + 1, `hero inside the stage ${JSON.stringify(box)}`);
    for (const c of sc.cast) assert.ok(!rectsOverlap(box, c.box, 0), `hero covers ${c.who}`);
    assert.ok(sc.cursor.length >= 1, "the scene clicks");
    for (const q of sc.cursor) assert.ok(!rectsOverlap(box, q, 0), "hero covers the cursor");
  }
});

// ---------------------------------------------------------------- 4. mask edge
test("world mask is a clean clip at the caption band (no soft fade that ghosts content during travel)", () => {
  const r = build();
  const m = r.html.match(/#wmask\{[^}]*mask-image:linear-gradient\(to bottom,transparent 0,transparent (\d+)px,#000 (\d+)px\)/);
  assert.ok(m, "mask rule");
  const [a, b] = [+m[1], +m[2]];
  assert.ok(b - a <= 3, `edge ${a}..${b} must be (nearly) hard`);
  assert.ok(a >= 450 && b <= 470, "clip sits between the stage top and the caption band end");
});

// ---------------------------------------------------------------- 5. normalize warnings reach compose
test("normalize attaches its warnings (non-enumerable) and compose() returns them", async () => {
  const input = clone(spec);
  input.mode = "multi";
  input.hf.mode = "single";
  const out = flat.normalize(input);
  assert.ok(Array.isArray(out.__warnings) && out.__warnings.some((w) => /hf\.mode/.test(w)), "attached to the spec");
  assert.ok(!Object.keys(out).includes("__warnings"), "non-enumerable at spec level");
  assert.ok(!Object.keys(out.hf).includes("__warnings"), "non-enumerable at payload level");
  assert.ok(!JSON.stringify(out).includes("__warnings"));
  const r = buildComposition({ spec: out, words, durationSec: 43, captions: { enabled: true } });
  assert.ok(r.warnings.some((w) => /hf\.mode/.test(w)), "buildComposition returns them");
  // what the registry does: normalize(out) with no ctx, then compose with the same object
  const dir = join(process.env.TMPDIR ?? "/tmp", "hf-flat2d-warn-" + process.pid);
  const c = await flat.compose({ spec: out, words, durationSec: 43, outDir: dir, assetsDir: join(dir, "assets"), captions: { enabled: true } });
  assert.ok(c.warnings.some((w) => /hf\.mode/.test(w)), "compose() warnings");
  assert.equal(new Set(c.warnings).size, c.warnings.length, "no duplicates");
});
