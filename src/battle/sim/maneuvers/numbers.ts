/**
 * Maneuvers' one numbers table (PKG-10, HOUSE-RULES rule 10). ALL FIRST-PASS: written by Talos to make the six shapes
 * flyable and testable, not balanced or art-directed. Palamedes proves or replaces each one by sim; whether the shapes
 * look like a navy is Zeuxis's and the director's call.
 *
 * Units: metres, seconds, radians, fractions.
 */
import type { Trait } from '../types';

const deg = Math.PI / 180;

export const MAN = {
  /** Path points are sampled this often (seconds) for the preview's ghost line. */
  sampleS: 1,
  /** A plotted path longer than this (seconds) is cut off there; the preview says it is incomplete. */
  maxS: 600,
  /** The order-time lead on a moving target: its velocity × min(time to get there, this). */
  leadMaxS: 30,
  /** preview = flown: the flown track must stay within this of the ghost line (tests, EXP-03 step 4 probe). */
  previewTolM: 50,

  // ── The captain's Helm (§12b "Helm 9 flies them tighter and faster; low Helm shows in loose, late turns") ──
  /** Cruise speed as a fraction of the class's max: speedBase + speedPer × Helm (Helm 9 ≈ 1.0, Helm 3 ≈ 0.74). */
  speedBase: 0.6, speedPer: 0.045,
  /** A waypoint with no turn after it counts as reached within this many metres. */
  captureBase: 150,
  /**
   * A good helmsman starts the next turn early, where a fillet of his turning radius meets both legs (r × tan(turn/2));
   * he anticipates anticipPer × Helm of that distance. Helm 10 holds the corner exactly; low Helm turns late and swings
   * wide of it.
   */
  anticipPer: 0.1,
  /** Low Helm turns late: the helmsman re-reads the course every lagPer × (10 − Helm) seconds (Helm 10 every tick). */
  lagPer: 0.35,
  /**
   * Turning, the ship slows from top speed (bow on course) to sharpTurnSpeed × top at sharpTurn of heading error and
   * beyond (PKG-18: a fraction of the class's top speed, not of cruise, and tapered rather than a step, so every captain
   * turns at the same speed and the better turn rate makes the tighter turn).
   */
  sharpTurn: Math.PI / 3, sharpTurnSpeed: 0.3,
  /**
   * PKG-18, path-following: the helmsman steers for a point this far ahead on the leg's line, in turning radii:
   * lookBase + lookPer × (10 − Helm). Helm 9 ≈ 1.15 radii (holds the line), Helm 3 ≈ 2.65 (drifts back to it lazily).
   */
  lookBase: 0.9, lookPer: 0.25,
  /**
   * PKG-18: into a hold he brakes, planning on brakeAccel of his deceleration, to stop brakeAt × capture short of the
   * point, never slower than brakeFloor × top; in the hold he turns to face only once below brakeFloor × top.
   */
  brakeAt: 0.5, brakeFloor: 0.08, brakeAccel: 0.6,
  /** Turns sharper than this are anticipated as if they were this (tan blows up near 180°). */
  maxFillet: 120 * deg,
  /** PKG-18: he never turns in for the next leg before he has flown this fraction of the current one. */
  filletLegFrac: 0.5,

  // ── Shapes ──
  /** Broadside pass: the run along the target is this many × the engagement range long. */
  passLenMul: 1.6,
  /**
   * Broadside pass (PKG-18): the approach joins the run line ahead of the ship at no more than passJoin off it (never
   * behind the ship, never past the beam point), so there is no leg back to an entry point. A ship more than
   * passAbeamMul × range ahead of or behind the beam runs the way that passes the target; nearer the beam, the way it is
   * already heading.
   */
  passJoin: 35 * deg, passAbeamMul: 0.25,
  /** Crossing the line: the cut across their bow is ± this × range wide. */
  crossHalfWidthMul: 0.7,
  /** Flanking arc: points along the arc at most this far apart (radians). */
  arcStep: 40 * deg,
  /** Flanking arc / defensive wheel: seconds holding at the end, turning to face. */
  settleS: 8,
  /** Boarding run: the carrier dives to this fraction of the pods' launch range (its closest point). */
  diveFrac: 0.7,
  /** Boarding run: the carrier waits this long so the escorts lead. */
  diveDelayS: 6,
  /** Boarding run: escorts lead to this far off the target, spread ± escortSpread, then break away to breakR. */
  escortLeadR: 3500, escortSpread: 20 * deg, breakR: 7000, breakAngle: 75 * deg,
  /** Boarding run: after the launch the carrier pulls out this far round from its dive bearing. */
  pullOutAngle: 55 * deg,
  /** Defensive wheel: the ring turns this far; a lone ship circles a point this far off its beam. */
  wheelTurn: 75 * deg, wheelMinR: 900,
  /** Defensive wheel: the ring's radius is at least this many × the ship's turning radius. */
  wheelRadiusMul: 1.5,
  /** Fighting withdrawal: each bound is this long (metres); hold to cover this long; this many bounds a ship. */
  boundM: 1800, coverS: 10, bounds: 2,
  /** Fighting withdrawal: how far inside its shield arc the strong side holds the threat (radians). */
  strongMargin: 6 * deg,
} as const;

/**
 * Traits shade how a captain flies an order (§12b: "a Veteran swings wide and comes in on the open side; a Bold one goes
 * straight in"). rangeMul scales the engagement range (on top of the standing-orders TRAIT.rangeMul already in
 * prefRange); swing scales the flanking arc's radius; direct skips the arc altogether. Unlisted traits fly the default.
 * ASSUMED, for Caleb to overrule.
 */
export interface Shade { rangeMul: number; swing: number; direct: boolean }
export const DEFAULT_SHADE: Shade = { rangeMul: 1, swing: 1.15, direct: false };
export const SHADE: Partial<Record<Trait, Shade>> = {
  Bold: { rangeMul: 0.85, swing: 1, direct: true },
  'Glory-hound': { rangeMul: 0.85, swing: 1, direct: true },
  Veteran: { rangeMul: 1, swing: 1.4, direct: false },
  Cautious: { rangeMul: 1.1, swing: 1.3, direct: false },
};
