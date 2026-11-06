# CLAUDE.md: make ONE "How a Hole in Your Yard Becomes a ___" 3D Short (free tools only)

You are Claude Code, and this folder is a one-video studio. Follow this file top to bottom. You'll make **one** finished vertical 3D explainer Short, 60 to 75 seconds, in the format that took one new page from zero to 57 million TikTok views in 18 days (its first video, "How a Hole in Your Yard Becomes a Swimming Pool", has 13.1M on TikTok and 7.7M on YouTube).

The format:
- A suburban house and a striped lawn sit above a block of soil cut open like a cake, so we see underground in cross-section.
- A calm male narrator "builds" an everyday thing step by step: "If you dig a hole in your yard and fill it with water, you have a pool. But... So you... This is a ___."
- One word of caption at a time, mid-screen.

**Hard rules**
1. **One video.** No series, no "part 2", no channel plan. One video that is as good as the best one on that page.
2. **Free only.** Blender, Python packages, the Kokoro voice model and CC0 assets from Poly Haven. Nothing that needs an account, an API key, a card or a login. If something asks for one, stop and use the free path here.
3. **Voice: Kokoro `am_michael`.** It's the calm male narrator voice. If Kokoro fails, fix the install (step 1). The script falls back to other voices by itself, but a fallback voice is a failed video; `check.py` fails it.
4. **True facts only.** Every "But" and every "This is a ___" must be real engineering. If you're not sure a fact is right, cut it.
5. **Never paint over problems.** If a frame looks broken, fix the scene and re-render it. Captions and music don't hide anything.

Times below are for a PC with an RTX 3070. Slower GPUs take longer, but every step works on any GPU or Apple Silicon.

---

## 1. Setup (10 to 15 min, once)

