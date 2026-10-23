import { describe, expect, it } from 'vitest';
import { SHIP_SPECS } from '../../lib/shipTypes';
import { breakThreshold } from './captains';
import {
  SATURN_12V12, VARIANTS, breakShip, canFire, canJump, canLaunch, canThrust, createBattle, fire, hashState, openSides,
  order, pdChance, run, sideFacing, step, summarise,
} from './index';
import { MORALE, SIZE_REL, sideOffset } from './numbers';
import { draw, makeRng } from './rng';
import { forward } from './ships';
import { SHIELD_SIDES, SYSTEMS, inField } from './types';
import type { Battle, ShieldSide, Ship, SystemId } from './types';
import { SYSTEMS_BEHIND } from './numbers';

const fresh = (seed = 1) => createBattle(SATURN_12V12, seed);
const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;

/** Clear the field down to one shooter and one target, placed so the shooter sits off `side` of the target. */
function duel(side: ShieldSide, range = 2000): { b: Battle; shooter: Ship; target: Ship } {
  const b = fresh();
  const shooter = ship(b, 'p2'); // a cruiser
  const target = ship(b, 'e3'); // a destroyer
  for (const s of b.ships) if (s !== shooter && s !== target) s.status = 'withdrawn';
  target.pos = { x: 0, y: 0, z: 0 };
  target.heading = 0;
  const f = forward(target.heading + sideOffset[side]);
  shooter.pos = { x: f.x * range, y: 0, z: f.z * range };
  shooter.captain.abilities.gunnery = 10;
  target.captain.trait = 'By-the-book';
  return { b, shooter, target };
}

describe('battle sim: rng', () => {
  it('is seeded and repeatable', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    const xs = Array.from({ length: 5 }, () => draw(a));
    expect(Array.from({ length: 5 }, () => draw(b))).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(a.n).toBe(5);
  });
});

describe('battle sim: setup and captains', () => {
  it('is 12 v 12 with one flagship a side, captains 1–10 with a trait', () => {
    const b = fresh();
    expect(b.ships.filter((s) => s.side === 'player')).toHaveLength(12);
    expect(b.ships.filter((s) => s.side === 'enemy')).toHaveLength(12);
    expect(b.ships.filter((s) => s.flagship)).toHaveLength(2);
    for (const s of b.ships) {
      for (const v of Object.values(s.captain.abilities)) expect(v >= 1 && v <= 10).toBe(true);
      expect(s.captain.trait).toBeTruthy();
      expect(s.captain.loyalty >= 0 && s.captain.loyalty <= 100).toBe(true);
    }
    expect(new Set(b.ships.map((s) => s.captain.name)).size).toBe(24);
  });

  it('keeps the ShipType sizes in step with lib/shipTypes', () => {
    expect(SIZE_REL.capital).toBe(SHIP_SPECS.capital.size);
    expect(SIZE_REL.destroyer).toBe(SHIP_SPECS.destroyer.size);
    expect(SIZE_REL.cruiser).toBe(SHIP_SPECS.cruiser.size);
  });

  it('the swap variant flips the player captains’ Nerve and Judgement only', () => {
    const a = fresh(3);
    const b = createBattle(SATURN_12V12, 3, { variant: 'swap-nerve-judgement' });
    expect(Object.keys(VARIANTS)).toContain('swap-nerve-judgement');
    a.ships.forEach((s, i) => {
      const t = b.ships[i];
      if (s.side === 'player') {
        expect(t.captain.abilities.nerve).toBe(11 - s.captain.abilities.nerve);
        expect(t.captain.abilities.judgement).toBe(11 - s.captain.abilities.judgement);
        expect(t.captain.abilities.gunnery).toBe(s.captain.abilities.gunnery);
      } else expect(t.captain).toEqual(s.captain);
    });
  });
});

