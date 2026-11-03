// Lenient authoring: maps the slips an LLM makes in the payload to valid values without dropping content.
// Anything it cannot map is left untouched so the schema reports a precise error instead of guessing.
import { BEAT_KINDS, EMOTES, TRANSITIONS, MOODS, SIZES, SHOT_KINDS, MOVE_KINDS, SETTING_IDS, HERO_IDS, ANCHOR_IDS, SETTINGS, propIds, anchorIds, kindActs, settingProps } from "./catalog.mjs";
import { STYLE_IDS } from "./styles.mjs";

const flat = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const lev = (a, b) => { const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };

/** Closest id for a free-text value: exact (ignoring case, accents, dashes), alias, token containment, then edit distance. */
export function nearest(value, ids, aliases = {}) {
  const v = flat(value); if (!v) return null;
  const key = (s) => flat(s).replace(/ /g, "");
  const hit = ids.find((id) => key(id) === key(v)); if (hit) return hit;
  const al = aliases[v] ?? aliases[key(v)]; if (al && ids.includes(al)) return al;
  for (const t of v.split(" ")) { const a = aliases[t]; if (a && ids.includes(a)) return a; }
  const near = ids.map((id) => [id, lev(key(id), key(v))]).sort((a, b) => a[1] - b[1])[0];
  if (near && near[1] <= Math.max(1, Math.floor(key(near[0]).length / 4))) return near[0];
  return null;
}

