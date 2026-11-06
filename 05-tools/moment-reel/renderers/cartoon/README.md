# The cartoon renderer

A flat 2D cartoon in the "history as a cartoon" look: simple shapes, bold flat colours, thick ink outlines, a light paper texture, big expressive faces. Every frame is SVG drawn by the reel's `cartoon/moment.js` with the library in `cartoon.js`, and screenshotted in headless Chrome (or Edge, or Playwright's Chromium) over the DevTools protocol. No GPU, no Blender, no WebGL. It follows the contract in `../README.md`: it reads `build/plan.json` and writes `build/frames/f00000.png` onward at 1080x1920, 30 fps.

## Run it
```
PY <skill>/renderers/cartoon/render.py stills                     # the middle frame of every shot -> build/stills/sheet.jpg (about 20 s)
PY <skill>/renderers/cartoon/render.py stills --shots 4,9 --at 0.9 # only those shots, near their end
PY <skill>/renderers/cartoon/render.py stills --frames 640,955     # exact frames (the style board)
PY <skill>/renderers/cartoon/render.py frames --workers 4          # every frame (about 6 minutes for 48 s on a 6-core CPU)
PY <skill>/renderers/cartoon/render.py frames --size 1008x1152 --out frames_x   # the X cut's own 7:8 frames (about 5 minutes)
```
`frames` keeps finished frames while the plan, `moment.js` and this folder are unchanged, so a stop costs only the unfinished frames. The page it builds is `build/cartoon/page.html`: open it in a browser and call `setFrame(640)` in the console to look at one frame live.

## Write the reel's `cartoon/moment.js`
Copy `examples/hand_of_god/cartoon/moment.js` and rewrite it for the moment. It has three parts:

1. **The cast**: one spec per person, from the kits in `sources.md`.
   - Fields: `skin`, `shirt`, `shorts`, `socks`, `boots`, `sleeves` ("short" / "long"), `gloves` (keepers), `trim` (collar or cuff colour), `hair`, `hairColor`, `h` (height, 330 = average), `build` (width, 1.2 = stocky), `legs`, `number` (shown on the back).
   - Hair styles: "mop" (big curls), "short", "side", "bald".
   - The famous player is a caricature of what's public: his hair, build, kit and number. Everyone else is generic.
2. **Shared scenes**: functions that return lists of drawn things, like the example's `boxWorld()` (stand, pitch, lines, goal) and `leap(k)` (two people mid-jump at progress k, with `out` giving you where his fist ended up).
3. **One function per shot**: `S_name(t, T)`, where t is seconds into the shot and T is its length, named as `fn` in `shots.json`. It returns `C.frame(cam, () => [world...], () => [screen overlay...], bg)`.
   - The camera: `C.cam(x, y, zoom, rollDeg)` looks at the world point (x, y). The world is 1080x1920 at zoom 1, with y going down.
   - Move the camera every frame (`C.lerp`, `C.ease.inout`). A still camera on a still subject fails the check.

## The library (`cartoon.js`, `const C = Cartoon`)
- **People:** `C.person(spec, pose, x, y, scale, flip, rotDeg, out)`.
  - Feet at (x, y). `rotDeg` turns the whole body (a dive, a fall). `out` receives `hands`, `head`, `headR`, `hip` and `neck` in world space.
  - Poses: `C.pose.stand / run(phase) / jump / keeperReach / protest / armsUp / sit`, each taking overrides. `C.mixPose(a, b, k)` blends two.
  - A pose is `{arms: [[upper, lower], [upper, lower]], legs: [...], lean, head, look: [dx, dy], eyes, mouth, fist: [l, r], lift, facing}`.
  - Angles are degrees from straight down. The first limb is his left (screen right when he faces you); positive angles turn it outward, negative angles turn the right one outward. Write every pose from the front: `facing: "back"` mirrors it.
  - Eyes: "open", "wide", "angry", "squint", "closed". Mouths: "smile", "grin", "o", "shout", "flat", "grit", "frown".
