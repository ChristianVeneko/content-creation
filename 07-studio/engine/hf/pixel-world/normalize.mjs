// Lenient authoring: maps the slips an LLM makes in the payload to valid values without dropping content.
// Anything it cannot map is left untouched so the schema reports a precise error instead of guessing.
import { loadCatalog, BEAT_KINDS, PROP_ACTS, EMOTES, TRANSITIONS, TIMES, COLORS, SIZES, LAYOUTS, getScenario } from "./catalog.mjs";
import { STYLES } from "./styles.mjs";

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
    const terms = new Set([...toks(c.id), ...toks(c.name), ...(c.keywords ?? []).flatMap(toks)]);
    let s = 0;
    for (const t of vt) { if (terms.has(t)) s += 2; else for (const k of terms) if (k.length >= 4 && t.length >= 4 && (k.startsWith(t) || t.startsWith(k) || k.slice(0, 4) === t.slice(0, 4))) { s += 1; break; } }
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
  const props = getScenario(w.scenario)?.props ?? [];
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
  if (out.flash !== undefined && typeof out.flash !== "boolean") out.flash = out.flash === "true" || out.flash === 1;
  if (isObj(out.brand)) { out.brand = { ...out.brand }; if (typeof out.brand.handle === "string" && out.brand.handle && !out.brand.handle.startsWith("@")) out.brand.handle = "@" + out.brand.handle; if (typeof out.brand.follow === "string") out.brand.follow = { word: out.brand.follow }; if (out.brand.follow === true) delete out.brand.follow; }
  else if (typeof out.brand === "string") out.brand = { handle: out.brand.startsWith("@") ? out.brand : "@" + out.brand };
  const castIds = ["hero", ...cat.heroes.map((h) => h.id), ...cat.npcs.map((n) => n.id)];
  if (Array.isArray(out.worlds)) out.worlds = out.worlds.map((w0) => {
    if (!isObj(w0)) return w0;
    const w = { ...w0 };
    if (w.scenario === undefined && typeof (w.scene ?? w.world ?? w.id) === "string") { w.scenario = w.scene ?? w.world ?? w.id; delete w.scene; delete w.world; }
    if (typeof w.scenario === "string") w.scenario = nearest(w.scenario, cat.scenarios.map((s) => ({ id: s.id, name: s.name, keywords: s.keywords })), {}) ?? w.scenario;
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
      if (typeof c.at === "string") { const k = flat(c.at); if (["left", "center", "right"].includes(k)) c.at = k; else { const props = getScenario(w.scenario)?.props ?? []; if (!props.some((p) => p.id === c.at)) c.at = nearest(c.at, props.map((p) => ({ id: p.id, name: p.id, keywords: toks(p.about) }))) ?? c.at; } }
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
