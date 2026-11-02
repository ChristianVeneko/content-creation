import assert from "node:assert/strict";
import { test } from "node:test";
import type { TemplateInfo } from "../shared/types.ts";
import { FAMILIES, familyCounts, formatFamily, lookLine, matchesFormatQuery, rankTemplates } from "../src/lib/formats.ts";
import { contrastBadges, worstContrast } from "../src/lib/palette.ts";

const t = (over: Partial<TemplateInfo> & { id: string }): TemplateInfo => ({ name: over.id, description: "", emoji: "x", gradient: ["#000", "#111"], ...over });

test("formatFamily groups by category, format and best-for keywords", () => {
  assert.equal(formatFamily(t({ id: "clay-diorama", category: "3d" })), "3d");
  assert.equal(formatFamily(t({ id: "pixel-arcade", category: "pixel" })), "pixel");
  assert.equal(formatFamily(t({ id: "x", format: "pixel-versus", category: "illustrated-2d" })), "pixel");
  assert.equal(formatFamily(t({ id: "rank-numbers", category: "illustrated-2d", bestFor: ["top N lists", "rankings"] })), "ranking");
  assert.equal(formatFamily(t({ id: "editorial-chart", category: "illustrated-2d", bestFor: ["statistics and research"] })), "data");
  assert.equal(formatFamily(t({ id: "ukiyo-e", category: "illustrated-2d", bestFor: ["calm storytelling"] })), "story");
  assert.equal(formatFamily(t({ id: "soft-gradient", category: "illustrated-2d", bestFor: ["app and product launches"] })), "product");
  assert.equal(formatFamily(t({ id: "whiteboard", category: "illustrated-2d", bestFor: ["concept explainers"] })), "explainer");
  assert.equal(formatFamily(t({ id: "mystery" })), "explainer");
});

test("every family has a label and a one-line hint", () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), ["explainer", "data", "story", "ranking", "product", "pixel", "3d"]);
  for (const f of FAMILIES) assert.ok(f.label && f.hint, f.id);
});

test("familyCounts counts per family and lists only used ones with 'all' first", () => {
  const list = [t({ id: "a", category: "3d" }), t({ id: "b", category: "3d" }), t({ id: "c", category: "pixel" })];
  const c = familyCounts(list);
  assert.deepEqual(c.map((x) => [x.id, x.count]), [["all", 3], ["pixel", 1], ["3d", 2]]);
});

test("lookLine takes the first sentence of the description, trimmed", () => {
  assert.equal(lookLine(t({ id: "a", description: "Hand-drawn marker board. Second sentence." })), "Hand-drawn marker board.");
  assert.equal(lookLine(t({ id: "a", description: "x".repeat(200) })).length <= 100, true);
  assert.equal(lookLine(t({ id: "a", description: "" })), "");
});

test("matchesFormatQuery searches the format slug, name, best-for and accents", () => {
  const tpl = t({ id: "x", format: "host-tutorial", name: "Tutorial con presentador", bestFor: ["how-tos"] });
  assert.equal(matchesFormatQuery(tpl, "host tutorial"), true);
  assert.equal(matchesFormatQuery(tpl, "presentador"), true);
  assert.equal(matchesFormatQuery(tpl, "pixel"), false);
  assert.equal(matchesFormatQuery(tpl, "  "), true);
});

test("rankTemplates puts recommended ids first, keeps registry order for the rest", () => {
  const list = ["a", "b", "c", "d"].map((id) => t({ id }));
  assert.deepEqual(rankTemplates(list, ["c", "a"]).map((x) => x.id), ["c", "a", "b", "d"]);
  assert.deepEqual(rankTemplates(list, []).map((x) => x.id), ["a", "b", "c", "d"]);
});

test("contrastBadges: text and accent against the worst background stop, warn below 4.5", () => {
  const good = contrastBadges({ bg: ["#000000", "#111111"], text: "#FFFFFF", accent: "#FFD60A" });
  assert.deepEqual(good.map((b) => [b.id, b.ok]), [["text", true], ["accent", true]]);
  const bad = contrastBadges({ bg: ["#000000", "#F5F5F5"], text: "#FFFFFF", accent: "#222222" });
  assert.equal(bad[0].ok, false);
  assert.equal(bad[1].ok, false);
  assert.ok(bad[0].ratio < 1.2);
  assert.equal(bad[0].label, "Texto 1.1:1");
});

test("worstContrast returns the lowest ratio and its colors", () => {
  const w = worstContrast("#FFFFFF", ["#000000", "#DDDDDD"]);
  assert.equal(w.against, "#DDDDDD");
  assert.ok(w.ratio < 2);
});
