/**
 * PKG-14 (bridge fixes): a standing shield order holds; the marine commander's reinforce / pull-back decision; the
 * boarded ship's fire slackening, said out loud; pods at their flagship and true refusal reasons; a capture's morale
 * shock; the marine lines read the right way round; the flag lieutenant's fold; surnames; house names.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BOARDING, SATURN_12V12, answerTop, answerable, command, comms, createBattle, fightOn, order, setShieldPower, step,
} from '../index';
import { SHIELD, sideOffset } from '../numbers';
import { forward, pushLog } from '../ships';
import type { Battle, LogEvent, ShieldSide, Ship } from '../types';
import { MARINE, OFFICER, STATUS } from './lines';
import { COMMS, MARINES, STANDING } from './numbers';
import { countWord, fold } from './tick';

const SAVED = { ...BOARDING };
beforeEach(() => { BOARDING.pdKillScale = 0; });
afterEach(() => { Object.assign(BOARDING, SAVED); });

const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
const flagship = (b: Battle) => ship(b, b.sides.player.flagshipId);
const ticks = (b: Battle, n: number) => { for (let i = 0; i < n; i++) step(b); };
const seconds = (b: Battle, s: number) => ticks(b, Math.round(s / b.dt));
const events = <K extends LogEvent['kind']>(b: Battle, kind: K) => b.log.filter((e) => e.kind === kind) as Extract<LogEvent, { kind: K }>[];
const said = (b: Battle) => [...comms(b).open, ...comms(b).history].map((r) => r.text);
const fromTable = (table: string[], text: string) => table.some((l) => new RegExp(`^${l.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}/g, '.+')}`).test(text));

function stepUntil(b: Battle, done: () => boolean, maxS = 120): boolean {
  const stop = b.t + maxS;
  while (b.t < stop) { step(b); if (done()) return true; }
  return false;
}

// ── EXP-02 step 8: the order holds ────────────────────────────────────────────────────────────────────────────────
/** The flagship alone with one enemy cruiser 3 km off its bow; the flag captain sharp enough to trim. */
function bowThreat(): { b: Battle; f: Ship; e: Ship } {
  const b = createBattle(SATURN_12V12, 2);
  const f = flagship(b);
  const e = ship(b, 'e2');
  for (const s of b.ships) if (s !== f && s !== e) s.status = 'withdrawn';
  b.sides.player.initial = b.sides.enemy.initial = 100;
  b.sides.enemy.flagshipId = e.id;
  f.pos = { x: 0, y: 0, z: 0 };
  f.heading = 0;
  f.captain.abilities.judgement = 10;
  f.captain.abilities.helm = 1;
  e.pos = { x: 3000, y: 0, z: 0 };
  for (const s of [f, e]) { s.stance = { mode: 'hold', target: null, side: null, present: null, why: 'test' }; s.speed = 0; }
  f.guns = [];
  step(b);
  comms(b).points.player = 100;
  return { b, f, e };
}

describe('PKG-14: a standing shield order holds (EXP-02 s8)', () => {
  it('without an order the flag captain trims to the threatened side', () => {
    const { b, f } = bowThreat();
    seconds(b, 15);
    expect(f.split.fore).toBeCloseTo(SHIELD.focus, 6);
  });

  it('with one, the split he ordered stands, and no captain decision touches it', () => {
    const { b, f } = bowThreat();
    const split = { fore: 0.05, aft: 0.05, port: 0.85, starboard: 0.05 };
    expect(command(b, f.id, { kind: 'shieldPower', split }).ok).toBe(true);
    const before = events(b, 'decision').filter((e) => e.ship === f.id && /shield/.test(e.decision)).length;
    seconds(b, 30);
    if (!comms(b).shieldOrders?.[f.id]) {
      // Released: only ever out loud, by engineering, with the reason.
      expect(comms(b).history.concat(comms(b).open).some((r) => r.type === 'shieldHold' && r.from.officer === 'engineering')).toBe(true);
    } else {
      expect(f.split.port).toBeCloseTo(0.85, 6);
      expect(events(b, 'decision').filter((e) => e.ship === f.id && /shield/.test(e.decision)).length).toBe(before);
    }
  });

  it('it holds through the grace; when a starved side is open under their fire, engineering says it cannot hold and the captain trims', () => {
    const { b, f } = bowThreat();
    command(b, f.id, { kind: 'shieldPower', split: { fore: 0.05, aft: 0.05, port: 0.85, starboard: 0.05 } });
    const keepForeOpen = () => { f.shields.fore = 0; f.open.fore = true; f.lastHit.fore = b.t; };
    for (let i = 0; i < Math.round((STANDING.graceS - 1) / b.dt); i++) { keepForeOpen(); step(b); }
    expect(comms(b).shieldOrders?.[f.id]).toBeTruthy();
    expect(f.split.port).toBeCloseTo(0.85, 6);
    for (let i = 0; i < Math.round(15 / b.dt) && comms(b).shieldOrders?.[f.id]; i++) { keepForeOpen(); step(b); }
    expect(comms(b).shieldOrders?.[f.id]).toBeUndefined();
    const r = [...comms(b).open, ...comms(b).history].find((x) => x.type === 'shieldHold')!;
    expect(r.from.officer).toBe('engineering');
    expect(r.text).toMatch(/fore/);
    expect(fromTable(OFFICER.shieldCantHold, r.text)).toBe(true);
    expect(f.split.fore).toBeCloseTo(SHIELD.focus, 6);
  });

  it('a new shield order replaces the old one; an answer that sets a split stands too', () => {
    const { b, f } = bowThreat();
    command(b, f.id, { kind: 'shieldPower', split: { fore: 0.05, aft: 0.05, port: 0.85, starboard: 0.05 } });
    command(b, f.id, { kind: 'shieldPower', split: { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 } });
    expect(comms(b).shieldOrders![f.id].split.port).toBeCloseTo(0.25, 6);
    seconds(b, 5);
    expect(f.split.fore).toBeCloseTo(0.25, 6);
  });
});

