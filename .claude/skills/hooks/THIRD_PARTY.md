# Third-party code

`hooks.json`, `hookscore.py`, `title.py` and `swipe.py` are adapted from
[youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) by Jake Schincariol
(commit a2feb21, 2026-09-16), under the MIT License below. The `/canal` week plan and the
`08-channels/_template/voice.md` sections also draw on that repo's `yt-plan` skill and `templates/voice.md`.

Changes in this workspace:
- `hooks.json`: added `match_es` (Spanish patterns for each of the 21 formulas) and `note_es`.
- `hookscore.py`: Spanish word lists, language auto-detect and `--lang`, a 5-12 word brevity band
  for a 3-second short-form hook (upstream: 9-24 words), `--formulas`.
- `title.py`: Spanish word lists, accented words, `--cover` alias for `--thumb`.
- `swipe.py`: reads `hooks.json` from this folder and also matches the Spanish patterns.

## License

MIT License

Copyright (c) 2026 Jake Schincariol

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
