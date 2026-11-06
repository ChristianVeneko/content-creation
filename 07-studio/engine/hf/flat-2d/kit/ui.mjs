// App replicas (HTML, authored at size "l"): browser with typed URL, chat, notifications, phone, list/table, card.
// Each kit: { about, base: {w,h}, fields, css, build(ctx, p) -> html }. ctx = { icon, esc }.
export const COMMON_CSS = `
.k-card{position:absolute;inset:0;background:var(--surface);color:var(--ink);border-radius:calc(36px*var(--rk));border:var(--bw) solid var(--bc);box-shadow:var(--shd);overflow:hidden;font-family:var(--fu);font-weight:var(--fw)}
.ic{display:inline-block;line-height:0}.ic svg{width:100%;height:100%;display:block}
.bub{position:relative;border-radius:calc(30px*var(--rk));padding:18px 26px;font-size:40px;line-height:1.15;font-weight:var(--fw);max-width:86%;opacity:0;border:var(--bw) solid var(--bc)}
.bub.in{background:var(--surface2);color:var(--ink);align-self:flex-start;border-bottom-left-radius:10px}
.bub.out{background:var(--accent);color:var(--onaccent);align-self:flex-end;border-bottom-right-radius:10px}
.bub .tx{opacity:1;display:block}.bub .dt{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;gap:12px;align-items:center;justify-content:center;opacity:0}
.bub .dt i{width:16px;height:16px;border-radius:50%;background:var(--muted);display:block}
`;

const SKEL = (cls = "", st = "") => `<i class="sk ${cls}" style="${st}"></i>`;
export const bubbles = (ctx, messages) => messages.map((m, i) => `<div class="bub ${m.from === "me" ? "out" : "in"}" data-i="${i}"><span class="tx">${ctx.esc(m.text)}</span><span class="dt"><i></i><i></i><i></i></span></div>`).join("");

const PAGES = {
  blank: () => "",
  landing: (ctx, p) => `<div class="pg-i pg-nav"><b></b><s></s><s></s></div><div class="pg-i pg-hero"><span class="sun"></span><em></em></div>${p.heading ? `<div class="pg-i pg-h">${ctx.esc(p.heading)}</div>` : `<div class="pg-i pg-l" style="width:70%"></div>`}<div class="pg-i pg-l" style="width:52%"></div><div class="pg-i pg-btn"></div>`,
  dashboard: (ctx) => `<div class="pg-i pg-tiles"><b></b><b></b><b></b></div><div class="pg-i pg-bars">${[60, 90, 45, 100, 75, 120, 95].map((h) => `<u style="height:${h}px"></u>`).join("")}</div>`,
  shop: (ctx) => `<div class="pg-i pg-grid">${["storefront", "bag", "package", "star"].map((n) => `<div class="pg-card"><span class="ic">${ctx.icon(n)}</span><i></i></div>`).join("")}</div>`,
  article: (ctx, p) => `${p.heading ? `<div class="pg-i pg-h">${ctx.esc(p.heading)}</div>` : `<div class="pg-i pg-l" style="width:80%;height:30px"></div>`}<div class="pg-i pg-hero small"><span class="sun"></span><em></em></div><div class="pg-i pg-l" style="width:94%"></div><div class="pg-i pg-l" style="width:88%"></div><div class="pg-i pg-l" style="width:60%"></div>`,
  login: (ctx, p) => `<div class="pg-i pg-av"><span class="ic">${ctx.icon("user", "fill")}</span></div><div class="pg-i pg-field"></div><div class="pg-i pg-field"></div><div class="pg-i pg-btn"></div>`,
  search: (ctx) => `<div class="pg-i pg-search"><span class="ic">${ctx.icon("magnifying-glass")}</span><i></i></div>${[0, 1, 2].map(() => `<div class="pg-i pg-res"><b></b><i></i><s></s></div>`).join("")}`,
};
export const PAGE_IDS = Object.keys(PAGES);

