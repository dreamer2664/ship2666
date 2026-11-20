# Execution state

- Branch: `teutonic-0JYIGPYC` — resume this branch; do not allocate another. Recorded in `docs/agent_branch.txt`.
- Session: 2 (resumed 2026-11-20, local Europe/Rome) — continuous work, no stops.
- Status: **RESEARCH — NOT COMPLETE** (production modelling underway; blockout scaffold replaced in hull/fittings/interiors).
- Active-work estimate: research + runtime build + 200-space inventory + production hull + fittings + interiors/boilers.
- Last verified local commit: `8ffe399` (exterior fittings + full scene wiring).
- Last verified remote commit: `8ffe399` on `origin/teutonic-0JYIGPYC` (pushed, verified via git ls-remote).

## Stack (session 2)
- Browser-explorable Three.js (no build step, no GPU), entry `index.html`, serve `./tools/serve.sh` (port 5173).
- Scene: hull (lofted shell + strakes + frames + stern + stem), fittings (railings, lifeboats+davits, anchors,
  windlass/capstan, bollards, companionways, cowl vents, portholes, funnels, masts), twin engines, propellers,
  rudder, spectral ocean, interiors (dining saloon, staterooms x grades, dormitories, engine room, boiler room,
  galley, bridge, corridor), boiler rooms + stokeholds. Ship state drives telegraph/helm/steam/shaft/smoke.

## Hardware
- 2 CPU cores, ~3.8 GiB RAM, no GPU; Blender and PDF CLI tools not installed.

## Research (committed)
- Titanic Belfast fact file + RMG G2542/BHC3657 inspected; images in references/historical_photographs/.
- Company reference photograph NOT attached; no observations claimed.
- docs/evidence_ledger.csv (29 entries), docs/space_inventory.csv (200 spaces, all unique IDs), docs/source_manifest.csv (13 sources), docs/historical_configuration.md.
- tests/check_inventories.py passes.

## Blockers / unfinished
- Production hull materials/rivets, full 4-deck room set toward 200+ (inventory done at 200; geometry rooms are representative samples).
- Gen1 inspection renders not yet captured.
- Close-up inspection renders, materials pass, functional tests, acceptance-gate verification all remain.

## Next exact actions
1. Smoke-test server with full scene.
2. Capture gen1 inspection renders (port/starboard bow, broadside, stern, deck-level, machinery).
3. Continue production hull modelling (rivets/plate detail), more interior rooms, materials pass.
4. Commit/push checkpoint every 10-15 min or per milestone.

## Recovery
```sh
cd /home/user/ship2666_work/ship2666
git status --short --branch
git switch teutonic-0JYIGPYC
git log -5 --oneline
./tools/serve.sh   # then open http://localhost:5173
```
Read this file, docs/work_log.md, inventories and test output before modifying anything. Credential only via ephemeral env var; never in files/logs/commits.
