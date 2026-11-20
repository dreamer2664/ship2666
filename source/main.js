// SHIP2666 — Main application: explorable RMS Teutonic (1889) reconstruction.
//
// Editable 3D project: Three.js scene with procedurally generated hull, decks,
// funnels, masts, twin engine rooms, propellers, rudder, spectral ocean, interiors,
// boiler rooms and exterior fittings. Ship state (telegraph/helm/steam/shaft/smoke)
// is the single source of truth and drives all motion kinematically.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { dimensions } from './ship/dimensions.js';
import { buildHull } from './hull/hull.js';
import { buildFittings } from './hull/fittings.js';
import { buildOcean, updateOcean, oceanHeightAt } from './ocean/ocean.js';
import { buildEngine } from './machinery/engine.js';
import { buildInteriors } from './interiors/interiors.js';
import { buildBoiler, buildStokehold } from './machinery/boilers.js';
import {
  shipState, setTelegraph, setHelm, tick, getPistonPhase,
} from './systems/shipState.js';
import { materials, makeMaterial } from './materials/materials.js';

// ---- Configuration ----
const { length, beam, depth } = dimensions;
const DRAFT = 7.2; // m, provisional

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bb8d8);
scene.fog = new THREE.FogExp2(0x8bb8d8, 0.0004);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 5000);
camera.position.set(-length * 0.9, depth * 1.4, length * 0.55);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('viewport').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 2500;

// ---- Lights ----
const hemi = new THREE.HemisphereLight(0xbbe0ee, 0x3a4a5a, 0.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-400, 600, 200);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 50;
sun.shadow.camera.far = 2500;
sun.shadow.camera.left = -800;
sun.shadow.camera.right = 800;
sun.shadow.camera.top = 800;
sun.shadow.camera.bottom = -800;
scene.add(sun);

// ---- Ocean ----
const { ocean, material: oceanMat } = buildOcean({ size: 2600, segments: 140 });
ocean.position.y = 0;
scene.add(ocean);

// ---- Hull ----
const hull = buildHull();
hull.position.set(-length / 2, DRAFT, 0);
hull.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
scene.add(hull);

// ---- Exterior fittings ----
const fittings = buildFittings();
fittings.position.set(-length / 2, 0, 0);
fittings.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
scene.add(fittings);

// Twin engines
const enginePort = buildEngine(-1);
const engineStbd = buildEngine(+1);
engineStbd.position.set(0, DRAFT, 14);
enginePort.position.set(0, DRAFT, -14);
[enginePort, engineStbd].forEach((e) => {
  e.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
  scene.add(e);
});

// ---- Propellers & rudder (stern) ----
const propMat = new THREE.MeshStandardMaterial({ color: 0x7a8288, roughness: 0.3, metalness: 0.85 });
const rudderMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.5, metalness: 0.4 });

const sternX = -length / 2;
const propZ = beam * 0.3;

function buildPropeller(zSign) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 12), propMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 2.6), propMat);
    blade.rotation.y = (b / 4) * Math.PI * 2;
    g.add(blade);
  }
  g.position.set(sternX, DRAFT + 0.9, zSign * propZ);
  g.rotation.y = Math.PI / 2;
  g.userData = { blades: g.children.slice(1) };
  return g;
}
const propPort = buildPropeller(-1);
const propStbd = buildPropeller(+1);
scene.add(propPort);
scene.add(propStbd);

const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 2.6), rudderMat);
rudder.position.set(sternX, DRAFT + 0.9, 0);
rudder.rotation.y = Math.PI / 2;
scene.add(rudder);

// ---- Interiors (positioned within hull local coords; hull offset -length/2 in X) ----
const interiors = buildInteriors();
interiors.position.set(-length / 2, 0, 0);
interiors.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
scene.add(interiors);

