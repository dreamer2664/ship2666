"""Sanity checks for SHIP2666 inventories (run with python3)."""
import csv, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_csv(name):
    with open(os.path.join(ROOT, 'docs', name), newline='') as f:
        return list(csv.DictReader(f))

errors = []
spaces = read_csv('space_inventory.csv')
ids = [s['Unique ID'] for s in spaces]
if len(ids) != len(set(ids)):
    errors.append('space_inventory: duplicate Unique IDs')
for s in spaces:
    for f in ('Unique ID','Deck','Type','Evidence reference','Confidence','Refinement status'):
        if not s.get(f):
            errors.append(f"space {s.get('Unique ID')}: missing {f}")
    if s['Confidence'] not in ('HIGH','MEDIUM','LOW'):
        errors.append(f"space {s['Unique ID']}: bad confidence {s['Confidence']}")
    if s['Refinement status'] not in ('BLOCKOUT','IN PRODUCTION','DETAILED','MATERIALS COMPLETE','FUNCTION TESTED','VISUALLY APPROVED'):
        errors.append(f"space {s['Unique ID']}: bad status {s['Refinement status']}")

assets = read_csv('asset_inventory.csv')
aid = [a['Asset ID'] for a in assets]
if len(aid) != len(set(aid)):
    errors.append('asset_inventory: duplicate Asset IDs')

ledger = read_csv('evidence_ledger.csv')
for l in ledger:
    if l['Confidence'] not in ('HIGH','MEDIUM','LOW',''):
        errors.append(f"ledger: bad confidence {l['Confidence']}")

if errors:
    print('CHECK FAILED:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print(f'OK: {len(spaces)} spaces, {len(assets)} assets, {len(ledger)} ledger entries; all checks passed.')
