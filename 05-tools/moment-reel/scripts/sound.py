"""sound.py: the whole sound track, synthesized with numpy. No recordings of any kind.

  PY sound.py                                        build/sound.json -> build/audio.wav (plan.py writes sound.json)
  PY sound.py build/sound.json build/audio.wav

sound.json:
{
 "total": 25.6, "seed": 1986,
 "bed": {"kind": "stadium" | "arena" | "fight" | "none",
         "level":  [[t, v], ...],    crowd loudness over video time, 0 to about 1.4
         "muffle": [[t, v], ...],    1 = heard through a wall (freezes, analysis), 0 = open
         "roar":   [[t, v], ...]},   the excitement layer on top of the crowd
 "events": [["kick", 3.2, 0.5], ["whoosh", 8.42, 0.4, {"dur": 0.62, "f": [300, 2600, 500]}], ...],   [name, time s, gain, options]
 "pads":   [{"from": 18, "to": 21.8, "notes": [110, 164.81, 220], "gain": 0.07}],
 "duck":   0.65                      how far the bed dips under the voice (0.65 is about 9 dB)
}
Sounds: kick thump shutter whoosh squeak tick tape net chime whistle buzzer swish bounce sneaker punch bell flashbulbs riser hit
        shimmer pop tvclick
"music": {"gain": 0.1, "bpm": 100, "root": 146.83} adds a light synthesized bed (I-V-vi-IV pad, plucked arpeggio, soft kick).
Any sound takes "pan" (-1 left .. 1 right). whoosh: dur, f [start, middle, end Hz]. tape, squeak, buzzer, riser, flashbulbs: dur.
whistle: dur, n (blasts). bell: n (rings).
The voice (build/vo.wav, from narrate.py) goes on top: speech at about -16 dBFS RMS, the bed ducked under it while it speaks.
Never put a hit on sample 0: AAC overshoots it. Start the first one at 0.04 s or later. plan.py writes sound.json for you.
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_wav, write_wav

SR = 48000
from _common import project
ARGS = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and sys.argv[i - 1] != "--project"]
SRC = ARGS[0] if len(ARGS) >= 2 else os.path.join(project(), "build", "sound.json")
DST = ARGS[1] if len(ARGS) >= 2 else os.path.join(project(), "build", "audio.wav")
spec = json.load(open(SRC, encoding="utf-8"))
TOTAL = float(spec["total"])
N = int(SR * TOTAL)
rng = np.random.default_rng(int(spec.get("seed", 1)))
t = np.arange(N) / SR


def band(x, lo, hi, soft=0.15):
    """Band-pass by FFT mask with soft edges."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= np.clip((f - lo * (1 - soft)) / (lo * soft * 2 + 1e-9), 0, 1)
    if hi < SR / 2:
        m *= np.clip((hi * (1 + soft) - f) / (hi * soft * 2 + 1e-9), 0, 1)
    return np.fft.irfft(X * m, len(x))


def env(points, default=0.0):
    if not points:
        return np.full(N, default)
    p = np.array(points, dtype=float)
    return np.interp(t, p[:, 0], p[:, 1])


def pink(n):
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR); f[0] = 1
    return np.fft.irfft(X / np.sqrt(f), n)


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


def reverb(x, secs, wet):
    """Indoor tail: convolve with decaying noise (FFT)."""
    m = int(secs * SR)
    ir = rng.standard_normal(m) * np.exp(-np.arange(m) / SR * 6.9 / secs)
    ir = band(ir, 150, 6000); ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + m
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - wet) + y * wet * 3


out = np.zeros((2, N))


def add(at, sig, gain, pan=0.0):
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    out[0, i:j] += s * np.sqrt(0.5 * (1 - pan))
    out[1, i:j] += s * np.sqrt(0.5 * (1 + pan))


