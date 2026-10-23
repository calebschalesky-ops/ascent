import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BOARDING, ORDER_KINDS, SATURN_12V12, canJump, createBattle, fightOn, gunneryMul, hashState, massLocked, order, run,
  setShieldPower, step, summarise,
} from '../index';
import { resolve } from '../../../lib/boarding/troops';
import { wouldCapture } from './boarding';
import { sideOffset } from '../numbers';
import { forward } from '../ships';
import type { Battle, LogEvent, Order, ShieldSide, Ship } from '../types';

const SAVED = { ...BOARDING };
beforeEach(() => {
  // Point defence off unless a test turns it on, so pod counts are exact.
  BOARDING.pdKillScale = 0;
});
afterEach(() => { Object.assign(BOARDING, SAVED); });

const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
const events = <K extends LogEvent['kind']>(b: Battle, kind: K) => b.log.filter((e) => e.kind === kind) as Extract<LogEvent, { kind: K }>[];

/**
 * A two-ship arena: the player's carrier (p7) 3 km off one side of an enemy cruiser (e2); everyone else out of the
 * battle; neither side can break on losses or a missing flagship; no guns, so only boarding acts.
 */
function arena(side: ShieldSide = 'port', range = 3000): { b: Battle; carrier: Ship; target: Ship } {
  const b = createBattle(SATURN_12V12, 1);
  const carrier = ship(b, 'p7');
  const target = ship(b, 'e2');
  for (const s of b.ships) if (s !== carrier && s !== target) s.status = 'withdrawn';
  b.sides.player.initial = 100;
  b.sides.enemy.initial = 100;
  b.sides.player.flagshipId = carrier.id;
  b.sides.enemy.flagshipId = target.id;
  target.pos = { x: 0, y: 0, z: 0 };
  target.heading = 0;
  const f = forward(sideOffset[side]);
  carrier.pos = { x: f.x * range, y: 0, z: f.z * range };
  for (const s of [carrier, target]) {
    s.guns = [];
    s.captain.trait = 'By-the-book';
    s.stance = { mode: 'hold', target: null, side: null, present: null, why: 'test' };
  }
  carrier.captain.abilities.judgement = 1; // no boarding of its own unless a test says so
  return { b, carrier, target };
}

/** Power a side down to zero: it is open and stays open (regen has no max to fill). */
function openSide(t: Ship, side: ShieldSide) {
  const split = { fore: 1 / 3, aft: 1 / 3, port: 1 / 3, starboard: 1 / 3 };
  split[side] = 0;
  setShieldPower(t, split);
}

function stepUntil(b: Battle, done: () => boolean, maxS = 120): boolean {
  const stop = b.t + maxS;
  while (b.t < stop) {
    step(b);
    if (done()) return true;
  }
  return false;
}

describe('boarding: orders', () => {
  it('adds board and pullBack to the order set; refuses a board from a ship with no boarding hangar or at a flagship', () => {
    expect(ORDER_KINDS).toContain('board');
    expect(ORDER_KINDS).toContain('pullBack');
    const b = createBattle(SATURN_12V12, 1);
    expect(order(b, 'p2', { kind: 'board', target: 'e2' })).toBe(false); // a cruiser has no boarding hangar
    expect(order(b, 'p7', { kind: 'board', target: 'e6' })).toBe(false); // e6 is the enemy flagship
    expect(order(b, 'p7', { kind: 'board', target: 'p2' })).toBe(false); // own side
    const orders = events(b, 'order');
    expect(orders.slice(-3).every((e) => e.ok === false)).toBe(true);
    expect(b.stats.boardingAttempts).toBe(0);
  });
});

