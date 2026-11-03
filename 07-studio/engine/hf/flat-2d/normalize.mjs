// Repairs the slips LLMs make in an flat-2d payload without dropping content: aliases for enums, string/number
// coercion, `on` shorthands, targets matched case-insensitively, characters used in beats auto-added to the scene.
// Idempotent: normalize(normalize(x)) deep-equals normalize(x).
import { STYLE_IDS, SETTING_IDS, KIT_KINDS, BEAT_KINDS, BEAT_SPEC, CLIPS, CAMERA_MOVES, SHOW_HOW, HIDE_HOW, DESIGN_IDS, PAGES, TRANSITIONS } from "./schema.mjs";
import { ICON_SET, ICON_ALIASES } from "./icons.mjs";
import { AT_IDS, CAST_AT_IDS, ROLES } from "./layout.mjs";
import { settingPropNames } from "./settings/index.mjs";
import { slug } from "./util.mjs";

const key = (s) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_]+/g, "-");
const pickAlias = (v, ids, aliases = {}) => {
  const k = key(v);
  if (ids.includes(k)) return k;
  if (aliases[k]) return aliases[k];
  const hit = ids.find((i) => i === "flat-" + k);
  if (hit) return hit;
  for (const [a, id] of Object.entries(aliases)) if (k.includes(a)) return id;
  return v;
};
const num = (v) => (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : v);

