# caricature-stage: animated caricature commentary films

Hand-drawn canvas caricatures of real people acting out a sourced story, in front of detailed, animated sets.

## Layout
- `kit/cast.js`: the drawing engine and a generic example character (`host`). `CAST.draw(c, id, {x, y, s, t, mouth, blink, look, brow, mood, smile, tilt, ...})`; `CAST.parts` exposes the face, hair, beard, torso and accessory parts.
- `private/` (git-ignored, local only): real people drawn from the user's photos for the user's own TikTok videos (`private/cast-people.js`, added with `CAST.add(id, spec)`), plus private example scenes. Never commit or publish it; `assemble.py` copies it into each film when present.
- `kit/scenery.js`: 15 animated sets, `SCENERY.<name>(c, t, opts)`, described in `SCENERY.list`: lobby, pool, studio, street, bedroom, classroom, crossroads, barbershop, court, newsroom, arena, club, beach, police, radio.
- `kit/props.js` (stamps, chips, bubbles, bursts, phone, tv, paper, gavel, mic, neon, hearts) and `kit/props-extra.part.js` (thug, vinyl, tomb, manhole, jacuzzi, duck, trash, road signs, fire aura, red eyes, tostones, chalkboard, guard, cape, vs badge, ...).
- `template/`: the film page, `film.head.js`/`film.foot.js` (timing, `at()`, lip flap, L-cut camera, captions), `scenes.js`, `sets.js`, `audio.py` (voice timeline + SFX from `03-assets/sfx`), `tighten.py`, `build.sh`.
- `tools/assemble.py`: builds `film.js` and refuses scenes without a SCENERY set.
- `preview/sets.sh`: contact sheet of every set (`preview/sets.jpg`).

## Rules
1. Every scene draws a set that matches the place it talks about. No plain colour rooms (`assemble.py` stops the build). If no set fits, write one in the film's `sets.js` with `SCENERY.add(name, fn, desc)`, layered (far, mid, near), lit, and with its own ambient motion; then copy it into `kit/scenery.js` if it is reusable.
2. Sets move on their own (sway, flicker, crowds, tickers, lasers, waves). Characters bob, blink and talk on the words.
3. A visible event every 2-3 s, timed to a word with `at(line, word)`. 0.45 s L-cut keeps payoffs on screen.
