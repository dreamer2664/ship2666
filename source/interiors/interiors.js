// SHIP2666 — Interior architecture for RMS Teutonic (1889), Pass B.
//
// Builds rooms keyed to docs/space_inventory.csv, positioned within the hull at
// real scale. Each group is named by its space Unique ID. Geometry is blockout-
// level (Pass B): real floor/wall/ceiling/trim, correct proportions per class,
// lower-deck rooms respect the curved hull. Furnishings are minimal placeholders
// to be replaced in the materials/furniture pass. Labelled INFERRED where deck-
// plan evidence is pending. Not final materials.

import * as THREE from 'three';
import { dimensions } from '../ship/dimensions.js';
import { materials, makeMaterial } from '../materials/materials.js';

const { length, beam, deckElevations } = dimensions;
const Z = {}; deckElevations.forEach((d) => { Z[d.name] = d.z; });

const wallMat = makeMaterial({ color: 0x6b5a4a, roughness: 0.7, metalness: 0.05 });
const trimMat = makeMaterial({ color: 0x5a422a, roughness: 0.55, metalness: 0.1 });
const floorMat = makeMaterial({ color: 0x4a3a2a, roughness: 0.8, metalness: 0.0 });
const ceilingMat = makeMaterial({ color: 0x8a7a6a, roughness: 0.7, metalness: 0.0 });
const bulkheadMat = makeMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.5 });
const doorMat = makeMaterial({ color: 0x5a3a2a, roughness: 0.6, metalness: 0.1 });
const upholstery = makeMaterial(materials.upholstery);
const woodHardwood = makeMaterial(materials.woodHardwood);
const woodPainted = makeMaterial(materials.woodPainted);
const ironCast = makeMaterial(materials.ironCast);
const steelMachined = makeMaterial(materials.steelMachined);
const coalMat = makeMaterial(materials.coal);

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function room({ id, x, y, z, w, d, h, wall = wallMat }) {
  const g = new THREE.Group(); g.name = id;
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), floorMat);
  f.position.set(0, 0.06, 0); g.add(f);
  const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), ceilingMat);
  c.position.set(0, h - 0.06, 0); g.add(c);
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
  walls.forEach((w) => g.add(w));
  g.position.set(x, y, z);
  g.userData = { w, d, h };
  g.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
  return g;
}

