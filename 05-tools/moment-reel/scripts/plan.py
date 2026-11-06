"""plan.py: shots.json + build/timing.json -> build/plan.json (what the renderer draws) + build/sound.json (what sound.py plays).

  PY plan.py

shots.json lists the pictures in order. Each one lasts until the next one starts:
{
 "bed": "stadium",                                 crowd bed: stadium | arena | fight | none
 "music": {"gain": 0.1, "bpm": 100},               the light synthesized music bed (null = none)
 "cover": 0,                                       the shot whose middle frame is the cover
 "shots": [
  {"at": 0, "type": "macro_insert", "what": "the left fist meeting the ball, the keeper's glove below it",
   "camera": "85 mm, f/1.8, 30 cm from the fist, slow push-in", "transition": "cut", "crowd": 0.5,
   "glow": {"what": "the left fist", "at": "fist"}, "sfx": [["punch", "ball"], ["whoosh", 0.4, 0.3]]},
  {"at": "jumped", "type": "hero_low_angle", ...},
  ...
 ]
}
- at: a caption chunk number (2 = the third chunk), a spoken word ("fist", "fist#2" for its second time; matched without
  case or punctuation), or seconds ("12.4s"). The first shot starts at 0.
- type: macro_insert, hero_low_angle, tracked_object, top_down, over_shoulder, wide, tv_replay, thought_bubble, text_3d, ...
  (reference/shots.md). what / camera / move: plain words for the renderer, as specific as you can.
- transition into the shot: cut | whip (a 90-degree swing with motion blur, a whoosh is added) | smash_zoom (a fast push-in
  with radial blur, an impact is added) | move (the camera keeps moving from the last shot) | flash (a white frame).
- glow: the object that glows on its word, or N seconds into the shot (a shimmer is added). text_3d: {"text": "56 MILES", "at": "miles"} (a pop is added).
- crowd: the crowd's loudness during the shot, 0 to 1.4 (default 0.6).
- sfx: extra sounds, [name, when, gain, options]; when = seconds after the shot starts, or a spoken word. Names: sound.py.
Warns when a shot spans 3+ caption chunks without a camera move (the picture must change about every chunk).
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import project, FPS

P = project()
B = os.path.join(P, "build")
TM = json.load(open(os.path.join(B, "timing.json"), encoding="utf-8"))
SH = json.load(open(os.path.join(P, "shots.json"), encoding="utf-8"))
TOTAL, WORDS, CHUNKS = TM["total"], TM["words"], TM["chunks"]
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def when(cue, base=None, what="cue"):
    """A spoken word ("fist", "fist#2") or "12.4s". A number is a caption chunk for a shot's start (base None),
    and seconds after base for anything inside a shot (glow, text_3d, sfx)."""
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
    for k, s in enumerate(shots):
        s["end"] = shots[k + 1]["start"] if k + 1 < len(shots) else TOTAL
        s["f0"], s["f1"] = int(round(s["start"] * FPS)), int(round(s["end"] * FPS))   # frames f0 .. f1-1
        s["chunks"] = [c["i"] for c in CHUNKS if s["start"] - 0.05 <= c["s"] < s["end"] - 0.05]
        s["said"] = " ".join(w["say"] for w in WORDS if s["start"] - 0.05 <= w["s"] < s["end"] - 0.05)
        if s.get("glow"):
            s["glow"] = dict(s["glow"], t=round(when(s["glow"]["at"], s["start"], "shot %d glow" % k), 3))
        if s.get("text_3d"):
            s["text_3d"] = dict(s["text_3d"], t=round(when(s["text_3d"].get("at", 0.0), s["start"], "shot %d text_3d" % k), 3))
        if len(s["chunks"]) >= 3 and s.get("transition") != "move" and not s.get("move"):
            warns.append("shot %d spans %d caption chunks (%.1f s) with no camera move: give it a move or split it" % (k, len(s["chunks"]), s["end"] - s["start"]))
        if s["end"] - s["start"] > 3.0:
            warns.append("shot %d lasts %.1f s: keep shots to 1-2.5 s" % (k, s["end"] - s["start"]))
    # planned cuts and fast moves, so check.py only flags the unplanned jumps
    cuts = []
    for s in shots[1:]:
        tr = s.get("transition", "cut")
        cuts.append([round(s["start"] - 0.2, 3), round(s["start"] + 0.2, 3)] if tr in ("whip", "smash_zoom", "flash") else s["start"])
    cover = shots[int(SH.get("cover", 0))]
    plan = {"slug": SH.get("slug") or json.load(open(os.path.join(P, "script.json"), encoding="utf-8")).get("slug", "reel"),
            "fps": FPS, "total": TOTAL, "frames": int(round(TOTAL * FPS)), "size": [1080, 1920],
            "cover": round((cover["start"] + cover["end"]) / 2, 3), "cuts": cuts, "x_cut": "pad",
            "lufs": SH.get("lufs", {"master": -11, "x": -14}), "shots": shots}
    json.dump(plan, open(os.path.join(B, "plan.json"), "w", encoding="utf-8"), indent=1)

    # the sound: the crowd follows each shot's level; transitions, glows and 3D text get their sounds; then the shots' own sfx
    ev = []
    for s in shots:
        tr, t0 = s.get("transition", "cut"), s["start"]
        if s["i"] and tr == "whip":
            ev.append(["whoosh", max(0.04, t0 - 0.16), 0.32, {"dur": 0.36, "f": [500, 2800, 700]}])
        elif s["i"] and tr == "smash_zoom":
            ev += [["hit", max(0.04, t0), 0.4], ["whoosh", max(0.04, t0 - 0.1), 0.2, {"dur": 0.25, "f": [800, 3600, 2000]}]]
        elif s["i"] and tr == "flash":
            ev.append(["shutter", t0, 0.3])
        if s.get("glow"):
            ev.append(["shimmer", s["glow"]["t"], 0.18])
        if s.get("text_3d"):
            ev.append(["pop", s["text_3d"]["t"], 0.3])
        for x in s.get("sfx", []):
            t = when(x[1], s["start"], "shot %d sfx" % s["i"])
            ev.append([x[0], round(max(0.04, t), 3), float(x[2]) if len(x) > 2 else 0.5] + ([x[3]] if len(x) > 3 else []))
    level = []
    for s in shots:
        c = float(s.get("crowd", 0.6))
        level += [[max(0, s["start"] - 0.001), level[-1][1] if level else c], [s["start"] + 0.15, c]]
    level.append([TOTAL, level[-1][1]])
    music = SH.get("music", {"gain": 0.1})
    sound = {"total": TOTAL, "seed": 7, "duck": 0.6,
             "bed": {"kind": SH.get("bed", "stadium"), "level": level, "muffle": [[0, 0]], "roar": [[t, min(1.0, v * 0.7)] for t, v in level]},
             "events": sorted(ev, key=lambda e: e[1]), "music": dict(music, total=TOTAL) if music else None}
    json.dump(sound, open(os.path.join(B, "sound.json"), "w", encoding="utf-8"), indent=1)
    for s in shots:
        print("%2d  %5.2f-%5.2f  %-15s %-10s %s" % (s["i"], s["start"], s["end"], s.get("type", ""), s.get("transition", "cut"), s["said"]))
    print("%d shots for %d caption chunks, %.1f s -> build/plan.json, build/sound.json" % (len(shots), len(CHUNKS), TOTAL))
    for w in warns:
        print("WARN:", w)


if __name__ == "__main__":
    main()
