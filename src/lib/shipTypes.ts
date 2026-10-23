/**
 * Enemy (and Earth) ship types. Caleb, 2026-10-18: a capital ship about five times the player ship, fighters about
 * five times smaller, and cruisers the same ship as the player's. Caleb, 2026-10-19: a destroyer between the cruiser and
 * the capital ship in size, faster and more agile than both, out-gunning the cruiser (DESTROYER.md).
 *
 * Every length here is in player-ship lengths, never world units, so rescaling the player ship carries through.
 * The numbers are a first pass, to be tuned by play.
 */
import { LASER } from './weapons';

// The destroyer is last so code and tests that index the first three types keep working; sort by size where order matters.
export type ShipType = 'capital' | 'cruiser' | 'fighter' | 'destroyer';
export const SHIP_TYPES: ShipType[] = ['capital', 'cruiser', 'fighter', 'destroyer'];

export interface ShipSpec {
  label: string;
  /** Length against the player ship's. */
  size: number;
  hp: number;
  /** How close a shot must pass to hit, in player-ship lengths. */
  hitRadius: number;
  /** Lap speed against the base patrol rate; 0 holds station. */
  patrolSpeed: number;
  /** Its ring's radius against the nation's patrol radius, so the types fly apart. */
  ring: number;
  /** Chance it sidesteps a missile once the homing lets go (0..1). */
  dodge: number;
}

export const SHIP_SPECS: Record<ShipType, ShipSpec> = {
  capital: { label: 'Capital ship', size: 5, hp: 900, hitRadius: 3, patrolSpeed: 0, ring: 1, dodge: 0.03 },
  destroyer: { label: 'Destroyer', size: 2.2, hp: 300, hitRadius: 2.3, patrolSpeed: 1.25, ring: 1.22, dodge: 0.38 },
  cruiser: { label: 'Cruiser', size: 1, hp: 100, hitRadius: 1.9, patrolSpeed: 1, ring: 1.45, dodge: 0.35 },
  fighter: { label: 'Fighter', size: 0.2, hp: 36, hitRadius: 1, patrolSpeed: 1.6, ring: 0.55, dodge: 0.6 },
};

/** A nation's ships, by type. */
export type Force = Record<ShipType, number>;
export const FORCE: Force = { capital: 1, cruiser: 2, fighter: 4, destroyer: 1 };
export const forceSize = (f: Force) => SHIP_TYPES.reduce((s, t) => s + f[t], 0);

/** World hit radius for a type, given the player ship's length in world units. */
export const hitRadius = (t: ShipType, playerLength: number) => SHIP_SPECS[t].hitRadius * playerLength;
/** World length for a type, given the player ship's length in world units. */
export const shipLength = (t: ShipType, playerLength: number) => SHIP_SPECS[t].size * playerLength;

/**
 * World body radius for a type (integration pass 1). `hitRadius` is the whole laser pass distance; the hit tests add
 * each weapon's own reach (LASER.radius, MISSILE.radius) to the ship's body, so the body is the hit radius less the
 * bolt's reach. Laser pass distances therefore equal the table; a missile reaches 0.1 further.
 */
export const bodyRadius = (t: ShipType, playerLength: number) => Math.max(0.05, hitRadius(t, playerLength) - LASER.radius);

/**
 * Craft launched from a ship's bay rather than flying a patrol: one row per new-ship-type thread (NEW-SHIP-TYPES.md).
 * Kept apart from ShipType so that every Record<ShipType, …> in progression, balance and fleet does not need a row
 * for a craft that never patrols. Same fields and units as SHIP_SPECS; each row's own numbers live with its thread.
 */
export type LaunchedType = 'boarder';
export const LAUNCHED_SPECS: Record<LaunchedType, ShipSpec> = {
  // drill-boarder: a capital ship's drill boarding craft (DRILL-BOARDER.md, src/lib/boarding/spec.ts)
  boarder: { label: 'Drill boarder', size: 0.3, hp: 60, hitRadius: 0.9, patrolSpeed: 0, ring: 0, dodge: 0 },
};

/**
 * The infantry carrier (infantry-carrier thread, INFANTRY-CARRIER.md): a slow, armoured troop barge twice the player
 * ship's length, built to land six squads on a ground site once its defences are cleared. Its own row, kept out of
 * `ShipType` and `SHIP_SPECS` so the patrols, `FORCE` and conquest's production tables do not grow a fourth type
 * before the integrator decides how the new hulls join them. Bays, speed and landing in lib/infantry/carrier.ts.
 */
export const INFANTRY_CARRIER: ShipSpec = { label: 'Infantry carrier', size: 2, hp: 320, hitRadius: 2.2, patrolSpeed: 0.6, ring: 1.2, dodge: 0.05 };
