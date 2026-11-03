// Lenient authoring: maps the slips an LLM makes in the payload to valid values without dropping content.
// Anything it cannot map is left untouched so the schema reports a precise error instead of guessing.
import { loadCatalog, BEAT_KINDS, PROP_ACTS, EMOTES, TRANSITIONS, TIMES, COLORS, SIZES, LAYOUTS, getScenario, worldProps, WORKSHOP_ID, WORKSHOP_THEMES } from "./catalog.mjs";
import { STYLES, STYLE_GUIDE, RETRO_RE, recommendStyles, PIXEL_SCALES } from "./styles.mjs";

const flat = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const toks = (s) => flat(s).split(" ").filter(Boolean);
function lev(a, b) { const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }

/** Best candidate for a free-text value: exact id, alias, token overlap with id/name/keywords, then edit distance. */
export function nearest(value, candidates, aliases = {}) {
  const v = flat(value); if (!v) return null;
  const vt = toks(v), ids = candidates.map((c) => c.id);
  const exact = candidates.find((c) => flat(c.id) === v || flat(c.name) === v || flat(c.id.replace(/^pixel-/, "")) === v);
  if (exact) return exact.id;
  const al = aliases[v] ?? aliases[v.replace(/ /g, "")]; if (al && ids.includes(al)) return al;
  let best = null, bs = 0;
  for (const c of candidates) {
    const own = new Set([...toks(c.id), ...toks(c.name)]), terms = new Set([...own, ...(c.keywords ?? []).flatMap(toks)]);
    let s = 0;
    for (const t of vt) { if (own.has(t)) s += 3; else if (terms.has(t)) s += 2; else for (const k of terms) if (k.length >= 4 && t.length >= 4 && (k.startsWith(t) || t.startsWith(k) || k.slice(0, 4) === t.slice(0, 4))) { s += 1; break; } }
    if (s > bs) { bs = s; best = c.id; }
  }
  if (best) return best;
  let bd = 99; for (const c of candidates) { const d = lev(v.replace(/^pixel /, ""), flat(c.id).replace(/^pixel /, "")); if (d < bd) { bd = d; best = c.id; } }
  return bd <= 3 ? best : null;
}

