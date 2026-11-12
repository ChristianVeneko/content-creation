#!/bin/sh
# Build the caricature film: assemble film.js, check the scenery rule, audio, music bed, picture, mix, master.
# Env: TRACK=<library id> (music), SKIP_VIDEO=1 (audio only).
set -e
F=$(cd "$(dirname "$0")" && pwd); R=$(cd "$F/../../.." && pwd)
cd "$R" && . ./env.sh >/dev/null 2>&1
K="$R/05-tools/caricature-stage"
python3 "$K/tools/assemble.py" "$F"
TOT=$("$LEMO_OPUSCAR_HOME/.venv/bin/python" "$F/audio.py")
node 05-tools/opuscar/core/post/engine_bed.mjs --narration "$F/voice.wav" --words "$F/voices_t/words.json" --timeline "$F/line-starts.json" --total "$TOT" --out "$F/music_bed.wav" --track "${TRACK:-incompetech-urban-gauntlet}" >/dev/null
ffmpeg -v error -y -i "$F/voice.wav" -i "$F/music_bed.wav" -i "$F/sfx.wav" -filter_complex "[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0[v];[1:a]aresample=48000[m];[2:a]aresample=48000[s];[v][m][s]amix=inputs=3:normalize=0,volume=-2dB,alimiter=limit=0.8:level=false[o]" -map "[o]" -ar 48000 "$F/mix.wav"
cd "$LEMO_OPUSCAR_HOME"
[ -n "$SKIP_VIDEO" ] || node core/render/video.mjs "$F" --fps 30 --workers 5 --size 1080x1920 | tail -1
sh core/render/mux.sh "$F/out/video.mp4" "$F/mix.wav" "$F/out/final.mp4" 30 2 | grep "I:\|Peak"
echo "total $TOT"
