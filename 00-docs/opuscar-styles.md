# Catálogo opuscar: 66 estilos de cine hechos en código

Kit: `05-tools/opuscar/` (reglas del repo en `05-tools/opuscar/ADAPTER.md`). Cada estilo tiene `styles/<carpeta>/STYLE.md` (lo fijo: look, color, tipografía, movimiento, sonido) y una demo para aprender técnicas. La historia siempre es nuestra. Galería con las 66 demos: https://lemomo-ai.github.io/lemo-opuscar/

Cómo usarlo: `/video` → Tipo "Estilo de cine en código" → se ofrecen 2-3 estilos que encajen con la idea o con el canal (`08-channels/<slug>/voice.md`, sección "Estilos").

Esfuerzo: **B** = canvas 2D, render rápido; **M** = 2D con texturas o mucho dibujo; **A** = three.js con postproceso, render lento. Material: **real** = necesita imágenes, datos o footage reales con licencia (satélite, archivo, CAD); el resto se dibuja desde cero.

## Explicar cosas (ciencia, curiosidades, cómo funciona)

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Pizarra de tiza | `chalkboard` | La tiza escribe sola trazo a trazo en una pizarra de aula | B |
| Pizarra blanca | `whiteboard` | Explicación dibujada en vivo con marcador, letra que se escribe | B |
| Infografía isométrica | `iso-infographic` | Diorama isométrico de bloques planos que se abre para mostrar el sistema | M |
| Libro isométrico | `isometric-picture-book` | Un lugar real en isométrico con gente pequeña; una regla cotidiana explicada con calma | M |
| Plano / blueprint | `blueprint` | Dibujos técnicos blancos sobre azul de Prusia que se trazan en orden | B |
| Placa de circuito | `circuit-board` | El tema dibujado como PCB visto desde arriba; las rutas son pistas de cobre | M |
| Despiece de producto | `teardown` | Un producto real se desarma pieza a pieza como en estudio (real: CAD) | A |
| Holograma HUD | `hologram-hud` | Un objeto escaneado en wireframe, cajas de objetivo que abren cada parte | A |
| Historia al microscopio | `microscope` | Cambio de escala continuo desde el portaobjetos (real: microscopía) | M |
| Una sola línea | `one-line` | Todo es una única línea de tinta que nunca se levanta; las escenas se transforman | B |
| Mapa de metro | `transit-map` | Esquema de metro impreso: líneas a 45°, paradas, intercambios | B |

## Datos, rankings y comparaciones

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Historia con datos | `dataviz` | Gráfica sobre papel crema dibujada a lápiz rojo y azul, con notas a mano | B |
| Datos hechos objeto | `data-physical` | Cada unidad es una pieza física (moneda, bloque) apilada a escala exacta | A |
| Proyección en maqueta blanca | `white-model` | Maqueta blanca de un lugar real donde un proyector pinta datos | A |
| Gráficos suizos | `swiss-motion` | Retícula, una tipografía, un color de señal, movimiento preciso | B |
| Pictogramas | `pictogram-motion` | Gráfico central de círculos y semicírculos a ritmo de beat | B |
| Keynote oscura | `dark-keynote` | Lanzamiento de software: interfaz protagonista sobre negro con luz suave | M |

## Historia, misterio y casos reales

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Expediente de semitono | `halftone-dossier` | Expediente retro: papel de archivo, puntos de semitono, titulares enormes | B |
| Mesa de luz de archivo | `archive-lighttable` | Negativos, cartas y recortes sobre mesa de luz con lupa (real: archivo) | M |
| Investigación visual | `visual-investigation` | Footage, fotos y mapas de un hecho real sincronizados en un reloj (real) | M |
| Briefing satelital | `satellite-briefing` | Imagen satelital real en gris con líneas de medición (real) | M |
| Pizarra de ingeniería | `briefing-board` | Pared de pizarra real con fotos recortadas que caen sobre ella | M |
| Grabado en cobre | `engraving` | Una plancha que se graba sola con buril; la figura crece por capas | M |
| Xilografía | `woodcut` | Bloque negro donde la luz solo existe donde cortó el cuchillo | M |
| Cine mudo 1920 | `silent-film` | Ilustración grabada proyectada en sala, parpadeo y carteles de texto | M |
| Noticiero 1920 | `newsreel` | Noticiero sonoro de los años 20 con archivo real y fanfarria (real) | M |
| Montaje constructivista | `kino-montage` | Archivo impreso en tinta con un solo rojo, cortes a ritmo de máquina (real) | M |
| Impresión en plano secuencia | `printed-long-take` | Mundo 3D como grabado en scratchboard, un solo movimiento de cámara | A |
| Títulos de espía 60s | `spy-titles` | Secuencia de créditos de papel recortado con siluetas, cuatro tintas | M |

