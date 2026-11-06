"""ElevenLabs voice (online, any language): python core/tts/tts_eleven.py lines.json out_dir
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
for L in lines:
    d = synth(L)
    mp3 = os.path.join(cache, 'tmp.mp3'); open(mp3, 'wb').write(base64.b64decode(d['audio_base64']))
    pcm = subprocess.run([ff, '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(pcm, np.float32)
    nz = np.where(np.abs(a) > (np.abs(a).max() if len(a) else 0) * .02)[0]
    t0 = 0
    if len(nz): t0 = max(0, nz[0] - int(.03 * SR)); a = a[t0: nz[-1] + int(.08 * SR)]
    else: print('warning: line', L['id'], 'is silent', file=sys.stderr)
    off = t0 / SR
    sf.write(os.path.join(out, L['id'] + '.wav'), a, SR); dur[L['id']] = round(len(a) / SR, 3)
    words[L['id']] = [(w, round(max(0, s - off), 3), round(max(0, e - off), 3)) for w, s, e in words_of(d['alignment'])]
    print(L['id'], dur[L['id']], L['text'])
os.remove(os.path.join(cache, 'tmp.mp3')) if os.path.exists(os.path.join(cache, 'tmp.mp3')) else None
json.dump(dur, open(os.path.join(out, 'dur.json'), 'w', encoding='utf-8'), indent=1)
json.dump(words, open(os.path.join(out, 'words.json'), 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
