# Execution state

- Branch: `teutonic-0JYIGPYC` — resume this branch; do not allocate another. Recorded in `docs/agent_branch.txt`.
- Session: 2 (resumed 2026-11-20, local Europe/Rome) — work committed and pushed.
- Status: **RESEARCH — NOT COMPLETE**
- Active-work estimate: session 1 initialization + session 2 research/runtime build (~setup + research + runtime).
- Last verified local commit: `1c85cf0` (session 2 research + editable Three.js runtime).
- Last verified remote commit: `1c85cf0` on `origin/teutonic-0JYIGPYC` (pushed, verified via git ls-remote).

## Verified initialization (session 1, carried forward)
- Authenticated GitHub access without writing/printing the credential.
- `dreamer2664/ship2666` inspected: public, initially empty.
- Branch `teutonic-0JYIGPYC` allocated with Python `secrets`, verified nonexistent on origin, created as orphan branch.
- Workspace: `/home/user/ship2666_work/ship2666`. Two CPU cores, ~3.8 GiB RAM, ~19.5 GiB disk free. No GPU; Blender and PDF CLI tools not installed.

## Stack selected (session 2)
- Browser-explorable Three.js application (no build step, no GPU), procedurally generated geometry, PBR materials, state-driven systems, simplified two-layer ocean. Entry: `index.html`; serve with `./tools/serve.sh` (port 5173).

## Session 2 completed (committed as 1c85cf0)
- Research: Titanic Belfast fact file + RMG G2542/BHC3657 inspected; reference images downloaded to `references/historical_photographs/`.
- Company reference photograph NOT attached; no observations claimed.
- `docs/evidence_ledger.csv` (29 entries), `docs/space_inventory.csv` (20 spaces), `docs/source_manifest.csv` (13 sources), `docs/historical_configuration.md` (verified vs provisional).
- Editable Three.js runtime: hull/decks/funnels/masts, twin engines, propellers, rudder, ocean, ship state.
- `tests/check_inventories.py` passes; `renders/gen1/manifest.json` created.

## Blockers and unfinished work
- Every model, material, system, test and acceptance gate still unfinished beyond the blockout runtime.
- Space inventory must expand toward 200+ documented spaces.
- Production hull modelling, interiors, materials, close-up renders, acceptance-gate verification all remain.

## Next exact actions
1. Capture gen1 inspection renders (port/starboard bow, broadside, stern, deck-level).
2. Expand `docs/space_inventory.csv` toward 200+ spaces using deck-plan sources (USM Morse, Norway Heritage, etc.).
3. Begin production hull modelling (plate courses, rivets, frames) and exterior fittings.
4. Continue whole-ship blockout -> production modelling -> materials -> systems -> QC without sign-off pauses.

## Recovery
```sh
cd /home/user/ship2666_work/ship2666
git status --short --branch
git switch teutonic-0JYIGPYC
git log -5 --oneline
./tools/serve.sh   # then open http://localhost:5173
```
Read this file, `docs/work_log.md`, inventories and test output before modifying anything. Use the supplied credential only through an ephemeral environment variable; do not include it in commands, files, logs or commits.