- **Balls:** `C.ball(x, y, r, spin, "football" | "basketball" | "tennis")`.
- **Football:**
  - `C.stadium(y, {height, rows, colors, bob, arms, noSky})`: fans as dots, waving with `bob: t`.
  - `C.pitch(y)`, `C.goal(x, y, w, h)`, `C.line(...)`, `C.ball(x, y, r, spin)`.
  - `C.board(x, y, w, "51'")`: an old clock board.
  - `C.topPitch(cx, top, pxPerMetre)` and `C.token(x, y, spec)`: the god's-eye view with players as tokens.
  - `C.glove(...)`, `C.fist(...)`, `C.shadow(...)`.
- **Other sports**, seen from the side at eye level:
  - basketball: `C.arena(y)` (an indoor stand with a dark roof and lights), `C.court(y)`, `C.hoop(x, rimY, floorY)`;
  - tennis: `C.tennisCourt(baselineY, {surface: "hard" | "grass" | "clay"})`, `C.tennisNet(x, y, w)`;
  - boxing: `C.boxingRing(x, y, w)`, then the boxers, then `C.boxingRingFront(...)`;
  - athletics: `C.track(y, lanes)`, `C.finishLine(x, y0, y1)`.
  From above: `C.topCourt`, `C.topTennis`, `C.topTrack` (a 400 m oval).
- **Character parts:** sleeves "none" (a vest), `shirt: null` (a bare torso), `boxing: colour` (gloves), `skirt`. Hair: "afro", "buzz", "long", "ponytail" next to "mop", "short", "side" and "bald". Extras: `headband`, `beard`, `mustache`.
- **Rooms:** `C.room(floorY)`, `C.tv(x, y, w, screenSvg)` and `C.view(cam, () => [...], 640, 480)`.
  - The TV is a 1980s set on a cabinet with scanlines and glass; `view` draws another camera's picture onto its screen.
  - `C.pressTable(x, y, w, mics, aimX, aimY)`.
- **Effects:**
  - `C.burst` (comic rays behind a freeze), `C.speedLines`, `C.star` (impact), `C.glow`, `C.rays`.
  - `C.arrow(points, k)` and `C.ring(x, y, r, k)`: an orange marker that draws on.
  - `C.dashed(points)`, `C.flashes(t, box)` (camera flashes), `C.flash(k)`, `C.sun`, `C.cloud`.
  - `C.bigText(txt, x, y, size)`: chunky words standing in the scene. Only words from `sources.md`.

## What we learned on Hand of God
- **The sources decide the drawing.** "His fist got there first": the keeper's glove has to stay short of the ball in every shot of the leap, though he's taller.
- **Depth is drawing order.** A ball drawn before the stadium disappears behind it. Put a ball in the goal between the pitch and the net.
- **One sky.** A stand that brings its own sky over the scene's sky leaves a seam and cuts the clouds in half (`noSky: true`).
- **Pose signs.** The first full render had arms crossing bodies (hands on the shorts, a self-hug for a celebration) because the stand, arms-up and sit poses had the sign flipped. The convention is above.
- **Crowds wave at `bob: t`.** At `2 * t` the thousands of dots flicker in the encode and the check flags jumps.
- **The X cut is drawn, not cropped**: `render.py frames --size 1008x1152 --out frames_x` renders every shot again at 7:8 and `encode.py` uses those frames, with the captions at 78 % of that frame. A cropped 9:16 loses heads and the sky; a padded one leaves black bars on X. The default re-framing (zoom 0.8, the picture 110 px up) fits wide shots. Hand of God tuned 21 of its 46 shots in `FIT78` so the caption never touches a face, the big number, the 10 on his back or anyone's legs: close-ups zoom out further, full figures lift 150-210 px, and the TV room lifts 0 so the viewers' heads stay below the caption. Check the 7:8 stills with the caption band drawn in (y 860-940 of 1152).
- **Several renders on one computer**: each Chrome picks its own free DevTools port (`--remote-debugging-port=0`, read back from the profile's `DevToolsActivePort`). With fixed ports, a second render connected to the first one's pages and drew its frames from the wrong plan.
- **Speed:** about 0.25 s a frame across 4 Chrome workers, so a full re-render after every fix round is cheap (about 6 minutes). Iterate on `stills` (20 s for all 46 shots) first.
