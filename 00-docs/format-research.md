# Format research: what makes the reference Reels work

Sources: three downloaded Reels from santiremedio (2) and sebastiankra.ia (1), studied as frame sheets, plus ten screenshots of Reels from videotec56, blacksaless, sebastiankra.ia and santiremedio. These are references only: never copy their characters, logos or scenes.

## The key finding
None of these videos uses detailed models. They look finished because of five things:
1. **A place, not a slide.** Every scene is a set the camera is inside: a highway at night, a store table, a bedroom, a factory, a museum hall.
2. **Real light.** There is a warm key light against a cool fill. Soft shadows sit under every object, with ambient occlusion in the contact areas.
3. **Depth.** Depth of field blurs the foreground and background, and fog or haze fades the distance.
4. **The camera moves.** Slow dollies, pushes and pans run through the set, and the cut lands on the beat of the voice.
5. **A fixed graphic system on top.** The header, the captions and the HUD always sit in the same place. Only the scene changes.

## Reference by reference
| Creator | Format | Scene | Text system |
|---|---|---|---|
| videotec56 | Rendered stylized 3D | Low-poly car on a night highway, blocky characters on a neon grid, a mouse in a glowing outline hand. HDRI-like light, soft shadows, fog, DOF. | Two lines in the upper third: a gray lead line, then a bold white or accent keyword line, revealed word by word. |
| blacksaless | Flat 2.5D (3D shapes, flat shading) | Laptops on a wooden table in perspective, coin stacks, simple characters. | Top-third line with a karaoke color sweep. Big yellow stat badges (+50 %). |
| sebastiankra.ia | Dark-grid UI explainer | Dark grid, UI cards (tweet, bar chart, jar, hourglass, price tags), small voxel mascot, HUD progress bars at the top. | Big two-line header (white + accent color). Bottom captions as **word chips**: each word in its own box, the active one in color. Handle at the bottom. |
| santiremedio | Pixel-art scenes | Detailed pixel sets (bedroom, western town, factory, museum, temple). Blurred parallax layers fake DOF. Light rays, glow, dust. | Pixel-font title banner with one accent word. RPG dialog box at the bottom with portrait, speaker name and typed text. Popup "chat" windows. Simple captions with a pink accent word. |

## Techniques
- **Rendered 3D in three.js under Remotion:**
  - ThreeCanvas renders with `frameloop="never"`, so every animation comes from `useCurrentFrame`.
  - Use AgX or ACES tone mapping and a local Poly Haven HDRI at 0.4–0.8 intensity.
  - Light with a warm key that casts 2048 shadows and a cool rim.
  - Add ContactShadows under the objects and N8AO for ambient occlusion.
  - Bloom should catch emissive surfaces only. Add DepthOfField on the subject, fog matched to the background, and a vignette.
  - Avoid anything that accumulates across frames (temporal shadows, TAA), because Remotion renders frames in parallel and out of order.
- **Pixel art:**
  - Draw on a low-res canvas (270x480, scaled ×4) and upscale it with `image-rendering: pixelated` at integer scale. Snap positions to whole pixels.
  - Limit the palette and use Bayer dithering for gradients.
  - Fake DOF by blurring the upscaled background and foreground layers, never the low-res canvas.
  - Draw light rays as gradient wedges with screen blend.
- **2D with depth:** gradients instead of flat fills, soft drop shadows, perspective planes, and parallax layers.

## Caption catalog
Word chips, two-tone keyword, karaoke fill, Hormozi, boxed highlight, pills, single-word punch, typewriter, RPG dialog box, neon glow, underline sweep, minimal lowercase, pixel banner, clean.

Positions on 1080x1920, keeping x between 90 and 990 and away from the right-hand button rail:
- Header and two-tone: y 260–620.
- Punch: center, y 800–1100.
- Lower styles (chips, dialog box): bottom edge at y ≤ 1400.

Sizes:
- Captions 64–96 px, punch 120–180 px, headers 80–110 px.
- At most 2 lines of 2–4 words.
- Stroke 6–10 px.
- The active word in the accent color at 1.05–1.15 scale.

## Assets and licenses
- 3D (CC0): Kenney, Quaternius, Poly Haven (HDRI and textures), and Poly Pizza filtered to CC0.
- Pixel (CC0): Kenney pixel packs, and OpenGameArt and itch.io filtered to CC0.
- Pixel fonts (OFL, all with á é í ó ú ñ ¿ ¡): Pixelify Sans (the most readable), Press Start 2P (banners only), Silkscreen, VT323, Jersey 10, Tiny5, Micro 5, Handjet.

## Decision
Rendered 3D goes through three.js plus postprocessing.
