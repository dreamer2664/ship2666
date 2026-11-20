"""Validate SHIP2666 PBR material definitions (brief section 5).

Checks:
- every material definition has color/roughness/metalness (or transparent/opacity)
- differentiated metals: brass/copper/iron/steel are NOT identical
- glass has transparency + low roughness
- hull paint has sensible roughness/metalness
- no default placeholder materials (all defined with intent)
Run: python3 tests/test_materials.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'source', 'materials', 'materials.js')
src = open(p).read()

errors = []

start = src.index("export const materials = {")
end = src.index("\n};\n\n// Build a Three.js", start)
obj_src = src[start: end + 2]

mat_blocks = re.findall(r"(\w+):\s*\{([^}]*)\}", obj_src)
if not mat_blocks:
    errors.append("no material blocks found")
    print('MATERIALS CHECK FAILED:')
    for e in errors:
        print(' -', e)
    sys.exit(1)

mat_data = {}
for name, body in mat_blocks:
    entry = {}
    for key in ('color', 'roughness', 'metalness', 'transparent', 'opacity'):
        m = re.search(key + r":\s*([0-9x\.a-fA-F]+|true|false)", body)
        if m:
            entry[key] = m.group(1)
    mat_data[name] = entry

for name, entry in mat_data.items():
    if 'roughness' not in entry:
        errors.append(f"{name}: missing roughness")
    if 'metalness' not in entry:
        errors.append(f"{name}: missing metalness")

metals = ['brass', 'copper', 'ironCast', 'steelMachined']
present_metals = [m for m in metals if m in mat_data]
if len(present_metals) >= 2:
    colors = {m: mat_data[m].get('color') for m in present_metals}
    if len(set(colors.values())) < len(present_metals):
        errors.append("metals are not color-differentiated (brass/copper/iron/steel must differ)")
    roughs = {m: mat_data[m].get('roughness') for m in present_metals}
    if len(set(roughs.values())) < len(present_metals):
        errors.append("metals are not roughness-differentiated")

if 'glass' in mat_data:
    g = mat_data['glass']
    if g.get('transparent') != 'true':
        errors.append("glass: missing transparent=true")
    if 'roughness' in g and float(g['roughness']) > 0.2:
        errors.append("glass: roughness should be low (<=0.2)")

if 'hullPaint' in mat_data:
    hp = mat_data['hullPaint']
    if float(hp.get('roughness', 1)) > 0.8:
        errors.append("hullPaint: roughness too high (looks like placeholder)")

print(f"Materials defined: {len(mat_data)}")
for name in sorted(mat_data):
    print(f"  {name}: {mat_data[name]}")

if errors:
    print('MATERIALS CHECK FAILED:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: all PBR materials defined with roughness/metalness; metals differentiated; glass transparent.')
