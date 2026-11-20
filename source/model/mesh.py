"""Batched, editable construction geometry. No external assets are used."""
from __future__ import annotations
import math
import bpy
from mathutils import Vector, Matrix
from shapely.geometry import Polygon
from shapely.ops import triangulate

TAU=math.tau


def collection(name,parent=None):
    col=bpy.data.collections.get(name)
    if col is None:
        col=bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def empty(name,col,location=(0,0,0),parent=None,**props):
    ob=bpy.data.objects.new(name,None);col.objects.link(ob);ob.location=location
    ob.parent=parent
    for k,v in props.items():ob[k]=v
    return ob


class Batch:
    def __init__(self,name,col,materials,parent=None,props=None):
        self.name=name;self.col=col;self.materials=materials;self.parent=parent;self.props=props or {}
        self.vertices=[];self.faces=[];self.indices=[];self.smooth=[];self.uvs=[]
        self.mat_names=[]

    def add(self,vertices,faces,mat,smooth=False,uv_scale=1.0):
        offset=len(self.vertices)
        self.vertices.extend(tuple(v) for v in vertices)
        if mat not in self.mat_names:self.mat_names.append(mat)
        idx=self.mat_names.index(mat)
        for face in faces:
            self.faces.append(tuple(offset+i for i in face));self.indices.append(idx);self.smooth.append(smooth)
        return self

    def box(self,center,size,mat,bevel=0):
        x,y,z=center;dx,dy,dz=(s/2 for s in size)
        if bevel>0 and min(size)>bevel*2.01:
            b=min(bevel,min(size)*.24)
            rings=[]
            for zz,inset in [(z-dz,b),(z-dz+b,0),(z+dz-b,0),(z+dz,b)]:
                hx,hy=dx-inset,dy-inset;r=max(.0005,b-inset*.72)
                ring=[]
                for cx,cy,start in [(hx-r,hy-r,0),(-hx+r,hy-r,90),(-hx+r,-hy+r,180),(hx-r,-hy+r,270)]:
                    for j in range(3):
                        a=math.radians(start+j*45)
                        ring.append((x+cx+r*math.cos(a),y+cy+r*math.sin(a),zz))
                rings.append(ring)
            verts=sum(rings,[]);n=len(rings[0]);faces=[]
            faces.append(tuple(reversed(range(n))));faces.append(tuple(range(3*n,4*n)))
            for k in range(3):
                for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
            return self.add(verts,faces,mat)
        v=[(x+sx*dx,y+sy*dy,z+sz*dz) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        return self.add(v,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)

    def cylinder(self,a,b,radius,mat,n=20,radius2=None,cap=True):
        a,b=Vector(a),Vector(b);t=(b-a).normalized()
        ref=Vector((0,0,1)) if abs(t.z)<.95 else Vector((1,0,0))
        u=t.cross(ref).normalized();v=t.cross(u).normalized();rr=radius if radius2 is None else radius2
        verts=[p+(u*math.cos(TAU*j/n)+v*math.sin(TAU*j/n))*r for p,r in [(a,radius),(b,rr)] for j in range(n)]
        faces=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        if cap:faces.extend([tuple(reversed(range(n))),tuple(range(n,2*n))])
        return self.add(verts,faces,mat,True)

    def tube(self,points,r,mat,n=8):
        if len(points)<2:return self
        vs=[]
        for i,p in enumerate(points):
            p=Vector(p)
            t=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
            ref=Vector((0,0,1)) if abs(t.z)<.92 else Vector((1,0,0))
            u=t.cross(ref).normalized();v=t.cross(u).normalized()
            for j in range(n):vs.append(p+r*(u*math.cos(TAU*j/n)+v*math.sin(TAU*j/n)))
        faces=[]
        for k in range(len(points)-1):
            for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
        return self.add(vs,faces,mat,True)

    def torus(self,center,major,minor,mat,normal=(0,0,1),n=28,m=7):
        c=Vector(center);t=Vector(normal).normalized()
        ref=Vector((0,0,1)) if abs(t.z)<.95 else Vector((1,0,0))
        u=t.cross(ref).normalized();v=t.cross(u).normalized();verts=[]
        for i in range(n):
            q=u*math.cos(TAU*i/n)+v*math.sin(TAU*i/n)
            for j in range(m):verts.append(c+q*(major+minor*math.cos(TAU*j/m))+t*(minor*math.sin(TAU*j/m)))
        faces=[(i*m+j,((i+1)%n)*m+j,((i+1)%n)*m+(j+1)%m,i*m+(j+1)%m) for i in range(n) for j in range(m)]
        return self.add(verts,faces,mat,True)

    def profile(self,center,points,mat,n=20):
        x,y,z=center;verts=[(x+r*math.cos(TAU*j/n),y+r*math.sin(TAU*j/n),z+h) for h,r in points for j in range(n)]
        faces=[]
        for k in range(len(points)-1):
            for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
        faces.extend([tuple(reversed(range(n))),tuple(range((len(points)-1)*n,len(points)*n))])
        return self.add(verts,faces,mat,True)

    def slab(self,poly,z,thickness,mat,holes=None):
        geom=Polygon(poly,holes or [])
        if not geom.is_valid:geom=geom.buffer(0)
        if geom.is_empty:return self
        pieces=list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom]
        for piece in pieces:
            verts=[];faces=[]
            for tri in triangulate(piece):
                if not piece.covers(tri):continue
                xy=list(tri.exterior.coords)[:3];idx=len(verts)
                verts.extend((x,y,z) for x,y in xy);faces.append((idx,idx+1,idx+2))
                if thickness:
                    idx=len(verts);verts.extend((x,y,z-thickness) for x,y in xy);faces.append((idx+2,idx+1,idx))
            if thickness:
                for ring in [piece.exterior,*piece.interiors]:
                    coords=list(ring.coords)
                    for (ax,ay),(bx,by) in zip(coords,coords[1:]):
                        idx=len(verts);verts.extend([(ax,ay,z-thickness),(bx,by,z-thickness),(bx,by,z),(ax,ay,z)])
                        faces.append((idx,idx+1,idx+2,idx+3))
            self.add(verts,faces,mat)
        return self

    def finish(self):
        if not self.faces:return None
        mesh=bpy.data.meshes.new(self.name+' mesh');mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        for name in self.mat_names:mesh.materials.append(self.materials[name])
        for p,idx,smooth in zip(mesh.polygons,self.indices,self.smooth):p.material_index=idx;p.use_smooth=smooth
        # Metric planar UVs. Orientation is explicit per face, not stretched room-scale coordinates.
        uv=mesh.uv_layers.new(name='Metric UV')
        for face in mesh.polygons:
            n=face.normal;axis=max(range(3),key=lambda k:abs(n[k]))
            axes=(0,1) if axis==2 else ((0,2) if axis==1 else (1,2))
            for li in face.loop_indices:
                co=mesh.vertices[mesh.loops[li].vertex_index].co
                uv.data[li].uv=(co[axes[0]],co[axes[1]])
        ob=bpy.data.objects.new(self.name,mesh);self.col.objects.link(ob);ob.parent=self.parent
        for k,v in self.props.items():ob[k]=v
        return ob


def label(name,text,location,size,mat,col,rotation=(0,0,0),parent=None):
    curve=bpy.data.curves.new(name,'FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';curve.extrude=.0015;curve.bevel_depth=.0008;curve.resolution_u=3
    ob=bpy.data.objects.new(name,curve);col.objects.link(ob);ob.location=location;ob.rotation_euler=rotation;ob.parent=parent;curve.materials.append(mat)
    return ob


def area_light(name,location,energy,size,color,col,target=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);col.objects.link(ob);ob.location=location
    if target is not None:ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