const STYLE_ALIASES = { soft: "flat-soft-gradient", gradient: "flat-soft-gradient", torna: "flat-soft-gradient", neon: "flat-dark-neon-ui", dark: "flat-dark-neon-ui", "dark-neon": "flat-dark-neon-ui", guru: "flat-dark-neon-ui", memphis: "flat-memphis", pop: "flat-memphis", paper: "flat-paper-cut", "paper-cut": "flat-paper-cut", papercut: "flat-paper-cut", blueprint: "flat-blueprint", plano: "flat-blueprint", brutalist: "flat-neo-brutalist", brutal: "flat-neo-brutalist", neobrutalism: "flat-neo-brutalist", riso: "flat-risograph-duotone", risograph: "flat-risograph-duotone", duotone: "flat-risograph-duotone", glass: "flat-glass-ui", glassmorphism: "flat-glass-ui", sticker: "flat-sticker-cartoon", cartoon: "flat-sticker-cartoon", clay: "flat-clay-2d", claymorphism: "flat-clay-2d", iso: "flat-isometric", isometric: "flat-isometric", lowpoly: "flat-low-poly", "low-poly": "flat-low-poly", poly: "flat-low-poly" };
const SETTING_ALIASES = { browser: "desktop-browser", desktop: "desktop-browser", computer: "desktop-browser", pc: "desktop-browser", desk: "desktop-browser", phone: "phone-ui", mobile: "phone-ui", app: "phone-ui", server: "server-room", servers: "server-room", datacenter: "data-center", cloud: "cloud-sky", hosting: "data-center", "cloud-servers": "cloud-sky", sky: "cloud-sky", "home-screen": "phone-home", homescreen: "phone-home", launcher: "phone-home", cafe: "cafe-laptops", coffee: "cafe-laptops", coworking: "cafe-laptops", "coffee-shop": "cafe-laptops", tower: "wifi-street", antenna: "wifi-street", wifi: "wifi-street", "cell-tower": "wifi-street", appstore: "app-store", "play-store": "app-store", marketplace: "app-store", "store-app": "app-store", security: "vault-door", "security-door": "vault-door", safe: "vault-door", "call-center": "helpdesk", callcenter: "helpdesk", support: "helpdesk", "help-desk": "helpdesk", lab: "hardware-lab", laboratory: "hardware-lab", workshop: "hardware-lab", electronics: "hardware-lab", street: "city-street", city: "city-street", shops: "city-street", neighborhood: "city-street", workplace: "office", barber: "barbershop", "barber-shop": "barbershop", barberia: "barbershop", restaurant: "kitchen", school: "classroom", class: "classroom", factory: "factory-line", production: "factory-line", plant: "factory-line", terminal: "airport", travel: "airport", vault: "vault-door", finance: "bank", clinic: "hospital", health: "hospital", home: "home-office", "home-desk": "home-office", remote: "home-office", shop: "store", retail: "store", market: "store", abstract: "void", empty: "void", stage: "void", blank: "void" };
const KIND_ALIASES = { "browser-window": "browser", navegador: "browser", web: "browser", website: "browser", window: "browser", messages: "chat", conversation: "chat", whatsapp: "chat", counter: "stats", counters: "stats", kpi: "stats", metrics: "stats", numbers: "stats", graph: "chart", plot: "chart", toast: "notification", notifications: "notification", alert: "notification", popup: "notification", smartphone: "phone", mobile: "phone", iphone: "phone", directory: "list", table: "list", contacts: "list", agenda: "list", server: "rack", servers: "rack", "server-rack": "rack", wifi: "router", modem: "router", loyalty: "stamp-card", "loyalty-card": "stamp-card", stamps: "stamp-card", "stamp-card": "stamp-card", "progress-bar": "progress", "progress-bars": "progress", bars: "progress", sign: "card", badge: "card", label: "card", "icon-card": "card" };
const ROLE_ALIASES = { green: "good", success: "good", ok: "good", red: "bad", error: "bad", danger: "bad", yellow: "warn", orange: "warn", warning: "warn", blue: "accent", primary: "accent", purple: "accent2", violet: "accent2", cyan: "accent3", teal: "accent3", dark: "ink", gray: "muted", grey: "muted" };
const DO_ALIASES = {
  typing: "type", write: "type", text: "type", reveal: "show", appear: "show", "pop-in": "show", enter: "show", popup: "show", hide: "hide", disappear: "hide", remove: "hide", counter: "count", roll: "count", number: "count", chart: "draw", plot: "draw", notify: "drop", notification: "drop", press: "click", tap: "click", search: "scan", highlight: "pick", select: "pick", choose: "pick",
  packet: "send", transfer: "send", travel: "send", leds: "light", lights: "light", circle: "mark", stamp: "punch", progress: "fill", load: "fill", swap: "toggle", flip: "toggle", pull: "lever", swell: "grow", scale: "grow", color: "recolor", colour: "recolor", wiggle: "shake", jump: "bounce", hop: "bounce", ring: "pulse", highlight_ring: "pulse", reaction: "emote", bubble: "emote", label: "chip", tag: "chip", stampword: "hero", "hero-word": "hero", confetti: "burst", explode: "burst", action: "act", animate: "act", cast: "act", zoom: "camera", "zoom-in": "camera", pan: "camera", focus: "camera", message: "message", say: "message", reply: "message", pop: "show", drop: "drop",
};
const CLIP_ALIASES = { walking: "walk", running: "run", pointing: "point", jump: "celebrate", cheer: "celebrate", celebrate: "celebrate", surprise: "react", surprised: "react", shocked: "react", lever: "pull", "pull-lever": "pull", press: "click", tap: "click", talking: "talk", speak: "talk", wave: "wave", "shrug-shoulders": "shrug", sunglasses: "shades", glasses: "shades", "turn-around": "turn", thinking: "think", stand: "idle", wait: "idle" };
const MOVE_ALIASES = { zoom: "push", "zoom-in": "push", focus: "push", close: "push", closeup: "push", "close-up": "push", "push-in": "push", out: "zoom-out", "pull-back": "zoom-out", wide: "zoom-out", overview: "recap", world: "recap", all: "recap", reset: "release", back: "release", home: "release", normal: "release" };
const SIZE_ALIASES = { large: "l", big: "l", wide: "l", medium: "m", mid: "m", small: "s", tiny: "s" };
const AT_ALIASES = { center: "top", centre: "top", "top-center": "top", "center-top": "top", "middle-center": "middle", bottom: "floor-center", "bottom-left": "floor-left", "bottom-right": "floor-right", "bottom-center": "floor-center", "mid-left": "middle-left", "mid-right": "middle-right", "upper-left": "top-left", "upper-right": "top-right", upper: "top" };
const CAST_AT_ALIASES = { izquierda: "left", derecha: "right", centro: "center", "center-left": "left", "center-right": "right", "bottom-left": "floor-left", "bottom-right": "floor-right", "bottom-center": "floor-center" };
const PAGE_ALIASES = { home: "landing", homepage: "landing", website: "landing", blog: "article", store: "shop", ecommerce: "shop", dash: "dashboard", analytics: "dashboard", signin: "login", "sign-in": "login", results: "search", google: "search", empty: "blank", loading: "blank" };