describe('boarding: the six steps', () => {
  it('is deflected by a side that is not down, and the marines come back', () => {
    const { b, carrier } = arena('port');
    const before = carrier.marines;
    expect(order(b, carrier.id, { kind: 'board', target: 'e2', side: 'port' })).toBe(true);
    expect(carrier.marines).toBe(before - 90);
    expect(stepUntil(b, () => events(b, 'boardDeflected').length > 0)).toBe(true);
    const d = events(b, 'boardDeflected')[0];
    expect(d.side).toBe('port');
    expect(events(b, 'breach')).toHaveLength(0);
    expect(carrier.marines).toBe(before);
    expect(b.stats.boardingAttempts).toBe(1);
    expect(b.boarding!.unordered).toBe(0);
  });

  it('loses pods to point defence on the way in: those marines are lost', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    BOARDING.pdKillScale = 100; // every pod's roll is under p
    order(b, carrier.id, { kind: 'board', target: target.id });
    expect(stepUntil(b, () => events(b, 'boardLost').length > 0)).toBe(true);
    const lost = events(b, 'boardLost')[0];
    expect(lost.pods).toBe(6);
    expect(lost.n).toBe(90);
    for (let i = 0; i < 300; i++) step(b);
    expect(events(b, 'breach')).toHaveLength(0);
    expect(carrier.marines).toBe(carrier.marinesMax - 90);
  });

  it('point defence draws from the battle RNG once per pod, with p from pdChance', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    BOARDING.pdKillScale = 0.6;
    order(b, carrier.id, { kind: 'board', target: target.id });
    const n0 = b.rng.n;
    stepUntil(b, () => !!b.boarding!.pods[0]?.pdDone || events(b, 'breach').length > 0);
    expect(b.rng.n - n0).toBe(6);
  });

  it('crosses an open side, breaches in 2.5 s for a little hull, and starts the fight inside', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    order(b, carrier.id, { kind: 'board', target: target.id });
    let arrivedAt = -1;
    stepUntil(b, () => {
      if (arrivedAt < 0 && b.boarding!.pods[0]?.phase === 'breaching') arrivedAt = b.t;
      return events(b, 'breach').length > 0;
    });
    const br = events(b, 'breach')[0];
    expect(br.side).toBe('port');
    expect(br.t - arrivedAt).toBeCloseTo(2.5, 1);
    expect(br.hullDmg).toBeCloseTo(target.hullMax * BOARDING.breachHullFrac, 5);
    expect(target.hull).toBeCloseTo(target.hullMax - br.hullDmg, 5);
    expect(fightOn(b, target.id, 'player')).toBeTruthy();
  });

  it('pulls crew off guns while boarded: gunnery drops by crewOffGunsMul', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 60;
    BOARDING.fightTimeScale = 0.01;
    order(b, carrier.id, { kind: 'board', target: target.id });
    stepUntil(b, () => events(b, 'breach').length > 0);
    expect(gunneryMul(b, target)).toBe(BOARDING.crewOffGunsMul);
    target.guns = [{ kind: 'laser', cd: 10 }];
    step(b);
    expect(target.guns[0].cd).toBeCloseTo(10 - b.dt * BOARDING.crewOffGunsMul, 9);
    expect(gunneryMul(b, carrier)).toBe(1);
  });

  it('won inside: the ship strikes, flips to the captor, fights on as a prize with a prize crew', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 5;
    target.crew = 20;
    order(b, carrier.id, { kind: 'board', target: target.id });
    expect(stepUntil(b, () => events(b, 'captured').length > 0)).toBe(true);
    const c = events(b, 'captured')[0];
    expect(c).toMatchObject({ ship: target.id, by: 'player', from: 'enemy' });
    expect(events(b, 'boardFight').length).toBeGreaterThan(0);
    expect(target.side).toBe('player');
    expect(target.status).toBe('active');
    expect(target.prize).toBe(true);
    expect(target.capturedFrom).toBe('enemy');
    expect(target.crew).toBeCloseTo(target.crewMax * BOARDING.prizeCrewFrac, 9);
    expect(gunneryMul(b, target)).toBe(BOARDING.prizeGunneryMul);
    const s = summarise(b);
    expect(s.sides.player.captured).toBe(1);
    expect(s.sides.enemy.shipsLost).toBe(1);
    expect(s.sides.player.shipsLost).toBe(0);
  });

  it('repelled: the boarders are lost', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 400;
    order(b, carrier.id, { kind: 'board', target: target.id });
    expect(stepUntil(b, () => events(b, 'repelled').length > 0)).toBe(true);
    expect(events(b, 'repelled')[0].marinesLost).toBe(90);
    expect(target.side).toBe('enemy');
    expect(carrier.marines).toBe(carrier.marinesMax - 90);
    expect(b.boarding!.fights).toHaveLength(0);
  });

  it('reinforced: more pods join the fight in progress; pull-back ends it and brings survivors home', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 60;
    BOARDING.fightTimeScale = 0.01;
    order(b, carrier.id, { kind: 'board', target: target.id });
    stepUntil(b, () => events(b, 'breach').length > 0);
    const f = fightOn(b, target.id, 'player')!;
    expect(f.fight.start.attackers).toBe(90);
    expect(order(b, carrier.id, { kind: 'board', target: target.id })).toBe(true);
    const launch = events(b, 'boardLaunch')[1];
    expect(launch.reinforcing).toBe(true);
    expect(stepUntil(b, () => f.fight.start.attackers > 90)).toBe(true);
    expect(f.fight.start.attackers).toBe(90 + launch.marines);
    expect(events(b, 'breach')).toHaveLength(1); // reinforcements come in through the breach
    const home = carrier.marines;
    expect(order(b, carrier.id, { kind: 'pullBack', target: target.id })).toBe(true);
    expect(fightOn(b, target.id)).toBeUndefined();
    expect(events(b, 'boardPullBack')).toHaveLength(1);
    expect(carrier.marines).toBeGreaterThan(home);
    expect(order(b, carrier.id, { kind: 'pullBack', target: target.id })).toBe(false); // nothing left to pull back
  });

  it('scuttle: a losing Fanatic blows the reactor; a wreck, and the boarders die with it', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.captain.trait = 'Fanatic';
    target.marines = 20;
    BOARDING.scuttleChance = 1;
    order(b, carrier.id, { kind: 'board', target: target.id });
    expect(stepUntil(b, () => events(b, 'scuttled').length > 0)).toBe(true);
    expect(target.status).toBe('wrecked');
    expect(events(b, 'captured')).toHaveLength(0);
    expect(b.boarding!.fights).toHaveLength(0);
    expect(carrier.marines).toBe(carrier.marinesMax - 90);
    // A wreck counts for less than a capture (EXP-05 step 9).
    expect(summarise(b).sides.player.prizeValue).toBeCloseTo(2 * 0.25, 9);
  });

  it('a capture is worth more than a wreck in the summary', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 5;
    target.crew = 20;
    order(b, carrier.id, { kind: 'board', target: target.id });
    stepUntil(b, () => events(b, 'captured').length > 0);
    const captured = summarise(b).sides.player.prizeValue;
    const w = arena('port');
    w.target.hull = 0;
    w.target.status = 'wrecked';
    expect(captured).toBeGreaterThan(summarise(w.b).sides.player.prizeValue);
  });
});

