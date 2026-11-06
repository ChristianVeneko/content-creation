"""check.py: the QA pass before a Short is called done -> qa/report.md and the pictures to look at.

  PY check.py

Writes:
  qa/sheet_1.jpg, qa/sheet_2.jpg ...  a frame every 0.5 s from the finished 9:16 video (captions burned in), 12 tiles a sheet,
                                      each labelled with its time and the caption that should be on it. Open EVERY sheet
                                      and judge every tile (SKILL.md step 7).
  qa/consec_<t>.jpg                   5 consecutive frames around each flicker candidate, unplanned jump and frozen stretch
  qa/zfight.jpg                       where pixels flip back and forth from frame to frame (z-fighting, crawling textures)
  qa/report.md                        the PASS / LOOK / FAIL table
Checks:
  files       both cuts: size, dimensions, 30 fps, length, yuv420p, the X cut under 10 MB
  loudness    the master at lufs.master (-12) +-1, the X cut at lufs.x (-14) +-1, true peak <= -1 dBFS
  story       45-80 s, 130-230 words, 160-185 words a minute, the voice starting by 0.1 s, line 1 a short claim (12 words or
              fewer) with a title card
  captions    every chunk 2-4 words, none held over 2 s
  pictures    dark frames, single-frame flicker, unplanned jumps (planned ones are in plan.cuts), z-fighting,
              nothing frozen for more than 1 s, a new picture for every caption chunk
"""
import glob, json, os, re, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import env, ffmpeg, project, W, H, X_SIZE

P = project()
B, QA = os.path.join(P, "build"), os.path.join(P, "qa")
PLAN = json.load(open(os.path.join(B, "plan.json"), encoding="utf-8"))
TM = json.load(open(os.path.join(B, "timing.json"), encoding="utf-8"))
FPS, TOTAL, SLUG = PLAN["fps"], PLAN["total"], PLAN["slug"]
CUTS = [(float(c[0]), float(c[1])) if isinstance(c, list) else (float(c), float(c)) for c in PLAN.get("cuts", [])]
LUFS = PLAN.get("lufs", {"master": -12, "x": -14})
frames = sorted(glob.glob(os.path.join(B, "frames", "f*.*")))
if not frames:
    sys.exit("no frames in build/frames: render first")
os.makedirs(QA, exist_ok=True)
for f in glob.glob(os.path.join(QA, "sheet_*.jpg")) + glob.glob(os.path.join(QA, "consec_*.jpg")):
    os.remove(f)
rows = []
row = lambda name, state, detail: rows.append((name, state, detail))


# ---------------- the files ----------------
def probe(path):
    err = subprocess.run([ffmpeg(), "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err)
    v = re.search(r"Video: .*?, (\d{3,4})x(\d{3,4}).*?, ([\d.]+) fps", err)
    return (int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)) if d else 0,
            (int(v.group(1)), int(v.group(2))) if v else None, float(v.group(3)) if v else 0, "yuv420p" in err)


def loudness(path):
    err = subprocess.run([ffmpeg(), "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    s = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", s); tp = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s)
    return float(i.group(1)) if i else None, float(tp.group(1)) if tp and tp.group(1) != "-inf" else None


master = os.path.join(P, "out", SLUG + "_9x16.mp4")
for path, size, cap, target in ((master, (W, H), None, LUFS["master"]), (os.path.join(P, "out", SLUG + "_x_7x8.mp4"), X_SIZE, 10.0, LUFS["x"])):
    name = os.path.basename(path)
    if not os.path.exists(path):
        row(name, "FAIL", "missing: run encode.py"); continue
    dur, dims, fps, yuv = probe(path)
    mb = os.path.getsize(path) / 1024 / 1024
    ok = dims == size and abs(fps - FPS) < 0.01 and abs(dur - TOTAL) < 0.2 and yuv and (cap is None or mb < cap)
    row(name, "PASS" if ok else "FAIL", "%sx%s, %g fps, %.2f s, %.2f MB%s%s" % (dims[0] if dims else "?", dims[1] if dims else "?", fps, dur, mb,
        "" if yuv else ", not yuv420p", " (cap %g MB)" % cap if cap else ""))
    lu, tp = loudness(path)
    ok = lu is not None and abs(lu - target) <= 1.0 and tp is not None and tp <= -1.0
    row(name + " loudness", "PASS" if ok else "FAIL", "%s LUFS, true peak %s dBFS (want %g +-1, peak <= -1)" % (lu, tp, target))

