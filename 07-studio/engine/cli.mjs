#!/usr/bin/env node
// Video Studio engine CLI.
//   node cli.mjs templates [--brief]
//   node cli.mjs template <id>
//   node cli.mjs prompt <template>
//   node cli.mjs music
//   node cli.mjs voices [--gender male|female] [--pick <seed>]
//   node cli.mjs validate <spec.json|->
//   node cli.mjs build <spec.json> --out <dir> [--json-logs] [--keep-work]
//   node cli.mjs cover <spec.json> --out <dir>
import { readFileSync } from "node:fs";
import { setupEnv } from "./lib/env.mjs";
import { validateSpec } from "./lib/spec.mjs";
import { listTemplates } from "./lib/templates.mjs";

const USAGE = `Usage:
  node cli.mjs templates                                   Print the template list as JSON
  node cli.mjs templates --brief                           One line per template: id, category, format, name, best for (for agents)
  node cli.mjs template <id>                               Print one template's full entry as JSON
  node cli.mjs prompt <template> [--creative]              Print the spec-writer prompt trimmed to that template's family
                                                           (--creative adds the originals-first sections for Claude Code)
  node cli.mjs music                                       Print the music library (moods, tracks, levels) as JSON
  node cli.mjs voices [--gender male|female] [--pick <seed>]
                                                           Trending Latin American Spanish ElevenLabs voices as JSON
                                                           (--pick prints only the auto-picked voice for that seed)
  node cli.mjs validate <spec.json|->                      Validate a VideoSpec (prints {ok, errors})
  node cli.mjs build <spec.json> --out <dir> [--json-logs] [--keep-work]
                                                           Render video.mp4, cover.jpg, post.md, spec.json into <dir>
  node cli.mjs cover <spec.json> --out <dir>               Reels templates: render cover.jpg + cover-check.png (3:4 crop) only`;

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") flags.out = argv[++i];
    else if (a.startsWith("--out=")) flags.out = a.slice(6);
    else if (a === "--json-logs") flags.jsonLogs = true;
    else if (a === "--keep-work") flags.keepWork = true;
    else if (a === "--brief") flags.brief = true;
    else if (a === "--creative") flags.creative = true;
    else if (a === "--gender") flags.gender = argv[++i];
    else if (a === "--pick") flags.pick = argv[++i] ?? "";
    else if (a === "-h" || a === "--help") flags.help = true;
    else pos.push(a);
  }
  return { pos, flags };
}

async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2));
  const cmd = pos[0];
  if (!cmd || flags.help) {
    console.log(USAGE);
    return flags.help ? 0 : 2;
  }

  if (cmd === "templates") {
    const list = listTemplates();
    if (flags.brief) {
      const bestFor = (t) => (Array.isArray(t.best_for) ? t.best_for.join(", ") : (t.best_for ?? ""));
      process.stdout.write(list.map((t) => [t.id, t.category, t.format, t.name, bestFor(t)].join("\t")).join("\n") + "\n");
    } else process.stdout.write(JSON.stringify(list, null, 2) + "\n");
    return 0;
  }

  if (cmd === "template") {
    const t = listTemplates().find((x) => x.id === pos[1]);
    if (!t) {
      console.error(`Unknown template: ${pos[1] ?? ""}. List them with: node cli.mjs templates --brief`);
      return 1;
    }
    process.stdout.write(JSON.stringify(t, null, 2) + "\n");
    return 0;
  }

  if (cmd === "prompt") {
    if (!pos[1]) {
      console.error(USAGE);
      return 2;
    }
    const { specWriterPromptFor } = await import("./lib/spec-writer-prompt.mjs");
    const manual = readFileSync(new URL("./prompts/spec-writer.md", import.meta.url), "utf8");
    process.stdout.write(specWriterPromptFor(pos[1], manual, { creative: Boolean(flags.creative) }));
    return 0;
  }

  if (cmd === "music") {
    const { libraryListing } = await import("./lib/music.mjs");
    process.stdout.write(JSON.stringify(libraryListing(), null, 2) + "\n");
    return 0;
  }

  if (cmd === "voices") {
    setupEnv();
    const { pickVoice, trendingVoices } = await import("./lib/voices.mjs");
    const gender = flags.gender === "female" ? "female" : "male";
    if (!process.env.ELEVENLABS_API_KEY) {
      process.stdout.write(JSON.stringify({ available: false, reason: "ELEVENLABS_API_KEY is not set", voices: [] }, null, 2) + "\n");
      return 0;
    }
    const voices = await trendingVoices({ gender });
    const out = flags.pick !== undefined ? { available: true, voice: pickVoice(voices, flags.pick) } : { available: true, voices };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    return 0;
  }

  if (cmd === "validate") {
    const file = pos[1];
    if (!file) {
      console.error(USAGE);
      return 2;
    }
    let raw;
    try {
      raw = JSON.parse(file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8"));
    } catch (e) {
      process.stdout.write(JSON.stringify({ ok: false, errors: [{ path: "(file)", message: `Cannot read JSON: ${e.message}` }] }) + "\n");
      return 1;
    }
    const r = validateSpec(raw);
    process.stdout.write(JSON.stringify({ ok: r.ok, errors: r.errors }, null, 2) + "\n");
    return r.ok ? 0 : 1;
  }

  if (cmd === "build") {
    const specPath = pos[1];
    if (!specPath || !flags.out) {
      console.error(USAGE);
      return 2;
    }
    setupEnv();
    const log = flags.jsonLogs
      ? (step, status, message, progress, extra = {}) =>
          process.stdout.write(JSON.stringify({ step, status, message, progress: Number(progress.toFixed(3)), ...extra }) + "\n")
      : (step, status, message, progress) => process.stderr.write(`[${String(Math.round(progress * 100)).padStart(3)}%] ${step.padEnd(8)} ${message}\n`);
    const { build } = await import("./lib/build.mjs");
    try {
      await build({ specPath, outDir: flags.out, log, keepWork: flags.keepWork });
      return 0;
    } catch (e) {
      const step = e.step || "build";
      if (flags.jsonLogs) process.stdout.write(JSON.stringify({ step, status: "error", message: e.message }) + "\n");
      else process.stderr.write(`ERROR [${step}] ${e.message}\n`);
      return 1;
    }
  }

  if (cmd === "cover") {
    const specPath = pos[1];
    if (!specPath || !flags.out) {
      console.error(USAGE);
      return 2;
    }
    const { coverOnly } = await import("./lib/reels-stills.mjs");
    try {
      const out = await coverOnly({ specPath, outDir: flags.out, log: (m) => console.error(m) });
      process.stdout.write(JSON.stringify({ ok: true, ...out }) + "\n");
      return 0;
    } catch (e) {
      process.stdout.write(JSON.stringify({ ok: false, message: e.message }) + "\n");
      return 1;
    }
  }

  console.error(`Unknown command "${cmd}"\n${USAGE}`);
  return 2;
}

// Set exitCode instead of calling process.exit(): exit() can cut off large piped stdout (e.g. `templates` > 64 KB).
main().then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
