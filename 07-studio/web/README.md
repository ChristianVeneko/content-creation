# Video Studio (web)

A local web app that turns one prompt into a vertical short video (Reels, TikTok, Shorts).
You write the idea, pick a template, and an LLM writes the script. You edit the scenes,
then the engine (`../engine/cli.mjs`) renders the MP4, the cover and the post copy.

## Run it

```bash
source ./env.sh   # from the repo root, always: keeps caches and temp files inside the repo
cd 07-studio/web
npm install                                      # first time only

npm run dev     # API on 127.0.0.1:4317 + UI on http://127.0.0.1:5173 (proxies /api)
# or
npm run build && npm start                       # one server on http://127.0.0.1:4317 serving the built UI
```

Both servers bind to `127.0.0.1` only. Requires Node 24 (the server runs TypeScript natively, with no build step).

## Providers

The **"Quién escribe el guion"** selector shows four providers. The server reports whether each one
is available; it never sends key values to the browser.

| Provider | Needs | Default model (override) |
| --- | --- | --- |
| Claude Code (suscripción) | the `claude` CLI logged in, with no API key | CLI default (`CLAUDE_CODE_MODEL`) |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-opus-5-5`, fast option `claude-sonnet-5-5` (`ANTHROPIC_MODEL`) |
| OpenAI | `OPENAI_API_KEY` | `gpt-5` (`OPENAI_MODEL`) |
| Gemini | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | `gemini-2.5-pro` (`GEMINI_MODEL`) |

Keys come from `<repo>/.env`. The server loads that file at startup, and values
already exported in the environment win.

The Claude Code provider runs:

```
claude -p "<request>" --output-format json --system-prompt "<spec-writer.md>" --tools "" \
  --no-session-persistence --safe-mode --strict-mcp-config --disable-slash-commands
```

It removes `ANTHROPIC_API_KEY` from the child environment, so the run uses your subscription and not the API.
`--safe-mode` and `--strict-mcp-config` skip your CLAUDE.md, skills, plugins and MCP servers; without them,
each call loads about 190k tokens of context. It runs in `$TMPDIR/video-studio-claude` and times out after
`CLAUDE_CODE_TIMEOUT_MS` (default 300000).

## How a video is made

1. `POST /api/spec`: the server combines the system prompt `../engine/prompts/spec-writer.md` with your prompt,
   the template's `prompt_hint` and your options, then calls the provider. It parses the JSON,
   enforces your choices (template, language, voice, caption style) and runs `node cli.mjs validate`.
   If the JSON is invalid or fails validation, the server retries **once**, sending the error back to the
   provider.
2. The server creates the job folder `04-projects/<YYYY-MM-DD>-<slug>/` with `spec.json` and `job.json`.
3. The storyboard lets you edit the title and, for each scene, the narration, the on-screen text and the visual.
   Saving runs `PUT /api/jobs/:id/spec`, which validates again.
4. `POST /api/jobs/:id/render` spawns `node cli.mjs build spec.json --out <job dir> --json-logs`. The UI follows
   progress over SSE (`GET /api/jobs/:id/events`).
5. The result page shows the player, the cover, the copy for each platform with copy buttons, the download
   link and the folder path. **Abrir carpeta** opens the folder in Finder.

### Music and sound effects

The **Música y efectos** block (in the Create options and at the top of the storyboard) controls `spec.music` and `spec.sfx`:

- **Con música / Sin música** (`music.provider: "none"` when off).
- **Biblioteca**: mood chips with **Automático** as the default (the engine picks the mood from the topic and tone and
  avoids the previous render's track), and, for a chosen mood, a track list with a play/pause preview.
- **ElevenLabs**: a track generated for this video (spends credits) with an optional prompt. Only enabled when the server
  has `ELEVENLABS_API_KEY`; the API reports availability, never the key. If generation fails, the engine uses the library.
- Sliders for music and SFX volume, labelled in dB under the voice (`0.12` = -13 dB, -22 dB while words are spoken).

API: `GET /api/music` (moods, tracks with license and credit, ElevenLabs availability; from `node cli.mjs music`) and
`GET /api/music/:id/preview` (range-capable MP3 stream; only ids listed in the engine's vetted `library.json`, served
from `STUDIO_MUSIC_DIR`, default `03-assets/music`).
`GET /api/voices` (trending Latin American Spanish male ElevenLabs voices from `node cli.mjs voices`, no keys or remote
URLs) and `GET /api/voices/:id/preview` (proxies only previews of listed voices hosted by ElevenLabs, as `audio/mpeg`).
In Create, ElevenLabs is the default voice; "Automática" leaves `voiceId` empty so the engine picks a trending voice.

### Captions

The **Subtítulos** panel (Create, step "Formato y subtítulos"; the storyboard; channel defaults in compact form) edits
`spec.captions` (contract: `shared/captions.ts`):

- **Estilo**: every style of the engine catalog (`hormozi`, `clean`, `boxed`, `pills`, `chips`, `two-tone`, `karaoke`,
  `punch`, `typewriter`, `dialog`, `neon`, `underline`, `minimal`, `pixel`) as a live card in the current palette's
  caption colors, plus an approximate 9:16 preview of the size and position. `captions.style` wins over
  `theme.captionStyle`; the panel keeps both in sync.
- **Tamaño** (`s`/`m`/`l`/`xl`), **Posición** (Auto or `top`/`upper`/`center`/`lower`/`bottom`), **Mayúsculas**
  (Auto, forced on or off: `uppercase`) and **Palabras por página** (Auto or 1-6). Auto choices write nothing, so the
  template and style keep their own.
- **Colores**: **Auto (paleta)** (default) writes no `colors`: the engine derives text, active word, box and outline from
  `theme.palette` (text, accent, darkest background stop). **Personalizado** writes all four of
  `captions.colors = { text, highlight, box, outline }` (hex), prefilled from the auto values; **Restablecer** goes back
  to Auto. The legacy `captions.accent` opens as custom and is dropped once you save from the panel.
- `reels-*` templates draw their own subtitles: the panel shows the mode (`spec.reels.subtitles`: `linea`, `bloque`,
  `no`) and the text / active-word colors instead of the style gallery. `pixel-*` templates have captions off by
  default; the panel explains it and can turn them on (`captions.enabled: true`).

`POST /api/spec` accepts `options.captions` (same fields), `options.reelsSubtitles` and any catalog `captionStyle`, and
rejects unknown styles or non-hex colors with 400. A channel's `defaults.captions` applies only when the request sends
no `options.captions` (the request's object replaces the channel's as a whole, so an explicit Auto stays Auto).

## Panel, channels and content stages

The UI has two sections in the top bar: **Panel** (home, `#/`) and **Crear** (`#/crear`).

