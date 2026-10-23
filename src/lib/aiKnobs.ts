/**
 * Every knob the enemy AI reads, in one place. Balance, difficulty and feel are Caleb's call: these are first guesses.
 *
 * Distances and speeds are world units at arsenal scale 1 (SHIP 0.18, the scale the munitions were written for); the
 * scene multiplies them by the arsenal's scale k, so they follow the ship's size if planet scale changes it. Times
 * are seconds, angles radians, fractions 0..1. Pairs [a, b] run from skill 0 to skill 1 (lib/enemyArms skillOf).
 */
export const AI = {
  // ---- When ships fight ----
  /**
   * A hostile nation's ships engage when the player comes this close to any of them. Kept short: at this branch's
   * scale the Moon's patrol passes 14 units from the start, and Mercury's and Venus's within 70.
   */
  alertRange: 12,
  /** A Wary fleet notices the player from this many times the alert range, and shadows at `shadowRange` (FEUDS.md 2). */
  shadowSpot: 3,
  shadowRange: 25,
  /** They go home once the player has been beyond this from every one of them for `calmTime`. */
  disengageRange: 450,
  calmTime: 8,
  /** A hit on one ship, or a completed missile lock on it, alerts its whole nation. */
  provokeNation: true,
  /**
   * A fleet called out to the player in its home space (diplomacy/territory.ts) farther off than `from` burns in at
   * (distance − from/2) × `gain` per second, so it crosses a world's width in a few seconds, looking `lookahead`
   * seconds ahead for bodies in the way. scale-jump-danger D1.
   */
  transit: { from: 400, gain: 1.5, lookahead: 0.5 },
  /** Seconds the player cannot be hurt after a respawn (placeholder state). */
  respawnGrace: 4,

  // ---- Difficulty ----
  damageMul: 0.5, // × every enemy hit (at 1, five level-1 Moon ships killed a stationary player in 1.4 s)
  rateMul: 1, // × every enemy rate of fire
  think: [0.6, 0.15] as const, // seconds between decisions
  aimError: [0.06, 0.008] as const, // radians of scatter on each shot
  beamTrack: [0.5, 1] as const, // share of a beam's damage that lands while it is held on the player

  // ---- Locks on the player ----
  lockCone: 0.3, // the player must stay this close to a launcher's line (fighter: its nose; warship: any bearing) to build a lock
  lockDecay: 1.2, // lock progress lost per second off target

  // ---- Fighters ----
  fireCone: [0.09, 0.035] as const, // guns fire when the lead point is within this of the nose (gimballed that far)
  attackRange: 220, // inside this it attacks; outside it approaches
  breakRange: 22, // a pass ends this close: it breaks off
  extendRange: 150, // it extends this far before turning back in (boom and zoom)
  attackTime: 5, // a pass lasts at most this long (× 0.5 + aggression)
  evadeTime: [1.2, 2.6] as const, // seconds one evasive maneuver runs
  missileReact: 3.2, // reacts to a missile homing on it this many seconds before impact
  flareRange: 60, // drops a flare when a missile homing on it is this close
  sixCone: 0.35, // the player "has it": the player's nose within this of it …
  sixRange: 160, // … this close, and behind it
  sixDist: 30, // where it tries to sit behind the player
  matchPlayer: 1.15, // top speed can rise to this × the player's speed …
  speedCap: 220, // … up to this
  jinkPeriod: [0.35, 0.8] as const,
  spiralRate: 5, // rad/s round the line of flight in a barrel roll
  spiralAngle: 0.6,
  mineChase: 60, // drops a mine when the player is this close behind it

  // ---- Cruisers and capital ships ----
  minStandoff: { capital: 70, cruiser: 45, destroyer: 40 } as Record<'capital' | 'cruiser' | 'destroyer', number>,
  huntOrbit: 0.6, // a destroyer circles the player at this × its standoff …
  huntSpeed: 1, // … at this × its top speed, on the side away from the player's nose
  maxStandoff: 300,
  kite: 1.15, // outranging the player, it sits this × the player's reach out
  effRange: { bolt: 0.5, beam: 0.85, missile: 0.55, burst: 0.7, mine: 0 } as Record<'bolt' | 'beam' | 'missile' | 'burst' | 'mine', number>,
  coverAt: 0.3, // shield below this (× 0.5 + doctrine's cover) sends it to cover
  uncoverAt: 0.85, // and it comes out once the shield is back above this
  pincer: 1.1, // cruisers take slots this far either side of the fleet's line to the player
  screenDist: 18, // screening fighters hold this far in front of the capital ship
  screenRadius: 120, // until the player comes this close to the capital ship; then all fighters attack
  sunBias: 0.35, // × doctrine's sun: how far the fleet's line swings toward the Sun

  // ---- Flying ----
  avoidMargin: 4, // keeps this clear of a body's surface …
  lookahead: 3, // … looking this many seconds ahead

  // ---- The Sun ----
  glare: { cone: 0.08, lockMul: 2 }, // a target within this of the Sun's disc takes the player twice as long to lock
};
export type Knobs = typeof AI;

/** Linear between the skill-0 and skill-1 values. */
export const bySkill = (pair: readonly [number, number], skill: number) => pair[0] + (pair[1] - pair[0]) * Math.max(0, Math.min(1, skill));
