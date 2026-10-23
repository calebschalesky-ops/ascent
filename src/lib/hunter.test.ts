import { describe, expect, it } from 'vitest';
import { HULL } from './destroyer';
import type { Mover } from './hunter';
import { bears, fly, gunshipThink, hunterThink, turnToward } from './hunter';
import type { V3 } from './nav';
import { dot, len } from './nav';

const L = 0.3708;
const still = (fwd: V3 = [0, 0, -1]): Mover => ({ pos: [0, 0, 0], vel: [0, 0, 0], fwd, speed: 0 });

/** Fly a hull flat out for `t` seconds; its speed in ship lengths a second. */
function topSpeed(t: keyof typeof HULL, seconds = 20) {
  let m = still();
  for (let i = 0; i < seconds * 60; i++) m = fly(m, [0, 0, -1000], HULL[t], L, 1 / 60);
  return m.speed / L;
}
/** Seconds to turn half round, flying at top speed. */
function halfTurn(t: keyof typeof HULL) {
  let m: Mover = { ...still(), speed: HULL[t].speed * L, vel: [0, 0, -HULL[t].speed * L] };
  let s = 0;
  while (dot(m.fwd, [0, 0, 1]) < 0.999 && s < 60) { m = fly(m, [0.0001, 0, 1000], HULL[t], L, 1 / 60); s += 1 / 60; }
  return s;
}

describe('flight', () => {
  it('turns at most the turn rate a step', () => {
    const a = turnToward([0, 0, -1], [1, 0, 0], 0.1);
    expect(Math.acos(dot(a, [0, 0, -1]))).toBeCloseTo(0.1, 6);
    expect(len(turnToward([0, 0, -1], [0, 0, 1], 0.2))).toBeCloseTo(1, 9); // straight behind still turns
  });
  it('a destroyer’s top speed beats the cruiser’s and the capital ship’s', () => {
    const [d, c, k] = [topSpeed('destroyer'), topSpeed('cruiser'), topSpeed('capital', 40)];
    expect(d).toBeCloseTo(HULL.destroyer.speed, 3);
    expect(d).toBeGreaterThan(c);
    expect(d).toBeGreaterThan(k);
  });
  it('a destroyer turns half round sooner than either', () => {
    const d = halfTurn('destroyer');
    expect(d).toBeCloseTo(Math.PI / HULL.destroyer.turn, 1);
    expect(d).toBeLessThan(halfTurn('cruiser'));
    expect(d).toBeLessThan(halfTurn('capital'));
  });
});

describe('the hunter', () => {
  const prey = { pos: [0, 0, -100] as V3, vel: [0, 0, 0] as V3, fwd: [0, 0, 1] as V3, cone: 0.2 };
  it('runs in at full speed from afar', () => {
    const o = hunterThink(still(), 1, prey, 40, HULL.destroyer, 1, 'run');
    expect(o.mode).toBe('run');
    expect(len(o.want)).toBeCloseTo(HULL.destroyer.speed, 6);
    expect(o.want[2]).toBeLessThan(0);
  });
  it('circles inside its gun range, moving out of the prey’s nose', () => {
    const me: Mover = { ...still(), pos: [0, 0, -80] }; // 20 in front of the prey's nose
    const o = hunterThink(me, 1, prey, 40, HULL.destroyer, 1, 'run');
    expect(o.mode).toBe('circle');
    expect(dot(o.want, prey.fwd)).toBeLessThanOrEqual(1e-9);
  });
  it('breaks off when badly hurt', () => {
    const o = hunterThink(still(), 0.1, prey, 40, HULL.destroyer, 1, 'circle');
    expect(o.mode).toBe('break');
    expect(o.want[2]).toBeGreaterThan(0);
  });
  it('a gunship points at its prey; a turret bears anywhere, a fixed gun only near the nose', () => {
    const g = gunshipThink(still(), prey, 40, 700, HULL.cruiser, 1);
    expect(g.aim).toEqual([0, 0, -1]);
    expect(bears([0, 0, -1], [0, 0, 1], Math.PI)).toBe(true);
    expect(bears([0, 0, -1], [1, 0, 0], 0.2)).toBe(false);
  });
});
