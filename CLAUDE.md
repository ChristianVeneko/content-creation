# Content Creation Master Folder: instructions for Claude

Goal: produce vertical short-form videos (Reels, TikTok, Shorts) at 1080x1920, 30fps.

## Layout
- `00-docs/`: platform specs and retention rules, tool catalog, asset catalog, template styles, 3D resources, content log (CSV, local only, created by `setup.sh`)
- `01-prompts/`: reusable prompt templates (hooks, script, shot list, captions, repurpose, AI gen, cover)
- `02-scripts/`: ffmpeg/CLI helpers (to-vertical, blur-pad, burn-captions, normalize, export, cut-silences, transcribe, fonts, safe-zone)
- `03-assets/`: fonts, music, sfx, overlays, gifs, stock video, images, LUTs, brand
- `04-projects/<id>/`: one folder per video; `job.json` holds `channel` and `stage` (idea|draft|ready|published)
- `setup.sh`: one-time setup (macOS or Linux/WSL); `05-tools/install.sh`: opt-in extras
- `06-exports/{reels,tiktok,shorts}/`: final deliverables
- `08-channels/<slug>/`: `channel.json` + `voice.md`, the channel context for the agent (contract: `08-channels/README.md`)

## Rules
- Follow `00-docs/platform-specs-and-retention.md`: hook in 0–3s, a pattern interrupt every 2–4s, text inside the center 900x1300 safe box, audio at -14 LUFS.
- Record every third-party asset's source and license in the project's `brief.md`. Prefer CC0, Pexels, Pixabay, and OFL fonts.
- Don't re-publish GIPHY/KLIPY GIFs in monetized videos. Don't use Tenor (shut down), Udio (no downloads), or Sora (deprecated).
- API keys go in `.env` (see `.env.example`). Never commit `.env`.
- Run commands from the repo root, starting with `source ./env.sh && ...`. Never install globally or write caches/models to `~`; everything stays inside the repo.
- ffmpeg: `env.sh` puts `05-tools/bin` first on PATH, so a local build there (with libass) wins over the system one. Burned-in ASS captions need libass.
- Caricature commentary videos use the `caricatura` skill and `05-tools/caricature-stage/` (every scene needs a detailed SCENERY set, never a plain colour background; real people stay in its git-ignored `private/`).
- "hazme un video" means use the `video` skill; `/canal` manages channels, stages and week plans; `/hooks` scores hooks and title/cover pairs; `/lote` makes an overnight batch for one channel (never uploads). Engine contract: `07-studio/engine/README.md`.
