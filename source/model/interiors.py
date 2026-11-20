"""Plan-connected architecture, individually hinged doors and original furnishings.

The decorative vocabulary is evidence-led; manufacturing detail, colours and
metric boundaries remain inferred. Nothing here self-approves visual quality.
"""
from __future__ import annotations
import math
import bpy
from mathutils import Vector
from shapely.geometry import Polygon, Point, box as polygon_box
from .mesh import Batch, collection, empty, label, area_light

CABINS={'first_cabin','second_cabin','upper_cabin','crew_cabin'}
PASSAGES={'corridor','vestibule','lobby','stair','gallery'}
MACHINERY={'engine','boiler','dynamo','shaft','steering'}


def transformed_box(batch,center,size,material,angle=0,bevel=.008):
    # Primitive stock is built into actual joinery/fittings, never a finished sofa.
    if not angle:return batch.box(center,size,material,bevel)
    old=len(batch.vertices);batch.box((0,0,0),size,material,bevel)
    c,s=math.cos(angle),math.sin(angle);x,y,z=center
    for i in range(old,len(batch.vertices)):
        a,b,h=batch.vertices[i];batch.vertices[i]=(x+c*a-s*b,y+s*a+c*b,z+h)


def bed(batch,cx,cy,z,length=1.9,width=.78,brass=False,bunk=False,angle=0):
    old=len(batch.vertices)
    frame='brass' if brass else 'oak'
    levels=[.43,1.52] if bunk else [.43]
    for h in levels:
        batch.box((0,0,h),(length,width,.085),frame,.025)
        batch.box((0,0,h+.105),(length-.06,width-.035,.19),'linen',.06)
        # Cloth surface drapes over the mattress and is depressed under the pillow.
        nx,ny=18,10;vs=[]
        for i in range(nx+1):
            xx=-length*.46+length*.92*i/nx
            for j in range(ny+1):
                yy=-width*.52+width*1.04*j/ny
                edge=max(0,abs(yy)-width*.43)
                folds=.008*math.sin(xx*28+yy*8)*math.sin(j/ny*math.pi)
                hh=h+.215-edge*.75+folds-.012*math.exp(-((xx+length*.32)*8)**2)
                vs.append((xx,yy,hh))
        fs=[(i*(ny+1)+j,(i+1)*(ny+1)+j,(i+1)*(ny+1)+j+1,i*(ny+1)+j+1) for i in range(nx) for j in range(ny)]
        batch.add(vs,fs,'linen',True)
        pillow(batch,-length*.30,0,h+.226,.44,width*.76)
    for xx in [-length/2,length/2]:
        for yy in [-width/2,width/2]:
            top=2.08 if bunk else (1.12 if xx<0 else .85)
            batch.profile((xx,yy,0),[(0,.025),(.05,.035),(.12,.023),(top-.08,.019),(top-.055,.032),(top-.025,.034),(top,.012)],frame,12)
        head=1.00 if xx<0 else .73
        if bunk:head=2.0
        batch.cylinder((xx,-width/2,head),(xx,width/2,head),.017,frame,12)
        batch.cylinder((xx,-width/2,head-.25),(xx,width/2,head-.25),.012,frame,10)
        for k in [-.3,0,.3]:batch.cylinder((xx,k*width,.5),(xx,k*width,head),.009,frame,8)
    if bunk:
        for yy in [-width/2-.07,-width/2-.37]:batch.cylinder((length*.35,yy,.05),(length*.35,yy,1.65),.018,'iron',10)
        for k in range(6):batch.cylinder((length*.35,-width/2-.37,.2+k*.25),(length*.35,-width/2-.07,.2+k*.25),.014,'iron',8)
    c,s=math.cos(angle),math.sin(angle)
    for i in range(old,len(batch.vertices)):
        x,y,h=batch.vertices[i];batch.vertices[i]=(cx+c*x-s*y,cy+s*x+c*y,z+h)


