export const TAU = Math.PI * 2;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Exact geometry for the chosen slider-crank dimensions, not a steam-cycle solver. */
export function sliderCrank(theta, stroke = 1.524, rodLength = 3.1, crankZ = 2.99, shaftY = 0) {
  if (![theta, stroke, rodLength, crankZ, shaftY].every(Number.isFinite)) throw new TypeError('Finite dimensions required');
  const radius = stroke / 2;
  if (radius <= 0 || rodLength <= radius) throw new RangeError('Rod must exceed positive crank radius');
  const transverse = -radius * Math.sin(theta);
  const pinZ = crankZ + radius * Math.cos(theta);
  const rise = Math.sqrt(rodLength ** 2 - transverse ** 2);
  return {
    crankPin: { y: shaftY + transverse, z: pinZ },
    crosshead: { y: shaftY, z: pinZ + rise },
    rodAngle: -Math.asin(radius * Math.sin(theta) / rodLength),
    pistonTravelFromTop: radius + rodLength - radius * Math.cos(theta) - rise,
  };
}

export function waveHeight(x, y, time, seaState = 1) {
  const waves = [[.28,42,.2,0],[.18,24,1.1,2],[.11,13,-.5,1],[.075,7,.8,3],[.035,3.5,1.8,4]];
  return 7.1 + seaState * waves.reduce((sum, [a, wavelength, direction, phase]) => {
    const k = TAU / wavelength;
    return sum + a * Math.cos(k * (x * Math.cos(direction) + y * Math.sin(direction)) - Math.sqrt(9.81 * k) * time + phase);
  }, 0);
}
