# Execution state

- Branch: `teutonic-0JYIGPYC` — resume this branch; do not allocate another. Recorded in `docs/agent_branch.txt`.
- Session: 2 (resumed 2026-11-20, local Europe/Rome) — continuous work, no stops.
- Status: **RESEARCH — NOT COMPLETE** (production modelling underway; blockout scaffold replaced).
- Active-work estimate: research + runtime build + 200-space inventory + production hull
  (strakes/frames/rivets/stern/stem/funnels/masts/deckhouses) + fittings + interiors +
  boilers + period lighting + materials set.
- Last verified local commit: `2e63ba6` (hull rivets + door mechanism test).
- Last verified remote commit: `2e63ba6` on `origin/teutonic-0JYIGPYC` (pushed, verified).

## Stack (session 2)
- Browser-explorable Three.js (no build step, no GPU), entry `index.html`, serve `./tools/serve.sh` (port 5173).
- Scene: hull (lofted shell + strakes + frames + rivets + stern + stem), fittings
  (railings, lifeboats+davits, anchors, windlass/capstan, bollards, companionways,
  cowl vents, portholes, funnels, masts), twin engines, propellers, rudder, spectral
  ocean, interiors (~100 rooms keyed to inventory), boiler rooms + stokeholds,
  period lighting (nav lights red/green/white, cabin practicals, engine glow).
- Ship state (telegraph→steam→load→RPM→propeller→rudder→smoke/wake) drives all motion.

## Hardware
- 2 CPU cores, ~3.8 GiB RAM, no GPU; Blender and PDF CLI tools not installed.

## Research (committed)
- Titanic Belfast fact file + RMG G2542/BHC3657 inspected; images in references/historical_photographs/.
- Company reference photograph NOT attached; no observations claimed.
- docs/evidence_ledger.csv (29 entries), docs/space_inventory.csv (200 spaces, all unique IDs), docs/source_manifest.csv (13 sources), docs/historical_configuration.md.

## Tests (all pass)
- tests/check_inventories.py — 200 spaces, 15 assets, 29 ledger entries.
- tests/test_render_manifest.py — manifest schema + retention rule.
- tests/test_space_coverage.py — inventory validity + 200+ target.
- tests/test_ship_state.py — kinematic consistency (bounds, 120-deg piston offsets).
- tests/test_doors.py — door pivot mechanism design review.

## Blockers / unfinished
- Production hull materials/rivet refinement, more interior rooms toward full 200-space
  geometry coverage, materials pass with textures/trim sheets.
- Gen1 inspection renders not yet captured (no GPU, no headless browser in sandbox;
  documented in tools/render_capture_plan.md).
- Functional tests for engine/steering/smoke coupling; acceptance-gate verification.

## Next exact actions
1. Commit/push execution state (this record).
2. Smoke-test full app server.
3. Continue hull plate/rivet refinement, more interior rooms, materials textures.
4. Functional system tests; gen1 renders on render host; acceptance-gate verification.
5. Commit/push checkpoint every 10-15 min or per milestone.

## Recovery
```sh
cd /home/user/ship2666_work/ship2666
git status --short --branch
git switch teutonic-0JYIGPYC
git log -5 --oneline
./tools/serve.sh   # then open http://localhost:5173
```
Read this file, docs/work_log.md, inventories and test output before modifying anything. Credential only via ephemeral env var; never in files/logs/commits.
