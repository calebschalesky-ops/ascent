/**
 * The forward shield block (mc-controls, R6: right click with a gun slot, Minecraft's blockhitting). While it is held,
 * hits from the front arc lose part of their damage, the capacitor drains instead of refilling, and the gun in hand
 * fires at a slower rate. Tapping it between shots is the skill. Pure, so the arsenal, the tests and the balance
 * simulator (lib/balance/guard.ts) read the same numbers.
 *
 * First numbers, chosen by mc-controls from a sweep in the cruiser duel simulator (lib/balance/guard.ts): rate ×0.5/0.7,
 * reduction 0.4/0.5, drain 40/60/80 per second, uptimes 0.25–1, three skill levels. These are the ones where a practised
 * tapper wins 54–57% of mirror fights, frame-perfect tapping 61–66%, and holding it through every shot about breaks
 * even. GUARD_PROOF in guard.test.ts holds them to that band.
 */
import type { V3 } from './nav';

export const GUARD = {
  /** Share of a front-arc hit's damage the block stops. */
  reduce: 0.4,
  /** The front arc: hits from within this many radians of the nose (60°). */
  arc: Math.PI / 3,
  /**
   * Capacitor drained per second while held (the reactor does not refill it meanwhile): a Mk I's 100 lasts 1.25 s, so
   * the block is tapped, not held, and it competes with the guns for the same energy.
   */
  drain: 80,
  /** A shot fired with the block up waits this much longer for the next (1/0.7); a beam does 0.7 of its damage. */
  rateMul: 0.7,
  /** Below this much energy the block will not go up. */
  minEnergy: 5,
} as const;

/** Whether a hit from direction `from` (unit, from the ship toward where the hit came from) is inside the front arc. */
export function inFrontArc(fwd: V3, from: V3): boolean {
  const d = fwd[0] * from[0] + fwd[1] * from[1] + fwd[2] * from[2];
  const l = Math.hypot(...fwd) * Math.hypot(...from);
  return l > 1e-9 && d / l >= Math.cos(GUARD.arc);
}

/** The damage that gets through a block: the full hit outside the front arc or with the block down. */
export const guarded = (amount: number, up: boolean, fwd: V3, from: V3) => (up && inFrontArc(fwd, from) ? amount * (1 - GUARD.reduce) : amount);

/** One step of the capacitor under the block. Returns the new energy and whether the block stays up. */
export function guardDrain(energy: number, dt: number): { energy: number; up: boolean } {
  const e = Math.max(0, energy - GUARD.drain * dt);
  return { energy: e, up: e > 0 };
}