export const browser = {
  about: "Browser window: tab, URL bar that types letter by letter (beat type), page that draws itself (beat show/click)",
  base: { w: 860, h: 560 },
  fields: ["url", "title", "page", "heading"],
  css: `
.br-tabs{position:absolute;left:0;top:0;width:100%;height:58px;background:var(--surface2)}
.br-tab{position:absolute;left:16px;top:10px;height:48px;padding:0 22px;border-radius:16px 16px 0 0;background:var(--surface);font-size:30px;line-height:48px;font-weight:700;white-space:nowrap}
.br-url{position:absolute;left:0;top:58px;width:100%;height:92px;background:var(--surface)}
.br-field{position:absolute;left:16px;top:12px;right:16px;height:66px;border-radius:calc(34px*var(--rk));background:var(--surface2);border:var(--bw) solid var(--bc)}
.br-lock{position:absolute;left:18px;top:14px;width:38px;height:38px;color:var(--good);opacity:0}
.br-text{position:absolute;left:66px;top:0;height:66px;line-height:66px;font-size:40px;font-weight:800;white-space:nowrap;letter-spacing:-.01em}
.br-text .ch{opacity:1;border-right:4px solid transparent}
.br-load{position:absolute;left:0;top:148px;width:100%;height:7px;background:var(--accent);transform-origin:0 0;transform:scaleX(0);opacity:0}
.br-page{position:absolute;left:0;top:156px;right:0;bottom:0;padding:22px 26px;overflow:hidden;background:var(--surface)}
.pg-i{opacity:1}.pg-nav{display:flex;gap:16px;align-items:center;margin-bottom:20px}.pg-nav b{width:60px;height:34px;border-radius:12px;background:var(--accent)}.pg-nav s{width:90px;height:16px;border-radius:8px;background:var(--surface2)}
.pg-hero{position:relative;height:150px;border-radius:calc(24px*var(--rk));background:var(--accent2);overflow:hidden;margin-bottom:18px}.pg-hero.small{height:110px}
.pg-hero .sun{position:absolute;right:60px;top:26px;width:62px;height:62px;border-radius:50%;background:var(--warn)}.pg-hero em{position:absolute;left:-20px;bottom:-40px;width:340px;height:120px;border-radius:50%;background:var(--accent);opacity:.55}
.pg-h{font-size:48px;font-weight:900;margin:0 0 12px;line-height:1.1}.pg-l{height:20px;border-radius:10px;background:var(--surface2);margin-bottom:14px;border:0}
.pg-btn{width:200px;height:54px;border-radius:calc(27px*var(--rk));background:var(--accent);margin-top:12px}
.pg-tiles{display:flex;gap:16px;margin-bottom:18px}.pg-tiles b{flex:1;height:96px;border-radius:calc(20px*var(--rk));background:var(--surface2)}.pg-tiles b:first-child{background:var(--accent)}
.pg-bars{display:flex;gap:14px;align-items:flex-end;height:140px}.pg-bars u{flex:1;border-radius:10px 10px 0 0;background:var(--accent2);display:block}
.pg-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pg-card{height:120px;border-radius:calc(22px*var(--rk));background:var(--surface2);padding:16px;position:relative}.pg-card .ic{width:50px;height:50px;color:var(--accent)}.pg-card i{position:absolute;right:16px;bottom:16px;width:90px;height:18px;border-radius:9px;background:var(--good)}
.pg-av{width:90px;height:90px;border-radius:50%;background:var(--accent);color:var(--onaccent);margin:0 auto 18px;padding:20px}.pg-field{height:60px;border-radius:calc(30px*var(--rk));background:var(--surface2);margin-bottom:16px}
.pg-search{display:flex;gap:16px;align-items:center;height:72px;border-radius:calc(36px*var(--rk));background:var(--surface2);padding:0 22px;margin-bottom:20px}.pg-search .ic{width:40px;height:40px;color:var(--accent)}.pg-search i{flex:1;height:18px;border-radius:9px;background:var(--surface);display:block}
.pg-res{display:flex;gap:16px;align-items:center;height:80px}.pg-res b{width:64px;height:64px;border-radius:16px;background:var(--accent2)}.pg-res i{flex:1;height:22px;border-radius:11px;background:var(--surface2);display:block}.pg-res s{width:80px;height:22px;border-radius:11px;background:var(--good);display:block}`,
  build(ctx, p) {
    const url = p.url ?? "";
    const chars = [...url].map((c) => `<span class="ch">${ctx.esc(c)}</span>`).join("");
    const page = (PAGES[p.page ?? "landing"] ?? PAGES.blank)(ctx, p);
    return `<div class="k-card br"><div class="br-tabs"><div class="br-tab">${ctx.esc(p.title ?? "Nueva pestaña")}</div></div>
      <div class="br-url"><div class="br-field"><span class="br-lock ic">${ctx.icon("lock-simple", "fill")}</span><div class="br-text">${chars}</div></div></div>
      <div class="br-load"></div><div class="br-page">${page}</div></div>`;
  },
};

