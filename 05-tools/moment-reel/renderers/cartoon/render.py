"""The cartoon renderer: a flat 2D cartoon drawn in SVG by the reel's cartoon/moment.js and screenshotted frame by frame
in headless Chrome (or Edge / Chromium). No GPU, no Blender.

    PY render.py stills [--shots 0,4,9] [--frames 640,700] [--at 0.5]   -> build/stills/ + sheet.jpg (one frame per shot)
    PY render.py frames [--workers 3]                                    -> build/frames/f00000.png ... + build/render.json
    PY render.py frames --size 1008x1152 --out frames_x                  -> the X cut's own 7:8 frames (encode.py uses them)

With --size the page is drawn at that size: moment.js sees it as C.W / C.H (and C.WIDE when it's wider than 9:16), and
C.frame() re-frames every camera for it (C.FIT and moment.js's FIT table), so the shots are composed for 7:8, not cropped.

It follows the renderer contract in ../README.md: it reads build/plan.json, writes exactly plan["frames"] PNGs, keeps
finished frames while the plan, moment.js and this folder are unchanged, and never draws captions.
"""
import asyncio, base64, hashlib, json, os, shutil, subprocess, sys, tempfile, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts"))
from _common import env, project  # noqa: E402


def find_browser():
    e = env() if callable(env) else {}
    cands = [e.get("chrome")] if isinstance(e, dict) and e.get("chrome") else []
    cands += [r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
              "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "chrome"):
        p = shutil.which(n)
        if p:
            cands.append(p)
    for c in cands:
        if c and os.path.exists(c):
            return c
    sys.exit("No Chrome, Edge or Chromium found. Install Google Chrome (free) or run: PY -m pip install playwright && "
             "PY -m playwright install chromium, then set \"chrome\" in ~/.cache/moment-reel/env.json to its path.")


def file_url(p):
    p = os.path.abspath(p).replace("\\", "/")
    return "file:///" + p.lstrip("/")


def build_page(P, plan, name="page.html"):
    """build/cartoon/page.html: the plan, the library, the reel's moment.js and a setFrame(f) entry point."""
    moment = os.path.join(P, "cartoon", "moment.js")
    if not os.path.exists(moment):
        sys.exit("missing %s: copy examples/hand_of_god/cartoon/moment.js and rewrite it for this moment" % moment)
    try:
        font = env().get("font")
    except Exception:
        font = None
    face = "@font-face{font-family:Nunito;src:url('%s');font-weight:100 1000}" % file_url(font) if font and os.path.exists(font) else ""
    html = """<!doctype html><html><head><meta charset="utf-8"><style>%s
html,body{margin:0;padding:0;background:#000;overflow:hidden;width:%dpx;height:%dpx}
#s{position:absolute;left:0;top:0;display:block}
#paper{position:absolute;left:0;top:0;width:%dpx;height:%dpx;mix-blend-mode:multiply;opacity:0.55;pointer-events:none}
</style></head><body>
<svg id="s" xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d"></svg><img id="paper">
<script>window.PLAN = %s;</script>
<script src="%s"></script>
<script src="%s"></script>
<script>
document.getElementById("paper").src = Cartoon.paperURL();
window.READY = Promise.all([document.fonts.ready, new Promise(r => { const i = document.getElementById("paper"); if (i.complete) r(); else i.onload = r; })]);
window.setFrame = function (f) {
  const P = window.PLAN;
  const sh = P.shots.find(s => f >= s.f0 && f < s.f1) || P.shots[P.shots.length - 1];
  const fn = window[sh.fn];
  window.SHOT = sh.fn;                    // for per-shot re-framing (FIT78) in a wide frame
  const t = (f - sh.f0) / P.fps, T = (sh.f1 - sh.f0) / P.fps;
  const out = fn ? fn(t, T, sh, f) : Cartoon.missing(sh, t, T);
  document.getElementById("s").innerHTML = Cartoon.DEFS + out;
  return sh.fn;
};
</script></body></html>""" % (face, plan["size"][0], plan["size"][1], plan["size"][0], plan["size"][1], plan["size"][0], plan["size"][1],
                              plan["size"][0], plan["size"][1], json.dumps(plan), file_url(os.path.join(HERE, "cartoon.js")), file_url(moment))
    out = os.path.join(P, "build", "cartoon", name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    return out


class Chrome:
    """One headless browser with its own profile. It picks a free DevTools port itself (port 0) and writes it to
    DevToolsActivePort in the profile, so several renders on one computer never connect to each other's pages."""
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.prof = tempfile.mkdtemp(prefix="moment_reel_chrome_")
        self.proc = subprocess.Popen([find_browser(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                                      "--allow-file-access-from-files", "--disable-web-security", "--no-first-run", "--no-default-browser-check",
                                      "--remote-debugging-port=0", "--user-data-dir=" + self.prof, "--window-size=%d,%d" % (w, h), "about:blank"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        portfile = os.path.join(self.prof, "DevToolsActivePort")
        for _ in range(200):
            try:
                self.port = int(open(portfile).read().split()[0])
                tabs = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % self.port, timeout=1))
                self.ws_url = [t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"]
                return
            except Exception:
                time.sleep(0.1)
        raise RuntimeError("Chrome did not start")

    def close(self):
        self.proc.terminate()
        try:
            self.proc.wait(5)
        except Exception:
            self.proc.kill()
        shutil.rmtree(self.prof, ignore_errors=True)


async def session(ch, page, jobs, outdir, log_every=150):
    import websockets
    async with websockets.connect(ch.ws_url, max_size=200_000_000) as ws:
        n = 0

        async def call(method, params=None):
            nonlocal n
            n += 1
            await ws.send(json.dumps({"id": n, "method": method, "params": params or {}}))
            while True:
                m = json.loads(await ws.recv())
                if m.get("id") == n:
                    if "error" in m:
                        raise RuntimeError("%s: %s" % (method, m["error"]))
                    return m.get("result", {})
        await call("Emulation.setDeviceMetricsOverride", {"width": ch.w, "height": ch.h, "deviceScaleFactor": 1, "mobile": False})
        await call("Page.enable")
        await call("Page.navigate", {"url": file_url(page)})
        for _ in range(200):
            r = await call("Runtime.evaluate", {"expression": "typeof window.setFrame === 'function' && !!window.READY", "returnByValue": True})
            if r.get("result", {}).get("value"):
                break
            await asyncio.sleep(0.05)
        await call("Runtime.evaluate", {"expression": "window.READY", "awaitPromise": True})
        t0 = time.time()
        for k, (f, name) in enumerate(jobs):
            r = await call("Runtime.evaluate", {"expression": "setFrame(%d)" % f, "returnByValue": True})
            if "exceptionDetails" in r:
                raise RuntimeError("frame %d: %s" % (f, json.dumps(r["exceptionDetails"])[:800]))
            shot = await call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
            data = base64.b64decode(shot["data"])
            tmp = os.path.join(outdir, name + ".tmp")
            open(tmp, "wb").write(data)
            os.replace(tmp, os.path.join(outdir, name))
            if log_every and k % log_every == 0:
                print("  frame %d (%d of %d) %.1f s" % (f, k + 1, len(jobs), time.time() - t0), flush=True)


def render_jobs(page, jobs, outdir, w, h, workers=1):
    os.makedirs(outdir, exist_ok=True)
    workers = max(1, min(workers, len(jobs)))
    chs = [Chrome(w, h) for _ in range(workers)]
    try:
        parts = [jobs[i::workers] for i in range(workers)]

        async def main():
            await asyncio.gather(*[session(c, page, p, outdir) for c, p in zip(chs, parts)])
        asyncio.run(main())
    finally:
        for c in chs:
            c.close()


def code_key(P, plan):
    h = hashlib.sha1(json.dumps(plan, sort_keys=True).encode())
    for root in (HERE, os.path.join(P, "cartoon")):
        for dp, _, fs in sorted(os.walk(root)):
            for fn in sorted(fs):
                if fn.endswith((".js", ".py", ".json", ".svg", ".png", ".html")) and "__pycache__" not in dp:
                    h.update(fn.encode()); h.update(open(os.path.join(dp, fn), "rb").read())
    return h.hexdigest()[:16]


def sheet(paths, labels, out, cols=6, tw=270):
    from PIL import Image, ImageDraw
    ims = [Image.open(p).convert("RGB") for p in paths]
    th = int(tw * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new("RGB", (cols * tw, rows * (th + 34)), (30, 30, 30))
    d = ImageDraw.Draw(S)
    for i, (im, lab) in enumerate(zip(ims, labels)):
        x, y = (i % cols) * tw, (i // cols) * (th + 34)
        S.paste(im.resize((tw, th)), (x, y + 34))
        d.text((x + 4, y + 2), lab[:44], fill=(255, 210, 90))
        d.text((x + 4, y + 17), lab[44:88], fill=(220, 220, 220))
    S.save(out, quality=88)


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("stills", "frames"):
        sys.exit(__doc__)
    mode = sys.argv[1]
    P = project()
    plan = json.load(open(os.path.join(P, "build", "plan.json"), encoding="utf-8"))
    arg = lambda name, default=None: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
    if arg("--size"):
        plan["size"] = [int(v) for v in arg("--size").lower().split("x")]
    W, H = plan["size"]
    tag = "" if (W, H) == (1080, 1920) else "_%dx%d" % (W, H)
    page = build_page(P, plan, "page%s.html" % tag)
    t0 = time.time()
    if mode == "stills":
        outdir = os.path.join(P, "build", "stills" + tag)
        os.makedirs(outdir, exist_ok=True)
        jobs, labels = [], []
        if arg("--frames"):
            for f in [int(x) for x in arg("--frames").split(",")]:
                sh = next((s for s in plan["shots"] if s["f0"] <= f < s["f1"]), plan["shots"][-1])
                jobs.append((f, "f%05d.png" % f)); labels.append("f%d %s  %s" % (f, sh["fn"], sh.get("said", "")))
        else:
            only = [int(x) for x in arg("--shots").split(",")] if arg("--shots") else range(len(plan["shots"]))
            at = float(arg("--at", 0.5))
            for k in only:
                s = plan["shots"][k]
                f = min(s["f1"] - 1, s["f0"] + int((s["f1"] - s["f0"]) * at))
                jobs.append((f, "s%02d.png" % k)); labels.append("%d %s  %s" % (k, s["fn"], s.get("said", "")))
        render_jobs(page, jobs, outdir, W, H, int(arg("--workers", 2)))
        sheet([os.path.join(outdir, n) for _, n in jobs], labels, os.path.join(outdir, "sheet.jpg"))
        print("stills: %d in %.0f s -> build/stills%s/sheet.jpg" % (len(jobs), time.time() - t0, tag))
        return
    outdir = os.path.join(P, "build", arg("--out", "frames"))
    os.makedirs(outdir, exist_ok=True)
    key = code_key(P, plan)
    kf = os.path.join(outdir, ".key")
    if not os.path.exists(kf) or open(kf).read().strip() != key:
        for fn in os.listdir(outdir):
            if fn.startswith("f") and fn.endswith((".png", ".jpg", ".tmp")):
                os.remove(os.path.join(outdir, fn))
        open(kf, "w").write(key)
    for fn in os.listdir(outdir):
        p = os.path.join(outdir, fn)
        if fn.endswith(".tmp") or (fn.endswith(".png") and os.path.getsize(p) == 0):
            os.remove(p)
    todo = [(f, "f%05d.png" % f) for f in range(plan["frames"]) if not os.path.exists(os.path.join(outdir, "f%05d.png" % f))]
    print("cartoon: %d frames to render (%d kept)" % (len(todo), plan["frames"] - len(todo)), flush=True)
    if todo:
        render_jobs(page, todo, outdir, W, H, int(arg("--workers", 3)))
    n = len([f for f in os.listdir(outdir) if f.endswith(".png")])
    secs = round(time.time() - t0)
    json.dump({"renderer": "cartoon", "frames": n, "ext": "png", "seconds": secs, "size": [W, H]},
              open(os.path.join(P, "build", "render%s.json" % tag), "w"))
    print("frames: %d of %d in %d s -> build/%s" % (n, plan["frames"], secs, arg("--out", "frames")))
    if n != plan["frames"]:
        sys.exit("missing frames: run it again (finished frames are kept)")


if __name__ == "__main__":
    main()
