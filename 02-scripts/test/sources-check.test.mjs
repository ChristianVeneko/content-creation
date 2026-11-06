import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkSources } from "../sources-check.mjs";

const TODAY = "2026-11-06";
const good = `# Fuentes: La mano de Dios
Investigado: 2026-11-06

| # | Dato | Dónde se usa | Fuente | Leído |
|---|---|---|---|---|
| 1 | Fue el 22 de junio de 1986 | línea 3 | https://www.fifa.com/a | 2026-11-06 |
| 2 | Ganó Argentina 2-1 | línea 9 | https://es.wikipedia.org/wiki/b | 2026-11-06 |

## Fuera del video
- El árbitro no lo vio: las fuentes no coinciden.
`;
const status = (rows, what) => rows.find((r) => r.what === what)?.status;

test("a table with dated sources from two sites passes", () => {
  const r = checkSources(good, TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.facts, 2);
  assert.equal(status(r.rows, "facts"), "PASS");
  assert.equal(status(r.rows, "sites"), "PASS");
  assert.equal(status(r.rows, "left out"), "PASS");
});

test("no fact rows fails", () => {
  const r = checkSources("# Fuentes\n\n## Fuera del video\n", TODAY);
  assert.equal(r.ok, false);
  assert.equal(status(r.rows, "facts"), "FAIL");
});

test("a fact without a URL fails and names its row", () => {
  const r = checkSources(good.replace("https://www.fifa.com/a", "FIFA"), TODAY);
  assert.equal(r.ok, false);
  assert.match(r.rows.find((x) => x.what === "urls").detail, /1/);
});

test("a missing, malformed or future read date fails", () => {
  for (const d of ["", "ayer", "2026-12-01"]) {
    const r = checkSources(good.replace("| https://www.fifa.com/a | 2026-11-06 |", `| https://www.fifa.com/a | ${d} |`), TODAY);
    assert.equal(r.ok, false, `date ${JSON.stringify(d)}`);
    assert.equal(status(r.rows, "read dates"), "FAIL");
  }
});

test("an old read date and a single site only warn", () => {
  const r = checkSources(good.replace(/2026-11-06 \|/g, "2026-10-01 |").replace("es.wikipedia.org", "www.fifa.com"), TODAY);
  assert.equal(r.ok, true);
  assert.equal(status(r.rows, "read dates"), "WARN");
  assert.equal(status(r.rows, "sites"), "WARN");
});

test("a missing left-out section warns", () => {
  const r = checkSources(good.split("## Fuera del video")[0], TODAY);
  assert.equal(r.ok, true);
  assert.equal(status(r.rows, "left out"), "WARN");
});

test("the CLI exits 1 on FAIL and 0 on PASS", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sources-"));
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sources-check.mjs");
  writeFileSync(path.join(dir, "ok.md"), good);
  writeFileSync(path.join(dir, "bad.md"), "# Fuentes\n");
  const out = execFileSync("node", [cli, path.join(dir, "ok.md"), "--today", TODAY], { encoding: "utf8" });
  assert.match(out, /PASS\s+facts/);
  try {
    assert.throws(() => execFileSync("node", [cli, path.join(dir, "bad.md"), "--today", TODAY], { stdio: "pipe" }), (e) => e.status === 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
