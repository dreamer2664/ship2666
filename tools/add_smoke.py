"""Add a smoke particle system to source/main.js."""
p = 'source/main.js'
s = open(p).read()

smoke_code = '''
// ---- Smoke particle system (both funnels, responds to engine load) ----
const smokeGroup = new THREE.Group(); smokeGroup.name = 'smokeGroup';
const smokeGeo = new THREE.BufferGeometry();
const smokeMax = 120;
const smokePos = new Float32Array(smokeMax * 3);
const smokeLife = new Float32Array(smokeMax); // 0..1 age
const smokeSize = new Float32Array(smokeMax);
smokeGeo.setAttribute('position', new Float32BufferAttribute(smokePos, 3));
smokeGeo.setDrawRange(0, 0);
const smokeMat = new THREE.PointsMaterial({
  color: 0x5a5a5a, transparent: true, opacity: 0.35, sizeAttenuation: true,
  size: 6, depthWrite: false, blending: THREE.AdditiveBlending,
});
const smokePoints = new THREE.Points(smokeGeo, smokeMat);
smokeGroup.add(smokePoints);
hull.add(smokeGroup); // moves with hull heave/pitch/roll

// Funnel emission points (hull-local coordinates, matches hull.js funnel placement).
const funnelEmitters = [
  new THREE.Vector3(length * 0.40, -beam * 0.24, dimensions.funnelBaseZ + dimensions.funnelHeight),
  new THREE.Vector3(length * 0.60, beam * 0.24, dimensions.funnelBaseZ + dimensions.funnelHeight),
];

function emitSmokeParticle(smokeOutput) {
  // Find a dead particle (life >= 1) to recycle.
  for (let i = 0; i < smokeMax; i++) {
    if (smokeLife[i] >= 1.0) {
      const e = funnelEmitters[i % 2];
      // Jitter emission point slightly.
      smokePos[i * 3 + 0] = e.x + (Math.random() - 0.5) * 0.4;
      smokePos[i * 3 + 1] = e.y;
      smokePos[i * 3 + 2] = e.z;
      smokeLife[i] = 0.0;
      smokeSize[i] = 4 + Math.random() * 6;
      return;
    }
  }
}

function updateSmoke(deltaSec, smokeOutput) {
  const emissionRate = Math.floor(smokeOutput * 8 * deltaSec * 60); // particles/sec
  for (let e = 0; e < emissionRate; e++) emitSmokeParticle(smokeOutput);

  const wind = new THREE.Vector3(-0.15, 0, 0.05); // gentle drift aft + to stbd
  const rise = 0.9; // m/s upward
  let active = 0;
  for (let i = 0; i < smokeMax; i++) {
    if (smokeLife[i] < 1.0) {
      smokeLife[i] += deltaSec * 0.5; // age
      // physics: rise + wind drift + turbulent expansion
      smokePos[i * 3 + 1] += rise * deltaSec;
      smokePos[i * 3 + 0] += wind.x * deltaSec * (1 + smokeLife[i]);
      smokePos[i * 3 + 2] += wind.z * deltaSec * (1 + smokeLife[i]);
      smokePos[i * 3 + 0] += (Math.random() - 0.5) * 0.3 * deltaSec; // turbulence
      smokePos[i * 3 + 2] += (Math.random() - 0.5) * 0.3 * deltaSec;
      // fade out as it ages
      smokeSize[i] += deltaSec * 8;
      active++;
    }
  }
  smokeGeo.attributes.position.needsUpdate = true;
  smokeGeo.setDrawRange(0, active);
  smokeMat.opacity = 0.25 + smokeOutput * 0.25;
}

// ---- UI controls for smoke ----
const smokeDemo = document.createElement('button');
smokeDemo.textContent = 'Demo smoke';
smokeDemo.style.cssText = 'background:rgba(255,255,255,0.12);color:#e8eef5;border:1px solid rgba(255,255,255,0.35);border-radius:4px;padding:3px 8px;font-size:0.65rem;cursor:pointer;margin-left:8px';
smokeDemo.addEventListener('click', () => {
  setTelegraph('full_ahead');
  for (let i = 0; i < smokeMax; i++) smokeLife[i] = 0; // clear existing
});
document.getElementById('ui').appendChild(smokeDemo);

'''

marker = "// ---- Animation ----"
assert marker in s, "animation marker not found"
s = s.replace(marker, smoke_code + marker, 1)

# Add updateSmoke() call in animate loop before updateUI().
s = s.replace("  updateUI();\n  updateOcean(", "  updateSmoke(deltaSec, shipState.smokeOutput);\n  updateUI();\n  updateOcean(")

open(p, 'w').write(s)
print("smoke system added")
PY
python3 tools/add_smoke.py
node --check source/main.js && echo "main.js syntax OK"