describe('boarding: captains board on their own', () => {
  it('a captain with the Judgement to see an open side launches unordered, and says why', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 5;
    carrier.marines = 300; // PKG-16: enough above the launcher reserve (BOARDING.unorderedKeep) to launch on his own
    carrier.captain.abilities.judgement = 9;
    stepUntil(b, () => events(b, 'boardLaunch').length > 0, 10);
    const l = events(b, 'boardLaunch')[0];
    expect(l).toMatchObject({ ship: carrier.id, target: target.id, ordered: false, side: 'port' });
    expect(b.boarding!.unordered).toBe(1);
    const d = b.stats.decisions.find((x) => x.decision.startsWith('board '))!;
    expect(d.why).toBe('Judgement 9');
    expect(d.trait).toBe('By-the-book');
  });

  it('PKG-16: a launcher keeps a full boarding party for its admiral: no unordered launch from below the reserve, an ordered one still goes', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    target.marines = 5;
    carrier.marines = BOARDING.marineReserve + BOARDING.unorderedKeep + BOARDING.podsPerLaunch * BOARDING.marinesPerPod - 1;
    carrier.captain.abilities.judgement = 10;
    for (let i = 0; i < 300; i++) step(b);
    expect(events(b, 'boardLaunch')).toHaveLength(0);
    expect(order(b, carrier.id, { kind: 'board', target: target.id, side: 'port' } as Order, carrier.side)).toBe(true);
    expect(events(b, 'boardLaunch')[0]).toMatchObject({ ship: carrier.id, ordered: true });
  });

  it('a captain without it does not (Cautious raises the bar)', () => {
    const { b, carrier, target } = arena('port');
    openSide(target, 'port');
    carrier.captain.abilities.judgement = 6;
    carrier.captain.trait = 'Cautious';
    for (let i = 0; i < 300; i++) step(b);
    expect(events(b, 'boardLaunch')).toHaveLength(0);
  });

  it('no open side, no unordered launch', () => {
    const { b, carrier } = arena('port');
    carrier.captain.abilities.judgement = 10;
    for (let i = 0; i < 300; i++) step(b);
    expect(events(b, 'boardLaunch')).toHaveLength(0);
  });
});

