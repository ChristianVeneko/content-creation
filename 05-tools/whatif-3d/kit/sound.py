"""sound.py STORY_DIR : narration.wav + sfx.json (+ timing.json) -> mix.wav at -14 LUFS.
The music bed and every sound effect are synthesized here (no downloads, no licences): a soft plucked
arpeggio over warm chords, about 12 dB under the voice and ducked while he speaks.
needs: pip install numpy imageio-ffmpeg"""
import json, os, shutil, subprocess, sys, wave
import numpy as np


def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()
SR = 48000
story = sys.argv[1]
timing = json.load(open(os.path.join(story, "timing.json"), encoding="utf-8"))
TOTAL = timing["voice_end"] + 1.0
N = int(TOTAL * SR)
rng = np.random.default_rng(11)
cues = json.load(open(os.path.join(story, "sfx.json"), encoding="utf-8")) if os.path.exists(os.path.join(story, "sfx.json")) else []


def lowpass(x, hz):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f *= 1 / (1 + (fr / hz) ** 4); return np.fft.irfft(f, len(x))


def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(f, len(x))


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def tone(f0, n, f1=None):
    t = np.arange(n) / SR
    fr = f0 if f1 is None else f0 * (f1 / f0) ** (t / max(t[-1], 1e-6))
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, t.shape)) / SR)


def reverb(x, secs=1.6, wet=0.3):
    n = int(secs * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * secs / 6)); ir = lowpass(ir, 5000); ir /= np.abs(ir).sum() ** 0.5 * 30
    L = len(x) + n; F = np.fft.rfft(x, L) * np.fft.rfft(ir, L)
    return x + wet * np.fft.irfft(F, L)[:len(x)]


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def music(n):
    """96 bpm, Cmaj7 - Am7 - Fmaj7 - G6, a marimba-like arpeggio in eighths over a soft pad."""
    beat = 60 / 96; bar = 4 * beat
    chords = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]]
    out = np.zeros(n + SR * 3)
    t = 0.0; k = 0
    while t < n / SR:
        ch = chords[(k // 1) % 4]
        # pad: three soft detuned sines per note, slow attack
        L = int(bar * SR)
        pad = sum(0.5 * tone(midi(m), L) + 0.25 * tone(midi(m) * 1.003, L) + 0.12 * tone(midi(m) * 2, L) for m in ch[1:])
        e = np.minimum(1, np.arange(L) / (0.4 * SR)) * np.minimum(1, (L - np.arange(L)) / (0.3 * SR))
        i0 = int(t * SR); out[i0:i0 + L] += 0.05 * pad * e
        # bass on beat 1 and 3
        for b in (0, 2):
            Lb = int(1.4 * SR); bs = tone(midi(ch[0] - 12), Lb) * env(Lb, 0.01, 0.35)
            j = int((t + b * beat) * SR); out[j:j + Lb] += 0.22 * bs
        # pluck arpeggio, eighth notes, with a little swing in velocity
        pat = [0, 2, 1, 3, 2, 1, 3, 2]
        for q, idx in enumerate(pat):
            m = ch[idx] + 12; Lp = int(0.9 * SR)
            pl = (tone(midi(m), Lp) + 0.35 * tone(midi(m) * 4, Lp) * env(Lp, 0.001, 0.03) + 0.2 * tone(midi(m) * 2, Lp)) * env(Lp, 0.002, 0.18)
            j = int((t + q * beat / 2) * SR); out[j:j + Lp] += (0.10 if q % 2 == 0 else 0.07) * pl
        t += bar; k += 1
    out = reverb(lowpass(out[:n], 6500), 1.8, 0.35)
    return out / (np.abs(out).max() + 1e-9)


def make(kind, dur=None):
    L = lambda s: int(s * SR)
    noise = lambda n: rng.standard_normal(n)
    if kind == "dig":
        n = L(0.35); return 0.8 * tone(90, n, 55) * env(n, 0.002, 0.06) + 0.6 * band(noise(n), 300, 3500) * env(n, 0.002, 0.07)
    if kind == "thud":
        n = L(0.6); return tone(75, n, 42) * env(n, 0.002, 0.12) + 0.35 * band(noise(n), 80, 900) * env(n, 0.001, 0.05)
    if kind == "pop":
        n = L(0.15); return 0.7 * tone(500, n, 900) * env(n, 0.001, 0.03)
    if kind == "click":
        n = L(0.08); return 0.7 * tone(1700, n) * env(n, 0.0002, 0.01)
    if kind == "chime":
        n = L(1.6); return sum(0.3 * tone(f, n) * env(n, 0.003, 0.5) for f in (1046.5, 1318.5, 1568.0))
    if kind == "whoosh":
        n = L(0.7); return band(noise(n), 500, 4000) * np.sin(np.linspace(0, np.pi, n)) ** 2
    if kind == "splash":
        n = L(1.0); x = band(noise(n), 400, 7000) * env(n, 0.003, 0.18)
        for k in range(10):
            j = int(rng.uniform(0.05, 0.6) * SR); dn = L(0.06); x[j:j + dn] += 0.4 * tone(rng.uniform(900, 2200), dn, rng.uniform(1500, 3500)) * env(dn, 0.001, 0.015)
        return x
    if kind == "bubble":
        n = L(0.5); x = np.zeros(n)
        for k in range(5):
            j = int(rng.uniform(0, 0.35) * SR); dn = L(0.08); x[j:j + dn] += tone(rng.uniform(400, 800), dn, rng.uniform(900, 1600)) * env(dn, 0.002, 0.02)
        return x
    if kind in ("pour", "hum"):
        n = L(dur or 2.0)
        x = band(noise(n), 300, 5000) if kind == "pour" else (tone(110, n) + 0.5 * tone(220, n) + 0.2 * band(noise(n), 60, 400))
        e = np.minimum(1, np.arange(n) / (0.2 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR))
        return (0.5 if kind == "pour" else 0.35) * x * e * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * np.arange(n) / SR))
    sys.exit(f"unknown sound '{kind}'")