# ---------------- the crowd bed ----------------
BEDS = {  # base band, babble band start, roar band, indoor reverb (s), muffle low-pass (Hz)
    "stadium": dict(base=(160, 2600), bab=350, roar=(260, 4800), verb=0.0, muf=420),
    "arena":   dict(base=(200, 3000), bab=380, roar=(300, 5200), verb=1.3, muf=500),
    "fight":   dict(base=(150, 2200), bab=320, roar=(250, 4500), verb=1.0, muf=450),
}
bed = spec.get("bed") or {"kind": "none"}
if bed.get("kind", "none") in BEDS:
    B = BEDS[bed["kind"]]
    L, MUF, R = env(bed.get("level"), 0.5), env(bed.get("muffle"), 0.0), env(bed.get("roar"), 0.2)
    for ch in range(2):
        base = norm(band(pink(N), *B["base"]))
        bab = np.zeros(N)                     # babble: many voices = noise in the voice band, modulated at syllable rates
        for k in range(10):
            am = np.clip(band(rng.standard_normal(N), 2, 7 + k * 0.4), 0, None)
            bab += band(rng.standard_normal(N), B["bab"] + 60 * k, 1300 + 120 * k) * am / (np.max(am) + 1e-9)
        bab = norm(bab)
        roar = norm(band(pink(N), *B["roar"]))
        full = 0.45 * base + 0.55 * bab + R * roar * 0.9
        if B["verb"]:
            full = reverb(full, B["verb"], 0.35)
        muf = band(full, 0, B["muf"]) * 2.6
        out[ch] += L * ((1 - MUF) * full + MUF * muf) * 0.5


# ---------------- one-shots ----------------
def tt_(dur):
    n = int(dur * SR); return n, np.arange(n) / SR


def s_kick(o):
    n, tt = tt_(0.16)
    return np.sin(2 * np.pi * (95 - 40 * tt / 0.16) * tt) * np.exp(-tt * 38) * 0.9 + band(rng.standard_normal(n), 1500, 7000) * np.exp(-tt * 320) * 0.35


def s_thump(o):
    n, tt = tt_(0.7)
    return np.sin(2 * np.pi * (62 - 22 * tt) * tt) * np.exp(-tt * 6) + band(rng.standard_normal(n), 30, 300) * np.exp(-tt * 14) * 0.6


def s_shutter(o):
    n, tt = tt_(0.09); s = np.zeros(n)
    for d in (0.0, 0.045):
        i, m = int(d * SR), int(0.012 * SR)
        s[i:i + m] += band(rng.standard_normal(m), 1800, 9000) * np.exp(-np.arange(m) / SR * 400)
    return s


def s_whoosh(o):
    dur = o.get("dur", 0.6); f0, f1, f2 = o.get("f", [300, 2600, 500])
    n, tt = tt_(dur); k = tt / dur
    src = rng.standard_normal(n)
    fc = np.where(k < 0.5, f0 + (f1 - f0) * (k / 0.5), f1 + (f2 - f1) * ((k - 0.5) / 0.5))
    y = np.zeros(n); low = bp = 0.0; q = 0.55                 # a resonant state-variable band-pass that sweeps
    for i in range(n):
        f = 2 * np.sin(np.pi * fc[i] / SR)
        high = src[i] - low - q * bp
        bp += f * high; low += f * bp; y[i] = bp
    return norm(y) * np.sin(np.pi * k) ** 1.5


def s_squeak(o):                       # a felt marker drawing the ring
    dur = o.get("dur", 0.5); n, tt = tt_(dur)
    return norm(band(rng.standard_normal(n), 2200, 5200) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * tt))) * np.sin(np.pi * tt / dur) ** 0.6


def s_tick(o):
    n, tt = tt_(0.03); return band(rng.standard_normal(n), 6000, 14000) * np.exp(-tt * 160) * 4


