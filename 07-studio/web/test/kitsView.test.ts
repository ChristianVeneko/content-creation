// The "Motores" view helpers.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { KitStyle } from "../shared/types.ts";
import { groupStyles, matchesStyle, styleRequest } from "../src/lib/kits.ts";

const s = (slug: string, group: string, name: string, does = ""): KitStyle => ({ slug, group, name, does, effort: "B", film: "", line: "", still: true });
const styles = [s("chalkboard", "Explicar", "Pizarra de tiza", "La tiza escribe sola"), s("woodcut", "Historia", "Grabado"), s("whiteboard", "Explicar", "Pizarra blanca")];

test("style search ignores accents and case and needs every word", () => {
  assert.equal(matchesStyle(styles[0], "  "), true);
  assert.equal(matchesStyle(styles[0], "TIZA"), true);
  assert.equal(matchesStyle(styles[0], "pizarra escribe"), true);
  assert.equal(matchesStyle(styles[0], "pizarra madera"), false);
  assert.equal(matchesStyle(s("x", "g", "Música"), "musica"), true);
});

test("groups keep catalog order", () => {
  assert.deepEqual(groupStyles(styles).map((g) => [g.group, g.items.map((i) => i.slug)]), [
    ["Explicar", ["chalkboard", "whiteboard"]],
    ["Historia", ["woodcut"]],
  ]);
});

test("a style card copies a concrete /video request naming the style", () => {
  const r = styleRequest(styles[0]);
  assert.match(r, /^\/video \S/);
  assert.match(r, /Pizarra de tiza \(chalkboard\)$/);
  assert.doesNotMatch(r, /[<>]/);
});
