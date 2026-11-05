"""render.py: film page -> numbered JPEG frames, with Playwright driving Chrome.
The page defines window.READY (true once fonts, sets and physics are built), window.TOTAL (seconds),
window.seek(t) (draws frame t as a pure function of time) and a 1080x1920 canvas with id "film".
  python engine/render.py part1/film.html part1/frames            every frame at 30 fps (f00000.jpg ...)
  python engine/render.py part1/film.html part1/stills --at 0,3.5  only these moments (at_0.00.jpg ...)
  python engine/render.py "part1/film.html#cover" part1/cover      the page's cover mode, one still
  options: --fps 30 --quality 90 --from N --to M (a frame range: resume a stopped render, or run 3 ranges side by side)
           --gpu (use the graphics card) --cpu (software WebGL, the default: slower but works everywhere)
The project folder is served over http://127.0.0.1 (ES modules don't load from file://).
needs: pip install playwright, then Chrome, or: python -m playwright install chromium"""
import base64, functools, http.server, os, sys, threading, time
from playwright.sync_api import sync_playwright

def main():
    a = sys.argv[1:]
    if len(a) < 2: sys.exit(__doc__)
    page_arg, out = a[0], a[1]
    opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    fps, q = opt("--fps", 30), opt("--quality", 90)
    page_path, _, frag = page_arg.partition("#")
    at = [float(x) for x in a[a.index("--at") + 1].split(",")] if "--at" in a else ([0.0] if frag else None)
    page_path = os.path.abspath(page_path)
    root = os.path.dirname(page_path)                                   # serve the folder that holds engine/
    while not os.path.isdir(os.path.join(root, "engine")) and os.path.dirname(root) != root: root = os.path.dirname(root)
    rel = os.path.relpath(page_path, root).replace("\\", "/")
    handler = functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *x: None}), directory=root)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_address[1]}/{rel}" + ("#" + frag if frag else "")
    args = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] if "--gpu" in a else ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        try: browser = p.chromium.launch(channel="chrome", headless=True, args=args)
        except Exception: browser = p.chromium.launch(headless=True, args=args)
        page = browser.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        errors = []; page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        try: page.wait_for_function("window.READY === true", timeout=180000)
        except Exception: sys.exit("the page never set window.READY = true. Page errors: " + " | ".join(errors[:3]))
        total = page.evaluate("window.TOTAL")
        chunks = page.evaluate("(window.CHUNKS || []).map(c => (c.words || []).map(w => String(w.w || w)))")
        FUNC = set("a an the to of at for from with by into onto under about after before until behind through and or but nor so if as than that this these those is are was were be been it its it's i i'm you you're they're he she we they me him her us them my your his our their who which what when where while because".split())
        PART = set("in on up off out down back away over".split())    # a verb's particle may end a chunk ("snowed in"), never alone
        bad = [" ".join(c) for c in chunks if c and (c[-1].lower().strip(".,!?;:\"'") in FUNC or (len(c) == 1 and c[0].lower() in PART))]
        if not chunks: print("CAPTION CHECK: the page has no window.CHUNKS, so the caption chunks can't be checked")
        elif bad and at is None and "--force" not in a: sys.exit("CAPTION CHUNK FAIL (a caption ends on a function word; chunk by meaning): " + " | ".join(bad[:10]))
        else: print(f"caption chunks: {len(chunks)}, {len(bad)} ending on a function word")
        n_all = int(round(total * fps))
        k0, k1 = opt("--from", 0), opt("--to", n_all)              # a frame range: resume a stopped render, or split one across processes
        times = at if at is not None else [k / fps for k in range(k0, min(k1, n_all))]
        print(f"page ready, TOTAL = {total:.2f} s, {len(times)} images", flush=True)
        t0 = time.time()
        for k, t in enumerate(times):
            data = page.evaluate("([t, q]) => { window.seek(t); return document.getElementById('film').toDataURL('image/jpeg', q); }", [t, q / 100])
            name = f"at_{t:.2f}.jpg" if at is not None else f"f{k + k0:05d}.jpg"
            with open(os.path.join(out, name), "wb") as f: f.write(base64.b64decode(data.split(",", 1)[1]))
            if at is None and k % 150 == 0: print(f"frame {k}/{len(times)}  {time.time() - t0:.0f} s", flush=True)
        if errors: print("PAGE ERRORS:", " | ".join(errors[:5]))
        browser.close()
    srv.shutdown()
    print(f"done: {len(times)} images in {out} ({time.time() - t0:.0f} s)")

if __name__ == "__main__":
    main()
