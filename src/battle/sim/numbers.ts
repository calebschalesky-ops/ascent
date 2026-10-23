/**
 * Every tunable number in the battle sim, in one table (HOUSE-RULES rule 9). ALL FIRST-PASS: written by Talos in PKG-02
 * to make the world scripts run, not balanced. Palamedes proves or replaces each one by sim.
 *
 * Units: metres, seconds, m/s, radians/s. Shield and hull values are points.
 */
import type { BattleClass, GunKind, ShieldSide, SystemId, Trait } from './types';

/** first-pass. Fixed step (decided for you in PKG-02): 1/30 s. */
export const DT = 1 / 30;

/**
 * Length of each class against the player ship (lib/shipTypes.ts SHIP_SPECS.size; a test pins these to it) and the
 * player ship's battle length. Only the three ShipType rows come from there; carrier and escort are battle-only.
 */
export const SIZE_REL: Record<BattleClass, number> = { capital: 5, destroyer: 2.2, cruiser: 1, carrier: 3, escort: 0.6 };
export const PLAYER_SHIP_LENGTH_M = 180; // first-pass

export interface ClassNumbers {
  hull: number;
  /** Shield capacity across all four sides at an even split. */
  shield: number;
  /** Shield regen per second, as a fraction of a side's max, after the regen delay. */
  regen: number;
  maxSpeed: number;
  accel: number;
  /** rad/s at Helm 5. */
  turn: number;
  crew: number;
  marines: number;
  guns: Partial<Record<GunKind, number>>;
  /** Chance its point defence stops one incoming missile, at full PD health. */
  pd: number;
  /** How easy it is to hit: profile multiplier on hit chance. */
  profile: number;
  /** Range it likes to fight at with standing orders. */
  prefRange: number;
}

const deg = Math.PI / 180;

/**
 * first-pass, all rows. hull ∝ SHIP_SPECS.hp × 10 for the ShipType rows. PKG-08: every `regen` × 1.5 (spread fire wastes
 * more against a shield that comes back; focused fire on one side still breaks it).
 */
export const CLASS: Record<BattleClass, ClassNumbers> = {
  capital: { hull: 9000, shield: 4800, regen: 0.0525, maxSpeed: 60, accel: 3, turn: 4 * deg, crew: 1200, marines: 300, guns: { rail: 4, laser: 6, missile: 2 }, pd: 0.55, profile: 1.25, prefRange: 8000 },
  destroyer: { hull: 3000, shield: 2000, regen: 0.06, maxSpeed: 140, accel: 8, turn: 10 * deg, crew: 400, marines: 80, guns: { rail: 2, laser: 4, missile: 2 }, pd: 0.4, profile: 1.0, prefRange: 7000 },
  cruiser: { hull: 1000, shield: 900, regen: 0.06, maxSpeed: 120, accel: 7, turn: 9 * deg, crew: 200, marines: 40, guns: { rail: 1, laser: 3, missile: 1 }, pd: 0.3, profile: 0.85, prefRange: 6000 },
  carrier: { hull: 2500, shield: 1600, regen: 0.0525, maxSpeed: 70, accel: 3.5, turn: 5 * deg, crew: 600, marines: 150, guns: { laser: 4 }, pd: 0.5, profile: 1.15, prefRange: 9000 },
  escort: { hull: 500, shield: 400, regen: 0.075, maxSpeed: 180, accel: 12, turn: 15 * deg, crew: 80, marines: 10, guns: { laser: 3 }, pd: 0.6, profile: 0.7, prefRange: 3000 },
};

export interface GunNumbers {
  range: number;
  damage: number;
  shieldMul: number;
  hullMul: number;
  reload: number;
  /** Hit chance at point-blank, before range, Gunnery, profile, facing and evasion. */
  baseHit: number;
  /** How much of the hit chance is lost by max range (0..1). */
  rangeFalloff: number;
}

/**
 * first-pass. Rails strip shields at range (NAVY §2); lasers are the close battery; missiles burst and test PD.
 * PKG-08: every `damage` × 0.7 (25 / 6 / 50 → 17.5 / 4.2 / 35): battles ran 1.5–3 min, the target is 4–10.
 */
export const GUN: Record<GunKind, GunNumbers> = {
  rail: { range: 12000, damage: 17.5, shieldMul: 1.5, hullMul: 0.7, reload: 6, baseHit: 0.8, rangeFalloff: 0.5 },
  laser: { range: 4000, damage: 4.2, shieldMul: 1, hullMul: 1, reload: 1.5, baseHit: 0.85, rangeFalloff: 0.4 },
  missile: { range: 10000, damage: 35, shieldMul: 0.8, hullMul: 1.2, reload: 20, baseHit: 0.9, rangeFalloff: 0.2 },
};

