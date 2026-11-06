"""How a Hole in Your Yard Becomes a Pond: the 3D scene, keyed to the narration (T)."""
import math, random
from mathutils import Vector

R = random.Random(3)
BACK = 3.1                                   # the pond's back edge (y); the cut face (y=0) slices it near its middle
CY = 0.6                                     # centre of the pond outline (y)
PROF = None
# an organic garden pond: a wobbly outline seen from above, a plant shelf, then a deeper middle (scale, depth)
LEVELS = [(1.0, -0.04), (0.95, -0.38), (0.72, -0.42), (0.6, -1.3)]
SURF = -0.1                                  # water surface when full
F = (0.0, 0.9, -0.5)                         # camera focus: the middle of the pond section


def koi_material(W, k=0):
    """koi skin: orange, white and a few black patches (a different pattern per fish), fine scales, a wet sheen."""
    name = f"koi_m{k}"
    if name in W.bpy.data.materials: return W.bpy.data.materials[name]
    m = W.bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (k * 3.1, k * 1.7, 0)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 5.0; nz.inputs["Detail"].default_value = 3
    L.new(mp.outputs["Vector"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    el = ramp.color_ramp.elements
    el[0].color = (1.0, 0.33, 0.0, 1); el[1].position = 0.6; el[1].color = (0.97, 0.95, 0.9, 1)
    e2 = el.new(0.7); e2.color = (0.03, 0.03, 0.03, 1) if k % 3 == 0 else (0.96, 0.27, 0.02, 1)
    L.new(nz.outputs["Fac"], ramp.inputs["Fac"]); L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    sc = N.new("ShaderNodeTexVoronoi"); sc.inputs["Scale"].default_value = 90
    L.new(tc.outputs["Object"], sc.inputs["Vector"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    L.new(sc.outputs["Distance"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.25; b.inputs["Coat Weight"].default_value = 0.9; b.inputs["Coat Roughness"].default_value = 0.05
    b.inputs["Subsurface Weight"].default_value = 0.0      # subsurface triples EEVEE render time for no visible gain here
    return m


def koi(W, name, length=0.45, k=0):
    """a koi: a lofted spindle body (head at +x), a forked tail fin and a dorsal fin, orange and white."""
    bm = W.bmesh.new()
    rings, seg, Rr = 18, 14, length * 0.13
    prev = None; first = None
    for i in range(rings + 1):
        u = i / rings                                                  # 0 = tail, 1 = head
        x = -length / 2 + u * length
        r = Rr * max(0.12, math.sin(math.pi * (0.08 + 0.9 * u) ** 0.8)) * (1 - 0.35 * max(0, u - 0.85) / 0.15)
        ring = [bm.verts.new((x, 0.8 * r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
        if prev:
            for k in range(seg):
                bm.faces.new((prev[k], prev[(k + 1) % seg], ring[(k + 1) % seg], ring[k]))
        else:
            first = ring
        prev = ring
    bm.faces.new(list(reversed(first))); bm.faces.new(prev)
    tx = -length / 2
    for zs in (1, -1):                                                  # forked tail
        a = bm.verts.new((tx + 0.02, 0, 0)); b2 = bm.verts.new((tx - 0.24 * length, 0, zs * 0.2 * length)); c = bm.verts.new((tx - 0.14 * length, 0, zs * 0.02 * length))
        bm.faces.new((a, b2, c))
    d1 = bm.verts.new((0.05 * length, 0, Rr * 0.9)); d2 = bm.verts.new((-0.2 * length, 0, Rr * 0.85)); d3 = bm.verts.new((-0.12 * length, 0, Rr * 1.5))
    bm.faces.new((d1, d3, d2))
    for side in (-1, 1):                                                              # pectoral fins, swept back
        p1 = bm.verts.new((0.18 * length, side * Rr * 0.7, -Rr * 0.4)); p2 = bm.verts.new((0.02 * length, side * Rr * 2.0, -Rr * 0.7))
        p3 = bm.verts.new((0.1 * length, side * Rr * 0.7, -Rr * 0.5)); bm.faces.new((p1, p2, p3))
    me = W.bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = W.bpy.data.objects.new(name, me); W.bpy.context.scene.collection.objects.link(ob)
    me.materials.append(koi_material(W, k))
    so = ob.modifiers.new("fins", "SOLIDIFY"); so.thickness = 0.006
    return ob


def lily_mat(W):
    if "lily_m" in W.bpy.data.materials: return W.bpy.data.materials["lily_m"]
    m = W.tex_mat("lily_m", "leafy_grass", 0.5, tint=(0.1, 0.36, 0.04), sat=1.8, bright=0.75, normal=0.6, rough=0.7)
    m.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.2
    return m


def lily(W, name, loc, r=0.32):
    bm = W.bmesh.new(); n = 30
    ring = [bm.verts.new((r * math.cos(0.32 + (2 * math.pi - 0.45) * k / n), r * math.sin(0.32 + (2 * math.pi - 0.45) * k / n), 0)) for k in range(n + 1)]
    c = bm.verts.new((0.03, 0, 0)); bm.faces.new([c] + ring)                      # a disc with the classic notch
    me = W.bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    pad = W.bpy.data.objects.new(name, me); W.bpy.context.scene.collection.objects.link(pad)
    pad.location = loc; pad.rotation_euler = (0, 0, R.random() * 6.28); me.materials.append(lily_mat(W))
    so = pad.modifiers.new("t", "SOLIDIFY"); so.thickness = 0.015
    if R.random() < 0.4:
        fl = W.sphere(name + "_fl", 0.07, (loc[0] + 0.05, loc[1], loc[2] + 0.05), W.flat(name + "_flm", (1.0, 0.75, 0.85), rough=0.5), seg=12)
        return [pad, fl]
    return [pad]


def build(W, T):
    W.yard()
    s = lambda k: T[k]["start"]
    e = lambda k: T[k]["end"]
    shots = []

    # ---- open: dig, then fill with a hose -------------------------------------------------
    OUT = W.blob(0.0, CY, 3.1, 2.6, wobble=0.07)
    cut = W.pit("pond", OUT, LEVELS, t0=0.0, t1=1.7,
                 extra=dict(pile=(-4.0, 1.3), pile_size=1.0, clods=28, start=0.5, arc=1.3))
    hose = W.pipe("hose", [(9.5, 7.5, 0.04), (7.0, 5.5, 0.04), (5.2, 3.0, 0.04), (3.6, 2.2, 0.05), (3.0, 2.0, 0.45), (2.7, 2.0, 0.42)],
                  0.035, W.flat("hose_m", (0.1, 0.45, 0.15), rough=0.4), t0=1.5, t1=2.1)
    W.flow("hose_water", [(2.7, 2.0, 0.42), (2.55, 2.0, 0.1), (2.45, 2.0, -0.5)], 1.9, 3.4, n=6, size=0.05)
    water, lvl, _ = W.pit_liquid("water", OUT, LEVELS, W.M("water"), inset=0.0, keys=
                          [(1.9, -1.4), (3.3, SURF), (s("leak") + 0.6, SURF), (s("leak") + 2.6, -1.4)])
    shots += [W.view("wide", F, 0.0, 1.9, push=0.22, slide=0.6), W.view("left", F, 1.9, 3.45, push=0.18, slide=-0.4)]
    W.sfx("pour", 1.9, 0.45, dur=1.6)

    for i in range(64):                                     # loose dirt on the floor and shelf: it reads as freshly dug soil
        on_shelf = i % 3 == 0
        x, y = (-2.6 + 5.2 * R.random(), 0.15 + 0.9 * R.random()) if on_shelf else (-1.3 + 2.6 * R.random(), 0.2 + 1.4 * R.random())
        z = -0.4 if on_shelf else -1.28
        cl = W.sphere(f"floor_clod{i}", 0.05 + 0.09 * R.random(), (x, y, z), "soil", squash=0.5, noise=0.7, seg=10)
        W.hide_from(cl, T.word("liner", "sand") - 0.4)

    # ---- leak: the water soaks into the dirt --------------------------------------------------
    wet = W.overlay("wet", (-4.2, 4.2, -2.2, 0.0), W.flat("wet_m", (0.08, 0.05, 0.03), rough=0.2, alpha=0.3), s("leak") + 0.6, s("leak") + 2.8, how="out", cut=cut)
    W.vanish(wet, s("liner") + 0.3, "pop", 0.5)
    W.arrows("seep_down", [(-1.2, -0.25, -1.45), (0.0, -0.25, -1.45), (1.2, -0.25, -1.45)], (0, 0, -1), s("leak") + 0.8, e("leak"), length=0.8, mat="arrow_blue")
    W.arrows("seep_l", [(-2.4, -0.25, -0.85)], (-1, 0, -0.3), s("leak") + 0.9, e("leak"), length=0.8, mat="arrow_blue")
    W.arrows("seep_r", [(2.4, -0.25, -0.85)], (1, 0, -0.3), s("leak") + 0.9, e("leak"), length=0.8, mat="arrow_blue")
    shots += [W.view("section", F, s("leak"), s("leak") + 2.0, push=0.1), W.view("right", F, s("leak") + 2.0, e("leak") + 0.1, push=0.12, slide=0.4)]

    # ---- liner: sand bed, rubber sheet, refill ------------------------------------------------
    sand = W.pit_shell("sand", OUT, LEVELS, 0.07, W.M("sand"), inset=0.0, top=0.0, t=None)
    W.appear(sand, T.word("liner", "sand") - 0.5, "drop", 0.6, dist=1.2)
    liner = W.pit_shell("liner", OUT, LEVELS, 0.03, W.M("black_rubber"), inset=0.07, top=0.03, t=None)
    W.appear(liner, T.word("liner", "sand") + 0.4, "drop", 0.6, dist=1.2)
    shots += [W.view("wide", F, s("liner"), s("liner") + 1.7, push=0.12), W.view("section", F, s("liner") + 1.7, s("liner") + 3.4, push=0.08, slide=-0.4),
              W.view("right", F, s("liner") + 3.4, e("liner") + 0.1, push=0.12)]
    # water inside the liner from now on
    W.vanish(water, s("liner") + 0.1, "pop", 0.05)
    water2, lvl2, WSHAPE = W.pit_liquid("water2", OUT, LEVELS, W.M("water"), [(e("liner") - 1.6, -1.4), (e("liner") + 0.2, SURF)], inset=0.1)
    W.sfx("pour", e("liner") - 1.7, 0.45, dur=1.9)
    W.flow("hose_water2", [(2.7, 2.0, 0.42), (2.55, 2.0, 0.1), (2.45, 2.0, -0.4)], e("liner") - 1.8, e("liner") + 0.2, n=6, size=0.05)

    # ---- green: algae --------------------------------------------------------------------------
    W.key_value(W.M("water"), "ALGAE", [(T.word("green", "green") - 0.6, 0.0), (T.word("green", "green") + 0.4, 0.95)])
    W.swarm("algae_specks", (0.0, 0.9, -0.55), T.word("green", "green") - 0.2, T.word("plants", "clears") + 0.2, n=40, radius=0.85,
            mat=W.flat("speck_m", (0.18, 0.35, 0.06), rough=0.8), size=0.014)
    scum = []
    for i, (x, y) in enumerate(W.inside(OUT, 0.8, n=9, min_gap=0.8, seed=11)):     # floating algae scum, gone when the water clears
        sc = W.sphere(f"scum_{i}", 0.35 + 0.25 * R.random(), (x, y, SURF + 0.005), lily_mat(W), squash=0.04, noise=0.5, seg=16)
        W.appear(sc, T.word("green", "green") + 0.1 * i, "pop", 0.4); W.vanish(sc, T.word("plants", "clears") - 0.2 + 0.03 * i, "pop", 0.4)
        scum.append(sc)
    shots += [W.view("house", F, s("green"), s("green") + 1.8, push=0.06, lift=0.6), W.view("section", F, s("green") + 1.8, s("green") + 3.6, push=0.12),
              W.view("left", F, s("green") + 3.6, e("green") + 0.1, push=0.1, slide=0.5)]

    # ---- plants: lilies + shelf plants, water clears -------------------------------------------
    k = 0
    for (x, y) in W.inside(OUT, 0.7, n=6, min_gap=0.9, seed=4):
        for o in lily(W, f"lily{k}", (x, y, SURF + 0.005)):
            W.appear(o, T.word("plants", "lilies") + 0.08 * k, "pop", 0.35)
            W.hide_from(o, T.word("winter", "freezes") + 0.3); W.show_from(o, s("end") + 0.9)
        k += 1
    for i, (x, y) in enumerate(((-2.45, 1.4), (2.45, 1.4))):
        pl = W.instance("grass_medium_01", (x, y, -0.36), 0.45, 1.5708 + (0.6 if x > 0 else -0.6))
        pl.scale = (0.6, 0.6, 1.8)
        W.appear(pl, T.word("plants", "plants") + 0.15 * i, "pop", 0.4)
    W.key_value(W.M("water"), "ALGAE", [(T.word("plants", "clears") - 0.8, 0.95), (T.word("plants", "clears") + 0.3, 0.06)])
    shots += [W.view("wide", F, s("plants"), s("plants") + 2.0, push=0.15), W.view("right", F, s("plants") + 2.0, s("plants") + 3.8, push=0.12, slide=-0.4),
              W.view("section", F, s("plants") + 3.8, e("plants") + 0.1, push=0.12)]

    # ---- mosquitoes ------------------------------------------------------------------------------
    W.swarm("mosq", (0.4, 1.4, 0.55), s("mosq") + 0.2, T.word("fish", "fly") + 0.2, n=18, radius=0.7, size=0.022)
    W.swarm("larvae", (0.0, 0.6, SURF - 0.12), s("mosq") + 0.6, T.word("fish", "larvae") + 0.2, n=14, radius=0.9, size=0.018)
    shots += [W.view("close", (0.3, 1.2, 0.0), s("mosq"), e("mosq") + 0.1, push=0.18)]

    # ---- fish ----------------------------------------------------------------------------------
    fish = []
    t_in = T.word("fish", "fish")
    for i in range(7):
        f = koi(W, f"koi{i}", 0.4 + 0.12 * R.random(), k=i)
        cx, cy = ((-1.15, 0.5), (0.0, 0.45), (1.15, 0.5), (-0.6, 1.35), (0.6, 1.35), (-1.0, 1.95), (1.0, 1.95))[i]
        rr, z0, sp, ph = 0.22, -0.55 - 0.09 * i, 0.06 + 0.02 * R.random(), R.random()
        W.hide_until(f, t_in + 0.1 * i)
        drop_from = Vector((cx, cy, 1.4))

        def win(t, a, b, r=0.6):                                                     # 0 -> 1 -> 0 over [a, b], soft edges
            return max(0.0, min(1.0, (t - a) / r, (b - t) / r))

        def path(u, cx=cx, cy=cy, rr=rr, z0=z0, sp=sp, ph=ph, i=i):
            t = t_in + 0.1 * i + u * (T.end - t_in - 0.1 * i)
            k = 2 * math.pi * (ph + sp * (t - t_in) * 2.0)
            if t < t_in + 0.1 * i + 0.8:                                                  # dropped in from above
                q = (t - t_in - 0.1 * i) / 0.8
                return (cx + rr, cy, 0.9 - (0.9 - z0) * min(1.0, q))
            wa = win(t, s("air") + 0.1, e("air") + 0.3)                                   # gasping at the surface
            wd = win(t, s("four"), s("end") + 0.5)                                         # down in the deep end all winter
            z = z0 * (1 - wa - wd) + (SURF - 0.14) * wa + (-1.12 + 0.025 * i) * wd
            r = rr
            return (cx + r * math.cos(k), cy + 0.6 * r * math.sin(k), z + 0.04 * math.sin(k * 3))
        W.follow(f, t_in + 0.1 * i, T.end, path, face="xy")

        fish.append(f)
    W.bubbles("splash", (0.0, 1.0, SURF), t_in, t_in + 1.0, n=10, rise=0.5)
    W.sfx("splash", t_in + 0.55, 0.6)
    shots += [W.view("right", F, s("fish"), s("fish") + 1.6, push=0.12), W.view("close", (0.0, 0.9, -0.6), s("fish") + 1.6, e("fish") + 0.1, push=0.15, slide=-0.4)]

    # ---- air: fish at the surface -----------------------------------------------------------------
    shots += [W.view("left", (0.0, 1.5, -0.2), s("air"), e("air") + 0.1, push=0.15)]

    # ---- falls: pump, pipe, rocks, waterfall -------------------------------------------------------
    t_p = T.word("falls", "pump")
    pump = W.cyl("pump", 0.22, 0.32, (1.0, 0.4, -1.2), W.M("green_plastic"))
    for j in range(3):
        rib = W.cyl(f"pump_rib{j}", 0.235, 0.025, (0, 0, 0.06 + 0.09 * j), W.M("black_rubber"), verts=32); rib.parent = pump
    grille = W.cyl("pump_grille", 0.12, 0.02, (0, -0.22, 0.12), W.M("black_rubber"), axis="Y", verts=24); grille.parent = pump
    W.appear(pump, t_p - 0.2, "drop", 0.6, dist=2.0)
    route = [(1.0, 0.4, -0.95), (1.0, 0.02, -0.95), (3.7, 0.02, -0.95), (3.7, 0.02, 0.05), (3.7, 2.4, 0.05), (2.4, 3.7, 0.05), (1.2, 3.85, 0.55)]
    W.pipe("pump_pipe", route, 0.065, "black_rubber", t0=t_p + 0.1, t1=t_p + 1.2)
    rocks = []
    rk = W.instance("rock_moss_set_01", (0.9, 4.5, -0.05), 0.33, 0.2)
    W.appear(rk, T.word("falls", "waterfall") - 0.7, "drop", 0.6, dist=2.5); rocks.append(rk)
    t_w = T.word("falls", "waterfall")
    sheet = W.box("fall_sheet", (0.34, 0.02, 0.5), (0.9, 3.15, SURF), W.M("falls"), origin="bottom")
    sheet.rotation_euler = (math.radians(-12), 0, 0)
    W.appear(sheet, t_w, "grow_z", 0.5)
    foam = W.cyl("fall_foam", 0.32, 0.03, (0.9, 2.85, SURF - 0.01), W.M("foam"), verts=32)
    W.appear(foam, t_w + 0.2, "pop", 0.4)
    W.sfx("splash", t_w + 0.2, 0.45); W.sfx("pour", t_w + 0.3, 0.12, dur=T.word("winter", "freezes") - t_w)
    W.hide_from(sheet, T.word("winter", "freezes") + 0.4); W.show_from(sheet, s("end") + 1.0)
    W.hide_from(foam, T.word("winter", "freezes") + 0.4); W.show_from(foam, s("end") + 1.0)
    W.bubbles("fall_bubbles", (0.9, 2.7, SURF - 0.5), T.word("falls", "splash"), T.word("winter", "freezes"), n=14, rise=0.45, spread=0.8)
    W.flow("pump_flow", route, t_p + 1.2, e("filter") + 0.2, n=12, size=0.045)
    shots += [W.view("section", (1.6, 0.6, -0.6), s("falls"), s("falls") + 1.9, push=0.12), W.view("left", (1.0, 3.0, 0.0), s("falls") + 1.9, s("falls") + 3.6, push=0.12),
              W.view("right", (0.8, 2.6, 0.0), s("falls") + 3.6, e("falls") + 0.1, push=0.12)]

    # ---- poop -------------------------------------------------------------------------------------
    for i in range(16):
        p0 = Vector((-1.0 + 2.0 * R.random(), 0.35 + 1.3 * R.random(), -0.45 - 0.3 * R.random()))
        sp = W.sphere(f"poop_{i}", 0.025, p0, W.flat(f"pp{i}", (0.22, 0.14, 0.05), rough=0.8), seg=8)
        st = T.word("poop", "poop") - 0.2 + 0.08 * i
        W.hide_until(sp, st); W.hide_from(sp, T.word("filter", "bacteria"))
        W.move(sp, st, st + 2.5, loc=tuple(p0 + Vector((0.1, 0, -0.7))), kind="out")
    W.key_value(W.M("water"), "ALGAE", [(T.word("poop", "ammonia") - 0.5, 0.06), (T.word("poop", "ammonia") + 0.5, 0.45),
                                        (T.word("filter", "food") - 0.4, 0.45), (T.word("filter", "food") + 0.6, 0.04)])
    shots += [W.view("close", (0.0, 1.0, -0.6), s("poop"), s("poop") + 1.9, push=0.12), W.view("section", F, s("poop") + 1.9, e("poop") + 0.1, push=0.1, slide=0.4)]

    # ---- biofilter: a box beside the pond, cut open -------------------------------------------------
    t_b = T.word("filter", "box")
    fx = 5.3
    filt_cut = W.hole("filter_hole", ("box", (1.6, 1.4, 1.05)), loc=(fx, -0.05, 0.0), t0=t_b - 1.0, t1=t_b - 0.35,
                      extra=dict(pile=(8.2, 3.2), pile_size=0.5, clods=5))
    walls = [W.box("fb_back", (1.5, 0.05, 1.0), (fx, 1.25, -0.95), "green_plastic"), W.box("fb_bot", (1.5, 1.3, 0.05), (fx, 0.62, -0.95), "green_plastic"),
             W.box("fb_l", (0.05, 1.3, 1.0), (fx - 0.73, 0.62, -0.95), "green_plastic"), W.box("fb_r", (0.05, 1.3, 1.0), (fx + 0.73, 0.62, -0.95), "green_plastic"),
             W.box("fb_lid", (1.55, 1.35, 0.05), (fx, 0.62, 0.05), "green_plastic")]
    for wl in walls: W.appear(wl, t_b - 0.3, "drop", 0.6, dist=2.5)
    grav = W.box("filter_gravel", (1.38, 1.18, 0.14), (fx, 0.62, -0.9), "gravel")
    W.appear(grav, t_b - 0.05, "pop", 0.35)
    for j, z in enumerate((-0.74, -0.52, -0.3)):
        sg = W.box(f"sponge{j}", (1.32, 1.12, 0.2), (fx, 0.62, z), W.foam_mat(f"sponge_m{j}", (0.1, 0.28, 0.75) if j % 2 == 0 else (0.12, 0.12, 0.12)))
        W.appear(sg, t_b + 0.15 * j, "pop", 0.35)
    W.swarm("bacteria", (fx, -0.05, -0.52), T.word("filter", "bacteria") - 0.2, e("filter") + 0.3, n=30, radius=0.45, mat=W.flat("bact", (0.35, 0.95, 0.25), emit=1.2), size=0.016)
    W.pipe("to_filter", [(3.7, 0.02, -0.6), (fx - 0.75, 0.02, -0.6)], 0.06, "black_rubber", t0=t_b + 0.2, t1=t_b + 0.7)
    W.pipe("from_filter", [(fx, 0.02, -0.05), (fx, 0.02, 0.06), (fx, 2.0, 0.06), (3.7, 3.0, 0.06)], 0.06, "black_rubber", t0=t_b + 0.5, t1=t_b + 1.1)
    W.flow("filter_flow", [(3.7, 0.02, -0.6), (fx - 0.7, 0.02, -0.6), (fx, 0.02, -0.6), (fx, 0.02, 0.06), (fx, 2.0, 0.06)], t_b + 1.1, e("filter") + 0.2, n=8, size=0.045)
    shots += [W.view("section", (4.4, 0.6, -0.5), s("filter"), s("filter") + 2.3, push=0.12), W.view("close", (fx, 0.4, -0.5), s("filter") + 2.3, s("filter") + 4.6, push=0.15, slide=-0.3),
              W.view("right", (3.0, 1.2, -0.3), s("filter") + 4.6, e("filter") + 0.1, push=0.12)]

    # ---- winter: snow, dim sky, ice ------------------------------------------------------------------
    tw0, tw1 = s("winter") + 0.3, s("winter") + 1.8
    W.key_value(W.M("grass"), "SNOW", [(tw0, 0.0), (tw1, 0.92), (s("end") + 0.2, 0.92), (s("end") + 1.4, 0.0)])
    world = W.bpy.context.scene.world
    W.key_value(world, "SKY", [(tw0, 1.0), (tw1, 0.85), (s("end") + 0.2, 0.85), (s("end") + 1.4, 1.0)])
    sun = W.sun().data
    for t, v in ((tw0, 3.6), (tw1, 2.6), (s("end") + 0.2, 2.6), (s("end") + 1.4, 3.6)):
        sun.energy = v; sun.keyframe_insert("energy", frame=W.fr(t))
    ice = W.pit_cap("ice", OUT, SURF + 0.02, 0.08, W.M("ice"), grow=-0.1)
    W.level(ice, [(T.word("winter", "freezes") - 0.2, 0.0), (T.word("winter", "freezes") + 0.9, 1.0)])
    W.vanish(ice, s("end") + 0.4, "pop", 0.5)
    shots += [W.view("wide", F, s("winter"), s("winter") + 1.4, push=0.08), W.view("left", F, s("winter") + 1.4, e("winter") + 0.1, push=0.12)]

    # ---- four degrees: cold layer on top, the deep end stays at 4 --------------------------------------
    cold = W.overlay("cold_layer", (-3.0, 3.0, -0.42, SURF - 0.1), W.flat("cold_m", (0.75, 0.92, 1.0), alpha=0.4, emit=0.15), T.word("four", "coldest") - 0.2, T.word("four", "coldest") + 0.6, how="down")
    deep = W.overlay("deep_layer", (-2.1, 2.1, -1.3, -0.42), W.flat("deep_m", (0.05, 0.25, 0.8), alpha=0.22), T.word("four", "deep") - 0.2, T.word("four", "deep") + 0.6, how="up")
    W.clip_to(cold, WSHAPE); W.clip_to(deep, WSHAPE)
    W.arrows("cold_up", [(-1.2, -0.3, -0.95), (1.2, -0.3, -0.95), (0.0, -0.3, -1.05)], (0, 0, 1), T.word("four", "floats") - 0.3, T.word("four", "freezes") + 0.4, length=0.55, mat="arrow_blue")
    W.vanish(cold, s("end") + 0.3, "pop", 0.4); W.vanish(deep, s("end") + 0.3, "pop", 0.4)
    shots += [W.view("right", F, s("four"), s("four") + 2.2, push=0.1), W.view("close", (0.0, 1.0, -0.9), s("four") + 2.2, s("four") + 4.4, push=0.12),
              W.view("left", F, s("four") + 4.4, s("four") + 6.6, push=0.1), W.view("section", F, s("four") + 6.6, e("four") + 0.1, push=0.15, slide=0.4)]
    shots += [W.view("close", (0.0, 1.0, -1.0), s("deep"), e("deep") + 0.1, push=0.2)]

    # ---- gas + de-icer ----------------------------------------------------------------------------------
    W.bubbles("gas", (-0.6, 0.8, -1.2), s("gas") + 0.2, s("end"), n=16, rise=1.0, mat=W.flat("gas_m", (0.55, 0.42, 0.2), alpha=0.8), spread=1.4)
    t_h = T.word("gas", "heater")
    heater = W.sphere("deicer", 0.25, (-1.0, 1.2, SURF + 0.12), W.M("white"), squash=0.5, seg=24)
    W.appear(heater, t_h - 0.2, "drop", 0.6, dist=1.5)
    W.sfx("bubble", T.word("gas", "open"), 0.5)
    hole_ring = W.cyl("ice_hole", 0.45, 0.025, (-1.0, 1.2, SURF + 0.01), W.M("water"), verts=40)
    W.appear(hole_ring, t_h + 0.4, "pop", 0.5)
    W.vanish(heater, s("end") + 0.4, "pop", 0.4); W.vanish(hole_ring, s("end") + 0.4, "pop", 0.4)
    W.bubbles("gas_out", (-1.0, 1.2, SURF + 0.1), T.word("gas", "open"), s("end"), n=8, rise=1.2, mat=W.flat("gas_m2", (0.6, 0.5, 0.3), alpha=0.6), spread=0.3)
    shots += [W.view("section", (-0.6, 1.0, -0.6), s("gas"), s("gas") + 2.4, push=0.12), W.view("high", (-1.0, 1.4, 0.0), s("gas") + 2.4, s("gas") + 4.8, push=0.15),
              W.view("left", F, s("gas") + 4.8, e("gas") + 0.1, push=0.12)]

    # ---- end: spring again, edge stones -------------------------------------------------------------------------
    t_st = T.word("end", "stones")
    k = 0
    for k, (x, y) in enumerate(W.outline_points(OUT, y_min=0.12, every=2)):
        st = W.instance("rock_09", (x, y, -0.03), 4.0 + 1.6 * R.random(), R.random() * 6, name=f"edge_{k}")
        W.appear(st, t_st - 0.2 + 0.02 * k, "pop", 0.3)
    W.sfx("chime", T.word("end", "congratulations"), 0.35)
    t_c = T.word("end", "congratulations") - 0.1
    shots += [W.view("right", F, s("end"), t_c, push=0.14),
              dict(t0=t_c, t1=T.end, a=((0.4, -15.5, 5.4), (0.3, 4.5, 0.4)), b=((0.3, -9.5, 2.8), (0.2, 3.0, -0.2)), lens=34)]
    return shots
