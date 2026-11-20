#!/usr/bin/env python3
"""Build traceable spatial coverage from explicit, approximate plan partitions.

No count target drives this generator. Cabin banks follow the actual two-deep
arrangement, with transverse vestibules. IDs other than upper E–W are our IDs,
not invented archival cabin numbers. All metric boundaries remain inferred.
"""
from __future__ import annotations
import csv
import json
import sys
from pathlib import Path
from shapely.geometry import Polygon

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from source.ship.geometry import SPEC, rectangle, clamp_to_hull, polygon_area, half_breadth

spaces=[]
links=[]
decks={d['id']:d for d in SPEC['decks']}


def add(sid,name,deck,poly,kind,ev='E017',confidence='LOW',holes=None,height=None,notes='',parent=None):
    z=decks[deck]['z']
    poly=clamp_to_hull(poly,z if deck not in ['P','U'] else 11.95)
    shape=Polygon(poly,holes or []).buffer(0)
    if shape.is_empty or shape.geom_type!='Polygon':
        raise ValueError(f'{sid}: disconnected or empty spatial footprint')
    poly=[list(p) for p in list(shape.exterior.coords)[:-1]]
    holes=[[list(p) for p in list(r.coords)[:-1]] for r in shape.interiors]
    standing=shape.representative_point()
    xs,ys=zip(*poly)
    s={'id':sid,'name':name,'deck':deck,'type':kind,'polygon':poly,'holes':holes or [],'z':z,
       'height':height or decks[deck]['height']-.12,'center':[round((min(xs)+max(xs))/2,4),round((min(ys)+max(ys))/2,4),z],
       'dimensions':[round(max(xs)-min(xs),3),round(max(ys)-min(ys),3),height or decks[deck]['height']-.12],
       'area':round(polygon_area(poly)-sum(polygon_area(h) for h in (holes or [])),3),
       'evidence_ids':ev.split(';'),'evidence_type':'INFERRED','confidence':confidence,
       'state':'BLOCKOUT','access':[],'parent_space':parent,'standing_point':[standing.x,standing.y,z+1.65],
       'notes':notes or 'Region/type supported by cited plan; approximate boundaries/elevations inferred. Reconstruction ID, not archival cabin number.'}
    spaces.append(s)
    return s


def rect(sid,name,deck,x0,x1,y0,y1,kind,**kw):
    return add(sid,name,deck,rectangle(x0,x1,y0,y1),kind,**kw)


def get(sid):
    return next(s for s in spaces if s['id']==sid)


def connect(a,b,x,y,axis='x',width=.76,kind='door',other_point=None):
    za,zb=get(a)['z'],get(b)['z']
    ident=f'D-{len(links)+1:03d}' if kind=='door' else f'A-{len(links)+1:03d}'
    link={'id':ident,'a':a,'b':b,'point':[round(x,4),round(y,4),za],'other_point':other_point or [x,y,zb],
          'axis':axis,'width':width,'height':2.03,'kind':kind,'hinge':'start','max_angle':88,
          'evidence_type':'INFERRED','state':'BLOCKOUT','tested':False}
    links.append(link)
    get(a)['access'].append(b);get(b)['access'].append(a)
    return link


def bay_bank(prefix,label,deck,bounds,side,corridor,kind):
    # Four distinct cells share a narrow, genuinely connecting vestibule.
    # L-shaped outer cells preserve its head rather than overlapping its path.
    for i,(a,b) in enumerate(zip(bounds,bounds[1:]),1):
        mid=(a+b)/2;v0=mid-.43;v1=mid+.43
        mirror=lambda poly:[[x,side*y] for x,y in poly]
        vid=f'{prefix}-V{i:02d}'
        add(vid,f'{label} transverse entry {i:02d}',deck,mirror(rectangle(v0,v1,3.1,6.82)),'vestibule',ev='E019',confidence='MEDIUM')
        connect(vid,corridor,mid,side*3.1,'x',.82,'opening')
        cells=[
            ('AI',rectangle(a,v0,3.1,5.78),v0,4.22),
            ('BI',rectangle(v1,b,3.1,5.78),v1,4.22),
            ('AO',[[a,5.78],[v0,5.78],[v0,6.82],[mid,6.82],[mid,8.25],[a,8.25]],v0,6.27),
            ('BO',[[v1,5.78],[b,5.78],[b,8.25],[mid,8.25],[mid,6.82],[v1,6.82]],v1,6.27)
        ]
        for cell,poly,dx,dy in cells:
            sid=f'{prefix}-{i:02d}{cell}'
            s=add(sid,f'{label} cabin {i:02d}{cell}',deck,mirror(poly),kind,ev='E019' if kind=='first_cabin' else 'E017;E020',confidence='MEDIUM')
            s['berths']=1 if kind=='first_cabin' and cell.endswith('O') and i%3==0 else 2
            s['outboard']=cell.endswith('O');s['side']=side
            s['furniture_variant']=(i*3+len(cell)+(0 if side>0 else 2))%5
            connect(sid,vid,dx,side*dy,'y',.72)


