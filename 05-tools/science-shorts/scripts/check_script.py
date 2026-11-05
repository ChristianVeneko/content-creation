"""check_script.py: check script.json against the format before spending time on the voice.

    PY check_script.py [--project P]

Writing the script is Claude's job (reference/style.md, the facts in sources.md); this catches what breaks the format:
  - 130-230 spoken words, an estimated 45-80 s at the voice's pace (about 179 words a minute with the gaps at speed 0.9);
  - a title card ("title" in script.json, 2 short lines) and line 1 a short claim or question, 12 words or fewer;
  - "you" / "your" at least twice (the format talks to the viewer), at least three numbers on screen;
  - a turn: a line opening on But / So why / So how / Besides / Actually / Until / Meanwhile;
  - the last line short (14 words or fewer): the punchline lands and the video ends;
  - no digits in `say` (the voice misreads them: "five-hundred"), and `show` has one word per spoken word;
  - hand-cut chunks (`|`) of 2-4 words (5 is a judgement call).
FAIL stops the voice from being worth recording; WARN is a judgement call.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import project

TURNS = ("but", "so why", "so how", "so what", "besides", "actually", "until", "meanwhile", "yet", "except",
         "pero", "entonces", "asi que", "y si", "ademas", "hasta que", "mientras", "aunque", "sin embargo", "o sea")


def main():
    P = project()
    spec = json.load(open(os.path.join(P, "script.json"), encoding="utf-8"))
    lines = spec.get("lines", [])
    rows = []
    add = lambda status, what, detail: rows.append((status, what, detail))
    clean = lambda s: s.replace("|", " ").split()
    words = [w for ln in lines for w in clean(ln["say"])]
    n = len(words)
    secs = n / 179 * 60 * 0.9 / max(0.5, spec.get("speed", 0.9))
    add("PASS" if 130 <= n <= 230 else "FAIL", "spoken words", "%d (the format: 130-230; the references run 201-213)" % n)
    add("PASS" if 45 <= secs <= 80 else "WARN", "estimated length", "%.0f s (45-80 s; narrate.py measures it exactly)" % secs)
    title = spec.get("title") or []
    add("PASS" if title and len(title) <= 3 and all(len(t.split()) <= 5 for t in title) else "FAIL", "title card",
        " / ".join(title) if title else 'missing: add "title": ["This Cloud Weighs", "100 Elephants!"] to script.json')
    n1 = len(clean(lines[0]["say"])) if lines else 0
    add("PASS" if 0 < n1 <= 12 else "FAIL", "line 1", "%d words: %s (a short claim or question, said over the title)" % (n1, lines[0]["say"].replace("| ", "")[:80] if lines else ""))
    you = sum(1 for w in words if re.sub(r"[^a-z]", "", w.lower()) in ("you", "your", "youre", "yourself", "tu", "tus", "te", "ti", "contigo", "tú"))
    add("PASS" if you >= 2 else "WARN", "talks to the viewer", '%d x "you/your" (2 or more)' % you)
    shown = [w for ln in lines for w in clean(ln.get("show", ln["say"]))]
    nums = [w for w in shown if re.search(r"\d", w)] + [w for w in words if re.sub(r"[^a-z-]", "", w.lower()) in ("million", "billion", "trillion", "thousand", "hundred", "half", "mil", "millones", "millon", "cien", "medio", "cincuenta")]
    add("PASS" if len(nums) >= 3 else "WARN", "numbers", "%d numbers on screen or said (3 or more: the format runs on numbers)" % len(nums))
    turn = [i for i, ln in enumerate(lines) if any(__import__("unicodedata").normalize("NFKD", " ".join(clean(ln["say"])).lower()).encode("ascii", "ignore").decode().startswith(t) for t in TURNS)]
    add("PASS" if turn else "WARN", "a turn", "lines %s open on a turn" % turn if turn else "no line opens on But / So why / Besides / Until ...")
    nl = len(clean(lines[-1]["say"])) if lines else 0
    add("PASS" if nl <= 14 else "WARN", "last line", "%d words (14 or fewer: land the punchline and stop)" % nl)
    digits = [ln["say"] for ln in lines if re.search(r"\d", ln["say"])]
    add("FAIL" if digits else "PASS", "digits in say", "; ".join(d[:50] for d in digits) or "none")
    bad_show = [i for i, ln in enumerate(lines) if ln.get("show") and len(clean(ln["show"])) != len(clean(ln["say"]))]
    add("FAIL" if bad_show else "PASS", "show vs say", "word counts differ on lines %s" % bad_show if bad_show else "one caption word per spoken word")
    chunks = [c.split() for ln in lines if "|" in ln["say"] for c in ln["say"].split("|") if c.strip()]
    odd = [" ".join(c) for c in chunks if not 2 <= len(c) <= 4]
    add("WARN" if odd else "PASS", "hand-cut chunks", ("not 2-4 words: " + " / ".join(odd[:6])) if odd else ("%d chunks of 2-4 words" % len(chunks) if chunks else "none (narrate.py cuts them)"))
    for st, what, detail in rows:
        print("%-5s %-20s %s" % (st, what, detail))
    if any(r[0] == "FAIL" for r in rows):
        sys.exit(1)


if __name__ == "__main__":
    main()
