import { describe, expect, it } from 'vitest';
import { FORCE, SHIP_SPECS, SHIP_TYPES, forceSize, hitRadius, shipLength } from './shipTypes';

describe('ship types', () => {
  it('a capital ship is about five player ships long, a cruiser one, a fighter a fifth', () => {
    expect(SHIP_SPECS.capital.size).toBe(5);
    expect(SHIP_SPECS.cruiser.size).toBe(1);
    expect(SHIP_SPECS.fighter.size).toBe(0.2);
    expect(shipLength('capital', 0.36)).toBeCloseTo(1.8, 9);
  });
  it('bigger ships take more hits, are easier to hit, patrol slower and dodge less', () => {
    const [c, r, f] = SHIP_TYPES.map((t) => SHIP_SPECS[t]);
    expect(c.hp).toBeGreaterThan(r.hp * 5);
    expect(r.hp).toBeGreaterThan(f.hp);
    expect(c.hitRadius).toBeGreaterThan(r.hitRadius);
    expect(r.hitRadius).toBeGreaterThan(f.hitRadius);
    expect(c.patrolSpeed).toBe(0); // holds station
    expect(f.patrolSpeed).toBeGreaterThan(r.patrolSpeed);
    expect(c.dodge).toBeLessThan(0.1);
    expect(f.dodge).toBeGreaterThan(r.dodge);
    for (const s of [c, r, f]) { expect(s.dodge).toBeGreaterThanOrEqual(0); expect(s.dodge).toBeLessThan(1); }
  });
  it('a capital ship’s hit sphere covers its hull; sizes scale with the player ship', () => {
    for (const t of SHIP_TYPES) expect(SHIP_SPECS[t].hitRadius).toBeGreaterThanOrEqual(SHIP_SPECS[t].size / 2);
    expect(hitRadius('cruiser', 2)).toBeCloseTo(2 * hitRadius('cruiser', 1), 9);
  });
  it('a nation fields 1 capital ship, 1 destroyer, 2 cruisers and 4 fighters', () => {
    expect(FORCE).toEqual({ capital: 1, cruiser: 2, fighter: 4, destroyer: 1 });
    expect(forceSize(FORCE)).toBe(8);
  });
});
