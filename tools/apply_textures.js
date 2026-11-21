// SHIP2666 — Apply generated procedural textures to material definitions.
//
// Called from main.js after generateAllTextures() returns the texture map.
// Mutates the materials object in place, adding map/normalMap/roughnessMap/aoMap
// properties so makeMaterial() picks them up when building Three.js materials.

import * as THREE from 'three';

export function applyTextures(materials, textures) {
  const set = (matName, keys) => {
    const m = materials[matName];
    if (!m) return;
    for (const [mapType, texName] of Object.entries(keys)) {
      const t = textures[texName];
      if (!t) {
        console.warn(`[applyTextures] missing texture '${texName}' for '${matName}'`);
        continue;
      }
      m[mapType] = t;
    }
  };

  // ---- Hull ---
  set('hullPaint', {
    map: 'hullPaint_albedo',
    normalMap: 'hullPaint_normal',
    roughnessMap: 'hullPaint_roughness',
    aoMap: 'hullPaint_ao',
  });
  set('hullWhite', {
    map: 'hullWhite_albedo',
    normalMap: 'hullWhite_normal',
    roughnessMap: 'hullWhite_roughness',
  });
  set('hullBlackBelowWaterline', {
    map: 'soot_albedo', // black antifouling ~ soot
    normalMap: 'soot_normal',
    roughnessMap: 'soot_roughness',
  });

  // ---- Steel ---
  set('steelMachined', {
    map: 'steelMachined_albedo',
    normalMap: 'steelMachined_normal',
    roughnessMap: 'steelMachined_roughness',
    aoMap: 'steelMachined_ao',
  });
  set('steelForged', {
    map: 'steelMachined_albedo', // reuse steel base
    normalMap: 'steelMachined_normal',
    roughnessMap: 'steelMachined_roughness',
  });
  set('ironCast', {
    map: 'steelMachined_albedo',
    normalMap: 'steelMachined_normal',
    roughnessMap: 'steelMachined_roughness',
  });

  // ---- Brass / copper ---
  set('brass', {
    map: 'brass_albedo',
    normalMap: 'brass_normal',
    roughnessMap: 'brass_roughness',
  });
  set('brassPolished', {
    map: 'brass_albedo',
    normalMap: 'brass_normal',
    roughnessMap: 'brass_roughness',
  });
  set('copper', {
    map: 'brass_albedo', // copper base ~ brass-ish
    normalMap: 'brass_normal',
    roughnessMap: 'brass_roughness',
  });
  set('copperWeathered', {
    map: 'soot_albedo', // weathered copper darker
    normalMap: 'soot_normal',
    roughnessMap: 'soot_roughness',
  });

  // ---- Funnel ---
  set('funnelBuff', {
    map: 'funnelBuff_albedo',
    normalMap: 'funnelBuff_normal',
    roughnessMap: 'funnelBuff_roughness',
  });

  // ---- Wood ---
  set('woodHardwood', {
    map: 'woodHardwood_albedo',
    normalMap: 'woodHardwood_normal',
    roughnessMap: 'woodHardwood_roughness',
  });
  set('woodTeak', {
    map: 'woodTeak_albedo',
    normalMap: 'woodTeak_normal',
    roughnessMap: 'woodTeak_roughness',
  });
  set('woodPainted', {
    map: 'woodHardwood_albedo', // painted wood ~ hardwood base
    normalMap: 'woodHardwood_normal',
    roughnessMap: 'woodHardwood_roughness',
  });
  set('woodVarnished', {
    map: 'woodTeak_albedo',
    normalMap: 'woodTeak_normal',
    roughnessMap: 'woodTeak_roughness',
  });

  // ---- Fabrics ---
  set('upholstery', {
    map: 'woodHardwood_albedo', // placeholder: fabric-like
    normalMap: 'woodHardwood_normal',
    roughnessMap: 'woodHardwood_roughness',
  });
  set('carpet', {
    map: 'coal_albedo', // dark pile ~ coal-ish
    normalMap: 'coal_normal',
    roughnessMap: 'coal_roughness',
  });
  set('canvas', {
    map: 'woodHardwood_albedo',
    normalMap: 'woodHardwood_normal',
    roughnessMap: 'woodHardwood_roughness',
  });

  // ---- Machinery soiling ---
  set('coal', {
    map: 'coal_albedo',
    normalMap: 'coal_normal',
    roughnessMap: 'coal_roughness',
  });
  set('ash', {
    map: 'coal_albedo',
    normalMap: 'coal_normal',
    roughnessMap: 'coal_roughness',
  });
  set('soot', {
    map: 'soot_albedo',
    normalMap: 'soot_normal',
    roughnessMap: 'soot_roughness',
  });
  set('oilGrease', {
    map: 'steelMachined_albedo',
    normalMap: 'steelMachined_normal',
    roughnessMap: 'steelMachined_roughness',
  });
  set('wetSurface', {
    map: 'steelMachined_albedo',
    normalMap: 'steelMachined_normal',
    roughnessMap: 'steelMachined_roughness',
  });

  // ---- Rope / wire ---
  set('rope', {
    map: 'coal_albedo',
    normalMap: 'coal_normal',
    roughnessMap: 'coal_roughness',
  });
  set('wire', {
    map: 'steelMachined_albedo',
    normalMap: 'steelMachined_normal',
    roughnessMap: 'steelMachined_roughness',
  });

  // ---- Glass / ceramic ---
  set('glass', {
    map: 'glass_albedo',
    roughnessMap: 'glass_roughness',
  });
  set('glazedTile', {
    map: 'glazedTile_albedo',
    normalMap: 'glazedTile_normal',
    roughnessMap: 'glazedTile_roughness',
  });
  set('ceramic', {
    map: 'glazedTile_albedo',
    normalMap: 'glazedTile_normal',
    roughnessMap: 'glazedTile_roughness',
  });

  // ---- Trim sheet (global detail) ---
  materials.__trimSheet = textures.trimSheet;

  return materials;
}
