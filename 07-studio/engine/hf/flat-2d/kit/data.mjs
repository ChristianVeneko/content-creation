// Data replicas: stats panel with rolling counters, self-drawing chart, calendar, loyalty/stamp card, progress bars.
export const stats = {
  about: "Stats panel: tiles with a label and a big number that rolls up (beat count)",
  base: { w: 800, h: 520 },
  fields: ["title", "items"],
  css: `.sx{position:absolute;inset:0;padding:26px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-content:center}.sx-t{border-radius:calc(26px*var(--rk));background:var(--surface2);padding:22px 26px;position:relative;overflow:hidden}
.sx-l{font-size:36px;font-weight:800;color:var(--muted);line-height:1.1}.sx-v{font-size:92px;font-weight:900;line-height:1.05;margin-top:8px;font-variant-numeric:tabular-nums;white-space:nowrap}.sx-bar{position:absolute;left:0;bottom:0;height:10px;width:100%;background:var(--accent)}
.sx-t.good .sx-bar{background:var(--good)}.sx-t.bad .sx-bar{background:var(--bad)}.sx-t.warn .sx-bar{background:var(--warn)}.sx-t.good .sx-v{color:var(--good)}.sx-t.bad .sx-v{color:var(--bad)}`,
  build(ctx, p) {
    const items = (p.items ?? []).slice(0, 4);
    return `<div class="k-card"><div class="sx">${items.map((it, i) => `<div class="sx-t ${["good", "bad", "warn"].includes(it.role) ? it.role : ""}" data-i="${i}"><div class="sx-l">${ctx.esc(it.label ?? "")}</div><div class="sx-v" data-to="${it.value ?? 0}" data-pre="${ctx.esc(it.prefix ?? "")}" data-suf="${ctx.esc(it.suffix ?? "")}" data-dec="${Number.isInteger(it.value ?? 0) ? 0 : 1}">${ctx.esc(it.prefix ?? "")}0${ctx.esc(it.suffix ?? "")}</div><div class="sx-bar"></div></div>`).join("")}</div></div>`;
  },
  heightFor: (p) => ((p.items?.length ?? 2) > 2 ? 520 : 300),
};

export const chart = {
  about: "Chart that draws itself: line, bars or donut (beat draw)",
  base: { w: 820, h: 520 },
  fields: ["title", "chartType", "data", "labels"],
  css: `.cr-t{position:absolute;left:34px;top:22px;font-size:44px;font-weight:900}.cr svg{position:absolute;left:30px;top:90px;width:760px;height:400px;overflow:visible}`,
  build(ctx, p) {
    const type = p.chartType ?? "line";
    const data = (p.data?.length ? p.data : [20, 35, 30, 55, 48, 80]).slice(0, 8);
    const max = Math.max(...data, 1), W = 760, H = 380;
    let svg = "";
    const grid = [0, 1, 2, 3].map((i) => `<line x1="0" x2="${W}" y1="${20 + i * 110}" y2="${20 + i * 110}" stroke="var(--surface2)" stroke-width="4"/>`).join("");
    if (type === "bars") {
      const bw = W / data.length;
      svg = grid + data.map((v, i) => `<rect class="cr-bar" x="${i * bw + bw * 0.16}" y="${350 - (v / max) * 320}" width="${bw * 0.68}" height="${(v / max) * 320}" rx="${12 * 1}" fill="${i === data.length - 1 ? "var(--good)" : "var(--accent)"}" style="transform-box:fill-box;transform-origin:50% 100%"/>`).join("");
    } else if (type === "donut") {
      const tot = data.reduce((a, b) => a + b, 0) || 1;
      const cols = ["var(--accent)", "var(--accent2)", "var(--accent3)", "var(--good)", "var(--warn)", "var(--bad)", "var(--muted)", "var(--ink)"];
      let acc = 0;
      const R = 130, C = 2 * Math.PI * R;
      svg = `<g transform="translate(${W / 2} 190) rotate(-90)"><circle r="${R}" fill="none" stroke="var(--surface2)" stroke-width="64"/>` + data.map((v, i) => { const len = (v / tot) * C; const el = `<circle class="cr-arc" r="${R}" fill="none" stroke="${cols[i % 8]}" stroke-width="64" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}" data-len="${len.toFixed(1)}" data-c="${C.toFixed(1)}"/>`; acc += len; return el; }).join("") + `</g>`;
    } else {
      const pts = data.map((v, i) => [i * (W / (data.length - 1 || 1)), 350 - (v / max) * 320]);
      const dpath = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ");
      svg = grid + `<path class="cr-area" d="${dpath} L${W},370 L0,370 Z" fill="var(--accent)" opacity="0"/><path class="cr-line" d="${dpath}" pathLength="1" fill="none" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/>` +
        `<circle class="cr-dot" cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="20" fill="var(--good)" opacity="0"/>`;
    }
    return `<div class="k-card cr"><div class="cr-t">${ctx.esc(p.title ?? "")}</div><svg viewBox="0 0 ${W} ${H}">${svg}</svg></div>`;
  },
};

