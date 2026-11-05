"""world.py: the 3D set and the animation verbs for "How a hole in your yard becomes ..." Shorts.
Runs inside Blender (bpy). The story's scene.py calls these functions; build.py renders.

Axes: metres, Z up. The lawn is z = 0. The cut face (where the soil is sliced open) is the plane y = 0;
the camera sits at y < 0 looking toward +y, so everything underground shows in cross-section at y = 0.
Times are in seconds (t); fr(t) turns them into frames."""
import bpy, bmesh, math, os, random  # noqa: scene.py can use W.bpy and W.bmesh
from mathutils import Vector, Euler

ROOT = os.environ.get("WHATIF_ROOT") or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
FPS = 30
RNG = random.Random(7)
SOLVER = os.environ.get("WHATIF_BOOL", "MANIFOLD")   # fast; set WHATIF_BOOL=EXACT if a hole renders wrong
_MATS, _LIB, _HIDDEN = {}, {}, None
SFX = []          # sound cues collected while the scene is built; build.py writes them to sfx.json


def sfx(kind, t, vol=0.7, dur=None):
    """a sound at time t. kinds: dig, thud, pop, splash, pour (needs dur), bubble, whoosh, click, hum (needs dur), chime."""
    SFX.append({"type": kind, "at": round(t, 3), "vol": vol, **({"dur": dur} if dur else {})})


def fr(t):
    return int(round(t * FPS)) + 1


def ease(s, kind="inout"):
    s = max(0.0, min(1.0, s))
    if kind == "in": return s * s * s
    if kind == "out": return 1 - (1 - s) ** 3
    if kind == "back":                         # overshoot then settle (pop-in)
        c = 1.70158 * 1.2
        return 1 + (c + 1) * (s - 1) ** 3 + c * (s - 1) ** 2
    if kind == "linear": return s
    return s * s * (3 - 2 * s) if s < 1 else 1.0


def lerp(a, b, s):
    return [x + (y - x) * s for x, y in zip(a, b)]


def _try(obj, name, value):
    try:
        setattr(obj, name, value)
    except Exception:
        pass


# ------------------------------------------------------------------ scene

def setup(duration, preview=False):
    """empty scene, EEVEE, sky, sun, colour management. duration in seconds."""
    global _HIDDEN
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, fr(duration)
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1920
    sc.render.resolution_percentage = 50 if preview else 100
    ee = sc.eevee
    _try(ee, "taa_render_samples", 8 if preview else int(os.environ.get("WHATIF_SAMPLES", "24")))
    _try(ee, "use_raytracing", True)
    _try(ee, "use_shadows", True)
    _try(ee, "shadow_ray_count", 2)
    _try(ee, "shadow_step_count", 8)
    _try(ee, "use_fast_gi", True)
    _try(ee, "fast_gi_distance", 6.0)
    _try(ee, "clamp_surface_indirect", 6.0)
    sc.render.use_motion_blur = not preview
    _try(sc.render, "motion_blur_shutter", 0.45)
    _try(sc.render, "motion_blur_position", "START")   # START: the first frame of a new shot never smears across the cut
    _try(sc.view_settings, "view_transform", "AgX")
    _try(sc.view_settings, "look", "AgX - Medium High Contrast")
    _try(sc.view_settings, "exposure", 0.15)
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 93
    sc.render.use_overwrite = False                # resume: frames already on disk are skipped
    sc.render.use_placeholder = True               # lets two Blender processes share one render
    _try(sc.render, "film_transparent", False)
    # sky
    w = bpy.data.worlds.new("sky"); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value[2] = math.radians(200)
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    hdr = os.path.join(A, "hdri", "kloofendal_48d_partly_cloudy_puresky.hdr")
    env.image = bpy.data.images.load(hdr, check_existing=True)
    bg = nt.nodes.new("ShaderNodeBackground"); bg.name = "SKY"; bg.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    # sun: low enough for long soft shadows, from the back-left so the cut face is lit
    sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.6; sd.angle = math.radians(2.5); sd.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new("sun", sd); sc.collection.objects.link(sun)
    sun.rotation_euler = Euler((math.radians(48), 0, math.radians(-28)))
    fd = bpy.data.lights.new("fill", "SUN"); fd.energy = float(os.environ.get("WHATIF_FILL", "1.1")); fd.angle = math.radians(25)
    fd.color = (1.0, 0.9, 0.78); _try(fd, "use_shadow", False)
    fill = bpy.data.objects.new("fill", fd); sc.collection.objects.link(fill)
    fill.rotation_euler = Euler((math.radians(-62), 0, math.radians(-12)))      # from the camera side, onto the cut face
    # a hidden collection for asset templates
    _HIDDEN = bpy.data.collections.new("LIB"); sc.collection.children.link(_HIDDEN)
    _HIDDEN.hide_render = True; _HIDDEN.hide_viewport = True
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 35; cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 36
    cam.data.clip_start = 0.05; cam.data.clip_end = 600
    return sc


def sun():
    return bpy.data.objects["sun"]


# ------------------------------------------------------------------ materials

def _img(path, non_color=False):
    im = bpy.data.images.load(path, check_existing=True)
    if non_color:
        im.colorspace_settings.name = "Non-Color"
    return im


def _texdir(name):
    return os.path.join(A, "tex", name)


def tex_mat(key, folder, size=2.0, tint=None, sat=1.0, bright=1.0, rough=None, normal=1.0, box=True):
    """a photo material from assets/tex/<folder>, projected in object space so any shape gets it.
    size = metres the texture covers once."""
    m = bpy.data.materials.new(key); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    bsdf = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.name = "MAP"
    mp.inputs["Scale"].default_value = (1 / size, 1 / size, 1 / size)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    d = _texdir(folder)

    def image(fn, nc):
        p = None
        for ext in ("jpg", "png"):
            q = os.path.join(d, f"{fn}.{ext}")
            if os.path.exists(q): p = q
        if not p: return None
        t = N.new("ShaderNodeTexImage"); t.image = _img(p, nc)
        if box:
            t.projection = "BOX"; t.projection_blend = 0.25
        L.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t

    dif = image("diff", False)
    col_out = dif.outputs["Color"] if dif else None
    if col_out is not None and (tint or sat != 1.0 or bright != 1.0):
        hsv = N.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = sat
        hsv.inputs["Value"].default_value = bright
        L.new(col_out, hsv.inputs["Color"]); col_out = hsv.outputs["Color"]
        if tint:
            mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0; mix.inputs["B"].default_value = (*tint, 1)
            L.new(col_out, mix.inputs["A"]); col_out = mix.outputs["Result"]
    if col_out is not None:
        L.new(col_out, bsdf.inputs["Base Color"])
    r = image("rough", True)
    if r and rough is None:
        L.new(r.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = rough if rough is not None else 0.8
    n = image("nor", True)
    if n and normal > 0:
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = normal
        L.new(n.outputs["Color"], nm.inputs["Color"]); L.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    m["base_color_node"] = col_out.node.name if col_out is not None else ""
    return m


def flat(key, color, rough=0.5, metal=0.0, alpha=1.0, emit=0.0, transmission=0.0, ior=1.45, coat=0.0):
    m = bpy.data.materials.new(key); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha; b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1); b.inputs["Emission Strength"].default_value = emit
    if alpha < 1 or transmission > 0:
        _try(m, "surface_render_method", "BLENDED"); _try(m, "use_transparency_overlap", False)
    return m