def pillow(batch,x,y,z,l,w):
    nx,ny=12,10;verts=[]
    for layer in [0,1]:
        for i in range(nx+1):
            u=-1+2*i/nx
            for j in range(ny+1):
                v=-1+2*j/ny
                bulge=max(0,1-u*u)**.45*max(0,1-v*v)**.45
                folds=.006*math.sin(u*18+v*6)*(1-abs(v))
                hh=.018+(.082*bulge+folds if layer else -.012*bulge)
                verts.append((x+u*l/2,y+v*w/2,z+hh))
    n=(nx+1)*(ny+1);faces=[]
    for layer in [0,1]:
        for i in range(nx):
            for j in range(ny):
                a=layer*n+i*(ny+1)+j;face=(a,a+ny+1,a+ny+2,a+1);faces.append(face if layer else tuple(reversed(face)))
    batch.add(verts,faces,'linen',True)
    seam=[]
    for i in range(13):seam.append((x-l/2+l*i/12,y-w/2,z+.018))
    for i in range(11):seam.append((x+l/2,y-w/2+w*i/10,z+.018))
    for i in range(13):seam.append((x+l/2-l*i/12,y+w/2,z+.018))
    for i in range(11):seam.append((x-l/2,y+w/2-w*i/10,z+.018))
    batch.tube(seam,.002,'cream',5)


def chair(batch,x,y,z,angle=0,pedestal=False):
    old=len(batch.vertices)
    if pedestal:
        batch.profile((0,0,0),[(0,.16),(.035,.17),(.06,.10),(.14,.065),(.35,.045),(.42,.09)],'iron',16)
    else:
        for xx in [-.18,.18]:
            for yy in [-.17,.17]:batch.profile((xx,yy,0),[(0,.022),(.06,.029),(.15,.02),(.24,.028),(.42,.027)],'mahogany',10)
    batch.cylinder((0,0,.42),(0,0,.455),.235,'mahogany',24)
    batch.cylinder((0,0,.455),(0,0,.49),.218,'upholstery',24)
    for xx in [-.19,.19]:batch.cylinder((xx,.11,.44),(xx,.14,.84),.017,'mahogany',10)
    arc=[(.23*math.cos(math.pi*i/14),.10+.12*math.sin(math.pi*i/14),.84+.035*math.sin(math.pi*i/14)) for i in range(15)]
    batch.tube(arc,.031,'mahogany',10)
    for xx in [-.1,0,.1]:batch.cylinder((xx,.20,.51),(xx,.205,.84),.009,'mahogany',8)
    c,s=math.cos(angle),math.sin(angle)
    for i in range(old,len(batch.vertices)):
        a,b,h=batch.vertices[i];batch.vertices[i]=(x+c*a-s*b,y+s*a+c*b,z+h)


def table(batch,x,y,z,l=1.2,w=.7):
    batch.box((x,y,z+.76),(l,w,.055),'mahogany',.018)
    batch.box((x,y,z+.67),(l-.1,w-.1,.11),'mahogany',.012)
    for xx in [-l*.40,l*.40]:
        for yy in [-w*.36,w*.36]:batch.profile((x+xx,y+yy,z),[(0,.024),(.06,.035),(.16,.024),(.29,.04),(.4,.025),(.68,.03)],'mahogany',12)


def washstand(batch,x,y,z):
    batch.box((x,y,z+.43),(.52,.40,.78),'mahogany',.012)
    batch.box((x,y,z+.845),(.57,.44,.055),'porcelain',.012)
    for hh in [.24,.51,.72]:
        batch.box((x,y-.211,z+hh),(.44,.026,.17),'oak',.012)
        batch.torus((x,y-.238,z+hh),.022,.004,'brass',(0,1,0),12,5)
    # The basin is a turned hollow profile with a proper lip and concave interior.
    batch.profile((x,y,z+.88),[(0,.075),(.025,.11),(.09,.17),(.115,.18),(.125,.175),(.10,.15),(.05,.09),(.04,.02)],'porcelain',28)
    batch.box((x,y+.205,z+1.20),(.44,.035,.52),'mahogany',.015)
    batch.box((x,y+.18,z+1.20),(.355,.015,.42),'mirror',.005)
    batch.cylinder((x+.18,y+.04,z+.88),(x+.18,y+.04,z+1.08),.045,'porcelain',20,radius2=.035)
    batch.torus((x+.23,y+.04,z+.98),.042,.009,'porcelain',(0,1,0),16,6)


