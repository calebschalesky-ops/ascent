/**
 * PKG-20: setups at Mercury. The enemy is the Hemerodromoi's House of Agis, meant for the Mercury admiral style (AI2).
 * ASSUMED, for Caleb to overrule: fleet mixes (fleets.ts MIX), 9 km gap, roster 1.
 */
import type { BattleSetup } from '../types';
import { side } from './fleets';

const AT = { body: 'mercury', place: 'Mercury', separationM: 9000, rosterSeed: 1, styles: { enemy: 'mercury' } } as const;

/** EXP-15, WORLD-06 (Mercury). */
export const MERCURY_12V12: BattleSetup = {
  ...AT, name: 'mercury-12v12', player: side('kleisthenes', 12, 'idle'), enemy: side('agis', 12, 'admiral-jupiter'),
};

/** WORLD-03 ref-28: a Fanatic's ship: one Fanatic cruiser captain in the enemy line. */
export const REF_28: BattleSetup = {
  ...AT, name: 'ref-28', place: 'Mercury, a Fanatic’s ship', roster: 'one-fanatic',
  player: side('kleisthenes', 12, 'idle'), enemy: side('agis', 12, 'admiral-jupiter'),
};
