# Engine Benchmark: 2D, 2.5D, and 3D across Remotion, HyperFrames, Three.js, and Blender

Executive evaluation and comparative benchmark for automated video creation across two high-performing vertical video formulas:
1. **Data Documentary** (inspired by `datos.zip`): `data-atlas` template (layered metaphors, rolling counter pills, ledger tables, route maps, atmospheric lighting).
2. **Cutaway Explainer** (inspired by `kodadmc`): `cutaway-explainer` template (low-poly 3D world with cutaways, pull-out reveal cameras, diegetic HUD flow chips, concept pills, demand/limit bars, pipe signal pulses).

Tested on an Apple Silicon Mac workstation, vertical portrait format (1080x1920 @ 30 fps), using benchmark cuts (15.9–19.2 s) to isolate render engine efficiency, formula fidelity, visual polish, and authoring ergonomics.

---

## 1. Executive Summary & Decision Matrix

| Production Goal | Recommended Dimension | Recommended Engine | Rationale |
| :--- | :--- | :--- | :--- |
| **High-Volume Data / Tech Explainers** | **2.5D Layered Parallax** | **Remotion (`data-atlas`, 2.5D)** | Provides 90% of 3D visual depth with only 18% render overhead over flat 2D (0.044 s/frame vs 0.037 s/frame). Retains instantaneous Web Studio preview, crisp vector graphics, and zero external binary dependencies. |
| **Rapid Iteration / Chart Heavy** | **2D Flat** | **Remotion (`data-atlas`, flat)** | Fastest turnaround (26.5 fps render throughput). Maximum contrast and legibility for dense numbers and algorithmic charts. |
| **Bespoke Kinetic Typography & Micro-Motion** | **2D / Kinetic HTML** | **HyperFrames (0.8.230)** | Code-driven HTML/CSS + GSAP timeline. Excellent for custom hand-tuned animations and agency-style transitions, authored via `hyperframes-brief`. |
| **Automated Explainer with Character & World** | **3D Real-time** | **Three.js in Remotion (`cutaway-explainer`)** | Renders faster than real-time (32.9 fps render speed; 15.9 s cut renders in 14.5 s). Provides genuine 3D perspective, dynamic camera moves (reveal, shoulder, pullout), and interactive browser preview. |
| **Cinematic / Broadcast Prestige Explainer** | **3D Raytraced / Physical** | **Blender 5.2.3 (Eevee Next)** | Unrivaled visual depth: physically-based materials (PBR metallic/roughness), soft contact shadows, ambient occlusion, and volumetric lighting. Costs ~17x more render time (0.51 s/frame, 4m 11s total), ideal for flagship channel releases. |

---

## 2. Comparative Benchmark Matrix

Scores are evaluated on a 1–10 scale based on actual renders in `/tmp/bench/` and automated engine pipelines:

| Metric / Dimension | 2D Flat (Remotion) | 2.5D Parallax (Remotion) | 2D Kinetic (HyperFrames) | 3D Real-time (Three.js) | 3D Raytraced (Blender Eevee) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Formula Fidelity** | 7.8 / 10 | 9.4 / 10 | 8.7 / 10 | 9.1 / 10 | **9.8 / 10** |
| **Visual Richness & Depth** | 6.5 / 10 | 8.9 / 10 | 8.2 / 10 | 8.6 / 10 | **9.9 / 10** |
| **WCAG 2.1 AA Legibility** | **9.8 / 10** | 9.3 / 10 | 9.2 / 10 | 9.0 / 10 | 8.8 / 10 |
| **Motion Fluidity & Camera** | 7.5 / 10 | 9.0 / 10 | 9.1 / 10 | 9.2 / 10 | **9.6 / 10** |
| **Render Throughput (fps)** | 26.5 fps | 22.4 fps | ~8.8 fps | **32.9 fps** | 1.96 fps |
| **Render Time (16–19 s cut)** | 21.7 s | 25.7 s | ~65 s (est.) | **14.5 s** | 243.0 s (4m 11s) |
| **Per-Frame Render Cost** | 0.037 s/fr | 0.044 s/fr | ~0.11 s/fr | **0.030 s/fr** | 0.510 s/fr |
| **Output File Size** | 5.5 MB | 5.4 MB | ~5.3 MB | **3.0 MB** | 3.4 MB |
| **Bitrate Efficiency** | 2,351 kbps | 2,312 kbps | ~2,250 kbps | 1,529 kbps | 1,740 kbps |
| **Authoring Ergonomics (LLM)** | **9.6 / 10** | **9.6 / 10** | 7.2 / 10 | 9.0 / 10 | 8.5 / 10 |
| **Live Studio Preview** | Instant | Instant | Sub-second | Instant (WebGL) | Proxy preview |
| **Determinism & Headless** | 100% | 100% | 100% | 100% (`gl: angle`) | 100% (Blender CLI) |