function fixIcon(v) {
  if (typeof v !== "string") return v;
  const k = key(v).replace(/-(bold|fill|regular|duotone|light|thin)$/, "");
  if (ICON_SET.has(k)) return k;
  const nk = k.replace(/-/g, "");
  if (ICON_ALIASES[k]) return ICON_ALIASES[k];
  const flat = [...ICON_SET].find((n) => n.replace(/-/g, "") === nk);
  if (flat) return flat;
  const sub = [...ICON_SET].find((n) => n.includes(k) || k.includes(n));
  return sub ?? "sparkle";
}
const fixRole = (v) => { const k = key(v); return ROLES.includes(k) ? k : ROLE_ALIASES[k] ?? v; };
const cut = (v, n) => (typeof v === "string" && v.length > n ? v.slice(0, n - 1).trimEnd() + "." : v);

function fixOn(on) {
  if (on == null) return on;
  if (typeof on === "string") return { word: on };
  if (typeof on === "number") return { at: on };
  const o = { ...on };
  const w = o.word ?? o.words ?? o.keyword ?? o.text ?? o.when;
  delete o.words; delete o.keyword; delete o.text; delete o.when;
  if (w !== undefined) o.word = Array.isArray(w) ? String(w[0]) : String(w);
  if (o.n !== undefined) { const n = num(o.n); o.n = typeof n === "number" ? Math.min(30, Math.max(1, Math.round(n))) : n; }
  if (o.at !== undefined) o.at = num(o.at);
  if (o.offset !== undefined) o.offset = num(o.offset);
  if (typeof o.word === "string") o.word = o.word.trim();
  return o;
}

