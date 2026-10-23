/**
 * Wingmen: the player's bay fighters once launched. Pure steering, so it is unit-tested; components/wingmen.ts draws
 * them and fires their shots.
 *
 * Three behaviours, nothing more:
 * - escort: hold a slot in formation behind and beside the player;
 * - attack: when the player has a target (locked, or the ship last hit), circle it at a stand-off and fire;
 * - return: when recalled, fly back to the player and dock.
 */
import type { V3 } from '../nav';
import { add, cross, dist, len, scale, sub, unit } from '../nav';

export const WING = {
  standoff: 2.5, // units from the target while attacking
  range: 14, // fires inside this distance
  rate: 3, // shots per second
  gunScale: 0.25, // a fighter's guns against the same munition on a cruiser (arsenal's scaleMunition)
  boltSpeed: 260,
  dockDist: 0.3, // docks inside this distance of the player when returning
  minSpeed: 30, // top speed never below this…
  chase: 1.6, // …and otherwise this times the player's speed, plus 10
  gain: 3, // how hard it closes on where it wants to be
  ease: 4, // how fast its velocity eases toward the wanted one (1/s)
};

export type WingState = 'escort' | 'attack' | 'return';

export interface Wing { slot: number; pos: V3; vel: V3; state: WingState; cooldown: number }

export interface WingCtx {
  player: V3;
  playerVel: V3;
  fwd: V3; // the player's nose
  target: V3 | null; // the target the wing should attack
  recall: boolean;
  t: number; // seconds, for the attack circle
}

/** Formation slot `i` relative to the player: alternating right and left, a little behind and above. */
export function formationPoint(i: number, player: V3, fwd: V3): V3 {
  let right = cross(fwd, [0, 1, 0]);
  if (len(right) < 1e-6) right = [1, 0, 0];
  right = unit(right);
  const up = unit(cross(right, fwd));
  const side = (i % 2 === 0 ? 1 : -1) * (0.5 + 0.35 * Math.floor(i / 2));
  return add(add(add(player, scale(right, side)), scale(unit(fwd), -0.5)), scale(up, 0.15));
}

/** Where it attacks from: a point on a slow circle round the target, spread by slot. */
export function attackPoint(i: number, target: V3, t: number): V3 {
  const a = i * 2.1 + t * 0.6;
  return add(target, scale(unit([Math.cos(a), 0.3, Math.sin(a)]), WING.standoff));
}

/** Launch from the player's ship. */
export const launchWing = (slot: number, player: V3, playerVel: V3): Wing => ({ slot, pos: [...player] as V3, vel: [...playerVel] as V3, state: 'escort', cooldown: 0.5 });

/**
 * One step. Returns `fire` (a direction to shoot along, or null) and `docked` (it is home and should be stowed).
 * Mutates the wing.
 */
export function stepWing(w: Wing, c: WingCtx, dt: number): { fire: V3 | null; docked: boolean } {
  w.state = c.recall ? 'return' : c.target ? 'attack' : 'escort';
  const goal = w.state === 'return' ? c.player : w.state === 'attack' ? attackPoint(w.slot, c.target!, c.t) : formationPoint(w.slot, c.player, c.fwd);
  const top = Math.max(WING.minSpeed, len(c.playerVel) * WING.chase + 10);
  const carry = w.state === 'attack' ? ([0, 0, 0] as V3) : c.playerVel; // keep pace with the player, not the target
  let want = add(carry, scale(sub(goal, w.pos), WING.gain * (w.state === 'return' ? 2 : 1)));
  if (len(want) > top) want = scale(unit(want), top);
  const k = Math.min(1, dt * WING.ease * (w.state === 'return' ? 2 : 1));
  w.vel = add(w.vel, scale(sub(want, w.vel), k));
  w.pos = add(w.pos, scale(w.vel, dt));
  if (w.state === 'return' && dist(w.pos, c.player) < WING.dockDist) return { fire: null, docked: true };
  w.cooldown = Math.max(0, w.cooldown - dt);
  if (w.state === 'attack' && w.cooldown <= 0 && dist(w.pos, c.target!) < WING.range) {
    w.cooldown = 1 / WING.rate;
    return { fire: unit(sub(c.target!, w.pos)), docked: false };
  }
  return { fire: null, docked: false };
}
