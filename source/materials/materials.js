// SHIP2666 — PBR material definitions (metalness/roughness workflow).
// Colours are calibrated, sensible base values. Roughness/metalness differentiate
// brass, copper, iron, steel, wood, paint, upholstery, glass, etc.
// Refined in the materials pass; here are the Pass A base set.

export const materials = {
  // Painted steel hull — layered paint, slight weathering, correct roughness.
  hullPaint: {
    color: 0x2a3a4a,
    roughness: 0.5,
    metalness: 0.3,
  },
  // Bare / machined steel (machinery, shafts, engines).
  steelMachined: {
    color: 0x7a8288,
    roughness: 0.35,
    metalness: 0.85,
  },
  // Cast iron (engine beds, pumps).
  ironCast: {
    color: 0x4a4a4a,
    roughness: 0.65,
    metalness: 0.6,
  },
  // Brass (fittings, rail caps, telegraph, binnacle).
  brass: {
    color: 0xc9a65c,
    roughness: 0.45,
    metalness: 0.9,
  },
  // Copper (boiler fittings, some pipe).
  copper: {
    color: 0xb87333,
    roughness: 0.5,
    metalness: 0.9,
  },
  // White Star funnel buff / yellow.
  funnelBuff: {
    color: 0xd4b46a,
    roughness: 0.6,
    metalness: 0.15,
  },
  // Period hardwood (panelling, furniture frames).
  woodHardwood: {
    color: 0x6b4a2e,
    roughness: 0.55,
    metalness: 0.1,
  },
  // Painted wood / trim.
  woodPainted: {
    color: 0x5a4a3a,
    roughness: 0.6,
    metalness: 0.05,
  },
  // Upholstery fabric.
  upholstery: {
    color: 0x7a5a4a,
    roughness: 0.9,
    metalness: 0.0,
  },
  // Leather.
  leather: {
    color: 0x5a3a2a,
    roughness: 0.7,
    metalness: 0.05,
  },
  // Glass / glazing.
  glass: {
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.0,
    transparent: true,
    opacity: 0.75,
  },
  // Glazed tiles (sanitation).
  tile: {
    color: 0xe8e8e8,
    roughness: 0.2,
    metalness: 0.0,
  },
  // Coal / soot in machinery spaces.
  coal: {
    color: 0x1a1a1a,
    roughness: 0.95,
    metalness: 0.1,
  },
  // Rope / canvas.
  ropeCanvas: {
    color: 0x8a7a5a,
    roughness: 0.95,
    metalness: 0.0,
  },
  // White Star house flag red / white.
  flagRed: { color: 0xb01010, roughness: 0.9, metalness: 0.0 },
  flagWhite: { color: 0xf0f0f0, roughness: 0.9, metalness: 0.0 },
};

// Build a Three.js MeshStandardMaterial from a definition.
export function makeMaterial(def) {
  const { transparent, opacity, ...rest } = def;
  const m = new THREE.MeshStandardMaterial(rest);
  if (transparent) m.transparent = true;
  if (opacity !== undefined) m.opacity = opacity;
  return m;
}