# ---------------- the story and the captions ----------------
words, chunks, lines = TM["words"], TM["chunks"], TM["lines"]
wpm = len(words) / TOTAL * 60
ok = 45 <= TOTAL <= 80 and 130 <= len(words) <= 230 and 160 <= wpm <= 185
row("length and pace", "PASS" if ok else "LOOK", "%.1f s, %d words, %.0f words a minute (the format: 45-80 s, 130-230 words, 165-180 wpm)" % (TOTAL, len(words), wpm))
n1 = len(lines[0]["say"].replace("|", " ").split()) if lines else 0
row("line 1", "PASS" if n1 <= 12 and words[0]["s"] <= 0.1 and PLAN.get("title") else "LOOK",
    'starts at %.2f s, %d words: "%s"; title card: %s (the format opens on a short claim, said over the title, from 0.0 s)'
    % (words[0]["s"] if words else 0, n1, lines[0]["say"].replace("| ", "")[:70] if lines else "", " / ".join(PLAN.get("title") or []) or "none"))
bad = [c for c in chunks if not 2 <= len(c["words"]) <= 4 and len(lines[c["line"]]["words"]) > 1]
held = [c for c in chunks if c["e"] - c["s"] > 2.0]
# 1 or 5 words can read fine (a single dramatic word, a short phrase kept whole): LOOK and say why in qa/tiles.md.
# 6+ words is too much to read in a caption's time: FAIL.
toolong = [c for c in bad if len(c["words"]) >= 6]
row("caption chunks", "PASS" if not bad and not held else ("FAIL" if toolong else "LOOK"),
    "%d chunks%s%s" % (len(chunks), "; not 2-4 words: " + ", ".join('"%s"' % c["text"] for c in bad[:5]) if bad else "",
                        "; held over 2 s: " + ", ".join('"%s" %.1f s' % (c["text"], c["e"] - c["s"]) for c in held[:5]) if held else ""))

# ---------------- the pictures (the renderer's frames, before captions) ----------------
print("reading", len(frames), "frames")
A = np.stack([np.asarray(Image.open(f).convert("L").resize((180, 320), Image.BILINEAR), np.float32) for f in frames])
n = len(A)
row("frame count", "PASS" if n == PLAN["frames"] else "FAIL", "%d frames, the plan has %d" % (n, PLAN["frames"]))
lum = A.mean(axis=(1, 2))
dark = [round(i / FPS, 2) for i, l in enumerate(lum) if l < 18]
row("dark frames", "PASS" if not dark else "LOOK", "none" if not dark else "near black at %s s (fine only if planned)" % dark[:12])
near_cut = lambda t: any(a - 1.5 / FPS <= t <= b + 1.5 / FPS for a, b in CUTS)
diff = np.abs(np.diff(A, axis=0)).mean(axis=(1, 2))
med = float(np.median(diff))
skip = np.abs(A[2:] - A[:-2]).mean(axis=(1, 2))
flick = np.minimum(diff[:-1], diff[1:]) - skip
fl = sorted([(round((i + 1) / FPS, 2), round(float(s), 1)) for i, s in enumerate(flick) if s > max(4.0, 2.5 * med) and not near_cut((i + 1) / FPS)], key=lambda x: -x[1])[:8]
row("single-frame flicker", "PASS" if not fl else ("FAIL" if fl[0][1] > 10 else "LOOK"), "none" if not fl else "a frame unlike both neighbours at (t, score) %s" % fl)
jumps = [(round((i + 1) / FPS, 2), round(float(d), 1)) for i, d in enumerate(diff) if d > max(14.0, 5 * med)]
unplanned = [j for j in jumps if not near_cut(j[0])]
row("big jumps", "PASS" if not unplanned else "LOOK", "%d at planned cuts; unplanned (t, size): %s" % (len(jumps) - len(unplanned), unplanned[:10] or "none"))
# nothing holds still: the longest run of frames that barely change
still, run, worst = 0.35, 0, (0, 0)
for i, d in enumerate(diff):
    run = run + 1 if d < still else 0
    if run > worst[0]:
        worst = (run, i + 1 - run)
row("nothing holds still", "PASS" if worst[0] / FPS <= 1.0 else ("LOOK" if worst[0] / FPS <= 2.5 else "FAIL"), "longest frozen stretch %.2f s%s" % (worst[0] / FPS, " from %.2f s" % (worst[1] / FPS) if worst[0] > FPS else ""))
# a new picture for every caption chunk: the frame at the chunk's start against the one at the previous chunk's start
same = []
for a, b in zip(chunks, chunks[1:]):
    fa, fb = min(n - 1, int(a["s"] * FPS) + 2), min(n - 1, int(b["s"] * FPS) + 2)
    if np.abs(A[fb] - A[fa]).mean() < 6.0:
        same.append(b)
row("a new picture per chunk", "PASS" if len(same) <= len(chunks) // 10 else "LOOK",
    "%d of %d chunks start on nearly the same picture as the one before%s" % (len(same), len(chunks), ": " + ", ".join('%.1f s "%s"' % (c["s"], c["text"]) for c in same[:6]) if same else ""))