## Terror, liminal y suspenso

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Found footage liminal | `backrooms` | Cintas de videocámara en espacios vacíos con luz fluorescente; reglas, no monstruos | M |
| Terminal ASCII / CRT | `ascii-crt` | Todo son caracteres en una rejilla monoespaciada sobre fósforo de CRT | B |
| Sombras chinas | `shadow-puppet` | Títeres de piel tallada contra una tela iluminada por lámparas de aceite | M |
| Vitral | `stained-glass` | Un vitral medieval vivo solo donde lo toca el sol | A |
| Tinta china | `ink-wash` | Pintura xieyi animada: un trazo es una montaña, una ola o un corte | M |

## Cuentos, infantil y narración cálida

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Libro de crayones | `crayon-book` | Página de cuento en crayón con acuarela que revela lo oculto | M |
| Acuarela | `watercolor` | Diario pintado a mano que se pinta solo, notas manuscritas | M |
| Libro desplegable | `paper-popup` | Un pop-up sobre un escritorio: actores de papel frente a decorados que saltan | A |
| Óleo a espátula | `impasto` | Planos de color gruesos con relieve de pintura | M |
| Boceto urbano | `urban-sketch` | Cuaderno de dibujo a pluma sepia con aguadas sueltas | M |
| Papel recortado rojo | `papercut-red` | Recortes rojos articulados; el corte es el dibujo | M |
| Caja de luz de papel | `paper-lantern` | Caja de sombras de 6-9 capas de cartón iluminadas desde atrás | M |
| Ukiyo-e | `ukiyoe` | Grabado japonés en madera: bloques planos, cielos degradados | M |

## Caricatura, anime y humor

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Caricatura años 30 | `rubber-hose` | Blanco y negro entintado, todo está vivo y se balancea al jazz | M |
| Anime de celuloide 80s | `cel-anime-80s` | Celdas planas de dos tonos sobre fondos aerografiados, luces traseras | M |
| Sitcom sci-fi | `scifi-toon` | Animación adulta: contorno tembloroso, un dúo, un portal brillante | M |
| Caricatura de los 50 | `midcentury-toon` | Color plano y animación limitada tipo "síguelo paso a paso" | B |
| Show de juegos plano | `game-show` | Mascotas vectoriales sobre rayas de colores, cada golpe al ritmo | M |
| Art déco | `art-deco` | Laca negra y oro grabado: un cartel de los años 30 que se mueve | M |
| Risografía | `risograph` | Animación impresa con 2-3 tintas translúcidas sobre papel cálido | M |
| Cartel serigrafiado | `silkscreen-poster` | Tintas opacas planas, bandas de color escalonadas | B |

## Juegos

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| RPG de píxeles 16-bit | `pixel-rpg` | Se ve y se comporta como un RPG de consola de los 90: 320x180, cajas de texto | B |
| HD-2D | `hd-2d` | Sprites de píxel como recortes dentro de un diorama 3D con niebla | A |
| Microjuegos | `microgame` | Party game rápido: una orden, unos segundos, cada juego en otro estilo | M |

## 3D y materiales

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Juguete de bloques | `brick-toy` | Stop-motion de bloques de plástico fotografiados en macro | A |
| Isla low-poly | `lowpoly-island` | Mundo facetado diminuto en isométrico ortográfico | A |
| Miniatura tilt-shift | `tilt-shift` | Lugar visto desde arriba con lente inclinada: parece maqueta | A |
| Diorama Memphis | `memphis-diorama` | Maqueta de mesa con colores Memphis dentro de un marco orgánico | A |
| Producto de vidrio | `glass-product` | Render de producto en vidrio con dispersión y cáusticas | A |
| Vuelo por el escritorio | `desktop-flythrough` | Pantallas de apps como tarjetas de papel; personajes de vóxel llevan el trabajo | A |
| Screencast vivo | `living-screencast` | Recorrido de producto con una mascota de baja resolución dentro de la interfaz | M |

## Edición y noticias (parten de material real)

| Estilo | Carpeta | Qué hace en pantalla | Esf. |
|---|---|---|---|
| Noticia con subtítulos | `caption-news` | Video social que se entiende sin sonido: subtítulos enormes sobre footage real | B |
| Paquete de noticiero | `news-package` | Paquete de TV completo: cortinilla, rundown, rótulos | M |
| Cuenta regresiva en pantalla dividida | `countdown` | Footage real de un evento con un cero conocido, en tiempo real | M |
| Sinfonía en time-lapse | `city-symphony` | Ciudad cortada como música minimalista | M |
| Pizarra táctica deportiva | `telestrator` | Clip de jugada: congelar, rebobinar y dibujar sobre la imagen | M |

Notas: los estilos con material **real** exigen licencia de cada imagen o clip en `brief.md` (regla del repo). Los estilos "A" conviene probarlos con un `still.mjs` antes de comprometer un lote nocturno.