const STYLE_ALIASES = { gameboy: "pixel-gameboy-dmg", dmg: "pixel-gameboy-dmg", green: "pixel-gameboy-dmg", nes: "pixel-nes-8bit", "8bit": "pixel-nes-8bit", "8 bit": "pixel-nes-8bit", snes: "pixel-snes-16bit", "16bit": "pixel-snes-16bit", "16 bit": "pixel-snes-16bit", rpg: "pixel-snes-16bit", pico: "pixel-pico8", pico8: "pixel-pico8", "pico 8": "pixel-pico8", crt: "pixel-crt-arcade", arcade: "pixel-crt-arcade", scanlines: "pixel-crt-arcade", "1bit": "pixel-1bit-dither", "1 bit": "pixel-1bit-dither", dither: "pixel-1bit-dither", monochrome: "pixel-1bit-dither", mono: "pixel-1bit-dither", cyber: "pixel-cyberpunk-neon", neon: "pixel-cyberpunk-neon", cyberpunk: "pixel-cyberpunk-neon", noir: "pixel-noir", detective: "pixel-noir", dusk: "pixel-dusk-lowres", sunset: "pixel-dusk-lowres", lowres: "pixel-dusk-lowres", c64: "pixel-c64", commodore: "pixel-c64", gba: "pixel-gba-handheld", handheld: "pixel-gba-handheld", fire: "pixel-liquid-fire", water: "pixel-liquid-fire", liquid: "pixel-liquid-fire", lava: "pixel-liquid-fire", vapor: "pixel-vaporwave", vaporwave: "pixel-vaporwave", synthwave: "pixel-vaporwave", virtual: "pixel-virtual-red", "virtual boy": "pixel-virtual-red", red: "pixel-virtual-red" };
const DO_ALIASES = {
  "stamp text": "hero-stamp", "text stamp": "hero-stamp", title: "hero-stamp", "hero stamp": "hero-stamp", "word stamp": "hero-stamp", "big text": "hero-stamp",
  "screen shake": "shake", "shake screen": "shake", "camera shake": "shake", rumble: "shake", "coin drop": "coins", "drop coins": "coins", "coins drop": "coins", coin: "coins",
  glow: "light", "light up": "light", "power on": "light", on: "light", off: "dim", "power off": "dim", "turn off": "dim", "switch off": "dim",
  bounce: "pulse", hop: "pulse", highlight: "pulse", emphasize: "pulse", explode: "burst", break: "burst", split: "burst", "burst apart": "burst",
  "fill bar": "fill", "bar fill": "fill", "progress fill": "fill", colour: "recolor", color: "recolor", recolour: "recolor", "change color": "recolor",
  multiplier: "x2", "x2 stamp": "x2", mult: "x2", "zoom in": "push", zoom: "push", "camera push": "push", "camera pan": "pan", "move camera": "pan",
  speech: "emote", bubble: "emote", "emote bubble": "emote", chip: "label", tag: "label", "label chip": "label", caption: "label", "hud progress": "progress", "progress bar": "progress", "hud counter": "counter", counter: "counter",
  "follow click": "follow", "fake follow": "follow", sparks: "radial-burst", "burst radial": "radial-burst", "radial burst": "radial-burst", "point at": "point", move: "walk", go: "walk", "walk to": "walk", celebrate: "cheer", "white flash": "flash", slash: "chop", cut: "chop", press: "stamp", "close up": "close",
};
const EMOTE_ALIASES = { question: "?", "question mark": "?", exclamation: "!", "exclamation mark": "!", surprise: "!", love: "heart", like: "heart", lightbulb: "idea", bulb: "idea", thinking: "dots", ellipsis: "dots", ok: "check", yes: "check", tick: "check", no: "cross", x: "cross", wrong: "cross", sleep: "zzz", money: "coin", music: "note", sparkle: "star" };
const COLOR_ALIASES = { cyan: "teal", aqua: "teal", violet: "purple", magenta: "pink", grey: "white", gray: "white", black: "blue", brown: "orange", lime: "green", amber: "orange", crimson: "red" };
const TR_ALIASES = { wipe: "tiles", tile: "tiles", mosaic: "tiles", circle: "iris", round: "iris", push: "slide", pan: "slide", scroll: "slide", drop: "down", fall: "down", vertical: "down", "slide down": "down" };
const TIME_ALIASES = { sunset: "dusk", evening: "dusk", sunrise: "dusk", twilight: "dusk", nightfall: "night", dark: "night", midnight: "night", morning: "day", noon: "day", afternoon: "day", light: "day", daytime: "day" };
const PROP_KIND_ALIASES = { battery: "battery", cell: "battery", celular: "phone", smartphone: "phone", mobile: "phone", cpu: "chip", processor: "chip", ventilador: "fan", wire: "cable", usb: "cable", lightning: "bolt", thunder: "bolt", lock: "padlock", virus: "bug", fire: "flame", heat: "flame", cold: "snowflake", ice: "snowflake", monitor: "screen", display: "screen", chart: "barchart", graph: "barchart", gauge: "gauge", dial: "gauge", temperature: "thermometer", search: "magnifier", lens: "magnifier", money: "coin", cog: "gear", rack: "server", db: "database", idea: "bulb", light: "bulb", wireless: "wifi" };
const PIXEL_SCALE_ALIASES = { coarse: "chunky", thick: "chunky", big: "chunky", large: "chunky", low: "chunky", grueso: "chunky", normal: "standard", default: "standard", medium: "standard", regular: "standard", estandar: "standard", high: "fine", hd: "fine", detailed: "fine", smooth: "fine", small: "fine", fino: "fine", detail: "fine" };
const LAYOUT_ALIASES = { horizontal: "strip", row: "strip", side: "strip", sideways: "strip", vertical: "tower", column: "tower", down: "tower", descend: "tower" };