- **Panel** lists every folder in `04-projects/` that has a `job.json` or a `spec.json` (including videos made
  with the CLI or the `/video` skill) as "Contenido reciente", filterable by channel and by stage, plus one card
  per channel with its avatar, counts per stage and latest cover. Quick actions: new video (optionally for a
  channel) and new idea. With no channels yet, the Panel opens a three-step wizard to create the first one
  (identity, audience and niche, voice); "Ahora no" skips it. The old `#/historial` link opens the Panel.
- **Channel page** (`#/canal/<slug>`): the channel's content grouped by stage (the stage is set with a select),
  the context editor (every `channel.json` field plus `voice.md`) and delete. `#/canales/nuevo` creates a channel.
- **Crear** has a channel selector at the top. Picking a channel prefills its defaults (template, palette, voice,
  captions, duration, tone, music mood); no channel is preselected (each video starts without one). `#/crear?canal=<slug>` preselects a
  channel and `#/crear?idea=<id>` starts from a saved idea.
- **Ideas** are job folders with only a `job.json` (title, notes, channel, stage `idea`). The video page of an
  idea offers "Generar guion", which opens Crear with the idea; the script is written into the same folder.
- Every video page shows its channel and stage (and, once published, its links) and lets you change them.

### Channels

A channel is a folder `08-channels/<slug>/` (override with `STUDIO_CHANNELS_DIR`) with `channel.json` and
`voice.md`, the contract shared with the terminal skills (see `08-channels/README.md`):

```json
{ "version": 1, "slug": "mi-canal", "name": "Mi Canal", "handle": "@micanal",
  "platforms": ["youtube","tiktok","instagram"], "language": "es", "niche": "...", "audience": "...",
  "pillars": ["..."], "createdAt": "ISO",
  "defaults": { "template": "reels-noche", "palette": "<preset id>|null", "voiceProvider": "kokoro", "voiceId": "em_alex",
                "captionStyle": null, "captions": { "size": "l", "colors": { "text": "#hex" } },
                "musicMood": "auto", "durationSec": 30, "tone": "..." },
  "brand": { "avatar": "03-assets/brand/mi-canal/avatar-800.png", "colors": ["#hex"] } }
```

Folders starting with `_` or `.` are ignored. Updates only change the fields sent and keep unknown fields.
`brand.avatar` is relative to the content-creation root and is only served from inside it (PNG, JPG, WebP, GIF).

**Agent context.** When `POST /api/spec` carries `channel`, the server appends a compact "Channel context" block
(name, handle, language, niche, audience, pillars, tone and `voice.md` cut to 2000 characters) to the **user**
prompt, so the per-template system prompt stays identical and cacheable. The channel defaults apply only to
options the request did not set; the template falls back to the channel's when none is sent. The job records
the channel.

