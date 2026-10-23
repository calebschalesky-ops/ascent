import { describe, expect, it } from 'vitest';
import {
  ORDER_KINDS, SATURN_12V12, TRAITS, answerTop, answerable, broadcast, command, comms, createBattle, hashState, ping, queue, run, step, summarise,
  tabNext, timeoutFor,
} from '../index';
import { pushLog } from '../ships';
import type { Battle, Mood } from '../types';
import { BODY, FAMILY, TAIL } from './lines';
import { COMMS, POINTS } from './numbers';

const MOODS: Mood[] = ['confident', 'steady', 'strained', 'panicked', 'defiant'];
const fresh = (seed = 1, player = 'idle') => createBattle(SATURN_12V12, seed, { controllers: { player } });
const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
const flagship = (b: Battle) => ship(b, b.sides.player.flagshipId);
const ticks = (b: Battle, n: number) => { for (let i = 0; i < n; i++) step(b); };
/** Raise reports by putting engine events on the log, as the engine would. */
const shieldDown = (b: Battle, id: string, side: 'port' | 'fore' = 'port') => pushLog(b, { t: b.t, kind: 'shieldDown', ship: id, side });
const systemOut = (b: Battle, id: string) => pushLog(b, { t: b.t, kind: 'systemOut', ship: id, system: 'hangar' });
const reportFor = (b: Battle, id: string, type: string) => comms(b).open.find((r) => r.ship === id && r.type === type);
/** A quiet battle: the fleets far apart, so nothing but the test raises reports. */
function quiet(seed = 1): Battle {
  const b = fresh(seed);
  for (const s of b.ships) if (s.side === 'enemy') s.pos = { x: s.pos.x + 200000, y: 0, z: s.pos.z };
  step(b);
  return b;
}

describe('comms: the queue', () => {
  it('urgent jumps above decisions; status folds into the flag lieutenant summary', () => {
    const b = quiet();
    shieldDown(b, 'p2');
    step(b);
    systemOut(b, 'p3');
    step(b);
    const q = queue(b);
    const levels = q.map((r) => r.level);
    expect(levels[0]).toBe('urgent');
    expect(q[0].type).toBe('breach');
    expect(levels.indexOf('decision')).toBeGreaterThan(levels.indexOf('urgent'));
    expect(q[0].selected).toBe(true);
    expect(q[0].answers.length).toBeGreaterThanOrEqual(2);
    expect(q[0].from.name).toBe(ship(b, 'p3').captain.name);
    expect(q[0].from.ship).toBe(ship(b, 'p3').name);
    expect(MOODS).toContain(q[0].from.mood);

    // Status: self-decisions go to pending, then fold into one summary row.
    const c = comms(b);
    for (let i = 0; i < 7; i++) pushLog(b, { t: b.t, kind: 'decision', ship: 'p4', decision: 'shift shield power to port', why: 'Judgement 6', timeout: false });
    step(b);
    expect(c.pendingStatus.length).toBeGreaterThanOrEqual(7);
    ticks(b, Math.round(COMMS.foldEveryS / b.dt) + 1);
    const summary = queue(b).find((r) => r.type === 'summary')!;
    expect(summary.level).toBe('status');
    expect(summary.folded).toBeGreaterThanOrEqual(7);
    expect(queue(b).filter((r) => r.type === 'summary')).toHaveLength(1);
    expect(queue(b)[queue(b).length - 1].type).toBe('summary');
  });

  it('answerTop (Q) applies the chosen order, logs it, and the captain acknowledges', () => {
    const b = quiet();
    systemOut(b, 'p3');
    step(b);
    const r = answerable(b)[0];
    expect(r.type).toBe('breach');
    const i = r.answers.findIndex((a) => a.key === 'withdraw');
    const res = answerTop(b, i);
    expect(res.ok).toBe(true);
    expect(ship(b, 'p3').stance.mode).toBe('withdraw');
    expect(b.log.some((e) => e.kind === 'order' && e.ship === 'p3' && e.order.kind === 'withdraw' && e.ok)).toBe(true);
    expect(b.log.some((e) => e.kind === 'commsAnswer' && e.report === r.id && e.by === 'admiral')).toBe(true);
    expect(comms(b).open.includes(r)).toBe(false);
    const ack = comms(b).open.find((x) => x.type === 'ack' && x.ship === 'p3')!;
    expect(ack.text).toMatch(/Pulling out/);
  });

  it('a PKG-02 request is a decision; answering it sets the stance through battle.answer()', () => {
    const b = quiet();
    const s = ship(b, 'p2');
    s.hull = s.hullMax * 0.3;
    s.nextThink = 0;
    step(b);
    const r = answerable(b).find((x) => x.type === 'withdraw')!;
    expect(r.requestId).not.toBeNull();
    expect(r.text).toMatch(/\d+%/);
    answerTop(b, 0);
    expect(s.stance.mode).toBe('withdraw');
    expect(b.requests.some((q) => q.id === r.requestId)).toBe(false);
    expect(b.log.some((e) => e.kind === 'answer' && e.id === r.requestId && e.choice === 'withdraw')).toBe(true);
  });

  it('Tab then E answers the second report with its second option', () => {
    const b = quiet();
    shieldDown(b, 'p2');
    shieldDown(b, 'p4');
    step(b);
    const [first, second] = answerable(b);
    expect(tabNext(b)).toBe(1);
    expect(queue(b).find((x) => x.selected)!.id).toBe(second.id);
    answerTop(b, 1);
    expect(comms(b).open.includes(second)).toBe(false);
    expect(comms(b).open.includes(first)).toBe(true);
    expect(b.log.some((e) => e.kind === 'commsAnswer' && e.report === second.id && e.answer === 1)).toBe(true);
  });
});