const pickList = (v, list, aliases) => { const k = flat(v); if (list.includes(String(v))) return v; if (aliases[k]) return aliases[k]; if (list.includes(k)) return k; return v; };
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function normBeat(b, w, heroId, castIds) {
  if (typeof b === "string") b = { do: b };
  if (!isObj(b)) return b;
  const o = { ...b };
  // time binding: `on` as a bare word, or loose top-level word/at fields
  if (typeof o.on === "string") o.on = { word: o.on };
  if (isObj(o.on)) { o.on = { ...o.on }; if (typeof o.on.n === "string" && /^\d+$/.test(o.on.n)) o.on.n = +o.on.n; if (typeof o.on.n === "number") o.on.n = Math.max(1, Math.round(o.on.n)); if (typeof o.on.at === "string" && o.on.at !== "" && !isNaN(+o.on.at)) o.on.at = +o.on.at; }
  else if (o.on === undefined) { const word = o.word ?? o.when ?? o.at_word, at = o.at ?? o.time ?? o.t; if (word !== undefined) o.on = { word: String(word) }; else if (typeof at === "number") o.on = { at }; delete o.word; delete o.when; delete o.at_word; delete o.time; delete o.t; if (typeof o.at === "number") delete o.at; }
  if (o.n !== undefined && isObj(o.on) && o.on.n === undefined) { o.on.n = Math.max(1, Math.round(+o.n) || 1); delete o.n; }
  // kind
  const kind = o.do ?? o.kind ?? o.type ?? o.action; delete o.kind; delete o.type; delete o.action;
  if (kind !== undefined) { const k = flat(kind); o.do = BEAT_KINDS.includes(String(kind)) ? kind : BEAT_KINDS.includes(k) ? k : BEAT_KINDS.includes(k.replace(/ /g, "-")) ? k.replace(/ /g, "-") : DO_ALIASES[k] ?? kind; }
  const props = worldProps(w);
  if (typeof o.target === "string" && props.length && !props.some((p) => p.id === o.target)) {
    const near = nearest(o.target, props.map((p) => ({ id: p.id, name: p.id.replace(/-/g, " "), keywords: toks(p.about) })));
    if (near) o.target = near;
  }
  if (o.target === undefined && props.length && PROP_ACTS.includes(o.do)) o.target = props[0].id;
  if (typeof o.to === "string") { const to = flat(o.to); if (["left", "center", "right"].includes(to)) o.to = to; else if (!props.some((p) => p.id === o.to)) { const near = nearest(o.to, props.map((p) => ({ id: p.id, name: p.id, keywords: toks(p.about) }))); if (near) o.to = near; } }
  if (typeof o.who === "string") { const k = flat(o.who); if (k === flat(heroId) || ["hero", "main", "narrator", "player", "character"].includes(k)) o.who = "hero"; else if (!castIds.includes(o.who)) { const near = nearest(o.who, castIds.map((id) => ({ id, name: id }))); if (near) o.who = near; } }
  if (typeof o.symbol === "string" && !EMOTES.includes(o.symbol)) { const k = flat(o.symbol); o.symbol = EMOTE_ALIASES[k] ?? (EMOTES.includes(k) ? k : o.symbol); }
  if (o.symbol === undefined && typeof o.emoji === "string") { o.symbol = EMOTE_ALIASES[flat(o.emoji)] ?? (EMOTES.includes(o.emoji) ? o.emoji : undefined); delete o.emoji; if (o.symbol === undefined) delete o.symbol; }
  if (typeof o.color === "string" && !COLORS.includes(o.color)) { const k = flat(o.color); o.color = COLOR_ALIASES[k] ?? (COLORS.includes(k) ? k : o.color); }
  for (const f of ["value", "amp", "amount", "hold", "dur", "count"]) if (typeof o[f] === "string" && o[f].trim() !== "" && !isNaN(+o[f])) o[f] = +o[f];
  if (typeof o.value === "number" && ["fill", "progress"].includes(o.do)) o.value = o.value > 1 && o.value <= 100 ? o.value / 100 : clampN(o.value, 0, 1);
  if (typeof o.amp === "number") o.amp = clampN(Math.round(o.amp), 1, 6);
  if (typeof o.amount === "number") o.amount = clampN(o.amount, 1.05, 1.6);
  if (typeof o.hold === "number") o.hold = clampN(o.hold, 0, 4);
  if (typeof o.dur === "number") o.dur = clampN(o.dur, 0.2, 6);
  if (typeof o.count === "number") o.count = clampN(Math.round(o.count), 1, 12);
  if (typeof o.text === "string") { o.text = o.text.trim(); if (o.text.length > 32) o.text = o.text.slice(0, 32); }
  else if (o.text === undefined && typeof o.title === "string" && ["hero-stamp", "label"].includes(o.do)) { o.text = o.title.slice(0, 32); delete o.title; }
  if (typeof o.label === "string" && o.label.length > 16) o.label = o.label.slice(0, 16);
  if (o.do === "shake" && o.amp === undefined) o.amp = 3;
  if (o.do === "fill" && o.value === undefined) o.value = 1;
  return o;
}

