"""finish.py STORY_DIR : frames/ + mix.wav + timing.json -> final.mp4 (1080x1920 Shorts/Reels/TikTok) and final_x78.mp4 (1008x1152 for X)
Captions: one word at a time in the middle of the frame, white rounded bold with a dark outline, ~3.4% of the frame high
(the size the reference pages use: readable, never shouting). Title Case like the originals.
needs: pip install pillow numpy imageio-ffmpeg"""
import json, os, re, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()
story = os.path.abspath(sys.argv[1])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1080, 1920, 30
SIZE = int(os.environ.get("CAPTION_PX", "92"))          # font size in px; the letters' cap height is ~0.7 of it
Y = float(os.environ.get("CAPTION_Y", "0.52"))         # vertical centre of the word, as a fraction of the height
timing = json.load(open(os.path.join(story, "timing.json"), encoding="utf-8"))
TOTAL = timing["voice_end"] + 1.0
frames = os.environ.get("FRAMES") or os.path.join(story, "frames")      # FRAMES=story/preview_frames to finish a preview
n_frames = len([f for f in os.listdir(frames) if f.endswith(".jpg")])
if n_frames < int(TOTAL * FPS) - 2:
    sys.exit(f"only {n_frames} frames in {frames}; the video needs {int(TOTAL * FPS)}. Finish the render first.")

font = ImageFont.truetype(os.path.join(ROOT, "assets", "fonts", "Nunito.ttf"), SIZE)
try:
    font.set_variation_by_axes([900])                  # Black weight
except Exception:
    pass
capdir = os.path.join(story, "captions"); os.makedirs(capdir, exist_ok=True)


def card(word, path):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if word:
        d = ImageDraw.Draw(im)
        f = font
        x0, y0, x1, y1 = d.textbbox((0, 0), word, font=f, stroke_width=7)
        if x1 - x0 > 0.86 * W:                          # a long word shrinks to fit instead of being clipped
            f = font.font_variant(size=int(SIZE * 0.86 * W / (x1 - x0)))
            try: f.set_variation_by_axes([900])
            except Exception: pass
            x0, y0, x1, y1 = d.textbbox((0, 0), word, font=f, stroke_width=7)
        x = (W - (x1 - x0)) / 2 - x0; y = H * Y - (y1 - y0) / 2 - y0
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sh)
        ds.text((x + 3, y + 6), word, font=f, fill=(0, 0, 0, 120), stroke_width=9, stroke_fill=(0, 0, 0, 120))
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(6)))
        d = ImageDraw.Draw(im)
        d.text((x, y), word, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(18, 18, 26, 255))
    im.save(path)


words = [w for l in timing["lines"] for w in l["words"]]
segs, t = [], 0.0
for i, w in enumerate(words):
    txt = re.sub(r"[^\w'%-]", "", w["w"]).strip("'")
    if not txt: continue
    txt = txt[0].upper() + txt[1:]
    start = 0.0 if i == 0 else w["s"]
    nxt = words[i + 1]["s"] if i + 1 < len(words) else TOTAL
    end = nxt if nxt - w["e"] < 0.45 else w["e"] + 0.25
    if start > t + 0.01: segs.append(("", t, start))
    segs.append((txt, start, end)); t = end
if t < TOTAL: segs.append(("", t, TOTAL))
lst = []
cache = {}
for k, (txt, a, b) in enumerate(segs):
    if txt not in cache:
        p = os.path.join(capdir, f"w{len(cache):04d}.png"); card(txt, p); cache[txt] = p
    lst.append(f"file '{cache[txt].replace(os.sep, '/')}'\nduration {max(1 / FPS, b - a):.4f}")
lst.append(f"file '{cache[segs[-1][0]].replace(os.sep, '/')}'")
open(os.path.join(capdir, "list.txt"), "w", encoding="utf-8").write("\n".join(lst) + "\n")

first = sorted(f for f in os.listdir(frames) if f.endswith(".jpg"))[0]
digits = len(os.path.splitext(first)[0])
pattern = os.path.join(frames, f"%0{digits}d.jpg")
out = os.path.join(story, "final.mp4")
subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", str(FPS), "-start_number", str(int(os.path.splitext(first)[0])), "-i", pattern,
                "-f", "concat", "-safe", "0", "-i", os.path.join(capdir, "list.txt"), "-i", os.path.join(story, "mix.wav"),
                "-filter_complex", "[0:v]scale=1080:1920:flags=lanczos[b];[1:v]fps=30,format=rgba[c];[b][c]overlay=0:0:shortest=1,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p[v]",
                "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-maxrate", "9M", "-bufsize", "18M", "-profile:v", "high",
                "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
                "-c:a", "aac", "-b:a", "192k", "-t", f"{TOTAL:.3f}", "-movflags", "+faststart", out], check=True)
# 7:8 for X (1008x1152): the WHOLE 9:16 frame, centred, plain black on both sides (never a crop that loses the top or bottom)
x78 = os.path.join(story, "final_x78.mp4")
subprocess.run([FF, "-y", "-loglevel", "error", "-i", out, "-vf", "scale=-2:1152:flags=lanczos,pad=1008:1152:(ow-iw)/2:0:black,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-c:a", "copy", "-movflags", "+faststart", x78], check=True)
for p in (out, x78):
    print(f"{os.path.basename(p)}: {os.path.getsize(p) / 1e6:.1f} MB")
