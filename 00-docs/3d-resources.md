# 3D resources: three.js + @remotion/three for vertical shorts

Researched 2026-10-31. Target: 1080x1920, 30fps, frame-deterministic 3D scenes in `07-studio/engine` (Remotion 4.0.539, React 19.2.3). ⚠ marks a claim I could not confirm from a primary source.

## 1. Skills and official docs

### Already installed locally (read these first)

| Skill | Path | Use |
|---|---|---|
| `remotion-markup` → `3d.md` | `~/.claude/skills/remotion-markup/3d.md` (also under `remotion-best-practices/remotion-markup/3d.md`) | The Remotion 3D rules: `<ThreeCanvas width height>`, lights required, **`useFrame()` forbidden**, everything driven by `useCurrentFrame()`, `<Sequence layout="none">` inside the canvas. |
| `gamedev:threejs-scene-setup` | `~/.claude/plugins/cache/awesome-gamedev-agent-skills/gamedev/19d93f97c9c1/skills/web-engines/threejs-scene-setup/SKILL.md` | Vanilla scene, camera, renderer, WebGPURenderer. Written for real-time apps (render loop, OrbitControls), so ignore the loop parts. |
| `gamedev:threejs-materials-lighting` | `.../web-engines/threejs-materials-lighting/SKILL.md` | PBR vs unlit, light types, shadow maps, IBL. Good for "my model is black". |
| `gamedev:threejs-gltf-loading` | `.../web-engines/threejs-gltf-loading/SKILL.md` | GLTFLoader, DRACO/Meshopt/KTX2, AnimationMixer. In Remotion, drive the mixer with `mixer.setTime(frame/fps)`, never `update(delta)`. |

Local reference code:
- `05-tools/repos/templates/remotion-dev_template-three/` is the official template (R3F 9.2, three 0.178). Its `remotion.config.ts` sets `Config.setChromiumOpenGlRenderer("angle")`, and `Scene.tsx` uses `<ThreeCanvas linear>`.
- `05-tools/repos/templates/remotion-dev_template-prompt-to-motion-graphics-saas/src/skills/3d.md` and `src/examples/code/falling-spheres.ts` hold short 3D rules plus a working example.
- `05-tools/repos/templates/JohnChow90_video-shotcraft/` (Apache-2.0) has `assets/lib/helpers/camera.tsx` (2.5D camera rig) and `FlatPanel.tsx` (R3F). Its README covers headless notes: `--concurrency=1` on low-core machines and a `chrome-headless-shell` binary.
- `05-tools/repos/templates/ali-abassi_remotion-templates/SKILL.md` shows 3D with `useFrame`. That is an **anti-pattern** in Remotion; don't copy it.

### Installable skills (web)

