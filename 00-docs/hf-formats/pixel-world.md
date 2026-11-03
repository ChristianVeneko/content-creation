# pixel-world (HyperFrames format)

Animated pixel-art worlds driven by a JSON payload (`spec.hf`), no coding agent in the loop. Module: `07-studio/engine/hf/pixel-world/`. Generalizes the hand-made project `04-projects/2026-11-03-pixel-que-es-un-token-en-la-ia/`.

14 styles, 61 scenarios (10 themed worlds: christmas-village, desert, beach, mars, volcano, arctic, jungle, western-town, haunted-park, temple) (12 of them tech-oriented, 8 developer-tooling, plus the composable `workshop-stage`), 48 library props, 5 built-in hero designs plus data-defined mascots (`03-assets/mascots`, see its README; the default `chris` was made from a photo), 5 NPC creatures, 28 beat kinds. Modes: `multi` (worlds joined by transitions, default) and `single` (one continuous level, the camera travels between stations; `layout` strip or tower).

## How it works

- The composition is one HTML file: four stacked 270x480 canvases (blurred far, sharp mid + cast, blurred foreground, UI) upscaled x4 with `image-rendering: pixelated` to 1080x1920 at 30 fps. Everything is a pure function of the seek time (`hf-seek`): seeded hash noise only, closed-form particles, no `Date.now`, no `Math.random`, no `repeat: -1`.
- Scenarios paint with **semantic master ramps** (`M.wood`, `M.steel`...). The style remaps every master colour to the nearest colour of its palette (luminance only for mono palettes, Bayer dither for 1-bit), so one scenario takes any look. `px` (1 or 2) snaps every rectangle to a coarser grid for chunky styles.
- The composition draws its own karaoke captions (DOM, 2-4 words per group, keyword box on the active word, below the 220 px safe zone). They show only when the composition variable `captions` is true (default = `captions.enabled` given to `compose`). The engine must not overlay its own captions.
- Beats are bound to narration words: `on: { word, n?, offset? }` (n-th occurrence, accents and punctuation ignored; fixed tolerance: exact, then 4+ letter prefix, then edit distance 1-2) or `on: { at: seconds }`. A word that cannot be found gets spread evenly inside its world and a warning is returned; nothing is dropped.
- Frame zones (`layout.mjs`, one source of truth for runtime, template and tests; logical 270x480): caption band y 90-140 (DOM captions only), brand pill y 56-80, action band y 77-346 (16-72 % of the height: props and cast), floor y 346-480. The HUD (`progress`, `counter`) lives in the first floor rows y 350-372, never in the caption band; the hero stamp is a DOM element at 700 px (logical 175). A test asserts no HUD element intersects the caption band.

## PIXEL guide compliance

- **Mascot**: `hf.hero` names a built-in hero or a saved mascot; omitted = the default mascot (`index.json`). Mascots are parametric (curly hair, glasses, backpack, pants stripe, chest logo, sneaker cuffs) and remap to every palette.
- **Captions** are a game dialog box (DOM, caption band) with the mascot portrait whose mouth follows the voice, word by word; the brand pill uses the same portrait. Nothing important sits below y=1580.
- **No call to action**: the prompt forbids comment/follow lines and `brand.follow`; the video ends on its payoff.
- **Voice chain** (pixel-world builds only): pauses over 0.2 s shrink to 0.12 s and a 2:1 compressor evens the level (`normalizeSpeech({tighten})`); mix at -14 LUFS with the music 17 dB under the voice. Default ElevenLabs voice `WFmom5vWeiir6CN1crV3`.

## Readability guarantees (U10)

- **Style guidance**: the spec-writer prompt carries a table (mood, colours, good for, avoid) and default picks by topic (`STYLE_GUIDE`, `recommendStyles` in `styles.mjs`). Monochrome styles (`gameboy-dmg`, `1bit-dither`, `virtual-red`) are for retro/handheld topics only. `styleAdvice` (`normalize.mjs`) never overrides the model: it adds a warning when `hf.style` is missing or a retro-only style is used for a non-retro topic.
- **Functional contrast**: `fnLook()` (`runtime/hud.js`) picks the highest-contrast palette pair per style; bar fills, frames, outlines >= 3:1 and HUD text >= 4.5:1 (tested for all 14 styles). Props with a fill state use it in low-colour styles.
- **HUD**: labels are measured and auto-abbreviated (CULPABLES -> CLPBLS in 2x styles); 2x styles get a taller, wider HUD (`hudZonesFor(px)`).
- **Hero placement**: a solver keeps the hero out of the props that beats target (free column, shrinks only a defaulted size) and walks it aside before a beat that targets the prop it stands on.
- **Foreground silhouettes**: styles without blur use dithered palette-dark tones instead of black blocks.
- **Beat feedback**: progress bars and prop fills move at least 12 % per beat (nudged values are reported in warnings); progress/counter beats pop (halo, chip flip) and prop fills get a derived pulse.

