# The format: animated flat-vector science Shorts, measured

The reference is the biggest flat-vector science channel on YouTube (25.8M subscribers; its 40 newest Shorts all got 539K-5.2M views, median 1.3M, read 2026-11-04). Four of its top recent Shorts (3.6M-5.2M views) were studied frame by frame: contact sheets at 1 frame a second, faster-whisper transcripts with word times, scene-change and motion counts, and loudness. Every number below comes from those four. We copy the format, never the channel's name, characters, music or footage.

## 1. The numbers

| | The references | What the skill aims for |
|---|---|---|
| Length | 67-78 s | 45-80 s (the example: 55.9 s) |
| Words | 201-213 | 130-230 |
| Pace (words over total length) | 164-180 wpm | 165-180 (Kokoro voice 2 at speed 0.9, gap 0.36: 179) |
| Voice starts | 0.0 s, on the first frame | 0.05 s |
| After the last word | 0.3-1.1 s, then it ends | about 0.8 s |
| Loudness | -11.8 to -12.8 LUFS | -12 master, -14 for X |
| Scenes | 22-27 a video, a new one every 2.6-3.3 s | 15-25, every 2.5-3.5 s |
| Big picture changes (cuts, pops, wipes) | 19-30 a minute | 20-30 |
| Frames with motion | 67-85 % | everything moves |
| Longest stretch with nothing moving | 1.1-2.4 s | under 1 s |
| Music in the pauses | only 1.3-5.7 dB under the speech level | a present bed, ducked about 5 dB under the voice |

## 2. The script

**Line 1 is the title, said out loud.** A short claim or question, 4-10 words, over the title card from 0.0 s:
- "Something in your kitchen killed you."
- "We're running out of water."
- "Being poor is expensive."
- "Who's the world's most average person?"

**Then one of four shapes:**
1. **The suspects list.** Escalating items, each with its mechanism and its dose ("Around 500 teaspoons will turn you blue..."), then the twist item ("But the deadliest killer in your kitchen is bananas.") and a joke button ("Case closed.").
2. **The character build.** A question, then stats that stack onto one character (stat tags pile up beside them), then the twist (the answer keeps changing).
3. **The trap.** A claim, "Here's how the trap works", a chain where each step causes the next, the bigger picture, the way out.
4. **Crisis, then hope.** A scary number, its causes, its consequences, "But the situation isn't hopeless", what it would cost, and a hopeful last line with an everyday price ("for the price of a coffee a week").
- And the example's: **the puzzle.** An impossible-sounding fact, "So how...?", the numbers, the why, the twist, the payoff in the first line's words.

**Rules that hold in all four:**
- Every sentence is one picture: a thing you can draw doing something.
- Big numbers are translated into everyday objects: 437 trillion bananas, 26 sugar cubes, a coffee a week, 100 elephants.
- "You" and "your" throughout. No "in this video", no call to action, no subscribe line.
- Hinge words keep it moving: But, So, And, Besides, Until, Meanwhile, Even.
- The last line is short and lands the idea or a joke, and the video ends within a second.
- Plain words. Sentences of 8-20 words; a 2-word sentence for a beat ("It does.").

## 3. The picture

**The title card (0-2 s).** The hero image fills the frame (a person slumped at a kitchen table, the Earth with a tap, a worried man with price tags). On top sits the title in 2-3 lines of heavy rounded type: white with a thick dark-purple outline, or black on a tilted yellow strip. One word is bigger or yellow. The line it says isn't captioned while the title shows.

**Backgrounds.** Vertical gradients in saturated pairs, a different one for each scene:
- orange to yellow;
- purple to magenta;
- blue to cyan;
- deep navy for data and the microscopic;
- sky blue over green hills for outdoors.

A big soft disc (a spotlight) often sits behind the subject.

**Shapes.** Flat fills, no outlines:
- a darker crescent on the side away from the light, and a thin light rim on the side toward it;
- soft glows behind anything important;
- small round highlights on shiny things.

