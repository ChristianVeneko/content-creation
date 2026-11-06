# The renderer

- `flat.js`: the drawing library (`Flat`), the transitions and `Flat.render(f)`, which draws frame `f` of `build/plan.json`. It is pure SVG, rebuilt from nothing every frame, so frames can be rendered in any order and in parallel.
- `render.py`: builds `build/page/page.html` (the plan, `flat.js`, the Short's `scenes/scenes.js` and the Nunito font) and screenshots it frame by frame in headless Chrome, Edge or Chromium over the DevTools protocol. Each worker is its own browser with its own profile and port, so several renders on one computer never collide.

```
PY render.py stills [--shots 0,4,9] [--frames 640,700] [--at 0.5]   one frame per shot -> build/stills/sheet.jpg
PY render.py frames [--workers 6]                                    every frame -> build/frames/
PY render.py frames --size 1008x1152 --out frames_x                  the X cut's own 7:8 frames -> build/frames_x/
```

The contract with the rest of the pipeline:
- It reads `build/plan.json` and writes exactly `plan["frames"]` PNGs named `f00000.png`...
- Finished frames are kept while the plan, `scenes/` and this folder are unchanged (a hash in `.key`); any change starts over.
- It never draws captions: `encode.py` burns them in from `build/timing.json`.

The speed on a 6-core desktop CPU is about 1 s a frame per worker for busy scenes, so 6 workers do 56 s of 9:16 in about 5 minutes. Most of the cost is the masks in `F.blob`, so draw hundreds of particles as plain circles.