// ── EXP-05 steps 5–6: the fight inside ──────────────────────────────────────────────────────────────────────────────
/** The boarding arena: the player's carrier (made the flagship) 3 km off an enemy cruiser's open port side. */
function arena(range = 3000): { b: Battle; carrier: Ship; target: Ship } {
  const b = createBattle(SATURN_12V12, 1);
  const carrier = ship(b, 'p7');
  const target = ship(b, 'e2');
  for (const s of b.ships) if (s !== carrier && s !== target) s.status = 'withdrawn';
  b.sides.player.initial = b.sides.enemy.initial = 100;
  b.sides.player.flagshipId = carrier.id;
  b.sides.enemy.flagshipId = target.id;
  carrier.flagship = true;
  target.pos = { x: 0, y: 0, z: 0 };
  target.heading = 0;
  const fw = forward(sideOffset.port);
  carrier.pos = { x: fw.x * range, y: 0, z: fw.z * range };
  for (const s of [carrier, target]) {
    s.guns = [];
    s.captain.trait = 'By-the-book';
    s.stance = { mode: 'hold', target: null, side: null, present: null, why: 'test' };
  }
  carrier.captain.abilities.judgement = 1;
  const split: Record<ShieldSide, number> = { fore: 1 / 3, aft: 1 / 3, port: 0, starboard: 1 / 3 };
  setShieldPower(target, split);
  step(b);
  comms(b).points.player = 100;
  return { b, carrier, target };
}

function boarded(): { b: Battle; carrier: Ship; target: Ship } {
  const a = arena();
  a.target.marines = 200;
  BOARDING.fightTimeScale = 0.02;
  order(a.b, a.carrier.id, { kind: 'board', target: a.target.id });
  stepUntil(a.b, () => events(a.b, 'breach').length > 0);
  stepUntil(a.b, () => comms(a.b).open.some((r) => r.type === 'boardDecision'), 10);
  return a;
}

function select(b: Battle, type: string): void {
  comms(b).cursor = answerable(b).findIndex((r) => r.type === type);
}

