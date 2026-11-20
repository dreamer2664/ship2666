"""Teutonic's early-service exterior: two funnels, three masts, fourteen boats.

Fittings use plausible construction, scale and attachment points. Exact maker
patterns, boat allocation and all rigging dimensions remain inferred.
"""
import math
from .mesh import Batch, collection, empty, label
from .hull import weather_z
from source.ship.geometry import SPEC, half_breadth


def rail(b,points,height=1.05):
    if len(points)<2:return
    for x,y,z in points:
        b.cylinder((x,y,z),(x,y,z+height),.019,'white',8)
        b.cylinder((x,y,z-.025),(x,y,z+.035),.046,'iron',10)
    for h in [.34,.68,height]:b.tube([(x,y,z+h) for x,y,z in points],.015 if h<1 else .024,'white',7)


def ventilator(b,x,y,z,height=2.0,r=.24,side=1):
    pts=[(x,y,z),(x,y,z+height-.5),(x,y,z+height-.30),(x,y+side*.10,z+height-.12),(x,y+side*.35,z+height)]
    b.tube(pts,r,'buff',18)
    b.torus((x,y+side*.35,z+height),r,.027,'buff',(0,1,0),24,7)
    b.cylinder((x,y+side*.33,z+height),(x,y+side*.34,z+height),r*.91,'soot',24)
    b.cylinder((x,y,z),(x,y,z+.09),r+.10,'iron',24)
    b.torus((x,y,z+.5),r+.01,.016,'iron',(0,0,1),20,6)


def lifeboat(mats,root,i,x,y,z):
    col=collection('12 · Lifeboats and davits');side=1 if y>0 else -1
    b=Batch(f'LIFEBOAT_{i:02d}',col,mats,root,{'category':'boat','deck':'P','boat_id':f'LB{i:02d}','evidence':'E026','status':'IN PRODUCTION'})
    n,m=24,12;vs=[]
    for j in range(n+1):
        u=-1+2*j/n;xx=x+u*4.15;w=max(.025,1.08*(1-u*u)**.62)
        for k in range(m+1):
            t=-math.pi/2+math.pi*k/m
            vs.append((xx,y+w*math.sin(t),z+.88-.79*math.cos(t)+.20*u*u))
    fs=[(j*(m+1)+k,(j+1)*(m+1)+k,(j+1)*(m+1)+k+1,j*(m+1)+k+1) for j in range(n) for k in range(m)]
    b.add(vs,fs,'white',True)
    # Interior skin and bent timber ribs.
    b.add([(xx,yy,zp+.03) for xx,yy,zp in vs],[tuple(reversed(f)) for f in fs],'canvas',True)
    for j in range(2,n-1,2):
        pts=[(vs[j*(m+1)+k][0],vs[j*(m+1)+k][1],vs[j*(m+1)+k][2]+.055) for k in range(m+1)]
        b.tube(pts,.022,'oak',6)
    for sign in [-1,1]:
        pts=[]
        for j in range(n+1):
            u=-1+2*j/n;w=max(.025,1.08*(1-u*u)**.62);pts.append((x+u*4.15,y+sign*w,z+.9+.2*u*u))
        b.tube(pts,.041,'mahogany',8)
    for xx in [-2.7,-1.35,0,1.35,2.7]:
        w=1.02*(1-(xx/4.15)**2)**.62;b.box((x+xx,y,z+.71),(.23,w*2,.055),'teak',.009)
    for xx in [-2.5,2.5]:
        b.box((x+xx,y,z-.06),(.32,1.1,.22),'oak',.025)
        b.box((x+xx,y,z-.22),(.65,1.2,.09),'iron',.015)
    if i%3==0:
        # Tensioned canvas, with seams and tied edge, on a subset of boats.
        cv=[]
        for j in range(n+1):
            u=-1+2*j/n;w=max(.025,1.06*(1-u*u)**.62)
            for k in range(9):
                v=-1+2*k/8;cv.append((x+u*4.15,y+v*w,z+.97+.18*(1-v*v)+.20*u*u+.012*math.sin(u*40+v*7)))
        cf=[(j*9+k,(j+1)*9+k,(j+1)*9+k+1,j*9+k+1) for j in range(n) for k in range(8)];b.add(cv,cf,'canvas',True)
        for j in range(2,n-1,3):
            for sign in [-1,1]:
                u=-1+2*j/n;w=1.08*(1-u*u)**.62
                b.cylinder((x+u*4.15,y+sign*w,z+.98+.2*u*u),(x+u*4.15+.14,y+sign*w*.94,z+.70),.006,'rope',6)
    else:
        for off in [-.16,.10]:
            b.cylinder((x-2.4,y+off,z+.81),(x+2.0,y+off,z+.81),.022,'oak',10)
            b.box((x+2.3,y+off,z+.81),(.65,.14,.025),'oak',.012)
    b.finish()
    gear=Batch(f'DAVITS_{i:02d}',col,mats,root,{'category':'boat_gear','deck':'P','boat_id':f'LB{i:02d}'})
    for xx in [x-2.65,x+2.65]:
        basey=side*8.1;deck=14.62
        pts=[(xx,basey,deck),(xx,basey,deck+1.35),(xx,basey-side*.05,deck+1.95),(xx,basey-side*.32,deck+2.4),(xx,y,deck+2.6)]
        gear.tube(pts,.062,'white',12)
        gear.cylinder((xx,basey,deck-.05),(xx,basey,deck+.12),.17,'iron',24)
        gear.torus((xx,y,deck+2.53),.083,.016,'brass',(1,0,0),18,6)
        for yy in [-.045,.045]:gear.cylinder((xx,y+yy,deck+2.5),(xx,y+yy,z+.83),.008,'rope',6)
        gear.torus((xx,y,z+.83),.057,.014,'iron',(1,0,0),16,6)
    gear.finish()


