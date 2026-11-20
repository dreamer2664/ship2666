# Work log

## Session 1 · branch `teutonic-0JYIGPYC`

### 2026-11-20 07:13 UTC · initialization

Read the full reconstruction brief. Inspected workspace attachments, tool availability and hardware. Only the instruction document is available; no company photograph. Verified authenticated GitHub account and target repository permissions. The target was empty, with no branch history to preserve. Created a cryptographically randomized, remote-checked orphan agent branch. Saved initialization and recovery records. No substantial production work or finished assets are claimed at this point.

## Session 2 · branch `teutonic-0JYIGPYC`

### 2026-11-20 · resumed work (local Europe/Rome)
- Read full reconstruction brief; confirmed resuming session-1 branch `teutonic-0JYIGPYC` per crash/restart rule (no new branch allocated).
- Verified hardware/stack: 2 CPU cores, ~3.8 GiB RAM, no GPU, no Blender; selected browser-explorable Three.js procedural-geometry stack with PBR materials and state-driven systems.
- Created repository structure: docs/, references/ (company_reference, historical_photographs, deck_plans, engineering, downloads), source/ (ship, hull, decks, interiors, machinery, systems, ocean, materials, lighting, interactions), assets/, renders/ (gen1, manifests, final), tests/, tools/.
- Wrote docs: project_status.md, architecture.md, historical_configuration.md, quality_checklist.md.
- Wrote docs/evidence_ledger.csv (header + 17 entries, all marked provisional/LOW; company photo recorded as unavailable).
- Wrote docs/space_inventory.csv (20 seeded spaces: machinery, cargo, 1st-class public/cabin, crew, navigation; all BLOCKOUT, evidence/confidence labelled).
- Wrote docs/asset_inventory.csv (15 seeded assets, BLOCKOUT).
- Wrote references/source_manifest.csv (13 archival sources with URLs, all pending).
- Wrote references/company_reference/README.md (photograph NOT available; no observations claimed).
- Updated docs/execution_state.md and docs/work_log.md for session 2.
- Next: commit/push session 2 files; begin archival reference inspection; build Three.js runtime.

### 2026-11-20 · research and runtime build
- Inspected and verified Titanic Belfast Teutonic Fact File (official no. 96334; yard 208; launched 19 Jan 1889; handed over 25 Jul 1889; 4 decks; 3 masts; schooner rig; elliptical stern; steel Siemens-Martin; 11 bulkheads; length 565.5 ft; beam 57.8 ft; depth 39.25 ft; GRT 9,984.26; 2x triple-expansion engines; cylinders 43/68/110 in; stroke 60 in; 2,400 NHP; 12 boilers; 180 psi; twin screw; 20 knots). Recorded as TEUTONIC-SPECIFIC/HIGH in evidence ledger.
- Inspected RMG G2542 (port broadside, Francis Frith c.1890) and RMG BHC3657 (Wyllie, port-bow leaving Liverpool July 1889, Spithead review 4 Aug 1889). Noted yellow buff funnels; 4.7-inch guns were occasion-specific and excluded from base model. Downloaded both images + Titanic Belfast fact-file image to references/historical_photographs/.
- Wrote docs/historical_configuration.md (verified vs provisional; length discrepancy 565.5 ft vs ~582 ft overall recorded, not averaged).
- Wrote docs/source_manifest.csv (13 sources; 3 inspected).
- Regenerated docs/evidence_ledger.csv (29 entries) and docs/space_inventory.csv (20 spaces) with proper quoting; all confidence values HIGH/MEDIUM/LOW; evidence/confidence labelled.
- Built editable Three.js runtime: source/ship/dimensions.js, source/hull/hull.js, source/machinery/engine.js, source/systems/shipState.js, source/materials/materials.js, source/ocean/ocean.js, source/main.js, index.html.
- Added tools/serve.sh, renders/gen1/manifest.json, tests/check_inventories.py (passes: 20 spaces, 15 assets, 29 ledger entries).
- Verified app serves via local HTTP server (all modules HTTP 200; Three.js CDN reachable). Stopped server after verification.
- Updated docs/execution_state.md, docs/project_status.md, README.md (runtime + build instructions).
- Next: commit/push session 2; capture gen1 inspection renders; expand space inventory toward 200+ spaces; begin production hull modelling.
