"""Design-review test for SHIP2666 shipState kinematic consistency.

Mirrors the lag/limit model in source/systems/shipState.js to verify the
approximation is internally consistent (not independent sine waves). This is a
design review of the state model; the real implementation lives in JS.

Run: python3 tests/test_ship_state.py
"""
import math, sys

MAX_RPM = 90.0
RUDDER_LIMIT_DEG = 35.0
LAG = 0.06
POWER_BY_TELEGRAPH = {
    'stop': 0.0, 'slow_ahead': 0.25, 'half_ahead': 0.55, 'full_ahead': 1.0,
    'slow_astern': -0.25, 'half_astern': -0.55, 'full_astern': -1.0,
}

class ShipState:
    def __init__(self):
        self.telegraph = 'stop'
        self.requested_power = 0.0
        self.steam_pressure = 0.0
        self.engine_load = 0.0
        self.shaft_rpm = 0.0
        self.shaft_angle = 0.0
        self.propeller_state = 'stopped'
        self.helm = 0.0
        self.rudder_angle = 0.0
        self.rudder_target = 0.0
        self.smoke_output = 0.0
        self.wake_intensity = 0.0
        self.last_t = None

    def set_telegraph(self, setting):
        assert setting in POWER_BY_TELEGRAPH
        self.telegraph = setting
        self.requested_power = POWER_BY_TELEGRAPH[setting]

    def set_helm(self, value):
        self.helm = max(-1.0, min(1.0, value))
        self.rudder_target = self.helm * RUDDER_LIMIT_DEG

    def tick(self, dt, now):
        if self.last_t is None:
            self.last_t = now
            return
        dt = min(dt, 0.2)
        self.engine_load += (self.requested_power - self.engine_load) * LAG * dt * 10
        steam_target = max(0.0, min(1.0, abs(self.engine_load) * 0.85 + 0.15))
        self.steam_pressure += (steam_target - self.steam_pressure) * LAG * dt * 6
        self.shaft_rpm = self.engine_load * MAX_RPM
        self.shaft_angle += (self.shaft_rpm / 60) * 2 * math.pi * dt
        if abs(self.shaft_rpm) < 2:
            self.propeller_state = 'stopped'
        elif self.shaft_rpm > 0:
            self.propeller_state = 'turning_ahead'
        else:
            self.propeller_state = 'turning_astern'
        self.rudder_angle += (self.rudder_target - self.rudder_angle) * LAG * dt * 12
        self.smoke_output = max(0.0, min(1.0, self.engine_load * 1.1 + 0.05))
        self.wake_intensity = max(0.0, min(1.0, abs(self.engine_load)))
        self.last_t = now

    def piston_phase(self, crank_offset):
        return 0.5 * (1 + math.cos(self.shaft_angle + crank_offset))


def approx(a, b, tol=1e-6):
    return abs(a - b) <= tol

errors = []
s = ShipState()

# 1. Full ahead -> engine load and shaft RPM converge positive; propeller turning ahead.
for _ in range(400):
    s.tick(0.05, _ * 0.05)
s.set_telegraph('full_ahead')
for _ in range(600):
    s.tick(0.05, _ * 0.05)
assert s.engine_load > 0.9, f'engine_load {s.engine_load} not near 1 at full ahead'
assert s.shaft_rpm > 0, f'shaft_rpm {s.shaft_rpm} not positive ahead'
assert approx(s.shaft_rpm, MAX_RPM, 0.05), f'shaft_rpm {s.shaft_rpm} not ~{MAX_RPM}'
assert s.propeller_state == 'turning_ahead'
assert s.steam_pressure > 0.5, f'steam_pressure {s.steam_pressure} not built up'
assert s.smoke_output > 0.5

# 2. Stop -> load decays toward 0, RPM decays, propeller stops.
s.set_telegraph('stop')
for _ in range(800):
    s.tick(0.05, _ * 0.05)
assert s.engine_load < 0.05, f'engine_load {s.engine_load} not decayed at stop'
assert abs(s.shaft_rpm) < 2, f'shaft_rpm {s.shaft_rpm} not near 0 at stop'
assert s.propeller_state == 'stopped'

# 3. Full astern -> load/RPM negative; propeller turning astern.
s.set_telegraph('full_astern')
for _ in range(600):
    s.tick(0.05, _ * 0.05)
assert s.engine_load < -0.9, f'engine_load {s.engine_load} not near -1 at full astern'
assert s.shaft_rpm < 0, f'shaft_rpm {s.shaft_rpm} not negative astern'
assert s.propeller_state == 'turning_astern'

# 4. Rudder limit: hard starboard -> rudder_angle converges to +35 deg within limit.
s.set_helm(1.0)
for _ in range(600):
    s.tick(0.05, _ * 0.05)
assert s.rudder_angle <= RUDDER_LIMIT_DEG + 1, f'rudder {s.rudder_angle} exceeds limit'
assert approx(s.rudder_angle, RUDDER_LIMIT_DEG, 1.0), f'rudder {s.rudder_angle} not at limit'

# 5. Helm port -> rudder negative, bounded.
s.set_helm(-1.0)
for _ in range(600):
    s.tick(0.05, _ * 0.05)
assert s.rudder_angle >= -RUDDER_LIMIT_DEG - 1
assert approx(s.rudder_angle, -RUDDER_LIMIT_DEG, 1.0)

# 6. Crank angle accumulates monotonically when turning; shaft_angle drives all three
#    piston phases with 120-degree offsets (kinematic consistency, not independent sine).
s.set_telegraph('full_ahead')
angle0 = s.shaft_angle
for _ in range(100):
    s.tick(0.05, _ * 0.05)
assert s.shaft_angle > angle0, 'shaft_angle not accumulating'
p0 = s.piston_phase(0.0)
p1 = s.piston_phase(2 * math.pi / 3)
p2 = s.piston_phase(4 * math.pi / 3)
# Three stages offset by 120 deg: phases should be distinct (not all equal).
distinct = len({round(p, 3) for p in (p0, p1, p2)}) > 1
assert distinct, f'piston phases not offset: {p0},{p1},{p2}'

# 7. State bounds: steam/pressure/smoke/wake in [0,1]; load in [-1,1]; helm in [-1,1].
assert 0.0 <= s.steam_pressure <= 1.0
assert 0.0 <= s.smoke_output <= 1.0
assert 0.0 <= s.wake_intensity <= 1.0
assert -1.0 <= s.engine_load <= 1.0
assert -1.0 <= s.helm <= 1.0

print('OK: shipState kinematic model internally consistent.')
print(f'  final: telegraph={s.telegraph} load={s.engine_load:.3f} rpm={s.shaft_rpm:.1f} '
      f'rudder={s.rudder_angle:.1f}deg smoke={s.smoke_output:.2f}')