const STYLE_ALIAS = { clay: "clay-diorama", claymation: "clay-diorama", plasticine: "clay-diorama", plastilina: "clay-diorama", diorama: "clay-diorama", arcilla: "clay-diorama" };
const HERO_ALIAS = { robot: "robo", robots: "robo", bot: "robo", android: "robo", man: "alex", hombre: "alex", beard: "alex", character: "robo", personaje: "robo", default: "robo" };
const SETTING_ALIAS = {
  oficina: "desk", escritorio: "desk", office: "desk", pc: "desk", computadora: "desk", computador: "desk", ordenador: "desk", laptop: "desk", home: "desk", workspace: "desk", mesa: "desk", casa: "desk", room: "desk", cuarto: "desk",
  servidor: "server-room", servidores: "server-room", server: "server-room", servers: "server-room", datacenter: "server-room", "data center": "server-room", nube: "server-room", cloud: "server-room", cooling: "server-room", sala: "server-room",
  calle: "street", ciudad: "street", city: "street", road: "street", traffic: "street", trafico: "street", transito: "street", carretera: "street", avenida: "street", urbano: "street", red: "street", network: "street",
  cocina: "kitchen", restaurante: "kitchen", cooking: "kitchen", chef: "kitchen", food: "kitchen",
  almacen: "warehouse", bodega: "warehouse", deposito: "warehouse", storage: "warehouse", galpon: "warehouse", inventario: "warehouse", memoria: "warehouse", logistica: "warehouse",
};
const MOOD_ALIAS = { calido: "warm", cálido: "warm", calida: "warm", warm: "warm", cozy: "warm", dia: "warm", day: "warm", frio: "cool", fria: "cool", cold: "cool", blue: "cool", azul: "cool", calm: "cool", calmo: "cool", noche: "night", nocturno: "night", dark: "night", oscuro: "night", alerta: "alert", peligro: "alert", danger: "alert", red: "alert", rojo: "alert", tension: "alert", error: "alert", crisis: "alert" };
const DO_ALIAS = {
  glow: "light-up", light: "light-up", lightup: "light-up", "light up": "light-up", highlight: "light-up", on: "light-up", turn: "light-up", brillar: "light-up", enciende: "light-up", encender: "light-up", prende: "light-up",
  off: "dim", dark: "dim", apagar: "dim", apaga: "dim", darken: "dim",
  appear: "pop-in", show: "pop-in", spawn: "pop-in", popin: "pop-in", enter: "pop-in", aparece: "pop-in", aparecer: "pop-in", add: "pop-in", reveal: "pop-in",
  disappear: "pop-out", hide: "pop-out", popout: "pop-out", vanish: "pop-out", remove: "pop-out", desaparece: "pop-out", exit: "pop-out",
  grow: "grow", bigger: "grow", enlarge: "grow", expand: "grow", scale: "grow", crece: "grow", crecer: "grow", swell: "grow", inflate: "grow",
  shrink: "shrink", smaller: "shrink", reduce: "shrink", encoge: "shrink", shrinking: "shrink",
  bounce: "pulse", throb: "pulse", beat: "pulse", heartbeat: "pulse", flash: "pulse", blink: "pulse", pulsa: "pulse", wobble: "pulse", jump: "pulse",
  tremble: "shake", vibrate: "shake", jitter: "shake", rattle: "shake", panic: "shake", tiembla: "shake", overload: "shake",
  explode: "burst", explosion: "burst", sparks: "burst", confetti: "burst", puff: "burst", steam: "burst", smoke: "burst", estalla: "burst", boom: "burst",
  travel: "move", go: "move", slide: "move", drive: "move", transfer: "move", fly: "move", mueve: "move", send: "move", carry: "move",
  spinning: "spin", rotate: "spin", turnaround: "spin", gira: "spin", girar: "spin", race: "spin", whirl: "spin",
  unlock: "open", opens: "open", abre: "open", abrir: "open", launch: "open",
  shut: "close", closes: "close", cierra: "close", cerrar: "close",
  level: "fill", load: "fill", progress: "fill", fills: "fill", llena: "fill", llenar: "fill", charge: "fill", meter: "fill", set: "fill",
  overheat: "heat", hot: "heat", burn: "heat", warm: "heat", calienta: "heat", calentar: "heat", heating: "heat", temperature: "heat",
  chill: "cool", cooldown: "cool", cooling: "cool", enfria: "cool", freeze: "cool",
  stroll: "walk", run: "walk", camina: "walk", caminar: "walk", goto: "walk", approach: "walk",
  react: "emote", gesture: "emote", animation: "emote", anim: "emote", saluda: "emote", greet: "emote",
  face: "look", gaze: "look", watch: "look", mira: "look", turnto: "look", lookat: "look",
  tag: "label", caption: "label", name: "label", etiqueta: "label", annotate: "label", callout: "label",
  title: "stamp", headline: "stamp", banner: "stamp", sello: "stamp", word: "stamp", bigtext: "stamp", text: "stamp",
};
const EMOTE_ALIAS = { hello: "wave", hi: "wave", greet: "wave", greeting: "wave", saluda: "wave", hola: "wave", ok: "thumbs-up", thumbsup: "thumbs-up", like: "thumbs-up", good: "thumbs-up", bien: "thumbs-up", nod: "yes", si: "yes", agree: "yes", nope: "no", shake: "no", deny: "no", niega: "no", hop: "jump", leap: "jump", jumping: "jump", celebrate: "dance", party: "dance", happy: "dance", baila: "dance", fall: "faint", die: "faint", death: "faint", collapse: "faint", dead: "faint", crash: "faint", sleep: "faint", sentado: "sit", sitting: "sit", seat: "sit", standing: "stand", up: "stand", hit: "punch", attack: "punch", golpe: "punch", panic: "jump", surprise: "jump", shock: "jump" };
const TRANSITION_ALIAS = { circle: "iris", circular: "iris", wipe: "slide", swipe: "slide", push: "slide", curtain: "drop", fall: "drop", bounce: "pop", zoom: "pop", fade: "iris", cut: "pop", dissolve: "iris" };
const SHOT_ALIAS = { "primer plano": "close", closeup: "close", "close up": "close", macro: "close", detail: "close", detalle: "close", full: "wide", establishing: "wide", general: "wide", "plano general": "wide", master: "wide", panoramic: "wide", mid: "medium", "plano medio": "medium", normal: "medium", hero: "low", heroic: "low", contrapicado: "low", picado: "top", aerial: "top", overhead: "top", bird: "top", ots: "over-shoulder", "over the shoulder": "over-shoulder", shoulder: "over-shoulder", "sobre el hombro": "over-shoulder" };
const MOVE_ALIAS = { "zoom in": "dolly-in", zoomin: "dolly-in", in: "dolly-in", approach: "dolly-in", "acercar": "dolly-in", "zoom out": "dolly-out", zoomout: "dolly-out", out: "dolly-out", back: "dolly-out", away: "dolly-out", pan: "truck", slide: "truck", lateral: "truck", rotate: "orbit", spin: "orbit", around: "orbit", circle: "orbit", rise: "crane", up: "crane", rising: "crane", push: "push", forward: "push", slow: "drift", float: "drift", static: "drift", still: "drift", hold: "drift", none: "drift", ease: "drift" };
const POS_ALIAS = { izquierda: "left", izq: "left", derecha: "right", der: "right", centro: "center", middle: "center", centre: "center", frente: "front", adelante: "front", atras: "back", fondo: "back", background: "back", foreground: "front" };
const SIZE_ALIAS = { small: "S", chico: "S", pequeno: "S", pequeño: "S", tiny: "S", s: "S", medium: "M", mediano: "M", normal: "M", m: "M", large: "L", big: "L", grande: "L", l: "L", huge: "L" };
const PROP_ALIAS = {
  monitor: "monitor", pantalla: "monitor", screen: "monitor", display: "monitor", window: "monitor", windows: "monitor", ventanas: "monitor", programas: "monitor", apps: "monitor", app: "monitor", computer: "monitor",
  tower: "tower", pc: "tower", cpu: "tower", torre: "tower", case: "tower", computadora: "tower", computador: "tower", ordenador: "tower", procesador: "tower", processor: "tower", chip: "tower", gabinete: "tower",
  ram: "ram-stick", memoria: "ram-stick", memory: "ram-stick", "ram stick": "ram-stick", ramstick: "ram-stick", dimm: "ram-stick", modulo: "ram-stick",
  lampara: "lamp", luz: "lamp", light: "lamp", reloj: "clock", alarm: "clock", timer: "timer", temporizador: "timer", cronometro: "timer",
  termometro: "thermometer", temperature: "thermometer", temperatura: "thermometer", thermo: "thermometer", heat: "thermometer", calor: "thermometer",
  disk: "hard-disk", disco: "hard-disk", hdd: "hard-disk", harddisk: "hard-disk", ssd: "hard-disk", platter: "hard-disk", storage: "hard-disk", almacenamiento: "hard-disk",
  ventilador: "fan", cooling: "fan", rack: "rack-2", server: "rack-2", servidor: "rack-2", racks: "rack-2", alarma: "beacon", alarm_light: "beacon", sirena: "beacon", siren: "beacon", alert: "beacon",
  car: "taxi", coche: "taxi", carro: "taxi", auto: "taxi", taxi: "taxi", camion: "truck", truck: "truck", semaforo: "traffic-light", "traffic light": "traffic-light", trafficlight: "traffic-light", light_: "traffic-light", cono: "barrier", barrera: "barrier", senal: "sign", signal: "sign", cartel: "sign",
  olla: "pot", pot: "pot", cacerola: "pot", estufa: "stove", cocina: "stove", horno: "stove", oven: "stove", nevera: "fridge", refrigerador: "fridge", heladera: "fridge", frigorifico: "fridge", manzana: "apple-1", apple: "apple-1", fruta: "apple-1", ingrediente: "apple-1",
  caja: "crate-1", box: "crate-1", crate: "crate-1", cajas: "crate-1", paquete: "crate-1", estante: "shelf-l", shelf: "shelf-l", estanteria: "shelf-l", puerta: "door", garage: "door", barril: "barrel", muelle: "truck",
};
const WORLD_PROP_HINT = { "ram-stick": ["ram", "memoria", "memory"], "rack-1": ["rack", "server"], "crate-1": ["caja", "crate", "box"] };

