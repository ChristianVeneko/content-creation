"""animatic/render.py: a moving storyboard of build/plan.json -> build/frames/ (renderers/README.md has the contract).

  PY renderers/animatic/render.py [--project DIR]

One card per shot: its number, type, what and camera, over a grid that drifts the way the camera moves, with the
transitions drawn (a whip smears sideways, a smash zoom punches in, a flash goes white) and a pulse on each glow.
It's for checking the pacing and the plan in a minute before the real render. The caption band (y 1380-1620) stays clear.
"""
import glob, json, os, sys, textwrap, time, zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "scripts"))
from _common import env, project

P = project()
B = os.path.join(P, "build")
PLAN = json.load(open(os.path.join(B, "plan.json"), encoding="utf-8"))
W, H = PLAN["size"]


def main():
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    fnt = lambda s: ImageFont.truetype(env()["font"], s)
    big, mid, small = fnt(120), fnt(54), fnt(38)
    d = os.path.join(B, "frames")
    key = str(zlib.crc32(json.dumps(PLAN, sort_keys=True).encode() + open(__file__, "rb").read()))   # the plan and this renderer
    kf = os.path.join(d, ".plan")
    if not (os.path.exists(kf) and open(kf).read() == key):
        for f in glob.glob(os.path.join(d, "f*.*")):
            os.remove(f)
    os.makedirs(d, exist_ok=True); open(kf, "w").write(key)
    t0 = time.time(); shots = PLAN["shots"]; fps = PLAN["fps"]
    cards = {}
    for s in shots:                                       # the static part of each card, drawn once
        hue = zlib.crc32(s.get("type", "").encode()) % 360
        c = Image.new("RGB", (W, H), "hsl(%d,35%%,22%%)" % hue); g = ImageDraw.Draw(c)
        g.text((80, 170), "%02d" % s["i"], font=big, fill=(255, 210, 60))
        g.text((80, 320), (s.get("type", "") + "  ·  " + s.get("transition", "cut")).upper(), font=mid, fill=(240, 240, 240))
        y = 430
        for l in textwrap.wrap(s.get("what", ""), 34)[:8]:
            g.text((80, y), l, font=mid, fill=(255, 255, 255)); y += 66
        y += 20
        for l in textwrap.wrap("camera: " + s.get("camera", "") + ("  move: " + s["move"] if s.get("move") else ""), 46)[:5]:
            g.text((80, y), l, font=small, fill=(200, 210, 220)); y += 48
        g.text((80, 1720), '"%s"' % s.get("said", "")[:60], font=small, fill=(170, 175, 185))
        cards[s["i"]] = c
    for f in range(PLAN["frames"]):
        out = os.path.join(d, "f%05d.jpg" % f)
        if os.path.exists(out):
            continue
        t = f / fps
        s = next(x for x in reversed(shots) if x["start"] <= t + 1e-6)
        u = (t - s["start"]) / max(1e-3, s["end"] - s["start"])
        im = cards[s["i"]].copy(); g = ImageDraw.Draw(im)
        off = int(u * 480) % 120                          # the drifting grid stands in for the camera move
        for gx in range(-120, W + 120, 120):
            for gy in range(1100, 1360, 60):
                g.ellipse((gx + off - 5, gy - 5, gx + off + 5, gy + 5), fill=(255, 255, 255, 90))
        g.rectangle((0, 1880, int(W * u), 1890), fill=(255, 210, 60))
        if s.get("glow") and abs(t - s["glow"]["t"]) < 0.5:
            r = int(60 + 200 * (1 - abs(t - s["glow"]["t"]) / 0.5))
            g.ellipse((W - 160 - r // 2, 1200 - r // 2, W - 160 + r // 2, 1200 + r // 2), outline=(255, 200, 40), width=10)
        tr, k = s.get("transition", "cut"), f - s["f0"]
        if s["i"] and tr == "whip" and k < 5:
            im = im.transform(im.size, Image.AFFINE, (1, 0, -(5 - k) * 90, 0, 1, 0)).filter(ImageFilter.BoxBlur(12 - 2 * k))
        if s["i"] and tr == "smash_zoom" and k < 6:
            z = 1 + 0.25 * (1 - k / 6); w2, h2 = int(W / z), int(H / z)
            im = im.crop(((W - w2) // 2, (H - h2) // 2, (W + w2) // 2, (H + h2) // 2)).resize((W, H))
        if s["i"] and tr == "flash" and k < 2:
            im = Image.blend(im, Image.new("RGB", (W, H), (255, 255, 255)), 0.85 - 0.4 * k)
        im.save(out, quality=88)
        if f % 150 == 0:
            print("  frame %d / %d" % (f, PLAN["frames"]), flush=True)
    secs = round(time.time() - t0, 1)
    json.dump({"renderer": "animatic", "frames": PLAN["frames"], "ext": "jpg", "seconds": secs}, open(os.path.join(B, "render.json"), "w"))
    print("animatic: %d frames in %.0f s -> build/frames" % (PLAN["frames"], secs))


if __name__ == "__main__":
    main()
