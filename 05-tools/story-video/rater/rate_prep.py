"""rate_prep.py: get an episode ready for Claude to rate (the AI animation rater).

    python rate_prep.py episode.mp4                      -> rate_episode/ next to the video
    python rate_prep.py part02.mp4 --prev part01.mp4      also checks the cast against the previous part
    python rate_prep.py episode.mp4 --out my_folder

It writes, into the output folder:
    first_frame.jpg   frame 0 at full size (what the feed shows before anyone taps)
    feed_thumb.jpg    frame 0 at phone-feed size (360 px wide)
    hook.jpg          the first 3 seconds, one frame every 0.5 s
    sheet.jpg         the whole episode, one frame every 2 s (tile n = second 2n)
    ending.jpg        the last 6 seconds, one frame every 0.5 s
    prev_sheet.jpg    (with --prev) the previous part, one frame every 4 s
    metrics.json / metrics.md   length, size, pace, still stretches, loudness, speech, words
Then open Claude Code in that folder and paste RATER_PROMPT.md.

Free: needs numpy and ffmpeg (pip install numpy imageio-ffmpeg). Transcript and voice numbers need faster-whisper
(pip install faster-whisper); without it those lines are left out."""
import json, os, re, shutil, subprocess, sys
import numpy as np


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg not found: pip install imageio-ffmpeg")


FF = ffmpeg()


def run(args, text=True):
    return subprocess.run([FF, "-hide_banner"] + args, capture_output=True, text=text)


def info(path):
    e = run(["-i", path]).stderr
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", e)
    v = re.search(r"Video:.*?(\d{3,5})x(\d{3,5})", e)
    fps = re.search(r"([\d.]+) fps", e)
    return {"duration_s": round(int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)), 2),
            "width": int(v.group(1)), "height": int(v.group(2)), "fps": float(fps.group(1)) if fps else None,
            "has_audio": "Audio:" in e, "size_mb": round(os.path.getsize(path) / 1e6, 2)}


