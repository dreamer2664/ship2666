#!/usr/bin/env python3
"""Strict, opt-in generation cleanup. Manifests and final/source assets are protected."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
from PIL import Image

PATTERN=re.compile(r'gen([1-9][0-9]*)\Z')


def validate_generation(renders:Path,number:int,require_review=True):
    renders=Path(renders)
    if renders.is_symlink():raise ValueError('Symlink render root refused')
    root=renders.resolve();folder=root/f'gen{number}'
    if folder.is_symlink() or not folder.is_dir():raise ValueError('Missing generation or symlink')
    manifest_path=folder/'manifest.json'
    if manifest_path.is_symlink():raise ValueError('Symlink manifest refused')
    data=json.loads(manifest_path.read_text())
    if data.get('generation')!=number:raise ValueError('Generation number mismatch')
    if data.get('status')!='VALIDATED':raise ValueError('Successor generation is not validated')
    expected=data.get('expected_cameras',[]);images=data.get('images',[])
    ids=[r.get('camera_id') for r in images]
    if not expected or len(set(ids))!=len(ids) or set(ids)!=set(expected):raise ValueError('Incomplete or duplicate camera coverage')
    project=root.parent
    for image in images:
        raw=Path(image['image_path'])
        if raw.is_absolute() or '..' in raw.parts:raise ValueError('Unsafe image path')
        path=project/raw
        if path.is_symlink() or path.resolve().parent!=folder:raise ValueError('Image outside generation')
        with Image.open(path) as im:
            if im.size!=(image['width'],image['height']):raise ValueError('Image dimensions mismatch')
            im.verify()
        if hashlib.sha256(path.read_bytes()).hexdigest()!=image['sha256']:raise ValueError('Image checksum mismatch')
        if require_review and not image.get('reviewed'):raise ValueError('Image has not been reviewed')
    return data


def cleanup(renders:Path,latest:int,apply=False):
    renders=Path(renders)
    if latest<10:return []
    validate_generation(renders,latest)
    root=renders.resolve()
    cutoff=latest-5
    selected=[]
    for child in sorted(root.iterdir()):
        match=PATTERN.fullmatch(child.name)
        if not match or int(match.group(1))>cutoff:continue
        if child.is_symlink() or not child.is_dir() or child.resolve().parent!=root:raise ValueError('Unsafe cleanup target')
        if any(p.is_symlink() for p in child.rglob('*')):raise ValueError('Symlink inside cleanup target')
        # Every manifest survives in a separate protected archive.
        source=child/'manifest.json';archive=root/'manifests'/(child.name+'.json')
        if not source.is_file():raise ValueError('Generation without a manifest refused')
        old=json.loads(source.read_text())
        allowed={'manifest.json'}|{Path(image['image_path']).name for image in old.get('images',[])}
        for item in child.iterdir():
            if not item.is_file() or item.name not in allowed or (item.name!='manifest.json' and item.suffix.lower() not in {'.png','.jpg','.jpeg'}):
                raise ValueError('Unexpected or source file in generation; cleanup refused')
        if not archive.is_file() or archive.read_bytes()!=source.read_bytes():raise ValueError('Manifest is not safely archived')
        selected.append(child)
    if apply:
        for child in selected:shutil.rmtree(child)
    return [p.name for p in selected]


def main():
    p=argparse.ArgumentParser();p.add_argument('--latest',required=True,type=int);p.add_argument('--apply',action='store_true');a=p.parse_args()
    root=Path(__file__).resolve().parents[1]/'renders'
    print('REMOVE' if a.apply else 'DRY RUN',cleanup(root,a.latest,a.apply))

if __name__=='__main__':main()