# MAIN: port/starboard fore cabin banks and real longitudinal passages.
for side,code,label in [(1,'P','Port'),(-1,'S','Starboard')]:
    rect(f'M-FWD-{code}-PASS',f'{label} first-class forward passage','M',16.9,53.2,min(side*2,side*3.1),max(side*2,side*3.1),'corridor',confidence='MEDIUM')
    bay_bank(f'M-FC-{code}',f'{label} forward first-class','M',[17.2,21.9,26.9,32.1,37.2,42.3,47.7,53.2],side,f'M-FWD-{code}-PASS','first_cabin')
    rect(f'M-MID-{code}-PASS',f'{label} machinery-side passage','M',-34,-4,min(side*4.15,side*5.3),max(side*4.15,side*5.3),'corridor')
    for i,(a,b) in enumerate(zip([-18.5,-15.6,-12.7,-9.8,-6.9],[-15.6,-12.7,-9.8,-6.9,-4]),1):
        sid=f'M-FC-{code}-A{i:02d}'
        s=rect(sid,f'{label} aft first-class cabin {i:02d}','M',a,b,min(side*5.3,side*8.25),max(side*5.3,side*8.25),'first_cabin',ev='E017',confidence='MEDIUM')
        s.update(berths=2,outboard=True,side=side,furniture_variant=i%4)
        connect(sid,f'M-MID-{code}-PASS',(a+b)/2,side*5.3,'x')
    rect(f'M-AFT-{code}-PASS',f'{label} second-class passage','M',-61.5,-37.6,min(side*2,side*3.1),max(side*2,side*3.1),'corridor',confidence='MEDIUM')
    bay_bank(f'M-SC-{code}',f'{label} second-class','M',[-61.5,-56.8,-52.2,-47.4,-42.5,-37.6],side,f'M-AFT-{code}-PASS','second_cabin')
    rect(f'M-ENG-{code}-LOBBY',f'{label} after machinery lobby','M',-37.6,-34,min(side*2,side*5.3),max(side*2,side*5.3),'lobby')
    connect(f'M-ENG-{code}-LOBBY',f'M-AFT-{code}-PASS',-37.6,side*2.55,'y',1.0,'opening')
    connect(f'M-ENG-{code}-LOBBY',f'M-MID-{code}-PASS',-34,side*4.725,'y',1.0,'opening')
    bounds=[-61.5,-58.8,-56.0,-53.3,-50.6,-47.8]
    for i,(a,b) in enumerate(zip(bounds,bounds[1:]),1):
        sid=f'M-SC-{code}-C{i:02d}'
        s=rect(sid,f'{label} inboard second-class cabin {i:02d}','M',a,b,min(side*.12,side*2),max(side*.12,side*2),'second_cabin',ev='E017;E020',confidence='LOW')
        s.update(berths=2,outboard=False,side=side,furniture_variant=i%3)
        connect(sid,f'M-AFT-{code}-PASS',(a+b)/2,side*2,'x')

