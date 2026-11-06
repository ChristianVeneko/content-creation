// Brief for the HyperFrames route of a 2D video: the agent authors the composition with the hyperframes skills, using
// this brief as the source of truth (scenes, timings, palette, captions, format, retention rules). It is NOT a
// spec-to-HyperFrames converter: the spec is validated and summarized, the visuals are drawn by the agent.
import { resolveSpec, validateSpec } from "./spec.mjs";
import { getTemplate } from "./templates.mjs";
import { resolveCaptionLook } from "./captions.mjs";
import { computeTimeline, countWords } from "./timeline.mjs";

/** The retention rules every video follows (00-docs/platform-specs-and-retention.md and prompts/spec-writer.md). */
export const RETENTION_RULES = [
  "Hook in the first 3 seconds: the payoff or a bold claim, spoken and on screen together; no intro, no logo.",
  "A pattern interrupt every 2-4 seconds (cut, punch-in 110-120%, new visual, text pop, SFX); one idea per scene.",
  "Text and faces inside the center 900x1300 safe box; captions at about 55-70% of the frame height.",
  "Captions: 1-4 words per chunk, bold sans-serif, the active word in the accent color.",
  "Audio normalized to -14 LUFS; exactly one CTA, in the last scene; the last line can loop back to the first.",
  "No emoji drawn on screen; record the source and license of every third-party asset.",
];

export const ROUTE_STEPS = [
  "From the repo root run `source ./env.sh`, then `npx --yes hyperframes init hyperframes-studio` (or `05-tools/install.sh hyperframes`) once; the CLI and its skills (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`) are already vendored under .claude/skills.",
  "Load the `hyperframes` skill, create one composition at 1080x1920, 30 fps, whose scenes and durations follow `scenes[]` below, with the palette, font and caption style of this brief.",
  "Draw every item of `scenes[].draw` yourself (HyperFrames takes HTML/CSS/SVG and GSAP, not the engine's element vocabulary), and keep the narration audio as the timing source.",
  "Gate with `npx hyperframes lint` while writing and `npx hyperframes check --json` before rendering (fix every error); look at `npx hyperframes snapshot` PNGs.",
  "Render with `npx hyperframes render --quality looks -o out.mp4`, then check the duration and the safe box, and finish with the usual cover, post copy and `06-exports/` steps.",
];

const clip = (s, n = 60) => (String(s).length > n ? `${String(s).slice(0, n - 1)}...` : String(s));

/** Short descriptions of what a scene's visual draws (the list the agent must produce). */
export function drawList(scene) {
  const v = scene.visual ?? {};
  const out = [];
  if (v.type === "image" || v.type === "video") out.push(`${v.type}: ${v.src ?? "(no file yet: source one with a recorded license)"}`);
  else if (v.type === "emoji") out.push("hero symbol (draw it as an icon or SVG, no emoji on screen)");
  else if (v.type === "drawing") out.push(`drawing: ${(v.shapes ?? v.elements ?? []).length} shapes${v.concept ? ` (${clip(v.concept)})` : ""}`);
  else if (v.type === "scene3d") out.push(`3D scene: ${(v.objects ?? []).map((o) => o.kind + (o.label ? ` "${o.label}"` : "")).join(", ") || "stage"} (flatten to a 2D illustration or an isometric SVG)`);
  else if (v.type === "pixel") out.push("pixel-art scene (draw it with CSS box-shadow pixels or a canvas)");
  for (const e of v.elements ?? []) {
    const bits = [e.type, e.kind, e.label ?? e.text ?? e.value, e.icon].filter(Boolean);
    out.push(clip(bits.join(" ")));
  }
  if (scene.title?.main) out.push(`headline: ${clip(scene.title.main)}${scene.title.kicker ? ` (kicker: ${clip(scene.title.kicker, 30)})` : ""}`);
  if (scene.onScreenText) out.push(`on-screen text: ${clip(scene.onScreenText)}`);
  if (!out.length) out.push("a scene visual that carries the narration idea (one idea, one image)");
  return out;
}

/**
 * Validate a raw spec and build the brief.
 * @param {object} raw spec JSON
 * @param {{audioSecs?: (number | null)[]}} [opts] audioSecs: measured narration length per scene (timings then follow the timeline planner with real audio); omitted: text-timed
 * @returns {{ok: true, brief: object} | {ok: false, errors: {path: string, message: string}[]}}
 */
