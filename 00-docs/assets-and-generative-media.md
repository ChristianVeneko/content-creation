# Assets & Generative Media Catalog

> Researched 2026-10-31. Items marked ⚠ could not be confirmed from an official source — check them before you rely on them.
> Legend: **Free** / **Freemium** / **Paid**. **API** = Claude Code can call it directly with a key.

## 1. Stock video & B-roll
- **Pexels Videos**: https://www.pexels.com/api/. Free; commercial use OK, no attribution. **API: yes** (has portrait renditions).
- **Pixabay Videos**: https://pixabay.com/api/docs/. Free; no attribution. **API: yes** (`/api/videos/`; download files, don't hotlink).
- **Coverr**: https://coverr.co. Free; no attribution. Developer API ⚠.
- **Mixkit**: https://mixkit.co. Free, **some clips are non-commercial**, so check each one. No API.
- **Videvo**: https://www.videvo.net. License varies per clip (some CC BY). No API.
- **Vecteezy/Videezy**: https://www.vecteezy.com. Freemium; free tier needs attribution. API ⚠.
- **Storyblocks / Artgrid / Envato Elements**: Paid subscriptions.

## 2. Stock images & illustrations
- **Unsplash**: https://unsplash.com/developers. Free. API: yes (API guidelines require photographer credit + the download trigger).
- **Pexels Photos / Pixabay**: Free. API: yes.
- **Openverse**: https://api.openverse.org. CC/public-domain aggregator. Filter with `license_type=commercial`. API: yes.
- **unDraw**: https://undraw.co. Free SVG illustrations.
- **Freepik/Storyset**: https://www.freepik.com/api. Freemium; free tier needs attribution.

## 3. Icons
- **Iconify**: https://api.iconify.design. 200k+ icons, public SVG API with no key (license is per set).
- **Lucide** (ISC), **Phosphor / Tabler / Heroicons** (MIT), **Material Symbols** (Apache 2.0).
- **Noun Project** (CC BY or Pro), **Flaticon** (attribution required on free use).

## 4. Emojis & stickers
- **Noto Emoji animated**: https://googlefonts.github.io/noto-emoji-animation/. CC BY 4.0. Lottie/GIF/WebP from the CDN:
  `https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/512.webp` or `/lottie.json`
- **Twemoji** (jdecked fork, CC BY 4.0): https://github.com/jdecked/twemoji
- **Microsoft Fluent Emoji 3D** (MIT): https://github.com/microsoft/fluentui-emoji
- **OpenMoji** (CC BY-SA): https://openmoji.org
- **Memes**: Imgflip API https://imgflip.com/api. Commercial use is risky because of meme copyright.

## 5. GIFs & animated overlays
- **GIPHY API**: https://developers.giphy.com. The ToS does NOT grant re-use of GIFs in monetized videos.
- **Tenor API**: ❌ deprecated (no new keys since Jan 2026; API shut down June 30, 2026).
- **KLIPY**: https://klipy.com. Tenor's replacement. Same display-only caveat.
- **LottieFiles**: https://lottiefiles.com. Free animations use the Lottie Simple License (commercial OK). Render with `@remotion/lottie` or `lottie-web`.
- **Green screen / light leaks / grain**: search Pixabay/Pexels, or the Motion Array free tier.
- **Recommended**: generate grain, glitch, vignette, and light leaks procedurally (ffmpeg `noise`, `rgbashift`, `vignette`, `xfade` with 40+ transitions; Remotion `@remotion/transitions` and shaders). No licensing needed.

## 6. Sound effects
- **Freesound**: https://freesound.org/docs/api/. Filter with `license:"Creative Commons 0"`; avoid CC BY-NC. API: yes.
- **Pixabay SFX**: https://pixabay.com/sound-effects/. Free, no API ⚠.
- **Mixkit SFX**: https://mixkit.co/free-sound-effects/. Free.
- **ZapSplat**: https://www.zapsplat.com. Free tier needs attribution.
- **ElevenLabs Sound Effects** (generative): `/v1/sound-generation`. API: yes.

## 7. Royalty-free music
- **YouTube Audio Library** (YouTube Studio). Some tracks need attribution.
- **Pixabay Music**: https://pixabay.com/music/. Occasional Content ID claims.
- **Uppbeat**: https://uppbeat.io. ~3 free downloads/month plus a credit line.
- **Free Music Archive**: https://freemusicarchive.org. License per track (watch for NC/ND).
- **Incompetech** (Kevin MacLeod): https://incompetech.com. CC BY 4.0.
- **Epidemic Sound / Artlist / Musicbed**: Paid, with channel whitelisting.
- **Trending audio on TikTok/IG**: add it IN THE APP when you publish, not in the render.