| Repo | Install | License | Notes |
|---|---|---|---|
| [CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills) | `npx skills add cloudai-x/threejs-skills` | MIT | 13 skills (fundamentals, geometry, materials, lighting, textures, animation, loaders, shaders, postprocessing, interaction, performance, react-three-fiber, asset-pipeline). Verified against three 0.186.1, R3F 9.8.2, drei 10.7.9. 3.9k stars, about 173k installs on [skills.sh](https://skills.sh/cloudai-x/threejs-skills). **Best general pick.** |
| [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) | `npx skills add EnzeD/r3f-skills` | MIT | 11 R3F skills, including r3f-postprocessing and r3f-loaders. Fixtures pinned to R3F 9.7 / drei 10.7.8 / postprocessing 3.1.1, reviewed 2026-08-31. Small (132 stars) but carefully versioned. |
| [emalorenzo/three-agent-skills](https://www.skills.sh/emalorenzo/three-agent-skills) | `npx skills add emalorenzo/three-agent-skills` | MIT ⚠ (aggregator) | `r3f-best-practices`, 60–70 rules. Real-time oriented. |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | `npx skills add remotion-dev/skills` | ⚠ not shown | Already installed (`remotion-*`). The 3D rules live in `remotion-markup/3d.md`. |
| [iart-ai/explainer-video-skills](https://github.com/iart-ai/explainer-video-skills) | `npx skills add iart-ai/explainer-video-skills` | MIT | Includes `isometric-animation` (2.5D stacks, extruded blocks, exploded views). The renderer stack isn't stated, so treat it as style reference only. |
| [stochosfrance/lowpoly-reel](https://github.com/stochosfrance/lowpoly-reel) | clone into `~/.claude/skills/` | MIT | Low-poly three.js reel at 1080x1920 (Puppeteer frame-by-frame, ElevenLabs, subtitles, -14 LUFS). One commit, 1 star; useful as a recipe, not a dependency. |
| [htekdev/explainer-3d](https://github.com/htekdev/explainer-3d) | repo | MIT | Remotion + R3F components (SystemBox, DataFlow, Arrow3D, FloatingLabel, GlowOrb, AnimatedCamera…). Dark #0A0A1A palette with bloom; renders with `--gl=swangle`. Good component checklist. |

Recommendation: install **CloudAI-X/threejs-skills** project-local (`.claude/skills/`, inside the repo) and keep `remotion-markup/3d.md` as the authority whenever the two conflict, because real-time skills assume `useFrame`/`clock`.

**Installed (2026-10-31, T2):** `npx -y skills add cloudai-x/threejs-skills -s '*' -a claude-code --copy -y` from the repo root copied 13 skills into `.claude/skills/threejs-*` (`threejs-fundamentals`, `-geometry`, `-materials`, `-lighting`, `-textures`, `-animation`, `-loaders`, `-shaders`, `-postprocessing`, `-interaction`, `-performance`, `-react-three-fiber`, `-asset-pipeline`) and updated the root `skills-lock.json`; nothing was written under `~`. Reviewed: documentation only, no install hooks, no `curl | sh`, `sudo` or global installs. Use them for three.js API details (materials, lights, geometry, loaders, shaders). **`~/.claude/skills/remotion-markup/3d.md` wins on any conflict**: never use `useFrame`/`clock` for animation, `OrbitControls`, render loops or `Environment` presets in engine code. The engine itself is documented in `07-studio/engine/README.md` ("3D templates").

**Built (T2):** templates `clay-diorama`, `iso-toon`, `neon-glass`, `pedestal` (section 5 below). Deviations from the plan: bloom uses three's own `UnrealBloomPass` composer (built synchronously) instead of `@react-three/postprocessing`, whose `EffectComposer` rendered an empty canvas on the first frame of a page (every still, and the first frame of a scene); local assets live in `03-assets/3d/` (4 Poly Haven CC0 GLBs + 2 1k HDRIs), not `public/3d/`; Kenney zips could not be fetched headlessly (download sits behind a JS page).

### Official @remotion/three rules ([docs](https://www.remotion.dev/docs/three), [ThreeCanvas](https://www.remotion.dev/docs/three-canvas), [--gl](https://www.remotion.dev/docs/gl-options))

- Install: `npx remotion add @remotion/three`, which pulls `three @react-three/fiber @remotion/three @types/three`. Pin `@remotion/three` to **4.0.539** to match the engine. Current npm versions: three 0.187.0, R3F 9.8.2, drei 10.7.9, @react-three/postprocessing 3.2.2.
- `<ThreeCanvas>` needs `width` and `height`. During rendering it forces `frameloop="never"` and calls `advance()` once per frame. Async texture updates must call `advance(performance.now())`, not `invalidate()`.
- Determinism: no `useFrame`, no `state.clock`, no `Math.random()` at render time. Derive everything from `useCurrentFrame()`, and seed randomness with `random(seed)` from `remotion`.
- `<Sequence>` inside the canvas needs `layout="none"`.
- **GL renderer:** "Three.js does not work with the default OpenGL renderer"; use `angle`. Recommendations: desktop → `angle`, GPU cloud → `angle-egl`, no GPU or Lambda → `swangle` (slow). `angle` has known memory leaks on long renders, so split them into parts. Remotion 5 defaults to `angle` locally.
- **The config file does not apply to Node APIs.** The engine renders through `lib/render.mjs` (`selectComposition`, `renderMedia`, `renderStill`), so each call needs `chromiumOptions: { gl: "angle" }`. Studio additionally needs `Config.setChromiumOpenGlRenderer("angle")` in `remotion.config.ts`. CLI equivalent: `--gl=angle`.
- Video textures: `useVideoTexture()` in Studio/Player. `useOffthreadVideoTexture()` for render is deprecated in favour of `@remotion/media`.
- Asset loading: R3F `useLoader`/`useGLTF` suspend. Remotion waits for Suspense via its own `delayRender` ⚠ (inferred from the template's behavior; not stated on the three docs page). For manual loads (fonts, EXR, `fetch`), wrap them in `delayRender()`/`continueRender()`. Serve every file from `public/` via `staticFile()`; never use a CDN.

## 2. Commercial-safe 3D assets

| Source | License | Formats / access | Notes |
|---|---|---|---|
| [Kenney 3D](https://kenney.nl/assets/category:3D) | **CC0** (verified on [Mini Skate](https://kenney.nl/assets/mini-skate)) | Zip per kit. GLB/FBX/OBJ ⚠ (usual Kenney layout, not verified per kit) | City Kit, Car Kit, Factory Kit, Mini Forest, Cube Pets, Space/Pirate/Fantasy Town kits. A clean, toy-like low-poly look that fits explainers. |
| [Quaternius](https://quaternius.com/) | **CC0**, no attribution ([FAQ](https://quaternius.com/faq.html)) | FAQ names `.blend` + FBX. glTF ⚠ per pack | Ultimate Animals/Buildings/Nature/Spaceships, Stylized Nature MegaKit. Convert FBX→GLB via the Blender MCP. |
| [Poly Haven](https://polyhaven.com/license) | **CC0** (HDRIs, textures, models) | `.hdr/.exr`, PBR maps, glTF. Public API at `api.polyhaven.com` (separate API terms; no scraping) | Best HDRIs. Download 1k versions into `public/3d/hdri/`. |
| [Poly Pizza](https://poly.pizza/) | **Per model**: whatever CC license the uploader chose ([ToS](https://poly.pizza/docs/tos)). Mixed CC0 / CC-BY ⚠ | GLB. API v1.1 (docs need login ⚠). Scraping and ML-training use forbidden | Check each model's page. Record CC-BY authors in `brief.md`. |
| [Sketchfab](https://sketchfab.com/developers/download-api) | Per model CC. Use only CC0 / CC-BY (avoid NC/ND) | Download API returns glTF/GLB/USDZ and needs an authenticated user | Filter by downloadable + license. CC-BY needs on-screen or description credit. |
| [KhronosGroup glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | **Per model**: see each folder's `README.md` (mostly CC-BY 4.0 / CC0, some trademarked) | glTF/GLB, [browser](https://github.khronos.org/glTF-Assets/) | Good for testing materials (DamagedHelmet, transmission tests). Several models are flagged for removal; skip branded ones. |
| [@pmndrs/assets](https://github.com/pmndrs/assets) | **CC0-1.0** (npm 1.7.0) | Importable base64 modules: Inter fonts as typeface `.json` (Text3D) + `.woff`, Poly Haven HDRIs as 512px `.exr`, matcaps/normals/textures as 512px `.webp`, small GLBs | **Best offline source for drei**: no CDN calls, so renders stay deterministic. Use dynamic `import()`. |
| [3dicons.co](https://3dicons.co/) | **CC0** per their FAQ, commercial use without attribution | Pre-rendered images (webp/png), Figma file/plugin. Source 3D files ⚠ not confirmed | 2D sprites of 3D icons (count on the page is inconsistent: 200 icons / 1,400+ renders). Use as billboards or the 2D overlay, not as meshes. |
| pmndrs market (`market.pmnd.rs`) | n/a | **Returned 404 on 2026-10-31**: treat as dead | Use @pmndrs/assets instead. |
| nidorx/matcaps | **No license**: authors unknown | PNG | **Avoid for monetized videos.** Use @pmndrs/assets matcaps or bake your own. |

**Downloaded or generated models:** take them from Poly Haven (CC0), Sketchfab (check the license) or Poly Pizza (check the license). Pipeline: scale to the scene → export **GLB** (Draco off, or Meshopt) into `07-studio/engine/public/3d/models/` → load with `useGLTF(staticFile(...))`. Generated-model rights follow the generator's ToS ⚠, so record them in `brief.md`.

### drei helpers and their asset needs

| Helper | Need | Determinism in Remotion |
|---|---|---|
| `Environment` | `preset` downloads 1k HDRs from `raw.githack.com/pmndrs/drei-assets/...`. drei warns it is "not meant to be used in production… relies on CDNs" | **Never use `preset`.** Pass `files={staticFile("3d/hdri/x.hdr")}` or an @pmndrs/assets EXR, or build a studio from `<Lightformer>`s (no file needed). |
| `Text3D` | typeface JSON font (`facetype.js`, or @pmndrs/assets Inter `.json`). Wrap in `<Center>` | Deterministic. Ship the JSON locally. Spanish accents need a charset that includes áéíóúñ¿¡ ⚠ (the @pmndrs/assets Inter is a subset, so test it). |
| `Float` | none | **Not deterministic**: uses `useFrame` + `state.clock.elapsedTime` (source verified). Rewrite as `Math.sin(frame/fps*speed)`. |
| `ContactShadows` | none | Renders shadows inside `useFrame` (runs on `advance()`). With moving objects keep `frames={Infinity}`. For static scenes `frames={1}` is cheaper. |
| `MeshTransmissionMaterial` | none (renders FBO passes inside `useFrame`) | Sets `time = clock.elapsedTime`, so keep `temporalDistortion={0}`. Expensive (extra scene renders); limit to 1–2 meshes and `samples≤6`. |
| `Sparkles`, `Stars`, `Cloud`, `MeshWobble/DistortMaterial` | none | Animate through the clock or `useFrame` ⚠ (not individually verified). Replace with frame-driven equivalents. |

## 3. The "3D made with Claude/three.js" short-form style

The main corpus is local: `05-tools/repos/awesome-opus5-5-videos` (703 prompts; `data/videos.json` has `category`, `tech_tags`, `post_url`). 218 entries are 3D or three.js. Best ones for this channel:

| Prompt file (`prompts/`) | Why |
|---|---|
| `agioyaz-397647.md` | Full **vertical 1080x1920 30fps three.js short film** spec ("White Space"): structured experience/setting/quality-bar sections. Best template for writing scene specs. |
| `okazaky-084783.md` | Vertical three.js music video pipeline: storyboard per lyric line ("what to show in 3D / Camera / Main word"), contact-sheet verification, -14 LUFS, palette limited to Black/Bone/Orange. |
| `nft-chen-068069.md` | 15 micro-explainer prompts (Chinese), including **12s isometric 2.5D process animation** and **three.js exploded view of a phone with dashed callouts**. |
| `acoramaa-053577.md`, `irinatoxi-962937.md` | "Powers-of-ten" continuous zoom (desk→atom, phone→atoms) with a scale ruler HUD. A strong hook format. |
| `mdaman010-111079.md` | "Show me what goes on inside an AI data centre": a one-line prompt producing a 3D tour. |
| `iniyanai-856596.md` | Mechanical-keyboard explainer, 3D cuts timed to the beat, real switch-sound SFX. |
| `wikiwayne-080350.md` | **Claymation** desk loop "animated on twos" (stop-motion feel) in three.js. |
| `juancarlos17626-429530.md` | (Spanish) 3D logo intro: pieces fly in and assemble, a glint passes, the name types in. Chrome/gold/glass/clay/neon variants. |
| `eigeorguy-813651.md`, `lribes4-742305.md` | Diorama / snow-globe miniatures (London, anime hideout). |
| `llama3dstudio-918962.md`, `thusatharan-640926.md`, `rubenssoto-ai-802657.md` | "Fully procedural, no imported models" (fried chicken, elephant, F1 pit stop). |
| `aijipusi75693-284735.md`, `argbeknwn-466818.md` | Explicitly **Remotion + Three.js** (lyric-synced 3D, abstract "inside your mind"). |

Watch originals and remakes on [Skillry](https://skillry.dev/ai-videos/opus-5-5) (each prompt links its X post). Other sightings: an **ISO-GLOW** isometric Claude skill that added three.js support in Oct 2026 (@Aprilzz423 on X ⚠, snippet only; X is paywalled to fetch), and a paid "What if…" three.js explainer pipeline with TikTok-safe captions on Payhip ⚠ (sales page). I found no single dominant TikTok creator. The trend is driven by X posts reposted to TikTok/IG ⚠.

**Visual recipe common to the strongest examples:**
- **Subject:** one hero object or a miniature diorama on a floating platform or rounded plinth, often isometric (orthographic camera, 35.264° pitch / 45° yaw).
- **Materials:** matte clay (high roughness, slight subsurface feel through a warm hemisphere light), toon with 3–4 band ramps + outlines, frosted glass/glassmorphism over a neon accent, or brushed metal for hero shots.
- **Lighting:** a soft key from about 45° above, a rim light in the accent color, a low-intensity environment (studio HDRI or Lightformers), and contact shadows. Dark scenes use emissive accents + bloom.
- **Palette:** 1 background + 2 neutrals + 1–2 saturated accents (e.g. bone/charcoal/orange, navy/cream/coral). Pastels for clay, near-black for neon/data.
- **Camera:** slow continuous moves (dolly-in, 15–30° orbit, crane), a punch-in on each beat, powers-of-ten zoom, exploded views, rack focus on the subject change. Cuts land on the beat.
- **Type:** big headline and captions as a **2D overlay** (sharp, inside the safe box, reuses the existing caption system). 3D text (Text3D/extruded) only for 1–3 hero words or a logo.

## 4. Premium look that still renders in headless Chrome

- **Toon:** `meshToonMaterial` + `gradientMap` (3–5px DataTexture, **Nearest** min/mag filters, per three.js docs) + drei `<Outlines>` or an inverted-hull back-face mesh.
- **Clay:** `meshStandardMaterial` roughness 0.8–1, metalness 0, pastel colors, `hemisphereLight` (warm sky / cool ground), soft directional shadow (`PCFSoftShadowMap`, 2048 map), fillets via drei `RoundedBox` / `Capsule`. Optional: a CC0 clay matcap from @pmndrs/assets with `meshMatcapMaterial` (cheapest, no lights).
- **Glass/neon:** `meshPhysicalMaterial` (transmission 1, roughness 0.15, thickness 0.5, ior 1.4) is cheaper than MeshTransmissionMaterial. Emissive tubes with `toneMapped={false}` + Bloom.
- **Soft shadows:** `ContactShadows` (blur 2–3, opacity 0.4) or `AccumulativeShadows` ⚠ (progressive and time-accumulated, so avoid it during animation). Baked shadow textures are the safest option.
- **Post-processing:** `@react-three/postprocessing` `EffectComposer` renders in `useFrame` and runs on each `advance()`. Bloom, Vignette, ToneMapping and DepthOfField are frame-pure. **Avoid** `Noise`, `Glitch` and other random/time-based effects (or seed them), and temporal AO. N8AO/SSAO are heavy under `angle`/`swangle` ⚠. Keep `multisampling` ≤4 and pin compatible three/postprocessing versions (known breakages between versions).
- **Performance:** `<Instances>`/`instancedMesh` for repeated props (cities, particles, bars), `dpr={1}` (canvas is already 1080x1920), geometry segments ≤64, ≤3 shadow-casting lights, render long videos in chunks (angle leak). Pre-compile with a warm-up frame ⚠.
- **Procedural first:** RoundedBox, Extrude from SVG paths (reuse the 2D illustrated kit's paths → `ExtrudeGeometry` with bevel), Lathe for bottles/cups, Tube for data flows, CSG ⚠. No network, no licensing, deterministic.
- **Camera rigs:** a `<CameraRig>` reading `frame` that interpolates position/target keyframes with `interpolate(..., {easing: Easing.bezier(.45,0,.2,1)})`. Dolly = position along a vector; orbit = `angle = interpolate(frame,…)`, `x=r*sin`, `z=r*cos`; rack focus = animate DOF `focusDistance`. Use `spring({frame, fps, config:{damping:14}})` for object pops (scale 0→1, y drop-in). Stagger with `frame - i*4`.
- **Vertical framing:** FOV 35–45° (vertical FOV in three.js, so portrait already gives a tall view). Keep the hero in the middle 60% and leave the top 15% and bottom 25% clear for the overlay and platform UI.

## 5. Recommended plan

### Four template looks

| Template id | Visual recipe | Camera language | Assets |
|---|---|---|---|
| `clay-diorama` | Pastel clay miniatures on a rounded floating plinth, hemisphere + soft key, contact shadow, cream background | Slow 20° orbit + dolly-in per scene; objects spring-pop in; stop-motion option ("on twos": quantize `frame` to even numbers) | Procedural (RoundedBox, Lathe, Capsule) + optional Kenney/Quaternius CC0 GLBs |
| `iso-toon` | Orthographic isometric blocks, toon 3-band shading + outlines, navy/cream/coral (matches the illustrated kit) | Fixed iso angle; pans and zooms along the process; exploded view; numbered 2D labels anchored to 3D points | Procedural + SVG-path extrusions reused from the illustrated kit |
| `neon-glass` | Near-black background, frosted glass panels, emissive tubes/orbs, Bloom + Vignette, data bars instanced | Push-in + rack focus between panels; light sweep across glass; beat-synced cuts | Procedural + Lightformer studio (no HDR file) |
| `pedestal` | One hero object (phone, logo, can, chip) on reflective floor, studio HDRI (local Poly Haven 1k), 3D extruded logo/1 hero word | Turntable 360 → punch-in → exploded view with dashed callouts → reassemble | Local CC0 HDRI, Text3D JSON font, optional Blender-MCP GLB |

### Low-poly sets (format catalog, 2026-11)

`neon-grid`, `soft-studio`, `moody-night` and `voxel-world` put the objects inside a set (`visual.set`: `road`, `desk`,
`room`, `grid`, `stage`, `city`, `voxel`; `src/three/sets.tsx`). Rule: relaxed stylized low poly, never realism. Only cheap
techniques: one hemisphere light + one directional key with a single PCF shadow map, linear fog in the backdrop's horizon
color, standard/flat materials, data textures generated once, additive glow decals instead of real lights (lamp pools,
headlights). No HDRI, no AO, no depth of field, no new postprocessing, no Blender (Eevee measured 9-16 s per 1080x1920
frame). Measured on an M4 (24 frames, one tab, 1080x1920): every 3D look renders in roughly 100-160 ms per frame.
Set props, cars and characters are Kenney CC0 GLBs (Car Kit, City Kit Commercial/Roads, Furniture Kit, Blocky Characters),
listed in `03-assets/3d/licenses.json`; the characters' clips are sampled with `mixer.setTime(t)`, never a clock.

Shared engine pieces: `Scene3D` (ThreeCanvas + lights + tone mapping), `CameraRig`, `Pop`/`Stagger` springs, `Anchor` (projects a 3D point to 2D for overlay labels), seeded `Particles` (instanced), and `chromiumOptions.gl="angle"` in `lib/render.mjs`.

### How Claude should write 3D scenes (prompt guide)

1. Read `~/.claude/skills/remotion-markup/3d.md` first. It wins over generic three.js skills.
2. Everything is a pure function of `useCurrentFrame()`: no `useFrame`, `clock`, `Math.random`, `Date`, drei `Float`/`Sparkles`, or `Environment preset`.
3. Write the scene as data: per scene `{hero, props[], camera:{from,to,ease}, palette, beat frames}`, then map it to components. Max 1 hero + 6 props.
4. Prefer procedural geometry. If a model is needed, use a local CC0 GLB from `public/3d/` (no URLs) and log its source and license in `brief.md`.
5. Lighting preset per look: key + rim + hemisphere (+ Lightformers). Always add a contact or ground shadow.
6. Text: headline and captions in the 2D overlay; Text3D only for ≤3 hero words, with a local typeface JSON.
7. Motion: a pattern interrupt every 2–4s (camera move change, pop, cut); springs for entrances, eased interpolate for the camera; hook in the first 3s.
8. Keep it cheap: dpr 1, one shadow-casting light, instancing for >20 repeats, bloom only where a look already has it.
9. Verify: render stills at frames 0, 25%, 50%, 75% and the last frame with `gl=angle`, check the safe box and that two renders of the same frame are identical, then the full render.

## Sources

- Remotion: [@remotion/three](https://www.remotion.dev/docs/three) · [ThreeCanvas](https://www.remotion.dev/docs/three-canvas) · [--gl options](https://www.remotion.dev/docs/gl-options) · [remotion-dev/skills](https://github.com/remotion-dev/skills)
- Skills: [CloudAI-X/threejs-skills](https://github.com/cloudai-x/threejs-skills) · [skills.sh listing](https://skills.sh/cloudai-x/threejs-skills) · [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) · [emalorenzo/three-agent-skills](https://www.skills.sh/emalorenzo/three-agent-skills) · [iart-ai/explainer-video-skills](https://github.com/iart-ai/explainer-video-skills) · [stochosfrance/lowpoly-reel](https://github.com/stochosfrance/lowpoly-reel) · [htekdev/explainer-3d](https://github.com/htekdev/explainer-3d)
- Assets: [Kenney 3D](https://kenney.nl/assets/category:3D) · [Kenney Mini Skate (CC0)](https://kenney.nl/assets/mini-skate) · [Quaternius FAQ](https://quaternius.com/faq.html) · [Poly Haven license](https://polyhaven.com/license) · [Poly Pizza ToS](https://poly.pizza/docs/tos) · [Sketchfab Download API](https://sketchfab.com/developers/download-api) · [KhronosGroup glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) · [pmndrs/assets](https://github.com/pmndrs/assets) · [3dicons.co](https://3dicons.co/) · [nidorx/matcaps](https://github.com/nidorx/matcaps)
- drei: [Environment](https://drei.docs.pmnd.rs/staging/environment) · [Text3D](https://drei.docs.pmnd.rs/abstractions/text3d) · source: [Float.tsx](https://github.com/pmndrs/drei/blob/master/src/core/Float.tsx), [ContactShadows.tsx](https://github.com/pmndrs/drei/blob/master/src/core/ContactShadows.tsx), [MeshTransmissionMaterial.tsx](https://github.com/pmndrs/drei/blob/master/src/core/MeshTransmissionMaterial.tsx), [useEnvironment.tsx](https://github.com/pmndrs/drei/blob/master/src/core/useEnvironment.tsx)
- three.js: [MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html) · [react-postprocessing](https://react-postprocessing.docs.pmnd.rs/introduction)
- Style corpus: [Skillry Opus 5.5 videos](https://skillry.dev/ai-videos/opus-5-5) · local `05-tools/repos/awesome-opus5-5-videos` · [ISO-GLOW post ⚠](https://x.com/Aprilzz423/status/2109294655489868227)
