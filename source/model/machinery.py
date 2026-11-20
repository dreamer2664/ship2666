"""Twin slider-crank engines, Scotch boilers, overlapping screws and steering.

Main-engine kinematics are constrained analytically. Rod length, stage pitch,
pipe routing, boiler grouping and small fittings remain documented inferences.
"""
import math
import bpy
from shapely.geometry import Point
from shapely.ops import triangulate
from .mesh import Batch, collection, empty, label, area_light
from source.ship.geometry import SPEC


def driver(ob,path,index,expression,master):
    curve=ob.driver_add(path,index);d=curve.driver;d.type='SCRIPTED';d.expression=expression
    var=d.variables.new();var.name='theta';var.type='SINGLE_PROP';var.targets[0].id=master;var.targets[0].data_path='rotation_euler[0]'


def flange(b,x,y,z,r,normal=(1,0,0),material='iron'):
    nx,ny,nz=normal
    a=(x-nx*.045,y-ny*.045,z-nz*.045);c=(x+nx*.045,y+ny*.045,z+nz*.045)
    b.cylinder(a,c,r,material,24)
    # Actual bolt-circle pattern, not randomly scattered rivets.
    for i in range(10):
        t=math.tau*i/10
        if abs(nx)>.5:dx,dy,dz=0,r*.80*math.cos(t),r*.80*math.sin(t)
        elif abs(ny)>.5:dx,dy,dz=r*.80*math.cos(t),0,r*.80*math.sin(t)
        else:dx,dy,dz=r*.80*math.cos(t),r*.80*math.sin(t),0
        b.cylinder((x+dx+nx*.04,y+dy+ny*.04,z+dz+nz*.04),(x+dx+nx*.075,y+dy+ny*.075,z+dz+nz*.075),.019,'steel',6)


def wheel(b,x,y,z,r=.18,normal=(1,0,0)):
    b.torus((x,y,z),r,.014,'red',normal,24,7)
    nx,ny,nz=normal
    for i in range(6):
        t=math.tau*i/6
        offset=(0,r*math.cos(t),r*math.sin(t)) if abs(nx)>.5 else (r*math.cos(t),0,r*math.sin(t))
        b.cylinder((x,y,z),(x+offset[0],y+offset[1],z+offset[2]),.008,'iron',6)
    b.cylinder((x-nx*.12,y-ny*.12,z-nz*.12),(x+nx*.04,y+ny*.04,z+nz*.04),.027,'brass',12)