## Pixel quality (`hf.pixelScale`)

`pixelScale` is a payload field (default `standard`) that the user picks in the web panel ("Calidad de píxel") or the model sets when asked. The logical canvas stays 270x480 and every preset divides 1080x1920 exactly:

| value | grid | canvases | art pixel | notes |
|---|---|---|---|---|
| `chunky` | 2 logical px | 270x480 | 8 screen px | exposes the `px` of the 2x styles to every style; the cheapest render |
| `standard` | the style's own `px` (1, or 2 for Game Boy, PICO-8, C64, 1-bit, Virtual Boy) | 270x480 | 4 (or 8) screen px | today's look |
| `fine` | 1/2 logical px | 540x960, one `scale(2)` per layer | 2 screen px | geometry rounds to 1/SS in `R`, `disc`, `line`, `snap`; the cast is drawn under `scale(1/SS)` with its measures times SS (twice the pixels); dither patterns keep their cell size in canvas px; measured on a 55 s video: 39 s to render against 30 s for `standard` and `chunky`, and a file about 1.5x larger |

Text, HUD zones and DOM captions stay on the logical grid in every preset (`style.px` is forced to 1 for `fine`, 2 for `chunky`), so the layout never changes; `draft` render quality always renders `standard`. `resolvePayload` writes the effective grid into `data.pixelScale` / `data.ss` and returns a style with the effective `px`; the runtime reads `SPEC.ss` (core.js `SS`, `G`, `LS`). Tests: every style x every pixelScale x both modes composes, draws, keeps the HUD labels inside their boxes and keeps the scenario layout identical.

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

**Choose by topic.** Every scenario carries `topics` (what it suits) and, for the generic ones, `avoid` (what it must not be used for). The spec-writer prompt shows this table so the model picks by topic, with the rule: never choose a scenario whose props contradict the topic (an AI machine, a hospital or a dungeon for a phone-heat video). When nothing fits literally, use `workshop-stage`.

