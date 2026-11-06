/* flat.js: the flat-vector science look. Bright gradient skies, soft flat shapes with a shadow side and a light rim,
   glows, chunky labels and pills, magnifier insets, simple characters, constant gentle motion. Everything is SVG,
   rebuilt from scratch for every frame from the frame number alone, so a frame never depends on the one before.

   A Short's scenes.js uses it like this:
     const F = Flat;
     function S_cloud(t, T, sh) {             // one function per shot in shots.json; t = seconds into it, T = its length
       const b = sh.beats;                    // beat name -> seconds into the shot (plan.py times them to spoken words)
       const c = F.drift(t, T, [540, 900, 1.0], [540, 860, 1.12]);      // a slow push-in
       return F.frame(c, () => [F.hills(1380), F.cloud(540, 760, 1.4, { face: "happy", t })],
                         () => [F.tag("500 TONNES", 540, 300, { p: F.pop(t, b.tonnes) })],
                         ["#2bb5ff", "#9be8ff"]);
     }
   World units are pixels of a 1080x1920 frame at zoom 1; y grows downward. The second argument draws the world (it moves
   with the camera), the third draws screen overlays, the fourth is the background (a colour or a top-to-bottom gradient).
   Draw the world as a function (() => [...]) so it is built after the camera is set. */