def s_tape(o):                         # rewind: tape whine, hiss, crackle
    dur = o.get("dur", 0.8); n, tt = tt_(dur); k = tt / dur
    f = 180 + 900 * np.sin(np.pi * k) ** 0.7 + 15 * np.sin(2 * np.pi * 9 * tt)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    crackle = (rng.random(n) > 0.9985) * rng.standard_normal(n) * 3
    return (band(saw, 100, 3500) * 0.6 + band(rng.standard_normal(n), 2000, 9000) * 0.5 + crackle) * np.clip(k * 12, 0, 1) * np.clip((1 - k) * 12, 0, 1)


def s_net(o):                          # a football hitting the net
    n, tt = tt_(0.45)
    return band(rng.standard_normal(n), 60, 700) * np.exp(-tt * 9) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 12) * 0.7


def s_chime(o):                        # the score box flips
    n, tt = tt_(1.6); s = np.zeros(n)
    for f, g, d in ((880, 1, 0), (1318.5, .8, .07), (1760, .45, .14)):
        i = int(d * SR); m = n - i
        s[i:] += g * np.sin(2 * np.pi * f * tt[:m]) * np.exp(-tt[:m] * 3.2) * (1 - np.exp(-tt[:m] * 900))
    return s


def s_whistle(o):                      # a referee's pea whistle
    dur, nb = o.get("dur", 0.45), int(o.get("n", 1))
    blast_n, tt = tt_(dur)
    fm = 2900 + 260 * np.sin(2 * np.pi * 34 * tt) * (0.6 + 0.4 * rng.random(blast_n))
    ph = 2 * np.pi * np.cumsum(fm) / SR
    blast = (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.4 * band(rng.standard_normal(blast_n), 2000, 6000))
    blast *= np.clip(tt / 0.02, 0, 1) * np.clip((dur - tt) / 0.04, 0, 1)
    gap = int(0.12 * SR); s = np.zeros(nb * (blast_n + gap))
    for b in range(nb):
        s[b * (blast_n + gap): b * (blast_n + gap) + blast_n] += blast
    return norm(s)


def s_buzzer(o):                       # a basketball arena horn
    dur = o.get("dur", 1.1); n, tt = tt_(dur)
    s = sum(np.sign(np.sin(2 * np.pi * f * tt)) * g for f, g in ((176, 1), (178.5, .8), (352, .4)))
    return norm(band(s, 120, 3000)) * np.clip(tt / 0.01, 0, 1) * np.clip((dur - tt) / 0.03, 0, 1)


def s_swish(o):                        # a basketball through the net
    n, tt = tt_(0.3)
    return norm(band(rng.standard_normal(n), 1500, 8000)) * np.sin(np.pi * np.clip(tt / 0.3, 0, 1)) ** 0.5 * np.exp(-tt * 6)


def s_bounce(o):                       # a dribble on hardwood
    n, tt = tt_(0.12)
    return np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 45) + band(rng.standard_normal(n), 400, 1800) * np.exp(-tt * 120) * 0.5


def s_sneaker(o):                      # a sneaker squeak
    n, tt = tt_(0.13); f = 1800 + 1000 * tt / 0.13
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.sin(np.pi * tt / 0.13) * (0.7 + 0.3 * np.sin(2 * np.pi * 90 * tt))


def s_punch(o):                        # a glove landing
    n, tt = tt_(0.18)
    return np.sin(2 * np.pi * (75 - 30 * tt / 0.18) * tt) * np.exp(-tt * 28) + band(rng.standard_normal(n), 800, 5000) * np.exp(-tt * 160) * 0.8


def s_bell(o):                         # a boxing ring bell
    n_r = int(o.get("n", 1)); one_n, tt = tt_(1.8)
    one = sum(g * np.sin(2 * np.pi * 520 * r * tt) * np.exp(-tt * d) for r, g, d in ((1, 1, 2.2), (2.76, .5, 3.5), (5.4, .25, 6), (8.93, .12, 9)))
    gap = int(0.32 * SR); s = np.zeros(one_n + (n_r - 1) * gap)
    for k in range(n_r):
        s[k * gap: k * gap + one_n] += one
    return norm(s)


