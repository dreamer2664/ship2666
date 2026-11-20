# SHIP2666 · RMS Teutonic (1889)

**Status: RESEARCH — NOT COMPLETE**  
**Agent branch: `teutonic-0JYIGPYC`**

An evidence-led, editable reconstruction of the White Star liner RMS *Teutonic*, built by Harland & Wolff. The work follows whole-vessel coverage, production modelling, materials and functional/visual inspection in that order. A blockout is not a finished reconstruction.

## Target vessel
RMS *Teutonic* (1889), White Star Line (Oceanic Steam Navigation Co. Ltd.), Harland & Wolff Yard No. 208, launched 19 January 1889. Selected configuration: **1889 original construction** — no armament, wartime modifications or later refits.

## Current checkpoint (session 2)
- Repository structure established: `docs/`, `references/`, `source/`, `assets/`, `renders/`, `tests/`, `tools/`.
- Isolated agent branch `teutonic-0JYIGPYC` pushed to `dreamer2664/ship2666`.
- Research: Titanic Belfast fact file and two RMG records inspected and preserved; `docs/evidence_ledger.csv` (29 entries), `docs/space_inventory.csv` (20 seeded spaces), `docs/source_manifest.csv` (13 sources) created.
- Reference images downloaded to `references/historical_photographs/`.
- Company reference photograph **not attached**; no observations claimed from it.
- Editable Three.js explorable runtime built: procedural hull, decks, funnels, masts, twin engine rooms, propellers, rudder, spectral ocean, ship state (telegraph/helm/steam/shaft/smoke) driving kinematic motion.
- Sanity checks: `tests/check_inventories.py` passes (20 spaces, 15 assets, 29 ledger entries).

## Run the explorable reconstruction
```
./tools/serve.sh        # serves on http://localhost:5173
# or: python3 -m http.server 5173
```
Open `http://localhost:5173` in a browser. Left-drag to orbit, right-drag to pan, scroll to zoom. Use the telegraph and helm to drive the engines, shafts, propellers and rudder.

The source is editable JavaScript/JSON; no build step or GPU required. All geometry derives from `source/ship/dimensions.js`.

## Hardware & constraints
- 2 CPU cores, ~3.8 GiB RAM, no GPU; Blender and PDF CLI tools not installed.
- Stack: browser-based Three.js (unpkg CDN), procedurally generated geometry, PBR materials, simplified two-layer ocean. High-resolution offline renders (3840x2160) are a documented technical constraint pending a render farm.

## Repository layout
```
docs/               project_status, architecture, historical_configuration,
                    evidence_ledger.csv, space_inventory.csv, asset_inventory.csv,
                    quality_checklist.md, execution_state.md, work_log.md
references/         company_reference, historical_photographs, deck_plans,
                    engineering, downloads, source_manifest.csv
source/             ship, hull, decks, interiors, machinery, systems, ocean,
                    materials, lighting, interactions
assets/             models, textures, materials, audio
renders/            gen1..genN, final, manifests
tests/              check_inventories.py
tools/              serve.sh
```

## Accuracy policy
Separate Teutonic-specific evidence, sister-ship proxies, period analogues and inference. Record conflicting dimensions and configuration dates. Never manufacture room counts, fabricate evidence, or call a space finished because a shell exists. See `docs/quality_checklist.md`.

## Credentials
Credentials are never part of the repository. The supplied instruction attachment is intentionally not copied here in its original form because it contains authentication material.