(function () {
  "use strict";
  const W = (window.PLAN && window.PLAN.size && window.PLAN.size[0]) || 1080, H = (window.PLAN && window.PLAN.size && window.PLAN.size[1]) || 1920;
  const WIDE = H / W < 1.6;                   // the 7:8 X cut: every camera is re-framed, nothing is cropped
  const U = Math.min(W / 1080, (H / 1920) * 1.45);   // overlay scale: 1 on 9:16, 0.87 on 7:8
  /* Re-framing for a wide frame: every camera zooms out by FIT.zoom and the picture moves up by FIT.lift screen pixels,
     so the subject sits above the caption (78 % down). Tune single shots with window.FIT78 = {S_name: {zoom, dx, dy, lift}}. */
  const FIT = { zoom: 0.74, lift: 40 };
  const FONT = "Nunito, 'Segoe UI', Arial, sans-serif";

  // ---------------------------------------------------------------- the palette (bright, saturated, never pure black)
  const PAL = {
    night: "#0d0a33", navy: "#16115a", indigo: "#2a1f8f", purple: "#6a2ed8", violet: "#8f55ff", lilac: "#c4b5ff",
    magenta: "#d92c8a", pink: "#ff5fa8", coral: "#ff6b5b", orange: "#ff8a1e", amber: "#ffb51c", yellow: "#ffe23a",
    lime: "#a6e85a", green: "#2fbf6f", forest: "#167a52", teal: "#11c2b8", cyan: "#2fd8f2", sky: "#39a8ff",
    blue: "#2c5cf2", white: "#ffffff", cloud: "#f3f0ff", cream: "#fff3d9", ink: "#1b1340", skin: "#f2b48c",
    skin2: "#c98358", skin3: "#8a5233", hair: "#2a1d4a", water: "#33c4ff", deepwater: "#1677e8",
  };

  // ---------------------------------------------------------------- tiny helpers
  let UID = 0;
  const uid = (p) => (p || "i") + (UID++);
  const f2 = (v) => (Math.round(v * 100) / 100).toString();
  const attrs = (a) => Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${typeof v === "number" ? f2(v) : v}"`).join(" ");
  const el = (tag, a, inner) => inner === undefined ? `<${tag} ${attrs(a || {})}/>` : `<${tag} ${attrs(a || {})}>${inner}</${tag}>`;
  const items = (x) => (typeof x === "function" ? x() : x || []);
  const flat = (x) => [items(x)].flat(Infinity).filter((v) => v !== undefined && v !== null && v !== false).join("");
  const g = (inner, a) => el("g", a || {}, flat(inner));
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const backOut = (x, s = 1.70158) => { x = clamp(x) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };
  const ease = { in: (x) => clamp(x) ** 2, out: (x) => 1 - (1 - clamp(x)) ** 2, inout: sm, back: backOut,
    expo: (x) => (x = clamp(x), x === 1 ? 1 : 1 - Math.pow(2, -10 * x)), sine: (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x)) };
  /** Progress 0..1 of something that starts at t0 and takes d seconds (smooth). t0 undefined = already done. */
  const prog = (t, t0, d = 0.4) => t0 === undefined || t0 === null ? 1 : sm((t - t0) / d);
  /** A pop-in scale 0 -> 1 with a little overshoot, starting at t0. */
  const pop = (t, t0, d = 0.42) => t0 === undefined || t0 === null ? 1 : (t < t0 ? 0 : backOut((t - t0) / d, 2.2));
  /** A gentle bob: amplitude a, f cycles per second. */
  const bob = (t, a = 6, f = 0.6, ph = 0) => a * Math.sin(2 * Math.PI * f * t + ph);
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (r, gg, b) => "#" + ((1 << 24) + (Math.round(clamp(r, 0, 255)) << 16) + (Math.round(clamp(gg, 0, 255)) << 8) + Math.round(clamp(b, 0, 255))).toString(16).slice(1);
  /** k < 0 darker (and a touch more saturated toward purple, the way flat-vector shading goes), k > 0 lighter. */
  const shade = (c, k) => {
    const [r, gg, b] = hex(c);
    if (k < 0) { const m = 1 + k; return toHex(r * m * 0.96, gg * m * 0.92, b * m + (1 - m) * 40); }
    return toHex(r + (255 - r) * k, gg + (255 - gg) * k, b + (255 - b) * k);
  };
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); return toHex(lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)); };
  const tf = (x, y, s = 1, r = 0) => `translate(${f2(x)} ${f2(y)})` + (r ? ` rotate(${f2(r)})` : "") + (s !== 1 ? ` scale(${f2(s)})` : "");
  /** Draw inner at (x, y), scaled s, rotated r degrees. */
  const at = (x, y, s, r, inner) => g(inner, { transform: tf(x, y, s, r) });

  // ---------------------------------------------------------------- measuring text (the real font, in the browser)
  const _cv = document.createElement("canvas").getContext("2d");
  function measure(str, size, weight = 900) { _cv.font = `${weight} ${size}px ${FONT}`; return _cv.measureText(str).width; }

  // ---------------------------------------------------------------- shapes as path data (all clockwise, so unions work)
  const P = {
    circle: (cx, cy, r) => `M${f2(cx - r)} ${f2(cy)}a${f2(r)} ${f2(r)} 0 1 1 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 1 ${f2(-2 * r)} 0Z`,
    ellipse: (cx, cy, rx, ry) => `M${f2(cx - rx)} ${f2(cy)}a${f2(rx)} ${f2(ry)} 0 1 1 ${f2(2 * rx)} 0a${f2(rx)} ${f2(ry)} 0 1 1 ${f2(-2 * rx)} 0Z`,
    rrect: (x, y, w, h, r = 0) => {
      r = Math.min(r, w / 2, h / 2);
      return `M${f2(x + r)} ${f2(y)}H${f2(x + w - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x + w)} ${f2(y + r)}V${f2(y + h - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x + w - r)} ${f2(y + h)}H${f2(x + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x)} ${f2(y + h - r)}V${f2(y + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x + r)} ${f2(y)}Z`;
    },
    poly: (p) => "M" + p.map((q) => f2(q[0]) + " " + f2(q[1])).join("L") + "Z",
    /** A smooth closed (or open) curve through the points (Catmull-Rom as cubic Beziers). */
    smooth: (p, closed = true, k = 1) => {
      const n = p.length, get = (i) => closed ? p[(i + n) % n] : p[clamp(i, 0, n - 1)];
      let d = `M${f2(p[0][0])} ${f2(p[0][1])}`;
      for (let i = 0; i < (closed ? n : n - 1); i++) {
        const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k], c2 = [p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k];
        d += `C${f2(c1[0])} ${f2(c1[1])} ${f2(c2[0])} ${f2(c2[1])} ${f2(p2[0])} ${f2(p2[1])}`;
      }
      return d + (closed ? "Z" : "");
    },
    /** A teardrop, tip up, centred on the round part at (cx, cy) with radius r. */
    drop: (cx, cy, r, tip = 1.75) => {
      const ty = cy - r * tip, a = Math.asin(1 / tip), sx = r * Math.cos(a), sy = cy - r * Math.sin(a);
      return `M${f2(cx)} ${f2(ty)}C${f2(cx + r * 0.25)} ${f2(ty + r * 0.45)} ${f2(cx + sx)} ${f2(sy - r * 0.15)} ${f2(cx + sx)} ${f2(sy)}`
        + `A${f2(r)} ${f2(r)} 0 1 1 ${f2(cx - sx)} ${f2(sy)}C${f2(cx - sx)} ${f2(sy - r * 0.15)} ${f2(cx - r * 0.25)} ${f2(ty + r * 0.45)} ${f2(cx)} ${f2(ty)}Z`;
    },
  };

  // ---------------------------------------------------------------- the signature fill: flat colour + shadow side + light rim
  /** A flat shape with a darker crescent on the side away from the light and a light rim on the side toward it.
      d: path data (several clockwise sub-paths make a union). o: {k: shadow width, h: rim width, light: degrees toward
      the light (default -125 = up-left), shade: 0..1 darker, hi: 0..1 lighter, dark, lite: explicit colours, opacity} */
  function blob(d, color, o = {}) {
    const k = o.k !== undefined ? o.k : 16, hk = o.h !== undefined ? o.h : 7;
    const a = (o.light !== undefined ? o.light : -125) * Math.PI / 180, lx = Math.cos(a), ly = Math.sin(a);
    let s = el("path", { d, fill: color });
    if (k > 0 && o.shade !== 0) {
      const id = uid("m");
      s += el("mask", { id, maskUnits: "userSpaceOnUse", x: -6000, y: -6000, width: 14000, height: 14000 },
        el("path", { d, fill: "#fff" }) + el("path", { d, fill: "#000", transform: `translate(${f2(lx * k)} ${f2(ly * k)})` }));
      s += el("path", { d, fill: o.dark || shade(color, -(o.shade || 0.2)), mask: `url(#${id})` });
    }
    if (hk > 0 && o.hi !== 0) {
      const id = uid("m");
      s += el("mask", { id, maskUnits: "userSpaceOnUse", x: -6000, y: -6000, width: 14000, height: 14000 },
        el("path", { d, fill: "#fff" }) + el("path", { d, fill: "#000", transform: `translate(${f2(-lx * hk)} ${f2(-ly * hk)})` }));
      s += el("path", { d, fill: o.lite || shade(color, o.hi || 0.32), mask: `url(#${id})`, opacity: 0.9 });
    }
    return o.opacity !== undefined && o.opacity < 1 ? g(s, { opacity: o.opacity }) : s;
  }
  const circle = (cx, cy, r, color, o) => blob(P.circle(cx, cy, r), color, Object.assign({ k: r * 0.22, h: r * 0.08 }, o || {}));
  const rrect = (x, y, w, h, r, color, o) => blob(P.rrect(x, y, w, h, r), color, Object.assign({ k: Math.min(w, h) * 0.12, h: Math.min(w, h) * 0.05 }, o || {}));

  // ---------------------------------------------------------------- light
  /** A soft round glow (a radial gradient), alpha a at the centre fading to nothing at r. */
  function glow(cx, cy, r, color, a = 0.6) {
    const id = uid("g");
    return el("radialGradient", { id }, el("stop", { offset: 0, "stop-color": color, "stop-opacity": a }) + el("stop", { offset: 0.45, "stop-color": color, "stop-opacity": a * 0.45 })
      + el("stop", { offset: 1, "stop-color": color, "stop-opacity": 0 })) + el("circle", { cx, cy, r, fill: `url(#${id})` });
  }
  /** Light rays from (cx, cy): n soft wedges from r0 to r1, turning with rot (degrees). */
  function rays(cx, cy, r0, r1, n, color, rot = 0, a = 0.35) {
    const id = uid("g"); let s = "";
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI + rot * Math.PI / 180, w = Math.PI / n * 0.55;
      const p = [[cx + r0 * Math.cos(a0 - w * 0.3), cy + r0 * Math.sin(a0 - w * 0.3)], [cx + r1 * Math.cos(a0 - w), cy + r1 * Math.sin(a0 - w)],
        [cx + r1 * Math.cos(a0 + w), cy + r1 * Math.sin(a0 + w)], [cx + r0 * Math.cos(a0 + w * 0.3), cy + r0 * Math.sin(a0 + w * 0.3)]];
      s += el("path", { d: P.poly(p), fill: `url(#${id})` });
    }
    return el("radialGradient", { id, gradientUnits: "userSpaceOnUse", cx, cy, r: r1 },
      el("stop", { offset: r0 / r1, "stop-color": color, "stop-opacity": a }) + el("stop", { offset: 1, "stop-color": color, "stop-opacity": 0 })) + s;
  }
  /** A soft shadow on the ground under something. */
  const shadow = (cx, cy, rx, a = 0.22, color = "#1b0f50") => el("ellipse", { cx, cy, rx, ry: rx * 0.16, fill: color, opacity: a });
  /** A big soft disc behind the subject (the spotlight behind a character). */
  const spot = (cx, cy, r, color, a = 1) => el("circle", { cx, cy, r, fill: color, opacity: a });

  // ---------------------------------------------------------------- particles
  /** n drifting dots inside box [x, y, w, h], wrapping around; o: {r: [min, max], color, vy (units/s), vx, a, seed, twinkle}. */
  function dots(n, box, t, o = {}) {
    const R = rng(o.seed || 7), [x0, y0, w, h] = box, r0 = (o.r || [3, 7])[0], r1 = (o.r || [3, 7])[1];
    let s = "";
    for (let i = 0; i < n; i++) {
      const bx = R() * w, by = R() * h, r = lerp(r0, r1, R()), sp = 0.6 + 0.8 * R(), ph = R() * 6.28;
      const x = x0 + ((bx + (o.vx || 0) * sp * t + 14 * Math.sin(t * 0.7 + ph)) % w + w) % w;
      const y = y0 + ((by + (o.vy || 0) * sp * t + 10 * Math.cos(t * 0.9 + ph)) % h + h) % h;
      const a = (o.a !== undefined ? o.a : 0.8) * (o.twinkle ? 0.55 + 0.45 * Math.sin(t * 3 + ph * 3) : 1);
      s += el("circle", { cx: x, cy: y, r, fill: Array.isArray(o.color) ? o.color[i % o.color.length] : (o.color || "#fff"), opacity: a });
    }
    return s;
  }
  const stars = (n, box, t, seed = 3) => dots(n, box, t, { seed, r: [1.5, 4.5], color: "#fff", twinkle: true, a: 0.85 });
  /** Big soft out-of-focus circles drifting slowly behind everything (depth for plain backgrounds). */
  function bokeh(n, box, t, seed = 5, color = "#ffffff", a = 0.07) {
    const R = rng(seed), [x0, y0, w, h] = box; let s = "";
    for (let i = 0; i < n; i++) {
      const r = 60 + 160 * R(), ph = R() * 6.28;
      s += el("circle", { cx: x0 + R() * w + 30 * Math.sin(t * 0.25 + ph), cy: y0 + R() * h + 24 * Math.cos(t * 0.2 + ph), r, fill: color, opacity: a * (0.5 + R()) });
    }
    return s;
  }

  // ---------------------------------------------------------------- text and labels
  /** Text. o: {size, weight, fill, stroke, sw (stroke width), anchor (middle), rot, ls (letter spacing), upper, opacity, baseline} */
  function text(str, x, y, o = {}) {
    const size = o.size || 60;
    const s = o.upper ? String(str).toUpperCase() : String(str);
    return el("text", { x, y, "font-family": FONT, "font-weight": o.weight || 900, "font-size": size, fill: o.fill || "#fff",
      stroke: o.stroke, "stroke-width": o.stroke ? (o.sw || size * 0.14) : undefined, "stroke-linejoin": "round", "paint-order": o.stroke ? "stroke" : undefined,
      "text-anchor": o.anchor || "middle", "dominant-baseline": o.baseline || "central", "letter-spacing": o.ls, opacity: o.opacity,
      transform: o.rot ? `rotate(${f2(o.rot)} ${f2(x)} ${f2(y)})` : undefined }, esc(s));
  }
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  /** The slapped-on label: a tilted bright block with heavy dark capitals. p = pop progress (F.pop(t, t0)); o: {size, bg, fg, rot, sub, raw (keep the case: "1 m³")}. */
  function tag(str, x, y, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const size = o.size || 62, s = o.raw ? String(str) : String(str).toUpperCase(), tw = measure(s, size, 900);
    const padx = size * 0.38, pady = size * 0.2, w = tw + 2 * padx, h = size * 1.02 + 2 * pady;
    const rot = (o.rot !== undefined ? o.rot : -4) + (1 - Math.min(1, p)) * 10;
    let inner = el("rect", { x: -w / 2 + 6, y: -h / 2 + 8, width: w, height: h, fill: "#000", opacity: 0.18 })
      + el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, fill: o.bg || PAL.yellow }) + text(s, 0, 2, { size, fill: o.fg || PAL.ink, weight: 900 });
    if (o.sub) inner += text(o.sub, 0, h / 2 + size * 0.42, { size: size * 0.5, fill: o.fg || PAL.ink, weight: 800 });
    return at(x, y, Math.max(0, p), rot, inner);
  }
  /** A rounded pill: small white bold text on a strong colour (data labels, places, sources). o: {size, bg, fg, sub (a second, bigger line)} */
  function pill(str, x, y, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const size = o.size || 38, tw = measure(str, size, 800);
    const sub = o.sub, ss = size * 1.25, sw2 = sub ? measure(sub, ss, 900) : 0;
    const w = Math.max(tw, sw2) + size * 1.4, h = sub ? size * 1.15 + ss * 1.15 + size * 0.5 : size * 1.75;
    let inner = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: Math.min(h / 2, size * 0.9), fill: o.bg || PAL.purple });
    if (sub) inner += text(str, 0, -h / 2 + size * 0.85, { size, fill: o.fg || "#fff", weight: 800 }) + text(sub, 0, h / 2 - ss * 0.78, { size: ss, fill: o.fg || "#fff", weight: 900 });
    else inner += text(str, 0, 2, { size, fill: o.fg || "#fff", weight: 800 });
    return at(x, y, Math.max(0, p), o.rot || 0, inner);
  }
  /** A stack of coloured tags flush to the left edge (a character's stats). items: [{text, bg}], t, t0s: start times. */
  function stack(list, x, y, t, o = {}) {
    const size = o.size || 40, gap = size * 1.65;
    return list.map((it, i) => {
      const p = pop(t, it.t, 0.35);
      if (p <= 0) return "";
      const w = measure(it.text, size, 900) + size * 1.4, h = size * 1.45;
      const dx = (1 - Math.min(1, p)) * -w;
      return at(x + dx, y + i * gap, 1, 0, el("path", { d: P.rrect(-60, -h / 2, w + 60, h, h / 2), fill: it.bg || PAL.purple })
        + text(it.text, w - size * 0.7, 2, { size, anchor: "end", fill: "#fff" }));
    });
  }
  /** A number readout: a white rounded box with a coloured border, the number counting. o: {size, unit, border} */
  function counter(value, x, y, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const size = o.size || 64, str = typeof value === "number" ? Math.round(value).toLocaleString("en-US") : value;
    const uw = o.unit ? measure(o.unit, size * 0.5, 900) + size * 0.2 : 0;
    const w = Math.max(measure(str.replace(/[0-9]/g, "0"), size, 900) + uw + size * 0.9, o.minw || 0), h = size * 1.55;
    return at(x, y, Math.max(0, p), o.rot || 0, el("rect", { x: -w / 2 - 8, y: -h / 2 - 8, width: w + 16, height: h + 16, rx: 22, fill: o.border || PAL.purple })
      + el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 16, fill: "#fff" })
      + text(str, -uw / 2, 3, { size, fill: o.fg || PAL.navy, "font-variant-numeric": "tabular-nums" })
      + (o.unit ? text(o.unit, w / 2 - size * 0.45, size * 0.12, { size: size * 0.5, fill: o.fg || PAL.navy, anchor: "end" }) : ""));
  }
  /** The title card text: heavy white lines with a dark outline, popping in one by one. lines: [{text, size, fill}] */
  function title(lines, x, y, t, o = {}) {
    let yy = y, s = "";
    const maxw = o.maxw || W * 0.9;
    lines.forEach((ln, i) => {
      let size = ln.size || 92;
      const w = measure(ln.text, size, 900) + size * 0.45;   // a long line shrinks to fit the frame
      if (w > maxw) size *= maxw / w;
      const p = pop(t, (o.t0 || 0) + i * (o.stagger || 0.12), 0.45);
      if (p > 0) {
        const style = { size, fill: ln.fill || "#fff", stroke: ln.stroke || o.stroke || PAL.navy, sw: size * 0.2, weight: 900 };
        s += at(x, yy + size * 0.5, p, o.rot || 0, text(ln.text, 5, 8, Object.assign({}, style, { fill: o.stroke || PAL.navy, opacity: 0.35 })) + text(ln.text, 0, 0, style));
      }
      yy += size * (ln.lh || 1.05);
    });
    return s;
  }
  /** A speech bubble with a tail pointing at (tx, ty). */
  function bubble(str, x, y, tx, ty, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const size = o.size || 40, w = measure(str, size, 800) + size * 1.2, h = size * 1.8;
    const a = Math.atan2(ty - y, tx - x), bx = Math.cos(a), by = Math.sin(a);
    const tail = P.poly([[bx * w * 0.2 - by * 16, by * h * 0.3 + bx * 16], [tx - x, ty - y], [bx * w * 0.2 + by * 16, by * h * 0.3 - bx * 16]]);
    return at(x, y, Math.max(0, p), o.rot || 0, el("path", { d: tail, fill: o.bg || "#fff" }) + el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: o.bg || "#fff" })
      + text(str, 0, 2, { size, fill: o.fg || PAL.indigo, weight: 800 }));
  }

  // ---------------------------------------------------------------- arrows and measures
  /** A fat arrow along points (2 = straight, 3+ = a smooth curve), drawn on with p 0..1. o: {w, color, head} */
  function arrow(pts, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const w = o.w || 26, color = o.color || PAL.yellow;
    const d = pts.length === 2 ? `M${f2(pts[0][0])} ${f2(pts[0][1])}L${f2(pts[1][0])} ${f2(pts[1][1])}` : P.smooth(pts, false);
    const n = pts.length, e = pts[n - 1], q = pts[n - 2], ang = Math.atan2(e[1] - q[1], e[0] - q[0]) * 180 / Math.PI;
    const hs = o.head || w * 2.1;
    let s = el("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1",
      "stroke-dashoffset": f2(1 - clamp(p / 0.85)), opacity: o.opacity });
    if (p > 0.8) s += at(e[0], e[1], sm((p - 0.8) / 0.2), ang, el("path", { d: P.poly([[hs * 0.55, 0], [-hs * 0.5, -hs * 0.62], [-hs * 0.5, hs * 0.62]]), fill: color, "stroke-linejoin": "round", stroke: color, "stroke-width": w * 0.3 }));
    return s;
  }
  /** A measuring line between two points with end ticks and a label pill in the middle. */
  function dimension(x1, y1, x2, y2, label, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const c = o.color || "#fff", mx = lerp(x1, x2, 0.5), my = lerp(y1, y2, 0.5), k = clamp(p / 0.7);
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * 22, ny = Math.cos(a) * 22;
    const ax = lerp(mx, x1, k), ay = lerp(my, y1, k), bx = lerp(mx, x2, k), by = lerp(my, y2, k);
    let s = el("path", { d: `M${f2(ax)} ${f2(ay)}L${f2(bx)} ${f2(by)}M${f2(ax - nx)} ${f2(ay - ny)}L${f2(ax + nx)} ${f2(ay + ny)}M${f2(bx - nx)} ${f2(by - ny)}L${f2(bx + nx)} ${f2(by + ny)}`,
      stroke: c, "stroke-width": o.w || 8, "stroke-linecap": "round", fill: "none" });
    if (label) s += pill(label, mx + (o.lx || 0), my + (o.ly || 0), { p: pop(p, 0.55, 0.45), bg: o.bg || PAL.purple, size: o.size || 40 });
    return s;
  }

  // ---------------------------------------------------------------- the magnifier inset
  /** A round window into a zoomed-in world: a ring, a pointer to `from`, and inner() drawn with (0, 0) at the centre.
      o: {p (pop), ring colour, bg, from: [x, y], w (ring width)} */
  function inset(cx, cy, r, inner, o = {}) {
    const p = o.p !== undefined ? o.p : 1;
    if (p <= 0) return "";
    const id = uid("c"), ring = o.ring || PAL.yellow, rw = o.w || 14;
    let s = "";
    if (o.from) {
      const [fx, fy] = o.from, a = Math.atan2(fy - cy, fx - cx), ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
      const k = sm(clamp(p));
      s += el("path", { d: `M${f2(ex)} ${f2(ey)}L${f2(lerp(ex, fx, k))} ${f2(lerp(ey, fy, k))}`, stroke: ring, "stroke-width": rw * 0.6, "stroke-linecap": "round" })
        + el("circle", { cx: fx, cy: fy, r: rw * 0.9 * k, fill: ring });
    }
    const sc = Math.max(0, p);
    s += g(el("clipPath", { id }, el("circle", { cx: 0, cy: 0, r })) + el("circle", { cx: 0, cy: 0, r: r + rw * 0.5 + 10, fill: "#000", opacity: 0.18, transform: "translate(8 12)" })
      + g([el("circle", { cx: 0, cy: 0, r, fill: o.bg || PAL.navy }), items(inner)], { "clip-path": `url(#${id})` })
      + el("circle", { cx: 0, cy: 0, r, fill: "none", stroke: ring, "stroke-width": rw }), { transform: tf(cx, cy, sc) });
    return s;
  }

  // ---------------------------------------------------------------- faces (put them on anything)
  /** Eyes and a mouth centred at (x, y), s = scale (1 is about 100 units wide). o: {mood: happy | smile | o | flat | worried |
      smug | shock | sleepy | grit, look: [dx, dy] (-1..1), blink: 0..1, cheeks: true, color} */
  function face(x, y, s = 1, o = {}) {
    const ink = o.color || PAL.ink, mood = o.mood || "happy", lk = o.look || [0, 0], bl = clamp(o.blink || 0);
    const ex = 30, ey = 0, er = mood === "shock" ? 15 : 12, eh = (mood === "shock" ? 21 : 17) * (1 - 0.9 * bl);
    let s2 = "";
    for (const sx of [-1, 1]) {
      const cx = sx * ex + lk[0] * 5, cy = ey + lk[1] * 4;
      s2 += el("ellipse", { cx, cy, rx: er, ry: Math.max(1.5, eh), fill: ink });
      if (eh > 6) s2 += el("circle", { cx: cx + 4 + lk[0] * 2, cy: cy - eh * 0.45, r: er * 0.38, fill: "#fff" });
      if (mood === "smug" || mood === "sleepy") s2 += el("rect", { x: cx - er - 3, y: cy - eh - 4, width: 2 * er + 6, height: eh + (mood === "sleepy" ? 6 : 2), fill: o.lid || o.base || "#fff" })
        + el("path", { d: `M${f2(cx - er - 2)} ${f2(cy + (mood === "sleepy" ? 2 : -2))}H${f2(cx + er + 2)}`, stroke: ink, "stroke-width": 5, "stroke-linecap": "round" });
      if (mood === "worried") s2 += el("path", { d: `M${f2(cx - 13 * sx)} ${f2(cy - 30)}L${f2(cx + 11 * sx)} ${f2(cy - 22)}`, stroke: ink, "stroke-width": 6, "stroke-linecap": "round" });
      if (mood === "grit") s2 += el("path", { d: `M${f2(cx - 14 * sx)} ${f2(cy - 30)}L${f2(cx + 12 * sx)} ${f2(cy - 20)}`, stroke: ink, "stroke-width": 6, "stroke-linecap": "round" });
    }
    if (o.cheeks !== false) s2 += el("ellipse", { cx: -46, cy: 22, rx: 13, ry: 8, fill: "#ff6fa0", opacity: 0.45 }) + el("ellipse", { cx: 46, cy: 22, rx: 13, ry: 8, fill: "#ff6fa0", opacity: 0.45 });
    const my = 30 + lk[1] * 3, mx = lk[0] * 4;
    const mouths = {
      happy: `M${mx - 14} ${my - 4}Q${mx} ${my + 14} ${mx + 14} ${my - 4}`,
      smile: `M${mx - 10} ${my - 2}Q${mx} ${my + 7} ${mx + 10} ${my - 2}`,
      flat: `M${mx - 9} ${my}H${mx + 9}`,
      worried: `M${mx - 12} ${my + 4}Q${mx - 6} ${my - 3} ${mx} ${my + 2}Q${mx + 6} ${my + 7} ${mx + 12} ${my}`,
      smug: `M${mx - 12} ${my}Q${mx + 2} ${my + 8} ${mx + 14} ${my - 6}`,
      sleepy: `M${mx - 6} ${my}Q${mx} ${my + 4} ${mx + 6} ${my}`,
      grit: `M${mx - 13} ${my + 2}H${mx + 13}`,
    };
    if (mood === "o" || mood === "shock") s2 += el("ellipse", { cx: mx, cy: my + 4, rx: mood === "shock" ? 11 : 8, ry: mood === "shock" ? 14 : 10, fill: ink });
    else s2 += el("path", { d: mouths[mood] || mouths.happy, stroke: ink, "stroke-width": 6, "stroke-linecap": "round", fill: "none" });
    return at(x, y, s, o.rot || 0, s2);
  }

  // ---------------------------------------------------------------- nature
  /** A puffy cloud centred at (x, y), s = scale (1 is about 420 wide). o: {color, face, mood, look, t, seed, puffs, dark (storm)} */
  function cloud(x, y, s = 1, o = {}) {
    const t = o.t || 0, R = rng(o.seed || 11);
    const base = o.color || PAL.cloud;
    const puffs = o.puffs || [[-140, 30, 82], [-70, -30, 108], [35, -62, 122], [140, -5, 96], [195, 45, 64], [-205, 52, 56], [10, 40, 110]];
    let d = "";
    for (const [px, py, pr] of puffs) {
      const ph = R() * 6.28;
      d += P.circle(px + 3 * Math.sin(t * 0.8 + ph), py + 3 * Math.cos(t * 0.6 + ph), pr * (1 + 0.025 * Math.sin(t * 1.1 + ph)));
    }
    d += P.rrect(-235, 20, 470, 92, 46);
    const body = blob(d, base, { k: 34, h: 12, light: -110, dark: o.dark || mix(base, PAL.violet, 0.42), lite: "#ffffff" });
    let s2 = (o.glow !== false ? glow(0, 10, 330, "#ffffff", 0.18) : "") + body;
    if (o.face) s2 += face(o.fx || 10, o.fy || 10, o.fs || 1.15, { mood: o.mood || "happy", look: o.look, blink: o.blink, base, lid: base, color: PAL.ink });
    return at(x, y, s, o.rot || 0, s2);
  }
  /** A water droplet (tip up), round part centred at (x, y) with radius r. o: {color, face, mood, look, hi} */
  function drop(x, y, r, o = {}) {
    const c = o.color || PAL.water;
    let s = blob(P.drop(x, y, r), c, { k: r * 0.28, h: r * 0.1, dark: shade(c, -0.25), lite: "#bff1ff" });
    s += el("ellipse", { cx: x - r * 0.42, cy: y - r * 0.38, rx: r * 0.14, ry: r * 0.24, fill: "#fff", opacity: 0.75, transform: `rotate(25 ${f2(x - r * 0.42)} ${f2(y - r * 0.38)})` });
    if (o.face) s += face(x, y + r * 0.05, r / 75, { mood: o.mood || "happy", look: o.look, blink: o.blink, base: c, lid: c });
    return s;
  }
  /** The sun with soft rays and a glow. o: {face, mood, t, rays (true)} */
  function sun(x, y, r, o = {}) {
    const t = o.t || 0;
    let s = glow(x, y, r * 3.2, "#fff4a8", 0.55);
    if (o.rays !== false) {
      for (let i = 0; i < 12; i++) {
        const a = i * 30 + t * 8, ca = Math.cos(a * Math.PI / 180), sa = Math.sin(a * Math.PI / 180), l = r * (i % 2 ? 0.32 : 0.45);
        s += el("path", { d: `M${f2(x + ca * r * 1.3)} ${f2(y + sa * r * 1.3)}L${f2(x + ca * (r * 1.3 + l))} ${f2(y + sa * (r * 1.3 + l))}`, stroke: PAL.yellow, "stroke-width": r * 0.13, "stroke-linecap": "round" });
      }
    }
    s += circle(x, y, r, PAL.yellow, { dark: PAL.amber, lite: "#fff6b8" });
    if (o.face) s += face(x, y + r * 0.08, r / 95, { mood: o.mood || "happy", look: o.look, base: PAL.yellow, lid: PAL.yellow });
    return s;
  }
  /** Rolling hills from far to near starting at height y, spanning the whole re-framed width. o: {colors, seed, trees, t} */
  function hills(y, o = {}) {
    const cols = o.colors || ["#7fd6a0", "#3dbb78", "#1f9a62"], R = rng(o.seed || 5);
    let s = "";
    cols.forEach((c, li) => {
      const yy = y + li * (o.step || 70), pts = [];
      for (let x = -1100; x <= 2200; x += 220) pts.push([x, yy - 40 * R() - (li === 0 ? 30 : 0) + 25 * Math.sin(x * 0.004 + li)]);
      const d = P.smooth(pts, false) + `L2200 ${yy + 3000}L-1100 ${yy + 3000}Z`;
      s += blob(d, c, { k: 0, h: 10, light: -95, lite: shade(c, 0.35) });
      if (o.trees !== false && li < cols.length - 1) {
        for (let k = 0; k < 9; k++) {
          const tx = -900 + R() * 2900, ty = yy + 30 + R() * 30, ts = 0.6 + R() * 0.6;
          s += tree(tx, ty, ts, shade(c, -0.35));
        }
      }
    });
    return s;
  }
  /** A lollipop tree standing at (x, y). */
  const tree = (x, y, s = 1, c = "#167a52") => at(x, y, s, 0, el("rect", { x: -5, y: -40, width: 10, height: 42, rx: 5, fill: shade(c, -0.3) }) + blob(P.ellipse(0, -70, 30, 42), c, { k: 10, h: 4 }));

  // ---------------------------------------------------------------- people (generic, never a real person)
  /** A flat person standing with feet at (x, y); s = scale (1 is about 430 tall).
      o: {skin, hair, hairStyle (short | bob | bun | curly | none), shirt, pants, shoes, mood, look, blink,
          arms: [[shoulder, elbow], [shoulder, elbow]] in degrees (0 = hanging down, 90 = straight out to that side, 180 = up),
          lean (degrees), hold: fn(hx, hy) drawn at the right hand, flip} */
  function person(x, y, s = 1, o = {}) {
    const skin = o.skin || PAL.skin, shirt = o.shirt || PAL.sky, pants = o.pants || PAL.indigo, shoes = o.shoes || PAL.ink, hair = o.hair || PAL.hair;
    const arms = o.arms || [[12, 6], [12, 6]];
    let s2 = "";
    s2 += shadow(0, 0, 95, 0.2);
    for (const sx of [-1, 1]) {          // legs and shoes
      s2 += blob(P.rrect(sx * 30 - 21, -170, 42, 168, 21), pants, { k: 10, h: 4 });
      s2 += blob(P.ellipse(sx * 34 + sx * 6, -6, 34, 16), shoes, { k: 6, h: 3, lite: shade(shoes, 0.25) });
    }
    const body = P.smooth([[-62, -330], [0, -342], [62, -330], [70, -250], [62, -160], [0, -150], [-62, -160], [-70, -250]], true, 0.9);
    s2 += blob(body, shirt, { k: 18, h: 7 });
    const arm = (sx, a) => {           // shoulder -> elbow -> hand; sx = -1 his right (screen left), 1 his left
      const sh = [sx * 56, -318], [a1, a2] = a, r1 = (a1 * sx) * Math.PI / 180, r2 = ((a1 + a2) * sx) * Math.PI / 180;
      const el1 = [sh[0] + Math.sin(r1) * 82, sh[1] + Math.cos(r1) * 82], hd = [el1[0] + Math.sin(r2) * 78, el1[1] + Math.cos(r2) * 78];
      return { d: `M${f2(sh[0])} ${f2(sh[1])}L${f2(el1[0])} ${f2(el1[1])}L${f2(hd[0])} ${f2(hd[1])}`, hand: hd };
    };
    const A = [arm(-1, arms[0]), arm(1, arms[1])];
    for (const a of A) {
      s2 += el("path", { d: a.d, stroke: shade(shirt, -0.12), "stroke-width": 40, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" });
      s2 += circle(a.hand[0], a.hand[1], 19, skin, { k: 5, h: 2 });
    }
    s2 += blob(P.rrect(-17, -372, 34, 40, 10), shade(skin, -0.12), { k: 0, h: 0 });   // neck
    const hy = -432;
    s2 += circle(0, hy, 66, skin, { k: 14, h: 5 });
    const hs = o.hairStyle || "short";
    if (hs === "short") s2 += blob(P.smooth([[-68, hy + 4], [-62, hy - 48], [-20, hy - 74], [34, hy - 72], [68, hy - 34], [70, hy - 2], [52, hy - 30], [10, hy - 40], [-34, hy - 30], [-52, hy - 8]]), hair, { k: 10, h: 5 });
    if (hs === "bob") s2 += blob(P.smooth([[-76, hy + 46], [-74, hy - 40], [-30, hy - 76], [30, hy - 76], [74, hy - 40], [76, hy + 46], [56, hy + 40], [52, hy - 26], [-52, hy - 26], [-56, hy + 40]]), hair, { k: 10, h: 5 });
    if (hs === "bun") s2 += circle(0, hy - 82, 32, hair, { k: 8, h: 3 }) + blob(P.smooth([[-68, hy + 2], [-60, hy - 50], [0, hy - 72], [60, hy - 50], [68, hy + 2], [46, hy - 30], [-46, hy - 30]]), hair, { k: 10, h: 5 });
    if (hs === "curly") { let d = ""; for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; d += P.circle(Math.cos(a) * 60, hy + Math.sin(a) * 56 - 6, 24); } s2 += blob(d, hair, { k: 8, h: 4 }); }
    s2 += face(0, hy + 8, 0.82, { mood: o.mood || "smile", look: o.look, blink: o.blink, base: skin, lid: skin, cheeks: true });
    if (o.hold) s2 += o.hold(A[1].hand[0], A[1].hand[1], A[0].hand[0], A[0].hand[1]);
    return at(x, y, s, o.lean || 0, o.flip ? g(s2, { transform: "scale(-1 1)" }) : s2);
  }

  // ---------------------------------------------------------------- props
  /** An elephant standing with feet at (x, y), facing right (o.flip faces left); s = 1 is about 300 long. o: {color, t, mood} */
  function elephant(x, y, s = 1, o = {}) {
    const c = o.color || "#9a93d6", t = o.t || 0, sw = Math.sin(t * 2.2) * 6;
    let e = shadow(0, 0, 150, 0.2);
    for (const [lx, d] of [[-95, 1], [-45, 0], [55, 1], [100, 0]]) e += blob(P.rrect(lx - 22, -120, 44, 120, 18), d ? shade(c, -0.12) : c, { k: 8, h: 3 });
    e += blob(P.ellipse(0, -150, 150, 96), c, { k: 26, h: 9 });
    e += el("path", { d: `M-146 -170Q-182 -140 -170 -110`, stroke: shade(c, -0.2), "stroke-width": 8, fill: "none", "stroke-linecap": "round" });
    e += blob(P.circle(140, -190, 74), c, { k: 16, h: 6 });
    e += el("path", { d: `M195 -170Q232 ${f2(-90 + sw)} ${f2(205 + sw)} -30`, stroke: c, "stroke-width": 40, fill: "none", "stroke-linecap": "round" })
      + el("path", { d: `M195 -170Q232 ${f2(-90 + sw)} ${f2(205 + sw)} -30`, stroke: shade(c, -0.18), "stroke-width": 40, fill: "none", "stroke-linecap": "round", opacity: 0.35, transform: "translate(6 4)" });
    e += blob(P.smooth([[60, -250], [130, -262], [128, -170], [96, -112], [58, -150]]), shade(c, -0.1), { k: 12, h: 5, dark: shade(c, -0.3) });
    e += el("path", { d: "M176 -146Q196 -128 214 -132", stroke: "#fff8e6", "stroke-width": 12, "stroke-linecap": "round", fill: "none" });
    e += el("ellipse", { cx: 166, cy: -206, rx: 8, ry: 11, fill: PAL.ink }) + el("circle", { cx: 169, cy: -210, r: 3, fill: "#fff" });
    return at(x, y, s, o.rot || 0, o.flip ? g(e, { transform: "scale(-1 1)" }) : e);
  }
  /** A balance scale: the post at (x, y) (the base on the ground), the beam tilted by tilt degrees (+ = right side down).
      left(px, py) / right(px, py) draw what sits on each pan (py = the pan's floor). o: {s, color, span} */
  function balance(x, y, tilt, left, right, o = {}) {
    const s = o.s || 1, span = o.span || 330, c = o.color || "#ffcf4a", post = 560;
    const a = tilt * Math.PI / 180, top = [0, -post];
    const end = (sx) => [top[0] + sx * span * Math.cos(a), top[1] + sx * span * Math.sin(a)];
    const L = end(-1), R2 = end(1), drop = 190;
    let b = shadow(0, 8, 200, 0.22);
    b += blob(P.rrect(-150, -40, 300, 48, 24), shade(c, -0.15), { k: 10, h: 4 });
    b += blob(P.rrect(-22, -post, 44, post - 20, 18), c, { k: 10, h: 4 });
    for (const e of [L, R2]) b += el("path", { d: `M${f2(e[0])} ${f2(e[1])}L${f2(e[0] - 120)} ${f2(e[1] + drop)}M${f2(e[0])} ${f2(e[1])}L${f2(e[0] + 120)} ${f2(e[1] + drop)}`, stroke: shade(c, -0.35), "stroke-width": 6 });
    b += el("path", { d: `M${f2(L[0])} ${f2(L[1])}L${f2(R2[0])} ${f2(R2[1])}`, stroke: c, "stroke-width": 30, "stroke-linecap": "round" });
    b += circle(0, -post, 30, shade(c, -0.08), { k: 8, h: 3 });
    for (const [e, fn] of [[L, left], [R2, right]]) {
      const px = e[0], py = e[1] + drop;
      b += fn ? fn(px, py - 4) : "";
      b += blob(`M${f2(px - 150)} ${f2(py - 6)}Q${f2(px)} ${f2(py + 80)} ${f2(px + 150)} ${f2(py - 6)}Z`, c, { k: 14, h: 4 });
    }
    return at(x, y, s, 0, b);
  }
  /** An isometric cube with see-through faces; (x, y) = the bottom-front corner on the ground; a = edge length on screen.
      o: {color, grid (cells per edge), gp (grid progress 0..1), alpha, edge, p (draw-on 0..1)} */
  function cube(x, y, a, o = {}) {
    const c = o.color || "#ffffff", p = o.p !== undefined ? o.p : 1, al = o.alpha !== undefined ? o.alpha : 0.16;
    if (p <= 0) return "";
    const cx = a * 0.866, cy = a * 0.5;
    // corners: i along right-back, j along left-back, k up
    const pt = (i, j, k) => [x + (i - j) * cx, y - (i + j) * cy - k * a];
    let s = "";
    const face4 = (q, fill, op) => el("path", { d: P.poly(q), fill, opacity: op * p });
    s += face4([pt(0, 0, 0), pt(1, 0, 0), pt(1, 0, 1), pt(0, 0, 1)], c, al * 0.9);
    s += face4([pt(0, 0, 0), pt(0, 1, 0), pt(0, 1, 1), pt(0, 0, 1)], c, al * 0.6);
    s += face4([pt(0, 0, 1), pt(1, 0, 1), pt(1, 1, 1), pt(0, 1, 1)], c, al * 1.3);
    const ed = (u, v) => `M${f2(u[0])} ${f2(u[1])}L${f2(v[0])} ${f2(v[1])}`;
    if (o.grid && (o.gp || 0) > 0) {
      const n = o.grid, gp = clamp(o.gp); let d = "";
      for (let k = 1; k < n; k++) {
        const f = k / n;
        if (gp * n >= k - 1) {
          d += ed(pt(f, 0, 0), pt(f, 0, 1)) + ed(pt(0, 0, f), pt(1, 0, f)) + ed(pt(0, f, 0), pt(0, f, 1)) + ed(pt(0, 0, f), pt(0, 1, f))
            + ed(pt(f, 0, 1), pt(f, 1, 1)) + ed(pt(0, f, 1), pt(1, f, 1));
        }
      }
      s += el("path", { d, stroke: c, "stroke-width": o.gw || 2, opacity: 0.55 * p, fill: "none" });
    }
    const E = [[pt(0, 0, 0), pt(1, 0, 0)], [pt(0, 0, 0), pt(0, 1, 0)], [pt(0, 0, 0), pt(0, 0, 1)], [pt(1, 0, 0), pt(1, 0, 1)], [pt(0, 1, 0), pt(0, 1, 1)],
      [pt(0, 0, 1), pt(1, 0, 1)], [pt(0, 0, 1), pt(0, 1, 1)], [pt(1, 0, 1), pt(1, 1, 1)], [pt(0, 1, 1), pt(1, 1, 1)]];
    s += el("path", { d: E.map(([u, v]) => ed(u, v)).join(""), stroke: c, "stroke-width": o.edge || 7, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none",
      pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": f2(1 - p) });
    return s;
  }
  /** A ruler, horizontal, left end at (x, y), length l with n marks. */
  function ruler(x, y, l, n = 10, o = {}) {
    const c = o.color || PAL.amber;
    let s = blob(P.rrect(x, y - 40, l, 80, 10), c, { k: 10, h: 4 }), d = "";
    for (let i = 0; i <= n * 2; i++) { const xx = x + 20 + (l - 40) * i / (n * 2); d += `M${f2(xx)} ${f2(y - 40)}v${i % 2 ? 22 : 40}`; }
    return s + el("path", { d, stroke: shade(c, -0.45), "stroke-width": 5 }) + (o.label ? text(o.label, x + l / 2, y + 16, { size: 30, fill: shade(c, -0.55) }) : "");
  }
  /** A stopwatch at (x, y), radius r, the hand at `secs`. */
  function stopwatch(x, y, r, secs, o = {}) {
    const a = secs * 6 * Math.PI / 180;
    return rrect(x - r * 0.18, y - r * 1.32, r * 0.36, r * 0.3, 6, PAL.coral) + circle(x, y, r, o.color || PAL.coral)
      + el("circle", { cx: x, cy: y, r: r * 0.8, fill: "#fff" })
      + el("path", { d: Array.from({ length: 12 }, (_, i) => { const b = i * Math.PI / 6; return `M${f2(x + Math.sin(b) * r * 0.68)} ${f2(y - Math.cos(b) * r * 0.68)}L${f2(x + Math.sin(b) * r * 0.76)} ${f2(y - Math.cos(b) * r * 0.76)}`; }).join(""), stroke: PAL.ink, "stroke-width": 5 })
      + el("path", { d: `M${f2(x)} ${f2(y)}L${f2(x + Math.sin(a) * r * 0.62)} ${f2(y - Math.cos(a) * r * 0.62)}`, stroke: PAL.coral, "stroke-width": 8, "stroke-linecap": "round" })
      + el("circle", { cx: x, cy: y, r: 9, fill: PAL.ink });
  }

  // ---------------------------------------------------------------- camera and frame
  const cam = (x, y, z = 1, r = 0) => ({ x, y, z, r });
  /** A camera moving from a = [x, y, zoom(, roll)] to b over the shot, eased. */
  function drift(t, T, a, b, e = ease.sine) {
    const k = e(T > 0 ? t / T : 1);
    return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), z: a[2] * Math.pow(b[2] / a[2], k), r: lerp(a[3] || 0, b[3] || 0, k) };
  }
  /** Shake the camera for a jolt that started at t0. */
  const shake = (c, t, t0, amt = 14) => t < t0 ? c : Object.assign({}, c, { x: c.x + amt * Math.sin((t - t0) * 71) * Math.exp(-(t - t0) * 7), y: c.y + amt * Math.cos((t - t0) * 53) * Math.exp(-(t - t0) * 7) });
  function fit(c) {
    if (!WIDE) return c;
    const o = (window.FIT78 && window.FIT78[window.SHOT]) || {};
    const z = c.z * (o.zoom || FIT.zoom);
    const dy = o.dy !== undefined ? o.dy : (o.lift !== undefined ? o.lift : FIT.lift) / z;
    return { x: c.x + (o.dx || 0), y: c.y + dy, z, r: c.r };
  }
  const camTf = (c) => `translate(${f2(W / 2)} ${f2(H / 2)}) rotate(${f2(c.r)}) scale(${f2(c.z)}) translate(${f2(-c.x)} ${f2(-c.y)})`;
  /** Where a world point lands on screen with camera c (for overlays that follow something in the world). */
  const toScreen = (c, x, y) => { c = fit(c); const a = -c.r * Math.PI / 180; const dx = (x - c.x) * c.z, dy = (y - c.y) * c.z; return [W / 2 + dx * Math.cos(a) + dy * Math.sin(a), H / 2 - dx * Math.sin(a) + dy * Math.cos(a)]; };
  function background(bg) {
    if (!bg) bg = [PAL.sky, PAL.cyan];
    if (typeof bg === "string") return el("rect", { x: 0, y: 0, width: W, height: H, fill: bg });
    const id = uid("bg");
    return el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, bg.map((c, i) => el("stop", { offset: f2(i / (bg.length - 1)), "stop-color": c })).join(""))
      + el("rect", { x: 0, y: 0, width: W, height: H, fill: `url(#${id})` });
  }
  /** The whole picture: background, the world through the camera, screen overlays. */
  function frame(c, world, overlay, bg) {
    c = fit(c);
    return background(bg) + g(world, { transform: camTf(c) }) + g(overlay, {});
  }
  /** Something drawn in screen space at the overlay scale (1 on 9:16, 0.87 on 7:8): x, y as fractions of the frame. */
  const screen = (fx, fy, inner) => at(W * fx, H * fy, U, 0, inner);

  // ---------------------------------------------------------------- transitions between shots (Flat.render does them)
  const TRANS = { cut: 0, slide: 0.42, slide_up: 0.42, slide_left: 0.4, zoom: 0.4, iris: 0.45, whip: 0.3, fade: 0.3, pop: 0.3 };
  function composite(kind, prev, next, k, sh) {
    const e = ease.inout(k);
    const focus = sh.focus || [W / 2, H / 2];
    switch (kind) {
      case "slide": case "slide_up":
        return g(prev, { transform: `translate(0 ${f2(-H * e)})` }) + g(next, { transform: `translate(0 ${f2(H * (1 - e))})` });
      case "slide_left":
        return g(prev, { transform: `translate(${f2(-W * e)} 0)` }) + g(next, { transform: `translate(${f2(W * (1 - e))} 0)` });
      case "whip": {
        const id = uid("b"), b = 60 * Math.sin(Math.PI * k);
        return el("filter", { id, x: -0.2, y: -0.2, width: 1.4, height: 1.4 }, el("feGaussianBlur", { stdDeviation: `${f2(b)} 0` }))
          + g([g(prev, { transform: `translate(${f2(-W * e)} 0)` }), g(next, { transform: `translate(${f2(W * (1 - e))} 0)` })], { filter: `url(#${id})` });
      }
      case "zoom": {             // into the focus point: the old picture rushes past and is gone by 60 %, the new one settles from slightly big
        const s1 = 1 + 3.5 * ease.in(k), s2 = 1.3 - 0.3 * ease.out(k);
        const z = (s, inner, op) => g(inner, { transform: `translate(${f2(focus[0])} ${f2(focus[1])}) scale(${f2(s)}) translate(${f2(-focus[0])} ${f2(-focus[1])})`, opacity: f2(op) });
        return z(s2, next, 1) + (k < 0.6 ? z(s1, prev, 1 - sm(k / 0.6)) : "");
      }
      case "iris": {
        const id = uid("c"), r = Math.hypot(W, H) * ease.in(k);
        return prev + el("clipPath", { id }, el("circle", { cx: focus[0], cy: focus[1], r })) + g(next, { "clip-path": `url(#${id})` });
      }
      case "pop": {
        const s = 0.6 + 0.4 * backOut(k, 1.6);
        return prev + g(next, { transform: `translate(${f2(W / 2)} ${f2(H / 2)}) scale(${f2(s)}) translate(${f2(-W / 2)} ${f2(-H / 2)})`, opacity: f2(clamp(k * 2.5)) });
      }
      default:                   // fade
        return prev + g(next, { opacity: f2(e) });
    }
  }
  function missing(sh, t, T) {
    return background([PAL.indigo, PAL.purple]) + text(sh.fn || "shot " + sh.i, W / 2, H * 0.42, { size: 60 * U }) + text((sh.said || "").slice(0, 40), W / 2, H * 0.5, { size: 34 * U, weight: 700 })
      + text("not drawn yet", W / 2, H * 0.56, { size: 30 * U, weight: 700, fill: PAL.yellow });
  }
  function draw(sh, t, T, f) {
    window.SHOT = sh.fn;
    const fn = window[sh.fn];
    return fn ? fn(t, T, sh, f) : missing(sh, t, T);
  }
  /** Draw frame f of the plan into the page (render.py calls this). */
  function render(f) {
    const PL = window.PLAN;
    const sh = PL.shots.find((s) => f >= s.f0 && f < s.f1) || PL.shots[PL.shots.length - 1];
    const t = (f - sh.f0) / PL.fps, T = (sh.f1 - sh.f0) / PL.fps;
    UID = 0;
    let out = draw(sh, t, T, f);
    const kind = sh.transition || "cut", d = TRANS[kind] !== undefined ? TRANS[kind] : 0.4;
    if (sh.i > 0 && d > 0 && t < d) {
      const pv = PL.shots[sh.i - 1], pT = (pv.f1 - pv.f0) / PL.fps;
      const prev = draw(pv, pT + t, pT, f);
      window.SHOT = sh.fn;
      out = composite(kind, prev, out, t / d, sh);
    }
    document.getElementById("s").innerHTML = out;
    return sh.fn;
  }
  /** A light film grain as a picture (screen-fixed, so it costs the encoder nothing): it keeps gradients from banding. */
  function grainURL() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), im = x.createImageData(256, 256), R = rng(99);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (R() - 0.5) * 90; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    return c.toDataURL("image/png");
  }

  window.Flat = {
    W, H, WIDE, U, PAL, FONT, el, g, at, tf, flat, clamp, lerp, sm, ease, prog, pop, bob, rng, shade, mix, uid, measure, P,
    blob, circle, rrect, glow, rays, shadow, spot, dots, stars, bokeh, text, tag, pill, stack, counter, title, bubble, arrow, dimension, inset,
    face, cloud, drop, sun, hills, tree, person, elephant, balance, cube, ruler, stopwatch,
    cam, drift, shake, fit, toScreen, frame, screen, background, render, grainURL, TRANS,
  };
})();
