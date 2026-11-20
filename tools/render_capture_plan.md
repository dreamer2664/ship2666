# Render capture plan — SHIP2666

## Requirement (brief section 9)
Repeatable, automated rendering pipeline with named cameras/lighting; generations
`renders/gen1..genN`, each with a `manifest.json`; retention rule keeps gen1..gen9,
deletes gen1..gen5 only after gen10 validated, then rolling window of newest five.

## Camera rig
`source/lighting/cameras.js` exports:
- `lightingEnvironments` (daylight, overcast, dusk)
- `cameras` — 27 named inspection cameras covering exterior (bow/both broadsides/
  stern/elevated/deck-level), decks, passenger public rooms, cabins per class,
  crew/service, machinery (engine/boiler/shaft/rudder/propeller), cutaways, and
  detail close-ups (hull plate, porthole, railing, door, engine).
- `cameraOrder` — ordered sweep for a complete generation.

## Technical constraint (recorded, not silently lowered)
The execution sandbox has:
- 2 CPU cores, ~3.8 GiB RAM, no GPU
- Blender NOT installed
- No headless browser (chromium/chrome) and no Puppeteer available

Therefore actual screenshot/render capture of the Three.js scene cannot run in this
sandbox today. Per the brief, this is a documented technical constraint, not a
reduced quality target. The editable 3D source (the deliverable) is complete and
runnable; renders are inspection evidence.

## How gen renders will be produced (when a render-capable host is available)
1. Serve `index.html` (port 5173 via `./tools/serve.sh`).
2. Drive a headless browser (Puppeteer/Playwright) to load `index.html`, apply each
   named camera from `source/lighting/cameras.js` + a lighting environment,
   wait for the animation frame to settle, and screenshot to `renders/genN/<cameraId>.png`.
3. Write `renders/genN/manifest.json` (generation, timestamp, commit, camera IDs,
   areas inspected, image paths, quality settings, changes, known defects, next
   corrections) per `renders/gen1/manifest.json` schema.
4. Validate manifest + retention rule with `tests/` before deleting older generations.

## Interim (this sandbox)
- `renders/gen1/manifest.json` exists as the plan/placeholder.
- `tests/check_inventories.py` validates docs inventories.
- Add `tests/test_render_manifest.js` (or equivalent) to validate manifest schema
  and retention rule once render captures begin.
- Keep `renders/final/` untouched by cleanup; never delete source/reference/docs.

## Quality target
Final inspection renders minimum 3840x2160 where hardware allows; preview-quality
during iteration. Never mistake a low-sample viewport screenshot for a final render.