describe('comms: timeouts', () => {
  it('waits 4–12 s: shorter if urgent, longer for a patient captain', () => {
    const b = fresh();
    const c = ship(b, 'p2').captain;
    for (const t of TRAITS) {
      c.trait = t;
      for (const u of [true, false]) expect(timeoutFor(c, u)).toBeGreaterThanOrEqual(4);
      expect(timeoutFor(c, false)).toBeLessThanOrEqual(12);
      expect(timeoutFor(c, true)).toBeLessThan(timeoutFor(c, false));
    }
    c.trait = 'Veteran';
    const patient = timeoutFor(c, false);
    c.trait = 'Glory-hound';
    expect(timeoutFor(c, false)).toBeLessThan(patient);
  });

  it('unanswered, the captain decides by trait, and the decision records the trait, report and choice', () => {
    for (const [trait, want] of [['Glory-hound', 'carryOn'], ['Cautious', 'reinforce'], ['Protector', 'fallBack']] as const) {
      const b = quiet();
      ship(b, 'p2').captain.trait = trait;
      shieldDown(b, 'p2');
      step(b);
      const r = reportFor(b, 'p2', 'shieldDown')!;
      ticks(b, Math.ceil((r.deadline! - b.t) / b.dt) + 1);
      const d = b.stats.timeoutDecisions.find((x) => x.report === r.id)!;
      expect(d, trait).toBeTruthy();
      expect(d.trait).toBe(trait);
      expect(d.why).toBe(trait);
      expect(d.choice).toBe(want);
      expect(d.timeout).toBe(true);
      expect(comms(b).open.find((x) => x.type === 'timeoutChoice' && x.ship === 'p2')).toBeTruthy();
      if (want === 'reinforce') expect(ship(b, 'p2').split.port).toBeGreaterThan(0.25);
    }
  });

  it('without a deciding trait, Judgement decides, and the ability is recorded', () => {
    const b = quiet();
    const s = ship(b, 'p2');
    s.captain.trait = 'Optimist';
    s.captain.abilities.judgement = 8;
    shieldDown(b, 'p2');
    step(b);
    const r = reportFor(b, 'p2', 'shieldDown')!;
    ticks(b, Math.ceil((r.deadline! - b.t) / b.dt) + 1);
    const d = b.stats.timeoutDecisions.find((x) => x.report === r.id)!;
    expect(d.why).toBe('Judgement 8');
    expect(d.choice).toBe('reinforce');
  });

  it('ignoring a Grudge-holder costs loyalty', () => {
    const b = quiet();
    const s = ship(b, 'p2');
    s.captain.trait = 'Grudge-holder';
    s.captain.loyalty = 50;
    shieldDown(b, 'p2');
    step(b);
    const r = reportFor(b, 'p2', 'shieldDown')!;
    ticks(b, Math.ceil((r.deadline! - b.t) / b.dt) + 1);
    expect(s.captain.loyalty).toBe(50 - COMMS.grudgeLoyalty);
    // Answering costs nothing.
    s.captain.loyalty = 50;
    b.comms!.cooldown = {};
    shieldDown(b, 'p2', 'fore');
    step(b);
    answerTop(b, 0);
    expect(s.captain.loyalty).toBe(50);
  });

  it('PKG-02 request timeouts close their report and say what the captain chose', () => {
    const b = quiet();
    const s = ship(b, 'p2');
    s.captain.trait = 'Cautious';
    s.hull = s.hullMax * 0.3;
    s.nextThink = 0;
    step(b);
    const r = answerable(b).find((x) => x.type === 'withdraw')!;
    expect(b.requests.find((q) => q.id === r.requestId)!.deadline).toBeCloseTo(r.t + timeoutFor(s.captain, false), 5);
    ticks(b, Math.ceil((r.deadline! - b.t) / b.dt) + 2);
    expect(comms(b).open.includes(r)).toBe(false);
    const d = b.stats.timeoutDecisions.find((x) => x.report === r.id)!;
    expect(d.why).toBe('Cautious');
    expect(d.choice).toBe('withdraw');
    expect(comms(b).open.find((x) => x.type === 'timeoutChoice' && x.ship === 'p2')!.text).toMatch(/Pulling out/);
  });
});

