# 3D assets (CC0)

Local assets for the 3D templates. Renders never fetch
from the network: the engine copies what a spec needs into the per-job Remotion public dir (`lib/three-assets.mjs`).

| Folder | Content |
|---|---|
| `models/` | GLB models: `{"kind": "model", "model": "<id>"}`, the `car` and `character` kinds, and the props of the environment sets (`SET_MODELS`) |
| `hdri/` | 1k equirectangular HDRIs used as environment light (pedestal: `studio-small-09`, clay-diorama: `brown-photostudio-02`) |

Every file, its source page, license and credit is listed in [`licenses.json`](licenses.json). All are **CC0-1.0**
(Poly Haven and Kenney), so no attribution is required; the credit is kept anyway.

## Adding a model

1. Only CC0 / CC BY sources (Poly Haven, Kenney, Quaternius, CC0/CC BY Poly Pizza or Sketchfab models). Never NC/ND.
2. Export or pack to a single `.glb` (`npx -y @gltf-transform/cli@4 copy in.gltf out.glb`), ideally under 3 MB, with
   1k textures. The renderer normalizes the size, so scale does not matter.
3. Add an entry to `licenses.json` and its id to `MODEL_IDS` in `07-studio/engine/lib/scene3d.mjs`
   (`test/three-rendered.test.mjs` checks they match, exist and are CC0; keep the folder under 15 MB). CC BY models also need their credit in the project `brief.md`.
