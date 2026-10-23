/**
 * The goal the opening launches the player at: **the first raid** (GAMEPLAY.md GP-02; FEUDS.md 5). The director
 * (lib/motivation/director.ts) deals it inside a minute of the first undock: two fighters of your blood enemy, sent at
 * you, winnable. It replaced the stand-in that sent a new pilot to break a rival world's patrol (nothing came to the
 * player; phase 1, finding 1).
 *
 * Who raids each start is `firstRaider` (lib/diplomacy/standings): the blood enemy; for Mars and Jupiter the belt
 * war; for Mercury and Saturn, who have none, the house they regard worst. The card names the feud and its year
 * (GAMEPLAY.md P2.9, 2).
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { Dest } from '../nav';
import { peopleOf } from '../races';
import { HOUSES, feudAge, firstRaider, newStandings } from '../diplomacy/standings';

/** Each start's first raider (the opening's faction step names them as your enemy). */
export const RIVAL = Object.fromEntries(HOUSES.map((h) => [h, firstRaider(newStandings(), h)])) as Record<NationId, NationId>;

const WHY: Record<NationId, string> = {
  earth: 'Mars broke from the Metropolis by war and still calls Earth the decayed empire. Their raiders have been testing the League’s pickets for a generation.',
  moon: 'The Nephelai have not forgiven the Nika Burning, and their raiders have started shadowing the Hall of Answers.',
  mercury: 'Venus buys your power and despises you for selling it. They have hired a company to stop your beams, and it is coming for you.',
  venus: 'The Selenitai ran the Blues the night the Hippodrome burned. Their raiders want the Autokrator humbled before the race.',
  mars: 'The Diadochoi are kings, and Mars fears a king above all things. The belt war has reached your patrol line.',
  jupiter: 'The Quirites call the four crowns tyrants and want the belt. Their raiders are already over the line.',
  saturn: 'The Diadochoi call Titan "our cousins", and their raiders have come to collect.',
};

export interface Goal {
  id: string;
  /** Short, for the HUD: "Break the Quirite patrol". */
  title: string;
  /** The reason, in the fiction. */
  why: string;
  /** Where the autopilot is set when the player launches; null: it comes to you. */
  target: Dest | null;
  /** The feud and its age, for the card: "since the Nika Burning, 4791". Null when there is no blood feud. */
  feud: string | null;
  /** Whose ships count. */
  against: NationId;
  /** How many. */
  need: number;
  /** What the player gets, said plainly. */
  reward: string;
}

/** The first goal of a new pilot of `nation`: beat off the first raid. */
export function firstGoal(nation: NationId): Goal {
  const raider = RIVAL[nation];
  const them = peopleOf(raider);
  return {
    id: `raid-${nation}-${raider}`,
    title: `Beat off the ${them.demonym} raid`,
    why: WHY[nation],
    target: null,
    feud: feudAge(nation, raider),
    against: raider,
    need: 2,
    reward: 'Two fighters, coming at you inside the minute. Each one pays when it dies.',
  };
}

/** Where the raider's ships come from: their home world (the belt front, once GP-20 places it). */
export const raiderHome = (nation: NationId): Dest => NATIONS.find((n) => n.id === RIVAL[nation])!.home;

/** The goal in play: which one, how far along, and when it was done. */
export interface GoalState { id: string; nation: NationId; kills: number; done: boolean }

export const startGoal = (nation: NationId): GoalState => ({ id: firstGoal(nation).id, nation, kills: 0, done: false });

/** A kill of a ship of `of`: counts toward the goal if it is the rival's. */
export function goalKill(g: GoalState, of: NationId): GoalState {
  const goal = firstGoal(g.nation);
  if (g.done || of !== goal.against) return g;
  const kills = g.kills + 1;
  return { ...g, kills, done: kills >= goal.need };
}

export function migrateGoal(raw: unknown): GoalState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const nation = NATIONS.find((n) => n.id === r.nation)?.id;
  if (!nation) return null;
  const kills = typeof r.kills === 'number' && r.kills >= 0 ? Math.floor(r.kills) : 0;
  return { id: firstGoal(nation).id, nation, kills, done: r.done === true || kills >= firstGoal(nation).need };
}
