// SHIP2666 — Named inspection cameras for render generations.
//
// Controlled, repeatable camera + lighting setups so successive generations can
// be compared fairly (brief section 9). All positions are in world metres;
// the ship hull spans X from -length/2 (stern/AP) to +length/2 (bow/FP),
// Z keel-up, Y port(-)/starboard(+).
//
// These are configuration data, not the live OrbitControls camera. A render
// capture pipeline (headless browser / render farm) applies each named camera
// to the scene and writes an inspection image to renders/genN/.

import * as THREE from 'three';
import { dimensions } from '../ship/dimensions.js';

const { length, beam, depth } = dimensions;
const DRAFT = 7.2;

// Lighting environments reused across generations.
export const lightingEnvironments = {
  daylight: {
    hemi: { color: 0xbbe0ee, ground: 0x3a4a5a, intensity: 0.55 },
    sun: { color: 0xffffff, intensity: 0.9, position: [-400, 600, 200] },
    fog: { color: 0x8bb8d8, density: 0.0004 },
  },
  overcast: {
    hemi: { color: 0xa8b8c8, ground: 0x3a3a40, intensity: 0.7 },
    sun: { color: 0xffffff, intensity: 0.35, position: [-200, 300, 100] },
    fog: { color: 0x9aa8b8, density: 0.0006 },
  },
  dusk: {
    hemi: { color: 0x5a5a70, ground: 0x2a2a30, intensity: 0.45 },
    sun: { color: 0xffaa70, intensity: 0.5, position: [-300, 250, -150] },
    fog: { color: 0x4a4a5a, density: 0.0008 },
  },
};

