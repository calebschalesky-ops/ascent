/**
 * PKG-20: the new setups at Saturn's rings (saturn-12v12 itself stays in its own file, unchanged). ASSUMED, for Caleb to
 * overrule: fleet mixes (fleets.ts MIX), gaps, roster 1, where and when the waves arrive, the raiders' 4 km gap (hidden
 * in the ice means close), the convoy's four tankers.
 */
import type { BattleSetup } from '../types';
import { TANKERS, ships, side } from './fleets';

const AT = { body: 'saturn', place: 'Saturn’s rings', separationM: 9000, rosterSeed: 1 } as const;

/** EXP-12: 16 against 16, heavy traffic, and six enemy ships arriving by jump at 3:00. */
export const SATURN_16V16_REINFORCED: BattleSetup = {
  ...AT, name: 'saturn-16v16-reinforced',
  player: side('kleisthenes', 16, 'idle'), enemy: side('ganymede', 16, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
  reinforcements: [{
    side: 'enemy', atS: 180, via: 'jump', house: 'House of Callisto', world: 'Jupiter', ships: ships('callisto', 6),
    atM: { x: 5000, z: 7000 },
  }],
};

/** WORLD-03 ref-03: a convoy at the rings, raiders hidden in the ice. */
export const REF_03: BattleSetup = {
  ...AT, name: 'ref-03', place: 'Saturn’s rings, a convoy', separationM: 4000,
  player: side('kleisthenes', 12, 'idle'), enemy: side('callisto', 8, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
  convoy: [{ side: 'player', ships: TANKERS }],
  needs: ['tankers (non-combat ships) for the convoy', 'raiders hidden in the ring ice (no cover terrain in Phase B)'],
};

/** WORLD-03 ref-05: the same convoy; the admiral takes the helm (a policy, not a setup). */
export const REF_05: BattleSetup = { ...REF_03, name: 'ref-05', place: 'Saturn’s rings, the admiral at the helm' };

/** WORLD-03 ref-08: the same convoy, and a war house jumps in at 3:00. */
export const REF_08: BattleSetup = {
  ...REF_03, name: 'ref-08', place: 'Saturn’s rings, a war house jumps in',
  reinforcements: [{
    side: 'enemy', atS: 180, via: 'jump', house: 'House of Ganymede', world: 'Jupiter', ships: ships('ganymede', 6, 10),
    atM: { x: 3000, z: -6000 },
  }],
};
