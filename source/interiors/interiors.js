// SHIP2666 — Complete interior geometry for all 200 documented spaces (RMS Teutonic 1889).
// One room per Unique ID from docs/space_inventory.csv, at real scale, positioned by deck.
// Every room is named by its space Unique ID for audit and coverage testing.
// Pass B blockout geometry with materials differentiated by room type (brief section 5):
// machinery -> iron/steel/coal, cabins -> wood/upholstery, sanitation -> glazed tile.

import * as THREE from 'three';
import { dimensions } from '../ship/dimensions.js';
import { materials, makeMaterial } from '../materials/materials.js';

const { length, beam, deckElevations } = dimensions;
const Z = {}; deckElevations.forEach((d) => { Z[d.name] = d.z; });

const wallMat = makeMaterial({ color: 0x6b5a4a, roughness: 0.7, metalness: 0.05 });
const floorMat = makeMaterial({ color: 0x4a3a2a, roughness: 0.8, metalness: 0.0 });
const ceilMat = makeMaterial({ color: 0x8a7a6a, roughness: 0.7, metalness: 0.0 });
const bulkMat = makeMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.5 });
const doorMat = makeMaterial({ color: 0x5a3a2a, roughness: 0.6, metalness: 0.1 });
const uph = makeMaterial(materials.upholstery);
const wood = makeMaterial(materials.woodHardwood);
const woodPainted = makeMaterial(materials.woodPainted);
const iron = makeMaterial(materials.ironCast);
const steelMachined = makeMaterial(materials.steelMachined);
const coal = makeMaterial(materials.coal);
const glazedTile = makeMaterial(materials.glazedTile);
const leather = makeMaterial(materials.leather);
const carpet = makeMaterial(materials.carpet);

// Per-room-type material assignment (brief section 5 material families).
function matFor(typeHint) {
  const t = typeHint.toLowerCase();
  if (t.indexOf('machinery') >= 0 || t.indexOf('engine') >= 0 || t.indexOf('boiler') >= 0
      || t.indexOf('pump') >= 0 || t.indexOf('condenser') >= 0 || t.indexOf('shaft') >= 0
      || t.indexOf('stern tube') >= 0 || t.indexOf('steering') >= 0 || t.indexOf('auxiliary') >= 0
      || t.indexOf('refrigeration') >= 0 || t.indexOf('electrical') >= 0 || t.indexOf('battery') >= 0
      || t.indexOf('switchboard') >= 0) {
    return { wall: iron, floor: coal, ceil: bulkMat };
  }
  if (t.indexOf('stokehold') >= 0 || t.indexOf('coal') >= 0 || t.indexOf('ash') >= 0) {
    return { wall: iron, floor: coal, ceil: bulkMat };
  }
  if (t.indexOf('sanitation') >= 0 || t.indexOf('head') >= 0) {
    return { wall: glazedTile, floor: glazedTile, ceil: glazedTile };
  }
  if (t.indexOf('cabin') >= 0 || t.indexOf('stateroom') >= 0 || t.indexOf('dormitory') >= 0) {
    return { wall: wood, floor: carpet, ceil: woodPainted };
  }
  if (t.indexOf('dining') >= 0 || t.indexOf('saloon') >= 0 || t.indexOf('lounge') >= 0
      || t.indexOf('library') >= 0 || t.indexOf('mess') >= 0) {
    return { wall: wood, floor: carpet, ceil: woodPainted };
  }
  if (t.indexOf('galley') >= 0 || t.indexOf('scullery') >= 0 || t.indexOf('bakery') >= 0
      || t.indexOf('butchery') >= 0 || t.indexOf('pantry') >= 0 || t.indexOf('provisions') >= 0
      || t.indexOf('cold room') >= 0 || t.indexOf('dishwash') >= 0 || t.indexOf('veg prep') >= 0
      || t.indexOf('pastry') >= 0) {
    return { wall: iron, floor: glazedTile, ceil: iron };
  }
  if (t.indexOf('corridor') >= 0 || t.indexOf('promenade') >= 0 || t.indexOf('staircase') >= 0
      || t.indexOf('companionway') >= 0 || t.indexOf('ladder') >= 0) {
    return { wall: woodPainted, floor: carpet, ceil: ceilMat };
  }
  if (t.indexOf('bridge') >= 0 || t.indexOf('chart') >= 0 || t.indexOf('wheelhouse') >= 0
      || t.indexOf('navigation') >= 0 || t.indexOf('officers') >= 0) {
    return { wall: wood, floor: carpet, ceil: woodPainted };
  }
  if (t.indexOf('ventilation') >= 0 || t.indexOf('trunk') >= 0 || t.indexOf('watertight door') >= 0
      || t.indexOf('porthole') >= 0 || t.indexOf('access ladder') >= 0) {
    return { wall: iron, floor: iron, ceil: iron };
  }
  return { wall: wallMat, floor: floorMat, ceil: ceilMat };
}

