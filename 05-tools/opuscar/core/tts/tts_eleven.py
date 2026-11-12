"""ElevenLabs voice (online, any language): python core/tts/tts_eleven.py lines.json out_dir [--flow]
--flow (use it for narration): the whole script is spoken in ONE request, so intonation and breathing run across
  lines like a real read instead of N separate takes glued together. The audio is then cut at the pauses between
  lines, so every line still gets its own <id>.wav; play them back to back (out_dir/starts.json gives each line's
  start, gap 0) and the read sounds exactly as generated. Also writes out_dir/flow.wav (the whole read).
  Speed comes from the first line's "speed" (default 1.0; 1.0-1.08 sounds natural, 1.15 sounds rushed).
lines.json = [{"id":..., "text":..., "say"?:..., "voice"?:..., "speed"?:1.0, "model"?:...}, ...]
  "text" is what the captions show; "say" (optional) is what is spoken when it differs (numbers, acronyms).
  Defaults: voice $ELEVENLABS_VOICE (else WFmom5vWeiir6CN1crV3), speed 1.0 (0.7-1.2), model eleven_multilingual_v2.
Writes out_dir/<id>.wav (24 kHz mono, leading/trailing silence trimmed), out_dir/dur.json, and out_dir/words.json
  ({id: [[word, start, end], ...]} in seconds from the start of the trimmed WAV, same layout as asr_check.py), taken
  from ElevenLabs character timestamps, so no Whisper pass is needed for timing.
Same interface and outputs as tts.py. Needs ELEVENLABS_API_KEY (the repo's .env, loaded by env.sh) and ffmpeg.
Credits: every line is cached in out_dir/.cache/ by text+voice+speed+model, so re-running never pays twice.
"""
import base64, hashlib, json, os, shutil, subprocess, sys, urllib.error, urllib.request
if len(sys.argv) < 3 or sys.argv[1] in ('-h', '--help'):
    print(__doc__); sys.exit(0 if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help') else 2)
import numpy as np, soundfile as sf

SR = 24000
FLOW = '--flow' in sys.argv[3:]
lines, out = json.load(open(sys.argv[1], encoding='utf-8')), sys.argv[2]
key = os.environ.get('ELEVENLABS_API_KEY')
if not key: sys.exit('tts_eleven.py: ELEVENLABS_API_KEY is not set (put it in .env and run `source ./env.sh`)')
ff = shutil.which('ffmpeg') or sys.exit('tts_eleven.py: ffmpeg is not on PATH')
VOICE = os.environ.get('ELEVENLABS_VOICE', 'WFmom5vWeiir6CN1crV3')
bad = [str(L.get('id')) for L in lines if not L.get('id') or not str(L.get('text', '')).strip()]
if bad: sys.exit(f"tts_eleven.py: every line needs an id and a text (check: {', '.join(bad)})")
cache = os.path.join(out, '.cache'); os.makedirs(cache, exist_ok=True)


def synth(L):
    """one line -> (ElevenLabs JSON with audio_base64 and alignment); cached on disk"""
    text = str(L.get('say') or L['text']).strip()
    voice, model = L.get('voice') or VOICE, L.get('model') or 'eleven_multilingual_v2'
    speed = max(0.7, min(1.2, float(L.get('speed', 1.0))))
    h = hashlib.sha1(json.dumps([text, voice, speed, model]).encode()).hexdigest()[:16]
    path = os.path.join(cache, h + '.json')
    if os.path.exists(path): return json.load(open(path, encoding='utf-8'))
    body = json.dumps({'text': text, 'model_id': model,
                       'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.15,
                                          'use_speaker_boost': True, 'speed': speed}}).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
        data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    try: d = json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e: sys.exit(f"tts_eleven.py: ElevenLabs refused line '{L['id']}': {e.code} {e.read()[:300]!r}")
    except urllib.error.URLError as e: sys.exit(f'tts_eleven.py: network unreachable ({e.reason})')
    json.dump(d, open(path, 'w', encoding='utf-8'))
    return d


def words_of(al):
    """character timestamps -> [(word, start, end)]"""
    ws, cur, s0, e0 = [], '', None, None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur: ws.append((cur, s0, e0))
            cur, s0 = '', None
        else:
            if s0 is None: s0 = a
            cur += c; e0 = b
    if cur: ws.append((cur, s0, e0))
    return ws


os.makedirs(out, exist_ok=True); dur, words = {}, {}


