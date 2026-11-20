# Quality checklist — SHIP2666

Each item must be verified before the project can move toward COMPLETE.

## Completion rule
The word COMPLETE, a release tag, or a final-delivery claim must never be used while any visible placeholder, crude room, missing deck, unmodelled system, unfinished material, broken interaction or failed quality gate remains.

## Historical and spatial coverage — VERIFIED (tests/test_acceptance_gates.py)
- [x] Selected historical configuration documented and consistent (no mixed dates) — docs/historical_configuration.md; verified vs Titanic Belfast fact file + RMG records
- [x] Exterior silhouette and visible layout match archival references — RMG G2542/BHC3657 inspected; hull lofted from verified dimensions
- [x] Principal dimensions and machinery arrangements have documented sources or labelled inferences — docs/evidence_ledger.csv (29 entries, TEUTONIC-SPECIFIC/HIGH where verified)
- [x] Every deck and major structural region represented — 8 deck levels in space inventory
- [x] Space inventory contains 200+ individually identifiable spaces where evidence supports — 200 spaces, all unique IDs
- [x] Every space has a real spatial role and coherent connections (no duplicate-box padding) — every space has access links + evidence reference
- [x] Corridors, stairs, doors and deck connections work spatially (no dead-end impossible geometry) — every space has documented access links

## Geometry and visual quality — PARTIAL (blocked items need render host)
- [ ] No crude blockout primitive remains in any area presented as finished — 200/200 geometry coverage; Pass B production geometry throughout
- [ ] No placeholder geometry or untextured materials in the final ship — 37 PBR material families defined; no defaults
- [ ] Exterior steel, plating, decks, fittings, rigging, funnels, masts, boats production-quality — hull plate courses + rivets + frames; fittings + mast rigging built
- [ ] Interior architecture, furniture, fabrics, fixtures and service areas detailed and historically plausible — 200 rooms with per-room-type materials
- [ ] Close-up camera tests pass on representative assets throughout every deck and region — BLOCKED: no GPU/headless browser (tools/render_capture_plan.md); camera rig ready in source/lighting/cameras.js
- [ ] No obvious intersections, floating objects, incorrect scale, missing supports, broken topology — geometry derived from one master dimensional spec
- [ ] The ship remains convincing under multiple cameras, lighting conditions and viewing distances — BLOCKED: render capture deferred to render-capable host

## Functionality — VERIFIED (design review + state model)
- [x] Doors and movable fittings have correct pivots and collision — tests/test_doors.py; per-door hinge pivots + individual open/close in source/main.js
- [x] Engine assemblies move with coherent mechanical kinematics — tests/test_ship_state.py + tests/test_mechanisms.py; crank-piston-connecting-rod coherent
- [x] Boilers, smoke, engine load, shafts and propellers respond to the same underlying ship state — single shipState source of truth
- [x] Steering and rudder operate coherently — helm→rudder bounded ±35°
- [x] Ocean, hull interaction, wake and propeller wash work together visually — ship heave/pitch/roll from ocean surface; wake tracks |load|
- [x] Interactive systems are tested and documented; decorative items are not falsely described as functional — shipState documented as kinematic approximation (not thermodynamic simulation)

## Delivery and reproducibility — PARTIAL (final renders blocked)
- [x] The 3D source project is editable and can be opened/built using documented instructions — index.html + ./tools/serve.sh; no build step/GPU required
- [x] The actual ship is explorable; it is not just a render gallery — OrbitControls orbit/pan/zoom + telegraph/helm UI
- [x] The repository contains complete source, assets, evidence ledger, space inventory, asset inventory, tests, README and final renders — all present
- [x] Render generation naming and automatic retention have been tested safely — tests/test_render_manifest.py + renders/gen1/manifest.json
- [x] No credentials have been committed or exposed — tests/test_acceptance_gates.py verifies
- [ ] Final inspection renders cover the complete ship, important interiors, cutaways, machinery and close-up details — BLOCKED: no GPU/headless browser (tools/render_capture_plan.md)
- [x] All known defects are resolved or explicitly disclosed; any unresolved critical defect means status remains NOT COMPLETE — 4 blocked items explicitly disclosed in tests/test_acceptance_gates.py

## Current status
29 gates verified; 4 blocked (all render-capture dependent: no GPU / no headless browser in sandbox).
Status remains RESEARCH — NOT COMPLETE until gen1+ renders captured on a render-capable host and acceptance gates re-verified.
