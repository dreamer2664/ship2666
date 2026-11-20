# Architecture — SHIP2666 runtime stack

## Chosen stack
- **Runtime / viewer:** Three.js (ES modules), served as a static, single-page explorable 3D application.
- **Geometry:** Procedurally generated in JavaScript from a master dimensional specification (hull sections, deck levels, bulkheads, rooms, machinery). All geometry remains editable source — no imported binary meshes.
- **Materials:** PBR (metalness/roughness) defined in JSON and applied in Three.js; albedo/normal/roughness generated procedurally or from bundled textures where available.
- **Lighting:** Physically plausible global-illumination approximation (directional sun + hemisphere/ambient + practical point lights), with period-appropriate cabin practicals.
- **Ocean:** Tessendorf-style spectral surface implemented in Three.js shaders (CPU-friendly, multiscale swell/chop/foam).
- **Systems:** State-driven ship state (engine telegraph, steam pressure, shaft speed, propeller, rudder, smoke) driving kinematic animation of engines, shafts, propellers, rudder and smoke.
- **Interactivity:** First-person/orbit explorer; doors, hatches and movable fittings with correct pivots and collision.
- **Rendering:** Viewport renders for iteration; offline inspection renders via headless Chrome/Puppeteer where available, bounded to preview quality during development. Final-quality renders documented as a technical constraint (no GPU, low RAM).

## Repository layout (source)
```
source/
  ship/        master dimensional spec + coordinate system
  hull/        hull geometry, plating, sections
  decks/       deck levels, bulkheads, compartment shells
  interiors/   rooms, furnishings, trim
  machinery/   engines, boilers, condensers, pumps
  systems/     shafts, propellers, rudder, steering, pipes, ventilation
  ocean/       ocean shader, hull interaction, wake
  materials/   PBR material definitions
  lighting/    lighting presets
  interactions/ doors, hatches, controls, state model
assets/        textures, models, audio
renders/       gen1..genN, final, manifests
tests/         scale, connectivity, mechanism, manifest tests
tools/         geometry generators, render scripts, cleanup
```

## Coordinate system
- Real-world units: metres (m).
- Origin: keel baseline at aft perpendicular (documented in `source/ship/`).
- X: aft->forward, Y: starboard, Z: keel-up. Centreline at Y=0.
- Deck elevations, hull stations and reference waterline documented per deck.

## Deliverable principle
The core deliverable is the editable 3D project (source + assets + systems + tests + docs), explorable in a browser, not a static render gallery. Renders are inspection evidence, not the product.