| id | suits topics | NOT for | props | about |
|---|---|---|---|---|
| `factory` | manufacturing, pipeline, assembly line, processing, splitting in pieces, tokens, production | phones, hardware, heat | monitor, machine, button, belt | Purple dusk factory: conveyor belt feeding a machine with gears and a chopping blade. |
| `arcade` | games, scores, retro, numbers on a screen, playing, levels | health, finance | cabinet, screen, scoreboard | Neon arcade room: a big cabinet with a CRT screen, scoreboard and glowing floor. |
| `dungeon` | limits, memory, inventory, storage slots, context window, quests | modern devices, hardware | backpack, chest, torch | Stone dungeon with torches and a big inventory backpack panel of limited slots. |
| `shop` | prices, buying and selling, commerce, cost, marketing, hallucinated facts as goods | science | shelf, counter, register, sign | Cosy shop: shelves of goods, a counter, a cash register and a hanging sign. |
| `post-office` | mail, packets, networks, addresses, delivery, internet routing | heat | board, parcel, mailbox, chute | Sorting hub: conveyor with parcels, address label board and mailboxes. |
| `library` | knowledge, books, search, history, learning, reading | hardware | ladder, book, desk, lamp | Tall bookshelves with a rolling ladder, a glowing book and a reading desk. |
| `kitchen` | recipes, orders, cooking, servers as a kitchen, queues, food | phones | rail, stove, window, pot | Busy kitchen: ticket rail, stove with pots, pass window and hanging pans. |
| `bank-vault` | money, security, savings, encryption, safes, passwords | games | door, lock, laser, box | Steel vault with a huge round door, tumbler lock, laser beams and safe-deposit boxes. |
| `hospital` | health, body, diagnosis, monitoring, sleep, medicine | gadgets, phones, hardware | monitor, bed, drip, cabinet | Clean ward: bed, heart monitor with a moving ECG line, IV drip and a medicine cabinet. |
| `hotel` | reservations, travel, keys, booking, hospitality | hardware | keyrack, desk, bell, elevator | Warm lobby: reception desk, key rack with room numbers, service bell and an elevator. |
| `classroom` | school, learning, lessons, education, exams, teaching | hardware | blackboard, desk, exam, bell | School classroom: green blackboard, rows of desks, a bell and an exam sheet. |
| `gym` | fitness, training, strength, habits, progress, exercise | hardware | barbell, scoreboard, treadmill, bench | Weight room: barbell with plates, scoreboard, treadmill and a bench. |
| `casino` | luck, probability, gambling, odds, randomness, rewards | science | slot, dice, chips, sign | Flashing casino: slot machine with spinning reels, dice table, chips and neon sign. |
| `bakery` | baking, recipes, ingredients, fermentation, small business | hardware | oven, dough, shelf, recipe | Warm bakery: brick oven with fire, dough table, bread shelf and a recipe book. |
| `detective-office` | investigation, evidence, mystery, debugging, fact checking, clues | nature | corkboard, lamp, desk, magnifier | Noir office: corkboard with red string, desk lamp, venetian blinds and a case file. |
| `warehouse` | logistics, stock, robots, storage, supply chain, databases | nature | rack, forklift, scanner, crates | Industrial warehouse: tall racks, forklift, barcode scanner arch and stacked crates. |
| `cinema` | movies, streaming, video, projection, entertainment, frames | hardware | screen, projector, popcorn, seats | Dark cinema: big screen, projector beam from the back, rows of seats and popcorn. |
| `space-station` | space, orbit, satellites, science, astronauts, communications | food | window, dish, airlock, console | Orbital module: round window onto Earth, comms dish, airlock door and a control console. |
| `farm` | growth, crops, harvest, nature, seasons, patience | hardware, gadgets | barn, silo, crops, tractor | Sunny farm: red barn with a silo, crop rows to harvest, a tractor and a windmill. |
| `train-station` | routes, schedules, switching, transport, transfer, networks of tracks | food | train, board, signal, switch | Dusk platform: a train on rails, track switch, departure board and a signal light. |
| `wizard-tower` | magic, chemistry, experiments, recipes of reactions, secrets, spells | hardware | cauldron, book, crystal, shelf | Magic lab: bubbling cauldron, spellbook, glowing crystal and a window with moon. |
| `pirate-ship` | treasure, piracy, sea, adventure, stolen data, maps | health | ship, map, cannon, chest | Night sea deck: pirate ship with sails, treasure map, deck cannon and a chest, waves rolling. |
| `airport` | flights, travel, departures, logistics, boarding, speed | food | plane, tower, gate, carousel | Runway at dawn: a plane taking off, control tower, boarding gate and a baggage carousel. |
| `ocean-floor` | sea cables, deep sea, internet cables, pressure, marine life, submarines | gadgets | submarine, cable, fish, chest | Underwater world: a submarine, glowing cable on the seabed, fish schools and a treasure chest. |
| `mine` | mining, extraction, ore, crypto mining, resources, digging | health | ore, cart, lantern, drill | Underground mine: ore veins, a mine cart on rails, a lantern, and a drill. |
| `castle` | defense, siege, attack, walls, history, security gates | food | wall, gate, tower, catapult | Dusk castle: stone walls with archers, a gate with drawbridge, a tower and a catapult. |
| `courier-city` | delivery, couriers, city, requests and responses, speed, addresses | science | house, depot, bike, tower | Sunny city street: houses, a courier bike on the road, a depot and street lamps. |
| `greenhouse` | plants, growth, ecology, climate, water, photosynthesis | hardware, gadgets | plant, can, shelf, sprinkler | Glass greenhouse: plants of growing sizes, watering can, sprinkler and wooden shelf. |
| `lighthouse` | signals, guidance, warnings, night, beacons, navigation | food | lighthouse, boat, buoy, rocks | Rocky coast at night: lighthouse with a rotating beam, a small boat, buoy and waves. |
| `subway-map` | routes, maps, connections, graphs, transfers, shortest path | food | map, train, gate, sign | Underground metro: route map with stations, a train at the platform and ticket gates. |
| `phone-workshop` | smartphone, phone, device, repair, hardware, inside a gadget, celular | - | phone, battery, chip | Repair bench with a giant open smartphone, a battery and a processor chip under a desk lamp. |
| `battery-lab` | battery, charging, energy, lithium, chemistry of power, heat while charging, batería | - | pack, dial, charger, thermometer | Lab bench: a big battery pack with charge segments, a charger, a dial and a thermometer. |
| `charging-station` | charging, power, electricity, plug, cable, wireless charging, cargador | - | charger, plug, cable, meter, bolt | Night street kiosk: a charger, a plug, a cable on the floor and a charge meter under a lightning bolt. |
| `cpu-city` | processor, cpu, chip, cores, clock speed, performance, computation | - | cpu, clock, load, fan | A glowing city built on a circuit board: a huge processor chip, a clock, a cooling fan and a load dial. |
| `data-center` | servers, data center, cloud computing, hosting, storage, big data, internet infrastructure | - | rack1, rack2, rack3, cloud | Aisle of three tall server racks with blinking LEDs and a cloud icon floating above. |
| `wifi-tower` | wifi, signal, network, internet, antenna, 5g, coverage | - | tower, wifi, router, phone | Green hill with a lattice antenna tower sending rings of signal, a house with a router and a phone. |
| `app-store` | apps, app store, downloads, software, permissions, in-app purchases, marketplace | - | stall, phone, padlock, coin | Bright market of stalls: an awning stall of app icons, a hanging APPS banner, a phone, a padlock and a spinning coin. |
| `keyboard-desk` | typing, coding, programming, passwords, keyboard, computer work, bugs | - | screen, keyboard, bug, bulb | Giant desk: a big monitor with a progress bar, a wide keyboard, a crawling bug and an idea bulb. |
| `cloud-sky` | cloud, cloud storage, upload, sync, backup, streaming, remote servers | - | cloud, cloud2, database, wifi, phone | Sky above the clouds: a huge cloud with an upload bar, a small cloud, a floating island with a database, wifi and a phone. |
| `cooling-room` | cooling, heat, temperature, fan, thermal throttling, overheating, air conditioning | - | fan, thermometer, dial, snow, server | Frosty machine room: a big fan, a thermometer, a temperature dial, a snowflake and a server, with cold pipes. |
| `cable-maze` | cables, usb, ports, connections, wires, charging cables, power supply | - | socket, plug, cable, bolt | Back-of-the-desk jungle of cables: a plug, a wall socket, a long cable and a bolt of power. |
| `firewall-gate` | security, privacy, firewall, malware, hacking, passwords, antivirus | - | shield, padlock, scanner, bug | Night castle-style gate of a network: a big shield, a padlock, a scanning magnifier and a bug trying to sneak in. |