describe('battle sim: determinism and serialisation', { timeout: 60_000 }, () => {
  it('same seed twice gives the identical state hash after 15 minutes', () => {
    const a = run(fresh(4));
    const b = run(fresh(4));
    expect(a.ended).toBe(true);
    expect(hashState(a)).toBe(hashState(b));
    expect(summarise(a).hash).toBe(summarise(b).hash);
    expect(hashState(run(fresh(5)))).not.toBe(hashState(a));
  }, 30_000); // PKG-05: three full battles; under a loaded full-suite run this passed 5 s on claude/game @ e3bd8df too

  it('round-trips through JSON mid-battle and carries on identically', () => {
    const a = fresh(2);
    run(a, 60);
    const json = JSON.stringify(a);
    const b = JSON.parse(json) as Battle;
    expect(JSON.stringify(b)).toBe(json);
    run(a, 120);
    run(b, 120);
    expect(hashState(b)).toBe(hashState(a));
  });

  it('never reads wall time: no Date or performance in the sim', async () => {
    const mods = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const [path, src] of Object.entries(mods)) {
      if (path.endsWith('.test.ts')) continue;
      expect(src, path).not.toMatch(/Date\.now|new Date|performance\.now|Math\.random/);
    }
  });
});

describe('battle sim: shield sides', () => {
  for (const side of SHIELD_SIDES) {
    it(`fire from off the ${side} lands on ${side}, opens it, then reaches the hull`, () => {
      const { b, shooter, target } = duel(side);
      expect(sideFacing(target, shooter.pos)).toBe(side);
      const hull0 = target.hull;
      let shots = 0;
      while (!target.open[side] && shots < 2000) { fire(b, shooter, 'rail', target); shots++; }
      expect(target.open[side]).toBe(true);
      expect(openSides(target)).toEqual([side]);
      for (const other of SHIELD_SIDES) if (other !== side) expect(target.shields[other]).toBeGreaterThan(0);
      expect(target.hull).toBe(hull0);
      for (let i = 0; i < 20; i++) fire(b, shooter, 'rail', target);
      expect(target.hull).toBeLessThan(hull0);
      expect(target.crew).toBeLessThan(target.crewMax);
    });
  }

  it('shifting power moves capacity between sides and logs the order', () => {
    const b = fresh();
    const s = ship(b, 'p3');
    expect(order(b, 'p3', { kind: 'shieldPower', split: { fore: 0.7, aft: 0.1, port: 0.1, starboard: 0.1 } })).toBe(true);
    expect(s.split.fore).toBeCloseTo(0.7);
    expect(s.shields.aft).toBeLessThanOrEqual(s.shieldTotal * 0.1 + 1e-9);
    expect(b.log.some((e) => e.kind === 'order' && e.ship === 'p3' && e.ok)).toBe(true);
  });
});

describe('battle sim: systems', () => {
  const sideFor = (sys: SystemId): ShieldSide => SHIELD_SIDES.find((k) => SYSTEMS_BEHIND[k].includes(sys))!;
  for (const sys of SYSTEMS) {
    it(`knocks out ${sys} through the side it sits behind, with its effect`, () => {
      const side = sideFor(sys);
      const { b, shooter, target } = duel(side);
      target.hull = target.hullMax * 10; // keep it afloat long enough to lose the system
      target.hullMax = target.hullMax * 10;
      target.systems[sys] = 5;
      target.shields[side] = 0;
      target.open[side] = true;
      let shots = 0;
      while (target.systems[sys] > 0 && shots < 2000) { fire(b, shooter, 'rail', target); shots++; }
      expect(target.systems[sys]).toBe(0);
      expect(b.log.some((e) => e.kind === 'systemOut' && e.ship === target.id && e.system === sys)).toBe(true);
      if (sys === 'engines') {
        expect(canThrust(target)).toBe(false);
        target.speed = 0;
        target.order = null;
        order(b, target.id, { kind: 'attack', target: shooter.id });
        shooter.pos = { x: 50000, y: 0, z: 0 };
        for (let i = 0; i < 60; i++) step(b);
        expect(target.speed).toBe(0);
      }
      if (sys === 'guns') {
        expect(canFire(target)).toBe(false);
        const before = b.stats.sides.enemy.shots;
        for (let i = 0; i < 300; i++) step(b);
        expect(b.stats.sides.enemy.shots).toBe(before);
      }
      if (sys === 'pd') expect(pdChance(target)).toBe(0);
      if (sys === 'hangar') expect(canLaunch(target)).toBe(false);
      if (sys === 'jump') {
        expect(canJump(target)).toBe(false);
        breakShip(b, target, 'test');
        expect(target.status).toBe('struck');
      }
    });
  }

  it('a hull at zero is a wreck', () => {
    const { b, shooter, target } = duel('fore');
    target.shields.fore = 0;
    target.open.fore = true;
    target.hull = 1;
    let shots = 0;
    while (target.status === 'active' && shots < 500) { fire(b, shooter, 'rail', target); shots++; }
    expect(target.status).toBe('wrecked');
  });
});