saloon_holes=[rectangle(13.2,16.9,-2,2),rectangle(-4,-.2,-1.65,1.65)]
rect('M-SALOON','First-class dining saloon','M',-4,16.9,-7.95,7.95,'dining',ev='E017;E023',confidence='MEDIUM',holes=saloon_holes,height=5.25)
rect('M-FWD-STAIR','Forward first-class stair lobby','M',13.2,18.1,-2,2,'stair',ev='E017;E024')
rect('M-AFT-STAIR','Aft saloon service stair lobby','M',-4,-.2,-1.65,1.65,'stair',ev='E017;E024')
connect('M-SALOON','M-FWD-STAIR',13.2,0,'y',1.35,'opening')
connect('M-SALOON','M-AFT-STAIR',-.2,0,'y',1.1,'opening')
for side,code in [(1,'P'),(-1,'S')]:
    connect('M-SALOON',f'M-FWD-{code}-PASS',16.9,side*2.55,'y',.95)
    connect('M-SALOON',f'M-MID-{code}-PASS',-4,side*4.725,'y',.95)
    connect('M-FWD-STAIR',f'M-FWD-{code}-PASS',17.5,side*2,'x',.9,'opening')
    for i,(a,b,typ,name) in enumerate([(-34,-29,'crew_cabin','engine-room attendant quarters'),(-29,-24,'service','linen and steward service'),(-24,-18.5,'sanitary','lavatory and washroom')],1):
        sid=f'M-SERVICE-{code}-{i}'
        rect(sid,f'{code} {name}','M',a,b,min(side*5.3,side*8.25),max(side*5.3,side*8.25),typ,ev='E017',confidence='LOW')
        connect(sid,f'M-MID-{code}-PASS',(a+b)/2,side*5.3,'x')

rect('M-AFT-CROSS','Aft accommodation cross-passage','M',-64.4,-61.5,-3.1,3.1,'lobby')
rect('M-AFT-WALK','Aft emigrant gangway','M',-78,-64.4,-.95,.95,'corridor')
connect('M-AFT-CROSS','M-AFT-WALK',-64.4,0,'y',1.2,'opening')
rect('M-FORE-WALK','Forward emigrant gangway','M',53.2,78,-.95,.95,'corridor')
rect('M-FORE-CROSS','Forward class cross-passage','M',53.2,55,-3.1,3.1,'lobby',parent='M-FORE-WALK')
connect('M-FORE-CROSS','M-FORE-WALK',54.1,0,'x',1.4,'open_region')
for side,code,label in [(1,'P','Port'),(-1,'S','Starboard')]:
    connect('M-AFT-CROSS',f'M-AFT-{code}-PASS',-61.5,side*2.55,'y',1.0,'opening')
    connect('M-FORE-CROSS',f'M-FWD-{code}-PASS',53.2,side*2.55,'y',1.0,'opening')
    for sid,name,a,b,corr,typ in [(f'M-EM-A-{code}',f'{label} aft emigrant accommodation',-77,-64.4,'M-AFT-WALK','emigrant'),(f'M-EM-F-{code}',f'{label} forward emigrant accommodation',55,66.5,'M-FORE-WALK','emigrant'),(f'M-FORECASTLE-{code}',f'{label} forecastle crew berths',66.5,77,'M-FORE-WALK','crew_dorm')]:
        rect(sid,name,'M',a,b,min(side*.95,side*8),max(side*.95,side*8),typ)
        connect(sid,corr,(a+b)/2,side*.95,'x',.88)
rect('M-SC-STAIR','Second-class stair and hatch landing','M',-47.8,-42,-1.95,1.95,'stair',ev='E017;E020')
connect('M-SC-STAIR','M-AFT-P-PASS',-44.5,1.95,'x',.9,'opening')
connect('M-SC-STAIR','M-AFT-S-PASS',-44.5,-1.95,'x',.9,'opening')

