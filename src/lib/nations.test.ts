import { describe, expect, it } from 'vitest';
import { NATIONS, PLAYER_NATION, nationOf, patrolDir, patrolFits, patrolPos, patrolRadius, ringClear, ringRadius, shipCount } from './nations';
import { destGeometry, dist, len } from './nav';
import { SHIP_TYPES } from './shipTypes';

describe('nations', () => {
  const geo = destGeometry();
  const PLAYER_LEN = 0.18 * 2.06; // SHIP × the model's length today
  it('one nation controls Earth, the Moon and each planet except the Sun; the player is Earth', () => {
    expect(NATIONS.map((n) => n.home)).toEqual(['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']);
    expect(NATIONS.filter((n) => n.player).map((n) => n.id)).toEqual([PLAYER_NATION]);
    expect(nationOf('sun')).toBeUndefined();
    expect(nationOf('mars')?.player).toBe(false);
  });
  it('every nation fields a capital ship, a destroyer, two cruisers and four fighters', () => {
    for (const n of NATIONS) {
      expect(n.force).toEqual({ capital: 1, cruiser: 2, fighter: 4, destroyer: 1 });
      expect(shipCount(n)).toBe(8);
    }
  });
  it('each type circles its home on its own ring, clear of the surface and inside the orbit zone', () => {
    for (const n of NATIONS) {
      const home = geo.find((g) => g.id === n.home)!;
      expect(patrolFits(home)).toBe(true);
      for (const type of SHIP_TYPES) {
        // Holds with the ship at today's scale and with it three times bigger.
        expect(ringClear(home, type, PLAYER_LEN)).toBe(true);
        expect(ringClear(home, type, PLAYER_LEN * 3)).toBe(true);
        for (let i = 0; i < n.force[type]; i++) {
          for (const t of [0, 3.3, 47, 300]) expect(dist(patrolPos(home, i, n.force[type], t, type), home.pos)).toBeCloseTo(ringRadius(home, type), 4);
        }
      }
    }
  });
  it('the capital ship holds station; cruisers and fighters move, fighters faster', () => {
    const mars = geo.find((g) => g.id === 'mars')!;
    expect(dist(patrolPos(mars, 0, 1, 0, 'capital'), patrolPos(mars, 0, 1, 60, 'capital'))).toBe(0);
    expect(len(patrolDir(mars, 0, 1, 0, 'capital'))).toBeGreaterThan(0); // still has a heading
    const moved = (type: 'cruiser' | 'fighter') => dist(patrolPos(mars, 0, 2, 0, type), patrolPos(mars, 0, 2, 1, type)) / ringRadius(mars, type);
    expect(moved('cruiser')).toBeGreaterThan(0);
    expect(moved('fighter')).toBeGreaterThan(moved('cruiser'));
  });
  it('spreads a nation’s patrols apart, and keeps the types’ rings apart', () => {
    const mars = geo.find((g) => g.id === 'mars')!;
    expect(dist(patrolPos(mars, 0, 4, 0, 'fighter'), patrolPos(mars, 1, 4, 0, 'fighter'))).toBeGreaterThan(1);
    for (const g of geo.filter((x) => NATIONS.some((n) => n.home === x.id))) {
      // Wider apart than half a capital ship plus a cruiser's length, at every home, the Moon included.
      expect(ringRadius(g, 'cruiser') - ringRadius(g, 'capital')).toBeGreaterThan(PLAYER_LEN * 3.5);
      expect(ringRadius(g, 'capital') - ringRadius(g, 'fighter')).toBeGreaterThan(PLAYER_LEN * 3.5);
    }
  });
  it('flies inside where the autopilot parks, so its ships are seen against their planet', () => {
    for (const n of NATIONS) {
      const home = geo.find((g) => g.id === n.home)!;
      expect(patrolRadius(home)).toBeLessThan(home.stop);
    }
  });
});
