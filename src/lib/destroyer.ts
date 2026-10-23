/**
 * The destroyer (Caleb, 2026-10-19), and the flight and gun numbers it is measured against. DESTROYER.md has the why.
 *
 *   "between the size of a capital and a cruiser … faster, more maneuverable, and lighter than a capital ship,
 *    obviously with slightly less firepower, but … larger than a cruiser. Faster than a cruiser and more agile than a
 *    cruiser, as well as having superior firepower. The only area a cruiser outclasses a destroyer is in how many
 *    fighters and drones it can hold."
 *
 * Integration pass 2 merged fleet-command and enemy-ai and applied `integration/destroyer/` patches: HULL now reads
 * fleet-command's COMBAT (plus a mass), ENEMY_AI_CLASS is enemy-ai's CLASS and COMMAND_POINTS is fleet-command's, so
 * destroyer.test.ts checks the destroyer against the live tables.
 */
import type { ShipType } from './shipTypes';
import { SHIP_SPECS, SHIP_TYPES } from './shipTypes';
import { COMBAT } from './fleet/spec';
import { COMMAND_POINTS } from './fleet/command';
import { CLASS } from './enemyArms';

/** How a hull flies and fights, in fleet-command's units: lengths in player-ship lengths (L), seconds, radians. */
export interface Hull {
  /** Top speed, L/s. */
  speed: number;
  /** L/s². */
  accel: number;
  /** Turn rate, rad/s. */
  turn: number;
  /** Mass against the cruiser's (the player ship's). */
  mass: number;
  /** Gun range, L. */
  range: number;
  /** Shots per second, per gun. */
  rate: number;
  guns: number;
  damage: number;
  /** How far off the nose a gun can fire, radians. π is a turret. */
  cone: number;
}

/**
 * Capital, cruiser and fighter: fleet-command's COMBAT (claude/fleet-command-885c0e, lib/fleet/spec.ts) as committed,
 * STAND-IN copies. Mass is new: hull volume (size³) times a density, armoured hulls denser.
 * Destroyer: this thread's. Built as a hunter: it gives up hangar space (lib/hangars.ts) and armour for engines and
 * three turrets.
 */
const MASS: Record<ShipType, number> = { capital: 150, cruiser: 1, fighter: 0.01, destroyer: 8 };
export const HULL: Record<ShipType, Hull> = Object.fromEntries(SHIP_TYPES.map((t) => {
  const c = COMBAT[t];
  return [t, { speed: c.speed, accel: c.accel, turn: c.turn, mass: MASS[t], range: c.range, rate: c.rate, guns: c.guns, damage: c.damage, cone: c.cone }];
})) as Record<ShipType, Hull>;

/** Sustained damage per second of a hull's guns. */
export const firepower = (t: ShipType) => HULL[t].guns * HULL[t].rate * HULL[t].damage;

/**
 * Enemy-ai's class table (claude/enemy-ai-dbbee0, lib/enemyArms.ts CLASS), the fields the relations read, STAND-IN
 * copy; its units are world units at arsenal scale 1. The destroyer row is the one its patch adds.
 */
export const ENEMY_AI_CLASS: Record<ShipType, { speed: number; accel: number; turn: number; weapons: number; shieldMul: number }> = CLASS;

/** Enemy-ai's per-class weapon wants for the destroyer: mid-weight guns and rails, no torpedoes (those are capital). */
export const ENEMY_AI_DESTROYER_WEAPON = { pulse: 1.2, plasma: 1.5, ion: 0.8, seeker: 1, swarm: 1, mine: 0, flak: 1.5, beam: 1.5, rail: 2, torpedo: 0 };

/** Fleet-command's command points (lib/fleet/command.ts), STAND-IN, with the destroyer's: between a cruiser and a capital. */
export { COMMAND_POINTS };

/** The size ladder, smallest first: where the destroyer sits. */
export const BY_SIZE = (Object.keys(SHIP_SPECS) as ShipType[]).sort((a, b) => SHIP_SPECS[a].size - SHIP_SPECS[b].size);

/** Class names per nation (PROPOSALS, after LORE.md's peoples; historical fast warships of each culture). */
export const DESTROYER_NAME: Record<string, string> = {
  earth: 'Harrier',
  moon: 'Theoris', // the sacred envoy ship a Greek city sent to Delphi
  mercury: 'Dory', // the hoplite's spear, carried forward of the shield
  venus: 'Chelandion', // the Byzantine fast galley
  mars: 'Liburna', // the light, fast Roman warship
  jupiter: 'Hemiolia', // the fast Hellenistic warship of kings and pirates
  saturn: 'Pentekontor', // the fifty-oared fast ship that came before the trireme
};
