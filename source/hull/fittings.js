// SHIP2666 — Exterior deck fittings for RMS Teutonic (1889).
//
// Pass B production fittings at real scale: railings/stanchions, lifeboats +
// davits, anchors, windlass/capstan, bollards, companionways, vents. Mapped to
// space_inventory.csv entries S131-S150 etc. Derived from dimensions.js.

import * as THREE from 'three';
import { dimensions } from '../ship/dimensions.js';
import { materials, makeMaterial } from '../materials/materials.js';

const { length, beam } = dimensions;
const iron = makeMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.7 });
const brass = makeMaterial({ color: 0xc9a65c, roughness: 0.45, metalness: 0.9 });
const wood = makeMaterial({ color: 0x5a422a, roughness: 0.6, metalness: 0.05 });
const ropeCanvas = makeMaterial({ color: 0x8a7a5a, roughness: 0.95, metalness: 0.0 });

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function buildFittings() {
  const group = new THREE.Group();
  group.name = 'Exterior Fittings';

  // ---- Railings + stanchions along boat deck edges ----
  const railings = new THREE.Group(); railings.name = 'railings';
  const stanMat = iron;
  const railY = dimensions.deckElevations[3].z + 1.05; // boat deck + rail height
  const stanH = 1.0;
  const nStan = 40;
  // run along both sides from forecastle to poop
  const xStart = length * 0.10, xEnd = length * 0.90;
  for (let side of [-1, 1]) {
    for (let i = 0; i < nStan; i++) {
      const t = i / (nStan - 1);
      const x = xStart + (xEnd - xStart) * t;
      // stanchion
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, stanH, 8), stanMat);
      st.position.set(x, side * (beam * 0.49), railY);
      railings.add(st);
      // top rail segment between stanchions
      if (i < nStan - 1) {
        const x2 = xStart + (xEnd - xStart) * ((i + 1) / (nStan - 1));
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Math.abs(x2 - x), 8), stanMat);
        rail.rotation.z = Math.PI / 2;
        rail.position.set((x + x2) / 2, side * (beam * 0.49), railY + stanH / 2);
        rail.lookAt(new THREE.Vector3(x2, side * (beam * 0.49), railY + stanH / 2));
        rail.rotation.z = Math.PI / 2;
        railings.add(rail);
      }
    }
    // fore-aft rail along centreline forward
    for (let i = 0; i < nStan; i++) {
      const t = i / (nStan - 1);
      const x = xStart + (xEnd - xStart) * t;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, stanH, 8), stanMat);
      st.position.set(x, 0, railY);
      railings.add(st);
    }
  }
  group.add(railings);

  // ---- Lifeboats + davits (4 boats: port fwd/aft, stbd fwd/aft) ----
  const boats = new THREE.Group(); boats.name = 'lifeboats';
  const boatCfg = [
    { x: length * 0.20, s: -1, id: 'S135' }, // port fwd
    { x: length * 0.20, s: +1, id: 'S136' }, // stbd fwd
    { x: length * 0.78, s: -1, id: 'S137' }, // port aft
    { x: length * 0.78, s: +1, id: 'S138' }, // stbd aft
  ];
  boatCfg.forEach((c) => {
    const g = new THREE.Group(); g.name = c.id;
    // boat hull
    const hullb = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.9, 1.7), wood);
    hullb.position.set(0, 0.5, 0);
    g.add(hullb);
    // thwarts/seats
    for (let j = 0; j < 3; j++) {
      const th = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.5), wood);
      th.position.set(-2.2 + j * 2.2, 0.6, 0);
      g.add(th);
    }
    // davit (A-frame)
    const davit = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 10), iron);
    post.position.set(0, 2.1, 0);
    davit.add(post);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 10), iron);
    arm.rotation.z = Math.PI / 10;
    arm.position.set(0, 4.0, 0);
    davit.add(arm);
    davit.position.set(c.x, c.s * (beam * 0.42), railY);
    davit.rotation.y = c.s === -1 ? -0.2 : 0.2;
    g.add(davit);
    g.position.set(c.x, c.s * (beam * 0.5), railY + 0.3);
    g.rotation.y = c.s === -1 ? -0.15 : 0.15;
    g.traverse((m) => { m.castShadow = m.receiveShadow = true; });
    boats.add(g);
  });
  group.add(boats);

  // ---- Anchors (forecastle, port + stbd bow) ----
  const anchors = new THREE.Group(); anchors.name = 'anchors';
  const anchorMat = iron;
  ['-', '+'].forEach((sgn) => {
    const mult = sgn === '-' ? -1 : 1;
    const g = new THREE.Group();
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 10), anchorMat);
    shank.rotation.z = Math.PI / 2;
    shank.position.set(mult * 1.1, 0, 0);
    g.add(shank);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), brass);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(mult * 2.35, 0, 0);
    g.add(ring);
    const flukeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.35), anchorMat);
    flukeL.position.set(mult * 2.35, -0.25, -0.18);
    g.add(flukeL);
    const flukeR = flukeL.clone(); flukeR.position.z = 0.18; g.add(flukeR);
    g.position.set(mult * 1.1, 0, length * 0.94); // bow
    g.rotation.y = Math.PI / 2;
    g.traverse((m) => { m.castShadow = m.receiveShadow = true; });
    anchors.add(g);
  });
  group.add(anchors);

  // ---- Windlass / capstan (forecastle) ----
  const windlass = new THREE.Group(); windlass.name = 'windlass';
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), iron);
  base.position.set(0, 0.25, length * 0.92);
  windlass.add(base);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 16), brass);
  drum.rotation.x = Math.PI / 2;
  drum.position.set(0, 0.7, length * 0.92);
  windlass.add(drum);
  const capstan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12), brass);
  capstan.rotation.x = Math.PI / 2;
  capstan.position.set(0, 1.15, length * 0.92);
  windlass.add(capstan);
  windlass.traverse((m) => { m.castShadow = m.receiveShadow = true; });
  group.add(windlass);

  // ---- Bollards (forecastle, boat deck, poop) ----
  const bollards = new THREE.Group(); bollards.name = 'bollards';
  const bollCfg = [
    { x: length * 0.88, s: -1 }, { x: length * 0.88, s: +1 },   // forecastle
    { x: length * 0.50, s: -1 }, { x: length * 0.50, s: +1 },   // boat deck
    { x: length * 0.12, s: -1 }, { x: length * 0.12, s: +1 },   // poop
  ];
  bollCfg.forEach((c) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 12), iron);
    b.position.set(c.x, c.s * (beam * 0.46), dimensions.deckElevations[3].z + 0.35);
    bollards.add(b);
  });
  bollards.traverse((m) => { m.castShadow = m.receiveShadow = true; });
  group.add(bollards);

  // ---- Companionways / hatch coamings (deck access) ----
  const comps = new THREE.Group(); comps.name = 'companionways';
  const compCfg = [
    { x: length * 0.35, z: 0 },   // near grand staircase
    { x: length * 0.60, z: beam * 0.2 },
    { x: length * 0.15, z: -beam * 0.15 },
  ];
  compCfg.forEach((c, i) => {
    const g = new THREE.Group();
    const coaming = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.0), iron);
    coaming.position.set(0, 0.25, 0);
    g.add(coaming);
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.9), iron);
    ladder.position.set(0, 0.75, 0);
    g.add(ladder);
    g.position.set(c.x, dimensions.deckElevations[3].z, c.z);
    g.name = `companionway_${i}`;
    g.traverse((m) => { m.castShadow = m.receiveShadow = true; });
    comps.add(g);
  });
  group.add(comps);

  // ---- Cowl ventilators (boat deck) ----
  const vents = new THREE.Group(); vents.name = 'cowlVentilators';
  const ventCfg = [
    { x: length * 0.42, s: -1 }, { x: length * 0.42, s: +1 },
    { x: length * 0.68, s: -1 }, { x: length * 0.68, s: +1 },
  ];
  ventCfg.forEach((c) => {
    const v = new THREE.Group();
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), iron);
    neck.position.set(0, 0.45, 0);
    v.add(neck);
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 12), iron);
    cowl.position.set(0, 0.95, 0);
    v.add(cowl);
    v.position.set(c.x, c.s * (beam * 0.42), dimensions.deckElevations[3].z + 1.05);
    v.name = `cowlVentilator_${c.x}`;
    v.traverse((m) => { m.castShadow = m.receiveShadow = true; });
    vents.add(v);
  });
  group.add(vents);


  // ---- Deck detail (brief B.2): planking, hatches, skylights, vents, drains ----
  const deckDetail = new THREE.Group(); deckDetail.name = 'deckDetail';
  const deckZ = dimensions.deckElevations[3].z + 0.06; // boat deck surface
  const plankMat = makeMaterial({ color: 0x3d4a3d, roughness: 0.75, metalness: 0.05 });
  const hatchMat = makeMaterial({ color: 0x3a3a3a, roughness: 0.6, metalness: 0.5 });
  const skylightMat = makeMaterial({ color: 0xb0c4d0, roughness: 0.2, metalness: 0.05,
    transparent: true, opacity: 0.85 });
  const drainMat = makeMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.7 });

  // Deck planking strips (fore-aft planks with caulking gaps)
  const plankW = 0.14, plankGap = 0.015;
  const nPlanks = Math.floor(beam / (plankW + plankGap));
  for (let i = 0; i < nPlanks; i++) {
    const py = -beam/2 + i*(plankW+plankGap) + plankW/2;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(length*0.82, 0.04, plankW), plankMat);
    plank.position.set(length*0.5, deckZ, py);
    plank.name = `plank_${i}`;
    deckDetail.add(plank);
  }
  // Hatches (rectangular deck openings with coamings)
  const hatchCfg = [
    { x: length*0.25, y: -beam*0.3, w: 2.2, d: 1.6 },  // forward hatch
    { x: length*0.25, y: beam*0.3, w: 2.2, d: 1.6 },
    { x: length*0.60, y: 0, w: 2.6, d: 1.8 },           // mid hatch
  ];
  hatchCfg.forEach((c,i)=>{
    const coaming = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.3, c.d), hatchMat);
    coaming.position.set(0, 0.15, 0);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(c.w-0.1, 0.06, c.d-0.1), hatchMat);
    lid.position.set(0, 0.33, 0);
    const g = new THREE.Group(); g.add(coaming); g.add(lid);
    g.position.set(c.x, deckZ, c.y);
    g.name = `hatch_${i}`;
    g.traverse((m)=>{m.castShadow=true;m.receiveShadow=true;});
    deckDetail.add(g);
  });
  // Skylights (glazed deck lights)
  const skyCfg = [
    { x: length*0.40, y: -beam*0.2, w: 1.8, d: 1.2 },
    { x: length*0.40, y: beam*0.2, w: 1.8, d: 1.2 },
  ];
  skyCfg.forEach((c,i)=>{
    const frame = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.1, c.d), iron);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(c.w-0.08, 0.04, c.d-0.08), skylightMat);
    glass.position.set(0, 0.07, 0);
    const g = new THREE.Group(); g.add(frame); g.add(glass);
    g.position.set(c.x, deckZ, c.y);
    g.name = `skylight_${i}`;
    g.traverse((m)=>{m.castShadow=true;m.receiveShadow=true;});
    deckDetail.add(g);
  });
  // Deck drains (small scuppers)
  const drainCfg = [
    { x: length*0.15, y: -beam*0.4 }, { x: length*0.15, y: beam*0.4 },
    { x: length*0.85, y: -beam*0.4 }, { x: length*0.85, y: beam*0.4 },
  ];
  drainCfg.forEach((c,i)=>{
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8), drainMat);
    d.position.set(0, 0.125, 0);
    const g = new THREE.Group(); g.add(d);
    g.position.set(c.x, deckZ, c.y);
    g.name = `drain_${i}`;
    g.traverse((m)=>{m.castShadow=true;m.receiveShadow=true;});
    deckDetail.add(g);
  });
  group.add(deckDetail);

  return group;
}