def decode(d):
    mp3 = os.path.join(cache, 'tmp.mp3'); open(mp3, 'wb').write(base64.b64decode(d['audio_base64']))
    pcm = subprocess.run([ff, '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    os.remove(mp3)
    return np.frombuffer(pcm, np.float32).copy()


def display_words(L, spoken):
    """captions show L['text']; when 'say' differs, put the text's words on the spoken timing"""
    shown = str(L['text']).split()
    if not L.get('say') or [w for w, _, _ in spoken] == shown: return spoken
    if not spoken: return []
    if len(shown) == len(spoken): return [(w, a, b) for w, (_, a, b) in zip(shown, spoken)]
    t0, t1 = spoken[0][1], spoken[-1][2]; n = sum(len(w) for w in shown) or 1; out_, c = [], 0
    for w in shown:
        a = t0 + (t1 - t0) * c / n; c += len(w); out_.append((w, round(a, 3), round(t0 + (t1 - t0) * c / n, 3)))
    return out_


if FLOW:
    texts = [str(L.get('say') or L['text']).strip() for L in lines]
    full = ' '.join(texts)
    spans, i = [], 0
    for t in texts: spans.append((i, i + len(t))); i += len(t) + 1
    d = synth({'id': 'flow', 'text': full, 'voice': lines[0].get('voice'), 'speed': lines[0].get('speed', 1.0),
               'model': lines[0].get('model')})
    al = d['alignment']; ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    if len(ch) != len(full):  # map by proportion if the service changed the text length
        r = len(ch) / len(full); spans = [(int(a * r), max(int(a * r) + 1, int(b * r))) for a, b in spans]
    a = decode(d); n = len(a)
    nz = np.where(np.abs(a) > (np.abs(a).max() if n else 0) * .02)[0]
    head = max(0, (nz[0] if len(nz) else 0) - int(.03 * SR)) / SR
    def last_end(lo, hi):
        for k in range(hi - 1, lo - 1, -1):
            if not ch[k].isspace(): return en[k]
        return st[lo]
    def first_start(lo, hi):
        for k in range(lo, hi):
            if not ch[k].isspace(): return st[k]
        return st[lo]
    cuts = [head]
    for k in range(len(spans) - 1):
        e, s2 = last_end(*spans[k]), first_start(*spans[k + 1])
        cuts.append(max(e + .02, (e + s2) / 2) if s2 > e else e)
    cuts.append(min(n / SR, last_end(*spans[-1]) + .15))
    starts, pos = {}, 0.0
    for k, L in enumerate(lines):
        c0, c1 = cuts[k], cuts[k + 1]; seg = a[int(c0 * SR): int(c1 * SR)]
        sf.write(os.path.join(out, L['id'] + '.wav'), seg, SR); dur[L['id']] = round(len(seg) / SR, 3)
        lo, hi = spans[k]; ws, cur, s0, e0 = [], '', None, None
        for j in range(lo, min(hi, len(ch))):
            if ch[j].isspace():
                if cur: ws.append((cur, s0, e0))
                cur, s0 = '', None
            else:
                if s0 is None: s0 = st[j]
                cur += ch[j]; e0 = en[j]
        if cur: ws.append((cur, s0, e0))
        spoken = [(w, round(max(0, s - c0), 3), round(max(0, e - c0), 3)) for w, s, e in ws]
        words[L['id']] = display_words(L, spoken)
        starts[L['id']] = round(pos, 3); pos += dur[L['id']]
        print(L['id'], dur[L['id']], L['text'])
    sf.write(os.path.join(out, 'flow.wav'), a[int(head * SR): int(cuts[-1] * SR)], SR)
    json.dump(starts, open(os.path.join(out, 'starts.json'), 'w', encoding='utf-8'), indent=1)
else:
    for L in lines:
        d = synth(L)
        a = decode(d)
        nz = np.where(np.abs(a) > (np.abs(a).max() if len(a) else 0) * .02)[0]
        t0 = 0
        if len(nz): t0 = max(0, nz[0] - int(.03 * SR)); a = a[t0: nz[-1] + int(.08 * SR)]
        else: print('warning: line', L['id'], 'is silent', file=sys.stderr)
        off = t0 / SR
        sf.write(os.path.join(out, L['id'] + '.wav'), a, SR); dur[L['id']] = round(len(a) / SR, 3)
        words[L['id']] = display_words(L, [(w, round(max(0, s - off), 3), round(max(0, e - off), 3)) for w, s, e in words_of(d['alignment'])])
        print(L['id'], dur[L['id']], L['text'])
json.dump(dur, open(os.path.join(out, 'dur.json'), 'w', encoding='utf-8'), indent=1)
json.dump(words, open(os.path.join(out, 'words.json'), 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
