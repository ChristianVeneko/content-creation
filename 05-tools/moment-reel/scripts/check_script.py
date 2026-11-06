"""check_script.py: check script.json against the story formula before spending time on the voice.

    PY check_script.py [--project P]

Writing the script is Claude's job (reference/story_formula.md, the facts in sources.md); this catches what breaks the format:
  - 90-140 spoken words, an estimated 30-50 s at the voice's pace (about 178 words a minute with the gaps);
  - line 1 is the act and opens with "He" (or "She" / "They");
  - the context opens with "You see," and the chain moves on hinge words (Then, So, But, Suddenly, ...), at least three;
  - no digits in `say` (the voice misreads them: "nineteen-eighty-six"), and `show` has one word per spoken word;
  - hand-cut chunks (`|`) of 2-4 words, so a caption never holds one word or five.
FAIL stops the voice from being worth recording; WARN is a judgement call.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import project

HINGES = {"then", "so", "but", "suddenly", "after", "later", "because", "meanwhile", "until", "instead", "finally", "which"}


def main():
    P = project()
    spec = json.load(open(os.path.join(P, "script.json"), encoding="utf-8"))
    lines = spec.get("lines", [])
    rows = []
    add = lambda status, what, detail: rows.append((status, what, detail))
    words = [w for ln in lines for w in ln["say"].replace("|", " ").split()]
    n = len(words)
    secs = n / 178 * 60 * 0.9 / max(0.5, spec.get("speed", 0.9))   # Kokoro voice 2 at speed 0.9: about 178 words a minute, gaps included
    add("PASS" if 90 <= n <= 140 else "FAIL", "spoken words", "%d (the format: 90-140)" % n)
    add("PASS" if 30 <= secs <= 50 else "WARN", "estimated length", "%.0f s (30-50 s; narrate.py measures it exactly)" % secs)
    first = lines[0]["say"].replace("|", " ").split()[0] if lines else ""
    add("PASS" if first in ("He", "She", "They") else "FAIL", "line 1", "opens with %r (the act first: \"He punched the ball ...\")" % first)
    add("PASS" if any(re.match(r"\s*You see,", ln["say"]) for ln in lines) else "WARN", "context", 'a line opening "You see," (the step back)')
    h = sum(1 for ln in lines if ln["say"].replace("|", " ").split()[0].strip(",.").lower() in HINGES)
    add("PASS" if h >= 3 else "WARN", "hinge words", "%d lines open on Then / So / But / Suddenly ... (3 or more keeps the chain moving)" % h)
    digits = [ln["say"] for ln in lines if re.search(r"\d", ln["say"])]
    add("FAIL" if digits else "PASS", "digits in say", "; ".join(d[:50] for d in digits) or "none")
    bad_show = [i for i, ln in enumerate(lines) if ln.get("show") and len(ln["show"].replace("|", " ").split()) != len(ln["say"].replace("|", " ").split())]
    add("FAIL" if bad_show else "PASS", "show vs say", "word counts differ on lines %s" % bad_show if bad_show else "one caption word per spoken word")
    chunks = [c.split() for ln in lines if "|" in ln["say"] for c in ln["say"].split("|") if c.strip()]
    odd = [" ".join(c) for c in chunks if not 2 <= len(c) <= 4]
    add("WARN" if odd else "PASS", "hand-cut chunks", ("not 2-4 words: " + " / ".join(odd[:6])) if odd else ("%d chunks of 2-4 words" % len(chunks) if chunks else "none (narrate.py cuts them)"))
    for st, what, detail in rows:
        print("%-5s %-17s %s" % (st, what, detail))
    if any(r[0] == "FAIL" for r in rows):
        sys.exit(1)


if __name__ == "__main__":
    main()
