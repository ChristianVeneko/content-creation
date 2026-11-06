"""plan.py: shots.json + build/timing.json -> build/plan.json (what the renderer draws) + build/sound.json (what sound.py plays).

  PY plan.py

shots.json lists the scenes in order. Each one lasts until the next one starts (2-6 s; the format changes scene about
every 2.5 s and adds something new on almost every caption chunk):
{
 "music": {"gain": 1.0, "bpm": 84, "root": 146.83, "mood": "wonder"},   the synthesized bed (sound.py); null = none
 "cover": 1,                                                             the shot whose middle frame is the cover, or a time: "3.2s"
 "shots": [
  {"fn": "S_scale", "at": "weighs", "transition": "zoom", "focus": [540, 900],
   "what": "a balance scale: the cloud on the left pan, a pile of elephants on the right, level",
   "beats": {"cloud": 0.1, "elephants": "elephants", "_settle": ["elephants", null], "thud": ["elephants", "thud", 0.5]},
   "amb": {"kind": "wind", "level": 0.3},
   "sfx": [["whoosh", 0.0, 0.3]]},
  ...
 ]
}
- fn: the function in scenes/scenes.js that draws the shot. what: plain words for what it shows (for the person reading).
- at: a caption chunk number (2 = the third chunk), a spoken word ("cloud", "cloud#2" for its second time; matched without
  case or punctuation), or seconds ("12.4s"). The first shot starts at 0.
- transition into the shot: cut | slide (the new scene pushes up from below) | slide_left | zoom (into `focus`, a screen
  point) | iris (a circle opening from `focus`) | whip | fade | pop. Each one but cut gets a whoosh.
- beats: name -> when, relative to the shot: a spoken word, "12.4s", or seconds after the shot starts. The scene reads them
  as sh.beats.name (seconds into the shot) to pop labels in exactly on their word. Every beat gets a soft pop sound unless
  its name starts with "_" or it is [when, sound, gain] (sound null = silent). Sounds: sound.py.
- amb: a background layer for the shot: wind | rain | hum | bubbles | none, with a level 0..1.
- sfx: extra sounds, [name, when, gain, options]; when = seconds after the shot starts, or a spoken word.
Warns when a caption chunk starts with nothing new on screen (no shot start, no beat, no "move": true camera move).
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import project, FPS

P = project()
B = os.path.join(P, "build")
TM = json.load(open(os.path.join(B, "timing.json"), encoding="utf-8"))
SH = json.load(open(os.path.join(P, "shots.json"), encoding="utf-8"))
TOTAL, WORDS, CHUNKS = TM["total"], TM["words"], TM["chunks"]
import unicodedata
norm = lambda w: re.sub(r"[^a-z0-9]", "", "".join(c for c in unicodedata.normalize("NFKD", w.lower()) if not unicodedata.combining(c)))


def when(cue, base=None, what="cue"):
    """A spoken word ("cloud", "cloud#2") or "12.4s". A number is a caption chunk for a shot's start (base None),
    and seconds after base for anything inside a shot (beats, sfx)."""
    if isinstance(cue, (int, float)) and not isinstance(cue, bool):
        if base is not None:
            return base + float(cue)
        return CHUNKS[int(cue)]["s"] if int(cue) < len(CHUNKS) else sys.exit("%s: there is no chunk %s" % (what, cue))
    s = str(cue).strip()
    if re.fullmatch(r"[0-9.]+s", s):
        return float(s[:-1])
    word, n = (s.split("#") + ["1"])[:2]
    hits = [w for w in WORDS if norm(w["say"]) == norm(word) or norm(w["show"]) == norm(word)]
    if len(hits) < int(n):
        sys.exit('%s: "%s" isn\'t spoken %s time(s) (words are matched without case or punctuation)' % (what, s, n))
    return hits[int(n) - 1]["s"]


def main():
    shots, warns = [], []
    for i, s in enumerate(SH["shots"]):
        start = 0.0 if i == 0 else when(s["at"], what="shot %d" % i)
        shots.append(dict(s, i=i, start=round(start, 3)))
    for a, b in zip(shots, shots[1:]):
        if b["start"] <= a["start"]:
            hint = ""
            if isinstance(b["at"], str) and not b["at"].endswith("s"):
                wd = b["at"].split("#")[0]
                hint = '; "%s" is spoken at %s' % (wd, ", ".join("%.2f s (#%d)" % (w["s"], k + 1) for k, w in enumerate(x for x in WORDS if norm(x["say"]) == norm(wd))))
            sys.exit("shot %d (at %r) starts at %.2f s, not after shot %d (%.2f s): the shots must be in spoken order%s" % (b["i"], b["at"], b["start"], a["i"], a["start"], hint))
    ev = []
    for k, s in enumerate(shots):
        s["end"] = shots[k + 1]["start"] if k + 1 < len(shots) else TOTAL
        s["f0"], s["f1"] = int(round(s["start"] * FPS)), int(round(s["end"] * FPS))   # frames f0 .. f1-1
        s["chunks"] = [c["i"] for c in CHUNKS if s["start"] - 0.05 <= c["s"] < s["end"] - 0.05]
        s["said"] = " ".join(w["say"] for w in WORDS if s["start"] - 0.05 <= w["s"] < s["end"] - 0.05)
        beats = {}
        for name, v in (s.get("beats") or {}).items():
            cue, snd, gain = (v + [None, None])[:3] if isinstance(v, list) else (v, "pop", 0.3)
            if isinstance(v, list) and len(v) == 2:
                snd, gain = v[1], 0.3
            t = when(cue, s["start"], "shot %d beat %s" % (k, name))
            beats[name] = round(t - s["start"], 3)
            if snd and not name.startswith("_"):
                ev.append([snd, round(max(0.04, t), 3), float(gain if gain is not None else 0.3)])
        s["beats"] = beats
        if s["end"] - s["start"] > 6.5:
            warns.append("shot %d lasts %.1f s: the format changes scene every 2-4 s; split it" % (k, s["end"] - s["start"]))
    # a new picture on every caption chunk: a shot start, a beat or a continuous camera move near the chunk's start
    for c in CHUNKS:
        s = next(x for x in shots if x["start"] - 0.05 <= c["s"] < x["end"] - 0.05 or x is shots[-1])
        times = [s["start"]] + [s["start"] + v for v in s["beats"].values()]
        if not s.get("move") and not any(c["s"] - 0.35 <= x <= c["s"] + 0.7 for x in times) and c["i"]:
            warns.append('chunk %d "%s" (%.2f s) starts with nothing new on screen: add a beat or "move": true' % (c["i"], c["text"], c["s"]))
    # planned cuts and transitions, so check.py only flags unplanned jumps
    cuts = []
    for s in shots[1:]:
        tr = s.get("transition", "cut")
        cuts.append([round(s["start"] - 0.05, 3), round(s["start"] + 0.55, 3)] if tr != "cut" else s["start"])
    cv = SH.get("cover", 0)                    # a shot number (its middle frame) or a time ("3.2s")
    cover_t = float(cv[:-1]) if isinstance(cv, str) and cv.endswith("s") else None
    cover = shots[int(cv)] if cover_t is None else None
    script = json.load(open(os.path.join(P, "script.json"), encoding="utf-8"))
    plan = {"slug": SH.get("slug") or script.get("slug", "short"), "title": script.get("title"),
            "fps": FPS, "total": TOTAL, "frames": int(round(TOTAL * FPS)), "size": [1080, 1920],
            "cover": cover_t if cover_t is not None else round((cover["start"] + cover["end"]) / 2, 3), "cuts": cuts,
            "hide_lines": SH.get("hide_lines", [0] if script.get("title") else []),
            "lufs": SH.get("lufs", {"master": -12, "x": -14}), "shots": shots}
    json.dump(plan, open(os.path.join(B, "plan.json"), "w", encoding="utf-8"), indent=1)

    # the sound: transitions get whooshes, beats their pops, then each shot's own sfx and ambience
    for s in shots:
        tr, t0 = s.get("transition", "cut"), s["start"]
        if s["i"] and tr in ("slide", "slide_up", "slide_left", "whip"):
            ev.append(["whoosh", max(0.04, t0 - 0.12), 0.26, {"dur": 0.42, "f": [400, 2400, 600]}])
        elif s["i"] and tr == "zoom":
            ev.append(["whoosh", max(0.04, t0 - 0.1), 0.24, {"dur": 0.55, "f": [300, 1800, 3200]}])
        elif s["i"] and tr in ("iris", "pop", "fade"):
            ev.append(["swish", max(0.04, t0), 0.22])
        for x in s.get("sfx", []):
            t = when(x[1], s["start"], "shot %d sfx" % s["i"])
            ev.append([x[0], round(max(0.04, t), 3), float(x[2]) if len(x) > 2 else 0.4] + ([x[3]] if len(x) > 3 else []))
    amb = {}
    for s in shots:
        a = s.get("amb") or {"kind": "none"}
        for kind in set(list(amb.keys()) + [a["kind"]]):
            if kind == "none":
                continue
            lv = float(a.get("level", 0.4)) if kind == a["kind"] else 0.0
            amb.setdefault(kind, []).extend([[max(0, s["start"] - 0.001), None], [s["start"] + 0.35, lv]])
    for kind, pts in amb.items():                  # each ambience ramps from its last level to the new one
        last = 0.0
        for p in pts:
            if p[1] is None:
                p[1] = last
            else:
                last = p[1]
        pts.append([TOTAL, last])
    music = SH.get("music", {"gain": 1.0})
    sound = {"total": TOTAL, "seed": 7, "duck": 0.45, "amb": amb,
             "events": sorted(ev, key=lambda e: e[1]), "music": dict(music, total=TOTAL) if music else None}
    json.dump(sound, open(os.path.join(B, "sound.json"), "w", encoding="utf-8"), indent=1)
    for s in shots:
        print("%2d  %5.2f-%5.2f  %-12s %-10s %s" % (s["i"], s["start"], s["end"], s.get("fn", ""), s.get("transition", "cut"), s["said"]))
    print("%d shots for %d caption chunks, %.1f s (a scene every %.1f s) -> build/plan.json, build/sound.json"
          % (len(shots), len(CHUNKS), TOTAL, TOTAL / max(1, len(shots))))
    for w in warns:
        print("WARN:", w)


if __name__ == "__main__":
    main()
