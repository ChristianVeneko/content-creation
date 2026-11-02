---
name: lote
description: Overnight batch of short videos for one channel, unattended after one question round. Researches the channel's niche, plans N distinct ideas, then writes, reviews and renders each video and leaves it "listo" in the dashboard with title, description and hashtags. Never uploads. Trigger when the user says "/lote", "hazme un lote", "hazme N videos", "produce videos mientras duermo", "lote nocturno".
---

# /lote — overnight batch for one channel

You produce N finished videos for one channel while the user sleeps. Ask ONE round of questions at the start, then never ask again: decide with the defaults below and keep going. Talk in Spanish. Never upload or publish anything; the user reviews in the Panel and uploads by hand.

Run from the repo root (the folder that holds `env.sh`); every command starts with `source ./env.sh && `. Write commands with literal paths (no shell variables): the project allowlist in `.claude/settings.json` matches literal command prefixes, and a command that needs approval stalls the night.

## 0. One question round, then autonomy

1. `node .claude/skills/canal/jobs.mjs channels`. Resume first: if `04-projects/_lotes/` has a lote file for a channel with entries still `pendiente`, ask only "¿Retomo el lote <archivo>?" (Retomar (Recomendado) / Empezar uno nuevo).
2. One `AskUserQuestion` call, 4 questions:
   - "Canal": one option per channel (required; the channel gives the niche).
   - "Cantidad": "10 (Recomendado)" / "5" / "15" / "20".
   - "Temas": "Tendencias del nicho, investigo yo (Recomendado)" / "Te doy los temas" (then read them from chat and stop asking).
   - "Estilos": "Variado dentro de la línea del canal (Recomendado)" / "Solo la plantilla del canal".
3. Read `.claude/skills/video/SKILL.md` once (the per-video steps below point at its sections), then `08-channels/<slug>/channel.json` and `voice.md`. Voice for the whole lote: channel `voiceProvider` `elevenlabs` with an empty `voiceId` → `node 07-studio/engine/cli.mjs voices --pick "<YYYY-MM-DD>-<slug>"` once (a trending Latin American Spanish male voice) and put that `voiceId` in every spec of the lote, so the channel sounds the same; a set `voiceId` wins. Length of every video: the channel `defaults.durationSec` (any of 15, 30, 45, 60, 90, 120, 150, 180 s; max 3 min, longer means more 3-6 s scenes), else 30 s. Say in one line what will happen, which voice (name), and that you will not ask anything else.
4. Keep the computer awake for the whole run, in the background: `02-scripts/keepawake.sh -t 43200` (macOS `caffeinate`; on Linux/WSL it is a no-op, so tell the user once to disable sleep in their power settings).

## 1. Research and plan (state on disk)

1. `mkdir -p 04-projects/_lotes` and write `04-projects/_lotes/<YYYY-MM-DD>-<slug>.md`: channel, count, start time, and a table `# | título | plantilla | ángulo | estado | carpeta`. This file is the source of truth: update it after every video so a compaction, a crash or a usage-limit pause can resume from it.
2. Avoid repeats: `node .claude/skills/canal/jobs.mjs status <slug>` lists existing titles; no idea may cover the same point as one of them.
3. Research (topics mode "tendencias"): 3-5 `WebSearch` queries about the niche and pillars for the current month (news, releases, surveys, common questions). Keep only facts confirmed by an official or primary source; note each source for the description, never for the script. Rumors and unconfirmed launches are dropped.
4. Plan N ideas, each a different angle: mix the channel pillars, at most 2 news items, at least 1 "concepto explicado" and 1 practical tip per 5 videos. Pick a template per idea by format (tip/myth/comparison → reels; data → `editorial-chart`/`rank-numbers`; news → `broadcast`; code → `editor-window`; concept → `whiteboard`/`flat-depth`; story → `pixel-*`; "cómo funciona por dentro" → a 3D template). With "Variado": never the same template twice in a row and no template in more than 40% of the lote; the channel template leads. With "Solo la del canal": all use it.
5. Create each idea: `node .claude/skills/canal/jobs.mjs new "<título>" --channel <slug> --template <id> --stage idea --notes "<ángulo + datos confirmados + fuentes>"`. Record the folder in the lote table.

## 2. Each video, one after another

For entry i (skip entries already `listo`), follow `/video` with these overrides:
- §3.1: reuse the idea folder; `node .claude/skills/canal/jobs.mjs set <id> stage=draft`.
- §3.2 hook: 5 hooks, score them, rewrite WEAK once, take the best. Vary the hook formula across the lote.
- §3.3-3.4: creative mode spec (`prompt <id> --creative`), channel defaults, validate. Review loop: ONE round of stills; fix what reads badly.
- §3.5 title/cover lint. §3.6 storyboard: skip (no approval in a lote).
- §4.1 render in the foreground: `02-scripts/keepawake.sh node 07-studio/engine/cli.mjs build <folder>/spec.json --out <folder> --json-logs`. On error fix once and retry once; if it still fails, set the lote entry `falló: <motivo en una línea>` and move on.
- §4.2 verify; §4.3 `stage=ready`; §4.4 export and content-log row.
- `post.md`: sources only at the end of the YouTube description ("Fuente: …"); never in narration or on screen.
- Update the lote file: `listo` + duration + template.

Quality rules for every video: hook in 3 s, one idea per video, no figures without a confirmed source, no repeated phrasing across the lote, the channel's `voice.md` banned words respected, originals drawn for the topic (creative mode), ElevenLabs voice when the channel default is `elevenlabs`; no other paid generation (ElevenLabs Music, Higgsfield, fal) unless the channel defaults already use it.

## 3. When the lote ends

Append a summary to the lote file: done, failed (with reason), total time. Final message, short: how many are `listo` in the Panel, the folder of each, which failed and why, and "revísalos en el Panel, descarta los flojos y súbelos a mano; márcalos publicados con /canal".

## Limits

- One lote per night, max 20 videos. If the session reaches a usage limit, the run waits and continues from the lote file.
- Never touch other channels' projects, never delete projects, never commit, never upload.