export const chat = {
  about: "Chat window: bubbles from them (left) and me (right), typing dots before each message (beat message)",
  base: { w: 720, h: 780 },
  fields: ["title", "messages", "icon"],
  css: `
.ct-hdr{position:absolute;left:0;top:0;width:100%;height:110px;background:var(--surface2);display:flex;align-items:center;gap:20px;padding:0 28px}
.ct-av{width:68px;height:68px;border-radius:50%;background:var(--accent);color:var(--onaccent);padding:14px}.ct-name{font-size:42px;font-weight:900}
.ct-body{position:absolute;left:0;top:110px;right:0;bottom:104px;padding:20px 24px;display:flex;flex-direction:column;gap:16px;overflow:hidden}
.ct-in{position:absolute;left:22px;right:22px;bottom:18px;height:70px;border-radius:calc(35px*var(--rk));background:var(--surface2);display:flex;align-items:center;padding:0 24px;font-size:36px;color:var(--muted);border:var(--bw) solid var(--bc)}
.ct-in .typed{flex:1;white-space:nowrap;overflow:hidden}.ct-in .ic{width:42px;height:42px;color:var(--accent)}`,
  build(ctx, p) {
    return `<div class="k-card ct"><div class="ct-hdr"><span class="ct-av ic">${ctx.icon(p.icon ?? "user", "fill")}</span><span class="ct-name">${ctx.esc(p.title ?? "Chat")}</span></div>
      <div class="ct-body">${bubbles(ctx, p.messages ?? [])}</div>
      <div class="ct-in"><span class="typed">${(p.typed ? [...p.typed].map((c) => `<span class="ch" style="opacity:0">${ctx.esc(c)}</span>`).join("") : "")}</span><span class="ic">${ctx.icon("paper-plane-tilt", "fill")}</span></div></div>`;
  },
};

export const notification = {
  about: "Stack of notification toasts that drop in one by one (beat drop)",
  base: { w: 800, h: 520 },
  fields: ["items"],
  css: `.nt{position:absolute;inset:0}.toast{position:absolute;left:0;width:100%;height:150px;border-radius:calc(34px*var(--rk));background:var(--surface);color:var(--ink);border:var(--bw) solid var(--bc);box-shadow:var(--shd);display:flex;align-items:center;gap:24px;padding:0 28px;opacity:0;font-family:var(--fu)}
.toast .ti{width:84px;height:84px;border-radius:50%;background:var(--accent);color:var(--onaccent);padding:18px;flex:none}.toast b{display:block;font-size:40px;font-weight:900;line-height:1.1}.toast span.tt{display:block;font-size:34px;color:var(--muted);line-height:1.15;font-weight:700}`,
  build(ctx, p) {
    const items = p.items ?? [];
    return `<div class="nt">${items.map((it, i) => `<div class="toast" data-i="${i}" style="top:${i * 170}px"><span class="ti ic">${ctx.icon(it.icon ?? "bell", "fill")}</span><div><b>${ctx.esc(it.title ?? "")}</b><span class="tt">${ctx.esc(it.text ?? "")}</span></div></div>`).join("")}</div>`;
  },
  heightFor: (p) => Math.max(150, (p.items?.length ?? 1) * 170 - 20),
};