/** Normalises the `hf` payload (never mutates the input). */
export function normalizePayload(hf) {
  if (!isObj(hf)) return hf;
  const cat = loadCatalog(), out = { ...hf };
  if (out.worlds === undefined && Array.isArray(out.scenes)) { out.worlds = out.scenes; delete out.scenes; }
  if (typeof out.style === "string") out.style = nearest(out.style, STYLES.map((s) => ({ id: s.id, name: s.name, keywords: s.about.split(" ") })), STYLE_ALIASES) ?? out.style;
  if (typeof out.hero === "string") { const k = flat(out.hero); out.hero = cat.heroes.some((h) => h.id === out.hero) ? out.hero : nearest(k, cat.heroes.map((h) => ({ id: h.id, name: h.name, keywords: toks(h.about) })), { kid: "hoodie", boy: "hoodie", girl: "capgirl", cap: "capgirl", mage: "wizard", witch: "wizard", astronaut: "astro", space: "astro", bot: "robot", droid: "robot" }) ?? out.hero; }
  if (typeof out.layout === "string") out.layout = pickList(out.layout, LAYOUTS, LAYOUT_ALIASES);
  if (typeof out.pixelScale === "string") out.pixelScale = pickList(out.pixelScale, PIXEL_SCALES, PIXEL_SCALE_ALIASES);
  if (out.flash !== undefined && typeof out.flash !== "boolean") out.flash = out.flash === "true" || out.flash === 1;
  if (isObj(out.brand)) { out.brand = { ...out.brand }; if (typeof out.brand.handle === "string" && out.brand.handle && !out.brand.handle.startsWith("@")) out.brand.handle = "@" + out.brand.handle; if (typeof out.brand.follow === "string") out.brand.follow = { word: out.brand.follow }; if (out.brand.follow === true) delete out.brand.follow; }
  else if (typeof out.brand === "string") out.brand = { handle: out.brand.startsWith("@") ? out.brand : "@" + out.brand };
  const castIds = ["hero", ...cat.heroes.map((h) => h.id), ...cat.npcs.map((n) => n.id)];
  if (Array.isArray(out.worlds)) out.worlds = out.worlds.map((w0) => {
    if (!isObj(w0)) return w0;
    const w = { ...w0 };
    if (w.scenario === undefined && typeof (w.scene ?? w.world ?? w.id) === "string") { w.scenario = w.scene ?? w.world ?? w.id; delete w.scene; delete w.world; }
    if (typeof w.scenario === "string") w.scenario = nearest(w.scenario, cat.scenarios.map((s) => ({ id: s.id, name: s.name, keywords: s.keywords })), {}) ?? w.scenario;
    if (Array.isArray(w.props)) {
      const lib = cat.propLib.map((p) => ({ id: p.kind, name: p.kind, keywords: toks(p.about) }));
      w.props = w.props.map((p0) => { if (typeof p0 === "string") p0 = { kind: p0 }; if (!isObj(p0)) return p0; const p = { ...p0 }; if (p.kind === undefined && typeof (p.type ?? p.name) === "string") { p.kind = p.type ?? p.name; delete p.type; delete p.name; } if (typeof p.kind === "string" && !lib.some((l) => l.id === p.kind)) p.kind = nearest(p.kind, lib, PROP_KIND_ALIASES) ?? p.kind; if (typeof p.size === "string") { const k = p.size.trim().toUpperCase(); p.size = SIZES.includes(k) ? k : { SMALL: "S", MEDIUM: "M", LARGE: "L", BIG: "L" }[k] ?? p.size; } if (typeof p.at === "string") { const k = flat(p.at); if (["left", "center", "right"].includes(k)) p.at = k; } return p; });
      if ((w.scenario === undefined || w.scenario === null) && w.props.length) w.scenario = WORKSHOP_ID;
    }
    if (typeof w.theme === "string") w.theme = pickList(w.theme, WORKSHOP_THEMES, { office: "bench", workshop: "bench", lab: "bench", clouds: "sky", cloud: "sky", day: "sky", cyber: "grid", neon: "grid", night: "night-city", city: "night-city", dark: "night-city" });
    if (typeof w.transition === "string") w.transition = pickList(w.transition, TRANSITIONS, TR_ALIASES);
    if (typeof w.time === "string") w.time = pickList(w.time, TIMES, TIME_ALIASES);
    if (typeof w.from === "string") w.from = { word: w.from };
    if (isObj(w.from)) { w.from = { ...w.from }; if (typeof w.from.n === "string" && /^\d+$/.test(w.from.n)) w.from.n = +w.from.n; }
    if (Array.isArray(w.cast)) w.cast = w.cast.map((c0) => {
      if (typeof c0 === "string") c0 = { who: c0 };
      if (!isObj(c0)) return c0;
      const c = { ...c0 }; const who = c.who ?? c.id ?? c.name; delete c.id; delete c.name;
      if (typeof who === "string") { const k = flat(who); c.who = castIds.includes(who) ? who : k === flat(out.hero) || ["main", "narrator", "player"].includes(k) ? "hero" : nearest(who, castIds.map((id) => ({ id, name: id }))) ?? who; }
      if (typeof c.size === "string") { const k = c.size.trim().toUpperCase(); c.size = SIZES.includes(k) ? k : { SMALL: "S", MEDIUM: "M", LARGE: "L", BIG: "L", TINY: "S" }[k] ?? c.size; }
      if (typeof c.at === "string") { const k = flat(c.at); if (["left", "center", "right"].includes(k)) c.at = k; else { const props = worldProps(w); if (!props.some((p) => p.id === c.at)) c.at = nearest(c.at, props.map((p) => ({ id: p.id, name: p.id, keywords: toks(p.about) }))) ?? c.at; } }
      if (c.dir === "left") c.dir = -1; else if (c.dir === "right") c.dir = 1;
      return c;
    });
    const wcast = Array.isArray(w.cast) ? w.cast.map((c) => c?.who).filter(Boolean) : ["hero"];
    w.beats = Array.isArray(w.beats) ? w.beats.map((b) => normBeat(b, w, out.hero, [...new Set([...wcast, ...castIds])])) : w.beats ?? [];
    return w;
  });
  return out;
}

