/**
 * PKG-25 sim table (for Palamedes): pods lost en route with and without an escort wing, 30 seeds; and EXP-14 step 2's
 * probe, pods aimed at a screened ship intercepted per minute against the same ship unscreened.
 *
 * Run: `PKG25_SEEDS=30 npx vitest run src/battle/sim/fighters/escort-table.test.ts` (prints both tables). Without the
 * variable it runs 6 seeds, so the full suite stays quick under the gate's parallel load.
 * Scenario: saturn-12v12, both controllers idle (no admiral pushes in the way), seeds 1–30. At 12 s the attacking side's
 * flagship and carrier are ordered to board the other side's carrier (one launch each); losses are counted for those two
 * groups only, from the log (point defence: boardLost; fighters: podIntercept), until 45 s.
 */
import { describe, expect, it } from 'vitest';
import { SATURN_12V12, createBattle, order, step } from '../index';
import type { Battle, SideId } from '../types';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEEDS = Number(env.PKG25_SEEDS ?? 6);
const SLOW = 300_000;

interface Row { launched: number; pd: number; fighters: number; mins: number }

function trial(seed: number, att: SideId, opts: { escort: boolean; screen: boolean }): Row {
  const b: Battle = createBattle(SATURN_12V12, seed, { controllers: { player: 'idle', enemy: 'idle' } });
  const def: SideId = att === 'player' ? 'enemy' : 'player';
  const p = att === 'player' ? 'p' : 'e', q = att === 'player' ? 'e' : 'p';
  if (opts.escort) order(b, `${p}6`, { kind: 'fighters', task: 'escort' }, att);
  if (opts.screen) order(b, `${q}6`, { kind: 'fighters', task: 'screen', target: `${q}7` }, def);
  const until = (t: number) => { while (b.t + 1e-9 < t && !b.ended) step(b); };
  until(12);
  const groups = new Set<number>();
  let launched = 0;
  for (const from of [`${p}6`, `${p}7`]) {
    const before = b.boarding?.nextId ?? 1;
    if (order(b, from, { kind: 'board', target: `${q}7` } as never, att)) {
      const g = b.boarding!.pods.find((x) => x.id === before);
      if (g) { groups.add(g.id); launched += g.pods; }
    }
  }
  until(45);
  let pd = 0, fighters = 0;
  for (const e of b.log) {
    if (e.kind === 'boardLost' && groups.has(e.group)) pd += e.pods;
    if (e.kind === 'podIntercept' && groups.has(e.group)) fighters += e.pods;
  }
  return { launched, pd, fighters, mins: 33 / 60 };
}

function table(att: SideId, cases: [string, { escort: boolean; screen: boolean }][]) {
  return cases.map(([name, o]) => {
    const rows = Array.from({ length: SEEDS }, (_, i) => trial(i + 1, att, o));
    const sum = (k: keyof Row) => rows.reduce((n, r) => n + r[k], 0);
    const launched = sum('launched'), pd = sum('pd'), f = sum('fighters');
    return { name, launched, pd, fighters: f, lost: pd + f, frac: (pd + f) / Math.max(1, launched), perMin: (pd + f) / sum('mins') };
  });
}

describe('PKG-25 sim table: pods lost en route', () => {
  it(`with and without an escort wing (${SEEDS} seeds)`, () => {
    const t = table('player', [
      ['PD only, no escort', { escort: false, screen: false }],
      ['PD only, escort wing', { escort: true, screen: false }],
      ['PD + enemy screen, no escort', { escort: false, screen: true }],
      ['PD + enemy screen, escort wing', { escort: true, screen: true }],
    ]);
    const fmt = (x: number) => (Math.round(x * 1000) / 1000).toString();
    console.log(['| case | pods launched | lost to PD | lost to fighters | lost en route | fraction lost |', '|---|---|---|---|---|---|',
      ...t.map((r) => `| ${r.name} | ${r.launched} | ${r.pd} | ${r.fighters} | ${r.lost} | ${fmt(r.frac)} |`)].join('\n'));
    expect(t[1].frac).toBeLessThan(t[0].frac);
    expect(t[3].frac).toBeLessThan(t[2].frac);
    expect(t[2].fighters).toBeGreaterThan(0);
    expect(t[0].fighters).toBe(0);
  }, SLOW);

  it(`EXP-14 step 2 probe: pods at a screened ship are intercepted more per minute (${SEEDS} seeds)`, () => {
    const t = table('enemy', [
      ['unscreened (PD only)', { escort: false, screen: false }],
      ['screened by fighters', { escort: false, screen: true }],
    ]);
    const fmt = (x: number) => (Math.round(x * 100) / 100).toString();
    console.log(['| player carrier | pods launched at it | lost to PD | lost to fighters | intercepted per battle-minute (mean over seeds) |', '|---|---|---|---|---|',
      ...t.map((r) => `| ${r.name} | ${r.launched} | ${r.pd} | ${r.fighters} | ${fmt(r.perMin)} |`)].join('\n'));
    expect(t[1].perMin).toBeGreaterThan(t[0].perMin);
  }, SLOW);
});