# UPPER: continuous weather deck with deckhouse holes, plus named lettered rooms.
weather=[]
for x in [-86,-82,-74,-62,-45,-25,0,25,45,62,74,82,86]:weather.append([x,-8.55])
for x in reversed([-86,-82,-74,-62,-45,-25,0,25,45,62,74,82,86]):weather.append([x,8.55])
add('U-WEATHER','Continuous upper weather deck and promenades','U',weather,'weather',ev='E017;E026',confidence='MEDIUM',holes=[rectangle(-39,36.2,-5.7,5.7),rectangle(-60,-44,-5.5,5.5)])
rect('U-SC-DINING','Second-class dining saloon','U',-60,-44,-5.5,5.5,'second_dining',ev='E017;E020',confidence='MEDIUM',holes=[rectangle(-48,-44,-1.95,1.95)])
rect('U-SC-STAIR','Second-class upper landing','U',-48,-42,-1.95,1.95,'stair',ev='E017;E020',parent='U-WEATHER')
connect('U-SC-DINING','U-SC-STAIR',-48,0,'y',1.15,'opening')
connect('U-SC-STAIR','U-WEATHER',-42,0,'y',1.3,'open_region')
connect('M-SC-STAIR','U-SC-STAIR',-45,0,kind='stairs',width=1.25)
rect('U-SMOKING','First-class smoking saloon','U',-23.8,-16.5,-5.7,5.7,'smoking',ev='E017;E022',confidence='MEDIUM')
connect('U-SMOKING','U-WEATHER',-20.4,5.7,'x',1.05)
rect('U-ENGINE-LOBBY','Engine casing access and engineers mess','U',-39,-34,-5.7,5.7,'crew_mess',ev='E017;E010')
connect('U-ENGINE-LOBBY','U-WEATHER',-36.5,5.7,'x',1)
for side,code in [(1,'P'),(-1,'S')]:
    for i,(a,b) in enumerate([(-34,-29.5),(-29.5,-25)],1):
        sid=f'U-ENG-{code}-{i}'
        s=rect(sid,f'{code} engineer cabin {i}','U',a,b,min(side*3.3,side*5.7),max(side*3.3,side*5.7),'crew_cabin',ev='E017')
        s.update(berths=1,outboard=True,side=side,furniture_variant=i)
        connect(sid,'U-WEATHER',(a+b)/2,side*5.7,'x')
    for i,(a,b,name,typ) in enumerate([(-16.5,-10.4,'smoking saloon service pantry','pantry'),(-10.4,-4,'uptake-side lavatory and washroom','sanitary')],1):
        sid=f'U-SERVICE-{code}-{i}'
        rect(sid,f'{code} {name}','U',a,b,min(side*3.3,side*5.7),max(side*3.3,side*5.7),typ,ev='E017',confidence='LOW')
        connect(sid,'U-WEATHER',(a+b)/2,side*5.7,'x')

letters=[('E',-1.5,1.4,1),('F',1.4,4.3,1),('G',4.3,7.2,1),('H',7.2,10.1,1),('I',18.1,20.9,1),('J',20.9,23.7,1),('K',23.7,26.5,1),('L',26.5,31.5,1),('R',18.1,21.5,-1),('S',21.5,24.9,-1),('T',24.9,28.3,-1),('U',-1.5,2.5,-1),('V',2.5,6.3,-1),('W',6.3,10.1,-1)]
for letter,a,b,side in letters:
    sid='U-STATEROOM-'+letter
    s=rect(sid,f'Upper stateroom {letter}','U',a,b,min(side*3.3,side*5.7),max(side*3.3,side*5.7),'upper_cabin',ev='E018;E021',confidence='MEDIUM')
    s.update(berths=1,outboard=True,side=side,furniture_variant=ord(letter)%5,historical_label=letter)
    connect(sid,'U-WEATHER',(a+b)/2,side*5.7,'x')
for letter,a,b,lo,hi,wall in [('M',31.5,36.2,2.85,5.7,'side'),('N',31.5,36.2,0,2.85,'front'),('O',31.5,36.2,-2.85,0,'front'),('P',31.5,36.2,-5.7,-2.85,'side'),('Q',28.3,31.5,-5.7,-3.3,'side')]:
    sid='U-STATEROOM-'+letter
    s=rect(sid,f'Upper stateroom {letter}','U',a,b,lo,hi,'upper_cabin',ev='E018;E021',confidence='MEDIUM')
    side=1 if hi>0 else -1;s.update(berths=1,outboard=True,side=side,furniture_variant=ord(letter)%5,historical_label=letter)
    if wall=='side':connect(sid,'U-WEATHER',(a+b)/2,side*5.7,'x')
    else:connect(sid,'U-WEATHER',36.2,(lo+hi)/2,'y')