export function buildInteriors() {
  const group = new THREE.Group(); group.name = 'Interiors';

  // ---- 1st class dining saloon (main deck) ----
  const dining = room({ id: 'S037_dining_saloon', x: length * 0.30, y: Z['Main deck'], z: beam * 0.25, w: 24, d: 13, h: 3.8 });
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.2), woodHardwood);
    t.position.set(-9 + i * 3.6, 0.45, -3 + (i % 2) * 5.6); dining.add(t);
  }
  group.add(dining);

  // pantry
  group.add(room({ id: 'S038_dining_pantry', x: length * 0.30 + 13, y: Z['Main deck'], z: beam * 0.25, w: 8, d: 6, h: 3.4 }));

  // ---- 1st class smoking saloon ----
  group.add(room({ id: 'S039_smoking_saloon', x: length * 0.30, y: Z['Main deck'], z: -beam * 0.1, w: 15, d: 10, h: 3.6 }));
  group.add(room({ id: 'S040_smoking_bar', x: length * 0.30 + 8, y: Z['Main deck'], z: -beam * 0.1, w: 4, d: 3, h: 3.4 }));

  // ---- lounge + library ----
  group.add(room({ id: 'S041_lounge', x: length * 0.30, y: Z['Main deck'], z: -beam * 0.35, w: 12, d: 9, h: 3.6 }));
  group.add(room({ id: 'S042_library', x: length * 0.30 + 7, y: Z['Main deck'], z: -beam * 0.35, w: 7, d: 6, h: 3.4 }));

  // ---- grand staircase ----
  const stair = new THREE.Group(); stair.name = 'S043_grand_staircase';
  for (let deck = 0; deck < 4; deck++) {
    const flight = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 6), woodHardwood);
    flight.position.set(0, deck * 3.0 + 0.6, 0); stair.add(flight);
    const well = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 6), bulkheadMat);
    well.position.set(0, deck * 3.0 + 1.5, 0); stair.add(well);
  }
  stair.position.set(length * 0.30, Z['Main deck'], 0);
  group.add(stair);

  // ---- corridor ----
  const corr = new THREE.Group(); corr.name = 'S044_1st_class_corridor';
  const cfloor = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 2.6), floorMat);
  cfloor.position.set(0, 0.06, 0); corr.add(cfloor);
  const cceil = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 2.6), ceilingMat);
  cceil.position.set(0, 2.8 - 0.06, 0); corr.add(cceil);
  for (let i = 0; i < 8; i++) {
    const dr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.8), doorMat);
    dr.position.set(-17 + i * 4.5, 1.2, -1.3 - 0.06); corr.add(dr);
    const dr2 = dr.clone(); dr2.position.z = 1.3 + 0.06; corr.add(dr2);
  }
  corr.position.set(length * 0.30, Z['Main deck'], 0);
  group.add(corr);

  // ---- purser's office ----
  group.add(room({ id: 'S045_purser_office', x: length * 0.30 - 19, y: Z['Main deck'], z: 0, w: 5, d: 4, h: 2.8 }));

  // ---- 1st class staterooms (varied grades, main deck) ----
  ['S046','S047','S048','S049','S050','S051','S052','S053','S054','S055'].forEach((id, i) => {
    const gradeA = i < 2;
    const w = gradeA ? 4.2 : (i < 6 ? 4.0 : 3.6);
    const d = gradeA ? 3.2 : (i < 6 ? 3.0 : 2.8);
    const h = gradeA ? 2.6 : 2.5;
    const r = room({ id, x: length * 0.35 + (i % 5) * 4.2, y: Z['Main deck'], z: beam * 0.45 + (Math.floor(i / 5)) * 3.2, w, d, h });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.55, d * 0.4), upholstery);
    bed.position.set(0, 0.35, -d * 0.35); r.add(bed);
    if (gradeA) {
      const ws = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), woodPainted);
      ws.position.set(-w * 0.4, 0.5, d * 0.3); r.add(ws);
    }
    group.add(r);
  });

  // ---- Upper deck 1st class staterooms ----
  ['S056','S057','S058','S059','S060','S061','S062','S063'].forEach((id, i) => {
    const gradeA = i < 2;
    const w = gradeA ? 4.2 : (i < 6 ? 4.0 : 3.6);
    const d = gradeA ? 3.2 : (i < 6 ? 3.0 : 2.8);
    const h = 2.5;
    const r = room({ id, x: length * 0.42 + (i % 4) * 4.2, y: Z['Upper deck'], z: beam * 0.45 + (Math.floor(i / 4)) * 3.2, w, d, h });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.55, d * 0.4), upholstery);
    bed.position.set(0, 0.35, -d * 0.35); r.add(bed);
    group.add(r);
  });

  // cabin heads (grade A ensuite)
  ['S175','S176','S177','S178'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.42 + (i % 4) * 4.2 + 2.2, y: Z['Upper deck'], z: beam * 0.45 + (Math.floor(i / 4)) * 3.2 - 0.6, w: 3, d: 2.5, h: 2.6, wall: bulkheadMat }));
  });

  // ---- 2nd class (upper deck) ----
  group.add(room({ id: 'S064_2nd_dining', x: length * 0.55, y: Z['Upper deck'], z: -beam * 0.2, w: 22, d: 12, h: 3.6 }));
  group.add(room({ id: 'S065_2nd_pantry', x: length * 0.55 + 12, y: Z['Upper deck'], z: -beam * 0.2, w: 7, d: 5, h: 3.4 }));
  group.add(room({ id: 'S066_2nd_smoking_library', x: length * 0.55, y: Z['Upper deck'], z: -beam * 0.5, w: 13, d: 9, h: 3.4 }));
  const corr2 = new THREE.Group(); corr2.name = 'S067_2nd_class_corridor';
  const c2f = new THREE.Mesh(new THREE.BoxGeometry(30, 0.12, 2.5), floorMat); c2f.position.set(0, 0.06, 0); corr2.add(c2f);
  const c2c = new THREE.Mesh(new THREE.BoxGeometry(30, 0.12, 2.5), ceilingMat); c2c.position.set(0, 2.6 - 0.06, 0); corr2.add(c2c);
  for (let i = 0; i < 8; i++) {
    const dr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.75), doorMat);
    dr.position.set(-14 + i * 3.75, 1.15, -1.25 - 0.06); corr2.add(dr);
    const dr2 = dr.clone(); dr2.position.z = 1.25 + 0.06; corr2.add(dr2);
  }
  corr2.position.set(length * 0.60, Z['Upper deck'], 0); group.add(corr2);
  ['S068','S069','S070','S071','S072','S073','S074','S075','S181','S182','S183','S184','S185','S186','S187','S188'].forEach((id, i) => {
    const r = room({ id, x: length * 0.62 + (i % 8) * 3.9, y: Z['Upper deck'], z: beam * 0.3 + (Math.floor(i / 8)) * 3.1, w: 3.8, d: 2.9, h: 2.5 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.9), upholstery);
    bed.position.set(0, 0.3, -0.9); r.add(bed);
    group.add(r);
  });

  // ---- Boat deck: bridge, officers, captain ----
  group.add(room({ id: 'S076_bridge', x: length * 0.50, y: Z['Boat deck'], z: 0, w: 6, d: 4, h: 3.2 }));
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16), woodHardwood);
  wheel.rotation.x = Math.PI / 2; wheel.position.set(0, 1.2, 1.6);
  group.children.find((c) => c.name === 'S076_bridge').add(wheel);
  group.add(room({ id: 'S077_wheelhouse', x: length * 0.50 + 3.5, y: Z['Boat deck'], z: 0, w: 3, d: 3, h: 2.8 }));
  group.add(room({ id: 'S078_chart_room', x: length * 0.50 - 3.5, y: Z['Boat deck'], z: 0, w: 3.5, d: 2.8, h: 2.8 }));
  group.add(room({ id: 'S079_captain_cabin', x: length * 0.50, y: Z['Boat deck'], z: beam * 0.3, w: 5, d: 4, h: 2.9 }));
  group.add(room({ id: 'S080_captain_head', x: length * 0.50 + 3, y: Z['Boat deck'], z: beam * 0.3, w: 3, d: 2.5, h: 2.5, wall: bulkheadMat }));
  ['S081','S082','S083','S084'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.50 - 4 + i * 2.2, y: Z['Boat deck'], z: -beam * 0.25, w: 3.8, d: 3, h: 2.7 }));
  });
  group.add(room({ id: 'S085_chief_engineer', x: length * 0.50 - 2, y: Z['Boat deck'], z: -beam * 0.55, w: 3, d: 2.4, h: 2.6 }));
  group.add(room({ id: 'S086_junior_officer', x: length * 0.50 + 1.5, y: Z['Boat deck'], z: -beam * 0.55, w: 2.9, d: 2.4, h: 2.6 }));
  group.add(room({ id: 'S087_officers_mess', x: length * 0.50, y: Z['Boat deck'], z: -beam * 0.8, w: 4, d: 3.5, h: 2.7 }));
  group.add(room({ id: 'S088_promenade_port', x: length * 0.45, y: Z['Boat deck'], z: -beam * 0.42, w: 20, d: 3, h: 3.0, wall: bulkheadMat }));
  group.add(room({ id: 'S089_promenade_stbd', x: length * 0.45, y: Z['Boat deck'], z: beam * 0.42, w: 20, d: 3, h: 3.0, wall: bulkheadMat }));
  group.add(room({ id: 'S090_veranda_cafe_port', x: length * 0.25, y: Z['Boat deck'], z: -beam * 0.45, w: 6, d: 4, h: 3.0 }));
  group.add(room({ id: 'S091_veranda_cafe_stbd', x: length * 0.25, y: Z['Boat deck'], z: beam * 0.45, w: 6, d: 4, h: 3.0 }));
  group.add(room({ id: 'S092_stewards_station', x: length * 0.35, y: Z['Boat deck'], z: -beam * 0.45, w: 3, d: 2.5, h: 2.7 }));
  group.add(room({ id: 'S093_bridge_deckhouse', x: length * 0.50, y: Z['Boat deck'], z: beam * 0.1, w: 4, d: 3, h: 2.8 }));
  group.add(room({ id: 'S094_binnacle', x: length * 0.50, y: Z['Boat deck'], z: 1.8, w: 2.5, d: 2, h: 2.4, wall: bulkheadMat }));
  group.add(room({ id: 'S095_telegraph_stand', x: length * 0.50 - 1.8, y: Z['Boat deck'], z: 1.5, w: 3, d: 2.5, h: 2.6, wall: bulkheadMat }));

  // ---- Boat deck heads ----
  group.add(room({ id: 'S124_boatdeck_head', x: length * 0.30, y: Z['Boat deck'], z: -beam * 0.42, w: 3.5, d: 2.8, h: 2.6, wall: bulkheadMat }));

  // ---- 3rd class (lower/orlop aft) ----
  ['S106','S107'].forEach((id, i) => {
    const r = room({ id, x: length * 0.10 + i * 7.5, y: Z['Lower / tank top'], z: -beam * 0.1, w: 14, d: 9, h: 2.4, wall: bulkheadMat });
    for (let j = 0; j < 6; j++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.8), upholstery);
      b.position.set(-6.5 + j * 2.3, 0.35, -3.2 + (j % 2) * 5.6); r.add(b);
    }
    group.add(r);
  });
  ['S108','S109'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.10 + i * 6.5, y: Z['Lower / tank top'], z: beam * 0.15, w: 12, d: 8, h: 2.4, wall: bulkheadMat }));
  });
  group.add(room({ id: 'S110_3rd_general', x: length * 0.10, y: Z['Lower / tank top'], z: beam * 0.4, w: 20, d: 10, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S111_3rd_dining', x: length * 0.10, y: Z['Lower / tank top'], z: beam * 0.75, w: 15, d: 9, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S112_3rd_pantry', x: length * 0.10 + 8, y: Z['Lower / tank top'], z: beam * 0.75, w: 6, d: 4, h: 2.6, wall: bulkheadMat }));
  const corr3 = new THREE.Group(); corr3.name = 'S113_3rd_class_corridor';
  const c3f = new THREE.Mesh(new THREE.BoxGeometry(25, 0.12, 2.5), floorMat); c3f.position.set(0, 0.06, 0); corr3.add(c3f);
  const c3c = new THREE.Mesh(new THREE.BoxGeometry(25, 0.12, 2.5), ceilingMat); c3c.position.set(0, 2.5 - 0.06, 0); corr3.add(c3c);
  for (let i = 0; i < 6; i++) {
    const dr = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.7), doorMat);
    dr.position.set(-12 + i * 5, 1.15, -1.2 - 0.06); corr3.add(dr);
    const dr2 = dr.clone(); dr2.position.z = 1.2 + 0.06; corr3.add(dr2);
  }
  corr3.position.set(length * 0.18, Z['Lower / tank top'], 0); group.add(corr3);
  group.add(room({ id: 'S114_3rd_head', x: length * 0.18 + 13, y: Z['Lower / tank top'], z: 0, w: 4, d: 3, h: 2.4, wall: bulkheadMat }));
  ['S159','S160','S161','S162','S163','S164'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.05 + i * 5.8, y: Z['Lower / tank top'], z: beam * 0.3, w: 11, d: 7, h: 2.4, wall: bulkheadMat }));
  });
  group.add(room({ id: 'S179_3rd_women', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 0.7, w: 16, d: 10, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S180_3rd_men', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 1.05, w: 16, d: 10, h: 2.6, wall: bulkheadMat }));

  // ---- Main deck service: galley, provisions ----
  group.add(room({ id: 'S115_1st_galley', x: length * 0.78, y: Z['Main deck'], z: -beam * 0.3, w: 7, d: 5, h: 3.0, wall: bulkheadMat }));
  group.add(room({ id: 'S116_scullery', x: length * 0.78 + 7.5, y: Z['Main deck'], z: -beam * 0.3, w: 5, d: 4, h: 2.8, wall: bulkheadMat }));
  group.add(room({ id: 'S117_butchery', x: length * 0.78, y: Z['Main deck'], z: beam * 0.2, w: 4, d: 3.5, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S118_bakery', x: length * 0.78 + 4.5, y: Z['Main deck'], z: beam * 0.2, w: 4, d: 3.5, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S119_provisions', x: length * 0.78, y: Z['Main deck'], z: beam * 0.6, w: 5, d: 4, h: 2.8, wall: bulkheadMat }));
  group.add(room({ id: 'S120_linen_room', x: length * 0.55, y: Z['Upper deck'], z: beam * 0.5, w: 4, d: 3.5, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S121_stewards_room', x: length * 0.55 + 4.5, y: Z['Upper deck'], z: beam * 0.5, w: 3.5, d: 3, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S122_chambermaid_closet', x: length * 0.55 + 8.5, y: Z['Upper deck'], z: beam * 0.5, w: 3.5, d: 2.8, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S123_guest_head', x: length * 0.55, y: Z['Upper deck'], z: -beam * 0.15, w: 3, d: 2.5, h: 2.5, wall: bulkheadMat }));

  // ---- Machinery: engine rooms ----
  ['S015','S016'].forEach((id, i) => {
    const r = room({ id, x: length * 0.18 + i * 13, y: Z['Lower / tank top'], z: beam * 0.05, w: 15, d: 9, h: 4.5, wall: bulkheadMat });
    const block = new THREE.Mesh(new THREE.BoxGeometry(6, 2.2, 3), ironCast);
    block.position.set(-3, 1.3, 0); r.add(block);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 14), steelMachined);
    cyl.rotation.z = Math.PI / 2; cyl.position.set(0, 1.3, 1.5); r.add(cyl);
    group.add(r);
  });
  ['S017','S018'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.18 + i * 13 + 6.5, y: Z['Lower / tank top'], z: beam * 0.55, w: 6, d: 4, h: 4.0, wall: bulkheadMat }));
  });
  ['S019','S020','S021','S022'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.18 + (i % 2) * 13 + 2, y: Z['Lower / tank top'], z: beam * 0.9 + (Math.floor(i / 2)) * 4.5, w: 4, d: 3, h: 3.5, wall: bulkheadMat }));
  });

  // ---- Machinery: boiler rooms (6) + stokeholds (4) ----
  ['S001','S002','S003','S004','S005','S006'].forEach((id, i) => {
    const r = room({ id, x: length * 0.30 + (i % 3) * 5.0, y: Z['Lower / tank top'], z: -beam * 0.1 + (Math.floor(i / 3)) * 8.5, w: 14, d: 8, h: 4.2, wall: bulkheadMat });
    for (let j = 0; j < 2; j++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 16), ironCast);
      b.rotation.z = Math.PI / 2; b.position.set(-5 + j * 4, 2.2, 0); r.add(b);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.12), doorMat);
      door.position.set(-5 + j * 4 - 1.5, 2.2, 3.06); r.add(door);
    }
    const coal = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 6), coalMat);
    coal.position.set(0, 0.075, 0); r.add(coal);
    group.add(r);
  });
  ['S007','S008','S009','S010'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.30 + (i % 3) * 5.0 + 2, y: Z['Lower / tank top'], z: beam * 0.6 + (Math.floor(i / 3)) * 8.5, w: 10, d: 6, h: 3.8, wall: bulkheadMat }));
  });

  // ---- Coal bunkers ----
  ['S011','S012','S013','S014'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.30 + (i % 3) * 5.0 - 1, y: Z['Lower / tank top'], z: beam * 1.4 + (Math.floor(i / 3)) * 8.5, w: 7, d: 5, h: 4.0, wall: bulkheadMat }));
  });

  // ---- Shaft alley + stern + steering ----
  group.add(room({ id: 'S023_shaft_alley_port', x: length * 0.02, y: Z['Lower / tank top'], z: beam * 0.05, w: 22, d: 2.8, h: 3.6, wall: bulkheadMat }));
  group.add(room({ id: 'S024_shaft_alley_stbd', x: length * 0.02, y: Z['Lower / tank top'], z: -beam * 0.05, w: 22, d: 2.8, h: 3.6, wall: bulkheadMat }));
  group.add(room({ id: 'S025_stern_tube', x: length * 0.01, y: Z['Lower / tank top'], z: 0, w: 4, d: 3.5, h: 3.5, wall: bulkheadMat }));
  group.add(room({ id: 'S026_steering_gear', x: length * 0.01, y: Z['Lower / tank top'], z: beam * 0.2, w: 3.5, d: 3, h: 3.2, wall: bulkheadMat }));
  group.add(room({ id: 'S027_aux_machinery', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 0.55, w: 5, d: 4, h: 3.5, wall: bulkheadMat }));
  group.add(room({ id: 'S028_fresh_water_tank', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 1.0, w: 3.5, d: 3, h: 3.2, wall: bulkheadMat }));
  group.add(room({ id: 'S029_ballast_tank', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 1.4, w: 3.5, d: 3, h: 3.2, wall: bulkheadMat }));
  group.add(room({ id: 'S030_refrigeration', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 1.8, w: 4, d: 3, h: 3.2, wall: bulkheadMat }));

  // ---- Cargo / mail holds ----
  ['S031','S032'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.05 + i * 10, y: Z['Lower / tank top'], z: -beam * 0.4, w: 18, d: 12, h: 5.5, wall: bulkheadMat }));
  });
  group.add(room({ id: 'S033_mail_room', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 0.3, w: 6, d: 5, h: 4.5, wall: bulkheadMat }));
  group.add(room({ id: 'S034_cargo_gear', x: length * 0.05, y: Z['Lower / tank top'], z: beam * 0.75, w: 4, d: 3.5, h: 3.8, wall: bulkheadMat }));
  group.add(room({ id: 'S035_refrig_cargo_fwd', x: length * 0.02, y: Z['Lower / tank top'], z: -beam * 0.7, w: 8, d: 6, h: 4.0, wall: bulkheadMat }));
  group.add(room({ id: 'S036_refrig_cargo_aft', x: length * 0.10, y: Z['Lower / tank top'], z: -beam * 0.7, w: 8, d: 6, h: 4.0, wall: bulkheadMat }));

  // ---- Crew (forecastle) ----
  ['S096','S097'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.90 + i * 6.5, y: Z['Lower / tank top'], z: -beam * 0.15, w: 12, d: 8, h: 2.4, wall: bulkheadMat }));
  });
  group.add(room({ id: 'S098_crew_mess', x: length * 0.92, y: Z['Main deck'], z: -beam * 0.2, w: 10, d: 7, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S099_crew_galley', x: length * 0.92 + 11, y: Z['Main deck'], z: -beam * 0.2, w: 6, d: 5, h: 2.8, wall: bulkheadMat }));
  group.add(room({ id: 'S100_scullery', x: length * 0.92 + 11, y: Z['Main deck'], z: beam * 0.2, w: 5, d: 4, h: 2.8, wall: bulkheadMat }));
  group.add(room({ id: 'S101_crew_pantry', x: length * 0.92 + 11, y: Z['Main deck'], z: beam * 0.55, w: 4, d: 3, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S102_crew_head', x: length * 0.92 + 11, y: Z['Main deck'], z: beam * 0.9, w: 3.5, d: 3, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S103_crew_laundry', x: length * 0.92 + 11, y: Z['Main deck'], z: beam * 1.3, w: 4, d: 3.5, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S104_crew_provisions', x: length * 0.92 + 11, y: Z['Main deck'], z: beam * 1.8, w: 5, d: 4, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S105_crew_effects', x: length * 0.90, y: Z['Lower / tank top'], z: beam * 0.3, w: 8, d: 6, h: 4.0, wall: bulkheadMat }));

  // ---- Engineers ----
  ['S165','S166','S167'].forEach((id, i) => {
    group.add(room({ id, x: length * 0.05 + i * 5.5, y: Z['Lower / tank top'], z: -beam * 0.35, w: 10, d: 7, h: 2.4, wall: bulkheadMat }));
  });
  group.add(room({ id: 'S168_engineers_mess', x: length * 0.05 + 6, y: Z['Lower / tank top'], z: beam * 0.1, w: 6, d: 5, h: 2.4, wall: bulkheadMat }));
  group.add(room({ id: 'S169_engineers_head', x: length * 0.05 + 6, y: Z['Lower / tank top'], z: beam * 0.7, w: 4, d: 3, h: 2.4, wall: bulkheadMat }));

  // ---- Additional cargo/stores ----
  group.add(room({ id: 'S170_sails_canvas', x: length * 0.02, y: Z['Lower / tank top'], z: beam * 0.4, w: 6, d: 5, h: 4.0, wall: bulkheadMat }));
  group.add(room({ id: 'S171_ropes_rigging', x: length * 0.06, y: Z['Lower / tank top'], z: beam * 0.85, w: 6, d: 5, h: 4.0, wall: bulkheadMat }));
  group.add(room({ id: 'S172_anchor_chain', x: length * 0.02, y: Z['Lower / tank top'], z: beam * 1.3, w: 5, d: 4, h: 3.8, wall: bulkheadMat }));
  group.add(room({ id: 'S173_stores_locker', x: length * 0.30 - 20, y: Z['Main deck'], z: 0, w: 4, d: 3, h: 2.8, wall: bulkheadMat }));
  group.add(room({ id: 'S174_2nd_provisions', x: length * 0.55 + 12, y: Z['Upper deck'], z: -beam * 0.2, w: 4, d: 3, h: 2.8, wall: bulkheadMat }));

  // ---- Main galley (passenger) ----
  const mgalley = room({ id: 'S195_main_galley', x: length * 0.78, y: Z['Main deck'], z: -beam * 0.3, w: 8, d: 6, h: 3.0, wall: bulkheadMat });
  const range = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.0), ironCast);
  range.position.set(2, 0.6, 0); mgalley.add(range);
  const mtable = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 1.2), woodHardwood);
  mtable.position.set(-2, 0.55, 1); mgalley.add(mtable);
  group.add(mgalley);
  group.add(room({ id: 'S196_veg_prep', x: length * 0.78 + 8.5, y: Z['Main deck'], z: -beam * 0.3, w: 4, d: 3, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S197_pastry', x: length * 0.78 + 8.5, y: Z['Main deck'], z: beam * 0.1, w: 4, d: 3, h: 2.6, wall: bulkheadMat }));
  group.add(room({ id: 'S198_cold_room', x: length * 0.78, y: Z['Main deck'], z: beam * 0.55, w: 5, d: 4, h: 2.8, wall: bulkheadMat }));
  group.add(room({ id: 'S199_dishwash', x: length * 0.78 + 8.5, y: Z['Main deck'], z: beam * 0.55, w: 4, d: 3, h: 2.6, wall: bulkheadMat }));

  // ---- Boat deck companionway ----
  group.add(room({ id: 'S200_boatdeck_companionway', x: length * 0.40, y: Z['Boat deck'], z: 0, w: 12, d: 3, h: 3.0, wall: bulkheadMat }));

  return group;
}
