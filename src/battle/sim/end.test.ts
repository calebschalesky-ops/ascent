// PKG-23 (QA-05 F-06): a battle where one side has nothing left fighting ends with an outcome within 15 s.
// Seed 3 on saturn-12v12 is the reproduction: before PKG-23 the player's fleet had no active ship at 5:11 and the battle
// ran on to 8:11 (the full 180 s pursuit window) while broken stragglers that could not jump sat in the field.
import { describe, expect, it } from 'vitest';
import { SATURN_12V12, createBattle, step } from './index';
import { SIDES, inField } from './types';
import type { SideId } from './types';

/** Runs a battle to its end; returns when each side first had no active ship, and no ship in the field. */
function timeline(seed: number) {
  const b = createBattle(SATURN_12V12, seed);
  const noActive: Partial<Record<SideId, number>> = {};
  const noField: Partial<Record<SideId, number>> = {};
  while (!b.ended) {
    step(b);
    for (const side of SIDES) {
      const mine = b.ships.filter((s) => s.side === side);
      if (noActive[side] === undefined && !mine.some((s) => s.status === 'active')) noActive[side] = b.t;
      if (noField[side] === undefined && !mine.some((s) => inField(s.status))) noField[side] = b.t;
    }
  }
  return { b, noActive, noField };
}

describe('the battle ends when a side has nothing left fighting (PKG-23, QA-05 F-06)', { timeout: 60_000 }, () => {
  it('seed 3 (the old 180 s hang) ends within 15 s of the player losing his last active ship', () => {
    const { b, noActive } = timeline(3);
    expect(noActive.player).toBeDefined();
    expect(b.outcome).not.toBeNull();
    expect(b.endT! - noActive.player!).toBeLessThanOrEqual(15);
    // The stragglers are why it used to hang: ships still broken in the field when it ended.
    expect(b.ships.some((s) => s.side === 'player' && s.status === 'broken')).toBe(true);
  });

  it('seeds 1-4: every side that runs out of active ships, or of ships in the field, sees the end within 15 s', () => {
    for (const seed of [1, 2, 3, 4]) {
      const { b, noActive, noField } = timeline(seed);
      expect(b.outcome, `seed ${seed}`).not.toBeNull();
      for (const side of SIDES) {
        const first = Math.min(noActive[side] ?? Infinity, noField[side] ?? Infinity);
        if (first !== Infinity) expect(b.endT! - first, `seed ${seed} ${side}`).toBeLessThanOrEqual(15);
      }
    }
  });
});
