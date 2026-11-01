#!/usr/bin/env python3
"""hookscore.py - score a short-form hook (the spoken line of the first 3 s) before writing the spec.

Five properties, 0-100 each, and a verdict that is 60% the mean and 40% the weakest one. The
weakest-link weighting is deliberate: a hook with four strong properties and one dead one leaks at
the dead one, and averaging hides that.

    python3 hookscore.py hooks.txt              # one hook per line, ranked
    python3 hookscore.py --hook "one line"      # score a single hook
    python3 hookscore.py --json hooks.txt       # machine-readable
    python3 hookscore.py --lang es|en ...       # force the language (default: auto-detect)
    python3 hookscore.py --formulas [--lang es] # the 21 formulas, one line each

A low score is a reason to look again, never a high score a promise. Upstream measured the
original against 74 real short-form hooks: it separates bad hooks from real ones well, and a
creator's own hits from their own misses barely at all.

Adapted from youtube-agent-skill by Jake Schincariol (MIT), see THIRD_PARTY.md. Changes: Spanish
word lists and formula patterns, a 5-12 word brevity band for a 3-second spoken hook, --lang,
--formulas.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FORMULAS = json.load(open(os.path.join(HERE, "hooks.json"), encoding="utf-8"))["hooks"]

LEX = {
 "en": dict(
  filler={"basically","actually","literally","just","really","very","so","kind","sort","like",
          "guys","hey","welcome","today","video","subscribe","channel"},
  vague={"amazing","incredible","insane","crazy","huge","massive","game","changer","secret",
         "powerful","ultimate","best","revolutionary","mind","blowing","unbelievable"},
  you=r"\b(you|your|you're|youre|yourself)\b",
  stake=r"\b(lose|lost|wasting|waste|quit|fail|broke|cost|risk|before|stop|never|die|dying|dead)\b",
  curiosity=r"\b(why|how|what|which|until|before|but|nobody|almost|except|reason|actually)\b",
  closed=r"\b(because|so that|which means)\b",
  units=r"second|minute|hour|day|week|month|year"),
 "es": dict(
  filler={"básicamente","literalmente","realmente","muy","solo","bueno","pues","hola","chicos",
          "gente","hoy","video","suscríbete","canal","así","tipo","onda","vaina"},
  vague={"increíble","brutal","épico","loco","locura","enorme","secreto","poderoso","definitivo",
         "mejor","revolucionario","impresionante","alucinante","bestial","tremendo","top"},
  you=r"\b(tú|tu|tus|te|ti|contigo|usted|vos|estás|haces|sabes|puedes|tienes|necesitas|usas|cometes|eres|sigues|quieres)\b",
  stake=r"\b(perd\w*|pierd\w*|empeor\w*|gast\w*|error|errores|cuesta|costar|riesgo|antes|deja|dejes|nunca|jamás|rompe|rompiste|roto|falla|fallar|borr\w*|peligro|despid\w*|nadie)\b",
  curiosity=r"(\bpor qué\b|\bcómo\b|\bqué\b|\bcuál\b|\bhasta\b|\bpero\b|\bnadie\b|\bcasi\b|\bexcepto\b|\brazón\b|\ben realidad\b|\bresulta\b)",
  closed=r"\b(porque|así que|lo que significa|por eso)\b",
  units=r"segundo|minuto|hora|día|semana|mes|año"),
}
ES_HINT = re.compile(r"[áéíóúñ¿¡]|\b(que|el|la|los|las|de|tu|es|por|para|con|una|un|y|no|lo|te)\b", re.I)
EN_HINT = re.compile(r"\b(the|you|your|is|are|to|of|and|this|that|it|with|for)\b", re.I)

def detect(t): return "es" if len(ES_HINT.findall(t)) >= len(EN_HINT.findall(t)) else "en"

def words(t): return re.findall(r"[a-z0-9áéíóúüñ'%$.]+", t.lower())

def concrete(L):
    return re.compile(r"\b(\d[\d,.]*\s?(%|k|m|x|s|h)?|\$\d|\d+\s?(" + L["units"] + r")s?)", re.I)

def specificity(t, L):
    w = words(t)
    if not w: return 0
    nums = len(concrete(L).findall(t))
    vague = sum(1 for x in w if x in L["vague"])
    filler = sum(1 for x in w if x in L["filler"])
    s = 34 + nums * 22 - vague * 16 - filler * 5
    # proper nouns that are not sentence-initial read as named things (Claude, GPT, Git)
    s += min(18, 6 * sum(1 for x in t.split()[1:] if x[:1].isupper()))
    return max(0, min(100, s))

def address(t, L):
    n = len(re.findall(L["you"], t, re.I))
    first = 30 if re.search(L["you"], " ".join(t.split()[:6]), re.I) else 0
    return max(0, min(100, 26 + n * 20 + first))

def stakes(t, L):
    n = len(re.findall(L["stake"], t, re.I))
    return max(0, min(100, 22 + n * 26 + (14 if concrete(L).search(t) else 0)))

def curiosity(t, L):
    n = len(re.findall(L["curiosity"], t, re.I))
    q = 18 if t.strip().endswith("?") else 0
    closed = -18 if re.search(L["closed"], t, re.I) else 0  # a hook that resolves itself has no gap left
    return max(0, min(100, 24 + n * 17 + q + closed))

def brevity(t, L):
    n = len(words(t))
    if n == 0: return 0
    # short-form: the spoken hook lands inside 3 s, about 5-12 words at TTS pace
    if 5 <= n <= 12: return 100
    if n < 5: return max(30, 100 - (5 - n) * 14)
    return max(10, 100 - (n - 12) * 9)

PROPS = [("SPECIFICITY", specificity), ("ADDRESS", address), ("STAKES", stakes),
         ("CURIOSITY", curiosity), ("BREVITY", brevity)]

def classify(t, lang):
    best, hits = None, 0
    for f in FORMULAS:
        pats = f["match"] + (f.get("match_es", []) if lang == "es" else [])
        n = sum(1 for p in pats if re.search(p, t, re.I))
        if n > hits: best, hits = f, n
    return (best["name"] if best else "Unclassified"), hits

def score(t, lang):
    L = LEX[lang]
    parts = {n: fn(t, L) for n, fn in PROPS}
    vals = list(parts.values())
    verdict = round(0.6 * (sum(vals) / len(vals)) + 0.4 * min(vals))
    name, hits = classify(t, lang)
    return parts, verdict, name, hits

def band(v): return "STRONG" if v >= 72 else "WORKABLE" if v >= 55 else "WEAK"

FIX = {
 "SPECIFICITY": "swap one adjective for a number, a name or a date",
 "ADDRESS": "say 'you' (tú/te/tu) in the first six words",
 "STAKES": "name what it costs them to keep doing it the current way",
 "CURIOSITY": "cut the half of the sentence that answers itself",
 "BREVITY": "5 to 12 words: it has to be said in under 3 seconds",
}

def report(r):
    t = r["hook"]
    print(f"\n  {t}")
    print(f"  {'-' * min(72, max(20, len(t)))}")
    for k, v in r["properties"].items():
        print(f"    {k:<12} {v:3d}  {'#' * (v // 5)}")
    print(f"    {'VERDICT':<12} {r['verdict']:3d}  {r['band']}")
    hits = r["matched"]
    print(f"    formula      {r['formula']}" + (f"  ({hits} pattern{'s' if hits != 1 else ''} matched)" if hits else "  (no formula matched - that is usually a summary, not a hook)"))
    low = min(r["properties"], key=r["properties"].get)
    print(f"    weakest      {low} - {FIX[low]}")

def main():
    a = sys.argv[1:]
    as_json = "--json" in a
    a = [x for x in a if x != "--json"]
    lang = None
    if "--lang" in a:
        i = a.index("--lang"); lang = a[i + 1]; del a[i:i + 2]
    if "--formulas" in a:
        for f in FORMULAS:
            print(f"{f['name']}: {f['shape']}")
        return
    if "--hook" in a:
        lines = [a[a.index("--hook") + 1]]
    elif a and os.path.exists(a[0]):
        lines = [l for l in open(a[0], encoding="utf-8").read().splitlines() if l.strip()]
    else:
        print(__doc__); sys.exit(1 if not a else 0)
    out = []
    for t in lines:
        lg = lang or detect(t)
        parts, verdict, name, hits = score(t, lg)
        out.append({"hook": t.strip(), "lang": lg, "properties": parts, "verdict": verdict,
                    "band": band(verdict), "formula": name, "matched": hits})
    out.sort(key=lambda r: -r["verdict"])
    if as_json:
        print(json.dumps([{k: v for k, v in r.items() if k != "matched"} for r in out], indent=1, ensure_ascii=False)); return
    for r in out:
        report(r)
    if len(out) > 1:
        print(f"\n  winner: {out[0]['hook']}  ({out[0]['verdict']}, {out[0]['band']})\n")

if __name__ == "__main__":
    main()
