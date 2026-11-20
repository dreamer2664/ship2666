"""Validate SHIP2666 space inventory coverage and connectivity.

Checks:
- every space has a valid Unique ID, deck, dimensions, type, access links,
  evidence reference, confidence, evidence type, refinement status
- no duplicate Unique IDs
- interiors.js creates one room per inventory space (geometry coverage via
  spaces.forEach over a 200-entry array)
- decks referenced by spaces are among the documented decks
Run: python3 tests/test_space_coverage.py
"""
import csv, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []

# ---- Load inventory ----
space_path = os.path.join(ROOT, 'docs', 'space_inventory.csv')
with open(space_path, newline='') as f:
    spaces = list(csv.DictReader(f))

valid_decks = {
    'Lower / tank top', 'Main deck', 'Upper deck', 'Boat deck',
    'Forecastle', 'Aft lower', 'Bridge deck', 'Poop', 'All decks',
    'Main deck forward', 'Lower hold forward', 'Lower hold aft',
    'Lower / orlop aft', 'Forecastle deck', 'Poop deck', 'Lower / tank top aft',
}
valid_conf = {'HIGH', 'MEDIUM', 'LOW'}
valid_status = {'BLOCKOUT', 'IN PRODUCTION', 'DETAILED', 'MATERIALS COMPLETE',
                'FUNCTION TESTED', 'VISUALLY APPROVED'}
valid_etype = {'TEUTONIC-SPECIFIC', 'SISTER-SHIP PROXY', 'PERIOD ANALOGUE', 'INFERRED'}
valid_types_prefix = ('Machinery -', 'Cargo -', 'Cargo/', 'Stores -', 'Public -', 'Cabin -',
                      'Circulation -', 'Service -', 'Sanitation -', 'Navigation -',
                      'Deck fixture -', 'Fixtures -', 'Structure -')

ids = []
for s in spaces:
    uid = s['Unique ID']
    ids.append(uid)
    for f in ('Unique ID', 'Deck', 'Approx dimensions (m LxWxH)', 'Type',
              'Access links', 'Evidence reference', 'Confidence',
              'Evidence type', 'Refinement status'):
        if not s.get(f, '').strip():
            errors.append(f'{uid}: missing {f}')
    if s['Confidence'] not in valid_conf:
        errors.append(f'{uid}: bad confidence {s["Confidence"]}')
    if s['Refinement status'] not in valid_status:
        errors.append(f'{uid}: bad status {s["Refinement status"]}')
    if s['Evidence type'] not in valid_etype:
        errors.append(f'{uid}: bad evidence type {s["Evidence type"]}')
    if not any(s['Type'].startswith(p) for p in valid_types_prefix):
        errors.append(f'{uid}: unclassified Type "{s["Type"]}"')
    dims = s['Approx dimensions (m LxWxH)']
    nums = re.findall(r'\d+(?:\.\d+)?', dims)
    if len(nums) < 2:
        errors.append(f'{uid}: bad dimensions "{dims}"')

if len(ids) != len(set(ids)):
    dups = [i for i in ids if ids.count(i) > 1]
    errors.append(f'duplicate Unique IDs: {sorted(set(dups))}')
if len(spaces) < 200:
    errors.append(f'only {len(spaces)} spaces; brief requires 200+ where evidence supports')

# ---- Geometry coverage: interiors.js creates one room per inventory space ----
interiors_path = os.path.join(ROOT, 'source', 'interiors', 'interiors.js')
if os.path.exists(interiors_path):
    src = open(interiors_path).read()
    # Count space-ID string literals in the spaces array (each becomes one room
    # at runtime via spaces.forEach). Match 'SNNN' string literals.
    space_ids_in_code = set(re.findall(r"'(S\d+)'", src))
    inventory_ids = set(ids)
    missing = inventory_ids - space_ids_in_code
    runtime_rooms = len(space_ids_in_code)
    print(f'Geometry rooms (runtime via spaces.forEach): {runtime_rooms} '
          f'of {len(inventory_ids)} inventory spaces')
    if missing:
        errors.append(f'interiors.js missing spaces: {sorted(missing)[:10]}')
    if runtime_rooms != len(inventory_ids):
        errors.append(f'interiors.js covers {runtime_rooms} spaces, inventory has {len(inventory_ids)}')
    if 'spaces.forEach' not in src:
        errors.append('interiors.js: no spaces.forEach iteration found')
else:
    errors.append('source/interiors/interiors.js missing')

# ---- Every deck in inventory is a known deck ----
for s in spaces:
    if s['Deck'] not in valid_decks:
        errors.append(f"{s['Unique ID']}: unknown deck '{s['Deck']}'")

if errors:
    print('SPACE COVERAGE CHECK FAILED:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print(f'OK: {len(spaces)} spaces, all unique, valid decks/confidence/status/evidence type.')
print(f'  inventory meets 200+ space target: {len(spaces) >= 200}')
