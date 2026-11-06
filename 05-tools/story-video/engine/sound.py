"""sound.py PART_DIR TOTAL_SECONDS : narration.wav + timing.js + sfx.json -> mix.wav (-14 LUFS, all sound synthesized)
sfx.json = {"bed": [{"at": 0, "level": 0.6}, {"at": "knocks@14", "level": 1.0}],
            "sfx": [{"at": "knocks@14", "type": "knock", "vol": 0.8}, {"at": 31.2, "type": "hit"}],
            "music": "on"}   (or "off", or {"level": -13}: dB under the voice while it speaks; 12 to 14 is right)
The music is a dark bed made here: a low drone, a slow minor-key pad, a soft pulse that quickens near the end,
and low booms on every "hit" sound. It ducks under each line, swells a little in the gaps and with the "bed" cues.
"at" is seconds, or "word@line" (first time that word is spoken in that 0-based line), optionally "+0.2" / "-0.1".
types from Mixkit (free sound effects, downloaded once into engine/sfx/, Mixkit Sound Effects Free License):
  knock slam thud creak floorcreak lock heartbeat hit boom whoosh meow catangry glass swell
types made in code (tiny UI sounds, and the offline fallback for every type): tick click hiss growl sting rumble drip alarm
needs: pip install numpy imageio-ffmpeg"""
import json, os, re, shutil, subprocess, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.environ.get("CC_ROOT") or os.path.abspath(os.path.join(os.path.dirname(os.path.realpath(__file__)), "../../..")), "02-scripts"))
from engine_duck import engine_music, describe as duck_describe   # the web engine's music level + ducking, always
def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
SR = 48000
part, TOTAL = sys.argv[1], float(sys.argv[2])
N = int(TOTAL * SR)
rng = np.random.default_rng(7)
timing = json.loads(re.sub(r"^\s*window\.TIMING\s*=\s*|;\s*$", "", open(os.path.join(part, "timing.js"), encoding="utf-8").read().strip()))
spec = json.load(open(os.path.join(part, "sfx.json"), encoding="utf-8")) if os.path.exists(os.path.join(part, "sfx.json")) else {}

def when(at):
    if isinstance(at, (int, float)): return float(at)
    m = re.match(r"^\s*([^@+]+)@(\d+)\s*([+-]\s*[\d.]+)?\s*$", str(at))
    if not m: return float(at)
    word, li, off = m.group(1).strip().lower(), int(m.group(2)), float((m.group(3) or "0").replace(" ", ""))
    for w in timing["lines"][li]["words"]:
        if re.sub(r"[^\w']", "", w["w"].lower()) == re.sub(r"[^\w']", "", word): return w["s"] + off
    sys.exit(f'sfx.json: "{word}" is not spoken in line {li}: {timing["lines"][li]["text"]}')

def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    f[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(f, len(x))

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def tone(f, n, f_end=None):
    t = np.arange(n) / SR
    fr = f if f_end is None else f * (f_end / f) ** (t / t[-1])
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, t.shape)) / SR)

def noise(n): return rng.standard_normal(n)

HERE = os.path.dirname(os.path.abspath(__file__))
MIXKIT = {"knock": (1523, 1.4), "slam": (201, 1.9), "thud": (2589, 1.5), "creak": (110, 2.5), "floorcreak": (109, 2.0), "lock": (337, 1.1),
          "heartbeat": (493, 1.6), "hit": (2908, 3.0), "boom": (2182, 0.5), "whoosh": (1491, 1.2), "meow": (94, 0.6), "catangry": (95, 1.6),
          "glass": (2826, 2.0), "swell": (686, 6.0), "roomtone": (1046, 49.0)}
def mixkit(kind):
    """a Mixkit sound effect as a 48 kHz mono array, downloaded once; None if it can't be fetched"""
    sid, maxlen = MIXKIT[kind]
    d = os.path.join(HERE, "sfx"); os.makedirs(d, exist_ok=True)
    wav = os.path.join(d, f"{kind}_{sid}.wav")
    if not os.path.exists(wav):
        try:
            import urllib.request
            mp3 = wav[:-4] + ".mp3"
            req = urllib.request.Request(f"https://assets.mixkit.co/active_storage/sfx/{sid}/{sid}-preview.mp3", headers={"User-Agent": "Mozilla/5.0"})
            open(mp3, "wb").write(urllib.request.urlopen(req, timeout=30).read())
            subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR), wav], check=True); os.remove(mp3)
        except Exception as e:
            print(f"Mixkit '{kind}' not available ({e}); using the code-made version"); return None
    with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    x = x[:int(maxlen * SR)]
    if len(x) > SR // 10: x[-SR // 20:] *= np.linspace(1, 0, SR // 20)
    return x
