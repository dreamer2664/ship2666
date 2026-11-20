# Execution state

- Branch: `teutonic-0JYIGPYC` — resume this branch; do not allocate another. Recorded in `docs/agent_branch.txt`.
- Session: 2 (resumed 2026-11-20, local Europe/Rome)
- Status: **RESEARCH — NOT COMPLETE**
- Active-work estimate: session 1 initialization only (~setup). Session 2 in progress.
- Last verified local commit: none yet (session 2 changes uncommitted)
- Last verified remote commit: f5664cf (session 1 initialization, on origin/teutonic-0JYIGPYC)

## Verified initialization (session 1, carried forward)
- Authenticated GitHub access without writing/printing the credential.
- `dreamer2664/ship2666` inspected: public, initially empty.
- Branch `teutonic-0JYIGPYC` allocated with Python `secrets`, verified nonexistent on origin, created as orphan branch.
- Workspace: `/home/user/ship2666_work/ship2666`. Two CPU cores, ~3.8 GiB RAM, ~19.5 GiB disk free. No GPU; Blender and PDF CLI tools not installed.

## Stack selected (session 2)
- Browser-explorable Three.js application, procedurally generated geometry, PBR materials, state-driven systems, Tessendorf-style ocean shader. All source editable (JS/JSON).

## Blockers and unfinished work
- Company reference photograph NOT attached (only instruction Markdown). No observations from it claimed; configuration provisional from archival sources.
- Every model, material, system, test and acceptance gate unfinished.
- No geometry, validated historical layout, finished assets or final renders.

## Next exact actions
1. Commit session 2 documentation/inventory files to `teutonic-0JYIGPYC`; push to origin; verify remote SHA.
2. Inspect high-value primary/archival references (fetch pages); preserve downloads and provenance.
3. Build the Three.js explorable runtime: coordinate system, hull procedural geometry, deck levels, first-person explorer.
4. Expand evidence ledger and space inventory toward 200+ spaces.
5. Continue whole-ship blockout -> production modelling -> materials -> systems -> QC without sign-off pauses.

## Recovery
```sh
cd /home/user/ship2666_work/ship2666
git status --short --branch
git switch teutonic-0JYIGPYC
git log -5 --oneline
```
Read this file, `docs/work_log.md`, inventories and test output before modifying anything. Use the supplied credential only through an ephemeral environment variable; do not include it in commands, files, logs or commits.
