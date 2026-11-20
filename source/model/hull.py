"""Editable loft, true window openings, plate seams, frames and deck structure."""
import math
from shapely.geometry import Polygon, box as polygon_box
from shapely.ops import triangulate
from .mesh import Batch, collection, label
from source.ship.geometry import SPEC, HALF_LENGTH, half_breadth, hull_point, sheer, rectangle


def weather_z(x,y=0):
    w=max(.1,half_breadth(x,11.95))
    return 11.95+sheer(x)+.12*max(0,1-(y/w)**2)


def build_hull(materials,root,layout):
    col=collection('01 · Hull and structure')
    bands=[0,.3,.9,1.8,3,4.4,5.8,7.1,7.7,8.4,9.3,10.15,11.15,11.95]
    n=76
    total_openings=0
    for side,tag in [(1,'PORT'),(-1,'STARBOARD')]:
        shell=Batch('HULL_'+tag,col,materials,root,{'category':'hull','side':tag,'evidence':'E027','status':'IN PRODUCTION'})
        fittings=Batch('HULL_OPENINGS_'+tag,col,materials,root,{'category':'hull_detail','side':tag,'evidence':'E026','status':'IN PRODUCTION'})
        seams=Batch('PLATE_JOINTS_'+tag,col,materials,root,{'category':'hull_detail','side':tag,'evidence':'E027'})
        for k,(lo,hi) in enumerate(zip(bands,bands[1:])):
            for j in range(n):
                a,b=j/n,(j+1)/n;u=(a+b)/2;z=(lo+hi)/2
                x,y,_=hull_point(u,z,side)
                # The period stern plate shows an open deadwood aperture for overlapping screws.
                if x < -78.0 and hi <= 5.8 and lo >= .3:
                    continue
                holes=(k in [8,11] and 5<j<n-5 and (k==11 or x<-34 or x>15))
                mat='oxide' if hi<=7.1 else 'hull'
                if not holes:
                    verts=[hull_point(a,lo,side),hull_point(b,lo,side),hull_point(b,hi,side),hull_point(a,hi,side)]
                    if k==len(bands)-2:verts=[(xx,yy,zz+(sheer(xx) if zz==hi else 0)) for xx,yy,zz in verts]
                    shell.add(verts,[(3,2,1,0) if side>0 else (0,1,2,3)],mat,True)
                else:
                    square=(k==11 and -4<x<17)
                    r=.215 if not square else .32
                    outer=[];inner=[];count=16
                    for m in range(count):
                        t=math.tau*m/count;c,s=math.cos(t),math.sin(t);den=max(abs(c),abs(s))
                        ou=u+(b-a)*.5*c/den;oz=z+(hi-lo)*.5*s/den
                        irx=r*(c/den if square else c);irz=r*(s/den if square else s)
                        iu=u+irx/177.3936;iz=z+irz
                        outer.append(hull_point(ou,oz,side));inner.append(hull_point(iu,iz,side))
                    verts=outer+inner
                    faces=[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
                    if side>0:faces=[tuple(reversed(f)) for f in faces]
                    shell.add(verts,faces,mat,True)
                    # Reveals have physical depth. Glass is recessed behind the opening.
                    reveal=[(px,py-side*.14,pz) for px,py,pz in inner]
                    fittings.add(inner+reveal,[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)],'iron',True)
                    if square:
                        pts=inner+[inner[0]];fittings.tube([(px,py+side*.025,pz) for px,py,pz in pts],.024,'cream',6)
                        fittings.add(reveal,[tuple(range(count))],'darkglass')
                    else:
                        fittings.torus((x,y+side*.015,z),r+.018,.027,'brass',(0,side,0),24,6)
                        fittings.cylinder((x,y-side*.13,z),(x,y-side*.115,z),r-.014,'darkglass',24)
                        for m in range(8):
                            t=math.tau*m/8
                            fittings.cylinder((x+(r+.04)*math.cos(t),y+side*.018,z+(r+.04)*math.sin(t)),(x+(r+.04)*math.cos(t),y+side*.034,z+(r+.04)*math.sin(t)),.009,'steel',6)
                        fittings.box((x+r*.78,y+side*.04,z+r*.78),(.10,.055,.035),'brass',.008)
                    total_openings+=1
                # Staggered transverse plate joints follow construction courses, not random noise.
                if j%3==(k%2):
                    pts=[hull_point(a,lo+(hi-lo)*t/4,side) for t in range(5)]
                    seams.tube([(xx,yy+side*.009,zz) for xx,yy,zz in pts],.006,'iron',5)
        for z in bands[2:-1]:
            pts=[hull_point(i/120,z,side) for i in range(121)]
            seams.tube([(x,y+side*.011,zz) for x,y,zz in pts],.007,'iron',5)
        # Painted sheer strakes are thin, grounded strips, not oversized ornament.
        for off,r,mat in [(-.24,.018,'cream'),(-.35,.010,'brass')]:
            pts=[]
            for i in range(121):
                x,y,z=hull_point(i/120,11.95,side);pts.append((x,y+side*.022,z+sheer(x)+off))
            seams.tube(pts,r,mat,6)
        shell.finish();fittings.finish();seams.finish()

    # Keel and real transverse frame paths; cutaways retain construction logic.
    framing=Batch('STRUCTURE_FRAMES',col,materials,root,{'category':'structure','evidence':'E027','status':'IN PRODUCTION'})
    framing.box((1,0,.18),(163,.24,.36),'iron',.025)
    x=-77
    while x<84:
        pts=[]
        for side,levels in [(-1,[11.95,10,8,6,4,2,1,.5]),(1,[.5,1,2,4,6,8,10,11.95])]:
            for z in levels:
                w=half_breadth(x,z)
                if w>.2:pts.append((x,side*(w-.10),z))
        if len(pts)>3:framing.tube(pts,.045,'iron',5)
        x+=SPEC['hull']['frame_spacing']
    for side in [-1,1]:
        for z in [3.6,6.45,9.15]:
            pts=[(x,side*max(.1,half_breadth(x,z)-.12),z-.14) for x in range(-76,85,2)]
            framing.tube(pts,.065,'iron',6)
    framing.finish()

    # Continuous supporting decks are perforated for machinery, hatches and stairs.
    for deck in SPEC['decks']:
        d=deck['id'];z=deck['z']
        if d in ['T','P']:continue
        dc=collection('02 · Deck '+d)
        length=75 if d=='O' else (79 if d=='L' else 85)
        xs=[-length+i*2 for i in range(length+1)]
        outline=[(x,-max(.01,half_breadth(x,min(z,11.95))-.10)) for x in xs]
        outline+=[(x,max(.01,half_breadth(x,min(z,11.95))-.10)) for x in reversed(xs)]
        floor=Polygon(outline)
        cuts=[]
        if d=='O':cuts+=[rectangle(-41,30.5,-8.4,8.4)]
        if d=='L':cuts+=[rectangle(-34.3,-18.5,-7.8,7.8),rectangle(-12,-7.2,-2.5,2.5),rectangle(19.5,24.5,-2,2)]
        if d=='M':cuts+=[rectangle(-34.3,-18.5,-4.05,4.05),rectangle(-12,-7.2,-2.5,2.5),rectangle(19.5,24.5,-1.95,1.95)]
        if d=='U':cuts+=[rectangle(-34,-25,-3.3,3.3),rectangle(-12,-7.2,-2.5,2.5),rectangle(19.5,24.5,-2,2),rectangle(.8,10.1,-2.25,2.25)]
        for link in layout['connections']:
            if link['kind'] not in ['stairs','winding_stairs']:continue
            sa=next(s for s in layout['spaces'] if s['id']==link['a']);sb=next(s for s in layout['spaces'] if s['id']==link['b'])
            upper=sa if sa['z']>sb['z'] else sb
            if upper['deck']==d:
                x,y=link['point'][:2]
                cuts.append(rectangle(x-2.05,x+2.05,y-link['width']*.65,y+link['width']*.65))
        for cut in cuts:floor=floor.difference(Polygon(cut))
        batch=Batch('DECK_STRUCTURE_'+d,dc,materials,root,{'category':'deck','deck':d,'z':z,'evidence':'E025'})
        for geom in (list(floor.geoms) if floor.geom_type=='MultiPolygon' else [floor]):
            batch.slab(list(geom.exterior.coords)[:-1],z-.045,.14,'iron',holes=[list(r.coords)[:-1] for r in geom.interiors])
        batch.finish()
        if d=='U':
            planks=Batch('WEATHER_PLANKING',dc,materials,root,{'category':'weather','deck':'U','z':z,'evidence':'E026'})
            # Separate caulked planks. Actual wood-scale seams, each clipped to deck and house cutouts.
            visible=floor.difference(polygon_box(-39,-5.7,36.2,5.7)).difference(polygon_box(-60,-5.5,-44,5.5))
            for row in range(-58,59):
                yy=row*.145
                for k in range(22):
                    xx=-88+k*8+(row%4)*2
                    plank=visible.intersection(polygon_box(xx+.006,yy+.003,xx+7.994,yy+.142))
                    geoms=list(plank.geoms) if hasattr(plank,'geoms') else [plank]
                    for p in geoms:
                        if p.geom_type!='Polygon' or p.area<.002:continue
                        for tri in triangulate(p):
                            if not p.covers(tri):continue
                            verts=[(px,py,weather_z(px,py)) for px,py in list(tri.exterior.coords)[:3]]
                            planks.add(verts,[(0,1,2)],'teak')
            planks.finish()

    # Bulkhead plates with central/service door openings; no solid wall across a route.
    bulk=Batch('STRUCTURE_BULKHEADS',col,materials,root,{'category':'bulkhead','evidence':'E016;E027'})
    for x in SPEC['hull']['bulkhead_x']:
        top=6.35 if -41<x<31 else 9.0
        if -35<x<-18:continue
        # Lower division plating stops at openings; unverified upper doors remain a known defect.
        for side in [-1,1]:
            for zz in [1.4,2.6,3.8,5.0,6.2,7.4,8.6]:
                if zz>top:continue
                width=half_breadth(x,zz)-.16
                if width>1.25:
                    bulk.box((x,side*(width+1.1)/2,zz),(.035,width-1.1,1.12),'iron')
                    for yy in [side*1.2,side*min(width-.08,4.0),side*max(1.2,width-.1)]:bulk.box((x-.07,yy,zz),(.12,.07,1.12),'iron')
    bulk.finish()
    print('Hull true openings:',total_openings,flush=True)
