/* cartoon.js: the flat 2D cartoon look ("history as a flat cartoon"): simple shapes, bold flat colours, thick
   outlines, a light paper texture, expressive faces. Everything is SVG, rebuilt from scratch for every frame from
   the frame number alone, so a frame never depends on the one before.

   A reel's moment.js uses it like this:
     const C = Cartoon;                       // this file
     function S_leap(t, T) {                  // one function per shot, t = seconds into the shot, T = its length
       const cam = C.cam(540, 1000, 1.4);     // look at world point (540, 1000), zoom 1.4
       return C.frame(cam, [C.sky(), C.stadium(), C.pitch(1300), C.person(DIEGO, C.pose.jump(1), 470, 1180, 1)], fx);
     }
   World units are pixels of a 1080x1920 frame at zoom 1. y grows downward. A person stands with feet at (x, y);
   height H (about 330 at scale 1). */
(function () {
  "use strict";
  // the frame size comes from the plan: 1080x1920 for the master, 1008x1152 when render.py --size draws the X cut natively
  const W = (window.PLAN && window.PLAN.size && window.PLAN.size[0]) || 1080, H = (window.PLAN && window.PLAN.size && window.PLAN.size[1]) || 1920;
  const WIDE = H / W < 1.6;                    // 7:8 and the like: shots are re-framed, not cropped
  /* Re-framing for a wide frame: every camera zooms out by FIT.zoom (more world fits across and less is lost top and
     bottom) and the picture moves up by FIT.lift screen pixels, so feet and legs stand above the caption (78 % down)
     on grass. A reel tunes single shots with window.FIT78 = {S_name: {zoom, dx, dy (world units), lift}}. */
  const FIT = { zoom: 0.8, lift: 110 };
  const INK = "#221c18";                       // the outline colour
  let OW = 6;                                  // outline width in world units (set per frame from the zoom)

  // ---------------------------------------------------------------- tiny helpers
  const f2 = (v) => (Math.round(v * 100) / 100).toString();
  const attrs = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${typeof v === "number" ? f2(v) : v}"`).join(" ");
  const el = (tag, a, inner) => inner === undefined ? `<${tag} ${attrs(a || {})}/>` : `<${tag} ${attrs(a || {})}>${inner}</${tag}>`;
  const g = (inner, a) => el("g", a || {}, Array.isArray(inner) ? inner.join("") : inner);
  const pts = (p) => p.map((q) => f2(q[0]) + "," + f2(q[1])).join(" ");
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ease = { in: (x) => clamp(x) ** 2, out: (x) => 1 - (1 - clamp(x)) ** 2, inout: sm };
  function rng(seed) {                         // deterministic random numbers
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const shade = (hex, k) => {                  // k < 0 darker, k > 0 lighter
    const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    const m = (c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
    return "#" + ((1 << 24) + (m(r) << 16) + (m(gg) << 8) + m(b)).toString(16).slice(1);
  };
  const dir = (deg) => [Math.sin(deg * Math.PI / 180), Math.cos(deg * Math.PI / 180)];  // 0 = straight down
  const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];

  // ---------------------------------------------------------------- camera and frame
  /** A camera looking at world point (x, y) with zoom z and roll r degrees; shake = [amount, t] for a jolt. */
  function cam(x, y, z = 1, r = 0, shake) {
    let sx = 0, sy = 0;
    if (shake) {
      const [amt, t] = shake;
      sx = amt * Math.sin(t * 71.3) * Math.exp(-t * 6); sy = amt * Math.cos(t * 53.1) * Math.exp(-t * 6);
    }
    return { x: x + sx, y: y + sy, z, r };
  }
  const lerpCam = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: a.z * Math.pow(b.z / a.z, k), r: lerp(a.r, b.r, k) });

  const camTf = (c, w, h) => `translate(${f2(w / 2)} ${f2(h / 2)}) rotate(${f2(c.r)}) scale(${f2(c.z)}) translate(${f2(-c.x)} ${f2(-c.y)})`;
  const items = (x) => (typeof x === "function" ? x() : x || []).flat(Infinity).join("");
  /** The whole picture: the world seen through the camera, then screen-space overlays, then the vignette.
      Pass world and overlay as functions (() => [...]) so they're drawn with this camera's line width. */
  function fit(c) {
    if (!WIDE) return c;
    const o = (window.FIT78 && window.FIT78[window.SHOT]) || {};
    const z = c.z * (o.zoom || FIT.zoom);
    const dy = o.dy !== undefined ? o.dy : (o.lift !== undefined ? o.lift : FIT.lift) / z;
    return { x: c.x + (o.dx || 0), y: c.y + dy, z, r: c.r };
  }
  function frame(c, world, overlay, bg = "#9fd6ee") {
    c = fit(c);
    OW = 6.5 / Math.sqrt(c.z);
    const w = items(world);
    OW = 6.5;
    const o = items(overlay);
    return el("rect", { x: 0, y: 0, width: W, height: H, fill: bg }) + g(w, { transform: camTf(c, W, H) }) + o
      + el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#vignette)" });
  }
  /** A camera view drawn into a w x h box (a TV screen, a picture in the picture). */
  function view(c, world, w, h, bg = "#9fd6ee") {
    const keep = OW;
    OW = 6.5 / Math.sqrt(c.z);
    const out = el("rect", { x: 0, y: 0, width: w, height: h, fill: bg }) + g(items(world), { transform: camTf(c, w, h) });
    OW = keep;
    return out;
  }
  /** A stand-in for a shot whose function isn't written yet: its number, name and words on a grey card. */
  function missing(sh, t, T) {
    return el("rect", { x: 0, y: 0, width: W, height: H, fill: "#3a3f47" })
      + el("text", { x: W / 2, y: 820, "font-family": "Nunito, sans-serif", "font-weight": 900, "font-size": 64, fill: "#ffd24a", "text-anchor": "middle" }, sh.fn)
      + el("text", { x: W / 2, y: 920, "font-family": "Nunito, sans-serif", "font-weight": 700, "font-size": 40, fill: "#ddd", "text-anchor": "middle" }, (sh.what || "").slice(0, 46));
  }

  // ---------------------------------------------------------------- the paper texture (made once, then reused)
  let PAPER = null;
  /** The paper texture as a PNG data URL; the page lays it over every frame (multiply, 55 %). */
  function paperURL() {
    if (PAPER === null) {
      const cv = document.createElement("canvas"); cv.width = 540; cv.height = 960;
      const x = cv.getContext("2d"), r = rng(7), im = x.createImageData(540, 960);
      for (let i = 0; i < im.data.length; i += 4) {
        const v = 236 + r() * 19;
        im.data[i] = v; im.data[i + 1] = v - 6; im.data[i + 2] = v - 16; im.data[i + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      x.globalAlpha = 0.09; x.strokeStyle = "#7a6a50";
      for (let k = 0; k < 260; k++) {           // fibres
        const a = r() * 6.28, l = 6 + r() * 26, px = r() * 540, py = r() * 960;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
      }
      PAPER = cv.toDataURL("image/png");
    }
    return PAPER;
  }
  const DEFS = `<defs>
    <radialGradient id="vignette" cx="50%" cy="48%" r="75%"><stop offset="62%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#1a1008" stop-opacity="0.32"/></radialGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb4e6"/><stop offset="1" stop-color="#bfe6f4"/></linearGradient>
    <linearGradient id="tvglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
      <stop offset="0.45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="tvvig" cx="50%" cy="50%" r="70%"><stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.65"/></radialGradient>
    <pattern id="scan" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="3" fill="#000" opacity="0.22"/></pattern>
  </defs>`;

  // ---------------------------------------------------------------- outlined shapes
  const fillo = (shape, a, fill) => el(shape, Object.assign({ fill, stroke: INK, "stroke-width": OW, "stroke-linejoin": "round" }, a));
  const poly = (p, fill, extra) => el("polygon", Object.assign({ points: pts(p), fill, stroke: INK, "stroke-width": OW, "stroke-linejoin": "round" }, extra || {}));
  const path = (d, fill, extra) => el("path", Object.assign({ d, fill, stroke: INK, "stroke-width": OW, "stroke-linejoin": "round", "stroke-linecap": "round" }, extra || {}));
  const circ = (x, y, r, fill, extra) => el("circle", Object.assign({ cx: x, cy: y, r, fill, stroke: INK, "stroke-width": OW }, extra || {}));
  /** A thick limb along points p with thickness th: outline first, then the colour runs [[from 0..1, to, colour]]. */
  function limb(p, th, runs) {
    const d = "M" + p.map((q) => f2(q[0]) + " " + f2(q[1])).join(" L");
    let out = el("path", { d, fill: "none", stroke: INK, "stroke-width": th + 2 * OW, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const L = [0]; for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const tot = L[L.length - 1] || 1;
    const at = (u) => {
      const s = u * tot; let i = 1; while (i < p.length - 1 && L[i] < s) i++;
      const k = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      return [lerp(p[i - 1][0], p[i][0], k), lerp(p[i - 1][1], p[i][1], k)];
    };
    for (const [u0, u1, col, cap] of runs) {
      const q = [at(u0)]; for (let i = 1; i < p.length - 1; i++) if (L[i] / tot > u0 && L[i] / tot < u1) q.push(p[i]);
      q.push(at(u1));
      out += el("path", { d: "M" + q.map((z) => f2(z[0]) + " " + f2(z[1])).join(" L"), fill: "none", stroke: col, "stroke-width": th,
        "stroke-linecap": cap || "round", "stroke-linejoin": "round" });
    }
    return out;
  }

  // ---------------------------------------------------------------- people
  /* A person spec, built from parts: {skin, shirt (null = bare torso), shorts, skirt (instead of shorts), socks, boots,
     sleeves: "short"|"long"|"none", gloves: colour (a goalkeeper), boxing: colour (boxing gloves), trim, hair: "mop"|"short"|
     "side"|"bald"|"buzz"|"afro"|"long"|"ponytail", hairColor, headband: colour, beard: colour, mustache: colour,
     h: height (330), build: width factor (1 = average, 1.2 stocky), legs: leg factor, number: "10"|null, numberColor,
     face: {brows, nose}, cheeks: true}.
   A pose: {lean (deg, + = toward screen right), arms: [L, R] each [upper, lower] degrees from straight down
     (+ = toward screen right), legs: [L, R] the same, head: tilt deg, look: [dx, dy] -1..1, eyes: "open"|"wide"|"angry"|
     "closed"|"squint", mouth: "smile"|"grin"|"o"|"shout"|"flat"|"grit"|"frown", fist: [L, R] booleans, facing: "front"|"back"}
   "L" is the person's left, drawn on screen right when he faces the camera: write every pose as seen from the front,
   with positive angles turning his left limbs outward and negative angles his right ones. From behind (facing: "back")
   the same pose is mirrored, so "his left arm up" stays his left arm. */
  const pose = {
    stand: (o = {}) => Object.assign({ lean: 0, arms: [[12, 6], [-12, -6]], legs: [[4, 2], [-4, -2]], head: 0, look: [0, 0], eyes: "open", mouth: "flat" }, o),
    run: (ph, o = {}) => {
      const s = Math.sin(ph * Math.PI * 2), c2 = Math.cos(ph * Math.PI * 2);
      return Object.assign({ lean: 8, arms: [[-35 * s, -35 * s - 70], [35 * s, 35 * s + 70]], legs: [[38 * s, 38 * s - 40 * Math.max(0, c2)], [-38 * s, -38 * s - 40 * Math.max(0, -c2)]],
        head: -4, look: [0.4, 0], eyes: "open", mouth: "grit", lift: 10 * Math.abs(c2) }, o);
    },
    jump: (o = {}) => Object.assign({ lean: 0, arms: [[150, 175], [-20, -40]], legs: [[45, -15], [-10, 8]], head: -6, look: [0.3, -1], eyes: "wide", mouth: "grit", fist: [true, false] }, o),
    keeperReach: (o = {}) => Object.assign({ lean: -6, arms: [[160, 170], [-175, -168]], legs: [[22, -30], [-18, 10]], head: -10, look: [-0.2, -1], eyes: "wide", mouth: "o" }, o),
    protest: (o = {}) => Object.assign({ lean: -4, arms: [[150, 168], [-35, -95]], legs: [[10, 4], [-10, -4]], head: 6, look: [-0.8, 0], eyes: "angry", mouth: "shout" }, o),
    armsUp: (o = {}) => Object.assign({ lean: 0, arms: [[150, 165], [-150, -165]], legs: [[10, 4], [-10, -4]], head: -8, look: [0, -0.6], eyes: "closed", mouth: "grin", fist: [true, true] }, o),
    sit: (o = {}) => Object.assign({ lean: 0, arms: [[25, -40], [-25, 40]], legs: [[6, 2], [-6, -2]], head: 0, look: [0, 0], eyes: "open", mouth: "smile" }, o),
  };
  const mixPose = (a, b, k) => {
    const out = Object.assign({}, k < 0.5 ? a : b);
    for (const key of ["lean", "head", "lift"]) out[key] = lerp(a[key] || 0, b[key] || 0, k);
    for (const key of ["arms", "legs"]) out[key] = a[key].map((s, i) => s.map((v, j) => lerp(v, b[key][i][j], k)));
    out.look = [lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k)];
    return out;
  };

  function face(sp, p, hx, hy, R) {
    if (p.facing === "back") return "";
    const lx = (p.look || [0, 0])[0], ly = (p.look || [0, 0])[1];
    const ex = R * 0.36, ey = hy - R * 0.08, er = R * 0.22;
    let s = "";
    const eye = (x) => {
      if (p.eyes === "closed") return path(`M${f2(x - er)} ${f2(ey)} Q${f2(x)} ${f2(ey + er * 0.8)} ${f2(x + er)} ${f2(ey)}`, "none", { "stroke-width": OW * 0.9 });
      const ry = p.eyes === "squint" ? er * 0.45 : p.eyes === "wide" ? er * 1.15 : er;
      return el("ellipse", { cx: x, cy: ey, rx: er * (p.eyes === "wide" ? 1.08 : 0.95), ry, fill: "#fff", stroke: INK, "stroke-width": OW * 0.8 })
        + el("circle", { cx: x + lx * er * 0.45, cy: ey + ly * ry * 0.45, r: er * (p.eyes === "wide" ? 0.38 : 0.46), fill: INK });
    };
    s += eye(hx - ex) + eye(hx + ex);
    const bw = R * 0.28, by = ey - er * (p.eyes === "wide" ? 1.75 : 1.45), ang = p.eyes === "angry" ? 1 : p.eyes === "wide" ? -0.6 : 0;
    const brow = (x, sgn) => el("path", { d: `M${f2(x - bw)} ${f2(by - sgn * ang * R * 0.06)} L${f2(x + bw)} ${f2(by + sgn * ang * R * 0.06)}`,
      stroke: sp.browColor || INK, "stroke-width": R * (sp.face && sp.face.brows || 0.11), "stroke-linecap": "round", fill: "none" });
    s += brow(hx - ex, 1) + brow(hx + ex, -1);    // angry: the inner ends drop; wide: they rise
    const ny = hy + R * 0.2, nw = R * (sp.face && sp.face.nose || 0.13);
    s += path(`M${f2(hx - nw * 0.2)} ${f2(ny - nw)} Q${f2(hx + nw)} ${f2(ny + nw * 0.3)} ${f2(hx - nw * 0.4)} ${f2(ny + nw * 0.5)}`, "none", { "stroke-width": OW * 0.75 });
    const my = hy + R * 0.5, mw = R * 0.32;
    const m = p.mouth || "flat";
    if (m === "smile") s += path(`M${f2(hx - mw)} ${f2(my - R * 0.04)} Q${f2(hx)} ${f2(my + R * 0.18)} ${f2(hx + mw)} ${f2(my - R * 0.04)}`, "none", { "stroke-width": OW * 0.85 });
    else if (m === "grin") s += path(`M${f2(hx - mw)} ${f2(my - R * 0.06)} Q${f2(hx)} ${f2(my + R * 0.34)} ${f2(hx + mw)} ${f2(my - R * 0.06)} Z`, "#7a2c22", { "stroke-width": OW * 0.85 })
      + path(`M${f2(hx - mw * 0.8)} ${f2(my - R * 0.02)} L${f2(hx + mw * 0.8)} ${f2(my - R * 0.02)}`, "none", { stroke: "#fff", "stroke-width": R * 0.08 });
    else if (m === "o") s += el("ellipse", { cx: hx, cy: my + R * 0.04, rx: R * 0.11, ry: R * 0.14, fill: "#7a2c22", stroke: INK, "stroke-width": OW * 0.8 });
    else if (m === "shout") s += path(`M${f2(hx - mw * 0.9)} ${f2(my - R * 0.08)} Q${f2(hx)} ${f2(my - R * 0.14)} ${f2(hx + mw * 0.9)} ${f2(my - R * 0.08)} Q${f2(hx + mw * 0.5)} ${f2(my + R * 0.3)} ${f2(hx)} ${f2(my + R * 0.3)} Q${f2(hx - mw * 0.5)} ${f2(my + R * 0.3)} ${f2(hx - mw * 0.9)} ${f2(my - R * 0.08)} Z`, "#7a2c22", { "stroke-width": OW * 0.85 });
    else if (m === "grit") s += el("rect", { x: hx - mw * 0.8, y: my - R * 0.08, width: mw * 1.6, height: R * 0.17, rx: R * 0.06, fill: "#fff", stroke: INK, "stroke-width": OW * 0.8 })
      + path(`M${f2(hx - mw * 0.8)} ${f2(my + R * 0.005)} L${f2(hx + mw * 0.8)} ${f2(my + R * 0.005)}`, "none", { "stroke-width": OW * 0.5 });
    else if (m === "frown") s += path(`M${f2(hx - mw * 0.8)} ${f2(my + R * 0.1)} Q${f2(hx)} ${f2(my - R * 0.1)} ${f2(hx + mw * 0.8)} ${f2(my + R * 0.1)}`, "none", { "stroke-width": OW * 0.85 });
    else s += path(`M${f2(hx - mw * 0.7)} ${f2(my)} L${f2(hx + mw * 0.7)} ${f2(my)}`, "none", { "stroke-width": OW * 0.85 });
    if (sp.cheeks) s += el("ellipse", { cx: hx - R * 0.55, cy: hy + R * 0.3, rx: R * 0.13, ry: R * 0.08, fill: "#e0806a", opacity: 0.35 })
      + el("ellipse", { cx: hx + R * 0.55, cy: hy + R * 0.3, rx: R * 0.13, ry: R * 0.08, fill: "#e0806a", opacity: 0.35 });
    return s;
  }

  function hair(sp, p, hx, hy, R, front) {
    const col = sp.hairColor || "#2a1d14", style = sp.hair || "short";
    const back = p.facing === "back";
    if (style === "mop") {                      // a big curly mop: overlapping curls around the top and sides
      const r = rng(sp.seed || 10);
      let s = "";
      const curls = [];
      const n = front ? (back ? 16 : 9) : 22;
      for (let i = 0; i < n; i++) {
        const a = front ? (back ? lerp(-150, 150, i / (n - 1)) : lerp(-120, 120, i / (n - 1))) : lerp(-118, 118, i / (n - 1));
        const rad = a * Math.PI / 180;
        const dist = front ? R * (back ? 0.62 : 0.78) : R * (1.0 + 0.1 * r());
        const cy = hy - Math.cos(rad) * dist * (front && !back ? 0.95 : 1) - (front && !back ? R * 0.12 : 0);
        const cx = hx + Math.sin(rad) * dist * 1.05;
        if (front && !back && Math.cos(rad) < 0.35) continue;   // only the fringe in front of the face
        curls.push([cx, cy, R * (front ? 0.26 : 0.34) * (0.85 + 0.3 * r())]);
      }
      if (!front && !back) curls.push([hx - R * 0.95, hy + R * 0.25, R * 0.3], [hx + R * 0.95, hy + R * 0.25, R * 0.3]);
      if (front && back) s += el("ellipse", { cx: hx, cy: hy - R * 0.05, rx: R * 1.0, ry: R * 1.0, fill: col, stroke: INK, "stroke-width": OW });
      for (const [cx, cy, cr] of curls) s += circ(cx, cy, cr, col);
      for (const [cx, cy, cr] of curls) s += el("path", { d: `M${f2(cx - cr * 0.45)} ${f2(cy - cr * 0.1)} q${f2(cr * 0.3)} ${f2(-cr * 0.45)} ${f2(cr * 0.7)} ${f2(-cr * 0.1)}`,
        fill: "none", stroke: shade(col, 0.35), "stroke-width": cr * 0.16, "stroke-linecap": "round" });
      return s;
    }
    if (style === "afro") {                        // a big round crown of hair behind and over the top of the head
      if (!front) return circ(hx, hy - R * 0.35, R * 1.45, col) + el("circle", { cx: hx - R * 0.5, cy: hy - R * 1.0, r: R * 0.35, fill: shade(col, 0.15), opacity: 0.5 });
      return back ? el("ellipse", { cx: hx, cy: hy - R * 0.1, rx: R * 1.02, ry: R * 1.0, fill: col, stroke: INK, "stroke-width": OW })
        : path(`M${f2(hx - R * 0.98)} ${f2(hy - R * 0.2)} Q${f2(hx)} ${f2(hy - R * 0.9)} ${f2(hx + R * 0.98)} ${f2(hy - R * 0.2)} L${f2(hx + R)} ${f2(hy - R * 0.9)} L${f2(hx - R)} ${f2(hy - R * 0.9)} Z`, col);
    }
    if (style === "long" || style === "ponytail") {
      if (!front) return style === "long" ? path(`M${f2(hx - R * 1.08)} ${f2(hy - R * 0.2)} Q${f2(hx - R * 1.25)} ${f2(hy + R * 1.4)} ${f2(hx - R * 0.6)} ${f2(hy + R * 1.65)} L${f2(hx + R * 0.6)} ${f2(hy + R * 1.65)} Q${f2(hx + R * 1.25)} ${f2(hy + R * 1.4)} ${f2(hx + R * 1.08)} ${f2(hy - R * 0.2)} Z`, col)
        : (back ? "" : "");
      if (back) return el("ellipse", { cx: hx, cy: hy - R * 0.08, rx: R * 0.98, ry: R * 0.96, fill: col, stroke: INK, "stroke-width": OW })
        + (style === "ponytail" ? path(`M${f2(hx - R * 0.25)} ${f2(hy - R * 0.1)} Q${f2(hx - R * 0.45)} ${f2(hy + R * 1.3)} ${f2(hx)} ${f2(hy + R * 1.6)} Q${f2(hx + R * 0.45)} ${f2(hy + R * 1.3)} ${f2(hx + R * 0.25)} ${f2(hy - R * 0.1)} Z`, col) : "");
      return path(`M${f2(hx - R * 1.0)} ${f2(hy + R * 0.1)} Q${f2(hx - R * 1.05)} ${f2(hy - R * 1.15)} ${f2(hx)} ${f2(hy - R * 1.1)} Q${f2(hx + R * 1.05)} ${f2(hy - R * 1.15)} ${f2(hx + R * 1.0)} ${f2(hy + R * 0.1)} Q${f2(hx + R * 0.8)} ${f2(hy - R * 0.55)} ${f2(hx + R * 0.1)} ${f2(hy - R * 0.62)} Q${f2(hx - R * 0.6)} ${f2(hy - R * 0.55)} ${f2(hx - R * 1.0)} ${f2(hy + R * 0.1)} Z`, col)
        + (style === "ponytail" ? path(`M${f2(hx + R * 0.7)} ${f2(hy - R * 0.85)} Q${f2(hx + R * 1.6)} ${f2(hy - R * 0.6)} ${f2(hx + R * 1.3)} ${f2(hy + R * 0.6)} Q${f2(hx + R * 1.2)} ${f2(hy - R * 0.2)} ${f2(hx + R * 0.85)} ${f2(hy - R * 0.5)} Z`, col) : "");
    }
    if (style === "buzz" && front) return back ? el("ellipse", { cx: hx, cy: hy - R * 0.1, rx: R * 1.0, ry: R * 0.98, fill: col, opacity: 0.85 })
      : path(`M${f2(hx - R * 0.97)} ${f2(hy - R * 0.15)} Q${f2(hx - R * 0.98)} ${f2(hy - R * 1.08)} ${f2(hx)} ${f2(hy - R * 1.04)} Q${f2(hx + R * 0.98)} ${f2(hy - R * 1.08)} ${f2(hx + R * 0.97)} ${f2(hy - R * 0.15)} Q${f2(hx)} ${f2(hy - R * 0.72)} ${f2(hx - R * 0.97)} ${f2(hy - R * 0.15)} Z`, col, { "stroke-width": OW * 0.6, opacity: 0.9 });
    if (front && !back) {
      if (style === "short" || style === "side") return path(`M${f2(hx - R * 0.98)} ${f2(hy - R * 0.05)} Q${f2(hx - R * 1.02)} ${f2(hy - R * 1.12)} ${f2(hx)} ${f2(hy - R * 1.08)} Q${f2(hx + R * 1.02)} ${f2(hy - R * 1.12)} ${f2(hx + R * 0.98)} ${f2(hy - R * 0.05)} Q${f2(hx + R * 0.7)} ${f2(hy - R * 0.62)} ${f2(hx + (style === "side" ? -R * 0.1 : R * 0.2))} ${f2(hy - R * 0.66)} Q${f2(hx - R * 0.6)} ${f2(hy - R * 0.62)} ${f2(hx - R * 0.98)} ${f2(hy - R * 0.05)} Z`, col);
      if (style === "bald") return path(`M${f2(hx - R * 0.99)} ${f2(hy - R * 0.05)} Q${f2(hx - R)} ${f2(hy - R * 0.45)} ${f2(hx - R * 0.8)} ${f2(hy - R * 0.55)} L${f2(hx - R * 0.78)} ${f2(hy - R * 0.1)} Z`, col)
        + path(`M${f2(hx + R * 0.99)} ${f2(hy - R * 0.05)} Q${f2(hx + R)} ${f2(hy - R * 0.45)} ${f2(hx + R * 0.8)} ${f2(hy - R * 0.55)} L${f2(hx + R * 0.78)} ${f2(hy - R * 0.1)} Z`, col);
      return "";
    }
    if (front && back && style !== "bald") return el("ellipse", { cx: hx, cy: hy - R * 0.08, rx: R * 0.98, ry: R * 0.96, fill: col, stroke: INK, "stroke-width": OW });
    return "";
  }

  /** One person with feet at (x, y), scale s, flip -1 to mirror, rot = whole-body rotation (a dive). */
  function person(sp, p, x, y, s = 1, flip = 1, rot = 0, out = null) {
    p = Object.assign(pose.stand(), p);
    const back = p.facing === "back", mir = back ? -1 : 1;
    const Hh = sp.h || 330, bw = sp.build || 1, lf = sp.legs || 1;
    const legL = Hh * 0.36 * lf, torL = Hh * 0.29, headR = Hh * 0.15 * (sp.headScale || 1);
    const thigh = legL * 0.52, shin = legL * 0.5, up = Hh * 0.16, low = Hh * 0.15;
    const hipW = Hh * 0.1 * bw, shW = Hh * 0.17 * bw, limbT = Hh * 0.075 * Math.sqrt(bw), legT = Hh * 0.088 * bw;
    const hip = [0, -legL - (p.lift || 0)];
    const td = dir(180 - (p.lean || 0));         // up the spine; lean + = toward screen right
    const perp = [-td[1], td[0]];                 // screen right, square to the spine
    const neck = add(hip, td, torL);
    const sideSign = (i) => (i === 0 ? 1 : -1) * mir;   // i = 0 his left (screen right when he faces us), 1 his right
    const ang = (a) => a * mir;                   // from behind, poses mirror so "his left arm" stays his left
    const shoulder = (i) => add(add(neck, perp, sideSign(i) * shW * 0.5), td, -Hh * 0.03);
    const hipJ = (i) => add(hip, perp, sideSign(i) * hipW * 0.55);
    let legs = "", body = "", arms = "", top = "";
    const knee = [], hands = [];
    for (let i = 0; i < 2; i++) {                 // legs, socks, boots
      const [a1, a2] = p.legs[i];
      const h0 = hipJ(i), kn = add(h0, dir(ang(a1)), thigh), an = add(kn, dir(ang(a2)), shin);
      knee.push(kn);
      legs += limb([h0, kn, an], legT, [[0, 1, sp.skin], [0.6, 1, sp.socks]]);
      const bx = an[0] + sideSign(i) * legT * 0.28, by = an[1] + legT * 0.12;
      legs += el("ellipse", { cx: bx, cy: by, rx: legT * 0.95, ry: legT * 0.55, transform: `rotate(${f2(-ang(a2) * 0.5)} ${f2(bx)} ${f2(by)})`,
        fill: sp.boots, stroke: INK, "stroke-width": OW });
    }
    const w0 = add(hip, td, torL * 0.14);         // shorts: waist to mid-thigh
    const mid = (i) => add(hipJ(i), [knee[i][0] - hipJ(i)[0], knee[i][1] - hipJ(i)[1]], 0.45);
    const tl = (i) => add(mid(i), perp, sideSign(i) * legT * 0.62);
    const tr = (i) => add(mid(i), perp, -sideSign(i) * legT * 0.62);
    if (sp.skirt) body += poly([add(w0, perp, hipW * 1.05), add(add(hip, td, -thigh * 0.42), perp, hipW * 1.7), add(add(hip, td, -thigh * 0.42), perp, -hipW * 1.7), add(w0, perp, -hipW * 1.05)], sp.skirt);
    else body += poly([add(w0, perp, hipW * 1.08), tl(0), tr(0), add(hip, td, -thigh * 0.12), tr(1), tl(1), add(w0, perp, -hipW * 1.08)], sp.shorts);
    const nt = add(neck, td, -Hh * 0.005);        // the shirt
    const shirt = [add(nt, perp, shW * 0.62), add(nt, perp, -shW * 0.62), add(add(w0, perp, -hipW * 1.18), td, Hh * 0.01), add(add(w0, perp, hipW * 1.18), td, Hh * 0.01)];
    const top0 = sp.shirt || sp.skin;            // no shirt: a bare torso (a boxer, a swimmer)
    body += poly(shirt, top0);
    body += el("polygon", { points: pts([add(shirt[0], perp, -shW * 0.22), shirt[0], shirt[3], add(shirt[3], perp, -hipW * 0.4)]), fill: shade(top0, -0.15), opacity: back ? 0 : 1 });
    if (back) body += el("polygon", { points: pts([add(shirt[1], perp, shW * 0.22), shirt[1], shirt[2], add(shirt[2], perp, hipW * 0.4)]), fill: shade(top0, -0.15) });
    if (!sp.shirt && !back) {                     // chest and navel lines
      const c0 = add(nt, td, -torL * 0.3), nv = add(w0, td, torL * 0.22);
      body += path(`M${f2(add(c0, perp, -shW * 0.32)[0])} ${f2(add(c0, perp, -shW * 0.32)[1])} Q${f2(c0[0])} ${f2(add(c0, td, -torL * 0.08)[1])} ${f2(add(c0, perp, shW * 0.32)[0])} ${f2(add(c0, perp, shW * 0.32)[1])}`, "none", { "stroke-width": OW * 0.6 });
      body += el("circle", { cx: nv[0], cy: nv[1], r: Hh * 0.008, fill: INK });
    }
    if (sp.sleeves === "none" && sp.shirt) {      // a vest: the arm holes show skin at the shoulders
      for (const sg of [1, -1]) { const a0 = add(add(nt, perp, sg * shW * 0.62), td, -Hh * 0.005), a1 = add(add(nt, perp, sg * shW * 0.4), td, -Hh * 0.075);
        body += el("polygon", { points: pts([a0, add(a0, perp, -sg * shW * 0.08), a1, add(a1, perp, sg * shW * 0.22)]), fill: sp.skin }); }
    }
    if (sp.trim) {                                // collar or a band of a second colour
      const c0 = add(nt, perp, shW * 0.24), c1 = add(nt, perp, -shW * 0.24), cm = add(nt, td, back ? -Hh * 0.01 : -Hh * 0.055);
      body += path(`M${f2(c0[0])} ${f2(c0[1])} Q${f2(cm[0])} ${f2(cm[1])} ${f2(c1[0])} ${f2(c1[1])}`, "none", { stroke: sp.trim, "stroke-width": Hh * 0.022 });
    }
    if (back && sp.number) {
      const c = add(neck, td, -torL * 0.44);
      body += el("text", { x: c[0], y: c[1], "font-family": "Nunito, Arial Black, sans-serif", "font-weight": 900, "font-size": Hh * 0.14,
        "text-anchor": "middle", "dominant-baseline": "central", fill: sp.numberColor || "#e8e8ea", stroke: INK, "stroke-width": Hh * 0.012,
        transform: `rotate(${f2(-(p.lean || 0))} ${f2(c[0])} ${f2(c[1])})`, "paint-order": "stroke", "stroke-linejoin": "round" }, sp.number);
    }
    for (let i = 0; i < 2; i++) {                 // arms and hands
      const [a1, a2] = p.arms[i];
      const s0 = shoulder(i), e1 = add(s0, dir(ang(a1)), up), wr = add(e1, dir(ang(a2)), low);
      const sl = sp.sleeves === "long" ? 0.92 : sp.sleeves === "none" || !sp.shirt ? 0 : 0.42;
      const a = limb([s0, e1, wr], limbT, sl > 0 ? [[0, 1, sp.skin], [0, sl, sp.shirt]] : [[0, 1, sp.skin]]);
      const fist = p.fist && p.fist[i];
      const hr = limbT * (fist ? 0.8 : 0.7) * (sp.gloves ? 1.3 : 1);
      const hd = add(wr, dir(ang(a2)), hr * 0.35);
      hands.push(hd);
      const fd = dir(ang(a2));
      const hs = sp.boxing ? el("rect", { x: hd[0] - limbT * 0.6, y: hd[1] - limbT * 0.2, width: limbT * 1.2, height: limbT * 0.9, fill: "#f4f4f0", stroke: INK, "stroke-width": OW, transform: `rotate(${f2(Math.atan2(fd[0], -fd[1]) * 180 / Math.PI)} ${f2(hd[0])} ${f2(hd[1])})` })
          + circ(hd[0] + fd[0] * limbT * 0.5, hd[1] + fd[1] * limbT * 0.5, limbT * 1.25, sp.boxing)
          + el("path", { d: `M${f2(hd[0] + fd[0] * limbT * 0.5 - limbT * 0.7)} ${f2(hd[1] + fd[1] * limbT * 0.5 - limbT * 0.5)} q${f2(limbT * 0.4)} ${f2(-limbT * 0.4)} ${f2(limbT * 0.9)} ${f2(-limbT * 0.3)}`, fill: "none", stroke: "#fff", "stroke-width": limbT * 0.18, opacity: 0.6, "stroke-linecap": "round" })
        : sp.gloves ? glove(hd[0], hd[1], hr * 0.95, Math.atan2(fd[0], -fd[1]) * 180 / Math.PI, sp.gloves, sp.trim || sp.shirt) :
        circ(hd[0], hd[1], hr, sp.skin) + (fist ? path(`M${f2(hd[0] - hr * 0.55)} ${f2(hd[1] - hr * 0.15)} q${f2(hr * 0.55)} ${f2(-hr * 0.35)} ${f2(hr * 1.1)} 0`, "none", { "stroke-width": OW * 0.6 }) : "");
      if (Math.abs(a1) > 100) top += a + hs; else arms += a + hs;   // a raised arm goes in front of the head
    }
    const hc = add(neck, td, headR * 0.92);       // the head
    let head = hair(sp, p, hc[0], hc[1], headR, false);
    head += circ(hc[0] - headR * 0.97, hc[1] + headR * 0.08, headR * 0.2, sp.skin) + circ(hc[0] + headR * 0.97, hc[1] + headR * 0.08, headR * 0.2, sp.skin);
    head += fillo("ellipse", { cx: hc[0], cy: hc[1], rx: headR, ry: headR * 1.04 }, sp.skin);
    if (!back) head += el("path", { d: `M${f2(hc[0] + headR * 0.55)} ${f2(hc[1] - headR * 0.75)} A${f2(headR)} ${f2(headR * 1.04)} 0 0 1 ${f2(hc[0] + headR * 0.4)} ${f2(hc[1] + headR * 0.92)} A${f2(headR * 1.4)} ${f2(headR * 1.4)} 0 0 0 ${f2(hc[0] + headR * 0.55)} ${f2(hc[1] - headR * 0.75)} Z`, fill: shade(sp.skin, -0.12) });
    head += face(sp, p, hc[0] + (p.look ? p.look[0] * headR * 0.08 : 0), hc[1], headR);
    if (!back && sp.beard) head += path(`M${f2(hc[0] - headR * 0.92)} ${f2(hc[1] + headR * 0.05)} Q${f2(hc[0] - headR * 0.8)} ${f2(hc[1] + headR * 1.1)} ${f2(hc[0])} ${f2(hc[1] + headR * 1.12)} Q${f2(hc[0] + headR * 0.8)} ${f2(hc[1] + headR * 1.1)} ${f2(hc[0] + headR * 0.92)} ${f2(hc[1] + headR * 0.05)} Q${f2(hc[0] + headR * 0.6)} ${f2(hc[1] + headR * 0.75)} ${f2(hc[0])} ${f2(hc[1] + headR * 0.72)} Q${f2(hc[0] - headR * 0.6)} ${f2(hc[1] + headR * 0.75)} ${f2(hc[0] - headR * 0.92)} ${f2(hc[1] + headR * 0.05)} Z`, sp.beard);
    if (!back && sp.mustache) head += path(`M${f2(hc[0] - headR * 0.36)} ${f2(hc[1] + headR * 0.42)} Q${f2(hc[0])} ${f2(hc[1] + headR * 0.28)} ${f2(hc[0] + headR * 0.36)} ${f2(hc[1] + headR * 0.42)} Q${f2(hc[0])} ${f2(hc[1] + headR * 0.36)} ${f2(hc[0] - headR * 0.36)} ${f2(hc[1] + headR * 0.42)} Z`, sp.mustache, { "stroke-width": OW * 0.6 });
    head += hair(sp, p, hc[0], hc[1], headR, true);
    if (sp.headband) head += el("path", { d: `M${f2(hc[0] - headR * 0.99)} ${f2(hc[1] - headR * 0.38)} Q${f2(hc[0])} ${f2(hc[1] - headR * 0.6)} ${f2(hc[0] + headR * 0.99)} ${f2(hc[1] - headR * 0.38)}`, fill: "none", stroke: INK, "stroke-width": headR * 0.26 + OW * 2, "stroke-linecap": "round" })
      + el("path", { d: `M${f2(hc[0] - headR * 0.99)} ${f2(hc[1] - headR * 0.38)} Q${f2(hc[0])} ${f2(hc[1] - headR * 0.6)} ${f2(hc[0] + headR * 0.99)} ${f2(hc[1] - headR * 0.38)}`, fill: "none", stroke: sp.headband, "stroke-width": headR * 0.26, "stroke-linecap": "round" });
    const headG = g(head, { transform: `rotate(${f2(p.head || 0)} ${f2(neck[0])} ${f2(neck[1])})` });
    if (out) {                                    // where his hands and head ended up, in world space
      const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
      const W2 = (q) => { const ax = q[0] * s * flip, ay = q[1] * s; return [x + ax * cr - ay * sr, y + ax * sr + ay * cr]; };
      out.hands = hands.map(W2); out.head = W2(hc); out.headR = headR * s; out.hip = W2(hip); out.neck = W2(neck);
    }
    return g(legs + body + arms + headG + top, { transform: `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)}) scale(${f2(s * flip)} ${f2(s)})` });
  }
  /** A goalkeeper's glove (a mitten with a thumb) at (x, y), fingers pointing along angle a (degrees, 0 = up). */
  function glove(x, y, r, a = 0, fill = "#e8e3d4", cuff = "#2b4f9e") {
    const sh = `M${f2(-r * 0.8)} ${f2(r * 0.7)} L${f2(-r * 0.85)} ${f2(-r * 0.5)} Q${f2(-r * 0.8)} ${f2(-r * 1.35)} ${f2(0)} ${f2(-r * 1.35)} Q${f2(r * 0.8)} ${f2(-r * 1.35)} ${f2(r * 0.85)} ${f2(-r * 0.5)} L${f2(r * 0.8)} ${f2(r * 0.7)} Z`;
    const th = `M${f2(r * 0.7)} ${f2(r * 0.1)} Q${f2(r * 1.5)} ${f2(-r * 0.2)} ${f2(r * 1.3)} ${f2(-r * 0.75)} Q${f2(r * 1.0)} ${f2(-r * 0.95)} ${f2(r * 0.65)} ${f2(-r * 0.45)} Z`;
    let s = path(th, fill) + path(sh, fill);
    for (const fx of [-0.42, 0, 0.42]) s += el("line", { x1: fx * r, y1: -r * 1.2, x2: fx * r, y2: -r * 0.55, stroke: INK, "stroke-width": OW * 0.6, "stroke-linecap": "round" });
    s += el("rect", { x: -r * 0.9, y: r * 0.55, width: r * 1.8, height: r * 0.55, rx: r * 0.15, fill: cuff, stroke: INK, "stroke-width": OW });
    return g(s, { transform: `translate(${f2(x)} ${f2(y)}) rotate(${f2(a)})` });
  }
  /** A fist seen from the front (knuckles up) at (x, y), radius r, turned a degrees. */
  function fist(x, y, r, a = 0, skin = "#c68a5e") {
    let s = el("rect", { x: -r, y: -r * 0.75, width: r * 2, height: r * 1.6, rx: r * 0.45, fill: skin, stroke: INK, "stroke-width": OW });
    for (let k = 0; k < 4; k++) s += circ(-r * 0.72 + k * r * 0.48, -r * 0.72, r * 0.27, skin);
    for (let k = 1; k < 4; k++) s += el("line", { x1: -r * 0.96 + k * r * 0.48, y1: -r * 0.55, x2: -r * 0.96 + k * r * 0.48, y2: r * 0.05, stroke: INK, "stroke-width": OW * 0.6, "stroke-linecap": "round" });
    s += path(`M${f2(-r * 0.95)} ${f2(r * 0.1)} Q${f2(-r * 0.2)} ${f2(-r * 0.1)} ${f2(r * 0.45)} ${f2(r * 0.25)}`, "none", { "stroke-width": OW * 0.8 });
    s += el("rect", { x: -r * 0.55, y: r * 0.75, width: r * 1.1, height: r * 0.9, fill: skin, stroke: INK, "stroke-width": OW });
    return g(s, { transform: `translate(${f2(x)} ${f2(y)}) rotate(${f2(a)})` });
  }
  /** The flat dark ellipse under someone (bigger and fainter the higher he is). */
  const shadow = (x, y, w, lift = 0) => el("ellipse", { cx: x, cy: y, rx: w * (1 + lift / 400), ry: w * 0.22 * (1 + lift / 400), fill: "#1a3a10", opacity: clamp(0.35 - lift / 1200, 0.08, 0.35) });

  // ---------------------------------------------------------------- the ball, the goal, the pitch, the stadium
  /** A ball: kind "football" (default), "basketball", "tennis". */
  function ball(x, y, r, spin = 0, kind = "football") {
    if (kind === "basketball" || kind === "tennis") {
      const col = kind === "basketball" ? "#e2702a" : "#d7e84a", seam = kind === "basketball" ? INK : "#fff";
      const rot = `rotate(${f2(spin)} ${f2(x)} ${f2(y)})`;
      let b = circ(x, y, r, col);
      if (kind === "basketball") b += g([el("line", { x1: x - r, y1: y, x2: x + r, y2: y, stroke: seam, "stroke-width": OW * 0.6 }), el("line", { x1: x, y1: y - r, x2: x, y2: y + r, stroke: seam, "stroke-width": OW * 0.6 }),
        el("path", { d: `M${f2(x - r * 0.7)} ${f2(y - r * 0.7)} Q${f2(x - r * 0.25)} ${f2(y)} ${f2(x - r * 0.7)} ${f2(y + r * 0.7)}`, fill: "none", stroke: seam, "stroke-width": OW * 0.6 }),
        el("path", { d: `M${f2(x + r * 0.7)} ${f2(y - r * 0.7)} Q${f2(x + r * 0.25)} ${f2(y)} ${f2(x + r * 0.7)} ${f2(y + r * 0.7)}`, fill: "none", stroke: seam, "stroke-width": OW * 0.6 })], { transform: rot });
      else b += g([el("path", { d: `M${f2(x - r * 0.85)} ${f2(y - r * 0.4)} Q${f2(x)} ${f2(y + r * 0.2)} ${f2(x + r * 0.85)} ${f2(y - r * 0.4)}`, fill: "none", stroke: seam, "stroke-width": r * 0.12 }),
        el("path", { d: `M${f2(x - r * 0.85)} ${f2(y + r * 0.45)} Q${f2(x)} ${f2(y - r * 0.15)} ${f2(x + r * 0.85)} ${f2(y + r * 0.45)}`, fill: "none", stroke: seam, "stroke-width": r * 0.12 })], { transform: rot });
      return b + el("circle", { cx: x, cy: y, r, fill: "none", stroke: INK, "stroke-width": OW });
    }
    const pent = (cx, cy, rr, a) => { const q = []; for (let k = 0; k < 5; k++) { const t = a + k * 72; q.push([cx + rr * Math.sin(t * Math.PI / 180), cy - rr * Math.cos(t * Math.PI / 180)]); } return q; };
    let s = circ(x, y, r, "#fbfaf4");
    s += el("polygon", { points: pts(pent(x, y, r * 0.32, spin)), fill: INK });
    for (let k = 0; k < 5; k++) {
      const a = (spin + 36 + k * 72) * Math.PI / 180;
      const cx = x + Math.sin(a) * r * 0.86, cy = y - Math.cos(a) * r * 0.86;
      s += el("polygon", { points: pts(pent(cx, cy, r * 0.25, spin + k * 72 + 36)), fill: INK, "clip-path": "" });
    }
    s += el("circle", { cx: x, cy: y, r: r, fill: "none", stroke: INK, "stroke-width": OW });
    s += el("path", { d: `M${f2(x - r * 0.55)} ${f2(y - r * 0.35)} q${f2(r * 0.2)} ${f2(-r * 0.35)} ${f2(r * 0.55)} ${f2(-r * 0.4)}`, fill: "none", stroke: "#fff", "stroke-width": r * 0.12, "stroke-linecap": "round", opacity: 0.9 });
    return el("g", { "clip-path": "none" }, s);
  }

  /** The pitch from the horizon (y0) down: grass with mowing stripes. */
  function pitch(y0, opts = {}) {
    const base = opts.color || "#5bab3f", stripe = shade(base, -0.1);
    let s = el("rect", { x: -4000, y: y0, width: 9000, height: 6000, fill: base });
    let yy = y0, hgt = opts.first || 26, k = 0;
    while (yy < y0 + 5000) {
      if (k % 2) s += el("rect", { x: -4000, y: yy, width: 9000, height: hgt, fill: stripe });
      yy += hgt; hgt *= opts.grow || 1.32; k++;
    }
    return s + el("line", { x1: -4000, y1: y0, x2: 5000, y2: y0, stroke: INK, "stroke-width": OW * 0.6 });
  }

  /** The stadium behind the pitch: the stand curving up to a roof line, packed with fans (deterministic). */
  function stadium(y0, opts = {}) {
    const top = y0 - (opts.height || 520), r = rng(opts.seed || 3);
    const cols = opts.colors || ["#2f6fc0", "#f2f2f0", "#9fcbe8", "#e9c94a", "#d6453a", "#3c3c46", "#f0a8a0", "#6a4a3a"];
    let s = opts.noSky ? "" : el("rect", { x: -4000, y: top - 400, width: 9000, height: 400, fill: "url(#sky)" });
    s += poly([[-4000, top + 40], [5000, top + 40], [5000, y0], [-4000, y0]], "#7c8693");
    const rows = opts.rows || 16, sz = opts.size || 15;
    for (let i = 0; i < rows; i++) {
      const yy = top + 70 + i * (y0 - top - 90) / rows, step = sz * (0.9 + i * 0.03);
      s += el("rect", { x: -4000, y: yy - step * 0.15, width: 9000, height: step * 0.55, fill: "#5d6672" });
      for (let xx = (opts.x0 || -700) + (i % 2) * step * 0.5; xx < (opts.x1 || 1800); xx += step) {
        const c = cols[Math.floor(r() * cols.length)];
        const bob = opts.bob ? Math.sin(opts.bob * 9 + xx * 0.05 + i) * 4 : 0;
        s += el("circle", { cx: xx + r() * 4, cy: yy - 4 + bob, r: step * 0.36, fill: c });
        if (opts.arms && r() < opts.arms) s += el("line", { x1: xx - step * 0.3, y1: yy - 6 + bob, x2: xx - step * 0.4, y2: yy - step * 1.1 + bob, stroke: c, "stroke-width": step * 0.18, "stroke-linecap": "round" });
      }
    }
    s += el("rect", { x: -4000, y: top + 10, width: 9000, height: 34, fill: "#4a525e", stroke: INK, "stroke-width": OW });
    s += el("rect", { x: -4000, y: y0 - 22, width: 9000, height: 22, fill: "#e8e4d8", stroke: INK, "stroke-width": OW });   // the advertising wall, blank
    return s;
  }

  /** A goal seen from the front: posts, bar and net, from the goal line at y (feet level), centre x, width w. */
  function goal(x, y, w = 760, h = 250, depth = 70) {
    let s = "";
    const net = [], step = 26;
    for (let xx = x - w / 2 + 14; xx < x + w / 2 - 10; xx += step) net.push(el("line", { x1: xx, y1: y - h, x2: xx + (xx - x) * 0.06, y2: y - depth * 0.2, stroke: "#f4f4f0", "stroke-width": 2.2, opacity: 0.8 }));
    for (let yy = y - h + 14; yy < y; yy += step) net.push(el("line", { x1: x - w / 2, y1: yy, x2: x + w / 2, y2: yy, stroke: "#f4f4f0", "stroke-width": 2.2, opacity: 0.8 }));
    s += el("rect", { x: x - w / 2, y: y - h, width: w, height: h, fill: "#3a6d2e", opacity: 0.35 });
    s += net.join("");
    s += el("rect", { x: x - w / 2 - 9, y: y - h - 9, width: w + 18, height: 18, fill: "#fbfbf8", stroke: INK, "stroke-width": OW });
    s += el("rect", { x: x - w / 2 - 9, y: y - h - 9, width: 18, height: h + 9, fill: "#fbfbf8", stroke: INK, "stroke-width": OW });
    s += el("rect", { x: x + w / 2 - 9, y: y - h - 9, width: 18, height: h + 9, fill: "#fbfbf8", stroke: INK, "stroke-width": OW });
    return s;
  }
  const line = (x1, y1, x2, y2, w = 8) => el("line", { x1, y1, x2, y2, stroke: "#f4f6ee", "stroke-width": w, "stroke-linecap": "round", opacity: 0.92 });
  const cloud = (x, y, s) => g([circ(x, y, 40 * s, "#fff"), circ(x + 45 * s, y - 18 * s, 52 * s, "#fff"), circ(x + 100 * s, y, 42 * s, "#fff"),
    el("rect", { x: x - 10 * s, y: y, width: 120 * s, height: 38 * s, fill: "#fff" }), el("line", { x1: x - 38 * s, y1: y + 36 * s, x2: x + 140 * s, y2: y + 36 * s, stroke: INK, "stroke-width": OW })]);

  // ---------------------------------------------------------------- effects
  /** A comic burst behind a freeze: alternating rays from (x, y). */
  function burst(x, y, r, colors = ["#ffd24a", "#ffb02e"], n = 22, spin = 0) {
    let s = "";
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * 360 + spin, a1 = ((k + 1) / n) * 360 + spin;
      s += el("polygon", { points: pts([[x, y], [x + r * Math.sin(a0 * Math.PI / 180), y - r * Math.cos(a0 * Math.PI / 180)], [x + r * Math.sin(a1 * Math.PI / 180), y - r * Math.cos(a1 * Math.PI / 180)]]), fill: colors[k % colors.length] });
    }
    return s;
  }
  /** Speed lines toward (x, y) from outside radius r0. */
  function speedLines(x, y, r0, r1, n = 30, seed = 5, color = "#fff", w = 6) {
    const r = rng(seed);
    let s = "";
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, a0 = r0 * (1 + r() * 0.4), a1 = r1;
      s += el("line", { x1: x + Math.cos(a) * a0, y1: y + Math.sin(a) * a0, x2: x + Math.cos(a) * a1, y2: y + Math.sin(a) * a1, stroke: color, "stroke-width": w * (0.5 + r()), "stroke-linecap": "round", opacity: 0.85 });
    }
    return s;
  }
  /** An impact star at (x, y). */
  function star(x, y, r, fill = "#fff", n = 9, seed = 2) {
    const q = [], rr = rng(seed);
    for (let k = 0; k < n * 2; k++) { const a = k * Math.PI / n, d = k % 2 ? r * 0.45 : r * (0.8 + 0.3 * rr()); q.push([x + Math.sin(a) * d, y - Math.cos(a) * d]); }
    return poly(q, fill);
  }
  /** A hand-drawn arrow along points (an orange marker by default), drawn on up to fraction k. */
  function arrow(p, k = 1, color = "#ff7a1a", w = 16) {
    const d = "M" + p.map((q) => f2(q[0]) + " " + f2(q[1])).join(" L");
    const n = p.length, end = p[n - 1], pre = p[n - 2];
    const a = Math.atan2(end[1] - pre[1], end[0] - pre[0]);
    let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    let s = el("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${f2(L * k)} ${f2(L + 10)}` });
    if (k > 0.98) {
      const hl = w * 2.6;
      s += el("polygon", { points: pts([[end[0] + Math.cos(a) * w * 0.6, end[1] + Math.sin(a) * w * 0.6], [end[0] - Math.cos(a - 0.5) * hl, end[1] - Math.sin(a - 0.5) * hl], [end[0] - Math.cos(a + 0.5) * hl, end[1] - Math.sin(a + 0.5) * hl]]), fill: color, "stroke-linejoin": "round", stroke: color, "stroke-width": w * 0.4 });
    }
    return s;
  }
  /** A ring that draws on around (x, y). */
  const ring = (x, y, r, k = 1, color = "#ff7a1a", w = 12) => el("circle", { cx: x, cy: y, r, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": `${f2(2 * Math.PI * r * k)} ${f2(2 * Math.PI * r + 10)}`, transform: `rotate(-90 ${f2(x)} ${f2(y)})`, "stroke-linecap": "round" });
  /** A soft glow (for a fist, a word). */
  const glow = (x, y, r, color = "#ffd24a", a = 0.6) => el("circle", { cx: x, cy: y, r, fill: color, opacity: a, style: `filter:blur(${f2(r * 0.35)}px)` });
  /** White flash over everything (0..1). */
  const flash = (k) => k > 0 ? el("rect", { x: 0, y: 0, width: W, height: H, fill: "#fff", opacity: clamp(k) }) : "";
  /** Big outlined 3D-ish words in the scene (a scoreboard number, a title on the pitch). */
  function bigText(txt, x, y, size, fill = "#ffd24a", depth = 10, rot = 0) {
    const common = { x, y, "font-family": "Nunito, Arial Black, sans-serif", "font-weight": 900, "font-size": size, "text-anchor": "middle", "dominant-baseline": "central" };
    let s = "";
    for (let d = depth; d > 0; d -= 2) s += el("text", Object.assign({}, common, { x: x + d * 0.5, y: y + d, fill: shade(fill, -0.45) }), txt);
    s += el("text", Object.assign({}, common, { fill, stroke: INK, "stroke-width": OW * 1.3, "paint-order": "stroke", "stroke-linejoin": "round" }), txt);
    return g(s, { transform: `rotate(${f2(rot)} ${f2(x)} ${f2(y)})` });
  }

  // ---------------------------------------------------------------- rooms and screens
  /** A 1980s TV on a cabinet; screenSvg is drawn into the screen (in a 640x480 space), with scanlines and glass. */
  function tv(x, y, w, screenSvg, opts = {}) {
    const h = w * 0.78, sw = w * 0.74, sh = sw * 0.75, sx = x - w / 2 + w * 0.06, sy = y - h + h * 0.1;
    let s = "";
    s += el("rect", { x: x - w / 2, y: y - h, width: w, height: h, rx: w * 0.05, fill: opts.wood || "#7a4a26", stroke: INK, "stroke-width": OW });
    s += el("rect", { x: x - w / 2 + w * 0.025, y: y - h + w * 0.025, width: w * 0.95, height: h - w * 0.05, rx: w * 0.035, fill: "none", stroke: shade(opts.wood || "#7a4a26", 0.2), "stroke-width": OW * 0.6 });
    const id = "scr" + Math.round(x) + "_" + Math.round(y);
    s += `<clipPath id="${id}"><rect x="${f2(sx)}" y="${f2(sy)}" width="${f2(sw)}" height="${f2(sh)}" rx="${f2(sw * 0.07)}"/></clipPath>`;
    s += el("rect", { x: sx, y: sy, width: sw, height: sh, rx: sw * 0.07, fill: "#111" });
    s += g([g(screenSvg, { transform: `translate(${f2(sx)} ${f2(sy)}) scale(${f2(sw / 640)})`, style: "filter:saturate(0.85) contrast(1.1)" }),
      el("rect", { x: sx, y: sy, width: sw, height: sh, fill: "url(#scan)" }),
      el("rect", { x: sx, y: sy, width: sw, height: sh, fill: "url(#tvvig)" }),
      el("rect", { x: sx, y: sy, width: sw, height: sh, fill: "url(#tvglass)" })], { "clip-path": `url(#${id})` });
    s += el("rect", { x: sx, y: sy, width: sw, height: sh, rx: sw * 0.07, fill: "none", stroke: INK, "stroke-width": OW * 1.4 });
    const px = x + w / 2 - w * 0.11;            // the control panel: two knobs and a speaker grille
    s += circ(px, sy + sh * 0.18, w * 0.045, "#d8c8a0") + circ(px, sy + sh * 0.42, w * 0.045, "#d8c8a0");
    for (let k = 0; k < 5; k++) s += el("line", { x1: px - w * 0.05, y1: sy + sh * 0.62 + k * w * 0.025, x2: px + w * 0.05, y2: sy + sh * 0.62 + k * w * 0.025, stroke: INK, "stroke-width": OW * 0.6 });
    const cb = opts.cabinet || "#5a3a22", cw = w * 1.24, ch = w * 0.42, cx0 = x - cw / 2;
    s += el("rect", { x: cx0, y: y, width: cw, height: ch, fill: cb, stroke: INK, "stroke-width": OW });
    for (const k of [0, 1]) {                     // two doors with knobs
      const dx = cx0 + cw * (0.05 + k * 0.475);
      s += el("rect", { x: dx, y: y + ch * 0.12, width: cw * 0.425, height: ch * 0.76, rx: 6, fill: shade(cb, 0.08), stroke: INK, "stroke-width": OW * 0.7 });
      s += circ(dx + (k ? cw * 0.05 : cw * 0.375), y + ch * 0.5, w * 0.018, "#d8c8a0");
    }
    return s;
  }
  /** A room: a wall with a stripe pattern and a floor from y. */
  function room(y, wall = "#e9d6a8", floor = "#a4744a", stripe = "#dcc490") {
    let s = el("rect", { x: -3000, y: -3000, width: 7000, height: 3000 + y, fill: wall });
    for (let xx = -3000; xx < 4000; xx += 90) s += el("rect", { x: xx, y: -3000, width: 34, height: 3000 + y, fill: stripe, opacity: 0.6 });
    s += el("rect", { x: -3000, y, width: 7000, height: 4000, fill: floor }) + el("line", { x1: -3000, y1: y, x2: 4000, y2: y, stroke: INK, "stroke-width": OW });
    s += el("rect", { x: -3000, y: y - 30, width: 7000, height: 30, fill: shade(wall, -0.25), stroke: INK, "stroke-width": OW * 0.7 });
    return s;
  }
  /** A press table: cloth, a cluster of microphones aimed at (aimX, aimY). */
  function pressTable(x, y, w, mics = 7, aimX, aimY, seed = 4) {
    const r = rng(seed);
    let s = "";
    const cols = ["#2a2a2e", "#c8c8cc", "#d6453a", "#2f6fc0", "#e9c94a", "#3c3c46", "#f2f2f0"];
    for (let k = 0; k < mics; k++) {
      const bx = x - w * 0.18 + (k / (mics - 1)) * w * 0.36, by = y - 6;
      const tx = aimX + (r() - 0.5) * 70, ty = aimY + (r() - 0.5) * 40;
      const a = Math.atan2(ty - by, tx - bx), L = Math.hypot(tx - bx, ty - by) * (0.55 + r() * 0.15);
      const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L;
      s += el("line", { x1: bx, y1: by, x2: ex, y2: ey, stroke: INK, "stroke-width": 9 }) + el("line", { x1: bx, y1: by, x2: ex, y2: ey, stroke: "#55555c", "stroke-width": 5 });
      s += el("ellipse", { cx: ex, cy: ey, rx: 26, ry: 18, transform: `rotate(${f2(a * 180 / Math.PI)} ${f2(ex)} ${f2(ey)})`, fill: cols[k % cols.length], stroke: INK, "stroke-width": OW });
    }
    s += poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 20, y + 300], [x - w / 2 - 20, y + 300]], "#2c4f8a");
    s += el("rect", { x: x - w / 2 - 10, y: y - 14, width: w + 20, height: 22, fill: "#3a64a8", stroke: INK, "stroke-width": OW });
    return s;
  }
  /** An old stadium clock board: dark panel with bulb digits. */
  function board(x, y, w, txt, opts = {}) {
    const h = w * 0.5;
    let s = el("rect", { x: x - w / 2 - 14, y: y - h / 2 - 14, width: w + 28, height: h + 28, rx: 10, fill: "#55606e", stroke: INK, "stroke-width": OW });
    s += el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 6, fill: "#151618", stroke: INK, "stroke-width": OW * 0.7 });
    s += el("text", { x, y: y + h * 0.04, "font-family": "Nunito, Arial Black, sans-serif", "font-weight": 900, "font-size": h * 0.72, "text-anchor": "middle", "dominant-baseline": "central",
      fill: opts.color || "#ffb43a", style: `filter:drop-shadow(0 0 ${f2(h * 0.06)}px ${opts.color || "#ffb43a"})` }, txt);
    s += el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, fill: "url(#scan)", opacity: 0.6 });
    s += el("rect", { x: x - 20, y: y + h / 2 + 14, width: 40, height: 260, fill: "#55606e", stroke: INK, "stroke-width": OW });
    return s;
  }


  /** Light rays fanning down from (x, y): n beams, length len, spread deg, alpha a. */
  function rays(x, y, len, n = 7, spread = 70, color = "#fff6c8", a = 0.35, spin = 0) {
    let s = "";
    for (let k = 0; k < n; k++) {
      const c = -spread / 2 + spread * (k + 0.5) / n + spin * Math.sin(k * 1.7);
      const w = spread / n * 0.42;
      const p1 = dir(c - w), p2 = dir(c + w);
      s += el("polygon", { points: pts([[x, y], [x + p1[0] * len, y + p1[1] * len], [x + p2[0] * len, y + p2[1] * len]]), fill: color, opacity: a });
    }
    return s;
  }
  const sun = (x, y, r) => el("circle", { cx: x, cy: y, r: r * 1.9, fill: "#fff3b0", opacity: 0.35 }) + circ(x, y, r, "#ffe680");
  /** Camera flashes going off at random places in a box (deterministic in t). */
  function flashes(t, x0, y0, x1, y1, n = 6, rate = 3, seed = 11) {
    const r = rng(seed);
    let s = "";
    for (let k = 0; k < n; k++) {
      const ph = r(), px = lerp(x0, x1, r()), py = lerp(y0, y1, r()), sz = 30 + r() * 30;
      const u = (t * rate + ph) % 1;
      if (u < 0.12) s += el("circle", { cx: px, cy: py, r: sz * 2.2, fill: "#fff", opacity: 0.35 }) + star(px, py, sz, "#fff", 8, k);
    }
    return s;
  }
  /** A dashed path (a ball's flight, a route) drawn on up to fraction k. */
  function dashed(p, k = 1, color = "#fff", w = 6, dash = 18) {
    let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    const d = "M" + p.map((q) => f2(q[0]) + " " + f2(q[1])).join(" L");
    const id = "m" + Math.round(p[0][0]) + "_" + Math.round(p[0][1]) + "_" + Math.round(L);
    return `<mask id="${id}"><path d="${d}" fill="none" stroke="#fff" stroke-width="${f2(w * 2)}" stroke-dasharray="${f2(L * k)} ${f2(L + 10)}" stroke-linecap="round"/></mask>`
      + el("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": `${dash} ${dash * 0.8}`, "stroke-linecap": "round", mask: `url(#${id})` });
  }

  // ---------------------------------------------------------------- football from above
  /** A pitch seen straight down, goal at the top. scale = px per metre; (cx, top) = the centre of the top goal line. */
  function topPitch(cx, top, scale = 13, opts = {}) {
    const m = (v) => v * scale, L = (x1, y1, x2, y2) => el("line", { x1, y1, x2, y2, stroke: "#f4f6ee", "stroke-width": m(0.25), opacity: 0.9 });
    const wid = m(68), len = m(105), x0 = cx - wid / 2;
    let s = el("rect", { x: x0 - m(30), y: top - m(30), width: wid + m(60), height: len + m(60), fill: opts.color || "#5bab3f" });
    for (let k = 0; k < 18; k += 2) s += el("rect", { x: x0 - m(30), y: top + k * m(105 / 18), width: wid + m(60), height: m(105 / 18), fill: shade(opts.color || "#5bab3f", -0.08) });
    s += el("rect", { x: x0, y: top, width: wid, height: len, fill: "none", stroke: "#f4f6ee", "stroke-width": m(0.25), opacity: 0.9 });
    s += L(x0, top + len / 2, x0 + wid, top + len / 2);
    s += el("circle", { cx, cy: top + len / 2, r: m(9.15), fill: "none", stroke: "#f4f6ee", "stroke-width": m(0.25), opacity: 0.9 });
    for (const [gy, sg] of [[top, 1], [top + len, -1]]) {
      s += el("rect", { x: cx - m(20.15), y: sg > 0 ? gy : gy - m(16.5), width: m(40.3), height: m(16.5), fill: "none", stroke: "#f4f6ee", "stroke-width": m(0.25), opacity: 0.9 });
      s += el("rect", { x: cx - m(9.16), y: sg > 0 ? gy : gy - m(5.5), width: m(18.32), height: m(5.5), fill: "none", stroke: "#f4f6ee", "stroke-width": m(0.25), opacity: 0.9 });
      s += el("rect", { x: cx - m(3.66), y: sg > 0 ? gy - m(2) : gy, width: m(7.32), height: m(2), fill: "#e8e8e2", stroke: INK, "stroke-width": OW * 0.6 });
    }
    return s;
  }
  /** A player seen from above: shoulders in the shirt colour, the head in the hair colour. */
  function token(x, y, sp, s = 1, ang = 0) {
    return el("ellipse", { cx: x + 5 * s, cy: y + 6 * s, rx: 17 * s, ry: 11 * s, fill: "#1a3a10", opacity: 0.3 })
      + g([el("ellipse", { cx: 0, cy: 0, rx: 17 * s, ry: 10 * s, fill: sp.shirt, stroke: INK, "stroke-width": OW * 0.8 }),
        el("circle", { cx: 0, cy: 0, r: 8 * s, fill: sp.hair === "bald" ? sp.skin : sp.hairColor, stroke: INK, "stroke-width": OW * 0.8 })], { transform: `translate(${f2(x)} ${f2(y)}) rotate(${f2(ang)})` });
  }


  // ---------------------------------------------------------------- other sports (set pieces seen from the side, at eye level)
  /** An indoor arena: the stand with a dark roof and spotlights (basketball, boxing, tennis at night). */
  function arena(y0, opts = {}) {
    const top = y0 - (opts.height || 560);
    let s = el("rect", { x: -4000, y: top - 1600, width: 9000, height: 1700, fill: opts.roof || "#1c2230" });
    for (let k = 0; k < 7; k++) s += el("ellipse", { cx: -400 + k * 330, cy: top - 120, rx: 26, ry: 12, fill: "#fff7d6", opacity: 0.9 });
    s += rays(540, top - 400, 900, 5, 50, "#fff7d6", 0.08);
    return s + stadium(y0, Object.assign({ noSky: true, colors: ["#d6453a", "#f2f2f0", "#2f6fc0", "#3c3c46", "#e9c94a", "#7a5a3a", "#9fcbe8"] }, opts));
  }
  /** A hardwood basketball floor from y0 down; paint = the key's colour. */
  function court(y0, opts = {}) {
    const wood = opts.wood || "#d9a066";
    let s = el("rect", { x: -4000, y: y0, width: 9000, height: 6000, fill: wood });
    let yy = y0, h = 10;
    while (yy < y0 + 4000) { s += el("line", { x1: -4000, y1: yy, x2: 5000, y2: yy, stroke: shade(wood, -0.12), "stroke-width": 2 }); yy += h; h *= 1.18; }
    const cx = opts.x || 540, w = opts.keyW || 420;
    s += el("polygon", { points: pts([[cx - w * 0.42, y0 + 30], [cx + w * 0.42, y0 + 30], [cx + w * 0.6, y0 + 420], [cx - w * 0.6, y0 + 420]]), fill: opts.paint || "#b8402e", opacity: 0.85 });
    s += el("ellipse", { cx, cy: y0 + 420, rx: w * 0.6, ry: 70, fill: "none", stroke: "#fff", "stroke-width": 7, opacity: 0.9 });
    s += el("path", { d: `M${f2(cx - 1300)} ${f2(y0 + 30)} Q${f2(cx)} ${f2(y0 + 900)} ${f2(cx + 1300)} ${f2(y0 + 30)}`, fill: "none", stroke: "#fff", "stroke-width": 7, opacity: 0.9 });
    return s + el("line", { x1: -4000, y1: y0 + 30, x2: 5000, y2: y0 + 30, stroke: "#fff", "stroke-width": 7, opacity: 0.9 })
      + el("line", { x1: -4000, y1: y0, x2: 5000, y2: y0, stroke: INK, "stroke-width": OW * 0.6 });
  }
  /** A basketball hoop on its stanchion: the rim's centre at (x, y), the stanchion's foot on the floor at fy. */
  function hoop(x, y, fy, s = 1) {
    let o = el("rect", { x: x - 14 * s, y: y - 150 * s, width: 28 * s, height: fy - y + 150 * s, fill: "#3a3f4a", stroke: INK, "stroke-width": OW });
    o += el("rect", { x: x - 150 * s, y: y - 200 * s, width: 300 * s, height: 180 * s, fill: "#f4f6f8", stroke: INK, "stroke-width": OW, opacity: 0.95 });
    o += el("rect", { x: x - 52 * s, y: y - 110 * s, width: 104 * s, height: 78 * s, fill: "none", stroke: "#c33", "stroke-width": 7 * s });
    for (let k = 0; k <= 6; k++) o += el("line", { x1: x - 60 * s + k * 20 * s, y1: y, x2: x - 38 * s + k * 12.7 * s, y2: y + 90 * s, stroke: "#fff", "stroke-width": 3 * s });
    o += el("line", { x1: x - 50 * s, y1: y + 45 * s, x2: x + 50 * s, y2: y + 45 * s, stroke: "#fff", "stroke-width": 3 * s });
    o += el("ellipse", { cx: x, cy: y, rx: 62 * s, ry: 14 * s, fill: "none", stroke: "#e2581b", "stroke-width": 9 * s });
    return o;
  }
  /** A tennis court from the baseline at y0 (the far baseline at y0 - depth): surface "hard" | "grass" | "clay". */
  function tennisCourt(y0, opts = {}) {
    const surf = { hard: ["#3f78bf", "#4f8f54"], grass: ["#6aa84f", "#5c9645"], clay: ["#c86a3e", "#b85f37"] }[opts.surface || "hard"];
    const cx = opts.x || 540, depth = opts.depth || 520, wNear = opts.w || 1500, wFar = wNear * 0.45;
    let s = el("rect", { x: -4000, y: y0 - depth - 60, width: 9000, height: 6000, fill: surf[1] });
    const q = (u, side) => [cx + side * lerp(wFar, wNear, u) / 2, lerp(y0 - depth, y0, u)];
    s += el("polygon", { points: pts([q(0, -1), q(0, 1), q(1, 1), q(1, -1)]), fill: surf[0] });
    const L = (a, b) => el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" });
    s += L(q(0, -1), q(0, 1)) + L(q(1, -1), q(1, 1)) + L(q(0, -1), q(1, -1)) + L(q(0, 1), q(1, 1));
    const si = (u, side) => [cx + side * lerp(wFar, wNear, u) / 2 * 0.75, lerp(y0 - depth, y0, u)];
    s += L(si(0, -1), si(1, -1)) + L(si(0, 1), si(1, 1));
    for (const u of [0.25, 0.75]) s += L(si(u, -1), si(u, 1));
    s += L([cx, lerp(y0 - depth, y0, 0.25)], [cx, lerp(y0 - depth, y0, 0.75)]);
    return s;
  }
  /** A tennis net across the court at y (its base), width w. */
  function tennisNet(x, y, w, h = 90) {
    let s = el("rect", { x: x - w / 2, y: y - h, width: w, height: h, fill: "#1d1d22", opacity: 0.55 });
    for (let xx = x - w / 2; xx < x + w / 2; xx += 16) s += el("line", { x1: xx, y1: y - h, x2: xx, y2: y, stroke: "#eee", "stroke-width": 1.5, opacity: 0.6 });
    for (let yy = y - h; yy < y; yy += 16) s += el("line", { x1: x - w / 2, y1: yy, x2: x + w / 2, y2: yy, stroke: "#eee", "stroke-width": 1.5, opacity: 0.6 });
    s += el("rect", { x: x - w / 2, y: y - h - 8, width: w, height: 12, fill: "#fff", stroke: INK, "stroke-width": OW * 0.6 });
    for (const px of [x - w / 2, x + w / 2]) s += el("rect", { x: px - 8, y: y - h - 20, width: 16, height: h + 20, fill: "#2c4d2a", stroke: INK, "stroke-width": OW });
    return s;
  }
  /** A boxing ring seen from the front: the canvas top at y, width w; ropes = three colours. */
  function boxingRing(x, y, w, opts = {}) {
    const d = w * 0.32, back = w * 0.7, ropes = opts.ropes || ["#d23a2e", "#f4f4f0", "#2f5fc0"];
    let s = el("rect", { x: -4000, y: y - d - 40, width: 9000, height: 6000, fill: opts.floor || "#2b2d36" });
    s += el("polygon", { points: pts([[x - back / 2, y - d], [x + back / 2, y - d], [x + w / 2, y], [x - w / 2, y]]), fill: opts.canvas || "#d9dde4", stroke: INK, "stroke-width": OW });
    s += el("rect", { x: x - w / 2, y, width: w, height: w * 0.16, fill: opts.apron || "#22324f", stroke: INK, "stroke-width": OW });
    const post = (px, py, h, sc) => el("rect", { x: px - 9 * sc, y: py - h, width: 18 * sc, height: h, fill: "#d8d8dc", stroke: INK, "stroke-width": OW });
    s += post(x - back / 2, y - d, 170, 0.7) + post(x + back / 2, y - d, 170, 0.7);
    for (let k = 0; k < 3; k++) s += el("line", { x1: x - back / 2, y1: y - d - 50 - k * 45, x2: x + back / 2, y2: y - d - 50 - k * 45, stroke: ropes[k], "stroke-width": 6 });
    return s;
  }
  /** The front ropes and posts of the ring, drawn after the boxers so they're in front. */
  function boxingRingFront(x, y, w, opts = {}) {
    const ropes = opts.ropes || ["#d23a2e", "#f4f4f0", "#2f5fc0"];
    let s = "";
    for (let k = 0; k < 3; k++) s += el("line", { x1: x - w / 2, y1: y - 70 - k * 62, x2: x + w / 2, y2: y - 70 - k * 62, stroke: INK, "stroke-width": 13 })
      + el("line", { x1: x - w / 2, y1: y - 70 - k * 62, x2: x + w / 2, y2: y - 70 - k * 62, stroke: ropes[k], "stroke-width": 8 });
    for (const px of [x - w / 2, x + w / 2]) s += el("rect", { x: px - 13, y: y - 250, width: 26, height: 250, fill: "#d8d8dc", stroke: INK, "stroke-width": OW });
    return s;
  }
  /** A running track seen from the side: lanes as bands from y0 down (the far lane first), the infield above. */
  function track(y0, lanes = 8, opts = {}) {
    const col = opts.color || "#b8473b";
    const ih = opts.infieldH === undefined ? 70 : opts.infieldH;
    let s = el("rect", { x: -4000, y: y0 - ih, width: 9000, height: ih, fill: opts.infield || "#5bab3f" });
    let yy = y0, h = opts.first || 34;
    s += el("rect", { x: -4000, y: y0, width: 9000, height: 6000, fill: col });
    for (let k = 0; k <= lanes; k++) { s += el("line", { x1: -4000, y1: yy, x2: 5000, y2: yy, stroke: "#fff", "stroke-width": 3 + k * 0.8, opacity: 0.95 }); yy += h; h *= opts.grow || 1.16; }
    return s;
  }
  /** A finish line across the lanes at x (from y0 to y1). */
  const finishLine = (x, y0, y1) => el("line", { x1: x, y1: y0, x2: x + (y1 - y0) * 0.08, y2: y1, stroke: "#fff", "stroke-width": 12 });

  // ---------------------------------------------------------------- other sports from above
  const tline = (x1, y1, x2, y2, w) => el("line", { x1, y1, x2, y2, stroke: "#f4f6ee", "stroke-width": w, opacity: 0.95 });
  /** A basketball court straight down (28 x 15 m), the near basket at the bottom; (cx, top) = the top baseline's centre. */
  function topCourt(cx, top, sc = 34, opts = {}) {
    const m = (v) => v * sc, wid = m(15), len = m(28), x0 = cx - wid / 2, wl = m(0.08);
    let s = el("rect", { x: x0 - m(3), y: top - m(3), width: wid + m(6), height: len + m(6), fill: opts.outside || "#3a3f4a" });
    s += el("rect", { x: x0, y: top, width: wid, height: len, fill: opts.wood || "#d9a066", stroke: "#fff", "stroke-width": wl });
    s += tline(x0, top + len / 2, x0 + wid, top + len / 2, wl) + el("circle", { cx, cy: top + len / 2, r: m(1.8), fill: "none", stroke: "#fff", "stroke-width": wl });
    for (const [by, sg] of [[top, 1], [top + len, -1]]) {
      s += el("rect", { x: cx - m(2.45), y: sg > 0 ? by : by - m(5.8), width: m(4.9), height: m(5.8), fill: opts.paint || "#b8402e", stroke: "#fff", "stroke-width": wl });
      const ry = by + sg * m(1.575);
      s += el("path", { d: `M${f2(cx - m(6.6))} ${f2(by)} L${f2(cx - m(6.6))} ${f2(by + sg * m(1.4))} A${f2(m(6.75))} ${f2(m(6.75))} 0 0 ${sg > 0 ? 0 : 1} ${f2(cx + m(6.6))} ${f2(by + sg * m(1.4))} L${f2(cx + m(6.6))} ${f2(by)}`, fill: "none", stroke: "#fff", "stroke-width": wl });
      s += el("circle", { cx, cy: ry, r: m(0.23), fill: "none", stroke: "#e2581b", "stroke-width": wl * 1.5 });
    }
    return s;
  }
  /** A tennis court straight down (23.77 x 10.97 m), the net across the middle. */
  function topTennis(cx, top, sc = 40, opts = {}) {
    const m = (v) => v * sc, len = m(23.77), wd = m(10.97), sw = m(8.23), x0 = cx - wd / 2, wl = m(0.06);
    const surf = { hard: "#3f78bf", grass: "#6aa84f", clay: "#c86a3e" }[opts.surface || "hard"];
    let s = el("rect", { x: x0 - m(5), y: top - m(6), width: wd + m(10), height: len + m(12), fill: shade(surf, -0.12) });
    s += el("rect", { x: x0, y: top, width: wd, height: len, fill: surf, stroke: "#fff", "stroke-width": wl });
    s += tline(cx - sw / 2, top, cx - sw / 2, top + len, wl) + tline(cx + sw / 2, top, cx + sw / 2, top + len, wl);
    for (const u of [len / 2 - m(6.4), len / 2 + m(6.4)]) s += tline(cx - sw / 2, top + u, cx + sw / 2, top + u, wl);
    s += tline(cx, top + len / 2 - m(6.4), cx, top + len / 2 + m(6.4), wl);
    return s + el("line", { x1: x0 - m(0.9), y1: top + len / 2, x2: x0 + wd + m(0.9), y2: top + len / 2, stroke: "#222", "stroke-width": m(0.12) });
  }
  /** A 400 m track straight down, centred at (cx, cy): two straights of 84.39 m, bends of 36.5 m radius, lanes of 1.22 m. */
  function topTrack(cx, cy, sc = 3, lanes = 8, opts = {}) {
    const m = (v) => v * sc, st = m(84.39) / 2, r0 = m(36.5), lw = m(1.22);
    const oval = (r) => `M${f2(cx - st)} ${f2(cy - r)} L${f2(cx + st)} ${f2(cy - r)} A${f2(r)} ${f2(r)} 0 0 1 ${f2(cx + st)} ${f2(cy + r)} L${f2(cx - st)} ${f2(cy + r)} A${f2(r)} ${f2(r)} 0 0 1 ${f2(cx - st)} ${f2(cy - r)} Z`;
    let s = el("path", { d: oval(r0 + lanes * lw + m(1)), fill: opts.color || "#b8473b" }) + el("path", { d: oval(r0), fill: opts.infield || "#5bab3f" });
    for (let k = 0; k <= lanes; k++) s += el("path", { d: oval(r0 + k * lw), fill: "none", stroke: "#fff", "stroke-width": Math.max(1, m(0.05)) });
    return s;
  }

  window.Cartoon = { W, H, WIDE, FIT, fit, INK, DEFS, el, g, poly, path, circ, limb, rng, shade, clamp, lerp, sm, ease, cam, lerpCam, frame, view, missing, paperURL,
    person, pose, mixPose, shadow, glove, fist, ball, pitch, stadium, goal, line, cloud, burst, speedLines, star, arrow, ring, glow, flash, bigText,
    tv, room, pressTable, board, rays, sun, flashes, dashed, topPitch, token,
    arena, court, hoop, tennisCourt, tennisNet, boxingRing, boxingRingFront, track, finishLine, topCourt, topTennis, topTrack, get OW() { return OW; } };
})();
