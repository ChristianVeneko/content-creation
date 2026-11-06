"""encode.py: the renderer's frames + the sound + burned-in captions -> the two cuts and the covers.

  PY encode.py            -> out/<slug>_9x16.mp4, out/<slug>_x_7x8.mp4, out/<slug>_cover_9x16.jpg, out/<slug>_cover_7x8.jpg
  PY encode.py --x-only   just the X cut again (after a 7:8 fix)

Reads build/plan.json, build/timing.json (the caption chunks), build/frames/f00000.png and build/audio.wav (made by
sound.py if it's missing).
- Captions, in the format's style: white, a rounded sans (Nunito ExtraBold) at 50 px on a 1080 px frame, a thin dark
  outline and a soft shadow, centred at y 1505 of 1920 (78 % down), sentence case with the punctuation kept, no box, no
  highlight, no animation. Each 2-4 word chunk replaces the last. Line 1 is not captioned while the title card says it
  (plan.json "hide_lines", default [0] when script.json has a "title").
- The 9:16 master is mixed to lufs.master (default -12 LUFS, as the references measured); the X cut to lufs.x (-14).
- The X cut fills the 7:8 tile from its own native frames (build/frames_x/, `render.py frames --size 1008x1152 --out
  frames_x`), with the captions drawn at the same style for that frame (78 % down). Without them it's the 9:16 frame
  with bars. Two-pass under 9.5 MB.
"""
import glob, json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import env, ffmpeg, project, W, H, X_SIZE, X_MAX_MB

P = project()
B, OUT = os.path.join(P, "build"), os.path.join(P, "out")
PLAN = json.load(open(os.path.join(B, "plan.json"), encoding="utf-8"))
TM = json.load(open(os.path.join(B, "timing.json"), encoding="utf-8"))
CAP_Y, CAP_SIZE, CAP_MAXW = 1505, 50, 900
INK = (26, 18, 56)


def font(size):
    from PIL import ImageFont
    f = ImageFont.truetype(env()["font"], size)
    try:
        f.set_variation_by_axes([800])          # Nunito ExtraBold
    except Exception:
        pass
    return f


def caption_image(text, W=W, H=H):
    """A W x H transparent picture with the chunk drawn in the format's style (50 px at 1080 wide, 78 % down)."""
    from PIL import Image, ImageDraw, ImageFilter
    k = W / 1080.0
    size, maxw, cy = int(round(CAP_SIZE * k)), CAP_MAXW * k, int(round(H * CAP_Y / 1920.0))
    while True:
        f = font(size)
        lines = [text]
        if f.getlength(text) > maxw and size <= 44 * k and " " in text:   # still too wide at a smaller size: two lines
            ws = text.split(); h = (len(ws) + 1) // 2; lines = [" ".join(ws[:h]), " ".join(ws[h:])]
        if max(f.getlength(l) for l in lines) <= maxw or size <= 40 * k:
            break
        size -= 2
    lh = int(size * 1.2)
    y0 = cy - lh * len(lines) // 2
    sw = max(2, int(round(3.2 * k)))
    shadow = Image.new("L", (W, H), 0); d = ImageDraw.Draw(shadow)
    for i, l in enumerate(lines):
        d.text((W / 2 + 2 * k, y0 + i * lh + lh / 2 + 4 * k), l, font=f, fill=255, anchor="mm", stroke_width=sw + 1, stroke_fill=255)
    shadow = shadow.filter(ImageFilter.GaussianBlur(5 * k)).point(lambda v: int(v * 0.55))
    im = Image.new("RGBA", (W, H), INK + (0,))
    im.putalpha(shadow)
    top = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(top)
    for i, l in enumerate(lines):
        d.text((W / 2, y0 + i * lh + lh / 2), l, font=f, fill=(255, 255, 255, 255), anchor="mm", stroke_width=sw, stroke_fill=INK + (255,))
    return Image.alpha_composite(im, top)


def build_captions(W=W, H=H, name="captions"):
    """One picture per chunk and an ffconcat list that shows each for its time (a blank picture in the gaps)."""
    from PIL import Image
    d = os.path.join(B, name)
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(os.path.join(d, "*.png")):
        os.remove(f)
    blank = os.path.join(d, "blank.png"); Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank)
    items, t = [], 0.0
    hide = set(PLAN.get("hide_lines", []))
    for c in TM["chunks"]:
        if not c["text"] or c["line"] in hide:
            continue
        if c["s"] > t + 0.001:
            items.append((blank, c["s"] - t))
        p = os.path.join(d, "c%03d.png" % c["i"]); caption_image(c["text"], W, H).save(p)
        items.append((p, c["e"] - c["s"])); t = c["e"]
    if PLAN["total"] > t:
        items.append((blank, PLAN["total"] - t))
    q = lambda p: "'" + p.replace("\\", "/").replace("'", "'\\''") + "'"
    lst = "ffconcat version 1.0\n" + "".join("file %s\nduration %.4f\n" % (q(p), dur) for p, dur in items) + "file %s\n" % q(items[-1][0])
    path = os.path.join(d, "captions.ffconcat"); open(path, "w", encoding="utf-8").write(lst)
    return path


