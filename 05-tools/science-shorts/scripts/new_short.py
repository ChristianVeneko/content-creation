"""new_short.py: start a folder for a new Short, so day one is writing, not plumbing.

    python new_short.py <folder> --slug how_hot_is_lightning [--title "Lightning Is|5x Hotter Than The Sun"]

Makes <folder>/ with build/, out/, qa/ and:
  sources.md         the fact table to fill (fact / used where / source + read date) and "Left out"
  script.json        the voice script skeleton (Kokoro voice 2, speed 0.9, gap 0.36) with the title card
  shots.json         a three-shot skeleton (title card, a magnifier, a comparison) to replace once the voice is cut
  scenes/scenes.js   the starter scenes: S_title, S_inset, S_compare, which are also the style board
"""
import argparse, json, os

SOURCES = """# Sources: {slug}

Every fact in the voice, the captions or the picture, with where it is used and the page it came from (opened today).

| Fact | Used where | Source (read {{date}}) |
|---|---|---|
|  |  |  |

## Left out
- (facts you couldn't verify, or where sources disagree)
"""

SCENES = r'''/* {slug}: one function per shot in shots.json, S(t, T, sh). t = seconds into the shot, T = its length,
   sh.beats.<name> = seconds into the shot where that beat's word is spoken. Facts from sources.md. */
const F = Flat, C = F.PAL, B = (sh, k) => sh.beats[k];
// the 7:8 X cut: per-shot framing where the default (zoom 0.74, lift 40) isn't right
window.FIT78 = {{}};

const SKY = ["#1683f5", "#45b8ff", "#a8ecff"], NIGHT = ["#0d0a3a", "#1d1677", "#3a2bb0"], MAGENTA = ["#4a1aa8", "#9b2fc9", "#e0338f"];

// ---------------------------------------------------------------- the title card: the hero object + the title, from 0.0 s
function S_title(t, T, sh) {{
  const c = F.drift(t, T, [540, 980, 1.0], [540, 960, 1.07]);       // every shot moves: a slow push-in
  return F.frame(c, () => [
    F.sun(900, 600, 70, {{ t }}), F.hills(1560),
    F.cloud(540, 860 + F.bob(t, 10, 0.5), 1.25, {{ t, face: true, mood: "happy" }}),   // replace with this Short's hero object
  ], () => F.title([{{ text: "{t1}", size: 86 * F.U }}], F.W / 2, F.H * 0.085, t, {{ t0: B(sh, "title") }})
       + F.title([{{ text: "{t2}", size: 124 * F.U, fill: C.yellow }}], F.W / 2, F.H * 0.085 + 96 * F.U, t, {{ t0: B(sh, "t2") }}), SKY);
}}

// ---------------------------------------------------------------- a magnifier into the small scale, a label on its word
function S_inset(t, T, sh) {{
  const c = F.drift(t, T, [540, 940, 1.0], [540, 920, 1.05]);
  return F.frame(c, () => [
    F.bokeh(8, [-300, 0, 1700, 1900], t, 6),
    F.cloud(230, 1290, 0.5, {{ t, glow: false }}),
    F.inset(540, 800, 340, () => [F.drop(0, 40, 90, {{ face: true, mood: "smile" }})], {{ p: F.pop(t, B(sh, "inset"), 0.5), from: [300, 1220], bg: "#1d1677" }}),
    F.tag("A label", 540, 1250, {{ p: F.pop(t, B(sh, "label")), size: 64 }}),
  ], null, NIGHT);
}}

// ---------------------------------------------------------------- a comparison: a balance tipping on its word, a big number
function S_compare(t, T, sh) {{
  const tip = F.prog(t, B(sh, "tip"), 0.7);
  const c = F.shake(F.drift(t, T, [540, 1000, 0.95], [540, 980, 1.0]), t, B(sh, "tip") + 0.45, 12);
  return F.frame(c, () => [
    F.balance(540, 1400, 22 * F.ease.back(tip, 2.0), (x, y) => F.drop(x, y - 45, 34), (x, y) => F.circle(x, y - 120, 110, C.lilac)),
    F.tag("1,000×", 540, 360, {{ p: F.pop(t, B(sh, "num")), size: 110, rot: -6 }}),
  ], null, MAGENTA);
}}
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--title", default="This Is The|Title Card!", help='two lines split by "|"')
    a = ap.parse_args()
    t1, t2 = (a.title.split("|") + [""])[:2]
    d = os.path.abspath(a.folder)
    for sub in ("build", "out", "qa", "scenes"):
        os.makedirs(os.path.join(d, sub), exist_ok=True)

    def write(rel, text):
        p = os.path.join(d, rel)
        if os.path.exists(p):
            print("kept   ", rel); return
        open(p, "w", encoding="utf-8").write(text); print("wrote  ", rel)
    write("sources.md", SOURCES.format(slug=a.slug))
    write("script.json", json.dumps({
        "slug": a.slug, "title": [t1.strip(), t2.strip()],
        "voice": "am_liam+am_puck", "speed": 0.9, "gap": 0.36, "max_pause": 0.34, "tail": 0.8,
        "lines": [{"say": "The claim goes here, | said over the title.", "pause": 0.1},
                  {"say": "So how | does that work?"}]}, indent=1))
    write("shots.json", json.dumps({
        "slug": a.slug, "music": {"gain": 1.0, "bpm": 84, "root": 146.83, "mood": "wonder"}, "cover": 0,
        "shots": [{"fn": "S_title", "at": 0, "what": "the title card", "beats": {"title": [0.05, "pop", 0.35], "t2": [0.6, "pop", 0.3]}},
                  {"fn": "S_inset", "at": 2, "transition": "zoom", "focus": [540, 820], "what": "a magnifier", "beats": {"inset": [0.05, "pop", 0.3], "label": 0.8}},
                  {"fn": "S_compare", "at": 3, "transition": "slide", "what": "a comparison", "beats": {"tip": [0.3, "thud", 0.5], "num": 0.9}}]}, indent=1))
    write(os.path.join("scenes", "scenes.js"), SCENES.format(slug=a.slug, t1=t1.strip(), t2=t2.strip()))
    print("\nnext: facts into sources.md, the lines into script.json, then check_script.py and narrate.py (SKILL.md step 3)")


if __name__ == "__main__":
    main()
