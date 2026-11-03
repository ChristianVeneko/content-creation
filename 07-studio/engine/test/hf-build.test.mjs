// The HyperFrames build route with a fake renderer: pipeline order, caption ownership and the outputs.
process.env.CC_HF_INTERNAL = "1";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../lib/media.mjs";
import { setupEnv } from "../lib/env.mjs";

setupEnv();
await import("../hf/registry.mjs");
const { build } = await import("../lib/build.mjs");
const hfb = await import("../lib/build-hf.mjs");
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

const specObj = (over = {}) => ({
  version: 1,
  title: "HF test",
  template: "_stub",
  mode: "multi",
  voice: { provider: "none" },
  music: { provider: "none" },
  hf: { style: "solid" },
  scenes: [
    { id: "a", narration: "Hola mundo bonito.", onScreenText: "HOLA" },
    { id: "b", narration: "Segunda escena aqui.", onScreenText: "DOS" },
  ],
  ...over,
});

/** Fake renderer: records every pass and writes a small black video of the composition's duration. */
function fakeDeps() {
  const calls = [];
  return {
    calls,
    deps: {
      render: async ({ dir, output, quality, captions, entry }) => {
        const html = readFileSync(join(dir, entry), "utf8");
        const dur = html.match(/data-duration="([\d.]+)"/)[1];
        calls.push({ output, quality, captions, entry, hasCaptionVar: /"id":"captions"/.test(html) });
        await run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=black:s=108x192:r=30:d=${dur}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", output]);
      },
    },
  };
}

async function buildWith(spec, { quality, deps } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "hf-build-"));
  const specPath = join(dir, "spec.json");
  writeFileSync(specPath, JSON.stringify(spec));
  const logs = [];
  const f = fakeDeps();
  const outputs = await build({ specPath, outDir: join(dir, "out"), log: (step, status, message, progress, extra) => logs.push({ step, status, message, progress, ...extra }), quality, hfDeps: { ...f.deps, ...deps } });
  return { dir, out: join(dir, "out"), outputs, logs, calls: f.calls };
}

test("the route renders captions-on then captions-off, muxes both with the audio and writes the standard outputs", async () => {
  const { dir, out, outputs, logs, calls } = await buildWith(specObj(), { quality: "draft" });
  assert.deepEqual(calls.map((c) => c.captions), [true, false]);
  assert.ok(calls.every((c) => c.quality === "draft" && c.hasCaptionVar && c.entry === "index.html"));
  for (const f of ["video.mp4", "video-sin-subtitulos.mp4", "cover.jpg", "post.md", "spec.json", "words.json"]) assert.ok(existsSync(join(out, f)), f);
  assert.equal(outputs.video, join(out, "video.mp4"));
  assert.equal(outputs.videoNoCaptions, join(out, "video-sin-subtitulos.mp4"));
  const probe = (f) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", join(out, f)], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  assert.deepEqual(probe("video.mp4").sort(), ["audio", "video"]);
  assert.deepEqual(probe("video-sin-subtitulos.mp4").sort(), ["audio", "video"]);
  // the standard --json-logs steps keep the dashboard working
  const steps = [...new Set(logs.map((l) => l.step))];
  assert.deepEqual(steps, ["validate", "tts", "captions", "render", "cover", "done"]);
  assert.equal(logs.at(-1).progress, 1);
  assert.ok(logs.every((l, i) => i === 0 || l.progress >= logs[i - 1].progress - 1e-9));
  assert.ok(!existsSync(join(out, ".work")));
  assert.ok(!existsSync(join(out, "captions.json")), "no engine caption data is written for HF formats");
  const words = JSON.parse(readFileSync(join(out, "words.json"), "utf8"));
  assert.equal(words.length, 6);
  rmSync(dir, { recursive: true, force: true });
});

test("captions.enabled=false produces only the no-captions render, used for both deliverables", async () => {
  const { dir, out, calls } = await buildWith(specObj({ captions: { enabled: false } }));
  assert.deepEqual(calls.map((c) => c.captions), [false]);
  assert.ok(existsSync(join(out, "video.mp4")) && existsSync(join(out, "video-sin-subtitulos.mp4")));
  assert.match(readFileSync(join(out, "spec.json"), "utf8"), /"enabled": false/);
  rmSync(dir, { recursive: true, force: true });
});