def s_flashbulbs(o):                   # photographers' camera clicks
    dur = o.get("dur", 1.0); n, tt = tt_(dur); s = np.zeros(n)
    for _ in range(int(dur * 9)):
        i = int(rng.random() * (n - 2000)); m = int(0.01 * SR)
        s[i:i + m] += band(rng.standard_normal(m), 2000, 10000) * np.exp(-np.arange(m) / SR * 500) * (0.4 + 0.6 * rng.random())
    return s


def s_riser(o):                        # tension before the moment
    dur = o.get("dur", 1.5); n, tt = tt_(dur); k = tt / dur
    ph = 2 * np.pi * np.cumsum(220 + 660 * k ** 2) / SR
    return norm(np.sin(ph) * 0.4 + band(rng.standard_normal(n), 1000, 6000) * k) * k ** 1.5 * np.clip((1 - k) * 40, 0, 1)


def s_hit(o):                          # a low impact under a big beat
    n, tt = tt_(1.2)
    return np.sin(2 * np.pi * (48 - 14 * tt) * tt) * np.exp(-tt * 3.5) + band(rng.standard_normal(n), 40, 2500) * np.exp(-tt * 18) * 0.5


def s_shimmer(o):                      # an object glows: a soft rising bell chord
    n, tt = tt_(1.2); s = np.zeros(n)
    for f, d in ((1046.5, 0), (1318.5, .05), (1568, .1), (2093, .16)):
        i = int(d * SR); m = n - i
        s[i:] += np.sin(2 * np.pi * f * tt[:m]) * np.exp(-tt[:m] * 3.5) * (1 - np.exp(-tt[:m] * 60))
    return norm(s + band(rng.standard_normal(n), 5000, 12000) * np.exp(-tt * 9) * 0.15)


def s_pop(o):                          # 3D text or a symbol appears
    n, tt = tt_(0.12)
    return np.sin(2 * np.pi * (380 + 900 * np.exp(-tt * 60)) * tt) * np.exp(-tt * 40)


def s_tvclick(o):                      # an old TV switching on
    n, tt = tt_(0.6)
    return band(rng.standard_normal(n), 80, 9000) * np.exp(-tt * 60) + np.sin(2 * np.pi * 15734 / 4 * tt) * np.exp(-tt * 4) * 0.08


SOUNDS = {k[2:]: v for k, v in globals().items() if k.startswith("s_")}
unknown = sorted({e[0] for e in spec.get("events", []) if e[0] not in SOUNDS})
if unknown:
    sys.exit("unknown sounds in window.SOUND: %s (have: %s)" % (", ".join(unknown), " ".join(SOUNDS)))
for e in spec.get("events", []):
    o = e[3] if len(e) > 3 else {}
    add(float(e[1]), SOUNDS[e[0]](o), float(e[2]), o.get("pan", 0.0))
for p in spec.get("pads", []):
    q = env([[p["from"], 0], [p["from"] + 0.6, 1], [p["to"] - 0.5, 1], [p["to"], 0]])
    gs = p.get("gains") or [0.5, 0.32, 0.28, 0.2, 0.1][: len(p["notes"])]
    pad = sum(g * np.sin(2 * np.pi * f * t + 0.4 * np.sin(2 * np.pi * 0.21 * t)) for f, g in zip(p["notes"], gs))
    out += pad * q * float(p.get("gain", 0.07))

# the bed: soft clip, peak to -1 dBFS
y = np.tanh(out * 1.3)
y /= np.max(np.abs(y)) / 0.89 + 1e-9

