import csv
import json
import math
from collections import Counter
from pathlib import Path
import sys
import pytest
from shapely.geometry import Polygon, Point

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from source.ship.geometry import SPEC, half_breadth

DATA=json.loads((ROOT/'assets/data/ship.json').read_text())
SPACES={s['id']:s for s in DATA['spaces']}


def test_dimensional_conventions():
    assert SPEC['dimensions']['length_overall']==pytest.approx(582*.3048)
    assert SPEC['dimensions']['beam']==pytest.approx(57.8*.3048)
    assert SPEC['dimensions']['length_between_perpendiculars']<SPEC['dimensions']['length_overall']
    assert len(SPEC['hull']['bulkhead_x'])==11
    assert len(SPEC['masts'])==3 and len(SPEC['funnels'])==2


def test_inventory_is_traceable_not_self_approved():
    assert len(SPACES)==len(DATA['spaces'])
    assert len(SPACES)>=200
    with (ROOT/'references/evidence_ledger.csv').open() as f:evidence={r['evidence_id'] for r in csv.DictReader(f)}
    for s in SPACES.values():
        assert s['name'] and s['notes'] and s['access']
        assert s['evidence_type']=='INFERRED', 'Metric boundary confidence must not be promoted to archival fact'
        assert set(s['evidence_ids'])<=evidence
        assert s['state']!='VISUALLY APPROVED'
        assert s['confidence'] in {'HIGH','MEDIUM','LOW'}


def test_valid_polygons_and_standing_points():
    for s in SPACES.values():
        p=Polygon(s['polygon'],s['holes'])
        assert p.is_valid, s['id']
        assert p.area>1.0, s['id']
        assert p.area==pytest.approx(s['area'],abs=.0011)
        assert p.contains(Point(s['standing_point'][:2])),s['id']
        assert min(s['dimensions'])>0


def test_hull_envelope_at_space_floor():
    for s in SPACES.values():
        for x,y in s['polygon']:
            assert abs(y)<=max(.1,half_breadth(x,min(s['z'],11.95))-.28)+.002,s['id']


def test_all_spaces_graph_connected_and_links_reciprocal():
    seen=set();queue=['U-WEATHER']
    while queue:
        sid=queue.pop()
        if sid in seen:continue
        seen.add(sid);queue.extend(SPACES[sid]['access'])
    assert seen==set(SPACES)
    for s in SPACES.values():
        for other in s['access']:assert s['id'] in SPACES[other]['access']


def test_portals_are_on_or_inside_both_spatial_footprints():
    for link in DATA['connections']:
        for sid,pt in [(link['a'],link['point']),(link['b'],link['other_point'])]:
            s=SPACES[sid];p=Polygon(s['polygon'])
            assert p.buffer(.18).covers(Point(pt[:2])),f"{link['id']} {sid}: portal outside region"
        assert .7<=link['width']<=1.5
        assert 0<link['max_angle']<100


def test_same_deck_footprints_do_not_overlap_unless_explicitly_nested():
    spaces=list(SPACES.values());issues=[]
    for i,a in enumerate(spaces):
        pa=Polygon(a['polygon'],a['holes'])
        for b in spaces[i+1:]:
            if a['deck']!=b['deck']:continue
            if a['parent_space']==b['id'] or b['parent_space']==a['id']:continue
            pb=Polygon(b['polygon'],b['holes'])
            if pa.intersects(pb):
                area=pa.intersection(pb).area
                if area>.035:issues.append((a['id'],b['id'],round(area,3)))
    assert not issues,issues


def test_boilers_and_staggered_three_blade_screws():
    b=SPEC['boilers'];p=SPEC['propellers']
    assert b['double_ended']==12 and b['single_ended']==4 and b['furnaces_total']==76
    assert p['blades']==3
    assert p['diameter']-p['shaft_separation']==pytest.approx(p['overlap'])
    assert p['starboard_aft_stagger']==pytest.approx(6*.3048)
    assert SPEC['engines']['stroke']==pytest.approx(60*.0254)


def test_no_orphan_evidence_free_asset_group():
    assert len({a['id'] for a in DATA['assets']})==len(DATA['assets'])
    assert all(a['count']>0 and a['evidence_id'] for a in DATA['assets'])
