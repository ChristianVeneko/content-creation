// flat-2d player. Runs inside the HyperFrames page: builds ONE paused GSAP timeline from PLAN (ops, camera moves,
// captions) and registers it. Everything visible is a pure function of timeline time: no Date, no random, no rAF.
(function () {
  const P = PLAN;
  const tl = gsap.timeline({ paused: true });
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const VARS = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
  const SHOW_CAPTIONS = VARS.captions !== false;
  const bez = (c, u) => { const m = 1 - u; return [0, 1].map((k) => m * m * m * c[0][k] + 3 * m * m * u * c[1][k] + 3 * m * u * u * c[2][k] + u * u * u * c[3][k]); };

  // one-time static setup (not animation): transform origins and centred overlays
  gsap.set(".char .rot, .char .flip", { svgOrigin: "0 0" });
  gsap.set(".cx", { xPercent: -50, yPercent: -50 });
  for (const o of P.origins) {
    if (o.origin) gsap.set(o.sel, { svgOrigin: o.origin });
    if (o.data) { const el = $(o.sel); if (el) Object.assign(el.dataset, Object.fromEntries(Object.entries(o.data).map(([k, v]) => [k, String(v)]))); }
  }

  // cold-seek safety: the first "from" state of every element+property is placed at t=0, so frame N never depends on seek order
  const seen = new Set();
  const seed = (sel, from) => {
    const fresh = {};
    for (const k of Object.keys(from)) {
      if (k === "attr") { for (const a of Object.keys(from.attr)) { const key = sel + "|attr." + a; if (!seen.has(key)) { seen.add(key); (fresh.attr = fresh.attr || {})[a] = from.attr[a]; } } }
      else { const key = sel + "|" + k; if (!seen.has(key)) { seen.add(key); fresh[k] = from[k]; } }
    }
    if (Object.keys(fresh).length) tl.set(sel, fresh, 0);
  };
  const extra = (op) => { const e = {}; for (const k of ["repeat", "yoyo", "stagger", "repeatDelay"]) if (op[k] !== undefined) e[k] = op[k]; return e; };

  /* ---------------- camera ---------------- */
  const cam = Object.assign({ blur: 0 }, P.cameraInitial);
  const sceneEls = P.scenes.map((s, i) => ({ s, far: $("#far" + i), mid: $("#mid" + i), near: $("#near" + i) }));
  const clampv = (v, m) => Math.max(-m, Math.min(m, v));
  function applyCam() {
    const z = cam.z;
    gsap.set("#world", { x: P.ax - cam.cx * z, y: P.ay - cam.cy * z, scale: z, transformOrigin: "0 0", filter: cam.blur > 0.25 ? "blur(" + cam.blur.toFixed(1) + "px)" : "none" });
    const zm = Math.pow(z, 0.45), zf = Math.pow(z, 0.2);
    gsap.set("#bgMid", { x: P.ax - cam.cx * 0.45 * zm, y: P.ay - cam.cy * 0.45 * zm, scale: zm, transformOrigin: "0 0" });
    gsap.set("#bgFar", { x: P.ax - cam.cx * 0.15 * zf, y: P.ay - cam.cy * 0.15 * zf, scale: zf, transformOrigin: "0 0" });
    for (const e of sceneEls) {
      const dx = cam.cx - e.s.cx, dy = cam.cy - e.s.cy;
      if (Math.abs(dx) > 2600 || Math.abs(dy) > 2600) continue;
      gsap.set(e.far, { x: clampv(dx * 0.4, 150), y: clampv(dy * 0.2, 90) });
      gsap.set(e.mid, { x: clampv(dx * 0.15, 90), y: clampv(dy * 0.07, 50) });
      gsap.set(e.near, { x: clampv(-dx * 0.12, 120), y: clampv(-dy * 0.06, 70) });
    }
  }
  applyCam();
  for (const m of P.moves) {
    const d = Math.max(0.001, m.t1 - m.t0);
    const base = { immediateRender: false, onUpdate: applyCam };
    tl.fromTo(cam, { cx: m.from.cx, cy: m.from.cy }, { cx: m.to.cx, cy: m.to.cy, duration: d, ease: m.ease, ...base }, m.t0);
    if (m.dip) {
      tl.fromTo(cam, { z: m.from.z }, { z: m.dip, duration: d / 2, ease: "power2.out", ...base }, m.t0);
      tl.fromTo(cam, { z: m.dip }, { z: m.to.z, duration: d / 2, ease: "power2.in", ...base }, m.t0 + d / 2);
    } else tl.fromTo(cam, { z: m.from.z }, { z: m.to.z, duration: d, ease: m.ease, ...base }, m.t0);
    if (m.blur) {
      tl.fromTo(cam, { blur: 0 }, { blur: m.blur, duration: d * 0.45, ease: "power1.out", ...base }, m.t0);
      tl.fromTo(cam, { blur: m.blur }, { blur: 0, duration: d * 0.55, ease: "power1.in", ...base }, m.t0 + d * 0.45);
    }
  }

  /* ---------------- ops ---------------- */
  for (const op of P.ops) {
    switch (op.k) {
      case "set": tl.set(op.sel, op.v, op.t); break;
      case "to": tl.to(op.sel, Object.assign({}, op.v, { duration: op.d, ease: op.ease || "power2.out" }, extra(op)), op.t); break;
      case "fromTo": seed(op.sel, op.from); tl.fromTo(op.sel, op.from, Object.assign({}, op.to, { duration: op.d, ease: op.ease || "power2.out", immediateRender: false }, extra(op)), op.t); break;
      case "cycle": {
        const half = op.period / 2, n = Math.max(1, Math.ceil(op.d / half));
        for (const it of op.items) { seed(it.sel, { rotation: it.a }); tl.fromTo(it.sel, { rotation: it.a }, { rotation: it.b, duration: half, ease: "sine.inOut", repeat: n - 1, yoyo: true, immediateRender: false }, op.t); }
        break;
      }
      case "roll": {
        const el = $(op.sel); if (!el) break;
        const to = parseFloat(el.dataset.to || "0"), pre = el.dataset.pre || "", suf = el.dataset.suf || "", dec = parseInt(el.dataset.dec || "0", 10);
        const o = { v: 0 };
        const fmt = (v) => { const s = dec ? v.toFixed(dec) : String(Math.round(v)); return pre + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suf; };
        tl.fromTo(o, { v: 0 }, { v: to, duration: op.d, ease: op.ease || "power2.out", immediateRender: false, onUpdate() { el.textContent = fmt(o.v); } }, op.t);
        break;
      }
      case "path": {
        const el = $(op.sel); if (!el) break;
        const s = { u: 0 };
        tl.fromTo(s, { u: 0 }, { u: 1, duration: op.d, ease: op.ease || "none", immediateRender: false, onUpdate() { const p = bez(op.c, s.u); gsap.set(el, { x: p[0], y: p[1] }); } }, op.t);
        break;
      }
      default: break;
    }
  }

  /* ---------------- captions (own, word by word, only when the `captions` variable is true) ---------------- */
  if (!SHOW_CAPTIONS) gsap.set(".cap", { display: "none" });
  else for (const g of P.captions) {
    tl.set("#" + g.id, { opacity: 1 }, g.start - 0.02);
    for (const w of g.words) { const s = "#" + w.id; seed(s, { opacity: 0, y: 18, scale: 0.85 }); tl.fromTo(s, { opacity: 0, y: 18, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.16, ease: "back.out(2.4)", immediateRender: false }, w.t); }
    tl.to("#" + g.id, { opacity: 0, duration: 0.1 }, g.end - 0.1);
    tl.set("#" + g.id, { opacity: 0 }, g.end);
  }

  tl.to({}, { duration: 0.01 }, P.duration - 0.01);
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
})();
