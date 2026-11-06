// Kit catalog (the "Motores" view): the video kits on disk and the opuscar style gallery.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
type Json = any;
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
import { listKits, opuscarStyles, styleStill } from "../server/kits.ts";

const root = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-kits-test-"));
after(() => rmSync(root, { recursive: true, force: true }));

function style(slug: string, still: boolean) {
  const dir = path.join(root, "05-tools/opuscar/styles", slug);
  mkdirSync(path.join(dir, "demo/stills"), { recursive: true });
  writeFileSync(path.join(dir, "style.json"), JSON.stringify({ slug, en: slug.toUpperCase(), film: `Film ${slug}`, line: `Line ${slug}`, uses: ["Uso"], dur: 58.5 }));
  if (still) writeFileSync(path.join(dir, "demo/stills/styleframe.jpg"), "JPEG");
}
style("chalkboard", true);
style("woodcut", false);
mkdirSync(path.join(root, "05-tools/opuscar/styles/_template"), { recursive: true });
mkdirSync(path.join(root, "05-tools/moment-reel"), { recursive: true });
mkdirSync(path.join(root, "00-docs"), { recursive: true });
writeFileSync(
  path.join(root, "00-docs/opuscar-styles.md"),
  `# Catálogo

## Explicar cosas (ciencia)

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Pizarra de tiza | \`chalkboard\` | La tiza escribe sola | B |

## Historia

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Grabado en madera | \`woodcut\` | Tallas en madera | M |
`,
);

test("kits report which folders exist, with the engine always available", () => {
  const kits = listKits(root);
  const by = new Map(kits.map((k) => [k.id, k]));
  assert.equal(kits[0].id, "engine");
  assert.equal(by.get("engine")!.available, true);
  assert.equal(by.get("moment-reel")!.available, true);
  assert.equal(by.get("opuscar")!.available, true);
  assert.equal(by.get("whatif-3d")!.available, false);
  assert.equal(by.get("opuscar")!.styles, 2);
  for (const k of kits) {
    assert.ok(k.name && k.look && k.bestFor && k.length, `${k.id} has its copy`);
    assert.ok(k.examples.length >= 2, `${k.id} has at least two example requests`);
    for (const e of k.examples) {
      assert.match(e, /^\/video \S/, `${k.id} example starts with /video`);
      assert.doesNotMatch(e, /[<>]/, `${k.id} example is concrete, no <placeholders>: ${e}`);
    }
    assert.ok(k.delivers.length >= 2, `${k.id} lists what it delivers`);
    assert.ok(k.delivers.some((d) => /video\.mp4/.test(d)), `${k.id} delivers video.mp4`);
  }
  assert.equal(by.get("moment-reel")!.researched, true);
});

test("styles follow the catalog order, unlisted ones last", () => {
  style("zz-unlisted", false);
  try {
    assert.deepEqual(opuscarStyles(root).map((s) => s.slug), ["chalkboard", "woodcut", "zz-unlisted"]);
    const swapped = path.join(root, "swapped");
    mkdirSync(path.join(swapped, "00-docs"), { recursive: true });
    writeFileSync(path.join(swapped, "00-docs/opuscar-styles.md"), "## B\n| W | `woodcut` | x | M |\n## A\n| C | `chalkboard` | y | B |\n");
    mkdirSync(path.join(swapped, "05-tools/opuscar"), { recursive: true });
    for (const slug of ["chalkboard", "woodcut"]) {
      mkdirSync(path.join(swapped, "05-tools/opuscar/styles", slug), { recursive: true });
      writeFileSync(path.join(swapped, "05-tools/opuscar/styles", slug, "style.json"), "{}");
    }
    assert.deepEqual(opuscarStyles(swapped).map((s) => s.slug), ["woodcut", "chalkboard"]);
  } finally {
    rmSync(path.join(root, "05-tools/opuscar/styles/zz-unlisted"), { recursive: true, force: true });
  }
});

test("opuscar styles join style.json with the Spanish catalog groups", () => {
  const styles = opuscarStyles(root);
  assert.deepEqual(styles.map((s) => s.slug), ["chalkboard", "woodcut"]);
  const [chalk, wood] = styles;
  assert.equal(chalk.name, "Pizarra de tiza");
  assert.equal(chalk.group, "Explicar cosas (ciencia)");
  assert.equal(chalk.effort, "B");
  assert.equal(chalk.does, "La tiza escribe sola");
  assert.equal(chalk.film, "Film chalkboard");
  assert.equal(chalk.still, true);
  assert.equal(wood.group, "Historia");
  assert.equal(wood.still, false);
});

test("styleStill only resolves known slugs that have a still", () => {
  assert.ok(styleStill(root, "chalkboard")?.endsWith("styleframe.jpg"));
  assert.equal(styleStill(root, "woodcut"), null);
  assert.equal(styleStill(root, "../../etc"), null);
  assert.equal(styleStill(root, "nope"), null);
});

test("the API serves the kits, the styles and their stills", async () => {
  const { app } = createApp({ ...readConfig({}), workspaceRoot: root });
  const kits = (await (await app.request("/api/kits")).json()) as Json;
  assert.ok(kits.kits.some((k: Json) => k.id === "moment-reel"));
  const styles = (await (await app.request("/api/kits/opuscar/styles")).json()) as Json;
  assert.equal(styles.styles.length, 2);
  const img = await app.request("/api/kits/opuscar/styles/chalkboard/still");
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/jpeg");
  assert.equal((await app.request("/api/kits/opuscar/styles/woodcut/still")).status, 404);
  assert.equal((await app.request("/api/kits/opuscar/styles/..%2F..%2Fx/still")).status, 404);
});
