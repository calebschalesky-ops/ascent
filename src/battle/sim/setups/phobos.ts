/**
 * PKG-20: setups near Phobos, in Mars orbit (LORE: Castra Phobos, the legion's camp). The enemy is the Quirites' House of
 * Cincinnatus, meant for the Mars admiral style (AI2 builds it; until then the Jupiter admiral commands). ASSUMED, for
 * Caleb to overrule: fleet mixes (fleets.ts MIX), 9 km gap, roster 1. The scene draws Mars behind the battle: Phobos is
 * 22 km across, too small to be the backdrop.
 */
import type { BattleSetup } from '../types';
import { side } from './fleets';

const AT = { body: 'phobos', place: 'Phobos, Mars orbit', separationM: 9000, rosterSeed: 1, styles: { enemy: 'mars' } } as const;

/** EXP-08 steps 8–13: 13 against a Mars house of 12 under the Mars style. */
export const PHOBOS_13V12: BattleSetup = {
  ...AT, name: 'phobos-13v12', player: side('kleisthenes', 13, 'idle'), enemy: side('cincinnatus', 12, 'admiral-jupiter'),
};

/** EXP-15, WORLD-06 (Mars): an even line at Mars's own body. */
export const PHOBOS_12V12: BattleSetup = {
  ...AT, name: 'phobos-12v12', player: side('kleisthenes', 12, 'idle'), enemy: side('cincinnatus', 12, 'admiral-jupiter'),
};

/** WORLD-03 ref-10: attacking a stronger depot: 10 against 14 by the legion's camp. */
export const REF_10: BattleSetup = {
  ...AT, name: 'ref-10', place: 'Phobos, the depot',
  player: side('kleisthenes', 10, 'idle'), enemy: side('cincinnatus', 14, 'admiral-jupiter'),
  needs: ['the depot as a fortress (no fortress in Phase B: the stronger fleet stands for it)'],
};

/** WORLD-03 ref-27: his flagship boarded: an even line against the house that boards most. */
export const REF_27: BattleSetup = {
  ...AT, name: 'ref-27', place: 'Phobos, against the boarders',
  player: side('kleisthenes', 12, 'idle'), enemy: side('cincinnatus', 12, 'admiral-jupiter'),
};