## 8. Caption fonts
| Font | Source | License | Commercial |
|---|---|---|---|
| Montserrat Black/ExtraBold ("Hormozi" look) | Google Fonts | OFL | ✅ |
| Anton, Bebas Neue, Poppins, Inter, Oswald, Archivo Black, League Spartan, Bangers | Google Fonts | OFL | ✅ |
| The Bold Font | dafont | ⚠ check the ZIP | ⚠ |
| Komika Axis | fontsquirrel.com | Apostrophic Labs freeware | ✅ ⚠ |
| Satoshi, General Sans, Clash Display, Cabinet Grotesk | https://www.fontshare.com | ITF Free Font License | ✅ |
| Velvetyne (Basteleur, Ouroboros) | https://velvetyne.fr | OFL | ✅ |

Load fonts in code with `@remotion/google-fonts` or `npm i @fontsource/montserrat`. To install them for ffmpeg: `02-scripts/fetch-fonts.sh`.

## 9. AI image generation
- **FLUX (BFL)**: https://docs.bfl.ml. Pro/Kontext API outputs OK for commercial use; [dev] weights are non-commercial.
- **GPT-Image (OpenAI)**: https://platform.openai.com/docs/guides/image-generation
- **Imagen 4 / Nano Banana (Gemini)**: https://ai.google.dev. SynthID watermark.
- **Ideogram**: https://developer.ideogram.ai. Best at rendering text (title cards).
- **Recraft**: https://www.recraft.ai. Vector/SVG and icons.
- **Midjourney**: no official API; avoid proxies.

## 10. AI video generation
- **Google Veo 3.1** (Lite/Fast/Standard): https://ai.google.dev/gemini-api/docs/video. Native 9:16, audio included. ~$0.05 to $0.60/s ⚠.
- **OpenAI Sora 2**: ⚠ reportedly shut down (~Sept 2026). Don't build on it.
- **Kling 2.x/3.0**: https://app.klingai.com/global/dev
- **Runway Gen-4/4.5, Aleph**: https://docs.dev.runwayml.com
- **Luma Ray2/Ray3**: https://docs.lumalabs.ai
- **MiniMax Hailuo**: https://www.minimax.io
- **ByteDance Seedance**: https://www.byteplus.com (ModelArk)
- **Pika**: via fal.ai ⚠
- **Higgsfield**: https://cloud.higgsfield.ai. 50+ models under one key. **The Higgsfield MCP + skills are already available in this Claude Code setup.**
- **Wan 2.x** (open weights, Apache 2.0): https://github.com/Wan-Video

## 11. Avatars & lip-sync
- **HeyGen**: https://docs.heygen.com
- **Synthesia**: https://docs.synthesia.io
- **Hedra Character-3**: https://www.hedra.com (image + audio → talking video)
- **Captions.ai / Mirage** ⚠
- **Sync Labs lipsync-2**: https://sync.so
- Open source: LatentSync / MuseTalk via fal or Replicate.

## 12. Voice (TTS / STT)
- **ElevenLabs**: https://elevenlabs.io/docs. TTS, cloning, dubbing, and **Scribe** STT with word timestamps.
- **OpenAI gpt-4o-mini-tts**, **Gemini TTS**.
- **Whisper / whisper.cpp** (local, MIT). Pairs with `@remotion/install-whisper-cpp`.

## 13. AI music
- **ElevenLabs Music**: `POST /v1/music`. Cleared for broad commercial use.
- **Suno**: commercial rights only on Pro/Premier; no official API.
- **Udio**: ❌ downloads disabled after the UMG settlement (Oct 2025).
- **Stable Audio 2.x**, **Google Lyria 2**, **Mubert**, **Beatoven**: API: yes.

## 14. Aggregators
- **fal.ai**: https://fal.ai/models. One key for Veo, Kling, Seedance, FLUX, lip-sync, and audio models.
- **Replicate**: https://replicate.com. Official MCP server.
- **Higgsfield Cloud**.
- Runware / WaveSpeed / Together ⚠.

## Default API-only pipeline
B-roll: Pexels + Pixabay · Icons: Iconify · Emoji: Noto animated · SFX: Freesound CC0 · Voice: ElevenLabs · Captions: Whisper/Scribe word timestamps · Music: ElevenLabs Music · Generative clips: fal.ai (Veo 3.1 Fast / Kling / Seedance) · Font: Montserrat/Anton · FX: procedural (ffmpeg/Remotion) · Trending audio: added in the app.
