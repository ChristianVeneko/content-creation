# Eevee renderer of the 3D templates. Run headless by lib/blender.mjs:
#   blender -b --factory-startup -noaudio -P scene.py -- job.json frames_dir
# job.json comes from lib/blender-job.mjs (scene plan, parts, per-frame transforms, camera). This script only builds
# meshes and materials and sets transforms; it never re-plans. Coordinates in the job are three.js space (y up);
# meshes are built in that space and every object is placed with matrix_world = C @ M3, C rotating y-up to z-up.
# Anything it cannot build is skipped with a BLENDER_WARN line (never a crash).
import json
import math
import os
import random
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
JOB = json.load(open(argv[0]))
OUT = argv[1]
C = Matrix.Rotation(math.pi / 2, 4, "X")
CINV = C.inverted()
DEG = math.pi / 180


def warn(msg):
    print("BLENDER_WARN " + msg, flush=True)


# ---------------------------------------------------------------- colors and materials

def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgba(hexcolor, a=1.0):
    h = hexcolor.lstrip("#")
    if len(h) == 3:
        h = "".join(x + x for x in h)
    return (lin(int(h[0:2], 16) / 255), lin(int(h[2:4], 16) / 255), lin(int(h[4:6], 16) / 255), a)


def mix_hex(a, b, t):
    pa = [int(a.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    pb = [int(b.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * t) for x, y in zip(pa, pb))


def setin(node, name, value):
    try:
        node.inputs[name].default_value = value
    except (KeyError, TypeError):
        pass


# (roughness, metallic, coat, alpha, specular) per material family
FAMILY = {
    "clay": (0.82, 0.0, 0.0, 1.0, 0.3), "toon": (0.55, 0.0, 0.0, 1.0, 0.1), "glass": (0.08, 0.0, 1.0, 0.55, 0.6),
    "gloss": (0.22, 0.0, 0.8, 1.0, 0.5), "paper": (1.0, 0.0, 0.0, 1.0, 0.1), "plastic": (0.3, 0.0, 0.7, 1.0, 0.5),
    "holo": (0.2, 0.0, 0.0, 0.75, 0.5), "matte": (0.9, 0.0, 0.0, 1.0, 0.2), "soft": (0.6, 0.0, 0.2, 1.0, 0.3),
    "paint": (0.25, 0.2, 1.0, 1.0, 0.5), "voxel": (0.8, 0.0, 0.0, 1.0, 0.2), "metal": (0.24, 1.0, 0.0, 1.0, 0.5),
    "emissive": (0.5, 0.0, 0.0, 1.0, 0.0),
}
_mats = {}


def material(color, mat, emissive, fade=False, opacity=1.0, unique=False):
    key = (color, mat, round(emissive, 2), fade, round(opacity, 2))
    if not unique and key in _mats:
        return _mats[key]
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    rough, metal, coat, alpha, spec = FAMILY.get(mat, FAMILY["clay"])
    col = mix_hex(color, "#FFFFFF", 0.15) if mat == "metal" else color
    setin(b, "Base Color", rgba(col))
    setin(b, "Roughness", rough)
    setin(b, "Metallic", metal)
    setin(b, "Coat Weight", coat)
    setin(b, "Specular IOR Level", spec)
    if mat == "emissive":
        setin(b, "Emission Color", rgba(color))
        setin(b, "Emission Strength", max(1.0, emissive) * 1.6)
    elif emissive > 0:
        setin(b, "Emission Color", rgba(color))
        setin(b, "Emission Strength", emissive * 0.8)
    elif mat in ("holo", "glass"):
        setin(b, "Emission Color", rgba(color))
        setin(b, "Emission Strength", 0.5)
    a = alpha * opacity
    setin(b, "Alpha", a)
    if a < 0.999 or fade:
        try:
            m.surface_render_method = "BLENDED"
        except (AttributeError, TypeError):
            pass
    m["alpha_input"] = True
    if not unique:
        _mats[key] = m
    return m


def set_alpha(m, a):
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    setin(b, "Alpha", a)


# ---------------------------------------------------------------- geometry (three.js space, y up)

def smooth(mesh):
    for p in mesh.polygons:
        p.use_smooth = True


def mesh_from(verts, faces, name="g", smooth_shade=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if smooth_shade:
        smooth(me)
    return me


def from_bm(bm, name="g", smooth_shade=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth_shade:
        smooth(me)
    return me


def zup_to_yup(bm):
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2, 4, "X"), verts=bm.verts)


def g_box(p):
    s = p.get("size") or [0.5]
    w, h, d = (s + [s[0], s[0]])[:3] if len(s) == 1 else s[:3]
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, d), verts=bm.verts)
    return from_bm(bm, "box", False)


