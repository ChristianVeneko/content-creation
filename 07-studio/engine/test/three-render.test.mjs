// Real render check for the 3D templates: the same frame rendered twice (gl=angle) must be byte-identical.
// Bundles the project once (~20-40 s). Scratch output lives in the external-disk tmpdir and is removed afterwards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT, setupEnv } from "../lib/env.mjs";
import { CHROMIUM_OPTIONS, bundleProject } from "../lib/render.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { computeTimeline, paginateCaptions, syntheticCaptions } from "../lib/timeline.mjs";
import { planThree } from "../lib/scene3d.mjs";
import { loadThreeIcons, stageThreeAssets } from "../lib/three-assets.mjs";

setupEnv();

const props = (id, pub) => {
  const raw = JSON.parse(readFileSync(join(ENGINE_ROOT, "examples", `${id}.spec.json`), "utf8"));
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate(id));
  const timeline = computeTimeline(spec.scenes, { fps: spec.format.fps });
  return {
    timeline,
    inputProps: {
      spec,
      timeline,
      captionPages: paginateCaptions(syntheticCaptions(spec.scenes, timeline), spec.captions.wordsPerPage),
      assets: { narration: null, music: null, visuals: spec.scenes.map(() => null), three: stageThreeAssets(spec, pub).three },
      illustration: planThree(spec, timeline),
      icons: loadThreeIcons(spec).icons,
    },
  };
};

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

test("3D frames are deterministic: the same frame renders to identical bytes twice (clay shadows, neon bloom, hero HDRI, night road traffic, voxel set with an animated character)", { timeout: 600_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "engine-3d-det-"));
  try {
    const pub = join(dir, "public");
    mkdirSync(pub, { recursive: true });
    cpSync(join(ENGINE_ROOT, "public", "fonts"), join(pub, "fonts"), { recursive: true });
    const cases = ["clay-diorama", "neon-glass", "pedestal", "moody-night", "voxel-world"].map((id) => ({ id, ...props(id, pub) }));
    const serveUrl = await bundleProject({ publicDir: pub, outDir: join(dir, "bundle") });
    for (const { id, timeline, inputProps } of cases) {
      const sc = timeline.scenes[1];
      const frame = sc.from + Math.round(sc.durationInFrames * 0.6);
      const composition = await selectComposition({ serveUrl, id, inputProps, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "error" });
      const files = [0, 1].map((k) => join(dir, `${id}-${k}.png`));
      for (const output of files) await renderStill({ composition, serveUrl, output, frame, inputProps, imageFormat: "png", scale: 0.5, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "error" });
      assert.equal(sha(files[0]), sha(files[1]), `${id} frame ${frame} differs between two renders`);
      assert.ok(readFileSync(files[0]).length > 20_000, `${id}: suspiciously small (blank?) frame`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