def build_funnels(mats,root):
    col=collection('11 · Exterior fittings')
    for f in SPEC['funnels']:
        b=Batch(f['id'],col,mats,root,{'category':'funnel','deck':'U','funnel_id':f['id'],'evidence':'E026'})
        x,y,z=f['x'],f['y'],f['base_z'];rx,ry=f['longitudinal_radius'],f['transverse_radius'];h=f['height'];rake=math.tan(math.radians(f['rake_degrees']))
        for lo,hi,mat in [(0,h-2.2,'buff'),(h-2.2,h,'soot')]:
            vs=[];n=64
            for zz in [lo,hi]:
                for j in range(n):
                    t=math.tau*j/n;vs.append((x-zz*rake+rx*math.cos(t),y+ry*math.sin(t),z+zz))
            b.add(vs,[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],mat,True)
        # Open mouth, steel thickness, and a soot-lined interior—never a black cap disc.
        vs=[]
        for zz,delta in [(h,0),(h,.065),(h-2.8,.065)]:
            for j in range(64):
                t=math.tau*j/64;vs.append((x-zz*rake+(rx-delta)*math.cos(t),y+(ry-delta)*math.sin(t),z+zz))
        fs=[]
        for k in range(2):
            for j in range(64):fs.append((k*64+j,k*64+(j+1)%64,(k+1)*64+(j+1)%64,(k+1)*64+j))
        b.add(vs,fs,'soot',True)
        for zz in [.20,h-2.2,h-.09]:
            pts=[(x-zz*rake+rx*math.cos(math.tau*j/64),y+ry*math.sin(math.tau*j/64),z+zz) for j in range(65)];b.tube(pts,.023,'iron',7)
        for side in [-1,1]:
            for dx in [-5.7,5.7]:
                top=(x-(h-1.8)*rake,y+side*ry*.8,z+h-1.8);bottom=(x+dx,side*5.3,14.68)
                b.cylinder(bottom,top,.012,'iron',7)
                b.cylinder(bottom,(bottom[0],bottom[1],bottom[2]+.16),.035,'steel',10)
        for dx in [-.25,.25]:b.cylinder((x+dx,ry+.10,z+.5),(x+dx-(h-.5)*rake,ry+.10,z+h-.35),.018,'iron',10)
        for i in range(40):
            zz=.6+i*.285;b.cylinder((x-.25-zz*rake,ry+.12,z+zz),(x+.25-zz*rake,ry+.12,z+zz),.012,'iron',8)
        b.cylinder((x+rx*.7,0,z+h-1),(x+rx*.7,0,z+h+.25),.085,'brass',20)
        b.finish()


