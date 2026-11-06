"""sound.py: the whole sound track, synthesized with numpy. No recordings, no downloads, no samples.

  PY sound.py                                        build/sound.json -> build/audio.wav (plan.py writes sound.json)
  PY sound.py build/sound.json build/audio.wav
  PY sound.py --demo                                 every sound once, one after another -> build/sound_demo.wav

The format's sound, measured on the references: the voice from 0.0 s on top; under it a warm synth bed, 13 dB under
the voice and 22 dB under it while words are spoken (02-scripts/engine_duck.py, the web engine rule); a small sound on almost every new thing on screen (a pop for a
label, a whoosh on a transition, a bloop for a drop); no silence anywhere.

sound.json:
{
 "total": 55.9, "seed": 7, "duck": 0.45,            duck: ignored; the music level and ducking come from 02-scripts/engine_duck.py (web engine rule)
 "music": {"gain": 1.0, "bpm": 84, "root": 146.83, "mood": "wonder" | "tense" | "bright", "end_swell": true},
 "amb": {"wind": [[t, level], ...], "rain": [...], "hum": [...], "bubbles": [...]},
 "events": [["pop", 3.2, 0.3], ["whoosh", 8.42, 0.3, {"dur": 0.5, "f": [400, 2400, 600]}], ...]   [name, time s, gain, options]
}
Sounds: pop blip whoosh swish bloop drip thud boing ding shimmer riser sparkle tick click splash crash rumble zap
Any sound takes {"pan": -1..1}. whoosh: dur, f [start, middle, end Hz]. riser: dur. tick: n (a run of n ticks).
Never put a sound on sample 0 (AAC overshoots it): the first one at 0.04 s or later; plan.py does that.
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.environ.get("CC_ROOT") or os.path.abspath(os.path.join(os.path.dirname(os.path.realpath(__file__)), "../../..")), "02-scripts"))
from engine_duck import engine_music, describe as duck_describe   # the web engine's music level + ducking, always

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_wav, write_wav, project

SR = 48000
DEMO = "--demo" in sys.argv
ARGS = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and sys.argv[i - 1] != "--project"]
SRC = ARGS[0] if len(ARGS) >= 2 else os.path.join(project(), "build", "sound.json")
DST = ARGS[1] if len(ARGS) >= 2 else os.path.join(project(), "build", "sound_demo.wav" if DEMO else "audio.wav")


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


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


def tt_(dur):
    n = int(dur * SR)
    return n, np.arange(n) / SR


# ---------------- one-shots ----------------
def s_pop(o):                          # a label or a thing appears: a round, bubbly pop
    n, t = tt_(0.16)
    f = 300 + 1100 * (1 - np.exp(-t * 55))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * np.clip(t / 0.003, 0, 1)


def s_blip(o):                         # a counter step, a small UI tick with pitch
    n, t = tt_(0.09); f = o.get("f", 1320)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 45) * np.clip(t / 0.002, 0, 1)


def s_tick(o):                         # a run of n blips going up (a number counting)
    k = int(o.get("n", 6)); step = o.get("step", 0.07)
    s = np.zeros(int((k * step + 0.1) * SR))
    for i in range(k):
        b = s_blip({"f": 900 * 2 ** (i / 12 * 2)}); j = int(i * step * SR); s[j:j + len(b)] += b * (0.6 + 0.4 * i / max(1, k - 1))
    return s


def s_whoosh(o):                       # a transition: band-passed noise sweeping
    dur = o.get("dur", 0.45); f0, f1, f2 = o.get("f", [400, 2400, 600])
    n, t = tt_(dur); k = t / dur
    src = np.random.default_rng(int(dur * 1000)).standard_normal(n)
    fc = np.where(k < 0.5, f0 + (f1 - f0) * (k / 0.5), f1 + (f2 - f1) * ((k - 0.5) / 0.5))
    y = np.zeros(n); low = bp = 0.0; q = 0.6
    for i in range(n):
        f = 2 * np.sin(np.pi * fc[i] / SR)
        high = src[i] - low - q * bp
        bp += f * high; low += f * bp; y[i] = bp
    return norm(y) * np.sin(np.pi * k) ** 1.4


def s_swish(o):                        # a soft airy transition
    return s_whoosh({"dur": 0.35, "f": [1200, 4200, 2600]}) * 0.8


def s_bloop(o):                        # a water drop appearing / merging
    n, t = tt_(0.22)
    f = 520 + 900 * np.exp(-t * 28) + 120 * np.sin(2 * np.pi * 18 * t) * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * np.clip(t / 0.004, 0, 1)


def s_drip(o):                         # a drop landing: a short high plink
    n, t = tt_(0.25)
    f = 1500 - 700 * np.exp(-t * 40)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) + band(np.random.default_rng(3).standard_normal(n), 3000, 9000) * np.exp(-t * 200) * 0.3)


def s_thud(o):                         # something heavy lands (cartoon weight, not a crash)
    n, t = tt_(0.6)
    return np.sin(2 * np.pi * (85 - 40 * t) * t) * np.exp(-t * 9) + band(np.random.default_rng(5).standard_normal(n), 60, 900) * np.exp(-t * 30) * 0.5


def s_boing(o):                        # a bouncy spring (comedy beats)
    n, t = tt_(0.5)
    f = 180 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4) + 90 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * np.clip(t / 0.005, 0, 1)


def s_ding(o):                         # a bright bell: a fact lands
    n, t = tt_(1.4); s = np.zeros(n)
    for f, g, d in ((1318.5, 1, 3.5), (2637, 0.35, 6), (3951, 0.12, 9)):
        s += g * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
    return s * np.clip(t / 0.002, 0, 1)


def s_shimmer(o):                      # something glows: a soft rising bell chord
    n, t = tt_(1.2); s = np.zeros(n)
    for f, d in ((1046.5, 0), (1318.5, .05), (1568, .1), (2093, .16)):
        i = int(d * SR); m = n - i
        s[i:] += np.sin(2 * np.pi * f * t[:m]) * np.exp(-t[:m] * 3.5) * (1 - np.exp(-t[:m] * 60))
    return norm(s)


def s_sparkle(o):                      # a quick glittery run
    n, t = tt_(0.6); s = np.zeros(n); r = np.random.default_rng(11)
    for i in range(9):
        j = int(i * 0.05 * SR); m = n - j; f = 2000 + 300 * i + 200 * r.random()
        s[j:] += np.sin(2 * np.pi * f * t[:m]) * np.exp(-t[:m] * 14) * 0.5
    return s


def s_riser(o):                        # tension before a reveal
    dur = o.get("dur", 1.4); n, t = tt_(dur); k = t / dur
    ph = 2 * np.pi * np.cumsum(180 + 520 * k ** 2) / SR
    return norm(np.sin(ph) * 0.5 + np.sin(ph * 1.5) * 0.25 + band(np.random.default_rng(2).standard_normal(n), 1500, 7000) * k * 0.5) * k ** 1.6 * np.clip((1 - k) * 30, 0, 1)


def s_click(o):
    n, t = tt_(0.03); return band(np.random.default_rng(4).standard_normal(n), 2500, 9000) * np.exp(-t * 300) * 3


def s_splash(o):                       # water landing on something
    n, t = tt_(0.7); r = np.random.default_rng(6)
    s = norm(band(r.standard_normal(n), 300, 6000)) * np.exp(-t * 7) * (1 - np.exp(-t * 200))
    d = s_drip({}); s[:len(d)] += d * 0.6
    return s


def s_crash(o):                        # two drops colliding: a quick bloop pair
    a, b = s_bloop({}), s_bloop({}) * 0.8
    s = np.zeros(len(a) + int(0.06 * SR)); s[:len(a)] += a; s[int(0.06 * SR):int(0.06 * SR) + len(b)] += b
    return s


def s_rumble(o):                       # a low swell (something huge)
    dur = o.get("dur", 1.5); n, t = tt_(dur)
    return band(np.random.default_rng(8).standard_normal(n), 30, 160) * 3 * np.sin(np.pi * t / dur) ** 1.2 + np.sin(2 * np.pi * 45 * t) * np.sin(np.pi * t / dur) * 0.6


def s_zap(o):
    n, t = tt_(0.25); f = 2400 * np.exp(-t * 12) + 200
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 14) * 0.5


SOUNDS = {k[2:]: v for k, v in globals().items() if k.startswith("s_")}


def reverb(x, secs, wet, seed=1):
    m = int(secs * SR)
    r = np.random.default_rng(seed)
    ir = r.standard_normal(m) * np.exp(-np.arange(m) / SR * 6.9 / secs)
    ir = band(ir, 120, 7000); ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + m
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - wet) + y * wet * 2.2


# ---------------- the music: a warm ambient bed ----------------
MOODS = {   # chord progressions as semitones over the root (4 bars, looped)
    "wonder": [(0, 4, 7, 11), (9, 12, 16, 19), (5, 9, 12, 16), (7, 11, 14, 17)],      # Imaj7 vi7 IVmaj7 V7
    "bright": [(0, 4, 7, 12), (7, 11, 14, 19), (9, 12, 16, 21), (5, 9, 12, 17)],      # I V vi IV
    "tense": [(0, 3, 7, 10), (8, 12, 15, 19), (5, 8, 12, 15), (7, 10, 14, 17)],       # i VI iv v
}


def synth_pad(f, t, det=0.004):
    """A warm saw-ish pad: a few harmonics at 1/n, two detuned voices, slow vibrato."""
    s = np.zeros_like(t)
    for d in (-det, det):
        ph = 2 * np.pi * f * (1 + d) * t + 0.25 * np.sin(2 * np.pi * 0.17 * t)
        for h in range(1, 7):
            s += np.sin(h * ph) / h * (0.85 ** h)
    return s / 4


def music(M, total):
    N = int(total * SR); t = np.arange(N) / SR
    bpm = float(M.get("bpm", 84)); beat = 60 / bpm; bar = 4 * beat
    root = float(M.get("root", 146.83)); prog = MOODS.get(M.get("mood", "wonder"), MOODS["wonder"])
    pad, arp, bass, perc = np.zeros(N), np.zeros(N), np.zeros(N), np.zeros(N)
    r = np.random.default_rng(int(M.get("seed", 5)))
    nbars = int(total / bar) + 2
    for b in range(nbars):
        chord = [root * 2 ** (x / 12) for x in prog[b % 4]]
        i0 = int(b * bar * SR)
        if i0 >= N:
            break
        n_ = min(N - i0, int((bar + 1.2) * SR)); tt = np.arange(n_) / SR
        env_ = np.clip(tt / 0.8, 0, 1) * np.clip((bar + 1.2 - tt) / 1.2, 0, 1)
        pad[i0:i0 + n_] += sum(synth_pad(f, tt) for f in chord) * env_ * 0.3
        nb = min(N - i0, int(bar * SR)); tb = np.arange(nb) / SR
        bass[i0:i0 + nb] += np.sin(2 * np.pi * chord[0] / 2 * tb) * np.clip(tb / 0.05, 0, 1) * np.clip((bar - tb) / 0.2, 0, 1) * 0.55
        pattern = [0, 2, 1, 3, 2, 1, 3, 2]
        for k in range(8):                                             # a soft mallet arpeggio on the eighths
            j = i0 + int(k * beat / 2 * SR); m = min(N - j, int(0.9 * SR))
            if m <= 0:
                break
            f = chord[pattern[k] % len(chord)] * 2 * (2 if k in (3, 7) else 1)
            tp = np.arange(m) / SR
            vel = 0.55 + 0.25 * (k % 2 == 0) + 0.1 * r.random()
            arp[j:j + m] += (np.sin(2 * np.pi * f * tp) + 0.25 * np.sin(2 * np.pi * f * 4.0 * tp) * np.exp(-tp * 30)) * np.exp(-tp * 6.5) * vel * 0.35
        if b >= 2:                                                     # a light pulse from bar 3: a soft kick and a shaker
            for k in range(4):
                j = i0 + int(k * beat * SR); m = min(N - j, int(0.3 * SR))
                if m > 0 and k % 2 == 0:
                    tp = np.arange(m) / SR; perc[j:j + m] += np.sin(2 * np.pi * (62 - 25 * tp / 0.3) * tp) * np.exp(-tp * 14) * 0.6
                for h in (0.5, 0.75):
                    j2 = j + int(h * beat * SR); m2 = min(N - j2, int(0.06 * SR))
                    if m2 > 0:
                        perc[j2:j2 + m2] += band(r.standard_normal(m2), 6000, 13000) * np.exp(-np.arange(m2) / SR * 60) * (0.14 if h == 0.5 else 0.08)
    # a low-pass that opens slowly over each 4 bars (movement), then reverb on pad + arp
    pad = band(pad, 60, 2600)
    wet = reverb(pad * 0.8 + arp * 0.9, 2.6, 0.45, seed=3)
    delay = np.zeros(N); d = int(beat * 0.75 * SR)
    delay[d:] = arp[:-d] * 0.35
    mix = wet + delay * 0.6 + bass * 0.55 + perc * 0.55
    if M.get("end_swell", True):                                       # the last 3 s lift a little
        mix *= 1 + 0.25 * np.clip((t - (total - 3.5)) / 2.5, 0, 1)
    return mix * np.clip(t / 0.6, 0, 1) * np.clip((total - t) / 0.8, 0, 1)


# ---------------- ambience layers ----------------
def ambience(kind, level, N, r):
    t = np.arange(N) / SR
    if kind == "wind":
        x = band(r.standard_normal(N), 150, 1400)
        lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + 1) * np.sin(2 * np.pi * 0.07 * t)
        return norm(x) * lfo * level * 0.35
    if kind == "rain":
        x = band(r.standard_normal(N), 900, 9000) * 0.5
        hits = (r.random(N) > 0.9993) * r.standard_normal(N)
        tick = np.convolve(hits, np.exp(-np.arange(int(0.006 * SR)) / SR * 900) * np.sin(2 * np.pi * 3200 * np.arange(int(0.006 * SR)) / SR), "same")
        return (norm(x) * 0.6 + norm(tick) * 0.5) * level * 0.4
    if kind == "hum":
        return (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 110.4 * t) + 0.3 * band(r.standard_normal(N), 40, 300)) * level * 0.18
    if kind == "bubbles":
        s = np.zeros(N)
        for _ in range(int(N / SR * 5)):
            j = int(r.random() * (N - 9000)); b = s_bloop({}) * (0.3 + 0.4 * r.random())
            s[j:j + len(b)] += b
        return s * level * 0.4
    return np.zeros(N)


def main():
    if DEMO:
        names = sorted(SOUNDS); gap = 0.25
        parts = [np.zeros(int(0.1 * SR))]
        for nm in names:
            x = SOUNDS[nm]({}); parts += [norm(x) * 0.5, np.zeros(int(gap * SR))]
            print("%-8s %.2f s" % (nm, len(x) / SR))
        y = np.concatenate(parts)
        write_wav(DST, np.stack([y, y], 1), SR, channels=2)
        print("wrote", DST)
        return
    spec = json.load(open(SRC, encoding="utf-8"))
    total = float(spec["total"]); N = int(SR * total); t = np.arange(N) / SR
    r = np.random.default_rng(int(spec.get("seed", 1)))
    fx = np.zeros((2, N))

    def add(at, sig, gain, pan=0.0):
        i = int(at * SR)
        if i >= N:
            return
        j = min(N, i + len(sig)); s = sig[: j - i] * gain
        fx[0, i:j] += s * np.sqrt(0.5 * (1 - pan)); fx[1, i:j] += s * np.sqrt(0.5 * (1 + pan))
    unknown = sorted({e[0] for e in spec.get("events", []) if e[0] not in SOUNDS})
    if unknown:
        sys.exit("unknown sounds: %s (have: %s)" % (", ".join(unknown), " ".join(sorted(SOUNDS))))
    for e in spec.get("events", []):
        o = e[3] if len(e) > 3 else {}
        add(float(e[1]), SOUNDS[e[0]](o), float(e[2]) * 0.55, o.get("pan", 0.0))
    for kind, pts in (spec.get("amb") or {}).items():
        p = np.array(pts, float); lv = np.interp(t, p[:, 0], p[:, 1])
        a = ambience(kind, 1.0, N, r) * lv
        fx += a
    mus = music(spec["music"], total) if spec.get("music") else np.zeros(N)
    mus = mus / (np.sqrt(np.mean(mus ** 2)) + 1e-9) * 0.056 * float((spec.get("music") or {}).get("gain", 1.0))   # about -25 dBFS RMS
    # the voice on top, the music ducked a little under it
    vo_path = os.path.join(os.path.dirname(os.path.abspath(SRC)), "vo.wav")
    talk = np.zeros(N); v = np.zeros(N)
    if os.path.exists(vo_path):
        v0, sr = read_wav(vo_path)
        if sr != SR:
            v0 = np.interp(np.arange(int(len(v0) * SR / sr)) * sr / SR, np.arange(len(v0)), v0)
        v = np.pad(v0, (0, max(0, N - len(v0))))[:N].astype(float)
        Bk = 480
        blk = np.sqrt((v[: N // Bk * Bk].reshape(-1, Bk) ** 2).mean(1))
        if (blk > 0.01).any():
            k = 0.16 / np.sqrt((blk[blk > 0.01] ** 2).mean())                # speech RMS about -16 dBFS
            v *= k; blk *= k
            target = (blk > 0.012).astype(float); envb = np.zeros_like(target); e_ = 0.0
            for i, x in enumerate(target):                                   # attack 40 ms, release 400 ms
                e_ += (x - e_) * (0.25 if x > e_ else 0.025); envb[i] = e_
            talk = np.interp(np.arange(N) / Bk, np.arange(len(envb)), envb)
        print("voice mixed on top (music ducked under it)")
    if np.any(v):
        mus = engine_music(v, mus, SR)                                       # the web engine's level + ducking, always
        print(duck_describe())
    y = np.stack([mus, mus]) + fx * (1 - 0.25 * talk) + np.stack([v, v])
    y = np.tanh(y * 1.1) / 1.1
    y /= max(1.0, np.max(np.abs(y)) / 0.89)
    y *= np.clip(t / 0.03, 0, 1) * np.clip((total - t) / 0.03, 0, 1)
    write_wav(DST, y.T, SR, channels=2)
    print("wrote", DST, "%.2f s," % total, len(spec.get("events", [])), "sounds")


if __name__ == "__main__":
    main()
