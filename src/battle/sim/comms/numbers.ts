/**
 * Every tunable number in the comms layer (HOUSE-RULES rule 10). ALL FIRST-PASS: written by Talos in PKG-06 so the
 * queue, timeouts, command points and pushback run, not balanced. Palamedes proves or replaces each one by sim.
 */
import type { Mood, Trait } from '../types';

/** first-pass. The queue, timeouts and folding (BRIDGE §4). */
export const COMMS = {
  /** A decision waits this long by default (BRIDGE §4: 4–12 s). */
  timeoutBase: 8,
  /** Urgent reports wait this much less. */
  urgentLess: 3,
  timeoutMin: 4, timeoutMax: 12,
  /** Status lines fold into one flag lieutenant summary this often. */
  foldEveryS: 10,
  /** Individual status lines that are not folded (acks, officers, timeout choices) stay in the queue this long. */
  showStatusS: 6,
  /** The same report type for the same ship is not raised again for this long. */
  cooldownS: 45,
  /** A captain is "about to break" when morale is within this of their break threshold. */
  breakWarnMargin: 8,
  /** Flagship threatened: hull under this fraction, or this many enemy ships within `threatRange`. */
  flagshipThreatHull: 0.7, flagshipThreatShips: 4, threatRange: 5000,
  /** A comms timeout decision Judgement threshold: at or above it the captain takes the careful answer. */
  careJudgement: 6,
  /** Loyalty a Grudge-holder loses when one of their decisions is ignored. */
  grudgeLoyalty: 2,
  historyCap: 400,
  /** Morale the admiral's "stand fast" gives a captain about to break (answered, not on a timeout). */
  standFastMorale: 6,
  /** A report is "accurate" when the reported hull fraction is within this of the truth. */
  accurateWithin: 0.05,
  /** PKG-14: no surname more than this many times among the player's captains and the flagship's officers. */
  maxSurname: 2,
  /** PKG-22 (F-03): how long the master of guns' "their side is down" report waits for "Send the pods". */
  sideOpenS: 8,
  /** PKG-22 (F-03): the same enemy ship is not reported open again for this long (any side). */
  sideOpenCooldownS: 15,
  /** PKG-22 (F-07): a capture card, ours or theirs, stays on the queue this long. */
  captureShowS: 15,
};

/** first-pass. Seconds added to a captain's timeout by trait: patient captains wait longer (BRIDGE §4). */
export const PATIENCE: Record<Trait, number> = {
  Bold: -2, Cautious: 2, Veteran: 3, Ambitious: -1, Fanatic: -2,
  'Glory-hound': -3, 'By-the-book': 3, 'Grudge-holder': 0, Protector: 0, Pessimist: 1, Optimist: 0,
};

/** first-pass. Command points (BRIDGE §5, VISION §8): answering is free; a broadcast costs most. */
export const POINTS = {
  max: 5,
  start: 5,
  /** Points regained per second. */
  refillPerS: 0.25,
  answer: 0,
  ping: 0,
  direct: 1,
  officer: 1,
  broadcast: 3,
};

/** first-pass. Reports can be wrong (BRIDGE §3): how far a captain's own hull report leans, before Candour scales it. */
export const CANDOUR = {
  /** + overstates the hull (understates damage). */
  trait: { Optimist: 0.15, Pessimist: -0.15, Ambitious: 0.08, 'Glory-hound': 0.05, Fanatic: 0.05 } as Partial<Record<Trait, number>>,
  mood: { confident: 0.05, steady: 0, strained: -0.05, panicked: -0.15, defiant: 0.1 } as Record<Mood, number>,
  /** Uniform noise ± this, before Candour scales it. */
  noise: 0.1,
};

/** first-pass. Pushback on a direct order (BRIDGE §6). */
export const PUSHBACK = {
  /** Below this loyalty a captain may refuse outright. */
  refuseLoyalty: 30,
  /** Chance of refusing at loyalty 0, falling linearly to 0 at refuseLoyalty. */
  refuseChanceAtZero: 0.6,
  /** A risky order (attack while hull is under this, or when strained or worse) may draw a protest. */
  riskyHull: 0.5,
  /** Protest chance = (protestBase − (Nerve + Judgement)/20) on a risky order, floored at 0. */
  protestBase: 0.9,
};

/** first-pass. The flagship's engineering orders. */
export const CREW = {
  /** overloadGuns: guns reload this much faster … */
  overloadReload: 0.5,
  /** … and every shield side loses this fraction of its max per second. */
  overloadShieldDrainPerS: 0.01,
  /** feedEngines: engines and jump drive repair this many points per second … */
  feedRepairPerS: 1,
  /** … and guns reload this much slower. */
  feedReloadPenalty: 0.3,
};

/** The maneuvers the flag captain takes (stored only: the flying is the next wave, M1 / EXP-03). */
export const MANEUVERS = ['close', 'openRange', 'freshSide', 'crossBow', 'holdStation', 'ram'] as const;
/** Fighter command tasks (stored only: fighters are a later package). */
export const FIGHTER_TASKS = ['escort', 'screen', 'hunt'] as const;

/** first-pass (PKG-14). The marine commander's decision while our marines fight inside an enemy ship. */
export const MARINES = {
  /** Seconds after the breach before he asks (the first deck report comes first). */
  askAfterS: 2,
  /** How long the decision waits for the admiral (the queue's base timeout). */
  decisionS: 8,
  /** Seconds aboard before a captain firing on her says her fire has slackened. */
  slackAfterS: 3,
};

/** first-pass (PKG-14). A standing shield order from the admiral. */
export const STANDING = {
  /** Seconds an ordered split is held no matter what, before the officer may report it cannot hold. */
  graceS: 8,
};