### Composable scenario: `workshop-stage`

A bench scene whose props come from the payload: `{ "scenario": "workshop-stage", "theme": "bench|sky|grid|night-city", "props": [ { "kind": <library kind>, "id"?: "my-id", "at"?: left|center|right|0-1, "size"?: S|M|L, "row"?: floor|bench|high } ] }` (1-8 props). Ids default to the kind (`battery`, `battery-2`); beats target those ids. Rows: `floor` (stands on the ground), `bench` (sits on the table), `high` (floats in the upper wall). Style tokens still remap every colour. Beats drive the prop states: `fill` 0-1, `open`, `light`/`dim`, `pulse`, `burst`, `recolor`, `coins`, `stamp`.

### Prop library (48 procedural props: 28 in `runtime/props.js`, 20 developer props in `runtime/props-tech.js`)

| kind | row | states | about |
|---|---|---|---|
| `phone` | bench | fill open light pulse | smartphone: screen, app grid, battery percent; open shows its internals |
| `battery` | bench | fill light pulse | battery with charge segments (fill = charge level) |
| `thermometer` | floor | fill light pulse | thermometer: the mercury rises with fill and turns red |
| `gauge` | high | fill light pulse | round dial with a needle and a red zone (fill = reading) |
| `chip` | bench | fill light pulse | processor chip with pins and a die; fill heats it up, light powers the cores |
| `fan` | floor | fill light pulse | cooling fan; spins faster with light and fill |
| `cable` | bench | fill light pulse | cable with a plug at each end; fill sends a pulse along it |
| `charger` | floor | light pulse | wall charger brick with prongs; light turns the LED green |
| `router` | bench | light pulse | wifi router with antennas and blinking LEDs |
| `wifi` | high | fill light pulse | wifi symbol of arcs; fill lights more arcs |
| `cloud` | high | fill light pulse | cloud; fill shows an upload bar, light makes it glow |
| `padlock` | floor | open light pulse | padlock; open lifts the shackle, light turns it gold |
| `magnifier` | bench | light pulse | magnifying glass that sways; light highlights the lens |
| `bug` | floor | light pulse | software bug: a beetle with legs that crawl |
| `coin` | bench | light pulse | spinning coin; pulse or coins make it hop |
| `barchart` | high | fill light pulse | bar chart on a board; fill raises the bars |
| `flame` | floor | fill light pulse | flame; fill grows it, it flickers |
| `snowflake` | high | light pulse | snowflake for cold and cooling; light makes it sparkle |
| `plug` | floor | open light pulse | electric plug; open pulls it away from the wall, light sparks it |
| `screen` | bench | fill light pulse | monitor with a progress bar; light turns it on, fill moves the bar |
| `keyboard` | bench | light pulse | keyboard; keys flash while typing, pulse presses a key |
| `bolt` | high | light pulse | lightning bolt for power and charging; pulses |
| `gear` | high | fill light pulse | turning gear; fill speeds it up |
| `server` | floor | fill light pulse | server rack with blinking LEDs; fill heats it |
| `shield` | floor | light pulse | security shield; light shows the check, burst breaks it |
| `bulb` | high | light pulse | idea bulb; light turns it on |
| `clock` | high | fill light pulse | wall clock; fill sweeps the minute hand |
| `database` | floor | fill light pulse | database cylinder; fill lights its layers |
| `package` | floor | open fill(taped) light(label) pulse | cardboard package: open shows the inside, fill tapes it shut, light sticks a shipping label |
| `mailbox` | floor | open(flag up) fill(letters) light pulse | mailbox on a post: open raises the flag, fill pushes letters out of the slot |
| `remote-server` | floor | fill(upload bar + received counter) light pulse | remote server rack: blinking lights, uploading bar, received counter |
| `commit-nodes` | bench | fill(nodes appear) light(newest highlighted) pulse | row of commit nodes joined by arrows |
| `branch-graph` | high | fill(grows, branches, merges) light pulse | main line plus a feature branch that merges back |
| `terminal` | bench | fill(typed lines) light pulse | terminal window with a blinking cursor |
| `editor` | bench | light(scrolls faster) pulse | code editor window whose coloured lines scroll |
| `laptop` | bench | open(error) light(success) fill(loading bar) pulse | laptop whose screen shows code, an error or success |
| `pr-card` | high | fill(approved) light(merged) pulse | pull-request card: open, approved, merged |
| `key` | floor | light(shine) pulse | golden key that glints |
| `ci-tube` | bench | fill(liquid) light(green check) pulse | test tube for tests / CI |
| `crate-stack` | floor | fill(more crates) light(top highlighted) pulse | stack or queue of crates |
| `sign-post` | floor | fill(TODO, DOING, DONE) pulse | signpost with a text board |
| `ghost` | floor | open(fades out: missing) light(red) pulse | ghost for something missing or not sent |
| `trash` | floor | open(lid) fill(rubbish) pulse | trash bin |
| `folder` | bench | open(fans papers) fill(more papers) pulse | file folder |
| `ticket-board` | high | fill(ticket moves TODO to DOING to DONE) light pulse | kanban board |
| `order-slip` | high | fill(ticked lines) light(sways) pulse | kitchen order slip on a rail |
| `ci-belt` | floor | light(green checks, else red crosses) pulse | conveyor with a check gate |
| `deploy-pad` | floor | fill(lift-off with flame) light(beacon) pulse | rocket on a launch pad |

