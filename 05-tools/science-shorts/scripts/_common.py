"""Shared bits for the science-shorts scripts: where the tools live, ffmpeg, the Short's folder, small wav helpers.

The tools (a Python venv, the Kokoro voice, the faster-whisper timing model, the caption font) go in one folder per
computer, SCIENCE_SHORTS_HOME, default ~/.cache/science-shorts. setup.py fills it and writes env.json there (with the browser's path).
"""
import json, os, shutil, subprocess, sys, wave

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME = os.path.normpath(os.environ.get("SCIENCE_SHORTS_HOME") or os.path.join(os.path.expanduser("~"), ".cache", "science-shorts"))
ENV_FILE = os.path.join(HOME, "env.json")
FPS = 30
W, H = 1080, 1920                 # the 9:16 master
X_SIZE = (1008, 1152)             # the 7:8 X cut
X_MAX_MB = 9.5


def env():
    if not os.path.exists(ENV_FILE):
        sys.exit("The tools aren't set up yet. Run:  python %s" % os.path.join(SKILL, "scripts", "setup.py"))
    return json.load(open(ENV_FILE, encoding="utf-8"))


def ffmpeg():
    e = env() if os.path.exists(ENV_FILE) else {}
    p = e.get("ffmpeg")
    if p and os.path.exists(p):
        return p
    p = shutil.which("ffmpeg")
    if p:
        return p
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg not found: run setup.py (it installs imageio-ffmpeg)")


def project(argv=None):
    """The Short's folder: --project PATH, or the current folder."""
    argv = argv if argv is not None else sys.argv
    if "--project" in argv:
        return os.path.abspath(argv[argv.index("--project") + 1])
    return os.getcwd()


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def read_wav(path):
    """-> (mono float32 in -1..1, sample rate)"""
    import numpy as np
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return x.reshape(-1, w.getnchannels()).mean(1), w.getframerate()


def write_wav(path, x, sr, channels=1):
    """x: float array, (n,) for mono or (n, 2) for stereo."""
    import numpy as np
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(channels); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
