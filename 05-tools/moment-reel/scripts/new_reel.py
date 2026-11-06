"""new_reel.py: start a reel folder for a new moment, so day one of a new reel is writing, not plumbing.

    python new_reel.py <folder> --sport football|basketball|tennis|boxing|athletics [--slug jordan_1998]

Makes <folder>/ with build/, out/, qa/ and:
  sources.md      the fact table to fill (fact / used where / source + read date), kits, left out
  beats.md        the story lines in the formula, with the pictures under each
  script.json     the voice script skeleton (Kokoro voice 2, speed 0.9, gap 0.3); write the lines, then check_script.py
  shots.json      empty; one shot per caption chunk once narrate.py has cut them
  cartoon/moment.js  a starter scene for the sport: the set piece, a cast template and three shots to copy
                     (a freeze on the key instant, the act, an aftermath room), which also make the style board
"""
import argparse, json, os, sys

SETS = {
    "football": ("C.stadium(1150, { height: 560, noSky: true }), C.pitch(1150), C.goal(540, 1330, 1000, 330)", "football",
                 'skin: "#d6a07a", shirt: "#2d5fc8", shorts: "#1d1d22", socks: "#f2f2ee", boots: "#1a1a1a", sleeves: "short", hair: "short", hairColor: "#2a1d14", h: 330, number: "10"'),
    "basketball": ("C.arena(1150), C.court(1150), C.hoop(560, 760, 1150, 1.1)", "basketball",
                   'skin: "#8a5a3c", shirt: "#c8102e", shorts: "#c8102e", socks: "#f2f2ee", boots: "#f2f2ee", sleeves: "none", hair: "buzz", hairColor: "#1b1410", h: 360, legs: 1.08, number: "23"'),
    "tennis": ("C.arena(980, { height: 420 }), C.tennisCourt(1500, { surface: \"hard\" }), C.tennisNet(540, 1220, 1050)", "tennis",
               'skin: "#f0c8a8", shirt: "#ffffff", shorts: "#ffffff", socks: "#ffffff", boots: "#ffffff", sleeves: "short", hair: "short", hairColor: "#5a3b24", h: 335, headband: "#e33"'),
    "boxing": ("C.arena(1050), C.boxingRing(540, 1380, 1100)", None,
               'skin: "#7a4a30", shirt: null, shorts: "#f2f2f0", socks: "#1a1a1a", boots: "#1a1a1a", boxing: "#c8241c", hair: "bald", hairColor: "#1b1410", h: 350, build: 1.15'),
    "athletics": ("C.el(\"rect\", { x: -2000, y: -2000, width: 5000, height: 3300, fill: \"url(#sky)\" }), C.stadium(1110, { height: 400, noSky: true }), C.track(1180, 8)", None,
                  'skin: "#5a3a26", shirt: "#ffd23a", shorts: "#2a8a3a", socks: "#ffd23a", boots: "#2a8a3a", sleeves: "none", hair: "buzz", hairColor: "#111", h: 380, legs: 1.15'),
}

