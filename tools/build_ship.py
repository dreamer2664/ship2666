#!/usr/bin/env python3
"""Run with: blender -b -t 2 --python tools/build_ship.py -- [--no-export]."""
from __future__ import annotations
import argparse
from datetime import datetime,timezone
import json
import os
from pathlib import Path
import sys
import time
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from source.model.mesh import collection,empty
from source.model.materials import make_materials
from source.model.hull import build_hull
from source.model.interiors import build_interiors
from source.model.machinery import build_machinery
from source.model.exterior import build_exterior
from source.model.environment import build_environment


def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser();parser.add_argument('--no-export',action='store_true');parser.add_argument('--no-environment',action='store_true');opts=parser.parse_args(args)
    started=time.monotonic();stamp=datetime.now(timezone.utc).isoformat()
    layout=json.loads((ROOT/'assets/data/ship.json').read_text())
    cameras=json.loads((ROOT/'source/lighting/cameras.json').read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1;scene.unit_settings.length_unit='METERS'
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.cycles.max_bounces=6;scene.cycles.transmission_bounces=4;scene.cycles.volume_bounces=1
    scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=.35
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
    scene.render.fps=24;scene.frame_end=240
    scene['project_status']='BLOCKOUT / PRODUCTION MODELLING — NOT COMPLETE'
    scene['evidence_note']='See evidence ledger. Metric room boundaries, lines and most small fittings are inferred.'
    scene['branch']='teutonic-9NXT5G1C';scene['built_utc']=stamp
    root=empty('TEUTONIC_1889',collection('00 · Vessel master'),category='ship',metres=True,status='NOT COMPLETE')
    materials=make_materials()
    print('BUILD hull',flush=True);build_hull(materials,root,layout)
    print('BUILD spaces',flush=True);placements=build_interiors(layout,materials,root)
    recovery=ROOT/'build/native_recovery'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S');recovery.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(recovery/'geometry_before_machinery.blend'),compress=True)
    print('BUILD machinery',flush=True);build_machinery(materials,root)
    print('BUILD exterior',flush=True);build_exterior(materials,root,layout)
    if not opts.no_environment:build_environment(materials)
    # Named reproducible inspection cameras, not an attractive-angle-only gallery.
    col=collection('99 · Inspection cameras')
    for c in cameras:
        data=bpy.data.cameras.new(c['id']);ob=bpy.data.objects.new('CAM_'+c['id'],data);col.objects.link(ob);ob.location=c['position'];ob.rotation_euler=(Vector(c['target'])-ob.location).to_track_quat('-Z','Y').to_euler();data.lens=c.get('lens',50);data.clip_start=.03;data.clip_end=6000
        if 'ortho' in c:data.type='ORTHO';data.ortho_scale=c['ortho']
        for k,v in c.items():
            if isinstance(v,(str,int,float)):ob[k]=v
    scene.camera=bpy.data.objects['CAM_port_bow'];scene.frame_set(0)
    # Pack original maps so the editable native checkpoint is portable.
    for image in bpy.data.images:
        if image.source=='FILE':image.pack()
    output=ROOT/'assets/models';output.mkdir(parents=True,exist_ok=True)
    native=output/'teutonic_working.blend'
    if native.exists():
        import shutil
        recovery=ROOT/'build/native_recovery';recovery.mkdir(parents=True,exist_ok=True)
        backup=recovery/('teutonic_'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')+'.blend')
        if backup.exists():raise RuntimeError('Refusing to overwrite a recovery source')
        print('PRESERVE existing native source',native.stat().st_size,'bytes at',backup,flush=True)
        shutil.copy2(native,backup)
    bpy.ops.wm.save_as_mainfile(filepath=str(native),compress=True)
    stats={'built_utc':stamp,'branch':'teutonic-9NXT5G1C','status':'NOT COMPLETE','spaces':len(layout['spaces']),'connections':len(layout['connections']),
           'objects':len(bpy.data.objects),'meshes':len(bpy.data.meshes),'vertices':sum(len(m.vertices) for m in bpy.data.meshes),'polygons':sum(len(m.polygons) for m in bpy.data.meshes),
           'native_file':str(native.relative_to(ROOT)),'native_bytes':native.stat().st_size,'unfitted_furniture':placements['unfitted'],'elapsed_seconds':round(time.monotonic()-started,2)}
    (ROOT/'assets/data/furniture_placements.json').write_text(json.dumps(placements,indent=2)+'\n')
    (ROOT/'assets/data/build_report.json').write_text(json.dumps(stats,indent=2)+'\n')
    if not opts.no_export:
        print('EXPORT glTF (native source already saved)',flush=True)
        bpy.ops.object.select_all(action='DESELECT')
        for ob in list(bpy.data.objects):
            if ob.type=='FONT':
                ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob.select_set(False)
        def descends(ob):
            while ob is not None:
                if ob==root:return True
                ob=ob.parent
            return False
        for ob in bpy.data.objects:ob.select_set(descends(ob))
        path=output/'teutonic.glb'
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_apply=False,export_texcoords=True,export_normals=True,export_materials='EXPORT')
        stats['glb_file']=str(path.relative_to(ROOT));stats['glb_bytes']=path.stat().st_size
    stats['elapsed_seconds']=round(time.monotonic()-started,2)
    (ROOT/'assets/data/build_report.json').write_text(json.dumps(stats,indent=2)+'\n')
    print('BUILD_SAVED',json.dumps(stats),flush=True)

if __name__=='__main__':main()
