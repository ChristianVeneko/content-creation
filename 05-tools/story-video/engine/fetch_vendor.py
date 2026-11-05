"""fetch_vendor.py: download three.js 0.160.0 (the module file plus the post-processing passes) and cannon-es 0.20.0
into engine/vendor/, once, so renders never depend on the internet. Run: python engine/fetch_vendor.py"""
import os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(HERE, "vendor")
T = "https://cdn.jsdelivr.net/npm/three@0.160.0/"
FILES = {"three.module.js": T + "build/three.module.js", "cannon-es.js": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"}
for f in ["EffectComposer", "RenderPass", "ShaderPass", "UnrealBloomPass", "OutputPass", "MaskPass", "Pass"]:
    FILES[f"addons/postprocessing/{f}.js"] = T + f"examples/jsm/postprocessing/{f}.js"
for f in ["CopyShader", "LuminosityHighPassShader", "OutputShader"]:
    FILES[f"addons/shaders/{f}.js"] = T + f"examples/jsm/shaders/{f}.js"
for rel, url in FILES.items():
    p = os.path.join(V, rel)
    if os.path.exists(p) and os.path.getsize(p) > 0: continue
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "wb").write(urllib.request.urlopen(url, timeout=60).read()); print("downloaded", rel)
print("vendor ready:", V)