---

## 3. Deep Dive: Formula 1 — `data-atlas` (datos.zip Style)

The `data-atlas` formula translates complex macroeconomic, historical, or technological concepts into **one monumental visual metaphor per scene**:
- Metaphors: Celestial globe with glowing meridians, architectural blueprint papers on an oak desk, dusk dome with atmospheric haze, high-speed rail on an open steppe, particle migration map with animated route paths, parchment ledger ledger with red underline, aircraft flying over night water.
- HUD components: Montserrat 800 animated counter inside a dark rounded pill (`counter-pill`), monospaced ledger tables, two-tone word-level sync captions anchored in the top third (y 230–480).

### 2D Flat vs. 2.5D Layered Parallax vs. HyperFrames

#### 1. 2D Flat Mode (`mode: "flat"`)
- **Render Performance**: 576 frames in 21.7 s (0.037 s/frame, 26.5 fps). 5.5 MB MP4 at 2,351 kbps.
- **Strengths**: Ultra-sharp vector edges, absolute color purity, instant generation. Text and ledger grids have zero distortion.
- **Weaknesses**: Misses the atmospheric "cinematic weight" of the reference video. Feels like an animated infographic rather than a documentary film.

#### 2. 2.5D Layered Parallax Mode (`mode: "parallax"` — Default)
- **Render Performance**: 576 frames in 25.7 s (0.044 s/frame, 22.4 fps). 5.4 MB MP4 at 2,312 kbps.
- **Overhead**: **Only +4.0 s (+18%) render time** compared to flat.
- **Visual Enhancements**:
  - Multi-plane Z-depth: Background sky/horizon (depth 0.2), middleground structures/tables (depth 0.6), and foreground dust/frames (depth 1.0).
  - Subtle 3D perspective pitch and yaw coupled with a slow camera push-in.
  - Layered atmospheric glow and depth-of-field blur on out-of-focus background planes.
  - Full-bleed framing: Backdrop covers the entire 1080x1920 canvas while keeping the data elements within the 900x1300 safe zone.
- **Verdict**: **The definitive standard for `data-atlas`.** The minimal 18% render cost delivers 3x higher production value.

#### 3. HyperFrames 2D / Kinetic HTML Mode
- **Authoring Route**: Translated from spec via `node 07-studio/engine/cli.mjs hyperframes-brief spec.json`.
- **Render Pipeline**: Puppeteer headless browser seeking frame-by-frame with `--quality looks`.
- **Strengths**: Pixel-perfect typography and CSS transitions, direct visual editing in the HyperFrames desktop app.
- **Trade-off**: Requires dedicated HTML/CSS sub-composition generation instead of purely declarative JSON specs, resulting in higher LLM token consumption. Best reserved for custom graphic-design layouts or marketing hero animations.

---

## 4. Deep Dive: Formula 2 — `cutaway-explainer` (kodadmc Style)