with wave.open(os.path.join(story, "narration.wav")) as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
voice = np.zeros(N); voice[:min(N, len(v))] = v[:N]
bed = music(N)
t = np.arange(N) / SR
venv = np.convolve(np.abs(voice), np.ones(SR // 10) / (SR // 10), mode="same")
duck = 1 - 0.45 * np.clip(venv / 0.03, 0, 1)
fade = np.clip(t / 0.25, 0, 1) * np.clip((TOTAL - t) / 1.2, 0, 1)
fx = np.zeros(N)
for c in cues:
    s = int(float(c["at"]) * SR)
    if s >= N: continue
    x = make(c["type"], c.get("dur")); x = x / (np.abs(x).max() + 1e-9)
    e = min(N, s + len(x)); fx[s:e] += float(c.get("vol", 0.7)) * x[:e - s]
vr = np.sqrt(np.mean(voice[voice != 0] ** 2)) if np.any(voice) else 0.1
BED_DB = float(os.environ.get("BED_DB", "-13"))          # music level relative to the voice
br = np.sqrt(np.mean(bed ** 2)) + 1e-9
mix = voice + bed * (vr * 10 ** (BED_DB / 20) / br) * duck * fade + fx * vr * 1.6
mix /= max(1.0, np.abs(mix).max() / 0.98)
raw = os.path.join(story, "mix_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())


def measure(path):
    m = subprocess.run([FF, "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex("{"):m.rindex("}") + 1]); return float(j["input_i"]), float(j["input_tp"])


li, _ = measure(raw); out = os.path.join(story, "mix.wav"); gain = -14 - li
for k in range(2):                                   # the second pass corrects what the limiter took off
    if k: gain += -14 - measure(out)[0]
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:level=false",
                    "-ar", str(SR), "-ac", "2", out], check=True)
os.remove(raw)
i, tp = measure(out)
print(f"mix.wav: {TOTAL:.2f} s, {i:.1f} LUFS, true peak {tp:.1f} dBTP, {len(cues)} sound cues")