function num(v) { if (typeof v === "number") return v; if (typeof v === "string") { const m = v.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*(%|s|seg|sec)?$/i); if (m) { const n = parseFloat(m[1].replace(",", ".")); return m[2] === "%" ? n / 100 : n; } } return v; }
function fixRef(v, aliasWordOnly = true) {
  if (v == null) return v;
  if (typeof v === "string") { const s = v.trim(); return s ? { word: s } : undefined; }
  if (typeof v === "number") return { at: v };
  if (!isObj(v)) return v;
  const o = { ...v };
  if (o.n !== undefined) o.n = Math.max(1, Math.round(Number(num(o.n))) || 1);
  if (o.at !== undefined) o.at = Number(num(o.at));
  if (o.offset !== undefined) o.offset = Number(num(o.offset));
  if (typeof o.word === "string") o.word = o.word.trim();
  if (o.word === undefined && o.text !== undefined) { o.word = String(o.text).trim(); delete o.text; }
  return o;
}

/** Target id for a free-text prop reference inside a setting (exact id, alias of a kind, then fuzzy). */
export function resolveTarget(setting, value) {
  const ids = propIds(setting); if (!ids.length) return value;
  const v = flat(value); if (!v) return value;
  const key = (s) => flat(s).replace(/ /g, "");
  const exact = ids.find((id) => key(id) === key(v)); if (exact) return exact;
  const alias = PROP_ALIAS[v] ?? PROP_ALIAS[key(v)];
  const cand = [];
  if (alias) cand.push(alias);
  for (const t of v.split(" ")) if (PROP_ALIAS[t]) cand.push(PROP_ALIAS[t]);
  for (const c of cand) {
    if (ids.includes(c)) return c;
    const base = c.replace(/-?\d+$|-[lr]$/, "");
    const sibling = ids.find((id) => id.replace(/-?\d+$|-[lr]$/, "") === base || settingProps(setting)[id].model === base || settingProps(setting)[id].kind === base);
    if (sibling) return sibling;
  }
  const f = nearest(v, ids); return f ?? value;
}

