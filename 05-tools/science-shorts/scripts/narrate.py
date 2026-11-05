"""narrate.py: the voice-over and its timing, from script.json -> build/vo.wav + build/timing.json.

  PY narrate.py            read every line, join them with short gaps, time every word, cut the caption chunks
  PY narrate.py --force    read every line again (otherwise lines whose text and voice didn't change are reused)

script.json:
{
 "slug": "cloud_weight",
 "voice": "am_liam+am_puck", "speed": 1.0,        Kokoro (free, local): a voice name, or a mix "a+b" / "a:0.6+b:0.4"
 "gap": 0.22, "max_pause": 0.3, "tail": 0.8,      seconds between lines, the longest pause kept inside a line, after the last
 "lines": [ {"say": "This fluffy cloud | weighs as much as | a-hundred elephants.", "show": "... 100 ...", "pause": 0.2}, ... ]
}
- say = what the voice reads. Write every number as words, joined with hyphens so it stays one word: "five-hundred",
  "a-thousand" (the voice reads "1986" as "nineteen hundred eighty six").
- show (optional) = the caption words, ONE FOR EACH SPOKEN WORD, numbers as digits: "500", "1,000". Leave it out when the
  caption is the spoken text.
- pause (optional) = extra silence after the line (s), for a beat that needs to land.
- A "|" in say cuts the caption chunks by hand ("This fluffy cloud | weighs as much as | a-hundred elephants."): cut where
  the picture should change. Lines without "|" are cut automatically.
The voice starts at 0.05 s. timing.json has every word's time and the caption chunks: 2-4 words, cut at punctuation and
pauses, never one word alone. The pictures are planned against those words (plan.py).
"""
import difflib, hashlib, json, os, re, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import env, ffmpeg, project, read_wav, write_wav, FPS

P = project()
SPEC = json.load(open(os.path.join(P, "script.json"), encoding="utf-8"))
VO = os.path.join(P, "build", "vo")
SR = 48000
LEAD = 0.05


