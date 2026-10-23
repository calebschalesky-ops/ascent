/**
 * The AI admiral's memory (PKG-07). Plain data, kept on `battle.sides[side].admiral`, so a battle with an admiral still
 * round-trips through JSON and hashes deterministically.
 */
import type { Order, ShieldSide } from '../types';

export type AdmiralStyle = 'jupiter' | 'mars' | 'good' | 'bad';

/** What this side's own sensors have seen of one enemy side: battle times, -1e9 for never. */
export interface SeenSide { openAt: number; closedAt: number }

export interface SeenShip {
  /** Hull damage this side's own hits have done to it. */
  hullDmg: number;
  sides: Record<ShieldSide, SeenSide>;
}

export interface PendingOrder { at: number; ship: string; order: Order; why: string }

export interface Push {
  target: string;
  side: ShieldSide;
  decidedAt: number;
  /** When the telegraph orders went out (escorts forward, capitals turning). */
  telegraphAt: number | null;
  /** When the board orders are due: telegraphAt + telegraphLeadS. */
  launchDue: number | null;
  status: 'planned' | 'telegraph' | 'launched' | 'aborted' | 'no-board-order';
  /** When the board orders went out. */
  launchedAt: number | null;
  /** The first boardLaunch event from one of our launchers after the board order, if the boarding package emits one. */
  launchEventAt: number | null;
  launchers: string[];
  boardOrdersOk: number;
  escortStartM: number | null;
  escortsCloserM: number | null;
  capitalStartHeading: Record<string, number>;
  capitalTurnDeg: number | null;
  abortReason: string | null;
}

export interface AdmiralState {
  style: AdmiralStyle;
  difficulty: string;
  nextOps: number;
  nextWatch: number;
  /** Absolute index (logDropped + position) of the next battle log event to read. */
  logRead: number;
  focus: { target: string; side: ShieldSide; since: number } | null;
  seen: Record<string, SeenShip>;
  pending: PendingOrder[];
  push: Push | null;
  pushes: Push[];
  nextPushAt: number;
  /** Every order this admiral issued through order(): count, kinds, refusals. */
  issued: number;
  kinds: Record<string, number>;
  refused: number;
  mistakes: number;
  /** Engagement range samples (metres, own active ship to nearest active foe within railgun range), once a second. */
  rangeSum: number;
  rangeN: number;
  /** Engagement range as fought: the range of every shot this side fired (WORLD-02 check 7). */
  shotRangeSum: number;
  shotN: number;
  withdrawn: string[];
  /** Condensed, human-readable: one line per decision. */
  opsLog: string[];
}

export function newAdmiralState(style: AdmiralStyle, difficulty: string): AdmiralState {
  return {
    style, difficulty, nextOps: 0, nextWatch: 0, logRead: 0, focus: null, seen: {}, pending: [], push: null, pushes: [],
    nextPushAt: 0, issued: 0, kinds: {}, refused: 0, mistakes: 0, rangeSum: 0, rangeN: 0, shotRangeSum: 0, shotN: 0, withdrawn: [], opsLog: [],
  };
}