/** Contract `normalize(spec)`: takes the whole spec (or a bare payload), returns the same shape. */
export function normalize(spec) {
  if (!isObj(spec)) return spec;
  if (isObj(spec.hf)) return { ...spec, hf: normalizePayload(spec.hf) };
  if (spec.hf === undefined && spec.worlds !== undefined && spec.template === undefined) return normalizePayload(spec); // bare payload
  return spec;
}

// ---------------------------------------------------------------------------------------------------------------------
// Beat density pass. A world with fewer than 1 beat per 2 s of its span gets ambient reaction beats bound to spoken words.
// Existing beats are never changed. Pure function of its inputs (words, existing beat times, cast, props).
// ---------------------------------------------------------------------------------------------------------------------
export const DENSITY_MIN_PER_SEC = 0.5;
const SKIP_WORDS = new Set(["para", "pero", "como", "esta", "este", "estos", "estas", "that", "this", "with", "from", "have", "then", "they", "your", "tiene", "cuando", "donde", "porque", "entonces", "tambien", "mucho", "cada"]);
const nw = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const AMBIENT_KINDS = ["react", "pulse", "emote", "jump", "pulse", "react"];
const AMBIENT_SYMBOLS = { react: ["!", "idea", "heart", "star", "check"], emote: ["?", "dots", "note", "star", "!"] };