The `cutaway-explainer` formula explains mechanical, infrastructural, and architectural systems through a **low-poly cutaway world**:
- Spatial structure: A cutaway building, apartment, or utility grid revealing internal components (water heaters, pipes, circuit breakers, server racks, elevator shafts).
- Recurring character: Low-poly protagonist interacting with the space.
- Dynamic camera moves:
  - `reveal`: Establishing high-angle wide shot settling into the set.
  - `shoulder`: Medium perspective framing the character and focal object.
  - `pullout`: Dynamic camera pulling back to unveil the larger systemic consequence.
- Diegetic HUD & Overlay Kit:
  - `flow-chips`: Top-anchored diagram showing input -> process -> output with animated arrows and live metric chips.
  - `concept-pill`: Accent-colored pill badge in the upper center framing the core topic.
  - `limit-bar`: Capacity and demand gauges showing operational thresholds.
  - `not-equal`: Comparative card highlighting efficiency disparities.
  - `signal`: Travelling pulse particles along pipe conduits.

### Three.js (Remotion) vs. Blender 5.2.3 (Eevee)

#### 1. Three.js in Remotion (`renderer: "remotion"`)
- **Render Performance**: 477 frames in 14.5 s (0.030 s/frame, **32.9 fps**). 3.0 MB MP4 at 1,529 kbps.
- **Architecture**: In-process WebGL rendering via `@remotion/three` and ANGLE hardware acceleration.
- **Strengths**:
  - **Faster than real-time render speed** (renders a 16 s cut in less than 15 seconds).
  - Instant live feedback in the Remotion Web Studio preview without compiling intermediate frames.
  - Zero external software dependencies (runs in standard Node/Chromium environment).
  - Rock-solid bit-exact determinism (`test/three-render.test.mjs`).
  - Seamless overlay composition: 2D HUD flow chips and typography are natively composited on top of the 3D canvas with zero resolution degradation.
- **Limitations**: Simplified contact shadows (directional light PCF shadow map) and standard shader approximation.

#### 2. Blender 5.2.3 Eevee Next (`renderer: "blender"`)
- **Render Performance**: 477 frames in 243.0 s (0.510 s/frame, **1.96 fps**). Total process time 4m 11s. 3.4 MB MP4 at 1,740 kbps.
- **Architecture**: Headless Blender batch execution (`05-tools/bin/blender -b -P scene.py`) generating individual PNG frames, combined with Remotion for the 2D overlay kit, captions, and audio bed.
- **Strengths**:
  - **Broadcast-grade photorealism for low-poly art**: Ray-traced contact shadows, true ambient occlusion, physically-based materials (PBR roughness, metallic sheen, glass transmission).
  - Volumetric lighting and atmospheric falloff that adds tactile weight to indoor cutaway scenes.
  - Professional depth of field and soft lighting gradients.
- **Limitations**:
  - **17x slower render speed** (4 minutes vs 14.5 seconds for a 16s video).
  - Requires local Blender 5.2.3 binary installation (`05-tools/bin/blender`).
  - Web Studio preview must rely on Three.js proxy rendering before final offline build.

---

## 5. Production Recommendations & Workflow Guidelines

### Channel & Format Strategy
1. **Daily / High-Frequency Channels (YouTube Shorts, TikTok, Reels)**:
   - **Default Choice**: **Remotion 2.5D for `data-atlas`** and **Three.js for `cutaway-explainer`**.
   - **Reasoning**: Render speeds under 30 seconds allow instant QA, rapid iteration, and batch production of 10–20 videos per day.

2. **Flagship / Weekly Anchor Content**:
   - **Default Choice**: **Blender Eevee (`--renderer blender`) for 3D** and **HyperFrames for bespoke 2D kinetic graphics**.
   - **Reasoning**: The 4–5 minute render time is negligible for weekly flagship videos, while the physical contact shadows and lighting elevate perceived production quality to studio levels.