**Drawing language (all 48 props).** One 1 px ink outline (`box` / `ball`, or an ink pass behind thin parts such as wifi arcs), a 3-step ramp from the style palette (dark `[1]`, mid `[2]`, light `[3]`), one white highlight pixel per large surface, every measure through `Q(n) = round(n * s)` so art stays on the pixel grid, colours only from master ramps (never fixed hex) so every style remaps them. Silhouette first: a prop must read as a filled shape before any detail.

**Scale table.** Natural sizes are 14-54 px tall. At the workshop-stage scale `s = 2` a library prop is 20-130 % of the hero's height (hero M = 86 px: 28-108 px); a scenario may use `s = 3` for its landmark prop; no developer-scenario prop is taller than 2x the hero. The hero is never scaled to fit props: props move or shrink, the hero stays M (see Cast).

### Developer-tooling scenarios (`runtime/scenarios-g.js`)

| id | suits topics | props (targets) |
|---|---|---|
| `git-desk` | git, commit, branches, merge, version control | graph, nodes, laptop, folder, terminal |
| `server-room` | remote server, push, upload, cloud storage, hosting | remote, rack-a, rack-b, uplink, router |
| `review-room` | code review, pull request, approval, feedback | pr, editor, glass, bug, shield |
| `terminal-cave` | command line, shell, commands, permissions and keys | terminal, keyboard, key, bug |
| `ci-pipeline` | continuous integration, automated tests, build, quality gate | belt, tube-a, tube-b, gear, screen |
| `ticket-board-office` | kanban, ticket board, sprint, backlog, queue of work | board, sign, queue, bulb |
| `api-kitchen` | api, requests and responses, orders, client and server | slip-a, slip-b, stove, pass, phone |
| `deploy-pad` | deploy, release, shipping to production, going live | pad, sign, mail, pr |

