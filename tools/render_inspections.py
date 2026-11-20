#!/usr/bin/env python3
"""Bounded, immutable-source inspection batches; preview is never final approval.

blender -b -t 2 --python tools/render_inspections.py -- --generation 1 --cameras port_bow port_profile
"""
from datetime import datetime,timezone
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
import bpy

ROOT=Path(__file__).resolve().parents[1]


def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while chunk:=f.read(1024*1024):h.update(chunk)
    return h.hexdigest()


def set_cutaway():
    cache={}
    for ob in bpy.data.objects:
        parent=ob
        while parent and parent.name!='TEUTONIC_1889':parent=parent.parent
        if parent is None or ob.type!='MESH':continue
        for slot in ob.material_slots:
            mat=slot.material
            if mat is None:continue
            if mat.name not in cache:
                new=mat.copy();new.name=mat.name+' · inspection section'
                nodes=new.node_tree.nodes;links=new.node_tree.links
                output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
                if not output.inputs['Surface'].links:continue
                original=output.inputs['Surface'].links[0].from_socket
                geometry=nodes.new('ShaderNodeNewGeometry');separate=nodes.new('ShaderNodeSeparateXYZ');test=nodes.new('ShaderNodeMath');test.operation='LESS_THAN';test.inputs[1].default_value=0
                transparent=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader')
                links.new(geometry.outputs['Position'],separate.inputs[0]);links.new(separate.outputs['Y'],test.inputs[0]);links.new(test.outputs[0],mix.inputs[0]);links.new(original,mix.inputs[1]);links.new(transparent.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
                cache[mat.name]=new
            slot.material=cache[mat.name]


def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    p=argparse.ArgumentParser();p.add_argument('--generation',type=int,required=True);p.add_argument('--cameras',nargs='+',required=True);p.add_argument('--width',type=int,default=1280);p.add_argument('--samples',type=int,default=12);p.add_argument('--changes',default='Initial whole-vessel construction and multi-area defect inspection.');a=p.parse_args(args)
    if not 1<=a.generation<=9999 or not 320<=a.width<=3840 or not 1<=a.samples<=256:raise ValueError('Invalid bounded render settings')
    configs={c['id']:c for c in json.loads((ROOT/'source/lighting/cameras.json').read_text())}
    if not set(a.cameras)<=configs.keys():raise ValueError('Unknown camera')
    out=ROOT/'renders'/f'gen{a.generation}';out.mkdir(parents=True,exist_ok=True)
    archives=ROOT/'renders/manifests';archives.mkdir(parents=True,exist_ok=True)
    source_dir=ROOT/'build/review_sources';source_dir.mkdir(parents=True,exist_ok=True)
    snapshot=source_dir/f'gen{a.generation}.blend'
    manifest_path=out/'manifest.json'
    if manifest_path.exists():
        manifest=json.loads(manifest_path.read_text())
        if not snapshot.exists() or sha(snapshot)!=manifest['native_sha256']:raise RuntimeError('Immutable source snapshot is missing or changed')
    else:
        native=ROOT/'assets/models/teutonic_working.blend'
        if snapshot.exists():raise RuntimeError('Unowned generation snapshot exists; inspect before replacing')
        shutil.copy2(native,snapshot)
        commit=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip()
        manifest={'generation':a.generation,'created_utc':datetime.now(timezone.utc).isoformat(),'status':'IN_PROGRESS','kind':'INSPECTION_PREVIEW_NOT_FINAL','build_commit':commit,'native_sha256':sha(snapshot),'native_snapshot':str(snapshot.relative_to(ROOT)),
                  'expected_cameras':list(configs),'images':[],'changes_since_previous':a.changes,'known_defects':['Historic lines, exact room dimensions and company-photo match are unresolved.','Inventory has no visually approved spaces.','Some cabin berths did not fit the first-pass door clearances.','Full auxiliary systems, continuous collision and close-up final materials remain unfinished.'],'next_corrections':[]}
    def persist():
        text=json.dumps(manifest,indent=2)+'\n';manifest_path.write_text(text);(archives/f'gen{a.generation}.json').write_text(text)
    persist()
    for camid in a.cameras:
        image=out/(camid+'.png')
        if image.exists():
            print('SKIP existing immutable generation image',camid,flush=True);continue
        bpy.ops.wm.open_mainfile(filepath=str(snapshot))
        scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=a.samples;scene.cycles.use_denoising=True;scene.cycles.max_bounces=5;scene.cycles.transparent_max_bounces=16;scene.cycles.volume_bounces=1
        scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=a.width;scene.render.resolution_y=round(a.width*9/16);scene.render.resolution_percentage=100
        scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
        scene.camera=bpy.data.objects['CAM_'+camid];scene.frame_set(0);config=configs[camid]
        if config['mode'] in ['cutaway','drydock','interior','machinery']:
            for ob in bpy.data.collections['90 · Environment — excluded from runtime export'].objects:
                if ob.type=='MESH':ob.hide_render=True
        if config['mode']=='cutaway':set_cutaway()
        if config['mode']=='profile':
            for ob in bpy.data.objects:
                if ob.name.startswith('SMOKE_VOLUME'):ob.hide_render=True
        scene.render.filepath=str(image);started=time.monotonic()
        print('RENDER_START',camid,a.width,a.samples,flush=True)
        bpy.ops.render.render(write_still=True)
        record={'camera_id':camid,'areas':config['areas'],'image_path':str(image.relative_to(ROOT)),'width':a.width,'height':scene.render.resolution_y,'samples':a.samples,'engine':'Blender Cycles CPU','denoised':True,'quality':'PREVIEW — NOT FINAL','seconds':round(time.monotonic()-started,2),'sha256':sha(image),'reviewed':False,'review_notes':[]}
        manifest['images'].append(record);persist();print('RENDER_SAVED',camid,record['seconds'],flush=True)
    if set(r['camera_id'] for r in manifest['images'])==set(manifest['expected_cameras']):manifest['status']='RENDERED_AWAITING_REVIEW'
    persist()

if __name__=='__main__':main()
