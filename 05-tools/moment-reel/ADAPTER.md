# moment-reel kit: overrides for this repo

Vendored copy of the free moment-reel Claude Code skill (MIT, `LICENSE`). Its guide is `SKILL.md`; read it as written, with these overrides. Where they conflict, this file wins.

| Guide says | In this repo |
|---|---|
| `<skill>` = `~/.claude/skills/moment-reel` | `<skill>` = `05-tools/moment-reel` |
| Tools in `~/.cache/moment-reel` | `$MOMENT_REEL_HOME` = `05-tools/moment-reel/home` (set by `env.sh`, ignored by git). Never write to `~` |
| Run it in an empty folder | The reel folder is `$P/reel` inside `$P` from `node .claude/skills/canal/jobs.mjs new` (the `/video` skill's `$J`): `PY 05-tools/moment-reel/scripts/new_reel.py $P/reel --sport <sport> --slug <slug>`, then pass `--project $P/reel` to every script |
| Sports moments only | Any famous, well-documented moment with a story in it: a goal, a launch, a court case, a discovery. A sport's set piece comes from the starter; anything else is drawn from the library's basic shapes |
| English only | Spanish by default (the user writes in Spanish): `"lang": "es"` in `script.json`, so `check_script.py` checks the formula in Spanish (the act first, "Verás," for the step back, hinges Entonces / Así que / Pero / De repente / Luego). Numbers in `say` as words ("mil-novecientos-ochenta-y-seis"), digits in `show` |
| Kokoro `am_liam+am_puck`, whisper `base.en` | ElevenLabs: `"engine": "elevenlabs", "eleven_voice": "WFmom5vWeiir6CN1crV3"` in `script.json` (`.env` is loaded by `env.sh`). Word times come from ElevenLabs character timestamps, so any language works without whisper. Kokoro only if the user asks (English voices only) |
| Facts first (`sources.md`) | Same, and it is the `/video` research step (§1b): `sources.md` lives in `$P/reel/` and is linked from `$P/brief.md`. Sources go only in the YouTube description, never in narration or on screen |
| Music bed `gain` | The music's level and ducking come from `02-scripts/engine_duck.py` (13 dB under the voice, 9 dB more while words are spoken); `gain` is ignored when there is a voice |
| Deliver `out/<slug>_9x16.mp4` | Copy it to `$P/video.mp4` and the cover to `$P/cover.jpg`, then the `/video` skill steps 4.2-4.5 (verify, stage ready, export, content log). The X cut is optional: skip `--size 1008x1152` unless the user asks for X |

Setup, once (about 500 MB into `$MOMENT_REEL_HOME`):

```sh
source ./env.sh && python3 05-tools/moment-reel/scripts/setup.py --project "$P/reel"
```

It ends with `PY=...`: run every later script with that Python.

Our additions to the vendored tree: this file, ElevenLabs word times in `scripts/narrate.py`, `"lang": "es"` in `scripts/check_script.py` and the engine ducking in `scripts/sound.py`.
