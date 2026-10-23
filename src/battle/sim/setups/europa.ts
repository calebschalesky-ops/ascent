/**
 * PKG-20: setups at Europa, Jupiter's ice moon (LORE: the Third Crown station mines its ice, and the two Jupiter houses
 * fight over it). The player is Saturn's House of Kleisthenes throughout. ASSUMED, for Caleb to overrule: fleet mixes
 * (fleets.ts MIX), 9 km opening gap, roster 1, the wing offsets.
 */
import type { BattleSetup } from '../types';
import { HOUSES, side } from './fleets';

const AT = { body: 'europa', place: 'Europa', separationM: 9000, rosterSeed: 1 } as const;

/** EXP-07: open space, 12 against 11, no Fanatic in the enemy line. */
export const EUROPA_12V11: BattleSetup = {
  ...AT, name: 'europa-12v11', place: 'Europa, open space', roster: 'no-fanatic',
  player: side('kleisthenes', 12, 'idle'), enemy: side('ganymede', 11, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
};

/** EXP-14, EXP-15 (Jupiter), and EXP-11 with `+pushback-mix`: an even line, the player's carrier in it. */
export const EUROPA_12V12: BattleSetup = {
  ...AT, name: 'europa-12v12',
  player: side('kleisthenes', 12, 'idle'), enemy: side('ganymede', 12, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
  needs: ['fighter wings on the carrier (F1)'],
};

const g = HOUSES.ganymede.names;
/** EXP-09, WORLD-04: the enemy's 12 in three wings of four, one Fanatic captain among them. */
export const EUROPA_12V12_WINGS: BattleSetup = {
  ...AT, name: 'europa-12v12-wings', roster: 'one-fanatic',
  player: side('kleisthenes', 12, 'idle'), enemy: side('ganymede', 12, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
  wings: [
    { side: 'enemy', name: 'north wing', ships: g.slice(0, 4), offset: { x: 1800, z: -1800 } },
    { side: 'enemy', name: 'centre', ships: g.slice(4, 8), offset: { x: 0, z: 0 } },
    { side: 'enemy', name: 'south wing', ships: g.slice(8, 12), offset: { x: -1200, z: 1800 } },
  ],
};

/** WORLD-03 ref-11: an even line, and a Glory-hound in it who will defy. */
export const REF_11: BattleSetup = {
  ...AT, name: 'ref-11', place: 'Europa, an even line', roster: 'glory-hound',
  player: side('kleisthenes', 12, 'idle'), enemy: side('callisto', 12, 'admiral-jupiter'), styles: { enemy: 'jupiter' },
};