function normBeat(b, setting) {
  if (!isObj(b)) return b;
  const o = { ...b };
  for (const k of ["type", "action", "act", "kind", "effect", "verb"]) if (o.do === undefined && o[k] !== undefined) { o.do = o[k]; delete o[k]; }
  for (const k of ["prop", "object", "item", "obj"]) if (o.target === undefined && o[k] !== undefined) { o.target = o[k]; delete o[k]; }
  for (const k of ["character", "actor", "cast", "who_"]) if (o.who === undefined && typeof o[k] === "string") { o.who = o[k]; delete o[k]; }
  if (o.on === undefined) for (const k of ["when", "word", "at", "time", "t", "trigger", "start"]) if (o[k] !== undefined) {
    o.on = (k === "word" || k === "trigger") ? (isObj(o[k]) ? o[k] : { word: String(o[k]) }) : (typeof o[k] === "number" || /^\s*-?\d/.test(String(o[k])) ? { at: Number(num(o[k])) } : fixRef(o[k]));
    delete o[k]; if (o.n !== undefined && isObj(o.on)) { o.on.n = o.n; delete o.n; } break;
  }
  o.on = fixRef(o.on);
  if (typeof o.do === "string") {
    const raw = o.do.trim(), direct = flat(raw).replace(/ /g, "-");
    o.do = BEAT_KINDS.includes(direct) ? direct : (DO_ALIAS[flat(raw)] ?? DO_ALIAS[flat(raw).replace(/ /g, "")] ?? nearest(raw, BEAT_KINDS) ?? raw);
  }
  if (o.value !== undefined) { let v = num(o.value); if (typeof v === "number" && o.do === "fill" && v > 1 && v <= 100) v /= 100; o.value = v; }
  for (const k of ["amount", "dur", "hold"]) if (o[k] !== undefined) o[k] = num(o[k]);
  if (typeof o.text === "string") o.text = o.text.trim();
  if (o.do === "label" && o.text === undefined && typeof o.label === "string") { o.text = o.label.trim(); delete o.label; }
  if (o.do === "stamp" && o.text === undefined && typeof o.label === "string") { o.text = o.label.trim(); delete o.label; }
  if (typeof o.symbol === "string") { const s = flat(o.symbol).replace(/ /g, "-"); o.symbol = EMOTES.includes(s) ? s : (EMOTE_ALIAS[flat(o.symbol)] ?? nearest(o.symbol, EMOTES, EMOTE_ALIAS) ?? o.symbol); }
  if (o.do === "emote" && o.symbol === undefined && typeof o.emote === "string") { o.symbol = EMOTE_ALIAS[flat(o.emote)] ?? nearest(o.emote, EMOTES) ?? o.emote; delete o.emote; }
  if (o.do === "emote" && o.symbol === undefined && typeof o.text === "string") { const s = EMOTES.includes(flat(o.text)) ? flat(o.text) : EMOTE_ALIAS[flat(o.text)]; if (s) { o.symbol = s; delete o.text; } }
  if (o.do === "walk" || o.do === "move") { if (o.to === undefined && o.target !== undefined && o.do === "walk") { o.to = o.target; delete o.target; } }
  if (typeof o.target === "string") { const t = o.target.trim(); o.target = (["hero", "cast"].includes(t.toLowerCase()) && ["walk", "emote", "look"].includes(o.do)) ? undefined : resolveTarget(setting, t); if (o.target === undefined) { delete o.target; if (o.who === undefined) o.who = "hero"; } }
  if (typeof o.to === "string") { const t = o.to.trim(), k = flat(t); const pos = POS_ALIAS[k] ?? (ANCHOR_IDS.includes(k) ? k : null); o.to = pos ?? (anchorIds(setting).includes(t) ? t : resolveTarget(setting, t)); }
  if (typeof o.who === "string") { const k = flat(o.who).replace(/ /g, ""); o.who = (k === "hero" || k === "protagonist" || k === "personaje" || k === "main") ? "hero" : (HERO_IDS.includes(k) ? k : (nearest(o.who, HERO_IDS, HERO_ALIAS) ?? o.who)); }
  for (const k of ["label_", "emote", "who_"]) if (o[k] !== undefined && k !== "emote") delete o[k];
  if (o.do !== "emote" && o.emote !== undefined) delete o.emote;
  return o;
}