1. Make the folders: `kit/`, `story/`.
2. Save this whole guide as `CLAUDE.md` in this folder (if it isn't already), then unpack the kit and the worked example from it with this exact snippet. Don't retype the files: one wrong character breaks a render 40 minutes in.
   ```python
   import os, re
   t = open("CLAUDE.md", encoding="utf-8").read()
   for name, body in re.findall(r"^`((?:kit|examples)/[\w./]+)`
```\w*
(.*?)
```", t, re.S | re.M):
       os.makedirs(os.path.dirname(name), exist_ok=True)
       open(name, "w", encoding="utf-8").write(body + "
"); print("wrote", name)
   ```
   It must print 10 files: 8 in `kit/` and 2 in `examples/pond/`.
3. Python 3.10 or newer. Create a virtual environment in this folder and install the packages:
   - Windows: `python -m venv .venv` then `.venv\Scripts\python -m pip install kokoro-onnx soundfile faster-whisper edge-tts numpy pillow imageio-ffmpeg`
   - Mac / Linux: `python3 -m venv .venv` then `.venv/bin/python -m pip install ...` (same list).
   - Below, `PY` means that venv's python.
4. Blender: run `PY kit/blender_path.py`. It prints the path of a Blender 4.2+ it found, or downloads the free portable Blender 5.2 into `./blender/` (about 350 MB, no account). Below, `BLENDER` means that path. On a Mac with no Blender, install it from blender.org first.
5. Assets: `PY kit/fetch_assets.py`. It downloads about 570 MB once:
   - the Poly Haven sky, textures and models (CC0);
   - the Nunito font (OFL);
   - the Kokoro voice model (Apache-2.0).

   Run it again if anything failed.
6. Smoke test: `BLENDER -b --factory-startup --python kit/build.py -- story_test --stills 0.5` (with the two-line `story_test/` from section 6.1). One JPG of the yard should appear in `story_test/stills/`. Open it.

## 2. Pick the premise (10 min)

Pitch **10** everyday things that can be "built" in or under a backyard, then score each 1 to 5 on these five points:
- **Everyone has one or has seen one**, and has wondered how it works. Toilets and pools beat bank vaults.
- **There are 5 to 7 real "But" problems**, each with a real fix that has a name ("This is a hydrostatic valve").
- **There's one "huh" fact**, the kind people repeat to a friend. "That pipe on your roof is not a chimney, it's how your toilet breathes."
- **It can be shown with the kit**: holes, boxes, pipes, water, layers, arrows, flows, moving parts. Things that happen underground or in the yard work best.
- **The last shot is satisfying**: a finished, pretty thing.

Skip what the original page already made: swimming pool, toilet, septic tank, running water (well), refrigerator, fireplace, road, roof, air conditioner, washing machine, stove, shower, dishwasher, clothes dryer, central heating, house electricity, garage door, foundation, hot tub, front door, vending machine, water tower, car wash, gas station, sprinkler system, escalator, fire hydrant, roller coaster, storm shelter, bank vault, bowling alley, traffic light, ATM, railroad crossing, claw machine, tower crane, soft-serve machine, automatic door, garbage truck, ice rink, elevator, airport baggage system, concrete mixer truck, airplane toilet, water slide. Also skip the pond: it's this kit's worked example.

Ideas that fit: a basement, a rainwater cistern, a compost heap, a root cellar, a geothermal heat pump, a French drain, a fence post (frost heave!), a driveway that doesn't crack, a sinkhole repair, a koi-free wildlife pond, a retaining wall, a buried oil tank, a lightning rod and ground. Write your 10, keep the top scorer, and give the reason in one line.

## 3. Write the script (15 min): `story/script.json`

The engine of every video in this format:

1. **Line 1:** "If you [the naive way], you have a [thing]." The naive way is concrete and a bit funny: dig a hole, fill it with a hose.
2. **5 to 7 rounds** of
   - "But [a real failure, said as a picture]." (by morning the water has soaked into the dirt)
   - "So you [the real fix]." (lay a rubber sheet over a bed of sand)
   - "This is a [named part]." (a liner)

   Each failure is caused by the last fix or by nature, never random. Not every round needs the "This is" line, but at least 4 do.
3. **One twist:** "And that [everyday sign] is not [what people think]. It is [the truth]." Or an equally surprising "because" fact (water is heaviest at four degrees).
4. **The end:** "Add [2 small finishing touches]. Congratulations, you have built a [thing]."

Length: **240 to 270 words.** At Kokoro speed 1.22 that's about 66 to 74 s. Words only: say numbers the way they're spoken ("four degrees", "two feet"). Short plain sentences. No "imagine", no "let's", no questions.

Then a **fact-check pass**. List every claim, mark each one sure or unsure, and rewrite or cut every unsure one. Keep the list in `story/facts.md`.

Four rules from blind ratings of earlier runs:
- **Every fix solves its own problem.** "Roots grow in, so you flush it with a hose" fails: a hose doesn't stop roots.
- **Name the part in at least 4 rounds** ("This is a first-flush diverter"). Give those lines `"pause": 0.3`, so the name lands before the next sentence.
- **Keep the last line short and on topic:** "Add [one finishing touch]. Congratulations, you have built a [thing]." No tangents and no fragments.
- **No round without a picture.** If you can't show it with the kit, cut it.

Format: one beat per line, each with a short unique `id` (you'll key the animation to it):
```json
{ "title": "How a Hole in Your Yard Becomes a Pond", "voice": "am_michael", "speed": 1.22,
  "lines": [ {"id": "open", "text": "If you dig a hole in your yard and fill it with a hose, you have a pond."},
             {"id": "leak", "text": "But by morning, the water has soaked into the dirt, and the hole is empty again."} ] }
```

## 4. Voice (2 min): `PY kit/voice.py story`

This writes `story/narration.wav` and `story/timing.json` (every word's start and end, measured). Check the last lines it prints:
- `voice: kokoro` (anything else means the install is broken: fix step 1, don't continue);
- 64 to 76 s.

If it's too long, cut words. Don't speed the voice up past 1.25.

## 5. Build the scene (the main work, 45 to 90 min): `story/scene.py`

`scene.py` has one function, `build(W, T)`. `W` is the kit (`kit/world.py`), `T` is the timing. It builds the 3D world, animates it on the narration, and returns the camera shots. The pond example in section 8 is a complete, working scene: read it fully before writing yours. It shows every technique below.

### 5.1 The world
- **Units and axes.** Metres, Z up, the lawn at z = 0.
- **The cut face is the plane y = 0.** The camera always stays at y < 0 and looks toward +y. Underground things show only when they touch the cut face (y between 0 and about 0.05) or sit inside an open hole. A pipe meant to be seen in the soil runs at y = 0.02. A tank cut open shows its inside when it starts at y = 0.
- `W.yard()` builds the standard set:
  - the soil block, 30 x 16 x 16 m, cut open at y = 0;
  - the striped lawn;
  - the two-storey house (front wall at y = 9.8, spanning x -5.2 to 6.3);
  - the patio at y 7 to 9.7;
  - the neighbours, the back fence, trees, shrubs, a gnome and pots.

  Keep your build between x -6 and 6, y 0 and 6.
- **Holes.**
  - `W.hole(name, ("box", (sx, sy, sz)), loc=(x, y0, 0), t0, t1)` digs a box hole from the lawn down, opening through the cut face.
  - `("prism", profile, depth)` digs any cross-section, e.g. a stepped pit. A profile is a list of (x, z) points going around the outline, with the top points at z = 1.0 so the cut starts above the lawn.
  - With `t0`/`t1` it's dug on screen, with flying dirt clods and a growing dirt pile: `extra=dict(pile=(x, y), start=0.3, arc=1.3)`.
    - `start` makes frame 1 show a hole already part dug.
    - `arc` is how high the clods fly, in metres. Keep it low, so they visibly come out of the hole and not past the upstairs windows.
- **Organic holes** (ponds, craters, sinkholes, anything natural). A rectangle reads as a man-made pool, so keep box holes for built things (tanks, footings, basements).
  - `OUT = W.blob(cx, cy, rx, ry)` is a natural outline. Put its centre close behind the cut face (`cy` about 0.6), so the cut passes through the deep middle.
  - `W.pit(name, OUT, levels, t0, t1, extra)` digs it, with levels = `[(scale, depth), ...]`, e.g. `[(1.0, -0.04), (0.95, -0.38), (0.72, -0.42), (0.6, -1.3)]` for a plant shelf and a deep middle.
  - `W.pit_shell(name, OUT, levels, thick, mat, inset=)` is a lining (sand, rubber, concrete). `W.pit_liquid(name, OUT, levels, mat, keys, inset=)` is the water: it returns body, level box and shape.
  - `W.pit_cap(name, OUT, z, thick, mat)` is ice or a lid. `W.inside(OUT, scale, n)` gives spread-out points (lilies, plants), `W.outline_points(OUT)` gives the edge (stones), and `W.clip_to(layer, shape)` keeps a cut-face layer inside the water.
  - The example pond uses all of these.
- **Things.**
  - `W.box`, `W.cyl`, `W.sphere` and `W.prism` make shapes. Box and cylinder pivots sit at the bottom by default.
  - `W.pipe(name, points, r, mat, t0, t1)` makes a pipe through 3D points, growing along its path during t0 to t1.
  - `W.instance("asset", loc, scale, rot_z)` places a Poly Haven model. Real sizes: `rock_09` is a 14 cm pebble, so scale it 4 to 10; `rock_moss_set_01` is an 8 m rock garden, so scale it 0.3; `grass_medium_01` is a 5.6 m row of grass clumps; `island_tree_01` and `tree_small_02` are 5 m trees; `garden_gnome` is 0.6 m.
  - `W.lining(name, profile, back, thick, mat, t=)` is a shell lying on a hole's walls: a sand bed, a liner, a concrete shell. `W.inset(profile, d)` shrinks a profile.
  - `W.liquid(name, profile, back, W.M("water"), [(t, surface_z), ...])` fills a container. The level moves between keys, and the cut face shows the water in section.
  - `W.overlay(name, (x0, x1, z0, z1), mat, t0, t1, how, cut=hole)` lays a tinted patch on the cut face: wet soil, groundwater, heat, cold layers. `cut=` keeps it off an open hole.
- **Materials.** `W.M(key)` has:
  - photo materials: soil, grass (with a SNOW factor), plaster, roof, concrete, gravel, pavers, wood, brick, mud, sand, rock, rust, steel;
  - water: water (depth-shaded, with moving caustics and ripples, and an ALGAE factor that turns it murky green), ice (frosted and cracked), flow (water droplets), falls, foam;
  - pipes and fabrics: drainpipe (black corrugated with holes), fabric, fabric_black;
  - plastics and paints: pvc, green_plastic, blue_plastic (textured), glass, trim, black_rubber, tar, copper, red, orange, white, leaf;
  - helpers: arrow, arrow_blue, arrow_red, groundwater, wet, air.

  Make your own with `W.plastic_mat(name, (r, g, b))` (tanks, boxes, pumps), `W.foam_mat(name, (r, g, b))` (sponges, insulation), `W.tex_mat(name, folder, size, tint=)` (any Poly Haven texture in assets/tex) or, for small parts only, `W.flat(name, (r, g, b), ...)`.
- **Gravel.** `W.gravel(name, ((x0, x1), (y0, y1), (z0, z1)), t=)` makes a gravel bed with hundreds of real 3D stones on its cut face and top. Never show gravel as a flat textured box.

### 5.2 Animation: every line gets an event that lands on its key word
- **Timing.**
  - `T["id"]["start"]` and `T["id"]["end"]` give a line's start and end.
  - `T.word("id", "word")` gives the moment that word is spoken. Key events to words: the liner drops on "sand", the fish arrive on "fish".
  - `T.end` is the video's end.
- **Arrivals.** `W.appear(obj, t, how)` with `pop | grow_z | rise | drop | slide_x | slide_y`. Nothing should just appear; `drop` adds a thud sound by itself. `W.vanish(obj, t, "pop" | "sink")` takes it away. `W.hide_from` / `W.show_from` toggle it.
- **Moves.**
  - `W.move(obj, t0, t1, loc=, rot=, scale=)` glides it.
  - `W.follow(obj, t0, t1, fn, face="xy")` drives it along any path you write as `fn(s) -> (x, y, z)`: swimming fish, a rolling ball, a truck. `face="xy"` keeps it level while it turns; `face=True` also pitches it up and down.
  - `W.level(obj, [(t, fraction)])` raises or lowers anything with its pivot at the bottom (fill, a coat of tar, ice).
- **Explaining forces.** These are the format's signature: white or blue block arrows that push, and water that streams through pipes.
  - `W.arrows(name, [starts], direction, t0, t1)`
  - `W.flow(name, points, t0, t1, n, size)` streams droplets stretched along their path. For a pour, use 10+ drops of size 0.025 to 0.04. For air, use `mat="air"`.
- **Effects.**
  - `W.bubbles`, `W.swarm` (insects, bacteria), `W.rain`, `W.chunks` (a cave-in).
  - `W.key_value(material_or_world, node, [(t, value)])` animates a factor: `W.M("water")` "ALGAE", `W.M("grass")` "SNOW", the world's "SKY" brightness.
- **Sound.** `W.sfx(kind, t, vol, dur)` with dig, thud, pop, splash, pour, bubble, whoosh, click, hum and chime. Use 5 to 15 cues; digging adds its own.

### 5.3 Camera: cut every 1.5 to 2.5 s, always moving
- `W.view(kind, F, t0, t1, push=0.1, slide=0.4)` is one shot around a focus point `F`, gliding in by `push` and sideways by `slide`. The kinds:
  - **wide:** the house, lawn and section, the classic frame;
  - **section:** the cut face head-on;
  - **close:** near the action;
  - **left / right:** three-quarter views;
  - **high:** looking down into the hole;
  - **house:** lawn level, looking at the house and sky.
- Return a list of shots that covers 0 to `T.end` with no gaps. Give each line 1 to 3 shots, new framing on each new action, and alternate the slide direction. Most shots should show the lawn edge with the section below and the house above. Close shots are for details.
- **The first shot** is `wide`, with the dig (`start=0.35`) already throwing dirt in frame 1. Put the dirt pile in frame (`pile=(x, y)` within about 4 m of the hole), so the clods fly out of the hole and onto it.
- **The last shot** starts on "Congratulations". Make it a push-in on the finished thing that ends within 1 to 2 s of the last word: the video ends 1.0 s after the voice.

### 5.4 Look rules: what blind raters called "cheap" in earlier runs (all are fixable)
1. **Anything bigger than a hand needs a real material:** a photo texture, `plastic_mat`, `foam_mat` or water. A flat colour on a tank, a box, a slab or a pipe is the most common reason a run failed.
2. **Water is always `W.M("water")`, inside `W.liquid` or `W.pit_liquid`** (they keep it inside its hole and behind the cut face). A free water plane pokes through the section, and raters count that as a fault. Puddles on the lawn are a darker, glossier patch of grass, not glass discs. Never show water as an opaque grey or white slab. Show muddy water with the ALGAE factor or a brown `W.tex_mat` on a liquid, not a flat colour.
3. **Streams are `W.flow` droplets, never white balls.** Bubbles stay small (`W.bubbles`, 2 to 4 cm).
4. **Don't tint the whole soil block** (blue for groundwater, dark for wet). Use `W.overlay` on a band, with a clear top edge (the water table) and arrows. Most of the photo soil stays visible.
5. **Debris and stones are irregular:** `W.instance("rock_09", ...)` at scale 3 to 8, `W.gravel`, or the dig's clods. No smooth pills, cubes or spheres standing in for leaves or droppings: if you can't make it look real, show it with arrows and a word instead.
6. **Animals and people only if they hold up at full size.**
   - Give each one its own lane, so no two ever touch, and keep them level with `face="xy"`.
   - Build fins and tails into the body mesh as shaped triangles, like the koi in the example. Never stick thin boxes or planes on as fins: they render as opaque squares, and raters count that as a fault.
7. **Keep the key detail out of the caption band.** Captions sit at 52% of the height, so frame each shot with the subject above or below that line.
8. **Natural things get natural shapes:** a pond is a `W.blob` pit with sloped shelves and stones on its edge, not a rectangle.
   - Lily pads and leaves get the notch, a leaf texture and a random turn each.
   - Water stays subtle: faint caustics, murk you can see into, and particles only inside the water volume. Keep a swarm's radius smaller than the water it sits in.
9. **Frame 1 is the thumbnail.** Start the dig well along (`start=0.5`), and scatter loose clods (small `W.sphere(..., "soil", noise=0.7)`) on the pit floor until the first lining goes in. A smooth, empty pit reads as a clay dish.
10. **Everything connects.** Every pipe ends in something: a tank wall (add a short collar, `W.cyl`, where it enters), a pump, a pit or the open air above the lawn. Never end a pipe in mid-soil. Every lid has a riser down to its tank. Raters take 2 points off for each floating or unconnected part.
11. **Rain and effects stay above ground and behind the cut face.** `W.rain` already does this; keep your own particles at y > 0.3 when they fall from the sky.

## 6. Look at stills before rendering anything long (loop until right)

```
BLENDER -b --factory-startup --python kit/build.py -- story --stills 0.5,4,9,15,22,30,38,46,55,63,70
```
Write a contact sheet (PIL, 6 per row) and **look at it**. Check every tile:
- [ ] The main subject is big enough to read on a phone, and the section (cut face) is visible in most frames.
- [ ] Nothing important is hidden inside the soil (y > 0.05 underground is invisible unless a hole is open there).
- [ ] No grey or pink untextured objects, nothing floating or sinking through something else, no flickering stripes where two surfaces overlap (move one by 1 to 2 cm).
- [ ] The water reads as water and the arrows point the right way.
- [ ] It looks as real as a game render: photo textures, soft light, contact shadows. A toy look fails.

Fix `scene.py`, render the stills again, and repeat. When it's right, run a fast half-size preview to check the motion. Use 5 to 10 stills at different times; a full-size still takes 2 to 5 s.

### 6.1 The two-line smoke-test story (step 1.6)
`story_test/timing.json`:
```json
{"voice_end": 4.0, "engine": "test", "lines": [{"i": 0, "id": "a", "text": "test", "start": 0, "end": 4, "words": []}]}
```
`story_test/scene.py`:
```python
def build(W, T):
    W.yard(); W.hole("pit", ("box", (4, 3, 1.5)), loc=(0, 0, 0))
    return [W.view("wide", (0, 1.2, -0.5), 0, T.end)]
```

## 7. Render, sound, finish, check (about 1 h on an RTX 3070, mostly unattended)

```
BLENDER -b --factory-startup --python kit/build.py -- story --preview     # half size, 8 samples: ~20 min. Optional but worth it.
BLENDER -b --factory-startup --python kit/build.py -- story --final       # 1080x1920: ~1.5 s per frame, ~55 min for 73 s
PY kit/sound.py story          # music bed + sound effects + voice -> mix.wav at -14 LUFS
PY kit/finish.py story         # captions -> story/final.mp4 (1080x1920) and story/final_x78.mp4 (1008x1152 for X: the whole frame, black sides)
PY kit/check.py story          # PASS or a list of problems; also writes story/qa_sheet.jpg
```
- A stopped render resumes where it stopped: frames already on disk are skipped. If you change `scene.py` after a render, delete `story/frames/` first. After a crash, delete the last frame (it may be half-written).
- `--cuts` re-renders just the first two frames of every shot, if you only fixed something that shows at the cuts.
- To watch the preview: `PY kit/sound.py story`, then `FRAMES=story/preview_frames PY kit/finish.py story` (Windows PowerShell: `$env:FRAMES="story/preview_frames"; PY kit/finish.py story`). It writes `story/final.mp4` from the preview frames; run `check.py` on it and look at `qa_sheet.jpg` before the long final render.
- `check.py` must print PASS. Then open `qa_sheet.jpg` (a frame every 0.5 s) and look at every tile for broken frames, clipped captions and dead stretches. If anything is wrong, fix it, delete the affected frames and re-render only those frames: `--range START-END` (frame = seconds x 30 + 1).

## 8. Before you call it done: the rater

Score the video the way a harsh viewer would, each row 0 to 10. **Done means every row is 7 or more.**

1. **Hook:** frame 1 shows action in the yard (dirt flying), and the first word is on screen at 0 s.
2. **Premise:** 5+ real problem/fix rounds with named parts, plus one "huh" fact.
3. **Look:** as real as the reference: photo textures, soft light, no toy-like flat shapes on the main subject, no render faults.
4. **Motion:** the camera moves in every shot, and things arrive with animation.
5. **Captions:** one word at a time, 3 to 4% of the frame high, readable everywhere, in sync.
6. **Voice and sound:** Kokoro am_michael, from 0 s to within 3 s of the end, 190 to 260 wpm, -14 LUFS, no gaps.
7. **Pacing:** 4+ cuts per 10 s, no still over 1 s, 55 to 75 s long.

Any row under 7: fix the cause and re-render the affected seconds.

Deliver `story/final.mp4` and `story/final_x78.mp4`, with a one-line caption for the post: the title plus one hashtag line (#engineering #howitworks).

### 8.1 The worked example: `scene.py` for "How a Hole in Your Yard Becomes a Pond"
`examples/pond/script.json`
```json
{
 "title": "How a Hole in Your Yard Becomes a Pond",
 "voice": "am_michael",
 "speed": 1.22,
 "lines": [
  {
   "id": "open",
   "text": "If you dig a hole in your yard and fill it with a hose, you have a pond."
  },
  {
   "id": "leak",
   "text": "But by morning, the water has soaked into the dirt, and the hole is empty again."
  },
  {
   "id": "liner",
   "text": "So you lay a rubber sheet over a bed of sand, so the stones can't poke through. This is a liner."
  },
  {
   "id": "green",
   "text": "But a week of sun turns the water green, because algae feed on light and on whatever rots at the bottom."
  },
  {
   "id": "plants",
   "text": "So you add lilies to shade it, and plants that eat the same food. Starve the algae, and the water clears."
  },
  {
   "id": "mosq",
   "text": "But still water is a nursery for mosquitoes."
  },
  {
   "id": "fish",
   "text": "So you add fish, and they eat the larvae before they can fly."
  },
  {
   "id": "air",
   "text": "But the fish use up the oxygen in the water."
  },
  {
   "id": "falls",
   "text": "So you add a pump that lifts the water to a little waterfall, and every splash mixes air back in."
  },
  {
   "id": "poop",
   "text": "But fish poop, and their waste turns into ammonia, which poisons them."
  },
  {
   "id": "filter",
   "text": "So the pump pushes it through a box of sponges, where bacteria turn the ammonia into plant food. This is a biofilter."
  },
  {
   "id": "winter",
   "text": "But then winter comes, and the pond freezes over."
  },
  {
   "id": "four",
   "text": "And the fish survive, because water is heaviest at four degrees. The coldest water floats up and freezes, and the deep end stays at four degrees all winter."
  },
  {
   "id": "deep",
   "text": "That is why every pond needs a deep end."
  },
  {
   "id": "gas",
   "text": "But rotting leaves make gas that gets trapped under the ice. So a small floating heater keeps one hole open. This is a de-icer."
  },
  {
   "id": "end",
   "text": "Add stones around the edge. Congratulations, you have built a pond."
  }
 ],
 "pause": 0.08
}
```

`examples/pond/scene.py`
```python
"""How a Hole in Your Yard Becomes a Pond: the 3D scene, keyed to the narration (T)."""
import math, random
from mathutils import Vector

R = random.Random(3)
BACK = 3.1                                   # the pond's back edge (y); the cut face (y=0) slices it near its middle
CY = 0.6                                     # centre of the pond outline (y)
PROF = None
# an organic garden pond: a wobbly outline seen from above, a plant shelf, then a deeper middle (scale, depth)
LEVELS = [(1.0, -0.04), (0.95, -0.38), (0.72, -0.42), (0.6, -1.3)]
SURF = -0.1                                  # water surface when full
F = (0.0, 0.9, -0.5)                         # camera focus: the middle of the pond section


def koi_material(W, k=0):
    """koi skin: orange, white and a few black patches (a different pattern per fish), fine scales, a wet sheen."""
    name = f"koi_m{k}"
    if name in W.bpy.data.materials: return W.bpy.data.materials[name]
    m = W.bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (k * 3.1, k * 1.7, 0)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 5.0; nz.inputs["Detail"].default_value = 3
    L.new(mp.outputs["Vector"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    el = ramp.color_ramp.elements
    el[0].color = (1.0, 0.33, 0.0, 1); el[1].position = 0.6; el[1].color = (0.97, 0.95, 0.9, 1)
    e2 = el.new(0.7); e2.color = (0.03, 0.03, 0.03, 1) if k % 3 == 0 else (0.96, 0.27, 0.02, 1)
    L.new(nz.outputs["Fac"], ramp.inputs["Fac"]); L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    sc = N.new("ShaderNodeTexVoronoi"); sc.inputs["Scale"].default_value = 90
    L.new(tc.outputs["Object"], sc.inputs["Vector"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    L.new(sc.outputs["Distance"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.25; b.inputs["Coat Weight"].default_value = 0.9; b.inputs["Coat Roughness"].default_value = 0.05
    b.inputs["Subsurface Weight"].default_value = 0.0      # subsurface triples EEVEE render time for no visible gain here
    return m


def koi(W, name, length=0.45, k=0):
    """a koi: a lofted spindle body (head at +x), a forked tail fin and a dorsal fin, orange and white."""
    bm = W.bmesh.new()
    rings, seg, Rr = 18, 14, length * 0.13
    prev = None; first = None
    for i in range(rings + 1):
        u = i / rings                                                  # 0 = tail, 1 = head
        x = -length / 2 + u * length
        r = Rr * max(0.12, math.sin(math.pi * (0.08 + 0.9 * u) ** 0.8)) * (1 - 0.35 * max(0, u - 0.85) / 0.15)
        ring = [bm.verts.new((x, 0.8 * r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
        if prev:
            for k in range(seg):
                bm.faces.new((prev[k], prev[(k + 1) % seg], ring[(k + 1) % seg], ring[k]))
        else:
            first = ring
        prev = ring
    bm.faces.new(list(reversed(first))); bm.faces.new(prev)
    tx = -length / 2
    for zs in (1, -1):                                                  # forked tail
        a = bm.verts.new((tx + 0.02, 0, 0)); b2 = bm.verts.new((tx - 0.24 * length, 0, zs * 0.2 * length)); c = bm.verts.new((tx - 0.14 * length, 0, zs * 0.02 * length))
        bm.faces.new((a, b2, c))
    d1 = bm.verts.new((0.05 * length, 0, Rr * 0.9)); d2 = bm.verts.new((-0.2 * length, 0, Rr * 0.85)); d3 = bm.verts.new((-0.12 * length, 0, Rr * 1.5))
    bm.faces.new((d1, d3, d2))
    for side in (-1, 1):                                                              # pectoral fins, swept back
        p1 = bm.verts.new((0.18 * length, side * Rr * 0.7, -Rr * 0.4)); p2 = bm.verts.new((0.02 * length, side * Rr * 2.0, -Rr * 0.7))
        p3 = bm.verts.new((0.1 * length, side * Rr * 0.7, -Rr * 0.5)); bm.faces.new((p1, p2, p3))
    me = W.bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = W.bpy.data.objects.new(name, me); W.bpy.context.scene.collection.objects.link(ob)
    me.materials.append(koi_material(W, k))
    so = ob.modifiers.new("fins", "SOLIDIFY"); so.thickness = 0.006
    return ob


def lily_mat(W):
    if "lily_m" in W.bpy.data.materials: return W.bpy.data.materials["lily_m"]
    m = W.tex_mat("lily_m", "leafy_grass", 0.5, tint=(0.1, 0.36, 0.04), sat=1.8, bright=0.75, normal=0.6, rough=0.7)
    m.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.2
    return m


def lily(W, name, loc, r=0.32):
    bm = W.bmesh.new(); n = 30
    ring = [bm.verts.new((r * math.cos(0.32 + (2 * math.pi - 0.45) * k / n), r * math.sin(0.32 + (2 * math.pi - 0.45) * k / n), 0)) for k in range(n + 1)]
    c = bm.verts.new((0.03, 0, 0)); bm.faces.new([c] + ring)                      # a disc with the classic notch
    me = W.bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    pad = W.bpy.data.objects.new(name, me); W.bpy.context.scene.collection.objects.link(pad)
    pad.location = loc; pad.rotation_euler = (0, 0, R.random() * 6.28); me.materials.append(lily_mat(W))
    so = pad.modifiers.new("t", "SOLIDIFY"); so.thickness = 0.015
    if R.random() < 0.4:
        fl = W.sphere(name + "_fl", 0.07, (loc[0] + 0.05, loc[1], loc[2] + 0.05), W.flat(name + "_flm", (1.0, 0.75, 0.85), rough=0.5), seg=12)
        return [pad, fl]
    return [pad]


def build(W, T):
    W.yard()
    s = lambda k: T[k]["start"]
    e = lambda k: T[k]["end"]
    shots = []

    # ---- open: dig, then fill with a hose -------------------------------------------------
    OUT = W.blob(0.0, CY, 3.1, 2.6, wobble=0.07)
    cut = W.pit("pond", OUT, LEVELS, t0=0.0, t1=1.7,
                 extra=dict(pile=(-4.0, 1.3), pile_size=1.0, clods=28, start=0.5, arc=1.3))
    hose = W.pipe("hose", [(9.5, 7.5, 0.04), (7.0, 5.5, 0.04), (5.2, 3.0, 0.04), (3.6, 2.2, 0.05), (3.0, 2.0, 0.45), (2.7, 2.0, 0.42)],
                  0.035, W.flat("hose_m", (0.1, 0.45, 0.15), rough=0.4), t0=1.5, t1=2.1)
    W.flow("hose_water", [(2.7, 2.0, 0.42), (2.55, 2.0, 0.1), (2.45, 2.0, -0.5)], 1.9, 3.4, n=6, size=0.05)
    water, lvl, _ = W.pit_liquid("water", OUT, LEVELS, W.M("water"), inset=0.0, keys=
                          [(1.9, -1.4), (3.3, SURF), (s("leak") + 0.6, SURF), (s("leak") + 2.6, -1.4)])
    shots += [W.view("wide", F, 0.0, 1.9, push=0.22, slide=0.6), W.view("left", F, 1.9, 3.45, push=0.18, slide=-0.4)]
    W.sfx("pour", 1.9, 0.45, dur=1.6)

    for i in range(64):                                     # loose dirt on the floor and shelf: it reads as freshly dug soil
        on_shelf = i % 3 == 0
        x, y = (-2.6 + 5.2 * R.random(), 0.15 + 0.9 * R.random()) if on_shelf else (-1.3 + 2.6 * R.random(), 0.2 + 1.4 * R.random())
        z = -0.4 if on_shelf else -1.28
        cl = W.sphere(f"floor_clod{i}", 0.05 + 0.09 * R.random(), (x, y, z), "soil", squash=0.5, noise=0.7, seg=10)
        W.hide_from(cl, T.word("liner", "sand") - 0.4)

    # ---- leak: the water soaks into the dirt --------------------------------------------------
    wet = W.overlay("wet", (-4.2, 4.2, -2.2, 0.0), W.flat("wet_m", (0.08, 0.05, 0.03), rough=0.2, alpha=0.3), s("leak") + 0.6, s("leak") + 2.8, how="out", cut=cut)
    W.vanish(wet, s("liner") + 0.3, "pop", 0.5)
    W.arrows("seep_down", [(-1.2, -0.25, -1.45), (0.0, -0.25, -1.45), (1.2, -0.25, -1.45)], (0, 0, -1), s("leak") + 0.8, e("leak"), length=0.8, mat="arrow_blue")
    W.arrows("seep_l", [(-2.4, -0.25, -0.85)], (-1, 0, -0.3), s("leak") + 0.9, e("leak"), length=0.8, mat="arrow_blue")
    W.arrows("seep_r", [(2.4, -0.25, -0.85)], (1, 0, -0.3), s("leak") + 0.9, e("leak"), length=0.8, mat="arrow_blue")
    shots += [W.view("section", F, s("leak"), s("leak") + 2.0, push=0.1), W.view("right", F, s("leak") + 2.0, e("leak") + 0.1, push=0.12, slide=0.4)]

    # ---- liner: sand bed, rubber sheet, refill ------------------------------------------------
    sand = W.pit_shell("sand", OUT, LEVELS, 0.07, W.M("sand"), inset=0.0, top=0.0, t=None)
    W.appear(sand, T.word("liner", "sand") - 0.5, "drop", 0.6, dist=1.2)
    liner = W.pit_shell("liner", OUT, LEVELS, 0.03, W.M("black_rubber"), inset=0.07, top=0.03, t=None)
    W.appear(liner, T.word("liner", "sand") + 0.4, "drop", 0.6, dist=1.2)
    shots += [W.view("wide", F, s("liner"), s("liner") + 1.7, push=0.12), W.view("section", F, s("liner") + 1.7, s("liner") + 3.4, push=0.08, slide=-0.4),
              W.view("right", F, s("liner") + 3.4, e("liner") + 0.1, push=0.12)]
    # water inside the liner from now on
    W.vanish(water, s("liner") + 0.1, "pop", 0.05)
    water2, lvl2, WSHAPE = W.pit_liquid("water2", OUT, LEVELS, W.M("water"), [(e("liner") - 1.6, -1.4), (e("liner") + 0.2, SURF)], inset=0.1)
    W.sfx("pour", e("liner") - 1.7, 0.45, dur=1.9)
    W.flow("hose_water2", [(2.7, 2.0, 0.42), (2.55, 2.0, 0.1), (2.45, 2.0, -0.4)], e("liner") - 1.8, e("liner") + 0.2, n=6, size=0.05)

    # ---- green: algae --------------------------------------------------------------------------
    W.key_value(W.M("water"), "ALGAE", [(T.word("green", "green") - 0.6, 0.0), (T.word("green", "green") + 0.4, 0.95)])
    W.swarm("algae_specks", (0.0, 0.9, -0.55), T.word("green", "green") - 0.2, T.word("plants", "clears") + 0.2, n=40, radius=0.85,
            mat=W.flat("speck_m", (0.18, 0.35, 0.06), rough=0.8), size=0.014)
    scum = []
    for i, (x, y) in enumerate(W.inside(OUT, 0.8, n=9, min_gap=0.8, seed=11)):     # floating algae scum, gone when the water clears
        sc = W.sphere(f"scum_{i}", 0.35 + 0.25 * R.random(), (x, y, SURF + 0.005), lily_mat(W), squash=0.04, noise=0.5, seg=16)
        W.appear(sc, T.word("green", "green") + 0.1 * i, "pop", 0.4); W.vanish(sc, T.word("plants", "clears") - 0.2 + 0.03 * i, "pop", 0.4)
        scum.append(sc)
    shots += [W.view("house", F, s("green"), s("green") + 1.8, push=0.06, lift=0.6), W.view("section", F, s("green") + 1.8, s("green") + 3.6, push=0.12),
              W.view("left", F, s("green") + 3.6, e("green") + 0.1, push=0.1, slide=0.5)]

    # ---- plants: lilies + shelf plants, water clears -------------------------------------------
    k = 0
    for (x, y) in W.inside(OUT, 0.7, n=6, min_gap=0.9, seed=4):
        for o in lily(W, f"lily{k}", (x, y, SURF + 0.005)):
            W.appear(o, T.word("plants", "lilies") + 0.08 * k, "pop", 0.35)
            W.hide_from(o, T.word("winter", "freezes") + 0.3); W.show_from(o, s("end") + 0.9)
        k += 1
    for i, (x, y) in enumerate(((-2.45, 1.4), (2.45, 1.4))):
        pl = W.instance("grass_medium_01", (x, y, -0.36), 0.45, 1.5708 + (0.6 if x > 0 else -0.6))
        pl.scale = (0.6, 0.6, 1.8)
        W.appear(pl, T.word("plants", "plants") + 0.15 * i, "pop", 0.4)
    W.key_value(W.M("water"), "ALGAE", [(T.word("plants", "clears") - 0.8, 0.95), (T.word("plants", "clears") + 0.3, 0.06)])
    shots += [W.view("wide", F, s("plants"), s("plants") + 2.0, push=0.15), W.view("right", F, s("plants") + 2.0, s("plants") + 3.8, push=0.12, slide=-0.4),
              W.view("section", F, s("plants") + 3.8, e("plants") + 0.1, push=0.12)]

    # ---- mosquitoes ------------------------------------------------------------------------------
    W.swarm("mosq", (0.4, 1.4, 0.55), s("mosq") + 0.2, T.word("fish", "fly") + 0.2, n=18, radius=0.7, size=0.022)
    W.swarm("larvae", (0.0, 0.6, SURF - 0.12), s("mosq") + 0.6, T.word("fish", "larvae") + 0.2, n=14, radius=0.9, size=0.018)
    shots += [W.view("close", (0.3, 1.2, 0.0), s("mosq"), e("mosq") + 0.1, push=0.18)]

    # ---- fish ----------------------------------------------------------------------------------
    fish = []
    t_in = T.word("fish", "fish")
    for i in range(7):
        f = koi(W, f"koi{i}", 0.4 + 0.12 * R.random(), k=i)
        cx, cy = ((-1.15, 0.5), (0.0, 0.45), (1.15, 0.5), (-0.6, 1.35), (0.6, 1.35), (-1.0, 1.95), (1.0, 1.95))[i]
        rr, z0, sp, ph = 0.22, -0.55 - 0.09 * i, 0.06 + 0.02 * R.random(), R.random()
        W.hide_until(f, t_in + 0.1 * i)
        drop_from = Vector((cx, cy, 1.4))

        def win(t, a, b, r=0.6):                                                     # 0 -> 1 -> 0 over [a, b], soft edges
            return max(0.0, min(1.0, (t - a) / r, (b - t) / r))

        def path(u, cx=cx, cy=cy, rr=rr, z0=z0, sp=sp, ph=ph, i=i):
            t = t_in + 0.1 * i + u * (T.end - t_in - 0.1 * i)
            k = 2 * math.pi * (ph + sp * (t - t_in) * 2.0)
            if t < t_in + 0.1 * i + 0.8:                                                  # dropped in from above
                q = (t - t_in - 0.1 * i) / 0.8
                return (cx + rr, cy, 0.9 - (0.9 - z0) * min(1.0, q))
            wa = win(t, s("air") + 0.1, e("air") + 0.3)                                   # gasping at the surface
            wd = win(t, s("four"), s("end") + 0.5)                                         # down in the deep end all winter
            z = z0 * (1 - wa - wd) + (SURF - 0.14) * wa + (-1.12 + 0.025 * i) * wd
            r = rr
            return (cx + r * math.cos(k), cy + 0.6 * r * math.sin(k), z + 0.04 * math.sin(k * 3))
        W.follow(f, t_in + 0.1 * i, T.end, path, face="xy")

        fish.append(f)
    W.bubbles("splash", (0.0, 1.0, SURF), t_in, t_in + 1.0, n=10, rise=0.5)
    W.sfx("splash", t_in + 0.55, 0.6)
    shots += [W.view("right", F, s("fish"), s("fish") + 1.6, push=0.12), W.view("close", (0.0, 0.9, -0.6), s("fish") + 1.6, e("fish") + 0.1, push=0.15, slide=-0.4)]

    # ---- air: fish at the surface -----------------------------------------------------------------
    shots += [W.view("left", (0.0, 1.5, -0.2), s("air"), e("air") + 0.1, push=0.15)]

    # ---- falls: pump, pipe, rocks, waterfall -------------------------------------------------------
    t_p = T.word("falls", "pump")
    pump = W.cyl("pump", 0.22, 0.32, (1.0, 0.4, -1.2), W.M("green_plastic"))
    for j in range(3):
        rib = W.cyl(f"pump_rib{j}", 0.235, 0.025, (0, 0, 0.06 + 0.09 * j), W.M("black_rubber"), verts=32); rib.parent = pump
    grille = W.cyl("pump_grille", 0.12, 0.02, (0, -0.22, 0.12), W.M("black_rubber"), axis="Y", verts=24); grille.parent = pump
    W.appear(pump, t_p - 0.2, "drop", 0.6, dist=2.0)
    route = [(1.0, 0.4, -0.95), (1.0, 0.02, -0.95), (3.7, 0.02, -0.95), (3.7, 0.02, 0.05), (3.7, 2.4, 0.05), (2.4, 3.7, 0.05), (1.2, 3.85, 0.55)]
    W.pipe("pump_pipe", route, 0.065, "black_rubber", t0=t_p + 0.1, t1=t_p + 1.2)
    rocks = []
    rk = W.instance("rock_moss_set_01", (0.9, 4.5, -0.05), 0.33, 0.2)
    W.appear(rk, T.word("falls", "waterfall") - 0.7, "drop", 0.6, dist=2.5); rocks.append(rk)
    t_w = T.word("falls", "waterfall")
    sheet = W.box("fall_sheet", (0.34, 0.02, 0.5), (0.9, 3.15, SURF), W.M("falls"), origin="bottom")
    sheet.rotation_euler = (math.radians(-12), 0, 0)
    W.appear(sheet, t_w, "grow_z", 0.5)
    foam = W.cyl("fall_foam", 0.32, 0.03, (0.9, 2.85, SURF - 0.01), W.M("foam"), verts=32)
    W.appear(foam, t_w + 0.2, "pop", 0.4)
    W.sfx("splash", t_w + 0.2, 0.45); W.sfx("pour", t_w + 0.3, 0.12, dur=T.word("winter", "freezes") - t_w)
    W.hide_from(sheet, T.word("winter", "freezes") + 0.4); W.show_from(sheet, s("end") + 1.0)
    W.hide_from(foam, T.word("winter", "freezes") + 0.4); W.show_from(foam, s("end") + 1.0)
    W.bubbles("fall_bubbles", (0.9, 2.7, SURF - 0.5), T.word("falls", "splash"), T.word("winter", "freezes"), n=14, rise=0.45, spread=0.8)
    W.flow("pump_flow", route, t_p + 1.2, e("filter") + 0.2, n=12, size=0.045)
    shots += [W.view("section", (1.6, 0.6, -0.6), s("falls"), s("falls") + 1.9, push=0.12), W.view("left", (1.0, 3.0, 0.0), s("falls") + 1.9, s("falls") + 3.6, push=0.12),
              W.view("right", (0.8, 2.6, 0.0), s("falls") + 3.6, e("falls") + 0.1, push=0.12)]

    # ---- poop -------------------------------------------------------------------------------------
    for i in range(16):
        p0 = Vector((-1.0 + 2.0 * R.random(), 0.35 + 1.3 * R.random(), -0.45 - 0.3 * R.random()))
        sp = W.sphere(f"poop_{i}", 0.025, p0, W.flat(f"pp{i}", (0.22, 0.14, 0.05), rough=0.8), seg=8)
        st = T.word("poop", "poop") - 0.2 + 0.08 * i
        W.hide_until(sp, st); W.hide_from(sp, T.word("filter", "bacteria"))
        W.move(sp, st, st + 2.5, loc=tuple(p0 + Vector((0.1, 0, -0.7))), kind="out")
    W.key_value(W.M("water"), "ALGAE", [(T.word("poop", "ammonia") - 0.5, 0.06), (T.word("poop", "ammonia") + 0.5, 0.45),
                                        (T.word("filter", "food") - 0.4, 0.45), (T.word("filter", "food") + 0.6, 0.04)])
    shots += [W.view("close", (0.0, 1.0, -0.6), s("poop"), s("poop") + 1.9, push=0.12), W.view("section", F, s("poop") + 1.9, e("poop") + 0.1, push=0.1, slide=0.4)]

    # ---- biofilter: a box beside the pond, cut open -------------------------------------------------
    t_b = T.word("filter", "box")
    fx = 5.3
    filt_cut = W.hole("filter_hole", ("box", (1.6, 1.4, 1.05)), loc=(fx, -0.05, 0.0), t0=t_b - 1.0, t1=t_b - 0.35,
                      extra=dict(pile=(8.2, 3.2), pile_size=0.5, clods=5))
    walls = [W.box("fb_back", (1.5, 0.05, 1.0), (fx, 1.25, -0.95), "green_plastic"), W.box("fb_bot", (1.5, 1.3, 0.05), (fx, 0.62, -0.95), "green_plastic"),
             W.box("fb_l", (0.05, 1.3, 1.0), (fx - 0.73, 0.62, -0.95), "green_plastic"), W.box("fb_r", (0.05, 1.3, 1.0), (fx + 0.73, 0.62, -0.95), "green_plastic"),
             W.box("fb_lid", (1.55, 1.35, 0.05), (fx, 0.62, 0.05), "green_plastic")]
    for wl in walls: W.appear(wl, t_b - 0.3, "drop", 0.6, dist=2.5)
    grav = W.box("filter_gravel", (1.38, 1.18, 0.14), (fx, 0.62, -0.9), "gravel")
    W.appear(grav, t_b - 0.05, "pop", 0.35)
    for j, z in enumerate((-0.74, -0.52, -0.3)):
        sg = W.box(f"sponge{j}", (1.32, 1.12, 0.2), (fx, 0.62, z), W.foam_mat(f"sponge_m{j}", (0.1, 0.28, 0.75) if j % 2 == 0 else (0.12, 0.12, 0.12)))
        W.appear(sg, t_b + 0.15 * j, "pop", 0.35)
    W.swarm("bacteria", (fx, -0.05, -0.52), T.word("filter", "bacteria") - 0.2, e("filter") + 0.3, n=30, radius=0.45, mat=W.flat("bact", (0.35, 0.95, 0.25), emit=1.2), size=0.016)
    W.pipe("to_filter", [(3.7, 0.02, -0.6), (fx - 0.75, 0.02, -0.6)], 0.06, "black_rubber", t0=t_b + 0.2, t1=t_b + 0.7)
    W.pipe("from_filter", [(fx, 0.02, -0.05), (fx, 0.02, 0.06), (fx, 2.0, 0.06), (3.7, 3.0, 0.06)], 0.06, "black_rubber", t0=t_b + 0.5, t1=t_b + 1.1)
    W.flow("filter_flow", [(3.7, 0.02, -0.6), (fx - 0.7, 0.02, -0.6), (fx, 0.02, -0.6), (fx, 0.02, 0.06), (fx, 2.0, 0.06)], t_b + 1.1, e("filter") + 0.2, n=8, size=0.045)
    shots += [W.view("section", (4.4, 0.6, -0.5), s("filter"), s("filter") + 2.3, push=0.12), W.view("close", (fx, 0.4, -0.5), s("filter") + 2.3, s("filter") + 4.6, push=0.15, slide=-0.3),
              W.view("right", (3.0, 1.2, -0.3), s("filter") + 4.6, e("filter") + 0.1, push=0.12)]

    # ---- winter: snow, dim sky, ice ------------------------------------------------------------------
    tw0, tw1 = s("winter") + 0.3, s("winter") + 1.8
    W.key_value(W.M("grass"), "SNOW", [(tw0, 0.0), (tw1, 0.92), (s("end") + 0.2, 0.92), (s("end") + 1.4, 0.0)])
    world = W.bpy.context.scene.world
    W.key_value(world, "SKY", [(tw0, 1.0), (tw1, 0.85), (s("end") + 0.2, 0.85), (s("end") + 1.4, 1.0)])
    sun = W.sun().data
    for t, v in ((tw0, 3.6), (tw1, 2.6), (s("end") + 0.2, 2.6), (s("end") + 1.4, 3.6)):
        sun.energy = v; sun.keyframe_insert("energy", frame=W.fr(t))
    ice = W.pit_cap("ice", OUT, SURF + 0.02, 0.08, W.M("ice"), grow=-0.1)
    W.level(ice, [(T.word("winter", "freezes") - 0.2, 0.0), (T.word("winter", "freezes") + 0.9, 1.0)])
    W.vanish(ice, s("end") + 0.4, "pop", 0.5)
    shots += [W.view("wide", F, s("winter"), s("winter") + 1.4, push=0.08), W.view("left", F, s("winter") + 1.4, e("winter") + 0.1, push=0.12)]

    # ---- four degrees: cold layer on top, the deep end stays at 4 --------------------------------------
    cold = W.overlay("cold_layer", (-3.0, 3.0, -0.42, SURF - 0.1), W.flat("cold_m", (0.75, 0.92, 1.0), alpha=0.4, emit=0.15), T.word("four", "coldest") - 0.2, T.word("four", "coldest") + 0.6, how="down")
    deep = W.overlay("deep_layer", (-2.1, 2.1, -1.3, -0.42), W.flat("deep_m", (0.05, 0.25, 0.8), alpha=0.22), T.word("four", "deep") - 0.2, T.word("four", "deep") + 0.6, how="up")
    W.clip_to(cold, WSHAPE); W.clip_to(deep, WSHAPE)
    W.arrows("cold_up", [(-1.2, -0.3, -0.95), (1.2, -0.3, -0.95), (0.0, -0.3, -1.05)], (0, 0, 1), T.word("four", "floats") - 0.3, T.word("four", "freezes") + 0.4, length=0.55, mat="arrow_blue")
    W.vanish(cold, s("end") + 0.3, "pop", 0.4); W.vanish(deep, s("end") + 0.3, "pop", 0.4)
    shots += [W.view("right", F, s("four"), s("four") + 2.2, push=0.1), W.view("close", (0.0, 1.0, -0.9), s("four") + 2.2, s("four") + 4.4, push=0.12),
              W.view("left", F, s("four") + 4.4, s("four") + 6.6, push=0.1), W.view("section", F, s("four") + 6.6, e("four") + 0.1, push=0.15, slide=0.4)]
    shots += [W.view("close", (0.0, 1.0, -1.0), s("deep"), e("deep") + 0.1, push=0.2)]

    # ---- gas + de-icer ----------------------------------------------------------------------------------
    W.bubbles("gas", (-0.6, 0.8, -1.2), s("gas") + 0.2, s("end"), n=16, rise=1.0, mat=W.flat("gas_m", (0.55, 0.42, 0.2), alpha=0.8), spread=1.4)
    t_h = T.word("gas", "heater")
    heater = W.sphere("deicer", 0.25, (-1.0, 1.2, SURF + 0.12), W.M("white"), squash=0.5, seg=24)
    W.appear(heater, t_h - 0.2, "drop", 0.6, dist=1.5)
    W.sfx("bubble", T.word("gas", "open"), 0.5)
    hole_ring = W.cyl("ice_hole", 0.45, 0.025, (-1.0, 1.2, SURF + 0.01), W.M("water"), verts=40)
    W.appear(hole_ring, t_h + 0.4, "pop", 0.5)
    W.vanish(heater, s("end") + 0.4, "pop", 0.4); W.vanish(hole_ring, s("end") + 0.4, "pop", 0.4)
    W.bubbles("gas_out", (-1.0, 1.2, SURF + 0.1), T.word("gas", "open"), s("end"), n=8, rise=1.2, mat=W.flat("gas_m2", (0.6, 0.5, 0.3), alpha=0.6), spread=0.3)
    shots += [W.view("section", (-0.6, 1.0, -0.6), s("gas"), s("gas") + 2.4, push=0.12), W.view("high", (-1.0, 1.4, 0.0), s("gas") + 2.4, s("gas") + 4.8, push=0.15),
              W.view("left", F, s("gas") + 4.8, e("gas") + 0.1, push=0.12)]

    # ---- end: spring again, edge stones -------------------------------------------------------------------------
    t_st = T.word("end", "stones")
    k = 0
    for k, (x, y) in enumerate(W.outline_points(OUT, y_min=0.12, every=2)):
        st = W.instance("rock_09", (x, y, -0.03), 4.0 + 1.6 * R.random(), R.random() * 6, name=f"edge_{k}")
        W.appear(st, t_st - 0.2 + 0.02 * k, "pop", 0.3)
    W.sfx("chime", T.word("end", "congratulations"), 0.35)
    t_c = T.word("end", "congratulations") - 0.1
    shots += [W.view("right", F, s("end"), t_c, push=0.14),
              dict(t0=t_c, t1=T.end, a=((0.4, -15.5, 5.4), (0.3, 4.5, 0.4)), b=((0.3, -9.5, 2.8), (0.2, 3.0, -0.2)), lens=34)]
    return shots
```

## 9. The kit (unpacked by the snippet in step 1.2)

`kit/blender_path.py`
```python
"""blender_path.py: print the path of a Blender 4.2+ that runs here, installing a portable copy if there is none.
  python kit/blender_path.py           -> prints the blender executable (use it as BLENDER in every command)
Looks in: $BLENDER, PATH, the usual install folders, ./blender/. Otherwise downloads the official portable build
from download.blender.org (free, no account, ~350 MB) into ./blender/ (Windows zip / Linux tar.xz).
On a Mac it asks you to install Blender from blender.org instead (a .dmg can't be unpacked silently)."""
import glob, os, platform, re, shutil, subprocess, sys, tarfile, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL = os.path.join(ROOT, "blender")


def ok(p):
    try:
        out = subprocess.run([p, "-b", "--factory-startup", "--version"], capture_output=True, text=True, timeout=120).stdout
        m = re.search(r"Blender (\d+)\.(\d+)", out)
        return m and (int(m.group(1)), int(m.group(2))) >= (4, 2)
    except Exception:
        return False


def candidates():
    if os.environ.get("BLENDER"): yield os.environ["BLENDER"]
    if shutil.which("blender"): yield shutil.which("blender")
    pats = [os.path.join(LOCAL, "**", "blender.exe"), os.path.join(LOCAL, "**", "blender")]
    if platform.system() == "Windows":
        pats += [r"C:\Program Files\Blender Foundation\*\blender.exe", os.path.expandvars(r"%LOCALAPPDATA%\Programs\Blender Foundation\*\blender.exe"),
                 r"C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe"]
    elif platform.system() == "Darwin":
        pats += ["/Applications/Blender*.app/Contents/MacOS/Blender"]
    else:
        pats += ["/usr/bin/blender", "/snap/bin/blender", os.path.expanduser("~/blender*/blender")]
    for pat in pats:
        for p in sorted(glob.glob(pat, recursive=True), reverse=True):
            if os.path.isfile(p): yield p


for p in candidates():
    if ok(p):
        print(p); sys.exit(0)

sysname = platform.system()
if sysname == "Darwin":
    sys.exit("No Blender found. Install Blender 5.x from https://www.blender.org/download/ (free), then run this again.")
base = "https://download.blender.org/release/Blender5.2/"
listing = urllib.request.urlopen(base, timeout=60).read().decode()
arch = "windows-x64.zip" if sysname == "Windows" else "linux-x64.tar.xz"
files = sorted(set(re.findall(r'href="(blender-5\.2\.\d+-' + re.escape(arch) + ')"', listing)), key=lambda s: int(re.search(r"5\.2\.(\d+)", s).group(1)))
if not files: sys.exit("could not find a portable Blender on download.blender.org")
url = base + files[-1]
os.makedirs(LOCAL, exist_ok=True)
dst = os.path.join(LOCAL, files[-1])
print("downloading", url, "(once, ~350 MB)", file=sys.stderr)
urllib.request.urlretrieve(url, dst + ".part"); os.replace(dst + ".part", dst)
if dst.endswith(".zip"):
    zipfile.ZipFile(dst).extractall(LOCAL)
else:
    tarfile.open(dst).extractall(LOCAL)
os.remove(dst)
for p in candidates():
    if ok(p):
        print(p); sys.exit(0)
sys.exit("Blender was downloaded but doesn't start; check the GPU driver.")
```

`kit/fetch_assets.py`
```python
"""fetch_assets.py: download every free asset the kit uses, once. No account, no key.
  python kit/fetch_assets.py            -> assets/  (about 570 MB the first time; later runs skip what is there)
Sources: Poly Haven (CC0 textures, models, sky), Google Fonts on GitHub (OFL font), Kokoro-82M voice (Apache-2.0)."""
import json, os, sys, urllib.request, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
UA = {"User-Agent": "whatif-kit/1.0"}
TEX = ["excavated_soil_wall", "leafy_grass", "plastered_wall", "clay_roof_tiles", "concrete_floor_02", "gravel_stones",
       "square_concrete_pavers", "dark_wooden_planks", "brick_wall_02", "brown_mud", "rock_face_01_tex", "coast_sand_01",
       "rusty_metal_02", "metal_plate", "dirt", "red_laterite_soil_stones"]
MODELS = ["garden_gnome", "island_tree_01", "tree_small_02", "shrub_01", "shrub_02", "shrub_04", "planter_pot_clay",
          "potted_plant_01", "outdoor_table_chair_set_01", "rock_09", "rock_moss_set_01", "grass_medium_01", "nettle_plant"]
HDRI = "kloofendal_48d_partly_cloudy_puresky"
FONT = "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(path + ".part", "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    os.replace(path + ".part", path)


def api(asset):
    req = urllib.request.Request(f"https://api.polyhaven.com/files/{asset}", headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))


def jobs():
    out = []
    h = api(HDRI)["hdri"]["2k"]["hdr"]["url"]
    out.append((h, os.path.join(A, "hdri", HDRI + ".hdr")))
    for t in TEX:
        name = t.replace("_tex", "")
        try:
            f = api(name)
        except Exception as e:
            print("skip texture", name, e); continue
        for key, short in (("Diffuse", "diff"), ("nor_gl", "nor"), ("Rough", "rough"), ("Displacement", "disp")):
            if key in f and "1k" in f[key]:
                fmt = "jpg" if "jpg" in f[key]["1k"] else "png"
                out.append((f[key]["1k"][fmt]["url"], os.path.join(A, "tex", name, f"{short}.{fmt}")))
    for m in MODELS:
        try:
            g = api(m)["gltf"]["1k"]["gltf"]
        except Exception as e:
            print("skip model", m, e); continue
        base = os.path.join(A, "models", m)
        out.append((g["url"], os.path.join(base, m + ".gltf")))
        for rel, inc in g.get("include", {}).items():
            out.append((inc["url"], os.path.join(base, rel)))
    out.append((FONT, os.path.join(A, "fonts", "Nunito.ttf")))
    for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
        out.append((KOKORO + n, os.path.join(A, "voice", n)))
    return out


if __name__ == "__main__":
    js = jobs()
    with cf.ThreadPoolExecutor(8) as ex:
        futs = {ex.submit(get, u, p): p for u, p in js}
        bad = 0
        for fu in cf.as_completed(futs):
            try:
                fu.result()
            except Exception as e:
                bad += 1; print("FAILED", futs[fu], e)
    n = sum(1 for _, p in js if os.path.exists(p))
    print(f"assets ready: {n}/{len(js)} files in {A}" + (f" ({bad} failed: run again)" if bad else ""))
    sys.exit(1 if bad else 0)
```

`kit/world.py`
```python
"""world.py: the 3D set and the animation verbs for "How a hole in your yard becomes ..." Shorts.
Runs inside Blender (bpy). The story's scene.py calls these functions; build.py renders.

Axes: metres, Z up. The lawn is z = 0. The cut face (where the soil is sliced open) is the plane y = 0;
the camera sits at y < 0 looking toward +y, so everything underground shows in cross-section at y = 0.
Times are in seconds (t); fr(t) turns them into frames."""
import bpy, bmesh, math, os, random  # noqa: scene.py can use W.bpy and W.bmesh
from mathutils import Vector, Euler

ROOT = os.environ.get("WHATIF_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
FPS = 30
RNG = random.Random(7)
SOLVER = os.environ.get("WHATIF_BOOL", "MANIFOLD")   # fast; set WHATIF_BOOL=EXACT if a hole renders wrong
_MATS, _LIB, _HIDDEN = {}, {}, None
SFX = []          # sound cues collected while the scene is built; build.py writes them to sfx.json


def sfx(kind, t, vol=0.7, dur=None):
    """a sound at time t. kinds: dig, thud, pop, splash, pour (needs dur), bubble, whoosh, click, hum (needs dur), chime."""
    SFX.append({"type": kind, "at": round(t, 3), "vol": vol, **({"dur": dur} if dur else {})})


def fr(t):
    return int(round(t * FPS)) + 1


def ease(s, kind="inout"):
    s = max(0.0, min(1.0, s))
    if kind == "in": return s * s * s
    if kind == "out": return 1 - (1 - s) ** 3
    if kind == "back":                         # overshoot then settle (pop-in)
        c = 1.70158 * 1.2
        return 1 + (c + 1) * (s - 1) ** 3 + c * (s - 1) ** 2
    if kind == "linear": return s
    return s * s * (3 - 2 * s) if s < 1 else 1.0


def lerp(a, b, s):
    return [x + (y - x) * s for x, y in zip(a, b)]


def _try(obj, name, value):
    try:
        setattr(obj, name, value)
    except Exception:
        pass


# ------------------------------------------------------------------ scene

def setup(duration, preview=False):
    """empty scene, EEVEE, sky, sun, colour management. duration in seconds."""
    global _HIDDEN
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, fr(duration)
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.render.resolution_percentage = 50 if preview else 100
    ee = sc.eevee
    _try(ee, "taa_render_samples", 8 if preview else int(os.environ.get("WHATIF_SAMPLES", "24")))
    _try(ee, "use_raytracing", True)
    _try(ee, "use_shadows", True)
    _try(ee, "shadow_ray_count", 2)
    _try(ee, "shadow_step_count", 8)
    _try(ee, "use_fast_gi", True)
    _try(ee, "fast_gi_distance", 6.0)
    _try(ee, "clamp_surface_indirect", 6.0)
    sc.render.use_motion_blur = not preview
    _try(sc.render, "motion_blur_shutter", 0.45)
    _try(sc.render, "motion_blur_position", "START")   # START: the first frame of a new shot never smears across the cut
    _try(sc.view_settings, "view_transform", "AgX")
    _try(sc.view_settings, "look", "AgX - Medium High Contrast")
    _try(sc.view_settings, "exposure", 0.15)
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 93
    sc.render.use_overwrite = False                # resume: frames already on disk are skipped
    sc.render.use_placeholder = True               # lets two Blender processes share one render
    _try(sc.render, "film_transparent", False)
    # sky
    w = bpy.data.worlds.new("sky"); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value[2] = math.radians(200)
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    hdr = os.path.join(A, "hdri", "kloofendal_48d_partly_cloudy_puresky.hdr")
    env.image = bpy.data.images.load(hdr, check_existing=True)
    bg = nt.nodes.new("ShaderNodeBackground"); bg.name = "SKY"; bg.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    # sun: low enough for long soft shadows, from the back-left so the cut face is lit
    sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.6; sd.angle = math.radians(2.5); sd.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new("sun", sd); sc.collection.objects.link(sun)
    sun.rotation_euler = Euler((math.radians(48), 0, math.radians(-28)))
    fd = bpy.data.lights.new("fill", "SUN"); fd.energy = float(os.environ.get("WHATIF_FILL", "1.1")); fd.angle = math.radians(25)
    fd.color = (1.0, 0.9, 0.78); _try(fd, "use_shadow", False)
    fill = bpy.data.objects.new("fill", fd); sc.collection.objects.link(fill)
    fill.rotation_euler = Euler((math.radians(-62), 0, math.radians(-12)))      # from the camera side, onto the cut face
    # a hidden collection for asset templates
    _HIDDEN = bpy.data.collections.new("LIB"); sc.collection.children.link(_HIDDEN)
    _HIDDEN.hide_render = True; _HIDDEN.hide_viewport = True
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 35; cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 36
    cam.data.clip_start = 0.05; cam.data.clip_end = 600
    return sc


def sun():
    return bpy.data.objects["sun"]


# ------------------------------------------------------------------ materials

def _img(path, non_color=False):
    im = bpy.data.images.load(path, check_existing=True)
    if non_color:
        im.colorspace_settings.name = "Non-Color"
    return im


def _texdir(name):
    return os.path.join(A, "tex", name)


def tex_mat(key, folder, size=2.0, tint=None, sat=1.0, bright=1.0, rough=None, normal=1.0, box=True):
    """a photo material from assets/tex/<folder>, projected in object space so any shape gets it.
    size = metres the texture covers once."""
    m = bpy.data.materials.new(key); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    bsdf = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.name = "MAP"
    mp.inputs["Scale"].default_value = (1 / size, 1 / size, 1 / size)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    d = _texdir(folder)

    def image(fn, nc):
        p = None
        for ext in ("jpg", "png"):
            q = os.path.join(d, f"{fn}.{ext}")
            if os.path.exists(q): p = q
        if not p: return None
        t = N.new("ShaderNodeTexImage"); t.image = _img(p, nc)
        if box:
            t.projection = "BOX"; t.projection_blend = 0.25
        L.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t

    dif = image("diff", False)
    col_out = dif.outputs["Color"] if dif else None
    if col_out is not None and (tint or sat != 1.0 or bright != 1.0):
        hsv = N.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = sat
        hsv.inputs["Value"].default_value = bright
        L.new(col_out, hsv.inputs["Color"]); col_out = hsv.outputs["Color"]
        if tint:
            mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0; mix.inputs["B"].default_value = (*tint, 1)
            L.new(col_out, mix.inputs["A"]); col_out = mix.outputs["Result"]
    if col_out is not None:
        L.new(col_out, bsdf.inputs["Base Color"])
    r = image("rough", True)
    if r and rough is None:
        L.new(r.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = rough if rough is not None else 0.8
    n = image("nor", True)
    if n and normal > 0:
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = normal
        L.new(n.outputs["Color"], nm.inputs["Color"]); L.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    m["base_color_node"] = col_out.node.name if col_out is not None else ""
    return m


def flat(key, color, rough=0.5, metal=0.0, alpha=1.0, emit=0.0, transmission=0.0, ior=1.45, coat=0.0):
    m = bpy.data.materials.new(key); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha; b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1); b.inputs["Emission Strength"].default_value = emit
    if alpha < 1 or transmission > 0:
        _try(m, "surface_render_method", "BLENDED"); _try(m, "use_transparency_overlap", False)
    return m


def _soil():
    m = tex_mat("soil", "excavated_soil_wall", size=3.2, sat=1.05, bright=1.0, normal=1.4)
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N["Principled BSDF"]
    # depth layers: dark topsoil in the first 35 cm, warmer clay below 2.5 m
    col = b.inputs["Base Color"].links[0].from_socket
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs["Vector"])
    top = N.new("ShaderNodeMapRange"); top.inputs["From Min"].default_value = -0.45; top.inputs["From Max"].default_value = -0.15
    L.new(sep.outputs["Z"], top.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["B"].default_value = (0.42, 0.33, 0.27, 1)
    L.new(top.outputs["Result"], mix.inputs["Factor"]); L.new(col, mix.inputs["A"])
    deep = N.new("ShaderNodeMapRange"); deep.inputs["From Min"].default_value = -2.2; deep.inputs["From Max"].default_value = -4.0
    L.new(sep.outputs["Z"], deep.inputs["Value"])
    mix2 = N.new("ShaderNodeMix"); mix2.data_type = "RGBA"; mix2.blend_type = "MULTIPLY"
    mix2.inputs["B"].default_value = (1.0, 0.82, 0.66, 1)
    L.new(deep.outputs["Result"], mix2.inputs["Factor"]); L.new(mix.outputs["Result"], mix2.inputs["A"])
    # faces that point up (hole floors, steps) get loose dirt instead of the cut-wall streaks
    mp2 = N.new("ShaderNodeMapping"); mp2.inputs["Scale"].default_value = (0.8, 0.8, 0.8)
    L.new(tc.outputs["Object"], mp2.inputs["Vector"])
    floor_tex = "red_laterite_soil_stones" if os.path.exists(os.path.join(_texdir("red_laterite_soil_stones"), "diff.jpg")) else "dirt"
    fl = N.new("ShaderNodeTexImage"); fl.image = _img(os.path.join(_texdir(floor_tex), "diff.jpg"))
    fl.projection = "BOX"; fl.projection_blend = 0.3; L.new(mp2.outputs["Vector"], fl.inputs["Vector"])
    fl_t = N.new("ShaderNodeMix"); fl_t.data_type = "RGBA"; fl_t.blend_type = "MULTIPLY"; fl_t.inputs["Factor"].default_value = 1
    fl_t.inputs["B"].default_value = (0.55, 0.38, 0.27, 1); L.new(fl.outputs["Color"], fl_t.inputs["A"])
    geo = N.new("ShaderNodeNewGeometry"); sepn = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Normal"], sepn.inputs["Vector"])
    up = N.new("ShaderNodeMapRange"); up.inputs["From Min"].default_value = 0.55; up.inputs["From Max"].default_value = 0.8
    L.new(sepn.outputs["Z"], up.inputs["Value"])
    floor = N.new("ShaderNodeMix"); floor.data_type = "RGBA"
    upc = N.new("ShaderNodeMath"); upc.operation = "MULTIPLY"; upc.inputs[1].default_value = 0.15     # floors: the cut-face soil, a few stones
    L.new(up.outputs["Result"], upc.inputs[0])
    L.new(upc.outputs[0], floor.inputs["Factor"]); L.new(mix2.outputs["Result"], floor.inputs["A"]); L.new(fl_t.outputs["Result"], floor.inputs["B"])
    L.new(floor.outputs["Result"], b.inputs["Base Color"])
    nm = next((n for n in N if n.bl_idname == "ShaderNodeNormalMap"), None)
    if nm:
        inv = N.new("ShaderNodeMath"); inv.operation = "MULTIPLY_ADD"; inv.inputs[1].default_value = -1.4; inv.inputs[2].default_value = 1.4
        L.new(up.outputs["Result"], inv.inputs[0]); L.new(inv.outputs[0], nm.inputs["Strength"])
        # floors get the dirt's own relief instead
        bw = N.new("ShaderNodeRGBToBW"); L.new(fl.outputs["Color"], bw.inputs["Color"])
        fb = N.new("ShaderNodeBump"); fb.inputs["Distance"].default_value = 0.02
        st = N.new("ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = 2.0
        L.new(up.outputs["Result"], st.inputs[0]); L.new(st.outputs[0], fb.inputs["Strength"])
        L.new(bw.outputs["Val"], fb.inputs["Height"]); L.new(nm.outputs["Normal"], fb.inputs["Normal"])
        L.new(fb.outputs["Normal"], b.inputs["Normal"])
    return m


def _lawn():
    """mown lawn: photo grass + alternating stripes 1.6 m wide (the classic striped yard)."""
    m = tex_mat("grass", "leafy_grass", size=1.2, sat=1.5, bright=0.85, normal=0.6, box=False, rough=0.95)
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N["Principled BSDF"]
    col = b.inputs["Base Color"].links[0].from_socket
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs["Vector"])
    div = N.new("ShaderNodeMath"); div.operation = "MULTIPLY"; div.inputs[1].default_value = 1 / 1.6
    L.new(sep.outputs["X"], div.inputs[0])
    fl = N.new("ShaderNodeMath"); fl.operation = "FLOOR"; L.new(div.outputs[0], fl.inputs[0])
    md = N.new("ShaderNodeMath"); md.operation = "FLOORED_MODULO"; md.inputs[1].default_value = 2.0
    L.new(fl.outputs[0], md.inputs[0])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["B"].default_value = (0.66, 0.78, 0.55, 1); mix.inputs["A"].default_value = (1, 1, 1, 1)
    L.new(md.outputs[0], mix.inputs["Factor"])
    tint = N.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs["Factor"].default_value = 1
    tint.inputs["B"].default_value = (0.42, 0.85, 0.22, 1)
    L.new(col, tint.inputs["A"])
    fin = N.new("ShaderNodeMix"); fin.data_type = "RGBA"; fin.blend_type = "MULTIPLY"; fin.inputs["Factor"].default_value = 1
    L.new(tint.outputs["Result"], fin.inputs["A"]); L.new(mix.outputs["Result"], fin.inputs["B"])
    # snow cover, 0..1, animate with key_value(M('grass'), 'SNOW', ...)
    snow = N.new("ShaderNodeMix"); snow.data_type = "RGBA"; snow.name = "SNOW"; snow.inputs["Factor"].default_value = 0.0
    snow.inputs["B"].default_value = (0.92, 0.95, 1.0, 1)
    b.inputs["Specular IOR Level"].default_value = 0.15
    L.new(fin.outputs["Result"], snow.inputs["A"]); L.new(snow.outputs["Result"], b.inputs["Base Color"])
    return m


def _water():
    """water: deeper = darker, a moving caustic shimmer and ripples (both driven by the 'TIME' value, keyed by finalize()),
    and an ALGAE amount 0..1 that turns it murky green (animate with key_value(M('water'), 'ALGAE', ...))."""
    m = bpy.data.materials.new("water"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs["Vector"])
    tm = N.new("ShaderNodeValue"); tm.name = "TIME"; tm.outputs[0].default_value = 0.0
    alg = N.new("ShaderNodeMath"); alg.name = "ALGAE"; alg.operation = "ADD"; alg.inputs[0].default_value = 0.0; alg.inputs[1].default_value = 0.0
    depth = N.new("ShaderNodeMapRange"); depth.inputs["From Min"].default_value = -0.1; depth.inputs["From Max"].default_value = -1.3
    L.new(sep.outputs["Z"], depth.inputs["Value"])
    clear = N.new("ShaderNodeMix"); clear.data_type = "RGBA"
    clear.inputs["A"].default_value = (0.09, 0.5, 0.62, 1); clear.inputs["B"].default_value = (0.02, 0.17, 0.34, 1)
    L.new(depth.outputs["Result"], clear.inputs["Factor"])
    murk = N.new("ShaderNodeTexNoise"); murk.inputs["Scale"].default_value = 2.5; murk.inputs["Detail"].default_value = 8; murk.inputs["Roughness"].default_value = 0.65
    L.new(tc.outputs["Object"], murk.inputs["Vector"])
    green = N.new("ShaderNodeMix"); green.data_type = "RGBA"
    green.inputs["A"].default_value = (0.04, 0.14, 0.02, 1); green.inputs["B"].default_value = (0.45, 0.58, 0.14, 1)
    L.new(murk.outputs["Fac"], green.inputs["Factor"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"
    L.new(alg.outputs[0], col.inputs["Factor"]); L.new(clear.outputs["Result"], col.inputs["A"]); L.new(green.outputs["Result"], col.inputs["B"])
    L.new(col.outputs["Result"], b.inputs["Base Color"])
    vor = N.new("ShaderNodeTexVoronoi"); vor.voronoi_dimensions = "4D"; vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 2.2
    _try(vor.inputs.get("Randomness"), "default_value", 1.0)
    L.new(tc.outputs["Object"], vor.inputs["Vector"]); L.new(tm.outputs[0], vor.inputs["W"])
    rmp = N.new("ShaderNodeMapRange"); rmp.inputs["From Min"].default_value = 0.03; rmp.inputs["From Max"].default_value = 0.0
    rmp.inputs["To Max"].default_value = 0.05                     # a faint shimmer, not a tiled pattern
    L.new(vor.outputs["Distance"], rmp.inputs["Value"])
    clean = N.new("ShaderNodeMath"); clean.operation = "MULTIPLY"
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L.new(alg.outputs[0], inv.inputs[1])
    L.new(rmp.outputs["Result"], clean.inputs[0]); L.new(inv.outputs[0], clean.inputs[1])
    L.new(clean.outputs[0], b.inputs["Emission Strength"]); b.inputs["Emission Color"].default_value = (0.75, 0.95, 1.0, 1)
    nz = N.new("ShaderNodeTexNoise"); nz.noise_dimensions = "4D"; nz.inputs["Scale"].default_value = 4.0; nz.inputs["Detail"].default_value = 4
    L.new(tc.outputs["Object"], nz.inputs["Vector"]); L.new(tm.outputs[0], nz.inputs["W"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    L.new(nz.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    # see-through where you look straight in (the cut face shows what's inside), more solid at a glance (the surface)
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    base = N.new("ShaderNodeMapRange"); base.inputs["To Min"].default_value = 0.22; base.inputs["To Max"].default_value = 0.7
    L.new(lw.outputs["Facing"], base.inputs["Value"])
    al = N.new("ShaderNodeMix"); al.data_type = "FLOAT"; al.inputs["B"].default_value = 0.6
    L.new(alg.outputs[0], al.inputs["Factor"]); L.new(base.outputs["Result"], al.inputs["A"]); L.new(al.outputs["Result"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.03; b.inputs["IOR"].default_value = 1.33; b.inputs["Specular IOR Level"].default_value = 0.6
    _try(m, "surface_render_method", "BLENDED"); _try(m, "use_transparency_overlap", False)
    return m


def _ice():
    """frosted ice: pale blue, cracked (cell edges), rougher in patches, a little see-through."""
    m = bpy.data.materials.new("ice"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    vor = N.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 1.6
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    crack = N.new("ShaderNodeMapRange"); crack.inputs["From Min"].default_value = 0.0; crack.inputs["From Max"].default_value = 0.025
    L.new(vor.outputs["Distance"], crack.inputs["Value"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    frost = N.new("ShaderNodeMix"); frost.data_type = "RGBA"
    frost.inputs["A"].default_value = (0.5, 0.72, 0.88, 1); frost.inputs["B"].default_value = (0.86, 0.94, 1.0, 1)
    L.new(nz.outputs["Fac"], frost.inputs["Factor"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.inputs["A"].default_value = (0.42, 0.6, 0.72, 1)
    L.new(crack.outputs["Result"], col.inputs["Factor"]); L.new(frost.outputs["Result"], col.inputs["B"])
    L.new(col.outputs["Result"], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.05; rr.inputs["To Max"].default_value = 0.45
    L.new(nz.outputs["Fac"], rr.inputs["Value"]); L.new(rr.outputs["Result"], b.inputs["Roughness"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4
    L.new(crack.outputs["Result"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Alpha"].default_value = 0.74; b.inputs["Coat Weight"].default_value = 0.5
    _try(m, "surface_render_method", "BLENDED")
    return m


def foam_mat(name, color):
    """porous foam (filter sponges, insulation): colour with dark pores and a bumpy surface."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 70
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    pores = N.new("ShaderNodeMapRange"); pores.inputs["From Min"].default_value = 0.05; pores.inputs["From Max"].default_value = 0.35
    L.new(vor.outputs["Distance"], pores.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = tuple(c * 0.25 for c in color) + (1,)
    mix.inputs["B"].default_value = (*color, 1); L.new(pores.outputs["Result"], mix.inputs["Factor"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.8
    L.new(pores.outputs["Result"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.9
    return m


def plastic_mat(name, color, rough=0.45):
    """moulded plastic with a faint texture, so tanks and boxes don't look like flat CG."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40; nz.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = (*color, 1)
    mix.inputs["B"].default_value = tuple(c * 0.8 for c in color) + (1,); L.new(nz.outputs["Fac"], mix.inputs["Factor"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08
    L.new(nz.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Coat Weight"].default_value = 0.2
    return m


def finalize(t_end):
    """build.py calls this after build(): keeps the water moving (caustics and ripples) for the whole video."""
    if "water" in _MATS:
        n = _MATS["water"].node_tree.nodes["TIME"].outputs[0]
        n.default_value = 0.0; n.keyframe_insert("default_value", frame=1)
        n.default_value = t_end * 0.22; n.keyframe_insert("default_value", frame=fr(t_end))


def _fabric(color):
    m = bpy.data.materials.new("fabric"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); ck = N.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 160
    L.new(tc.outputs["Object"], ck.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 12; L.new(tc.outputs["Object"], nz.inputs["Vector"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = (*color, 1)
    mix.inputs["B"].default_value = tuple(c * 0.82 for c in color) + (1,); L.new(nz.outputs["Fac"], mix.inputs["Factor"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    L.new(ck.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.95
    return m


def _drainpipe():
    """corrugated black plastic pipe: rings in every direction (reads right on any run) and a row of dark holes."""
    m = bpy.data.materials.new("drainpipe"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    rings = None
    for ax in ("X", "Y", "Z"):
        w = N.new("ShaderNodeTexWave"); w.wave_type = "BANDS"; w.bands_direction = ax; w.inputs["Scale"].default_value = 9.0
        L.new(tc.outputs["Object"], w.inputs["Vector"])
        if rings is None: rings = w.outputs["Fac"]
        else:
            mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"; L.new(rings, mx.inputs[0]); L.new(w.outputs["Fac"], mx.inputs[1]); rings = mx.outputs[0]
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 18; L.new(tc.outputs["Object"], vor.inputs["Vector"])
    holes = N.new("ShaderNodeMapRange"); holes.inputs["From Min"].default_value = 0.1; holes.inputs["From Max"].default_value = 0.16
    L.new(vor.outputs["Distance"], holes.inputs["Value"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.inputs["A"].default_value = (0.0, 0.0, 0.0, 1); col.inputs["B"].default_value = (0.05, 0.05, 0.055, 1)
    L.new(holes.outputs["Result"], col.inputs["Factor"]); L.new(col.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.6
    L.new(rings, bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.4; b.inputs["Coat Weight"].default_value = 0.3
    return m


def M(key):
    """the material library. Add your own with flat(...) or tex_mat(...)."""
    if key in _MATS: return _MATS[key]
    k = key
    if k == "soil": m = _soil()
    elif k == "grass": m = _lawn()
    elif k == "water": m = _water()
    elif k == "plaster": m = tex_mat(k, "plastered_wall", 2.5, tint=(0.86, 0.82, 0.86), bright=1.08, normal=0.5)
    elif k == "roof": m = tex_mat(k, "clay_roof_tiles", 2.2, tint=(1.0, 0.72, 0.55), sat=1.15, normal=1.0)
    elif k == "concrete": m = tex_mat(k, "concrete_floor_02", 2.0, bright=1.05, normal=0.6)
    elif k == "gravel": m = tex_mat(k, "gravel_stones", 0.8, normal=1.5)
    elif k == "pavers": m = tex_mat(k, "square_concrete_pavers", 2.0, tint=(1.0, 0.93, 0.85))
    elif k == "wood": m = tex_mat(k, "dark_wooden_planks", 2.0, tint=(0.75, 0.55, 0.42))
    elif k == "brick": m = tex_mat(k, "brick_wall_02", 1.6)
    elif k == "mud": m = tex_mat(k, "brown_mud", 1.5, tint=(0.82, 0.62, 0.45), sat=1.1, normal=1.2)
    elif k == "sand": m = tex_mat(k, "coast_sand_01", 1.2, tint=(1.0, 0.9, 0.72))
    elif k == "rock": m = tex_mat(k, "rock_face_01", 1.5, normal=1.5)
    elif k == "rust": m = tex_mat(k, "rusty_metal_02", 1.0)
    elif k == "steel": m = tex_mat(k, "metal_plate", 1.0, rough=0.35)
    elif k == "glass": m = flat(k, (0.10, 0.15, 0.20), rough=0.04, coat=1.0)
    elif k == "trim": m = flat(k, (0.92, 0.92, 0.9), rough=0.45)
    elif k == "shutter": m = tex_mat(k, "dark_wooden_planks", 1.2, tint=(0.25, 0.42, 0.75), sat=0.2, bright=1.6, normal=0.6)
    elif k == "pvc": m = plastic_mat(k, (0.9, 0.9, 0.88), 0.3)
    elif k == "black_rubber": m = flat(k, (0.025, 0.025, 0.028), rough=0.55)
    elif k == "tar": m = flat(k, (0.02, 0.02, 0.02), rough=0.25, coat=0.6)
    elif k == "copper": m = flat(k, (0.85, 0.45, 0.25), rough=0.3, metal=1.0)
    elif k == "red": m = flat(k, (0.75, 0.08, 0.06), rough=0.4)
    elif k == "blue_plastic": m = plastic_mat(k, (0.06, 0.22, 0.65), 0.35)
    elif k == "green_plastic": m = plastic_mat(k, (0.09, 0.22, 0.11))
    elif k == "orange": m = flat(k, (0.95, 0.38, 0.06), rough=0.35)
    elif k == "white": m = flat(k, (0.95, 0.95, 0.95), rough=0.4)
    elif k == "arrow": m = flat(k, (1, 1, 1), rough=0.3, alpha=0.85, emit=0.25)
    elif k == "arrow_blue": m = flat(k, (0.55, 0.8, 1.0), rough=0.3, alpha=0.9, emit=0.4)
    elif k == "arrow_red": m = flat(k, (1.0, 0.35, 0.25), rough=0.3, alpha=0.9, emit=0.4)
    elif k == "groundwater": m = flat(k, (0.12, 0.35, 0.85), rough=0.2, alpha=0.55)
    elif k == "wet": m = flat(k, (0.08, 0.05, 0.03), rough=0.2, alpha=0.45)
    elif k == "ice": m = _ice()
    elif k == "flow": m = flat(k, (0.55, 0.82, 1.0), rough=0.05, alpha=0.7, emit=0.35)       # water droplets / a stream
    elif k == "air": m = flat(k, (1.0, 1.0, 1.0), rough=0.3, alpha=0.55, emit=0.3)            # air / gas bubbles
    elif k == "falls": m = flat(k, (0.7, 0.88, 1.0), rough=0.05, alpha=0.32, emit=0.12)
    elif k == "foam": m = flat(k, (0.95, 0.97, 1.0), rough=0.4, alpha=0.75, emit=0.2)
    elif k == "leaf": m = flat(k, (0.18, 0.42, 0.12), rough=0.6)
    elif k == "fabric": m = _fabric((0.82, 0.8, 0.76))            # geotextile, tarp, felt
    elif k == "fabric_black": m = _fabric((0.06, 0.06, 0.06))
    elif k == "drainpipe": m = _drainpipe()                         # black corrugated pipe with holes
    else: raise KeyError(f"no material '{key}'. Make one with flat() or tex_mat().")
    _MATS[key] = m
    return m


def key_value(mat_or_world, node, keys, socket=None):
    """animate one number inside a material or the world: keys = [(t, value), ...].
    e.g. key_value(M('water'), 'ALGAE', [(20, 0), (22, 0.9)])"""
    nt = mat_or_world.node_tree
    n = nt.nodes[node]
    inp = n.inputs[socket] if socket else (n.inputs.get("Factor") or n.inputs.get("Strength") or n.inputs[0])
    for t, v in keys:
        inp.default_value = v
        inp.keyframe_insert("default_value", frame=fr(t))


# ------------------------------------------------------------------ geometry

def _link(ob, col=None):
    (col or bpy.context.scene.collection).objects.link(ob)
    return ob


def box(name, size, loc, mat, origin="bottom", bevel=0.0):
    """a box. size=(x,y,z). origin 'bottom' puts the pivot at the bottom centre (good for growing up)."""
    sx, sy, sz = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
        if origin == "bottom": v.co.z += sz / 2
        elif origin == "top": v.co.z -= sz / 2
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 2
        for p in me.polygons: p.use_smooth = True
    return ob


def cyl(name, r, h, loc, mat, axis="Z", verts=40, origin="bottom", r2=None):
    """a cylinder (or cone/frustum with r2) of radius r, height h along axis."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if origin == "bottom":
        for v in bm.verts: v.co.z += h / 2
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    if axis == "X": ob.rotation_euler = (0, math.radians(90), 0)
    elif axis == "Y": ob.rotation_euler = (math.radians(-90), 0, 0)
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def sphere(name, r, loc, mat, squash=1.0, noise=0.0, seg=32):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    rr = random.Random(hash(name) & 0xffff)
    for v in bm.verts:
        v.co.z *= squash
        if noise: v.co *= 1 + noise * (rr.random() - 0.5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def prism(name, profile, depth, loc, mat, axis="Y"):
    """extrude a 2D outline (list of (u, z) points, counter-clockwise) by depth along axis (Y default: from y to y+depth).
    Good for stepped pits, tank sections, trenches."""
    bm = bmesh.new()
    a = [bm.verts.new((u, 0, z)) for u, z in profile]
    b = [bm.verts.new((u, depth, z)) for u, z in profile]
    bm.faces.new(list(reversed(a))); bm.faces.new(b)
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    if axis == "X": ob.rotation_euler = (0, 0, math.radians(-90))
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def pipe(name, points, r, mat="pvc", t0=None, t1=None, caps=True):
    """a round pipe through 3D points. With t0/t1 it grows from the first point to the last over that time."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = r; cu.bevel_resolution = 6; cu.use_fill_caps = caps
    sp = cu.splines.new("POLY"); sp.points.add(len(points) - 1)
    for p, c in zip(sp.points, points): p.co = (*c, 1)
    ob = _link(bpy.data.objects.new(name, cu))
    cu.materials.append(M(mat) if isinstance(mat, str) else mat)
    if t0 is not None:
        _try(cu, "bevel_factor_mapping_end", "SPLINE")
        cu.bevel_factor_end = 0.0; cu.keyframe_insert("bevel_factor_end", frame=fr(t0))
        cu.bevel_factor_end = 1.0; cu.keyframe_insert("bevel_factor_end", frame=fr(t1))
        hide_until(ob, t0)
    return ob


def arrow_mesh(name, length=1.0, width=0.32, mat="arrow"):
    """a chunky block arrow pointing along +Z, pivot at its tail."""
    w, hl = width, min(0.45 * length, width * 1.4)
    sl = length - hl
    prof = [(-w * 0.3, 0), (w * 0.3, 0), (w * 0.3, sl), (w * 0.75, sl), (0, length), (-w * 0.75, sl), (-w * 0.3, sl)]
    bm = bmesh.new()
    t = w * 0.35
    a = [bm.verts.new((u, -t / 2, z)) for u, z in prof]; b = [bm.verts.new((u, t / 2, z)) for u, z in prof]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(len(prof)):
        j = (i + 1) % len(prof); bm.faces.new((a[j], a[i], b[i], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def instance(asset, loc, scale=1.0, rot_z=0.0, name=None):
    """place a Poly Haven model from assets/models/<asset> (imported once, then instanced)."""
    if asset not in _LIB:
        path = os.path.join(A, "models", asset, asset + ".gltf")
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        col = bpy.data.collections.new("LIB_" + asset)
        _HIDDEN.children.link(col)
        for o in new:
            for c in list(o.users_collection): c.objects.unlink(o)
            col.objects.link(o)
        _LIB[asset] = col
    e = bpy.data.objects.new(name or asset, None)
    e.instance_type = "COLLECTION"; e.instance_collection = _LIB[asset]
    e.location = loc; e.scale = (scale, scale, scale); e.rotation_euler = (0, 0, rot_z)
    return _link(e)


# ------------------------------------------------------------------ the yard set

SOIL = None


def yard(house=True, props=True, block=(30.0, 16.0, 16.0), neighbours=True):
    """the standard set: a soil block cut open at y=0, lawn on top, the house behind, fence, trees, sky.
    Returns the soil block object. Cut holes into it with hole(...)."""
    global SOIL
    w, d, h = block
    # soil block with lawn top (material 0 = soil, 1 = grass)
    SOIL = box("soil_block", (w, d, h), (0, d / 2, -h), "soil")
    SOIL.data.materials.append(M("grass"))
    for p in SOIL.data.polygons:
        if p.normal.z > 0.9: p.material_index = 1
    # endless lawn around and behind the block (slightly below to avoid flicker)
    lawn = box("lawn", (220, 160, 0.2), (0, d + 80 - 0.01, -0.2 - 0.003), "grass")
    lawn_l = box("lawn_left", (95, d, 0.2), (-w / 2 - 47.5, d / 2, -0.2 - 0.003), "grass")
    lawn_r = box("lawn_right", (95, d, 0.2), (w / 2 + 47.5, d / 2, -0.2 - 0.003), "grass")
    if house:
        house_at((0.6, 9.8, 0), w=11.5, d=7.5)
    if neighbours:
        house_at((-17.5, 15.5, 0), w=9.5, d=7, wall=(0.92, 0.88, 0.8), shutters=(0.2, 0.3, 0.25), floors=2, rot=0.0, name="nb1")
        house_at((18.0, 16.5, 0), w=10, d=7, wall=(0.86, 0.86, 0.9), shutters=(0.45, 0.15, 0.12), floors=2, rot=0.0, name="nb2")
    fence(-13, 13, d - 0.6)
    if props:
        dress_yard()
    return SOIL


def house_at(loc, w=11.0, d=7.5, floors=2, wall=None, shutters=(0.12, 0.28, 0.6), rot=0.0, name="house"):
    """a two-storey suburban house, front facing the camera (-y). loc = centre of the front wall's base."""
    x0, y0, z0 = loc
    fh = 2.9
    h = floors * fh + 0.3
    parts = []
    wall_mat = M("plaster") if wall is None else tex_mat(name + "_plaster", "plastered_wall", 2.5, tint=wall, bright=1.08, normal=0.5)
    sh_mat = M("shutter") if name == "house" else flat(name + "_shutter", shutters, rough=0.5)
    parts.append(box(name + "_walls", (w, d, h), (x0, y0 + d / 2, z0), wall_mat))
    parts.append(box(name + "_plinth", (w + 0.08, d + 0.08, 0.45), (x0, y0 + d / 2, z0 - 0.05), "concrete"))
    # gable roof along x, with overhang
    ov, rise = 0.45, 2.7
    rw, rd = w + 2 * ov, d + 2 * ov
    top = z0 + h
    bm = bmesh.new()
    pts = [(-rw / 2, -rd / 2, top - 0.25), (rw / 2, -rd / 2, top - 0.25), (rw / 2, 0, top + rise), (-rw / 2, 0, top + rise),
           (-rw / 2, rd / 2, top - 0.25), (rw / 2, rd / 2, top - 0.25)]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new((v[0], v[1], v[2], v[3])); bm.faces.new((v[3], v[2], v[5], v[4]))
    me = bpy.data.meshes.new(name + "_roof"); bm.to_mesh(me); bm.free()
    roof = _link(bpy.data.objects.new(name + "_roof", me)); roof.location = (x0, y0 + d / 2, 0)
    me.materials.append(M("roof"))
    so = roof.modifiers.new("thick", "SOLIDIFY"); so.thickness = 0.18; so.offset = -1
    parts.append(roof)
    # gable ends (plaster triangles)
    for sx in (-1, 1):
        bm = bmesh.new()
        tri = [bm.verts.new((sx * w / 2, -d / 2, top)), bm.verts.new((sx * w / 2, d / 2, top)), bm.verts.new((sx * w / 2, 0, top + rise - 0.25))]
        bm.faces.new(tri); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(name + "_gable"); bm.to_mesh(me); bm.free()
        g = _link(bpy.data.objects.new(name + "_gable", me)); g.location = (x0, y0 + d / 2, 0); me.materials.append(wall_mat)
        sg = g.modifiers.new("t", "SOLIDIFY"); sg.thickness = 0.2
        parts.append(g)
    # fascia + gutter
    parts.append(box(name + "_fascia", (rw, 0.06, 0.22), (x0, y0 - ov + 0.02, top - 0.42), "trim"))
    parts.append(cyl(name + "_gutter", 0.07, rw, (x0 - rw / 2, y0 - ov - 0.04, top - 0.36), "trim", axis="X", origin="bottom"))
    # chimney
    parts.append(box(name + "_chimney", (0.8, 0.8, 2.6), (x0 + w * 0.3, y0 + d * 0.62, top + 0.6), "brick"))
    parts.append(box(name + "_chimcap", (0.95, 0.95, 0.12), (x0 + w * 0.3, y0 + d * 0.62, top + 3.2), "concrete"))
    # windows: 4 per floor, the ground floor centre is a glass door with a small canopy
    cols = [-0.36, -0.12, 0.12, 0.36]
    for fl in range(floors):
        zc = z0 + 0.3 + fl * fh + (1.55 if fl else 1.45)
        for i, cx in enumerate(cols):
            x = x0 + cx * w
            if fl == 0 and i in (1, 2):
                continue
            window(name + f"_w{fl}{i}", (x, y0, zc), 1.15, 1.45, sh_mat)
        if fl == 0:
            door(name + "_door", (x0, y0, z0 + 0.3), 2.4, 2.2)
    for o in parts:
        o.rotation_euler.z += rot
    return parts


def window(name, c, ww, wh, sh_mat):
    x, y, z = c
    box(name + "_glass", (ww, 0.02, wh), (x, y - 0.015, z - wh / 2), "glass")   # just in front of the wall face: level with it, glass and plaster flicker (z-fighting)
    t = 0.08
    for dx, dz, sx, sz in ((0, wh / 2, ww + t, t), (0, -wh / 2, ww + t, t), (-ww / 2, 0, t, wh), (ww / 2, 0, t, wh), (0, 0, ww, t * 0.6), (0, 0, t * 0.6, wh)):
        box(name + "_f", (sx, 0.1, sz), (x + dx, y - 0.04, z + dz - sz / 2), "trim")
    box(name + "_sill", (ww + 0.25, 0.22, 0.07), (x, y - 0.1, z - wh / 2 - 0.1), "trim")
    for s in (-1, 1):
        box(name + "_sh", (ww * 0.48, 0.06, wh + 0.05), (x + s * (ww / 2 + ww * 0.26), y - 0.06, z - wh / 2 - 0.02), sh_mat)


def door(name, c, ww, wh):
    x, y, z = c
    box(name + "_glass", (ww, 0.02, wh), (x, y - 0.015, z), "glass")   # in front of the wall face, see window()
    t = 0.09
    for dx, sx in ((-ww / 2, t), (ww / 2, t), (0, t * 0.7)):
        box(name + "_f", (sx, 0.1, wh), (x + dx, y - 0.04, z), "trim")
    box(name + "_top", (ww + t, 0.1, t), (x, y - 0.04, z + wh), "trim")
    box(name + "_canopy", (ww + 1.4, 1.1, 0.1), (x, y - 0.55, z + wh + 0.35), "trim")
    for s in (-1, 1):
        box(name + "_post", (0.1, 0.1, wh + 0.35), (x + s * (ww / 2 + 0.6), y - 1.05, z), "trim")


def fence(x0, x1, y):
    n = int((x1 - x0) / 0.16)
    me = None
    for i in range(n):
        x = x0 + i * 0.16
        hgt = 1.75 + 0.03 * math.sin(i * 1.7)
        box(f"fence_{i}", (0.145, 0.03, hgt), (x, y, -0.02), "wood")
    for zz in (0.35, 1.45):
        box("fence_rail", (x1 - x0, 0.06, 0.09), ((x0 + x1) / 2, y + 0.05, zz), "wood")


def dress_yard():
    """trees, shrubs, a gnome, pots and a patio set. Edit freely, but keep the hole area clear."""
    instance("island_tree_01", (-7.6, 7.2, 0), 1.0, 0.4)
    instance("tree_small_02", (8.2, 8.6, 0), 1.7, 1.2)
    instance("tree_small_02", (-12.5, 13.0, 0), 1.4, 2.6)
    instance("island_tree_01", (12.5, 14.5, 0), 0.9, 2.0)
    instance("shrub_02", (-9.5, 14.2, 0), 0.8, 0.0)          # a row of shrubs along the back fence
    instance("shrub_02", (9.0, 14.2, 0), 0.8, 3.14)
    box("patio", (8.5, 2.6, 0.08), (0.6, 8.4, -0.04), "pavers")
    instance("outdoor_table_chair_set_01", (-2.2, 8.3, 0.04), 1.0, 0.3)
    instance("planter_pot_clay", (3.8, 8.6, 0.04), 1.3, 0)
    instance("potted_plant_01", (5.2, 8.7, 0.04), 1.2, 0.5)
    instance("garden_gnome", (-4.6, 2.4, 0), 1.8, 0.4)


def hole(name, shape, loc=(0, 0, 0), t0=None, t1=None, extra=None):
    """cut a hole into the soil block. shape: ('box', (sx, sy, sz)) dug from the lawn down, or ('prism', profile, depth).
    The hole starts at y = -1 so it opens through the cut face. With t0/t1 it is dug over that time (top down).
    Returns the cutter (hidden)."""
    if shape[0] == "box":
        sx, sy, sz = shape[1]
        c = box(name, (sx, sy + 1.0, sz + 1.0), (loc[0], loc[1] + (sy - 1.0) / 2, loc[2] + 1.0), "soil", origin="top")
    else:
        prof, depth = shape[1], shape[2]
        prof2 = [(u, z) for u, z in prof]
        c = prism(name, prof2, depth + 1.0, (loc[0], loc[1] - 1.0, loc[2]), "soil")
    c.hide_render = True; c.display_type = "WIRE"
    mod = SOIL.modifiers.new(name, "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = c
    _try(mod, "solver", SOLVER)
    if t0 is not None:
        dig(c, t0, t1, extra=extra)
    return c


# ------------------------------------------------------------------ animation verbs

def hide_until(ob, t):
    """invisible before time t (children too)."""
    for o in [ob] + list(ob.children_recursive):
        o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
        o.hide_render = False; o.keyframe_insert("hide_render", frame=max(1, fr(t)))


def hide_from(ob, t):
    """invisible from time t on (children too)."""
    for o in [ob] + list(ob.children_recursive):
        o.hide_render = False; o.keyframe_insert("hide_render", frame=max(1, fr(t) - 1))
        o.hide_render = True; o.keyframe_insert("hide_render", frame=fr(t))


def show_from(ob, t):
    """visible again from time t (after a hide_from)."""
    for o in [ob] + list(ob.children_recursive):
        o.hide_render = True; o.keyframe_insert("hide_render", frame=max(1, fr(t) - 1))
        o.hide_render = False; o.keyframe_insert("hide_render", frame=fr(t))


def _keys(ob, path, t0, t1, fn, step=1):
    f0, f1 = fr(t0), fr(t1)
    for f in range(f0, f1 + 1, step):
        s = (f - f0) / max(1, f1 - f0)
        setattr(ob, path, fn(s)); ob.keyframe_insert(path, frame=f)
    if (f1 - f0) % step:
        setattr(ob, path, fn(1.0)); ob.keyframe_insert(path, frame=f1)


def appear(ob, t, how="pop", dur=0.5, dist=3.0):
    """make an object arrive at time t. how: pop | grow_z | rise | drop | slide_x | slide_y | fade_in (scale only)."""
    base_loc = Vector(ob.location); base_sc = Vector(ob.scale)
    hide_until(ob, t)
    if how == "pop":
        _keys(ob, "scale", t, t + dur, lambda s: base_sc * max(0.001, ease(s, "back")))
    elif how == "grow_z":
        _keys(ob, "scale", t, t + dur, lambda s: Vector((base_sc.x, base_sc.y, base_sc.z * max(0.001, ease(s, "out")))))
    elif how == "rise":
        _keys(ob, "location", t, t + dur, lambda s: base_loc + Vector((0, 0, -dist * (1 - ease(s, "out")))))
    elif how == "drop":
        sfx("thud", t + dur * 0.7, 0.5)

        def f(s):
            if s < 0.7: return base_loc + Vector((0, 0, dist * (1 - (s / 0.7) ** 2)))
            q = (s - 0.7) / 0.3
            return base_loc + Vector((0, 0, 0.12 * dist * 0.15 * math.sin(math.pi * q)))
        _keys(ob, "location", t, t + dur, f)
    elif how in ("slide_x", "slide_y"):
        ax = Vector((dist, 0, 0)) if how == "slide_x" else Vector((0, dist, 0))
        _keys(ob, "location", t, t + dur, lambda s: base_loc + ax * (1 - ease(s, "out")))
    else:
        raise ValueError(how)


def vanish(ob, t, how="pop", dur=0.4, dist=3.0):
    base_loc = Vector(ob.location); base_sc = Vector(ob.scale)
    if how == "pop":
        _keys(ob, "scale", t, t + dur, lambda s: base_sc * max(0.001, 1 - ease(s, "in")))
    elif how == "sink":
        _keys(ob, "location", t, t + dur, lambda s: base_loc + Vector((0, 0, -dist * ease(s, "in"))))
    hide_from(ob, t + dur)


def move(ob, t0, t1, loc=None, rot=None, scale=None, kind="inout"):
    """glide an object from where it is (at t0) to loc / rot (degrees) / scale by t1."""
    if loc is not None:
        a = Vector(ob.location); b = Vector(loc)
        _keys(ob, "location", t0, t1, lambda s: a.lerp(b, ease(s, kind)))
    if rot is not None:
        a = Vector(ob.rotation_euler); b = Vector([math.radians(x) for x in rot])
        _keys(ob, "rotation_euler", t0, t1, lambda s: a.lerp(b, ease(s, kind)))
    if scale is not None:
        a = Vector(ob.scale); b = Vector(scale if hasattr(scale, "__len__") else (scale,) * 3)
        _keys(ob, "scale", t0, t1, lambda s: a.lerp(b, ease(s, kind)))


def follow(ob, t0, t1, fn, face=True):
    """drive an object along any path: fn(s) -> (x, y, z) for s in 0..1. face=True turns it toward the motion;
    face="xy" turns it only left and right, so it stays level (fish, cars, animals)."""
    prev = None
    f0, f1 = fr(t0), fr(t1)
    for f in range(f0, f1 + 1):
        s = (f - f0) / max(1, f1 - f0)
        p = Vector(fn(s)); ob.location = p; ob.keyframe_insert("location", frame=f)
        if face:
            q = Vector(fn(min(1.0, s + 0.01)))
            dv = q - p
            if face == "xy": dv.z = 0.0
            if dv.length > 1e-5:
                ob.rotation_euler = dv.to_track_quat("X", "Z").to_euler(); ob.keyframe_insert("rotation_euler", frame=f)


def level(ob, keys, kind="inout"):
    """raise or lower something that has its pivot at the bottom (water, fill, a coat of tar):
    keys = [(t, fraction_of_full_height), ...]"""
    base = ob.scale.z
    for (ta, va), (tb, vb) in zip(keys, keys[1:]):
        _keys(ob, "scale", ta, tb, lambda s, va=va, vb=vb: Vector((ob.scale.x, ob.scale.y, base * max(0.001, va + (vb - va) * ease(s, kind)))))
    if keys[0][1] <= 0.001:
        hide_until(ob, keys[0][0] + 0.01)


def dig(cutter, t0, t1, extra=None):
    """dig a hole (the cutter grows down from the lawn), throw clods onto a pile beside it.
    extra = dict(pile=(x, y), pile_size=1.0, clods=18, start=0.0). start = how deep the hole already is at t0 (0..1);
    use start=0.35 when the dig opens the video, so frame 1 already shows a hole and flying dirt."""
    extra = extra or {}
    full = cutter.scale.z
    st0 = extra.get("start", 0.0)
    _keys(cutter, "scale", t0, t1, lambda s: Vector((cutter.scale.x, cutter.scale.y, full * max(0.02, st0 + (1 - st0) * ease(s, "out" if st0 else "inout")))))
    cx, cy = cutter.location.x, cutter.location.y + 1.0
    px, py = extra.get("pile", (cx - 4.5, cy + 3.0))
    ps = extra.get("pile_size", 1.0)
    pile = sphere("dirt_pile", 1.4 * ps, (px, py, -0.15), "mud", squash=0.45, noise=0.25, seg=24)
    sub = pile.modifiers.new("s", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    pile.scale = (1, 1, 1)
    for k in range(int((t1 - t0) / 0.35) + 1):
        sfx("dig", t0 + 0.35 * k, 0.55)
    if st0 == 0: hide_until(pile, t0 + 0.2)
    _keys(pile, "scale", t0 + (0 if st0 else 0.2), t1, lambda s: Vector([max(0.05, st0 * 0.6 + (1 - st0 * 0.6) * ease(s, "out"))] * 3))
    n = extra.get("clods", 18)
    for i in range(n):
        st = t0 + (t1 - t0 - 0.7) * i / max(1, n - 1) - (0.1 * (4 - i) if st0 and i < 4 else 0)
        c = sphere(f"clod_{cutter.name}_{i}", 0.13 + 0.08 * RNG.random(), (0, 0, 0), "soil", squash=0.75, noise=0.55, seg=10)
        sx = cx + (RNG.random() - 0.5) * 1.6; sy = cy + RNG.random() * 1.5
        ex = px + (RNG.random() - 0.5) * 1.2; ey = py + (RNG.random() - 0.5) * 0.8
        peak = extra.get("arc", 1.5) * (0.75 + 0.5 * RNG.random())
        spin = Vector((RNG.random(), RNG.random(), RNG.random())) * 7

        def path(s, sx=sx, sy=sy, ex=ex, ey=ey, peak=peak):
            return (sx + (ex - sx) * s, sy + (ey - sy) * s, -0.2 + 4 * peak * s * (1 - s) + 0.1 * s)
        hide_until(c, max(0.0, st)); hide_from(c, st + 0.7)
        follow(c, max(0.0, st), st + 0.7, lambda s, st=st, path=path: path(min(1.0, (max(0.0, st) - st) / 0.7 + s * (1 - (max(0.0, st) - st) / 0.7))), face=False)
        _keys(c, "rotation_euler", max(0.0, st), st + 0.7, lambda s, spin=spin: spin * s)
    return pile


def chunks(name, region, t, n=10, mat="soil", size=0.35, fall=1.5, dur=0.9):
    """a cave-in: n lumps break off inside region=((x0,x1),(y0,y1),(z0,z1)) and fall by 'fall' metres, tumbling."""
    out = []
    (x0, x1), (y0, y1), (z0, z1) = region
    for i in range(n):
        p = Vector((x0 + (x1 - x0) * RNG.random(), y0 + (y1 - y0) * RNG.random(), z0 + (z1 - z0) * RNG.random()))
        c = box(f"{name}_{i}", [size * (0.6 + 0.8 * RNG.random()) for _ in range(3)], p, mat, origin="center", bevel=0.05)
        st = t + 0.35 * RNG.random()
        hide_until(c, st)
        spin = Vector((RNG.random() - 0.5, RNG.random() - 0.5, RNG.random() - 0.5)) * 5
        drop = fall * (0.7 + 0.6 * RNG.random())
        _keys(c, "location", st, st + dur, lambda s, p=p, drop=drop: p + Vector((0, 0, -drop * s * s)))
        _keys(c, "rotation_euler", st, st + dur, lambda s, spin=spin: spin * s)
        out.append(c)
    return out


def arrows(name, starts, direction, t0, t1, length=1.0, mat="arrow", pulse=0.25, width=0.32):
    """block arrows that push along direction (x, y, z) from each start point, bobbing, then pop away at t1."""
    d = Vector(direction).normalized()
    out = []
    for i, p in enumerate(starts):
        a = arrow_mesh(f"{name}_{i}", length, width, mat)
        a.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        base = Vector(p)
        a.location = base
        appear(a, t0 + 0.06 * i, "pop", 0.35)
        f0, f1 = fr(t0 + 0.35 + 0.06 * i), fr(t1)
        for f in range(f0, f1 + 1, 2):
            tt = (f - f0) / FPS
            a.location = base + d * pulse * (0.5 - 0.5 * math.cos(tt * 2 * math.pi * 1.4))
            a.keyframe_insert("location", frame=f)
        vanish(a, t1, "pop", 0.3)
        out.append(a)
    return out


def flow(name, points, t0, t1, n=8, size=0.09, mat="flow", speed=1.0, stretch=2.4):
    """droplets streaming along a path (water through a pipe, a pour, a stream). Each drop is stretched along its
    direction of travel (stretch=1 for round beads). Loops until t1. For a pour, use 10+ drops of size 0.025-0.04."""
    pts = [Vector(p) for p in points]
    seg = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    total = sum(seg) or 1.0

    def at(u):
        u = (u % 1.0) * total
        for i, L in enumerate(seg):
            if u <= L or i == len(seg) - 1:
                return pts[i].lerp(pts[i + 1], min(1.0, u / L if L else 0))
            u -= L
    out = []
    for i in range(n):
        b = sphere(f"{name}_{i}", size, pts[0], mat, seg=12)
        b.scale = (1, 1, stretch)
        hide_until(b, t0); hide_from(b, t1)
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1):
            tt = (f - f0) / FPS
            u = i / n + tt * speed * 1.2 / total * 2.0
            p0 = at(u); p1 = at(u + 0.004)
            b.location = p0; b.keyframe_insert("location", frame=f)
            if stretch != 1 and (p1 - p0).length > 1e-6:
                b.rotation_euler = (p1 - p0).to_track_quat("Z", "Y").to_euler(); b.keyframe_insert("rotation_euler", frame=f)
        out.append(b)
    return out


def overlay(name, rect, mat, t0=None, t1=None, how="up", cut=None):
    """a tinted patch laid on the cut face (y = 0) to show wet soil, groundwater, heat, etc.
    rect = (x0, x1, z0, z1). how = up (grows from the bottom) | down | out (from the middle)."""
    x0, x1, z0, z1 = rect
    org = "bottom" if how == "up" else ("top" if how == "down" else "center")
    zloc = z0 if how == "up" else (z1 if how == "down" else (z0 + z1) / 2)
    o = box(name, (x1 - x0, 0.01, z1 - z0), ((x0 + x1) / 2, -0.012, zloc), mat, origin=org)
    if cut is not None:                          # keep the patch off an open hole: subtract the hole's cutter
        md = o.modifiers.new("cut", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cut; _try(md, "solver", SOLVER)
    if t0 is not None:
        if how == "out":
            hide_until(o, t0)
            _keys(o, "scale", t0, t1, lambda s: Vector([max(0.001, ease(s))] * 3))
        else:
            level(o, [(t0, 0.0), (t1, 1.0)])
    return o


def swarm(name, center, t0, t1, n=14, radius=0.8, mat="black_rubber", size=0.03):
    """tiny things buzzing around a point (insects, bacteria, sparks)."""
    c = Vector(center)
    for i in range(n):
        s = sphere(f"{name}_{i}", size, c, mat, seg=8)
        hide_until(s, t0); hide_from(s, t1)
        ph = [RNG.random() * 6.28 for _ in range(3)]; fq = [1.5 + RNG.random() * 2.5 for _ in range(3)]
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1):
            tt = (f - f0) / FPS
            s.location = c + Vector([radius * math.sin(fq[k] * tt * 2 + ph[k]) * (0.6 if k == 2 else 1) for k in range(3)])
            s.keyframe_insert("location", frame=f)


def rain(t0, t1, area=((-10, 10), (-1, 16)), n=260, mat="arrow_blue"):
    """falling rain streaks over the yard."""
    (x0, x1), (y0, y1) = area
    y0 = max(y0, 0.3)                      # never in front of the cut face (it would fall through the section)
    for i in range(n):
        d = cyl(f"rain_{i}", 0.008, 0.55, (0, 0, 0), mat, verts=4, origin="center")
        x = x0 + (x1 - x0) * RNG.random(); y = y0 + (y1 - y0) * RNG.random()
        ph = RNG.random()
        hide_until(d, t0); hide_from(d, t1)
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1, 1):
            tt = (f - f0) / FPS
            z = 9.3 - ((tt * 1.6 + ph) % 1.0) * 9.0         # lands on the lawn (z > 0.3), never below it
            d.location = (x, y, z); d.keyframe_insert("location", frame=f)


def bubbles(name, origin, t0, t1, n=10, rise=1.0, mat="white", spread=0.4):
    o = Vector(origin)
    for i in range(n):
        b = sphere(f"{name}_{i}", 0.025 + 0.02 * RNG.random(), o, mat, seg=10)
        hide_until(b, t0); hide_from(b, t1)
        off = Vector(((RNG.random() - 0.5) * spread, RNG.random() * 0.3, 0)); ph = RNG.random()
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1):
            tt = (f - f0) / FPS
            u = (tt * 0.8 + ph) % 1.0
            b.location = o + off + Vector((0.05 * math.sin(u * 12), 0, rise * u)); b.keyframe_insert("location", frame=f)


# ------------------------------------------------------------------ camera

def camera(shots):
    """shots = [dict(t0=, t1=, a=((x,y,z), (look x,y,z)), b=((x,y,z), (look)), lens=35), ...] in time order.
    Hard cut at every shot start, smooth ease inside a shot. Cover the whole video with no gaps."""
    cam = bpy.context.scene.camera
    pref = bpy.context.preferences.edit
    old = pref.keyframe_new_interpolation_type
    pref.keyframe_new_interpolation_type = "CONSTANT"
    for sh in shots:
        f0, f1 = fr(sh["t0"]), fr(sh["t1"])
        (pa, la), (pb, lb) = sh["a"], sh.get("b", sh["a"])
        lens_a = sh.get("lens", 35); lens_b = sh.get("lens_b", lens_a)
        for f in range(f0, f1 + 1):
            s = ease((f - f0) / max(1, f1 - f0), sh.get("ease", "inout"))
            p = Vector(lerp(pa, pb, s)); l = Vector(lerp(la, lb, s))
            cam.location = p; cam.keyframe_insert("location", frame=f)
            cam.rotation_euler = (l - p).to_track_quat("-Z", "Y").to_euler(); cam.keyframe_insert("rotation_euler", frame=f)
            cam.data.lens = lens_a + (lens_b - lens_a) * s; cam.data.keyframe_insert("lens", frame=f)
    pref.keyframe_new_interpolation_type = old


def linear_keys():
    """call once at the start of build(): new keys interpolate linearly (we key every frame anyway)."""
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"


# camera framings around a focus point F = (x, y, z), always from the open side (y < 0)
VIEWS = {
    "wide":    ((0.6, -13.0, 4.4), (0.0, 5.0, 0.4), 34),   # house, lawn and the whole section (the reference's main shot)
    "section": ((0.0, -9.0, 1.2), (0.0, 0.8, -0.5), 34),   # the cut face head-on, lawn edge in the upper half
    "close":   ((0.6, -5.6, 0.35), (0.0, 0.6, -0.45), 32), # near the action, still showing the cut face
    "high":    ((0.0, -7.0, 5.2), (0.0, 1.8, -0.5), 32),   # above, looking down into the hole and the section
    "left":    ((-6.0, -8.0, 2.6), (0.0, 1.2, -0.4), 32),  # three-quarter from the left
    "right":   ((6.0, -8.0, 2.6), (0.0, 1.2, -0.4), 32),   # three-quarter from the right
    "low":     ((1.0, -7.0, -0.3), (0.0, 0.8, -0.2), 32),  # just under the lawn line, looking along the section
    "house":   ((0.5, -9.0, 1.2), (0.3, 9.0, 3.8), 34),    # lawn level, looking at the house and sky
}


def view(kind, F, t0, t1, push=0.1, slide=0.0, lift=0.0, lens=None):
    """one shot: camera at VIEWS[kind] around focus F, drifting toward F by 'push' (fraction) and sideways by 'slide' metres."""
    off, look, ln = VIEWS[kind]
    F = Vector(F); pa = F + Vector(off); la = F + Vector(look)
    pb = pa.lerp(la, push) + Vector((slide, 0, lift))
    return dict(t0=t0, t1=t1, a=(tuple(pa), tuple(la)), b=(tuple(pb), tuple(la + Vector((slide * 0.3, 0, 0)))), lens=lens or ln)


def cuts(t0, t1, F, kinds, every=2.2, push=0.1):
    """split t0..t1 into shots of about 'every' seconds, cycling through kinds, alternating drift direction."""
    n = max(1, round((t1 - t0) / every))
    out = []
    for i in range(n):
        a = t0 + (t1 - t0) * i / n; b = t0 + (t1 - t0) * (i + 1) / n
        out.append(view(kinds[i % len(kinds)], F, a, b, push=push, slide=0.5 if i % 2 else -0.5))
    return out


# ------------------------------------------------------------------ containers cut into the section

def inset(profile, d):
    """shrink a closed 2D outline [(u, z), ...] inward by d metres (any polygon, either winding)."""
    n = len(profile)
    area = sum(profile[i][0] * profile[(i + 1) % n][1] - profile[(i + 1) % n][0] * profile[i][1] for i in range(n)) / 2
    sgn = 1 if area > 0 else -1
    out = []
    for i in range(n):
        p0, p1, p2 = Vector(profile[i - 1]), Vector(profile[i]), Vector(profile[(i + 1) % n])
        e1 = (p1 - p0).normalized(); e2 = (p2 - p1).normalized()
        n1 = Vector((-e1.y, e1.x)) * sgn; n2 = Vector((-e2.y, e2.x)) * sgn
        bis = (n1 + n2)
        if bis.length < 1e-6: bis = n1
        bis.normalize()
        k = d / max(0.2, bis.dot(n1))
        q = p1 + bis * k
        out.append((q.x, q.y))
    return out


def solid(name, profile, y0, y1, mat):
    """a solid whose cross-section (in the cut face) is profile, running from y0 back to y1."""
    return prism(name, profile, y1 - y0, (0, y0, 0), mat)


def lining(name, profile, y1, thick, mat, top=0.0, t=None, how="drop"):
    """a shell of 'thick' metres lying on the walls of a hole cut with the same profile (sand bed, liner, concrete shell).
    Its rim is at z = top. With t it arrives at that time (drop / rise / pop)."""
    outer = [(u, min(z, top)) for u, z in profile]
    inner = [(u, (z if z < top - 1e-6 else top + 1.0)) for u, z in inset(profile, thick)]
    o = solid(name, outer, 0.0, y1, mat)
    cutter = solid(name + "_in", inner, -0.5, y1 - thick, mat)
    cutter.hide_render = True; cutter.display_type = "WIRE"
    md = o.modifiers.new("hollow", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cutter; _try(md, "solver", SOLVER)
    if t is not None:
        appear(o, t, how, 0.6, dist=3.0)
    return o


def liquid(name, profile, y1, mat, keys, kind="inout"):
    """liquid inside a container with this inner profile, from the cut face back to y1.
    keys = [(t, surface_z), ...]: the surface height over time (start below the floor for 'empty')."""
    zs = [z for _, z in profile]; zb = min(zs) - 0.05
    top = max(zs)
    body = solid(name, [(u, (z if z < top - 1e-6 else top + 1.0)) for u, z in profile], 0.0, y1, mat)
    lv = box(name + "_level", (40, 40, 1.0), (0, 10, zb), mat, origin="bottom")
    lv.hide_render = True; lv.display_type = "WIRE"
    md = body.modifiers.new("level", "BOOLEAN"); md.operation = "INTERSECT"; md.object = lv; _try(md, "solver", SOLVER)
    lv.scale.z = max(0.001, keys[0][1] - zb)
    for (ta, za), (tb, zb2) in zip(keys, keys[1:]):
        _keys(lv, "scale", ta, tb, lambda s, za=za, zb2=zb2: Vector((1, 1, max(0.001, za + (zb2 - za) * ease(s, kind) - zb))))
    first_full = next((t for t, z in keys if z > zb + 0.02), None)
    if keys[0][1] <= zb + 0.02 and first_full is not None:
        hide_until(body, keys[0][0])
    return body, lv


def gravel(name, region, t=None, size=0.045, how="pop"):
    """a gravel bed you can see stone by stone: a gravel-textured block filling region = ((x0, x1), (y0, y1), (z0, z1))
    plus real 3D stones scattered on its cut face (y = y0) and top. Use it for drains, soakaways, footings, paths.
    With t it arrives at that time."""
    (x0, x1), (y0, y1), (z0, z1) = region
    blk = box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, z0), "gravel")
    shapes = []
    for k in range(3):                                   # three stone shapes, shared by every stone
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        rr = random.Random(k + 11)
        for v in bm.verts: v.co *= 0.75 + 0.5 * rr.random()
        me = bpy.data.meshes.new(f"{name}_stone{k}"); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        me.materials.append(M("rock")); shapes.append(me)
    stones = []
    face = (x1 - x0) * (z1 - z0); top = (x1 - x0) * min(0.6, y1 - y0)
    n = int(min(900, (face + top) / (size * size) * 1.1))
    for i in range(n):
        st = bpy.data.objects.new(f"{name}_s{i}", shapes[i % 3]); _link(st)
        sc = size * (0.6 + 0.8 * RNG.random()); st.scale = (sc, sc * (0.7 + 0.4 * RNG.random()), sc * (0.6 + 0.3 * RNG.random()))
        st.rotation_euler = (RNG.random() * 6.3, RNG.random() * 6.3, RNG.random() * 6.3)
        if RNG.random() < face / (face + top):
            st.location = (x0 + (x1 - x0) * RNG.random(), y0 + 0.01 + 0.02 * RNG.random(), z0 + (z1 - z0) * RNG.random())
        else:
            st.location = (x0 + (x1 - x0) * RNG.random(), y0 + min(0.6, y1 - y0) * RNG.random(), z1 + 0.01)
        st.parent = blk; st.location = st.location - blk.location
        stones.append(st)
    if t is not None:
        appear(blk, t, how, 0.5)
    return blk


# ------------------------------------------------------------------ organic pits (ponds, craters, sinkholes, root balls)

def blob(cx, cy, rx, ry, wobble=0.07, n=72, seed=3):
    """a natural closed outline seen from above: an ellipse with a gentle random wobble. Returns [(x, y), ...]."""
    rr = random.Random(seed)
    harm = [(k, rr.uniform(-wobble, wobble), rr.uniform(0, 6.28)) for k in (2, 3, 5)]
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        f = 1 + sum(w * math.sin(k * a + ph) for k, w, ph in harm)
        out.append((cx + rx * f * math.cos(a), cy + ry * f * math.sin(a)))
    return out


def _center(outline):
    return (sum(p[0] for p in outline) / len(outline), sum(p[1] for p in outline) / len(outline))


def loft(name, outline, levels, mat, grow=0.0):
    """a closed solid through stacked rings: levels = [(scale, z), ...] from the top down; each ring is the outline
    scaled about its centre. grow adds metres all round (positive = bigger, used for shells)."""
    cx, cy = _center(outline)
    bm = bmesh.new(); rings = []
    for sc, z in levels:
        ring = []
        for x, y in outline:
            dx, dy = x - cx, y - cy; r = math.hypot(dx, dy) or 1.0
            k = sc + grow / r
            ring.append(bm.verts.new((cx + dx * k, cy + dy * k, z - (grow if z < 0.9 else 0.0))))
        rings.append(ring)
    n = len(outline)
    for ra, rb in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


_KEEP = None


def behind_cut(ob):
    """trim anything that sticks out in front of the cut face (y < 0), so the section stays a clean slice."""
    global _KEEP
    if _KEEP is None or _KEEP.name not in bpy.data.objects:
        _KEEP = box("_keep_behind_cut", (200, 100, 80), (0, 50, -40), "soil")
        _KEEP.hide_render = True; _KEEP.display_type = "WIRE"
    md = ob.modifiers.new("behind_cut", "BOOLEAN"); md.operation = "INTERSECT"; md.object = _KEEP; _try(md, "solver", SOLVER)
    return ob


def pit(name, outline, levels, t0=None, t1=None, extra=None):
    """dig an organic hole into the soil block: outline from blob(), levels = [(scale, z), ...] below the lawn,
    e.g. [(1.0, -0.05), (0.96, -0.38), (0.72, -0.42), (0.62, -1.3)] for a pond with a plant shelf.
    Keep part of the outline at y < 0 so the cut face slices through it. Returns the (hidden) cutter."""
    c = loft(name, outline, [(levels[0][0], 1.0)] + list(levels), "soil")
    c.hide_render = True; c.display_type = "WIRE"
    mod = SOIL.modifiers.new(name, "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = c
    _try(mod, "solver", SOLVER)
    if t0 is not None:
        dig(c, t0, t1, extra=extra)
    return c


def pit_shell(name, outline, levels, thick, mat, inset=0.0, top=0.0, t=None, how="drop"):
    """a layer lying on the walls of a pit dug with the same outline/levels (sand bed, rubber liner, concrete):
    'inset' = how far inside the pit wall it starts, 'thick' = its thickness; its rim sits at z = top."""
    outer_lv = [(levels[0][0], top)] + list(levels)
    outer = loft(name, outline, outer_lv, mat, grow=-inset)
    inner = loft(name + "_in", outline, [(levels[0][0], top + 1.0)] + list(levels), mat, grow=-(inset + thick))
    inner.hide_render = True; inner.display_type = "WIRE"
    md = outer.modifiers.new("hollow", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = inner; _try(md, "solver", SOLVER)
    behind_cut(outer)
    if t is not None:
        appear(outer, t, how, 0.6, dist=3.0)
    return outer


def pit_liquid(name, outline, levels, mat, keys, inset=0.1, kind="inout"):
    """water (or mud, oil...) filling a pit inside its lining: keys = [(t, surface_z), ...]. Returns (body, level box, shape)
    where 'shape' is a hidden copy of the water's outline you can intersect overlays with (cut face layers)."""
    body = loft(name, outline, [(levels[0][0], 1.0)] + list(levels), mat, grow=-inset)
    shape = loft(name + "_shape", outline, [(levels[0][0], 1.0)] + list(levels), mat, grow=-inset)
    shape.hide_render = True; shape.display_type = "WIRE"
    zb = min(z for _, z in levels) - inset - 0.05
    lv = box(name + "_level", (40, 40, 1.0), (0, 10, zb), mat, origin="bottom")
    lv.hide_render = True; lv.display_type = "WIRE"
    md = body.modifiers.new("level", "BOOLEAN"); md.operation = "INTERSECT"; md.object = lv; _try(md, "solver", SOLVER)
    behind_cut(body)
    lv.scale.z = max(0.001, keys[0][1] - zb)
    for (ta, za), (tb, zb2) in zip(keys, keys[1:]):
        _keys(lv, "scale", ta, tb, lambda s, za=za, zb2=zb2: Vector((1, 1, max(0.001, za + (zb2 - za) * ease(s, kind) - zb))))
    return body, lv, shape


def pit_cap(name, outline, z_top, thick, mat, grow=-0.1):
    """a thin sheet over a pit following its outline (ice, a cover, a lid), pivot at its top (use level() to grow it down)."""
    cx, cy = _center(outline)
    local = [(x - cx, y - cy) for x, y in outline]
    ob = loft(name, local, [(1.0, 0.0), (0.985, -thick)], mat, grow=grow)
    ob.location = (cx, cy, z_top)
    behind_cut(ob)
    return ob


def inside(outline, scale=0.75, n=8, min_gap=0.7, seed=5, y_min=0.25):
    """n spread-out points inside an outline (scaled about its centre), behind the cut face: for lilies, plants, rocks."""
    cx, cy = _center(outline); rr = random.Random(seed); pts = []
    poly = [(cx + (x - cx) * scale, cy + (y - cy) * scale) for x, y in outline]

    def within(px, py):
        c = False
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-12) + x1: c = not c
        return c
    xs = [x for x, _ in poly]; ys = [y for _, y in poly]
    for _ in range(4000):
        if len(pts) >= n: break
        px, py = rr.uniform(min(xs), max(xs)), rr.uniform(max(min(ys), y_min), max(ys))
        if within(px, py) and all(math.hypot(px - a, py - b) >= min_gap for a, b in pts): pts.append((px, py))
    return pts


def clip_to(ob, shape):
    """keep only the part of ob that lies inside shape (e.g. a cut-face colour layer inside the water)."""
    md = ob.modifiers.new("clip", "BOOLEAN"); md.operation = "INTERSECT"; md.object = shape; _try(md, "solver", SOLVER)
    return ob


def outline_points(outline, y_min=0.08, every=1):
    """points of an outline that lie behind the cut face (for edge stones, plants, a fence)."""
    return [p for i, p in enumerate(outline) if p[1] >= y_min and i % every == 0]
```

`kit/build.py`
```python
"""build.py: build the story's 3D scene in Blender and render it.
  blender -b --factory-startup --python kit/build.py -- STORY_DIR --stills 0.5,8,20      quick look (PNG stills in STORY/stills)
  blender -b --factory-startup --python kit/build.py -- STORY_DIR --preview              half-size animation, fast
  blender -b --factory-startup --python kit/build.py -- STORY_DIR --final                1080x1920 frames in STORY/frames
Reads STORY/timing.json (from voice.py) and STORY/scene.py (your scene: def build(W, T) -> camera shots).
Frames already on disk are skipped, so a stopped render resumes where it left off."""
import importlib.util, json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import world as W

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
story = os.path.abspath(args[0])
mode = "final" if ("--final" in args or "--cuts" in args) else ("preview" if "--preview" in args else "stills")


class Timing:
    """T.line(i) / T['id'] -> the line dict (start, end, words); T.word(i, 'pool') -> that word's start time."""
    def __init__(self, path):
        d = json.load(open(path, encoding="utf-8"))
        self.lines = d["lines"]; self.voice_end = d["voice_end"]
        self.end = round(self.voice_end + 1.0, 2)          # a short tail after the last word

    def line(self, i):
        return self.lines[i]

    def __getitem__(self, key):
        for l in self.lines:
            if l.get("id") == key: return l
        raise KeyError(f"no line with id '{key}' in script.json")

    def word(self, key, w, nth=0):
        l = self[key] if isinstance(key, str) else self.lines[key]
        hits = [x for x in l["words"] if x["w"].lower().strip(".,!?;:'\"") == w.lower()]
        if len(hits) <= nth: raise KeyError(f"word '{w}' not in line {key}: {l['text']}")
        return hits[nth]["s"]


T = Timing(os.path.join(story, "timing.json"))
W.setup(T.end, preview=(mode != "final"))
W.linear_keys()
spec = importlib.util.spec_from_file_location("scene", os.path.join(story, "scene.py"))
scene = importlib.util.module_from_spec(spec); spec.loader.exec_module(scene)
t = time.time()
shots = scene.build(W, T)
W.camera(shots)
W.finalize(T.end)
cut_frames = sorted({W.fr(sh["t0"]) for sh in shots})
json.dump(sorted(W.SFX, key=lambda c: c["at"]), open(os.path.join(story, "sfx.json"), "w", encoding="utf-8"), indent=0)
print(f"scene built in {time.time() - t:.1f} s, {len(bpy.data.objects)} objects, {T.end:.2f} s of video")
sc = bpy.context.scene
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(story, "scene.blend"))

if mode == "stills":
    ts = [float(x) for x in args[args.index("--stills") + 1].split(",")] if "--stills" in args else [0.2, T.end / 2]
    os.makedirs(os.path.join(story, "stills"), exist_ok=True)
    sc.render.resolution_percentage = 50 if "--half" in args else 100
    sc.render.image_settings.file_format = "JPEG"
    sc.render.use_overwrite = True
    for tt in ts:
        sc.frame_set(W.fr(tt))
        sc.render.filepath = os.path.join(story, "stills", f"t{tt:06.2f}.jpg")
        t = time.time(); bpy.ops.render.render(write_still=True)
        print(f"still {tt:.2f} s -> {sc.render.filepath} ({time.time() - t:.1f} s)")
elif "--cuts" in args:
    # re-render only the first two frames of every shot (after a camera or motion-blur change), overwriting them
    out = os.environ.get("WHATIF_OUT") or os.path.join(story, "frames")
    sc.render.use_overwrite = True
    for f0 in cut_frames:
        for f in (f0, f0 + 1):
            sc.frame_set(f); sc.render.filepath = os.path.join(out, f"{f:04d}.jpg")
            bpy.ops.render.render(write_still=True)
    print(f"re-rendered {2 * len(cut_frames)} cut frames -> {out}")
else:
    out = os.environ.get("WHATIF_OUT") or os.path.join(story, "frames" if mode == "final" else "preview_frames")
    os.makedirs(out, exist_ok=True)
    sc.render.filepath = os.path.join(out, "")
    if "--range" in args:
        a, b = args[args.index("--range") + 1].split("-"); sc.frame_start, sc.frame_end = int(a), int(b)
    t = time.time()
    bpy.ops.render.render(animation=True)
    n = sc.frame_end - sc.frame_start + 1
    print(f"rendered {n} frames in {time.time() - t:.0f} s ({(time.time() - t) / max(1, n):.2f} s per frame) -> {out}")
```

`kit/voice.py`
```python
"""voice.py STORY_DIR : script.json -> narration.wav + timing.json (the time of every word, for captions and animation)
Main voice: Kokoro-82M am_michael, a free open model that runs on this computer's CPU. Word times come from faster-whisper.
Only if Kokoro can't run: edge-tts (free online voice), then the computer's own voice. Force one with "engine" in script.json.
needs: pip install kokoro-onnx soundfile faster-whisper edge-tts imageio-ffmpeg numpy"""
import asyncio, difflib, json, os, platform, re, shutil, subprocess, sys, tempfile, urllib.request, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); MODELS = os.path.join(os.path.dirname(HERE), "assets", "voice")
KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"

def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
part = sys.argv[1]
spec = json.load(open(os.path.join(part, "script.json"), encoding="utf-8"))
VOICE, SPEED = spec.get("voice", "am_michael"), float(spec.get("speed", 1.15))
engine = os.environ.get("VOICE_ENGINE", spec.get("engine", "kokoro"))
os.makedirs(os.path.join(part, "vo"), exist_ok=True); os.makedirs(MODELS, exist_ok=True)

def decode(path):
    return subprocess.run([FF, "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout

_k = _w = None
def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
            p = os.path.join(MODELS, n)
            if not os.path.exists(p):
                print("downloading", n, "(once)"); urllib.request.urlretrieve(KOKORO_URL + n, p + ".part"); os.replace(p + ".part", p)
        _k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    return _k

def whisper():
    global _w
    if _w is None:
        from faster_whisper import WhisperModel, download_model
        d = os.path.join(MODELS, "whisper-base.en")
        if not os.path.exists(os.path.join(d, "model.bin")): print("downloading the timing model (once)"); download_model("base.en", output_dir=d)
        _w = WhisperModel(d, device="cpu", compute_type="int8")
    return _w

def norm(w): return re.sub(r"[^a-z0-9]", "", w.lower())
def clean(w): return w.strip(".,!?;\"()[]").rstrip(".")

def estimate(text, raw):
    """word times in proportion to word length, inside the voiced part of the line"""
    x = np.abs(np.frombuffer(raw, np.int16).astype(np.float32)); loud = np.where(x > 600)[0]
    a, b = (loud[0] / SR, loud[-1] / SR) if len(loud) else (0, len(x) / SR)
    ws = text.split(); k = [len(w) + 2 for w in ws]; tot = sum(k); out, t = [], a
    for w, n in zip(ws, k):
        d = (b - a) * n / tot; out.append((clean(w), t, d * 0.9)); t += d
    return out

def align(text, raw):
    """word times from faster-whisper, matched back to the script's own words"""
    sw = text.split()

    def score(heard):        # matched script words whose times are real (rising, non-zero length)
        sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(h[0]) for h in heard], autojunk=False)
        good, last = 0, -1.0
        for a, b, n in sm.get_matching_blocks():
            for j in range(n):
                s, e = heard[b + j][1], heard[b + j][2]
                if s > last + 0.01 and e - s > 0.02: good += 1
                last = max(last, s)
        return good
    try:
        audio = np.frombuffer(raw, np.int16).astype(np.float32)[::3] / 32768      # 48 kHz -> 16 kHz
        best = None
        for prompt in (text, None):     # the prompt helps spelling but sometimes makes whisper skip or stack words
            segs, _ = whisper().transcribe(audio, language="en", word_timestamps=True, beam_size=1, initial_prompt=prompt)
            heard = [(w.word, w.start, w.end) for s in segs for w in s.words]
            if best is None or score(heard) > score(best): best = heard
            if score(best) >= len(sw) - 1: break
        heard = best
    except Exception as e:
        print("word timing fell back to an estimate:", e); return estimate(text, raw)
    times = [None] * len(sw)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(h[0]) for h in heard], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for j in range(n): times[a + j] = (heard[b + j][1], heard[b + j][2])
    if not any(times): return estimate(text, raw)
    end = len(raw) / 2 / SR
    i = 0
    while i < len(sw):                                   # words whisper didn't match: share the gap by length
        if times[i] is None:
            j = i
            while j < len(sw) and times[j] is None: j += 1
            t0 = times[i - 1][1] if i > 0 else max(0.0, (times[j][0] if j < len(sw) else end) - 0.3 * (j - i))
            t1 = times[j][0] if j < len(sw) else min(end, t0 + 0.35 * (j - i))
            k = [len(w) + 2 for w in sw[i:j]]; tot = sum(k); t = t0
            for m, n in zip(range(i, j), k):
                d = (t1 - t0) * n / tot; times[m] = (t, t + d); t += d
            i = j
        else: i += 1
    for k in range(len(sw) - 1):                         # a zero-length word stacked on the next one: share the next word's span
        (s0, e0), (s1, e1) = times[k], times[k + 1]
        if s1 - s0 < 0.04 and e1 > s0 + 0.1:
            cut = s0 + (e1 - s0) * (len(sw[k]) + 1) / (len(sw[k]) + len(sw[k + 1]) + 2)
            times[k] = (s0, cut); times[k + 1] = (cut, e1)
    return [(clean(w), s, max(0.05, e - s)) for w, (s, e) in zip(sw, times)]

async def edge(text, voice, path):
    import edge_tts
    if re.match(r"^[ab][fm]_", voice): voice = "en-US-AvaNeural" if voice[1] == "f" else "en-US-AndrewNeural"
    for attempt in range(3):
        try:
            words, audio = [], bytearray()
            async for ch in edge_tts.Communicate(text, voice, rate="+5%", boundary="WordBoundary").stream():
                if ch["type"] == "audio": audio += ch["data"]
                elif ch["type"] == "WordBoundary": words.append((ch["text"], ch["offset"] / 1e7, ch["duration"] / 1e7))
            if not audio or not words: raise RuntimeError("empty answer")
            open(path, "wb").write(audio); return words
        except Exception as e:
            print("edge-tts retry", attempt + 1, e); await asyncio.sleep(2 + attempt * 2)
    raise RuntimeError("edge-tts is not answering")

def offline(text, path):
    tmp = tempfile.mkdtemp(); txt = os.path.join(tmp, "line.txt"); open(txt, "w", encoding="utf-8").write(text)
    if platform.system() == "Windows":
        ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; "
              f"$s.SetOutputToWaveFile('{path}'); $s.Speak([IO.File]::ReadAllText('{txt}')); $s.Dispose()")
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    elif platform.system() == "Darwin": subprocess.run(["say", "-f", txt, "-o", path, "--data-format=LEI16@22050"], check=True)
    else: subprocess.run(["espeak-ng", "-f", txt, "-w", path], check=True)

async def speak(i, line):
    """one line -> (pcm at 48 kHz, word boundaries relative to that pcm)"""
    text, path = line["text"].strip(), os.path.join(part, "vo", f"line{i:02d}")
    if engine == "kokoro":
        import soundfile as sf
        a, sr = kokoro().create(text, voice=line.get("voice", VOICE), speed=float(line.get("speed", SPEED)), lang="en-us")
        sf.write(path + ".wav", a, sr); raw = decode(path + ".wav"); return raw, align(text, raw)
    if engine == "edge":
        bounds = await edge(text, line.get("voice", VOICE), path + ".mp3"); return decode(path + ".mp3"), bounds
    offline(text, path + ".wav"); raw = decode(path + ".wav"); return raw, align(text, raw)

async def main():
    global engine
    order = {"kokoro": ["kokoro", "edge", "offline"], "edge": ["edge", "offline"], "offline": ["offline"]}[engine]
    for engine in order:
        try:
            lead = spec.get("lead", 0.05)
            pcm, cursor, out = bytearray(b"\0\0" * int(lead * SR)), lead, []
            for i, line in enumerate(spec["lines"]):
                raw, bounds = await speak(i, line)
                text = line["text"].strip()
                # trim the silence around each line, but never into the voice: word times from whisper often end a
                # syllable early ("liner" -> "line"), so the cut follows the last audible sample, not the last word time
                pcm16 = np.abs(np.frombuffer(raw, np.int16).astype(np.float32))
                voiced = np.where(pcm16 > 0.01 * 32768)[0]
                v0 = voiced[0] / SR if len(voiced) else 0.0
                v1 = voiced[-1] / SR if len(voiced) else len(raw) / 2 / SR
                a = max(0.0, min(bounds[0][1] - 0.06, v0 - 0.03))
                b = min(len(raw) / 2 / SR, max(bounds[-1][1] + bounds[-1][2] + 0.1, v1 + 0.05))
                raw = raw[int(a * SR) * 2:int(b * SR) * 2]; dur = len(raw) / 2 / SR
                words = []
                for btext, off, d in bounds:                                  # one boundary can hold several words
                    ws = btext.split() or [btext]
                    for j, w in enumerate(ws):
                        s = off - a + d * j / len(ws); e = off - a + d * (j + 1) / len(ws)
                        words.append({"w": w, "s": round(cursor + s, 3), "e": round(cursor + e, 3)})
                extra = {k: v for k, v in line.items() if k not in ("text", "pause", "speed")}
                out.append({"i": i, "text": text, "start": round(cursor, 3), "end": round(cursor + dur, 3), "words": words, **extra})
                pcm += raw; gap = float(line.get("pause", spec.get("pause", 0.12)))
                pcm += b"\0\0" * int(gap * SR); cursor += dur + gap
                print(f"line {i:2d}  {cursor:6.2f} s  {len(words):2d} words  {text[:60]}")
            break
        except Exception as e:
            print(f"voice '{engine}' failed ({e}); trying the next one")
    else:
        sys.exit("no voice worked")
    with wave.open(os.path.join(part, "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    json.dump({"voice_end": round(cursor, 3), "engine": engine, "voice": VOICE, "lines": out},
              open(os.path.join(part, "timing.json"), "w", encoding="utf-8"), indent=1)
    n = sum(len(l["words"]) for l in out)
    print(f"narration {cursor:.2f} s, {n} words, {n / cursor * 60:.0f} words per minute, voice: {engine}")

asyncio.run(main())
```

`kit/sound.py`
```python
"""sound.py STORY_DIR : narration.wav + sfx.json (+ timing.json) -> mix.wav at -14 LUFS.
The music bed and every sound effect are synthesized here (no downloads, no licences): a soft plucked
arpeggio over warm chords, about 12 dB under the voice and ducked while he speaks.
needs: pip install numpy imageio-ffmpeg"""
import json, os, shutil, subprocess, sys, wave
import numpy as np


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()
SR = 48000
story = sys.argv[1]
timing = json.load(open(os.path.join(story, "timing.json"), encoding="utf-8"))
TOTAL = timing["voice_end"] + 1.0
N = int(TOTAL * SR)
rng = np.random.default_rng(11)
cues = json.load(open(os.path.join(story, "sfx.json"), encoding="utf-8")) if os.path.exists(os.path.join(story, "sfx.json")) else []


def lowpass(x, hz):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f *= 1 / (1 + (fr / hz) ** 4); return np.fft.irfft(f, len(x))


def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(f, len(x))


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def tone(f0, n, f1=None):
    t = np.arange(n) / SR
    fr = f0 if f1 is None else f0 * (f1 / f0) ** (t / max(t[-1], 1e-6))
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, t.shape)) / SR)


def reverb(x, secs=1.6, wet=0.3):
    n = int(secs * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * secs / 6)); ir = lowpass(ir, 5000); ir /= np.abs(ir).sum() ** 0.5 * 30
    L = len(x) + n; F = np.fft.rfft(x, L) * np.fft.rfft(ir, L)
    return x + wet * np.fft.irfft(F, L)[:len(x)]


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def music(n):
    """96 bpm, Cmaj7 - Am7 - Fmaj7 - G6, a marimba-like arpeggio in eighths over a soft pad."""
    beat = 60 / 96; bar = 4 * beat
    chords = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]]
    out = np.zeros(n + SR * 3)
    t = 0.0; k = 0
    while t < n / SR:
        ch = chords[(k // 1) % 4]
        # pad: three soft detuned sines per note, slow attack
        L = int(bar * SR)
        pad = sum(0.5 * tone(midi(m), L) + 0.25 * tone(midi(m) * 1.003, L) + 0.12 * tone(midi(m) * 2, L) for m in ch[1:])
        e = np.minimum(1, np.arange(L) / (0.4 * SR)) * np.minimum(1, (L - np.arange(L)) / (0.3 * SR))
        i0 = int(t * SR); out[i0:i0 + L] += 0.05 * pad * e
        # bass on beat 1 and 3
        for b in (0, 2):
            Lb = int(1.4 * SR); bs = tone(midi(ch[0] - 12), Lb) * env(Lb, 0.01, 0.35)
            j = int((t + b * beat) * SR); out[j:j + Lb] += 0.22 * bs
        # pluck arpeggio, eighth notes, with a little swing in velocity
        pat = [0, 2, 1, 3, 2, 1, 3, 2]
        for q, idx in enumerate(pat):
            m = ch[idx] + 12; Lp = int(0.9 * SR)
            pl = (tone(midi(m), Lp) + 0.35 * tone(midi(m) * 4, Lp) * env(Lp, 0.001, 0.03) + 0.2 * tone(midi(m) * 2, Lp)) * env(Lp, 0.002, 0.18)
            j = int((t + q * beat / 2) * SR); out[j:j + Lp] += (0.10 if q % 2 == 0 else 0.07) * pl
        t += bar; k += 1
    out = reverb(lowpass(out[:n], 6500), 1.8, 0.35)
    return out / (np.abs(out).max() + 1e-9)


def make(kind, dur=None):
    L = lambda s: int(s * SR)
    noise = lambda n: rng.standard_normal(n)
    if kind == "dig":
        n = L(0.35); return 0.8 * tone(90, n, 55) * env(n, 0.002, 0.06) + 0.6 * band(noise(n), 300, 3500) * env(n, 0.002, 0.07)
    if kind == "thud":
        n = L(0.6); return tone(75, n, 42) * env(n, 0.002, 0.12) + 0.35 * band(noise(n), 80, 900) * env(n, 0.001, 0.05)
    if kind == "pop":
        n = L(0.15); return 0.7 * tone(500, n, 900) * env(n, 0.001, 0.03)
    if kind == "click":
        n = L(0.08); return 0.7 * tone(1700, n) * env(n, 0.0002, 0.01)
    if kind == "chime":
        n = L(1.6); return sum(0.3 * tone(f, n) * env(n, 0.003, 0.5) for f in (1046.5, 1318.5, 1568.0))
    if kind == "whoosh":
        n = L(0.7); return band(noise(n), 500, 4000) * np.sin(np.linspace(0, np.pi, n)) ** 2
    if kind == "splash":
        n = L(1.0); x = band(noise(n), 400, 7000) * env(n, 0.003, 0.18)
        for k in range(10):
            j = int(rng.uniform(0.05, 0.6) * SR); dn = L(0.06); x[j:j + dn] += 0.4 * tone(rng.uniform(900, 2200), dn, rng.uniform(1500, 3500)) * env(dn, 0.001, 0.015)
        return x
    if kind == "bubble":
        n = L(0.5); x = np.zeros(n)
        for k in range(5):
            j = int(rng.uniform(0, 0.35) * SR); dn = L(0.08); x[j:j + dn] += tone(rng.uniform(400, 800), dn, rng.uniform(900, 1600)) * env(dn, 0.002, 0.02)
        return x
    if kind in ("pour", "hum"):
        n = L(dur or 2.0)
        x = band(noise(n), 300, 5000) if kind == "pour" else (tone(110, n) + 0.5 * tone(220, n) + 0.2 * band(noise(n), 60, 400))
        e = np.minimum(1, np.arange(n) / (0.2 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR))
        return (0.5 if kind == "pour" else 0.35) * x * e * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * np.arange(n) / SR))
    sys.exit(f"unknown sound '{kind}'")


with wave.open(os.path.join(story, "narration.wav")) as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
voice = np.zeros(N); voice[:min(N, len(v))] = v[:N]
bed = music(N)
t = np.arange(N) / SR
venv = np.convolve(np.abs(voice), np.ones(SR // 10) / (SR // 10), mode="same")
duck = 1 - 0.45 * np.clip(venv / 0.03, 0, 1)
fade = np.clip(t / 0.25, 0, 1) * np.clip((TOTAL - t) / 1.2, 0, 1)
fx = np.zeros(N)
for c in cues:
    s = int(float(c["at"]) * SR)
    if s >= N: continue
    x = make(c["type"], c.get("dur")); x = x / (np.abs(x).max() + 1e-9)
    e = min(N, s + len(x)); fx[s:e] += float(c.get("vol", 0.7)) * x[:e - s]
vr = np.sqrt(np.mean(voice[voice != 0] ** 2)) if np.any(voice) else 0.1
BED_DB = float(os.environ.get("BED_DB", "-13"))          # music level relative to the voice
br = np.sqrt(np.mean(bed ** 2)) + 1e-9
mix = voice + bed * (vr * 10 ** (BED_DB / 20) / br) * duck * fade + fx * vr * 1.6
mix /= max(1.0, np.abs(mix).max() / 0.98)
raw = os.path.join(story, "mix_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())


def measure(path):
    m = subprocess.run([FF, "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex("{"):m.rindex("}") + 1]); return float(j["input_i"]), float(j["input_tp"])


li, _ = measure(raw); out = os.path.join(story, "mix.wav"); gain = -14 - li
for k in range(2):                                   # the second pass corrects what the limiter took off
    if k: gain += -14 - measure(out)[0]
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:level=false",
                    "-ar", str(SR), "-ac", "2", out], check=True)
os.remove(raw)
i, tp = measure(out)
print(f"mix.wav: {TOTAL:.2f} s, {i:.1f} LUFS, true peak {tp:.1f} dBTP, {len(cues)} sound cues")
```

`kit/finish.py`
```python
"""finish.py STORY_DIR : frames/ + mix.wav + timing.json -> final.mp4 (1080x1920 Shorts/Reels/TikTok) and final_x78.mp4 (1008x1152 for X)
Captions: one word at a time in the middle of the frame, white rounded bold with a dark outline, ~3.4% of the frame high
(the size the reference pages use: readable, never shouting). Title Case like the originals.
needs: pip install pillow numpy imageio-ffmpeg"""
import json, os, re, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()
story = os.path.abspath(sys.argv[1])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1080, 1920, 30
SIZE = int(os.environ.get("CAPTION_PX", "92"))          # font size in px; the letters' cap height is ~0.7 of it
Y = float(os.environ.get("CAPTION_Y", "0.52"))         # vertical centre of the word, as a fraction of the height
timing = json.load(open(os.path.join(story, "timing.json"), encoding="utf-8"))
TOTAL = timing["voice_end"] + 1.0
frames = os.environ.get("FRAMES") or os.path.join(story, "frames")      # FRAMES=story/preview_frames to finish a preview
n_frames = len([f for f in os.listdir(frames) if f.endswith(".jpg")])
if n_frames < int(TOTAL * FPS) - 2:
    sys.exit(f"only {n_frames} frames in {frames}; the video needs {int(TOTAL * FPS)}. Finish the render first.")

font = ImageFont.truetype(os.path.join(ROOT, "assets", "fonts", "Nunito.ttf"), SIZE)
try:
    font.set_variation_by_axes([900])                  # Black weight
except Exception:
    pass
capdir = os.path.join(story, "captions"); os.makedirs(capdir, exist_ok=True)


def card(word, path):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if word:
        d = ImageDraw.Draw(im)
        f = font
        x0, y0, x1, y1 = d.textbbox((0, 0), word, font=f, stroke_width=7)
        if x1 - x0 > 0.86 * W:                          # a long word shrinks to fit instead of being clipped
            f = font.font_variant(size=int(SIZE * 0.86 * W / (x1 - x0)))
            try: f.set_variation_by_axes([900])
            except Exception: pass
            x0, y0, x1, y1 = d.textbbox((0, 0), word, font=f, stroke_width=7)
        x = (W - (x1 - x0)) / 2 - x0; y = H * Y - (y1 - y0) / 2 - y0
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sh)
        ds.text((x + 3, y + 6), word, font=f, fill=(0, 0, 0, 120), stroke_width=9, stroke_fill=(0, 0, 0, 120))
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(6)))
        d = ImageDraw.Draw(im)
        d.text((x, y), word, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(18, 18, 26, 255))
    im.save(path)


words = [w for l in timing["lines"] for w in l["words"]]
segs, t = [], 0.0
for i, w in enumerate(words):
    txt = re.sub(r"[^\w'%-]", "", w["w"]).strip("'")
    if not txt: continue
    txt = txt[0].upper() + txt[1:]
    start = 0.0 if i == 0 else w["s"]
    nxt = words[i + 1]["s"] if i + 1 < len(words) else TOTAL
    end = nxt if nxt - w["e"] < 0.45 else w["e"] + 0.25
    if start > t + 0.01: segs.append(("", t, start))
    segs.append((txt, start, end)); t = end
if t < TOTAL: segs.append(("", t, TOTAL))
lst = []
cache = {}
for k, (txt, a, b) in enumerate(segs):
    if txt not in cache:
        p = os.path.join(capdir, f"w{len(cache):04d}.png"); card(txt, p); cache[txt] = p
    lst.append(f"file '{cache[txt].replace(os.sep, '/')}'\nduration {max(1 / FPS, b - a):.4f}")
lst.append(f"file '{cache[segs[-1][0]].replace(os.sep, '/')}'")
open(os.path.join(capdir, "list.txt"), "w", encoding="utf-8").write("\n".join(lst) + "\n")

first = sorted(f for f in os.listdir(frames) if f.endswith(".jpg"))[0]
digits = len(os.path.splitext(first)[0])
pattern = os.path.join(frames, f"%0{digits}d.jpg")
out = os.path.join(story, "final.mp4")
subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", str(FPS), "-start_number", str(int(os.path.splitext(first)[0])), "-i", pattern,
                "-f", "concat", "-safe", "0", "-i", os.path.join(capdir, "list.txt"), "-i", os.path.join(story, "mix.wav"),
                "-filter_complex", "[0:v]scale=1080:1920:flags=lanczos[b];[1:v]fps=30,format=rgba[c];[b][c]overlay=0:0:shortest=1,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p[v]",
                "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-maxrate", "9M", "-bufsize", "18M", "-profile:v", "high",
                "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
                "-c:a", "aac", "-b:a", "192k", "-t", f"{TOTAL:.3f}", "-movflags", "+faststart", out], check=True)
# 7:8 for X (1008x1152): the WHOLE 9:16 frame, centred, plain black on both sides (never a crop that loses the top or bottom)
x78 = os.path.join(story, "final_x78.mp4")
subprocess.run([FF, "-y", "-loglevel", "error", "-i", out, "-vf", "scale=-2:1152:flags=lanczos,pad=1008:1152:(ow-iw)/2:0:black,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-c:a", "copy", "-movflags", "+faststart", x78], check=True)
for p in (out, x78):
    print(f"{os.path.basename(p)}: {os.path.getsize(p) / 1e6:.1f} MB")
```

`kit/check.py`
```python
"""check.py STORY_DIR : watch final.mp4 the way a picky viewer would, and print what's wrong.
  - qa_sheet.jpg: a frame every 0.5 s with its time (look at it: broken geometry, missing textures, clipped captions)
  - black or blank frames, frames that flash (pop for one frame and back), frozen stretches
  - loudness (aim -14 LUFS), true peak, silent gaps over 0.8 s, voice start and end
Exit code 1 if anything fails.  needs: pip install numpy pillow imageio-ffmpeg"""
import json, os, re, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()
story = os.path.abspath(sys.argv[1])
src = os.path.join(story, sys.argv[2] if len(sys.argv) > 2 else "final.mp4")
bad = []
e = subprocess.run([FF, "-hide_banner", "-i", src], capture_output=True, text=True).stderr
d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", e); dur = int(d.group(2)) * 60 + float(d.group(3))
v = re.search(r"Video: (\w+).*?(\d{3,5})x(\d{3,5})", e)
print(f"{os.path.basename(src)}: {dur:.2f} s, {v.group(1)} {v.group(2)}x{v.group(3)}, {os.path.getsize(src) / 1e6:.1f} MB")
if not (55 <= dur <= 80): bad.append(f"length {dur:.1f} s is outside 55-80 s")

# every frame, small and grey, for flashes / black / frozen
w, h = 72, 128
raw = subprocess.run([FF, "-loglevel", "error", "-i", src, "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
fps = len(f) / dur
lum = f.mean(axis=(1, 2))
for i in np.where(lum < 12)[0][:5]:
    bad.append(f"near-black frame at {i / fps:.2f} s")
dd = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
# a flash: frame i differs a lot from i-1 AND i+1, but i-1 and i+1 are alike (one odd frame)
skip = np.abs(f[2:] - f[:-2]).mean(axis=(1, 2))
for i in range(1, len(f) - 1):
    a, b = dd[i - 1], dd[i]
    if a > 10 and b > 10 and skip[i - 1] < 0.35 * min(a, b):
        bad.append(f"one-frame flash at {i / fps:.2f} s (frame {i}): an object pops in and out, or a cut is one frame long")
still = dd < 0.25; run = 0
for i, s in enumerate(still):
    run = run + 1 if s else 0
    if run == int(1.5 * fps): bad.append(f"frozen picture for 1.5 s+ around {i / fps:.1f} s")
# sheet every 0.5 s
p = subprocess.run([FF, "-loglevel", "error", "-i", src, "-vf", "fps=2,scale=162:288", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
n = len(p) // (162 * 288 * 3)
tiles = []
for k in range(n):
    im = Image.frombytes("RGB", (162, 288), p[k * 162 * 288 * 3:(k + 1) * 162 * 288 * 3])
    ImageDraw.Draw(im).text((4, 4), f"{k / 2:.1f}", fill=(255, 255, 0)); tiles.append(im)
cols = 16; rows = -(-len(tiles) // cols)
sheet = Image.new("RGB", (cols * 164, rows * 290), "white")
for k, im in enumerate(tiles): sheet.paste(im, ((k % cols) * 164, (k // cols) * 290))
sheet.save(os.path.join(story, "qa_sheet.jpg"), quality=85)

# audio
a = subprocess.run([FF, "-hide_banner", "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", a)[-1]); P = re.findall(r"Peak:\s+(-?[\d.inf]+) dBFS", a)[-1]
print(f"loudness {I:.1f} LUFS, true peak {P} dBFS")
if not (-16 <= I <= -12): bad.append(f"loudness {I:.1f} LUFS (aim -14)")
if P not in ("-inf",) and float(P) > -1.0: bad.append(f"true peak {P} dBFS: clipping risk (keep under -1)")
s = subprocess.run([FF, "-hide_banner", "-i", src, "-af", "silencedetect=noise=-45dB:d=0.8", "-f", "null", "-"], capture_output=True, text=True).stderr
for st, en in zip(re.findall(r"silence_start: ([\d.]+)", s), re.findall(r"silence_end: ([\d.]+)", s)):
    if float(en) < dur - 0.5: bad.append(f"silence {float(st):.2f}-{float(en):.2f} s")
tj = os.path.join(story, "timing.json")
if os.path.exists(tj):
    T = json.load(open(tj, encoding="utf-8")); first = T["lines"][0]["words"][0]["s"]
    print(f"voice: {T.get('engine')} {T.get('voice', '')}, starts {first:.2f} s, ends {T['voice_end']:.2f} s")
    if first > 0.3: bad.append(f"voice starts late ({first:.2f} s)")
    if T.get("engine") != "kokoro": bad.append(f"voice engine is {T.get('engine')}, not Kokoro (fix the Kokoro install, then rerun voice.py)")
print("qa_sheet.jpg written: open it and look at every tile")
if bad:
    print("\nFAIL:"); [print(" -", b) for b in bad[:30]]; sys.exit(1)
print("PASS: no black, flashing or frozen frames; loudness and gaps OK")
```
