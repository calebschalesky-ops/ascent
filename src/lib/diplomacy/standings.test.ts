import { describe, expect, it } from 'vitest';
import type { NationId } from '../nations';
import { HOUSES, attitude, bandOf, bloodEnemies, decayClaims, feudAge, firstRaider, migrateStandings, newStandings, shift, shotAt } from './standings';

describe('standings (GP-01)', () => {
  it('is a 7×7 table, every cell in -100..100', () => {
    const s = newStandings();
    expect(Object.keys(s.v)).toHaveLength(7);
    for (const a of HOUSES) {
      expect(Object.keys(s.v[a])).toHaveLength(7);
      for (const b of HOUSES) expect(Math.abs(s.v[a][b])).toBeLessThanOrEqual(100);
    }
  });

  it("proves every start's blood enemy (FEUDS.md 3)", () => {
    const want: Record<NationId, NationId[]> = {
      earth: ['mars'], moon: ['venus'], mercury: [], venus: ['moon'], mars: ['earth', 'jupiter'], jupiter: ['mars'], saturn: [],
    };
    for (const h of HOUSES) expect(bloodEnemies(h).sort()).toEqual(want[h].sort());
    const s = newStandings();
    for (const h of HOUSES) for (const e of bloodEnemies(h)) {
      expect(bandOf(s, h, e)).toBe('blood');
      expect(bandOf(s, e, h)).toBe('blood');
      expect(attitude(s, e, h)).toBe('engage');
      expect(feudAge(h, e)).toBeTruthy();
    }
  });

  it('claim feuds start Hostile one way and come back after a truce', () => {
    const s = newStandings();
    for (const [a, b] of [['jupiter', 'saturn'], ['mars', 'saturn'], ['venus', 'jupiter']] as [NationId, NationId][]) {
      expect(bandOf(s, a, b)).toBe('hostile');
      shift(s, a, b, 80); // a truce bought
      expect(bandOf(s, a, b)).not.toBe('hostile');
      decayClaims(s, 200);
      expect(bandOf(s, a, b)).toBe('hostile');
    }
    expect(bandOf(s, 'saturn', 'jupiter')).toBe('wary'); // Saturn's side is only wary
  });

  it('blood feuds are locked: no shift moves them', () => {
    const s = newStandings();
    expect(shift(s, 'earth', 'mars', 500)).toBe('blood');
    expect(s.v.earth.mars).toBe(-100);
  });

  it('bands: Hostile engages, Wary shadows, Friendly and Allied hold fire (FEUDS.md 6.2)', () => {
    const s = newStandings();
    expect(attitude(s, 'saturn', 'earth')).toBe('shadow'); // "not our mother": wary
    expect(attitude(s, 'moon', 'earth')).toBe('shadow'); // "wary daughter"
    expect(attitude(s, 'earth', 'moon')).toBe('hold'); // "holds close": friendly
    s.v.earth.moon = 70;
    expect(bandOf(s, 'earth', 'moon')).toBe('allied');
    expect(attitude(s, 'earth', 'moon')).toBe('hold');
    expect(bandOf(s, 'jupiter', 'saturn')).toBe('hostile');
    expect(attitude(s, 'jupiter', 'saturn')).toBe('engage');
  });

  it('a shot drops Wary to Hostile at once, and cools a friend', () => {
    const s = newStandings();
    expect(shotAt(s, 'saturn', 'earth')).toBe('hostile');
    expect(bandOf(s, 'venus', 'earth')).toBe('friendly');
    expect(shotAt(s, 'venus', 'earth')).toBe('wary');
    expect(shotAt(s, 'venus', 'earth')).toBe('hostile');
  });

  it("each start's first raider: the blood enemy, the belt war, or the house you regard worst", () => {
    const s = newStandings();
    const want: Record<NationId, NationId> = { earth: 'mars', moon: 'venus', venus: 'moon', mars: 'jupiter', jupiter: 'mars', mercury: 'venus', saturn: 'jupiter' };
    for (const h of HOUSES) expect(firstRaider(s, h)).toBe(want[h]);
    // and every first raider engages that start on sight
    for (const h of HOUSES) if (h !== 'mercury') expect(attitude(s, firstRaider(s, h), h)).not.toBe('hold'); // Mercury's is a hired company: raiders engage whatever their house's standing
  });

  it('migrates a save, keeping blood locked', () => {
    const s = newStandings();
    s.v.venus.earth = 55;
    const back = migrateStandings(JSON.parse(JSON.stringify({ v: { ...s.v, earth: { ...s.v.earth, mars: 90 } } })))!;
    expect(back.v.venus.earth).toBe(55);
    expect(back.v.earth.mars).toBe(-100);
    expect(migrateStandings(null)).toBeNull();
  });
});