describe('battle sim: morale', () => {
  it('low Nerve breaks sooner than high Nerve under the same morale', () => {
    const b = fresh();
    const low = ship(b, 'p2');
    const high = ship(b, 'p4');
    for (const s of [low, high]) { s.captain.trait = 'By-the-book'; s.lastHullHitAt = 0; }
    low.captain.abilities.nerve = 2;
    high.captain.abilities.nerve = 9;
    expect(breakThreshold(low.captain)).toBeGreaterThan(breakThreshold(high.captain));
    const m = (breakThreshold(low.captain) + breakThreshold(high.captain)) / 2;
    low.morale = m;
    high.morale = m;
    for (let i = 0; i < 30; i++) step(b);
    expect(low.status === 'broken' || low.status === 'struck' || low.status === 'fled').toBe(true);
    expect(high.status).toBe('active');
  });

  it('losing the flagship drops every ship’s morale in one tick and breaks the side', () => {
    const b = fresh();
    run(b, 5);
    const flag = ship(b, b.sides.enemy.flagshipId);
    const before = new Map(b.ships.filter((s) => s.side === 'enemy').map((s) => [s.id, s.morale]));
    const shooter = ship(b, 'p6');
    flag.hull = 1;
    for (const k of SHIELD_SIDES) { flag.shields[k] = 0; flag.open[k] = true; }
    let shots = 0;
    while (flag.status === 'active' && shots < 500) { fire(b, shooter, 'rail', flag); shots++; }
    expect(flag.status).toBe('wrecked');
    const drop = b.log.find((e) => e.kind === 'flagshipLost');
    expect(drop && drop.kind === 'flagshipLost' && drop.side).toBe('enemy');
    for (const s of b.ships) {
      if (s.side !== 'enemy' || s === flag || !inField(s.status)) continue;
      expect(before.get(s.id)! - s.morale).toBeGreaterThanOrEqual(MORALE.flagshipLost - 1e-9);
    }
    for (let i = 0; i < 31; i++) step(b);
    expect(b.sides.enemy.broken).toBe(true);
    expect(b.ships.filter((s) => s.side === 'enemy' && s.status === 'active')).toHaveLength(0);
    expect(b.winner).toBe('player');
  });
});

describe('battle sim: orders and the idle battle', { timeout: 60_000 }, () => {
  it('accepts the order set, refuses bad orders, and logs both', () => {
    const b = fresh();
    expect(order(b, 'p3', { kind: 'attack', target: 'e5' })).toBe(true);
    expect(order(b, 'p3', { kind: 'focusSide', target: 'e5', side: 'port' })).toBe(true);
    expect(order(b, 'p3', { kind: 'holdPosition' })).toBe(true);
    expect(order(b, 'p3', { kind: 'followFlagship' })).toBe(true);
    expect(order(b, 'p3', { kind: 'withdraw' })).toBe(true);
    expect(order(b, 'p3', { kind: 'attack', target: 'p4' })).toBe(false);
    expect(order(b, 'nope', { kind: 'holdPosition' })).toBe(false);
    expect(b.stats.orders).toBe(7);
    expect(b.log.filter((e) => e.kind === 'order')).toHaveLength(7);
  });

  it('an idle battle ends with an outcome, damage both ways, breaks and captains’ own decisions', () => {
    const b = run(fresh(1));
    const s = summarise(b);
    expect(['victory', 'defeat', 'withdrawal']).toContain(s.outcome);
    expect(s.sides.player.damageAt60).toBeGreaterThan(0);
    expect(s.sides.enemy.damageAt60).toBeGreaterThan(0);
    expect(s.brokenShips).toBeGreaterThan(0);
    expect(s.selfDecisions).toBeGreaterThan(0);
    expect(s.timeoutDecisions.every((d) => !!d.trait && !!d.why)).toBe(true);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
