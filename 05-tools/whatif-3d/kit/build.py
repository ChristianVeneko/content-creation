"""build.py: build the story's 3D scene in Blender and render it.
  blender -b --factory-startup --python kit/build.py -- STORY_DIR --stills 0.5,8,20      quick look (PNG stills in STORY/stills)
  blender -b --factory-startup --python kit/build.py -- STORY_DIR --preview              half-size animation, fast
  blender -b --factory-startup --python kit/build.py -- STORY_DIR --final                1080x1920 frames in STORY/frames
Reads STORY/timing.json (from voice.py) and STORY/scene.py (your scene: def build(W, T) -> camera shots).
Frames already on disk are skipped, so a stopped render resumes where it left off."""
import importlib.util, json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy
import world as W

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
story = os.path.abspath(args[0])
mode = "final" if ("--final" in args or "--cuts" in args) else ("preview" if "--preview" in args else "stills")


class Timing:
    """T.line(i) / T['id'] -> the line dict (start, end, words); T.word(i, 'pool') -> that word's start time."""
    def __init__(self, path):
        d = json.load(open(path, encoding="utf-8"))
        self.lines = d["lines"]; self.voice_end = d["voice_end"]
        self.end = round(self.voice_end + 1.0, 2)          # a short tail after the last word

    def line(self, i):
        return self.lines[i]

    def __getitem__(self, key):
        for l in self.lines:
            if l.get("id") == key: return l
        raise KeyError(f"no line with id '{key}' in script.json")

    def word(self, key, w, nth=0):
        l = self[key] if isinstance(key, str) else self.lines[key]
        hits = [x for x in l["words"] if x["w"].lower().strip(".,!?;:'\"") == w.lower()]
        if len(hits) <= nth: raise KeyError(f"word '{w}' not in line {key}: {l['text']}")
        return hits[nth]["s"]


T = Timing(os.path.join(story, "timing.json"))
W.setup(T.end, preview=(mode != "final"))
W.linear_keys()
spec = importlib.util.spec_from_file_location("scene", os.path.join(story, "scene.py"))
scene = importlib.util.module_from_spec(spec); spec.loader.exec_module(scene)
t = time.time()
shots = scene.build(W, T)
W.camera(shots)
W.finalize(T.end)
cut_frames = sorted({W.fr(sh["t0"]) for sh in shots})
json.dump(sorted(W.SFX, key=lambda c: c["at"]), open(os.path.join(story, "sfx.json"), "w", encoding="utf-8"), indent=0)
print(f"scene built in {time.time() - t:.1f} s, {len(bpy.data.objects)} objects, {T.end:.2f} s of video")
sc = bpy.context.scene
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(story, "scene.blend"))

if mode == "stills":
    ts = [float(x) for x in args[args.index("--stills") + 1].split(",")] if "--stills" in args else [0.2, T.end / 2]
    os.makedirs(os.path.join(story, "stills"), exist_ok=True)
    sc.render.resolution_percentage = 50 if "--half" in args else 100
    sc.render.image_settings.file_format = "JPEG"
    sc.render.use_overwrite = True
    for tt in ts:
        sc.frame_set(W.fr(tt))
        sc.render.filepath = os.path.join(story, "stills", f"t{tt:06.2f}.jpg")
        t = time.time(); bpy.ops.render.render(write_still=True)
        print(f"still {tt:.2f} s -> {sc.render.filepath} ({time.time() - t:.1f} s)")
elif "--cuts" in args:
    # re-render only the first two frames of every shot (after a camera or motion-blur change), overwriting them
    out = os.environ.get("WHATIF_OUT") or os.path.join(story, "frames")
    sc.render.use_overwrite = True
    for f0 in cut_frames:
        for f in (f0, f0 + 1):
            sc.frame_set(f); sc.render.filepath = os.path.join(out, f"{f:04d}.jpg")
            bpy.ops.render.render(write_still=True)
    print(f"re-rendered {2 * len(cut_frames)} cut frames -> {out}")
else:
    out = os.environ.get("WHATIF_OUT") or os.path.join(story, "frames" if mode == "final" else "preview_frames")
    os.makedirs(out, exist_ok=True)
    sc.render.filepath = os.path.join(out, "")
    if "--range" in args:
        a, b = args[args.index("--range") + 1].split("-"); sc.frame_start, sc.frame_end = int(a), int(b)
    t = time.time()
    bpy.ops.render.render(animation=True)
    n = sc.frame_end - sc.frame_start + 1
    print(f"rendered {n} frames in {time.time() - t:.0f} s ({(time.time() - t) / max(1, n):.2f} s per frame) -> {out}")