def flag(b,x,y,z,width,height,star=False):
    n,m=14,8;vs=[]
    for i in range(n+1):
        u=i/n
        for j in range(m+1):
            v=j/m;vs.append((x-width*u,y+.15*math.sin(u*7-v*3)*u,z-height*v-.12*u*u))
    fs=[(i*(m+1)+j,(i+1)*(m+1)+j,(i+1)*(m+1)+j+1,i*(m+1)+j+1) for i in range(n) for j in range(m)]
    b.add(vs,fs,'red',True)
    if star:
        verts=[]
        for k in range(10):
            a=math.pi/2+math.pi*k/5;r=.30 if k%2==0 else .13
            u=.54+r*math.cos(a)/width;v=.5-r*math.sin(a)/height
            verts.append((x-width*u,y+.15*math.sin(u*7-v*3)*u-.012,z-height*v-.12*u*u))
        b.add(verts,[tuple(range(10))],'white')


def build_masts(mats,root):
    col=collection('11 · Exterior fittings');b=Batch('MASTS_RIGGING_AND_FLAGS',col,mats,root,{'category':'rigging','deck':'U','evidence':'E026'})
    for mi,m in enumerate(SPEC['masts']):
        x,z,h=m['x'],m['z'],m['height'];top=(x-h*.045,0,z+h)
        b.cylinder((x,0,z),top,.235,'buff',28,radius2=.055)
        b.cylinder((x-.04,0,z-.10),(x-.04,0,z+.18),.35,'iron',24)
        for fraction in [.35,.62,.80]:
            zz=h*fraction;xx=x-zz*.045;b.torus((xx,0,z+zz),.235-(.18*fraction),.023,'iron',(0,0,1),24,7)
        yard_z=z+h*.66;yard_x=x-h*.66*.045
        b.cylinder((yard_x,-4.4,yard_z),(yard_x,4.4,yard_z),.065,'buff',20,radius2=.04)
        for sy in [-1,1]:
            b.cylinder(top,(yard_x,sy*4.4,yard_z),.009,'iron',6)
            for off in [-2.0,2.0]:
                bx=x+off;by=sy*min(6.7,half_breadth(bx,11.95)-.5);bz=weather_z(bx,by)
                mid=(x-h*.61*.045,0,z+h*.61)
                b.cylinder((bx,by,bz),mid,.014,'iron',7)
                b.cylinder((bx,by,bz),(bx,by,bz+.34),.026,'steel',10)
            # Ratlines connect the actual converging shrouds.
            for k in range(1,35):
                t=k/36;zz=z+h*.60*t;yy=sy*min(6.7,half_breadth(x,11.95)-.5)*(1-t)
                bx=x-h*.61*.045*t
                b.cylinder((bx-2*(1-t),yy,zz),(bx+2*(1-t),yy,zz),.006,'rope',5)
        for end in ([83,37] if mi==0 else ([-14,-59] if mi==1 else [-44,-85])):
            b.cylinder(top,(end,0,weather_z(end)),.012,'iron',7)
        if mi==1:
            gaff=(x-h*.85*.045-4.3,0,z+h*.85+2.0)
            b.cylinder((x-h*.85*.045,0,z+h*.85),gaff,.045,'buff',14,radius2=.028)
            b.cylinder(top,gaff,.008,'rope',6);flag(b,*gaff,2.0,1.05,True)
    b.cylinder((-85.5,0,12.8),(-86.3,0,17.3),.04,'buff',16,radius2=.025)
    flag(b,-86.2,0,17.1,1.8,1.0)
    b.finish()