def g_sphere(p):
    s = p.get("size") or [0.5]
    rx, ry, rz = (s[0], s[0], s[0]) if len(s) == 1 else s[:3]
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=1.0)
    bmesh.ops.scale(bm, vec=(rx, ry, rz), verts=bm.verts)
    return from_bm(bm, "sphere")


def g_cylinder(p, cone=False):
    s = p.get("size") or [0.3, 1.0]
    if cone:
        rt, rb, h = 0.0, s[0], (s[1] if len(s) > 1 else 1.0)
    elif len(s) == 3:
        rt, rb, h = s
    else:
        rt = rb = s[0]
        h = s[1] if len(s) > 1 else 1.0
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=36, radius1=rb, radius2=rt, depth=h)
    zup_to_yup(bm)
    return from_bm(bm, "cyl")


def lathe(profile, seg=48, closed_axis=True):
    verts, faces = [], []
    n = len(profile)
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ca, sa = math.cos(a), math.sin(a)
        for r, y in profile:
            verts.append((r * ca, y, r * sa))
    for i in range(seg):
        j = (i + 1) % seg
        for k in range(n - 1):
            faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
    return verts, faces


def g_lathe(p):
    pts = [(max(0.0, q[0]), q[1]) for q in (p.get("points") or [])]
    if len(pts) < 2:
        return None
    v, f = lathe(pts)
    me = mesh_from(v, f, "lathe")
    return me


def g_capsule(p):
    s = p.get("size") or [0.3, 0.5]
    r, L = s[0], (s[1] if len(s) > 1 else 0.5)
    prof = []
    for k in range(0, 9):
        a = math.pi / 2 * k / 8
        prof.append((r * math.sin(a), -L / 2 - r * math.cos(a)))
    for k in range(0, 9):
        a = math.pi / 2 * k / 8
        prof.append((r * math.cos(a), L / 2 + r * math.sin(a)))
    v, f = lathe(prof, 32)
    return mesh_from(v, f, "capsule")


def g_torus(p):
    s = p.get("size") or [0.5, 0.1]
    R, tube = s[0], s[1]
    arc = (s[2] if len(s) > 2 else 360) * DEG
    N, M = 56, 14
    full = abs(arc - 2 * math.pi) < 1e-3
    verts, faces = [], []
    cols = N if full else N + 1
    for i in range(cols):
        u = arc * i / N
        for j in range(M):
            v = 2 * math.pi * j / M
            verts.append(((R + tube * math.cos(v)) * math.cos(u), (R + tube * math.cos(v)) * math.sin(u), tube * math.sin(v)))
    for i in range(N if not full else N):
        i2 = (i + 1) % N if full else i + 1
        for j in range(M):
            j2 = (j + 1) % M
            faces.append((i * M + j, i2 * M + j, i2 * M + j2, i * M + j2))
    return mesh_from(verts, faces, "torus")


def g_plane(p):
    s = p.get("size") or [1, 1]
    w, h = s[0], s[1] if len(s) > 1 else s[0]
    return mesh_from([(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)], [(0, 1, 2, 3)], "plane", False)


def g_ring(p):
    s = p.get("size") or [0.3, 0.5]
    ri, ro = s[0], s[1]
    seg = 56
    verts, faces = [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        verts += [(ri * math.cos(a), ri * math.sin(a), 0), (ro * math.cos(a), ro * math.sin(a), 0)]
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((2 * i, 2 * i + 1, 2 * j + 1, 2 * j))
    return mesh_from(verts, faces, "ring", False)


def catmull(pts, per=12):
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(n - 1, i + 2)]
        for k in range(per):
            t = k / per
            t2, t3 = t * t, t ** 3
            out.append(tuple(0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3) for a in range(3)))
    out.append(tuple(pts[-1]))
    return out


