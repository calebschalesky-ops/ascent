/**
 * What his side knows of the enemy's shields (VISION §7a "Seeing is not knowing"), and the four shield arcs the tactical
 * view draws per ship. Pure: reads the sim's `Battle` and its log, no DOM, no three.js.
 *
 * His own ships: the true strength of each side (it is his own engineering report). Enemy ships: only what his ships saw
 * land. A hit his gunners saw splash on a shield says the side is up; a hit they saw go through to the hull says it is
 * down, and it stays down in his picture until one of his hits is seen to splash on it again. A side nobody of his has
 * hit is unknown. The enemy's true `shields`, `open` and `split` are never read for an enemy ship.
 */
import type { Battle, ShieldSide, SideId } from '../../sim/index';
import { SHIELD_SIDES } from '../../sim/index';
import { TAC } from './numbers';

export type Seen = 'unknown' | 'up' | 'down';

export interface SideIntel { state: Seen; t: number }

export interface Intel {
  /** Log events read so far, counted across the cap (event i is logDropped + i). */
  seen: number;
  ships: Record<string, Record<ShieldSide, SideIntel>>;
}

export const createIntel = (): Intel => ({ seen: -1, ships: {} });

const blank = (): Record<ShieldSide, SideIntel> => ({
  fore: { state: 'unknown', t: -1 }, aft: { state: 'unknown', t: -1 }, port: { state: 'unknown', t: -1 }, starboard: { state: 'unknown', t: -1 },
});

/** Read the log since last time: every hit `side`'s ships saw land on an enemy. Call once per step (or more often). */
export function readIntel(intel: Intel, b: Battle, side: SideId): void {
  const total = b.logDropped + b.log.length;
  if (intel.seen < 0) intel.seen = b.logDropped; // a fresh battle: read it from the start of what is kept
  const fresh = Math.min(total - intel.seen, b.log.length);
  const sideOf = new Map(b.ships.map((s) => [s.id, s.side]));
  for (let i = b.log.length - fresh; i < b.log.length; i++) {
    const e = b.log[i];
    if (e.kind !== 'shot' || !e.hit || e.pd?.stopped) continue;
    if (sideOf.get(e.ship) !== side || sideOf.get(e.target) === side) continue;
    const k = (intel.ships[e.target] ??= blank());
    if (e.hullDmg > 0) k[e.side] = { state: 'down', t: e.t };
    else if (e.shieldDmg > 0) k[e.side] = { state: 'up', t: e.t };
  }
  intel.seen = total;
}

export interface Arc {
  side: ShieldSide;
  state: Seen;
  /** His own ships: the side's charge as a fraction of its max (0..1). Enemy ships: null, he does not know it. */
  level: number | null;
  /** His own ships: the power split on that side (drawn as weight). Enemy ships: the even 0.25. */
  weight: number;
  /** Enemy ships: seconds since the side was last seen; null when never seen or for his own ships. */
  age: number | null;
  /** Drawing opacity: 1 for his own; fades with age for what was seen of an enemy. */
  alpha: number;
}

/** The four arcs per ship in the field, as the player is allowed to see them. */
export function shieldArcs(b: Battle, side: SideId, intel: Intel): Record<string, Arc[]> {
  const out: Record<string, Arc[]> = {};
  for (const s of b.ships) {
    if (s.status !== 'active' && s.status !== 'broken') continue;
    if (s.side === side) {
      out[s.id] = SHIELD_SIDES.map((f) => {
        const max = s.shieldTotal * s.split[f];
        return { side: f, state: s.open[f] ? 'down' : 'up', level: max > 0 ? Math.max(0, Math.min(1, s.shields[f] / max)) : 0, weight: s.split[f], age: null, alpha: 1 };
      });
    } else {
      const k = intel.ships[s.id];
      out[s.id] = SHIELD_SIDES.map((f) => {
        const seen = k?.[f];
        if (!seen || seen.state === 'unknown') return { side: f, state: 'unknown' as Seen, level: null, weight: 0.25, age: null, alpha: 0.55 };
        const age = Math.max(0, b.t - seen.t);
        const alpha = seen.state === 'down' ? 1 : Math.max(TAC.staleFloor, 1 - (1 - TAC.staleFloor) * Math.min(1, age / TAC.staleS));
        return { side: f, state: seen.state, level: null, weight: 0.25, age: Math.round(age * 10) / 10, alpha };
      });
    }
  }
  return out;
}
