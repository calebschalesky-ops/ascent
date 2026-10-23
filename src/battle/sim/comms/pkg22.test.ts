/** PKG-22: comms clarity (QA-05 F-03, F-04, F-07, F-08, F-09, F-10, F-14; TRC-05 TRC05-2, -3, -6). */
import { describe, expect, it } from 'vitest';
import { SATURN_12V12, answerTop, answerable, comms, createBattle, orderSay, queue, selectedReport, step, tabNext, watchShip } from '../index';
import { pushLog } from '../ships';
import type { Battle, LogEvent, Ship } from '../types';
import { MARINE, OFFICER } from './lines';

const ship = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!;
const flagship = (b: Battle) => ship(b, b.sides.player.flagshipId);
function quiet(seed = 1): Battle {
  const b = createBattle(SATURN_12V12, seed, { controllers: { player: 'idle' } });
  for (const s of b.ships) if (s.side === 'enemy') s.pos = { x: s.pos.x + 200000, y: 0, z: s.pos.z };
  step(b);
  return b;
}
/** One of ours hits `t` on `side`: through to the hull, or splashing on the shield. */
const shot = (b: Battle, from: Ship, t: Ship, side: 'port' | 'fore', through: boolean) => pushLog(b, {
  t: b.t, kind: 'shot', ship: from.id, target: t.id, gun: 'rail', range: 1000, p: 1, roll: 0, hit: true, side,
  shieldDmg: through ? 0 : 10, hullDmg: through ? 10 : 0,
} as unknown as LogEvent);
/** Bring enemy `id` inside pod reach of our flagship. */
function close(b: Battle, id: string): Ship {
  const t = ship(b, id);
  const f = flagship(b);
  t.pos = { x: f.pos.x + 800, y: 0, z: f.pos.z };
  return t;
}
const request = (b: Battle, id: string, kind: 'withdraw' | 'pursue') => {
  b.requests.push({ id: b.nextRequestId++, t: b.t, ship: id, kind, about: null, options: kind === 'withdraw' ? ['withdraw', 'stay'] : ['pursue', 'hold'], deadline: b.t + 8 });
};

describe('PKG-22 F-03: the master of guns says when an enemy side is open', () => {
  it('a hit through a watched ship\'s side raises "Send the pods / Keep firing"; the pods go at that side', () => {
    const b = quiet();
    const t = close(b, 'e3');
    watchShip(b, t.id);
    shot(b, ship(b, 'p2'), t, 'port', true);
    step(b);
    const r = comms(b).open.find((x) => x.type === 'sideOpen')!;
    expect(r).toBeTruthy();
    expect(r.from.officer).toBe('guns');
    expect(r.answers.map((a) => a.label)).toEqual(['Send the pods', 'Keep firing']);
    expect(r.text).toMatch(/port side/);
    const o = r.answers[0].orders[0].order;
    expect(o.side).toBe('port');
    expect(answerTop(b, 0, r.id).ok).toBe(true);
    const launch = b.log.filter((e) => e.kind === 'boardLaunch').pop() as unknown as { target: string; side: string } | undefined;
    expect(launch?.target).toBe(t.id);
    expect(launch?.side).toBe('port');
  });

  it('an unwatched ship raises nothing; a splash on the reported side closes the report', () => {
    const b = quiet();
    const t = close(b, 'e3');
    shot(b, ship(b, 'p2'), t, 'port', true);
    step(b);
    expect(comms(b).open.some((x) => x.type === 'sideOpen')).toBe(false);
    watchShip(b, t.id);
    b.comms!.cooldown = {};
    shot(b, ship(b, 'p2'), t, 'port', true);
    step(b);
    expect(comms(b).open.some((x) => x.type === 'sideOpen')).toBe(true);
    shot(b, ship(b, 'p2'), t, 'port', false);
    step(b);
    expect(comms(b).open.some((x) => x.type === 'sideOpen')).toBe(false);
    expect(comms(b).open.some((x) => x.type === 'sideClosed')).toBe(true);
  });
});

describe('PKG-22 F-04 / TRC05-2: a key answers the card on screen, and a press that cannot act says why', () => {
  it('answering by id answers that card even when a newer urgent card has gone above it', () => {
    const b = quiet();
    pushLog(b, { t: b.t, kind: 'shieldDown', ship: 'p2', side: 'port' });
    step(b);
    const shown = selectedReport(b)!;
    pushLog(b, { t: b.t, kind: 'systemOut', ship: 'p3', system: 'hangar' });
    step(b);
    expect(answerable(b)[0].id).not.toBe(shown.id);
    expect(answerTop(b, 1, shown.id).ok).toBe(true);
    expect(comms(b).open.some((x) => x.id === shown.id)).toBe(false);
    expect(answerable(b).length).toBe(1);
  });

  it('Tab holds its card by id when a new report arrives above it', () => {
    const b = quiet();
    pushLog(b, { t: b.t, kind: 'shieldDown', ship: 'p2', side: 'port' });
    pushLog(b, { t: b.t, kind: 'shieldDown', ship: 'p4', side: 'port' });
    step(b);
    tabNext(b);
    const held = selectedReport(b)!.id;
    pushLog(b, { t: b.t, kind: 'systemOut', ship: 'p3', system: 'hangar' });
    step(b);
    expect(selectedReport(b)!.id).toBe(held);
    expect(queue(b).find((q) => q.selected)!.id).toBe(held);
  });

  it('a closed card and a missing answer are said out loud, and nothing else is answered instead', () => {
    const b = quiet();
    pushLog(b, { t: b.t, kind: 'systemOut', ship: 'p3', system: 'hangar' });
    step(b);
    const r = selectedReport(b)!;
    expect(r.answers.length).toBe(2);
    const miss = answerTop(b, 2, r.id);
    expect(miss.ok).toBe(false);
    expect(miss.reason).toMatch(/two answers: Q Carry on, E Withdraw/);
    pushLog(b, { t: b.t, kind: 'shieldDown', ship: 'p2', side: 'port' });
    step(b);
    answerTop(b, 0, r.id);
    const again = answerTop(b, 0, r.id);
    expect(again.ok).toBe(false);
    expect(again.reason).toMatch(/^Too late/);
    expect(answerable(b).length).toBe(1);
  });
});