export const calendar = {
  about: "Month calendar; beat mark circles a day",
  base: { w: 780, h: 700 },
  fields: ["title", "days"],
  css: `.cl-h{position:absolute;left:0;top:0;width:100%;height:110px;background:var(--accent);color:var(--onaccent);font-size:50px;font-weight:900;display:flex;align-items:center;padding:0 36px;gap:18px}.cl-h .ic{width:54px;height:54px}
.cl-g{position:absolute;left:20px;right:20px;top:128px;bottom:20px;display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(5,1fr)}.cl-d{position:relative;font-size:38px;font-weight:800;display:flex;align-items:center;justify-content:center}
.cl-d .mk{position:absolute;width:74px;height:74px;border-radius:50%;background:var(--bad);opacity:0;z-index:0}.cl-d span{position:relative;z-index:1}.cl-d.on span{color:var(--onbad)}`,
  build(ctx, p) {
    const n = 35, first = 2;
    const cells = Array.from({ length: n }, (_, i) => { const day = i - first + 1; return day >= 1 && day <= 31 ? `<div class="cl-d" data-d="${day}"><i class="mk"></i><span>${day}</span></div>` : `<div class="cl-d"></div>`; }).join("");
    return `<div class="k-card"><div class="cl-h"><span class="ic">${ctx.icon("calendar-blank")}</span>${ctx.esc(p.title ?? "Calendario")}</div><div class="cl-g">${cells}</div></div>`;
  },
};

export const stampCard = {
  about: "Loyalty / stamp card with empty slots; beat punch stamps the next slot",
  base: { w: 760, h: 460 },
  fields: ["title", "slots", "icon"],
  css: `.sc-t{position:absolute;left:36px;top:26px;font-size:50px;font-weight:900}.sc-g{position:absolute;left:30px;right:30px;top:120px;bottom:30px;display:grid;grid-template-columns:repeat(5,1fr);gap:18px;align-content:center}
.sc-s{position:relative;aspect-ratio:1;border-radius:50%;border:6px dashed var(--muted);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:var(--muted)}.sc-s .ic{position:absolute;inset:14px;color:var(--accent);opacity:0}.sc-s.free{border-color:var(--good);color:var(--good)}`,
  build(ctx, p) {
    const slots = Math.min(10, Math.max(3, p.slots ?? 10));
    return `<div class="k-card"><div class="sc-t">${ctx.esc(p.title ?? "Tarjeta")}</div><div class="sc-g">${Array.from({ length: slots }, (_, i) => `<div class="sc-s${i === slots - 1 ? " free" : ""}" data-i="${i}">${i === slots - 1 ? "GRATIS" : i + 1}<span class="ic">${ctx.icon(p.icon ?? "star", "fill")}</span></div>`).join("")}</div></div>`;
  },
};

export const progress = {
  about: "Progress bars with labels and percentages (beat fill)",
  base: { w: 800, h: 520 },
  fields: ["title", "items"],
  css: `.pg-wrap{position:absolute;inset:0;padding:28px 36px;display:flex;flex-direction:column;justify-content:center;gap:26px}.pr-row{position:relative;height:118px}.pr-l{font-size:42px;font-weight:900;line-height:1}.pr-v{position:absolute;right:0;top:0;font-size:42px;font-weight:900;font-variant-numeric:tabular-nums}
.pr-tr{position:absolute;left:0;right:0;bottom:0;height:46px;border-radius:23px;background:var(--surface2);overflow:hidden}.pr-f{position:absolute;left:0;top:0;height:100%;width:100%;border-radius:23px;background:var(--accent);transform-origin:0 0;transform:scaleX(0)}.pr-row.good .pr-f{background:var(--good)}.pr-row.bad .pr-f{background:var(--bad)}.pr-row.warn .pr-f{background:var(--warn)}`,
  build(ctx, p) {
    const items = (p.items ?? []).slice(0, 4);
    return `<div class="k-card"><div class="pg-wrap">${items.map((it, i) => `<div class="pr-row ${["good", "bad", "warn"].includes(it.role) ? it.role : ""}" data-i="${i}" data-to="${it.value ?? 100}"><div class="pr-l">${ctx.esc(it.label ?? "")}</div><div class="pr-v">0%</div><div class="pr-tr"><div class="pr-f"></div></div></div>`).join("")}</div></div>`;
  },
  heightFor: (p) => Math.max(240, (p.items?.length ?? 2) * 144 + 40),
};
