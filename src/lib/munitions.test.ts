import { describe, expect, it } from 'vitest';
import { LASER, MISSILE } from './weapons';
import { MUNITIONS, MUNITION_IDS, areaFalloff, fireBlock, flakBursts, homes, mineTriggers, salvoDirs, scaleMunition } from './munitions';

describe('munition table', () => {
  it('has ten munitions, each with a role, an effect and sane numbers', () => {
    expect(MUNITION_IDS).toHaveLength(10);
    for (const id of MUNITION_IDS) {
      const m = MUNITIONS[id];
      expect(m.id).toBe(id);
      expect(m.role.length).toBeGreaterThan(5);
      expect(m.effect.length).toBeGreaterThan(5);
      expect(m.damage).toBeGreaterThan(0);
      expect(m.shieldMul).toBeGreaterThanOrEqual(0);
      expect(m.hullMul).toBeGreaterThanOrEqual(0);
      expect(m.pierce).toBeGreaterThanOrEqual(0);
      expect(m.pierce).toBeLessThanOrEqual(1);
      // Every munition costs something: ammo or energy.
      expect(m.ammo !== null || m.energy > 0).toBe(true);
      if (m.delivery === 'missile') expect(m.seeker).toBeDefined();
      if (m.lock !== 'none') expect(m.lockTime).toBeGreaterThan(0);
    }
  });
  it('keeps the original laser and missile numbers', () => {
    expect(MUNITIONS.pulse.speed).toBe(LASER.speed);
    expect(MUNITIONS.pulse.damage).toBe(LASER.damage);
    expect(MUNITIONS.seeker.damage).toBe(MISSILE.damage);
    expect(MUNITIONS.seeker.lockTime).toBe(1.5);
  });
});

describe('fire rules', () => {
  const full = { energy: 100, ammo: 10, locked: false };
  it('a torpedo will not fire without a lock; a seeker will', () => {
    expect(fireBlock(MUNITIONS.torpedo, full)).toBe('lock');
    expect(fireBlock(MUNITIONS.torpedo, { ...full, locked: true })).toBeNull();
    expect(fireBlock(MUNITIONS.seeker, full)).toBeNull();
  });
  it('ammo weapons stop when empty; energy weapons when the capacitor is short', () => {
    expect(fireBlock(MUNITIONS.rail, { ...full, ammo: 0 })).toBe('ammo');
    expect(fireBlock(MUNITIONS.plasma, { ...full, energy: 5 })).toBe('energy');
    expect(fireBlock(MUNITIONS.pulse, { ...full, energy: 3 })).toBeNull();
  });
  it('a beam pays per second: one frame costs energy × dt', () => {
    expect(fireBlock(MUNITIONS.beam, { ...full, energy: 1 }, 1 / 30)).toBeNull();
    expect(fireBlock(MUNITIONS.beam, { ...full, energy: 0.5 }, 1 / 30)).toBe('energy');
  });
  it('homes only for locking munitions with a held lock', () => {
    expect(homes(MUNITIONS.seeker, true)).toBe(true);
    expect(homes(MUNITIONS.seeker, false)).toBe(false);
    expect(homes(MUNITIONS.pulse, true)).toBe(false);
  });
});

describe('area damage', () => {
  it('full in the inner third, linear to zero at the edge', () => {
    expect(areaFalloff(0, 12)).toBe(1);
    expect(areaFalloff(4, 12)).toBe(1);
    expect(areaFalloff(8, 12)).toBeCloseTo(0.5, 9);
    expect(areaFalloff(12, 12)).toBe(0);
    expect(areaFalloff(20, 12)).toBe(0);
    expect(areaFalloff(1, 0)).toBe(0);
  });
  it('mines wait to arm, then go off inside their fuse', () => {
    const m = MUNITIONS.mine;
    expect(mineTriggers(m, 1, 2)).toBe(false); // not armed
    expect(mineTriggers(m, 2, 9)).toBe(false); // too far
    expect(mineTriggers(m, 2, 7.9)).toBe(true);
  });
  it('flak bursts on proximity or at the end of its life', () => {
    const f = MUNITIONS.flak;
    expect(flakBursts(f, 0.2, 3.9)).toBe(true);
    expect(flakBursts(f, 0.2, 50)).toBe(false);
    expect(flakBursts(f, f.life, 50)).toBe(true);
  });
});

describe('salvo and scale', () => {
  it('fans a salvo evenly at the given angle off the nose', () => {
    const dirs = salvoDirs([0, 0, -1], 6, 0.25);
    expect(dirs).toHaveLength(6);
    for (const d of dirs) {
      expect(Math.hypot(...d)).toBeCloseTo(1, 9);
      expect(Math.acos(-d[2])).toBeCloseTo(0.25, 6);
    }
    const sum = dirs.reduce((a, d) => [a[0] + d[0], a[1] + d[1], a[2] + d[2]], [0, 0, 0]);
    expect(Math.abs(sum[0]) + Math.abs(sum[1])).toBeLessThan(1e-9); // balanced round the nose
  });
  it('scales distances and speeds, not damage or time', () => {
    const t = scaleMunition(MUNITIONS.torpedo, 2);
    expect(t.speed).toBe(0);
    expect(t.range).toBe(1200);
    expect(t.area).toBe(20);
    expect(t.seeker!.top).toBe(90);
    expect(t.damage).toBe(MUNITIONS.torpedo.damage);
    expect(t.life).toBe(MUNITIONS.torpedo.life);
  });
});
