// SHIP2666 — Simplified triple-expansion engine assembly (one side).
//
// Kinematically consistent: a single crankshaft angle drives all three
// pistons (HP/IP/LP) via connecting rods and crossheads. Crank offsets of
// 0, 120, 240 degrees give the three stages opposed phases. Cylinder bore
// decreases HP->IP->LP? No: in triple-expansion, HP is smallest bore, LP is
// largest bore, so cylinder size increases HP < IP < LP. Stroke is shared.
//
// This is a visual/kinematic approximation of the documented 43/68/110 in
// cylinders and 60 in stroke (see source/ship/dimensions.js). It is NOT a
// thermodynamic simulation; labelled as such per brief section 6.

import * as THREE from 'three';
import { getPistonPhase } from '../systems/shipState.js';

const STROKE = 1.524; // 60 in in metres (full travel); piston moves half each side of mid

function crankPinX(angle) { return 0.42 * Math.cos(angle); }
function crankPinZ(angle) { return 0.42 * Math.sin(angle); }

export function buildEngine(side = 1) {
  // side: +1 starboard, -1 port (mirrors the assembly)
  const group = new THREE.Group();
  group.name = `engine_${side === 1 ? 'starboard' : 'port'}`;
  group.position.set(side === 1 ? 2.6 : -2.6, 0.9, 0); // offset from centreline

  const matCrank = new THREE.MeshStandardMaterial({ color: 0x7a8288, roughness: 0.3, metalness: 0.85 });
  const matRod = new THREE.MeshStandardMaterial({ color: 0x6b7278, roughness: 0.4, metalness: 0.7 });
  const matPiston = new THREE.MeshStandardMaterial({ color: 0x9aa5ab, roughness: 0.35, metalness: 0.8 });
  const matCyl = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.6, metalness: 0.5 });
  const matFrame = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7, metalness: 0.5 });

  // Engine bed / frame
  const bed = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 1.4), matFrame);
  bed.position.set(0, 1.0, 0);
  bed.name = 'engineBed';
  group.add(bed);

  // Crankshaft
  const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.2, 12), matCrank);
  crank.rotation.z = Math.PI / 2;
  crank.position.set(0, 1.0, 0);
  crank.name = 'crankshaft';
  group.add(crank);

  const cylinders = [
    { name: 'cyl_HP', bore: 0.55, zOffset: 1.6, crankOffset: 0 },
    { name: 'cyl_IP', bore: 0.86, zOffset: 0.0, crankOffset: 2 * Math.PI / 3 },
    { name: 'cyl_LP', bore: 1.40, zOffset: -1.6, crankOffset: 4 * Math.PI / 3 },
  ];

  cylinders.forEach((cyl) => {
    const cg = new THREE.Group();
    cg.name = cyl.name;

    // Cylinder block (vertical)
    const cylMesh = new THREE.Mesh(new THREE.CylinderGeometry(cyl.bore, cyl.bore, 2.6, 16), matCyl);
    cylMesh.rotation.z = Math.PI / 2;
    cylMesh.position.set(0, 1.0, cyl.zOffset);
    cg.add(cylMesh);

    // Piston (crosshead + piston rod inside cylinder)
    const piston = new THREE.Mesh(new THREE.BoxGeometry(cyl.bore * 0.75, 0.3, cyl.bore * 0.75), matPiston);
    piston.position.set(0, 1.0, cyl.zOffset);
    piston.name = `${cyl.name}_piston`;
    cg.add(piston);

    // Connecting rod: from crank pin to crosshead above piston
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10), matRod);
    rod.name = `${cyl.name}_rod`;
    cg.add(rod);

    // Crosshead guide block
    const guide = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x7a8288, roughness: 0.4, metalness: 0.7 }));
    guide.position.set(0, 1.8, cyl.zOffset);
    guide.name = `${cyl.name}_guide`;
    cg.add(guide);

    // Store update refs
    cg.userData = { piston, rod, guide, cyl, phase: cyl.crankOffset, side };
    group.add(cg);
  });

  group.tick = () => {
    const angle = THREE.MathUtils.euclideanModulo(window.__shipShaftAngle || 0, Math.PI * 2);
    crank.rotation.z = angle;

    group.children.forEach((cg) => {
      if (!cg.userData.piston) return;
      const { piston, rod, guide, cyl, phase, side } = cg.userData;
      const a = angle + phase;
      // Piston phase 0..1 -> vertical travel centred on mid-stroke
      const phase01 = 0.5 * (1 + Math.cos(a));
      const travel = STROKE * 0.5;
      const y = 1.0 + travel + (phase01 - 0.5) * 2 * travel;
      piston.position.y = y;
      guide.position.y = y + 0.8;

      // Crank pin position
      const px = crankPinX(a) * side;
      const pz = crankPinZ(a);
      // Rod connects crank pin (at crankshaft z axis, here along X) to crosshead.
      // Simplify: rod from crank pin to above piston.
      const cx = 0;
      const cz = cyl.zOffset;
      const rx = (px + cx) / 2;
      const ry = (1.0 + y) / 2;
      const rz = (pz + cz) / 2;
      const dx = px - cx;
      const dy = y - 1.0;
      const dz = pz - cz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      rod.scale.set(1, 1, len / 1.0);
      rod.position.set(rx, ry, rz);
      // Point rod from crank pin to crosshead
      rod.lookAt(new THREE.Vector3(px, y, pz));
      rod.rotation.z += Math.PI / 2;
    });
  };

  return group;
}
