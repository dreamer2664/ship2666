# Project status

**BLOCKOUT / PRODUCTION MODELLING — NOT COMPLETE**  
Agent branch: **`teutonic-9NXT5G1C`**

## Built in source, not yet visually approved

- Shared full-scale dimensional specification and inspectable source ledger.
- 299 individual spatial records with polygons, elevations, evidence basis, refinement state and access links. Metric boundaries are inferred; this is not a claim of 299 archivally verified rooms.
- Native lofted hull with actual window/porthole openings, internal frames, deck structure and stern screw aperture.
- Individual doorway openings and hinge pivots, two-deep cabin banks with connecting vestibules, period-inspired furnishings, service fittings and multilevel stairs.
- Twin crank-linked triple-expansion assemblies, 16 boilers with 76 furnace mouths, separate condensers, shafts, three-bladed overlapping/staggered propellers and steering gear.
- Two raked open funnels, three rigged masts, fourteen individually constructed boats/davits, deck planking, railings, foredeck handling gear and bridge fittings.

## Current gates

No whole-ship completion gate has passed. Original lines, exact arrangements and the company photograph remain missing. Inventory states are not promoted merely because geometry has been generated. Automated layout, mechanical and retention checks are being implemented, followed by multi-camera native renders and browser inspection. A successful build is not a visual-quality approval.

## Known implementation constraints

The editable scene is generated for Blender 3.4.1 on a two-core, CPU-only 4 GB sandbox. Texture maps are original 768-pixel procedural preview sources, not final close-up-approved material scans. Boiler, manoeuvring and environmental models are approximations; valve gear is not a full engineering Stephenson solver. Full continuous character collision, every auxiliary mechanism, manufacturing-scale detail and high-quality 4K all-area inspection remain unfinished.

## Incident record

The first native build generated geometry but stopped before saving the final scene because two camera JSON numbers used invalid leading-decimal notation. The input was corrected and camera validation moved ahead of heavy geometry work. Intermediate native checkpoints were added so later failures do not discard all generated geometry. See `logs/build_001.log` locally; the error is not hidden as success.
