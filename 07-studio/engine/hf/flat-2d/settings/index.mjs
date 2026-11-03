// Registry of settings: id -> { id, name, about, build(d) }.
import { desktopBrowser, office, barbershop, kitchen, classroom, bank, hospital, homeOffice, store } from "./interiors.mjs";
import { cityStreet, airport, factoryLine, dataCenter, serverRoom } from "./places.mjs";
import { voidStage, phoneUi } from "./abstract.mjs";
import { makeDraw } from "../draw.mjs";

export const SETTINGS = Object.fromEntries([desktopBrowser, phoneUi, serverRoom, cityStreet, office, barbershop, kitchen, classroom, factoryLine, airport, dataCenter, bank, hospital, homeOffice, store, voidStage].map((s) => [s.id, s]));
export const SETTING_IDS = Object.keys(SETTINGS);

/** Named props of every setting (stable list; built once with a throwaway style). */
let cache = null;
export function settingPropNames() {
  if (!cache) {
    const d = makeDraw("flat-dark-neon-ui");
    cache = Object.fromEntries(SETTING_IDS.map((id) => [id, Object.keys(SETTINGS[id].build(d).props)]));
  }
  return cache;
}