/**
 * @param {{ t0:number, t1:number, beats:Array<{t:number,do:string}>, words:Array<{text:string,start:number,end:number}>, propIds:string[], castIds:string[] }} a
 * @returns {Array<{t:number,do:string,on:{word:string,n:number},who?:string,target?:string,symbol?:string,ambient:true}>}
 */
export function densify({ t0, t1, beats, words, propIds = [], castIds = ["hero"] }) {
  const span = t1 - t0;
  if (!(span > 0)) return [];
  const need = Math.ceil(span * DENSITY_MIN_PER_SEC - 1e-9) - beats.length;
  if (need <= 0) return [];
  const inWin = words.filter((w) => w.start >= t0 + 0.3 && w.start <= t1 - 0.6);
  const cands = inWin.map((w) => ({ w, k: nw(w.text) })).filter(({ k }) => k.length >= 4 && !SKIP_WORDS.has(k));
  const times = beats.map((b) => b.t).sort((a, b) => a - b);
  const added = [];
  const others = castIds.filter((c) => c !== "hero");
  let ki = 0, si = { react: 0, emote: 0 }, pi = 0;
  for (let n = 0; n < need; n++) {
    const pts = [t0, ...times, t1];
    let gap = null;
    for (let i = 0; i + 1 < pts.length; i++) { const g = pts[i + 1] - pts[i]; if (!gap || g > gap.g) gap = { g, mid: (pts[i] + pts[i + 1]) / 2 }; }
    if (!gap || gap.g < 1.2) break;
    const free = cands.filter(({ w }) => times.every((t) => Math.abs(t - w.start) >= 0.6));
    if (!free.length) break;
    free.sort((a, b) => Math.abs(a.w.start - gap.mid) - Math.abs(b.w.start - gap.mid));
    const { w, k } = free[0];
    let kind = AMBIENT_KINDS[ki++ % AMBIENT_KINDS.length];
    if (kind === "pulse" && !propIds.length) kind = "react";
    const b = { t: +w.start.toFixed(3), do: kind, on: { word: w.text.replace(/[^\p{L}\p{N}]/gu, ""), n: 1 }, ambient: true };
    if (kind === "pulse") b.target = propIds[pi++ % propIds.length];
    else if (kind === "emote") { b.who = others.length ? others[(si.emote) % others.length] : "hero"; b.symbol = AMBIENT_SYMBOLS.emote[si.emote++ % AMBIENT_SYMBOLS.emote.length]; }
    else if (kind === "react") { b.who = "hero"; b.symbol = AMBIENT_SYMBOLS.react[si.react++ % AMBIENT_SYMBOLS.react.length]; }
    else b.who = "hero";
    added.push(b); times.push(b.t); times.sort((a, c) => a - c);
  }
  return added;
}

// ---------------------------------------------------------------------------------------------------------------------
// Punch pass. A world whose punctuation (hero stamps, shakes, bursts, flashes, emotes) is below ~0.6 events per second gets
// extra events bound to its strongest spoken words until it reaches about 0.75 per second. Like densify it never changes an
// existing beat, is a pure function of its inputs and reports every addition. `deriveShakes` adds the small screen shake that
// should accompany every impact beat. `capFlashes` is the photosensitivity guard for the white flash.
// ---------------------------------------------------------------------------------------------------------------------
export const PUNCH_MIN_PER_SEC = 0.6, PUNCH_AIM_PER_SEC = 0.75;
const PUNCH_WEIGHT = { "hero-stamp": 1, shake: 1, "radial-burst": 1, burst: 1, flash: 1, x2: 1, emote: 0.5 };
const PUNCH_CYCLE = ["hero-stamp", "shake", "radial-burst", "shake", "hero-stamp", "emote"];
const STAMP_COLORS = ["yellow", "teal", "pink", "orange", "green", "white"];
const STAMP_GAP = 1.6, STAMP_MAX_CHARS = 11;
/** How much punctuation a beat list carries (hero-stamp, shake, burst, radial-burst, flash when enabled, x2 = 1; emote = 0.5). */
export const punchLoad = (beats, flashOn = false) => beats.reduce((a, b) => a + (b.do === "flash" && !flashOn ? 0 : PUNCH_WEIGHT[b.do] ?? 0), 0);
const isPunch = (b, flashOn) => (PUNCH_WEIGHT[b.do] ?? 0) > 0 && (b.do !== "flash" || flashOn);
const clean = (s) => String(s ?? "").replace(/[^\p{L}\p{N}]/gu, "");

