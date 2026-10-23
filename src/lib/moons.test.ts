import { describe, expect, it } from 'vitest';
import { MAJOR_MOONS, MOONS, MOON_PLANETS, isMajorMoon, moonsOf, seenFromPark } from './moons';
import { KM_PER_UNIT, RADIUS_KM } from './bodies';
import { BODY, LIMIT, destGeometry, dist } from './nav';
import { allMoons, moonHost } from './world';

const geo = destGeometry();
const at = (id: string) => geo.find((g) => g.id === id)!;

describe('moons, from JPL', () => {
  it('has every moon JPL lists for each planet (read 2026-10-18)', () => {
    const count = (p: string) => MOONS.filter((m) => m.planet === p).length;
    expect([count('earth'), count('mars'), count('jupiter'), count('saturn')]).toEqual([1, 2, 115, 291]);
    expect(MOONS.some((m) => (m.planet as string) === 'mercury' || (m.planet as string) === 'venus')).toBe(false);
    expect(new Set(MOONS.map((m) => m.code)).size).toBe(MOONS.length);
  });
  it('takes the big moons’ radii from JPL’s physical-parameters table', () => {
    const r = (id: string) => MOONS.find((m) => m.id === id)!.radiusKm;
    expect([r('moon'), r('phobos'), r('io'), r('ganymede'), r('titan'), r('mimas')]).toEqual([1737.4, 11.08, 1821.49, 2631.2, 2574.76, 198.2]);
    expect(MOONS.filter((m) => m.radiusSource === 'phys_par').length).toBe(28);
  });
});

describe('moons in the scene', () => {
  const placed = allMoons(geo);
  it('places every moon of Mars, Jupiter and Saturn', () => {
    expect(placed.length).toBe(2 + 115 + 291);
  });
  it('sizes each moon true to scale with its planet', () => {
    for (const pm of placed.filter((p) => p.moon.radiusKm !== null)) {
      expect(pm.size / BODY[pm.moon.planet as 'mars']).toBeCloseTo(pm.moon.radiusKm! / RADIUS_KM[pm.moon.planet], 9);
    }
  });
  it('sets every moon at its true distance from its planet, outside the planet, and inside the edge', () => {
    for (const p of MOON_PLANETS) {
      const g = at(p);
      for (const pm of placed.filter((x) => x.moon.planet === p)) {
        const d = dist(pm.pos, g.pos);
        expect(d * KM_PER_UNIT).toBeCloseTo(pm.moon.aKm, 0);
        expect(d).toBeGreaterThan(g.size + pm.size);
        expect(dist(pm.pos, at('sun').pos)).toBeLessThan(LIMIT - 5);
      }
    }
  });
  it('keeps the moons in their real order outward', () => {
    for (const p of MOON_PLANETS) {
      const ms = placed.filter((x) => x.moon.planet === p).sort((a, b) => a.moon.q - b.moon.q);
      for (let i = 1; i < ms.length; i++) expect(ms[i].dist).toBeGreaterThanOrEqual(ms[i - 1].dist);
    }
  });
  it('makes the round moons of Jupiter and Saturn (190 km and up) the major ones, Phobos and Deimos not', () => {
    // Until real scale this was "the ones seen from the parking distance"; at true distances Iapetus is a speck from
    // Saturn, but it is round, a destination and in the lore, so the rule is the moon's own size.
    const round = MOONS.filter((m) => (m.planet === 'jupiter' || m.planet === 'saturn') && (m.radiusKm ?? 0) >= 190).map((m) => m.id);
    expect(round).toEqual(MAJOR_MOONS);
    expect(moonsOf('mars').some((m) => isMajorMoon(m.id))).toBe(false);
    expect(placed.filter((pm) => isMajorMoon(pm.moon.id) && seenFromPark(pm, moonHost(at(pm.moon.planet)))).length).toBeGreaterThanOrEqual(9);
  });
  it('keeps the major moons clear of each other', () => {
    const big = placed.filter((pm) => isMajorMoon(pm.moon.id));
    for (const a of big) for (const b of big) if (a !== b) expect(dist(a.pos, b.pos)).toBeGreaterThan(a.size * 1.25 + b.size * 1.25 + 2);
  });
});
