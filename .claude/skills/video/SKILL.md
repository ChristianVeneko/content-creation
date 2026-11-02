---
name: video
description: Make a vertical short video (Instagram Reels, TikTok, YouTube Shorts) end to end with a guided onboarding, using the user's Claude Code subscription (no LLM API keys). Trigger when the user says "/video", "hazme un video", "haz un video", "quiero un reel/tiktok/short", "make me a video", or asks to turn an idea, text, footage, or project into a short video.
---

# /video — guided short-video creation

You are the producer and the spec writer: the user's Claude Code subscription is the LLM, nothing calls the Anthropic/OpenAI/Gemini APIs. Talk in the user's language (Spanish by default), short messages, few clear questions, smart defaults, a visible plan, then a finished video.

Run everything from the repo root (the folder that holds `env.sh`); every shell command starts with `source ./env.sh &&`. Never install globally or into `~`. Shorthands (set them in each command): `J=.claude/skills/canal/jobs.mjs`, `H=.claude/skills/hooks`.

**Token budget.** Read only what a step names. Never read whole: `07-studio/engine/README.md`, `00-docs/template-styles.md`, `07-studio/engine/prompts/spec-writer.md`, full `templates` JSON. Use the lean commands and section extracts below. Platform rules are in Rules at the end; do not reread the playbook.

## 0. Channel and context

1. `node $J channels`. Use a channel only if the user named it in this request. Otherwise ALWAYS ask, even with a single channel: `AskUserQuestion` (header "Canal"): "Sin canal (Recomendado)" first, then one option per channel. Never infer the channel from the topic or from earlier videos. None exist → continue without a channel (mention `/canal` in one line).
   Without a channel: no `brand` (no handle, no avatar watermark), no channel defaults, `node $J new` without `--channel`. `brand.handle`/`brand.avatar` come only from the chosen channel's `channel.json`.
2. With a channel, read only `08-channels/<slug>/channel.json` and `voice.md`. Its `defaults` pre-answer onboarding (format/template, palette, voice, captions, music, duration, tone); `language`, `audience` and `voice.md` steer the script; never break a "no afirmo" or banned word.
3. Formats: `node 07-studio/engine/cli.mjs templates --brief` (id, category, format, name, best for). If it fails, say so in one line and offer §5 HyperFrames.

## 1. Capture the idea

Take the topic from the message; if none, ask "¿De qué trata el video?" and wait. Detect given inputs (file path, URL, project folder, script). An existing idea (`/video <id>` or a title listed by `node $J status <slug>` with stage `idea`) → reuse that folder; its `notes` hold the promise. Do not re-ask anything known.

## 2. Onboarding: format first (AskUserQuestion, max 3 rounds)

Group up to 4 questions per call (AskUserQuestion allows at most 4 options per question); skip any answered, irrelevant, or fixed by the channel defaults (say in one line which defaults apply: "Uso los ajustes de <canal>: reels-noche, voz ElevenLabs en tendencia, 1 min"). Recommended first, marked "(Recomendado)", and each default explained in one short line. "tú decide" / "lo que veas" → take every default and continue. Order of decisions: the idea (§1), then what it looks like and how it moves, then colors, then voice, tone, captions and music, then length.

**Round 1: route, format and length**
1. Tipo (skip unless the request is ambiguous): "Plantilla rápida (Recomendado)" (engine) / "Motion graphics a medida" (HyperFrames) / "Animación en código estilo Opus" (`05-tools/repos/awesome-opus5-5-videos/prompts/`) / "Lanzamiento de un proyecto" (`/brag`). Only the first continues below; the others skip to §3 and ask nothing about formats.
2. "¿Cómo quieres que se vea y se mueva?" Templates are FORMATS, not fixed scenery. Build the options dynamically from `node 07-studio/engine/cli.mjs templates --brief` (columns: id, category, format, name, best for), never from a hard-coded list:
   - Group by family: explicativo/tutorial, datos y gráficas, historia/cinematográfico, ranking/versus, producto/escaparate, pixel/arcade, mundos 3D (the 3D templates are STYLES). Infer the family from `category`, the `format` slug and the best-for line.
   - Rank by fit with the idea: a channel template or a theme's `templates` first (`grep -n -A8 'id: "<theme>"' 07-studio/engine/lib/themes.mjs`; themes: tecnologia-ia, programacion, ingenieria, finanzas, salud-fitness, cocina, viajes, educacion, noticias, motivacion, ciencia, gaming, negocios-marketing), then the best-for match.
   - Offer at most 4 options: the best fit "(Recomendado)" with its one-line look ("<format>: <how it looks and moves>"), then the best fits from three different families. Last option "Ver más formatos": re-ask with the next 4 (other families first), or "Otro" lets the user type a format or template id. Kinetic classics (`captions-voice`, `kinetic-type`, `countdown`, `glass-cards`, `letterbox`) only if the user types one.
   - Say once, when a 3D format is in play: "Las plantillas 3D solo fijan el estilo (cámara, luz, materiales, movimiento): yo construyo los modelos desde cero y pruebo varias tomas de cámara por escena." Pixel adds a `character` only if asked.