/**
 * @param {{ t0:number, t1:number, beats:Array<{t:number,do:string}>, words:Array<{text:string,start:number,end:number}>, propIds?:string[], castIds?:string[], flash?:boolean, hook?:boolean }} a
 * `hook`: true for the first world, which also gets a stamp on its first strong word (hook in the first 2.5 s).
 * @returns {Array<object>} beats to add (`auto: true`), sorted by time
 */
export function punctuate({ t0, t1, beats, words, propIds = [], castIds = ["hero"], flash = false, hook = false }) {
  const span = t1 - t0;
  if (!(span > 0)) return [];
  const load = punchLoad(beats, flash), rate = load / span;
  const needHook = hook && !beats.some((b) => b.do === "hero-stamp" && b.t < t0 + 2.5);
  if (rate >= PUNCH_MIN_PER_SEC && !needHook) return [];
  let need = Math.max(needHook ? 1 : 0, Math.ceil(span * PUNCH_AIM_PER_SEC - 1e-9 - load));
  if (need <= 0) return [];
  const occ = {};
  const strong = words.map((w, i) => { const k = nw(w.text); occ[k] = (occ[k] ?? 0) + 1; return { w, k, n: occ[k], i }; })
    .filter(({ w, k }) => w.start >= t0 + 0.2 && w.start <= t1 - 0.5 && (/\d/.test(k) || (k.length >= 4 && !SKIP_WORDS.has(k))))
    .map((c) => ({ ...c, score: (/\d/.test(c.k) ? 3 : 0) + (c.k.length >= 7 ? 2 : 1) + (/[.!?:]$/.test(c.w.text.trim()) ? 1 : 0) }));
  if (!strong.length) return [];
  const added = [], punchT = beats.filter((b) => isPunch(b, flash)).map((b) => b.t), stampT = beats.filter((b) => b.do === "hero-stamp").map((b) => b.t);
  const others = castIds.filter((c) => c !== "hero");
  let ki = 0, pi = 0, ci = 0;
  const make = (cand, kind) => {
    const word = clean(cand.w.text), b = { t: +cand.w.start.toFixed(3), do: kind, on: { word, n: cand.n }, auto: true };
    if (kind === "hero-stamp") { b.text = word.toUpperCase(); b.color = STAMP_COLORS[ci++ % STAMP_COLORS.length]; }
    else if (kind === "shake") b.amp = 3;
    else if (kind === "radial-burst") { if (propIds.length) b.target = propIds[pi++ % propIds.length]; }
    else if (kind === "emote") { b.who = others.length ? others[ci % others.length] : "hero"; b.symbol = ["!", "star", "idea", "heart"][ci++ % 4]; }
    return b;
  };
  const pick = (kindOk) => {
    const pts = [t0, ...punchT.slice().sort((a, b) => a - b), t1];
    let gap = null;
    for (let i = 0; i + 1 < pts.length; i++) { const g = pts[i + 1] - pts[i]; if (!gap || g > gap.g) gap = { g, mid: (pts[i] + pts[i + 1]) / 2 }; }
    if (!gap || gap.g < 0.9) return null;
    const free = strong.filter((c) => punchT.every((t) => Math.abs(t - c.w.start) >= 0.45) && kindOk(c));
    if (!free.length) return null;
    free.sort((a, b) => Math.abs(a.w.start - gap.mid) - Math.abs(b.w.start - gap.mid) || b.score - a.score);
    return free[0];
  };
  const stampOk = (c) => clean(c.w.text).length >= 3 && clean(c.w.text).length <= STAMP_MAX_CHARS && stampT.every((t) => Math.abs(t - c.w.start) >= STAMP_GAP);
  if (needHook) {
    const first = strong.filter((c) => c.w.start < t0 + 2.5 && stampOk(c) && punchT.every((t) => Math.abs(t - c.w.start) >= 0.45)).sort((a, b) => b.score - a.score || a.w.start - b.w.start)[0];
    if (first) { const b = make(first, "hero-stamp"); added.push(b); punchT.push(b.t); stampT.push(b.t); need--; }
  }
  while (need-- > 0) {
    let kind = PUNCH_CYCLE[ki++ % PUNCH_CYCLE.length];
    if (flash && ki % 5 === 0) kind = "flash";
    let c = pick(kind === "hero-stamp" ? stampOk : () => true);
    if (!c && kind === "hero-stamp") { kind = "shake"; c = pick(() => true); }
    if (!c) break;
    const b = make(c, kind); added.push(b); punchT.push(b.t); if (kind === "hero-stamp") stampT.push(b.t);
  }
  return added.sort((a, b) => a.t - b.t);
}

