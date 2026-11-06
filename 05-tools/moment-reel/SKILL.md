---
name: moment-reel
description: Make a 30-50 second vertical cartoon story reel of a famous sports moment (a goal, a buzzer beater, a knockout) - a flat 2D cartoon with bold colours, thick outlines and expressive faces, freezes on the key instant, 2-4 word burned-in captions and a free local voice-over - with every fact checked first, rendered to a 1080x1920 master and a 7:8 X cut under 10 MB. Use when the user asks to rebuild, recreate, animate, cartoon or "make a reel of" a famous sports moment, goal, play, shot or fight, or types /moment-reel.
---

# Moment Reel

You make a 30-50 s vertical reel that tells one famous sports moment as a story: the act first, then the chain that led to it, the context, the reveal and the consequence. The pictures are a flat 2D cartoon (simple shapes, bold flat colours, thick ink outlines, a light paper texture, expressive faces) drawn in SVG and rendered frame by frame in headless Chrome. The voice is a free local model, the sound is synthesized, the captions are burned in, and every fact is checked first. It runs on this computer, on the CPU.

Read `reference/story_formula.md` and `reference/shots.md` before writing anything. The worked example is `examples/hand_of_god/` (Maradona's "Hand of God", 1986): its sources, beats, script, shot plan and `cartoon/moment.js`, with 46 shots, a TV replay with an arrow, a press room, freezes and a top-down route.

## What comes out
- `out/<slug>_9x16.mp4`: 1080x1920, 30 fps, about -11 LUFS (Reels, Shorts, TikTok).
- `out/<slug>_x_7x8.mp4`: 1008x1152 for X, drawn natively at 7:8 so it fills the tile (no bars, no crop), about -14 LUFS, under 10 MB.
- `out/<slug>_cover_9x16.jpg`, `_cover_7x8.jpg`.
- `sources.md`, `beats.md`, `qa/report.md`, `qa/tiles.md`.

## Hard rules
1. **Facts first.** Every fact in the voice, the captions or the picture comes from a source you opened today, listed in `sources.md` with its read date. Anything you can't verify, or where sources disagree, stays out and goes under "Left out".
2. **No real media.** No match footage, photos, broadcast commentary, crowd recordings or music downloads. The picture is drawn, the sound is synthesized (`sound.py`).
3. **Caricature, never likeness.** The famous player is a cartoon recognisable by what's public and generic: hair, build, kit colours, shirt number. Never trace or copy a photo, and never draw a realistic face. Everyone else gets a generic cartoon face. Never imitate a real person's voice.
4. **No logos.** No league, tournament, club crest, kit maker, sponsor or broadcaster marks, and no trophy designs. Plain kits in the right colours, plain boards.
5. **No gore.** English only.
6. **Claude only.** It needs a Claude subscription and free tools. `setup.py` installs everything (a Python venv, the voice, the font); the renderer uses Chrome or Edge if one is installed, else Playwright's free Chromium. ElevenLabs is an option only when the user asks for it and sets `ELEVENLABS_API_KEY` in their own shell. Never ask for a key, print one, or open a file that may hold one.

## Setup (once per computer)
```
python <skill>/scripts/setup.py --project .
```
`<skill>` is this skill's folder (e.g. `~/.claude/skills/moment-reel`). Run it in the reel's empty folder. It installs into `~/.cache/moment-reel`: a Python venv (numpy, Pillow, imageio-ffmpeg, kokoro-onnx, soundfile, faster-whisper, websockets), the Kokoro voice, the faster-whisper timing model and the caption font (about 500 MB), and finds a browser. It ends with `PY=...`: **run every script with that Python** (below, `PY`). Python 3.10+ is needed; if it's missing, give the user the python.org link and wait.

## The steps

**0. Ask, in one message:** which moment, and anything they want in it. If they say "you pick", choose a famous, well-documented moment with a story in it (a trick, a mistake, a reveal), say which in one line, and don't wait at the checkpoints below. Then start the folder:
```
PY <skill>/scripts/new_reel.py <folder> --sport football|basketball|tennis|boxing|athletics --slug <name>
```
It makes the templates (`sources.md`, `beats.md`, `script.json`, `shots.json`) and a starter `cartoon/moment.js` with that sport's set piece, a cast template and three shots to copy. Another sport: start from the closest one and draw its venue from the basic shapes.

**1. Facts → `sources.md`.** Search the web and open the pages (WebSearch / WebFetch). The facts to get for each sport are in `reference/sports.md`. Write a table: fact / used where / source with its read date, then the kits, then "Left out".

**2. The story → `beats.md` (checkpoint 1).** Write 8-12 lines in the story formula (`reference/story_formula.md`): line 1 is the act, opening with "He"; then a cause-and-effect chain on hinge words; the context after "You see,"; the reveal; the consequence. 90-140 words. Under each line, list the pictures it gets (shot types from `reference/shots.md`, one per 2-4 spoken words) and the sounds. Build the key instant as a **freeze** (a comic burst, speed lines, an impact star, the camera drifting in) and give the aftermath room (the crowd, the scoreboard, a TV replay with an arrow, the press room). Show the user the lines with the key sources; on "you pick" or "go", carry on.

**3. The voice → `script.json`, then:**
```
PY <skill>/scripts/check_script.py
PY <skill>/scripts/narrate.py
```
`check_script.py` checks the script against the formula before anything is recorded: 90-140 words, about 30-50 s, line 1 opens on "He", "You see," and the hinge words, no digits in `say`, `show` matching `say`, chunks of 2-4 words.
It reads every line with Kokoro `am_liam+am_puck`, joins them with short gaps from 0.05 s, times every word with faster-whisper, and cuts the caption chunks (2-4 words, at punctuation and pauses, never ending on "the" or splitting a name). It prints the chunks of every line, the length and the pace. Aim for 30-50 s and 150-180 words a minute: too fast, raise `gap` or lower `speed` a little; too long, cut words. A chunk that splits a phrase badly means rephrase the line. **Numbers in `say` are words joined by hyphens** ("nineteen-eighty-six"); digits go in `show`. The format is at the top of `scripts/narrate.py`.
A take the user already has (a recording, another voice tool's file with word times) goes in with `PY <skill>/scripts/import_voice.py --wav take.wav --words words.json` instead: same `build/timing.json`, so the rest doesn't change.

**4. The shot plan → `shots.json`, then:**
```
PY <skill>/scripts/plan.py
```
One shot per chunk (or per 2 chunks with a camera move), each starting on a chunk number or a spoken word (`"at": "fist"`, `"fist#2"` for its second time). Give each the `fn` that will draw it in `cartoon/moment.js` (`"S_fist"`), a `type`, a specific `what`, a `camera`, a `move`, a `transition`, and `glow` / `text_3d` / `crowd` / `sfx` where they fit (format at the top of `scripts/plan.py`). To cut the captions exactly where the pictures change, mark the chunks by hand with `|` in `script.json`. It writes `build/plan.json` and `build/sound.json` (the crowd follows each shot, whips get whooshes, smash zooms impacts, glows a shimmer, plus a light synthesized music bed). Fix every WARN.

**5. Preview the pacing (optional):** `PY <skill>/renderers/animatic/render.py`, then `sound.py` and `encode.py`: a moving storyboard with the real voice, sound and captions in about a minute and a half.

**6. The style board (checkpoint 2).** Draw the moment's three key shots first, in the starter's `S_freeze`, `S_act` and `S_after` (rename them to the `fn` names in `shots.json`): the freeze on the key instant, the act itself, and one aftermath shot. `examples/hand_of_god/cartoon/moment.js` shows a whole reel; `renderers/cartoon/README.md` explains the library. Render them:
```
PY <skill>/renderers/cartoon/render.py stills --frames 640,700,955
```
Show the user the three frames (`build/stills/`): the look, the caricature and the colours. On "you pick" or "go", carry on.

**7. Every shot, then the render.** Write the other shot functions (a shot that isn't written yet renders as a grey card with its name). Then:
```
PY <skill>/renderers/cartoon/render.py stills
PY <skill>/renderers/cartoon/render.py stills --size 1008x1152
PY <skill>/renderers/cartoon/render.py frames
PY <skill>/renderers/cartoon/render.py frames --size 1008x1152 --out frames_x
PY <skill>/scripts/sound.py
PY <skill>/scripts/encode.py
```
The second size is the X cut, drawn again at 7:8 rather than cropped: every camera zooms out to 0.8 and the picture moves up 110 px, so the shot fits the wider, shorter frame and feet stand above the caption. Look at its sheet too. Where the caption (78 % down) touches a face, a big word, a number on a back or someone's legs, give that shot its own framing in `moment.js`. For example `window.FIT78 = { S_fist: { zoom: 0.64, dy: 62 }, S_keeper: { lift: 175 }, S_tv: { lift: 0 } }`: a smaller zoom shows more, `lift` moves the picture up by screen pixels, `dy` by world units. `encode.py --x-only` re-encodes just the X cut after a 7:8 fix.
`stills` renders the middle of every shot into `build/stills/sheet.jpg` in about 20 s: look at every tile (the right people, poses that read, the ball where the voice says, the facts) and fix `moment.js` before the full render. `frames` renders every frame (about 6 minutes for 48 s with 4 Chrome workers on a 6-core desktop CPU).

**8. Check:**
```
PY <skill>/scripts/check.py
```
It writes `qa/report.md` and `qa/sheet_*.jpg` (a frame every 0.5 s from the finished video, each labelled with its time and the caption that should be on it). **Open every sheet and judge every tile**, one line each in `qa/tiles.md` (`4.5 s: ok, the fist on the ball, caption "with his hand"` / `9.0 s: BAD, the keeper's glove above the ball (sources: the fist got there first)`). Look for: limbs crossing the body the wrong way, a ball hidden behind scenery, two skies meeting in a seam, the ball where the voice doesn't say it is, a caption over the face, a logo, anything that contradicts `sources.md`. Open `qa/consec_*.jpg` for every flicker candidate, unplanned jump and frozen stretch. Fix every FAIL and BAD tile, render again (it keeps nothing when `moment.js` changes, and that's only 5 minutes), and check again. Done means: no FAIL, every LOOK explained in `qa/tiles.md`, every tile ok.

**9. Deliver:** the two videos, the covers, the fact table with what was left out, `qa/report.md`, and how long the run took. Tell the user to listen once with sound on: you can't hear the mix.

## Gotchas
- **The voice reads digits wrong**: "1986" comes out "nineteen hundred eighty six". `narrate.py` fails any digit in `say`.
- **The caption shows each spoken word once.** `show` must have exactly as many words as `say`.
- **Cue words**: `plan.py` matches spoken words without case or punctuation; when a word is said more than once, add `#2`, `#3`. A shot out of order fails with the list of times the word is spoken.
- **Poses are written from the front**: the first limb of a pair is his left (screen right when he faces you), and positive angles turn it outward. From behind (`facing: "back"`) the pose mirrors by itself. Get the sign wrong and the arms cross the body.
- **Draw the world as a function** (`C.frame(cam, () => [...])`) so lines get this camera's width; an array built before the call gets the last frame's.
- **Order is depth**: what's drawn later is in front. A ball in the goal goes between the pitch and the net (`boxWorld({ inNet: [...] })` in the example), or the stand covers it.
- **One sky per scene**: pass `noSky: true` to `C.stadium` when the scene draws its own sky.
- **Nothing holds still**: every shot drifts, pushes or turns to its last frame; a freeze is a moving camera on a still moment.
- **Crowds wave slowly**: `bob: t` is enough; faster flickers in the encode.
- **The first sound** never sits on sample 0 (AAC overshoots it): the voice starts at 0.05 s and every cue at 0.04 s or later.
- **Windows long paths**: keep `MOMENT_REEL_HOME` short (the default is fine); pip fails past 260 characters.
- **Loudness**: the master is louder (-11 LUFS); the X cut stays at -14 because X normalises.

## How long it takes
**A new moment, end to end: about 2.5-3.5 hours**, almost all of it Claude's work. The machine time is about 15 minutes (measured from a clean copy: setup 44-62 s, then voice, plan, stills, both frame sizes, sound, both encodes and the checks in 830 s on a 6-core desktop CPU).
- Sources and script: 20-30 minutes.
- Voice and plan: 5 minutes.
- Style board: 30 minutes.
- The other shots and two still rounds: 1-1.5 hours.
- Render (both sizes), encode and check: about 12 minutes.
- The tile review and fixes: 20-30 minutes.
A new sport adds 20-30 minutes if its venue isn't in the library yet.

Measured on the Hand of God example (48 s, 46 shots, a desktop Ryzen 5 5600X CPU; the GPU is not used):
- **Setup:** 1-6 minutes the first time.
- **Facts and story:** 10-15 minutes.
- **Voice and plan:** under 2 minutes.
- **Style board:** 20-40 minutes of Claude's work.
- **The other shots:** about an hour of Claude's work, including two still rounds of fixes at 20 s a sheet.
- **Full render:** about 6 minutes for the 9:16 and 4 more for the 7:8 X cut.
- **Sound, encode and check:** about 3 minutes.

## Credits
The flat cartoon look is in the spirit of the history-as-a-cartoon channels (OverSimplified and others); the story formula and the caption style follow Zack D. Films (youtube.com/@zackdfilms), studied frame by frame. Nothing of theirs is copied. The first version of this skill used an era TV look made in code, an idea from lemo-opuscar (github.com/lemomo-ai/lemo-opuscar). Kokoro-82M (Apache-2.0), faster-whisper (MIT), Nunito (SIL OFL).
