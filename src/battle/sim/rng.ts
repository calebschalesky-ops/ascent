/**
 * The battle's one seeded RNG: the only randomness anywhere under src/battle/sim/. State is a plain object on the
 * battle, so it round-trips through JSON and a resumed battle draws the same numbers. Mulberry32; `n` counts draws.
 */
export interface Rng { s: number; n: number }

export function makeRng(seed: number): Rng {
  return { s: (Math.imul(seed | 0, 0x9e3779b1) ^ 0x6a09e667) >>> 0, n: 0 };
}

/** A uniform draw in [0, 1). */
export function draw(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  r.n++;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** An integer in [lo, hi]. */
export const drawInt = (r: Rng, lo: number, hi: number) => lo + Math.floor(draw(r) * (hi - lo + 1));

export function drawPick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(draw(r) * items.length)];
}
