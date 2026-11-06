"""engine_duck.py: the 07-studio engine's music level and ducking, for the Python video kits.

Same rule as the web client (07-studio/engine/lib/audio-bed.mjs `buildBed`, constants in lib/music.mjs):
the music sits 13 dB under the voice's active loudness (music.volume 0.12) and dips 9 dB more while words
are spoken, with a raised-cosine attack of 0.18 s before each word and a release of 0.55 s after it.
Speech is found from the voice track itself (50 ms windows above the gate, pauses under 0.45 s merged).

    import sys, os; sys.path.insert(0, os.path.join(os.environ["CC_ROOT"], "02-scripts"))
    from engine_duck import engine_music
    music = engine_music(voice, music, sr)          # 1-D mono arrays (or (N, 2) / (2, N) music), same length

Feed the music raw (no ducking, no level tricks); mix `voice + music + sfx`, then normalize the master to -14 LUFS.
"""
import numpy as np

UNDER_VOICE_DB = 13.0   # MUSIC_REF.underVoiceDb at volume 0.12
REF_VOLUME = 0.12       # MUSIC_REF.volume
DUCK_DB = 9.0           # DUCK.depthDb
ATTACK = 0.18           # DUCK.attackSec
RELEASE = 0.55          # DUCK.releaseSec
MERGE = 0.45            # speechIntervals merge used by buildBed
STEP = 0.01             # gain updated every 10 ms


def _db(x):
    return 20 * np.log10(np.maximum(1e-9, x))


def _window_rms_db(x, sr, win=0.05):
    w = max(1, int(round(win * sr)))
    n = len(x) // w
    if n == 0:
        return np.array([_db(np.sqrt(np.mean(x ** 2)) if len(x) else 0)])
    return _db(np.sqrt((x[: n * w].reshape(n, w) ** 2).mean(1)))


def active_loudness(x, sr, gate=-45.0):
    """Power average (dB) of the 50 ms windows above `gate`, like audio-bed.mjs activeLoudness."""
    w = _window_rms_db(x, sr)
    w = w[w > gate]
    if not len(w):
        return None
    return float(_db(np.sqrt(np.mean((10 ** (w / 20)) ** 2))))


def speech_mask(voice, sr, gate_below_active=20.0):
    """Per-10 ms frames where the voice is speaking (pauses shorter than MERGE are filled)."""
    act = active_loudness(voice, sr) or -20.0
    w = max(1, int(round(STEP * sr)))
    n = int(np.ceil(len(voice) / w))
    pad = np.pad(voice, (0, n * w - len(voice)))
    lvl = _db(np.sqrt((pad.reshape(n, w) ** 2).mean(1)))
    on = lvl > max(-50.0, act - gate_below_active)
    gap = int(round(MERGE / STEP))
    idx = np.flatnonzero(on)
    for a, b in zip(idx[:-1], idx[1:]):
        if 1 < b - a <= gap:
            on[a:b] = True
    return on


def duck_curve(on, attack=ATTACK, release=RELEASE):
    """0..1 duck amount per frame with raised-cosine attack (before speech) and release (after)."""
    n = len(on)
    ease = lambda x: 0.5 - 0.5 * np.cos(np.pi * np.clip(x, 0, 1))
    big = 1e9
    since = np.full(n, big); until = np.full(n, big)
    last = -big
    for i in range(n):
        if on[i]: last = i
        since[i] = (i - last) * STEP
    nxt = big
    for i in range(n - 1, -1, -1):
        if on[i]: nxt = i
        until[i] = (nxt - i) * STEP
    d = np.where(on, 1.0, 0.0)
    d = np.maximum(d, np.where(until < attack, ease(1 - until / attack), 0))
    d = np.maximum(d, np.where(since < release, ease(1 - since / release), 0))
    return d


def engine_music(voice, music, sr, volume=REF_VOLUME, duck=True, fade_in=0.8, fade_out=1.6):
    """Return `music` scaled and ducked under `voice` exactly like the engine. Keeps the music's shape."""
    v = np.asarray(voice, float)
    if v.ndim == 2:
        v = v.mean(axis=1 if v.shape[1] in (1, 2) else 0)
    m = np.asarray(music, float)
    stereo_last = m.ndim == 2 and m.shape[1] in (1, 2) and m.shape[0] > 2
    mono_m = m if m.ndim == 1 else (m.mean(1) if stereo_last else m.mean(0))
    N = len(mono_m)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    voice_db = active_loudness(v, sr) if np.any(v) else None
    voice_db = -20.0 if voice_db is None else voice_db
    music_db = active_loudness(mono_m, sr, gate=-60.0)
    if music_db is None:
        return m * 0
    base = voice_db - UNDER_VOICE_DB + _db(max(1e-4, volume / REF_VOLUME)) - music_db
    frames = int(np.ceil(N / (STEP * sr)))
    d = duck_curve(speech_mask(v, sr)[:frames]) if duck and np.any(v) else np.zeros(frames)
    d = np.pad(d, (0, max(0, frames - len(d))))
    t = np.arange(frames) * STEP
    total = N / sr
    fade = np.minimum(1, np.minimum(t / fade_in if fade_in else 1, np.maximum(0, (total - t) / fade_out) if fade_out else 1))
    g_db = base - DUCK_DB * d + _db(np.maximum(1e-4, fade))
    g = np.interp(np.arange(N) / sr, t, 10 ** (g_db / 20))
    if m.ndim == 1:
        return m * g
    return m * (g[:, None] if stereo_last else g[None, :])


def describe(volume=REF_VOLUME):
    under = UNDER_VOICE_DB - 20 * np.log10(volume / REF_VOLUME)
    return f"music {under:.0f} dB under the voice, {under + DUCK_DB:.0f} dB while words are spoken (engine ducking)"
