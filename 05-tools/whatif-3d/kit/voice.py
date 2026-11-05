"""voice.py STORY_DIR : script.json -> narration.wav + timing.json (the time of every word, for captions and animation)
Main voice: Kokoro-82M am_michael, a free open model that runs on this computer's CPU. Word times come from faster-whisper.
Only if Kokoro can't run: edge-tts (free online voice), then the computer's own voice. Force one with "engine" in script.json.
needs: pip install kokoro-onnx soundfile faster-whisper edge-tts imageio-ffmpeg numpy"""
import asyncio, difflib, json, os, platform, re, shutil, subprocess, sys, tempfile, urllib.request, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); MODELS = os.path.join(os.path.dirname(HERE), "assets", "voice")
KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"

def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
part = sys.argv[1]
spec = json.load(open(os.path.join(part, "script.json"), encoding="utf-8"))
VOICE, SPEED = spec.get("voice", "am_michael"), float(spec.get("speed", 1.15))
engine = os.environ.get("VOICE_ENGINE", spec.get("engine", "kokoro"))
os.makedirs(os.path.join(part, "vo"), exist_ok=True); os.makedirs(MODELS, exist_ok=True)

def decode(path):
    return subprocess.run([FF, "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout

_k = _w = None
def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
            p = os.path.join(MODELS, n)
            if not os.path.exists(p):
                print("downloading", n, "(once)"); urllib.request.urlretrieve(KOKORO_URL + n, p + ".part"); os.replace(p + ".part", p)
        _k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    return _k

def whisper():
    global _w
    if _w is None:
        from faster_whisper import WhisperModel, download_model
        d = os.path.join(MODELS, "whisper-base.en")
        if not os.path.exists(os.path.join(d, "model.bin")): print("downloading the timing model (once)"); download_model("base.en", output_dir=d)
        _w = WhisperModel(d, device="cpu", compute_type="int8")
    return _w

def norm(w): return re.sub(r"[^a-z0-9]", "", w.lower())
def clean(w): return w.strip(".,!?;\"()[]").rstrip(".")

def estimate(text, raw):
    """word times in proportion to word length, inside the voiced part of the line"""
    x = np.abs(np.frombuffer(raw, np.int16).astype(np.float32)); loud = np.where(x > 600)[0]
    a, b = (loud[0] / SR, loud[-1] / SR) if len(loud) else (0, len(x) / SR)
    ws = text.split(); k = [len(w) + 2 for w in ws]; tot = sum(k); out, t = [], a
    for w, n in zip(ws, k):
        d = (b - a) * n / tot; out.append((clean(w), t, d * 0.9)); t += d
    return out

def align(text, raw):
    """word times from faster-whisper, matched back to the script's own words"""
    sw = text.split()

    def score(heard):        # matched script words whose times are real (rising, non-zero length)
        sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(h[0]) for h in heard], autojunk=False)
        good, last = 0, -1.0
        for a, b, n in sm.get_matching_blocks():
            for j in range(n):
                s, e = heard[b + j][1], heard[b + j][2]
                if s > last + 0.01 and e - s > 0.02: good += 1
                last = max(last, s)
        return good
    try:
        audio = np.frombuffer(raw, np.int16).astype(np.float32)[::3] / 32768      # 48 kHz -> 16 kHz
        best = None
        for prompt in (text, None):     # the prompt helps spelling but sometimes makes whisper skip or stack words
            segs, _ = whisper().transcribe(audio, language="en", word_timestamps=True, beam_size=1, initial_prompt=prompt)
            heard = [(w.word, w.start, w.end) for s in segs for w in s.words]
            if best is None or score(heard) > score(best): best = heard
            if score(best) >= len(sw) - 1: break
        heard = best
    except Exception as e:
        print("word timing fell back to an estimate:", e); return estimate(text, raw)
    times = [None] * len(sw)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(h[0]) for h in heard], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for j in range(n): times[a + j] = (heard[b + j][1], heard[b + j][2])
    if not any(times): return estimate(text, raw)
    end = len(raw) / 2 / SR
    i = 0
    while i < len(sw):                                   # words whisper didn't match: share the gap by length
        if times[i] is None:
            j = i
            while j < len(sw) and times[j] is None: j += 1
            t0 = times[i - 1][1] if i > 0 else max(0.0, (times[j][0] if j < len(sw) else end) - 0.3 * (j - i))
            t1 = times[j][0] if j < len(sw) else min(end, t0 + 0.35 * (j - i))
            k = [len(w) + 2 for w in sw[i:j]]; tot = sum(k); t = t0
            for m, n in zip(range(i, j), k):
                d = (t1 - t0) * n / tot; times[m] = (t, t + d); t += d
            i = j
        else: i += 1
    for k in range(len(sw) - 1):                         # a zero-length word stacked on the next one: share the next word's span
        (s0, e0), (s1, e1) = times[k], times[k + 1]
        if s1 - s0 < 0.04 and e1 > s0 + 0.1:
            cut = s0 + (e1 - s0) * (len(sw[k]) + 1) / (len(sw[k]) + len(sw[k + 1]) + 2)
            times[k] = (s0, cut); times[k + 1] = (cut, e1)
    return [(clean(w), s, max(0.05, e - s)) for w, (s, e) in zip(sw, times)]

