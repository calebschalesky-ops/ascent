/**
 * PKG-08: one count of what a fleet has lost, shared by the break rule, the end reason and the tally; the per-strength
 * morale shock; EXP-06 step 6 (break half the enemy fleet and win) as sim behaviour; and the flagship's pods (step 4).
 */
import { describe, expect, it } from 'vitest';
import { SATURN_12V12, command, createBattle, shipOut, step, summarise } from './index';
import { fleetLosses, lossesText } from './losses';
import { MORALE, STRENGTH } from './numbers';
import type { Battle, Ship } from './types';

const fresh = (seed = 1) => createBattle(SATURN_12V12, seed);
const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
/** Hand a ship to the other side as boarding's capture() does (side flips, capturedFrom remembers the owner). */
function capture(s: Ship): void {
  s.capturedFrom = s.side;
  s.side = s.side === 'player' ? 'enemy' : 'player';
  s.prize = true;
}
/** Step to the next whole second, where morale and the break rule run. */
function toNextSecond(b: Battle): void {
  const t0 = Math.floor(b.t);
  while (Math.floor(b.t) === t0 && !b.ended) step(b);
}

describe('fleet losses (PKG-08)', () => {
  it('counts wrecked, struck, captured and fled by strength, and credits a prize while it is held', () => {
    const b = fresh();
    shipOut(b, ship(b, 'p2'), 'wrecked'); // cruiser, 2
    shipOut(b, ship(b, 'p3'), 'fled'); // destroyer, 3
    capture(ship(b, 'p4')); // cruiser, 2: taken by the enemy
    shipOut(b, ship(b, 'p5'), 'withdrawn'); // escort, 1 × withdrawnLossFrac
    capture(ship(b, 'e2')); // cruiser, 2: a prize the player holds
    const l = fleetLosses(b, 'player');
    expect(l.startStrength).toBe(27);
    expect([l.wrecked, l.struck, l.captured, l.lost, l.fled, l.withdrawn, l.prizes]).toEqual([1, 0, 1, 2, 1, 1, 1]);
    const gone = STRENGTH.cruiser + STRENGTH.destroyer + STRENGTH.cruiser + STRENGTH.escort * MORALE.withdrawnLossFrac;
    expect(l.strengthLost).toBeCloseTo(gone - STRENGTH.cruiser * MORALE.prizeCredit, 9);
    expect(l.frac).toBeCloseTo(l.strengthLost / 27, 9);
    // The enemy lost the prize: captured counts for it.
    expect(fleetLosses(b, 'enemy').captured).toBe(1);
  });

  it("a prize wrecked later is no gain to its captor and never the captor's own loss (the seed 1 '6 of 12' bug)", () => {
    const b = fresh();
    const prize = ship(b, 'e2');
    capture(prize);
    shipOut(b, prize, 'wrecked');
    const p = fleetLosses(b, 'player');
    expect([p.lost, p.fled, p.prizes, p.strengthLost]).toEqual([0, 0, 0, 0]);
    expect(fleetLosses(b, 'enemy').lost).toBe(1);
  });

  it('the break rule, its reason and the tally use the same numbers', () => {
    const b = fresh();
    // Past the break share (PKG-16: 0.56 of 27 = 15.1) out, flagship kept: destroyers 6, cruisers 8, escorts 2 = 16.
    for (const id of ['p3', 'p10', 'p2', 'p4', 'p1', 'p5']) shipOut(b, ship(b, id), 'wrecked');
    for (const id of ['p9', 'p11']) shipOut(b, ship(b, id), 'fled');
    const before = fleetLosses(b, 'player');
    expect(before.frac).toBeGreaterThanOrEqual(MORALE.sideBreakStrength);
    toNextSecond(b);
    expect(b.sides.player.broken).toBe(true);
    expect(b.sides.player.brokenReason).toBe(lossesText(before));
    expect(b.sides.player.brokenReason).toMatch(/ships lost 6, fled 2/);
    const sum = summarise(b);
    expect(sum.sides.player.shipsLost).toBe(before.lost);
    expect(sum.sides.player.fled).toBe(before.fled);
    expect(sum.sides.player.strengthLost).toBeCloseTo(before.frac, 3);
  });

  it('less than half the strength gone does not break the side, however many ships that is', () => {
    const b = fresh();
    // Six of twelve ships, but escorts and cruisers: 4 × 1 + 2 × 2 = 8 of 27.
    for (const id of ['p1', 'p5', 'p8', 'p12', 'p2', 'p4']) shipOut(b, ship(b, id), 'fled');
    for (const s of b.ships) if (s.side === 'player' && s.status === 'active') s.morale = 90;
    toNextSecond(b);
    expect(fleetLosses(b, 'player').frac).toBeLessThan(MORALE.sideBreakStrength);
    expect(b.sides.player.broken).toBe(false);
  });

  it('EXP-06 step 6: break half the enemy fleet and the battle ends in victory, the reason in the tally\'s words', () => {
    const b = fresh(6);
    for (const id of ['e3', 'e10', 'e2', 'e4', 'e9']) shipOut(b, ship(b, id), 'wrecked'); // 3 + 3 + 2 + 2 + 2 = 12
    shipOut(b, ship(b, 'e7'), 'struck'); // carrier, 3: 15 of 27
    shipOut(b, ship(b, 'e1'), 'wrecked'); // PKG-16: escort, 1: 16 of 27, past the 0.56 break share
    while (!b.ended) step(b);
    expect(b.outcome).toBe('victory');
    expect(b.winner).toBe('player');
    expect(b.reason).toMatch(/^House of Ganymede broke at 0:01: 59% of its strength gone: ships lost 7, fled 0/);
    expect(summarise(b).sides.enemy.shipsLost).toBeGreaterThanOrEqual(7);
  });

  it('a lost ship shakes its side by its strength: a destroyer more than an escort, a flight less than a wreck', () => {
    const shock = (id: string, how: 'wrecked' | 'fled') => {
      const b = fresh();
      const watcher = ship(b, 'p6');
      watcher.pos = { x: -1e6, y: 0, z: 0 }; // far from everyone: the plain, not the near, loss
      const m0 = watcher.morale;
      shipOut(b, ship(b, id), how);
      return m0 - watcher.morale;
    };
    expect(shock('p3', 'wrecked')).toBeGreaterThan(shock('p1', 'wrecked'));
    expect(shock('p3', 'wrecked') / shock('p1', 'wrecked')).toBeCloseTo(STRENGTH.destroyer / STRENGTH.escort, 6);
    expect(shock('p3', 'fled')).toBeCloseTo(shock('p3', 'wrecked') * MORALE.fledShock, 6);
  });
});

describe("the flagship's marine commander (PKG-08 step 4)", () => {
  it('launches pods from the capital flagship at an enemy ship in range', () => {
    const b = fresh();
    while (b.t < 1) step(b);
    const flag = ship(b, b.sides.player.flagshipId);
    expect(flag.cls).toBe('capital');
    const r = command(b, flag.id, { kind: 'launchPods', target: 'e3' });
    expect(r.ok).toBe(true);
    const launch = b.log.find((e) => e.kind === 'boardLaunch' && e.ship === flag.id);
    expect(launch).toBeDefined();
    expect(launch!.kind === 'boardLaunch' && launch!.pods).toBeGreaterThan(0);
  });
});