def g_tube(p):
    pts = [tuple(q) + (0.0,) * (3 - len(q)) for q in (p.get("points") or [])]
    if len(pts) < 2:
        return None
    rad = (p.get("size") or [0.05])[0]
    path = catmull(pts)
    M = 10
    verts, faces = [], []
    up = Vector((0, 1, 0))
    for i, q in enumerate(path):
        a = Vector(path[min(i + 1, len(path) - 1)]) - Vector(path[max(i - 1, 0)])
        if a.length < 1e-6:
            a = Vector((0, 0, 1))
        a.normalize()
        ref = up if abs(a.dot(up)) < 0.95 else Vector((1, 0, 0))
        n1 = a.cross(ref).normalized()
        n2 = a.cross(n1).normalized()
        for j in range(M):
            ang = 2 * math.pi * j / M
            v = Vector(q) + (n1 * math.cos(ang) + n2 * math.sin(ang)) * rad
            verts.append(tuple(v))
    for i in range(len(path) - 1):
        for j in range(M):
            j2 = (j + 1) % M
            faces.append((i * M + j, (i + 1) * M + j, (i + 1) * M + j2, i * M + j2))
    return mesh_from(verts, faces, "tube")


def g_extrude(p):
    pts = p.get("points") or []
    if len(pts) < 3:
        return None
    depth = (p.get("size") or [0.2])[0]
    bm = bmesh.new()
    front = [bm.verts.new((q[0], q[1], depth / 2)) for q in pts]
    back = [bm.verts.new((q[0], q[1], -depth / 2)) for q in pts]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return from_bm(bm, "extrude", False)


BUILD = {"box": g_box, "sphere": g_sphere, "cylinder": g_cylinder, "cone": lambda p: g_cylinder(p, True), "torus": g_torus,
         "capsule": g_capsule, "plane": g_plane, "sign": g_plane, "ring": g_ring, "tube": g_tube, "extrude": g_extrude, "lathe": g_lathe}

FONT = None


