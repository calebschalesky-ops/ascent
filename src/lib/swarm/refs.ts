/**
 * STAND-INS for code on branches this one does not merge. Every number here is copied from its owner, with the commit
 * it came from, so the swarm reads the same tables as the rest of the game. On merge, delete each block and import
 * from the owner instead; the names are kept the same so only the import lines change.
 *
 *   arsenal       claude/arsenal-33bf3e  ad6576a   lib/tech.ts (drones), lib/munitions.ts (flak, areaFalloff)
 *   fleet-command claude/fleet-command-885c0e 6a0ed07  lib/fleet/types.ts (Order, Side)
 *   destroyer     side-session notes destroyer-hangars.md (2026-10-19), lib/hangars.ts on claude/destroyer-a8ff7d
 *   enemy-ai      claude/enemy-ai-dbbee0 d6c5c91  lib/enemyArms.ts (drone slots, capital ships always carry PD)
 */
import type { V3 } from '../nav';
import type { ShipType } from '../shipTypes';

// ---------- arsenal: lib/tech.ts ----------
/** Arsenal's single drones. A swarm's laser-focus member keeps the id `attack`: it is arsenal's attack drone, flocking. */
export type ArsenalDroneId = 'attack' | 'repair' | 'pointDefence';

/**
 * The player ship's length in world units at arsenal's scale 1 (SHIP 0.18, which is integration's SHIP too). Arsenal
 * writes its ranges in world units; the swarm writes everything in player lengths (L), as fleet-command and the hangar
 * table do. Divide an arsenal distance by this to get L.
 */
export const ARSENAL_L = 0.3708;

/** Arsenal's attack drone (a gun, 6 a shot at 1.2 a second, 60 units) and point-defence drone (25 units, 3 a second, 0.5 kill chance). */
export const ARSENAL_DRONES = {
  attack: { range: 60, rate: 1.2, damage: 6, color: '#ff8a5c' },
  pointDefence: { range: 25, rate: 3, damage: 0.5, color: '#9fd4ff' },
} as const;

// ---------- arsenal: lib/munitions.ts ----------
/** Arsenal's flak burst: 30 explosive damage over 7 units, 2.5 a second, 180 units/s shells with a 4-unit proximity fuse. */
export const FLAK = { damage: 30, area: 7, rate: 2.5, speed: 180, fuse: 4, life: 1.2 } as const;

/** Arsenal's area falloff: full inside the inner third of the radius, then linear to nothing at the edge. */
export function areaFalloff(d: number, radius: number): number {
  if (radius <= 0) return 0;
  const inner = radius / 3;
  if (d <= inner) return 1;
  if (d >= radius) return 0;
  return 1 - (d - inner) / (radius - inner);
}

// ---------- fleet-command: lib/fleet/types.ts ----------
/** 0 is the player's side, 1 is hostile. */
export type Side = 0 | 1;

/**
 * Fleet-command's `Order`, the same union. A swarm takes the order a fleet wing takes, so the command bar and the
 * tactical view can give one to a swarm without knowing it is one.
 */
export type FleetOrder =
  | { kind: 'follow'; leader: number }
  | { kind: 'hold'; at: V3; facing: V3 }
  | { kind: 'attack'; target: number }
  | { kind: 'defend'; ward: number }
  | { kind: 'path'; points: V3[]; loop: boolean; next: number }
  | { kind: 'recall'; carrier: number };

// ---------- destroyer: lib/hangars.ts (merged in integration pass 2) ----------
export { HANGAR_SLOTS } from '../hangars';
import { HANGAR_SLOTS } from '../hangars';
/** Four drones to a slot: a drone is about half a fighter's length and has no cockpit. */
export const DRONES_PER_SLOT = 4;
/** How many swarm drones a hull carries when its whole hangar is drones: cruiser 16, capital 48. */
export const droneCapacity = (hull: ShipType) => HANGAR_SLOTS[hull] * DRONES_PER_SLOT;

// ---------- enemy-ai: lib/enemyArms.ts ----------
/**
 * The guns a hostile ship turns on drones. Enemy-ai rolls each ship's fit (capital ships "always some point defence";
 * flak is weighted 2 on capitals and 1 on cruisers); until that merges, every ship of a type carries this.
 */
export const DEFENCE: Record<ShipType, { pd: number; flak: number }> = {
  capital: { pd: 4, flak: 2 },
  cruiser: { pd: 1, flak: 1 },
  fighter: { pd: 0, flak: 0 },
  destroyer: { pd: 2, flak: 1 }, // integration pass 2: between cruiser and capital, as its fit (flak 1.5, a drone slot)
};
