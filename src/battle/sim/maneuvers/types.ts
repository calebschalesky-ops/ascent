/**
 * Maneuver state (PKG-10). Plain data, like the rest of the Battle: it round-trips through JSON, so a flight resumes
 * exactly after a save or a clone.
 */
import type { ShieldSide } from '../types';

/** The first six of BRIDGE §12b's eight. Screen and ram are not built. */
export type ManeuverName =
  | 'broadsidePass' | 'crossingLine' | 'flankingArc' | 'boardingRun' | 'defensiveWheel' | 'fightingWithdrawal';
export const MANEUVER_NAMES: ManeuverName[] = [
  'broadsidePass', 'crossingLine', 'flankingArc', 'boardingRun', 'defensiveWheel', 'fightingWithdrawal',
];

/**
 * One leg of a plotted course. go: fly to a point at a fraction of cruise speed. hold: come to a stop facing a heading
 * (null: keep the current one) for some seconds. board: launch the pods at the target (zero time; PKG-05's `board`).
 */
export type Leg =
  | { k: 'go'; x: number; z: number; v: number }
  | { k: 'hold'; face: number | null; dur: number }
  | { k: 'board'; target: string; side: ShieldSide };

/** The pilot's state: where the ship is on its course. */
export interface Pose { x: number; z: number; h: number; v: number }
export interface PilotState {
  pose: Pose;
  leg: number;
  /** Seconds spent in the current hold leg. */
  held: number;
  /** The heading the helmsman last read off the course, and ticks until he reads it again (late turns). */
  want: number;
  lag: number;
  ticks: number;
  /** Closest the ship has come to the current waypoint, and how far it was when the leg began (m; 1e12 unset). */
  best: number;
  first: number;
}

export interface Flight {
  ship: string;
  name: ManeuverName;
  target: string | null;
  side: ShieldSide | null;
  legs: Leg[];
  pilot: PilotState;
  /** Battle time the flight was ordered. */
  t0: number;
}

export interface ManeuverState {
  flights: Flight[];
  /** Log events read so far (b.logDropped + index), for the helm officer's orders. */
  logSeen: number;
}

/** What the ghost line needs: each ship's path and times, and when the whole maneuver completes. */
export interface ManeuverPreview {
  name: ManeuverName;
  /** Path points (y = 0) per ship, sampled every MAN.sampleS from the order time, ending at the ship's last point. */
  path: Record<string, { x: number; y: number; z: number }[]>;
  /** Battle time of each path point, per ship. */
  times: Record<string, number[]>;
  /** Seconds from now until the last ship finishes. */
  eta: number;
  /** False when a ship's course runs past MAN.maxS (it is cut off there). */
  complete: boolean;
  /** Where and when the pods launch on a boarding run. */
  marks: { ship: string; kind: 'board'; t: number; at: { x: number; y: number; z: number } }[];
  /** Ships named that cannot fly it, and why. */
  refused: { ship: string; reason: string }[];
}
