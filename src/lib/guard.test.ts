import { describe, expect, it } from 'vitest';
import { GUARD, guardDrain, guarded, inFrontArc } from './guard';
import { LOCK, noLock, stepDrawnLock } from './weapons';
import { duelGuard } from './balance/guard';
import { enemyCruiser, startCruiser } from './balance/cruisers';
import { NATIONS } from './nations';
import { rng } from './balance/rng';

describe('forward shield block', () => {
  it('cuts front-arc hits only, and only while up', () => {
    const fwd: [number, number, number] = [0, 0, -1];
    expect(inFrontArc(fwd, [0, 0, -1])).toBe(true);
    expect(inFrontArc(fwd, [Math.sin(1), 0, -Math.cos(1)])).toBe(true); // 57°
    expect(inFrontArc(fwd, [Math.sin(1.1), 0, -Math.cos(1.1)])).toBe(false); // 63°
    expect(inFrontArc(fwd, [0, 0, 1])).toBe(false);
    expect(guarded(100, true, fwd, [0, 0, -1])).toBeCloseTo(100 * (1 - GUARD.reduce), 9);
    expect(guarded(100, true, fwd, [0, 0, 1])).toBe(100);
    expect(guarded(100, false, fwd, [0, 0, -1])).toBe(100);
  });
  it('drains the capacitor and drops when it is empty', () => {
    let e = 100;
    let t = 0;
    let up = true;
    while (up) { const g = guardDrain(e, 0.05); e = g.energy; up = g.up; t += 0.05; }
    expect(t).toBeCloseTo(100 / GUARD.drain, 1);
  });
});

describe('bow-draw lock', () => {
  it('builds only while drawn, and lets go when the draw stops', () => {
    const s = noLock();
    for (let i = 0; i < 20; i++) stepDrawnLock(s, 7, false, false, 0.1); // reticle on ship 7, not drawn
    expect(s.progress).toBe(0);
    for (let i = 0; i < 10; i++) stepDrawnLock(s, 7, false, true, 0.1);
    expect(s.progress).toBeCloseTo(1 / LOCK.time, 6);
    expect(s.locked).toBe(false);
    for (let i = 0; i < 6; i++) stepDrawnLock(s, 7, true, true, 0.1);
    expect(s.locked).toBe(true);
    stepDrawnLock(s, 7, true, true, 0.1); // held while drawn and on target
    expect(s.locked).toBe(true);
    stepDrawnLock(s, 7, true, false, 0.1); // released without loosing: the lock lets go
    expect(s.locked).toBe(false);
  });
});

/**
 * GUARD_PROOF: the block in the cruiser duel simulator (lib/balance/guard.ts). Earth's level-1 start cruiser blocking
 * for a share of each second against the same ship never blocking. The band: worth it for a practised player (skill
 * 0.5 beats not blocking), never a win button (frame-perfect tapping stays near the 65% cruiser band of report 1;
 * 68% allowed for the noise of 400 fights), and holding it through every shot is no better than not blocking by much.
 */
describe('shield block in the duel simulator', () => {
  const RUNS = 400;
  const mirror = (uptime: number, skill: number) => {
    const r = rng(41);
    let w = 0;
    for (let i = 0; i < RUNS; i++) w += duelGuard(startCruiser('earth'), startCruiser('earth'), r, uptime, 0.8, skill);
    return w / RUNS;
  };
  it('is worth tapping and is not a win button', () => {
    const none = mirror(0, 0);
    const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
    const rows = [0.25, 0.5, 0.75].map((u) => ({ u, lazy: mirror(u, 0), practised: mirror(u, 0.5), perfect: mirror(u, 1) }));
    console.log(`GUARD_PROOF mirror, no block ${pct(none)}; uptime: lazy / practised / perfect →`, rows.map((x) => `${x.u}: ${pct(x.lazy)} / ${pct(x.practised)} / ${pct(x.perfect)}`).join(' · '));
    expect(none).toBeGreaterThan(0.4);
    expect(none).toBeLessThan(0.6);
    expect(Math.max(...rows.map((x) => x.practised))).toBeGreaterThan(none);
    expect(Math.max(...rows.map((x) => x.perfect))).toBeLessThanOrEqual(0.68);
    expect(Math.max(...rows.map((x) => x.lazy))).toBeLessThan(0.62);
  });
  it('against every race at level 1', () => {
    const r = rng(43);
    const line: string[] = [];
    for (const n of NATIONS) {
      let w0 = 0, w1 = 0;
      for (let i = 0; i < 100; i++) {
        w0 += duelGuard(startCruiser('earth'), enemyCruiser(n.id, i % 8), r, 0);
        w1 += duelGuard(startCruiser('earth'), enemyCruiser(n.id, i % 8), r, 0.5, 0.8, 0.5);
      }
      line.push(`${n.id} ${w0}%→${w1}%`);
      expect(w1 - w0).toBeLessThan(25); // never a swing of more than a quarter of the fights
    }
    console.log('GUARD_PROOF Earth start cruiser vs level-1 enemy cruisers, no block → practised block at uptime 0.5:', line.join(' · '));
  });
});
