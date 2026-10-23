/**
 * Stances (mc-controls, R8): with a target picked (middle click), R flies the ship for you: approach it and stop at a
 * distance, orbit it at a distance, or keep at a distance from it. Hold R and scroll to set the distance. Meanwhile
 * the mouse swings the guns within the gun arc instead of turning the ship; any thrust key, the throttle or X hands the
 * ship back. Pure, unit-tested: the steering law gives the way to point the nose and the speed to fly at.
 */
import type { V3 } from '../../lib/nav';
import { add, cross, dot, len, scale, sub, unit } from '../../lib/nav';

export type Stance = 'approach' | 'orbit' | 'range';
export const STANCE_ORDER: (Stance | null)[] = ['approach', 'orbit', 'range', null];
export const STANCE_LABEL: Record<Stance, string> = { approach: 'Approach', orbit: 'Orbit', range: 'Keep at range' };

export const STANCE = {
  /** Closing speed per unit of distance still to go (1/s): the ship slows as it nears its distance. */
  gain: 0.6,
  /** Orbit: the speed round the target, as a fraction of the distance per second (an orbit takes about 25 s). */
  orbitRate: 0.25,
  /** The orbit's speed round the target is held between these (units/s). */
  orbitMin: 4,
  orbitMax: 2000, // ×5 since scale-jump-danger made the worlds 5× bigger against the ships (2026-10-21): a body orbit keeps its pace
  /** Hold R and scroll: each notch sets the distance this much nearer or further. */
  notch: 1.15,
  /** A tap of R (not a hold for scrolling) is shorter than this (seconds). */
  tap: 0.35,
} as const;

/** R tapped: approach → orbit → keep at range → off. */
export const nextStance = (s: Stance | null): Stance | null => STANCE_ORDER[(STANCE_ORDER.indexOf(s) + 1) % STANCE_ORDER.length];

/** Hold R and scroll: down the wheel is further, up is nearer. */
export const scrollDistance = (d: number, deltaY: number, min: number, max: number) =>
  Math.max(min, Math.min(max, deltaY > 0 ? d * STANCE.notch : deltaY < 0 ? d / STANCE.notch : d));

export interface StanceSteer { dir: V3; speed: number }

/**
 * Where to point and how fast to fly for `stance` at distance `d` from a target at `tPos` moving at `tVel`, for a ship
 * at `pos` with nose `fwd`. The velocity wanted is the target's own plus a closing term (and, in orbit, a turn round
 * it); the nose is pointed along it. When nothing is wanted but to sit still, the nose faces the target.
 */
export function stanceSteer(stance: Stance, pos: V3, fwd: V3, tPos: V3, tVel: V3, d: number, up: V3 = [0, 1, 0]): StanceSteer {
  const rel = sub(tPos, pos);
  const dist = len(rel);
  const toT = dist > 1e-9 ? scale(rel, 1 / dist) : fwd;
  let close = (dist - d) * STANCE.gain; // + toward the target
  if (stance === 'approach') close = Math.max(0, close); // approach never backs off
  let want: V3 = add(tVel, scale(toT, close));
  if (stance === 'orbit') {
    let side = cross(toT, up);
    if (len(side) < 1e-6) side = cross(toT, [1, 0, 0]);
    side = unit(side);
    // Keep going round the way the ship already is.
    if (dot(side, fwd) < 0) side = scale(side, -1);
    const v = Math.max(STANCE.orbitMin, Math.min(STANCE.orbitMax, d * STANCE.orbitRate));
    want = add(want, scale(side, v));
  }
  const speed = len(want);
  if (speed < 0.05) return { dir: toT, speed: 0 };
  return { dir: scale(want, 1 / speed), speed };
}

/** The aim held within `max` radians of the nose: under a stance the mouse swings the guns, not the ship. */
export function clampCone(dir: V3, axis: V3, max: number): V3 {
  const a = unit(axis);
  const v = unit(dir);
  const c = Math.max(-1, Math.min(1, dot(a, v)));
  const ang = Math.acos(c);
  if (ang <= max) return v;
  let perp = sub(v, scale(a, c));
  if (len(perp) < 1e-9) perp = Math.abs(a[1]) < 0.9 ? cross(a, [0, 1, 0]) : cross(a, [1, 0, 0]);
  return unit(add(scale(a, Math.cos(max)), scale(unit(perp), Math.sin(max))));
}