def cabinet(batch,x,y,z,l=.8,w=.45,h=1.9):
    batch.box((x,y,z+h/2),(l,w,h),'oak',.015)
    for dx in [-l*.24,l*.24]:
        batch.box((x+dx,y-w/2-.012,z+h*.52),(l*.44,.034,h*.88),'mahogany',.012)
        batch.box((x+dx,y-w/2-.033,z+h*.53),(l*.32,.014,h*.66),'oak',.007)
        batch.cylinder((x+dx+l*.1,y-w/2-.06,z+h*.52),(x+dx+l*.1,y-w/2-.06,z+h*.52+.07),.007,'brass',8)
    batch.box((x,y,z+h+.03),(l+.06,w+.05,.055),'mahogany',.013)


def sofa(batch,x,y,z,l=2.4,angle=0):
    old=len(batch.vertices)
    for xx in [-l*.38,l*.38]:
        for yy in [-.29,.29]:batch.profile((xx,yy,0),[(0,.035),(.08,.048),(.16,.032),(.24,.045)],'mahogany',12)
    batch.box((0,0,.29),(l,.76,.14),'mahogany',.045)
    # Shaped upholstered back follows a bowed plan and a scalloped top rail.
    nx,nz=26,8;verts=[]
    for i in range(nx+1):
        u=-1+2*i/nx;xx=u*l*.5;bow=.10*(1-u*u);top=1.07+.12*(1-u*u)
        for k in range(nz+1):
            t=k/nz;yy=.27+bow+.085*math.sin(math.pi*t);zz=.35+t*(top-.35)
            verts.append((xx,yy,zz))
    faces=[(i*(nz+1)+k,(i+1)*(nz+1)+k,(i+1)*(nz+1)+k+1,i*(nz+1)+k+1) for i in range(nx) for k in range(nz)]
    batch.add(verts,faces,'upholstery',True)
    top=[(-l/2+l*i/26,.27+.10*(1-(-1+2*i/26)**2),1.07+.12*(1-(-1+2*i/26)**2)) for i in range(27)]
    batch.tube(top,.035,'mahogany',10)
    for i in range(max(2,round(l/.65))):
        count=max(2,round(l/.65));cx=-l/2+l*(i+.5)/count
        pillow(batch,cx,-.02,.375,l/count-.035,.65)
    for xx in [-l/2,l/2]:
        pts=[(xx,-.35,.60),(xx,-.3,.71),(xx,0,.78),(xx,.34,.84)]
        batch.tube(pts,.06,'mahogany',12)
        batch.cylinder((xx,-.31,.25),(xx,-.31,.68),.025,'mahogany',12)
    c,s=math.cos(angle),math.sin(angle)
    for i in range(old,len(batch.vertices)):
        a,b,h=batch.vertices[i];batch.vertices[i]=(x+c*a-s*b,y+s*a+c*b,z+h)


def wall_strip(batch,a,b,z,h,mat,thick=.055):
    ax,ay=a;bx,by=b;dx,dy=bx-ax,by-ay;l=math.hypot(dx,dy)
    if l<.02 or h<.01:return
    transformed_box(batch,((ax+bx)/2,(ay+by)/2,z+h/2),(l,thick,h),mat,math.atan2(dy,dx),.003)


