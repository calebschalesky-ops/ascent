import { describe, expect, it } from 'vitest';
import { battle, many } from './battle';
import { DEFAULT_ENGAGE, engage, engageMany } from './engage';
import { balanceReport } from './report';
import { rng } from './rng';

describe('balance simulator', () => {
  it('is repeatable for a seed', () => {
    expect(engage('cruiser', 'laser', rng(7))).toEqual(engage('cruiser', 'laser', rng(7)));
  });

  it('agrees with the in-game proofs: 9 laser hits kill a cruiser, 3 a fighter, 15 missiles a capital ship', () => {
    const perfect = { ...DEFAULT_ENGAGE, aimError: 0, range: 20 };
    expect(engage('cruiser', 'laser', rng(1), perfect)).toMatchObject({ killed: true, hits: 9 });
    expect(engage('fighter', 'laser', rng(1), perfect)).toMatchObject({ killed: true, hits: 3 });
    const cap = engageMany('capital', 'missile', 20, rng(2), { ...perfect, range: 40 });
    expect(cap.killRate).toBe(1);
    expect(cap.hitRate).toBeGreaterThan(0.9); // 3% dodge
  });

  it('a mirror fight is a coin toss when both sides are the same', () => {
    const hits = { laser: { capital: 0.9, cruiser: 0.6, fighter: 0.3, destroyer: 0.7 }, missile: { capital: 0.95, cruiser: 0.6, fighter: 0.4, destroyer: 0.6 } };
    const r = rng(3);
    let a = 0;
    for (let i = 0; i < 400; i++) if (battle(many('cruiser', 3), many('cruiser', 3), hits, r).winner === 'A') a++;
    expect(a / 400).toBeGreaterThan(0.4);
    expect(a / 400).toBeLessThan(0.6);
  });

  it('writes the report', async () => {
    const rep = balanceReport();
    for (const rows of Object.values(rep.engage)) for (const e of rows) {
      expect(e.killRate).toBeGreaterThanOrEqual(0);
      expect(e.hitRate).toBeLessThanOrEqual(1);
    }
    // BALANCE_OUT=path also writes the markdown there (node only; the app's tsconfig carries no node types).
    const out = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BALANCE_OUT;
    if (out) {
      const fs = 'node:fs';
      const { writeFileSync } = (await import(/* @vite-ignore */ fs)) as { writeFileSync: (p: string, s: string) => void };
      writeFileSync(out, rep.markdown + '\n');
    }
    console.log(rep.markdown);
  }, 120_000);
});

describe('race cruisers (integration pass 2)', () => {
  it('runs the round robin with arsenal applyHit and prints it', async () => {
    const { roundRobin, cruiserMarkdown } = await import('./cruisers');
    const rr = [roundRobin('start'), roundRobin('enemy')];
    for (const r of rr) for (const x of r.rows) { expect(x.mean).toBeGreaterThanOrEqual(0); expect(x.mean).toBeLessThanOrEqual(1); }
    const md = cruiserMarkdown(rr);
    console.log(md);
    const out = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BALANCE_OUT;
    if (out) {
      const fs = 'node:fs';
      const { appendFileSync } = (await import(/* @vite-ignore */ fs)) as { appendFileSync: (p: string, s: string) => void };
      appendFileSync(out, '\n' + md);
    }
  }, 300000);
});