def build_deckhouses(mats,root,layout):
    col=collection('11 · Exterior fittings')
    skin=Batch('CENTRAL_DECKHOUSE_CLADDING',col,mats,root,{'category':'superstructure','deck':'U','evidence':'E017;E026'})
    # Open side promenades beneath the long boat platform.
    for side in [-1,1]:
        y=side*5.755
        openings=[]
        for l in layout['connections']:
            if l['kind']=='door' and 'U-WEATHER' in [l['a'],l['b']] and abs(l['point'][1]-side*5.7)<.12:
                openings.append((l['point'][0]-l['width']/2-.05,l['point'][0]+l['width']/2+.05,0,2.05))
        for s in layout['spaces']:
            if s['deck']=='U' and s['type'] in {'upper_cabin','crew_cabin','smoking'} and (s.get('side',side)==side):
                a=min(p[0] for p in s['polygon']);b=max(p[0] for p in s['polygon'])
                xx=min(b-.43,(a+b)/2+.86)
                if b-a>2.4:openings.append((xx-.28,xx+.28,1.12,2.02))
        bounds=sorted(set([-39,36.2]+[max(-39,min(36.2,v)) for o in openings for v in o[:2]]))
        for a,b in zip(bounds,bounds[1:]):
            if b-a<.001:continue
            xx=(a+b)/2;cuts=[(lo,hi) for oa,ob,lo,hi in openings if oa<xx<ob]
            intervals=[(0,2.65)]
            for lo,hi in cuts:
                nxt=[]
                for u,v in intervals:
                    if u<lo:nxt.append((u,min(v,lo)))
                    if v>hi:nxt.append((max(u,hi),v))
                intervals=nxt
            for lo,hi in intervals:
                if hi>lo:skin.box((xx,y,11.95+(lo+hi)/2),(b-a,.055,hi-lo),'white',.005)
        for oa,ob,lo,hi in openings:
            if lo>0:
                for xx in [oa,ob]:skin.box((xx,y+side*.035,11.95+(lo+hi)/2),(.045,.06,hi-lo+.08),'mahogany',.006)
                for zz in [lo,hi]:skin.box(((oa+ob)/2,y+side*.04,11.95+zz),(ob-oa+.08,.06,.045),'mahogany',.006)
                skin.box(((oa+ob)/2,y-side*.012,11.95+(lo+hi)/2),(ob-oa,.018,hi-lo),'glass')
        for xx in [-38.5+i*2.45 for i in range(31)]:
            if xx>36:continue
            zz=weather_z(xx,side*8.2)
            skin.cylinder((xx,side*8.22,zz),(xx,side*8.22,14.60),.04,'white',12)
            skin.box((xx,side*8.22,14.47),(.30,.18,.14),'white',.02)
        skin.box((-1.4,side*8.32,14.60),(75.2,.16,.24),'white',.015)
    roof=Batch('BOAT_PLATFORM_ROOF',col,mats,root,{'category':'boat_deck','deck':'P'})
    holes=[[(.6,-3.3),(10.6,-3.3),(10.6,3.3),(.6,3.3)]]
    roof.slab([(-39,-8.4),(36.2,-8.4),(36.2,8.4),(-39,8.4)],14.61,.12,'teak',holes)
    roof.finish();skin.finish()
    # Broadside railings, foredeck and afterdeck curves follow the actual sheer.
    rails=Batch('EXTERIOR_RAILINGS',col,mats,root,{'category':'railings','deck':'U'})
    for side in [-1,1]:
        pts=[]
        for i in range(108):
            xx=-85.5+i*171/107;yy=side*(half_breadth(xx,11.95)-.10);pts.append((xx,yy,weather_z(xx,yy)))
        rail(rails,pts)
        rail(rails,[(-39+i*75.2/46,side*8.3,14.62) for i in range(47)],.95)
    rail(rails,[(36.4,-8.4+i*1.4,14.63) for i in range(13)])
    rails.finish()


