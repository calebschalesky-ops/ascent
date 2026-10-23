import { describe, expect, it } from 'vitest';
import type { V3 } from '../../lib/nav';
import { add, dist, dot, scale, unit } from '../../lib/nav';
import { STANCE, clampCone, nextStance, scrollDistance, stanceSteer } from './stance';
import type { Stance } from './stance';

/** Fly a point-mass that points instantly and flies at the speed asked for (the steering law alone). */
function fly(stance: Stance, pos: V3, tPos: V3, tVel: V3, d: number, seconds: number) {
  let p = pos;
  let t = tPos;
  let fwd: V3 = unit(scale(tPos, -1));
  const dt = 1 / 30;
  let speeds: number[] = [];
  for (let i = 0; i < seconds * 30; i++) {
    const s = stanceSteer(stance, p, fwd, t, tVel, d);
    fwd = s.dir;
    p = add(p, scale(s.dir, s.speed * dt));
    t = add(t, scale(tVel, dt));
    speeds.push(s.speed);
  }
  speeds = speeds.slice(-30);
  return { p, t, fwd, speed: speeds[speeds.length - 1] };
}

describe('stances', () => {
  it('R cycles approach, orbit, keep at range, off', () => {
    expect(nextStance(null)).toBe('approach');
    expect(nextStance('approach')).toBe('orbit');
    expect(nextStance('orbit')).toBe('range');
    expect(nextStance('range')).toBeNull();
  });
  it('hold R and scroll: the wheel sets the distance within limits', () => {
    expect(scrollDistance(100, 1, 10, 1000)).toBeCloseTo(100 * STANCE.notch, 9);
    expect(scrollDistance(100, -1, 10, 1000)).toBeCloseTo(100 / STANCE.notch, 9);
    expect(scrollDistance(11, -1, 10, 1000)).toBe(10);
  });
  it('approach closes to the distance and stops there, facing the target', () => {
    const r = fly('approach', [0, 0, 0], [0, 0, -500], [0, 0, 0], 100, 20);
    expect(dist(r.p, r.t)).toBeGreaterThan(99);
    expect(dist(r.p, r.t)).toBeLessThan(101);
    expect(r.speed).toBeLessThan(0.1);
    expect(dot(r.fwd, unit([0, 0, -1]))).toBeGreaterThan(0.99);
  });
  it('approach never backs away from a target that is too close', () => {
    const s = stanceSteer('approach', [0, 0, 0], [0, 0, -1], [0, 0, -20], [0, 0, 0], 100);
    expect(s.speed).toBe(0);
  });
  it('keep at range backs off a target that is too close and follows one that runs', () => {
    const near = fly('range', [0, 0, 0], [0, 0, -20], [0, 0, 0], 100, 20);
    expect(dist(near.p, near.t)).toBeGreaterThan(98);
    const run = fly('range', [0, 0, 0], [0, 0, -100], [30, 0, 0], 100, 30);
    expect(Math.abs(dist(run.p, run.t) - 100)).toBeLessThan(2);
  });
  it('orbit settles at its distance and keeps circling', () => {
    const r = fly('orbit', [0, 0, 0], [0, 0, -300], [0, 0, 0], 120, 40);
    expect(Math.abs(dist(r.p, r.t) - 120)).toBeLessThan(6);
    expect(r.speed).toBeGreaterThan(120 * STANCE.orbitRate * 0.9);
  });
  it('the guns swing within the gun arc, never past it', () => {
    const arc = (40 * Math.PI) / 180;
    const c = clampCone([1, 0, 0], [0, 0, -1], arc);
    expect(Math.acos(dot(c, [0, 0, -1]))).toBeCloseTo(arc, 6);
    expect(c[0]).toBeGreaterThan(0); // toward where the mouse is
    const inside = clampCone(unit([0.1, 0, -1]), [0, 0, -1], arc);
    expect(dot(inside, unit([0.1, 0, -1]))).toBeCloseTo(1, 9);
  });
});
