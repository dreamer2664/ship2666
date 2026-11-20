// SHIP2666 — PBR material definitions (metalness/roughness workflow).
//
// Full material family set per brief section 5. Colours calibrated, sensible base
// values; brass/copper/iron/steel clearly differentiated; upholstery/canvas/
// leather/carpet/curtains/bedding with fibre-scale character; glass with
// thickness/reflection; coal/ash/oil/grease/wet surfaces in machinery spaces.
//
// These are Pass B/C base definitions. The materials pass refines each with
// albedo/normal/roughness/metalness/opacity maps and trim sheets.
import * as THREE from 'three';

export const materials = {
  // ---- Painted steel hull ----
  hullPaint: {
    color: 0x2a3a4a, roughness: 0.5, metalness: 0.3,
    note: 'Painted steel, subtle unevenness, layered paint, edges, soot, weathering',
  },
  hullWhite: {
    color: 0xeaeaea, roughness: 0.5, metalness: 0.1,
    note: 'White painted upper works',
  },
  hullBlackBelowWaterline: {
    color: 0x121a20, roughness: 0.6, metalness: 0.35,
    note: 'Black antifouling below waterline',
  },

  // ---- Differentiated metals (must NOT all look identical) ----
  steelMachined: {
    color: 0x7a8288, roughness: 0.35, metalness: 0.85,
    note: 'Machined steel (shafts, engine moving parts)',
  },
  steelForged: {
    color: 0x5a626a, roughness: 0.55, metalness: 0.8,
    note: 'Forged steel (crankshaft, connecting rods)',
  },
  ironCast: {
    color: 0x444444, roughness: 0.7, metalness: 0.65,
    note: 'Cast iron (engine beds, pumps, boiler fronts)',
  },
  brass: {
    color: 0xc9a65c, roughness: 0.45, metalness: 0.92,
    note: 'Brass (rail caps, telegraph, binnacle, fittings)',
  },
  brassPolished: {
    color: 0xd9b86e, roughness: 0.3, metalness: 0.95,
    note: 'Polished brass (bright fittings)',
  },
  copper: {
    color: 0xb87333, roughness: 0.5, metalness: 0.92,
    note: 'Copper (boiler fittings, some pipe)',
  },
  copperWeathered: {
    color: 0x8a9a80, roughness: 0.65, metalness: 0.85,
    note: 'Weathered/patinated copper',
  },

  // ---- White Star funnel buff / yellow ----
  funnelBuff: {
    color: 0xd4b46a, roughness: 0.6, metalness: 0.15,
    note: 'White Star funnel buff/yellow (1889, RMG verified)',
  },

  // ---- Wood ----
  woodHardwood: {
    color: 0x6b4a2e, roughness: 0.55, metalness: 0.1,
    note: 'Period hardwood (panelling, furniture frames), grain direction',
  },
  woodTeak: {
    color: 0x5a3a1a, roughness: 0.5, metalness: 0.08,
    note: 'Teak decking / trim',
  },
  woodPainted: {
    color: 0x5a4a3a, roughness: 0.6, metalness: 0.05,
    note: 'Painted wood trim',
  },
  woodVarnished: {
    color: 0x7a4a22, roughness: 0.35, metalness: 0.1,
    note: 'Varnished wood joinery',
  },

  // ---- Fabrics / soft furnishings ----
  upholstery: {
    color: 0x7a5a4a, roughness: 0.92, metalness: 0.0,
    note: 'Upholstery fabric, fibre-scale texture, folds',
  },
  upholsteryVelvet: {
    color: 0x4a2a3a, roughness: 0.95, metalness: 0.0,
    note: 'Velvet upholstery (1st class)',
  },
  leather: {
    color: 0x5a3a2a, roughness: 0.7, metalness: 0.05,
    note: 'Leather (seating, straps)',
  },
  carpet: {
    color: 0x3a2a2a, roughness: 0.95, metalness: 0.0,
    note: 'Carpet, pile texture',
  },
  curtain: {
    color: 0x6a5a4a, roughness: 0.95, metalness: 0.0,
    note: 'Curtains, fabric folds',
  },
  bedding: {
    color: 0xe8e0d0, roughness: 0.95, metalness: 0.0,
    note: 'Bedding, linen, compression/folds',
  },
  canvas: {
    color: 0x8a7a5a, roughness: 0.95, metalness: 0.0,
    note: 'Canvas (covers, hatches)',
  },

  // ---- Glass / ceramic ----
  glass: {
    color: 0xffffff, roughness: 0.03, metalness: 0.0,
    transparent: true, opacity: 0.75,
    note: 'Glass, glazing, realistic thickness/reflections',
  },
  mirror: {
    color: 0xffffff, roughness: 0.02, metalness: 0.95,
    note: 'Mirror (cabin washstands)',
  },
  glazedTile: {
    color: 0xe8e8e8, roughness: 0.2, metalness: 0.0,
    note: 'Glazed tiles (sanitation)',
  },
  ceramic: {
    color: 0xf5f5f0, roughness: 0.4, metalness: 0.0,
    note: 'Ceramic / porcelain (washbasins, tableware)',
  },

  // ---- Machinery soiling ----
  coal: {
    color: 0x1a1a1a, roughness: 0.95, metalness: 0.1,
    note: 'Coal (bunkers, stokehold floor)',
  },
  ash: {
    color: 0x2a2a2a, roughness: 0.98, metalness: 0.05,
    note: 'Ash (boiler ash spaces)',
  },
  soot: {
    color: 0x0f0f0f, roughness: 0.98, metalness: 0.1,
    note: 'Soot (funnel uptake, boiler surrounds)',
  },
  oilGrease: {
    color: 0x222222, roughness: 0.3, metalness: 0.85,
    note: 'Oil/grease (machinery lubrication points)',
  },
  wetSurface: {
    color: 0x181818, roughness: 0.25, metalness: 0.7,
    note: 'Wet surfaces (deck, bilge)',
  },

  // ---- Rope / wire / rubber ----
  rope: {
    color: 0x8a7a5a, roughness: 0.95, metalness: 0.0,
    note: 'Rope (rigging, mooring lines)',
  },
  wire: {
    color: 0x6a6a6a, roughness: 0.6, metalness: 0.8,
    note: 'Wire rope / standing rigging',
  },
  rubber: {
    color: 0x1a1a1a, roughness: 0.9, metalness: 0.05,
    note: 'Rubber (gaskets, fittings)',
  },

  // ---- Flags ----
  flagRed: { color: 0xb01010, roughness: 0.9, metalness: 0.0 },
  flagWhite: { color: 0xf0f0f0, roughness: 0.9, metalness: 0.0 },
  flagBlue: { color: 0x103060, roughness: 0.9, metalness: 0.0 },
};

// Build a Three.js MeshStandardMaterial from a definition.
export function makeMaterial(def) {
  const { transparent, opacity, note, ...rest } = def;
  const m = new THREE.MeshStandardMaterial(rest);
  if (transparent) m.transparent = true;
  if (opacity !== undefined) m.opacity = opacity;
  return m;
}
