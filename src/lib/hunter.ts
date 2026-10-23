/**
 * How a hull flies (one step, held to its top speed, acceleration and turn rate from lib/destroyer.ts HULL) and the
 * destroyer's fast-hunter role. Pure, so both are unit-tested and the scene (components/duel.ts) only draws.
 *
 * The hunter, in the spirit of enemy-ai's warship brain (lib/warshipAI.ts on claude/enemy-ai-dbbee0) but for a ship
 * that is faster and more agile than what it hunts:
 *   run    → far from its prey: fly at full speed to where the prey will be
 *   circle → in gun range: orbit the prey at full speed with its turrets on it, on the side away from the prey's
 *            nose, so a fixed-gun cruiser has to out-turn it to shoot back (it cannot: lib/destroyer.ts turn rates)
 *   break  → badly hurt: run straight away at full speed; nothing it hunts can catch it
 * The gunship (cruiser) and battery (capital ship) brains it is measured against are here too, plain on purpose.
 */
import type { V3 } from './nav';
import { add, cross, dot, len, scale, sub, unit } from './nav';
import type { Hull } from './destroyer';
import { intercept } from './weapons';

export interface Mover { pos: V3; vel: V3; fwd: V3; speed: number }

/** Turn unit vector `a` toward unit vector `b` by at most `max` radians. */
export function turnToward(a: V3, b: V3, max: number): V3 {
  const c = Math.max(-1, Math.min(1, dot(a, b)));
  const ang = Math.acos(c);
  if (ang <= max) return b;
  let axis = cross(a, b);
  if (len(axis) < 1e-9) axis = cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  const k = unit(axis);
  // Rodrigues: a·cos + (k×a)·sin + k(k·a)(1 − cos); k·a is 0 here.
  return unit(add(scale(a, Math.cos(max)), scale(cross(k, a), Math.sin(max))));
}

/**
 * One step. The ship flies where it points: its nose turns toward `want` at its turn rate, its speed goes toward
 * |want| (at most its top speed) at its acceleration. `L` turns the hull's ship lengths into world units.
 */
export function fly(m: Mover, want: V3, h: Hull, L: number, dt: number): Mover {
  const wantSpeed = Math.min(len(want), h.speed * L);
  const fwd = wantSpeed > 1e-6 ? turnToward(m.fwd, unit(want), h.turn * dt) : m.fwd;
  const dv = h.accel * L * dt;
  const speed = m.speed < wantSpeed ? Math.min(wantSpeed, m.speed + dv) : Math.max(wantSpeed, m.speed - dv);
  const vel = scale(fwd, speed);
  return { pos: add(m.pos, scale(vel, dt)), vel, fwd, speed };
}

export type HunterMode = 'run' | 'circle' | 'break';
export interface Prey { pos: V3; vel: V3; fwd: V3; cone: number }
export interface HunterOrder { mode: HunterMode; want: V3 }

export const HUNTER = {
  /** Orbit radius, × its gun range. */
  circle: 0.55,
  /** It starts circling inside this × its gun range, and runs in again outside 1.3 × it. */
  closeIn: 1.1,
  /** Below this share of its hit points it breaks off. */
  breakAt: 0.2,
};

export function hunterThink(me: Mover, hpFrac: number, prey: Prey, range: number, h: Hull, L: number, mode: HunterMode): HunterOrder {
  const top = h.speed * L;
  const toP = sub(prey.pos, me.pos);
  const d = len(toP);
  if (hpFrac < HUNTER.breakAt || mode === 'break') return { mode: 'break', want: scale(unit(scale(toP, -1)), top) };
  if (mode === 'run' ? d > range * HUNTER.closeIn : d > range * 1.3) {
    const hit = intercept(me.pos, top, prey.pos, prey.vel);
    return { mode: 'run', want: scale(unit(sub(hit ? hit.point : prey.pos, me.pos)), top) };
  }
  // Circle: tangent round the prey, the sense that carries it away from the prey's nose, plus a pull to the radius.
  const out = unit(scale(toP, -1)); // from the prey to me
  const up = unit(cross(prey.fwd, out));
  let tangent = unit(cross(len(up) > 1e-6 ? up : [0, 1, 0], out));
  // In front of the prey's nose: go the way that leaves the nose fastest.
  if (dot(tangent, prey.fwd) > 0) tangent = scale(tangent, -1);
  const r = range * HUNTER.circle;
  // Down the prey's gun line, no pull outward (that would hold it there): only the tangent, out of the cone.
  const inCone = dot(out, prey.fwd) > Math.cos(prey.cone * 2);
  const radial = inCone ? ([0, 0, 0] as V3) : scale(out, (r - d) / Math.max(r, 1e-6));
  return { mode: 'circle', want: scale(unit(add(tangent, scale(radial, 1.5))), top) };
}

/** A fixed-gun cruiser: point at the lead, close to 60% of its range, hold there. */
export function gunshipThink(me: Mover, prey: Prey, range: number, boltSpeed: number, h: Hull, L: number): { want: V3; aim: V3 } {
  const hit = intercept(me.pos, boltSpeed, prey.pos, prey.vel);
  const aim = unit(sub(hit ? hit.point : prey.pos, me.pos));
  const d = len(sub(prey.pos, me.pos));
  const speed = d > range * 0.6 ? h.speed * L : Math.max(h.speed * L * 0.15, len(prey.vel));
  return { want: scale(aim, speed), aim };
}

/** Whether a gun pointing along `fwd` with `cone` can bear on `dir` (both unit). */
export const bears = (fwd: V3, dir: V3, cone: number) => cone >= Math.PI - 1e-9 || Math.acos(Math.max(-1, Math.min(1, dot(fwd, dir)))) <= cone;
