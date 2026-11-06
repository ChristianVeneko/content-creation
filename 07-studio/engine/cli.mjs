#!/usr/bin/env node
// Video Studio engine CLI.
//   node cli.mjs templates [--brief]
//   node cli.mjs template <id>
//   node cli.mjs prompt <template>
//   node cli.mjs builders
//   node cli.mjs music
//   node cli.mjs voices [--gender male|female] [--pick <seed>]
//   node cli.mjs validate <spec.json|->
//   node cli.mjs build <spec.json> --out <dir> [--renderer remotion|blender] [--quality draft|looks|delivery] [--voice-id <id>] [--voice elevenlabs|kokoro|none] [--json-logs] [--keep-work]
//   node cli.mjs hyperframes-brief <spec.json> [--json] [--audio-secs 4.1,3.2,...]
//   node cli.mjs cover <spec.json> --out <dir>
import { readFileSync } from "node:fs";
import { setupEnv } from "./lib/env.mjs";
import { validateSpec } from "./lib/spec.mjs";
import { listTemplates } from "./lib/templates.mjs";
import { hfPromptFor, isHfTemplate } from "./hf/registry.mjs";

const USAGE = `Usage:
  node cli.mjs templates                                   Print the template list as JSON
  node cli.mjs templates --brief                           One line per template: id, category, format, name, best for (for agents)
  node cli.mjs template <id>                               Print one template's full entry as JSON
  node cli.mjs prompt <template> [--creative]              Print the spec-writer prompt trimmed to that template's family
                                                           (--creative adds the originals-first sections for Claude Code)
                                                           (HyperFrames formats: the common rules plus the format module's own section)
  node cli.mjs builders                                    Print the 3D stage builders (names, params with defaults, part counts) as JSON
  node cli.mjs music                                       Print the music library (moods, tracks, levels) as JSON
  node cli.mjs voices [--gender male|female] [--pick <seed>]
                                                           Trending Latin American Spanish ElevenLabs voices as JSON
                                                           (--pick prints only the auto-picked voice for that seed)
  node cli.mjs validate <spec.json|->                      Validate a VideoSpec (prints {ok, errors})
  node cli.mjs build <spec.json> --out <dir> [--renderer remotion|blender] [--quality draft|looks|delivery] [--voice-id <id>] [--voice elevenlabs|kokoro|none] [--json-logs] [--keep-work]
                                                           Render video.mp4, cover.jpg, post.md, spec.json into <dir>
                                                           (--renderer overrides theme.renderer; blender is for 3D templates)
                                                           (HyperFrames formats render with HyperFrames and draw their own captions: video.mp4 has
                                                           them (unless captions.enabled is false), video-sin-subtitulos.mp4 never does; --quality
                                                           sets the HyperFrames render quality, default looks)
                                                           (--voice-id sets spec.voice.voiceId: a 20-character ElevenLabs id or a Kokoro id like em_alex; --voice forces the provider)
  node cli.mjs hyperframes-brief <spec.json> [--json] [--audio-secs s1,s2,...]
                                                           Validate a spec and print the brief for the HyperFrames skill route
                                                           (markdown by default, --json for the structured brief; --audio-secs gives
                                                           the measured narration seconds per scene, else timings are text-timed)
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
    else if (a === "--renderer") flags.renderer = argv[++i] ?? "";
    else if (a === "--quality") flags.quality = argv[++i] ?? "";
    else if (a.startsWith("--quality=")) flags.quality = a.slice(10);
    else if (a === "--voice-id") flags.voiceId = argv[++i] ?? "";
    else if (a.startsWith("--voice-id=")) flags.voiceId = a.slice(11);
    else if (a === "--voice") flags.voice = argv[++i] ?? "";
    else if (a.startsWith("--voice=")) flags.voice = a.slice(8);
    else if (a.startsWith("--renderer=")) flags.renderer = a.slice(11);
    else if (a === "--json") flags.json = true;
    else if (a === "--audio-secs") flags.audioSecs = argv[++i] ?? "";
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
    const common = specWriterPromptFor(pos[1], manual, { creative: Boolean(flags.creative) });
    process.stdout.write(isHfTemplate(pos[1]) ? hfPromptFor(pos[1], common) : common);
    return 0;
  }

  if (cmd === "music") {
    const { libraryListing } = await import("./lib/music.mjs");
    process.stdout.write(JSON.stringify(libraryListing(), null, 2) + "\n");
    return 0;
  }

  if (cmd === "builders") {
    const { describeBuilders } = await import("./lib/scene3d-builders.mjs");
    process.stdout.write(JSON.stringify(describeBuilders(), null, 2) + "\n");
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

  if (cmd === "mascots") {
    setupEnv();
    const { loadMascots, defaultHeroId } = await import("./hf/pixel-world/mascots.mjs");
    const { loadCatalog } = await import("./hf/pixel-world/catalog.mjs");
    const lib = loadMascots();
    const out = { default: defaultHeroId(), dir: lib.dir, heroes: loadCatalog().heroes, errors: lib.errors };
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
    if (flags.renderer !== undefined) {
      const { RENDERERS } = await import("./lib/blender-options.mjs");
      if (!RENDERERS.includes(flags.renderer)) {
        console.error(`Unknown renderer "${flags.renderer}"; allowed renderers: ${RENDERERS.join(", ")}\n${USAGE}`);
        return 2;
      }
    }
    if (flags.quality !== undefined) {
      const { HF_QUALITIES } = await import("./lib/build-hf.mjs");
      if (!HF_QUALITIES.includes(flags.quality)) {
        console.error(`Unknown quality "${flags.quality}"; allowed qualities: ${HF_QUALITIES.join(", ")}\n${USAGE}`);
        return 2;
      }
    }
    const { resolveVoiceOverride } = await import("./lib/voice-override.mjs");
    const voiceChoice = resolveVoiceOverride({ voiceId: flags.voiceId, provider: flags.voice });
    if (voiceChoice.error) {
      console.error(`${voiceChoice.error}\n${USAGE}`);
      return 2;
    }
    setupEnv();
    const log = flags.jsonLogs
      ? (step, status, message, progress, extra = {}) =>
          process.stdout.write(JSON.stringify({ step, status, message, progress: Number(progress.toFixed(3)), ...extra }) + "\n")
      : (step, status, message, progress) => process.stderr.write(`[${String(Math.round(progress * 100)).padStart(3)}%] ${step.padEnd(8)} ${message}\n`);
    const { build } = await import("./lib/build.mjs");
    try {
      await build({ specPath, outDir: flags.out, log, keepWork: flags.keepWork, renderer: flags.renderer, voice: voiceChoice.override ?? undefined, quality: flags.quality });
      return 0;
    } catch (e) {
      const step = e.step || "build";
      if (flags.jsonLogs) process.stdout.write(JSON.stringify({ step, status: "error", message: e.message }) + "\n");
      else process.stderr.write(`ERROR [${step}] ${e.message}\n`);
      return 1;
    }
  }

  if (cmd === "hyperframes-brief") {
    const specPath = pos[1];
    if (!specPath) {
      console.error(USAGE);
      return 2;
    }
    const { buildBrief, briefMarkdown } = await import("./lib/hyperframes-brief.mjs");
    let raw;
    try {
      raw = JSON.parse(specPath === "-" ? readFileSync(0, "utf8") : readFileSync(specPath, "utf8"));
    } catch (e) {
      console.error(`Cannot read spec JSON: ${e.message}`);
      return 1;
    }
    const audioSecs = flags.audioSecs ? flags.audioSecs.split(",").map(Number) : undefined;
    const r = buildBrief(raw, { audioSecs });
    if (!r.ok) {
      process.stdout.write(JSON.stringify({ ok: false, errors: r.errors }, null, 2) + "\n");
      return 1;
    }
    process.stdout.write(flags.json ? JSON.stringify(r.brief, null, 2) + "\n" : briefMarkdown(r.brief));
    return 0;
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
