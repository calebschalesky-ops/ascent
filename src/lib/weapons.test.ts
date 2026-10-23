import { describe, expect, it } from 'vitest';
import type { V3 } from './nav';
import { add, dist, scale, unit } from './nav';
import type { Missile } from './weapons';
import { LASER, LOCK, MISSILE, SHIP_RADIUS, boltMiss, dodgeDir, intercept, noLock, stepLock, stepMissile, sweptHit, turnToward, underReticle, wantsDodge } from './weapons';

const fly = (target: (t: number) => V3, start: Missile, dodge?: { at: number; dir: V3; speed: number }) => {
  const m = { ...start };
  let t = 0;
  let pos = target(0);
  let hit = false;
  let dodged = false;
  const dt = 1 / 60;
  while (t < MISSILE.life && !hit) {
    pos = target(t);
    if (dodge && !dodged && wantsDodge(m, pos, 0, 1)) { dodged = true; dodge.at = t; }
    if (dodged) pos = add(pos, scale(dodge!.dir, (t - dodge!.at) * dodge!.speed));
    const [a, b] = stepMissile(m, pos, dt, MISSILE.speed);
    hit = sweptHit(a, b, pos, MISSILE.radius + SHIP_RADIUS);
    t += dt;
  }
  return { hit, dodged, m };
};

describe('missiles', () => {
  const launch = (dir: V3): Missile => ({ pos: [0, 0, 0], vel: scale(unit(dir), 10), speed: 10, age: 0, target: 0, homing: true });

  it('turns only a little each step (slight homing)', () => {
    const d = turnToward([1, 0, 0], [0, 0, 1], 0.1);
    expect(Math.acos(d[0])).toBeCloseTo(0.1, 6);
  });
  it('homes onto a target off to the side and hits it', () => {
    const r = fly(() => [120, 0, 30], launch([1, 0, 0]));
    expect(r.hit).toBe(true);
  });
  it('without homing, a missile fired the same way misses that target', () => {
    const m = launch([1, 0, 0]);
    m.homing = false;
    expect(fly(() => [120, 0, 30], m).hit).toBe(false);
  });
  it('switches the homing off once close, then flies straight', () => {
    const m = launch([1, 0, 0]);
    const target: V3 = [200, 0, 0];
    let steps = 0;
    while (m.homing && steps < 1000) { stepMissile(m, target, 1 / 60, MISSILE.speed); steps++; }
    expect(m.homing).toBe(false);
    expect(dist(m.pos, target)).toBeLessThan(MISSILE.homingOff);
    const before = unit(m.vel);
    stepMissile(m, [200, 50, 0], 1 / 60, MISSILE.speed); // the target jumps: the missile no longer follows
    expect(unit(m.vel)).toEqual(before);
  });
  it('hits a target that holds course, and misses one that dodges at the last second', () => {
    const moving = (t: number): V3 => [150 + t * 3, 0, 20];
    expect(fly(moving, launch([1, 0, 0])).hit).toBe(true);
    const r = fly(moving, launch([1, 0, 0]), { at: 0, dir: dodgeDir([1, 0, 0], 1), speed: 14 });
    expect(r.dodged).toBe(true);
    expect(r.hit).toBe(false);
  });
  it('does not dodge while the missile is still homing, or when the roll fails', () => {
    const m = launch([1, 0, 0]);
    m.pos = [-10, 0, 0];
    expect(wantsDodge(m, [0, 0, 0], 0, 1)).toBe(false); // still homing
    m.homing = false;
    expect(wantsDodge(m, [0, 0, 0], 0.9, 0.35)).toBe(false); // roll fails
    expect(wantsDodge(m, [0, 0, 0], 0.1, 0.35)).toBe(true);
  });
});

describe('lasers', () => {
  it('hits along a fast segment that passes the ship between frames', () => {
    expect(sweptHit([0, 0, 0], [20, 0, 0], [10, 0.5, 0], 0.7)).toBe(true);
    expect(sweptHit([0, 0, 0], [20, 0, 0], [10, 2, 0], 0.7)).toBe(false);
  });
});