# a light music bed, synthesized: a I-V-vi-IV progression as a soft pad, a plucked arpeggio, a soft kick and hat
mus = np.zeros(N)
if spec.get("music"):
    M = spec["music"]; bpm = float(M.get("bpm", 100)); beat = 60 / bpm; root = float(M.get("root", 146.83))   # D3
    prog = [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)]                       # semitones: I, V, vi, IV
    bar = 4 * beat
    for b in range(int(TOTAL / bar) + 1):
        chord = [root * 2 ** (x / 12) for x in prog[b % 4]]
        i0 = int(b * bar * SR); n_ = min(N - i0, int(bar * SR))
        if n_ <= 0:
            break
        tt = np.arange(n_) / SR
        pad = sum(np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.003 * tt) for f in chord) / 3
        mus[i0:i0 + n_] += pad * np.clip(tt / 0.3, 0, 1) * np.clip((bar - tt) / 0.3, 0, 1) * 0.35
        for k in range(8):                                                           # eighth-note arpeggio, plucked
            j = i0 + int(k * beat / 2 * SR); m = min(N - j, int(0.5 * SR))
            if m <= 0:
                break
            f = chord[k % 3] * (2 if k % 4 == 3 else 1) * 2; tp = np.arange(m) / SR
            mus[j:j + m] += (np.sin(2 * np.pi * f * tp) + 0.3 * np.sin(4 * np.pi * f * tp)) * np.exp(-tp * 9) * 0.25
        for k in range(4):                                                           # soft kick on every beat, a hat between
            j = i0 + int(k * beat * SR); m = min(N - j, int(0.25 * SR))
            if m > 0:
                tp = np.arange(m) / SR; mus[j:j + m] += np.sin(2 * np.pi * (70 - 30 * tp / 0.25) * tp) * np.exp(-tp * 22) * 0.35
            j2 = j + int(beat / 2 * SR); m2 = min(N - j2, int(0.05 * SR))
            if m2 > 0:
                mus[j2:j2 + m2] += band(rng.standard_normal(m2), 7000, 14000) * np.exp(-np.arange(m2) / SR * 80) * 0.12
    mus = mus / (np.max(np.abs(mus)) + 1e-9) * float(M.get("gain", 0.1)) * np.clip(t / 0.5, 0, 1) * np.clip((TOTAL - t) / 1.0, 0, 1)

# the voice on top, the bed ducked under it (the music a little less)
vo_path = os.path.join(os.path.dirname(os.path.abspath(SRC)), "vo.wav")
if os.path.exists(vo_path):
    v, sr = read_wav(vo_path)
    if sr != SR:
        v = np.interp(np.arange(int(len(v) * SR / sr)) * sr / SR, np.arange(len(v)), v)
    v = np.pad(v, (0, max(0, N - len(v))))[:N].astype(float)
    Bk = 480                                                 # 10 ms blocks for the envelope
    blk = np.sqrt((v[: N // Bk * Bk].reshape(-1, Bk) ** 2).mean(1))
    if (blk > 0.01).any():
        v *= 0.16 / np.sqrt((blk[blk > 0.01] ** 2).mean())     # speech RMS about -16 dBFS
        blk *= 0.16 / np.sqrt((blk[blk > 0.01] ** 2).mean() + 1e-12)
        target = (blk > 0.01).astype(float); envb = np.zeros_like(target); e_ = 0.0
        for k, x in enumerate(target):                       # attack 30 ms, release 350 ms
            e_ += (x - e_) * (0.33 if x > e_ else 0.028); envb[k] = e_
        talk = np.interp(np.arange(N) / Bk, np.arange(len(envb)), envb)
        duck = 1 - float(spec.get("duck", 0.65)) * talk
        y = np.tanh((y * duck + mus * (1 - 0.35 * talk) + v) * 1.05)
        y /= np.max(np.abs(y)) / 0.89
        mus = None
    print("voice mixed on top (bed ducked under it)")
if mus is not None and np.any(mus):
    y = np.tanh((y + mus) * 1.05); y /= np.max(np.abs(y)) / 0.89
y *= np.clip(t / 0.03, 0, 1) * np.clip((TOTAL - t) / 0.02, 0, 1)
write_wav(DST, y.T, SR, channels=2)
print("wrote", DST, "%.2f s," % TOTAL, len(spec.get("events", [])), "sounds")
