import { describe, expect, it } from 'vitest';
import { breakThreshold } from '../captains';
import { SATURN_12V12, createBattle, hashState, run, step } from '../index';
import { fleetLosses } from '../losses';
import { MORALE } from '../numbers';
import { ORDER_KINDS } from '../types';
import type { Battle } from '../types';
import { ADMIRAL_POLICIES, admiral } from './admiral';
import { DIFFICULTY, JUPITER } from './numbers';
import { admiralReport } from './report';

const battle = (seed: number, player = 'idle', enemy?: string) =>
  createBattle(SATURN_12V12, seed, { controllers: { player, ...(enemy ? { enemy } : {}) } });

// Whole battles run here (0.1–0.4 s each, more under a loaded machine): every test gets a 60 s budget.
describe('AI admiral (PKG-07)', { timeout: 120_000 }, () => {
  it('is the setup enemy controller, and the runner policies are registered', () => {
    expect(SATURN_12V12.enemy.controller).toBe('admiral-jupiter');
    for (const k of ['admiral-jupiter', 'aggressive-admiral', 'scripted-good', 'scripted-bad']) {
      expect(typeof ADMIRAL_POLICIES[k]).toBe('function');
      expect(() => battle(1, k === 'scripted-good' || k === 'scripted-bad' ? k : 'idle', k.includes('admiral') ? k : undefined)).not.toThrow();
    }
  });

  it('is deterministic and survives a JSON round trip mid-battle', () => {
    const a = battle(3);
    run(a, 45);
    const b = JSON.parse(JSON.stringify(a)) as Battle;
    run(a);
    run(b);
    expect(hashState(b)).toBe(hashState(a));
    const c = battle(3);
    run(c);
    expect(hashState(c)).toBe(hashState(a));
  });

  it("issues only the player's order kinds, and every order() call in an idle-player battle is the admiral's", () => {
    for (const seed of [1, 2]) {
      const b = battle(seed);
      run(b);
      const r = admiralReport(b, 'enemy');
      expect(r.issued).toBeGreaterThan(0);
      expect(r.foreignKinds).toEqual([]);
      expect(r.logForeign).toBe(0);
      expect(r.statsOrders).toBe(r.issued);
      for (const k of Object.keys(r.kinds)) expect(ORDER_KINDS as readonly string[]).toContain(k);
    }
  });

  it('never writes ship state itself: its source assigns no ship field', () => {
    const fields = ['stance', 'order', 'split', 'shields', 'open', 'heading', 'speed', 'pos', 'status', 'morale', 'hull', 'systems', 'side', 'crew', 'marines'];
    const bad = new RegExp(`\\b(s|ship|f|t|tgt|x|l|foe)\\.(${fields.join('|')})(\\.[a-z]+|\\[[^\\]]+\\])?\\s*(=(?!=)|\\+=|-=)`);
    expect(bad.test('s.order = null')).toBe(true); // the pattern catches a write
    const mods = import.meta.glob('./*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const files = Object.entries(mods).filter(([path]) => !path.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const [path, src] of files) expect(bad.test(src), `${path} assigns a ship field`).toBe(false);
  });

  it("does not read the enemy's shields, hull, morale or captains: changing them changes none of its decisions", () => {
    const a = battle(4);
    run(a, 40);
    const b = JSON.parse(JSON.stringify(a)) as Battle;
    for (const s of b.ships) {
      if (s.side !== 'player') continue;
      s.morale = 3;
      s.hull = s.hullMax * 0.11;
      s.shields = { fore: 0, aft: 1, port: 2, starboard: 3 };
      s.captain.abilities = { gunnery: 1, helm: 1, nerve: 1, judgement: 1, candour: 1 };
    }
    for (const x of [a, b]) {
      x.sides.enemy.admiral!.nextOps = 0;
      x.sides.enemy.admiral!.nextWatch = 0;
      ADMIRAL_POLICIES['admiral-jupiter'](x, 'enemy');
    }
    expect(JSON.stringify(b.sides.enemy.admiral)).toBe(JSON.stringify(a.sides.enemy.admiral));
    expect(b.ships.filter((s) => s.side === 'enemy').map((s) => s.order)).toEqual(a.ships.filter((s) => s.side === 'enemy').map((s) => s.order));
  });

  it('waits its reaction delay before its first order', () => {
    const b = battle(1);
    while (b.t < 10) step(b);
    const first = b.log.find((e) => e.kind === 'order' && e.by === 'enemy');
    expect(first).toBeDefined();
    expect(first!.t).toBeGreaterThanOrEqual(1 + DIFFICULTY.normal.reactionDelayS - 1e-6);
  });

  it('telegraphs a boarding push (escorts forward, a logged telegraph event) at least 5 s before boarders are due', () => {
    let pushes = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const b = battle(seed);
      run(b);
      const r = admiralReport(b, 'enemy');
      for (const p of r.pushes.filter((x) => x.telegraphAt !== null && x.launchedAt !== null)) {
        pushes++;
        expect(p.lead!).toBeGreaterThanOrEqual(5);
        expect(p.visible).toBe(true);
      }
    }
    expect(pushes).toBeGreaterThan(0);
    expect(JUPITER.telegraphLeadS).toBeGreaterThanOrEqual(5);
  });

  it('PKG-13: telegraphs a push on at least 8 of seeds 1-10, and never launches boarders unseen', () => {
    // Not every battle: where the launchers' own captains board on their own early (unordered, PKG-05), they have no
    // marines left to spare by the time the admiral would push (reports/PKG-13.md).
    let withPush = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const b = battle(seed);
      run(b);
      const r = admiralReport(b, 'enemy');
      for (const p of r.pushes) {
        if (p.launchedAt !== null) expect(p.visible, `seed ${seed}`).toBe(true);
        if (p.abortReason === 'telegraph not seen' || p.abortReason === 'board refused') expect(p.launchedAt).toBeNull();
      }
      if (r.pushes.some((p) => p.telegraphAt !== null && p.launchedAt !== null)) withPush++;
    }
    expect(withPush).toBeGreaterThanOrEqual(8);
  });

  it("PKG-13: the withdrawal watch reads the break rule's strength-weighted losses", () => {
    const setUp = (wreck: string[]) => {
      const b = battle(1);
      run(b, 20);
      for (const id of wreck) b.ships.find((s) => s.id === id)!.status = 'wrecked';
      const e9 = b.ships.find((s) => s.id === 'e9')!; // a cruiser, strength 2
      e9.morale = breakThreshold(e9.captain) + 1;
      const a = b.sides.enemy.admiral!;
      a.withdrawn = [];
      a.pending = [];
      a.nextWatch = 0;
      a.nextOps = 1e9;
      ADMIRAL_POLICIES['admiral-jupiter'](b, 'enemy');
      return { b, a, frac: fleetLosses(b, 'enemy').frac };
    };
    // 15 of 27 strength gone (56%, under PKG-16's 0.56 break share): withdrawing a cruiser (half its 2) would take the
    // side to 59%, past the break.
    const near = setUp(['e1', 'e5', 'e8', 'e2', 'e4', 'e3', 'e10', 'e11']);
    expect(near.frac).toBeCloseTo(15 / 27, 5);
    expect(near.frac).toBeLessThan(MORALE.sideBreakStrength);
    expect(near.a.withdrawn).not.toContain('e9');
    // 6 of 27 gone: the same cruiser is pulled out before it breaks.
    const far = setUp(['e1', 'e5', 'e2', 'e4']);
    expect(far.frac).toBeLessThan(MORALE.sideBreakStrength - 2 / 27);
    expect(far.a.withdrawn).toContain('e9');
  });

  it('keeps a longer engagement range than the aggressive control on seed 1', () => {
    const j = battle(1);
    run(j);
    const m = battle(1, 'idle', 'aggressive-admiral');
    run(m);
    expect(admiralReport(j, 'enemy').meanShotRangeM!).toBeGreaterThan(admiralReport(m, 'enemy').meanShotRangeM!);
  });

  it('never withdraws its flagship, nor a ship whose withdrawal would break the side', () => {
    for (const seed of [1, 2, 3]) {
      const b = battle(seed);
      run(b);
      const a = b.sides.enemy.admiral!;
      expect(a.withdrawn).not.toContain(b.sides.enemy.flagshipId);
      expect(a.withdrawn.length).toBeLessThanOrEqual(JUPITER.maxWithdrawals);
    }
  });

  it('the difficulty knob changes the admiral: an easy admiral makes mistakes', () => {
    let easy = 0;
    for (let seed = 1; seed <= 6; seed++) {
      // Drive an easy admiral by hand at the policy cadence (1 s), on a battle whose enemy slot is otherwise idle.
      const b = battle(seed, 'idle', 'idle');
      const easyCtl = admiral('jupiter', 'easy');
      while (!b.ended) { if (b.tick % 30 === 0) easyCtl(b, 'enemy'); step(b); }
      easy += b.sides.enemy.admiral!.mistakes;
    }
    expect(easy).toBeGreaterThan(0);
  });
});
