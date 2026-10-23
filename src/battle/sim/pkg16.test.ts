/**
 * PKG-16: the amended WORLD-02 checks 3–4 (outcome rank first, ships lost second), the "Bar at 30 seeds" column, and the
 * `player-ui-like` policy.
 */
import { describe, expect, it } from 'vitest';
import { bar30Cell, compareOutcome, formatTable, OUTCOME_RANK } from './checks';
import type { CheckRow } from './checks';
import { POLICIES, SATURN_12V12, createBattle, run } from './index';
import type { Summary } from './summary';

const sum = (outcome: string, lost: number) => ({ outcome, sides: { player: { shipsLost: lost } } }) as unknown as Summary;

describe('PKG-16: WORLD-02 checks 3–4 rank the outcome first', () => {
  it('victory 2 > withdrawal 1 > defeat 0', () => {
    expect([OUTCOME_RANK.victory, OUTCOME_RANK.withdrawal, OUTCOME_RANK.defeat]).toEqual([2, 1, 0]);
  });
  it('a better outcome wins whatever it cost; at equal rank, fewer ships lost wins; equal is no better', () => {
    expect(compareOutcome(sum('victory', 6), sum('withdrawal', 2))).toBe(1);
    expect(compareOutcome(sum('defeat', 1), sum('withdrawal', 5))).toBe(-1);
    expect(compareOutcome(sum('withdrawal', 2), sum('withdrawal', 3))).toBe(1);
    expect(compareOutcome(sum('withdrawal', 3), sum('withdrawal', 3))).toBe(0);
  });
});

describe('PKG-16: the 30-seed bar column', () => {
  const r: CheckRow = { check: 3, what: 'x', passRange: 'y', need: '24 of 30', got: '23 of 30; more', status: 'FAIL' };
  it('judges 24 of 30 on a 30-seed run and names the bar otherwise', () => {
    expect(bar30Cell(r, 30)).toBe('24 of 30: FAIL');
    expect(bar30Cell({ ...r, got: '24 of 30' }, 30)).toBe('24 of 30: pass');
    expect(bar30Cell(r, 10)).toMatch(/run --seeds 30/);
  });
  it('adds the column only for the checks the scripts judge at 30 seeds', () => {
    const t = formatTable('WORLD-02', [r, { ...r, check: 5 }], 30).split('\n');
    expect(t[0]).toMatch(/Bar at 30 seeds/);
    expect(t[2]).toMatch(/\| 24 of 30: FAIL \|$/);
    expect(t[3]).toMatch(/\| - \|$/);
    expect(formatTable('WORLD-02', [r])).not.toMatch(/Bar at 30/);
  });
});

describe('PKG-16: player-ui-like', { timeout: 60_000 }, () => {
  it('is registered, orders through order() only, and is deterministic', () => {
    expect(POLICIES['player-ui-like']).toBeTypeOf('function');
    const go = () => {
      const b = createBattle(SATURN_12V12, 6, { maxMinutes: 3, controllers: { player: 'player-ui-like' } });
      run(b);
      return b;
    };
    const a = go();
    expect(a.log.filter((e) => e.kind === 'order' && e.by === 'player').length).toBeGreaterThan(10);
    expect(go().stats.orders).toBe(a.stats.orders);
  });
});
