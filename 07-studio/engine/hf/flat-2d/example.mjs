// A valid payload for the reference script (what happens when you type a URL) plus its word timings. Used by the
// prompt section, the tests and the showcase.
export { EXAMPLE_WORDS } from "./example-words.mjs";

export const EXAMPLE_PAYLOAD = {
  style: "flat-dark-neon-ui",
  cast: [{ id: "nico", design: "nico", size: "M" }, { id: "dora", design: "dora", size: "M" }, { id: "beto", design: "beto", size: "M" }],
  scenes: [
    {
      id: "pc", setting: "desktop-browser", label: "TU PC", glow: "accent",
      props: [
        { id: "web", kind: "browser", at: "top", size: "l", url: "ejemplo.com", title: "Nueva pestaña", page: "landing", heading: "Hola" },
        { id: "wifi", kind: "router", at: "floor-right", size: "s" },
      ],
      cast: [{ who: "nico", at: "floor-left", facing: "right" }],
      beats: [
        { on: { word: "URL" }, do: "type", target: "web", text: "ejemplo.com" },
        { on: { word: "Enter" }, do: "click", target: "web" },
        { on: { word: "Enter" }, do: "camera", move: "push", target: "web", zoom: 1.35 },
        { on: { word: "milisegundos" }, do: "camera", move: "release" },
        { on: { word: "milisegundos" }, do: "chip", target: "wifi", text: "ms", role: "warn" },
        { on: { word: "sabe" }, do: "emote", target: "nico", icon: "question" },
        { on: { word: "sabe" }, do: "act", who: "nico", clip: "shrug" },
        { on: { word: "nombre", n: 2 }, do: "send", from: "web", to: "wifi", text: "ejemplo.com", icon: "globe" },
      ],
    },
    {
      id: "dns", setting: "office", label: "DNS", glow: "accent2", enter: { word: "pregunta" },
      props: [{ id: "agenda", kind: "list", at: "top", size: "l", title: "Agenda de internet", icon: "book-open-text", rows: [{ text: "mi-banco.com", tag: "203.0.113.9" }, { text: "ejemplo.com", tag: "203.0.113.7" }, { text: "tienda.net", tag: "203.0.113.4" }, { text: "radio.fm", tag: "203.0.113.2" }] }],
      cast: [{ who: "dora", at: "floor-center", facing: "left" }],
      beats: [
        { on: { word: "agenda" }, do: "show", target: "agenda", how: "pop" },
        { on: { word: "busca" }, do: "scan", target: "agenda", row: 2 },
        { on: { word: "número" }, do: "pick", target: "agenda", row: 2 },
        { on: { word: "número" }, do: "act", who: "dora", clip: "point", to: "agenda" },
        { on: { word: "IP" }, do: "hero", text: "IP", role: "accent" },
      ],
    },
    {
      id: "srv", setting: "server-room", label: "SERVIDOR", glow: "good", enter: { word: "servidor", n: 2 },
      props: [
        { id: "rk", kind: "rack", at: "floor-right", size: "m" },
        { id: "lock", kind: "card", at: "top-left", size: "m", icon: "lock-simple-open", icon2: "lock-simple", title: "HTTPS", sub: "conexión segura", role: "good" },
      ],
      cast: [{ who: "beto", at: "floor-left", facing: "right" }],
      beats: [
        { on: { word: "servidor", n: 2 }, do: "light", target: "rk" },
        { on: { word: "cifrada" }, do: "toggle", target: "lock" },
        { on: { word: "paquetes" }, do: "send", from: "lock", to: "rk", text: "GET /", icon: "paper-plane-tilt" },
        { on: { word: "código" }, do: "act", who: "beto", clip: "pull", to: "rk" },
        { on: { word: "código" }, do: "lever", target: "rk" },
      ],
    },
    {
      id: "end", setting: "desktop-browser", label: "TU PANTALLA", glow: "warn", enter: { word: "Cuatro" },
      props: [
        { id: "page", kind: "browser", at: "top", size: "l", url: "ejemplo.com", page: "dashboard" },
        { id: "bars", kind: "progress", at: "floor-right", size: "s", items: [{ label: "1 segundo", value: 100, role: "bad" }, { label: "tu página", value: 22, role: "good" }] },
      ],
      cast: [{ who: "nico", at: "floor-left", facing: "right" }],
      beats: [
        { on: { word: "pantalla" }, do: "burst", target: "page", role: "good" },
        { on: { word: "pantalla" }, do: "act", who: "nico", clip: "celebrate" },
        { on: { word: "parpadees" }, do: "fill", target: "bars" },
        { on: { word: "hacker" }, do: "act", who: "nico", clip: "shades" },
      ],
    },
  ],
};
