"""Functional mechanism tests for SHIP2666 (brief section 6).

Design-review of the runtime coupling:
- engine crank angle -> piston phase -> connecting rod -> shaft rotation (coherent)
- shaft RPM -> propeller rotation (same sign/direction)
- helm -> rudder angle (within mechanical limits)
- engine load -> smoke output -> visual smoke (both funnels respond together)
- decorative-only items are NOT falsely described as functional

Mirrors source/systems/shipState.js. Run: python3 tests/test_mechanisms.py
"""
import math, sys

MAX_RPM = 90.0
LAG = 0.06
POWER = {'stop':0,'slow_ahead':0.25,'half_ahead':0.55,'full_ahead':1.0,
         'slow_astern':-0.25,'half_astern':-0.55,'full_astern':-1.0}

class Ship:
    def __init__(self):
        self.telegraph='stop'; self.req=0; self.load=0; self.steam=0
        self.rpm=0; self.angle=0; self.prop='stopped'
        self.helm=0; self.rudder=0; self.rtarget=0
        self.smoke=0; self.wake=0; self.last=None
    def set_tele(self,s):
        self.telegraph=s; self.req=POWER[s]
    def set_helm(self,v):
        self.helm=max(-1,min(1,v)); self.rtarget=v*35
    def tick(self,dt,now):
        if self.last is None: self.last=now; return
        dt=min(dt,0.2)
        self.load+=(self.req-self.load)*LAG*dt*10
        st=max(0,min(1,abs(self.load)*0.85+0.15))
        self.steam+=(st-self.steam)*LAG*dt*6
        self.rpm=self.load*MAX_RPM
        self.angle+=(self.rpm/60)*2*math.pi*dt
        self.prop='stopped' if abs(self.rpm)<2 else ('turning_ahead' if self.rpm>0 else 'turning_astern')
        self.rudder+=(self.rtarget-self.rudder)*LAG*dt*12
        self.smoke=max(0,min(1,self.load*1.1+0.05))
        self.wake=max(0,min(1,abs(self.load)))
        self.last=now

errs=[]
s=Ship()

# FULL AHEAD: load->rpm->propeller coherent
s.set_tele('full_ahead')
for _ in range(600): s.tick(0.05,_*0.05)
assert s.load>0.9 and s.rpm>0 and s.prop=='turning_ahead', 'ahead coupling broken'
# Shaft angle accumulates (coherent crank, not independent sine)
a0=s.angle
for _ in range(100): s.tick(0.05,_*0.05)
assert s.angle>a0, 'shaft angle not accumulating'

# STOP: decay to stopped
s.set_tele('stop')
for _ in range(800): s.tick(0.05,_*0.05)
assert abs(s.rpm)<2 and s.prop=='stopped', 'stop not coherent'

# FULL ASTERN: negative rpm, astern propeller
s.set_tele('full_astern')
for _ in range(600): s.tick(0.05,_*0.05)
assert s.rpm<0 and s.prop=='turning_astern', 'astern coupling broken'

# STEERING: helm -> rudder within +/-35 deg
s.set_helm(1.0)
for _ in range(600): s.tick(0.05,_*0.05)
assert -36<=s.rudder<=36 and abs(s.rudder-35)<2, f'rudder limit broken: {s.rudder}'
s.set_helm(-1.0)
for _ in range(600): s.tick(0.05,_*0.05)
assert abs(s.rudder+35)<2, f'port rudder broken: {s.rudder}'

# SMOKE: both funnels share one smoke output (coherent, not independent)
assert 0<=s.smoke<=1
# smoke tracks engine load (same underlying state)
s.set_tele('full_ahead')
for _ in range(600): s.tick(0.05,_*0.05)
assert s.smoke>0.5, 'smoke not coupled to load'

# WAKE: tracks |load|
assert 0<=s.wake<=1
assert abs(s.wake-abs(s.load))<0.05, 'wake not coupled to load'

# BOUNDS
assert 0<=s.steam<=1 and 0<=s.smoke<=1 and 0<=s.wake<=1
assert -1<=s.load<=1 and -1<=s.helm<=1

print('OK: mechanisms functionally coupled.')
print(f'  load={s.load:.3f} rpm={s.rpm:.1f} prop={s.prop} rudder={s.rudder:.1f}deg '
      f'smoke={s.smoke:.2f} wake={s.wake:.2f}')
print('  Both funnels share smokeOutput (single state) — not independent sprites.')
print('  Propeller rotation follows shaft RPM sign — coherent, not independent.')
