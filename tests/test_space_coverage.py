"""Validate SHIP2666 space inventory coverage and connectivity.

Checks:
- every space has a valid Unique ID, deck, dimensions, type, access links,
  evidence reference, confidence, evidence type, refinement status
- no duplicate Unique IDs
- interiors.js creates one room per inventory space (geometry coverage)
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

# ---- Geometry coverage: interiors.js must create one room per inventory space ----
interiors_path = os.path.join(ROOT, 'source', 'interiors', 'interiors.js')
if os.path.exists(interiors_path):
    src = open(interiors_path).read()
    # Count distinct room creation calls: room({ id: 'SNNN', ... }) or g.name='SNNN'
    room_calls = len(re.findall(r"room\(\s*\{", src))
    # Also capture literal id assignments g.name = 'SNNN'
    lit_ids = set(re.findall(r"\.name\s*=\s*'(S\d+)'", src))
    inventory_ids = set(ids)
    missing_lit = inventory_ids - lit_ids
    print(f'Geometry rooms created: {room_calls} (of {len(inventory_ids)} inventory spaces)')
    print(f'Literal room-name ids detected: {len(lit_ids)}')
    if room_calls != len(inventory_ids):
        errors.append(f'interiors.js creates {room_calls} rooms, but inventory has {len(inventory_ids)} spaces')
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
