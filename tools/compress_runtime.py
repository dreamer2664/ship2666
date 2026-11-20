#!/usr/bin/env python3
"""Compress region exports sequentially; do not flatten or simplify editable joints."""
import argparse
import json
import os
from pathlib import Path
import struct
import subprocess

ROOT=Path(__file__).resolve().parents[1]
PARTS=['exterior','machinery','main','upper','lower','structure']


def glb_json(path):
    with path.open('rb') as f:
        header=f.read(12)
        if header[:4]!=b'glTF':raise ValueError('Invalid GLB header')
        length,kind=struct.unpack('<II',f.read(8))
        if kind!=0x4E4F534A:raise ValueError('Missing GLB JSON chunk')
        return json.loads(f.read(length))


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--parts',nargs='+');args=parser.parse_args()
    out=ROOT/'assets/runtime';out.mkdir(parents=True,exist_ok=True)
    report_path=ROOT/'assets/data/runtime_regions.json';report=json.loads(report_path.read_text())
    env=os.environ.copy();env['NODE_OPTIONS']='--max-old-space-size=1536'
    for part in (args.parts or list(report)):
        if part not in report:raise ValueError('Unknown runtime region')
        src=ROOT/'build/runtime_uncompressed'/(part+'.glb');target=out/(part+'.glb')
        command=[str(ROOT/'node_modules/.bin/gltf-transform'),'optimize',str(src),str(target),'--compress','meshopt','--meshopt-level','medium','--simplify','false','--flatten','false','--join','false','--instance','false','--palette','false','--texture-compress','webp','--texture-size','768']
        result=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,timeout=240)
        log=ROOT/'logs'/('compress_'+part+'.log');log.parent.mkdir(exist_ok=True);log.write_text(result.stdout+'\n'+result.stderr)
        if result.returncode:raise RuntimeError(result.stdout+result.stderr)
        data=glb_json(target);categories={}
        for node in data.get('nodes',[]):
            category=node.get('extras',{}).get('category')
            if category:categories[category]=categories.get(category,0)+1
        if part=='machinery':
            for category,count in [('crankshaft',2),('crosshead',6),('connecting_rod',6)]:
                if categories.get(category)!=count:raise RuntimeError(f'Joint metadata lost: {category}')
        report[part].update(compressed_path=str(target.relative_to(ROOT)),compressed_bytes=target.stat().st_size,categories=categories,compression='Meshopt; no simplification or hierarchy flattening; 768 px WebP runtime maps')
        report_path.write_text(json.dumps(report,indent=2)+'\n')
        print('COMPRESSED',part,src.stat().st_size,'->',target.stat().st_size,categories,flush=True)

if __name__=='__main__':main()
