import { describe, expect, it } from 'vitest';
import type { V3 } from './nav';
import { dist, dot, len, unit } from './nav';
import { MUNITIONS } from './munitions';
import type { FireView, Gun } from './pilot';
import { arrive, fireOrders, flyCoupled, flyFree, leadDir, lockLine, scatter, stepEnemyLock } from './pilot';
import { boltMiss } from './weapons';

const gun = (id: keyof typeof MUNITIONS, cd = 0): Gun => ({ id, m: MUNITIONS[id], cd, ammo: MUNITIONS[id].ammo });
const view = (o: Partial<FireView> = {}): FireView => ({
  pos: [0, 0, 0], vel: [0, 0, 0], fwd: [0, 0, -1], arc: 'nose', noseCone: 0.09,
  target: { pos: [0, 0, -100], vel: [0, 0, 0], r: 0.35 }, locked: false, energy: 100, los: true, threats: [], chased: false, ...o,
});

describe('flight', () => {
  it('coupled: the nose turns at its rate and the ship flies along it', () => {
    const b = { pos: [0, 0, 0] as V3, vel: [0, 0, -10] as V3, fwd: [0, 0, -1] as V3 };
    flyCoupled(b, [1, 0, 0], 20, { speed: 30, accel: 10, turn: 1 }, 0.1);
    expect(Math.acos(dot(b.fwd, [0, 0, -1]))).toBeCloseTo(0.1);
    expect(len(b.vel)).toBeCloseTo(11);
    expect(dot(unit(b.vel), b.fwd)).toBeCloseTo(1);
  });
  it('free: velocity and nose are separate; speed is capped', () => {
    const b = { pos: [0, 0, 0] as V3, vel: [0, 0, 0] as V3, fwd: [0, 0, -1] as V3 };
    for (let i = 0; i < 100; i++) flyFree(b, [0, 0, 50], [1, 0, 0], { speed: 20, accel: 10, turn: 0.5 }, 0.1);
    expect(len(b.vel)).toBeCloseTo(20);
    expect(b.vel[2]).toBeGreaterThan(19); // backing away …
    expect(b.fwd[0]).toBeGreaterThan(0.99); // … while facing sideways
  });
  it('arrive slows to a stop at the goal', () => {
    expect(len(arrive([0, 0, 0], [1000, 0, 0], 20, 5))).toBeCloseTo(20);
    expect(len(arrive([0, 0, 0], [1, 0, 0], 20, 5))).toBeLessThan(5);
  });
});

describe('the enemy lock', () => {
  it('builds over the lock time while on target and drains off it', () => {
    let p = 0;
    for (let i = 0; i < 30; i++) p = stepEnemyLock(p, true, 0.05, 1.5, 1.2);
    expect(p).toBeCloseTo(1);
    p = stepEnemyLock(p, false, 0.5, 1.5, 1.2);
    expect(p).toBeCloseTo(0.4);
  });
  it('a fighter locks down its nose; a warship’s launchers turn to bear', () => {
    expect(lockLine('nose', [0, 0, -1], [0, 0, 0], [0, 0, -100], 0.3)).toBe(true);
    expect(lockLine('nose', [0, 0, -1], [0, 0, 0], [100, 0, 0], 0.3)).toBe(false);
    expect(lockLine('broadside', [0, 0, -1], [0, 0, 0], [0, 0, 100], 0.3)).toBe(true);
  });
});

describe('fire orders', () => {
  it('leads a crossing target: a bolt fired on the lead hits it', () => {
    const tv: V3 = [30, 0, 0];
    const d = leadDir([0, 0, 0], [0, 0, 0], 260, [0, 0, -150], tv);
    expect(d[0]).toBeGreaterThan(0.05);
    expect(boltMiss([0, 0, 0], d, 260, [0, 0, -150], tv, 1.6)).toBeLessThan(0.05);
  });
  it('a fighter fires its gun only when the lead is inside its nose cone', () => {
    expect(fireOrders([gun('pulse')], view()).map((o) => o.id)).toEqual(['pulse']);
    expect(fireOrders([gun('pulse')], view({ target: { pos: [60, 0, -100], vel: [0, 0, 0], r: 0.35 } }))).toEqual([]);
  });
  it('nothing fires without a clear line, on cooldown, or out of range', () => {
    expect(fireOrders([gun('pulse')], view({ los: false }))).toEqual([]);
    expect(fireOrders([gun('pulse', 0.1)], view())).toEqual([]);
    expect(fireOrders([gun('pulse')], view({ target: { pos: [0, 0, -1000], vel: [0, 0, 0], r: 0.35 } }))).toEqual([]);
  });
  it('missiles need a lock and a minimum range; torpedoes are not fired point-blank', () => {
    expect(fireOrders([gun('seeker')], view())).toEqual([]);
    expect(fireOrders([gun('seeker')], view({ locked: true })).map((o) => o.id)).toEqual(['seeker']);
    expect(fireOrders([gun('torpedo')], view({ locked: true, target: { pos: [0, 0, -20], vel: [0, 0, 0], r: 0.35 } }))).toEqual([]);
    expect(fireOrders([gun('torpedo')], view({ locked: true, target: { pos: [0, 0, -200], vel: [0, 0, 0], r: 0.35 } })).map((o) => o.id)).toEqual(['torpedo']);
  });
  it('a capital ship’s batteries fire to the side, not ahead', () => {
    const side = view({ arc: 'broadside', target: { pos: [100, 0, 0], vel: [0, 0, 0], r: 0.35 } });
    expect(fireOrders([gun('pulse')], side).length).toBe(1);
    expect(fireOrders([gun('pulse')], view({ arc: 'broadside' }))).toEqual([]);
  });
  it('flak shoots at an incoming missile before the ship (point defence)', () => {
    const o = fireOrders([gun('flak')], view({ arc: 'broadside', threats: [[0, 30, 0]] }));
    expect(o[0].at).toBe('missile');
    expect(o[0].dir[1]).toBeCloseTo(1);
  });
  it('a beam fires while the target is inside its reach and arc; energy gates it', () => {
    expect(fireOrders([gun('beam')], view({ arc: 'forward' })).length).toBe(1);
    expect(fireOrders([gun('beam')], view({ arc: 'forward', target: { pos: [0, 0, -200], vel: [0, 0, 0], r: 0.35 } }))).toEqual([]);
    expect(fireOrders([gun('beam')], view({ arc: 'forward', energy: 0 }))).toEqual([]);
  });
  it('mines drop only with a pursuer behind', () => {
    expect(fireOrders([gun('mine')], view())).toEqual([]);
    expect(fireOrders([gun('mine')], view({ chased: true }))[0].dir).toEqual([-0, -0, 1]);
  });
  it('scatter stays within its angle', () => {
    for (let i = 0; i < 50; i++) {
      const s = scatter([0, 0, -1], 0.05, Math.random(), Math.random());
      expect(Math.acos(Math.min(1, dot(s, [0, 0, -1])))).toBeLessThanOrEqual(0.0501);
    }
    expect(dist(scatter([0, 0, -1], 0, 0.5, 0.5), [0, 0, -1])).toBeLessThan(1e-12);
  });
});
