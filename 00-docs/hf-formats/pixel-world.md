# pixel-world (HyperFrames format)

Animated pixel-art worlds driven by a JSON payload (`spec.hf`), no coding agent in the loop. Module: `07-studio/engine/hf/pixel-world/`. Generalizes the hand-made project `04-projects/2026-11-03-pixel-que-es-un-token-en-la-ia/`.

14 styles, 30 scenarios, 5 hero designs, 5 NPC creatures, 28 beat kinds. Modes: `multi` (worlds joined by transitions, default) and `single` (one continuous level, the camera travels between stations; `layout` strip or tower).

## How it works

- The composition is one HTML file: four stacked 270x480 canvases (blurred far, sharp mid + cast, blurred foreground, UI) upscaled x4 with `image-rendering: pixelated` to 1080x1920 at 30 fps. Everything is a pure function of the seek time (`hf-seek`): seeded hash noise only, closed-form particles, no `Date.now`, no `Math.random`, no `repeat: -1`.
- Scenarios paint with **semantic master ramps** (`M.wood`, `M.steel`...). The style remaps every master colour to the nearest colour of its palette (luminance only for mono palettes, Bayer dither for 1-bit), so one scenario takes any look. `px` (1 or 2) snaps every rectangle to a coarser grid for chunky styles.
- The composition draws its own karaoke captions (DOM, 2-4 words per group, keyword box on the active word, below the 220 px safe zone). They show only when the composition variable `captions` is true (default = `captions.enabled` given to `compose`). The engine must not overlay its own captions.
- Beats are bound to narration words: `on: { word, n?, offset? }` (n-th occurrence, accents and punctuation ignored; fixed tolerance: exact, then 4+ letter prefix, then edit distance 1-2) or `on: { at: seconds }`. A word that cannot be found gets spread evenly inside its world and a warning is returned; nothing is dropped.
- Safe zones: action between logical y 130 and 375 (screen 520-1500 px), top 220 px and bottom 420 px reserved for platform UI, brand pill at y 236 px, HUD at the top right.

## Styles

| id | look | palette source |
|---|---|---|
| `pixel-gameboy-dmg` | Four green LCD tones, chunky 2x pixels, LCD grid and flat shading. | verified |
| `pixel-nes-8bit` | Limited NES colours, flat tiles with black outlines, no gradients. | unverified |
| `pixel-snes-16bit` | Sweetie 16 palette, hue-shifted shading, soft vignette and warm grade. | verified |
| `pixel-pico8` | The 16-colour fantasy console palette at very chunky resolution. | verified |
| `pixel-crt-arcade` | Bold outlines, scanlines, bloom-ish glow, cyan and magenta accents. | verified |
| `pixel-1bit-dither` | Two colours only, ordered Bayer dither for every tone, Mac-classic feel. | unverified |
| `pixel-cyberpunk-neon` | Dark purple city palette, neon glow, rain streaks and light scanlines. | verified |
| `pixel-noir` | Near-monochrome blue greys, one red accent, heavy vignette. | unverified |
| `pixel-dusk-lowres` | Warm Endesga dusk ramp with banded dither skies and sun rays. | verified |
| `pixel-c64` | Pepto C64 palette with wide chunky pixels and the blue boot-screen border. | unverified |
| `pixel-gba-handheld` | Saturated 32-colour Endesga palette, soft two-tone shading, blue LCD wash. | verified |
| `pixel-liquid-fire` | Water blues against ember oranges, rising embers, hot heat-haze glow. | verified |
| `pixel-vaporwave` | Invented neon pink, violet and cyan palette with dreamy banded skies. | invented |
| `pixel-virtual-red` | Single red phosphor on black, four tones, harsh and graphic. | invented |

Provenance: **verified** = hex fetched from lospec.com during the style research; **unverified** = from memory, check on lospec before claiming exact hardware colours; **invented** = original palette. The isometric style from the research was not implemented (it needs tile geometry, not a palette).