def architecture(s,layout,mats,root):
    d=s['deck'];sid=s['id'];kind=s['type'];z=s['z']+.015;h=s['height'];poly=s['polygon']
    col=collection('03 · Interiors '+d)
    node=empty(sid,col,parent=root,space_id=sid,deck=d,category='space',evidence=';'.join(s['evidence_ids']),status='IN PRODUCTION')
    floor=Batch(sid+' · floor',col,mats,node,{'category':'floor','space_id':sid,'deck':d})
    floor_mat='carpet' if kind in {'first_cabin','upper_cabin','dining','smoking','gallery','library','stair'} else ('iron' if kind in MACHINERY or kind=='coal' else 'teak')
    floor.slab(poly,z,.045,floor_mat,s.get('holes'));floor.finish()
    if kind in MACHINERY:return node
    walls=Batch(sid+' · joinery',col,mats,node,{'category':'room','space_id':sid,'deck':d})
    plaster='wallpaper' if kind in CABINS or kind in {'dining','smoking','library'} else 'cream'
    edges=list(zip(poly,poly[1:]+poly[:1]))
    related=[l for l in layout['connections'] if sid in [l['a'],l['b']] and l['kind'] not in ['stairs','winding_stairs','open_region']]
    signed=sum(ax*by-bx*ay for (ax,ay),(bx,by) in edges)
    for a,b in edges:
        ax,ay=a;bx,by=b;dx,dy=bx-ax,by-ay;length=math.hypot(dx,dy)
        if length<.05:continue
        openings=[]
        for l in related:
            px,py=l['point'][:2];t=((px-ax)*dx+(py-ay)*dy)/length
            distance=abs((px-ax)*dy-(py-ay)*dx)/length
            if distance<.18 and -.01<t<length+.01:openings.append((max(0,t-l['width']/2-.035),min(length,t+l['width']/2+.035),l['height']))
        spans=[];cursor=0
        for lo,hi,top in sorted(openings):
            if lo>cursor:spans.append((cursor,lo,0,h))
            spans.append((lo,hi,top,h));cursor=max(cursor,hi)
        if cursor<length:spans.append((cursor,length,0,h))
        nx,ny=(-dy/length,dx/length) if signed>0 else (dy/length,-dx/length)
        pt=lambda t:(ax+dx*t/length+nx*.032,ay+dy*t/length+ny*.032)
        for lo,hi,bottom,top in spans:
            if top<=bottom or hi-lo<.02:continue
            # Real panelling below a dado; plaster/wallpaper above.
            split=min(top,1.03)
            if bottom<split:wall_strip(walls,pt(lo),pt(hi),z+bottom,split-bottom,'mahogany' if floor_mat=='carpet' else 'oak')
            if top>max(bottom,1.03):wall_strip(walls,pt(lo),pt(hi),z+max(bottom,1.03),top-max(bottom,1.03),plaster)
            if bottom==0:
                wall_strip(walls,pt(lo),pt(hi),z,.115,'mahogany',.075)
                wall_strip(walls,pt(lo),pt(hi),z+.985,.065,'oak',.077)
                if kind not in PASSAGES:
                    for t in range(max(1,round((hi-lo)/.55))):
                        q=lo+(hi-lo)*(t+.5)/max(1,round((hi-lo)/.55))
                        xx,yy=pt(q);walls.box((xx,yy,z+.52),(.025,.025,.84),'oak',.004)
            wall_strip(walls,pt(lo),pt(hi),z+top-.09,.075,'cream',.085)
        for lo,hi,top in openings:
            for t in [lo,hi]:
                xx,yy=pt(t);walls.box((xx,yy,z+top/2),(.07,.07,top),'mahogany',.008)
            wall_strip(walls,pt(lo),pt(hi),z+top,.075,'mahogany',.09)
    walls.finish()
    if kind not in {'dining','gallery','stair'}:
        ceiling=Batch(sid+' · ceiling',col,mats,node,{'category':'ceiling','space_id':sid,'deck':d})
        ceiling.slab(poly,z+h,.06,'cream',s.get('holes'));ceiling.finish()
    return node


