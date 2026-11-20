// SHIP2666 — Procedural hull geometry for RMS Teutonic (1889).
// Builds the outer hull shell by lofting cross-sections through hull stations,
// plus deck plates, an elliptical stern and a raked stem. All geometry is
// generated from source/ship/dimensions.js so the whole ship derives from one
// scale. Output: a Three.js Group with hull, decks, stern, stem.
//
// This is Pass A blockout geometry: dimensionally coherent, architecturally
// complete, deliberately simple. Later passes replace with plated/riveted
// production geometry.

import * as THREE from 'three';
import { dimensions, stationX } from '../ship/dimensions.js';

const { length, beam, depth, decks, stern } = dimensions;

// Half-breadth profile at a given station (0..1 along length) and deck level.
// Returns array of {x (half-breadth m), z (height m)} points describing one
// side of the section, from keel up to deck then inboard to centreline.
function sectionProfile(t) {
  // t = 0 at AP (aft), 1 at FP (forward)
  // Envelope: sheer (deck edge) height and half-breadth vary along length.
  const sheerHeight = 2.6 + 1.6 * Math.sin(Math.PI * t);        // higher at ends
  const sheerHB = 0.45 * beam * (1 - 0.35 * Math.pow(1 - t, 2)); // fuller amidships
  const bilgeTurnZ = 1.8;
  const bilgeTurnHB = 0.30 * beam;

  const pts = [];
  // Keel to bilge turn (centreline outboard)
  pts.push({ x: 0, z: 0.15 });                         // keel, centreline
  pts.push({ x: 0.05 * beam, z: 0.35 });               // bilge start
  pts.push({ x: bilgeTurnHB, z: bilgeTurnZ });         // bilge turn
  // Bilge turn up to sheer at side
  pts.push({ x: sheerHB, z: sheerHeight });
  // Sheel to deck edge / centreline closure at deck level
  pts.push({ x: sheerHB * 0.55, z: sheerHeight + 0.6 }); // deck edge rounding
  pts.push({ x: 0, z: sheerHeight + 0.9 });            // centreline at deck
  return pts;
}

// Build a closed cross-section loop (port + starboard) as XY points at a station.
function crossSection(t) {
  const half = sectionProfile(t);
  const loop = [];
  // Starboard side: keel up to centreline deck (already in half), then mirror port down.
  for (let i = 0; i < half.length; i++) {
    loop.push(new THREE.Vector2(half[i].x, half[i].z)); // +Y starboard
  }
  for (let i = half.length - 2; i >= 1; i--) {
    loop.push(new THREE.Vector2(-half[i].x, half[i].z)); // -Y port
  }
  // Close bottom at keel centre
  loop.push(new THREE.Vector2(0, half[0].z));
  return loop;
}

