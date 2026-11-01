"""Batch Kokoro TTS: loads the model once, then synthesizes every item.

stdin: {"model": str, "voice": str, "speed": float, "lang_code": str, "items": [{"text": str, "out": "/abs/prefix"}]}
Writes <out>.wav for each item and prints one JSON line per finished item: {"index": i, "file": path}.
"""
import json
import os
import sys

from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model


def main() -> None:
    job = json.load(sys.stdin)
    model = load_model(model_path=job["model"])
    for i, item in enumerate(job["items"]):
        generate_audio(
            text=item["text"],
            model=model,
            voice=job["voice"],
            speed=float(job.get("speed", 1.0)),
            lang_code=job["lang_code"],
            file_prefix=item["out"],
            audio_format="wav",
            join_audio=True,
            verbose=False,
        )
        path = f'{item["out"]}.wav'
        if not os.path.exists(path):
            print(json.dumps({"index": i, "error": f"Kokoro produced no audio for item {i}"}), flush=True)
            sys.exit(2)
        print(json.dumps({"index": i, "file": path}), flush=True)


if __name__ == "__main__":
    main()
