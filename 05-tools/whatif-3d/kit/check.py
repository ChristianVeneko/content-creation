"""check.py STORY_DIR : watch final.mp4 the way a picky viewer would, and print what's wrong.
  - qa_sheet.jpg: a frame every 0.5 s with its time (look at it: broken geometry, missing textures, clipped captions)
  - black or blank frames, frames that flash (pop for one frame and back), frozen stretches
  - loudness (aim -14 LUFS), true peak, silent gaps over 0.8 s, voice start and end
Exit code 1 if anything fails.  needs: pip install numpy pillow imageio-ffmpeg"""
import json, os, re, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()
story = os.path.abspath(sys.argv[1])
src = os.path.join(story, sys.argv[2] if len(sys.argv) > 2 else "final.mp4")
bad = []
e = subprocess.run([FF, "-hide_banner", "-i", src], capture_output=True, text=True).stderr
d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", e); dur = int(d.group(2)) * 60 + float(d.group(3))
v = re.search(r"Video: (\w+).*?(\d{3,5})x(\d{3,5})", e)
print(f"{os.path.basename(src)}: {dur:.2f} s, {v.group(1)} {v.group(2)}x{v.group(3)}, {os.path.getsize(src) / 1e6:.1f} MB")
LMAX = float(os.environ.get("WHATIF_MAX_S", "80"))  # this repo: longer videos on request
if not (55 <= dur <= LMAX): bad.append(f"length {dur:.1f} s is outside 55-{LMAX:.0f} s")

# every frame, small and grey, for flashes / black / frozen
w, h = 72, 128
raw = subprocess.run([FF, "-loglevel", "error", "-i", src, "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
fps = len(f) / dur
lum = f.mean(axis=(1, 2))
for i in np.where(lum < 12)[0][:5]:
    bad.append(f"near-black frame at {i / fps:.2f} s")
dd = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
# a flash: frame i differs a lot from i-1 AND i+1, but i-1 and i+1 are alike (one odd frame)
skip = np.abs(f[2:] - f[:-2]).mean(axis=(1, 2))
for i in range(1, len(f) - 1):
    a, b = dd[i - 1], dd[i]
    if a > 10 and b > 10 and skip[i - 1] < 0.35 * min(a, b):
        bad.append(f"one-frame flash at {i / fps:.2f} s (frame {i}): an object pops in and out, or a cut is one frame long")
still = dd < 0.25; run = 0
for i, s in enumerate(still):
    run = run + 1 if s else 0
    if run == int(1.5 * fps): bad.append(f"frozen picture for 1.5 s+ around {i / fps:.1f} s")
# sheet every 0.5 s
p = subprocess.run([FF, "-loglevel", "error", "-i", src, "-vf", "fps=2,scale=162:288", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
n = len(p) // (162 * 288 * 3)
tiles = []
for k in range(n):
    im = Image.frombytes("RGB", (162, 288), p[k * 162 * 288 * 3:(k + 1) * 162 * 288 * 3])
    ImageDraw.Draw(im).text((4, 4), f"{k / 2:.1f}", fill=(255, 255, 0)); tiles.append(im)
cols = 16; rows = -(-len(tiles) // cols)
sheet = Image.new("RGB", (cols * 164, rows * 290), "white")
for k, im in enumerate(tiles): sheet.paste(im, ((k % cols) * 164, (k // cols) * 290))
sheet.save(os.path.join(story, "qa_sheet.jpg"), quality=85)

# audio
a = subprocess.run([FF, "-hide_banner", "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", a)[-1]); P = re.findall(r"Peak:\s+(-?[\d.inf]+) dBFS", a)[-1]
print(f"loudness {I:.1f} LUFS, true peak {P} dBFS")
if not (-16 <= I <= -12): bad.append(f"loudness {I:.1f} LUFS (aim -14)")
if P not in ("-inf",) and float(P) > -1.0: bad.append(f"true peak {P} dBFS: clipping risk (keep under -1)")
s = subprocess.run([FF, "-hide_banner", "-i", src, "-af", "silencedetect=noise=-45dB:d=0.8", "-f", "null", "-"], capture_output=True, text=True).stderr
for st, en in zip(re.findall(r"silence_start: ([\d.]+)", s), re.findall(r"silence_end: ([\d.]+)", s)):
    if float(en) < dur - 0.5: bad.append(f"silence {float(st):.2f}-{float(en):.2f} s")
tj = os.path.join(story, "timing.json")
if os.path.exists(tj):
    T = json.load(open(tj, encoding="utf-8")); first = T["lines"][0]["words"][0]["s"]
    print(f"voice: {T.get('engine')} {T.get('voice', '')}, starts {first:.2f} s, ends {T['voice_end']:.2f} s")
    if first > 0.3: bad.append(f"voice starts late ({first:.2f} s)")
    if T.get("engine") not in ("kokoro", "elevenlabs"): bad.append(f"voice engine is {T.get('engine')}, not Kokoro (fix the Kokoro install, then rerun voice.py)")
print("qa_sheet.jpg written: open it and look at every tile")
if bad:
    print("\nFAIL:"); [print(" -", b) for b in bad[:30]]; sys.exit(1)
print("PASS: no black, flashing or frozen frames; loudness and gaps OK")