## Scenarios (props are the `target` of beats)

| id | props | about |
|---|---|---|
| `factory` | monitor, machine, button, belt | Purple dusk factory: conveyor belt feeding a machine with gears and a chopping blade. |
| `arcade` | cabinet, screen, scoreboard | Neon arcade room: a big cabinet with a CRT screen, scoreboard and glowing floor. |
| `dungeon` | backpack, chest, torch | Stone dungeon with torches and a big inventory backpack panel of limited slots. |
| `shop` | shelf, counter, register, sign | Cosy shop: shelves of goods, a counter, a cash register and a hanging sign. |
| `post-office` | board, parcel, mailbox, chute | Sorting hub: conveyor with parcels, address label board and mailboxes. |
| `library` | ladder, book, desk, lamp | Tall bookshelves with a rolling ladder, a glowing book and a reading desk. |
| `kitchen` | rail, stove, window, pot | Busy kitchen: ticket rail, stove with pots, pass window and hanging pans. |
| `bank-vault` | door, lock, laser, box | Steel vault with a huge round door, tumbler lock, laser beams and safe-deposit boxes. |
| `hospital` | monitor, bed, drip, cabinet | Clean ward: bed, heart monitor with a moving ECG line, IV drip and a medicine cabinet. |
| `hotel` | keyrack, desk, bell, elevator | Warm lobby: reception desk, key rack with room numbers, service bell and an elevator. |
| `classroom` | blackboard, desk, exam, bell | School classroom: green blackboard, rows of desks, a bell and an exam sheet. |
| `gym` | barbell, scoreboard, treadmill, bench | Weight room: barbell with plates, scoreboard, treadmill and a bench. |
| `casino` | slot, dice, chips, sign | Flashing casino: slot machine with spinning reels, dice table, chips and neon sign. |
| `bakery` | oven, dough, shelf, recipe | Warm bakery: brick oven with fire, dough table, bread shelf and a recipe book. |
| `detective-office` | corkboard, lamp, desk, magnifier | Noir office: corkboard with red string, desk lamp, venetian blinds and a case file. |
| `warehouse` | rack, forklift, scanner, crates | Industrial warehouse: tall racks, forklift, barcode scanner arch and stacked crates. |
| `cinema` | screen, projector, popcorn, seats | Dark cinema: big screen, projector beam from the back, rows of seats and popcorn. |
| `space-station` | window, dish, airlock, console | Orbital module: round window onto Earth, comms dish, airlock door and a control console. |
| `farm` | barn, silo, crops, tractor | Sunny farm: red barn with a silo, crop rows to harvest, a tractor and a windmill. |
| `train-station` | train, board, signal, switch | Dusk platform: a train on rails, track switch, departure board and a signal light. |
| `wizard-tower` | cauldron, book, crystal, shelf | Magic lab: bubbling cauldron, spellbook, glowing crystal and a window with moon. |
| `pirate-ship` | ship, map, cannon, chest | Night sea deck: pirate ship with sails, treasure map, deck cannon and a chest, waves rolling. |
| `airport` | plane, tower, gate, carousel | Runway at dawn: a plane taking off, control tower, boarding gate and a baggage carousel. |
| `ocean-floor` | submarine, cable, fish, chest | Underwater world: a submarine, glowing cable on the seabed, fish schools and a treasure chest. |
| `mine` | ore, cart, lantern, drill | Underground mine: ore veins, a mine cart on rails, a lantern, and a drill. |
| `castle` | wall, gate, tower, catapult | Dusk castle: stone walls with archers, a gate with drawbridge, a tower and a catapult. |
| `courier-city` | house, depot, bike, tower | Sunny city street: houses, a courier bike on the road, a depot and street lamps. |
| `greenhouse` | plant, can, shelf, sprinkler | Glass greenhouse: plants of growing sizes, watering can, sprinkler and wooden shelf. |
| `lighthouse` | lighthouse, boat, buoy, rocks | Rocky coast at night: lighthouse with a rotating beam, a small boat, buoy and waves. |
| `subway-map` | map, train, gate, sign | Underground metro: route map with stations, a train at the platform and ticket gates. |