describe('PKG-14: the marine commander asks (EXP-05 s6)', () => {
  it('raises a decision while our marines fight inside: Reinforce / Pull back / Carry on, from the marine commander', () => {
    const { b, target } = boarded();
    const r = comms(b).open.find((x) => x.type === 'boardDecision')!;
    expect(r).toBeTruthy();
    expect(r.level).toBe('decision');
    expect(r.from.officer).toBe('marines');
    expect(r.about).toBe(target.id);
    expect(r.answers.map((a) => a.label)).toEqual(['Reinforce', 'Pull back', 'Carry on']);
    expect(r.text).toMatch(new RegExp(target.name));
    expect(answerable(b)).toContain(r);
  });

  it('Reinforce (Q) sends more pods at that ship', () => {
    const { b, target } = boarded();
    select(b, 'boardDecision');
    const launches = events(b, 'boardLaunch').length;
    expect(answerTop(b, 0).ok).toBe(true);
    const l = events(b, 'boardLaunch');
    expect(l.length).toBe(launches + 1);
    expect(l[l.length - 1]).toMatchObject({ target: target.id, reinforcing: true });
  });

  it('Pull back (E) ends the fight and brings survivors home', () => {
    const { b, target } = boarded();
    select(b, 'boardDecision');
    expect(answerTop(b, 1).ok).toBe(true);
    expect(fightOn(b, target.id, 'player')).toBeUndefined();
    expect(events(b, 'boardPullBack').length).toBe(1);
  });

  it('unanswered, the marine commander decides by his Judgement, and the decision says so', () => {
    for (const [J, want] of [[9, 'reinforceBoard'], [2, 'carryOn']] as const) {
      const { b } = boarded();
      comms(b).officerJudgement = { marines: J };
      const r = comms(b).open.find((x) => x.type === 'boardDecision')!;
      seconds(b, MARINES.decisionS + 1);
      const d = b.stats.timeoutDecisions.find((x) => x.report === r.id)!;
      expect(d.choice).toBe(want);
      expect(d.why).toBe(`marine commander, Judgement ${J}`);
      expect(J >= COMMS.careJudgement).toBe(want !== 'carryOn');
    }
  });

  it('a fight that ends closes the decision', () => {
    const { b, target } = boarded();
    order(b, b.sides.player.flagshipId, { kind: 'pullBack', target: target.id });
    seconds(b, 1.1);
    expect(comms(b).open.some((x) => x.type === 'boardDecision')).toBe(false);
  });
});

describe('PKG-14: their fire slackens, and a captain says so (EXP-05 s5)', () => {
  it('the drag is real and the line comes once the boarders have been aboard a few seconds', () => {
    const { b, target } = boarded();
    target.guns = [{ kind: 'laser', cd: 10 }];
    step(b);
    expect(target.guns[0].cd).toBeCloseTo(10 - b.dt * BOARDING.crewOffGunsMul, 9);
    stepUntil(b, () => comms(b).open.concat(comms(b).history).some((r) => r.type === 'fireSlack'), MARINES.slackAfterS + 2);
    const r = comms(b).open.concat(comms(b).history).find((x) => x.type === 'fireSlack')!;
    expect(r).toBeTruthy();
    expect(r.level).toBe('status');
    expect(r.fold).toBe(false);
    expect(fromTable(STATUS.fireSlack!, r.text)).toBe(true);
  });
});

// ── EXP-02 step 10: pods at their flagship; true reasons ────────────────────────────────────────────────────────────
describe('PKG-14: pods at their flagship (VISION §7a ruling) and true refusals', () => {
  it("the flagship's marine commander launches at the enemy flagship", () => {
    const { b, carrier, target } = arena();
    target.flagship = true;
    const r = command(b, carrier.id, { kind: 'launchPods', target: target.id });
    expect(r.ok).toBe(true);
    expect(events(b, 'boardLaunch').pop()).toMatchObject({ ship: carrier.id, target: target.id, ordered: true });
    expect(fromTable(OFFICER.launchPodsFlagship, said(b).pop()!)).toBe(true);
  });

  it('another ship may not, and says why; unordered captains may not', () => {
    const { b, carrier, target } = arena();
    target.flagship = true;
    carrier.flagship = false;
    expect(order(b, carrier.id, { kind: 'board', target: target.id })).toBe(false);
    expect(events(b, 'commsRefused').pop()!.reason).toMatch(/flagship/);
  });

  it('each refusal gives its true reason, never "not ready"', () => {
    const cases: [string, (a: ReturnType<typeof arena>) => void, string[]][] = [
      ['out of range', ({ carrier }) => { carrier.pos = { x: 30000, y: 0, z: 0 }; }, OFFICER.podsOutOfRange],
      ['hangar out', ({ carrier }) => { carrier.systems.hangar = 0; }, OFFICER.podsHangarOut],
      ['no marines', ({ carrier }) => { carrier.marines = 10; }, OFFICER.podsNoMarines],
    ];
    for (const [, set, table] of cases) {
      const a = arena();
      set(a);
      const r = command(a.b, a.carrier.id, { kind: 'launchPods', target: a.target.id });
      expect(r.ok).toBe(false);
      expect(fromTable(table, r.reason!)).toBe(true);
      expect(r.reason).not.toMatch(/not ready/);
    }
    for (const l of Object.values(OFFICER).flat()) expect(l).not.toMatch(/not ready/);
  });

  it('out of range says how far, and the reach', () => {
    const a = arena();
    a.carrier.pos = { x: 20000, y: 0, z: 0 };
    const r = command(a.b, a.carrier.id, { kind: 'launchPods', target: a.target.id });
    expect(r.reason).toMatch(/20\.0 km/);
    expect(r.reason).toMatch(new RegExp(`${BOARDING.launchRange / 1000} km`));
  });
});