### Ambient life (`runtime/ambient.js`)

Every scenario (and `workshop-stage`) gets 2-4 looping animations that run between beats, independent of the narration: a belt-style service lane on the floor with moving items (crates, packets, coins or checked boxes by topic), a bystander walking the floor, steam, wall torches, neon tube flicker, a blinking LED rail, a scrolling ticker, birds, and breathing foreground bushes. They are pure functions of time and a per-scenario seed, drawn in the floor band (y > 380) or at the far edges, never on the HUD canvas. Intensity: `hf.ambient = "calm" | "normal" | "lively"` (default `normal`; runtime reads `SPEC.ambient`), scaling counts, speeds and sway.

Measured with the near-static metric (mean absolute difference of consecutive 135x240 gray frames below 0.3, software rasteriser, first 20 s of the `pixel-fluid-proof` build, same beats): ambient off 30.2 %, calm 25.5 %, normal 19.7 %, lively 10.9 %. Tool: `04-projects/pixel-props-audit/motion.mjs`.

All scenarios, including the old ones, get the same lower-third dressing (see Frame zones).


## Audio (own chiptune and pixel SFX, U14)

pixel-world synthesizes its own sound in code (`audio.mjs`, split into `audio-dsp`, `audio-music`, `audio-sfx`, `audio-cues`, `audio-env`) and hands it to the engine through `compose() -> { audio }`. No library track, no SFX kit sample and no CC BY credit are involved.

- **Music** (`music.provider: "format"`, the default of this format through `meta.defaults`): seeded chiptune with triangle/saw/square bass, pulse arpeggio and lead, noise hats and snare, sine kick. Moods (`music.mood`): `adventure` (C major, 118 BPM), `calm` (A minor, 80), `tense` (D minor, 132), `playful` (F major, 108), `mystery` (E dorian, 92); `auto` takes the style's default (`STYLE_FLAVOUR`: gameboy is a 2-channel DMG sound, snes/dusk/vaporwave add pad, echo and stereo, 1-bit and virtual-red are bit-crushed, c64 uses PWM and saw bass). `music.seed` picks the progression, arpeggio shapes and melody (default: hash of the title, so each video has its own tune; same seed = byte-identical WAV). Length is exactly the video duration: a one-bar intro without drums, a held tonic chord and a fade at the end. 2.6 kHz low-pass.
- **Levels**: music 17 dB under the voice (at `music.volume` 0.12; each doubling +6 dB) with a shallow 3.5 dB duck while words are spoken (`music.duck: false` turns it off). The final mix is normalized to -14 LUFS by the engine.
- **SFX**: 24 synthesized voices (pop, blip, ping, coin, thud, burst, slash, stamp, hit, whoosh / whooshUp / whooshDown, tick, rise, fall, step, jump, powerup, error, transition, flip, poof, buzz, select). `audio-cues.mjs` maps the RESOLVED beats to sounds, each bound to the word start of its beat: `fill` = three rising blips, `light` = ping, `pulse` = tick, `hero-stamp` = stamp + coin, `coins` = up to 3 coins, `x2` = two coins, `push` = whoosh up, `pan` = whoosh, `jump` = jump + fall, `cheer` = power-up, `walk` = footsteps, `emote`/`react` = blip or ping by symbol (cross = error), world transitions by type (slide whoosh, tiles chip run, iris whoosh down, down fall) plus a landing blip, HUD progress/counter blips and the brand follow click. `flash` and ambient reaction beats stay silent. They play unless `sfx.enabled` is false, even when the user picks library or no music.
- **User choice is respected**: `music.provider` `library`, `elevenlabs` and `none` go through the engine's normal path (a format that returns no music falls back to the library). The web offers "Chiptune del formato" with the moods for this format only.
- **Lip-sync**: `compose()` also takes `voicePath`; it computes the voice loudness envelope (30 fps, one value per frame, normalized to the 95th percentile) into `SPEC.env` and `talkLevel` (`runtime/cast.js`) opens the mouth from it (closed under 0.12, half under 0.42, open above). Without a voice file the mouth falls back to the word spans.

## Quality rules (built into the runtime)

