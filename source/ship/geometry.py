"""Metre-scale hull and polygon utilities shared by model generation and tests."""
from __future__ import annotations
import json
import math
from pathlib import Path

SPEC = json.loads((Path(__file__).with_name('specification.json')).read_text())
HALF_LENGTH = SPEC['dimensions']['length_overall'] / 2
HALF_BEAM = SPEC['dimensions']['beam'] / 2


def interpolate(points, t):
    if t <= points[0][0]:
        return points[0][1]
    for (a, va), (b, vb) in zip(points, points[1:]):
        if t <= b:
            return va + (vb - va) * (t - a) / (b - a)
    return points[-1][1]


def sheer(x):
    t = x / HALF_LENGTH
    return 1.1 * max(0.0, t)**3 + .6 * max(0.0, -t)**3


def stem_limits(z):
    q = max(0, min(1, z / 11.95))
    stern = -80.0 - (HALF_LENGTH - 80.0) * q**2.5
    bow = 84.2 + (HALF_LENGTH - 84.2) * q
    return stern, bow


def half_breadth(x, z=11.95):
    aft, fore = stem_limits(z)
    u = (x - aft) / (fore - aft)
    if not 0 <= u <= 1:
        return 0.0
    w = interpolate(SPEC['hull']['station_fraction_halfbreadth'], u)
    vertical = interpolate(SPEC['hull']['section_height_halfbreadth'], max(0, min(1, z / 11.95)))
    return HALF_BEAM * w * vertical


def hull_point(u, z, side=1):
    aft, fore = stem_limits(z)
    x = aft + u * (fore - aft)
    return (x, side * half_breadth(x, z), z)


def polygon_area(poly):
    return abs(sum(x*y2-x2*y for (x,y),(x2,y2) in zip(poly,poly[1:]+poly[:1]))) / 2


def contains(poly, point):
    x, y = point
    odd = False
    for (ax,ay),(bx,by) in zip(poly,poly[1:]+poly[:1]):
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay) + ax:
            odd = not odd
    return odd


def edge_distance(poly, point):
    px, py = point
    best = math.inf
    for (ax,ay),(bx,by) in zip(poly,poly[1:]+poly[:1]):
        dx,dy=bx-ax,by-ay
        den=dx*dx+dy*dy
        t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/den)) if den else 0
        best=min(best, math.hypot(px-ax-t*dx,py-ay-t*dy))
    return best


def rectangle(x0,x1,y0,y1):
    return [[x0,y0],[x1,y0],[x1,y1],[x0,y1]]


def clamp_to_hull(poly, z, inset=.28):
    return [[round(x,4),round(max(-max(.1,half_breadth(x,z)-inset),min(max(.1,half_breadth(x,z)-inset),y)),4)] for x,y in poly]