def build_engines(mats,root):
    col=collection('07 · Engines and shafting')
    spec=SPEC['engines'];r=spec['stroke']/2;rod=spec['connecting_rod'];zc=SPEC['propellers']['z']
    for index,side in enumerate([1,-1]):
        tag='PORT' if side>0 else 'STARBOARD';sy=side*SPEC['propellers']['shaft_separation']/2
        sign=-1 if side>0 else 1
        master=empty('CRANK_'+tag,col,(0,sy,zc),root,category='crankshaft',engine=index,rotation_sign=sign,evidence='E008;E012',rpm=78.0)
        master.rotation_euler.x=0
        curve=master.driver_add('rotation_euler',0);curve.driver.expression=f'frame*{sign}*2*pi*78/(60*24)'
        crank=Batch('SHAFT_AND_CRANKS_'+tag,col,mats,master,{'category':'machinery','engine':index})
        fixed=Batch('ENGINE_FRAME_'+tag,col,mats,root,{'category':'machinery','engine':index,'evidence':'E009;E010'})
        fixed.box((-26.5,sy,1.18),(14.7,3.3,.32),'iron',.06)
        for xx in [-33,-31,-28,-25,-22,-20]:
            for yy in [-1.35,1.35]:
                fixed.box((xx,sy+yy,1.44),(.46,.48,.20),'iron',.02)
                for k in [-.13,.13]:fixed.cylinder((xx+k,sy+yy,1.5),(xx+k,sy+yy,1.67),.034,'steel',6)
        xs=spec['cylinder_x']
        # Journals stop at each crank throw; no impossible solid shaft through the connecting rod.
        limits=[-34.5]+[q for x in sorted(xs) for q in [x-.52,x+.52]]+[-19.34]
        for a,b in zip(limits[::2],limits[1::2]):crank.cylinder((a,0,0),(b,0,0),.24,'steel',24)
        px=SPEC['propellers']['port_x']-(SPEC['propellers']['starboard_aft_stagger'] if side<0 else 0)
        crank.cylinder((px+.25,0,0),(-34.5,0,0),.22,'steel',28)
        for xx in [-35.5,-42,-49,-56,-63,-70,-76]:
            fixed.box((xx,sy,zc-.48),(.7,.85,.55),'iron',.06)
            fixed.cylinder((xx-.3,sy,zc),(xx+.3,sy,zc),.34,'brass',24)
            for off in [-.31,.31]:fixed.cylinder((xx,sy+off,zc-.25),(xx,sy+off,zc+.25),.026,'steel',6)
        # Shaft bossings blend toward the shell. No invented external brackets.
        fixed.cylinder((-77,sy,zc),(px+.25,sy,zc),.48,'hull',28,radius2=.32,cap=False)
        for j,(cx,diameter) in enumerate(zip(xs,spec['cylinder_diameters'])):
            phase=j*math.tau/3
            # Capsule-shaped crank webs built in the crank's local YZ plane.
            for dx in [-.39,.39]:
                vs=[];outline=[]
                for k in range(9):
                    a=math.pi+k*math.pi/8;outline.append((.32*math.cos(a),.32*math.sin(a)))
                for k in range(9):
                    a=k*math.pi/8;outline.append((.32*math.cos(a),r+.32*math.sin(a)))
                for xx in [cx+dx-.09,cx+dx+.09]:
                    for y,z in outline:vs.append((xx,y*math.cos(phase)-z*math.sin(phase),y*math.sin(phase)+z*math.cos(phase)))
                n=len(outline);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
                faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n));crank.add(vs,faces,'steel')
            pin_y=-r*math.sin(phase);pin_z=r*math.cos(phase)
            crank.cylinder((cx-.2794,pin_y,pin_z),(cx+.2794,pin_y,pin_z),.2794,'steel',28)
            # Bearings and three-point steel frames are separate from moving parts.
            for xx in [cx-1.3,cx+1.3]:
                fixed.box((xx,sy,zc-.37),(.74,1.04,.72),'iron',.04)
                fixed.cylinder((xx-.40,sy,zc),(xx+.40,sy,zc),.36,'brass',24)
            cylbase=zc+rod+2.2-1.05;cylheight=2.1
            for outer in [-1,1]:
                for xx in [cx-1.15,cx+1.15]:
                    fixed.cylinder((xx,sy+outer*1.25,1.55),(cx+math.copysign(.20,xx-cx),sy+outer*(diameter*.32+.22),cylbase),.105,'iron',14)
            # Crosshead guide bars, not free-floating pistons.
            for yy in [-.37,.37]:
                fixed.box((cx,sy+yy,5.8),(.13,.13,2.55),'steel',.01)
                fixed.box((cx,sy+yy,4.50),(.28,.29,.18),'iron',.02)
                fixed.box((cx,sy+yy,7.05),(.28,.29,.18),'iron',.02)
            fixed.cylinder((cx,sy,cylbase),(cx,sy,cylbase+cylheight),diameter/2+.09,'iron',40)
            for zz in [cylbase,cylbase+cylheight]:
                fixed.cylinder((cx,sy,zz-.07),(cx,sy,zz+.07),diameter/2+.17,'iron',40)
                for k in range(20):
                    a=math.tau*k/20;rr=diameter/2+.13
                    fixed.cylinder((cx+rr*math.cos(a),sy+rr*math.sin(a),zz+.06),(cx+rr*math.cos(a),sy+rr*math.sin(a),zz+.12),.027,'steel',6)
            fixed.cylinder((cx,sy,cylbase+cylheight+.04),(cx,sy,cylbase+cylheight+.16),diameter*.42,'steel',32)
            if j>0:fixed.cylinder((cx,sy,cylbase+cylheight+.12),(cx,sy,cylbase+cylheight+.98),.065,'steel',16)
            # Piston and crosshead share one exact slider displacement.
            head=empty(f'CROSSHEAD_{tag}_{j}',col,(cx,sy,zc+r+rod),root,category='crosshead',engine=index,stage=j,crank_radius=r,rod_length=rod,crank_z=zc,shaft_y=sy,cylinder_x=cx,phase=phase)
            moving=Batch(head.name+' assembly',col,mats,head,{'category':'moving_machinery','engine':index,'stage':j})
            moving.box((0,0,0),(.52,.69,.23),'steel',.035)
            moving.cylinder((-.36,0,0),(.36,0,0),.13,'brass',20)
            moving.cylinder((0,0,.08),(0,0,2.2),.065,'steel',20)
            moving.cylinder((0,0,2.15),(0,0,2.26),diameter*.47,'steel',32)
            moving.finish()
            driver(head,'location',2,f'{zc}+{r}*cos(theta+{phase})+sqrt({rod*rod}-{r*r}*sin(theta+{phase})**2)',master)
            con=empty(f'CONROD_{tag}_{j}',col,(cx,sy,zc+r),root,category='connecting_rod',engine=index,stage=j,crank_radius=r,rod_length=rod,crank_z=zc,shaft_y=sy,cylinder_x=cx,phase=phase)
            rb=Batch(con.name+' forged rod',col,mats,con,{'category':'moving_machinery','engine':index,'stage':j})
            rb.cylinder((0,0,.10),(0,0,rod-.11),.095,'steel',18,radius2=.072)
            rb.torus((0,0,0),.30,.065,'steel',(1,0,0),24,10)
            rb.torus((0,0,rod),.14,.045,'steel',(1,0,0),20,8)
            for yy in [-.28,.28]:rb.cylinder((0,yy,-.16),(0,yy,.16),.026,'steel',6)
            rb.finish()
            driver(con,'location',1,f'{sy}-{r}*sin(theta+{phase})',master)
            driver(con,'location',2,f'{zc}+{r}*cos(theta+{phase})',master)
            driver(con,'rotation_euler',0,f'-asin({r/rod}*sin(theta+{phase}))',master)
            # Valve chests and a crank-referenced eccentric proxy. Not an engineering Stephenson solver.
            vy=sy+side*(diameter*.48+.32)
            fixed.cylinder((cx+.5,vy,cylbase+.2),(cx+.5,vy,cylbase+1.75),.22,'iron',24)
            fixed.box((cx+.5,vy,cylbase-.8),(.18,.18,1.5),'steel',.012)
            wheel(fixed,cx+.83,vy,cylbase-.1,.17)
            fixed.tube([(cx,sy,cylbase+1.5),(cx,vy,cylbase+1.5),(cx+.5,vy,cylbase+1.0)],.105,'copper',12)
            # Lubricators and drip trays at actual service height.
            fixed.box((cx+.65,sy+side*1.2,4.35),(.34,.18,.035),'steel',.006)
            fixed.cylinder((cx+.65,sy+side*1.2,4.38),(cx+.65,sy+side*1.2,4.57),.052,'brass',14)
        crank.finish()
        # Separate surface condenser and cooling/feed pump assemblies.
        cy=side*6.1
        fixed.cylinder((-29.4,cy,3.1),(-23.304,cy,3.1),1.0668,'brass',40)
        for xx in [-29.4,-23.304]:flange(fixed,xx,cy,3.1,1.11)
        for xx in [-28,-24.5]:fixed.box((xx,cy,1.55),(.45,1.7,.9),'iron',.03)
        fixed.tube([(-30.3,sy+side*1.4,8.4),(-30.3,cy,8.4),(-30.3,cy,4.4),(-29.4,cy,3.8)],.29,'copper',16)
        for xx in [-32.7,-20.1]:
            fixed.cylinder((xx,side*6.1,1.25),(xx,side*6.1,2.55),.32,'iron',24)
            fixed.cylinder((xx,side*6.1,2.5),(xx,side*6.1,3.3),.13,'brass',18)
            fixed.box((xx,side*6.1,1.16),(.9,.9,.2),'iron',.03)
            flange(fixed,xx,side*6.1,1.9,.39,normal=(0,1,0))
            wheel(fixed,xx+.4,side*6.1,2.5,.16)
        for zz in [4.25,9.55]:
            fixed.box((-26.4,side*4.9,zz),(15.3,1.05,.10),'iron')
            for i in range(61):fixed.box((-33.8+i*.245,side*4.9,zz+.06),(.035,1.05,.035),'steel')
            for xx in [-33.6,-31,-28.4,-25.8,-23.2,-20.6,-19.1]:fixed.cylinder((xx,side*5.4,zz),(xx,side*5.4,zz+1.05),.02,'iron',8)
            for hh in [.5,1.04]:fixed.cylinder((-33.8,side*5.4,zz+hh),(-18.9,side*5.4,zz+hh),.018,'brass',8)
        fixed.finish()
        prop=empty('PROPELLER_'+tag,col,(px,sy,zc),root,category='propeller',engine=index,rotation_sign=sign,evidence='E013')
        pb=Batch('PROPELLER_BLADES_'+tag,col,mats,prop,{'category':'propeller_blades','engine':index})
        pb.cylinder((-.48,0,0),(.42,0,0),.43,'bronze',36,radius2=.29)
        for blade in range(3):
            vs=[];nr,nc=17,10
            for layer in [-1,1]:
                for i in range(nr+1):
                    rr=.38+(SPEC['propellers']['diameter']/2-.38)*i/nr
                    q=i/nr;chord=.16+.92*math.sin(math.pi*q)**.7
                    twist=math.atan(SPEC['propellers']['pitch']/(math.tau*rr))*side
                    for j in range(nc+1):
                        c=(j/nc-.5)*chord;theta=blade*math.tau/3+.13*q+c*math.cos(twist)/rr
                        xx=c*math.sin(twist)+layer*.023*math.sin(math.pi*j/nc)+.09*q*q
                        vs.append((xx,rr*math.sin(theta),rr*math.cos(theta)))
            nn=(nr+1)*(nc+1);fs=[]
            for layer in range(2):
                for i in range(nr):
                    for j in range(nc):
                        a=layer*nn+i*(nc+1)+j;face=(a,a+nc+1,a+nc+2,a+1);fs.append(face if layer else tuple(reversed(face)))
            for i in range(nr):
                for j in [0,nc]:a=i*(nc+1)+j;b=(i+1)*(nc+1)+j;fs.append((a,b,b+nn,a+nn))
            pb.add(vs,fs,'bronze',True)
        pb.finish();driver(prop,'rotation_euler',0,'theta',master)
    for sy in [-5.5,5.5]:area_light('Engine inspection practical '+str(sy),(-24,sy,8.8),320,2.0,(1,.82,.63),col,(-27,0,4))


