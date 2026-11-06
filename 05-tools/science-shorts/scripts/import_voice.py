"""import_voice.py: use a voice-over that's already recorded (your own voice, say) instead of narrate.py
-> build/vo.wav + build/timing.json.

    PY import_voice.py --audio take.m4a [--words words.json] [--project P]

The take can be any audio file ffmpeg reads (wav, mp3, m4a from a phone). Read script.json's lines as written.
Without --words the word times come from faster-whisper (free, local). words.json, if you have it: a list (or
{"words": [...]}) of {"w": "cloud", "t0": 0.1, "t1": 0.4}. The words are matched to script.json's `say` lines (the same
text, any punctuation or number style), and the caption chunks come from the `|` marks in `say` as usual. Words the take
splits or spells differently ("500" for "five-hundred") are matched in order, and the times between matched words are
spread evenly. timing.json has the same format narrate.py writes, so plan.py, encode.py and check.py work unchanged.
"""
import argparse, difflib, json, os, re, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import env, ffmpeg, project, write_wav

FPS, SR = 30, 48000


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def cap_text(w):
    """The caption word as written (punctuation kept, quotes dropped), like narrate.py."""
    return w.strip().strip("\"'")


def load_audio(path):
    """Any audio file -> mono float32 at 48 kHz (decoded by ffmpeg)."""
    raw = subprocess.run([ffmpeg(), "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    if not raw:
        sys.exit("couldn't read %s (is it an audio file?)" % path)
    return np.frombuffer(raw, np.float32).copy()


def whisper_words(audio):
    """Word times from faster-whisper on the take (passed as a 16 kHz array, never a path)."""
    from faster_whisper import WhisperModel
    d = env()["whisper"]
    m = WhisperModel(d if os.path.exists(os.path.join(d, "model.bin")) else "base.en", device="cpu", compute_type="int8")
    x = np.interp(np.arange(int(len(audio) * 16000 / SR)) * SR / 16000, np.arange(len(audio)), audio).astype(np.float32)
    segs, _ = m.transcribe(x, language="en", word_timestamps=True, beam_size=5)
    return [{"w": w.word.strip(), "t0": w.start, "t1": w.end} for s in segs for w in s.words]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", "--wav", dest="wav", required=True)
    ap.add_argument("--words", default=None)
    ap.add_argument("--project", default=None)
    a = ap.parse_args()
    P = project()
    spec = json.load(open(os.path.join(P, "script.json"), encoding="utf-8"))
    audio = load_audio(a.wav)
    if a.words:
        took = json.load(open(a.words, encoding="utf-8"))
        took = took["words"] if isinstance(took, dict) else took
    else:
        took = whisper_words(audio)
        print("faster-whisper heard %d words" % len(took))
    total = round(np.ceil(len(audio) / SR * FPS) / FPS, 4)
    audio = np.pad(audio, (0, max(0, int(total * SR) - len(audio))))

    # the script's words, line by line, with the | chunk marks
    words, lines, marks = [], [], []
    for i, ln in enumerate(spec["lines"]):
        say = ln["say"]
        sw = say.replace("|", " | ").split()
        show = ln.get("show", "").replace("|", " ").split() or [w for w in sw if w != "|"]
        m, k = [], 0
        lw = []
        for tok in sw:
            if tok == "|":
                m.append(k); continue
            lw.append({"i": len(words) + len(lw), "line": i, "say": tok, "show": cap_text(show[k]) if k < len(show) else ""})
            k += 1
        marks.append([0] + m if m else [])
        words += lw
        lines.append({"i": i, "say": say.replace("|", " ").replace("  ", " ").strip(), "words": [w["i"] for w in lw]})

    # match the script's words to the take's words in order; times in between are spread evenly
    A = [norm(w["say"]) for w in words]
    B = [norm(w["w"]) for w in took]
    s = [None] * len(words); e = [None] * len(words)
    for blk in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        tag, i1, i2, j1, j2 = blk
        if tag == "equal":
            for k in range(i2 - i1):
                s[i1 + k], e[i1 + k] = took[j1 + k]["t0"], took[j1 + k]["t1"]
        elif tag == "replace" and i2 > i1 and j2 > j1:          # e.g. "five-hundred" heard as "500"
            t0, t1 = took[j1]["t0"], took[j2 - 1]["t1"]
            for k in range(i2 - i1):
                s[i1 + k] = t0 + (t1 - t0) * k / (i2 - i1)
                e[i1 + k] = t0 + (t1 - t0) * (k + 1) / (i2 - i1)
    known = [k for k in range(len(words)) if s[k] is not None]
    if not known:
        sys.exit("no word of the take matches script.json: is it the same script?")
    for k in range(len(words)):                       # unmatched words: between their matched neighbours
        if s[k] is None:
            prev = max([j for j in known if j < k], default=None)
            nxt = min([j for j in known if j > k], default=None)
            t0 = e[prev] if prev is not None else 0.0
            t1 = s[nxt] if nxt is not None else total
            gap = [j for j in range(len(words)) if (prev is None or j > prev) and (nxt is None or j < nxt)]
            n, idx = len(gap), gap.index(k)
            s[k], e[k] = t0 + (t1 - t0) * idx / n, t0 + (t1 - t0) * (idx + 1) / n
    matched = len(known)
    for k, w in enumerate(words):
        w["s"], w["e"] = round(s[k], 3), round(e[k], 3)
    for ln in lines:
        ws = [words[k] for k in ln["words"]]
        ln["start"], ln["end"] = ws[0]["s"], ws[-1]["e"]
    chunks = []
    for ln, m in zip(lines, marks):
        lw = [words[k] for k in ln["words"]]
        groups = [list(range(x, y)) for x, y in zip(m, m[1:] + [len(lw)])] if m else [list(range(len(lw)))]
        for grp in groups:
            ws = [lw[k] for k in grp]
            chunks.append({"i": len(chunks), "line": ln["i"], "words": [w["i"] for w in ws], "text": " ".join(w["show"] for w in ws if w["show"]),
                           "s": ws[0]["s"], "e": ws[-1]["e"]})
    for c, n in zip(chunks, chunks[1:]):
        c["e"] = round(min(n["s"], c["e"] + 0.5) if n["s"] - c["e"] > 0.9 else n["s"], 3)
    chunks[-1]["e"] = round(min(total, chunks[-1]["e"] + 0.5), 3)
    chunks[0]["s"] = 0.0
    wpm = round(len(words) / total * 60)
    timing = {"fps": FPS, "total": total, "engine": "import", "voice": os.path.basename(a.wav), "speed": 1.0,
              "words_n": len(words), "wpm": wpm, "lines": lines, "words": words, "chunks": chunks}
    os.makedirs(os.path.join(P, "build"), exist_ok=True)
    json.dump(timing, open(os.path.join(P, "build", "timing.json"), "w", encoding="utf-8"), indent=1)
    peak = float(np.abs(audio).max()) or 1.0
    write_wav(os.path.join(P, "build", "vo.wav"), (audio / peak * 0.89).astype(np.float32), SR)
    print("imported %s: %.2f s, %d words (%d matched to the take), %d wpm, %d caption chunks" % (a.wav, total, len(words), matched, wpm, len(chunks)))
    print("-> build/vo.wav, build/timing.json")


if __name__ == "__main__":
    main()