function normCast(c, hero) {
  if (typeof c === "string") c = { who: c };
  if (!isObj(c)) return c;
  const o = { ...c };
  if (typeof o.who === "string") { const k = flat(o.who).replace(/ /g, ""); const id = k === "hero" ? "hero" : (HERO_IDS.includes(k) ? k : (nearest(o.who, HERO_IDS, HERO_ALIAS) ?? o.who)); o.who = (id === hero) ? "hero" : id; }
  if (typeof o.at === "string") { const k = flat(o.at); o.at = POS_ALIAS[k] ?? (ANCHOR_IDS.includes(k) ? k : o.at.trim()); }
  if (typeof o.size === "string") o.size = SIZE_ALIAS[flat(o.size)] ?? (SIZES.includes(o.size.toUpperCase()) ? o.size.toUpperCase() : o.size);
  return o;
}
function normShot(s, setting) {
  if (!isObj(s)) return s;
  const o = { ...s };
  for (const k of ["type", "shot", "framing", "angle"]) if (o.kind === undefined && o[k] !== undefined) { o.kind = o[k]; delete o[k]; }
  for (const k of ["movement", "motion", "camera"]) if (o.move === undefined && typeof o[k] === "string") { o.move = o[k]; delete o[k]; }
  if (o.from === undefined) for (const k of ["on", "when", "at", "time", "start"]) if (o[k] !== undefined) { o.from = typeof o[k] === "number" || /^\s*-?\d/.test(String(o[k])) ? Number(num(o[k])) : fixRef(o[k]); delete o[k]; break; }
  if (isObj(o.from) || typeof o.from === "string") o.from = fixRef(o.from);
  if (typeof o.kind === "string") { const f = flat(o.kind); o.kind = SHOT_KINDS.includes(f.replace(/ /g, "-")) ? f.replace(/ /g, "-") : (SHOT_ALIAS[f] ?? nearest(o.kind, SHOT_KINDS, SHOT_ALIAS) ?? o.kind); }
  if (typeof o.move === "string") { const f = flat(o.move); o.move = MOVE_KINDS.includes(f.replace(/ /g, "-")) ? f.replace(/ /g, "-") : (MOVE_ALIAS[f] ?? MOVE_ALIAS[f.replace(/ /g, "")] ?? nearest(o.move, MOVE_KINDS, MOVE_ALIAS) ?? o.move); }
  if (typeof o.target === "string") { const t = flat(o.target); o.target = (t === "hero" || ANCHOR_IDS.includes(t)) ? t : resolveTarget(setting, o.target); }
  return o;
}