def boiler_face(batch,x,cy,cz,r,furnaces,direction):
    face=Point(0,0).buffer(r,resolution=32)
    centers=[-.98,0,.98] if furnaces==3 else [-.65,.65]
    for yy in centers:face=face.difference(Point(yy,-.70).buffer(.37,resolution=16))
    for tri in triangulate(face):
        if face.covers(tri):batch.add([(x,cy+y,cz+z) for y,z in list(tri.exterior.coords)[:3]],[(0,1,2)],'iron')
    for yy in centers:
        y=cy+yy;z=cz-.70
        batch.torus((x,y,z),.392,.052,'steel',(1,0,0),28,8)
        batch.cylinder((x,y,z),(x-direction*1.3,y,z),.35,'soot',24,cap=False)
        batch.cylinder((x-direction*1.25,y,z),(x-direction*1.28,y,z),.33,'red',24)
        for k in range(7):batch.cylinder((x-direction*.1,y-.28+k*.09,z-.22),(x-direction*1.10,y-.28+k*.09,z-.22),.016,'iron',8)
        # Door leaves are shown open on a side hinge, but are not labelled runtime-functional.
        batch.cylinder((x+direction*.12,y+.39,z-.22),(x+direction*.12,y+.39,z+.23),.026,'iron',12)
        batch.cylinder((x+direction*.16,y+.44,z),(x+direction*.23,y+.44,z),.33,'iron',24)
        batch.cylinder((x+direction*.26,y+.44,z),(x+direction*.30,y+.44,z),.055,'brass',12)
        batch.box((x+direction*.15,y,cz-1.55),(.18,.75,.32),'iron',.025)
    return len(centers)


