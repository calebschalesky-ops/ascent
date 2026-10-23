/**
 * The AI admiral's numbers (PKG-07). ALL FIRST-PASS: written by Talos to make WORLD-02 run, for Palamedes to prove or
 * replace by sim (HOUSE-RULES rule 10).
 *
 * ASSUMED, for Caleb to overrule: what "Jupiter: methodical range" means as numbers. Here it is:
 * - one focus at a time: one side of one ship, held until that ship leaves the field;
 * - the line fights from its captains' preferred ranges (6–9 km), which is railgun range and outside laser range
 *   (GUN.rail.range 12 km, GUN.laser.range 4 km); escorts screen the flagship instead of closing;
 * - a ship is withdrawn when it is within `withdrawMoraleMargin` of its break point or under `withdrawHullFrac` hull,
 *   but never if that withdrawal would itself break the side (half the fleet out);
 * - a boarding push only when the focus side has been seen open and no enemy escort is within `laneClearM` of the
 *   target, telegraphed `telegraphLeadS` before the boarders launch.
 */

/** first-pass. The difficulty knob: how late the admiral acts on what it sees, and how often it picks wrong. */
export interface Difficulty {
  /** Seconds between seeing something (at an ops or watch tick) and the order going out. */
  reactionDelayS: number;
  /** Chance per ops decision that the admiral takes its second-best target instead of its best (a deliberate mistake). */
  mistakeRate: number;
}

/** first-pass. Phase A runs `normal` only. */
export const DIFFICULTY: Record<string, Difficulty> = {
  easy: { reactionDelayS: 5, mistakeRate: 0.3 },
  normal: { reactionDelayS: 2, mistakeRate: 0.1 },
  hard: { reactionDelayS: 1, mistakeRate: 0 },
  /** The runner's scripted player policies: they act at once and never pick wrong (they are scripts, not admirals). */
  script: { reactionDelayS: 0, mistakeRate: 0 },
};
export const PHASE_A_DIFFICULTY = 'normal';

/** first-pass. The operations layer's clock (VISION §9: every ~10 s). */
export const OPS = {
  /** Seconds between operations decisions: what to break, where to attack, when to commit boarders. */
  everyS: 10,
  /** Seconds between withdrawal watches (a ship about to break cannot wait 10 s). */
  watchEveryS: 2,
};

/** first-pass. What the admiral's sensors remember about an enemy ship (from its own side's hits only). */
export const SENSE = {
  /** A side seen open (a hit reached the hull, or it was seen to collapse) is forgotten after this long without a new sighting. */
  openForgetS: 15,
};

/** first-pass. Target choice: lower score is better. */
export const TARGET = {
  /** Per km from the line's centre. */
  perKm: 2,
  /** Per 1000 points of effort to break it: class hull × estimated hull left (from hull damage seen) + class shield. */
  effortPerK: 1,
  /** Subtracted when a side of it has been seen open. */
  openBonus: 4,
};

/** first-pass. Jupiter, methodical range. */
export const JUPITER = {
  /**
   * Methodical range: a line ship with an enemy closer than this engages that ship instead of the focus. Under an
   * `attack` order a captain backs off to its preferred range from its target, so the line gives ground rather than
   * brawl. 5 km is laser range (4 km) plus a margin.
   */
  minRangeM: 5000,
  /** It returns to the focus once the nearest enemy is this much beyond minRangeM. */
  rangeHysteresisM: 1000,
  /** Withdraw a ship when its morale is within this many points of its break threshold. */
  withdrawMoraleMargin: 8,
  /** Withdraw a ship under this hull fraction. */
  withdrawHullFrac: 0.35,
  /** Most ships the admiral withdraws in one battle. PKG-13: 3 → 1 (30 seeds: check 2 27 v 22 of 30, the rest level). */
  maxWithdrawals: 1,
  /** A boarding push needs no enemy escort within this of the target. */
  laneClearM: 2500,
  /** Seconds the telegraph (escorts forward, capitals turning) runs before the boarders launch. VISION §9; WORLD-02 check 6 bar is 5 s. */
  telegraphLeadS: 6,
  /** Seconds after a push before the next can start. */
  pushCooldownS: 45,
  /**
   * PKG-13. The decision point: past this battle time with no push launched yet, the admiral boards any open side whose
   * lane is clear, not only its focus side (pillar 3: a Jupiter admiral still boards).
   */
  pushDecisionS: 120,
  /** PKG-13. A push is planned only at a target within this fraction of the pods' launch range (BOARDING.launchRange) of a launcher. */
  launchReachFrac: 0.95,
  /** PKG-13. Boarders wait up to this long past `telegraphLeadS` for the telegraph to show; then the push is called off. */
  telegraphHoldS: 6,
  /** PKG-13. Seconds after a push called off (target gone, side closed, telegraph unseen, boarding refused) before the next. */
  abortCooldownS: 10,
};

/** first-pass. What counts as a visible telegraph (WORLD-02 check 6): escorts this much closer, or a capital this much turned. */
export const TELEGRAPH = {
  minEscortCloseM: 100,
  minCapitalTurnDeg: 10,
};

/** first-pass. The scripted-bad player policy (WORLD-02 check 4): it orders a board into closed shields this often. */
export const SCRIPTED = {
  badBoardEveryS: 30,
};

/** Cap on the admiral's condensed ops log (plain lines, for the report). */
export const OPS_LOG_CAP = 400;
