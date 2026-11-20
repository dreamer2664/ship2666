"""CPU-bounded inspection environment; water and smoke are explicit approximations."""
import math
import bpy
from .mesh import Batch, collection

WAVES=[(.28,42,.2,0),(.18,24,1.1,2),(.11,13,-.5,1),(.075,7,.8,3),(.035,3.5,1.8,4)]


def water_height(x,y,t=0):
    return 7.1+sum(a*math.cos(math.tau/w*(x*math.cos(d)+y*math.sin(d))-math.sqrt(9.81*math.tau/w)*t+p) for a,w,d,p in WAVES)


def build_environment(mats):
    col=collection('90 · Environment — excluded from runtime export')
    water=bpy.data.materials.new('Atlantic · multiscale water');water.use_nodes=True
    n=water.node_tree.nodes;l=water.node_tree.links;bs=n.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(.012,.067,.086,1);bs.inputs['Roughness'].default_value=.19;bs.inputs['IOR'].default_value=1.333;bs.inputs['Transmission'].default_value=.23;bs.inputs['Specular'].default_value=.5
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=2.7;tex.inputs['Detail'].default_value=4;tex.inputs['Roughness'].default_value=.65
    coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Object'],tex.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24;bump.inputs['Distance'].default_value=.095;l.new(tex.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
    mats['ocean']=water
    b=Batch('ATLANTIC_WAVE_SURFACE',col,mats,props={'category':'environment','simulation':'Five-band deep-water wave approximation; not a hydrostatic/CFD solution'})
    N=220;size=2000;vs=[]
    for i in range(N+1):
        x=-size/2+size*i/N
        for j in range(N+1):
            y=-size/2+size*j/N;vs.append((x,y,water_height(x,y,18)))
    faces=[(i*(N+1)+j,(i+1)*(N+1)+j,(i+1)*(N+1)+j+1,i*(N+1)+j+1) for i in range(N) for j in range(N)]
    b.add(vs,faces,'ocean',True);b.finish()
    world=bpy.data.worlds.new('Atlantic daylight');bpy.context.scene.world=world;world.use_nodes=True
    nodes=world.node_tree.nodes;links=world.node_tree.links
    sky=nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(25);sky.sun_rotation=math.radians(130);sky.air_density=1.05;sky.dust_density=.7;sky.altitude=0
    bg=nodes.get('Background');bg.inputs['Strength'].default_value=.32;links.new(sky.outputs['Color'],bg.inputs['Color'])
    sun=bpy.data.lights.new('Sun · calibrated inspection','SUN');sun.energy=2.1;sun.angle=math.radians(3.0)
    ob=bpy.data.objects.new(sun.name,sun);col.objects.link(ob);ob.rotation_euler=(math.radians(25),math.radians(-28),math.radians(-25))
    # A single continuous density volume per funnel, not a chain of opaque spheres.
    smoke=bpy.data.materials.new('Coal smoke · turbulent volume');smoke.use_nodes=True
    nodes=smoke.node_tree.nodes;nodes.clear();links=smoke.node_tree.links
    out=nodes.new('ShaderNodeOutputMaterial');volume=nodes.new('ShaderNodeVolumePrincipled');volume.inputs['Color'].default_value=(.13,.14,.15,1);volume.inputs['Anisotropy'].default_value=.25
    noise=nodes.new('ShaderNodeTexNoise');noise.noise_dimensions='4D';noise.inputs['Scale'].default_value=1.5;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.7;noise.inputs['W'].default_value=.8
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.34;ramp.color_ramp.elements[0].color=(0,0,0,1);ramp.color_ramp.elements[1].position=.72;ramp.color_ramp.elements[1].color=(.16,.16,.16,1)
    links.new(noise.outputs['Fac'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],volume.inputs['Density']);links.new(volume.outputs['Volume'],out.inputs['Volume'])
    mats['smoke']=smoke
    for x in [-11.1,20.5]:
        vol=Batch('SMOKE_VOLUME_'+str(x),col,mats,props={'category':'smoke','simulation':'Procedural volume preview, not combustion fluid simulation'})
        vs=[];n,m=24,16
        for i in range(n+1):
            age=i/n;xx=x-32*age;yy=2.0*age+math.sin(age*8)*age;zz=24.2+9*age;r=.65+4.1*age
            for j in range(m):
                t=math.tau*j/m;vs.append((xx,yy+r*math.cos(t),zz+r*.55*math.sin(t)))
        fs=[(i*m+j,(i+1)*m+j,(i+1)*m+(j+1)%m,i*m+(j+1)%m) for i in range(n) for j in range(m)]
        fs.extend([tuple(reversed(range(m))),tuple(range(n*m,(n+1)*m))]);vol.add(vs,fs,'smoke',True);vol.finish()
