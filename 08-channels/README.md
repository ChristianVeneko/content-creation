# Channels

A channel is a folder `08-channels/<slug>/` that tells the agent who a video is for. Every video can belong to one channel; the web studio and the terminal skills (`/video`, `/canal`, `/hooks`) read the same two files. Nothing here connects to a social network: it only keeps content organized and gives the agent context.

## Quick path

1. Terminal: run `/canal` and pick "Crear canal" (or copy `_template/` to `08-channels/<slug>/` and fill it in). Web: the studio's channel wizard writes the same files.
2. Edit `voice.md` until it sounds like you.
3. Make videos with `/video` (or the studio); they are tagged with the channel and its defaults pre-answer the onboarding.

## Contract

| File | Content |
|------|---------|
| `channel.json` | Structured identity and defaults (fields below). |
| `voice.md` | Free markdown: who you talk to, how you talk, words to use and avoid, claims you will not make, format, CTA. |

`channel.json` fields:

| Field | Type | Notes |
|-------|------|-------|
| `version` | `1` | Contract version. |
| `slug` | string | Same as the folder name; lowercase, `a-z0-9-`. |
| `name`, `handle` | string | Display name and `@handle`. |
| `platforms` | `["youtube","tiktok","instagram"]` subset | Where it publishes. |
| `language` | string | Spec language, e.g. `es`. |
| `niche`, `audience` | string | One sentence each. |
| `pillars` | string[] | Recurring topics; ideas are planned per pillar. |
| `createdAt` | ISO date | |
| `defaults.template` | template id | `node 07-studio/engine/cli.mjs templates --brief`. |
| `defaults.palette` | preset id or `null` | `07-studio/engine/lib/palettes.mjs`; `null` = the template's palette. |
| `defaults.voiceProvider`, `defaults.voiceId` | `elevenlabs`/`kokoro`/`none`, voice id | ElevenLabs with `voiceId` null: the engine picks a trending Latin American Spanish male voice per video (`node 07-studio/engine/cli.mjs voices`). Kokoro Spanish: `ef_dora`, `em_alex`, `em_santa`. |
| `defaults.captionStyle` | caption style or `null` | `null` = the template's captions. |
| `defaults.musicMood` | mood id or `"auto"` | `node 07-studio/engine/cli.mjs music`. |
| `defaults.durationSec` | `15`, `30`, `45` or `60` | |
| `defaults.tone` | string | Spoken tone. |
| `brand.avatar`, `brand.colors` | path from the workspace root, hex[] | Brand files live in `03-assets/brand/<slug>/`. |

## Videos and stages

A video is `04-projects/<id>/`. Its `job.json` holds the optional channel fields:

| Field | Values |
|-------|--------|
| `channel` | channel slug |
| `stage` | `idea` (job.json only, no spec yet), `draft`, `ready`, `published` (set by hand) |
| `publishedAt`, `links` | optional, once published |

`stage` is the content stage; `status` (`draft`, `rendering`, `done`, `failed`) is the render state and is separate.

## Who reads what

- Web studio: lists channels with counts per stage, injects `channel.json` + `voice.md` into spec generation.
- `/video`: reads only `channel.json` and `voice.md`, applies the defaults, writes `channel` and `stage` to `job.json`.
- `/canal`: creates channels, shows status, moves stages, plans a week of `idea` jobs.