const IMPACT = ["hero-stamp", "radial-burst", "burst", "push"];
/** The small screen shake that accompanies each impact beat (stamp, burst, radial burst, push) that has none within 0.3 s. Silent (no sfx). */
export function deriveShakes(beats) {
  const shakes = beats.filter((b) => b.do === "shake").map((b) => b.t), added = [];
  for (const b of beats.slice().sort((a, c) => a.t - c.t)) {
    if (!IMPACT.includes(b.do)) continue;
    if (shakes.some((t) => t >= b.t - 0.1 && t <= b.t + 0.3)) continue;
    const s = { t: b.t, do: "shake", amp: b.do === "hero-stamp" ? 3 : 2, auto: true, ambient: true, on: b.on };
    added.push(s); shakes.push(s.t);
  }
  return added;
}

export const FLASH_MAX_PER_10S = 3, FLASH_MIN_START = 0.5, FLASH_MIN_GAP = 0.5;
/** Photosensitivity guard: no flash before 0.5 s, at most 3 per 10 s window, at least 0.5 s apart. Returns the times to keep and drop. */
export function capFlashes(times) {
  const kept = [], dropped = [];
  for (const t of times.slice().sort((a, b) => a - b)) {
    const ok = t >= FLASH_MIN_START && kept.every((k) => t - k >= FLASH_MIN_GAP) && kept.filter((k) => t - k < 10).length < FLASH_MAX_PER_10S;
    (ok ? kept : dropped).push(t);
  }
  return { kept, dropped };
}

// ---------------------------------------------------------------------------------------------------------------------
// Style advisor. Never overrides the model's choice (content is the model's): it only reports a warning when `hf.style` is
// missing, or when a retro-only (monochrome / 4-tone) style is chosen for a topic that does not ask for a retro look.
// `text` is the narration (plus title/topic when known). Pure function; the input payload is not mutated.
// ---------------------------------------------------------------------------------------------------------------------
export function styleAdvice(hf, text = "") {
  const style = isObj(hf) ? hf.style : undefined, out = [];
  const topic = flat(text), rec = recommendStyles(text).join(", ");
  if (style === undefined || style === null || style === "") {
    out.push(`hf.style is missing: the engine default pixel-snes-16bit applies. For this topic prefer: ${rec}.`);
    return out;
  }
  const g = STYLE_GUIDE[style];
  if (g?.retroOnly && !RETRO_RE.test(` ${topic} `)) out.push(`${style} is a monochrome style (progress bars and colour coding read poorly) and the topic does not ask for a retro or handheld look; it is kept as chosen. For this topic prefer: ${rec}. Use monochrome styles only when the user asks for retro/handheld.`);
  return out;
}