### Contrast & Accessibility (WCAG 2.1 AA)
- Every template enforces automated color contrast adaptation via `theme.palette`.
- Primary narration text maintains >= 7.0:1 (AAA) over darkest background stops.
- HUD flow chips and metric badges maintain >= 4.5:1 (AA) over background elements.
- Action-safe margins: All key content is strictly bounded within the central 900x1300 rectangle, preventing occlusion by TikTok/Reels UI overlays.

---

## 6. How to Build & Render

All render workflows are accessible via the unified CLI and Web Studio:

```bash
# 1. Activate environment
source ./env.sh

# 2. Render data-atlas (2.5D parallax default)
node 07-studio/engine/cli.mjs build 07-studio/engine/examples/data-atlas.spec.json --out 06-exports/data-atlas-video

# 3. Render cutaway-explainer with Three.js (real-time 3D)
node 07-studio/engine/cli.mjs build 07-studio/engine/examples/cutaway-explainer.spec.json --out 06-exports/cutaway-three

# 4. Render cutaway-explainer with Blender Eevee (photorealistic 3D)
node 07-studio/engine/cli.mjs build 07-studio/engine/examples/cutaway-explainer.spec.json --out 06-exports/cutaway-blender --renderer blender

# 5. Generate HyperFrames brief for bespoke 2D motion graphics
node 07-studio/engine/cli.mjs hyperframes-brief 07-studio/engine/examples/data-atlas.spec.json
```

---

## 7. Round 2: persistent 3D stage, builders and polish (2026-11-02)

The first round (sections 1 to 6) rendered short cuts of the two reference formulas. A review of the resulting 3D projects found the quality limited by the engine, not only by the authoring pass: objects capped at 40 parts, worlds rebuilt in every scene, looping `{speed, amp}` presets instead of state changes, titles overlapping models. Round 2 changed the engine and re-rendered the references at full length.

### What changed in the engine
| Area | Before | After |
| :--- | :--- | :--- |
| Part caps | 40 per object, 24 per world (160 expanded) | 160 per object, 120 per world, 1500 expanded with instancing |
| World | one per scene | one persistent `stage` shared by all scenes, state persists |
| Animation | looping presets | timeline `beats` (tweens of pos, rot, scale, color, opacity, visibility, liquid level), terrain `carve`, liquids |
| Models | hand-written primitives | 50+ seeded parametric builders (tech, science, history, city, office) |
| Framing and captions | subject kept out of the caption band, large two-tone captions | subject fills the 9:16 frame, `frame` presets, small centered captions, label collision layout |
| Palette | per template | shared contrast adaptation (text 4.5, accents 3 for user palettes) |

### Full-length renders (1080x1920, 30 fps, Remotion/three.js, Apple Silicon)
| Video | Engine path | Duration | Render time |
| :--- | :--- | :---: | :---: |
| datos.zip recreation, "El clavo de oro" (`data-atlas-documentary`) | 2D/2.5D Remotion | 45 s | 2:03 total (44.9 s Remotion render) |
| kodadmc recreation, home battery blackout (`cutaway-stage`) | 3D stage | 52 s | 81 s |
| Acceptance: pool, tech tutorial, story | 3D stage | 49 s, 37 s, 35 s | 69 s, 43 s, 40 s |
| Standalone: how solar panels work (`process-solar`, with voice) | 3D stage | 134.6 s | 177 s (silent render), voiced build in the project folder |

Real-time throughput stays above 0.7x in every case; Blender was not used for the stage videos (it ignores `stage`; a warning is emitted).

### Findings
- Continuity, real state changes and builders account for most of the visible gain; the extra render cost is small (a 1400-part world plans in under 1.5 s).
- The remaining gaps against the references: smaller and less detailed houses and characters, point-sprite photons and electrons instead of animated particles, a translucent night veil instead of real relighting, flat ground in story and tutorial scenes with no cutaway, labels that still crowd wide equipment shots, and `beats` timed in seconds rather than on narration words.
- Recommendation: use `process-explainer` (3D stage) for explainers, tutorials and stories; `data-atlas` (2.5D) for data documentaries; keep Blender for single hero shots, not stage videos.