rect('U-FWD-STAIR','Forward grand-stair upper landing','U',13.2,18.1,-3.3,3.3,'stair',ev='E017;E024',holes=[rectangle(13.4,17.8,-1.8,1.8)])
rect('U-AFT-STAIR','Aft saloon upper landing','U',-4,-.2,-3.3,3.3,'stair',ev='E017;E024')
rect('U-SALOON-GALLERY','Saloon dome gallery','U',-.2,13.2,-3.3,3.3,'gallery',ev='E017;E023',holes=[rectangle(.8,10.1,-2.25,2.25)])
connect('U-SALOON-GALLERY','U-FWD-STAIR',13.2,0,'y',1.35,'opening')
connect('U-SALOON-GALLERY','U-AFT-STAIR',-.2,0,'y',1.1,'opening')
# Short cross-deck approaches are real open passage polygons, not invisible graph edges.
for side,code in [(1,'P'),(-1,'S')]:
    sid=f'U-FWD-CROSS-{code}'
    rect(sid,f'{code} forward stair promenade approach','U',10.1,18.1,min(side*3.3,side*5.7),max(side*3.3,side*5.7),'corridor')
    connect('U-FWD-STAIR',sid,15.6,side*3.3,'x',1.2,'opening')
    connect(sid,'U-WEATHER',15.6,side*5.7,'x',1.3,'opening')
    sid=f'U-AFT-CROSS-{code}'
    rect(sid,f'{code} aft stair promenade approach','U',-4,-1.5,min(side*3.3,side*5.7),max(side*3.3,side*5.7),'corridor')
    connect('U-AFT-STAIR',sid,-2.75,side*3.3,'x',1,'opening')
    connect(sid,'U-WEATHER',-2.75,side*5.7,'x',1,'opening')
connect('M-FWD-STAIR','U-FWD-STAIR',15.6,0,kind='stairs',width=1.25)
connect('M-AFT-STAIR','U-AFT-STAIR',-2.1,0,kind='stairs',width=1)
rect('U-STEERING','After steering-gear enclosure','U',-84,-78,-3.1,3.1,'steering',ev='E017;E015',parent='U-WEATHER')
connect('U-STEERING','U-WEATHER',-78,0,'y',1.0,'door')

# LOWER: single-depth first-class cells, real baggage/mail/specie and crew regions.
for side,code,label in [(1,'P','Port'),(-1,'S','Starboard')]:
    rect(f'L-FC-{code}-PASS',f'{label} lower first-class passage','L',13.2,41,min(side*3.5,side*4.7),max(side*3.5,side*4.7),'corridor')
    bounds=[14.4,17.0,19.6,22.2,24.8,27.5,30.2,32.9,35.6,38.3,41]
    for i,(a,b) in enumerate(zip(bounds,bounds[1:]),1):
        sid=f'L-FC-{code}-{i:02d}'
        s=rect(sid,f'{label} lower first-class cabin {i:02d}','L',a,b,min(side*4.7,side*8.1),max(side*4.7,side*8.1),'first_cabin',ev='E017',confidence='MEDIUM')
        s.update(berths=2,outboard=True,side=side,furniture_variant=i%5)
        connect(sid,f'L-FC-{code}-PASS',(a+b)/2,side*4.7,'x')
    rect(f'L-AFT-{code}-PASS',f'{label} stewards passage','L',-53.5,-34,min(side*1.8,side*3.1),max(side*1.8,side*3.1),'corridor')
    bounds=[-53.5,-51.1,-48.7,-46.3,-43.9,-41.5,-39.1,-36.7]
    for i,(a,b) in enumerate(zip(bounds,bounds[1:]),1):
        sid=f'L-STEWARD-{code}-{i:02d}'
        s=rect(sid,f'{label} steward cabin {i:02d}','L',a,b,min(side*3.1,side*7.9),max(side*3.1,side*7.9),'crew_cabin',ev='E017',confidence='MEDIUM')
        s.update(berths=2,outboard=True,side=side,furniture_variant=i%3)
        connect(sid,f'L-AFT-{code}-PASS',(a+b)/2,side*3.1,'x')
    sid=f'L-STEWARD-STORE-{code}'
    rect(sid,f'{label} stewards linen store','L',-36.7,-34,min(side*3.1,side*7.9),max(side*3.1,side*7.9),'store')
    connect(sid,f'L-AFT-{code}-PASS',-35.3,side*3.1,'x')
