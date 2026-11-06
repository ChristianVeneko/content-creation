# The worked example: "This Cloud Weighs 100 Elephants!"

**The Short:**
- 55.9 s, 167 words at 179 words a minute;
- 20 scenes (one every 2.8 s) and 49 caption chunks;
- the puzzle shape: an impossible-sounding fact, "So how...?", the numbers, the why, the twist, and the payoff in the first line's words.

**The files:**
- `sources.md`: every fact, where it is used and its source (USGS, Scientific American, NASA, UW-Madison), plus what was left out.
- `script.json`: the 14 lines with the caption chunks cut by hand (`|`) and the title card.
- `shots.json`: the 20 scenes, each with its transition and its beats (the words where labels pop).
- `scenes/scenes.js`: every scene, plus the props drawn just for this Short (a glass, an umbrella, rain, air molecules) and the 7:8 framing (`window.FIT78`).

**To build it yourself:** copy this folder into an empty folder, then run the commands from SKILL.md steps 3, 4, 6 and 7 there: `narrate.py`, `plan.py`, the four `render.py` runs, `sound.py`, `encode.py` and `check.py`. It takes about 12 minutes on a 6-core CPU.