def sign_text(node, parent_obj):
    """Text on a sign panel: a font object lying on the plane (unlit-looking emission)."""
    global FONT
    s = node.get("size") or [1.6, 0.5]
    w, h = s[0], s[1] if len(s) > 1 else s[0]
    text = (node.get("text") or "").upper()
    if not text:
        return None
    cu = bpy.data.curves.new("sign", "FONT")
    cu.body = text
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.size = min(h * 0.4, w * 0.84 / max(1, len(text)))
    if JOB.get("fontPath") and os.path.exists(JOB["fontPath"]):
        if FONT is None:
            FONT = bpy.data.fonts.load(JOB["fontPath"])
        cu.font = FONT
    ob = bpy.data.objects.new("signtxt", cu)
    ink = node.get("textColor") or ("#FFFFFF" if sum(int(node["color"].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) < 380 else "#101010")
    ob.data.materials.append(material(ink, "emissive", 1.0))
    ob.visible_shadow = False
    return ob


# ---------------------------------------------------------------- scene helpers

def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def srgb_ramp_world(stops, sky):
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    lp = nt.nodes.new("ShaderNodeLightPath")
    bg_cam = nt.nodes.new("ShaderNodeBackground")
    bg_amb = nt.nodes.new("ShaderNodeBackground")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tc.outputs["Window"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Y"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg_cam.inputs["Color"])
    # ramp position 0 = bottom of the frame, 1 = top; stops arrive top to bottom
    els = ramp.color_ramp.elements
    n = len(stops)
    while len(els) < n:
        els.new(0.5)
    for i, hexc in enumerate(reversed(stops)):
        els[i].position = i / max(1, n - 1)
        els[i].color = rgba(hexc)
    mid = stops[len(stops) // 2]
    bg_amb.inputs["Color"].default_value = rgba(mid)
    bg_amb.inputs["Strength"].default_value = sky
    bg_cam.inputs["Strength"].default_value = 1.0
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(bg_amb.outputs["Background"], mix.inputs[1])
    nt.links.new(bg_cam.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return w, ramp, bg_amb


def set_world(stops, sky):
    w, _, _ = srgb_ramp_world(stops, sky)
    bpy.context.scene.world = w


def make_light(kind, name, direction, power, color, soft=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = power
    ld.color = tuple(rgba(color)[:3])
    if kind == "SUN" and soft is not None:
        ld.angle = soft
    ob = link(bpy.data.objects.new(name, ld))
    d = (C @ Vector(direction)).normalized()
    ob.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    ob.location = (C @ Vector(direction)) * 10
    return ob


def rot_xyz(r):
    return Matrix.Rotation(r[0], 4, "X") @ Matrix.Rotation(r[1], 4, "Y") @ Matrix.Rotation(r[2], 4, "Z")


def m3(t):
    """Three.js-space matrix of a 9/10/11-number sample: pos(3) rot(3) scale(3)."""
    s = Matrix.Diagonal(Vector((t[6], t[7], t[8], 1.0)))
    return Matrix.Translation(t[0:3]) @ rot_xyz(t[3:6]) @ s


def local_m3(t, pivot):
    if not pivot or not any(pivot):
        return m3(t)
    pv = Vector(pivot)
    return Matrix.Translation(pv) @ m3([t[0], t[1], t[2]] + list(t[3:9])) @ Matrix.Translation(-pv)


class Rig:
    """The parts of one custom model (or the world's parts): objects, parent chain and per-frame transforms."""

    def __init__(self, nodes, collection):
        self.nodes = nodes
        self.obj = []
        self.mats = []
        self.parent = []
        idx = {n["id"]: i for i, n in enumerate(nodes)}
        for n in nodes:
            self.parent.append(idx.get(n.get("parent")))
            shape = n["shape"]
            ob = None
            handle = None
            try:
                if shape == "group":
                    ob = bpy.data.objects.new(n["id"], None)
                else:
                    me = BUILD[shape](n) if shape in BUILD else None
                    if me is None:
                        warn("part %s (%s) could not be built; skipped" % (n["id"], shape))
                    else:
                        ob = bpy.data.objects.new(n["id"], me)
                        fade = bool(n.get("fade")) or n.get("opacity", 1) < 0.999
                        m = material(n["color"], n["mat"], n["emissive"], fade, n.get("opacity", 1.0), unique=fade)
                        me.materials.append(m)
                        handle = m if fade else None
                        if n["mat"] == "emissive":
                            ob.visible_shadow = False
                        if shape == "box" and (n.get("radius") or 0) > 0.002 and not JOB["look"]["blocky"]:
                            bev = ob.modifiers.new("bev", "BEVEL")
                            bev.width = min(n["radius"], min(n.get("size") or [0.5]) / 2 - 0.001)
                            bev.segments = 3
                            bev.limit_method = "ANGLE"
                            smooth(me)
                            try:
                                ob.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
                            except (AttributeError, TypeError, RuntimeError):
                                pass
            except Exception as e:  # a part that cannot be built must not stop the render
                warn("part %s (%s) failed: %s" % (n["id"], shape, e))
                ob = None
            if ob is not None:
                link(ob)
            self.obj.append(ob)
            self.mats.append(handle)
        self.texts = {}
        for i, n in enumerate(nodes):
            if n["shape"] == "sign" and self.obj[i] is not None:
                t = sign_text(n, self.obj[i])
                if t is not None:
                    link(t)
                    self.texts[i] = t

    def apply(self, root, f):
        """root: three-space matrix of the model's origin. Sets every part's matrix_world for frame f."""
        world = {}

        def chain(i, depth=0):
            if i in world:
                return world[i]
            n = self.nodes[i]
            tr = n["track"][min(f, len(n["track"]) - 1)]
            loc = local_m3(tr, n.get("pivot"))
            p = self.parent[i]
            world[i] = (chain(p, depth + 1) if p is not None and depth < 60 else root) @ loc
            return world[i]

        for i, ob in enumerate(self.obj):
            if ob is None:
                continue
            m = chain(i)
            ob.matrix_world = C @ m
            if i in self.texts:
                self.texts[i].matrix_world = C @ m @ Matrix.Translation((0, 0, 0.004))
            n = self.nodes[i]
            if self.mats[i] is not None:
                set_alpha(self.mats[i], n["track"][min(f, len(n["track"]) - 1)][9] * n.get("opacity", 1.0))

    def hide(self, hidden):
        for ob in self.obj:
            if ob is not None:
                ob.hide_render = hidden
        for t in self.texts.values():
            t.hide_render = hidden


def build_ground(g):
    kind = g["kind"]
    if kind == "none":
        return []
    cx, cz = g["center"]
    obs = []
    col = g["color"]
    mat = material(col, "gloss" if kind == "mirror" else "matte", 0.0)
    if kind == "disc":
        r = g["size"] / 2
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=72, radius1=r * 1.02, radius2=r, depth=0.2)
        zup_to_yup(bm)
        me = from_bm(bm, "disc", False)
        me.materials.append(mat)
        ob = link(bpy.data.objects.new("ground", me))
        ob.matrix_world = C @ Matrix.Translation((cx, -0.1, cz))
        return [ob]
    s = g["size"] / 2
    me = mesh_from([(-s, 0, -s), (-s, 0, s), (s, 0, s), (s, 0, -s)], [(0, 1, 2, 3)], "plane", False)
    me.materials.append(mat)
    ob = link(bpy.data.objects.new("ground", me))
    ob.matrix_world = C @ Matrix.Translation((cx, -0.01, cz))
    obs.append(ob)
    if kind == "grid":
        step = 1.2
        lines = int(g["size"] / step)
        verts, faces = [], []
        w = 0.02
        for i in range(-lines // 2, lines // 2 + 1):
            x = i * step
            for (a, b) in (((x - w, -s), (x + w, s)), ):
                k = len(verts)
                verts += [(a[0], 0.004, a[1]), (a[0], 0.004, b[1]), (b[0], 0.004, b[1]), (b[0], 0.004, a[1])]
                faces.append((k, k + 1, k + 2, k + 3))
                k = len(verts)
                verts += [(-s, 0.004, x - w), (s, 0.004, x - w), (s, 0.004, x + w), (-s, 0.004, x + w)]
                faces.append((k, k + 1, k + 2, k + 3))
        gm = mesh_from(verts, faces, "grid", False)
        gm.materials.append(material(g.get("accent", "#59D8FF"), "emissive", 0.5))
        go = link(bpy.data.objects.new("gridlines", gm))
        go.matrix_world = C @ Matrix.Translation((cx, 0, cz))
        go.visible_shadow = False
        obs.append(go)
    return obs


def build_crowd(c):
    rng = random.Random(c.get("seed", 1))
    n = c["count"]
    w, d = c["area"]
    cx, cy, cz = c["pos"]
    hgt = c["height"]
    rows = max(1, min(8, round(d / 0.9)))
    per_row = math.ceil(n / rows)
    tier = 0.34
    bm = bmesh.new()
    risers = bmesh.new()
    for k in range(rows):
        h = (k + 1) * tier
        bmesh.ops.create_cube(risers, size=1.0, matrix=Matrix.Translation((cx, cy + h / 2, cz + d / 2 - (k + 0.5) * (d / rows))) @ Matrix.Diagonal(Vector((w + 1, h, (d / rows) * 0.96, 1))))
    for i in range(n):
        row, col = i // per_row, i % per_row
        x = cx + ((col + 0.5) / per_row - 0.5) * w + (rng.random() - 0.5) * (w / per_row) * 0.6
        z = cz + d / 2 - (row + 0.5) * (d / rows) + (rng.random() - 0.5) * 0.2
        y = cy + (row + 1) * tier
        s = hgt * (0.85 + 0.3 * rng.random())
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0, matrix=Matrix.Translation((x, y + s * 0.5, z)) @ Matrix.Diagonal(Vector((0.3 * s, 0.22 * s, 0.17 * s, 1))))
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0, matrix=Matrix.Translation((x, y + s * 0.86, z)) @ Matrix.Diagonal(Vector((0.16 * s, 0.18 * s, 0.16 * s, 1))))
        if rng.random() > 0.55:
            for sg in (-1, 1):
                bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.05 * s, radius2=0.05 * s, depth=0.4 * s, matrix=Matrix.Translation((x + sg * 0.22 * s, y + s * 0.7, z)) @ Matrix.Rotation(-sg * 0.45, 4, "Y") @ Matrix.Rotation(-math.pi / 2, 4, "X"))
    out = []
    for b, col, nm in ((bm, c["color"], "crowd"), (risers, mix_hex(c["color"], "#000000", 0.35), "risers")):
        me = from_bm(b, nm)
        me.materials.append(material(col, "matte", 0.0))
        ob = link(bpy.data.objects.new(nm, me))
        ob.matrix_world = C
        out.append(ob)
    return out


def ease_out(u):
    return 1 - (1 - max(0.0, min(1.0, u))) ** 3


def import_model(path, height):
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=path)
    except Exception as e:
        warn("model %s could not be imported: %s" % (os.path.basename(path), e))
        return None
    new = [o for o in bpy.data.objects if o not in before]
    if not new:
        return None
    root = bpy.data.objects.new("model_root", None)
    link(root)
    mins, maxs = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in new:
        if o.type == "MESH":
            for corner in o.bound_box:
                w = o.matrix_world @ Vector(corner)
                mins = Vector(min(a, b) for a, b in zip(mins, w))
                maxs = Vector(max(a, b) for a, b in zip(maxs, w))
    h = max(1e-3, maxs.z - mins.z)
    fit = Matrix.Diagonal(Vector((height / h,) * 3 + (1,))) @ Matrix.Translation(Vector(((mins.x + maxs.x) / -2, (mins.y + maxs.y) / -2, -mins.z)))
    for o in new:
        if o.parent is None:
            o.parent = root
    return root, fit


# ---------------------------------------------------------------- scene setup

def setup_render(scene):
    r = JOB["render"]
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = eng
            break
        except TypeError:
            continue
    scene.render.resolution_x = r["width"]
    scene.render.resolution_y = r["height"]
    scene.render.resolution_percentage = r.get("scale", 100)
    scene.render.fps = r["fps"]
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.compression = 15
    scene.render.film_transparent = False
    ev = scene.eevee
    for attr, val in (("taa_render_samples", r.get("samples", 16)), ("use_raytracing", False), ("use_shadows", True), ("use_gtao", True)):
        try:
            setattr(ev, attr, val)
        except (AttributeError, TypeError):
            pass
    vt = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items]
    want = {"neutral": "Khronos PBR Neutral", "aces": "Khronos PBR Neutral", "standard": "Standard"}.get(JOB["look"]["tone"], "Standard")
    scene.view_settings.view_transform = want if want in vt else "Standard"
    try:
        scene.view_settings.look = "None"
    except TypeError:
        pass
    scene.view_settings.exposure = JOB["look"]["exposure"]


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.lights, bpy.data.cameras):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)