FALLBACK = {"slam": "thud", "floorcreak": "creak", "lock": "click", "boom": "hit", "meow": "hiss", "catangry": "hiss", "swell": "rumble"}
def make(kind):
    if kind in MIXKIT and kind != "roomtone":
        x = mixkit(kind)
        if x is not None: return x
        kind = FALLBACK.get(kind, kind)
    return synth(kind)

def synth(kind):
    L = lambda s: int(s * SR)
    if kind == "knock":
        one = 0.9 * tone(120, L(0.25), 80) * env(L(0.25), 0.001, 0.05) + 0.5 * band(noise(L(0.25)), 300, 2500) * env(L(0.25), 0.0005, 0.015)
        out = np.zeros(L(1.2))
        for k in range(3): out[L(0.33 * k):L(0.33 * k) + len(one)] += one
        return out
    if kind == "thud": n = L(0.6); return tone(70, n, 40) * env(n, 0.002, 0.12) + 0.4 * band(noise(n), 60, 800) * env(n, 0.001, 0.05)
    if kind == "hit": n = L(2.2); return tone(55, n, 30) * env(n, 0.003, 0.6) + 0.35 * band(noise(n), 30, 300) * env(n, 0.002, 0.4)
    if kind == "whoosh": n = L(0.9); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return 0.8 * band(noise(n), 400, 3000) * e
    if kind == "tick": n = L(0.05); return band(noise(n), 2000, 6000) * env(n, 0.0002, 0.006)
    if kind == "click": n = L(0.08); return 0.8 * tone(1800, n) * env(n, 0.0002, 0.01)
    if kind == "hiss": n = L(0.9); e = np.minimum(1, np.arange(n) / L(0.05)) * np.exp(-np.arange(n) / L(0.5)); return 0.7 * band(noise(n), 3000, 9000) * e
    if kind == "creak":
        n = L(1.1); t = np.arange(n) / SR; f = 160 + 50 * np.sin(2 * np.pi * 1.3 * t) + 15 * band(noise(n), 5, 40)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        return 0.35 * band(saw, 200, 2500) * np.sin(np.linspace(0, np.pi, n))
    if kind == "sting": n = L(2.5); return 0.35 * sum(tone(f, n) for f in (220, 233.1, 311.1, 466.2)) * env(n, 0.01, 0.8)
    if kind == "heartbeat":
        one = tone(50, L(0.3), 35) * env(L(0.3), 0.004, 0.07); out = np.zeros(L(0.9))
        out[:len(one)] += one; out[L(0.28):L(0.28) + len(one)] += 0.7 * one; return out
    if kind == "rumble": n = L(2.5); return 0.9 * band(noise(n), 25, 140) * np.sin(np.linspace(0, np.pi, n))
    if kind == "glass":
        n = L(0.8); return 0.3 * sum(tone(f, n) * env(n, 0.0005, 0.1 + 0.05 * k) for k, f in enumerate((2400, 3150, 4100, 5300))) + 0.5 * band(noise(n), 3000, 10000) * env(n, 0.0005, 0.05)
    if kind == "growl":
        n = L(1.2); t = np.arange(n) / SR; f = 95 + 10 * np.sin(2 * np.pi * 3 * t)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        return 0.6 * band(saw, 60, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.linspace(0, np.pi, n))
    if kind == "alarm":
        n = L(1.6); t = np.arange(n) / SR; gate = ((t * 4) % 1 < 0.5).astype(float)
        return 0.4 * np.sign(np.sin(2 * np.pi * 880 * t)) * gate * np.minimum(1, (n - np.arange(n)) / L(0.1))
    if kind == "drip": n = L(0.25); return 0.6 * tone(900, n, 1800) * env(n, 0.001, 0.04)
    sys.exit(f"unknown sfx type {kind}")

with wave.open(os.path.join(part, "narration.wav")) as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
voice = np.zeros(N); voice[:min(N, len(v))] = v[:N]
t = np.arange(N) / SR
drone = (np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 82.4 * t + 1) + 0.4 * np.sin(2 * np.pi * 110.6 * t)) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 7))
rt = mixkit("roomtone") if spec.get("roomtone", True) else None       # a dark cinematic room tone from Mixkit, looped
if rt is not None and len(rt) > SR:
    reps = int(np.ceil(N / len(rt))) + 1; room = np.tile(rt, reps)[:N]
else:
    room = band(noise(N), 40, 400)
