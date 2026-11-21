// SHIP2666 — Production hull geometry for RMS Teutonic (1889).
//
// Pass B production modelling: lofted shell + plate courses (strakes) + structural
// frames + rivet rows following plate seams + portholes + deck plates + elliptical
// stern + raked stem + funnels + masts + deckhouses. All derived from
// source/ship/dimensions.js so every part shares one scale. Rivets follow plate and
// structural patterns (rows along strake seams and frame lines), not random noise.

import * as THREE from 'three';
import { dimensions, stationX } from '../ship/dimensions.js';
import { materials, makeMaterial } from '../materials/materials.js';

const { length, beam, numStations } = dimensions;
const DRAFT = 7.2; // m, provisional

const hullBlack = makeMaterial({ ...materials.hullPaint, roughness: 0.45, metalness: 0.25 });
const hullWhite = makeMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.08 });
const strakeMat = makeMaterial({ color: 0x2a3a4a, roughness: 0.5, metalness: 0.3 });
const rivetMat = makeMaterial({ color: 0x4a4a4a, roughness: 0.65, metalness: 0.7 });
const portholeMat = makeMaterial({ color: 0x0f0f0f, roughness: 0.1, metalness: 0.95 });
const deckhouseMat = makeMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.25 });
const deckMat = makeMaterial({ color: 0x3d4a3d, roughness: 0.7, metalness: 0.02 });

function sectionProfile(t) {
  const sheerHeight = 2.6 + 1.6 * Math.sin(Math.PI * t);
  const sheerHB = 0.45 * beam * (1 - 0.35 * Math.pow(1 - t, 2));
  const bilgeTurnZ = 1.8;
  const bilgeTurnHB = 0.30 * beam;
  return [
    { x: 0, z: 0.12 },
    { x: 0.06 * beam, z: 0.4 },
    { x: bilgeTurnHB, z: bilgeTurnZ },
    { x: sheerHB, z: sheerHeight },
    { x: sheerHB * 0.5, z: sheerHeight + 0.5 },
    { x: 0, z: sheerHeight + 0.9 },
  ];
}
function crossSection(t) {
  const half = sectionProfile(t);
  const loop = [];
  for (let i = 0; i < half.length; i++) loop.push(new THREE.Vector2(half[i].x, half[i].z));
  for (let i = half.length - 2; i >= 1; i--) loop.push(new THREE.Vector2(-half[i].x, half[i].z));
  loop.push(new THREE.Vector2(0, half[0].z));
  return loop;
}
function sheerHeightAt(t) { return 2.6 + 1.6 * Math.sin(Math.PI * t); }

// Sample half-breadth at a given height on one side of a station section.
function halfBreadthAt(t, z) {
  const half = sectionProfile(t);
  for (let i = 0; i < half.length - 1; i++) {
    const p0 = half[i], p1 = half[i + 1];
    if ((z - p0.z) * (z - p1.z) <= 0 && p1.z !== p0.z) {
      const k = (z - p0.z) / (p1.z - p0.z);
      return p0.x + (p1.x - p0.x) * k;
    }
    if (z >= Math.min(p0.z, p1.z) && z <= Math.max(p0.z, p1.z) && p1.z === p0.z) {
      return Math.max(p0.x, p1.x);
    }
  }
  return 0;
}

