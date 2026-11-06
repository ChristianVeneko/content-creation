# Content Creation: estudio de videos cortos con Claude Code

Un kit para hacer videos verticales (Reels, TikTok, YouTube Shorts, 1080x1920 a 30 fps) desde una idea hasta el MP4 final, con portada y texto para publicar. El "cerebro" es tu suscripción de Claude Code: no necesitas claves de API de ningún modelo de lenguaje.

Todo lo que instala (librerías de Node, cachés, modelos, entorno de Python) queda **dentro de esta carpeta**. Si la borras, no queda nada repartido por tu sistema, salvo los paquetes del sistema que instala `setup.sh` (ffmpeg, Python, librerías de Chrome).

## Qué trae

- **Skills de Claude Code**: `/video` (video guiado de principio a fin), `/canal` (tus canales, etapas y plan semanal), `/hooks` (puntúa ganchos y pares título/portada), `/lote` (un lote de videos de noche para un canal; nunca sube nada).
- **Motor de video** (`07-studio/engine`): Remotion con unas 40 plantillas (ilustrado 2D, reels 2D, 3D con three.js, pixel art, tipografía cinética).
- **Estudio web** (`07-studio/web`): una app local en el navegador para escribir la idea, editar escenas y renderizar.
- **Kits de video** (`05-tools/`), que maneja `/video`: `opuscar` (66 estilos de cine hechos en código), `moment-reel` (momentos famosos en caricatura), `science-shorts` (ciencia animada), `whatif-3d` (patio en corte 3D, Blender) y `story-video` (historias de supervivencia 3D).
- **Investigación con fuentes**: los videos hechos desde cero parten de datos buscados en la web, cada uno con su enlace y fecha en `sources.md`; lo que no se puede confirmar queda fuera del video.
- **Recursos**: fuentes, efectos de sonido, catálogo de música y recursos 3D con licencias aptas para videos monetizados (ver [Licencias](#licencias-de-los-recursos-incluidos)).

## Requisitos

- **macOS** (Intel o Apple Silicon) o **Windows 10/11 con WSL2** (Ubuntu). Linux con apt también funciona.
- Una cuenta de **Claude** con Claude Code (plan Pro o Max).
- Unos **3 GB libres** para empezar (ver [Espacio en disco](#espacio-en-disco)).
- Node.js 24 o superior, ffmpeg y Python 3: `setup.sh` los instala o los revisa por ti.

## Instalación en macOS

1. Instala [Homebrew](https://brew.sh) si no lo tienes.
2. Instala Claude Code: sigue https://docs.claude.com/en/docs/claude-code (o `curl -fsSL https://claude.ai/install.sh | bash`) e inicia sesión con `claude`.
3. Clona el repo y corre el instalador:

   ```bash
   git clone <url-de-este-repo> content-creation
   cd content-creation
   ./setup.sh
   ```

4. Opcional, solo en Mac con Apple Silicon (M1 o superior): voz local gratis (Kokoro) y subtítulos sincronizados palabra por palabra (Whisper). Ocupa unos 2 GB más:

   ```bash
   ./setup.sh --voice-local
   ```

## Instalación en Windows (WSL2)

El kit corre dentro de Linux (WSL2), no en Windows directamente. Paso a paso:

1. Abre **PowerShell como administrador** y ejecuta:

   ```powershell
   wsl --install
   ```

   Reinicia el PC cuando te lo pida. Al volver se abre Ubuntu: crea tu usuario y contraseña de Linux.
2. Abre la app **Ubuntu** (desde el menú Inicio). Todo lo que sigue se escribe ahí.
3. Clona el repo **dentro de tu carpeta de Linux** (`~`), no en `/mnt/c/...`: desde el disco de Windows todo va muchísimo más lento.

   ```bash
   cd ~
   git clone <url-de-este-repo> content-creation
   cd content-creation
   ```

4. Instala Claude Code dentro de Ubuntu e inicia sesión:

   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   claude
   ```

5. Corre el instalador (te pedirá tu contraseña de Linux para instalar ffmpeg y las librerías de Chrome con apt):

   ```bash
   ./setup.sh
   ```

   Si tu Ubuntu trae un Node viejo, `setup.sh` descarga Node 24 dentro de `05-tools/node` (no toca el del sistema).
6. Para ver tus videos desde Windows: en el Explorador de archivos abre `\\wsl$\Ubuntu\home\<tu-usuario>\content-creation`.

En WSL la voz local (Kokoro) no está disponible: usa ElevenLabs (ver [Claves de API](#claves-de-api-env)) o haz videos sin voz. Sin Whisper, los subtítulos se sincronizan a partir del texto del guion.

Durante renders largos, desactiva la suspensión de Windows (Configuración > Sistema > Inicio/apagado y suspensión).

## Cómo hacer un video

Antes de cualquier comando, desde la carpeta del repo:

```bash
source ./env.sh
```

`env.sh` detecta solo dónde está el repo y deja cachés y archivos temporales dentro de él.

### 1. Con Claude Code (recomendado)

```bash
claude
```

Y dile **"hazme un video"** (o `/video`). Te hace pocas preguntas (tema, canal, cómo quieres que se vea y se mueva (formato), colores, voz y duración, de 15 s hasta 3 min), te muestra el guion y el storyboard, renderiza y te entrega el video, la portada y el texto para cada plataforma. Otros comandos: `/canal` para crear tu canal y planear la semana, `/hooks` para mejorar ganchos y títulos, `/lote` para dejar varios videos haciéndose de noche.

#### Ejemplos de pedidos

Escribe el tema tal cual, como se lo dirías a una persona. Si nombras el estilo, se salta esa pregunta:

| Escribes | Qué hace |
|---|---|
| `/video cómo funciona una VPN en 45 segundos` | Plantilla del motor (2D animado), investiga el tema y te pregunta voz y colores |
| `/video 5 errores al pedir un préstamo, formato ranking` | Plantilla de ranking con un número por escena |
| `/video cuánto pesa una nube, como ciencia animada` | Kit `science-shorts`: vector plano con objetos que tienen cara |
| `/video la mano de Dios de Maradona en caricatura` | Kit `moment-reel`: caricatura 2D del momento, el acto primero y después el contexto |
| `/video por qué el Titanic no tenía suficientes botes, estilo cine en código: Expediente de semitono` | Kit `opuscar` con uno de sus 66 estilos (ver la galería en la web, pestaña **Motores**) |
| `/video qué pasa si cavas un pozo en tu patio, patio en corte 3D` | Kit `whatif-3d` en Blender (lento: ~2,5 h para 90 s) |
| `/video imagina que un agente de IA borra producción un viernes, historia de supervivencia 3D` | Kit `story-video`: thriller en segunda persona con reloj y reglas |
| `/video` | Sin tema: te pregunta "¿De qué trata el video?" |

Con `tú decide` o `lo que veas` en cualquier pregunta, toma los valores recomendados y sigue.

#### Cómo se ve una sesión

```text
> /video cuánto pesa una nube, como ciencia animada

  ¿Canal?  › Sin canal (Recomendado)
  Investigué 7 datos en 4 sitios (NOAA, USGS, ...); dejé fuera 1 que no pude confirmar.
  Gancho elegido (8.6/10): "Esa nube pesa lo mismo que 100 elefantes."

  # | frase                                     | en pantalla
  1 | Esa nube pesa lo mismo que 100 elefantes. | nube con cara, 100 elefantes caen debajo
  2 | Y aun así flota sobre tu cabeza.          | la nube sonríe, flecha "500 toneladas"
  ...
  ¿Storyboard? › Renderizar (Recomendado)

  Listo: 04-projects/2026-11-06-cuanto-pesa-una-nube/video.mp4 (52 s)
```

#### Qué te entrega

Cada video queda en su carpeta de `04-projects/` (local, no se sube a git):

```text
04-projects/2026-11-06-cuanto-pesa-una-nube/
├── video.mp4        el video final, 1080x1920, 30 fps, audio a -14 LUFS
├── cover.jpg        la portada
├── post.md          título, descripción, hashtags y créditos para cada plataforma
├── sources.md       cada dato con su enlace y la fecha en que se leyó
├── hooks.txt        los 5 ganchos que se probaron, con su puntaje
├── brief.md         fuentes y licencias de los recursos usados
└── job.json         canal y etapa (idea, draft, ready, published)

06-exports/reels/2026-11-06-cuanto-pesa-una-nube.mp4    copias listas para cada plataforma
06-exports/tiktok/...
06-exports/shorts/...
```

Revisa los datos antes de publicar: `node 02-scripts/sources-check.mjs 04-projects/<id>/sources.md`

```text
PASS  facts       7 verified facts
PASS  urls        every fact has a URL
PASS  read dates  every source read in the last week
PASS  sites       4 different sites (2 or more: confirm key facts twice)
PASS  left out    section present
```

### 2. Estudio web

```bash
source ./env.sh
cd 07-studio/web
npm run build && npm start
```

Abre http://127.0.0.1:4317. Tiene tres secciones:

- **Panel**: tus canales y todo tu contenido por etapa.
- **Crear**: escribe la idea, elige el formato (cómo se ve y se mueve), los colores, la voz y la duración (de 15 s a 3 min), y quién escribe el guion (Claude Code con tu suscripción, o Anthropic/OpenAI/Gemini con clave), edita las escenas y renderiza.
- **Motores**: todos los tipos de video que puedes hacer, cada uno con ejemplos de pedidos para copiar y lo que te entrega. En **Cine en código** está la galería de los 66 estilos de opuscar con un fotograma de cada uno.

### 3. Línea de comandos (motor)

```bash
source ./env.sh
node 07-studio/engine/cli.mjs templates --brief                     # lista de formatos: id, familia, formato, nombre, ideal para
node 07-studio/engine/cli.mjs validate mi-video/spec.json           # valida un guion (VideoSpec)
node 07-studio/engine/cli.mjs build mi-video/spec.json --out mi-video
```

Ejemplos de specs en `07-studio/engine/examples/`. Contrato completo en `07-studio/engine/README.md`.

Los videos quedan en `04-projects/<id>/` y las exportaciones por plataforma en `06-exports/{reels,tiktok,shorts}/`.

## Claves de API (`.env`)

`setup.sh` crea `.env` a partir de `.env.example`. **Todas las claves son opcionales.** `.env` está en `.gitignore`: nunca lo subas.

| Clave | Para qué |
|---|---|
| `ELEVENLABS_API_KEY` | Voces realistas en español (y el servidor MCP de ElevenLabs en Claude Code). Necesaria para tener voz en Windows/WSL. El plan gratis pide atribución; el uso comercial necesita plan de pago. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Solo si en el estudio web quieres que el guion lo escriba ese proveedor en vez de Claude Code. |
| `FAL_KEY` | Opcional, para el MCP de fal (`05-tools/install.sh mcp`). |

Con la clave de ElevenLabs puesta, reinicia Claude Code dentro de la carpeta y aprueba el servidor `elevenlabs` cuando te lo pida (revisa con `/mcp`).

## Espacio en disco

- El repo clonado: unos 60 MB.
- Después de `./setup.sh`: alrededor de 1 a 1,5 GB (dependencias de Node y el Chrome sin interfaz que usa Remotion).
- Con `--voice-local`: unos 2 GB más (entorno de Python y modelos).
- Con el uso crece: cada video guarda sus archivos en `04-projects/`, y la caché de render vive en `07-studio/engine/node_modules/.cache` y `05-tools/cache/`. Puedes borrar esas cachés cuando quieras; se regeneran.

## Mapa de carpetas

- `00-docs/`: reglas de plataforma y retención, estilos de plantillas, recursos 3D y catálogos de herramientas y recursos.
- `01-prompts/`: plantillas de prompts (ganchos, guion, shot list, captions, portada).
- `02-scripts/`: ayudantes de ffmpeg (formato vertical, subtítulos quemados, normalizar audio, exportar por plataforma).
- `03-assets/`: fuentes, música, efectos de sonido, overlays y recursos 3D.
- `04-projects/`: una carpeta por video (local, no se sube).
- `05-tools/`: los kits de video (`opuscar`, `moment-reel`, `science-shorts`, `whatif-3d`, `story-video`, cada uno con su `ADAPTER.md` o `CLAUDE.md`), más binarios locales, cachés y modelos (ignorados por git).
- `06-exports/`: videos finales por plataforma (local).
- `07-studio/`: el motor (`engine/`) y el estudio web (`web/`).
- `08-channels/`: tus canales (`channel.json` + `voice.md`). Solo se versionan `README.md` y `_template/`; tus canales quedan locales.
- `.claude/skills/`: las skills de Claude Code.

Extras opcionales en `05-tools/install.sh` (stack pesado de Python, HyperFrames, más servidores MCP). Para ajustes propios de tu máquina, crea `env.local.sh` en la raíz: `env.sh` lo carga al final y git lo ignora.

## Licencias de los recursos incluidos

- **Música**: solo CC0 y CC BY. Kevin MacLeod (incompetech.com) y ende.app, ambos CC BY 4.0: **hay que dar crédito**. Cada render escribe el crédito de la pista usada en la sección `## Credits` de `post.md`; pégalo en la descripción al publicar. Detalle en `03-assets/music/README.md`. Si `03-assets/music` no tiene los archivos MP3, los videos salen sin música de fondo.
- **Efectos de sonido**: CC0 (Kenney y @remotion/sfx). Detalle en `03-assets/sfx/README.md`.
- **Fuentes**: SIL Open Font License (OFL), de Google Fonts.
- **Recursos 3D**: CC0. Detalle en `03-assets/3d/README.md`.
- No uses GIFs de GIPHY/KLIPY en videos monetizados. Anota la fuente y la licencia de cualquier recurso de terceros en el `brief.md` del proyecto.
- Remotion es gratis para personas y empresas de hasta 3 personas; empresas más grandes necesitan licencia (https://remotion.dev/license).
