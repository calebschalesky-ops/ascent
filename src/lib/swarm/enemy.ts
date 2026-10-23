/**
 * Hostile swarms: what each hostile hull launches, and when. Enemy-ai (claude/enemy-ai-dbbee0) decides when a nation
 * fights (its `alertRange`, `provokeNation`, `disengageRange` and `calmTime` knobs) and rolls each ship's fit (drone
 * slots by class: capital 2, cruiser 1, fighter 0). Until it merges, this follows the same rules with its own copies.
 */
import type { ShipType } from '../shipTypes';
import type { SwarmRole } from './roles';
import { droneCapacity } from './refs';

/**
 * A hostile hull's hangar, all drones. A capital ship screens itself and sends a pack: a third shield drones, the rest
 * explosive. A cruiser sends laser-focus drones. Fighters carry none.
 */
export function hostileHangar(t: ShipType): Partial<Record<SwarmRole, number>> {
  const n = droneCapacity(t);
  if (t === 'capital') return { shield: Math.round(n / 3), explosive: n - Math.round(n / 3) };
  if (t === 'cruiser') return { attack: n };
  return {};
}

/** When a hostile nation's carriers launch and recall, in player lengths and seconds (enemy-ai's knobs × 2.7 L/unit). */
export const HOSTILE = {
  /** Launch when the player comes this close to the carrier... */
  alertRange: 160,
  /** ...or when the carrier's nation has been hit. */
  provokeNation: true,
  /** Recall once the player has been this far from the carrier for `calmTime`. */
  disengageRange: 600,
  calmTime: 8,
};

export interface HostileWatch { provoked: boolean; calm: number }

/** One step of a hostile carrier's watch: should its swarms be out? */
export function hostileWants(w: HostileWatch, playerDist: number, nationHit: boolean, L: number, dt: number): boolean {
  if (playerDist < HOSTILE.alertRange * L || (HOSTILE.provokeNation && nationHit)) { w.provoked = true; w.calm = 0; }
  if (w.provoked && playerDist > HOSTILE.disengageRange * L) {
    w.calm += dt;
    if (w.calm > HOSTILE.calmTime) w.provoked = false;
  } else w.calm = 0;
  return w.provoked;
}