## Cast

Heroes (`hero` and `cast[].who`): `hoodie` (Round-headed kid in an orange hoodie, dark hair, white sneakers.); `capgirl` (Teal jacket, red cap and a ponytail; slimmer silhouette.); `wizard` (Tall pointed hat, long purple robe and a white beard.); `astro` (White suit, glass helmet dome and an orange chest pack.); `robot` (Boxy steel robot with a visor screen, antenna and tube legs.).
NPCs: `cat` (Sitting cat with a wagging tail that blinks and hops.); `slime` (Bouncing blob with two eyes; squashes on every landing.); `drone` (Hovering helper bot with spinning rotors and a blinking light.); `ghost` (Friendly floating ghost that sways and fades its tail.); `bug` (Literal beetle that scuttles side to side on six legs.).
Clips: idle, blink, talk (mouth follows the word spans), walk, react (? ! lit eyes), point, jump, cheer. Sizes S/M/L = 12/18/28 % of the frame height; figures are drawn natively at each size (more pixels, never scaled).

## Beat kinds (`do`)

- `fill`: target prop: a bar/meter/tank fills to `value` (0-1)
- `open`: target prop opens (lid, door, hatch)
- `close`: target prop closes again
- `light`: target prop lights up / powers on
- `dim`: target prop goes dark
- `burst`: target prop bursts apart in two halves with particles
- `recolor`: target prop changes colour tone (optional `color` 0-5)
- `coins`: coins drop out of the target prop
- `chop`: blade/chop animation on the target prop
- `stamp`: a stamp presses onto the target prop
- `pulse`: target prop hops (emphasis)
- `hero-stamp`: big stamped word in the middle of the screen: `text`, optional `color`, `dur`
- `x2`: floating multiplier text (`text`, default "x2") over `target` or the centre
- `shake`: screen shake snapped to whole pixels, `amp` 1-6 (default 3)
- `flash`: white flash (ignored unless `flash: true` at the top level; OFF by default)
- `radial-burst`: ring of sparks from `target` (or the centre)
- `emote`: speech bubble symbol above `who` (default hero): ? ! heart star idea dots check cross zzz coin note
- `label`: chip with `text` above `target` (optional `color`, `dur`)
- `pan`: camera pans to centre `target` (worlds wider than the screen)
- `push`: camera pushes in on `target` (`amount` 1.1-1.5, `hold` seconds)
- `walk`: `who` walks to `to` (left|center|right|prop id)
- `point`: `who` points at `target`
- `react`: `who` reacts with `symbol` (? ! heart...)
- `jump`: `who` jumps
- `cheer`: `who` cheers with both arms up
- `progress`: HUD progress bar to `value` (0-1), optional `label`
- `counter`: HUD counter to `value`, optional `label`
- `follow`: brand pill: fake follow click lands on this word

Transitions (`world.transition`, into that world): slide, tiles, iris, down. `flash` is ignored unless top-level `flash: true`.

## Payload example