describe('mass lock', () => {
  it('an enemy capital or destroyer within range blocks the jump; an escort does not', () => {
    const b = createBattle(SATURN_12V12, 1);
    const me = ship(b, 'p2');
    const destroyer = ship(b, 'e3');
    const escort = ship(b, 'e1');
    for (const s of b.ships) if (s !== me && s !== destroyer && s !== escort) s.status = 'withdrawn';
    me.pos = { x: 0, y: 0, z: 0 };
    destroyer.pos = { x: 2500, y: 0, z: 0 };
    escort.pos = { x: 50000, y: 0, z: 0 };
    expect(massLocked(b, me)).toBe(true);
    expect(canJump(me, b)).toBe(false);
    expect(canJump(me)).toBe(true); // without the battle: the drive alone
    destroyer.pos = { x: 3500, y: 0, z: 0 };
    escort.pos = { x: 500, y: 0, z: 0 };
    expect(massLocked(b, me)).toBe(false);
    expect(canJump(me, b)).toBe(true);
    me.systems.jump = 0;
    expect(canJump(me, b)).toBe(false);
  });

  it('a pinned broken ship does not jump away while locked', () => {
    const b = createBattle(SATURN_12V12, 1);
    const me = ship(b, 'p2');
    const destroyer = ship(b, 'e3');
    for (const s of b.ships) if (s !== me && s !== destroyer) s.status = 'withdrawn';
    b.sides.player.initial = 100; b.sides.enemy.initial = 100;
    b.sides.player.flagshipId = me.id; b.sides.enemy.flagshipId = destroyer.id;
    me.captain.trait = 'Fanatic'; // never strikes, so only the lock keeps it here
    me.status = 'broken';
    me.stance = { mode: 'flee', target: null, side: null, present: null, why: 'test' };
    me.pos = { x: 0, y: 0, z: 0 };
    destroyer.pos = { x: 100, y: 0, z: 0 };
    destroyer.guns = [];
    destroyer.stance = { mode: 'hold', target: null, side: null, present: null, why: 'test' };
    me.systems.engines = 0; // cannot run, so it stays in the lock
    for (let i = 0; i < 30 * 30; i++) step(b);
    expect(me.status).toBe('broken');
    expect(me.spool).toBe(0);
  });
});

describe('boarding: determinism', { timeout: 60_000 }, () => {
  it('a battle with boarding in flight round-trips through JSON and carries on identically', () => {
    const a = createBattle(SATURN_12V12, 1);
    run(a, 60);
    expect((a.boarding?.pods.length ?? 0) + (a.boarding?.fights.length ?? 0)).toBeGreaterThan(0);
    const json = JSON.stringify(a);
    const c = JSON.parse(json) as Battle;
    expect(JSON.stringify(c)).toBe(json);
    run(a, 120);
    run(c, 120);
    expect(hashState(c)).toBe(hashState(a));
  }, 30_000);

  it('same seed twice: identical, boarding included', () => {
    const a = run(createBattle(SATURN_12V12, 3));
    const c = run(createBattle(SATURN_12V12, 3));
    expect(a.stats.boardingAttempts).toBeGreaterThan(0);
    expect(hashState(a)).toBe(hashState(c));
  }, 30_000);
});

describe('boarding: the captain estimate', () => {
  it('wouldCapture agrees with troops.ts resolve() across a grid of fights', () => {
    for (const A of [10, 30, 60, 90, 120, 180]) {
      for (const D of [10, 30, 60, 90, 150, 300]) {
        for (const [qa, qd] of [[1.6, 1.0], [2.0, 1.4], [1.6, 1.6]]) {
          const a = { strength: A, quality: qa };
          const d = { strength: D, quality: qd };
          if (Math.abs(qa * A * A - qd * D * D) < 1e-6 * qa * A * A) continue; // a dead heat: either answer
          expect(wouldCapture(a, d), `${A}@${qa} v ${D}@${qd}`).toBe(resolve(a, d).outcome === 'captured');
        }
      }
    }
  });
});

describe('boarding: headless', () => {
  it('never reads wall time or Math.random', () => {
    const mods = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(mods).length).toBeGreaterThan(3);
    for (const [path, src] of Object.entries(mods)) {
      if (path.endsWith('.test.ts')) continue;
      expect(src, path).not.toMatch(/Date\.now|new Date|performance\.now|Math\.random/);
    }
  });
});
