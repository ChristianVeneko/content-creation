"""voice.py PART_DIR : lines.json -> narration.wav + timing.js (the time of every word, for captions and animation)
Each line has "text" (the caption form: "11:58 PM") and optionally "say" (the spoken form: "eleven fifty-eight P M").
Main voice: Kokoro-82M, a free open model that runs on this computer's CPU. Word times come from faster-whisper, also local.
If Kokoro can't run, it falls back by itself to edge-tts (a free online voice), then to the computer's own voice
(Windows SAPI, macOS say, Linux espeak-ng). Force one with "engine": "kokoro" | "edge" | "offline" in lines.json.
needs: pip install kokoro-onnx soundfile faster-whisper edge-tts imageio-ffmpeg numpy  (models download on the first run)"""
import asyncio, difflib, json, os, platform, re, shutil, subprocess, sys, tempfile, urllib.request, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); MODELS = os.path.join(HERE, "models")
KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"

def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
part = sys.argv[1]
spec = json.load(open(os.path.join(part, "lines.json"), encoding="utf-8"))
VOICE, SPEED = spec.get("voice", "am_michael"), float(spec.get("speed", 1.1))
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
    try:
        audio = np.frombuffer(raw, np.int16).astype(np.float32)[::3] / 32768      # 48 kHz -> 16 kHz
        segs, _ = whisper().transcribe(audio, language="en", word_timestamps=True, beam_size=1, initial_prompt=text)
        heard = [(w.word, w.start, w.end) for s in segs for w in s.words]
    except Exception as e:
        print("word timing fell back to an estimate:", e); return estimate(text, raw)
    sw = text.split(); times = [None] * len(sw)
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

async def speak(i, line):
    """one line -> (pcm at 48 kHz, word boundaries relative to that pcm)"""
    text, path = line.get("say", line["text"]).strip(), os.path.join(part, "vo", f"line{i:02d}")
    if engine == "kokoro":
        import soundfile as sf
        a, sr = kokoro().create(text, voice=line.get("voice", VOICE), speed=float(line.get("speed", SPEED)), lang="en-us")
        sf.write(path + ".wav", a, sr); raw = decode(path + ".wav"); return raw, align(text, raw)
    if engine == "edge":
        bounds = await edge(text, line.get("voice", VOICE), path + ".mp3"); return decode(path + ".mp3"), bounds
    offline(text, path + ".wav"); raw = decode(path + ".wav"); return raw, align(text, raw)

async def main():
    global engine
    order = {"kokoro": ["kokoro", "edge", "offline"], "edge": ["edge", "offline"], "offline": ["offline"]}[engine]
    for engine in order:
        try:
            lead = spec.get("lead", 0.15)
            pcm, cursor, out = bytearray(b"\0\0" * int(lead * SR)), lead, []
            for i, line in enumerate(spec["lines"]):
                raw, bounds = await speak(i, line)
                text = line["text"].strip()
                a = max(0.0, bounds[0][1] - 0.06)                             # trim the silence around each line
                b = min(len(raw) / 2 / SR, bounds[-1][1] + bounds[-1][2] + 0.15)
                raw = raw[int(a * SR) * 2:int(b * SR) * 2]; dur = len(raw) / 2 / SR
                if "say" in line:                                               # map the heard spoken words back onto the caption words
                    cw, sw = line["text"].split(), line["say"].split()
                    sb = bounds if len(bounds) == len(sw) else [(w, bounds[min(len(bounds) - 1, int(j * len(bounds) / len(sw)))][1], 0.2) for j, w in enumerate(sw)]
                    nb = []
                    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=[norm(w) for w in cw], b=[norm(w) for w in sw], autojunk=False).get_opcodes():
                        if op == "equal":
                            nb += [(clean(cw[i1 + k]), sb[j1 + k][1], sb[j1 + k][2]) for k in range(i2 - i1)]
                        elif i2 > i1:
                            js, je = (j1, j2) if j2 > j1 else (max(0, j1 - 1), j1)
                            st_, en_ = sb[js][1], sb[je - 1][1] + sb[je - 1][2]
                            for k in range(i2 - i1):
                                a_ = st_ + (en_ - st_) * k / (i2 - i1); nb.append((clean(cw[i1 + k]), a_, (en_ - st_) / (i2 - i1)))
                    bounds = nb
                words = []
                for btext, off, d in bounds:                                  # one boundary can hold several words
                    ws = btext.split() or [btext]
                    for j, w in enumerate(ws):
                        s = off - a + d * j / len(ws); e = off - a + d * (j + 1) / len(ws)
                        words.append({"w": w, "s": round(cursor + s, 3), "e": round(cursor + e, 3)})
                extra = {k: v for k, v in line.items() if k not in ("text", "pause", "speed")}
                out.append({"i": i, "text": text, "start": round(cursor, 3), "end": round(cursor + dur, 3), "words": words, **extra})
                pcm += raw; gap = float(line.get("pause", 0.25))
                pcm += b"\0\0" * int(gap * SR); cursor += dur + gap
                print(f"line {i:2d}  {cursor:6.2f} s  {len(words):2d} words  {text[:60]}")
            break
        except Exception as e:
            print(f"voice '{engine}' failed ({e}); trying the next one")
    else:
        sys.exit("no voice worked")
    with wave.open(os.path.join(part, "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    open(os.path.join(part, "timing.js"), "w", encoding="utf-8").write(
        "window.TIMING = " + json.dumps({"voice_end": round(cursor, 3), "engine": engine, "lines": out}) + ";\n")
    x = np.frombuffer(bytes(pcm), np.int16).astype(np.float32) / 32768        # every caption word must have voice under it
    bad = [w["w"] for l in out for w in l["words"] if np.sqrt(np.mean(x[max(0, int((w["s"] - 0.12) * SR)):int((w["s"] + 0.12) * SR)] ** 2)) < 0.004]
    print("caption check: OK" if not bad else f"CAPTION WARNING: no voice within 120 ms of: {', '.join(bad[:8])}")
    n = sum(len(l["words"]) for l in out)
    print(f"narration {cursor:.2f} s, {n} words, {n / cursor * 60:.0f} words per minute, voice: {engine}")

asyncio.run(main())
