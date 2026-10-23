/**
 * Boarding state (PKG-05): plain data on `battle.boarding`, so it round-trips through JSON with the rest of the battle.
 */
import type { HullFight } from '../../../lib/boarding/troops';
import type { ShieldSide, SideId, V3 } from '../types';

/** One launch: a group of boarding pods flying as one entity. */
export interface PodGroup {
  id: number;
  side: SideId;
  /** The ship that launched it. */
  from: string;
  target: string;
  /** The shield side it aims to strike through. */
  aim: ShieldSide;
  pos: V3;
  pods: number;
  marines: number;
  /** Marine quality (trait and leadership applied). */
  quality: number;
  /** flying → breaching → (joined a fight) gone. */
  phase: 'flying' | 'breaching';
  breachLeft: number;
  /** The target's point defence has had its shot. */
  pdDone: boolean;
  /** Joining a fight already going: comes in through the breach, not a shield. */
  reinforcing: boolean;
  ordered: boolean;
  /**
   * PKG-14 (item 7): the aimed side was open when the pods launched, and the power split it had then. A side that has
   * fallen is still collapsed when they arrive unless the defender put power back on it (BOARDING.collapsedHoldS).
   * Absent on a group from before PKG-14.
   */
  openAtLaunch?: { t: number; split: number } | null;
  /** Fighter escort (a later package). Always null in Phase A. */
  escorts: null;
}

/** A fight inside one hull. */
export interface BoardFight {
  target: string;
  /** The boarding side. */
  side: SideId;
  fight: HullFight;
  /** Defenders as people, kept in step with the fight: marines and armed crew. */
  def: { marines: number; armed: number };
  /** Who put marines in, for pull-back and the prize crew's officer. */
  from: { ship: string; marines: number }[];
  scuttleRolled: boolean;
  nextReport: number;
  startT: number;
}

export interface BoardingState {
  pods: PodGroup[];
  fights: BoardFight[];
  nextId: number;
  /** Launches no admiral ordered (WORLD-01 check 3). */
  unordered: number;
  /** Ships captured, by the side that took them. */
  captured: Record<SideId, number>;
  /** Battle time of each ship's last launch (by ship id). */
  lastLaunch: Record<string, number>;
}
