// SHIP2666 — Coherent vessel state model for RMS Teutonic (1889).
//
// Single source of truth for ship state. Every visual/mechanical subsystem
// (engines, boilers, smoke, shafts, propellers, rudder) reads from this state
// so motion is kinematically consistent, not independent sine waves.
//
// Simplification: this is a *kinematic approximation*, not a thermodynamic
// simulation. Steam pressure and engine load are modelled as coupled first-order
// lags. Documented as approximation per brief section 6.

export const shipState = {
  // Control input
  telegraph: 'stop',        // 'stop','slow_ahead','half_ahead','full_ahead','slow_astern','half_astern','full_astern'
  telegraphRequestedPower: 0, // -1..1 (astern negative)

  // Propulsion state (0..1 normalised)
  steamPressure: 0,         // 0..1 (working ~180 psi at 1)
  engineLoad: 0,            // 0..1
  shaftRpm: 0,              // revolutions per minute (signed: astern negative)
  shaftAngle: 0,            // crankshaft angle, radians, accumulates
  propellerState: 'stopped', // 'stopped','turning_ahead','turning_astern'

  // Steering
  helm: 0,                  // -1..1 (port negative, starboard positive)
  rudderAngle: 0,           // degrees, limited
  rudderTarget: 0,

  // Effluent / environment
  smokeOutput: 0,           // 0..1 both funnels
  wakeIntensity: 0,         // 0..1

  // Timestamps
  lastTick: null,
};

// Maximum shaft RPM at full ahead (20 knots service, twin screw) — provisional.
const MAX_RPM = 90;
const RUDDER_LIMIT_DEG = 35;

// Target power for each telegraph setting.
const POWER_BY_TELEGRAPH = {
  stop: 0,
  slow_ahead: 0.25,
  half_ahead: 0.55,
  full_ahead: 1.0,
  slow_astern: -0.25,
  half_astern: -0.55,
  full_astern: -1.0,
};

// First-order lag coefficient (0..1, higher = faster response).
const LAG = 0.06;

export function setTelegraph(setting) {
  if (!(setting in POWER_BY_TELEGRAPH)) return;
  shipState.telegraph = setting;
  shipState.telegraphRequestedPower = POWER_BY_TELEGRAPH[setting];
}

export function setHelm(value) {
  shipState.helm = Math.max(-1, Math.min(1, value));
  shipState.rudderTarget = shipState.helm * RUDDER_LIMIT_DEG;
}

export function tick(deltaSec, now) {
  if (shipState.lastTick === null) {
    shipState.lastTick = now;
    return;
  }
  const dt = Math.min(deltaSec, 0.2);

  // Requested power from telegraph.
  const requested = shipState.telegraphRequestedPower;

  // Engine load lags requested power (spool-up / steam raising).
  shipState.engineLoad += (requested - shipState.engineLoad) * LAG * dt * 10;

  // Steam pressure builds with load, decays at idle.
  const steamTarget = Math.max(0, Math.min(1, Math.abs(shipState.engineLoad) * 0.85 + 0.15));
  shipState.steamPressure += (steamTarget - shipState.steamPressure) * LAG * dt * 6;

  // Shaft RPM follows engine load.
  shipState.shaftRpm = shipState.engineLoad * MAX_RPM;

  // Crankshaft angle accumulates from RPM.
  shipState.shaftAngle += (shipState.shaftRpm / 60) * 2 * Math.PI * dt;

  // Propeller state.
  if (Math.abs(shipState.shaftRpm) < 2) shipState.propellerState = 'stopped';
  else if (shipState.shaftRpm > 0) shipState.propellerState = 'turning_ahead';
  else shipState.propellerState = 'turning_astern';

  // Rudder moves toward target with mechanical lag.
  shipState.rudderAngle += (shipState.rudderTarget - shipState.rudderAngle) * LAG * dt * 12;

  // Smoke and wake follow load.
  shipState.smokeOutput = Math.max(0, Math.min(1, shipState.engineLoad * 1.1 + 0.05));
  shipState.wakeIntensity = Math.max(0, Math.min(1, Math.abs(shipState.engineLoad)));

  shipState.lastTick = now;
}

export function getPistonPhase(crankOffset) {
  // Piston position (0..1) from crank angle; simple harmonic approximation.
  return 0.5 * (1 + Math.cos(shipState.shaftAngle + crankOffset));
}
