/**
 * Every id and name progression borrows from another branch, in one file, so each merge is a swap here and nowhere
 * else. Anything marked PLACEHOLDER waits on that branch:
 *
 * - races (claude/races-fe3f3b): race names and demonyms below are copied from its uncommitted draft
 *   (src/lib/races.ts, LORE.md, 2026-10-18). Ship class names are PLACEHOLDERS drawn from LORE.md's ship
 *   descriptions; races has not named classes yet.
 * - arsenal: merged (integration pass 2). Every module maps to arsenal's real id (ARSENAL_ID), and the fit flies as
 *   arsenal's loadout (progress.ts flightLoadout).
 * - ship types: merged (integration pass 1). ShipType and SHIP_TYPES come from src/lib/shipTypes.ts, and every
 *   craft carries its type, so a kill pays by type.
 */
import { DESTROYER_NAME } from '../destroyer';
import type { NationId } from '../nations';

import type { ShipType } from '../shipTypes';
export type { ShipType } from '../shipTypes';
export { SHIP_TYPES } from '../shipTypes';

/** A craft from combat.ts. Main has no `type`; ship types adds one. */
export const craftType = (c: object): ShipType => (c as { type?: ShipType }).type ?? 'cruiser';

export interface RaceRef {
  nation: NationId;
  race: string; // the people
  demonym: string; // one of them
  ships: Record<ShipType, string>; // class names
  /** One line on how its ships look and fight, from LORE.md, which the loadouts follow. */
  doctrine: string;
}

/** Order is the start screen's. Earth first: it is the default and the old saves' nation. */
export const RACE_REFS: RaceRef[] = [
  { nation: 'earth', race: 'Humans', demonym: 'Human', // races keeps Earth human; class names PLACEHOLDER
    ships: { capital: 'Metropolis', cruiser: 'Pathfinder', fighter: 'Sparrow', destroyer: DESTROYER_NAME.earth },
    doctrine: 'The mother city: the largest navy, a little of everything, nothing exotic.' },
  { nation: 'moon', race: 'Selenitai', demonym: 'Selenite',
    ships: { capital: 'Treasury', cruiser: 'Lamp', fighter: 'Needle', destroyer: DESTROYER_NAME.moon }, // PLACEHOLDER class names
    doctrine: 'Scholars of the Archive. Long, bright ships of mirrors: lasers, drones and jamming.' },
  { nation: 'mercury', race: 'Hemerodromoi', demonym: 'Hemerodrome',
    ships: { capital: 'Hoplon', cruiser: 'Wedge', fighter: 'Aspis', destroyer: DESTROYER_NAME.mercury }, // PLACEHOLDER
    doctrine: 'Spartan day-runners. Shield-first, sun-facing ships flown in phalanx: heat shields and guns.' },
  { nation: 'venus', race: 'Nephelai', demonym: 'Nephelan',
    ships: { capital: 'Palatine', cruiser: 'Dromon', fighter: 'Jewel', destroyer: DESTROYER_NAME.venus }, // PLACEHOLDER
    doctrine: 'A Byzantine cloud court. Ornate ships that fear falling: shields, flares, fire and intrigue.' },
  { nation: 'mars', race: 'Quirites', demonym: 'Quirite',
    ships: { capital: 'Rostrata', cruiser: 'Corvus', fighter: 'Velite', destroyer: DESTROYER_NAME.mars }, // PLACEHOLDER
    doctrine: 'Roman legions. Standard, armoured, built in numbers: autocannons, plate and fire control.' },
  { nation: 'jupiter', race: 'Diadochoi', demonym: 'Diadoch',
    ships: { capital: 'Tessarakonteres', cruiser: 'Sarissa', fighter: 'Hetairos', destroyer: DESTROYER_NAME.jupiter }, // PLACEHOLDER
    doctrine: 'Successor kings. Huge proud hulls with spinal railguns; companion fighters armed to the teeth.' },
  { nation: 'saturn', race: 'Autochthones', demonym: 'Autochthon',
    ships: { capital: 'Trireme', cruiser: 'Raider', fighter: 'Glider', destroyer: DESTROYER_NAME.saturn }, // PLACEHOLDER
    doctrine: 'A far democracy. Spare long-range raiders: railguns, mines, jamming and repair for the long trip.' },
];

export const raceRef = (n: NationId): RaceRef => RACE_REFS.find((r) => r.nation === n) ?? RACE_REFS[0];

/**
 * Progression's module id → arsenal's id. Munitions and shields are arsenal's real ids (claude/arsenal-33bf3e,
 * 49536e2: src/lib/munitions.ts MunitionId, src/lib/shields.ts ShieldId), so those rows are the identity. Armour,
 * drones, countermeasures and the targeting computer are PLACEHOLDERS: arsenal describes them (RESEARCH-ARSENAL.md,
 * tech.ts and modules.ts) but has not committed their ids.
 */
export const ARSENAL_ID = {
  // munitions.ts MunitionId
  pulse: 'pulse', beam: 'beam', plasma: 'plasma', rail: 'rail', flak: 'flak',
  seeker: 'seeker', torpedo: 'torpedo', swarm: 'swarm', ion: 'ion', mine: 'mine',
  // shields.ts ShieldId
  deflector: 'deflector', bifacet: 'bifacet', capacitor: 'capacitor', hardened: 'hardened',
  // arsenal's modules.ts ids (merged in integration pass 2): armour Mk I/II, drones, countermeasures, targeting Mk II
  armour: 'armour-1',
  plate: 'armour-2',
  droneRepair: 'repair',
  droneAttack: 'attack',
  dronePD: 'pointDefence',
  flares: 'flare',
  chaff: 'chaff',
  jammer: 'jammer',
  fireControl: 'targeting-2',
} as const;

export type ModuleId = keyof typeof ARSENAL_ID;

/**
 * Which of main's two weapons a munition fires as, until arsenal's munitions fly in combat.ts. PLACEHOLDER behaviour:
 * bolts and beams fire as the laser, missiles and mines as the missile.
 */
export const ENGINE_WEAPON: Partial<Record<ModuleId, 'laser' | 'missile'>> = {
  pulse: 'laser', beam: 'laser', plasma: 'laser', rail: 'laser', flak: 'laser', ion: 'laser',
  seeker: 'missile', torpedo: 'missile', swarm: 'missile', mine: 'missile',
};
