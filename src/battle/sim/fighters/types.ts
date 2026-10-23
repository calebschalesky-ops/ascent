/**
 * Fighter wings (PKG-25): plain data on `battle.fighters`, so they round-trip through JSON with the rest of the battle.
 * Created on the first accepted fighter-command order of either side; a battle nobody orders fighters in has none, and
 * its state hash is what it was before this package.
 */
import type { Rng } from '../rng';
import type { SideId, V3 } from '../types';

export type FighterTask = 'escort' | 'screen' | 'hunt';

/** docked: aboard its hull (launching when tasked). flying: out on its task. returning: heading home to rearm. out: gone. */
export type WingState = 'docked' | 'flying' | 'returning' | 'out';

export interface Wing {
  id: string;
  side: SideId;
  /** The hull it flies from and lands on (re-homed to another hangar if this one is lost). */
  home: string;
  /** Index among its hull's wings: staggers launches and weave phases. */
  slot: number;
  craft: number;
  craftMax: number;
  state: WingState;
  /** Why it is out: lost (shot down, or aboard a hull that died), or gone with its hull (fled / withdrew). */
  outHow: 'lost' | 'gone' | null;
  pos: V3;
  heading: number;
  /** Battle time it can next launch. */
  readyAt: number;
  /** The pod group it is escorting (escort task with our pods in flight), else null. */
  escorting: number | null;
  /** Pod groups it has already made its pass at. */
  passed: number[];
  /** Pods it has killed, and fighters it has killed. */
  podsKilled: number;
  craftKilled: number;
}

export interface FighterOrder {
  task: FighterTask | null;
  /** The ship to escort or screen (the order's target); null: the flagship. */
  target: string | null;
  at: number;
}

export interface FighterSideStats {
  launches: number;
  craftLost: number;
  /** Enemy pods this side's wings shot down, and the passes they made. */
  podsKilled: number;
  passes: number;
  /** Enemy pods shot down by this side's wings, by the ship the pods were aimed at. */
  killedAimedAt: Record<string, number>;
}

export interface FighterState {
  /** Fighters' own stream, seeded from the battle seed, so a wing's pass never moves the battle's main dice. */
  rng: Rng;
  wings: Wing[];
  orders: Record<SideId, FighterOrder>;
  stats: Record<SideId, FighterSideStats>;
}
