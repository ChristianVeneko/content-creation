# Full pipeline prompt (paste into Claude Code at the repo root)
```
Create a new short video project in 04-projects/{slug} by copying 04-projects/_template.
Topic: {topic}. Audience: {audience}. Language: {language}. Length: {30|45|60}s. Format: {format}.
Steps:
1. Use 01-prompts/01-hooks.md and 02-script.md to write hooks + script into {slug}/brief.md.
2. Use 03-shot-list.md for the shot list; fetch b-roll from Pexels/Pixabay APIs (vertical) into {slug}/raw/.
3. If I provided raw footage: run 02-scripts/cut-silences.sh, then transcribe.sh for word timestamps.
4. Build the edit with Remotion (captions word-by-word, Montserrat Black, inside the 900x1300 safe box) or ffmpeg scripts.
5. Normalize audio to -14 LUFS, export with 02-scripts/export-platforms.sh.
6. Write captions/hashtags per platform (04-captions-hashtags.md) into {slug}/captions/post.md.
Follow 00-docs/platform-specs-and-retention.md rules.
```
