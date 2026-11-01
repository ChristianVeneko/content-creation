"""Word-level transcription with mlx-whisper (Apple Silicon only, model cached inside the repo).

Usage: python transcribe.py input.(mp4|wav) [--lang es] [--model mlx-community/whisper-large-v3-turbo]
Writes <input>.words.json ([{word,start,end}]), <input>.json (Remotion Caption[]) and <input>.srt next to the input.
"""
import argparse, json, pathlib
import mlx_whisper

def srt_time(t: float) -> str:
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3_600_000); m, ms = divmod(ms, 60_000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input"); ap.add_argument("--lang", default="es")
    ap.add_argument("--model", default="mlx-community/whisper-large-v3-turbo")
    a = ap.parse_args()
    res = mlx_whisper.transcribe(a.input, path_or_hf_repo=a.model, language=a.lang, word_timestamps=True)
    words = [{"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
             for seg in res["segments"] for w in seg.get("words", []) if w["word"].strip()]
    base = pathlib.Path(a.input).with_suffix("")
    pathlib.Path(f"{base}.words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1))
    # Remotion @remotion/captions Caption[] format (same shape as the 07-studio/engine captions)
    captions = [{"text": (" " if i else "") + w["word"], "startMs": int(w["start"] * 1000), "endMs": int(w["end"] * 1000),
                 "timestampMs": int((w["start"] + w["end"]) * 500), "confidence": None} for i, w in enumerate(words)]
    pathlib.Path(f"{base}.json").write_text(json.dumps(captions, ensure_ascii=False))
    srt = [f"{i}\n{srt_time(s['start'])} --> {srt_time(s['end'])}\n{s['text'].strip()}\n"
           for i, s in enumerate(res["segments"], 1)]
    pathlib.Path(f"{base}.srt").write_text("\n".join(srt))
    print(f"{len(words)} words -> {base}.words.json, {base}.json, {base}.srt")

if __name__ == "__main__":
    main()