def loudnorm(ff, wav, target):
    err = subprocess.run([ff, "-hide_banner", "-i", wav, "-af", "loudnorm=I=%g:TP=-1.5:LRA=11:print_format=json" % target, "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S).group(0))
    # AAC rings on the synthesized clicks' top end and overshot the limiter by up to 3 dB (+1.1 dBTP on Hand of God's X cut):
    # cut above 15.5 kHz first, then limit at 192 kHz so inter-sample peaks are caught too
    return ("loudnorm=I=%g:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:"
            "measured_thresh={input_thresh}:offset={target_offset}:linear=true,lowpass=f=15500,aresample=192000,"
            "alimiter=limit=0.75:attack=1:release=60:level=false,aresample=48000" % target).format(**m)


def main():
    ff = ffmpeg()
    fr = sorted(glob.glob(os.path.join(B, "frames", "f*.*")))
    if len(fr) < PLAN["frames"]:
        sys.exit("build/frames has %d frames, the plan needs %d: render first" % (len(fr), PLAN["frames"]))
    ext = os.path.splitext(fr[0])[1]
    wav = os.path.join(B, "audio.wav")
    if not os.path.exists(wav):
        subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "sound.py"), "--project", P], check=True)
    caps = build_captions()
    os.makedirs(OUT, exist_ok=True)
    slug, total, fps = PLAN["slug"], PLAN["total"], PLAN["fps"]
    lufs = PLAN.get("lufs", {"master": -12, "x": -14})
    src = ["-framerate", str(fps), "-i", os.path.join(B, "frames", "f%05d" + ext), "-f", "concat", "-safe", "0", "-i", caps, "-i", wav]
    tag = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
    comp = "[1:v]fps=%d,format=rgba[c];[0:v]format=rgba[f];[f][c]overlay=0:0:eof_action=repeat" % fps
    tv = "scale=in_range=full:out_range=tv,format=yuv420p"
    master = os.path.join(OUT, slug + "_9x16.mp4")
    if "--x-only" not in sys.argv:                          # --x-only: re-encode just the X cut after a 7:8 fix
      subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", *src, "-filter_complex", comp + "," + tv + "[v]", "-map", "[v]", "-map", "2:a",
                    "-af", loudnorm(ff, wav, lufs["master"]), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", *tag,
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", "%.3f" % total, "-movflags", "+faststart", master], check=True)
    frx = sorted(glob.glob(os.path.join(B, "frames_x", "f*.*")))
    if len(frx) >= PLAN["frames"]:                        # native 7:8 frames: fill the tile, captions drawn for it
        from PIL import Image
        xw, xh = Image.open(frx[0]).size
        capx = build_captions(xw, xh, "captions_x")
        src = ["-framerate", str(fps), "-i", os.path.join(B, "frames_x", "f%05d" + os.path.splitext(frx[0])[1]), "-f", "concat", "-safe", "0", "-i", capx, "-i", wav]
        xf = comp + (",scale=%d:%d:flags=lanczos,setsar=1," % (X_SIZE[0], X_SIZE[1]) if (xw, xh) != tuple(X_SIZE) else ",") + tv + "[v]"
        print("X cut from native %dx%d frames" % (xw, xh))
    else:
        sw = int(round(X_SIZE[1] * W / H / 2) * 2)
        xf = comp + ",scale=%d:%d:flags=lanczos,pad=%d:%d:%d:0:black,setsar=1,%s[v]" % (sw, X_SIZE[1], X_SIZE[0], X_SIZE[1], (X_SIZE[0] - sw) // 2, tv)
        print("X cut: the 9:16 frame with bars (render native 7:8 frames into build/frames_x to fill the tile)")
    xcut, abr, log = os.path.join(OUT, slug + "_x_7x8.mp4"), 160, os.path.join(B, "x2pass")
    afx = loudnorm(ff, wav, lufs["x"])
    for attempt in range(3):
        vbr = int(X_MAX_MB * 8 * 1024 / total * (1 - 0.06 * attempt) - abr - 40)
        common = [*src, "-filter_complex", xf, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-b:v", "%dk" % vbr, "-maxrate", "%dk" % int(vbr * 1.6),
                  "-bufsize", "%dk" % int(vbr * 2), "-pix_fmt", "yuv420p", *tag, "-passlogfile", log, "-t", "%.3f" % total]
        subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", *common, "-pass", "1", "-an", "-f", "mp4", os.devnull], check=True)
        subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", *common, "-pass", "2", "-map", "2:a", "-af", afx, "-c:a", "aac", "-b:a", "%dk" % abr,
                        "-ar", "48000", "-movflags", "+faststart", xcut], check=True)
        if os.path.getsize(xcut) < 10 * 1024 * 1024 * 0.985:
            break
    for f in glob.glob(os.path.join(B, "x2pass*")):
        os.remove(f)
    # covers: the plan's cover frame with its caption
    from PIL import Image
    k = min(len(fr) - 1, int(round(PLAN["cover"] * fps)))
    im = Image.open(fr[k]).convert("RGBA")
    c = next((c for c in TM["chunks"] if c["s"] <= PLAN["cover"] < c["e"] and c["text"] and c["line"] not in set(PLAN.get("hide_lines", []))), None)
    if c:
        im = Image.alpha_composite(im, caption_image(c["text"]))
    im = im.convert("RGB"); im.save(os.path.join(OUT, slug + "_cover_9x16.jpg"), quality=94)
    if len(frx) >= PLAN["frames"]:                        # the 7:8 cover from the native frame
        x = Image.open(frx[k]).convert("RGBA")
        if c:
            x = Image.alpha_composite(x, caption_image(c["text"], x.size[0], x.size[1]))
        x = x.convert("RGB").resize(tuple(X_SIZE), Image.LANCZOS)
    else:
        x = Image.new("RGB", X_SIZE, (0, 0, 0)); x.paste(im.resize((sw, X_SIZE[1]), Image.LANCZOS), ((X_SIZE[0] - sw) // 2, 0))
    x.save(os.path.join(OUT, slug + "_cover_7x8.jpg"), quality=94)
    for f in (master, xcut):
        print(os.path.basename(f), round(os.path.getsize(f) / 1024 / 1024, 2), "MB")


if __name__ == "__main__":
    main()
