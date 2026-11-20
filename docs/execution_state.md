# Execution state

- Session: 1, continuous work since 2026-11-20T07:13:05Z.
- Branch: **`teutonic-9NXT5G1C`**. Resume this exact branch.
- Status: **BLOCKOUT — NOT COMPLETE**, with initial production replacements underway.
- Last verified remote checkpoint before this save: `44b3af2b08c56bdc9997aa563ba1dc8f50d1c3e0`; later checkpoint SHAs are in Git history.
- Cumulative work: use UTC log/commit times; no claim that the requested 3–4 hours has already been met.

## Saved and verified

- Full source/evidence system; 299 spatial records, 317 access links. All metric boundaries remain inferred.
- Native editable project: `assets/models/teutonic_working.blend` (about 64.5 MB), built with Blender 3.4.1; 2,292 objects / about 2.37 million source vertices. This is an unfinished production scene, not an approved final asset.
- Full uncompressed glTF retained locally in `assets/models/teutonic.glb`, excluded from Git because the native source plus compressed regions are versioned.
- Six compressed runtime regions total about 63 MB; exterior alone about 5.1 MB. No geometry simplification was used. Editable source is not quantized.
- `npm run build` passes. Nine layout tests plus five initial retention tests passed; eight mechanical/state tests passed. A sixth retention safety test was subsequently added and needs the next test run.
- Browser verified exterior loading, actual rendered frames, 2 crankshafts / 6 crossheads / 6 rods, telegraph acceleration and inertial stop. **Deck-loading/search test timed out**; remaining browser checks did not run. No JavaScript exception was reported. Do not claim all browser tests pass.
- Native gen1 port bow, port profile, saloon, smoking room, stateroom G, crew cabin, engine and stokehold renders saved. These are explicitly low-sample inspection previews, not final images. Several visible defects are logged in `docs/defects.csv`.
- Persistent preview server: process `rms-teutonic-working-reconstruct-2d7baace`, Vite on `0.0.0.0:5173`. Do not restart if it is still running.

## Rendering environment

Debian Blender 3.4.1 can build/export, but its Cycles package was compiled **without OpenImageDenoiser**. The first render failed for that reason. Installed official Blender **3.6.23** at `/home/user/workspace/.tools/blender-3.6.23-linux-x64/blender`, verified against the official SHA256 `0e9a18af4d0060b825e9617e24a775f759e0f9f67271c062f3d53a539030af00`. Installed missing libSM/libICE dependencies. Official renderer successfully produced the native previews with denoising. Peak native render memory observed about 2.66 GiB; runtime export peaked about 1.50 GiB. Run one heavy job at a time.

## Next exact tasks

1. Finish the current correction pass: actual interior window apertures; replace striped grain orientation; clear the 16 unfitted berth placements; correct three-point engine supports and platform supports; move stokehold lamps out of the solid uptake; repair smoke end caps and density fade; add physically meaningful water volume.
2. `tools/export_runtime.py` has been changed to split furniture into longitudinal detail regions and retain missing after-deckhouse exterior architecture. **These new export rules have not yet been executed.** Adapt the viewer to `room_regions.json`, lazy-load selected-space detail and reduce merge/instancing overhead. Fix the browser test timeout argument, not just the timeout symptom.
3. Rebuild a new native checkpoint; preserve the existing immutable gen1 snapshot at `build/review_sources/gen1.blend`. Re-export/compress the new regional assets with 16-bit position precision.
4. Complete unrendered gen1 cameras against its immutable old snapshot, record reviews, and run gen2 with the actual corrections. Keep manifests truthful about changed cameras, lighting and defects.
5. Re-run all tests and browser interaction checks including main-deck search, door movement, first-person entry/exit, source dialog and mobile layout. Update defects and inventories; push coherent checkpoint.

## Resume commands

```sh
cd /home/user/workspace/ship2666
git switch teutonic-9NXT5G1C
git status --short --branch
git log -5 --oneline
python3 tools/make_layout.py
python3 -m pytest tests -q
npm test
blender -b -t 2 --python-exit-code 1 --python tools/build_ship.py -- --no-export
blender -b assets/models/teutonic_working.blend -t 2 --python-exit-code 1 --python tools/export_runtime.py
python3 tools/compress_runtime.py
npm run build
node tools/test_browser.mjs
```

Native rendering example (bounded batches):

```sh
/home/user/workspace/.tools/blender-3.6.23-linux-x64/blender -b -t 2 --python-exit-code 1 --python tools/render_inspections.py -- --generation 1 --cameras stern elevated --width 1280 --samples 16
```

## Historical and quality blockers

Company photograph absent; USM records expose no original plan images; actual builder's lines and exact compartment dimensions are unavailable. Some configurations/dimensions conflict and are preserved in the ledger. Full continuous character collision, every auxiliary service, complete valve kinematics, true hydrostatics/CFD and close-up final material fidelity are not implemented/approved. No spaces are `VISUALLY APPROVED`.

## Branch-isolation incident

The original `teutonic-0JYIGPYC` was initially empty and uniquely allocated, but a concurrent writer pushed their own commits to it. This agent's research commit could not fast-forward. Both histories were preserved, without force push, rebase, overwrite or merge. This agent's own history was moved intact to the remote-checked random branch **`teutonic-9NXT5G1C`**, successfully pushed and verified. Do not resume the other writer's default-branch execution record.

## Credential handling

The original instruction attachment contains authentication material and is not copied into the public repository. Use only an ephemeral environment or secure credential helper. Never print, commit or paste the credential into scripts, command arguments, manifests, screenshots or documentation.