def run():
    scene = bpy.context.scene
    setup_render(scene)
    os.makedirs(OUT, exist_ok=True)
    look = JOB["look"]
    t_all = time.time()
    done = 0
    for sc in JOB["scenes"]:
        clear_scene()
        _mats.clear()
        t0 = time.time()
        set_world(sc["bg"]["stops"], look["sky"] * 0.55)
        key = look["key"]
        make_light("SUN", "key", (-5, 9, 7), key["power"] * 0.32, key["color"], 0.07)
        make_light("SUN", "fill", (7, 4, 3), key["power"] * 0.28, mix_hex(key["color"], look["palette"]["accent2"], 0.25), 0.4)
        make_light("SUN", "rim", (0, 5, -9), key["power"] * 0.45, look["palette"]["accent3"], 0.1)
        cam_data = bpy.data.cameras.new("cam")
        cam_data.sensor_fit = "VERTICAL"
        cam_data.clip_start = 0.1
        cam_data.clip_end = 400
        cam = link(bpy.data.objects.new("cam", cam_data))
        scene.camera = cam
        if sc["ortho"]:
            cam_data.type = "ORTHO"
        ground = build_ground(sc["ground"])
        world = Rig(sc["world"]["parts"], None) if sc["world"]["parts"] else None
        crowd = build_crowd(sc["world"]["crowd"]) if sc["world"]["crowd"] else []
        rigs = []
        for o in sc["objects"]:
            r = {"o": o, "rig": None, "model": None, "decor": []}
            if o["model"] and not o["parts"]:
                imp = import_model(o["model"], o["h"] / max(1e-6, o["scale"]))
                if imp:
                    r["model"] = imp
            if o["parts"]:
                r["rig"] = Rig(o["parts"], None)
            if o["highlight"]:
                ring = {"id": "hl", "shape": "torus", "size": [0.95, 0.04], "rot": [0, 0, 0], "color": look["palette"]["accent"], "mat": "emissive", "emissive": 1.0, "track": [[0, 0.05, 0, math.pi / 2, 0, 0, 1, 1, 1, 1]]}
                r["decor"] = Rig([ring], None)
            rigs.append(r)
        conns = []
        for c in sc["connections"]:
            a, b = Vector(c["from"]), Vector(c["to"])
            d = b - a
            if d.length < 0.01:
                continue
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.045, radius2=0.045, depth=1.0, matrix=Matrix.Translation((0, 0, 0.5)))
            zup_to_yup(bm)
            sh = link(bpy.data.objects.new("conn", from_bm(bm, "conn")))
            sh.data.materials.append(material(c["color"], "emissive", 0.6))
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.16, radius2=0.0, depth=0.3, matrix=Matrix.Translation((0, 0, 0.15)))
            zup_to_yup(bm)
            hd = link(bpy.data.objects.new("head", from_bm(bm, "head")))
            hd.data.materials.append(material(c["color"], "emissive", 0.6))
            conns.append((c, sh, hd, a, d))
        fxo = []
        for fx in sc["fx"]:
            if fx["type"] == "spotlight":
                ld = bpy.data.lights.new("spot", "SPOT")
                ld.energy = 4000 * fx["size"]
                ld.spot_size = 0.6 * fx["size"]
                ld.spot_blend = 0.5
                ld.color = tuple(rgba(fx["color"])[:3])
                ob = link(bpy.data.objects.new("spot", ld))
                fxo.append((fx, ob, None))
            elif fx["type"] in ("shockwave", "glow"):
                bm = bmesh.new()
                if fx["type"] == "shockwave":
                    bmesh.ops.create_cone(bm, cap_ends=False, segments=48, radius1=1.0, radius2=1.0, depth=0.05)
                    zup_to_yup(bm)
                else:
                    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
                me = from_bm(bm, "fx")
                me.materials.append(material(fx["color"], "emissive", 0.8, True, 0.5, unique=True))
                ob = link(bpy.data.objects.new("fx", me))
                ob.visible_shadow = False
                fxo.append((fx, ob, me.materials[0]))
            elif fx["type"] == "particles":
                rng = random.Random(7 + sc["index"])
                bm = bmesh.new()
                bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=1.0)
                me = from_bm(bm, "pt")
                me.materials.append(material(fx["color"], "emissive", 0.9))
                dots = []
                for _ in range(min(fx["count"], 120)):
                    ob = link(bpy.data.objects.new("p", me))
                    ob.visible_shadow = False
                    dots.append((ob, [rng.uniform(-1, 1) for _ in range(6)]))
                fxo.append((fx, dots, None))

        frames = sc["frames"]
        for f in (sc.get("only") or range(frames)):
            t = f / JOB["render"]["fps"]
            c = sc["camera"][f]
            pos = C @ Vector(c[0:3])
            tgt = C @ Vector(c[3:6])
            cam.location = pos
            cam.rotation_euler = (tgt - pos).to_track_quat("-Z", "Y").to_euler()
            if sc["ortho"]:
                cam_data.ortho_scale = c[6]
            else:
                cam_data.angle_y = c[6] * DEG
            if world:
                world.apply(Matrix.Identity(4), f)
            for r in rigs:
                o = r["o"]
                tr = o["object"][min(f, len(o["object"]) - 1)]
                hidden = tr[10] < 0.5
                root = m3(tr[0:9])
                if r["rig"]:
                    r["rig"].hide(hidden)
                    r["rig"].apply(root, f)
                if r["model"]:
                    mroot, fit = r["model"]
                    mroot.hide_render = hidden
                    mroot.matrix_world = C @ root @ CINV @ fit
                if r["decor"]:
                    r["decor"].hide(hidden or t < o["enter"] + 0.3)
                    r["decor"].apply(root @ Matrix.Diagonal(Vector((1.0,) * 3 + (1.0,))), 0)
            for c_, sh, hd, a, d in conns:
                u = ease_out((t - c_["enter"]) / 0.5)
                vis = u > 0.001
                sh.hide_render = hd.hide_render = not vis
                if vis:
                    ln = d.length
                    z = d.normalized()
                    rot = Vector((0, 1, 0)).rotation_difference(z).to_matrix().to_4x4()
                    sh.matrix_world = C @ Matrix.Translation(a) @ rot @ Matrix.Diagonal(Vector((1, max(0.001, (ln - 0.3) * u), 1, 1)))
                    hd.matrix_world = C @ Matrix.Translation(a + z * (ln - 0.3) * u) @ rot
            for fx, ob, mt in fxo:
                at = fx["at"]
                anchor = fx.get("anchor")
                if fx["type"] == "spotlight":
                    ob.location = C @ Vector(fx["pos"])
                    tg = fx["aim"] if fx["aim"] else fx["target"][min(f, len(fx["target"]) - 1)]
                    ob.rotation_euler = ((C @ Vector(tg)) - ob.location).to_track_quat("-Z", "Y").to_euler()
                    ob.hide_render = t < at
                elif fx["type"] == "shockwave":
                    u = (t - at) / 1.2
                    ob.hide_render = not (0 <= u <= 1)
                    if not ob.hide_render:
                        a0 = anchor[min(f, len(anchor) - 1)]
                        ob.matrix_world = C @ Matrix.Translation((a0[0], 0.05, a0[2])) @ Matrix.Diagonal(Vector((2.5 * ease_out(u) * fx["size"] + 0.1, 1, 2.5 * ease_out(u) * fx["size"] + 0.1, 1)))
                        set_alpha(mt, 0.5 * (1 - u))
                elif fx["type"] == "glow":
                    ob.hide_render = t < at or (fx["until"] is not None and t > fx["until"])
                    a0 = anchor[min(f, len(anchor) - 1)]
                    ob.matrix_world = C @ Matrix.Translation(a0) @ Matrix.Diagonal(Vector((1.1 * fx["size"],) * 3 + (1,)))
                    set_alpha(mt, 0.18)
                elif fx["type"] == "particles":
                    a0 = anchor[min(f, len(anchor) - 1)]
                    for i, (ob2, rv) in enumerate(ob):
                        if fx["burst"]:
                            u = (t - at)
                            ob2.hide_render = u < 0 or u > 1.4
                            p = Vector(a0) + Vector((rv[0], abs(rv[1]) + 0.2, rv[2])).normalized() * (u * 2.2 * (0.5 + abs(rv[3])))
                            p.y -= 1.2 * u * u
                        else:
                            ob2.hide_render = t < at
                            p = Vector((a0[0] + rv[0] * 4, 0.3 + (abs(rv[1]) * 3.5 + t * 0.25 * (0.4 + abs(rv[3]))) % 3.5, a0[2] + rv[2] * 3))
                        ob2.matrix_world = C @ Matrix.Translation(p) @ Matrix.Diagonal(Vector((0.035 * fx["size"],) * 3 + (1,)))
            bpy.context.view_layer.update()
            scene.render.filepath = os.path.join(OUT, "%05d.png" % (sc["startFrame"] + f))
            bpy.ops.render.render(write_still=True)
            done += 1
            print("BLENDER_FRAME %d %.2f" % (sc["startFrame"] + f, time.time() - t_all), flush=True)
        el = time.time() - t0
        print("BLENDER_SCENE %d frames=%d seconds=%.1f perframe=%.2f" % (sc["index"], frames, el, el / max(1, frames)), flush=True)


run()