// Camera rig: id -> { position, lookAt, description, area }
export const cameras = {
  // ---- Exterior full-ship views ----
  cam_port_bow: {
    position: new THREE.Vector3(-length * 0.85, depth * 1.3, length * 0.5),
    lookAt: new THREE.Vector3(length * 0.1, DRAFT, 0),
    desc: 'Port bow full-ship',
    area: 'exterior',
  },
  cam_stbd_bow: {
    position: new THREE.Vector3(-length * 0.85, depth * 1.3, -length * 0.5),
    lookAt: new THREE.Vector3(length * 0.1, DRAFT, 0),
    desc: 'Starboard bow full-ship',
    area: 'exterior',
  },
  cam_port_broadside: {
    position: new THREE.Vector3(0, depth * 1.1, length * 0.95),
    lookAt: new THREE.Vector3(length / 2, DRAFT, 0),
    desc: 'Port broadside full-ship',
    area: 'exterior',
  },
  cam_stbd_broadside: {
    position: new THREE.Vector3(0, depth * 1.1, -length * 0.95),
    lookAt: new THREE.Vector3(-length / 2, DRAFT, 0),
    desc: 'Starboard broadside full-ship',
    area: 'exterior',
  },
  cam_stern: {
    position: new THREE.Vector3(-length * 0.92, depth * 0.9, 0),
    lookAt: new THREE.Vector3(-length * 0.35, DRAFT, 0),
    desc: 'Stern view (rudder, propellers)',
    area: 'exterior',
  },
  cam_elevated: {
    position: new THREE.Vector3(length * 0.05, depth * 2.2, length * 0.45),
    lookAt: new THREE.Vector3(length * 0.15, DRAFT, 0),
    desc: 'Elevated exterior (deck arrangement)',
    area: 'exterior',
  },
  cam_deck_level: {
    position: new THREE.Vector3(length * 0.2, DRAFT + 1.2, length * 0.3),
    lookAt: new THREE.Vector3(length * 0.5, DRAFT + 1.2, 0),
    desc: 'Deck-level exterior (freeboard, fittings)',
    area: 'exterior',
  },

  // ---- Decks and fittings ----
  cam_main_deck: {
    position: new THREE.Vector3(length * 0.3, depth * 0.55, length * 0.1),
    lookAt: new THREE.Vector3(length * 0.35, DRAFT + 3.0, 0),
    desc: 'Main deck fittings',
    area: 'deck',
  },
  cam_boat_deck: {
    position: new THREE.Vector3(length * 0.5, depth * 0.9, length * 0.05),
    lookAt: new THREE.Vector3(length * 0.55, DRAFT + 11.4, 0),
    desc: 'Boat deck (funnels, masts, bridge)',
    area: 'deck',
  },

  // ---- Passenger public rooms ----
  cam_dining_saloon: {
    position: new THREE.Vector3(length * 0.30 + 12, DRAFT + 3.8 + 1.4, beam * 0.25 + 8),
    lookAt: new THREE.Vector3(length * 0.30, DRAFT + 3.8, beam * 0.25),
    desc: '1st class dining saloon',
    area: 'interior_public',
  },
  cam_smoking_saloon: {
    position: new THREE.Vector3(length * 0.30 + 7, DRAFT + 3.6 + 1.2, beam * 0.1 + 7),
    lookAt: new THREE.Vector3(length * 0.30, DRAFT + 3.6, beam * 0.1),
    desc: '1st class smoking saloon',
    area: 'interior_public',
  },
  cam_grand_staircase: {
    position: new THREE.Vector3(length * 0.30, DRAFT + 6.0 + 2.0, beam * 0.05 + 4),
    lookAt: new THREE.Vector3(length * 0.30, DRAFT + 6.0, beam * 0.05),
    desc: 'Grand staircase (all decks)',
    area: 'interior_public',
  },

  // ---- Representative cabins per class ----
  cam_cabin_1st_A: {
    position: new THREE.Vector3(length * 0.45 + 1.8, DRAFT + 2.5 + 1.0, beam * 0.35 + 1.6),
    lookAt: new THREE.Vector3(length * 0.45, DRAFT + 2.5, beam * 0.35),
    desc: '1st class stateroom grade A',
    area: 'interior_cabin',
  },
  cam_cabin_1st_C: {
    position: new THREE.Vector3(length * 0.45 + 1.8, DRAFT + 2.5 + 0.9, beam * 0.35 + 1.5),
    lookAt: new THREE.Vector3(length * 0.45, DRAFT + 2.5, beam * 0.35),
    desc: '1st class stateroom grade C',
    area: 'interior_cabin',
  },
  cam_cabin_2nd: {
    position: new THREE.Vector3(length * 0.62 + 1.9, DRAFT + 6.0 + 0.9, beam * 0.25 + 1.5),
    lookAt: new THREE.Vector3(length * 0.62, DRAFT + 6.0, beam * 0.25),
    desc: '2nd class stateroom',
    area: 'interior_cabin',
  },
  cam_cabin_3rd: {
    position: new THREE.Vector3(length * 0.18 + 7, DRAFT + 2.4 + 0.9, -beam * 0.15 + 4.5),
    lookAt: new THREE.Vector3(length * 0.18, DRAFT + 2.4, -beam * 0.15),
    desc: '3rd class dormitory',
    area: 'interior_cabin',
  },

  // ---- Crew / service ----
  cam_galley: {
    position: new THREE.Vector3(length * 0.78 + 4, DRAFT + 3.0 + 1.1, -beam * 0.3 + 3.5),
    lookAt: new THREE.Vector3(length * 0.78, DRAFT + 3.0, -beam * 0.3),
    desc: 'Galley / service',
    area: 'interior_service',
  },
  cam_crew_mess: {
    position: new THREE.Vector3(length * 0.90 + 5, DRAFT + 2.6 + 0.9, beam * 0.2 + 3.5),
    lookAt: new THREE.Vector3(length * 0.90, DRAFT + 2.6, beam * 0.2),
    desc: 'Crew mess',
    area: 'interior_service',
  },

  // ---- Machinery ----
  cam_engine_room: {
    position: new THREE.Vector3(length * 0.22 + 7, DRAFT + 4.5 + 1.5, beam * 0.1 + 4.5),
    lookAt: new THREE.Vector3(length * 0.22, DRAFT + 4.5, beam * 0.1),
    desc: 'Engine room (triple-expansion)',
    area: 'machinery',
  },
  cam_boiler_room: {
    position: new THREE.Vector3(length * 0.45 + 7, DRAFT + 4.2 + 1.3, -beam * 0.05 + 4),
    lookAt: new THREE.Vector3(length * 0.45, DRAFT + 4.2, -beam * 0.05),
    desc: 'Boiler room / stokehold',
    area: 'machinery',
  },
  cam_shaft_alley: {
    position: new THREE.Vector3(-length * 0.35, DRAFT + 3.6 + 0.9, beam * 0.15),
    lookAt: new THREE.Vector3(-length * 0.1, DRAFT + 3.6, beam * 0.15),
    desc: 'Shaft alley (aft)',
    area: 'machinery',
  },
  cam_rudder_propeller: {
    position: new THREE.Vector3(-length * 0.95, DRAFT + 1.0 + 1.5, beam * 0.35),
    lookAt: new THREE.Vector3(-length * 0.45, DRAFT + 1.0, 0),
    desc: 'Rudder, stern tube, propellers',
    area: 'machinery',
  },

  // ---- Cutaways ----
  cam_cutaway_longitudinal: {
    position: new THREE.Vector3(length * 0.05, depth * 1.4, -length * 0.75),
    lookAt: new THREE.Vector3(length * 0.2, DRAFT + 4.0, 0),
    desc: 'Transverse cutaway (internal arrangement)',
    area: 'cutaway',
  },
  cam_cutaway_transverse: {
    position: new THREE.Vector3(length * 0.3, depth * 1.0, length * 0.55),
    lookAt: new THREE.Vector3(length * 0.3, DRAFT + 4.0, 0),
    desc: 'Longitudinal cutaway (deck stack)',
    area: 'cutaway',
  },

  // ---- Detail close-ups ----
  cam_detail_hull_plate: {
    position: new THREE.Vector3(-length * 0.4, DRAFT + 1.6, length * 0.42),
    lookAt: new THREE.Vector3(-length * 0.42, DRAFT + 1.6, length * 0.4),
    desc: 'Close-up: hull plate courses / strakes',
    area: 'detail',
  },
  cam_detail_porthole: {
    position: new THREE.Vector3(length * 0.1, DRAFT + 3.6 - 0.9 + 0.45, length * 0.43),
    lookAt: new THREE.Vector3(length * 0.1, DRAFT + 3.6 - 0.9, length * 0.42),
    desc: 'Close-up: porthole and hull reveal',
    area: 'detail',
  },
  cam_detail_railing: {
    position: new THREE.Vector3(length * 0.3, depth * 0.5, beam * 0.48),
    lookAt: new THREE.Vector3(length * 0.32, DRAFT + 11.4 + 1.0, beam * 0.48),
    desc: 'Close-up: railings and stanchions',
    area: 'detail',
  },
  cam_detail_door: {
    position: new THREE.Vector3(length * 0.30 - 17 + 4.5, DRAFT + 3.0 + 1.1, 1.3 + 0.6),
    lookAt: new THREE.Vector3(length * 0.30 - 17 + 4.5, DRAFT + 3.0, 1.3),
    desc: 'Close-up: door and frame',
    area: 'detail',
  },
  cam_detail_engine: {
    position: new THREE.Vector3(length * 0.22 + 1, DRAFT + 4.5 + 0.9, beam * 0.1 + 1.2),
    lookAt: new THREE.Vector3(length * 0.22, DRAFT + 4.5, beam * 0.1),
    desc: 'Close-up: engine cylinder / crank',
    area: 'detail',
  },
};

// Ordered list of camera IDs for a complete generation sweep.
export const cameraOrder = [
  'cam_port_bow', 'cam_stbd_bow', 'cam_port_broadside', 'cam_stbd_broadside',
  'cam_stern', 'cam_elevated', 'cam_deck_level',
  'cam_main_deck', 'cam_boat_deck',
  'cam_dining_saloon', 'cam_smoking_saloon', 'cam_grand_staircase',
  'cam_cabin_1st_A', 'cam_cabin_1st_C', 'cam_cabin_2nd', 'cam_cabin_3rd',
  'cam_galley', 'cam_crew_mess',
  'cam_engine_room', 'cam_boiler_room', 'cam_shaft_alley', 'cam_rudder_propeller',
  'cam_cutaway_longitudinal', 'cam_cutaway_transverse',
  'cam_detail_hull_plate', 'cam_detail_porthole', 'cam_detail_railing',
  'cam_detail_door', 'cam_detail_engine',
];

export function getCamera(id) {
  return cameras[id];
}
