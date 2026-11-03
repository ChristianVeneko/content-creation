// Compiles resolved beats into runtime ops (+ overlay DOM, sfx cues and camera beats). Every visual the player
// needs is described here as data: { k: "set"|"to"|"fromTo"|"cycle"|"roll"|"path", t, sel, ... }.
import { icon } from "./icons.mjs";
import { esc, r2, mulberry32, hashSeed, clamp } from "./util.mjs";
import { CAST_AT } from "./layout.mjs";
import { CastState, clipOps, lifeOps } from "./clips.mjs";
import { STAGE } from "./layout.mjs";

const ROLE_VAR = (r) => `var(--${r})`;
const cen = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function compileBeats({ model, timeline, hf, d, duration, mode }) {
  const ops = [], sfx = [], camBeats = [];
  const ov = model.scenes.map(() => ""), lines = model.scenes.map(() => "");
  const origins = [];
  let uid = 0;
  const accentHex = d.c.accent, goodHex = d.c.good;
  const add = (...o) => ops.push(...o.flat());
  const cue = (at, kind) => sfx.push({ at: r2(at), kind });
  const rng = (n) => mulberry32(hashSeed("flat2d" + n));

  // ---- characters: life + initial poses
  const castStates = new Map();
  for (const sc of model.scenes) for (const ch of sc.cast) {
    castStates.set(ch.key, new CastState(ch));
    add(lifeOps(ch, duration));
    if (ch.mode === "side") add({ k: "set", t: 0, sel: `#${ch.key} .flip`, v: { scaleX: ch.flip } });
  }

  // ---- scene labels pop in at arrival
  model.scenes.forEach((sc, si) => {
    if (!sc.def.label) return;
    const t = si === 0 ? 0.15 : timeline.enter[si] + 0.1;
    add({ k: "fromTo", t: r2(t), sel: `#lab${si}`, from: { opacity: 0, y: -26, scale: 0.8 }, to: { opacity: 1, y: 0, scale: 1 }, d: 0.45, ease: "back.out(2)" });
    if (si > 0) cue(t, "pop");
  });

  // ---- initially hidden props / setting props that a show beat will reveal
  const hiddenSel = (T) => (T.type === "cast" ? `#${T.el} .pos` : `#${T.el}`);
  const state = { msgNext: new Map(), dropNext: new Map(), punchNext: new Map(), cursor: new Map(), hl: new Map(), hero: 0 };
  model.scenes.forEach((sc, si) => {
    for (const p of sc.props) {
      const hasShow = timeline.beats[si].some((b) => b.do === "show" && b.target === p.id);
      if (p.hidden || hasShow) add({ k: "set", t: 0, sel: `#${p.el}`, v: { opacity: 0 } });
      if (p.kind === "stats") add({ k: "set", t: 0, sel: `#${p.el} .sx-bar`, v: { scaleX: 0, transformOrigin: "0 0" } });
      if (p.kind === "chat" || p.kind === "phone") add({ k: "set", t: 0, sel: `#${p.el} .bub .tx`, v: { opacity: 0 } });
      if (p.kind === "chart") add({ k: "set", t: 0, sel: `#${p.el} .cr-bar`, v: { scaleY: 0 } });
      if (p.kind === "calendar") add({ k: "set", t: 0, sel: `#${p.el} .mk`, v: { opacity: 0, scale: 0 } });
    }
    for (const [name, T] of sc.targets) if (T.type === "setting" && timeline.beats[si].some((b) => b.do === "show" && b.target === name)) add({ k: "set", t: 0, sel: `#${T.el}`, v: { opacity: 0 } });
  });

  // ---- beats, scene by scene in time order
  model.scenes.forEach((sc, si) => {
    const sceneStart = si === 0 ? 0 : timeline.enter[si];
    const sceneEnd = timeline.scenes[si].exit;
    const TG = (name) => sc.targets.get(name);
    const sel = (T) => (T ? (T.type === "cast" ? `#${T.el} .pos` : `#${T.el}`) : null);
    const fxScale = (T) => (T.type === "cast" ? 1 / T.cast.scale : 1);
    const isInert = (T) => T.type === "setting" && new RegExp(`id="${sc.pre}-${T.name}"></g>`).test(sc.setting.far + sc.setting.mid + sc.setting.near);
    const mkOv = (html) => { ov[si] += html; };
    const ring = (T, t, role, rep = 2) => {
      const id = `rg${uid++}`, c = cen(T.box), r = Math.max(T.box.w, T.box.h) * 0.5 + 14;
      mkOv(`<div class="cx ring" id="${id}" style="left:${r2(c.x)}px;top:${r2(c.y)}px;width:${r2(T.box.w + 28)}px;height:${r2(T.box.h + 28)}px;border-color:${ROLE_VAR(role)}"></div>`);
      add({ k: "fromTo", t: r2(t), sel: `#${id}`, from: { opacity: 0.95, scale: 0.92 }, to: { opacity: 0, scale: 1.22 }, d: 0.6, ease: "power2.out", repeat: rep, repeatDelay: 0.05 });
      void r;
    };
    for (const b of timeline.beats[si]) {
      const t = b.t;
      const T = b.target ? TG(b.target) : null;
      const P = T?.type === "prop" ? T.prop : null;
      const inert = T && isInert(T);
      const eff = (kind) => (inert ? "pulse" : kind);
      switch (b.do) {
        case "show": {
          const s = sel(T), how = b.how ?? "pop";
          const F = { pop: [{ opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1 }, 0.45, "back.out(2)"], drop: [{ opacity: 0, y: -260 }, { opacity: 1, y: 0 }, 0.6, "bounce.out"], fade: [{ opacity: 0 }, { opacity: 1 }, 0.35, "power2.out"], "slide-left": [{ opacity: 0, x: -700 }, { opacity: 1, x: 0 }, 0.6, "power3.out"], "slide-right": [{ opacity: 0, x: 700 }, { opacity: 1, x: 0 }, 0.6, "power3.out"], "slide-up": [{ opacity: 0, y: 900 }, { opacity: 1, y: 0 }, 0.7, "power3.out"], "slide-down": [{ opacity: 0, y: -700 }, { opacity: 1, y: 0 }, 0.6, "power3.out"] }[how] ?? null;
          if (T.type === "setting") origins.push({ sel: s, origin: `${r2(cen(T.box).x)} ${r2(cen(T.box).y)}` });
          add({ k: "fromTo", t, sel: s, from: F[0], to: F[1], d: F[2], ease: F[3] });
          cue(t, how.startsWith("slide") ? "whoosh" : "pop");
          break;
        }
        case "hide": {
          const s = sel(T);
          add({ k: "fromTo", t, sel: s, from: { opacity: 1 }, to: { opacity: 0, ...(b.how === "pop" ? { scale: 0.3 } : b.how === "slide-down" ? { y: 500 } : {}) }, d: 0.3, ease: "power2.in" });
          break;
        }
        case "type": {
          const text = b.text ?? "";
          const n = [...text].length;
          const dur = clamp(n * 0.085, 0.8, 2.6);
          const base = P?.kind === "chat" ? `#${P.el} .typed .ch` : `#${P.el} .br-text .ch`;
          add({ k: "set", t: 0, sel: base, v: { opacity: 0 } });
          const dwell = 0.04;
          for (let i = 0; i < n; i++) {
            const ti = t + (i * dur) / n;
            add({ k: "set", t: r2(ti), sel: `${base}:nth-child(${i + 1})`, v: { opacity: 1, borderRightColor: accentHex } });
            if (i) add({ k: "set", t: r2(ti), sel: `${base}:nth-child(${i})`, v: { borderRightColor: "rgba(0,0,0,0)" } });
          }
          add({ k: "set", t: r2(t + dur + dwell), sel: `${base}:nth-child(${n})`, v: { borderRightColor: "rgba(0,0,0,0)" } });
          if (P?.kind === "browser") add({ k: "fromTo", t: r2(t + dur), sel: `#${P.el} .br-lock`, from: { opacity: 0, scale: 0.4 }, to: { opacity: 1, scale: 1 }, d: 0.25, ease: "back.out(3)" });
          if (P?.kind === "chat") add({ k: "set", t: r2(t + dur + 0.35), sel: base, v: { opacity: 0 } });
          for (let i = 0; i < Math.min(n, 8); i++) cue(t + (i * dur) / Math.min(n, 8), "keyboard");
          break;
        }
        case "message": {
          const i = (b.n ? b.n - 1 : state.msgNext.get(P.el) ?? 0);
          state.msgNext.set(P.el, i + 1);
          const bub = `#${P.el} .bub[data-i="${i}"]`;
          const tD = Math.max(sceneStart, t - 0.55);
          add({ k: "fromTo", t: r2(tD), sel: bub, from: { opacity: 0, scale: 0.6, y: 22 }, to: { opacity: 1, scale: 1, y: 0 }, d: 0.3, ease: "back.out(2)" });
          add({ k: "fromTo", t: r2(tD + 0.1), sel: `${bub} .dt`, from: { opacity: 0 }, to: { opacity: 1 }, d: 0.15 });
          add({ k: "fromTo", t: r2(tD + 0.1), sel: `${bub} .dt i`, from: { y: 0 }, to: { y: -9 }, d: 0.22, ease: "sine.inOut", repeat: 3, yoyo: true, stagger: 0.1 });
          add({ k: "to", t: r2(t), sel: `${bub} .dt`, v: { opacity: 0 }, d: 0.1 });
          add({ k: "fromTo", t: r2(t), sel: `${bub} .tx`, from: { opacity: 0 }, to: { opacity: 1 }, d: 0.18 });
          cue(t, "pop");
          break;
        }
        case "count": {
          const rows = P.items?.length ?? 4;
          const idx = b.item ? [b.item - 1] : Array.from({ length: rows }, (_, i) => i);
          idx.forEach((i, k) => {
            const sv = `#${P.el} .sx-t:nth-child(${i + 1}) .sx-v`;
            if (b.value !== undefined) origins.push({ sel: sv, data: { to: b.value } });
            add({ k: "roll", t: r2(t + k * 0.12), sel: sv, d: 1.5, ease: "power2.out" });
            add({ k: "fromTo", t: r2(t + k * 0.12), sel: `#${P.el} .sx-t:nth-child(${i + 1}) .sx-bar`, from: { scaleX: 0 }, to: { scaleX: 1 }, d: 1.2, ease: "power2.out" });
          });
          break;
        }
        case "draw": {
          const type = P.chartType ?? "line";
          if (type === "bars") add({ k: "fromTo", t, sel: `#${P.el} .cr-bar`, from: { scaleY: 0 }, to: { scaleY: 1 }, d: 0.55, ease: "back.out(1.6)", stagger: 0.09 });
          else if (type === "donut") add({ k: "fromTo", t, sel: `#${P.el} .cr-arc`, from: { opacity: 0 }, to: { opacity: 1 }, d: 0.25, stagger: 0.18 });
          else {
            add({ k: "fromTo", t, sel: `#${P.el} .cr-line`, from: { attr: { "stroke-dashoffset": 1.1 } }, to: { attr: { "stroke-dashoffset": 0 } }, d: 1.3, ease: "power2.inOut" });
            add({ k: "fromTo", t: r2(t + 0.8), sel: `#${P.el} .cr-area`, from: { opacity: 0 }, to: { opacity: 0.16 }, d: 0.6 });
            add({ k: "fromTo", t: r2(t + 1.2), sel: `#${P.el} .cr-dot`, from: { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, to: { opacity: 1, scale: 1 }, d: 0.35, ease: "back.out(3)" });
          }
          cue(t, "pop");
          break;
        }
        case "drop": {
          const i = b.n ? b.n - 1 : state.dropNext.get(P.el) ?? 0;
          state.dropNext.set(P.el, i + 1);
          add({ k: "fromTo", t, sel: `#${P.el} .toast[data-i="${i}"]`, from: { opacity: 0, y: -240 }, to: { opacity: 1, y: 0 }, d: 0.7, ease: "bounce.out" });
          cue(t, "pop");
          break;
        }
        case "click": {
          const cid = `cur${si}`;
          const cp = state.cursor.get(si) ?? { x: 760, y: 900 };
          const c = cen(T.box);
          const tx = c.x + T.box.w * 0.18, ty = c.y + T.box.h * 0.12;
          const t0 = Math.max(sceneStart, t - 0.7);
          add({ k: "fromTo", t: r2(t0), sel: `#${cid}`, from: { opacity: 0, x: cp.x, y: cp.y }, to: { opacity: 1, x: cp.x, y: cp.y }, d: 0.15 });
          add({ k: "fromTo", t: r2(t0 + 0.1), sel: `#${cid}`, from: { x: cp.x, y: cp.y }, to: { x: tx, y: ty }, d: Math.max(0.3, t - t0 - 0.12), ease: "power2.inOut" });
          add({ k: "fromTo", t: r2(t), sel: `#${cid} .cu`, from: { scale: 1 }, to: { scale: 0.78 }, d: 0.07, ease: "power2.in", repeat: 1, yoyo: true });
          add({ k: "fromTo", t: r2(t), sel: `#${cid} .rip`, from: { opacity: 0.7, scale: 0.2 }, to: { opacity: 0, scale: 1.7 }, d: 0.45, ease: "power2.out" });
          add({ k: "to", t: r2(t + 1.3), sel: `#${cid}`, v: { opacity: 0 }, d: 0.25 });
          state.cursor.set(si, { x: tx, y: ty });
          cue(t, "click");
          break;
        }
        case "scan": case "pick": {
          const n = P.rows?.length ?? 4, r0 = clamp(b.row - 1, 0, n - 1), vis = Math.min(6, Math.max(3, n)), H = 96;
          const off = clamp(r0 * H - H * Math.floor(vis / 2), 0, Math.max(0, (n - vis) * H));
          const prev = state.hl.get(P.el) ?? { y: 0, off: 0 };
          add({ k: "fromTo", t: r2(t - (b.do === "scan" ? 0.2 : 0.1)), sel: `#${P.el} .ls-rows`, from: { y: -prev.off }, to: { y: -off }, d: 0.5, ease: "power2.inOut" });
          add({ k: "fromTo", t: r2(t - 0.2), sel: `#${P.el} .ls-hl`, from: { opacity: 0, y: prev.y }, to: { opacity: 1, y: r0 * H - off }, d: b.do === "scan" ? 0.7 : 0.35, ease: b.do === "scan" ? `steps(${Math.max(2, r0)})` : "power3.out" });
          state.hl.set(P.el, { y: r0 * H - off, off });
          if (b.do === "pick") {
            add({ k: "set", t, sel: `#${P.el} .ls-row[data-i="${r0}"]`, v: { color: "var(--onaccent)" } });
            add({ k: "fromTo", t, sel: `#${P.el} .ls-row[data-i="${r0}"]`, from: { scale: 1 }, to: { scale: 1.04 }, d: 0.14, ease: "power2.out", repeat: 1, yoyo: true });
            cue(t, "click");
          }
          break;
        }
        case "send": {
          const A = TG(b.from), B = TG(b.to);
          const a = cen(A.box), z = cen(B.box);
          const dist = Math.hypot(z.x - a.x, z.y - a.y), bend = Math.min(180, dist * 0.28) * (uid % 2 ? 1 : -1);
          const nx = -(z.y - a.y) / (dist || 1), ny = (z.x - a.x) / (dist || 1);
          const c = [[a.x, a.y], [a.x + (z.x - a.x) * 0.33 + nx * bend, a.y + (z.y - a.y) * 0.33 + ny * bend], [a.x + (z.x - a.x) * 0.66 + nx * bend, a.y + (z.y - a.y) * 0.66 + ny * bend], [z.x, z.y]].map((q) => q.map(r2));
          const id = uid++, role = b.role ?? "accent", dur = clamp(dist / 520, 0.9, 2.2);
          const dd = `M${c[0]} C${c[1]} ${c[2]} ${c[3]}`;
          lines[si] += `<path id="lg${id}" d="${dd}" pathLength="1" fill="none" stroke="${ROLE_VAR(role)}" stroke-width="26" stroke-linecap="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1" opacity="0"/><path id="ln${id}" d="${dd}" pathLength="1" fill="none" stroke="${ROLE_VAR(role)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1" opacity="0"/>`;
          mkOv(`<div class="pk cx" id="pk${id}" style="left:0;top:0;opacity:0;--pk:${ROLE_VAR(role)}"><span class="pi">${icon(b.icon ?? "paper-plane-tilt", "fill")}</span>${b.text ? `<span class="pt">${esc(b.text)}</span>` : ""}</div>`);
          add({ k: "fromTo", t, sel: `#ln${id}`, from: { attr: { "stroke-dashoffset": 1.1 }, opacity: 1 }, to: { attr: { "stroke-dashoffset": 0 } }, d: dur, ease: "power1.inOut" });
          add({ k: "fromTo", t, sel: `#lg${id}`, from: { attr: { "stroke-dashoffset": 1.1 }, opacity: 0.3 }, to: { attr: { "stroke-dashoffset": 0 } }, d: dur, ease: "power1.inOut" });
          add({ k: "fromTo", t, sel: `#pk${id}`, from: { opacity: 0, scale: 0.2, x: c[0][0], y: c[0][1] }, to: { opacity: 1, scale: 1 }, d: 0.3, ease: "back.out(2.2)" });
          add({ k: "path", t: r2(t + 0.05), sel: `#pk${id}`, c, d: r2(dur - 0.05), ease: "power1.inOut" });
          add({ k: "to", t: r2(t + dur), sel: `#pk${id}`, v: { opacity: 0, scale: 0.2 }, d: 0.25, ease: "power2.in" });
          add({ k: "to", t: r2(t + dur + 1.2), sel: `#ln${id}, #lg${id}`, v: { opacity: 0 }, d: 0.5 });
          if (B.type !== "setting") add({ k: "fromTo", t: r2(t + dur - 0.05), sel: sel(B), from: { scale: 1 }, to: { scale: 1.06 }, d: 0.12, ease: "power2.out", repeat: 1, yoyo: true });
          cue(t, "whoosh");
          break;
        }
        case "light": {
          if (P?.kind === "rack") {
            const n = P.units ?? 5;
            for (let i = 0; i < n; i++) for (const L of ["l1", "l2"]) add({ k: "to", t: r2(t + i * 0.13 + (L === "l2" ? 0.05 : 0)), sel: `#${P.el} .rk-u:nth-child(${i + 1}) .${L}`, v: { backgroundColor: goodHex, boxShadow: `0 0 18px ${goodHex}` }, d: 0.12 });
            cue(t, "click");
          } else if (P?.kind === "router") add({ k: "fromTo", t, sel: `#${P.el} .led`, from: { scale: 1 }, to: { scale: 1.6 }, d: 0.15, repeat: 1, yoyo: true, stagger: 0.08 });
          else ring(T, t, "good");
          break;
        }
        case "mark": {
          const day = b.day;
          add({ k: "fromTo", t, sel: `#${P.el} .cl-d[data-d="${day}"] .mk`, from: { opacity: 0, scale: 0 }, to: { opacity: 1, scale: 1 }, d: 0.4, ease: "back.out(2.5)" });
          add({ k: "set", t: r2(t + 0.05), sel: `#${P.el} .cl-d[data-d="${day}"] span`, v: { color: "var(--onbad)" } });
          cue(t, "stamp");
          break;
        }
        case "punch": {
          const i = b.n ? b.n - 1 : state.punchNext.get(P.el) ?? 0;
          state.punchNext.set(P.el, i + 1);
          add({ k: "fromTo", t, sel: `#${P.el} .sc-s[data-i="${i}"] .ic`, from: { opacity: 0, scale: 2.4, rotation: -20 }, to: { opacity: 1, scale: 1, rotation: 0 }, d: 0.3, ease: "power4.in" });
          add({ k: "set", t: r2(t + 0.28), sel: `#${P.el} .sc-s[data-i="${i}"]`, v: { borderStyle: "solid", borderColor: accentHex } });
          add({ k: "fromTo", t: r2(t + 0.28), sel: `#${P.el} .sc-s[data-i="${i}"]`, from: { scale: 1 }, to: { scale: 1.12 }, d: 0.08, repeat: 1, yoyo: true });
          cue(t, "stamp");
          break;
        }
        case "fill": {
          const n = P.items?.length ?? 2;
          const idx = b.item ? [b.item - 1] : Array.from({ length: n }, (_, i) => i);
          idx.forEach((i, k) => {
            const row = `#${P.el} .pr-row:nth-child(${i + 1})`;
            const v = b.value ?? P.items?.[i]?.value ?? 100;
            add({ k: "fromTo", t: r2(t + k * 0.15), sel: `${row} .pr-f`, from: { scaleX: 0 }, to: { scaleX: v / 100 }, d: 1.2, ease: "power2.out" });
            origins.push({ sel: `${row} .pr-v`, data: { to: v, suf: "%", pre: "", dec: 0 } });
            add({ k: "roll", t: r2(t + k * 0.15), sel: `${row} .pr-v`, d: 1.2, ease: "power2.out" });
          });
          break;
        }
        case "toggle": {
          add({ k: "fromTo", t, sel: `#${P.el} .cd-ic .i1`, from: { opacity: 1, scale: 1 }, to: { opacity: P.icon2 ? 0 : 1, scale: P.icon2 ? 0.3 : 1.2 }, d: 0.15, ...(P.icon2 ? {} : { repeat: 1, yoyo: true }) });
          if (P.icon2) add({ k: "fromTo", t: r2(t + 0.02), sel: `#${P.el} .cd-ic .i2`, from: { opacity: 0, scale: 1.8 }, to: { opacity: 1, scale: 1 }, d: 0.22, ease: "back.out(3)" });
          add({ k: "fromTo", t, sel: `#${P.el}`, from: { scale: 1 }, to: { scale: 1.07 }, d: 0.12, repeat: 1, yoyo: true });
          cue(t, "click");
          break;
        }
        case "lever": {
          add({ k: "fromTo", t, sel: `#${P.el} .rk-lv .arm`, from: { rotation: 0 }, to: { rotation: 70 }, d: 0.35, ease: "power2.inOut" });
          add({ k: "to", t: r2(t + 1.0), sel: `#${P.el} .rk-lv .arm`, v: { rotation: 0 }, d: 0.5, ease: "back.out(2)" });
          add({ k: "fromTo", t: r2(t + 0.3), sel: `#${P.el} .rk`, from: { x: 0 }, to: { x: -8 }, d: 0.06, repeat: 3, yoyo: true });
          cue(t + 0.3, "hit");
          break;
        }
        case "grow": {
          const e = eff("grow"); if (e === "pulse") { ring(T, t, "accent"); break; }
          const s = sel(T);
          if (T.type === "setting") origins.push({ sel: s, origin: `${r2(cen(T.box).x)} ${r2(cen(T.box).y)}` });
          add({ k: "fromTo", t, sel: s, from: { scale: 1 }, to: { scale: b.scale ?? 1.3 }, d: 0.3, ease: "power2.out" });
          add({ k: "to", t: r2(t + 0.3), sel: s, v: { scale: 1 }, d: 0.6, ease: "elastic.out(1,0.5)" });
          cue(t, "pop");
          break;
        }
        case "recolor": {
          const id = `tn${uid++}`, rr = Math.round(40 * d.shape.r);
          mkOv(`<div class="tint" id="${id}" style="left:${r2(T.box.x)}px;top:${r2(T.box.y)}px;width:${r2(T.box.w)}px;height:${r2(T.box.h)}px;border-radius:${rr}px;background:${ROLE_VAR(b.role)}"></div>`);
          add({ k: "fromTo", t, sel: `#${id}`, from: { opacity: 0 }, to: { opacity: 0.55 }, d: 0.2, ease: "power2.out" });
          add({ k: "to", t: r2(t + 1.4), sel: `#${id}`, v: { opacity: 0.22 }, d: 0.6 });
          cue(t, "pop");
          break;
        }
        case "shake": {
          const e = eff("shake"); if (e === "pulse") { ring(T, t, "bad"); cue(t, "hit"); break; }
          const s = sel(T), k = fxScale(T);
          if (T.type === "setting") origins.push({ sel: s, origin: `${r2(cen(T.box).x)} ${r2(cen(T.box).y)}` });
          add({ k: "fromTo", t, sel: s, from: { x: 0 }, to: { x: 14 * k }, d: 0.05, ease: "power1.inOut", repeat: 5, yoyo: true });
          cue(t, "hit");
          break;
        }
        case "bounce": {
          const e = eff("bounce"); if (e === "pulse") { ring(T, t, "accent"); break; }
          const s = sel(T), k = fxScale(T);
          if (T.type === "setting") origins.push({ sel: s, origin: `${r2(cen(T.box).x)} ${r2(cen(T.box).y)}` });
          add({ k: "fromTo", t, sel: s, from: { y: 0 }, to: { y: -34 * k }, d: 0.16, ease: "power2.out", repeat: 1, yoyo: true });
          break;
        }
        case "pulse": ring(T, t, b.role ?? "accent"); cue(t, "pop"); break;
        case "emote": {
          const id = `em${uid++}`, c = T.cast;
          const ex = clamp(c.x + 60 * c.scale * c.flip, 90, 870), ey = Math.max(130, T.box.y - 30);
          mkOv(`<div class="emote cx" id="${id}" style="left:${r2(ex)}px;top:${r2(ey)}px;opacity:0"><span class="ic">${icon(b.icon, "fill")}</span></div>`);
          add({ k: "fromTo", t, sel: `#${id}`, from: { opacity: 0, scale: 0.2, y: 20 }, to: { opacity: 1, scale: 1, y: 0 }, d: 0.45, ease: "back.out(2.4)" });
          add({ k: "fromTo", t: r2(t + 0.5), sel: `#${id}`, from: { rotation: -8 }, to: { rotation: 8 }, d: 0.3, ease: "sine.inOut", repeat: 3, yoyo: true });
          add({ k: "to", t: r2(t + 2.1), sel: `#${id}`, v: { opacity: 0, scale: 0.3 }, d: 0.25, ease: "power2.in" });
          cue(t, "pop");
          break;
        }
        case "chip": {
          const id = `ch${uid++}`, c = cen(T.box), side = b.side ?? "top";
          let cx = c.x, cy = T.box.y - 36;
          if (side === "bottom") cy = T.box.y + T.box.h + 36; else if (side === "left") { cx = T.box.x - 10; cy = c.y; } else if (side === "right") { cx = T.box.x + T.box.w + 10; cy = c.y; }
          cx = clamp(cx, 150, 810); cy = clamp(cy, 150, 980);
          mkOv(`<div class="chip cx" id="${id}" style="left:${r2(cx)}px;top:${r2(cy)}px;opacity:0;--chip:${ROLE_VAR(b.role ?? "accent")};--chipi:${["warn", "good"].includes(b.role) ? "#111" : "var(--onaccent)"}">${esc(b.text)}</div>`);
          add({ k: "fromTo", t, sel: `#${id}`, from: { opacity: 0, scale: 0.3 }, to: { opacity: 1, scale: 1 }, d: 0.4, ease: "back.out(2.4)" });
          add({ k: "to", t: r2(Math.min(sceneEnd - 0.4, t + 2.6)), sel: `#${id}`, v: { opacity: 0, scale: 0.6 }, d: 0.25, ease: "power2.in" });
          cue(t, "pop");
          break;
        }
        case "hero": {
          const id = `hr${uid++}`, len = [...b.text].length;
          const fs = len <= 5 ? 170 : len <= 10 ? 120 : 84;
          mkOv(`<div class="hero cx" id="${id}" style="left:480px;top:560px;font-size:${fs}px;color:${ROLE_VAR(b.role ?? "accent")};opacity:0">${esc(b.text)}</div>`);
          add({ k: "fromTo", t, sel: `#${id}`, from: { opacity: 0, scale: 2.6, rotation: -14 }, to: { opacity: 1, scale: 1, rotation: -5 }, d: 0.28, ease: "power4.in" });
          add({ k: "fromTo", t: r2(t + 0.3), sel: `#${id}`, from: { y: 0 }, to: { y: 8 }, d: 0.05, repeat: 3, yoyo: true });
          add({ k: "to", t: r2(Math.min(sceneEnd - 0.3, t + 1.9)), sel: `#${id}`, v: { opacity: 0, scale: 1.15 }, d: 0.3, ease: "power2.in" });
          cue(t, "stamp");
          break;
        }
        case "burst": {
          const c = cen(T.box), r = rng(uid++), roles = [b.role ?? "good", "accent", "warn", "accent2", "accent3"];
          const N = 16;
          for (let i = 0; i < N; i++) {
            const id = `bs${uid++}`, ang = r() * Math.PI * 2, dist = 150 + r() * 230, sz = 18 + r() * 20, rot = (r() - 0.5) * 900, round = r() > 0.5;
            mkOv(`<i class="bp cx" id="${id}" style="left:${r2(c.x)}px;top:${r2(c.y)}px;width:${r2(sz)}px;height:${r2(sz * (round ? 1 : 0.5))}px;border-radius:${round ? "50%" : "4px"};background:${ROLE_VAR(roles[i % roles.length])};opacity:0"></i>`);
            add({ k: "fromTo", t, sel: `#${id}`, from: { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 }, to: { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 0.8 - 90, rotation: rot, scale: 0.8 }, d: 0.8, ease: "power3.out" });
            add({ k: "to", t: r2(t + 0.8), sel: `#${id}`, v: { y: `+=${r2(220)}`, opacity: 0 }, d: 0.7, ease: "power1.in" });
          }
          cue(t, "pop");
          break;
        }
        case "act": {
          const st = castStates.get(`c${si}_${b.who}`);
          if (!st) break;
          let tgt = null;
          if (b.to) { const TT = TG(b.to); if (TT) tgt = cen(TT.box); else if (CAST_AT[b.to] !== undefined) tgt = { x: CAST_AT[b.to], y: st.ch.hipY }; }
          if (tgt && (b.clip === "walk" || b.clip === "run")) {
            const TT = TG(b.to);
            if (TT && TT.type !== "cast") tgt = { x: clamp(cen(TT.box).x - (cen(TT.box).x > st.x ? 1 : -1) * (TT.box.w / 2 + 70 * st.ch.scale), 90, 870), y: st.ch.hipY };
          }
          const o = { target: tgt, dur: Math.max(1.2, Math.min(2.4, b.tEnd - b.t + 1.1)), dir: b.dir };
          add(clipOps(st, b.clip, t, o));
          if (b.clip === "run" || b.clip === "walk") cue(t, "whoosh");
          if (b.clip === "celebrate" || b.clip === "react") cue(t, "pop");
          break;
        }
        case "camera": {
          camBeats.push({ t, move: b.move, si, target: T ? T.box : null, zoom: b.zoom });
          break;
        }
        default: break;
      }
    }
  });

  // cursor DOM per scene is added in the world HTML; sfx cleanup
  sfx.sort((a, b) => a.at - b.at);
  const dedup = [];
  for (const c of sfx) { const last = dedup.findLast?.((x) => x.kind === c.kind); if (!last || c.at - last.at >= 0.09) dedup.push(c); }
  return { ops, sfx: dedup, camBeats, ov, lines, origins };
}
export { STAGE };
