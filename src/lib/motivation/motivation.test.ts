import { describe, expect, it } from 'vitest';
import { ANNOUNCEMENT, migrateDirector, newDirector, nextThreat, onPatrolBroken, onTaken, resolveThreat } from './director';
import type { DirectorCtx } from './director';
import { ROUTES, routesMarkdown, runRoutes, sweep } from './report';
import { simulate } from './sim';
import { DIRECTOR, RANKS, TECH, XP_CURVE, levelOf } from './tables';
import { killPay, measureTtk } from './ttk';

const ttk = measureTtk(12, 1);
const ctx = (o: Partial<DirectorCtx> = {}): DirectorCtx => ({ t: 0, held: 1, broken: 0, dominance: 1, rank: 1, unrest: {}, heldSince: {}, sinceRung: 0, ...o });

describe('motivation tables', () => {
  it('the XP curve rises and its steps grow', () => {
    for (let i = 1; i < XP_CURVE.length; i++) expect(XP_CURVE[i]).toBeGreaterThan(XP_CURVE[i - 1]);
    for (let i = 2; i < XP_CURVE.length; i++) expect(XP_CURVE[i] - XP_CURVE[i - 1]).toBeGreaterThanOrEqual(XP_CURVE[i - 1] - XP_CURVE[i - 2]);
    expect(levelOf(0)).toBe(1);
    expect(levelOf(XP_CURVE[9])).toBe(10);
    expect(levelOf(1e9)).toBe(10);
  });

  it('every rank and tech tier has a rule that can be met', () => {
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].level).toBeGreaterThanOrEqual(RANKS[i - 1].level);
    expect(RANKS.find((r) => r.name === 'Captain')!.helium).toBe(true);
    expect(TECH.map((t) => t.tier)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('kill pay is flat per second under fire, so the safest target no longer pays best', () => {
    const pay = killPay(ttk);
    const perSecond = Object.values(pay).map((p) => p.xp / p.seconds);
    expect(Math.max(...perSecond) / Math.min(...perSecond)).toBeLessThan(1.25);
    expect(pay.capital.xp).toBeGreaterThan(pay.cruiser.xp);
  });
});

describe('director', () => {
  it('relief fleet comes after a world turns, and not inside the relax gap', () => {
    const d = newDirector();
    onTaken(d, 'mars', 10, 2);
    expect(nextThreat(d, ctx({ t: 12, held: 2 }))).toBeNull();
    const th = nextThreat(d, ctx({ t: 22, held: 2 }))!;
    expect(th.kind).toBe('counter');
    resolveThreat(d, th, 28);
    expect(nextThreat(d, ctx({ t: 29, held: 2, dominance: 5 }))).toBeNull(); // relax
  });

  it('a dominant, idle player gets raided; a struggling one does not', () => {
    const d = newDirector();
    d.lastPushback = 0;
    expect(nextThreat(d, ctx({ t: 20, held: 2, dominance: 1.2 }))).toBeNull();
    expect(nextThreat(d, ctx({ t: 20, held: 2, dominance: 2 }))!.kind).toBe('raid');
  });

  it('optional threats wait while a struggling player is stalled; a coasting one is pushed; a relief fleet comes regardless', () => {
    const d = newDirector();
    d.nemesis = { generation: 1, escapes: 0, nextAt: 10, from: 'mars' };
    expect(nextThreat(d, ctx({ t: 20, held: 2, dominance: 1.2, sinceRung: DIRECTOR.stallHold }))).toBeNull();
    expect(nextThreat(d, ctx({ t: 20, held: 2, dominance: 2, sinceRung: DIRECTOR.stallHold }))!.kind).toBe('nemesis'); // coasting
    onTaken(d, 'mars', 0, 2);
    expect(nextThreat(d, ctx({ t: 20, held: 2, dominance: 1.2, sinceRung: DIRECTOR.stallHold }))!.kind).toBe('counter');
  });

  it('the Reckoning forms at three worlds held and raids on a clock', () => {
    const d = newDirector();
    const th = nextThreat(d, ctx({ t: 100, held: 3 }))!;
    expect(th.kind).toBe('reckoning');
    expect(ANNOUNCEMENT).toContain('reckoning');
    resolveThreat(d, th, 100);
    expect(nextThreat(d, ctx({ t: 100 + DIRECTOR.reckoningRaidEvery + 1, held: 3 }))!.kind).toBe('reckoningRaid');
  });

  it('the rival escapes twice, then a duel ends him and a successor rises', () => {
    const d = newDirector();
    onPatrolBroken(d, 'mars', 0);
    let t = 0;
    for (let i = 0; i < 3; i++) {
      t = d.nemesis!.nextAt;
      const th = nextThreat(d, ctx({ t }))!;
      expect(th.kind).toBe('nemesis');
      resolveThreat(d, th, t + 4);
    }
    expect(d.nemesis).toBeNull();
    onPatrolBroken(d, 'moon', t + 10);
    expect(d.nemesis!.generation).toBe(2);
  });

  it('the Last Alliance is announced with a visible march countdown before it strikes', () => {
    const d = newDirector();
    onTaken(d, 'venus', 300, DIRECTOR.lastAllianceAtHeld);
    d.counters = [];
    const w = nextThreat(d, ctx({ t: 300, held: 5 }))!;
    expect(w.kind).toBe('marchWarning');
    resolveThreat(d, w, 300);
    expect(nextThreat(d, ctx({ t: 305, held: 5 }))?.kind).not.toBe('lastAlliance');
    expect(nextThreat(d, ctx({ t: 300 + DIRECTOR.marchWarning, held: 5 }))!.kind).toBe('lastAlliance');
  });
});

describe('director: the feud raid (GP-02)', () => {
  it('the first raid, two fighters of the blood enemy, is due inside 60 s of the first undock', () => {
    const d = newDirector();
    expect(nextThreat(d, ctx({ t: 0, raider: 'mars' }))).toBeNull();
    expect(DIRECTOR.firstRaid * 60).toBeLessThan(60);
    const th = nextThreat(d, ctx({ t: DIRECTOR.firstRaid, raider: 'mars' }))!;
    expect(th.kind).toBe('feudRaid');
    expect(th.world).toBe('mars');
    expect(th.force).toEqual({ fighter: 2, cruiser: 0 });
  });
  it('the first raid comes even to a stalled player; later ones wait for the relax gap and grow', () => {
    const d = newDirector();
    const th = nextThreat(d, ctx({ t: 1, raider: 'venus', sinceRung: 99 }))!;
    expect(th.kind).toBe('feudRaid');
    resolveThreat(d, th, 3);
    expect(nextThreat(d, ctx({ t: 3 + DIRECTOR.relax, raider: 'venus' }))).toBeNull();
    const second = nextThreat(d, ctx({ t: 3 + DIRECTOR.feudRaidEvery, raider: 'venus' }))!;
    expect(second.kind).toBe('feudRaid');
    expect(second.force!.cruiser).toBe(1); // the second raid brings a cruiser (GAMEPLAY.md P2.4, rung 3)
  });
  it('no raider (the simulator): no feud raids', () => {
    expect(nextThreat(newDirector(), ctx({ t: 5 }))).toBeNull();
  });
  it('a saved director comes back with its sentinels', () => {
    const d = newDirector();
    const back = migrateDirector(JSON.parse(JSON.stringify({ t: 2, d })))!;
    expect(back.t).toBe(2);
    expect(back.d.marchAt).toBe(d.marchAt);
    expect(back.d.lastEnd).toBe(d.lastEnd);
  });
});

describe('simulated routes', () => {
  const runs = runRoutes(ttk);

  it('is repeatable for a seed', () => {
    expect(simulate(ROUTES[0], ttk, 3).end).toBe(simulate(ROUTES[0], ttk, 3).end);
  });

  for (const run of runs) {
    it(`${run.tl.route.id}: wins and meets every anti-stagnation rule`, () => {
      expect(run.tl.won).toBe(true);
      const failed = run.rules.filter((r) => !r.ok).map((r) => `${r.id}: ${r.worst}`);
      expect(failed).toEqual([]);
    });
  }

  const sw = sweep(ttk, 10);
  it('holds across salvage seeds: at least 9 of 10 runs of every route meet every rule', () => {
    for (const s of sw) expect(s.passAll, `${s.route}: ${s.misses.join('; ')}`).toBeGreaterThanOrEqual(9);
  });

  it('writes the report', async () => {
    const md = routesMarkdown(runs, ttk, sw);
    expect(md).toContain('## Rules, every route');
    const out = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.MOTIVATION_OUT;
    if (out) {
      const fs = 'node:fs';
      const { writeFileSync } = (await import(/* @vite-ignore */ fs)) as { writeFileSync: (p: string, s: string) => void };
      writeFileSync(out, md);
    }
  });
});