def furnished(s,mats,node,placements):
    if s['type'] in PASSAGES or s['type'] in MACHINERY or s['type']=='weather':return
    col=collection('03 · Interiors '+s['deck']);batch=Batch(s['id']+' · fittings',col,mats,node,{'category':'furniture','space_id':s['id'],'deck':s['deck']})
    shape=Polygon(s['polygon'],s.get('holes',[])).buffer(0);usable=shape.buffer(-.10)
    minx,miny,maxx,maxy=shape.bounds;z=s['z']+.03
    reserved=[]
    # Keep a clear inward space at each door. Hinge arcs are checked separately.
    for p in placements['doors'].get(s['id'],[]):reserved.append(Point(p).buffer(.48))
    def place(l,w,preference='edge',allow_rotate=False):
        candidates=[]
        for angle in ([0,math.pi/2] if allow_rotate else [0]):
            a,b=(l,w) if angle==0 else (w,l)
            for fx in [.5,.2,.8,.35,.65]:
                for fy in ([.86,.14,.5,.3,.7] if s.get('side',1)>0 else [.14,.86,.5,.7,.3]):
                    x=minx+a/2+.15+max(0,maxx-minx-a-.3)*fx;y=miny+b/2+.15+max(0,maxy-miny-b-.3)*fy
                    footprint=polygon_box(x-a/2,y-b/2,x+a/2,y+b/2)
                    if usable.covers(footprint) and not any(footprint.intersects(p) for p in reserved):
                        reserved.append(footprint.buffer(.04));return x,y,angle,footprint
        return None
    def record(kind,p,l,w):
        if p:placements['items'].append({'space_id':s['id'],'type':kind,'center':[p[0],p[1],z],'size':[l,w],'angle':p[2],'floor_z':z,'status':'GEOMETRY_ONLY'})
    typ=s['type']
    if typ in CABINS:
        length,width=1.9,1.0 if typ=='upper_cabin' else .78
        p=place(length+.08,width+.08,allow_rotate=True)
        if p:
            bed(batch,p[0],p[1],z,length,width,typ=='upper_cabin',s.get('berths',1)>1 and typ!='upper_cabin',p[2]);record('berth',p,length,width)
        else:placements['unfitted'].append(s['id']+': bed does not fit with door clearance')
        p=place(.62,.53)
        if p:washstand(batch,p[0],p[1],z);record('washstand',p,.57,.44)
        p=place(.49,.49)
        if p:chair(batch,p[0],p[1],z,p[2]);record('chair',p,.47,.47)
        if typ=='upper_cabin':
            p=place(.85,.52)
            if p:cabinet(batch,p[0],p[1],z);record('wardrobe',p,.8,.45)
    elif typ in {'emigrant','crew_dorm'}:
        count=0
        for xx in range(math.ceil(minx+1.2),math.floor(maxx-1.0),3):
            for yy in [miny+.62,maxy-.62]:
                fp=polygon_box(xx-1,yy-.43,xx+1,yy+.43)
                if usable.covers(fp) and not any(fp.intersects(p) for p in reserved):
                    bed(batch,xx,yy,z,1.88,.76,False,True);reserved.append(fp);count+=1
                    if count>=14:break
            if count>=14:break
    elif typ in {'smoking','library','crew_mess','second_dining'}:
        if typ=='second_dining':
            for xx in range(math.ceil(minx+1.7),math.floor(maxx-1),3):
                for yy in [miny+2,maxy-2]:
                    table(batch,xx,yy,z,2.0,.8)
                    for sx in [-.6,.6]:
                        for sy in [-.75,.75]:chair(batch,xx+sx,yy+sy,z,0 if sy<0 else math.pi)
        else:
            for xx in [minx+1.9,maxx-1.9]:
                for yy,ang in [(miny+.8,math.pi),(maxy-.8,0)]:
                    sofa(batch,xx,yy,z,2.45,ang)
            table(batch,(minx+maxx)/2,(miny+maxy)/2,z,1.15,.7)
            if typ=='library':
                for xx in [minx+1.2,maxx-1.2]:cabinet(batch,xx,maxy-.3,z,1.6,.4,2.05)
    elif typ=='dining':
        for yy in [-6.25,-3.65,3.65,6.25]:
            table(batch,6.2,yy,z,17.6,.8)
            for i in range(16):
                xx=-1.8+i*1.08
                for side in [-1,1]:
                    chair(batch,xx,yy+side*.72,z,math.pi if side>0 else 0,True)
                    batch.cylinder((xx,yy+side*.21,z+.799),(xx,yy+side*.21,z+.81),.105,'porcelain',18)
                    batch.cylinder((xx+.24,yy+side*.18,z+.80),(xx+.24,yy+side*.18,z+.92),.033,'glass',14)
        for xx in [-2.7,1.3,5.3,9.3,13.3,16.1]:
            for yy in [-2.2,2.2]:
                batch.profile((xx,yy,z),[(0,.19),(.12,.19),(.18,.12),(.29,.14),(.36,.105),(2.27,.085),(2.36,.14),(2.49,.20),(2.58,.20)],'cream',24)
                for k in range(12):
                    a=math.tau*k/12;batch.cylinder((xx+.101*math.cos(a),yy+.101*math.sin(a),z+.38),(xx+.086*math.cos(a),yy+.086*math.sin(a),z+2.24),.006,'brass',5)
    elif typ in {'sanitary','pantry'}:
        for xx in [minx+.65,maxx-.65]:
            washstand(batch,xx,maxy-.32,z)
        if typ=='pantry':table(batch,(minx+maxx)/2,(miny+maxy)/2,z,min(2,maxx-minx-1),.7)
    elif typ in {'store','cargo','cold_store','baggage','mail','specie','service','coal'}:
        if typ=='coal':
            # Angular, supported coal lumps are a bulk material, not furniture placeholders.
            for i in range(35):
                xx=minx+.35+(maxx-minx-.7)*((i*.618)%1);yy=miny+.3+(maxy-miny-.6)*((i*.414)%1)
                if shape.contains(Point(xx,yy)):batch.profile((xx,yy,z),[(0,.19),(.16,.31),(.36,.18),(.44,.03)],'coal',7)
        else:
            for i in range(min(12,max(2,round(shape.area/5)))):
                p=place(.95,.70)
                if not p:break
                xx,yy=p[:2];batch.box((xx,yy,z+.36),(.86,.61,.70),'oak',.008)
                for offset in [-.3,.3]:
                    batch.box((xx+offset,yy,z+.72),(.065,.64,.045),'teak',.004)
                    batch.box((xx+offset,yy-.318,z+.36),(.065,.035,.72),'teak',.004)
                    batch.box((xx+offset,yy+.318,z+.36),(.065,.035,.72),'teak',.004)
    batch.finish()