export const phone = {
  about: "Phone mockup that slides over the scene; screen shows chat bubbles (messages) or app rows (rows)",
  base: { w: 480, h: 900 },
  fields: ["title", "messages", "rows", "icon"],
  css: `.ph{position:absolute;inset:0;border-radius:calc(70px*var(--rk));background:var(--ink);box-shadow:0 0 0 8px var(--muted),var(--shd);padding:18px}
.ph-screen{position:relative;width:100%;height:100%;border-radius:calc(54px*var(--rk));background:var(--surface);overflow:hidden;font-family:var(--fu);color:var(--ink)}
.ph-notch{position:absolute;left:50%;top:14px;width:130px;height:34px;margin-left:-65px;border-radius:17px;background:var(--ink);z-index:3}
.ph-hdr{position:absolute;left:0;top:0;width:100%;height:136px;background:var(--surface2);padding-top:72px;text-align:center;font-size:40px;font-weight:900}
.ph-body{position:absolute;left:0;top:136px;right:0;bottom:0;padding:18px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
.ph .bub{font-size:34px;padding:16px 22px}.ph-row{display:flex;gap:18px;align-items:center;background:var(--surface2);border-radius:calc(26px*var(--rk));padding:14px 18px;font-size:34px;font-weight:800}.ph-row .ic{width:52px;height:52px;color:var(--accent);flex:none}`,
  build(ctx, p) {
    const body = p.messages?.length ? bubbles(ctx, p.messages) : (p.rows ?? []).map((r) => `<div class="ph-row"><span class="ic">${ctx.icon(r.icon ?? "star", "fill")}</span><span>${ctx.esc(r.text ?? r)}</span></div>`).join("");
    return `<div class="ph"><div class="ph-screen"><div class="ph-notch"></div><div class="ph-hdr">${ctx.esc(p.title ?? "")}</div><div class="ph-body">${body}</div></div></div>`;
  },
};

export const list = {
  about: "Directory / list / table of rows with a scanning highlight (beats scan and pick); rows can have a tag",
  base: { w: 780, h: 640 },
  fields: ["title", "rows", "icon"],
  css: `.ls-hdr{position:absolute;left:0;top:0;width:100%;height:112px;background:var(--surface2);display:flex;align-items:center;gap:20px;padding:0 30px;font-size:44px;font-weight:900}.ls-hdr .ic{width:56px;height:56px;color:var(--accent)}
.ls-win{position:absolute;left:0;top:112px;right:0;bottom:0;overflow:hidden}.ls-rows{position:absolute;left:0;top:0;width:100%}
.ls-row{height:96px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;font-size:42px;font-weight:800;border-bottom:2px solid var(--surface2);position:relative;z-index:1}.ls-row .tg{font-size:32px;padding:6px 18px;border-radius:20px;background:var(--surface2);color:var(--muted);font-weight:800}
.ls-hl{position:absolute;left:10px;right:10px;top:0;height:96px;border-radius:calc(22px*var(--rk));background:var(--accent);opacity:0;z-index:0}.ls-row.pk{color:var(--onaccent)}`,
  build(ctx, p) {
    const rows = (p.rows ?? []).map((r) => (typeof r === "string" ? { text: r } : r));
    return `<div class="k-card ls"><div class="ls-hdr"><span class="ic">${ctx.icon(p.icon ?? "list-bullets")}</span><span>${ctx.esc(p.title ?? "")}</span></div><div class="ls-win"><div class="ls-hl"></div><div class="ls-rows">${rows.map((r, i) => `<div class="ls-row" data-i="${i}"><span>${ctx.esc(r.text)}</span>${r.tag ? `<span class="tg">${ctx.esc(r.tag)}</span>` : ""}</div>`).join("")}</div></div></div>`;
  },
  heightFor: (p) => 112 + Math.min(6, Math.max(3, (p.rows?.length ?? 4))) * 96,
  ROW_H: 96,
};

export const card = {
  about: "Sign / concept card: big icon, title and subtitle; beat toggle swaps the icon (e.g. lock open to locked)",
  base: { w: 600, h: 330 },
  fields: ["title", "sub", "icon", "icon2", "role"],
  css: `.cd{position:absolute;inset:0;display:flex;align-items:center;gap:30px;padding:0 40px}.cd-ic{position:relative;width:150px;height:150px;border-radius:50%;background:var(--cdc,var(--accent));color:var(--onaccent);flex:none}
.cd-ic .ic{position:absolute;inset:34px}.cd-t{font-size:56px;font-weight:900;line-height:1.05}.cd-s{font-size:38px;color:var(--muted);font-weight:700;margin-top:8px;line-height:1.1}`,
  build(ctx, p) {
    const role = p.role ?? "accent";
    return `<div class="k-card cd" style="--cdc:var(--${role})"><div class="cd-ic"><span class="ic i1">${ctx.icon(p.icon ?? "sparkle", "fill")}</span>${p.icon2 ? `<span class="ic i2" style="opacity:0">${ctx.icon(p.icon2, "fill")}</span>` : ""}</div><div><div class="cd-t">${ctx.esc(p.title ?? "")}</div>${p.sub ? `<div class="cd-s">${ctx.esc(p.sub)}</div>` : ""}</div></div>`;
  },
};
