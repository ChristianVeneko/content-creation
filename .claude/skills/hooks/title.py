#!/usr/bin/env python3
"""title.py - lint a short's title and cover text as one pairing before you publish it.

    python3 title.py --title "..." --cover "LA IA LO ROMPIÓ"   (--thumb is an alias of --cover)
    python3 title.py titles.txt [--cover "..."]                 # one title per line, ranked
    python3 title.py --title "..." --json

The pairing is the unit, not the title. A title that repeats the cover text wastes half the click
surface, and that is the single most common mistake this checks for.

Length: YouTube cuts titles near 60 characters on desktop and near 40 on a mobile feed; Shorts,
Reels and TikTok overlay the caption on the video, so the first 40 characters carry the subject.

Adapted from youtube-agent-skill by Jake Schincariol (MIT), see THIRD_PARTY.md. Changes: Spanish
word lists, accented words, --cover alias, cover text is the short's cover.jpg headline.
"""
import json, re, sys, os

DESKTOP, MOBILE, HARD = 60, 40, 100
VAGUE = {"amazing","incredible","insane","crazy","huge","massive","ultimate","best","powerful",
         "secret","revolutionary","mindblowing","epic","perfect","complete","everything",
         "increíble","brutal","épico","loco","enorme","definitivo","mejor","poderoso","secreto",
         "revolucionario","impresionante","alucinante","perfecto","completo","todo"}
STOP = {"the","a","an","of","for","to","in","on","and","or","is","are","with","your","you","my","i",
        "this","that","it","how","what","why",
        "el","la","los","las","un","una","de","del","para","por","en","y","o","es","son","con","tu",
        "tus","mi","yo","este","esta","esto","eso","lo","que","cómo","qué","por","se","te","al","a"}

def words(t): return re.findall(r"[a-z0-9áéíóúüñ']+", t.lower())

def check(title, cover=None):
    t = title.strip()
    n = len(t)
    issues, good = [], []
    if n > HARD: issues.append(("length", f"{n} characters - the hard limit is {HARD}"))
    elif n > DESKTOP: issues.append(("length", f"{n} characters - desktop cuts near {DESKTOP}"))
    else: good.append(f"{n} characters, inside the {DESKTOP}-character desktop cut")
    if n > MOBILE:
        head = t[:MOBILE].rsplit(" ", 1)[0]
        issues.append(("mobile", f'a mobile feed shows about "{head}..." - check the subject survives'))
    caps = [w for w in t.split() if len(w) > 2 and w.isupper()]
    if len(caps) > 2: issues.append(("shouting", f"{len(caps)} all-caps words - two is the ceiling before it reads as spam"))
    elif caps: good.append(f"{len(caps)} all-caps word for emphasis")
    v = [w for w in words(t) if w in VAGUE]
    if v: issues.append(("vague", f"{', '.join(sorted(set(v)))} - swap for a number, a name or a date"))
    nums = re.findall(r"\d[\d,.]*%?", t)
    if nums: good.append(f"carries a concrete figure ({', '.join(nums[:3])})")
    else: issues.append(("no-number", "no number, date or name - the most reliable single fix"))
    if t.endswith("?"): good.append("open question in the title")
    front = [w for w in words(t)[:3] if w not in STOP]
    if not front: issues.append(("front-load", "the first three words are all filler - move the subject forward"))
    if cover:
        tw, hw = set(words(t)) - STOP, set(words(cover)) - STOP
        shared = tw & hw
        if shared:
            issues.append(("duplicate", f"cover repeats the title on {', '.join(sorted(shared))} - "
                                        "the cover should say what the title does not"))
        else:
            good.append("cover and title carry different words")
        if len(words(cover)) > 4:
            issues.append(("cover-length", f"{len(words(cover))} words on the cover - three is the ceiling at feed size"))
    score = max(0, min(100, 100 - 14 * len(issues) + 4 * len(good)))
    return {"title": t, "chars": n, "score": score, "issues": issues, "good": good}

def show(r):
    print(f'\n  "{r["title"]}"')
    print(f"  {r['chars']} chars   score {r['score']}/100")
    for k, m in r["issues"]: print(f"    x  {k:<12} {m}")
    for m in r["good"]:      print(f"    ok              {m}")

def main():
    a = sys.argv[1:]
    as_json = "--json" in a; a = [x for x in a if x != "--json"]
    key = "--cover" if "--cover" in a else "--thumb" if "--thumb" in a else None
    cover = a[a.index(key) + 1] if key else None
    if "--title" in a:
        rows = [check(a[a.index("--title") + 1], cover)]
    elif a and os.path.exists(a[0]):
        rows = [check(l, cover) for l in open(a[0], encoding="utf-8").read().splitlines() if l.strip()]
    else:
        print(__doc__); sys.exit(1)
    rows.sort(key=lambda r: -r["score"])
    if as_json: print(json.dumps(rows, indent=1, ensure_ascii=False)); return
    for r in rows: show(r)
    print()

if __name__ == "__main__":
    main()
