/**
 * Fighters' one numbers table (PKG-25, HOUSE-RULES rule 10). ALL FIRST-PASS: written by Talos to make fighter wings fly
 * and the escort / screen / hunt tasks measurable, not balanced. Palamedes proves or replaces each one by sim
 * (reports/PKG-25.md has the first table: pods lost en route with and without an escort wing, 30 seeds).
 *
 * Units: metres, seconds, m/s. A wing's `craft` is a count of fighters (fractional while a dogfight wears it down).
 */
import type { BattleClass } from '../types';

export const FIGHTERS = {
  /**
   * Wings each hull carries (VISION §7a "Your flagship's wings"; NAVY §2 boarders launch from a capital or carrier, and
   * the carrier is the fighter hull). ASSUMED, for Caleb to overrule: a carrier 2, a capital 1, nothing else.
   */
  wingsPerHull: { capital: 1, carrier: 2 } as Partial<Record<BattleClass, number>>,
  /** Fighters in a wing at launch. */
  craftPerWing: 6,
  /** Wing speed, m/s (pods fly 450, so an escort keeps up). */
  speed: 520,
  /** Seconds between two wings leaving the same hangar. */
  launchGapS: 3,
  /** Within this of its hull, a returning wing is aboard. */
  recoverM: 250,
  /** Seconds aboard to rearm before a recovered wing can launch again. */
  rearmS: 20,
  /** A wing turns for home when it is down to this fraction of its fighters. */
  returnAtFrac: 0.34,
  /** A recovered wing relaunches only with at least this many fighters. */
  relaunchMinCraft: 2,
  /** A wing with fewer than this many fighters left is lost. */
  lostBelow: 0.5,

  // ── Where each task flies ──
  /** Escort: this far off the ship (or pods) it escorts, toward the nearest enemy. */
  escortM: 350,
  /** Screen: this far out from the ship it screens, on the line to the threat (never past half the distance). */
  screenM: 1500,
  /** The weave: a wing circles its station at this radius, once every `weavePeriodS`. Look and lane, never luck. */
  weaveM: 220,
  weavePeriodS: 7,

  // ── Interception (seeded draws: gunnery-like spread, the Daedalus ruling) ──
  /** A wing gets one pass at each enemy pod group that comes within this of it. */
  interceptM: 900,
  /** Chance per fighter that a pass kills one pod: a full wing of 6 is 0.30 a pod. */
  podKillPerCraft: 0.05,
  /** No pass kills a pod at better than this. */
  podKillCap: 0.6,
  /** Task multipliers on a pass. Screen sits in the lane the pods fly down. */
  taskMul: { escort: 1, screen: 1.5, hunt: 1.1 } as Record<string, number>,
  /** Pods with an escort wing on them: the target's point defence is cut by this fraction (fighters draw its fire). */
  escortPdCut: 0.4,
  /** Pods with an escort wing on them: an enemy wing's pass is cut by this fraction. */
  escortDefend: 0.5,
  /** An escort wing counts as on its pods within this distance of them. */
  escortOnM: 900,

  // ── Attrition (deterministic rates: no draw) ──
  /** Two enemy wings within this of each other are in a dogfight. */
  dogfightM: 700,
  /** Fighters each enemy fighter kills per second in a dogfight. */
  dogKillPerS: 0.06,
  /** Hunting wings are set up for the dogfight. */
  huntDogMul: 1.3,
  /** An enemy ship's point defence reaches wings within this. */
  pdWingM: 1500,
  /** Fighters per second an enemy ship's point defence kills, times its pdChance (a capital at full PD: 0.14/s). */
  pdWingKillPerS: 0.25,

  /**
   * The AI admiral sends its fighters forward (fighter command: escort) with a boarding telegraph (VISION §9). OFF: on,
   * it moved Phase A's WORLD-01 check 6 from 9 of 10 to 7 of 10 at seeds 1-10 (reports/PKG-25.md), and Phase A must not
   * get worse. The line is built and tested; Palamedes or AI2 turns it on once re-balanced. Tests and the probe can set it.
   */
  admiralEscortsPush: false,
};