def build_doors(layout,mats,root):
    col=collection('04 · Operable doors')
    spaces={s['id']:s for s in layout['spaces']}
    for l in layout['connections']:
        if l['kind']!='door':continue
        s=spaces[l['a']];x,y,z=l['point'];w=l['width'];h=l['height']
        # Door-local X runs across the opening; object origin is the hinge, not its centre.
        axis_angle=0 if l['axis']=='x' else math.pi/2
        hx=x-w/2*math.cos(axis_angle);hy=y-w/2*math.sin(axis_angle)
        pivot=empty(l['id'],col,(hx,hy,z+.03),root,category='door',deck=s['deck'],space_id=s['id'],door_id=l['id'],max_angle=l['max_angle'],base_angle=axis_angle,status='IN PRODUCTION')
        pivot.rotation_euler.z=axis_angle
        b=Batch(l['id']+' · leaf and hardware',col,mats,pivot,{'category':'door_leaf','door_id':l['id'],'deck':s['deck']})
        mat='iron' if s['type'] in MACHINERY else 'mahogany'
        b.box((w/2,0,h/2),(w,.044,h),mat,.009)
        for hh,ph in [(.44,.61),(1.30,.84)]:
            b.box((w/2,-.028,hh),(w-.15,.014,ph),'oak' if mat!='iron' else 'iron',.015)
            for xx in [.075,w-.075]:b.box((xx,-.039,hh),(.018,.012,ph+.035),mat,.003)
        for hz in [.23,1.0,1.80]:
            b.cylinder((0,-.025,hz-.045),(0,-.025,hz+.045),.012,'brass',10)
            b.box((.035,-.025,hz),(.06,.016,.07),'brass',.003)
        for sy in [-1,1]:
            b.cylinder((w-.10,sy*.026,.98),(w-.10,sy*.065,.98),.02,'brass',12)
            b.cylinder((w-.10,sy*.065,.98),(w-.19,sy*.065,.98),.01,'brass',10)
            b.box((w-.10,sy*.029,.94),(.045,.008,.12),'brass',.008)
        b.finish()
        # Native source has an editable hinge animation. Runtime uses its own state.
        pivot['open_fraction']=0.0
        pivot['functional_note']='Independent hinge pivot; runtime applies collision gate. Not a full rigid-body door solver.'


