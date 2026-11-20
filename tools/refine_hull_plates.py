"""Refine hull plate courses: remove old plain strakes, add real plate boundaries."""
p = 'source/hull/hull.js'
s = open(p).read()

# 1) Remove the OLD plain strakes block entirely.
old_start = s.find("  // ---- Plate courses (strakes): raised ridges")
old_end = s.find("  // ---- Structural frames at stations -")
assert old_start != -1 and old_end != -1, "old strakes block not found"
s = s[:old_start] + s[old_end:]

# 2) Insert new plate-course code at the frames marker.
plate_code = r'''
  // ---- Plate courses with actual plate boundaries ----
  // Each strake divided into plates between adjacent hull stations (real plate courses,
  // not just raised ridges). Plate edges follow frame lines.
  const plateGeo = new THREE.BufferGeometry();
  const pv = [], pf = [];
  let pid = 0;
  const plateZs = [0.5, 1.6, sheerHeightAt(0.5), sheerHeightAt(0.5) + 0.9];
  plateZs.forEach((z) => {
    [-1, 1].forEach((side) => {
      const ring = [];
      for (let r = 0; r < ringCount; r++) {
        const t = stations[r].t;
        const hb = halfBreadthAt(t, z);
        pv.push(stations[r].x, side * hb, z);
        ring.push(pid++);
      }
      // plates between adjacent stations (quad strips)
      for (let r = 0; r < ringCount - 1; r++) {
        const a = ring[r], b = ring[r] + 1, c = ring[r + 1] + 1, d = ring[r + 1];
        pf.push(a, b, c, a, c, d);
      }
    });
  });
  plateGeo.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
  plateGeo.setIndex(pf);
  plateGeo.computeVertexNormals();
  const plates = new THREE.Mesh(plateGeo, strakeMat);
  plates.name = 'plateCourses';
  plates.castShadow = plates.receiveShadow = true;
  group.add(plates);

'''
marker = "  // ---- Structural frames at stations -"
assert marker in s, "marker not found after removal"
s = s.replace(marker, plate_code + marker, 1)

open(p, 'w').write(s)
print("plate courses refined")