export function buildBrief(raw, { audioSecs } = {}) {
  const v = validateSpec(raw);
  if (!v.ok) return { ok: false, errors: v.errors };
  const spec = resolveSpec(v.spec, getTemplate(v.spec.template));
  const fps = spec.format.fps;
  const audio = Array.isArray(audioSecs) && audioSecs.length === spec.scenes.length;
  const timeline = computeTimeline(
    spec.scenes.map((s, i) => ({ audioSec: audio ? audioSecs[i] : null, durationSec: s.durationSec, narration: s.narration })),
    { fps },
  );
  let at = 0;
  const scenes = spec.scenes.map((s, i) => {
    const t = timeline.scenes[i];
    const last = i === spec.scenes.length - 1;
    const sec = (t.durationInFrames - (last ? 0 : timeline.transitionFrames)) / fps;
    const row = { index: i + 1, id: s.id, startSec: Number(at.toFixed(2)), durationSec: Number(sec.toFixed(2)), narration: s.narration, words: countWords(s.narration), speechStartSec: Number((t.speechStartMs / 1000).toFixed(2)), speechSec: Number(t.speechSec.toFixed(2)), visualType: s.visual?.type ?? null, draw: drawList(s) };
    at += sec;
    return row;
  });
  const cap = resolveCaptionLook(spec, { top: 1130, height: 260 });
  return {
    ok: true,
    brief: {
      title: spec.title,
      language: spec.language,
      template: spec.template,
      format: { width: spec.format.width, height: spec.format.height, fps, safeBox: { width: 900, height: 1300, note: "centered, slightly high" } },
      totalSec: Number((timeline.totalFrames / fps).toFixed(2)),
      timing: audio ? "timeline planner with measured narration audio" : "text-timed (no audio yet): speech estimated at 0.3 s per word; re-run with --audio-secs once the narration exists",
      palette: spec.theme.palette,
      font: spec.theme.font,
      captions: { enabled: spec.captions.enabled, style: cap.style, size: cap.size, wordsPerPage: spec.captions.wordsPerPage, band: cap.band, colors: cap.colors },
      voice: { provider: spec.voice.provider, voiceId: spec.voice.voiceId ?? null, speed: spec.voice.speed ?? 1 },
      music: { provider: spec.music.provider ?? null, mood: spec.music.mood ?? null, volume: spec.music.volume },
      scenes,
      retentionRules: RETENTION_RULES,
      route: ROUTE_STEPS,
    },
  };
}

/** The brief as markdown (what `hyperframes-brief` prints by default). */
export function briefMarkdown(b) {
  const L = [];
  L.push(`# HyperFrames brief: ${b.title}`, "");
  L.push(`- Template: ${b.template} (language ${b.language}); canvas ${b.format.width}x${b.format.height} at ${b.format.fps} fps; total ${b.totalSec} s`);
  L.push(`- Timing: ${b.timing}`);
  L.push(`- Safe box: ${b.format.safeBox.width}x${b.format.safeBox.height} (${b.format.safeBox.note})`);
  L.push(`- Palette (after contrast adaptation): bg ${b.palette.bg.join(" -> ")}, text ${b.palette.text}, accent ${b.palette.accent}${b.palette.accent2 ? `, accent2 ${b.palette.accent2}` : ""}${b.palette.accent3 ? `, accent3 ${b.palette.accent3}` : ""}; font ${b.font}`);
  L.push(`- Captions: ${b.captions.enabled ? `${b.captions.style}, size ${b.captions.size}, ${b.captions.wordsPerPage} words per page, band y ${b.captions.band.top}-${b.captions.band.top + b.captions.band.height}; words ${b.captions.colors.text}, active ${b.captions.colors.highlight}, outline ${b.captions.colors.outline}` : "off"}`);
  L.push(`- Voice: ${b.voice.provider}${b.voice.voiceId ? ` (${b.voice.voiceId})` : ""}; music: ${b.music.provider ?? "none"}${b.music.mood ? ` (${b.music.mood})` : ""} at ${b.music.volume}`, "");
  L.push("## Scenes", "");
  for (const s of b.scenes) {
    L.push(`### ${s.index}. ${s.id} (${s.startSec} s, ${s.durationSec} s)`, "", `Narration: ${s.narration}`, "", "Draw:");
    for (const d of s.draw) L.push(`- ${d}`);
    L.push("");
  }
  L.push("## Retention rules", "", ...b.retentionRules.map((r) => `- ${r}`), "", "## Route", "", ...b.route.map((r, i) => `${i + 1}. ${r}`), "");
  return L.join("\n");
}