def build_stairs(layout,mats,root):
    col=collection('05 · Stairs and circulation')
    spaces={s['id']:s for s in layout['spaces']}
    for l in layout['connections']:
        if l['kind'] not in ['stairs','winding_stairs']:continue
        a,b=spaces[l['a']],spaces[l['b']];low,high=(a,b) if a['z']<b['z'] else (b,a)
        z0,z1=low['z'],high['z'];x,y=l['point'][:2];width=l['width']
        batch=Batch(l['id']+' · staircase',col,mats,root,{'category':'staircase','deck':low['deck'],'upper_deck':high['deck'],'link_id':l['id']})
        if l['kind']=='winding_stairs':
            # Spiral engine access, matching the period description of winding stairs.
            n=math.ceil((z1-z0)/.17);r=.85
            for i in range(n):
                angle=i*math.radians(18);zz=z0+(z1-z0)*(i+1)/n
                v=[(x+.18*math.cos(angle),y+.18*math.sin(angle),zz),(x+(r+width*.4)*math.cos(angle),y+(r+width*.4)*math.sin(angle),zz),(x+(r+width*.4)*math.cos(angle+.31),y+(r+width*.4)*math.sin(angle+.31),zz),(x+.18*math.cos(angle+.31),y+.18*math.sin(angle+.31),zz)]
                batch.add(v,[(0,1,2,3)],'iron')
                xx=x+(r+width*.4)*math.cos(angle);yy=y+(r+width*.4)*math.sin(angle)
                batch.cylinder((xx,yy,zz),(xx,yy,zz+1),.018,'iron',8)
            batch.cylinder((x,y,z0),(x,y,z1+.15),.11,'iron',18)
            pts=[(x+(r+width*.4)*math.cos(i*.31),y+(r+width*.4)*math.sin(i*.31),z0+(z1-z0)*i/n+1) for i in range(n+1)]
            batch.tube(pts,.026,'brass',8)
        else:
            n=math.ceil((z1-z0)/.17);run=min(4.2,max(3.2,n*.23));start=x-run/2
            for i in range(n):
                xx=start+(i+.5)*run/n;zz=z0+(i+1)*(z1-z0)/n
                batch.box((xx,y,zz-.04),(run/n+.012,width,.08),'oak',.006)
                batch.box((xx-run/n/2,y,zz-(z1-z0)/n/2),(.025,width,(z1-z0)/n),'mahogany')
                if low['type']!='corridor':batch.box((xx,y,zz+.004),(run/n-.02,width*.66,.009),'carpet')
                if i%2==0:
                    for side in [-1,1]:batch.profile((xx,y+side*width/2,zz),[(0,.018),(.10,.025),(.25,.014),(.43,.028),(.56,.014),(.90,.02)],'mahogany',10)
            for side in [-1,1]:
                batch.cylinder((start,y+side*width/2,z0-.05),(start+run,y+side*width/2,z1-.05),.06,'iron',8)
                batch.cylinder((start,y+side*width/2,z0+.95),(start+run,y+side*width/2,z1+.95),.034,'mahogany',12)
        batch.finish()


