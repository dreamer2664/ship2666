import { clamp, TAU, waveHeight } from './kinematics.js';

/** Coupled operational demonstrator. All thermodynamics and manoeuvring are approximations. */
export class VesselState {
  constructor({ warm = false } = {}) {
    this.time = 0;
    this.telegraph = 0;
    this.firing = warm ? .42 : 0;
    this.pressure = warm ? 150 : 0;
    this.coolingPump = warm;
    this.rpm = [0, 0];
    this.phase = [0, 0];
    this.engineEnabled = [true, true];
    this.rudderRequested = 0;
    this.rudder = 0;
    this.speedKnots = 0;
    this.wake = 0;
    this.smoke = warm ? .28 : 0;
    this.fanRpm = 0;
    this.lights = true;
    this.heave = 0;
    this.pitch = 0;
    this.roll = 0;
    this.seaState = .65;
    this.heading = 0;
    this.warning = '';
  }

  setTelegraph(value) {
    if (!Number.isFinite(value)) throw new TypeError('Telegraph input must be finite');
    this.telegraph = clamp(value, -1, 1);
  }

  setFiring(value) {
    if (!Number.isFinite(value)) throw new TypeError('Firing input must be finite');
    this.firing = clamp(value, 0, 1);
  }

  setRudder(degrees) {
    if (!Number.isFinite(degrees)) throw new TypeError('Rudder input must be finite');
    this.rudderRequested = clamp(degrees, -32, 32) * Math.PI / 180;
  }

  emergencyStop() {
    this.telegraph = 0;
    this.firing = 0;
    // Cooling remains on while machinery runs down; phase never teleports to zero.
  }

  warmStart() {
    this.pressure = Math.max(this.pressure, 150);
    this.firing = .65;
    this.coolingPump = true;
    this.warning = 'Warm-start preset: pressure initialized, not heated instantaneously by a simulated boiler.';
  }

  step(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Non-negative finite timestep required');
    let remaining = Math.min(dt, .25); // Bounded catch-up on returning to a backgrounded tab.
    while (remaining > 1e-8) {
      const h = Math.min(remaining, 1 / 60);
      this.integrate(h);
      remaining -= h;
    }
    return this;
  }

  integrate(dt) {
    this.time += dt;
    const load = (Math.abs(this.rpm[0]) + Math.abs(this.rpm[1])) / 156;
    const pressureTarget = clamp(this.firing * 215 - load * 30, 0, 180);
    this.pressure = clamp(this.pressure + (pressureTarget - this.pressure) * (1 - Math.exp(-dt / 32)), 0, 180);
    const steam = clamp((this.pressure - 25) / 120, 0, 1);
    this.warning = !this.coolingPump && Math.abs(this.telegraph) > .01 ? 'Start the condenser circulating pump before requesting power.' :
      this.pressure < 25 && Math.abs(this.telegraph) > .01 ? 'Steam pressure is below the 25 psi demonstrator starting threshold.' : '';
    for (let i = 0; i < 2; i++) {
      const target = this.coolingPump && this.engineEnabled[i] ? this.telegraph * 78 * steam : 0;
      const response = Math.abs(target) < Math.abs(this.rpm[i]) ? 4.8 : 8;
      this.rpm[i] = clamp(this.rpm[i] + (target - this.rpm[i]) * (1 - Math.exp(-dt / response)), -82, 82);
      if (Math.abs(this.rpm[i]) < .002 && !target) this.rpm[i] = 0;
      const direction = i === 0 ? -1 : 1; // Outboard rotation of staggered screws.
      this.phase[i] = ((this.phase[i] + direction * this.rpm[i] * TAU / 60 * dt) % TAU + TAU) % TAU;
    }
    const thrust = (this.rpm[0] + this.rpm[1]) / 156;
    const targetSpeed = 20 * Math.sign(thrust) * Math.pow(Math.abs(thrust), .78);
    this.speedKnots += (targetSpeed - this.speedKnots) * (1 - Math.exp(-dt / 45));
    const maxRudderStep = 3 * Math.PI / 180 * dt;
    this.rudder += clamp(this.rudderRequested - this.rudder, -maxRudderStep, maxRudderStep);
    this.heading += this.rudder * this.speedKnots * .0008 * dt;
    this.wake = clamp(Math.abs(this.speedKnots) / 20 * .65 + load * .35, 0, 1);
    this.smoke += (this.firing * (.28 + .72 * load) - this.smoke) * (1 - Math.exp(-dt / 6));
    this.fanRpm += (350 * this.firing - this.fanRpm) * (1 - Math.exp(-dt / 3));
    // Length-scale wave sampling with strong liner-like inertial filtering, not small-boat bobbing.
    const fore = waveHeight(65, 0, this.time, this.seaState);
    const aft = waveHeight(-65, 0, this.time, this.seaState);
    const port = waveHeight(0, 7, this.time, this.seaState);
    const starboard = waveHeight(0, -7, this.time, this.seaState);
    const smooth = 1 - Math.exp(-dt / 7);
    this.heave += (((fore + aft + port + starboard) / 4 - 7.1) * .28 - this.heave) * smooth;
    this.pitch += (clamp((fore - aft) / 130 * .35, -.012, .012) - this.pitch) * smooth;
    this.roll += (clamp((port - starboard) / 14 * .20, -.018, .018) - this.roll) * smooth;
  }
}