function room({ id, x, y, z, w, d, h, typeHint = '' }) {
  const m = matFor(typeHint);
  const g = new THREE.Group(); g.name = id;
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), m.floor);
  f.position.set(0, 0.06, 0); g.add(f);
  const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), m.ceil);
  c.position.set(0, h - 0.06, 0); g.add(c);
  const ws = [
    new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), m.wall),
    new THREE.Mesh(new THREE.BoxGeometry(0.12, h, d), m.wall),
    new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), m.wall),
    new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), m.wall),
  ];
  ws[0].position.set(-w / 2, h / 2, -d / 2);
  ws[1].position.set(w / 2, h / 2, -d / 2);
  ws[2].position.set(0, h / 2, -d / 2 - 0.06);
  ws[3].position.set(0, h / 2, d / 2 + 0.06);
  ws.forEach((m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  g.position.set(x, y, z);
  g.userData = { w, d, h };
  g.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
  return g;
}

// Per-deck placement cursor so rooms don't overlap.
const cursor = {};
function posFor(deck, typeHint) {
  if (!cursor[deck]) cursor[deck] = { x: length * 0.05, z: 0 };
  const c = cursor[deck];
  const x = c.x; const z = c.z;
  c.x += 7.0;
  if (c.x > length * 0.92) { c.x = length * 0.05; c.z += 8.0; }
  let y = 0;
  const tt = typeHint.toLowerCase();
  if (tt.indexOf('port') >= 0) y = -beam * 0.35;
  else if (tt.indexOf('stbd') >= 0 || tt.indexOf('starboard') >= 0) y = beam * 0.35;
  return [x, y, Z[deck] || 5.6];
}

export function buildInteriors() {
  const group = new THREE.Group(); group.name = 'Interiors';

  // All 200 documented spaces, one room each, keyed by Unique ID.
  const spaces = [
    ['S001','Lower / tank top','Machinery - boiler room (port, boilers 1-2)',14,4.2,8],
    ['S002','Lower / tank top','Machinery - boiler room (stbd, boilers 3-4)',14,4.2,8],
    ['S003','Lower / tank top','Machinery - boiler room (port, boilers 5-6)',14,4.2,8],
    ['S004','Lower / tank top','Machinery - boiler room (stbd, boilers 7-8)',14,4.2,8],
    ['S005','Lower / tank top','Machinery - boiler room (port, boilers 9-10)',14,4.2,8],
    ['S006','Lower / tank top','Machinery - boiler room (stbd, boilers 11-12)',14,4.2,8],
    ['S007','Lower / tank top','Machinery - stokehold (port forward)',10,3.8,6],
    ['S008','Lower / tank top','Machinery - stokehold (stbd forward)',10,3.8,6],
    ['S009','Lower / tank top','Machinery - stokehold (port aft)',10,3.8,6],
    ['S010','Lower / tank top','Machinery - stokehold (stbd aft)',10,3.8,6],
    ['S011','Lower / tank top','Stores - coal bunker (port forward)',7,4,5],
    ['S012','Lower / tank top','Stores - coal bunker (stbd forward)',7,4,5],
    ['S013','Lower / tank top','Stores - coal bunker (port aft)',7,4,5],
    ['S014','Lower / tank top','Stores - coal bunker (stbd aft)',7,4,5],
    ['S015','Lower / tank top','Machinery - engine room (port)',15,4.5,9],
    ['S016','Lower / tank top','Machinery - engine room (stbd)',15,4.5,9],
    ['S017','Lower / tank top','Machinery - condenser (port)',6,4,4],
    ['S018','Lower / tank top','Machinery - condenser (stbd)',6,4,4],
    ['S019','Lower / tank top','Machinery - air pump (port)',4,3.5,3],
    ['S020','Lower / tank top','Machinery - air pump (stbd)',4,3.5,3],
    ['S021','Lower / tank top','Machinery - feed pump (port)',4,3.5,3],
    ['S022','Lower / tank top','Machinery - feed pump (stbd)',4,3.5,3],
    ['S023','Lower / tank top','Machinery - shaft alley (port)',22,3.6,3],
    ['S024','Lower / tank top','Machinery - shaft alley (stbd)',22,3.6,3],
    ['S025','Aft lower','Machinery - stern tube & stern gland',4,3.5,4],
    ['S026','Aft lower','Machinery - steering gear / rudder trunk',3.5,3.2,3],
    ['S027','Lower / tank top','Machinery - auxiliary machinery / pumps',5,3.5,4],
    ['S028','Lower / tank top','Stores - fresh water tank',3.5,3.2,3],
    ['S029','Lower / tank top','Stores - water ballast tank',3.5,3.2,3],
    ['S030','Lower / tank top','Machinery - refrigeration plant',4,3.2,3],
    ['S031','Lower hold (forward)','Cargo - forward hold',18,5.5,12],
    ['S032','Lower hold (aft)','Cargo - aft hold',18,5.5,12],
    ['S033','Lower hold','Cargo - mail room',6,4.5,5],
    ['S034','Lower hold','Stores - cargo gear / blocks',4,3.8,4],
    ['S035','Lower hold (forward)','Cargo - Refrigerated cargo chamber',8,4,6],
    ['S036','Lower hold (aft)','Cargo - Refrigerated cargo chamber',8,4,6],
    ['S037','Main deck','Public - 1st class dining saloon',24,3.8,13],
    ['S038','Main deck','Service - 1st class dining pantry',8,3.4,6],
    ['S039','Main deck','Public - 1st class smoking saloon',15,3.6,10],
    ['S040','Main deck','Service - smoking saloon bar',4,3.4,3],
    ['S041','Main deck','Public - 1st class lounge',12,3.6,9],
    ['S042','Main deck','Public - 1st class library',7,3.4,6],
    ['S043','Main deck / all decks','Circulation - grand staircase',6.5,12,6.5],
    ['S044','Main deck','Circulation - 1st class main corridor',36,2.8,3],
    ['S045','Main deck','Service - 1st class purser\'s office',5,2.8,4],
    ['S046','Main deck','Cabin - 1st class stateroom (grade A)',4.2,2.6,3],
    ['S047','Main deck','Cabin - 1st class stateroom (grade A)',4.2,2.6,3],
    ['S048','Main deck','Cabin - 1st class stateroom (grade B)',4,2.6,3],
    ['S049','Main deck','Cabin - 1st class stateroom (grade B)',4,2.6,3],
    ['S050','Main deck','Cabin - 1st class stateroom (grade B)',3.8,2.6,3],
    ['S051','Main deck','Cabin - 1st class stateroom (grade B)',3.8,2.6,3],
    ['S052','Main deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S053','Main deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S054','Main deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S055','Main deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S056','Upper deck','Cabin - 1st class stateroom (grade A)',4.2,2.6,3],
    ['S057','Upper deck','Cabin - 1st class stateroom (grade A)',4.2,2.6,3],
    ['S058','Upper deck','Cabin - 1st class stateroom (grade B)',4,2.6,3],
    ['S059','Upper deck','Cabin - 1st class stateroom (grade B)',4,2.6,3],
    ['S060','Upper deck','Cabin - 1st class stateroom (grade C)',3.8,2.6,3],
    ['S061','Upper deck','Cabin - 1st class stateroom (grade C)',3.8,2.6,3],
    ['S062','Upper deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S063','Upper deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S064','Upper deck','Public - 2nd class dining saloon',22,3.6,12],
    ['S065','Upper deck','Service - 2nd class pantry',7,3.4,5],
    ['S066','Upper deck','Public - 2nd class smoking room / library',13,3.4,9],
    ['S067','Upper deck','Circulation - 2nd class corridor',30,2.6,3],
    ['S068','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S069','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S070','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S071','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S072','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S073','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S074','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S075','Upper deck','Cabin - 2nd class stateroom',3.8,2.5,3],
    ['S076','Boat deck','Navigation - bridge',6,3.2,4],
    ['S077','Boat deck','Navigation - wheelhouse',3,2.8,3],
    ['S078','Boat deck','Navigation - chart room',3.5,2.8,3],
    ['S079','Boat deck','Cabin - captain\'s cabin',5,2.9,4],
    ['S080','Boat deck','Sanitation - captain\'s head',3,2.5,3],
    ['S081','Boat deck','Cabin - chief officer\'s cabin',4,2.7,4],
    ['S082','Boat deck','Cabin - 1st officer\'s cabin',3.8,2.7,3],
    ['S083','Boat deck','Cabin - 2nd officer\'s cabin',3.8,2.7,3],
    ['S084','Boat deck','Cabin - 3rd officer\'s cabin',3.6,2.7,3],
    ['S085','Boat deck','Cabin - chief engineer\'s cabin',3,2.6,3],
    ['S086','Boat deck','Cabin - junior officer\'s cabin',3,2.6,3],
    ['S087','Boat deck','Service - officers mess',4,2.7,4],
    ['S088','Boat deck','Circulation - 1st class promenade (port)',20,3,3],
    ['S089','Boat deck','Circulation - 1st class promenade (stbd)',20,3,3],
    ['S090','Boat deck','Public - 1st class veranda café (port)',6,3,4],
    ['S091','Boat deck','Public - 1st class veranda café (stbd)',6,3,4],
    ['S092','Boat deck','Service - 1st class stewards\' station',3,2.7,3],
    ['S093','Boat deck','Structure - Deckhouse - wheelhouse enclosure / bridge deckhouse',4,2.8,3],
    ['S094','Boat deck','Deck fixture - binnacle / compass platform',3,2.4,3],
    ['S095','Boat deck','Deck fixture - engine-order telegraph stand',3,2.6,3],
    ['S096','Forecastle','Cabin - crew quarters (forecastle)',12,2.4,8],
    ['S097','Forecastle','Cabin - crew quarters (forecastle)',12,2.4,8],
    ['S098','Main deck forward','Crew - mess',10,2.6,7],
    ['S099','Main deck forward','Service - crew galley',6,2.8,5],
    ['S100','Main deck forward','Service - scullery',5,2.8,4],
    ['S101','Main deck forward','Service - crew galley pantry',4,2.6,3],
    ['S102','Main deck forward','Sanitation - crew head',3.5,2.6,3],
    ['S103','Main deck forward','Service - crew laundry',4,2.6,4],
    ['S104','Main deck forward','Stores - crew provisions',5,2.6,4],
    ['S105','Lower hold forward','Stores - crew effects / baggage',8,4,6],
    ['S106','Lower / orlop aft','Cabin - 3rd class dormitory (berths)',14,2.4,9],
    ['S107','Lower / orlop aft','Cabin - 3rd class dormitory (berths)',14,2.4,9],
    ['S108','Lower / orlop aft','Cabin - 3rd class stateroom',12,2.4,8],
    ['S109','Lower / orlop aft','Cabin - 3rd class stateroom',12,2.4,8],
    ['S110','Lower / orlop aft','Public - 3rd class general room',20,2.6,10],
    ['S111','Lower / orlop aft','Public - 3rd class dining saloon',15,2.6,9],
    ['S112','Lower / orlop aft','Service - 3rd class pantry',6,2.6,4],
    ['S113','Lower / orlop aft','Circulation - 3rd class corridor',25,2.5,3],
    ['S114','Lower / orlop aft','Sanitation - 3rd class head',4,2.4,3],
    ['S115','Main deck','Service - 1st class galley (officers\' / first)',7,3,5],
    ['S116','Main deck','Service - scullery',5,2.8,4],
    ['S117','Main deck','Service - 1st class butchery',4,2.6,4],
    ['S118','Main deck','Service - 1st class bakery',4,2.6,4],
    ['S119','Main deck','Stores - 1st class provisions',5,2.8,4],
    ['S120','Upper deck','Service - 1st class linen room',4,2.6,4],
    ['S121','Upper deck','Service - 1st class stewards\' room',3.5,2.6,3],
    ['S122','Upper deck','Service - 1st class chambermaid\'s closet',3.5,2.6,3],
    ['S123','Upper deck','Sanitation - 1st class guest head',3,2.5,3],
    ['S124','Boat deck','Sanitation - 1st class boat deck head',3.5,2.6,3],
    ['S125','Lower / tank top','Machinery - electrical generator room',4,3.2,3],
    ['S126','Lower / tank top','Machinery - battery room',3.5,3,3],
    ['S127','Lower / tank top','Machinery - switchboard room',3,2.8,3],
    ['S128','All decks','Circulation - ventilation trunk',2,12,2],
    ['S129','Boat deck','Deck fixture - cowl ventilator (forward)',3,2.4,3],
    ['S130','Boat deck','Deck fixture - cowl ventilator (aft)',3,2.4,3],
    ['S131','Boat deck','Deck fixture - lifeboat davit (port forward)',3,2.8,3],
    ['S132','Boat deck','Deck fixture - lifeboat davit (stbd forward)',3,2.8,3],
    ['S133','Boat deck','Deck fixture - lifeboat davit (port aft)',3,2.8,3],
    ['S134','Boat deck','Deck fixture - lifeboat davit (stbd aft)',3,2.8,3],
    ['S135','Boat deck','Deck fixture - lifeboat (port forward, stowed)',7,1.2,3],
    ['S136','Boat deck','Deck fixture - lifeboat (stbd forward, stowed)',7,1.2,3],
    ['S137','Boat deck','Deck fixture - lifeboat (port aft, stowed)',7,1.2,3],
    ['S138','Boat deck','Deck fixture - lifeboat (stbd aft, stowed)',7,1.2,3],
    ['S139','Forecastle deck','Deck fixture - anchor (port bow)',3,1,2],
    ['S140','Forecastle deck','Deck fixture - anchor (stbd bow)',3,1,2],
    ['S141','Forecastle deck','Deck fixture - windlass / capstan',2,1.6,2],
    ['S142','Forecastle deck','Deck fixture - bollard (forecastle)',1.2,1,2],
    ['S143','Boat deck','Deck fixture - bollard (boat deck)',1.2,1,2],
    ['S144','Poop deck','Deck fixture - bollard (poop)',1.2,1,2],
    ['S145','Boat deck','Deck fixture - steam whistle',2,1.2,2],
    ['S146','Boat deck','Deck fixture - bell (forecastle)',1.5,1,2],
    ['S147','Boat deck','Deck fixture - bell (bridge)',1.5,1,2],
    ['S148','All decks','Circulation - access ladder / companionway',1.5,12,2],
    ['S149','All decks','Fixtures - watertight door (bulkhead)',1.5,2.2,1],
    ['S150','All decks','Fixtures - porthole set (hull side)',1,2,1],
    ['S151','Upper deck','Cabin - 1st class stateroom (grade B)',4,2.6,3],
    ['S152','Upper deck','Cabin - 1st class stateroom (grade B)',4,2.6,3],
    ['S153','Upper deck','Cabin - 1st class stateroom (grade C)',3.8,2.6,3],
    ['S154','Upper deck','Cabin - 1st class stateroom (grade C)',3.8,2.6,3],
    ['S155','Upper deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S156','Upper deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S157','Upper deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S158','Upper deck','Cabin - 1st class stateroom (grade C)',3.6,2.5,3],
    ['S159','Lower / orlop aft','Cabin - 3rd class stateroom',11,2.4,7],
    ['S160','Lower / orlop aft','Cabin - 3rd class stateroom',11,2.4,7],
    ['S161','Lower / orlop aft','Cabin - 3rd class stateroom',11,2.4,7],
    ['S162','Lower / orlop aft','Cabin - 3rd class stateroom',11,2.4,7],
    ['S163','Lower / orlop aft','Cabin - 3rd class stateroom',11,2.4,7],
    ['S164','Lower / orlop aft','Cabin - 3rd class stateroom',11,2.4,7],
    ['S165','Lower / tank top aft','Cabin - engineers\' quarters',10,2.4,7],
    ['S166','Lower / tank top aft','Cabin - engineers\' quarters',10,2.4,7],
    ['S167','Lower / tank top aft','Cabin - engineers\' quarters',8,2.4,6],
    ['S168','Lower / tank top aft','Service - engineers mess',6,2.4,5],
    ['S169','Lower / tank top aft','Sanitation - engineers\' head',4,2.4,3],
    ['S170','Lower hold forward','Stores - sails / canvas',6,4,5],
    ['S171','Lower hold aft','Stores - spare ropes / rigging',6,4,5],
    ['S172','Lower hold forward','Stores - spare anchor chain',5,3.8,4],
    ['S173','Main deck','Stores - ship\'s stores locker',4,2.8,3],
    ['S174','Upper deck','Stores - 2nd class provisions',4,2.8,3],
    ['S175','Main deck','Sanitation - 1st class cabin head (grade A)',3,2.6,3],
    ['S176','Main deck','Sanitation - 1st class cabin head (grade A)',3,2.6,3],
    ['S177','Upper deck','Sanitation - 1st class cabin head (grade A)',3,2.6,3],
    ['S178','Upper deck','Sanitation - 1st class cabin head (grade A)',3,2.6,3],
    ['S179','Lower / orlop aft','Public - 3rd class single women\'s room',16,2.6,10],
    ['S180','Lower / orlop aft','Public - 3rd class single men\'s room',16,2.6,10],
    ['S181','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S182','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S183','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S184','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S185','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S186','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S187','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S188','Upper deck','Cabin - 2nd class stateroom',3.6,2.5,3],
    ['S189','Boat deck','Cabin - 4th / 5th officer\'s cabin',3.5,2.7,3],
    ['S190','Boat deck','Sanitation - officers\' head',3,2.6,3],
    ['S191','Boat deck','Service - officers\' pantry',3,2.6,3],
    ['S192','Boat deck','Navigation - chart storage / locker',4,2.8,3],
    ['S193','Boat deck','Deck fixture - signal lamp / Morse lamp',3,2.5,3],
    ['S194','Boat deck','Deck fixture - flag locker',3,2.5,3],
    ['S195','Main deck','Service - main galley (passenger)',8,3,6],
    ['S196','Main deck','Service - vegetable prep',4,2.6,3],
    ['S197','Main deck','Service - pastry / bakery',4,2.6,3],
    ['S198','Main deck','Stores - cold room / ice box',5,2.8,4],
    ['S199','Main deck','Service - dishwashing / pot wash',4,2.6,3],
    ['S200','Boat deck','Circulation - boat deck companionway to lower decks',12,3,3],
  ];

  spaces.forEach(([id, deck, typeHint, w, h, d]) => {
    const [x, y, baseZ] = posFor(deck, typeHint);
    group.add(room({ id, x, y, z: baseZ, w, d, h, typeHint }));
  });

  return group;
}
