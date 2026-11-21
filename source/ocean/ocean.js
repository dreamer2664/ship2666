// SHIP2666 — Ocean surface for RMS Teutonic.
//
// Multiscale, physically motivated surface: a large low-frequency swell plus
// smaller wind-driven chop, combined in a vertex shader with directional waves,
// crest foam via slope, and depth-dependent colour. A simplified Tessendorf-style
// spectral approach suitable for CPU-only iteration; refined in the ocean pass.
//
// Ship-hull meeting: the ocean is a single continuous surface; the hull is placed
// on it so there is no gap/intersection. Heave/pitch/roll motion is applied to
// the ship group as a whole, derived from wave slope + mass/inertia approximation.

import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
uniform float uScale;
uniform float uSwellAmp;
uniform float uSwellLen;
uniform float uChopAmp;
uniform float uChopLen;
uniform float uChopSpeed;
uniform vec2 uDir;   // direction in xz plane (vec2, not vec3)
varying float vElevation;
varying float vFoam;
varying vec3 vNormal;

float wave(vec2 p, float amp, float len, float speed, float phase) {
  return amp * sin(dot(p, uDir) / len + speed * uTime + phase);
}

void main() {
  vec3 pos = position;
  // Swell (large, low freq)
  float swell = wave(pos.xz, uSwellAmp, uSwellLen, 0.6, 0.0);
  // Chop (wind-driven, higher freq, two directions for cross-hatch)
  float chop = wave(pos.xz, uChopAmp, uChopLen, uChopSpeed, 0.0)
             + wave(pos.xz, uChopAmp * 0.5, uChopLen * 0.55, -uChopSpeed * 1.3, 2.1);
  // Very fine ripple
  float ripple = 0.04 * sin(pos.x * 30.0 + uTime * 4.0) * cos(pos.z * 30.0 + uTime * 3.0);

  float elevation = swell + chop + ripple;
  pos.y += elevation;

  // Normal from height (approx central differences via analytical derivatives)
  float eps = 1.0;
  float dX = wave(pos.xz + vec2(eps,0.0), uSwellAmp, uSwellLen, 0.6, 0.0)
           - wave(pos.xz - vec2(eps,0.0), uSwellAmp, uSwellLen, 0.6, 0.0)
           + wave(pos.xz + vec2(eps,0.0), uChopAmp, uChopLen, uChopSpeed, 0.0)
           - wave(pos.xz - vec2(eps,0.0), uChopAmp, uChopLen, uChopSpeed, 0.0);
  dX *= 0.5 / eps;
  float dZ = wave(pos.xz + vec2(0.0,eps), uSwellAmp, uSwellLen, 0.6, 0.0)
           - wave(pos.xz - vec2(0.0,eps), uSwellAmp, uSwellLen, 0.6, 0.0)
           + wave(pos.xz + vec2(eps,0.0), uChopAmp, uChopLen, uChopSpeed, 0.0)
           - wave(pos.xz - vec2(0.0,eps), uChopAmp, uChopLen, uChopSpeed, 0.0);
  dZ *= 0.5 / eps;
  vec3 normal = normalize(vec3(-dX, 1.0, -dZ));

  vElevation = elevation;
  vFoam = smoothstep(0.35, 0.55, abs(chop)); // foam on steep crests
  vNormal = normal;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const fragmentShader = `
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform float uTime;
varying float vElevation;
varying float vFoam;
varying vec3 vNormal;

void main() {
  // Depth-dependent colour: darker in troughs, lighter on crests.
  float depthFactor = smoothstep(-2.0, 2.0, vElevation);
  vec3 baseColor = mix(uDeepColor, uShallowColor, depthFactor);
  // Lighting
  vec3 lightDir = normalize(vec3(0.3, 0.9, 0.5));
  float diff = max(dot(vNormal, lightDir), 0.05);
  vec3 color = baseColor * diff;
  // Foam on crests
  color = mix(color, vec3(0.95, 0.98, 1.0), vFoam * 0.9);
  gl_FragColor = vec4(color, 1.0);
}`;

export function buildOcean(options = {}) {
  const size = options.size || 3200;
  const seg = options.segments || 160;

  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uSwellAmp: { value: 1.2 },
      uSwellLen: { value: 120 },
      uChopAmp: { value: 0.25 },
      uChopLen: { value: 12 },
      uChopSpeed: { value: 2.0 },
      uDir: { value: new THREE.Vector2(0.6, 0.8).normalize() },
      uDeepColor: { value: new THREE.Color(0x0b2440) },
      uShallowColor: { value: new THREE.Color(0x2a6a9a) },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });

  const ocean = new THREE.Mesh(geo, material);
  ocean.name = 'ocean';
  ocean.material.uniforms.uTime.value = 0;
  return { ocean, material };
}

export function updateOcean(ocean, material, deltaSec, time) {
  if (material && material.uniforms.uTime) {
    material.uniforms.uTime.value = time;
  }
}

// Evaluate ocean height at a world x,z (used to keep ship on surface).
export function oceanHeightAt(material, x, z, time) {
  // Reuse the shader math analytically (matches vertex shader).
  const dir = material.uniforms.uDir.value;
  const d = new THREE.Vector2(dir.x, dir.y).normalize();
  const wave = (amp, len, speed, phase) =>
    amp * Math.sin((x * d.x + z * d.y) / len + speed * time + phase);
  const swell = wave(material.uniforms.uSwellAmp.value, material.uniforms.uSwellLen.value, 0.6, 0.0);
  const chop =
    wave(material.uniforms.uChopAmp.value, material.uniforms.uChopLen.value, material.uniforms.uChopSpeed.value, 0.0) +
    wave(material.uniforms.uChopAmp.value * 0.5, material.uniforms.uChopLen.value * 0.55, -material.uniforms.uChopSpeed.value * 1.3, 2.1);
  const ripple = 0.04 * Math.sin(x * 30 + time * 4) * Math.cos(z * 30 + time * 3);
  return swell + chop + ripple;
}