def build_boilers(mats,root):
    col=collection('08 · Boilers and services');centers=[]
    for row,x in enumerate([-14.5,-5.5,13.0,22.0]):
        for y in [-5.1,0,5.1]:centers.append((x,y,5.7,'double',3 if len(centers)<8 else 2))
    for x in [2.8,28.0]:
        for y in [-4.3,4.3]:centers.append((x,y,3.0,'single',3))
    total=0
    for i,(x,y,length,kind,n) in enumerate(centers,1):
        z=3.20;r=2.075 if kind=='double' else 1.72
        b=Batch(f'BOILER_{i:02d}_{kind.upper()}',col,mats,root,{'category':'boiler','boiler_id':f'B{i:02d}','kind':kind,'furnaces_per_end':n,'evidence':'E006','status':'IN PRODUCTION'})
        b.cylinder((x-length/2,y,z),(x+length/2,y,z),r,'iron',48,cap=False)
        for direction in ([-1,1] if kind=='double' else [1]):total+=boiler_face(b,x+direction*length/2,y,z,r,n,direction)
        if kind=='single':b.cylinder((x-length/2,y,z),(x-length/2+.04,y,z),r,'iron',40)
        for xx in [x-length*.33,x,x+length*.33]:
            b.torus((xx,y,z),r+.006,.021,'steel',(1,0,0),48,6)
            for k in range(30):
                t=math.tau*k/30;yy=y+(r+.02)*math.cos(t);zz=z+(r+.02)*math.sin(t)
                b.cylinder((xx-.018,yy,zz),(xx+.018,yy,zz),.018,'steel',6)
        for xx in [x-length*.30,x+length*.30]:
            b.box((xx,y,1.2),(.5,2.7,.30),'iron',.03)
            for yy in [-1.15,1.15]:b.box((xx,y+yy,1.4),(.5,.28,.54),'iron',.02)
        b.cylinder((x,y,z+r-.1),(x,y,z+r+.65),.14,'copper',20)
        flange(b,x,y,z+r+.35,.24,(0,0,1));wheel(b,x+.3,y,z+r+.6,.18)
        b.tube([(x,y,z+r+.5),(x,y,z+r+.9),(x-1.0,y,z+r+.9)],.13,'copper',14)
        # Manhole, smoke box junction, drain and safety-valve pair.
        b.cylinder((x-.7,y,z+r-.05),(x-.7,y,z+r+.09),.29,'steel',24)
        for yy in [-.25,.25]:b.profile((x+.65,y+yy,z+r),[(0,.12),(.12,.12),(.15,.07),(.45,.07),(.48,.11)],'brass',16)
        b.cylinder((x+length/2+.03,y+.7,z+.8),(x+length/2+.10,y+.7,z+.8),.17,'brass',24)
        b.cylinder((x+length/2+.105,y+.7,z+.8),(x+length/2+.112,y+.7,z+.8),.145,'porcelain',24)
        b.cylinder((x+length/2+.12,y+.7,z+.8),(x+length/2+.12,y+.60,z+.87),.009,'iron',8)
        b.finish()
    pipes=Batch('MAIN_STEAM_AND_FEED',col,mats,root,{'category':'pipework','evidence':'E006;E030;E031'})
    for y in [-7.35,7.35]:
        pipes.cylinder((-18,y,5.85),(30,y,5.85),.16,'copper',20)
        pipes.cylinder((-18,y,1.75),(30,y,1.75),.09,'steel',16)
        for x in [-16,-7,2,11,20,29]:
            flange(pipes,x,y,5.85,.25)
            pipes.cylinder((x,y,5.5),(x,y,6.25),.07,'iron',12)
            pipes.torus((x,y,5.85),.18,.018,'iron',(1,0,0),16,6)
    for fx in [-9.6,22]:
        # Uptake trunks stop at the open funnels; exact flue internals remain unfinished.
        pipes.box((fx,0,8.4),(3.7,3.0,5.8),'soot',.07)
        for side in [-1,1]:
            pipes.cylinder((fx,side*2.6,5.85),(fx,side*2.6,11.7),.25,'iron',20)
            pipes.tube([(fx,side*2.6,6.0),(fx,side*6.8,6.0),(fx-2,side*6.8,5.85)],.17,'copper',16)
    pipes.finish()
    print('Boilers:',len(centers),'furnace mouths:',total,flush=True)
    area_light('Stokehold inspection practical',(-9.8,0,6.1),500,4,(1,.78,.51),col,(-9.8,0,2.5))