// ---- Boiler rooms + stokeholds (lower / tank top) ----
const boilerGroup = new THREE.Group(); boilerGroup.name = 'boilerRooms';
const boilerZ = depth * 0.08;
for (let i = 0; i < 4; i++) {
  const b = buildBoiler();
  b.position.set(-length / 2 + length * (0.12 + i * 0.14), DRAFT + 2.2, (i % 2 === 0 ? -1 : 1) * beam * 0.12);
  boilerGroup.add(b);
  const s = buildStokehold();
  s.position.set(-length / 2 + length * (0.12 + i * 0.14), DRAFT + 0.3, (i % 2 === 0 ? -1 : 1) * beam * 0.35);
  boilerGroup.add(s);
}
boilerGroup.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
scene.add(boilerGroup);

// ---- UI ----
const ui = {
  panel: document.getElementById('ui'),
  status: document.getElementById('status'),
};
function updateUI() {
  const s = shipState;
  ui.status.textContent =
    `Telegraph: ${s.telegraph} | Power: ${(s.engineLoad * 100).toFixed(0)}% | ` +
    `Steam: ${(s.steamPressure * 100).toFixed(0)}% | Shaft: ${s.shaftRpm.toFixed(0)} rpm | ` +
    `Propeller: ${s.propellerState} | Rudder: ${s.rudderAngle.toFixed(0)}\u00b0 | Smoke: ${(s.smokeOutput * 100).toFixed(0)}%`;
}
document.querySelectorAll('[data-telegraph]').forEach((el) => {
  el.addEventListener('click', () => { setTelegraph(el.dataset.telegraph); updateUI(); });
});
const helm = document.getElementById('helm');
helm.addEventListener('input', () => { setHelm(parseFloat(helm.value)); updateUI(); });
setTelegraph('stop');
updateUI();

// ---- Animation ----
let lastTime = null;
window.__shipShaftAngle = 0;

function animate(time) {
  time = time || 0;
  const deltaSec = lastTime === null ? 0 : (time - lastTime) / 1000;
  lastTime = time;

  tick(deltaSec, time);
  window.__shipShaftAngle = shipState.shaftAngle;

  // Ship heave / pitch / roll from ocean surface (mass/inertia approximated).
  const cx = 0, cz = 0;
  const h0 = oceanHeightAt(oceanMat, cx, cz, time);
  const hBow = oceanHeightAt(oceanMat, cx + length * 0.45, cz, time);
  const hStern = oceanHeightAt(oceanMat, cx - length * 0.45, cz, time);
  const hPort = oceanHeightAt(oceanMat, cx, cz + beam * 0.4, time);
  const hStbd = oceanHeightAt(oceanMat, cx, cz - beam * 0.4, time);

  const targetHeave = h0;
  const targetPitch = Math.atan2(hBow - hStern, length * 0.9) * 3;
  const targetRoll = Math.atan2(hStbd - hPort, beam * 0.8) * 2;

  if (!window.__shipHeave) window.__shipHeave = h0;
  if (!window.__shipPitch) window.__shipPitch = 0;
  if (!window.__shipRoll) window.__shipRoll = 0;
  window.__shipHeave += (targetHeave - window.__shipHeave) * 0.05;
  window.__shipPitch += (targetPitch - window.__shipPitch) * 0.05;
  window.__shipRoll += (targetRoll - window.__shipRoll) * 0.05;

  const heaveY = DRAFT + window.__shipHeave;
  const pitch = THREE.MathUtils.degToRad(window.__shipPitch);
  const roll = THREE.MathUtils.degToRad(window.__shipRoll);
  hull.position.y = heaveY;
  hull.rotation.x = pitch;
  hull.rotation.z = roll;
  [enginePort, engineStbd, propPort, propStbd, rudder, interiors, boilerGroup, fittings].forEach((o) => {
    o.position.y = heaveY;
    o.rotation.x = pitch;
    o.rotation.z = roll;
  });

  if (enginePort.tick) enginePort.tick();
  if (engineStbd.tick) engineStbd.tick();

  const spin = (shipState.shaftRpm / 60) * 2 * Math.PI * deltaSec;
  [propPort, propStbd].forEach((p) => {
    p.rotation.y += spin;
    p.children.slice(1).forEach((b) => { b.rotation.y += spin; });
  });

  rudder.rotation.y = Math.PI / 2 + THREE.MathUtils.degToRad(shipState.rudderAngle);

  updateUI();
  updateOcean(ocean, oceanMat, deltaSec, time);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);