def strip(k, name):
    ks = [max(0, min(n - 1, k + d)) for d in (-2, -1, 0, 1, 2)]
    w = 320; h = int(w * H / W)
    S = Image.new("RGB", (w * 5, h + 24), (30, 30, 30)); D = ImageDraw.Draw(S)
    for i, kk in enumerate(ks):
        S.paste(Image.open(frames[kk]).convert("RGB").resize((w, h)), (i * w, 24)); D.text((i * w + 6, 5), "f%d  %.3f s%s" % (kk, kk / FPS, "  <" if kk == k else ""), fill=(255, 230, 0))
    S.save(os.path.join(QA, name), quality=86)


for t, _ in fl[:5] + unplanned[:5]:
    strip(int(round(t * FPS)), "consec_%05.2f.jpg" % t)
if worst[0] > FPS:
    strip(worst[1] + worst[0] // 2, "consec_frozen_%05.2f.jpg" % (worst[1] / FPS))
# z-fighting: pixels that flip back and forth while their neighbours in time agree
tog, cnt = np.zeros(A.shape[1:], np.float32), 0
for k in range(1, n - 1):
    if near_cut(k / FPS) or diff[k - 1] > 3 * med or diff[k] > 3 * med:
        continue
    tog += np.clip(np.minimum(np.abs(A[k] - A[k - 1]), np.abs(A[k + 1] - A[k])) - np.abs(A[k + 1] - A[k - 1]), 0, None); cnt += 1
tog /= max(cnt, 1)                                         # grey levels a pixel flips by, per frame, on average
hot = tog / max(float(np.median(tog)), 0.25)               # against the picture's own noise (a floor for clean renders)
yy, xx = np.unravel_index(np.argmax(hot), hot.shape)
mid = Image.open(frames[n // 2]).convert("RGB").resize((540, 960))
hm = Image.fromarray((np.clip((hot - 1) / 6, 0, 1) * 255).astype(np.uint8)).resize(mid.size)
Image.composite(Image.new("RGB", mid.size, (255, 30, 30)), Image.blend(mid, Image.new("RGB", mid.size), 0.45), hm).save(os.path.join(QA, "zfight.jpg"), quality=86)
row("z-fighting", "PASS" if hot.max() < 6 or tog.max() < 1.5 else "LOOK", "hottest spot flips %.1f grey levels a frame (%.1fx the noise) at x %d%%, y %d%%: open qa/zfight.jpg" % (
    tog.max(), hot.max(), xx * 100 / 180, yy * 100 / 320))

# ---------------- the contact sheets, from the finished video (captions burned in) ----------------
tiles = os.path.join(QA, "tiles")
shutil.rmtree(tiles, ignore_errors=True); os.makedirs(tiles)
src = master if os.path.exists(master) else None
if src:
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-i", src, "-vf", "fps=2,scale=360:640", "-q:v", "3", os.path.join(tiles, "t%04d.jpg")], check=True)
    ts = sorted(glob.glob(os.path.join(tiles, "t*.jpg")))
    try:
        lab = ImageFont.truetype(env()["font"], 17)
    except Exception:
        lab = ImageFont.load_default()
    per, cols, tw, th = 12, 4, 360, 640
    for s in range(0, len(ts), per):
        part = ts[s:s + per]
        S = Image.new("RGB", (cols * tw, ((len(part) + cols - 1) // cols) * (th + 28)), (40, 40, 40)); D = ImageDraw.Draw(S)
        for i, f in enumerate(part):
            t = (s + i) * 0.5 + 0.25
            x, y = (i % cols) * tw, (i // cols) * (th + 28)
            S.paste(Image.open(f), (x, y + 28))
            c = next((c for c in chunks if c["s"] <= t < c["e"]), None)
            D.text((x + 6, y + 5), '%.1f s  %s' % (t, ('"' + c["text"] + '"') if c else ""), fill=(255, 230, 0), font=lab)
        S.save(os.path.join(QA, "sheet_%d.jpg" % (s // per + 1)), quality=86)
    row("contact sheets", "LOOK", "%d tiles in qa/sheet_1..%d.jpg: open every sheet, write one line per tile in qa/tiles.md" % (len(ts), (len(ts) + per - 1) // per))
shutil.rmtree(tiles, ignore_errors=True)

worst_state = "FAIL" if any(r[1] == "FAIL" for r in rows) else ("LOOK" if any(r[1] == "LOOK" for r in rows) else "PASS")
md = ["# QA report: %s" % SLUG, "", "Overall: **%s** (LOOK = open the named pictures and judge; FAIL = fix and render again)" % worst_state, "",
      "| check | result | detail |", "|---|---|---|"] + ["| %s | %s | %s |" % r for r in rows]
open(os.path.join(QA, "report.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print("\n".join("%-28s %-5s %s" % r for r in rows))
print("-> qa/report.md, qa/sheet_*.jpg, qa/zfight.jpg" + (", qa/consec_*.jpg" if fl or unplanned or worst[0] > FPS else ""))
