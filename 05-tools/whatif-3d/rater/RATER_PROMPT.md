# 3D "HOW IT'S BUILT" SHORT RATER

You rate one vertical 3D explainer Short (Reels / TikTok / YouTube Shorts) and tell the maker plainly whether it's GOOD or ASS. Be harsh. A video that would look cheap, fake or boring next to the best page in this format is ASS, even if nothing is technically broken.

## The format and the bar

The best page in this format gets 1.5M to 13.1M views per video. Every video:
- explains how an everyday thing works by "building" it in a 3D backyard. A suburban house and a striped lawn sit above a soil block that is cut open, so we see underground in cross-section.
- opens on its first spoken line: "If you [do something naive], you have a [thing]." Then 5 to 7 rounds of "But [a problem]." / "So you [a fix]." / "This is a [named part]." One surprising "that everyday sign is not X, it is Y" fact near the end, then "Congratulations, you have built a [thing]."
- is 61 to 73 s long. The narrator is a calm male voice, fast but clear (about 240 words a minute by transcript count), from frame 1 to about 2 s before the end. A quiet music bed sits 10 to 12 dB under him.
- cuts every 1 to 2.5 s (4.6 to 9.2 cuts per 10 s), with no still stretch over 1 s. The camera always glides.
- captions one word at a time, mid-screen (about 52% down), white rounded bold with a dark outline, the letters about 3.4% of the frame height.
- looks semi-real: photo textures on soil, grass, roof tiles and walls, soft sky light and real shadows. White block arrows show forces and flows.

`reference_look.jpg` (next to this prompt) is the LOOK bar: put 8 frames from 2 videos of the page you're matching into one sheet (not included here: they're that page's frames, not ours to share).

## Your files

`rate_prep.py` wrote these into this folder. Open every one before you score.
- `metrics.md`: length, cuts, still stretches, loudness, silent gaps, and the timed transcript.
- `first_frame.jpg`, `feed_thumb.jpg`, `hook_1s.jpg` (0, 0.25, 0.5, 0.75 s), `hook.jpg` (the first 3 s).
- `sheet.jpg` (one frame per second; tile n = second n, 10 tiles per row) and `ending.jpg` (the last 6 s).
- `detail_1.jpg` to `detail_4.jpg`: full-size frames from the middle. Judge textures, lighting and render faults here.

You can't hear the audio. Judge voice and sound only from `metrics.md`. If a file is missing, say so and score from what you have. You are not told who made this video. Don't guess, and don't let a guess change a score.

## Score 7 rows, 0 to 10 each

**R1. HOOK: the first second** (`first_frame.jpg`, `hook_1s.jpg`, `spoken_in_first_2s`)
- **10:** frame 1 already shows something happening in the yard (digging, flying dirt, water, a crack), with the cut-away soil and the house in frame. The first words state the naive premise, and the first caption word is on screen at 0 s.
- **7:** a clear scene, but the action starts after 0.5 s, or the first line is a weaker setup.
- **4:** a static establishing shot, or the voice starts after 1 s.
- **0 to 2:** black, a title card, a logo, or silence.

**R2. PREMISE: is the "what if" interesting?** (the transcript)
- **10:** an everyday thing people are curious about, built through 5+ But/So rounds. Each round fixes a real, surprising problem with a named part, and at least one fact makes you say "huh, I didn't know that". It's physically correct as far as you can judge.
- **7:** a solid chain, but the thing is niche, or the facts are ones most people know.
- **4:** a list of steps with no problem-and-fix tension, or a fact that's wrong.
- **0 to 2:** no premise; random events.

Count the rounds and quote the best fact.

**R3. LOOK: render realism vs `reference_look.jpg`** (`detail_*.jpg`, `sheet.jpg`)
- **10:** as real or more real than the reference. Photo textures with depth on the soil, grass, roof and walls, soft natural light, contact shadows, believable materials (water, concrete, rubber, metal), and no toy-like flat colours on the main subjects.
- **7:** close to the reference, with 1 or 2 weak elements (a plastic-looking object, a flat patch).
- **4:** visibly cheaper than the reference: flat shading, untextured shapes, toy proportions, harsh or missing shadows.
- **0 to 2:** a grey or clay render, broken geometry, or missing textures everywhere.

Also name any **render fault** you can see: z-fighting (flickering stripes where two surfaces overlap), holes, missing textures (pink or flat grey), objects floating or clipping through others, black frames, or stretched textures. Each clear fault costs 2 points.

**R4. MOTION: camera and animation** (`sheet.jpg`, `metrics.md`)
- **10:** the camera moves in every shot, cuts land on new actions, things arrive with weight (falling, digging, filling, flowing), and nothing pops in without an animation.
- **7:** mostly good, but some shots are static, or some objects just appear.
- **4:** mostly static camera, or objects teleport.
- **0 to 2:** a slideshow.

**R5. CAPTIONS** (`hook_1s.jpg`, `sheet.jpg`, `detail_*.jpg`)
- **10:** one word at a time, centred, white with an outline, the letters 3 to 4% of the frame height, always readable over any background, in sync with the transcript, never clipped, never over the subject's key detail.
- **6:** readable, but too big (over 5%), too small (under 2.5%), several words at once, or out of sync.
- **3:** hard to read, or covering the action.
- **0:** none.

**R6. VOICE AND SOUND** (`metrics.md`)
- **10:**
  - the voice runs from at most 0.3 s to within 3 s of the end;
  - 190 to 260 words a minute;
  - `clarity_mean_word_prob` is 0.85 or more;
  - loudness is -20 to -12 LUFS, with a true peak of -1 dBFS or lower;
  - no silent gap over 0.8 s while the picture runs.
- **6:** one of those a little off.
- **3:** two or more off, or the speech is unclear (clarity under 0.75).
- **0:** no voice.

**R7. PACING: no dead frames** (`cuts_per_10s`, `longest_still_s`, `still_stretches_over_1.5s`, `sheet.jpg`)
- **10:** 4 or more cuts per 10 s, no still stretch over 1 s, and every second of `sheet.jpg` shows change. Length is 55 to 75 s.
- **7:** 2.5 to 4 cuts per 10 s, or one still stretch of 1 to 2.5 s, or a length of 45 to 55 s or 75 to 90 s.
- **4:** under 2.5 cuts, or stills of 2.5 to 5 s.
- **0 to 2:** long dead stretches.

## Verdict

**GOOD** needs every row at 7 or more and a total of 56 or more out of 70. Anything else is **ASS**: name the lowest row, and say "looks cheap" plainly if R3 is under 7.

Then give the 3 fixes that would raise the score the most. Each one names its row, says what you saw and where (a second, a tile or a file), and says exactly what to change.

## Answer in exactly this form

| # | row | score | what you saw |
|---|---|---|---|
| R1 | hook | n | ... |
| R2 | premise | n | ... (rounds: n; best fact: "...") |
| R3 | look | n | ... (faults: ...) |
| R4 | motion | n | ... |
| R5 | captions | n | ... |
| R6 | voice and sound | n | ... |
| R7 | pacing | n | ... |

**TOTAL:** n / 70

**Verdict:** GOOD, or ASS (the lowest row and why)

**Top 3 fixes:**
1. ...
2. ...
3. ...