function normWorld(w, hero) {
  if (!isObj(w)) return w;
  const o = { ...w };
  for (const k of ["scene", "scenario", "set", "environment", "world", "place", "location", "stage"]) if (o.setting === undefined && typeof o[k] === "string") { o.setting = o[k]; delete o[k]; }
  if (typeof o.setting === "string") { const t = o.setting.trim(), f = flat(t); o.setting = SETTING_IDS.includes(f.replace(/ /g, "-")) ? f.replace(/ /g, "-") : (SETTING_ALIAS[f] ?? SETTING_ALIAS[f.replace(/ /g, "")] ?? nearest(t, SETTING_IDS, SETTING_ALIAS) ?? t); }
  if (typeof o.mood === "string") { const f = flat(o.mood); o.mood = MOODS.includes(f) ? f : (MOOD_ALIAS[f] ?? nearest(o.mood, MOODS, MOOD_ALIAS) ?? o.mood); }
  for (const k of ["light", "lighting", "time"]) if (o.mood === undefined && typeof o[k] === "string") { const f = flat(o[k]); const m = MOODS.includes(f) ? f : MOOD_ALIAS[f]; if (m) { o.mood = m; delete o[k]; } }
  if (o.from !== undefined || o.start !== undefined) { const v = o.from ?? o.start; delete o.start; o.from = typeof v === "number" || /^\s*-?\d/.test(String(v)) ? Number(num(v)) : fixRef(v); }
  if (typeof o.transition === "string") { const f = flat(o.transition); o.transition = TRANSITIONS.includes(f) ? f : (TRANSITION_ALIAS[f] ?? nearest(o.transition, TRANSITIONS, TRANSITION_ALIAS) ?? o.transition); }
  if (Array.isArray(o.cast)) o.cast = o.cast.map((c) => normCast(c, hero));
  const setting = o.setting;
  if (Array.isArray(o.shots)) o.shots = o.shots.map((s) => normShot(s, setting));
  if (o.beats === undefined && Array.isArray(o.events)) { o.beats = o.events; delete o.events; }
  o.beats = Array.isArray(o.beats) ? o.beats.map((b) => normBeat(b, setting)) : [];
  return o;
}

/** Lenient fixes for the whole payload. Idempotent: normalizing a normalized payload changes nothing. */
export function normalizePayload(raw) {
  if (!isObj(raw)) return {};
  const o = { ...raw };
  if (typeof o.style === "string") { const f = flat(o.style).replace(/ /g, "-"); o.style = STYLE_IDS.includes(f) ? f : (STYLE_ALIAS[flat(o.style)] ?? nearest(o.style, STYLE_IDS, STYLE_ALIAS) ?? o.style); }
  else if (o.style === undefined) o.style = "clay-diorama";
  if (typeof o.hero === "string") { const k = flat(o.hero).replace(/ /g, ""); o.hero = HERO_IDS.includes(k) ? k : (nearest(o.hero, HERO_IDS, HERO_ALIAS) ?? o.hero); }
  if (typeof o.camera === "string") { const f = flat(o.camera); o.camera = ["calm", "dynamic"].includes(f) ? f : (/calm|slow|suave|still/.test(f) ? "calm" : /dyn|fast|energ|din/.test(f) ? "dynamic" : o.camera); }
  if (o.worlds === undefined) for (const k of ["scenes", "scenarios", "sets"]) if (Array.isArray(o[k])) { o.worlds = o[k]; delete o[k]; break; }
  if (Array.isArray(o.worlds)) o.worlds = o.worlds.map((w) => normWorld(w, typeof o.hero === "string" ? o.hero : "robo"));
  return o;
}

/** Spec-level hook (registry): normalizes `spec.hf`. */
export function normalize(spec) {
  if (!isObj(spec)) return spec;
  return { ...spec, hf: normalizePayload(spec.hf ?? {}) };
}