def _soil():
    m = tex_mat("soil", "excavated_soil_wall", size=3.2, sat=1.05, bright=1.0, normal=1.4)
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N["Principled BSDF"]
    # depth layers: dark topsoil in the first 35 cm, warmer clay below 2.5 m
    col = b.inputs["Base Color"].links[0].from_socket
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs["Vector"])
    top = N.new("ShaderNodeMapRange"); top.inputs["From Min"].default_value = -0.45; top.inputs["From Max"].default_value = -0.15
    L.new(sep.outputs["Z"], top.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["B"].default_value = (0.42, 0.33, 0.27, 1)
    L.new(top.outputs["Result"], mix.inputs["Factor"]); L.new(col, mix.inputs["A"])
    deep = N.new("ShaderNodeMapRange"); deep.inputs["From Min"].default_value = -2.2; deep.inputs["From Max"].default_value = -4.0
    L.new(sep.outputs["Z"], deep.inputs["Value"])
    mix2 = N.new("ShaderNodeMix"); mix2.data_type = "RGBA"; mix2.blend_type = "MULTIPLY"
    mix2.inputs["B"].default_value = (1.0, 0.82, 0.66, 1)
    L.new(deep.outputs["Result"], mix2.inputs["Factor"]); L.new(mix.outputs["Result"], mix2.inputs["A"])
    # faces that point up (hole floors, steps) get loose dirt instead of the cut-wall streaks
    mp2 = N.new("ShaderNodeMapping"); mp2.inputs["Scale"].default_value = (0.8, 0.8, 0.8)
    L.new(tc.outputs["Object"], mp2.inputs["Vector"])
    floor_tex = "red_laterite_soil_stones" if os.path.exists(os.path.join(_texdir("red_laterite_soil_stones"), "diff.jpg")) else "dirt"
    fl = N.new("ShaderNodeTexImage"); fl.image = _img(os.path.join(_texdir(floor_tex), "diff.jpg"))
    fl.projection = "BOX"; fl.projection_blend = 0.3; L.new(mp2.outputs["Vector"], fl.inputs["Vector"])
    fl_t = N.new("ShaderNodeMix"); fl_t.data_type = "RGBA"; fl_t.blend_type = "MULTIPLY"; fl_t.inputs["Factor"].default_value = 1
    fl_t.inputs["B"].default_value = (0.55, 0.38, 0.27, 1); L.new(fl.outputs["Color"], fl_t.inputs["A"])
    geo = N.new("ShaderNodeNewGeometry"); sepn = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Normal"], sepn.inputs["Vector"])
    up = N.new("ShaderNodeMapRange"); up.inputs["From Min"].default_value = 0.55; up.inputs["From Max"].default_value = 0.8
    L.new(sepn.outputs["Z"], up.inputs["Value"])
    floor = N.new("ShaderNodeMix"); floor.data_type = "RGBA"
    upc = N.new("ShaderNodeMath"); upc.operation = "MULTIPLY"; upc.inputs[1].default_value = 0.15     # floors: the cut-face soil, a few stones
    L.new(up.outputs["Result"], upc.inputs[0])
    L.new(upc.outputs[0], floor.inputs["Factor"]); L.new(mix2.outputs["Result"], floor.inputs["A"]); L.new(fl_t.outputs["Result"], floor.inputs["B"])
    L.new(floor.outputs["Result"], b.inputs["Base Color"])
    nm = next((n for n in N if n.bl_idname == "ShaderNodeNormalMap"), None)
    if nm:
        inv = N.new("ShaderNodeMath"); inv.operation = "MULTIPLY_ADD"; inv.inputs[1].default_value = -1.4; inv.inputs[2].default_value = 1.4
        L.new(up.outputs["Result"], inv.inputs[0]); L.new(inv.outputs[0], nm.inputs["Strength"])
        # floors get the dirt's own relief instead
        bw = N.new("ShaderNodeRGBToBW"); L.new(fl.outputs["Color"], bw.inputs["Color"])
        fb = N.new("ShaderNodeBump"); fb.inputs["Distance"].default_value = 0.02
        st = N.new("ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = 2.0
        L.new(up.outputs["Result"], st.inputs[0]); L.new(st.outputs[0], fb.inputs["Strength"])
        L.new(bw.outputs["Val"], fb.inputs["Height"]); L.new(nm.outputs["Normal"], fb.inputs["Normal"])
        L.new(fb.outputs["Normal"], b.inputs["Normal"])
    return m


def _lawn():
    """mown lawn: photo grass + alternating stripes 1.6 m wide (the classic striped yard)."""
    m = tex_mat("grass", "leafy_grass", size=1.2, sat=1.5, bright=0.85, normal=0.6, box=False, rough=0.95)
    nt = m.node_tree; N = nt.nodes; L = nt.links; b = N["Principled BSDF"]
    col = b.inputs["Base Color"].links[0].from_socket
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs["Vector"])
    div = N.new("ShaderNodeMath"); div.operation = "MULTIPLY"; div.inputs[1].default_value = 1 / 1.6
    L.new(sep.outputs["X"], div.inputs[0])
    fl = N.new("ShaderNodeMath"); fl.operation = "FLOOR"; L.new(div.outputs[0], fl.inputs[0])
    md = N.new("ShaderNodeMath"); md.operation = "FLOORED_MODULO"; md.inputs[1].default_value = 2.0
    L.new(fl.outputs[0], md.inputs[0])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["B"].default_value = (0.66, 0.78, 0.55, 1); mix.inputs["A"].default_value = (1, 1, 1, 1)
    L.new(md.outputs[0], mix.inputs["Factor"])
    tint = N.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs["Factor"].default_value = 1
    tint.inputs["B"].default_value = (0.42, 0.85, 0.22, 1)
    L.new(col, tint.inputs["A"])
    fin = N.new("ShaderNodeMix"); fin.data_type = "RGBA"; fin.blend_type = "MULTIPLY"; fin.inputs["Factor"].default_value = 1
    L.new(tint.outputs["Result"], fin.inputs["A"]); L.new(mix.outputs["Result"], fin.inputs["B"])
    # snow cover, 0..1, animate with key_value(M('grass'), 'SNOW', ...)
    snow = N.new("ShaderNodeMix"); snow.data_type = "RGBA"; snow.name = "SNOW"; snow.inputs["Factor"].default_value = 0.0
    snow.inputs["B"].default_value = (0.92, 0.95, 1.0, 1)
    b.inputs["Specular IOR Level"].default_value = 0.15
    L.new(fin.outputs["Result"], snow.inputs["A"]); L.new(snow.outputs["Result"], b.inputs["Base Color"])
    return m


def _water():
    """water: deeper = darker, a moving caustic shimmer and ripples (both driven by the 'TIME' value, keyed by finalize()),
    and an ALGAE amount 0..1 that turns it murky green (animate with key_value(M('water'), 'ALGAE', ...))."""
    m = bpy.data.materials.new("water"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs["Vector"])
    tm = N.new("ShaderNodeValue"); tm.name = "TIME"; tm.outputs[0].default_value = 0.0
    alg = N.new("ShaderNodeMath"); alg.name = "ALGAE"; alg.operation = "ADD"; alg.inputs[0].default_value = 0.0; alg.inputs[1].default_value = 0.0
    depth = N.new("ShaderNodeMapRange"); depth.inputs["From Min"].default_value = -0.1; depth.inputs["From Max"].default_value = -1.3
    L.new(sep.outputs["Z"], depth.inputs["Value"])
    clear = N.new("ShaderNodeMix"); clear.data_type = "RGBA"
    clear.inputs["A"].default_value = (0.09, 0.5, 0.62, 1); clear.inputs["B"].default_value = (0.02, 0.17, 0.34, 1)
    L.new(depth.outputs["Result"], clear.inputs["Factor"])
    murk = N.new("ShaderNodeTexNoise"); murk.inputs["Scale"].default_value = 2.5; murk.inputs["Detail"].default_value = 8; murk.inputs["Roughness"].default_value = 0.65
    L.new(tc.outputs["Object"], murk.inputs["Vector"])
    green = N.new("ShaderNodeMix"); green.data_type = "RGBA"
    green.inputs["A"].default_value = (0.04, 0.14, 0.02, 1); green.inputs["B"].default_value = (0.45, 0.58, 0.14, 1)
    L.new(murk.outputs["Fac"], green.inputs["Factor"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"
    L.new(alg.outputs[0], col.inputs["Factor"]); L.new(clear.outputs["Result"], col.inputs["A"]); L.new(green.outputs["Result"], col.inputs["B"])
    L.new(col.outputs["Result"], b.inputs["Base Color"])
    vor = N.new("ShaderNodeTexVoronoi"); vor.voronoi_dimensions = "4D"; vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 2.2
    _try(vor.inputs.get("Randomness"), "default_value", 1.0)
    L.new(tc.outputs["Object"], vor.inputs["Vector"]); L.new(tm.outputs[0], vor.inputs["W"])
    rmp = N.new("ShaderNodeMapRange"); rmp.inputs["From Min"].default_value = 0.03; rmp.inputs["From Max"].default_value = 0.0
    rmp.inputs["To Max"].default_value = 0.05                     # a faint shimmer, not a tiled pattern
    L.new(vor.outputs["Distance"], rmp.inputs["Value"])
    clean = N.new("ShaderNodeMath"); clean.operation = "MULTIPLY"
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L.new(alg.outputs[0], inv.inputs[1])
    L.new(rmp.outputs["Result"], clean.inputs[0]); L.new(inv.outputs[0], clean.inputs[1])
    L.new(clean.outputs[0], b.inputs["Emission Strength"]); b.inputs["Emission Color"].default_value = (0.75, 0.95, 1.0, 1)
    nz = N.new("ShaderNodeTexNoise"); nz.noise_dimensions = "4D"; nz.inputs["Scale"].default_value = 4.0; nz.inputs["Detail"].default_value = 4
    L.new(tc.outputs["Object"], nz.inputs["Vector"]); L.new(tm.outputs[0], nz.inputs["W"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    L.new(nz.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    # see-through where you look straight in (the cut face shows what's inside), more solid at a glance (the surface)
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    base = N.new("ShaderNodeMapRange"); base.inputs["To Min"].default_value = 0.22; base.inputs["To Max"].default_value = 0.7
    L.new(lw.outputs["Facing"], base.inputs["Value"])
    al = N.new("ShaderNodeMix"); al.data_type = "FLOAT"; al.inputs["B"].default_value = 0.6
    L.new(alg.outputs[0], al.inputs["Factor"]); L.new(base.outputs["Result"], al.inputs["A"]); L.new(al.outputs["Result"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.03; b.inputs["IOR"].default_value = 1.33; b.inputs["Specular IOR Level"].default_value = 0.6
    _try(m, "surface_render_method", "BLENDED"); _try(m, "use_transparency_overlap", False)
    return m


def _ice():
    """frosted ice: pale blue, cracked (cell edges), rougher in patches, a little see-through."""
    m = bpy.data.materials.new("ice"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    vor = N.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 1.6
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    crack = N.new("ShaderNodeMapRange"); crack.inputs["From Min"].default_value = 0.0; crack.inputs["From Max"].default_value = 0.025
    L.new(vor.outputs["Distance"], crack.inputs["Value"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 8
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    frost = N.new("ShaderNodeMix"); frost.data_type = "RGBA"
    frost.inputs["A"].default_value = (0.5, 0.72, 0.88, 1); frost.inputs["B"].default_value = (0.86, 0.94, 1.0, 1)
    L.new(nz.outputs["Fac"], frost.inputs["Factor"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.inputs["A"].default_value = (0.42, 0.6, 0.72, 1)
    L.new(crack.outputs["Result"], col.inputs["Factor"]); L.new(frost.outputs["Result"], col.inputs["B"])
    L.new(col.outputs["Result"], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.05; rr.inputs["To Max"].default_value = 0.45
    L.new(nz.outputs["Fac"], rr.inputs["Value"]); L.new(rr.outputs["Result"], b.inputs["Roughness"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4
    L.new(crack.outputs["Result"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Alpha"].default_value = 0.74; b.inputs["Coat Weight"].default_value = 0.5
    _try(m, "surface_render_method", "BLENDED")
    return m


def foam_mat(name, color):
    """porous foam (filter sponges, insulation): colour with dark pores and a bumpy surface."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 70
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    pores = N.new("ShaderNodeMapRange"); pores.inputs["From Min"].default_value = 0.05; pores.inputs["From Max"].default_value = 0.35
    L.new(vor.outputs["Distance"], pores.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = tuple(c * 0.25 for c in color) + (1,)
    mix.inputs["B"].default_value = (*color, 1); L.new(pores.outputs["Result"], mix.inputs["Factor"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.8
    L.new(pores.outputs["Result"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.9
    return m


def plastic_mat(name, color, rough=0.45):
    """moulded plastic with a faint texture, so tanks and boxes don't look like flat CG."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40; nz.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = (*color, 1)
    mix.inputs["B"].default_value = tuple(c * 0.8 for c in color) + (1,); L.new(nz.outputs["Fac"], mix.inputs["Factor"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08
    L.new(nz.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Coat Weight"].default_value = 0.2
    return m


def finalize(t_end):
    """build.py calls this after build(): keeps the water moving (caustics and ripples) for the whole video."""
    if "water" in _MATS:
        n = _MATS["water"].node_tree.nodes["TIME"].outputs[0]
        n.default_value = 0.0; n.keyframe_insert("default_value", frame=1)
        n.default_value = t_end * 0.22; n.keyframe_insert("default_value", frame=fr(t_end))


def _fabric(color):
    m = bpy.data.materials.new("fabric"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); ck = N.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 160
    L.new(tc.outputs["Object"], ck.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 12; L.new(tc.outputs["Object"], nz.inputs["Vector"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs["A"].default_value = (*color, 1)
    mix.inputs["B"].default_value = tuple(c * 0.82 for c in color) + (1,); L.new(nz.outputs["Fac"], mix.inputs["Factor"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    L.new(ck.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.95
    return m


def _drainpipe():
    """corrugated black plastic pipe: rings in every direction (reads right on any run) and a row of dark holes."""
    m = bpy.data.materials.new("drainpipe"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    rings = None
    for ax in ("X", "Y", "Z"):
        w = N.new("ShaderNodeTexWave"); w.wave_type = "BANDS"; w.bands_direction = ax; w.inputs["Scale"].default_value = 9.0
        L.new(tc.outputs["Object"], w.inputs["Vector"])
        if rings is None: rings = w.outputs["Fac"]
        else:
            mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"; L.new(rings, mx.inputs[0]); L.new(w.outputs["Fac"], mx.inputs[1]); rings = mx.outputs[0]
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 18; L.new(tc.outputs["Object"], vor.inputs["Vector"])
    holes = N.new("ShaderNodeMapRange"); holes.inputs["From Min"].default_value = 0.1; holes.inputs["From Max"].default_value = 0.16
    L.new(vor.outputs["Distance"], holes.inputs["Value"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.inputs["A"].default_value = (0.0, 0.0, 0.0, 1); col.inputs["B"].default_value = (0.05, 0.05, 0.055, 1)
    L.new(holes.outputs["Result"], col.inputs["Factor"]); L.new(col.outputs["Result"], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.6
    L.new(rings, bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.4; b.inputs["Coat Weight"].default_value = 0.3
    return m


def M(key):
    """the material library. Add your own with flat(...) or tex_mat(...)."""
    if key in _MATS: return _MATS[key]
    k = key
    if k == "soil": m = _soil()
    elif k == "grass": m = _lawn()
    elif k == "water": m = _water()
    elif k == "plaster": m = tex_mat(k, "plastered_wall", 2.5, tint=(0.86, 0.82, 0.86), bright=1.08, normal=0.5)
    elif k == "roof": m = tex_mat(k, "clay_roof_tiles", 2.2, tint=(1.0, 0.72, 0.55), sat=1.15, normal=1.0)
    elif k == "concrete": m = tex_mat(k, "concrete_floor_02", 2.0, bright=1.05, normal=0.6)
    elif k == "gravel": m = tex_mat(k, "gravel_stones", 0.8, normal=1.5)
    elif k == "pavers": m = tex_mat(k, "square_concrete_pavers", 2.0, tint=(1.0, 0.93, 0.85))
    elif k == "wood": m = tex_mat(k, "dark_wooden_planks", 2.0, tint=(0.75, 0.55, 0.42))
    elif k == "brick": m = tex_mat(k, "brick_wall_02", 1.6)
    elif k == "mud": m = tex_mat(k, "brown_mud", 1.5, tint=(0.82, 0.62, 0.45), sat=1.1, normal=1.2)
    elif k == "sand": m = tex_mat(k, "coast_sand_01", 1.2, tint=(1.0, 0.9, 0.72))
    elif k == "rock": m = tex_mat(k, "rock_face_01", 1.5, normal=1.5)
    elif k == "rust": m = tex_mat(k, "rusty_metal_02", 1.0)
    elif k == "steel": m = tex_mat(k, "metal_plate", 1.0, rough=0.35)
    elif k == "glass": m = flat(k, (0.10, 0.15, 0.20), rough=0.04, coat=1.0)
    elif k == "trim": m = flat(k, (0.92, 0.92, 0.9), rough=0.45)
    elif k == "shutter": m = tex_mat(k, "dark_wooden_planks", 1.2, tint=(0.25, 0.42, 0.75), sat=0.2, bright=1.6, normal=0.6)
    elif k == "pvc": m = plastic_mat(k, (0.9, 0.9, 0.88), 0.3)
    elif k == "black_rubber": m = flat(k, (0.025, 0.025, 0.028), rough=0.55)
    elif k == "tar": m = flat(k, (0.02, 0.02, 0.02), rough=0.25, coat=0.6)
    elif k == "copper": m = flat(k, (0.85, 0.45, 0.25), rough=0.3, metal=1.0)
    elif k == "red": m = flat(k, (0.75, 0.08, 0.06), rough=0.4)
    elif k == "blue_plastic": m = plastic_mat(k, (0.06, 0.22, 0.65), 0.35)
    elif k == "green_plastic": m = plastic_mat(k, (0.09, 0.22, 0.11))
    elif k == "orange": m = flat(k, (0.95, 0.38, 0.06), rough=0.35)
    elif k == "white": m = flat(k, (0.95, 0.95, 0.95), rough=0.4)
    elif k == "arrow": m = flat(k, (1, 1, 1), rough=0.3, alpha=0.85, emit=0.25)
    elif k == "arrow_blue": m = flat(k, (0.55, 0.8, 1.0), rough=0.3, alpha=0.9, emit=0.4)
    elif k == "arrow_red": m = flat(k, (1.0, 0.35, 0.25), rough=0.3, alpha=0.9, emit=0.4)
    elif k == "groundwater": m = flat(k, (0.12, 0.35, 0.85), rough=0.2, alpha=0.55)
    elif k == "wet": m = flat(k, (0.08, 0.05, 0.03), rough=0.2, alpha=0.45)
    elif k == "ice": m = _ice()
    elif k == "flow": m = flat(k, (0.55, 0.82, 1.0), rough=0.05, alpha=0.7, emit=0.35)       # water droplets / a stream
    elif k == "air": m = flat(k, (1.0, 1.0, 1.0), rough=0.3, alpha=0.55, emit=0.3)            # air / gas bubbles
    elif k == "falls": m = flat(k, (0.7, 0.88, 1.0), rough=0.05, alpha=0.32, emit=0.12)
    elif k == "foam": m = flat(k, (0.95, 0.97, 1.0), rough=0.4, alpha=0.75, emit=0.2)
    elif k == "leaf": m = flat(k, (0.18, 0.42, 0.12), rough=0.6)
    elif k == "fabric": m = _fabric((0.82, 0.8, 0.76))            # geotextile, tarp, felt
    elif k == "fabric_black": m = _fabric((0.06, 0.06, 0.06))
    elif k == "drainpipe": m = _drainpipe()                         # black corrugated pipe with holes
    else: raise KeyError(f"no material '{key}'. Make one with flat() or tex_mat().")
    _MATS[key] = m
    return m


def key_value(mat_or_world, node, keys, socket=None):
    """animate one number inside a material or the world: keys = [(t, value), ...].
    e.g. key_value(M('water'), 'ALGAE', [(20, 0), (22, 0.9)])"""
    nt = mat_or_world.node_tree
    n = nt.nodes[node]
    inp = n.inputs[socket] if socket else (n.inputs.get("Factor") or n.inputs.get("Strength") or n.inputs[0])
    for t, v in keys:
        inp.default_value = v
        inp.keyframe_insert("default_value", frame=fr(t))


# ------------------------------------------------------------------ geometry

def _link(ob, col=None):
    (col or bpy.context.scene.collection).objects.link(ob)
    return ob


def box(name, size, loc, mat, origin="bottom", bevel=0.0):
    """a box. size=(x,y,z). origin 'bottom' puts the pivot at the bottom centre (good for growing up)."""
    sx, sy, sz = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
        if origin == "bottom": v.co.z += sz / 2
        elif origin == "top": v.co.z -= sz / 2
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    if bevel:
        bv = ob.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 2
        for p in me.polygons: p.use_smooth = True
    return ob


def cyl(name, r, h, loc, mat, axis="Z", verts=40, origin="bottom", r2=None):
    """a cylinder (or cone/frustum with r2) of radius r, height h along axis."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if origin == "bottom":
        for v in bm.verts: v.co.z += h / 2
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    if axis == "X": ob.rotation_euler = (0, math.radians(90), 0)
    elif axis == "Y": ob.rotation_euler = (math.radians(-90), 0, 0)
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def sphere(name, r, loc, mat, squash=1.0, noise=0.0, seg=32):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    rr = random.Random(hash(name) & 0xffff)
    for v in bm.verts:
        v.co.z *= squash
        if noise: v.co *= 1 + noise * (rr.random() - 0.5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def prism(name, profile, depth, loc, mat, axis="Y"):
    """extrude a 2D outline (list of (u, z) points, counter-clockwise) by depth along axis (Y default: from y to y+depth).
    Good for stepped pits, tank sections, trenches."""
    bm = bmesh.new()
    a = [bm.verts.new((u, 0, z)) for u, z in profile]
    b = [bm.verts.new((u, depth, z)) for u, z in profile]
    bm.faces.new(list(reversed(a))); bm.faces.new(b)
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me)); ob.location = loc
    if axis == "X": ob.rotation_euler = (0, 0, math.radians(-90))
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def pipe(name, points, r, mat="pvc", t0=None, t1=None, caps=True):
    """a round pipe through 3D points. With t0/t1 it grows from the first point to the last over that time."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = r; cu.bevel_resolution = 6; cu.use_fill_caps = caps
    sp = cu.splines.new("POLY"); sp.points.add(len(points) - 1)
    for p, c in zip(sp.points, points): p.co = (*c, 1)
    ob = _link(bpy.data.objects.new(name, cu))
    cu.materials.append(M(mat) if isinstance(mat, str) else mat)
    if t0 is not None:
        _try(cu, "bevel_factor_mapping_end", "SPLINE")
        cu.bevel_factor_end = 0.0; cu.keyframe_insert("bevel_factor_end", frame=fr(t0))
        cu.bevel_factor_end = 1.0; cu.keyframe_insert("bevel_factor_end", frame=fr(t1))
        hide_until(ob, t0)
    return ob


def arrow_mesh(name, length=1.0, width=0.32, mat="arrow"):
    """a chunky block arrow pointing along +Z, pivot at its tail."""
    w, hl = width, min(0.45 * length, width * 1.4)
    sl = length - hl
    prof = [(-w * 0.3, 0), (w * 0.3, 0), (w * 0.3, sl), (w * 0.75, sl), (0, length), (-w * 0.75, sl), (-w * 0.3, sl)]
    bm = bmesh.new()
    t = w * 0.35
    a = [bm.verts.new((u, -t / 2, z)) for u, z in prof]; b = [bm.verts.new((u, t / 2, z)) for u, z in prof]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(len(prof)):
        j = (i + 1) % len(prof); bm.faces.new((a[j], a[i], b[i], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


def instance(asset, loc, scale=1.0, rot_z=0.0, name=None):
    """place a Poly Haven model from assets/models/<asset> (imported once, then instanced)."""
    if asset not in _LIB:
        path = os.path.join(A, "models", asset, asset + ".gltf")
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        col = bpy.data.collections.new("LIB_" + asset)
        _HIDDEN.children.link(col)
        for o in new:
            for c in list(o.users_collection): c.objects.unlink(o)
            col.objects.link(o)
        _LIB[asset] = col
    e = bpy.data.objects.new(name or asset, None)
    e.instance_type = "COLLECTION"; e.instance_collection = _LIB[asset]
    e.location = loc; e.scale = (scale, scale, scale); e.rotation_euler = (0, 0, rot_z)
    return _link(e)


# ------------------------------------------------------------------ the yard set

SOIL = None


def yard(house=True, props=True, block=(30.0, 16.0, 16.0), neighbours=True):
    """the standard set: a soil block cut open at y=0, lawn on top, the house behind, fence, trees, sky.
    Returns the soil block object. Cut holes into it with hole(...)."""
    global SOIL
    w, d, h = block
    # soil block with lawn top (material 0 = soil, 1 = grass)
    SOIL = box("soil_block", (w, d, h), (0, d / 2, -h), "soil")
    SOIL.data.materials.append(M("grass"))
    for p in SOIL.data.polygons:
        if p.normal.z > 0.9: p.material_index = 1
    # endless lawn around and behind the block (slightly below to avoid flicker)
    lawn = box("lawn", (220, 160, 0.2), (0, d + 80 - 0.01, -0.2 - 0.003), "grass")
    lawn_l = box("lawn_left", (95, d, 0.2), (-w / 2 - 47.5, d / 2, -0.2 - 0.003), "grass")
    lawn_r = box("lawn_right", (95, d, 0.2), (w / 2 + 47.5, d / 2, -0.2 - 0.003), "grass")
    if house:
        house_at((0.6, 9.8, 0), w=11.5, d=7.5)
    if neighbours:
        house_at((-17.5, 15.5, 0), w=9.5, d=7, wall=(0.92, 0.88, 0.8), shutters=(0.2, 0.3, 0.25), floors=2, rot=0.0, name="nb1")
        house_at((18.0, 16.5, 0), w=10, d=7, wall=(0.86, 0.86, 0.9), shutters=(0.45, 0.15, 0.12), floors=2, rot=0.0, name="nb2")
    fence(-13, 13, d - 0.6)
    if props:
        dress_yard()
    return SOIL


def house_at(loc, w=11.0, d=7.5, floors=2, wall=None, shutters=(0.12, 0.28, 0.6), rot=0.0, name="house"):
    """a two-storey suburban house, front facing the camera (-y). loc = centre of the front wall's base."""
    x0, y0, z0 = loc
    fh = 2.9
    h = floors * fh + 0.3
    parts = []
    wall_mat = M("plaster") if wall is None else tex_mat(name + "_plaster", "plastered_wall", 2.5, tint=wall, bright=1.08, normal=0.5)
    sh_mat = M("shutter") if name == "house" else flat(name + "_shutter", shutters, rough=0.5)
    parts.append(box(name + "_walls", (w, d, h), (x0, y0 + d / 2, z0), wall_mat))
    parts.append(box(name + "_plinth", (w + 0.08, d + 0.08, 0.45), (x0, y0 + d / 2, z0 - 0.05), "concrete"))
    # gable roof along x, with overhang
    ov, rise = 0.45, 2.7
    rw, rd = w + 2 * ov, d + 2 * ov
    top = z0 + h
    bm = bmesh.new()
    pts = [(-rw / 2, -rd / 2, top - 0.25), (rw / 2, -rd / 2, top - 0.25), (rw / 2, 0, top + rise), (-rw / 2, 0, top + rise),
           (-rw / 2, rd / 2, top - 0.25), (rw / 2, rd / 2, top - 0.25)]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new((v[0], v[1], v[2], v[3])); bm.faces.new((v[3], v[2], v[5], v[4]))
    me = bpy.data.meshes.new(name + "_roof"); bm.to_mesh(me); bm.free()
    roof = _link(bpy.data.objects.new(name + "_roof", me)); roof.location = (x0, y0 + d / 2, 0)
    me.materials.append(M("roof"))
    so = roof.modifiers.new("thick", "SOLIDIFY"); so.thickness = 0.18; so.offset = -1
    parts.append(roof)
    # gable ends (plaster triangles)
    for sx in (-1, 1):
        bm = bmesh.new()
        tri = [bm.verts.new((sx * w / 2, -d / 2, top)), bm.verts.new((sx * w / 2, d / 2, top)), bm.verts.new((sx * w / 2, 0, top + rise - 0.25))]
        bm.faces.new(tri); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(name + "_gable"); bm.to_mesh(me); bm.free()
        g = _link(bpy.data.objects.new(name + "_gable", me)); g.location = (x0, y0 + d / 2, 0); me.materials.append(wall_mat)
        sg = g.modifiers.new("t", "SOLIDIFY"); sg.thickness = 0.2
        parts.append(g)
    # fascia + gutter
    parts.append(box(name + "_fascia", (rw, 0.06, 0.22), (x0, y0 - ov + 0.02, top - 0.42), "trim"))
    parts.append(cyl(name + "_gutter", 0.07, rw, (x0 - rw / 2, y0 - ov - 0.04, top - 0.36), "trim", axis="X", origin="bottom"))
    # chimney
    parts.append(box(name + "_chimney", (0.8, 0.8, 2.6), (x0 + w * 0.3, y0 + d * 0.62, top + 0.6), "brick"))
    parts.append(box(name + "_chimcap", (0.95, 0.95, 0.12), (x0 + w * 0.3, y0 + d * 0.62, top + 3.2), "concrete"))
    # windows: 4 per floor, the ground floor centre is a glass door with a small canopy
    cols = [-0.36, -0.12, 0.12, 0.36]
    for fl in range(floors):
        zc = z0 + 0.3 + fl * fh + (1.55 if fl else 1.45)
        for i, cx in enumerate(cols):
            x = x0 + cx * w
            if fl == 0 and i in (1, 2):
                continue
            window(name + f"_w{fl}{i}", (x, y0, zc), 1.15, 1.45, sh_mat)
        if fl == 0:
            door(name + "_door", (x0, y0, z0 + 0.3), 2.4, 2.2)
    for o in parts:
        o.rotation_euler.z += rot
    return parts


def window(name, c, ww, wh, sh_mat):
    x, y, z = c
    box(name + "_glass", (ww, 0.02, wh), (x, y - 0.015, z - wh / 2), "glass")   # just in front of the wall face: level with it, glass and plaster flicker (z-fighting)
    t = 0.08
    for dx, dz, sx, sz in ((0, wh / 2, ww + t, t), (0, -wh / 2, ww + t, t), (-ww / 2, 0, t, wh), (ww / 2, 0, t, wh), (0, 0, ww, t * 0.6), (0, 0, t * 0.6, wh)):
        box(name + "_f", (sx, 0.1, sz), (x + dx, y - 0.04, z + dz - sz / 2), "trim")
    box(name + "_sill", (ww + 0.25, 0.22, 0.07), (x, y - 0.1, z - wh / 2 - 0.1), "trim")
    for s in (-1, 1):
        box(name + "_sh", (ww * 0.48, 0.06, wh + 0.05), (x + s * (ww / 2 + ww * 0.26), y - 0.06, z - wh / 2 - 0.02), sh_mat)


def door(name, c, ww, wh):
    x, y, z = c
    box(name + "_glass", (ww, 0.02, wh), (x, y - 0.015, z), "glass")   # in front of the wall face, see window()
    t = 0.09
    for dx, sx in ((-ww / 2, t), (ww / 2, t), (0, t * 0.7)):
        box(name + "_f", (sx, 0.1, wh), (x + dx, y - 0.04, z), "trim")
    box(name + "_top", (ww + t, 0.1, t), (x, y - 0.04, z + wh), "trim")
    box(name + "_canopy", (ww + 1.4, 1.1, 0.1), (x, y - 0.55, z + wh + 0.35), "trim")
    for s in (-1, 1):
        box(name + "_post", (0.1, 0.1, wh + 0.35), (x + s * (ww / 2 + 0.6), y - 1.05, z), "trim")


def fence(x0, x1, y):
    n = int((x1 - x0) / 0.16)
    me = None
    for i in range(n):
        x = x0 + i * 0.16
        hgt = 1.75 + 0.03 * math.sin(i * 1.7)
        box(f"fence_{i}", (0.145, 0.03, hgt), (x, y, -0.02), "wood")
    for zz in (0.35, 1.45):
        box("fence_rail", (x1 - x0, 0.06, 0.09), ((x0 + x1) / 2, y + 0.05, zz), "wood")


def dress_yard():
    """trees, shrubs, a gnome, pots and a patio set. Edit freely, but keep the hole area clear."""
    instance("island_tree_01", (-7.6, 7.2, 0), 1.0, 0.4)
    instance("tree_small_02", (8.2, 8.6, 0), 1.7, 1.2)
    instance("tree_small_02", (-12.5, 13.0, 0), 1.4, 2.6)
    instance("island_tree_01", (12.5, 14.5, 0), 0.9, 2.0)
    instance("shrub_02", (-9.5, 14.2, 0), 0.8, 0.0)          # a row of shrubs along the back fence
    instance("shrub_02", (9.0, 14.2, 0), 0.8, 3.14)
    box("patio", (8.5, 2.6, 0.08), (0.6, 8.4, -0.04), "pavers")
    instance("outdoor_table_chair_set_01", (-2.2, 8.3, 0.04), 1.0, 0.3)
    instance("planter_pot_clay", (3.8, 8.6, 0.04), 1.3, 0)
    instance("potted_plant_01", (5.2, 8.7, 0.04), 1.2, 0.5)
    instance("garden_gnome", (-4.6, 2.4, 0), 1.8, 0.4)


def hole(name, shape, loc=(0, 0, 0), t0=None, t1=None, extra=None):
    """cut a hole into the soil block. shape: ('box', (sx, sy, sz)) dug from the lawn down, or ('prism', profile, depth).
    The hole starts at y = -1 so it opens through the cut face. With t0/t1 it is dug over that time (top down).
    Returns the cutter (hidden)."""
    if shape[0] == "box":
        sx, sy, sz = shape[1]
        c = box(name, (sx, sy + 1.0, sz + 1.0), (loc[0], loc[1] + (sy - 1.0) / 2, loc[2] + 1.0), "soil", origin="top")
    else:
        prof, depth = shape[1], shape[2]
        prof2 = [(u, z) for u, z in prof]
        c = prism(name, prof2, depth + 1.0, (loc[0], loc[1] - 1.0, loc[2]), "soil")
    c.hide_render = True; c.display_type = "WIRE"
    mod = SOIL.modifiers.new(name, "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = c
    _try(mod, "solver", SOLVER)
    if t0 is not None:
        dig(c, t0, t1, extra=extra)
    return c


# ------------------------------------------------------------------ animation verbs

def hide_until(ob, t):
    """invisible before time t (children too)."""
    for o in [ob] + list(ob.children_recursive):
        o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
        o.hide_render = False; o.keyframe_insert("hide_render", frame=max(1, fr(t)))


def hide_from(ob, t):
    """invisible from time t on (children too)."""
    for o in [ob] + list(ob.children_recursive):
        o.hide_render = False; o.keyframe_insert("hide_render", frame=max(1, fr(t) - 1))
        o.hide_render = True; o.keyframe_insert("hide_render", frame=fr(t))


def show_from(ob, t):
    """visible again from time t (after a hide_from)."""
    for o in [ob] + list(ob.children_recursive):
        o.hide_render = True; o.keyframe_insert("hide_render", frame=max(1, fr(t) - 1))
        o.hide_render = False; o.keyframe_insert("hide_render", frame=fr(t))


def _keys(ob, path, t0, t1, fn, step=1):
    f0, f1 = fr(t0), fr(t1)
    for f in range(f0, f1 + 1, step):
        s = (f - f0) / max(1, f1 - f0)
        setattr(ob, path, fn(s)); ob.keyframe_insert(path, frame=f)
    if (f1 - f0) % step:
        setattr(ob, path, fn(1.0)); ob.keyframe_insert(path, frame=f1)


def appear(ob, t, how="pop", dur=0.5, dist=3.0):
    """make an object arrive at time t. how: pop | grow_z | rise | drop | slide_x | slide_y | fade_in (scale only)."""
    base_loc = Vector(ob.location); base_sc = Vector(ob.scale)
    hide_until(ob, t)
    if how == "pop":
        _keys(ob, "scale", t, t + dur, lambda s: base_sc * max(0.001, ease(s, "back")))
    elif how == "grow_z":
        _keys(ob, "scale", t, t + dur, lambda s: Vector((base_sc.x, base_sc.y, base_sc.z * max(0.001, ease(s, "out")))))
    elif how == "rise":
        _keys(ob, "location", t, t + dur, lambda s: base_loc + Vector((0, 0, -dist * (1 - ease(s, "out")))))
    elif how == "drop":
        sfx("thud", t + dur * 0.7, 0.5)

        def f(s):
            if s < 0.7: return base_loc + Vector((0, 0, dist * (1 - (s / 0.7) ** 2)))
            q = (s - 0.7) / 0.3
            return base_loc + Vector((0, 0, 0.12 * dist * 0.15 * math.sin(math.pi * q)))
        _keys(ob, "location", t, t + dur, f)
    elif how in ("slide_x", "slide_y"):
        ax = Vector((dist, 0, 0)) if how == "slide_x" else Vector((0, dist, 0))
        _keys(ob, "location", t, t + dur, lambda s: base_loc + ax * (1 - ease(s, "out")))
    else:
        raise ValueError(how)


def vanish(ob, t, how="pop", dur=0.4, dist=3.0):
    base_loc = Vector(ob.location); base_sc = Vector(ob.scale)
    if how == "pop":
        _keys(ob, "scale", t, t + dur, lambda s: base_sc * max(0.001, 1 - ease(s, "in")))
    elif how == "sink":
        _keys(ob, "location", t, t + dur, lambda s: base_loc + Vector((0, 0, -dist * ease(s, "in"))))
    hide_from(ob, t + dur)


def move(ob, t0, t1, loc=None, rot=None, scale=None, kind="inout"):
    """glide an object from where it is (at t0) to loc / rot (degrees) / scale by t1."""
    if loc is not None:
        a = Vector(ob.location); b = Vector(loc)
        _keys(ob, "location", t0, t1, lambda s: a.lerp(b, ease(s, kind)))
    if rot is not None:
        a = Vector(ob.rotation_euler); b = Vector([math.radians(x) for x in rot])
        _keys(ob, "rotation_euler", t0, t1, lambda s: a.lerp(b, ease(s, kind)))
    if scale is not None:
        a = Vector(ob.scale); b = Vector(scale if hasattr(scale, "__len__") else (scale,) * 3)
        _keys(ob, "scale", t0, t1, lambda s: a.lerp(b, ease(s, kind)))


def follow(ob, t0, t1, fn, face=True):
    """drive an object along any path: fn(s) -> (x, y, z) for s in 0..1. face=True turns it toward the motion;
    face="xy" turns it only left and right, so it stays level (fish, cars, animals)."""
    prev = None
    f0, f1 = fr(t0), fr(t1)
    for f in range(f0, f1 + 1):
        s = (f - f0) / max(1, f1 - f0)
        p = Vector(fn(s)); ob.location = p; ob.keyframe_insert("location", frame=f)
        if face:
            q = Vector(fn(min(1.0, s + 0.01)))
            dv = q - p
            if face == "xy": dv.z = 0.0
            if dv.length > 1e-5:
                ob.rotation_euler = dv.to_track_quat("X", "Z").to_euler(); ob.keyframe_insert("rotation_euler", frame=f)


def level(ob, keys, kind="inout"):
    """raise or lower something that has its pivot at the bottom (water, fill, a coat of tar):
    keys = [(t, fraction_of_full_height), ...]"""
    base = ob.scale.z
    for (ta, va), (tb, vb) in zip(keys, keys[1:]):
        _keys(ob, "scale", ta, tb, lambda s, va=va, vb=vb: Vector((ob.scale.x, ob.scale.y, base * max(0.001, va + (vb - va) * ease(s, kind)))))
    if keys[0][1] <= 0.001:
        hide_until(ob, keys[0][0] + 0.01)


def dig(cutter, t0, t1, extra=None):
    """dig a hole (the cutter grows down from the lawn), throw clods onto a pile beside it.
    extra = dict(pile=(x, y), pile_size=1.0, clods=18, start=0.0). start = how deep the hole already is at t0 (0..1);
    use start=0.35 when the dig opens the video, so frame 1 already shows a hole and flying dirt."""
    extra = extra or {}
    full = cutter.scale.z
    st0 = extra.get("start", 0.0)
    _keys(cutter, "scale", t0, t1, lambda s: Vector((cutter.scale.x, cutter.scale.y, full * max(0.02, st0 + (1 - st0) * ease(s, "out" if st0 else "inout")))))
    cx, cy = cutter.location.x, cutter.location.y + 1.0
    px, py = extra.get("pile", (cx - 4.5, cy + 3.0))
    ps = extra.get("pile_size", 1.0)
    pile = sphere("dirt_pile", 1.4 * ps, (px, py, -0.15), "mud", squash=0.45, noise=0.25, seg=24)
    sub = pile.modifiers.new("s", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    pile.scale = (1, 1, 1)
    for k in range(int((t1 - t0) / 0.35) + 1):
        sfx("dig", t0 + 0.35 * k, 0.55)
    if st0 == 0: hide_until(pile, t0 + 0.2)
    _keys(pile, "scale", t0 + (0 if st0 else 0.2), t1, lambda s: Vector([max(0.05, st0 * 0.6 + (1 - st0 * 0.6) * ease(s, "out"))] * 3))
    n = extra.get("clods", 18)
    for i in range(n):
        st = t0 + (t1 - t0 - 0.7) * i / max(1, n - 1) - (0.1 * (4 - i) if st0 and i < 4 else 0)
        c = sphere(f"clod_{cutter.name}_{i}", 0.13 + 0.08 * RNG.random(), (0, 0, 0), "soil", squash=0.75, noise=0.55, seg=10)
        sx = cx + (RNG.random() - 0.5) * 1.6; sy = cy + RNG.random() * 1.5
        ex = px + (RNG.random() - 0.5) * 1.2; ey = py + (RNG.random() - 0.5) * 0.8
        peak = extra.get("arc", 1.5) * (0.75 + 0.5 * RNG.random())
        spin = Vector((RNG.random(), RNG.random(), RNG.random())) * 7

        def path(s, sx=sx, sy=sy, ex=ex, ey=ey, peak=peak):
            return (sx + (ex - sx) * s, sy + (ey - sy) * s, -0.2 + 4 * peak * s * (1 - s) + 0.1 * s)
        hide_until(c, max(0.0, st)); hide_from(c, st + 0.7)
        follow(c, max(0.0, st), st + 0.7, lambda s, st=st, path=path: path(min(1.0, (max(0.0, st) - st) / 0.7 + s * (1 - (max(0.0, st) - st) / 0.7))), face=False)
        _keys(c, "rotation_euler", max(0.0, st), st + 0.7, lambda s, spin=spin: spin * s)
    return pile


def chunks(name, region, t, n=10, mat="soil", size=0.35, fall=1.5, dur=0.9):
    """a cave-in: n lumps break off inside region=((x0,x1),(y0,y1),(z0,z1)) and fall by 'fall' metres, tumbling."""
    out = []
    (x0, x1), (y0, y1), (z0, z1) = region
    for i in range(n):
        p = Vector((x0 + (x1 - x0) * RNG.random(), y0 + (y1 - y0) * RNG.random(), z0 + (z1 - z0) * RNG.random()))
        c = box(f"{name}_{i}", [size * (0.6 + 0.8 * RNG.random()) for _ in range(3)], p, mat, origin="center", bevel=0.05)
        st = t + 0.35 * RNG.random()
        hide_until(c, st)
        spin = Vector((RNG.random() - 0.5, RNG.random() - 0.5, RNG.random() - 0.5)) * 5
        drop = fall * (0.7 + 0.6 * RNG.random())
        _keys(c, "location", st, st + dur, lambda s, p=p, drop=drop: p + Vector((0, 0, -drop * s * s)))
        _keys(c, "rotation_euler", st, st + dur, lambda s, spin=spin: spin * s)
        out.append(c)
    return out


def arrows(name, starts, direction, t0, t1, length=1.0, mat="arrow", pulse=0.25, width=0.32):
    """block arrows that push along direction (x, y, z) from each start point, bobbing, then pop away at t1."""
    d = Vector(direction).normalized()
    out = []
    for i, p in enumerate(starts):
        a = arrow_mesh(f"{name}_{i}", length, width, mat)
        a.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        base = Vector(p)
        a.location = base
        appear(a, t0 + 0.06 * i, "pop", 0.35)
        f0, f1 = fr(t0 + 0.35 + 0.06 * i), fr(t1)
        for f in range(f0, f1 + 1, 2):
            tt = (f - f0) / FPS
            a.location = base + d * pulse * (0.5 - 0.5 * math.cos(tt * 2 * math.pi * 1.4))
            a.keyframe_insert("location", frame=f)
        vanish(a, t1, "pop", 0.3)
        out.append(a)
    return out


def flow(name, points, t0, t1, n=8, size=0.09, mat="flow", speed=1.0, stretch=2.4):
    """droplets streaming along a path (water through a pipe, a pour, a stream). Each drop is stretched along its
    direction of travel (stretch=1 for round beads). Loops until t1. For a pour, use 10+ drops of size 0.025-0.04."""
    pts = [Vector(p) for p in points]
    seg = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    total = sum(seg) or 1.0

    def at(u):
        u = (u % 1.0) * total
        for i, L in enumerate(seg):
            if u <= L or i == len(seg) - 1:
                return pts[i].lerp(pts[i + 1], min(1.0, u / L if L else 0))
            u -= L
    out = []
    for i in range(n):
        b = sphere(f"{name}_{i}", size, pts[0], mat, seg=12)
        b.scale = (1, 1, stretch)
        hide_until(b, t0); hide_from(b, t1)
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1):
            tt = (f - f0) / FPS
            u = i / n + tt * speed * 1.2 / total * 2.0
            p0 = at(u); p1 = at(u + 0.004)
            b.location = p0; b.keyframe_insert("location", frame=f)
            if stretch != 1 and (p1 - p0).length > 1e-6:
                b.rotation_euler = (p1 - p0).to_track_quat("Z", "Y").to_euler(); b.keyframe_insert("rotation_euler", frame=f)
        out.append(b)
    return out


def overlay(name, rect, mat, t0=None, t1=None, how="up", cut=None):
    """a tinted patch laid on the cut face (y = 0) to show wet soil, groundwater, heat, etc.
    rect = (x0, x1, z0, z1). how = up (grows from the bottom) | down | out (from the middle)."""
    x0, x1, z0, z1 = rect
    org = "bottom" if how == "up" else ("top" if how == "down" else "center")
    zloc = z0 if how == "up" else (z1 if how == "down" else (z0 + z1) / 2)
    o = box(name, (x1 - x0, 0.01, z1 - z0), ((x0 + x1) / 2, -0.012, zloc), mat, origin=org)
    if cut is not None:                          # keep the patch off an open hole: subtract the hole's cutter
        md = o.modifiers.new("cut", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cut; _try(md, "solver", SOLVER)
    if t0 is not None:
        if how == "out":
            hide_until(o, t0)
            _keys(o, "scale", t0, t1, lambda s: Vector([max(0.001, ease(s))] * 3))
        else:
            level(o, [(t0, 0.0), (t1, 1.0)])
    return o


def swarm(name, center, t0, t1, n=14, radius=0.8, mat="black_rubber", size=0.03):
    """tiny things buzzing around a point (insects, bacteria, sparks)."""
    c = Vector(center)
    for i in range(n):
        s = sphere(f"{name}_{i}", size, c, mat, seg=8)
        hide_until(s, t0); hide_from(s, t1)
        ph = [RNG.random() * 6.28 for _ in range(3)]; fq = [1.5 + RNG.random() * 2.5 for _ in range(3)]
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1):
            tt = (f - f0) / FPS
            s.location = c + Vector([radius * math.sin(fq[k] * tt * 2 + ph[k]) * (0.6 if k == 2 else 1) for k in range(3)])
            s.keyframe_insert("location", frame=f)


def rain(t0, t1, area=((-10, 10), (-1, 16)), n=260, mat="arrow_blue"):
    """falling rain streaks over the yard."""
    (x0, x1), (y0, y1) = area
    y0 = max(y0, 0.3)                      # never in front of the cut face (it would fall through the section)
    for i in range(n):
        d = cyl(f"rain_{i}", 0.008, 0.55, (0, 0, 0), mat, verts=4, origin="center")
        x = x0 + (x1 - x0) * RNG.random(); y = y0 + (y1 - y0) * RNG.random()
        ph = RNG.random()
        hide_until(d, t0); hide_from(d, t1)
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1, 1):
            tt = (f - f0) / FPS
            z = 9.3 - ((tt * 1.6 + ph) % 1.0) * 9.0         # lands on the lawn (z > 0.3), never below it
            d.location = (x, y, z); d.keyframe_insert("location", frame=f)


def bubbles(name, origin, t0, t1, n=10, rise=1.0, mat="white", spread=0.4):
    o = Vector(origin)
    for i in range(n):
        b = sphere(f"{name}_{i}", 0.025 + 0.02 * RNG.random(), o, mat, seg=10)
        hide_until(b, t0); hide_from(b, t1)
        off = Vector(((RNG.random() - 0.5) * spread, RNG.random() * 0.3, 0)); ph = RNG.random()
        f0, f1 = fr(t0), fr(t1)
        for f in range(f0, f1 + 1):
            tt = (f - f0) / FPS
            u = (tt * 0.8 + ph) % 1.0
            b.location = o + off + Vector((0.05 * math.sin(u * 12), 0, rise * u)); b.keyframe_insert("location", frame=f)


# ------------------------------------------------------------------ camera

def camera(shots):
    """shots = [dict(t0=, t1=, a=((x,y,z), (look x,y,z)), b=((x,y,z), (look)), lens=35), ...] in time order.
    Hard cut at every shot start, smooth ease inside a shot. Cover the whole video with no gaps."""
    cam = bpy.context.scene.camera
    pref = bpy.context.preferences.edit
    old = pref.keyframe_new_interpolation_type
    pref.keyframe_new_interpolation_type = "CONSTANT"
    for sh in shots:
        f0, f1 = fr(sh["t0"]), fr(sh["t1"])
        (pa, la), (pb, lb) = sh["a"], sh.get("b", sh["a"])
        lens_a = sh.get("lens", 35); lens_b = sh.get("lens_b", lens_a)
        for f in range(f0, f1 + 1):
            s = ease((f - f0) / max(1, f1 - f0), sh.get("ease", "inout"))
            p = Vector(lerp(pa, pb, s)); l = Vector(lerp(la, lb, s))
            cam.location = p; cam.keyframe_insert("location", frame=f)
            cam.rotation_euler = (l - p).to_track_quat("-Z", "Y").to_euler(); cam.keyframe_insert("rotation_euler", frame=f)
            cam.data.lens = lens_a + (lens_b - lens_a) * s; cam.data.keyframe_insert("lens", frame=f)
    pref.keyframe_new_interpolation_type = old


def linear_keys():
    """call once at the start of build(): new keys interpolate linearly (we key every frame anyway)."""
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"


# camera framings around a focus point F = (x, y, z), always from the open side (y < 0)
VIEWS = {
    "wide":    ((0.6, -13.0, 4.4), (0.0, 5.0, 0.4), 34),   # house, lawn and the whole section (the reference's main shot)
    "section": ((0.0, -9.0, 1.2), (0.0, 0.8, -0.5), 34),   # the cut face head-on, lawn edge in the upper half
    "close":   ((0.6, -5.6, 0.35), (0.0, 0.6, -0.45), 32), # near the action, still showing the cut face
    "high":    ((0.0, -7.0, 5.2), (0.0, 1.8, -0.5), 32),   # above, looking down into the hole and the section
    "left":    ((-6.0, -8.0, 2.6), (0.0, 1.2, -0.4), 32),  # three-quarter from the left
    "right":   ((6.0, -8.0, 2.6), (0.0, 1.2, -0.4), 32),   # three-quarter from the right
    "low":     ((1.0, -7.0, -0.3), (0.0, 0.8, -0.2), 32),  # just under the lawn line, looking along the section
    "house":   ((0.5, -9.0, 1.2), (0.3, 9.0, 3.8), 34),    # lawn level, looking at the house and sky
}


def view(kind, F, t0, t1, push=0.1, slide=0.0, lift=0.0, lens=None):
    """one shot: camera at VIEWS[kind] around focus F, drifting toward F by 'push' (fraction) and sideways by 'slide' metres."""
    off, look, ln = VIEWS[kind]
    F = Vector(F); pa = F + Vector(off); la = F + Vector(look)
    pb = pa.lerp(la, push) + Vector((slide, 0, lift))
    return dict(t0=t0, t1=t1, a=(tuple(pa), tuple(la)), b=(tuple(pb), tuple(la + Vector((slide * 0.3, 0, 0)))), lens=lens or ln)


def cuts(t0, t1, F, kinds, every=2.2, push=0.1):
    """split t0..t1 into shots of about 'every' seconds, cycling through kinds, alternating drift direction."""
    n = max(1, round((t1 - t0) / every))
    out = []
    for i in range(n):
        a = t0 + (t1 - t0) * i / n; b = t0 + (t1 - t0) * (i + 1) / n
        out.append(view(kinds[i % len(kinds)], F, a, b, push=push, slide=0.5 if i % 2 else -0.5))
    return out


# ------------------------------------------------------------------ containers cut into the section

def inset(profile, d):
    """shrink a closed 2D outline [(u, z), ...] inward by d metres (any polygon, either winding)."""
    n = len(profile)
    area = sum(profile[i][0] * profile[(i + 1) % n][1] - profile[(i + 1) % n][0] * profile[i][1] for i in range(n)) / 2
    sgn = 1 if area > 0 else -1
    out = []
    for i in range(n):
        p0, p1, p2 = Vector(profile[i - 1]), Vector(profile[i]), Vector(profile[(i + 1) % n])
        e1 = (p1 - p0).normalized(); e2 = (p2 - p1).normalized()
        n1 = Vector((-e1.y, e1.x)) * sgn; n2 = Vector((-e2.y, e2.x)) * sgn
        bis = (n1 + n2)
        if bis.length < 1e-6: bis = n1
        bis.normalize()
        k = d / max(0.2, bis.dot(n1))
        q = p1 + bis * k
        out.append((q.x, q.y))
    return out


def solid(name, profile, y0, y1, mat):
    """a solid whose cross-section (in the cut face) is profile, running from y0 back to y1."""
    return prism(name, profile, y1 - y0, (0, y0, 0), mat)


def lining(name, profile, y1, thick, mat, top=0.0, t=None, how="drop"):
    """a shell of 'thick' metres lying on the walls of a hole cut with the same profile (sand bed, liner, concrete shell).
    Its rim is at z = top. With t it arrives at that time (drop / rise / pop)."""
    outer = [(u, min(z, top)) for u, z in profile]
    inner = [(u, (z if z < top - 1e-6 else top + 1.0)) for u, z in inset(profile, thick)]
    o = solid(name, outer, 0.0, y1, mat)
    cutter = solid(name + "_in", inner, -0.5, y1 - thick, mat)
    cutter.hide_render = True; cutter.display_type = "WIRE"
    md = o.modifiers.new("hollow", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cutter; _try(md, "solver", SOLVER)
    if t is not None:
        appear(o, t, how, 0.6, dist=3.0)
    return o


def liquid(name, profile, y1, mat, keys, kind="inout"):
    """liquid inside a container with this inner profile, from the cut face back to y1.
    keys = [(t, surface_z), ...]: the surface height over time (start below the floor for 'empty')."""
    zs = [z for _, z in profile]; zb = min(zs) - 0.05
    top = max(zs)
    body = solid(name, [(u, (z if z < top - 1e-6 else top + 1.0)) for u, z in profile], 0.0, y1, mat)
    lv = box(name + "_level", (40, 40, 1.0), (0, 10, zb), mat, origin="bottom")
    lv.hide_render = True; lv.display_type = "WIRE"
    md = body.modifiers.new("level", "BOOLEAN"); md.operation = "INTERSECT"; md.object = lv; _try(md, "solver", SOLVER)
    lv.scale.z = max(0.001, keys[0][1] - zb)
    for (ta, za), (tb, zb2) in zip(keys, keys[1:]):
        _keys(lv, "scale", ta, tb, lambda s, za=za, zb2=zb2: Vector((1, 1, max(0.001, za + (zb2 - za) * ease(s, kind) - zb))))
    first_full = next((t for t, z in keys if z > zb + 0.02), None)
    if keys[0][1] <= zb + 0.02 and first_full is not None:
        hide_until(body, keys[0][0])
    return body, lv


def gravel(name, region, t=None, size=0.045, how="pop"):
    """a gravel bed you can see stone by stone: a gravel-textured block filling region = ((x0, x1), (y0, y1), (z0, z1))
    plus real 3D stones scattered on its cut face (y = y0) and top. Use it for drains, soakaways, footings, paths.
    With t it arrives at that time."""
    (x0, x1), (y0, y1), (z0, z1) = region
    blk = box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, z0), "gravel")
    shapes = []
    for k in range(3):                                   # three stone shapes, shared by every stone
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        rr = random.Random(k + 11)
        for v in bm.verts: v.co *= 0.75 + 0.5 * rr.random()
        me = bpy.data.meshes.new(f"{name}_stone{k}"); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        me.materials.append(M("rock")); shapes.append(me)
    stones = []
    face = (x1 - x0) * (z1 - z0); top = (x1 - x0) * min(0.6, y1 - y0)
    n = int(min(900, (face + top) / (size * size) * 1.1))
    for i in range(n):
        st = bpy.data.objects.new(f"{name}_s{i}", shapes[i % 3]); _link(st)
        sc = size * (0.6 + 0.8 * RNG.random()); st.scale = (sc, sc * (0.7 + 0.4 * RNG.random()), sc * (0.6 + 0.3 * RNG.random()))
        st.rotation_euler = (RNG.random() * 6.3, RNG.random() * 6.3, RNG.random() * 6.3)
        if RNG.random() < face / (face + top):
            st.location = (x0 + (x1 - x0) * RNG.random(), y0 + 0.01 + 0.02 * RNG.random(), z0 + (z1 - z0) * RNG.random())
        else:
            st.location = (x0 + (x1 - x0) * RNG.random(), y0 + min(0.6, y1 - y0) * RNG.random(), z1 + 0.01)
        st.parent = blk; st.location = st.location - blk.location
        stones.append(st)
    if t is not None:
        appear(blk, t, how, 0.5)
    return blk


# ------------------------------------------------------------------ organic pits (ponds, craters, sinkholes, root balls)

def blob(cx, cy, rx, ry, wobble=0.07, n=72, seed=3):
    """a natural closed outline seen from above: an ellipse with a gentle random wobble. Returns [(x, y), ...]."""
    rr = random.Random(seed)
    harm = [(k, rr.uniform(-wobble, wobble), rr.uniform(0, 6.28)) for k in (2, 3, 5)]
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        f = 1 + sum(w * math.sin(k * a + ph) for k, w, ph in harm)
        out.append((cx + rx * f * math.cos(a), cy + ry * f * math.sin(a)))
    return out


def _center(outline):
    return (sum(p[0] for p in outline) / len(outline), sum(p[1] for p in outline) / len(outline))


def loft(name, outline, levels, mat, grow=0.0):
    """a closed solid through stacked rings: levels = [(scale, z), ...] from the top down; each ring is the outline
    scaled about its centre. grow adds metres all round (positive = bigger, used for shells)."""
    cx, cy = _center(outline)
    bm = bmesh.new(); rings = []
    for sc, z in levels:
        ring = []
        for x, y in outline:
            dx, dy = x - cx, y - cy; r = math.hypot(dx, dy) or 1.0
            k = sc + grow / r
            ring.append(bm.verts.new((cx + dx * k, cy + dy * k, z - (grow if z < 0.9 else 0.0))))
        rings.append(ring)
    n = len(outline)
    for ra, rb in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me))
    me.materials.append(M(mat) if isinstance(mat, str) else mat)
    return ob


_KEEP = None


def behind_cut(ob):
    """trim anything that sticks out in front of the cut face (y < 0), so the section stays a clean slice."""
    global _KEEP
    if _KEEP is None or _KEEP.name not in bpy.data.objects:
        _KEEP = box("_keep_behind_cut", (200, 100, 80), (0, 50, -40), "soil")
        _KEEP.hide_render = True; _KEEP.display_type = "WIRE"
    md = ob.modifiers.new("behind_cut", "BOOLEAN"); md.operation = "INTERSECT"; md.object = _KEEP; _try(md, "solver", SOLVER)
    return ob


def pit(name, outline, levels, t0=None, t1=None, extra=None):
    """dig an organic hole into the soil block: outline from blob(), levels = [(scale, z), ...] below the lawn,
    e.g. [(1.0, -0.05), (0.96, -0.38), (0.72, -0.42), (0.62, -1.3)] for a pond with a plant shelf.
    Keep part of the outline at y < 0 so the cut face slices through it. Returns the (hidden) cutter."""
    c = loft(name, outline, [(levels[0][0], 1.0)] + list(levels), "soil")
    c.hide_render = True; c.display_type = "WIRE"
    mod = SOIL.modifiers.new(name, "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = c
    _try(mod, "solver", SOLVER)
    if t0 is not None:
        dig(c, t0, t1, extra=extra)
    return c


def pit_shell(name, outline, levels, thick, mat, inset=0.0, top=0.0, t=None, how="drop"):
    """a layer lying on the walls of a pit dug with the same outline/levels (sand bed, rubber liner, concrete):
    'inset' = how far inside the pit wall it starts, 'thick' = its thickness; its rim sits at z = top."""
    outer_lv = [(levels[0][0], top)] + list(levels)
    outer = loft(name, outline, outer_lv, mat, grow=-inset)
    inner = loft(name + "_in", outline, [(levels[0][0], top + 1.0)] + list(levels), mat, grow=-(inset + thick))
    inner.hide_render = True; inner.display_type = "WIRE"
    md = outer.modifiers.new("hollow", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = inner; _try(md, "solver", SOLVER)
    behind_cut(outer)
    if t is not None:
        appear(outer, t, how, 0.6, dist=3.0)
    return outer


def pit_liquid(name, outline, levels, mat, keys, inset=0.1, kind="inout"):
    """water (or mud, oil...) filling a pit inside its lining: keys = [(t, surface_z), ...]. Returns (body, level box, shape)
    where 'shape' is a hidden copy of the water's outline you can intersect overlays with (cut face layers)."""
    body = loft(name, outline, [(levels[0][0], 1.0)] + list(levels), mat, grow=-inset)
    shape = loft(name + "_shape", outline, [(levels[0][0], 1.0)] + list(levels), mat, grow=-inset)
    shape.hide_render = True; shape.display_type = "WIRE"
    zb = min(z for _, z in levels) - inset - 0.05
    lv = box(name + "_level", (40, 40, 1.0), (0, 10, zb), mat, origin="bottom")
    lv.hide_render = True; lv.display_type = "WIRE"
    md = body.modifiers.new("level", "BOOLEAN"); md.operation = "INTERSECT"; md.object = lv; _try(md, "solver", SOLVER)
    behind_cut(body)
    lv.scale.z = max(0.001, keys[0][1] - zb)
    for (ta, za), (tb, zb2) in zip(keys, keys[1:]):
        _keys(lv, "scale", ta, tb, lambda s, za=za, zb2=zb2: Vector((1, 1, max(0.001, za + (zb2 - za) * ease(s, kind) - zb))))
    return body, lv, shape


def pit_cap(name, outline, z_top, thick, mat, grow=-0.1):
    """a thin sheet over a pit following its outline (ice, a cover, a lid), pivot at its top (use level() to grow it down)."""
    cx, cy = _center(outline)
    local = [(x - cx, y - cy) for x, y in outline]
    ob = loft(name, local, [(1.0, 0.0), (0.985, -thick)], mat, grow=grow)
    ob.location = (cx, cy, z_top)
    behind_cut(ob)
    return ob


def inside(outline, scale=0.75, n=8, min_gap=0.7, seed=5, y_min=0.25):
    """n spread-out points inside an outline (scaled about its centre), behind the cut face: for lilies, plants, rocks."""
    cx, cy = _center(outline); rr = random.Random(seed); pts = []
    poly = [(cx + (x - cx) * scale, cy + (y - cy) * scale) for x, y in outline]

    def within(px, py):
        c = False
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-12) + x1: c = not c
        return c
    xs = [x for x, _ in poly]; ys = [y for _, y in poly]
    for _ in range(4000):
        if len(pts) >= n: break
        px, py = rr.uniform(min(xs), max(xs)), rr.uniform(max(min(ys), y_min), max(ys))
        if within(px, py) and all(math.hypot(px - a, py - b) >= min_gap for a, b in pts): pts.append((px, py))
    return pts


def clip_to(ob, shape):
    """keep only the part of ob that lies inside shape (e.g. a cut-face colour layer inside the water)."""
    md = ob.modifiers.new("clip", "BOOLEAN"); md.operation = "INTERSECT"; md.object = shape; _try(md, "solver", SOLVER)
    return ob


def outline_points(outline, y_min=0.08, every=1):
    """points of an outline that lie behind the cut face (for edge stones, plants, a fence)."""
    return [p for i, p in enumerate(outline) if p[1] >= y_min and i % every == 0]