describe('comms: command points and pushback', () => {
  it('an order without points is refused with a reason, out loud and in the log', () => {
    const b = quiet();
    comms(b).points.player = 0.4;
    const res = command(b, 'p3', { kind: 'holdPosition' });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/1 needed, 0\.4 ready|Need 1, have 0\.4/);
    expect(ship(b, 'p3').stance.mode).not.toBe('hold');
    expect(b.log.some((e) => e.kind === 'commsRefused' && e.ship === 'p3')).toBe(true);
    expect(comms(b).open.some((r) => r.type === 'noPoints')).toBe(true);
    // The meter refills over time.
    ticks(b, Math.round((1 / POINTS.refillPerS) / b.dt) + 1);
    expect(command(b, 'p3', { kind: 'holdPosition' }).ok).toBe(true);
  });

  it('costs: an answer is free, a direct order costs, a broadcast costs most', () => {
    expect(POINTS.answer).toBeLessThan(POINTS.direct);
    expect(POINTS.broadcast).toBeGreaterThan(POINTS.direct);
    const b = quiet();
    const c = comms(b);
    c.points.player = POINTS.max;
    command(b, 'p3', { kind: 'holdPosition' });
    expect(c.points.player).toBeCloseTo(POINTS.max - POINTS.direct, 5);
    c.points.player = POINTS.max;
    for (const s of b.ships) s.captain.loyalty = 100;
    const r = broadcast(b, { kind: 'followFlagship' });
    expect(r.took.length + r.refused.length + r.protested.length).toBe(11);
    expect(c.points.player).toBeCloseTo(POINTS.max - POINTS.broadcast, 5);
  });

  it('a captain refuses out loud, or protests and goes on a confirm', () => {
    const b = quiet();
    const fan = ship(b, 'p2');
    fan.captain.trait = 'Fanatic';
    comms(b).points.player = 50;
    const no = command(b, 'p2', { kind: 'withdraw' });
    expect(no.ok).toBe(false);
    expect(no.reason).toBeTruthy();
    expect(fan.stance.mode).not.toBe('withdraw');
    expect(comms(b).open.some((r) => r.type === 'refuse' && r.ship === 'p2')).toBe(true);

    const s = ship(b, 'p4');
    s.captain.trait = 'Pessimist';
    s.captain.loyalty = 80;
    s.captain.abilities.nerve = 1;
    s.captain.abilities.judgement = 1;
    s.hull = s.hullMax * 0.2;
    let res = command(b, 'p4', { kind: 'attack', target: 'e5' });
    for (let i = 0; i < 10 && res.protest === null; i++) res = command(b, 'p4', { kind: 'attack', target: 'e5' });
    expect(res.protest).not.toBeNull();
    const r = comms(b).open.find((x) => x.id === res.protest)!;
    expect(r.type).toBe('protest');
    while (answerable(b)[comms(b).cursor].id !== r.id) tabNext(b);
    answerTop(b, 0);
    expect(s.order).toEqual({ kind: 'attack', target: 'e5' });
  });

  it('nothing is refused silently: every refusal leaves a report and a log line', () => {
    const b = quiet();
    comms(b).points.player = 50;
    for (const s of b.ships) if (s.side === 'player') s.captain.loyalty = 0;
    const refused = b.ships.filter((s) => s.side === 'player' && !s.flagship).filter((s) => !command(b, s.id, { kind: 'holdPosition' }).ok);
    expect(refused.length).toBeGreaterThan(0);
    for (const s of refused) {
      expect(b.log.some((e) => e.kind === 'commsRefused' && e.ship === s.id)).toBe(true);
      expect(comms(b).open.some((r) => (r.type === 'refuse' || r.type === 'protest') && r.ship === s.id)).toBe(true);
    }
  });
});