MOMENT = r'''/* %(title)s as a flat cartoon. One function per shot in shots.json, S(t, T): t = seconds into the shot, T = its length.
   Facts and kits from sources.md. The hero is a caricature (hair, build, kit, number), everyone else generic. */
const C = Cartoon, P = C.pose;

// ---------------------------------------------------------------- the cast (from sources.md: kits, hair, build)
const HERO = { %(hero)s };
const RIVAL = Object.assign({}, HERO, { shirt: "#f4f4f0", shorts: "#f4f4f0", hair: "short", hairColor: "#6a4a2a", skin: "#f0c4a2", number: "" });

// ---------------------------------------------------------------- the set piece
const world = (o = {}) => [%(set)s];

// ---------------------------------------------------------------- the three style-board shots (copy them for the rest)
function S_freeze(t, T) {      // the key instant, frozen: a comic burst behind, the camera drifting in
  const c = C.cam(500, 1050, 2.2 + 0.25 * C.sm(t / T), -3);
  return C.frame(c, () => {
    const out = {};
    const hero = C.person(HERO, Object.assign(P.jump({ eyes: "angry", mouth: "grit", look: [0.6, -1], fist: [true, false] }), { lift: 200 }), 470, 1610, 1, 1, 0, out);
    const h = out.hands[0];
    return [C.el("rect", { x: -800, y: -400, width: 2600, height: 2800, fill: "#ffcf3a" }), C.burst(h[0], h[1], 1500, ["#ffd84f", "#ffb12a"], 24, 6 * t),
      C.speedLines(h[0], h[1], 520, 170, 24, 4, "#fff6d0", 7), C.star(h[0], h[1] - 20, 50, "#fff", 9), hero%(ball)s];
  });
}

function S_act(t, T) {         // the act, wide enough to read: both people, the set piece behind
  const k = C.ease.inout(t / T);
  const c = C.cam(540 + 20 * k, 1250 - 20 * k, 1.35 + 0.08 * k);
  return C.frame(c, () => [world(), C.shadow(420, 1560, 55), C.person(HERO, P.run(t * 2, { look: [1, 0], eyes: "angry", mouth: "grit" }), 420, 1560, 1),
    C.shadow(680, 1540, 55), C.person(RIVAL, P.stand({ eyes: "wide", mouth: "o", look: [-1, 0] }), 680, 1540, 0.97)]);
}

function S_after(t, T) {       // the aftermath: the replay on a TV in a living room, an orange arrow draws on
  const c = C.cam(540, 1010, 1.0 + 0.04 * t / T);
  return C.frame(c, () => {
    const inner = C.cam(540, 1250, 1.2);
    const screen = C.view(inner, () => [world(), C.person(HERO, P.stand(), 470, 1560, 1), C.person(RIVAL, P.stand(), 680, 1540, 0.97)], 640, 480)
      + C.arrow([[560, 420], [470, 330], [380, 280]], C.sm((t - 0.2) / 0.7), "#ff7a1a", 20);
    return [C.room(1300), C.tv(540, 1210, 760, screen)];
  }, null, "#e9d6a8");
}
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--sport", choices=sorted(SETS), required=True)
    ap.add_argument("--slug")
    a = ap.parse_args()
    P = os.path.abspath(a.folder)
    if os.path.exists(os.path.join(P, "script.json")):
        sys.exit("%s already has a reel in it" % P)
    slug = a.slug or os.path.basename(P).replace("-", "_").lower()
    for d in ("build", "out", "qa", "cartoon"):
        os.makedirs(os.path.join(P, d), exist_ok=True)
    s, kind, hero = SETS[a.sport]
    ball = (',\n      C.ball(h[0] + 22, h[1] - 40, 26, 30%s)' % ((', "%s"' % kind) if kind != "football" else "")) if kind else ""
    open(os.path.join(P, "cartoon", "moment.js"), "w", encoding="utf-8").write(MOMENT % {"title": slug, "hero": hero, "set": s, "ball": ball})
    open(os.path.join(P, "sources.md"), "w", encoding="utf-8").write(
        "# Sources: %s\n\nRead on: (date)\n\n| Fact | Used where | Source (read date) |\n|---|---|---|\n|  |  |  |\n\n"
        "## Kits (stylized on screen, no logos)\n\n| Team / person | Kit | Source |\n|---|---|---|\n|  |  |  |\n\n## Left out\n\n- \n" % slug)
    open(os.path.join(P, "beats.md"), "w", encoding="utf-8").write(
        "# Beats: %s\n\nThe formula (reference/story_formula.md): the act first (\"He ...\"), the chain on hinge words (Then, So, But, Suddenly),"
        " the context after \"You see,\", the reveal, the consequence. 90-140 words.\n\n"
        "1. (line) - pictures: (freeze / act / aftermath, one per 2-4 spoken words) - sounds:\n" % slug)
    json.dump({"slug": slug, "voice": "am_liam+am_puck", "speed": 0.9, "gap": 0.3, "max_pause": 0.3, "tail": 0.9,
               "lines": [{"say": "He | (the act, numbers as hyphenated words) |", "show": "He (the same words, digits allowed)"}]},
              open(os.path.join(P, "script.json"), "w", encoding="utf-8"), indent=1)
    json.dump({"shots": []}, open(os.path.join(P, "shots.json"), "w", encoding="utf-8"), indent=1)
    print("new %s reel in %s: fill sources.md, write beats.md and script.json (check_script.py), narrate.py, then shots.json" % (a.sport, P))
    print("cartoon/moment.js has the %s set piece and three starter shots: S_freeze, S_act, S_after" % a.sport)


if __name__ == "__main__":
    main()
