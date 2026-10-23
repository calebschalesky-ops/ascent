import { describe, expect, it } from 'vitest';
import { conquestReport } from './conquest';

describe('conquest balance', () => {
  it('runs every world against a level-1 pilot and meets the bands', async () => {
    const rep = conquestReport();
    // CONQUEST_OUT=path also writes the markdown there (node only).
    const out = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CONQUEST_OUT;
    if (out) {
      const fs = 'node:fs';
      const { writeFileSync } = (await import(/* @vite-ignore */ fs)) as { writeFileSync: (p: string, s: string) => void };
      writeFileSync(out, rep.markdown + '\n');
    }
    console.log(rep.markdown);
    for (const r of rep.rows) {
      expect(r.after, r.world).toBe(0);
      if (r.helium !== null) expect(r.helium, r.world).toBe(0);
    }
    expect(rep.flags).toEqual([]);
  }, 300_000);
});