test("CAPTION OWNERSHIP: the HF route never touches the engine's caption layer or the Remotion/Blender renderers, and the mux never filters video", () => {
  const src = readFileSync(new URL("../lib/build-hf.mjs", import.meta.url), "utf8");
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const forbidden of ["./captions.mjs", "./blender-captions.mjs", "./render.mjs", "./blender.mjs", "./reels-build.mjs"]) assert.ok(!imports.includes(forbidden), `build-hf.mjs must not import ${forbidden}`);
  assert.ok(!imports.some((i) => i.includes("remotion")));
  assert.ok(!/paginateCaptions/.test(src), "no engine caption pagination");
  assert.equal(hfb.HF_OWNS_CAPTIONS, true);
  const mux = hfb.muxArgs({ video: "v.mp4", audio: "a.m4a", out: "o.mp4" });
  for (const bad of ["-vf", "-filter_complex", "-af", "-filter:v", "ass", "subtitles"]) assert.ok(!mux.includes(bad), `mux must not use ${bad}`);
  assert.ok(mux.join(" ").includes("-c copy"));
  // the render flag is the only caption switch
  assert.deepEqual(hfb.hyperframesRenderArgs({ dir: "d", output: "o.mp4", quality: "draft", captions: true }).slice(0, 8), ["-y", `hyperframes@${hfb.HYPERFRAMES_VERSION}`, "render", "--quality", "draft", "--variables", '{"captions":true}', "-o"]);
  assert.match(hfb.hyperframesRenderArgs({ dir: "d", output: "o.mp4", captions: false }).join(" "), /--variables \{"captions":false\}/);
});

test("the HyperFrames CLI version is pinned in one constant", () => {
  assert.equal(hfb.HYPERFRAMES_VERSION, "0.9.6");
  const src = readFileSync(new URL("../lib/build-hf.mjs", import.meta.url), "utf8");
  assert.equal([...src.matchAll(/0\.9\.6/g)].length, 1);
});

test("an invalid hf payload is rejected at the validate step with the module's path, before any work", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hf-build-"));
  const specPath = join(dir, "s.json");
  writeFileSync(specPath, JSON.stringify(specObj({ hf: { textScale: 7 } })));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, hfDeps: fakeDeps().deps }), (e) => e.step === "validate" && /hf\.textScale/.test(e.message));
  assert.ok(!existsSync(join(dir, "o")));
  rmSync(dir, { recursive: true, force: true });
});

test("options that do not apply fail instead of being ignored: --quality on Remotion templates, --renderer and bad quality on HF formats", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hf-build-"));
  const specPath = join(dir, "s.json");
  writeFileSync(specPath, JSON.stringify({ version: 1, title: "x", template: "countdown", scenes: [{ id: "a", narration: "uno", visual: { type: "gradient" } }] }));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, quality: "draft" }), (e) => e.step === "validate" && /--quality is only for HyperFrames formats/.test(e.message));
  writeFileSync(specPath, JSON.stringify(specObj()));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, renderer: "remotion", hfDeps: fakeDeps().deps }), (e) => /--renderer does not apply/.test(e.message));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, quality: "ultra", hfDeps: fakeDeps().deps }), /Unknown quality "ultra"/);
  const r = spawnSync(process.execPath, [cli, "build", specPath, "--out", join(dir, "o"), "--quality", "ultra"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown quality "ultra"; allowed qualities: draft, looks, delivery/);
  rmSync(dir, { recursive: true, force: true });
});

test("sfxBeats maps module kinds onto the engine kit, accepts sfx file paths and warns on unknown kinds", () => {
  const { beats, warnings, custom } = hfb.sfxBeats([{ at: 1, kind: "whoosh" }, { at: 2, kind: "coin" }, { at: 3, kind: "pop" }, { at: 4, kind: "zzz" }, { at: -1, kind: "pop" }, { at: 5, kind: "generated/pop-1.wav" }], join(fileURLToPath(new URL("../../../03-assets/sfx", import.meta.url))));
  assert.deepEqual(beats.map((b) => b.kind), ["cut", "ding", "pop", "generated/pop-1.wav"]);
  assert.equal(warnings.length, 2);
  assert.deepEqual(Object.keys(custom), ["generated/pop-1.wav"]);
});

test("toWords converts Caption[] (ms) to monotonic seconds", () => {
  const w = hfb.toWords([{ text: " a", startMs: 500, endMs: 900 }, { text: " b", startMs: 400, endMs: 450 }]);
  assert.deepEqual(w, [{ text: "a", start: 0.5, end: 0.9 }, { text: "b", start: 0.5, end: 0.5 }]);
});

test("compose() may return the entry as a relative or an absolute path, but it must live inside outDir", async () => {
  const { resolveHfEntry } = await import("../lib/build-hf.mjs");
  const dir = mkdtempSync(join(tmpdir(), "hf-entry-"));
  try {
    writeFileSync(join(dir, "index.html"), "<html></html>");
    assert.equal(resolveHfEntry(dir, "index.html"), "index.html");
    assert.equal(resolveHfEntry(dir, join(dir, "index.html")), "index.html");
    assert.equal(resolveHfEntry(dir, "missing.html"), null);
    assert.equal(resolveHfEntry(dir, "/etc/hosts"), null);
    assert.equal(resolveHfEntry(dir, "../outside.html"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compose warnings are formatted for the build log, capped and de-duplicated", async () => {
  const { composeWarningLines } = await import("../lib/build-hf.mjs");
  assert.deepEqual(composeWarningLines(undefined), []);
  assert.deepEqual(composeWarningLines(["a", "a", "b"]), ["Compose warning: a", "Compose warning: b"]);
  const many = Array.from({ length: 30 }, (_, i) => `w${i}`);
  const lines = composeWarningLines(many);
  assert.equal(lines.length, 11);
  assert.equal(lines[10], "Compose warning: 20 more not shown");
});