def build_foredeck(mats,root):
    col=collection('11 · Exterior fittings');b=Batch('ANCHOR_HANDLING_AND_DECK_FITTINGS',col,mats,root,{'category':'deck_fittings','deck':'U','evidence':'E026'})
    x=76;z=weather_z(x)
    b.box((x,0,z+.14),(2.6,3.6,.25),'iron',.06)
    b.cylinder((x,-2.05,z+.75),(x,2.05,z+.75),.22,'steel',24)
    for y in [-1.25,1.25]:
        b.cylinder((x,y-.32,z+.75),(x,y+.32,z+.75),.43,'iron',28)
        for yy in [y-.32,y+.32]:b.cylinder((x,yy-.04,z+.75),(x,yy+.04,z+.75),.55,'iron',28)
        for k in range(14):
            a=math.tau*k/14;b.box((x+.54*math.cos(a),y,z+.75+.54*math.sin(a)),(.12,.68,.13),'steel',.015)
        # Alternating elliptical links lead to the hawse; each is an actual object section.
        for j in range(28):
            xx=x+j*.20;yy=y+(1 if y>0 else -1)*j*.045;zz=weather_z(min(xx,82),yy)+.10
            b.torus((xx,yy,zz),.105,.027,'iron',(0,0,1) if j%2==0 else (0,1,0),14,6)
    for xx in [65,-72,-80]:
        zz=weather_z(xx)
        b.profile((xx,0,zz),[(0,.55),(.12,.55),(.20,.34),(.65,.32),(.8,.5),(.92,.51)],'iron',28)
        for a in range(8):
            t=math.tau*a/8;b.cylinder((xx+.29*math.cos(t),.29*math.sin(t),zz+.65),(xx+.48*math.cos(t),.48*math.sin(t),zz+.78),.04,'brass',10)
    for xx in [-79,-65,44,63,79]:
        for side in [-1,1]:
            yy=side*(half_breadth(xx,11.95)-.65);zz=weather_z(xx,yy)
            b.box((xx,yy,zz+.07),(1.0,.55,.14),'iron',.03)
            for dx in [-.29,.29]:
                b.cylinder((xx+dx,yy,zz+.12),(xx+dx,yy,zz+.67),.12,'iron',18)
                b.cylinder((xx+dx,yy,zz+.62),(xx+dx,yy,zz+.71),.16,'iron',18)
            pts=[(xx+1+.035*i*math.cos(i*.55),yy+.035*i*math.sin(i*.55),zz+.02) for i in range(30)];b.tube(pts,.018,'rope',7)
    for xx in [43,-68,-29]:
        zz=weather_z(xx)
        b.box((xx,0,zz+.19),(3.4,3.0,.38),'white',.03)
        for side in [-1,1]:
            vs=[(xx-1.6,0,zz+1.1),(xx+1.6,0,zz+1.1),(xx+1.6,side*1.4,zz+.4),(xx-1.6,side*1.4,zz+.4)]
            b.add(vs,[(0,1,2,3)],'glass')
            for i in range(6):
                xx1=xx-1.6+i*.64;b.cylinder((xx1,0,zz+1.12),(xx1,side*1.4,zz+.42),.025,'white',10)
        b.cylinder((xx-1.7,0,zz+1.12),(xx+1.7,0,zz+1.12),.04,'white',12)
    for xx in [-63,-43,-25,-15,4,16,30,49,61]:
        for side in [-1,1]:ventilator(b,xx,side*(4.2 if xx<40 else 3.1),weather_z(xx),1.6 if xx>40 else 2.15,.20,side)
    # Anchors: forged shank, crown, stock and flukes mounted against the bows.
    for side in [-1,1]:
        xx=81;yy=side*(half_breadth(xx,10.2)+.15);zz=9.1
        b.cylinder((xx,yy,zz-.75),(xx-.25,yy,zz+1.45),.065,'iron',14)
        b.torus((xx-.25,yy,zz+1.6),.16,.035,'iron',(0,1,0),18,7)
        b.cylinder((xx-.2,yy-.7,zz+.95),(xx-.2,yy+.7,zz+.95),.07,'iron',14)
        for s in [-1,1]:
            b.cylinder((xx,yy,zz-.75),(xx+s*.65,yy,zz-.25),.07,'iron',14)
            b.add([(xx+s*.45,yy-.13,zz-.45),(xx+s*.85,yy-.13,zz+.03),(xx+s*.85,yy+.13,zz+.03),(xx+s*.45,yy+.13,zz-.45)],[(0,1,2,3)],'iron')
    b.finish()