- **Fill the frame.** `runtime/floor.js` dresses the lower third of every world: a floor pattern (tiles, planks, grass, sand, metal grating, carpet, circuit traces, water), floor markings, scattered debris and blurred foreground silhouettes in the bottom corners plus one hanging element at the top edge. A scenario may declare `floor: [kind, ramp, [fg...]]`. Tests render every scenario in the headless sandbox and require non-empty thirds and a minimum of non-flat cells in the bottom third (about 20 % or more; before this pass several scenarios were at 5-15 %).
- **Cast size.** Everyone defaults to size M (86 px, 18 % of the frame; the hand-made reference hero is about 72 px). L (134 px, 28 %) and S exist only when the payload writes `size`; a hero at L hides the props, so the prompt keeps it for a lone-hero close-up. Older payloads that wrote `size: "L"` keep working. A defaulted size may still shrink to S to clear a targeted prop.
- **Contrast.** Stamps pick a fill with a WCAG contrast of at least 4.5 against their ink stroke, else become a boxed banner using the best palette pair (`runtime/contrast.js`, shared by the browser and the tests). Label chips pick the fill/ink pair the same way; chip heights follow the style grid, so chunky styles (px 2) no longer clip the text.
- **Punch (U15).** `punctuate()` in `normalize.mjs` (called by `resolvePayload` after `densify`) raises a world below 0.6 punch events per second (hero-stamp, shake, burst, radial-burst, flash when enabled, x2 = 1 each, emote = 0.5) towards about 0.75, bound to strong spoken words (numbers first, then long words; stamps 1.6 s apart, at most 11 characters, the first world always stamps its hook word in the first 2.5 s). `deriveShakes()` adds a small silent shake to every stamp, burst, radial burst and push that has none within 0.3 s. Existing beats are never changed and every addition is a warning. The prompt asks the model for 8-12 stamps/shakes on the strongest words per video.
- **Flash guard.** `flash` stays opt-in (`hf.flash: true`). Written or auto flashes are capped by `capFlashes()`: none before 0.5 s, at most 3 per 10 s window, 0.5 s apart; each flash is under 2 frames (0.06 s) and never above 50 % white, white only (no red/white strobing).
- **Camera life.** Every world drifts: a seeded triangle sway (4-7 logical px, 6-10 s period) of the far, back and foreground layers around the focal plane (props and cast), so the layers together never rest for 2 s. Impact beats (hero-stamp, burst, radial-burst) punch the camera in by a quarter step for about 0.4 s (at most one per 1.8 s, never over a written `push`). The stage zoom is quantised to quarter steps (4 x 1.25 = 5 screen px per art pixel, 1.5, 1.75, 2) on a whole-logical-pixel origin, so pixel edges stay sharp (a smooth CSS scale would resample the pixelated canvases).
- **Motion kit** (`runtime/fx.js`): `dropIn` (bounce-in of the cast when its world appears), `hitSquash` (the hero squashes then stretches on every stamp, shake and burst), `flicker` (stepped light flicker on lit props), `chips` (shards on `chop`), `gain` (tokens flying on parabolas into a prop on `fill`), `toss` (coins thrown out with gravity and a damped bounce on `coins`), plus the older `fly`, `burst`, `sparkle`. All closed-form functions of time.
- **Beat density.** `densify()` in `normalize.mjs` (called by `resolvePayload`, because it needs the word timings) adds ambient reaction beats (hero `react`, prop `pulse`, `emote`, `jump`) on spoken words when a world has fewer than 0.5 beats per second. Existing beats are never changed, ambient beats are silent (no SFX) and every addition is listed in `warnings`.
- **Scenario fit.** Topic tags and a NOT-for list in the prompt table; the normalizer maps free text (`"smartphone heat"`, `"firewall security"`) to the scenario whose id/name/topics match best (id and name words weigh more than topic tags).

## Cast

Heroes (`hero` and `cast[].who`): `hoodie` (Round-headed kid in an orange hoodie, dark hair, white sneakers.); `capgirl` (Teal jacket, red cap and a ponytail; slimmer silhouette.); `wizard` (Tall pointed hat, long purple robe and a white beard.); `astro` (White suit, glass helmet dome and an orange chest pack.); `robot` (Boxy steel robot with a visor screen, antenna and tube legs.).
NPCs: `cat` (Sitting cat with a wagging tail that blinks and hops.); `slime` (Bouncing blob with two eyes; squashes on every landing.); `drone` (Hovering helper bot with spinning rotors and a blinking light.); `ghost` (Friendly floating ghost that sways and fades its tail.); `bug` (Literal beetle that scuttles side to side on six legs.).
Clips: idle, blink, talk (mouth follows the word spans), walk, react (? ! lit eyes), point, jump, cheer. Sizes S/M/L = 12/18/28 % of the frame height; figures are drawn natively at each size (more pixels, never scaled).

## Mechanism beats and sentence coverage (U16b)