export function buildHull() {
  const group = new THREE.Group();
  group.name = 'Teutonic Hull';

  const n = dimensions.numStations;
  const stations = [];
  for (let i = 0; i < n; i++) {
    stations.push({ t: i / (n - 1), x: stationX(i, n), loop: crossSection(i / (n - 1)) });
  }

  // ---- Loft the outer hull shell through stations ----
  const hullShape = new THREE.Shape();
  // We'll build a Lathe-like loft: stack the section loops as cross-sections.
  // Use THREE.CurvePath is complex; instead generate vertices directly.
  const verts = [];
  const faces = [];
  const rings = stations.map(s => s.loop);
  const ringCount = rings.length;
  const segPerRing = rings[0].length;

  for (let r = 0; r < ringCount; r++) {
    for (let s = 0; s < segPerRing; s++) {
      const p = rings[r][s];
      // x = longitudinal station, y = transverse, z = height
      verts.push(stations[r].x, p.x, p.y);
    }
  }

  // Quads between adjacent rings
  for (let r = 0; r < ringCount - 1; r++) {
    for (let s = 0; s < segPerRing; s++) {
      const s2 = (s + 1) % segPerRing;
      const a = r * segPerRing + s;
      const b = a + 1;
      const c = (r + 1) * segPerRing + s2;
      const d = (r + 1) * segPerRing + s;
      faces.push(a, b, c, a, c, d);
    }
  }

  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  hullGeo.setIndex(faces);
  hullGeo.computeVertexNormals();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a, // steel grey, refined later in materials pass
    roughness: 0.55,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.name = 'hullShell';
  group.add(hull);

  // ---- Deck plates (horizontal slices at each deck elevation) ----
  for (const d of dimensions.deckElevations) {
    const deckGeo = new THREE.PlaneGeometry(length * 1.02, beam * 1.02);
    const deck = new THREE.Mesh(
      deckGeo,
      new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.7, metalness: 0.1 })
    );
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(length / 2, 0, d.z);
    deck.name = `deck_${d.name.replace(/\s+/g, '_')}`;
    group.add(deck);
  }

  // ---- Elliptical stern (aft closing) ----
  // Build a cap at X = 0 closing the hull, elliptical in YZ.
  const sternPts = [];
  const sternSegments = 24;
  const sternHB = 0.42 * beam;
  const sternTopZ = sheerHeightAt(0) + 0.9;
  const sternBottomZ = 0.15;
  for (let i = 0; i <= sternSegments; i++) {
    const ang = (Math.PI * i) / sternSegments; // 0..PI (bottom up around to top)
    // Ellipse: Y = sternHB * sin(ang), Z = mid + (height/2)*cos(ang) — only lower half closed
    const y = sternHB * Math.sin(ang);
    const z = sternBottomZ + (sternTopZ - sternBottomZ) * (1 - Math.cos(ang)) / 2;
    sternPts.push(new THREE.Vector2(y, z));
  }
  // Lathe-like stern cap: use the ring at first station extruded is not elliptical,
  // so build an elliptical cap mesh manually from the first ring's shape simplified.
  // Approximate: scale first station loop toward centreline to form a cap.
  const sternCapGeo = new THREE.BufferGeometry();
  const capVerts = [];
  const capFaces = [];
  const firstRing = rings[0];
  const centre = new THREE.Vector3(stations[0].x, 0, (sternBottomZ + sternTopZ) / 2);
  // Fan from centre to the first ring perimeter (ellipse-ish)
  for (let i = 0; i < firstRing.length; i++) {
    const p = firstRing[i];
    capVerts.push(centre.x, p.x, p.y);
  }
  capVerts.push(centre.x, centre.y, centre.z); // centre point index
  const centreIdx = firstRing.length;
  for (let i = 0; i < firstRing.length; i++) {
    const i2 = (i + 1) % firstRing.length;
    capFaces.push(i, i2, centreIdx);
  }
  sternCapGeo.setAttribute('position', new THREE.Float32BufferAttribute(capVerts, 3));
  sternCapGeo.setIndex(capFaces);
  sternCapGeo.computeVertexNormals();
  const sternCap = new THREE.Mesh(sternCapGeo, hullMat);
  sternCap.name = 'sternCap';
  group.add(sternCap);

  // ---- Raked stem (fore) ----
  // Extend the forward station upward/outward to form a raked bow.
  // Approximate by scaling last ring toward a fine stem line at X = length.
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.5, metalness: 0.4 });
  const lastRing = rings[ringCount - 1];
  const stemGeo = new THREE.BufferGeometry();
  const sVerts = [];
  const sFaces = [];
  const stemTipZ = sheerHeightAt(1) + 0.4;
  const stemBaseZ = 0.15;
  // Build a triangular stem profile lofted slightly; keep simple: quad strip at X=length
  // from waterline up to deck, centreline outboard.
  const stemSegments = 12;
  for (let s = 0; s <= stemSegments; s++) {
    const k = s / stemSegments;
    const z = stemBaseZ + (stemTipZ - stemBaseZ) * k;
    const hb = 0.08 * beam * (1 - k); // taper inboard going up (raked)
    // starboard and port at the forward face
    sVerts.push(length, hb, z);
    sVerts.push(length, -hb, z);
  }
  for (let s = 0; s < stemSegments; s++) {
    const base = s * 2;
    sFaces.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  stemGeo.setAttribute('position', new THREE.Float32BufferAttribute(sVerts, 3));
  stemGeo.setIndex(sFaces);
  stemGeo.computeVertexNormals();
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.name = 'stem';
  group.add(stem);

  // ---- Funnels (two, yellow buff) ----
  const funnelMat = new THREE.MeshStandardMaterial({
    color: 0xd4b46a, // buff / yellow funnel, White Star 1889
    roughness: 0.6,
    metalness: 0.15,
  });
  const funnelZ = dimensions.funnelBaseZ;
  const funnelRadius = 1.4;
  for (let f = 0; f < 2; f++) {
    const funnelGeo = new THREE.CylinderGeometry(funnelRadius, funnelRadius * 0.92, dimensions.funnelHeight, 16);
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    // Place funnels forward of midship, set apart (port/starboard) so saloon between.
    const fx = length * (0.42 + f * 0.18);
    const fy = (f === 0 ? -1 : 1) * (beam * 0.22);
    funnel.position.set(fx, fy, funnelZ);
    funnel.name = `funnel_${f + 1}`;
    group.add(funnel);
  }

  // ---- Masts (three, simple spars) ----
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.8, metalness: 0.05 });
  const mastX = [length * 0.12, length * 0.5, length * 0.82];
  const mastZ = dimensions.deckElevations[3].z; // boat deck
  mastX.forEach((mx, i) => {
    const mastGeo = new THREE.CylinderGeometry(0.22, 0.14, 16, 8);
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(mx, 0, mastZ);
    mast.rotation.x = Math.PI / 2;
    mast.name = `mast_${i + 1}`;
    group.add(mast);
  });

  return group;
}

// Sheer height helper (mirrors sectionProfile envelope) at t=0 or t=1.
function sheerHeightAt(t) {
  return 2.6 + 1.6 * Math.sin(Math.PI * t);
}
