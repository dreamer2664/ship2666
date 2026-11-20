"""Physically based materials with metric texture coordinates and modest wear."""
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[2]


def make_materials():
    mats={}
    definitions={
      'hull':((.026,.034,.039),.5,.26),'oxide':((.22,.055,.033),.64,.10),
      'white':((.72,.73,.68),.48,.05),'cream':((.7,.65,.51),.62,0),
      'buff':((.54,.30,.11),.58,.06),'soot':((.016,.019,.022),.88,0),
      'iron':((.058,.073,.069),.55,.72),'steel':((.3,.34,.35),.28,1),
      'brass':((.48,.32,.11),.28,1),'bronze':((.32,.21,.085),.38,1),
      'copper':((.47,.20,.085),.33,1),'rope':((.36,.29,.19),.94,0),
      'canvas':((.65,.66,.57),.92,0),'coal':((.015,.018,.019),.82,.02),
      'porcelain':((.82,.8,.7),.2,0),'green':((.055,.12,.083),.4,.1),
      'leather':((.12,.045,.026),.53,0),'red':((.46,.045,.036),.52,.05),
      'lamp':((.95,.76,.42),.32,0),'glass':((.40,.56,.58),.12,0),
      'mirror':((.75,.78,.78),.06,1),'darkglass':((.035,.065,.074),.2,.18),
      'oak':((.35,.19,.08),.43,0),'mahogany':((.21,.08,.035),.33,0),
      'teak':((.46,.34,.20),.65,0),'linen':((.8,.77,.69),.86,0),
      'upholstery':((.2,.28,.22),.8,0),'wallpaper':((.65,.6,.46),.78,0),
      'carpet':((.2,.065,.055),.92,0)
    }
    for name,(color,rough,metal) in definitions.items():
        mat=bpy.data.materials.new('T1889 · '+name);mat.use_nodes=True
        mat.diffuse_color=(*color,1);mat.roughness=rough;mat.metallic=metal
        bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
        bs.inputs['Specular'].default_value=.35
        nodes=mat.node_tree.nodes;links=mat.node_tree.links
        for suffix,socket in [('color','Base Color'),('roughness','Roughness')]:
            path=ROOT/'assets/textures'/f'{name}_{suffix}.png'
            if path.exists():
                tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);tex.label=f'{name} · original {suffix}'
                if suffix!='color':tex.image.colorspace_settings.name='Non-Color'
                links.new(tex.outputs['Color'],bs.inputs[socket])
        path=ROOT/'assets/textures'/f'{name}_normal.png'
        if path.exists():
            tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True);tex.image.colorspace_settings.name='Non-Color'
            norm=nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.22;links.new(tex.outputs['Color'],norm.inputs['Color']);links.new(norm.outputs['Normal'],bs.inputs['Normal'])
        elif name in ['hull','oxide','white','buff','iron']:
            noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=110;noise.inputs['Detail'].default_value=2
            bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.15;bump.inputs['Distance'].default_value=.0013
            links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        if name=='glass':
            bs.inputs['Transmission'].default_value=.72;bs.inputs['IOR'].default_value=1.52
        if name=='lamp':
            bs.inputs['Emission'].default_value=(1,.63,.25,1);bs.inputs['Emission Strength'].default_value=2.5
        mats[name]=mat
    return mats
