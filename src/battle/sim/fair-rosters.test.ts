/**
 * PKG-13: fair rosters. Both sides start with the same captain quality: each ability's total, per class of hull and so
 * per fleet, is equal; each class carries the same traits on both sides; captains are still varied ship by ship and
 * still come from the roster seed.
 */
import { describe, expect, it } from 'vitest';
import { fairRosters } from './captains';
import { SATURN_12V12, createBattle } from './index';
import { ABILITY } from './numbers';
import { makeRng } from './rng';
import type { AbilityId, Battle } from './types';

const KEYS: AbilityId[] = ['gunnery', 'helm', 'nerve', 'judgement', 'candour'];
/** Roster r as generated, then evened by fairRosters on its own seeded stream (the switch in createBattle is ABILITY.fairRosters). */
const roster = (r: number, seed = 1) => {
  const b = createBattle(SATURN_12V12, seed, { rosterSeed: r });
  if (!ABILITY.fairRosters) fairRosters(b.ships, makeRng(r ^ 0x51ed));
  return b;
};
const total = (b: Battle, side: string, k: AbilityId, cls?: string) =>
  b.ships.filter((s) => s.side === side && (!cls || s.cls === cls)).reduce((t, s) => t + s.captain.abilities[k], 0);

describe('fair rosters (PKG-13)', () => {
  it('gives both sides the same total of each ability, fleet-wide and per class of hull, on rosters 1-8', () => {
    for (let r = 1; r <= 8; r++) {
      const b = roster(r);
      for (const k of KEYS) {
        expect(Math.abs(total(b, 'player', k) - total(b, 'enemy', k)), `roster ${r} ${k}`).toBeLessThanOrEqual(5);
        for (const cls of ['capital', 'destroyer', 'cruiser', 'carrier', 'escort']) {
          expect(Math.abs(total(b, 'player', k, cls) - total(b, 'enemy', k, cls)), `roster ${r} ${k} ${cls}`)
            .toBeLessThanOrEqual(ABILITY.fairTotalTol);
        }
      }
    }
  });

  it('gives each class the same traits on both sides', () => {
    for (let r = 1; r <= 8; r++) {
      const b = roster(r);
      for (const cls of ['capital', 'destroyer', 'cruiser', 'carrier', 'escort']) {
        const traits = (side: string) => b.ships.filter((s) => s.side === side && s.cls === cls).map((s) => s.captain.trait).sort();
        expect(traits('enemy'), `roster ${r} ${cls}`).toEqual(traits('player'));
      }
    }
  });

  it('keeps captains varied ship by ship, every ability 1-10', () => {
    for (let r = 1; r <= 8; r++) {
      const b = roster(r);
      for (const side of ['player', 'enemy']) {
        const caps = b.ships.filter((s) => s.side === side).map((s) => s.captain.abilities);
        for (const k of KEYS) {
          const vals = caps.map((a) => a[k]);
          expect(new Set(vals).size, `roster ${r} ${side} ${k}`).toBeGreaterThan(2);
          for (const v of vals) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(10); }
        }
      }
    }
  });

  it('is seeded: the same roster seed gives the same captains under any battle seed, another seed other captains', () => {
    const caps = (b: Battle) => JSON.stringify(b.ships.map((s) => s.captain));
    expect(caps(roster(3, 1))).toBe(caps(roster(3, 9)));
    expect(caps(roster(3, 1))).not.toBe(caps(roster(4, 1)));
  });
});
