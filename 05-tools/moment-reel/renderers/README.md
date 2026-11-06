# Renderers

The renderer is one step of the pipeline. Everything before it (facts, script, voice, timing, the shot plan) and after it (sound, captions, the two cuts, the checks) is the same whichever renderer draws the pictures.

```
script.json --narrate.py--> build/timing.json --+
shots.json  ------------------plan.py-----------+--> build/plan.json --[renderer]--> build/frames/ --encode.py--> out/
                                                     build/sound.json --sound.py--> build/audio.wav ----^
```

## The contract

A renderer is a folder here with a `render.py` (or a `README.md` saying how to run it) that:

1. **Reads** `build/plan.json`: `fps` (30), `total` (seconds), `frames` (the exact frame count), `size` ([1080, 1920]), and `shots`, in order. Each shot has `start` / `end` (seconds), `f0` / `f1` (it covers frames f0 to f1-1), `type`, `what`, `camera`, `move`, `transition` (cut, whip, smash_zoom, move, flash), `said` (the words spoken over it), and optional `glow` {what, t}, `text_3d` {text, t}, `crowd`. `build/timing.json` has every word's time if the renderer needs it.
2. **Writes** `build/frames/f00000.png` (or `.jpg`) to `f{frames-1}`, 1080x1920, sRGB, full range. Exactly `frames` frames, no gaps.
3. **Writes** `build/render.json`: `{"renderer": "<name>", "frames": N, "ext": "png", "seconds": <how long it took>}`.
4. **Keeps finished frames** when it's run again on an unchanged plan and unchanged renderer files, so a crash costs only the unfinished frames. Any change to the plan or to the renderer's own files clears them.

And never:
- draws the captions (encode.py burns them in, so every renderer gets the same captions);
- draws a logo, a real person's face or likeness, or text that isn't in `sources.md`;
- leaves a frame that depends on anything but its frame number (no random seeds that change between runs).

The transitions belong to the renderer: a `whip` is a fast camera swing with motion blur across the cut (about 6-8 frames), a `smash_zoom` is a focal-length ramp with a radial blur over the first frames of the shot, `flash` is one white frame. The sounds for them are already in `sound.json`.

## The renderers here

- `animatic/`: a storyboard in moving cards (shot number, type, what, camera, a drifting grid, the transitions). Fast (about 30 s for a 40 s reel). Use it to check the pacing and the plan before the real render, and to test the pipeline.
- `cartoon/`: the flat 2D cartoon (SVG in headless Chrome, CPU only, about 6 minutes for 48 s). The default. See its README.

The first versions used a 3D Blender renderer (it needed Blender, MPFB and a GPU); the flat cartoon replaced it.
