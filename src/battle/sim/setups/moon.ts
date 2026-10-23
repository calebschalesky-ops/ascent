/**
 * PKG-20: setups at the Moon. The Selenitai rarely fight for themselves (LORE: a Sacred War is the Amphictyony's), so
 * the enemy is the House of the Pythia defending the sanctuary, meant for the Moon admiral style (AI2). ASSUMED, for
 * Caleb to overrule: fleet mixes (fleets.ts MIX), 9 km gap, roster 1.
 */
import type { BattleSetup } from '../types';
import { side } from './fleets';

const AT = { body: 'moon', place: 'The Moon', separationM: 9000, rosterSeed: 1, styles: { enemy: 'moon' } } as const;

/** EXP-15, WORLD-06 (the Moon). */
export const MOON_12V12: BattleSetup = {
  ...AT, name: 'moon-12v12', player: side('kleisthenes', 12, 'idle'), enemy: side('pythia', 12, 'admiral-jupiter'),
};

/** WORLD-03 ref-24: the comms array falls; a By-the-book captain in the line (check 6 makes him a Veteran). */
export const REF_24: BattleSetup = {
  ...AT, name: 'ref-24', place: 'The Moon, the array falls', roster: 'by-the-book',
  player: side('kleisthenes', 12, 'idle'), enemy: side('pythia', 12, 'admiral-jupiter'),
  needs: ['a comms array that can fall (comms package)'],
};
