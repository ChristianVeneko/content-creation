---
name: hooks
description: "Trigger: /hooks, gancho, hook, primera frase, título, portada, cover text, qué funciona en mi nicho. Write, score and lint short-video hooks and title/cover pairings."
license: MIT
metadata:
  author: "content-creation (adapted from Jakeschincariol/youtube-agent-skill)"
  version: "1.0"
---

## Activation Contract

Use when writing or fixing the opening line of a short (Reels/TikTok/Shorts), its title or cover text, or when the user asks what works in their niche. `/video` calls this flow before writing a spec.

## Hard Rules

- Run the tools; never eyeball a hook. Prefix: `source ./env.sh && H=.claude/skills/hooks` (run from the repo root).
- Never invent a number, result or source. No figure → ask for it or write the line without one.
- A hook is one spoken line, 5-12 words, said in under 3 s; it confirms the title, opens a question, proves the payoff exists. No "en este video", no channel intro.
- If a channel is active, write in its `voice.md` (words to use/avoid, claims it will not make).
- A score is a reason to look again, not a promise. Max 2 rewrite passes, then keep the best.
- Do not read `hooks.json` whole; use `--formulas`.

## Execution Steps

1. Formulas (1.2 KB): `python3 $H/hookscore.py --formulas`.
2. Write 5 hooks from different formulas to `<project>/hooks.txt` (one per line).
3. Score: `python3 $H/hookscore.py <project>/hooks.txt` (auto-detects es/en; `--json` for machine use). Rewrite anything below 55 (WEAK) once using its `weakest` hint; rescore.
4. Title + cover: `python3 $H/title.py --title "<title>" --cover "<cover headline>"`. Fix `duplicate`, `cover-length` (>4 words) and `vague`; the cover must say what the title does not.
5. Niche research (optional, no API): the user gives a JSON list `[{"channel","title","views","url"}]` with 4+ public videos per channel; run `python3 $H/swipe.py <file> --min 2`. Report the top 5 multiples, their formula and the one shared pattern. Public listings only, never a logged-in session.

## Output Contract

Show the top 2 hooks with verdict, band and formula, the chosen title/cover pair with its score, and which line goes in the spec's first scene. Keep `hooks.txt` in the project.

## References

- `THIRD_PARTY.md`: MIT license and the changes made to the upstream tools.
- `01-prompts/01-hooks.md`: spoken line | on-screen text | opening visual format.