```json
{
 "style": "pixel-snes-16bit",
 "hero": "hoodie",
 "brand": {
  "handle": "@canal",
  "follow": {
   "word": "Sigueme"
  }
 },
 "worlds": [
  {
   "scenario": "factory",
   "cast": [
    {
     "who": "hero",
     "at": "left",
     "size": "M"
    }
   ],
   "beats": [
    {
     "on": {
      "word": "fichas"
     },
     "do": "burst",
     "target": "machine"
    },
    {
     "on": {
      "word": "tokens"
     },
     "do": "hero-stamp",
     "text": "TOKENS",
     "color": "teal"
    },
    {
     "on": {
      "word": "cortada"
     },
     "do": "chop",
     "target": "machine"
    },
    {
     "on": {
      "word": "cortada"
     },
     "do": "shake",
     "amp": 4
    },
    {
     "on": {
      "word": "pedacito"
     },
     "do": "label",
     "target": "belt",
     "text": "TOKEN",
     "color": "yellow"
    }
   ]
  },
  {
   "scenario": "dungeon",
   "transition": "tiles",
   "cast": [
    {
     "who": "hero",
     "at": "left"
    },
    {
     "who": "slime",
     "at": "right",
     "size": "S"
    }
   ],
   "beats": [
    {
     "on": {
      "word": "ventana"
     },
     "do": "open",
     "target": "backpack"
    },
    {
     "on": {
      "word": "token",
      "n": 2
     },
     "do": "fill",
     "target": "backpack",
     "value": 0.5
    },
    {
     "on": {
      "word": "llena"
     },
     "do": "fill",
     "target": "backpack",
     "value": 1
    },
    {
     "on": {
      "word": "llena"
     },
     "do": "emote",
     "who": "hero",
     "symbol": "!"
    },
    {
     "on": {
      "word": "llena"
     },
     "do": "shake",
     "amp": 5
    }
   ]
  }
 ]
}
```

`normalize(spec)` fixes slips (unknown scenario/style -> nearest by name and keywords, `scenes` -> `worlds`, beat aliases such as `glow` -> `light`, loose `word` fields, out-of-range numbers clamped, long text cut to 32 chars). Unmappable values stay as they are and the zod schema reports the exact path, e.g. `hf.worlds.0.beats.1.target: scenario "factory" has no prop "rocket"; its props: ...`.

## Add a style

Add an entry to `styles.mjs` (`id` starting with `pixel-`, `palette` hex list, `px`, `mono`, `outline`, `shade`, `glow`, `blur`, optional `time` and `atmos` rain|embers|smoke|dust, `post` scan/lcd/vig/tint/border, `cap` colours, `provenance`). Nothing else: meta, schema, prompt and docs read the list.

## Add a scenario

Append `defScenario({ id, name, about, keywords, time, w, far, back, mid, props: { id: { x, y, w, h, about, draw(g, t, S, c) } }, fore })` to a `runtime/scenarios-*.js` file. Draw only with the kit (`runtime/kit.js`, `fx.js`, `core.js`) and master ramps; ground at y=345, keep key props inside y 130-345. `S` is the prop state: `fill`, `open`, `lit`, `tone` and transient events `ev.pulse|chop|stamp|burst|coins` (progress 0-1 or -1). Mark `fills/chops/stamps/opens: true` when the prop draws that action itself; otherwise the engine adds a generic effect. Top level of these files may only call `defScenario` (the node side evaluates them in a vm sandbox to build the catalog). Run `node --test test/hf-pixel-world*.test.mjs`, then render the gallery: `node 04-projects/hf-showcase/pixel-world/build-showcase.mjs gallery` and `npx hyperframes snapshot`.

## Files

`index.mjs` contract exports; `styles.mjs`; `catalog.mjs` (vm catalog); `schema.mjs` (zod); `normalize.mjs`; `resolve.mjs` (words, windows, captions, sfx); `compose.mjs` + `template.html`; `prompt.mjs`; `runtime/{core,fx,kit,cast,scenarios-a|b|c,beats,main}.js` (browser). Showcase and galleries: `04-projects/hf-showcase/pixel-world/`.

## Known limits

Single mode joins stations with a hard seam (pillar or floor slab), not a drawn road; world art is not mirrored for left-facing scenes; mono styles (Game Boy, virtual-red, noir) lose some prop contrast; 1-bit is noisy on busy scenarios. `compose` is covered by node tests (determinism, bindings, schema); drawing correctness is verified visually with HyperFrames snapshots, not by automated image tests.