// ── Item 7 (TRC-03): a side down at launch stays down for the crossing ──────────────────────────────────────────────
describe('PKG-14 item 7: pods launched at a fallen side get through it', () => {
  /** The arena at 6 km, port knocked to zero but still powered (so it regenerates during the crossing). */
  function fallen() {
    const a = arena(6000);
    const t = a.target;
    setShieldPower(t, { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 });
    for (const k of ['fore', 'aft', 'starboard'] as const) t.shields[k] = t.shieldTotal * 0.25;
    t.shields.port = 0;
    t.open.port = true;
    t.lastHit.port = a.b.t;
    a.target.marines = 5;
    a.target.crew = 20;
    return a;
  }

  it('the side regenerates and closes during the crossing, yet the pods breach through it', () => {
    const { b, carrier, target } = fallen();
    expect(order(b, carrier.id, { kind: 'board', target: target.id, side: 'port' })).toBe(true);
    let closedBeforeArrival = false;
    stepUntil(b, () => {
      if (!target.open.port && b.boarding!.pods.some((g) => g.phase === 'flying')) closedBeforeArrival = true;
      return events(b, 'breach').length + events(b, 'boardDeflected').length > 0;
    }, 60);
    expect(closedBeforeArrival).toBe(true);
    expect(events(b, 'boardDeflected')).toHaveLength(0);
    expect(events(b, 'breach')[0]).toMatchObject({ ship: target.id, side: 'port' });
  });

  it('unless the defender put power back on that side: deflected, and the marine commander says why', () => {
    const { b, carrier, target } = fallen();
    order(b, carrier.id, { kind: 'board', target: target.id, side: 'port' });
    seconds(b, 2);
    setShieldPower(target, { fore: 0.15, aft: 0.15, port: 0.55, starboard: 0.15 });
    stepUntil(b, () => events(b, 'breach').length + events(b, 'boardDeflected').length > 0, 60);
    const d = events(b, 'boardDeflected');
    expect(d).toHaveLength(1);
    if (d.length) {
      expect(d[0]).toMatchObject({ side: 'port', repowered: true });
      step(b);
      const line = [...comms(b).open, ...comms(b).history].find((r) => r.type === 'boardDeflected')!;
      expect(fromTable(MARINE.boardDeflectedRepowered, line.text)).toBe(true);
    } else {
      // Re-powered but still open on arrival (it had not regained its reopen share): open is open.
      expect(target.open.port).toBe(true);
    }
  });

  it('a side that was up at launch still deflects (EXP-05 s3)', () => {
    const a = arena(6000);
    setShieldPower(a.target, { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 });
    a.target.shields.port = a.target.shieldTotal * 0.25;
    a.target.open.port = false;
    order(a.b, a.carrier.id, { kind: 'board', target: a.target.id, side: 'port' });
    stepUntil(a.b, () => events(a.b, 'breach').length + events(a.b, 'boardDeflected').length > 0, 60);
    expect(events(a.b, 'boardDeflected')).toHaveLength(1);
    expect(events(a.b, 'breach')).toHaveLength(0);
  });
});

// ── Boarding cleanup (PKG-08 request 1) ─────────────────────────────────────────────────────────────────────────────
describe('PKG-14: one break rule (captureSideCheck removed)', { timeout: 60_000 }, () => {
  it('a side broken with ships captured breaks through sideCheck, on strength, never by the old count', () => {
    let broke = 0;
    for (const seed of [1, 2, 3]) {
      const b = createBattle(SATURN_12V12, seed);
      while (!b.outcome && b.t < 900) step(b);
      for (const e of events(b, 'sideBroken')) {
        broke++;
        expect(e.reason).not.toMatch(/ships lost \(\d+ captured\)$/);
      }
    }
    expect(broke).toBeGreaterThan(0);
  }, 60000);
});