async def edge(text, voice, path):
    import edge_tts
    if re.match(r"^[ab][fm]_", voice): voice = "en-US-AvaNeural" if voice[1] == "f" else "en-US-AndrewNeural"
    for attempt in range(3):
        try:
            words, audio = [], bytearray()
            async for ch in edge_tts.Communicate(text, voice, rate="+5%", boundary="WordBoundary").stream():
                if ch["type"] == "audio": audio += ch["data"]
                elif ch["type"] == "WordBoundary": words.append((ch["text"], ch["offset"] / 1e7, ch["duration"] / 1e7))
            if not audio or not words: raise RuntimeError("empty answer")
            open(path, "wb").write(audio); return words
        except Exception as e:
            print("edge-tts retry", attempt + 1, e); await asyncio.sleep(2 + attempt * 2)
    raise RuntimeError("edge-tts is not answering")

def offline(text, path):
    tmp = tempfile.mkdtemp(); txt = os.path.join(tmp, "line.txt"); open(txt, "w", encoding="utf-8").write(text)
    if platform.system() == "Windows":
        ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; "
              f"$s.SetOutputToWaveFile('{path}'); $s.Speak([IO.File]::ReadAllText('{txt}')); $s.Dispose()")
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    elif platform.system() == "Darwin": subprocess.run(["say", "-f", txt, "-o", path, "--data-format=LEI16@22050"], check=True)
    else: subprocess.run(["espeak-ng", "-f", txt, "-w", path], check=True)

def eleven(text, path, voice, speed):
    """ElevenLabs with character timestamps -> word bounds (no whisper needed). Key: ELEVENLABS_API_KEY."""
    import base64
    key = os.environ["ELEVENLABS_API_KEY"]
    body = json.dumps({"text": text, "model_id": spec.get("model", "eleven_multilingual_v2"),
                       "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True,
                                          "speed": max(0.7, min(1.2, speed))}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
                                 data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=180))
    open(path, "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]; ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur, s0, e0 = [], "", None, None
    for c, a, b in zip(ch, st, en):
        if c.isspace():
            if cur: words.append((clean(cur), s0, e0 - s0))
            cur, s0 = "", None
        else:
            if s0 is None: s0 = a
            cur += c; e0 = b
    if cur: words.append((clean(cur), s0, e0 - s0))
    return words

async def speak(i, line):
    """one line -> (pcm at 48 kHz, word boundaries relative to that pcm)"""
    text, path = line["text"].strip(), os.path.join(part, "vo", f"line{i:02d}")
    if engine == "kokoro":
        import soundfile as sf
        a, sr = kokoro().create(text, voice=line.get("voice", VOICE), speed=float(line.get("speed", SPEED)), lang="en-us")
        sf.write(path + ".wav", a, sr); raw = decode(path + ".wav"); return raw, align(text, raw)
    if engine == "elevenlabs":
        bounds = eleven(text, path + ".mp3", line.get("voice", VOICE), float(line.get("speed", SPEED))); return decode(path + ".mp3"), bounds
    if engine == "edge":
        bounds = await edge(text, line.get("voice", VOICE), path + ".mp3"); return decode(path + ".mp3"), bounds
    offline(text, path + ".wav"); raw = decode(path + ".wav"); return raw, align(text, raw)

async def main():
    global engine
    order = {"elevenlabs": ["elevenlabs"], "kokoro": ["kokoro", "edge", "offline"], "edge": ["edge", "offline"], "offline": ["offline"]}[engine]
    for engine in order:
        try:
            lead = spec.get("lead", 0.05)
            pcm, cursor, out = bytearray(b"\0\0" * int(lead * SR)), lead, []
            for i, line in enumerate(spec["lines"]):
                raw, bounds = await speak(i, line)
                text = line["text"].strip()
                # trim the silence around each line, but never into the voice: word times from whisper often end a
                # syllable early ("liner" -> "line"), so the cut follows the last audible sample, not the last word time
                pcm16 = np.abs(np.frombuffer(raw, np.int16).astype(np.float32))
                voiced = np.where(pcm16 > 0.01 * 32768)[0]
                v0 = voiced[0] / SR if len(voiced) else 0.0
                v1 = voiced[-1] / SR if len(voiced) else len(raw) / 2 / SR
                a = max(0.0, min(bounds[0][1] - 0.06, v0 - 0.03))
                b = min(len(raw) / 2 / SR, max(bounds[-1][1] + bounds[-1][2] + 0.1, v1 + 0.05))
                raw = raw[int(a * SR) * 2:int(b * SR) * 2]; dur = len(raw) / 2 / SR
                words = []
                for btext, off, d in bounds:                                  # one boundary can hold several words
                    ws = btext.split() or [btext]
                    for j, w in enumerate(ws):
                        s = off - a + d * j / len(ws); e = off - a + d * (j + 1) / len(ws)
                        words.append({"w": w, "s": round(cursor + s, 3), "e": round(cursor + e, 3)})
                extra = {k: v for k, v in line.items() if k not in ("text", "pause", "speed")}
                out.append({"i": i, "text": text, "start": round(cursor, 3), "end": round(cursor + dur, 3), "words": words, **extra})
                pcm += raw; gap = float(line.get("pause", spec.get("pause", 0.12)))
                pcm += b"\0\0" * int(gap * SR); cursor += dur + gap
                print(f"line {i:2d}  {cursor:6.2f} s  {len(words):2d} words  {text[:60]}")
            break
        except Exception as e:
            print(f"voice '{engine}' failed ({e}); trying the next one")
    else:
        sys.exit("no voice worked")
    with wave.open(os.path.join(part, "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    json.dump({"voice_end": round(cursor, 3), "engine": engine, "voice": VOICE, "lines": out},
              open(os.path.join(part, "timing.json"), "w", encoding="utf-8"), indent=1)
    n = sum(len(l["words"]) for l in out)
    print(f"narration {cursor:.2f} s, {n} words, {n / cursor * 60:.0f} words per minute, voice: {engine}")

asyncio.run(main())