describe("comms: the flagship's own crew", () => {
  const setup = () => {
    const b = fresh(2);
    step(b);
    comms(b).points.player = 100;
    return { b, f: flagship(b), crew: comms(b).crew.player };
  };
  const officerSaid = (b: Battle, officer: string) => comms(b).open.filter((r) => r.from.officer === officer).pop()?.text ?? '';

  it('master of guns: guns on a target moves the flagship fire; hold fire stops it', () => {
    const { b, f, crew } = setup();
    expect(command(b, f.id, { kind: 'gunsOn', target: 'e3' }).ok).toBe(true);
    expect(f.stance.target).toBe('e3');
    expect(crew.guns).toEqual({ mode: 'on', target: 'e3' });
    expect(officerSaid(b, 'guns')).toMatch(new RegExp(ship(b, 'e3').name));
    ticks(b, 60);
    expect(f.stance.target).toBe('e3');
    expect(command(b, f.id, { kind: 'holdFire' }).ok).toBe(true);
    expect(crew.guns.mode).toBe('hold');
    const shots = () => b.log.filter((e) => e.kind === 'shot' && e.ship === f.id).length;
    const before = shots();
    ticks(b, 300);
    expect(shots()).toBe(before);
  });

  it('shields and engineering: power to a side, overload the guns, feed the engines', () => {
    const { b, f, crew } = setup();
    expect(command(b, f.id, { kind: 'shieldPower', split: { fore: 0, aft: 0, port: 1, starboard: 0 } }).ok).toBe(true);
    expect(f.split.port).toBe(1);
    expect(officerSaid(b, 'engineering')).toMatch(/port/);
    command(b, f.id, { kind: 'overloadGuns' });
    expect(crew.power).toBe('overload');
    f.systems.engines = 50;
    command(b, f.id, { kind: 'feedEngines' });
    expect(crew.power).toBe('engines');
    ticks(b, 60);
    expect(f.systems.engines).toBeGreaterThan(50);
  });

  it('helm stores the maneuver; fighter command stores the task; the marine commander says when there are no pods', () => {
    const { b, f, crew } = setup();
    expect(command(b, f.id, { kind: 'helm', maneuver: 'crossBow' }).ok).toBe(true);
    expect(crew.helm).toBe('crossBow');
    expect(officerSaid(b, 'helm')).toMatch(/Crossing their bow/);
    expect(command(b, f.id, { kind: 'fighters', task: 'escort' }).ok).toBe(true);
    expect(crew.fighters).toBe('escort');
    const pods = command(b, f.id, { kind: 'launchPods', target: 'e6' });
    if (!(ORDER_KINDS as string[]).includes('board')) {
      // Without PKG-05's `board` kind: refused out loud, never silently.
      expect(pods.ok).toBe(false);
      expect(pods.reason).toMatch(/pods/i);
      expect(b.log.some((e) => e.kind === 'commsRefused' && e.ship === f.id)).toBe(true);
    } else {
      // With it, the marine commander hands over to `board`: the order is logged, and either taken or refused out loud.
      expect(b.log.some((e) => e.kind === 'order' && e.ship === f.id && (e.order.kind as string) === 'board')).toBe(true);
      if (pods.ok) expect(crew.pods).toBe('e6');
      else expect(b.log.some((e) => e.kind === 'commsRefused' && e.ship === f.id)).toBe(true);
    }
  });

  it('officer orders are for the flagship only', () => {
    const { b } = setup();
    expect(command(b, 'p3', { kind: 'gunsOn', target: 'e3' }).ok).toBe(false);
  });
});