describe('missile lock (hold the reticle on a ship)', () => {
  const dt = 1 / 30;
  const hold = (s: ReturnType<typeof noLock>, under: number | null, seconds: number, kept = true) => {
    for (let t = 0; t < seconds - 1e-9; t += dt) stepLock(s, under, kept, dt);
    return s;
  };
  it('does not lock before LOCK.time on the ship, and locks after it', () => {
    const s = hold(noLock(), 7, LOCK.time - 0.1);
    expect(s.locked).toBe(false);
    expect(s.id).toBe(7);
    expect(s.progress).toBeGreaterThan(0.9);
    hold(s, 7, 0.2);
    expect(s.locked).toBe(true);
  });
  it('drains while the reticle is off the ship, and keeps nothing once drained', () => {
    const s = hold(noLock(), 7, 1);
    const p = s.progress;
    hold(s, null, 0.2);
    expect(s.progress).toBeCloseTo(p - 0.2 * LOCK.decay, 5);
    hold(s, null, 1);
    expect(s.progress).toBe(0);
    expect(s.id).toBe(null);
  });
  it('a second ship crossing the reticle does not steal a lock in progress', () => {
    const s = hold(noLock(), 7, 1);
    hold(s, 9, 0.2);
    expect(s.id).toBe(7);
    expect(s.locked).toBe(false);
  });
  it('a held lock survives a wobble inside LOCK.keep and breaks beyond it', () => {
    const s = hold(noLock(), 7, LOCK.time + 0.1);
    hold(s, null, 0.5, true); // reticle slipped off, but the ship is still near the sight line
    expect(s.locked).toBe(true);
    stepLock(s, null, false, dt); // looked away
    expect(s.locked).toBe(false);
    expect(s.id).toBe(null);
  });
  it('the reticle covers a ship by cone or by its size, whichever is bigger', () => {
    expect(underReticle([0, 0, 0], [0, 0, -1], [0, 2, -100], 0.5)).toBe(true); // 1.1°, inside the 3° cone
    expect(underReticle([0, 0, 0], [0, 0, -1], [0, 10, -100], 0.5)).toBe(false); // 5.7°
    expect(underReticle([0, 0, 0], [0, 0, -1], [0, 0.9, -10], 1)).toBe(true); // 5.1°, but a big ship close up
  });
});

describe('laser lead', () => {
  it('finds where a bolt meets a crossing ship', () => {
    const p: V3 = [0, 0, -200];
    const v: V3 = [30, 0, 0];
    const r = intercept([0, 0, 0], LASER.speed, p, v)!;
    expect(r).not.toBeNull();
    // The bolt's path length equals its speed times the flight time.
    expect(dist([0, 0, 0], r.point)).toBeCloseTo(LASER.speed * r.t, 6);
    expect(dist(add(p, scale(v, r.t)), r.point)).toBeCloseTo(0, 9);
  });
  it('a still ship is its own lead point', () => {
    const r = intercept([0, 0, 0], 100, [0, 0, -50], [0, 0, 0])!;
    expect(r.t).toBeCloseTo(0.5, 9);
    expect(r.point).toEqual([0, 0, -50]);
  });
  it('a ship faster than the bolt and running away cannot be caught', () => {
    expect(intercept([0, 0, 0], 100, [0, 0, -50], [0, 0, -150])).toBeNull();
  });
  it('a bolt fired at the lead point will hit; one fired at the ship itself will miss', () => {
    const p: V3 = [0, 0, -200];
    const v: V3 = [30, 0, 0];
    const lead = intercept([0, 0, 0], LASER.speed, p, v)!.point;
    const reach = LASER.radius + SHIP_RADIUS;
    expect(boltMiss([0, 0, 0], unit(lead), LASER.speed, p, v)).toBeLessThan(1e-6);
    expect(boltMiss([0, 0, 0], unit(p), LASER.speed, p, v)).toBeGreaterThan(reach);
  });
  it('agrees with stepping bolts frame by frame against a moving ship', () => {
    const p: V3 = [40, 5, -180];
    const v: V3 = [-25, 4, 10];
    const lead = intercept([0, 0, 0], LASER.speed, p, v)!.point;
    const fire = (dir: V3) => {
      let b: V3 = [0, 0, 0];
      const bv = scale(unit(dir), LASER.speed);
      for (let t = 0; t < LASER.life; t += 1 / 30) {
        const from = b;
        b = add(b, scale(bv, 1 / 30));
        if (sweptHit(from, b, add(p, scale(v, t + 1 / 30)), LASER.radius + SHIP_RADIUS)) return true;
      }
      return false;
    };
    expect(fire(lead)).toBe(true);
    expect(fire(p)).toBe(false);
  });
});
