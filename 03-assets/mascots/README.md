# Mascots

A mascot is the character that narrates a `pixel-world` video (`spec.hf.hero`). Each one is a folder `03-assets/mascots/<id>/mascot.json`; `index.json` names the default (`{"default": "chris"}`). It is drawn in code in every one of the 14 pixel styles, so there are no image files; colours are remapped to the active palette (a brown skin becomes the nearest colour of, say, the Game Boy palette).

Check your files with `node 07-studio/engine/cli.mjs mascots` (`errors` must be empty). Choose one per video with `spec.hf.hero`, in the web studio (Mascota), or per channel with `defaults.mascot`.

| Field | Values |
|-------|--------|
| `id` | folder name; lowercase a-z, 0-9, dashes, up to 24 chars |
| `name`, `about` | display name; one sentence describing the look |
| `kind` | `human` (default) or `robot` |
| `skin`, `hair`, `top`, `bottom`, `shoe` | a ramp name (`skin wood dark stone white red orange yellow green grass teal blue purple pink sand gold steel brick`) or an explicit ramp of 5 hex colours, dark to light |
| `hairDark` | `#rrggbb` for eyebrows |
| `hairStyle` | `short`, `pony`, `beard`, `curly`, `none` |
| `hat` | `none`, `cap`, `wizard`, `helmet` (+ `hatRamp`) |
| `glasses` | `true` draws rectangular frames |
| `backpack`, `stripe`, `logo`, `shoeAccent`, `accent` | optional ramp: backpack with straps, side stripe on the pants, chest logo, sneaker cuffs, chest panel |
| `robe` | `true` for a long robe instead of legs |

`chris` was built from a photo of the channel owner: curly black hair, glasses, black tee with a small red logo, grey sweatpants with dark stripes, white sneakers with green cuffs and a black backpack.
