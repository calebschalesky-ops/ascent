/**
 * Boarding's one numbers table (PKG-05, HOUSE-RULES rule 10). ALL FIRST-PASS: written by Talos to make boarding run
 * and the world scripts measurable, not balanced. Palamedes proves or replaces each one by sim.
 *
 * Units: metres, seconds, m/s. Marines and crew are people.
 */
import type { BattleClass, Trait } from '../types';

export const BOARDING = {
  /** Hulls with a working hangar that can launch boarding pods (NAVY §3; the package: carrier, capital). */
  hangarClasses: ['capital', 'carrier'] as BattleClass[],
  /** Pods in one launch, and marines in each pod. */
  podsPerLaunch: 6,
  marinesPerPod: 15,
  /** A ship keeps at least this many marines aboard to defend itself; it launches only what is above it. */
  marineReserve: 30,
  /** A launch with fewer marines than this is not worth sending. */
  minLaunch: 30,
  /** Pod speed, m/s. */
  podSpeed: 450,
  /** A pod group launches only at a target within this range. */
  launchRange: 9500,
  /**
   * PKG-14 (item 7, NAVY §1/§3): pods the admiral orders at a side that is down still go through it if they arrive within this
   * many seconds of the launch, unless the defender has put more power on that side since (re-powered, and comms says
   * so). A fallen side's regen from zero is a thin film, not a wall: 25 s covers a crossing at the full 9.5 km launch
   * range (21 s at 450 m/s) plus slack.
   */
  collapsedHoldS: 25,
  /** The aimed side counts as re-powered when its share of the split has risen by more than this since launch. */
  repowerSplit: 0.02,
  /** Pods aim for a point this far off the chosen side of the target, then close. */
  standoff: 200,
  /** Within this of the aim point, the pods have arrived. */
  arriveRange: 60,
  /** The target's point defence gets one shot at each pod as it crosses this range. */
  pdRange: 2500,
  /** Each pod is lost with chance pdChance(target) × this (losses en route are marines lost). */
  pdKillScale: 0.6,
  /** NAVY §3 step 3: the drill takes 2.5 s and costs the target a little hull (this fraction of its max). */
  breachS: 2.5,
  breachHullFrac: 0.01,
  /** The fight inside runs on lib/boarding/troops.ts's Lanchester model; its clock runs at this rate of battle time. */
  fightTimeScale: 0.25,
  /** Seconds between boardFight reports. */
  fightReportS: 3,
  /** Share of the defender's crew that takes up arms against boarders. */
  armedCrewFrac: 0.25,
  /** Quality of a marine and an armed crewman (lib/boarding/spec.ts FIGHT.marines and FIGHT.crew). */
  marineQuality: 2.02, // PKG-16 second-pass (reports/PKG-16.md): was 1.6
  crewQuality: 0.6,
  /** NAVY §3 / decision 1: marines the admiral leads fight at this quality. Unused in Phase A. */
  ledByAdmiral: 1.5,
  /** While boarded, the defender pulls crew off guns: its gunnery (rate of fire) × this. */
  crewOffGunsMul: 0.6,
  /** A prize fights with a prize crew: crew = crewMax × prizeCrewFrac, and its gunnery × prizeGunneryMul. ASSUMED. */
  prizeCrewFrac: 0.3,
  prizeGunneryMul: 0.6,
  /** Pull back: this share of the boarders still standing get back to their ships. */
  pullBackSurvive: 0.6,
  /** A losing Fanatic defender rolls once to scuttle when its defenders fall to this share of their start. ASSUMED. */
  scuttleAt: 0.45,
  scuttleChance: 0.5,
  /** A captain reconsiders boarding every this many seconds, and waits this long after a launch. */
  thinkS: 2,
  cooldownS: 20,
  /** Judgement a captain needs to see an open side and launch on their own (lowered/raised by trait, below). */
  selfJudgement: 5,
  /** Standing orders to board lower the bar by this. */
  standingBonus: 2,
  /** A captain reinforces a fight on their own when the boarders are under this ratio of the defenders. */
  reinforceBelow: 1.2,
  /**
   * PKG-16, first-pass. The launcher marine reserve: a captain launches unordered only while, after a full launch, at
   * least this many spare marines would stay aboard for an ordered push (0 = off).
   */
  unorderedKeep: 90,
};

/** first-pass. Judgement bar change by trait for an unordered launch (negative = launches more readily). */
export const BOARD_TRAIT: Partial<Record<Trait, number>> = {
  Bold: -2, 'Glory-hound': -2, Ambitious: -2, Fanatic: -1, Cautious: 2, 'By-the-book': 1, Pessimist: 1,
};

/** first-pass. Marine quality multiplier from the captain's trait (NAVY §3 step 4: veteran marines, traits). */
export const QUALITY_TRAIT: Partial<Record<Trait, number>> = { Veteran: 1.25, Fanatic: 1.1, Bold: 1.05, Protector: 1.05 };

/**
 * first-pass. Mass lock (VISION §7): a ship within `range` of an active enemy capital or destroyer cannot jump.
 * Kept equal to ESCAPE.massLockRange so the two rules agree (see the PKG-05 report, Requests).
 */
export const MASSLOCK = { range: 3000, classes: ['capital', 'destroyer'] as BattleClass[] };

/** first-pass. What a taken ship is worth in summarise(): a capture is the whole value, a wreck a quarter of it. */
export const PRIZE = {
  value: { capital: 10, destroyer: 4, cruiser: 2, carrier: 4, escort: 1 } as Record<BattleClass, number>,
  wreckFrac: 0.25,
};
