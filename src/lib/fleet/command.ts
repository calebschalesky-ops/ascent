/**
 * The ranks of command, on progression's levels (src/lib/progression/levels.ts, top level 10). Below Captain the
 * player flies a cruiser and its bay is progression's (wingmen, B and V); from Captain up it is a capital ship whose
 * bay and wings are fleet command's. Ranks past Captain need things progression does not have yet (a second capital
 * ship, a held shipyard), passed in as `has`.
 */
import type { ShipType } from '../shipTypes';
import { SHIP_TYPES } from '../shipTypes';

/** What a ship costs against the fleet cap. A capital ship is worth ten fighters. */
export const COMMAND_POINTS: Record<ShipType, number> = { capital: 10, cruiser: 3, fighter: 1, destroyer: 5 };

export type RankId = 'pilot' | 'flightLead' | 'squadron' | 'commander' | 'captain' | 'commodore' | 'admiral';

export interface Rank {
  id: RankId;
  label: string;
  /** Player level needed (from progression). */
  level: number;
  /** What else unlocks it, in words, for the plan and the UI. */
  unlock: string;
  /** The hull the player flies at this rank. */
  hull: ShipType;
  /** Ships the flagship's bay launches. */
  bay: Record<ShipType, number>;
  /** Command points the whole fleet may field (the flagship's own hull is free). */
  cap: number;
  /** How many wings can take separate orders. */
  wings: number;
}

export const RANKS: Rank[] = [
  { id: 'pilot', label: 'Pilot', level: 1, unlock: "Start: your race's cruiser", hull: 'cruiser', bay: { capital: 0, cruiser: 0, fighter: 0, destroyer: 0 }, cap: 0, wings: 0 },
  { id: 'flightLead', label: 'Flight lead', level: 2, unlock: "Level 2: the cruiser's bay opens (progression: 1 fighter, 2 at level 4, 3 at 6)", hull: 'cruiser', bay: { capital: 0, cruiser: 0, fighter: 3, destroyer: 0 }, cap: 3, wings: 1 },
  { id: 'squadron', label: 'Squadron leader', level: 8, unlock: 'Level 8: the fourth bay slot (progression)', hull: 'cruiser', bay: { capital: 0, cruiser: 0, fighter: 4, destroyer: 0 }, cap: 4, wings: 1 },
  // The destroyer (claude/destroyer-a8ff7d, a PROPOSAL for Caleb): between the cruiser and the capital ship, a hull of
  // its own. Its hangar is two slots (lib/hangars.ts): fewer fighters than the cruiser's four, for its guns and speed.
  { id: 'commander', label: 'Commander', level: 9, unlock: 'Level 9 and a destroyer (a shipyard sells one, or a mission hands it over)', hull: 'destroyer', bay: { capital: 0, cruiser: 0, fighter: 2, destroyer: 0 }, cap: 6, wings: 2 },
  { id: 'captain', label: 'Captain', level: 10, unlock: 'Level 10 and the mission "Take command"', hull: 'capital', bay: { capital: 0, cruiser: 2, fighter: 8, destroyer: 0 }, cap: 14, wings: 3 },
  { id: 'commodore', label: 'Commodore', level: 10, unlock: 'Captain, and a second capital ship (bought or captured)', hull: 'capital', bay: { capital: 0, cruiser: 4, fighter: 16, destroyer: 0 }, cap: 38, wings: 5 },
  { id: 'admiral', label: 'Admiral', level: 10, unlock: 'Commodore, and a shipyard (a held planet)', hull: 'capital', bay: { capital: 0, cruiser: 8, fighter: 32, destroyer: 0 }, cap: 100, wings: 8 },
];

/** What a rank past the level gates needs. */
export interface CommandHas { command?: boolean; capitals?: number; shipyard?: boolean; destroyer?: boolean }

/** The rank a player holds at `level`, given what they have done and own. */
export function rankFor(level: number, has: CommandHas = {}): Rank {
  if (level >= 10 && has.command) {
    if ((has.capitals ?? 1) >= 2 && has.shipyard) return rankById('admiral');
    if ((has.capitals ?? 1) >= 2) return rankById('commodore');
    return rankById('captain');
  }
  if (level >= rankById('commander').level && has.destroyer) return rankById('commander');
  return [...RANKS].reverse().find((r) => r.hull === 'cruiser' && level >= r.level) ?? RANKS[0];
}
/** Whether the level gate for a capital ship is met (the mission is the other half). */
export const canCommand = (level: number) => level >= rankById('captain').level;

export const rankById = (id: RankId): Rank => RANKS.find((r) => r.id === id)!;

export const pointsOf = (ships: Partial<Record<ShipType, number>>) => SHIP_TYPES.reduce((s, t) => s + (ships[t] ?? 0) * COMMAND_POINTS[t], 0);

/** Whether one more ship of `type` fits under the rank's cap, given what is already flying. */
export const canField = (rank: Rank, flying: Partial<Record<ShipType, number>>, type: ShipType) => pointsOf(flying) + COMMAND_POINTS[type] <= rank.cap;
