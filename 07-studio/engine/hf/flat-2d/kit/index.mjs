// Registry of replica kits.
import * as ui from "./ui.mjs";
import * as data from "./data.mjs";
import * as hw from "./hardware.mjs";

export const KITS = {
  browser: ui.browser, chat: ui.chat, stats: data.stats, chart: data.chart, notification: ui.notification, phone: ui.phone, list: ui.list,
  rack: hw.rack, router: hw.router, calendar: data.calendar, "stamp-card": data.stampCard, progress: data.progress, card: ui.card,
};
export const KIT_KINDS = Object.keys(KITS);
export const KIT_CSS = ui.COMMON_CSS + Object.values(KITS).map((k) => k.css).join("\n");
/** Fields every prop may carry besides its kind-specific ones. */
export const COMMON_FIELDS = ["id", "kind", "at", "size", "dx", "dy", "hidden", "role"];
export { PAGE_IDS } from "./ui.mjs";
export const SIZE_K = { s: 0.62, m: 0.8, l: 1 };