// ── Lines (Kalliope) ────────────────────────────────────────────────────────────────────────────────────────────────
describe('PKG-14: the marine lines read the right way round', () => {
  const quiet = () => {
    const b = createBattle(SATURN_12V12, 1);
    for (const s of b.ships) if (s.side === 'enemy') s.pos = { x: s.pos.x + 200000, y: 0, z: s.pos.z };
    step(b);
    return b;
  };
  it('a capture by us is a win; a capture of ours is a loss', () => {
    const b = quiet();
    const theirs = ship(b, 'e2');
    const ours = ship(b, 'p2');
    theirs.side = 'player';
    pushLog(b, { t: b.t, kind: 'captured', ship: theirs.id, by: 'player', from: 'enemy', marines: 40 } as LogEvent);
    ours.side = 'enemy';
    pushLog(b, { t: b.t, kind: 'captured', ship: ours.id, by: 'enemy', from: 'player', marines: 40 } as LogEvent);
    step(b);
    const lines = [...comms(b).open, ...comms(b).history].filter((r) => r.type === 'captured');
    const win = lines.find((r) => r.about === theirs.id)!;
    const loss = lines.find((r) => r.about === ours.id)!;
    expect(fromTable(MARINE.captured, win.text)).toBe(true);
    expect(fromTable(MARINE.capturedUs, loss.text)).toBe(true);
    expect(win.text).not.toMatch(/lost|taken by/i);
    // PKG-22 (F-07): both captures are capture cards that stay up, the loss marked on screen as a ship taken.
    expect(loss.level).toBe('status');
    expect(loss.text).toMatch(/ is taken/);
    expect(win.text).toMatch(/[0-9]+ [+] [0-9]+ taken/);
    expect(win.deadline! - b.t).toBeGreaterThan(10);
  });

  it('every win line and loss line pair exists for the events that can go either way', () => {
    for (const k of ['boardDeflected', 'boardBreach', 'boardFight', 'captured', 'repelled', 'scuttled']) {
      expect(MARINE[k].length).toBeGreaterThanOrEqual(3);
      expect(MARINE[`${k}Us`].length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("PKG-14: the flag lieutenant's fold reads like a person", () => {
  it('counts in words, never repeats a sentence, never opens the same way twice running', () => {
    const b = createBattle(SATURN_12V12, 1);
    for (const s of b.ships) if (s.side === 'enemy') s.pos = { x: s.pos.x + 200000, y: 0, z: s.pos.z };
    step(b);
    const c = comms(b);
    const heads: string[] = [];
    for (let round = 0; round < 6; round++) {
      c.pendingStatus = [
        ...['p1', 'p2', 'p3'].map((ship) => ({ t: b.t, type: 'selfDecision' as const, ship, text: 'shift shield power to fore' })),
        ...['p4', 'p5', 'p8', 'p9', 'p10', 'p11'].map((ship) => ({ t: b.t, type: 'selfDecision' as const, ship, text: 'engage Europa' })),
        { t: b.t, type: 'boardFight' as const, ship: 'p6', text: 'Deck fight on Sceptre. We are holding.' },
        { t: b.t, type: 'boardFight' as const, ship: 'p6', text: 'Deck fight on Sceptre. We are holding.' },
      ];
      fold(b, c);
      const r = c.open.find((x) => x.type === 'summary')!;
      expect(r.text).toMatch(/^(Eleven reports|Admiral, eleven reports|From the line, eleven reports)/);
      expect(r.text).toMatch(/Three ships trimming shields, six retargeting\./);
      expect(r.text.match(/Deck fight on Sceptre/g)!.length).toBe(1);
      expect(r.text).not.toMatch(/Status|lines\b|\d/);
      heads.push(r.text.slice(0, 18));
    }
    for (let i = 1; i < heads.length; i++) expect(heads[i]).not.toBe(heads[i - 1]);
  });

  it('countWord', () => {
    expect([0, 1, 11, 20, 34, 99, 120].map(countWord)).toEqual(['zero', 'one', 'eleven', 'twenty', 'thirty-four', 'ninety-nine', '120']);
  });
});

describe('PKG-14: names', () => {
  it("the flagship's officers never push a surname past twice in the player's fleet", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const b = createBattle(SATURN_12V12, seed);
      const c = comms(b);
      const sur = (n: string) => n.slice(n.lastIndexOf(' ') + 1);
      const captains: Record<string, number> = {};
      for (const s of b.ships) if (s.side === 'player') captains[sur(s.captain.name)] = (captains[sur(s.captain.name)] ?? 0) + 1;
      const all = { ...captains };
      for (const n of Object.values(c.officers)) all[sur(n)] = (all[sur(n)] ?? 0) + 1;
      for (const [k, v] of Object.entries(all)) expect(v).toBeLessThanOrEqual(Math.max(COMMS.maxSurname, captains[k] ?? 0));
    }
  });

  it('house names read as names, not placeholders', () => {
    for (const side of [SATURN_12V12.player, SATURN_12V12.enemy]) {
      expect(side.house).toMatch(/^House of [A-Z][a-z]+$/);
      expect(side.house).not.toMatch(/\(|^A /);
    }
  });
});
