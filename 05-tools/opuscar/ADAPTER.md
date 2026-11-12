# opuscar kit: overrides for this repo

Vendored copy of [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) at commit `bebbbe1` (2026-11-05).
Code and guides: MIT. Demo films and stills: CC BY 4.0 (credit LemoLab if a demo frame is reused). Films we make: ours, no credit.

Read `AGENTS.md`, `DIRECTOR.md` and `TECHNIQUE.md` as written, with these overrides. Where they conflict, this file wins.

| Guide says | In this repo |
|---|---|
| Library at `~/lemo-opuscar`, `$LIB` | `$LEMO_OPUSCAR_HOME` = `05-tools/opuscar` (set by `env.sh`). Never write to `~` |
| Saved styles in `~/lemo-my-styles/` | `$LEMO_MY_STYLES` = `05-tools/opuscar-my-styles/` (same layout, its own `README.md`) |
| Project folder `films/<name>/` | `$P` from `node .claude/skills/canal/jobs.mjs new` (the `/video` skill's `$J`), i.e. `04-projects/<id>/`; the film's code goes in `$P/film/` |
| Default 1920x1080, 24 fps | `--size 1080x1920` on every page tool (`still`, `video`, `events`, `readcheck`) and `--fps 30`; `mux.sh video.mp4 mix.wav out.mp4 30`. Lay out for portrait: text inside the center 900x1300 safe box |
| Film length 40-90 s | Shorts: 30-60 s (hook in 0-3 s, a visual change every 2-4 s). Long-form (YouTube 16:9, 8-12 min) only when the user asks for it; then keep the 1920x1080 default |
| Language: ask 中文 / English | Spanish by default (the user writes in Spanish); never ask the language question |
| Voice: Kokoro (`tts.py`) / edge-tts | ElevenLabs: `core/tts/tts_eleven.py lines.json voices/` (same outputs as `tts.py` plus `words.json` from ElevenLabs timestamps, so `asr_check.py` is optional). Default voice `WFmom5vWeiir6CN1crV3`; a channel may set its own in `08-channels/<slug>/channel.json`. Every line is cached by text, so re-runs cost no credits. Kokoro only if the user asks. **Always pass `--flow`**: the whole script is read in one take and cut at the pauses, so it sounds like one person talking, not glued takes. Speed 1.0-1.08 (1.15 sounds rushed and robotic). Place the lines with `voices/starts.json` (back to back plus a lead-in); never add gaps between lines, except one deliberate beat of at most 0.4 s |
| Treatment, then build | Same, plus the repo's hook flow and title/cover lint from the `/video` skill (§3.2, §3.5). Sources only in the YouTube description, never in narration or on screen |
| Music mixed by hand under the voice | The music can be the film's own synthesized score (TECHNIQUE.md) or a library track (`03-assets/music/library.json`), but its level and ducking ALWAYS come from the engine's own bed, the same as the web client: `node 05-tools/opuscar/core/post/engine_bed.mjs --narration <voice.wav> --words voices/words.json --timeline <line-starts.json> --total <s> --out music_bed.wav --music <score.wav>` (own score, rendered with no ducking or gain tricks) or `--mood tech-lofi` (library), run from the repo root. It sits 13 dB under the voice and dips 9 dB more while words are spoken. Then `voice + music_bed + sfx` (SFX peaks about 12 dB under the voice), master to -14 LUFS. Never set the music gain or ducking by hand; credit a library track in `brief.md` and `post.md` |
| Subtitles: styled per film, sentence-level | Shorts captions on every narrated film: copy `core/post/shorts-captions.js` and a heavy font (`03-assets/fonts/Montserrat-Black.ttf`, or another heavy OFL face that fits the style) into `$P/film/`, `makeCaptions({words, starts, fontUrl, accent})` and call `CAP.render(t)` at the end of `window.render`. 1-3 words per chunk, the spoken word in the accent colour, centred at y≈1330. They replace the style's own subtitle line; keep key action out of y 1200-1460, and pass `hide` for a title card that already shows the words. The `.srt` stays sentence-level |
| Deliver per DIRECTOR.md §11 | Copy the master to `$P/video.mp4`, then the `/video` skill steps 4.2-4.5 (verify, stage ready, export, content log) |

Install once (core tier; Playwright's browser goes to `05-tools/cache/playwright`):

```sh
source ./env.sh && cd "$LEMO_OPUSCAR_HOME" && sh plugin/skills/lemo-opuscar/scripts/setup.sh deps
```

Run tools from the library root with the project's absolute path, e.g.
`cd "$LEMO_OPUSCAR_HOME" && node core/render/still.mjs "$P/film" 1.5 3 --size 1080x1920`.

Don't edit `core/` or `styles/` for one video: copy what you need into `$P/film/`. Our only additions to the vendored tree are this file, `core/tts/tts_eleven.py`, `core/post/engine_bed.mjs` and `core/post/shorts-captions.js`.

Style catalog in Spanish, grouped by what each style is good for: `00-docs/opuscar-styles.md`.
