---
name: pixel
description: "Make a pixel-art animated short BY HAND (no pixel-world engine): the agent writes the canvas scenes freely, one bespoke world per idea. Trigger when the user asks for a pixel / pixel art / pixelado video, or /video or /lote picks the 'Pixel animado' look."
---

# /pixel: hand-made pixel-art video (agent freedom, no engine)

The user rejected the generic `pixel-world` engine for pixel videos ("lo mejor seria no usar motor y darle libertad al agente"). Its output was one reused background, a mascot, floating labels and automatic effects. Pixel videos are now built by writing the scenes yourself, like `04-projects/2026-11-03-pixel-que-es-un-token-en-la-ia` and `04-projects/2026-11-03-comparativa-cache-a-mano` (the two videos the user liked). The engine stays in the repo for old specs; do not pick it for new pixel videos.

Run from the repo root; every command starts with `source ./env.sh && `. Talk to the user in Spanish. Never upload or publish.

## Start from the starter
`cp -R 07-studio/pixel-hand/starter/. 04-projects/<id>/` (after `jobs.mjs new` made the folder), then read its `COMO-REHACERLO.md`, `build.mjs`, `src/lib.js` (drawing helpers, pixel font, easing), `src/kit.js` (palette, the mascot, props), `src/w1.js`..`w4.js` (one world each) and `src/main.js`. The starter ships the `hf/` scaffold (hyperframes.json, meta.json, package.json, fonts). Do NOT override `HYPERFRAMES_CACHE_DIR` (it re-downloads Chrome); Silkscreen is uppercase-only, so code shown in it appears in capitals. `hyperframes snapshot` writes a ready contact sheet under `hf-sin-subs/.hyperframes/artifacts/snapshots/`. Replace `voz.txt`, the `CUES`/`SFX_DEF` in `build.mjs` and the worlds. Delete the starter's worlds you do not reuse; do not keep its CPU/oasis scenery for another topic.

## Pipeline
0. Load the content skills BEFORE writing anything (the user: "los videos no comienzan bien la narración y terminan medio chimbo"): `.claude/skills/hooks/SKILL.md` (hook flow) and `.claude/skills/canal/SKILL.md` (jobs, stages, content log). Run `source ./env.sh && H=.claude/skills/hooks`: 5 hooks from different formulas (`hookscore.py --formulas`) into `<P>/hooks.txt`, `python3 $H/hookscore.py <P>/hooks.txt`, rewrite WEAK once (the scorer is tuned for English and rates specificity low in Spanish; use it as a second opinion, never pick a vague line because it scores higher), then `python3 $H/title.py --title "<title>" --cover "<cover headline>"` and fix `duplicate`, `cover-length`, `vague`.
1. Script (`voz.txt`), three beats: OPENING = the chosen hook as the very first spoken line (5-12 words, no greeting, no "hoy", no channel intro; it names the consequence, the mistake or the surprising claim, and the first 3 s of picture SHOW that thing, not a title card); BODY = one idea in short sentences, each one something drawable; CLOSING = the last line is the payoff the viewer keeps (a rule or an action in 6-12 words that answers the hook, e.g. "Antes de pagar más megas, mira primero tu ping"), never a trailing explanation, never a recap of the steps, never a call to action. The last picture is the answer drawn big and held 1 s after the last word. Details: 25-45 s, one idea, hook in 3 s, no figures without a confirmed source, no call to action (no "comenta", no "sígueme"), banned words of the channel `voice.md`. `{Texto|pronunciación}` fixes TTS.
2. Voice: ElevenLabs `WFmom5vWeiir6CN1crV3` (or the channel `voiceId`) through the engine tts lib; `node <P>/build.mjs voice`, then `transcribe` (whisper small, `--language es`, model cache under `/private/tmp`), then `all` (SFX + chiptune music 17 dB under the voice + mix at -14 LUFS). Pauses are tightened by `normalizeSpeech({ tighten: true })`.
3. Draw: one canvas 270x480 logical, upscaled x4, pure function of the seek time (`hf-seek`): no `Date.now`, no `Math.random`, no CSS animation. Bind each action to the n-th spoken word with `CUES` (the build aligns the script to the whisper words).
4. Render in the background (`run_in_background`, a `&` inside a Bash call gets cancelled): `hyperframes@0.9.6 check`, then `render --quality looks` for `video.mp4` (with captions) and `video-sin-subtitulos.mp4`.
5. Verify: `ffprobe` (1080x1920, 30 fps, audio, about -14 LUFS), `hyperframes snapshot --at t1,t2,...` into a contact sheet, LOOK at it and fix empty, overlapping, cropped or flat frames. Two or three iterations.
6. Close the project like `/video` §4 (rhythm: no dead air at the start: the voice starts within 0.3 s of frame 0 and the first frame already has the hook scene) (`stage=ready`, export, content-log row, `post.md`, sources only in the YouTube description).

## Quality bar (what the user liked)
- **A world per idea**, not per video: each sentence group gets its own place, sky and light. Never the same background twice in a video; never reuse a background of another video of the lote.
- **Show the real thing.** Draw the actual objects the script talks about, large (a third of the frame), with their name written ON them (CPU on the chip, RAM on the well). The action in the world is what the words say, moving: things travel, enter, split, fill, light up, grey out; the hero walks and carries. Not floating labels and emoji bubbles.
- Every spoken sentence changes something visible; every 2 s at most something moves.
- Detail and originality: parallax layers, ambient life (water, sway, shimmer, birds, stars), foreground dressing so the lower third is never empty, 1 px outlines, one coherent palette, dithered skies. New elements per video, not recycled props.
- **Effects diet:** no sudden zoom or punch-in, no screen shake, no flash, no popping for its own sake. Camera: slow pans or clean cuts/slides/iris between worlds. At most one giant stamped word in the whole video, only if it earns it.
- Text: a pixel font that renders accents (Silkscreen at 8 px; Press Start 2P drops them). Captions below y=1580 px never; nothing important under the platform buttons; brand pill small on top.
- Mascot (`chris`, `03-assets/mascots/chris/mascot.json`) as narrator, about 72 px tall, mouth following the voice envelope; it may be absent in a scene if the objects tell it.

## Metaphors: restraint
The user: "no me gusta el abuso de las metáforas". Default to the literal, the real subject drawn directly (the actual CPU, cache, RAM and disk, the actual request between app and server). At most ONE metaphor per video and only when it makes a hard idea clearer than the literal drawing; never a different metaphor per sentence, never a theme world forced onto a topic ("la API en la playa", "Docker como regalos de Navidad", "tu PC es un oasis"). A theme world is allowed only when the topic itself lives there. Say in `brief.md` which metaphor (if any) and why.

## Lote
In `/lote`, a pixel video is built by this skill, one after another, and no more than 3 pixel videos per lote (each costs real drawing work); the rest use other formats. Record in the lote file the world list of each video so none repeats.
