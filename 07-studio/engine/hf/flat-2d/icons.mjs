// Icons come ONLY from Phosphor (MIT, @phosphor-icons/core in the engine's node_modules). Paths are read at compose
// time and inlined, so the composition has no icon files to fetch. The license is copied next to the assets.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CORE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", "@phosphor-icons", "core");

export const ICON_NAMES = [
  "globe", "hard-drives", "house-line", "lock-simple", "lock-simple-open", "check-circle", "x-circle", "warning", "lightning", "cursor-click",
  "keyboard", "laptop", "magnifying-glass", "paper-plane-tilt", "chat-circle-text", "bell", "envelope-simple", "calendar-blank", "chart-line-up",
  "chart-bar", "chart-pie", "database", "cloud", "cpu", "wifi-high", "shield-check", "key", "user", "users", "storefront", "shopping-cart",
  "credit-card", "currency-dollar", "coins", "trophy", "star", "heart", "fire", "lightbulb", "question", "exclamation-mark", "smiley", "smiley-sad",
  "thumbs-up", "play-circle", "camera", "image", "file-html", "file-css", "code", "gear", "gauge", "timer", "clock", "stack", "package", "truck",
  "airplane-tilt", "bank", "first-aid-kit", "stethoscope", "graduation-cap", "chef-hat", "scissors", "cooking-pot", "factory", "buildings", "house",
  "wrench", "robot", "brain", "sparkle", "rocket", "target", "flag", "map-pin", "bag", "receipt", "barcode", "music-note", "device-mobile",
  "lock-key", "bug", "siren", "hourglass", "arrow-right", "arrow-down", "arrows-clockwise", "link", "list-bullets", "table", "folder-open",
  "book-open-text", "sun", "moon", "wallet", "fingerprint", "share-network", "plugs-connected", "battery-full", "plant", "coffee", "hand-pointing",
  "handshake", "megaphone", "newspaper", "certificate", "seal-check", "ticket", "suitcase-rolling", "bread", "pizza", "eye-slash", "radio",
];
export const ICON_SET = new Set(ICON_NAMES);

/** Common slips an LLM makes, mapped to a valid Phosphor name. */
export const ICON_ALIASES = {
  lightbulb: "lightbulb", "light-bulb": "lightbulb", bulb: "lightbulb", idea: "lightbulb", server: "hard-drives", servers: "hard-drives", disk: "hard-drives",
  home: "house", "home-line": "house-line", padlock: "lock-simple", lock: "lock-simple", unlock: "lock-simple-open", "lock-open": "lock-simple-open",
  check: "check-circle", tick: "check-circle", ok: "check-circle", yes: "check-circle", cross: "x-circle", x: "x-circle", no: "x-circle", error: "x-circle",
  alert: "warning", danger: "warning", bolt: "lightning", flash: "lightning", cursor: "cursor-click", click: "cursor-click", mouse: "cursor-click",
  search: "magnifying-glass", magnifier: "magnifying-glass", send: "paper-plane-tilt", plane: "airplane-tilt", chat: "chat-circle-text", message: "chat-circle-text",
  mail: "envelope-simple", email: "envelope-simple", calendar: "calendar-blank", chart: "chart-line-up", graph: "chart-line-up", bars: "chart-bar", pie: "chart-pie",
  db: "database", wifi: "wifi-high", shield: "shield-check", person: "user", people: "users", team: "users", shop: "storefront", store: "storefront", cart: "shopping-cart",
  card: "credit-card", money: "currency-dollar", dollar: "currency-dollar", cash: "coins", coin: "coins", win: "trophy", prize: "trophy", love: "heart", flame: "fire",
  "question-mark": "question", "?": "question", "!": "exclamation-mark", exclamation: "exclamation-mark", happy: "smiley", sad: "smiley-sad", like: "thumbs-up",
  play: "play-circle", photo: "image", picture: "image", html: "file-html", css: "file-css", settings: "gear", cog: "gear", speed: "gauge", time: "clock", box: "package",
  delivery: "truck", hospital: "first-aid-kit", doctor: "stethoscope", school: "graduation-cap", chef: "chef-hat", cook: "cooking-pot", building: "buildings",
  tool: "wrench", ai: "robot", bot: "robot", sparkles: "sparkle", magic: "sparkle", goal: "target", pin: "map-pin", location: "map-pin", shopping: "bag",
  phone: "device-mobile", mobile: "device-mobile", password: "lock-key", virus: "bug", alarm: "siren", wait: "hourglass", next: "arrow-right", down: "arrow-down",
  refresh: "arrows-clockwise", sync: "arrows-clockwise", url: "link", list: "list-bullets", folder: "folder-open", book: "book-open-text", day: "sun", night: "moon",
  fingerprint: "fingerprint", network: "share-network", connect: "plugs-connected", battery: "battery-full", tree: "plant", point: "hand-pointing", deal: "handshake",
  news: "newspaper", diploma: "certificate", verified: "seal-check", suitcase: "suitcase-rolling", luggage: "suitcase-rolling", antenna: "radio",
};

const cache = new Map();
const readIcon = (name, weight) => {
  const key = weight + "/" + name;
  if (cache.has(key)) return cache.get(key);
  const file = join(CORE, "assets", weight, weight === "regular" ? `${name}.svg` : `${name}-${weight}.svg`);
  const inner = existsSync(file) ? /<svg[^>]*>([\s\S]*)<\/svg>/.exec(readFileSync(file, "utf8"))[1] : null;
  cache.set(key, inner);
  return inner;
};

/** Inline SVG markup for a Phosphor icon (currentColor). Unknown names fall back to "sparkle". */
export function icon(name, weight = "bold") {
  const n = ICON_SET.has(name) ? name : "sparkle";
  return `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${readIcon(n, weight) ?? readIcon("sparkle", weight)}</svg>`;
}
/** Same icon as a nested <svg> positioned in a parent SVG (for the settings layers). */
export function iconSvg(name, x, y, size, color, weight = "bold") {
  const n = ICON_SET.has(name) ? name : "sparkle";
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 256 256" fill="${color}">${readIcon(n, weight)}</svg>`;
}
export const PHOSPHOR_LICENSE_PATH = join(CORE, "LICENSE");
export const phosphorLicense = () => readFileSync(PHOSPHOR_LICENSE_PATH, "utf8");
