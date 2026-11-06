// Text-to-speech: ElevenLabs (cloud, when provider=elevenlabs and ELEVENLABS_API_KEY is set) or Kokoro (local, mlx-audio).
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_ROOT, PYTHON } from "./env.mjs";

export const KOKORO_MODEL = "mlx-community/Kokoro-82M-bf16";
export const ELEVENLABS_MODEL = "eleven_multilingual_v2";
/** The app-wide default ElevenLabs voice (set by the user, 2026-11-03). Used whenever a spec names no voice. */
export const DEFAULT_VOICE_ID = "WFmom5vWeiir6CN1crV3";
export const ELEVENLABS_DEFAULT_VOICE = DEFAULT_VOICE_ID;

/** Kokoro lang codes and default voices by spec.language. */
const KOKORO_LANG = {
  es: { code: "e", voice: "ef_dora" },
  en: { code: "a", voice: "af_heart" },
  fr: { code: "f", voice: "ff_siwis" },
  it: { code: "i", voice: "if_sara" },
  pt: { code: "p", voice: "pf_dora" },
  hi: { code: "h", voice: "hf_alpha" },
  ja: { code: "j", voice: "jf_alpha" },
  zh: { code: "z", voice: "zf_xiaobei" },
};

export function kokoroVoice(language, voiceId) {
  const lang = KOKORO_LANG[(language || "es").slice(0, 2)] ?? KOKORO_LANG.es;
  const valid = voiceId && /^[a-z][fm]_[a-z]+$/.test(voiceId);
  return { langCode: lang.code, voice: valid ? voiceId : lang.voice };
}

/** Decide the effective provider: elevenlabs falls back to kokoro when no API key is configured. */
export function effectiveProvider(voice) {
  if (voice.provider === "elevenlabs" && !process.env.ELEVENLABS_API_KEY) return { provider: "kokoro", fallback: "ELEVENLABS_API_KEY is not set; using local Kokoro voice" };
  return { provider: voice.provider };
}

/**
 * Synthesize one raw audio file per text into `dir`. Returns the file paths (any format ffmpeg can read).
 * @param {(done: number, total: number) => void} onItem
 */
export async function synthesize({ provider, texts, language, voiceId, speed = 1, dir, onItem = () => {} }) {
  if (provider === "elevenlabs") return elevenlabs({ texts, voiceId, speed, dir, onItem });
  if (provider === "kokoro") return kokoro({ texts, language, voiceId, speed, dir, onItem });
  throw new Error(`Unsupported voice provider "${provider}"`);
}

async function elevenlabs({ texts, voiceId, speed, dir, onItem }) {
  const voice = voiceId && !/^[a-z][fm]_[a-z]+$/.test(voiceId) ? voiceId : DEFAULT_VOICE_ID;
  const files = [];
  for (let i = 0; i < texts.length; i++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: texts[i],
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: Math.min(1.2, Math.max(0.7, speed)) },
      }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`ElevenLabs TTS failed (${res.status}): ${body}`);
    }
    const file = join(dir, `scene-${i}.mp3`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    files.push(file);
    onItem(i + 1, texts.length);
  }
  return files;
}

function kokoro({ texts, language, voiceId, speed, dir, onItem }) {
  const { langCode, voice } = kokoroVoice(language, voiceId);
  const job = { model: KOKORO_MODEL, voice, speed, lang_code: langCode, items: texts.map((text, i) => ({ text, out: join(dir, `scene-${i}`) })) };
  return new Promise((resolve, reject) => {
    const p = spawn(PYTHON(), [join(ENGINE_ROOT, "scripts", "kokoro_batch.py")], { env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    const files = [];
    let buf = "";
    let stderr = "";
    p.stdout.on("data", (d) => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("{")) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.file) {
            files[msg.index] = msg.file;
            onItem(files.filter(Boolean).length, texts.length);
          }
        } catch {
          /* ignore non-JSON output from mlx-audio */
        }
      }
    });
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", (e) => reject(new Error(`Kokoro TTS could not start (${PYTHON()}): ${e.message}`)));
    p.on("close", (code) => {
      if (code === 0 && files.filter(Boolean).length === texts.length) resolve(files);
      else reject(new Error(`Kokoro TTS failed (exit ${code}): ${stderr.trim().split("\n").slice(-4).join(" | ")}`));
    });
    p.stdin.end(JSON.stringify(job));
  });
}