3. Plataforma: "Las 3 (Recomendado)" / Reels / TikTok / Shorts (skip if the channel lists platforms).
4. Duración: "30 s (Recomendado)" / "1 min" / "2 min" / "Otra" (typed: 15 s, 45 s, 1,5 min, 2,5 min or 3 min). Allowed totals: 15, 30, 45, 60, 90, 120, 150, 180 s (max 3 min). Short videos 15-45 s; from 90 s on plan MORE scenes of 3-6 s, never longer ones, and keep a turn or open loop every 2-4 s. The channel's `defaults.durationSec` pre-answers it.

**Round 2: colors**
Paleta, with the rule "good contrast always" (text >= 4.5:1 against the background, illustration accents >= 3:1; never trade readability for mood): "La del formato (Recomendado)" (the template default, already tuned) / "Una paleta que contraste" (one preset chosen to fit: `grep -o 'id: "[a-z-]*"' 07-studio/engine/lib/palettes.mjs`; say its name and why in one line) / "Mis colores" (channel `brand.colors` first, then colors typed in chat). Check any custom pair with the contrast rule before writing it; if a color fails, say so in one line and propose the nearest readable one. Write `theme.palette` {bg:[a,b], text, accent, accent2?, accent3?} only when it differs from the template's.

**Round 3: voice, tone, captions, music (one call, 4 questions)**
1. Voz: with `grep -c '^ELEVENLABS_API_KEY=.\+' .env` = 1: "ElevenLabs, voz latina en tendencia (Recomendado)" → `voice: {provider: "elevenlabs"}` with no `voiceId`: the build picks one of the 5 most trending Latin American Spanish male voices, stable per title (`node 07-studio/engine/cli.mjs voices --pick "<title>"` shows which; `voices` lists them with `previewUrl` if the user wants to choose one) / "Kokoro local, gratis" (`ef_dora`, `em_alex`, `em_santa`) / "Sin voz, solo texto". Without the key Kokoro is the recommended one.
2. Tono: 4 tones that fit the topic (channel `tone` first).
3. Subtítulos: "Los del formato (Recomendado)" → omit `captions.style` / "Hormozi" → `hormozi` / "Fichas, karaoke o limpios" → ask which / "Otro" → `clean boxed pills chips two-tone karaoke punch typewriter dialog neon underline minimal pixel`. Optional `captions.size` (s m l xl), `captions.position` (top upper center lower bottom), `captions.uppercase`. Colors: automatic from the palette (default, write no colors); only if the user names caption colors, ask them in chat and set just those fields of `captions.colors` {text, highlight, box, outline}. Reels: `reels.subtitles` linea|bloque|no; reels and pixel honor only text/highlight. Never move captions onto the headline of illustrated/3D templates.
4. Música: "Biblioteca, estilo automático (Recomendado)" → `music: {provider: "library", mood: "auto"}` / "Elegir estilo" (tech-lofi, cinematic-epic, tense-mystery, inspiring-uplifting, minimal-ambient, upbeat-fun, corporate-happy; tracks via `node 07-studio/engine/cli.mjs music`) / "ElevenLabs Music (gasta créditos)" only with the key → `{provider: "elevenlabs", prompt?}` / "Sin música" → `{provider: "none"}`. Levels: `music.volume` 0.12 ≈ 13 dB under the voice, ducks 9 dB under speech; `sfx.volume` 1 ≈ 12 dB under. Library credits go to `post.md` automatically.

Visuals default to animated backgrounds (no keys). Ask about stock Pexels/Pixabay (only with a key in `.env`), the user's own clips or images (path in chat) or AI generation (Higgsfield or fal, only if available; costs credits) only when the request mentions footage, images or AI, and fold that question into round 3 in place of the least relevant one.

## 3. Plan → approval

