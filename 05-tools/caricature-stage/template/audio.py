# Voice on the timeline + SFX track for the caricature film.
import json, sys, os, unicodedata, re
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.join(os.environ['LEMO_OPUSCAR_HOME'], 'core', 'audio'))
import sfx
SR = sfx.SR
LEAD, TAIL = 0.35, 1.4
here = os.path.dirname(os.path.abspath(__file__))
V = os.path.join(here, 'voices_t')
LIB = os.path.join(here, '..', '..', '..', '03-assets', 'sfx')
starts = json.load(open(f'{V}/starts.json')); durs = json.load(open(f'{V}/dur.json')); words = json.load(open(f'{V}/words.json'))
ids = sorted(starts, key=starts.get)
ST = {i: starts[i] + LEAD for i in ids}
total = ST[ids[-1]] + durs[ids[-1]] + TAIL
n = lambda w: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', w.lower()).encode('ascii', 'ignore').decode())
def at(i, w, k=0):
    seen = 0
    for x, s, e in words[i]:
        if n(x).startswith(n(w)):
            if seen == k: return ST[i] + s
            seen += 1
    raise SystemExit(f'no word {w} in {i}')

def load(path):
    x, sr = sf.read(path)
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    return x

_cache = {}
def S(name):
    if name not in _cache: _cache[name] = sfx.norm(load(os.path.join(LIB, name)))
    return _cache[name]

N = int(total * SR) + SR
voice = np.zeros(N)
for i in ids:
    x = load(f'{V}/{i}.wav'); a = int(ST[i] * SR); voice[a:a + len(x)] += x
fx = np.zeros((N, 2))
def add(x, t, g=1.0, pan=0.0): sfx.add(fx, x, max(0, t), g, pan)

def slap(v=1.0):
    d = 0.22; crack = sfx.norm(sfx.hp(sfx.noise(d) * sfx.env_exp(d, 0.018), 1500))
    body = S('impact/impactPunch_heavy_002.ogg')[:len(crack) * 3]
    out = np.zeros(max(len(crack), len(body))); out[:len(body)] += body * 0.8; out[:len(crack)] += crack
    return out * v
stamp = lambda: S('impact/impactPlank_medium_002.ogg')
whoosh = lambda k=1: S(f'generated/whoosh-{k}.wav')
pop = lambda k=1: S(f'generated/pop-{k}.wav')
paper = lambda k=1: S(f'casino/card-slide-{k}.ogg')
coins = lambda k=1: S(f'casino/chips-collide-{k}.ogg')
def kaching():
    a = S('casino/chips-handle-1.ogg'); b = sfx.ding(1.4) * 0.8
    o = np.zeros(max(len(a), len(b) + 2400)); o[:len(a)] += a; o[2400:2400 + len(b)] += b; return o
def buzz(d, v=1.0):
    t = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * 120 * t) * 0.6 + np.sin(2 * np.pi * 240 * t) * 0.3 + sfx.noise(d) * 0.05) * v



for k, i in enumerate(ids[1:]): add(whoosh(k % 3 + 1), ST[i] + 0.45 - 0.12, 0.55, (-0.4, 0.4)[k % 2])
punch = lambda k: S('impact/impactPunch_heavy_00%d.ogg' % (k % 5))
punchm = lambda k: S('impact/impactPunch_medium_00%d.ogg' % (k % 5))
def steps(t0, n, g=0.4):
    for k in range(n): add(S('impact/footstep_carpet_00%d.ogg' % (0, 3, 4)[k % 3]), t0 + k * 0.13, g, (k % 2 - 0.5))
def fire(d, v=1.0):
    tt = np.arange(int(d * SR)) / SR
    x = sfx.lp(sfx.noise(d), 900) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3 * tt))) + sfx.noise(d) * 0.05
    return sfx.norm(x) * np.minimum(1, tt * 4) * np.minimum(1, (d - tt) * 3) * v
# EVENTS (one block per line id; time every sound to a word with at(id, word))
# SFX about 12 dB under the voice peaks
fx *= (np.abs(voice).max() * 0.25) / np.abs(fx).max()
sf.write(f'{here}/voice.wav', voice[:int(total * SR)], SR)
sf.write(f'{here}/sfx.wav', fx[:int(total * SR)], SR)
json.dump(ST, open(f'{here}/line-starts.json', 'w'), indent=1)
print(round(total, 2))