rect('L-FWD-STAIR','Lower forward first-class stair landing','L',13.2,19.4,-3.5,3.5,'stair',ev='E017;E024')
connect('L-FWD-STAIR','M-FWD-STAIR',15.6,0,kind='stairs',width=1.2)
for side,code in [(1,'P'),(-1,'S')]:connect('L-FWD-STAIR',f'L-FC-{code}-PASS',16.4,side*3.5,'x',1,'opening')
rect('L-BAGGAGE','Passenger baggage room','L',24.7,34,-3.5,3.5,'baggage',ev='E017',confidence='MEDIUM')
rect('L-MAIL','Mail room','L',34,41,.12,3.5,'mail',ev='E017',confidence='MEDIUM')
rect('L-SPECIE','Specie room','L',34,41,-3.5,-.12,'specie',ev='E017',confidence='MEDIUM')
connect('L-BAGGAGE','L-FC-P-PASS',29.2,3.5,'x',1)
connect('L-MAIL','L-FC-P-PASS',37.5,3.5,'x',.9)
connect('L-SPECIE','L-FC-S-PASS',37.5,-3.5,'x',.8)
rect('L-FWD-CROSS','Lower forward cargo lobby','L',41,43,-4.7,4.7,'lobby')
for side,code in [(1,'P'),(-1,'S')]:connect('L-FWD-CROSS',f'L-FC-{code}-PASS',41,side*4.1,'y',1,'opening')
rect('L-CARGO-WALK','Lower forward hatch passage','L',43,77,-.9,.9,'corridor')
connect('L-FWD-CROSS','L-CARGO-WALK',43,0,'y',1.1,'opening')
for i,(a,b,role) in enumerate([(43,53.4,'forward general cargo'),(53.4,66.5,'forward stores'),(66.5,77,'forepeak provisions')],1):
    for side,code in [(1,'P'),(-1,'S')]:
        sid=f'L-HOLD-{i}-{code}'
        rect(sid,f'{code} {role}','L',a,b,min(side*.9,side*7.8),max(side*.9,side*7.8),'cargo',ev='E017')
        connect(sid,'L-CARGO-WALK',(a+b)/2,side*.9,'x',1.1)
rect('L-AFT-CROSS','Lower aft stair lobby','L',-56,-53.5,-3.1,3.1,'lobby')
rect('L-AFT-WALK','Lower aft emigrant gangway','L',-76,-56,-.9,.9,'corridor')
connect('L-AFT-CROSS','L-AFT-WALK',-56,0,'y',1.1,'opening')
for side,code in [(1,'P'),(-1,'S')]:
    connect('L-AFT-CROSS',f'L-AFT-{code}-PASS',-53.5,side*2.45,'y',1,'opening')
    sid=f'L-EM-A-{code}'
    rect(sid,f'{code} lower aft emigrant dormitory','L',-75,-56,min(side*.9,side*7.5),max(side*.9,side*7.5),'emigrant',ev='E017',confidence='MEDIUM')
    connect(sid,'L-AFT-WALK',-64.5,side*.9,'x',.9)
# Service cross-passage over boiler crowns; inferred route expressly disclosed.
add('L-MACH-PASS','Lower machinery and firemen access passage','L',[[-18.5,-1.05],[-12.4,-1.05],[-12.4,2.8],[-6.8,2.8],[-6.8,-1.05],[13.2,-1.05],[13.2,1.05],[-5.7,1.05],[-5.7,3.9],[-13.5,3.9],[-13.5,1.05],[-18.5,1.05]],'corridor',ev='E017',notes='Inferred service route over boiler crowns with a real port-side detour around the aft uptake.')
for side,code in [(1,'P'),(-1,'S')]:
    rect(f'L-FIREMEN-{code}',f'{code} firemen quarters','L',-16.5,1.5,min(side*1.05,side*5.8),max(side*1.05,side*5.8),'crew_dorm',ev='E017',holes=[rectangle(-13.5 if side>0 else -12,-5.7 if side>0 else -7,min(side*1.05,side*(3.9 if side>0 else 2.4)),max(side*1.05,side*(3.9 if side>0 else 2.4)))])
    connect(f'L-FIREMEN-{code}','L-MACH-PASS',-3,side*1.05,'x',.88)
    rect(f'L-SERVICE-{code}',f'{code} boiler-top service and stores','L',1.5,13.2,min(side*1.05,side*5.8),max(side*1.05,side*5.8),'service',ev='E017')
    connect(f'L-SERVICE-{code}','L-MACH-PASS',7.2,side*1.05,'x',.9)
    for i,(a,b) in enumerate([(-18.5,-7),(-7,6),(6,13.2)],1):
        sid=f'L-COAL-{code}-{i}'
        rect(sid,f'{code} upper coal bunker {i}','L',a,b,min(side*5.8,side*8.15),max(side*5.8,side*8.15),'coal',ev='E017',notes='Upper bunker region inferred from coal labels; access is through service hatch, not passenger door.')
        target=f'L-FIREMEN-{code}' if i<3 else f'L-SERVICE-{code}'
        connect(sid,target,(max(a,-16.5)+b)/2,side*5.8,'x',.8,'hatch')
