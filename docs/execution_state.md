# Execution state

- Branch: `teutonic-0JYIGPYC` — resume this branch; do not allocate another. Recorded in `docs/agent_branch.txt`.
- Session: 2 (resumed 2026-11-20, local Europe/Rome) — continuous work, no stops.
- Status: **RESEARCH — NOT COMPLETE** (production modelling underway; blockout scaffold replaced).
- Active-work estimate: research + runtime build + 200-space inventory + production hull
  (strakes/frames/rivets/stern/stem/funnels/masts/deckhouses) + fittings + interiors (200/200
  geometry coverage + per-room-type PBR materials) + boilers + period lighting + materials set +
  6 test suites.
- Last verified local commit: `cc6cd17` (materials differentiation for all 200 interiors).
- Last verified remote commit: `cc6cd17` on `origin/teutonic-0JYIGPYC` (pushed, verified).

## Stack (session 2)
- Browser-explorable Three.js (no build step, no GPU), entry `index.html`, serve `./tools/serve.sh` (port 5173).
- Full scene verified serving: hull + fittings + twin engines + propellers + rudder + spectral ocean
  + interiors (200 rooms, per-room-type materials: machinery=iron/coal, sanitation=glazed tile,
  cabins/saloons=wood/carpet, galley=iron/glazed tile) + boiler rooms + period lighting (nav lights
  red/green/white, cabin practicals, engine glow). All modules HTTP 200 including Three.js CDN.
- Ship state (telegraph→steam→load→RPM→propeller→rudder→smoke/wake) drives all motion.

## Hardware
- 2 CPU cores, ~3.8 GiB RAM, no GPU; Blender and PDF CLI tools not installed.

## Research (committed)
- Titanic Belfast fact file + RMG G2542/BHC3657 inspected; images in references/historical_photographs/.
- Company reference photograph NOT attached; no observations claimed.
- docs/evidence_ledger.csv (29 entries), docs/space_inventory.csv (200 spaces, all unique IDs),
  docs/source_manifest.csv (13 sources), docs/historical_configuration.md.

## Tests — ALL PASS (6 suites)
- tests/check_inventories.py — 200 spaces, 15 assets, 29 ledger entries.
- tests/test_render_manifest.py — manifest schema + retention rule.
- tests/test_space_coverage.py — 200/200 geometry coverage + inventory validity.
- tests/test_ship_state.py — kinematic consistency (bounds, 120-deg piston offsets).
- tests/test_mechanisms.py — engine→shaft→propeller, helm→rudder ±35°, load→smoke→wake coupling.
- tests/test_doors.py — door pivot mechanism + 11 watertight sliding bulkhead doors.

## Blockers / unfinished
- Gen1 inspection renders not captured (no GPU, no headless browser — documented in
  tools/render_capture_plan.md; not a reduced quality target).
- Per-room functional door animation in main.js (per-door open/close, not texture swap).
- Acceptance-gate verification.

## Next exact actions
1. Commit/push execution state (this record).
2. Add per-door open/close animation to main.js (door objects with hinge pivot + individual control).
3. Smoke-test full app server.
4. Gen1 renders on render host; acceptance-gate verification.
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
