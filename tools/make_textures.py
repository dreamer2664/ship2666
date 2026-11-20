#!/usr/bin/env python3
"""Deterministic original material maps; grain/fibre scale is a modelling choice."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/textures';OUT.mkdir(parents=True,exist_ok=True)
N=768
rng=np.random.default_rng(1889)
y,x=np.mgrid[0:N,0:N].astype(np.float32)/N

def normal(height,strength=1):
    dy,dx=np.gradient(height)
    v=np.stack([-dx*strength,-dy*strength,np.ones_like(height)],axis=-1)
    v/=np.linalg.norm(v,axis=-1,keepdims=True)
    return np.uint8(np.clip(v*.5+.5,0,1)*255)

def save(name,base,height,rough):
    Image.fromarray(np.uint8(np.clip(base,0,1)*255)).save(OUT/f'{name}_color.png',optimize=True)
    Image.fromarray(normal(height,18)).save(OUT/f'{name}_normal.png',optimize=True)
    Image.fromarray(np.uint8(np.clip(rough,0,1)*255)).save(OUT/f'{name}_roughness.png',optimize=True)

noise=rng.normal(0,1,(N,N)).astype(np.float32)
grain=np.sin(y*410+4*np.sin(x*15)+2*np.sin(y*29+x*4))*.5+.5
fine=np.sin(y*1510+8*np.sin(x*14))*.5+.5
wood=.62+.16*grain+.04*fine+.018*noise
save('oak',wood[:,:,None]*np.array([.62,.39,.205]),grain*.12+noise*.025,.38+grain*.1)
save('teak',wood[:,:,None]*np.array([.72,.58,.39]),grain*.07+noise*.02,.61+grain*.1)
save('mahogany',wood[:,:,None]*np.array([.40,.195,.11]),grain*.06+noise*.02,.29+grain*.09)
weave=(np.sin(x*TAU*192)*np.cos(y*TAU*192) if (TAU:=np.pi*2) else x)
warp=.5+.5*np.sin(x*TAU*384);weft=.5+.5*np.sin(y*TAU*384)
fabric=.84+.05*weave+.025*noise
save('linen',fabric[:,:,None]*np.array([.95,.92,.84]),weave*.045+warp*.025+weft*.025,.8+weave*.025)
damask=(np.sin(x*TAU*7+np.cos(y*TAU*7))*.5+.5)*(np.cos(y*TAU*14)*.5+.5)
save('upholstery',(fabric*.65+damask*.12)[:,:,None]*np.array([.46,.58,.48]),weave*.055+damask*.04,.76+weave*.03)
# Restrained repeating botanical geometry rather than unrelated noise.
u=(x*8)%1-.5;v=(y*8)%1-.5
leaf=(np.exp(-((u-.12*np.sin(v*8))**2*110+v*v*20))+.5*np.exp(-((u+.19)**2*180+(v-.18)**2*100)))
wall=np.stack([.82-.16*leaf,.75-.20*leaf,.58-.22*leaf],axis=-1)+noise[:,:,None]*.004
save('wallpaper',wall,leaf*.025,.78+leaf*.03)
carpet=(.22+.09*np.cos(x*TAU*22)*np.cos(y*TAU*22)+.04*noise)
save('carpet',carpet[:,:,None]*np.array([.62,.25,.2]),weave*.06+noise*.025,.91+weave*.02)
print('Created 7 original PBR families (21 maps), 768×768; preview sources, not final close-up approval.')