describe('PKG-22 F-08: answers match the request', () => {
  it('a captain who asks to turn is offered "Turn a fresh side" first; every shieldDown card offers it', () => {
    let asked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const b = quiet(seed);
      pushLog(b, { t: b.t, kind: 'shieldDown', ship: 'p2', side: 'port' });
      step(b);
      const r = comms(b).open.find((x) => x.type === 'shieldDown')!;
      expect(r.answers.map((a) => a.key)).toContain('turn');
      if (/turn/i.test(r.text)) { asked++; expect(r.answers[0].key).toBe('turn'); } else expect(r.answers[0].key).toBe('reinforce');
    }
    expect(asked).toBeGreaterThan(0);
  });

  it('boarders inbound are answered with shields on the side they aim at', () => {
    const b = quiet();
    pushLog(b, { t: b.t, kind: 'boardLaunch', ship: 'e2', target: 'p2', group: 1, pods: 2, marines: 20, side: 'port', reinforcing: false, ordered: false } as unknown as LogEvent);
    step(b);
    const r = comms(b).open.find((x) => x.type === 'boardersInbound')!;
    expect(r.text).toMatch(/port/);
    expect(r.answers[0].label).toBe('Shields to port');
    expect(answerTop(b, 0, r.id).ok).toBe(true);
    const p2 = ship(b, 'p2');
    expect(p2.split.port).toBeGreaterThan(0.25);
  });
});

describe('PKG-22 F-09: one captain, one live card', () => {
  const shownFor = (b: Battle, id: string) => queue(b).filter((q) => q.level !== 'status' && q.from.ship === ship(b, id).name && !q.from.officer);
  it('a withdraw request is the one card shown over the same captain\'s breach; answering it closes the breach', () => {
    const b = quiet();
    pushLog(b, { t: b.t, kind: 'systemOut', ship: 'p3', system: 'guns' });
    step(b);
    request(b, 'p3', 'withdraw');
    step(b);
    const mine = shownFor(b, 'p3');
    expect(mine.length).toBe(1);
    expect(mine[0].type).toBe('withdraw');
    answerTop(b, 2, mine[0].id);
    step(b);
    expect(comms(b).open.filter((r) => r.ship === 'p3' && r.level !== 'status').length).toBe(0);
    // Nothing from p3 timed out afterwards to contradict the answer.
    for (let i = 0; i < 400; i++) step(b);
    expect([...comms(b).open, ...comms(b).history].some((r) => r.ship === 'p3' && r.type === 'timeoutChoice')).toBe(false);
  });

  it('a second request waits its turn behind the first', () => {
    const b = quiet();
    request(b, 'p3', 'pursue');
    step(b);
    request(b, 'p3', 'withdraw');
    step(b);
    const mine = shownFor(b, 'p3');
    expect(mine.map((r) => r.type)).toEqual(['pursue']);
    answerTop(b, 0, mine[0].id);
    step(b);
    expect(shownFor(b, 'p3').map((r) => r.type)).toEqual(['withdraw']);
  });
});

describe('PKG-22 F-14: an officer whose ship is gone stops reporting', () => {
  it('after the flagship is out, officer reports come from the senior captain still in the fight', () => {
    const b = quiet();
    const f = flagship(b);
    const before = comms(b).nextId;
    f.status = 'wrecked';
    pushLog(b, { t: b.t, kind: 'out', ship: f.id, how: 'wrecked' });
    for (let i = 0; i < 40; i++) step(b);
    const after = [...comms(b).open, ...comms(b).history].filter((r) => r.id >= before && r.from.officer);
    expect(after.length).toBeGreaterThan(0);
    for (const r of after) {
      expect(r.from.ship).not.toBe(f.name);
      expect(r.from.portrait.startsWith('captain:')).toBe(true);
    }
  });
});

describe('PKG-22 F-10 / TRC05-3 and TRC05-6', () => {
  it('order kinds have words for the log', () => {
    for (const k of ['shieldPower', 'launchPods', 'board', 'fighters', 'attack', 'maneuver']) expect(orderSay(k)).not.toMatch(/[A-Z]/);
  });
  it('the marine commander never says "outnumbered" with the bigger figure', () => {
    for (const line of OFFICER.boardLosing.concat(OFFICER.boardClose, OFFICER.boardHolding)) expect(line).toMatch(/\{ours\}|\{theirs\}|\{about\}/);
    expect(OFFICER.boardClose.join(' ')).not.toMatch(/outnumbered/);
    expect(MARINE.capturedUs.every((l) => l.startsWith('{about} is taken'))).toBe(true);
    expect(MARINE.captured.every((l) => l.startsWith('{about} is ours'))).toBe(true);
  });
});
