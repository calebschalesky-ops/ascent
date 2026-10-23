/**
 * The fight inside a hull: boarders against the crew.
 *
 * SEAM. The infantry model (squads, strength, morale, fights inside a site or a hull) belongs to the infantry-carrier
 * thread (NEW-SHIP-TYPES.md, src/lib/infantry/). It was not written when this thread started, so this file is a
 * small stand-in behind `HullFightModel`. When infantry lands, give `HULL_FIGHT` its model and delete the stand-in;
 * nothing else in boarding changes.
 *
 * The stand-in: Lanchester's square law (each side loses, each second, rate × the other's quality × the other's
 * strength) and a morale break when a side is down to FIGHT.breakAt of what it started with. A model, not a
 * measurement.
 */
import { FIGHT } from './spec';

/** People on one side and how well they fight. */
export interface TroopForce { strength: number; quality: number }

export interface HullFight {
  attackers: TroopForce;
  defenders: TroopForce;
  /** Strengths at the start (a reinforcement adds to the attackers' start, too). */
  start: { attackers: number; defenders: number };
  t: number;
  outcome: 'fighting' | 'captured' | 'repelled';
}

export interface HullFightModel {
  start(attackers: TroopForce, defenders: TroopForce): HullFight;
  /** More boarders arrive into the same hull: their people join the attackers. */
  reinforce(f: HullFight, more: TroopForce): void;
  step(f: HullFight, dt: number): void;
}

const blend = (a: TroopForce, b: TroopForce): TroopForce => {
  const s = a.strength + b.strength;
  return { strength: s, quality: s > 0 ? (a.strength * a.quality + b.strength * b.quality) / s : a.quality };
};

export const LANCHESTER: HullFightModel = {
  start: (attackers, defenders) => ({
    attackers: { ...attackers }, defenders: { ...defenders },
    start: { attackers: attackers.strength, defenders: defenders.strength }, t: 0,
    outcome: defenders.strength <= 0 ? 'captured' : attackers.strength <= 0 ? 'repelled' : 'fighting',
  }),
  reinforce: (f, more) => {
    if (f.outcome !== 'fighting') return;
    f.attackers = blend(f.attackers, more);
    f.start.attackers += more.strength;
  },
  step: (f, dt) => {
    if (f.outcome !== 'fighting') return;
    // Small steps, so a long frame does not overshoot the break.
    let left = dt;
    while (left > 0 && f.outcome === 'fighting') {
      const h = Math.min(left, 0.1);
      left -= h;
      const a = f.attackers.strength;
      const d = f.defenders.strength;
      f.attackers.strength = Math.max(0, a - FIGHT.rate * f.defenders.quality * d * h);
      f.defenders.strength = Math.max(0, d - FIGHT.rate * f.attackers.quality * a * h);
      f.t += h;
      if (f.defenders.strength <= f.start.defenders * FIGHT.breakAt) f.outcome = 'captured';
      else if (f.attackers.strength <= f.start.attackers * FIGHT.breakAt) f.outcome = 'repelled';
    }
  },
};

/** The model the game uses. Swap for infantry-carrier's when it lands. */
export const HULL_FIGHT: HullFightModel = LANCHESTER;

/** Run a fight to its end (tests, and the enemy's estimate of whether a boarding would work). */
export function resolve(attackers: TroopForce, defenders: TroopForce, model: HullFightModel = HULL_FIGHT, maxT = 600): HullFight {
  const f = model.start(attackers, defenders);
  while (f.outcome === 'fighting' && f.t < maxT) model.step(f, 1);
  return f;
}