describe('comms: reports can be wrong', () => {
  it('Candour 10 tells the truth; a low-Candour Optimist overstates the hull; accuracy is recorded', () => {
    const b = quiet();
    const honest = ship(b, 'p2');
    const rosy = ship(b, 'p4');
    honest.captain.abilities.candour = 10;
    rosy.captain.abilities.candour = 1;
    rosy.captain.trait = 'Optimist';
    rosy.captain.mood = 'confident';
    honest.hull = honest.hullMax * 0.4;
    rosy.hull = rosy.hullMax * 0.4;
    for (let i = 0; i < 5; i++) {
      expect(ping(b, 'p2')!.reported).toBe(40);
      ping(b, 'p4');
    }
    const acc = comms(b).accuracy;
    expect(acc.p2.accurate).toBe(5);
    expect(acc.p4.bias).toBeGreaterThan(0);
    expect(acc.p4.accurate).toBeLessThan(5);
  });
});

describe('comms: lines', { timeout: 60_000 }, () => {
  it('every common type × trait × mood cell has at least 3 lines, and no placeholder is left unfilled', () => {
    for (const [type, byMood] of Object.entries(BODY)) {
      const fam = FAMILY[type as keyof typeof FAMILY]!;
      for (const mood of MOODS) {
        expect(byMood![mood].length, `${type}/${mood}`).toBeGreaterThanOrEqual(3);
        for (const t of TRAITS) expect(new Set(TAIL[fam][t]).size, `${fam}/${t}`).toBeGreaterThanOrEqual(1);
      }
    }
    const b = run(fresh(3, 'player-answers-first'), 240);
    const all = [...comms(b).history, ...comms(b).open];
    expect(all.length).toBeGreaterThan(10);
    for (const r of all) expect(r.text, r.type).not.toMatch(/\{\w+\}/);
  }, 60_000);
});

describe('comms: policy and determinism', { timeout: 60_000 }, () => {
  it('player-answers-first answers everything at once and changes the battle against idle', () => {
    const a = run(fresh(2, 'player-answers-first'));
    const i = run(fresh(2, 'idle'));
    expect(comms(a).history.filter((r) => r.level !== 'status').length).toBeGreaterThan(0);
    expect(a.log.filter((e) => e.kind === 'commsAnswer' && e.by === 'admiral').length).toBeGreaterThan(0);
    expect(hashState(a)).not.toBe(hashState(i));
    const idleShown = summarise(i).timeoutDecisions.filter((d) => d.side === 'player' && d.report !== undefined).length;
    const answeredShown = summarise(a).timeoutDecisions.filter((d) => d.side === 'player' && d.report !== undefined).length;
    expect(answeredShown).toBeLessThan(idleShown);
  }, 60_000);

  it('same seed and policy twice: identical hash; JSON round-trip mid-battle carries on identically', () => {
    for (const p of ['idle', 'player-answers-first']) {
      expect(hashState(run(fresh(6, p)))).toBe(hashState(run(fresh(6, p))));
    }
    const x = fresh(2, 'player-answers-first');
    run(x, 90);
    const y = JSON.parse(JSON.stringify(x)) as Battle;
    run(x, 120);
    run(y, 120);
    expect(hashState(y)).toBe(hashState(x));
  }, 60_000);

  it('queue() is a pure read', () => {
    const b = run(fresh(1), 120);
    const h = hashState(b);
    queue(b);
    answerable(b);
    expect(hashState(b)).toBe(h);
  }, 60_000);

  it('never reads wall time or Math.random', async () => {
    const mods = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const [path, src] of Object.entries(mods)) {
      if (path.endsWith('.test.ts')) continue;
      expect(src, path).not.toMatch(/Date\.now|new Date|performance\.now|Math\.random/);
    }
  });
});

