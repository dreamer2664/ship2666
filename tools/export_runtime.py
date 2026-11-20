#!/usr/bin/env python3
"""Export lazy-load runtime regions, preserving the full native source untouched.

blender -b assets/models/teutonic_working.blend -t 2 --python tools/export_runtime.py
Then use tools/compress_runtime.py. Native source is never decimated.
"""
import json
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[1]
BASE_PARTS=['exterior','machinery','main','upper','lower','structure']
ROOMS={s['id']:s for s in json.loads((ROOT/'assets/data/ship.json').read_text())['spaces']}
EXTERIOR={'hull','hull_detail','weather','funnel','rigging','boat','boat_gear','deck_fittings','railings','superstructure','boat_deck','bridge','helm','helm_wheel','propeller','propeller_blades','rudder','rudder_blade'}
MACHINERY={'machinery','moving_machinery','crankshaft','crosshead','connecting_rod','boiler','pipework','steering_gear'}


def inherited(ob,key):
    while ob:
        if key in ob:return ob[key]
        ob=ob.parent
    return None


def vessel(ob):
    while ob:
        if ob.name=='TEUTONIC_1889':return True
        ob=ob.parent
    return False


def part_of(ob):
    category=inherited(ob,'category');deck=inherited(ob,'deck');sid=inherited(ob,'space_id')
    if category=='furniture' and sid in ROOMS:
        zone=max(0,min(8,int((ROOMS[sid]['center'][0]+90)//20)))
        return f'detail-{deck}-{zone}'
    if sid in {'U-SC-DINING','P-SC-LIBRARY','P-SC-SMOKE','U-STEERING','P-WHEELHOUSE'} and category in {'room','floor','ceiling'}:
        return 'exterior'
    if ob.name=='SALOON_COFFERED_DOME':return 'main'
    if category in EXTERIOR or 'TEUTONIC ' in ob.name or 'Liverpool stern' in ob.name or 'Telegraph STOP' in ob.name:return 'exterior'
    if category in MACHINERY or deck=='T':return 'machinery'
    if category in {'structure','bulkhead'}:return 'structure'
    if deck=='M':return 'main'
    if deck in ['U','P']:return 'upper'
    if deck in ['O','L']:return 'lower'
    return 'structure'


def main():
    output=ROOT/'build/runtime_uncompressed';output.mkdir(parents=True,exist_ok=True)
    bpy.context.scene.frame_set(0)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in list(bpy.data.objects):
        if ob.type=='FONT' and vessel(ob):
            ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob.select_set(False)
    meshes=[ob for ob in bpy.data.objects if ob.type=='MESH' and vessel(ob)]
    counts={}
    parts=BASE_PARTS+sorted({part_of(ob) for ob in meshes}-set(BASE_PARTS))
    room_regions={}
    for ob in meshes:
        part=part_of(ob);sid=inherited(ob,'space_id')
        if part.startswith('detail-') and sid:room_regions[sid]=part
    (ROOT/'assets/data/room_regions.json').write_text(json.dumps(room_regions,indent=2)+'\n')
    for part in parts:
        bpy.ops.object.select_all(action='DESELECT')
        chosen=[ob for ob in meshes if part_of(ob)==part]
        for ob in chosen:
            ob.select_set(True);parent=ob.parent
            while parent:
                parent.select_set(True);parent=parent.parent
        path=output/(part+'.glb')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_apply=False)
        counts[part]={'objects':len(chosen),'bytes':path.stat().st_size,'uncompressed_path':str(path.relative_to(ROOT))}
        print('REGION_EXPORTED',part,len(chosen),path.stat().st_size,flush=True)
    (ROOT/'assets/data/runtime_regions.json').write_text(json.dumps(counts,indent=2)+'\n')

main()