def tiles(path, out, start, every, count, width, cols):
    rows = max(1, -(-count // cols))
    vf = f"fps=1/{every},scale={width}:-2,tile={cols}x{rows}:padding=4:color=white"
    run(["-y", "-loglevel", "error", "-ss", f"{max(0, start):.2f}", "-i", path, "-vf", vf, "-frames:v", "1", out])


def motion(path):
    """mean frame-to-frame change at 10 fps on a small grey copy: cuts, motion, still stretches"""
    w, h = 54, 96
    raw = subprocess.run([FF, "-loglevel", "error", "-i", path, "-vf", f"fps=10,scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))           # 0..255
    t = (np.arange(len(d)) + 1) / 10
    cuts = t[d > 14].tolist()
    merged = []
    for c in cuts:                                              # one cut = one event, even if it spans 2 frames
        if not merged or c - merged[-1] > 0.25: merged.append(round(c, 1))
    still = d < 0.35                                            # nothing visibly changes, captions included
    runs, start = [], None
    for i, s in enumerate(np.append(still, False)):
        if s and start is None: start = i
        if not s and start is not None:
            if (i - start) / 10 >= 1.5: runs.append([round(start / 10, 1), round((i - start) / 10, 1)])
            start = None
    dur = len(f) / 10
    per10 = [sum(1 for c in merged if k <= c < k + 10) for k in range(0, int(dur), 10)]
    return {"cuts": len(merged), "cut_times_s": merged, "cuts_per_10s": round(len(merged) / max(dur, 1) * 10, 2),
            "cuts_in_each_10s": per10, "seconds_with_motion_pct": round(100 * float((d > 1.0).mean()), 1),
            "still_stretches_over_1.5s": runs, "longest_still_s": max([r[1] for r in runs], default=0.0)}


def audio(path):
    a = {}
    e = run(["-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", e)
    p = re.findall(r"Peak:\s+(-?[\d.inf]+) dBFS", e)
    a["loudness_lufs"] = float(i[-1]) if i else None
    a["true_peak_dbfs"] = float(p[-1]) if p and p[-1] not in ("-inf", "inf") else None
    e = run(["-i", path, "-af", "silencedetect=noise=-40dB:d=0.4", "-f", "null", "-"]).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", e)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", e)]
    a["silent_gaps_over_0.4s"] = len(starts)
    a["first_sound_s"] = round(ends[0], 2) if starts and starts[0] <= 0.05 and ends else 0.0
    return a


def transcript(path):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return {"transcript": "not available (pip install faster-whisper to add it)"}
    raw = subprocess.run([FF, "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    m = WhisperModel("base.en", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(x, language="en", word_timestamps=True, beam_size=1)
    segs = list(segs)
    words = [w for s in segs for w in s.words]
    if not words:
        return {"transcript": "", "words": 0, "speech_note": "no speech found: the episode has no voice"}
    dur = len(x) / 16000
    text = "".join(w.word for w in words).strip()
    first2 = "".join(w.word for w in words if w.start < 2.0).strip()
    tail = "".join(w.word for w in words if w.start > words[-1].end - 6).strip()
    return {"transcript": text, "words": len(words), "words_per_minute": round(len(words) / (words[-1].end - words[0].start) * 60),
            "first_word_s": round(words[0].start, 2), "spoken_in_first_2s": first2, "last_6s_spoken": tail,
            "voice_end_s": round(words[-1].end, 2), "seconds_after_voice": round(dur - words[-1].end, 2),
            "clarity_mean_word_prob": round(float(np.mean([w.probability for w in words])), 3),
            "transcript_timed": [f"[{s.start:5.1f} s] {s.text.strip()}" for s in segs]}


def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    src = os.path.abspath(a[0])
    out = a[a.index("--out") + 1] if "--out" in a else os.path.join(os.path.dirname(src), "rate_" + os.path.splitext(os.path.basename(src))[0])
    prev = os.path.abspath(a[a.index("--prev") + 1]) if "--prev" in a else None
    os.makedirs(out, exist_ok=True)
    m = {"file": os.path.basename(src)}
    m.update(info(src))
    dur = m["duration_s"]
    # a fade in from black that's over within 1 s isn't what the viewer sees: rate the first lit frame instead
    raw = subprocess.run([FF, "-loglevel", "error", "-t", "1.0", "-i", src, "-vf", "fps=30,scale=54:96,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    lum = np.frombuffer(raw, np.uint8).reshape(-1, 96 * 54).astype(np.float32).mean(axis=1)
    peak = float(lum.max()) if len(lum) else 0.0
    faded = peak > 12 and lum[0] < 0.5 * peak                    # it starts dark and brightens within 1 s
    t0 = int(np.argmax(lum >= 0.9 * peak)) / 30 if faded else 0.0
    m["first_lit_frame_s"] = round(t0, 2)
    if t0 > 0: m["note_first_frame"] = f"the video fades in from black for {t0:.2f} s; first_frame.jpg is the first lit frame"
    run(["-y", "-loglevel", "error", "-ss", f"{t0:.3f}", "-i", src, "-frames:v", "1", "-q:v", "2", os.path.join(out, "first_frame.jpg")])
    run(["-y", "-loglevel", "error", "-ss", f"{t0:.3f}", "-i", src, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "3", os.path.join(out, "feed_thumb.jpg")])
    tiles(src, os.path.join(out, "hook.jpg"), 0, 0.5, 6, 270, 6)
    tiles(src, os.path.join(out, "sheet.jpg"), 0, 2, int(dur // 2) + 1, 180, 8)
    tiles(src, os.path.join(out, "ending.jpg"), dur - 6, 0.5, 12, 200, 6)
    if prev:
        pdur = info(prev)["duration_s"]
        tiles(prev, os.path.join(out, "prev_sheet.jpg"), 0, 4, int(pdur // 4) + 1, 160, 8)
        m["previous_part"] = os.path.basename(prev)
    m.update(motion(src))
    if m["has_audio"]:
        m.update(audio(src))
        m.update(transcript(src))
    else:
        m["speech_note"] = "the file has no audio track"
    json.dump(m, open(os.path.join(out, "metrics.json"), "w", encoding="utf-8"), indent=1)
    lines = [f"# metrics: {m['file']}", ""] + [f"- **{k}**: {v}" for k, v in m.items() if k not in ("file", "transcript_timed")]
    if m.get("transcript_timed"):
        lines += ["", "## transcript, timed (faster-whisper; small mishearings are possible)", ""] + m["transcript_timed"]
    open(os.path.join(out, "metrics.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"ready: {out}\nnow ask Claude Code to rate it with RATER_PROMPT.md")


if __name__ == "__main__":
    main()
