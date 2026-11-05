# Cómo rehacer el video
Desde la raíz del repo:
```bash
source ./env.sh
P=04-projects/2026-11-03-comparativa-cache-a-mano
node $P/build.mjs voice        # ElevenLabs (engine tts lib) -> assets/voz.wav
node $P/build.mjs transcribe   # whisper de HyperFrames -> assets/transcript.json (cache en /private/tmp)
node $P/build.mjs all          # SFX + música + mezcla -14 LUFS -> hf/assets/mix.wav ; compone hf/ y hf-sin-subs/
(cd $P/hf && npx -y hyperframes@0.9.6 check && npx -y hyperframes@0.9.6 render --quality looks -o ../video.mp4)
(cd $P/hf-sin-subs && npx -y hyperframes@0.9.6 render --quality looks -o ../video-sin-subtitulos.mp4)
```
Las marcas de sincronía están en `CUES` y `SFX_DEF` de build.mjs; el dibujo en `src/*.js` (lib, kit, w1..w4, main).