The story is told literally: every narrated sentence needs something drawn that changes and an interaction. New beat kinds (all bound to words with `on: {word, n?}`, closed enums, precise validation; code in `runtime/beats.js` and `runtime/fx.js`, pure functions of time):

| kind | fields | effect |
|---|---|---|
| `travel` | `target` (origin prop) or `who`, `to` (prop, `hero`, left/center/right), `item`, `path` line/arc/bezier, `ease`, `trail`, `spin`, `land` burst/bounce/slam/tick/none, `dur`, `text` | an object flies A to B; the destination lights up and hops; `slam` shakes the screen; `tick` floats +1 |
| `transform` | `target`, `state` (open closed taped labelled empty full flag-up flag-down), optional `item`, `text` | the prop shows a state; with `item` a parcel sits on it and changes state (a travel from that prop takes it away) |
| `spawn` / `stack` | `target`, `count` 1-12, `item`, `layout` row/pile | objects pop in one by one and keep piling up |
| `vanish` | `target` | everything spawned on the prop disappears with a puff |
| `count` | `target`, `value`, `label` | counter chip that ticks to `value` with a bump |
| `compare` | `target`, `to`, `symbol` check/cross, `dur` | check on one prop, cross on the other |
| `carry` | `who`, `target`, `to`, `item` | walk to the prop, pick up, walk, put down; the destination reacts |
| `reject` | `target`, `who`, `item` | an item is thrown at the prop and bounces back with a cross and a shake |

Items: box letter coin tile dish msg crate commit. `hf.ambient` (calm|normal|lively, default normal) is validated here and consumed by the ambient animations.

Sentence coverage (`hf/pixel-world/coverage.mjs`, pure): `splitSentences(words)`, `coverageReport({words, beats})` and `interactPunctuate`. A sentence passes when its time span holds a drawn change AND an interaction (mechanism kinds or a prop action fill/open/close/light/dim/burst/recolor/coins/chop/stamp; a pulse is only emphasis; stamps, labels and emotes alone are reported as "covered only by stamps/labels"). `resolvePayload` reports each failing sentence as a warning (`coverage: sentence N ...`) and returns `coverage.written` and `coverage.final`. When a sentence has no interaction and the world has props, the engine adds a pulse plus a token travelling from the hero to the nearest prop (`auto`, reported as a warning, never changing written beats). Automatic stamps echo the strongest concept word of the previous caption group, never a word of the caption on screen; a punch-in or push never crops the hero at the frame edge.

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

Append `defScenario({ id, name, about, keywords, time, w, far, back, mid, props: { id: { x, y, w, h, about, draw(g, t, S, c) } }, fore })` to a `runtime/scenarios-*.js` file. Draw only with the kit (`runtime/kit.js`, `fx.js`, `core.js`) and master ramps; ground at y=345, keep key props inside y 77-346 (the action band); declare `topics` (3+) and `avoid` for generic scenarios, optionally `floor`. Prefer library props (`libProp(kind, x, y, scale, { about })`) so beats can drive their states. `S` is the prop state: `fill`, `open`, `lit`, `tone` and transient events `ev.pulse|chop|stamp|burst|coins` (progress 0-1 or -1). Mark `fills/chops/stamps/opens: true` when the prop draws that action itself; otherwise the engine adds a generic effect. Top level of these files may only call `defScenario` (the node side evaluates them in a vm sandbox to build the catalog). Run `node --test test/hf-pixel-world*.test.mjs`, then render the gallery: `node 04-projects/hf-showcase/pixel-world/build-showcase.mjs gallery` and `npx hyperframes snapshot`.

## Files

`index.mjs` contract exports; `styles.mjs`; `catalog.mjs` (vm catalog); `schema.mjs` (zod); `normalize.mjs`; `resolve.mjs` (words, windows, captions, sfx); `compose.mjs` + `template.html`; `prompt.mjs`; `layout.mjs` (frame zones); `topics.mjs` (topics of the original scenarios); `sandbox.mjs` (headless runtime for tests); `runtime/{core,contrast,fx,kit,floor,cast,props,scenarios-a|b|c|d|e|f,beats,main}.js` (browser). Showcase and galleries: `04-projects/hf-showcase/pixel-world/`.

## Known limits

Single mode joins stations with a hard seam (pillar or floor slab), not a drawn road; world art is not mirrored for left-facing scenes; mono styles (Game Boy, virtual-red, noir) lose some prop contrast; 1-bit is noisy on busy scenarios. `compose` is covered by node tests (determinism, bindings, schema); drawing correctness is verified visually with HyperFrames snapshots; the headless sandbox only measures coverage and detail per frame third, HUD placement and contrast, not aesthetics.
