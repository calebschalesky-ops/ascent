/**
 * PKG-19: the good and bad plans (reports/PKG-19.md section 1) as policies: registered, ordering through order() only,
 * deterministic, and doing what the plan's moves say.
 */
import { describe, expect, it } from 'vitest';
import { POLICIES, SATURN_12V12, createBattle, run, summarise } from './index';
import { look, planState, seenOpen } from './policy-good';
import { scriptedBad } from './policy-bad';
import { scriptedGood } from './policy-good';
import type { Battle, LogEvent } from './types';

const go = (player: string, seed = 3, minutes = 4) => {
  const b = createBattle(SATURN_12V12, seed, { maxMinutes: minutes, controllers: { player } });
  run(b);
  return b;
};
const playerOrders = (b: Battle) =>
  b.log.filter((e): e is Extract<LogEvent, { kind: 'order' }> => e.kind === 'order' && e.by === 'player');
const cls = (b: Battle, id: string) => b.ships.find((s) => s.id === id)!.cls;

describe('PKG-19: the plans are the registered scripted policies', { timeout: 60_000 }, () => {
  it('scripted-good and scripted-bad point at the new plan files', () => {
    expect(POLICIES['scripted-good']).toBe(scriptedGood);
    expect(POLICIES['scripted-bad']).toBe(scriptedBad);
  });
  // Two short battles per policy: a 30 s timeout so a loaded gate run cannot fail it on time alone.
  it('both are deterministic: same seed, same final hash', () => {
    for (const p of ['scripted-good', 'scripted-bad']) expect(summarise(go(p, 3, 2)).hash).toBe(summarise(go(p, 3, 2)).hash);
  }, 30_000);
});

describe('PKG-19: scripted-good', () => {
  const b = go('scripted-good', 3, 4);
  const os = playerOrders(b);
  it('gives orders (G1, G2)', () => expect(os.filter((e) => e.order.kind === 'attack').length).toBeGreaterThan(5));
  it('G3: never sends an escort at a target', () => {
    const esc = os.filter((e) => cls(b, e.ship) === 'escort');
    expect(esc.every((e) => e.order.kind === 'followFlagship' || e.order.kind === 'withdraw')).toBe(true);
  });
  it('G1 + G2: the line attacks one target at a time (all attack orders in one tick share a target)', () => {
    const byT = new Map<number, Set<string>>();
    for (const e of os) if (e.order.kind === 'attack') (byT.get(e.t) ?? byT.set(e.t, new Set()).get(e.t)!).add(e.order.target!);
    expect([...byT.values()].every((s) => s.size === 1)).toBe(true);
  });
  it('never uses focusSide or shieldPower (G2, G8)', () => {
    expect(os.some((e) => e.order.kind === 'focusSide' || e.order.kind === 'shieldPower')).toBe(false);
  });
});

describe('PKG-19: scripted-bad', () => {
  const b = go('scripted-bad', 3, 4);
  const os = playerOrders(b);
  it('B2: sends escorts at targets', () => {
    expect(os.some((e) => cls(b, e.ship) === 'escort' && e.order.kind === 'attack')).toBe(true);
  });
  it('B1: splits fire across several targets', () => {
    expect(new Set(os.filter((e) => e.order.kind === 'attack').map((e) => e.order.target)).size).toBeGreaterThan(3);
  });
  it('B3: the flagship goes at their flagship', () => {
    const flag = b.sides.player.flagshipId;
    const theirs = b.sides.enemy.flagshipId;
    expect(os.find((e) => e.ship === flag && e.order.kind === 'attack')?.order.target).toBe(theirs);
  });
});

describe('PKG-19: sight reads only its own hits', () => {
  it('a hull hit opens a side, a later shield hit closes it, an enemy shot shows nothing', () => {
    const b = createBattle(SATURN_12V12, 1, { maxMinutes: 1, controllers: { player: 'idle' } });
    const me = b.ships.find((s) => s.side === 'player')!;
    const foe = b.ships.find((s) => s.side === 'enemy')!;
    const shot = (t: number, ship: string, target: string, hullDmg: number, shieldDmg: number): LogEvent =>
      ({ t, kind: 'shot', ship, target, gun: 'rail', range: 5000, p: 1, roll: 0, hit: true, side: 'port', shieldDmg, hullDmg }) as LogEvent;
    const st = planState(b, 'player');
    b.log.push(shot(0, foe.id, me.id, 50, 0));
    look(b, 'player', st.sight);
    expect(seenOpen(b, st.sight, me.id, 'port')).toBe(false);
    b.log.push(shot(0, me.id, foe.id, 40, 0));
    look(b, 'player', st.sight);
    expect(seenOpen(b, st.sight, foe.id, 'port')).toBe(true);
    b.t = 1;
    b.log.push(shot(1, me.id, foe.id, 0, 30));
    look(b, 'player', st.sight);
    expect(seenOpen(b, st.sight, foe.id, 'port')).toBe(false);
  });
});