1. Project: reuse the idea folder, else `P=04-projects/$(node $J new "<title>" --channel <slug> --template <id>)` (drop `--channel` without one; it writes `job.json` with stage `draft` and copies `brief.md`). For an idea: `node $J set <id> stage=draft template=<id>`.
2. Hook: follow `/hooks` steps 1-3 (5 hooks to `$P/hooks.txt`, `python3 $H/hookscore.py $P/hooks.txt`, rewrite WEAK once). The winner opens scene 1.
3. Spec rules: `node 07-studio/engine/cli.mjs template <id>` (one entry) and `node 07-studio/engine/cli.mjs prompt <id> --creative` (spec-writer trimmed to the family; `--creative` adds that family's "Creative mode" section: you are on the subscription, so design originals). Every family: draw the video's own subjects for this topic (pixel sprites and sets, 3D `custom` models, 2D `drawing`s in illustrated/classic, reels `dibujo` scenes and drawn icons), never only rearrange presets; animate them on narration words and add fx; load the skills you need first (3D: `.claude/skills/threejs-geometry`, `threejs-materials`, `threejs-animation`; read only the parts you use). Style notes, only if the template has a section: `awk -v id=<id> '$0 ~ "^##+ "id"( |$)"{f=1;print;next} /^#+ /{f=0} f' 00-docs/template-styles.md`. 3D vocabulary beyond the prompt: `grep -n -i '<object>' 00-docs/3d-resources.md`.
4. Write the VideoSpec to `$P/spec.json`, apply channel defaults and voice, then `node 07-studio/engine/cli.mjs validate $P/spec.json`; fix until valid.
   Review loop before the storyboard (max 2 rounds), no TTS: pixel `node 07-studio/engine/lib/pixel-stills.mjs $P/spec.json $P/.stills --sheet`; illustrated/classic `node 07-studio/engine/lib/illustrated-stills.mjs $P/spec.json $P/.stills --sheet`; reels `node 07-studio/engine/lib/reels-stills.mjs $P/spec.json $P/.stills --sheet`; 3D: a voice-none draft build (`cp $P/spec.json $P/.draft.json`, set `voice.provider` "none", build to `$P/.draft`, `ffmpeg -i $P/.draft/video.mp4 -vf fps=1,scale=270:-1,tile=6x3 -frames:v 1 $P/.stills/sheet.png`). Read the sheet; fix sprites/models that read badly, empty or static scenes, offscreen elements, effects that hide text. Delete `$P/.stills` and `$P/.draft*` afterwards.
5. Title/cover: `python3 $H/title.py --title "<title>" --cover "<cover headline>"`; fix `duplicate`, `cover-length`, `vague`.
6. Storyboard, compact: hook (with its score), table `# | s | narración | texto en pantalla | visual`, total duration, voice, template, post caption preview. `AskUserQuestion` (header "Storyboard"): "Renderizar (Recomendado)" / "Cambiar el hook" / "Ajustar escenas" / "Otro estilo". Loop at most twice.

## 4. Render and deliver

1. In the background: `02-scripts/keepawake.sh node 07-studio/engine/cli.mjs build $P/spec.json --out $P --json-logs` (output lands in the project root, where the web dashboard looks). Relay progress briefly (tts → captions → render → cover). On error read the JSON error line, fix once, retry once, then report the blocker.
2. Verify: `ffprobe` shows 1080x1920 with audio (unless voice none); extract 2 frames and look. Reels templates: `node 02-scripts/rhythm-check.mjs $P/video.mp4`, fix gaps over 0.6 s; check `$P/cover-check.png`. Text outside the safe zone, unreadable, or a weak hook frame → fix and re-render once.
3. `node $J set <id> status=done stage=ready`.
4. Export: `02-scripts/export-platforms.sh $P/video.mp4 <slug>` (→ `06-exports/{reels,tiktok,shorts}/`). Append a row to `00-docs/content-log.csv` (date, platform, title, format, hook, length_s; metrics empty). If the file is missing, create it first with the header `date,platform,title,format,hook,length_s,views,retention_3s_pct,avg_viewed_pct,sends,saves,notes`.
5. Final message: video and cover paths, per-platform post copy from `post.md`, one A/B hook variant (the runner-up from `hooks.txt`), and "márcalo publicado con /canal cuando lo subas".

## 5. Other routes

- **Motion graphics / estilo Opus**: load the `hyperframes` skill; for Opus prompts grep `05-tools/repos/awesome-opus5-5-videos/prompts/` for the closest match, adapt to 1080x1920. Output `$P/video.mp4`, then 4.2-4.5.
- **Lanzamiento**: `/brag` (or `brag-slim`) with `--format vertical`; copy `brag.mp4` to `$P/video.mp4`, then 4.3-4.5.
- **Clip de video largo**: `02-scripts/transcribe.sh`; pick 20-55 s spans that open on a complete thought, have a turn and end on a line (`01-prompts/05-repurpose-long-video.md`); write a NEW first line and score it with `$H/hookscore.py`; cut with ffmpeg, reframe with `02-scripts/to-vertical.sh` or `blur-pad-vertical.sh`, captions via `02-scripts/karaoke-ass.py` + `burn-captions.sh`.

Every route creates the project with `node $J new` so the video shows up in the channel.

## Quality bar (illustrated-kit templates)

The user rejected "gradient + emoji" output. With `illustrated`: every scene gets a two-tone `title` and an `illustration` with 2-5 drawn elements that literally depict the idea (compare/split, flow/timeline, doc/checklist, code/terminal, bars/counter, `svg` paths, callouts), a HUD that tracks the story, 8-14 scenes per 60 s, no emoji. SFX and music on by default; credit "Music: ende.app". No mascot unless asked. Benchmark: `00-docs/benchmark-sebastiankra-vs-engine.md`.

## Rules

- Hook in the first 3 s, a visual change every 2-4 s, text inside the center 900x1300 safe box, audio -14 LUFS, one CTA.
- Record every third-party asset's source and license in `$P/brief.md`. No GIPHY/KLIPY GIFs in monetized videos.
- Never invent figures or sources; respect the channel's `voice.md`.
- Never print or commit API keys. ElevenLabs voice is the default when the key exists; never use other paid generation (ElevenLabs Music, Higgsfield, fal) unless the user chose it.
