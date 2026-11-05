"""fetch_assets.py: download every free asset the kit uses, once. No account, no key.
  python kit/fetch_assets.py            -> assets/  (about 570 MB the first time; later runs skip what is there)
Sources: Poly Haven (CC0 textures, models, sky), Google Fonts on GitHub (OFL font), Kokoro-82M voice (Apache-2.0)."""
import json, os, sys, urllib.request, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
UA = {"User-Agent": "whatif-kit/1.0"}
TEX = ["excavated_soil_wall", "leafy_grass", "plastered_wall", "clay_roof_tiles", "concrete_floor_02", "gravel_stones",
       "square_concrete_pavers", "dark_wooden_planks", "brick_wall_02", "brown_mud", "rock_face_01_tex", "coast_sand_01",
       "rusty_metal_02", "metal_plate", "dirt", "red_laterite_soil_stones"]
MODELS = ["garden_gnome", "island_tree_01", "tree_small_02", "shrub_01", "shrub_02", "shrub_04", "planter_pot_clay",
          "potted_plant_01", "outdoor_table_chair_set_01", "rock_09", "rock_moss_set_01", "grass_medium_01", "nettle_plant"]
HDRI = "kloofendal_48d_partly_cloudy_puresky"
FONT = "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(path + ".part", "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    os.replace(path + ".part", path)


def api(asset):
    req = urllib.request.Request(f"https://api.polyhaven.com/files/{asset}", headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))


def jobs():
    out = []
    h = api(HDRI)["hdri"]["2k"]["hdr"]["url"]
    out.append((h, os.path.join(A, "hdri", HDRI + ".hdr")))
    for t in TEX:
        name = t.replace("_tex", "")
        try:
            f = api(name)
        except Exception as e:
            print("skip texture", name, e); continue
        for key, short in (("Diffuse", "diff"), ("nor_gl", "nor"), ("Rough", "rough"), ("Displacement", "disp")):
            if key in f and "1k" in f[key]:
                fmt = "jpg" if "jpg" in f[key]["1k"] else "png"
                out.append((f[key]["1k"][fmt]["url"], os.path.join(A, "tex", name, f"{short}.{fmt}")))
    for m in MODELS:
        try:
            g = api(m)["gltf"]["1k"]["gltf"]
        except Exception as e:
            print("skip model", m, e); continue
        base = os.path.join(A, "models", m)
        out.append((g["url"], os.path.join(base, m + ".gltf")))
        for rel, inc in g.get("include", {}).items():
            out.append((inc["url"], os.path.join(base, rel)))
    out.append((FONT, os.path.join(A, "fonts", "Nunito.ttf")))
    if os.environ.get("WHATIF_KOKORO") == "1":  # ElevenLabs voice in this repo; Kokoro only on request
        for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
            out.append((KOKORO + n, os.path.join(A, "voice", n)))
    return out


if __name__ == "__main__":
    js = jobs()
    with cf.ThreadPoolExecutor(8) as ex:
        futs = {ex.submit(get, u, p): p for u, p in js}
        bad = 0
        for fu in cf.as_completed(futs):
            try:
                fu.result()
            except Exception as e:
                bad += 1; print("FAILED", futs[fu], e)
    n = sum(1 for _, p in js if os.path.exists(p))
    print(f"assets ready: {n}/{len(js)} files in {A}" + (f" ({bad} failed: run again)" if bad else ""))
    sys.exit(1 if bad else 0)
