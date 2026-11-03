// Base CSS (style variables, world, captions, overlays) and the deterministic background decoration per style.
import { FONTS } from "./styles.mjs";
import { KIT_CSS } from "./kit/index.mjs";
import { mulberry32, lum, mix, alpha, r2 } from "./util.mjs";

const SHADOWS = {
  none: "none", drop: "0 10px 0 rgba(0,0,0,.28)", soft: "0 18px 34px rgba(31,37,64,.16)", hard: "8px 8px 0 var(--ink)", layer: "0 4px 0 rgba(60,40,10,.14), 0 10px 0 rgba(60,40,10,.08)",
  extrude: "5px 7px 0 var(--shade), 10px 14px 0 rgba(0,0,0,.10)", misreg: "4px 4px 0 var(--accent2)", clay: "0 12px 0 var(--shade)",
};

export const fontFamily = (key) => `F-${key}`;
export function usedFonts(style) { return [...new Set(Object.values(style.fonts).map((f) => f[0]))]; }

export function fontFaces(style, rel) {
  return usedFonts(style).map((k) => `@font-face{font-family:"${fontFamily(k)}";src:url("${rel}/${FONTS[k].file}");font-weight:${FONTS[k].weight};font-style:normal}`).join("\n");
}

export function buildCss(style, fontRel) {
  const c = style.c, sh = style.shape;
  const onAccent = lum(c.accent) > 0.6 ? "#151515" : "#ffffff";
  const onBad = lum(c.bad) > 0.6 ? "#151515" : "#ffffff";
  const capSize = style.cap.size ?? 66;
  const vars = Object.entries({
    bg: c.bg, bg2: c.bg2, wall: c.wall, floor: c.floor, surface: c.surface, surface2: c.surface2, ink: c.ink, "ink-bg": c.inkBg, muted: c.muted, accent: c.accent, accent2: c.accent2, accent3: c.accent3,
    good: c.good, bad: c.bad, warn: c.warn, glow: c.glow, shade: c.shade, onaccent: onAccent, onbad: onBad, ledoff: mix(c.muted, c.bg, 0.5), wallx: lum(c.surface) < 0.4 && c.surface.startsWith("#") ? mix(c.surface, "#000", 0.3) : mix(c.wall.startsWith("#") ? c.wall : c.bg2, "#ffffff", 0.05),
    rk: sh.r, bw: `${sh.stroke}px`, bc: sh.stroke ? c[sh.strokeRole] ?? c.ink : "transparent", shd: SHADOWS[sh.shadow],
    fu: `"${fontFamily(style.fonts.ui[0])}",Inter,sans-serif`, fd: `"${fontFamily(style.fonts.display[0])}",Inter,sans-serif`, fc: `"${fontFamily(style.fonts.cap[0])}",Inter,sans-serif`,
    fw: style.fonts.ui[1], fdw: style.fonts.display[1], fcw: style.fonts.cap[1],
  }).map(([k, v]) => `--${k}:${v}`).join(";");
  const dark = style.dark;
  const lineCol = dark ? "rgba(255,255,255,.055)" : "rgba(20,30,60,.07)";
  const tex = {
    grid: `background-image:linear-gradient(${lineCol} 2px,transparent 2px),linear-gradient(90deg,${lineCol} 2px,transparent 2px);background-size:140px 140px`,
    dots: `background-image:radial-gradient(circle,${dark ? "rgba(255,255,255,.12)" : "rgba(20,30,60,.12)"} 4px,transparent 4.5px);background-size:84px 84px`,
    blueprint: `background-image:linear-gradient(rgba(230,240,255,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(230,240,255,.10) 1px,transparent 1px),linear-gradient(rgba(230,240,255,.22) 2px,transparent 2px),linear-gradient(90deg,rgba(230,240,255,.22) 2px,transparent 2px);background-size:40px 40px,40px 40px,200px 200px,200px 200px`,
    halftone: `background-image:radial-gradient(circle,rgba(255,79,109,.20) 5px,transparent 5.5px),radial-gradient(circle,rgba(47,91,234,.16) 5px,transparent 5.5px);background-size:26px 26px,26px 26px;background-position:0 0,13px 13px`,
    paper: `background-image:url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.16  0 0 0 0.16 0"/></filter><rect width="300" height="300" filter="url(#n)"/></svg>')}")`,
    iso: `background-image:repeating-linear-gradient(30deg,rgba(63,91,216,.10) 0 2px,transparent 2px 90px),repeating-linear-gradient(150deg,rgba(63,91,216,.10) 0 2px,transparent 2px 90px)`,
    memphis: "", poly: "", blobs: "", none: "",
  }[sh.tex] ?? "";
  const base = `
${fontFaces(style, fontRel)}
:root{${vars}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--bg);font-family:var(--fu);font-weight:var(--fw)}
#root{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden;background:var(--bg);color:var(--ink-bg)}
#bgFar,#bgMid,#world{position:absolute;left:0;top:0;width:0;height:0}
#world{transform-origin:0 0}
#bgGrad{position:absolute;left:0;top:0;width:1080px;height:1920px;background:${style.id === "flat-glass-ui" ? `linear-gradient(160deg,${c.bg} 0%,${c.bg2} 55%,#0B6FA8 100%)` : style.id === "flat-low-poly" ? `linear-gradient(180deg,${c.bg} 0%,${c.bg2} 60%,#C0507A 100%)` : style.id === "flat-soft-gradient" ? `linear-gradient(180deg,${c.bg} 0%,${c.bg2} 100%)` : style.id === "flat-clay-2d" ? `linear-gradient(180deg,${c.bg} 0%,${c.bg2} 100%)` : "var(--bg)"}}
#bgMid .tex{position:absolute;left:-5000px;top:-5000px;width:10000px;height:10000px;${tex}}
.deco{position:absolute}
.glow{position:absolute;left:-300px;top:360px;width:1680px;height:1300px;border-radius:50%;opacity:0}
.scene{position:absolute;width:1080px;height:1920px}
.panel{position:absolute;overflow:hidden;background:var(--wall);${sh.stroke ? "border:var(--bw) solid var(--bc);" : ""}box-shadow:var(--shd)}
.shift{position:absolute}
.ly{position:absolute;pointer-events:none}.ly svg{display:block;overflow:visible}
.fu{font-family:var(--fu);font-weight:var(--fw)}.fd{font-family:var(--fd);font-weight:var(--fdw)}
.play{position:absolute;left:0;top:0;width:960px;height:1040px}
.prop{position:absolute}.pscale{position:absolute;left:0;top:0;transform-origin:0 0}
.csvg{position:absolute;overflow:visible;transform-origin:0 0}
.lines{position:absolute;left:-330px;top:-520px;overflow:visible}
.ov{position:absolute;left:0;top:0;width:960px;height:1040px}
.cx{position:absolute}
.lab{position:absolute;left:28px;top:22px;height:78px;padding:0 30px;border-radius:calc(39px*var(--rk));background:var(--accent);color:var(--onaccent);font-family:var(--fd);font-weight:var(--fdw);font-size:46px;line-height:78px;letter-spacing:.03em;box-shadow:var(--shd);border:var(--bw) solid var(--bc);opacity:1;white-space:nowrap}
.ring{border:8px solid var(--accent);border-radius:calc(44px*var(--rk) + 12px);opacity:0}
.tint{position:absolute;opacity:0}
.chip{padding:8px 26px;border-radius:calc(30px*var(--rk) + 8px);background:var(--chip);color:var(--chipi);font-family:var(--fd);font-weight:var(--fdw);font-size:44px;line-height:1.15;white-space:nowrap;box-shadow:var(--shd);border:var(--bw) solid var(--bc)}
.hero{font-family:var(--fd);font-weight:var(--fdw);text-transform:uppercase;white-space:nowrap;text-align:center;-webkit-text-stroke:0;text-shadow:0 8px 0 rgba(0,0,0,.35),0 0 24px rgba(0,0,0,.35);letter-spacing:.02em}
.emote{width:110px;height:110px;border-radius:50%;background:var(--surface);color:var(--accent);padding:24px;box-shadow:var(--shd);border:var(--bw) solid var(--bc)}
.pk{display:flex;align-items:center;gap:14px;height:84px;padding:0 26px 0 14px;border-radius:42px;background:var(--pk);color:var(--onaccent);font-size:40px;font-weight:900;font-family:var(--fd);box-shadow:var(--shd);border:var(--bw) solid var(--bc);white-space:nowrap}
.pk .pi{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.28);padding:10px;flex:none}.pk .pi svg{display:block;width:100%;height:100%}
.bp{position:absolute}
.cursor{position:absolute;left:0;top:0;width:90px;height:90px;opacity:0}.cursor .cu{position:absolute;left:-8px;top:-4px;width:84px;height:84px;color:var(--ink-bg);filter:drop-shadow(0 4px 0 rgba(0,0,0,.35))}.cursor .rip{position:absolute;left:-30px;top:-30px;width:70px;height:70px;border-radius:50%;border:6px solid var(--accent);opacity:0}
#paths{position:absolute;overflow:visible}
#wipe{position:absolute;left:0;top:0;width:1080px;height:1920px;background:var(--accent);opacity:0;pointer-events:none;z-index:40}
#iris{position:absolute;left:0;top:0;width:1080px;height:1920px;background:var(--accent2);clip-path:circle(0% at 50% 52%);pointer-events:none;z-index:41}
.cap{position:absolute;left:60px;top:240px;width:960px;display:flex;flex-wrap:wrap;justify-content:center;align-content:flex-start;gap:4px 16px;opacity:0;z-index:50}
.cw{font-family:var(--fc);font-weight:var(--fcw);font-size:${capSize}px;text-transform:uppercase;color:${style.cap.ink};line-height:1.12;letter-spacing:-.01em;text-shadow:0 5px 0 ${alpha(style.cap.halo, 0.9)},0 0 3px ${style.cap.halo},0 0 16px ${alpha(style.cap.halo, 0.65)};opacity:0}
.cw.kw{background:${style.cap.kwBg};color:${style.cap.kwInk};text-shadow:none;padding:0 20px;border-radius:calc(20px*var(--rk) + 6px);box-shadow:0 6px 0 rgba(0,0,0,.30)}
`;
  return base + KIT_CSS + (style.id === "flat-glass-ui" ? "\n.k-card,.panel,.lab,.chip,.pk,.emote{backdrop-filter:none}\n" : "");
}

/** Deterministic decoration for the far and mid layers (world coordinates, parallax applied by the runtime). */
export function decoration(style) {
  const r = mulberry32(2026);
  const c = style.c, kind = style.shape.deco;
  const roles = ["accent", "accent2", "accent3", "warn", "good"];
  const pick = (i) => `var(--${roles[i % roles.length]})`;
  let far = "", mid = "";
  const N = 70;
  const at = (i, spread = 2600) => [r2((r() - 0.5) * 2 * spread * 1.3), r2((r() - 0.5) * 2 * spread * 1.1)];
  if (kind === "memphis") {
    for (let i = 0; i < N; i++) {
      const [x, y] = at(i), s = 26 + r() * 46, sh = i % 5;
      const col = pick(i);
      if (sh === 0) far += `<div class="deco" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:${col};opacity:.85"></div>`;
      else if (sh === 1) far += `<div class="deco" style="left:${x}px;top:${y}px;width:0;height:0;border-left:${s / 2}px solid transparent;border-right:${s / 2}px solid transparent;border-bottom:${s}px solid ${col};transform:rotate(${Math.round(r() * 360)}deg)"></div>`;
      else if (sh === 2) far += `<svg class="deco" style="left:${x}px;top:${y}px;transform:rotate(${Math.round(r() * 90)}deg)" width="${s * 2.4}" height="${s}" viewBox="0 0 120 40"><path d="M4 30 Q20 0 36 20 T68 20 T100 20 T116 10" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round"/></svg>`;
      else if (sh === 3) far += `<div class="deco" style="left:${x}px;top:${y}px;width:${s * 0.4}px;height:${s}px;background:${col};border-radius:4px;transform:rotate(${Math.round(r() * 180)}deg)"></div>`;
      else mid += `<div class="deco" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;border:8px solid ${col};border-radius:50%"></div>`;
    }
  } else if (kind === "poly") {
    const cols = [c.accent, c.accent2, c.bg2, c.accent3, "#7B5CC4", "#C0507A"];
    for (let i = 0; i < 60; i++) {
      const [x, y] = at(i), s = 160 + r() * 360;
      far += `<div class="deco" style="left:${x}px;top:${y}px;width:${r2(s)}px;height:${r2(s * 0.9)}px;background:${cols[i % cols.length]};opacity:${r2(0.10 + r() * 0.18)};clip-path:polygon(${r() > 0.5 ? "0 100%,50% 0,100% 100%" : "0 0,100% 20%,40% 100%"})"></div>`;
    }
  } else if (kind === "cubes") {
    for (let i = 0; i < 50; i++) {
      const [x, y] = at(i), s = 60 + r() * 90;
      far += `<div class="deco" style="left:${x}px;top:${y}px;width:${r2(s)}px;height:${r2(s)}px;background:${i % 3 === 0 ? c.accent2 : i % 3 === 1 ? c.accent : c.accent3};opacity:.22;transform:rotate(45deg) scaleY(.58);border-radius:8px;box-shadow:${r2(s * 0.18)}px ${r2(s * 0.3)}px 0 rgba(27,42,73,.25)"></div>`;
    }
  } else if (kind === "blobs") {
    for (let i = 0; i < 24; i++) {
      const [x, y] = at(i, 2200), s = 500 + r() * 900;
      far += `<div class="deco" style="left:${x}px;top:${y}px;width:${r2(s)}px;height:${r2(s)}px;border-radius:50%;background:radial-gradient(closest-side,${pick(i)},transparent);opacity:.14"></div>`;
    }
  } else if (kind === "sticker") {
    for (let i = 0; i < 50; i++) {
      const [x, y] = at(i), s = 40 + r() * 60;
      far += `<div class="deco" style="left:${x}px;top:${y}px;width:${r2(s)}px;height:${r2(s)}px;border-radius:50%;background:#fff;opacity:.35"></div>`;
    }
  } else if (kind === "dots") {
    for (let i = 0; i < 60; i++) { const [x, y] = at(i); far += `<div class="deco" style="left:${x}px;top:${y}px;width:14px;height:14px;border-radius:50%;background:${style.dark ? "rgba(255,255,255,.16)" : "rgba(20,30,60,.14)"}"></div>`; }
    for (let i = 0; i < 3; i++) far += `<div class="deco" style="left:${[-700, 700, 600][i] + 0}px;top:${[-900, -1300, 300][i]}px;width:1400px;height:1400px;border-radius:50%;background:radial-gradient(closest-side,${alpha(c[["accent", "accent2", "warn"][i]], 0.14)},transparent)"></div>`;
  }
  return { far, mid };
}
void lum;
