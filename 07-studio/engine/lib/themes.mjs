// Topic presets ("temáticas") for the studio's onboarding. Choosing one prefills the prompt, the
// recommended templates, a palette (lib/palettes.mjs), a music mood (lib/music-moods.mjs) and a tone.
// It never forces anything: the user can change every field afterwards.
// `templates` may list ids that are not in the registry yet (new families land in parallel); consumers
// must ignore ids the registry does not know.

/**
 * @typedef {{ id: string, label: string, description: string, examplePrompt: string, templates: string[],
 *   palette: string, mood: string, tone: string }} ThemePreset
 */

/** @type {ThemePreset[]} */
export const THEMES = [
  {
    id: "tecnologia-ia",
    label: "Tecnología e IA",
    description: "Herramientas, modelos y novedades explicadas sin humo.",
    examplePrompt: "Un reel de 30 segundos que explique qué es un agente de IA y en qué se diferencia de un chatbot, con un ejemplo cotidiano.",
    templates: ["reels-noche", "neon-glass", "illustrated", "iso-toon", "kinetic-type"],
    palette: "aurora",
    mood: "tech-lofi",
    tone: "Educativo",
  },
  {
    id: "programacion",
    label: "Programación",
    description: "Trucos, comandos y conceptos de código paso a paso.",
    examplePrompt: "Tutorial rápido: cómo crear un servidor HTTP en Node en 5 pasos, mostrando el código y la salida de la terminal.",
    templates: ["editor-window", "reels-pizarra", "illustrated", "whiteboard"],
    palette: "terminal",
    mood: "tech-lofi",
    tone: "Directo",
  },
  {
    id: "finanzas",
    label: "Finanzas personales",
    description: "Ahorro, inversión y números claros con gráficos.",
    examplePrompt: "3 errores que hacen que tu ahorro no crezca, con un ejemplo en números de cuánto pierdes en 5 años.",
    templates: ["editorial-chart", "reels-menta", "rank-numbers", "pedestal"],
    palette: "bosque",
    mood: "corporate-happy",
    tone: "Directo",
  },
  {
    id: "salud-fitness",
    label: "Salud y fitness",
    description: "Rutinas, hábitos y mitos desmontados.",
    examplePrompt: "Una rutina de 4 ejercicios para hacer en casa en 10 minutos, con un consejo de postura en cada uno.",
    templates: ["reels-limon", "rank-numbers", "countdown", "kinetic-type"],
    palette: "clinico",
    mood: "upbeat-fun",
    tone: "Inspirador",
  },
  {
    id: "cocina",
    label: "Cocina",
    description: "Recetas, trucos y errores comunes en la cocina.",
    examplePrompt: "3 errores al preparar café en casa y cómo arreglarlos, con un gancho fuerte al inicio.",
    templates: ["reels-limon", "clay-diorama", "countdown", "rank-numbers"],
    palette: "terracota",
    mood: "upbeat-fun",
    tone: "Divertido",
  },
  {
    id: "viajes",
    label: "Viajes",
    description: "Destinos, rutas y consejos para viajar mejor.",
    examplePrompt: "5 cosas que nadie te dice antes de viajar a Japón por primera vez, de la más útil a la más sorprendente.",
    templates: ["reels-nube", "rank-numbers", "letterbox", "iso-toon"],
    palette: "oceano",
    mood: "inspiring-uplifting",
    tone: "Inspirador",
  },
  {
    id: "educacion",
    label: "Educación",
    description: "Conceptos explicados como en la mejor clase.",
    examplePrompt: "Explica la fotosíntesis en 30 segundos como si fuera una fábrica, con un esquema que se dibuja paso a paso.",
    templates: ["whiteboard", "reels-pizarra", "illustrated", "glass-cards"],
    palette: "pizarra",
    mood: "minimal-ambient",
    tone: "Educativo",
  },
  {
    id: "noticias",
    label: "Noticias",
    description: "Lo que pasó hoy, en titulares rápidos.",
    examplePrompt: "Resumen de 30 segundos de la noticia tecnológica de la semana: qué pasó, por qué importa y qué viene después.",
    templates: ["broadcast", "reels-noche", "editorial-chart", "captions-voice"],
    palette: "monocromo",
    mood: "tense-mystery",
    tone: "Directo",
  },
  {
    id: "motivacion",
    label: "Motivación",
    description: "Frases, historias y empujones para seguir.",
    examplePrompt: "Una historia corta de alguien que fracasó 10 veces antes de lograrlo, cerrando con una frase que se quede.",
    templates: ["letterbox", "kinetic-type", "reels-noche", "captions-voice"],
    palette: "vino",
    mood: "cinematic-epic",
    tone: "Inspirador",
  },
  {
    id: "ciencia",
    label: "Ciencia",
    description: "Curiosidades y descubrimientos con rigor.",
    examplePrompt: "¿Por qué el cielo es azul? Explícalo en 30 segundos con un experimento que se pueda hacer en casa.",
    templates: ["iso-toon", "illustrated", "reels-nube", "editorial-chart"],
    palette: "medianoche",
    mood: "inspiring-uplifting",
    tone: "Educativo",
  },
  {
    id: "gaming",
    label: "Gaming",
    description: "Juegos, trucos y cultura gamer.",
    examplePrompt: "Top 5 juegos indie que merecen más atención, con una razón concreta para jugar cada uno.",
    templates: ["neon-glass", "rank-numbers", "kinetic-type", "reels-noche"],
    palette: "sintetico",
    mood: "upbeat-fun",
    tone: "Divertido",
  },
  {
    id: "negocios-marketing",
    label: "Negocios y marketing",
    description: "Estrategia, ventas y crecimiento en claro.",
    examplePrompt: "Por qué tu tienda online no vende: 3 fallos en la página de producto y cómo corregir cada uno.",
    templates: ["pedestal", "reels-menta", "editorial-chart", "glass-cards"],
    palette: "cielo",
    mood: "corporate-happy",
    tone: "Directo",
  },
  {
    id: "ingenieria",
    label: "Ingeniería",
    description: "Cómo funcionan las cosas: estructuras, máquinas y sistemas.",
    examplePrompt: "Cómo un puente colgante aguanta su propio peso: cables, torres y anclajes explicados en 30 segundos.",
    templates: ["iso-toon", "whiteboard", "illustrated", "reels-pizarra", "editorial-chart"],
    palette: "grafito",
    mood: "cinematic-epic",
    tone: "Educativo",
  },
];

const byId = new Map(THEMES.map((t) => [t.id, t]));

/** @returns {ThemePreset | undefined} */
export const getTheme = (id) => byId.get(id);
