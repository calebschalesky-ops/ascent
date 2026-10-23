import { describe, expect, it } from 'vitest';
import { MUNITION_IDS } from './munitions';
import { MODULES, defaultLoadout, fitted, modulesFor, nextWeapon, sanitizeLoadout } from './modules';
import { COUNTERS, DRONES, decoyVisible, droneOffset, nearestWithin, recharge, repairStep, spoofed } from './tech';

describe('module table', () => {
  it('lists every munition, unique ids, a tier, and no prices (the economy is undecided)', () => {
    for (const id of MUNITION_IDS) expect(MODULES.some((m) => m.id === id && m.slot === 'weapon')).toBe(true);
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length);
    for (const m of MODULES) {
      expect([1, 2, 3]).toContain(m.tier);
      expect(m.cost).toBeNull();
      expect(m.changes.length).toBeGreaterThan(5);
    }
    expect(modulesFor('shield')).toHaveLength(12);
  });
});

describe('loadout', () => {
  it('the default flies the original laser and missile', () => {
    expect(defaultLoadout().weapons).toEqual(['pulse', 'seeker']);
    expect(fitted(defaultLoadout()).reactor.capacity).toBe(100);
  });
  it('drops unknown ids, dedupes and caps the slots, and always keeps a weapon', () => {
    const l = sanitizeLoadout({ weapons: ['rail', 'rail', 'nope', 'ion', 'flak', 'mine', 'beam'], drones: ['attack', 'repair', 'pointDefence'], shield: 'bogus', armour: 'armour-2', counter: null });
    expect(l.weapons).toEqual(['rail', 'ion', 'flak', 'mine']);
    expect(l.drones).toEqual(['attack', 'repair']);
    expect(l.shield).toBe('deflector-1');
    expect(l.armour).toBe('armour-2');
    expect(l.counter).toBeNull();
    expect(sanitizeLoadout({ weapons: [] }).weapons).toEqual(['pulse', 'seeker']);
    expect(sanitizeLoadout('junk')).toEqual(defaultLoadout());
  });
  it('resolves tiers into numbers', () => {
    const f = fitted({ ...defaultLoadout(), shield: 'hardened-3', targeting: 'targeting-3', reactor: 'reactor-2', armour: 'armour-1', engine: 'engine-3' });
    expect(f.shield.id).toBe('hardened');
    expect(f.shieldTier).toBe(3);
    expect(f.targeting.lockMul).toBe(0.5);
    expect(f.reactor.capacity).toBe(140);
    expect(f.armour.hull).toBe(40);
    expect(f.boost).toBe(4);
  });
  it('G cycles through the fitted weapons and wraps', () => {
    const w = ['pulse', 'rail', 'torpedo'] as const;
    expect(nextWeapon([...w], 'pulse')).toBe('rail');
    expect(nextWeapon([...w], 'torpedo')).toBe('pulse');
    expect(nextWeapon([...w], 'ion')).toBe('pulse'); // a weapon no longer fitted goes back to the first
  });
});

describe('tech', () => {
  it('decoys spoof by pull, and a better seeker resists them', () => {
    expect(spoofed(0.75, 0, 0.7)).toBe(true);
    expect(spoofed(0.75, 0, 0.8)).toBe(false);
    expect(spoofed(0.75, 0.6, 0.35)).toBe(false); // 0.75 × 0.4 = 0.3
    expect(spoofed(0.75, 1, 0)).toBe(false);
  });
  it('a missile sees a decoy close ahead, not one far off or behind', () => {
    expect(decoyVisible([0, 0, 0], [0, 0, -50], [0, 2, -20])).toBe(true);
    expect(decoyVisible([0, 0, 0], [0, 0, -50], [0, 0, -100])).toBe(false);
    expect(decoyVisible([0, 0, 0], [0, 0, -50], [0, 0, 20])).toBe(false);
  });
  it('drones circle at their orbit radius and pick the nearest thing in range', () => {
    const o = droneOffset(0, 2, 3, 1.6);
    expect(Math.hypot(...o)).toBeCloseTo(1.6, 9);
    const pts = [{ p: [50, 0, 0] as [number, number, number] }, { p: [20, 0, 0] as [number, number, number] }, { p: [90, 0, 0] as [number, number, number] }];
    expect(nearestWithin([0, 0, 0], pts, (x) => x.p, 60)).toBe(pts[1]);
    expect(nearestWithin([0, 0, 0], pts, (x) => x.p, 10)).toBeNull();
  });
  it('repair restores hull and shield at its rates, capped', () => {
    const r = repairStep(DRONES.repair, 50, 100, 95, 100, 2);
    expect(r.hull).toBe(58);
    expect(r.shield).toBe(100);
  });
  it('the reactor refills to its capacity', () => {
    expect(recharge(90, { capacity: 100, regen: 30 }, 1)).toBe(100);
    expect(recharge(10, { capacity: 100, regen: 30 }, 0.5)).toBe(25);
  });
  it('the jammer is passive; flares and chaff have charges', () => {
    expect(COUNTERS.jammer.charges).toBeNull();
    expect(COUNTERS.flare.charges).toBeGreaterThan(0);
  });
});