connect('L-MACH-PASS','L-FWD-STAIR',13.2,0,'y',1,'opening')
connect('L-MACH-PASS','M-AFT-STAIR',-2.1,0,kind='stairs',width=1)
connect('L-AFT-P-PASS','M-AFT-P-PASS',-44.5,2.45,kind='stairs',width=.9)
connect('L-CARGO-WALK','M-FORE-WALK',60,0,kind='stairs',width=.9)
connect('M-FORE-WALK','U-WEATHER',70,0,kind='stairs',width=1.1)
connect('M-AFT-WALK','U-WEATHER',-70,0,kind='stairs',width=1.1)

# Machinery tank-top volumes, not duplicate per-deck box rooms.
rect('T-ENGINE-P','Port main engine space','T',-34.3,-18.5,.12,8.0,'engine',ev='E008;E009;E010;E011',height=8.05)
rect('T-ENGINE-S','Starboard main engine space','T',-34.3,-18.5,-8,-.12,'engine',ev='E008;E009;E010;E011',height=8.05)
rect('T-BOILER-A','Aft boiler room and stokeholds','T',-18.5,6.5,-8.0,8.0,'boiler',ev='E006;E007',height=5.25)
rect('T-BOILER-F','Forward boiler room and stokeholds','T',6.5,30.5,-8.0,8.0,'boiler',ev='E006;E007',height=5.25)
connect('T-BOILER-A','T-BOILER-F',6.5,0,'y',1.0)
for side,code in [(1,'P'),(-1,'S')]:
    connect(f'T-ENGINE-{code}','T-BOILER-A',-18.5,side*4.6,'y',1.0)
    connect(f'T-ENGINE-{code}','U-ENGINE-LOBBY',-33.0,side*5.7,kind='winding_stairs',width=1.05,other_point=[-36.5,side*2.0,11.95])
    connect(f'T-ENGINE-{code}',f'L-AFT-{code}-PASS',-34.2,side*2.45,kind='stairs',width=.9)
    rect(f'T-THRUST-{code}',f'{code} thrust block and dynamo space','T',-41,-34.3,min(side*.12,side*6.8),max(side*.12,side*6.8),'dynamo',ev='E014',height=5.25)
    connect(f'T-THRUST-{code}',f'T-ENGINE-{code}',-34.3,side*4.6,'y',1.0)
    shaft_poly=[[-75,side*.12],[-41,side*.12],[-41,side*4],[-59,side*4],[-72,side*4],[-75,side*4]]
    add(f'O-SHAFT-{code}',f'{code} enclosed shaft and refrigeration chamber','O',shaft_poly,'shaft',ev='E014',notes='Enclosed structural shaft chamber; not a conventional walk-through alley. Outer shell and refrigeration details inferred.')
    connect(f'O-SHAFT-{code}',f'T-THRUST-{code}',-41,side*2.1,kind='stairs',width=.85)
    for i,(a,b) in enumerate([(-72,-59),(-59,-41)],1):
        sid=f'O-COLD-{code}-{i}'
        rect(sid,f'{code} refrigerated after store {i}','O',a,b,min(side*4,side*7.6),max(side*4,side*7.6),'cold_store',ev='E014',confidence='LOW')
        portal_y=side*(min(4,half_breadth(a,3.6)-.28)+min(4,half_breadth(b,3.6)-.28))/2
        connect(sid,f'O-SHAFT-{code}',(a+b)/2,portal_y,'x',.9)
rect('O-FORE-PASS','Orlop forward stores passage','O',30.5,75,-.85,.85,'corridor',ev='E025')
connect('O-FORE-PASS','T-BOILER-F',30.5,0,kind='stairs',width=1)
for i,(a,b) in enumerate([(30.5,41),(41,53.4),(53.4,66.5),(66.5,75)],1):
    for side,code in [(1,'P'),(-1,'S')]:
        sid=f'O-HOLD-{code}-{i}'
        rect(sid,f'{code} orlop cargo hold {i}','O',a,b,min(side*.85,side*7.5),max(side*.85,side*7.5),'cargo',ev='E025')
        connect(sid,'O-FORE-PASS',(a+b)/2,side*.85,'x',1,'hatch')
connect('O-FORE-PASS','L-CARGO-WALK',60,0,kind='stairs',width=.85)

