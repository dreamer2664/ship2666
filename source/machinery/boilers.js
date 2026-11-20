// SHIP2666 — Boiler & stokehold assembly (one double-ended boiler group).
//
// 12 cylindrical multi-tubular steel boilers, 180 psi working pressure
// (Titanic Belfast, TEUTONIC-SPECIFIC/HIGH). Arranged in boiler rooms as
// documented in space_inventory.csv. Pass B geometry: boiler shells, furnaces,
// firebox doors, dampers, steam outlets, ash spaces. Kinematic state (firing)
// driven by shipState smokeOutput; NOT a thermodynamic simulation.

import * as THREE from 'three';
import { materials, makeMaterial } from '../materials/materials.js';

const boilerShell = makeMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.65 });
const furnaceMat = makeMaterial({ color: 0x2a1a1a, roughness: 0.8, metalness: 0.2 });
const brassMat = makeMaterial({ color: 0xc9a65c, roughness: 0.45, metalness: 0.9 });

export function buildBoiler() {
  const g = new THREE.Group(); g.name = 'doubleEndedBoiler';
  // Cylindrical shell (horizontal)
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 6.2, 20), boilerShell);
  shell.rotation.z = Math.PI / 2;
  shell.position.set(0, 0, 0);
  g.add(shell);
  // Two furnace / firebox doors (double-ended -> one at each end)
  ['-', '+'].forEach((sgn) => {
    const mult = sgn === '-' ? -1 : 1;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.14), makeMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 }));
    door.position.set(mult * 3.0, 0, 0);
    door.rotation.z = Math.PI / 2;
    g.add(door);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.45, 0.2), brassMat);
    frame.position.set(mult * 3.0, 0, 0);
    frame.rotation.z = Math.PI / 2;
    g.add(frame);
  });
  // Steam dome / outlets on top
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 14), brassMat);
  dome.position.set(0, 1.7, 0.6);
  g.add(dome);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 12), brassMat);
  valve.position.set(0, 2.05, 0.6);
  g.add(valve);
  // Manholes
  const manhole = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 16), makeMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 }));
  manhole.position.set(0, 0, 1.72);
  g.add(manhole);
  g.tick = (smokeOutput) => {
    // visual stokehold glow approximated by material emissive-ish scale; kept simple
    // (no emissive in MeshStandardMaterial here; smoke driven by shipState in main)
  };
  return g;
}

export function buildStokehold() {
  const g = new THREE.Group(); g.name = 'stokehold';
  // Coal floor
  const coal = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 5), makeMaterial(materials.coal));
  coal.position.set(0, 0.1, 0);
  g.add(coal);
  // Firemen's working space floor marking
  const walk = new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, 4), makeMaterial({ color: 0x3a2a1a, roughness: 0.9, metalness: 0.0 }));
  walk.position.set(0, 0.125, 0);
  g.add(walk);
  // Ash pit / bunker edge
  const pit = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), makeMaterial({ color: 0x121212, roughness: 0.95, metalness: 0.1 }));
  pit.position.set(3.4, 0.2, 0);
  g.add(pit);
  return g;
}
