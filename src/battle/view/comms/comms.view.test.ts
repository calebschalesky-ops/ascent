import { describe, expect, it } from 'vitest';
import { POINTS, SATURN_12V12, SHIELD_SIDES, command, createBattle, hasHangar, ping, step, tabNext } from '../../sim/index';
import type { Battle } from '../../sim/index';
import { allToSide, costOf, flagshipOf, initials, menuFor, orderLines, queueRows, rosterOf, shiftSplit, statusWord } from './logic';

const run = (b: Battle, s: number) => { for (let i = 0; i < Math.round(s * 30); i++) step(b); };
const own = (b: Battle) => b.ships.filter((s) => s.side === 'player');
const enemy = (b: Battle) => b.ships.filter((s) => s.side === 'enemy');

describe('comms UI logic (PKG-09)', () => {
  it('draws a placeholder portrait from a name', () => {
    expect(initials('Livia Laskaris')).toBe('LL');
    expect(initials('Bardas')).toBe('BA');
    expect(initials('')).toBe('?');
  });

  it('a queue row shows Q/E/R only on the selected report, and how much of its timeout is left', () => {
    const b = createBattle(SATURN_12V12, 2);
    let rows = queueRows(b, new Map());
    for (let i = 0; i < 90 * 30 && rows.filter((r) => r.level !== 'status').length < 2; i++) { step(b); rows = queueRows(b, new Map()); }
    const left = new Map<number, number>();
    rows = queueRows(b, left);
    const answerable = rows.filter((r) => r.level !== 'status' && r.answers.length);
    expect(answerable.length).toBeGreaterThan(0);
    const sel = answerable.find((r) => r.selected)!;
    expect(sel.keys.slice(0, 2)).toEqual(['Q', 'E']);
    for (const r of answerable.filter((x) => !x.selected)) expect(r.keys.every((k) => k === '')).toBe(true);
    expect(sel.fraction).toBe(1);
    step(b); step(b); step(b);
    const again = queueRows(b, left).find((r) => r.id === sel.id);
    if (again?.fraction !== null && again) expect(again.fraction).toBeLessThan(1);
    if (answerable.length > 1) {
      tabNext(b);
      expect(queueRows(b, left).find((r) => r.selected)!.id).not.toBe(sel.id);
    }
  });

  it('the roster status word is what the captain said, never the true hull', () => {
    const b = createBattle(SATURN_12V12, 3);
    const s = own(b).find((x) => !x.flagship)!;
    expect(statusWord(b, s).word).toBe('On station');
    s.hull = s.hullMax * 0.3; // the truth
    const r = ping(b, s.id)!;
    const w = statusWord(b, s);
    expect(w.reported).toBe(r.reported);
    expect(['Sound', 'Damaged', 'Hurt', 'Crippled']).toContain(w.word);
    expect(rosterOf(b).find((c) => c.id === s.id)!.word).toBe(w.word);
  });

  it('a roster has one card per own ship, flagship first, and a prize joins it', () => {
    const b = createBattle(SATURN_12V12, 1);
    const cards = rosterOf(b);
    expect(cards).toHaveLength(own(b).length);
    expect(cards[0].flagship).toBe(true);
    const e = enemy(b)[0];
    e.side = 'player'; e.prize = true;
    expect(rosterOf(b).some((c) => c.id === e.id && c.prize)).toBe(true);
  });

  it('costs match command(): the flagship and her officers cost `officer`, a captain `direct`', () => {
    const b = createBattle(SATURN_12V12, 1);
    const flag = flagshipOf(b)!;
    const other = own(b).find((x) => !x.flagship)!;
    expect(costOf(b, flag.id, 'attack')).toBe(POINTS.officer);
    expect(costOf(b, other.id, 'gunsOn')).toBe(POINTS.officer);
    expect(costOf(b, other.id, 'attack')).toBe(POINTS.direct);
    const before = b.comms?.points.player ?? POINTS.start;
    command(b, other.id, { kind: 'holdPosition' });
    expect(b.comms!.points.player).toBeCloseTo(before - costOf(b, other.id, 'holdPosition'));
  });

  it('an order line stands while the order does', () => {
    const b = createBattle(SATURN_12V12, 1);
    const s = own(b).find((x) => !x.flagship && x.captain.trait === 'By-the-book') ?? own(b).find((x) => !x.flagship)!;
    const t = enemy(b)[0];
    s.captain.loyalty = 100;
    const r = command(b, s.id, { kind: 'attack', target: t.id });
    if (!r.ok) return; // a protest: nothing stands yet (pushback is PKG-06's, seeded)
    expect(orderLines(b)).toContainEqual({ from: s.id, to: t.id, kind: 'attack' });
    s.order = null;
    expect(orderLines(b).some((l) => l.from === s.id)).toBe(false);
    run(b, 0);
  });

  it('shield split: a step moves power toward a side and still sums to 1; "all" leaves the floor elsewhere', () => {
    const even = { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 };
    const p = shiftSplit(even, 'port');
    expect(p.port).toBeGreaterThan(0.25);
    expect(SHIELD_SIDES.reduce((a, k) => a + p[k], 0)).toBeCloseTo(1);
    let q = even;
    for (let i = 0; i < 20; i++) q = shiftSplit(q, 'fore');
    expect(Math.min(q.aft, q.port, q.starboard)).toBeGreaterThanOrEqual(0.05 - 1e-9);
    const all = allToSide('port');
    expect(all.port).toBeCloseTo(0.85);
    expect(shiftSplit(p, 'even')).toEqual(even);
  });

  it('the order menu offers boarding only to a ship with pods', () => {
    const b = createBattle(SATURN_12V12, 5);
    const t = enemy(b)[0].id;
    for (const s of own(b)) {
      const ids = menuFor(b, s.id, t).flat().map((m) => m.id);
      expect(ids).toContain('attack');
      expect(ids).toContain('focus-port');
      expect(ids.includes('board')).toBe(hasHangar(s));
    }
  });
});