def build_steering(mats,root):
    col=collection('10 · Steering')
    x=SPEC['steering']['rudder_stock_x']
    rudder=empty('RUDDER',col,(x,0,3.0),root,category='rudder',evidence='E015',limit_degrees=SPEC['steering']['rudder_limit_degrees'])
    b=Batch('RUDDER_BLADE',col,mats,rudder,{'category':'rudder_blade'})
    outline=[(0,-2.9),(-1.35,-2.82),(-2.1,-2.2),(-2.6,-.2),(-2.45,1.7),(-1.7,3.9),(0,3.9)]
    vs=[(xx,side*.12,zz) for side in [-1,1] for xx,zz in outline];n=len(outline)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    b.add(vs,faces,'oxide');b.cylinder((0,0,-2.9),(0,0,9.65),.16,'steel',24)
    for zz in [-2,-.7,.6,1.9,3.2]:
        b.box((-1.0,0,zz),(1.9,.32,.10),'iron',.014)
    b.finish()
    fixed=Batch('STEERING_ENGINES_AND_QUADRANT',col,mats,root,{'category':'steering_gear','deck':'U','evidence':'E015'})
    fixed.cylinder((x,0,11.65),(x,0,12.18),1.45,'iron',48)
    fixed.cylinder((x,0,12.18),(x,0,12.32),1.55,'brass',48)
    for i in range(60):
        t=math.tau*i/60;fixed.box((x+1.56*math.cos(t),1.56*math.sin(t),12.24),(.11,.11,.16),'steel',.01)
    for side in [-1,1]:
        y=side*2.5;fixed.box((-80,y,12.12),(3.4,1.1,.20),'iron',.03)
        for xx in [-81,-79.7]:
            fixed.cylinder((xx,y,12.25),(xx,y,13.05),.27,'iron',24)
            fixed.cylinder((xx,y,13.02),(xx,y,13.15),.32,'steel',24)
            wheel(fixed,xx+.4,y,12.6,.18)
        fixed.cylinder((-82.0,y,12.4),(-78.8,y,12.4),.10,'steel',16)
        fixed.cylinder((-81.8,y,12.25),(-81.8,y,12.6),.60,'brass',32)
    fixed.finish()


def build_machinery(mats,root):
    build_engines(mats,root);build_boilers(mats,root);build_steering(mats,root)
