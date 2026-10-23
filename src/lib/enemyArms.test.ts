import { describe, expect, it } from 'vitest';
import { CLASS, CLASS_WEAPON, DOCTRINE, LEVEL_TIER, MAX_LEVEL, SHIP_CLASSES, levelOf, pickWeighted, rng, rollFit, seedOf, skillOf, tierOfModule, weaponWeight } from './enemyArms';
import { MUNITIONS } from './munitions';
import { ENEMY_FIT } from './tech';

const NATIONS = ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

describe('seeded roll', () => {
  it('is deterministic: the same inputs give the same ship', () => {
    expect(rollFit('mars', 'cruiser', 3, 7)).toEqual(rollFit('mars', 'cruiser', 3, 7));
    const a = rng(42); const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seedOf('mars', 1)).toBe(seedOf('mars', 1));
    expect(seedOf('mars', 1)).not.toBe(seedOf('mars', 2));
  });
  it('different seeds give different ships within one nation', () => {
    const fits = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(rollFit('mars', 'cruiser', 3, i).weapons)));
    expect(fits.size).toBeGreaterThan(3);
  });
  it('pickWeighted follows the weights and skips zeros', () => {
    expect(pickWeighted({ a: 0, b: 1 }, 0.01)).toBe('b');
    expect(pickWeighted({ a: 0 }, 0.5)).toBeNull();
    const r = rng(1);
    let a = 0;
    for (let i = 0; i < 4000; i++) if (pickWeighted({ a: 3, b: 1 }, r()) === 'a') a++;
    expect(a / 4000).toBeGreaterThan(0.7);
    expect(a / 4000).toBeLessThan(0.8);
  });
});

describe('ordered by class', () => {
  it('fighters lead with a gun and never carry heavy weapons', () => {
    for (const n of NATIONS) for (let s = 0; s < 40; s++) {
      const f = rollFit(n, 'fighter', 5, s);
      expect(f.weapons).toHaveLength(CLASS.fighter.weapons);
      expect(MUNITIONS[f.weapons[0]].delivery).toBe('bolt');
      for (const w of f.weapons) expect(['torpedo', 'rail', 'beam', 'flak']).not.toContain(w);
      expect(f.drones).toHaveLength(0);
    }
  });
  it('capital ships lead with a heavy weapon and always have point defence', () => {
    for (const n of NATIONS) for (let s = 0; s < 40; s++) {
      const f = rollFit(n, 'capital', levelOf(n, 'capital'), s);
      expect(['torpedo', 'beam', 'rail', 'plasma']).toContain(f.weapons[0]);
      expect(f.weapons.includes('flak') || f.drones.includes('pointDefence')).toBe(true);
      expect(f.weapons).toHaveLength(4);
    }
  });
  it('no weapon is repeated on one ship', () => {
    for (const c of SHIP_CLASSES) for (let s = 0; s < 40; s++) {
      const f = rollFit('jupiter', c, 4, s);
      expect(new Set(f.weapons).size).toBe(f.weapons.length);
    }
  });
});

describe('ordered by level', () => {
  it('a ship never carries a module above its level’s tier', () => {
    for (const n of NATIONS) for (const c of SHIP_CLASSES) for (let lv = 1; lv <= MAX_LEVEL; lv++) for (let s = 0; s < 10; s++) {
      const f = rollFit(n, c, lv, s);
      const cap = LEVEL_TIER[lv - 1];
      expect(f.tier).toBe(cap);
      for (const w of f.weapons) expect(tierOfModule(w)).toBeLessThanOrEqual(cap);
      for (const d of f.drones) expect(tierOfModule(d)).toBeLessThanOrEqual(cap);
      if (f.counter) expect(tierOfModule(f.counter)).toBeLessThanOrEqual(cap);
      expect(f.shieldTier).toBeLessThanOrEqual(cap);
      expect(f.shieldTier).toBeGreaterThanOrEqual(Math.max(1, cap - 1));
    }
  });
  it('level 1 never sees a torpedo or railgun; level 5 capitals often carry them', () => {
    for (let s = 0; s < 50; s++) expect(rollFit('jupiter', 'capital', 1, s).weapons.some((w) => w === 'torpedo' || w === 'rail')).toBe(false);
    let heavy = 0;
    for (let s = 0; s < 50; s++) if (rollFit('jupiter', 'capital', 5, s).weapons.some((w) => w === 'torpedo' || w === 'rail')) heavy++;
    expect(heavy).toBeGreaterThan(40);
  });
  it('skill rises with level', () => {
    expect(skillOf(1)).toBeLessThan(skillOf(3));
    expect(skillOf(5)).toBeCloseTo(0.8);
    expect(levelOf('jupiter', 'capital')).toBe(levelOf('jupiter', 'cruiser') + 1);
  });
});

describe('ordered by nation (doctrine)', () => {
  it('two ships of the same class and level from different nations differ, each in its own doctrine', () => {
    const mars = rollFit('mars', 'cruiser', 3, 1);
    const jup = rollFit('jupiter', 'cruiser', 3, 1);
    expect(mars.weapons).not.toEqual(jup.weapons);
    expect(mars.shield).toBe(ENEMY_FIT.mars.shield);
    expect(jup.shield).toBe(ENEMY_FIT.jupiter.shield);
  });
  it('over many rolls each nation favours its own doctrine’s weapons', () => {
    const share = (n: string, ids: string[]) => {
      let hit = 0, all = 0;
      for (let s = 0; s < 300; s++) for (const w of rollFit(n, 'cruiser', 5, s).weapons) { all++; if (ids.includes(w)) hit++; }
      return hit / all;
    };
    expect(share('mars', ['seeker', 'swarm', 'torpedo'])).toBeGreaterThan(share('jupiter', ['seeker', 'swarm', 'torpedo']) + 0.25);
    expect(share('jupiter', ['rail', 'torpedo', 'flak'])).toBeGreaterThan(share('mars', ['rail', 'torpedo', 'flak']) + 0.2);
    expect(share('venus', ['ion', 'beam'])).toBeGreaterThan(share('mercury', ['ion', 'beam']));
  });
  it('most picks are in doctrine; off-doctrine weapons are rare', () => {
    for (const n of NATIONS) {
      let off = 0, all = 0;
      for (let s = 0; s < 200; s++) for (const w of rollFit(n, 'cruiser', 5, s).weapons) { all++; if (!(w in DOCTRINE[n].weapons)) off++; }
      expect(off / all).toBeLessThan(0.35);
    }
  });
  it('the preferred shield and countermeasure follow ENEMY_FIT', () => {
    for (const n of NATIONS) {
      let same = 0;
      for (let s = 0; s < 100; s++) if (rollFit(n, 'cruiser', 5, s).shield === ENEMY_FIT[n].shield) same++;
      expect(same).toBeGreaterThan(55);
    }
    let chaff = 0;
    for (let s = 0; s < 50; s++) if (rollFit('jupiter', 'cruiser', 4, s).counter === 'chaff') chaff++;
    expect(chaff).toBe(50);
  });
  it('a class weight of zero is never overridden by doctrine', () => {
    expect(CLASS_WEAPON.fighter.torpedo).toBe(0);
    expect(weaponWeight('torpedo', 'fighter', DOCTRINE.mars, 3)).toBe(0);
  });
});
