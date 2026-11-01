"""Synthesize the CC0 whoosh/pop sounds used by the illustrated template.

Writes 48 kHz stereo WAVs into 03-assets/sfx/generated/. Deterministic (fixed seeds).
Usage: .venv/bin/python 07-studio/engine/scripts/gen-sfx.py [out_dir]
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "03-assets" / "sfx" / "generated"


def write(name, stereo):
    stereo = np.clip(stereo, -1, 1)
    data = (stereo * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.reshape(-1).tobytes())


def one_pole_lowpass(x, cutoff_hz):
    """Time-varying one-pole lowpass; cutoff_hz is an array the size of x."""
    y = np.zeros_like(x)
    a = np.exp(-2 * np.pi * cutoff_hz / SR)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def whoosh(seed, dur, peak, lo, hi, pan_dir):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # Envelope: slow rise to the peak, faster decay.
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / (0.22 * (dur - peak))))
    cut = lo + (hi - lo) * np.where(t < peak, (t / peak) ** 1.5, np.exp(-(t - peak) / (0.4 * (dur - peak))))
    band = one_pole_lowpass(noise, cut) - one_pole_lowpass(noise, cut * 0.25)
    sig = band * env
    sig /= np.max(np.abs(sig)) + 1e-9
    sig *= 0.8
    pan = np.clip(0.5 + pan_dir * (t / dur - 0.5), 0, 1)
    return np.stack([sig * np.sqrt(1 - pan), sig * np.sqrt(pan)], axis=1)


def pop(f0, f1, dur, seed):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = f1 + (f0 - f1) * np.exp(-t / (dur * 0.25))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.minimum(1, t / 0.002) * np.exp(-t / (dur * 0.28))
    click = rng.standard_normal(n) * np.exp(-t / 0.0015) * 0.15
    sig = (np.sin(phase) * env + click) * 0.7
    return np.stack([sig, sig], axis=1)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write("whoosh-1.wav", whoosh(1, 0.55, 0.34, 300, 5200, 1))
    write("whoosh-2.wav", whoosh(2, 0.48, 0.30, 250, 4200, -1))
    write("whoosh-3.wav", whoosh(3, 0.62, 0.40, 350, 6000, 1))
    write("pop-1.wav", pop(900, 260, 0.09, 4))
    write("pop-2.wav", pop(1100, 320, 0.08, 5))
    write("pop-3.wav", pop(760, 220, 0.1, 6))
    print(f"wrote 6 files to {OUT}")
