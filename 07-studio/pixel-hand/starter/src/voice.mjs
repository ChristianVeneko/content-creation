/* voice.mjs - ElevenLabs narration via the engine tts lib -> assets/voz.wav (tightened, mono 48k). Run after `source ./env.sh`. */
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(HERE, '..', '..');
const { synthesize, DEFAULT_VOICE_ID } = await import(join(ROOT, '07-studio/engine/lib/tts.mjs'));
const { normalizeSpeech } = await import(join(ROOT, '07-studio/engine/lib/media.mjs'));
const text = readFileSync(join(HERE, 'voz.txt'), 'utf8').replace(/\s*\n\s*/g, ' ').trim();
const tmp = process.env.BESPOKE_TMP || '/private/tmp/bespoke-tts';
mkdirSync(tmp, { recursive: true }); mkdirSync(join(HERE, 'assets'), { recursive: true });
const [raw] = await synthesize({ provider: 'elevenlabs', texts: [text], language: 'es', voiceId: DEFAULT_VOICE_ID, speed: 1, dir: tmp });
copyFileSync(raw, join(HERE, 'assets', 'voz-raw.mp3'));
const d = await normalizeSpeech(raw, join(HERE, 'assets', 'voz.wav'), { tighten: true });
console.log('voice ok', d.toFixed(2) + 's');
