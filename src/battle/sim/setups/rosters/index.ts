/**
 * PKG-20: captain roster fixtures. A fixture fixes some captains of a generated roster and leaves the rest drawn.
 *
 * The fair-roster rule (PKG-13, captains.ts fairRosters) is kept: a pinned captain is copied whole (abilities, trait,
 * loyalty) onto the other side's ship of the same class and place in that class, a banned trait is banned on both
 * sides, and the unpinned captains are evened again. So "the enemy has one Fanatic cruiser" gives the player one too.
 * ASSUMED, for Caleb to overrule: mirroring is how a fixed roster stays fair.
 *
 * A pin names a ship by class and place in that class (`nth`, from 1, top of the line down), not by name, so one
 * fixture fits any setup with that class.
 */
import type { Abilities, BattleClass, SideId, Trait } from '../../types';

export interface CaptainPin {
  side: SideId;
  cls: BattleClass;
  nth: number;
  trait?: Trait;
  abilities?: Partial<Abilities>;
  loyalty?: number;
  /** What the script says about this captain that the sim does not hold (history, a denial), kept as data. */
  note?: string;
}
export interface RosterFixture {
  id: string;
  /** The script that names it. */
  from: string;
  /** Traits no captain on `side` may carry (mirrored: neither side carries them). */
  bans?: { side: SideId; trait: Trait }[];
  pins: CaptainPin[];
}

export const ROSTERS: Record<string, RosterFixture> = {
  // EXP-10: an Optimist at Candour 2, a Pessimist at Candour 3, an honest captain at Candour 9, the rest drawn.
  'candour-mix': {
    id: 'candour-mix', from: 'EXP-10',
    pins: [
      { side: 'player', cls: 'cruiser', nth: 1, trait: 'Optimist', abilities: { candour: 2 } },
      { side: 'player', cls: 'cruiser', nth: 2, trait: 'Pessimist', abilities: { candour: 3 } },
      { side: 'player', cls: 'destroyer', nth: 1, trait: 'By-the-book', abilities: { candour: 9 }, note: 'the honest captain (trait assumed)' },
    ],
  },
  // EXP-11: a Veteran at Judgement 9, a Bold at Judgement 3, a Glory-hound at loyalty 45 who has been denied, a Fanatic,
  // a By-the-book.
  'pushback-mix': {
    id: 'pushback-mix', from: 'EXP-11',
    pins: [
      { side: 'player', cls: 'cruiser', nth: 1, trait: 'Veteran', abilities: { judgement: 9 } },
      { side: 'player', cls: 'cruiser', nth: 2, trait: 'Bold', abilities: { judgement: 3 } },
      { side: 'player', cls: 'destroyer', nth: 1, trait: 'Glory-hound', loyalty: 45, note: 'has been denied before (no captain memory in the sim yet)' },
      { side: 'player', cls: 'cruiser', nth: 3, trait: 'Fanatic' },
      { side: 'player', cls: 'cruiser', nth: 4, trait: 'By-the-book' },
    ],
  },
  // EXP-07: no Fanatic captain in the enemy line.
  'no-fanatic': { id: 'no-fanatic', from: 'EXP-07', bans: [{ side: 'enemy', trait: 'Fanatic' }], pins: [] },
  // EXP-08, EXP-09, WORLD-03 ref-28: exactly one Fanatic in the enemy line, a cruiser captain.
  'one-fanatic': {
    id: 'one-fanatic', from: 'EXP-08, EXP-09, WORLD-03 ref-28',
    bans: [{ side: 'enemy', trait: 'Fanatic' }],
    pins: [{ side: 'enemy', cls: 'cruiser', nth: 1, trait: 'Fanatic' }],
  },
  // EXP-13, WORLD-03 ref-22: one player captain Ambitious, loyalty flat at 52 (her house courted: the setup's `courted`).
  'ambitious-52': {
    id: 'ambitious-52', from: 'EXP-13, WORLD-03 ref-22',
    pins: [{ side: 'player', cls: 'cruiser', nth: 1, trait: 'Ambitious', loyalty: 52 }],
  },
  // WORLD-03 ref-11 (check 6 swaps him to By-the-book): a Glory-hound who defies.
  'glory-hound': {
    id: 'glory-hound', from: 'WORLD-03 ref-11',
    pins: [{ side: 'player', cls: 'cruiser', nth: 1, trait: 'Glory-hound' }],
  },
  // WORLD-03 ref-24 (check 6 swaps him to Veteran): the By-the-book captain when the array falls.
  'by-the-book': {
    id: 'by-the-book', from: 'WORLD-03 ref-24',
    pins: [{ side: 'player', cls: 'destroyer', nth: 1, trait: 'By-the-book' }],
  },
};