**Characters:**
- simple people (round heads, dot eyes, readable expressions: shock, worry, sweat, a smirk);
- objects with faces and small limbs (a sugar box, a banana, a cloud, the sun);
- the same "you" character returning through the video.

**Labels** pop in on their word with an overshoot:
- **The tag:** a slightly tilted yellow block with heavy black capitals for names and big numbers ("SUGAR", "437 TRILLION BANANAS").
- **The pill:** a rounded purple pill with white bold text for data labels, often two lines ("People Affected by Drought" / "1.8 Billion").
- **Stat stacks:** coloured tags flush to the left edge that pile up as facts are added ("165 cm", "31 Years", "Mandarin").
- **Counters** that roll (gallons, kcal), pie charts that build, calendars that flip.
- A small disclaimer pill at the top when a fact needs it ("According to rat studies – human responses may differ!").

**Devices, roughly in order of how often they appear:**
- the magnifier inset (a ringed circle with a pointer into the body, the blood, a molecule);
- objects popping in one per word;
- the x-ray or cross-section (a body, the ground and its aquifer);
- comparisons (stacks, scales, side-by-side arrows);
- maps in dark navy with glowing outlines and pins;
- a running visual joke (crime-scene tape and a chalk outline for "killed you", a banana behind bars for "Case closed");
- isometric diagrams;
- weather and landscapes for the outdoors.

**Motion:**
- Every shot pushes in or drifts.
- Characters bob and blink, labels pop, numbers count.
- Transitions are mostly hard cuts on the word, plus pushes, zoom-throughs into a detail, and slides.
- Never a slow crossfade.

## 4. The captions

- White, a rounded geometric sans at medium-bold weight, about 48-50 px on a 1080 px frame: small, not the big punchy captions of other formats.
- A thin dark outline and a soft shadow, no box, no word highlight, no animation.
- Centred at y ≈ 1505 of 1920 (78 % down).
- 2-4 words a chunk (sometimes 5), cut on the speech, punctuation kept ("but it can be lethal:", "liver cells.").
- Line 1 is usually not captioned while the title card says it.

## 5. The sound

- **The voice:** calm, warm and clear, slightly amused, steady pace, never shouting.
- **The music:** a warm synth bed (soft pads, a mallet or pluck arpeggio, a light pulse) that stays present: in the pauses it sits only a few dB under the voice.
- **The sound design:** a small sound on almost every new thing. Pops for labels, whooshes for transitions, bloops for liquids, a ding for a payoff, a low thud for something heavy, a riser before a reveal.
- **No silence**, start to end.

## 6. How the skill rebuilds it (all free, all code)

| Piece | How |
|---|---|
| Pictures | SVG drawn by `scenes/scenes.js` with `renderer/flat.js`, screenshotted frame by frame in headless Chrome, CPU only |
| Shading | `F.blob`: a flat fill plus a shadow crescent and a light rim made with two masks; `F.glow`, `F.rays`, `F.bokeh` for light and depth |
| Labels | `F.tag`, `F.pill`, `F.stack`, `F.counter`, `F.title`, `F.bubble`, `F.dimension`, timed to words with `F.pop(t, sh.beats.name)` |
| Devices | `F.inset` (magnifier), `F.balance`, `F.cube` (isometric), `F.arrow` (fat, curved, drawn on), `F.ruler`, `F.stopwatch` |
| Cast | `F.person`, `F.face` (put eyes and a mouth on anything), `F.cloud`, `F.drop`, `F.sun`, `F.hills`, `F.elephant` |
| Transitions | `Flat.render` from `shots.json`: cut, slide, slide_left, zoom, iris, whip, pop |
| Voice | Kokoro-82M, `am_liam+am_puck`, local and free; or your own recording through `import_voice.py` |
| Captions | faster-whisper word times, chunks cut by hand with `\|`, burned in by `encode.py` in the style of section 4 |
| Sound | `sound.py`: the music, the pops, whooshes, bloops, rain and wind, all synthesized with numpy |
