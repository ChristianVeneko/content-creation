// Registry of settings: id -> { id, name, about, build(d) }.
import { desktopBrowser, office, barbershop, kitchen, classroom, bank, hospital, homeOffice, store } from "./interiors.mjs";
import { cityStreet, airport, factoryLine, dataCenter, serverRoom } from "./places.mjs";
import { voidStage, phoneUi } from "./abstract.mjs";
import { phoneHome, cloudSky, cafeLaptops, wifiStreet, appStore, vaultDoor, helpdesk, hardwareLab } from "./tech.mjs";
import { makeDraw } from "../draw.mjs";

// Topic tags (compact, shown in the prompt) for the settings that do not carry their own.
const TOPICS = {
  "desktop-browser": ["web", "browsing", "websites", "online"], "server-room": ["servers", "networks", "backend", "hosting"], "city-street": ["local business", "city", "delivery", "neighborhood"],
  office: ["work", "teams", "meetings", "business"], barbershop: ["barber", "grooming", "local business", "haircut"], kitchen: ["cooking", "food", "recipes", "restaurant"], classroom: ["school", "learning", "education", "teaching"],
  "factory-line": ["production", "industry", "manufacturing", "logistics"], airport: ["travel", "flights", "tourism", "logistics"], "data-center": ["data", "cloud hosting", "servers", "ai training"],
  bank: ["money", "banking", "finance", "savings"], hospital: ["health", "medicine", "care", "wellness"], "home-office": ["remote work", "productivity", "freelance", "home"], store: ["retail", "shopping", "sales", "ecommerce"],
  void: ["concepts", "abstract", "data", "metaphors"], "phone-ui": ["social media", "apps", "feeds", "messaging"],
};

export const SETTINGS = Object.fromEntries([desktopBrowser, phoneUi, serverRoom, cityStreet, office, barbershop, kitchen, classroom, factoryLine, airport, dataCenter, bank, hospital, homeOffice, store, voidStage, phoneHome, cloudSky, cafeLaptops, wifiStreet, appStore, vaultDoor, helpdesk, hardwareLab].map((s) => [s.id, { ...s, topics: s.topics ?? TOPICS[s.id] }]));
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
