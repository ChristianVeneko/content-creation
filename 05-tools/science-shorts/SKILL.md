---
name: science-shorts-studio
description: Make a 45-80 second animated science Short in the flat-vector explainer style of the biggest animated science channels - bright gradient scenes, soft shaded shapes, objects with faces, chunky labels that pop on their word, magnifier insets, a title card from the first frame, small burned-in captions, a free local voice-over and a synthesized music bed - with every fact sourced first, rendered on the CPU to a 1080x1920 master and a 7:8 X cut under 10 MB. Use when the user asks for an animated science explainer, a "how heavy / how big / what if / why does" science Short, a flat vector or cartoon explainer video, or types /science-shorts-studio.
---

# Science Shorts Studio

You make one 45-80 s vertical Short that explains one surprising science fact the way the big animated science channels do. A short claim over a title card, then a chain of facts where every sentence is a picture, big numbers turned into everyday objects, a twist and a short punchline. The pictures are flat-vector scenes that you draw in SVG (`renderer/flat.js` plus the Short's own `scenes/scenes.js`), rendered frame by frame in headless Chrome on the CPU. The voice is a free local model, the music and sound effects are synthesized, the captions are burned in, and every fact is sourced first.

Read `reference/style.md` (the format, measured on 4 reference Shorts) and `reference/scenes.md` (how to draw scenes with the library) before writing anything. The worked example is `examples/cloud_weight/`: "This Cloud Weighs 100 Elephants!", 55.9 s, 20 scenes, with its sources, script, shot plan and `scenes/scenes.js`.

## What comes out
- `out/<slug>_9x16.mp4`: 1080x1920, 30 fps, about -12 LUFS (Shorts, Reels, TikTok).
- `out/<slug>_x_7x8.mp4`: 1008x1152 for X, drawn natively at 7:8 so it fills the tile (no bars, no crop), about -14 LUFS, under 10 MB.
- `out/<slug>_cover_9x16.jpg`, `_cover_7x8.jpg`.
- `sources.md`, `qa/report.md`, `qa/tiles.md`.

## Hard rules
1. **Facts first.** Every fact in the voice, the captions or the picture comes from a source you opened today, listed in `sources.md` with its read date. Anything you can't verify, or where sources disagree, stays out and goes under "Left out". Round only the way the sources do ("about 500 tonnes").
2. **Everything is drawn and synthesized.** No footage, photos, stock art, downloaded music or sound effects, and no AI images or video. The pictures come from `flat.js`, the sound from `sound.py`.
3. **Your own characters.** Never draw another channel's characters, mascots or logos, or a real person's likeness; the format is free to use, their art isn't. People are generic `F.person` figures; objects get faces with `F.face`.
4. **No brands or logos** on anything drawn: no products, packaging marks or company names.
5. **English. No gore; dangers are explained, never shown graphically.**
6. **Claude only.** It needs a Claude subscription and free tools: `setup.py` installs everything (a Python venv, the Kokoro voice, faster-whisper, the caption font), and the renderer uses Chrome or Edge if one is installed, else Playwright's free Chromium. No API keys, no accounts, no paid services.

## Setup (once per computer)
```
python <skill>/scripts/setup.py --project .
```
`<skill>` is this skill's folder (e.g. `~/.claude/skills/science-shorts-studio`). Run it in the Short's empty folder. It installs into `~/.cache/science-shorts` a Python venv (numpy, Pillow, imageio-ffmpeg, kokoro-onnx, soundfile, faster-whisper, websockets), the Kokoro voice, the faster-whisper timing model and the caption font (about 500 MB, 40 s to a few minutes), and finds a browser. It ends with `PY=...`: **run every script with that Python** (below, `PY`). Python 3.10+ is needed; if it's missing, give the user the python.org link and wait.

## The steps

**0. Ask, in one message:** the topic or the fact, and anything they want in it. If they say "you pick", choose a fact that is surprising, true, well sourced and drawable (a weight, a size, a speed, a "what happens if", a "why doesn't X"), say which in one line, and don't wait at the checkpoints below. Then start the folder:
```
PY <skill>/scripts/new_short.py <folder> --slug how_hot_is_lightning --title "Lightning Is|5x Hotter Than The Sun"
```
It makes `sources.md`, `script.json` (with the title card), `shots.json` and a starter `scenes/scenes.js` with three scenes to copy: a title card, a magnifier and a comparison.

**1. Facts → `sources.md`.** Search the web and open the pages (WebSearch / WebFetch). Prefer agencies, universities, papers and science magazines. Write the table: fact / used where / source with its read date, then "Left out".

**2. The script → `script.json` (checkpoint 1).** Pick the shape from `reference/style.md` section 2 (suspects list, character build, trap, crisis then hope, puzzle):
- Line 1 is the title, said out loud: 4-10 words, a claim or a question. The title card shows it in 2 lines (`"title"`).
- Then 10-14 lines, 130-230 words in all. Every sentence is one thing you can draw. Big numbers become everyday objects. Say "you" and "your", put a turn in it (But / So why / Besides / Until), and end on a short line that lands the idea.
- Cut every line into caption chunks by hand with `|` (2-4 words, where the picture should change).
- Write numbers as words joined with hyphens in `say` ("five-hundred") and as digits in `show` ("500").

Show the user the lines and the key sources; on "you pick" or "go", carry on. Then:
```
PY <skill>/scripts/check_script.py
```
Fix every FAIL.

**3. The voice:**
```
PY <skill>/scripts/narrate.py
```
It reads every line with Kokoro `am_liam+am_puck`, joins them with short gaps, times every word with faster-whisper and keeps your `|` chunks. It prints the chunks, the length and the pace. Aim for 165-180 words a minute: too fast, lower `speed` (0.9 is the default) or raise `gap`; too slow, the reverse. Your own recording works too: `PY <skill>/scripts/import_voice.py --audio take.m4a` (read the lines as written; faster-whisper times it).

**4. The shot plan → `shots.json`, then:**
```
PY <skill>/scripts/plan.py
```
- **A scene every 2.5-3.5 s,** each starting on a caption chunk number or a spoken word, with:
  - `fn`: the function in `scenes.js` that draws it;
  - `what`: plain words for what it shows;
  - a `transition`: cut, slide, slide_left, zoom with a `focus` point, iris, whip or pop;
  - `beats`: the words inside the scene where something new pops in.
- **Something new on every caption chunk:** a scene start, a beat, or `"move": true` for a scene that is one continuous move.
- **Beats get a soft pop sound** unless you name another sound (`["kilometer", "swish", 0.3]`) or none (`["word", null]`).
- **`amb`** adds wind, rain, a hum or bubbles under a scene.
- The format of everything is at the top of `scripts/plan.py`.

`plan.py` writes `build/plan.json` and `build/sound.json`. Fix every WARN.

**5. The style board (checkpoint 2).** Write the title card and two other key scenes in `scenes/scenes.js` first (the starter has a title card, a magnifier and a comparison). `reference/scenes.md` explains the library and the patterns; `examples/cloud_weight/scenes/scenes.js` has 20 finished scenes to borrow from. Render one frame per scene:
```
PY <skill>/renderer/render.py stills
```
Open `build/stills/sheet.jpg` (about 10 s for 20 scenes). Show the user the title card and the two others; on "you pick" or "go", carry on.

**6. Every scene, then the render.** Write the other scene functions (an unwritten one renders as a purple card with its name). Look at the sheets at both sizes and fix what's wrong before the full render:
```
PY <skill>/renderer/render.py stills
PY <skill>/renderer/render.py stills --size 1008x1152
PY <skill>/renderer/render.py frames --workers 6
PY <skill>/renderer/render.py frames --size 1008x1152 --out frames_x --workers 6
PY <skill>/scripts/sound.py
PY <skill>/scripts/encode.py
```
- **The second size is the X cut,** drawn again at 7:8 rather than cropped: every camera zooms out to 0.74 and the picture moves up 40 px.
- **Per-scene framing for 7:8:** where a scene needs its own, set it in `scenes.js` with `window.FIT78 = { S_title: { zoom: 0.68, lift: -60 } }` (a smaller zoom shows more; `lift` moves the picture up by screen pixels, negative moves it down).
- **Keep the subject above the caption line** (78 % down) in both sizes: people's feet, labels and numbers shouldn't sit under the caption.
- **Frames are kept** while `scenes.js`, the plan and the renderer are unchanged; any change renders again.
- **Machine time:** about 5 minutes for 56 s at 9:16 with 6 Chrome workers on a 6-core CPU, plus about 3 for the X cut.
- `encode.py --x-only` re-encodes just the X cut after a 7:8 fix.

**7. Check:**
```
PY <skill>/scripts/check.py
```
It writes `qa/report.md` and `qa/sheet_*.jpg` (a frame every 0.5 s from the finished video, each labelled with its time and the caption on it).

**Open every sheet and judge every tile,** one line each in `qa/tiles.md` (`21.2 s: ok, the person flinches under the cloud, caption "over your head."`). Look for:
- a label popping before its word;
- a caption over a face, a number or a person's feet;
- a double exposure in a transition;
- something cut off at the frame edge;
- a scene where nothing moves;
- anything that contradicts `sources.md`.

Fix every FAIL and BAD tile, render again and check again. Done means no FAIL, every LOOK explained in `qa/tiles.md`, and every tile ok.

**8. Deliver** the two videos, the covers, the fact table with what was left out, `qa/report.md`, and how long the run took. Tell the user to listen once with sound on: you can't hear the mix.

## Gotchas
- **The voice reads digits wrong**: "1986" comes out "nineteen hundred eighty six". `narrate.py` fails any digit in `say`; hyphenate numbers into one word ("a-thousand") so `show` can hold "1,000".
- **One caption word per spoken word**: `show` must have exactly as many words as `say`.
- **Cue words** are matched without case or punctuation; when a word is said more than once, add `#2`, `#3` (`"weighs#2"`). `plan.py` lists the times a word is spoken when a cue is out of order.
- **Pop on the word, not before it:** use `F.pop(t, B(sh, "name"))`. Anything drawn without a beat is there from the scene's first frame.
- **Never crossfade**: fades read as double exposures. Cut on the word, or slide, zoom, iris.
- **Draw the world as a function** (`F.frame(cam, () => [...])`), so it is built for this frame.
- **Order is depth**: what's drawn later is in front.
- **Cheap dots**: hundreds of droplets or particles should be plain circles (`dot()` in the example), not `F.blob` (each blob adds two masks and slows the render).
- **Nothing holds still**: every scene drifts or pushes (`F.drift`) and something bobs (`F.bob`).
- **The first sound** never sits on sample 0 (AAC overshoots it): plan.py starts every cue at 0.04 s or later.
- **Windows long paths**: keep `SCIENCE_SHORTS_HOME` short (the default is fine); pip fails past 260 characters.
- **Loudness**: the master is -12 LUFS (the references measured -11.8 to -12.8); the X cut stays at -14 because X normalises.

## How long it takes
**A new Short, end to end: about 3-4 hours, almost all of it Claude's work.** Measured on the example (55.9 s, 20 scenes, a 6-core desktop CPU, no GPU):
- **Setup:** 40 s the first time.
- **Sources and script:** 30-40 minutes.
- **Voice and plan:** under 2 minutes of machine time.
- **Style board and the other scenes:** 1.5-2.5 hours of Claude's work, including two still rounds at about 10 s a sheet.
- **Full render:** about 5 minutes for the 9:16 and 3 for the 7:8 cut (6 Chrome workers).
- **Sound, encode and check:** about 3 minutes.
- **The tile review and fixes:** 20-40 minutes.

## Credits
The format (a title card from the first frame, flat shaded vector scenes, pop-on labels, magnifier insets, small captions and a warm synth bed) follows the big animated science explainer channels, studied frame by frame from four of their most-viewed recent Shorts. Nothing of theirs is copied: every drawing, character, colour scheme, sound and line here is new. Kokoro-82M (Apache-2.0), faster-whisper (MIT), Nunito (SIL OFL).
