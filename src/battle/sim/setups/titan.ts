/**
 * PKG-20: setups at Titan, Saturn's hazy moon and the Autochthones' home (LORE: Astu on Kraken Mare). ASSUMED, for
 * Caleb to overrule: fleet mixes (fleets.ts MIX), 9 km gap, roster 1, and in titan-haze-12v11 the player is Jupiter's
 * House of Ganymede: the script's enemy is a Saturn house, and two Saturn lines would wear one look (one people, one
 * look), so the player's line could not be told from the enemy's.
 */
import type { BattleSetup } from '../types';
import { HOUSES, side } from './fleets';

const AT = { body: 'titan', place: 'Titan', separationM: 9000, rosterSeed: 1 } as const;
const k = HOUSES.kleisthenes.names;

/** EXP-08 steps 1–7: the edge of Titan's haze, 12 against a Saturn house of 11 with one Fanatic cruiser captain. */
export const TITAN_HAZE_12V11: BattleSetup = {
  ...AT, name: 'titan-haze-12v11', place: 'Titan, the edge of the haze', roster: 'one-fanatic',
  player: side('ganymede', 12, 'idle'), enemy: side('miltiades', 11, 'admiral-jupiter'),
};

/** EXP-13: 14 against 12; one player captain Ambitious at loyalty 52, her ship's house courted by the enemy. */
export const TITAN_14V12_DEFECTOR: BattleSetup = {
  ...AT, name: 'titan-14v12-defector', roster: 'ambitious-52',
  player: side('kleisthenes', 14, 'idle'), enemy: side('ganymede', 12, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
  courted: [{ side: 'player', ships: [k[1]], by: 'enemy' }],
  needs: ['defection when courted (a later package; in Phase B a setup flag only)'],
};

/** WORLD-03 ref-22: a commodore turns: three ships of one squadron, their house courted, under an Ambitious captain. */
export const REF_22: BattleSetup = {
  ...AT, name: 'ref-22', place: 'Titan, a commodore turns', roster: 'ambitious-52',
  player: side('kleisthenes', 14, 'idle'), enemy: side('callisto', 12, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
  courted: [{ side: 'player', ships: k.slice(0, 3), by: 'enemy' }],
  needs: ['defectors firing on their own side (a later package)'],
};
