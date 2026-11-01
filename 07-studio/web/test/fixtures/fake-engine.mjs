#!/usr/bin/env node
// Minimal stand-in for 07-studio/engine/cli.mjs used by tests and UI previews.
// Implements the documented contract: templates · validate <spec> · build <spec> --out <dir> --json-logs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const [cmd, ...args] = process.argv.slice(2);
const TEMPLATES = [
  { id: "captions-voice", preview: { name: "Voz + subtítulos", description: "Voz en off con subtítulos cinéticos sobre fondo o b-roll.", emoji: "🎙️", gradient: ["#2b0f4c", "#7F00FF", "#ff5e62"], accent: "#FFE600", sample_text: "ESTO LO CAMBIA TODO" }, prompt_hint: "voiceover" },
  { id: "kinetic-type", preview: { name: "Tipografía cinética", description: "Texto grande y animado, sin b-roll.", emoji: "🔠", gradient: ["#0f2027", "#2c5364"] }, prompt_hint: "bold text" },
  { id: "countdown", preview: { name: "Lista numerada", description: "Top 3, top 5: un ítem por escena.", emoji: "🔢", gradient: ["#3a1c71", "#ffaf7b"] }, prompt_hint: "numbered" },
  { id: "glass-cards", preview: { name: "Tarjetas explicativas", description: "Una idea por tarjeta con icono o emoji.", emoji: "🧠", gradient: ["#134e5e", "#71b280"] }, prompt_hint: "cards" },
  { id: "letterbox", preview: { name: "Historia / cita", description: "Storytime o cita, ritmo cinematográfico.", emoji: "🎞️", gradient: ["#200122", "#6f0000"] }, prompt_hint: "story" },
];

const MUSIC = {
  moods: [
    { id: "tech-lofi", label: "Tech / lo-fi", count: 1 },
    { id: "upbeat-fun", label: "Alegre / divertido", count: 1 },
  ],
  tracks: [
    { id: "fake-lofi", mood: "tech-lofi", title: "Fake Lofi", artist: "Tester", file: "tech-lofi/fake-lofi.mp3", durationSec: 90, bpm: 80, license: "CC BY 4.0", credit: "Fake Lofi by Tester (CC BY 4.0)" },
    { id: "escape", mood: "upbeat-fun", title: "Escape", artist: "Tester", file: "../secret.mp3", durationSec: 90, bpm: 80, license: "CC BY 4.0", credit: "x" },
  ],
  levels: { music: { volume: 0.12, underVoiceDb: 13 } },
};

const VOICES = [
  { voiceId: "voiceA1", name: "Diego - Neutral", accent: "latin american", locale: "es-AR", gender: "male", useCase: "narrative_story", description: "d", previewUrl: "https://storage.googleapis.com/eleven-public-prod/a.mp3", uses7d: 10 },
  { voiceId: "voiceB2", name: "Evil", accent: "mexican", locale: "es-MX", gender: "male", useCase: "social_media", description: "d", previewUrl: "https://evil.example.com/b.mp3", uses7d: 5 },
];

if (cmd === "voices") {
  process.stdout.write(JSON.stringify(process.env.ELEVENLABS_API_KEY ? { available: true, voices: VOICES } : { available: false, reason: "ELEVENLABS_API_KEY is not set", voices: [] }));
} else if (cmd === "music") {
  process.stdout.write(JSON.stringify(MUSIC));
} else if (cmd === "templates") {
  process.stdout.write(JSON.stringify(TEMPLATES));
} else if (cmd === "validate") {
  const spec = JSON.parse(readFileSync(args[0], "utf8"));
  const errors = [];
  if (spec.version !== 1) errors.push({ path: "version", message: "must be 1" });
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) errors.push({ path: "scenes", message: "must be a non-empty array" });
  if (errors.length) {
    process.stdout.write(JSON.stringify({ ok: false, errors }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ ok: true }));
} else if (cmd === "build") {
  const out = args[args.indexOf("--out") + 1];
  mkdirSync(out, { recursive: true });
  const steps = ["tts", "captions", "render", "cover"];
  const delay = Number(process.env.FAKE_ENGINE_DELAY_MS ?? 0);
  for (const [i, step] of steps.entries()) {
    console.log(JSON.stringify({ step, status: "start", message: `${step}…`, progress: i / steps.length }));
    if (delay) await new Promise((r) => setTimeout(r, delay));
    console.log(JSON.stringify({ step, status: "done", progress: (i + 1) / steps.length }));
  }
  if (process.env.FAKE_ENGINE_FAIL) {
    console.log(JSON.stringify({ step: "render", status: "error", message: "boom" }));
    process.exit(2);
  }
  writeFileSync(path.join(out, "video.mp4"), "fake");
  writeFileSync(path.join(out, "post.md"), "# Post\n");
} else {
  console.error(`unknown command ${cmd}`);
  process.exit(64);
}
