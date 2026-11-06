#!/usr/bin/env node
// sources-check.mjs: check a video's fact table (sources.md) before the script is written.
//
//   node 02-scripts/sources-check.mjs $P/sources.md [--today YYYY-MM-DD]
//
// sources.md is a Markdown table with one verified fact per row (the last column is the read date)
// and a "## Fuera del video" (or "## Left out") section for what could not be verified:
//
//   | # | Dato | Dónde se usa | Fuente | Leído |
//   |---|---|---|---|---|
//   | 1 | Fue el 22 de junio de 1986 | línea 3 | https://... | 2026-11-06 |
//
// FAIL (exit 1): no fact rows, a row without an http(s) URL, a read date that is missing, malformed or in the future.
// WARN: a read date older than 7 days, every source on one site, no left-out section.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DAY = 86400000;
const STALE_DAYS = 7;

function cells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function factRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return [];
  // skip the header and the |---| separator
  return lines.slice(1).filter((l) => !/^\|?\s*:?-{3,}/.test(l.trim())).map(cells);
}

export function checkSources(text, today = new Date().toISOString().slice(0, 10)) {
  const rows = [];
  const add = (status, what, detail) => rows.push({ status, what, detail });
  const facts = factRows(text);
  const now = Date.parse(today);

  add(facts.length ? "PASS" : "FAIL", "facts", facts.length ? `${facts.length} verified facts` : "no fact rows in the table");

  const noUrl = [];
  const hosts = new Set();
  const badDate = [];
  const stale = [];
  facts.forEach((c, i) => {
    const n = c[0] || String(i + 1);
    const url = c.join(" ").match(/https?:\/\/[^\s|)>\]]+/);
    if (!url) noUrl.push(n);
    else {
      try {
        hosts.add(new URL(url[0]).hostname.replace(/^www\./, ""));
      } catch {
        noUrl.push(n);
      }
    }
    const date = c[c.length - 1];
    const t = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date) : NaN;
    if (Number.isNaN(t) || t > now) badDate.push(n);
    else if (now - t > STALE_DAYS * DAY) stale.push(n);
  });

  if (facts.length) {
    add(noUrl.length ? "FAIL" : "PASS", "urls", noUrl.length ? `rows without a source URL: ${noUrl.join(", ")}` : "every fact has a URL");
    if (badDate.length) add("FAIL", "read dates", `missing, malformed (YYYY-MM-DD) or future on rows: ${badDate.join(", ")}`);
    else if (stale.length) add("WARN", "read dates", `older than ${STALE_DAYS} days on rows: ${stale.join(", ")} (open them again today)`);
    else add("PASS", "read dates", "every source read in the last week");
    add(hosts.size >= 2 ? "PASS" : "WARN", "sites", `${hosts.size} different site${hosts.size === 1 ? "" : "s"} (2 or more: confirm key facts twice)`);
  }
  const leftOut = /^##\s+(fuera del video|left out)/im.test(text);
  add(leftOut ? "PASS" : "WARN", "left out", leftOut ? "section present" : 'no "## Fuera del video" section for what you could not verify');

  return { ok: !rows.some((r) => r.status === "FAIL"), facts: facts.length, rows };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--today");
  if (!file) {
    console.error("usage: node 02-scripts/sources-check.mjs <sources.md> [--today YYYY-MM-DD]");
    process.exit(2);
  }
  const ti = args.indexOf("--today");
  const r = checkSources(readFileSync(file, "utf8"), ti >= 0 ? args[ti + 1] : undefined);
  for (const row of r.rows) console.log(`${row.status.padEnd(5)} ${row.what.padEnd(11)} ${row.detail}`);
  process.exit(r.ok ? 0 : 1);
}