def norm(w):
    import unicodedata
    w = "".join(c for c in unicodedata.normalize("NFKD", w.lower()) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", w)


# ---------------- the engines ----------------
_kok = None


def kokoro_line(text, voice, speed):
    global _kok
    from kokoro_onnx import Kokoro
    if _kok is None:
        e = env(); _kok = Kokoro(e["kokoro_model"], e["kokoro_voices"])
    style = voice
    if "+" in voice:                                    # a blend of voices, equal parts unless weighted
        parts = [(p.split(":")[0], float(p.split(":")[1]) if ":" in p else 1.0) for p in voice.split("+")]
        tot = sum(w for _, w in parts)
        style = sum(_kok.get_voice_style(n) * (w / tot) for n, w in parts)
    a, sr = _kok.create(text, voice=style, speed=speed, lang="en-us")
    return np.asarray(a, np.float32), sr


def eleven_line(text, voice, speed, path):
    """ElevenLabs with character timestamps (any language, no whisper). Key: ELEVENLABS_API_KEY.
    Writes path (mp3) + path.json (word times) and returns (mono float32 at 48 kHz, [(s, e), ...] one per word)."""
    import base64, urllib.request
    if not os.path.exists(path) or not os.path.exists(path + ".json"):
        key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY is not set (load .env first)")
        body = json.dumps({"text": text, "model_id": SPEC.get("model", "eleven_multilingual_v2"),
                           "voice_settings": {"stability": float(SPEC.get("stability", 0.5)), "similarity_boost": 0.8,
                                              "style": float(SPEC.get("style", 0.2)), "use_speaker_boost": True,
                                              "speed": max(0.7, min(1.2, speed))}}).encode()
        req = urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/%s/with-timestamps?output_format=mp3_44100_128" % voice,
                                     data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
        d = json.load(urllib.request.urlopen(req, timeout=180))
        open(path, "wb").write(base64.b64decode(d["audio_base64"]))
        al = d["alignment"]; times, s0, e0 = [], None, None
        for c, a, b in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
            if c.isspace():
                if s0 is not None: times.append((s0, e0))
                s0 = None
            else:
                if s0 is None: s0 = a
                e0 = b
        if s0 is not None: times.append((s0, e0))
        json.dump(times, open(path + ".json", "w"))
    raw = subprocess.run([ffmpeg(), "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy(), [tuple(x) for x in json.load(open(path + ".json"))]


# ---------------- cleaning a line ----------------
def trim(a, sr, thr=0.012, keep=0.03):
    loud = np.where(np.abs(a) > thr)[0]
    if not len(loud):
        return a
    return a[max(0, loud[0] - int(keep * sr)): min(len(a), loud[-1] + int(keep * sr * 2))]


def squeeze(a, sr, max_pause, thr=0.01):
    """Shorten every pause inside the line to max_pause (Kokoro holds a full stop for up to a second)."""
    win = int(0.02 * sr); n = len(a) // win
    if n < 3:
        return a
    loud = np.array([np.abs(a[i * win:(i + 1) * win]).max() > thr for i in range(n)])
    keep, i = [], 0
    while i < n:
        if not loud[i]:
            j = i
            while j < n and not loud[j]:
                j += 1
            if 0 < i and j < n and (j - i) * win > max_pause * sr:
                k = int(max_pause * sr / win); keep += [a[i * win:(i + k // 2) * win], a[(j - (k - k // 2)) * win:j * win]]
            else:
                keep.append(a[i * win:j * win])
            i = j
        else:
            keep.append(a[i * win:(i + 1) * win]); i += 1
    keep.append(a[n * win:])
    return np.concatenate(keep)


def to48k(a, sr):
    if sr == SR:
        return a
    return np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a).astype(np.float32)


# ---------------- word times ----------------
_wh = None


def align(text, a):
    """Word times (s, inside the line) from faster-whisper, matched back to the script's own words."""
    global _wh
    from faster_whisper import WhisperModel
    if _wh is None:
        d = env()["whisper"]
        _wh = WhisperModel(d if os.path.exists(os.path.join(d, "model.bin")) else "base.en", device="cpu", compute_type="int8")
    sw = text.split()
    x = np.interp(np.arange(int(len(a) * 16000 / SR)) * SR / 16000, np.arange(len(a)), a).astype(np.float32)   # never hand whisper a path

    def heard(prompt):
        segs, _ = _wh.transcribe(x, language="en", word_timestamps=True, beam_size=5, initial_prompt=prompt)
        return [(w.word, w.start, w.end) for s in segs for w in s.words]

    def matched(h):
        sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(q[0]) for q in h], autojunk=False)
        return sum(n for _, _, n in sm.get_matching_blocks())
    best = None
    for prompt in (text, None):
        h = heard(prompt)
        if best is None or matched(h) > matched(best):
            best = h
        if matched(best) >= len(sw) - 1:
            break
    times = [None] * len(sw)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(q[0]) for q in best], autojunk=False)
    for i, j, n in sm.get_matching_blocks():
        for k in range(n):
            times[i + k] = (best[j + k][1], best[j + k][2])
    end = len(a) / SR
    if not any(times):
        times = [(end * k / len(sw), end * (k + 1) / len(sw)) for k in range(len(sw))]
    i = 0
    while i < len(sw):                      # unmatched words share the gap between their neighbours, by length
        if times[i] is None:
            j = i
            while j < len(sw) and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i > 0 else max(0.0, (times[j][0] if j < len(sw) else end) - 0.3 * (j - i))
            t1 = times[j][0] if j < len(sw) else min(end, t0 + 0.35 * (j - i))
            ks = [len(w) + 2 for w in sw[i:j]]; tot = sum(ks); tt = t0
            for m, kk in zip(range(i, j), ks):
                d = (t1 - t0) * kk / tot; times[m] = (tt, tt + d); tt += d
            i = j
        else:
            i += 1
    res, last = [], 0.0
    for s, e in times:                      # keep the times rising and inside the line
        s = max(s, last); res.append((s, min(max(e, s + 0.05), end))); last = s + 0.02
    return res, matched(best), [q[0].strip() for q in best]


# ---------------- caption chunks ----------------
def cap_text(w):
    """The caption word as written (the format keeps its punctuation: "lethal:", "cells.", "droughts,"); quotes dropped."""
    return re.sub(r'["“”]', "", w)


WEAK = set("a an the of to in into onto on at by for from with about over under and but or so as than his her its their our your my".split())


def chunk_line(words):
    """Cut a line into 2-4 word chunks with the lowest cost: 3 words is best; never end a chunk on a weak word (the, of, with...)
    or split a name ("World Cup"); end chunks at punctuation and pauses; one word alone only when the line is one word."""
    n = len(words)
    if n <= 1:
        return [list(range(n))]
    cap = lambda w: w[:1].isupper()

    def cost(i, j):                        # the chunk words[i..j]
        k = j - i + 1
        if k > 4:
            return 1e9
        c = {1: 8.0, 2: 0.8, 3: 0.0, 4: 0.4}[k]
        for m in range(i, j):              # punctuation inside the chunk should have ended it
            if re.search(r"[.,;:!?]$", words[m]["say"]):
                c += 3.0
        if j < n - 1:
            w, nx = words[j]["say"], words[j + 1]["say"]
            punct = bool(re.search(r"[.,;:!?]$", w))
            if punct:
                c -= 0.8
            elif norm(w) in WEAK:
                c += 3.0
            if not punct and cap(w) and cap(nx) and j > 0:
                c += 3.0
            if words[j + 1]["s"] - words[j]["e"] > 0.22:
                c -= 0.6
        if words[j]["e"] - words[i]["s"] > 1.9:
            c += 1.0
        return c
    best, back = [0.0] + [1e18] * n, [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(max(0, j - 4), j):
            v = best[i] + cost(i, j - 1)
            if v < best[j]:
                best[j], back[j] = v, i
    out, j = [], n
    while j > 0:
        out.append(list(range(back[j], j))); j = back[j]
    return out[::-1]


# ---------------- main ----------------
def main():
    os.makedirs(VO, exist_ok=True)
    eng = SPEC.get("engine", "kokoro")
    voice, speed = SPEC.get("voice", "am_liam+am_puck"), float(SPEC.get("speed", 1.0))
    gap, max_pause, tail = float(SPEC.get("gap", 0.22)), float(SPEC.get("max_pause", 0.3)), float(SPEC.get("tail", 0.8))
    cache = os.path.join(VO, "cache.json")
    old = json.load(open(cache)) if os.path.exists(cache) else {}
    new, fails, warns = {}, [], []
    pcm, t = [np.zeros(int(LEAD * SR), np.float32)], LEAD
    lines, words = [], []
    marks = []                              # per line: the word indices where a hand-cut chunk starts
    for i, ln in enumerate(SPEC["lines"]):
        parts = [p.split() for p in ln["say"].split("|")]
        marks.append([sum(len(p) for p in parts[:k]) for k in range(len(parts))] if len(parts) > 1 else None)
        say = " ".join(w for p in parts for w in p)
        if re.search(r"\d", say):
            fails.append("line %d says digits (%s): write numbers as words joined with hyphens (nineteen-eighty-six) and put the digits in show"
                         % (i, ", ".join(re.findall(r"\S*\d\S*", say))))
        key = hashlib.sha1(json.dumps([eng, voice, speed, say]).encode()).hexdigest()
        src = os.path.join(VO, "line_%d.%s" % (i, "mp3" if eng == "elevenlabs" else "wav"))
        fresh = "--force" in sys.argv or old.get(str(i)) != key or not os.path.exists(src)
        if eng == "elevenlabs":
            if fresh:
                for f in (src, src + ".json"):
                    if os.path.exists(f): os.remove(f)
            a, et = eleven_line(say, voice, speed, src)
            loud = np.where(np.abs(a) > 0.012)[0]       # trim the silence around the line, shift the word times with it
            a0 = max(0, (loud[0] if len(loud) else 0) - int(0.03 * SR))
            a1 = min(len(a), (loud[-1] if len(loud) else len(a)) + int(0.06 * SR))
            a = a[a0:a1]
            sw = say.split()
            if len(et) != len(sw):
                fails.append("line %d: ElevenLabs gave %d word times for %d words" % (i, len(et), len(sw)))
                et = (et + [et[-1]] * len(sw))[: len(sw)]
            times = [(max(0.0, s_ - a0 / SR), min(len(a) / SR, e_ - a0 / SR)) for s_, e_ in et]
            got, heard = len(sw), sw
        else:
            if fresh:
                ka, ksr = kokoro_line(say, voice, speed)
                write_wav(src, ka, ksr)
            a, sr = read_wav(src)
            a = to48k(squeeze(trim(a, sr), sr, max_pause), sr)
        new[str(i)] = key
        if i > 0:
            g = gap + float(SPEC["lines"][i - 1].get("pause", 0))
            pcm.append(np.zeros(int(g * SR), np.float32)); t += g
        if eng != "elevenlabs":
            times, got, heard = align(say, a)
        sw = say.split()
        show = ln.get("show", "").replace("|", " ").split() or sw
        if len(show) != len(sw):
            fails.append("line %d: show has %d words but say has %d. Give one caption word per spoken word." % (i, len(show), len(sw)))
            show = (show + [""] * len(sw))[: len(sw)]
        if got < len(sw) - 1:
            print("  line %d: whisper heard \"%s\" (matched %d of %d words; the times between them are estimated)" % (i, " ".join(heard), got, len(sw)))
        lw = []
        for k, (s, e) in enumerate(times):
            w = {"i": len(words), "line": i, "say": sw[k], "show": cap_text(show[k]), "s": round(t + s, 3), "e": round(t + e, 3)}
            lw.append(w); words.append(w)
        lines.append({"i": i, "say": say, "start": round(t, 3), "end": round(t + len(a) / SR, 3), "words": [w["i"] for w in lw]})
        pcm.append(a); t += len(a) / SR
        print("  line %2d  %5.2f-%5.2f  %s" % (i, lines[-1]["start"], lines[-1]["end"], say))
    pcm.append(np.zeros(int(tail * SR), np.float32))
    vo = np.concatenate(pcm)
    vo = vo / (float(np.abs(vo).max()) or 1.0) * 0.89
    total = round(np.ceil(len(vo) / SR * FPS) / FPS, 4)
    vo = np.pad(vo, (0, int(total * SR) - len(vo)))
    # caption chunks, each shown from its first word until the next chunk starts (held at most 0.5 s past its last word)
    chunks = []
    for ln in lines:
        lw = [words[k] for k in ln["words"]]
        m = marks[ln["i"]]
        groups = [list(range(a, b)) for a, b in zip(m, m[1:] + [len(lw)])] if m else chunk_line(lw)
        for g in groups:
            ws = [lw[k] for k in g]
            chunks.append({"i": len(chunks), "line": ln["i"], "words": [w["i"] for w in ws], "text": " ".join(w["show"] for w in ws if w["show"]),
                           "s": ws[0]["s"], "e": ws[-1]["e"]})
    for c, n in zip(chunks, chunks[1:]):
        c["e"] = round(min(n["s"], c["e"] + 0.5) if n["s"] - c["e"] > 0.9 else n["s"], 3)
    if chunks:
        chunks[-1]["e"] = round(min(total, chunks[-1]["e"] + 0.5), 3)
        chunks[0]["s"] = 0.0
    wpm = round(len(words) / total * 60)    # words over the whole length, the way the references' pace was measured
    timing = {"fps": FPS, "total": total, "engine": eng, "voice": voice, "speed": speed,
              "words_n": len(words), "wpm": wpm, "lines": lines, "words": words, "chunks": chunks}
    os.makedirs(os.path.join(P, "build"), exist_ok=True)
    json.dump(timing, open(os.path.join(P, "build", "timing.json"), "w", encoding="utf-8"), indent=1)
    write_wav(os.path.join(P, "build", "vo.wav"), vo, SR)
    json.dump(new, open(cache, "w"))
    long = [c for c in chunks if c["e"] - c["s"] > 2.0]
    for ln in lines:
        print("  chunks %2d: %s" % (ln["i"], " | ".join(c["text"] for c in chunks if c["line"] == ln["i"])))
    print("%s voice (%s): %.1f s, %d words, %d words a minute, %d caption chunks" % (eng, timing["voice"], total, len(words), wpm, len(chunks)))
    if not 45 <= total <= 80: warns.append("length %.1f s: the format runs 45-80 s (the references: 67-78 s)" % total)
    if not 160 <= wpm <= 185: warns.append("%d words a minute: aim for 165-180 (cut words, or change gap / speed)" % wpm)
    if long: warns.append("chunks held over 2 s (the picture needs something new): %s" % ", ".join('%d "%s"' % (c["i"], c["text"]) for c in long[:6]))
    print("-> build/vo.wav, build/timing.json")
    for w in warns:
        print("WARN:", w)
    if fails:
        print("\nFAIL:\n  " + "\n  ".join(fails))
        sys.exit(1)


if __name__ == "__main__":
    main()