/** first-pass. Captains' abilities, each 1–10, mapped to multipliers (5 or 5.5 ≈ 1). */
export const ABILITY = {
  /** Hit chance × (gunHitBase + gunHitPer × Gunnery). */
  gunHitBase: 0.55, gunHitPer: 0.09,
  /** Damage against shields × (gunShieldBase + gunShieldPer × Gunnery): how fast they break a side. */
  gunShieldBase: 0.8, gunShieldPer: 0.04,
  /** Turn and accel × (helmBase + helmPer × Helm). */
  helmBase: 0.7, helmPer: 0.06,
  /** Incoming hit chance × (evadeBase − evadePer × Helm). */
  evadeBase: 1.1, evadePer: 0.02,
  /** Morale losses × (nerveLossBase − nerveLossPer × Nerve). */
  nerveLossBase: 1.3, nerveLossPer: 0.08, // PKG-16 second-pass (reports/PKG-16.md): was 0.06
  /** Ship breaks below breakBase − breakPer × (Nerve − 5) + trait. */
  breakBase: 30, breakPer: 3.66, // PKG-16 second-pass (reports/PKG-16.md): was 2.5
  /** Starting morale: moraleStartBase + moraleStartPer × (Nerve − 5) + trait. PKG-08: base 62 → 70 (a Nerve 2 Pessimist
   * started 6.5 points above breaking and broke on the first volley). */
  moraleStartBase: 70, moraleStartPer: 3.59, // PKG-16 second-pass (reports/PKG-16.md): was 3
  /** Judgement at or above which a captain picks the weakest target rather than the nearest. */
  smartTargetJudgement: 6,
  /** Judgement at or above which the ship shifts shield power toward the threat. */
  shieldShiftJudgement: 4,
  /** Judgement + Helm at or above which the ship turns a fresh side to the threat. */
  freshSideJudgementHelm: 10,
  /** Seconds between a captain's re-thinks: thinkBase + thinkPer × (10 − Judgement). */
  thinkBase: 2.5, thinkPer: 0.25,
  /**
   * PKG-13. Fair rosters (captains.ts fairRosters) on or off. PKG-16: ON, on Daedalus's ruling of 2026-10-21 (done
   * point 5: decided by decisions and captains, never luck; off, scripted-good wins 0 of 30). Caleb may overrule.
   */
  fairRosters: true,
  /** PKG-13, first-pass. Fair rosters: each ability's total over a class of hull (so over the fleet too) differs between the sides by at most this (captains.ts fairRosters). */
  fairTotalTol: 0,
  /** PKG-13, first-pass. Fair rosters: each class of hull carries the same traits on both sides, dealt in a seeded order. */
  fairTraits: true,
};

/** first-pass. Trait effects on the sim (BRIDGE §1). Zero where a trait only colours reports. */
export const TRAIT: Record<Trait, { breakMod: number; moraleStart: number; lossMul: number; rangeMul: number }> = {
  Bold: { breakMod: -6, moraleStart: 4, lossMul: 1, rangeMul: 0.75 },
  Cautious: { breakMod: 6, moraleStart: -2, lossMul: 1, rangeMul: 1.2 },
  Veteran: { breakMod: -3, moraleStart: 5, lossMul: 0.75, rangeMul: 1 },
  Ambitious: { breakMod: -2, moraleStart: 2, lossMul: 1, rangeMul: 0.9 },
  Fanatic: { breakMod: -25, moraleStart: 10, lossMul: 0.8, rangeMul: 0.8 },
  'Glory-hound': { breakMod: -4, moraleStart: 3, lossMul: 1, rangeMul: 0.8 },
  'By-the-book': { breakMod: 0, moraleStart: 0, lossMul: 1, rangeMul: 1 },
  'Grudge-holder': { breakMod: 0, moraleStart: 0, lossMul: 1, rangeMul: 1 },
  Protector: { breakMod: -2, moraleStart: 0, lossMul: 1, rangeMul: 1 },
  Pessimist: { breakMod: 3, moraleStart: -6, lossMul: 1.1, rangeMul: 1 },
  Optimist: { breakMod: -2, moraleStart: 6, lossMul: 0.9, rangeMul: 1 },
};

