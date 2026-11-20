# Execution state

- Branch: `teutonic-0JYIGPYC` — resume this branch; do not allocate another. Recorded in `docs/agent_branch.txt`.
- Session: 2 (resumed 2026-11-20, local Europe/Rome) — continuous work, no stops.
- Status: **RESEARCH — NOT COMPLETE** (production modelling underway; blockout scaffold replaced).
- Active-work estimate: research + runtime build + 200-space inventory + production hull
  (strakes/frames/rivets/stern/stem/funnels/masts/deckhouses) + fittings (railings, lifeboats+davits,
  anchors, windlass/capstan, bollards, companionways, cowl vents, portholes, funnels, masts,
  deck planking/hatches/skylights/drains, mast rigging shrouds/stays/turnbuckles, plate courses with
  real plate boundaries between stations) + interiors (200/200 geometry coverage +
  per-room-type PBR materials) + boilers + period lighting + functional doors + 7 test suites.
- Last verified local commit: `8a21e0b` (hull plate-course refinement + materials test).
- Last verified remote commit: `8a21e0b` on `origin/teutonic-0JYIGPYC` (pushed, verified).

## Stack (session 2)
- Browser-explorable Three.js (no build step, no GPU), entry `index.html`, serve `./tools/serve.sh` (port 5173).
- Full scene verified serving: hull + fittings + twin engines + propellers + rudder + spectral ocean
  + interiors (200 rooms, per-room-type materials) + boiler rooms + period lighting
  + functional per-door open/close + deck detail + mast rigging + plate courses. All modules HTTP 200
  including Three.js CDN.
- Ship state (telegraph→steam→load→RPM→propeller→rudder→smoke/wake) drives all motion.

## Hardware
- 2 CPU cores, ~3.8 GiB RAM, no GPU; Blender and PDF CLI tools not installed.

## Research (committed)
- Titanic Belfast fact file + RMG G2542/BHC3657 inspected; images in references/historical_photographs/.
- Company reference photograph NOT attached; no observations claimed.
- docs/evidence_ledger.csv (29 entries), docs/space_inventory.csv (200 spaces, all unique IDs),
  docs/source_manifest.csv (13 sources), docs/historical_configuration.md.

## Tests — ALL PASS (7 suites)
- tests/check_inventories.py — 200 spaces, 15 assets, 29 ledger entries.
- tests/test_render_manifest.py — manifest schema + retention rule.
- tests/test_space_coverage.py — 200/200 geometry coverage + inventory validity.
- tests/test_ship_state.py — kinematic consistency (bounds, 120-deg piston offsets).
- tests/test_mechanisms.py — engine→shaft→propeller, helm→rudder ±35°, load→smoke→wake coupling.
- tests/test_doors.py — door pivot mechanism + 11 watertight sliding bulkhead doors.
- tests/test_materials.py — 37 PBR materials defined; metals differentiated; glass transparent.

## Blockers / unfinished (documented, not hidden)
- Gen1 inspection renders not captured (no GPU, no headless browser — documented in
  tools/render_capture_plan.md; not a reduced quality target). Camera rig ready in
  source/lighting/cameras.js.
- Texture maps/trim sheets; acceptance-gate verification against quality_checklist.md.

## Next exact actions
1. Commit/push execution state (this record).
2. Acceptance-gate verification: walk through docs/quality_checklist.md item by item.
3. Hull production detail refinement; quality checklist progress tracking.
4. Gen1 renders on render host.
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
