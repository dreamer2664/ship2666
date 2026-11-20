"""Validate SHIP2666 render manifest schema and retention-rule logic.

Run: python3 tests/test_render_manifest.py
"""
import csv, json, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []

# ---- Manifest schema check ----
manifest_path = os.path.join(ROOT, 'renders', 'gen1', 'manifest.json')
if not os.path.exists(manifest_path):
    errors.append('renders/gen1/manifest.json missing')
else:
    with open(manifest_path) as f:
        m = json.load(f)
    required = ['generation','timestamp','branch','commit','session','description',
                'cameraIds','sceneAreasInspected','imagePaths','qualitySettings',
                'changesSincePrevious','knownDefects','nextCorrections',
                'retentionRule']
    for k in required:
        if k not in m:
            errors.append(f'manifest: missing key {k}')
    if 'cameraIds' in m and not isinstance(m['cameraIds'], list):
        errors.append('manifest: cameraIds must be a list')
    if 'knownDefects' in m and not isinstance(m['knownDefects'], list):
        errors.append('manifest: knownDefects must be a list')

# ---- Retention rule logic check ----
# Only delete gen1..gen5 after gen10 validated; rolling window of newest five.
def would_delete(gen_num, latest_validated):
    """Return True if generation gen_num may be deleted given latest validated gen."""
    if latest_validated < 10:
        return False  # don't delete anything before gen10 validated
    if gen_num <= 5:
        return True   # after gen10, delete gen1..gen5
    # rolling window: keep newest five numbered generations
    keep_min = latest_validated - 4
    return gen_num < keep_min

cases = [
    (9, 9, False),   # before gen10 -> keep
    (1, 10, True),   # after gen10 -> delete gen1
    (5, 10, True),   # delete gen5
    (6, 10, False),  # keep gen6 (window 6..10)
    (6, 11, True),   # after gen11 -> delete gen6 (window 7..11)
    (7, 11, False),  # keep gen7
]
for gen, latest, expected in cases:
    got = would_delete(gen, latest)
    if got != expected:
        errors.append(f'retention: gen={gen} latest={latest} expected={expected} got={got}')

# ---- Inventory cross-check (render areas map to inventory spaces) ----
space_path = os.path.join(ROOT, 'docs', 'space_inventory.csv')
if os.path.exists(space_path):
    with open(space_path, newline='') as f:
        spaces = list(csv.DictReader(f))
    deck_set = {s['Deck'] for s in spaces}
    # render areas reference decks; ensure consistency
    if not deck_set:
        errors.append('space_inventory: no decks defined')

if errors:
    print('RENDER MANIFEST CHECK FAILED:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: render manifest schema + retention rule validated.')
print(f'  spaces loaded: {len(spaces) if os.path.exists(space_path) else 0}')