/** first-pass. Shields. */
export const SHIELD = {
  /** Seconds after a hit before a side regenerates. */
  regenDelay: 4,
  /** Seconds a captain waits between shield shifts or fresh-side turns. */
  decisionCooldown: 12,
  /** Fraction of a side's max it must regain before it counts as closed again. */
  reopenFrac: 0.1,
  /** The split a captain shifts to when one side is threatened: that side gets `focus`, the rest share the remainder. */
  focus: 0.55,
  /** A side counts as threatened when it holds less than this share of power and takes at least `threatShare` of fire. */
  threatShare: 0.5,
  /** Facing multiplier on incoming hit chance: broadside shows more ship. */
  broadsideProfile: 1.1, endOnProfile: 0.9,
  /** Facing arcs: fore and aft each cover ±this from the axis. */
  arc: Math.PI / 4,
};

/** first-pass. Hull, systems and crew. */
export const DAMAGE = {
  /**
   * Each system behind the hit side takes hullDmg / hullMax × 100 × this (SYSTEMS_BEHIND): half the hull lost through one
   * side knocks out what sits behind it. Deterministic on purpose: which side you open decides what you break.
   */
  systemDamageMul: 2,
  /** Crew killed per hull hit = hullDmg / hullMax × crewMax × this. */
  crewPerHull: 0.3,
  /** Reload slows as crew fall: reload ÷ (crewEffBase + (1 − crewEffBase) × crew/crewMax). */
  crewEffBase: 0.5,
  /** Engines out: the ship can still turn at this fraction of its rate, with no thrust. */
  enginesOutTurn: 0.25,
};

/**
 * PKG-08 (Palamedes), second-pass. What each class is worth to its fleet's strength: the break rule, the end reason and
 * the tally all read losses through `losses.ts fleetLosses()`, weighted by this. A side of the Saturn setup is 27.
 */
export const STRENGTH: Record<BattleClass, number> = { capital: 6, destroyer: 3, cruiser: 2, carrier: 3, escort: 1 };

/** first-pass, PKG-08 second-pass where marked. Morale (NAVY §1, decision 4). */
export const MORALE = {
  /** Morale lost per point of hull fraction taken (hullDmg / hullMax × this). PKG-08: 25 → 37 (a ship's own wounds, not
   * its friends' flight, should be what breaks it). */
  hullLoss: 36.2, // PKG-16 second-pass (reports/PKG-16.md): was 37
  /** Lost when one of this ship's own shield sides collapses. */
  sideDown: 2,
  /**
   * Lost by every ship on a side when a friend is CAPTURED; more if the friend was close; gained by the captors
   * (boarding/boarding.ts capture() reads these three). PKG-08: 4 / 6 / 4 → 3 / 5 / 2, a captured ship being a cruiser
   * or escort (strength 1–2) nearly every time, to match the per-strength shock below.
   */
  friendLost: 3, friendLostNear: 5, nearRange: 3000,
  enemyLost: 2,
  /**
   * PKG-08, second-pass. A ship leaving the field (shipOut) shakes its side by its STRENGTH × these, and heartens the
   * other side by STRENGTH × enemyLostPerStrength. A ship that fled or withdrew shakes it by the matching fraction.
   */
  // PKG-16 second-pass: was 1.5 / 2.5 / 0.75 (reports/PKG-16.md)
  friendLostPerStrength: 2.21, friendLostNearPerStrength: 2.2, enemyLostPerStrength: 1.69,
  fledShock: 0.67, withdrawnShock: 1.08, // PKG-16 second-pass (reports/PKG-16.md): was 1 / 0.5
  /**
   * PKG-16. A capture shakes the losing side by lossShock() (STRENGTH × the per-strength values above) instead of the
   * flat friendLost / friendLostNear / enemyLost (PKG-14 held this back on the old checks).
   */
  captureShockPerStrength: true,
  /** Lost by every ship on a side the same tick its flagship is lost. */
  flagshipLost: 35,
  /** Per second, × (ratio − 1), when outnumbered beyond `outnumberedAt`. */
  outnumberedPerS: 0.73, outnumberedAt: 1.2, // PKG-16 second-pass (reports/PKG-16.md): was 0.25
  /** Per second recovery toward the start value when no hull hit in `calmAfter` s. */
  recoverPerS: 0.08, calmAfter: 20, // PKG-16 second-pass (reports/PKG-16.md): was 0.05
  /** A side breaks when its mean ship morale falls below this. */
  sideBreak: 25,
  /**
   * PKG-08: 0.5 → 2. Retired from the break rule (which is now `sideBreakStrength`); only boarding/boarding.ts
   * captureSideCheck (and the admiral's withdrawal watch) still read it, counting ships rather than strength, and the
   * capture check counts its own wrecked prizes as its losses. At 2 it needs 24 ships out of 12, so it never fires and the
   * strength rule is the only one (Request in reports/PKG-08.md).
   */
  sideBreakLosses: 2,
  /**
   * PKG-08, second-pass. NAVY decision 4, "loses half its strength": a side breaks when this share of its starting
   * STRENGTH is gone (wrecked, struck, captured or fled in full, withdrawn × `withdrawnLossFrac`), less
   * `prizeCredit` × the STRENGTH of every prize it has taken.
   */
  sideBreakStrength: 0.56, withdrawnLossFrac: 0.5, prizeCredit: 0.5, // PKG-16 second-pass (reports/PKG-16.md): sideBreakStrength was 0.5
  /** Morale sample interval for the summary's time series. */
  sampleS: 10,
  /** Mood bands. */
  confident: 75, steady: 50, strained: 30,
};

