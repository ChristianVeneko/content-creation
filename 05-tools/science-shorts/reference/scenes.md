# Drawing scenes with flat.js

A scene is a JavaScript function in the Short's `scenes/scenes.js`, named in `shots.json` (`"fn": "S_cube"`). It gets `t` (seconds into the shot), `T` (the shot's length) and `sh` (the shot, with `sh.beats.<name>` = seconds into the shot where that word is spoken). It returns one frame of SVG, built from nothing every frame. The library is `renderer/flat.js`, available as `Flat` (call it `F`).

```js
const F = Flat, C = F.PAL, B = (sh, k) => sh.beats[k];

function S_meter(t, T, sh) {
  const c = F.drift(t, T, [540, 940, 1.0], [540, 920, 1.05]);          // camera: from [x, y, zoom] to [x, y, zoom], eased
  return F.frame(c, () => [                                              // the world: moves with the camera
    F.cloud(230, 1290, 0.5, { t }),
    F.inset(540, 800, 340, () => [F.cube(0, 150, 170, { alpha: 0.18 })], { p: F.pop(t, B(sh, "inset"), 0.5), from: [300, 1220] }),
    F.pill("just", 690, 1250, { p: F.pop(t, B(sh, "half")), sub: "½ gram of water", bg: C.deepwater, size: 46 }),
  ], null, ["#2b1491", "#6a2ed8", "#b43fd6"]);                           // overlays (screen space), then the background gradient
}
```

**World units** are pixels of the 1080x1920 frame at zoom 1; y grows downward. The caption sits at y ≈ 1505 on screen: keep feet, labels and numbers above about 1420 (or move the camera).

## Time

| Helper | What it gives |
|---|---|
| `F.pop(t, t0, d)` | a scale from 0 to 1 with an overshoot, starting at t0: pass it as `p` to labels |
| `F.prog(t, t0, d)` | a smooth 0..1 from t0 over d seconds (draw-ons, moves, counters) |
| `F.bob(t, amp, freq, phase)` | a gentle sine wobble (breathing, floating) |
| `F.ease.in / out / inout / back / sine / expo` | easing curves for 0..1 |
| `F.drift(t, T, a, b, ease)` | a camera moving over the whole shot; every shot should drift or push |
| `F.shake(cam, t, t0, amt)` | a jolt at t0 (something heavy lands) |

## The pieces

**Shapes and light**
- `F.blob(d, color, o)`: the signature fill, a flat colour plus a shadow crescent and a light rim. `d` is path data from `F.P.circle / ellipse / rrect / poly / smooth / drop`; several clockwise sub-paths make a union (clouds are circles joined this way). Options: `k` (shadow width), `h` (rim width), `light` (angle toward the light), `dark`, `lite`.
- `F.circle(x, y, r, color)`, `F.rrect(x, y, w, h, r, color)`: shaded shortcuts.
- `F.glow(x, y, r, color, a)`, `F.rays(x, y, r0, r1, n, color, rot, a)`, `F.spot(x, y, r, color, a)`: light behind things.
- `F.bokeh(n, box, t, seed)`, `F.dots(n, box, t, o)`, `F.stars(n, box, t)`: depth and particles.
- `F.shadow(x, y, rx)`: a soft ground shadow.

**Text and labels** (all take `p` = pop progress):
- `F.title(lines, x, y, t, o)`: the title card. `lines` = `[{ text, size, fill }]`. Put it in the overlay, sized with `F.U` (1 on 9:16, 0.87 on 7:8).
- `F.tag(text, x, y, o)`: the tilted yellow block with heavy capitals (`raw: true` keeps the case: "1 m³"; `sub` adds a small line under it).
- `F.pill(text, x, y, o)`: a rounded data label; `sub` makes it two lines with the big line second.
- `F.stack(items, x, y, t)`: coloured stat tags sliding in from the left edge, `items = [{ text, bg, t }]`.
- `F.counter(value, x, y, o)`: a number in a white box (`unit`, `minw`). Count it with `1e9 * F.ease.out(F.prog(t, B(sh, "count"), 1.0))`.
- `F.bubble(text, x, y, tailX, tailY, o)`: a speech or thought bubble ("?").
- `F.text(text, x, y, o)`: plain text.

**Devices**
- `F.inset(x, y, r, inner, o)`: the magnifier, a ringed window with a pointer `from` a point; `inner()` draws with (0, 0) at its centre.
- `F.arrow(points, o)`: a fat arrow, straight (2 points) or curved (3+), drawn on with `p`.
- `F.dimension(x1, y1, x2, y2, label, o)`: a measuring line with a label pill.
- `F.balance(x, y, tilt, left, right, o)`: a balance scale; `left(px, py)` and `right(px, py)` draw what sits on each pan.
- `F.cube(x, y, a, o)`: an isometric see-through cube from its bottom-front corner, with `grid` and `gp` (grid progress) to split it into cells.
- `F.ruler(x, y, l, n)`, `F.stopwatch(x, y, r, secs)`.

**Cast**
- `F.person(x, y, s, o)`: a generic person standing at (x, y); `arms: [[shoulder, elbow], [shoulder, elbow]]` in degrees (0 = down, 90 = out, 180 = up); `mood`, `look`, `hairStyle` (short, bob, bun, curly), `hold(hx, hy)` draws something in the left hand.
- `F.face(x, y, s, o)`: eyes and a mouth on anything. Moods: happy, smile, o, flat, worried, smug, shock, sleepy, grit. Also `look` and `blink`.
- `F.cloud`, `F.drop` (a water drop, `face: true`), `F.sun`, `F.hills(y)` (layers spanning the wide 7:8 frame), `F.tree`, `F.elephant`.

Anything else, draw it in `scenes.js` from these shapes: a glass, an umbrella, rain, a molecule (the example has all four). Keep each prop a small function you can reuse.

## Patterns that read like the format

- **The title card:** the hero object fills the middle of the frame; the title goes in the overlay at `F.H * 0.085` in two lines, the second bigger and yellow, each popping on a beat (`title` at 0.05 s, `t2` on the second word).
- **One label per fact, on its word:** `F.tag("500 tonnes", ..., { p: F.pop(t, B(sh, "tag")) })` with `"tag": ["500", "thud", 0.6]` in shots.json.
- **Magnifier into the small:** a small object in the corner, an inset over the middle with a pointer to it, a label popping on the unit word.
- **A comparison that moves:** a balance tipping on the verb (`F.ease.back` for the overshoot) with a shake when it lands; two arrows of very different sizes; a counter rolling.
- **Objects with feelings:** a face on the thing the voice talks about; its mood changes on the twist (happy, then worried, then shock).
- **The same "you" character** at the start, in the middle and at the end ties the story together.
- **A background per kind of scene:** sky over hills for the real world, deep navy for the microscopic and data, purple-magenta for comparisons, orange-yellow for jokes.
- **Transitions:**
  - `zoom` with `focus` on the detail you dive into;
  - `slide` when the story moves on;
  - `iris` for a reveal;
  - `pop` for a quick gag;
  - `cut` on the word for everything else.

## The X cut (7:8)

`render.py --size 1008x1152` draws every scene again in the wider, shorter frame:
- `F.frame` zooms every camera out to 0.74 and lifts the picture 40 px;
- backgrounds fill the screen;
- `F.hills` and the bokeh already span the extra width.

**Per-scene fixes** go in `window.FIT78` at the top of `scenes.js` (`{ S_title: { zoom: 0.68, lift: -60 } }`).

**Look at `build/stills_1008x1152/sheet.jpg` for:**
- titles touching the hero;
- labels cut off at the sides;
- a person's feet under the caption.
