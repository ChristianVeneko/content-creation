# Shorten long pauses inside each narration line and retime words.json to match.
# usage: python tighten.py voices voices_t [--max 0.2] [--edge 0.04]
import json, os, sys
import numpy as np, soundfile as sf

src, dst = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
MAX = float(args[args.index('--max') + 1]) if '--max' in args else 0.2
EDGE = float(args[args.index('--edge') + 1]) if '--edge' in args else 0.04
os.makedirs(dst, exist_ok=True)
words = json.load(open(f'{src}/words.json'))
starts = json.load(open(f'{src}/starts.json'))
ids = sorted(starts, key=starts.get)
out_words, out_dur, out_starts, t = {}, {}, {}, 0.0
saved = 0.0
for i in ids:
    x, sr = sf.read(f'{src}/{i}.wav')
    if x.ndim > 1: x = x.mean(1)
    hop = int(sr * 0.01)
    rms = np.array([np.sqrt(np.mean(x[k:k + hop] ** 2)) for k in range(0, len(x), hop)])
    quiet = rms < 10 ** (-40 / 20)
    # silent runs (in frames)
    runs, k = [], 0
    while k < len(quiet):
        if quiet[k]:
            j = k
            while j < len(quiet) and quiet[j]: j += 1
            runs.append((k, j)); k = j
        else: k += 1
    # keep list of (old_start, old_end) segments, and a piecewise map
    cuts = []  # (old_a, old_b) removed spans in seconds
    n = len(quiet)
    for a, b in runs:
        da, db = a * 0.01, b * 0.01
        if a == 0:
            if db > EDGE: cuts.append((0, db - EDGE))
        elif b >= n:
            if db - da > EDGE: cuts.append((da + EDGE, len(x) / sr))
        elif db - da > MAX:
            cuts.append((da + MAX / 2, db - MAX / 2))
    cuts = [c for c in cuts if c and c[1] > c[0]]
    keep_mask = np.ones(len(x), bool)
    for a, b in cuts: keep_mask[int(a * sr):int(b * sr)] = False
    y = x[keep_mask]
    sf.write(f'{dst}/{i}.wav', y, sr)
    def remap(tt):
        r = tt
        for a, b in cuts:
            if tt >= b: r -= (b - a)
            elif tt > a: r -= (tt - a)
        return max(0.0, r)
    out_words[i] = [[w, round(remap(s), 3), round(remap(e), 3)] for w, s, e in words[i]]
    d = len(y) / sr
    out_dur[i] = round(d, 3); out_starts[i] = round(t, 3); t += d
    saved += len(x) / sr - d
json.dump(out_words, open(f'{dst}/words.json', 'w'), ensure_ascii=False)
json.dump(out_dur, open(f'{dst}/dur.json', 'w'), indent=1)
json.dump(out_starts, open(f'{dst}/starts.json', 'w'), indent=1)
print(f'saved {saved:.2f}s, new total {t:.2f}s')