room = room / (np.abs(room).max() + 1e-9)
bed = 0.5 * drone / 2.1 + 0.5 * room
cues = sorted([(when(c["at"]), float(c["level"])) for c in spec.get("bed", [{"at": 0, "level": 0.7}])])
level = np.interp(t, [c[0] for c in cues] + [TOTAL], [c[1] for c in cues] + [cues[-1][1]])
level *= np.clip((TOTAL - t) / 1.5, 0, 1) * np.clip(t / 0.3, 0, 1)
venv = np.convolve(np.abs(voice), np.ones(SR // 20) / (SR // 20), mode="same")
duck = 1 - 0.55 * np.clip(venv / 0.04, 0, 1)
fx = np.zeros(N)
for c in spec.get("sfx", []):
    s = int(when(c["at"]) * SR); x = make(c["type"]); x = x / (np.abs(x).max() + 1e-9)
    e = min(N, s + len(x)); fx[s:e] += float(c.get("vol", 0.7)) * x[:e - s]
# music: a dark bed made here, never a downloaded track
mcfg = spec.get("music", "on")
music = np.zeros(N)
if mcfg not in ("off", False, None, 0):
    mdb = float(mcfg.get("level", -13)) if isinstance(mcfg, dict) else (float(mcfg) if isinstance(mcfg, (int, float)) and not isinstance(mcfg, bool) else -13.0)
    chords = [(73.42, 146.83, 174.61, 220.0), (58.27, 116.54, 146.83, 174.61), (49.0, 98.0, 116.54, 146.83), (55.0, 110.0, 130.81, 164.81)]
    seg = 8.0                                                   # D minor, B flat, G minor, A: 8 s each, slow crossfades
    for k in range(int(TOTAL // seg) + 2):
        f0 = chords[k % 4]; t0 = k * seg - 1.5; t1 = t0 + seg + 3.0
        a, b = max(0, int(t0 * SR)), min(N, int(t1 * SR))
        if a >= b: continue
        tt = np.arange(a, b) / SR
        wdw = np.sin(np.pi * np.clip((tt - t0) / (t1 - t0), 0, 1)) ** 2
        pad = np.zeros(b - a)
        for i, fr in enumerate(f0):
            for det in (-0.7, 0.7):
                ph = 2 * np.pi * (fr + det) * tt
                pad += (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)) * (1.0 if i == 0 else 0.5)
        music[a:b] += pad * wdw
    music = band(music, 30, 700); music /= np.abs(music).max() + 1e-9
    low = (np.sin(2 * np.pi * 36.71 * t) + 0.5 * np.sin(2 * np.pi * 73.42 * t + 0.7)) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 11))
    music = 0.7 * music + 0.35 * low
    thump = tone(48, int(0.4 * SR), 34) * env(int(0.4 * SR), 0.004, 0.09)
    tp = 1.0
    while tp < TOTAL - 2.0:                                     # the pulse: 57 a minute, about 75 in the last 15 s
        i = int(tp * SR); e = min(N, i + len(thump)); music[i:e] += 0.45 * thump[:e - i]
        tp += 1.05 if tp < TOTAL - 17 else 0.8
    boom = tone(41, int(2.5 * SR), 30) * env(int(2.5 * SR), 0.01, 0.8)
    for c in spec.get("sfx", []):                               # low booms on the big beats
        if c.get("type") == "hit":
            i = int(when(c["at"]) * SR); e = min(N, i + len(boom)); music[i:e] += 0.8 * boom[:e - i]
    music *= 0.75 + 0.3 * np.clip(level, 0, 1.2)                # swells with the bed cues and fades with it
    vol = 0.12 * 10 ** ((mdb + 13) / 20)                        # "level" keeps working as dB under the voice (-13 = engine default)
    music = engine_music(voice, music, SR, volume=vol)          # the web engine's level + ducking (9 dB while a line plays)
    print("music: " + duck_describe(vol))
mix = voice + 0.22 * bed * level * duck + 0.45 * fx + music
mix /= max(1.0, np.abs(mix).max() / 0.98)
raw = os.path.join(part, "mix_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
def measure(path):
    m = subprocess.run([FF, "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(json.loads(m[m.rindex("{"):m.rindex("}") + 1])["input_i"])
li = measure(raw); out = os.path.join(part, "mix.wav"); gain = -14 - li
for k in range(2):                                   # the second round corrects what the limiter took off
    if k: gain += -14 - measure(out)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false",
                    "-ar", str(SR), "-ac", "2", out], check=True)
os.remove(raw)
# dropout scan: a 100 ms hole inside a spoken line means a cut went wrong
holes = []
for L in timing["lines"]:
    a, b = int(L["start"] * SR), int(L["end"] * SR)
    seg = voice[a:b]; hop = SR // 20
    quiet = [np.sqrt(np.mean(seg[k:k + hop] ** 2)) < 0.0015 for k in range(0, max(0, len(seg) - hop), hop)]
    run = 0
    for j, qq in enumerate(quiet):                                  # a natural pause is under 0.7 s; a dropout is longer
        run = run + 1 if qq else 0
        if run * hop > 0.7 * SR and 3 < j < len(quiet) - 3: holes.append(round(L["start"] + j * hop / SR, 2)); break
if holes: print("DROPOUT WARNING: silence inside a spoken line at " + ", ".join(map(str, holes)) + " s")
else: print("dropout scan: OK")
print(f"mix.wav written: {TOTAL:.2f} s, {measure(out):.1f} LUFS (from {li:.1f})")