export function normalize(input, ctx) {
  // The engine registry hands over the WHOLE spec (template, mode, narration scenes, hf); the payload is spec.hf.
  if (input && typeof input === "object" && ("template" in input || "hf" in input)) {
    const out = { ...input };
    if (out.hf && typeof out.hf === "object") out.hf = normalize(out.hf, { spec: out, warnings: ctx?.warnings ?? [] });
    return out;
  }
  const p = structuredClone(input ?? {});
  if (typeof p.style === "string") p.style = pickAlias(p.style, STYLE_IDS, STYLE_ALIASES);
  if (p.mode !== undefined) {
    // spec.mode is the single source of truth: a stray hf.mode never reaches the payload
    const m = key(p.mode);
    const mode = ["single", "mono", "monoscene", "one", "single-scene"].includes(m) ? "single" : ["multi", "multiscene", "multi-scene", "many", "multiple"].includes(m) ? "multi" : null;
    const spec = ctx?.spec;
    if (spec && mode) {
      if (spec.mode === undefined || spec.mode === null) { spec.mode = mode; ctx.warnings?.push(`hf.mode "${p.mode}" moved to spec.mode (${mode}); do not set hf.mode`); }
      else if (spec.mode !== mode) ctx.warnings?.push(`hf.mode "${p.mode}" ignored: spec.mode "${spec.mode}" wins`);
      else ctx.warnings?.push(`hf.mode ignored (same as spec.mode); do not set hf.mode`);
    } else ctx?.warnings?.push(`hf.mode "${p.mode}" ignored: set the mode in spec.mode`);
    delete p.mode;
  }
  const props = settingPropNames();
  const declared = new Map((Array.isArray(p.cast) ? p.cast : []).map((c) => [key(c.id), c]));
  if (Array.isArray(p.cast)) p.cast = p.cast.map((c) => ({ ...c, id: slug(c.id) || c.id, design: pickAlias(c.design ?? c.id, DESIGN_IDS), ...(c.size ? { size: String(c.size).toUpperCase().slice(0, 1) } : {}), ...(c.name ? { name: cut(c.name, 20) } : {}) }));
  const castDesigns = new Set([...DESIGN_IDS, ...(p.cast ?? []).map((c) => c.id)]);
  const used = new Set();
  const scenes = Array.isArray(p.scenes) ? p.scenes : [];
  p.scenes = scenes.map((s0, si) => {
    const s = { ...s0 };
    if (typeof s.setting === "string") s.setting = pickAlias(s.setting, SETTING_IDS, SETTING_ALIASES);
    let id = slug(s.id ?? s.label ?? `s${si + 1}`) || `s${si + 1}`;
    while (used.has(id)) id += "-" + (si + 1);
    used.add(id); s.id = id;
    if (s.label !== undefined) s.label = cut(String(s.label), 24);
    if (s.glow !== undefined) s.glow = fixRole(s.glow);
    if (s.enter !== undefined) s.enter = fixOn(s.enter);
    if (typeof s.transition === "string") s.transition = pickAlias(s.transition, TRANSITIONS, { swipe: "slide", pan: "slide", whippan: "whip", "whip-pan": "whip", vertical: "up", reveal: "wipe", circle: "iris" });
    s.props = (Array.isArray(s.props) ? s.props : []).map((pr0, pi) => {
      const pr = { ...pr0 };
      pr.kind = pickAlias(pr.kind, KIT_KINDS, KIND_ALIASES);
      pr.id = slug(pr.id ?? `${pr.kind}${pi + 1}`) || `${pr.kind}${pi + 1}`;
      if (typeof pr.at === "string") pr.at = pickAlias(pr.at, AT_IDS, AT_ALIASES);
      if (typeof pr.size === "string") { const k = key(pr.size); pr.size = ["s", "m", "l"].includes(k) ? k : SIZE_ALIASES[k] ?? pr.size; }
      for (const f of ["dx", "dy"]) if (pr[f] !== undefined) pr[f] = num(pr[f]);
      if (typeof pr.page === "string") pr.page = pickAlias(pr.page, PAGES, PAGE_ALIASES);
      if (typeof pr.chartType === "string") pr.chartType = pickAlias(pr.chartType, ["line", "bars", "donut"], { bar: "bars", pie: "donut", doughnut: "donut" });
      if (typeof pr.url === "string") pr.url = cut(pr.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), 36);
      for (const f of ["title", "sub", "heading"]) if (pr[f] !== undefined) pr[f] = cut(String(pr[f]), f === "heading" ? 24 : f === "sub" ? 50 : 40);
      for (const f of ["icon", "icon2"]) if (pr[f] !== undefined) pr[f] = fixIcon(pr[f]);
      if (pr.role !== undefined) pr.role = fixRole(pr.role);
      if (Array.isArray(pr.messages)) pr.messages = pr.messages.slice(0, 6).map((m) => ({ from: key(m.from) === "me" || key(m.from) === "user" || key(m.from) === "out" ? "me" : "them", text: cut(String(m.text ?? m.message ?? ""), 90) }));
      if (Array.isArray(pr.items)) pr.items = pr.items.slice(0, 4).map((it) => { const o = { ...it }; for (const f of ["value"]) if (o[f] !== undefined) o[f] = num(o[f]); if (o.icon) o.icon = fixIcon(o.icon); if (o.role) o.role = fixRole(o.role); return o; });
      if (Array.isArray(pr.rows)) pr.rows = pr.rows.slice(0, 12).map((r) => (typeof r === "object" && r?.icon ? { ...r, icon: fixIcon(r.icon) } : r));
      if (Array.isArray(pr.data)) pr.data = pr.data.map(num).filter((v) => typeof v === "number");
      for (const f of ["units", "slots"]) if (pr[f] !== undefined) pr[f] = num(pr[f]);
      return pr;
    });
    s.cast = (Array.isArray(s.cast) ? s.cast : []).map((c0) => {
      const c = { ...c0, who: slug(c0.who ?? c0.id ?? c0.design ?? "") };
      if (typeof c.at === "string") c.at = pickAlias(c.at, CAST_AT_IDS, CAST_AT_ALIASES);
      if (typeof c.facing === "string") c.facing = pickAlias(c.facing, ["front", "left", "right"], { frontal: "front", forward: "front", camera: "front" });
      if (c.dx !== undefined) c.dx = num(c.dx);
      return c;
    });
    const castIds = () => new Set(s.cast.map((c) => c.who));
    const propIds = new Map(s.props.map((x) => [key(x.id), x]));
    const settingNames = props[s.setting] ?? [];
    const allTargets = () => [...propIds.keys(), ...castIds(), ...settingNames, "cursor"];
    const fixTarget = (v) => {
      if (typeof v !== "string") return v;
      const k = slug(v);
      const all = allTargets();
      if (all.includes(k)) return k;
      const ci = all.find((t) => t.toLowerCase() === k);
      if (ci) return ci;
      const pre = all.find((t) => t.startsWith(k) || k.startsWith(t));
      return pre ?? k;
    };
    s.beats = (Array.isArray(s.beats) ? s.beats : []).map((b0) => {
      const b = { ...b0 };
      b.on = fixOn(b.on);
      let doKey = key(b.do);
      if (!BEAT_KINDS.includes(doKey)) {
        const al = DO_ALIASES[doKey] ?? DO_ALIASES[doKey.replace(/-/g, "")];
        if (al) {
          if (doKey === "pop" || doKey === "pop-in") b.how = b.how ?? "pop";
          if (doKey === "zoom" || doKey === "zoom-in" || doKey === "focus") b.move = b.move ?? "push";
          if (doKey === "pan") b.move = b.move ?? "push";
          if (doKey === "popup") b.how = b.how ?? "pop";
          doKey = al;
        }
      }
      b.do = doKey;
      if (b.target === undefined && b.prop !== undefined) b.target = b.prop;
      if (b.target === undefined && b.id !== undefined) b.target = b.id;
      delete b.prop; delete b.id;
      if (b.do === "type" && b.text === undefined) { b.text = b.url ?? b.value; delete b.url; if (b.text === undefined) delete b.text; }
      if (b.do === "act") { if (b.who === undefined && b.target !== undefined) { b.who = b.target; delete b.target; } if (b.clip === undefined && b.action !== undefined) b.clip = b.action; delete b.action; }
      if (b.do === "emote" && b.target === undefined && b.who !== undefined) { b.target = b.who; delete b.who; }
      if (b.who !== undefined) b.who = slug(b.who);
      for (const k of ["target", "from"]) if (b[k] !== undefined) b[k] = fixTarget(b[k]);
      if (b.to !== undefined) b.to = fixTarget(b.to);
      if (typeof b.clip === "string") { const k = key(b.clip); b.clip = CLIPS.includes(k) ? k : CLIP_ALIASES[k] ?? b.clip; }
      if (typeof b.move === "string") { const k = key(b.move); b.move = CAMERA_MOVES.includes(k) ? k : MOVE_ALIASES[k] ?? b.move; }
      if (typeof b.how === "string") { const k = key(b.how); b.how = [...SHOW_HOW, ...HIDE_HOW].includes(k) ? k : ({ slide: "slide-up", "from-left": "slide-left", "from-right": "slide-right", "from-top": "drop", "from-bottom": "slide-up", bounce: "drop", zoom: "pop" })[k] ?? b.how; }
      if (b.role !== undefined) b.role = fixRole(b.role);
      if (b.icon !== undefined) b.icon = fixIcon(b.icon);
      for (const k of ["n", "item", "row", "day", "value", "scale", "zoom"]) if (b[k] !== undefined) b[k] = num(b[k]);
      if (b.text !== undefined) b.text = cut(String(b.text), b.do === "hero" ? 28 : 60);
      // kind-specific inference
      const need = { count: "stats", draw: "chart", drop: "notification", scan: "list", pick: "list", mark: "calendar", punch: "stamp-card", fill: "progress", toggle: "card", message: "chat", type: "browser" };
      if (b.target === undefined && need[b.do]) { const f = s.props.find((x) => x.kind === need[b.do]) ?? (b.do === "message" ? s.props.find((x) => x.kind === "phone") : null); if (f) b.target = f.id; }
      if (b.do === "light" && b.target === undefined) { const f = s.props.find((x) => x.kind === "rack" || x.kind === "router"); if (f) b.target = f.id; }
      // drop params the beat kind does not take (typical: duration, delay, ease)
      const spec = BEAT_SPEC[b.do];
      if (spec) { const allowed = new Set(["on", "do", ...spec.req, ...spec.opt]); for (const k of Object.keys(b)) if (!allowed.has(k) && b[k] === undefined) delete b[k]; for (const k of ["duration", "delay", "ease", "easing", "speed", "color", "colour"]) delete b[k]; }
      // a character used by a beat but missing from the scene cast joins it (idle, standing at its slot)
      const who = b.do === "act" ? b.who : b.do === "emote" ? b.target : null;
      if (who && !castIds().has(who) && castDesigns.has(who)) s.cast.push({ who, at: ["floor-left", "floor-right", "floor-center"][s.cast.length % 3] });
      return b;
    });
    return s;
  });
  for (const sc of p.scenes) delete sc.notes;
  void declared;
  return p;
}