def build_bridge(mats,root):
    col=collection('11 · Exterior fittings');b=Batch('BRIDGE_NAVIGATION_FITTINGS',col,mats,root,{'category':'bridge','deck':'P'})
    for yy in [-7,-4,4,7]:
        b.box((35.8,yy,15.05),(.08,2.6,.86),'mahogany',.015)
    # Binnacle with hood, gimbal and compass bowl.
    b.profile((34.8,0,14.63),[(0,.23),(.10,.25),(.17,.14),(.95,.13),(1.02,.25),(1.15,.27)],'brass',28)
    b.cylinder((34.8,0,15.77),(34.8,0,15.79),.235,'glass',28)
    b.torus((34.8,0,15.79),.24,.018,'brass',(0,0,1),28,8)
    # Telegraph pedestals and scale faces, with a separate moving handle.
    for yy in [-2.2,2.2]:
        b.profile((34,yy,14.63),[(0,.19),(.08,.20),(.14,.08),(1.0,.07),(1.10,.17)],'brass',24)
        b.cylinder((34,yy-.06,15.85),(34,yy+.06,15.85),.25,'brass',32)
        b.cylinder((34,yy-.065,15.85),(34,yy-.07,15.85),.225,'porcelain',32)
        for i in range(9):
            a=-math.pi*.75+i*math.pi*1.5/8;b.cylinder((34+.18*math.sin(a),yy-.078,15.85+.18*math.cos(a)),(34+.21*math.sin(a),yy-.078,15.85+.21*math.cos(a)),.005,'iron',6)
        label('Telegraph STOP '+str(yy),'STOP',(34,yy-.08,15.97),.045,mats['iron'],col,(math.pi/2,0,0),root)
    b.finish()
    helm=empty('HELM_WHEEL',col,(33.5,0,15.67),root,category='helm',deck='P')
    wh=Batch('HELM_WHEEL_JOINERY',col,mats,helm,{'category':'helm_wheel','deck':'P'})
    wh.torus((0,0,0),.48,.032,'mahogany',(0,1,0),40,10)
    wh.cylinder((0,-.10,0),(0,.10,0),.10,'brass',24)
    for i in range(8):
        a=math.tau*i/8;wh.cylinder((0,0,0),(.57*math.cos(a),0,.57*math.sin(a)),.018,'mahogany',12)
        wh.cylinder((.48*math.cos(a),0,.48*math.sin(a)),(.59*math.cos(a),0,.59*math.sin(a)),.026,'mahogany',12)
    wh.finish()
    for side in [-1,1]:
        x=80.8;z=11.55;yy=side*(half_breadth(x,z)+.055)
        label('TEUTONIC bow '+str(side),'TEUTONIC',(x,yy,z),.32,mats['cream'],col,(-side*math.pi/2,0,0),root)
    label('TEUTONIC stern','TEUTONIC',(-87.05,0,12.16),.36,mats['cream'],col,(math.pi/2,0,-math.pi/2),root)
    label('Liverpool stern','LIVERPOOL',(-86.75,0,11.55),.17,mats['cream'],col,(math.pi/2,0,-math.pi/2),root)


def build_exterior(mats,root,layout):
    build_deckhouses(mats,root,layout);build_funnels(mats,root);build_masts(mats,root)
    for i,x in enumerate([-31,-21,-11,-1,9,19,29]):
        lifeboat(mats,root,i*2+1,x,7.0,14.95);lifeboat(mats,root,i*2+2,x,-7.0,14.95)
    build_foredeck(mats,root);build_bridge(mats,root)