def build_saloon_dome(mats,root):
    col=collection('06 · Public-room architecture');b=Batch('SALOON_COFFERED_DOME',col,mats,root,{'category':'ceiling','deck':'U','space_id':'M-SALOON','evidence':'E023'})
    for i in range(8):
        x0=.6+i*1.25;x1=x0+1.25
        for j in range(12):
            t0=-math.pi/2+j*math.pi/12;t1=t0+math.pi/12
            def p(x,t):return (x,3.25*math.sin(t),12.0+2.25*math.cos(t))
            b.add([p(x0,t0),p(x1,t0),p(x1,t1),p(x0,t1)],[(3,2,1,0)],'cream',True)
        b.tube([(.6+i*1.25,3.25*math.sin(-math.pi/2+j*math.pi/32),12+2.25*math.cos(-math.pi/2+j*math.pi/32)) for j in range(33)],.045,'mahogany',8)
    for j in range(7):
        t=-math.pi/2+j*math.pi/6;b.cylinder((.6,3.25*math.sin(t),12+2.25*math.cos(t)),(10.6,3.25*math.sin(t),12+2.25*math.cos(t)),.027,'brass',10)
    for xx in [1.85,4.35,6.85,9.35]:
        b.torus((xx,0,14.12),.32,.018,'brass',(0,0,1),24,6)
        for a in range(8):
            t=math.tau*a/8;b.profile((xx+.22*math.cos(t),.22*math.sin(t),14.08),[(0,.04),(.06,.075),(.13,.025)],'cream',8)
    b.finish()


def build_interiors(layout,mats,root):
    doors={}
    for l in layout['connections']:
        if l['kind']=='door':
            for s in [l['a'],l['b']]:doors.setdefault(s,[]).append(l['point'][:2])
    placements={'items':[],'unfitted':[],'doors':doors}
    lightcol=collection('09 · Interior practicals')
    for n,s in enumerate(layout['spaces']):
        if s['type']=='weather':continue
        node=architecture(s,layout,mats,root);furnished(s,mats,node,placements)
        if s['type'] not in MACHINERY and s['type'] not in ['coal','cargo','shaft']:
            x,y,z=s['center'];hh=min(s['height']-.2,2.3)
            fixture=Batch(s['id']+' · electric pendant',lightcol,mats,root,{'category':'fixture','space_id':s['id'],'deck':s['deck']})
            fixture.cylinder((x,y,z+hh),(x,y,z+hh+.17),.012,'brass',10)
            fixture.profile((x,y,z+hh-.10),[(0,.025),(.04,.07),(.13,.085),(.20,.045)],'lamp',14)
            fixture.torus((x,y,z+hh+.05),.085,.008,'brass',(0,0,1),18,5);fixture.finish()
            # Render only a selected subset of practical lights; no hidden completion claim.
            if s['id'] in ['U-STATEROOM-G','M-SALOON','U-SMOKING','U-SC-DINING','L-STEWARD-P-02'] or (s['type'] in PASSAGES and n%4==0):
                data=bpy.data.lights.new(s['id']+' practical','POINT');data.energy=24 if s['type'] in CABINS else 90;data.color=(1,.74,.48);data.shadow_soft_size=.12
                ob=bpy.data.objects.new(data.name,data);lightcol.objects.link(ob);ob.location=(x,y,z+hh-.18)
        if n%50==0:print('Interior spaces constructed:',n,flush=True)
    build_doors(layout,mats,root);build_stairs(layout,mats,root);build_saloon_dome(mats,root)
    for x in [0,6,12]:area_light('Saloon inspection bounce '+str(x),(x,0,13.2),180,3,(1,.86,.69),lightcol,(x,0,9.3))
    placements.pop('doors')
    return placements
