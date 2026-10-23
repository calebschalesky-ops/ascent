import { describe, expect, it } from 'vitest';
import type { V3 } from '../../lib/nav';
import { shipAxes } from '../../lib/nav';
import { AIM, aimError, aimRates, angleBetween, anglesOf, elevation, look } from './aim';

const UP: V3 = [0, 1, 0];
const MAX_YAW = 1.2;
const MAX_PITCH = 0.95;

/** The space flight model's turn, as Voyage runs it: rates ease toward what is asked, then integrate. */
function fly(aim: V3, seconds: number, ship = { yaw: 0, pitch: 0, yawRate: 0, pitchRate: 0 }, maxYaw = MAX_YAW, maxPitch = MAX_PITCH) {
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    const r = aimRates(aimError(aim, shipAxes(ship.yaw, ship.pitch).fwd, UP), maxYaw, maxPitch, { yaw: ship.yawRate, pitch: ship.pitchRate });
    const ease = 1 - Math.exp(-dt * 5);
    ship.yawRate += (r.yaw - ship.yawRate) * ease;
    ship.pitchRate += (r.pitch - ship.pitchRate) * ease;
    ship.yaw += ship.yawRate * dt;
    ship.pitch = Math.max(-1.4, Math.min(1.4, ship.pitch + ship.pitchRate * dt));
  }
  return ship;
}

describe('heading steering', () => {
  it('never looks past the pitch limit, so the view does not flip over', () => {
    let a: V3 = [0, 0, -1];
    for (let i = 0; i < 50; i++) a = look(a, UP, 0, 0.2);
    expect(elevation(a, UP)).toBeCloseTo(AIM.pitchLimit, 6);
    expect(a[2]).toBeLessThan(0); // still facing the way it was
  });
  it('no turn once the nose is on the aim', () => {
    const fwd = shipAxes(0.3, -0.2).fwd;
    const r = aimRates(aimError(fwd, fwd, UP), MAX_YAW, MAX_PITCH);
    expect(r.yaw).toBeCloseTo(0, 9);
    expect(r.pitch).toBeCloseTo(0, 9);
  });
  it('the aim error in space is the difference of the flight model angles', () => {
    const e = aimError(shipAxes(0.5, 0.3).fwd, shipAxes(0.2, -0.1).fwd, UP);
    expect(e.yaw).toBeCloseTo(0.3, 6);
    expect(e.pitch).toBeCloseTo(0.4, 6);
  });
  it('the nose converges on the aim and stops without overshooting', () => {
    const aim = shipAxes(0.9, 0.4).fwd;
    const s = fly(aim, 4);
    expect(angleBetween(shipAxes(s.yaw, s.pitch).fwd, aim)).toBeLessThan(0.002);
    expect(Math.abs(s.yawRate)).toBeLessThan(0.01);
    // No overshoot on the way: the yaw never passes the aim's.
    const t = { yaw: 0, pitch: 0, yawRate: 0, pitchRate: 0 };
    let most = 0;
    for (let i = 0; i < 240; i++) { fly(aim, 1 / 60, t); most = Math.max(most, t.yaw); }
    expect(most).toBeLessThan(0.9 + 0.002);
  });
  it('a big error turns at the hull rate, and a capital ship turns slower', () => {
    const r = aimRates(aimError(shipAxes(2.5, 0).fwd, shipAxes(0, 0).fwd, UP), MAX_YAW, MAX_PITCH);
    expect(r.yaw).toBeCloseTo(MAX_YAW, 9);
    const cruiser = fly(shipAxes(1.2, 0).fwd, 0.8);
    const capital = fly(shipAxes(1.2, 0).fwd, 0.8, undefined, MAX_YAW * 0.35, MAX_PITCH * 0.35);
    expect(capital.yaw).toBeLessThan(cruiser.yaw * 0.6);
  });
  it('works against a tilted up (an atmosphere far round the planet)', () => {
    const up: V3 = [1, 0, 0];
    const fwd: V3 = [0, 0, -1];
    const aim = look(fwd, up, 0.4, 0.2);
    const e = aimError(aim, fwd, up);
    expect(e.yaw).toBeCloseTo(0.4, 6);
    expect(e.pitch).toBeCloseTo(0.2, 6);
  });
  it('angles of a direction match the flight model', () => {
    const a = anglesOf(shipAxes(-1.1, 0.25).fwd);
    expect(a.yaw).toBeCloseTo(-1.1, 6);
    expect(a.pitch).toBeCloseTo(0.25, 6);
  });
});
