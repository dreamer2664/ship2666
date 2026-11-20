# Architecture

## Editable source and runtime

- **Blender 3.4.1**, CPU-only: native editable scene assembled by versioned Python modules from a shared metre-scale specification and spatial inventory. Native `.blend` checkpoints and glTF exports are reproducible outputs, not the sole source of truth.
- **Three.js / Vite**: an explorable inspection runtime using the same exported geometry and inventory, with exterior orbit, sections, room selection, first-person inspection and explicit system controls. This is not a substitute for the editable model.
- **Pure Python / JavaScript simulation and tests**: dimensional checks, layout/connectivity, slider-crank invariants, state coupling, manifest validation and safe retention.
- **Versioned evidence**: source manifest with checksums and archival locators, an evidence ledger, and per-space confidence. Original reference scans are retained locally in `references/downloads/`; a deterministic fetch script restores them. Third-party scans are not indiscriminately republished in this public repository.

## Resource limits

This machine has two CPU cores, roughly 3.8 GiB RAM and no GPU. Run one native build/render at a time with two threads. Save before rendering. Preview settings are explicitly separate from 3840×2160 review settings. A preview is not a final quality gate. Avoid unbounded loops, redundant generations and simultaneous heavy jobs.

## Honest simulation boundary

Rigid-body ship response, boiler pressure, load, wake and ocean interaction will be labelled approximations. An exact slider-crank geometric constraint is not a steam-cycle simulation. Decorative controls must not be described as functional. An unimplemented system is a failed gate, not an implied capability.

## Render lifecycle

Numbered generations require meaningful changes and validated manifests. Keep generations 1–9. Only after a validated gen10 remove gen1–gen5; then keep the newest five, retaining all manifests separately. Never remove `renders/final/`, source, references, tests or documents. Cleanup must reject symlinks, path traversal, non-generation directories and incomplete successor batches, and must pass dummy-directory tests before actual use.
