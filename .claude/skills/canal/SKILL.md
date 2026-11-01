---
name: canal
description: "Trigger: /canal, canal, crear canal, mis canales, estado del canal, plan de la semana, ideas de videos, marcar publicado. Create and manage content channels from the terminal."
license: MIT
metadata:
  author: "content-creation"
  version: "1.0"
---

## Activation Contract

Use for anything about channels (`08-channels/<slug>/`) and the content stage of videos: create a channel, show its status, move a video's stage, plan a week of ideas. Making a video is `/video`.

## Hard Rules

- Every command starts with `source ./env.sh && J=.claude/skills/canal/jobs.mjs`, run from the repo root (the folder that holds `env.sh`).
- Contract: `08-channels/README.md` (read its field table only if unsure). Read only `channel.json` + `voice.md` of the channel in play; never scan `04-projects` by hand, use `$J`.
- Talk in the user's language (Spanish by default). Questions via `AskUserQuestion`, max 4 per round, recommended option first marked "(Recomendado)".
- Never invent metrics, results, handles or facts about the user. Unknown → ask or leave it out; mark agent-written drafts with the `<!-- BORRADOR ... -->` comment.
- No social-network connections or uploads. Nothing here publishes.

## Decision Gates

| User wants | Do |
|------------|----|
| No channel exists, or "crear canal" | Create (below) |
| "estado", "cómo va", no args with channels | `node $J status` (all) or `node $J status <slug>` (list) |
| Mark a video draft/ready/published | `node $J set <id> stage=<stage> [links=url1,url2]` (published stamps `publishedAt`) |
| Assign a video to a channel | `node $J set <id> channel=<slug>` |
| "plan de la semana", "ideas" | Plan (below) |
| Unsure which channel | `node $J channels`; ask if more than one |

## Create

1. Round 1 (identidad): Nombre; Handle; Plataformas (multi: YouTube Shorts, TikTok, Instagram Reels); Idioma. Offer brand assets found in `03-assets/brand/<slug>/` (read its README only for colors/handle).
2. Round 2 (audiencia y nicho): Nicho (one sentence); A quién le hablas (one concrete person); 3-4 pilares; Plantilla por defecto (the 3 whose "best for" column fits the niche in `node 07-studio/engine/cli.mjs templates --brief`, 5 KB, English).
3. Round 3 (voz): "Escríbeme el voice.md a partir de 3 guiones o videos míos (Recomendado)" → ask for paths/text; transcribe videos with `02-scripts/transcribe.sh <file>`; infer how they talk, their tics, words they avoid. / "Responder preguntas" → tono, palabras que usa, palabras que nunca usa, lo que no afirma, CTA. / "Lo escribo yo después" → copy the template.
4. Write `08-channels/<slug>/channel.json` (slug `a-z0-9-`, `version: 1`, `createdAt` now, defaults from the answers, `palette: null` unless chosen) and `voice.md` with the `08-channels/_template/voice.md` headings. Validate: `node $J channels` lists it.
5. Close with one line: the channel is ready; `/video` will use it.

## Plan a week

1. Ask: how many videos this week (default 3: one anchor, one cheap from existing material, one quick tip) and what is already half-made (`node $J status <slug>`, existing `idea` jobs come first).
2. Propose one idea per slot from the channel's pillars: working title, the one sentence it promises, pillar, suggested template. Score each title with `python3 .claude/skills/hooks/title.py --title "<title>"` and fix `vague`/`no-number`. Never invent figures.
3. Show a table (día · título · promesa · pilar · plantilla), ask "Guardar ideas (Recomendado)" / "Cambiar".
4. Save each: `node $J new "<title>" --channel <slug> --stage idea --notes "<promise · pillar · template>"`. They appear in the web dashboard and `/video` can fill them.

## Output Contract

Short: what changed (files or job ids), the channel status line, and the next step (`/video <idea id>`).

## References

- `08-channels/README.md`: contract. `.claude/skills/hooks/THIRD_PARTY.md`: week shape and voice sections adapted from youtube-agent-skill (MIT).