### Content stages

`job.json` has optional `channel` (slug), `stage` (`idea` | `draft` | `ready` | `published`), `notes`,
`publishedAt` and `links`. Jobs created before stages existed are read as `ready` when `video.mp4` exists,
else `draft`; their `job.json` is not rewritten for that. A new script is `draft`; a successful render moves an
`idea` or `draft` to `ready`; marking a job `published` stamps `publishedAt` when it has none.

### API

| Route | What it does |
| --- | --- |
| `GET /api/channels` | Channels with counts per stage, `hasAvatar` and the latest cover (no `voice`) |
| `POST /api/channels` | Create (`name` required; slug from the name unless sent). 409 when it exists |
| `GET /api/channels/:slug` | One channel with `voice` (the `voice.md` text) |
| `PUT /api/channels/:slug` | Partial update; `voice` rewrites `voice.md`. The slug never changes |
| `DELETE /api/channels/:slug` | Removes the channel folder; 409 while any job points to it. Never deletes jobs |
| `GET /api/channels/:slug/avatar` | The brand avatar image, only from inside the workspace root |
| `POST /api/jobs` | Create an idea: `{ title, notes?, channel? }` |
| `PATCH /api/jobs/:id` | Set `title`, `notes`, `channel` (null clears), `stage`, `publishedAt`, `links` (http/https) |
| `POST /api/spec` | Also accepts `channel` and `jobId` (fill an idea; 409 if it already has a script) |

## Configuration

| Env var | Default |
| --- | --- |
| `STUDIO_PORT` | `4317` |
| `ENGINE_CLI` | `../engine/cli.mjs` (relative to this folder) |
| `STUDIO_PROJECTS_DIR` | `<repo>/04-projects` |
| `CLAUDE_BIN` | `claude` |
| `STUDIO_MUSIC_DIR` | `<repo>/03-assets/music` |
| `STUDIO_CHANNELS_DIR` | `<repo>/08-channels` |

## Tests

```bash
npm test          # node --test, TypeScript run natively by Node 24
npm run build     # typecheck (UI + server) and Vite build
```

The tests never call a real LLM or the real renderer. They cover:

- provider availability read from env, with no key leaks;
- parsing `claude -p` output from fixtures, the timeout, and the child env having no API key;
- the JSON log stream parser;
- spec generation, including the single retry after invalid JSON or a failed validation;
- the channel store, channel and job routes (stages, ideas, PATCH, delete guard, avatar confinement) and spec
  generation with and without a channel, against a scripted provider and temporary folders;
- the channel context builder and channel defaults (caption defaults included);
- the caption helpers in `shared/captions.ts` (auto palette colors, panel state to `spec.captions`, validation);
- an API integration test against `test/fixtures/fake-engine.mjs`, a stand-in that follows the documented
  engine contract.

## Layout

```
server/            Hono API (index.ts entry, app.ts routes, engine.ts CLI wrapper, jobs.ts store,
                   specGen.ts prompt + retry, jsonLogs.ts, providers/{anthropic,openai,gemini,claudeCode}.ts)
shared/types.ts    VideoSpec and API types shared by server and UI
shared/captions.ts caption catalog, validation and the caption panel state mapping
server/channels.ts, channelContext.ts   channel store (08-channels) and the agent context block
src/               React UI (views: Panel, ChannelView, ChannelWizard, Create, IdeaView, Storyboard,
                   RenderProgress, Result)
test/              node:test suites + fixtures
```

## Logs

- Console: one line per event (`HH:MM:SS.mmm LEVEL msg key=value`), colored on a TTY.
- File: JSON lines at `05-tools/cache/logs/studio.log` (inside the repo). Override with `STUDIO_LOG_FILE`.
- Level: `LOG_LEVEL=debug|info|warn|error` (default `info`; `debug` adds every HTTP request and render step).
- Events: `provider.ready` / `provider.unavailable` at startup, `spec.request` / `spec.ok` / `spec.failed` (provider, model, HTTP status, `requestId`, attempts, ms), `render.start` / `render.done` / `render.failed` (exit code, failing step, output tail), `http` (4xx warn, 5xx error).
- Secrets are redacted: any env value whose name contains KEY/TOKEN/SECRET/PASSWORD, plus Anthropic/OpenAI/ElevenLabs/Google key shapes and Bearer tokens.
- Follow it live: `tail -f 05-tools/cache/logs/studio.log` (from the repo root)
- Key sanity checks at startup: a provider is disabled with a clear reason when its key is missing, has the wrong prefix (Anthropic `sk-ant-`, OpenAI `sk-`), or has the same value as another service's key.
