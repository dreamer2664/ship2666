import test from 'node:test';
import assert from 'node:assert/strict';
import { sliderCrank, TAU, waveHeight } from '../source/systems/kinematics.js';
import { VesselState } from '../source/systems/vessel-state.js';

const close = (a,b,tol=1e-10) => assert.ok(Math.abs(a-b)<tol, `${a} != ${b}`);

test('slider-crank preserves connecting-rod length over every degree', () => {
  for (let angle=0; angle<360; angle++) {
    for (const phase of [0,TAU/3,2*TAU/3]) {
      const s=sliderCrank(angle*Math.PI/180+phase);
      close(Math.hypot(s.crosshead.y-s.crankPin.y,s.crosshead.z-s.crankPin.z),3.1);
    }
  }
});
test('dead centres differ by the sourced 60-inch stroke', () => {
  close(sliderCrank(0).crosshead.z-sliderCrank(Math.PI).crosshead.z,1.524);
  close(sliderCrank(0).pistonTravelFromTop,0);
  close(sliderCrank(Math.PI).pistonTravelFromTop,1.524);
});
test('invalid geometry is rejected rather than hidden as NaN', () => {
  assert.throws(()=>sliderCrank(NaN)); assert.throws(()=>sliderCrank(0,2,.8));
});
test('cold engines cannot run without steam or circulating pumps', () => {
  const s=new VesselState();s.setTelegraph(1);
  for(let i=0;i<600;i++)s.step(.1);
  close(s.rpm[0],0);close(s.rpm[1],0);assert.match(s.warning,/pump/);
});
test('pressure, RPM, propeller phases, smoke and wake respond coherently', () => {
  const s=new VesselState({warm:true});s.setFiring(.9);s.setTelegraph(1);
  for(let i=0;i<1800;i++)s.step(.1);
  assert.ok(s.rpm[0]>70 && s.rpm[0]<=82);close(s.rpm[0],s.rpm[1]);
  close((s.phase[0]+s.phase[1])%TAU,0,1e-8);
  assert.ok(s.pressure<=180 && s.pressure>100 && s.smoke>.5 && s.wake>.8);
  assert.ok(s.speedKnots>18 && s.speedKnots<=20.001);
});
test('shutdown decelerates; reversal crosses through zero', () => {
  const s=new VesselState({warm:true});s.setFiring(1);s.setTelegraph(1);
  for(let i=0;i<600;i++)s.step(.1);
  const before=s.rpm[0];s.setTelegraph(-1);s.step(.1);assert.ok(s.rpm[0]>0 && s.rpm[0]<before);
  for(let i=0;i<600;i++)s.step(.1);assert.ok(s.rpm[0]<-70);
  s.emergencyStop();s.step(.1);assert.ok(Math.abs(s.rpm[0])>1);assert.equal(s.coolingPump,true);
});
test('steering limits, input validation and bounded tab catch-up', () => {
  const s=new VesselState();s.setRudder(900);s.step(300);close(s.time,.25,1e-9);
  assert.ok(s.rudder<=3*Math.PI/180*.25+1e-9);
  for(let i=0;i<200;i++)s.step(.1);close(s.rudder,32*Math.PI/180,1e-8);
  assert.throws(()=>s.setTelegraph(Infinity));assert.throws(()=>s.step(-1));
});
test('liner response and ocean remain finite and restrained', () => {
  const s=new VesselState({warm:true});
  for(let i=0;i<5000;i++)s.step(.1);
  assert.ok(Math.abs(s.heave)<.3 && Math.abs(s.roll)<.0181 && Math.abs(s.pitch)<.0121);
  assert.ok(Number.isFinite(waveHeight(50,-9,10)));
});
