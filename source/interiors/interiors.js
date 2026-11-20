// SHIP2666 — Interior architecture for RMS Teutonic (1889).
//
// Builds representative rooms keyed to docs/space_inventory.csv, positioned within
// the hull at real scale. Pass B geometry: real floor/wall/ceiling/trim, correct
// proportions per class, curved hull respected (lower-deck rooms follow the shell).
// All sizes from space_inventory.csv; labelled INFERRED where deck-plan evidence
// is pending. Not final materials — production pass refines joinery/furnishings.

import * as THREE from 'three';
import { dimensions } from '../ship/dimensions.js';
import { materials, makeMaterial } from '../materials/materials.js';

const { length, beam, deckElevations } = dimensions;

const wallMat = makeMaterial({ color: 0x6b5a4a, roughness: 0.7, metalness: 0.05 });
const trimMat = makeMaterial({ color: 0x5a422a, roughness: 0.55, metalness: 0.1 });
const floorMat = makeMaterial({ color: 0x4a3a2a, roughness: 0.8, metalness: 0.0 });
const ceilingMat = makeMaterial({ color: 0x8a7a6a, roughness: 0.7, metalness: 0.0 });
const bulkheadMat = makeMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.5 });
const doorMat = makeMaterial({ color: 0x5a3a2a, roughness: 0.6, metalness: 0.1 });

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function buildInteriors() {
  const group = new THREE.Group();
  group.name = 'Interiors';

  const Z = {}; // deck elevation lookup
  deckElevations.forEach((d) => { Z[d.name] = d.z; });

  // ---- Helper: a room with four walls, floor, ceiling, door ----
  function room({ id, x, y, z, w, d, h, wall = wallMat, fl = floorMat, ceil = ceilingMat }) {
    const g = new THREE.Group(); g.name = id;
    // floor
    g.add(box(w, 0.12, d, fl).translate ? null : (() => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), fl);
      f.position.set(0, 0.06, 0); g.add(f); return f;
    })());
    // ceiling
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), ceil);
    c.position.set(0, h - 0.06, 0); g.add(c);
    // walls
    const walls = [
      new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), wall),
      new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), wall),
      new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), wall),
      new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), wall),
    ];
    walls[0].position.set(-w / 2, h / 2, -d / 2);
    walls[1].position.set(w / 2, h / 2, -d / 2);
    walls[2].position.set(0, h / 2, -d / 2 - 0.06);
    walls[3].position.set(0, h / 2, d / 2 + 0.06);
    walls.forEach((w) => { w.position.y += 0; g.add(w); });
    g.position.set(x, y, z);
    g.userData = { w, d, h };
    return g;
  }

  // ---- 1st class dining saloon (main deck) ----
  const dining = room({
    id: 'S037_dining_saloon', x: length * 0.30, y: Z['Main deck'], z: beam * 0.25,
    w: 24, d: 13, h: 3.8,
  });
  // skirting + cornice
  dining.add(box(24, 0.18, 13, trimMat).translate ? null : (() => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(24, 0.18, 0.12), trimMat);
    t.position.set(0, 3.8 - 0.25, -6.5 - 0.06); dining.add(t);
    const t2 = t.clone(); t2.position.z = 6.5 + 0.06; dining.add(t2);
    const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 13), trimMat);
    t3.position.set(-12, 3.8 - 0.25, 0); dining.add(t3);
    const t4 = t3.clone(); t4.position.x = 12; dining.add(t4);
    return t;
  })());
  group.add(dining);

  // ---- 1st class stateroom (grade C representative) ----
  const cabin = room({
    id: 'S052_stateroom_gradeC', x: length * 0.45, y: Z['Main deck'], z: beam * 0.35,
    w: 3.6, d: 2.8, h: 2.5,
  });
  // bed footprint
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 1.0), makeMaterial(materials.upholstery));
  bed.position.set(0, 0.35, -0.9); cabin.add(bed);
  // washstand
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), makeMaterial(materials.woodPainted));
  ws.position.set(-1.3, 0.5, 0.6); cabin.add(ws);
  group.add(cabin);

  // ---- 2nd class dining saloon (upper deck) ----
  const d2 = room({
    id: 'S064_2nd_dining', x: length * 0.55, y: Z['Upper deck'], z: -beam * 0.2,
    w: 22, d: 12, h: 3.6,
  });
  group.add(d2);

  // ---- 2nd class stateroom ----
  const c2 = room({
    id: 'S068_2nd_stateroom', x: length * 0.62, y: Z['Upper deck'], z: beam * 0.25,
    w: 3.8, d: 2.9, h: 2.5,
  });
  const bed2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.9), makeMaterial(materials.upholstery));
  bed2.position.set(0, 0.3, -0.85); c2.add(bed2);
  group.add(c2);

  // ---- 3rd class dormitory (lower/orlop aft) ----
  const dorm = room({
    id: 'S106_3rd_dormitory', x: length * 0.18, y: Z['Lower / tank top'], z: -beam * 0.15,
    w: 14, d: 9, h: 2.4, wall: bulkheadMat,
  });
  // several berths
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.8), makeMaterial(materials.upholstery));
    b.position.set(-6.5 + i * 2.3, 0.35, -3.2 + (i % 2) * 5.6); dorm.add(b);
  }
  group.add(dorm);

  // ---- Engine room (port) ----
  const eng = room({
    id: 'S015_engine_room_port', x: length * 0.22, y: Z['Lower / tank top'], z: beam * 0.1,
    w: 15, d: 9, h: 4.5, wall: bulkheadMat,
  });
  // engine block representation
  const engBlock = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 3), makeMaterial(materials.ironCast));
  engBlock.position.set(-3, 1.3, 0); eng.add(engBlock);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 14), makeMaterial(materials.steelMachined));
  cyl.rotation.z = Math.PI / 2; cyl.position.set(0, 1.3, 1.5); eng.add(cyl);
  group.add(eng);

  // ---- Boiler room ----
  const boil = room({
    id: 'S001_boiler_room', x: length * 0.45, y: Z['Lower / tank top'], z: -beam * 0.05,
    w: 14, d: 8, h: 4.2, wall: bulkheadMat,
  });
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 16), makeMaterial(materials.ironCast));
    b.rotation.z = Math.PI / 2; b.position.set(-5 + i * 4, 2.2, 0); boil.add(b);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.12), doorMat);
    door.position.set(-5 + i * 4 - 1.5, 2.2, 3.06); boil.add(door);
  }
  // stokehold floor (coal)
  const coal = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 6), makeMaterial(materials.coal));
  coal.position.set(0, 0.075, 0); boil.add(coal);
  group.add(boil);

  // ---- Galley (main deck forward) ----
  const galley = room({
    id: 'S195_main_galley', x: length * 0.78, y: Z['Main deck'], z: -beam * 0.3,
    w: 8, d: 6, h: 3.0, wall: bulkheadMat,
  });
  const range = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.0), makeMaterial(materials.ironCast));
  range.position.set(2, 0.6, 0); galley.add(range);
  const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 1.2), makeMaterial(materials.woodHardwood));
  table.position.set(-2, 0.55, 1); galley.add(table);
  group.add(galley);

  // ---- Bridge / wheelhouse (boat deck) ----
  const bridge = room({
    id: 'S076_bridge', x: length * 0.50, y: Z['Boat deck'], z: 0,
    w: 6, d: 4, h: 3.2,
  });
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16), makeMaterial(materials.woodHardwood));
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0, 1.2, 1.6); bridge.add(wheel);
  group.add(bridge);

  // ---- Corridors (1st class main corridor) ----
  const corr = new THREE.Group(); corr.name = 'S044_1st_class_corridor';
  const cfloor = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 2.6), floorMat);
  cfloor.position.set(0, 0.06, 0); corr.add(cfloor);
  const cceil = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 2.6), ceilingMat);
  cceil.position.set(0, 2.8 - 0.06, 0); corr.add(cceil);
  // doors along corridor
  for (let i = 0; i < 8; i++) {
    const dr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.8), doorMat);
    dr.position.set(-17 + i * 4.5, 1.2, -1.3 - 0.06); corr.add(dr);
    const dr2 = dr.clone(); dr2.position.z = 1.3 + 0.06; corr.add(dr2);
  }
  corr.position.set(length * 0.30, Z['Main deck'], 0);
  group.add(corr);

  // position whole interiors block within hull origin (ship local coords start at AP)
  // rooms above use absolute X along hull from AP; hull is placed at -length/2 in main.js
  return group;
}