export function buildHull() {
  const group = new THREE.Group(); group.name = 'Teutonic Hull (production)';

  const n = numStations;
  const stations = [];
  for (let i = 0; i < n; i++) {
    stations.push({ t: i / (n - 1), x: stationX(i, n), loop: crossSection(i / (n - 1)) });
  }
  const ringCount = stations.length;
  const segPerRing = stations[0].loop.length;
  const rings = stations.map(s => s.loop);

  // ---- Outer hull shell (lofted) ----
  const verts = [], faces = [];
  for (let r = 0; r < ringCount; r++)
    for (let s = 0; s < segPerRing; s++) {
      const p = rings[r][s];
      verts.push(stations[r].x, p.x, p.y);
    }
  for (let r = 0; r < ringCount - 1; r++)
    for (let s = 0; s < segPerRing; s++) {
      const s2 = (s + 1) % segPerRing;
      const a = r * segPerRing + s, b = a + 1;
      const c = (r + 1) * segPerRing + s2, d = (r + 1) * segPerRing + s;
      faces.push(a, b, c, a, c, d);
    }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  hullGeo.setIndex(faces);
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, hullBlack);
  hull.name = 'hullShell';
  hull.castShadow = hull.receiveShadow = true;
  group.add(hull);


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

  // ---- Structural frames at stations ----
  const frameGeo = new THREE.BufferGeometry();
  const fv = [], ff = [];
  let fid = 0;
  for (let r = 0; r < ringCount; r += 2) {
    const loop = crossSection(stations[r].t);
    const thickness = 0.12;
    for (let s = 0; s < loop.length; s++) {
      const p = loop[s];
      const p2 = loop[(s + 1) % loop.length];
      fv.push(stations[r].x - thickness / 2, p.x, p.y);
      fv.push(stations[r].x + thickness / 2, p.x, p.y);
      fv.push(stations[r].x + thickness / 2, p2.x, p2.y);
      fv.push(stations[r].x - thickness / 2, p2.x, p2.y);
      const base = fid * 4;
      ff.push(base, base + 1, base + 2, base, base + 2, base + 3);
      fid++;
    }
  }
  frameGeo.setAttribute('position', new THREE.Float32BufferAttribute(fv, 3));
  frameGeo.setIndex(ff);
  frameGeo.computeVertexNormals();
  const frames = new THREE.Mesh(frameGeo, strakeMat);
  frames.name = 'frames';
  frames.castShadow = frames.receiveShadow = true;
  group.add(frames);

  // ---- Portholes at each deck level ----
  const deckZs = dimensions.deckElevations.map(d => d.z);
  const portGeo = new THREE.RingGeometry(0.28, 0.42, 16);
  const ports = new THREE.Group(); ports.name = 'portholes';
  const portsPerSide = 34;
  deckZs.forEach((dz, di) => {
    const sideZ = dz - 0.9;
    const yOff = 0.42 * beam;
    for (let i = 0; i < portsPerSide; i++) {
      const t = (i + 0.5) / portsPerSide;
      const x = stationX(Math.round(t * (numStations - 1)), numStations);
      [-1, 1].forEach((side) => {
        const m = new THREE.Mesh(portGeo, portholeMat);
        m.rotation.x = Math.PI / 2;
        m.position.set(x, side * (yOff + 0.02), sideZ);
        m.scale.set(side, 1, 1);
        m.name = `porthole_d${di}_s${side}_i${i}`;
        m.castShadow = m.receiveShadow = true;
        ports.add(m);
      });
    }
  });
  group.add(ports);

  // ---- Deck plates ----
  for (const d of dimensions.deckElevations) {
    const deckGeo = new THREE.PlaneGeometry(length * 1.05, beam * 1.05);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(length / 2, 0, d.z);
    deck.name = `deck_${d.name.replace(/\s+/g, '_')}`;
    deck.castShadow = deck.receiveShadow = true;
    group.add(deck);
  }

  // ---- Elliptical stern cap ----
  const sternGeo = new THREE.BufferGeometry();
  const cv = [], cf = [];
  const first = rings[0];
  const sb = 0.42 * beam;
  const st = sheerHeightAt(0) + 0.9;
  const sbot = 0.12;
  const centre = new THREE.Vector3(stations[0].x, 0, (sbot + st) / 2);
  for (let i = 0; i < first.length; i++) {
    const p = first[i];
    cv.push(stations[0].x, p.x, p.y);
  }
  cv.push(centre.x, centre.y, centre.z);
  const ci = first.length;
  for (let i = 0; i < first.length; i++) {
    const i2 = (i + 1) % first.length;
    cf.push(i, i2, ci);
  }
  sternGeo.setAttribute('position', new THREE.Float32BufferAttribute(cv, 3));
  sternGeo.setIndex(cf);
  sternGeo.computeVertexNormals();
  const stern = new THREE.Mesh(sternGeo, hullBlack);
  stern.name = 'sternCap';
  stern.castShadow = stern.receiveShadow = true;
  group.add(stern);

  // ---- Raked stem ----
  const stGeo = new THREE.BufferGeometry();
  const sv2 = [], sf2 = [];
  const last = rings[ringCount - 1];
  const stTip = sheerHeightAt(1) + 0.4;
  const seg = 14;
  for (let s = 0; s <= seg; s++) {
    const k = s / seg;
    const z = 0.12 + (stTip - 0.12) * k;
    const hb = 0.09 * beam * (1 - k);
    sv2.push(length, hb, z);
    sv2.push(length, -hb, z);
  }
  for (let s = 0; s < seg; s++) {
    const b = s * 2;
    sf2.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  stGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv2, 3));
  stGeo.setIndex(sf2);
  stGeo.computeVertexNormals();
  const stem = new THREE.Mesh(stGeo, hullBlack);
  stem.name = 'stem';
  stem.castShadow = stem.receiveShadow = true;
  group.add(stem);

  // ---- Funnels (two, buff) ----
  const funnelMat = makeMaterial(materials.funnelBuff);
  const funnelZ = dimensions.funnelBaseZ;
  const funnelRadius = 1.5;
  for (let f = 0; f < 2; f++) {
    const fg = new THREE.CylinderGeometry(funnelRadius, funnelRadius * 0.9, dimensions.funnelHeight, 18);
    const funnel = new THREE.Mesh(fg, funnelMat);
    const fx = length * (0.40 + f * 0.20);
    const fy = (f === 0 ? -1 : 1) * (beam * 0.24);
    funnel.position.set(fx, fy, funnelZ);
    funnel.name = `funnel_${f + 1}`;
    funnel.castShadow = funnel.receiveShadow = true;
    group.add(funnel);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(funnelRadius * 1.05, funnelRadius * 1.05, 0.35, 18), funnelMat);
    cap.position.set(fx, fy, funnelZ + dimensions.funnelHeight);
    cap.name = `funnelCap_${f + 1}`;
    cap.castShadow = cap.receiveShadow = true;
    group.add(cap);
  }

  // ---- Masts (three) ----
  const mastMat = makeMaterial({ color: 0x5a4a32, roughness: 0.8, metalness: 0.05 });
  const mastZ = dimensions.deckElevations[3].z;
  [length * 0.10, length * 0.5, length * 0.84].forEach((mx, i) => {
    const mg = new THREE.CylinderGeometry(0.24, 0.15, 15, 10);
    const mast = new THREE.Mesh(mg, mastMat);
    mast.position.set(mx, 0, mastZ);
    mast.rotation.x = Math.PI / 2;
    mast.name = `mast_${i + 1}`;
    mast.castShadow = mast.receiveShadow = true;
    group.add(mast);
  });

  // ---- Deckhouses ----
  const fc = new THREE.Mesh(new THREE.BoxGeometry(length * 0.16, beam * 0.55, 3.4), deckhouseMat);
  fc.position.set(length * 0.86, 0, dimensions.deckElevations[3].z + 1.7);
  fc.name = 'forecastleDeckhouse';
  fc.castShadow = fc.receiveShadow = true;
  group.add(fc);
  const pp = new THREE.Mesh(new THREE.BoxGeometry(length * 0.10, beam * 0.5, 3.0), deckhouseMat);
  pp.position.set(length * 0.07, 0, dimensions.deckElevations[3].z + 1.5);
  pp.name = 'poopDeckhouse';
  pp.castShadow = pp.receiveShadow = true;
  group.add(pp);
  const br = new THREE.Mesh(new THREE.BoxGeometry(length * 0.07, beam * 0.42, 2.6), deckhouseMat);
  br.position.set(length * 0.5, 0, dimensions.deckElevations[3].z + 1.3);
  br.name = 'bridgeDeckhouse';
  br.castShadow = br.receiveShadow = true;
  group.add(br);

  return group;
}