# Partial roof rooms are provisional from the undated second-class reference.
rect('P-SC-LIBRARY','Second-class library (provisional)','P',-60,-52,-4.6,4.6,'library',ev='E020',confidence='LOW')
rect('P-SC-SMOKE','Second-class smoking room (provisional)','P',-52,-44,-4.6,4.6,'smoking',ev='E020',confidence='LOW')
connect('P-SC-LIBRARY','P-SC-SMOKE',-52,0,'y',.95)
connect('U-SC-STAIR','P-SC-SMOKE',-45,0,kind='stairs',width=1)
rect('P-WHEELHOUSE','Wheelhouse and navigation shelter','P',31.8,36.2,-3.2,3.2,'bridge',ev='E026',confidence='LOW')
connect('P-WHEELHOUSE','U-WEATHER',34.0,2.7,kind='stairs',width=1.0,other_point=[34,6.5,11.95])

# Inventory-backed assets, not completion percentages derived from polygon count.
assets=[]
for sid,name,category,count,ev in [
 ('HULL-SHELL','Lofted steel shell with openings','hull',1,'E027'),('HULL-FRAMES','Transverse frames and stringers','structure',1,'E027'),('HULL-BULKHEADS','Watertight division structure','structure',11,'E016'),
 ('EX-FUNNELS','Open raked funnel assemblies','exterior',2,'E026'),('EX-MASTS','Three masts with stays and rigging','exterior',3,'E026'),('EX-BOATS','Lifeboats and davit assemblies','exterior',14,'E026'),
 ('EX-ANCHORS','Anchor handling and foredeck equipment','exterior',1,'E026'),('EX-RAILS','Weather-deck rails and stanchions','exterior',1,'E026'),
 ('MECH-ENGINES','Twin triple-expansion assemblies','machinery',2,'E008'),('MECH-BOILERS','Twelve double and four single boilers','machinery',16,'E006'),
 ('MECH-CONDENSERS','Separate cylindrical condensers','machinery',2,'E011'),('MECH-PUMPS','Circulating and feed-pump assemblies','machinery',1,'E030'),
 ('MECH-SHAFTS','Overlapping screw shafts and chambers','machinery',2,'E014'),('MECH-PROPS','Three-bladed staggered screws','machinery',2,'E013'),('MECH-STEER','Paired steam steering machinery','machinery',1,'E015'),
 ('SYS-DOORS','Individual pivoted doors','interactions',sum(l['kind']=='door' for l in links),'E019'),('SYS-STATE','Pressure, throttle, shaft and rudder state','simulation',1,'E007'),
 ('ENV-OCEAN','Multiscale ocean and hull response approximation','environment',1,'E025'),('ENV-SMOKE','Load-coupled volumetric smoke approximation','environment',1,'E025')]:
    assets.append({'id':sid,'name':name,'category':category,'count':count,'evidence_id':ev,'state':'BLOCKOUT','function_tested':False,'visually_approved':False})

out=ROOT/'assets/data';out.mkdir(parents=True,exist_ok=True)
layout={'schema_version':1,'specification':SPEC,'spaces':spaces,'connections':links,'assets':assets,
        'disclaimer':'Metric boundaries are inferred. Region/class evidence is cited. Counts include actual circulation and service functions, not duplicated room boxes. No space is visually approved.'}
(out/'ship.json').write_text(json.dumps(layout,indent=2)+'\n')
fields=['id','name','deck','type','x_m','y_m','z_m','length_m','width_m','height_m','area_m2','access','evidence_ids','evidence_type','confidence','state','notes']
with (ROOT/'docs/space_inventory.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
    for s in spaces:
        w.writerow(dict(zip(fields,[s['id'],s['name'],s['deck'],s['type'],*s['center'],*s['dimensions'],s['area'],';'.join(s['access']),';'.join(s['evidence_ids']),s['evidence_type'],s['confidence'],s['state'],s['notes']])))
with (ROOT/'docs/asset_inventory.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=assets[0].keys());w.writeheader();w.writerows(assets)
print(f'{len(spaces)} spatial records; {len(links)} physical access records; {len(assets)} asset groups. All NOT COMPLETE.')
from collections import Counter
print('Deck counts:',dict(Counter(s['deck'] for s in spaces)))
print('Types:',dict(Counter(s['type'] for s in spaces)))
