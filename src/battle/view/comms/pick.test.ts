// PKG-17: which ship a click means. The browser half (40 real-mouse clicks at 1280 and 800 px through the probe's
// screen projection) is shots/pkg-17/clickrate.mjs; this is the rule it relies on.
import { describe, expect, it } from 'vitest';
import { pickNearest } from './pick';
import type { PickCandidate } from './pick';
import { COMMS_UI } from './numbers';

const N = { radius: 30, hullPx: 12 };

describe('pickNearest (PKG-17)', () => {
  it('an escort clicked on its icon beats the big hull behind it that the ray also touches (TRC-03 misses)', () => {
    const c: PickCandidate[] = [
      { id: 'capital', x: 540, y: 330, hit: true, depth: 50 }, // the hull under the pointer, centre 40 px away
      { id: 'escort', x: 502, y: 333, hit: false },
    ];
    expect(pickNearest(c, 503, 333, N)).toBe('escort');
  });

  it('a click on the long flank of a capital, away from any small ship, picks the capital', () => {
    const c: PickCandidate[] = [
      { id: 'capital', x: 600, y: 300, hit: true, depth: 50 },
      { id: 'escort', x: 520, y: 330, hit: false },
    ];
    expect(pickNearest(c, 540, 306, N)).toBe('capital'); // escort centre 30 px away, capital hull counts 12
  });

  it('a far escort (no mesh under the pointer) is picked within the radius, and nothing beyond it', () => {
    const c: PickCandidate[] = [{ id: 'far', x: 100, y: 100, hit: false }];
    expect(pickNearest(c, 120, 115, N)).toBe('far'); // 25 px
    expect(pickNearest(c, 140, 100, N)).toBeNull(); // 40 px
  });

  it('two ships near the pointer: the nearer centre wins, whichever comes first in the list', () => {
    const a: PickCandidate = { id: 'a', x: 200, y: 200, hit: false };
    const b: PickCandidate = { id: 'b', x: 214, y: 200, hit: false };
    expect(pickNearest([a, b], 209, 200, N)).toBe('b');
    expect(pickNearest([b, a], 204, 200, N)).toBe('a');
  });

  it('two hulls under the pointer, both centres far: the nearer hull (by depth) wins', () => {
    const c: PickCandidate[] = [
      { id: 'back', x: 0, y: 0, hit: true, depth: 90 },
      { id: 'front', x: 400, y: 400, hit: true, depth: 20 },
    ];
    expect(pickNearest(c, 200, 200, N)).toBe('front');
  });

  it('the default numbers are the comms UI table (generous: at least 24 px)', () => {
    expect(COMMS_UI.pickRadius).toBeGreaterThanOrEqual(24);
    expect(COMMS_UI.pickHullPx).toBeLessThan(COMMS_UI.pickRadius);
    expect(pickNearest([{ id: 's', x: 0, y: 0, hit: false }], COMMS_UI.pickRadius - 1, 0)).toBe('s');
  });
});