/** first-pass. Breaking, fleeing, jumping and striking (VISION §7 mass lock). */
export const ESCAPE = {
  /** An active enemy within this range mass-locks a ship: its jump spool resets. */
  massLockRange: 3000,
  /** Seconds of unbroken spool to jump out. */
  jumpSpool: 12,
  /** A broken ship pinned this long strikes its colours (unless Fanatic). */
  strikeWhenPinnedS: 40,
  /** A broken ship strikes at once below this hull fraction (unless Fanatic). */
  strikeHullFrac: 0.15,
  /** After a side breaks, the battle ends when it has left the field or this many seconds pass. PKG-08: 120 → 180. */
  pursuitWindow: 180,
};

/** first-pass. Captains' questions and their timeouts (BRIDGE §4: 4–12 s). */
export const REQUEST = {
  timeoutBase: 8,
  /** Timeout shortens by this per point of urgency (hull lost). */
  withdrawAtHullFrac: 0.4,
  coverAtFlagshipHullFrac: 0.6,
  /** Grudge-holder loses this loyalty when a question times out. */
  grudgeLoyalty: 2,
};

/** first-pass. Movement. */
export const MOVE = {
  /** Distance band around the preferred range inside which a ship holds. */
  rangeBand: 600,
  /** followFlagship keeps within this of the flagship. */
  followRange: 1500,
  /** Pursuers close to this. */
  pursueRange: 2000,
  /** Line spacing between ships in a setup. */
  lineSpacing: 900,
};

/**
 * PKG-16, first-pass. The `player-ui-like` policy (policy-ui-like.ts): TRC-03's player re-ordered every ~10 s
 * (shots/trc-03/exp06-s6-play-*.jsonl); `focusSide` re-orders a ship already on the target at its facing side.
 */
export const PLAYER_UI = { everyS: 10, focusSide: true };

/**
 * PKG-19, first-pass (reports/PKG-19.md section 1, committed before any run). The scripted-good plan (policy-good.ts):
 * orders every `everyS`; a side seen open is remembered `openForgetS` (the admiral's SENSE.openForgetS); no board while
 * an enemy escort is within `laneClearM` of the target (JUPITER.laneClearM); G9 leaves once our strength lost is at
 * least `leaveAtLossFrac` and `leaveBehindBy` more than theirs, never before `leaveNotBeforeS`. Target weights: G1.
 */
export const PLAN_GOOD = {
  everyS: 10, openForgetS: 15, laneClearM: 1500, leaveAtLossFrac: 0.2, leaveBehindBy: 0.1, leaveNotBeforeS: 60, // tuned on seeds 1-60 (PKG-19 s3): laneClearM was 2500, leaveAtLossFrac 0.3
  perKm: 2, effortPerK: 1, openBonus: 4,
};
/** PKG-19, first-pass. The scripted-bad plan (policy-bad.ts): orders every `everyS`, boards a closed side every `boardEveryS`. */
export const PLAN_BAD = { everyS: 10, boardEveryS: 30 };

/** first-pass. Run limits and the event log cap. */
export const RUN = {
  logCap: 6000,
  decisionCap: 1000,
  /** Seconds between controller (policy) calls. */
  policyEveryS: 1,
  /** Seconds between doctrine re-targets for the stand-in enemy admiral. */
  doctrineEveryS: 10,
};

export const sideOffset: Record<ShieldSide, number> = { fore: 0, port: Math.PI / 2, aft: Math.PI, starboard: -Math.PI / 2 };

/** first-pass. Which systems sit behind each shield side: gunfire through that side damages them. */
export const SYSTEMS_BEHIND: Record<ShieldSide, SystemId[]> = {
  fore: ['guns', 'pd'],
  aft: ['engines', 'jump'],
  port: ['hangar', 'pd'],
  starboard: ['guns', 'jump'],
};
