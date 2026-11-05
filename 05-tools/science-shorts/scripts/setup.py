"""setup.py: install the free tools once per computer, and get a Short's folder ready.

  python setup.py                 install what's missing (safe to run again), then print the PY line
  python setup.py --project .     also make build/, out/, qa/ in this folder
  python setup.py --check         only report what's there

Everything is free and needs no account or key:
  - a Python venv with numpy, pillow, imageio-ffmpeg (ffmpeg), kokoro-onnx + soundfile (the voice) and faster-whisper
    (word timing);
  - the Kokoro-82M voice model (Apache-2.0, about 340 MB), faster-whisper base.en (MIT, about 145 MB) and the caption font
    (Nunito, SIL Open Font License);
  - a Chromium browser for the renderer: it uses Google Chrome or Microsoft Edge if one is installed (most computers
    have one), else it installs Playwright's free Chromium into the venv.
The tools go in SCIENCE_SHORTS_HOME (default ~/.cache/science-shorts), so every later Short reuses them.
"""
import glob, json, os, re, shutil, subprocess, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import HOME, ENV_FILE

PKGS = ["numpy", "pillow", "imageio-ffmpeg", "kokoro-onnx", "soundfile", "faster-whisper", "websockets"]
FILES = [("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx", "models/kokoro-v1.0.onnx"),
         ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin", "models/voices-v1.0.bin"),
         ("https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf", "fonts/Nunito.ttf")]
WIN, MAC = os.name == "nt", sys.platform == "darwin"
VENV = os.path.join(HOME, "venv")
PY = os.path.join(VENV, "Scripts", "python.exe") if WIN else os.path.join(VENV, "bin", "python")


def find_browser():
    """Google Chrome, Microsoft Edge or Chromium, if one is installed."""
    cands = []
    if WIN:
        for base in (os.environ.get("PROGRAMFILES", r"C:\Program Files"), os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)"),
                     os.environ.get("LOCALAPPDATA", "")):
            cands += [os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"), os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe")]
    elif MAC:
        cands += ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                  "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"):
        q = shutil.which(n)
        if q:
            cands.append(q)
    return next((c for c in cands if c and os.path.exists(c)), None)


def playwright_chromium():
    """No browser on the computer: Playwright's free Chromium, installed into the venv."""
    print("no Chrome or Edge found: installing Playwright's Chromium (about 150 MB, free)")
    if subprocess.run([PY, "-m", "pip", "install", "-q", "playwright"]).returncode:
        return None
    if subprocess.run([PY, "-m", "playwright", "install", "chromium"]).returncode:
        return None
    out = subprocess.run([PY, "-c", "from playwright.sync_api import sync_playwright\nwith sync_playwright() as p: print(p.chromium.executable_path)"],
                         capture_output=True, text=True).stdout.strip()
    return out if out and os.path.exists(out) else None


def get(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 50000:
        return "have"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (science-shorts setup)"})
            with urllib.request.urlopen(req, timeout=180) as r, open(dest + ".part", "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            os.replace(dest + ".part", dest)
            return "got"
        except Exception as e:
            print("  retry", attempt + 1, os.path.basename(dest), e)
            time.sleep(2 + 3 * attempt)
    return "FAILED"


def pip_ok():
    if not os.path.exists(PY):
        return False
    return subprocess.run([PY, "-c", "import numpy, PIL, imageio_ffmpeg, kokoro_onnx, soundfile, faster_whisper, websockets"], capture_output=True).returncode == 0


def status():
    e = json.load(open(ENV_FILE, encoding="utf-8")) if os.path.exists(ENV_FILE) else {}
    rows = [("venv + packages", pip_ok()), ("ffmpeg", bool(e.get("ffmpeg")) and os.path.exists(e.get("ffmpeg", ""))),
            ("kokoro voice", os.environ.get("SCIENCE_SHORTS_LOCAL_VOICE") != "1" or all(os.path.exists(os.path.join(HOME, r)) for _, r in FILES[:2])),
            ("whisper base.en", os.environ.get("SCIENCE_SHORTS_LOCAL_VOICE") != "1" or os.path.exists(os.path.join(HOME, "models", "whisper-base.en", "model.bin"))),
            ("caption font", os.path.exists(os.path.join(HOME, "fonts", "Nunito.ttf"))),
            ("browser", bool(e.get("chrome")) and os.path.exists(e.get("chrome", "")))]
    for n, ok in rows:
        print("%-16s %s" % (n, "ok" if ok else "MISSING"))
    return all(ok for _, ok in rows)


def install():
    if sys.version_info < (3, 10):
        sys.exit("Python 3.10 or newer is needed (python.org). This is %s." % sys.version.split()[0])
    if WIN and len(HOME) > 70:
        sys.exit("SCIENCE_SHORTS_HOME is a long path (%d characters). Windows stops at 260 characters and the voice package has deep "
                 "folders, so set it to a short one, e.g.  set SCIENCE_SHORTS_HOME=C:\\science-shorts" % len(HOME))
    os.makedirs(HOME, exist_ok=True)
    t0 = time.time()
    if not os.path.exists(PY):
        print("making the venv in", VENV)
        subprocess.run([sys.executable, "-m", "venv", VENV], check=True)
    if not pip_ok():
        print("installing", " ".join(PKGS), "(a few minutes the first time)")
        subprocess.run([PY, "-m", "pip", "install", "-q", "--upgrade", "pip"], check=False)
        if subprocess.run([PY, "-m", "pip", "install", "-q", *PKGS]).returncode:
            sys.exit("pip couldn't install the packages. If this Python is very new, install Python 3.12 from python.org and run setup again.")
    LOCAL = os.environ.get("SCIENCE_SHORTS_LOCAL_VOICE") == "1"   # ElevenLabs engine needs no Kokoro/whisper models
    for url, rel in (FILES if LOCAL else FILES[2:]):
        print("%-6s %s" % (get(url, os.path.join(HOME, rel)), rel))
    wdir = os.path.join(HOME, "models", "whisper-base.en")
    if not LOCAL:
        print("skip   kokoro + whisper (set SCIENCE_SHORTS_LOCAL_VOICE=1 for the local English voice)")
    elif not os.path.exists(os.path.join(wdir, "model.bin")):
        subprocess.run([PY, "-c", "from faster_whisper import download_model; download_model('base.en', output_dir=%r)" % wdir], check=True)
        print("got    models/whisper-base.en")
    else:
        print("have   models/whisper-base.en")
    ff = subprocess.run([PY, "-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"], capture_output=True, text=True, check=True).stdout.strip()
    chrome = find_browser() or playwright_chromium()
    print("browser:", chrome or "NOT found (install Google Chrome from google.com/chrome, free, and run setup again)")
    e = {"home": HOME, "python": PY, "ffmpeg": ff, "chrome": chrome,
         "kokoro_model": os.path.join(HOME, "models", "kokoro-v1.0.onnx"), "kokoro_voices": os.path.join(HOME, "models", "voices-v1.0.bin"),
         "whisper": wdir, "font": os.path.join(HOME, "fonts", "Nunito.ttf")}
    json.dump(e, open(ENV_FILE, "w", encoding="utf-8"), indent=1)
    print("setup done in %.0f s" % (time.time() - t0))


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(0 if status() else 1)
    install()
    if "--project" in sys.argv:
        p = os.path.abspath(sys.argv[sys.argv.index("--project") + 1])
        for d in ("build", "out", "qa"):
            os.makedirs(os.path.join(p, d), exist_ok=True)
    ok = status()
    print("\nPY=%s" % PY)
    if not ok:
        sys.exit("something is still missing: see above")
