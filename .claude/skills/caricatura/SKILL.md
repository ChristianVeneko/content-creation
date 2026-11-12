---
name: caricatura
description: "Animated caricature commentary video (celebrity feud or farándula case told with drawn caricatures in front of detailed animated sets). Trigger when the user asks for a caricature / farándula commentary video, the style of their TikTok caricature videos, or sends photos of people to draw."
---

# /caricatura: caricature film with detailed animated sets

Kit: `05-tools/caricature-stage/` (read its `README.md`). Talk to the user in Spanish. Never upload.

## The bar (from the user's feedback)
- **Backgrounds are scenery, never a colour.** Every scene uses a `SCENERY` set that matches the place (hotel → `lobby`, jacuzzi → `pool`, podcast → `studio`, tiraera/street → `street`, DM → `bedroom`, explanation → `classroom`, decision → `crossroads`, barber → `barbershop`, trial → `court`, TV/rumor → `newsroom`, fight → `arena`, party → `club`, beach → `beach`, querella → `police`, radio → `radio`). The user rejected "dos pilares y ya" and "fondos de colores". No set fits → write one in `sets.js` (layered, lit, animated) and add it to the kit.
- **Characters from the user's photos**, kept ONLY in `05-tools/caricature-stage/private/cast-people.js` (git-ignored: real people are for the user's TikTok, never in the repo, a commit or a public file). More detail rather than less: rim light, cloth folds, accessories that move (chains swinging with a glint). No pink blush on slim faces. Ask for photos of anyone new; show a model sheet or 2-3 look proposals before animating.
- **Hook with the most famous person first**, with a strong, specific claim in the first line (the best-performing video opened with a superlative about its subject).
- **Funny and well explained**: real quotes and real absurd details from the sources, one clear conflict, ~60-80 s.

## Pipeline
1. Research with sources (news + the YouTube videos the user sends: `yt-dlp --skip-download --write-auto-subs --sub-langs 'es.*'` for exact quotes). Attribute every claim ("según X"); unproven = "supuesto". Sources go only in `post.md`.
2. `node .claude/skills/canal/jobs.mjs new "<title>"`, then `sh 05-tools/caricature-stage/new.sh 04-projects/<id>`.
3. `film/lines.json`: one line per scene, voice `43h7ymOnaaYdWr3dRbsS`, speed 1.05-1.06. Pronunciation via `"say"` (Puerto Rican pronunciation of names, e.g. a "ll" said as "y"); captions keep the written spelling. Last line is a full question to the audience.
4. Voice: `cd $LEMO_OPUSCAR_HOME && .venv/bin/python core/tts/tts_eleven.py <film>/lines.json <film>/voices --flow`, then `python tighten.py voices voices_t --max 0.2 --edge 0.08` (no dead pauses).
5. `scenes.js`: one `scene('lNN', ...)` per line: a SCENERY set, characters with `ch()`, props popping on words, stamps on the punchline, `// EMPHASIS: [...]` for caption highlight words. Check stills (`node core/render/still.mjs <film> <t...> --size 1080x1920`) and fix overlaps before the full render.
6. `audio.py` EVENTS: a sound on every prop, stamp, cut and punch (Kenney packs in `03-assets/sfx`).
7. `TRACK=<library id> sh <film>/build.sh` (refuses scenes without a set; music ducked; -14 LUFS, peak ≤ -1.2 dB).
8. Deliver: `video.mp4`, cover (`still.mjs ... --q "cover=LINE ONE|*LINE TWO"`), WhatsApp copy (720x1280, 2-pass ~1 Mbps, ~11 MB), `post.md` with the TikTok caption + 5 hashtags + the CC BY music credit; `jobs.mjs set <id> stage=ready`.
